"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { ConditionNodeCard } from "./condition-node";
import { Connector } from "./connector";
import { AiStepNode } from "./run/ai-step-node";
import type { DecisionLabel } from "./run/decision-panel";
import { ResultCard } from "./run/result-card";
import { SampleTicketCard } from "./run/sample-ticket-card";
import { TopBar } from "./top-bar";
import { TriggerNodeCard } from "./trigger-node";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CLASSIFY_REASONING,
  CLASSIFY_STEP_ID,
  SEED_CONDITION,
} from "@/lib/experiments/workflow-canvas/data";
import {
  flowReducer,
  initialFlowState,
} from "@/lib/experiments/workflow-canvas/flow-reducer";
import {
  CONDITION_MS,
  TRIGGER_MS,
  evaluateConditionNode,
  idsBelow,
  idleRun,
  nextPendingId,
  orderedRunIds,
  runReducer,
  runningId,
  triggerOutput,
  type Run,
  type RunAction,
} from "@/lib/experiments/workflow-canvas/run-machine";
import {
  captureRunSnapshot,
  type CaptureState,
} from "@/lib/experiments/workflow-canvas/capture-snapshots";
import {
  AI_THINK_DELAY_MS,
  RESULT_CARD_DELAY_MS,
  STREAM_CHAR_MS,
} from "@/lib/experiments/workflow-canvas/run-timings";
import type { Flow, FlowAction } from "@/lib/experiments/workflow-canvas/types";
import {
  incompleteStepCount,
  stepCount,
} from "@/lib/experiments/workflow-canvas/types";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

class TimerBag {
  private timeouts = new Set<number>();
  private intervals = new Set<number>();

  setTimeout(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      this.timeouts.delete(id);
      fn();
    }, ms);
    this.timeouts.add(id);
  }

  setInterval(fn: () => void, ms: number): number {
    const id = window.setInterval(fn, ms);
    this.intervals.add(id);
    return id;
  }

  clearInterval(id: number): void {
    window.clearInterval(id);
    this.intervals.delete(id);
  }

  clearAll(): void {
    for (const id of this.timeouts) {
      window.clearTimeout(id);
    }
    for (const id of this.intervals) {
      window.clearInterval(id);
    }
    this.timeouts.clear();
    this.intervals.clear();
  }
}

function useRunDriver(
  flow: Flow,
  run: Run,
  dispatchRun: Dispatch<RunAction>,
  startedAtRef: MutableRefObject<Record<string, number>>,
  setStartedAt: Dispatch<SetStateAction<Record<string, number>>>,
) {
  const bag = useRef(new TimerBag());
  const runRef = useRef(run);
  const flowRef = useRef(flow);
  runRef.current = run;
  flowRef.current = flow;

  const activeId = runningId(run);
  const nodeStateKey = Object.entries(run.nodeStates)
    .map(([id, value]) => `${id}:${value}`)
    .join(",");

  useEffect(() => {
    return () => bag.current.clearAll();
  }, []);

  useEffect(() => {
    if (run.phase === "idle" || run.phase === "done") {
      bag.current.clearAll();
    }
  }, [run.phase]);

  useEffect(() => {
    if (run.phase !== "running") {
      return;
    }
    if (runningId(run)) {
      return;
    }
    const next = nextPendingId(run, orderedRunIds(flow));
    if (next) {
      if (!startedAtRef.current[next]) {
        startedAtRef.current = {
          ...startedAtRef.current,
          [next]: Date.now(),
        };
        setStartedAt({ ...startedAtRef.current });
      }
      dispatchRun({ type: "markRunning", id: next });
    }
  }, [run.phase, nodeStateKey, flow, dispatchRun, run, startedAtRef, setStartedAt]);

  useEffect(() => {
    if (run.phase !== "running" || !activeId) {
      return;
    }

    const timers = bag.current;
    timers.clearAll();
    const reduced = prefersReducedMotion();
    const ordered = orderedRunIds(flowRef.current);

    if (activeId === "trigger") {
      timers.setTimeout(() => {
        dispatchRun({
          type: "finishNode",
          id: "trigger",
          state: "done",
          output: triggerOutput(),
          elapsedMs: TRIGGER_MS,
        });
      }, reduced ? 0 : TRIGGER_MS);
      return () => timers.clearAll();
    }

    if (activeId === CLASSIFY_STEP_ID) {
      const finishAwaiting = () => {
        dispatchRun({
          type: "enterAwaiting",
          id: CLASSIFY_STEP_ID,
        });
      };

      if (reduced) {
        timers.setTimeout(finishAwaiting, 0);
        return () => timers.clearAll();
      }

      timers.setTimeout(() => {
        const interval = timers.setInterval(() => {
          const nextLen = runRef.current.streamedText.length + 1;
          dispatchRun({
            type: "appendStream",
            fullText: CLASSIFY_REASONING,
          });
          if (nextLen >= CLASSIFY_REASONING.length) {
            timers.clearInterval(interval);
            finishAwaiting();
          }
        }, STREAM_CHAR_MS);
      }, AI_THINK_DELAY_MS);

      return () => timers.clearAll();
    }

    const node = flowRef.current.steps.find((item) => item.id === activeId);
    timers.setTimeout(() => {
      const passed = node ? evaluateConditionNode(node) : false;
      if (passed) {
        dispatchRun({
          type: "finishNode",
          id: activeId,
          state: "passed",
          output: "Condition met",
          elapsedMs: CONDITION_MS,
        });
      } else {
        dispatchRun({
          type: "finishNode",
          id: activeId,
          state: "skipped",
          output: "Condition not met",
          elapsedMs: CONDITION_MS,
          skipBelowIds: idsBelow(ordered, activeId),
        });
      }
    }, reduced ? 0 : CONDITION_MS);

    return () => timers.clearAll();
  }, [run.phase, activeId, dispatchRun]);
}

export function WorkflowCanvas({
  captureState,
}: {
  captureState?: CaptureState;
}) {
  const frozen = Boolean(captureState);
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const [run, dispatchRun] = useReducer(
    runReducer,
    captureState ? captureRunSnapshot(captureState) : idleRun,
  );
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Record<string, number>>({});
  const startedAtRef = useRef<Record<string, number>>({});
  const resultRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const incomplete = incompleteStepCount(state.flow);
  const editingLocked =
    run.phase === "running" || run.phase === "awaiting-decision";
  const hideEditChrome = editingLocked;
  const canAddSteps = !editingLocked;

  useEffect(() => {
    if (!captureState) {
      return;
    }
    const now = Date.now();
    if (captureState === "running") {
      const stamp = { [SEED_CONDITION.id]: now - 450 };
      startedAtRef.current = stamp;
      setStartedAt(stamp);
    }
    if (captureState === "awaiting") {
      const stamp = { [CLASSIFY_STEP_ID]: now - 2600 };
      startedAtRef.current = stamp;
      setStartedAt(stamp);
    }
  }, [captureState]);

  useRunDriver(
    state.flow,
    frozen ? { ...run, phase: "idle" } : run,
    dispatchRun,
    startedAtRef,
    setStartedAt,
  );

  useEffect(() => {
    if (run.phase === "idle") {
      startedAtRef.current = {};
      setStartedAt({});
    }
  }, [run.phase]);

  // After Confirm / Escalate, reveal the result card and scroll it into view.
  useEffect(() => {
    if (run.phase !== "done" || !run.resultText) {
      return;
    }
    const reduced = prefersReducedMotion();
    const delay = reduced ? 0 : RESULT_CARD_DELAY_MS;
    const id = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "nearest",
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [run.phase, run.resultText]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (run.phase === "awaiting-decision" && event.key === "Escape") {
        event.preventDefault();
        return;
      }
      if (editingLocked) {
        return;
      }
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      if (!state.selectedId) {
        return;
      }
      event.preventDefault();
      if (state.selectedId === "trigger") {
        dispatch({ type: "showTriggerHint" });
        return;
      }
      if (exitingId) {
        return;
      }
      const id = state.selectedId;
      if (run.phase === "done") {
        stopRun();
      }
      setExitingId(id);
      window.setTimeout(() => {
        dispatch({ type: "deleteNode", id });
        setExitingId(null);
      }, 100);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.selectedId, exitingId, editingLocked, run.phase]);

  function stopRun() {
    dispatchRun({ type: "stop" });
    startedAtRef.current = {};
    setStartedAt({});
  }

  function safeEdit(action: FlowAction) {
    if (editingLocked) {
      return;
    }
    // Don't clear a completed run on mere selection / canvas click —
    // Confirm unmounts the decision panel and the same click can land on
    // the canvas underneath. Only real edits reset the run.
    const mutatesFlow =
      action.type !== "select" &&
      action.type !== "showTriggerHint" &&
      action.type !== "clearTriggerHint";
    if (run.phase === "done" && mutatesFlow) {
      stopRun();
    }
    dispatch(action);
  }

  function addCondition() {
    if (editingLocked) {
      return;
    }
    if (run.phase === "done") {
      stopRun();
    }
    const id = crypto.randomUUID();
    dispatch({
      type: "addConditionNode",
      id,
      rowId: crypto.randomUUID(),
    });
    setEnteringId(id);
  }

  function onDragEnd(event: DragEndEvent, nodeId: string) {
    if (editingLocked) {
      return;
    }
    if (run.phase === "done") {
      stopRun();
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    dispatch({
      type: "reorderRows",
      nodeId,
      activeId: String(active.id),
      overId: String(over.id),
    });
  }

  const classifyState = run.nodeStates[CLASSIFY_STEP_ID];
  const showClassify =
    run.phase !== "idle" &&
    classifyState !== undefined &&
    classifyState !== "pending" &&
    classifyState !== "skipped";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-dvh flex-col bg-page">
        <TopBar
          stepCount={stepCount(state.flow)}
          incompleteCount={incomplete}
          runPhase={run.phase}
          totalMs={run.totalMs}
          onTestRun={() => {
            if (incomplete > 0) {
              return;
            }
            setStartedAt({});
            startedAtRef.current = {};
            dispatchRun({ type: "start", flow: state.flow });
          }}
          onStop={stopRun}
        />
        <div
          className="canvas-dots relative min-h-0 flex-1 overflow-x-auto overflow-y-auto"
          onClick={(event) => {
            if (editingLocked) {
              return;
            }
            if (event.target === event.currentTarget) {
              safeEdit({ type: "select", id: null });
            }
          }}
        >
          <div
            role="listbox"
            aria-label="Workflow steps"
            className="canvas-flow mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-4 pt-6 pb-10"
            onClick={(event) => {
              if (editingLocked) {
                return;
              }
              if (event.target === event.currentTarget) {
                safeEdit({ type: "select", id: null });
              }
            }}
          >
            {run.phase !== "idle" ? (
              <div style={{ marginBottom: 20 }}>
                <SampleTicketCard />
              </div>
            ) : null}

            <TriggerNodeCard
              node={state.flow.trigger}
              selected={state.selectedId === "trigger"}
              hintVisible={state.triggerHintVisible}
              onSelect={() => safeEdit({ type: "select", id: "trigger" })}
              dispatch={safeEdit}
              readOnly={editingLocked}
              runState={run.nodeStates.trigger}
              output={run.outputs.trigger}
              elapsedMs={run.elapsed.trigger}
              startedAt={startedAt.trigger ?? null}
              runDurationMs={TRIGGER_MS}
            />

            {state.flow.steps.map((node, index) => {
              const isLast = index === state.flow.steps.length - 1;
              return (
                <div
                  key={node.id}
                  className="flex w-full flex-col items-center"
                >
                  <Connector />
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => onDragEnd(event, node.id)}
                  >
                    <SortableContext
                      items={node.rows.map((row) => row.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ConditionNodeCard
                        node={node}
                        selected={state.selectedId === node.id}
                        entering={enteringId === node.id}
                        exiting={exitingId === node.id}
                        onSelect={() =>
                          safeEdit({ type: "select", id: node.id })
                        }
                        dispatch={safeEdit}
                        readOnly={editingLocked}
                        hideEditChrome={hideEditChrome}
                        runState={run.nodeStates[node.id]}
                        output={run.outputs[node.id]}
                        elapsedMs={run.elapsed[node.id]}
                        startedAt={startedAt[node.id] ?? null}
                        runDurationMs={CONDITION_MS}
                      />
                    </SortableContext>
                  </DndContext>
                  {isLast && !showClassify ? (
                    <Connector
                      showAdd
                      hideAdd={!canAddSteps}
                      onAddCondition={addCondition}
                    />
                  ) : null}
                </div>
              );
            })}

            {state.flow.steps.length === 0 && !showClassify ? (
              <Connector
                showAdd
                hideAdd={!canAddSteps}
                onAddCondition={addCondition}
              />
            ) : null}

            {showClassify && classifyState ? (
              <>
                <Connector />
                <AiStepNode
                  state={classifyState}
                  streamedText={run.streamedText}
                  output={run.outputs[CLASSIFY_STEP_ID]}
                  elapsedMs={run.elapsed[CLASSIFY_STEP_ID]}
                  startedAt={startedAt[CLASSIFY_STEP_ID] ?? null}
                  onConfirm={(label: DecisionLabel, elapsedMs: number) =>
                    dispatchRun({ type: "confirm", label, elapsedMs })
                  }
                  onEscalate={(elapsedMs: number) =>
                    dispatchRun({ type: "escalate", elapsedMs })
                  }
                />
              </>
            ) : null}

            {run.phase === "done" && run.resultText ? (
              <div ref={resultRef}>
                <ResultCard text={run.resultText} />
              </div>
            ) : null}

            {showClassify && canAddSteps ? (
              <Connector showAdd onAddCondition={addCondition} />
            ) : null}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
