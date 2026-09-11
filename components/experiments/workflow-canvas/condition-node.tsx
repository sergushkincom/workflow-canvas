"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Filter, Sparkles } from "lucide-react";

import { ConditionAssistantPanel } from "./condition-assistant";
import { ConditionRowItem } from "./condition-row";
import { useChipMenu } from "./field-select";
import { NodeShell } from "./node-shell";
import { RunNodeFooter } from "./run/run-node-footer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FlowAction } from "@/lib/experiments/workflow-canvas/types";
import {
  isNodeIncomplete,
  type ConditionNode,
} from "@/lib/experiments/workflow-canvas/types";
import type { NodeRunState } from "@/lib/experiments/workflow-canvas/run-machine";
import {
  accent,
  color,
  tokenStyle,
  typeTint,
} from "@/lib/experiments/workflow-canvas/tokens";

type ConditionNodeCardProps = {
  node: ConditionNode;
  selected: boolean;
  entering: boolean;
  exiting: boolean;
  onSelect: () => void;
  dispatch: (action: FlowAction) => void;
  readOnly?: boolean;
  hideEditChrome?: boolean;
  runState?: NodeRunState;
  output?: string;
  elapsedMs?: number;
  startedAt?: number | null;
  runDurationMs?: number;
  assistantEnabled?: boolean;
  assistantOpen?: boolean;
  assistantMinimized?: boolean;
  assistantNarrow?: boolean;
  onAssistantOpen?: () => void;
  onAssistantClose?: () => void;
  onAssistantMinimize?: () => void;
};

export function ConditionNodeCard({
  node,
  selected,
  entering,
  exiting,
  onSelect,
  dispatch,
  readOnly = false,
  hideEditChrome = false,
  runState,
  output,
  elapsedMs,
  startedAt = null,
  runDurationMs,
  assistantEnabled = false,
  assistantOpen = false,
  assistantMinimized = false,
  assistantNarrow = false,
  onAssistantOpen,
  onAssistantClose,
  onAssistantMinimize,
}: ConditionNodeCardProps) {
  const incomplete = isNodeIncomplete(node) && !runState;
  const menu = useChipMenu();
  const skipped = runState === "skipped";
  const tint = typeTint.condition;
  const ticking = runState === "running";
  const sparklesRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !assistantOpen) {
      sparklesRef.current?.focus();
    }
    wasOpen.current = assistantOpen;
  }, [assistantOpen]);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center",
        entering && "animate-node-in",
        exiting && "animate-node-out",
        skipped && "opacity-60",
      )}
    >
      <div className="relative" style={{ width: node.width }}>
        <NodeShell
        chip="If / Else"
        tintKey="condition"
        selected={selected}
        width={node.width}
        onSelect={onSelect}
        onResize={(width) =>
          dispatch({ type: "resizeNode", id: node.id, width })
        }
        readOnly={readOnly}
        running={runState === "running"}
        runDurationMs={runDurationMs}
      >
        <div
          className="flex items-center gap-2.5 border-b"
          style={{ borderColor: color.border, padding: 16 }}
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
            <Filter
              size={tokenStyle.iconTile.icon}
              strokeWidth={tokenStyle.iconTile.stroke}
              aria-hidden
            />
          </span>
          <h2
            className="text-[13px] font-semibold leading-tight"
            style={{ color: color.ink }}
          >
            Condition
          </h2>
          {assistantEnabled && assistantOpen && assistantMinimized ? (
            <button
              type="button"
              className="ml-auto inline-flex h-6 items-center rounded-[6px] px-2 text-[11.5px] font-medium"
              style={{ background: color.field, color: color.muted }}
              onClick={(event) => {
                event.stopPropagation();
                onAssistantOpen?.();
              }}
            >
              Assistant
            </button>
          ) : assistantEnabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={sparklesRef}
                  type="button"
                  aria-label="Ask the condition assistant"
                  className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-[6px]"
                  style={{ color: color.muted }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                    onAssistantOpen?.();
                  }}
                >
                  <Sparkles size={14} strokeWidth={1.75} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Ask the condition assistant</TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        <div
          className="flex flex-col"
          style={{ gap: 12, padding: 16 }}
        >
          <ul className="flex flex-col" style={{ gap: 12 }}>
            {node.rows.map((row, index) => (
              <SortableRow
                key={row.id}
                node={node}
                rowId={row.id}
                index={index}
                openId={menu.openId}
                onToggleMenu={menu.toggle}
                onCloseMenu={menu.close}
                dispatch={dispatch}
                readOnly={readOnly}
                hideEditChrome={hideEditChrome}
              />
            ))}
          </ul>

          <button
            type="button"
            tabIndex={hideEditChrome ? -1 : 0}
            className={cn(
              "self-start px-0.5 text-[13px] leading-tight transition-opacity",
              hideEditChrome && "pointer-events-none opacity-0",
            )}
            style={{ color: color.muted }}
            onClick={(event) => {
              event.stopPropagation();
              if (hideEditChrome || readOnly) {
                return;
              }
              dispatch({
                type: "addRow",
                nodeId: node.id,
                rowId: crypto.randomUUID(),
              });
            }}
          >
            + Add condition
          </button>
        </div>

        <RunNodeFooter
          output={output}
          elapsedMs={elapsedMs}
          ticking={ticking}
          startedAt={startedAt}
        />

        {incomplete ? (
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
            Incomplete
          </p>
        ) : null}
      </NodeShell>
        {assistantEnabled && assistantOpen ? (
          <ConditionAssistantPanel
            node={node}
            minimized={assistantMinimized}
            narrow={assistantNarrow}
            dispatch={dispatch}
            onClose={() => onAssistantClose?.()}
            onMinimize={() => onAssistantMinimize?.()}
          />
        ) : null}
      </div>
    </div>
  );
}

function SortableRow({
  node,
  rowId,
  index,
  openId,
  onToggleMenu,
  onCloseMenu,
  dispatch,
  readOnly = false,
  hideEditChrome = false,
}: {
  node: ConditionNode;
  rowId: string;
  index: number;
  openId: string | null;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  dispatch: (action: FlowAction) => void;
  readOnly?: boolean;
  hideEditChrome?: boolean;
}) {
  const row = node.rows.find((item) => item.id === rowId);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId, disabled: readOnly || hideEditChrome });

  if (!row) {
    return null;
  }

  const style = {
    transform: CSS.Transform.toString(
      transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
    ),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <ConditionRowItem
        row={row}
        index={index}
        conjunction={node.conjunction}
        isDragging={isDragging}
        openId={openId}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        readOnly={readOnly}
        hideEditChrome={hideEditChrome}
        handleProps={{
          ...attributes,
          ...listeners,
          ref: (element: HTMLElement | null) => {
            setActivatorNodeRef(element);
          },
        }}
        onConjunctionChange={() =>
          dispatch({
            type: "setConjunction",
            nodeId: node.id,
            conjunction: node.conjunction === "and" ? "or" : "and",
          })
        }
        onMove={(direction) =>
          dispatch({
            type: "moveRow",
            nodeId: node.id,
            rowId: row.id,
            direction,
          })
        }
        onDelete={() =>
          dispatch({
            type: "deleteRow",
            nodeId: node.id,
            rowId: row.id,
          })
        }
        onPatch={(patch) =>
          dispatch({
            type: "updateRow",
            nodeId: node.id,
            rowId: row.id,
            patch,
          })
        }
      />
    </li>
  );
}
