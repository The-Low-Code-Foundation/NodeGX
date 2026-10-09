# ONT-007 — The diff is the migration

**Opened 2026-10-08.** **Depends on ONT-003.** **Status: 🟡 s7 (2026-10-09) — built on Opus 5.5; the reach review (Fable) not yet done. See §6.**

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

### 6.1 s7, 2026-10-09 — what exists

| Piece | Where | What it does |
|---|---|---|
| The diff | `@nodegx/project-contract/world` `diffWorld()` (`world/migrate.ts`) | Two worlds compared by id, sentence by sentence, in the person's words: nouns added, removed, reworded, signing in; properties; relations added, removed, reworded, re-attached, **re-kinded**, answered. A new kind's answers are not listed as changed answers. |
| The plan | `planMigration()` | Both worlds projected (ONT-003), then: the backup; the schema route's own bodies (`createTable`, `addColumn`, `setChecks`, `setIndexes`, `dropColumn`, `deleteTable`, never SQL); the data moves between them; the dry-run checks (`refuse`: more than one, none, rows; `loses`: values, rows); `notKept` (claims the migrated records will not keep, and why); `refused` (changes it cannot migrate, in words). Order: backup, make, add, **move**, rules, drop, delete. |
| The words | `migrationWords()` | What changed, what it reaches, each step numbered, what stops it, what it would lose. |
| The reach | `plan.reach`, `componentReach()`, `workflowReach()` | Collections and fields; every component node whose `collectionName` names one (the one parameter that names a table: Record family, Query, Collection), with the changed fields it wires (`prop-<field>`, filter rules); every workflow step that calls a cloud function among those components (`ref` is the function's name; `/#__cloud__/<name>` is the component). |
| The run | `@noodl/backend-contract/conformance` `dryRunMigration()`, `runMigration()` (`conformance/migration.ts`) | The plan as data, run through the schema surface and the data plane, the way `runClaim` runs a claim. Dry run first; a plan with a `refused` change or a dry run with a refusal moves nothing and takes no backup; losses run only with `acceptLosses`; no backup function → nothing moves; a step that fails stops the run and says which (`ran: 'partly'`). |

**The moves it knows** (anything else is refused in words, never guessed):

- `linkToRecord` — `belongs-to` → `is-on`, the bombshell: every person's account becomes their first membership.
- `recordToLink` — `is-on` → `belongs-to`, the mirror: refused when any person is on more than one, or (when the
  link is required) on none; the record's details (`since`, `until`, `role`) are counted as losses.
- `fieldAcross` — a property moved across an `extends` link, either way: the value goes with it, record by record.
  This is **`filter-field-split-off` killed** ("too late to move once users have profiles": the diff makes the move).
  The same property put on the other side while this side keeps it is **`sort-key-copied` killed**: refused, with what
  to do instead ("move it, or keep it on the profile and sort users through the link").

### 6.2 Decisions

- **Matching is by id.** A changed word or sentence changes no schema; a changed id is a noun removed and another
  added. On the bombshell fixture an account renamed by id to `subscription` gives: the new required link stops it
  (`refuse: rows`), the old link's values and every account's row are counted as losses. Nothing is carried by a
  guess. A rename that keeps the records needs a key the format does not have yet (`was`), and a `renameTable` the
  schema surface does not have (it has `renameColumn` only) — AC3, owed.
- **A field that changes in place is refused** (type, target, or whether it is required): the route has
  `changeColumnType` but nothing that makes a field required or optional, and a target change is a data question.
- **A required link added over records is added without `required`, and the plan says so** (`notKept`). The route's
  only way to add a required field over rows is `fillExisting`, one value for all of them — a placeholder link nobody
  said. The mirror fills the link record by record; the claim `person/account-is-required` is then MEASURED to fail
  on the migrated table (see §6.3).
- **The grade runs the new world's claims on the migrated tables themselves** (a context whose `collection()` is the
  identity), not on fresh ones: a migration that forgot a rule is caught by the claim that says it.
- **Every grade has a mutant plan beside it**: the bombshell without its move (the memberships come out empty), without
  its rule step (`membership/role-is-one-of-its-list` not kept), the `extends` move without its move (the dates are
  gone). A check that cannot fail would pass a migration that did nothing.
- **The executor lives beside `claims.ts`** in the backend contract's `conformance/`: a plan is data, it names no
  world, and it runs on any adapter. The HTTP route that runs it (the backup through BMG-011's `POST /admin/backups`,
  the steps through `POST /admin/schema`) is owed — §6.5.

### 6.3 Graded

Readings taken 2026-10-09 ~17:15 CEST on the working tree over HEAD `84018e920`, one job at a time (two peer
`nodegx-node-spec` suites waited out first):

- `packages/nodegx-project-contract` `npx jest`: **139 / 139** (117 before; `tests/migrate.test.ts` adds 22).
- `packages/nodegx-backend` `npx jest --runInBand tests/ont-007-migration`: **25 / 25, exit 0** — 13 on SQLite, 12 on
  PostgreSQL (`postgres:///nodegx_brg005`, a database per run, dropped after), nothing skipped. What it shows, per
  engine: the bombshell runs every step after the backup; 3 people, 2 accounts, 3 memberships after, each person on
  the account they had; `Person.account` gone; every claim of the new world kept **on the migrated tables**; the
  SQLite backup (the backend's own `snapshotDatabase`) still has all three accounts. The two mutant plans caught. The
  `extends` move: Ada's and Grace's dates on their users, Linus (no profile) none, `Profile.updated` gone; its mutant
  (no move) leaves every user without a date. The mirror refused on a person on two accounts (`rows: 1`, no backup
  taken, 3 memberships still there, no link added) and on a person on none (`rows: 1`); on data it fits, refused until
  its losses are accepted ("the role of each 'membership' record (2)"), then every person holds their one account and
  `Membership` is gone; `person/account-is-required` **fails at its rule step** on the migrated table, as `notKept`
  said — the measurement behind bug `P116-ONT-007-required`.
- **The finding the mutant made:** `runClaim` declares the schema's checks and indexes before its steps, so grading a
  migration with it repaired the rule the migration forgot — the plan without its `setChecks` step passed every claim,
  on both engines. `runClaim(ctx, schema, claim, { apply: false })` now runs on the tables as they stand; the grade
  uses it, and the same mutant fails at `membership/role-is-one-of-its-list`. (The bombshell's "keeps every claim" was
  green before the fix too — for a reason it did not name.)
- Not regressed: `nodegx-backend` `ont-005-mutants`, `ont-003-claims`, `ont-003-write`, `ont-004-world`,
  `ont-004-rule` **67 / 67** (these are the four s6 could not run, plus the write spec: s6's `askWords` and `login`
  changes broke nothing); `nodegx-backend-contract` **199 / 199**; `noodl-mcp` `ont002WorldTools` + `toolDisclosure`
  **25 / 25** (`[surface] 8261 tokens / 20 resident tools — 19 under`); `npm run ontology-census:check` fresh;
  `typecheck:backend-tests` red only on the four known ISL-010 lines (`P116-ONT-003-tsc`).

### 6.4 Acceptance

1. 🟡 **The bombshell.** Records: every one present, the new claims green on SQLite and PostgreSQL ✅. The reach
   table on the fixture names two collections (`Person` changed — `account`; `Membership` made), three component nodes
   (`/Pages/Members` "Every member", "Add a member" writing `account`; `/#__cloud__/enrol` "Make the member" writing
   `account`) and one workflow step ("When a company joins, enrol its first member" → "Enrol the member"). **A workflow,
   not a verb:** ONT-006's verbs do not exist yet, so "one verb" is met by what a verb projects to. When verbs land,
   this criterion is re-read against them.
2. ✅ **Refused with the rows counted, nothing moved** — the mirror on a person on two accounts, on both engines.
3. ❌ **The rename.** Owed (§6.5): matching is by id, and a changed id is measured as a removal and an addition whose
   losses stop the plan — nothing is renamed silently, but nothing is renamed at all.

### 6.5 Owed

- **The route.** `POST /admin/world/migrate` (or the MCP's `write_world` growing a `migrate` arm): dry run → words →
  the person's yes → `POST /admin/backups` → the steps through `mutateSchema`. Today the spec passes the backup
  function (on SQLite the backend's own online snapshot, `snapshotDatabase`; on PostgreSQL a recorder).
- **AC3, the rename.** A `was` key on a noun (format v1, optional, like s6's two) and a table rename in the contract;
  the manager showing both names until the run is ONT-008's.
- **Verbs.** ONT-006's `verbs.json` does not exist; the reach reads the workflow definitions a verb would project to.
  When verbs land, `workflowReach` gains a sibling that reads them by name.
- **The permission rules** a changed collection is read by (`nodegx.security.json`, ONT-004's `{ path }` atoms) are
  not in the reach yet.
- **The reach review (Fable)** — the task's model line: "what survives is where the error hides".

### 6.6 Found, for other tasks

- **`a()` in `project.ts` and `article` in `mutants.ts` say "an user"** (any word starting with a vowel letter).
  `migrate.ts`'s `article` reads a `u` followed by a consonant and a vowel as "you". The two older helpers are pinned
  by their specs' strings; not changed here.
- **No route makes a field required over existing records** except with one value for all of them — bug
  `P116-ONT-007-required` (§6.3 measures it).
