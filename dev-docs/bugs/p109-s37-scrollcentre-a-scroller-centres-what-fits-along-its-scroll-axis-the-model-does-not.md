---
id: P109-S37-SCROLLCENTRE
title: A scrolling Group with Justify Content centre centres children that fit along its scroll axis — the layout model, like the native toolkits, puts them at the start
status: needs-ruling
phase: P109
task: ISL-052
severity: low
area: runtime / Group (the scroll axis on both paths) against node-spec `src/layout.ts` (a scroller's axis is unbounded)
found: P109 ISL-052 s37, 2026-10-09, the `scroll-align` fixture graded by the layout check
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-052-A-SCROLLING-GROUP-LAYS-OUT-AS-IT-DOES-WITHOUT-THE-SCROLL.md §6; packages/nodegx-node-spec/layout-fixtures/measured/scroll-align.json
kit: node-spec
regression: packages/nodegx-node-spec/tests/layout-check.test.ts KNOWN (`scroll-align/<viewport>/nca`, `ncb`, `nra`, `nrb`)
---

**What a person sees.** A 200 px scrolling column, Justify Content centre, holding two 60 px cards. On the web the cards sit
in the middle (y 35 and 105). The layout model, which follows the native toolkits (a scroller gives its children unbounded
room on its axis, RESEARCH-LAYOUT-SEMANTICS.md §2), puts them at the top (0 and 70). The same for a row (x 85 against 0).
Both web paths centre: the native path because the Group is a bounded flex box, the other because the Group centres the
inner box that hugs the cards.

**Why it is one question with P107-C154.** Both ask whether a scroller's scroll axis is bounded. On the web it is (a percent
child grows into it, C154; free space is shared out, here). In the model and the native toolkits it is not (a percent child is
its content; there is no free space to centre in). The iScroll path is mixed today: unbounded for a percent (C154's 40 px),
bounded for centring.

**Reach.** None on the shelf: the templates' one scrolling Group sets Justify Content to the start.

**Proposed fix (needs a call, with C154).** If the scroll axis is unbounded: the web paths stop centring along it (the native
path puts the children in a box that hugs them, as the iScroll path does, and the Group stops placing that box). If it is
bounded: the model shares free space out along a scroll axis that is not full, and a percent there grows (C154 the other way).
