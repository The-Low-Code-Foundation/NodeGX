---
id: P128-S3-NAMEMISMATCH
title: "The `.mcpb` manifest's `name` is `nodegx` and the server's `serverInfo.name` is `noodl-mcp`; a Claude Desktop report says an extension's tools reach the chat only when the two match, which fits the AC8 run's step 3b (tools listed, the model answered without them, 0 calls)"
status: open
severity: medium
area: "nodegx-studio `scripts/mcpb.mjs` (`manifest.name: 'nodegx'`); `packages/noodl-mcp` `serverInfo.name` (`noodl-mcp`, seen in every `initialize` result)"
found: P128 S3 follow-up, 2026-10-27, looking for why step 3b of Richard's AC8 run had no tool calls
evidence: "Step 3b: Desktop listed the server's tools twice after the restart (`mcp-server-nodegx.log` 16:06:19Z) and 0 `tools/call` reached it; the model answered from general knowledge. Steps 3 and 3c, same names, did call. anthropics/claude-code#70397 (Desktop 1.14271.0, Windows, closed not planned, locked): \"Claude Desktop binds an extension's tools to the chat model only when the manifest's top-level `name` is identical to the `serverInfo.name` the server returns from `initialize`\" — the reporter's A/B, not confirmed by Anthropic; they also saw a matched extension go quiet in a later chat until disable→enable or a relaunch. Not measured here: one 3b against two working chats does not separate this from timing or the model's choice."
launch: beta
owner: none
---

A hypothesis with a cheap test, not a finding yet. If it holds, some strangers install NodeGX, ask for an app and
get an answer from a model that never sees the tools, which is the walk failing at step 2 with no error anywhere.

**Proposed.** Make the two names equal without changing the extension's identity (a new manifest `name` would install
as a second extension beside the old one): the `.mcpb` passes `NODEGX_SERVER_NAME=nodegx` and the server reports it
as `serverInfo.name` (default stays `noodl-mcp`, which other clients and specs read). Then several fresh chats in
Desktop, counting the ones with no tool call, before and after.
