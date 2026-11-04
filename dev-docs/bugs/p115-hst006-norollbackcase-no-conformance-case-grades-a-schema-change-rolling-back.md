---
id: P115-HST006-NOROLLBACKCASE
title: "No conformance case grades atomicity: an engine that silently drops every BEGIN, COMMIT and SAVEPOINT the schema code issues still passes the whole suite"
status: open
severity: medium
area: backend-contract / conformance (`packages/nodegx-backend-contract/conformance/cases/schema.ts`); the statements it misses are `packages/noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` :378 (SAVEPOINT, drop column), :471 and :640 (BEGIN/COMMIT)
found: P115 HST-006 session 5, 2026-11-04, the Durable Object engine shim's ledger
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §6 (the control arm "faithful")
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
