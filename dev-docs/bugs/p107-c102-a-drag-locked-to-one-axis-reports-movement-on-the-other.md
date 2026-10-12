---
id: P107-C102
title: A Drag locked to one Axis still reports movement on the other — Drag Y moves while the element stays put, then jumps back to 0 at the next drag
status: fixed
commit: c1623eec2
phase: P109
task: ISL-048
severity: medium
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `setDragValues` and `onStop` — both write `data.x` and `data.y` whatever the Axis; react-draggable 4.5.0 documents that `axis` "only controls flushing to the DOM", the callbacks still carry both)
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; jsdom probe on the real Drag component, Axis X, a drag from (0,0) through (10,50) to (30,80): the element is drawn at translate(30px,0px), while Drag Y reports 50 then 80 and Delta Y 50 then 30, and Drag Y is 80 after Drag Ended; the next drag (0,0)→(5,5) starts with Drag Y 0 and ends at Drag Y 5, the element at translate(35px,0px)
regression: packages/nodegx-node-spec/scenarios/Drag.json "row C102 — Axis X: the element moves on X only — Drag Y stays where the element is and Delta Y is 0"
kit: node-spec
---

**What a person sees.** A slider-like control built from a Drag with Axis X shows its Drag Y in a label, or uses Delta Y to do
something: a person dragging sideways with a little vertical wobble makes Drag Y and Delta Y change, though the element never moves
up or down. After they let go Drag Y stays at the wobble (80 in the probe); the next drag starts by sending Drag Y 0. The ports say
"Current Y position of the element relative to where it started" and "How far the element moved on Y".

**Where.** `setDragValues` (Drag.tsx) sends `event.x`, `event.y`, `deltaX` and `deltaY` from the library's callback data at start
and on every move, and `onStop` sends `data.x` and `data.y`, for every Axis. The component's own state takes only the allowed axis at
stop, so the locked axis's output and the element disagree until the next drag start, which sends the state's 0.

**How to reproduce.** The probe in §7.16 (Axis X, a diagonal drag). The Drag spec (NSP-016) will carry it as a known row.

**Proposed fix.** Send the locked axis's outputs as the component's state (the start position) and its deltas as 0: in
`setDragValues` and `onStop`, read `canDrag(axis)` per axis. Small.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** `Drag.tsx` `reportDrag` (a press and a move) and `onStop` read the Axis
the Drag was rendered with: on a locked axis Drag X / Y report where the element is and Delta X / Y is 0. The spec already said so
(R11); the C102 known row and the scenario's `row` are gone. Runtime conforms at seeds 13 and 20732 (21 / 22: the other is C105's
known row), with 0 generated divergences where 18 at seed 13 were attributed to C102 before; interpreter mutants 0 survivors at
both; control red on exactly the C102 scenario.
