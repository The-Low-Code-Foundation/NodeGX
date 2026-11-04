# Phase 115 — next session prompt

**Written 2026-11-04 at the end of session 4 (Opus 5.5).** Unparked by Richard 2026-11-04 (BOARD lane 10: *"Let's kick
it off and lift the park. If this can go out with the Beta, it'd be a nice addition"*). A nice-to-have for the Beta,
never ahead of lanes 9, 2 and 3. Earlier prompts are in git history (`git log -- this file`).

## 1. Read first

1. [HST-004 §9](HST-004-A-WORKFLOW-ON-A-WORKER.md): session 4, where a call's CPU goes and the warm-up at startup.
2. §8 for session 3 (the deploy on Richard's account), §7 for session 2 (§7.5, the deploy commands), §6 for session 1.
3. README §12: the session log and the estimate.
4. The bugs: `node scripts/bugs.js --from P115` (**BUNDLEDROPS high**, RULEFIVE low; HTTPLOOKUP, BLANKREQUIRED, WARMRUNNER fixed).

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
   A digest run BY HAND reached it at 15:12:59 UTC on 11-04 (session 4's check of the cron path): the reading is the
   one after 08:00 UTC on 11-05, not that one.
3. ✅ R6 ruled 2026-11-04: **one Worker**. ✅ CPU measured (HST-004 §9): Cloudflare itself costs 0–1 ms; calls over
   10 ms are a cold isolate's first calls; warm ones are 1–9 ms. The Worker now warms its runner at STARTUP (live,
   `dcd1c3ef`, `x-warmed-at-startup: yes`), halving the worst call (33 → 17–18). 337 calls, 52 over 10 ms, every one
   answered (0 `exceededCpu`). Carry the warm-up into the deploy target (HST-003). Not worth more profiling unless a
   1102 is ever seen; the left-over (a fresh isolate's real fetch path, ~1 call in 5 for its first ~20) cannot be
   pre-paid with a stubbed fetch.
3b. ✅ Refusal alerts built (HST-004 §10): the page reports a 1102/1027, the Worker emails once a day. ⏳ The email
   itself waits on Richard (§10.4): a Resend key from his terminal (`wrangler secret put RESEND_API_KEY` + `ALERT_TO`),
   or a domain on Cloudflare. Then drive one real refusal (a probe that burns ~4 s of CPU, §10.1) and read his inbox.
   The real Free cut-off measured is ~2 s of CPU per call, so §9's 10–35 ms spikes are far from it.
4. BUNDLEDROPS (high) belongs to the cloud-deploy owner, not this phase, but it blocks every MCP-written cloud function
   that wires an HTTP Request's body or auth. Before anyone fixes it: measure the editor's own Deploy button with a
   viewer running, and a browser export with the same wiring (the bug file says how).
5. Then HST-006 (records on D1) is the next real unknown for full stack.

## 4. Rulings owed (ask in plain words, recommendation first)

- R1–R5 as in the README §8. R5 (first-load size) is mostly answered: the HTML export is 1.4 MB against ~14.9 MB.
- R6 (one Worker) ruled 2026-11-04.
