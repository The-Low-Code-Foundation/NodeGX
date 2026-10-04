---
id: P107-D33
title: Clear on a Number field reports Unchanged while it empties text the field was holding — it reads the author's Value and the output, not the field
status: needs-ruling
severity: low
area: runtime / Text Input (nodes/controls/text-input.ts `clear`)
found: P107 NSP-016 s38, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.3 (row D33); scenario "a Number field: Value null, then Insert Text 'ab' …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "a Number field: Value null, then Insert Text 'ab' puts text that is not a number in the field (Value stays null, Done); Clear reports Unchanged — it reads the author's Value and the output, both already empty — yet empties the field, so a Backspace then is Unchanged"
---

`clear` decides Unchanged by `_internal.text === empty && outputPropValues.onTextChanged === empty` (text-input.ts
:490). On a Number field the output reads `null` for any text that is not a number, so a field holding `ab` (an
Insert Text, or typed before the Type changed) with the author's Value `null` reads "already empty": Clear empties the
field and the start value (:496-504) and reports **Unchanged**. The field changed; a Backspace afterwards is Unchanged
where before it would have been Done.

**Proposed fix:** compare the field's text (the component's state, or `props.startValue`) as well. Small. The spec
models today's behaviour.
