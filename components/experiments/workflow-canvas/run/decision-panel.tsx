"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { accent, accentHover, color } from "@/lib/experiments/workflow-canvas/tokens";
import { cn } from "@/lib/utils";

export type DecisionLabel = "Billing dispute" | "Integration issue";

type DecisionPanelProps = {
  onConfirm: (label: DecisionLabel) => void;
  onEscalate: () => void;
};

export function DecisionPanel({ onConfirm, onEscalate }: DecisionPanelProps) {
  const [choice, setChoice] = useState<DecisionLabel>("Billing dispute");

  useEffect(() => {
    document.getElementById("confirm-and-continue")?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-live="polite"
      aria-label="Classify intent decision"
      className="animate-decision-in flex flex-col gap-3 border-t"
      style={{
        borderColor: color.border,
        paddingInline: 16,
        paddingBlock: 12,
      }}
    >
      <div>
        <p
          className="text-[13px] font-medium"
          style={{ color: color.ink }}
        >
          62% confident
        </p>
        <div
          className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full"
          style={{ background: color.border }}
        >
          <div className="animate-confidence-fill h-full rounded-full" />
        </div>
      </div>

      <p
        className="text-[13px] leading-snug"
        style={{ color: color.muted }}
      >
        I can route this to Billing. But two other tickets from this customer
        this month were about a failed integration, and I can&apos;t tell if
        this is the same problem. I&apos;m not confident enough to decide
        alone.
      </p>

      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Proposed classification</legend>
        {(
          [
            "Billing dispute",
            "Integration issue",
          ] as const satisfies readonly DecisionLabel[]
        ).map((option) => (
          <label
            key={option}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px]",
            )}
            style={{
              color: color.ink,
              background: choice === option ? color.field : "transparent",
            }}
          >
            <input
              type="radio"
              name="classify-label"
              value={option}
              checked={choice === option}
              onChange={() => setChoice(option)}
              className="size-3.5"
              style={{ accentColor: accent }}
            />
            {option}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          id="confirm-and-continue"
          type="button"
          className="h-8 rounded-[6px] px-3 text-[12px] font-medium text-white outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-offset-0"
          style={
            {
              background: accent,
              ["--tw-ring-color" as string]: accent,
            } as CSSProperties
          }
          onMouseEnter={(event) => {
            event.currentTarget.style.background = accentHover;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = accent;
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onConfirm(choice);
          }}
        >
          Confirm and continue
        </button>
        <button
          type="button"
          className="h-8 rounded-[6px] bg-transparent px-3 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
          style={
            {
              color: color.muted,
              ["--tw-ring-color" as string]: accent,
            } as CSSProperties
          }
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEscalate();
          }}
        >
          Route to a human
        </button>
      </div>
    </div>
  );
}
