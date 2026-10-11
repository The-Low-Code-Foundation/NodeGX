---
id: P116-ONT-007-required
title: No schema route makes a field required once records exist, except by filling every record with one value — a migration that fills a required link record by record cannot keep "every person must have one" afterwards
status: fixed
commit: bd7f54a64
severity: medium
area: backend / schema route (`nodegx-backend/src/server/byob-admin.ts` `mutateSchema`: `addColumn` takes `fillExisting`, one value for every row; no action sets or clears `required` on an existing field) and the schema surface (`IStorageSchema`: no `setRequired`)
found: P116 ONT-007 s7, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.2, §6.3
regression: packages/nodegx-backend/tests/ont-007-migration.test.ts "keeps every claim of the old world — the link made required once the move has filled it" (and its mutant, "without its setRequired step"); ont-007-required-route.test.ts; conformance `schema/set-required-over-records` (both engines); noodl-runtime/test/adapters/SchemaManager.setRequired.test.js
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

**Fixed (P116 s24, 2026-10-11, Opus 5.5).** `setRequired(table, { field: true | false })` on the schema surface
(`IStorageSchema.setRequired?`), both managers, the migration executor and `POST /admin/schema`:

- **SQLite** counts the empty records first and throws `FieldEmptyError` (`code: 'FIELD_EMPTY'`, `count`) before
  anything changes; otherwise it rebuilds the table (`_rebuildNotNull`): the columns as `PRAGMA table_info` holds
  them with the flag changed, every row copied **with its rowid** (a search index's external content joins on it),
  the table's indexes and triggers (declared indexes, checks, search) re-made from their stored SQL — one transaction.
- **PostgreSQL** changes the model at once and queues `LOCK` → count → `ALTER COLUMN … SET / DROP NOT NULL` → the
  declaration; the same `FieldEmptyError` arrives at the barrier and the model is put back.
- **The route** answers 409 in the managers' words with `{ reason: 'field-empty', field, count }` — on PostgreSQL by
  reading the queue error's `cause` — so the refusal reaches the person who asked, not whoever writes next.
- **The executor** applies `setRequired` and knows a new dry-run refusal, `empty` (records with no value at all —
  the store's NOT NULL, not an empty text).
- **The planner:** a required link a move fills is added optional, filled, then made required in the rules phase;
  `notKept` is empty for the mirror. A field whose only change is whether it is required is now a step (with an
  `empty` check when made required) instead of "changing in place is not migrated yet". Made optional goes before a
  link's "when it goes" step, made required after it — the store refuses either half out of order.

Measured on both engines: the mirror's claims all kept on the migrated tables, a person made without an account
refused after the run; the mirror **without its setRequired step** runs `ran: true` and the grade names
`person/account-is-required` (the mutant); an in-place tightening is stopped by the dry run with no backup while a
person has none, and runs once each has one; with the dry-run check taken out the store refuses at the step, after
the backup, in words. Mutants shown red: SQLite rebuild without re-made indexes/triggers, without the rowid copy,
without the count; PostgreSQL without the count (conformance 101/102); the route without the barrier translation
(the PostgreSQL 409 arm only).

Found while fixing it: `P116-S24-TYPEREQUIRED` (SQLite's `changeColumnType` dropped NOT NULL) — fixed with the same rebuild.

