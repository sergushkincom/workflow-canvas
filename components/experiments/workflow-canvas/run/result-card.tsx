"use client";

import { color, NODE_WIDTH } from "@/lib/experiments/workflow-canvas/tokens";

type ResultCardProps = {
  text: string;
  /** Calm note when the outcome was produced before a step changed. */
  note?: string;
};

export function ResultCard({ text, note }: ResultCardProps) {
  return (
    <div
      className="animate-result-in w-full max-w-none rounded-[12px] shadow-card"
      style={{
        width: NODE_WIDTH,
        maxWidth: "100%",
        background: color.surface,
        padding: 16,
        marginTop: 20,
      }}
    >
      <p className="text-[11px] font-medium tracking-[0.04em] uppercase" style={{ color: color.faint }}>
        Result
      </p>
      <p
        className="mt-1.5 text-[13px] font-semibold"
        data-stale={note ? "true" : undefined}
        style={{ color: note ? color.muted : color.ink }}
      >
        {text}
      </p>
      {note ? (
        <p
          className="mt-2 text-[12px] leading-[1.4]"
          style={{ color: color.muted }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
