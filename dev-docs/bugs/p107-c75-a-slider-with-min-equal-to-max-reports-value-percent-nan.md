---
id: P107-C75
title: A Slider with Min equal to Max reports Value Percent NaN, and every report fires Changed
status: needs-ruling
severity: low
area: runtime / Slider (nodes/controls/slider.ts)
found: P107 NSP-016 s41, 2026-10-04
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.6 (row C75); scenario "Min equal to Max (40) …" in packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json — the runtime target and the spec agree
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.controls.range.json "Min equal to Max (40): the author's Value is clamped to 40; the mount's effect sends Value 40, Value Percent NaN (0 / 0) and Changed (rows C75, D36); a slide lands on 40: nothing; Value 10 clamps to 40: nothing"
---

`_updateOutputValuePercent` (slider.ts :220-236) is `Math.floor((v - min) / (max - min) * 100)`: with Min equal to Max
it is `0 / 0`, so **Value Percent** reads `NaN` — the description promises "a whole number from 0 to 100". Because
`NaN !== NaN`, every later report re-flags it, and the falsy-percent recompute (:51-53) runs on every call. A Slider
whose range collapses (Min and Max both bound to a list's length, an empty list) shows a NaN to whatever is wired to
Value Percent, typically a progress bar's width.

A related shape: a Min written `undefined` (a cleared binding) deletes the prop and the clamp `Math.max(undefined, …)`
makes the author's Value `NaN` (:263); Value then reads NaN with Changed until a person slides.

**Proposed fix (for a ruling):** Value Percent is 0 when Max equals Min (the handle sits at the start, as the browser
draws it); an empty Min or Max uses the port's default (0 / 100) in the clamp and the percent, as the browser does for
the attribute.
