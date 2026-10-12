---
id: P78-DBT-NUL
title: A NUL character in a query value works on SQLite and is a 400 on PostgreSQL
status: fixed
commit: 3e18ea4cc
phase: P109
task: ISL-039
severity: medium
area: backend / PostgreSQL adapter (query values)
found: P78 Digital Bricks Training template, the move to PostgreSQL, 2026-09-23
evidence: templates/digital-bricks-training/docs/START-HERE.md (PostgreSQL notes: "A NUL byte in a query parameter is fine on SQLite and fatal on PostgreSQL")
regression: packages/nodegx-backend-contract/conformance/cases/filters.ts "filters/a-nul-in-a-value-matches-nothing-on-every-engine"
---

The same cloud function answers on SQLite and fails with a 400 on PostgreSQL when a query compares against a string
containing `\u0000`. DBT's `shared/Programme` used `'\u0000none'` as an impossible value for an empty `containedIn`.
`course` and `learnerProgramme` answered 400 on PostgreSQL until it was removed. A project moved to PostgreSQL
breaks in a place only the move reveals.

**Where:** the PostgreSQL adapter (`packages/noodl-runtime/src/api/adapters/postgres/`) passes the value to `pg`.
PostgreSQL `text` cannot hold NUL, and nothing in the adapter or `packages/nodegx-backend/src` handles it (`git grep`
for `\u0000` / NUL at HEAD, 2026-10-01). Not re-measured since 2026-09-23.

**Reproduce:** on a PostgreSQL backend, a `Query Records` with an `equalTo` (or `containedIn`) on a string field
whose value contains `\u0000` returns 400. The same query on SQLite returns `[]`.

**Proposed:** decide one behaviour for both engines. Either refuse a NUL in a string value on both, with a sentence,
or treat it as matching nothing on PostgreSQL, the way SQLite does. Add a conformance row. Small.

**Fixed (P109 s41, 2026-10-11, ISL-039).** Re-measured at HEAD first: the contract case passed on SQLite and failed on
PostgreSQL. The ledger offered two behaviours. s41 took "match nothing on PostgreSQL, the way SQLite does",
because it breaks no app that works today. Refusing on both engines would have broken DBT-shaped apps that run on
SQLite now. Say if the other was wanted.
- In the PostgreSQL dialect only, a string holding `\u0000` is compiled instead of bound. Equality and `$eq` are
  `FALSE`. `$ne` is `IS NOT NULL`. The value drops out of `$in` (an empty list is `FALSE`) and out of `$nin` (an empty
  list is `IS NOT NULL`, as SQLite's `NOT IN` answers).
- Graded: the case covers equality, `$eq`, `$in` with and without another value, `$nin` and `$ne`. PostgreSQL 85 / 85,
  SQLite 29 / 29 across the BRG-003 files, runtime adapter specs green.
- Not covered (not this row): WRITING a string with a NUL is still a PostgreSQL error and a SQLite success. That would
  be its own row if it is met.
