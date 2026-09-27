# TPL-010-H — planning.digitalbricks.io

**Opened 2026-09-20.** Host the TPL-010 planner with its backend on nexus-1, beside the todo list, on the recipe in
`phase-78-the-templates/todo-digitalbricks/README.md`.

**Status, 2026-09-22: 🟡 everything but the DNS record is ready.** `merge-policy.js` is written and run against the LIVE
policy pulled off the box (4 todo collections kept, the planner's 7 added, `defaults`/`files`/`functions`/`signup`
untouched; it refuses a name collision — tested). The site builds with the endpoint baked in, on the production viewer.
Nothing has been shipped and nothing on the box has been touched.

🔴 **The one thing left is Richard's: an A record `planning` → `49.12.102.195` at Namecheap (H3).** Until it resolves,
shipping is the wrong move — the drop-in would send Caddy after a certificate for a name that does not exist, and
`provision.sh` restarts the live todo backend to load the merged policy. Both are worth doing once, together, with the
name resolving.

⚠️ **`signup` on the live backend is still `public`.** The todo README's last section says to lock it once his account
exists; it has not been done, and the merged policy keeps the live value rather than quietly changing it. Adding the
planner does not make this worse (a stranger who signed up would see their own empty week), but it is his server.

Prerequisite: TPL-010 AC1 ✅.

**The person sentence:** *Richard signs in at planning.digitalbricks.io on his phone with the account he already uses for the
todo list, and his week is there.*

## 1. Rulings

| # | Question | Ruling |
|---|---|---|
| H1 | Own backend, or the todo list's? | **The todo list's backend, one process, one account.** The planner's Caddy site proxies the backend routes to the same `127.0.0.1:8690`, so the planner is same-origin with its API and no CORS is needed. One sign-in serves both apps, `creatorOwns` keeps rows private per user, and TPL-010-L's link becomes a same-backend read instead of a cross-origin call. The cost is one `MemoryMax=384M` process for two single-user apps, which is fine. *(Alternative kept on file: a second service on 8691 with its own data dir, as TPL-009 plans for Distraction. Choose it only if the planner needs a different policy posture.)* |
| H2 | Policy | The planner's five collections are **appended** to `/var/lib/todo/data/security.json` with the same posture as `Task` (`authenticated`, `delete: "nobody"` except `Block`, `creatorOwns: true`). `templates/planner.security.json` stays the source; a merge script in `planning-digitalbricks/` produces the combined file and refuses if any collection name collides. |
| H3 | DNS | `digitalbricks.io` is at **Namecheap** (`dns1/dns2.registrar-servers.com`). `todo` is an A record to `49.12.102.195`. **Add `planning` as an A record to `49.12.102.195`, TTL automatic.** Caddy obtains the certificate on its own once it resolves; nothing else to do for TLS. |
| H4 | What is written on the box | Only: `/srv/planning/site` (static export), `/etc/caddy/conf.d/planning.caddy`. **No new systemd unit, no new data dir.** `provision.sh` here is the todo one with the backend and data steps removed. |
| H5 | The closed routes | Same as todo: `/_admin` `/admin` `/executions` `/metrics` → 404. |
| H6 | PWA | Not in this task. Add `apply-pwa.js` only if the phone view earns it. |
| H7 | **The phone — answered before this task starts** | TPL-010 **R17** (2026-09-21): under a 700px breakpoint the week shows **one day column and a day picker**, and the page scrolls down but never sideways. Built and measured in TPL-010 s3: at 390×844, `scrollWidth` 390 and **0 texts unreachable**. So AC6 below is a real test of a real screen, not a discovery. ⚠️ One thing is still Richard's call: a move chip is up to 685px inside a 390px strip, reachable only by scrolling the strip sideways (R7's design). |
| H7 | Sign-up | Already locked on this backend once Richard's account exists (todo README, last section). The planner's START-HERE says so. |

## 2. The recipe

```bash
# 0. DNS at Namecheap: A  planning  →  49.12.102.195   (do this first; the rest can wait for it)
dig +short A planning.digitalbricks.io                 # → 49.12.102.195 when it has landed

# 1. Build the site (same as todo, different endpoint metadata)
S=<scratch>; cp -R templates/planner "$S/project"
# set metadata.cloudservices = {appId: "todo-list", endpoint: "https://planning.digitalbricks.io", type: "nodegx"}
node packages/noodl-preview/dist/nodegx-deploy.cjs "$S/project" "$S/site"
rm "$S/site/nodegx.security.json"

# 2. Ship the site (the site holds no data, --delete is safe; NEVER rsync into /var/lib/todo)
rsync -a --delete -e "ssh -i ~/.ssh/nexus_hetzner" "$S/site/" root@49.12.102.195:/srv/planning/site/

# 3. Extend the policy (additive; the script refuses on a name collision) and restart the one backend
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 'cat /var/lib/todo/data/security.json' > /tmp/live-security.json
node planning-digitalbricks/merge-policy.js /tmp/live-security.json templates/planner.security.json /tmp/security.merged.json
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 'mkdir -p /tmp/planning-provision'
scp -i ~/.ssh/nexus_hetzner /tmp/security.merged.json root@49.12.102.195:/tmp/planning-provision/security.json
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 'bash -s' < planning-digitalbricks/provision.sh

# 4. Check
curl -fsS -o /dev/null -w "%{http_code}\n" https://planning.digitalbricks.io/
curl -fsS https://planning.digitalbricks.io/health
```

`merge-policy.js` is **written** (`planning-digitalbricks/merge-policy.js`) and run: it reads the live `security.json`, adds the
planner's `collections`, refuses on a name collision or a missing `Task`, keeps the live file's `defaults`, `files`, `functions`
and `signup`, and asserts the collection count. Its dry run on 2026-09-22 kept `Task, Action, Event, PushSubscription` and added
`Project, Block, MonthPlan, MoneyItem, MoneyMark, BalanceReading, Settings`. The `provision.sh` here installs the
merged policy only if the collections are absent, writes the Caddy drop-in, validates the whole Caddy config, restarts
`todo-backend` so the policy loads, and reloads Caddy. It never touches `/var/lib/todo/data` beyond the policy file.

## 3. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| AC1 | `dig +short A planning.digitalbricks.io` returns `49.12.102.195` | ⬜ **Richard — the only blocker.** Checked 2026-09-22: no record. |
| AC2 | `https://planning.digitalbricks.io/` serves the planner over TLS with a verified certificate; `/health` returns the backend's health JSON; `/admin` returns 404 | ⬜ |
| AC3 | The todo list at `https://todo.digitalbricks.io` is unchanged: the same tasks are there after the restart, and its Caddy site file is untouched (`caddy validate` on the whole config passed before the drop-in was kept) | ⬜ |
| AC4 | Signing in with the todo account on the planner works; a `Project` row created there is invisible to a second account | ⬜ |
| AC5 | `journalctl -u todo-backend` shows the five planner collections registered at startup and no policy warning | ⬜ |
| AC6 | **From a phone on mobile data**, sign in and log one block; on the laptop, reload and the block is logged | ⬜ Richard |

## 4. Redeploy

Steps 1–2 above. The policy step only when `planner.security.json` changes.
