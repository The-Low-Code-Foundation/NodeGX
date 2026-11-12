---
id: P132-TRIGGERROWS
title: A trigger is a row of its own beside the workflow it starts, and opens to two cards where only the schedule can be changed
status: fixed
phase: P132
task: BWF-010
severity: high
area: nodegx-studio / Backend tab (the Workflows list, renderAutoList and renderTrigger)
found: Richard's re-walk of P132 in Studio, 2026-11-03 ("Why do the scheduled workflows even exist as separate entities … and live in the same list?")
evidence: nodegx-studio editor/studio.html renderAutoList (one row per trigger, then one per workflow), renderTrigger (two cards: what starts it, what it starts)
launch: beta
commit: nodegx-studio 26e602d
regression: nodegx-studio editor/automations-drive.mjs "one row per workflow", "its first card is the trigger", "Add what starts it"
---

Richard opened *Every morning at 08:00* (the list's first row, a bolt) to learn what it does and where its data comes
from. It shows two cards: the trigger, whose time he could change, and *The morning check*, which opens the workflow,
listed again below it. Nothing else could be changed there. He read it as a "scheduled workflow" separate from the
"function workflow" it calls, both in one list.

Measured on Greenhouse's file: four triggers, five workflows; each trigger aims at a workflow, and the list draws
4 + 5 rows. BWF-001 item 8 asked for the fold and its record says it was not done ("the list still shows triggers
as rows of their own").

The fix is BWF-010: one row per workflow, its trigger the first card on its own canvas, changed there.

**Fixed (s13, 2026-11-04):** BWF-010. One row per workflow; the trigger is the workflow's first card, its settings
on the right; driven in the Electron app on a Greenhouse copy (5 rows, the time moved from the card, file and backend agree).
