"use client";

import { Zap } from "lucide-react";

import { NodeShell } from "./node-shell";
import { RunNodeFooter } from "./run/run-node-footer";
import type {
  FlowAction,
  TriggerNode,
} from "@/lib/experiments/workflow-canvas/types";
import type { NodeRunState } from "@/lib/experiments/workflow-canvas/run-machine";
import {
  color,
  tokenStyle,
  typeTint,
} from "@/lib/experiments/workflow-canvas/tokens";

type TriggerNodeCardProps = {
  node: TriggerNode;
  selected: boolean;
  hintVisible: boolean;
  onSelect: () => void;
  dispatch: (action: FlowAction) => void;
  readOnly?: boolean;
  runState?: NodeRunState;
  output?: string;
  elapsedMs?: number;
  startedAt?: number | null;
  runDurationMs?: number;
};

export function TriggerNodeCard({
  node,
  selected,
  hintVisible,
  onSelect,
  dispatch,
  readOnly = false,
  runState,
  output,
  elapsedMs,
  startedAt = null,
  runDurationMs,
}: TriggerNodeCardProps) {
  const tint = typeTint.trigger;
  const ticking = runState === "running";

  return (
    <div className="flex w-full flex-col items-center">
      <NodeShell
        chip="Trigger"
        tintKey="trigger"
        selected={selected}
        width={node.width}
        onSelect={onSelect}
        onResize={(width) =>
          dispatch({ type: "resizeNode", id: "trigger", width })
        }
        readOnly={readOnly}
        running={runState === "running"}
        runDurationMs={runDurationMs}
      >
        <div
          className="flex items-center gap-2.5"
          style={{ padding: 16 }}
        >
          <span
            className="flex shrink-0 items-center justify-center"
            style={{
              width: tokenStyle.iconTile.size,
              height: tokenStyle.iconTile.size,
              borderRadius: tokenStyle.iconTile.radius,
              background: tint.tint,
              color: tint.ink,
            }}
          >
            <Zap
              size={tokenStyle.iconTile.icon}
              strokeWidth={tokenStyle.iconTile.stroke}
              aria-hidden
            />
          </span>
          <span className="min-w-0 text-left">
            <span
              className="block truncate text-[13px] font-semibold"
              style={{ color: color.ink }}
            >
              {node.title}
            </span>
            <span
              className="mt-0.5 block text-[12px] leading-snug"
              style={{ color: color.muted }}
            >
              {node.description}
            </span>
          </span>
        </div>
        <RunNodeFooter
          output={output}
          elapsedMs={elapsedMs}
          ticking={ticking}
          startedAt={startedAt}
        />
      </NodeShell>
      {hintVisible ? (
        <p
          className="mt-2 text-[13px] leading-tight"
          style={{ color: color.muted }}
        >
          Every flow needs a trigger
        </p>
      ) : null}
    </div>
  );
}
