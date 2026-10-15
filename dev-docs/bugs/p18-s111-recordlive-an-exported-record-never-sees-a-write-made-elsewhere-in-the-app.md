---
id: P18-S111-RECORDLIVE
title: An exported Record keeps showing the old row after a Set Record Properties elsewhere in the app writes it
status: open
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
