"use client";

import { useEffect, useState } from "react";

import {
  resultStreamPrefix,
  resultStreamWords,
} from "@/lib/experiments/workflow-canvas/result-stream";
import {
  RESULT_CARD_DELAY_MS,
  RESULT_WORD_MS,
} from "@/lib/experiments/workflow-canvas/run-timings";
import { color, NODE_WIDTH } from "@/lib/experiments/workflow-canvas/tokens";

type ResultCardProps = {
  text: string;
  /** Calm note when the outcome was produced before a step changed. */
  note?: string;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onChange() {
      setReduced(media.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function ResultSentence({ text, muted }: { text: string; muted: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) {
      return;
    }
    const words = resultStreamWords(text);
    if (words.length === 0) {
      return;
    }
    let current = 0;
    let interval = 0;
    const start = window.setTimeout(() => {
      const revealNext = () => {
        current += 1;
        setCount(current);
        if (current >= words.length) {
          window.clearInterval(interval);
        }
      };
      revealNext();
      if (current < words.length) {
        interval = window.setInterval(revealNext, RESULT_WORD_MS);
      }
    }, RESULT_CARD_DELAY_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [reduced, text]);

  const words = resultStreamWords(text);
  const writing = !reduced && words.length > 0 && count < words.length;
  const shown = reduced ? text : resultStreamPrefix(words, count);

  return (
    <p
      className="mt-1.5 text-[13px] font-semibold"
      data-stale={muted ? "true" : undefined}
      data-writing={writing ? "true" : "false"}
      aria-label={text}
      style={{ color: muted ? color.muted : color.ink }}
    >
      <span aria-hidden="true">
        {shown}
        {writing ? <span className="result-caret" /> : null}
      </span>
    </p>
  );
}

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
      <ResultSentence key={text} text={text} muted={Boolean(note)} />
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
