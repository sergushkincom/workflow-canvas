"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { parseNudgeDelay } from "@/lib/experiments/workflow-canvas/build-helper";
import { isCaptureState } from "@/lib/experiments/workflow-canvas/capture-snapshots";

const WorkflowApp = dynamic(
  () =>
    import("./workflow-app").then((module) => ({
      default: module.WorkflowApp,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 bg-page">
        <div className="h-full w-[56px] shrink-0 border-r border-[var(--line)] bg-surface lg:w-[232px]" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="h-14 shrink-0 border-b border-[var(--line)] bg-surface" />
          <div className="canvas-dots min-h-0 flex-1" />
        </div>
      </div>
    ),
  },
);

function CanvasWithParams() {
  const params = useSearchParams();
  const raw = params.get("state");
  const captureState = isCaptureState(raw) ? raw : undefined;
  return (
    <WorkflowApp
      captureState={captureState}
      flowId={params.get("flow")}
      nudgeDelayMs={parseNudgeDelay(params.get("nudgeMs"))}
    />
  );
}

export function CanvasLoader() {
  return (
    <Suspense fallback={<div className="h-full bg-page" />}>
      <CanvasWithParams />
    </Suspense>
  );
}
