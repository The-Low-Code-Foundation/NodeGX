# OWN-015 — The backend from npm: a cloud function that keeps the key

**Opened 2026-10-12** from R18 (see OWN-014's header). **Model:** **Fable** for §3 step 1 (what the backend drags in
when it leaves the monorepo, and the secret's shape across the MCP, the backend and the cloud node). **Opus** for the
packaging, the stranger's runs and the publish.

**Status: 🟡 s13 (2026-10-12): the mechanism is built and graded from a packed tarball (§6): provision, secret, deploy, call, and AC2's search with its control, AC3's two refusals. Owed: AC1's stranger agent and the page that speaks (audio in the preview); AC2's capture of the page's own requests; AC4 publish.**

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

## 6. Session 13 (2026-10-12, Opus): built, and graded from a tarball

**Step 1, measured.** No design question was left for Fable:
- The backend already builds into **one self-contained file**, `nodegx-backend/dist/cli.js` (4.6 MB, its
  `scripts/build.js`: *"copy this file and run it"*). The packaged editor ships exactly that file.
- At runtime it requires Node built-ins and `node:sqlite` only, with `sharp`, `pg-native` and `better-sqlite3` as
  guarded optional requires.
- Everything it inlines is MIT (`noodl-runtime`, `noodl-viewer-cloud`, `nodegx-backend-contract`). It declares
  `engines.node >=22.13.0`.

**Step 2, decided: it ships inside `@nodegx/mcp`**, not as a dependency.
- `build-backend-copy.mjs` (prepack, `--remove` at postpack) bundles it with the backend's own exported esbuild config
  to `dist/backend/cli.js`. It writes there, never over the `dist/` a running editor or peer uses.
- `provision.ts` probes `dist/backend/cli.js`, and its refusal names the npm case. The old "installed copy" candidate
  names `node_modules/nodegx-backend`, a package that has never existed.
- Why not a dependency: no workspace is called `@nodegx/backend`, so declaring one would send the monorepo's own
  install to the registry. A standalone package for a server is OWN-016's question.
- The tarball grows to 6.8 MB packed.

**Step 3: two tools in the deferred backend group.** `set_function_secret {name, value}` (write-gated) and
`list_function_secrets` (names only), both over CWF-009's existing `PUT/GET /admin/secrets`. The value is never
echoed. The resident surface is unchanged at 8,279 of 8,280, measured with and without them.

**Found and fixed: P112-S13-CLOUDDEPLOY (high).** `deploy_cloud_functions` failed on every npm install, with
*"[@noodl/platform] Cannot find package.json"*. The installed NodeGX 0.3.0's bundler fails the same way from any
folder that isn't an npm package (measured). This is C68's defect, and the fix is C68's: a `package.json` beside the
bundle, shipped by npm and by the editor's `extraResources`. New spec `own015CloudBundleCwd`, 3/3 with its control.
ISL-042's spec runs with `cwd: PKG`, which is why it never saw this.

**The fixture and the run.** `node scripts/own/stranger-backend.mjs <tgz>` runs in an empty folder, with `HOME`
empty and `NODEGX_*` removed, the MCP over stdio. Google is a local stand-in that returns audio **only** for the right
key in `x-goog-api-key`.
- `create_project` "Lingo" with `backend: nodegx` → `find_tools` → `provision_backend` (from `dist/backend/cli.js`).
- `create_component #__cloud__/speak` is Request(text, voice) → Secret `GOOGLE_TTS_KEY` → Function (`fetch`
  text:synthesize, MP3) → Response `audioContent`, with failures to a second Response. It reported 0 errors, then
  `deploy_cloud_functions` deployed it.
- **AC3:** `POST /functions/speak` before the secret is set → **400**, *"Secret: "GOOGLE_TTS_KEY" is not provisioned
  on this machine. Add it under the "functions" section of …/secrets.json, or set NODEGX_SECRET_GOOGLE_TTS_KEY"*, with
  no call to the API. With no backend at all, the registry's `@nodegx/mcp@0.1.0` refuses `provision_backend` and has no
  `set_function_secret` (control arm).
- `set_function_secret` → `list_function_secrets` shows the name and not the value → `POST /functions/speak` →
  **200**, the audio decodes to the sentence, and the stand-in saw the right key.
- **AC2 (files and results):** the key's value appears in **0** of the project's 18 files and in **0** tool results or
  HTTP answers the agent saw. It is in **1** file, the backend's own `secrets.json` under `~/.noodl/backends/<id>/`.
  **Control:** the same key in an HTTP Request node in a page is found by the same search
  (`components/Control/KeyInThePage/nodes.json`).
- The fixture differs from what ships only in its endpoint constant (the real one is `FIXTURE_ENDPOINT` in the script).

**Found: P112-S13-SECRETPATH (low, open, a question for the fix).** That AC3 message carries the server's
`secrets.json` path. The fixture routed the Secret node's `Error` into the public Response, the obvious wiring, so
anyone calling the function learns the home directory and backend id. No value leaks.

**Owed.**
- **AC1's stranger.** A fresh agent with one sentence builds this itself, plus the page: a button wired to a Cloud
  Function call and playback through a `create_node_kit` node. The app must speak in the preview. Driving a real Claude
  Code in an empty folder is the honest form.
- **AC2's last third.** A capture of every request the page makes in the preview.
- **AC4.** Publish, after asking Richard (R11), in a worktree at the pushed commit.
- **A real Google key** for the video. The stand-in proves the path, not Google.

