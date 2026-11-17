"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { FirstRunShell } from "./first-run-shell";
import type { ShellSection } from "./app-sidebar";
import { TemplatesModal } from "./templates-modal";
import { initialFlowState } from "@/lib/experiments/workflow-canvas/flow-reducer";
import {
  BLANK_WORKFLOW_NAME,
  blankFlow,
  materializeTemplate,
  resolveDirectOpen,
  type WorkflowTemplate,
} from "@/lib/experiments/workflow-canvas/templates";
import type { CaptureState } from "@/lib/experiments/workflow-canvas/capture-snapshots";
import type { Flow } from "@/lib/experiments/workflow-canvas/types";

const WorkflowCanvas = dynamic(
  () =>
    import("./canvas").then((module) => ({
      default: module.WorkflowCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-col bg-page">
        <div className="h-12 shrink-0 border-b border-[var(--line)] bg-surface" />
        <div className="canvas-dots min-h-0 flex-1" />
      </div>
    ),
  },
);

type EditorSession = {
  key: string;
  name: string;
  flow: Flow;
  autoFocusTitle: boolean;
};

function sessionFromProps(
  captureState: CaptureState | undefined,
  flowId: string | null | undefined,
): EditorSession | null {
  if (captureState) {
    return {
      key: "capture",
      name: "Support triage",
      flow: structuredClone(initialFlowState.flow),
      autoFocusTitle: false,
    };
  }
  const direct = resolveDirectOpen(flowId);
  if (!direct) {
    return null;
  }
  return {
    key: `direct-${flowId}`,
    name: direct.name,
    flow: direct.flow,
    autoFocusTitle: false,
  };
}

export function WorkflowApp({
  captureState,
  flowId,
}: {
  captureState?: CaptureState;
  flowId?: string | null;
}) {
  const [editor, setEditor] = useState<EditorSession | null>(() =>
    sessionFromProps(captureState, flowId),
  );
  const [modalOpen, setModalOpen] = useState(
    () => sessionFromProps(captureState, flowId) == null,
  );
  const [section, setSection] = useState<ShellSection>("home");
  const nextKey = useRef(1);
  const addStepRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"shell" | "editor" | null>(null);

  function openEditor(name: string, flow: Flow) {
    const key = `editor-${nextKey.current}`;
    nextKey.current += 1;
    pendingFocus.current = "editor";
    setEditor({ key, name, flow, autoFocusTitle: true });
    setModalOpen(false);
  }

  function useTemplate(template: WorkflowTemplate) {
    openEditor(template.name, materializeTemplate(template));
  }

  function startBlank() {
    openEditor(BLANK_WORKFLOW_NAME, blankFlow());
  }

  const shell = editor == null;

  return (
    <div className="h-full min-h-0">
      {shell ? (
        <FirstRunShell
          section={section}
          modalOpen={modalOpen}
          addStepRef={addStepRef}
          onSection={setSection}
          onOpenTemplates={() => setModalOpen(true)}
          onStartBlank={startBlank}
        />
      ) : (
        <WorkflowCanvas
          key={editor.key}
          captureState={captureState}
          initialFlow={captureState ? undefined : editor.flow}
          title={editor.name}
          autoFocusTitle={editor.autoFocusTitle}
          onOpenTemplates={
            captureState ? undefined : () => setModalOpen(true)
          }
        />
      )}
      {captureState ? null : (
        <TemplatesModal
          open={modalOpen}
          docked={shell}
          onOpenChange={(open) => {
            if (!open && pendingFocus.current !== "editor") {
              pendingFocus.current = shell ? "shell" : null;
            }
            setModalOpen(open);
          }}
          onUseTemplate={useTemplate}
          onStartBlank={startBlank}
          onCloseAutoFocus={(event) => {
            const target = pendingFocus.current;
            pendingFocus.current = null;
            if (target === "editor") {
              event.preventDefault();
              return;
            }
            if (target === "shell" && addStepRef.current) {
              event.preventDefault();
              addStepRef.current.focus();
            }
          }}
        />
      )}
    </div>
  );
}
