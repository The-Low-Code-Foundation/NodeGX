---
id: P108-S8-PADGO
title: Teaching by driving, a child can go to the nearest rock but not back to the nearest square — the trip back cannot be taught
status: open
severity: high
area: template bot-garden / the Workshop pad (PAD_GO, cg003Content.ts; PAD_KEYS script, cg003Scripts.ts)
found: P108 s8, 2026-10-02 (Richard played path-stones)
evidence: dev-docs/tasks/phase-108-the-island-works/README.md §3 (s8)
---

Richard: "after Cobble arrives at whatever the nearest rock is, the fixed list of movements won't apply to just any rock".
Right: the rocks are seeded somewhere new each day, so arrows taught from one rock miss the path from another. The engine
and the Blockly drawer already have the answer (`go to the nearest 🟫 square`, which skips a finished square: `seekSkips`),
and it is the reference program — but the pad's go keys come from `PAD_GO.nearest` (`egg letter stone food ball rock can`),
which has no target kind, so a child teaching by driving can record the walk TO the rock and never the walk BACK.
Fix: the pad offers go-to-nearest for the job's targets too (site, bowl, basket, tulip …, whatever lies on the plot and the
request's palette allows).
