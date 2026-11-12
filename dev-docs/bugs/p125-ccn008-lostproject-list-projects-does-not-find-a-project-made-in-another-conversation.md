---
id: P125-CCN008-LOSTPROJECT
title: list_projects did not find Muddy Paws, made through create_project in another conversation the day before; Richard pasted its path
status: fixed
severity: medium
area: mcp / list_projects (`src/tools/listProjects.ts`)
found: P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21
evidence: Richard's words, P125 CCN-008 AC6, Richard's Muddy Paws run in Claude Desktop (Sonnet 5.5), 2026-10-25 08:12–08:21; mcp-server-nodegx.log 07:11:32Z the first call; `listProjects.ts` read only the editor's `recently_opened_project.json` and the server's folder
kit: mcp
commit: 6ce8f171b
regression: packages/noodl-mcp/tests/p125KnownProjects.test.ts
---

Richard: *"the chat didn't find the project I had created in another chat … Maybe projects need to be created
somewhere Claude remembers consistently?"*

The list came from the desktop editor's recent projects (written only by the editor) and the folder the server
started in (Desktop starts it in none). A project made in a conversation was recorded nowhere.

**Fix:** every project this server binds (create_project, open_project, a server started on a project) is remembered
in `~/.noodl/known-projects.json` (`project/knownProjects.ts`, newest 60, gone folders left out), and list_projects reads
it beside the editor's list. Tests never read or write the person's file.
