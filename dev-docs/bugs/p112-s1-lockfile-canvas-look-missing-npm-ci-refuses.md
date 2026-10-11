---
id: P112-S1-LOCKFILE
title: The root package-lock.json has no entry for the new @nodegx/canvas-look workspace — `npm ci` refuses the tree, so every CI job that installs the monorepo fails before it builds
status: fixed
commit: PENDING
phase: P109
task: ISL-047
severity: high
area: build / root package-lock.json (`packages/nodegx-canvas-look`, added by 77c8ffdf8)
found: P108 (the island works) s9, 2026-10-03 — checking the tip before pushing the Windows installer build
regression: scripts/check-lockfile-workspaces.js (npm run lockfile:check); CI's own `npm ci` in .github/actions/setup
evidence: `npm ci --dry-run --ignore-scripts` over HEAD's package.json files at e839f2424 → exit 1, `npm error Missing: @nodegx/canvas-look@0.1.0 from lock file`; the same check at e36bab588 (before 77c8ffdf8) → exit 0
---

The same shape as P108-S9-LOCKFILE (fixed a9c10ff8c): a workspace added without its lockfile entries. A local
`npm install` tolerates it; `npm ci` (every job using `.github/actions/setup`) exits 1 with EUSAGE. The P112 session
that added it had ended when this was found (its socket was gone), so it is filed here instead of messaged.

**Fix:** add the workspace's link and package entries to the root lock (a `--package-lock-only` install regenerates the
whole file — check what else it moves), then re-run the dry-run check above.

**Plain words:** *"A new package from phase 112 isn't in the lockfile, so GitHub's builds can't install anything."*

**Fixed, P109 s42 (2026-10-11).** Re-measured first in a scratch copy (HEAD's lockfile and manifests only): `npm ci
--dry-run --ignore-scripts` → exit 1, *"Missing: @nodegx/canvas-look@0.1.0 from lock file"*. The fix adds the two
workspace entries by hand to HEAD's lockfile (`node_modules/@nodegx/canvas-look` linked, and
`packages/nodegx-canvas-look` with its two dev dependencies, both already in the tree at 29.7.0 and 5.9.3), so no
Mac regeneration could drop another platform's prebuilts. The same scratch run → exit 0, 2,989 packages.
`npm run lockfile:check` says the same thing locally without installing: exit 1 on HEAD's lock, 0 on the fixed one.
It checks presence only, because `npm ci` accepted the editor's lock version lagging its manifest (0.2.4 vs 0.3.0).

⚠️ **The working copy's `package-lock.json` is a stale file, not a live edit.** Its mtime is 2026-09-24, older than
the lockfile commits since (a9c10ff8c added `@nodegx/node-spec`), so it shows as "modified" by removing those entries.
Committing it would undo them. This fix was committed as a blob through a temporary index and left that file alone.
