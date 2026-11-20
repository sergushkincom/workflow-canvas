import type { NodeRunState } from "./run-machine";

/**
 * How the connector leading into a step reads during a Test run.
 *
 * `rest` — the step has not started. The builder line stays as it is.
 * `flowing` — the step is running. Dashes travel along the line toward it.
 * `solid` — the step has finished. The line is solid again and keeps its
 * existing stroke colour. This canvas does not tint edges by success or error.
 */
export type EdgeFlow = "rest" | "flowing" | "solid";

const FINISHED_STATES: ReadonlySet<NodeRunState> = new Set([
  "passed",
  "done",
  "skipped",
  "awaiting",
]);

/** Visual state of the edge that leads into a step, from that step's run state. */
export function edgeFlowForTarget(
  targetState: NodeRunState | undefined,
): EdgeFlow {
  if (targetState === "running") {
    return "flowing";
  }
  if (targetState !== undefined && FINISHED_STATES.has(targetState)) {
    return "solid";
  }
  return "rest";
}
