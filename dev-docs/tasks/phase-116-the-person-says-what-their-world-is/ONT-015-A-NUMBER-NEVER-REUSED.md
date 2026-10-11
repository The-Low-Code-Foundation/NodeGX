# ONT-015 — A number never reused

**Opened 2026-10-10**, from ONT-013 §3.2: the second atom Richard's invoice sentence needs — a number the backend hands
out at create, in a format the person gave, going up by one, never skipping if they said so, and never used twice.
**Depends on** ONT-014 (the number is frozen after create), ONT-011 step 2 (the *read aloud* fact on a noun is the
question that leads here), ONT-007 (a series put on a collection with records is a migration). **Feeds** ONT-013
(the invoice sentence projects in full). **Status: 🟡 s21 — unblocked (§6.1: the census found 3 rows over 2 sources); the store and the doors built (§6.2: AC1, AC4, AC2's create half; both engines); the projection, the claim, the migration and the capability cell owed — opened on Richard's sentence (`from: oral`) with a thin
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
- **Not built (next):** §3.3's projection (`RuleHold` `series` → the field option, `looksLike` → `format`, `maySkip`
  → `gapFree`, `restarts` → `restart`, and `frozen`); the claim `<noun>/number-never-used-again` flipped to held with
  a mutant `dropSeries`, which moves ONT-005's pin (AC5); the migration step (AC3); the capability cell (a new
  `CapabilityKey` every one of the six descriptors must declare, `unsupported` in words except nodegx). **Backups:** a
  SQLite backup is the whole file, so `_Series` goes with every restore (from the backup code; no restore spec
  graded yet). PostgreSQL takes no backup here (`BackupNotFileBackedError`), so §3.2's restore sentence does not arise on it.

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
