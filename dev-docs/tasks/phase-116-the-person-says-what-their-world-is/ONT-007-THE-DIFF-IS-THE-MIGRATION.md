# ONT-007 — The diff is the migration

**Opened 2026-10-08.** **Depends on ONT-003.** **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 to build; Fable 5.1 to review the reach** — 'what survives' is where the error hides, and the suite grades only what someone thought to claim. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5 to build; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **Two days after launch I change one sentence about my world, and I am told what it reaches, what will happen to the
> records already there, and what the people using it will see, before anything moves.**

## 2. Why

Richard: *"when they drop the bombshell on Claude 2 days after the app is already in production."* The bombshell is a
new sentence that contradicts an old answer: "some members are on two companies' accounts" against "a member belongs
to one account". With the ontology in files, that is a diff; with the projection a function, the schema diff is
derived; with claims, the migration is graded on data. NSP-005's REACH is the word for what a change touches.

## 3. What to build

1. **The diff.** Two `docs/world/` trees compared at the sentence level: nouns added, removed, renamed; relations whose
   kind or answers changed; verbs touched. A rename is a diff, never a silent re-projection (README §12).
2. **The reach.** For each changed sentence: the collections and fields it projects to, the verbs that touch them, the
   components whose record nodes name those collections (the v2 files, through the format package), and the
   permission rules that read them. Reported as a table in the person's words with the counts.
3. **The migration.** The schema operations in order, through the schema API; the data moves between them as steps in
   the person's words ("every member's account becomes their first account"); a dry run that reports counts; the
   backend's backup taken first (BMG-011's route).
4. **The grade.** On a fixture with records: after the migration, every old claim that still holds passes, every new
   claim passes, and the record count is unchanged, on both adapters. The "one account → many accounts" bombshell is
   the first fixture; the mirror ("many → one", refused when the data has a member on two) is the second.

## 4. Acceptance criteria

1. The bombshell on a fixture with records produces a reach table naming at least one collection, one verb and one
   component, and the migration leaves every record present and the new claims green on SQLite and Postgres.
2. A migration the data cannot satisfy is refused with the rows that stop it counted, and nothing moves.
3. A noun rename changes no collection name until the migration runs, and the manager shows both names until then.

## 5. Watch for

- **An on-load migration owes its own save** (memory). The migration runs when asked, never on open.
- **The restore and the running permissions** (BMG-016): a migration that touches rules must be taken up by the
  running backend, as a restore is.
- **A post-drive control reads the leavings** (memory). Fixtures are copied per run.

## 6. Built

*(empty)*
