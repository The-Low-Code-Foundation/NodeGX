---
id: P109-S15-ARRAYFILTERPATHEXPORT
title: The React export filters an Array Filter key like `owner.id` as one field name, while the running app reads the field inside `owner`
status: fixed
commit: 4c1800cb0
phase: P109
task: ISL-035
severity: low
area: export / nodegx-export `src/analyze/plan.ts:7841` (the Array Filter's filter list, read by the export's own copy of the filter)
found: P109 s15, 2026-10-05, building P109-S8-ARRAYFILTERPATH
regression: packages/nodegx-export/tests/array-vocabulary.test.ts "P109-S15-ARRAYFILTERPATHEXPORT — a dotted Array Filter key is a path, as the runtime reads it" (the emitted rowField run beside the runtime's own fieldOf, cut out of filtercollectionnode.ts, over 7 rows × 6 keys; both dotted-key tests red on HEAD's emitter)
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

**Re-measured 2026-10-15 (P18 session 105, ISL-035 AC1): still firing** — `component.ts`'s list-filter printed
`row["owner.id"]` for the key. **Fixed the same session, as proposed.** A dotted test key prints
`rowField(row, "owner.id")`, a transcription of the runtime's `fieldOf` (the exact name when the row has it, else the
path, `undefined` past anything that is not an object), appended to the component file as a hoisted function only when
a dotted key printed. A key without a dot is the member read it was. The sort is untouched on purpose: the runtime's
`sorter` reads `a[key]` flat. Population unchanged (no corpus key has a dot): golden 0 lines moved.
