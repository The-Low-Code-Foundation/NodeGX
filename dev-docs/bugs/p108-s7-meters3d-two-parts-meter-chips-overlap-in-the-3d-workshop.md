---
id: P108-S7-METERS3D
title: In the 3D Workshop on her land, the spa's two parts' meter chips are drawn on top of each other
status: open
severity: low
area: library garden-3d-kit / the overlay's meter chips (positionOverlay)
found: P108 s7, 2026-10-01 (drive-iw007-touch.js --mode 3d, shot iw7t-pip-stones-program.png)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 7"
---

A building's parts stand on neighbouring tiles (the spa: stones at (3, 1), planks at (4, 1)). In Garden 3D each part's
meter chip is placed over its own tile, and at the Workshop's camera the two chips ("0/6" with six stone pips, "0/4")
overlap: the stones' chip covers most of the planks' chip, and Pip's name pill is half under them while he stands by
the spa. A child cannot read how many planks are in. The 2D Workshop was not seen to do this (its chips sit in their
cells); the island at 16 px tiles had the same kind of crowding (P108 README §3, "neighbouring tulips' meter chips
overlap", session 2).

Not fixed in s7 (found after the build; IW-007 owed nothing on meters). A fix in the spirit of `pillSides`: place the
overlay's chips lowest first and move one that would meet another (over its thing, or one chip-height up).
