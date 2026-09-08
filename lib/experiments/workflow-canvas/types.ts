export type Conjunction = "and" | "or";

export type TriggerNode = {
  id: "trigger";
  title: string;
  description: string;
  width: number;
};

export type ConditionRow = {
  id: string;
  source?: string;
  field?: string;
  operator?: string;
  value?: string;
};

export type ConditionNode = {
  id: string;
  conjunction: Conjunction;
  rows: ConditionRow[];
  width: number;
};

export type Flow = {
  trigger: TriggerNode;
  steps: ConditionNode[];
};

export type SelectedId = "trigger" | string | null;

export type FlowState = {
  flow: Flow;
  selectedId: SelectedId;
  triggerHintVisible: boolean;
};

export type FlowAction =
  | { type: "select"; id: SelectedId }
  | { type: "addConditionNode"; id: string; rowId: string }
  | { type: "deleteNode"; id: string }
  | { type: "addRow"; nodeId: string; rowId: string }
  | { type: "deleteRow"; nodeId: string; rowId: string }
  | { type: "reorderRows"; nodeId: string; activeId: string; overId: string }
  | { type: "moveRow"; nodeId: string; rowId: string; direction: "up" | "down" }
  | { type: "setConjunction"; nodeId: string; conjunction: Conjunction }
  | {
      type: "updateRow";
      nodeId: string;
      rowId: string;
      patch: Partial<Omit<ConditionRow, "id">>;
    }
  | { type: "resizeNode"; id: string; width: number }
  | { type: "showTriggerHint" }
  | { type: "clearTriggerHint" };

export const TRIGGER_DEFAULT_WIDTH = 440;
export const CONDITION_DEFAULT_WIDTH = 440;
export const NODE_MIN_WIDTH = 280;
export const NODE_MAX_WIDTH = 1200;

export function clampNodeWidth(width: number): number {
  return Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, Math.round(width)));
}

export function isRowComplete(row: ConditionRow): boolean {
  if (!row.source || !row.field || !row.operator) {
    return false;
  }
  if (row.operator === "is empty") {
    return true;
  }
  return Boolean(row.value);
}

export function isNodeIncomplete(node: ConditionNode): boolean {
  return node.rows.some((row) => !isRowComplete(row));
}

export function incompleteStepCount(flow: Flow): number {
  return flow.steps.filter(isNodeIncomplete).length;
}

export function stepCount(flow: Flow): number {
  return 1 + flow.steps.length;
}
