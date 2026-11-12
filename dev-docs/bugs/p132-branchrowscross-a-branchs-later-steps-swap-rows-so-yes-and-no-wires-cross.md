---
id: P132-BRANCHROWSCROSS
title: A branch's second steps swap rows, so the Yes side continues on the bottom row and the wires cross
status: fixed
phase: P132
severity: medium
area: nodegx-studio / Backend tab (the workflow canvas layout, automations.mjs workflowLayout)
found: Richard's re-walk of P132 in Studio, 2026-11-03 ("they flip and the connectors are crossed … for no reason")
evidence: nodegx-studio editor/automations-check.mjs "Yes above No in every column, whatever order the steps sit in the file"
launch: beta
commit: nodegx-studio d4c72c0
---

`workflowLayout` put each step in the column of its longest path from the entry, and listed a column's steps in the
order they sit in `steps[]`. A step is appended to `steps[]` when it is added, so adding the No side's second step
before the Yes side's put No's on the top row of that column while Yes's first step was on the top row of the column
before: the two wires crossed. Also a branch whose `routes` were written `onfalse` first drew No on top.

Fixed: a column is ordered by its nearest parent's row, then by the port the wire leaves from in the order the card
draws its ports (`stepPorts` with the catalog's route names: Yes, No, then always, then if it fails), then file order.
