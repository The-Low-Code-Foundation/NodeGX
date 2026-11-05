# Phase 115 — next session prompt

**Written 2026-11-05 at the end of session 7 (Opus 5.5).** Unparked by Richard 2026-11-04 (BOARD lane 10: *"Let's kick
it off and lift the park. If this can go out with the Beta, it'd be a nice addition"*). A nice-to-have for the Beta,
never ahead of lanes 9, 2 and 3. Earlier prompts are in git history (`git log -- this file`).

## 1. Read first

00. [HST-006 §8](HST-006-THE-CONTRACT-ON-D1.md): session 7. Fixture C written through the MCP, and online on
   `hst-backend-spike`: the interpreter site with the production viewer beside the whole service, seam 3 made real.
0. [HST-006 §0 and §7](HST-006-THE-CONTRACT-ON-D1.md): session 6. The WHOLE backend service in one Durable Object,
   nine of its own HTTP suites run against it unchanged (67/76 live, 76/76 Node), the four seams, what a sign-in costs.
1. [HST-006 §6](HST-006-THE-CONTRACT-ON-D1.md): session 5. The record store in a Durable Object (99/102 on
   Cloudflare), what a create costs on Free, the exit round trip, and the capability table with its ⏳ rows.
1b. [HST-004 §9](HST-004-A-WORKFLOW-ON-A-WORKER.md): session 4, where a call's CPU goes and the warm-up at startup.
2. §8 for session 3 (the deploy on Richard's account), §7 for session 2 (§7.5, the deploy commands), §6 for session 1.
3. README §12: the session log and the estimate.
4. The bugs: `node scripts/bugs.js --from P115` (**BUNDLEDROPS high**; s7: **EXPORTDATAPATH** medium (the HTML export's, not this phase's), VIEWERTS2554 fixed; **LOOPBACK high**, **NOCODEGEN high** (s6); HST006 NOROLLBACKCASE medium, EXPRDEPTH and ALTERPERCREATE low; RULEFIVE low; HTTPLOOKUP, BLANKREQUIRED, WARMRUNNER fixed).

## 2. Built vs driven

| what | built | driven |
|---|---|---|
| Fixture B as an MCP-written NodeGX project + `MUST.md` | ✅ | ✅ rendered (render_report) |
| `hst-spike-worker` on https://hst-spike-worker.richard-digitalbricks.workers.dev (page, `/functions/*`, `/workflows/*`, cron) | ✅ deployed | ✅ page 200; the function refuses cleanly with no secret; ⏳ with the secret |
| `hst-stand-in` on https://hst-stand-in.richard-digitalbricks.workers.dev | ✅ deployed | ✅ answers; ⏳ its log of a real call |
| Call an API's transport (`steps/httpTransport.ts`), the shim deleted | ✅ `ef3f7388a` | ✅ wrangler dev before/after control; jest 27/27 |
| `MAILCHIMP_KEY` on the Worker | ✅ Richard, from his terminal | ✅ his Subscribe reached the stand-in with the key (fingerprint matched) |
| `hst-records-spike` (HST-006: `/__conformance`, `/__ops`, `/__exit`, all behind `?key=`, key in `spike-records/.run-key`, gitignored) | ✅ deployed | ✅ 99/102 ×3; ops costs; exit SAME (control DIFFERENT) |
| `hst-backend-spike` (HST-006 §7: the whole `BackendService` in a Durable Object; doors `/__hst/*` behind `?key=`, key in `spike-backend/.run-key`, gitignored) | ✅ deployed, service STOPPED (answers 503 until a boot) | ✅ 9 suites 67/76 live = local; CPU per call from the tail |
| Fixture C (`fixtures/c-campus`, MCP-written through `fixtures/mcp-calls.mjs`) + `MUST.md` (8 lines) | ✅ `d3e252055` | ✅ five phone drives (drive_page) on the local backend |
| Campus on `hst-backend-spike` (`site.mjs`, `seed-campus.mjs`, `check-campus.mjs`; production viewer; data dir in the object's storage) | ✅ deployed `a0c7bb47`, seeded | ✅ every rule over HTTP live; restarts from storage across 2 redeploys; ⏳ Richard's phone (MUST 1–7), the owner's list left EMPTY for his tap |
| The page in a real browser | — | ❌ never (Chrome hangs in the sandbox): Richard's phone is the reading |

## 3. Next, in order

1. ✅ The secret is set and Richard's Subscribe reached the stand-in with the email and the key (HST-004 §8.5; 1042
   answered). MUST 1–5 ✅: his phone, and the empty field says the email is required (after BLANKREQUIRED,
   `21bb85fc3`).
2. ✅ (Richard, 2026-11-05: "Done it all") After 08:00 UTC on 2026-11-05: MUST line 6. `npx wrangler tail hst-stand-in -c wrangler.stand-in.toml` only sees live
   events, so read the dashboard (Workers & Pages → hst-stand-in → Logs, observability is on) for the digest call.
   A digest run BY HAND reached it at 15:12:59 UTC on 11-04 (session 4's check of the cron path): the reading is the
   one after 08:00 UTC on 11-05, not that one.
3. ✅ R6 ruled 2026-11-04: **one Worker**. ✅ CPU measured (HST-004 §9): Cloudflare itself costs 0–1 ms; calls over
   10 ms are a cold isolate's first calls; warm ones are 1–9 ms. The Worker now warms its runner at STARTUP (live,
   `dcd1c3ef`, `x-warmed-at-startup: yes`), halving the worst call (33 → 17–18). 337 calls, 52 over 10 ms, every one
   answered (0 `exceededCpu`). Carry the warm-up into the deploy target (HST-003). Not worth more profiling unless a
   1102 is ever seen; the left-over (a fresh isolate's real fetch path, ~1 call in 5 for its first ~20) cannot be
   pre-paid with a stubbed fetch.
3b. ✅ Refusal alerts built and SENT (HST-004 §10.5): a real 1102 → the page's sentence → report → Resend emailed
   Richard's Gmail (17:11 UTC 11-04; Resend without a domain only sends to the sign-up address). `ALERT_TO` lives in
   the working copy only (public repo): keep it there when deploying. ✅ It arrived, but Gmail filed it under All Mail only (not Inbox, not Spam): the shared test sender is not trusted. The product should aim for the builder's own domain as sender.
   The real Free cut-off measured is ~2 s of CPU per call, so §9's 10–35 ms spikes are far from it.
4. BUNDLEDROPS (high) belongs to the cloud-deploy owner, not this phase, but it blocks every MCP-written cloud function
   that wires an HTTP Request's body or auth. Before anyone fixes it: measure the editor's own Deploy button with a
   viewer running, and a browser export with the same wiring (the bug file says how).
5. ✅ HST-006 records (s5) and ✅ users and sign-in (s6: the whole service runs in the object; §7). **Next, in order:**
   ✅ (b) **Fixture C** (s7, HST-006 §8): written, driven, live. Richard ticked 1–4 and 6, 7 read after a redeploy.
   **Line 5 failed** (the owner's row stayed on screen for the next account: STALEROWS, fixed in the runtime and live
   `34f862a8`, §8.6): **his re-read of line 5 is owed first** (sign in as owner, sign out, sign in as someone: no
   name). The rest of this item is how it was handed to him:
   (Ada's link, *Count me in*, a made-up id, `/owner` as the owner and as the second account, signed out; the
   passwords are in `fixtures/c-campus/.accounts.json`, give them to him from there, never in a commit). Then line 7:
   redeploy (`wrangler deploy` in `spike-backend`, NOT `seed-campus.mjs`, which wipes) and his answer must still be on
   the owner's list. 🔴 The backend's suites boot FRESH on this Worker and wipe Campus: re-seed after them.
   (c) Files on R2 through `S3Driver` (needs R2 enabled on Richard's account: ask first, it may want a card). (d)
   Realtime over the object's WebSockets (the service's own `RealtimeHub` is already in the object: try its socket
   through `httpServerHandler` first). (e) The two suites not run (`auth-linking`, `bmg-004-users`) need a remote
   mailer fake in `remote/BackendService.js`. Fixture C should be graded on `hst-backend-spike` (the whole service),
   not on `hst-records-spike`: its cloud functions then need LOOPBACK's seam, and must not use a code node (NOCODEGEN). 🔴 Don't run `/__conformance` on the live Worker for fun: each run reads
   ~752,000 rows, 15% of the Free day.

## 4. Rulings owed (ask in plain words, recommendation first)

- R1–R5 as in the README §8. R5 (first-load size) is mostly answered: the HTML export is 1.4 MB against ~14.9 MB.
- R6 (one Worker) ruled 2026-11-04.
- R2 (files on R2): ask with (c) — it may want a card on his account. MUST line 8 waits on it.
- R3: recommendation updated in HST-006 §0 after s6 (no adapter: the whole service in a Durable Object, plus two
  product changes and code nodes printed at deploy). Users/sign-in are measured now, so R3 can be asked; ask it once
  Fixture C is ticked, so the ruling is about a real app.
