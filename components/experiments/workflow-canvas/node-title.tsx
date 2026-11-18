"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";
import { color, ring } from "@/lib/experiments/workflow-canvas/tokens";

export type NodeTitleHandle = {
  startRename: () => void;
};

type NodeTitleProps = {
  ref?: Ref<NodeTitleHandle>;
  displayName: string;
  defaultName: string;
  selected: boolean;
  readOnly?: boolean;
  onRename: (name: string) => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * In-place node name. A click selects the card; a click on the title of an
 * already selected card, a double-click, or F2 opens the editor. Enter and
 * blur save, Escape cancels, and an empty name falls back to the default.
 */
export function NodeTitle({
  ref,
  displayName,
  defaultName,
  selected,
  readOnly = false,
  onRename,
}: NodeTitleProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const closedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (readOnly && draft !== null) {
    setDraft(null);
  }

  const begin = useCallback(() => {
    if (readOnly || draftRef.current !== null) {
      return;
    }
    closedRef.current = false;
    draftRef.current = displayName;
    setDraft(displayName);
  }, [displayName, readOnly]);

  const close = useCallback(
    (save: boolean, restoreFocus = false) => {
      if (closedRef.current) {
        return;
      }
      if (readOnly || draftRef.current === null) {
        closedRef.current = true;
        draftRef.current = null;
        setDraft(null);
        return;
      }
      closedRef.current = true;
      const value = draftRef.current;
      const card = inputRef.current?.closest("[role='option']");
      draftRef.current = null;
      setDraft(null);
      if (save) {
        onRename(value);
      }
      if (restoreFocus && card instanceof HTMLElement) {
        queueMicrotask(() => card.focus());
      }
    },
    [onRename, readOnly],
  );

  useImperativeHandle(
    ref,
    () => ({
      startRename() {
        begin();
      },
    }),
    [begin],
  );

  useEffect(() => {
    if (!readOnly) {
      return;
    }
    closedRef.current = true;
    draftRef.current = null;
  }, [readOnly]);

  useEffect(() => {
    if (!selected || readOnly) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "F2" || event.repeat || event.defaultPrevented) {
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "[role='dialog'], [data-build-helper], [data-trigger-picker], [data-node-palette]",
        )
      ) {
        return;
      }
      event.preventDefault();
      begin();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [begin, readOnly, selected]);

  const editing = draft !== null;
  useEffect(() => {
    if (!editing) {
      return;
    }
    const input = inputRef.current;
    input?.focus();
    input?.select();
  }, [editing]);

  if (draft !== null) {
    return (
      <input
        ref={inputRef}
        data-node-title=""
        aria-label="Node name"
        value={draft}
        placeholder={defaultName}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        onChange={(event) => {
          draftRef.current = event.target.value;
          setDraft(event.target.value);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.select();
        }}
        onBlur={() => close(true)}
        onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            close(true, true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            close(false, true);
          }
        }}
        className="box-border h-5 w-full min-w-0 rounded-[4px] px-1 text-[13px] font-semibold leading-tight outline-none placeholder:text-[color:var(--ink-3)]"
        style={{
          color: color.ink,
          background: color.field,
          boxShadow: `0 0 0 ${ring.width}px ${ring.color}`,
        }}
      />
    );
  }

  return (
    <button
      type="button"
      tabIndex={-1}
      data-node-title=""
      title={readOnly ? undefined : "Rename"}
      className={cn(
        "block w-full truncate bg-transparent p-0 text-left text-[13px] font-semibold leading-tight outline-none",
        !readOnly && selected && "cursor-text",
      )}
      style={{ color: color.ink }}
      onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => {
        if (readOnly || !selected) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        if (readOnly || !selected) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        begin();
      }}
      onDoubleClick={(event) => {
        if (readOnly) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        begin();
      }}
    >
      {displayName}
    </button>
  );
}
