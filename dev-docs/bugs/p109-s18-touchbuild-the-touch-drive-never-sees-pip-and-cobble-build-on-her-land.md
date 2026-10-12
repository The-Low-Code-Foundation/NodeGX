---
id: P109-S18-TOUCHBUILD
title: "`drive-iw007-touch.js` never sees Pip and Cobble build on her land at 1368 (BUILD, PILLS, PAY red on HEAD's garden too)"
status: fixed
commit: 5778f4b1c
phase: P109
task: ISL-037
severity: medium
area: drive (scripts/devtools/drive-iw007-touch.js) — its premise ended with P108 s9 (`c25fb8ee5`); the product as ruled
regression: scripts/devtools/drive-iw007-touch.js (BUILD, PILLS, PAY)
found: P109 ISL-005 build session 3, 2026-10-05 (the slice-6 drive census, run with a HEAD control)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-005-TWO-FUNCTIONS-SHARE-ONE-PIECE-OF-CODE.md §8 "Build session 3"
---

`node scripts/devtools/drive-iw007-touch.js <deploy> --project <assembled>` reads **26/29, exit 1** on the garden at HEAD
`99641d371` (HEAD's drive, HEAD's template, deployed with `nodegx deploy`), and the same on the slice-6 garden, twice. The three
red clauses, all at 1368-en: **BUILD** "Pip seen carrying stones, Cobble planks" saw `{}`; **PILLS** "0 settled moments";
**PAY** "Cobble's planks earn" saw no `+N 🐚` lines and the wallet unchanged (35 → 35). Every other clause passes, including the
390 and French halves and "no console errors". Not diagnosed: whether the two robots stopped building on her land, or the
drive's setup no longer starts them. The drive ran in P108 IW-007 s6/s7 (2026-10-01, per the bugs it found then); its last
recorded tally was not looked up.

## s45 (2026-10-11): diagnosed — the drive watched the island for work that moved into the Workshop

Read on both of today's drives (`--mode 3d` and flat): **"the spa rises on the island to finished (stages 3) in 0 s"**.
The spa is already finished when the drive reaches the island, so nobody carries anything there (BUILD's loads `{}`),
no robot moves while it builds (PILLS, 0 settled moments), and no delivery is paid (PAY, wallet 35 → 35).

**Cause: P108 s9 (`c25fb8ee5`, 2026-10-03), as Richard asked** ("Once built, they should be permanent and out of the
game modes"): the Workshop now writes each part the moment it is delivered (`Logic/Land keep here`). The drive last
passed on 2026-10-01 (29/29), before it. Not a product defect in the building.

**But PAY was one.** `Logic/Win pay` pays nothing for a win on her land *because* the island used to pay each
delivery ("a land lap pays its steps there"). With the delivering moved into the Workshop, building the spa paid
nothing at all: s7's reading was Pip +6 🐚, Cobble +4 🐚; s45's is 0, and the win cards say nothing. Asked in plain
words, **Richard ruled "Building pays nothing"** (2026-10-11): the spa is its own reward. So the product stays.

**Fix (the drive):** BUILD reads the carrying where it now happens, in each Workshop while it plays (2D or 3D), and
the island's spa as finished when she comes back. PILLS reads the pills while the two walk to the spa and rest there
(where they now stand close). PAY asserts the ruling: no "+N 🐚" on either win card, no island pay line for the spa,
the wallet as it was before Pip was taught.

**PILLS, measured:** at rest the two stand three tiles apart (48 and 51, row 18): pills 826–860 px and 865–921 px, so no
pill needs to go over. The drive no longer stages two robots close together on the island, so PILLS reads the two
resting pills (both drawn, neither covering the other); the close-together case is graded by `p108s7.test`'s
`pillSides` spec (both kits). `Win pay`'s comment now says building pays nothing (the shipped script's text; garden
regenerated, that file only).

**After:** `drive-iw007-touch.js` (flat) **31/31**, the first green run since 2026-10-01. BUILD: Pip carried stones
and Cobble planks in their Workshops, the spa finished on the island, the store 6/6 · 4/4. PAY: wallet 35 → 35,
neither win card says "+N".
