import lzString from "lz-string";

// lz-string is CommonJS. Node's test runner only sees the default export;
// the type package lists the functions as named exports.
const lz = lzString as unknown as {
  compressToEncodedURIComponent(input: string): string;
  decompressFromEncodedURIComponent(input: string): string | null;
};

import { findCredential, nodeAcceptsCredential } from "./credentials";
import { OPERATORS, SOURCES, getField } from "./data";
import { getNodeType, nodeTypeIsTrigger } from "./node-types";
import { BLANK_WORKFLOW_NAME } from "./templates";
import type {
  ActionNode,
  ConditionNode,
  ConditionRow,
  Conjunction,
  Flow,
  TriggerNode,
} from "./types";
import {
  clampNodeWidth,
  isActionNode,
  isConditionNode,
} from "./types";

/** Full URL length we will still put on the clipboard. Longer links are refused. */
export const MAX_SHARE_URL_LENGTH = 8_000;

const MAX_JSON = 100_000;
const MAX_NODES = 80;
const MAX_ROWS = 40;
const MAX_NAME = 200;
const MAX_TEXT = 400;
const MAX_VALUE = 2_000;
const MAX_VIEWPORT = 100_000;

const HASH_PREFIX = "c.";
const NODE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;

export const LINK_COPIED = "Link copied";
export const LINK_TOO_LONG = "This canvas is too long to share as a link.";
export const LINK_COPY_FAILED = "Couldn't copy the link.";
export const LINK_IN_ADDRESS_BAR =
  "Couldn't copy. The link is in the address bar.";
export const LINK_INVALID = "Couldn't open that link. Starting fresh.";
export const LINK_OPEN_TOO_LONG =
  "That link is too long to open. Starting fresh.";

export type ShareViewport = {
  x: number;
  y: number;
};

export type ShareEdge = {
  id: string;
  source: string;
  target: string;
};

type ShareRow = {
  id: string;
  source?: string;
  field?: string;
  operator?: string;
  value?: string;
};

type ShareTrigger = {
  type: "trigger";
  id: "trigger";
  title: string;
  description: string;
  width: number;
  nodeTypeId?: string;
  name?: string;
};

type ShareCondition = {
  type: "condition";
  id: string;
  conjunction: Conjunction;
  width: number;
  rows: ShareRow[];
  name?: string;
};

type ShareAction = {
  type: "action";
  id: string;
  nodeTypeId: string;
  width: number;
  name?: string;
  credentialId?: string;
};

export type ShareNode = ShareTrigger | ShareCondition | ShareAction;

/** Nodes, the edges that join them in order, and the canvas scroll position. */
export type CanvasSnapshot = {
  v: 1;
  name: string;
  nodes: ShareNode[];
  edges: ShareEdge[];
  viewport: ShareViewport;
};

export type DecodeResult =
  | { ok: true; snapshot: CanvasSnapshot }
  | { ok: false; reason: "empty" | "invalid" | "too-long" };

export type ShareLinkResult =
  | { ok: true; url: string }
  | { ok: false; reason: "invalid" | "too-long" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNodeId(value: unknown): string | null {
  return typeof value === "string" && NODE_ID.test(value) ? value : null;
}

function readLabel(value: unknown, max: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[\u0000-\u001f]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function readOptionalLabel(
  value: unknown,
  max: number,
): string | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  return readLabel(value, max);
}

function readWidth(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return clampNodeWidth(value);
}

function readAxis(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > MAX_VIEWPORT) {
    return null;
  }
  return rounded;
}

function readViewport(value: unknown): ShareViewport | null {
  if (!isRecord(value)) {
    return null;
  }
  const x = readAxis(value.x);
  const y = readAxis(value.y);
  if (x === null || y === null) {
    return null;
  }
  return { x, y };
}

function readRow(value: unknown, seen: Set<string>): ShareRow | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readNodeId(value.id);
  if (!id || seen.has(id)) {
    return null;
  }
  seen.add(id);
  const row: ShareRow = { id };

  if (value.source !== undefined && value.source !== "") {
    if (typeof value.source !== "string") {
      return null;
    }
    if (!SOURCES.some((source) => source.id === value.source)) {
      return null;
    }
    row.source = value.source;
  }

  if (value.field !== undefined && value.field !== "") {
    if (typeof value.field !== "string" || !row.source) {
      return null;
    }
    if (!getField(row.source, value.field)) {
      return null;
    }
    row.field = value.field;
  }

  if (value.operator !== undefined && value.operator !== "") {
    if (typeof value.operator !== "string" || !row.field) {
      return null;
    }
    if (!OPERATORS.some((operator) => operator.id === value.operator)) {
      return null;
    }
    row.operator = value.operator;
  }

  if (
    value.value !== undefined &&
    value.value !== "" &&
    row.operator !== "is empty"
  ) {
    if (typeof value.value !== "string" || !row.operator) {
      return null;
    }
    if (value.value.length > MAX_VALUE || /[\u0000-\u001f]/.test(value.value)) {
      return null;
    }
    row.value = value.value;
  }

  return row;
}

function readNode(value: unknown, seen: Set<string>): ShareNode | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readNodeId(value.id);
  if (!id || seen.has(id)) {
    return null;
  }
  const width = readWidth(value.width);
  const name = readOptionalLabel(value.name, MAX_NAME);
  if (width === null || name === null) {
    return null;
  }

  if (value.type === "trigger") {
    if (id !== "trigger") {
      return null;
    }
    const title = readLabel(value.title, MAX_TEXT);
    const description = readLabel(value.description, MAX_TEXT);
    if (!title || !description) {
      return null;
    }
    let nodeTypeId: string | undefined;
    if (value.nodeTypeId !== undefined) {
      if (typeof value.nodeTypeId !== "string" || !nodeTypeIsTrigger(value.nodeTypeId)) {
        return null;
      }
      nodeTypeId = value.nodeTypeId;
    }
    seen.add(id);
    const node: ShareTrigger = {
      type: "trigger",
      id: "trigger",
      title,
      description,
      width,
    };
    if (nodeTypeId) {
      node.nodeTypeId = nodeTypeId;
    }
    if (name) {
      node.name = name;
    }
    return node;
  }

  if (value.type === "condition") {
    if (id === "trigger" || !Array.isArray(value.rows)) {
      return null;
    }
    if (value.rows.length < 1 || value.rows.length > MAX_ROWS) {
      return null;
    }
    if (value.conjunction !== "and" && value.conjunction !== "or") {
      return null;
    }
    const rowIds = new Set<string>();
    const rows: ShareRow[] = [];
    for (const row of value.rows) {
      const parsed = readRow(row, rowIds);
      if (!parsed) {
        return null;
      }
      rows.push(parsed);
    }
    seen.add(id);
    const node: ShareCondition = {
      type: "condition",
      id,
      conjunction: value.conjunction,
      width,
      rows,
    };
    if (name) {
      node.name = name;
    }
    return node;
  }

  if (value.type === "action") {
    if (id === "trigger" || typeof value.nodeTypeId !== "string") {
      return null;
    }
    const definition = getNodeType(value.nodeTypeId);
    if (!definition || definition.group === "Triggers") {
      return null;
    }
    seen.add(id);
    const node: ShareAction = {
      type: "action",
      id,
      nodeTypeId: definition.id,
      width,
    };
    if (name) {
      node.name = name;
    }
    if (
      typeof value.credentialId === "string" &&
      nodeAcceptsCredential(definition.id) &&
      findCredential(value.credentialId)
    ) {
      node.credentialId = value.credentialId;
    }
    return node;
  }

  return null;
}

function edgesFor(nodes: readonly ShareNode[]): ShareEdge[] {
  const edges: ShareEdge[] = [];
  for (let index = 1; index < nodes.length; index += 1) {
    const source = nodes[index - 1].id;
    const target = nodes[index].id;
    edges.push({ id: `${source}>${target}`, source, target });
  }
  return edges;
}

function edgesMatch(nodes: readonly ShareNode[], edges: ShareEdge[]): boolean {
  if (edges.length !== nodes.length - 1) {
    return false;
  }
  const seen = new Set<string>();
  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index];
    if (
      !edge ||
      seen.has(edge.id) ||
      edge.source !== nodes[index].id ||
      edge.target !== nodes[index + 1].id
    ) {
      return false;
    }
    if (
      typeof edge.id !== "string" ||
      edge.id.length < 1 ||
      edge.id.length > 180 ||
      /[\s\u0000-\u001f]/.test(edge.id)
    ) {
      return false;
    }
    seen.add(edge.id);
  }
  return true;
}

function parseSnapshot(value: unknown): CanvasSnapshot | null {
  if (!isRecord(value) || value.v !== 1 || !Array.isArray(value.nodes)) {
    return null;
  }
  const name = readLabel(value.name, MAX_NAME);
  const viewport = readViewport(value.viewport);
  if (!name || !viewport) {
    return null;
  }
  if (value.nodes.length < 1 || value.nodes.length > MAX_NODES) {
    return null;
  }
  const seen = new Set<string>();
  const nodes: ShareNode[] = [];
  for (const node of value.nodes) {
    const parsed = readNode(node, seen);
    if (!parsed) {
      return null;
    }
    nodes.push(parsed);
  }
  if (nodes[0]?.type !== "trigger") {
    return null;
  }
  if (nodes.slice(1).some((node) => node.type === "trigger")) {
    return null;
  }
  if (!Array.isArray(value.edges)) {
    return null;
  }
  const edges: ShareEdge[] = [];
  for (const edge of value.edges) {
    if (!isRecord(edge)) {
      return null;
    }
    if (
      typeof edge.id !== "string" ||
      typeof edge.source !== "string" ||
      typeof edge.target !== "string"
    ) {
      return null;
    }
    edges.push({ id: edge.id, source: edge.source, target: edge.target });
  }
  if (!edgesMatch(nodes, edges)) {
    return null;
  }
  return { v: 1, name, nodes, edges, viewport };
}

function shareRow(row: ConditionRow): ShareRow {
  const next: ShareRow = { id: row.id };
  if (row.source) {
    next.source = row.source;
  }
  if (row.field) {
    next.field = row.field;
  }
  if (row.operator) {
    next.operator = row.operator;
  }
  if (row.value && row.operator !== "is empty") {
    next.value = row.value;
  }
  return next;
}

export function snapshotFromFlow(
  name: string,
  flow: Flow,
  viewport: ShareViewport,
): CanvasSnapshot | null {
  const trigger: ShareTrigger = {
    type: "trigger",
    id: "trigger",
    title: flow.trigger.title,
    description: flow.trigger.description,
    width: flow.trigger.width,
  };
  if (flow.trigger.nodeTypeId) {
    trigger.nodeTypeId = flow.trigger.nodeTypeId;
  }
  if (flow.trigger.name) {
    trigger.name = flow.trigger.name;
  }

  const nodes: ShareNode[] = [trigger];
  for (const step of flow.steps) {
    if (isConditionNode(step)) {
      const node: ShareCondition = {
        type: "condition",
        id: step.id,
        conjunction: step.conjunction,
        width: step.width,
        rows: step.rows.map(shareRow),
      };
      if (step.name) {
        node.name = step.name;
      }
      nodes.push(node);
      continue;
    }
    if (!isActionNode(step)) {
      return null;
    }
    const node: ShareAction = {
      type: "action",
      id: step.id,
      nodeTypeId: step.nodeTypeId,
      width: step.width,
    };
    if (step.name) {
      node.name = step.name;
    }
    if (step.credentialId) {
      node.credentialId = step.credentialId;
    }
    nodes.push(node);
  }

  const label = name.trim().slice(0, MAX_NAME) || BLANK_WORKFLOW_NAME;
  return parseSnapshot({
    v: 1,
    name: label,
    nodes,
    edges: edgesFor(nodes),
    viewport,
  });
}

export function flowFromSnapshot(snapshot: CanvasSnapshot): Flow {
  const triggerNode = snapshot.nodes[0];
  if (!triggerNode || triggerNode.type !== "trigger") {
    throw new Error("Canvas snapshot is missing its trigger.");
  }
  const trigger: TriggerNode = {
    id: "trigger",
    title: triggerNode.title,
    description: triggerNode.description,
    width: triggerNode.width,
  };
  if (triggerNode.nodeTypeId) {
    trigger.nodeTypeId = triggerNode.nodeTypeId;
  }
  if (triggerNode.name) {
    trigger.name = triggerNode.name;
  }

  const steps = snapshot.nodes.slice(1).map((node) => {
    if (node.type === "condition") {
      const condition: ConditionNode = {
        id: node.id,
        conjunction: node.conjunction,
        width: node.width,
        rows: node.rows.map((row) => {
          const next: ConditionRow = { id: row.id };
          if (row.source) {
            next.source = row.source;
          }
          if (row.field) {
            next.field = row.field;
          }
          if (row.operator) {
            next.operator = row.operator;
          }
          if (row.value) {
            next.value = row.value;
          }
          return next;
        }),
      };
      if (node.name) {
        condition.name = node.name;
      }
      return condition;
    }
    if (node.type !== "action") {
      throw new Error("Canvas snapshot has an extra trigger.");
    }
    const definition = getNodeType(node.nodeTypeId);
    const action: ActionNode = {
      id: node.id,
      kind: "action",
      nodeTypeId: node.nodeTypeId,
      title: definition?.title ?? node.nodeTypeId,
      subtitle: definition?.subtitle ?? "",
      width: node.width,
    };
    if (node.name) {
      action.name = node.name;
    }
    if (node.credentialId) {
      action.credentialId = node.credentialId;
    }
    return action;
  });

  return { trigger, steps };
}

export function shareLinkFor(
  pageUrl: string,
  snapshot: CanvasSnapshot,
  max = MAX_SHARE_URL_LENGTH,
): ShareLinkResult {
  let encoded = "";
  try {
    encoded = lz.compressToEncodedURIComponent(JSON.stringify(snapshot));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!encoded) {
    return { ok: false, reason: "invalid" };
  }
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  url.search = "";
  url.hash = `${HASH_PREFIX}${encoded}`;
  const href = url.toString();
  if (href.length > max) {
    return { ok: false, reason: "too-long" };
  }
  const decoded = decodeCanvasHash(url.hash, href.length, max);
  if (!decoded.ok) {
    return {
      ok: false,
      reason: decoded.reason === "too-long" ? "too-long" : "invalid",
    };
  }
  return { ok: true, url: href };
}

export function decodeCanvasHash(
  hash: string,
  urlLength: number,
  max = MAX_SHARE_URL_LENGTH,
): DecodeResult {
  if (!hash || hash === "#") {
    return { ok: false, reason: "empty" };
  }
  const body = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!body.startsWith(HASH_PREFIX)) {
    return { ok: false, reason: "empty" };
  }
  if (urlLength > max || hash.length > max) {
    return { ok: false, reason: "too-long" };
  }
  const encoded = body.slice(HASH_PREFIX.length);
  if (!encoded) {
    return { ok: false, reason: "invalid" };
  }
  let json: string | null = null;
  try {
    json = lz.decompressFromEncodedURIComponent(encoded);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof json !== "string" || json.length === 0 || json.length > MAX_JSON) {
    return { ok: false, reason: "invalid" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const snapshot = parseSnapshot(parsed);
  if (!snapshot) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, snapshot };
}
