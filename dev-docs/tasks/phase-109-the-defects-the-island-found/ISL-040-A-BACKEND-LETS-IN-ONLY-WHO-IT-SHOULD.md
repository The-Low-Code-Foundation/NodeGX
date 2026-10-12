# ISL-040 — A backend lets in only the people and the code it should

**Status: ✅ s42 (2026-10-11): closed — 5 of 6 fixed, MCPOAUTH handed back as ruled ("its own phase"). s42: SESSIONS `082802923` (a sign-in ends after 30 days unused; P109-S42-ENDEDREADS found and fixed with it), DEVOPEN `bb34e8206`. s41: USERCOLS `6719e4a89`, UNRULED `89b9fd339`, LOCKOUT `f5f65a122`. Scoped 2026-10-07 at `088579843` by the second ledger sweep (Track G).** **Source:** 6 bugs
from the ledger (`dev-docs/bugs/`) that no phase owned: 3 high · 3 medium; 1 to ask. **Side:** nodegx-backend (the cloud runtime's data path, function permissions, auth sessions and rate limit), the backend manager, the MCP door (FED-005)

## 1. The person sentence

**A cloud function writes only the account fields it may, a function with no rule is refused or named before it runs for anyone, a burst of wrong passwords locks out the guesser and not the owner, a session ends, and Claude on the web or a phone can reach a backend's door.**

## 2. Why these belong together

Who gets in, and what they can touch. Two rows are security holes on a deployed backend (a cloud function can set `adminAccess`; a function deployed with no rule runs for any signed-in caller). One locks the owner out of their own backend, /health included. One tells a person to edit a JSON file because no page offers the switch. Sessions never expire (a ruling). The MCP door takes only an API key, so Claude on the web and on a phone cannot connect (a build).

## 3. The bugs

Worst first. Each file holds the measurement, the reproduction and, for most of them, the proposed fix. This table is
generated from the ledger headers. **The ledger file is the source**, so read it before you start.

| bug | severity | status | what a person sees |
|---|---|---|---|
| [P78-DBT-USERCOLS](../../bugs/p78-dbt-usercols-a-cloud-function-can-write-any-account-column-adminaccess-included.md) | high | scheduled | A cloud function can write any account column, adminAccess included |
| [P78-DBT-UNRULED](../../bugs/p78-dbt-unruled-a-function-deployed-to-a-running-backend-with-no-rule-runs-for-any-signed-in-caller.md) | high | scheduled | A function deployed to a running backend with no rule runs for any signed-in caller, and nothing says so |
| [P78-DBT-MCPOAUTH](../../bugs/p78-dbt-mcpoauth-claude-ai-on-the-web-and-mobile-cannot-connect-to-a-backend-s-mcp.md) | high | scheduled | Claude on the web and on a phone cannot connect to a backend's MCP door, because it takes only an API key |
| [P100-UPG001-LOCKOUT](../../bugs/p100-upg001-lockout-ten-failed-credentials-lock-an-ip-out-of-every-route.md) | medium | scheduled | Ten failed credentials from one IP lock it out of every route for five minutes, /health and valid admin calls included |
| [P104-DEVOPEN](../../bugs/p104-devopen-the-manager-tells-a-person-to-edit-security-json-to-turn-dev-open-off.md) | medium | scheduled | The backend manager tells a person to set "devOpen": false in security.json, and no page offers the switch |
| [P78-DBT-SESSIONS](../../bugs/p78-dbt-sessions-a-sign-in-session-never-expires.md) | medium | needs-ruling | A sign-in session never expires, by any door |

## 4. Order of work

USERCOLS and UNRULED first (security). Then LOCKOUT and DEVOPEN. SESSIONS and MCPOAUTH need rulings: MCPOAUTH is a feature (OAuth on the door), so ask whether it belongs here or in a FED phase.

## 5. Rules for every row

- **Re-measure first.** Each row was measured once, by the session named in its `found:` line, and this task was written
  from the ledger without re-running them. Re-run each reproduction at HEAD before building. A row that no longer
  reproduces is closed in the ledger with the commit that fixed it, not fixed again.
- **A control on every fix:** the old code red on exactly the fix's arms.
- **When a fix lands**, set the ledger file to `status: fixed` with `commit:` (and `regression:`).

## 6. Related work and collisions

- **P104 (the backend manager) is live:** DEVOPEN is its Security page. Hand it over if P104 is building that page.
- MCPOAUTH is P96 FED-005's door. Read FED-005 before designing anything.
- A security fix needs its control as an attack: the old code lets the write through, the new code refuses it, by name.

## 7. Acceptance criteria

- **AC1** — every row in §3 is re-measured at the session's HEAD. Each one still firing is recorded, and each one that is
  not is closed in the ledger with the commit that fixed it.
- **AC2** — every `needs-ruling` row is asked in plain words and ruled (P78-DBT-SESSIONS).
- **AC3** — every row ruled or written "as proposed" is fixed, one commit each (or one per shared mechanism), with its
  regression green.
- **AC4** — `node scripts/bugs.js` lists none of this task's rows as `open`, `scheduled` or `needs-ruling`.

## 8. Record

### s41 (2026-10-11) — 3 of 6 built

**AC1:** USERCOLS, UNRULED and LOCKOUT were re-measured at HEAD by driving them. All three still fired. The two
security rows were driven as attacks:
- **USERCOLS:** a cloud function's master key wrote `adminAccess:"full"` through `/classes/_User`, and the person's
  own session then opened `/_admin/whoami`. The control was an account granted through the Users page.
- **UNRULED:** a deploy to a `0.0.0.0` backend loaded the Site Builder's functions with no rule. A newly signed-up
  account with no role then got past the gate on `publishPage`.

| row | commit | what changed | graded by |
|---|---|---|---|
| USERCOLS (high) | `6719e4a89` | `accountWriteRefusal`: `/classes/_User` and `/api/_User` refuse `adminAccess`, `disabled`, `emailVerified`, `password` and `_` columns for every principal; `username`/`email` stay writable | `nodegx-backend/tests/isl040-account-columns.test.ts` (red 6/8); 53 `_User` specs |
| UNRULED (high) | `89b9fd339` | SB-016's check on `PUT /admin/workflows/:name` and on reload: 409 + `success:false` on a public bind, `warning` on loopback | `isl040-unruled-deploy.test.ts` (red 3/4); deploy specs 92/92; `noodl-mcp` hls013 4/4 |
| LOCKOUT (half) | `f5f65a122` | only a request carrying a credential (4 headers, or a `takesCredential` route) is held back | `isl040-lockout.test.ts` (red on `/health` + anonymous read); `bmg-014` caught a first version |

**Found on the way:**
- `/classes/_User` stored a `password` as text. It is in USERCOLS's fix.
- The editor's and the MCP door's deploy clients read `success`, not the status, so a plain 409 would have told an
  agent a refused deploy worked.
- Plain `grep` cannot read `server/HttpServer.ts` on this machine (it is treated as binary), so use `grep -a`.

**Left:**
- **DEVOPEN** is buildable: a switch on the manager's Permissions page, a route that writes `devOpen` and reloads.
  P104 last worked on 2026-09-26 and is not building it.
- **LOCKOUT half 2** is a ruling: let a locked-out address through when its credential is right? That tells a guesser
  right from wrong.
- **SESSIONS** is a ruling (do sessions expire?).
- **MCPOAUTH** is a ruling (does OAuth on the door belong in P109 or in a FED phase?).

**AC2 met, 2026-10-11:** each question and answer is verbatim in its ledger file.
- **LOCKOUT half 2: "No, keep it held".** The row is fixed by `f5f65a122` as built.
- **SESSIONS: "Ends after 30 days unused",** changeable per backend on the Sign-in page. Buildable, and the ledger
  file has the plan.
- **MCPOAUTH: "Its own phase".** Handed back: no phase, no task, `status: open`.

### s42 (2026-10-11) — closed

Both rows re-measured at `84396782b` before building. Both still fired.

| row | commit | what changed | graded by |
|---|---|---|---|
| SESSIONS (as ruled) | `082802923` | `auth/sessions.ts`: one `mint()` for the five sign-in doors, one `resolve()` for the three readers; a renewing end moves on with use; `settle()` on start and after a smaller number; `auth.json` `sessions.idleDays` on the Sign-in page | `isl040-sessions.test.ts` red 9/11 → 11/11; the Sign-in page arm in `email-signin-views` (red on HEAD's page) |
| DEVOPEN | `bb34e8206` | Enforce my rules on this machine on Permissions (loopback only), through the existing `PUT /admin/permissions`; whoami asked again; the three sentences point at the switch | `permissions-view` "ISL-040 DEVOPEN" red 3/4, the whoami arm red with its refresh removed |

**Found and fixed:** `P109-S42-ENDEDREADS` (high). The access check and Verify Session Token never read `expiresAt`, so a
session past its end still read `/classes` (200) and verified. It reached impersonation sessions past their hour before
SESSIONS, and would have made the 30-day rule a `/users/me` rule after it.

**The handoff was wrong about DEVOPEN's server half.** It asked for a new admin route that writes `devOpen` and reloads
`SecurityState`. `PUT /admin/permissions` already wrote it, live, with the public-bind refusal. Only the page was missing.

**Driven** in the served manager on a fresh backend: the setup session ended 30 days out with `renews: true`; Save on
the Sign-in page wrote `sessions.idleDays: 7` and pulled the owner's live session in to 7 days; 0 was refused with the
server's sentence. The switch moved an anonymous read 200 → 403 → 200 → 403. The first drive found the header chip
stale after the switch, fixed before the commit.

**Gates (2026-10-11, before the commits, on 740f67ffa + this work):** full `nodegx-backend` run (`-w 3`, without
`ac2-page-editor-drag-drive`): 2887 / 2889 tests, 234 of 237 files. The two reds are s41's (`bmg-002` past7 =
SUNDAYWEEK, `rel002b`). The PostgreSQL suites ran (`brg-005-service-postgres` 3/3, conformance 20/20). After DEVOPEN's
last change: `tests/admin-app` + the session specs 244 / 244; both `tsc` projects exit 0.
