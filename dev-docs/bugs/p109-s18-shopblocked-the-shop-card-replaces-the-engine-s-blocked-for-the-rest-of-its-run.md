---
id: P109-S18-SHOPBLOCKED
title: "`Logic/Shop card` sets `var blocked = false`, which replaces the engine's `blocked()` for the rest of each run"
status: fixed
commit: 948b92acd (landed on cline-dev 2026-10-05; b63d5bfec before the rebase)
severity: low
area: templates / bot-garden (`packages/noodl-mcp/tests/iw006Shop.ts` SHOP_CARD_SCRIPT)
found: P109 ISL-005 build session 3, 2026-10-05 (the sharing census, `gardenSharingHazards`)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Slice 6"
regression: packages/noodl-mcp/tests/isl005GardenScripts.test.ts "no hazard: no body re-declares a file’s name …"
---

`Logic/Shop card` carried the whole engine pasted in front of its own code, in one scope. Its own code declared a
purchase flag with `var can = bal >= it.price, blocked = false;`. `var` hoists to the whole Function, so once that line
ran, the engine's `blocked(w, x, y)` (the tile test that `step`, the seek and the rest all call) was `false` for the rest
of the run. Any engine call that reached it after that line would throw "blocked is not a function". No symptom was
measured, and whether the card's later code reaches `blocked()` was not checked. The census that moves the engine into `scripts/engine.js`
names every body that re-declares an engine name, and found this one. The flag is now `refused`.
