# HST-004 — A workflow on a Worker, no VM

**Opened 2026-10-07.** **Depends on HST-002, P107 (server-side nodes).** **Status: 📋 not started.** Kind: experiment.

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
