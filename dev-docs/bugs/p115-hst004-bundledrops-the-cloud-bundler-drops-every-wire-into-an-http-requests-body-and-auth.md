---
id: P115-HST004-BUNDLEDROPS
title: "cloud deploy: the headless cloud bundler drops every wire into an HTTP Request's body, header or auth ports, so the function calls the API without them and still answers success"
status: open
severity: high
area: cloud deploy / bundle (`packages/noodl-editor/src/editor/src/utils/exporter/util.ts` `exportComponent`, the `getConnectionHealth` filter; `net.noodl.HTTP` has no editor-side port adapter in `models/NodeTypeAdapters/`)
found: P115 HST-004 session 2, 2026-11-04, Fixture B's `subscribe` written by the MCP and bundled by `packages/noodl-mcp/dist/cloud-bundle.cjs`
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-004-A-WORKFLOW-ON-A-WORKER.md §7
kit: core
---

A cloud function written by the MCP (`create_component`, 0 errors): Request (`email`) → Secret `MAILCHIMP_KEY` → HTTP
Request (POST, JSON body fields `email_address`, `status`, Bearer auth) → Response. On disk,
`components/__cloud__/subscribe/connections.json` holds **10** wires. The bundle the editor's own bundler builds from
it (`node packages/noodl-mcp/dist/cloud-bundle.cjs <project>`, the child `deploy_cloud_functions` runs) holds **8**,
with `failures: []`. The two missing are exactly the two wires into the HTTP Request's runtime-made ports:

- `sub-req.pm-email → sub-http.body-email_address`
- `sub-key.value → sub-http.auth-authToken`

A wire into a Response node's runtime-made port (`sub-http.statusCode → sub-ok.pm-status`) survives.

**What it does:** run on a Worker, the function answered `200 {"result":{"subscribed":true,"status":200}}` and the
stand-in received `{"status":"subscribed"}` with **no Authorization header and no email**, four calls out of four. A
real list API would answer 401, but the email is lost either way, and nothing on the deploy path says a wire went.

**Likely cause (read, not measured):** `exportComponent` keeps a wire only when `getConnectionHealth` finds no `error`.
The HTTP Request's `body-*`, `header-*`, `query-*`, `path-*` and `auth-*` ports are made by the runtime node itself
(`httpnode.ts`, sent to the editor from its `setup()` only when a viewer runs locally). There is no adapter for it in
`NodeTypeAdapters/` (Response and Request have `CloudDynamicPortsAdapter`), so a process with no viewer, like the
headless bundler, never has those ports, and the health check calls the wire broken.

**Not measured:** whether the editor's own Deploy button, with a viewer running, keeps these wires; whether a browser
export (`nodegx export`, `deployer.ts`) of a page with the same HTTP Request wiring loses them the same way (same
`exportComponent`). Measure both before fixing.

**Reproduce:** the Fixture B project at `dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/b-newsletter`;
`node packages/noodl-mcp/dist/cloud-bundle.cjs <that dir> | node -e '…parts.bundle.components[0].connections.length'`
→ 8 against 10 on disk.

**Proposed:** give the HTTP Request an editor-side port adapter that derives its ports from its parameters (the same
code `httpnode.ts` runs), so the editor, the headless bundler and the validator all see them; or have the bundler
never drop a wire into a port prefix a node type declares as runtime-made. A spec: bundle a one-function project with
each of the five prefixes wired, and count the wires.

**Worked around in the P115 spike only:** `spike-worker/build.mjs` puts back the wires the bundle lost, read from the
project's own `connections.json`, and says so in its output.
