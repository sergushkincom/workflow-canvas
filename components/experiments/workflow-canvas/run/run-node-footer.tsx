"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  formatClockTime,
  formatElapsed,
  type StaleReason,
} from "@/lib/experiments/workflow-canvas/run-machine";
import {
  COMPLETE_STEPS_TO_RUN,
  RUN_AGAIN_LABEL,
  humanizeIssue,
  staleHint,
} from "@/lib/experiments/workflow-canvas/stale";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

type RunNodeFooterProps = {
  output?: string;
  /** Frozen value when the step is done */
  elapsedMs?: number;
  /** Keep a live clock while running or awaiting */
  ticking?: boolean;
  startedAt?: number | null;
  waitingSince?: number | null;
  /** Set when this step's output was produced before a later edit. */
  staleReason?: StaleReason;
  onRunAgain?: () => void;
  runAgainDisabled?: boolean;
};

export function RunNodeFooter({
  output,
  elapsedMs,
  ticking = false,
  startedAt = null,
  waitingSince = null,
  staleReason,
  onRunAgain,
  runAgainDisabled = false,
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
  if (!output && !showElapsed && !showWaitingSince && !staleReason) {
    return null;
  }

  const displayMs = ticking ? liveMs : (elapsedMs ?? 0);
  const hint = staleReason ? humanizeIssue(staleHint(staleReason)) : null;

  return (
    <div
      className="animate-output-in border-t"
      data-stale={staleReason ? "true" : undefined}
      style={{
        borderColor: color.border,
        paddingInline: 16,
        paddingBlock: 10,
      }}
    >
      {output || showElapsed || showWaitingSince ? (
        <div className="flex items-baseline justify-between gap-3">
          {output ? (
            <p
              className="min-w-0 text-[11px] leading-[1.4]"
              style={{ color: staleReason ? color.faint : color.muted }}
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
      ) : null}
      {hint ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 ${
            output || showElapsed || showWaitingSince ? "mt-2" : ""
          }`}
        >
          <p
            className="min-w-0 text-[12px] leading-[1.4]"
            style={{ color: color.muted }}
          >
            {hint}
          </p>
          {onRunAgain ? (
            <span
              className="inline-flex"
              title={runAgainDisabled ? COMPLETE_STEPS_TO_RUN : undefined}
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="focus-ring h-7 shrink-0 rounded-[6px] px-2.5 text-[12px] font-medium shadow-none focus-visible:ring-0"
                style={{ background: color.field, color: color.ink }}
                disabled={runAgainDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  if (runAgainDisabled) {
                    return;
                  }
                  onRunAgain();
                }}
              >
                {RUN_AGAIN_LABEL}
              </Button>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
