"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  AlignLeft,
  ChevronLeft,
  Clock,
  Database,
  Filter,
  History,
  Hourglass,
  Mail,
  MessageSquare,
  PenLine,
  Search,
  Send,
  Sparkles,
  Split,
  Ticket,
  Users,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  NODE_GROUPS,
  NODE_TYPES,
  groupNodeTypes,
  type NodeTypeDef,
  type PaletteIconName,
} from "@/lib/experiments/workflow-canvas/node-types";
import {
  color,
  tokenStyle,
  typeTint,
  type TypeTintKey,
} from "@/lib/experiments/workflow-canvas/tokens";

const PALETTE_ICON: Record<PaletteIconName, LucideIcon> = {
  AlignLeft,
  Clock,
  Database,
  Filter,
  History,
  Hourglass,
  Mail,
  MessageSquare,
  PenLine,
  Search,
  Send,
  Sparkles,
  Split,
  Ticket,
  Users,
  Webhook,
  Zap,
};

type NodePaletteProps = {
  notice: string | null;
  locked: boolean;
  onAppend: (nodeTypeId: string) => void;
};

function startsCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(max-width: 899px)").matches;
}

export function NodePalette({ notice, locked, onAppend }: NodePaletteProps) {
  const [collapsed, setCollapsed] = useState(() => startsCollapsed());
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const groups = groupNodeTypes(
    needle
      ? NODE_TYPES.filter(
          (nodeType) =>
            nodeType.title.toLowerCase().includes(needle) ||
            nodeType.subtitle.toLowerCase().includes(needle),
        )
      : NODE_TYPES,
  );

  return (
    <aside
      data-node-palette=""
      aria-label="Node palette"
      className="flex h-full min-h-0 shrink-0 flex-col"
      style={{
        width: collapsed ? 44 : 280,
        background: color.surface,
        borderRight: `1px solid ${color.border}`,
      }}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 py-3">
          {NODE_GROUPS.map((group) => (
            <Tooltip key={group.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Expand node palette, ${group.label}`}
                  className="flex size-6 items-center justify-center rounded-[6px] hover:bg-field focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                  style={{ color: typeTint[group.tint].ink }}
                  onClick={() => setCollapsed(false)}
                >
                  <PaletteGlyph name={group.icon} size={24} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={8}
                className="border-0 bg-ink px-2 py-1 text-[12px] text-surface"
              >
                {group.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ) : (
        <>
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <h2
                className="text-[13px] font-semibold leading-tight"
                style={{ color: color.ink }}
              >
                Node palette
              </h2>
              <button
                type="button"
                aria-label="Collapse node palette"
                className="flex size-6 shrink-0 items-center justify-center rounded-[6px] hover:bg-field focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                style={{ color: color.faint }}
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <p
              className="mt-1 text-[12px] leading-snug"
              style={{ color: color.muted }}
            >
              Drag onto the flow, or click to add.
            </p>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search
                aria-hidden
                size={14}
                strokeWidth={1.75}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
                style={{ color: color.faint }}
              />
              <input
                type="search"
                aria-label="Search node types"
                placeholder="Search nodes"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-[30px] w-full rounded-[8px] pr-2.5 pl-8 text-[13px] leading-tight outline-none placeholder:text-ink-3 focus:outline-solid focus:outline-2 focus:outline-offset-0 focus:outline-[color:var(--accent)]"
                style={{
                  background: color.field,
                  color: color.ink,
                  border: `1px solid ${color.border}`,
                }}
              />
            </div>
          </div>
          {notice ? (
            <p
              role="status"
              className="px-3 pb-2 text-[13px] leading-snug"
              style={{ color: color.muted }}
            >
              {notice}
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
            {groups.length === 0 ? (
              <p
                role="status"
                className="px-1 text-[13px] leading-snug"
                style={{ color: color.muted }}
              >
                No node matches that.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((group) => (
                  <section key={group.id} aria-label={group.label}>
                    <h3
                      className="text-[11.5px] font-medium leading-tight"
                      style={{ color: color.muted, paddingBottom: 8 }}
                    >
                      {group.label}
                    </h3>
                    <ul className="flex flex-col gap-1.5 pt-1">
                      {group.types.map((nodeType) => (
                        <li key={nodeType.id}>
                          <PaletteCard
                            nodeType={nodeType}
                            locked={locked}
                            onAppend={onAppend}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function PaletteCard({
  nodeType,
  locked,
  onAppend,
}: {
  nodeType: NodeTypeDef;
  locked: boolean;
  onAppend: (nodeTypeId: string) => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${nodeType.id}`,
    data: { source: "palette", nodeTypeId: nodeType.id },
    disabled: locked,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "group/card relative flex w-full items-center rounded-[10px] bg-surface text-left hover:bg-field",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]",
        isDragging && "opacity-40",
      )}
      style={{
        gap: 10,
        padding: "10px 12px",
        border: `1px solid ${color.border}`,
      }}
      onClick={() => onAppend(nodeType.id)}
      {...listeners}
      {...attributes}
      aria-disabled={undefined}
    >
      <PaletteCardFace nodeType={nodeType} />
      <DragHandle visible={isDragging} />
    </button>
  );
}

export function PaletteCardPreview({ nodeType }: { nodeType: NodeTypeDef }) {
  return (
    <div
      className="group/card relative flex rotate-2 items-center rounded-[10px] bg-surface shadow-raised"
      style={{
        width: 256,
        gap: 10,
        padding: "10px 12px",
        border: `1px solid ${color.border}`,
        opacity: 1,
      }}
    >
      <PaletteCardFace nodeType={nodeType} />
      <DragHandle visible />
    </div>
  );
}

function PaletteCardFace({ nodeType }: { nodeType: NodeTypeDef }) {
  return (
    <>
      <PaletteIconTile icon={nodeType.icon} tintKey={nodeType.tint} />
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[13px] font-medium leading-tight"
          style={{ color: color.ink }}
        >
          {nodeType.title}
        </span>
        <span
          className="mt-0.5 block truncate text-[12px] leading-tight"
          style={{ color: color.muted }}
        >
          {nodeType.subtitle}
        </span>
      </span>
    </>
  );
}

function DragHandle({ visible = false }: { visible?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 right-0.5 -translate-y-1/2",
        visible
          ? "opacity-100"
          : "opacity-0 group-hover/card:opacity-100 group-focus/card:opacity-100 group-focus-visible/card:opacity-100",
      )}
      style={{ color: color.faint }}
    >
      <Handle />
    </span>
  );
}

export function PaletteIconTile({
  icon,
  tintKey,
}: {
  icon: PaletteIconName;
  tintKey: TypeTintKey;
}) {
  const tint = typeTint[tintKey];
  return (
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
      <PaletteGlyph name={icon} />
    </span>
  );
}

function PaletteGlyph({
  name,
  size = tokenStyle.iconTile.icon,
}: {
  name: PaletteIconName;
  size?: number;
}) {
  const Icon = PALETTE_ICON[name];
  return (
    <Icon size={size} strokeWidth={tokenStyle.iconTile.stroke} aria-hidden />
  );
}

function Handle() {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      className="shrink-0"
      aria-hidden
    >
      {[2, 7, 12].flatMap((y) =>
        [2.2, 7.8].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" fill="currentColor" />
        )),
      )}
    </svg>
  );
}
