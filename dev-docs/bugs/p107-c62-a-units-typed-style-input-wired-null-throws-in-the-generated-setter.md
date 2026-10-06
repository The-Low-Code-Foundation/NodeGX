---
id: P107-C62
title: A units-typed style input wired null throws in the generated setter — margins, paddings, font size, min / max size, border widths and radii
status: scheduled
phase: P109
task: ISL-026
severity: medium
area: runtime / every visual node (react-component-node.ts, the `inputCss` setter)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C62); the Button's generated run (20 of 200 sequences at seed 20729)
kit: node-spec
regression: packages/noodl-runtime/test/node-spec/conformance.test.ts "NSP-016 §6 C62"
---

A visual node's Margin, Padding, Font Size, Font Weight, Line Height, Letter Spacing, Min / Max Width or Height,
Border Width or Corner Radius wired `null` — what a Variable that was never set, or an Object property that is
missing, carries — throws inside the setter every `inputCss` port shares, and the update that delivered it stops
there. `undefined` on the same ports is fine (the style is removed); only `null` throws.

**Where:** `packages/noodl-viewer-react/src/react-component-node.ts` :2368: `if (typeof value === 'object' &&
value.value !== undefined)` — `typeof null === 'object'`, so `.value` is read off null. Measured s37 on the Button:
28 ports, `null` the one value that throws on each (every other pool value passes).

**Reproduce:** `{ "set": "marginTop", "value": null }` on the runtime target: `Cannot read properties of null
(reading 'value')`.

**Proposed fix:** `value !== null &&` in that test (one line, neutral), so null reads as "no value" like undefined.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Remove the style".** Both kinds of empty value behave the same and the update carries on. A one-line change in one shared place. The question as asked: *"Should an empty value on these inputs remove the style, the way undefined already does?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)
