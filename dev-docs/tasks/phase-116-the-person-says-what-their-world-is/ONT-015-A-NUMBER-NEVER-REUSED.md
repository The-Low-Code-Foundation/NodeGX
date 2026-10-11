# ONT-015 — A number never reused

**Opened 2026-10-10**, from ONT-013 §3.2: the second atom Richard's invoice sentence needs — a number the backend hands
out at create, in a format the person gave, going up by one, never skipping if they said so, and never used twice.
**Depends on** ONT-014 (the number is frozen after create), ONT-011 step 2 (the *read aloud* fact on a noun is the
question that leads here), ONT-007 (a series put on a collection with records is a migration). **Feeds** ONT-013
(the invoice sentence projects in full). **Status: 🟡 s23 — both s22 defects fixed (§6.4, `562e10453`); every AC built (s22, §6.3: the projection, the held claim and its mutant, AC2's 409, AC3's migration on both engines); open: the capability cell (lands with its consumer, ONT-008 — §6.3); closes when Richard reads it. s21 — unblocked (§6.1: the census found 3 rows over 2 sources); the store and the doors built (§6.2: AC1, AC4, AC2's create half; both engines) — opened on Richard's sentence (`from: oral`) with a thin
warrant: ONT-011 §3.3 found one read-aloud row and no invoice-style numbering in the 8 sources. R-g ruled 2026-10-10 (§5): ask, never assume. **s19 (ONT-011 step 2):** the noun's questions exist — `readAloud`, then `looksLike`, `maySkip` (R-g's words), `restarts` — and project to a `number` field, unique and set once (held) with the series said in words; this task's build flips the `series` hold from said to held.**

> **Model check (Richard, 2026-10-08 rule):** the build wants **Opus 5.5**: a counter table and an allocation inside
> the create, on two engines, with a conformance area. The one Fable question is R-g below, and it is asked, not built.

## 1. The person sentences

> **"Invoice numbers look like INV-2026-0042. The number goes up by one every time, never skips, and is never used
> twice. It starts again at 0001 each January."**
>
> **"A ticket gets a number people can read out on the phone. Gaps don't matter."**

The two differ in one word. *Never skips* means the number is handed out inside the same transaction as the record, so
a save that fails gives its number back; it also means two people creating at once wait for each other. *Gaps don't
matter* is a plain sequence. The question is the person's to answer, and the agent must ask it, because the first
form is a legal requirement for invoices in several countries and a needless lock on everything else.

## 2. Why

No atom today hands out a value. `defaultValue` is a constant; `unique` refuses a repeat but does not choose; an
app that needs a number counts rows in a workflow, which is the three classic mistakes at once (a reused number after
a delete, a duplicate under two concurrent creates, a gap that nobody can explain to an auditor). Frappe's naming
series, Odoo's sequences and Stripe's invoice numbering are the same feature; it is on every ERP's first page.

## 3. What to build

### 3.1 The declaration

On the schema surface, as a field option beside `unique` and `defaultValue` (`storage.ts:194-195`, `:266`):

```json
{ "name": "number", "type": "string", "series": { "format": "INV-{YYYY}-{####}", "restart": "year", "gapFree": true } }
```

- `format`: literal text with `{YYYY}`, `{YY}`, `{MM}` and one run of `{#…#}` for the counter, zero-padded to its
  width; wider than the width is allowed (the padding is a minimum).
- `restart`: `never` | `year` | `month`. The counter is keyed by the series name and the period.
- `gapFree`: when true, the number is taken inside the record's own insert, so a refused or failed create returns it;
  concurrent creates on the collection serialise. When false, the counter moves first and a failed create leaves a
  gap. Default **false** — the agent sets it only on the person's word (R-g).
- The field is text (the format is text), `unique` by implication, and **frozen after create** by ONT-014's
  `frozen` — the projection writes both.

### 3.2 The store

- A system table `_Series` (`name`, `period`, `next`), not readable by any non-admin door (as `_User` is not).
- **Allocation inside the create**, on both engines: SQLite's single writer makes it one statement in the insert's
  transaction; PostgreSQL takes the counter row `FOR UPDATE` in the same transaction. A delete never moves the
  counter (never reused). The counter never moves backward on any path, including a migration's backup restore —
  restoring a backup restores `_Series` with it.
- **The capability cell**: `series` in the capability table, `supported` on nodegx (SQLite, PostgreSQL) only when the
  conformance area proves it; `unsupported` with the sentence on every other adapter, as `path` is.
- **The number in the response**: the created record carries it; the client never sends one, and a body that does is
  refused (a 400 naming the field), so a screen cannot invent a number.

### 3.3 The projection and the migration

- `RuleHold` gains `{ series: f; format; restart; gapFree }`; it projects to the field option. ONT-011's *read aloud*
  fact on a noun asks the format and R-g's question, and projects here.
- **Putting a series on a collection with records** is a migration step (ONT-007): the existing records are numbered
  in `createdAt` order, starting the counter after them; records that already hold a value in the field keep it and
  the counter starts above the highest. The dry run says how many will be numbered and from what.

## 4. Acceptance criteria

1. **Conformance area `series`**, on SQLite and PostgreSQL: a create gets `INV-2026-0001`, the next `0002`; a create
   refused by a check or a rule (gap-free) leaves the next create at the number it would have had; a delete and then a
   create does not reuse the number; two creates in flight at once get two different numbers (gap-free: in order;
   not gap-free: distinct); the period rolls and the counter restarts when `restart` says so and not otherwise; a
   width overflow keeps counting (`10000` after `9999`). **Mutants, each caught:** the counter read outside the
   transaction (two creates share a number); the delete decrementing; the restart ignored.
2. The created number is frozen: a PUT changing it is ONT-014's 409; a body on create that carries one is a 400 naming
   the field. The admin credential may set one (a migration's backfill needs to).
3. The migration step on a fixture with records numbers them in `createdAt` order, keeps the ones that had a value,
   starts the counter above the highest, and the dry run says the count. Graded on records on both engines.
4. `_Series` is not readable by any non-admin door (ONT-012 §4's table, read column).
5. ONT-005's pin moves with the new shape's claim and mutant; the invoice sentence in ONT-013 §1 projects in full and
   its three rules are shown held.

## 5. Rulings to ask (plain words)

| # | the question | recommended |
|---|---|---|
| R-g | **When a person says "a number that goes up", do we assume it must never skip?** Never-skip is right for invoices in France and elsewhere and is a lock on every create; a plain sequence is fine for tickets and is what most people mean. | **Ask, never assume: "if a save fails, may the number it would have had be skipped?"** The agent asks it as one of the noun's questions (ONT-011's *read aloud*); the default when unanswered is a plain sequence, and the brief says why. |

**Ruled 2026-10-10 (Richard, in chat, plain words; README §9):** R-g **ask, never assume** — the recommendation. `gapFree`
defaults to false and the question is the noun's. The thin warrant stood until s21: ONT-013 step 4's census found the
second and third rows (§6.1), so the build waits on nothing.

## 6. Built

### 6.1 The warrant, measured (s21, 2026-10-11, Opus 5.5)

ONT-013 step 4's code pass (`census.js` `detectAcross()`, ONT-013 §9.1) looks for a number an app hands out itself —
a sequence (`nextval`, `CREATE SEQUENCE`, an identity column), a counter formatted into text (`{n:04d}`, `zfill`,
`padStart(4, '0')`), the highest plus one — and the read-aloud borrow goes from **1 row to 3, over 2 sources**
(acme 1, sentinel 2; `KINDS.md` § *facts*). §8's condition ("a second census row") is met: **the warrant is no longer
thin and the build is unblocked** without a ruling. What the two new rows say about the design, in general words
(the private rows stay outside the repo):

- **Both are the mistake this task exists to prevent.** One hands out the highest number plus one from a screen,
  outside any transaction; the other counts a ledger of issued numbers without a lock. Neither survives two creates
  at once, and neither is the backend's job today, so neither is graded.
- **One had to renumber its records once**, by a script that refuses a result with a gap or a duplicate and leaves
  every record before an anchor as it was — §3.3's migration step, run by hand, and AC3's shape.
- **One numbers only some records of a collection** (a record of another sort gets no number) **and lets staff type a
  number by hand.** The first is not in §3.1: a series with a condition (ONT-011 step 2's `onlyWhen` shape) — recorded
  here, not built, until a second row asks. The second is AC2's admin exception.
- **One keys the series by a type** (one run of numbers per sort of record), which §3.1's series name already covers.
- todo-list's "next position" (the highest plus one) is a drag-sort order, not a number that names the record:
  classified neighbour, not counted.

### 6.2 The store and the doors (s21, 2026-10-11, Opus 5.5) — AC1, AC2's create half, AC4

- **The option** is `series: { format, restart?, gapFree? }` on a column, beside `required` and `defaultValue`
  (`SchemaColumn` in the runtime's `schemaCommon.ts`, `StorageColumn`/`StorageSeries` in the contract). It is stored
  with the table's declaration on both engines as written. `adapters/series.ts` holds the rest: the validator (a text
  column, exactly one `{#…#}`, only `{YYYY}` `{YY}` `{MM}`, a yearly restart must say the year and a monthly one the
  year and month, or two numbers would read the same), the period and format (UTC, the backend's clock;
  `setSeriesClock` for tests), and the one statement both engines take a number with —
  `INSERT INTO "_Series" … ON CONFLICT DO UPDATE SET "next" = "next" + 1 RETURNING "next" - 1`, so no two creates can
  read the same `next`. Both schema managers refuse a bad series at `createTable`/`addColumn`, and
  `POST /admin/schema` answers 400 in words.
- **Inside the create** (`LocalSQLAdapter.create`, `PostgresAdapter.create`): a series field the record does not carry
  is handed out. When gap-free, the take and the insert are one transaction (`db.transaction` on SQLite; the pool's
  `transaction` on PostgreSQL, where the counter row's lock makes concurrent creates wait their turn). Otherwise the
  counter moves first. `_Series` is made on first use. A value the record carries is kept. That is the store's half
  of the admin's backfill, and it does not move the counter.
- **The doors** (`server/series-door.ts`): `/classes` create and upsert, `/api/:table`, the batch and the MCP create
  refuse a body that brings a series field with a **400** naming it (`reason: 'series'`, Parse code 142) before
  anything is stamped, unless the caller is the admin. The create's answer carries the number (Parse's 201 is
  `objectId` + `createdAt` only, so a screen had no other way to know it), and so does the MCP create's.
- **AC1 — conformance area `series`** (`conformance/cases/series.ts`, 10 cases, green on SQLite and PostgreSQL): in
  order with the padding, never after a delete, eight creates at once distinct (and gap-free, in a row), gap-free
  gives a refused create's number back, not gap-free leaves the gap, `T-9` → `T-10`, one run per collection, a carried
  number kept, four unkeepable series refused. **Mutant `series-counted-not-taken`** (`mutants.ts`; the census rows'
  own mistake: the count plus one, before and outside the insert) is caught on both engines by its own set of cases.
  The year/month roll needs the clock, so it is graded in `ont-015-series.test.ts` (24/24, both engines, over HTTP),
  with two more mutants, each shown: **the restart ignored** (`seriesPeriod` → `''`: January carries on from
  December) and **a gap-free number taken outside the insert** (the refused create leaves a gap). AC1's "the delete
  decrementing" is graded by the counted mutant, whose deleted record's number comes back; no code path decrements.
- **AC2** — the create half: a person's body with a number is a 400 at every door (and a third mutant, the door's
  refusal taken out, stores the invented number); the admin's is kept. **Owed:** "a PUT changing it is ONT-014's 409"
  arrives with the projection (§3.3: the projection writes `frozen` on the field), not here.
- **AC4** — `_Series` is a `_` table with no `_Schema` row: no non-admin door reaches it (`isSystemCollection`;
  measured: a person's `GET /classes/_Series` is refused and says nothing of the counters).
- **Found on the way:** `brg-005-conformance-postgres` held one adapter per case open until `afterAll`, each pool
  idle until its own timeout. The eight-at-once cases filled the pools and the run reached PostgreSQL's 100
  connections. The last three tests could not connect. Each run's adapters are now closed when the run ends (peak
  14 connections, 21/21).
- **Not built in s21 (built s22, §6.3, but the capability cell):** §3.3's projection (`RuleHold` `series` → the field option, `looksLike` → `format`, `maySkip`
  → `gapFree`, `restarts` → `restart`, and `frozen`); the claim `<noun>/number-never-used-again` flipped to held with
  a mutant `dropSeries`, which moves ONT-005's pin (AC5); the migration step (AC3); the capability cell (a new
  `CapabilityKey` every one of the six descriptors must declare, `unsupported` in words except nodegx). **Backups:** a
  SQLite backup is the whole file, so `_Series` goes with every restore (from the backup code; no restore spec
  graded yet). PostgreSQL takes no backup here (`BackupNotFileBackedError`), so §3.2's restore sentence does not arise on it.

### 6.3 The projection, the claim and the migration (s22, 2026-10-11, Opus 5.5) — AC2, AC3, AC5

- **The projection** (`world/noun.ts` `numberSeries`, `project.ts`): a read-aloud noun whose look is said gets the
  store's series on its `number` field — `looksLike` is the format, `maySkip: false` makes it `gapFree: true` (unanswered
  or yes: a plain sequence, R-g), `restarts` `each year`/`each month` → `restart: year`/`month`. The unique index and
  the freeze (ONT-014's `frozen`, from the set-once rule) stay. The `series` hold is **held** then, and nothing is said
  in words. With no look said there is nothing to hand out: the field stays plain text, the rule is said with that
  reason, and s19's not-held claim still measures the reuse.
- **A look the store cannot hand out is refused by the world's validator**, in words (`numberLookProblem`: one run of
  `#`, only {YYYY} {YY} {MM}, a yearly restart shows the year, a monthly one the year and the month). The store's own
  check is `seriesProblem` in the runtime; `ont-015-projection.test.ts` grades both on one list of eleven looks, so
  the two cannot drift.
- **The claim** `<noun>/number-never-used-again` is held: two records made without a number, a new claim step
  `numbered` (each row holds a value and no two the same; a row removed since is read as an earlier `numbered` saw it),
  the second deleted, a third made, `numbered` again over all three. Its mutant `dropSeries` (the column without its
  series) fails at the first `numbered`. Both contracts' `ClaimStep`, `runClaim`, `saysTheRule`, the reach and
  `mutants.ts`'s `need` carry the step; `differsInWhatIsHeld` reads `series`. every-kind's `session` noun (`S-{####}`,
  gaps allowed) is the fixture; its golden moved by exactly that.
- **AC5**: the invoice sentence (§1) projects to `{ format: "INV-{YYYY}-{####}", restart: "year", gapFree: true }`, and
  its three rules are held: unique (the index), never changed (frozen), handed out and never used again (the series)
  (`project-contract/tests/series.test.ts`, 20 cases; two mutants shown red). ONT-005's pin: **it does not move, measured** — every-kind stays 14 of 51 on both engines (0 unanswered, 6 unkept, 8 unclaimed). AC5 expected it to: the only read-aloud mistake ONT-005 makes (`session/number-reused`, `readAloud` unanswered) was already killed before s22, for want of a home (no `number` field for the claims to name). What s22 adds is the held claim's own mutant (`dropSeries`), graded with every claim in `ont-003-claims` — a claim mutant, not one of ONT-005's 51. The pin's line is unchanged and its docblock says why.
- **AC3, the migration.** A series put on a field records already fill is a schema step of its own,
  `setSeries { table, columns: { <field>: series | null } }`, beside `setWhenTargetGoes`: on the contract's schema
  surface, both schema managers, the executor (`applySchema`, the plan check) and `POST /admin/schema` (400 in words,
  501 on an adapter without it). The store does the numbering, in one transaction with the declaration and the counter
  (`planNumbering` in `adapters/series.ts`): the records without a value, in `createdAt` order (then `objectId`), each in
  its own period (an invoice made in 2025 gets a 2025 number); the ones holding a value keep it, and `seriesParse`
  reads each held number back in the format so each counter starts above the highest; a value in another look is kept
  and counts for nothing; a counter never moves backward (a series put on again after every record was deleted goes on
  from where it was). The planner writes `addColumn` without the series and then `setSeries` for a new number field,
  only `setSeries` when the look is said later, and `setSeries: null` when it is unsaid again. **The dry run counts the
  records it will number** (`dryRun.moves`, in the step's words). `planTouchesWhatTheSchemaRouteRefuses` refuses an
  unkeepable series in a plan before the backup. Conformance: three cases more in area `series` (13), and
  `setSeries` in the coverage ledger.
- **Graded** in `nodegx-backend/tests/ont-015-projection.test.ts` over `POST /admin/world/migrate`, on SQLite and
  PostgreSQL (13/13): three invoices numbered 0001–0003 in the order made, the dry run saying 3, the next person's
  create 0004; with `INV-<year>-0007` and `OLD-99` held, the other two become 0008 and 0009 and the next 0010; **AC2** a
  person's PUT of a new number 409, of the amount 200. Two mutants of `planNumbering`, each shown: the held numbers
  ignored (0001/0002 handed out under 0007), and the counter left where it was (the next create is handed 0001 again
  and refused by the unique rule).
- **The capability cell is not built, on purpose.** `CapabilityKey`'s own rule is "one key per thing a node can
  attempt, and no key for anything no node consumes", and `path` (§3.2's model) is an operator cell, which a series is
  not. No node or panel reads a series cell yet: its consumer is the manager's field editor (ONT-008), so the cell
  lands with it (`supported` on nodegx, `unsupported` in words on the other five). No AC names the cell.
- **Found (filed, not fixed; neither blocks an AC):** `P116-S22-SERIESCARRY` — a number the admin types in the
  series' own look does not move the counter, so the store later hands that number out and the person's create is a
  409 (the fix is `planNumbering`'s rule, applied in the create); `P116-S22-SERIESMSG` — that 409 says
  `undefined is already used`, since its words read the request body, which never carries the number. **Both
  fixed in s23 (§6.4).**

### 6.4 A number brought, and a number named (s23, 2026-10-11, Opus 5.5) — `562e10453`

- **SERIESCARRY.** `seriesRaises` (series.ts) is `planNumbering`'s rule for one record: a carried value `seriesParse`
  reads in the look names its period and the number above it; `SERIES_RAISE_SQL` moves that counter there and never
  back (`CASE WHEN excluded."next" > "next"`, the one statement on both engines — no `GREATEST`/`MAX` split). On
  create it runs **inside the insert's transaction**, so a refused create raises nothing; on save, after the row
  changed. The save was the same hole through the other door: the doors refuse a series field only on create
  (a person's edit is ONT-014's freeze, so only the admin reaches it). `OLD-7` still counts for nothing.
- **SERIESMSG.** The create appends the values it filled for the colliding fields to the refusal
  (`QueryBuilder.uniqueConstraintWithValues`: `UNIQUE constraint failed: Invoice.number; values {"number":"T-0003"}`);
  `uniqueConstraintProblem` reads them back and `uniqueViolationToHttp` takes them over the body's. With SERIESCARRY
  fixed it is reachable only when a counter is moved by hand, so the mutant arms grade it.
- **Graded:** conformance `series` 13 → 15 cases (a number brought moves the counter past it, never back, and a
  refused one moves nothing; a number edited does the same); `ont-015-series` +2 (the bug's own evidence over HTTP,
  and its mutant — the third person is handed T-0003 and the 409 must name it); `ont-015-projection`'s counter-left
  mutant now asserts `"INV-<year>-0001" is already used` and `value`; 4 runtime unit tests (the message round trip,
  `seriesRaises`, the PG translation twice). **Mutants shown red:** never raise → exactly the two new conformance
  cases, on both engines; the 409 composer reading the body only → 4 arms (2 × 2 engines). Files restored, `cmp`.
- **Measured:** runtime `test/adapters` 17 suites 335/335; backend contract 9 suites 232/232; backend band 41 suites
  **670/670** both engines (none skipped); runtime and backend-contract `tsc` clean; backend tests `tsc` one error,
  P107's `noodl-mcp/src/specPorts.ts` (re-measured; not this change).
- **Traps:** PostgreSQL's error is translated in `_run`, *after* the create's catch — and translating a translated
  error said `?.?` (it keeps `code`, loses `detail`); `translatePgError` is idempotent now. node:sqlite's error under
  jest comes from another realm, so `instanceof Error` is false; the catch reads `message` by shape. And a
  `python` `assert` that fails on the first of two edits writes neither — read which line failed before trusting the
  other edit landed (a "red under the mutant" for a case that was red anyway proves nothing).

## 7. Not this task

- **Across records** ("at most twenty"). ONT-013 step 4 measures it; a count is not a series.
- **A number composed from another record** (`{customer.code}-{####}`). No row asks for it; the format is literal text
  plus dates plus the counter. Recorded here if a row appears.
- **Showing the number on a screen.** The field is text; every screen already shows text.
- **Other adapters.** The cell says `unsupported` in words; a fourth engine proves it when it proves `path`.

## 8. Watch for

- **The warrant is thin** (one row). This task opens on Richard's sentence; if the census of step 4 in ONT-013 and the
  private corpora show no second row, say so in §6 and let Richard rule whether to build it anyway. Do not pad the
  census to justify it.
- **`unique` is not enough.** A spec that proves "no two records share the number" has not proved the counter; the
  concurrent-create case is the one that grades the transaction.
- **A migration's backup restore** that forgets `_Series` reuses every number issued since the backup. The restore
  spec (ONT-007) must carry it.
- **The year rolls at midnight in whose timezone?** The backend's clock, stated in the brief; a person in another
  zone sees the roll an hour off, which is a fact to say, not to fix.
