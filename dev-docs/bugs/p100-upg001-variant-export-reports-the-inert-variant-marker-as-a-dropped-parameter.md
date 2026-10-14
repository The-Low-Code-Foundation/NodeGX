---
id: P100-UPG001-VARIANT
title: The export report says the inert `_variant` / `_size` marker was dropped
status: fixed
regression: packages/nodegx-export/tests/p100-upg001-variant.test.ts (the marker row red on HEAD's loop; the dropped-parameter control and the drift row green on both)
phase: P109
task: ISL-043
severity: low
area: export / report
found: P100 UPG-001 s6 (§3.8), 2026-09-23; re-read at HEAD 2026-10-01
evidence: dev-docs/tasks/phase-100-0.3.0-the-first-upgrade/UPG-001-THE-BREAK-CENSUS.md §3.8 (*members area Richard test*)
---

Exporting a project whose node still carries the old preset marker writes *"parameter _variant … has no
style/content mapping — dropped, reported"* into `EXPORT-REPORT.md`. Nothing is lost: no runtime, viewer or
exporter reads the marker in either release (§3.4). The line makes a person think part of their design was
left out.

**Where:** `packages/nodegx-export/src/emit/component.ts:373-381`, the unmapped-parameter loop, which skips
`visible`, `mounted` and an authored `cssClassName`, but not the markers. The editor already names them:
`PRESET_MARKERS = ['_variant', '_size']` in `packages/noodl-editor/src/editor/src/models/Looks/looks.ts:36`.

**Proposed:** skip the two markers in that loop, ideally from one shared constant the editor and the exporter
both import. One line plus a spec. Small.

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** It still fired at HEAD: a heading carrying
`_variant` / `_size` was reported as "parameter _variant … dropped". The loop now skips `PRESET_MARKERS`. On the
proposal's "one shared constant": the export may not import the editor (HLS-001 AC2), and `@noodl/types` holds no such
list. So `component.ts` exports its own copy and the spec reads the editor's `looks.ts` as text, failing the day the
two lists differ. The control is a parameter nothing maps, still reported on the same node in the same run. No corpus
project carries a marker, so the golden did not move. The spec reads 3/3, and `export-report` plus the golden 34/34.
