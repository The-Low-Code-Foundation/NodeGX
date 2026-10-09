# ONT-003 — The projection is a function

**Opened 2026-10-08.** **Depends on ONT-001.** **Status: ✅ s3, 2026-10-08 — AC1–AC4 met on SQLite and PostgreSQL (§6).**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 is sufficient** — a deterministic projection graded by the existing conformance suite. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **The database is made from what I said, the same way every time, and a test proves on two different engines that
> it still means what I said.**

## 2. Why

README §1 readings 1, 3, 10. The backend contract and its conformance suite are the target; P104's eleven tiles are the
vocabulary a schema is written in; NSP-008 showed that a sentence written as a claim before recording grades the thing
it describes. The projection must be a function of the answers, not an agent's judgement, or two runs of the same
sentences give two databases.

## 3. What to build

1. **The function.** `project(ontology) → Schema` in the kinds package: nouns to collections with fields in the tiles'
   storage types; each kind's `projection` to a Link, a Links, a Choice with its fixed list, a junction collection with
   the edge's properties as columns, a uniqueness rule, a cascade or a soft-delete rule, an end-date field. Pure;
   snapshot-tested per kind.
2. **The claims.** Every answer becomes a claim in the contract's terms, written before the schema is applied: "a member
   row cannot exist with no account", "archiving keeps the membership row and nulls its account", "a subcategory names
   exactly one category". Claims are scenario files, as NSP-008's are.
3. **The grade.** The conformance suite (`@noodl/backend-contract/conformance`) grown by a claims case set: apply the
   projected schema through the schema API, run the claims as operations and assertions, on SQLite and Postgres.
   Each claim's mutant (ONT-005) must fail it.
4. **The write.** The projection applied through the existing `POST /admin/schema` route, never by SQL, so BMG-003's
   adapter defects are the backend's to own and the manager shows what was made.
5. **Idempotence.** Projecting twice changes nothing; projecting a changed ontology is ONT-007.

## 4. Acceptance criteria

1. The same `docs/world/` projects to byte-identical schema on two runs and two machines.
2. On a fixture of every kind, every claim passes on SQLite and Postgres through the conformance suite; each claim is
   shown to fail on its mutant.
3. The backend manager's Schema page shows the projected collections with the tiles the kinds named, and the person's
   sentence as each collection's description.
4. No file in the package imports an adapter.

## 5. Watch for

- **The default equals the test value** (memory). A claim whose fixture data would pass on the mutant too grades
  nothing; every claim's fixture carries the row that breaks its mutant.
- **Two formats.** Directus-backed projects store Directus operator names (contract README); the projection speaks the
  neutral model only, and the migration map does the rest.
- **The capability table.** A kind whose projection needs a cell marked `unsupported` on a backend projects to the
  nearest supported shape and says so in the schema's description, or refuses; it never silently drops a rule.

## 6. Built

**s3, 2026-10-08, Opus 5.5.** All four ACs met; the claims run on SQLite and on PostgreSQL 16 through the conformance
runner, and the write goes through `POST /admin/schema` on a real `BackendService` on both.

### 6.1 What it is

| piece | where | what it does |
|---|---|---|
| the rules, as data | `nodegx-project-contract/world/kind.ts` | `Projection.rules` was `string[]`; it is now `ProjectedRule[]` — `{ on, says, holds }`, where `holds` is one of eleven shapes (`unique` with an optional `whileEmpty`, `pairOnce`, `pairTwice`, `setOnce`, `neverEdited`, `neverDeleted`, `notUnderItself`, `onlyThrough`, `logged`, `retiredStays`, `shape`). The words are unchanged; a shape is what lets the projection tell a rule a store can keep from one it cannot, without parsing a sentence. `ProjectedField` gained `values` (a choice the kind makes itself). |
| the function | `nodegx-project-contract/world/project.ts` | `projectWorld(files) → { ok, schema } \| { ok: false, problems }`. Validates first (the validator's words), then: a collection per noun (`PascalCase` of its id) with its properties; a collection per relation that is a record of its own; every relation's fields onto the record the kind names; a unique rule as a declared index (partial, `where: { until: { exists: false } }`, for "one at a time" on a link that starts and ends); a choice as a `oneOf` check; everything else as a **not-held** rule with the reason, written into the collection's description. Each column carries its tile (`kind`) beside its storage type. `STORAGE_TYPE` is the tile → storage map, pinned to the manager's `KINDS` by test. |
| the claims | same file | Generated, not hand-written: a required field (a row without it is refused; the whole row is made first, as the control), a choice (its first value made; a value off the list refused), a unique rule (one value made, another made, the first again refused; with `where`, a closed row with the same value made — so the claim also fails if the rule forgets its `where`), a pair kept once. Rows are seeded deterministically: every required field gets a value that fits, links get a row made first, unique values never collide by accident. Each held claim names its **mutant** (`dropRequired` · `dropIndex` · `dropCheck` · `linksAsList`); `applyMutant()` takes exactly that rule out and refuses a mutant that takes out nothing. Not-held rules that steps can say get a claim too (`setOnce`, `neverEdited`, `neverDeleted`, `notUnderItself`, `pairTwice`, and every `whenTargetGoes`). |
| the runner | `nodegx-backend-contract/conformance/claims.ts` | `runClaim(ctx, schema, claim)` applies only the collections a claim reaches, under the run's fresh names (Pointer targets renamed with them), through `createTable` / `reconcileChecks` / `reconcileIndexes` — never SQL — and runs the steps. `claimCases(schema, claims, 'schema' \| 'mutant')` makes them conformance cases in a new area, `claims`; `runConformance(…, { cases })` runs a caller's cases instead of the fixed list. **A not-held claim, and a held claim on its mutant, must fail at a step that says the rule** (`saysTheRule`): one that failed while making its rows measured nothing, and the case says so. A not-held claim that passes reports "the label is wrong". It imports nothing from the project contract; the backend spec assigns the projection's types to the runner's, so the two cannot drift without a compile error. |
| the write | `world/project.ts` `schemaPushes()`; `nodegx-backend/src/server/byob-admin.ts`; `src/admin/app/views/schema.tsx`; `nodegx-backend-contract/src/storage.ts` | One `createTable` body per collection, with its description, fields (tile left behind: the manager reads it back from type + rules), checks and indexes. **`createTable` now keeps a collection's `description`** (both engines already stored the whole declaration as JSON; the route dropped it), both schema routes return it, and the Schema card shows it under the collection's name. `StorageTableSchema.description` and `createTable`'s spec say so in the contract. |

### 6.2 What it measured

| fixture | kinds | collections | claims | held (by mutant) | measured not held | not-held rules (no claim) |
|---|---|---|---|---|---|---|
| `tests/fixtures/world` (ONT-001's) | 8 | 7 | 19 | 11 (7 required, 3 choice, 1 unique) | 8 | 10 (2) |
| `tests/fixtures/world-every-kind` (new: nine nouns, fourteen relations, **every kind**) | 14 | 11 | 29 | 16 (9 required, 3 choice, 3 unique, 1 pair) | 13 | 17 (4) |

On **both engines**: every held claim passes; every held claim fails on its mutant at the rule's step; every
not-held claim fails at the rule's step. The four not-held rules with no claim are the ones the data plane cannot
say: an exchange log (a workflow's), owner-only (the collection's permissions, BMG-006), a retired choice value (the
screen's), and a link that may point at any of several kinds (`pointsAtId` is a text id, so there is no target
collection to delete from).

**The finding: no engine keeps what happens when a link's target goes.** On the every-kind fixture, seven claims
measure it — `goes-too`, `stays-unlinked` and `blocks`, on `belongs-to`, `is-on`, `happened-to`, `part-of-tree`,
`same-as` and `extends` — and six more measure `setOnce`, `neverEdited`, `neverDeleted` (three) and `notUnderItself`. A Link is a text id
with no foreign key on SQLite and on PostgreSQL, and the contract has no on-delete rule. Filed:
[`P116-ONT-003-links`](../../bugs/p116-ont-003-links-a-link-keeps-pointing-at-a-deleted-record.md) (needs-ruling).
Until it lands, the description tells the person, e.g. *"A company is where people work … Not kept by the database
yet: a company cannot go while any accounts are linked to it."* — and when it lands, these claims fail with "the label
is wrong" until the projection moves them to held.

### 6.3 Decisions this task left to its session

| left open | decided | why |
|---|---|---|
| change ONT-001's rule strings? | **yes, to `{ on, says, holds }`**, same words | a rule's words cannot be graded; its shape can. The task allows replacing any sketch |
| `happened-to` with `outlives: true` | the link is **no longer required** | ONT-001's sketch made it required *and* `stays-unlinked`, which no store can hold at once (the end empties a field that may not be empty) |
| `happened-to`'s `by` | **`doneBy`** | BY is a word the database keeps for itself, and the manager refuses it |
| a `link` with no `points` | the app's users (`_User`) | "who did it" is whoever was signed in, not a noun of the person's world |
| the person's words that SQL keeps for itself (`plan`, `on`) | **kept as the names**, and listed by the write spec | the engines quote every name, so it works; renaming `plan` to `planValue` behind the person's back breaks "a view of the schema in their words". The manager refuses such a name for a field made by hand. **Asked as R8** (README §9) |
| a description that changes later | written once, like the rest of `createTable` | a changed sentence is a changed world: ONT-007's |
| two relations making one field (two `by-name` from a note to a person) | **refused**, naming both | the world format has no field-name override; naming the second after its relation would rename an existing field when a relation is added — a migration. ONT-002's conversation should ask "what do you call it?" |
| two collections that need each other first (required links both ways) | **refused** at claim time | no row of either can ever be made |
| AC1's "two machines" | a committed golden file per fixture (`projected.json`), compared byte for byte | CI is the second machine; the projection reads no clock, no locale and no randomness |

### 6.4 The acceptance criteria

1. ✅ **Byte-identical.** `tests/project.test.ts`: two projections, one from a re-parsed copy, and the committed
   `projected.json` — equal as text, for both fixtures. `ONT003_WRITE_GOLDEN=1` rewrites them.
2. ✅ **Every claim on two engines, each failing on its mutant.** `nodegx-backend/tests/ont-003-claims.test.ts`:
   SQLite 19/19 + 11/11 mutants, 29/29 + 16/16; PostgreSQL the same. Sabotaged three ways, each red for its reason:
   a not-held claim labelled held ("is not kept"), a held claim labelled not held ("the label is wrong"), a runner
   whose refusal step never fails ("passed on the schema without its rule — the claim grades nothing"). Restored
   byte-identical.
3. ✅ **The manager shows it.** `nodegx-backend/tests/ont-003-write.test.ts`: every push answers 200 on both
   engines; `GET /admin/schema` lists every projected collection with its description, every field with the tile
   its kind named (read through the manager's own `kindOf`), its type, target and required flag, its rules and its
   indexes. `tests/admin-app/ont-003-card.test.tsx`: the card, mounted with that shape for all eleven collections,
   shows the sentence under the name and each row's tile (the dropdown's value, or the badge's icon — never the
   cell's whole text, which holds every option). Sabotaged: the route without the pass-through, and the card
   without the line — each red; restored.
4. ✅ **No adapter.** `tests/project.test.ts`: every import in the package's sources stays inside it (a control
   proves the pattern sees one); ONT-001's engine-name grep now walks `project.ts` and the second fixture too.

**Neighbours run** (in band, beside a peer's suite): `bmg-003-schema`, `admin-app/schema-view`,
`brg-003-conformance-*`, `brg-005-conformance-postgres`, `brg-004-*`, `fed-002-indexes`, `hlt016-*` — 16 suites,
199 tests, green. `@noodl/backend-contract` 199/199; `@nodegx/project-contract` 53/53 (36 + 17).
`typecheck:backend-tests` adds no error; it was already red at HEAD on four lines of the ISL-010 drive spec,
filed as [`P116-ONT-003-tsc`](../../bugs/p116-ont-003-tsc-the-backend-spec-typecheck-is-red.md).

### 6.5 Found, for other tasks

- **ONT-005:** the machinery is here — a claim, its mutant, `applyMutant`, and the rule "fail at the rule's step".
  The kinds' own mutant seeds (19) are not yet executable; most are a projection made the other way (a link stored
  as text, a Links where an is-on belongs), which `applyMutant` can grow to.
- **ONT-007:** `createTable` is create-if-absent, so a changed description, a new field or a dropped rule needs the
  diff. The golden files are the "before" a diff can be read against.
- **ONT-008:** each column carries its tile (`kind`); the card already shows the sentence. The relation's own
  sentence is on each field it made (`description`).
- **ONT-002:** the conversation should ask a field's name when a second relation would make the same one.

### 6.6 R10 — the "when it goes" rule, kept at delete time (s12, 2026-10-09, Opus 5.5)

Ruled R10 (README §9): not a foreign key; the backend keeps it inside the delete, the same on every engine. Bug
[`P116-ONT-003-links`](../../bugs/p116-ont-003-links-a-link-keeps-pointing-at-a-deleted-record.md) → `fixed`.

**What it is.**

- **The contract.** `StorageColumn.whenTargetGoes?: 'goes-too' | 'stays-unlinked' | 'blocks'` — the person's three
  words, kept as they are (R8's choice for names). `@noodl/backend-contract` `src/targetGoes.ts` (beside the migration
  executor, R9's home): `whenTargetGoesProblems()` (only a Pointer with a target; one of the three; `stays-unlinked`
  never on a required field), `planDelete()` (read-only: every rule pointing at the record, breadth first over what
  goes, a row reached twice going once so a loop ends; blockers counted, minus rows that go anyway),
  `deleteKeepingLinks()`, `StillLinked`, and `WHEN_TARGET_GOES_BY_BACKEND` — the capability cell per backend
  (`nodegx` supported; the other five unsupported, each saying where that backend keeps it itself). It is NOT a
  `CapabilityKey`: those are what a node can attempt, and no node attempts this.
- **The backend.** `AdapterFacade.rawDelete` calls it — the one method every door passes: `/classes` (and so a
  cloud function's Delete Record, which calls it over loopback — `FunctionRuns.ts`), BYOB `/api/:table`, `_batch`, the
  session and account sweeps. A `blocks` refusal is `409 { reason: 'still-linked', linked: [{ collection, field,
  target, count }] }` on all three data doors (both single-record doors used to answer every error with 404).
  `POST /admin/schema` refuses a rule that could never be kept on `createTable`/`addColumn` (400) and has a new action
  `setWhenTargetGoes` (`{ columns: { field: rule | null } }`) — `IStorageSchema.setWhenTargetGoes?`, 19 names now,
  both engines (a fresh schema object, the s11 memo rule), **covered** by a new BRG-003 case
  (`schema/set-when-target-goes-changes-the-declaration`; 79 cases now) — it first went in as `uncovered` and the
  BRG-003 ratchet (22, a ceiling never raised) went red at 23, so the gap was closed instead of the number moved.
- **The projection.** A link to a noun carries `whenTargetGoes` on its column and its claim is **held**, with the
  mutant `dropWhenTargetGoes`. A text id beside a kind (`points-at-one-of`) names no one collection: still not held,
  with that reason. 22 claims flipped across the four worlds (world 4, every-kind 9, membership 8, categories 1).
- **The migration.** A changed answer on an otherwise-same link is a `setWhenTargetGoes` step ("when the Account a
  person's account points at goes, the person goes too"); a new collection carries the rule on its `createTable`. The
  executor runs it and `migrationPlanProblems` refuses a rule the route would. Because a kept rule is no longer in the
  collection's words, the bombshell and its mirror lost their `describeTable:Person` step — correctly.

**Decisions (mine; nothing waited).**

1. **Who it runs as.** The caller's own record is deleted FIRST, under their ACL: a refusal there changes nothing
   anywhere. What follows is the schema's rule, not the caller's act, so it runs as the master key — the cascade, the
   emptying, and the `blocks` count (which therefore counts rows the caller may not see; the 409 says how many). A rule
   that held only for callers who could write every linked row would say a different thing for every caller. That is
   what a database's own on-delete actions do (they are not subject to row security). Measured: a stranger's delete of
   an account cascades nothing; the owner's takes the person with it.
2. **Plan, then write.** Every refusal is found before any row is written (a badge that blocks a person two links
   down leaves the account, the person and the badge). It is not one transaction: a row linked between the read and
   the writes is not seen, and a write failing part way leaves the rest pointing at nothing — every project's state
   before R10. The facade has no transaction across an await on every engine (BRG-005's).
3. **A delete of nothing** reaches for nothing (the plan is `null` when the record is not there), so a master delete of
   a missing id does not cascade over rows still naming it.
4. **Graded through the facade, never in the conformance context.** The claim specs (`ont-003-claims`, `ont-005`,
   `ont-006`, `ont-007-migration`) hand the conformance context an adapter whose `delete` IS `AdapterFacade.rawDelete`
   (`tests/helpers/facade-deletes.ts`). The rule in the context would have passed every claim while the facade forgot
   to call it.

**What it measured (2026-10-09, in band).**

- `ont-003-claims` 26/26 both engines: world 15 held / 4 not, every-kind 28 / 6, membership 19 / 7, categories 3 / 0;
  every held claim fails on its mutant. **Control:** the facade's rule skipped → exactly the 22 flipped claims fail
  (4 + 9 + 8 + 1), the rest pass.
- `ont-003-target-goes` (new) **20/20**, SQLite and PostgreSQL: the three doors, two levels of goes-too beside an
  emptied link and an untouched account, a refusal two links deep, a tree and a loop, **501** people past a page, the
  route's refusals, `setWhenTargetGoes` over records and `null` (the old behaviour, the control), a restart, the
  caller's ACL. **Control:** the cascade moved before the caller's own delete → the ACL case red on both engines.
- `ont-005` re-pinned: in every world two fell — `…/whenTargetGoes-unanswered` and `…/id-as-text` (the link stored as
  text loses its rule, so the held `…-blocks` claim kills it). **every-kind 18 → 16 of 38** (8 unkept, 8 unclaimed);
  identical on both engines. `note-about/whenTargetGoes-unanswered` (a text id) still survives, as it must.
- `ont-007-migration`: s9's words test re-based on a sentence said again (it rode on the rule's words); a new R10 case
  — blocks refused before, `setWhenTargetGoes` run, kept after a restart, the next delete takes Ada and Grace and
  leaves Linus.

- The backend specs that delete or gate anything (53 files: every spec naming `DELETE`, `rawDelete`, `_batch`, the
  users and sessions routes, plus `brg-003-*`, `brg-005-*`, `ops-audit`, `bmg-003-schema`, `ont-00*`), in band:
  **827 / 829**. The two reds were count gates: the BRG-003 ratchet (above) and `ops-rate-limit`'s route tally,
  `admin` 101 → 102 — **s11's own miss**: it added `POST /admin/world/migrate` and never ran that spec. Reviewed and
  recorded there (left in the `admin` budget). Re-run: the six gate and conformance specs **60 / 60**.

**Found.** A Links field's pairs stay after either end is deleted, both engines — bug
[`P116-ONT-003-pairs`](../../bugs/p116-ont-003-pairs-a-deleted-records-links-pairs-stay-behind.md) (fixed s13, §6.7).

### 6.7 A Links field's pairs go with either end (s13, 2026-10-09, Opus 5.5)

Bug [`P116-ONT-003-pairs`](../../bugs/p116-ont-003-pairs-a-deleted-records-links-pairs-stay-behind.md) → `fixed`. No
ruling: a pair means nothing once either end is gone, so nothing in the schema says it and the person is never asked.

- **Where.** In the plan `deleteKeepingLinks` already reads (`targetGoes.ts`), not beside it. `DeletePlan.unpaired`:
  every pair with a record that goes, at either end, for the caller's record **and every record that goes with it**
  (`goes-too`). The record's own pairs come from every Relation its collection declares (`getRelatedIds`). The pairs
  naming it come from every Relation whose `targetClass` is its collection (`getRelationOwners`). A pair found from
  both ends is taken out once. They go **last**, after every delete, as the master key (the same reason as §6.6 #1),
  through the data plane's `removeRelation`, which on PostgreSQL waits for the schema manager's write queue.
- **No new schema member.** `DeleteContext.schema` now picks `getRelatedIds` and `getRelationOwners` too, both already
  on `IStorageSchema` and graded by BRG-003. The context gains `unpair`. So the BRG-003 ratchet and the route tally
  do not move.
- **What it still does not do.** A delete of a record that is not there takes no pairs that name its id: the plan's
  existence check, as for links. Both engines' master-key delete succeeds on a missing record, so "the delete went
  through" proves nothing. A Relation that does not say which collection it points at cannot be found from the far
  end, so only its owner's own pairs go. It is not one transaction (§6.6).
- **Graded.** `nodegx-backend-contract` `targetGoes.test.ts` 5 → 9 (a tag goes; a post goes, a self-Relation found
  from both ends taken out once; a post going with its account; a record that is not there). `nodegx-backend`
  `ont-003-target-goes` 20 → **22 / 22** on SQLite and PostgreSQL, through the real `AdapterFacade`: a tag goes, a
  post goes, a post goes with its account, the pairs read before as the control, and the far end stays. Control: with
  the unpair loop emptied, the engine case is red on both engines, and 3 of the 4 unit cases are red. The fourth
  checks an absence; the first case is its known-firing partner.
- **The viewer builds it.** `@noodl/backend-contract` is compiled by the viewer's ES5 build, where spreading a Map's
  iterator is TS2802 and a webpack with errors writes no bundle. s12's `[...counts.values()]` had made
  `ci:build:viewer` red; P109 found it (as it found the same in `migration.ts`, `06ec2d4e7`, bug
  `P116-ONT-007-viewerbuild`). Both spreads are now `Array.from`. Measured with `tsc --target ES5` on the file: clean,
  and HEAD's copy red at `:226` as the control.
- **Whole backend suite** (2026-10-09 22:42–23:12 CEST, `-w 2`, 30 min): 227 files, 2,777 tests, **2,730 passed,
  29 failed, 18 pending**. The 29 are two files, neither P116's: `rel002b-fail-closed` (1, filed as
  `P116-S13-REL002B`: the spec never deletes and its failing visit has no backend) and `ac2-page-editor-drag-drive`
  (28, one `beforeAll` timeout, filed as `P116-S13-AC2STALL`: it stalls alone too, in its own write-storm mutant arm, and a tracer on `deleteKeepingLinks` logged 0 calls in the stalled run). Then on the final tree (HEAD `1b5774b23`),
  in band: every `ont-00*` spec, the four `brg-003-*` and `ops-rate-limit`, **208 / 208**.

### 6.8 A noun known in two other systems (s13, 2026-10-09, Opus 5.5)

Bug [`P116-ONT-003-two-systems`](../../bugs/p116-ont-003-two-systems-a-noun-that-exists-in-two-other-systems-cannot-be-projected.md)
→ `fixed`. `exists-elsewhere`'s field was always `idElsewhere`, so a second system from the same noun was refused.
The kind's own `projectsTo` already said "a Text field per system". It is now named after the **relation's id**
(`on-the-course-platform` → `onTheCoursePlatformId`, `mailing` → `mailingId`), not after the system's words.

- **Why the id, not the words (my decision).** A reworded system ("the course platform" → "the learning platform")
  changes no id, so it renames nothing that is stored. Named after the words, the same reword would rename the field
  with **no change in the world's diff**: `diffWorld` compares worlds, not projections, so the migration would never
  see it. The cost is a longer name when the person's id is long.
- **Why now.** Measured before the change: nothing outside the package's own fixtures names `idElsewhere` (the
  repo, the test projects folder and `~/Documents` hold no `docs/world/`). So no backend holds the old name. After
  ONT-008 makes worlds common, the same rename would owe a migration. The vocabulary's version stays 1: bumping it
  would refuse every world already written, for a name no world holds.
- **Graded.** `project.test.ts` +2: one person in two systems projects two unique fields, each with its claim; the
  same system said in other words keeps its field name. Controls: the fixed name back → both red, with the bug's own
  refusal ("the relation "mailing" makes a field called "idElsewhere" on Person, which already has one"); named after
  the words → both red. The two goldens were rewritten with `ONT003_WRITE_GOLDEN=1`, and the field name is the only
  change (16 lines each way). `mutants.test.ts`'s `id-nowhere` words updated. `nodegx-project-contract` **202 / 202**.
