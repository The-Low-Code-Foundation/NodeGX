# HST-014 — The deploy command

**Opened 2026-11-05.** **Depends on HST-010…013.** **Status: ✅ done, session 12 (2026-11-06, `579657bed`), §5: Fixture C deployed by the command alone to a new Worker (`hst-campus`), MUST 1–8 on Richard's phone (AC1), a second and a third run kept everything (AC2), nothing private uploaded (AC3), one origin by the route table (AC4). The follow-ups are in §5.4.** Kind: product.

## 1. The person sentence

> **The person says "put it online"; Claude runs one command, and a full-stack app answers on their own Cloudflare
> account, the same address every time, without wiping what is already there.**

## 2. Why

Today a person would need what the spike does by hand: `site.mjs` (the interpreter site with the production viewer),
`seed-campus.mjs` (boots FRESH, which wipes), and `wrangler deploy` with a hand-written `wrangler.toml`
(Durable Object, assets, R2 binding). The spike's `worker.ts` holds the seams HST-010…012 turn into product options.

## 3. What to build

`nodegx deploy --cloudflare` (and the MCP's equivalent): the Worker entry as a product file (the host that passes
`loopbackFetch`, the store and the bucket), the site built with the production engine, the project's rules, roles and
collections applied to the running backend (never a fresh boot of a live one), the refusal alert (HST-004 §10)
carried over, and the warm-up at startup (HST-004 §9).

## 4. Acceptance criteria

1. Fixture C deployed by the command alone to a new Worker name on Richard's account, MUST 1–8 on his phone.
2. A second run of the command keeps every record, account and file.
3. No key or token in any uploaded or committed file (phase AC7).
4. (added s9, P115-S9-SITEROUTES) The page and the backend share one origin by the service's own route table, not a
   hand list: a GET on every route's first segment reaches the backend (the spike's list missed `mcp` and three more,
   and `security-enforcement`'s route walk caught `GET /mcp` answered by the page).

## 5. Session 12 — 2026-11-06 (Opus 5.5): the command, graded on workerd

### 5.1 What was built

`packages/nodegx-backend/cloudflare/`, the spike's scripts made product files:

| file | what |
|---|---|
| `deploy.mjs` | the launcher: `node packages/nodegx-backend/cloudflare/deploy.mjs <project> [--name] [--viewer] [--local] …`. It bundles `deployCloudflare.ts` with the repo's esbuild into `.build/` (gitignored) and runs it |
| `deployCloudflare.ts` | the command, in six steps. (1) The cloud functions are bundled by the editor's own bundler (`noodl-mcp/dist/cloud-bundle.cjs`) and their code printed (`collectCode`). (2) The site is `nodegx deploy` of a copy, with the production viewer swapped in from `--viewer` (graded by `readViewerBuild`, EXP-017's own test) and every hidden file left out. (3) The Worker. (4) Every uploaded file is searched for the admin credential and the `.env` values. (5) `wrangler deploy`, or `wrangler dev` with `--local`; the first deploy makes the bucket and sends `NODEGX_ADMIN_TOKEN` with `--secrets-file`. (6) `applyProject`, then the functions go up through `deployCloudBundle`, the editor's own push |
| `worker.ts` | the host. The service gets four OPTIONS and no patches: `recordEngine` (new this session), `dataDirStore`, `filesBucket` and `loopbackFetch`. It has no boot door: it starts on the object's first request from what the object keeps. The project's policy and automations go into a project dir for the service's own first-start seeding (SB-015, P127 BKO-001), which is inert on a backend that has them. It answers `nodegx-config.json` with the request's origin, so the site works at any address and nothing is baked. It routes by the service's route table, asked of the object once per isolate (`/__nodegx/route-families`, never forwarded from outside) |
| `applyProject.ts` | the project onto a RUNNING backend, never a boot. Collections go up through `/admin/schema/apply` as a union, so a table or column the backend has and the project lacks is kept and named, and the backend's own `/admin/schema/diff` says which declared ones those are. Rules go through `PUT /admin/permissions` when they differ. Roles named by the rules are made on a FIRST deploy only (or `--make-roles`) |
| `routing.ts`, `dataDirTable.ts`, `wranglerConfig.ts` | pure: the asset-or-backend decision, the settings table and the `wrangler.toml` |
| `durableObjectSql.ts`, `nodeSqlite.ts` | moved from `spike-records/src/doEngine.ts` and `spike-backend/src/nodeSqliteShim.ts`. The spikes keep their copies as the graded record of sessions 5–13 |

Product change: `BackendServiceOptions.recordEngine` → `createAdapter({ engine })` → the adapter's existing `engine`
option. It replaces the spike's `LocalSQLAdapter.prototype.connect` patch (seam 1); null on Node, so nothing changes there.

The Worker build reuses the backend's own esbuild settings (`scripts/build.js` `shared`). 🔴 The spike's build left out
that config's banner `_noodl_cloud_runtime_version`, so on workerd the cloud runtime ran its BROWSER branches (seven
modules check the flag, `_getCurrentUser` among them). The product build has it. Sessions 6–13 graded the spike without it.

### 5.2 Graded

| what | how | reading |
|---|---|---|
| applyProject, AC2 in Node | `tests/p115-hst014-cloudflare-deploy.test.ts`: a real `BackendService` started as the Worker starts it, with Fixture C's own files. First deploy, data, a second deploy of the same project, one of a changed project (a column, a rule), a collection made on the live app, an undeclared table in the database, a deleted role | 13/13. Mutant 1, union removed: the "kept" arm is red with the backend's own *Refusing to apply: DESTRUCTIVE*. Mutant 2, union over every physical table: the undeclared-table arm is red |
| AC4 by the table | the same file: every family of the live route table → backend for GET, HEAD and POST; the spike's pre-s9 list misses `mcp` and `metrics` | green |
| the earlier P115 suites + config | `tests/p115-*`, `config*.test.ts` | 57/57 |
| types | tsc over the new modules and the three changed files | 0 errors |
| Fixture C on workerd, first deploy | `deploy.mjs … --local`, then `fixtures/check-campus-deploy.mjs <folder> --seed --answer --upload` | 22/22: MUST 1–6 and 8, the address from `nodegx-config.json`, the production engine, `.accounts.json` 404, owner-only upload (the second account 403), AC4 `/mcp` 401, `/apps` 404 JSON, `/executions` 401, `/metrics` 200 (the curl IS loopback under wrangler dev; the live spike answers 401), `/__nodegx/*` 404 |
| AC2 on workerd | stop, run the SAME command again over the same `.state` (a new version, the same object), then the check with no seed | every account, the owner's role, Ada, her answer and the file uploaded before (`--file`) are kept; the admin credential is reused, nothing is made again |
| AC3 | step 4 of every run | 0 of 27 files hold the admin credential or a `.env` value; `.accounts.json` is left out (below) |
| cloud functions + automations | Fixture B `--local` | `subscribe` deployed through the admin API and answers its own *"MAILCHIMP_KEY secret is missing"*; a fresh backend seeded 2 workflows and the 08:00 trigger (enabled) from `nodegx.automations.json` |

### 5.3 Found

- 🔴 **P115-HST014-GITIGNOREDPUBLISHED (medium, filed):** `nodegx deploy` wrote Fixture C's `.accounts.json` (the two
  passwords; the project's `.gitignore` keeps it private) into the site, because the deploy reads `.noodlignore`, never
  `.gitignore`. The spike's `site.mjs` had removed it by hand, so sessions 7–11 never saw it. Contained for this route
  (hidden files are never published, and the output names them); the shared rule is the deploy owner's.
- 🔴 The first `--local` run declared the execution history's tables (`workflow_executions`, `execution_steps`,
  `operational_records`) as the app's collections. On a Worker `node:sqlite` is the object's one database, so
  `GET /admin/schema` (`listTables`) lists them beside the records, and the first union sent them back. Fixed before any
  live run: what is kept is what the backend's own diff says it would drop (`exportSchemas`). Filed as
  P115-HST014-HISTORYTABLES (low): the admin Data Browser on a Worker lists those three tables as collections.
- Not a defect: under `wrangler dev` a GET on `/metrics` is 200, because the request really comes from 127.0.0.1. The
  live spike answers 401, so on Cloudflare the service sees the visitor's address.

### 5.4 Left (follow-ups, not ACs)

1. ✅ AC1 and AC2 live (§5.5).
2. ✅ (session 14, §5.6) Workflows and triggers are taken at a backend's FIRST start only. A change to
   `nodegx.automations.json` after that is now carried by a redeploy (`applyAutomations.ts`), by the VM deploy's rule.
   It also found that a schedule never fired on a quiet deployed app: fixed in [HST-016](HST-016-SCHEDULES-ON-THE-OBJECTS-ALARM.md).
3. `nodegx deploy --cloudflare` and the MCP tool: the command lives beside the backend because it bundles the backend's
   source, like `nodegx deploy`'s engine. The npm CLI delegating to it waits on where the engine lives (P112 R2).
4. Not carried from the Fixture B Worker: the refusal alert (HST-004 §10, the HTML export's client) and the warm-up at
   startup (HST-004 §9). **Warm-up: measured, not needed (§5.6).** The alert: see §5.6 and README §8 R8.
5. wrangler is not a dependency of any package. The command takes `NODEGX_WRANGLER`, a `wrangler` it can resolve, or
   `npx --yes wrangler@4`.

### 5.5 Live, 2026-11-06

Richard ran the command from his terminal: a NEW Worker `hst-campus` (https://hst-campus.richard-digitalbricks.workers.dev),
a new bucket `hst-campus-files`, the admin credential up as a secret with the first deploy. Then, from this session:

| reading | result |
|---|---|
| `check-campus-deploy.mjs ~/.nodegx/cloudflare/hst-campus --seed --answer --upload` (no boot: sign-ups, the role, Ada and Grace by import) | 22/22: MUST 1–6 and 8 as calls, the address from `nodegx-config.json`, production engine 1.82 MB (built 11-06), `.accounts.json` 404, owner-only upload, `/mcp` `/metrics` `/executions` 401, `/apps` 404 JSON, `/__nodegx/*` 404. The `owner` role was already there for the seed: the first deploy's apply made it |
| the SAME command run again (version `d7b8725a`; no secret sent, "No updated asset files to upload") | collections and rules: already there, nothing made |
| the check after it, no seed, `--file` of the file uploaded before | 15/15: the accounts, the role, Ada, her answer and the file are all kept (**AC2 live**) |
| wrangler's "Read 29 files" against step 4's 24 site files | 24 files + 5 folders: wrangler counts the folders; nothing else went up |

**AC1, Richard's phone (2026-11-06):** *"Done! All worked as expected"*: MUST 1–6 and 8 on the live address. Line 7:
after his tap, the command was run a third time (version `0dec9022`), and the owner's list read 2 answers over HTTP
(the check's and his), with the file uploaded before still at its link. 🔴 `MUST.md` is published at `/MUST.md` (Ada's
id, no password): `nodegx deploy` copies a project's top-level `.md`. Harmless for the fixture; it belongs with
GITIGNOREDPUBLISHED's ruling on what a deploy publishes.

### 5.6 Session 14, 2026-11-07 (Opus 5.5): HST-015 live, automations carried by a redeploy, the warm-up measured

**HST-015 live.** Richard ran the redeploy (record: 4th deploy, 08:56:11 UTC). `check-campus-deploy.mjs` without
`--seed`: 14/14, every account, answer and rule kept. The four `$regex` reads: `da` → `["Ada"]`, `^Gr` → `["Grace"]`,
`ADA`+`i` → `["Ada"]`, all 200 (were 500 `no such function`); `^.r` → 400 *"The built-in backend cannot filter on a
pattern (a regular expression) on Cloudflare … "Contains", "starts with" and "ends with" on a text field still work."*

**Automations carried by a redeploy** (`cloudflare/applyAutomations.ts`, called from step 6). The rule is the VM
deploy's (`deploy/folder/start.js` `planAutomations`, Richard 2026-10-23): the project's file replaces the backend's when
it changed since the last deploy; an edit made on the backend lasts until then. The sha256 installed is kept in
`deployment.json` (`automations.local` / `.live`: two backends). Four answers: *none* (no file), *unchanged* (no write;
a difference made on the backend is NAMED), *agree* (a new file the backend already runs: recorded), *replace* (the
backend's set saved as `automations.before-<time>.json` beside the record, then saved calls → workflows → triggers
made or changed, then triggers → workflows the file dropped deleted; saved API calls never deleted, as on the VM).
All or nothing: a refusal part-way puts back what was there. An update keeps a webhook's secret; a new one is minted
and named; an hmac-sha512 hook the backend lacks is left out and named (BKO-001's seeding rule).

- `tests/p115-hst014-automations-on-redeploy.test.ts` 8/8 on a real `BackendService` seeded from Fixture B's own file;
  the control is that a seeded backend reads as *agree* (no write). Mutant: the put-back off → the refusal case red.
- workerd, a copy of Fixture B (`--local --out <scratch>`): first deploy *"the backend already runs the project's (2 and
  1)"*; **then the drive caught what the suite could not** (P115-HST014-AUTOMATIONSFORGOTTEN): `deploy()` rebuilt the
  record without the new field, so an unchanged redeploy *replaced* a trigger switched off on the backend. Fixed;
  re-driven: unchanged → *"the backend keeps its own, which were edited there since: trigger "trg_digest_daily"
  differs"*, still off; the file changed (07:30, a new workflow) → *"made workflow "thank-you"; changed trigger"*, the
  previous set kept beside the record, the trigger 07:30 and on.
- Not live: Campus has no automations file, and a first deploy of Fixture B sends the admin credential (Richard's
  terminal). Live, it rides with HST-016's night reading.

**The warm-up, measured live** (`wrangler tail --format json` on `hst-campus` during the Campus check + the four
regex reads, 29 events, all `ok`): the front Worker 0–6 ms CPU (median 0); the object 1–54 ms (sign-in 40–54, scrypt;
its cold start 16 ms on the first call). A Free Worker's measured cut-off is ~2 s (HST-004 §10.1) and an object's is
30 s. **Not carried.**

**The refusal alert, measured but not built.** A Durable Object has 30 s of CPU per call, so the 1102 that HST-004 §10
built for is out of reach on the backend, and the front Worker routes in ≤ 6 ms. What a deployed app can really hit is
the account's daily allowances (100,000 requests each for Workers and objects, 100,000 rows written, 5M rows read,
13,000 GB-s; 00:00 UTC). Cloudflare does not publish what an object answers once over one, and measuring it means
spending the account's allowance for the rest of a UTC day (every Worker on it, HST's spikes included). Also: with
`run_worker_first = true` every file the page loads runs the Worker (the tail lists `/noodl.deploy.js` and
`/nodegx-config.json` as Worker events), so one page view is several of the 100,000 requests; how many per view is not
counted yet. Asked as README §8 R8.

