<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

Install and run from the repository root:

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
npm run typecheck
```

`npm test` runs the colocated `node:test` checks in `lib/experiments/workflow-canvas/*.check.ts` (flow reducer, run state machine, assistant duplicate-condition rules). The `test` script is:

```bash
node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./scripts/register-test-hooks.mjs --test "lib/experiments/workflow-canvas/*.check.ts"
```

New checks belong next to the module as `*.check.ts` and run under `npm test`. For a single file, pass that path to the same `node --test` command — keep `--experimental-strip-types` and `--import ./scripts/register-test-hooks.mjs` — instead of growing a second runner.

For a narrower lint pass, ESLint can still target the files you changed:

```bash
npx eslint app/experiments/workflow-canvas/page.tsx
npx eslint components/experiments/workflow-canvas/**/*.tsx
npx eslint lib/experiments/workflow-canvas/**/*.ts
```

CI (`.github/workflows/ci.yml`) installs with `npm ci`, then runs `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

## Project overview

This repository is a small interactive prototype for a support-triage workflow builder. It is built with Next.js 16 and the App Router, and the main experience lives at `app/experiments/workflow-canvas/page.tsx`.

The important parts of the app are split across:

- `app/` contains the route entrypoints and Next.js app shell.
- `components/experiments/workflow-canvas/` contains the interactive canvas UI: node shells, trigger/condition cards, drag-and-drop palette, assistant panel, and run-time decision UI.
- `lib/experiments/workflow-canvas/` contains the state model and logic: reducer-driven flow editing, the scripted assistant, the sample ticket data, and the execution state machine.

This is a demo app with fake, non-persistent data. The design goal is to model “honest uncertainty” in workflow automation rather than to build a production backend or data model.

## High-level architecture

The canvas is intentionally structured around a single workflow model, not a broad app framework:

- `lib/experiments/workflow-canvas/types.ts` defines the shared data model: triggers, condition nodes, action nodes, rows, and flow state.
- `lib/experiments/workflow-canvas/flow-reducer.ts` is the canonical source for build-time state changes: adding rows, resizing nodes, reordering condition rows, updating row fields, and editing conjunctions.
- `lib/experiments/workflow-canvas/run-machine.ts` controls the execution flow when the demo runs a sample ticket: node states, timing, waiting/decision states, and final routing outcomes.
- `lib/experiments/workflow-canvas/assistant.ts` contains the scripted, deterministic “condition assistant” behavior. This is not a real model integration; it matches user phrases and returns draft rows or ambiguity choices.
- `lib/experiments/workflow-canvas/data.ts` defines the fake ticket schema, sample values, and field metadata used throughout the UI and reasoning logic.
- `lib/experiments/workflow-canvas/node-types.ts` defines the palette taxonomy and node grouping used by the add-step UI.

`app/experiments/workflow-canvas/page.tsx` renders `CanvasLoader`. The canvas is loaded in the browser from `components/experiments/workflow-canvas/canvas-loader.tsx` with `next/dynamic` (`import("./canvas")`, `ssr: false`) so it stays interactive without SSR.

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
- Always run `npm test`, `npm run lint`, and `npm run build` before opening a PR.
- Do not push changes without explicit approval.

## Repo-specific instructions

- `AGENTS.md` is the canonical instruction file for this repository. `CLAUDE.md` and `.github/copilot-instructions.md` only point here and must not grow their own rules.
- For changes in build/editing logic, read both the relevant reducer and the corresponding UI component together; the state model and rendering are intentionally coupled.
- For changes in the run/decision flow, keep the sample ticket behavior and deterministic outputs consistent with the demo’s “ask before acting” interaction.
- Keep changes minimal and aligned with the prototype’s scope: this is a flow-builder demo, not a general-purpose app framework.
