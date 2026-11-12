---
id: P121-TWO003-CLOUDPOINTSTO
title: A pointsTo filter is refused in a cloud function's script — the cloud runtime has no collection schema to read
status: fixed
commit: (this session, the Beta sweep s5)
severity: medium
area: cloud runtime / Noodl.Records in a cloud function (`packages/noodl-runtime/src/api/queryutils.ts` `schemaFor`; the bundle's `metadata` is `{}`)
found: P121 TWO-003 s3, 2026-10-14
regression: packages/nodegx-backend/tests/p121-two003-cloud-points-to.test.ts
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

**Fixed (Beta sweep s5, 2026-10-25).** The service puts a live `collections()` on `_noodl_cloudservices` (the global it
already sets for code inside functions: the loopback endpoint, the run id), reading `schemaManager.exportSchemas()`.
`queryutils.schemaFor` asks it only when the runtime's own `dbCollections` has no such collection, and only in the cloud
runtime (`_noodl_cloud_runtime_version`), so a page is untouched and only a `pointsTo` filter pays for the read. Read
live, so a collection or a link column made after the functions loaded is known too. Not via the runtime's metadata:
`NoodlRuntime.instance` is whichever runtime was built last, and a failed candidate deploy leaves it on a discarded one.

**Graded.** `tests/p121-two003-cloud-points-to.test.ts` 3/3 (red 2/3 before with this row's exact words; the
`equalTo`-a-Pointer arm green throughout); the mutant without the service's reader red 2/3. Runtime filter specs 4
suites 96/96, runtime and backend tsc clean, the editor's `queryBeforeFilter` (compiles `queryutils.ts` with its own
tsconfig) 11/11, backend specs that run functions 39 suites 454/454.

Seen on the way: the refusal reached the script as a bare string (`e.message` undefined); see P18-S134-REFUSEDFILTERSENDS.
