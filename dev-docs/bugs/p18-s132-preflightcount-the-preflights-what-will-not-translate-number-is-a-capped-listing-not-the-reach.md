---
id: P18-S132-PREFLIGHTCOUNT
title: The preflight's "What will not translate (N)" is a capped listing, not the reach — it moves when nothing changed disposition
status: open
severity: low
area: export / preflight report (`src/emit/report.ts`, `renderPreflight`)
found: P18 session 132, 2026-10-21, comparing every template's preflight before and after EXP-019 slice 1
evidence: dev-docs/tasks/phase-18-code-export-v2/s132-hostgates/census/members-area.txt (228) and census-after/members-area.txt (275); dispdiff.json has 8 members-area rows, none of them the nodes "new" in the after list
---

The preflight prints "What will not translate (N)" and then a list of heads, each with "…and K nodes are left out only
because this one fires them". The list is capped by head, and N is counted off what is listed. When a head stops being
refused, the heads behind it surface, with their own dependents, and N can **rise** although every node's disposition
either held or improved: members-area read 228 before EXP-019 slice 1 and 275 after, listing "Log out", "The
association" (Query Records), "setNotifySetting" (Cloud Function) and "The id, and the go-ahead, from one node" as new,
while `dispdiff.ts` (per-node dispositions, base against tree) has none of them moving and 0 nodes lost anywhere.

A person reading two preflights would conclude the export got worse. The reach instrument says the opposite (135 gained,
0 lost over the 17 templates).

**Fix shape:** count N off the plan's dispositions (every node not `collapsed`/`static`/`stubbed`, once), independent of
how many heads are printed; say "showing the first M of H heads" when the list is cut; keep the per-head dependents as
they are (they are right, and the sentence "missing a pathway, not a node" depends on them).
