---
id: P123-GH-ROWFROZEN
title: A field added to a type never reaches a repeating group row made before it
status: open
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
