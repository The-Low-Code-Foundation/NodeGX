---
id: P115-HST006-EXPRDEPTH
title: "A five-hop path filter (and any path with a row rule at every hop) is refused on Cloudflare's SQLite: \"Expression tree is too large (maximum depth 100)\""
status: fixed
commit: adb3aa92a
severity: low
area: runtime / local-sql path filter (`packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts`, the `path` operator's SQL); only on a Cloudflare Durable Object (HST-006 spike), not reachable by a person today
found: P115 HST-006 session 5, 2026-11-04, the conformance suite inside a Durable Object, locally (workerd) and on Richard's account, 3 runs
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §6
regression: packages/nodegx-backend/tests/p115-hst015-durable-object-reds.test.ts "EXPRDEPTH"
fixed: "P115 HST-015, 2026-11-06 (Opus 5.5)"
---

`paths/five-hops-the-members-on-my-accounts-companies` and `paths/the-acl-applies-at-every-hop` fail inside a
Durable Object with `Expression tree is too large (maximum depth 100): SQLITE_ERROR`. The same SQL passes on
`node:sqlite`, whose default `SQLITE_MAX_EXPR_DEPTH` is 1000; Cloudflare's build caps it at 100 (not in its docs as of
2026-11-04: measured). The other 12 path cases pass. The adapter refuses loudly (the error callback), so no wrong
rows are answered.

Fix: emit a path's hops as joins (or a flat `IN (SELECT …)` per hop combined with AND) instead of nesting, so depth
grows by a constant per hop; the case is the gate. Only needed if a Workers adapter is built (R3).

**Fixed (HST-015, 2026-11-06).** Measured first: SQLite adds up the heights of every WHERE still open while it resolves
a subquery, so nested hops grow with the SQUARE of the hops (3 hops with the row rule at each fit under 100). Fencing
each previous hop into a FROM-clause subquery made it linear (7 hops), as did a plain CTE chain read through `IN`
(7). What stops the growth: one named step per hop, each JOINING the previous step in its own FROM
(`WITH RECURSIVE "_pN_h0" AS (…), "_pN_h1" AS (SELECT DISTINCT … FROM "_pN_h0" JOIN …) …`), measured over 60 hops at
depth 100 in Python's sqlite3 with `setlimit`. The gate replays every statement a run sends through Python's sqlite3
at depth 100 (node:sqlite has no `sqlite3_limit`): before, exactly the three statements of the two red cases; after,
none, for the whole suite and for an eight-hop path (the contract's most) with the rule at every hop. workerd: the
suite 103/103 in a real object. PostgreSQL 103/103 (`brg-005`).
