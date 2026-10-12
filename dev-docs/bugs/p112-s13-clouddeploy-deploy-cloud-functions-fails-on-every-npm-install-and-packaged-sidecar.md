---
id: P112-S13-CLOUDDEPLOY
title: "`deploy_cloud_functions` fails on every npm install and on the packaged editor's sidecar: the bundler throws \"Cannot find package.json\" outside an npm package"
status: fixed
severity: high
area: MCP / cloud deploy (`packages/noodl-mcp/build-cloud-bundle.mjs`; `src/cloud/deploy.ts` spawns `cloud-bundle.cjs` with the server's cwd; `packages/noodl-platform-node/src/platform-node.ts` `getAppPath`; `packages/noodl-editor/package.json` `extraResources`)
kit: mcp
regression: packages/noodl-mcp/tests/own015CloudBundleCwd.test.ts "bundles a project from a working directory with no package.json" (its control removes the fix's file and fails with the original sentence)
found: P112 OWN-015 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §6
---

**What a stranger hits.** From a packed `@nodegx/mcp` in an empty folder: `create_project` → `provision_backend` →
`create_component #__cloud__/speak` → `deploy_cloud_functions` →
*"Could not build this project's cloud functions: …/dist/cloud-bundle.cjs:13127 … Error: [@noodl/platform] Cannot
find package.json, to get the build version."* The installed NodeGX 0.3.0's `Resources/noodl-mcp/cloud-bundle.cjs`,
run from any folder that isn't an npm package, fails the same way (measured).

**Why.** `deploy.ts` spawns the bundler with the server's own working directory. `@noodl/platform-node`'s
`getAppPath()` throws at import unless `process.cwd()` or the bundle's `__dirname` holds a `package.json`. Under
`npx` the working directory is the person's folder; in the packaged app it's wherever the agent started the sidecar.
In a checkout it's `packages/noodl-mcp`, which is a package, and so is the cwd of ISL-042's spec (`cwd: PKG`). That's
why nothing saw it. Register row C68 is the same defect in `@nodegx/preview`, fixed there with a
`dist/package.json`.

**Fix.** `buildCloudBundle` writes a `package.json` beside the bundle it builds (named `nodegx-mcp-bundles`, private).
`@nodegx/mcp`'s `files` ships `dist/package.json`, and the editor's `extraResources` copies it to
`Resources/noodl-mcp/package.json`.
