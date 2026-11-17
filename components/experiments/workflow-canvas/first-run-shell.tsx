"use client";

import { useState, type RefObject } from "react";

import { AppSidebar, type ShellSection } from "./app-sidebar";
import { Button } from "@/components/ui/button";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

const QUIET: Record<
  Exclude<ShellSection, "home" | "workflows">,
  { title: string; body: string }
> = {
  executions: {
    title: "Executions",
    body: "Runs stay on the canvas in this prototype. Nothing is stored.",
  },
  credentials: {
    title: "Credentials",
    body: "Credentials are not part of this prototype.",
  },
  settings: {
    title: "Settings",
    body: "Settings are not part of this prototype.",
  },
};

type FirstRunShellProps = {
  section: ShellSection;
  modalOpen: boolean;
  addStepRef: RefObject<HTMLButtonElement | null>;
  onSection: (section: ShellSection) => void;
  onOpenTemplates: () => void;
  onStartBlank: () => void;
};

export function FirstRunShell({
  section,
  modalOpen,
  addStepRef,
  onSection,
  onOpenTemplates,
  onStartBlank,
}: FirstRunShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <AppSidebar
        section={section}
        modalOpen={modalOpen}
        onSection={onSection}
        onOpenTemplates={onOpenTemplates}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {section === "home" ? (
          <HomeCanvas
            addStepRef={addStepRef}
            onStartBlank={onStartBlank}
          />
        ) : null}
        {section === "workflows" ? (
          <WorkflowsEmpty onOpenTemplates={onOpenTemplates} />
        ) : null}
        {section !== "home" && section !== "workflows" ? (
          <QuietPanel
            title={QUIET[section].title}
            body={QUIET[section].body}
          />
        ) : null}
      </div>
    </div>
  );
}

function HomeCanvas({
  addStepRef,
  onStartBlank,
}: {
  addStepRef: RefObject<HTMLButtonElement | null>;
  onStartBlank: () => void;
}) {
  const [saveNote, setSaveNote] = useState<string | null>(null);

  return (
    <>
      <header
        className="flex h-14 shrink-0 items-center gap-2 border-b px-5"
        style={{ borderColor: color.border, background: color.surface }}
      >
        <nav
          aria-label="Workflow location"
          className="flex min-w-0 items-center gap-2 text-[14px]"
        >
          <span style={{ color: color.muted }}>Personal</span>
          <span aria-hidden style={{ color: color.muted }}>
            /
          </span>
          <h1
            className="truncate font-semibold"
            style={{ color: color.ink }}
          >
            Untitled workflow
          </h1>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {saveNote ? (
            <span
              role="status"
              className="text-[12px]"
              style={{ color: color.muted }}
            >
              Saved in this tab
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-[34px] rounded-[8px] border-[var(--line)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-ink shadow-none"
          >
            Test run
          </Button>
          <Button
            type="button"
            className="h-[34px] rounded-[8px] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-[var(--surface)] hover:bg-[var(--accent-hover)]"
            onClick={() =>
              setSaveNote(
                "Saved in this tab. This prototype does not store it anywhere else.",
              )
            }
          >
            Save
          </Button>
        </div>
      </header>
      <div className="canvas-dots relative min-h-0 flex-1">
        <button
          ref={addStepRef}
          type="button"
          className={`absolute top-[44%] left-1/2 grid h-[84px] w-[min(300px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[12px] border-[1.5px] border-dashed bg-transparent text-[13px] ${focusRing}`}
          style={{ borderColor: color.dashed, color: color.faint }}
          onClick={onStartBlank}
        >
          + Add first step
        </button>
      </div>
    </>
  );
}

function WorkflowsEmpty({
  onOpenTemplates,
}: {
  onOpenTemplates: () => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex h-14 shrink-0 items-center border-b px-5"
        style={{ borderColor: color.border, background: color.surface }}
      >
        <h1 className="text-[14px] font-semibold" style={{ color: color.ink }}>
          Workflows
        </h1>
      </header>
      <div className="canvas-dots flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p
          className="max-w-sm text-[13px] leading-snug"
          style={{ color: color.muted }}
        >
          No workflows yet. Pick a template or start from scratch.
        </p>
        <Button
          type="button"
          className="h-[34px] rounded-[8px] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-[var(--surface)] hover:bg-[var(--accent-hover)]"
          onClick={onOpenTemplates}
        >
          Create a workflow
        </Button>
      </div>
    </section>
  );
}

function QuietPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex h-14 shrink-0 items-center border-b px-5"
        style={{ borderColor: color.border, background: color.surface }}
      >
        <h1 className="text-[14px] font-semibold" style={{ color: color.ink }}>
          {title}
        </h1>
      </header>
      <div className="canvas-dots flex flex-1 items-center justify-center px-6">
        <p
          className="max-w-sm text-center text-[13px] leading-snug"
          style={{ color: color.muted }}
        >
          {body}
        </p>
      </div>
    </section>
  );
}
