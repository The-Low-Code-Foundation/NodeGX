---
id: P128-BETA-STUDIOHOISTED
title: Studio installed from npm (`npm install @nodegx/studio`) refused to start — lib/nodegx.mjs looked for @nodegx/preview and @nodegx/mcp only inside Studio's own node_modules, and npm puts them beside it
status: fixed
severity: high
area: "nodegx-studio `lib/nodegx.mjs` `npm(p)` (was `join(studioRoot, 'node_modules', p)`): the deploy runtime, the in-page preview bundle, the MCP server and the backend CLI"
found: P128 Beta round, Track A, 2026-10-27, grading the first `@nodegx/studio` tarball outside the checkout (CCN-006 AC7)
evidence: "MEASURED: `npm install nodegx-studio-0.1.0.tgz` into an empty folder (35 packages, `@nodegx/preview` etc. hoisted to the top-level node_modules, none under `@nodegx/studio/node_modules`), then `node_modules/.bin/nodegx-studio <copy of todo-list>`: `serve: no the deploy runtime at …/node_modules/@nodegx/studio/node_modules/@nodegx/preview/dist/external/deploy/noodl.deploy.js (the kit is read from vendor/ and node_modules/)`, and no port; every route 000. The .mcpb and the desktop app never showed it: both run `npm ci` inside Studio's own folder."
regression: "nodegx-studio docs/SCOPE.md `@nodegx/studio on npm` (the out-of-checkout grade: install the tarball, run the bin, the routes answer 200); no automated gate yet"
owner: P128 Beta round, Track A (fixed, nodegx-studio fcdd55e)
launch: beta
---

What a person would have seen: `npx @nodegx/studio` (or the agent's `open_studio` finding the npm package, CCN-006
AC7) starting and stopping at once with a line about "the deploy runtime". Studio never came up.

Fixed in `lib/nodegx.mjs`: a dependency's file is found as Node finds a package, in Studio's own `node_modules` and
then each one above it (read as a path, so no package's `exports` comes into it). In the checkout, the `.mcpb` stage
and the desktop app the answer is the same folder as before. After the fix, on the same tarball setup: `/`, `/app`,
`/api/canon`, `/api/project`, `/preview.js`, `/panel`, `/runtime/noodl.deploy.js` 200; headless Chrome reaches
"ready todo-copy pages=2 visual=13"; `/app` draws Sign in; a backend provisions and stops with the bin.

Not built: a Studio gate that installs the packed tarball and runs it (the grade above was by hand, twice). The next
session that touches `files` or the bin should add one.
