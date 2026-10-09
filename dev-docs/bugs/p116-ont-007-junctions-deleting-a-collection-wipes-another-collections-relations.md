---
id: P116-ONT-007-junctions
title: Deleting a collection wipes the relations of every collection whose name ends with its name — "Post" takes "BlogPost"'s, "Account" takes "MyAccount"'s (SQLite) and "My_Account"'s (both engines)
status: open
severity: blocker
area: runtime / schema managers (`noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts` `deleteTable`, `postgres/PgSchemaManager.ts` `deleteTable`)
found: P116 ONT-007 s8, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.8
---

A person deletes the collection "Post". Every relation on "BlogPost" (a Relation field's links, kept in its junction
table) is gone too, with no word. Nobody touched "BlogPost".

Where: `deleteTable` finds the junction tables to drop by name. SQLite uses `LIKE '_Join_%_<table>'`, and in `LIKE`
an `_` matches ANY one character, so `_Join_tags_BlogPost` matches `_Join_%_Post`. PostgreSQL uses
`endsWith('_' + table)`, which matches `_Join_tags_My_Account` for "Account".

Measured 2026-10-09 on both engines (a throwaway spec through `createAdapter`, read before and after as the control):
three collections `MyAccount`, `My_Account`, `Account`, each with a Relation `tags` and one link.

| | before | after `deleteTable('Account')` |
|---|---|---|
| SQLite | MyAccount [t1], My_Account [t2], Account [t3] | MyAccount [], My_Account [], Account [] |
| PostgreSQL | same | MyAccount [t1], My_Account [], Account [] |

The name alone cannot say whose a junction is: `_Join_a_b_C` is key `a_b` on `C` or key `a` on `b_C`. Fix: drop the
junctions the table's own declaration names (`junctionTableName(table, col.name)` for each `Relation` column — what
ONT-007's `renameTable` does), and treat a junction no declaration names as the person's to delete, not a match by
suffix. Size: small, both engines, plus a regression beside `ont-007-migration.test.ts`'s `renameTable itself` block.
