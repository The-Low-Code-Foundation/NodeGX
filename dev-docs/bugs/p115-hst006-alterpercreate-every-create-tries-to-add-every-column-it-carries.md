---
id: P115-HST006-ALTERPERCREATE
title: "Every create sends one ALTER TABLE ADD COLUMN per field it carries, even when the table has every column, and swallows the \"duplicate column\" error"
status: open
severity: low
area: runtime / local-sql create (`packages/noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts` :1060–1073 and :1180 save, `SchemaManager.addColumn` :316 tries the ALTER before checking)
found: P115 HST-006 session 5, 2026-11-04, the Durable Object engine ledger (`/__ops`), and the same count over node:sqlite
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §6.3
---

On a declared 4-column collection, one create is 7 statements, 4 of them `ALTER TABLE … ADD COLUMN` that fail with
"duplicate column name" and are caught (51 creates → 51 failures per column in the ledger). Nothing is wrong in the
answer. On Node it costs microseconds; on a Cloudflare Durable Object each statement is CPU on a plan that counts it,
and each failure is a thrown and caught error.

Fix: check `getTableSchema(table).columns` (already cached in `_schemaCache`) before the ALTER, and only add a column
the table does not have. Small.
