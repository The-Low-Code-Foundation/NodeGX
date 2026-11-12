---
id: P123-GH-ROWFROZEN
title: A field added to a type never reaches a repeating group row made before it
status: fixed
commit: nodegx-studio fcb1b81
severity: medium
area: nodegx-studio / repeating group row (Rows/<Type> row Component Inputs)
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Placing a repeating group makes `Rows/<Type> row` with one Component Input per field of the type at that moment.
A field added afterwards (Watering.at) never appears there, and Studio has no control to add an input to a reusable,
so the row cannot show it. Greenhouse's `at` input was added by the agent (MCP update_component `ports`).

Fix: when a type gains a field, add the input to every row made for that type (they are Studio's own), or let the
row's ⚡ add one.

## Fixed 2026-11-02 (nodegx-studio fcb1b81)

A field added to a type in Data becomes a Component Input on every `Rows/<Type> row` (its Component Inputs "One <Type>") made before it, in the same edit as the field (`rowsGainField`, through `editProjectFollowing`, so one Undo). Nothing else in the row changes; a person shows it with ⚡ on a Text in the row. Gate row in `check:editor`: Note gains `mood`, and the existing Note row's inputs read id, title, createdAt, updatedAt, mood. Not built: a field deleted or renamed is not followed in rows (rename follows through `renameField` as before). Studio gates, one at a time on 2026-11-02: editor 259/259, data 91/91, hosted 46/46, functions 695/695 + 50/50, the rest green (check:app could not run: the screen was locked, see P123-STU008-APPCHECKPUBLISH).
