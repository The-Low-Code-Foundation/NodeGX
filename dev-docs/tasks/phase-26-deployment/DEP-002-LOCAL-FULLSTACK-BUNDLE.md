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

- [x] A full-stack project deploys to a folder and runs with one command, with no Docker and no
      `npm install`. *(s2, `nodegx-deploy --full-stack`, driven; from the editor is s3)*
- [x] Records written through the running app survive a restart of the process. *(s1, driven through `--serve-app`)*
- [x] Client-side routing survives a browser refresh on a deep path. *(s1, driven and specced)*
- [x] Every backend route family is reachable with `--serve-app` active, asserted by a test that
      reads `getRouteTable()` rather than a hand-written list. *(s1)*
- [x] Path traversal is refused, with tests. *(s1)*
- [x] The admin credential and `/_admin` URL are printed on first run. *(already true of `serve`; read off s1's drive. The folder's `start.sh` must not hide it)*
- [x] The generated README is project-specific and states what needs configuring before it works. *(s2, `renderFullStackGuide`)*
- [ ] The Deploy popup shows three destinations; the two unbuilt ones name their task.
- [x] The backend bundle in the folder comes from the same packaging script as the Docker target. *(s2: `packageDeploy` packages it, with the scan and manifest)*

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


## Session 2 (2026-10-23, Opus 5.5): the folder

**Built (steps 3–5), on the headless engine first.** `nodegx-deploy <project> <out> --full-stack`
(`noodl-preview/src/fullStack.ts`). The engine is what `ship-to-vm.sh` already runs and what a
`deploy_to_vm` tool will run, so lane 5 gets the folder before the popup does. The editor's popup
(step 6) is s3 and calls the same pieces.

```
my-app/
  app/                         the client-side deploy (its nodegx-config.json kept; no second DEPLOY.md)
  backend/cli.js               the backend this installation ships
  backend/workflows/<p>.workflow.json   the project's cloud functions, built by the editor's builder
  backend/nodegx.security.json the project's access rules, when it has them
  start.js  start.sh  start.cmd the launcher (nodegx-backend deploy/folder/)
  MANIFEST.json                every file, with its checksum; layout "full-stack"
  DEPLOY.md  package.json      generated (renderFullStackGuide / renderFullStackPackageJson)
  data/                        made by the first start; never written by a deploy
```

- **One packaging path.** `package-deploy.js` gains `cliPath` (package the bundle the caller has),
  `backendFiles` (functions and rules under `backend/`), `fullStack` (the launcher) and
  `launcherDir`. So the folder gets the image's credential scan and manifest: a key pasted into a
  cloud function refuses the deploy, by file and pattern (OWN-016 AC3's finding, now a gate). The
  bundle in an npm install is still built by `noodl-mcp/build-backend-copy.mjs` with the backend's
  own esbuild config; that script now also ships `deploy/folder/` as `dist/backend/folder/`.
- **`start.js`** (Node, with thin `start.sh`/`start.cmd`): checks the Node by loading `node:sqlite`,
  not by a version table, and names 22.13 when it fails; picks the port by `serve.js`'s rule (asked
  for exactly, else the first loopback-free from 3000, never 8080); replaces the installed cloud
  functions in `data/workflows/` with the deploy's; runs the backend in-process with
  `--serve-app app --data-dir data --enforce-rules` (+ `--project-dir backend` when the rules ship,
  `--backend-name` from `package.json`). Other options pass through.
- **The port rule is a copy, not a require of `app/serve.js`.** The launcher ships with the backend;
  an app deployed by an older runtime (this checkout's `src/external` is from December) has no
  `serve.js` with that function, and a launcher that needs it fails for a reason that is not the
  backend's. A spec row holds the two refusals equal word for word (mutant caught).
- **A redeploy replaces `app/` and `backend/` wholesale and never names `data/`.** The folder must be
  empty or an earlier full-stack deploy (`MANIFEST.json` says so); anything else is refused as
  `target`, before a byte is written. A missing backend or launcher is `runtime`. Both are typed
  errors, not sentence matches.
- **Found on the way, fixed before commit:** preparing the second model for the cloud functions
  schedules the editor's one-second autosave, and its "Skipping auto-save" line reached stdout after
  the engine's JSON report (two lines; a parser failed). `deploy-cli.ts` now writes the report
  through the real stdout and leaves stdout on stderr afterwards. Never shipped, so no ledger row.

**Decisions (the task left these to this task):**
- **Permissions: no derived policy.** The folder starts with `--enforce-rules`: the project's own
  `nodegx.security.json` if it ships one (installed on the first start only, SB-015), else the
  enforced defaults (a visitor not signed in reads and saves nothing; a signed-in person sees their
  own records; anyone may sign up). DEPLOY.md leads with which of the two it is, before "Start it".
  Deriving `find: public` from the graph was rejected: a collection made public without the author
  saying so is the worse failure, and the project's rules file is where that is said.
- **`data/` at the top, not `backend/data/`.** A deploy replaces `backend/` wholesale; the data must
  not live inside anything a deploy replaces.
- **A project with no backend features still gets the full-stack layout** (one shape for the VM
  path); its DEPLOY.md says the backend only serves the pages and that the static deploy is the
  same app. This departs from "skip the backend entirely".
- **Full-stack + SSR: not supported.** `--full-stack` deploys the client-side runtime.
- **Sharp is not in the folder.** DEPLOY.md says resized images answer an error until
  `npm install sharp` in `backend/`; uploads and originals work. Read from Node's resolution and
  `storage/transform.ts`, not driven.

**Graded.**
- `nodegx-backend/tests/dep-002-full-stack-folder.test.ts`, 9 rows (a stand-in `cli.js` records the
  arguments it was started with): layout and manifest, the credential refusal in a function, no app
  refused; the arguments; rules only when shipped; port by flag and `PORT` with pass-through; a taken
  port refused in `serve.js`'s words; old functions replaced and `data/` otherwise untouched; the
  Node refusal under `--no-experimental-sqlite` with its control. **Five mutants, all caught**
  (no function removal, rules always, port flags passed through, no Node check, one word of the
  refusal changed).
- `noodl-preview/tests/dep-002-full-stack-deploy.test.ts`, 8 rows on the BUILT engine: members-area
  (8 functions by name, one bundle, rules beside the backend and not in the app, no second guide in
  `app/`), a redeploy over `data/` (byte-identical, same build id, a stale app file gone), the
  refusal, todo-list without rules, and the plain deploy unchanged. The one-line-report row caught
  the old stdout restore (mutant).
- `noodl-editor/tests-unit/deploy-guide.test.ts` +7 rows (19). Neighbours green: deploy-assets,
  dep-002-serve-app, deploy-credential-stability (38), exp017 + gam-023 (13), hls015 (24).

**Driven (step 7, from the engine; the editor is s3).** Backend and launcher built from today's
sources into scratch (`build-backend-copy.mjs --out`), deploy runtime by `OUT_PATH` webpack, engine
from today's sources. `templates/todo-list` copy, `--full-stack`, then `./start.sh` under `env -i`
(PATH and an empty HOME only): first free port 3000, the project's rules installed, the admin
credential's location printed; headless Chromium: 0 page errors, `GET /nodegx-config.json`,
**Create account** `POST /users 201`, a task `POST /classes/Task 201`, reload on `/todo-list` still
signed in. SIGTERM, `node start.js --port 3417`: the rules file kept, a fresh browser `POST /login
200` and the task read back (screenshot read). Redeploy over the running folder: the 8 files in
`data/` byte-identical, same build id, the app still 200. `node backend/cli.js backup --data-dir
data` while running: written via online backup. `templates/members-area`: 8 functions packaged and
loaded; `POST /functions/myStanding` 200 (`visitor`), `decideMembership` 403 by the project's rules.
Its four `starter-imagery` 404s are the template folder's (it never carries installed starter
assets), not this layer's.

**Next (s3).**
- `nodegx deploy --full-stack` at the front door (`nodegx-export`, its deploy manifest and `--force`
  rules: `app/` and `backend/` are replaced wholesale here, so its stale-file sweep is not needed
  under them).
- The popup (step 6): "Run it locally" calls the same pieces. The editor's renderer has no
  `package-deploy.js` or launcher on disk in a packaged app: they need `extraResources` beside
  `Resources/nodegx-backend/cli.js`.
- **Lane 5:** `ship-to-vm.sh` can ship this folder whole; `provision-app.sh`'s unit becomes
  `node start.js --port <p> --no-admin` (loopback, Caddy in front), the secrets file unchanged, and
  the no-domain case is served by the backend itself. Then `deploy_to_vm` in `@nodegx/mcp`
  (`dist/backend/folder/` already ships with this commit's prepack).

## Session 3 (2026-10-23, Opus 5.5): the folder goes to a VM

**Built.** OWN-016's two scripts (`dev-docs/tasks/phase-112-your-own-nodegx/own-016/`) ship the `--full-stack`
folder whole, in place of a site plus a loose `cli.js` from the `@nodegx/mcp` tarball.

- **`ship-to-vm.sh [--ssh-key f] [--ssh-port n] [--preview pkg|tgz] <project> <local-backend|-> <user@host> <app>
  <port> [domain]`.** `nodegx-deploy --full-stack` writes the folder (`NODEGX_DEPLOY_CMD` runs an engine that is not
  on npm yet). A cloud function the engine could not build refuses the ship by name: it would not be in the folder.
  The functions come from the project, not the local backend; only its `secrets.json` travels, over ssh stdin, and
  `-` means none. `--mcp-tgz` is gone (exit 2 with a sentence). With no domain, the last line is the `ssh -L` that
  shows the app.
- **`provision-app.sh`.** The folder → `/opt/<app>/` (rsync `--delete`, root-owned, read-only to the service under
  `ProtectSystem=strict`), the data → `/var/lib/<app>/data/`. The unit runs `<command -v node> /opt/<app>/start.js
  --port P --host 127.0.0.1 --data-dir /var/lib/<app>/data --backend-id <app> --no-admin`, so start.js installs the
  functions and, on the first start, the rules. Caddy proxies everything but `_admin|admin|executions|metrics` to the
  backend, which serves the app and answers `/nodegx-config.json` with the origin the browser used: the
  hand-written list of route families is gone. With no domain (`CADDY=off`) the backend serves the app on
  127.0.0.1. It checks for `/` 200 beside `/health`, prints start.js's and SB-015's lines from the journal, and
  removes `/srv/<app>` (the earlier layout's site) once no drop-in can point at it.
- **`start.js --data-dir <dir>`** (both forms, resolved from the cwd, stripped from what reaches the backend): the
  functions are installed there and no second `data/` appears in the folder.

**Found (two ledger rows).**
- 🔴 **P26-VMOPEN (high, open): the earlier VM layout ran public with every access rule off, and lingo.nodegx.io
  does now.** Its unit had no `--enforce-rules`, so the first start minted `devOpen: true`. BAK-003's interlock
  refuses dev-open only on a non-loopback bind, and the unit binds 127.0.0.1 behind Caddy. Measured: in the
  container, a visitor's `GET /classes/_User` returned the signed-up account's email. Live, lingo's `/health` says
  `devOpen: true, enforced: false` (0 accounts there; contents not read). A new layout's first start would mint
  `devOpen: false`, but a migrated box KEEPS its `security.json`, so `--enforce-rules` alone did not close it
  (measured: still 200 after the first migration). Now **`start.js` refuses a data folder with `devOpen: true`** in
  a sentence, and **`provision-app.sh` refuses before writing anything** and prints the one `sed … && systemctl
  restart` that closes it. lingo needs Richard to run that on its box (SSH that changes a server is classifier-refused).
- **P26-VMNODE (medium):** the unit named `/usr/bin/node`, so a box with Node in `/usr/local/bin` (the nodejs.org
  tarball) failed with 203/EXEC after the version check passed. The unit now uses `command -v node`.

**Graded.**
- `nodegx-backend/tests/dep-002-full-stack-folder.test.ts` 11 rows (+2): `--data-dir` in both forms (one
  `--data-dir` reaches the backend, the functions are installed there, no `data/` in the folder); the dev-open refusal
  with its control (rules on → starts), by default and by `--data-dir`. **Four mutants, all caught** (`--data-dir`
  passed through, functions into the default `data/`, the `=` form unread, no refusal call).
  `noodl-preview/tests/dep-002-full-stack-deploy.test.ts` 8/8.
- **Driven, against a throwaway VM:** an Ubuntu 24.04 container (systemd, sshd, Caddy 2.6.2, Node 22.13.1 in
  `/usr/local/bin`), ssh on 127.0.0.1:22722 and https on :8443, the scripts run as a person would. `members-area`
  with a domain (`shiptest.localhost`): 8 functions installed, the project's rules applied, a stand-in secret in the
  process environment, `nodegx-config.json` = `https://shiptest.localhost:8443`, a deep link 200, `/_admin`,
  `/admin/x`, `/metrics` 404, `myStanding` 200, `decideMembership` 403, sign-up 403 (the project turns it off),
  headless Chromium 0 page errors. `todo-list` with no domain, through the printed `ssh -L`: **Create account**
  `POST /users 201`, a task `POST /classes/Task 201`. A reship over the running app: `security.json`
  byte-identical, a fresh browser `POST /login 200` and the task still there. Migration: an app provisioned with the
  committed OLD script, an account signed up through its Caddy, then the new ship. After that ship (before the
  refusal existed) it was still dev-open, and the refusal was written. With the refusal: refused, nothing changed,
  the old app still 200. After the printed command and a ship: visitor 403 on `_User` and `Task`, the old account
  signs in, a signed-in read 200, `/health` `enforced: true`, `/srv/shipold` gone.

**Ruled (Richard, 2026-10-23, "Yep change em"): a reship brings the project's rules.** Built the same day, in
`start.js`, so it holds for every way the folder runs (laptop, VM, `deploy_to_vm`):
- The launcher records the checksum of the rules it installed (`data/deployed-rules.json`). A start whose
  `backend/nodegx.security.json` differs from that (or a box with rules and no record, like lingo or an s2 folder)
  moves `data/security.json` aside as `security.json.before-<time>` and passes `--project-dir`, so the BACKEND
  installs and validates the project's rules (`applyProjectPolicy`), as on a first start. Same checksum, or a plain
  restart: the backend's file is left alone and `--project-dir` is not passed (no SB-015 "never overwritten" notice
  every start). So an edit made on the server lasts until the project's rules change. A project with no rules file
  leaves the server's alone.
- The dev-open refusal reads the rules that WILL be enforced: the project's when this start installs them (a
  dev-open project file is refused, naming the project file), else the server's. A dev-open box whose ship brings
  rules is therefore fixed by the ship, not refused. A rules file that is not JSON is refused before anything moves.
- **`start.js --check --data-dir <dir>`** plans and refuses exactly as a start would, writing and starting nothing,
  and skips the port (the app it would replace holds it). `provision-app.sh` asks it before writing anything and
  prints its line; the bash dev-open snippet is gone (one decision, one place).
- The folder's DEPLOY.md says the same (`deploy-guide.ts`, both rules sections).

Graded: `dep-002-full-stack-folder.test.ts` 16 rows (+5: first start then a restart keeps an edit; a changed deploy
replaces with the previous file kept; a box with no record; a dev-open or non-JSON project file refused with the data
untouched; `--check`). **Five mutants, all caught** (no "unchanged", copy instead of move, apply before refuse,
`--project-dir` on every start, `--check` falling through). `deploy-guide.test.ts` 19/19, the engine's 8/8. Driven in
the container: `todo-list` first ship "installing"; reship "unchanged" with no SB-015 line; the project's `signup`
changed to `nobody` and reshipped: "replaced", sign-up 201 → 403, `security.json.before-…` holds `public`, an
existing account still signs in. An OLD-layout dev-open box: with project rules, replaced (visitor `_User` 403);
with none, refused before anything changed, the old app still active.

**Left for the next session.**
- `deploy_to_vm` in `@nodegx/mcp`: these two scripts are its spec, and the container is its test bed (Dockerfile
  in the session notes below).
- No-domain public access (`--host 0.0.0.0` on a bare IP) was not offered: the backend's `requiresAuth` applies to
  a non-loopback bind, and with no TLS the session tokens travel in clear text.

Throwaway VM, for the next session: `FROM ubuntu:24.04`; apt `systemd systemd-sysv openssh-server curl rsync
ca-certificates iproute2 xz-utils caddy`; Node from `nodejs.org/dist/v22.13.1/node-v22.13.1-linux-arm64.tar.xz` into
`/usr/local`; `/etc/caddy/Caddyfile` = `{ admin localhost:2019 }` + `import /etc/caddy/conf.d/*`; an ed25519 key in
`/root/.ssh/authorized_keys`; `systemctl enable ssh caddy`; `CMD /sbin/init`. Run with `--privileged
--cgroupns=host -v /sys/fs/cgroup:/sys/fs/cgroup:rw -p 127.0.0.1:22722:22 -p 127.0.0.1:8443:443`. Curl and Chromium
reach `<app>.localhost:8443` (`--resolve`, `--host-resolver-rules`, certificate errors ignored: Caddy's local CA).
