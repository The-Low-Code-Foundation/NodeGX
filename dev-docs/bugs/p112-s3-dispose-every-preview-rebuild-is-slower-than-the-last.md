---
id: P112-S3-DISPOSE
title: "Every `noodl-preview` rebuild is slower than the last — about 200 ms more per save on the todo template"
status: fixed
severity: medium
area: preview / loader (noodl-preview CLI; the in-page preview it shares the export with)
kit: preview
found: P112 OWN-004 s3, 2026-10-10
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-004-THE-REAL-APP-BESIDE-IT.md §6.1
regression: packages/noodl-preview/scripts/in-page-check.mjs
commit: 0aa8954f1
---

Point `noodl-preview` at a project, keep saving, and the page takes longer to come back each time. Measured on a copy
of the todo template, one space appended to a component file every 2 s, the CLI's own "rendered in" line:

| save | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| before | 256 ms | 425 | 647 | 825 | 1,036 | 1,240 | 1,456 | 1,668 |
| after the fix | 250 ms | 212 | 197 | 194 | 189 | 191 | 190 | 189 |

The in-page preview (OWN-004) showed the same in a loop of ten exports: 737 → 3,257 ms before, flat at ~690 ms after.

**Where:** `packages/noodl-preview/src/loader.ts` `loadPreview` builds a new `ProjectModel` for every snapshot and never
disposed it. A `ProjectModel` registers listeners on the one `NodeLibrary` (`projectmodel.ts:233`) and so does every
component's graph (`NodeGraphModel.ts:231, 273, 291, 298`); only `ProjectModel.dispose()` removes them. Each rebuild
left one more project's worth of listeners for the next one to run through.

**Fixed:** `loadPreview` disposes the model once the build is made (the build keeps no reference to it), and the
in-page export does the same (`src/inPage/exportInPage.ts`). `nodegx deploy` builds one model per process and exits,
so it never accumulated.
