---
id: P123-GH-DATEUTC
title: App data shows date fields in UTC, an hour off what the person typed
status: open
severity: low
area: nodegx-studio / Data → App data table
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Entered lastWatered 15:02 (local, CET) in New entry; the table shows 14:02, and created shows 14:02 at 15:02 local.
The form takes local time and the table prints UTC. Fix: print local time (and say the zone).
