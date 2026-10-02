---
id: P109-S5-STALEDEPLOYCLI
title: In a checkout, `nodegx deploy` validates against the catalog baked into a gitignored bundle, and refuses a valid project when that bundle is stale
status: open
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
