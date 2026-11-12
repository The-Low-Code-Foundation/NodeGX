---
id: P112-OWN023-RESUMEUNBOUND
title: A resumed Claude Code session finds the NodeGX server unbound (seven tools, no project) and reads the missing tools as a dropped connection
status: fixed
severity: medium
area: mcp / binding
found: P112 OWN-023 round 2 (the gala), arm B, 2026-10-21
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-023/ROUND-2-THE-GALA.md §8.1; arm B's sittings 1–2 (the first reply's transcript was overwritten by the lab, its summary is in §8.1)
kit: core
regression: packages/noodl-mcp/tests/instructions.test.ts "names the sub-folder project, says the unbound start is normal, and sends it to open_project first"
owner: Beta sweep s16
commit: 34bbee2f1
---

Arm B built its app in a sub-folder (`gala/gala-app`) through `create_project`, which bound the server. Its last step
asked the person to put a key in `.env` and say "done". When the person did, the session was resumed and the
`nodegx` server started fresh: connected, but unbound, offering only the seven no-project tools. The agent said:
"the connection to the NodeGX server dropped … reconnect it with /mcp". Reconnecting would have given the same
seven tools. Only after a second "done" did it call `open_project` itself and finish ($4.00 + $0.66 for the two replies).

Proposed: the server binds itself on start when the folder (or one sub-folder) holds exactly one project, or its
seven-tool list says in its instructions "no project is bound: call open_project with <the folder you built in>".
Related: P112-OWN023-KEYNEEDSAGENT (why the person had to come back at all).

**Fixed (Beta sweep s16, 2026-10-27).** The second proposal, not the first: a server binds once, so binding the
folder's project on start would leave "make me a new app" with nowhere to author. The CLI passes its cwd
(`startFolder`); unbound, `createServer` runs `scanFolderProjects` (OWN-011's folder-or-one-sub-folder scan) and the
briefing gains, before "TWO WAYS ON", `THIS FOLDER ALREADY HOLDS A NODEGX PROJECT: "<name>" (<dir>). Every new or
resumed conversation starts this server unbound, so these few tools are the normal start, not a dropped connection,
and reconnecting gives the same ones: to carry on with that app, call open_project with its directory before anything
else.` (several projects: counted, the first five named, "the one the person means"). A folder with no project gets
the briefing byte for byte. Graded on the CLI itself (built to the scratchpad, `initialize` over stdio from a folder
holding `gala-app` in a sub-folder, and from an empty folder). Not graded: a live model reading it.
