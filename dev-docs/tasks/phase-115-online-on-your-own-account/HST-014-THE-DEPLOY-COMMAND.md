# HST-014 — The deploy command

**Opened 2026-11-05.** **Depends on HST-010…013.** **Status: 🔨 built, session 12 (2026-11-06, `579657bed`), §5: LIVE on `hst-campus` (§5.5): Richard ran the command; AC2, AC3, AC4 and MUST 1–6 and 8 read over HTTP on Cloudflare; AC1 waits only on his phone.** Kind: product.

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

### 5.4 Left

1. **AC1:** Richard runs the command against a NEW Worker name (`hst-campus`); then `check-campus-deploy.mjs
   ~/.nodegx/cloudflare/hst-campus --seed --answer --upload` and MUST 1–8 on his phone. Then AC2 live: run the command
   again and read the same list.
2. Workflows and triggers are taken at a backend's FIRST start only. A change to `nodegx.automations.json` after that is
   not carried by a redeploy: it needs upserts through `/admin/workflow-defs` and `/admin/triggers`, and the command says
   so on every deploy that has the file.
3. `nodegx deploy --cloudflare` and the MCP tool: the command lives beside the backend because it bundles the backend's
   source, like `nodegx deploy`'s engine. The npm CLI delegating to it waits on where the engine lives (P112 R2).
4. Not carried from the Fixture B Worker: the refusal alert (HST-004 §10, the HTML export's client) and the warm-up at
   startup (HST-004 §9). The whole service in an object starts in ~40 ms (§7), so the warm-up may not be needed. Measure
   with `wrangler tail` first.
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

Left for AC1: MUST 1–8 on Richard's phone (line 7: his tap's answer, then a redeploy, then the owner's list).
