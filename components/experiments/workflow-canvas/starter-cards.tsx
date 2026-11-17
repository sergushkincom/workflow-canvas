"use client";

import {
  PREVIEW_LABEL,
  STARTER_CARDS,
  getTemplate,
  previewTint,
  templatePreview,
  type WorkflowTemplate,
} from "@/lib/experiments/workflow-canvas/templates";
import { color, typeTint } from "@/lib/experiments/workflow-canvas/tokens";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

export function StarterCards({
  onOpen,
}: {
  onOpen: (template: WorkflowTemplate, label: string) => void;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
      {STARTER_CARDS.map((card) => {
        const template = getTemplate(card.templateId);
        if (!template) {
          return null;
        }
        const descriptionId = `${card.templateId}-starter`;
        const kinds = templatePreview(template);
        return (
          <button
            key={card.templateId}
            type="button"
            aria-label={card.label}
            aria-describedby={descriptionId}
            className={`flex h-full flex-col gap-2 rounded-[12px] border p-3 text-left ${focusRing}`}
            style={{
              background: color.surface,
              borderColor: color.border,
              boxShadow: "var(--shadow-card)",
            }}
            onClick={() => onOpen(template, card.label)}
          >
            <span className="flex flex-wrap items-center gap-1" aria-hidden>
              {kinds.map((kind, index) => {
                const tint = typeTint[previewTint(kind)];
                return (
                  <span
                    key={`${kind}-${index}`}
                    className="inline-flex h-5 items-center rounded-[6px] px-1.5 text-[10px] font-semibold tracking-[0.04em] uppercase"
                    style={{ background: tint.tint, color: tint.ink }}
                  >
                    {PREVIEW_LABEL[kind]}
                  </span>
                );
              })}
            </span>
            <span
              className="text-[13.5px] leading-5 font-semibold"
              style={{ color: color.ink }}
            >
              {card.label}
            </span>
            <span
              id={descriptionId}
              className="text-[12px] leading-snug"
              style={{ color: color.muted }}
            >
              {template.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
