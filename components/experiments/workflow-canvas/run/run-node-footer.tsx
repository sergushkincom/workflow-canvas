"use client";

import { useEffect, useState } from "react";

import {
  formatClockTime,
  formatElapsed,
} from "@/lib/experiments/workflow-canvas/run-machine";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

type RunNodeFooterProps = {
  output?: string;
  /** Frozen value when the step is done */
  elapsedMs?: number;
  /** Keep a live clock while running or awaiting */
  ticking?: boolean;
  startedAt?: number | null;
  waitingSince?: number | null;
};

export function RunNodeFooter({
  output,
  elapsedMs,
  ticking = false,
  startedAt = null,
  waitingSince = null,
}: RunNodeFooterProps) {
  const [liveMs, setLiveMs] = useState(0);

  useEffect(() => {
    if (!ticking || startedAt == null) {
      return;
    }
    const tick = () => setLiveMs(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [ticking, startedAt]);

  const showWaitingSince = waitingSince != null;
  const showElapsed =
    !showWaitingSince && (ticking || elapsedMs !== undefined);
  if (!output && !showElapsed && !showWaitingSince) {
    return null;
  }

  const displayMs = ticking ? liveMs : (elapsedMs ?? 0);

  return (
    <div
      className="animate-output-in flex items-baseline justify-between gap-3 border-t"
      style={{
        borderColor: color.border,
        paddingInline: 16,
        paddingBlock: 10,
      }}
    >
      {output ? (
        <p
          className="min-w-0 text-[11px] leading-snug"
          style={{ color: color.muted }}
        >
          {output}
        </p>
      ) : (
        <span />
      )}
      {showWaitingSince ? (
        <p
          className="shrink-0 text-[11px] tabular-nums"
          style={{ color: color.faint }}
        >
          Waiting since {formatClockTime(waitingSince)}
        </p>
      ) : showElapsed ? (
        <p
          className="shrink-0 text-[11px] tabular-nums"
          style={{ color: color.faint }}
        >
          {formatElapsed(displayMs)}
        </p>
      ) : null}
    </div>
  );
}
