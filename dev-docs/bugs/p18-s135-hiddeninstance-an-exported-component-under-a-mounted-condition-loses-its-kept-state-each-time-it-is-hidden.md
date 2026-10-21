---
id: P18-S135-HIDDENINSTANCE
title: An exported component placed under a Mounted condition loses its kept Function nodes, their outputs and its record each time it is hidden; the running app keeps the instance
status: open
severity: low
area: export / component instances under a Mounted condition (`{cond && <Child />}`), kept nodes (`functionNode`, EXP-011 §86), the Component scope (EXP-020 slice 2, `src/lib/componentScope.ts`)
found: P18 session 135, 2026-10-21, the Component Desk (Keep C, in a Group the Toggle mounts)
evidence: dev-docs/tasks/phase-18-code-export-v2/s135-componentrecord/EXPECTED.md (rows 10–12, predicted and read); `packages/nodegx-export/tests/the-component-record-travels.test.ts` A5 (pinned by name)
---

The runtime creates a component instance once and keeps it while it is not drawn (P18-S128-SEEDREMOUNT's reading of the
same fact): hiding and showing a Group around a placement leaves every node in it alive. The export draws the placement
as `{cond && <Keep … />}`, so hiding it unmounts the React component and showing it mounts a new one: its `useRef`s and
`useState`s start over.

Measured on the Component Desk: Keep C counted to 1, was hidden, was shown again, counted once more.

| | after showing again: C's count Text | after the next Add | Read |
|---|---|---|---|
| the runtime | `1` (the Text keeps what it was sent) | `2` | `got\|2\|2\|w2\|…` (the record outlived the hiding) |
| the export | `''` | `1` | `got\|1\|1\|w1\|…` |

What resets is everything a component instance keeps across its life in the export: a kept Function node's values and
its `self` (`this`), the row a run materializes, and now its `Component.Object` record. Not new with the record: the
kept node and its outputs reset the same way since EXP-011 §86.

Reach: the templates, 0 — every Function that reads `Component.Object` is on a page component, and a page is deleted on
leaving and built fresh on the next visit in the runtime too (`router.tsx` `_leaveCurrentPage`, Keep When Leaving off).
A second shape, not measured: a page whose Page node ticks **Keep When Leaving** (P109 ISL-004) is hidden, not deleted,
and the exporter does not read that parameter; no template ticks it.

The fix the class wants is state kept by the parent, as the pulse counts are (EXP-011 §94), or one keep-alive per
placement (the Group draws, hides with `display`, and does not unmount) — the second changes what a hidden subtree's
effects do, which the runtime also pauses only partly (`_onPageHidden`).
