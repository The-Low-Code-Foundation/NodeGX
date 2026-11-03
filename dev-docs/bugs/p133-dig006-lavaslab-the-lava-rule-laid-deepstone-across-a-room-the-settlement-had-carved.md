---
id: P133-DIG006-LAVASLAB
title: In The Dig, the rule that roofs an opening under lava laid a slab of deepstone across a settlement's room at a chunk border
status: fixed
commit: richardosborne14/dig (round 8, DIG-006; private repository)
severity: medium
area: the Dig (private repo) — `public/src/gen-cave.mjs` (the lava-floor pass in `chunk`), `public/src/gen-settle.mjs` (new `writes`)
found: P133 DIG-006 s1, 2026-11-03, `tools/check-settle.mjs` ("the game's chunks hold what it wrote") failing on two archive towns
evidence: Before: 51 cells of one archive town (seed 538723565) and 6 of another (seed 777) read deepstone where the engine wrote air; every one on a chunk's top row (y mod 16 = 15) with air above it in the game. After: all 15 settlements (3 seeds × 5 styles) pass, with the cells under real lava counted apart (36 on the first, by the game's rule, as intended).
---

The generator's pass "a corridor dug under a lava pool gets the pool's floor back" decides a chunk's top row from the
*natural* lava in the cell above, since that cell is in the next chunk. A settlement carves through lava bands; where
it had carved that cell to air, the rule still saw lava and laid a one-block slab of deepstone across the room at the
chunk border. The rule now skips cells the settlement decides (`settle.writes`).

The regression is in the private repository (`tools/check-settle.mjs`), so it is named here rather than in a
`regression:` header.
