---
id: P100-UPG001-VARIANT
title: The export report says the inert `_variant` / `_size` marker was dropped
status: open
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
