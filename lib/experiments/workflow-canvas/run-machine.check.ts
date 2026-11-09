import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AI_THINK_DELAY_MS,
  STREAM_CHAR_MS,
} from "@/lib/experiments/workflow-canvas/run-timings";
import {
  CLASSIFY_REASONING,
  CLASSIFY_STEP_ID,
  SAMPLE_TICKET,
  SEED_CONDITION,
} from "./data";
import {
  CLASSIFY_STEP_ID as EXPORTED_CLASSIFY_STEP_ID,
  CONDITION_MS,
  TRIGGER_MS,
  classifyStreamDurationMs,
  createRun,
  evaluateConditionNode,
  evaluateRow,
  formatClockTime,
  formatElapsed,
  idleRun,
  idsBelow,
  nextPendingId,
  orderedRunIds,
  runningId,
  runReducer,
  triggerOutput,
  type Run,
  type RunAction,
} from "./run-machine";
import {
  CONDITION_DEFAULT_WIDTH,
  isConditionNode,
  type ConditionNode,
  type ConditionRow,
  type Flow,
} from "./types";

function demoFlow(): Flow {
  const seed: ConditionNode = {
    id: SEED_CONDITION.id,
    conjunction: SEED_CONDITION.conjunction,
    width: CONDITION_DEFAULT_WIDTH,
    rows: SEED_CONDITION.rows.map((row) => ({ ...row })),
  };
  return {
    trigger: {
      id: "trigger",
      title: "New ticket received",
      description: "Runs when a ticket arrives",
      width: 440,
    },
    steps: [seed],
  };
}

function finish(
  run: Run,
  id: string,
  state: "done" | "passed" | "skipped",
  output: string,
  elapsedMs: number,
  skipBelowIds?: string[],
): Run {
  return runReducer(runReducer(run, { type: "markRunning", id }), {
    type: "finishNode",
    id,
    state,
    output,
    elapsedMs,
    skipBelowIds,
  });
}

/** Drive the seeded flow to the AI step's human pause. */
function reachPause(flow: Flow = demoFlow()): Run {
  let run = createRun(flow);
  run = finish(run, "trigger", "done", triggerOutput(), TRIGGER_MS);
  run = finish(
    run,
    SEED_CONDITION.id,
    "passed",
    "Condition met",
    CONDITION_MS,
  );
  run = runReducer(run, { type: "markRunning", id: CLASSIFY_STEP_ID });
  return runReducer(run, { type: "enterAwaiting", id: CLASSIFY_STEP_ID });
}

describe("run machine", () => {
  test("idle run is empty and ordered ids are trigger, steps, then the classify step", () => {
    assert.deepEqual(idleRun, {
      phase: "idle",
      nodeStates: {},
      outputs: {},
      elapsed: {},
      streamedText: "",
    });

    const flow = demoFlow();
    assert.equal(EXPORTED_CLASSIFY_STEP_ID, CLASSIFY_STEP_ID);
    assert.deepEqual(orderedRunIds(flow), [
      "trigger",
      SEED_CONDITION.id,
      CLASSIFY_STEP_ID,
    ]);
    assert.deepEqual(orderedRunIds({ ...flow, steps: [] }), [
      "trigger",
      CLASSIFY_STEP_ID,
    ]);
  });

  test("start creates a running pass with every node pending and nothing carried over", () => {
    const finished = runReducer(reachPause(), {
      type: "confirm",
      label: "Billing dispute",
      elapsedMs: 10,
    });
    const flow = demoFlow();
    const started = runReducer(finished, { type: "start", flow });
    const created = createRun(flow);

    assert.equal(started.phase, "running");
    assert.deepEqual(started, created);
    assert.equal(started.decision, undefined);
    assert.equal(started.resultText, undefined);
    assert.equal(started.streamedText, "");
    for (const id of orderedRunIds(flow)) {
      assert.equal(started.nodeStates[id], "pending");
    }
    assert.deepEqual(started.outputs, {});
    assert.deepEqual(started.elapsed, {});
  });

  test("stop from a paused or finished run returns the idle run", () => {
    assert.equal(runReducer(reachPause(), { type: "stop" }), idleRun);
    const done = runReducer(reachPause(), {
      type: "escalate",
      elapsedMs: 10,
    });
    assert.equal(runReducer(done, { type: "stop" }), idleRun);
    assert.equal(runReducer(idleRun, { type: "stop" }), idleRun);
  });

  test("markRunning sets the node to running and clears streamed text only for classify", () => {
    const flow = demoFlow();
    let run = createRun(flow);
    run = runReducer(run, {
      type: "appendStream",
      fullText: CLASSIFY_REASONING,
    });
    assert.equal(run.streamedText, CLASSIFY_REASONING.slice(0, 1));

    const trigger = runReducer(run, { type: "markRunning", id: "trigger" });
    assert.equal(trigger.phase, "running");
    assert.equal(trigger.nodeStates.trigger, "running");
    assert.equal(trigger.streamedText, CLASSIFY_REASONING.slice(0, 1));

    const classify = runReducer(trigger, {
      type: "markRunning",
      id: CLASSIFY_STEP_ID,
    });
    assert.equal(classify.nodeStates[CLASSIFY_STEP_ID], "running");
    assert.equal(classify.streamedText, "");
    assert.equal(classify.nodeStates.trigger, "running");
  });

  test("finishNode records output and elapsed, and stays running while a node is pending", () => {
    const flow = demoFlow();
    const run = finish(
      createRun(flow),
      "trigger",
      "done",
      triggerOutput(),
      TRIGGER_MS,
    );

    assert.equal(run.phase, "running");
    assert.equal(run.nodeStates.trigger, "done");
    assert.equal(run.outputs.trigger, "Ticket #4821 received");
    assert.equal(run.outputs.trigger, triggerOutput());
    assert.equal(triggerOutput(), `Ticket #${SAMPLE_TICKET.id} received`);
    assert.equal(run.elapsed.trigger, TRIGGER_MS);
    assert.equal(run.totalMs, TRIGGER_MS);
    assert.equal(run.nodeStates[SEED_CONDITION.id], "pending");
    assert.equal(run.nodeStates[CLASSIFY_STEP_ID], "pending");
    assert.equal(nextPendingId(run, orderedRunIds(flow)), SEED_CONDITION.id);
    assert.equal(runningId(run), null);
  });

  test("a failed condition skips the nodes below it and ends the run without a decision", () => {
    const blocked: ConditionNode = {
      id: "only-enterprise",
      conjunction: "and",
      width: CONDITION_DEFAULT_WIDTH,
      rows: [
        {
          id: "plan",
          source: "customer",
          field: "plan",
          operator: "is",
          value: "enterprise",
        },
      ],
    };
    assert.equal(evaluateConditionNode(blocked), false);
    const flow: Flow = { ...demoFlow(), steps: [blocked] };
    const ordered = orderedRunIds(flow);
    let run = finish(createRun(flow), "trigger", "done", triggerOutput(), TRIGGER_MS);
    assert.equal(run.phase, "running");

    run = finish(
      run,
      blocked.id,
      "skipped",
      "Condition not met",
      CONDITION_MS,
      idsBelow(ordered, blocked.id),
    );

    assert.deepEqual(idsBelow(ordered, blocked.id), [CLASSIFY_STEP_ID]);
    assert.equal(run.phase, "done");
    assert.equal(run.nodeStates[blocked.id], "skipped");
    assert.equal(run.nodeStates[CLASSIFY_STEP_ID], "skipped");
    assert.equal(run.outputs[blocked.id], "Condition not met");
    assert.equal(run.elapsed[CLASSIFY_STEP_ID], undefined);
    assert.equal(run.totalMs, TRIGGER_MS + CONDITION_MS);
    assert.equal(run.decision, undefined);
    assert.equal(run.resultText, undefined);
    assert.equal(nextPendingId(run, ordered), null);
  });

  test("appendStream reveals one character at a time and does not pass the end", () => {
    let run = runReducer(createRun(demoFlow()), {
      type: "markRunning",
      id: CLASSIFY_STEP_ID,
    });
    assert.equal(run.streamedText, "");

    for (let index = 0; index < CLASSIFY_REASONING.length; index += 1) {
      run = runReducer(run, {
        type: "appendStream",
        fullText: CLASSIFY_REASONING,
      });
      assert.equal(run.streamedText, CLASSIFY_REASONING.slice(0, index + 1));
    }

    const capped = runReducer(run, {
      type: "appendStream",
      fullText: CLASSIFY_REASONING,
    });
    assert.equal(capped.streamedText, CLASSIFY_REASONING);
    assert.equal(capped.phase, "running");

    const empty = runReducer(capped, { type: "appendStream", fullText: "" });
    assert.equal(empty.streamedText, "");
  });

  test("the classify step pauses for a person even when nothing is left pending", () => {
    const flow = demoFlow();
    let run = finish(createRun(flow), "trigger", "done", triggerOutput(), TRIGGER_MS);
    run = finish(run, SEED_CONDITION.id, "passed", "Condition met", CONDITION_MS);
    run = runReducer(run, { type: "markRunning", id: CLASSIFY_STEP_ID });
    run = runReducer(run, {
      type: "appendStream",
      fullText: CLASSIFY_REASONING,
    });
    assert.equal(run.phase, "running");
    assert.equal(
      Object.values(run.nodeStates).includes("pending"),
      false,
    );

    const paused = runReducer(run, {
      type: "enterAwaiting",
      id: CLASSIFY_STEP_ID,
    });
    assert.equal(paused.phase, "awaiting-decision");
    assert.equal(paused.nodeStates[CLASSIFY_STEP_ID], "awaiting");
    assert.equal(paused.streamedText, CLASSIFY_REASONING);
    assert.equal(paused.decision, undefined);
    assert.equal(paused.resultText, undefined);
    assert.equal(paused.nodeStates.trigger, "done");
    assert.equal(paused.nodeStates[SEED_CONDITION.id], "passed");
    assert.equal(runningId(paused), null);
  });

  test("enterAwaiting replaces a partial stream with the full reasoning", () => {
    let run = runReducer(createRun(demoFlow()), {
      type: "markRunning",
      id: CLASSIFY_STEP_ID,
    });
    run = runReducer(run, { type: "appendStream", fullText: CLASSIFY_REASONING });
    run = runReducer(run, { type: "appendStream", fullText: CLASSIFY_REASONING });
    assert.equal(run.streamedText.length, 2);

    const paused = runReducer(run, {
      type: "enterAwaiting",
      id: CLASSIFY_STEP_ID,
    });
    assert.equal(paused.streamedText, CLASSIFY_REASONING);
    assert.equal(paused.phase, "awaiting-decision");
  });

  test("while paused, streaming and unknown actions do not take the decision", () => {
    const paused = reachPause();
    const streamed = runReducer(paused, {
      type: "appendStream",
      fullText: CLASSIFY_REASONING,
    });
    assert.equal(streamed.phase, "awaiting-decision");
    assert.equal(streamed.streamedText, CLASSIFY_REASONING);
    assert.equal(streamed.decision, undefined);

    const ignored = runReducer(paused, { type: "noop" } as unknown as RunAction);
    assert.equal(ignored, paused);
  });

  test("markRunning during the pause is accepted and sets the phase back to running", () => {
    const paused = reachPause();
    const next = runReducer(paused, { type: "markRunning", id: "trigger" });
    assert.equal(next.phase, "running");
    assert.equal(next.nodeStates.trigger, "running");
    assert.equal(next.nodeStates[CLASSIFY_STEP_ID], "awaiting");
    assert.equal(next.decision, undefined);
  });

  test("confirm records the chosen label as the person's decision and ends the run", () => {
    const paused = reachPause();
    const elapsedMs = classifyStreamDurationMs();

    for (const label of ["Billing dispute", "Integration issue"] as const) {
      const done = runReducer(paused, { type: "confirm", label, elapsedMs });
      assert.equal(done.phase, "done");
      assert.equal(done.decision, "confirmed");
      assert.equal(done.classifyLabel, label);
      assert.equal(done.nodeStates[CLASSIFY_STEP_ID], "done");
      assert.equal(
        done.outputs[CLASSIFY_STEP_ID],
        `Classified as ${label} · confirmed by you`,
      );
      assert.equal(
        done.resultText,
        "Routed to Billing · assigned to the on-call agent",
      );
      assert.equal(done.elapsed[CLASSIFY_STEP_ID], elapsedMs);
      assert.equal(done.totalMs, TRIGGER_MS + CONDITION_MS + elapsedMs);
      assert.equal(done.streamedText, CLASSIFY_REASONING);
      assert.equal(done.nodeStates.trigger, "done");
      assert.equal(done.nodeStates[SEED_CONDITION.id], "passed");
    }
  });

  test("escalate ends the run without a classification and sends it to triage", () => {
    const paused = reachPause();
    const done = runReducer(paused, { type: "escalate", elapsedMs: 1800 });

    assert.equal(done.phase, "done");
    assert.equal(done.decision, "escalated");
    assert.equal(done.classifyLabel, undefined);
    assert.equal(done.nodeStates[CLASSIFY_STEP_ID], "done");
    assert.equal(
      done.outputs[CLASSIFY_STEP_ID],
      "Escalated without classification",
    );
    assert.equal(
      done.resultText,
      "Sent to triage queue · no automatic routing applied",
    );
    assert.equal(done.elapsed[CLASSIFY_STEP_ID], 1800);
    assert.equal(done.totalMs, TRIGGER_MS + CONDITION_MS + 1800);
    assert.equal(done.streamedText, CLASSIFY_REASONING);
  });

  test("start from the pause replaces it with a new run instead of resuming", () => {
    const flow = demoFlow();
    const restarted = runReducer(reachPause(), { type: "start", flow });
    assert.equal(restarted.phase, "running");
    assert.equal(restarted.streamedText, "");
    assert.equal(restarted.decision, undefined);
    assert.equal(restarted.nodeStates[CLASSIFY_STEP_ID], "pending");
  });

  test("finishNode of the last pending step during the pause ends as done without a decision", () => {
    let run = runReducer(createRun(demoFlow()), {
      type: "enterAwaiting",
      id: CLASSIFY_STEP_ID,
    });
    assert.equal(run.phase, "awaiting-decision");
    assert.equal(run.nodeStates.trigger, "pending");

    run = runReducer(run, {
      type: "finishNode",
      id: "trigger",
      state: "done",
      output: triggerOutput(),
      elapsedMs: TRIGGER_MS,
    });
    assert.equal(run.phase, "awaiting-decision");
    assert.equal(run.nodeStates[SEED_CONDITION.id], "pending");

    run = runReducer(run, {
      type: "finishNode",
      id: SEED_CONDITION.id,
      state: "passed",
      output: "Condition met",
      elapsedMs: CONDITION_MS,
    });
    assert.equal(run.phase, "done");
    assert.equal(run.nodeStates[CLASSIFY_STEP_ID], "awaiting");
    assert.equal(run.decision, undefined);
    assert.equal(run.resultText, undefined);
    assert.equal(run.totalMs, TRIGGER_MS + CONDITION_MS);
  });

  test("the seeded condition passes the sample ticket, and and/or follow the rows", () => {
    const flow = demoFlow();
    const seed = flow.steps[0];
    if (!seed || !isConditionNode(seed)) {
      assert.fail("demo flow should start with the seeded condition");
    }
    assert.equal(evaluateConditionNode(seed), true);

    const failingPlan: ConditionRow = {
      id: "plan",
      source: "customer",
      field: "plan",
      operator: "is",
      value: "enterprise",
    };
    const passingChannel: ConditionRow = {
      id: "channel",
      source: "ticket",
      field: "channel",
      operator: "is",
      value: "email",
    };
    const mixed: ConditionNode = {
      id: "mixed",
      conjunction: "or",
      width: CONDITION_DEFAULT_WIDTH,
      rows: [failingPlan, passingChannel],
    };
    assert.equal(evaluateConditionNode(mixed), true);
    assert.equal(
      evaluateConditionNode({ ...mixed, conjunction: "and" }),
      false,
    );
    assert.equal(evaluateConditionNode({ ...mixed, rows: [] }), false);
  });

  test("evaluateRow compares the sample ticket and refuses incomplete rows", () => {
    assert.equal(evaluateRow({ id: "bare" }), false);
    assert.equal(
      evaluateRow({ id: "half", source: "ticket", field: "channel" }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "channel",
        source: "ticket",
        field: "channel",
        operator: "is",
        value: "EMAIL",
      }),
      true,
    );
    assert.equal(
      evaluateRow({
        id: "channel",
        source: "ticket",
        field: "channel",
        operator: "is not",
        value: "email",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "channel",
        source: "ticket",
        field: "channel",
        operator: "is not",
        value: "chat",
      }),
      true,
    );
    assert.equal(
      evaluateRow({
        id: "subject",
        source: "ticket",
        field: "subject",
        operator: "contains",
        value: "INVOICE",
      }),
      true,
    );
    assert.equal(
      evaluateRow({
        id: "subject",
        source: "ticket",
        field: "subject",
        operator: "contains",
        value: "refund",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "value",
        source: "customer",
        field: "lifetime-value",
        operator: "is greater than",
        value: "5000",
      }),
      true,
    );
    assert.equal(
      evaluateRow({
        id: "value",
        source: "customer",
        field: "lifetime-value",
        operator: "is greater than",
        value: "18400",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "health",
        source: "account",
        field: "health-score",
        operator: "is less than",
        value: "80",
      }),
      true,
    );
    assert.equal(
      evaluateRow({
        id: "health",
        source: "account",
        field: "health-score",
        operator: "is less than",
        value: "72",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "date",
        source: "customer",
        field: "signup-date",
        operator: "is greater than",
        value: "2020-01-01",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "subject",
        source: "ticket",
        field: "subject",
        operator: "is empty",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "missing",
        source: "ticket",
        field: "not-a-field",
        operator: "is empty",
      }),
      true,
    );
    assert.equal(
      evaluateRow({
        id: "missing",
        source: "ticket",
        field: "not-a-field",
        operator: "is",
        value: "email",
      }),
      false,
    );
    assert.equal(
      evaluateRow({
        id: "channel",
        source: "ticket",
        field: "channel",
        operator: "matches",
        value: "email",
      }),
      false,
    );
  });

  test("formatElapsed and formatClockTime render the run clock", () => {
    assert.equal(formatElapsed(0), "0.0s");
    assert.equal(formatElapsed(TRIGGER_MS), "0.6s");
    assert.equal(formatElapsed(1600), "1.6s");
    assert.equal(formatElapsed(59_999), "60.0s");
    assert.equal(formatElapsed(60_000), "1m 0s");
    assert.equal(formatElapsed(61_000), "1m 1s");
    assert.equal(formatElapsed(125_000), "2m 5s");

    assert.equal(formatClockTime(new Date(2026, 10, 9, 0, 0).getTime()), "00:00");
    assert.equal(formatClockTime(new Date(2026, 10, 9, 7, 5).getTime()), "07:05");
    assert.equal(formatClockTime(new Date(2026, 10, 9, 14, 2).getTime()), "14:02");
  });

  test("idsBelow, nextPendingId, and runningId follow the ordered nodes", () => {
    const ids = ["trigger", "a", "b", CLASSIFY_STEP_ID];
    assert.deepEqual(idsBelow(ids, "a"), ["b", CLASSIFY_STEP_ID]);
    assert.deepEqual(idsBelow(ids, CLASSIFY_STEP_ID), []);
    assert.deepEqual(idsBelow(ids, "missing"), []);

    const flow = demoFlow();
    const ordered = orderedRunIds(flow);
    const fresh = createRun(flow);
    assert.equal(nextPendingId(fresh, ordered), "trigger");
    assert.equal(runningId(fresh), null);

    const running = runReducer(fresh, { type: "markRunning", id: "trigger" });
    assert.equal(runningId(running), "trigger");
    assert.equal(nextPendingId(running, ordered), SEED_CONDITION.id);

    const done = finish(
      finish(fresh, "trigger", "done", triggerOutput(), TRIGGER_MS),
      SEED_CONDITION.id,
      "passed",
      "Condition met",
      CONDITION_MS,
    );
    const classifyDone = runReducer(done, {
      type: "finishNode",
      id: CLASSIFY_STEP_ID,
      state: "done",
      output: "done",
      elapsedMs: 1,
    });
    assert.equal(nextPendingId(classifyDone, ordered), null);
    assert.equal(runningId(classifyDone), null);
  });

  test("classify stream duration is the think delay plus one tick per character", () => {
    assert.equal(AI_THINK_DELAY_MS, 350);
    assert.equal(STREAM_CHAR_MS, 14);
    assert.equal(
      classifyStreamDurationMs(),
      AI_THINK_DELAY_MS + CLASSIFY_REASONING.length * STREAM_CHAR_MS,
    );
  });
});
