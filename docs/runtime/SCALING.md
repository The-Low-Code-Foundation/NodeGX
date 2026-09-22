# Scaling a NodeGX backend — the two ceilings, and which one you are hitting

The claim this page exists to make precisely, because a vague version of it is
how people get hurt:

> **A NodeGX full-stack app is one app process with a real database behind it.**
> That carries a serious application with thousands of active users. It is not a
> horizontally replicated app tier, and running it as one will break things that
> currently work.

If you are deciding whether to build on the built-in backend, that sentence is
the whole answer, and the rest of this page is the detail behind it. If you are
already running one and it is getting slow, skip to
[Which ceiling are you hitting](#which-ceiling-are-you-hitting).

---

## The shape of what you deployed

A NodeGX deploy is two halves, and they scale completely differently. Almost
every scaling mistake starts by treating them as one thing.

| Half | What it is | Scales horizontally? |
|---|---|---|
| **The app** | A static folder — HTML, JS, CSS, assets | **Yes, trivially.** Put it behind a CDN or as many web servers as you like. It holds no state. |
| **The backend** | One self-contained Node process (`dist/cli.js`) over one SQLite database in `<dataDir>/data/local.db` | **No.** One process per data directory, by design — see [below](#why-you-cannot-run-two-backend-replicas-today). |

Most traffic to a typical app is the first half. A read-heavy app serving a
large audience is often *mostly* a CDN problem, and people reach for backend
replicas before they have done the cheap thing.

---

## The two ceilings

There are two, they are independent, and they are reached by different apps.

| Ceiling | What it is | Where it bites |
|---|---|---|
| **Storage** | SQLite is a single-writer database. WAL mode is on (`LocalSQLAdapter.ts:341`), so you get many concurrent readers and one writer at a time. | Write-heavy apps. Long transactions. A large database with unindexed queries. |
| **Process** | The service is single-process **by design**. The cron scheduler, the rate limiter, the in-flight sign-in store, the change tap that feeds realtime and db-change triggers, workflow concurrency gates and idempotency claims all live in *this* process's memory or assume sole ownership of the data directory. | Only when you try to run more than one replica. A single process is not slow — it is just singular. |

The storage ceiling is the one people expect and the one that has a known exit
(a real database — see [SQLite and Postgres](#sqlite-and-postgres)). The process
ceiling is the one that surprises people, because nothing refuses to start: two
replicas come up cleanly and then misbehave in ways that look like application
bugs.

---

## What one process actually does

Every figure here was **measured**, and the conditions are part of the claim — a
requests/second number without its workload is the kind of claim that gets
people hurt. Re-take it with
`packages/nodegx-backend/scripts/soak/run.js`; the method, and what it
deliberately does not cover, are in that directory's README.

**Conditions.** One backend process, 8-core Apple Silicon laptop, 16 GB RAM,
Node 22, SQLite with WAL. A **282,000-row** database — `Talk` 1,200,
`Exhibitor` 800, `Attendee` 40,000, `MyDay` 200,000, `Profile` 40,000 — with the
indexes its queries use declared before the rows were written. Workload **85%
reads / 15% writes** over the Parse wire, shaped on a real conference app:
programme and exhibitor lists, one attendee's saved sessions, and a profile row
rewritten in place. Page cap at its shipped defaults. Rate limiting off (see
below). Security in the localhost `devOpen` posture, so per-row ACL enforcement
is **not** in these numbers.

| | measured |
|---|---|
| **Mixed-workload throughput** | **~3,500 requests/second** — flat from concurrency 4 to 128 |
| **The knee** | concurrency **4**, at p95 **1.9 ms** |
| Above the knee | throughput stops rising; latency rises in proportion — p95 4.1 ms at 8, 16 ms at 32, 51 ms at 128 |
| **Writes only** | **~5,200 writes/second** |
| **CPU at saturation** | **1.16 of 8 cores** |
| Errors | zero, at every level |
| Simultaneous SSE streams | **500** sustained; beyond the cap, `503` |
| Memory | RSS returned to baseline after the load stopped |

**The first signal to move was request duration, and *why* is the useful part.**
It was not the writer and it was not the disk. Writes alone sustained ~5,200/s —
*faster* than the mixed workload, because the reads return more data than the
writes do. The process saturated at **1.16 of 8 cores**: one Node process is one
main thread, and that thread was full while seven cores sat idle.

So on this workload the **process** ceiling binds first, not the **storage** one.
That is why [step 5](#5-give-it-a-bigger-box) says single-core speed rather than
core count: on this evidence a box with *more* cores does not raise this number,
and a box with *faster* ones does.

**With rate limiting on, the binding number is the budget, not the backend.**
The same run under the shipped `rateLimit` defaults served exactly **20
requests/second** and refused everything else with `429`, identically at every
concurrency. That is `policies.data` (1200/min) working correctly: every caller
in that run was anonymous from one address, so they all shared one bucket. A
real app's signed-in users each get their own — but an app whose traffic all
appears to come from one address does not, and `rateLimit.trustedProxies` is the
usual reason. This is signal 4, reproduced deliberately.

**A heavy scheduled job costs about a quarter of your throughput.** Running one
in the same process took throughput from ~3,490 to ~2,670 req/s (**−24%**) and
raised p95 from 8.3 ms to 9.9 ms. There is no separate worker role today.

🔴 **What this number is not.** It is one workload on one box. It says nothing
about your queries, your row counts, or your indexes, and the read:write ratio
is the first thing you should change to match your own app. Measure yours —
that is what the harness is for.

---

## Which ceiling are you hitting

Work through this in order — each step rules out the next. All of these come
from [`/metrics`](./BACKEND-OPERATIONS.md#metrics).

1. **Is it the backend at all?** `nodegx_request_duration_seconds`. Flat
   server-side latency with unhappy users means the problem is between them and
   your proxy — that is a CDN and caching conversation, not a database one.
2. **Is it the static half?** If the slow requests are the app's assets and not
   `/classes/*` or `/api/*`, you need a CDN, not a bigger backend.
3. **Which route class is slow?** Group `nodegx_request_duration_seconds` by
   `class`. `data` slow while `public` is fine points at queries or database
   size (`nodegx_db_file_bytes`).
4. **Are you refusing people?** `nodegx_ratelimit_refusals_total` climbing on a
   class real users depend on means the budget is too tight — or that everyone
   shares one bucket because `trustedProxies` is wrong.
5. **Are you write-bound?** This is the real storage-ceiling signal: `data`
   latency rising with concurrency while CPU is not saturated, and slow requests
   clustering on writes rather than reads. One writer means writes queue.
6. **Streams?** `nodegx_realtime_connections` near `realtimeMaxConnections`
   means clients reconnect without closing, or the cap is too low.

If you get to 5 and it is genuinely writes, you have reached the storage ceiling
and the honest answer today is a bigger box (see below) — with Postgres as the
planned exit.

---

## Scaling up, in the order that works

Everything here is available today, and it is ordered cheapest-first. Most apps
never get past step 4.

### 1. Serve the app from a CDN

The app is a static folder. Putting it on a CDN removes the majority of requests
from your backend and is the single highest-leverage change available. Keep the
API on one origin with the app, or set the endpoint explicitly — see
[Self-hosting](./SELF-HOSTING.md).

### 2. Declare your indexes

An unindexed query over a large collection is the most common cause of a "slow
database" that is not actually a ceiling. Collections declare the indexes they
want beyond the built-in `createdAt`/`updatedAt` pair:

```jsonc
{ "indexes": [ { "fields": ["email"], "unique": true }, { "fields": ["eventId", "startsAt"] } ] }
```

A declaration is reconciled against the database, and a `unique` index over a
column that already holds duplicates is **refused** (`INDEX_DUPLICATES`) rather
than silently skipped. Index the fields you filter and sort by, and check
`nodegx_db_file_bytes` to know whether size is even plausible as the cause.

An index can cover only some rows, with `where`. It is how you say "one
*pinned* lesson per learner and concept, and any number unpinned", or "one
evaluation per programme and kind, for these four kinds":

```jsonc
{ "indexes": [
  { "fields": ["learnerId", "conceptId"], "unique": true, "where": { "pinned": true } },
  { "fields": ["programmeId", "kind"], "unique": true, "where": { "kind": { "in": ["initial", "mid", "final", "impact"] } } },
  { "fields": ["dimensionId", "sessionId"], "unique": true, "where": { "sessionId": { "exists": true } } }
] }
```

`where` names one to four properties, and all of them must hold. Each is
compared with `true`/`false` (a Boolean property), a string (String), a number
(Number), `{ "exists": true|false }` (any type: set, or empty), or
`{ "in": [...] }` (one to twenty values). A value of the wrong type for its
property is refused when you push, not left to match nothing. A partial index
and a full one on the same fields are two indexes. A partial unique index is
**not** enough for `X-NodeGX-Upsert`, because outside its rows the value may
repeat; the upsert asks for a unique index with no `where`.

### 2a. Set a limit anyway — the page cap is a floor under accidents, not a design

**A query with no `limit` returns one page, not the collection.** The backend
caps it at `queries.defaultLimit` (1,000 rows), and clamps any explicitly larger
request to `queries.maxLimit` (10,000) rather than refusing it. Both are
[ops.json settings](./BACKEND-OPERATIONS.md#no-query-returns-everything). When a response was
shortened, it says so in a header:

```
X-NodeGX-Result-Capped: true
X-NodeGX-Result-Limit: 1000
```

That cap exists because the alternative is an outage. A cloud function that
builds a filter from an optional value and omits the key when the value is
missing produces an *empty* filter; an empty filter with no limit was
`SELECT * FROM table`, and four hundred thousand rows came back through a
single-process backend. No bug in the backend was required.

**It is a floor under accidents, and you should still design above it:**

- **Set an explicit `limit` on every query**, including the ones you "know" are
  small. Collections grow, and a silently capped page is a correctness bug in
  your application even when it is a healthy one in the backend.
- **Check `X-NodeGX-Result-Capped`** if it matters whether you got everything.
  The Parse response body is unchanged and does not carry it.
- **Be careful building a filter from optional values** — see above. The cap
  bounds the damage; it does not make the filter right.
- **Paginate with `limit` and `skip`** rather than fetching and slicing.
- **`limit=0&count=1` still works**: the cap bounds the page, not the count.
- **`?distinct=` is bounded at the ceiling**, not at the default, and says so in
  the same two headers. It is the other route that answers with a list instead
  of a page.
- **Watch `nodegx_db_file_bytes`** against the response sizes you expect.

Internal readers that genuinely need every row — backup, export, the file
orphan sweep, the registries — go through a separate method and are not capped,
so a backup is still a whole backup.

### 3. Move file storage off the local disk

Uploads default to the local disk (`driver: { "type": "local" }`, in
`<dataDir>/files.json`). Point them at S3-compatible object storage instead —
set it from the Files panel or the `configure_backend_files` MCP tool rather than
by hand, since the credentials belong in `secrets.json` and not in the diffable
config:

```jsonc
// <dataDir>/files.json — the non-secret half of the driver shape
{ "driver": { "type": "s3", "endpoint": "…", "region": "…", "bucket": "…", "forcePathStyle": false } }
```

This removes blob serving from your process, lets a CDN front your files, and is
a prerequisite for any future replication — blobs are the one piece of shared
state that is *already* solved.

**Switch drivers before you have many files.** Switching does not migrate
existing blobs; moving them is a documented manual procedure. See
[Backend files](./BACKEND-FILES.md).

### 4. Tune the budgets you actually have

In `<dataDir>/ops.json`. **Unknown keys are errors, not warnings** — the backend
refuses to start rather than ignore a setting, so a typo is loud.

| Setting | Why you would change it |
|---|---|
| `rateLimit.policies.data` | The default is 1200/min burst 400 per principal. A list-heavy app legitimately exceeds this. |
| `rateLimit.trustedProxies` | Wrong value = every request appears to come from your proxy and shares one bucket. The most common self-inflicted outage on this page. |
| `rateLimit.realtimeMaxConnections` | Default 500 simultaneous SSE streams. This is the realtime tier's real limit — sockets, not request rate. |
| `executions.retentionDays` | Default 30. Every function and workflow run is recorded; long retention grows `executions.sqlite` and slows the history views. |
| `logging.requests` | Turning off per-request logging is measurable under high request rates. |

`GET`/`PUT /admin/ops` patches this at runtime without a restart.

### 5. Give it a bigger box

One process, one writer — so the resources that matter are single-core speed and
disk latency (NVMe, not network storage; **never** a network filesystem for the
data directory). This is unglamorous and it is genuinely where the headroom is.
A production Rails or Django app is usually one app tier over one database, and
it carries thousands of active users comfortably.

### 6. What not to do

**Do not run two backends against one data directory.** Nothing stops you and it
will not crash. See the next section for exactly what breaks.

---

## Why you cannot run two backend replicas today

This is deliberate and documented in the code, not an oversight nobody noticed.
Each row below is a specific piece of state that a second replica gets its own
copy of, and the consequence a user would actually observe.

| What | Consequence of a second replica | Where |
|---|---|---|
| **Cron scheduler** — in-process timers per enabled schedule trigger | **Every schedule fires N times.** Two replicas send the nightly email twice. | `triggers/scheduler.ts:101` |
| **The change tap** — `ChangeBus` subscribes to *this* process's post-commit adapter events | **Realtime goes half-blind and db-change triggers silently do not fire.** A client streaming from replica A never sees a write committed on replica B; a db-change trigger only fires for writes that happened to land on its own replica. | `realtime/ChangeBus.ts` |
| **SSE connections** — held in memory | A connection is pinned to one replica. Without sticky routing, reconnects land elsewhere and clients churn. | `realtime/RealtimeHub.ts:142` |
| **Rate limiter** — token buckets in memory | **Your effective limit becomes N × what the file says.** Stated in the module's own docstring as a documented consequence. | `ops/rate-limit.ts:62` |
| **Admin failure budget** — lockout windows in memory | **N × the credential guesses** before lockout. | `admin/auth.ts:35` |
| **OAuth / in-flight sign-ins** — pending flows and handoff codes in memory | **OIDC sign-in does not work at all** without sticky sessions. Already documented under [Honest limits](./BACKEND-AUTH.md#honest-limits). | `auth/FlowStore.ts:90` |
| **Workflow concurrency gates** — `active` and `gates` maps in memory | A workflow's declared concurrency limit is **per process**, so N replicas run N × the concurrency you asked for. | `workflow/WorkflowEngine.ts:297` |
| **Idempotency claims** — a SQLite table, but released wholesale on startup | Each replica's startup **releases the other's live claims**. The code says so: *"Two backends started on one data directory would each release the other's live claims."* | `execution/IdempotencyStore.ts:396` |
| **Secrets file** — whole-file read, mutate, atomic rename | Atomic per write, **last-writer-wins across processes**: two replicas writing different secrets lose one. | `config/SecretsStore.ts:78` |
| **Execution history** — `executions.sqlite`, single-owner by design | Two processes fight over the same history database. | `execution/ExecutionStore.ts` |
| **Metrics** — per-process counters | `/metrics` describes one replica. You would need per-pod scraping and aggregation. | `ops/metrics.ts:60` |

### What already would survive replication

Worth knowing, because it tells you how much of the job is actually done:

- **Sessions.** Session tokens are rows in the `_Session` collection, not memory
  — so a request authenticates the same on any replica.
- **Row ACLs and permissions.** Policy is in `security.json` and enforced in SQL.
- **File blobs**, once you are on the S3 driver (step 3 above).
- **Idempotency**, structurally — it is already a table with claim/release
  semantics; only the wholesale startup release is single-process.

Making the app tier replicable — a leader-leased scheduler, a database-backed
change bus, shared rate-limit and sign-in state — is real, tractable work and it
is **not done**. It is not on this page as a coming feature because it has not
been scoped and committed to. If you need it, say so; that is the signal that
decides whether it gets built.

---

## SQLite and Postgres

**There is a supported SQLite → Postgres migration. It is one command, it
verifies its own work, and it changes nothing in your app.**

```
nodegx-backend migrate --data-dir <dir> --to postgres://user:pass@host/db --dry-run
nodegx-backend migrate --data-dir <dir> --to postgres://user:pass@host/db
```

The dry run prints a **carry report**: every collection, index, relation and row
ACL in your backend, and what the move would do with each. If anything is marked
`cannot-cross`, the real run **refuses to start** rather than half-doing it.

The real run takes a consistent snapshot, creates the schema, copies every table
in checkpointed batches, and then **reads both databases back through their own
adapters and compares the records**. If anything differs it says so and tells you
not to cut over. Your SQLite file is opened read-only and is byte-identical
afterwards — the command prints its sha256 before and after to say so.

Then you cut over by setting one environment variable:

```
NODEGX_STORAGE_URL=postgres://user:pass@host/db nodegx-backend serve --data-dir <dir>
```

`/health` reports the engine and the connection pool once it is up.

### What you keep

**Your app does not change.** Not one node in your graph, not one workflow
definition, not one cloud function, not one line of `security.json`. Your
workflows, cloud functions, schedule and webhook triggers, logins, row ACLs,
API keys, realtime subscriptions and uploaded files all keep working, and you
never open the editor to do it. That claim is not an intention: a whole app —
pages, a schedule, two cloud functions, a workflow, login, owner-only rows, a
scoped API key, a unique index, a relation, realtime and an upload — is driven
across on every build, and its behaviour before and after is **recorded and
compared**, including the project files being byte-identical.

### Going back works

Unset `NODEGX_STORAGE_URL` and start again. The SQLite database is still there,
still untouched, still the app it was. Nothing about this move is one-way, and
that is also checked on every build.

### 🔴 What it does not buy you — read this before you plan around it

**The bridge raises the storage ceiling only: one app process, a real database
behind it.** It does **not** make the app tier replicable. You still run one
backend process — the scheduler, the workflow concurrency limits and the
in-process realtime hub are all still single-process, exactly as described in
["Why you cannot run two backend replicas today"](#why-you-cannot-run-two-backend-replicas-today)
above. Moving your data to Postgres does not change any of that, and any wording
that suggests otherwise is wrong.

What it removes is the database being the thing that stops you: connection
limits, write concurrency, database size, and backups you would otherwise take
by copying a file.

### What changes shape: search ranking

The rows a search **returns** are the same on both engines, and that is checked
on every build. The **order** is not. SQLite ranks with `bm25()`, PostgreSQL
with `ts_rank_cd` — different normalisation, and no choice of arguments makes
them agree. If your app shows a "best match first" list, expect the same
results in a different order after the move.

Search on Postgres also computes its `tsvector` per row at query time, so it is
a sequential scan: correct rows, and slower than it needs to be on a large
collection. A generated column with a GIN index is the operator-facing fix.

If you use geo queries, one more: a point lying **exactly** on the north or east
edge of a `$within` polygon is outside on SQLite and inside on Postgres.
Interior and exterior points agree, and Parse does not define the boundary.

Everything else the two adapters do differently is **translated rather than
declared** — case-insensitive `$contains`, empty `$in` sets, numeric and
timestamp shapes, unique-violation wording, and booleans, which read
`true`/`false` through every route on both engines. The full register, with the
spec that measured each entry, is `POSTGRES_DIVERGENCES` in
`noodl-runtime/src/api/adapters/postgres/divergences.ts`.

### If you would rather not run the backend at all

Pointing the app at an external Postgres-backed service (Supabase and
PostgREST-shaped APIs) is still an option, and it is a different one. Understand
the trade honestly: **workflows, cloud functions, triggers and the execution
history live in the built-in backend and do not travel.** You would be choosing
a different architecture, not migrating this one — rebuilding that server-side
logic as database functions, edge functions or an external service. The bridge
above exists precisely so that this is a choice rather than the only way out.

### The execution history stays where it is

Workflow and function run records live in `executions.sqlite`, beside the
database and not in it. `migrate` does not move them and does not need to: after
the cutover they are still there and still readable in the editor's History
panel. Back them up by copying that file.

### Backups on Postgres

**`nodegx-backend backup` does not work on a Postgres-backed backend, and says
so rather than pretending.** It copies a SQLite file; once your records are in
Postgres there is no such file to copy — and the pre-migration `local.db` is
still sitting in your data directory, which is exactly what makes it dangerous.
Both the command and the admin route refuse by name (the route answers `409`)
instead of archiving stale rows and reporting success.

Backing up a Postgres-backed NodeGX backend is **three things, and they are
yours to arrange**:

| what | where it lives | how to back it up |
|---|---|---|
| Your records | PostgreSQL | `pg_dump`, or your provider's snapshots / PITR |
| Uploaded files, cloud functions, `security.json` and the rest of the policy | the data directory | copy the directory (it is small) |
| Execution history | `executions.sqlite` in the data directory | copy the file |

If your Postgres is managed (RDS, Cloud SQL, Supabase, Neon), the first row is
usually already being done for you on a schedule you did not have to write —
which is one of the things moving off a single file buys. Check its retention
rather than assuming it.

**The scheduled backup does not quietly keep running.** If you had one armed
before the migration, it starts refusing after it, loudly, in the execution
history — a schedule that silently stopped protecting you would be worse than
one that fails.

---

## If you have a hard date and a big number

The case that brings people to this page: a known event, a known audience, a
date that cannot move. What actually works:

1. **Characterise the load before you design for it.** Concurrent *users* is not
   a useful number. What you need is peak requests/second, the read:write ratio,
   and how many simultaneous realtime streams. Do not assume an event app is
   read-only in disguise: the one this page's numbers are shaped on read shared
   content *and* wrote continuously — saved agendas, and a profile row rewritten
   **after every AI assistant question**. An assistant-driven write rate scales
   with engagement, not with how much content you publish, so it does not flatten
   out once the programme is final.
2. **Make the read path not touch the backend.** Static app on a CDN; cache the
   handful of hot API reads at the edge with a short TTL. This is where the
   orders of magnitude are.
3. **Budget your realtime streams deliberately.** `realtimeMaxConnections`
   defaults to 500. Tens of thousands of live streams from one process is not the
   shape to bet an event on — prefer polling a cached endpoint for
   nearly-static content and keep streams for the screens that genuinely need
   them.
4. **Scale the writes down, not the process up.** Batch, debounce, and accept
   eventual consistency where it is honest to do so.
5. **Rehearse at the real number, on the real box, a week early.** Load-test
   against production-shaped data — not an empty database, which is the classic
   way to discover a missing index at the worst possible moment. Watch the six
   signals in [Which ceiling are you hitting](#which-ceiling-are-you-hitting).
6. **Know your failure mode in advance.** Decide now what you shed first when
   the writer saturates, and make the app degrade to a cached read-only view
   rather than returning errors.
7. **If step 1 says you are genuinely write-bound at a scale one writer cannot
   hold, do not deploy this architecture for that event.** That is the honest
   answer and it is better heard weeks early than on the day.

---

## Honest limits

- **One process per data directory.** Not a configuration, an assumption several
  subsystems are built on.
- **One writer.** WAL gives concurrent reads; writes serialise.
- **No horizontal app tier.** See the table above for what specifically breaks.
- **Postgres raises the storage ceiling, not the app one.** `migrate` moves the
  database; the single-process app tier above is unchanged by it.
- **`backup` is SQLite-only.** On a Postgres-backed backend it refuses by name
  rather than archiving the pre-migration file still sitting in your data
  directory. The database is yours (or your provider's) to back up — see
  [Backups on Postgres](#backups-on-postgres).
- **Metrics are per-process**, so any fleet view is yours to assemble.
- **A page cap, not a query planner.** `queries.defaultLimit` (1,000) bounds a
  query that asked for no limit and `maxLimit` (10,000) clamps one that asked
  for too much — so no single response takes the process down. It does nothing
  about a query that is slow for other reasons, and a capped page your code
  treats as a complete one is still your bug. See step 2a.
- **Run records are capped by size as well as by count**, since 0.2.4:
  `executions.maxValueBytes` (50KB) replaces one oversized step output or log
  value with a marker, `executions.maxRunBytes` (8MB) bounds a whole run, and
  `executions.maxCount` (10,000) bounds how many are kept alongside
  `retentionDays` (30). A truncated record is marked `?capped=true` rather than
  quietly shortened. What is still yours to watch: pruning bounds the row count,
  and reclaiming the file's disk back is a separate `POST /admin/executions/compact`.
- **A scheduled workflow runs in the process that serves your users.** A heavy
  periodic job competes with request traffic; there is no separate worker role
  today. Measured: **−24% throughput** while one ran. If yours is heavier than
  the one measured, so is your delta.
- **One measured workload, not a guarantee.** [The number above](#what-one-process-actually-does)
  was taken on a production-shaped database on one laptop-class box, with ACL
  enforcement off and one read:write ratio. It is a real measurement and it is
  not a promise about your app. Re-take it on your hardware with your shape —
  `packages/nodegx-backend/scripts/soak/run.js`.

---

## See also

- [Running a backend in production](./BACKEND-OPERATIONS.md) — logs, metrics, rate limits, the ops file
- [Self-hosting](./SELF-HOSTING.md) — the packaged Compose deploy, and other hosting
- [Local backend persistence](./LOCAL-BACKEND-PERSISTENCE.md) — the SQLite engine and what it refuses to do
- [Realtime](./REALTIME.md) — the SSE protocol, and its own out-of-scope list
- [Backend auth](./BACKEND-AUTH.md) — including the single-process sign-in limit
- [Backend files](./BACKEND-FILES.md) — the local and S3 storage drivers
- [Triggers](./TRIGGERS.md) — schedules, db-change, webhooks, and missed-fire policy
