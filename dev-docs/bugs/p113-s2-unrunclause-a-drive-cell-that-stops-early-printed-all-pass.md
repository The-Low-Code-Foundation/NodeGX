---
id: P113-S2-UNRUNCLAUSE
title: drive-p113-focus.js printed "ALL PASS" and exited 0 for a cell that stopped before most of its clauses ran
status: fixed
commit: (P113 s2, the commit that adds the monster, editor and both arms)
severity: medium
area: tooling / scripts/devtools/drive-p113-focus.js
found: P113 s2, 2026-10-04
evidence: dev-docs/tasks/phase-113-the-third-play-test/REV-002-MY-REVISION-LISTS.md §4 (session 2)
---

A drive cell that lost its way (a button not found, so the arm ends with `return note(...)`) printed the clauses it had
run as "4/4 ALL PASS" and the script exited 0. The summary counted `Object.keys(cell.clauses)`, so a clause that never
ran was neither a pass nor a fail: it was not there. Measured on the new `monster` arm: both cells printed
`reached · 4/4 ALL PASS` with `lineListM`, `fromListM` and `quiet` never reached, and the only sign was a `·` note line.

The arms built in session 1 (`focus` 7/7, `lists` 8/8) ran every clause in their recorded readings, so no earlier reading
was a false pass; the hole was waiting for the first arm to stop early.

Fix: each arm lists the clauses it owes (`EXPECT`), and the summary grades the union of owed and run clauses, so a clause
that never ran is printed `✗ <name>: never ran` and fails the cell. Other `drive-*.js` scripts that count only the clauses
they ran have the same shape; this file does not claim they were checked.
