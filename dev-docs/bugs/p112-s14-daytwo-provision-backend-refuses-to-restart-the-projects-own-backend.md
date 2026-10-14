---
id: P112-S14-DAYTWO
title: "Day two from npm: provision_backend refuses to restart the project's own stopped backend, and deploy_cloud_functions sends the agent to an editor panel that isn't there"
status: fixed
severity: high
area: mcp / backend provisioning (`packages/noodl-mcp/src/tools/provisionTools.ts` the endpoint gate; `packages/noodl-mcp/src/backend/client.ts` `requireBackend`'s "No running backend" message)
found: P112 OWN-015 s14, 2026-10-12
commit: (this session's commit)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
---

A backend stops when the MCP server that started it stops, which is the end of every agent session. On the next
session (or a second client on the same folder), with the 0.2.0 tarball:

- `provision_backend {name: "App backend"}` (the same name, the same project, the backend this project owns) →
  `provisioned: false`, *"This project already points at http://127.0.0.1:8578. Nothing was created or started. Use
  that backend (list_backends shows it), disconnect it in the editor first, or pass force to repoint."* Nothing is
  running at that address.
- `deploy_cloud_functions` → *"No running backend. Configured: backend_…. Start one from the editor's Backend
  Services panel, then pass its id as backendId."* On the npm path there is no editor.

The tool's own description says it *"reuses this project's existing backend of the same name rather than making a
second, and ADOPTS it if it is already running"* and refuses only *"a different endpoint"*. The gate refused **any**
endpoint. The existing "adopts the running backend" spec passed `force: true`, so it couldn't see this.

**Fix:** the gate lets the project's own backend through: same name, owned by this project (`findReusableBackend`,
the rule `provisionBackend` already reuses by), and the id the metadata names. A different name or another
project's backend is still refused. The "No running backend" message names `provision_backend` first. New spec
*"day two: restarts the project's own stopped backend without force"* in `tests/provision.test.ts`: 12/12; with
the gate switched off it fails; the "Another backend" refusal spec is the control.
