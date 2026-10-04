---
id: P107-C61
title: Font Family wired a truthy value that is not text throws in its setter — the node's update dies there
status: needs-ruling
severity: medium
area: runtime / every visual node with a text style (Button, Text, Checkbox, Text Input, Dropdown, Radio Button …)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C61); the Button's generated run (59 of 200 sequences at seed 20729)
kit: node-spec
regression: packages/noodl-runtime/test/node-spec/conformance.test.ts "NSP-016 §6 C61"
---

A visual node whose Font Family is wired a value that is not text — a number, an object, a `{ value, unit }` from
another port — throws inside its own setter, and the update that delivered it stops there: nothing after it in that
frame runs for the node.

**Where:** `packages/noodl-viewer-react/src/node-shared-port-definitions.ts` :2437-2442 (`addTextStyleInputs`'s
`fontFamily.set`): `if (value) { let family = value; if (family.split('.').length > 1) …` — `.split` on whatever
arrived. Every node that calls `addTextStyleInputs` / `addLabelInputs` shares it.

**Reproduce:** a scenario step `{ "set": "fontFamily", "value": 1 }` (or `true`, `{}`, `[]`, a date) on the runtime
target; the play dies with `family.split is not a function`. Measured s37 on every truthy non-string of the
generator's pool (11 of 20 values).

**Proposed fix:** `String(value)` before the `.split`, or treat a non-string as "no family" (the `else` branch,
`removeStyle`). One line; line-count neutral.
