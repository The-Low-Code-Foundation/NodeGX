# Phase 115 — next session prompt

**Written 2026-11-07 at the end of session 14 (Opus 5.5).** Unparked by Richard 2026-11-04 (BOARD lane 10), a
nice-to-have for the Beta, never ahead of lanes 9, 2 and 3. Earlier prompts are in git history:
`git log -- dev-docs/tasks/phase-115-online-on-your-own-account/NEXT-SESSION-PROMPT.md`.

## 0. What Richard ruled at the end of session 14, and the order

**Ruled 2026-11-07: finish P115 and close it, THEN scope a new phase "Online from Claude Desktop".** P115's "finished"
is R7's (the Cloudflare work plus a domain). The domain is bought. What is left of P115 is short and mostly live.
Session 15 does §1–§3 in order, then §4 if the session has room; otherwise §4 is session 16.

🔴 The auto-mode classifier refuses EVERY live deploy to a session ("Production Deploy": s13, s14 twice). Anything
that runs `deploy.mjs` against `hst-campus` is Richard's terminal: write him the command, then read the result.
Read-only calls (`check-campus-deploy.mjs` without `--seed`, `domain.mjs check`, `GET` on the API) are the session's.

## 1. Richard's steps (ask for his alert address FIRST: never guess it, never use one from context)

1. **The email setup for `my-hearth.org`** (HST-017's sender). Ask Richard which address the alerts go to (his
   Cloudflare login is a Gmail address; his work address is another). Then the session may try, else he runs:
   `NODEGX_WRANGLER=$PWD/dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/node_modules/wrangler/bin/wrangler.js node packages/nodegx-backend/cloudflare/domain.mjs email my-hearth.org --to <his address>`
   It runs `wrangler email sending enable my-hearth.org` and `wrangler email routing addresses create <address>`
   (wrangler's login HAS `email_sending:write` / `email_routing:write`, measured). He clicks the link Cloudflare emails
   him. Untested live: the first real run is the reading (record what each wrangler command printed).
2. **Campus on the domain, with the alert** (his terminal), from the repo root:
   ```
   NODEGX_WRANGLER=$PWD/dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/node_modules/wrangler/bin/wrangler.js \
     node packages/nodegx-backend/cloudflare/deploy.mjs dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/c-campus \
     --name hst-campus --viewer ~/.nodegx/cloudflare-viewer \
     --domain campus.my-hearth.org --alert-to <his address> --alert-from alerts@my-hearth.org
   ```
   Expect *"And at https://campus.my-hearth.org once Cloudflare has made its certificate"* and *"A test email went to
   <address>"*. Ask him which folder the test email landed in (HST-004 §10.5: Resend's went to Gmail's All Mail).
   If it says NOT sent: read the error code (`E_SENDER_NOT_VERIFIED`: onboarding not finished, wait 5–15 min;
   `E_RECIPIENT_NOT_ALLOWED`: his address not verified yet) and run the same command again.
3. **His phone:** `https://campus.my-hearth.org/home?id=6f468bbd-4091-48c8-90a1-9232f4753a90` (Ada's link, MUST 1) and
   *Count me in* (MUST 2). Passwords: `fixtures/c-campus/.accounts.json` (gitignored; never in a commit or a reply).

## 2. The session's own readings

1. After step 2: `node dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus`
   (workers.dev address; must stay 14/14, nothing re-seeded), then at `https://campus.my-hearth.org`:
   `/nodegx-config.json`'s endpoint must be the domain; `/home?id=…` 200; `/classes/Answer` signed out 403.
   Record in HST-007 §9 and HST-017 §4.
2. **HST-016 live, one night.** The alarm code is live since Richard's 12:24 UTC redeploy, so this can start before
   step 2. On Campus's backend, a workflow `tick` (one `return` step) and a schedule trigger `*/15 * * * *` aimed at
   it, through `POST /admin/workflow-defs` and `POST /admin/triggers` with the admin token from
   `~/.nodegx/cloudflare/hst-campus/deployment.json` (if the classifier refuses a live write, Richard adds them on
   `https://hst-campus.richard-digitalbricks.workers.dev/_admin`). Next morning: `fireCount` against the quarter hours
   since, `lastFiredAt` within seconds of a quarter. Every fire after a quiet stretch is an eviction survived. Then
   delete both. Record in HST-016 §4.

## 3. Close P115

1. Move HST-000, 001, 003, 005, 008, 009 and the rest of HST-007 (other registrars, the human steps per run) to a
   parked phase with README §7's ACs 3–6, the way earlier phases were parked (`dev-docs/parked/`: read its README for
   the shape). 🔴 `dev-docs/parked/README.md` carried a PEER's staged AND unstaged edits on 2026-11-07 (`MM`): add only
   your own hunk, through a temporary index (memory `commit-your-delta-through-a-temporary-index.md`), never
   `git add` the file whole.
2. README: the status line (done), §12 the session row, the final estimate. BOARD lane 10: P115 done, one line
   (`BOARD.md` has a peer's unstaged edits too: the same temporary-index commit session 14 used).
3. Memory: `phase-115-own-account.md` → closed, and the MEMORY.md index line (net-neutral length).
4. Left open on purpose, named in the README: BUNDLEDROPS (high, the cloud-deploy owner's), EXPORTDATAPATH (the HTML
   export's), the Worker's own 100,000 requests a day with `run_worker_first = true` (how many per page view: not
   counted), `nodegx deploy --cloudflare` / MCP tools (now the new phase's).

## 4. Scope the new phase "Online from Claude Desktop" (Richard ruled 2026-11-07)

The person sentence: *in Claude Desktop, "let's get it online with Cloudflare" → a Cloudflare page opens, they click
Allow, say yes to a price, and get a link: no terminal, no key, no `.env`.* Read [HST-018 §5–§7](HST-018-CLAUDE-FINDS-AND-BUYS-THE-DOMAIN.md)
first: it holds every reading this rests on (Desktop has no URL-mode elicitation; the NodeGX connector can open the
browser itself, `openInBrowser`; Cloudflare lets an app register its OWN OAuth client, PKCE, no secret, public after a
TXT record on the client URL's domain; the `.mcpb` has Node but NO npm, so no `npx wrangler` / `npm i -g cf` from Desktop).

- Take the next free phase number (135 on 2026-11-07: check `ls dev-docs/tasks` and the BOARD; a peer may have
  taken it). Write its README in the house shape (person sentences, measured-before-scoping, tasks, ACs, rulings to
  ask) and put it on the BOARD as lane 10's successor, never ahead of lanes 9, 2, 3.
- **Its first task is the four measurements** (HST-018 §7), on a PRIVATE OAuth client on Richard's account (private =
  no domain verification; creating it is a dashboard step or an API call with an "OAuth Clients Write" token: ask
  Richard, it is his account): (a) is a loopback redirect `http://127.0.0.1:<port>/…` accepted; (b) can a third-party
  client be granted registrar, Workers scripts, R2, DNS and email scopes; (c) does its access token upload a Worker,
  set a Durable Object migration, make an R2 bucket and attach a custom domain through the API (no wrangler); (d) how
  long the access and refresh tokens last.
- The pieces to scope after them: a `cloudflare_sign_in` tool (browser + local callback + Keychain), the deploy
  through Cloudflare's API instead of wrangler (or wrangler shipped in the bundle: compare sizes), MCP tools for
  find/buy/deploy with `buyProblem`'s word-for-word yes kept in code, and the TXT record on nodegx.io (Namecheap DNS;
  Cloudflare polls up to two days) to make the client public. A drive in Claude Desktop itself is the reading (memory
  `desktop-built-in-node-is-a-helper.md`: never grade a `.mcpb` on a real `node` alone).

## 5. What session 14 did (2026-11-07): done vs written

| piece | state | reading |
|---|---|---|
| HST-015 live | ✅ observed | Richard's redeploys (08:56, 12:24 UTC): `da`/`^Gr`/`ADA`+`i` 200, `^.r` 400 in words; Campus 14/14 kept |
| automations carried by a redeploy (`applyAutomations.ts`) | ✅ workerd; not live (Campus has no automations file) | jest 8/8; workerd: agree / unchanged keeps a backend edit (after AUTOMATIONSFORGOTTEN, found by the drive) / changed replaces. HST-014 §5.6 |
| HST-016 schedules on the object's alarm (SLEEPINGSCHEDULE, high) | ✅ workerd; live code since 12:24 UTC, a live fire not yet observed (§2.2) | jest 10/10 + 249/249 neighbours; workerd across real stops: fired after the object was gone, the control skipped, on time alive |
| the warm-up | ✅ measured, not needed | live tail: front Worker 0–6 ms, object 1–54 ms |
| HST-017 the refusal sentence + one email a day (R8) | ✅ workerd; live send untested (§1) | jest 10/10 (caught a page answering a data call); workerd's `send_email` accepted the message |
| `--domain` | ✅ jest + dry run; live untested (§1.2) | |
| HST-018 Claude finds and buys the domain | ✅ USED LIVE | `my-hearth.org` bought 18:50 UTC with Richard's `cf auth login` sign-in (no key) and his yes to "my-hearth.org 8.50 USD": active, expires 2027-11-07, auto-renew, privacy redaction, an active zone at once. jest 17/17. The real answer had no `domain_name` (fixed) |

Commits: `bbe8a72f1`, `e88ce7445`, `1362d4a14`, `f941e605a`, `107635363`, `c3143cccf`, `d3b6e685e`, `792234970`.
Rulings this session (README §8): R8 (catch it, say it, email), the domain (`my-hearth.org`, Campus on
`campus.my-hearth.org`), R2 (Claude may buy, only on a word-for-word yes to a fresh check), then "close P115 first".

**Where the plan of record was wrong, and what was done instead:** the alert was planned on HST-004's CPU refusal;
the product's object has 30 s of CPU, so it catches ANY object failure instead. "Automations carried by a redeploy"
was the task; it exposed that schedules never fired on Cloudflare at all (HST-016). The domain was to be bought in the
dashboard; Richard asked for A to Z, so Claude bought it (HST-018), first with a planned API token, then with his
`cf` sign-in when he said newbies won't make keys.

## 6. Traps (also in memory `phase-115-own-account.md`)

- 🔴 A record rebuilt field by field drops a field added later (AUTOMATIONSFORGOTTEN): drive a new field through two
  real runs. 🔴 A scripted API written from the docs cannot show the real answer's shape (the purchase's missing
  `domain_name`).
- 🔴 An idle Durable Object loses its timers (≤ 15 min, then evicted): a new timer-based backend feature needs the alarm.
- 🔴 With the route table unreadable, `/classes/x` looks like a page: navigation = `Sec-Fetch-Mode: navigate` / `Accept: text/html`.
- 🔴 zsh: `$EXTRA` holding several flags is ONE argument (`${=EXTRA}`); a word starting with `=` is a command lookup
  (`echo ======` fails).
- `cf` on Richard's machine is 0.15.0 (1.0.0-beta.28 exists): its `registrations check` needs the name AND `--body`;
  it has no `auth scopes`. Its sign-in lives in `~/Library/Preferences/cloudflare/config/default.json` (600); the
  token said "expires 20:46" local on 11-07: `domain.mjs` refreshes once through `cf auth whoami`, else asks for
  `cf auth login`. Installing `cf` (or any package) was refused to the session.
- Durable Objects on Free (read 2026-11-07): 30 s CPU a request; 100,000 requests, 13,000 GB-s, 5M rows read,
  100,000 rows written a day, reset 00:00 UTC. Email Service onboarding is a dashboard step in Cloudflare's docs, and
  `wrangler email sending enable <domain>` in wrangler 4.157.
- `ALERT_TO` in `spike-worker/wrangler.toml` is uncommitted on purpose (Richard's address, public repo): never `git add` it.
