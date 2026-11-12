---
id: P128-S3-HELPERNODE
title: "In Claude Desktop the `.mcpb` server runs on Desktop's built-in Node, an Electron utility process whose `process.execPath` is \"Claude Helper (Plugin)\", which refuses to run a script, so every child the server starts with `spawn(process.execPath, …)` dies: Studio, the render harness, the local backend and the VM deploy"
status: fixed
severity: high
area: "`packages/noodl-mcp/src/studio/studioProcess.ts:76` (Studio), `src/render.ts` (~299-390, the harness; already sets ELECTRON_RUN_AS_NODE=1, which Claude's binary ignores), `src/backend/provision.ts:504` (the backend), `src/tools/deployToVm.ts:79-85` (deploy)"
found: P128 S3 follow-up, 2026-10-27, CCN-006 AC8 run step 3 (Richard, Claude Desktop, `nodegx-0.2.7.mcpb`, "Make me a NodeGX app: a tap counter with a reset button")
evidence: "Claude's report: \"Studio wouldn't start and the headless render failed to launch\"; the project was written and validated. `~/Library/Logs/Claude/mcp-server-nodegx.log` 15:44:29: \"Using built-in Node.js for MCP server: NodeGX\"; call id=8 (after the panel's resources/read) took 20.0 s, studioProcess.ts's port timeout. Claude Desktop's children are `Claude Helper (Plugin) --type=utility --utility-sub-type=node.mojom.NodeService`. MEASURED: `\"/Applications/Claude.app/Contents/Frameworks/Claude Helper (Plugin).app/Contents/MacOS/Claude Helper (Plugin)\" -e …` prints \"This is a helper executable and cannot be launched directly; it requires a --type argument from the browser process\", exit 64, with and without ELECTRON_RUN_AS_NODE=1 (Claude ships the RunAsNode fuse off). REPRODUCED the shape with the repo's Electron (its Node v24.18.0): a `utilityProcess.fork` server's `new Worker(child.mjs, { argv, stdout: true })` runs the child, which listens on a port and prints to the parent (scratchpad `utilrepro/`). The CCN-006 s13 headless drive passed because it ran on a real `node`."
launch: beta
owner: P128 S3 follow-up (2026-10-27)
task: CCN-006 AC8
commit: 560ee23d9 (noodl-mcp), nodegx-studio 2b445fa (the .mcpb)
---

The `.mcpb` is the one install that works for a stranger (P128-S3-NOSTUDIOFORTHEEDITOR), and Claude Desktop runs it
the way its manifest asks: `server.type: "node"`, on Desktop's own Node, so the person never installs Node. That Node
is an Electron utility process. Its `process.execPath` is Claude's helper binary, not a Node, and Claude's build
refuses to run it as one. Every `spawn(process.execPath, [script])` the server makes fails at once, so in Desktop the
agent can write and validate an app but cannot show it (Studio), see it (`render_report`), give it data (the
backend) or ship it (deploy). The agent says so honestly; the person sees no app.

CCN-006 s13 predicted it ("If Desktop's built-in Node is its Electron binary run as Node … that is the first
suspect"); the headless drive could not see it because the drive's Node was real.

**Proposed.** One helper in noodl-mcp, `runNodeScript(entry, args, { cwd, env })`: when `process.execPath` can run a
script (plain Node, or an Electron with RunAsNode) it spawns as today; otherwise it runs the script in a
`worker_threads` Worker (`argv`, `stdout: true`, `stderr: true`, `env`) and returns a child-like handle (stdout,
stderr, kill → `terminate`, exit). Studio's `serve.mjs`, the render harness, the backend CLI and the deploy CLI then
need to be Worker-safe: no reliance on `process.cwd()` (a Worker cannot `chdir`; pass the folder in), no
`process.exit` that should end only themselves (in a Worker it ends the Worker, which is what we want), no stdin.
The render harness also launches a browser: that part is a real executable and is unaffected, but is measured
separately. Gate: CCN-006's drive re-run inside a `utilityProcess.fork` of the repo's Electron with the helper's
RunAsNode refused (spawn a binary that exits 64), then Richard's step 3 again.

**Not the fix.** Telling the person to turn off "Use built-in Node.js" in Desktop's settings: it makes Desktop use
the Node on their PATH, which a stranger does not have (and P125 s5 found Node 16 there).

**Fixed (2026-10-27), not the Proposed route.** A Worker would have changed seven call sites and every script they
start (the backend is meant to outlive the server and is tracked by its pid; the render harness kills its own process
group). Instead the `.mcpb` carries Node.js's official signed binary (v22.22.0, team HX7739G8FX, hardened runtime,
checksum-checked at build) and `NODEGX_NODE` names it; `scriptRuntime()` (`src/scriptRuntime.ts`) starts every child on
it, and the children behave exactly as on a developer's machine. Outside the bundle `process.execPath` stays, probed
once when it is an Electron binary, with a plain message when it cannot run a script.

**Measured.** Spec `p128ScriptRuntime` 8/8 (a fake helper refusing as Claude's does). The unpacked bundles under a
preload that sets `execPath` to that helper: 0.2.7 fails `open_studio`, `render_report` and `provision_backend` on
exit 64; the test build serves Studio (200), renders (DONE), provisions a backend (4 s). In Claude Desktop (Richard,
`nodegx-0.2.8-darwin-arm64.mcpb`): Studio up in the conversation, `ps` shows Studio and the render harness on
`…/Claude Extensions/local.mcpb.the-low-code-foundation.nodegx/node/bin/node`. noodl-mcp 5053 pass / 11 fail, all in
files red before.

**Left (not this row):** `@nodegx/mcp` 0.2.8 on npm so the published `.mcpb` is built from it (Richard's yes); the
darwin-x64 and win32 bundles (`--node`; Windows needs `node.exe` and is not built); signing the `.mcpb`; the bundle is
62.1 MB, up from 25.1.

**Measured (P127 s9, 2026-10-27), on "Left":** the published `@nodegx/mcp` 0.2.8 does NOT carry this fix. It was cut
at `dfdc9e25e`, before `560ee23d9`. In its tarball (shasum `e85c6f95…`, the registry's) `dist/noodl-mcp.cjs` counts
`NODEGX_NODE` 0, `scriptRuntime` 0 and `NODEGX_SERVER_NAME` 0, with `startedByApp` 5 beside them (a fix known to be in
0.2.8). A `.mcpb` built by `npm run mcpb` from Studio's pin (now 0.2.8) still fails as this row describes. It needs
`--mcp-tarball` from a pack at `560ee23d9` or later, or a 0.2.9.
