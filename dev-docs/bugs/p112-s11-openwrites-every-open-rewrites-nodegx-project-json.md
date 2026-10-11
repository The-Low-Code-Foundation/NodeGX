---
id: P112-S11-OPENWRITES
title: "Every open of a v2 project rewrites `nodegx.project.json` (a new `modified`); the first also drops `created` and stamps a hard-coded `nodegxVersion: \"1.1.0\"`"
status: open
severity: medium
area: editor / project-level save (`packages/noodl-editor/src/editor/src/services/ProjectStructure/index.ts` `seedProjectLevelHashes` :263 vs `saveProjectLevelFiles` :494-531; `packages/noodl-editor/src/editor/src/io/ProjectExporter.ts` `buildProjectV2File` :433-471)
found: P112 OWN-011 s11, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §9
---

**Measured** in the dev editor at `ec116ed5a` on copies of the project `@nodegx/mcp@0.1.0` made, opened through
**Open project…**:

| open | what changed in `nodegx.project.json` |
|---|---|
| first | `id` replaced (P112-S11-IDREPLACE); `nodegxVersion` `"0.1.0"` → `"1.1.0"`; `created` removed; `"metadata": {}` added; keys reordered; `modified` |
| second, third (same folder, nothing done in between) | `modified` only — every time |

So in a git-tracked project, merely opening it leaves `nodegx.project.json` modified, every time.

**Why.** FLD-009's guard writes a project-level file only when its hash moved since load, but the baseline is hashed
from the importer's output (`seedProjectLevelHashes(project)` right after `importer.import`), while the save hashes
`buildProjectV2File(ProjectModel.toJSON())` — and `toJSON` carries defaults the import did not (`metadata: {}` at
least). The two never agree, so the first save after any open rewrites the file even when nothing changed.
`buildProjectV2File` also writes the literal `nodegxVersion: '1.1.0'` (no product is version 1.1.0: the editor is
0.3.0, the MCP 0.1.0) and has no `created` branch, so a field the format allows is lost.

Not measured: what triggers the save on an open where no component changed (third open: no component file moved).

Blocks OWN-011 AC2 (no change written on open beyond the three agent files).
