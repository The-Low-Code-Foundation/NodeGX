---
id: P116-ONT-007-required
title: No schema route makes a field required once records exist, except by filling every record with one value — a migration that fills a required link record by record cannot keep "every person must have one" afterwards
status: open
severity: medium
area: backend / schema route (`nodegx-backend/src/server/byob-admin.ts` `mutateSchema`: `addColumn` takes `fillExisting`, one value for every row; no action sets or clears `required` on an existing field) and the schema surface (`IStorageSchema`: no `setRequired`)
found: P116 ONT-007 s7, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.2, §6.3
regression: packages/nodegx-backend/tests/ont-007-migration.test.ts "keeps every claim of the old world but the one it said it would not"
---

A person said "some members are on two accounts", lived with it, then said again "a member belongs to one account".
The migration back (`planMigration` → `runMigration`) gives every person the account of their one membership, record
by record. The world says the link is required. The route can only add a required field over existing records with
`fillExisting` — the same value written into every one of them — which for a link means a placeholder record nobody
named. So the link is added without `required`, filled by the move, and the rule is never put back: new people can be
made without an account.

Measured on SQLite and PostgreSQL: after the migration, the claim `person/account-is-required` fails at the step
that says its rule (a person made without an account is accepted). The plan says so up front (`plan.notKept`, with
the reason in words), so nothing is hidden — but nothing keeps it either.

Fix: a schema action that makes an existing field required (and optional), refused in words when any record has the
field empty ("3 people have no account"), on both engines (SQLite rebuilds the table, as `changeColumnType` does;
PostgreSQL `ALTER COLUMN … SET NOT NULL`). Then `planMigration` emits it after the move and `notKept` empties; the
regression above fails ("the label is wrong") until the planner is told. The same action is what a changed `required`
answer needs (§6.2: refused today as "changing in place is not migrated yet").
