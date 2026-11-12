# HST-011 — The data dir in a store it is handed

**Opened 2026-11-05.** **Depends on HST-010.** **Status: ✅ done (session 9, 2026-11-05).** Kind: product. Seam 3 of HST-006 §7.2.

## 1. The person sentence

> **The app's rules, roles, keys and secrets are still there after Cloudflare restarts it, as its records already are.**

## 2. Why

The backend keeps `security.json`, `secrets.json`, `auth.json` and friends as files in its data dir. On a Worker
`node:fs` is the isolate's memory: replaced on an eviction or a redeploy. The spike copies the dir into the Durable
Object's storage after every non-GET and starts the service again from it (HST-006 §8.3), by reading the whole tree
each time: fine for a spike, not a product.

## 3. What to build

The service writes those files through one seam it is handed (a small key-value store: `get`, `put`, `delete`, `list`),
with the disk as today's default; on a Worker, the object's storage. A service that finds no running instance starts
from the store. Census first: every `fs` write under the data dir (`grep` by the dir, not by file name).

## 4. Acceptance criteria

1. Census of every data-dir write, each routed or named as out of scope with a reason.
2. Node: every backend suite unchanged.
3. On `hst-backend-spike` without the spike's `persistDir`: Fixture C's rules, role and secret survive a redeploy
   (`autoBoots: 1`), and MUST 1–8 still pass.

## 5. Session 9 — 2026-11-05 (Opus 5.5)

### 5.1 The census (AC1)

Every `fs` write under `packages/nodegx-backend/src` (writes, renames, unlinks, removals, streams; `grep` by the call,
then each file read for its path). Fourteen writers of the data dir's own files each had a copy of "write a temporary
file, rename it over": all now call one seam, `config/dataDirStore.ts` (`writeDataFile` / `writeDataJSON` /
`removeDataFile` / `removeDataDir`).

| file | writes | now |
|---|---|---|
| `security/state.ts` | `security.json`, `secrets.json` (admin token, 0600) | routed |
| `config/SecretsStore.ts` | `secrets.json` (function secrets, webhooks; 0600) | routed |
| `security/projectPolicy.ts` | `security.json` from the project's `nodegx.security.json` | routed |
| `auth/AuthConfigState.ts` | `auth.json` | routed |
| `email/EmailConfigState.ts` | `email.json` | routed |
| `ops/OpsState.ts` | `ops.json` | routed |
| `search/SearchState.ts` | `search.json` | routed |
| `storage/config.ts` | `files.json` | routed |
| `backup/config.ts` | `backups.json` | routed |
| `triggers/registry.ts` | `triggers.json` | routed |
| `server/admin-views.ts` | `views.json` | routed |
| `workflow/ApiCallRegistry.ts` | `api-calls.json` | routed |
| `workflow/WorkflowRegistry.ts` | `workflow-defs/*.json` (write, delete, rewrite-all) | routed |
| `workflow/WorkflowRunner.ts` | `workflows/*.workflow.json` (deployed cloud functions; write, replace, delete) | routed |
| `backup/schema-migrate.ts` | `security.json`, `triggers.json`, `email.json` (the `/admin` schema apply, reachable over HTTP) | routed |
| `persistence/createAdapter.ts`, `execution/ExecutionStore.ts` | `mkdirSync` only | nothing to keep |
| `backup/archive.ts`, `backup/snapshot.ts` | backup archives, a snapshot's work folder | out: written to the backup's destination |
| `backup/BackupManager.ts` | restore swaps `data/local.db` and the archived config | out: a stopped-service operation; on a Worker the records are the object's SQLite (backups on a Worker are their own question) |
| `server/files.ts`, `storage/FileSubsystem.ts` | the thumbnail cache, and clearing it | out: a cache, rebuilt on a miss |
| `storage/LocalDriver.ts`, `storage/S3Driver.ts` | file bytes | out: HST-012 |
| `cli.ts`, `migrate/move.ts`, `migrate/verify.ts` | the command line | out: a machine with a disk |

The census is a gate now: `tests/p115-hst011-data-dir-store.test.ts` lists every file under `src/` that still writes
the disk directly; a new one, or a name on the out list that no longer writes, is red.

### 5.2 The shape

`BackendServiceOptions.dataDirStore` (null by default: every Node spawner, unchanged): `list`, `get`, `put`, `delete`
over relative paths and text, **synchronous** because every writer is (a Durable Object's `sql.exec` is). At `start()`
the store's files are written into the data dir before anything reads one; from then on each write or removal through
the seam changes the disk as before and then the store. A store that refuses a write fails that request (a setting kept
only in the isolate's memory would vanish at the next restart without anyone told). `stop()` lets the store go.

Reads stay on the disk: after the restore it holds what the store holds, and the ~30 read sites are unchanged. The
spike's copy of the whole tree after every non-GET is gone; it hands in a table in the object's SQLite
(`_nodegx_data_dir`; `listTables` skips `_` names, so it is never a collection) and keeps only its boot record.

### 5.3 Graded in Node (AC2)

- `tests/p115-hst011-data-dir-store.test.ts`, 3/3. Each arm sets an app up over HTTP (a collection rule, a function
  secret, a schedule, a deployed cloud function), stops, **deletes its data dir**, and starts a second service in a new
  empty one: the **control** (no store) has lost all four and a fresh admin credential was minted; **handed** a store
  has all four back and the first service's credential still opens it. Then a removal reaches the store, a store that
  refuses a write fails that request (5xx), `stop()` lets the store go, and the census gate (§5.1).
- Mutant: the store write in `writeDataFile` switched off → the handed arm red, the control and census green. Restored.
- The whole `nodegx-backend` suite (`--runInBand`, 3,948 s): **315 files pass, 4 fail, none HST-011's**:
  `ac2-page-editor-drag-drive` (Chrome: hangs in this sandbox), `rel002b-fail-closed` (filed, P116-S13-REL002B),
  `isl-010-local-model` (a model's prompt and answer are on the run record: **P115-S9-MODELPROMPT**, high, filed),
  `ops-audit` (`PUT/DELETE admin/api-calls/:id` have no audit action: **P115-S9-APICALLSAUDIT**, filed). Each is in
  committed code no session had open, and none reads or writes the data dir's config files.
- 🔴 jest in this sandbox hung at 0% CPU until `--no-watchman`.

### 5.4 Graded on workerd and live (AC3)

Under `wrangler dev` with one persisted state folder:
1. Session 7's worker (`HST_ENTRY=<its worker.ts> node build.mjs`, the build's new override), Campus seeded, Ada's
   answer saved: `check-campus.mjs` 13/13, files kept the session 7 way (`hst:file:*`).
2. The HST-011 worker over the same state: the first request found no service, **moved session 7's 4 files into the
   store once** (`migratedFromSession7: 4`, old keys deleted), started from it (`autoBoots: 1`): 12/12. A secret set
   over HTTP reached the table as it was written (`puts` 4 → 5).
3. Restarted again: started from the store alone (`migratedFromSession7: 0`), 12/12, the secret still listed.
4. Three of the backend's own suites against it: **42/42** (security-enforcement, isl040-sessions, bmg-005-roles; the
   service wrote its files through the seam 25 times). First run 41/42: the route walk found `GET /mcp` answered 200
   by the app's page. Not HST-011: session 7's one-origin router decides by a hand list of path prefixes, which missed
   `apps`, `executions`, `mcp`, `metrics` (**P115-S9-SITEROUTES**, fixed in the spike; HST-014 AC4 now says the
   product routes by the service's route table).

Live on `hst-backend-spike` (Richard's Campus, nothing re-seeded):
| reading | result |
|---|---|
| before (session 8's version) | 12/12; data dir `ops.json`, `search.json`, `secrets.json`, `security.json` (hashes kept) |
| deploy `1b48270c` (HST-011) | 12/12; `migratedFromSession7: 4`, `autoBoots: 1`; the 4 files byte-identical by hash |
| deploy `16875ec8` (again, the store alone) | 12/12; `migratedFromSession7: 0`, `autoBoots: 1`, `puts: 0`; files identical; `GET /mcp` signed out → 401 |
| MUST 8 (`--upload`) | the owner's file stored and opened at its link, signed out, 200 |

**AC1 ✅ AC2 ✅ AC3 ✅** (MUST 1–8 read over HTTP as the page makes its calls; Richard's phone is not needed for this
ticket: nothing he sees changed).

### 5.5 Left for later tickets

- The boot record (`hst:boot`: which backend, which options) is still the spike's. The deploy command (HST-014) owns it.
- Backups on a Worker: `BackupManager` writes archives to a local destination and restores `local.db`; neither means
  anything in a Durable Object. Not ticketed; say so if backups are asked for on Cloudflare.
