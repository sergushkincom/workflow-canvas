"use client";

import { useDroppable } from "@dnd-kit/core";
import { useId } from "react";

import { AddStepMenu } from "./add-step-menu";
import { cn } from "@/lib/utils";
import {
  accent,
  color,
  NODE_WIDTH,
} from "@/lib/experiments/workflow-canvas/tokens";

type ConnectorProps = {
  showAdd?: boolean;
  onAddCondition?: () => void;
  hideAdd?: boolean;
  dropId?: string;
  insertIndex?: number;
  insertion?: boolean;
};

export function Connector({
  showAdd = false,
  onAddCondition,
  hideAdd = false,
  dropId,
  insertIndex,
  insertion = false,
}: ConnectorProps) {
  const fallbackId = useId();
  const { setNodeRef } = useDroppable({
    id: dropId ?? fallbackId,
    disabled: dropId == null || insertIndex == null,
    data: { insertIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className="group/connector relative flex w-full items-center justify-center"
      style={{ height: 48, marginBlock: 20 }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-1/2 h-full w-[1.25px] -translate-x-1/2"
        style={{ background: color.dashed }}
      />
      {insertion ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center"
          style={{ width: NODE_WIDTH, maxWidth: "100%" }}
        >
          <span className="animate-insertion-in flex w-full items-center">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <span
              className="h-[2px] min-w-0 flex-1"
              style={{ background: accent }}
            />
          </span>
        </span>
      ) : null}
      {showAdd && onAddCondition ? (
        <div
          className={cn(
            "relative z-10 transition-opacity",
            hideAdd && "pointer-events-none opacity-0",
          )}
        >
          <AddStepMenu onAddCondition={onAddCondition} />
        </div>
      ) : null}
    </div>
  );
}
