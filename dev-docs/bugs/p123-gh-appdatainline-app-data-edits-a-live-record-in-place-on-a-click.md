---
id: P123-GH-APPDATAINLINE
title: App data edits a live record in place on a click, so a stray click can change real data
status: fixed
severity: high
area: nodegx-studio / Data → App data table
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
phase: P123
task: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes
commit: nodegx-studio 393f376 (editor/studio.html openRow, openPerson; editor/data-check.mjs)
regression: ../nodegx-studio/editor/data-check.mjs "a click on a row opens it in the drawer, the table stays as it is, and a Choice changed there and cancelled changes nothing"
---

Richard (Greenhouse, 2026-10-30): *"Editing the 'App data' inline in the viewer is dangerous, that's why I stopped using
NocoDB because the chances of accidentally clicking and fucking up real data is enormous. Go back to clicking a record and
having it open in a sidebar or modal … It makes it easier to deal with relational fields and date fields."*

A ruling already given: the table is read-only; a click on a row opens that record in a side panel with a field per
column (links as pickers, dates as date fields), and Save/Cancel; nothing is written until Save. Task: nodegx-studio
docs/SCOPE.md STU-095.

Fix (2026-10-30, s29, STU-095): the table has no control in it any more. A click on a row (not its tick box) opens
the record in the drawer, one control per field of its kind (a Link picks a row, a date is a date field, a Choice its
options); Save sends only the fields changed, Cancel or × writes nothing; New entry is the same panel empty. User's
people open the same way (one PUT to `/admin/users/:id`).

Graded: `check:data` 84/84. The new row reads the backend before Save (the Choice changed in the drawer is not written),
after Cancel (still not), and after Save (written, only that field, the table showing it). The old in-place editor
fails the row outright: its click opens no drawer.
