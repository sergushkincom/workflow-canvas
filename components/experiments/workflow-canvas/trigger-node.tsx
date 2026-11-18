"use client";

import { Zap } from "lucide-react";

import { NodeShell } from "./node-shell";
import { RunNodeFooter } from "./run/run-node-footer";
import type {
  FlowAction,
  TriggerNode,
} from "@/lib/experiments/workflow-canvas/types";
import type {
  NodeRunState,
  StaleReason,
} from "@/lib/experiments/workflow-canvas/run-machine";
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
  staleReason?: StaleReason;
  onRunAgain?: () => void;
  runAgainDisabled?: boolean;
  highlighted?: boolean;
  onChooseTrigger?: () => void;
  triggerPickerOpen?: boolean;
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
  staleReason,
  onRunAgain,
  runAgainDisabled = false,
  highlighted = false,
  onChooseTrigger,
  triggerPickerOpen = false,
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
        highlighted={highlighted}
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
              className="block truncate text-[13px] font-semibold leading-tight"
              style={{ color: color.ink }}
            >
              {node.title}
            </span>
            <span
              className="mt-0.5 block text-[12px] leading-[1.4]"
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
          staleReason={staleReason}
          onRunAgain={onRunAgain}
          runAgainDisabled={runAgainDisabled}
        />
        {onChooseTrigger && !readOnly ? (
          <div
            className="border-t px-4 py-2.5"
            style={{ borderColor: color.border }}
          >
            <button
              type="button"
              className="rounded-[6px] px-2 py-1 text-[12px] font-medium hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              style={{ color: color.ink, background: color.field }}
              aria-haspopup="dialog"
              aria-expanded={triggerPickerOpen}
              onClick={(event) => {
                event.stopPropagation();
                onChooseTrigger();
              }}
            >
              Choose trigger
            </button>
          </div>
        ) : null}
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
