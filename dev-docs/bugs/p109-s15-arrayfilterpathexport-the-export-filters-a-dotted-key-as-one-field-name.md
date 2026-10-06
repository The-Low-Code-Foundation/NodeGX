---
id: P109-S15-ARRAYFILTERPATHEXPORT
title: The React export filters an Array Filter key like `owner.id` as one field name, while the running app reads the field inside `owner`
status: scheduled
phase: P109
task: ISL-035
severity: low
area: export / nodegx-export `src/analyze/plan.ts:7841` (the Array Filter's filter list, read by the export's own copy of the filter)
found: P109 s15, 2026-10-05, building P109-S8-ARRAYFILTERPATH
evidence: dev-docs/bugs/p109-s8-arrayfilterpath-array-filter-cannot-test-a-nested-field.md
---

Since `7c4bcbf38` the runtime (and P107's spec of it) read a dotted filter key as a path — `owner.id` is the id inside
`owner` — unless a row has a field with that exact name. The export builds its filters from the same parameters
(`plan.ts:7841-7843`, `filterFilter` / `filterFilterOp-<field>`) and was not changed: in an exported app the same filter
would look for a field literally named `owner.id` and find nothing, so the list comes out empty where the running app shows
rows. Not touched in s15 because `nodegx-export/src/analyze/plan.ts` carries a peer's uncommitted P18 pile.

Population today: 0 of 253 filter keys on this machine contain a dot, so no existing project differs yet — the first person
to use the new form is the first to meet it. The fix is the same `fieldOf` rule (exact name first, then the path) wherever
the export reads a row's field for a filter.
