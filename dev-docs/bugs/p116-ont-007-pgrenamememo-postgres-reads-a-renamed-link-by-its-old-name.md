---
id: P116-ONT-007-pgrenamememo
title: On PostgreSQL, after a link field or the collection it points at is renamed, the backend reads the link by its old name until it restarts — a permission rule through it answers 500
status: fixed
commit: 993a3ff1e
severity: high
area: backend / PostgreSQL schema manager (`noodl-runtime/src/api/adapters/postgres/PgSchemaManager.ts` `renameColumn`, `renameTable`) — the declared-types memo (`local-sql/schemaCommon.ts` `declaredProperties`, keyed by the schema object)
found: P116 ONT-007 s11, 2026-10-09 (the route's spec, `ont-007-route` "after: the next request is judged by the moved rules")
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.11
regression: packages/nodegx-backend/tests/ont-007-migration.test.ts "the adapter follows a renamed link at once — the collection and the field — after a read before the rename"
---

A person renames "account" to "subscription". On a backend serving from PostgreSQL, the next request a signed-in
person makes through a rule that follows that link ("a person sees the people on their account") fails with 500:
`hop 2: "subscription" on "Person" is not a declared link (it is String)`. `GET /admin/schema/Person` shows the
field correctly as a link to Subscription; only the engine's own reading of it is wrong, and it stays wrong until
the backend restarts. SQLite was not affected.

Where: the adapter reads a collection's declared types through `declaredProperties()`, which memoises against the
schema OBJECT (a WeakMap — cheap per row, BRG-D8). BMG-003 already found that an in-place edit defeats it and made
`addColumn` put a fresh copy in place (`freshSchema`). PostgreSQL's `renameColumn` still set `col.name = newName`
on the cached object, and `renameTable` set `c.targetClass = newName` on every other collection's cached object —
so a collection read once before the rename kept its old map.

Fixed: both put fresh copies in place (and put the old objects back on a queued refusal). The regression reads the
link through a `$path` before the table rename, between the two renames and after; each in-place edit restored on
its own turns it red on PostgreSQL with the sentence above.
