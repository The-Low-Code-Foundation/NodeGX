---
id: P107-C65
title: A Checkbox whose Label is wired an object or an array crashes the page's render — "Objects are not valid as a React child"
status: needs-ruling
severity: high
area: runtime / Checkbox (components/controls/Checkbox/Checkbox.tsx) — and any control that renders its label without String()
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C65); the Checkbox's generated run at seed 13 (sequence 1891123873)
kit: node-spec
regression: packages/noodl-runtime/test/node-spec/conformance.test.ts "NSP-016 §6 C65"
---

A Checkbox with Enable Label on whose **Label** is wired an object — an Object node's record, a row of a list, a
`{ value, unit }` from a size port — throws inside React's render the next time the page paints: `Objects are not
valid as a React child (found: object with keys {a})`. In the app that is the React root erroring: the whole page,
not one node. A number or a boolean renders as its text; only objects and arrays throw.

**Where:** `packages/noodl-viewer-react/src/components/controls/Checkbox/Checkbox.tsx` :205-207 — `{props.label}`
rendered as it is. The Button renders `String(props.label)` (Button.tsx :98, :104) and is immune; the other controls
with a label (Radio Button, …) are to be measured the same way.

**Reproduce:** `{ "set": "label", "value": { "a": 1 } }` with Enable Label on, then any paint (a settle or a person's
act) on the runtime target.

**Proposed fix:** `String(props.label)` as the Button does. One token.

**Second instance (P107 NSP-016 s38, 2026-10-04): Text Input.** TextInput.tsx :273-275 renders `{props.label}` raw inside the
`<label>` the same way; measured in the Text Input's generated runs (3 of 200 at seed 20730, known row C65 in
`conformance.test.ts`). The same one-token fix.

**Third and fourth instances (P107 NSP-016 s39, 2026-10-04): Dropdown.** Select.tsx :245 renders `{props.label}` raw inside
the `<label>`, and :182 renders `{props.placeholder}` raw in the span while nothing is selected — a Placeholder wired an
object crashes the render the same way (measured in the Dropdown's generated runs at seed 13: 2 runs on Label, 1 on
Placeholder; known rows C65 `objectLabel` and `objectPlaceholder` in `conformance.test.ts`). `String()` on both.