---
id: P109-S18-UNNAMEDROUTER
title: A Router written with no `name` is left out of the deployed router index, so every URL opens its start page
status: scheduled
phase: P109
task: ISL-034
severity: medium
area: door / deploy (create_component accepts the Router; the deployed `projectData.routerIndex.routers` is empty)
found: P109 ISL-005 build session 3, 2026-10-05 (authoring the AC2 two-page project through the door)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Slice 6"
---

An agent wrote `/App` through the door as `{ id: 'router', type: 'Router' }`, with no `name`, then two pages, which the door
registered in that Router (`pages.routes` lists both, `startPage` the first). `nodegx deploy` exited 0. In the deployed site,
`window.projectData.routerIndex` was `{ routers: [], pages: [olive, robot] }`, and `/robot`, `/Robot`, `/pages/robot` and
`/olive` all showed the start page (Olive). The same project with `parameters: { name: 'Main' }` on the Router served
`/robot` as the Robot page (`scripts/devtools/isl005-two-pages.ts`, 13/13). Nothing refused the unnamed Router or warned at
the write, the deploy or the page. Not measured: whether the editor names a Router when a person adds one, and which side
owns the fix (the write gate naming the gap, or the router index taking an unnamed Router).
