---
id: NPMAUDIT-BACKENDMAPSCREENS
title: Backend map shows no screens for an app that queries from a page
status: fixed
severity: medium
area: backend-map / screens
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
regression: dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/test/screens-from-pages.test.mjs
commit: b5495303d
---

`lib/project.mjs` (≈ lines 224–239) finds screens only through `CloudFunction2` calls, so an app that queries records from a page (the MCP's canonical `repeater-query-records`) gets `screens: []`, `calls: []`. Personas are hard-coded ('A signed-in learner', staff; `lib/asperson.mjs` queries `/api/LearnerProfile`) and the README speaks of 'the training app'. Its `repository.directory` is `dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor` (404 on main).

**Fixed (2026-10-25, the Beta sweep), not yet released (`@nodegx/backend-map` 0.1.1 is what npm has):**
`analyseProject` also reads each non-cloud component's own record nodes (Query Records, a record, New / Set / Delete
Record, links) into `uses` (screen, the component it sits in, table, reads / creates / changes / deletes, what makes it
run), and a screen is any page that calls a function OR uses a table. The canvas wires such a screen straight to the
table, the screen panel lists each use with the table's own rule, and the "as a person" screen view asks the backend's
rule check for each use as that person (nothing is read or written) instead of answering "That screen asks the backend
for nothing." The persona is "A signed-in person" and the README no longer says "the training app". Measured on the
todo template: `screens: []` before, `['Pages/Todo']` with 28 reads and writes after. Not done: the
`repository.directory` 404 (the folder is on cline-dev, not main); the page drive in Chrome is in the package's
`npm test`.
