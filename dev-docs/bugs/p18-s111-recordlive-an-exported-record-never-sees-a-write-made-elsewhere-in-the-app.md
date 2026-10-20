---
id: P18-S111-RECORDLIVE
title: An exported Record keeps showing the old row after a Set Record Properties elsewhere in the app writes it
status: fixed
commit: (s113)
regression: packages/nodegx-export/tests/the-live-record.test.ts
severity: medium
area: export / Record
found: P18 EXP-008, session 111, 2026-10-15 (split out of P18-S110-RUNONCHANGE)
evidence: packages/nodegx-export/parameter-ledger.json `DbModel2.runOnChange-record`; plan.ts `recordAnswerStateOf` (the row is a component `useState` written only by the Record's own `record-fetch`)
---

A page shows a record through a `Record` node; a form elsewhere in the app changes that record with `Set Record
Properties`. In the editor the page updates at once. In the exported app it keeps the old values until the Record
fetches again.

Runtime: every Record bound to an id shares the in-process `Model` for it. A Set Record Properties writes that Model,
and the Record's change callback (`dbmodelnode2.ts` `onModelChangedCallback`, behind `shouldRunOnValueChange('record')`)
re-flags every `prop-*` output and fires `Changed`. This is the DEFAULT: the "Record properties" box under Run On Value
Change is ticked unless the author unticks it.

Export: the row is per-component state (`recordAnswerStateOf`, `useState<Row | undefined>`) set only by the Record's
own fetch. Nothing a mutation does reaches it. Unticked, the runtime matches the export, which is why session 110's
per-parameter probe read the port as silent: varying the box to `false` moves nothing, because `false` is what the
export already does.

Not a refusal case. Refusing every Record that shares a collection with a write would refuse the corpus's own idiom
(read a row, edit it in a form). The fix is a shared record cache in the exported client (one row per collection and
id, which the write functions update and the Record hook subscribes to), sized as its own EXP-011 section. Until then
the one honest cheap step is a note on a ticked Record whose collection has a translated update in the app.

**Fixed, session 113, driven** (`dev-docs/tasks/phase-18-code-export-v2/s113-recordlive-drive/`). The exported client
holds one copy of each record, keyed by the id alone as `Model.get(id)` is (`emitApp.ts` `HELD_RECORDS_SOURCE`):
`fetchOne`, `query` and `create` merge their answers into it field by field, as `_fromJSON` does, and `update` writes
before the save, merges the answer after it, and puts back what the record held when the save fails (P107-C34).
A Record with "Record properties" ticked subscribes its row to that copy (`subscribeRecord`, one effect per Record
whose row the component holds). Shipped only where a live Record is (and a project with no backend has none: its read is a stub), so every other
client is byte-identical.
Unticked (or settled unticked: a wired Fetch with the box unstated, NDA-017's migration, as the editor settles it), the
Record keeps the row it read, as before.

Drive, run 2: the runtime and the fixed export agree on every title in every step (Shown follows the save, Frozen does
not, a refused save puts the old title back); the HEAD-equivalent control keeps the old title. Spec 21 rows, eight
mutant arms each killing their own rows. Parameter ledger: `DbModel2.runOnChange-record` leaves `silent`, floor
1,233 → 1,234. Found on the way: P18-S113-IDREADTWICE (fixed beside it) and P18-S113-IDBINDREAD (open).
