---
id: P109-S43-ROUTINEREFUSAL
title: A refused routine date's sentence stays on screen when the person opens another routine
status: scheduled
phase: P109
task: ISL-046
severity: medium
area: templates / TPL-008 routine pane (`Todo/Routine summary`, `Commands/Set routine dates`)
found: P109 s43, 2026-10-11, while driving P78-D81's fix — `packages/nodegx-backend/tests/isl046-d81-routine-dates-drive.test.ts` logs the reading
---

In the todo list's Today view, open Pilates (it starts in five days) and pick an end date before that. The pane says
*"It cannot end before it starts."* and the record keeps its empty end. Now open *Take the tablets*. Its dates are its
own (D81's fix), but the sentence is still there, under a routine that has no end date and no error.

**Where:** `cmdStart` / `cmdEnd` on `Pages/Todo` publish `error` and `hasError` into the summary's
`startError` / `hasStartError` / `endError` / `hasEndError`. The guard runs only on `do`, so nothing changes those
outputs when `tdSelected` moves to another routine.

**Measured:** s43, on `templates/todo-list-demo/` after D81's regeneration: the drive's reading printed `true`.

**Proposed:** not the sign-in form's constant-false Condition (P78 D36). That one hides the sentence, but a second
refusal publishes `hasError: true` again, which is no change, so it would stay hidden. The guard should forget its
refusal when the routine it was about is no longer open, for example by publishing `hasError` only for the routine id
it refused, or by running the guard on a `routineId` change and clearing there. Then extend the D81 drive's reading
into an assertion.
