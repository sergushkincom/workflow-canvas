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
import {
  BUILD_HELPER_DESCRIPTION,
  BUILD_HELPER_LABEL,
} from "@/lib/experiments/workflow-canvas/build-helper";
import {
  COMPLETE_STEPS_TO_RUN,
  RUN_AGAIN_LABEL,
  humanizeIssue,
} from "@/lib/experiments/workflow-canvas/stale";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

type TopBarProps = {
  title: string;
  stepCount: number;
  incompleteCount: number;
  runPhase: RunPhase;
  totalMs?: number;
  onTestRun: () => void;
  onStop: () => void;
  /** A finished run whose output no longer matches the current steps. */
  resultsStale?: boolean;
  onOpenTemplates?: () => void;
  onCopyLink?: () => void;
  helperOpen?: boolean;
  onToggleHelper?: () => void;
};

export function TopBar({
  title,
  stepCount,
  incompleteCount,
  runPhase,
  totalMs,
  onTestRun,
  onStop,
  resultsStale = false,
  onOpenTemplates,
  onCopyLink,
  helperOpen = false,
  onToggleHelper,
}: TopBarProps) {
  const stepLabel = stepCount === 1 ? "1 step" : `${stepCount} steps`;
  const summary =
    incompleteCount > 0
      ? `${stepLabel} · ${incompleteCount} incomplete`
      : stepLabel;

  const doneStale = resultsStale && runPhase === "done";
  const showStop = runPhase !== "idle";
  const showTestRun = runPhase === "idle";
  const runDisabled = incompleteCount > 0;

  const runButton = (label: string, onClick: () => void, disabled: boolean) => (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="focus-ring h-7 shrink-0 rounded-[6px] px-2.5 text-[12px] font-medium shadow-none focus-visible:ring-0"
      style={{ background: color.field, color: color.ink }}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  const blocker = humanizeIssue(COMPLETE_STEPS_TO_RUN);

  return (
    <header
      className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-1.5 sm:px-6"
      style={{ borderColor: color.border, background: color.surface }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1
          id="workflow-title"
          tabIndex={-1}
          className="truncate text-[13px] font-semibold leading-tight outline-none"
          style={{ color: color.ink }}
        >
          {title}
        </h1>
        <span
          className="inline-flex h-7 shrink-0 items-center rounded-[6px] px-2 text-[11px] font-medium"
          style={{ background: color.field, color: color.muted }}
        >
          Draft
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onToggleHelper ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 rounded-[6px] px-2.5 text-[12px] font-medium shadow-none"
            style={{ background: color.field, color: color.ink }}
            aria-expanded={helperOpen}
            aria-controls="build-helper"
            aria-describedby="build-helper-desc"
            title={BUILD_HELPER_DESCRIPTION}
            onClick={onToggleHelper}
          >
            {BUILD_HELPER_LABEL}
          </Button>
        ) : null}
        <span id="build-helper-desc" className="sr-only">
          {BUILD_HELPER_DESCRIPTION}
        </span>
        {onOpenTemplates ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 rounded-[6px] px-2.5 text-[12px] font-medium shadow-none"
            style={{ background: color.field, color: color.ink }}
            aria-haspopup="dialog"
            onClick={onOpenTemplates}
          >
            Templates
          </Button>
        ) : null}
        {onCopyLink ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 shrink-0 rounded-[6px] px-2.5 text-[12px] font-medium shadow-none"
            style={{ background: color.field, color: color.ink }}
            onClick={onCopyLink}
          >
            Copy link
          </Button>
        ) : null}
        {doneStale ? (
          runDisabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  {runButton(RUN_AGAIN_LABEL, onTestRun, true)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{blocker}</TooltipContent>
            </Tooltip>
          ) : (
            runButton(RUN_AGAIN_LABEL, onTestRun, false)
          )
        ) : null}
        {showStop ? runButton("Stop", onStop, false) : null}
        {showTestRun ? (
          runDisabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  {runButton("Test run", onTestRun, true)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{blocker}</TooltipContent>
            </Tooltip>
          ) : (
            runButton("Test run", onTestRun, false)
          )
        ) : null}
        <p
          className="inline-flex h-7 shrink-0 items-center rounded-[6px] px-2 text-[12px] font-medium"
          style={{ background: color.field, color: color.muted }}
        >
          {doneStale
            ? incompleteCount > 0
              ? `Step changed · ${incompleteCount} incomplete`
              : "Step changed · run again"
            : runPhase === "done" && totalMs !== undefined
              ? `Run complete · ${formatElapsed(totalMs)}`
              : summary}
        </p>
      </div>
    </header>
  );
}
