import {
  NODE_TYPES,
  getNodeType,
  type NodeTypeDef,
} from "./node-types";

export const RECENT_NODE_LIMIT = 5;

export const RECENT_NODES_STORAGE_KEY = "workflow-canvas.recent-node-types";

export const EMPTY_RECENT_SNAPSHOT = "[]";

export type RecentNodeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function browserStorage(): RecentNodeStorage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageOrBrowser(
  storage: RecentNodeStorage | null | undefined,
): RecentNodeStorage | null {
  return storage === undefined ? browserStorage() : storage;
}

export function parseRecentNodeIds(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string" || ids.includes(item) || !getNodeType(item)) {
      continue;
    }
    ids.push(item);
    if (ids.length === RECENT_NODE_LIMIT) {
      break;
    }
  }
  return ids;
}

export function readRecentNodeIds(
  storage?: RecentNodeStorage | null,
): string[] {
  const store = storageOrBrowser(storage);
  if (!store) {
    return [];
  }
  try {
    return parseRecentNodeIds(store.getItem(RECENT_NODES_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function rememberRecentNodeId(
  current: readonly string[],
  nodeTypeId: string,
  limit = RECENT_NODE_LIMIT,
): string[] {
  const known = current.filter((id) => getNodeType(id));
  if (!getNodeType(nodeTypeId)) {
    return known.slice(0, limit);
  }
  return [nodeTypeId, ...known.filter((id) => id !== nodeTypeId)].slice(
    0,
    limit,
  );
}

export function writeRecentNodeIds(
  ids: readonly string[],
  storage?: RecentNodeStorage | null,
): void {
  const store = storageOrBrowser(storage);
  if (!store) {
    return;
  }
  try {
    store.setItem(
      RECENT_NODES_STORAGE_KEY,
      JSON.stringify(ids.slice(0, RECENT_NODE_LIMIT)),
    );
  } catch {
    // Quota or blocked storage. A missing recent list is not an error.
  }
}

export function recordRecentNodeId(
  nodeTypeId: string,
  storage?: RecentNodeStorage | null,
): string[] {
  const next = rememberRecentNodeId(readRecentNodeIds(storage), nodeTypeId);
  writeRecentNodeIds(next, storage);
  return next;
}

export function resolveRecentNodeTypes(
  ids: readonly string[],
  types: readonly NodeTypeDef[] = NODE_TYPES,
): NodeTypeDef[] {
  const byId = new Map(types.map((nodeType) => [nodeType.id, nodeType]));
  const resolved: NodeTypeDef[] = [];
  for (const id of ids) {
    const nodeType = byId.get(id);
    if (!nodeType || resolved.some((item) => item.id === nodeType.id)) {
      continue;
    }
    resolved.push(nodeType);
    if (resolved.length === RECENT_NODE_LIMIT) {
      break;
    }
  }
  return resolved;
}

/** Recent rows stay at the top of an empty search and disappear while filtering. */
export function visibleRecentNodeTypes(
  recent: readonly NodeTypeDef[],
  query: string,
): NodeTypeDef[] {
  if (query.trim().length > 0) {
    return [];
  }
  return recent.slice(0, RECENT_NODE_LIMIT);
}

export function readRecentNodesSnapshot(): string {
  if (typeof window === "undefined") {
    return EMPTY_RECENT_SNAPSHOT;
  }
  try {
    return (
      window.localStorage.getItem(RECENT_NODES_STORAGE_KEY) ??
      EMPTY_RECENT_SNAPSHOT
    );
  } catch {
    return EMPTY_RECENT_SNAPSHOT;
  }
}

export function getServerRecentSnapshot(): string {
  return EMPTY_RECENT_SNAPSHOT;
}
