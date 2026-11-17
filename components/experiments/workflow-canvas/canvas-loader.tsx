"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { isCaptureState } from "@/lib/experiments/workflow-canvas/capture-snapshots";

const WorkflowApp = dynamic(
  () =>
    import("./workflow-app").then((module) => ({
      default: module.WorkflowApp,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 flex-col bg-page md:flex-row">
        <div className="h-14 shrink-0 border-b border-[var(--line)] bg-surface md:h-full md:w-[232px] md:border-r md:border-b-0" />
        <div className="flex min-h-0 flex-1 flex-col">
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
  return <WorkflowApp captureState={captureState} flowId={params.get("flow")} />;
}

export function CanvasLoader() {
  return (
    <Suspense fallback={<div className="h-full bg-page" />}>
      <CanvasWithParams />
    </Suspense>
  );
}
