# HST-006 — The backend contract on Workers and D1

**Opened 2026-10-07.** **Depends on HST-002, P34's `@noodl/backend-contract`.** **Status: 🟡 records half measured
(session 5, 2026-11-04); users, files and realtime not yet.** Kind: experiment.

## 0. The recommendation for R3 (AC4), as of session 5

**Keep R3 as recommended: a spike here, the adapter its own phase. But the adapter is much smaller than it looked,
and it is not a D1 adapter.** The built-in backend's record store runs on Cloudflare **unchanged**, inside a
SQLite-backed **Durable Object**, through a 127-line engine shim. On your account it passes **99 of the contract's 102
conformance cases** (three runs, the same three reds each time). D1 cannot take the same store: the store is
synchronous at 165 call sites and D1 only answers promises, so D1 would mean a third adapter the size of the Postgres
one (≈100 KB of TypeScript).

What the three reds cost:
1. **Regex filter**: a Durable Object's SQL cannot call JavaScript. Declare it unsupported (the editor greys it out),
   or filter in the Worker. Small.
2. **Two five-hop path cases**: Cloudflare caps SQLite's expression depth at 100 (P115-HST006-EXPRDEPTH). Flatten
   the path SQL. Half a session.
3. Not a red, a hole: the schema code's 25 `BEGIN`/`SAVEPOINT` pairs a run cannot be sent to a Durable Object, and **no
   case notices** (P115-HST006-NOROLLBACKCASE). Route them through `db.transaction()` and add rollback cases. Half a
   session.

What it changes in the person sentence: the bill is **$0 on the Free plan**, refused (never billed) past **100,000
rows written a day**. One new record writes 4 rows, so that's about 25,000 new records a day, and reads are 5 million a
day. Not "$5 plus D1".

Still unmeasured, and the next sessions: **users and sign-in** (the backend's HTTP layer, not the store), **files**
(R2), **realtime** (a Durable Object's WebSockets), and Fixture C itself, which does not exist yet (AC2).

## 1. The person sentence

> **A full-stack app with records and users, and still no server to look after. The records are in a database on the
> person's Cloudflare account, exportable before anything expires, and the bill is $5 plus whatever D1 charges past
> its free tier.**

## 2. Why

README §4: the Workers route wins shape C only if a Workers + D1 adapter can honour enough of the contract. Nobody
knows how much. The contract exists as types and frozen data with no I/O (`@noodl/backend-contract`), which is exactly
the shape a second adapter registers against, and the backend's operational store already speaks SQLite, which D1 does.

## 3. What to measure

For each capability the contract names (data, auth, filters, roles, files, realtime, mail, triggers): does D1 plus
Workers honour it against the contract's own tests, and if not, what does (R2 for files, Durable Objects for realtime,
a mail API for `nodemailer`)? A table, one row per capability, with the test that graded it.

Also: the exit. ECO-004 says records must be retrievable. One command exports every D1 table to files the person can
read, graded by reimporting into the Node backend.

## 4. Acceptance criteria

1. The capability table exists with every row graded by a test, not by reading the docs.
2. Fixture C's `MUST.md` is ticked from Workers + D1, or the rows that block it are named.
3. The export-and-reimport round trip passes on fixture C's records.
4. A recommendation for R3 at the top of this file, with the cost of the adapter in rows that failed.

## 5. Not this task

Shipping the adapter. Migrating anyone. Mail, if nothing on Cloudflare sends it: that row says "elsewhere" and stops.

## 6. Session 5 — 2026-11-04 (Opus 5.5): the record store in a Durable Object, graded by the contract's own suite

### 6.1 Why a Durable Object and not D1

The backend's whole record stack (`LocalSQLAdapter`, `SchemaManager`, `QueryBuilder` in
`packages/noodl-runtime/src/api/adapters/local-sql/`) is written against a **synchronous** better-sqlite3-shaped
handle (`engine.ts`): 33 `this.db.` call sites in the adapter, 127 in SchemaManager, 5 in QueryBuilder. D1's API is
promise-only, so D1 could only sit behind a rewrite. A SQLite-backed Durable Object's `ctx.storage.sql.exec()` is
synchronous, and the adapter already takes an injected engine (`options.engine`, the WF-004 seam). So the spike is a
shim, not an adapter: `spike-records/src/doEngine.ts`.

What a Durable Object refuses, read 2026-11-04 from Cloudflare's SQL storage page and then measured:
- `BEGIN` / `COMMIT` / `SAVEPOINT` in SQL (transactions are `ctx.storage.transactionSync(fn)`). The shim answers
  `db.transaction(fn)` with `transactionSync` (17 calls a run) and **drops and counts** every transaction statement
  sent through `exec()` (SAVEPOINT 23, RELEASE 23, BEGIN 2, COMMIT 2 a run).
- `PRAGMA journal_mode`, `secure_delete`, `wal_checkpoint` (SQLITE_AUTH; `table_info` is allowed). `secure_delete`
  is P112-OWN026-DELETELEAVESBYTES's fix, so on Cloudflare "deleted for good" rests on Cloudflare's storage.
- User-defined SQL functions (none in the docs): no `nodegx_regexp`, no geometry predicates.
- Expression depth over 100 (measured; not in the limits page).

### 6.2 The grade: the conformance suite inside a Durable Object

`spike-records/` is a Worker (`hst-records-spike`) with a Durable Object class `Records`. `GET /__conformance` runs
`runConformance()` (BRG-003: the same suite `brg-003-conformance-sqlite.test.ts` runs in Node) inside a fresh object,
against `new LocalSQLAdapter(…, { engine: durableObjectEngine(storage) })`, and the object then deletes its own
storage. The doors need `?key=` (a deploy `--var`, kept in the gitignored `.run-key`); without it they answer 404.

| arm | where | passed | the reds |
|---|---|---|---|
| control "faithful": the shim over a fake Durable Object on `node:sqlite` (refuses nothing) | Node 22.22 | **101 / 102** | `filters/regex` (left out on purpose) |
| control "refusing": the fake also refuses BEGIN… and every PRAGMA but `table_info` | Node | 98 / 102 | + 3 schema cases that read `index_list` (the fake refused more PRAGMAs than Cloudflare does: the real one below passes them) |
| a Durable Object under `wrangler dev` | workerd, local | **99 / 102** | regex; `paths/five-hops-the-members-on-my-accounts-companies`, `paths/the-acl-applies-at-every-hop`: *Expression tree is too large (maximum depth 100)* |
| a Durable Object on Richard's account, 3 runs | Cloudflare | **99 / 102** ×3 | the same three |

By area on Cloudflare: records 20/20, filters 13/14, acl 17/17, relations 6/6, paths 12/14, schema 16/16, series 15/15.
The "faithful" control is why the reds belong to the Durable Object and not to the shim. It also proves the hole: it
drops every transaction statement too, and the suite still passes (P115-HST006-NOROLLBACKCASE).

CPU, from `wrangler tail --format json` (`evidence/cpu-live-tail.json`): a full suite run costs **675, 1,644 and 709 ms**
inside the object (6,779 statements). A Durable Object request may use 30 s. The front Worker costs 1–3 ms. (Inside
the object `Date.now()` stays frozen while it computes, so the suite's own `wallMs` of 20 means nothing.) One suite run
reads ~752,000 rows, 15% of the Free day, so it stopped at three.

### 6.3 What ordinary work costs on the Free plan (`GET /__ops`)

A declared 4-column collection (`email`, `name`, `score`, `done`) seeded with 50 rows, on Cloudflare
(`evidence/ops-live.json`):

| operation | rows read | rows written | statements |
|---|---|---|---|
| create 1 | 7 | **4** | 7 (4 are doomed `ALTER TABLE ADD COLUMN`: P115-HST006-ALTERPERCREATE) |
| fetch 1 by id | 7 | 0 | 2 |
| list 20 where `done = false` | 46 | 0 | 3 |
| update 1 | 8 | **2** | 4 |
| count where `done = true` | 57 | 0 | 3 |
| delete 1 | 8 | **1** | 4 |

The whole probe (connect, the table, 51 creates, the reads) cost **27 ms CPU**. Free plan, read 2026-11-04 on
Cloudflare's pricing pages: Durable Objects (SQLite only on Free) 100,000 requests, 13,000 GB-s, 5 M rows read and
**100,000 rows written** a day, 5 GB stored; over any one, *"further operations of that type will fail with an
error"*, never a bill. D1's Free limits are the same rows and storage, and **D1 is on Free** (the README's 2026-10-07
note "D1 is not in the $5" is outdated). Paid: $5 a month includes 50 M rows written and 25 bn rows read.

### 6.4 The exit (AC3): export, reimport into the Node backend, same answers

There is no `wrangler` export for a Durable Object's database (D1 has `wrangler d1 export`), so the exit is ours:
`src/exit.ts` (43 lines) writes every table, index and trigger statement from `sqlite_master` and every row,
`_Schema` and the `_Join_*` relation tables included, as one JSON file.

`GET /__exit` writes a small fixture-C-shaped set through the adapter on Cloudflare: 12 learners (a `Date`, a
`Boolean`, a name with quotes and an apostrophe), 40 interactions (a `Number`, an `Object`), 2 badges, 3 relation
edges. It records what the adapter answers, then exports (32 KB, 13 tables and indexes, 60 rows). `src/reimport.ts`
builds `<tmp>/data/local.db` from the file and opens it **the way the Node backend opens a data dir**
(`createAdapter({ dataDir })`), then asks the same 7 questions (all rows of each collection, a count, a filtered list,
two relation reads).

- **All 7 answers deep-equal, and the moved backend takes a new write: exit 0.**
- Control: the same file with one interaction's score changed: exit 1, both questions that read it named.

### 6.5 The capability table (AC1), so far

| capability | on Cloudflare | graded by |
|---|---|---|
| records: create, fetch, save, delete, count, distinct, aggregate, increment | ✅ Durable Object | conformance `records` 20/20, live ×3 |
| filters | 🟡 all but regex | `filters` 13/14; regex needs JS in SQL |
| row rules (ACL) | ✅ | `acl` 17/17 |
| relations | ✅ | `relations` 6/6, and the exit's relation reads |
| paths | 🟡 up to the depth cap | `paths` 12/14 (P115-HST006-EXPRDEPTH) |
| schema moves (declare, index, drop, retype) | 🟡 answers right; atomicity not graded | `schema` 16/16 (P115-HST006-NOROLLBACKCASE) |
| numbered series | ✅ | `series` 15/15 |
| the exit | ✅ | `reimport.ts` SAME, tampered DIFFERENT |
| schedule triggers | ✅ Worker cron | HST-004 §6, §8 |
| D1 as the store | ❌ without a rewrite | the call-site count in §6.1, not a run |
| users and sign-in | ⏳ not measured | (the backend's HTTP layer: `nodegx-backend/src/auth`, `users`) |
| files | ⏳ not measured | candidate: R2 through the existing `S3Driver` (R2 speaks S3) |
| realtime | ⏳ not measured | candidate: the Durable Object's own WebSockets |
| mail | elsewhere | HST-004 §10 (Resend; Cloudflare's sending needs a domain on Cloudflare) |

One shape note for the adapter phase: one app = one Durable Object = one thread. Every request for that app's records
passes through it in turn, which is plenty for dozens of users and is also what makes the synchronous store safe.

### 6.6 How to run it again

```
cd spike-records            # node_modules is a symlink to ../spike-worker/node_modules (wrangler 4.157)
node_modules/.bin/esbuild src/control.ts  --bundle --platform=node --format=cjs --outfile=dist/control.cjs  --tsconfig=tsconfig.json
node_modules/.bin/esbuild src/reimport.ts --bundle --platform=node --format=cjs --outfile=dist/reimport.cjs --tsconfig=tsconfig.json
node dist/control.cjs                                   # the two control arms
node_modules/.bin/wrangler dev --port 8797              # then curl /__conformance, /__ops, /__exit
node_modules/.bin/wrangler deploy --var "RUN_KEY:$(cat .run-key)"
curl -s "https://hst-records-spike.richard-digitalbricks.workers.dev/__exit?key=$(cat .run-key)" > exit.json
node dist/reimport.cjs exit.json; echo $?               # 0 = the same answers
```
