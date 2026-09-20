# Project: Horizontal scaling of the NodeGX backend (study)

**Status:** study. Stage 1 and 2 are **not scoped** — no phase, no owner. The
**production-hardening findings it turned up are scoped**, as
[phase 98 — The potholes others hit](../tasks/phase-98-the-potholes-others-hit/README.md).
**Written:** 2026-09-19, from Richard's field report (below) and a measurement of
the backend at HEAD `978d49da8` (immediately after phase 97's BRG-001 landed).
**Named as out of scope by:** [phase 97](../tasks/phase-97-the-way-out-is-the-reason-to-stay/README.md) §6
— *"Making the app tier replicable … This is the process ceiling of §3 and it is
a phase of its own. This phase's job is to not lie about it."*

## Overview

**Goal:** make a NodeGX backend runnable as more than one process without
breaking behaviour that currently works — in **two stages**, because they have
very different costs and only the second one is about replication:

1. **Role separation** (`serve` / `worker`), so a heavy scheduled job stops
   competing with user traffic. Two processes, one box. **Needs no Postgres, no
   Redis, no cluster** — and it is the stage that fixes what actually took
   Visual Hive down. See §3.5.
2. **A replicated serve tier** behind a load balancer. Gated on phase 97's
   Postgres adapter. See §3.

**Sources of evidence:** Richard's Visual Hive field report (§1.1), a measurement
of the backend at HEAD (§2), and a survey of how n8n and Directus actually behave
in production (§1.3) — which **corrected the scheduler design** this study first
proposed (§2.1).

**Why this matters:** phase 97 raises the *storage* ceiling (SQLite → Postgres)
and explicitly leaves the *process* ceiling alone. After phase 97 ships, the
honest claim is **"one app process, a real database behind it"** (R2, ruled
2026-09-19). That carries a serious application. It does not carry an event with
a hard date and a very large audience, and it is the next thing a serious
evaluator asks about after the database.

**Out of scope for this study:** multi-region, multi-tenancy, autoscaling
policy, and anything about the frontend — the app is a static folder and already
scales horizontally without help.

---

## 1. Where this came from

Richard, 2026-09-19, from his own production experience at Visual Hive: their
software was bought for a **60,000-participant conference**. The stack was n8n
plus Directus on **Azure AKS**. Horizontal scaling was *"hit or miss"* — real
downtime and slowdowns, in front of a client — and his diagnosis is worth
quoting as the design input it is:

> *"mostly because the n8n and Directus docs on horizontal scaling were shit."*

**That is a documentation failure sitting on top of an architecture one, and the
ordering matters.** Both tools *can* be scaled horizontally; what the docs did
not do was state, in one place, which pieces of state are shared and which are
per-process. Without that table an operator cannot tell which component to
replicate, so they replicate the wrong one and find out in production.

### 1.1 The four incidents, and what each one says about NodeGX

Richard gave four, 2026-09-19. Each is mapped to the NodeGX code it implicates —
because three of them are **not horizontal-scaling problems at all**, and that is
the most useful thing in this study.

| # | What happened at Visual Hive | What it says here |
|---|---|---|
| 1 | **Mixed read *and* write**, not read-mostly. Reads of shared session/exhibitor/attendee data, but also per-user writes: "my day" saves, and a profile row rewritten **after every AI assistant question**. | The soak in §4(a) must be a **mixed** workload. An AI-assistant-driven write rate scales with engagement, not with content — so "it's a caching problem" (my earlier guess) was **wrong**, and the write path is load-bearing. |
| 2 | 🔴 **A CPU/RAM-heavy full ingest + diff of sessions and exhibitors every 30 minutes, running on the same nodes as user traffic** → periodic slowdown. Richard's own diagnosis: it should have been pinned to one node, leaving the others free for user questions and data requests. | **NodeGX has this exact shape today, at one replica.** `triggers/scheduler.ts` fires scheduled workflows *in the process that serves HTTP*. A heavy 30-minute job competes with user requests **now**, with no replication involved. See §3.5 — this reshapes the whole project. |
| 3 | 🔴 **The one that killed them.** A workflow ran without a required ID ~1 run in 2. The backend read the missing ID as *"no id filter"* and **returned ALL user flows**; the trace then failed to create, but the run was still written to the logs at **~10MB per record**. It exhausted a large Azure instance and blew their capacity limits, and took a long time to find. | **Reproducible in NodeGX today.** Two live gaps found while checking — see §3.6. Nothing to do with scaling; it is worse *because* of scaling. |
| 4 | 🔴 **The first horizontal attempt, at a smaller event:** Redis + AKS running n8n in workers mode "went haywire" on config issues. They switched Redis off and went back to one n8n instance — and **switching it back on again caused fresh problems.** Root cause: the very precise config n8n's worker mode demands versus everything-on-one-process. | **Reversibility is a hard requirement, not a nicety** — see §3.5. 1 → N → 1 → N must be a flag, not a migration. The interesting detail is that *reverting* hurt as much as scaling, which is the failure mode a separate "queue mode" architecture produces and a single config-gated code path does not. |

### 1.2 Richard's read on why the docs were bad, which the design should answer

> *"n8n and Directus made it an afterthought, probably thinking '99% of our users
> are hobbyists and will never need it, so we'll not put any effort into it, and
> the 1% who do need it are probably good enough that they'll switch from n8n to
> their own stack before the problems arise'"*

Taken seriously, that is a self-fulfilling strategy: the 1% leave, so the
evidence never arrives that it was worth building, so it stays an afterthought.
It is also **exactly the dynamic phase 97's second person-sentence was written
against** — *"on the day they never need that, nothing they built was shaped by
the fear of needing it."* Phase 97 applies that to the database; this project
applies it to the process. **The differentiator is not being able to scale
horizontally — plenty of things can. It is publishing the bound honestly before
anyone hits it, and making the step out of it small.**

### 1.3 Prior art: what it actually costs to scale n8n and Directus (web survey, 2026-09-19)

Richard's field report predicted these would be widespread. They are. Sources at
the end of this section. **Three of these change the design rather than decorate
it**, and they are marked 🔴.

| # | Finding in the wild | What it costs NodeGX to avoid |
|---|---|---|
| A | 🔴 **Leader election thrashes.** In multi-main n8n, *"event loop starvation and GC pauses trigger Redis leader lock expirations and split-brain cascades"* — a **busy** leader loses its lease because it is busy, not because it died, and a second leader starts firing. | **Do not build the leader lease I originally sketched.** See §2 row 1 — the correct primitive is a claim per *fire*, not a lease per *leader*. |
| B | 🔴 **At-least-once means duplicates.** If a worker's lease is not renewed within the stall interval (BullMQ default 30s) the job is handed to another worker; if the first one recovers and finishes, *"the system processes a duplicate execution."* | Any retryable work must be **idempotency-keyed**. NodeGX already has `IdempotencyStore` — this is the thing it exists for, and it must be wired to workflow runs, not just HTTP. |
| C | 🔴 **Every instance arms every trigger unless told not to.** n8n workers log *"Start Active Workflows"* on boot and *"every instance activates its own copy of every trigger, producing one duplicate per extra worker"*; root cause is **missing or overridden worker-specific environment variables**. | Exactly the Visual Hive double-fire, and it is a **configuration** failure, not a code one. This is the strongest argument for §3.5.1 rule 5: a process whose role is ambiguous must **refuse to start**. |
| D | **Executions stick in "running" forever** when a pod dies — *"the worker pod was terminated, Redis still holding the job"* — with `N8N_GRACEFUL_SHUTDOWN_TIMEOUT` and Kubernetes' `terminationGracePeriodSeconds` having to agree. | Stale runs must be reaped **by TTL**, not by "it is my boot, so delete everything running" — which is precisely today's `releaseInFlight` (§2 #8). |
| E | **Version skew is load-bearing.** n8n requires every main to share queue mode, Postgres, Redis, **the same n8n version**, and the multi-main flag. A rolling update inevitably runs mixed versions. | Decide deliberately: tolerate skew, or refuse to start against a peer on a different version and document that updates need a full stop. Silence here is a rolling-update outage. |
| F | 🔴 **Postgres `max_connections` is hit earlier than expected**, because *"every worker opens its own connection pool"*. | **Design input for BRG-005**, not for this project: conservative default pool size, a documented formula (`replicas × pool ≤ max_connections − headroom`), and PgBouncer guidance. Cheap to get right at adapter-design time, painful later. |
| G | **Execution-data bloat is n8n's single most common operational complaint** — *"Postgres will bloat, your VPS disk will fill"*; ~1000 executions/day ≈ 500MB/month. Their answer needed **three** controls: max age, max count, **and** per-workflow "do not save". Pruning also does not reclaim Postgres space without `VACUUM`. | **Direct validation of HS-D2 (§3.6)**, and it says NodeGX's single `retentionDays` is not enough. Note the trap in their own community: *"execution history limited to ~13 hours despite 720-hour retention"* — two limits interacted and the operator could not tell which won. If NodeGX adds a count limit, **which limit fired must be legible in the record.** |
| H | **Binary/file storage on the local filesystem is unsupported once you have workers** — *"if an instance runs in queue mode with multiple workers, n8n does not support filesystem mode"*. Confirms §2's S3 point from the other direction. | Already right in NodeGX (S3 driver exists). Keep it. |
| I | ⚠️ **n8n's S3 binary-data mode is enterprise-licensed** — *"only available on self-hosted enterprise plans and requires a valid enterprise license key, without which the instance will not even start in S3 mode."* | This is Richard's §1.2 thesis being **stronger than he put it**: the scaling path is not merely an afterthought, it is partly monetised, which leaves self-hosted users the bloat-prone option. **NodeGX's S3 driver is not gated, and that is worth saying out loud.** |
| J | **Directus needs four things at once to scale:** Redis (cache, rate-limiting *and* WebSockets), S3 storage, DB connection pooling, and **sticky sessions** — with the default `memory` sync store *"suitable for single-container deployments"* and silently wrong beyond one. | Four coupled infrastructure decisions, each able to fail alone, is the config nightmare Richard described. NodeGX's stage 1 (§3.5) needs **none** of them, and stage 2 needs one thing it already runs: Postgres. |
| K | **Sticky sessions are not a free answer for streams** — they *"hinder horizontal scaling and fault tolerance"* and the load balancer's own memory becomes a ceiling at high connection counts. | Stage 2 should prefer notify-bus fan-out to local SSE connections over pinning clients to replicas. Sticky routing is the interim, not the destination (§2 #3). |

**Sources:** n8n docs on [queue mode](https://docs.n8n.io/hosting/scaling/queue-mode/), [binary data](https://docs.n8n.io/hosting/scaling/binary-data/), [external storage](https://docs.n8n.io/hosting/scaling/external-storage/), [the durable scheduler](https://docs.n8n.io/deploy/host-n8n/configure-n8n/durable-scheduler) and [encryption key](https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/); [Azguards on leader-election thrashing](https://azguards.com/workflow-automation/n8n/the-split-brain-cascade-mitigating-leader-election-thrashing-in-multi-main-n8n-topologies/); [Collabnix on n8n in production](https://collabnix.com/running-n8n-on-kubernetes-what-actually-works-in-production/); n8n community threads on [pruning not working](https://community.n8n.io/t/execution-data-pruning-does-not-work/34990), [retention confusion](https://community.n8n.io/t/v2-execution-history-limited-to-13-hours-despite-720-hour-retention-configuration/87622), [encryption-key mismatch](https://community.n8n.io/t/self-hosted-ai-starter-kit-error-message-mismatching-encryption-keys/56652) and [stuck queue executions](https://community.n8n.io/t/queue-mode-executions/271488); GitHub issues [#16332](https://github.com/n8n-io/n8n/issues/16332) and [#17160](https://github.com/n8n-io/n8n/issues/17160) on duplicate scheduled executions; [Directus self-hosting requirements](https://directus.com/docs/self-hosting/requirements) and [synchronization](https://directus.com/docs/configuration/synchronization).

### 1.4 🔴 The generated-secret landmine

n8n's most-reported scaling failure is not architectural at all: **`N8N_ENCRYPTION_KEY`
is auto-generated on first run and written to a settings file**, so a second
process either cannot decrypt credentials or refuses to start with *"Mismatching
encryption keys"*. Their docs now say the key *"must be shared with all worker and
webhook processor nodes"*.

**NodeGX has the same shape.** `secrets.json` holds the admin credential and the
SMTP/S3/webhook secrets, and the CLI **generates a token if `--token` is not
passed**. Stage 1 (§3.5) is safe because all processes share one data directory.
**Stage 2 is not**, the moment a replica has its own filesystem.

Two rules, cheap now:

1. **Before stage 2, secrets must be explicitly provisioned, never generated.** A
   replica that finds no secret must **refuse to start**, not invent one — the
   same loud-failure stance `--ephemeral` and `devOpen` already take.
2. **A mismatch must name the fix.** n8n's error is correct and still cost people
   hours because it did not say *which* file to reconcile with *which* variable.

Two consequences for this project:

1. **The documentation is a first-class deliverable, not a write-up at the end.**
   The user-facing half of this has already been written and does not wait for
   the engineering: [`docs/runtime/SCALING.md`](../../docs/runtime/SCALING.md)
   names all eleven pieces of per-process state, what a second replica does to
   each, and the file that proves it. It also partly discharges phase 97's
   **BRG-006** publication obligation for R2. **Someone reading that page cannot
   make the Visual Hive mistake**, which is the cheapest win available here and
   it is already banked.
2. **The claims about n8n's and Directus's internals in this section are
   Richard's field account and are not verified in this repo.** Everything in §2
   below *is* measured. Do not let the two blur — if this project ever leans on a
   comparison to those tools, verify it then.

---

## 2. What was measured (2026-09-19, HEAD `978d49da8`)

Eleven pieces of state a second replica gets its own copy of. Every line
re-verified against the tree after BRG-001 landed. The user-facing version of
this table (consequence only) is in `SCALING.md`; **this one adds the fix**,
which is the engineering content.

| # | What | Where | The fix |
|---|---|---|---|
| 1 | **Cron scheduler** — in-process timers, one per enabled schedule trigger | `triggers/scheduler.ts:101` | 🔴 **Claim each FIRE, do not elect a LEADER** — corrected, see §1.3-A and §2.1 below. Role separation first (§3.5), then a unique claim per `(triggerId, scheduledFor)`. |
| 2 | 🔴 **The change tap** — `ChangeBus` subscribes to *this* process's post-commit adapter events | `realtime/ChangeBus.ts` | **The hard one.** Needs a cross-process notification: Postgres `LISTEN/NOTIFY` published from the same transaction that commits the write. See §3 — this is why the project is gated on phase 97. |
| 3 | **SSE connections** in memory | `realtime/RealtimeHub.ts:142` | Sticky routing by `clientId` as the interim; a real fix rides #2 and fans out to local connections on each replica. The `resync` contract already covers the reconnect case, so the protocol needs no change. |
| 4 | **Rate limiter** — token buckets in memory | `ops/rate-limit.ts:62` | Three options, cheapest first: divide the configured budget by replica count and document it; move rate limiting to the proxy; or a shared bucket store. **Recommend the first** — a shared store on the hot path buys a dependency for a soft guarantee. |
| 5 | **Admin failure budget** — lockout windows in memory | `admin/auth.ts:35` | Small table, same shape as #1's lease. Unlike #4 this one is a security control, so N× the guesses is not an acceptable documented consequence. |
| 6 | **In-flight sign-ins** — OIDC flows and handoff codes in memory | `auth/FlowStore.ts:90` | Short-lived rows in the database. They are already short-lived and already have TTLs; only the storage is wrong. Cheap, and it removes the sticky-session requirement for auth. |
| 7 | **Workflow concurrency gates** | `workflow/WorkflowEngine.ts:297` | A claims table with the same claim/release semantics `IdempotencyStore` already implements — do not invent a second mechanism. |
| 8 | **Idempotency startup release** — `DELETE … WHERE state='running'` on boot | `execution/IdempotencyStore.ts:396` | Tag each claim with an instance id and release only your own. The docstring already names the defect exactly, so this is a known fix, not a discovery. |
| 9 | **Secrets file** — whole-file read, mutate, rename | `config/SecretsStore.ts:78` | Last-writer-wins across processes. Either move to the database or make it read-only at runtime for non-leader replicas. |
| 10 | **Execution history** — `executions.sqlite`, single-owner by design | `execution/ExecutionStore.ts` | Follows the main database to Postgres, or stays per-replica and is aggregated for display. **A real product decision, not just a port.** |
| 11 | **Metrics** — per-process counters | `ops/metrics.ts:60` | Per-pod scrape targets and aggregation. Purely an ops-docs change; no code needed. |

### 2.1 🔴 Why the scheduler fix is a claim, not a lease

The first draft of this study said "leader lease". **The web survey says that is the
design that fails in the field**, and the reason is specific enough to be worth
writing down rather than rediscovering.

A lease is held by a process and renewed on a timer. A process running a heavy job
— *Visual Hive's 30-minute ingest is exactly this* — can starve its own event loop
and **fail to renew a lease it is perfectly alive to hold.** A second process then
takes leadership and fires the same schedules, while the first is still running.
This is n8n's *"split-brain cascade"* (§1.3-A), and note the cruel interaction:
**the process doing the heavy work is the one most likely to lose its lease**, so
the failure targets precisely the workload that motivated the design.

The correct primitive, and the one n8n's own **durable scheduler** converged on —
*"records each upcoming run in the database before it's due … each run executes
once across instances"*:

1. **Materialise the next fire as a row** — `(triggerId, scheduledFor)` with a
   **unique constraint**. FED-002's `unique: true` indexes already provide this,
   and a duplicate claim fails on the constraint rather than on a race.
2. **A process claims a fire by inserting it.** Losing the insert means somebody
   else has it. This is correct under split-brain, GC pause, clock skew and
   network partition, because the **database** adjudicates, not a timer.
3. **A lease becomes an optimisation, not the correctness mechanism** — it stops N
   workers racing on every tick. If it thrashes, you get contention, not duplicates.
4. **Reap stale claims by TTL** (§1.3-D), never by "my boot, so delete everything
   running" — which is today's `releaseInFlight` and is wrong for two processes
   before it is wrong for ten.

The existing `computeStartPlan` missed-fire policy (skip, or run-once-on-start)
carries over unchanged and becomes *more* honest: with fires as rows, "was this
window missed" is a query rather than an inference.

**This is the single most valuable thing the survey bought.** It is a better design,
it is not more code than a lease, and it would have been found in production
otherwise — which is where everyone else found it.

### What already survives replication

Roughly a third of the job is done, mostly deliberately:

- **Sessions** are `_Session` rows, not memory — any replica authenticates a
  request identically.
- **Row ACLs and permissions** are `security.json` plus SQL predicates.
- **File blobs** once the S3 driver is configured (`storage/S3Driver.ts`).
- **Idempotency** is *structurally* right already — a table with claim/release.
  Only #8 is wrong.

**The encouraging read:** eight of the eleven fixes are "move this state into the
database", and the database already has the access patterns for it. This is not
an architectural rewrite. **The discouraging read:** #2 is not in that set, and
#2 is the one users would notice first.

---

## 3. 🔴 The sequencing finding: *replication* is gated on Postgres — role separation is not

The most useful output of this study, and it answers Richard's question about
researching before going deep into phase 97. Read §3.5 with it: the project
splits into two stages and **only the second one waits for phase 97.**

**Item #2 — the change bus — is close to unfixable on SQLite and near-trivial on
Postgres.** A second process committing a write must notify the first, and:

- SQLite has no cross-process notification primitive. The options are polling a
  change table (latency, load, and a new table to sweep), a filesystem watcher
  (unreliable, and hostile to the "never a network filesystem" rule), or an
  out-of-band broker such as Redis — **which adds exactly the moving part that
  WF-004 chose `node:sqlite` to avoid**, and which is the dependency Richard's
  field report identifies as where n8n and Directus get confusing.
- Postgres has `LISTEN/NOTIFY`, publishable from inside the committing
  transaction, which is precisely the semantics `ChangeBus` already promises
  ("post-commit, buffered inside a transaction, released on commit").

So the conclusion is not "research this before phase 97" — it is the opposite:

> **This project should follow BRG-005 (the Postgres adapter), and attempting it
> first means building a change-propagation mechanism on SQLite that gets thrown
> away.** Phase 97 is correctly ordered ahead of it, and nothing in this study
> argues for pausing it.

### What phase 97 needs to do about it: nothing — measured, 2026-09-19

This study originally recommended two things here. **The first was asked, checked
and is already satisfied; the second was measured and rejected.** Recorded with
the evidence so nobody re-proposes either.

- ✅ **"BRG-001's interface must not foreclose a notify channel" — already
  satisfied, no change needed.** `IStorageAdapter.on?`/`off?` are optional and
  carry `StorageChange` = `{ type, collection, id, object? }`
  (`nodegx-backend-contract/src/storage.ts:126, 491`). Nothing in the declaration
  says where an event came from, so **a Postgres adapter publishing from inside
  the committing transaction implements the interface exactly as written.** The
  seam was already wide enough; it just was not obvious from the outside.
- ❌ **A `LISTEN/NOTIFY` key in `capabilities.ts` — rejected, and it was not
  cheap.** Every `CapabilityKey` is a *node or port* gate: `realtime.subscribe`
  binds to `DbCollection2`'s realtime port and to the `SubscribeToChanges` node
  (`nodeCapabilities.ts:86, 98`). **Replica count is neither**, so the key would
  be the first one nothing consumes — and that file already states the principle
  against it: *"a gate that can never fire is noise on screen and a lie in a
  table."* Nor was the cost small: `tests/gating.test.ts:43,88` enumerates
  `CAPABILITY_KEYS` × `BACKEND_TYPES`, so a new key lands in all eight
  descriptors. The "awkward to retrofit after publication" argument also does not
  hold — the package is `file:`-linked with three in-monorepo consumers.
- 📁 **Where the requirement actually went:** filed at **BRG-003 §3.4.1**
  (`1f65b0506`) by the phase 97 session, as a conformance concern rather than a
  declared capability. That is the right home — §4(b)'s two-process tests belong
  in the same suite.

**The lesson worth keeping:** the *engineering* finding in §3 stands unchanged and
is the important half — the change bus needs Postgres. The *action* it seemed to
imply did not survive contact with the capability system, and a capability key
that gates no node would have been a worse outcome than the silence it was meant
to fix.

### 3.5 🔴 The staged bridge — and stage 1 needs no Postgres at all

**This is the answer to "the most efficient possible bridge", and incident #2 is
what produced it.** The earlier draft of this study had one step: make the app
tier replicable. That was wrong, because the thing that actually hurt Visual Hive
— a heavy periodic job starving user traffic — **is not a replication problem and
does not need replication to fix.**

| stage | what it is | needs Postgres? | answers |
|---|---|---|---|
| **0 — today** | One process, `--role all`. The documented bound. | — | shipped |
| **1 — role separation** | `--role serve \| worker \| all`. A worker runs schedules and heavy workflow/function work and **serves no HTTP**. Two processes, one box, one data directory. | ❌ **No** | incident #2 |
| **2 — replicated serve tier** | N serve processes behind a load balancer, plus worker(s). | ✅ Yes (§3) | the scale ceiling |

**Why stage 1 is free of the hard problem.** Replication needs cross-process
*notification* (the change bus), which is why stage 2 waits for Postgres.
Role separation needs only shared *storage* — and SQLite in WAL mode already
supports multiple processes against one file on a local filesystem. A worker
does not serve SSE, and schedules are time-driven rather than change-driven, so
**the `ChangeBus` problem does not arise.**

What stage 1 actually costs, all of it already on the §2 list:

- **#8 idempotency** — instance-tag claims so a worker's boot does not release the
  server's live ones. This is a *precondition*, not an optimisation: today two
  processes on one data directory corrupt each other's claims.
- **#1 the scheduler** — a unique claim per fire (§2.1), not a leader lease. At
  stage 1 with a single worker this is nearly free; it is what makes stage 2 safe.
- **#9 secrets** — writes become leader-only; a `serve` process reads.
- **#10 `executions.sqlite`** — the worker writes the runs it executes. Needs the
  ownership decision in §6.2 before this is safe.

**The honest bound of stage 1, which must be published with it:** a db-change
trigger still only sees writes made by its own process, so a write by the worker
does not fire a db-change trigger on the server. That is a real limitation, it is
declarable, and it is *much* smaller than the one it removes.

**Why this is the efficient bridge.** It is valuable at **two processes on one
machine** — no load balancer, no Postgres, no Redis, no cluster. It is the first
thing a real user needs and the last thing either comparison tool offers
gracefully, and it ships before the hard half.

### 3.5.1 Reversibility, as design constraints (from incident #4)

Switching Redis on, off, and on again is what hurt at the smaller event, and
*reverting* hurt as much as scaling. Six rules, written now so they are not
discovered later:

1. **One binary, one code path, one flag.** No separate "queue mode" build.
   n8n's difficulty is that everything-on-one-process and workers-mode are
   different enough to need precise config; if the only difference is which
   subsystems a process arms, there is no second architecture to misconfigure.
2. **`all` is the default and is byte-for-byte today's behaviour.** Stages 1 and 2
   are additive. A user who never sets the flag never meets any of this.
3. **1 → N → 1 needs no data migration.** State that moves into the database for
   stage 1 stays there at N=1, so reverting is just stopping a process. Anything
   that would need a migration to revert is the wrong design.
4. 🔴 **No new infrastructure in stage 1, and never Redis.** For stage 2 the
   broker *is* the database (`LISTEN/NOTIFY`). That is strictly simpler than the
   comparison stack and is the competitive point, not an implementation detail.
5. **An incoherent configuration refuses to start**, extending the property
   `ops.json` already has (unknown keys are errors). Two `all` processes on one
   data directory, or a schedule that exists with no worker to run it, are
   startup failures with a sentence — not mysteries.
6. **The mode is observable.** `/admin/status` and `/metrics` report this
   process's role, its instance id, and what it last claimed. Visual Hive's
   diagnosis took a long time; a fleet that cannot say what each member thinks it
   is cannot be debugged under pressure.
7. **Decide version skew before the first rolling update** (§1.3-E). A rolling
   update runs mixed versions by definition. Either tolerate it explicitly, or
   refuse to start against a peer on a different version and say that updates
   need a full stop. n8n requires identical versions across mains; the cost of
   not deciding is an outage during an upgrade, which is the worst time.
8. **Secrets are provisioned, never generated, from stage 2 on** (§1.4).

### 3.6 🔴 Live defects found while checking incident #3 — now owned by phase 98

> ✅ **Filed 2026-09-19 as [phase 98 — The potholes others hit](../tasks/phase-98-the-potholes-others-hit/README.md).**
> HS-D1 → **PRD-D1** (PRD-001), HS-D2 → **PRD-D2** (PRD-002), plus two more the phase
> found while scoping: pruning never reclaims disk (**PRD-D3**) and retention is
> age-only (**PRD-D4**). The analysis below stays as the derivation; **the phase is
> where the work is tracked.**

Incident #3 — missing ID read as "no filter", all rows returned, ~10MB per log
record, capacity exhausted — was checked against NodeGX on 2026-09-19. **The chain
is reproducible today, at one replica, and neither gap is filed anywhere** (searched
`dev-docs/tasks` and `docs/`).

Good news first: the culture already knows this shape. `steps/data.ts:109` makes a
`filter` step with no condition a **refusal**, and the reason given is *"it would
keep everything"*. There is no database-query step kind at all (`types.ts:39-62`),
so workflows reach data through `call-function`. The guard exists in one place and
the exposure is in another.

| id | finding | evidence | why it matters |
|---|---|---|---|
| **HS-D1** 🔴 | **No default and no maximum page size on any query route.** `limit` is applied only when the caller supplies it (`parse-wire.ts:65`), and `QueryBuilder` emits `LIMIT` only `if (options.limit !== undefined)` (`QueryBuilder.ts:699`). No `MAX_LIMIT`/`DEFAULT_LIMIT`/page cap exists anywhere in `src/`. An empty `where` returns an empty clause (`QueryBuilder.ts:330`). | grep for `MAX_LIMIT\|DEFAULT_LIMIT\|maxLimit\|MAX_PAGE\|MAX_ROWS` over `src/` → **no hits**. Confirmed by the suite itself: `tests/search-http.test.ts:153` asserts a plain query's result count with the comment *"all rows, plain query"* — the unbounded behaviour is **tested and expected**, not accidental | **A single unfiltered call returns the entire collection** and materialises it in memory. This is the exact half of incident #3 that turned a logic bug into an outage. A cap does not break correct callers; it converts an unbounded failure into a refusal. |
| **HS-D2** 🔴 | **No byte cap on what a run records** — only *count* caps: `MAX_LOG_LINES_PER_RUN = 200` and `MAX_STEPS_PER_RUN = 1000` (`WorkflowRunner.ts:141, 152`). `MAX_VALUE_DEPTH = 32` bounds nesting, not size — a flat 50,000-row array is depth 2. `log-scrub.ts` scrubs secrets and truncates nothing. | grep for byte/size caps in `WorkflowRunner.ts`, `ExecutionStore.ts`, `log-scrub.ts` → **none** | **Count caps do not bound size.** Visual Hive's records were ~10MB *each*; 200 of those is 2GB in one run, retained for `executions.retentionDays` (default **30**). Retention cannot save you from a fast blowup, and this is the half that *"took us a while to track down"*. |

Two notes on fixing them, because the direction matters:

- **HS-D1 should fail loudly, not silently truncate.** A query whose result is
  capped must say so (a flag on the response, as the existing `limit` overflow
  reporting already does for logs), or a user will build on a silently partial
  list. Silent truncation is a correctness bug wearing a safety hat.
- **HS-D2's cap belongs per value and per run**, with the overflow *reported*
  in the record — the same pattern `MAX_LOG_LINES_PER_RUN` already uses when it
  writes a single "limit reached" marker instead of dropping quietly.
- 🔴 **`retentionDays` alone is not enough, on n8n's evidence** (§1.3-G). They
  needed three controls — max age, max **count**, and a per-workflow "do not
  save" — because age cannot bound a fast blowup and a single busy workflow can
  produce most of the volume. If NodeGX adds a count limit beside the age one,
  **the record must say which limit pruned it**: their community's *"13 hours
  despite 720-hour retention"* thread is two limits interacting invisibly, which
  is a fresh confusion rather than a fix.

Both are **independent of this project**: they are one-replica defects, they get
worse with more processes, and neither needs Postgres, an interface or a phase.
They are the cheapest safety work available in the backend right now.

---

## 4. Test strategy — and why the obvious test is the wrong one to run first

Richard asked whether to stress-test an example full-stack backend against k8s or
k3s. **Not as the first move**, for a specific reason: a 2-replica k3s deployment
would "discover" the eleven failures in §2, and all eleven are already written
down with file and line. **A test whose result is known before it runs grades
nothing.** It would also be measuring the orchestrator as much as the product.

Three tests, in the order they earn their cost:

### (a) The vertical ceiling soak — single replica, no Kubernetes ⭐ recommended first

**The missing number.** `SCALING.md` deliberately publishes no requests/second
figure because none has been measured. The claim we inherit is phase 48's *"fine
to low thousands of active tenants — a cliff, not a wall"*, which is an estimate,
not a measurement, and **phase 97's whole promise rests on it.** Richard's own
question — *could* NodeGX have served that conference? — cannot be answered
without it.

- **Shape:** one backend, production-shaped data (populated, indexed, *not* an
  empty database), a load generator, and a **genuinely mixed** read:write ratio.
  Incident #1 settles this: the conference app wrote on every AI-assistant
  question and every "my day" save, so **a read-mostly soak would measure the
  wrong thing** and flatter us. Ramp until p95 breaks; record the knee and which
  of the six signals in `SCALING.md` moved first.
- **Include a heavy periodic job in the mix.** Incident #2's 30-minute full
  ingest is the realistic shape, and at `--role all` it competes with user
  traffic. Measure request latency *during* a scheduled heavy workflow — that
  number is the argument for stage 1 (§3.5), and it needs no cluster to get.
- **Also measure:** the write-serialisation knee specifically (concurrent writers
  vs latency, with CPU unsaturated — the true storage-ceiling signature), and the
  real SSE connection ceiling against `realtimeMaxConnections`.
- **Cost:** one box, no cluster. The cheapest of the three by a wide margin.
- **What it buys:** a number we can publish and sell against; the knee that tells
  us whether the process ceiling is even the next bottleneck; a reusable
  harness for (b) and (c). **It may also show the ceiling is high enough that
  this whole project is not the right next investment** — which would be a
  valuable result.

### (b) The two-process falsification harness — two Node processes, no Kubernetes

Not to *discover* the breakages but to **pin** them: two backends on one data
directory, asserting each of the eleven failures happens. Eleven red tests
written before any fix.

- Each becomes an acceptance criterion; the project closes when they are green.
- House style already (phase 97 rule 5: *"tests are the drive, not the unit"*),
  and it belongs in BRG-003's suite.
- **Do not write these until the project is scoped** — red tests with no owner
  become noise. They are cheap *then*.

### (c) k3s — last, and only for what only an orchestrator breaks

Once the app tier is actually replicable, k3s earns its cost on the failures the
first two tests structurally cannot see:

- **Rolling restarts** — graceful `SIGTERM` drain mid-SSE-stream (already
  verified single-process: *"drained in 26ms, exit 0"*), and whether the leader
  lease transfers without a double-fire or a scheduling gap.
- **Sticky routing** for SSE and OAuth, and what happens when it fails.
- **Readiness gating** — a replica must not take traffic before persistence is
  open.
- **Pod eviction and node loss** — lease expiry under a hard kill, not a clean stop.
- **Storage** — that `PersistentVolume` RWO vs RWX does what we think, and that
  the "never a network filesystem for the data directory" rule is enforced rather
  than advised.
- 🔴 **Autoscaling policy.** Scaling a single-writer app on CPU makes it *worse*.
  If we ever ship an HPA example, this is where it gets proven or deleted.

---

## 5. Recommended next step

Reordered after the field report — **the two defects now come first**, because they
are live today at one replica and they are what actually caused the outage.

1. ✅ **Build [phase 98](../tasks/phase-98-the-potholes-others-hit/README.md) — PRD-001 → 003.**
   The outage chain, closed. Cheap, self-contained, no Postgres and no interface,
   and it protects a single-process user who will never scale anything.
   **Highest value per hour in this document**, and it no longer lives here.
2. ⭐ **PRD-004 — the vertical ceiling soak**, also in phase 98, after 001 → 003 so
   it measures the backend we intend to ship. It produces the number `SCALING.md`
   and phase 97's promise both lack, and — with the heavy-job delta (§3.3 of that
   task) — the evidence for or against stage 1 of *this* project.
3. **Scope stage 1 (§3.5) as its own phase** if PRD-004 shows the heavy-job
   interference is real. It is not gated on phase 97.
4. **Stage 2 waits for BRG-005**, on the §3 argument.

### What phase 97 should take from this

The two earlier candidate asks were checked and closed (§3). The web survey added
**one new item that genuinely belongs to phase 97**, and it is cheap only while
BRG-005 is unwritten:

- 🔴 **BRG-005 must decide connection-pool sizing deliberately** (§1.3-F). n8n's
  second most common production failure is exhausting Postgres `max_connections`,
  because every worker opens its own pool. The adapter wants a conservative
  default, a documented formula (`replicas × pool ≤ max_connections − headroom`),
  and PgBouncer guidance. **A pool size chosen by default-of-the-library is how
  everyone else gets there.**

HS-D1 and HS-D2 are conformance-suite shaped and were passed to the BRG-003
session as information, not filed into the phase. The notify requirement is filed
at BRG-003 §3.4.1.

---

## 6. Open questions for Richard

1. ✅ **Answered 2026-09-19 — recorded, not still asked.** The conference was
   *both*: shared read-mostly content (sessions, exhibitors, attendees) plus a
   real write path (per-user "my day" saves and a profile rewritten after every
   AI assistant question). So a read-mostly soak is invalid, and §4(a) has been
   corrected. **The remaining half of the question stands:** is "one app process,
   a real database behind it" enough to sell against, or does a serious evaluator
   reliably ask about replicas next? If the latter, stage 1 (§3.5) moves up.
2. **Does `executions.sqlite` (#10) stay per-replica or move?** Cheap to decide
   now, expensive after the migrator exists.
3. ✅ **Redis — recommended against, and §3.5.1 rule 4 now says so.** Incident #4
   is direct evidence that a broker is where operators get lost, and stage 2 does
   not need one because `LISTEN/NOTIFY` makes the broker the database you already
   run. **Confirm you are happy for that to be a stated constraint** rather than
   a preference, since it forecloses an option under pressure later.
4. **Where should this study live?** Filed in `future-projects/` as a study
   rather than a phase, because horizontal scaling is explicitly phase 97 §6's
   out-of-scope. Say if it should be a numbered phase instead.
