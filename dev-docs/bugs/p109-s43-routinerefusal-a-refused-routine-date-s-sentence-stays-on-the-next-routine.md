---
id: P109-S43-ROUTINEREFUSAL
title: A refused routine date's sentence stays on screen when the person opens another routine
status: fixed
commit: 9cb99b205
phase: P109
task: ISL-046
severity: medium
area: templates / TPL-008 routine pane (`Todo/Routine summary`, `Commands/Set routine dates`)
found: P109 s43, 2026-10-11, while driving P78-D81's fix — `packages/nodegx-backend/tests/isl046-d81-routine-dates-drive.test.ts` logs the reading
regression: packages/nodegx-backend/tests/isl046-d81-routine-dates-drive.test.ts (the pane, both refusals); packages/noodl-mcp/tests/tpl008Recurring.test.ts (`SAY_REFUSAL_SCRIPT`)
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

**Fixed (P109 s44, 2026-10-11).** Three commands had this shape, not one: Set routine dates (the pane's start and
end), Set schedule (its Add time: *"Type a time like 08:00, 8:30 or 8pm."* followed the person too) and Set deadline
(the task pane). `command()` in `tpl008Components.ts` gains `refusalAbout`, the input naming the record. The guard now
publishes each verdict as a new object, `Outputs.verdict = { about, error }`. A small Function beside it,
`SAY_REFUSAL_SCRIPT`, says the words only while `about` is still the open record. Because each verdict is a new
object, a refusal made again (the same words) is said again. A hide driven from outside would see `hasError: true`
twice, which is no change, and stay hidden.

**Graded:** the drive gained three arms. On HEAD's template two were red: the dates refusal on the tablets and
back on Pilates, and the time refusal on the tablets. After the fix all 7 passed. Control: a mutant that compares
verdicts by value (`JSON.stringify`) turns exactly the "said again" arm red. Set deadline takes the same code
path; it is graded by the unit spec only, not driven. Regenerated: `todo-list`, `todo-list-demo`.
