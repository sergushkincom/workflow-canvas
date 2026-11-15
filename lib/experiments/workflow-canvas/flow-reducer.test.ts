import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { SEED_CONDITION, TRIGGER } from "./data";
import { flowReducer, initialFlowState } from "./flow-reducer";
import { getNodeType } from "./node-types";
import {
  CONDITION_DEFAULT_WIDTH,
  NODE_MAX_WIDTH,
  NODE_MIN_WIDTH,
  TRIGGER_DEFAULT_WIDTH,
  isActionNode,
  isConditionNode,
  type ActionNode,
  type ConditionNode,
  type ConditionRow,
  type FlowAction,
  type FlowState,
} from "./types";

function fresh(): FlowState {
  return structuredClone(initialFlowState);
}

function condition(state: FlowState, nodeId: string): ConditionNode {
  const node = state.flow.steps.find((item) => item.id === nodeId);
  if (!node || !isConditionNode(node)) {
    assert.fail(`expected condition step ${nodeId}`);
  }
  return node;
}

function action(state: FlowState, nodeId: string): ActionNode {
  const node = state.flow.steps.find((item) => item.id === nodeId);
  if (!node || !isActionNode(node)) {
    assert.fail(`expected action step ${nodeId}`);
  }
  return node;
}

function rowIds(state: FlowState, nodeId: string): string[] {
  return condition(state, nodeId).rows.map((row) => row.id);
}

function withThirdRow(state: FlowState = fresh()): FlowState {
  return flowReducer(state, {
    type: "addRow",
    nodeId: SEED_CONDITION.id,
    rowId: "seed-row-3",
  });
}

describe("flowReducer", () => {
  test("initial state seeds the trigger and the demo condition", () => {
    const state = fresh();

    assert.equal(state.selectedId, null);
    assert.equal(state.triggerHintVisible, false);
    assert.deepEqual(state.flow.trigger, {
      id: "trigger",
      title: TRIGGER.title,
      description: TRIGGER.description,
      width: TRIGGER_DEFAULT_WIDTH,
    });
    assert.deepEqual(
      state.flow.steps.map((node) => node.id),
      [SEED_CONDITION.id],
    );

    const seed = condition(state, SEED_CONDITION.id);
    assert.equal(seed.conjunction, "and");
    assert.equal(seed.width, CONDITION_DEFAULT_WIDTH);
    assert.deepEqual(seed.rows, SEED_CONDITION.rows);
    assert.notEqual(seed.rows, SEED_CONDITION.rows);
  });

  test("select stores the id and clears the trigger hint unless the trigger stays selected", () => {
    let state = flowReducer(fresh(), { type: "showTriggerHint" });

    state = flowReducer(state, { type: "select", id: SEED_CONDITION.id });
    assert.equal(state.selectedId, SEED_CONDITION.id);
    assert.equal(state.triggerHintVisible, false);

    state = flowReducer(state, { type: "showTriggerHint" });
    state = flowReducer(state, { type: "select", id: "trigger" });
    assert.equal(state.selectedId, "trigger");
    assert.equal(state.triggerHintVisible, true);

    state = flowReducer(state, { type: "select", id: null });
    assert.equal(state.selectedId, null);
    assert.equal(state.triggerHintVisible, false);
  });

  test("addConditionNode appends an empty condition and selects it", () => {
    const state = flowReducer(fresh(), { type: "showTriggerHint" });
    const next = flowReducer(state, {
      type: "addConditionNode",
      id: "cond-2",
      rowId: "row-new",
    });

    assert.equal(next.triggerHintVisible, false);
    assert.equal(next.selectedId, "cond-2");
    assert.deepEqual(
      next.flow.steps.map((node) => node.id),
      [SEED_CONDITION.id, "cond-2"],
    );
    assert.equal(next.flow.steps[0], state.flow.steps[0]);
    assert.deepEqual(condition(next, "cond-2"), {
      id: "cond-2",
      conjunction: "and",
      width: CONDITION_DEFAULT_WIDTH,
      rows: [{ id: "row-new" }],
    });
  });

  test("deleteNode removes a step and clears the selection only when that step was selected", () => {
    const added = flowReducer(fresh(), {
      type: "addConditionNode",
      id: "cond-2",
      rowId: "row-new",
    });
    const keptSelection = flowReducer(added, {
      type: "deleteNode",
      id: SEED_CONDITION.id,
    });
    assert.deepEqual(
      keptSelection.flow.steps.map((node) => node.id),
      ["cond-2"],
    );
    assert.equal(keptSelection.selectedId, "cond-2");
    assert.deepEqual(keptSelection.flow.trigger, added.flow.trigger);

    const cleared = flowReducer(keptSelection, {
      type: "deleteNode",
      id: "cond-2",
    });
    assert.deepEqual(cleared.flow.steps, []);
    assert.equal(cleared.selectedId, null);
    assert.equal(cleared.flow.trigger.id, "trigger");
  });

  test("deleteNode refuses to remove the trigger and shows the hint instead", () => {
    const state = flowReducer(fresh(), {
      type: "select",
      id: SEED_CONDITION.id,
    });
    const next = flowReducer(state, { type: "deleteNode", id: "trigger" });

    assert.equal(next.selectedId, "trigger");
    assert.equal(next.triggerHintVisible, true);
    assert.equal(next.flow, state.flow);
    assert.deepEqual(
      next.flow.steps.map((node) => node.id),
      [SEED_CONDITION.id],
    );
  });

  test("deleteNode of an unknown id is a no-op", () => {
    const state = flowReducer(fresh(), { type: "select", id: SEED_CONDITION.id });
    const next = flowReducer(state, { type: "deleteNode", id: "missing" });
    assert.equal(next, state);
  });

  test("addRow appends an empty row on the targeted condition only", () => {
    const state = flowReducer(fresh(), {
      type: "addConditionNode",
      id: "cond-2",
      rowId: "row-new",
    });
    const next = flowReducer(state, {
      type: "addRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-3",
    });

    assert.deepEqual(rowIds(next, SEED_CONDITION.id), [
      "seed-row-1",
      "seed-row-2",
      "seed-row-3",
    ]);
    assert.deepEqual(condition(next, SEED_CONDITION.id).rows[2], {
      id: "seed-row-3",
    });
    assert.equal(condition(next, "cond-2").rows.length, 1);
    assert.equal(next.flow.steps[1], state.flow.steps[1]);
  });

  test("addRow on an unknown id or an action step leaves every step as it was", () => {
    let state = flowReducer(fresh(), {
      type: "insertNode",
      id: "assign",
      nodeTypeId: "assign-to-queue",
      index: 1,
    });
    const missing = flowReducer(state, {
      type: "addRow",
      nodeId: "missing",
      rowId: "nope",
    });
    assert.equal(missing.flow.steps[0], state.flow.steps[0]);
    assert.equal(missing.flow.steps[1], state.flow.steps[1]);

    state = missing;
    const onAction = flowReducer(state, {
      type: "addRow",
      nodeId: "assign",
      rowId: "nope",
    });
    assert.equal(onAction.flow.steps[0], state.flow.steps[0]);
    assert.equal(onAction.flow.steps[1], state.flow.steps[1]);
    assert.equal(isActionNode(onAction.flow.steps[1]), true);
  });

  test("deleteRow removes one row until the last, which is blanked in place", () => {
    const removed = flowReducer(fresh(), {
      type: "deleteRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-2",
    });
    assert.deepEqual(rowIds(removed, SEED_CONDITION.id), ["seed-row-1"]);
    assert.equal(condition(removed, SEED_CONDITION.id).rows[0]?.field, "channel");

    const blanked = flowReducer(removed, {
      type: "deleteRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-1",
    });
    assert.deepEqual(condition(blanked, SEED_CONDITION.id).rows, [
      { id: "seed-row-1" },
    ]);
  });

  test("deleteRow of an unknown id keeps multiple rows, but still blanks a one-row node", () => {
    const state = fresh();
    const kept = flowReducer(state, {
      type: "deleteRow",
      nodeId: SEED_CONDITION.id,
      rowId: "missing",
    });
    assert.deepEqual(rowIds(kept, SEED_CONDITION.id), [
      "seed-row-1",
      "seed-row-2",
    ]);

    const single = flowReducer(state, {
      type: "deleteRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-2",
    });
    const blanked = flowReducer(single, {
      type: "deleteRow",
      nodeId: SEED_CONDITION.id,
      rowId: "missing",
    });
    assert.deepEqual(condition(blanked, SEED_CONDITION.id).rows, [
      { id: "seed-row-1" },
    ]);
  });

  test("reorderRows moves the dragged row onto the drop target", () => {
    const state = withThirdRow();
    const next = flowReducer(state, {
      type: "reorderRows",
      nodeId: SEED_CONDITION.id,
      activeId: "seed-row-3",
      overId: "seed-row-1",
    });
    assert.deepEqual(rowIds(next, SEED_CONDITION.id), [
      "seed-row-3",
      "seed-row-1",
      "seed-row-2",
    ]);

    const sameSpot = flowReducer(next, {
      type: "reorderRows",
      nodeId: SEED_CONDITION.id,
      activeId: "seed-row-1",
      overId: "seed-row-1",
    });
    assert.deepEqual(rowIds(sameSpot, SEED_CONDITION.id), [
      "seed-row-3",
      "seed-row-1",
      "seed-row-2",
    ]);
  });

  test("reorderRows with an unknown row id keeps the current order and row array", () => {
    const state = withThirdRow();
    const rows = condition(state, SEED_CONDITION.id).rows;
    const next = flowReducer(state, {
      type: "reorderRows",
      nodeId: SEED_CONDITION.id,
      activeId: "missing",
      overId: "seed-row-1",
    });
    assert.equal(condition(next, SEED_CONDITION.id).rows, rows);
  });

  test("moveRow swaps with the neighbour and refuses to move past either end", () => {
    const state = withThirdRow();
    const down = flowReducer(state, {
      type: "moveRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-1",
      direction: "down",
    });
    assert.deepEqual(rowIds(down, SEED_CONDITION.id), [
      "seed-row-2",
      "seed-row-1",
      "seed-row-3",
    ]);

    const up = flowReducer(down, {
      type: "moveRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-3",
      direction: "up",
    });
    assert.deepEqual(rowIds(up, SEED_CONDITION.id), [
      "seed-row-2",
      "seed-row-3",
      "seed-row-1",
    ]);

    const top = condition(state, SEED_CONDITION.id).rows;
    const stayed = flowReducer(state, {
      type: "moveRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-1",
      direction: "up",
    });
    assert.equal(condition(stayed, SEED_CONDITION.id).rows, top);

    const bottom = condition(up, SEED_CONDITION.id).rows;
    const stayedBottom = flowReducer(up, {
      type: "moveRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-1",
      direction: "down",
    });
    assert.equal(condition(stayedBottom, SEED_CONDITION.id).rows, bottom);
  });

  test("setConjunction updates only the targeted condition", () => {
    const state = flowReducer(fresh(), {
      type: "addConditionNode",
      id: "cond-2",
      rowId: "row-new",
    });
    const next = flowReducer(state, {
      type: "setConjunction",
      nodeId: SEED_CONDITION.id,
      conjunction: "or",
    });
    assert.equal(condition(next, SEED_CONDITION.id).conjunction, "or");
    assert.equal(condition(next, "cond-2").conjunction, "and");

    const back = flowReducer(next, {
      type: "setConjunction",
      nodeId: SEED_CONDITION.id,
      conjunction: "and",
    });
    assert.equal(condition(back, SEED_CONDITION.id).conjunction, "and");

    const onAction = flowReducer(
      flowReducer(state, {
        type: "insertNode",
        id: "assign",
        nodeTypeId: "assign-to-queue",
        index: 2,
      }),
      {
        type: "setConjunction",
        nodeId: "assign",
        conjunction: "or",
      },
    );
    assert.equal(isActionNode(action(onAction, "assign")), true);
    assert.equal(condition(onAction, SEED_CONDITION.id).conjunction, "and");
  });

  test("updateRow applies a patch and clears fields that no longer belong", () => {
    const nodeId = SEED_CONDITION.id;
    const rowId = "seed-row-1";
    let state = flowReducer(fresh(), {
      type: "updateRow",
      nodeId,
      rowId,
      patch: { value: "chat" },
    });
    assert.deepEqual(condition(state, nodeId).rows[0], {
      id: rowId,
      source: "ticket",
      field: "channel",
      operator: "is",
      value: "chat",
    });

    state = flowReducer(state, {
      type: "updateRow",
      nodeId,
      rowId,
      patch: { operator: "is not" },
    });
    assert.equal(condition(state, nodeId).rows[0]?.operator, "is not");
    assert.equal(condition(state, nodeId).rows[0]?.value, "chat");

    state = flowReducer(state, {
      type: "updateRow",
      nodeId,
      rowId,
      patch: { operator: "is empty", value: "kept-only-if-the-reducer-lets-it" },
    });
    assert.equal(condition(state, nodeId).rows[0]?.operator, "is empty");
    assert.equal(condition(state, nodeId).rows[0]?.value, undefined);
    assert.equal(condition(state, nodeId).rows[0]?.field, "channel");

    state = flowReducer(state, {
      type: "updateRow",
      nodeId,
      rowId,
      patch: { field: "priority", operator: "is", value: "urgent" },
    });
    assert.deepEqual(condition(state, nodeId).rows[0], {
      id: rowId,
      source: "ticket",
      field: "priority",
      operator: undefined,
      value: undefined,
    });

    state = flowReducer(state, {
      type: "updateRow",
      nodeId,
      rowId,
      patch: { source: "account", field: "seats", operator: "is", value: "10" },
    });
    assert.deepEqual(condition(state, nodeId).rows[0], {
      id: rowId,
      source: "account",
      field: undefined,
      operator: undefined,
      value: undefined,
    });
    assert.equal(condition(state, nodeId).rows[1]?.field, "lifetime-value");
  });

  test("updateRow leaves a row alone when the id does not match", () => {
    const state = fresh();
    const next = flowReducer(state, {
      type: "updateRow",
      nodeId: SEED_CONDITION.id,
      rowId: "missing",
      patch: { value: "chat" },
    });
    assert.equal(
      condition(next, SEED_CONDITION.id).rows[0],
      condition(state, SEED_CONDITION.id).rows[0],
    );
    assert.equal(
      condition(next, SEED_CONDITION.id).rows[1],
      condition(state, SEED_CONDITION.id).rows[1],
    );
  });

  test("appendRows adds rows that are not already present and keeps the node when all are duplicates", () => {
    const region: ConditionRow = {
      id: "region",
      source: "customer",
      field: "region",
      operator: "is",
      value: "emea",
    };
    const duplicate: ConditionRow = {
      id: "copy",
      source: "customer",
      field: "lifetime-value",
      operator: "is greater than",
      value: "5000",
    };
    const differentThreshold: ConditionRow = {
      id: "other-threshold",
      source: "customer",
      field: "lifetime-value",
      operator: "is greater than",
      value: "1000",
    };

    const state = fresh();
    const next = flowReducer(state, {
      type: "appendRows",
      nodeId: SEED_CONDITION.id,
      rows: [duplicate, region, differentThreshold],
    });
    assert.deepEqual(rowIds(next, SEED_CONDITION.id), [
      "seed-row-1",
      "seed-row-2",
      "region",
      "other-threshold",
    ]);
    assert.deepEqual(condition(next, SEED_CONDITION.id).rows[2], region);

    const again = flowReducer(next, {
      type: "appendRows",
      nodeId: SEED_CONDITION.id,
      rows: [duplicate, region],
    });
    assert.equal(
      again.flow.steps[0],
      next.flow.steps[0],
    );

    const empty = flowReducer(state, {
      type: "appendRows",
      nodeId: SEED_CONDITION.id,
      rows: [],
    });
    assert.equal(empty.flow.steps[0], state.flow.steps[0]);
  });

  test("resizeNode clamps and rounds, and returns the same state when the width does not change", () => {
    const state = fresh();
    assert.equal(
      flowReducer(state, { type: "resizeNode", id: "trigger", width: 440.4 }),
      state,
    );

    const trigger = flowReducer(state, {
      type: "resizeNode",
      id: "trigger",
      width: 10.2,
    });
    assert.equal(trigger.flow.trigger.width, NODE_MIN_WIDTH);
    assert.equal(trigger.flow.steps, state.flow.steps);

    const huge = flowReducer(trigger, {
      type: "resizeNode",
      id: "trigger",
      width: 5000.6,
    });
    assert.equal(huge.flow.trigger.width, NODE_MAX_WIDTH);

    const step = flowReducer(state, {
      type: "resizeNode",
      id: SEED_CONDITION.id,
      width: 300.6,
    });
    assert.equal(condition(step, SEED_CONDITION.id).width, 301);
    assert.equal(step.flow.trigger, state.flow.trigger);

    const sameStep = flowReducer(step, {
      type: "resizeNode",
      id: SEED_CONDITION.id,
      width: 300.6,
    });
    assert.equal(sameStep.flow.steps[0], step.flow.steps[0]);

    const missing = flowReducer(state, {
      type: "resizeNode",
      id: "missing",
      width: 500,
    });
    assert.equal(missing.flow.steps[0], state.flow.steps[0]);
    assert.equal(missing.flow.trigger, state.flow.trigger);
  });

  test("insertNode places an action step at a clamped index and selects it", () => {
    const definition = getNodeType("assign-to-queue");
    assert.ok(definition);
    const hinted = flowReducer(fresh(), { type: "showTriggerHint" });

    const front = flowReducer(hinted, {
      type: "insertNode",
      id: "assign",
      nodeTypeId: "assign-to-queue",
      index: -4,
    });
    assert.equal(front.triggerHintVisible, false);
    assert.equal(front.selectedId, "assign");
    assert.deepEqual(
      front.flow.steps.map((node) => node.id),
      ["assign", SEED_CONDITION.id],
    );
    assert.deepEqual(action(front, "assign"), {
      id: "assign",
      kind: "action",
      nodeTypeId: definition.id,
      title: definition.title,
      subtitle: definition.subtitle,
      width: CONDITION_DEFAULT_WIDTH,
    });

    const middle = flowReducer(front, {
      type: "insertNode",
      id: "wait",
      nodeTypeId: "wait",
      index: 1,
    });
    assert.deepEqual(
      middle.flow.steps.map((node) => node.id),
      ["assign", "wait", SEED_CONDITION.id],
    );

    const end = flowReducer(middle, {
      type: "insertNode",
      id: "email",
      nodeTypeId: "send-email",
      index: 99,
    });
    assert.deepEqual(
      end.flow.steps.map((node) => node.id),
      ["assign", "wait", SEED_CONDITION.id, "email"],
    );
  });

  test("insertNode of the palette condition type is still an action step, not a condition", () => {
    const next = flowReducer(fresh(), {
      type: "insertNode",
      id: "logic",
      nodeTypeId: "condition",
      index: 1,
    });
    const node = action(next, "logic");
    assert.equal(node.kind, "action");
    assert.equal(node.nodeTypeId, "condition");
    assert.equal(isConditionNode(node), false);
  });

  test("insertNode refuses a duplicate id, an unknown type, and a second trigger", () => {
    const state = fresh();
    assert.equal(
      flowReducer(state, {
        type: "insertNode",
        id: SEED_CONDITION.id,
        nodeTypeId: "assign-to-queue",
        index: 0,
      }),
      state,
    );
    assert.equal(
      flowReducer(state, {
        type: "insertNode",
        id: "new",
        nodeTypeId: "not-a-node",
        index: 0,
      }),
      state,
    );
    assert.equal(
      flowReducer(state, {
        type: "insertNode",
        id: "another-trigger",
        nodeTypeId: "on-a-schedule",
        index: 0,
      }),
      state,
    );
    assert.equal(
      flowReducer(state, {
        type: "insertNode",
        id: "webhook",
        nodeTypeId: "incoming-webhook",
        index: 1,
      }),
      state,
    );
  });

  test("showTriggerHint selects the trigger and clearTriggerHint leaves the selection", () => {
    const shown = flowReducer(fresh(), { type: "showTriggerHint" });
    assert.equal(shown.triggerHintVisible, true);
    assert.equal(shown.selectedId, "trigger");

    const cleared = flowReducer(shown, { type: "clearTriggerHint" });
    assert.equal(cleared.triggerHintVisible, false);
    assert.equal(cleared.selectedId, "trigger");
  });

  test("an unknown action returns the same state", () => {
    const state = fresh();
    const next = flowReducer(state, { type: "noop" } as unknown as FlowAction);
    assert.equal(next, state);
  });

  test("edits return a new state and do not mutate the previous one", () => {
    const state = fresh();
    const snapshot = structuredClone(state);
    const next = flowReducer(state, {
      type: "deleteRow",
      nodeId: SEED_CONDITION.id,
      rowId: "seed-row-2",
    });

    assert.deepEqual(state, snapshot);
    assert.notEqual(next, state);
    assert.equal(condition(state, SEED_CONDITION.id).rows.length, 2);
    assert.equal(condition(next, SEED_CONDITION.id).rows.length, 1);
  });
});
