---
id: P108-S9-LOCKFILE
title: The root package-lock.json had no entry for @nodegx/node-spec's @types/node ^20 — `npm ci` refused the tree, so no CI job that installs the monorepo could start
status: fixed
commit: a9c10ff8c
severity: high
area: build / root package-lock.json (`packages/nodegx-node-spec/package.json` devDependencies `@types/node: ^20.0.0`)
found: P108 (the island works) s9, 2026-10-03 — building the Windows installer for the tablets
evidence: GitHub run 37104459782 (garden-desktop.yml, windows job, step "Run ./.github/actions/setup"): `npm error Missing: @types/node@20.19.43 from lock file` / `Missing: undici-types@6.21.0`
---

`packages/nodegx-node-spec` (P107) asks for `@types/node ^20`, but the root lockfile had only the hoisted 18.x and the
nested 20.19.43 copies under `nodegx-backend` and `nodegx-backend-contract` — none under `nodegx-node-spec`. A local
`npm install` tolerates that; `npm ci` (every CI job using `.github/actions/setup`) exits 1 with EUSAGE before
anything builds. The Windows installer run died two minutes in.

**Fixed** by adding the two nested entries (`packages/nodegx-node-spec/node_modules/@types/node` 20.19.43 and its
`undici-types` 6.21.0), copied from nodegx-backend's identical ones, the rest of the file byte-for-byte unchanged.
Checked with `npm ci --dry-run --ignore-scripts` over HEAD's `package.json` files: the old lock exits 1 with CI's exact
error, the fixed one exits 0.

**Plain words:** *"A package added in phase 107 needed a library version the lockfile didn't list, so GitHub refused to
install anything. Two lines added to the lockfile."*
