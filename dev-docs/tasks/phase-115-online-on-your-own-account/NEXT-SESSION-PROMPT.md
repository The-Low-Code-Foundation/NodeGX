# Phase 115 — next session prompt

**Written 2026-11-07 at the end of session 14 (Opus 5.5).** Unparked by Richard 2026-11-04 (BOARD lane 10), a
nice-to-have for the Beta, never ahead of lanes 9, 2 and 3. Earlier prompts (sessions 1–13, the spike history, the
build order of HST-010…015) are in git history: `git log -- dev-docs/tasks/phase-115-online-on-your-own-account/NEXT-SESSION-PROMPT.md`.

## 0. Richard's steps (the auto-mode classifier refuses a live deploy to a session: "Production Deploy")

What "finished" means (R7): the Cloudflare work plus a domain. The Cloudflare work is built and graded on workerd.
What is left is live, and starts in Richard's dashboard and terminal. Time each step (HST-007's human steps).

**A. ✅ Done by Richard 2026-11-07 12:24 UTC**: the redeploy carrying session 14's code; read after: Campus 14/14 kept,
the four filter readings unchanged.

**B. The domain, bought through HST-018** (Richard ruled 2026-11-07: Claude buys it, after he says yes to the name and
price; [HST-018 §4](HST-018-CLAUDE-FINDS-AND-BUYS-THE-DOMAIN.md)). Do NOT buy it in the dashboard.
1. Once, in the dashboard (if not there yet): a default card (Billing), a default registrant contact (Domain
   Registration), then My Profile → API Tokens → Create Token → Custom token: the account's **Registrar** permission at
   **Edit**, **Account Settings** at **Read**. Save it from your own terminal (a secret, never through a session):
   `pbpaste > ~/.nodegx/cloudflare/registrar-token && chmod 600 ~/.nodegx/cloudflare/registrar-token`
2. A session: `node packages/nodegx-backend/cloudflare/domain.mjs check my-hearth.org my-hearth.io` (no money): is .org
   in Cloudflare's API beta, and today's price. If .org is not, the choice is .io or buying .org in the dashboard.
3. You say yes to the printed sentence; then `… domain.mjs buy my-hearth.org --confirm "<that sentence>"` (a purchase:
   your terminal or your approval).
4. `… domain.mjs email my-hearth.org --to <your address>` (with `NODEGX_WRANGLER` as in the deploy command); click the
   link Cloudflare emails you.

**C. Campus on the domain, with the alert** (from the repo root):

```
NODEGX_WRANGLER=$PWD/dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/node_modules/wrangler/bin/wrangler.js \
  node packages/nodegx-backend/cloudflare/deploy.mjs dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/c-campus \
  --name hst-campus --viewer ~/.nodegx/cloudflare-viewer \
  --domain campus.my-hearth.org --alert-to <your address> --alert-from alerts@my-hearth.org
```

Expect *"And at https://campus.my-hearth.org …"* and *"A test email went to <your address>"*. **Look where it landed.**

**D. On your phone:** `https://campus.my-hearth.org/home?id=6f468bbd-4091-48c8-90a1-9232f4753a90` (Ada's link, MUST 1),
and *Count me in* (MUST 2). The passwords are in `fixtures/c-campus/.accounts.json` (never in a commit).

## 1. The session after Richard's steps

1. Read (no seeding): `node fixtures/check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus` (it uses the
   workers.dev address), then the same readings at `https://campus.my-hearth.org`: `nodegx-config.json`'s endpoint must
   be the domain; MUST 1 and 3–6 over HTTP there. Record in HST-007 §9 and HST-017 §4 (the test email's folder).
2. **HST-016 live, one night:** on Campus's backend, a workflow `tick` (one `return` step) and a schedule trigger
   `*/15 * * * *` aimed at it, through `POST /admin/workflow-defs` and `POST /admin/triggers` with the admin token from
   `~/.nodegx/cloudflare/hst-campus/deployment.json` (if the classifier refuses a live write, Richard adds them on
   `https://hst-campus…/_admin` → Workflows/Triggers). The next morning: `fireCount` against the quarter hours since,
   and `lastFiredAt` within seconds of a quarter. Then delete both (Campus's project has no automations file; a later
   deploy says "keeps its own" for anything left).
3. **Close the phase** (R7): move HST-000, 001, 003, 005, 008, 009 and the rest of HST-007 to a parked phase with README
   §7's ACs 3–6 (`dev-docs/parked/`; 🔴 `dev-docs/parked/README.md` had a PEER's staged and unstaged edits on 11-07:
   commit only your own hunk, through a temporary index). Mark P115 done on the BOARD (lane 10), the README status,
   memory `phase-115-own-account.md`.

## 2. What session 14 built (all graded on workerd; jest suites named)

| piece | file | reading |
|---|---|---|
| HST-015 live | — | Richard's redeploy: `da`/`^Gr`/`ADA`+`i` 200, `^.r` 400 in words; Campus 14/14 kept |
| automations carried by a redeploy (VM's rule) | `cloudflare/applyAutomations.ts`, `tests/p115-hst014-automations-on-redeploy.test.ts` 8/8 | workerd: agree / unchanged keeps a backend edit (after AUTOMATIONSFORGOTTEN) / changed replaces, the previous set kept beside the record. HST-014 §5.6 |
| schedules on the object's alarm (SLEEPINGSCHEDULE, high) | `src/triggers/scheduler.ts` `wake`/`fireDue`/`dueAtStart`, `scheduleClock.ts`, `BackendServiceOptions.scheduleWake`, `worker.ts` `alarm()`; `tests/p115-hst016-…` 10/10 | workerd across real stops: fired 09:18 and 09:21 after the object was gone, the control skipped 09:20, on time alive (09:22:00.038). [HST-016](HST-016-SCHEDULES-ON-THE-OBJECTS-ALARM.md) |
| the warm-up | — | measured live, **not needed**: front Worker 0–6 ms, object 1–54 ms |
| the refusal alert (R8) | `cloudflare/front.ts`, `refusal.ts`, `--alert-to/--alert-from`; `tests/p115-hst017-refusal.test.ts` 10/10 | workerd: test email through the real `send_email` binding. [HST-017](HST-017-THE-PAGE-SAYS-WHY-AND-THE-BUILDER-IS-TOLD.md) |
| the domain flag | `wranglerConfig.ts` `domain`, `--domain` | jest + dry run. [HST-007 §9](HST-007-THE-DOMAIN.md) |
| Claude finds and buys the domain (HST-018) | `cloudflare/registrar.ts`, `domainCommand.ts`, `domain.mjs`; `tests/p115-hst018-domain-purchase.test.ts` 12/12 | scripted API: no POST without a fresh check AND a word-for-word yes; mutant 3 red. [HST-018](HST-018-CLAUDE-FINDS-AND-BUYS-THE-DOMAIN.md) |

Commits: `bbe8a72f1` (automations, schedules, domain), `e88ce7445` (refusal alert), and the docs commit after them.
Neighbouring suites 249/249 (scheduler, backups, triggers, files, overlap, BKO-001, HST-010…014).

## 3. Traps met this session (also in memory `phase-115-own-account.md`)

- 🔴 **A record rebuilt field by field drops a field added later** (`deploy()`): the suite passed the fingerprint by hand
  and could not see it; the drive did. Drive a new record field through two real runs.
- 🔴 **An idle Durable Object loses its timers** (≤ 15 min held, then evicted): anything on `setTimeout` in the
  backend is unreliable on Cloudflare. Schedules are on the alarm now; a NEW timer-based feature needs the same.
- 🔴 With the route table unreadable, a page address and a data call look alike (`/classes/Reader` has no dot):
  decide by `Sec-Fetch-Mode: navigate` / `Accept: text/html`, never by the path alone.
- 🔴 zsh: `$EXTRA` holding several flags is ONE argument; `${=EXTRA}` splits.
- `wrangler dev` stopped before a due instant and started after it is a faithful eviction (the alarm is persisted in
  `--persist-to`); the local run of the command is `scratchpad/b-local.sh` + `cycle.sh` in session 14's scratchpad
  (gone): `deploy.mjs <copy> --name hst-b-local --out <scratch> --local --port 8791 --allow-development-engine`, stop
  with `pkill -f -- "--persist-to <out>/.state"`.
- Cloudflare limits for Durable Objects on Free (read 2026-11-07): 30 s CPU a request; 100,000 requests, 13,000 GB-s,
  5M rows read, 100,000 rows written a day, reset 00:00 UTC; 5 GB stored. The wording of a daily refusal is
  unpublished: the first real one arrives quoted in HST-017's email.
