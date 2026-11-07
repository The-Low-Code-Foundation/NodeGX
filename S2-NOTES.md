# Beta sprint S2: the HTML export in the kit (notes for the merge)

## What changed

- `@nodegx/export` 0.2.5 → **0.2.6** (`package.json`, and `EXPORTER_VERSION` in `src/parse/parseProject.ts`, which
  `tests/hls002-cli.test.ts` holds equal to it). No other package needs a new version: the tarball depends on
  nothing (everything is bundled, React 19's two global builds ride in `dist/react19/`).
- `packages/nodegx-export/build.mjs`: the worktree's linked `node_modules` path renamed back in `dist/` and the
  `noodl-mcp/check-pack-paths.mjs` check run as the build's last step (BETA-S2-EXPORTLOCALPATH; 0.2.5 shipped
  `../../../../OpenNoodl/node_modules/…` 57+ times).
- `packages/nodegx-export/README.md` (the npm page): a "Plain files, nothing to install" section; `description`
  rewritten without task ids.
- `packages/create-nodegx/bin/create-nodegx.js`: the agent notes (CLAUDE.md / AGENTS.md) name `--target html` beside
  React, with `npx serve` (R4). Its own paragraph, the last one; create-nodegx's version is not bumped.

## Measured (2026-11-07)

- npm before: `@nodegx/export` versions `0.0.0-stage`, `0.2.5` (2026-10-22T06:20); 0.2.5's `cli.mjs` has no
  `target html` and no `dist/react19/`.
- Tarball: `nodegx-export-0.2.6.tgz`, 52 files, 7.4 MB packed, 31.6 MB unpacked.
- Installed in a fresh scratch folder; `nodegx --version` 0.2.6; todo-list exported (213 files, exit 0) with
  `sandbox-exec` denying every read under both the checkout and the worktrees folder; byte-identical to the export
  from the worktree's `src`, and to the one through `npx --package=<tgz> nodegx`. No `/Users/…` or `OpenNoodl` in
  the export or the installed package (the check-pack-paths script: no machine path).
- HTX-004's drive, the HTML arm only, on a fresh seeded backend, the folder served by a static server that cannot read
  the checkout: all 12 steps `html==react yes; all three: seen same, writes same`, no console line in any arm,
  against HTX-004's committed runtime (session 7) and React (session 10) readings. Run twice: `python3 -m http.server`
  and `serve` 14.2.5 (`npx serve`). Readings: `dev-docs/tasks/phase-134-the-app-in-plain-files/htx-004/tarball-0.2.6/`.
- `--component "Todo/Theme switch"` from the tarball: 9 files and `nodegx-export.json` beside a page of one's own,
  that page untouched; again: 0 written, 9 unchanged.
- Tests: `hls001-package-boundary`, `hls002-cli`, `hls002-pack-and-run` 33/33. create-nodegx 41/42 in the worktree;
  the red one is BETA-S2-CLINEWRAPPERWORKTREE (the worktree resolves `create-nodegx` to the primary's), green in a
  copy that resolves to itself.

## Publish (Richard)

1. Re-pack (or take the tested tarball) at this branch's commit: `cd packages/nodegx-export && npm pack` (prepack is
   not wired; `node build.mjs` first if `dist/` is not this commit's build).
2. `scripts/own/publish-npm.sh <folder>` with only `nodegx-export-0.2.6.tgz` in it. Nothing else has to go first.
3. create-nodegx's new line can ship with the next kit cut; until 0.2.6 is live the line names a flag the registry's
   package refuses (0.2.5, measured: `Unknown option: --target.`, the usage, exit 1).

`publish-npm.sh`'s comment says the export "is cut at the kit's version from the 0.2.5 cut on"; the kit is 0.2.11,
and this cut is 0.2.6 as the row asks. Either the comment or the version needs Richard's word.

## Proposed changelog lines

- **@nodegx/export 0.2.6.** `npx @nodegx/export export --target html <app> <folder>` writes your app as plain HTML,
  CSS and JavaScript: nothing to install, nothing to build, any static server runs it (`npx serve <folder>`).
  `--component <name>` writes one part of your app into a page of your own.
- **The kit tells your AI coder about it.** A folder set up with `npm create nodegx` now names the plain-files way out
  beside the React one.
- **Fixed:** the export package no longer carries folder names from the machine it was built on.
