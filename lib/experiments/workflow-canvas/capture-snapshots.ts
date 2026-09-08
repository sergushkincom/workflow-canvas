import {
  CLASSIFY_REASONING,
  CLASSIFY_STEP_ID,
  SEED_CONDITION,
} from "./data";
import { CONDITION_MS, TRIGGER_MS } from "./run-timings";
import type { Run } from "./run-machine";
import { idleRun } from "./run-machine";

export type CaptureState = "idle" | "running" | "awaiting" | "done";

export const CAPTURE_STATES: CaptureState[] = [
  "idle",
  "running",
  "awaiting",
  "done",
];

export function isCaptureState(value: string | null): value is CaptureState {
  return (
    value === "idle" ||
    value === "running" ||
    value === "awaiting" ||
    value === "done"
  );
}

/** Frozen run snapshots for Figma screen captures (`?state=`). */
export function captureRunSnapshot(state: CaptureState): Run {
  const conditionId = SEED_CONDITION.id;

  switch (state) {
    case "idle":
      return idleRun;
    case "running":
      return {
        phase: "running",
        nodeStates: {
          trigger: "done",
          [conditionId]: "running",
          [CLASSIFY_STEP_ID]: "pending",
        },
        outputs: {
          trigger: "Ticket #4821 received",
        },
        elapsed: {
          trigger: TRIGGER_MS,
        },
        streamedText: "",
        totalMs: TRIGGER_MS,
      };
    case "awaiting":
      return {
        phase: "awaiting-decision",
        nodeStates: {
          trigger: "done",
          [conditionId]: "passed",
          [CLASSIFY_STEP_ID]: "awaiting",
        },
        outputs: {
          trigger: "Ticket #4821 received",
          [conditionId]: "Condition met",
        },
        elapsed: {
          trigger: TRIGGER_MS,
          [conditionId]: CONDITION_MS,
        },
        streamedText: CLASSIFY_REASONING,
        totalMs: TRIGGER_MS + CONDITION_MS,
      };
    case "done":
      return {
        phase: "done",
        nodeStates: {
          trigger: "done",
          [conditionId]: "passed",
          [CLASSIFY_STEP_ID]: "done",
        },
        outputs: {
          trigger: "Ticket #4821 received",
          [conditionId]: "Condition met",
          [CLASSIFY_STEP_ID]:
            "Classified as Billing dispute · confirmed by you",
        },
        elapsed: {
          trigger: TRIGGER_MS,
          [conditionId]: CONDITION_MS,
          [CLASSIFY_STEP_ID]: 2600,
        },
        streamedText: CLASSIFY_REASONING,
        decision: "confirmed",
        classifyLabel: "Billing dispute",
        totalMs: TRIGGER_MS + CONDITION_MS + 2600,
        resultText: "Routed to Billing · assigned to the on-call agent",
      };
  }
}
