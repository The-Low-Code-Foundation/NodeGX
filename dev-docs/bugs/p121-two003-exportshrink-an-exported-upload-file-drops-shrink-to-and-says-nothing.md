---
id: P121-TWO003-EXPORTSHRINK
title: An exported Upload File sends the photo at full size — Shrink To and Photo Quality are dropped with no note
status: open
severity: medium
area: export / Upload File (`packages/nodegx-export/src/analyze/plan.ts` `compileFileUpload`)
found: P121 TWO-003 s4, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §7.5
---

P121 s4 gave Upload File two inputs, **Shrink To** (`shrinkTo`, the longer side in pixels; 0 is off) and **Photo
Quality** (`photoQuality`), which make a photo smaller in the browser before it is sent
(P121-TWO008-UPLOADSHRINK; `packages/noodl-viewer-react/src/nodes/std-library/shrinkphoto.ts`). The code export does
not know them: a project that sets them exports to an app that uploads every photo as picked (a phone's 3 to 8 MB),
and neither the emitted code nor the export's notes say so.

`compileFileUpload` refuses by name a named Backend, any File Location input and the outputs it does not publish; it
reads `private` and `file`; it never looks at `shrinkTo` or `photoQuality`.

Measured 2026-10-14: `tests/fixtures/photo-desk` exported as it is and with `shrinkTo: 1600, photoQuality: 70` set on
its Upload File (`parseProject` → `emitApp`, a scratch spec, deleted): 20 files both times, identical line for line,
and no mention of "shrink" anywhere in either.

Fix, proposed: either transcribe `shrinkphoto.ts` into the export's `src/api/files.ts` (it has no runtime
dependencies: `createImageBitmap`, a canvas, `toBlob`) and pass the two values to `uploadFile`, or, until then, defer
by name when `shrinkTo` is set above 0 or wired, the way the File Location inputs are. The ledger row for Upload File
(`coverage-ledger.json`) names its refusals and would gain this one. Small either way. Owner: P18 (code export).
