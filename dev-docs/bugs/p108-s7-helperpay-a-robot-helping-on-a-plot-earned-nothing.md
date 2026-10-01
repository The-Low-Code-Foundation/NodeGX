---
id: P108-S7-HELPERPAY
title: A robot helping on a plot earned nothing for what it delivered
status: fixed
commit: c051ca68d
severity: medium
area: template bot-garden / the island tick (islWithMate) + Island keep
found: P108 IW-007 s5 (lane B, "could not verify: earning from the helper's drops"); listed owed in s6
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 7"
---

On her land Cobble (the helper) carried every plank of the spa and earned 0 shells: the island counted and paid only the
plot's first robot's lap (`islStepJob`); the second robot's machine (`islWithMate`, IW-008) stepped with no gain and no
pay. The same held for a crew robot helping on a request plot. A child sees the planks arrive and the wallet not move.

**Fix:** `islWithMate` counts the helper's own fill into its lap's gain and pays it at its program's end with the one
earning rule (`iw6Pay`); Island keep adds it to the wallet with its own "Cobble +N 🐚" line. Spec `p108s7.test.ts` (the
spa: 10 shells, 6 to Pip and 4 to Cobble; the arm: 6 and no Cobble line); drive `drive-iw007-touch.js` PAY clause.
