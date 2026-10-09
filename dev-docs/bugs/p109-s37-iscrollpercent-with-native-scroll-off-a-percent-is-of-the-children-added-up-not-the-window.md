---
id: P109-S37-ISCROLLPERCENT
title: With Native platform scroll off, a size in % inside a scrolling Group is a % of its children added up, not of the window — swipeable slides at 100% come out the wrong width
status: fixed
phase: P109
task: ISL-052
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `renderIScroll`) with layout.ts `Layout.size`
found: P109 ISL-052 s37, 2026-10-09, measuring the ruling's cases for Richard
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md §6; packages/nodegx-node-spec/layout-fixtures/measured/scroll-slides.json
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P109-S37-SCROLLROOM (ruled, ISL-052) — the room inside a scroll is the window unless the content is longer: a share fills what is left and is never shorter than its content, a Fixed percentage is of the window, a long list starts at the top — and the two paths agree"
---

**What a person sees.** Onboarding slides in a sideways scrolling Group with Native platform scroll off (the editor says to
turn it off for snapping), each at Width 100% with Fixed ticked. On the native path each slide is one screen wide. With it off,
three slides holding a 40 px picture came out 120 px each (a 50% slide 20 px); bigger pictures made them wider than the screen.

**Where.** With Native platform scroll off the children sit in an inner box that hugs them, so a % there resolves against the
children added up. Not Fixed, each shrank to its content (40 px).

**Fixed (s37), as ruled 2026-10-09.** The Group measures its visible window (a ResizeObserver, first at the mount) and hands it
to the inner box as `--ndl-scroll-width` / `--ndl-scroll-height`. A Fixed % along the scroll is that fraction of it; a share
states no size, starts at 0 and grows into what the window leaves (the inner box is never shorter than the window). Now: Fixed
100% slides 300 each on both paths, not Fixed 100 each, Fixed 50% 150, and the inner box 900 wide, so a person can scroll to
all three (`inner`, a field the measuring now records).
