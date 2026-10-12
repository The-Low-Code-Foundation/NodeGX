# ONT-016 — At most so many

**Opened 2026-10-11 (s21)**, from ONT-013 step 4: the census of across-record rules found **2 rows over 2 sources** for
a count (ONT-013 §9.1, `KINDS.md` § *Rules across records*), so the atom earns a task (ONT-013 §3.2). Sum and overlap
found none and stay unopened. **Depends on** ONT-013 (the rule as a sentence), ONT-015 (the same lock: a count held
inside the create is a counter read under the create's transaction). **Status: 📋 — scoped s25 (§3, Fable); the world half built with
ONT-013 step 2; one ruling to ask (R-k, §3.3). Build: Opus.**

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

## 3. Scoped (s25, 2026-10-11, Fable 5.1)

**Status: 📋 scoped; the world half is built (ONT-013 step 2); the backend half is the build. One ruling to ask (R-k).**

### 3.1 What is counted, per what

Both census rows and the oral sentence are **per parent**: at most N records whose link points at one record. The
rule is said **on the parent** (the cohort, the person, the account), and names what is counted and along which
relation. The world half is built: `RuleHold` `{ atMost: n | { field }, of: <noun or own-record relation>, per?:
<relation> }` (`kind.ts`), written in `rules.json`, validated (`of` is a noun or a relation with records of its own,
other than the parent; `per` is a relation from `of` to the parent, and may be left out only when exactly one joins
them; a `field` limit is a number detail of the parent), and projected as *not kept* naming this task (`WHY.atMost`).
The fixture `world-rules` carries "A cohort holds at most twenty learners" this way, and the ONT-013 backend spec
measures a twenty-first learner joining today.

### 3.2 Where it is held

- **On the child's collection**, as a declared check the contract's schema surface carries:
  `{ atMost: { limit: n | { field }, parent: <link field> } }` beside `oneOf` and `allOrNone` (`StorageCheckDecl`).
  The projection writes it on the collection of `of`, from the parent's rule, with the link field `per` projects to;
  the person's sentence rides it (`says`, R-f).
- **Inside the write**, on both engines, under one transaction: the create of a child, and the update that moves a
  child to another parent (its link field changes). SQLite: the single writer counts and inserts in the same
  transaction. PostgreSQL: `SELECT … FROM <parent> WHERE id = $1 FOR UPDATE`, then the count, then the insert — two
  creates at the limit serialise on the parent row, and the second is refused. A `field` limit reads the parent row
  the lock holds. The count is the child rows whose link holds the parent; soft-deleted or ended rows count (a
  rule that counts only the running ones is a `whileEmpty`, said separately).
- **The refusal** is a 409 `at-most` in the rule's `says`, at every door that creates or re-parents a child
  (ONT-012 §4's table: POST /classes, the upsert, the batch, BYOB POST, PUT and the batch's PUT when the link
  changes). The admin and functions are bound too: the count is the collection's, not a caller's.
- **The claim** (`atMost`, held): make N children on one parent, the N+1th refused, one on another parent taken;
  with a `field` limit, the parent's own value. Mutant `dropAtMost`: the check taken off, the N+1th taken.
- **The migration**: `setChecks` already carries declared checks, so the step is the existing one; the dry run
  reads the parents over the limit first (`refuse: 'over'`, naming the parent and its count), as a narrowed list
  is (s9). A rule taken off is a `setChecks` without it.
- **ONT-005**: `cohort-at-most-twenty/never-said` flips from a survivor (unkept) to killed by its claim; the pin
  in `ont-005-mutants.test.ts` moves with it (ONT-013 §3.3).

### 3.3 The ruling (asked in plain words, README §9)

**R-k — a limit lowered below what a parent already holds.** A cohort of 25 when the rule becomes "at most 20":
refuse the change until the cohort is 20, or keep the 25 and refuse only the 26th? **Recommended: refuse, naming the
cohorts over the limit** — the same answer s9 gave a narrowed list and a unique rule over shared values: a rule is
never put on records that already break it, so a person reading "at most twenty" never finds a cohort of 25 under
it. The other answer leaves a rule that is true of new records only, which is the §2 danger in a new coat.

### 3.4 Not this task (unchanged)

## 4. Not this task

Sums against a total and overlapping ranges (zero rows); a count across the whole collection with no parent (no row).
