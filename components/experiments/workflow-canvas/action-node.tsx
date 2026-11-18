"use client";

import { useRef } from "react";

import { NodeShell } from "./node-shell";
import { NodeTitle, type NodeTitleHandle } from "./node-title";
import { PaletteIconTile } from "./node-palette";
import { cn } from "@/lib/utils";
import {
  getNodeType,
  nodeTypeChip,
} from "@/lib/experiments/workflow-canvas/node-types";
import {
  color,
  type TypeTintKey,
} from "@/lib/experiments/workflow-canvas/tokens";
import {
  stepDefaultName,
  stepDisplayName,
  type ActionNode,
  type FlowAction,
} from "@/lib/experiments/workflow-canvas/types";

type ActionNodeCardProps = {
  node: ActionNode;
  selected: boolean;
  entering: boolean;
  exiting: boolean;
  onSelect: () => void;
  dispatch: (action: FlowAction) => void;
  readOnly?: boolean;
  highlighted?: boolean;
};

export function ActionNodeCard({
  node,
  selected,
  entering,
  exiting,
  onSelect,
  dispatch,
  readOnly = false,
  highlighted = false,
}: ActionNodeCardProps) {
  const definition = getNodeType(node.nodeTypeId);
  const tintKey: TypeTintKey = definition?.tint ?? "neutral";
  const icon = definition?.icon ?? "Search";
  const chip = definition ? nodeTypeChip(definition.group) : "Action";
  const titleRef = useRef<NodeTitleHandle>(null);

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
        onStartRename={
          readOnly ? undefined : () => titleRef.current?.startRename()
        }
        readOnly={readOnly}
        highlighted={highlighted}
      >
        <div className="flex items-center gap-2.5" style={{ padding: 16 }}>
          <PaletteIconTile icon={icon} tintKey={tintKey} />
          <span className="min-w-0 flex-1 text-left">
            <NodeTitle
              ref={titleRef}
              displayName={stepDisplayName(node)}
              defaultName={stepDefaultName(node)}
              selected={selected}
              readOnly={readOnly}
              onRename={(name) =>
                dispatch({ type: "renameNode", id: node.id, name })
              }
            />
            <span
              className="mt-0.5 block text-[12px] leading-[1.4]"
              style={{ color: color.muted }}
            >
              {node.subtitle}
            </span>
          </span>
        </div>
        <p
          className="flex items-center gap-1.5 border-t text-[12px] leading-[1.4]"
          style={{
            borderColor: color.border,
            color: color.muted,
            paddingInline: 16,
            paddingBlock: 10,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: color.faint }}
            aria-hidden
          />
          Not configured yet
        </p>
      </NodeShell>
    </div>
  );
}
