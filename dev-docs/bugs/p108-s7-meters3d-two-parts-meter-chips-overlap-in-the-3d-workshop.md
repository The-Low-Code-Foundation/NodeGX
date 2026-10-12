---
id: P108-S7-METERS3D
title: In the 3D Workshop on her land, the spa's two parts' meter chips are drawn on top of each other
status: fixed
commit: 050ca561b
phase: P109
task: ISL-046
severity: low
area: library garden-3d-kit / the overlay's meter chips (positionOverlay)
found: P108 s7, 2026-10-01 (drive-iw007-touch.js --mode 3d, shot iw7t-pip-stones-program.png)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 7"
regression: packages/noodl-mcp/tests/isl046Meters3d.test.ts; scripts/devtools/drive-iw007-touch.js --mode 3d (METERS pip-stones)
---

A building's parts stand on neighbouring tiles (the spa: stones at (3, 1), planks at (4, 1)). In Garden 3D each part's
meter chip is placed over its own tile, and at the Workshop's camera the two chips ("0/6" with six stone pips, "0/4")
overlap: the stones' chip covers most of the planks' chip, and Pip's name pill is half under them while he stands by
the spa. A child cannot read how many planks are in. The 2D Workshop was not seen to do this (its chips sit in their
cells); the island at 16 px tiles had the same kind of crowding (P108 README §3, "neighbouring tulips' meter chips
overlap", session 2).

Not fixed in s7 (found after the build; IW-007 owed nothing on meters). A fix in the spirit of `pillSides`: place the
overlay's chips lowest first and move one that would meet another (over its thing, or one chip-height up).

**Fixed (P109 s43, 2026-10-11) for the Workshop's first visit; the second visit is `P109-S43-SECONDVISIT`.**
Re-measured first: the touch drive gains a METERS clause (the chips over the land's things, as boxes on the page, no
two meeting). On HEAD's kit it was red in both Workshops: Pip's (`0/6` over `0/4`, this row's shot) and Cobble's
(`6/6` under `0/4`). Built: `chipLifts`, with chips placed lowest first, in the spirit of `pillSides`. A chip that
meets one already placed goes just over it, until it meets none. It is used on plots (her land, the Workshop) and
the DOM is written only when a lift changes. After: Pip's Workshop green (the stones' chip lifted 5.6 px). Every other
clause read as on HEAD: 28/31 against 27/31, with BUILD and PAY red on both (`P109-S18-TOUCHBUILD`). Cobble's, the
second visit, stayed red because its chips were never measured. That is filed apart.
