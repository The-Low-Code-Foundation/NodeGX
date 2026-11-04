# Phase 115 — next session prompt

**Written 2026-11-04 at the end of session 1 (Opus 5.5).** Unparked by Richard the same day (BOARD lane 10:
*"Let's kick it off and lift the park. If this can go out with the Beta, it'd be a nice addition"*). A nice-to-have
for the Beta, never ahead of lanes 9, 2 and 3. The scoping session's prompt is in git history (`git log -- this file`).

## 1. Read first

1. [HST-004 §6](HST-004-A-WORKFLOW-ON-A-WORKER.md): what session 1 built and measured, the table of server-side nodes,
   and §6.6, the steps for session 2.
2. README §12: the session log and the estimate (narrow proof: 2 sessions; full stack: 7–8).
3. The two bugs: `node scripts/bugs.js --from P115`.

## 2. Built vs driven

| what | built | driven |
|---|---|---|
| `spike-worker/` Worker: the backend's WorkflowEngine, Secrets from bindings, cron from the project file, HTML export as static assets | ✅ | ✅ locally on workerd (`wrangler dev`), never deployed |
| `spike-worker/src/functions-probe.ts`: CloudRunner on workerd | ✅ | ✅ locally; a function with no code node works with a runner per request |
| `fixtures/b-newsletter/nodegx.automations.json` | ✅ hand-written, not MCP-written | ✅ |
| Deploy to Richard's Cloudflare account | — | — |

To run it again: `cd spike-worker && npm i`, write `.dev.vars` (`MAILCHIMP_KEY=…`, `ALLOW_PRIVATE_HTTP=1`), export a
front end into `public/` (`nodegx export --target html <copy> <abs path>/public`; mind the CLI's cwd, it resolves a
relative output against `packages/nodegx-export`), `node stand-in.mjs &`, `npx wrangler dev --test-scheduled`, then
`curl -X POST :8787/workflows/subscribe -d '{"email":"a@b.c"}'` and `curl ':8787/__scheduled?cron=0+8+*+*+*'`.
Tear down all three servers after (`lsof -nP -iTCP:8787 -iTCP:8788 -iTCP:8799 -sTCP:LISTEN` reads 0).

## 3. Next, in order (HST-004 §6.6)

1. **Richard's step:** `npx wrangler login` in `spike-worker/` (a browser page), then `npx wrangler secret put
   MAILCHIMP_KEY`. Ask him plainly; it is his account and his screen.
2. A public stand-in (a second small Worker that logs what arrives), the fixture's URLs pointed at it, `wrangler
   deploy`; tick HST-004 AC1 from the `*.workers.dev` URL; the page on his phone (HST-003 AC3).
3. A real project (MCP-written, HST-002's method) whose page form calls a cloud function `subscribe`; on the Worker,
   `/functions/<name>` through CloudRunner with a runner per request. A code node inside it needs printing first
   (HST-004 §6.4, last row): measure how far the exporter's Function-node printing goes for a cloud component.
4. After P132 BWF-012 is committed: the transport in `steps/http.ts` (P115-HST004-HTTPLOOKUP), and delete the shim.
   **Check `git status` and the file's mtime first**: on 2026-11-04 a peer had it open and uncommitted.

## 4. Rulings owed (ask in plain words, recommendation first)

- R1–R5 as in the README §8. R5 (first-load size) is mostly answered: the HTML export is 1.4 MB against ~14.9 MB.
- New: **one Worker or Pages plus a Worker?** Recommended: one Worker with static assets (one origin, no CORS, one
  deploy), measured in session 1. Ask once the deploy is on his account and he has seen the URL.
