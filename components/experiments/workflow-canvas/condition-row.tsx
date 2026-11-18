"use client";

import type { HTMLAttributes } from "react";
import { X } from "lucide-react";

import { FieldInput, SelectChip } from "./field-select";
import { cn } from "@/lib/utils";
import {
  getField,
  getFieldsForSource,
  getOperatorLabel,
  getSourceLabel,
  getValueLabel,
  OPERATORS,
  SOURCES,
} from "@/lib/experiments/workflow-canvas/data";
import {
  clearConditionSlot,
  type ConditionRow,
  type ConditionSlot,
  type Conjunction,
} from "@/lib/experiments/workflow-canvas/types";
import { color, tokenStyle } from "@/lib/experiments/workflow-canvas/tokens";

type HandleProps = HTMLAttributes<HTMLButtonElement> & {
  ref: (element: HTMLButtonElement | null) => void;
};

type ConditionRowItemProps = {
  row: ConditionRow;
  index: number;
  conjunction: Conjunction;
  isDragging: boolean;
  openId: string | null;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  handleProps: HandleProps;
  onConjunctionChange: () => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onPatch: (patch: Partial<Omit<ConditionRow, "id">>) => void;
  readOnly?: boolean;
  hideEditChrome?: boolean;
};

export function ConditionRowItem({
  row,
  index,
  conjunction,
  isDragging,
  openId,
  onToggleMenu,
  onCloseMenu,
  handleProps,
  onConjunctionChange,
  onMove,
  onDelete,
  onPatch,
  readOnly = false,
  hideEditChrome = false,
}: ConditionRowItemProps) {
  const { ref: handleRef, ...handleRest } = handleProps;
  const fields = getFieldsForSource(row.source);
  const field = getField(row.source, row.field);
  const hideValue = row.operator === "is empty";
  const clearSlot = (slot: ConditionSlot) => {
    onCloseMenu();
    onPatch(clearConditionSlot(slot));
  };
  const clearName = (slot: ConditionSlot) =>
    `Clear ${slot} for condition row ${index + 1}`;

  return (
    <div
      className={cn(
        "group/row relative flex w-full min-w-0 flex-wrap items-center gap-x-[5px] gap-y-1.5 rounded-[8px] py-0.5",
        isDragging && "shadow-raised",
      )}
      style={isDragging ? { background: color.surface } : undefined}
    >
      <button
        type="button"
        ref={handleRef}
        aria-label={`Reorder condition row ${index + 1}`}
        tabIndex={hideEditChrome ? -1 : 0}
        className={cn(
          "row-chrome focus-ring-icon absolute top-1 -left-4 z-10 flex size-6 items-center justify-center rounded-[6px] bg-surface outline-none transition-opacity",
          hideEditChrome
            ? "pointer-events-none opacity-0"
            : "pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
        )}
        style={{ color: color.faint }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onMove("up");
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            onMove("down");
          }
        }}
        {...handleRest}
      >
        <Handle />
      </button>

      {index === 0 ? (
        <span
          className="w-7 shrink-0 text-[12px] leading-[1.4]"
          style={{ color: color.muted }}
        >
          If
        </span>
      ) : (
        <button
          type="button"
          data-ui
          aria-label={`Conjunction, currently ${conjunction}. Toggle and or or for this node.`}
          className="focus-ring-icon h-6 w-7 shrink-0 rounded-[6px] text-[12px] leading-[1.4] outline-none"
          style={{
            background: color.field,
            color: color.muted,
          }}
          onClick={(event) => {
            event.stopPropagation();
            onConjunctionChange();
          }}
        >
          {conjunction}
        </button>
      )}

      <SelectChip
        label="Source"
        placeholder="source"
        value={row.source}
        displayValue={getSourceLabel(row.source)}
        items={SOURCES.map((item) => ({ id: item.id, name: item.label }))}
        open={openId === `${row.id}-source`}
        onToggle={() => onToggleMenu(`${row.id}-source`)}
        onPick={(id) => {
          onPatch({ source: id });
          onCloseMenu();
        }}
        readOnly={readOnly}
      />

      <SelectChip
        label="Field"
        placeholder="field"
        value={row.field}
        displayValue={field?.label}
        items={fields.map((item) => ({ id: item.id, name: item.label }))}
        disabled={!row.source}
        open={openId === `${row.id}-field`}
        onToggle={() => onToggleMenu(`${row.id}-field`)}
        onPick={(id) => {
          onPatch({ field: id });
          onCloseMenu();
        }}
        onClear={() => clearSlot("field")}
        clearName={clearName("field")}
        readOnly={readOnly}
      />

      <SelectChip
        label="Operator"
        placeholder="operator"
        value={row.operator}
        displayValue={getOperatorLabel(row.operator)}
        items={OPERATORS.map((item) => ({ id: item.id, name: item.label }))}
        disabled={!row.field}
        open={openId === `${row.id}-operator`}
        onToggle={() => onToggleMenu(`${row.id}-operator`)}
        onPick={(id) => {
          onPatch({ operator: id });
          onCloseMenu();
        }}
        onClear={() => clearSlot("operator")}
        clearName={clearName("operator")}
        readOnly={readOnly}
      />

      {!hideValue ? (
        field?.valueKind === "number" ? (
          <FieldInput
            label="Value"
            placeholder="value"
            type="number"
            value={row.value}
            onChange={(value) => onPatch({ value })}
            onClear={() => clearSlot("value")}
            clearName={clearName("value")}
            readOnly={readOnly}
          />
        ) : field?.valueKind === "text" ? (
          <FieldInput
            label="Value"
            placeholder="value"
            value={row.value}
            onChange={(value) => onPatch({ value })}
            onClear={() => clearSlot("value")}
            clearName={clearName("value")}
            readOnly={readOnly}
          />
        ) : (
          <SelectChip
            label="Value"
            placeholder="value"
            value={row.value}
            displayValue={getValueLabel(row.source, row.field, row.value)}
            items={(field?.values ?? []).map((item) => ({
              id: item.id,
              name: item.label,
              tag: item.tag,
            }))}
            disabled={!row.operator || !field}
            open={openId === `${row.id}-value`}
            onToggle={() => onToggleMenu(`${row.id}-value`)}
            onPick={(id) => {
              onPatch({ value: id });
              onCloseMenu();
            }}
            onClear={() => clearSlot("value")}
            clearName={clearName("value")}
            readOnly={readOnly}
          />
        )
      ) : null}

      <button
        type="button"
        aria-label={`Delete condition row ${index + 1}`}
        tabIndex={hideEditChrome ? -1 : 0}
        className={cn(
          "row-chrome focus-ring-icon absolute top-1 -right-4 z-10 flex size-6 items-center justify-center rounded-[6px] bg-surface outline-none transition-opacity",
          hideEditChrome
            ? "pointer-events-none opacity-0"
            : "pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
        )}
        style={{ color: color.faint }}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <DeleteGlyph />
      </button>
    </div>
  );
}

function Handle() {
  return (
    <svg
      width="10"
      height="16"
      viewBox="0 0 10 16"
      className="shrink-0"
      aria-hidden
    >
      {[3, 8, 13].flatMap((y) => [
        <circle key={`l${y}`} cx="3" cy={y} r="1.1" fill="currentColor" />,
        <circle key={`r${y}`} cx="7.5" cy={y} r="1.1" fill="currentColor" />,
      ])}
    </svg>
  );
}

function DeleteGlyph() {
  return (
    <X
      size={tokenStyle.chromeIcon.size}
      strokeWidth={tokenStyle.chromeIcon.stroke}
      aria-hidden
    />
  );
}
