---
id: P107-C63
title: A Placement input (Pos X / Pos Y / Rotation / Transform Origin X / Y) wired undefined throws in its setter
status: needs-ruling
severity: medium
area: runtime / every visual node with Placement (node-shared-port-definitions.ts `addTransformInputs`)
found: P107 NSP-016 s37, 2026-10-03
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.2 (row C63); the Button's generated run (4 of 200 sequences at seed 20729)
kit: node-spec
regression: packages/noodl-runtime/test/node-spec/conformance.test.ts "NSP-016 §6 C63"
---

A visual node's Pos X, Pos Y, Rotation, Transform Origin X or Transform Origin Y wired `undefined` — a port on the
other end that was never set — throws in its setter (`value.value` on undefined), and the update that delivered it
stops there. Scale does not throw (it stores the value as it is). Every other pool value, `null` included, passes:
`null.value` would throw too, but these ports' values pass through node.ts's unit merge first, which hands the
setter `{ value: null, unit }` — but only while the port holds a unit object WITH a `unit` (node.ts :416); after an object
wired in without one (`{}`), a `null` reaches the setter raw and throws the same way (`null.value`) — found by the Icon's 10,000
run, NSP-016 §7.6 (s41).

**Where:** `packages/noodl-viewer-react/src/node-shared-port-definitions.ts` :582, :600, :618 (`value.value +
value.unit`) and the two origins' setters.

**Reproduce:** `{ "set": "transformX" }` (no value) on the runtime target: `Cannot read properties of undefined
(reading 'value')`.

**Proposed fix:** read `undefined` as the port's default (0, or 50 for an origin), as the `inputCss` ports do when a
style is removed. One guard per setter.
