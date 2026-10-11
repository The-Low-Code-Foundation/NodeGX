---
id: P112-S9-DAYTWO
title: "`list_projects` tells the agent of someone who never opened the editor that they have no projects — with yesterday's app in the folder — and points it at `create_project`"
status: fixed
severity: high
area: mcp / bootstrap discovery (`packages/noodl-mcp/src/tools/listProjects.ts` `scanRecentProjects`, the only source)
kit: mcp
found: P112 OWN-011 s9, 2026-10-11
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-011-ONE-INSTALL.md §7
regression: packages/noodl-mcp/tests/listProjects.test.ts "P112-S9-DAYTWO"
commit: abcefd10c
---

R9 (2026-10-11) made OWN-011's command set a folder up and leave the app to the agent's `create_project`. The day after:
the same folder, the app the agent made in `reading-list/`, the bootstrap server started there (installed from its
tarball under `npx`, a home folder with no editor in it). `list_projects` answered:

```
"projects": [],
"note": "No NodeGX projects recorded on this machine — either nothing has been built yet, or NodeGX has never been
opened here. create_project is the way forward; scope the app with the user first."
```

The only source is the editor's recent-projects file, which only the editor writes. The module's own header names
the consequence — "an agent reaching for `create_project` and building a second app beside the one its user meant" —
and for a person who started from npm it is the answer on every day after the first.

**Fixed:** `scanProjects` merges the launcher's list with `scanFolderProjects(process.cwd())`: the folder itself when it is a v2 project, else its immediate v2 subfolders (not dot folders, not `node_modules`), one row per directory. The tool description says so in the same number of tokens (the AWP-006 surface budget still passes). Stranger run, day two: `list_projects` reports "Reading List". ⚠️ Not measured: that every MCP client starts a project server in the folder it was opened in (Claude Code is the case OWN-011 assumes; the stranger run in a real client is OWN-011 §4.4).
