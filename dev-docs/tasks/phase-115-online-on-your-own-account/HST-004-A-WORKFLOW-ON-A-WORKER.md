# HST-004 — A workflow on a Worker, no VM

**Opened 2026-10-07.** **Depends on HST-002, P107 (server-side nodes).** **Status: 🟡 live on Richard's account 2026-11-04 (session 3, §8): his own Subscribe reached the stand-in with the email and the key. AC1 still owes MUST lines 1 and 4 (his phone) and line 6 (the cron, 2026-11-05 08:00 UTC).** Kind: experiment.

## 1. The person sentence

> **A site with a secret in it, a daily job, and a webhook in, and no server anyone has to look after. The secret
> stays on Cloudflare, the front end calls a URL, and the bill is zero until the site is busy.**

## 2. Why

Richard's expectation (README §3): most vibe-coded sites are shape B, and this is the elegant case. It is also the
case nothing in the repo has ever run: the backend is a Node process (README §1 reading 4), and a Worker is not one.

## 3. What to measure

1. **Which nodes can run on a Worker.** From P107's specs, the server-side ones: HTTP Request (whose auth presets
   have never sent a credential, P107 row C7, so this is where that gets found again), the workflow steps (P19/P27),
   the scheduler. Each either runs on the Workers runtime against its spec, or the row says why not (no `fs`, no
   long-lived process, no Node `crypto`).
2. **How the graph reaches the Worker.** A workflow component emitted as a Worker script by the export pipeline
   (`nodegx-export` has `runTasksLib`, `sseLib`, `scriptLib`), or the interpreter itself inside a Worker. Try the
   cheaper one first and write down why.
3. **How the secret stays server-side.** A Worker secret, set by the connector from the token store, never in the
   graph. Grade it the way DEP-004 grades: a search over the deploy folder finds no secret.
4. **The schedule and the webhook.** A cron trigger and a route, both from the graph.

## 4. Acceptance criteria

1. Fixture B's `MUST.md` is ticked from a `*.workers.dev` URL with no VM anywhere: the hook arrives at the stand-in
   with the secret, the job ran on day 2, the browser never saw the secret.
2. A table of server-side nodes: runs on Workers against its spec / does not, with the reason.
3. The cost on day 30, read from the Cloudflare console, in this file.

## 5. Not this task

Records (HST-006). A product: this is a spike, and R3 decides what becomes one. Netlify Functions or anything else.

## 6. Session 1 — 2026-11-04 (Opus 5.5): the backend's own engine on workerd, locally

**Unparked by Richard the same day** (*"Let's kick it off and lift the park. If this can go out with the Beta, it'd be a
nice addition"*). Everything ran under `wrangler dev` 4.157 (workerd, the runtime a deployed Worker uses), with no
Cloudflare account: the deploy and the console readings are session 2's, on his.

**What was built** (all in `spike-worker/`, its build output and secrets gitignored):

| file | what |
|---|---|
| `../fixtures/b-newsletter/nodegx.automations.json` | Fixture B's server half: `subscribe` (validate the email → Call an API with a Bearer secret `MAILCHIMP_KEY` → return) and `daily-digest` on a schedule trigger at 08:00. Hand-written against the value language's own spec (`body.email`, `trigger.firedAt`, `previous.status`), **not** written by the MCP as HST-002 asks: the stand-in's address is a literal 127.0.0.1 |
| `src/worker.ts` | The Worker: `WorkflowEngine`, `CompositeStepExecutor` and `buildRunPayload` imported from `packages/nodegx-backend/src` unchanged; the project's automations file bundled at deploy; `_noodl_get_secret` read from the Worker's secret bindings; a run-history stub (`createLogger()` may answer null); `POST /workflows/<id>`; the Worker's cron fires the project's schedule triggers |
| `src/http-over-fetch.ts` | Node's `http.request` over `fetch`, swapped in at bundle time (`[alias]`) so the API step's own code runs (why: §6.2). **Deleted in session 3**: the step is given a transport (§8.3) |
| `src/functions-probe.ts`, `wrangler.functions.toml` | The cloud-function interpreter (`CloudRunner`) on workerd, two functions |
| `stand-in.mjs` | A stand-in Mailchimp on :8799 that logs the path, the Authorization header and the body |

### 6.1 Measured

| # | reading | result |
|---|---|---|
| 1 | The engine and every step executor bundle for workerd | ✅ 175 KiB, 47.5 KiB gzipped (the free tier allows 3 MB). No interpreter, no nodemailer in the bundle |
| 2 | `subscribe` with an email | ✅ `success`, `{"subscribed":true,"status":200}`; the stand-in logged `POST /3.0/lists/readers/members`, `Bearer <key>`, `{"email_address":"ada@example.com","status":"subscribed"}` |
| 3 | `subscribe` without one | ✅ `error` at `check`: *The form arrived without an email.* (the step's own sentence) |
| 4 | The Worker's cron `0 8 * * *` | ✅ fired `trg_digest_daily` from the project file; the digest call arrived with the key |
| 5 | The secret in the response, the bundle, every committable file | ✅ 0, 0, 0 (`grep` for the key) |
| 6 | Control: the same runs before the shim | ❌ both failed at the API step: *The options.lookup option is not implemented* (§6.2) |
| 7 | The cloud-function interpreter bundles | ✅ 2.28 MB, 499 KB gzipped: under the free tier's 3 MB |
| 8 | A function with no code node (Request → Response) | ✅ with a fresh `CloudRunner` per request, every time (6–7 ms); ❌ a warm runner refuses its second request (§6.3) |
| 9 | A function with an Expression node (`1 + 2`) | ❌ answers `0` with status 200; the node reports `expression/compile-failed: Code generation from strings disallowed for this context` (§6.4) |
| 10 | The front end from the same Worker (static assets): todo-list's HTML export, unbound | ✅ 198 files reached from `/`, 776 KB, every module `text/javascript`, none failing; the workflow door still answers beside it. **Not opened in a browser** (Chrome hangs in this sandbox): the phone reading is session 2's |

### 6.2 The API step and the address guard

`steps/http.ts` sends through Node's `http.request` with a `lookup` of its own, so a workflow on a VM cannot be
pointed at `127.0.0.1/admin`. workerd implements the client but not `lookup`. On a deployed Worker the guard is the
platform's (a Worker cannot connect to a private address) and `checkLiteralHost` still runs. The product fix is a
transport the step is given; filed as **P115-HST004-HTTPLOOKUP** and deferred because P132 BWF-012 had `http.ts` open
and uncommitted (edited 10:59, measured 11:09).

### 6.3 A warm cloud runner

Filed as **P115-HST004-WARMRUNNER**. A runner per request works and costs about 7 ms, so it does not block the spike.

### 6.4 The table of server-side nodes (AC2, first rows)

| node or step | on a Worker | why |
|---|---|---|
| workflow engine, validate, return, transform, branch, switch, the value language, formulas | ✅ runs as is | no eval anywhere (`conditions.ts` was written to avoid one) |
| Call an API (`http-request`) | ✅ through `fetch` | §6.2 |
| schedule trigger | ✅ a Worker cron | the cron list in `wrangler.toml` is written from the project file |
| webhook trigger | not run | signed (HMAC or token), so it is the door for a service, not for a browser |
| create / find / update / delete record | not run | needs a store: HST-006 (D1) |
| Send an email | not run | `nodemailer` cannot run on a Worker: an HTTP mail API, or Cloudflare's own |
| a cloud function graph, no code node | ✅ with a runner per request | §6.3 |
| Expression, Function, Script inside a cloud function | ❌ silently a default | Workers refuse `new Function`. The way through is the exporter's: it already prints a page's Function nodes as `.js` files (`functions/` in the HTML export), so a cloud function can be printed the same way before deploy |

### 6.5 What this changes for the phase

- **A browser reaches the server through a cloud function** (`/functions/<name>`, the client's only door), so shape B's
  real path is page → cloud function → (workflow). §6.4's last row is therefore the critical one, not a footnote.
- **One Worker, not Pages plus a Worker.** Cloudflare's static assets put the HTML export and the server doors on one
  origin and one deploy: no CORS, one `wrangler deploy`. HST-003's Pages target becomes the same command.
- **R5 is mostly answered by P134:** the HTML export is 1.4 MB in 208 files against the interpreter folder's ~14.9 MB.

### 6.6 Session 2

1. Richard runs `npx wrangler login` once (a browser page on his screen), then `wrangler secret put MAILCHIMP_KEY`.
2. Replace the stand-in with a public one (a second Worker that logs), deploy, and tick AC1 from a `*.workers.dev` URL;
   open the page on his phone (HST-003 AC3).
3. A cloud function `subscribe` built by the MCP in a real project (HST-002's method), printed or interpreted, called
   from the exported page's form.
4. After BWF-012 lands: the transport in `http.ts` (P115-HST004-HTTPLOOKUP), and the shim deleted.


## 7. Session 2 — 2026-11-04 (Opus 5.5): a real project's page and cloud function on the same Worker, ready to deploy

Wrangler was not logged in (`wrangler whoami`: *You are not authenticated*), so §6.6 step 1 is still Richard's, and
everything below was built for that deploy and measured locally under `wrangler dev` 4.157 (workerd). Session 1's files
were committed first (`5693c836f`); they had been left uncommitted.

### 7.1 What was built

| file | what |
|---|---|
| `fixtures/b-newsletter/` | **Fixture B as a NodeGX project the MCP wrote** (HST-002's method): `create_project`, then `create_component` / `update_component`, 0 errors. One page (an email field, Subscribe, a line for each outcome) whose Cloud Function node calls `subscribe`; the cloud function `subscribe` is Request (`email`, required, string) → Secret `MAILCHIMP_KEY` → HTTP Request (POST, JSON body, Bearer) → Response, and a failure Response on each path that can fail. **No code node**, so §6.4's last row does not bite. `MUST.md` is the online list (6 lines). The automations file from session 1 sits beside it, unchanged |
| `spike-worker/build.mjs` | Builds the cloud functions with the editor's own bundler (`packages/noodl-mcp/dist/cloud-bundle.cjs`, the one Deploy and `deploy_cloud_functions` run) into `dist-local/`, or with `https://<host>` into `dist-deploy/` with the automations, every `127.0.0.1:8799` aimed at the public stand-in. Carries the BUNDLEDROPS shim (§7.3) |
| `spike-worker/export-page.mjs` | The page as plain HTML into `public/`, from a copy, with the two deploy-time edits of §7.4 |
| `src/worker.ts` | A third door, `POST /functions/<name>`: the bundle into a fresh `CloudRunner` per request (WARMRUNNER), the body and headers handed on as `HttpServer.runFunction` does, the Response node's status and body sent back unchanged; a contract refusal is a 400 and a timeout a 504, as `WorkflowRunner` answers them |
| `src/stand-in-worker.ts`, `wrangler.stand-in.toml` | The public stand-in Mailchimp: a second Worker that answers 200 and logs method, path, body and a **fingerprint** of the Authorization header (length + 12 hex of SHA-256), never the header. `fingerprint.mjs` prints the expected one from `.dev.vars` |
| `wrangler.toml` | `global_fetch_strictly_public` (a Worker fetching another Worker on the same account is refused with error 1042 without it, [Cloudflare's errors page](https://developers.cloudflare.com/workers/observability/errors/); not yet measured on a deploy), `[observability]` on, `/functions/*` runs the Worker first |
| `package.json` | `deploy:stand-in`, and `deploy` with `--alias` for both bundled files (measured: the alias wins over the tsconfig path, 2 public addresses and 0 local ones in the dry-run bundle) |

### 7.2 Measured (local, workerd)

| # | reading | result |
|---|---|---|
| 1 | The Worker with the engine, the cloud runtime and the page | ✅ 2.46 MB, 547 KB gzipped (free tier: 3 MB); the stand-in Worker 1.3 KB |
| 2 | The project's cloud bundle | ✅ built by the editor's bundler, `failures: []`, 2.5 KB; ❌ **2 of its 10 wires missing** (§7.3) |
| 3 | `POST /functions/subscribe` `{"email":"ada@example.com"}`, before the shim | ⚠️ `200 {"result":{"subscribed":true,"status":200}}`, but the stand-in got `{"status":"subscribed"}`: **no email, no Authorization**, 4 calls of 4 |
| 4 | The same, with the shim | ✅ 200; the stand-in got `{"email_address":"ada@example.com","status":"subscribed"}` and the Bearer key (fingerprint `len 37`, matching); a second call through the same Worker answers too (fresh runner each time) |
| 5 | `{}` | ✅ 400 `function/bad-request`, *"email" is required*, field named; nothing reached the stand-in |
| 6 | The key in any answer, in `public/` | ✅ 0, 0 |
| 7 | The page's own files from the Worker | ✅ 11 modules 200 `text/javascript`; `/` serves `index.html`. **Not opened in a browser** (Chrome hangs in this sandbox): the phone is the reading, on the deploy |
| 8 | The cron `0 8 * * *` beside the new door | ✅ the digest call arrived with the key |

### 7.3 The bundler drops the wires that carry the secret (P115-HST004-BUNDLEDROPS, high)

On disk, `components/__cloud__/subscribe/connections.json` has 10 wires; the bundle has 8. The two lost are the only
two into the HTTP Request's runtime-made ports: `pm-email → body-email_address` and `value → auth-authToken`. A wire
into a Response node's runtime-made port survives. The function then calls the API without the email or the key and
still answers success. Likely cause, read and not measured: `exportComponent` drops a wire `getConnectionHealth`
calls an error, and `net.noodl.HTTP` has no editor-side port adapter (Request and Response have
`CloudDynamicPortsAdapter`), so a process with no viewer never has its `body-*` / `auth-*` ports. This is not
Cloudflare's: the same bundle is what a NodeGX backend is sent. **Not measured: the editor's Deploy button with a
viewer running, and a browser export with the same wiring.** The spike's `build.mjs` restores the lost wires from the
project's own file and prints which.

### 7.4 How a page reaches its own Worker (for the deploy target, HST-003)

- The exporter prints a real client only when the project declares a backend (`metadata.cloudservices` with an
  endpoint and an app id). Without one, every Cloud Function node is a stub that fails *"No cloud services defined in
  this project."*, as the interpreter does. A page on a Worker has no backend address to declare, so the deploy has to
  supply one.
- `env.js` overrides the endpoint, and an **empty** endpoint is what "this origin" needs: `'/'` would make
  `${ENDPOINT}/functions/x` into `//functions/x`, a protocol-relative URL to a host named `functions`. So a Cloudflare
  target writes `VITE_NODEGX_ENDPOINT: ''`; that is what `export-page.mjs` does, on a copy, without touching the project.

### 7.5 The deploy, in order (§6.6 steps 1–2, ready to run)

```
cd dev-docs/tasks/phase-115-online-on-your-own-account/spike-worker
npx wrangler login                       # Richard: a browser page on his screen
npm run deploy:stand-in                  # → https://hst-stand-in.<subdomain>.workers.dev
node build.mjs https://hst-stand-in.<subdomain>.workers.dev
node export-page.mjs
npx wrangler secret put MAILCHIMP_KEY    # Richard types a key (any text: the stand-in only fingerprints it)
npm run deploy                           # → https://hst-spike-worker.<subdomain>.workers.dev
```

Then: Subscribe from his phone (MUST lines 1–5), read the stand-in's log in the dashboard (Workers & Pages →
hst-stand-in → Logs) or `npx wrangler tail hst-stand-in`, compare the fingerprint, and read it again on day 2 after
08:00 UTC (MUST line 6). The secret is set before the deploy that reads it, but the Worker must exist first:
if `secret put` asks to create it, say yes.

## 8. Session 3 — 2026-11-04 (Opus 5.5): on Richard's account, and the API step's transport

Richard had run `wrangler login` (account *Richard.digitalbricks@gmail.com's Account*, OAuth, `workers (write)`).

### 8.1 Deployed

| Worker | address | what |
|---|---|---|
| `hst-stand-in` | https://hst-stand-in.richard-digitalbricks.workers.dev | 1.33 KiB. Answers `{"id":"member-1","status":"subscribed"}` (one probe `GET /ping` from this session is in its log) |
| `hst-spike-worker` | https://hst-spike-worker.richard-digitalbricks.workers.dev | 2.46 MB / 547.5 KB gzipped, 76 assets (the page), cron `0 8 * * *`. Redeployed after §8.2, version `110b52ab` |

`build.mjs` with the stand-in's address restored the same 2 wires BUNDLEDROPS drops, and aimed both files at it.

### 8.2 Measured, before the secret

| # | reading | result |
|---|---|---|
| 1 | `GET /` | ✅ 200 `text/html`; `env.js` has the empty endpoint |
| 2 | `POST /functions/subscribe` with an email | ✅ 400 *The newsletter is not set up yet: its MAILCHIMP_KEY secret is missing.*: the function's own failure Response, nothing sent |
| 3 | `POST /functions/subscribe` `{}` | ✅ 400 `function/bad-request`, `email` named |
| 4 | `POST /workflows/daily-digest` | ✅ 500, step `send`: *there is no Secret called "MAILCHIMP_KEY"*, before any fetch |
| 5 | The stand-in key (`.dev.vars`, 30 chars) in `public/`, `dist-deploy/`, `src/`, `../fixtures/` | ✅ 0 files |
| 6 | **The 1042 question** | ⏳ not measurable yet: every path stops at the missing secret before it fetches |

### 8.3 P115-HST004-HTTPLOOKUP fixed (`ef3f7388a`)

`steps/httpTransport.ts`: `nodeHttpTransport` (the default; `lookup` is the guard) and `fetchHttpTransport`
(`redirect: 'manual'`). The step keeps the redirect loop, the key dropped across origins and `checkLiteralHost`
before every hop; `CompositeStepExecutorDeps.httpTransport` is how a host chooses. The Worker passes the fetch one; the
`[alias]` and the shim are gone. Session 1's control (§6.1 row 6) on `wrangler dev`, the local stand-in: **without a
transport** the step still fails with *The options.lookup option is not implemented*; **with `fetchHttpTransport`**,
`success`, and the stand-in got the email and `Bearer <the .dev.vars key>` (compared in full, true twice). Jest:
`tests/p115-hst004-http-transport.test.ts` runs both transports through `CompositeStepExecutor` (JSON, body, same- and
cross-origin redirect, the cap, a literal private address refused before the transport is asked, with a control) and
BWF-006's suite beside it, 27/27.

### 8.4 What is left for AC1

The classifier refuses this session's `wrangler secret put` (*Secret-Store Writes*) even with Richard's OK in the chat;
only a permission rule or Richard's own terminal gets past it (§8.3's fix needs no secret, so it went first). In `spike-worker/`, the command that reuses the
`.dev.vars` stand-in key, so `node fingerprint.mjs` matches the stand-in's log exactly:

```
grep '^MAILCHIMP_KEY=' .dev.vars | cut -d= -f2- | tr -d '\n' | npx wrangler secret put MAILCHIMP_KEY
```

Then, no redeploy needed (a secret is live on the next request): `POST /functions/subscribe`, `npx wrangler tail
hst-stand-in` (or the dashboard's Logs), the fingerprint against `node fingerprint.mjs`, the page on his phone (MUST
1–5), and line 6 after 08:00 UTC on 2026-11-05.

### 8.5 With the secret (Richard set it from his terminal)

| # | reading | result |
|---|---|---|
| 1 | Richard's Subscribe on the deployed page | ✅ *You are on the list* (his reading) |
| 2 | The stand-in's log (`wrangler tail`, 12:57:49 UTC) | ✅ `POST /3.0/lists/readers/members`, from `cf-worker: richard-digitalbricks.workers.dev`, 200; body `{"email_address":"<his>","status":"subscribed"}`; Authorization fingerprint `len 37 sha256 41c045a1f9ec` = `node fingerprint.mjs` |
| 3 | **The 1042 question** | ✅ answered: with `global_fetch_strictly_public` a Worker reaches another Worker on the same account |
| 4 | The key in `/`, `env.js`, `app.js`, the 400 and the 200 answers (curl, one probe call `probe-s3@example.com` is in the stand-in's log) | ✅ 0 each |

MUST: lines 2, 3, 5 ticked. Line 1 (a phone) and line 4 (the empty field's sentence on the page) are his next reading;
line 6 after 08:00 UTC on 2026-11-05.
