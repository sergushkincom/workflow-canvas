import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CLASSIFY_STEP_ID, SEED_CONDITION } from "./data";
import { edgeFlowForTarget, type EdgeFlow } from "./edge-flow";
import {
  CONDITION_MS,
  TRIGGER_MS,
  createRun,
  runReducer,
  triggerOutput,
  type Run,
} from "./run-machine";
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

function edge(run: Run, id: string): EdgeFlow {
  return edgeFlowForTarget(run.nodeStates[id]);
}

describe("edge flow", () => {
  test("an edge stays at rest until its step starts", () => {
    assert.equal(edgeFlowForTarget(undefined), "rest");
    assert.equal(edgeFlowForTarget("pending"), "rest");

    const run = createRun(demoFlow());
    assert.equal(edge(run, "trigger"), "rest");
    assert.equal(edge(run, SEED_CONDITION.id), "rest");
    assert.equal(edge(run, CLASSIFY_STEP_ID), "rest");
  });

  test("only the edge into the running step flows, then that edge becomes solid", () => {
    let run = createRun(demoFlow());

    run = runReducer(run, { type: "markRunning", id: "trigger" });
    assert.equal(edge(run, "trigger"), "flowing");
    assert.equal(edge(run, SEED_CONDITION.id), "rest");
    assert.equal(edge(run, CLASSIFY_STEP_ID), "rest");

    run = runReducer(run, {
      type: "finishNode",
      id: "trigger",
      state: "done",
      output: triggerOutput(),
      elapsedMs: TRIGGER_MS,
    });
    assert.equal(edge(run, "trigger"), "solid");
    assert.equal(edge(run, SEED_CONDITION.id), "rest");

    run = runReducer(run, { type: "markRunning", id: SEED_CONDITION.id });
    assert.equal(edge(run, "trigger"), "solid");
    assert.equal(edge(run, SEED_CONDITION.id), "flowing");
    assert.equal(edge(run, CLASSIFY_STEP_ID), "rest");

    run = runReducer(run, {
      type: "finishNode",
      id: SEED_CONDITION.id,
      state: "passed",
      output: "Condition met",
      elapsedMs: CONDITION_MS,
    });
    assert.equal(edge(run, SEED_CONDITION.id), "solid");
    assert.equal(edge(run, CLASSIFY_STEP_ID), "rest");

    run = runReducer(run, { type: "markRunning", id: CLASSIFY_STEP_ID });
    assert.equal(edge(run, CLASSIFY_STEP_ID), "flowing");
    assert.equal(edge(run, SEED_CONDITION.id), "solid");

    run = runReducer(run, { type: "enterAwaiting", id: CLASSIFY_STEP_ID });
    assert.equal(edge(run, CLASSIFY_STEP_ID), "solid");
    assert.equal(run.phase, "awaiting-decision");
  });

  test("a step that finishes without passing still settles its incoming edge", () => {
    let run = createRun(demoFlow());
    run = runReducer(run, { type: "markRunning", id: SEED_CONDITION.id });
    run = runReducer(run, {
      type: "finishNode",
      id: SEED_CONDITION.id,
      state: "skipped",
      output: "Condition not met",
      elapsedMs: CONDITION_MS,
      skipBelowIds: [CLASSIFY_STEP_ID],
    });

    assert.equal(edge(run, SEED_CONDITION.id), "solid");
    assert.equal(edge(run, CLASSIFY_STEP_ID), "solid");
    assert.equal(edgeFlowForTarget("done"), "solid");
  });
});
