---
id: PARKED-THREE-S5-DRIVEEXIT0
title: NodeGX Scene's drive tool always exited 0, so its drives could not fail and "green" meant read by eye
status: fixed
commit: 55eadcf31
regression: dev-docs/parked/three-in-nodes/editor/tests/coin-run.json
severity: medium
area: parked three-in-nodes / NodeGX Scene — `dev-docs/parked/three-in-nodes/editor/tools/drive.mjs` (copied from the P112 map editor's tool)
found: parked THREE-IN-NODES s5, 2026-10-19
evidence: a control steps file with `"expect": "r => r.a === 2"` on `{ a: 1 }` and a `waitFor: "false"` exits 1 with FAIL ×2 (s5); before, the same tool ended in `process.exit(0)` whatever it saw
---

s4's handoff said NodeGX Scene's drives were "all green". The drive tool has no assertions: it prints each `eval`'s value
and a screenshot, then `process.exit(0)`. Green was a person reading the printed values against the README. A timed-out
`waitFor` printed `TIMED OUT` and carried on. Nothing could turn a drive red.

**Measured 2026-10-19:** re-reading s4's three drives' values against the README, they matched; but the first run of
s5's Coin Run drive would have "passed" on a defect (PARKED-THREE-S5-WIREDSTART) had the tool not grown checks first.

**Fixed** in the tool: an `eval` step may carry `expect`, a function source applied to its value (JSON-parsed), printed
PASS / FAIL with its label; a timed-out `waitFor` is a FAIL; exit 1 on any FAIL, with `N / M checks PASS`. The three s4
drives got 20 expectations from their own readings (13 + 3 + 4). The map editor's original of this tool
(`dev-docs/tasks/phase-112-your-own-nodegx/own-008/map/editor/tools/drive.mjs`) still exits 0: not changed here.
