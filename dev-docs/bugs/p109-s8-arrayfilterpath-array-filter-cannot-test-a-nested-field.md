---
id: P109-S8-ARRAYFILTERPATH
title: Array Filter cannot test a nested field (`owner.id`) or a computed value
status: fixed
commit: 7c4bcbf38
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

**Ruled 2026-10-05 (P109 s15, README §8 round 4): "Yes, exact name first."** `owner.id` means the field inside `owner`,
unless a row has a field literally named `owner.id`. Measured before asking: 320 Array Filter nodes in 55 projects, 253
filter keys, **0 containing a dot** (filter or sort lists); 0 dotted keys in Static Data; 4 hand-written nested lookups in 3
apps. The filter list is one comma-separated `filterFilter` (`filtercollectionnode.ts:621`, split `:373-374`); `applyFilter`
reads `item[key]` (`:44-69`).

**Fixed 2026-10-05 (`7c4bcbf38`)** in the runtime and P107's node-spec model: `fieldOf` — exact name first, else the path.
Spec `noodl-runtime/test/p109-array-filter-nested-field.test.ts` 6/6 with two reverted arms red; conformance CONFORMS,
98/98 mutants. The export's own copy is NOT changed — [P109-S15-ARRAYFILTERPATHEXPORT](p109-s15-arrayfilterpathexport-the-export-filters-a-dotted-key-as-one-field-name.md).
