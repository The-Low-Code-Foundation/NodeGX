# ONT-011 — What Frappe asks

**Opened 2026-10-10**, from Richard's question of how NodeGX compares with the Frappe Framework, and his answer
*"let's borrow 1 to 4"*. **Depends on ONT-001** (the kinds), **ONT-003** (the projection), **ONT-005** (the mutants);
**feeds ONT-008** (the view hints). **Status: 🟡 step 1 ✅ (P116 s15, 2026-10-10, Opus 5.5): the detectors are in
`census.js`, every candidate in all 8 sources is classified by meaning, and all four borrows keep rows (§3.5). AC1 ✅.
Steps 2 and 4 are Fable's; R-a and R-c re-asked with the numbers (§6).** §3.1–§3.4 were read by hand before the
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
   - **Settled** becomes a kind in `kinds.hand.json` and `kinds.ts`, with `target: 'none'` and `self` for the amend
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
4. **The projection** (Fable, ONT-003). Secret details project to an `extends` noun with its own stricter rules,
   which needs no change to the contract. *Editable only while a draft* needs a rule that depends on a value on the
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
3. Nightbook's `Profile` re-said in the vocabulary asks *"is any detail on it not for everyone who can see it?"*.
   Answered *yes* for the three verifiers, it projects them away from the public read.
4. `world.test.ts` and `npm run ontology-census:check` are green, with the kinds still pinned to the hand file.

## 6. Rulings to ask (plain words)

| # | the question | recommended |
|---|---|---|
| R-a | **Secret details: split them into their own record, or teach the backend per-field rules?** Splitting works today with no backend change. Per-field rules are what Frappe does, and every backend adapter would owe them. | Split first. Ask again only if the private corpus shows more than a few rows. **s15: it shows 12, and 7 of them are per-field read rules a CMS already keeps in production (§3.5), so asked again 2026-10-10.** |
| R-b | **"Editable only while it's a draft": a backend rule, or a check in a function?** The backend's rules today say who, not when. | A check in a function first, with the claim that grades it. A backend rule if a second app needs it. |
| R-c | **Settled: its own kind, or an answer on `ends`?** They differ: `ends` keeps a record that stopped, and settled freezes one that is still in force. | Its own kind, if step 1 finds rows outside lessons. **s15: 4 rows outside lessons (nightbook, planning, tirion ×2), so the condition holds.** |

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
