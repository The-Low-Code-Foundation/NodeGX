---
id: P112-OWN023-READONLYOPEN
title: "A careful agent on a read-only task never opens the project with the NodeGX server: `open_project` writes nothing, but the kit says or implies that it does"
status: fixed
commit: fc206a738
severity: medium
area: "`@nodegx/mcp` 0.2.4 bootstrap (`src/tools/openProject.ts` description; the tool is registered only behind `--allow-writes`); the project's `.gitignore` comment written at create time"
kit: core
found: P112 OWN-023 round 3 (the reading), 2026-10-21
evidence: "own-023/ROUND-3-THE-READING.md; arms B-claude and B2-claude-open (/private/var/tmp/own023-r3/, copied to own-023/runs-r3/)"
---

Asked to plan a feature without changing files, Opus 5.5 on the NodeGX gala **never called `open_project`, twice**,
and so never had `get_project_info`, `get_component`, the validator or `render_report`. It read the graph by writing
Python one-liners over `nodes.json` / `connections.json` instead.

- B-claude (brief: "don't change any other file"), PLAN.md part 4: *"I didn't open the project with the `nodegx`
  server (opening writes `app/.mcp.json`, and I was asked not to change files)."* Its source: the app's `.gitignore`
  comment *"Machine-specific MCP registration … written when the project is created or opened"*.
- B2-claude-open (brief loosened to "the only file you should write yourself is PLAN.md"): *"checking which backend
  building blocks NodeGX offers … using its read-only example library so I don't touch the project"*; its plan's
  step 0 is a spike to "open the project with the `nodegx` server".
- Measured: `open_project` writes **nothing** (B-vibe, DeepSeek V4.1 Flash, opened the same project: `find -newer`
  shows only its PLAN.md). `openProject.ts`'s own header says so ("No `.mcp.json`, no `CLAUDE.md`, no launcher
  entry") but the tool description doesn't, and the tool exists only on a server started with `--allow-writes`.

Why it matters: "read my app and tell me X" is the case NodeGX's reading tools exist for (OWN-023 r3 is about
exactly that), and the most careful client shuts itself out of them.

Fix, small: (1) `open_project`'s description and the bootstrap instructions say *"Opening binds this server to the
project; it writes nothing into the folder."* (2) The `.gitignore` comment says *"written when the project is created
or opened in the NodeGX editor"*. (3) Consider offering `open_project` on a read-only server too (binding read-only).
Verify by re-running B2-claude-open's brief: the arm opens the project.

**Fixed 2026-10-21 (`fc206a738`, OWN-023 round 3b):** (1) `open_project`'s description says "Opening writes nothing into the
project folder, so it is safe on a read-only task"; the kit's CLAUDE.md/AGENTS.md say the same beside the new `--graph` line.
(2) the editor's `.gitignore` comment says "created or opened in the NodeGX editor". (3) not done: `open_project` on a
read-only server. Round 3b's arm (B3-claude, before this fix) refused to open a third time and read node capabilities out of
`node_modules/@nodegx/mcp/dist/node-catalog.json` instead. Verify by re-running B3's brief on a kit with this note.

**Measured again 2026-10-22 (round 3b, arm B3b-claude: the same brief on the kit note WITH this fix, `@nodegx/mcp` with `--graph`):** Opus still made **0 calls to the `nodegx` server** (32 tool calls: 30 Bash, 1 Read, 1 Write). Its PLAN.md part 4: *"I did not run the app (`npx @nodegx/preview`) or open the project with the `nodegx` server. Everything here comes from reading the graph and the scripts and running the three existing checks."* The reason has changed: not fear of writing any more, no need. Given the page, the server's reading tools were redundant for a plan-only task; what it still dug for by hand was the node library (`node_modules/@nodegx/mcp/dist/node-catalog.json`, 4 `python3` calls, as B3 did): see `P112-OWN023-CATALOGDIG`. Item (3), `open_project` on a read-only server, stays open; the wording fix (1)–(2) is measured as not sufficient to make a careful agent open the project, and it is no longer clear it should have to.
