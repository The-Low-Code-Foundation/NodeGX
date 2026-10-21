---
id: P18-S134-REFUSEDFILTERSENDS
title: A Noodl.Records.query whose filter the translator refuses rejects, and still sends the query, with an empty where
status: open
severity: low
area: runtime / `Noodl.Records` (`noodl-runtime/src/api/records.js` `query`, `count`, `distinct`, `aggregate`), `QueryUtils.convertFilterOp`
found: P18 session 134, 2026-10-21, the Noodl Desk and the member arm (EXP-020): the runtime arm's request log against the export's
evidence: packages/nodegx-export/tests/the-noodl-api-travels.test.ts (A7, B2, B3 pin it by this id); dev-docs/tasks/phase-18-code-export-v2/s134-noodlapi/EXPECTED.md ("The wire")
---

`records.js` builds the request's `where` with `QueryUtils.convertFilterOp(filter, { error: (e) => reject(e) })`. A filter
the translator refuses (two keys in one object, an unknown operator, `between` with one bound, `relatedTo` with no class…)
calls `error` — the promise rejects with the translator's words — and then `convertFilterOp` **returns `{}`**, and the
store's query is sent anyway with `where: {}`. The script sees the rejection; the backend sees a query for every row of
the collection (up to its default limit), whose answer nobody reads.

Measured on both arms of `the-noodl-api-travels.test.ts`: 12 refused filters, each one extra `POST /classes/Task` with
`{ _method: 'GET', where: {} }` from the runtime, none from the export. `count`, `distinct` and `aggregate` share the shape
(read, not driven).

Not a wrong answer — the promise settles once, rejected — but a wasted request per refused filter, and on a large
collection a slow one. The exported app (`src/lib/noodl.ts`) rejects without sending.

**Fix shape:** in each of the four methods, return after `convertFilterOp` reported an error (a flag set by the `error`
callback), before the store is asked. The two arms then agree and the spec's mask for this id goes.
