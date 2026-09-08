"use client";

import { SAMPLE_TICKET } from "@/lib/experiments/workflow-canvas/data";
import { color, NODE_WIDTH } from "@/lib/experiments/workflow-canvas/tokens";

export function SampleTicketCard() {
  return (
    <div
      className="animate-ticket-in mb-0 rounded-[12px] border"
      style={{
        width: NODE_WIDTH,
        borderColor: color.border,
        background: color.surface,
        padding: 16,
      }}
    >
      <p
        className="text-[13px] font-semibold"
        style={{ color: color.ink }}
      >
        {SAMPLE_TICKET.subject}
      </p>
      <p
        className="mt-1 text-[12px] leading-snug"
        style={{ color: color.muted }}
      >
        {SAMPLE_TICKET.channelLabel} · {SAMPLE_TICKET.customerName} ·{" "}
        {SAMPLE_TICKET.planLabel} · {SAMPLE_TICKET.regionLabel}
      </p>
    </div>
  );
}
