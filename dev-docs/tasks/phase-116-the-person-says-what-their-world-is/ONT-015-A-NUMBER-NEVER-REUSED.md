# ONT-015 — A number never reused

**Opened 2026-10-10**, from ONT-013 §3.2: the second atom Richard's invoice sentence needs — a number the backend hands
out at create, in a format the person gave, going up by one, never skipping if they said so, and never used twice.
**Depends on** ONT-014 (the number is frozen after create), ONT-011 step 2 (the *read aloud* fact on a noun is the
question that leads here), ONT-007 (a series put on a collection with records is a migration). **Feeds** ONT-013
(the invoice sentence projects in full). **Status: 📋 — opened on Richard's sentence (`from: oral`) with a thin
warrant: ONT-011 §3.3 found one read-aloud row and no invoice-style numbering in the 8 sources. R-g ruled 2026-10-10 (§5): ask, never assume.**

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
defaults to false and the question is the noun's. The thin warrant stands; the build waits on a second census row or
Richard's word to build it anyway (§8).

## 6. Built

*(empty)*

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
