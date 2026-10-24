---
id: P123-STU071-NONPX
title: Publish to a server is refused from the desktop app opened from the Finder, "The deploy engine (npx) gave no report"
status: fixed
commit: nodegx-studio ce96af6
severity: high
area: nodegx-studio `lib/publish.mjs` (the MCP server Studio starts) × @nodegx/mcp `deploy_to_vm`'s engine lookup (`packages/noodl-mcp/src/tools/deployToVm.ts`: NODEGX_DEPLOY_CLI, a checkout, else npx)
found: board lane 5, driving Studio's publishToServer against the P26 throwaway VM (opennoodl-d7), 2026-10-24
evidence: same drive, fresh HOME: PATH with node → shipped in 8.8 s (engine npx); PATH /usr/bin:/bin:/usr/sbin:/sbin (a Finder-launched app's) → refused in 0.4 s; after the fix → shipped in 6.4 s (engine env), health 200, app 200
---

`deploy_to_vm` outside a checkout builds the folder with `npx @nodegx/preview`. A Mac app opened from the Finder
has no npx on its PATH, so Studio's Publish → "A server of your own" failed at once with a sentence a person cannot
act on. Studio carries the same engine in its own `@nodegx/preview`, so it now hands it to the server it starts
(`mcpServerEnv`: NODEGX_DEPLOY_CLI, unless the person set one). `check:server` has a row for it (17/17).

The `.mcpb` (P125 CCN-006) sets NODEGX_DEPLOY_CLI to its bundled engine for the same reason. Any other host that
runs `@nodegx/mcp` without npx on PATH (Claude Desktop's own Node with a pasted entry) would still meet the npx
fallback: the tool's sentence could say so ("no npx on this PATH: set NODEGX_DEPLOY_CLI or install Node").
