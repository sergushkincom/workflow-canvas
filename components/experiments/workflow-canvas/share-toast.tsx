"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { color } from "@/lib/experiments/workflow-canvas/tokens";

const TOAST_MS = 4_000;

export function ShareToast({
  message,
  onDone,
  align = "center",
}: {
  message: string;
  onDone: () => void;
  /** `start` sits in the sidebar so it does not cover the template dialog. */
  align?: "center" | "start";
}) {
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current(), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [message]);

  return createPortal(
    <p
      role="status"
      data-canvas-toast=""
      className={
        align === "start"
          ? "pointer-events-none fixed bottom-14 left-4 z-[80] max-w-[220px] rounded-[6px] px-3 py-1.5 text-[13px] leading-tight shadow-raised"
          : "pointer-events-none fixed bottom-12 left-1/2 z-[80] max-w-[min(360px,calc(100%-2rem))] -translate-x-1/2 rounded-[6px] px-3 py-1.5 text-center text-[13px] leading-tight shadow-raised"
      }
      style={{
        background: color.surface,
        color: color.ink,
        border: `1px solid ${color.border}`,
      }}
    >
      {message}
    </p>,
    document.body,
  );
}
