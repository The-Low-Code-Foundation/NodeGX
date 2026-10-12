---
id: P109-S5-ARRAYFILTERIN
title: Array Filter cannot test "is in this list", a nested field or a computed value
status: fixed
commit: 2c38d43a4
regression: packages/noodl-runtime/test/isl-005-array-filter-in-list.test.ts
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

**Fixed, the "is one of" half (P109 s8, 2026-10-03):** `in` ("Is one of") and `nin` ("Is not one of") on string and
number filters (`filtercollectionnode.ts`). The Values port is `*`: a wired Array (a record counts by its id), a JS array,
or typed text `"a, b, c"`; members compare loosely like `eq`; `nin` keeps a row without the property, like `neq`.
Spec 7/7; a mutant without the two tests 6 red, the `eq` control green. Enrichment and the node's docs page say so
(agents read it through `get_node_type`). The export defers the two operators by name (`plan.ts` names any operator it
does not translate). P107's spec of the node (`nodegx-node-spec/src/nodes/array-filter.ts`) still lists the seven old
operators; its generator never draws `in`, so its gates are unaffected; its owner was told.

**Not built: a nested field and a computed value.** Split to `P109-S8-ARRAYFILTERPATH`.
