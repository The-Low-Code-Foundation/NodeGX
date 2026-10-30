---
id: P123-GH-APPDATAINLINE
title: App data edits a live record in place on a click, so a stray click can change real data
status: open
severity: high
area: nodegx-studio / Data → App data table
found: STU-091 Greenhouse, Richard's play test in NodeGX Studio, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes (2026-10-30)
phase: P123
task: nodegx-studio docs/SCOPE.md § Richard's Greenhouse notes
---

Richard (Greenhouse, 2026-10-30): *"Editing the 'App data' inline in the viewer is dangerous, that's why I stopped using
NocoDB because the chances of accidentally clicking and fucking up real data is enormous. Go back to clicking a record and
having it open in a sidebar or modal … It makes it easier to deal with relational fields and date fields."*

A ruling already given: the table is read-only; a click on a row opens that record in a side panel with a field per
column (links as pickers, dates as date fields), and Save/Cancel; nothing is written until Save. Task: nodegx-studio
docs/SCOPE.md STU-095.
