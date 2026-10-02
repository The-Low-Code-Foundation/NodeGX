---
id: P108-S8-WSTAB
title: The Workshop tab with no mission chosen shows an empty plot, then jumps back to the island
status: fixed
commit: 3bb2e084e
severity: medium
area: template bot-garden / the top bar (TABS, cg003Components.ts) and Pages/Workshop's guard
found: P108 s8, 2026-10-02 (Richard)
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

The tab opens the Workshop on the global `gardenRequestId` (the last mission, or nothing). With nothing, Play finds no
request, draws an empty world, and the CG-003 AC8 guard (a 600 ms Timer, then `found` false → navigate) sends the child
back to the island — a guard built for a reload, reached by a tab. No drive ever pressed the tab (`tab(1)` is unused).
Richard: "I think the workshop tab maybe shouldn't even be a tab." Fix: the tab goes; the Workshop is reached from a
request, a plot or her land, as it already is.
