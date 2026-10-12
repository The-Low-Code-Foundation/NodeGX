---
id: P109-S17-ENRICHEDSTALE
title: catalog:merge:check and docs:nodes:check were red from ISL-005 slice 1 — the enriched catalog and the Function's docs page had no `uses` row
status: fixed
commit: 5e5eba2c3
severity: low
area: build / node catalog (`node-catalog-enriched.json`, `docs-site/docs/nodes/custom-code/java-script-function.md`)
found: P109 ISL-005 build session 2, 2026-10-05
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Slice 7"
---

Slice 1 (`53e89d2f2`) ran `catalog:generate`, which added the Function's `uses` input to `node-catalog.json`, and did not
run `catalog:merge` or `docs:nodes`. On a pure `git archive HEAD` copy both checks report stale ("1 node(s) differing
(JavaScriptFunction)"). Fixed by regenerating both, in a scratch copy built from HEAD so a peer's uncommitted Page port in
`node-catalog.json` stayed out of the generated files.
