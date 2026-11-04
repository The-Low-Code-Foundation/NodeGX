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
| `MAILCHIMP_KEY` on the Worker | ✅ Richard, from his terminal | ✅ his Subscribe reached the stand-in with the key (fingerprint matched) |
| The page in a real browser | — | ❌ never (Chrome hangs in the sandbox): Richard's phone is the reading |

## 3. Next, in order

1. ✅ The secret is set and Richard's Subscribe reached the stand-in with the email and the key (HST-004 §8.5; 1042
   answered). MUST 1–5 ✅: his phone, and the empty field says the email is required (after BLANKREQUIRED,
   `21bb85fc3`).
2. After 08:00 UTC on 2026-11-05: MUST line 6. `npx wrangler tail hst-stand-in -c wrangler.stand-in.toml` only sees live
   events, so read the dashboard (Workers & Pages → hst-stand-in → Logs, observability is on) for the digest call.
3. Then ask the one-Worker ruling (§4) with the URL in front of him.
4. BUNDLEDROPS (high) belongs to the cloud-deploy owner, not this phase, but it blocks every MCP-written cloud function
   that wires an HTTP Request's body or auth. Before anyone fixes it: measure the editor's own Deploy button with a
   viewer running, and a browser export with the same wiring (the bug file says how).
5. Then HST-006 (records on D1) is the next real unknown for full stack.

## 4. Rulings owed (ask in plain words, recommendation first)

- R1–R5 as in the README §8. R5 (first-load size) is mostly answered: the HTML export is 1.4 MB against ~14.9 MB.
- **One Worker or Pages plus a Worker?** Recommended: one Worker with static assets (one address, one deploy, no
  cross-site setup). Ask once the deploy has answered from his phone.
