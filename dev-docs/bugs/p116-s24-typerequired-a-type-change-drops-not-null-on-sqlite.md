---
id: P116-S24-TYPEREQUIRED
title: On the built-in backend (SQLite), changing a required field's type takes away its NOT NULL — afterwards records without it are accepted, while the declaration still says required
status: fixed
commit: bd7f54a64
severity: medium
area: runtime / SQLite schema manager (`noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` `changeColumnType`: add-copy-drop-rename adds the new column with `ADD COLUMN "x" <type>`, never `NOT NULL`)
found: P116 s24, 2026-10-11 (reading `changeColumnType` as the model for `setRequired`'s rebuild; measured, not guessed)
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.14
regression: packages/noodl-runtime/test/adapters/SchemaManager.changeColumnType.test.js "keeps a required field required through a type change, NOT NULL and all"
---

A collection with a required Number field `n`. `changeColumnType('P', 'n', 'String')` converts the values by adding a
temporary column, copying, dropping the old one and renaming — and SQLite will not `ADD COLUMN … NOT NULL` without a
default, so the new column is added without it. Measured on a real engine: `PRAGMA table_info` reads `notnull: 1`
before and `0` after, while `getTableSchema` still says `required: true`. A record made without `n` is then stored.

PostgreSQL is not affected: `ALTER COLUMN … TYPE … USING` keeps the constraint.

Not measured: how many projects have changed a required field's type (the editor's schema view and `provisionBackend`
both reach `changeColumnType`).

**Fixed (s24).** Inside the same transaction, after the copy, a required column is rebuilt with NOT NULL by the
rebuild `setRequired` uses (`_rebuildNotNull`). The regression reds with the line taken out, and only it.
