---
id: COMMUNITY-ADMINPATH
title: "Opening `<backend>/admin` in a browser answers `{\"error\":\"Not found: GET /admin\"}`: the dashboard is `/_admin`, and nothing says so"
status: fixed
commit: uncommitted (working tree, 2026-11-27)
regression: packages/nodegx-backend/tests/community-cfsecrets-deploy-guide.test.ts
severity: low
area: "`packages/nodegx-backend/src/server/HttpServer.ts` `handle`, the not-found branch; shipped in the Worker of `@nodegx/backend`"
found: Community report via Richard, 2026-11-27. Told the deployed backend has an admin page, the builder opened `/admin` on the workers.dev address
evidence: "The builder's browser showed `{\"error\":\"Not found: GET /admin\",\"requestId\":\"3bd4820b-…\"}`. `admin` is a route family (`/admin/status`, `/admin/secrets`, …), so the Worker's front door sends the path to the backend, and the dispatcher's 404 is JSON for an API caller."
---

The backend's dashboard is at `/_admin`. Its API is under `/admin/…`. A person who drops the underscore gets a JSON
error that names neither.

**Proposed fix:** in the dispatcher's not-found branch, when the dashboard is on, answer a browser's `GET /admin`
(Accept `text/html`) with a 302 to `/_admin`. An API caller (no `text/html`) keeps the JSON 404.
