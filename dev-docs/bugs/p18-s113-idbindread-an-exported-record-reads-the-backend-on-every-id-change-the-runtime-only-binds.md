---
id: P18-S113-IDBINDREAD
title: An exported Record with Fetch unwired reads the backend on every Id change; the running app only binds to the copy it holds
status: open
severity: medium
area: export / Record
found: P18 session 113, 2026-10-15, the P18-S111-RECORDLIVE drive
evidence: dev-docs/tasks/phase-18-code-export-v2/s113-recordlive-drive/readings-run1-effect-form.json — after the Id is typed, the runtime arm made no GET and showed no title; both export arms made one GET per Record and showed "Home"
---

EXP-011 §43 built two forms of the exported Record from one reading of `runOnValueChange: { controlSignal: 'fetch',
inputs: ['modelId'] }`: with Fetch wired the node reads on the signal, and with Fetch unwired "it reads on every change
of its Id", emitted as a `useEffect` keyed on the Id that calls `fetch<Type>ById`.

The runtime never did that. The Id setter calls `setModelID`, which binds the node to the process-wide record
(`Model.get(id)`) and flags the outputs it already holds; the one `scheduleFetch()` call is behind the Fetch port
(dbmodelnode2.ts, unchanged in this respect since the initial commit). The published doc says the same: "Setting
`modelId` binds the node to the record in the app's local record store — properties already known locally (for
example from a Query Records result) appear immediately … Triggering `fetch` loads the record fresh from the server."

Measured in the drive: the runtime's Records made no request when the Id arrived and showed nothing until a Set
Record Properties wrote the record; the exported ones each made a GET and showed the backend's title.

The faithful effect form is a bind, not a read: on an Id change, the row is the client's held copy for that Id
(P18-S111-RECORDLIVE's `subscribeRecord`), with no request, no Error and no Done. It changes what the four corpus
fixtures with an effect-form Record (due-desk, gallery-desk, link-desk, page-desk) do and re-grades `record.test.ts`'s
effect rows and §43.6's drive expectations, so it is its own change, not part of RECORDLIVE.
