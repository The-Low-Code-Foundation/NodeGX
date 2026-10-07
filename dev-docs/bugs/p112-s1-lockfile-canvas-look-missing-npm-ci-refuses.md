---
id: P112-S1-LOCKFILE
title: The root package-lock.json has no entry for the new @nodegx/canvas-look workspace — `npm ci` refuses the tree, so every CI job that installs the monorepo fails before it builds
status: scheduled
phase: P109
task: ISL-047
severity: high
area: build / root package-lock.json (`packages/nodegx-canvas-look`, added by 77c8ffdf8)
found: P108 (the island works) s9, 2026-10-03 — checking the tip before pushing the Windows installer build
evidence: `npm ci --dry-run --ignore-scripts` over HEAD's package.json files at e839f2424 → exit 1, `npm error Missing: @nodegx/canvas-look@0.1.0 from lock file`; the same check at e36bab588 (before 77c8ffdf8) → exit 0
---

The same shape as P108-S9-LOCKFILE (fixed a9c10ff8c): a workspace added without its lockfile entries. A local
`npm install` tolerates it; `npm ci` (every job using `.github/actions/setup`) exits 1 with EUSAGE. The P112 session
that added it had ended when this was found (its socket was gone), so it is filed here instead of messaged.

**Fix:** add the workspace's link and package entries to the root lock (a `--package-lock-only` install regenerates the
whole file — check what else it moves), then re-run the dry-run check above.

**Plain words:** *"A new package from phase 112 isn't in the lockfile, so GitHub's builds can't install anything."*
