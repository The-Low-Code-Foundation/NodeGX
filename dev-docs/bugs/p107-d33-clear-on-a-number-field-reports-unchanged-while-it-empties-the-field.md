---
id: P107-D33
title: Clear on a Number field reports Unchanged while it empties text the field was holding — it reads the author's Value and the output, not the field
status: fixed
commit: 70621abcc
phase: P109
task: ISL-031
severity: low
area: runtime / Text Input (nodes/controls/text-input.ts `clear`)
found: P107 NSP-016 s38, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.3 (row D33); scenario "a Number field: Value null, then Insert Text 'ab' …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "a focused Number field: Value null, Insert Text 'ab', then Set — the keyboard is on the field, so Set lands only in the start value (Unchanged) and the field keeps 'ab'; Clear reads the field, not the start value: Done, and the field is empty"
---

`clear` decides Unchanged by `_internal.text === empty && outputPropValues.onTextChanged === empty` (text-input.ts
:490). On a Number field the output reads `null` for any text that is not a number, so a field holding `ab` (an
Insert Text, or typed before the Type changed) with the author's Value `null` reads "already empty": Clear empties the
field and the start value (:496-504) and reports **Unchanged**. The field changed; a Backspace afterwards is Unchanged
where before it would have been Done.

**Proposed fix:** compare the field's text (the component's state, or `props.startValue`) as well. Small. The spec
models today's behaviour.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Check the field's text".** Clear reports Done whenever it empties something. Small change in one file. The question as asked: *"Should Clear check the field's own text when it decides whether anything changed?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 70621abcc (P109 ISL-031, 2026-10-06), as ruled ("Check the field's text").** Clear's "already empty" reads the field's own text: the component's (kept at once in TextInput.text) on the page, the start value off it. The start value alone misses a Set that met a focused field, and `state.value` lags a write earlier in the frame (Clear, Clear in one frame) — both measured. Spec v4; a scenario added for the focused Set. Controls: red on exactly the two D33 scenarios; the start value alone, on the focused one.
