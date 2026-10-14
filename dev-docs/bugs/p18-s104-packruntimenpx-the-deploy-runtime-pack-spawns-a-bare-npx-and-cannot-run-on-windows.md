---
id: P18-S104-PACKRUNTIMENPX
title: The deploy runtime's pack script spawns a bare `npx webpack`, so it cannot run on Windows — P78-D82's mechanism, one package over
status: open
severity: low
area: packages/noodl-preview/scripts/pack-runtime.mjs:42 (the production viewer build for `nodegx deploy`)
found: P18 session 104, 2026-10-14 — the sweep for bare launcher spawns while fixing P78-D82
evidence: "`spawnSync('npx', ['webpack', '--config', 'webpack-configs/webpack.deploy.prod.js'], { cwd: VIEWER, … })` with no `shell` — the line P78-D82 fixed in two build.mjs files, read at HEAD 0b313f736"
---

`pack-runtime.mjs` builds the production viewer that `nodegx deploy` ships, by spawning `npx` by its bare name. On
Windows npm's launcher is `npx.cmd`, and `spawnSync` cannot start a `.cmd` without a shell. `spawnSync` returns an
error rather than throwing, so the script reports `the production viewer build failed (exit null)`, which names no
cause.

**Reproduce (any OS):** `env PATH=/nonexistent node packages/noodl-preview/scripts/pack-runtime.mjs`. This is the
same local reproduction as P78-D82, which printed `spawnSync npx ENOENT` there. It was not run here because the
script rebuilds the viewer with webpack, a heavy job on a shared box.

**Proposed:** P78-D82's mechanism: `spawnSync(process.execPath, [createRequire(import.meta.url).resolve('webpack-cli/bin/cli.js'), '--config', …])`,
resolved from the viewer package, and print `run.error` when there is one.
