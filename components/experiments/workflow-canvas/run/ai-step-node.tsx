"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DecisionPanel, type DecisionLabel } from "./decision-panel";
import { NodeShell } from "../node-shell";
import { RunNodeFooter } from "./run-node-footer";
import {
  CLASSIFY_STEP_ID,
  formatClockTime,
  type NodeRunState,
} from "@/lib/experiments/workflow-canvas/run-machine";
import { classifyStreamDurationMs } from "@/lib/experiments/workflow-canvas/run-machine";
import { STILL_AFTER_MS } from "@/lib/experiments/workflow-canvas/run-timings";
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

type StillWait = {
  runStartedAt: number;
  since: number;
};

function stillAfterMs(): number {
  if (typeof window === "undefined") {
    return STILL_AFTER_MS;
  }
  const raw = new URLSearchParams(window.location.search).get("still");
  if (raw == null) {
    return STILL_AFTER_MS;
  }
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return STILL_AFTER_MS;
  }
  return seconds * 1000;
}

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
  const [stillWait, setStillWait] = useState<StillWait | null>(null);
  const still = awaiting && stillWait?.runStartedAt === startedAt;
  const ticking = running || (awaiting && !still);
  const liveRef = useRef(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!awaiting || startedAt == null) {
      return;
    }
    const waitStart = Date.now();
    const id = window.setTimeout(() => {
      setStillWait({ runStartedAt: startedAt, since: waitStart });
    }, stillAfterMs());
    return () => window.clearTimeout(id);
  }, [awaiting, startedAt]);

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
  const decisionElapsed = () =>
    startedAt != null ? Date.now() - startedAt : liveRef.current;

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
              className={`ml-auto size-[6px] rounded-full transition-opacity duration-700 ${
                still ? "opacity-100" : "animate-await-pulse"
              }`}
              style={{ background: accent }}
              aria-label={
                still && stillWait
                  ? `Waiting for your decision since ${formatClockTime(stillWait.since)}`
                  : "Awaiting decision"
              }
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
              onConfirm(label, decisionElapsed());
            }}
            onEscalate={() => {
              onEscalate(decisionElapsed());
            }}
          />
        ) : null}

        <RunNodeFooter
          output={output}
          elapsedMs={elapsedMs}
          ticking={ticking}
          startedAt={startedAt}
          waitingSince={still && stillWait ? stillWait.since : null}
        />
      </NodeShell>
      <span className="sr-only" data-step-id={CLASSIFY_STEP_ID} />
    </div>
  );
}
