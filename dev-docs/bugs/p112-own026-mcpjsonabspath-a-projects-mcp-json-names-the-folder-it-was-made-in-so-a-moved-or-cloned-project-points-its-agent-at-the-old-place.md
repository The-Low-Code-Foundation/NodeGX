---
id: P112-OWN026-MCPJSONABSPATH
title: A project's .mcp.json names the absolute folder it was created in, so a moved, renamed, copied or cloned project points its agent's server at the old place
status: open
severity: medium
area: kit / MCP — `packages/noodl-mcp/src/project/agentConfig.ts` `selfRegistration` (the `_npx` branch: `['-y', '@nodegx/mcp@<v>', projectDir, '--allow-writes']`, `projectDir` absolute), written by `create_project` (`writeAgentConfig`) and backfilled by the editor on open
found: P112 OWN-026 t2-nodegx-c02, 2026-10-23 (the lab copies each round to a new folder; the agent found the seed's path in `.mcp.json`)
evidence: /Users/Shared/nodegx-lab/own026/t1-nodegx-3/work/apps/rocket-tables/.mcp.json args[2] = that folder; t2-nodegx-c02's trace has `ls -d …/t1-nodegx-3` (refused by the lab's fence), then an `editor` call that rewrites the path to its own folder
---

`create_project` writes the project's `.mcp.json` for Claude Code with the project folder as an absolute path in the
server's arguments. That's right on the day it's written. Any of these then leaves the file pointing somewhere else:
- the person moves or renames the folder;
- they copy it, or duplicate it as a starting point;
- they share it through git (a community template, a teammate's clone).

Claude Code then starts the NodeGX server against a folder that isn't there, or against the original folder if it
still exists, which is worse: the agent edits a different copy from the one the person is looking at.

In OWN-026 the lab copies each round to a new folder, so every seeded round inherits the seed's path. A DeepSeek
agent in Cline (which doesn't read this file) noticed it, tried to look at the old folder (refused by the fence),
and rewrote the path to its own. Cost there: 2 calls. For a Claude Code user it's the server itself.

Likely fix: register the project relative to where the agent starts (`.`, resolved against the server's cwd, which
Claude Code sets to the folder it runs in), or have the server bind to the folder `.mcp.json` sits in when the named
one is missing. Check the editor's backfill (it must not rewrite a relative path back to an absolute one), and the
non-npx branch, whose script path is machine-specific by nature (editor-launched; say so where it's written). Related:
`P112-S14-MOVEDDEPLOY` (a moved project can't redeploy its cloud functions).
