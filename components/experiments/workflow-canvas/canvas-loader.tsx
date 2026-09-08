"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  isCaptureState,
  type CaptureState,
} from "@/lib/experiments/workflow-canvas/capture-snapshots";

const WorkflowCanvas = dynamic(
  () =>
    import("./canvas").then((module) => ({
      default: module.WorkflowCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh flex-col bg-page">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--line)] bg-surface px-4">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold leading-tight text-ink">
              Support triage
            </p>
            <span className="inline-flex h-6 items-center rounded-[6px] bg-field px-2 text-[11.5px] font-medium text-ink-2">
              Draft
            </span>
          </div>
        </div>
        <div className="canvas-dots min-h-0 flex-1" />
      </div>
    ),
  },
);

function CanvasWithCaptureState() {
  const params = useSearchParams();
  const raw = params.get("state");
  const captureState: CaptureState | undefined = isCaptureState(raw)
    ? raw
    : undefined;
  return <WorkflowCanvas captureState={captureState} />;
}

export function CanvasLoader() {
  return (
    <Suspense fallback={<div className="h-dvh bg-page" />}>
      <CanvasWithCaptureState />
    </Suspense>
  );
}
