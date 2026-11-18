import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  NODE_TYPES,
  filterNodeTypes,
  getNodeType,
  nodeTypePaletteLabel,
} from "./node-types";

function idsFor(query: string): string[] {
  return filterNodeTypes(NODE_TYPES, query).map((nodeType) => nodeType.id);
}

describe("node type search", () => {
  test("every node type has searchable aliases", () => {
    for (const nodeType of NODE_TYPES) {
      assert.ok(nodeType.aliases.length > 0, nodeType.id);
      for (const alias of nodeType.aliases) {
        assert.equal(alias, alias.trim().toLowerCase(), `${nodeType.id} ${alias}`);
        assert.ok(alias.length > 1, `${nodeType.id} ${alias}`);
      }
      assert.equal(new Set(nodeType.aliases).size, nodeType.aliases.length);
    }
  });

  test("Condition is labeled as the If node in the palette", () => {
    const condition = getNodeType("condition");
    assert.ok(condition);
    assert.equal(condition.title, "Condition");
    assert.equal(nodeTypePaletteLabel(condition), "Condition (If)");
    for (const alias of ["if", "if/else", "if else", "else", "branch", "switch"]) {
      assert.ok(condition.aliases.includes(alias), alias);
    }
  });

  test("searching if finds Condition and skips unrelated words", () => {
    assert.deepEqual(idsFor("if"), ["condition"]);
    assert.deepEqual(idsFor("IF"), ["condition"]);
    assert.deepEqual(idsFor("  if  "), ["condition"]);
    assert.deepEqual(idsFor("if/else"), ["condition"]);
    assert.deepEqual(idsFor("if else"), ["condition"]);
    assert.deepEqual(idsFor("else"), ["condition"]);
    assert.ok(!idsFor("if").includes("classify-intent"));
    assert.ok(!idsFor("if").includes("send-email"));
  });

  test("branch and switch find the routing nodes", () => {
    assert.deepEqual(idsFor("branch"), ["condition", "split-by-field"]);
    assert.deepEqual(idsFor("switch"), ["condition", "split-by-field"]);
  });

  test("title, subtitle, and aliases all match", () => {
    assert.deepEqual(idsFor("wait"), ["wait"]);
    assert.deepEqual(idsFor("delay"), ["wait"]);
    assert.deepEqual(idsFor("pauses"), ["wait"]);
    assert.deepEqual(idsFor("webhook"), ["incoming-webhook"]);
    assert.deepEqual(idsFor("cron"), ["on-a-schedule"]);
    assert.deepEqual(idsFor("summarize"), ["summarise-thread"]);
    assert.deepEqual(idsFor("summarise"), ["summarise-thread"]);
    assert.deepEqual(idsFor("recap"), ["summarise-thread"]);
    assert.deepEqual(idsFor("email"), ["send-email"]);
    assert.deepEqual(idsFor("notify"), ["send-email"]);
    assert.deepEqual(idsFor("lookup"), ["look-up-customer"]);
  });

  test("an empty query returns every node type and a miss returns none", () => {
    assert.deepEqual(
      idsFor("   "),
      NODE_TYPES.map((nodeType) => nodeType.id),
    );
    assert.deepEqual(idsFor("zzzz-no-node"), []);
  });

  test("nodes without a palette label keep their title", () => {
    const wait = getNodeType("wait");
    assert.ok(wait);
    assert.equal(wait.paletteLabel, undefined);
    assert.equal(nodeTypePaletteLabel(wait), "Wait");
  });
});
