---
id: P112-S14-MOVEDDEPLOY
title: "A project whose folder is moved, renamed or copied can't redeploy its cloud functions: \"Duplicate component name /#__cloud__/…\""
status: open
severity: medium
area: cloud deploy bundle name (`packages/noodl-editor/src/editor/src/utils/exporter/cloudDeployCore.ts` `cloudBundleNameFrom`, used by `packages/noodl-mcp/src/cloud/bundleEntry.js`) × backend reuse by project id (`packages/noodl-mcp/src/backend/provision.ts` `findReusableBackend`)
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
---

The cloud bundle is named `<project name>-<FNV-1a of the project's folder path>`. The backend a project uses is found
by **project id** (name + ownership), so it follows the project wherever the folder goes. After a move, a rename
or a copy, `deploy_cloud_functions` builds a bundle under a new name. The backend still holds the old bundle, which
defines the same `#__cloud__` component names, and refuses:

> `{"ok": false, "functions": [{"name": "/#__cloud__/Functions/Speak", "status": "failed", "reason": "Backend "App
> backend": Duplicate component name /#__cloud__/Functions/Speak"}]}`

Measured: a copy of the round-2 project (`bonjour` → `bonjour-repaired`, same id) deployed to the same backend:
`Bonjour-9828ff05` already served, the copy built `Bonjour-fd5e9204`, refused. No MCP tool removes a deployed
bundle, so the person is stuck until they delete `workflows/<old>.workflow.json` from the backend's data folder by hand.

**Fix question:** key the bundle on the project id (stable across moves) rather than the path? Or let a deploy
replace a bundle that the same project id deployed? The path hash was chosen to separate "the handful of project
folders one backend ever sees", which project ids now do better.
