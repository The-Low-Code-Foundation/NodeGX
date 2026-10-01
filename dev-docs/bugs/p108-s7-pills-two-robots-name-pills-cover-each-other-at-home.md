---
id: P108-S7-PILLS
title: Two robots side by side — their name pills cover each other ("Cobble ²ip")
status: fixed
commit: (P108 s7)
severity: low
area: library garden-kit (2D) + garden-3d-kit (3D) / robot name pills
found: P108 IW-007 s6, 2026-10-01 (the touch drive's screenshot iw7t-04-here.png)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 7"
---

At a plot's home a helper stands on the tile beside the first robot. On the island a tile is ~16 px and a name pill
~35–55 px, so the two pills, both under their robots, overlapped: "Cobble" covered "Pip". Any two robots within a
couple of tiles on one row did the same (the crew, IW-008).

**Fix:** one rule in both kits, `pillSides` (garden-3d-kit's copy pinned to garden-kit's): a pill stays under its robot
unless it would meet a pill already placed, then it goes over its robot. 2D: set after each draw from where each robot
is going (`data-up`); 3D: every frame from the projected points, a pill's size read once per name. Spec `p108s7.test.ts`
(the island case, the Workshop and far-apart cases unchanged, the 3D copy, the arm); drive PILLS clause.
