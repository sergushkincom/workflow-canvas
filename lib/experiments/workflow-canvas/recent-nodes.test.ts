import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getNodeType } from "./node-types";
import {
  EMPTY_RECENT_SNAPSHOT,
  RECENT_NODE_LIMIT,
  RECENT_NODES_STORAGE_KEY,
  getServerRecentSnapshot,
  parseRecentNodeIds,
  readRecentNodeIds,
  readRecentNodesSnapshot,
  recordRecentNodeId,
  rememberRecentNodeId,
  resolveRecentNodeTypes,
  visibleRecentNodeTypes,
  type RecentNodeStorage,
} from "./recent-nodes";

function memoryStorage(initial: string | null = null): RecentNodeStorage & {
  raw: () => string | null;
} {
  let value = initial;
  return {
    getItem: (key) => {
      assert.equal(key, RECENT_NODES_STORAGE_KEY);
      return value;
    },
    setItem: (key, next) => {
      assert.equal(key, RECENT_NODES_STORAGE_KEY);
      value = next;
    },
    raw: () => value,
  };
}

describe("recent node types", () => {
  test("reads nothing when storage is unavailable", () => {
    assert.deepEqual(readRecentNodeIds(null), []);
    assert.deepEqual(readRecentNodeIds(), []);
    assert.equal(readRecentNodesSnapshot(), EMPTY_RECENT_SNAPSHOT);
    assert.equal(getServerRecentSnapshot(), EMPTY_RECENT_SNAPSHOT);
  });

  test("ignores malformed, unknown, and duplicate stored ids", () => {
    assert.deepEqual(parseRecentNodeIds(null), []);
    assert.deepEqual(parseRecentNodeIds("not-json"), []);
    assert.deepEqual(parseRecentNodeIds("{}"), []);
    assert.deepEqual(
      parseRecentNodeIds(
        JSON.stringify([
          1,
          "",
          "missing-node",
          "wait",
          "wait",
          null,
          "send-email",
        ]),
      ),
      ["wait", "send-email"],
    );
  });

  test("keeps the newest five and moves a repeat to the front", () => {
    const added = [
      "wait",
      "send-email",
      "condition",
      "draft-reply",
      "look-up-customer",
      "fetch-order-history",
    ];
    let ids: string[] = [];
    for (const id of added) {
      ids = rememberRecentNodeId(ids, id);
    }
    assert.equal(ids.length, RECENT_NODE_LIMIT);
    assert.deepEqual(ids, [
      "fetch-order-history",
      "look-up-customer",
      "draft-reply",
      "condition",
      "send-email",
    ]);
    assert.deepEqual(rememberRecentNodeId(ids, "condition"), [
      "condition",
      "fetch-order-history",
      "look-up-customer",
      "draft-reply",
      "send-email",
    ]);
    assert.deepEqual(rememberRecentNodeId(ids, "not-a-node"), ids);
  });

  test("persists through the storage passed in", () => {
    const storage = memoryStorage();
    assert.deepEqual(recordRecentNodeId("condition", storage), ["condition"]);
    assert.deepEqual(recordRecentNodeId("wait", storage), ["wait", "condition"]);
    assert.deepEqual(readRecentNodeIds(storage), ["wait", "condition"]);
    assert.deepEqual(recordRecentNodeId("not-a-node", storage), [
      "wait",
      "condition",
    ]);

    const failing: RecentNodeStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    assert.deepEqual(recordRecentNodeId("wait", failing), ["wait"]);
    assert.deepEqual(readRecentNodeIds(failing), []);
  });

  test("resolves ids in order and drops ones the catalog no longer has", () => {
    const resolved = resolveRecentNodeTypes([
      "missing",
      "send-email",
      "send-email",
      "condition",
    ]);
    assert.deepEqual(
      resolved.map((nodeType) => nodeType.id),
      ["send-email", "condition"],
    );
    assert.equal(resolved[0], getNodeType("send-email"));
  });

  test("the recent section is hidden when empty or while searching", () => {
    const recent = resolveRecentNodeTypes(["wait", "condition"]);
    assert.deepEqual(visibleRecentNodeTypes([], ""), []);
    assert.deepEqual(
      visibleRecentNodeTypes(recent, "   ").map((nodeType) => nodeType.id),
      ["wait", "condition"],
    );
    assert.deepEqual(visibleRecentNodeTypes(recent, "if"), []);
    assert.equal(
      visibleRecentNodeTypes(
        resolveRecentNodeTypes([
          "wait",
          "send-email",
          "condition",
          "draft-reply",
          "look-up-customer",
          "fetch-order-history",
        ]),
        "",
      ).length,
      RECENT_NODE_LIMIT,
    );
  });
});
