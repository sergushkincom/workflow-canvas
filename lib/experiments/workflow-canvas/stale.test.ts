import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CLASSIFY_STEP_ID, SEED_CONDITION } from "./data";
import { flowReducer, initialFlowState } from "./flow-reducer";
import {
  CONDITION_MS,
  TRIGGER_MS,
  createRun,
  idleRun,
  orderedRunIds,
  runReducer,
  triggerOutput,
  type Run,
} from "./run-machine";
import {
  COMPLETE_STEPS_TO_RUN,
  FINISH_STEP_THEN_RUN,
  STALE_HINT,
  STALE_UPSTREAM_HINT,
  applyConfigStale,
  changedConfigNodeId,
  configNodeId,
  hasStaleResults,
  humanizeIssue,
  isStructuralEdit,
  nodeConfigKey,
  staleHint,
} from "./stale";
import { CONDITION_DEFAULT_WIDTH, type Flow } from "./types";

function demoFlow(): Flow {
  return {
    trigger: {
      id: "trigger",
      title: "New ticket received",
      description: "Runs when a ticket arrives",
      width: 440,
    },
    steps: [
      {
        id: SEED_CONDITION.id,
        conjunction: SEED_CONDITION.conjunction,
        width: CONDITION_DEFAULT_WIDTH,
        rows: SEED_CONDITION.rows.map((row) => ({ ...row })),
      },
    ],
  };
}

function finishedRun(flow: Flow = demoFlow()): Run {
  let run = createRun(flow);
  run = runReducer(runReducer(run, { type: "markRunning", id: "trigger" }), {
    type: "finishNode",
    id: "trigger",
    state: "done",
    output: triggerOutput(),
    elapsedMs: TRIGGER_MS,
  });
  run = runReducer(
    runReducer(run, { type: "markRunning", id: SEED_CONDITION.id }),
    {
      type: "finishNode",
      id: SEED_CONDITION.id,
      state: "passed",
      output: "Condition met",
      elapsedMs: CONDITION_MS,
    },
  );
  return runReducer(run, {
    type: "confirm",
    label: "Billing dispute",
    elapsedMs: 10,
  });
}

describe("stale run results", () => {
  test("editing a node that produced output marks that result and later ones", () => {
    const flow = demoFlow();
    const done = finishedRun(flow);
    const ordered = orderedRunIds(flow);
    const stale = runReducer(done, {
      type: "markConfigStale",
      id: SEED_CONDITION.id,
      orderedIds: ordered,
    });

    assert.equal(stale.stale[SEED_CONDITION.id], "edited");
    assert.equal(stale.stale[CLASSIFY_STEP_ID], "upstream");
    assert.equal(stale.stale.trigger, undefined);
    assert.equal(stale.outputs[SEED_CONDITION.id], "Condition met");
    assert.equal(stale.phase, "done");
    assert.equal(staleHint("edited"), STALE_HINT);
    assert.equal(staleHint("upstream"), STALE_UPSTREAM_HINT);
    assert.equal(hasStaleResults(stale.stale), true);
  });

  test("a node with no output is not marked, including nodes below it", () => {
    const flow = demoFlow();
    let run = createRun(flow);
    run = runReducer(runReducer(run, { type: "markRunning", id: "trigger" }), {
      type: "finishNode",
      id: "trigger",
      state: "done",
      output: triggerOutput(),
      elapsedMs: TRIGGER_MS,
    });
    run = runReducer(
      runReducer(run, { type: "markRunning", id: SEED_CONDITION.id }),
      {
        type: "finishNode",
        id: SEED_CONDITION.id,
        state: "skipped",
        output: "Condition not met",
        elapsedMs: CONDITION_MS,
        skipBelowIds: [CLASSIFY_STEP_ID],
      },
    );

    const marked = runReducer(run, {
      type: "markConfigStale",
      id: CLASSIFY_STEP_ID,
      orderedIds: orderedRunIds(flow),
    });
    assert.equal(marked, run);
    assert.deepEqual(marked.stale, {});

    const condition = runReducer(run, {
      type: "markConfigStale",
      id: SEED_CONDITION.id,
      orderedIds: orderedRunIds(flow),
    });
    assert.deepEqual(condition.stale, { [SEED_CONDITION.id]: "edited" });
  });

  test("later edits do not downgrade a step that was itself edited", () => {
    const flow = demoFlow();
    const ordered = orderedRunIds(flow);
    const conditionStale = runReducer(finishedRun(flow), {
      type: "markConfigStale",
      id: SEED_CONDITION.id,
      orderedIds: ordered,
    });
    const alsoTrigger = runReducer(conditionStale, {
      type: "markConfigStale",
      id: "trigger",
      orderedIds: ordered,
    });

    assert.equal(alsoTrigger.stale.trigger, "edited");
    assert.equal(alsoTrigger.stale[SEED_CONDITION.id], "edited");
    assert.equal(alsoTrigger.stale[CLASSIFY_STEP_ID], "upstream");
  });

  test("marking the same step again keeps the same run object", () => {
    const flow = demoFlow();
    const action = {
      type: "markConfigStale" as const,
      id: "trigger",
      orderedIds: orderedRunIds(flow),
    };
    const once = runReducer(finishedRun(flow), action);
    assert.equal(runReducer(once, action), once);
    assert.equal(
      runReducer(once, { ...action, id: "missing-node" }),
      once,
    );
  });

  test("starting or stopping a run clears stale results", () => {
    const flow = demoFlow();
    const stale = runReducer(finishedRun(flow), {
      type: "markConfigStale",
      id: SEED_CONDITION.id,
      orderedIds: orderedRunIds(flow),
    });
    assert.equal(hasStaleResults(stale.stale), true);

    const restarted = runReducer(stale, { type: "start", flow });
    assert.equal(restarted.phase, "running");
    assert.deepEqual(restarted.stale, {});
    assert.deepEqual(restarted.outputs, {});

    assert.equal(runReducer(stale, { type: "stop" }), idleRun);
  });

  test("applyConfigStale ignores an id that is not in the ordered run", () => {
    const stale = { trigger: "edited" as const };
    assert.equal(
      applyConfigStale(stale, { trigger: "Ticket received" }, ["trigger"], "other"),
      stale,
    );
  });

  test("configuration edits resolve to the node that changed", () => {
    const state = {
      ...initialFlowState,
      flow: demoFlow(),
    };
    const valueEdit = {
      type: "updateRow" as const,
      nodeId: SEED_CONDITION.id,
      rowId: SEED_CONDITION.rows[1].id,
      patch: { value: "9000" },
    };
    assert.equal(changedConfigNodeId(state, valueEdit), SEED_CONDITION.id);

    const sameValue = {
      ...valueEdit,
      patch: { value: SEED_CONDITION.rows[1].value },
    };
    assert.equal(changedConfigNodeId(state, sameValue), null);

    const resize = {
      type: "resizeNode" as const,
      id: SEED_CONDITION.id,
      width: 520,
    };
    assert.equal(configNodeId(resize), null);
    assert.equal(changedConfigNodeId(state, resize), null);
    assert.equal(
      nodeConfigKey(state.flow, SEED_CONDITION.id),
      nodeConfigKey(flowReducer(state, resize).flow, SEED_CONDITION.id),
    );

    const trigger = {
      type: "setTrigger" as const,
      nodeTypeId: "webhook",
      title: "Webhook",
      description: "Runs when a request arrives",
    };
    assert.equal(changedConfigNodeId(state, trigger), "trigger");
    const chosen = flowReducer(state, trigger);
    assert.equal(changedConfigNodeId(chosen, trigger), null);

    const rename = {
      type: "renameNode" as const,
      id: SEED_CONDITION.id,
      name: "Billing rules",
    };
    assert.equal(configNodeId(rename), null);
    assert.equal(changedConfigNodeId(state, rename), null);
    assert.equal(
      nodeConfigKey(state.flow, SEED_CONDITION.id),
      nodeConfigKey(flowReducer(state, rename).flow, SEED_CONDITION.id),
    );

    const withEmail = flowReducer(state, {
      type: "insertNode",
      id: "email",
      nodeTypeId: "send-email",
      index: 1,
    });
    const account = {
      type: "setNodeCredential" as const,
      id: "email",
      credentialId: "gmail-work",
    };
    assert.equal(changedConfigNodeId(withEmail, account), "email");
    const connected = flowReducer(withEmail, account);
    assert.equal(changedConfigNodeId(connected, account), null);
    const relabel = {
      type: "renameNode" as const,
      id: "email",
      name: "Ping customer",
    };
    assert.equal(changedConfigNodeId(connected, relabel), null);
    assert.equal(
      nodeConfigKey(connected.flow, "email"),
      nodeConfigKey(flowReducer(connected, relabel).flow, "email"),
    );
  });

  test("row order is configuration, and adding or removing a step is structural", () => {
    const state = {
      ...initialFlowState,
      flow: demoFlow(),
    };
    const reorder = {
      type: "reorderRows" as const,
      nodeId: SEED_CONDITION.id,
      activeId: SEED_CONDITION.rows[0].id,
      overId: SEED_CONDITION.rows[1].id,
    };
    assert.equal(changedConfigNodeId(state, reorder), SEED_CONDITION.id);
    assert.equal(isStructuralEdit(reorder), false);
    assert.equal(
      isStructuralEdit({
        type: "insertNode",
        id: "new",
        nodeTypeId: "action",
        index: 1,
      }),
      true,
    );
    assert.equal(isStructuralEdit({ type: "select", id: null }), false);
  });

  test("messages say what to do and never show an internal parameter path", () => {
    const shown = [
      STALE_HINT,
      STALE_UPSTREAM_HINT,
      COMPLETE_STEPS_TO_RUN,
      humanizeIssue(STALE_HINT),
      humanizeIssue(COMPLETE_STEPS_TO_RUN),
      humanizeIssue("conditions.conditions.0.rightValue"),
      humanizeIssue("parameters.rules[0].value is required"),
      humanizeIssue("  "),
    ];
    for (const message of shown) {
      assert.doesNotMatch(message, /rightValue|conditions\.conditions|parameters\.rules/);
      assert.match(message, /[A-Za-z]/);
    }
    assert.equal(
      humanizeIssue("conditions.conditions.0.rightValue"),
      FINISH_STEP_THEN_RUN,
    );
    assert.equal(humanizeIssue("parameters.rules[0].value"), FINISH_STEP_THEN_RUN);
    assert.equal(humanizeIssue(""), FINISH_STEP_THEN_RUN);
    assert.equal(humanizeIssue(COMPLETE_STEPS_TO_RUN), COMPLETE_STEPS_TO_RUN);
    assert.match(STALE_HINT, /Run again/);
  });
});
