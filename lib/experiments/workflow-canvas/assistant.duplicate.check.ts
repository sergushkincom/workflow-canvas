import assert from "node:assert/strict";
import test from "node:test";

import {
  ALREADY_CHECKS_MESSAGE,
  CONFIDENT_ONE_ROW,
  CONFIDENT_TWO_ROWS,
  suggestForCondition,
} from "./assistant";
import { SEED_CONDITION } from "./data";
import type { ConditionRow } from "./types";

const seed = SEED_CONDITION.rows;

const planRow: ConditionRow = {
  id: "plan",
  source: "customer",
  field: "plan",
  operator: "is",
  value: "enterprise",
};

test("VIP on the seed node refuses the lifetime-value duplicate and keeps Plan", () => {
  const suggestion = suggestForCondition("Only VIP customers", seed);
  assert.equal(suggestion.kind, "unsure");
  if (suggestion.kind !== "unsure") {
    return;
  }
  assert.equal(suggestion.alreadyMessage, ALREADY_CHECKS_MESSAGE);
  assert.deepEqual(
    suggestion.choices.map((choice) => choice.label),
    ["Plan is Enterprise"],
  );
  assert.equal(
    suggestion.choices.some((choice) =>
      choice.rows.some((row) => row.field === "lifetime-value"),
    ),
    false,
  );
});

test("VIP on an empty node still offers both interpretations", () => {
  const suggestion = suggestForCondition("Only VIP customers", []);
  assert.equal(suggestion.kind, "unsure");
  if (suggestion.kind !== "unsure") {
    return;
  }
  assert.equal(suggestion.alreadyMessage, null);
  assert.deepEqual(
    suggestion.choices.map((choice) => choice.label),
    ["Lifetime value is greater than 5,000", "Plan is Enterprise"],
  );
});

test("VIP refuses both interpretations when the node already has them", () => {
  const suggestion = suggestForCondition("Only VIP customers", [...seed, planRow]);
  assert.deepEqual(suggestion, {
    kind: "already",
    message: ALREADY_CHECKS_MESSAGE,
  });
});

test("a different lifetime-value threshold is not treated as the seed row", () => {
  const rows: ConditionRow[] = [
    {
      id: "other",
      source: "customer",
      field: "lifetime-value",
      operator: "is greater than",
      value: "1000",
    },
  ];
  const suggestion = suggestForCondition("Only VIP customers", rows);
  assert.equal(suggestion.kind, "unsure");
  if (suggestion.kind !== "unsure") {
    return;
  }
  assert.equal(suggestion.alreadyMessage, null);
  assert.equal(suggestion.choices.length, 2);
});

test("Email from EMEA keeps the region row when channel is already present", () => {
  const suggestion = suggestForCondition("Email tickets from EMEA", seed);
  assert.equal(suggestion.kind, "draft");
  if (suggestion.kind !== "draft") {
    return;
  }
  assert.equal(suggestion.alreadyMessage, ALREADY_CHECKS_MESSAGE);
  assert.equal(suggestion.message, CONFIDENT_ONE_ROW);
  assert.deepEqual(
    suggestion.rows.map((row) => row.field),
    ["region"],
  );
});

test("Email from EMEA is refused when both rows already exist", () => {
  const rows: ConditionRow[] = [
    ...seed,
    {
      id: "region",
      source: "customer",
      field: "region",
      operator: "is",
      value: "emea",
    },
  ];
  const suggestion = suggestForCondition("Email tickets from EMEA", rows);
  assert.deepEqual(suggestion, {
    kind: "already",
    message: ALREADY_CHECKS_MESSAGE,
  });
});

test("Urgent tickets in German stay a two-row suggestion on the seed node", () => {
  const suggestion = suggestForCondition("Urgent tickets in German", seed);
  assert.equal(suggestion.kind, "draft");
  if (suggestion.kind !== "draft") {
    return;
  }
  assert.equal(suggestion.alreadyMessage, null);
  assert.equal(suggestion.message, CONFIDENT_TWO_ROWS);
  assert.deepEqual(
    suggestion.rows.map((row) => `${row.field}:${row.value}`),
    ["priority:urgent", "language:german"],
  );
});

test("an unmapped prompt is unchanged", () => {
  const suggestion = suggestForCondition("refund the invoice", seed);
  assert.equal(suggestion.kind, "unknown");
});
