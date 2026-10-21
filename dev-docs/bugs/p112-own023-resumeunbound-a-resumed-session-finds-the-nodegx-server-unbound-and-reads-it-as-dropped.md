---
id: P112-OWN023-RESUMEUNBOUND
title: A resumed Claude Code session finds the NodeGX server unbound (seven tools, no project) and reads the missing tools as a dropped connection
status: open
severity: medium
area: mcp / binding
found: P112 OWN-023 round 2 (the gala), arm B, 2026-10-21
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-023/ROUND-2-THE-GALA.md §8.1; arm B's sittings 1–2 (the first reply's transcript was overwritten by the lab, its summary is in §8.1)
---

Arm B built its app in a sub-folder (`gala/gala-app`) through `create_project`, which bound the server. Its last step
asked the person to put a key in `.env` and say "done". When the person did, the session was resumed and the
`nodegx` server started fresh: connected, but unbound, offering only the seven no-project tools. The agent said:
"the connection to the NodeGX server dropped … reconnect it with /mcp". Reconnecting would have given the same
seven tools. Only after a second "done" did it call `open_project` itself and finish ($4.00 + $0.66 for the two replies).

Proposed: the server binds itself on start when the folder (or one sub-folder) holds exactly one project, or its
seven-tool list says in its instructions "no project is bound: call open_project with <the folder you built in>".
Related: P112-OWN023-KEYNEEDSAGENT (why the person had to come back at all).
