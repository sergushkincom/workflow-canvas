import Link from "next/link";

import { color } from "@/lib/experiments/workflow-canvas/tokens";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p
        className="text-[11px] font-medium tracking-[0.04em] uppercase"
        style={{ color: color.faint }}
      >
        Design experiment
      </p>
      <h1
        className="mt-2 text-[15px] font-semibold leading-tight"
        style={{ color: color.ink }}
      >
        Interaction problems, built rather than described.
      </h1>
      <p
        className="mt-3 text-[13px] leading-[1.4]"
        style={{ color: color.muted }}
      >
        Experiments in AI and enterprise software. Each one answers a single
        question in code, then stops.
      </p>

      <ul className="mt-10">
        <li>
          <Link
            href="/experiments/workflow-canvas"
            className="focus-ring-icon block rounded-[12px] border p-4 shadow-card"
            style={{
              borderColor: color.border,
              background: color.surface,
            }}
          >
            <p
              className="text-[11px] font-medium tracking-[0.04em] uppercase"
              style={{ color: color.faint }}
            >
              01 · Aug 2026
            </p>
            <h2
              className="mt-1.5 text-[14px] font-semibold"
              style={{ color: color.ink }}
            >
              Workflow canvas
            </h2>
            <p
              className="mt-1 text-[13px] leading-[1.4]"
              style={{ color: color.muted }}
            >
              How should compound conditions read so the logic a user sees is
              the logic that runs?
            </p>
          </Link>
        </li>
      </ul>
    </main>
  );
}
