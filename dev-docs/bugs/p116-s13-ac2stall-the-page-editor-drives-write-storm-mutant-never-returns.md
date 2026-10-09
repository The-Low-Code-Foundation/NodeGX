---
id: P116-S13-AC2STALL
title: The page editor drive hangs in its own write-storm MUTANT arm, run alone — every one of its 28 specs reads as a timeout
status: open
severity: medium
area: tests / site builder page editor (SBR-007 AC2) — `packages/nodegx-backend/tests/ac2-page-editor-drag-drive.test.ts`, the arm after "defect restored — D31 restored on 3 nodes, 9 keys"
found: P116 s13, 2026-10-09 (a whole nodegx-backend run, then twice alone)
evidence: packages/nodegx-backend/tests/ac2-page-editor-drag-drive.test.ts "MUTANT — putting the three parameters back to `true` brings the whole storm back"
---

The drive that proves a section drag on the real page editor never finishes. Its `beforeAll` captures every reading
once, and that `beforeAll` hangs, so all 28 specs report "Exceeded timeout" and grade nothing.

Measured 2026-10-09: in the whole `-w 2` backend run (22:42–23:12 CEST) it failed 28/28 on the timeout. Then **alone,
twice, with nothing else running** (`pgrep` checked), on HEAD `1b5774b23` plus P116 s13's delete-path edit. Both runs
stalled past 10 minutes; P99 HLT-023 (2026-09-23) and P104 BMG-005 had recorded it as 28/28 alone in about 293 s, and as
stalling only beside another browser drive. The drive's console stops right after `defect restored — D31 restored on
3 nodes, 9 keys`, the MUTANT arm that turns the page editor's write storm back on. Its headless Chrome sits at 0% CPU,
and a CDP `Runtime.evaluate` on the page (`/admin/page/<id>`, "Edit page") never returns.

Not P116's delete path: a jest setup file wrapping `deleteKeepingLinks` logged **0 calls** for the whole stalled run,
in the same process. The same tracer logged 84 lines on `ont-003-target-goes` as its known-firing control. The
backend runs in-process (`new BackendService`), and cloud functions reach it over loopback.

Not measured: which commit since 2026-09-23 made the arm hang alone, and whether the arm now waits for a storm that no
longer settles or the page blocks its own debugger. The viewer bundle it renders
(`packages/noodl-editor/src/external/viewer/noodl.viewer.js`) was built 2026-10-09 18:53; rebuild it first.
