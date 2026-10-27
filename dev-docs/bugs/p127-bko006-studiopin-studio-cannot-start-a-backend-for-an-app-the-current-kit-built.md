---
id: P127-BKO006-STUDIOPIN
title: Studio pins the 0.2.6 backend, which refuses the "creator" rule the 0.2.7 kit writes, so it cannot start a backend for an app today's agent built
status: fixed
severity: high
area: "nodegx-studio package.json pins `@nodegx/mcp` 0.2.6 and `@nodegx/backend-map` 0.1.2 (vendor/NODEGX.json at NodeGX 2cac89c); 0.2.7 and 0.1.3 are published"
found: P127 BKO-006, 2026-10-27, the repair shop's drawn grade (Studio `editor/brief-check.mjs`)
evidence: "MEASURED: Start a backend on a copy of the repair app → 'exited before becoming ready … nodegx.security.json is not a valid security policy: collections.Job.permissions.find: unknown rule value \"creator\" (expected public | authenticated | nobody | role:<name>)'. So Privacy listed no table and the map said the app has no backend; the book club (no creator rule) drew 16/16."
owner: P127 BKO-006 (the pin move was already s6's item 2)
regression: dev-docs/tasks/phase-127-the-backend-in-the-open/briefs/grade.mjs
commit: nodegx-studio 668212a
---

Fix: Studio's pins move to `@nodegx/mcp` 0.2.7 and `@nodegx/backend-map` 0.1.3, vendor/ rebuilt at a NodeGX commit
beside them, and Studio's gates run.

Fixed in nodegx-studio 668212a: the pins moved, vendor/ rebuilt at NodeGX 2fde69490, every Studio gate green; the
repair shop's app draws 14/14 in `editor/brief-check.mjs`.
