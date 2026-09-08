"use client";

import { useId, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { accent, color } from "@/lib/experiments/workflow-canvas/tokens";

type MenuItem = { id: string; name: string; tag?: string };

function Chevron() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: color.faint }}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
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
  readOnly?: boolean;
};

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
  readOnly = false,
}: SelectChipProps) {
  const listId = useId();
  const isSet = Boolean(value);
  const locked = disabled || readOnly;

  return (
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
            "inline-flex h-[30px] min-w-[5.5rem] max-w-[9rem] shrink-0 items-center justify-between gap-1.5 rounded-[8px] px-2.5 text-left text-[13px] leading-tight outline-none",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          style={{
            background: color.surface,
            color: isSet ? color.ink : color.faint,
            borderWidth: 1,
            borderStyle: isSet ? "solid" : "dashed",
            borderColor: isSet ? color.border : color.dashed,
            boxShadow: open ? `0 0 0 2px ${accent}` : undefined,
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible")) {
              event.currentTarget.style.boxShadow = `0 0 0 2px ${accent}`;
            }
          }}
          onBlur={(event) => {
            event.currentTarget.style.boxShadow = open
              ? `0 0 0 2px ${accent}`
              : "";
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
        className="w-56 p-1 data-[state=closed]:animate-none data-[state=open]:animate-none"
        style={{
          borderColor: color.border,
          animation: "popover-in 80ms ease-out",
          boxShadow: `0 8px 24px -12px color-mix(in srgb, ${color.ink} 18%, transparent)`,
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
                className="flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-left text-[13px]"
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
  );
}

type FieldInputProps = {
  label: string;
  placeholder: string;
  value?: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
  readOnly?: boolean;
};

export function FieldInput({
  label,
  placeholder,
  value,
  type = "text",
  onChange,
  readOnly = false,
}: FieldInputProps) {
  const isSet = Boolean(value);

  return (
    <input
      type={type}
      aria-label={label}
      placeholder={placeholder}
      value={value ?? ""}
      readOnly={readOnly}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      inputMode={type === "number" ? "decimal" : "text"}
      className="h-[30px] min-w-[5.5rem] max-w-[9rem] shrink-0 rounded-[8px] px-2.5 text-[13px] leading-tight outline-none read-only:cursor-default placeholder:text-[color:var(--ink-3)]"
      style={{
        background: color.surface,
        color: isSet ? color.ink : color.faint,
        borderWidth: 1,
        borderStyle: isSet ? "solid" : "dashed",
        borderColor: isSet ? color.border : color.dashed,
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) {
          event.currentTarget.style.boxShadow = `0 0 0 2px ${accent}`;
        }
      }}
      onBlur={(event) => {
        event.currentTarget.style.boxShadow = "";
      }}
    />
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
