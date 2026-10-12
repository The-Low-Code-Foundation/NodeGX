---
id: P112-S13-AGENTFILES
title: "A deploy publishes the agent's files: `.mcp.json` (this machine's project path and server command) and `CLAUDE.md` (the brief) land in the public folder"
status: fixed
severity: medium
area: deploy / default ignore rules (`packages/noodl-editor/src/editor/src/utils/compilation/build/ignore.ts` `DEFAULT_IGNORE_ENTRIES`, shared by the editor's Deploy and the npm engine `@nodegx/preview/dist/nodegx-deploy.cjs`)
kit: preview
regression: packages/noodl-editor/tests-unit/p112/deploy-ignores-agent-files.test.ts "excludes .mcp.json / CLAUDE.md / AGENTS.md / .claude/settings.json" (and the control that index.html and assets still copy)
found: P112 OWN-016 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md §6
---

`create_project` writes `.mcp.json` and `CLAUDE.md` into every project it makes. Deploying such a project with the
engine `@nodegx/preview@0.1.0` ships (`node dist/nodegx-deploy.cjs <project> <out>`) reported `ok: true` and copied
both into the output folder. The `.mcp.json` names `npx -y @nodegx/mcp@0.1.0 /var/folders/…/my-apps/lingo
--allow-writes`, which is the person's local path. The `CLAUDE.md` is the whole project brief. Served from the app's
origin, both are public. The default rules already kept `docs/` (*"project documentation, not for publication"*),
`.vscode/` and `.env` out. The agent's files are the same kind and were missing from the list.

**Fix.** `.mcp.json`, `CLAUDE.md`, `AGENTS.md` and `.claude/` are default exclusions with reasons. Re-measured from a
re-packed preview: excluded `.gitignore .mcp.json CLAUDE.md components/ docs/ nodegx.project.json`, and the site still
renders. The fix reaches npm users when `@nodegx/preview` is next published, and editor users at 0.4.0.
