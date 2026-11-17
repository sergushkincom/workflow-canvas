"use client";

import { useEffect, useRef } from "react";

import { NODE_TYPES } from "@/lib/experiments/workflow-canvas/node-types";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

export function TriggerPicker({
  onChoose,
  onClose,
}: {
  onChoose: (nodeTypeId: string) => void;
  onClose: () => void;
}) {
  const triggers = NODE_TYPES.filter((nodeType) => nodeType.group === "Triggers");
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const first = listRef.current?.querySelector("button");
    if (first instanceof HTMLButtonElement) {
      first.focus();
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function move(current: HTMLButtonElement, direction: 1 | -1) {
    const buttons = [
      ...(listRef.current?.querySelectorAll("button") ?? []),
    ];
    const index = buttons.indexOf(current);
    const next = buttons[index + direction];
    next?.focus();
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Choose a trigger"
      data-trigger-picker=""
      className="w-full max-w-sm rounded-[12px] p-3"
      style={{
        background: color.surface,
        border: `1px solid ${color.border}`,
        boxShadow: "var(--shadow-raised)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2
          className="text-[13px] font-semibold leading-tight"
          style={{ color: color.ink }}
        >
          Choose a trigger
        </h2>
        <button
          type="button"
          className={`rounded-[6px] px-2 py-1 text-[12px] font-medium ${focusRing}`}
          style={{ color: color.muted }}
          aria-label="Close trigger picker"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <ul ref={listRef} className="flex flex-col gap-1">
        {triggers.map((trigger) => (
          <li key={trigger.id}>
            <button
              type="button"
              className={`flex w-full flex-col rounded-[8px] px-2.5 py-2 text-left hover:bg-field ${focusRing}`}
              onClick={() => onChoose(trigger.id)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  move(event.currentTarget, 1);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  move(event.currentTarget, -1);
                }
              }}
            >
              <span
                className="text-[13px] font-medium leading-tight"
                style={{ color: color.ink }}
              >
                {trigger.title}
              </span>
              <span
                className="mt-0.5 text-[12px] leading-snug"
                style={{ color: color.muted }}
              >
                {trigger.subtitle}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
