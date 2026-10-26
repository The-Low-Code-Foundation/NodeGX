---
id: P127-BKO003-PROFILEWRITE
title: Opening the backend map on any app makes an empty LearnerProfile table in that app's backend, and the map then draws the training app's table on it
status: fixed
commit: pending (P127 BKO-003)
severity: medium
area: "@nodegx/backend-map 0.1.1 (`lib/asperson.mjs` `learnerIds`: `GET /api/LearnerProfile?limit=1000` with the admin credential, called by `views.world()` and the reach world); the backend's storage makes a table on a query (`LocalSQLAdapter._ensureTable`, `autoCreateTables`)"
found: P127 s3, 2026-10-26, measuring BKO-003 before building it (BKO-002's gate had seen `t:LearnerProfile` on the todo copy's map)
evidence: "MEASURED (no Chrome): a copy of templates/todo-list, its own backend (the kit's, @nodegx/preview 0.2.4). /admin/schema = [_User]; after `buildMap()` still [_User]; after `views.people()` = [LearnerProfile, _User]. The map's next load then draws a LearnerProfile block, and the header counts it (\"3 tables\" where the app has two)."
regression: dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/any-app.test.mjs "looking made no table on the backend" (×3 apps) and "todo: no LearnerProfile block"
owner: P127 BKO-003
---

What a person sees: they open Data → Map in Studio (or `npx @nodegx/backend-map`) on their own app, say a todo
list, and the map shows a table called "Learner Profile" that their app never had. It is also now really in their
backend: an empty table, made by the map, which says on its own first line that opening is reading.

Why: the map asked "who is signed in, as the app's screens know them" by reading the training app's
`LearnerProfile` table (userId → learnerId), on every app. The backend's storage makes any table a query names
(`autoCreateTables`), so the read made the table. The map was written against the training app, and this was one
of a dozen assumptions BKO-003 lists.

Fix (BKO-003): `lib/people.mjs` reads the app's own tables. A column names a person when the schema points it at
`_User` (or, as a labelled fallback, when its name is `owner`, `userId`, `createdBy`, `ownerId` or ends in
`UserId`). A "profile" table is one whose person column is unique and which has a key of its own; only those are
read, and only when the backend already has them. The training app's LearnerProfile is found that way and gives the
same learner ids as before (Marie Dubois still reaches 37 of 289 rows in the same 13 tables). The todo copy's backend
keeps exactly `_User` after the map is opened, looked at as each kind of person and as each real person.

Not filed, unmeasured: whether a request that is NOT the admin's (a signed-in person's `GET /api/<new name>`) also
makes a table, or is refused by the rules first. The map's request was the admin's.
