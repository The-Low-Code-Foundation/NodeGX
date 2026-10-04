---
id: P107-C73
title: A Slider's Value written from the graph after a person's slide does nothing when it equals the last Value the author wrote — the handle stays where the person put it
status: needs-ruling
severity: medium
area: runtime / Slider (components/controls/Slider/Slider.tsx, nodes/controls/slider.ts)
found: P107 NSP-016 s41, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.6 (row C73); scenario "a slide to 70, then Value written 0 …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json — the runtime target and the spec agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json "a slide to 70, then Value written 0 — what the author last wrote: nothing on the wire and the handle stays at 70 (row C73); a slide to 70 again: nothing; Value 10: Value 10 with Changed"
---

The Dropdown's C71, on the Slider. A person's slide writes the component's state and the node's output (Slider.tsx
:183 → `updateOutputValue`) but never `props.value`. The **Value** input compares what it is given with `props.value`
(slider.ts :265) and does nothing when they match. So:

- a Slider whose Value is 0; the person slides to 70 (Value 70, Changed); the graph writes Value 0 — a Reset button
  wired to Value with the default — and **nothing happens**: no render, no effect, the handle stays at 70 and Value
  still reads 70.

"Moves the handle to this value" is what the description promises. A reset to the value the author last wrote is the
commonest graph write a slider gets, and it is the one that cannot work.

**Where:** `slider.ts` :265-270 (`changed` against `props.value`, which the slide never moved); `Slider.tsx` :88-90 (the
effect keys on `props.value`).

**Proposed fix (for a ruling):** compare the arriving value with the node's output (`_internal.outputValue`) rather than
`props.value`, or write `props.value` on a slide too, so the next graph write is measured against what is on the
screen. The spec models today's behaviour (nothing moves).
