# TPL-010-MCP — The coach: Claude Code reads and writes the whole planner over MCP

**Opened 2026-09-21.** Richard: *"make sure I'll have an MCP server in the Digital Bricks version (not in the demo, but
you can still have the 'connect MCP' button and explain that in the full version you can set up an MCP server). I want
Claude Code to be able to audit my tasks, targets and config and be able to set EVERYTHING for me if it needs to, every
tiny bit of config is open to the AI, every piece of data, every tiny note or record, so it can really keep me right."*

**Status: ⬜ nothing built.** Prerequisites: TPL-010-H (the hosted app on nexus-1), TPL-010-R2 R2.4 and R2.5 (so there is
something worth auditing: entries, invoices, the split, the guardrails). The board had this as *"explicitly later … once
the hosted app has a month of real rows"*; Richard has moved it up, and the research below says it is smaller than the
board assumed.

**The person sentence:** *In the evening Richard opens Claude Code, says what happened, and the coach reads his week, his
month, his settings and his invoices, tells him the one thing, and — if he says so — changes the plan, the budget, a
setting or a note, and the week on screen is different when he reloads.*

---

## 1. What already exists (researched 2026-09-21)

**The backend speaks MCP.** `852b77545` (2026-09-19, P96 FED-005, `docs/runtime/BACKEND-MCP.md`): every NodeGX backend
serves `POST /mcp`, Streamable HTTP, stateless. A **scoped API key** (`ngxk_…`, header `X-NodeGX-Api-Key` or `Bearer`) gets
a tool list computed per request: `<Collection>_find`, `_get`, `_create`, `_update` for every collection its scopes and
the collection's own rules allow, plus one tool per cloud function. A key made with **`actsAsUserId`** *is that user* for
every row question — it sees what he sees and writes rows he owns — and can never exceed him. Every call is a row in
`_Audit` (`action=mcp.tool.call`).

**What a key can never do** (the doc's own list, and each one matters here):

| Never | Consequence for the coach |
|---|---|
| Delete a row | `Block` is the one thing the app deletes (R10, *Drop*). The coach cannot drop; see R26 |
| Reach `_User`, `_Session`, `_ApiKey`, `_Audit` | Fine: none of it is his data |
| Administer permissions, keys, schema, config | Fine: "every tiny bit of config" means **his** config, which is `Settings` and `MonthPlan` rows, not the server's |
| Use the master key | The key is made once on the box with the admin token and pasted into Claude Code; the admin token never leaves nexus-1 |

**So there is no MCP server to write.** The template's data is already five collections (§2 of TPL-010), and R2 makes
it eight (`Invoice`, and §3 below adds `Decision` and `Note`). Every setting the sheet edits is a `Settings` column and
every budget a `MonthPlan` row. A key with `classes:*` bound to Richard's user reaches **all of it**, and the todo list's
`Task` and `Event` too, because H1 put both apps on one backend — which is TPL-010-L's *"knock me over the head"* for free.

**What is missing on the box:**

1. The deployed backend bundle is from **2026-09-15** (todo README s5); `/mcp` landed on the 19th. **Redeploy the backend**
   (todo README, *Redeploy the backend*: `package-deploy.js`, rsync `cli.js`, restart `todo-backend`).
2. Caddy's `@backend` matcher (`todo-digitalbricks/provision.sh:97`, and the planning copy) lists the proxied route
   families and **`mcp` is not among them**, so `https://planning.digitalbricks.io/mcp` is the SPA fallback today. Add it
   to both drop-ins. `/admin/keys` stays closed at Caddy (`@closed`); the key is made from the box over `127.0.0.1:8690`.
3. No key exists.

## 2. Rulings

| # | Question | Ruling |
|---|---|---|
| M1 | Where the coach runs | **Claude Code on Richard's laptop**, with the backend's `/mcp` added as an HTTP MCP server. No model in the app, no server-side agent, nothing scheduled. The evening session is a conversation. |
| M2 | What the key can do | `scopes: ["classes:*", "functions:*"]`, `actsAsUserId` = Richard's `_User.objectId`. **Everything he can do, as him**, minus delete. One key, named `richard-laptop`, revocable from the box. |
| M3 | **Nothing the app knows lives outside a collection.** | The rule that makes *"every tiny bit"* true and keeps it true: a gate walks every field the Settings sheet, the month plan, the project editor and the block sheet write, and every one must be a column in the schema note. The one exception is the theme choice, which is per device (`localStorage`) and not data. |
| M4 | What is new in the data | Two collections that R12 already asked for: **`Decision`** (`text`, `madeOn`, `reviewOn`, `outcome` null until reviewed, `about` projectId or null) — *"an override is logged with a review date and never re-argued"* — and **`Note`** (`on`, `by` `me`\|`coach`, `about` projectId or blockId or null, `text`). The drawer's ask box, which the mockup wired to *"the coach in Claude Code through the MCP server"*, writes a `Note` with `by: me`; the coach reads it that evening. Both `delete: nobody`, `creatorOwns`. |
| M5 | R26 — no deletes, so nothing is deleted | **`Block` gains `dropped`** (boolean). *Drop* in the drawer sets it; `Logic/Planner data` filters it out; the policy's one `delete` rule becomes `nobody` like the rest. The todo list's rule (*nothing is ever deleted*) now holds here too, and the coach can drop a block by updating it. The `Drop block` command changes from delete to update; the gate that says *"nothing deletes anything but a Block"* becomes *"nothing deletes anything"*. |
| M6 | One function, so two brains never disagree | `plannerPosition`: a cloud function that runs the **same** `Logic/Envelopes` and `Logic/Shutdown` source (the generator already holds `PLANNER_FNS` and the scripts as strings; emit them into the function) and returns the month position, per-day need, building left, the guardrail sentences and the one concern. The coach calls it first, every evening, and reads the same numbers the screen shows. Without it the coach would re-derive the target from rows and drift from the tile. |
| M7 | The demo | A **Connect an AI** ghost button in the app bar of both variants. In the demo it opens a sheet that says what this is, that the demo has no backend, and that the full version's backend serves an MCP endpoint a scoped key connects Claude to. In the hosted app the same sheet shows the endpoint URL and the two commands from §4. **No key is ever shown in the app.** |
| M8 | The coach's rules live with the coach | A skill or `CLAUDE.md` in Richard's planner folder on the laptop (not in this repo — it names his real projects): R1 plan-never-judge, R12 concern-once and override-with-review-date, the two clocks, the order of the evening (`plannerPosition`, then today's blocks, then the Notes, then one concern, then changes only on his word). The template ships a sanitised copy as `START-HERE` text so a person who installs it can write their own. |

## 3. Data touched

| Where | Change |
|---|---|
| `templates/planner.security.json` | `Decision`, `Note` appended; `Block.delete` → `nobody` (M5) |
| `templates/planner` | `Commands/Drop block` = update `dropped`; `Logic/Planner data` filters `dropped`; `Commands/Add note` from the drawer's ask box; `Week/Shutdown drawer` lists open Decisions with review dates due; `Week/Connect sheet` + the app bar button; `Functions/plannerPosition` |
| Demo | The button and the sheet, seeded `Decision`/`Note` rows; no network |
| nexus-1 | Backend bundle redeployed; `mcp` in both Caddy matchers; policy merged with the three new collections (the merge script refuses collisions); one key |
| Richard's laptop | `claude mcp add`, the coach skill |

## 4. The recipe (after TPL-010-H)

```bash
# 1. Backend with /mcp in it (todo README, "Redeploy the backend")
node packages/nodegx-backend/scripts/package-deploy.js --skip-build --out "$S/artifact"
rsync -a -e "ssh -i ~/.ssh/nexus_hetzner" "$S/artifact/backend/cli.js" root@49.12.102.195:/opt/todo/backend/cli.js

# 2. Caddy: add mcp to the @backend regexp in BOTH drop-ins, validate, reload
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 \
  "sed -i 's/|login|logout|/|login|logout|mcp|/' /etc/caddy/conf.d/todo.caddy /etc/caddy/conf.d/planning.caddy && caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy && systemctl restart todo-backend"

# 3. The key, from the box, bound to Richard (the admin token is in /var/lib/todo/data/secrets.json; never copied off)
ssh -i ~/.ssh/nexus_hetzner root@49.12.102.195 'ADMIN=$(node -e "console.log(require(\"/var/lib/todo/data/secrets.json\").adminToken)"); \
  USER_ID=$(curl -s -H "Authorization: Bearer $ADMIN" "http://127.0.0.1:8690/users?where=%7B%22email%22%3A%22<richard>%22%7D" | node -e "process.stdin.on(\"data\",d=>console.log(JSON.parse(d).results[0].objectId))"); \
  curl -s -X POST http://127.0.0.1:8690/admin/keys -H "Authorization: Bearer $ADMIN" -H "content-type: application/json" \
    -d "{\"name\":\"richard-laptop\",\"scopes\":[\"classes:*\",\"functions:*\"],\"actsAsUserId\":\"$USER_ID\"}"'
# → prints the secret ONCE. Paste it into the next line and nowhere else.

# 4. On the laptop
claude mcp add --scope user --transport http planning https://planning.digitalbricks.io/mcp \
  --header "X-NodeGX-Api-Key: ngxk_…"
```

⚠️ Step 3's exact `/users` query shape is from the Parse-wire family; check it against `docs/runtime/BACKEND-AUTH.md` before
running, and prefer the admin dashboard's Keys panel over an SSH tunnel if the query fights back — the dashboard is
`/_admin`, closed at Caddy and open on `127.0.0.1:8690`.

## 5. Acceptance criteria

| AC | Criterion | Result |
|---|---|---|
| M-AC1 | `curl -X POST https://planning.digitalbricks.io/mcp` with no key returns 401 *"needs a NodeGX API key"*; with the admin token returns 403 mentioning the master key; `todo.digitalbricks.io/mcp` behaves the same (same backend) | ⬜ |
| M-AC2 | From Claude Code, the tool list for `richard-laptop` names `_find/_get/_create/_update` for exactly `Project Block MonthPlan CashEvent Settings Invoice Decision Note Task Event` and no `_delete`, no system collection, and `plannerPosition` | ⬜ |
| M-AC3 | `Settings_find` returns one row (his); `Settings_update` on `focusHours` 6 → 5 and a reload of the planner shows every day header at `/ 5 h` and the building budget recomputed | ⬜ |
| M-AC4 | `plannerPosition` returns the same target, per-day and concern the tile and the drawer show at that moment (gate: run the function's source and `Logic/Envelopes` on one fixture, equal output) | ⬜ |
| M-AC5 | A `Decision` created over MCP with `reviewOn` = today appears in the drawer that evening under *Decisions due*; marking its `outcome` in the drawer is visible to the next `Decision_find` | ⬜ |
| M-AC6 | The ask box in the drawer writes a `Note` with `by: me`; `Note_find` from Claude Code returns it | ⬜ |
| M-AC7 | A second account's key (bound to a second `_User`) sees none of his rows and cannot update one by id (404, not 403 — the row does not exist for it) | ⬜ |
| M-AC8 | M3's gate: every field written by the four editors is a column in the schema note, and every collection in the schema note is in the policy | ⬜ |
| M-AC9 | Drop in the drawer sets `dropped` and the block is gone from the week and from the envelopes; no `DeleteDbModelProperties` node exists in the template (the demo gate's `BACKEND_NODE_TYPES` list loses one entry, the template gate gains the assertion) | ⬜ |
| M-AC10 | `_Audit` on the box shows every call from M-AC3–M-AC6 with the key's name and the tool | ⬜ |
| M-AC11 | The demo's *Connect an AI* opens the sheet with the explanation and makes **no** network request; the hosted app's sheet shows the endpoint and the two commands and no secret | ⬜ |
| M-AC12 | **Richard's first evening:** the coach reads the position, names one concern, he overrides it, and the `Decision` row with its review date is there in the morning — and the concern is not raised again until that date | ⬜ Richard |

## 6. Not in this task

A scheduled coach (a routine that runs without him), the coach writing to the todo list's `Task` beyond what
TPL-010-L rules, and any UI in the app that shows what the coach changed (the audit trail is on the box; a *changed by
the coach* marker on a row is one ruling away if a week of use asks for it).
