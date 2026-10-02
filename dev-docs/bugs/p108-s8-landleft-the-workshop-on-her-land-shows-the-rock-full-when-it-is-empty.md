---
id: P108-S8-LANDLEFT
title: The Workshop on her land shows the rock and tree full even when they are empty on the island
status: open
severity: medium
area: template bot-garden / landThings (iw007Land.ts)
found: P108 s8, 2026-10-02
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

`landThings(land)` starts from a fresh copy of `LAND_SOURCES` (`left: 6`), while the island keeps each source's `left`
on the live job (`iw7bLandOnto`). So a program taught in the Workshop wins there on a full rock and then bumps on the
island's empty one. Ruled 2026-10-02: the Workshop shows the island's real amount.
