---
id: P125-CCN006-AGENTPILL
title: Studio's header says "Connect Claude Code" while an agent in Claude Desktop is driving the same project
status: open
severity: low
area: nodegx-studio `editor/studio.html` `AGENT_PILL` / `loadAgent` (reads `GET /api/agent` = `lib/agent.mjs` stateOf, which looks for `.mcp.json` in the folder)
found: P125 CCN-006, 2026-10-23 — the companion's drive (`Puppy test 3` copy through the proxy)
evidence: "Screenshot 1-pill.png in the session's scratchpad: the header reads 'Connect Claude Code' (grey) and the companion's pill at the bottom right reads 'Connected to Claude Code'. `/api/agent` answers from the folder's `.mcp.json` (Claude Code's project registration); Claude Desktop registers the server in its own config, so the folder has none."
---

Studio's header item means "is this folder registered with Claude Code". A person reads it as "is an agent connected".
When Studio comes from Claude Desktop (in the panel's full screen or a browser window), it shows "Connect Claude Code"
with an agent working on the project in front of them. Inline, the item is hidden (hosted.js), so the panel itself
is fine.

**Proposed:** when the page is served through NodeGX's proxy, `/__nodegx/status` names the agent. Studio's pill can
read that first ("Claude is working on this") and fall back to `/api/agent` for its own Connect flow.
