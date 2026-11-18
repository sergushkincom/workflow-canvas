"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  color,
  ring,
  tokenStyle,
} from "@/lib/experiments/workflow-canvas/tokens";

type MenuItem = { id: string; name: string; tag?: string };

function Chevron() {
  return (
    <ChevronDown
      size={12}
      strokeWidth={tokenStyle.chromeIcon.stroke}
      className="shrink-0"
      style={{ color: color.faint }}
      aria-hidden
    />
  );
}

function CheckIcon() {
  return (
    <Check
      size={tokenStyle.chromeIcon.size}
      strokeWidth={tokenStyle.chromeIcon.stroke}
      aria-hidden
    />
  );
}

type SelectChipProps = {
  label: string;
  placeholder: string;
  value?: string;
  displayValue?: string;
  items: MenuItem[];
  disabled?: boolean;
  open: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
  onClear?: () => void;
  clearName?: string;
  readOnly?: boolean;
};

function ClearControl({
  name,
  onClear,
}: {
  name: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={name}
      className="focus-ring inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-[6px] bg-field px-2 text-[12px] font-medium text-ink outline-none hover:bg-hover-2"
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClear();
      }}
    >
      Clear
    </button>
  );
}

export function SelectChip({
  label,
  placeholder,
  value,
  displayValue,
  items,
  disabled = false,
  open,
  onToggle,
  onPick,
  onClear,
  clearName,
  readOnly = false,
}: SelectChipProps) {
  const listId = useId();
  const isSet = Boolean(value);
  const locked = disabled || readOnly;
  const showClear = Boolean(onClear) && isSet && !readOnly;

  return (
    <div className="inline-flex min-w-0 items-center gap-1">
      <Popover
        open={open && !locked}
        onOpenChange={(next) => {
          if (locked) {
            return;
          }
          if (next !== open) {
            onToggle();
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={label}
            disabled={locked}
            onClick={(event) => {
              event.stopPropagation();
            }}
            className={cn(
              "focus-ring inline-flex h-7 min-w-[5.5rem] max-w-[9rem] shrink-0 items-center justify-between gap-1.5 rounded-[8px] px-2.5 text-left text-[13px] leading-tight outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
            style={{
              background: color.surface,
              color: isSet ? color.ink : color.faint,
              borderWidth: 1,
              borderStyle: isSet ? "solid" : "dashed",
              borderColor: isSet ? color.border : color.dashed,
              boxShadow: open
                ? `0 0 0 ${ring.width}px ${ring.color}`
                : undefined,
            }}
          >
            <span className="truncate">{displayValue ?? placeholder}</span>
            <Chevron />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={listId}
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={12}
          avoidCollisions
          className="w-56 rounded-[12px] border bg-surface p-1 shadow-raised data-[state=closed]:animate-none data-[state=open]:animate-none"
          style={{
            borderColor: color.border,
            animation: "popover-in 80ms ease-out",
            boxShadow: "var(--shadow-raised)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-56 overflow-y-auto">
            {items.map((item) => {
              const selected = item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[13px]"
                  style={{ color: color.ink }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = color.field;
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "transparent";
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPick(item.id);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.name}
                  </span>
                  {item.tag ? (
                    <span
                      className="shrink-0 text-[11px]"
                      style={{ color: color.faint }}
                    >
                      {item.tag}
                    </span>
                  ) : null}
                  <span className={cn("shrink-0", selected ? "" : "invisible")}>
                    <CheckIcon />
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {showClear && onClear ? (
        <ClearControl name={clearName ?? `Clear ${label}`} onClear={onClear} />
      ) : null}
    </div>
  );
}

type FieldInputProps = {
  label: string;
  placeholder: string;
  value?: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
  onClear?: () => void;
  clearName?: string;
  readOnly?: boolean;
};

export function FieldInput({
  label,
  placeholder,
  value,
  type = "text",
  onChange,
  onClear,
  clearName,
  readOnly = false,
}: FieldInputProps) {
  const isSet = Boolean(value);
  const showClear = Boolean(onClear) && isSet && !readOnly;

  return (
    <div className="inline-flex min-w-0 items-center gap-1">
      <input
        type={type}
        aria-label={label}
        placeholder={placeholder}
        value={value ?? ""}
        readOnly={readOnly}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        inputMode={type === "number" ? "decimal" : "text"}
        className="focus-ring h-7 min-w-[5.5rem] max-w-[9rem] shrink-0 rounded-[8px] px-2.5 text-[13px] leading-tight outline-none read-only:cursor-default placeholder:text-[color:var(--ink-3)]"
        style={{
          background: color.surface,
          color: isSet ? color.ink : color.faint,
          borderWidth: 1,
          borderStyle: isSet ? "solid" : "dashed",
          borderColor: isSet ? color.border : color.dashed,
        }}
      />
      {showClear && onClear ? (
        <ClearControl name={clearName ?? `Clear ${label}`} onClear={onClear} />
      ) : null}
    </div>
  );
}

export function useChipMenu() {
  const [openId, setOpenId] = useState<string | null>(null);

  return {
    openId,
    toggle: (id: string) =>
      setOpenId((current) => (current === id ? null : id)),
    close: () => setOpenId(null),
  };
}
