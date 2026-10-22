---
id: P26-V2GUARD
title: A deploy into a v2 project's own folder wrote the app into the project and exited 0
status: open
severity: medium
area: deploy / deployToFolder target guard (editor Deploy and `nodegx deploy`)
kit: preview
found: P26 DEP-001 session, 2026-10-22
evidence: dev-docs/tasks/phase-26-deployment/PROGRESS.md D24
---

What a person sees: they pick their project's folder as the deploy destination (an easy slip when
projects and deploys share a parent folder) and get `index.html`, `noodl.deploy.js`, the React files,
`noodl_bundles/` and `DEPLOY.md` written in among the project's own files. Nothing refuses.

Where: `build/deployer.ts` `deployToFolder` refused a target holding `project.json`, the legacy
format's file. A v2 project holds `nodegx.project.json` instead, so the guard never fired for one.

Reproduce: a copy of `templates/todo-list` (v2), then `nodegx-deploy <copy> <copy>`. Measured
2026-10-22 with a scratch build of the CLI: exit 0, and the copy gained the whole deploy beside
`components/` and `nodegx.project.json`.

Fix: the guard checks `PROJECT_FILES` (`project.json`, `nodegx.project.json`) from
`build/deploy-target.ts`, keeping the same refusal message, which the CLI maps to its `target`
stage. The editor's Deploy tab also refuses a folder inside the project, because the next deploy
would copy that folder.
