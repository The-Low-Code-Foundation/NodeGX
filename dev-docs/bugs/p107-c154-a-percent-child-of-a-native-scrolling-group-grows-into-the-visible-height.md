---
id: P107-C154
title: In a scrolling Group (Native platform scroll on, the default) a percent child grows into the visible height — with it off, the same child is its content
status: needs-ruling
phase: P109
task: ISL-052
severity: low
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx, the native-scroll path) with layout.ts `Layout.size` :84-108
found: P107 NSP-016 s71, 2026-10-09
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §8.3; measured on headless Chrome (packages/nodegx-node-spec/layout-fixtures/measured/scroll-percent-content.json)
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts "P107-C154 — with Native platform scroll on (the default), a percent child of a scrolling column grows into the 200 px it shows: 140 high round 40 px of content"
---

**What a person sees.** A 200 px scrolling column holds a Group at 50% height with 40 px of content, then a 50 px card. With
Native platform scroll on (the default), the 50% Group is 140 high: it takes all the room the scroller shows, and the card
sits at 150. Turn Native platform scroll off, and the same Group is 40 high, its content, with the card right under it. When
the children overflow, the native path shrinks the same Group to 0 instead (s70's `scroll-native` `s4`). The two settings of
one checkbox lay out the same page differently.

**Where.** A percent along the stacking axis is a flex basis and a grow weight (`Layout.size` :84-108, `flexShrink` 1). On the
native path the Group itself is the scroll container: a flex box with a definite height, so its children share that height,
growing into it or shrinking out of it. On the iScroll path they sit in an inner wrapper that hugs them, so there is nothing
to share. A scroller in the four native toolkits gives its children unbounded room on its axis (RESEARCH-LAYOUT-SEMANTICS.md
§2), which is the model's reading (layout.ts) and the iScroll path's.

**Reach.** None on the shelf: across the templates' 1,207 parents, a scrolling Group has one child, and it hugs (s71's
ranking). It takes a percent height inside a scroller to see it.

**How to reproduce.** `node scripts/node-spec/layout-measure.js --record packages/nodegx-node-spec/layout-fixtures --only
scroll-percent-content`: `pct` measures 100×140, `fix` sits at y 150. The same fixture with `nativeScroll: false` on `sc`
measures `pct` 100×40 and `fix` at y 40 (40, not 50: the gap is P107-C152).

**Proposed fix (needs a call: which reading is the product's).** If the scroller is unbounded, as the model and the other path
say: on the native path, put the children in a wrapper that hugs them, or give a percent child of a scrolling Group no grow
and no shrink, so it is its content. Then re-record `scroll-percent-content`, drop its rows from `KNOWN`, and flip the
regression test. If the native path's reading is wanted, the model and the iScroll path move instead.
