---
id: P18-S127-SIBLINGVALUE
title: A placed component's value output into another placed component's input is dropped (90 template wires)
status: open
severity: medium
area: export / an instance output read by a sibling instance's input (`src/analyze/plan.ts`, the lifted-output reads)
found: P18 session 127, 2026-10-19, reading todo-list's Dialog flow once the signals into it ran
evidence: the emitted notes, `instance output "x" feeds /<component>.<port>, which has no static binding in this slice`
---

One placed component's value output wired into another placed component's input (todo-list's Task list `taskId` into the
Dialog flow's `listTaskId`) is dropped: "instance output "taskId" feeds /Todo/Dialog flow.listTaskId, which has no static
binding in this slice". The receiving component reads `undefined` for that input.

Counted in the emitted notes of the 19 templates after session 127: **90 such wires** (nightbook 26, rocket-school and
star-class 24 each, todo-list and its demo 8 each). It matters more since session 127: a signal sent into a component now
runs its chain, and todo-list's Dialog flow's eight chains write `todoDialogTask` and `todoDialogSubject` from those inputs,
so they write `undefined` (the dialog's States are refused for their own reason, so nothing is drawn from it yet).

Fix, its size: medium. The parent lifts the output already for a rendered sink (`onTaskIdChanged={setX}`, CONTROLLED-STATE
§4d); an instance's input is a rendered sink of the same kind: lift the output into a parent state row and pass the row to
the sibling's prop. Grade with `runtime-mounted-arm.js` (two placed components, a value between them).
