# BRG-003 — The conformance suite

**Status: 🏗 s2 (2026-09-19). The suite exists and runs: 53 cases across five areas, green
against SQLite, and proven able to fail by six mutants. AC1, AC3 and AC4 closed. Left: the CI
gate (AC6/AC7), the declaration mechanism exercised (AC5), and three §3.2 areas with no cases
yet — see §5.5.**

## 1. The person sentence

**The promise "your app moves" is a test suite that runs, not a sentence someone wrote — and the day
a feature lands that would have broken it, CI says so instead of a user finding out in a year.**

## 2. What is there (read 2026-09-18, HEAD `df60eb6f5`)

| reading | where |
|---|---|
| 8 test files exercise the adapter stack, all written against `LocalSQLAdapter` **by name** — implementation tests, not a contract | `noodl-runtime/test/adapters/*.test.js` |
| 159 test files in the backend, most provisioning a real service over HTTP. Good raw material; none of it is adapter-parameterised | `nodegx-backend/tests/` |
| `QueryBuilder.test.js` asserts emitted **SQLite SQL text** — the single most adapter-specific suite there is, and the one that must NOT become conformance | `noodl-runtime/test/adapters/QueryBuilder.test.js` |
| 🔴 `generatePostgresSQL` / `generateSupabaseSQL` have **zero** tests and are reachable from a live admin route | grep: 0 hits; `server/byob-admin.ts:466-468` |
| `capabilities.ts` already carries `supported \| unsupported \| conditional \| degraded` with a `reason`, plus a `CapabilityProbe` shape for verifying a claim against a live backend | `nodegx-backend-contract/src/capabilities.ts:33-60, 164-211` |

## 3. Design

### 3.1 The shape

One suite, exported as a function, run once per adapter:

```
packages/nodegx-backend-contract/conformance/
  index.ts          runConformance(makeAdapter: () => Promise<IStorageAdapter>, decl: Declaration)
  cases/            records, queries, filters, acl, relations, transactions, changes, schema, operational
```

`nodegx-backend` runs it against SQLite. BRG-005 adds one file to run it against Postgres. Nothing
else changes.

### 3.2 What it covers, and why each

| area | why it is in the promise |
|---|---|
| CRUD + the `wire*` `{__type}` envelopes and `include=` expansion | this is what every data node on the canvas receives; a difference here is a visibly broken app |
| Every filter operator in `QueryBuilder` — `$in/$nin/$regex/$exists/$gt…` | the filter surface is what an author actually builds with |
| Row ACLs, `creatorOwns`, and the CLP gate | 🔴 **the highest-stakes area.** A row-level predicate that translates loosely is a data breach, not a bug. See rule 4 |
| Relations, and junction behaviour | BRG-D3: relations currently vanish from the Postgres export entirely |
| Declared indexes, unique constraints, and upsert-on-unique (FED-002) | BRG-D2: these silently do not cross today |
| Transactions, including rollback and the buffered change emission | `ChangeBus` depends on post-commit ordering; realtime and DB-change triggers both ride it |
| The change tap: ordering, commit-boundary, no events on rollback | realtime SSE and `triggers/dbchange` are both consumers |
| `IOperationalStore`: claim, CAS, release, sweep | idempotency correctness is what makes a retried cloud function safe |
| Aggregate and distinct | served under an ordinary `find` permission here, unlike upstream Parse — `backends.ts:16-23` |

### 3.3 What it deliberately does not cover

Emitted SQL text. Engine-specific plans. `QueryBuilder.test.js` stays exactly where it is, testing
SQLite, and is never parameterised — asserting SQL text across two dialects is how a conformance
suite becomes a second implementation.

### 3.4 Declared divergence, not silent divergence

Some things genuinely cannot be identical. FTS5 and `tsvector` rank differently; SQLite's `$regex`
and Postgres `~` differ at the edges; collation and `ORDER BY` on mixed types diverge.

Each such case declares itself through the **existing** `capabilities.ts` vocabulary with a
`reason`, and the suite asserts *the declaration*: a case marked `degraded` must still return
correct rows and may differ in order; a case marked `unsupported` must **fail loudly**, never return
a wrong answer quietly. An undeclared divergence is a suite failure. **Silence is the failure mode
this whole phase was created by** (README §2).

### 3.4.1 The cross-process notify channel — filed here, and NOT in BRG-001

Raised 2026-09-19 by a peer session from
[`dev-docs/future-projects/HORIZONTAL-SCALING-STUDY.md`](../../future-projects/HORIZONTAL-SCALING-STUDY.md)
§3: a `LISTEN/NOTIFY` channel is *"near-unfixable on SQLite and near-trivial on Postgres"*, and the
study asks that it be declared `conditional` in `capabilities.ts` — **"cheap now, awkward to retrofit
after the interface is published"**.

**The subject is real and the placement was measured wrong.** Three readings, taken at
HEAD `978d49da8` before deciding:

1. 🟢 **BRG-001's interface does not foreclose it, which is what the study actually asked for.**
   `IStorageAdapter.on/off` are optional and carry `StorageChange`, and nothing in the declaration
   says where the event came from. A Postgres adapter sourcing those events from `LISTEN/NOTIFY`
   published inside the committing transaction implements the interface **as written**, with no
   change — and that is exactly the post-commit, release-on-commit semantics `ChangeBus` already
   promises. Nothing to do.
2. 🔴 **A `CapabilityKey` is a node/port gate, and a notify channel gates neither.** Every one of the
   27 keys exists so the editor can grey something an author can see: `NODE_CAPABILITIES` binds
   `realtime.subscribe` to the `SubscribeToChanges` node and to `DbCollection2`'s `realtime` port
   (`nodeCapabilities.ts:86, 98`). How many app processes you run is not a node, not a port, and not
   a property of a backend *type* — it is the same descriptor under a different deployment. The key
   would be the first one nothing consumes.
3. 🔴 **And it is not cheap.** `CAPABILITY_KEYS` is enumerated by `gating.test.ts` across
   `BACKEND_TYPES` × every key, so a new key must be declared in all **eight** descriptors
   (`src/descriptors/`) with both readings of a `conditional` cell holding. **"Awkward to retrofit
   after publication" does not apply either**: this package is `file:`-linked inside the monorepo
   with three consumers and no external ones, so the retrofit costs the same the day it is needed as
   it does today.

**So: the declaration belongs to this task's §3.4 mechanism, not to BRG-001's interface, and it
lands when the thing it describes exists.** It is recorded here so it is not rediscovered — and §10
already says DAT-007 and §3.4 must be implemented once, not twice; this is a third claimant on the
same mechanism.

⚠️ **The one live consequence for BRG-006:** the published sentence (R2) must not be read as
promising cross-process change delivery. It already says *"one app process"*, which covers it.

### 3.5 The gate — the part that earns its keep before any Postgres exists

A CI check that fails when a new capability appears on the facade or the schema surface without a
conformance case or an explicit `unsupported` declaration. This is what converts the invisible
permanent tax into a visible one, and it works from the day it lands with SQLite as the only
adapter. FED-002's index declaration would have tripped it (BRG-D2).

## 4. Acceptance criteria

1. **AC1** — `runConformance()` exists, runs against SQLite via `createAdapter`, and is green.
2. **AC2** — Every area in §3.2 has cases. The case count is recorded in this file.
3. **AC3** — A deliberately broken adapter (a mutant: drops the ACL predicate, ignores `unique`,
   emits changes before commit, loses rollback) **fails** the suite, one distinct failure per
   mutation, and each is recorded here by name. A suite that cannot fail proves nothing.
4. **AC4** — The ACL cases are adversarial, in the house style of `security-enforcement.test.ts`: a
   non-owner reading, updating and deleting another user's rows through query, fetch, aggregate,
   distinct, search, relation traversal and realtime — each denied.
5. **AC5** — The declaration mechanism works: a capability marked `unsupported` and then exercised
   produces a loud failure and never a wrong row; a capability marked `degraded` returns correct
   rows.
6. **AC6** — The §3.5 gate is in CI. Adding a facade method with no case and no declaration fails
   the build; the failure message names the method.
7. **AC7** — The gate is run against HEAD as it stands and **every existing uncovered capability is
   either given a case or declared**. The list of what needed declaring is recorded here — that list
   is the honest measure of how far the product had already drifted.
8. **AC8** — BRG-D4 closed: the two SQL generators either have tests or no longer exist (per R3).


## 5. As built, s2 — 2026-09-19

### 5.1 What landed

| file | what |
|---|---|
| `nodegx-backend-contract/conformance/index.ts` | `runConformance(makeAdapter, decl)`, the case registry, the §3.4 declaration vocabulary |
| `conformance/context.ts` | the promisified data plane every case is written against |
| `conformance/assert.ts` | four assertions — deliberately not jest's `expect` |
| `conformance/cases/{records,filters,acl,relations,schema}.ts` | **53 cases** |
| `conformance/mutants.ts` | six deliberately-broken adapters (AC3) |
| `nodegx-backend/tests/brg-003-conformance-sqlite.test.ts` | AC1 — the suite against SQLite |
| `nodegx-backend/tests/brg-003-conformance-mutants.test.ts` | AC3 — the proof it can fail |

**AC2 — the case count, by area: `records 13, filters 10, acl 15, relations 6, schema 9` = 53.**
The count is printed by the run from `CONFORMANCE_CASES.length` rather than kept by hand here: a
hand-maintained count drifts the first time a case lands.

### 5.2 AC3 — the six mutations, and what caught each

Every mutation is a plausible way a second adapter gets it wrong, not a cartoon break. Each is
caught by a **distinct** set of cases, which is asserted — six mutations all caught by one case
would mean the suite has one real assertion and fifty-two decorations.

| mutation | cases that caught it |
|---|---|
| `drop-acl-on-reads` | **9** — every read shape: query, count, distinct, aggregate, the empty-key-set case and the write-grant-does-not-confer-read case |
| `drop-acl-on-writes` | **3** — `a-non-owner-cannot-{save,delete,increment}` |
| `count-returns-page-length` | **2** — `records/count-matches-the-visible-set`, `acl/count-counts-only-visible-rows` |
| `ignore-unique` | **3** — `unique-index-refuses-a-duplicate`, `compound-index-is-unique-over-the-tuple`, `index-declaration-survives-a-reread` |
| `relation-inverse-ignores-target` | **2** — both `inverse-lookup-*` cases |
| `aggregate-ignores-acl` | **1** — `acl/aggregate-computes-only-over-visible-rows` |

🔴 **`ignore-unique` is BRG-D2 itself.** It is not a hypothetical: `generatePostgresSQL()` drops
every declared index at HEAD, so the mutant models the exporter that is live right now. The suite
catches it in three places, which is what makes BRG-004's fix checkable rather than assertable.

Two controls run in the same file, because a detector that fires on everything detects nothing:
the **unmutated** adapter passes all 53, and **no** mutation reds the whole suite.

### 5.3 What the first drive found, and it was the instrument

The first run reported 22 failures. **One was the adapter's; twenty-one were the harness's.**
`ctx.collection('Flt')` keyed only on the run, so every case asking for the same base name got the
same table and ran against the accumulated fixtures of all the others — which surfaced as
`["ada","ada","ada"]` rather than as an error, because piling rows into a shared table breaks no
invariant the adapter has. A suite whose cases are not isolated measures the adapter's behaviour
plus its own execution order, and the second is not in the promise. `collection()` is now unique
per *call*.

🔴 **And a second instrument fault that jest could not see.** `mutants.ts` typed its call-shape
helper as `Record<string, unknown>`, widening all seven mutated call sites. Every test stayed green,
because these files run under the backend's ts-jest with `isolatedModules: true`, which transpiles
without typechecking. `tsc --noEmit` on the contract package is what caught it — so **the suite's
own gate is two commands, not one**, and a BRG-005 session that runs only jest has not gated its
adapter. `tsconfig.json`'s `include` also needed `conformance/**/*.ts` added, or the directory is
invisible to `tsc` entirely.

### 5.3.1 ⚠️ `npx jest` in `nodegx-backend` does not terminate — and it is not this task

Gating the suite meant running the whole backend package, which sat at **142 of 143 suites for 17
minutes**. The straggler is `tests/ac2-page-editor-drag-drive.test.ts` (SBR-007 AC2, phase 77,
unmodified since 2026-09-11). It hangs **standalone** too, with `--testTimeout=45000 --forceExit`,
for over five minutes: the log shows it provisioning a backend and running `claimSite` successfully
and then stopping, because it drives the real `/Pages/PageEditor` and needs a live editor that a
plain `jest` run has not started.

So: **142/143 green, 0 failed**, and the one that did not report is environment-dependent and
predates this task. Recorded because the next session to gate a `BRG` task will otherwise spend the
same 17 minutes discovering it — and because a run that never prints `Tests:` looks exactly like a
run that is still working.

🔴 Kill such a run by **PPID**, never `pkill -f jest`: two peer sessions had their own suites running
on this box at the time.

### 5.4 Acceptance criteria

| | criterion | |
|---|---|---|
| AC1 | `runConformance()` runs against SQLite via `createAdapter` and is green | ✅ 53/53 |
| AC2 | every §3.2 area has cases; the count is recorded | 🏗 five areas, 53 cases. **Changes, transactions and `IOperationalStore` have none** — see 5.5 |
| AC3 | a mutant fails, one distinct failure per mutation, each recorded by name | ✅ six mutations, six distinct signatures, both controls green |
| AC4 | the ACL cases are adversarial | ✅ 15 cases; every read and write shape a non-owner can reach |
| AC5 | the declaration mechanism works | ⬜ the vocabulary is implemented and `unsupported` inverts correctly, but nothing declares yet, so it is **unexercised** |
| AC6 | the §3.5 CI gate | ⬜ not built. The structural half is done — `ConformanceContext` exposes no `getDatabase`, asserted |
| AC7 | the gate run against HEAD; everything uncovered declared | ⬜ blocked on AC6 |
| AC8 | BRG-D4 closed | ⬜ BRG-004's business |

### 5.5 What is deliberately not covered yet, and why it is not a silent gap

Rule 2 of the phase README: *"nothing may be in the promise that is not in the suite."* Three §3.2
areas have **no cases**, and they are named here rather than left to be discovered as an absence:

| area | why not yet |
|---|---|
| **Transactions and rollback** | `IStorageAdapter.transaction()` is still synchronous, and BRG-002 §3.1 moved the only caller to `upsertBatch` — which is the one facade method whose implementation is still SQLite-specific. Testing rollback portably needs that resolved first |
| **The change tap** (ordering, commit-boundary, none on rollback) | `on`/`off` are optional and feature-detected; `ChangeBus` is the real consumer and it lives in `nodegx-backend`, not behind the adapter interface. This wants a case that drives the bus, not the adapter |
| **`IOperationalStore`** (claim, CAS, release, sweep) | ~~does not exist yet~~ — **built 2026-09-19 s3** (BRG-002 §7). It is now the cheapest of the three to cover: the interface is 7 methods with no I/O of its own, and `nodegx-backend/tests/brg002-operational-store.test.ts` already has 17 SQLite-bound cases to lift into an adapter-agnostic harness |

The `wire*` envelopes and `include=` expansion are also uncovered: they live on `IStorageFacade`,
not on the adapter, so they need a second harness taking a facade. That is the largest remaining
piece of AC2.
