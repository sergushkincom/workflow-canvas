import assert from "node:assert/strict";
import { describe, test } from "node:test";

import lzString from "lz-string";

const lz = lzString as unknown as {
  compressToEncodedURIComponent(input: string): string;
  decompressFromEncodedURIComponent(input: string): string | null;
};

import {
  MAX_SHARE_URL_LENGTH,
  decodeCanvasHash,
  flowFromSnapshot,
  shareLinkFor,
  snapshotFromFlow,
} from "./canvas-link";
import { flowReducer, initialFlowState } from "./flow-reducer";
import { TEMPLATES, materializeTemplate } from "./templates";
import type { Flow } from "./types";

const PAGE = "https://example.com/experiments/workflow-canvas?flow=support-triage";

function roundTrip(name: string, flow: Flow, x = 0, y = 0) {
  const snapshot = snapshotFromFlow(name, flow, { x, y });
  assert.ok(snapshot, name);
  const link = shareLinkFor(PAGE, snapshot);
  assert.equal(link.ok, true, name);
  if (!link.ok) {
    return snapshot;
  }
  assert.ok(link.url.length <= MAX_SHARE_URL_LENGTH);
  assert.equal(new URL(link.url).search, "");
  const decoded = decodeCanvasHash(new URL(link.url).hash, link.url.length);
  assert.equal(decoded.ok, true, name);
  if (!decoded.ok) {
    return snapshot;
  }
  assert.equal(decoded.snapshot.name, name);
  assert.deepEqual(decoded.snapshot.viewport, { x, y });
  assert.equal(decoded.snapshot.edges.length, flow.steps.length);
  assert.deepEqual(
    JSON.parse(JSON.stringify(flowFromSnapshot(decoded.snapshot))),
    JSON.parse(JSON.stringify(flow)),
  );
  return decoded.snapshot;
}

describe("canvas link", () => {
  test("round-trips the seeded canvas, an edited step, and the viewport", () => {
    let state = structuredClone(initialFlowState);
    state = flowReducer(state, {
      type: "insertNode",
      id: "mail-1",
      nodeTypeId: "send-email",
      index: 1,
    });
    state = flowReducer(state, {
      type: "setNodeCredential",
      id: "mail-1",
      credentialId: "gmail-work",
    });
    state = flowReducer(state, {
      type: "renameNode",
      id: "mail-1",
      name: "Billing mail",
    });
    state = flowReducer(state, {
      type: "resizeNode",
      id: "trigger",
      width: 520,
    });

    const snapshot = roundTrip("Support triage", state.flow, 12, 340);
    assert.deepEqual(
      snapshot.edges.map((edge) => [edge.source, edge.target]),
      [
        ["trigger", "seed-condition"],
        ["seed-condition", "mail-1"],
      ],
    );
  });

  test("stores nodes, edges, and viewport in the compressed hash", () => {
    const snapshot = snapshotFromFlow(
      "Support triage",
      initialFlowState.flow,
      { x: 4, y: 9 },
    );
    assert.ok(snapshot);
    const link = shareLinkFor(PAGE, snapshot);
    assert.equal(link.ok, true);
    if (!link.ok) {
      return;
    }
    const encoded = new URL(link.url).hash.slice("#c.".length);
    const payload = JSON.parse(lz.decompressFromEncodedURIComponent(encoded) ?? "");
    assert.deepEqual(Object.keys(payload).sort(), [
      "edges",
      "name",
      "nodes",
      "v",
      "viewport",
    ]);
    assert.equal(payload.viewport.x, 4);
    assert.equal(payload.viewport.y, 9);
    assert.equal(payload.nodes[0].type, "trigger");
    assert.equal(payload.edges[0].source, "trigger");
  });

  test("shares every template", () => {
    for (const template of TEMPLATES) {
      roundTrip(template.name, materializeTemplate(template), 0, 24);
    }
  });

  test("ignores a hash that is not a canvas link", () => {
    assert.deepEqual(decodeCanvasHash("", 10), { ok: false, reason: "empty" });
    assert.deepEqual(decodeCanvasHash("#still", 20), {
      ok: false,
      reason: "empty",
    });
  });

  test("rejects a broken, mismatched, or unknown payload", () => {
    const emptyBody = decodeCanvasHash("#c.", 20);
    const garbage = decodeCanvasHash("#c.not-a-canvas", 40);
    assert.equal(emptyBody.ok, false);
    assert.equal(garbage.ok, false);
    if (!emptyBody.ok) {
      assert.equal(emptyBody.reason, "invalid");
    }
    if (!garbage.ok) {
      assert.equal(garbage.reason, "invalid");
    }

    const snapshot = snapshotFromFlow(
      "Support triage",
      initialFlowState.flow,
      { x: 0, y: 0 },
    );
    assert.ok(snapshot);

    const cases = [
      { ...snapshot, v: 2 },
      { ...snapshot, viewport: { x: -1, y: 0 } },
      {
        ...snapshot,
        edges: [{ id: "e", source: "trigger", target: "missing" }],
      },
      { ...snapshot, nodes: [] },
    ];
    for (const payload of cases) {
      const encoded = lz.compressToEncodedURIComponent(JSON.stringify(payload));
      const decoded = decodeCanvasHash(`#c.${encoded}`, 400);
      assert.equal(decoded.ok, false);
      if (!decoded.ok) {
        assert.equal(decoded.reason, "invalid");
      }
    }
  });

  test("refuses a link that is past the length cap", () => {
    const snapshot = snapshotFromFlow(
      "Support triage",
      initialFlowState.flow,
      { x: 0, y: 0 },
    );
    assert.ok(snapshot);
    assert.deepEqual(shareLinkFor(PAGE, snapshot, 40), {
      ok: false,
      reason: "too-long",
    });

    const hash = `#c.${"a".repeat(MAX_SHARE_URL_LENGTH)}`;
    assert.deepEqual(decodeCanvasHash(hash, hash.length), {
      ok: false,
      reason: "too-long",
    });
  });
});
