---
id: P112-OWN036-DEPLOYPREVIEWS
title: "`nodegx-deploy` copies a project's `.previews/shots/` (the screenshots an agent took while testing) into the folder it says is ready to upload"
status: open
phase: P112
task: OWN-036
severity: low
area: "@nodegx/preview 0.2.8 `bin/nodegx-deploy.js` default exclusions (it already leaves out AGENTS.md, CLAUDE.md, .mcp.json, docs/ as 'not for publication')"
found: P112 OWN-036, 2026-11-04 (dry-running the upload of the lab's Deep Glow to nodegx.io)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-036/RESULTS.md
kit: preview
---

`nodegx-deploy deep-glow <out> --base-url /lab/first-project/deep-glow/` wrote `<out>/.previews/shots/1-title.png`,
`2-diving.png` and `3-over.png`: the pictures Claude took of the game while it built it. The same run's report lists
what it left out by default and why: `.mcp.json` ("names this machine's paths"), `AGENTS.md` and `CLAUDE.md` ("an AI
agent's instructions, not for publication"), `docs/` ("project documentation"). `.previews/` is the same kind of
working file and isn't on the list, so an upload publishes it at `<site>/.previews/shots/…`.

Here they were harmless game pictures. In an app with real data they're screenshots of that data. Fix candidate: add
`.previews/` to the default exclusions with its reason, as the others have.
