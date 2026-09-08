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

type NodeShellProps = {
  chip: string;
  tintKey: TypeTintKey;
  selected: boolean;
  width: number;
  children: ReactNode;
  onSelect: () => void;
  onResize: (width: number) => void;
  className?: string;
  readOnly?: boolean;
  dimmed?: boolean;
  running?: boolean;
  runDurationMs?: number;
};

export function NodeShell({
  chip,
  tintKey,
  selected,
  width,
  children,
  onSelect,
  onResize,
  className,
  readOnly = false,
  dimmed = false,
  running = false,
  runDurationMs,
}: NodeShellProps) {
  const tint = typeTint[tintKey];

  return (
    <div
      className={cn(
        "group/node relative flex flex-col items-start",
        dimmed && "opacity-40",
        className,
      )}
      style={{ width, gap: 6 }}
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
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect();
            }
          }}
          className={cn(
            "relative w-full overflow-hidden rounded-[12px] text-left outline-none transition-shadow duration-150",
            selected ? "" : "shadow-card hover:shadow-raised",
          )}
          style={{
            background: color.surface,
            boxShadow: selected
              ? `0 0 0 1.5px ${accent}, 0 2px 10px color-mix(in srgb, ${color.ink} 4.5%, transparent)`
              : undefined,
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) {
              event.currentTarget.style.boxShadow = `0 0 0 1.5px ${accent}`;
            }
          }}
          onBlur={(event) => {
            event.currentTarget.style.boxShadow = selected
              ? `0 0 0 1.5px ${accent}, 0 2px 10px color-mix(in srgb, ${color.ink} 4.5%, transparent)`
              : "";
          }}
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
