---
id: P109-S37-CENTRECUT
title: A scrolling Group set to centre pushes a list longer than its window past the top — the first item's start is cut off and no scrolling reaches it
status: fixed
commit: afac7de50
phase: P109
task: ISL-052
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `render`, `renderIScroll`)
found: P109 ISL-052 s37, 2026-10-09, measuring the ruling's cases for Richard
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md §6; packages/nodegx-node-spec/layout-fixtures/measured/scroll-centre-long.json
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P109-S37-SCROLLROOM (ruled, ISL-052) — the room inside a scroll is the window unless the content is longer: a share fills what is left and is never shorter than its content, a Fixed percentage is of the window, a long list starts at the top — and the two paths agree"
---

**What a person sees.** An inbox set to centre, so "No messages yet" sits in the middle. With nine messages the newest is cut
off at the top, and scrolling up does not bring it back. Measured on both paths: three 100 px items in 200 px, the first at
y −50, the scroll extent 250.

**Where.** Plain `center` in a scroll box spreads the overflow to both ends, and the start end is out of reach. With Native
platform scroll off it was the Group centring the inner box, which is longer than the window.

**Fixed (s37), as ruled 2026-10-09.** A scrolling Group's Justify Content and Align Items `center` / `flex-end` / `end` become
`safe …` (asked of `CSS.supports` first; a browser without it keeps the plain value), on the Group and on the inner box. Now
the first item starts at 0 on both paths; a list that fits still centres.
