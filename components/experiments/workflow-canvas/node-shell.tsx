"use client";

import type { ReactNode } from "react";

import { ResizeHandles } from "./resize-handles";
import { cn } from "@/lib/utils";
import {
  accent,
  color,
  typeTint,
  type TypeTintKey,
} from "@/lib/experiments/workflow-canvas/tokens";

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

type NodeShellProps = {
  chip: string;
  tintKey: TypeTintKey;
  selected: boolean;
  width: number;
  children: ReactNode;
  onSelect: () => void;
  onResize: (width: number) => void;
  onStartRename?: () => void;
  className?: string;
  readOnly?: boolean;
  dimmed?: boolean;
  running?: boolean;
  runDurationMs?: number;
  highlighted?: boolean;
};

export function NodeShell({
  chip,
  tintKey,
  selected,
  width,
  children,
  onSelect,
  onResize,
  onStartRename,
  className,
  readOnly = false,
  dimmed = false,
  running = false,
  runDurationMs,
  highlighted = false,
}: NodeShellProps) {
  const tint = typeTint[tintKey];

  return (
    <div
      data-build-highlight={highlighted ? "true" : undefined}
      className={cn(
        "group/node relative flex flex-col items-start",
        dimmed && "opacity-40",
        className,
      )}
      style={{
        width,
        gap: 6,
        outline: highlighted ? `2px solid ${accent}` : undefined,
        outlineOffset: highlighted ? 3 : undefined,
        borderRadius: highlighted ? 14 : undefined,
      }}
    >
      <span
        className="inline-flex items-center font-medium tracking-[0.04em] uppercase"
        style={{
          background: tint.tint,
          color: tint.ink,
          fontSize: 11,
          fontWeight: 500,
          borderRadius: 6,
          paddingInline: 8,
          paddingBlock: 2,
        }}
      >
        {chip}
      </span>
      <div className="relative w-full">
        <article
          role="option"
          aria-selected={selected}
          aria-disabled={readOnly || dimmed}
          aria-keyshortcuts={onStartRename ? "F2" : undefined}
          tabIndex={readOnly || dimmed ? -1 : 0}
          onClick={(event) => {
            event.stopPropagation();
            if (!readOnly && !dimmed) {
              onSelect();
            }
          }}
          onKeyDown={(event) => {
            if (readOnly || dimmed) {
              return;
            }
            if (
              event.key === "F2" &&
              !event.repeat &&
              onStartRename &&
              !isTextEntry(event.target)
            ) {
              event.preventDefault();
              event.stopPropagation();
              onSelect();
              onStartRename();
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect();
            }
          }}
          className={cn(
            "node-card relative w-full overflow-hidden rounded-[12px] text-left outline-none transition-shadow duration-150",
            selected ? "" : "shadow-card hover:shadow-raised",
          )}
          data-selected={selected || undefined}
          style={{ background: color.surface }}
        >
          {children}
          {running ? (
            <span
              aria-hidden
              className="animate-progress-travel pointer-events-none absolute right-0 bottom-0 left-0 h-[2px]"
              style={{
                background: accent,
                animationDuration: runDurationMs
                  ? `${runDurationMs}ms`
                  : undefined,
              }}
            />
          ) : null}
        </article>
        {!readOnly ? (
          <ResizeHandles
            width={width}
            visible={selected}
            onResize={onResize}
            onResizeStart={onSelect}
          />
        ) : null}
      </div>
    </div>
  );
}
