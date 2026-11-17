"use client";

import { SAMPLE_TICKET } from "@/lib/experiments/workflow-canvas/data";
import { color, NODE_WIDTH } from "@/lib/experiments/workflow-canvas/tokens";

export function SampleTicketCard() {
  return (
    <div
      className="animate-ticket-in mb-0 rounded-[12px] shadow-card"
      style={{
        width: NODE_WIDTH,
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
        className="mt-1 text-[12px] leading-[1.4]"
        style={{ color: color.muted }}
      >
        {SAMPLE_TICKET.channelLabel} · {SAMPLE_TICKET.customerName} ·{" "}
        {SAMPLE_TICKET.planLabel} · {SAMPLE_TICKET.regionLabel}
      </p>
    </div>
  );
}
