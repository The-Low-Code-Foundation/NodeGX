---
id: P112-OWN008-ESMADAPTER
title: "The editor suite's command can't load an ES-module adapter on Node before 20.19, though it promises \"CommonJS or ESM\" and the brief's example adapter is `my-adapter.mjs`"
status: fixed
phase: P112
task: OWN-008
severity: medium
area: "`@nodegx/project-contract` `editor-suite-node.ts` `loadAdapter` (built with `\"module\": \"CommonJS\"`, so `await import(abs)` compiled to `require(abs)`)"
found: P112 OWN-008, 2026-10-18 (the map stranger's second round, which ran on Node 20.11.1)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-008/map/REPORT.md (second round); packages/nodegx-project-contract/tests/own008-esm-adapter.test.ts
kit: project-contract
---

`require()` loads an ES module only from Node 20.19 / 22.12. On the published 0.1.0, run against the map stranger's
own `suite/adapter.mjs` on the todo template:

| Node | result |
|---|---|
| 20.11.1 | `require() of ES Module …/suite/adapter.mjs not supported.` |
| 20.19.6 | `PASS — NodeGX map editor on todo-list (156 ms)` |
| 22.22.0 | `PASS — NodeGX map editor on todo-list (132 ms)` |

The first three OWN-008 rounds ran on 22.22 and never saw it. The map stranger's second round got Node 20.11.1 from
`/usr/local/bin` after VS Code restarted. It wrote its own runner around the kit's suite to get a grade.

**Fixed in the repo (2026-10-18):** `loadAdapter` requires a CommonJS adapter as before. When `require()` refuses an
ES module (`ERR_REQUIRE_ESM`), it imports it for real, through a function the compiler can't rewrite. Graded in
`tests/own008-esm-adapter.test.ts`: the command's source runs under ts-node (CommonJS, as the publish build) with
`--no-experimental-require-module`. Before the fix the `.mjs` arm read the message above, and after it PASS. The
CommonJS arm passes both ways. Then measured on the real artefact: `build-publish.mjs`'s output, under
`/usr/local/bin/node` 20.11.1, gives `PASS — NodeGX map editor on todo-list (413 ms); files only: the adapter offers
no graph runner`. It ships on the next `@nodegx/project-contract` publish.
