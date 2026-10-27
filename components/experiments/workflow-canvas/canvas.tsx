"use client";

import {
  DndContext,
  DragOverlay,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
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

import { ActionNodeCard } from "./action-node";
import { ConditionNodeCard } from "./condition-node";
import { Connector } from "./connector";
import { NodePalette, PaletteCardPreview } from "./node-palette";
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
  getNodeType,
  nodeTypeIsTrigger,
} from "@/lib/experiments/workflow-canvas/node-types";
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
  isConditionNode,
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

function readPaletteNodeTypeId(
  data: { current?: { nodeTypeId?: unknown } } | null | undefined,
): string | null {
  const value = data?.current?.nodeTypeId;
  return typeof value === "string" ? value : null;
}

const paletteCollisionDetection: CollisionDetection = (args) => {
  const nodeTypeId = readPaletteNodeTypeId(args.active.data);
  if (!nodeTypeId || nodeTypeIsTrigger(nodeTypeId)) {
    return [];
  }
  const pointer = args.pointerCoordinates;
  if (!pointer || typeof document === "undefined") {
    return [];
  }
  const canvas = document.querySelector("[data-workflow-canvas]");
  if (!(canvas instanceof HTMLElement)) {
    return [];
  }
  const bounds = canvas.getBoundingClientRect();
  const overCanvas =
    pointer.x >= bounds.left &&
    pointer.x <= bounds.right &&
    pointer.y >= bounds.top &&
    pointer.y <= bounds.bottom;
  if (!overCanvas) {
    return [];
  }

  let nearestId: (typeof args.droppableContainers)[number]["id"] | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const container of args.droppableContainers) {
    if (container.disabled) {
      continue;
    }
    if (typeof container.data.current?.insertIndex !== "number") {
      continue;
    }
    const rect = args.droppableRects.get(container.id);
    if (!rect) {
      continue;
    }
    const distance = Math.abs(rect.top + rect.height / 2 - pointer.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = container.id;
    }
  }
  return nearestId == null ? [] : [{ id: nearestId }];
}

function paletteTitle(data: { current?: { nodeTypeId?: unknown } } | null | undefined) {
  const nodeTypeId = readPaletteNodeTypeId(data);
  return nodeTypeId ? getNodeType(nodeTypeId)?.title : undefined;
}

const paletteAnnouncements: Announcements = {
  onDragStart({ active }) {
    const nodeTypeId = readPaletteNodeTypeId(active.data);
    if (nodeTypeId && nodeTypeIsTrigger(nodeTypeId)) {
      return "This flow already has a trigger.";
    }
    const title = paletteTitle(active.data);
    return title ? `Picked up ${title}.` : undefined;
  },
  onDragOver({ active, over }) {
    const nodeTypeId = readPaletteNodeTypeId(active.data);
    if (nodeTypeId && nodeTypeIsTrigger(nodeTypeId)) {
      return "This flow already has a trigger.";
    }
    const title = paletteTitle(active.data);
    const index = over?.data.current?.insertIndex;
    if (!title || typeof index !== "number") {
      return title ? `${title} is not over the flow.` : undefined;
    }
    return `${title} will insert at position ${index + 1}.`;
  },
  onDragEnd({ active, over }) {
    const nodeTypeId = readPaletteNodeTypeId(active.data);
    if (nodeTypeId && nodeTypeIsTrigger(nodeTypeId)) {
      return "This flow already has a trigger.";
    }
    const title = paletteTitle(active.data);
    if (!title || typeof over?.data.current?.insertIndex !== "number") {
      return title ? `${title} was not added.` : undefined;
    }
    return `${title} added.`;
  },
  onDragCancel({ active }) {
    const title = paletteTitle(active.data);
    return title ? `Cancelled dragging ${title}.` : "Drag cancelled.";
  },
};;

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
    const condition = node && isConditionNode(node) ? node : null;
    timers.setTimeout(() => {
      const passed = condition ? evaluateConditionNode(condition) : false;
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
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [assistantMinimized, setAssistantMinimized] = useState(false);
  const [assistantNarrow, setAssistantNarrow] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [dragTypeId, setDragTypeId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);

  const incomplete = incompleteStepCount(state.flow);
  const editingLocked =
    run.phase === "running" || run.phase === "awaiting-decision";
  const hideEditChrome = editingLocked;
  const canAddSteps = !editingLocked;
  const assistantEnabled = run.phase === "idle";

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    function sync() {
      setAssistantNarrow(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("[data-node-palette]")
      ) {
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
      if (assistantId === id) {
        closeAssistant();
      }
      setExitingId(id);
      window.setTimeout(() => {
        dispatch({ type: "deleteNode", id });
        setExitingId(null);
      }, 100);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.selectedId, exitingId, editingLocked, run.phase, assistantId]);

  function closeAssistant() {
    setAssistantId(null);
    setAssistantMinimized(false);
  }

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

  function insertNodeAt(nodeTypeId: string, index: number) {
    if (nodeTypeIsTrigger(nodeTypeId) && state.flow.trigger) {
      setNotice("This flow already has a trigger.");
      return;
    }
    if (editingLocked || !getNodeType(nodeTypeId)) {
      return;
    }
    setNotice(null);
    const id = crypto.randomUUID();
    safeEdit({ type: "insertNode", id, nodeTypeId, index });
    setEnteringId(id);
  }

  function clearPaletteDrag() {
    setDragTypeId(null);
    setOverDropId(null);
  }

  function onPaletteDragStart(event: DragStartEvent) {
    const nodeTypeId = readPaletteNodeTypeId(event.active.data);
    setDragTypeId(nodeTypeId);
    if (nodeTypeId && nodeTypeIsTrigger(nodeTypeId) && state.flow.trigger) {
      setNotice("This flow already has a trigger.");
      return;
    }
    setNotice(null);
  }

  function onPaletteDragOver(event: DragOverEvent) {
    const index = event.over?.data.current?.insertIndex;
    setOverDropId(
      typeof index === "number" && event.over ? String(event.over.id) : null,
    );
  }

  function onPaletteDragEnd(event: DragEndEvent) {
    const nodeTypeId = readPaletteNodeTypeId(event.active.data);
    const index = event.over?.data.current?.insertIndex;
    clearPaletteDrag();
    if (!nodeTypeId || typeof index !== "number") {
      if (nodeTypeId && nodeTypeIsTrigger(nodeTypeId) && state.flow.trigger) {
        setNotice("This flow already has a trigger.");
      }
      return;
    }
    insertNodeAt(nodeTypeId, index);
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
  const dragPreview = dragTypeId ? getNodeType(dragTypeId) : undefined;

  return (
    <TooltipProvider delayDuration={200}>
      <DndContext
        sensors={sensors}
        collisionDetection={paletteCollisionDetection}
        autoScroll={false}
        accessibility={{
          announcements: paletteAnnouncements,
          screenReaderInstructions: {
            draggable:
              "Press enter on the card to add it at the end of the flow. Drag the handle onto the canvas to choose a position.",
          },
        }}
        onDragStart={onPaletteDragStart}
        onDragOver={onPaletteDragOver}
        onDragEnd={onPaletteDragEnd}
        onDragCancel={clearPaletteDrag}
      >
      <div className="flex h-dvh bg-page">
        <NodePalette
          notice={notice}
          locked={editingLocked}
          onAppend={(nodeTypeId) =>
            insertNodeAt(nodeTypeId, state.flow.steps.length)
          }
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar
          stepCount={stepCount(state.flow)}
          incompleteCount={incomplete}
          runPhase={run.phase}
          totalMs={run.totalMs}
          onTestRun={() => {
            if (incomplete > 0) {
              return;
            }
            closeAssistant();
            setStartedAt({});
            startedAtRef.current = {};
            dispatchRun({ type: "start", flow: state.flow });
          }}
          onStop={stopRun}
        />
        <div
          data-workflow-canvas=""
          className="canvas-dots relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto"
          onClick={(event) => {
            if (editingLocked) {
              return;
            }
            if (event.target === event.currentTarget) {
              safeEdit({ type: "select", id: null });
            }
          }          }
        >
          {notice ? (
            <p
              aria-hidden
              className="pointer-events-none absolute top-4 left-4 z-30 rounded-[6px] bg-surface px-2.5 py-1 text-[13px] leading-tight text-ink-2 shadow-card"
            >
              {notice}
            </p>
          ) : null}
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
                  <Connector
                    dropId={`insert-${index}`}
                    insertIndex={index}
                    insertion={overDropId === `insert-${index}`}
                  />
                  {isConditionNode(node) ? (
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
                        assistantEnabled={assistantEnabled}
                        assistantOpen={assistantId === node.id}
                        assistantMinimized={
                          assistantId === node.id && assistantMinimized
                        }
                        assistantNarrow={assistantNarrow}
                        onAssistantOpen={() => {
                          setAssistantId(node.id);
                          setAssistantMinimized(false);
                        }}
                        onAssistantClose={() => {
                          setAssistantId(null);
                          setAssistantMinimized(false);
                        }}
                        onAssistantMinimize={() => {
                          setAssistantId(node.id);
                          setAssistantMinimized(true);
                        }}
                      />
                    </SortableContext>
                  </DndContext>
                  ) : (
                    <ActionNodeCard
                      node={node}
                      selected={state.selectedId === node.id}
                      entering={enteringId === node.id}
                      exiting={exitingId === node.id}
                      onSelect={() =>
                        safeEdit({ type: "select", id: node.id })
                      }
                      dispatch={safeEdit}
                      readOnly={editingLocked}
                    />
                  )}
                  {isLast && !showClassify ? (
                    <Connector
                      showAdd
                      hideAdd={!canAddSteps}
                      onAddCondition={addCondition}
                      dropId="insert-end"
                      insertIndex={state.flow.steps.length}
                      insertion={overDropId === "insert-end"}
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
                dropId="insert-end"
                insertIndex={0}
                insertion={overDropId === "insert-end"}
              />
            ) : null}

            {showClassify && classifyState ? (
              <>
                <Connector
                  dropId="insert-before-ai"
                  insertIndex={state.flow.steps.length}
                  insertion={overDropId === "insert-before-ai"}
                />
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
              <Connector
                showAdd
                onAddCondition={addCondition}
                dropId="insert-after-ai"
                insertIndex={state.flow.steps.length}
                insertion={overDropId === "insert-after-ai"}
              />
            ) : null}
          </div>
        </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragPreview ? <PaletteCardPreview nodeType={dragPreview} /> : null}
      </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}
