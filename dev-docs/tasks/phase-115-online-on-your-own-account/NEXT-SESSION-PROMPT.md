# Phase 115 — next session prompt

**Written 2026-11-04 at the end of session 3 (Opus 5.5).** Unparked by Richard 2026-11-04 (BOARD lane 10: *"Let's kick
it off and lift the park. If this can go out with the Beta, it'd be a nice addition"*). A nice-to-have for the Beta,
never ahead of lanes 9, 2 and 3. Earlier prompts are in git history (`git log -- this file`).

## 1. Read first

1. [HST-004 §8](HST-004-A-WORKFLOW-ON-A-WORKER.md): session 3, the deploy on Richard's account and the transport fix.
2. §7 for session 2 (§7.5, the deploy commands), §6 for session 1.
3. README §12: the session log and the estimate.
4. The bugs: `node scripts/bugs.js --from P115` (WARMRUNNER, **BUNDLEDROPS high**, RULEFIVE low; HTTPLOOKUP fixed `ef3f7388a`).

## 2. Built vs driven

| what | built | driven |
|---|---|---|
| Fixture B as an MCP-written NodeGX project + `MUST.md` | ✅ | ✅ rendered (render_report) |
| `hst-spike-worker` on https://hst-spike-worker.richard-digitalbricks.workers.dev (page, `/functions/*`, `/workflows/*`, cron) | ✅ deployed | ✅ page 200; the function refuses cleanly with no secret; ⏳ with the secret |
| `hst-stand-in` on https://hst-stand-in.richard-digitalbricks.workers.dev | ✅ deployed | ✅ answers; ⏳ its log of a real call |
| Call an API's transport (`steps/httpTransport.ts`), the shim deleted | ✅ `ef3f7388a` | ✅ wrangler dev before/after control; jest 27/27 |
| `MAILCHIMP_KEY` on the Worker | — | ❌ the classifier refuses a session's `wrangler secret put` (*Secret-Store Writes*), even with Richard's OK in chat |
| The page in a real browser | — | ❌ never (Chrome hangs in the sandbox): Richard's phone is the reading |

## 3. Next, in order

1. **Check whether the secret is set:** `npx wrangler secret list` in `spike-worker/` (lists names only). If it is not,
   print this for Richard **in the reply text, not in a multiple-choice question** (he asked for that), to paste into
   VS Code's terminal (Terminal → New Terminal):
   `cd ~/vscode_projects/OpenNoodl/dev-docs/tasks/phase-115-online-on-your-own-account/spike-worker && grep '^MAILCHIMP_KEY=' .dev.vars | cut -d= -f2- | tr -d '\n' | npx wrangler secret put MAILCHIMP_KEY`
   Or, if he says so, a permission rule for `npx wrangler secret put` in `.claude/settings.local.json`.
2. With the secret: `npx wrangler tail hst-stand-in -c wrangler.stand-in.toml --format json` in the background,
   `POST /functions/subscribe {"email":…}` and `POST /workflows/subscribe`, then read: **the 1042 question** (did
   `global_fetch_strictly_public` let the Worker reach the stand-in?), the logged fingerprint against
   `node fingerprint.mjs`, the email in the body. No redeploy is needed for a secret. Then the page on Richard's phone
   (MUST lines 1–5, HST-003 AC3) and, after 08:00 UTC on 2026-11-05, line 6 (the cron's call in the stand-in's log).
3. Then ask the one-Worker ruling (§4) with the URL in front of him.
4. BUNDLEDROPS (high) belongs to the cloud-deploy owner, not this phase, but it blocks every MCP-written cloud function
   that wires an HTTP Request's body or auth. Before anyone fixes it: measure the editor's own Deploy button with a
   viewer running, and a browser export with the same wiring (the bug file says how).
5. Then HST-006 (records on D1) is the next real unknown for full stack.

## 4. Rulings owed (ask in plain words, recommendation first)

- R1–R5 as in the README §8. R5 (first-load size) is mostly answered: the HTML export is 1.4 MB against ~14.9 MB.
- **One Worker or Pages plus a Worker?** Recommended: one Worker with static assets (one address, one deploy, no
  cross-site setup). Ask once the deploy has answered from his phone.
