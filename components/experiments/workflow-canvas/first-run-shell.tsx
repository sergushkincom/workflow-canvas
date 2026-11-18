"use client";

import { useState, type RefObject } from "react";

import type { ShellSection } from "./app-sidebar";
import { BuildHelperPanel, type BuiltWorkflow } from "./build-helper-panel";
import { BuildNudge } from "./build-nudge";
import { useBuildSession } from "./build-session";
import { CredentialsPanel } from "./credentials-panel";
import { StarterCards } from "./starter-cards";
import { TriggerPicker } from "./trigger-picker";
import { useIdleNudge } from "./use-idle-nudge";
import { Button } from "@/components/ui/button";
import {
  BUILD_HELPER_DESCRIPTION,
  BUILD_HELPER_LABEL,
} from "@/lib/experiments/workflow-canvas/build-helper";
import type { NamedWorkflow } from "@/lib/experiments/workflow-canvas/credentials";
import {
  blankFlow,
  type WorkflowTemplate,
} from "@/lib/experiments/workflow-canvas/templates";
import { color } from "@/lib/experiments/workflow-canvas/tokens";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

const QUIET: Record<
  Exclude<ShellSection, "home" | "workflows" | "credentials">,
  { title: string; body: string }
> = {
  executions: {
    title: "Executions",
    body: "Runs stay on the canvas in this prototype. Nothing is stored.",
  },
  settings: {
    title: "Settings",
    body: "Settings are not part of this prototype.",
  },
};

type FirstRunShellProps = {
  section: ShellSection;
  addStepRef: RefObject<HTMLButtonElement | null>;
  nudgePaused: boolean;
  onOpenTemplates: () => void;
  onChooseTrigger: (nodeTypeId: string) => void;
  onOpenBuilt: (result: BuiltWorkflow) => void;
  onOpenTemplate: (template: WorkflowTemplate, label: string) => void;
  workflows: readonly NamedWorkflow[];
};

export function FirstRunShell({
  section,
  addStepRef,
  nudgePaused,
  onOpenTemplates,
  onChooseTrigger,
  onOpenBuilt,
  onOpenTemplate,
  workflows,
}: FirstRunShellProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {section === "home" ? (
        <HomeCanvas
          addStepRef={addStepRef}
          nudgePaused={nudgePaused}
          onOpenTemplates={onOpenTemplates}
          onChooseTrigger={onChooseTrigger}
          onOpenBuilt={onOpenBuilt}
          onOpenTemplate={onOpenTemplate}
        />
      ) : null}
      {section === "workflows" ? (
        <WorkflowsEmpty onOpenTemplates={onOpenTemplates} />
      ) : null}
      {section === "credentials" ? (
        <CredentialsPanel workflows={workflows} />
      ) : null}
      {section !== "home" &&
      section !== "workflows" &&
      section !== "credentials" ? (
        <QuietPanel title={QUIET[section].title} body={QUIET[section].body} />
      ) : null}
    </div>
  );
}

function HomeCanvas({
  addStepRef,
  nudgePaused,
  onOpenTemplates,
  onChooseTrigger,
  onOpenBuilt,
  onOpenTemplate,
}: {
  addStepRef: RefObject<HTMLButtonElement | null>;
  nudgePaused: boolean;
  onOpenTemplates: () => void;
  onChooseTrigger: (nodeTypeId: string) => void;
  onOpenBuilt: (result: BuiltWorkflow) => void;
  onOpenTemplate: (template: WorkflowTemplate, label: string) => void;
}) {
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [helperOpen, setHelperOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const session = useBuildSession();
  const emptyIdle = !nudgePaused && !pickerOpen && !helperOpen;

  useIdleNudge({
    active: emptyIdle,
    context: "empty-canvas",
    delayMs: session.nudgeDelayMs,
    used: session.nudge.used.includes("empty-canvas"),
    onDue: session.showNudge,
  });
  useIdleNudge({
    active: pickerOpen && !nudgePaused,
    context: "trigger-picker",
    delayMs: session.nudgeDelayMs,
    used: session.nudge.used.includes("trigger-picker"),
    onDue: session.showNudge,
  });

  function openPicker() {
    setHelperOpen(false);
    setPickerOpen(true);
    session.dismissNudge();
  }

  function closePicker() {
    setPickerOpen(false);
    addStepRef.current?.focus();
  }

  function chooseTrigger(nodeTypeId: string) {
    setPickerOpen(false);
    onChooseTrigger(nodeTypeId);
  }

  const showEmptyNudge =
    session.nudge.visible === "empty-canvas" && emptyIdle;
  const showPickerNudge =
    session.nudge.visible === "trigger-picker" && pickerOpen;

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
      <div className="canvas-dots flex min-h-0 flex-1 flex-col overflow-auto">
        <div className="m-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className={`h-[84px] rounded-[12px] border-[1.5px] bg-surface px-4 text-left ${focusRing}`}
              style={{ borderColor: color.border, color: color.ink }}
              aria-expanded={helperOpen}
              aria-controls="build-helper"
              aria-describedby="build-helper-blurb"
              onClick={() => {
                setPickerOpen(false);
                setHelperOpen((open) => !open);
                session.dismissNudge();
              }}
            >
              <span className="block text-[13px] font-semibold">
                {BUILD_HELPER_LABEL}
              </span>
            </button>
            <button
              ref={addStepRef}
              type="button"
              className={`grid h-[84px] w-[min(300px,calc(100%-1rem))] place-items-center rounded-[12px] border-[1.5px] border-dashed bg-transparent text-[13px] ${focusRing}`}
              style={{ borderColor: color.dashed, color: color.faint }}
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              onClick={openPicker}
            >
              + Add first step
            </button>
          </div>
          <p
            id="build-helper-blurb"
            className="max-w-md text-center text-[13px] leading-[1.4]"
            style={{ color: color.muted }}
          >
            {BUILD_HELPER_DESCRIPTION}
          </p>
          {helperOpen ? (
            <BuildHelperPanel
              flow={blankFlow()}
              alwaysAllow={session.alwaysAllow}
              onAlwaysAllow={session.setAlwaysAllow}
              onRecord={session.record}
              onApplied={onOpenBuilt}
              onClose={() => {
                setHelperOpen(false);
              }}
            />
          ) : null}
          {pickerOpen ? (
            <TriggerPicker onChoose={chooseTrigger} onClose={closePicker} />
          ) : null}
          {showEmptyNudge || showPickerNudge ? (
            <BuildNudge
              onHelp={() => {
                setPickerOpen(false);
                setHelperOpen(true);
                session.dismissNudge();
              }}
              onDismiss={session.dismissNudge}
            />
          ) : null}
          <StarterCards onOpen={onOpenTemplate} />
          <button
            type="button"
            className={`text-[13px] font-medium underline-offset-2 hover:underline ${focusRing}`}
            style={{ color: color.ink }}
            onClick={onOpenTemplates}
          >
            Browse all templates
          </button>
        </div>
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
          className="max-w-sm text-[13px] leading-[1.4]"
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
          className="max-w-sm text-center text-[13px] leading-[1.4]"
          style={{ color: color.muted }}
        >
          {body}
        </p>
      </div>
    </section>
  );
}
