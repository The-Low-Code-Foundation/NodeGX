---
id: P112-OWN026-CONFIGFOUROHFOUR
title: The preview answers 404 for nodegx-config.json, so every page load of every previewed app logs a red console error
status: open
severity: low
area: preview server (`packages/noodl-preview/src/server.ts` :237-240, the DEP-001 "no override" answer) × the viewer's deploy config read (`packages/noodl-viewer-react/src/deploy-config.ts`)
found: P112 OWN-026, the graders of t1-nodegx-3 and t2-nodegx-c01, 2026-10-23
evidence: own026-grades/t2-nodegx-c01/grade.json notes — "Every console error was a 'Failed to load resource' 404 for /nodegx-config.json (27 across the walkthrough)"; t1-nodegx-3's grade, "one or two per page load, coming from the preview server rather than the app"
---

The viewer asks for `nodegx-config.json` on boot (DEP-001: a deployed app may re-point its backend). The preview
server answers it with a 404 on purpose, so a stray file in the project can't override the preview's own backend.
That is right as a rule, but the browser logs every 404 as a console error. Every NodeGX app run through
`npx @nodegx/preview` shows 1–2 red "Failed to load resource" lines per page load, though nothing is wrong.

Cost so far: none to an agent (0 mentions of the file in four NodeGX rounds' traces). The graders read past it and
counted it separately from uncaught errors. But "no console errors" is a check people and agents make, and a
previewed NodeGX app can't pass it.

Likely fix: answer `200 {}` (or `204`) for that path. The viewer's `parseDeployConfig` already reads an empty object
as "no override", so the rule stays the same and the console stays clean. Test: the preview's response for
`/nodegx-config.json` is not an error status, and a boot from it uses the build's backend.
