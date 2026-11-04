# Phase 115 — next session prompt

**Written 2026-11-04 at the end of session 2 (Opus 5.5).** Unparked by Richard 2026-11-04 (BOARD lane 10: *"Let's kick
it off and lift the park. If this can go out with the Beta, it'd be a nice addition"*). A nice-to-have for the Beta,
never ahead of lanes 9, 2 and 3. Earlier prompts are in git history (`git log -- this file`).

## 1. Read first

1. [HST-004 §7](HST-004-A-WORKFLOW-ON-A-WORKER.md): session 2, and **§7.5, the deploy in six commands**.
2. §6 for session 1 (the engine on workerd, the table of server-side nodes).
3. README §12: the session log and the estimate.
4. The bugs: `node scripts/bugs.js --from P115` (HTTPLOOKUP, WARMRUNNER, **BUNDLEDROPS high**, RULEFIVE low).

## 2. Built vs driven

| what | built | driven |
|---|---|---|
| Fixture B as an MCP-written NodeGX project (page + cloud function `subscribe`, no code node) + `MUST.md` | ✅ | ✅ rendered (render_report, phone and desktop) |
| Worker: workflows, cron, `/functions/<name>` through CloudRunner, the HTML export as static assets | ✅ | ✅ locally on workerd, the email and the key reach the stand-in |
| Public stand-in Worker (logs a fingerprint of the key, never the key) | ✅ | dry-run only |
| `build.mjs` / `export-page.mjs` / `npm run deploy` with both aliases | ✅ | ✅ dry-run: 3 public addresses, 0 local |
| The page in a real browser | — | ❌ never (Chrome hangs in the sandbox): the phone on the deploy is the reading |
| Deploy to Richard's Cloudflare account | — | — |

## 3. Next, in order

1. **Richard's step:** `npx wrangler login` in `spike-worker/` (a browser page on his screen). Ask him plainly; it is
   his account. `npx wrangler whoami` says whether it is done.
2. HST-004 §7.5 in order: deploy the stand-in, `node build.mjs https://<its url>`, `node export-page.mjs`, Richard runs
   `npx wrangler secret put MAILCHIMP_KEY` (any text), `npm run deploy`. Measure: the 1042 question (did
   `global_fetch_strictly_public` let the Worker reach the stand-in?), the stand-in's log against
   `node fingerprint.mjs` (do this with HIS key in `.dev.vars`, or compare by length only), the key absent from every
   public file. Then the page on his phone (MUST lines 1–5, HST-003 AC3) and, on day 2 after 08:00 UTC, line 6.
3. Then ask the one-Worker ruling (§4) with the URL in front of him.
4. BUNDLEDROPS (high) belongs to the cloud-deploy owner, not this phase, but it blocks every MCP-written cloud function
   that wires an HTTP Request's body or auth. Before anyone fixes it: measure the editor's own Deploy button with a
   viewer running, and a browser export with the same wiring (the bug file says how).
5. After P132 BWF-012 is committed: the transport in `steps/http.ts` (P115-HST004-HTTPLOOKUP), and delete the
   `http-over-fetch.ts` shim. **Check `git status` and the file's mtime first.**
6. Then HST-006 (records on D1) is the next real unknown for full stack.

## 4. Rulings owed (ask in plain words, recommendation first)

- R1–R5 as in the README §8. R5 (first-load size) is mostly answered: the HTML export is 1.4 MB against ~14.9 MB.
- **One Worker or Pages plus a Worker?** Recommended: one Worker with static assets (one address, one deploy, no
  cross-site setup). Ask once the deploy is on his account and he has seen the URL.
