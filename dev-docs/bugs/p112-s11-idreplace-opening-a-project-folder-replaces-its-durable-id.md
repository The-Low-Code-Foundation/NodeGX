---
id: P112-S11-IDREPLACE
title: "Opening a project folder in the editor replaces the project's durable id with a new one and saves it — the backend-ownership key DSG-007 made durable"
status: fixed
severity: high
area: editor / launcher (`packages/noodl-editor/src/editor/src/utils/LocalProjectsModel.ts` `_addProject` :242-261 mints `guid()` and sets `project.id`; `loadProject` :185 sets `project.id = projectEntry.id`)
found: P112 OWN-011 s11, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §9
regression: packages/noodl-editor/tests-unit/own-011/openKeepsId.test.ts
commit: f2505b83f
---

**Measured** in the dev editor at `ec116ed5a` (scratch profile), on a copy of the project `@nodegx/mcp@0.1.0`'s
`create_project` made, opened through the launcher's own **Open project…** button (only the native folder dialog
doubled, returning the folder): `nodegx.project.json`'s `"id": "95de5bf2-…"` became `"id": "e5030348-…"`, written to
disk within a second of the open. A second copy opened the same way got a third id (`3434e7d0-…`).

**Why it matters.** DSG-007/F30 (`6410b34a8`) made `project.id` durable because it is *"the ownership key a backend is
bound to"* (`provisionBackend.ts` `findReusableBackend`), and its commit says *"Deliberately NOT minting on load …
Minting stays at creation."* `_addProject` is not only the creation path: **Open project…** (`openProjectFromFolder`)
and a git clone go through it too, and since DSG-007 its mint reaches disk. So any project that arrives with an id —
one an agent made, one cloned from a repository — gets a new identity on its first open on each machine: a backend it
already owns stops recognising it (not measured here), and two people sharing the project through git rewrite each
other's id.

**Why the obvious fix is wrong.** `const id = project.id ?? guid()` would also run for *New project from template*
(`_addProject` :422, after the template folder is copied), so every project made from a template carrying an id would
share that id and its backend. The fix has to tell "open what is there" from "make a new one", and say what a copied
folder is (HLT-011 already reports two rows claiming one durable id rather than resolving it).

Blocks OWN-011 AC2 (no change written on open beyond the three agent files).

**Fixed (R16, ruled 2026-10-11: "keep its own id; only making a new project creates one").** `_addProject(project, {
opened })`: `openProjectFromFolder` (Open project…, and a git clone) passes `opened: true` and the row takes
`idForOpenedFolder(project.id, dir, rows)` (`recentProjectRows.ts`); a template or a zip still mints. A copied folder
whose id another row already carries for a different folder mints too, so no path inside the editor makes the
collision HLT-011 reports. `tests-unit/own-011/openKeepsId.test.ts` 5/5 with the old rule as calibration; the copy
guard's mutant (`return id`) fails it. **Not yet driven in the editor** (the dev stack died of heap twice on a box at
load 20–32): owed, on the 0.4.0 draft or the next dev launch. Not changed: `loadProject` still stamps the row's id
over the file's — for a row this fix registered they are equal; a file whose id changed underneath (a teammate's
commit) is the remaining case.
