---
id: P116-S22-SERIESMSG
title: When a number the store handed out collides with one already used, the 409 says `undefined is already used` — the words read the request body, which never carried the number
status: fixed
commit: 562e10453
severity: low
area: backend / unique-violation words (`nodegx-backend/src/server/http-util.ts` `uniqueViolationToHttp(message, values)`: `values` is the request body; the series number is filled in by the adapter's `create`)
found: P116 ONT-015 s22 (Opus 5.5), 2026-10-11 — `ont-015-projection.test.ts`, the "counter left where it was" mutant, on SQLite and PostgreSQL
evidence: `{"status":409,"error":"\"number\" is unique in \"Invoice\" and undefined is already used. Send X-NodeGX-Upsert to update the existing record instead."}` — and the body's `value` is undefined too, so a Create Record node's Failure cannot say which number
regression: packages/nodegx-backend/tests/ont-015-series.test.ts "mutant — the counter not moved by a number brought … the 409 names it" and ont-015-projection.test.ts "mutant — the counter left where it was" (both engines); runtime test/adapters/SchemaManager.indexes.test.js "a unique refusal of a number the store handed out names it"
---

The 409 is composed in the backend because SQLite's message names the columns and not the value, so the value is
taken from the body. A series field is the one field the body never carries (a person may not, by the door), so its
value is always `undefined` here. Reachable without a mutant through `P116-S22-SERIESCARRY`. **The fix:** the
adapter's create attaches what it handed out to the refusal (or the facade reads the series fields it filled), and
`uniqueViolationToHttp` takes those values over the body's.

**Fixed (s23, `562e10453`).** The adapter's create appends the values it filled for the colliding fields
(`QueryBuilder.uniqueConstraintWithValues` → `UNIQUE constraint failed: Invoice.number; values {"number":"T-0003"}`),
`uniqueConstraintProblem` reads them back, and `uniqueViolationToHttp` takes them over the body's. Two traps on the
way: PostgreSQL's error is only translated in `_run`, after the create's catch, and a second translation said
`?.?` — `translatePgError` is idempotent now; and node:sqlite's error under jest is from another realm, so
`instanceof Error` is false (the catch duck-types `message`). With SERIESCARRY fixed it is reachable only through
a counter moved by hand; the mutants are what grade it. Taking the fix out of the 409 composer reds 4 arms (2 × 2 engines).
