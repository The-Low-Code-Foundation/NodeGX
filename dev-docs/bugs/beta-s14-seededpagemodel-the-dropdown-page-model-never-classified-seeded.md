---
id: BETA-S14-SEEDEDPAGEMODEL
title: "node-spec's page-model test was red for the Dropdown from 2026-10-25: DROPDOWNSTALE's new state key `seeded` was never classified (\"G1 seeded: classified 0 times\")"
status: fixed
commit: 7083a8595
fixed: 2026-10-27, the Beta sweep s14 — `seeded` named in the Dropdown's page model as node bookkeeping
severity: low
area: node-spec / tests (`packages/nodegx-node-spec/tests/page-model.helper.ts`, the `net.noodl.controls.options` model)
kit: node-spec
found: the Beta sweep s14, 2026-10-27, running node-spec's spec-edit tests for BETA-S7-DROPDOWNFOCUSDIVERGE
evidence: "net.noodl.controls.options keeps React out of its state (G1–G8)" red with "G1 seeded: classified 0 times", identical with HEAD's dropdown.ts and scenarios swapped in
regression: packages/nodegx-node-spec/tests/page-model.test.ts "net.noodl.controls.options keeps React out of its state (G1–G8)"
---

A test gap, not a product defect, and this sweep's own: P121-TWO005-DROPDOWNSTALE (33ae2817f, the Beta sweep s7) added
the Dropdown state key `seeded` (`options.ts` `_internal.valueIsSeed`, whether the value is still the placed node's
"Option 1") and graded the change on the runtime, but not with node-spec's page-model test, whose G1 requires every state
key to be classified once (node, page attribute, held by the page, or frame end). The test was red from that commit.

**Fixed (s14):** `seeded` is in the model's `node` list (the node's own bookkeeping, nothing React or the page holds).
page-model.test 20/20.
