# DEP-002: Local Full-Stack Bundle — One Process, No Docker

## Metadata

| Field | Value |
|-------|-------|
| **ID** | DEP-002 |
| **Phase** | Phase 26 — Deployment (Track K) |
| **Tier** | 2 — local & static |
| **Priority** | 🔴 Critical (the largest honest gap in the product today) |
| **Difficulty** | 🟡 Medium |
| **Estimated Time** | 1–1.5 weeks |
| **Prerequisites** | DEP-001 |
| **Branch** | commit directly to `cline-dev` |
| **Recommended executor** | 🔵 **Opus 5** — the code is straightforward; what to put in the folder, and what the person opening it should find, is the hard part |

## Objective

Make "Deploy → to a folder" produce a **complete, runnable application** — frontend and backend — that
starts with one command on a machine with nothing installed but Node, and that mirrors the
single-origin shape production uses.

## Background

Today `DeployToFolderTab` writes the frontend and stops. If the project uses record nodes, cloud
functions, users, files, or workflows, the folder is half an app pointed at whatever backend the
editor happened to be connected to — usually a dynamic port on the developer's laptop. There is no
message saying so.

Phase 5's TASK-007F ("bundle the backend with the exported app") is where this was meant to be
solved. It was never started, and Phase 5 is parked.

**It is much cheaper now than it was then.** WF-004 made `nodegx-backend` build to a *single esbuild
bundle* (`dist/cli.js`, ~690KB) that embeds the `@noodl/runtime` adapter stack and the
`noodl-viewer-cloud` CloudRunner, and runs on plain Node — that is precisely how the editor spawns
it (`process.execPath` + `ELECTRON_RUN_AS_NODE=1`). The database is `node:sqlite`, built into Node 22+.
So a full-stack local deployment is: the bundle, a data directory, the exported app, and a script.

### Why one process rather than a docker-compose file

WF-003's production design is one origin — nginx serves the app and proxies 18 backend route families,
and the backend publishes no port. That design exists because of the frozen-endpoint problem DEP-001
just fixed, but it is *also* simply the right shape: one URL, no CORS, no second port to explain.

Reproducing that locally with Docker means the user installs Docker. Reproducing it with one Node
process means adding static file serving to `nodegx-backend` — which it does not currently have. Its
only served page is the self-contained `/_admin` dashboard document
([`AdminDashboardRoutes.ts`](../../../packages/nodegx-backend/src/admin/AdminDashboardRoutes.ts)), not
a file server.

That is the trade: ~150 lines of static serving in the backend, against a Docker dependency for
every user who wants to run their own app locally. Take the 150 lines.

## Current State

| File | What it does |
|---|---|
| `views/DeployPopup/DeployPopup.tsx:26` | A single-tab `Tabs` — "Self Hosting" |
| `views/DeployPopup/tabs/DeployToFolderTab/DeployToFolderTab.tsx` | Folder picker, CSR/SSR/SSG select, `compilation.deployToFolder()` |
| `packages/nodegx-backend/src/cli.ts` | The CLI entry — flags for port, data dir, security |
| `packages/nodegx-backend/src/admin/AdminDashboardRoutes.ts` | Serves one self-contained page; **no general static serving anywhere in the package** |
| `packages/nodegx-backend/deploy/nginx.conf` | The authoritative list of backend route families to proxy |
| `packages/nodegx-backend/tests/deploy-assets.test.ts` | Starts a real service and reads `getRouteTable()` — **the pattern to reuse** |
| `packages/nodegx-backend/scripts/package-deploy.js` | Produces the packaged artifact + content-digest build id |

## Desired State

### 1. `nodegx-backend` can serve a static app

A new `--serve-app <dir>` flag. Behaviour:

- Serve files from the directory, with correct MIME types and sensible caching (hashed assets
  immutable, `index.html` and `nodegx-config.json` `no-store`).
- **SPA fallback**: an unmatched path that does not look like a file returns `index.html`, so client
  routing works on refresh.
- **API routes always win.** The static handler mounts *last* and must not shadow any backend route
  family. This is the same drift risk `nginx.conf` has, and it gets the same answer: a test that
  reads the live `getRouteTable()` and asserts every family is still reachable with `--serve-app`
  active. Do not hand-write the list.
- Path traversal is refused. A test with `../../etc/passwd` and its encoded variants.
- `/_admin` continues to work and is not shadowed by an app route.

### 2. The deploy writes a runnable folder

```
my-app/
  app/                     the exported frontend (today's output)
  backend/
    cli.js                 the packaged bundle
    data/                  created on first run — SQLite lives here
  nodegx-config.json       DEP-001's override, pointing at the local origin
  start.sh / start.cmd     node backend/cli.js --serve-app ./app --port 8080 …
  DEPLOY.md                generated, project-specific (exists since 2026-10-22 — extend it; see PROGRESS D21)
```

The README is generated, not templated boilerplate: it names the project, states the Node version
required, gives the one command, says where the data lives, says how to change the port, and — if the
project uses auth, files, email or workflows — says which of those need configuration before they
work. A project with no backend features at all should say so and skip the backend entirely.

### 3. First-run tells the user their admin credential

WF-003 found the hard way that the first-run credential message is load-bearing: without it, BAK-005's
dashboard is unusable in the deployment it was built for. On first start the folder's backend must
print the admin credential and the `/_admin` URL, prominently.

The second WF-003 finding applies too: **anonymous reads are 403 by default** under BAK-003, so a
freshly started app renders its shell and no data until collection permissions are set. The generated
README must lead with this, because otherwise the first experience of the feature is a blank page.
Consider having the deploy write a starting permissions policy derived from the project's own data
nodes — if the app only reads a collection, `find: public` on that collection is a defensible default
and dramatically improves first-run. **If you do that, say so in the README in plain words**; a
silently-public collection is worse than a blank page.

### 4. The Deploy popup gains its real structure

This task owns the popup's information architecture, because it is the first with more than one
destination. Three destinations:

| Destination | Owner | State after this task |
|---|---|---|
| **Run it locally** | DEP-002 | Built |
| **Publish to a host** | DEP-003 | Placeholder, disabled, named |
| **Deploy to a server** | DEP-004/005 | Placeholder, disabled, named |

Placeholders name what is coming rather than hiding it — an empty tab that says "Netlify and
Cloudflare Pages, DEP-003" is more honest than a tab that is not there. Follow phase 23/25 tokens and
`BasePanel`/`PanelHeader` conventions; do not roll new chrome.

The existing CSR/SSR/SSG select stays, and gains the fourth option this task adds. Note that SSR
already runs a Node server — the local full-stack option and SSR overlap and the UI must not present
them as unrelated. Decide and record which combinations are supported; "full-stack + SSR" is a real
combination (one Node process doing both) and may be more work than it is worth in this task.

## Implementation Steps

1. **Assess first**: run the existing SSR deploy and read `static/ssr`'s server. If it already has a
   static-serving implementation worth reusing, reuse it rather than writing a second one.
2. Static serving in `nodegx-backend` behind `--serve-app`, with the route-table test.
3. Packaging: teach the editor's deploy pass to copy the packaged backend bundle. It must come from
   the same `scripts/package-deploy.js` artifact the Docker target uses — **one packaging path**, not
   a second one that can drift.
4. The folder layout, `start.sh`/`start.cmd`, and the generated README.
5. First-run credential surfacing and the permissions decision.
6. Deploy popup IA.
7. **Run the output.** Deploy a real project with record nodes, cloud functions and a login, from the
   running editor. Open the folder in a fresh shell, run the one command, load the app in a browser,
   sign in, write a record, restart the process, confirm the record survived. Screenshot it.

## Success Criteria

- [ ] A full-stack project deploys to a folder and runs with one command, with no Docker and no
      `npm install`.
- [x] Records written through the running app survive a restart of the process. *(s1, driven through `--serve-app`)*
- [x] Client-side routing survives a browser refresh on a deep path. *(s1, driven and specced)*
- [x] Every backend route family is reachable with `--serve-app` active, asserted by a test that
      reads `getRouteTable()` rather than a hand-written list. *(s1)*
- [x] Path traversal is refused, with tests. *(s1)*
- [x] The admin credential and `/_admin` URL are printed on first run. *(already true of `serve`; read off s1's drive. The folder's `start.sh` must not hide it)*
- [ ] The generated README is project-specific and states what needs configuring before it works.
- [ ] The Deploy popup shows three destinations; the two unbuilt ones name their task.
- [ ] The backend bundle in the folder comes from the same packaging script as the Docker target.

## Out of Scope

- Process management (systemd, pm2, auto-restart). The README may mention it; the task does not build
  it.
- HTTPS locally. It is `http://localhost`.
- Bundling Node itself. The README states the required version and checks it at startup with a clear
  message.
- Windows service installation.

## Traps

- **Port 8080 is the editor's webpack dev server** (WF-003 hit this). Do not default to it, or pick
  it and detect the collision with a clear message.
- **`node:sqlite` requires a recent Node.** The editor gets it from bundled Electron; a user's system
  Node may be older. Check the version at startup and fail with the required version, not a stack
  trace about a missing built-in module.
- **The backend must not be started with `devOpen: true` on a non-loopback bind** — BAK-003's
  interlock refuses, and WF-003 found that an unprovisioned first run refuses *itself*. The local
  folder binds loopback by default, so this is fine, but the moment someone passes `--host 0.0.0.0`
  it applies. `entrypoint.sh` already solved this for Docker; read how before re-solving it.
- **Do not create a second packaging path.** `scripts/package-deploy.js` owns the artifact, its
  content digest, the credential scan and the baked-endpoint audit. A hand-rolled copy in the editor
  bypasses all four.
- **`deployToFolder` is fire-and-forget** in the current tab (there is a literal `NOTE: Fire-n-forget`
  comment). A multi-step deploy needs real completion and error reporting; do not inherit that shape.

## Session 1 (2026-10-23, Opus 5.5): the backend serves the app

**Assessed first (step 1).** `static/deploy/serve.js`, which DEP-001 put in every client-side deploy,
already had a static handler worth reusing: MIME types, the traversal and dot-file refusals, the SPA
fallback (a path with no extension is `index.html`). So the backend does not get a second one:
`src/server/static-app.ts` requires that file by relative path and esbuild inlines it into
`dist/cli.js` (checked in a scratch bundle). One handler, so a deploy folder served by `serve.js` and
the same folder served by the backend refuse the same paths.

**Built (step 2): `--serve-app <dir>`.**
- `HttpServer.handle` asks the app only when **no route matched**, for `GET`/`HEAD`, and never when
  the path's first segment is a route family. The families are the first segments of the live route
  table (`HttpServer.appFamilies`), so a mistyped `/classes/…` keeps its JSON 404 and a family added
  later is reserved the day it lands. `POST` to an unknown path stays a 404.
- `/nodegx-config.json` is answered per request: the folder's file, with `cloudservices.endpoint` set
  to the origin the browser used (`Host`; `https` when `X-Forwarded-Proto` says a proxy terminated
  TLS). One folder works at `localhost`, on a bare IP and behind Caddy. **Not `''`**: the runtime
  reads an empty endpoint as no backend (PROGRESS D26).
- A folder that is not a folder, or has no `index.html`, is refused at the top of `start()`, before
  the database opens, naming the folder. A page that never reads `nodegx-config.json` (a deploy older
  than DEP-001) gets a warning at start.
- Found on the way: **P26-SERVENUL** (`dev-docs/bugs/`), one `%00` request stopped `serve.js`. Fixed in
  the shared handler, so both consumers have the fix.

**Graded.** `nodegx-backend/tests/dep-002-serve-app.test.ts`, 13 rows: two live services, one with
the app and one without; every route in `getRouteTable()` answers the same status on both and never
with the app's page; family misses keep the JSON 404; `/_admin` is still the dashboard; the page, its
files, a deep path, a missing file; the config's origin, plain and proxied; five hostile paths, with
the backend still answering `/health` after each; the two refusals. **Two mutants, both caught:**
dropping the family guard fails the family row; serving the app before the route match fails the
route walk with 15+ named routes and the dashboard row. `noodl-viewer-react/tests/dep-002-serve-hostile-paths.test.js`,
9 rows, red on the old `serve.js` (the NUL row; measured on a scratch copy), green on the new.

**Driven (step 7, partly).** The deploy runtime (`OUT_PATH=<scratch>` webpack) and the deploy engine
built from today's sources, the engine run from scratch so the checkout's `src/external` (built before
DEP-001) was not used. `templates/todo-list` deployed (`nodegx-config.json` = `{}`: no baked backend),
then `node cli.js serve --serve-app <deploy> --project-dir <copy>` on :3417, headless Chromium:
- the sign-in page from `/`, 0 page errors; the app's first backend request is `GET /nodegx-config.json`;
- **Create account** → `POST /users 201`; a task typed and Entered → `POST /classes/Task 201`;
- reload on `/todo-list` → 200, still signed in, the task shown;
- SIGTERM ("stopped cleanly"), started again on the same data dir; a fresh browser signs in
  (`POST /login 200`) and the task is in the list (screenshot read). Its text was never typed in
  that browser.

Not driven here: cloud functions and files through `--serve-app` (no fixture function in the todo
list); a `--host 0.0.0.0` start.

**Next (s2): the folder.** Steps 3–5: `package-deploy.js` makes the backend artifact the deploy
copies (one packaging path); the layout (`app/`, `backend/cli.js`, `start.sh`/`start.cmd`, Node
version check, not port 8080); DEPLOY.md extended for the full-stack mode, leading with the 403
default; and the permissions decision. The project's `nodegx.security.json` is excluded from the app
folder today (correctly: it is not the app's), so the full-stack folder has to carry it beside the
backend and pass it as `--project-dir`, or the first start mints the default rules. Then the popup
(step 6). **Lane 5's `deploy_to_vm` builds on this:** one process behind Caddy, which also makes the
no-domain case reachable (`ship-to-vm.sh` with no domain leaves the site unserved).

