"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  BUILD_HELPER_DESCRIPTION,
  BUILD_HELPER_LABEL,
  BUILD_INTENTS,
  DEFAULT_APPLY_PERMISSION,
  appliedSummary,
  applyProposal,
  cloneFlow,
  proposeIntent,
  shouldAskPermission,
  type ApplyPermission,
  type BuildProposal,
  type HelperEvent,
} from "@/lib/experiments/workflow-canvas/build-helper";
import { color } from "@/lib/experiments/workflow-canvas/tokens";
import type { Flow } from "@/lib/experiments/workflow-canvas/types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

export type BuiltWorkflow = {
  name: string;
  flow: Flow;
  highlightedIds: string[];
  summary: string;
  undoFlow: Flow;
};

export function BuildHelperPanel({
  flow,
  alwaysAllow,
  onAlwaysAllow,
  onRecord,
  onApplied,
  onClose,
}: {
  flow: Flow;
  alwaysAllow: boolean;
  onAlwaysAllow: (value: boolean) => void;
  onRecord: (event: HelperEvent) => void;
  onApplied: (result: BuiltWorkflow) => void;
  onClose: () => void;
}) {
  const [proposal, setProposal] = useState<BuildProposal | null>(null);
  const firstIntentRef = useRef<HTMLButtonElement>(null);
  const allowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstIntentRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!proposal || proposal.note) {
      return;
    }
    allowRef.current?.focus();
  }, [proposal]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function commit(next: BuildProposal, permission: ApplyPermission) {
    const undoFlow = cloneFlow(flow);
    const applied = applyProposal(flow, next, () => crypto.randomUUID());
    if (permission === "session") {
      onAlwaysAllow(true);
    }
    onRecord({ type: "apply", intentId: next.intentId, permission });
    onApplied({
      name: next.intentLabel,
      flow: applied.flow,
      highlightedIds: applied.highlightedIds,
      summary: appliedSummary(next),
      undoFlow,
    });
    setProposal(null);
  }

  function chooseIntent(intentId: string) {
    const next = proposeIntent(flow, intentId);
    if (!next) {
      return;
    }
    onRecord({ type: "propose", intentId });
    const editable = next.changes.some((change) => change.kind !== "connect");
    if (editable && !shouldAskPermission(alwaysAllow)) {
      commit(next, "session");
      return;
    }
    setProposal(next);
  }

  function approve(permission: ApplyPermission) {
    if (!proposal || proposal.note) {
      return;
    }
    commit(proposal, permission);
  }

  function cancel() {
    if (proposal) {
      onRecord({ type: "cancel", intentId: proposal.intentId });
    }
    setProposal(null);
    firstIntentRef.current?.focus();
  }

  const asks =
    proposal != null &&
    proposal.note == null &&
    shouldAskPermission(alwaysAllow);

  return (
    <div
      id="build-helper"
      role="region"
      aria-label={BUILD_HELPER_LABEL}
      data-build-helper=""
      className="flex w-full max-w-[380px] flex-col gap-3 rounded-[12px] p-3"
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        boxShadow: "var(--shadow-raised)",
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2
            className="text-[13px] font-semibold leading-tight"
            style={{ color: color.ink }}
          >
            {BUILD_HELPER_LABEL}
          </h2>
          <p
            className="mt-1 text-[12px] leading-[1.4]"
            style={{ color: color.muted }}
          >
            {BUILD_HELPER_DESCRIPTION}
          </p>
        </div>
        <button
          type="button"
          className={`flex size-7 shrink-0 items-center justify-center rounded-[6px] hover:bg-field ${focusRing}`}
          style={{ color: color.faint }}
          aria-label="Close help"
          onClick={onClose}
        >
          <X size={14} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      <ul className="flex flex-col gap-1.5" aria-label="Ways to start">
        {BUILD_INTENTS.map((intent, index) => (
          <li key={intent.id}>
            <button
              ref={index === 0 ? firstIntentRef : undefined}
              type="button"
              className={`w-full rounded-[8px] px-2.5 py-2 text-left text-[13px] font-medium leading-[1.4] hover:bg-field ${focusRing}`}
              style={{
                color: color.ink,
                background: color.field,
              }}
              onClick={() => chooseIntent(intent.id)}
            >
              {intent.label}
            </button>
          </li>
        ))}
      </ul>

      {proposal?.note ? (
        <p className="text-[13px] leading-[1.4]" style={{ color: color.muted }}>
          {proposal.note}
        </p>
      ) : null}

      {asks && proposal ? (
        <div
          role="region"
          aria-label="Review changes"
          className="flex flex-col gap-3 rounded-[8px] p-3"
          style={{
            background: color.canvas,
            border: `1px solid ${color.border}`,
          }}
        >
          <h3
            className="text-[13px] font-semibold leading-tight"
            style={{ color: color.ink }}
          >
            Review changes
          </h3>
          <ul className="flex flex-col gap-1.5" aria-label="Proposed changes">
            {proposal.changes.map((change) => (
              <li
                key={change.line}
                className="text-[13px] leading-[1.4]"
                style={{ color: color.ink }}
              >
                {change.line}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5">
            <button
              ref={allowRef}
              type="button"
              data-default-permission={DEFAULT_APPLY_PERMISSION}
              aria-pressed="true"
              className={`h-8 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--surface)] ${focusRing}`}
              style={{ background: "var(--accent)" }}
              onClick={() => approve("once")}
            >
              Allow once
            </button>
            <button
              type="button"
              aria-pressed="false"
              className={`h-8 rounded-[8px] border px-2.5 text-[12px] font-medium ${focusRing}`}
              style={{
                borderColor: color.border,
                background: color.surface,
                color: color.ink,
              }}
              onClick={() => approve("session")}
            >
              Always allow this session
            </button>
            <button
              type="button"
              className={`h-8 rounded-[8px] px-2.5 text-[12px] font-medium ${focusRing}`}
              style={{ color: color.muted }}
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChangeSummary({
  summary,
  onUndo,
  onDismiss,
}: {
  summary: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-label="Change summary"
      className="flex w-full max-w-xl flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center"
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        boxShadow: "var(--shadow-raised)",
      }}
    >
      <p
        className="min-w-0 flex-1 text-[13px] leading-[1.4]"
        style={{ color: color.ink }}
      >
        {summary}
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          className={`h-8 rounded-[8px] px-2.5 text-[12px] font-medium text-[var(--surface)] ${focusRing}`}
          style={{ background: "var(--accent)" }}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className={`h-8 rounded-[8px] px-2.5 text-[12px] font-medium ${focusRing}`}
          style={{ color: color.ink, background: color.field }}
          aria-label="Dismiss change summary"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
