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

**s28 read (2026-10-30, not measured):** not Studio alone. Studio's `fieldsOf` keeps createdAt/updatedAt when the
backend's table lists them, but a Record's read ports are `fieldPorts` over its schema
(`noodl-runtime/src/nodes/std-library/data/schema-ports.ts`), and the project file's `dbCollections` columns hold no
built-in dates, so whether `prop-createdAt` exists depends on which schema the editor, the preview and the validator
were given. Measure first: a Record of a type with only declared columns, read in the in-page preview and by
`validate_component`: does `prop-createdAt` exist, and does it carry the date? Then either the runtime offers the two
built-in dates on every Record's read side (one change, every surface), or Studio declares nothing and the row's ⚡
names them only where the port exists.
