---
id: P78-D82
title: @nodegx/export and @nodegx/core do not build on Windows (a bare `npx` spawn)
status: fixed
regression: packages/nodegx-export/tests/p78-d82-build-spawns.test.ts (2 of 5 red on HEAD's export build.mjs; the pattern's control green on both)
phase: P109
task: ISL-043
severity: high
area: export / package build (Windows)
found: P78 TPL-011-DESKTOP, 2026-09-26 (GitHub windows-latest run 36250068983)
evidence: dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md §D82 (uncommitted on cline-dev); TPL-011-DESKTOP-THE-JOURNAL-ON-WINDOWS.md §12
---

On a fresh Windows checkout, `npm run build --workspace @nodegx/export` stops with `Error: spawnSync npx ENOENT`.
The package's `main` is its gitignored `dist/index.cjs` and the MCP server imports it, so nothing that loads the MCP
door can run on Windows (`Cannot find module …\@nodegx\export\dist\index.cjs`). The editor's own Windows release
does not build this package, which is why nobody saw it.

**Where:** `packages/nodegx-export/build.mjs:125` and `packages/nodegx-core/build.mjs:37`, both
`execFileSync('npx', ['tsc', '--project', 'tsconfig.build.json'])`. On Windows npm's launcher is `npx.cmd`, and
`execFileSync` does not start a `.cmd` without a shell. Re-read at HEAD on 2026-10-01: both lines unchanged. The CI
commits that followed (`725c5639c`, `7dd9b8ca4`, `ca18d3c24`) moved TPL-011's authoring to a Linux job; they did
not fix the build.

**Reproduce:** run `npm run build --workspace @nodegx/export` on `windows-latest`.

**Proposed:** run tsc through Node in both files:
`execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.build.json'])`.
Small: two lines and a Windows CI step.

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** Both lines were unchanged at HEAD `0b313f736`.
🔴 **It reproduces off Windows.** Running a build with `PATH=/nonexistent` makes a launcher spawned by bare name
unfindable, which is the same failure: `env PATH=/nonexistent node build.mjs` in `packages/nodegx-core` printed
`Error: spawnSync npx ENOENT` and exited 1. Both files now run
`execFileSync(process.execPath, [createRequire(import.meta.url).resolve('typescript/bin/tsc'), …])`, the proposal's
mechanism in ESM. With `PATH` stripped, both builds exit 0 (core: esbuild then tsc; export:
`declarations: 34 shipped`).

**Not done: the proposal's Windows CI step.** It would add a `windows-latest` job to a workflow, which costs runner
minutes on every push, and that is Richard's call. The spec above pins the source and the PATH-stripped run is the
local reproduction. A third bare spawn of the same kind, in `noodl-preview/scripts/pack-runtime.mjs:42`
(`spawnSync('npx', ['webpack', …])`), is outside this row and filed as P18-S104-PACKRUNTIMENPX.
