---
id: P109-S5-STALEDEPLOYCLI
title: In a checkout, `nodegx deploy` validates against the catalog baked into a gitignored bundle, and refuses a valid project when that bundle is stale
status: scheduled
phase: P109
task: ISL-034
severity: medium
area: `nodegx deploy` (`nodegx-export/dist/cli.mjs`) spawns `noodl-preview/dist/nodegx-deploy.cjs`, which carries its own copy of the validator and node catalog
found: P109 s5, 2026-10-02 — ISL-009's deployed drive
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ (ISL-009 §8 s5, ISL-005 §8 s5, ISL-005-CENSUS-2026-10-02.md)
---

`nodegx deploy` refused ISL-009's drive project with *"Group has no input named "scrollIntoView""* (exit 2), three
times, while `npm run validate:project` passed it with 0 errors and `catalog:check` was green. The bundle that did the
validating, `noodl-preview/dist/nodegx-deploy.cjs`, was dated **Sep 17** — gitignored, so nothing rebuilds it with the
catalog. `node build.mjs` in `noodl-preview` (under a second) fixed it.

**Plain words:** *"In a developer checkout, the deploy command can be weeks behind the node library, and it then rejects a
project the editor and every other check accept — blaming the project."*

**Proposed:** the CLI compares the bundle's catalog hash with `noodl-types/src/node-catalog.json` when run from a checkout,
and rebuilds or says "the deploy helper is older than the node library — run …" (the ISL-014 pattern).

**Seen again, quieter (P109 s34, 2026-10-09, ISL-013's deployed drive).** This time the stale bundle did not refuse —
it deployed. `noodl-preview/dist/nodegx-deploy.cjs` (built Oct 5) carried the injector from before ISL-013 slice 1
(`9fd1b12a7`, Oct 7), so the site loaded kits alphabetically whatever `requires` said, and
`noodl-editor/src/external/deploy/index.js` (the copied `static/deploy` bootstrap, dated Aug 16) had no
`Noodl.getModule`. A kit reading another through the documented route threw `Noodl.getModule is not a function` on
the deployed page while every loader spec was green. Fixed for the drive by `npx webpack --config
webpack-configs/webpack.deploy.dev.js --no-watch` (noodl-viewer-react) and `node build.mjs` (noodl-preview). The
proposal above covers the catalog; the same check needs the injector and the deploy bootstrap, which a source change
to `@nodegx/module-inject` or `static/deploy` leaves behind silently.
