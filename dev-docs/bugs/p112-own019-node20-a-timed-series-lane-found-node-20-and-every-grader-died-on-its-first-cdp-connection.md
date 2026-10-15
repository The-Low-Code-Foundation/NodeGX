---
id: P112-OWN019-NODE20
title: "The s7 series lanes, started by a timer from a shell whose PATH found /usr/local/bin/node (v20.11.1), ran every round but graded none — each grader died on `new WebSocket(…)` (\"WebSocket is not defined\"; Node's global WebSocket arrived in 22)"
status: fixed
commit: (this commit)
phase: P112
task: OWN-019
severity: medium
area: the lab — the four graders (`own-018/grade-quiz.mjs`, `own-019/grade-launch.mjs`, `grade-editor.mjs`, `grade-pack.mjs`) as a lane script runs them
found: P112 OWN-019 s7, 2026-10-15 06:46 (TL1, the first round of the tgz33 series)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s7)
---

`which -a node` on this Mac: `/usr/local/bin/node` v20.11.1 first, then nvm's v22.22.0, then `~/.conduit/bin/node`
v16. s5's lanes ran under a shell with nvm first (its RL2 crash trace says v22.22.0); s7's timer (`s7start.sh`,
nohup from the session's Bash tool) inherited the other order. The rounds don't care (round-kit needs no WebSocket),
so TL1 ran to `# Done` and then graded blank: `graded TL1: ` in `lane.log`, `ReferenceError: WebSocket is not
defined` at `grade-launch.mjs:132` in `TL1-grade.log`, and the gallery listed TL1 with no score.

**Fixed:** each grader now refuses on a Node without a global WebSocket before it starts a preview, naming the
version and path (checked: v20 → the error; v22 → past the guard to the usage line). The running series is regraded
by `regrade.sh watch` (s7 scratchpad) under v22. A lane script should put the Node it means first on PATH.

**It cost a round too (10:06):** the lanes also started each round's MCP server on Node 20, and the editor brief's
local backend needs `node:sqlite` (Node ≥ 22.13): `provision_backend` refused ("No SQLite engine available… tracked by
WF-004"), so TE1 could not build its editor (with SEEDDONE, 0/13). TE1b runs with Node 22 first on PATH (its server's
binary read with `lsof`: v22.22.0). A person on Node 20 meets the same refusal — the message names the cause.
