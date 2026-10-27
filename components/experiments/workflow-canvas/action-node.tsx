"use client";

import { NodeShell } from "./node-shell";
import { PaletteIconTile } from "./node-palette";
import { cn } from "@/lib/utils";
import {
  getNodeType,
  nodeTypeChip,
} from "@/lib/experiments/workflow-canvas/node-types";
import {
  accent,
  color,
  type TypeTintKey,
} from "@/lib/experiments/workflow-canvas/tokens";
import type {
  ActionNode,
  FlowAction,
} from "@/lib/experiments/workflow-canvas/types";

type ActionNodeCardProps = {
  node: ActionNode;
  selected: boolean;
  entering: boolean;
  exiting: boolean;
  onSelect: () => void;
  dispatch: (action: FlowAction) => void;
  readOnly?: boolean;
};

export function ActionNodeCard({
  node,
  selected,
  entering,
  exiting,
  onSelect,
  dispatch,
  readOnly = false,
}: ActionNodeCardProps) {
  const definition = getNodeType(node.nodeTypeId);
  const tintKey: TypeTintKey = definition?.tint ?? "neutral";
  const icon = definition?.icon ?? "Search";
  const chip = definition ? nodeTypeChip(definition.group) : "Action";

  return (
    <div
      data-step-id={node.id}
      className={cn(
        "flex w-full flex-col items-center",
        entering && "animate-node-in",
        exiting && "animate-node-out",
      )}
    >
      <NodeShell
        chip={chip}
        tintKey={tintKey}
        selected={selected}
        width={node.width}
        onSelect={onSelect}
        onResize={(width) =>
          dispatch({ type: "resizeNode", id: node.id, width })
        }
        readOnly={readOnly}
      >
        <div className="flex items-center gap-2.5" style={{ padding: 16 }}>
          <PaletteIconTile icon={icon} tintKey={tintKey} />
          <span className="min-w-0 text-left">
            <span
              className="block truncate text-[13px] font-semibold leading-tight"
              style={{ color: color.ink }}
            >
              {node.title}
            </span>
            <span
              className="mt-0.5 block text-[12px] leading-snug"
              style={{ color: color.muted }}
            >
              {node.subtitle}
            </span>
          </span>
        </div>
        <p
          className="flex items-center gap-1.5 border-t text-[13px] leading-tight"
          style={{
            borderColor: color.border,
            color: color.muted,
            paddingInline: 16,
            paddingBlock: 10,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
          Not configured yet
        </p>
      </NodeShell>
    </div>
  );
}
