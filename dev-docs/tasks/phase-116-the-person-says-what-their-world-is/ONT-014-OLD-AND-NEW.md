# ONT-014 — Old and new

**Opened 2026-10-10**, from ONT-013 §3.2: the one atom the person's lifecycle sentences need and the backend does not
have — a rule that reads **the record before the change, the record after it, and who is making it**, held inside the
write. ONT-012's `onlyWhile` is the special case that reads the old record only. **Depends on** ONT-012 (the seam:
`heldWhile()` in `persistence/onlyWhile.ts`, the `StorageAclOption.onlyWhile` ride, the 409 mapping per door), R10 (the
facade as the one door). **Feeds** ONT-013 (three unkept shapes flip to held), ONT-011 step 4 (*settled* projects to
this and nothing else), ONT-008 (the view shows a value's allowed moves). **Status: 🟡 s18 (2026-10-11, Fable 5.1) — built: AC1, AC2, AC3's shape half, AC4 for the three flips, AC5, **AC6 (the reach review, §6.5: 7 findings, 5 fixed, 1 filed as `P116-S18-CASCADEHOLD`, 1 a ruling)**. **AC4's two new `RuleHold` shapes built with ONT-011 step 2 (s18, its §9), and `was` on a `rules` step (§6.5 #4) built.** **s20 (Opus 5.5): AC3's schema half built (§6.6); R-i and R-j ruled; the cascade built (§6.7) — every AC built; the task closes when Richard reads it.**

> **Model check (Richard, 2026-10-08 rule):** the build wants **Opus 5.5** — fixed-shape enforcement on a seam that
> exists and a grading suite that exists (`ont-012-only-while.test.ts`'s shape). **A reach review on Fable 5.1**
> follows, as ONT-012's does: "which door lets a value move the wrong way?" — the batch, the upsert, the increment, a
> relation-only PUT, a workflow step, the MCP's `_update`.

## 1. The person sentences

> **"An assignment goes from draft to issued to withdrawn. It never goes back. Only a coach may issue one."**
>
> **"Once an invoice is issued, its number and its amount never change. We can still mark it paid."**
>
> **"A person's date of birth is written once."**
>
> **"A sealed envelope is never deleted."**

The first is a **move**: a value, the moves it may make, and who may make each. The second is **frozen** fields under a
condition on the old record. The third is frozen with no condition — the `setOnce` claim the vocabulary already writes
and the engine does not keep. The fourth is `neverDeleted`, the same.

## 2. Why

`project.ts` `WHY` says, for `setOnce`: *"the schema has no rule against changing a field once the record is made"*;
for `neverEdited` and `neverDeleted`: *"who may change a record is its collection's permissions, which the projection
does not write yet"*. All three are survivors in ONT-005's 16 of 38. ONT-012 built the seam that can hold them —
`onlyWhile` ANDs a condition on the old record into the write's own ACL, one SQL statement, a 409 in the person's
words — but its `where` reads the old record only and never the body or the caller. The lessons corpus has the move
(`Assignment.status` draft / issued / withdrawn, `PathStep.status`, `Programme.status`), nightbook has the seal, and
every settled row in ONT-011 §3.2 is one of these four sentences.

## 3. What to build

### 3.1 `security.json`: `onlyWhile.update` grows two clauses, `onlyWhile.delete` grows one word

```json
"Assignment": {
  "onlyWhile": {
    "update": {
      "moves": {
        "status": {
          "draft":  { "to": ["issued"],    "by": ["role:coach"] },
          "issued": { "to": ["withdrawn"], "by": ["role:coach"] },
          "withdrawn": { "to": [] }
        }
      },
      "frozen": { "fields": ["learnerId", "brief"], "unless": { "status": "draft" }, "says": "An issued assignment's learner and brief never change." }
    }
  }
},
"Envelope": {
  "onlyWhile": { "delete": { "where": { "sealed": false }, "says": "A sealed envelope is never deleted." } }
},
"Person": {
  "onlyWhile": { "update": { "frozen": { "fields": ["dateOfBirth"] } } }
}
```

- **`moves.<field>`**: for each old value, the values it may move to (`to`; `[]` = none) and who may make the move
  (`by`, an ordinary rule value — role atoms, the record's own ACL keys, a `{ path }` atom). A write whose body sets
  the field to a value not in `to` for the old value, or by a caller `by` does not admit, is refused. A write that
  sets the field to its current value is not a move. An old value with no entry may move anywhere (the rule says
  what is forbidden, not everything that is allowed) — **unless** the person said "nothing else", which is `"*": {
  "to": [] }`.
- **`frozen`**: `fields` whose change is refused, `unless` a Parse-wire condition on the **old** record holds (no
  `$path`, as for `where`). No `unless` = frozen from the first save (`setOnce`). `fields: "*"` = the whole record
  (`neverEdited`). ONT-012's `except` is the complement and stays; a body may not be both excepted and frozen — the
  validator refuses it.
- **`delete.where`** with a condition that can never hold is clumsy; `"delete": "never"` is the word for
  `neverDeleted`. The admin credential, as always, is not bound.
- **`says`** per clause, as before; a default sentence names the field and the move.

### 3.2 Enforcement: still one statement

Every clause here is decidable from **the body, the caller and the old record**, so it stays inside ONT-012's design:

1. The body is read first (which fields change; for a `moves` field, the new value). From that, the clause compiles
   to a condition on the **old** record: for `moves`, *old.status ∈ {the values whose `to` holds new.status}*; for
   `frozen`, *unless holds* when a frozen field is in the body. `by` is decided on the principal before the statement,
   as `checkClp` is.
2. The condition is ANDed into the write's `only` by `heldWhile()`, so the check and the write are one statement on
   both engines, with no read-then-write race. `whyRefused()`'s two counts tell a 409 (the rule stopped it) from a
   404 (the caller may not write the row).
3. The 409 carries the clause's `says`, at every door ONT-012 §6.1 mapped: PUT, the upsert, BYOB PUT and batch (both
   arms), the increment (a frozen number is also frozen against `$inc`), the relation-only PUT. The MCP's `_update`
   says it. A new door found in the review is a finding, not a silent pass.
4. **Who it binds:** every caller the row ACL binds. Cloud functions and workflows run as admin and are not bound — *a
   function is how an amend is made* (ONT-012 §3.1). ONT-006's verbs that move a status do so as admin and must
   name the move in their steps; the reach review counts them.

### 3.3 The projection

`RuleHold` gains two shapes, and three existing ones flip from unkept to held:

| `RuleHold` | projects to | was |
|---|---|---|
| `{ setOnce: f }` | `frozen: { fields: [f] }` | unkept |
| `{ neverEdited: true }` | `frozen: { fields: "*" }` | unkept |
| `{ neverDeleted: true }` | `delete: "never"` | unkept |
| **new** `{ frozen: [f…]; unless?: where }` | `frozen` with `unless` | — |
| **new** `{ moves: f; from: { old: { to: [...]; by?: rule } } }` | `moves` | — |

*Settled* (ONT-011 step 2) projects to `moves` on its status choice (draft → agreed → withdrawn, nothing back) plus
`frozen` on everything but its status and its note `unless` draft, plus `delete: "never"` for an agreed one if the
person said so. Its `amends` self-link is a plain Link. `WHY` loses three lines.

## 4. The doors

ONT-012 §4's table is the census. Each row's "what this task does" for an update is **the same strip-or-refuse, plus
the move and freeze check**. Two rows need their own thought:

- **The increment echo** (`PUT` with `$inc`): a frozen Number must refuse `$inc`, and the refusal must not echo the
  old value to a caller who could not read it (ONT-012's field mask runs first).
- **The batch**: a batch that moves the same record twice in one request (draft → issued → withdrawn) is two moves
  and each is judged on the record as the previous one left it. A batch that is refused half-way is ONT-012's
  "both arms" case.

## 5. Acceptance criteria

1. **On SQLite and PostgreSQL, over HTTP on a locked backend**, with the §1 sentences as `security.json`: draft → issued
   by a coach goes through; by a learner is a 409 carrying `says`; issued → draft by anyone is a 409; withdrawn → anything
   is a 409; setting `status` to its current value is not a move. A frozen field changed on an issued assignment is a
   409; the same change on a draft goes through; a `$inc` on a frozen number is a 409. A sealed envelope's DELETE is a
   409 and the record stands. `dateOfBirth` set at create, then changed, is a 409. The admin credential does all of
   it. A row the caller may not write is still 404. **Mutants, each caught by name:** `heldWhile` spied to drop the
   `moves` condition; the body reader spied to miss a frozen field under a `$set`-style alias; `by` skipped.
2. **Every door in ONT-012 §4** that takes an update or a delete refuses with the 409, counted in the spec per door,
   including the batch's second move and the relation-only PUT.
3. `validateSecurityConfig` refuses, in words: a `moves` entry on a field that is not a choice or text; a `to` naming a
   value the choice does not hold; a field both `frozen` and `except`; `unless` with a `$path`; `delete: "never"`
   beside a `delete.where`; either on a `_` collection.
4. **The projection:** `setOnce`, `neverEdited`, `neverDeleted` are held — `ont-005-mutants.test.ts`'s pin moves
   down and the three are named in ONT-005 §6 and ONT-013 §6; each flipped claim fails on its mutant on both engines.
   The two new shapes have a claim and a mutant each, graded.
5. **The round trip:** the permissions page's save and the MCP's `set_collection_permissions` keep `moves`,
   `frozen` and `delete: "never"` (ONT-012 AC5's `UNDRAWN_KEYS`), measured red first if it is red.
6. The Fable reach review is filed in §6 with its findings, each measured, before the task closes.

## 6. Built

### 6.1 The rule (s17, `04a51c5eb`; the projection `e06f4259d`; the write `9bc713ada`)

**`security.json`.** `onlyWhile.update` takes `moves` and `frozen` beside `where`/`except`/`says`, and `where` is now
optional when either is said. `onlyWhile.delete` may be `"never"`. A move's `says` is per old value
(`moves.status.withdrawn.says`), because a key `says` beside the values would collide with a value called "says".
`frozen.says` is its own. `update.says` belongs to `where`.

**Who: `by` decided before the write.** `SecurityState.aclFor` → `model.onlyWhileFor(config, collection, principal)`
compiles each move's `by` into `admits`: `true`, `false`, or `{ where }`, the records a path atom reaches. This is
`checkClp`'s decision shape (`ruleAllows` then `ruleNarrowing`). The facade never holds config.

**The condition, still one statement.** `heldWhile(collection, acl, op, fields, values)` builds one clause per rule
(`where`, each moved field, `frozen`, `delete: "never"`) and ANDs them into `only`.
- A **move** is *old ∈ {values whose `to` holds the new one, admitted for this caller} ∪ {the new value itself}*.
  Without `"*"`, it also includes *unlisted ∪ empty*.
- A **frozen** field is *`unless` holds, or the old value is the one written*. With no `unless` and a list of fields
  (set once), *or the old value is empty*, so "written once" allows the first write.
- A Pointer compares by its id.
- Empty is `$exists: false`, because `{ f: null }` matches nothing (bug `P116-S17-NULLEQ`, found here).
- A field named without a value (an increment, a relation) is a change. A moved field named that way can never pass.

**The words.** `whyRefused` asks clause by clause, under the caller's own ACL, which one the row fails. Each clause
rides in `only`, never in `where`: a `by` path in a `where` would meet the INCLUDECLP path walk and be refused. The
409 carries that clause's words, and for a move, the old value's: *"Moving "status" from "draft" to "issued" is not
yours to make."*, *""status" moves from "issued" only to "withdrawn", not to "draft"."*, or the person's own `says`.

**Measured** (`tests/ont-014-old-and-new.test.ts`, 54/54 on SQLite and PostgreSQL over HTTP, locked backend):
- every move in §1, including staying put and the learner withdrawing their own assignment but not another's (the
  path in `by`);
- frozen fields under `unless`, an echo of an unchanged value, and a move plus a frozen field in one write (refused
  whole);
- `$inc` and a relation on frozen invoice fields;
- set once, both filled at create and empty-then-set;
- a sealed envelope never edited and never deleted at DELETE, BYOB DELETE and the batch;
- the doors: upsert, BYOB PUT, MCP `_update` as a bound key, and the batch judging draft → issued → withdrawn → draft
  move by move;
- 404 for a row not yours, and the admin not bound;
- AC5: the permissions save (the page's body, which is also the MCP's) and the revert keep it, and a bad move is a
  400 in words. It was never red: the route keeps `onlyWhile` whole.

Three mutants are caught: moves dropped, values not passed, `by` undecided. ONT-012's spec is 32/32, unchanged.

### 6.2 The projection (AC4)

`setOnce` → `frozen` fields, `neverEdited` → `frozen: "*"`, `neverDeleted` → `delete: "never"`, on
`WorldCollection.onlyWhile`. `WHY` loses its three lines. Each claim is **held** with a mutant (`dropOnlyWhile`):
- set once makes its row WITH a value and writes another;
- never edited writes a different value (the other Boolean, another choice);
- never deleted removes.

**The facade keeps it; the claim carries it as data.** `ClaimCollection.onlyWhile` is passed in a write ACL on the
claim's **`byPerson`** steps only. The spec's proxy (`tests/helpers/facade-deletes.ts`) sends a save with an ACL
through `rawSave`, as it already sent every delete through `rawDelete`. No adapter reads `onlyWhile` (grepped), so a
bare adapter fails the claim.

**Found on the first run:** with every remove bound, "nobody deletes a person" refused the cascade claims' deletes
("when a person goes, their memberships go too"). A cascade is what an admin or a function does. Only the steps a
person makes are bound.

**ONT-005's honesty number** (`retype` drops the rule through `applyMutant`; `differsInWhatIsHeld` counts
`onlyWhile`), identical on both engines:

| world | before | after | fell |
|---|---|---|---|
| world-every-kind | 16 of 38 | **13** | moves-unanswered, merge-by-delete, editable-history |
| world | 14 of 27 | 11 | moves-unanswered, end-by-delete, editable-history |
| world-membership | 8 of 20 | 4 | moves-unanswered, end-by-delete, editable-history (×2) |

every-kind's `end-by-delete` survives (unclaimed).

### 6.3 The write (what makes "held" true in a deployed backend)

The product writes a world only through `POST /admin/world/migrate`, and no step carried `onlyWhile`.
`planMigration` now ends with a **`rules`** step per collection whose `onlyWhile` changed (`keep, for people: account
is set once`; `null` = none).

The contract's executor hands it to `MigrationContext.rules`. A context without that hook fails the step by name
(s11's lesson: an unknown step is never counted done).

The route records the steps during the run and writes them **after** the renamed collections' rules have moved
(written during, the move would overwrite them). It writes in place, and validates the whole result before anything
runs.

**Ownership** (`withWorldRules`): the world owns `update.frozen` and `delete: "never"` on its collections. `where`,
`except`, `moves` and a delete condition are the person's and stay. A `rules` step on a `_` collection is a 400.

Graded through the route on both engines (`ont-007-route.test.ts` 33/33): before / run / back, with a hand rule beside
the world's.

### 6.4 Owed

- ~~**AC3's schema half:**~~ Built s20 (§6.6).
- ~~**AC4's two new `RuleHold` shapes** (`frozen` with `unless`, `moves`)~~ Built s18 with ONT-011 step 2 (its §9):
  `{ frozen, unless?, except?, heldOn?, freeOn? }`, `{ moves, from }`, and `neverDeleted` with `unless`; projected
  to `WorldOnlyWhile`, claimed with a mutant each on both engines, dropped by `applyMutant` and `without: { rule }`.
- ~~**AC6: the reach review (Fable).**~~ Done, §6.5.
- Bug **`P116-S17-NULLEQ`** (medium, runtime), **`P116-S17-CRONLEAK`** (low, tests): filed, not fixed.
- ~~**The cascade**~~ Built s20 (§6.7) after R-i.
- ~~**`was` on a `rules` step** (§6.5 #4)~~ Built s18: `planMigration` writes `was` (the world's previous
  `onlyWhile`) on every `rules` step; `withWorldRules` keeps a clause that differs from `was` (the person's) unless
  the world now says that clause too, which `worldRuleLosses` names for `acceptLosses`. A plan without `was` keeps
  s17's slot rule.

### 6.5 The reach review (s18, 2026-10-11, Fable 5.1) — AC6

**Method.** Every door in ONT-012 §4 was re-read with ONT-014's two questions ("which door lets a hidden detail
out?", "which lets a value move the wrong way?"), then nine probes were written as the behaviour that SHOULD hold
and run on SQLite and PostgreSQL over HTTP on a locked backend (`tests/ont-014-reach-review.test.ts`). Seven were
red on both engines at HEAD `ae7db7dff`. Each is measured, not inferred.

| # | finding | measured at HEAD | now |
|---|---|---|---|
| 1 | **A hidden status in a move's 409.** R-a hides `status` from the learner; their issued → draft PUT answered *""status" moves from "issued" only to "withdrawn"…"* — the value they may not read. And *staying is not a move* was an oracle: PUT `{status: "issued"}` was 200 on an issued row and 409 on a draft. | red ×2 | **fixed** (`persistence/onlyWhile.ts`): for a field the caller may not read, the staying arm is dropped and the words never carry the old value (*""status" cannot move to "issued" from the value it has now."*). Shown-on-some-rows: compared only on the rows the rule reaches. The coach's words are unchanged. |
| 2 | **A hidden frozen field.** `ssn` hidden from the learner and frozen: PUT of the right value 200, of a wrong one 409 — a guess answered. Set once's "still empty" arm answered "is it set yet?" too. | red ×2 | **fixed** (same file): no same-value and no empty arm for a field the caller may not read; a carer who reads it echoes and first-writes it as before. |
| 3 | **A Date frozen field.** `dateOfBirth` as a `Date` column, set once: an echo of the same date was a 409, and the FIRST write of an empty one was a 409 (`isScalar` refused the envelope, so the whole clause fell to NEVER). The same for an Object field's first write. The s17 spec used a `String` column. | red ×2 | **fixed**: `stored()` unwraps a `Date` to its ISO string (what both engines keep and what `QueryBuilder` compares); arms are built per field, so an Object's first write passes on the empty arm. **Known limit, graded:** an Object cannot be compared in one statement on both engines, so its echo is a change (409). |
| 4 | **`withWorldRules` replaces a hand rule in silence.** A person's `frozen: amount unless draft` + `delete: "never"` on a world collection; the world's `rules` step (set once `number`) left `frozen: [number]`, no `amount`, no `never`. Emitted only when the world's answer changes, so the loss comes months later. | red | **half fixed** (`server/admin-world.ts` `worldRuleLosses`): a freeze the world could not have written (`unless` or `says`) is named in the dry run's `why` and a run is 409 until `acceptLosses`, in words. A plain field list and a bare `never` cannot be told from the world's own earlier writing, so the slot stays the world's (§6.3) — telling them apart needs the step to carry `was`. Owed. |
| 5 | **The cascade** (`goes-too` into `delete: "never"`, `stays-unlinked` into a frozen link): a learner's DELETE of a keeper took the sealed envelope and emptied the issued invoice's customer, 200 on both engines. | red ×2 | **filed** `P116-S18-CASCADEHOLD` (high), `it.failing` ×2. **Ruled s20 (R-i): the delete stops**, in the envelope's words. |
| 6 | **A `$path` through the narrowed queried collection** (INCLUDECLP's "not covered"). `Staff` narrowed to the caller's own row by a path rule; `where: { $path: { from: Staff where band C, follow manager } }` returned her row — "someone in band C reports to you" — and so did the repeated hop. A plain `where: { band: "C" }` returned nothing (control). | red ×2 | **fixed** (`persistence/fieldRules.ts`): a `from` or hop landing on the collection being read is refused (403, `collection-rule`) when the caller's reach on it is narrowed; open collections are unchanged. |
| 7 | **A dotted filter / accessor through a link** on a hidden (`author.email`) or closed (`salary.amount`, a `$max` of it) target field. | **green** ×2: nothing returned, nothing summed (DOTTEDFILTER's defect is the guard here) | graded, so a future dotted filter cannot open it unnoticed. |
| 8 | **The ACL of a never-edited record** (`frozen: "*"`): a bound writer rewrote a sealed envelope's ACL — 200 on both engines. `ACL` is bookkeeping, never frozen. | measured | **ruled s20 (R-j): yes** — "never edited" covers the record's details, not its sharing; the 200 stands. |

Also read, no finding: the relation-only PUT (held with the plain fields' values), the batch (per operation, with its
collection), BYOB PUT (the route gate names the collection), the upsert (a hidden unique field is a 403 before
anything is written), the increment echo (stripped), realtime (system collections refused at subscribe, a hidden
field stripped per frame, a partial one refused), the create echo (id and date only), the `unique` 409 (ONT-012 §7,
recorded). **Verbs that move a status** (ONT-014 §3.2 #4): 1 `update` verb across the two world fixtures, 0 that
set a status; a verb's claim writes as the store's key (not `byPerson`), as designed.

**Measured after the fixes:** `ont-014-reach-review` 26/26 (two `it.failing` for the bug) on both engines; the
neighbour band is in the s18 handoff.

**Not fixed here, and why:** #5 needs a ruling and a shape change in the contract; #4's `was` is a planner change
(project-contract `migrate.ts` + the contract's `MigrationRulesBody`) and belongs with the Opus build of AC3's
schema half; #8 is a ruling.

### 6.6 AC3's schema half (s20, 2026-10-11, Opus 5.5)

`validateSecurityConfig` stays schema-less: `security.json` is loaded at start, before any table exists (the ONT-014
spec itself writes it first). The schema half is a second function, `onlyWhileSchemaProblems(collections, tableOf)`
in `security/model.ts`, called where a rule is written with the schema at hand:

- **The permissions PUT**, both doors (`PUT /admin/permissions`, `PUT /admin/permissions/collections/:name`), after
  the validator passes, against `schemaManager.getTableSchema` — a 400 in words, nothing saved.
- **The world migration** (`POST /admin/world/migrate`), against the schema **the plan leaves**:
  `tablesAfterPlan(steps, tableOf)` (`server/admin-world.ts`) overlays the plan's `createTable` (create-if-absent, as
  the route is), `addColumn`, `renameColumn`, `dropColumn`, `renameTable`, `deleteTable` and `setChecks` on today's
  declared columns and checks. Named in the dry run's `why`; a run is 409 before the backup.

What it refuses: a `moves` field whose declared column is not `String` (*""priority" is a Number; only a choice or
text has values that move"*; a Number with a `oneOf` is *"a choice of numbers"* — `to` is a list of words); where
the field is a choice (a `{ field, oneOf }` check), an old value it never has (*""status" is never "draft" — its
choices are …"*) and a `to` it cannot hold (*"… names "reopened", which "status" cannot hold — its choices are …"*).
`"*"` is always allowed.

**Only what the schema declares is refused.** A table made by first use records `columns: []`, and a column can hold
data while missing from `_Schema` (`LocalSQLAdapter._columnScope`'s note), so an undeclared field or collection
passes. For the same reason a `frozen` or `except` field name is not checked against the schema: a typo there and
a column the schema has not recorded look the same.

Graded: `ont-014-old-and-new.test.ts` — 7 unit cases (the refusals in words, the controls, `tablesAfterPlan`) and,
on SQLite and PostgreSQL over HTTP, both permission doors (three refusals, the whole-document write, nothing saved,
three controls) with a mutant (`onlyWhileSchemaProblems` spied to `[]`: the bad move is saved, caught);
`ont-007-route.test.ts` — a hand plan making `Ticket` with a two-value choice and a move to `"reopened"`: the dry
run says it, the run is 409 and `Ticket` is not made; the choice's own values run and the move is in force. With
the route's check disabled the case is red on both engines (measured). 67/67 and 35/35; the neighbour band 230/230.

**Not built:** the reverse door. A schema change after the rule (a value taken out of the choice, a column's type
changed) does not re-read the moves. A move to a value the choice no longer has is refused by the check anyway; the
rule goes stale, it does not open.

### 6.7 The cascade (s20, 2026-10-11, Opus 5.5) — bug `P116-S18-CASCADEHOLD`, R-i

**R-i (Richard): the delete stops.** `StorageAclOption.onlyWhile` is per collection now; `aclFor` fills every
collection with a rule for a bound writer; `heldWhile` reads `acl.onlyWhile[collection]`. `deleteKeepingLinks` asks
`DeleteContext.held(plan)` after planning and before anything goes; the facade answers with `heldCascade`: a row that
goes is judged by its collection's `delete`, a link it would empty by `update` of that field to nothing — the
condition only, counted as the store's key, since the cascade itself runs as that key (R10). A refusal is a 409 in
the clause's words, naming the reached collection (*"This "Envelope" record is never deleted. Nothing was
changed."*); nothing is deleted. The hook asks only once the caller may delete their own record, so a stranger gets
the delete's own 404, never a 409 that tells them what links to it. The admin and functions are not bound.

Graded (`ont-014-reach-review.test.ts`, both engines): 5a (goes-too into never deleted; the admin's delete still
takes it), 5b (stays-unlinked into a frozen link on an issued invoice; a draft's link still emptied), 5c (the
stranger) — 5a/5b red with the hook disabled, 5c red with the own-record check removed. A mutant spec in
`ont-014-old-and-new.test.ts` that stripped `moves` from the old one-collection shape had stopped mutating and
said so (red); it reads the new shape. **R-j:** case 8 asserts the ACL rewrite goes through.

**Not built:** refusing the contradiction at authoring — a world that says both "goes when its keeper goes" and
"never deleted" (the vocabulary could ask it; the backend now keeps the second).

## 7. Not this task

- **Who may change a field** outside a move (a per-field `update` rule). Still unruled (ONT-012 §7).
- **A move that must run something** (issuing sends the brief). That is a verb (ONT-006); the move rule only says
  the move is allowed. A verb that moves a status runs as admin and is counted by the review, not bound.
- **The series** (ONT-015). A frozen number is this task's; a handed-out number is that one's.
- **History of moves** (who moved it when). ONT-011's "keep who changed what" fact, step 2's.
- **Across records** ("at most twenty"). ONT-013 step 4 measures it first.

## 8. Watch for

- **A catch-all turns a 409 into a 404 or a 400** (ONT-012 §6.2, twice). Grade each door by its status *and* its
  `says`, never by "the write did not happen".
- **Setting a field to its current value** must not count as a move, or every PUT that echoes the whole record is
  refused. The spec has that case.
- **The old record under the caller's ACL, not the master's.** `whyRefused()`'s two counts run as the caller; a
  move judged on a master-read old record leaks a value the caller may not see.
- **Grade through the facade, never the raw adapter** (s12's trap). The Proxy adapter in
  `tests/helpers/facade-deletes.ts` is the pattern.
- **A gate with a hole shaped like the defect:** a spec that proves "issued → draft refused" and never tries
  "issued → issued with a frozen field changed" has not tested `frozen`.
