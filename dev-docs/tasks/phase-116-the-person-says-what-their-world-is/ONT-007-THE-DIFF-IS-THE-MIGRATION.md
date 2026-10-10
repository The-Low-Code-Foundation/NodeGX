# ONT-007 — The diff is the migration

**Opened 2026-10-08.** **Depends on ONT-003.** **Status: ✅ s11 (2026-10-09) — AC1 ✅ s10 (the reach names a verb: `verbReach()`, §6.10), AC2 ✅, AC3 ✅ (s8); the reach review ✅ s9 (Fable: seven findings, four fixed, one pinned failing, two named); s11: the executor moved to the contract's `src/` (README §9 R9), the route `POST /admin/world/migrate` built (dry run, backup, steps, the permission rules moved and re-said), `describeTable` on the surface and both engines (s9's pinned failure green); three engine/executor defects found and fixed on the way (§6.11). What is left is ONT-008's (the view) and the small items in §6.11. See §6.**

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
3. ✅ **The rename (s8, §6.7).** A noun renamed says which id it `was`; nothing changes a collection's name until the
   migration runs, and then every record is kept under the new name on SQLite and PostgreSQL. Without `was`, the same
   change is still a removal and an addition whose losses stop the plan (the control). "The manager shows both names
   until then" is ONT-008's: `plan.reach` carries `{ how: 'renamed', was }` for it to read.

### 6.5 Owed

- ~~**The route.**~~ — built s11 (§6.11). `POST /admin/world/migrate` (or the MCP's `write_world` growing a `migrate` arm): dry run → words →
  the person's yes → `POST /admin/backups` → the steps through `mutateSchema`. Today the spec passes the backup
  function (on SQLite the backend's own online snapshot, `snapshotDatabase`; on PostgreSQL a recorder).
- ~~AC3, the rename~~ — built s8 (§6.7).
- **Verbs.** ONT-006's `verbs.json` does not exist; the reach reads the workflow definitions a verb would project to.
  When verbs land, `workflowReach` gains a sibling that reads them by name.
- ~~The permission rules in the reach~~ — `permissionReach()` s8 (§6.7). **Moving them is the route's**: the backend
  keeps rules under `security.json` `collections[<name>]`, and after a rename the rules under the old name protect
  nothing (the collection falls to `defaults`). `renameTable` deliberately does not touch them; the route must move
  `mustMove` rows in the same run, and have the running backend take them up (BMG-016), before it answers.
- ~~**Where the executor lives, for the route.**~~ — ruled s11 (README §9 R9: the contract's `src/`) and moved. `runMigration` was in `@noodl/backend-contract/conformance`; nothing in
  `nodegx-backend/src` imports from `conformance/` today and the esbuild config has no alias for it (measured s8:
  `grep -rn backend-contract/conformance src` → none). The route needs the executor moved to `src/` (or a build alias)
  first — a decision, not a detail. Then: the plan as the body (admin-only, same power as `POST /admin/schema`), dry
  run → words → yes → `POST /admin/backups` → steps → the security moves.
- **The reach review (Fable)** — the task's model line: "what survives is where the error hides".

### 6.7 s8, 2026-10-09 — the rename (AC3) and the permission reach (Opus 5.5)

| Piece | Where | What it does |
|---|---|---|
| `was` | `Noun.was` (`world/files.ts`, `schemas/world.schema.json`, `validate.ts`) | The id this noun had before the person renamed it. Optional, format v1, like s6's two keys. Refused: not an id; its own id; an id another noun still has ("a renamed noun is one noun, not two"); two nouns that were the same one. A `was` the world before does not have is history and renames nothing (so it can stay in the file after the run). |
| The diff | `diffWorld`, `nounRenames()` | `noun-renamed` ("accounts are subscriptions now: every one is kept, under its new name"); relations compared as they read under the new ids, so a rename is not a re-attachment. |
| The plan | `planMigration` → `renameSteps` | The world before is re-said under the new ids (`renameNouns`) and both projected; collections paired by what made them (the noun, renamed; the relation), columns by position — **refused unless every pair has the same kind and relation** ("the rename changes more than names"). Steps, right after the backup: rules off → `renameTable` → `renameColumn` (fields named after the noun: `Person.account` → `subscription`, `Membership.person` → `member`) → rules back; then the rest of the plan from the renamed world. A rule comes off **only when the rename reaches it** — the table it is built under, or a field it reads (a list on `role` stays put when only `person` is renamed). |
| `renameTable` | `IStorageSchema.renameTable?` (optional, the 17th name); `SchemaManager`, `PgSchemaManager`; `refuseTableRename` + `TableInUseError` in `schemaCommon.ts` | Carries the table and rows, the two built-in indexes (renamed), the junction tables its OWN `Relation` columns name (read from its declaration — never a `LIKE` over names, see bug -junctions), the `_Schema` row, and every other collection's `targetClass` pointing at it. Refused in the same words on both engines: a name taken, unknown, `_`-prefixed, not a name; and `TABLE_IN_USE` while a declared index, check or search index is built under the old name. SQLite: one transaction. PostgreSQL: the model at once, one queued transaction, the model put back on failure. |
| The route action | `POST /admin/schema` `{ action: 'renameTable', table, newName }` | 501 without the member; 409 on `TABLE_IN_USE`; 400 in words otherwise; awaits the queue; audited (`renamedTable`); answers `renamedTo`. **Does not move permission rules** (above). |
| The executor | `runMigration` `applySchema` | Two more bodies: `renameTable`, `renameColumn`. |
| The permission reach | `permissionReach(plan, security)` | Rules kept under a reached collection's name (`its rules`; under the OLD name for a renamed one, with `mustMove: { from, to }`), and every `{ path }` rule whose hops land on a reached collection or follow / match by a changed field of it (`a path through it`, the fields). `componentReach` now also matches a renamed collection by its old name — what every node written before still says. |

**Graded** (2026-10-09 ~17:30 CEST, working tree over HEAD `7ee55891e`, single specs in band beside a peer's short runs):

- `nodegx-project-contract` `npx jest`: **151 / 151** (139 → 151; `migrate.test.ts` 22 → 34: AC3 ×9, permissions ×3;
  `world.test.ts`'s pinned stray-key list now names `was`).
- `nodegx-backend` `npx jest --runInBand tests/ont-007-migration`: **45 / 45** on SQLite and PostgreSQL (25 → 45). Per
  engine: the rename runs with nothing to refuse or lose; both accounts are subscriptions **with the same ids** and
  tiers; every person on the one they were on; **on the wire** (`AdapterFacade.wireQuery … include: ['subscription']`)
  a person's subscription is `{ __type: 'Object', className: 'Subscription', name, tier }` — the adapter alone hands
  a bare id back, so the first version of this assertion (`if (typeof link === 'object')`) asserted nothing and was
  replaced; every claim of the new world kept on the migrated tables; **a backend opened again on the same database**
  sees `Subscription`, the retargeted link, the check built and declared, and every holder (the DDL ran, not only the
  model). Mutants: no field rename → every holder empty; no list put back → `subscription/tier-is-one-of-its-list is
  not kept`; no list taken off → `ran: 'partly'` at step 1 with "the rule chk_Account_… is built under its name",
  `Account` and its 2 rows still there. `renameTable` itself: a `Relation`'s links and another collection's link carried
  across, and again after reopening; the four refusals in words.
- `nodegx-backend` `ont-005-mutants ont-003-claims ont-003-write ont-004-world ont-004-rule service-http fed-002-indexes`
  with `ont-007-migration`: **166 / 166, exit 0**; `service-http` then 29 / 29 with the route test (409 under a rule,
  400 on a taken name, the rows read back under the new name, 404 under the old).
- `nodegx-backend-contract` **199 / 199** (the coverage register's `keyof IStorageSchema` entry for `renameTable`).
- After the peer's full suite ended (~17:40): `ont-007-migration` again **45 / 45, exit 0**; `noodl-mcp`
  `ont002WorldTools toolDisclosure` **25 / 25** (surface 8,261, 19 under); `noodl-runtime` `test/adapters/SchemaManager*`
  **83 / 83** (7 files); `npm run ontology-census:check` fresh.

### 6.8 Found in s8

- **Bug `P116-ONT-007-junctions` (blocker).** `deleteTable` finds junctions by name — SQLite `LIKE '_Join_%_<t>'`
  (`_` matches any character), PostgreSQL `endsWith('_' + t)`. Measured with a before-reading as the control:
  deleting `Account` emptied `MyAccount`'s and `My_Account`'s relations on SQLite and `My_Account`'s on PostgreSQL.
- **Bug `P116-ONT-007-renamecolumn` (medium).** `renameColumn` under a check leaves the declaration on the old field,
  the status saying it is built, and the same declaration refused when pushed again — both engines. The planner
  already takes such a rule off first; the route does not refuse.
- **A conditional assertion asserts nothing.** `if (typeof link === 'object') expect(…)` passed on both engines because
  the link was a string — the reader that uses `targetClass` is the wire facade, not the adapter.
- A rename and the bombshell in one change renames `Person.account` and then drops it: correct, one step more than
  needed.

### 6.6 Found, for other tasks

- **`a()` in `project.ts` and `article` in `mutants.ts` say "an user"** (any word starting with a vowel letter).
  `migrate.ts`'s `article` reads a `u` followed by a consonant and a vowel as "you". The two older helpers are pinned
  by their specs' strings; not changed here.
- **No route makes a field required over existing records** except with one value for all of them — bug
  `P116-ONT-007-required` (§6.3 measures it).

### 6.9 s9, 2026-10-09 — the reach review (Fable 5.1)

"What survives is where the error hides." §6.1–6.2 and §6.7 read against the planner, the executor and the three
reaches, then measured on both engines. Each finding with what was done:

| # | What survived | Measured | Done |
|---|---|---|---|
| 1 | **A rule put on records that already break it.** A list narrowed (or put on a text the rows hold) and a unique rule said over rows that share a value: the planner emitted the `setChecks` / `setIndexes` step and no check; the dry run said nothing stops it; the route refuses such a rule (HLT-016 C3, FED-002 AC4) *at the step* — after the backup and every step before it. AC2 ("refused with the rows that stop it counted, and nothing moves") did not cover it: its one fixture was a move. | SQLite: `ran: 'partly'` at the rule step, the backup taken. PostgreSQL: **`ran: true`** — finding 2. | Two checks: `refuse: 'outside-list'` (collection, field, values) and `refuse: 'duplicates'` (collection, fields), emitted only for a rule that is new on a field the rows already hold — a rule on a new field, a list that only grows, a rule put back by a rename: none (the controls). The dry run counts the rows outside the list and the rows that share a value (rows with any of the fields empty are distinct to a unique index on both engines and are not counted). Graded: refused at the dry run with the rows counted (1; Ada's 2), no backup taken; the mutant plan (the check taken out) `partly` at step 1 after the backup — the measurement, kept. |
| 2 | **The executor reported a refused rule as ran on PostgreSQL.** `PgSchemaManager` queues its DDL and refuses at its barrier (its docblock: `reconcileIndexes` "cannot pre-count duplicates"; the route awaits `awaitSchemaQueue` for exactly this); `runMigration` called the surface and moved on. The s7/s8 grades were green because they read the tables back after the queue had drained, and the mutant plans were caught by the claims — never by the step. | The narrowed-list mutant: `ran: true, steps: 2` on PostgreSQL; the duplicates mutant the same. | `runMigration` awaits `schema.barrier()` after every schema step when the surface has one: a queued refusal is that step's failure (`ran: 'partly'`, the step and the engine's sentence). Both mutants `partly` at step 1 on both engines now. |
| 3 | **A Record node's `prop-<field>` ports are OUTPUTS.** `componentReach` read a wire's `toProperty` only — every page that *shows* a field through a Record node (`DbModel2`: "`prop-title → startValue`", the wires `/Pages/PageEditor` fills a form with, dbmodelnode2.ts:105) was reached by the collection's name alone, `fields: []`. | The fixture's members page grew "The member" (a Record whose `prop-account` feeds a Text): `fields: []` before, `['account']` after. Control: the same component with its `from` ends dropped reads `[]` again. | `ComponentGraph.connections` carries both ends; the read side is counted. |
| 4 | **A `{ path }` rule after a rename.** `permissionReach` said the rule reads 'a path through' the renamed collection and nothing about its hops still saying `Account` and `account` — names the plan takes away; after the run the rule compiles against nothing. | The rename plan against the account-holder rule: no rewrite on the row. | `ReachRow.renamed` (old field → new, kept through `mergeReach`); a path row carries `mustRewrite: { Account: 'Subscription', account: 'subscription' }` — every old name its hops use, and what to say instead. Control: the bombshell's path row has none. Re-saying the hops is the route's, beside moving the `mustMove` rows (§6.5). |
| 5 | **A changed answer that changes only the words.** `whenTargetGoes`, `setOnce`, `whatStays`, … project into the collection's *description* (ONT-003: the rules the store does not keep, in words). `createTable` writes a description once and no action changes it (byob-admin.ts: "a changed description is ONT-007's migration"). So the plan has no step, the reach no row, and the Schema card keeps the old sentence. The handoff's question is answered: yes, such a change passes without a step — and that is the defect, not the comfort. | Pinned as `it.failing` on both engines: after the bombshell, `getTableSchema('Person').description` is still the world before's. | Not fixed here: it needs a `describeTable` action on the surface (the `_Schema` row / the model, both engines) and the route, then a step. Owed with the route; the failing test goes green when it lands. |
| 6 | **Workflow steps that name fields.** `sort.by`, `deduplicate.by`, `filter.condition`, `validate.rules[].path` name fields of a *function's response*, which only the function's graph ties to a collection. `workflowReach` reads `ref` only — a renamed field a `sort` sorts by is outside the reach. | Read; no fixture has one. | Named as outside. ONT-006's verbs (s9) carry the binding a workflow lacks — a step `on` a noun — so `workflowReach` gains the sibling §6.5 promised next: a verb whose step is on a reached noun is reached. AC1's "one verb" is re-read then. |
| 7 | Checked and holding: a re-attached relation is a drop and an add with its losses counted (honest, no guess); `noun-signs-in` adds or drops `login`; `linkToRecord` refuses a record with a third required field; `for-each`'s `ref` is a function too; rules before drops lets a check on a dropped field come off first; a `was` the world before lacks renames nothing; `componentReach` matches a renamed collection by its old name. | | |

**Graded** (2026-10-09 ~18:25 CEST, working tree over HEAD `6b4e37b13`, in band, no peer suite):

- `nodegx-project-contract` `npx jest`: **182 / 182** (151 → 182: `migrate.test.ts` 34 → 40; `verbs.test.ts` 25, ONT-006).
- `nodegx-backend` `npx jest --runInBand tests/ont-007-migration`: **55 / 55, exit 0** on SQLite and PostgreSQL (45 → 55: per engine the narrowed list ×2, the shared person ×2, the description as `it.failing` ×1 — a ✓ there means the defect is still there).
- `nodegx-backend-contract` **199 / 199**.
- What the fixes did NOT change: every s7/s8 reading above stays green at the same counts.

**Found, for other tasks:** the executor-home ruling stands (§6.5); the two bugs of §6.8 stand.

### 6.10 s10, 2026-10-09 — the verbs a plan reaches (Opus 5.5)

§6.9 #6's sibling. A workflow ties a step to a collection only through the function's graph; a verb says it in the step
(`on` a noun or an own-record relation), so the reach reads it there.

| Piece | Where | What it does |
|---|---|---|
| `verbReach(plan, verbs, before, after)` | `world/migrate.ts`, beside `workflowReach` | Every step `on` something whose collection (read off `plan.before`'s `made`) the plan makes, changes, renames or removes — matched by the old name too, as `componentReach` is. A row: the verb and the step in the person's words and by id, `calls` (`<verb>-<step>`, the component `workflowReach` would find; a `keep` calls none), the collection by the name it will have, `fields` (the changed fields the step writes: all of them for a `make`, the ones an `update` names, an `end`'s field; none for `remove`, `keep`, `ask`), `how`. `rebind: { from, to }` when the step's `on` must be re-said after: a renamed noun's new id, or `null` when nothing in the world after is what it was on. |
| The fixture's verb | `tests/fixtures/world-bombshell-before/docs/world/verbs.json` | "A company joins": `first-member` makes a person (reached), `name-account` updates the account's name (not reached — the control inside the same verb). Validates over the world before and after. Every other reader of the fixture reads three files. |

**AC1 re-read:** the bombshell's reach names a collection (`Person`), a component (`/#__cloud__/enrol`, `/Pages/Members`),
a workflow (`onboard`) and now **a verb** (`join` / `first-member`, `fields: ['account']`). The records half was ✅ in s7.
AC1 ✅.

**What the rename says:** account → subscription reaches `name-account` as `renamed`, `rebind: { from: 'account', to:
'subscription' }`, and the verbs file is refused against the world after until it is re-said (measured: every problem
names `verbs.json`; re-said on the new id, it validates). With s10's write rule (ONT-006 §6.7) a `write_world` of the
renamed world that leaves the verbs out is refused for the same reason, so a rename cannot leave the verbs on a noun that
is gone. The mirror (several accounts → one) reaches a step on `membership` as `removed`, `rebind: { to: null }`.

**Graded** (2026-10-09 ~19:20 CEST, over `333ffbc65`): `migrate.test.ts` 40 → **44 / 44**. Four mutants, each red on
its own spec only: a `make` that writes nothing; an `update` that writes nothing (the forced-Account control); the
rename's new id forgotten; a step on nothing after reported as still bound. Backend `ont-006-verbs ont-007-migration`
**71 / 71**, unchanged.

**Not claimed:** the `end` arm of `fields` has no spec — neither fixture world has a dated end the plan reaches.
`rebindVerbs()` (re-saying the ids for the person) is not built; the rows say what to re-say.

**s13 (2026-10-09, Opus 5.5): the `end` arm is claimed.** `migrate.test.ts` 50 → **52 / 52**, two cases on
`world-verbs` (a world with dated ends, so no fixture file was added):

- the membership said again as not starting and ending (`startsEnds: false`): the plan drops `since` and `until`;
  "their memberships end" is reached by **`until` alone**. The row has no `rebind` (it is still on a membership),
  yet the verbs are refused against the world after, at `verbs[1].steps[1].by` — an end needs a date to mark. So a
  row without `rebind` does not mean the step still binds: `validateWorld` with the verbs is what says that;
- an end said `by` a date the person named ("closed on") is reached by `closedOn`, not by `openedOn`, which changes
  beside it.

Three mutants, each red on its own case only: the end writes nothing (both); the end field read off the world after
(the first; after it, the membership has none); `by` ignored (the second).

### 6.11 s11, 2026-10-09 — the route, and the words said again (Opus 5.5)

Richard ruled the three owed questions in plain words, each the recommendation (README §9 R8–R10): keep a person's word
SQL reserves; **the executor lives in the backend contract's main code**; a link's "when it goes" is kept by the backend at
delete time (bug `P116-ONT-003-links`, now `open`, not built here).

| Piece | Where | What it does |
|---|---|---|
| The executor, moved | `nodegx-backend-contract/src/migration.ts` (`conformance/migration.ts` re-exports it — a spec pins they are the same function) | `dryRunMigration` / `runMigration` as before, over a structural `MigrationContext`; `migrationContextOf(facade)` (the facade's `raw*` calls — the master key, an admin route). |
| A plan from a body | `migrationPlanProblems(plan)` | Shape only, in words: steps/checks/refused present; each step one of backup/schema/move with words; a known schema action naming a table; a known move; a known check. The executor's `applySchema` now throws on an action it does not know — **before, an unknown action was counted as a step done.** |
| The rules after | `rulesAfterMigration(plan, rules, targetOf)` | Pure. A renamed collection's rules move to its new name (refused if the new name already has rules); each `{ path }` rule's hops are re-said — the field a `follow` hop follows and the field a `from` hop matches `by` (on the collection that hop is on, walked from `_User` as `permissionReach` walks it), a `to` naming the renamed collection, a hop filter's top-level keys; a renamed field said deeper inside a filter is a `problem`. Read before the run, by the schema as it stands. |
| The route | `nodegx-backend/src/server/admin-world.ts`, `POST /admin/world/migrate` (admin, audited `world.migrate`) | `{ plan }` → the dry run: `says` (the plan's words), `dryRun`, `rules` it would move, `why` when something stops it. `{ plan, run: true[, acceptLosses] }` → refuses what `POST /admin/schema` refuses (the four system fields, the backend's `_`-collections, `_User`'s own and sign-in fields, its words); checks the rules after would pass `validateSecurityConfig`; the backup through the backup subsystem; the steps; then the rules moved in the RUNNING config (`security.save()`) — the next request is judged by them (BMG-016). 409 refused (nothing moved), 200 ran, 500 `partly` (the rules moved for the steps that ran, never the rest). |
| PostgreSQL's backup | the same route | The backend cannot back up a PostgreSQL store (BRG-008). The run is **409 until the person says where theirs is** (`backupTakenElsewhere: "<words>"`), kept as `backup: { elsewhere }` in the answer and the audit. A decision taken here — the alternative was to refuse PostgreSQL outright. |
| `describeTable` | `IStorageSchema` (18 names), both schema managers, `SCHEMA_COVERAGE` (uncovered, graded by ONT-007), `POST /admin/schema` (501/400 in words, `_`-collections refused, audited), the executor | Says a collection's words and any of its fields' again; null/empty takes them away; a field it does not have is refused. `planMigration` emits it for a kept collection whose words changed (its own, or a kept field's), after the rules and before the drops — **no reach row**: nothing a component, a rule or a verb reads has moved. §6.9 #5's `it.failing` is now `it`, with a restart read. |

**Found and fixed (each a bug file, `commit: 993a3ff1e`):**

1. **`P116-ONT-007-pagecap` (high, before any production caller).** The executor read 500 a page and stopped at the first
   short page. The facade caps a page at `queries.maxLimit` (settable at runtime down to `defaultLimit`); under a cap of
   200 a migration would count 200, move 200, and drop the old field from everyone. The conformance context has no cap,
   so no grade saw it. Now it reads until a page comes back empty.
2. **`P116-ONT-007-pgrenamememo` (high).** On PostgreSQL, after a rename, the very next request through a path rule
   answered **500** — `"subscription" on "Person" is not a declared link (it is String)` — while `GET /admin/schema`
   showed the link correctly. `declaredProperties()` memoises against the schema OBJECT; `renameColumn` renamed the
   column in that object and `renameTable` retargeted others' links in theirs (BMG-003 had fixed the same for
   `addColumn`). Fresh copies now. **Why s8's grade missed it:** it read links back through the wire and the model
   (`getTableSchema`), never through the adapter's own typed reading — the one a `$path` and `_rowToRecord` use.
3. **`P116-ONT-007-selflink` (medium, both engines).** `renameTable` retargeted every OTHER collection's links and wrote
   its own as `{ ...schema, name }`: a topic's `parent` kept pointing at "Topic" after the rename.

**Graded** (2026-10-09 ~19:40–19:58 CEST, in band; a peer's `nodegx-node-spec -w 2` ran for the first part):

- `nodegx-backend-contract` `npx jest` **219 / 219** after the route (`tests/migration.test.ts` 20: the cap, the plan
  validator, the rules — no engine).
- `nodegx-backend` `ont-007-route` **19 / 19** at the route commit (SQLite and PostgreSQL over real sockets; the rename
  on a LOCKED backend: the same people seen before and after as each signed-in person, the moved `nobody` rule refusing
  on the next request, `security.json` on disk); with 15 more specs around it **298 / 298**, exit 0.
- Mutants, each red on its own spec: the old page loop (contract 2, route 2); the rules not moved (route 3); PostgreSQL's
  in-place `renameColumn` and in-place retarget (`ont-007-migration` 1 each — the first version of that case read no
  memo between the two renames and passed the mutant; a read between them is what made it measure); the planner without
  its `describeTable` step (`migrate.test.ts` 5).
- After `describeTable` (19:57): `nodegx-project-contract` **195 / 195** (`migrate.test.ts` 47: the four pinned plans now
  say Person's words again, and three new cases — a sentence said again is `[backup, describeTable]` with no reach, the
  same world twice is `[backup]`, a field's words carried by name); `nodegx-backend-contract` **219 / 219**; `noodl-mcp`
  `ont002WorldTools` + `toolDisclosure` **30 / 30**, `[surface] 8261 tokens / 20 resident tools — 19 under` (unchanged);
  `nodegx-backend`, 18 specs (the 16 above plus `brg-003-conformance-gate` and `-declared`, which read
  `SCHEMA_COVERAGE`), **312 / 312, exit 0** — `ont-007-route` 23 (the schema action: words said and taken away, a field it
  does not have and `_User` refused), §6.9 #5's case an `it` on both engines with a restart read;
  `npm run ontology-census:check` fresh.
- `tsc`: contract, backend `tsconfig.json`, runtime, project contract (both configs) clean; backend `tsconfig.tests.json` red only on the four known
  ISL-010 lines (`P116-ONT-003-tsc`).

**Not built / owed:**

- **The route's read-only twin.** The dry run is a POST on the same pattern, so `admin:readonly` cannot call it
  (`READONLY_SAFE_ROUTES` is by route, not body). ONT-008's page may want a `POST /admin/world/migrate/dry-run`.
- ~~**`-renamecolumn`**~~ fixed s14 (§6.12).
- **Rules on a deleted collection or a dropped field** are left as they are (the person's); `permissionReach` names them
  for the page.
- **The MCP** has no tool for the route (`write_world` does not grow a `migrate` arm here): the surface budget is the
  reason to ask before adding one.

### 6.12 s14, 2026-10-10 — a rename is refused like a drop (Opus 5.5)

Bug `P116-ONT-007-renamecolumn` fixed (`78ec0ed69`), by the refusal its file recommended, not by carrying the
declaration across: BMG-003 already refuses a drop or a type change of a field something declared reads, and the
planner already takes such a rule off first (`migrate.ts` `checksMove`/`indexesMove`), so the refusal never meets a
plan and costs a hand rename one step.

- `refuseColumnInUse` (`schemaCommon.ts`) takes the verb; each manager has one `refuseIfRead` that `dropColumn` and
  `renameColumn` both call before any DDL. The route refuses first in the page's words (409) and maps an adapter's
  `COLUMN_IN_USE` to 409. The words: `Cannot rename "tier" in "T": the rule "tier is one of basic, gold" reads it.
  Remove that rule first.`
- **Found while grading it, bug `P116-S14-partialdrop`:** an index reads the fields its `where` names too, and nothing
  counted them. A drop of a field only a partial index's condition read **went through on PostgreSQL and took the index
  with it**, and failed on SQLite in the engine's own words. The planner had always counted `where` fields; the
  refusal had not. Fixed in the same helper, for drop and rename, and in the route's `refuseIfInUse`.
- Graded: conformance case `schema/rename-column-keeps-its-values-and-refuses-one-in-use` (so `renameColumn` leaves
  the uncovered list: **21 of 68**, ceiling still 22), the drop case's where-only reader, and `bmg-003-schema`'s route
  case, all on SQLite and PostgreSQL. **Red before the fix on both engines** (the rename went through; the where-only
  drop: PostgreSQL succeeded, SQLite `ERR_SQLITE_ERROR`), green after.
- **And a guard for the viewer build** (bug `-viewerbuild` had no regression, and the build went red twice from this
  package): `nodegx-backend-contract/tests/viewer-es5.test.ts` compiles `src/index.ts` at the viewer's target and
  refuses TS2802/TS2569, beside a Map-spread control. Measured on a copy of `src/` with s12's `targetGoes.ts`: one
  error, at `:226`.
- Measured (13:15–13:35 CEST, over HEAD `d3fc44f7b` + these edits): `nodegx-backend` the eight conformance / BMG-003 /
  ONT-007 specs **155 / 155**, every `ont-00*` spec **189 / 189**; `nodegx-backend-contract` **230 / 230**;
  `noodl-runtime` `SchemaManager.dropColumn` **6 / 6**; `tsc --noEmit` clean on the runtime, the backend (both
  configs) and the contract. The backend's `tsconfig.tests.json` is clean now (ISL-010's four lines are gone).
- Not driven: the admin page's rename (`schema.tsx:389`) shows a refusal through its existing `.catch(fail)` toast.
