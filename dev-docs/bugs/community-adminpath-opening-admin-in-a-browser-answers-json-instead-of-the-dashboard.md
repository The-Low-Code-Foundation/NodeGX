---
id: COMMUNITY-ADMINPATH
title: "Opening `<backend>/admin` in a browser answers `{\"error\":\"Not found: GET /admin\"}`: the dashboard is `/_admin`, and nothing says so"
status: fixed
commit: 4b3094410
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

**Fixed in 4b3094410. Released in `@nodegx/backend` 0.1.3, 2026-11-27** (`08888a0a9`, registry shasum
`2a1fcd4fc95b08dde1b7341fe91346158a1913e5`, the tarball tested). `@nodegx/mcp` still carries the old deploy and Worker
until the next kit release. The guide the deploy links to is live once The-Low-Code-Foundation/NodeGX#57 is merged.
