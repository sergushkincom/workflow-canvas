# Agentic UX Lab

Interaction problems in AI and enterprise software, built rather than described.

I'm a product designer working on complex B2B systems. When a design question is
about latency, streaming, autonomy or trust, a static comp cannot answer it — so I
build the answer first and take it back into Figma once the interaction is settled.

This repo is where those questions get built. One experiment at a time.

## Experiments

| # | Experiment | The question it answers | Live |
|---|-----------|------------------------|------|
| 01 | [Workflow canvas](/experiments/workflow-canvas) | How should compound conditions read so the logic a user sees is the logic that runs? | [demo](/experiments/workflow-canvas) |

Notes for each experiment live next to the code: `components/experiments/workflow-canvas/README.md`.

## Stack

Next.js · TypeScript · Tailwind · shadcn/ui · dnd-kit. Fake data throughout.

## Not

Production code. Each experiment is scoped to a single evening and deliberately
stops at the edge of its question.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).
