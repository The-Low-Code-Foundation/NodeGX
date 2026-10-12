---
id: P112-S12-CREATEDLOST
title: "When the editor writes `nodegx.project.json` for a real change, it drops `created` and stamps `nodegxVersion: \"1.1.0\"`"
status: open
severity: low
area: editor / project-level save (`packages/noodl-editor/src/editor/src/io/ProjectExporter.ts` `buildProjectV2File`; `ProjectImporter` and `ProjectModel` carry no project-level `created`)
found: P112 OWN-013 s12, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-013-THE-0.4.0-CUT.md §7
---

**Measured** in the dev editor at `1ed87f2ef`. A 0.3.0 project (`Deadline Desk`, format 4) opened in 0.4.0 is saved
once on purpose (its format moves to 5). The written `nodegx.project.json` has no `created` (the file had
`2026-08-28T21:49:25.847Z`) and says `nodegxVersion: "1.1.0"` (the file had `"0.1.0"`; no product is version 1.1.0 —
the editor is 0.4.0). Any later save for a real change does the same to a project the npm kit made.

**Why.** The importer reads no project-level `created`, `ProjectModel` has no field for it, and `buildProjectV2File`
writes the literal `'1.1.0'`. This was the second half of P112-S11-OPENWRITES; the first half (every open rewrote the
file) is fixed.

**Not a blocker:** nothing reads either field back (not measured beyond a grep of the editor and the MCP).
