---
id: P132-ROUTEDINSERT
title: A Find records (or any step with sides) added between two steps keeps a plain next, and Studio shows the backend's warning in engine words
status: open
phase: P132
task: BWF-007
severity: low
area: nodegx-studio / Backend tab (Add a step after → a kind with routes); nodegx-backend workflow warnings' words
found: building The morning check's email in the BWF-007 Electron drive, 2026-11-03 (s8)
evidence: dev-docs/tasks/phase-132-a-backend-workflow-you-can-build-by-hand/look/bwf007-built-no-json.png
launch: beta
---

On *The morning check* (`check` → `done`), *Add a step after* on `check` and *Find records* from the menu inserts the
find between them (`automations.mjs` `addStepAfter`): `check.next = [find]`, `find.next = [done]`. A find has two
sides (*If there are none* / *If there are some*), so the plain `next` is an *Always, as well* line, and the backend's
save warning is shown over the canvas as it is written: `Step "find-records" has routes (nonempty) and a plain next
(done): next runs whatever the step decides, so done runs on every route. To run it on one side only, move it from
next into that route (routes.<name>).` The panel offers *On If there are none / On If there are some* to move it.

Two things a person meets on the most natural build there is:

1. The insert chose for them. For a find, "the steps after still run whatever it finds" is a fair default (a return
   that reports a count should), but it is not said at the moment of the insert, only flagged afterwards as if wrong.
2. The warning is in the engine's words (`routes (nonempty)`, `routes.<name>`), where the panel beside it says
   *If there are some*.

**Fix (not built):** say the backend's warnings in the panel's words (the kind's route labels, "on one side"), and
either do not warn for kinds whose sides are an outcome rather than a decision (find, filter), or ask at the insert
which side the steps after go on. Needs a ruling on which; BWF-001's BRANCHNEXT ruling was for `branch`.
