---
id: P112-OWN008-LIBRARYFIRST
title: "The in-page preview's `nodeLibrary` is `undefined` until it has rendered an app, so an editor's node picker can't be filled before the person's app runs"
status: open
phase: P112
task: OWN-008
severity: low
area: "`@nodegx/preview` `src/inPage/index.ts` (`libraryFor` runs only inside `update`)"
found: P112 OWN-008, 2026-10-18 (the strangers' reports)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/table/REPORT.md (question 6)
kit: preview
---

The table stranger wanted the runtime's node types for its columns without running the person's app. It booted the
preview on a hand-made one-Group project, read `nodeLibrary` and disposed of it, guessing the project's shape. The
preview already does exactly that inside (`BOOT_PROJECT`, `libraryFor`), but only as part of `update(files)`.

**Fix shape:** `preview.loadNodeLibrary(files?)` (or `NodegxPreview.nodeLibrary(runtimeBase)`) that boots the same
hidden page and returns the library, with no app on screen.
