"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatElapsed,
  type RunPhase,
} from "@/lib/experiments/workflow-canvas/run-machine";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

type TopBarProps = {
  stepCount: number;
  incompleteCount: number;
  runPhase: RunPhase;
  totalMs?: number;
  onTestRun: () => void;
  onStop: () => void;
};

export function TopBar({
  stepCount,
  incompleteCount,
  runPhase,
  totalMs,
  onTestRun,
  onStop,
}: TopBarProps) {
  const stepLabel = stepCount === 1 ? "1 step" : `${stepCount} steps`;
  const summary =
    incompleteCount > 0
      ? `${stepLabel} · ${incompleteCount} incomplete`
      : stepLabel;

  const active = runPhase !== "idle";
  const runDisabled = incompleteCount > 0 && !active;

  const runButton = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-7 shrink-0 rounded-[6px] px-2.5 text-[12px] font-medium shadow-none"
      style={{ background: color.field, color: color.ink }}
      disabled={runDisabled}
      onClick={active ? onStop : onTestRun}
    >
      {active ? "Stop" : "Test run"}
    </Button>
  );

  return (
    <header
      className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-6"
      style={{ borderColor: color.border, background: color.surface }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1
          className="truncate text-[13px] font-semibold leading-tight"
          style={{ color: color.ink }}
        >
          Support triage
        </h1>
        <span
          className="inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[11.5px] font-medium"
          style={{ background: color.field, color: color.muted }}
        >
          Draft
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {runDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">{runButton}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Complete every step to run
            </TooltipContent>
          </Tooltip>
        ) : (
          runButton
        )}
        <p
          className="inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[12px] font-medium"
          style={{ background: color.field, color: color.muted }}
        >
          {runPhase === "done" && totalMs !== undefined
            ? `Run complete · ${formatElapsed(totalMs)}`
            : summary}
        </p>
      </div>
    </header>
  );
}
