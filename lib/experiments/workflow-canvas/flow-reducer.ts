import { rowSignature } from "./assistant";
import { SEED_CONDITION, TRIGGER } from "./data";
import { getNodeType } from "./node-types";
import type {
  ActionNode,
  ConditionNode,
  ConditionRow,
  FlowAction,
  FlowState,
} from "./types";
import {
  CONDITION_DEFAULT_WIDTH,
  TRIGGER_DEFAULT_WIDTH,
  clampNodeWidth,
  isConditionNode,
  stepDefaultName,
} from "./types";

function emptyRow(id: string): ConditionRow {
  return { id };
}

function emptyNode(id: string, rowId: string): ConditionNode {
  return {
    id,
    conjunction: "and",
    rows: [emptyRow(rowId)],
    width: CONDITION_DEFAULT_WIDTH,
  };
}

function mapNode(
  state: FlowState,
  nodeId: string,
  updater: (node: ConditionNode) => ConditionNode,
): FlowState {
  return {
    ...state,
    flow: {
      ...state.flow,
      steps: state.flow.steps.map((node) =>
        node.id === nodeId && isConditionNode(node) ? updater(node) : node,
      ),
    },
  };
}

/** Empty, whitespace, or the node's default label clears a custom name. */
function resolveCustomNodeName(
  raw: string,
  defaultName: string,
): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === defaultName) {
    return undefined;
  }
  return trimmed;
}

function withCustomName<T extends { name?: string }>(
  node: T,
  name: string | undefined,
): T {
  const next = { ...node };
  if (name) {
    next.name = name;
  } else {
    delete next.name;
  }
  return next;
}

function sameCustomName(current: string | undefined, next: string | undefined) {
  return (current || undefined) === next;
}

function renameTrigger(state: FlowState, raw: string): FlowState {
  const current = state.flow.trigger;
  const name = resolveCustomNodeName(raw, current.title);
  if (sameCustomName(current.name, name)) {
    return state;
  }
  return {
    ...state,
    flow: {
      ...state.flow,
      trigger: withCustomName(current, name),
    },
  };
}

function renameStep(state: FlowState, id: string, raw: string): FlowState {
  const index = state.flow.steps.findIndex((node) => node.id === id);
  const node = index < 0 ? undefined : state.flow.steps[index];
  if (!node) {
    return state;
  }
  const name = resolveCustomNodeName(raw, stepDefaultName(node));
  if (sameCustomName(node.name, name)) {
    return state;
  }
  const steps = state.flow.steps.slice();
  steps[index] = withCustomName(node, name);
  return {
    ...state,
    flow: {
      ...state.flow,
      steps,
    },
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export const initialFlowState: FlowState = {
  flow: {
    trigger: {
      id: "trigger",
      title: TRIGGER.title,
      description: TRIGGER.description,
      width: TRIGGER_DEFAULT_WIDTH,
    },
    steps: [
      {
        id: SEED_CONDITION.id,
        conjunction: SEED_CONDITION.conjunction,
        width: CONDITION_DEFAULT_WIDTH,
        rows: SEED_CONDITION.rows.map((row) => ({ ...row })),
      },
    ],
  },
  selectedId: null,
  triggerHintVisible: false,
};

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "select":
      return {
        ...state,
        selectedId: action.id,
        triggerHintVisible:
          action.id === "trigger" ? state.triggerHintVisible : false,
      };
    case "addConditionNode":
      return {
        ...state,
        triggerHintVisible: false,
        selectedId: action.id,
        flow: {
          ...state.flow,
          steps: [...state.flow.steps, emptyNode(action.id, action.rowId)],
        },
      };
    case "deleteNode": {
      if (action.id === "trigger") {
        return { ...state, triggerHintVisible: true, selectedId: "trigger" };
      }
      const exists = state.flow.steps.some((node) => node.id === action.id);
      if (!exists) {
        return state;
      }
      return {
        ...state,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        flow: {
          ...state.flow,
          steps: state.flow.steps.filter((node) => node.id !== action.id),
        },
      };
    }
    case "addRow":
      return mapNode(state, action.nodeId, (node) => ({
        ...node,
        rows: [...node.rows, emptyRow(action.rowId)],
      }));
    case "deleteRow":
      return mapNode(state, action.nodeId, (node) => {
        if (node.rows.length <= 1) {
          return { ...node, rows: [emptyRow(node.rows[0]?.id ?? action.rowId)] };
        }
        return {
          ...node,
          rows: node.rows.filter((row) => row.id !== action.rowId),
        };
      });
    case "reorderRows":
      return mapNode(state, action.nodeId, (node) => {
        const from = node.rows.findIndex((row) => row.id === action.activeId);
        const to = node.rows.findIndex((row) => row.id === action.overId);
        return { ...node, rows: moveItem(node.rows, from, to) };
      });
    case "moveRow":
      return mapNode(state, action.nodeId, (node) => {
        const from = node.rows.findIndex((row) => row.id === action.rowId);
        const to = action.direction === "up" ? from - 1 : from + 1;
        return { ...node, rows: moveItem(node.rows, from, to) };
      });
    case "setConjunction":
      return mapNode(state, action.nodeId, (node) => ({
        ...node,
        conjunction: action.conjunction,
      }));
    case "updateRow":
      return mapNode(state, action.nodeId, (node) => ({
        ...node,
        rows: node.rows.map((row) => {
          if (row.id !== action.rowId) {
            return row;
          }
          const next = { ...row, ...action.patch };
          if (action.patch.source !== undefined) {
            next.field = undefined;
            next.operator = undefined;
            next.value = undefined;
          } else if (action.patch.field !== undefined) {
            next.operator = undefined;
            next.value = undefined;
          } else if (action.patch.operator === "is empty") {
            next.value = undefined;
          }
          return next;
        }),
      }));
    case "appendRows":
      return mapNode(state, action.nodeId, (node) => {
        const existing = new Set(node.rows.map(rowSignature));
        const extra = action.rows.filter(
          (row) => !existing.has(rowSignature(row)),
        );
        if (extra.length === 0) {
          return node;
        }
        return { ...node, rows: [...node.rows, ...extra] };
      });
    case "resizeNode": {
      const width = clampNodeWidth(action.width);
      if (action.id === "trigger") {
        if (state.flow.trigger.width === width) {
          return state;
        }
        return {
          ...state,
          flow: {
            ...state.flow,
            trigger: { ...state.flow.trigger, width },
          },
        };
      }
      return {
        ...state,
        flow: {
          ...state.flow,
          steps: state.flow.steps.map((node) =>
            node.id === action.id && node.width !== width
              ? { ...node, width }
              : node,
          ),
        },
      };
    }
    case "renameNode":
      return action.id === "trigger"
        ? renameTrigger(state, action.name)
        : renameStep(state, action.id, action.name);
    case "insertNode": {
      const definition = getNodeType(action.nodeTypeId);
      if (!definition || state.flow.steps.some((node) => node.id === action.id)) {
        return state;
      }
      if (definition.group === "Triggers" && state.flow.trigger) {
        return state;
      }
      const node: ActionNode = {
        id: action.id,
        kind: "action",
        nodeTypeId: definition.id,
        title: definition.title,
        subtitle: definition.subtitle,
        width: CONDITION_DEFAULT_WIDTH,
      };
      const index = Math.max(
        0,
        Math.min(action.index, state.flow.steps.length),
      );
      const steps = state.flow.steps.slice();
      steps.splice(index, 0, node);
      return {
        ...state,
        triggerHintVisible: false,
        selectedId: node.id,
        flow: {
          ...state.flow,
          steps,
        },
      };
    }
    case "showTriggerHint":
      return { ...state, triggerHintVisible: true, selectedId: "trigger" };
    case "clearTriggerHint":
      return { ...state, triggerHintVisible: false };
    case "setTrigger": {
      const current = state.flow.trigger;
      if (
        current.nodeTypeId === action.nodeTypeId &&
        current.title === action.title &&
        current.description === action.description
      ) {
        return state;
      }
      return {
        ...state,
        triggerHintVisible: false,
        selectedId: "trigger",
        flow: {
          ...state.flow,
          trigger: {
            ...withCustomName(current, undefined),
            nodeTypeId: action.nodeTypeId,
            title: action.title,
            description: action.description,
          },
        },
      };
    }
    case "replaceFlow":
      return {
        ...state,
        triggerHintVisible: false,
        selectedId: null,
        flow: action.flow,
      };
    default:
      return state;
  }
}
