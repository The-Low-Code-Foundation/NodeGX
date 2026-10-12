# OWN-015 — The backend from npm: a cloud function that keeps the key

**Opened 2026-10-12** from R18 (see OWN-014's header). **Model:** **Fable** for §3 step 1 (what the backend drags in
when it leaves the monorepo, and the secret's shape across the MCP, the backend and the cloud node). **Opus** for the
packaging, the stranger's runs and the publish.

**Status: 📋 not started.**

## 1. The person sentence

> **Someone who set up a folder with `npm create nodegx` asks their agent for an app that calls Google text-to-speech.
> The key goes in once, lives on the backend, and the browser never sees it.**

Today, on the npm path, the key can only go into an HTTP Request node in the browser bundle.

## 2. What was measured (2026-10-12, static reads; nothing driven)

- **The pieces exist in the repo:** the `noodl.cloud.secret` node (`packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts:55`,
  in the catalog, cloud only); a `functions` namespace in `secrets.json` with a `NODEGX_SECRET_<NAME>` environment
  fallback (`packages/nodegx-backend/src/config/SecretsStore.ts:171-178`, `service.ts:874-892`); the MCP tools
  `provision_backend` and `deploy_cloud_functions` (`packages/noodl-mcp/src/tools/provisionTools.ts:162`).
- **None of it reaches npm:**
  - The backend is `@noodl/nodegx-backend` with no `files` and no `publishConfig`. It depends on two workspace
    packages, `@noodl/backend-contract` and `@noodl/runtime`, plus `nodemailer`. It wasn't among OWN-011's six
    published packages, although OWN-011 §1 reading 2 lists its `bin`.
  - `provision_backend` finds it only as a monorepo sibling, or at `node_modules/nodegx-backend`
    (`packages/noodl-mcp/src/backend/provision.ts:104-113`), which is the **wrong name** even for an install. Otherwise
    it refuses with *"Build it … in packages/nodegx-backend"* (`provision.ts:462`).
  - **No MCP tool sets a function secret.** The `set_backend_*` tools write SMTP, S3 and OAuth credentials
    (`backendTools.ts:681, 1533, 1666`), and nothing writes the `functions` namespace.
- HTTP Request's authentication presets do send the credential now (P107-C7, fixed `684d881f2`, which is in the
  published build). That fix is for the browser path. It doesn't keep a key secret.
- @noodl on npm belongs to the original Noodl team (R8). This package publishes as `@nodegx/backend`.

## 3. The work

1. **Measure what leaves with it.** Bundle `@noodl/backend-contract` and `@noodl/runtime` into the backend's build
   (as the MCP and the preview bundle the editor's code), or publish them? List what each pulls in, and whether
   anything native or GPL-only comes with it (the licence follows R12–R14's reading).
2. **Publish `@nodegx/backend`**: a `files` list, a production build, the `bin` kept. `provision_backend` resolves it
   with `require.resolve` from its own location, `NODEGX_BACKEND_ENTRY` still overriding. Decide whether
   `@nodegx/mcp` depends on it or the refusal says `npm i @nodegx/backend`, and record which in this file.
3. **A tool that sets a function secret**, e.g. `set_function_secret {name, value}`, writing the `functions` namespace.
   It never echoes the value back, and doesn't leave it in the project folder or anything git would see. Reading the
   secret is the cloud node's job, not the agent's.
4. **The fixture: the language app.** A small Duolingo-style project (lessons from Static Data, a page per exercise,
   progress in a persisted Global Store). A cloud function takes `{text, voice}`, reads the key through the secret
   node, calls Google's `text:synthesize`, and returns `audioContent`. Playback is a node the agent writes with
   `create_node_kit` (shipped in `@nodegx/mcp@0.1.0`; there is no Audio node in the catalog). If the kit node meets a
   gap, that's a filed finding, not a workaround.

## 4. Acceptance criteria

- **AC1 — the stranger's view.** In an empty folder with `HOME` empty, from packed tarballs (then from the registry), a
  fresh agent is given one sentence. It runs `provision_backend`, sets the secret, deploys the function, and the app
  speaks a sentence in the preview.
- **AC2 — the key is never in the browser.** Search the preview's served files, the project folder and a capture of
  every request the page makes for the key's value: zero hits. **Control arm:** the same search on a build where the
  key was put in an HTTP Request node must find it, otherwise the search can't see the key and AC2 proves nothing.
- **AC3 — the refusals.** With no backend installed, `provision_backend` names the one command that adds it. With no
  secret set, the function's error says which secret is missing, not "401".
- **AC4 — the published version**, after asking Richard (R11). AC1 is re-run from the registry.

## 5. Not this task

- Hosting the backend somewhere other than the person's machine: OWN-016.
- A Worker or D1 backend: P115 HST-004 and HST-006, still parked.
- The admin dashboard: P104.
