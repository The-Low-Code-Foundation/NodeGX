---
id: P128-S3-NPMSTUDIOSTALE
title: "On the npm route Studio is `@nodegx/studio` 0.1.0 (2026-10-27) on its own nested `@nodegx/mcp` 0.2.8: the Studio a `npm create nodegx` folder opens is older than the `.mcpb`'s, and its backend and publish run the 0.2.8 server's pieces beside the 0.2.10 server that started it"
status: open
severity: medium
area: "`packages/create-nodegx/bin/create-nodegx.js` `STUDIO_VERSION` ('0.1.0', the only published Studio); nodegx-studio `package.json` `dependencies` (npm 0.1.0 pins `@nodegx/mcp` 0.2.8, `@nodegx/backend-map` 0.1.4, `@nodegx/preview` 0.2.8) and `lib/nodegx.mjs` `npm()` (a dependency is looked for in Studio's own node_modules first)"
found: Beta sprint S1, 2026-11-07, grading P128-S3-NOSTUDIOFORTHEEDITOR's flip
evidence: "MEASURED (3 cold runs, empty HOME and npm cache, `npx -y -p @nodegx/studio@0.1.0 -p <@nodegx/mcp 0.2.10 pack> noodl-mcp`): the npx folder holds `@nodegx/mcp` 0.2.10 at the top and 0.2.8 again under `@nodegx/studio/node_modules/@nodegx/mcp` (175 MB in all); `open_studio` serves Studio 0.1.0's page, 559,334 chars, where the `.mcpb` packed the same evening from nodegx-studio main (0dbd922) serves 850,328. READ, not driven: in that folder Studio 0.1.0's `lib/nodegx.mjs` resolves `backendCli` and `mcpServer` to the NESTED 0.2.8 (`npm()` walks up from Studio's own folder and finds its own node_modules first); `lib/backend.mjs:61` starts the backend from it (`NODEGX_BACKEND_ENTRY`), `lib/publish.mjs:265` spawns that server to publish. Not measured: a backend Studio started there, or a publish from it."
launch: beta
owner: none
task: CCN-006 AC7
---

The flip (Beta S1) makes the npm route serve Studio: from a fresh `npm create nodegx` folder with no desktop app,
`open_studio` starts `<_npx>/node_modules/@nodegx/studio/editor/serve.mjs` and GET / is 200. What it serves is the
Studio published on 2026-10-27, and that Studio carries its own server.

- **Older Studio than the `.mcpb`.** The `.mcpb` stages nodegx-studio main with the server overlaid
  (`--mcp-tarball`); the npm route gets whatever `@nodegx/studio` is pinned in `STUDIO_VERSION`, and only 0.1.0 is
  published. Everything nodegx-studio has built since 0.1.0 (P132's workflow editor among it) is missing on the npm
  route and present in Claude Desktop.
- **Two servers in one folder.** Studio 0.1.0 pins `@nodegx/mcp` 0.2.8 exactly, so npm nests a second copy under it
  (the download is ~130 MB more than it needs to be), and Studio's own backend start and publish read that copy. A
  project provisioned by the 0.2.10 server's tools can then be served by a 0.2.8 backend when Studio starts one.

**Proposed.** Publish `@nodegx/studio` 0.1.1 from nodegx-studio main with `@nodegx/mcp` pinned to the release's
server (0.2.10; `@nodegx/backend-kit` 0.1.0 and `@nodegx/backend-map` 0.1.7 are on npm already), then set
`STUDIO_VERSION` to 0.1.1. One `@nodegx/mcp` in the folder, the same Studio as the `.mcpb`. Grade: the S1 drive
(`npx -y -p @nodegx/studio@0.1.1 -p @nodegx/mcp@0.2.10 noodl-mcp`, empty HOME) shows no
`@nodegx/studio/node_modules/@nodegx/mcp`, and GET / is Studio main's page.

**2026-11-11, built and graded on the pack (Beta sprint, after R1):** `@nodegx/studio` **0.2.0**, not 0.1.1 (twenty
commits of P132 since 0.1.0, the Intel Mac build), from nodegx-studio main `31e74fb` + `60414ee` + `9ac73d0`: pins
`@nodegx/mcp` 0.2.10 and `@nodegx/preview` 0.2.9; `vendor/` re-cut from NodeGX `d86840be9`, every file
byte-identical. Every Studio gate green (timeline's one red was a stale assertion, fixed in `9ac73d0`).
create-nodegx `STUDIO_VERSION` → `'0.2.0'`, the three kits 0.2.13. The grade, `npx -y -p <studio 0.2.0 pack> -p
@nodegx/mcp@0.2.10 noodl-mcp <todo-list copy>`, empty HOME and npm cache, `NODEGX_STUDIO_APP=none`: **7/7** — one
`@nodegx/mcp` in the npx folder (0.2.10, none under Studio), one `@nodegx/preview` (0.2.9), 139 MB (175 before);
`open_studio` (through `call_tool`) started `<_npx>/node_modules/@nodegx/studio/editor/serve.mjs`, GET / 200,
`<title>NodeGX Studio</title>`. Pack sha1 `c4d6597e…`. **Fixed when** Richard publishes Studio 0.2.0 and the kits
0.2.13 and the same grade passes on the registry spec.
