# HST-006 — The backend contract on Workers and D1

**Opened 2026-10-07.** **Depends on HST-002, P34's `@noodl/backend-contract`.** **Status: 🟡 records (session 5) and users
and sign-in (session 6) measured, 2026-11-04; files, realtime and Fixture C not yet.** Kind: experiment.

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

**Session 6 moved the recommendation further: not "an adapter", the whole service.** The built-in backend's
`BackendService`, unchanged (HTTP layer, access gate, users, sessions, roles, rules, the execution history), boots
inside one Durable Object in 40–120 ms, and **67 of the 76 cases in nine of the backend's own HTTP suites pass on
Richard's account** (users, sign-in, sessions, roles, row rules), the same 67 as locally (§7). Node: 76 / 76. The 9 reds
have one cause: a code node in a cloud function cannot run on a Worker (P115-HST004-NOCODEGEN). What it took, four
seams and no product change: the store's engine (session 5), `node:sqlite` for the history, the data dir on Workers'
in-memory `node:fs`, and the service's call to itself (P115-HST006-LOOPBACK). What it costs: a sign-up 74 ms of CPU,
a sign-in 62 ms (the password hash), every other call 1–15 ms, and a Durable Object request may use 30 s.

So the adapter phase is three things, not a rewrite: (1) the two product changes the seams stand in for (the
runtime's transport to its own backend in-process; the data dir's files kept in the object's storage, since isolate
memory goes with the isolate), (2) code nodes printed at deploy (NOCODEGEN), (3) session 5's three reds.

Still unmeasured: **files** (R2), **realtime** (a Durable Object's WebSockets), **email** from the object, and Fixture C
itself, which does not exist yet (AC2).

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
| users and sign-in (password) | ✅ whole service in a Durable Object | 9 suites 67/76 live, §7; sign-up 74 ms CPU, sign-in 62 ms |
| sessions (end, renewal, sign-out, restart) | ✅ | `session-expiry` 4/4, `isl040-sessions` 11/11 live |
| roles and row rules over HTTP | ✅ | `security-enforcement` 22/22, `bmg-005-roles` 9/9, `p127-duplicate-role` 4/4, `f84` 8/8, `p121` 4/4 live |
| cloud functions that need a signed-in caller | 🟡 with the loopback seam | `p127-no-roles` 0/11 → 5/11 (P115-HST006-LOOPBACK) |
| code nodes in a cloud function | ❌ | 9 reds, one cause (P115-HST004-NOCODEGEN) |
| provider and magic-link sign-in, email flows | ⏳ not run | `auth-linking`, `bmg-004-users` reach the mailer in-process |
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

## 7. Session 6 — 2026-11-04 (Opus 5.5): the whole backend in a Durable Object, graded by its own HTTP suites

### 7.1 Why the whole service

Users and sign-in are not the store: they are the service's HTTP layer (`server/users.ts`, `auth/sessions.ts`, the
access gate in `HttpServer.handle`, `SecurityState`). The backend's own suites for that layer start a `BackendService`
and talk HTTP to it. So the honest grade was to boot the real service where the records already live, and run those
suites unchanged against it.

`spike-backend/` (Worker `hst-backend-spike`, one Durable Object class `Backend`):
- `build.mjs` bundles the service (esbuild: html-as-text for the admin page, `node:sqlite` → the shim, `require` and
  `__dirname` given to the CommonJS inside), and wrangler uploads it as built: **4.76 MB, 1.13 MB gzipped** (Free
  allows 3 MB gzipped), **startup 40 ms** (1 s allowed).
- Inside the object the real service runs `listen()`; Cloudflare's Node HTTP server support
  (`httpServerHandler` from `cloudflare:node`) hands each request to it.
- `remote/BackendService.js` is what `../src/service` becomes for jest (`remote/jest.remote.config.js`): `start()`
  ships the suite's data dir to `/__hst/boot`, writes back what the service wrote (`secrets.json`, `auth.json`), and
  answers the Worker's URL. `facade` and `systemUsers`, for the two suites that reach in, are calls through
  `/__hst/call`. Doors need `?key=` (`.run-key`, gitignored); without it they answer 404.

### 7.2 The four seams (none in product code)

| seam | what Cloudflare lacks | the spike's answer | what the product needs |
|---|---|---|---|
| 1. the store's engine | `node:sqlite` | `LocalSQLAdapter.prototype.connect` resolves `durableObjectEngine` (session 5) | the existing `options.engine` passed by `createAdapter` |
| 2. the history's `new DatabaseSync()` | `node:sqlite` | `nodeSqliteShim.ts`: the same database; `PRAGMA auto_vacuum` refused, counted | the same, or the history in the store |
| 3. the data dir | a disk | Workers' `node:fs` (`/tmp`, the isolate's memory). Measured: files survive requests; **the ledger's counters reset between suites on Cloudflare, so the isolate was replaced at least once**, and a data dir there goes with it | `security.json`, `secrets.json`, `auth.json` … in the object's storage |
| 4. the service's call to itself | anything on 127.0.0.1 | a `fetch` to the service's own address goes to its in-process handler (P115-HST006-LOOPBACK) | the cloud runtime's transport in-process on a Worker |

Platform notes, measured under workerd: `process.versions.node` is `22.19.0`; `fs.rmSync(missing, { force: true })`
throws ENOENT (Node ignores it); a port a closed `http.Server` held cannot be listened on again (EADDRINUSE), so
each boot takes the next port.

### 7.3 The grade

Nine suites that start the service and talk HTTP (`packages/nodegx-backend/tests/`), unchanged, three arms:

| suite | Node (control) | Durable Object, `wrangler dev` | Durable Object, Richard's account |
|---|---|---|---|
| security-enforcement (cross-user isolation, CLP, keys, signup rule, the route walk) | 22/22 | 22/22 | 22/22 (the walk needs 50 s over the internet: timeouts ×4, `remote/slow-network.js`) |
| isl040-sessions (30-day end, renewal, restart, policy saved to auth.json) | 11/11 * | 11/11 | 11/11 |
| session-expiry | 4/4 | 4/4 | 4/4 |
| bmg-005-roles | 9/9 | 9/9 | 9/9 |
| p127-duplicate-role | 4/4 | 4/4 | 4/4 |
| f84-acl-visibility | 8/8 | 8/8 | 8/8 |
| p121-acl-null | 4/4 | 4/4 | 4/4 |
| p127-no-roles (functions that need a signed-in caller) | 11/11 | 0/11 → **5/11** with seam 4 | 5/11 |
| impersonate-session | 3/3 | 0/3 | 0/3 |
| **total** | **76/76** | **67/76** | **67/76** |

\* 10/11 at first: the census case named a file P124 had moved (P115-HST006-STALECENSUS, fixed `816929bcf`). It was
red in Node too, which is why the control arm runs first.

**Every one of the 9 reds is a code node** (`JavaScriptFunction`) in a cloud function: *Code generation from strings
disallowed*. Where the node leads to the Response, the call waits out the 30 s function timeout and answers 504
(P115-HST004-NOCODEGEN). Not run: `auth-linking` and `bmg-004-users` (they reach the mailer in-process).

That the suites really graded the object: the Worker's log carries every sign-up, sign-in and `/users/me` of each
run; and before seam 4, the functions failed with `principal: user` on a fresh isolate, from the first call.

### 7.4 What a sign-in costs on Cloudflare

`wrangler tail --format json` during the live run (`spike-backend/evidence/cpu-live-summary.json`, a sample: 608
events, 270 in the object). CPU per call, inside the object:

| call | p50 | max |
|---|---|---|
| sign-up `POST /users` | 74 ms | 108 ms |
| sign-in `POST /login` | 62 ms | 75 ms |
| password change `PUT /users/:id` | 82 ms | 82 ms |
| `GET /users/me` | 5 ms | 6 ms |
| create a record `POST /classes/Doc` | 6 ms | 10 ms |
| read a record | 4 ms | 8 ms |
| a cloud function (no code node) | 12–25 ms | 52 ms |
| boot the whole service | 35 ms | 121 ms |

The password calls are scrypt (`server/users.ts`). They run in the object, where a request may use 30 s of CPU; the
front Worker that forwards them costs 0–9 ms. 607 of 608 outcomes `ok` (the one `canceled` is a 30 s code-node wait
the client gave up on).

### 7.5 How to run it again

```
cd spike-backend                       # node_modules → ../spike-worker/node_modules
node_modules/.bin/wrangler dev --port 8796      # runs build.mjs itself
cd ../../../../packages/nodegx-backend
C=../../dev-docs/tasks/phase-115-online-on-your-own-account/spike-backend/remote/jest.remote.config.js
nice -n 19 npx jest -c $C --runInBand tests/session-expiry.test.ts tests/isl040-sessions.test.ts …
# live:
#   (spike-backend) node_modules/.bin/wrangler deploy --var "RUN_KEY:$(cat .run-key)"
#   HST_BACKEND_URL=https://hst-backend-spike.richard-digitalbricks.workers.dev HST_RUN_KEY=$(cat …/.run-key) npx jest -c $C …
```
The control arm is the same command without `-c $C`. The last suite's `afterAll` stops the service; the live Worker
then answers 503 to everything but its doors.

## 8. Session 7 — 2026-11-05 (Opus 5.5): Fixture C written through the MCP, and online on the whole-service Worker

### 8.1 Fixture C (HST-002), written through the MCP

`fixtures/c-campus` (*Campus*): HST-001's flow with records and a sign-in. **Home** reads `?id=` (Page Inputs), fetches
that **Reader** (Record), greets them by name and saves an **Answer** from either button (two Create Record nodes); a
made-up id or no id says the link is not recognised (a 1.5 s Delay → Condition on "found" covers the no-id case,
where nothing fails). **Owner** signs in (Log In, User) and lists every Answer (Query Records → Repeater of
`Answer Row`). 56 nodes, **0 code nodes**, 0 validator diagnostics, honesty 100% known.

The rules are the backend's, set with the MCP's own tools and written by them into `nodegx.security.json`: Reader
`get: public` (the id in the link is the key), `find`/writes `role:owner`; Answer `create: public`,
`find`/`get: role:owner`, `update`/`delete: nobody`; both `creatorOwns: false`. Accounts: the owner (in role `owner`)
and a second account to be refused, passwords in `.accounts.json` (gitignored).

How: this session's own MCP connection was bound to Fixture B (a server binds once), so the fixture's noodl-mcp ran
over stdio with the SDK's Client, `fixtures/mcp-calls.mjs`, every call logged in `fixtures/c-campus.mcp-log.jsonl`
(passwords and session tokens redacted). Five `drive_page` runs on a phone viewport against the local backend
passed: Ada greeted and her answer saved; a made-up id and a missing id say "not recognised" and show no name; the
owner reads *Ada · Count me in*; the second account gets the backend's 403 and the page says it cannot read them.

### 8.2 Which artefact a full-stack app ships

| route | Fixture C | size |
|---|---|---|
| plain-HTML export (Fixture B's route) | ❌ 15 nodes left out, the whole data path (P115-HST006-EXPORTDATAPATH, preflight in `spike-backend/evidence/`) | 4.4 MB with unused starter photos |
| interpreter site (`nodegx deploy`), development viewer | refused by the deploy itself (its source as a 10.9 MB inline map) | 17.3 MB engine |
| interpreter site, **production** viewer | ✅ every node runs, as in the preview | **2.93 MB** (engine 1.81 MB) |

The production viewer did not build: TS2554 in `userservice.ts` against the runtime's regenerated types
(P115-HST006-VIEWERTS2554, fixed this session; red since 2026-11-04 22:16, unseen). The session built only the deploy
bundle into a scratch folder (`OUT_PATH=… webpack --config <requires webpack.deploy.prod.js>`, 17 s), because
`build:editor:_viewer` runs `npm i` and `lerna clean` on a shared checkout. `spike-backend/site.mjs` writes the site
from a copy, aims it at the Worker (`nodegx-config.json`), swaps the engine in, and refuses to finish if a test
password is anywhere in it.

### 8.3 The Worker: an app beside the whole service, and seam 3 made real

- `[assets]` = `public/`, `run_worker_first`. A GET for a file is the file; any other path that is not one of the
  service's own (`/classes`, `/users`, `/login`, … , `/__hst`) is `index.html`, whatever the request's `Accept` says
  (a first version required `text/html`: `nodegx live` was told 404). Everything else goes to the object.
- **Seam 3:** after every non-GET the data dir's changed files go into the object's storage (`hst:file:*`), and the
  boot itself (`hst:boot`). A request that finds no service starts it again from those (`restarts` in
  `/__hst/ledger`). A stop forgets the boot, so a suite's `afterAll` still leaves it stopped. Measured: locally across a
  full `wrangler dev` restart, and live across two redeploys and one isolate Cloudflare replaced on its own a minute
  after the seed. Every time: Ada, the owner's role, both rules and the saved answer held, `autoBoots: 1`.
- No regression: three of the backend's own suites against the changed Worker locally, 21/21.

`seed-campus.mjs` boots FRESH with the project's `nodegx.security.json` and replays what the MCP did locally (role,
two sign-ups, the owner into the role through `/admin`, the two readers with their local ids, Answer declared).
`check-campus.mjs [--answer]` reads the MUST lines over HTTP as the page makes its calls.

### 8.4 Live on Richard's account (`a0c7bb47`), read over HTTP

| reading | result |
|---|---|
| `/home?id=<Ada>` and `/owner` | 200, the app (320–590 ms cold) |
| the engine | production, 1.81 MB |
| Ada by her id, signed out | 200 *Ada* |
| a made-up id | 404 |
| list readers / list answers / an answer by id, signed out | 403 / 403 / 403 |
| the owner signs in, reads the answers | 200, 200 (0 answers: left empty for Richard's tap) |
| the second account reads the answers | 403, no name |

Not read: the page in a browser (Chrome hangs in this sandbox). Richard's phone is the reading (Fixture C's MUST.md).

### 8.5 How to run it again

```
cd spike-backend
OUT_PATH=<scratch> nice -n 19 ../../../../node_modules/.bin/webpack --config <file: module.exports = require('<repo>/packages/noodl-viewer-react/webpack-configs/webpack.deploy.prod.js')>   # in packages/noodl-viewer-react
node site.mjs ../fixtures/c-campus https://hst-backend-spike.richard-digitalbricks.workers.dev <scratch>/deploy
node_modules/.bin/wrangler deploy --var "RUN_KEY:$(cat .run-key)"
node seed-campus.mjs https://hst-backend-spike.richard-digitalbricks.workers.dev     # ⚠️ FRESH: wipes the app's records
node check-campus.mjs https://hst-backend-spike.richard-digitalbricks.workers.dev
```
🔴 Running the backend's suites against this Worker boots FRESH and wipes Campus: run `seed-campus.mjs` after them.

### 8.6 Richard's phone, and a leak between two accounts (P115-HST006-STALEROWS, fixed)

Richard ticked MUST 1–4 and 6 on his phone. Line 5 failed: signed in as the second account **after the owner had
signed out on the same phone**, the page showed *Ada · Count me in* and its date beside *"This account cannot read the
answers."* The server had refused (403). Reproduced with drive_page in that order. The session's own drive had used a
fresh browser per account, which cannot show it.

Cause: Query Records keeps its rows when a re-fetch fails (REL-011b, so a blip does not blank a published page), and
the query's error callback dropped the HTTP status, so a refusal looked like a blip. Fix in the product: the status
travels (`QueryOptions.error(err, status)`), and a 401/403 clears the rows; anything else still keeps them. Unit and
mutant-checked; the production engine rebuilt with it and redeployed (`34f862a8`, `401===n||403===n` in the served
`noodl.deploy.js`).

🔴 drive_page renders with the SHARED development viewer (`noodl-editor/src/external/viewer/noodl.viewer.js`, built
2026-11-03), not the source: every drive this session ran Nov 3's runtime, and the fix cannot be driven there without
rebuilding a folder peers' editors use. The phone is the reading: Richard re-read MUST 5 on `34f862a8` (owner, sign
out, second account): *"I can't see Ada's answer or any answers anymore, just the 'this account can't read' message"*.
Fixture C's MUST lines 1–7 are ticked; line 8 (a file) waits on R2.

MUST 7 (a redeploy keeps the records): Richard's answer was on the owner's list after the redeploy to `34f862a8`
(`check-campus.mjs`, 1 answer, `autoBoots: 1`).
