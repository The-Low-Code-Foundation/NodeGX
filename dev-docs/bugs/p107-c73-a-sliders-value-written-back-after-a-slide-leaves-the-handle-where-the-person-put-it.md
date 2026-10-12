---
id: P107-C73
title: A Slider's Value written from the graph after a person's slide does nothing when it equals the last Value the author wrote — the handle stays where the person put it
status: fixed
commit: 21b27462d
phase: P109
task: ISL-031
severity: medium
area: runtime / Slider (components/controls/Slider/Slider.tsx, nodes/controls/slider.ts)
found: P107 NSP-016 s41, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.6 (row C73); scenario "a slide to 70, then Value written 0 …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json — the runtime target and the spec agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json "a slide to 70, then Value written 0 — what the author last wrote: the handle goes to 0 all the same (R14) — Value 0 and Value Percent 0, no Changed"
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

**s46 (2026-10-05, NSP-023 step 3): the INTENT is ruled (R14) — the last word wins.** Richard: *"Why would I not let the node
show whatever the last value or signal it received was? Whether it comes from the user or not."* The Slider v2 spec treats every
Value from the graph as a word for the handle, the same value as the last one included, so the Reset above moves the handle to 0
(Value 0, no Changed — D36). The runtime's behaviour is a known row on the runtime target (`graphValueDropped`: the spec reports a
Value the runtime drops, after a slide or with the author's Value NaN — the effect's `Object.is` drops a second NaN too). Row
scenarios: "a slide to 70, then Value written 0 …", "… Value written 40 and 0 in one frame …", "a slide to 80, then Max lowered to
60 and Value written 0 …". The proposed fix (compare with the node's output) matches the ruling; whether to apply it is still to ask.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Fix it now".** Every Value from the app moves the handle, so a Reset works after a slide. Small change in one file: the new Value is compared with where the handle is. The question as asked: *"Should the running Slider follow your last-word rule now?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 21b27462d (P109 ISL-031, 2026-10-07), as ruled.** Every Value write is the graph's word for the handle: the node counts the words (`props.valueWrites`) and the component's effect is keyed on the count, so a Reset after a slide moves the handle back (a second NaN no longer reaches it at all: v3, below). Known row C73 dropped with its predicate; its row scenarios lost their marks. Control: HEAD's Slider files red on exactly the 30 formerly marked scenarios (C73's and D36's).
