---
id: P123-GH-NOCREATEDAT
title: A record's own "when it was made" cannot be shown: createdAt is in no ⚡ menu and no row
status: open
severity: medium
area: nodegx-studio / repeating group row inputs, ⚡
found: STU-091 Greenhouse, a whole app built through Studio's UI over CDP, 2026-10-30
evidence: nodegx-studio docs/SCOPE.md § STU-091 (the build, the measurements); project ~/vscode_projects/NodeGX test projects/Greenhouse
---

Data → Map says every type has "Built in: its id, when it was made and last changed", but a repeating group's row
gets Component Inputs only for the declared fields (Watering row: id, plant, note) and ⚡ offers nothing else, so a
history list cannot say when each row was made. Greenhouse added its own Date field `at`, stamped by a backend
workflow, to show "💧 Fri 30 Oct, 15:49".

Fix: offer createdAt / updatedAt wherever a record's fields are offered (row inputs, This page's thing, ⚡).
