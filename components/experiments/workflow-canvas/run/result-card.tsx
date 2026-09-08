"use client";

import { color, NODE_WIDTH } from "@/lib/experiments/workflow-canvas/tokens";

type ResultCardProps = {
  text: string;
};

export function ResultCard({ text }: ResultCardProps) {
  return (
    <div
      className="animate-result-in w-full max-w-none rounded-[12px] border"
      style={{
        width: NODE_WIDTH,
        maxWidth: "100%",
        borderColor: color.border,
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
        style={{ color: color.ink }}
      >
        {text}
      </p>
    </div>
  );
}
