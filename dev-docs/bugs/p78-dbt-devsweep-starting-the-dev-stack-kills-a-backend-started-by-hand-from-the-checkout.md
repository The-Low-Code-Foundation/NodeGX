---
id: P78-DBT-DEVSWEEP
title: Starting the editor's dev stack kills a backend someone started by hand from the checkout
status: fixed
commit: PENDING
phase: P109
task: ISL-047
severity: medium
area: devtools / dev stack sweep (dev-processes.js)
found: P78 Digital Bricks Training template, 2026-09-23
regression: packages/noodl-editor/tests-unit/dev-tools/a-sweep-spares-a-hand-started-backend.test.ts
evidence: templates/digital-bricks-training/docs/START-HERE.md "If the backend stops on its own, a dev stack started."
---

A person following the template's instructions starts a backend with
`node <OpenNoodl>/packages/nodegx-backend/bin/nodegx-backend.js serve …`. When anyone then runs `npm run dev` in
that checkout, the backend exits (SIGTERM) without a message to its owner. The template's workaround is to launch the
backend through a symlink outside the checkout.

**Where:** `scripts/devtools/dev-processes.js:68`. `DEV_TOOL` includes `nodegx-backend`, and rule 1 (`:26`) seeds any
process whose command line holds the checkout path, so a standalone backend reads as a dev-stack leftover and is
swept. Read at HEAD on 2026-10-01: last changed `cbfc5fb37` (2026-08-29).

**Reproduce:** start the backend as above, run `npm run dev`, and the backend's process is gone.

**Proposed:** sweep only processes the dev stack itself started (its recorded process group, or an env marker it sets
on its children), not anything whose path matches. Or at least list what was killed and why. Small.

**Fixed, P109 s42 (2026-10-11).** Re-measured on the live process table: a sleeper whose command line reads
`node <checkout>/packages/nodegx-backend/bin/nodegx-backend.js serve …`, standing alone, is in `findDevProcesses()`'s
list. The editor (`ServiceSupervisor`) and the MCP door (`provision.ts`) spawn `nodegx-backend/dist/cli.js`; only a
person types the `bin/` entry (or `node_modules/.bin/nodegx-backend`). `isSeedCommand` now leaves that one out of
rule 1. Started from inside the dev stack it is still swept, as a descendant. The spec's control, an orphaned
`dist/cli.js` backend, is still swept. Red on the hand-started arm with HEAD's sweep, green now.

Found beside it and fixed in the same change: `P109-S42-SHELLSEED`, the shell a suite runs in was a sweep target.
