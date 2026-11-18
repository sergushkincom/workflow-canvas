"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { NodeTypeDef } from "@/lib/experiments/workflow-canvas/node-types";
import {
  getServerRecentSnapshot,
  parseRecentNodeIds,
  readRecentNodesSnapshot,
  recordRecentNodeId,
  resolveRecentNodeTypes,
} from "@/lib/experiments/workflow-canvas/recent-nodes";

const RECENT_NODES_EVENT = "workflow-canvas:recent-nodes";

function subscribeRecentNodes(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_NODES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_NODES_EVENT, onChange);
  };
}

export function useRecentNodeTypes(): {
  types: NodeTypeDef[];
  record: (nodeTypeId: string) => void;
} {
  const raw = useSyncExternalStore(
    subscribeRecentNodes,
    readRecentNodesSnapshot,
    getServerRecentSnapshot,
  );

  const record = useCallback((nodeTypeId: string) => {
    recordRecentNodeId(nodeTypeId);
    if (typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new Event(RECENT_NODES_EVENT));
  }, []);

  return {
    types: resolveRecentNodeTypes(parseRecentNodeIds(raw)),
    record,
  };
}
