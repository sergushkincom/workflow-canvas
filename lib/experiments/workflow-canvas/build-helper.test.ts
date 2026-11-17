import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  BUILD_INTENTS,
  DEFAULT_APPLY_PERMISSION,
  IDLE_NUDGE_MS,
  applyProposal,
  appliedSummary,
  cloneFlow,
  dismissNudge,
  emptyHelperLog,
  initialNudgeState,
  isKeptSession,
  nudgeDue,
  parseNudgeDelay,
  permissionAfterChoice,
  proposalLines,
  proposeIntent,
  reduceHelperLog,
  shouldAskPermission,
  showNudge,
} from "./build-helper";
import { flowReducer, initialFlowState } from "./flow-reducer";
import { getTemplate, materializeTemplate } from "./templates";
import { blankFlow } from "./templates";
import { CONDITION_DEFAULT_WIDTH, isActionNode, isConditionNode } from "./types";

function ids() {
  let n = 0;
  return () => {
    n += 1;
    return `id-${n}`;
  };
}

describe("build helper", () => {
  test("form intent proposes a trigger, a condition, an email, and the connections", () => {
    const proposal = proposeIntent(blankFlow(), "form-submitted");
    assert.ok(proposal);
    assert.equal(proposal.intentLabel, "Notify me when a form is submitted");
    assert.equal(proposal.note, null);
    assert.deepEqual(proposalLines(proposal), [
      "Set trigger to Incoming webhook",
      "Add condition: Channel is API",
      "Add Send email",
      "Connect Incoming webhook → Condition → Send email",
    ]);
    assert.equal(appliedSummary(proposal), "Trigger set to Incoming webhook. Added 2 steps.");
  });

  test("daily summary and webhook intents name the nodes they would add", () => {
    const daily = proposeIntent(blankFlow(), "daily-summary");
    assert.ok(daily);
    assert.deepEqual(proposalLines(daily), [
      "Set trigger to On a schedule",
      "Add Fetch order history",
      "Add Summarise thread",
      "Connect On a schedule → Fetch order history → Summarise thread",
    ]);

    const webhook = proposeIntent(blankFlow(), "webhook-notify");
    assert.ok(webhook);
    assert.equal(webhook.intentLabel, "Webhook to Slack/Email");
    assert.deepEqual(proposalLines(webhook), [
      "Set trigger to Incoming webhook",
      "Add Update ticket field",
      "Add Send email",
      "Connect Incoming webhook → Update ticket field → Send email",
    ]);
  });

  test("a proposal skips steps the current workflow already has", () => {
    const schedule = getTemplate("schedule-summary");
    assert.ok(schedule);
    const existing = proposeIntent(
      materializeTemplate(schedule),
      "daily-summary",
    );
    assert.ok(existing);
    assert.deepEqual(existing.changes, []);
    assert.equal(existing.note, "This workflow already has those steps.");

    const flow = blankFlow();
    flow.steps = [
      {
        id: "email",
        kind: "action",
        nodeTypeId: "send-email",
        title: "Send email",
        subtitle: "Sends a message",
        width: CONDITION_DEFAULT_WIDTH,
      },
    ];
    const partial = proposeIntent(flow, "form-submitted");
    assert.ok(partial);
    assert.deepEqual(proposalLines(partial), [
      "Set trigger to Incoming webhook",
      "Add condition: Channel is API",
      "Connect Send email → Condition",
    ]);
  });

  test("apply adds the proposed nodes and leaves the previous flow untouched", () => {
    const flow = blankFlow();
    const snapshot = cloneFlow(flow);
    const proposal = proposeIntent(flow, "form-submitted");
    assert.ok(proposal);
    const applied = applyProposal(flow, proposal, ids());

    assert.deepEqual(flow, snapshot);
    assert.equal(applied.flow.trigger.title, "Incoming webhook");
    assert.equal(applied.flow.trigger.nodeTypeId, "incoming-webhook");
    assert.equal(applied.flow.steps.length, 2);
    assert.ok(isConditionNode(applied.flow.steps[0]!));
    assert.ok(isActionNode(applied.flow.steps[1]!));
    assert.equal(applied.flow.steps[1]?.title, "Send email");
    assert.deepEqual(applied.highlightedIds, ["trigger", "id-1", "id-3"]);

    const undone = flowReducer(
      { ...initialFlowState, flow: applied.flow },
      { type: "replaceFlow", flow: snapshot },
    );
    assert.deepEqual(undone.flow, snapshot);
    assert.equal(undone.flow.steps.length, 0);
  });

  test("the default permission is allow once", () => {
    assert.equal(DEFAULT_APPLY_PERMISSION, "once");
    assert.equal(shouldAskPermission(false), true);
    assert.deepEqual(permissionAfterChoice(false, "once"), {
      alwaysAllow: false,
      apply: true,
    });
    assert.deepEqual(permissionAfterChoice(false, "session"), {
      alwaysAllow: true,
      apply: true,
    });
    assert.deepEqual(permissionAfterChoice(true, "cancel"), {
      alwaysAllow: true,
      apply: false,
    });
    assert.equal(shouldAskPermission(true), false);
  });

  test("opening the helper does not keep an empty session", () => {
    let log = emptyHelperLog();
    log = reduceHelperLog(log, { type: "open" });
    log = reduceHelperLog(log, { type: "close" });
    log = reduceHelperLog(log, { type: "open" });
    log = reduceHelperLog(log, { type: "close" });
    assert.equal(log.kept, false);
    assert.deepEqual(log.events, []);
    assert.equal(isKeptSession(log), false);

    log = reduceHelperLog(log, {
      type: "propose",
      intentId: BUILD_INTENTS[0].id,
    });
    log = reduceHelperLog(log, { type: "cancel", intentId: BUILD_INTENTS[0].id });
    assert.equal(isKeptSession(log), true);
    assert.equal(log.events.length, 2);

    const applied = reduceHelperLog(emptyHelperLog(), {
      type: "apply",
      intentId: "daily-summary",
      permission: DEFAULT_APPLY_PERMISSION,
    });
    assert.equal(isKeptSession(applied), true);
    assert.equal(applied.events[0]?.type, "apply");
  });

  test("each nudge context is offered once, and the delay is configurable", () => {
    assert.equal(IDLE_NUDGE_MS, 8_000);
    assert.equal(nudgeDue(7_999), false);
    assert.equal(nudgeDue(8_000), true);
    assert.equal(nudgeDue(20, 50), false);
    assert.equal(nudgeDue(50, 50), true);
    assert.equal(parseNudgeDelay(null), IDLE_NUDGE_MS);
    assert.equal(parseNudgeDelay("200"), 200);
    assert.equal(parseNudgeDelay("nope"), IDLE_NUDGE_MS);

    let state = initialNudgeState();
    state = showNudge(state, "empty-canvas");
    assert.equal(state.visible, "empty-canvas");
    state = dismissNudge(state);
    assert.equal(state.visible, null);
    assert.equal(showNudge(state, "empty-canvas").visible, null);

    const picker = showNudge(state, "trigger-picker");
    assert.equal(picker.visible, "trigger-picker");
    assert.deepEqual(picker.used, ["empty-canvas", "trigger-picker"]);
  });

  test("setTrigger stores the chosen trigger without adding a step", () => {
    const next = flowReducer(initialFlowState, {
      type: "setTrigger",
      nodeTypeId: "on-a-schedule",
      title: "On a schedule",
      description: "Runs at a time you set",
    });
    assert.equal(next.flow.trigger.title, "On a schedule");
    assert.equal(next.flow.trigger.nodeTypeId, "on-a-schedule");
    assert.equal(next.flow.steps.length, initialFlowState.flow.steps.length);
    const same = flowReducer(next, {
      type: "setTrigger",
      nodeTypeId: "on-a-schedule",
      title: "On a schedule",
      description: "Runs at a time you set",
    });
    assert.equal(same, next);
  });
});
