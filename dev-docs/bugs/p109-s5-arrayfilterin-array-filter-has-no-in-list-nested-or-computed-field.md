---
id: P109-S5-ARRAYFILTERIN
title: Array Filter cannot test "is in this list", a nested field or a computed value
status: open
severity: medium
area: `noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts:22` (`eq | neq | gt | lt | gte | lte | regex`)
found: P109 s5, 2026-10-02 — ISL-005's census (finding 3), operators re-read at HEAD
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ (ISL-009 §8 s5, ISL-005 §8 s5, ISL-005-CENSUS-2026-10-02.md)
---

The operators are `eq, neq, gt, lt, gte, lte, regex` and each tests one top-level property. "Plots whose kind is one of
the kinds this request allows" or "rows whose `owner.id` is X" therefore need a Function. The census names Island pins, Pad
keys, Pick thing, Plot at and Olive held as blocked by it.

**Plain words:** *"You can filter a list by 'equals' or 'greater than', but not by 'is one of these', so the agent writes
a script."*

**Proposed:** `in` / `notIn` operators taking an array (wirable), and a dotted path for a nested field. Owner: the
"native nodes first" ruling's product gaps (ISL-005 §8 s5).
