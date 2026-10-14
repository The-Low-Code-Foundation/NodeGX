---
id: P112-S14-NOTNODEGX
title: "Asked for an app in the folder `npm create nodegx` made, a fresh agent writes an Express server and plain HTML and never calls a NodeGX tool"
status: fixed
commit: (this session's commit)
severity: high
area: create-nodegx / the folder it writes (`packages/create-nodegx`, one file `.mcp.json` per R9) + mcp / the unbound server's instructions (`packages/noodl-mcp`, the "NO PROJECT IS BOUND" briefing)
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 1)
---

The person's path, exactly as `create-nodegx` 0.2.0 prints it: run `npm create nodegx`, open the agent in the folder,
"say what you want to build". OWN-015 AC1's first stranger round did that: `claude -p` (Sonnet 5), in the folder
`create-nodegx-0.2.0.tgz` wrote, the server from `nodegx-mcp-0.2.0.tgz` connected (status `connected`, its six
unbound tools listed), `HOME` empty for the server. The sentence asked for a small Duolingo-style French app with
Gemini text-to-speech and the key kept on the server. It did not say "NodeGX".

**What happened:** 14 turns, $0.53. The agent wrote `server.js` (Express + dotenv, the key in `.env`), `public/`
(HTML, CSS, JS) and a README, then stopped at `npm install` (Bash not pre-approved). It called **none** of the six
NodeGX tools, not even `list_projects`. Its first line: *"build the app: an Express server that keeps the Gemini
API key server-side and proxies TTS requests, plus a static front-end"*.

**Why:** the folder holds one file, `.mcp.json` (R9). Nothing in the folder says "apps here are NodeGX apps". The
unbound server's instructions describe what NodeGX is and how to open or create a project, but not that an app the
person asks for in this folder should be built with it. A coding agent with a shell and a file writer does what it
does by default.

**Question for the fix (needs a ruling, because R9 said "one file"):**
1. `create-nodegx` also writes a short `CLAUDE.md` / `AGENTS.md`: "Apps in this folder are built with NodeGX: use
   the nodegx tools (start with list_projects / create_project); don't write a separate web server."
2. The unbound server's instructions open with that sentence: "The person set this folder up to build NodeGX
   apps. When they ask for an app, build it with these tools…". This works in every client that reads server
   instructions, and adds no file.
3. Both.

Option 2 changes nothing on disk and reaches every MCP client. Option 1 also reaches an agent that skims server
instructions. AGENTFILES (s13) already keeps `CLAUDE.md` out of a deploy.

**Ruling (Richard, 2026-10-12): both** — *"Yep or else what's the point?"*

**Fixed:** (1) the unbound server's instructions now say, right after what NodeGX is: *"WHEN THE PERSON ASKS FOR AN
APP, BUILD IT WITH THIS SERVER: … do not write a separate web server or hand-made HTML and JavaScript instead"*. (2)
`create-nodegx` also writes `CLAUDE.md` and `AGENTS.md` (only when absent). They say that apps here are NodeGX apps
built with the `nodegx` tools, and that a key goes in through `.env` via `set_function_secret` without a value, never
through the chat. create-nodegx tests 8/8; the MCP's instructions, bootstrap, bind and agentConfig suites pass.
**Not yet measured:** whether a fresh round 1 (the sentence without "NodeGX") now builds with the tools. That needs the
next stranger round.
