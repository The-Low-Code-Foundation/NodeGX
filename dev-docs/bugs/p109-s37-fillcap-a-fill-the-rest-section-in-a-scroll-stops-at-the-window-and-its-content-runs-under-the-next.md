---
id: P109-S37-FILLCAP
title: In a scrolling Group, a section set to fill the rest (a % height, Fixed not ticked) stops at the window's height when its content is longer, and its content runs under the next item
status: fixed
phase: P109
task: ISL-052
severity: medium
area: runtime / layout (noodl-viewer-react/src/layout.ts `Layout.size`, a % along the axis a parent scrolls)
found: P109 ISL-052 s37, 2026-10-09, measuring the ruling's cases for Richard
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md §6; packages/nodegx-node-spec/layout-fixtures/measured/scroll-fill.json
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P109-S37-SCROLLROOM (ruled, ISL-052) — the room inside a scroll is the window unless the content is longer: a share fills what is left and is never shorter than its content, a Fixed percentage is of the window, a long list starts at the top — and the two paths agree"
---

**What a person sees.** A checkout screen that scrolls: the basket at Height 100% (to push the Pay block to the bottom), then
the total and a Pay button. With two items it looks right. With twelve, scroll down: the Pay block lies on top of the last
items, which can no longer be read or tapped.

**Where.** A % along the stacking axis is the size and a grow share (`Layout.size`). In a scroll box the size is the window's
height, and the browser's automatic minimum is the smaller of the stated size and the content, so the section stopped at the
window (200 of its 300 px) and its content overflowed into the next item. Measured: body 200, footer at 240, content to 340.

**Fixed (s37), as ruled 2026-10-09** ("inside a scrolling Group the room is the visible window, unless the content is longer,
and then the content wins"). A share along the scroll gets `min-height` / `min-width: min-content` unless the author set a
min. Now: body 300, footer at 340, on both paths; short content still fills (130).
