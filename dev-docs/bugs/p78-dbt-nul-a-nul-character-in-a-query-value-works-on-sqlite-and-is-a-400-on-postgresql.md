---
id: P78-DBT-NUL
title: A NUL character in a query value works on SQLite and is a 400 on PostgreSQL
status: open
severity: medium
area: backend / PostgreSQL adapter (query values)
found: P78 Digital Bricks Training template, the move to PostgreSQL, 2026-09-23
evidence: templates/digital-bricks-training/docs/START-HERE.md (PostgreSQL notes: "A NUL byte in a query parameter is fine on SQLite and fatal on PostgreSQL")
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
