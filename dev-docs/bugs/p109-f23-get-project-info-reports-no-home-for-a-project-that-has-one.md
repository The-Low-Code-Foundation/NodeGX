---
id: P109-F23
title: `get_project_info` reports no root component for a project whose file names one (`rootNodeId`), and no door can set the home
status: scheduled
phase: P109
task: ISL-016
severity: medium
area: mcp / get_project_info + project settings
found: P109 ISL-016 scoping, 2026-10-01, on the shipped `templates/bot-garden` (audit P109 F23)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F23; ISL-016 §2
---

An agent asks the door what the project's home is and is told nothing, although the project has one. For the shipped
garden, `nodegx.project.json` says `rootNodeId: "app_root"`, but `get_project_info` answers `rootComponent: undefined`,
because it reads only a registry row typed `root` and `App` is registered `visual` (121 `visual`, 6 `page`). Nothing
the agent can call writes `rootNodeId` or settings on a bound project, and no validator rule names a missing home, so
an agent building into an existing folder can ship an app with no home (register D9) without being told.

**Where:** `packages/noodl-mcp/src/tools/read.ts:143` (`find(([, e]) => e.type === 'root')`) and `:156`;
`create_component` cannot make `root` (`src/vocabulary.ts:189`); only `create_project` writes `rootNodeId`
(`src/tools/createProject.ts:154-202`). Re-read at HEAD `d2b2f0101`.

**Reproduce:** bind the server to `templates/bot-garden`, call `get_project_info` → no `rootComponent`.

**Workaround:** every generator hand-writes the project file and `pinRootNode` (`packages/noodl-mcp/tests/templatePins.ts:109-120`).

**Proposed:** read `rootNodeId` as the home in `get_project_info`; add a settings/home write to an existing deferred
group (🔒 ISL-016 asks whether it overwrites). Small (the report) + medium (the door).
