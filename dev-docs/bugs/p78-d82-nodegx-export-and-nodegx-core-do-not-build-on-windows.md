---
id: P78-D82
title: @nodegx/export and @nodegx/core do not build on Windows (a bare `npx` spawn)
status: open
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
