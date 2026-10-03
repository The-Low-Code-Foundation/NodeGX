---
id: P109-S8-ARRAYFILTERPATH
title: Array Filter cannot test a nested field (`owner.id`) or a computed value
status: needs-ruling
severity: low
area: `noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts` (`applyFilter` reads `item[key]` only)
found: P109 s5 (ISL-005's census, finding 3); split from P109-S5-ARRAYFILTERIN in s8, 2026-10-03
evidence: dev-docs/bugs/p109-s5-arrayfilterin-array-filter-has-no-in-list-nested-or-computed-field.md
---

Each filter tests one top-level property of a row. "Rows whose `owner.id` is X" needs a Function, or a row shaped flat on
purpose. The "is one of" half of the original row is built; this half is not, because the obvious spelling (a dotted
path in the property list) changes what an existing filter on a key that contains a dot means.

**Plain words:** *"Array Filter can only look at a row's own fields, not a field inside a field. Should `owner.id` in the
filter list mean 'the id inside owner'? (A project whose rows really have a key named `owner.id` would read differently.)"*
