---
id: P18-S127-SIBLINGVALUE
title: A placed component's value output into another placed component's input is dropped (90 template wires)
status: fixed
severity: medium
area: export / an instance output read by a sibling instance's input (`src/analyze/plan.ts`, the lifted-output reads)
found: P18 session 127, 2026-10-19, reading todo-list's Dialog flow once the signals into it ran
fixed: P18 session 128, 2026-10-19, branch l6-setdone; EXP-011 §96
commit: 7b9ab0b6f
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

**Session 128 (EXP-011 §96): fixed.** A sibling's declared value input binds to the parent's lifted row, as a rendered sink
does. Binding it alone read the value one pulse late (measured: the child pushes a lifted value from its effect in the
commit the pulse lands in, and the sibling's chain runs from its own effect in that commit), so a pulsed component that
reads a lifted row is handed its count from the parent's own effect, one commit later: the value lands first. Graded
against the runtime's own nodes with real React under StrictMode (`tests/the-sibling-value-arrives.test.ts`, 14 rows, 4
mutant arms). Of the 90 template wires, **8 bind** (rocket-school's and star-class's Monster and Race: the Setup's
`style`, `timed` and `players` reach the game), **82 are named by their real blocker**, the child not lifting the output:
a logic component 32, a repeater's row relay 18 (todo-list's and its demo's Task list and Today list into the Dialog
flow, 16), a kit 4, a nested instance 2, nightbook 26 (not read further).

What is left, not this bug: todo-list's Dialog flow still runs on inputs it is not given, because the Task list relays its
rows' outputs (§31, "which row fired is not statically expressible").

