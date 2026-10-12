---
id: P116-ONT-007-selflink
title: Renaming a collection that links to itself (a topic's parent) leaves that link pointing at the old name, on both engines
status: fixed
commit: 993a3ff1e
severity: medium
area: backend / both schema managers' `renameTable` (`noodl-runtime/src/api/adapters/local-sql/SchemaManager.ts`, `postgres/PgSchemaManager.ts`)
found: P116 ONT-007 s11, 2026-10-09
evidence: dev-docs/tasks/phase-116-the-person-says-what-their-world-is/ONT-007-THE-DIFF-IS-THE-MIGRATION.md §6.11
regression: packages/nodegx-backend/tests/ont-007-migration.test.ts "a collection that links to itself is renamed with its link: a topic's parent is a subject's parent"
---

A person has topics with a parent topic (P116's `part-of-tree` kind) and renames "Topic" to "Subject". Every record
is kept, but the `parent` field still says it points at "Topic" — a collection that no longer exists — so the
manager shows a link to nothing and a path rule or an `include` through it has no target. Measured on SQLite and
PostgreSQL, and after a restart.

Where: `renameTable` retargets every OTHER collection's links (it filters out the renamed one) and writes the renamed
declaration as `{ ...schema, name: newName }`, which keeps `targetClass: oldName` on its own columns.

Fixed: the renamed declaration is a fresh copy with its own links to the old name retargeted, on both engines.
