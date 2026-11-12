---
id: P123-GH-DATEUTC
title: App data shows date fields in UTC, an hour off what the person typed
status: fixed
severity: low
area: nodegx-studio / Data → App data table
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
commit: nodegx-studio 393f376 (editor/data.mjs cellWords)
regression: ../nodegx-studio/editor/data-check.mjs "P123-GH-DATEUTC: a date reads back as the time that was typed, this computer's, not UTC"
---

Entered lastWatered 15:02 (local, CET) in New entry; the table shows 14:02, and created shows 14:02 at 15:02 local.
The form takes local time and the table prints UTC. Fix: print local time (and say the zone).

Fix (2026-10-30, s29, with STU-095): `cellWords` says a Date in this computer's time, the same arithmetic as
`editText` (the date field's), so the table, the record panel and the *created* column agree with what was typed; a line
under the table names the zone ("Dates and times are this computer's (Europe/Paris)").

Graded: `check:data` row: `2026-10-30T15:02` typed reads back `2026-10-30 15:02` in Europe/Paris (the old `toISOString`
gives 14:02).
