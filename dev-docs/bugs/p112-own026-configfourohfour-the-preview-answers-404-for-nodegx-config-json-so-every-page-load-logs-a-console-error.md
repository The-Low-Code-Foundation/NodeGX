---
id: P112-OWN026-CONFIGFOUROHFOUR
title: The preview answers 404 for nodegx-config.json, so every page load of every previewed app logs a red console error
status: fixed
severity: low
area: preview server (`packages/noodl-preview/src/server.ts` :237-240, the DEP-001 "no override" answer) × the viewer's deploy config read (`packages/noodl-viewer-react/src/deploy-config.ts`)
found: P112 OWN-026, the graders of t1-nodegx-3 and t2-nodegx-c01, 2026-10-23
evidence: own026-grades/t2-nodegx-c01/grade.json notes — "Every console error was a 'Failed to load resource' 404 for /nodegx-config.json (27 across the walkthrough)"; t1-nodegx-3's grade, "one or two per page load, coming from the preview server rather than the app"
regression: packages/noodl-preview/tests/own026-config-not-404.test.ts "answers 200 with an empty object, so the browser logs nothing"
commit: 8e41f673f
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

## Fixed (2026-10-24)

The preview answers `/nodegx-config.json` with `200 {}` (no-store, like its other built answers): the viewer applies
nothing from an empty object, so the preview's own backend still wins, and the browser logs nothing. A stray
`nodegx-config.json` in the project is still never served (the test's control). `noodl-preview` tests: the new file
2/2, with `own015-env-not-served`, `preview` and `dep-002-full-stack-deploy` 35/35 on a rebuilt `dist`. Reaches people
with the next `@nodegx/preview`.

