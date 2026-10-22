---
id: P112-OWN026-INCREMENTNEWFIELD
title: "An `Increment` on a field no record of the collection has set yet answers 404 \"Object not found\": the SQL adapters never add the column, so the UPDATE throws and the wire reports a missing row"
status: fixed
commit: f2afd62b0
phase: P112
task: OWN-026 FIX-01
severity: medium
area: "runtime adapters: `noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts` and `postgres/PostgresAdapter.ts` `increment` (no auto-column, which `save` does); surfaced by `nodegx-backend` `PUT /classes/:c/:id` with `{ field: { __op: 'Increment' } }` and `Noodl.Records.increment`"
kit: backend
regression: packages/nodegx-backend/tests/own026-enforce-rules.test.ts "OWN-026 FIX-01 C — Increment on a field no record has set yet"
found: P112 OWN-026 FIX-01, 2026-10-22, measuring what the kit can teach for a value several devices change
evidence: "a scratch backend from `nodegx-backend/dist/cli.js`: a row created with `{a:1}`, then `PUT {b:{__op:'Increment',amount:1}}` → 404 `{\"error\":\"Object not found.\",\"code\":101}`; `PUT {a:{__op:'Increment',amount:1}}` on the same row → 200 `{\"a\":2}`. The spec is red 1 of 1 with the adapter change removed."
---

`buildIncrement` already writes `COALESCE(col, 0) + ?`, so a NULL value starts at the amount. A column the table
does not have is a different failure: SQLite throws "no such column", `classPut` catches it, and every unknown error
there becomes `404 Object not found`. So the first `+1` to a new counter, which is exactly when an app makes one,
reads as "your record is gone". `save` adds missing columns before its UPDATE (`autoCreateTables`); `increment` now
does the same, as a Number, in both adapters.
