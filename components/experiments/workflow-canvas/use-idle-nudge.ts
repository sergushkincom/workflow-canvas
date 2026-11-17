"use client";

import { useEffect } from "react";

import type { NudgeContext } from "@/lib/experiments/workflow-canvas/build-helper";

/**
 * Offers the helper after the user has been still. Pointer and key activity
 * restart the wait. `used` stops the offer for this context.
 */
export function useIdleNudge({
  active,
  context,
  delayMs,
  used,
  onDue,
}: {
  active: boolean;
  context: NudgeContext;
  delayMs: number;
  used: boolean;
  onDue: (context: NudgeContext) => void;
}) {
  useEffect(() => {
    if (!active || used) {
      return;
    }
    let timer = window.setTimeout(() => onDue(context), delayMs);

    function reset() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => onDue(context), delayMs);
    }

    window.addEventListener("pointerdown", reset, true);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset, true);
      window.removeEventListener("keydown", reset);
    };
  }, [active, context, delayMs, onDue, used]);
}
