---
id: P78-DBT-DEVSWEEP
title: Starting the editor's dev stack kills a backend someone started by hand from the checkout
status: open
severity: medium
area: devtools / dev stack sweep (dev-processes.js)
found: P78 Digital Bricks Training template, 2026-09-23
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
