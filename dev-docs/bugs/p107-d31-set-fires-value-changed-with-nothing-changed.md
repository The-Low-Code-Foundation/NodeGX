---
id: P107-D31
title: Text Input's Set fires Value Changed and reports Done when the field already holds the Value — "Fires whenever the Value output changes" is not what it does
status: fixed
commit: a969b4b31
phase: P109
task: ISL-031
severity: low
area: runtime / Text Input (nodes/controls/text-input.ts)
found: P107 NSP-016 s38, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.3 (row D31); scenario "Run On Value Change off: Value 'a', Set (Done, Value 'a'), the same Value again (ignored), Set again" in packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.textinput.json "Run On Value Change off: a Value is stored and the field keeps what it shows; Set puts it in the field (Done, Value, Value Changed); a second Set is Done again and fires Value Changed again with nothing changed"
---

**Value Changed**'s description: "Fires whenever the Value output changes". A **Set** whose Value is already in the
field fires it anyway and reports **Done**: `setText` (text-input.ts :521-529) hands the text to the component, whose
`setText` (TextInput.tsx :89-95) calls `onTextChanged` on every call, and `onChange` (text-input.ts :374-378) sends the
signal without comparing. The Value input itself is guarded (:226, a repeat is ignored); Set is not.

**Proposed fix (for a ruling):** either Set compares the field's text first (Unchanged, no signal — the ERG-001
register's reading), or the description says "Fires whenever a value is written into the field, changed or not". The
spec models today's behaviour.

**Ruled 2026-10-05 (Track F rulings page), against the recommendation ("Stay quiet, report Unchanged"): "Keep it, fix the description".** Nothing changes in apps. Value Changed is described as firing whenever Set or a person writes into the field, changed or not. The question as asked: *"Should Set stay quiet when the field already holds the value?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed a969b4b31 (P109 ISL-031, 2026-10-06), as ruled ("Keep it, fix the description").** Wording only: Value Changed now says it fires each time a value is written into the field (Set, Value, Insert Text, Backspace, Clear or the person typing), whether or not it changed, and that a write made off the page is announced when the field comes back. Viewer node, spec, docs page, both catalogs.
