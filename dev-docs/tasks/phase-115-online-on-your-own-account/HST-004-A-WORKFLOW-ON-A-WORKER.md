# HST-004 — A workflow on a Worker, no VM

**Opened 2026-10-07.** **Depends on HST-002, P107 (server-side nodes).** **Status: 🟡 session 1 done 2026-11-04 (local, on workerd); the deploy on Richard's account is next.** Kind: experiment.

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
| `src/http-over-fetch.ts` | Node's `http.request` over `fetch`, swapped in at bundle time (`[alias]`) so the API step's own code runs (why: §6.2) |
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

