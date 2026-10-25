---
id: P123-S6-PATHNOTABLE
title: A path rule through a collection that has no table yet throws in the SQL and logs a save error, instead of reaching no rows
status: fixed
commit: (this session, the Beta sweep s4)
severity: low
area: runtime / built-in backend query (`packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts` `storageOf` :1064, reached from `buildAclPredicate` :397 via `buildPathSelect`)
found: P123-S6-CREATOREDITS fix, 2026-10-24, writing `packages/nodegx-backend/tests/p123-creator-edits.test.ts`
regression: packages/nodegx-backend/tests/p123-s6-path-no-table.test.ts
evidence: an update rule `["creator", { path: { hops: [{ from: "Moderator", by: "user" }, { follow: "note", to: "Note" }], maxDepth: 2 } }]` before any Moderator row exists; a signed-in non-maker's PUT logs `LocalSQLAdapter.save error: Error: The path goes through "Moderator", and there is no such collection` with its stack, and is answered 404
---

A permission rule's path names a collection the app has not written a row to yet (a Moderator table, before the
first moderator is appointed). Every write the rule decides then throws inside the SQL builder: the server log gets a
`LocalSQLAdapter.save error` with a stack, and the caller gets 404. The answer is right (nobody is reached, so nobody
is let in), but a normal refusal reads as a crash in the log, and a person road-testing their rules on a fresh
backend sees an error where nothing went wrong.

The fix is for a path through a missing collection to reach no rows (an empty select) when it is a permission's
narrowing, while a query a person wrote through a missing collection can keep saying so. The test seeds one
Moderator row so it stays about `creator`.

**Measured worse than filed (2026-10-25, the Beta sweep s4):** with `find`/`get` holding the same path, every list
of Notes answered **500** "The path goes through "Moderator", and there is no such collection" — to the note's own
maker too, since the rule ORs `creator` with the path in one predicate. Writes answered 404 with the logged stack.

**Fixed.** `QueryBuilder.buildAclPredicate` compiles a rule's narrowing with `narrowing: true` on its path env;
`buildPathSelect` turns the three "no such collection" refusals (the start, a `from` hop, a `follow … to`) into an
empty select (`SELECT CAST(NULL AS TEXT) WHERE 1 = 0`) there, and takes back the parameters the abandoned walk
pushed. A path a person writes into their own `where` through a missing collection is still refused by name. The
error is marked by a property, not a subclass (`instanceof` fails on an ES5 build). `p123-creator-edits` no longer
seeds a Moderator row to dodge it.

**Graded.** `tests/p123-s6-path-no-table.test.ts` 8/8 on SQLite and PostgreSQL (red 3/4 on SQLite before): someone
else refused on find/get/update/delete with nothing logged; the maker reads and edits; a query's own `$path`
through `Nowhere` still refused by name; once a moderator is appointed, they are let in. Three mutants red (no
narrowing flag, no parameter rollback, the query's refusal swallowed too). Neighbours: 18 security/path suites,
233 passed; BRG-003/005 conformance SQLite + PostgreSQL 34/34; backend and runtime tsc clean.

