---
id: P127-BKO006-ADMINTERMINAL
title: Asked to change who can do what, the Desktop agent sends the person to the backend manager, whose first login needs a command typed in a terminal
status: open
severity: high
area: "noodl-mcp `get_backend_admin_dashboard` (backendTools.ts: its description calls its URL \"the URL to send a human to\"); the backend manager's first login (BMG-014 setup, needs the admin credential, which is only on disk)"
found: P127 BKO-006, Richard's Desktop run (homework_feedback, Sonnet 5.5, map 0.1.7 bundle), 2026-10-31
evidence: "RELAYED (Richard, 2026-10-31): \"Claude Desktop wanted me to go to the admin page for the backend to edit roles, but I don't have the logins and Claude said I had to open terminal and run a command to get them (not very non coder friendly in theory). So I insisted it create me an editor in the chat to change privacy rules and it did it.\" READ: the agent had create_backend_role, assign_role_user and set_collection_permissions; get_backend_admin_dashboard's description offers the dashboard's URL as the one to send a human to, and the manager's first run explains where to find the credential and how to replace it with `--token`. MEASURED: Desktop's web log shows the editor was the agent's own `visualize:show_widget` (11:07:52–11:08:19), not a NodeGX surface; ~/nodegx_projects/homework_feedback/nodegx.security.json was last written 10:43:26 and holds what the widget shows; the nodegx server's last tool call was 11:07:47. NOT MEASURED: the conversation's text (which tool's words sent him to the manager); whether anything he changed in the widget reached the backend."
owner: none
launch: beta
---

High for the Beta: the person the Beta is for cannot get past this without a terminal, and the agent could have done the
job itself. It had the tools to make a group, put a person in it and set a table's rule, and it chose the backend
manager because a tool says that is where a human goes. The manager's first login needs the admin credential, which
lives in a file, so the agent's honest next step was a terminal command.

Richard got round it by asking for an editor in the chat. The agent drew one with Claude's own widget tool, from the
rules it had read. That is not a NodeGX surface: it reads like Studio's Privacy and is not it, and nothing NodeGX
measures says what it wrote. The rules file holds exactly what the widget shows, last written 23 minutes before it
was drawn.

**Where people should land instead:** Studio's Data → Privacy, inside the conversation (it opened in this run). It
can't make a group or put a person in one yet: that is **P123-GH-NOGROUPS**, open, being worked in another session.
Until it can, the agent should do it with `create_backend_role` / `assign_role_user` and say what it did, never send a
person to a page that needs a credential they don't have.

**Fix, two halves:** (1) `get_backend_admin_dashboard`'s description stops offering the URL as the place to send a
person; Privacy in Studio is that place, and the agent's own tools do the rest. (2) Once NOGROUPS is fixed, the
guidance names Privacy for groups. Regression: a stranger round where the brief asks for a group of teachers and the
person asks "how do I make someone a teacher?"; grade that the reply names neither the manager nor a terminal.
