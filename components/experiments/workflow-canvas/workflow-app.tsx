"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  AppSidebar,
  SIDEBAR_COLLAPSE_QUERY,
  SIDEBAR_RAIL_PX,
  SIDEBAR_WIDTH_PX,
  type ShellSection,
} from "./app-sidebar";
import { FirstRunShell } from "./first-run-shell";
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

function useNarrowShell() {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(SIDEBAR_COLLAPSE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(SIDEBAR_COLLAPSE_QUERY);
    function onChange() {
      setNarrow(media.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return narrow;
}

export function WorkflowApp({
  captureState,
  flowId,
}: {
  captureState?: CaptureState;
  flowId?: string | null;
}) {
  const initialEditor = sessionFromProps(captureState, flowId);
  const [editor, setEditor] = useState<EditorSession | null>(initialEditor);
  const [showEditor, setShowEditor] = useState(initialEditor != null);
  const [frozen, setFrozen] = useState(Boolean(captureState));
  const [modalOpen, setModalOpen] = useState(initialEditor == null);
  const [section, setSection] = useState<ShellSection>(
    initialEditor ? "workflows" : "home",
  );
  const narrow = useNarrowShell();
  const nextKey = useRef(1);
  const addStepRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"shell" | "editor" | null>(null);
  const collapsed = showEditor || narrow;
  const sidebarWidth = collapsed ? SIDEBAR_RAIL_PX : SIDEBAR_WIDTH_PX;

  function openEditor(name: string, flow: Flow) {
    const key = `editor-${nextKey.current}`;
    nextKey.current += 1;
    pendingFocus.current = "editor";
    setFrozen(false);
    setEditor({ key, name, flow, autoFocusTitle: true });
    setShowEditor(true);
    setSection("workflows");
    setModalOpen(false);
  }

  function onSection(next: ShellSection) {
    if (next === "workflows" && editor) {
      setShowEditor(true);
      setSection("workflows");
      return;
    }
    setShowEditor(false);
    setSection(next);
  }

  function useTemplate(template: WorkflowTemplate) {
    openEditor(template.name, materializeTemplate(template));
  }

  function startBlank() {
    openEditor(BLANK_WORKFLOW_NAME, blankFlow());
  }

  const onHome = !showEditor;

  return (
    <div className="flex h-full min-h-0">
      <AppSidebar
        section={showEditor ? "workflows" : section}
        collapsed={collapsed}
        modalOpen={modalOpen}
        onSection={onSection}
        onOpenTemplates={() => setModalOpen(true)}
      />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        {showEditor && editor ? (
          <WorkflowCanvas
            key={editor.key}
            captureState={frozen ? captureState : undefined}
            initialFlow={frozen ? undefined : editor.flow}
            title={editor.name}
            autoFocusTitle={editor.autoFocusTitle}
          />
        ) : (
          <FirstRunShell
            section={section}
            addStepRef={addStepRef}
            onOpenTemplates={() => setModalOpen(true)}
            onStartBlank={startBlank}
          />
        )}
      </div>
      {frozen ? null : (
        <TemplatesModal
          open={modalOpen}
          sidebarWidth={sidebarWidth}
          onOpenChange={(open) => {
            if (!open && pendingFocus.current !== "editor") {
              pendingFocus.current = onHome ? "shell" : null;
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
