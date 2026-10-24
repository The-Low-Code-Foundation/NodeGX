---
id: P123-S6-PATHNOTABLE
title: A path rule through a collection that has no table yet throws in the SQL and logs a save error, instead of reaching no rows
status: open
severity: low
area: runtime / built-in backend query (`packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts` `storageOf` :1064, reached from `buildAclPredicate` :397 via `buildPathSelect`)
found: P123-S6-CREATOREDITS fix, 2026-10-24, writing `packages/nodegx-backend/tests/p123-creator-edits.test.ts`
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
