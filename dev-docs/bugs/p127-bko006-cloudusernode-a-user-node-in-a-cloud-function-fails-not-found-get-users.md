---
id: P127-BKO006-CLOUDUSERNODE
title: A User node inside a cloud function fails "Not found: GET /users/<id>", though the examples check "is the caller staff?" with one
status: fixed
severity: medium
area: "the cloud runtime's User node (net.noodl.user.User in a function graph) asks the backend for `GET /users/<id>`, which it does not serve; examples that teach the check"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 1)
evidence: "MEASURED in the transcript: drive_page on Workshop, consoleErrors 'CloudFunction2 (/Pages/Workshop): Not found: GET /users/1507abd2-…'. The agent switched to Get User Roles with the request's caller id."
owner: P127 s7
commit: a73312163
kit: core
regression: packages/nodegx-backend/tests/p127-cloud-user-node.test.ts
---

To measure next: which example teaches it, and whether `GET /users/:id` should be served to a function (as the
master key) or the node should read the caller another way.

## Fixed (P127 s7, 2026-10-27)

Measured first (`p127-cloud-user-node.test.ts`, before the fix): a signed-in caller, a function whose User node
fetches them, answered `{ error: "Not found: GET /users/<id>" }`, the stranger's words exactly. The cloud runtime's user
service (`noodl-viewer-cloud/src/services/userservice.js` `fetchCurrentUser`) reads the caller with the app's key at
`GET /users/<id>`, and the backend served `GET /users/me` and `PUT /users/:id` only.

The backend now serves `GET /users/:id` as `GET /classes/_User/:id`: the same `data` gate on `_User` (a new access form
that names its collection), the same read, the same stripped fields. So the examples that check "is the caller staff?"
with a User node now work as they teach. Graded with the rules enforced: the function answers the caller's username;
a visitor's `GET /users/:id` is refused exactly as `GET /classes/_User/:id` is, with no password hash in either.
Mutants: no route (2 red), the route made public (1 red). `ops-rate-limit`'s reviewed route tally moves `data` 19 → 20.
