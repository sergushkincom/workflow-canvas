# Workflow canvas

## Problem

Most workflow builders let you mix AND and OR in a flat list of conditions.
The meaning of that list depends on precedence rules the UI never shows.
A static mock cannot settle whether users can actually read the logic they
are writing.

## What I built

A clickable canvas: one trigger, condition steps you can add, edit, reorder
and delete, and a quiet incomplete marker. No backend, no persistence, no
execution. Fake support-inbox data.

## Three decisions

1. **Colour encodes state, never type.** Node type is an icon and a text chip.
   The single accent colour is reserved for selection, incompleteness, and
   focus. The canvas stays quiet until something needs attention.

2. **One conjunction per node.** AND / OR is a property of the condition, not
   of each row. Mixed operators without grouping produce a lie; grouping would
   be a separate feature with its own visual weight.

3. **Incompleteness is information, not an error.** A half-built condition is
   a normal state of a flow being built. No red borders, no warning icons —
   a footer marker and a count in the top bar. Errors are for when someone
   tries to run it.

## Deliberately left out

Zoom, minimap, If/Else branching paths, multiple triggers, save/load, dark
mode, a sidebar, a properties panel, a node library, real execution.

Action and Delay appear in the add menu as disabled “coming soon” items so
the scope boundary is visible in the prototype itself.

## What I’d do next

Branching (true If/Else with two outgoing paths), grouped conditions, and
the moment incompleteness becomes an error — when the user tries to run.
