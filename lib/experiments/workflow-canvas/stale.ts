import { flowReducer } from "./flow-reducer";
import type { Flow, FlowAction, FlowState } from "./types";
import { isActionNode } from "./types";

/** `edited` is the step whose configuration changed. `upstream` ran after it. */
export type StaleReason = "edited" | "upstream";

/**
 * Copy is a sentence about what to do. Internal parameter paths
 * (for example `conditions.conditions.0.rightValue`) are never shown.
 * An unfinished step stays a quiet "incomplete" state — not an error.
 */
export const STALE_HINT = "Step changed. Run again to update the result";
export const STALE_UPSTREAM_HINT =
  "An earlier step changed. Run again to update the result";
export const RUN_AGAIN_LABEL = "Run again";
export const COMPLETE_STEPS_TO_RUN = "Complete every step to run";
export const FINISH_STEP_THEN_RUN = "Finish this step, then run again.";

const PARAMETER_PATH =
  /(?:^|[\s'"`])(?:[A-Za-z_][\w]*\.)+[A-Za-z_][\w]*(?:\[\d+\]|\.\d+)?|\brightValue\b|\[[0-9]+\]/;

export function staleHint(reason: StaleReason): string {
  return reason === "edited" ? STALE_HINT : STALE_UPSTREAM_HINT;
}

export function hasStaleResults(stale: Record<string, StaleReason>): boolean {
  return Object.keys(stale).length > 0;
}

/** Rewrites internal parameter paths into a sentence about what to do. */
export function humanizeIssue(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || PARAMETER_PATH.test(trimmed)) {
    return FINISH_STEP_THEN_RUN;
  }
  return trimmed;
}

export function applyConfigStale(
  stale: Record<string, StaleReason>,
  outputs: Record<string, string>,
  orderedIds: string[],
  editedId: string,
): Record<string, StaleReason> {
  const index = orderedIds.indexOf(editedId);
  if (index < 0) {
    return stale;
  }

  let next = stale;
  for (let cursor = index; cursor < orderedIds.length; cursor += 1) {
    const id = orderedIds[cursor];
    if (!outputs[id]) {
      continue;
    }
    const reason: StaleReason = id === editedId ? "edited" : "upstream";
    if (next[id] === "edited" || next[id] === reason) {
      continue;
    }
    if (next === stale) {
      next = { ...stale };
    }
    next[id] = reason;
  }
  return next;
}

/** Node whose settings changed, ignoring layout-only edits such as resize. */
export function configNodeId(action: FlowAction): string | null {
  switch (action.type) {
    case "updateRow":
    case "addRow":
    case "deleteRow":
    case "reorderRows":
    case "moveRow":
    case "setConjunction":
    case "appendRows":
      return action.nodeId;
    case "setTrigger":
      return "trigger";
    default:
      return null;
  }
}

/** Adding, removing, or replacing steps changes the graph, so the run is cleared. */
export function isStructuralEdit(action: FlowAction): boolean {
  return (
    action.type === "addConditionNode" ||
    action.type === "deleteNode" ||
    action.type === "insertNode" ||
    action.type === "replaceFlow"
  );
}

/** Configuration that can change a node's output. Width is layout, not config. */
export function nodeConfigKey(flow: Flow, nodeId: string): string {
  if (nodeId === flow.trigger.id) {
    const { nodeTypeId, title, description } = flow.trigger;
    return JSON.stringify({
      kind: "trigger",
      nodeTypeId: nodeTypeId ?? "",
      title,
      description,
    });
  }

  const node = flow.steps.find((step) => step.id === nodeId);
  if (!node) {
    return "";
  }
  if (isActionNode(node)) {
    return JSON.stringify({
      kind: "action",
      nodeTypeId: node.nodeTypeId,
      title: node.title,
      subtitle: node.subtitle,
    });
  }
  return JSON.stringify({
    kind: "condition",
    conjunction: node.conjunction,
    rows: node.rows.map((row) => ({
      source: row.source ?? "",
      field: row.field ?? "",
      operator: row.operator ?? "",
      value: row.value ?? "",
    })),
  });
}

/**
 * The node to mark stale after `action`, or null when the edit does not
 * change configuration (selection, resize, or the same value again).
 */
export function changedConfigNodeId(
  state: FlowState,
  action: FlowAction,
): string | null {
  const id = configNodeId(action);
  if (!id) {
    return null;
  }
  const next = flowReducer(state, action);
  if (nodeConfigKey(state.flow, id) === nodeConfigKey(next.flow, id)) {
    return null;
  }
  return id;
}
