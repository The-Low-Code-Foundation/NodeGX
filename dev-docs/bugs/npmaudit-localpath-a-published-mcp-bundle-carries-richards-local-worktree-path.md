---
id: NPMAUDIT-LOCALPATH
title: A published mcp bundle carries richards local worktree path
status: fixed
commit: (this commit)
severity: high
area: mcp / packaging
found: NPMAUDIT stranger audit of the published packages, 2026-10-23
evidence: dev-docs/reviews/npm-stranger-audit-2026-10-23.md
kit: mcp
regression: packages/noodl-mcp/check-pack-paths.mjs (npm prepack: exit 1 on any machine path in what `files` ships; 53 hits on the 0.2.5-era dist built at 5eab4d7be, 0 on a worktree build with the fix)
---

`@nodegx/mcp@0.2.5` `dist/kit-extract.cjs` contains the absolute path `/Users/richardosborne/vscode_projects/OpenNoodl-worktrees/own020-pack024/packages/noodl-viewer-react/src/types.ts`, and `dist/kit-extract.inputs.json` lists `../../../../OpenNoodl/node_modules/...` build paths. A machine path and username ship to everyone who installs. Fix: strip absolute paths at bundle time (esbuild `sourceRoot`/relative inputs) and add a pack check that greps the tarball for `/Users/`.

**Fixed 2026-10-23 (opennoodl-d7).** Wider than the audit found: a release is built in a worktree, whose
`node_modules` entries link to the primary checkout's, and esbuild names a module by its real path, so
`dist/noodl-mcp.cjs` (51 lines) and `dist/cloud-bundle.cjs` (1) printed `../../../../OpenNoodl/node_modules/…` in
module comments and `__commonJS` keys too, beside `kit-extract.cjs`'s `/Users/…` and the input list's paths.

- `scripts/node-catalog/lib/bundle.js`: the `type-stub` plugin's namespaced path is repo-relative.
- `packages/noodl-mcp/build-common.mjs`: `nodeModulesThroughLink`, an esbuild plugin in `common` (the server and
  the cloud bundle), renames the real `node_modules` back to the link after the build; `throughNodeModulesLink` does
  the same for one path. `build-kit-extract.mjs` uses both (the reader and its input list).
- `packages/noodl-mcp/check-pack-paths.mjs`, last step of `prepack`: a macOS / Linux / Windows home folder, a
  worktree folder or a relative path out of the repo in any shipped file refuses the pack.
- `@nodegx/preview` had the same hole, unseen only because its dist was last built in the primary checkout: its
  `build.mjs` takes the plugin (the two CLI bundles and their input lists) and its `prepack` ends with the same check.
  Control: its deploy engine built from the worktree with HEAD's `build.mjs` reads 52 hits, exit 1; with the fix 0.

Measured: the three bundles built from a worktree at a9e2f8019 into a scratch folder: check 0 hits; all 488 input
list entries resolve from the worktree (the staleness rule intact); `isl014ReaderBuild` + `own015CloudBundleCwd`
9/9 in the worktree. The primary `dist/` was not rebuilt (Claude Desktop runs from it; peers' open edits). Still owed:
0.2.5 deprecated on npm once a fixed release is out (Richard's 2FA).
