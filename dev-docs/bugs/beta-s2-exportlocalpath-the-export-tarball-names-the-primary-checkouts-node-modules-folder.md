---
id: BETA-S2-EXPORTLOCALPATH
title: "The @nodegx/export tarball names the build machine's checkout: `../../../../OpenNoodl/node_modules/…` in its bundles, source maps and cli.inputs.json (0.2.5 published with it; NPMAUDIT-LOCALPATH's hole, fixed for mcp and preview only)"
status: fixed
commit: (this commit)
fixed: 2026-11-07, Beta sprint S2 — `packages/nodegx-export/build.mjs` renames the linked node_modules path back and runs `noodl-mcp/check-pack-paths.mjs` as its last step
severity: medium
area: export / packaging (`packages/nodegx-export/build.mjs`)
found: Beta sprint S2, 2026-11-07, packing @nodegx/export 0.2.6 in a worktree for the HTML off-ramp
evidence: "`node packages/noodl-mcp/check-pack-paths.mjs` on the published 0.2.5 (npm pack @nodegx/export@0.2.5) and on the first 0.2.6 build: both exit 1, 57 hits (cli.inputs.json 51, cli.mjs, index.mjs, index.cjs, and their maps one each before the 50-hit cap); after the fix: \"51 shipped files, no machine path\", the installed tarball's todo-list export byte-identical to the one graded before the fix"
regression: packages/nodegx-export/build.mjs "its last step runs packages/noodl-mcp/check-pack-paths.mjs, and the build exits non-zero on any machine path in what files ships"
---

A release is packed in a worktree, whose `node_modules` entries link to the primary checkout's, and esbuild names a
module by its real path. So `@nodegx/export` printed `../../../../OpenNoodl/node_modules/ajv/…` (ajv, fast-uri,
fast-deep-equal, json-schema-traverse) in its module comments, in `dist/cli.inputs.json` (51 entries) and, as
`../../../../../OpenNoodl/…`, in all three source maps. The published 0.2.5 has the same paths. Nothing reads them
from an install (the stale-bundle check finds no such file and stays quiet), but the folder layout of the machine that
built it ships to everyone, which is what NPMAUDIT-LOCALPATH closed for `@nodegx/mcp` and `@nodegx/preview` on
2026-10-23. This package was not in that fix.

The fix copies that one's rule: after the bundles are written, every `.mjs`, `.cjs`, `.map` and `.json` under `dist/`
has the real path renamed to the link (relative to the package for the bundles and the input list, to `dist/` for the
maps), and the build ends by running the same check the other two packages run before they pack. In the primary
checkout the two paths are the same and nothing is renamed.
