# Phase 125 — next session (lane 3 on the BOARD)

Read `README.md` here, then the task you take. State on 2026-10-23 evening:

- **CCN-001 ✅** (eight sessions in one day; Studio renders inside Claude Desktop, the hold holds every tool).
- **CCN-006 s9 built** (the desktop app offered when the agent's server goes; OpenNoodl 9fcd69f0f, studio 65b1623);
  the `.mcpb` Desktop Extension and `create-nodegx --desktop` are the rest of it.
- **CCN-002 built** (the hold everywhere): see its Done section. `what_changed_since` is new; `session_status`
  reports the hold; a hold over a day old is said; `.nodegx-hold.json` is gitignored by the shared merge; Studio names
  the agent in a clash and in the "redrawn" toast.

🔴 **The `noodl-mcp` dist has not been rebuilt since s8** (12:06). Richard's Claude Desktop runs the bundle, so it runs
none of CCN-006 s9 or CCN-002 until `npm run build` in `packages/noodl-mcp` (esbuild, no typecheck). Ask before
rebuilding it: it is what his Desktop is running right now.

🔴 **CCN-002 found the drift rule weaker than the tasks assumed.** `update_component` re-reads before it applies, so
an agent's write after the person's Studio edit lands ON that edit (kept, but the same setting overwritten), and is
refused only with `if_revision`. CCN-003 (show before apply) should not lean on "the drift rule refuses".

Next, in the board's order: **CCN-003** (show before apply) → CCN-004 (look first) → CCN-005 (short bursts); CCN-006's
`.mcpb` can go in parallel; CCN-007 (the person test) last.

Local gates: `packages/noodl-mcp`: `npx jest tests/ccn002HoldEverywhere.test.ts tests/toolDisclosure.test.ts --runInBand`
(the surface read 8,277 / 8,280 after CCN-002: 3 tokens free, so a new tool goes in an existing deferred group whose
"(N tools)" keeps its length). Studio: `npm run check:editor` in nodegx-studio (Node 22, `nice -n 19`, the HEAVY.lock).
The fake host: `node tools-fake-host.mjs 47612 http://127.0.0.1:<studio>/panel`, then squirm's `tools/drive.mjs` on
`tools-fake-host-steps.json`. After any run in Claude Desktop, read `~/Library/Logs/Claude/mcp-server-nodegx.log` first:
it says whether the host called a tool at all.

`noodl-mcp`'s `tsc --noEmit` is red on two lines of the Swift emitter (P125-CCN002-SWIFTARGSNEVER, lane 4's file,
filed not fixed): nothing of this phase's.
