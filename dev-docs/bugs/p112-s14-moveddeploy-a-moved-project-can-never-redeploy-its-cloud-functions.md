---
id: P112-S14-MOVEDDEPLOY
title: "A project whose folder is moved, renamed or copied can't redeploy its cloud functions: \"Duplicate component name /#__cloud__/…\""
status: fixed
severity: medium
area: cloud deploy bundle name (`packages/noodl-editor/src/editor/src/utils/exporter/cloudDeployCore.ts` `cloudBundleNameFrom`, used by `packages/noodl-mcp/src/cloud/bundleEntry.js`) × backend reuse by project id (`packages/noodl-mcp/src/backend/provision.ts` `findReusableBackend`)
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
kit: core
regression: packages/nodegx-backend/tests/p112-s14-moved-deploy.test.ts "moved again: the bundle with the same id goes, even with no function in common"
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

**Fixed (2026-10-25, the Beta sweep):** no bundle is renamed. A pushed bundle now carries its project's id
(`ProjectModel.id`, read from the project file), outside its fingerprint like `deployFingerprint`, from both doors
(the editor's `deployCloudFunctions`, the MCP child `bundleEntry.js`). `WorkflowRunner.loadWorkflow` replaces, in
the same candidate-runner swap, another bundle that is this project's (`bundlesSupersededBy`): one with the same id,
or an old one with no id whose name is the same before the folder hash and which defines one of the same
components. The old file is removed after the swap. A component that another bundle defines and nothing says is
this project's is a 409 in words naming the bundle and the way to remove it, in place of the 500 "Duplicate component
name"; a failed push still leaves the old set serving. Graded: `tests/p112-s14-moved-deploy.test.ts` 5/5 (all red
before; three mutants red: no name check, ids ignored, no file removal); `hls-013/cloudDeployCore.test.ts` gains the
id on both pushes. Driven: a scratchpad build of the MCP bundler on `d40-wizard-drive` and a copy (same id, names
`…-09668179` / `…-06667cc0`) pushed through `deployCloudBundle` to a backend built from source: the copy replaced the
original. With the copy renamed as well, the id replaced it; with no id, the push was refused and the original kept
serving. Not done: the MCP tool's result does not yet say what was replaced (the backend answers `replaced`), and
nothing reaches a stranger until `@nodegx/mcp` and the backend are released.
