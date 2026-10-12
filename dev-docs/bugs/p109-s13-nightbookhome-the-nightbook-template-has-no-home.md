---
id: P109-S13-NIGHTBOOKHOME
title: The Nightbook template has no home page — its project file carries no rootNodeId, the D9 shape again
status: scheduled
phase: P109
task: ISL-037
severity: medium
area: template / templates/nightbook (generator packages/noodl-mcp/tests/tpl011Template.ts — both untracked since 2026-09-27/28)
found: P109 s13, 2026-10-04, census for ISL-016's ruling
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-016-THE-DOOR-WRITES-THE-PROJECT-SETTINGS-AND-THE-HOME-PAGE.md
---

Census of the 13 template folders under `templates/` (each `nodegx.project.json` and `_registry.json` read with
`node`): 12 carry `rootNodeId`; **`nightbook` does not**, and none of its registry rows is typed `root`. Its settings
are `{htmlTitle: "Nightbook", navigationPathType: "path", bodyScroll: true}` with no `rootComponent`.

The editor finds the home only from `rootNodeId` (`noodl-editor/src/editor/src/models/projectmodel.ts:267`), so by
source the template opens with no home — P78 register D9's "ERROR — No HOME component selected". **Predicted from
source, not driven in the editor.** Its generator `tpl011Template.ts` is one of the two that call `writeSkeleton` but
not `pinRootNode`. The other, `sb007Template.ts`, names its home another way (`rootComponent: '/App'`, which the
embedded provider resolves, `sb007Template.ts:334-337`); `tpl011Template.ts` does neither, so the generator-side fix
D9 put in the other eight never reached it.

Both files are untracked and unchanged since 2026-09-27/28; owner not found in a task README (P91 cites Nightbook's
policy). Not touched by P109. ISL-016 (the door writes the home) is the product fix: with it, the generator calls one
tool instead of copying `pinRootNode`.
