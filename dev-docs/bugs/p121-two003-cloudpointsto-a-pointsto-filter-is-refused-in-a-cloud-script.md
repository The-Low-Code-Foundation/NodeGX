---
id: P121-TWO003-CLOUDPOINTSTO
title: A pointsTo filter is refused in a cloud function's script — the cloud runtime has no collection schema to read
status: open
severity: medium
area: cloud runtime / Noodl.Records in a cloud function (`packages/noodl-runtime/src/api/queryutils.ts` `schemaFor`; the bundle's `metadata` is `{}`)
found: P121 TWO-003 s3, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §6.5; `packages/noodl-mcp/tests/two003Cloud.ts` header
---

In a cloud function's JavaScript, `Noodl.Records.query('Seller', { country: { pointsTo: id } })` rejects with
"Filtering "country" by the record it points to needs the collection schema, so that the related collection is
known." The function runs on the built-in backend that holds that schema, but the cloud runtime's `CloudStore._collections`
is empty, so `schemaFor` finds nothing. `pointsTo` is the filter the docs and the editor's Query Records offer for a
link, so a script copied from a page fails in a function.

Measured with a throwaway function on a real backend (2026-10-14): `create('Seller', { country: '<id>' })` stores the
pointer; `pointsTo` is refused; `{ country: { equalTo: { __type: 'Pointer', className: 'Country', objectId: id } } }`
returns the row. The marketplace's functions all use that spelling (`ptr()` in `two003Cloud.ts`).

Reproduce: a cloud function whose Function node runs the `pointsTo` query above against any collection with a
Pointer column.

Fix, proposed: the backend hands its runtime the schema it already has (fill `CloudStore._collections` from the
backend's own schema at load and on a schema change), so `pointsTo` translates as it does in a page. Owner: NONE.
