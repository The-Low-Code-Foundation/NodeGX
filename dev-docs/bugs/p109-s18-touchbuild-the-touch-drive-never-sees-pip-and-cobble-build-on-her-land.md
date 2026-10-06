---
id: P109-S18-TOUCHBUILD
title: "`drive-iw007-touch.js` never sees Pip and Cobble build on her land at 1368 (BUILD, PILLS, PAY red on HEAD's garden too)"
status: scheduled
phase: P109
task: ISL-037
severity: medium
area: templates / bot-garden (her land: two robots building), or the drive itself — not diagnosed
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
