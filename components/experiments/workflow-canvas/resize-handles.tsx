"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  NODE_MAX_WIDTH,
  NODE_MIN_WIDTH,
  clampNodeWidth,
} from "@/lib/experiments/workflow-canvas/types";

type Edge = "left" | "right";

type ResizeHandlesProps = {
  width: number;
  visible: boolean;
  onResize: (width: number) => void;
  onResizeStart?: () => void;
};

export function ResizeHandles({
  width,
  visible,
  onResize,
  onResizeStart,
}: ResizeHandlesProps) {
  const drag = useRef<{
    edge: Edge;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [active, setActive] = useState(false);

  const onPointerDown = useCallback(
    (edge: Edge) => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      drag.current = {
        edge,
        startX: event.clientX,
        startWidth: width,
      };
      setActive(true);
      onResizeStart?.();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onResizeStart, width],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const current = drag.current;
      if (!current) {
        return;
      }
      const delta = event.clientX - current.startX;
      const next =
        current.edge === "right"
          ? current.startWidth + delta
          : current.startWidth - delta;
      onResize(clampNodeWidth(next));
    },
    [onResize],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!drag.current) {
        return;
      }
      drag.current = null;
      setActive(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // already released
      }
    },
    [],
  );

  const onKeyDown = useCallback(
    (edge: Edge) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? 16 : 8;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onResize(
          clampNodeWidth(width + (edge === "right" ? step : -step)),
        );
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onResize(
          clampNodeWidth(width + (edge === "right" ? -step : step)),
        );
      }
    },
    [onResize, width],
  );

  return (
    <>
      <Handle
        edge="left"
        visible={visible || active}
        active={active}
        ariaValue={width}
        onPointerDown={onPointerDown("left")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown("left")}
      />
      <Handle
        edge="right"
        visible={visible || active}
        active={active}
        ariaValue={width}
        onPointerDown={onPointerDown("right")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown("right")}
      />
    </>
  );
}

function Handle({
  edge,
  visible,
  active,
  ariaValue,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown,
}: {
  edge: Edge;
  visible: boolean;
  active: boolean;
  ariaValue: number;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Resize card from the ${edge}`}
      aria-valuemin={NODE_MIN_WIDTH}
      aria-valuemax={NODE_MAX_WIDTH}
      aria-valuenow={ariaValue}
      aria-orientation="horizontal"
      role="slider"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "absolute top-1/2 z-20 flex h-10 w-3 -translate-y-1/2 items-center justify-center",
        "cursor-ew-resize touch-none outline-none",
        edge === "left" ? "-left-1.5" : "-right-1.5",
        "opacity-0 transition-opacity duration-100",
        "group-hover/node:opacity-100",
        (visible || active) && "opacity-100",
        "focus-visible:opacity-100",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-8 w-1 rounded-full bg-[var(--line-strong)] transition-colors",
          active && "bg-[var(--accent)]",
          "group-hover/node:bg-ink-3",
        )}
      />
    </button>
  );
}
