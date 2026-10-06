---
id: P109-S21-DROPDOWNEMPTYRESET
title: The Dropdown spec thinks the hidden option is still selected after Items offered no options, so a person choosing the first option of the next list reads as a change the browser never raises
status: open
severity: low
area: node-spec / Dropdown (`net.noodl.controls.options`, dropdown.ts `painted`, the `domSelected` model)
found: P109 s21 (ISL-026, writing C70's scenarios), 2026-10-06
kit: node-spec
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
