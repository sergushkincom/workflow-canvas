# Copilot instructions for workflow-canvas

## Project overview

This repository is a small interactive prototype for a support-triage workflow builder. It is built with Next.js 16 and the App Router, and the main experience lives at `app/experiments/workflow-canvas/page.tsx`.

The important parts of the app are split across two layers:

- `app/` contains the route entrypoints and Next.js app shell.
- `components/experiments/workflow-canvas/` contains the interactive canvas UI: node shells, trigger/condition cards, drag-and-drop palette, assistant panel, and run-time decision UI.
- `lib/experiments/workflow-canvas/` contains the state model and logic: reducer-driven flow editing, the scripted assistant, the sample ticket data, and the execution state machine.

This is a demo app with fake, non-persistent data. The design goal is to model “honest uncertainty” in workflow automation rather than to build a production backend or data model.

## Build, lint, and validation commands

Use the repo scripts from the root:

```bash
npm install
npm run dev
npm run build
npm run lint
```

There is no test runner configured in `package.json`; there are no automated unit/integration tests in this repo today. For focused validation of changed files, use ESLint directly against the relevant file(s):

```bash
npx eslint app/experiments/workflow-canvas/page.tsx
npx eslint components/experiments/workflow-canvas/**/*.tsx
npx eslint lib/experiments/workflow-canvas/**/*.ts
```

If you add tests later, prefer existing repo conventions and keep the validation command scoped to the relevant file or directory instead of running a broad suite.

## High-level architecture

The canvas is intentionally structured around a single workflow model, not a broad app framework:

- `lib/experiments/workflow-canvas/types.ts` defines the shared data model: triggers, condition nodes, action nodes, rows, and flow state.
- `lib/experiments/workflow-canvas/flow-reducer.ts` is the canonical source for build-time state changes: adding rows, resizing nodes, reordering conditions, updating row fields, and editing conjunctions.
- `lib/experiments/workflow-canvas/run-machine.ts` controls the execution flow when the demo runs a sample ticket: node states, timing, waiting/decision states, and final routing outcomes.
- `lib/experiments/workflow-canvas/assistant.ts` contains the scripted, deterministic “condition assistant” behavior. This is not a real model integration; it matches user phrases and returns draft rows or ambiguity choices.
- `lib/experiments/workflow-canvas/data.ts` defines the fake ticket schema, sample values, and field metadata used throughout the UI and reasoning logic.
- `lib/experiments/workflow-canvas/node-types.ts` defines the palette taxonomy and node grouping used by the add-step UI.

The route itself uses client-side loading to keep the canvas interactive without SSR:

```tsx
const WorkflowCanvas = dynamic(() => import("./canvas"), { ssr: false });
```

This is an intentionally static prototype. Do not introduce backend persistence, database calls, or app-wide state patterns unless the task explicitly requires it.

## Key conventions in this repo

- Preserve the “incomplete is not an error” design: unfinished rows or nodes are normal states in the builder and should not be styled like failures.
- Keep the node/row model consistent. A condition node contains multiple rows, and each row carries `source`, `field`, `operator`, and optionally `value`. The node-level `conjunction` (`and` / `or`) decides how those rows combine.
- Reuse shared metadata instead of duplicating labels or field definitions. The definitions in `data.ts` and `node-types.ts` are the source of truth for sample ticket fields and palette labels.
- Prefer reducer-based updates over scattered local component state when editing flow behavior. Most significant state transitions are centralized in `flow-reducer.ts` and `run-machine.ts`.
- Treat the AI features as scripted demo behavior. The app intentionally models uncertainty and explicit human decision-making instead of auto-routing or silent fallback behavior.
- Match the existing styling system and node tint model rather than introducing a new visual pattern. The repo distinguishes trigger, condition, AI-step, and neutral action/data nodes with explicit color semantics.

## Branching and pull requests

- Never commit directly to `main`; create a feature branch before making changes.
- Use branch names in the following style: `feat/...`, `fix/...`, `style/...`, or `docs/...`.
- Keep each pull request focused on one change. Do not mix unrelated refactors or UI tweaks in the same PR.
- PR titles should use the same conventional-commit style as the repository’s existing patterns, for example `style: palette polish` and `docs: palette section`.
- Always run `npm run lint` and `npm run build` before opening a PR.
- Do not push changes without explicit approval.

## Repo-specific instructions

- `AGENTS.md` is the canonical instruction file for this repository. `CLAUDE.md` only references it and should not diverge from it.
- `copilot-instructions.md` must stay consistent with `AGENTS.md`; if working conventions change, update `AGENTS.md` first and then keep this file aligned.
- For changes in build/editing logic, read both the relevant reducer and the corresponding UI component together; the state model and rendering are intentionally coupled.
- For changes in the run/decision flow, keep the sample ticket behavior and deterministic outputs consistent with the demo’s “ask before acting” interaction.
- Keep changes minimal and aligned with the prototype’s scope: this is a flow-builder demo, not a general-purpose app framework.
