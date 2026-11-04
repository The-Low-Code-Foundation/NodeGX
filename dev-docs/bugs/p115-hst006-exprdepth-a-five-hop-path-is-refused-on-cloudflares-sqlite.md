---
id: P115-HST006-EXPRDEPTH
title: "A five-hop path filter (and any path with a row rule at every hop) is refused on Cloudflare's SQLite: \"Expression tree is too large (maximum depth 100)\""
status: open
severity: low
area: runtime / local-sql path filter (`packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts`, the `path` operator's SQL); only on a Cloudflare Durable Object (HST-006 spike), not reachable by a person today
found: P115 HST-006 session 5, 2026-11-04, the conformance suite inside a Durable Object, locally (workerd) and on Richard's account, 3 runs
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-006-THE-CONTRACT-ON-D1.md §6
---

`paths/five-hops-the-members-on-my-accounts-companies` and `paths/the-acl-applies-at-every-hop` fail inside a
Durable Object with `Expression tree is too large (maximum depth 100): SQLITE_ERROR`. The same SQL passes on
`node:sqlite`, whose default `SQLITE_MAX_EXPR_DEPTH` is 1000; Cloudflare's build caps it at 100 (not in its docs as of
2026-11-04: measured). The other 12 path cases pass. The adapter refuses loudly (the error callback), so no wrong
rows are answered.

Fix: emit a path's hops as joins (or a flat `IN (SELECT …)` per hop combined with AND) instead of nesting, so depth
grows by a constant per hop; the case is the gate. Only needed if a Workers adapter is built (R3).
