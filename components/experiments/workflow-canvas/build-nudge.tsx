"use client";

import { NUDGE_MESSAGE } from "@/lib/experiments/workflow-canvas/build-helper";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

export function BuildNudge({
  onHelp,
  onDismiss,
}: {
  onHelp: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-label={NUDGE_MESSAGE}
      className="flex w-full max-w-xl flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center"
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        boxShadow: "var(--shadow-raised)",
      }}
    >
      <p
        className="min-w-0 flex-1 text-[13px] leading-snug"
        style={{ color: color.ink }}
      >
        {NUDGE_MESSAGE}
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          className={`h-8 rounded-[8px] px-2.5 text-[12.5px] font-medium text-[var(--surface)] ${focusRing}`}
          style={{ background: "var(--accent)" }}
          onClick={onHelp}
        >
          Set up a trigger
        </button>
        <button
          type="button"
          className={`h-8 rounded-[8px] px-2.5 text-[12.5px] font-medium ${focusRing}`}
          style={{ color: color.ink, background: color.field }}
          aria-label="Dismiss helper suggestion"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
