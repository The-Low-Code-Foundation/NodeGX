---
id: P127-BKO006-CLOUDUSERNODE
title: A User node inside a cloud function fails "Not found: GET /users/<id>", though the examples check "is the caller staff?" with one
status: open
severity: medium
area: "the cloud runtime's User node (net.noodl.user.User in a function graph) asks the backend for `GET /users/<id>`, which it does not serve; examples that teach the check"
found: P127 BKO-006, 2026-10-27, the repair shop brief (REPORT.md item 1)
evidence: "MEASURED in the transcript: drive_page on Workshop, consoleErrors 'CloudFunction2 (/Pages/Workshop): Not found: GET /users/1507abd2-…'. The agent switched to Get User Roles with the request's caller id."
owner: none
---

To measure next: which example teaches it, and whether `GET /users/:id` should be served to a function (as the
master key) or the node should read the caller another way.
