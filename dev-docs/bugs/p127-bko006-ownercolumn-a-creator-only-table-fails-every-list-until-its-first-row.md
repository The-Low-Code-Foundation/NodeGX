---
id: P127-BKO006-OWNERCOLUMN
title: A table only its makers may list answers "no such column owner" (HTTP 500) to every list until someone has made its first row
status: fixed
severity: high
area: "noodl-runtime local-SQL `QueryBuilder.buildAclPredicate`: a rule's narrowing (`{ owner: <user> }`) was compiled without the table's columns, so a table made up front (createTable, as `provision_backend` makes it) with no `owner` column yet threw in SQL; the column arrives with the first row an owner makes"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 3)
evidence: "MEASURED in the transcript: drive_page on My Jobs, consoleErrors 'DbCollection2 (/Pages/My Jobs): no such column: \"owner\"'. REPRODUCED against @nodegx/mcp 0.2.7's backend: createTable Job, rule find: creator, a signed-in list → 500 'no such column: \"owner\"'; after one row, 200. The default rule (find: authenticated + creatorOwns) does not narrow and did not fail, which is why the book club never met it."
kit: core
regression: packages/nodegx-backend/tests/p127-owner-column.test.ts
owner: P127 BKO-006
commit: 2fde69490
---

What a person sees: a freshly shipped app where "each customer sees only their own" fails on every new customer's
first page, until someone, anyone, has booked. The agent's workaround was adding the column by hand.

Fixed: the narrowing is read against the columns the table has now (the adapter's own `present` set), so a missing
`owner` is `NULL = ?` and reaches nobody, as a rule's path through a table that does not exist yet does
(P123-S6-PATHNOTABLE). SQLite and PostgreSQL, both in the test.
