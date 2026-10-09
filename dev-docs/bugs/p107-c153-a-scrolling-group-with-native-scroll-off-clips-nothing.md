---
id: P107-C153
title: A Group with Enable Scroll on and Native platform scroll off does not clip — the children past its bottom are drawn over the page below and take presses
status: fixed
phase: P109
task: ISL-052
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `render` :336-356 sets overflow only for Clip Content or the native path)
found: P107 NSP-016 s70, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §8.2; measured on headless Chrome (packages/nodegx-node-spec/layout-fixtures/measured/scroll-iscroll.json beside scroll-native.json)
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P107-C153 (fixed, ISL-052) — with Native platform scroll off, a scrolling Group clips: a child below its box is hidden and takes no press, as natively"
---

**What a person sees.** A 200 px tall list that scrolls, with Native platform scroll off for snapping. The items that do not fit
are not hidden. They are drawn below the list, over whatever the page shows there, and a press there lands on a list item, not
on what the person thought they were pressing. With Native platform scroll on, the same list hides them until it is scrolled.

**Where.** `render` sets `overflow: hidden` only when Clip Content is on, and `overflow: auto` only on the native path. The
better-scroll path (`setupIScroll`) moves the inner wrapper with a transform and expects its container to hide what lies
outside, but nothing sets that. Measured computed overflow on the Group: `visible visible`.

**How to reproduce.** As P107-C153's regression test: the recording's third child lies at y 200–300, below the 200 px scroller,
and `elementFromPoint` at its centre lands on it. On the native path, the same child (220–320) is hidden: the point lands
elsewhere.

**Proposed fix (small).** On the better-scroll path, set `overflow: hidden` on the Group, on the scroll axis at least. Check the
Scroll To actions and snapping still work, then re-record `scroll-iscroll` and flip the regression test's assertion.

**Fixed (P109 ISL-052, s37, 2026-10-09).** On the better-scroll path the Group hides what lies outside it, on both axes, as the
native path does (`overflow: auto` on the scroll axis makes the other axis clip too). Re-recorded `scroll-iscroll`: the
Group's computed overflow is `hidden hidden`, and the third child's centre lands elsewhere. The regression test now holds
both paths at "hidden, no press". A control reddens it, and a planted variant without the clip reddens only it.
