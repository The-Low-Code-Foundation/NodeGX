---
id: P109-S21-DROPDOWNEMPTYRESET
title: The Dropdown spec thinks the hidden option is still selected after Items offered no options, so a person choosing the first option of the next list reads as a change the browser never raises
status: fixed
phase: P109
task: ISL-045
severity: low
area: node-spec / Dropdown (`net.noodl.controls.options`, dropdown.ts `painted`, the `domSelected` model)
found: P109 s21 (ISL-026, writing C70's scenarios), 2026-10-06
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.options.json (the two P109-S21-DROPDOWNEMPTYRESET scenarios), graded on the runtime by packages/noodl-runtime/test/node-spec/conformance.test.ts
evidence: P109 s21 handoff; measured with a temporary scenario on the runtime target at seed 20732
---

Write Items an empty list (`[]`, a legal value), paint, then write a list of one option `x`, paint, and a person
chooses `x`. The spec (v4, and v3 before it) sends Value `x` and Changed. The runtime sends neither: the browser had
already selected `x`, so the choice is no change.

HTML's selectedness rule: when an option is inserted into a `<select>` of display size 1 that has no selected option,
the first option that is not disabled is selected. After the empty list left the node's value unoffered, nothing is
selected (the hidden empty option is disabled), so `x` is selected the moment it is inserted. The spec models the
browser's reset only for "a selected option left the list", not for "an option arrived in a list with no selection",
and keeps `domSelected` at the hidden option.

Measured: a temporary scenario `settle, items [], settle, items [{X,x}], settle, choose x, settle`. The spec says
`value x`, the runtime says `onFocus` only (first difference at event 16). The same gap showed through a number on
Items (C70's v4 reads it as no options), which is how it was found; C70's scenario now chooses the second of two
options to stay clear of it.

Fix (P107, the Dropdown spec): in `painted`, when the element selects nothing and the list offers an enabled option,
select the first enabled one (`domSelected`), as the reset for a departing option already does. Then add the
scenario above.

**Fixed (P109 s44, 2026-10-11): Dropdown v7, the spec correcting itself.** Re-measured first, with the scenario
above added to the Dropdown's scenarios: the runtime still differed at event 16 (62/63). The fix differs a little from
the proposal. The spec had one value, `''`, for two states that HTML treats differently:

- The hidden option is selected. A fresh element does this, because its hidden option carries `selected`
  (Select.tsx :220). An option that arrives later is not selected.
- Nothing is selected. This happens when the selected option leaves and no enabled one is left. The next enabled
  option to arrive is selected.

`domSelected` is now `null` for the second state. A control scenario covers the first: a fresh dropdown offered nothing,
whose first arriving option, chosen, is a change. Both scenarios pass on the runtime (63/63, mutants 653/658 as before).
No existing golden trace moved, and `spec-golden:check` holds. The `changes` entry is `migration: none`, because the
runtime did not change.

Stranger round 4's plain-DOM engine followed v6's text. It gets the same two lines, marked not the stranger's line (as
ISL-031 did for v5 and v6). Its hashes are refreshed, and the plant in `page-model-plants.test.ts` is re-anchored.
