---
id: P107-C61
title: Font Family wired a truthy value that is not text throws in its setter — the node's update dies there
status: fixed
commit: ccda9ef0b
phase: P109
task: ISL-026
severity: medium
area: runtime / every visual node with a text style (Button, Text, Checkbox, Text Input, Dropdown, Radio Button …)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C61); the Button's generated run (59 of 200 sequences at seed 20729)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Text.json "Font Family wired a number: treated as no family — nothing moves on the wire and the node keeps working"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Treat it as no family".** The node falls back to its default font and the rest of the update applies. A one-line change in one shared place. The question as asked: *"Should a Font Family that is not text be treated as no font family?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled, with the other two shared setters (C61–C63, one commit):** Font Family takes only text; a number or an object falls back to the default font.
The scenarios carrying the row lost their mark (13 across seven spec files) and VISUAL_ROWS is gone. Runtime at seed 20732:
all nine visual specs 0 failed scenarios and 0 generated divergences. Control (HEAD's viewer files): exactly the three
C61–C63 scenarios fail on the Button and the Icon.
