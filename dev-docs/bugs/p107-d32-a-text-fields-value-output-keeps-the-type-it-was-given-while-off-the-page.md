---
id: P107-D32
title: A text-type Text Input given a number publishes '5' (text) while on the page and 5 (a number) while off it — the Value output's type depends on whether the field is mounted
status: fixed
commit: 0a6bb1d90
phase: P109
task: ISL-031
severity: low
area: runtime / Text Input (nodes/controls/text-input.ts, controls/textInputValue.ts)
found: P107 NSP-016 s38, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.3 (row D32); scenario "a text field given the number 5 while on the page publishes '5' (text); given 6 while OFF the page publishes the number 6" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "a text field given the number 5 while on the page publishes '5' (text); given 6 while OFF the page publishes '6' (text) too — one type whatever the field's visibility (v3; was row D32: off the page it published the number 6)"
---

On the page, the component makes every value text first (TextInput.tsx :92 `String(value)`) and the output carries
`'5'`. Off the page, `setText` (text-input.ts :535) hands the raw value to `outwardValueForFieldType`, which returns a
non-Number field's value AS IS (textInputValue.ts :50) — so the output carries the number `5`, an object stays an
object. FB-026's note at :531-535 meant to make the two paths agree about the type; they agree for a Number field and
differ for every other.

**Proposed fix:** `String(text)` before `outwardValueForFieldType` on the unmounted path (and in `edit`'s and `clear`'s
unmounted paths, which already start from `String(startValue)`). One token. The spec models today's behaviour.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Always text".** Value has one type whatever the field's visibility. One-word change on the hidden path. The question as asked: *"Should a text field's Value always be text, shown or hidden?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 0a6bb1d90 (P109 ISL-031, 2026-10-06), as ruled ("Always text").** Off the page setText makes the value text as the component does on it, and compares it as it would be published. Spec v3. A Set of nothing off the page now empties the output to '' (the s40 deep-run scenario renamed). Control: red on exactly those two scenarios and 6 generated sequences.
