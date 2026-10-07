---
id: P107-C74
title: A Slider's Value output disagrees with the handle — it keeps a slid value past a lowered Max, holds a graph value the browser rounds to the step, and Value Percent keeps its old figure when Min or Max moves
status: fixed
commit: c92fa2afa
phase: P109
task: ISL-031
severity: low
area: runtime / Slider (components/controls/Slider/Slider.tsx, nodes/controls/slider.ts)
found: P107 NSP-016 s41, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.6 (row C74); scenarios "a slide to 80, then Max lowered to 60 …", "Value 33.5 with Step 1 …", "a slide to 50, then Max raised to 200 …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json — the runtime target and the spec agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json "a slide to 80, then Max lowered to 60: the frame's end draws the handle at 60, as the browser holds it — Value 60 and Value Percent 100, no Changed (v3, C74)"
---

**Value**'s output description: "The value the handle is currently at, between Min and Max, as a number". **Value
Percent**: "Where the handle sits as a whole number from 0 to 100". Three ways they are not:

- **past a lowered Max.** Slide to 80, then lower Max to 60: Max's re-clamp (slider.ts :116-126) clamps only the
  author's Value (which the slide never moved), so nothing reports. The browser draws the handle at 60 (a range input's
  value is clamped to its `max`), Value still reads 80, Value Percent 80. Sliding to 60 or 70 changes nothing the
  browser holds, so it raises nothing; the person has to slide below 60 to get the output back.
- **off the step.** Value 33.5 with Step 1 is clamped but never stepped (:263): Value reads 33.5 while the browser
  rounds the handle to 34; a person sliding to 34 raises nothing (the browser already holds it), and the output stays
  33.5.
- **a stale percent.** Slide to 50, then raise Max to 200: nothing reports, Value Percent still reads 50 with the handle
  at a quarter. Value Percent is computed only inside `updateOutputValue` (:39-54).

**Where:** `slider.ts` :105-126 (Min / Max re-clamp the author's Value only), :237-271 (no step), :220-236 (the percent).

**Proposed fix (for a ruling):** after Min, Max or Step changes, re-sanitize the value ON THE SCREEN (the component's
state) the way the browser does — clamp, then round to the step from Min — and report it (without Changed, per D36);
apply the same sanitizing to a Value write. Then Value and Value Percent always describe the handle.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Follow the handle".** After Min, Max or Step change, and after a Value write, the value is clamped and rounded to the step as the browser draws it, and reported without firing Changed. A Value of 33.5 with Step 1 then reads 34. Moderate change in one file. The question as asked: *"Should Value and Value Percent always describe where the handle is drawn?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed c92fa2afa (P109 ISL-031, 2026-10-07), as ruled — Slider spec v3.** Every paint draws the handle as the browser holds it — the graph's word when one waits, else where it was — against the attributes then (`browserRangeValue` in slider.ts: HTML's sanitization, clamped, rounded to the step from Min), and reports Value and Value Percent without Changed. Min, Max and Step are attributes, no longer words for the handle: a slid handle past a lowered Max is clamped to it and stays where the person put it otherwise. A reversed range holds Min (Chromium's drawing; jsdom's clamp of one flips at every re-sanitization). Also graded: 33.5 with Step 1 reads 34 ("Value 33.5 with Step 1 …"), Max raised to 200 moves Value Percent ("a slide to 50, then Max raised to 200 …"), and an act's paint on a hidden slider clamps for good (the scenario added in v3). Control: HEAD's Slider files red on exactly the 24 scenarios v3 changed or added.
