---
id: P128-S3-NAMEMISMATCH
title: "The `.mcpb` manifest's `name` is `nodegx` and the server's `serverInfo.name` is `noodl-mcp`; a Claude Desktop report says an extension's tools reach the chat only when the two match, which fits the AC8 run's step 3b (tools listed, the model answered without them, 0 calls)"
status: open
severity: medium
area: "LEFT: the count in Claude Desktop only (BOARD §1a R3), the fix is published in 0.2.9. Was: nodegx-studio `scripts/mcpb.mjs` (`manifest.name: 'nodegx'`); `packages/noodl-mcp` `serverInfo.name` (`noodl-mcp`, seen in every `initialize` result)"
found: P128 S3 follow-up, 2026-10-27, looking for why step 3b of Richard's AC8 run had no tool calls
evidence: "Step 3b: Desktop listed the server's tools twice after the restart (`mcp-server-nodegx.log` 16:06:19Z) and 0 `tools/call` reached it; the model answered from general knowledge. Steps 3 and 3c, same names, did call. anthropics/claude-code#70397 (Desktop 1.14271.0, Windows, closed not planned, locked): \"Claude Desktop binds an extension's tools to the chat model only when the manifest's top-level `name` is identical to the `serverInfo.name` the server returns from `initialize`\" — the reporter's A/B, not confirmed by Anthropic; they also saw a matched extension go quiet in a later chat until disable→enable or a relaunch. Not measured here: one 3b against two working chats does not separate this from timing or the model's choice."
launch: beta
owner: Beta sweep s20 (2026-10-27)
commit: e03258b33 (noodl-mcp), nodegx-studio a1b019e (the .mcpb)
regression: packages/noodl-mcp/tests/p128NameMismatch.test.ts
---

A hypothesis with a cheap test, not a finding yet. If it holds, some strangers install NodeGX, ask for an app and
get an answer from a model that never sees the tools, which is the walk failing at step 2 with no error anywhere.

**Proposed.** Make the two names equal without changing the extension's identity (a new manifest `name` would install
as a second extension beside the old one): the `.mcpb` passes `NODEGX_SERVER_NAME=nodegx` and the server reports it
as `serverInfo.name` (default stays `noodl-mcp`, which other clients and specs read). Then several fresh chats in
Desktop, counting the ones with no tool call, before and after.

**Built (Beta sweep s20, 2026-10-27), as proposed; open until it is counted.** The server answers `initialize` with
`NODEGX_SERVER_NAME` when it is set (empty or unset: `noodl-mcp`), and `scripts/mcpb.mjs` sets it from the same
constant as the manifest's `name`. Graded on the handshake: an in-process client reads `serverInfo.name`, 3/3; HEAD's
`server.ts` reds the set arm. Not graded: whether it changes what Desktop does. That is the count above (several
fresh chats, the ones with no tool call, before and after), on a `.mcpb` built with `--mcp-tarball` from a pack of
e03258b33 or later: the 0.2.8 tarballs (dfdc9e25e) predate it, and so does every published `@nodegx/mcp`.

## 2026-11-07: the fix is published; only the count is left (Beta sprint S4)

The evidence line above ("every published `@nodegx/mcp`" predates the fix) is out of date. `git merge-base
--is-ancestor e03258b33 9cbf7383a` holds: the fix is in `@nodegx/mcp` 0.2.9 (released 2026-10-27, `9cbf7383a`), and
the `.mcpb` on Studio v0.1.0 was built on that 0.2.9 tarball. What is left is the measurement itself: several fresh
chats in Claude Desktop on that `.mcpb`, counting the ones with no tool call. That is Richard's Desktop sitting
(BOARD §1a R3, on the S1 `.mcpb`). Close this row with that count.
