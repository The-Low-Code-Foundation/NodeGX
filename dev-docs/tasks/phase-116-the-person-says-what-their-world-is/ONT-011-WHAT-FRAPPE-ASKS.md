# ONT-011 — What Frappe asks

**Opened 2026-10-10**, from Richard's question of how NodeGX compares with the Frappe Framework, and his answer
*"let's borrow 1 to 4"*. **Depends on ONT-001** (the kinds), **ONT-003** (the projection), **ONT-005** (the mutants);
**feeds ONT-008** (the view hints). **Status: 🟡 step 1 ✅ (P116 s15, 2026-10-10, Opus 5.5): the detectors are in
`census.js`, every candidate in all 8 sources is classified by meaning, and all four borrows keep rows (§3.5). AC1 ✅.
**Step 2's *settled* half ✅ (s18, 2026-10-11, Fable 5.1, §9): the fifteenth kind, its five questions, its projection onto ONT-014's two new holds, four mutants all killed, 8 rows over 4 sources. Step 2's other three borrows ✅ (s19, 2026-10-11, Fable 5.1, §10): the noun's eight questions (`noun.ts`), `secret` and `onlyWhen` on a property, the `ends` kind's two questions, each projected and graded.** **Step 4 ✅ (s20, 2026-10-11, Opus 5.5, §11): a secret detail is a per-field read rule written by the migration route and claimed as a person; AC3 ✅ (Nightbook's `Profile`).** Step 3's remaining mutants are §10's; step 5 (the view hints) is owed. R-a, R-b and R-c ruled s16 (§6); step 4's two targets are built in ONT-012 (`fields.<f>.read`, `onlyWhile`).** §3.1–§3.4 were read by hand before the
census; §3.5 is what the census counted.

> **Model check, before anything (Richard, 2026-10-08 rule):** steps 2 and 4 want **Fable 5.1**. They change the
> vocabulary's shape: a new kind, and facts about a noun where until now there were only relations. Steps 1, 3 and 5
> want **Opus 5.5**: detectors, fixtures and view hints of a fixed shape. Your system prompt says which model you are.
> If it is not the one named for the step you are on, say so in one line before any work and wait for Richard's word.

## 1. The person sentences

> **Secret details:** "Some details on a record are not for everyone who can see the record, and the system asked me
> which ones before anyone could read them."

> **Settled:** "Once something is agreed, it stays as it was agreed. To change it I withdraw it or make a new one
> that says which one it replaces, and the old one is still there."

> **Facts about a thing:** "The system asked whether there is only one of something, whether people read its number
> aloud, what I call one in a list, and whether I need to know who changed what."

> **Only sometimes:** "A detail that only matters in some cases is asked for in those cases, and never left empty when
> it mattered."

## 2. Why

Frappe declares every kind of record as a DocType: its fields, its links, who may do what, and a handful of facts
about the thing itself. Frappe then generates the form, the list, the API and the rules from that declaration. Four
of those facts are things this phase's vocabulary does not yet ask about, and each one prevents a mistake the corpus
shows:

| Frappe calls it | what it does | the gap here |
|---|---|---|
| **perm levels** | a group of fields gets its own read and write rules, separate from the record's | the rules are per collection and per operation, plus `creatorOwns` (`SchemaManager.ts:132-133`); nothing says one field is secret |
| **submittable** (`docstatus` draft / submitted / cancelled; *amend*) | a submitted record is frozen; a change is a cancel plus a new copy linked to the old one | `ends` keeps a record that stopped; `happened-to` is an event that was never editable; nothing says "editable, then frozen" |
| **Single**, **naming series**, **title field**, **track changes** | facts about the noun, not about a relation | KINDS.md is relations only; a noun carries `signsIn` and `was` and nothing else of the kind |
| **depends_on**, **mandatory_depends_on** | a field shows, or is required, only when another field has a value | no question asks it, and no projection carries it |

**Frappe gave the idea. The rows are the warrant.** ONT-000's rule stands: a kind enters `kinds.hand.json` only with
a row read off an app, and `scripts/ontology/census.js` refuses one with none. `world.test.ts` pins `kinds.ts` to
`kinds.hand.json` and `kinds.json`, so a kind added to the hand file without its declaration turns that test red. A
question's `from` stays `census`, `note` or `oral`. "Frappe" is not a source.

## 3. What the in-repo corpus already shows

Measured 2026-10-10. The rows were read from the files, not run. The private sources (acme, tirion, sentinel) were
**not read**: their paths are not kept in the repo. Step 1 runs the detectors over them.

### 3.1 Secret details

| row | evidence | reading |
|---|---|---|
| nightbook `Profile.codeV`, `answerV`, `rescueV` | `templates/nightbook/nodegx.security.json:25` (`find`/`get`: `public`); written by `__cloud__/saveProfile`; checked in `Pages/Me` and `Pages/Forgot` | Salted PBKDF2 verifiers of the code, the secret answer and the rescue code sit on a record anyone can read. **Already known and deliberate:** TPL-011 says *"verifiers are readable on the tablet"* until V1-8, on a backend that listens only on 127.0.0.1 (`TPL-011-THE-EVENING-JOURNAL.md:311`). It is the clearest row because it shows the shape: the rest of the profile may be read, and three fields must not be. |
| members-area `Member.unsubscribeToken` | `templates/members-area/nodegx.security.json:51` (`role:admin`); read by `__cloud__/unsubscribe/nodes.json:71` | Every admin who can list members can read every member's unsubscribe token. Low risk. Same shape. |
| lessons `CoachNote.visibility` | `templates/digital-bricks-training/backend/schema.json:225`; `tools/check-read-functions.mjs:345` (`'internal'`) | **A neighbour, not this row.** The whole note is hidden from the learner by a value on it, and the read functions enforce that because the collection is `nobody`. It is a rule on a value, not on a field. Step 2 decides where it goes. |

### 3.2 Settled

| row | evidence | reading |
|---|---|---|
| lessons `Assignment.status` | `schema.json:112`; values `draft` / `issued` / `withdrawn` (`tools/check-timeline-port.mjs:125-128`, `tools/build-seed.mjs:485`) | Frappe's draft / submitted / cancelled, under other words. |
| lessons `LessonDraft.publishedVersion` | `schema.json:789` | A draft beside the version that was published. |
| lessons `ArtifactSubmission.attempt`, `AssignmentSubmission.attempt` | `schema.json:22`, `:147`; unique on (learner, concept, section, attempt) | A new attempt is a new record, and the old one stays. That is amend by a new record. |
| planning `MoneyMark.sentOn`, `doneOn`, `lostOn` | `templates/planning/nodegx.security.json:55`; `Week/Project editor` | A bill that is sent, then paid or lost. Whether its amount may change after `sentOn` is the unasked question. |
| nightbook `Envelope.sealed` | `templates/nightbook/nodegx.security.json:45`; `__cloud__/sealEnvelope` refuses a day that is not still to come | Sealed until a day. A lock with a date on it. |

**Not a row:** lessons `PathStep.status = 'locked'` means *not yet available*, not *frozen*. A detector that matches
the word will catch it. Classify by meaning.

### 3.3 Facts about a thing

| fact | rows | reading |
|---|---|---|
| **there is only one** | planning `Settings` (`nodegx.security.json:75`); members-area `Association` (`:15`, one association per app) | A collection that is meant to hold one record. Neighbour: lessons `Cohort.isDefault` (`schema.json:326`), one of many marked as the default. |
| **people read its number aloud** | lessons `attempt` (`:22`, `:147`), a number counted per learner and concept; `LearnerDeliverable.slug` (`:546`), a name people type | No invoice-style number in the in-repo corpus. The private sources are the likelier place. |
| **what you call one in a list** | 13 of 26 lessons tables have a `title`, `name`, `label`, `displayName`, `subject` or `resourceLabel` | The other 13 are mostly links between two things and events (`DeliverableConcept`, `Progress`, `Signal`, …), which are called by their ends. That answer belongs in the question. |
| **who changed what** | lessons `LessonDraft.updatedByEmail` (`:797`), `CoachNote.editedAt`; `Lesson.conceptVersion` (`:717`) records which version a lesson was built from; todo-list `Event` is a history kept on purpose (`happened-to`) | The corpus keeps the last person to touch a record, not what they changed. That is the mutant. |

### 3.4 Only sometimes

| row | evidence | reading |
|---|---|---|
| todo-list `Task.closingNote` beside `closedAt` | `templates/todo-list/nodegx.security.json:15`; `Projects/Save next move` | A note that matters only once the task is closed. |
| todo-list `Routine.stopNote` beside `stoppedAt` | `:45`; `Logic/Selected routine` | The same shape, for a routine that stops. |
| planning `Project.moveWorth`, `moveWhen`, `moveDue`, `moveStop` beside `move` | `templates/planning/nodegx.security.json:15`; `Week/Project card` | Four details that matter only when the project has a next move. |
| lessons `AssignmentSubmission.linkUrl` | `schema.json:159`; the assignment's `submissionModes` (`:100`) | **Corrected s15:** not *required* when the modes include `link` — *allowed only* then. The lessons app refuses a link the brief does not ask for (its assignments service: `linkUrl !== "" && !modes.includes("link")` → refused). Still a case decided on another record. |
| lessons `SessionPrep.resourceUrl` / `resourceStorageKey` | `schema.json:1095`, `:1099` | One or the other, never both. |
| lessons `CoachingSession.cancelledAt` with no reason field | `schema.json:287` | The unasked question: *does a cancellation need a reason?* It pairs with `ends`. |

### 3.5 What the census counted (step 1, 2026-10-10)

`npm run ontology-census` with the private paths read 1,322 (collection, field) pairs over the 8 sources (`KINDS.md`,
"What Frappe asks", has the reach per source and every in-repo candidate with its verdict). 17 detectors and 3 hand
rows gave 141 candidates, each judged **yes**, **no** (the word matched, the meaning did not) or **neighbour**. The
private verdicts are in the private folder's `borrows.json`; only the counts are here.

| borrow | kept | in-repo | private | no | neighbour |
|---|---|---|---|---|---|
| **secret details** | 16 | 4 (nightbook ×3, members-area ×1) | 12 (membership business 8, tirion 4) | 3 | 7 |
| **settled** | 8 | 6 (lessons ×4, nightbook, planning) | 2 (tirion) | 12 | 4 |
| **facts — only one** | 2 | 2 (planning Settings, members-area Association) | 0 | 1 | 1 |
| **facts — read aloud** | 1 | 0 | 1 (sentinel) | 1 | 3 |
| **facts — called by** | 47 | 25 | 22 (8 of them the CMS's own display template) | 1 | 1 |
| **facts — who changed** | 5 | 2 (lessons) | 3 | 2 | 10 |
| **only sometimes** | 9 | 7 | 2 (membership business) | 2 | 5 |

What the private sources added that §3 did not know:

- **The membership business's CMS already keeps per-field rules.** Eleven of its permissions name the fields a role
  may read or change; the seven reads cover five collections. The clearest: a company's representative reads their
  employees' accounts without the two health-related details the employee reads on their own. That is this
  borrow's sentence, kept in production by a CMS and not by the app. It changes R-a's input (§6).
- **The same CMS shows the opposite mistake once.** One collection is read in full (every field, no filter) by every
  member, and it holds each person's private form token and two sensitive details. It is a row for the "secret on a
  record whose readers should see the rest" mutant (§4 step 3). Richard was told in the session. It is not filed
  here (R6: no client internals in the repo).
- **Tirion's approvals are Frappe's submit.** A write-back is proposed, approved as its own record, then executed,
  and a proposal whose values moved since it was proposed is refused as stale. A correction is decided once, on the
  value as submitted. Both are rows outside lessons, so R-c's condition holds.
- **Meaning traps the detectors hit:** a key/value settings store (many records, one per key) is not "only one"; a
  `subject` column naming whose data a purpose touches is not a title; change-detection and staleness hashes are
  not secrets; version stamps for recognising one's own writes echoed back are not "who changed what"; a query
  parameter (`token`) is not a field. Each is a **no** with its reason.

**Read aloud is thin:** one row (an exhibitor's stand reference) and no invoice-style numbering anywhere. Step 2 may
ask it as one of the noun's questions, but nothing here says it needs a mutant of its own.

## 4. What to build

1. ✅ **The detectors** (Opus, built s15; §3.5). In `scripts/ontology/census.js`, a new `how` for each borrow: a status whose values
   include a draft and a terminal state, or a `published*` / `sent*` / `sealed` field (settled); a collection with
   `Settings` / `Config` in its name or a single-row create rule (only one); `*Note` / `*Reason` beside a lifecycle
   field, or `*Url` beside `*StorageKey` (only sometimes); a verifier, token or secret on a collection whose `get` is
   wider than its owner (secret details). Classify the in-repo rows of §3 in `kinds.hand.json`. Richard runs the census
   with the private paths. Each borrow is then either kept with its counts or recorded here with zero rows.
   **As built:** the candidates are not kinds. They are a second row set with its own section in `kinds.hand.json`
   (`borrows`: the list, the verdicts, three hand rows) and in `kinds.json` / `KINDS.md`, so the 14 kinds and
   `world.test.ts`'s pin did not move. Two detectors the list above did not name were added: a permission that names
   the fields it covers (the CMS's per-field rules) and a CMS display template (its own "what you call one"). A
   status's values are read from a `CHECK … IN`, a choice list or the column's trailing comment. The gate fails on
   an unclassified candidate and on a verdict that names no candidate. Mutants: a secret detector that never
   matches (5 verdicts name nothing → red); a verdict removed (`Assignment.status` unclassified → red).
2. **The vocabulary** (Fable). Only the borrows that have rows.
   - ✅ (s18, §9) **Settled** becomes a kind in `kinds.hand.json` and `kinds.ts`, with `target: 'none'` and `self` for the amend
     link. Questions: *what makes it agreed, and who agrees it? After that, may anything still change (a note, a
     status)? To correct it, withdraw it or replace it, and does the replacement name the one it replaces? May a
     draft be deleted? May an agreed one?* It projects to a status Choice, an agreed-at Date and an `amends` Link to
     itself.
   - **Facts about a thing** go on `Noun` in `files.ts` and `world.schema.json`, beside `signsIn`. There are four
     answers: only one, a number people read, what you call one, and keep who changed what. Each has a question and a
     mutant.
   - **Secret details** and **only sometimes** become questions on the kinds whose target is a property (`one-of`)
     and on `ends`, and an answer on the property itself (`secret`, `onlyWhen`).
3. **The mistakes** (Opus, through ONT-005). Each borrow brings its mutants, and a claim or a missing question kills
   each one:
   - an agreed record edited in place, an agreed record deleted, an amendment that loses its link, a withdrawal that
     deletes;
   - a settings collection with three records, where the app reads the first;
   - a number reused after a delete;
   - a list that shows ids;
   - a last-editor field where a history was wanted;
   - a secret on a record whose readers should see the rest;
   - a detail that is always optional, so it is empty when it mattered.
4. **The projection** (Fable, ONT-003). ~~Secret details project to an `extends` noun with its own stricter rules,
   which needs no change to the contract.~~ **R-a ruled s16:** secret details project to `security.json`
   `collections.<c>.fields.<f>.read` (ONT-012 §6.2), and *settled* to `collections.<c>.onlyWhile` (§6.1). *Editable only while a draft* needs a rule that depends on a value on the
   record. That is not in the rule vocabulary as read today (`SchemaManager.ts:132-133`, plus ONT-004's path rule),
   so step 4 either projects it to a gated function or asks for the rule (R-b).
5. **The view hints** (Opus, into ONT-008's suite): what you call one in a list, and a detail shown only when its
   case holds. Every home-made data manager reads these from the files instead of guessing.

## 5. Acceptance criteria

1. ✅ (s15) Each of the four borrows is in `KINDS.md` with its rows and counts, or recorded in §3 with zero rows after the
   private run. Either way it is backed by the census, not by this file. *All four keep rows (§3.5). The private run
   was made on this machine, with the rows kept outside the repo.*
2. Each borrow that is kept has its questions as data, its projection graded on both adapters (ONT-003), and each of
   its mutants killed or naming its missing question (ONT-005).
3. ✅ (s20, §11) Nightbook's `Profile` re-said in the vocabulary asks *"is any detail on it not for everyone who can see it?"*.
   Answered *yes* for the three verifiers, it projects them away from the public read.
4. `world.test.ts` and `npm run ontology-census:check` are green, with the kinds still pinned to the hand file.

## 6. Rulings to ask (plain words)

| # | the question | recommended |
|---|---|---|
| R-a | **Secret details: split them into their own record, or teach the backend per-field rules?** Splitting works today with no backend change. Per-field rules are what Frappe does, and every backend adapter would owe them. | Split first. Ask again only if the private corpus shows more than a few rows. **s15: it shows 12, and 7 of them are per-field read rules a CMS already keeps in production (§3.5), so asked again 2026-10-10.** |
| R-b | **"Editable only while it's a draft": a backend rule, or a check in a function?** The backend's rules today say who, not when. | A check in a function first, with the claim that grades it. A backend rule if a second app needs it. |
| R-c | **Settled: its own kind, or an answer on `ends`?** They differ: `ends` keeps a record that stopped, and settled freezes one that is still in force. | Its own kind, if step 1 finds rows outside lessons. **s15: 4 rows outside lessons (nightbook, planning, tirion ×2), so the condition holds.** |

**Ruled 2026-10-10 (s16), Richard, asked in plain words (README §9):** R-a **per-field read rules in the backend**
(not the recommendation); R-b **a backend rule** (not the recommendation); R-c **its own kind** (the recommendation).
So step 4 projects secret details to a per-field read rule and *settled* to a rule on a value of the record, and
both rules are new to the contract (step 4a below).

## 7. Watch for

- **Nightbook's verifiers are a known limit, not a new bug** (TPL-011 :311, V1-8). Cite them as evidence. Do not file
  them again.
- **Count the reach before the benefit** (memory). §3 is the in-repo corpus of 5 sources. The private 3 hold 195 of
  303 rows, and an answer from the 5 is a hypothesis.
- **A word is not a meaning.** `PathStep.status = 'locked'` (§3.2) and `Cohort.isDefault` (§3.3) look like rows and
  are neighbours.
- **An unlinked task is invisible.** This task is on the board in README §7. Keep it there.

## 8. Not this task

Frappe's Desk (P104 rejected that look), its Python document hooks (logic in free code works against restraint), many
sites from one codebase, and its naming-series machinery beyond the question it asks.

## 9. Step 2, the *settled* half (s18, 2026-10-11, Fable 5.1)

**The kind.** `settled` is the fifteenth entry of `kinds.hand.json` and `WORLD_KINDS` (`world/kinds.ts`), `target:
'none'`, sentence *"a {from} is agreed at some point, and after that it stays as it was agreed"*. Its rows are not
relations the harvest sees (a status, a sent-on date, an attempt number), so `census.js` learned one thing: a kind
with a `borrow` draws its rows from that borrow's candidates judged **yes** in step 1. That gives 8 rows over 4
sources (lessons 4, nightbook 1, planning 1, tirion 2 — `KINDS.md`), the private two counted on this machine with the
private paths. The relation-row count stays 303; `world.test.ts` pins the kinds' total at 311.

**Five questions**, in the order a person is asked: who agrees it and what that is called (`agreedBy`, words);
which details may still change afterwards (`stillChanges`, a new answer shape **`fields`** — names of the noun's own
details or "nothing", checked by the validator against the noun); how a mistake is put right (`putRight`: withdraw
it / replace it with a new one / either); may a draft be thrown away (`deleteDraft`); may an agreed one ever be
deleted (`deleteAgreed`).

**The projection** (`kinds.ts` → `project.ts` → `security.json` through the migration route): a `status` Choice
(draft / agreed / withdrawn), an `agreedAt` Date, an `amends` link to itself unless mistakes are only withdrawn; and
three rules, each **held** by ONT-014's seam — `moves` on `status` (draft → agreed → withdrawn, never back; no
`by`, since a world names no role), `frozen: "*"` `unless` the record is still a draft (or has no status yet) with
`except` for `status`, `agreedAt` and the `stillChanges` answer, and, when an agreed one may not be deleted,
`delete: "never"` or `delete: { where: draft }`. These are ONT-014 §3.3's two new `RuleHold` shapes (`frozen` with
`unless`/`except`, `moves`) plus `neverDeleted` with `unless`; each carries `heldOn`/`freeOn`, the row values a
claim uses to make a bound row and a free one without evaluating the condition. `WorldOnlyWhile` grew to carry them,
and the migration's `rules` step now carries **`was`** (what the world said before) so the route can tell its own
earlier writing from a person's hand rule (ONT-014 §6.5 #4; `withWorldRules` merges by provenance when `was` is
there, and keeps s17's slot rule for a plan written by hand).

**Graded.** `world-every-kind` gained a `quote` noun and the relation `quote-sent` (settled; `stillChanges: "note"`,
`putRight: replace`, drafts deletable, agreed ones not). Three claims, each held with a mutant on both engines:
*status never goes back* (draft → agreed goes through, back is refused), *frozen once agreed* (an amount refused on
an agreed quote, every excepted field still changes, the same amount changes on a draft), *never deleted* (an agreed
quote refused, a draft removed). Settled's four seeds — edited in place, goes back, agreed deleted, amend loses its
link — are all **killed**. ONT-005's every-kind honesty number: 13 of 38 → **14 of 45** on both engines — settled's six mutants (four seeds, two unanswered questions that change the schema) all killed, the one survivor added being the quote's own number stored as text (the noun's property mutant, unclaimed like the slot's date). The pin is `ont-005-mutants.test.ts`'s. The brief and `KINDS.md` regenerate from the
kinds; `ont002WorldTools` 12/12.

**Not this half:** the other three borrows of step 2 (facts about a thing on `Noun`; `secret` and `onlyWhen` on a
property), step 3's remaining mutants (a settings collection with three records, a number reused, a last-editor
field), step 4's projection of secret details to `fields.<f>.read` (the target exists; the kind-side answer
`secret` does not yet), and step 5. **A limit said:** one `frozen` per collection — a noun that is both *settled*
and has a `setOnce` field gets the union of fields under settled's `unless`, so the set-once field is editable while
the record is a draft (`project.ts` step 4 says so in its comment).

## 10. Step 2, the other three borrows (s19, 2026-10-11, Fable 5.1)

**Facts about a thing** live on the noun, as the kinds live on a relation: `world/noun.ts` declares `NOUN_QUESTIONS`
(DATA, each with the incident it prevents and the shape of its answer) and `NOUN_MUTANTS` (ONT-005 §3 step 3's list,
each killed by one question); the answers go in `nouns[].answers` by id (`files.ts`, `world.schema.json`). Five are
asked once per world, naming the nouns that have not answered, after every relation question and before the
kind-picker (the picker's lesson: a per-noun question outranks what the person said about how things join);
three follow a noun whose number is read aloud. Each has a projection, and each projection is held or said:

| question | answer | projects to | held? |
|---|---|---|---|
| `onlyOne` — is there only one? | yes/no | "there is only one X" in the description; a claim measured to fail (a second record is taken) | **said** — across records, none of the store's checks; ONT-013 step 4 |
| `calledBy` — what is one called in a list? | one of its details | `calledBy` on the collection (`WorldCollection`), the hint every view reads (ONT-008 step 5) | nothing to hold; the mistake is the view's |
| `history` — who changed what? | yes/no | a `<Noun>History` collection: the noun (goes-too, required), `at` (required), `who` (the login), `changed` (anything) | **held** (the records; their required fields are claimed); *writing one on every save* said — a verb's or a trigger's |
| `readAloud` — do people read its number aloud? | yes/no | a `number` text field, **unique** and **set once** (held: an index and ONT-014's `frozen`); the series in words (`looksLike`, `maySkip` — R-g, asked never assumed — `restarts`); a claim measured to fail (a number used again after a delete) | held: unique, set once; said: handed out, never reused — ONT-015 |
| `secret` — is any detail not for everyone who can see it? | yes/no, and `"secret": true` on each detail (the which, as `path` + `through`) | "X's email is not for everyone who can see the X" in the description | **said** — R-a's per-field read rule is step 4's (`fields.<f>.read` exists, ONT-012 §6.2) |

**Only sometimes** is an answer on the property: `onlyWhen: { field, is?, required? }` — the detail matters only when
another detail of the same record is set (or holds `is`), and `required` says it is never empty then. The validator
checks the field is a sibling, `is` fits the sibling's kind (a choice's value, a yes/no), and refuses a detail that
depends on itself. The `ends` kind asks the corpus's clearest case — *when a thing ends, is a note or a reason
written with it (`endNote`, one of its details or "nothing"), and must it be there (`endNoteNeeded`)?* — and projects
the same rule onto the named detail with `when: endedAt`. The rule's three readings: **required and no `is`** is
both-or-neither, a declared **`allOrNone` check** the backend keeps on every engine (HLT-016, `schemaCommon.ts`) —
held, with a claim (a row with both is made; one with only the case, and one with only the detail, are refused) and
the mutant `dropAllOrNone`; **with `is`** or **not required** is said (`WHY.onlyWhenIs`, `WHY.onlyWhenOptional`).
The seed `ends/note-always-optional` (`without: { rule: 'onlyWhen' }`) kills at the check. A `without`-rule seed whose
question is unanswered on a world now rides its question's own mutant, or is *not applicable* in words — never
"cannot" (it was "cannot" on `world` and `world-membership`, which the static spec crashes on).

**Not asked:** the `one-of` question the plan named ("a detail that matters only for some values of {field}") — no
census row has a detail that depends on a choice's value (§3.4's rows depend on dates and flags), and ONT-000's
rule stands: no row, no question. The "one or the other" row (`resourceUrl` / `resourceStorageKey`, `exactlyOne`)
is recorded and not built. A relation's own details may carry `onlyWhen`; `secret` is a noun's detail only.

**Fixtures.** Every fixture's nouns answer the five facts (the plain answers), so the worlds the specs pin stay
"described enough". `world-every-kind` exercises each once: a `settings` noun (`onlyOne`), `account.history`,
`session.readAloud` with `S-{####}` / may skip / never restarts, `person.email` secret, `person.left because` named
by `leaves.endNote` and needed (the held check), `slot.closed because` only when `open` is false (said). The brief's
example answers the facts too. `BRIEF_EXAMPLE` and the brief's text teach the noun's questions and the two
property keys. The migration's diff carries `noun-answered`; the plan's `setChecks` carries an `allOrNone`.

**Read s19, not this task's:** `project.test.ts`'s goldens (`projected.json`, dated 2026-10-09) and its "nothing
said is dropped" else-branch had been red since ONT-014 flipped *set once* / *never deleted* to held (s17,
`e06f4259d`, 2026-10-11 10:38) — nobody ran it; `tests/migrate.test.ts` did not type-check since s18's `rules`
step. Both fixed here (the test learned the five `onlyWhile` shapes; the goldens regenerated with
`ONT003_WRITE_GOLDEN=1` and read).

**Measured (s19, 2026-10-11):** project contract `npx jest` 13 suites, 263/263, `tsc` clean for the package and its tests; MCP `ont002WorldTools` 12/12; backend `tsc` clean; `ontology-census:check` green. ONT-005 every-kind: **51 mutants, 15 survive** (0 unanswered, 7 unkept, 8 unclaimed), identical on SQLite and PostgreSQL — 14 of 45 → 15 of 51: `account/history-unanswered` killed for want of a home, `leaves/endNote-` and `endNoteNeeded-unanswered` and the seed `note-always-optional` killed at the held all-or-none claim (which also kills `leaves/end-by-delete`, unsaid, so `endedAt` has no home), `settings/onlyOne-unanswered` and `person/secret-unanswered` surviving unkept by design, each naming the step that keeps it; `world` and `world-membership` gain `leaves/endNote-unanswered (unanswered)` — neither answers it. The backend band (ont-003-write, ont-003-claims, ont-005-mutants, ont-007-route, ont-004-world, ont-006-verbs, ont-002-through, ont-014-reach-review): **8 suites, 138/138, exit 0** on both engines (ont-003-write, ont-003-claims and ont-005-mutants rerun after the `who` rename and the pin, 51/51 at 15:22 CEST; the other five green in the 14:56 band); ONT-003 claims on every-kind: 46 of 46 (43 held, 3 measured not held — only one, the number never used again, and the pair said twice).

## 11. Step 4, secret → `fields.<f>.read` (s20, 2026-10-11, Opus 5.5)

**Who reads it.** A detail the person marked `secret: true` (on a noun that answered `secret: yes`) is read by
nobody but the admin and functions: `security.json` `collections.<c>.fields.<f>.read: "nobody"`. A world names no
role, and the question asks *whether* a detail is not for everyone, not *who* it is for — so the projection fails
closed. A follow-up question ("who may read it — the person it is about? an office?") would need a role or a path the
world can say; not asked until a row needs it.

**The projection** (`project.ts`): `WorldCollection.fields`, beside `onlyWhile`; the secret rule is held (it left
`notHeld` and the description). **The claim** `<noun>/<field>-is-not-for-everyone`: the record is made with the
detail, the store's own key reads it back (`holds`), and a person signed in with no role reads the record without it
— `unseen`, a new claim step in both contracts (`@noodl/backend-contract` `conformance/claims.ts` and the
projection's copy). `unseen` hands the field rule over as data in the read ACL (`StorageAclOption.hidden`), as s17's
`byPerson` hands `onlyWhile` over in the write ACL; only the backend's facade strips it, so the claim specs' adapter
routes a fetch with an ACL through `AdapterFacade.rawFetch` (`tests/helpers/facade-deletes.ts`). The mutant
`dropFieldRule`; `mutants.ts` maps a held secret to it and counts `fields` as something a store holds.

**The write** (`migrate.ts` → `POST /admin/world/migrate`): the `rules` step carries `fields` and `wasFields` (what
the world said before), only when either side has a secret — every other plan is byte-identical to s18's.
`withWorldRules` merges per field: the world's earlier rule (equal to `wasFields`) goes, the world's new one is set, a
rule the person wrote on another field stays; a hand rule on the same field is a loss (`worldRuleLosses`), named in
the dry run and waited for (`acceptLosses`). `migrationPlanProblems` refuses any field rule but `"nobody"` in a step.
The words: *"keep, for people: nobody deletes one; email is read by nobody but the backend's own key"*, and said back
*"… email is read by whoever reads one again"*.

**Graded:** contract `migrate.test.ts` (the step, said back, the control), `project.test.ts` (the every-kind golden;
**AC3** — Nightbook's `Profile` with `codeV`, `answerV`, `rescueV` from `tpl011Cloud.ts`: unanswered the runner asks
it of the profile; answered yes the three are read by nobody, each held, claimed and with its mutant; answered no,
nothing hidden); backend `ont-007-route.test.ts` on SQLite and PostgreSQL — the run writes the rule beside a hand rule
on `name`, a person's GET comes back without `email` and the admin's with it, a filter on `email` is 403; said back
the world's rule goes and the hand rule stays; a hand rule on `email` is a loss until accepted (all three red with
the route's merge disabled, measured); `ont-003-claims` / `ont-005-mutants` on both engines — the new claim held and
failing on its mutant, **ONT-005 every-kind 15 of 51 → 14 of 51**.

**Measured (s20, 2026-10-11):** project contract 13 suites 269/269, `tsc` clean (package and tests); backend
contract 9 suites 232/232 (one spec red since s17 found and fixed: `P116-S20-STALEMSG`); backend band 13 suites
347/347 exit 0 on both engines, `tsc` clean for `src` and the tests; MCP `ont002WorldTools` 12/12;
`ontology-census:check` green.

