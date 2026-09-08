# Workflow canvas

**The question:** what does an interface look like when a system is honest about
not knowing, and hands the decision back to a person?

[Live demo →](https://denys-workflow-canvas.vercel.app/experiments/workflow-canvas)

## What it is

A support-triage workflow builder with two halves.

**Build.** A trigger and condition steps on a dotted canvas. Add, edit, reorder and
delete conditions. Each step reports whether it is complete, and the flow cannot run
until every step is.

**Run.** A Test run mode that executes the flow against one sample ticket in real
elapsed time. Conditions evaluate. An AI step reads the ticket and streams its
reasoning as it goes. Then it reaches 62% confidence — and stops.

It doesn't count down. It doesn't auto-confirm. It states what it is unsure about in
plain sentences, offers two classifications, and waits as long as it takes. The rest
of the flow is visibly blocked until a human answers.

## The decision moment

Most products treat uncertainty as a threshold to cross silently: above the line the
model acts, below it the step fails or falls back. The user sees neither. They find
out what the system decided after it has already decided — usually when something
went wrong downstream.

This prototype designs the other version. At 62% the AI step says why:

> Two other tickets from this customer this month were about a failed integration,
> and I can't tell if this is the same problem. I'm not confident enough to decide
> alone.

A percentage on its own is a number, not a reason. Both proposed labels are visible
without interaction, because the person is comparing — not picking from a menu.

## Four decisions I'd defend

**1. Two colour languages, strictly separated.**
Soft type tints say what a step *is* — trigger, condition, AI step. One saturated
accent says what the system is *doing* — selection, focus, progress, uncertainty.
Neither borrows from the other. By the twelfth node type, a palette that codes both
has stopped meaning anything.

**2. The conjunction belongs to the node, not the row.**
Letting people mix `and` / `or` inside one flat list produces logic whose meaning
depends on precedence rules nobody can see. Set once per node, the logic a user reads
is the logic that runs.

**3. Incomplete is not an error.**
A half-built condition is a normal state of a flow being built, so it isn't styled as
a failure. No red borders, no warning icons while someone is mid-thought — a quiet
marker in the node footer and a count in the top bar. Errors are for when you try to
run it.

**4. The system doesn't take credit for a decision it refused to make.**
Whatever the person chooses is recorded as theirs: *"Classified as Billing dispute ·
confirmed by you."* An interface that asks for help and then quietly absorbs the
outcome teaches people that asking was theatre.

## What I found by building it

The waiting state turned out to be the only looping animation in the whole prototype.
Everything else has a start and an end. The one state with no deadline is the only one
that never stops moving. I didn't plan that — a static comp could not have shown it to
me.

## Deliberately not built

Zoom · minimap · true If/Else branching with two outgoing paths · multiple triggers ·
persistence · real model calls · dark mode · a node library · a properties panel.

Each of those is a real feature. None of them helps answer the question above, and the
list of things I chose not to build is part of the work.

## What I'd test next

62% is arbitrary — a number that reads as clearly unsure without being useless. The
design problem I actually want to solve is who sets that threshold, how a team tunes
"decide alone" versus "ask me" per workflow, and whether that setting is still legible
six months later.

My prediction: teams set it once and never revisit it, which means the interface has to
surface the drift on its own.

## Running it

```bash
npm install
npm run dev
# → http://localhost:3000/experiments/workflow-canvas
```

Built in my own time. Fake data throughout, no production code and nothing proprietary
— just enough to feel the interaction.
