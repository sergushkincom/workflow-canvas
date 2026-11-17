"use client";

import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AddStepMenuProps = {
  onAddCondition: () => void;
};

export function AddStepMenu({ onAddCondition }: AddStepMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add step"
          title="Add step"
          className={cn(
            "focus-ring-icon group/add relative flex size-[22px] items-center justify-center rounded-full bg-surface text-ink-2 shadow-btn outline-none",
            "hover:bg-field",
          )}
        >
          <span className="relative block size-[10px]" aria-hidden>
            <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-ink-2" />
            <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-ink-2" />
          </span>
          {!open ? (
            <span className="pointer-events-none absolute left-[calc(100%+8px)] z-20 hidden whitespace-nowrap rounded-[6px] bg-ink px-2 py-1 text-[12px] text-surface group-hover/add:block group-focus-visible/add:block">
              Add step
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="right"
        className="w-52 rounded-[12px] border bg-surface p-1 shadow-raised data-[state=closed]:animate-none data-[state=open]:animate-none"
        style={{
          animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        <button
          type="button"
          className="focus-ring-icon flex w-full rounded-[6px] px-2 py-1.5 text-left text-[13px] leading-[1.4] font-medium text-ink outline-none hover:bg-hover"
          onClick={() => {
            onAddCondition();
            setOpen(false);
          }}
        >
          Condition (If / Else)
        </button>
        <Separator className="my-1 bg-[var(--line)]" />
        <DisabledItem label="Action" />
        <DisabledItem label="Delay" />
      </PopoverContent>
    </Popover>
  );
}

function DisabledItem({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex w-full cursor-not-allowed rounded-[6px] px-2 py-1.5 text-[13px] leading-[1.4] text-ink-3">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="border-0 bg-ink px-2 py-1 text-[12px] text-surface"
      >
        coming soon
      </TooltipContent>
    </Tooltip>
  );
}
