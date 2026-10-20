---
id: P112-OWN023-COLDSERVER
title: "On a person's first run, Claude Code gives up on the NodeGX server: `npx -y @nodegx/mcp@0.2.2` takes ~28 s to answer `initialize` from an empty npm cache, Claude Code's MCP start limit is 30 s, and with the agent's own start-up beside it the server came up 'failed' — the agent then built with no NodeGX tools"
status: fixed
commit: b09ed2b7f
phase: P112
task: OWN-023
severity: high
area: kit — the `.mcp.json` that `create-nodegx` writes (`npx -y @nodegx/mcp@<v> --allow-writes`, a 42.6 MB unpacked package fetched on first start); Claude Code's MCP connect timeout (30 s default, `MCP_TIMEOUT`)
found: P112 OWN-023 s1, 2026-10-19 (the lab's smoke of arm B before the real round, Claude Code 2.1.301, `claude -p`)
evidence: smoke4 — `npm create nodegx@0.2.2 music` in a round with an empty HOME, then `claude -p` with that folder's server; init event `"mcp_servers":[{"name":"nodegx","status":"failed"}]`, the agent: "The nodegx MCP server failed to connect (timed out after 30 seconds)". Measured beside it on the same machine and connection: cold `npx -y @nodegx/mcp@0.2.2` answered `initialize` after 27.8 s; warm, 7.8 s; the npm cache after it 102 MB. `npm view @nodegx/mcp@0.2.2 dist.unpackedSize` = 42,575,429. dev-docs/tasks/phase-112-your-own-nodegx/OWN-023-ONE-BRIEF-THREE-STRANGERS.md §9.1
regression: packages/noodl-mcp/tests/own023ColdServer.test.ts
kit: mcp
---

A person who has just run `npm create nodegx` and opens Claude Code in the folder has never fetched `@nodegx/mcp`.
`npx -y` downloads and installs it on the first start, which on this machine took 27.8 s before the server answered,
and Claude Code stops waiting at 30 s. Measured once in a `claude -p` round, the server came up `failed` and the
agent said so and went on without it. On a slower connection it would fail every first time; on this one it is a
coin toss decided by what else is starting.

Interactive Claude Code was not measured: whether a person sees the failure, and whether `/mcp` → reconnect (with the
cache now partly or fully warm) recovers it, is unknown. The second start is 7.8 s.

What a person meets: an agent in a NodeGX folder that has none of NodeGX's tools on its first conversation, and says
so in its own words (it did, in the smoke). OWN-023 arm B pays this as a row (C3): the lab warms the round's npm cache
before B's first sitting only if Richard rules that (§9.1), and the row records either way.

Not fixed here (OWN-023 C3/C10: a kit defect met during the study is filed, not fixed mid-study). Candidates for
whoever takes it: a smaller server package (what is in 42.6 MB?), `create-nodegx` installing the server once at
create time, or a printed line telling Claude Code users to `/mcp` reconnect if the server shows failed.

**What the 28 s was (measured 2026-10-20, 0.2.2's own tarball, empty npm cache, `npm install` timed apart from the
server's boot):** not the package's bytes (the 11.9 MB tarball downloads in 0.6–0.8 s) and not the server (it answers
`initialize` about 1 s after it is installed). It was `dependencies`: `@modelcontextprotocol/sdk` and `zod`, both
already inlined into `dist/noodl-mcp.cjs` by esbuild, so npx installed 91 packages the server never loads (express,
hono, jose, ajv, …; 92 top-level entries in the npx folder, 1 without). Two clean pairs: install 12.6 / 11.6 s as
published, 3.8 / 5.5 s with the two moved to `devDependencies`. A third pair under a peer's load (load average 39 on
8 cores) read 65 vs 27 s; the box's load is the other half of why the first measurement was a coin toss.

**Fixed (`b09ed2b7f`, 2026-10-20):** the two moved to `devDependencies`, and the lock's `packages/noodl-mcp` entry
with them. The spec holds the reason as well as the result: no runtime dependency, and no build in the package leaves
anything external except the render harness's `ws` (shipped in `dist/render-harness/node_modules`). The arm without
dependencies was checked to answer `initialize`; every shipped bundle's bare requires are Node built-ins, that `ws`,
guarded optional ones (`pg-native`, `better-sqlite3`) and ajv codegen strings.

Not measured yet: a cold start of a kit that carries the fix inside a real Claude Code first run (the 0.2.4 cut;
expect about a third of the install time), and interactive Claude Code's `/mcp` reconnect on a failure. Not done:
the other two candidates above (install at create time, a printed reconnect line). Worth a look beside it:
`@nodegx/preview` declares `chokidar`; whether its bundle already inlines it was not checked.
