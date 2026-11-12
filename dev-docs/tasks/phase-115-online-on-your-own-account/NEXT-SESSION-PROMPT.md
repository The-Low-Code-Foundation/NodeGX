# Phase 115 — next session prompt

**Written 2026-11-07 at the end of session 15 (Opus 5.5).** Lane 10, a nice-to-have for the Beta, never ahead of lanes
9, 2 and 3. Earlier prompts are in git history:
`git log -- dev-docs/tasks/phase-115-online-on-your-own-account/NEXT-SESSION-PROMPT.md`.

## 0. Where it stands, and the order

Richard ruled 2026-11-07: **finish P115 and close it, then the new phase "Online from Claude Desktop"**, now scoped as
[P135](../phase-135-online-from-claude-desktop/README.md). Session 15 parked the October research and scoped P135.
What is left of P115 is **Richard's three live steps and one night's reading**, then the closing paperwork (§3).

🔴 **The classifier refused session 15 EVERY live write** (re-measured, not inherited): a `POST` to Campus's admin API
(the overnight `tick`), `domain.mjs email` (*"DNS / Domain / Cert Changes"*), and (s13, s14) every deploy. Read-only
calls are the session's (`GET` on the admin API, `check-campus-deploy.mjs` without `--seed`, `domain.mjs check`,
`wrangler whoami`). So: write Richard the command, read the result.

**First thing: measure what Richard already ran** (he was given every command below at 20:15 CET on 11-07; a reply
may never have come back to a session):
```
node dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/campus-admin.mjs ~/.nodegx/cloudflare/hst-campus GET /admin/triggers
python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.nodegx/cloudflare/hst-campus/deployment.json')));print(d['domain'],d['alert'] and 'alert set',d['alertTested'],d['deploys'][-1])"
```
A `hst016-tick` trigger means step 1 ran; `domain: campus.my-hearth.org` and a deploy after 2026-11-07T19:00Z mean
step 3 ran. Ask him for what each printed only where the record cannot say it (wrangler's email output; the Gmail
folder of the test email).

## 1. Richard's steps (the alert address: his Cloudflare login, ruled 11-07; read it from `wrangler whoami`, never
## write it into a committed file)

1. **The overnight schedule** (HST-016 live):
   `node dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/campus-admin.mjs ~/.nodegx/cloudflare/hst-campus POST /admin/workflow-defs '<body>'`
   then `… POST /admin/triggers '<body>'`, the two bodies in the helper's header (`fixtures/campus-admin.mjs`): a
   `tick` workflow with one `return` step, and `hst016-tick`, `*/15 * * * *`.
2. **Email for `my-hearth.org`** (HST-017's sender), from the repo root:
   `NODEGX_WRANGLER=$PWD/dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/node_modules/wrangler/bin/wrangler.js node packages/nodegx-backend/cloudflare/domain.mjs email my-hearth.org --to <his address>`
   then he clicks Cloudflare's link. Untested live: what each wrangler call printed is the reading.
3. **Campus on the domain, with the alert**, from the repo root:
   ```
   NODEGX_WRANGLER=$PWD/dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/node_modules/wrangler/bin/wrangler.js \
     node packages/nodegx-backend/cloudflare/deploy.mjs dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/c-campus \
     --name hst-campus --viewer ~/.nodegx/cloudflare-viewer \
     --domain campus.my-hearth.org --alert-to <his address> --alert-from alerts@my-hearth.org
   ```
   Expect *"And at https://campus.my-hearth.org once Cloudflare has made its certificate"* and *"A test email went to
   …"*. NOT sent: `E_SENDER_NOT_VERIFIED` = onboarding not finished (wait 5–15 min), `E_RECIPIENT_NOT_ALLOWED` = his
   address not verified yet; run it again. Ask which Gmail folder the test landed in (HST-004 §10.5: Resend's went
   to All Mail).
4. **His phone:** `https://campus.my-hearth.org/home?id=6f468bbd-4091-48c8-90a1-9232f4753a90` (MUST 1) and *Count
   me in* (MUST 2). Passwords: `fixtures/c-campus/.accounts.json` (gitignored; never in a commit or a reply).

## 2. The session's own readings

1. After step 3: `node dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus`
   (must stay 14/14, nothing re-seeded); at `https://campus.my-hearth.org`: `/nodegx-config.json`'s endpoint is the
   domain, `/home?id=…` 200, `/classes/Answer` signed out 403. Record in HST-007 §9 and HST-017 §4.
2. **The night** (if step 1 ran): `GET /admin/triggers/hst016-tick` → `status.fireCount` against the quarter hours
   since the trigger was made, `lastFiredAt` within seconds of a quarter. Every fire after a quiet stretch is an
   eviction survived. Then Richard deletes both (`DELETE /admin/triggers/hst016-tick`, `DELETE /admin/workflow-defs/tick`:
   the helper's header). Record in HST-016 §4.

## 3. Close P115 (after §1–§2, or with what is still missing named)

1. ✅ **Done in session 15** (`197b35c1d`): HST-000, 001, 003, 005, 008, 009 moved to
   [`dev-docs/parked/online-the-twelve-runs/`](../../parked/online-the-twelve-runs/README.md) with ACs 3–6 and
   HST-007 §1–§5 named there (HST-007 stays here: its §9 is P115's); the parked README line added through a temporary
   index (the peer's `MM` on `parked/README.md` untouched).
2. README: the status line (closed; the AC table: AC1 and AC2 were HST-000/001's and park with them in substance, say
   so; AC7 graded by a search for keys over `fixtures/`), §12's session row, a `CLOSING.md` (BOARD §6 rule 3: the
   numbers, what it gave, what not, where everything went).
3. BOARD lane 10: P115 closed, P135 next (the P135 paragraph is in, `27cda78bc`). `BOARD.md` carries a peer's
   unstaged hunks: commit through a temporary index built on HEAD, then `git reset -q -- dev-docs/BOARD.md` so the
   real index matches (session 15: forgetting that left a staged REVERT of its own hunk in the shared index).
4. Memory: `phase-115-own-account.md` → closed, and its MEMORY.md index line (net-neutral length).
5. Left open on purpose, named in the README: BUNDLEDROPS (high, the cloud-deploy owner's), EXPORTDATAPATH (the HTML
   export's), the Worker's 100,000 requests a day with `run_worker_first = true` (per page view: not counted),
   `nodegx deploy --cloudflare` and MCP tools (now P135's).

## 4. Then P135

[P135 README](../phase-135-online-from-claude-desktop/README.md): ODT-000's measurements on a PRIVATE OAuth client on
Richard's account. **R1 first** (dashboard or an "OAuth Clients Write" token: his account, his call). Measured in
session 15: the `.mcpb` 0.2.9 is 217 MB and has no npm, esbuild, wrangler or backend; wrangler's install is 369 MB;
Cloudflare's docs say a public client is PERMANENT and its domain fixed once verified.

## 5. What session 15 did (2026-11-07): done vs written

| piece | state |
|---|---|
| the October research parked | ✅ committed `197b35c1d`; no file outside the phase linked the moved ones (git grep) |
| P135 scoped, on the BOARD | ✅ committed `27cda78bc`; its §3 measured that day (bundle contents, wrangler size, the deploy's needs, Cloudflare's client rules via their docs) |
| `fixtures/campus-admin.mjs` | ✅ run read-only live: 200 with the trigger list, exit 1 on a 404 |
| the overnight schedule, the email, the domain deploy | ❌ refused to the session; commands handed to Richard at ~20:15 CET; not run when this was written (`GET /admin/triggers` = `[]`) |

**Where the handoff was wrong:** it read §2.2 as the session's ("if the classifier refuses a live write, Richard
adds them") — the classifier did refuse it; and it allowed "the session may try" the email setup — refused as a DNS
change. Treat every live Cloudflare write as Richard's from now on.

## 6. Traps (also in memory `phase-115-own-account.md`)

- 🔴 After a temporary-index commit, the REAL index still holds the old HEAD's blob for your path: a peer's next
  commit would revert your hunk. `git reset -q -- <your paths>` (only where the peer had nothing staged).
- 🔴 A record rebuilt field by field drops a field added later (AUTOMATIONSFORGOTTEN). A scripted API written from the
  docs cannot show the real answer's shape (the purchase's missing `domain_name`).
- 🔴 An idle Durable Object loses its timers (≤ 15 min, then evicted): a timer-based backend feature needs the alarm.
- 🔴 zsh: `$EXTRA` holding several flags is ONE argument (`${=EXTRA}`).
- `cf` on Richard's machine is 0.15.0: its sign-in in `~/Library/Preferences/cloudflare/config/default.json` (600);
  `domain.mjs` refreshes once through `cf auth whoami`, else asks for `cf auth login`.
- `ALERT_TO` in `spike-worker/wrangler.toml` is uncommitted on purpose (Richard's address, public repo): never
  `git add` it. The same for any file holding his address.
