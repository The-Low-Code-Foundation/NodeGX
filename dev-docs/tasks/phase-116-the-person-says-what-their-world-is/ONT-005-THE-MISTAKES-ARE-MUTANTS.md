# ONT-005 — The mistakes are mutants

**Opened 2026-10-08.** **Depends on ONT-003.** **Status: 🟡 s5 — built 2026-10-09 (Fable 5.1); §6. R10 (s12): 16 of 38 survive on the fully answered world (§6.3). ONT-014 (s17): 13 of 38 — set once, never edited and never deleted are held (ONT-014 §6.2).**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1** — the judgement task of the phase: a mutant the claims already kill is not a mutant, and the survivors are the vocabulary's honesty number. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **The mistakes everyone makes the first time they build a database are written down as things the system tries to
> get away with, and a test proves that what I said stops each one.**

## 2. Why

Richard: *"category and subcategory … naturally it should just be a text field … relating subcategories to categories,
creating filtering and indexing etc is going to be a nightmare."* P107's runner patches an implementation and checks
the suite notices. The same move here: a classic mistake is a patch to the right projection, and it survives exactly
when the person was never asked the question that rules it out. A surviving mutant is the runner's reason to ask
(ONT-002). This is the piece that joins the two ideas.

## 3. What to build

1. **The list.** From ONT-000 step 5 (Richard's Bubble list) and the corpus: free text where a fixed list belongs;
   a fixed list where an open one belongs (tags as a Choice); a Link where a Links with a date belongs (one account,
   no history); a Links where a junction with properties belongs; no end date on a thing that ends; a hard delete on a
   thing whose history must stay; an external id stored nowhere; a name used as an identity; a path answered by
   copying the far value into the near row; a number stored as text. Each with the kind it is a mutant of and the
   question that kills it.
2. **The mutant generator.** For each kind, `mutants(answers) → Projection[]`: the projections a kind would produce if
   one answer were missing or wrong. Declared per kind, like `equivalent-mutants.ts` declares P107's.
3. **The grade.** For a fixture ontology with full answers, every mutant fails at least one claim (ONT-003) on both
   adapters. For the same ontology with one answer removed, the mutant that answer kills survives, and the runner
   (ONT-002) returns that answer's question.
4. **The honesty number.** Survivors on a fully answered fixture are the vocabulary's unseen mutants; counted and
   printed, never hidden, as NSP-005's reach number is.

## 4. Acceptance criteria

1. Every mutant on the list is killed on the fully answered fixture, or it is named in the survivors count with the
   question that would kill it added to its kind.
2. Removing any one answer from the fixture makes exactly its mutant survive, and the runner names that question.
3. The category/subcategory example from Richard's message is a fixture: with "a subcategory belongs to exactly one
   category, from a fixed list" unanswered, the free-text mutant survives; answered, it dies.

## 5. Watch for

- **A gate can have a hole shaped like the defect** (memory). A mutant that passes because the fixture has no rows that
  exercise it is a green gate pinning the mistake. Each mutant's fixture carries the row that breaks it.
- **Elimination over an unchecked list** (memory). The list is from the corpus and Richard; it is not complete, and
  ONT-000's census says what it was read from.

## 6. Built

**s5, 2026-10-09, Fable 5.1.** Every mistake on the list is executable, graded on SQLite and PostgreSQL, and the
survivors are counted and pinned. The measured numbers are in §6.3; the decisions the task left open in §6.4.

### 6.1 The frame

A mutant is **the schema a kind would have produced if one answer had been missing or wrong**, and it is killed when
one of the right schema's held claims (ONT-003) fails on it — what the person said stops the mistake. That is P107's
move (patch the implementation, see whether the suite notices) with two things swapped: the implementation is the
projection, and the suite is generated from the person's own sentences. Three consequences were measured rather
than argued:

- **A question is a mutant.** For every relation, every question of its kind whose answer changes the schema is a
  mutant (`<relation>/<question>-unanswered`). Answered, it is the schema without that answer; unanswered, it is the
  schema itself — a survivor by construction, and exactly what the runner (ONT-002) must ask. `questionsToAsk()` is
  that list, ranked in the kind's order. A question no answer changes (`counts`, `whoElse`, `whatStays`) is **inert**:
  listed for the record, never claimed to be graded.
- **A change of kind is killed before any projection.** `several: true` on a belongs-to, `needsDetails: true` on a
  one-of, `whoAdds: the people using it` (new, §6.4): the validator refuses the answer in words, and no claim in the
  data plane could — the mistake's collections are not the right ones. Graded statically, with the validator's sentence.
- **A claim with no home is a kill the engine must never measure.** Both engines auto-create a collection, and a
  column, on first write. A claim run against a mutant that lacks its collection would pass through a phantom table
  with no index — a gate with a hole shaped like the defect. So `gradeStatically()` checks every held claim's
  collections and fields against the mutant first; a missing one is **killed (no home)**, attributed to the mutant's
  own relation's claim, and not run.

### 6.2 What it is

| piece | where | what it does |
|---|---|---|
| the shapes | `nodegx-project-contract/world/kind.ts` `MutantShape` | eight ways a mistake is made: a question `unanswered`; the relation `asKind` a neighbour (the wrong tile); `unsaid`; `asText` (every link the relation made kept as a text id, required and all else kept); a `property` re-typed; `without` a field or a rule; an extension `foldedIn`; a `changesKind`. Every seed on a kind now carries `kills` (the question id, or `the kind`) and a `shape`; `defineKind` refuses a seed killed by, or shaped on, a question the kind does not ask |
| the seeds | `world/kinds.ts` | the 19 seeds made executable, and four more `from: 'task'` for the §3.1 mistakes no seed named: `is-on/link-column` (one account, no history), `is-on/no-end`, `one-of/open-list-as-choice` (tags as a Choice), `exists-elsewhere/id-nowhere`. The oral count per kind is unchanged (pinned to `kinds.hand.json`) |
| the generator | `world/mutants.ts` `worldMutants(files)` | the right schema, every mutant (per question, per seed, and a property stored as text per `number`/`date`/`yesno`/`choice`), and the inert questions. A world-level shape re-says the relation and projects it (the validator still gates it); a schema-level shape re-types the projected schema. A seed whose question this world answered the other way is **not applicable**, said so, never hidden as "cannot" |
| the static grade | `gradeStatically(right, mutant)` | killed by the question · killed, no home · survives as `unanswered` / `unkept` (a rule said in the description that no engine keeps) / `unclaimed` (a shape rule, or a field no claim exercises) · or `run`: the held claims the engine is handed, and what the mutant survives as if every one passes |
| the runner's list | `questionsToAsk(files)` | the `unanswered` survivors with the question in the person's nouns and why it matters (changes the kind / changes the schema) |
| the grade | `nodegx-backend/tests/ont-005-mutants.test.ts` | per world and engine: the static verdicts as they are, the rest run through `runClaim` against the mutant schema (one adapter, one conformance run, a case per mutant × claim that records where the claim stopped). A kill names the claim, the step and whether that step says the rule. The honesty number is printed per world and engine, and the survivors are **pinned** (`SURVIVORS`): a mutant killed that the pin says survives, or the reverse, is red. The two engines must agree on every verdict |
| the fixtures | `tests/fixtures/world-categories`, `world-categories-unanswered` | Richard's category and subcategory (AC3): answered — a subcategory's `category` is one of books, music, film (a one-of), a product sits on one subcategory (a belongs-to, required); unanswered — *"naturally it should just be a text field"*: product with `category` and `subcategory` as text and nothing said. Both are in ONT-003's golden and two-engine claim suites too. `world-every-kind` gained a slot and a **booking** (an is-on with `sameTime: false`), so Richard's appointment row executes rather than reading as not applicable; and it now answers `sameTime` and `path`, which it had never answered (the generator said so) |
| the spec before any engine | `tests/mutants.test.ts` | every seed executable on the every-kind world; determinism; every mutant a change of kind, a difference, or a named survivor; the no-home kills and their attribution; AC2's static half on four worlds; AC3's two halves |

### 6.3 What it measured

`tests/ont-005-mutants.test.ts`, 2026-10-09, SQLite (node:sqlite) and PostgreSQL 16 — **identical verdicts on both
engines, every mutant**:

| world | mutants | killed | by a claim (at the rule's step) | no home | by the question | survive | unanswered | unkept | unclaimed | n/a |
|---|---|---|---|---|---|---|---|---|---|---|
| `world` (ONT-001's) | 27 | 11 | 4 (3) | 4 | 3 | 16 | 5 | 5 | 6 | 0 |
| `world-every-kind` (fully answered) | 38 | 18 | 6 (6) | 8 | 4 | **18** | 0 | 9 | 9 | 2 |
| `world-membership` | 20 | 8 | 2 (2) | 4 | 2 | 10 | 0 | 5 | 5 | 2 |
| `world-categories` (AC3) | 10 | 6 | 3 (3) | 0 | 3 | 4 | 0 | 2 | 2 | 0 |

> **R10, 2026-10-09 (P116 s12, ONT-003 §6.6): now 16 of 38** (8 unkept, 8 unclaimed), identical on both engines.
>
> **ONT-014, 2026-10-11 (P116 s17): now 13 of 38** (5 unkept, 8 unclaimed). `moves-unanswered`, `merge-by-delete` and
> `editable-history` fall at the claim that says the rule; ONT-014 §6.2 has the three worlds.
> A link's "when it goes" rule is kept by the backend at delete time, so in every world two fell: the link with that
> question unanswered (`account-company`/`product-subcategory` `whenTargetGoes-unanswered`, unkept) and the link stored
> as text (`…/id-as-text`, unclaimed — it loses the rule, and the held `…-blocks` claim kills it). world 16 → 14,
> membership 10 → 8, categories 4 → 2. The text id beside a kind (`note-about`) still survives, as it must. The table
> above and the paragraphs below are s5's reading.

**The honesty number on the fully answered world is 18 of 38.** Read by class, because the classes say different things:

- **9 unkept by the engine** — the person said it, the projection wrote it into the collection's description, and no
  engine behind the contract keeps it: what happens when a link's target goes (`whenTargetGoes`, twice), a link set
  once (`moves`), a retired choice value (`retires`), a tree that must not loop (`ownAncestor`), a merge or an ending
  that must never delete (`undo`, `whatStays`'s cousin), a log nobody may edit (`forever`), the owner rule
  (`whoElse`), the sync log (`hereFirst`). Every one is a measured not-held claim from ONT-003 (`P116-ONT-003-links`
  and BMG-006's permissions). The vocabulary asked the question; the store cannot yet hold the answer.
- **9 unclaimed** — the mutant differs in something no claim exercises. Four are the **text-id mistakes**:
  `belongs-to/id-as-text` (the whole in-repo corpus) and `by-name/the-text-itself` survive because a Link is a text id
  with no foreign key on both engines, and the claim vocabulary has no read-through step (`include` lives in the wire
  facade, §6.4); `who-unanswered` (an optional `doneBy` link) and `end-by-delete` (an optional `endedAt`) are plain
  fields no rule uses; `filter-field-split-off` and `sort-key-copied` break a shape rule only the diff can read; and
  three **properties stored as text** (a date twice, a yes/no) — the vocabulary has no property questions and the
  engines accept a word in a Date, Number or Boolean column (probed on SQLite: a dangling Pointer, `'twelve'` in a
  Number, `'yesterday'` in a Date, `'maybe'` in a Boolean, an undeclared field and an undeclared collection are all
  accepted).
- **0 unanswered** — the fully answered world has nothing left to ask; `world` has five, and `questionsToAsk()` names
  them in the person's nouns (*"Can two persons be on the same account at the same time?"*).

**What was killed, and by what** (the every-kind world; `world` and `world-membership` agree where they overlap):

| mutant | seed | killed by |
|---|---|---|
| `membership/several-unanswered` | — | `membership/person-is-unique`, at the rule's step (a second open membership for one person was taken) |
| `booking/sameTime-unanswered` | **no-slot-rule** (Richard's appointment row) | `booking/slot-is-unique`, at the rule's step: two people landed on one slot |
| `membership/startsEnds-unanswered` | **no-end** | no home: the one-at-a-time rule's closed-row control writes `until`, which the mutant lacks |
| `membership/links-column`, `/link-column`; `booking/…`; `employment/…` | links-column, link-column | no home: *"a membership cannot exist without its person"* has no record to live on |
| `session-tags/pair-twice` | pair-twice | `session-tags/paired-once`, at the rule's step: the list held the pair twice |
| `plan-size/free-text`; `account/plan-as-text` | free-text | `account/plan-is-one-of-its-list`, at the rule's step: `not small or medium or large` was taken |
| `account-company/required-unanswered` | — | `account/company-is-required`, at the rule's step |
| `attended/outlives-unanswered` | — | `attended/at-is-required`, at a **row-making** step: the mutant demands a person the right schema said an attendance can outlive — the only kill of the forty not at a rule's step, and the control row is the rule |
| `person-profile/piled-in` | piled-in | no home: *"a profile cannot exist without its person"* |
| `on-the-course-platform/id-nowhere` | id-nowhere | no home: `onTheCoursePlatformId` (`idElsewhere` until s13) is unique, and gone |
| `note-about/id-without-kind` | id-without-kind | no home: `pointsAtKind` is required, and gone (attributed to this relation's claim, not the owner's) |
| `account-company/one-that-was-several`, `plan-size/category-as-text`, `plan-size/open-list-as-choice`, `session-speakers/dozens-on-the-parent` | the four `changesKind` seeds | the question: *"then it is a is-on, not a belongs-to"* — the validator's sentence |

**AC3, Richard's example:** on `world-categories`, `subcategory-category/free-text` is killed by
`subcategory/category-is-one-of-its-list` at step 1, the rule, on both engines (*"a subcategory's category is one of
books, music, film, and nothing else"*). On `world-categories-unanswered` — *"naturally it should just be a text
field"* — no claim names `category` or `subcategory`, the only mutant is `price` as text, and `questionsToAsk()` is
empty: nothing was said, so nothing stops it, and the question that would is the kind-picker, ONT-002's.

**Neighbours:** §6.5.

### 6.4 Decisions this session made

| left open | decided | why |
|---|---|---|
| `mutants(answers) → Projection[]` (§3.2) | **a mutant is a schema, made two ways**: a world re-said (a question unanswered, the wrong tile, the relation unsaid, an extension folded in) and projected through the one projection function, or the right schema re-typed at one point (a link as text, a property as text, a field or rule taken out) | a second projection per kind would drift from the first; re-saying the world reuses the validator and the projection, and the mistake is literally what the person would have said wrongly. The type cases cannot be said in the format (a property cannot be required; a text id is not a relation), so those are schema edits, like `applyMutant` |
| what grades a mutant | **the right schema's held claims only**; not-held claims are the engine's known gaps and fail on the control too | a kill must be a step that passed on the right schema and failed on the mutant; a claim already failing on the control attributes nothing |
| a kill while making rows | **counted as a kill**, with `atTheRule` reported | every held claim passes every step on the right schema (ONT-003 measured it), so any failure on the mutant is the mutation's. The one-at-a-time rule's closed-row control is the example: a mutant that forgot `until` fails there, and that is the rule |
| the claim with no collection or field on the mutant | **killed statically, never run** (§6.1) | both engines auto-create on first write |
| `together/twice` unanswered | **not a mutant** (inert): a Links field keeps a pair once whether or not the person said so | a mutant that takes nothing out grades nothing — the seed `pair-twice` is a list where a Links belongs (`asKind: many-by-list`), which the pair-once claim kills |
| `one-of/whoAdds: 'the people using it'` | **changes the kind** to `belongs-to` (added) | §3.1's "a fixed list where an open one belongs (tags as a Choice)": a list the people add to is a thing of its own with records; before this the kind projected a Choice whatever the answer, so the mistake was the projection itself and nothing could kill it |
| `extends/filter-field-split-off`, `sort-key-copied` | **unclaimed, by construction**: the rule they break is a `shape` rule, and a claim cannot see a field that was never said | said in the survivors; the diff (ONT-007) and the path (ONT-004) are what read them |
| `is-on/no-slot-rule` on a world that answered `sameTime: true` | **not applicable**, reported as such | the mistake is the other answer; calling it "cannot" would hide that the world simply said something else |
| the property mutants (a number, a date, a yes/no as text) | generated and graded, **no new claim** | the vocabulary has no property questions; the tile is the only thing said. Whether an engine refuses a word in a Number column is measured (§6.3), not assumed |
| a `follow` step ("a link can be followed to its record") to kill the text-id mistakes | **not this session** | `include` is expanded by the backend's wire facade (`parse-wire.ts`), not the adapter data plane the conformance context exposes; a read-through step is a contract decision, recorded for ONT-002/ONT-008 |
| AC1's "the question that would kill it added to its kind" for a survivor with no question | **said in the survivors as the engine's or the tile's**, not invented as a question | id-as-text is killed by nothing a person can answer: a Link is a text id on both engines (`P116-ONT-003-links`) |

### 6.5 The acceptance criteria

1. ✅ **Every mutant is killed on the fully answered fixture, or named in the survivors with what would kill it.**
   `ont-005-mutants.test.ts` AC1 on both engines: the survivors of each world are pinned by id and class
   (`SURVIVORS`), each with the question, the kind or the tile that kills it, and the printout names the killer of
   every kill. What was *added to the kind* for a survivor: `one-of/whoAdds` now changes the kind (tags as a Choice
   had no killer at all); for the engine's nine the question already exists and the store is what is missing
   (`P116-ONT-003-links`, BMG-006), said in the pin rather than invented as a question.
2. ✅ **Removing any one answer makes exactly its mutant survive, and the runner names that question.** The static
   half, `tests/mutants.test.ts`, on four worlds and every answered question that changes the schema (not the inert
   ones, which are listed as such): `questionsToAsk(world − answer) = questionsToAsk(world) + {that question}`,
   exactly. The engine half on `world-categories`: with `required` unanswered the one mutant that survives as
   `unanswered` is `product-subcategory/required-unanswered`, and the free-text mutant still dies.
3. ✅ **The category/subcategory example is a fixture.** §6.3: answered, the free-text mutant dies at the step that
   says the list on SQLite and PostgreSQL; unanswered, nothing names it and nothing stops it.

**Neighbours run, green:** `nodegx-backend` `ont-003-claims` (now five worlds, both engines: 19/34/26/3/0 claims,
each held one failing on its mutant), `ont-003-write`, `ont-004-world`, `ont-004-rule`, `brg-003-conformance-sqlite`,
`brg-003-conformance-mutants`, `admin-app/ont-003-card` — 80/80; `@nodegx/project-contract` 95/95 (the AC2 engine-name
gate caught my own docblock naming the two engines inside the world module, and was right); `@noodl/backend-contract`
199/199; `ontology-census:check` green. `typecheck:backend-tests` adds no error (still red at HEAD on the ISL-010
spec, `P116-ONT-003-tsc`).

### 6.6 Found, for other tasks

- **ONT-002:** `questionsToAsk(files)` is the runner's input — the unanswered survivors in the kind's order, each with
  its words in the person's nouns and whether the answer changes the kind or the schema. The inert list (a question no
  answer changes: `counts`, `whoElse`, `whatStays`, `hereFirst`) is the set the runner asks *for the record*, and it
  should say so when asking. The kind-picker ("is `category` one of a fixed list?") is the one question no relation
  can carry; AC3's unanswered half shows the vocabulary silent until it is asked.
- **The text-id mistakes need a read-through step.** `id-as-text` and `the-text-itself` survive on both engines
  because nothing in the data plane tells a Pointer from its id as text. A claim step `follow` (fetch with the link
  included, expect the record) would kill both — but `include` is the wire facade's (`parse-wire.ts`), not the
  adapter's, and the conformance context exposes the adapter. Either the context grows a wire read, or the contract
  gains a foreign key (`P116-ONT-003-links` is the same decision from the other side). A ruling, not a session.
- **A "carries" claim per optional relation field** (`since`, `until`, `doneBy`, `endedAt`) would turn four
  `unclaimed` survivors into no-home kills — but a held claim needs a mutant the ONT-003 suite can grade, and a
  dropped column is auto-created on first write, so that claim would "grade nothing" there. It needs a schema-level
  check (the column is declared) rather than a data-plane step.
- **The engines accept anything the column does not literally refuse** (probed on SQLite, §6.3): a dangling Pointer,
  a word in a Number, Date or Boolean column, an undeclared field, an undeclared collection, a bare id in a Pointer.
  `autoCreateTables` is by design (Parse's shape); it is also why no-home kills are static. Not filed as a bug; a
  backend that refuses an undeclared write would be a declared capability (BRG-003's cells), and ONT-008's manager
  should show the person which it is.
- **ONT-007:** `filter-field-split-off` and `sort-key-copied` are shape rules only a diff can read — the first two
  mutants the diff task should kill.
- **ONT-008:** the honesty number per world is the number the data manager should show beside the schema: "18 of 38
  mistakes are stopped by what you said; 9 the database cannot keep yet; 9 nothing checks".
