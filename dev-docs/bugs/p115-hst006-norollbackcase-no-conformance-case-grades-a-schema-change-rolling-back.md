---
id: P115-HST006-NOROLLBACKCASE
title: "No conformance case grades atomicity: an engine that silently drops every BEGIN, COMMIT and SAVEPOINT the schema code issues still passes the whole suite"
status: fixed
commit: adb3aa92a
severity: medium
area: backend-contract / conformance (`packages/nodegx-backend-contract/conformance/cases/schema.ts`); the statements it misses are `packages/noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` :378 (SAVEPOINT, drop column), :471 and :640 (BEGIN/COMMIT)
found: P115 HST-006 session 5, 2026-11-04, the Durable Object engine shim's ledger
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §6 (the control arm "faithful")
regression: packages/nodegx-backend-contract/conformance/cases/schema.ts "schema/a-change-that-fails-halfway-changes-nothing"
fixed: "P115 HST-015, 2026-11-06 (Opus 5.5)"
---

The suite says an adapter "moves" when every case passes. HST-006 ran it through an engine shim that drops every
transaction-control statement `SchemaManager` sends through `exec()` (23 SAVEPOINT/RELEASE pairs and 2 BEGIN/COMMIT
pairs a run) and counts them: over `node:sqlite`, where nothing else differs, the suite answered **101 of 102**, the
one red being the regex filter the shim leaves out on purpose. So the suite cannot tell an adapter whose schema changes
are atomic from one whose half-done drop-column or type change is left in the database when a step throws.

This matters on the first engine that cannot run those statements: a Cloudflare Durable Object refuses BEGIN and
SAVEPOINT in SQL (its transactions are `ctx.storage.transactionSync(fn)`).

Reproduce: `node dist/control.cjs` in `dev-docs/tasks/phase-115-online-on-your-own-account/spike-records/` (bundle it
first, HST-006 §6), arm `faithful`.

Fix, two parts: (1) a case per schema move that forces a failure mid-way (a drop of a column an index needs, a type
change over a row that cannot convert) and asserts the table is exactly as before; (2) `SchemaManager`'s three
`exec('BEGIN'|'SAVEPOINT')` sites go through `this.db.transaction(fn)`, which every engine already implements, so a
Durable Object can answer them with `transactionSync`. About half a session.

**Fixed (HST-015, 2026-11-06).** The case: a text field with a unique index holding "1" and "1.0", retyped to Number,
is refused (the clash is found at the last step, re-making the index, after the old column has gone) and the field is
still text with both values and its index; the control retype goes through. Red on the engine as it was (Node
stand-in and workerd: *"a refused change converted a value: it was half done: expected "1", got 1"*), green after on
node:sqlite, the stand-in, workerd and PostgreSQL (where the refusal arrives at the next data-plane call: the case
waits for it). The fix: SchemaManager's six hand-written blocks go through one `_atomically(fn)`: an engine's own
`atomic` when it has one (the Durable Object's: `transactionSync`, which nests: measured on workerd, an inner block
that throws rolls back alone), a named SAVEPOINT otherwise. The ledger's dropped transaction statements went from
50 a run to none; `changeColumnType` left the coverage gate's uncovered list.
