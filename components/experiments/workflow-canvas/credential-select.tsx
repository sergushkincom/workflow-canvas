"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, Mail } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CONNECT_ANOTHER_ACCOUNT,
  CONNECT_ANOTHER_NOTE,
  MOCK_CREDENTIALS,
  findCredential,
  formatCredential,
  type MockCredential,
} from "@/lib/experiments/workflow-canvas/credentials";
import {
  color,
  ring,
  tokenStyle,
  typeTint,
} from "@/lib/experiments/workflow-canvas/tokens";

export function CredentialServiceIcon({ size = 16 }: { size?: number }) {
  const tint = typeTint.neutral;
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: 6,
        background: tint.tint,
        color: tint.ink,
      }}
      aria-hidden
    >
      <Mail size={size} strokeWidth={tokenStyle.iconTile.stroke} />
    </span>
  );
}

type CredentialSelectProps = {
  credentialId?: string;
  disabled?: boolean;
  onSelect: (credentialId: string) => void;
};

export function CredentialSelect({
  credentialId,
  disabled = false,
  onSelect,
}: CredentialSelectProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const noteId = useId();
  const selected = findCredential(credentialId);
  const label = selected ? formatCredential(selected) : "Choose an account";

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(next) => {
        if (!disabled) {
          setOpen(next);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Account"
          disabled={disabled}
          title={selected ? label : undefined}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "focus-ring flex h-8 w-full min-w-0 items-center gap-2 rounded-[8px] px-2 text-left text-[13px] leading-tight outline-none",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          style={{
            background: color.surface,
            color: selected ? color.ink : color.faint,
            borderWidth: 1,
            borderStyle: selected ? "solid" : "dashed",
            borderColor: selected ? color.border : color.dashed,
            boxShadow: open
              ? `0 0 0 ${ring.width}px ${ring.color}`
              : undefined,
          }}
        >
          <CredentialServiceIcon size={14} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown
            size={12}
            strokeWidth={tokenStyle.chromeIcon.stroke}
            className="shrink-0"
            style={{ color: color.faint }}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        avoidCollisions
        className="w-max min-w-[320px] rounded-[12px] border bg-surface p-1 shadow-raised data-[state=closed]:animate-none data-[state=open]:animate-none"
        style={{
          borderColor: color.border,
          animation: "popover-in 80ms ease-out",
          boxShadow: "var(--shadow-raised)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div id={listId} role="listbox" aria-label="Gmail accounts">
          {MOCK_CREDENTIALS.map((credential) => (
            <CredentialOption
              key={credential.id}
              credential={credential}
              selected={credential.id === credentialId}
              onPick={() => {
                onSelect(credential.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
        <div
          className="mt-1 border-t p-1"
          style={{ borderColor: color.border }}
        >
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-describedby={noteId}
            className="flex w-full cursor-not-allowed flex-col items-start gap-0.5 rounded-[6px] px-2 py-1.5 text-left"
            style={{ color: color.faint }}
          >
            <span className="text-[13px] font-medium">
              {CONNECT_ANOTHER_ACCOUNT}
            </span>
            <span id={noteId} className="text-[12px] leading-[1.4]">
              {CONNECT_ANOTHER_NOTE}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CredentialOption({
  credential,
  selected,
  onPick,
}: {
  credential: MockCredential;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className="flex h-8 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[13px] whitespace-nowrap"
      style={{ color: color.ink }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = color.field;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
      }}
      onClick={(event) => {
        event.stopPropagation();
        onPick();
      }}
    >
      <CredentialServiceIcon size={14} />
      <span className="min-w-0 flex-1 font-medium">
        {formatCredential(credential)}
      </span>
      <Check
        size={tokenStyle.chromeIcon.size}
        strokeWidth={tokenStyle.chromeIcon.stroke}
        className={selected ? "" : "invisible"}
        aria-hidden
      />
    </button>
  );
}
