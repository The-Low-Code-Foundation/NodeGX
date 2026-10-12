---
id: P109-S18-UNNAMEDROUTER
title: A Router written with no `name` is left out of the deployed router index, so every URL opens its start page
status: fixed
commit: 86d00461a
phase: P109
task: ISL-034
severity: medium
area: door / deploy (create_component accepts the Router; the deployed `projectData.routerIndex.routers` is empty)
found: P109 ISL-005 build session 3, 2026-10-05 (authoring the AC2 two-page project through the door)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Slice 6"; ISL-034 §8 s39
regression: packages/noodl-editor/tests-unit/isl-034/router-index.test.ts
---

An agent wrote `/App` through the door as `{ id: 'router', type: 'Router' }`, with no `name`, then two pages, which the door
registered in that Router (`pages.routes` lists both, `startPage` the first). `nodegx deploy` exited 0. In the deployed site,
`window.projectData.routerIndex` was `{ routers: [], pages: [olive, robot] }`, and `/robot`, `/Robot`, `/pages/robot` and
`/olive` all showed the start page (Olive). The same project with `parameters: { name: 'Main' }` on the Router served
`/robot` as the Robot page (`scripts/devtools/isl005-two-pages.ts`, 13/13). Nothing refused the unnamed Router or warned at
the write, the deploy or the page. Not measured: whether the editor names a Router when a person adds one, and which side
owns the fix (the write gate naming the gap, or the router index taking an unnamed Router).

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "The deployed app treats an unnamed Router as Main".** The index takes an unnamed Router as `Main`, as the runtime already does (P107 s57's question, asked with this row).

**Fixed 2026-10-10 (P109 s39, ISL-034, `86d00461a`) as ruled.** Re-measured first at `d3fc44f7b`: `getRouterIndex` still
filtered on a truthy name, and the Page Router spec (v5) and the runtime grade both modelled the filter. Now the index lists
every Router, a blank one as `Main`, and the runtime's `getPagesForRouter` reads a blank name as `Main` (it used to take the
first router for `undefined` and nothing for `''`). Page Router spec v6, runtime grade 139/139 at seeds 13 and 20732. The
deployed drive `scripts/devtools/isl034-unnamed-router.ts` (door → `nodegx deploy` → Chrome) reads 6/6. Its control, the
deploy engine with the two old lines patched back, reads `routers: []` and `/olive` showing the start page. Still not
measured: whether the editor names a Router when a person adds one. It no longer matters for this row.
