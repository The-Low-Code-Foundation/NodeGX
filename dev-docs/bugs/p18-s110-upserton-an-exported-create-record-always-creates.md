---
id: P18-S110-UPSERTON
title: An exported Create Record with Upsert On always creates a new row
status: fixed
commit: 78be5aed5
severity: medium
area: export / Create Record
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: NewDbModelProperties.upsertOn
---

Runtime: `newdbmodelpropertiesnode.ts` :99-108, :156 updates the existing row on a clash of the named unique key. Export:
zero reads of `upsertOn`; link-desk's `createPuppy` is emitted identically, so an exported app creates a duplicate (or fails on
the unique index) where the editor updated.

**Fixed (refused by name), session 111.** A Create Record whose Upsert On names a property (trimmed, as the setter
does), or is wired, defers with a sentence instead of exporting a create. **Follow-up, not filed as a defect:** carrying
it is an `X-NodeGX-Upsert` header on the exported client's `create`. That changes every connected fixture's
`client.ts`, and the backend's upsert answer has to be measured against `fromWire({ ...data, ...response })` first.
