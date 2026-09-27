# BRG-006 — The drive: a real app crosses

**Status: 🟢 Built and green, s10 (2026-09-20). AC1–AC7 closed; AC8 published and awaiting
Richard's ruling.** `tests/brg-006-the-drive.test.ts` — **22/22, exit 0, 206 s**, the whole app
driven across and back. It found one product defect the bridge did not cause: **BRG-D10**, two
REST surfaces answering `1` and `true` for the same Boolean in the same row on one engine.

## 1. The person sentence

**A NodeGX app that a person actually built — pages, workflows, cloud functions, a schedule, login,
row ACLs, realtime — is moved onto Postgres by one command and keeps working, and the person never
opens the editor to do it.**

## 2. Why a drive and not a test suite

BRG-003 proves the adapters agree. It does not prove **the app** moves, and those are different
claims. A conformance suite can be green while the thing a user cares about — their workflow still
firing, their function still returning, their login still working, their realtime list still
updating — is broken by something no unit touched.

The house rule applies (phase README §7.5, `PHASE-EXECUTION.md`, and phase 96's FED-006): the drive
is the gate.

## 3. The app that proves it

Reuse an existing project rather than building one, so the drive measures the product and not a
fixture. It must exercise, at minimum:

| capability | why it is in the drive |
|---|---|
| A cloud function that reads and writes as system | `runAs: 'system'` bypasses CLPs and ACLs (`security/model.ts:169-171`) — a different code path from a user request |
| A workflow with a `for-each` and a `sleep` | holds a concurrency slot across a step boundary; state must survive |
| A schedule trigger | single-process scheduler, `missedFirePolicy` — does it still fire after cutover |
| Login, a session user, and `creatorOwns` rows | 🔴 the row-ACL path end to end, through a real session token |
| A scoped API key | a second auth path with different enforcement (`security/state.ts:411`) |
| A unique index and upsert-on-unique | FED-002; BRG-D2 is precisely this guarantee failing to cross |
| A relation | BRG-D3 |
| Realtime SSE with a filtered subscription | rides the `ChangeBus` commit boundary |
| An uploaded file | storage is already S3-capable and should be unaffected — prove it |

## 4. Acceptance criteria

1. **AC1** — The app runs on the built-in SQLite backend. Its behaviour is recorded: function
   outputs, workflow execution records, a realtime event, the ACL denials. **This is the control,
   captured before anything moves.**
2. **AC2** — `migrate --dry-run` produces a clean carry report. Anything that does not cross is
   named, and `git`-committed as part of the drive record.
3. **AC3** — `migrate` runs to completion and verify is green.
4. **AC4** — After cutover the app serves from Postgres and **every recorded behaviour in AC1 is
   reproduced**, compared against the control, not merely inspected.
5. **AC5** — 🔴 **Zero changes** to the project: `git diff` over the project directory after the
   whole exercise is empty. No node, no workflow definition, no `schema.json` entry, no function
   changed. This is the sentence the phase exists to be able to say, and it is asserted, not claimed.
6. **AC6** — A non-owner is still denied read, update and delete on another user's rows, through
   session **and** API key, on Postgres — re-run from AC1's control, not written fresh.
7. **AC7** — Going back works: flip the config to the untouched SQLite file, restart, the app serves
   again. The source file's sha256 matches AC1.
8. **AC8** — 🔴 **The bounded claim is published.** The docs state what the bridge buys (the storage
   ceiling) and what it does not (the single-process app tier, README §3), in the words R2 rules,
   where a user deciding whether to start on NodeGX will read it — not only in a task file. Richard
   has read it and ruled it honest.

---

## 5. What was built (s10, 2026-09-20)

`packages/nodegx-backend/tests/brg-006-the-drive.test.ts`, plus one fixture module
(`tests/fixtures/bridge-drive/additions.ts`). **22 cases, 22 green, exit 0, 206 s.**

### 5.1 🔴 The corpus decision — the one that decides whether any of this means anything

§3 said *"reuse an existing project rather than building one, so the drive measures the product and
not a fixture."* The app driven is **FED-006's feed reader, imported unmodified** from
`tests/fixtures/feed-drive/project.ts` — a backend application phase 96 authored and shipped
(`9942f29c4`) with no knowledge that this phase would exist. **A corpus shaped by the migrator's own
author grades the author.**

Five of §3's nine capabilities were already FED-006's and were never negotiable:

| §3 capability | where it came from |
|---|---|
| a cloud function that reads and writes as system | FED-006 `pollSources` (`runAs: 'system'`) |
| a schedule trigger | FED-006 `trg_fed006_poll`, `* * * * *`, `overlapPolicy: skip` |
| login, a session user, `creatorOwns` rows | FED-006 `Follow` / `Keep` |
| a scoped API key | FED-006's key bound to Alice |
| a unique index and upsert-on-unique | FED-006 `Item.id` unique + `upsertOn: 'id'` |

The four it does not carry are **composed onto** it, never edited in, and each is present because it
names a specific way a migration can be green and wrong:

1. **A relation** — and deliberately **not one invented for the drive**. It uses the relation *every
   NodeGX backend already has*, `_Role.users` and its `_Join_users__Role` junction, which is what a
   real app's permissions hang off (`security/state.ts:525`). BRG-D3 was exactly this vanishing.
   A relation written for the drive would have been a relation shaped like the fix.
2. **A `Boolean` column** (`Mark.pinned`) — BRG-D8's subject, measured in a running app rather than
   at a facade. This is the one that produced BRG-D10.
3. **An uploaded file** — storage is S3-capable and *should* be unaffected by the database moving.
   "Should be" is why it is in the drive: file metadata does live in the database.
4. **A workflow with a `for-each` and a `wait`** — §3's reason is occupancy, and it also reaches the
   half of the backend `migrate` does not touch (`executions.sqlite`).

Realtime needed nothing declared: `/realtime` is a runtime surface.

### 5.2 🔴 `probe()` is recorded and compared, never re-asserted

AC4 says *"compared against the control, not merely inspected"*. One function collects everything —
item ids, both people's lists, the key's reading, six denial codes, the role's membership, the
file's sha256, the workflow's answer, which realtime frames arrived — and returns a snapshot. It is
called **three times**: SQLite, PostgreSQL, SQLite again. The criterion is
`expect(normalise(afterPg)).toEqual(normalise(control))`.

A drive that re-ran a list of expectations against PostgreSQL would pass on any behaviour both
engines get equally wrong. A recorded snapshot compared field for field cannot — which is also why
the declared divergence is lifted **out** by name rather than smoothed inside.

### 5.3 The CI hole, closed where it is measured

Five spec files in this phase skip themselves when no PostgreSQL answers, so a CI run with no
database was green and said nothing — written down in four places and closed in none.
**`NODEGX_REQUIRE_PG=1` now makes that a failure**, thrown at module load with the URL in the
message. A developer's laptop does not set it and keeps the skip.

## 6. The readings (2026-09-20)

| | reading |
|---|---|
| the drive | **22/22, exit 0, 206 s** (`brg-006-the-drive.test.ts`) |
| AC2 carry report | clean, nothing `cannot-cross`; names `_User`, `_Session`, `_Role`, `_ApiKey`, `_Audit`, `_Files` and every app collection. Committed at `brg-006-drive-record/carry-report.txt` |
| AC3 migrate | 58 rows, 15 batches, 0.1 s; **43 records compared through both adapters, nothing differs**; source sha256 identical. `brg-006-drive-record/migrate.txt` |
| AC5 | every project file byte-identical across `migrate`; every authored declaration byte-identical across the whole exercise |
| AC7 | the app served again from the untouched file, and the snapshot matched the control |
| siblings | `feed-drive`, `fed-004`, every `realtime` spec: **9 suites / 83 tests, exit 0** — the two shared files this task touched are unharmed |
| typecheck | `typecheck:backend-tests` exit 0 |

### 6.1 Two shared files were touched, both additively

- `tests/fixtures/feed-drive/project.ts` — `ROW_HELPERS` gained the word `export`. Nothing else.
  A second copy of that helper is the drift this phase's own thesis is about.
- `tests/helpers/sse.ts` — `openStream(base, headers = {})`. The hub authorises a subscription with
  the connection's own principal, so a backend whose collections are `authenticated` refuses an
  anonymous stream; every caller before this one ran without a `security.json` and is unchanged.

Both are covered by the 83-test sibling run above.

## 7. What the drive found

### 7.1 🔴 BRG-D10 — two REST surfaces disagree about a Boolean, on ONE engine

The same row, the same column, the same running backend, no PostgreSQL anywhere near it:

| read through | SQLite | PostgreSQL |
|---|---|---|
| `GET /api/Mark` | **`1`** | `true` |
| `GET /classes/Mark` | **`true`** | `true` |
| a cloud function's `Query Records` | `true` | `true` |

**BRG-D8 is one cell of this.** It was filed as a difference between two *engines*, measured over
`/api` alone; the drive read the same column three ways on both engines and the real shape is a
difference between two *routes*, which PostgreSQL happens to resolve.

🔴 **It changes the ruling BRG-D8 is waiting on.** The argument for keeping SQLite's `0`/`1` is
"every existing app reads that", and as stated it is **false**: an app on `/classes`, and every
NodeGX graph reading its own data, already gets `true` today. Only `/api` on SQLite reads `1`.

⚠️ And it is not only app collections — `migrate`'s own verify report names
`_User.emailVerified`, `_Files.private` and `_ApiKey.revoked` in the same breath.

🔴 The first version of this case asserted the divergence was in the *reader family* (REST vs
graph). **The measurement disproved it**, which is why the case was armed on both sides rather than
written from the intent. See [[a-reading-that-fits-is-not-one-that-excludes]].

### 7.2 Terrain the drive routed around, rather than findings

- **A bound API key over `POST /functions/:name` is not "signed in" to a graph.** The cloud
  `Request` node decides from `x-parse-session-token` alone (`nodes/cloud/request.ts:220`); only
  `/mcp` mints an ephemeral session for a bound key (`McpRoutes.sessionForGraph`). Known and
  documented — FED-005 §3.3, phase 96 register R11 — and **identical on both engines**. The key
  probe reads `Follow` instead, which keeps §3's "second auth path with different enforcement" and
  makes the answer depend on the row ACL.
- **The name a file is stored under is not the name it was posted under** (`server/files.ts:165`).
  Fetching under the posted name is a 404 — and it would have read as "the file did not cross", on
  every engine equally.
- **`run.output.result`, two unwrappings.** CWF-002 named the run's answer `output`, not `result`,
  and that output is the function's HTTP body, which a `Response` node wraps in `result`. Reading
  either key alone gives `undefined`, `undefined ?? -1` is a number, and **the run stays green
  while the count goes quietly wrong**. The case now throws with the whole answer in it.
- **Execution history does not cross, by design.** It lives in `executions.sqlite`, a second file
  `migrate` never surveys. After the cutover it is still there, still readable, still SQLite. An
  operator must be told that rather than discover it — now in `SCALING.md`.

### 7.3 AC5 is graded twice, and the strict half owns the criterion

Three fields on a trigger are written by the service, not the person: `status`, `enabled` (which the
drive itself toggles six times through the supported admin route) and `updatedAt`. They share a file
with a declaration. So:

- **byte-for-byte, either side of `migrate` itself** — the strict claim, and the one AC5 is about;
- **the declaration only, either side of the whole exercise** — "nothing a person authored changed".

Asserting the runtime fields unchanged across the exercise would assert that the app did not run,
which is the opposite of what a drive is for.

## 8. Where each criterion stands

| AC | state | reading |
|---|---|---|
| AC1 the control | ✅ | 5 cases; feeds polled, lists answered, denials taken, relation/file/realtime held, workflow ran past the `wait` |
| AC2 dry run | ✅ | clean; committed at `brg-006-drive-record/carry-report.txt` |
| AC3 migrate + verify | ✅ | exit 0, 43 records compared, source sha256 unchanged |
| AC4 behaviour reproduced | ✅ | `toEqual` over the recorded snapshot |
| AC5 zero changes | ✅ | both gradings (§7.3) |
| AC6 non-owner denied | ✅ | six codes, session and API key, plus the owner's 200 beside them |
| AC7 going back | ✅ | snapshot matched, file sha256 matched |
| AC8 the bounded claim | 🟡 | **published, and corrected at s12** — `docs/runtime/SCALING.md` §"SQLite and Postgres" in R2's words. **Richard has not yet read and ruled it honest**, which is what the AC asks for. 🔴 **The page had decayed between s10 publishing it and s12 re-reading it**: its "One thing that changes shape: booleans over `/api`" section described the exact divergence **s11 removed** the day after it was written. Replaced by the divergences that are still real, read out of `POSTGRES_DIVERGENCES` rather than remembered (search ranking, sequential-scan search, the `$within` north/east boundary). s12 also added §"Backups on Postgres" for R8 |

### 8.1 ⚠️ AC8 touched a peer's uncommitted file — twice now

🔴 **s12 edited it again** (the stale boolean section, plus the new backups section). Same file,
same owner, same care: sections replaced whole, everything else byte-identical, diff read before
applying. The original note follows.

`docs/runtime/SCALING.md` is **untracked** and was written by a phase 98 session (mtime 2026-09-19
14:00). Its Postgres section stated *"Today: there is no supported SQLite → Postgres migration"* and
warned that the schema-export route drops relations, indexes and RLS — **all of which shipped in s5
and s9 and are now false on a page a user reads before deciding whether to start.**

The edit is **surgical**: one section replaced, one bullet in "Honest limits" corrected, everything
else byte-identical. It is called out here so the file's owner sees it rather than finds it.

---

## 9. R7, and where the repair goes — ✅ **BUILT s11, see [BRG-007](BRG-007-THE-BOOLEAN-COMES-INTO-LINE.md)**

🟢 **Done.** The repair is option 2 below, the shape BRG-D8's own filing pointed at: both adapters'
`_rowToRecord` now read BOTH schema shapes through `schemaCommon.declaredProperties`, so the SQLite
adapter returns `true` at source and `/api` comes into line without either route family being
touched. **BRG-D8 and BRG-D10 are closed.** The gate is one case per wire prefix, 7/7, and this
file's own three-way case went red exactly as s10 said it would — it now asserts agreement, and
`normalise()` has lost its `booleanReads` fold.

🔴 **Everything below is kept as the located mechanism, because locating it was most of the work.**

🔴 **Richard ruled: `/api` is brought into line — `true`/`false` everywhere.** The reasoning is in
README §4 R7. What matters for whoever builds it is that **s10 located the mechanism**, so the next
session does not re-derive it:

| surface | route | facade half it reads through | Boolean on SQLite |
|---|---|---|---|
| Parse-wire | `GET /classes/:c` | `wireQuery` / `wireFetch` / `wireSearch` | `true` |
| BYOB | `GET /api/:table` | `rawQuery` / `rawFetch` | **`1`** |

`byob-admin.ts` calls `raw*` for every read (`:163`, `:169`); `parse-wire.ts` calls `wire*`
(`:207`, `:214`, `:420`, `:427`). That split is deliberate — `raw*` is storage-shaped — so **the
repair is not "make `rawQuery` convert"**: `raw*` has internal callers (`security/state`,
`RoleStore`, sessions, `McpRoutes.sessionForGraph`) that must keep seeing storage values, and
changing it underneath them is a much larger blast radius than the defect.

Two candidate shapes, and the second is the one BRG-D8's own filing points at:

1. Convert at the BYOB read handlers, sharing one `applyDeclaredTypes(record, schema)` with `wire*`
   so there is not a second copy ([[a-second-copy-of-a-palette-drifts-silently]]).
2. 🔴 **Fix it where BRG-D8 says it actually is**: both adapters already try to apply the declared
   type in `_rowToRecord` via `schema.properties[key].type`, and `SchemaManager.getTableSchema()`
   returns a `TableSchema` with **no `properties` member**, so the declared type is never seen. Make
   it visible and the SQLite adapter returns `true` at source — which fixes `/api` without touching
   either route family.

⚠️ **The gate this needs is one boolean case PER WIRE PREFIX, not one case.** A single round-trip
case added to BRG-003 would have been added on whichever prefix the author reached for, and would
have passed while the other stayed wrong — which is exactly the hole BRG-D8 got through
([[a-gate-can-have-a-hole-shaped-like-the-defect]]). The drive's own three-way assertion stays as
the end-to-end arm and **will go red when the repair lands**, naming itself as the thing to update.
