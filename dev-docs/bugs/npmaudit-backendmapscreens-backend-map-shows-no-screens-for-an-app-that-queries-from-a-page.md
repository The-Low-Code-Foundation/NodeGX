---
id: NPMAUDIT-BACKENDMAPSCREENS
title: Backend map shows no screens for an app that queries from a page
status: open
severity: medium
area: backend-map / screens
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
---

`lib/project.mjs` (≈ lines 224–239) finds screens only through `CloudFunction2` calls, so an app that queries records from a page (the MCP's canonical `repeater-query-records`) gets `screens: []`, `calls: []`. Personas are hard-coded ('A signed-in learner', staff; `lib/asperson.mjs` queries `/api/LearnerProfile`) and the README speaks of 'the training app'. Its `repository.directory` is `dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor` (404 on main).
