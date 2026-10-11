# ONT-016 — At most so many

**Opened 2026-10-11 (s21)**, from ONT-013 step 4: the census of across-record rules found **2 rows over 2 sources** for
a count (ONT-013 §9.1, `KINDS.md` § *Rules across records*), so the atom earns a task (ONT-013 §3.2). Sum and overlap
found none and stay unopened. **Depends on** ONT-013 (the rule as a sentence), ONT-015 (the same lock: a count held
inside the create is a counter read under the create's transaction). **Status: 📋 — opened, not scoped; no rulings
asked.**

> **Model check (Richard, 2026-10-08 rule):** scoping (§3) wants **Fable 5.1** — what is counted, per what, and what a
> limit on the parent record means when it changes. The build wants **Opus 5.5**: a count inside the create on two
> engines, with mutants.

## 1. The person sentences

> **"A cohort holds at most twenty learners."** (ONT-013 §1, oral)
>
> **"A person keeps at most two hundred things."** (nightbook: refused in its keep function, counted before the create)
>
> **"An account has at most as many users as its plan says."** (a private source: a limit field on the parent record,
> whose own note says it is not enforced)

## 2. Why

Both rows are unkept today, in the two ways ONT-013 §2.2 warns of. One counts in a workflow before the create, so two
creates at the limit both pass. The other states the limit as a field a person can see and edit, and nothing keeps it.
Both are **per parent**: at most N records whose link points at one record (a person, an account, a cohort), with N
either a constant or a field of that parent.

## 3. To scope (Fable)

- The shape: `RuleHold` `{ atMost: n | { field }, of: <collection>, per: <link field> }`, or a field option on the link.
- Held where: inside the create (and the update that moves a record to a new parent), under the same transaction
  ONT-015 takes; SQLite's single writer, PostgreSQL's parent row `FOR UPDATE`.
- **The limit lowered below today's count**: refused, or the existing records stand and only new ones are refused?
  (A ruling, asked in plain words.)
- The refusal: a 409 in the rule's words (R-f), at every door in ONT-012 §4.
- The migration: putting the rule on a parent that already has more is refused before the backup (ONT-007, s9).

## 4. Not this task

Sums against a total and overlapping ranges (zero rows); a count across the whole collection with no parent (no row).
