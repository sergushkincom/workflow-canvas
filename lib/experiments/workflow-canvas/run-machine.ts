import {
  CLASSIFY_REASONING,
  CLASSIFY_STEP_ID,
  SAMPLE_TICKET,
  SAMPLE_TICKET_VALUES,
} from "./data";
import {
  AI_THINK_DELAY_MS,
  CONDITION_MS,
  STREAM_CHAR_MS,
  TRIGGER_MS,
} from "./run-timings";
import type { ConditionNode, ConditionRow, Flow } from "./types";

export type RunPhase = "idle" | "running" | "awaiting-decision" | "done";

export type NodeRunState =
  | "pending"
  | "running"
  | "passed"
  | "skipped"
  | "awaiting"
  | "done";

export type Run = {
  phase: RunPhase;
  nodeStates: Record<string, NodeRunState>;
  outputs: Record<string, string>;
  elapsed: Record<string, number>;
  streamedText: string;
  decision?: "confirmed" | "escalated";
  totalMs?: number;
  resultText?: string;
  classifyLabel?: "Billing dispute" | "Integration issue";
};

export type RunAction =
  | { type: "start"; flow: Flow }
  | { type: "stop" }
  | { type: "markRunning"; id: string }
  | {
      type: "finishNode";
      id: string;
      state: Extract<NodeRunState, "done" | "passed" | "skipped">;
      output: string;
      elapsedMs: number;
      skipBelowIds?: string[];
    }
  | { type: "appendStream"; fullText: string }
  | { type: "enterAwaiting"; id: string }
  | {
      type: "confirm";
      label: "Billing dispute" | "Integration issue";
      elapsedMs: number;
    }
  | { type: "escalate"; elapsedMs: number };

export const idleRun: Run = {
  phase: "idle",
  nodeStates: {},
  outputs: {},
  elapsed: {},
  streamedText: "",
};

export function orderedRunIds(flow: Flow): string[] {
  return [
    "trigger",
    ...flow.steps.map((node) => node.id),
    CLASSIFY_STEP_ID,
  ];
}

export function createRun(flow: Flow): Run {
  const nodeStates: Record<string, NodeRunState> = {};
  for (const id of orderedRunIds(flow)) {
    nodeStates[id] = "pending";
  }
  return {
    phase: "running",
    nodeStates,
    outputs: {},
    elapsed: {},
    streamedText: "",
  };
}

export function evaluateRow(row: ConditionRow): boolean {
  if (!row.source || !row.field || !row.operator) {
    return false;
  }
  const key = `${row.source}.${row.field}`;
  const actual = SAMPLE_TICKET_VALUES[key];
  if (row.operator === "is empty") {
    return !actual;
  }
  if (actual === undefined) {
    return false;
  }
  const expected = row.value ?? "";
  switch (row.operator) {
    case "is":
      return actual.toLowerCase() === expected.toLowerCase();
    case "is not":
      return actual.toLowerCase() !== expected.toLowerCase();
    case "contains":
      return actual.toLowerCase().includes(expected.toLowerCase());
    case "is greater than":
      return Number(actual) > Number(expected);
    case "is less than":
      return Number(actual) < Number(expected);
    default:
      return false;
  }
}

export function evaluateConditionNode(node: ConditionNode): boolean {
  if (node.rows.length === 0) {
    return false;
  }
  if (node.conjunction === "and") {
    return node.rows.every(evaluateRow);
  }
  return node.rows.some(evaluateRow);
}

function sumElapsed(elapsed: Record<string, number>): number {
  return Object.values(elapsed).reduce((sum, value) => sum + value, 0);
}

export function runReducer(state: Run, action: RunAction): Run {
  switch (action.type) {
    case "start":
      return createRun(action.flow);
    case "stop":
      return idleRun;
    case "markRunning":
      return {
        ...state,
        phase: "running",
        nodeStates: { ...state.nodeStates, [action.id]: "running" },
        streamedText:
          action.id === CLASSIFY_STEP_ID ? "" : state.streamedText,
      };
    case "finishNode": {
      const nodeStates = { ...state.nodeStates, [action.id]: action.state };
      const outputs = { ...state.outputs, [action.id]: action.output };
      const elapsed = { ...state.elapsed, [action.id]: action.elapsedMs };
      if (action.skipBelowIds) {
        for (const id of action.skipBelowIds) {
          nodeStates[id] = "skipped";
        }
      }
      const hasPending = Object.values(nodeStates).some(
        (value) => value === "pending",
      );
      return {
        ...state,
        phase: hasPending ? state.phase : "done",
        nodeStates,
        outputs,
        elapsed,
        totalMs: sumElapsed(elapsed),
      };
    }
    case "appendStream": {
      const nextLength = Math.min(
        state.streamedText.length + 1,
        action.fullText.length,
      );
      return {
        ...state,
        streamedText: action.fullText.slice(0, nextLength),
      };
    }
    case "enterAwaiting": {
      return {
        ...state,
        phase: "awaiting-decision",
        nodeStates: { ...state.nodeStates, [action.id]: "awaiting" },
        streamedText: CLASSIFY_REASONING,
      };
    }
    case "confirm": {
      const elapsed = {
        ...state.elapsed,
        [CLASSIFY_STEP_ID]: action.elapsedMs,
      };
      const totalMs = sumElapsed(elapsed);
      return {
        ...state,
        phase: "done",
        decision: "confirmed",
        classifyLabel: action.label,
        nodeStates: { ...state.nodeStates, [CLASSIFY_STEP_ID]: "done" },
        outputs: {
          ...state.outputs,
          [CLASSIFY_STEP_ID]: `Classified as ${action.label} · confirmed by you`,
        },
        elapsed,
        totalMs,
        resultText: "Routed to Billing · assigned to the on-call agent",
      };
    }
    case "escalate": {
      const elapsed = {
        ...state.elapsed,
        [CLASSIFY_STEP_ID]: action.elapsedMs,
      };
      const totalMs = sumElapsed(elapsed);
      return {
        ...state,
        phase: "done",
        decision: "escalated",
        nodeStates: { ...state.nodeStates, [CLASSIFY_STEP_ID]: "done" },
        outputs: {
          ...state.outputs,
          [CLASSIFY_STEP_ID]: "Escalated without classification",
        },
        elapsed,
        totalMs,
        resultText: "Sent to triage queue · no automatic routing applied",
      };
    }
    default:
      return state;
  }
}

export function formatElapsed(ms: number): string {
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatClockTime(ts: number): string {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function idsBelow(orderedIds: string[], id: string): string[] {
  const index = orderedIds.indexOf(id);
  if (index < 0) {
    return [];
  }
  return orderedIds.slice(index + 1);
}

export function nextPendingId(run: Run, orderedIds: string[]): string | null {
  for (const id of orderedIds) {
    if (run.nodeStates[id] === "pending") {
      return id;
    }
  }
  return null;
}

export function runningId(run: Run): string | null {
  for (const [id, state] of Object.entries(run.nodeStates)) {
    if (state === "running") {
      return id;
    }
  }
  return null;
}

export function classifyStreamDurationMs(): number {
  return AI_THINK_DELAY_MS + CLASSIFY_REASONING.length * STREAM_CHAR_MS;
}

export function triggerOutput(): string {
  return `Ticket #${SAMPLE_TICKET.id} received`;
}

export { TRIGGER_MS, CONDITION_MS, CLASSIFY_STEP_ID, CLASSIFY_REASONING };
