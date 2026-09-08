"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DecisionPanel, type DecisionLabel } from "./decision-panel";
import { NodeShell } from "../node-shell";
import { RunNodeFooter } from "./run-node-footer";
import {
  CLASSIFY_STEP_ID,
  type NodeRunState,
} from "@/lib/experiments/workflow-canvas/run-machine";
import { classifyStreamDurationMs } from "@/lib/experiments/workflow-canvas/run-machine";
import {
  accent,
  color,
  NODE_WIDTH,
  tokenStyle,
  typeTint,
} from "@/lib/experiments/workflow-canvas/tokens";

type AiStepNodeProps = {
  state: NodeRunState;
  streamedText: string;
  output?: string;
  elapsedMs?: number;
  startedAt?: number | null;
  onConfirm: (label: DecisionLabel, elapsedMs: number) => void;
  onEscalate: (elapsedMs: number) => void;
};

export function AiStepNode({
  state,
  streamedText,
  output,
  elapsedMs,
  startedAt = null,
  onConfirm,
  onEscalate,
}: AiStepNodeProps) {
  const awaiting = state === "awaiting";
  const running = state === "running";
  const dimmed = state === "skipped";
  const ticking = running || awaiting;
  const liveRef = useRef(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!ticking || startedAt == null) {
      return;
    }
    const id = window.setInterval(() => {
      liveRef.current = Date.now() - startedAt;
      setTick((value) => value + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [ticking, startedAt]);

  const tint = typeTint.aiStep;

  return (
    <div
      className={`flex w-full flex-col items-center ${dimmed ? "opacity-40" : ""}`}
    >
      <NodeShell
        chip="AI step"
        tintKey="aiStep"
        selected={false}
        width={NODE_WIDTH}
        onSelect={() => {}}
        onResize={() => {}}
        readOnly
        dimmed={dimmed}
        running={running}
        runDurationMs={classifyStreamDurationMs()}
      >
        <div
          className="flex items-center gap-2.5 border-b"
          style={{ borderColor: color.border, padding: 16 }}
        >
          <span
            className="flex shrink-0 items-center justify-center"
            style={{
              width: tokenStyle.iconTile.size,
              height: tokenStyle.iconTile.size,
              borderRadius: tokenStyle.iconTile.radius,
              background: tint.tint,
              color: tint.ink,
            }}
          >
            <Sparkles
              size={tokenStyle.iconTile.icon}
              strokeWidth={tokenStyle.iconTile.stroke}
              aria-hidden
            />
          </span>
          <h2
            className="text-[13px] font-semibold leading-tight"
            style={{ color: color.ink }}
          >
            Classify intent
          </h2>
          {awaiting ? (
            <span
              className="animate-await-pulse ml-auto size-[6px] rounded-full"
              style={{ background: accent }}
              aria-label="Awaiting decision"
            />
          ) : null}
        </div>

        {streamedText ? (
          <p
            className="text-[13px] leading-snug"
            style={{ color: color.muted, paddingInline: 16, paddingBlock: 12 }}
          >
            {streamedText}
            {running ? (
              <span aria-hidden style={{ color: color.faint }}>
                ·
              </span>
            ) : null}
          </p>
        ) : running ? (
          <p
            className="text-[13px]"
            style={{ color: color.faint, paddingInline: 16, paddingBlock: 12 }}
          >
            Thinking…
          </p>
        ) : null}

        {awaiting ? (
          <DecisionPanel
            onConfirm={(label) => {
              const ms =
                liveRef.current ||
                (startedAt != null ? Date.now() - startedAt : 0);
              onConfirm(label, ms);
            }}
            onEscalate={() => {
              const ms =
                liveRef.current ||
                (startedAt != null ? Date.now() - startedAt : 0);
              onEscalate(ms);
            }}
          />
        ) : null}

        <RunNodeFooter
          output={output}
          elapsedMs={elapsedMs}
          ticking={ticking}
          startedAt={startedAt}
        />
      </NodeShell>
      <span className="sr-only" data-step-id={CLASSIFY_STEP_ID} />
    </div>
  );
}
