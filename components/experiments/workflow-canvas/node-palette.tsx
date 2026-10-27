"use client";

import { useDraggable } from "@dnd-kit/core";
import {
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
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  NODE_GROUPS,
  NODE_TYPES,
  groupNodeTypes,
  type NodeTypeDef,
  type PaletteIconName,
} from "@/lib/experiments/workflow-canvas/node-types";
import {
  accent,
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
        <div className="flex flex-col items-center gap-2 py-3">
          {NODE_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              title={group.label}
              aria-label={`Expand node palette, ${group.label}`}
              className="flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
              style={{
                width: tokenStyle.iconTile.size,
                height: tokenStyle.iconTile.size,
                borderRadius: tokenStyle.iconTile.radius,
                background: typeTint[group.tint].tint,
                color: typeTint[group.tint].ink,
              }}
              onClick={() => setCollapsed(false)}
            >
              <PaletteGlyph name={group.icon} />
            </button>
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
                className="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-[16px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                style={{ color: color.muted }}
                onClick={() => setCollapsed(true)}
              >
                <span aria-hidden>«</span>
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
            <input
              type="search"
              aria-label="Search node types"
              placeholder="Search nodes"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-[30px] w-full rounded-[8px] px-2.5 text-[13px] leading-tight outline-none placeholder:text-[color:var(--ink-3)]"
              style={{
                background: color.field,
                color: color.ink,
                border: `1px solid ${color.border}`,
              }}
              onFocus={(event) => {
                event.currentTarget.style.boxShadow = `0 0 0 2px ${accent}`;
              }}
              onBlur={(event) => {
                event.currentTarget.style.boxShadow = "";
              }}
            />
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
                      className="px-1 text-[11px] font-medium tracking-[0.04em] uppercase"
                      style={{ color: color.muted, marginBottom: 6 }}
                    >
                      {group.label}
                    </h3>
                    <ul className="flex flex-col gap-1.5">
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
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } =
    useDraggable({
      id: `palette:${nodeType.id}`,
      data: { source: "palette", nodeTypeId: nodeType.id },
      disabled: locked,
    });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/card flex items-center rounded-[10px] pr-1 hover:bg-field",
        isDragging && "opacity-40",
      )}
      style={{ border: `1px solid ${color.border}` }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-1.5 pr-1 pl-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
        onClick={() => onAppend(nodeType.id)}
      >
        <PaletteIconTile icon={nodeType.icon} tintKey={nodeType.tint} />
        <span className="min-w-0">
          <span
            className="block text-[13px] font-medium leading-tight"
            style={{ color: color.ink }}
          >
            {nodeType.title}
          </span>
          <span
            className="mt-0.5 block text-[12px] leading-snug"
            style={{ color: color.muted }}
          >
            {nodeType.subtitle}
          </span>
        </span>
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={cn(
          "mr-1 flex size-6 shrink-0 items-center justify-center rounded-[6px] transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]",
          "opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100",
          isDragging && "opacity-100",
        )}
        style={{ color: color.faint }}
        {...listeners}
        {...attributes}
        aria-label={`Drag ${nodeType.title} onto the flow`}
      >
        <Handle />
      </button>
    </div>
  );
}

export function PaletteCardPreview({ nodeType }: { nodeType: NodeTypeDef }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] shadow-raised"
      style={{
        width: 220,
        padding: 8,
        background: color.surface,
        border: `1px solid ${color.border}`,
      }}
    >
      <PaletteIconTile icon={nodeType.icon} tintKey={nodeType.tint} />
      <span className="min-w-0">
        <span
          className="block truncate text-[13px] font-medium leading-tight"
          style={{ color: color.ink }}
        >
          {nodeType.title}
        </span>
        <span
          className="mt-0.5 block truncate text-[12px] leading-snug"
          style={{ color: color.muted }}
        >
          {nodeType.subtitle}
        </span>
      </span>
    </div>
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

function PaletteGlyph({ name }: { name: PaletteIconName }) {
  const Icon = PALETTE_ICON[name];
  return (
    <Icon
      size={tokenStyle.iconTile.icon}
      strokeWidth={tokenStyle.iconTile.stroke}
      aria-hidden
    />
  );
}

function Handle() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      className="shrink-0"
      aria-hidden
    >
      {[3, 8, 13].flatMap((y) => [
        <circle key={`l${y}`} cx="3" cy={y} r="1.1" fill="currentColor" />,
        <circle key={`r${y}`} cx="7.5" cy={y} r="1.1" fill="currentColor" />,
      ])}
    </svg>
  );
}
