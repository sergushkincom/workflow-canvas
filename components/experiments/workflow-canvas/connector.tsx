"use client";

import { AddStepMenu } from "./add-step-menu";
import { color } from "@/lib/experiments/workflow-canvas/tokens";
import { cn } from "@/lib/utils";

type ConnectorProps = {
  showAdd?: boolean;
  onAddCondition?: () => void;
  hideAdd?: boolean;
};

export function Connector({
  showAdd = false,
  onAddCondition,
  hideAdd = false,
}: ConnectorProps) {
  return (
    <div
      className="group/connector relative flex w-full items-center justify-center"
      style={{ height: 48, marginBlock: 20 }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-1/2 h-full w-[1.25px] -translate-x-1/2"
        style={{ background: color.dashed }}
      />
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
