# Phase 90 — Every change has a number

**Scoped:** 2026-09-15, at HEAD `3206e12e5`. **This is the second of three phases scoped together:**
1. [P89 — a box of your own](../phase-89-a-box-of-your-own/README.md): hosting, sign-in and the PWA.
2. **P90 (this one):** the backend learns to sync.
3. [P91 — the app in your dock](../phase-91-the-app-in-your-dock/README.md): a desktop app with a local copy of the data.

P89 explains why there are three phases, and which earlier ruling they reopen.

**Status: ⬜ NOT STARTED — an index only, except SYN-003 🟢** (built 2026-09-15, uncommitted, pulled forward at
Richard's request because it was a live defect; see its row). No task file is written. Each task gets its file when a later session opens
the phase, and that session re-reads the task's row at HEAD first. **Prefix: `SYN`.**

> "If I had no constraints what I would like is an Electron desktop app that has a local DB that syncs with the cloud
> and handles conflicts with other devices if that comes up. I know it's hard, but how would you scope it out?"
> — Richard, 2026-09-15

**This phase is backend-only.** It adds what sync needs to the NodeGX backend and grades it in one process, with test
clients standing in for devices. [P91](../phase-91-the-app-in-your-dock/README.md) builds the real device: a backend
running as a local copy.

## 1. The person sentences

**Track 0 — the harness.**

> **A sync fault can be made on purpose, as many times as needed, with the same result each time.**

**Track A — the backend remembers.**

> **Every change the backend accepts has a number, whichever path made it, and a device that was away can ask for
> everything after the last number it saw.**

**Track B — two devices disagree.**

> **When two devices changed the same record while apart, both changes survive wherever they can. Where they cannot,
> the losing value is kept and can be shown.**

## 2. What is in, and what is not

**In:**
- A change log, tombstones for deletes, versions on rows and fields, and IDs created by the client.
- A pull endpoint and a push endpoint, and the conflict rules.
- Realtime events that carry their change number.
- A deterministic sync harness.

**Out:**
- **The local copy itself** (`serve --upstream`), sync status nodes, files offline, and the desktop app. These are all in
  P91.
- **Offline data in a browser.** A page cannot run `node:sqlite`.
- **Peer-to-peer sync, and CRDTs for records** (R1).
- **Conflict rules set per collection.** V1 has one rule (R4), and a collection-level choice waits for a person to need
  it.
- **Real-time collaborative text editing.**

## 3. What scoping measured

Read on 2026-09-15 at `3206e12e5`. **✔** = re-read at that HEAD. **·** = reported by a read-only search, not re-read.

**In one line: the backend has nothing sync needs yet.** There is no durable record of changes, deletes erase rows,
rows have no version, and the server always makes the ID.

| | reading | where |
|---|---|---|
| ✔ | The server makes every record ID | `packages/noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts:994` |
| ✔ | 🔴 **A client-sent `objectId` replaces the server's, and `create()` then returns nothing.** `buildInsert` spreads `options.data` over `objectId: id`, and `create()` reads the row back by the generated ID. *Read from source, not driven* | `QueryBuilder.ts:747-753`, `LocalSQLAdapter.ts:998-1002` |
| · | Both write routes pass the request body straight through, so this is reachable today | `nodegx-backend/src/server/parse-wire.ts:202`, `byob-admin.ts:143` |
| ✔ | A row has `objectId`, `createdAt`, `updatedAt` and `ACL`, and no version column | `SchemaManager.ts:108-111` |
| ✔ | **There is no change log.** `ChangeBus` is an in-memory tap that fires after commit | `nodegx-backend/src/realtime/ChangeBus.ts:1-16` |
| ✔ | Realtime is *"Events-only, no replay."* A reconnect gets `resync`, and the client re-runs its query | `RealtimeHub.ts:15-18`, `:204-206` |
| ✔ | A delete is a real `DELETE FROM`, with no tombstone | `QueryBuilder.ts:833` |
| ✔ | Columns are created on write, with an inferred type | `LocalSQLAdapter.ts:978-990` |
| ✔ | Collection permissions are enforced in the HTTP layer. A write made straight to the adapter skips them | `nodegx-backend/src/server/HttpServer.ts:1873-1879` |
| · | Row ACLs come from `security.aclFor` and are compiled into the SQL; create stamping happens in the HTTP layer | `HttpServer.ts:1709`, `:1886-1907` |
| · | There are no `beforeSave`/`afterSave` hooks. DB-change triggers run after commit and cannot block a write | `nodegx-backend/src/triggers/dbchange.ts` |
| ✔ | The runtime picks between two data adapters directly, with no plug-in registry | `packages/noodl-runtime/src/api/cloudstore.js:62` |
| · | A record references a file by `{__type:'File', name, url}` in JSON. The upload and its `_Files` row are not atomic | `nodegx-backend/src/persistence/AdapterFacade.ts:269-271` |

## 4. Decisions — proposed at scoping, not ruled

| # | question | proposal | task |
|---|---|---|---|
| R1 | Topology | **A star: the cloud decides.** Every change reaches other devices through the cloud, and its change number orders everything. Device clocks are never trusted. CRDTs are ruled out for records, because the server could not refuse a merged change on permission grounds | all |
| R2 | Build, or adopt PowerSync, ElectricSQL or cr-sqlite? | A time-boxed spike. As far as scoping knows, PowerSync and ElectricSQL need a Postgres source, which the NodeGX backend is not, so the expected answer is to build. The spike measures that rather than trusting it | SYN-002 |
| R3 | Record IDs | Clients create them as UUIDv7 (time-ordered), so a record made offline keeps its ID and anything pointing at it still works after sync | SYN-003 |
| R4 | Conflicts | **Merge field by field.** If two devices changed the same field, the change that reached the cloud later wins, and the losing value goes to `_Conflicts`. If one device deleted a record while another edited it, the delete wins and the edit is recorded | SYN-013–015 |
| R5 | Deletes | A delete leaves a tombstone, purged after a set period. A device that has been away longer than that period resyncs in full | SYN-006, SYN-010 |
| R6 | A column's type | The cloud settles it. A pushed value that does not fit the column is refused, not coerced, because two devices guessing different types is how copies drift apart silently | SYN-016 |
| R7 | Whose data | V1 is one person with many devices. Data shared between people goes through the same permission-filtered pull, but losing access to a row is its own task | SYN-009 |

## 5. Tasks

**No task files yet.**

### Track 0 — the harness

| id | task | source | depends on |
|---|---|---|---|
| SYN-001 | A sync fault can be made on purpose: a cloud backend and two test clients in one process, with cut networks, processes killed partway through a push, and a seeded order | new | — |
| SYN-002 | Adopt or build is measured and recorded (R2) | new | — |

### Track A — the backend remembers

| id | task | source | depends on |
|---|---|---|---|
| SYN-003 🟢 | A record sent with its own ID keeps that ID, and a clash returns 409 (R3). **Built 2026-09-15, uncommitted.** Red before the fix: adapter 14/15 (`create()` returned `null`, and the event named the generated UUID); HTTP `/classes` 500 ×3, `/api` 201 with a `null` body. The adapter now keeps a valid id (`^[A-Za-z0-9_-]{1,128}$`) and refuses a taken or malformed one before writing anything; `buildInsert` writes the id it is given; HTTP answers 409 (code 137) or 400. 4 reverted arms (1/5/7/3 red), both typechecks 0, adapter regression 159/159, backend create paths 110/110. Tests: `noodl-runtime/test/adapters/LocalSQLAdapter.clientObjectId.test.js`, `nodegx-backend/tests/syn003-client-object-id.test.ts`. **Left:** UUIDv7 is not enforced (any URL-safe id is accepted), and client-sent `createdAt`/`updatedAt` still reach the INSERT | §3 row 2 | — |
| SYN-004 | Every accepted change has a number, written in the same transaction, on **every** write path: the API, the admin UI, triggers, workflows, cron and backup import | new | SYN-001 |
| SYN-005 | Data that already exists gets numbers once | new | SYN-004 |
| SYN-006 | A deleted record leaves a tombstone (R5) | new | SYN-004 |
| SYN-007 | Every row, and every field, knows the change that last touched it | new | SYN-004 |
| SYN-008 | A device can pull everything after its number, filtered to what it may read | new | SYN-004, SYN-006 |
| SYN-009 | A device that loses access to a row is told to remove it (R7) | new | SYN-008 |
| SYN-010 | A device away longer than the purge period resyncs in full | new | SYN-006, SYN-008 |
| SYN-011 | A realtime event carries its number, and a reconnect pulls from that number instead of re-querying everything | `RealtimeHub.ts:15-18` | SYN-008 |

### Track B — two devices disagree

| id | task | source | depends on |
|---|---|---|---|
| SYN-012 | A device pushes a batch of changes through the same permission checks and create stamping as a normal write, and a retried change never applies twice | new | SYN-003, SYN-007 |
| SYN-013 | Edits to different fields of the same record both survive | R4 | SYN-012 |
| SYN-014 | Edits to the same field: the later arrival wins, and the losing value is kept | R4 | SYN-013 |
| SYN-015 | An edit to a record another device deleted is recorded, and does not bring the record back | R4 | SYN-006, SYN-012 |
| SYN-016 | A value whose type does not fit its column is refused, not coerced (R6) | R6 | SYN-012 |

### The proof

| id | task | source | depends on |
|---|---|---|---|
| SYN-017 | Across seeded harness runs, with cut networks and processes killed partway through a push, every copy ends byte-identical and every conflict is recorded | new | all |

## 6. Collisions

- **P84, P87 and the templates use the backend today.** Every change in Track A lands in a backend that real projects
  read. A new column or table must not show up in `/_admin` as a user's data, or in a backup restore as a surprise.
- **BAK-001's `ChangeBus` contract** is "one tap, two consumers". SYN-004 is a durable log, written in the transaction,
  and it must not become a third consumer that can miss a change the tap saw.
- **The backup and import code** (`nodegx-backend/src/backup/`, `AdapterFacade.upsertSync`) is the one path that already
  accepts a supplied ID. SYN-003 and SYN-004 must keep a restore from creating a history nobody made.
- **The Parse-wire and REST adapters** both write. SYN-004's census counts write paths in both.

## 7. Rules every task inherits

- 🔴 **Re-read the row at HEAD before writing its task file.**
- 🔴 **Every test that completes can pass while a crash partway through corrupts data.** Each Track B task has an
  abandoned arm, where a process dies partway through, beside the arm that completes.
- 🔴 **A write path the change log misses makes devices drift apart without a sound.** SYN-004's acceptance criteria name
  every path by census, beside a control path that is known to log.
- **An absence is only a finding beside a known-firing signal.**
- **A fix without a reverted arm is not graded.**
- **One heavy job at a time.** Seeded harness runs are heavy.
- 🔴 **Do not scope by time.** Dependency order only, and no estimates.

## 8. The end condition

This phase closes when SYN-017 passes across seeded runs with an abandoned arm in each, every SYN task is graded or
recorded as disproved, and SYN-003's live defect is fixed with a reverted arm.
