"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Minus, X } from "lucide-react";

import {
  ASSISTANT_SUGGESTIONS,
  describeDraftRow,
  describeWhatThisChecks,
  draftTicketLine,
  draftsAlreadyPresent,
  matchAssistantPrompt,
  sampleTicketLine,
  uniqueDrafts,
  type AssistantMatch,
  type DraftRow,
} from "@/lib/experiments/workflow-canvas/assistant";
import { accent, accentHover, color } from "@/lib/experiments/workflow-canvas/tokens";
import type { ConditionNode, FlowAction } from "@/lib/experiments/workflow-canvas/types";

type ConditionAssistantPanelProps = {
  node: ConditionNode;
  minimized: boolean;
  narrow: boolean;
  dispatch: (action: FlowAction) => void;
  onClose: () => void;
  onMinimize: () => void;
};

export function ConditionAssistantPanel({
  node,
  minimized,
  narrow,
  dispatch,
  onClose,
  onMinimize,
}: ConditionAssistantPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [prompt, setPrompt] = useState("");
  const [match, setMatch] = useState<AssistantMatch | null>(null);
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!minimized) {
      inputRef.current?.focus();
    }
  }, [minimized, node.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (minimized) {
    return null;
  }

  const readBack = describeWhatThisChecks(node);
  const sampleLine = sampleTicketLine(node);
  const withDrafts = drafts && drafts.length > 0 ? draftTicketLine(node, drafts) : null;

  function applyPrompt(text: string) {
    setPrompt(text);
    setNotice(null);
    const next = matchAssistantPrompt(text);
    setMatch(next);
    setDrafts(next.kind === "draft" ? next.rows : null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyPrompt(prompt);
  }

  function addDrafts() {
    if (!drafts || drafts.length === 0) {
      return;
    }
    if (draftsAlreadyPresent(node.rows, drafts)) {
      setPrompt("");
      setNotice("This condition already checks that.");
      return;
    }
    const extra = uniqueDrafts(node.rows, drafts);
    dispatch({
      type: "appendRows",
      nodeId: node.id,
      rows: extra.map((row) => ({ ...row, id: crypto.randomUUID() })),
    });
    setPrompt("");
    setDrafts(null);
    setMatch(null);
    setNotice("Added by you.");
  }

  const body = (
    <div
      role="dialog"
      aria-label="Condition assistant"
      aria-modal={narrow}
      className="flex flex-col"
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        width: narrow ? "100%" : 340,
        borderRadius: narrow ? "12px 12px 0 0" : 12,
        boxShadow: "var(--shadow-raised)",
        maxHeight: narrow ? "min(72dvh, 560px)" : "min(70vh, 640px)",
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        className="flex items-center gap-2 border-b"
        style={{ borderColor: color.border, paddingInline: 16, paddingBlock: 12 }}
      >
        <h3
          className="min-w-0 flex-1 text-[13px] font-semibold leading-tight"
          style={{ color: color.ink }}
        >
          Condition assistant
        </h3>
        <HeaderIconButton label="Minimize" onClick={onMinimize}>
          <Minus size={14} strokeWidth={1.75} aria-hidden />
        </HeaderIconButton>
        <HeaderIconButton label="Close" onClick={onClose}>
          <X size={14} strokeWidth={1.75} aria-hidden />
        </HeaderIconButton>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        style={{ gap: 16, padding: 16 }}
      >
        <section className="flex flex-col" style={{ gap: 6 }}>
          <h4
            className="text-[12px] font-medium"
            style={{ color: color.muted }}
          >
            What this checks
          </h4>
          {readBack ? (
            <p className="text-[13px] leading-snug" style={{ color: color.ink }}>
              {readBack}
            </p>
          ) : (
            <p className="text-[13px] leading-snug" style={{ color: color.muted }}>
              No rows to read back yet.
            </p>
          )}
          {sampleLine ? (
            <p className="text-[13px] leading-snug" style={{ color: color.muted }}>
              {sampleLine}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col" style={{ gap: 8 }}>
          <h4
            className="text-[12px] font-medium"
            style={{ color: color.muted }}
          >
            Describe what this step should check
          </h4>
          <form onSubmit={onSubmit}>
            <label htmlFor={inputId} className="sr-only">
              Describe what this step should check
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyPrompt(event.currentTarget.value);
                }
              }}
              placeholder="Only VIP customers"
              className="h-[30px] w-full rounded-[8px] px-2.5 text-[13px] leading-tight outline-none placeholder:text-[color:var(--ink-3)]"
              style={{
                background: color.surface,
                color: color.ink,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: color.border,
              }}
              onFocus={(event) => {
                event.currentTarget.style.boxShadow = `0 0 0 2px ${accent}`;
              }}
              onBlur={(event) => {
                event.currentTarget.style.boxShadow = "";
              }}
            />
          </form>
          <div className="flex flex-wrap gap-1.5">
            {ASSISTANT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-[6px] px-2 py-1 text-[12px] leading-tight"
                style={{ background: color.field, color: color.ink }}
                onClick={() => applyPrompt(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        {match?.kind === "unsure" && !drafts ? (
          <section className="flex flex-col" style={{ gap: 8 }}>
            <p className="text-[13px] leading-snug" style={{ color: color.ink }}>
              {match.message}
            </p>
            {match.choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                className="rounded-[8px] px-2.5 py-2 text-left text-[13px] leading-snug"
                style={{ background: color.field, color: color.ink }}
                onClick={() => {
                  setDrafts(choice.rows.map((row) => ({ ...row })));
                  setNotice(null);
                }}
              >
                {choice.label}
              </button>
            ))}
          </section>
        ) : null}

        {match?.kind === "unknown" ? (
          <p className="text-[13px] leading-snug" style={{ color: color.ink }}>
            {match.message}
          </p>
        ) : null}

        {match?.kind === "draft" && drafts ? (
          <p className="text-[13px] leading-snug" style={{ color: color.ink }}>
            {match.message}
          </p>
        ) : null}

        {drafts && drafts.length > 0 ? (
          <ul className="flex flex-col" style={{ gap: 8 }}>
            {drafts.map((row, index) => (
              <li
                key={`${row.source}-${row.field}-${index}`}
                className="rounded-[8px] px-2.5 py-2 text-[13px] leading-snug"
                style={{
                  color: color.ink,
                  border: `1px dashed ${color.dashed}`,
                }}
              >
                {describeDraftRow(row)}
              </li>
            ))}
          </ul>
        ) : null}

        {notice && !(drafts && drafts.length > 0) ? (
          <p className="text-[13px] leading-snug" style={{ color: color.ink }}>
            {notice}
          </p>
        ) : null}
      </div>

      {drafts && drafts.length > 0 ? (
        <div
          className="flex shrink-0 flex-col border-t"
          style={{ borderColor: color.border, gap: 8, padding: 16 }}
        >
          <p className="text-[13px] leading-snug" style={{ color: color.muted }}>
            {withDrafts}
          </p>
          {notice ? (
            <p className="text-[13px] leading-snug" style={{ color: color.ink }}>
              {notice}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="h-8 rounded-[6px] px-3 text-[12px] font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
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
              onClick={addDrafts}
            >
              Add to condition
            </button>
            <button
              type="button"
              className="h-8 rounded-[6px] px-3 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
              style={
                {
                  color: color.muted,
                  ["--tw-ring-color" as string]: accent,
                } as CSSProperties
              }
              onClick={() => {
                setPrompt("");
                setDrafts(null);
                setMatch(null);
                setNotice(null);
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (narrow) {
    return (
      <div
        className="fixed inset-0 z-40 flex items-end"
        onClick={onClose}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `color-mix(in srgb, ${color.ink} 18%, transparent)`,
          }}
          aria-hidden
        />
        <div className="relative z-10 w-full">{body}</div>
      </div>
    );
  }

  return (
    <div
      className="absolute z-30"
      style={{
        left: "100%",
        marginLeft: 12,
        top: 24,
        width: 340,
      }}
    >
      {body}
    </div>
  );
}

function HeaderIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-6 shrink-0 items-center justify-center rounded-[6px]"
      style={{ color: color.muted }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
