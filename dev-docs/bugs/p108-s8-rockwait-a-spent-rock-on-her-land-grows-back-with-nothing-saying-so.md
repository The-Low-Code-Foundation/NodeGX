---
id: P108-S8-ROCKWAIT
title: After the first building her land's rock is empty, and nothing says it is growing back
status: fixed
commit: 3bb2e084e
severity: medium
area: template bot-garden / her land's sources (LAND_SOURCES; both kits' source drawing)
found: P108 s8, 2026-10-02 (Richard: "there's not enough rock")
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

Her land starts with 6 stones and 6 planks (`LAND_SOURCES`); the spa needs 6 + 4, the refuge 4 + 6, so the first
building empties the rock. It regrows +1 per 30 island ticks (~23 s) and only on the island's tick (R2), with nothing on
screen saying so; a pick there is a plain bump. Ruled 2026-10-02 ("Keep the wait, but show it"): amounts stay; the rock
and tree show how much is left and that they are growing back.
