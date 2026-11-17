import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { OPERATORS, getField } from "./data";
import { initialFlowState } from "./flow-reducer";
import { getNodeType } from "./node-types";
import {
  TEMPLATES,
  blankFlow,
  categoryCounts,
  filterTemplates,
  materializeTemplate,
  resolveDirectOpen,
  templateMeta,
  templateNodeIds,
  templatePreview,
  templateStepCount,
} from "./templates";
import {
  incompleteStepCount,
  isActionNode,
  isConditionNode,
  isNodeIncomplete,
} from "./types";

describe("workflow templates", () => {
  test("ships a local catalog the canvas can open", () => {
    assert.ok(TEMPLATES.length >= 8 && TEMPLATES.length <= 12);

    const ids = TEMPLATES.map((template) => template.id);
    assert.equal(new Set(ids).size, ids.length);

    for (const template of TEMPLATES) {
      assert.ok(getNodeType(template.triggerId), template.triggerId);
      for (const nodeTypeId of templateNodeIds(template)) {
        assert.ok(getNodeType(nodeTypeId), `${template.id} ${nodeTypeId}`);
      }
      for (const step of template.steps) {
        if (step.kind === "action") {
          continue;
        }
        for (const row of step.rows) {
          const field = getField(row.source, row.field);
          assert.ok(field, `${template.id} ${row.source}.${row.field}`);
          assert.ok(
            OPERATORS.some((operator) => operator.id === row.operator),
            row.operator,
          );
          if (field.valueKind === "select") {
            assert.ok(
              field.values?.some((value) => value.id === row.value),
              `${template.id} ${row.value}`,
            );
          }
        }
      }
    }
  });

  test("triage opens the seeded demo flow and can run", () => {
    const triage = TEMPLATES[0];
    assert.equal(triage?.id, "triage-support-tickets");
    assert.deepEqual(templatePreview(triage!), ["trigger", "ai", "condition"]);

    const flow = materializeTemplate(triage!);
    assert.deepEqual(flow, structuredClone(initialFlowState.flow));
    assert.equal(incompleteStepCount(flow), 0);
    assert.equal(templateStepCount(triage!), 2);
    assert.equal(templateMeta(triage!), "2 steps · 2 min setup");
  });

  test("other templates become editable steps, including action nodes", () => {
    const alert = TEMPLATES.find(
      (template) => template.id === "alert-on-failed-payments",
    );
    assert.ok(alert);
    const alertFlow = materializeTemplate(alert);
    assert.equal(alertFlow.steps.length, 2);
    assert.ok(alertFlow.steps.every(isConditionNode));
    assert.equal(incompleteStepCount(alertFlow), 0);
    assert.deepEqual(templatePreview(alert), [
      "trigger",
      "condition",
      "condition",
    ]);

    const draft = TEMPLATES.find(
      (template) => template.id === "draft-replies-for-review",
    );
    assert.ok(draft);
    const draftFlow = materializeTemplate(draft);
    assert.equal(draftFlow.steps.length, 2);
    assert.ok(draftFlow.steps.every(isActionNode));
    assert.equal(draftFlow.steps.filter(isNodeIncomplete).length, 2);
    assert.deepEqual(templatePreview(draft), ["trigger", "ai", "ai"]);

    const blank = blankFlow();
    assert.equal(blank.steps.length, 0);
    assert.equal(blank.trigger.title, initialFlowState.flow.trigger.title);
    assert.equal(incompleteStepCount(blank), 0);
  });

  test("search, category, app, and sort narrow the catalog", () => {
    assert.equal(filterTemplates(TEMPLATES).length, TEMPLATES.length);
    assert.equal(filterTemplates(TEMPLATES)[0]?.id, "triage-support-tickets");

    const digest = filterTemplates(TEMPLATES, { query: "DIGEST" });
    assert.deepEqual(
      digest.map((template) => template.id),
      ["daily-inbox-digest"],
    );

    const webhook = filterTemplates(TEMPLATES, { query: "webhook" });
    assert.ok(webhook.some((template) => template.id === "sync-form-replies"));

    const notifications = filterTemplates(TEMPLATES, {
      category: "Notifications",
    });
    assert.deepEqual(
      notifications.map((template) => template.id),
      ["daily-inbox-digest", "alert-on-failed-payments", "renewal-watch"],
    );

    const summarised = filterTemplates(TEMPLATES, {
      nodeTypeId: "summarise-thread",
    });
    assert.deepEqual(
      summarised.map((template) => template.id).sort(),
      ["daily-inbox-digest", "draft-replies-for-review"],
    );

    const handoff = filterTemplates(TEMPLATES, {
      query: "language",
      category: "Support",
    });
    assert.deepEqual(
      handoff.map((template) => template.id),
      ["language-handoff"],
    );

    assert.equal(
      filterTemplates(TEMPLATES, { query: "zzzz-no-match" }).length,
      0,
    );

    const byName = filterTemplates(TEMPLATES, { sort: "name" });
    assert.equal(byName[0]?.name, "Alert on failed payments");
    assert.equal(byName.at(-1)?.name, "Welcome new accounts");

    const byNewest = filterTemplates(TEMPLATES, { sort: "newest" });
    assert.equal(byNewest[0]?.id, "renewal-watch");
    assert.equal(byNewest.at(-1)?.id, "triage-support-tickets");
  });

  test("category counts follow the other filters", () => {
    const counts = categoryCounts(TEMPLATES);
    assert.equal(counts[0]?.count, TEMPLATES.length);
    assert.equal(
      counts.find((item) => item.id === "Notifications")?.count,
      3,
    );

    const searched = categoryCounts(TEMPLATES, { query: "email" });
    assert.ok((searched[0]?.count ?? 0) < TEMPLATES.length);
    assert.ok((searched[0]?.count ?? 0) > 0);
  });

  test("direct links open a named flow, unknown ids do not", () => {
    const seeded = resolveDirectOpen("support-triage");
    assert.equal(seeded?.name, "Support triage");
    assert.deepEqual(seeded?.flow, structuredClone(initialFlowState.flow));

    const named = resolveDirectOpen("daily-inbox-digest");
    assert.equal(named?.name, "Daily inbox digest");
    assert.equal(named?.flow.trigger.title, "On a schedule");

    assert.equal(resolveDirectOpen(null), null);
    assert.equal(resolveDirectOpen(""), null);
    assert.equal(resolveDirectOpen("missing"), null);
  });
});
