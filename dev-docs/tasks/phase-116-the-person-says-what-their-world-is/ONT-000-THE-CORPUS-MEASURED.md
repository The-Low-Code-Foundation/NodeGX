# ONT-000 — The corpus, measured

**Opened 2026-10-08.** Depends on nothing. **Status: ✅ BUILT (s1, 2026-10-08) — steps 1–5 done, AC1–AC4 green; the lessons live-schema drift check is owed (§6 item 5).** The corpus was widened from five sources to eight at Richard's word (§6).

## 1. The person sentence

> **The list of ways things relate to each other in people's apps was read off real apps and counted, not thought up,
> and every kind on it can say which app it came from.**

## 2. Why

README §1 readings 6, 7, 8. The relation-kind vocabulary is the product (README §3) and the first way to get it wrong is
to invent it. The in-repo corpus is thin (four templates name collections; nine name none), and the richest corpus on
this machine is Acme Association: fourteen collections, a permissions guide, two notes written after the fact and one
incident report. Its repository is outside this one and stays there. Richard's Bubble years are a second source, oral.

## 3. What to build

1. **The harvest.** A script, `scripts/ontology/census.js`, that reads every relation it can find: Acme's schema
   scripts and its dotted paths in code and in its permissions guide, read from a path given on the command line and
   never checked in; the four templates' collection
   names and the Link / Links fields the editor's schema sync holds for them; the lessons backend's schema through its
   admin API. One row per relation: source, from, to, cardinality as declared, properties on the junction if any,
   and the sentence a person would say for it, written by hand.
2. **The classification.** Each row assigned to a kind. A kind enters `KINDS.md` with its count, its evidence rows and
   the plain sentence for it. A kind with one row is marked as such; a kind with none is refused by the script.
3. **The unasked questions.** Acme's archive note, its enrolment note and its incident report read as answers; each attributed to the kind whose question it answers,
   and the question written in the person's words. These seed each kind's `questions` (ONT-001) and the question
   budget (ONT-002).
4. **The depth number.** The dotted-path table from README §1 reading 6 redone by the script, with the deepest path per
   source. This is ONT-004's fixture and R4's measurement.
5. **Richard's list.** The mistakes Richard remembers making in Bubble, as rows with the kind they are a mutant of
   (ONT-005's seed). Taken down in a conversation; marked oral.

## 4. Acceptance criteria

1. `KINDS.md` and `kinds.json` are generated; `npm run ontology-census:check` fails when the hand-kept list and the
   harvest disagree, as P107's `spec-census:check` does.
2. Every kind has at least one evidence row naming a file and a line, or a document and a heading; none cites a data
   row.
3. The three Acme notes are each attributed to exactly one kind, and the question for each is written in general
   words that reveal nothing of Acme's operations.
4. The deepest path per source is reported, with the sentence it stands for.

## 5. Watch for

- **Personal data and internal workings.** Acme's repository names real people and describes its operations. The
  script reads its schema scripts and code from a path outside this repo, never exports of data; Acme's evidence rows
  are kept outside this repo, and `KINDS.md` carries only the kind and the count for them (README R6).
- **A sentence that fits is not one that excludes** (memory). A relation that could be "belongs to" or "is on" is
  classified by the question that distinguishes them (can it move? does it have a start?), and the row says which.
- **Measuring on a fixture.** Counts are about these five sources. `KINDS.md` says so in its first line.

## 6. Built

**s1, 2026-10-08.** Richard: *"if ONT-000 is ready, just do the research and rock out"*, and *"we did a lot of ontology
work already in the tirion prototype and sentinel prototype, both in the same parent folder as this project"*. Both
prototypes joined the corpus; their rows are treated like the membership business's (private, outside the repo).

### What exists

- `scripts/ontology/census.js` — the harvest, the classification join, the gate, the two outputs. `npm run
  ontology-census` regenerates; `npm run ontology-census:check` exits 1 when `kinds.json` is stale. The script header
  says how every row is found. Without the private paths (CI) it regenerates the in-repo part, carries the private
  counts from the committed file and says so; with them it verifies everything. Measured: fresh in both modes, and a
  regeneration without the private sources leaves the file byte-identical.
- [`kinds.hand.json`](kinds.hand.json) — the only hand-kept input in the repo: the 14 kinds with their sentence,
  question, what tells them apart and what they project to; the classification of the 108 in-repo rows; the three
  notes; the depth sentences; the oral list (empty).
- [`KINDS.md`](KINDS.md) / [`kinds.json`](kinds.json) — generated. **14 kinds, 303 rows, 8 sources:** four
  templates (members-area, nightbook, planning, todo-list), the lessons backend's declared schema, the membership
  business (24 collections), tirion (39 tables), sentinel (24 tables).
- Outside the repo, in a private folder beside the checkouts (its path is given on the command line, never written
  here): the 195 private rows with file:line evidence, their hand-kept classification, the membership business's
  UI-declared relations with the guide heading as evidence, and the raw dotted-path table.

### The kinds, with the evidence that produced them

| kind | rows | sources | read off |
|---|---|---|---|
| belongs-to | 78 | 7 of 8 | every m2o / FK / `<x>Id` column; the o2m aliases are the same edge read backwards |
| owned-by | 71 | 5 | `creatorOwns` and `acl-*` in the templates; `tenant_id TEXT` on 41 tirion tables; the company-admin junction |
| happened-to | 44 | 7 | logs, attendance, submissions, read receipts, the todo list's history rows |
| one-of | 24 | 1 (the business) | every `choices:` list in its schema scripts; **no template and not the lessons backend declares a choice** |
| is-on | 20 | 4 | the junctions that carry details: person-on-account (active, type), employment (dates, status), speaker-on-session, cohort membership, path steps |
| exists-elsewhere | 16 | 3 | external ids, `source_refs`/`golden_meta` provenance, `(tenant, external_id)` unique keys |
| ends | 13 | 3 | `archivedAt`/`removedAt`/`cancelledAt`, `active=false`, `end_date`, the erasure tables |
| extends | 11 | 4 | identity-table rows every golden record extends; one-per-learner tables; the profile of a person |
| many-by-list | 8 | 1 (tirion) | `UUID[]` / `TEXT[]` columns — speaker ids as an array |
| by-name | 6 | 1 (lessons) | `*Email` columns naming a user |
| same-as | 5 | 3 | `superseded_by`, match candidates, an import row matched to an existing user |
| together | 4 | 1 (sentinel) | the one plain junction with no details |
| points-at-one-of | 2 | 1 (lessons) | `anchorId` beside `anchorKind` |
| part-of-tree **(1)** | 1 | 1 (sentinel) | the one self-link |

Five kinds rest on one source (one-of, many-by-list, by-name, together, points-at-one-of) and one on one row.
They are derived, not invented, but ONT-001 should know how thin they are.

### The three notes (step 3) — in `KINDS.md`

archive note → **ends**; enrolment note → **exists-elsewhere**; incident report → **is-on** (its root cause was the
other system's hook, but the lesson it writes down is the chain: a person with no link to an account was made and
counted as a contact, not a member). Each question is written in general words; nothing of the business's operations
is in them.

### The depth number (step 4)

| source | hops | what it is |
|---|---|---|
| the business | **5** | the company a session's attendee works for; the account-holder permission rule (README §1 reading 6 called it four hops — it is, and it is used eight times); 219 dotted paths, 108 distinct; 546 dotted string literals in its code are not relations (event names, i18n keys) |
| tirion | 4 | four joins in one analytics statement (per person: editions, sessions, spend) |
| sentinel | 2 | an attribute chain through one relationship |
| templates | 1 | every Query Records filter names one field of the collection it queries |
| lessons | n/a | a schema carries no path |

This is ONT-004's fixture: the contract's path operation needs depth 5 on the relational adapters to answer a
real question this machine already asks, and the capability cell is `supported` only at that depth.

### What the census found about the product (for ONT-001, ONT-003, ONT-005; none is a bug to file)

1. **Not one Link, Links or Choice tile is used anywhere in the in-repo corpus.** All 108 in-repo rows are string
   ids (`taskId`, `learnerId`) or emails. P104 offers Link (Pointer), Links (Relation) and Choice; no template and not
   the lessons backend's declared schema uses them. ONT-005's first mutant ("a link stored as text") is 100 % of what
   NodeGX has produced so far, and ONT-003's projection target is unexercised.
2. **A template carries no data model** (README reading 5, now measured from the file side): a field's only
   existence is a `prop-<field>` port or a filter rule; the collection list is in the security file.
3. **planning reads Task and Action, which its security file does not declare** — they are the todo list's (one
   backend, two apps; TPL-008's planning fold). R1 must allow a project's model to be shared with, or imported from,
   another project.
4. **Two lessons rows point at a thing that has no record** (`sectionId`, a section inside a lesson's `sections`
   list). A noun the person names need not be a collection; ONT-001's `nouns.json` must say which nouns are parts.
5. **The lessons backend's live schema was not read.** Its tools apply the checked-in `backend/schema.json` through
   `POST /admin/schema/apply`; the admin token is not on this machine. The file is what the backend was given;
   a drift check against the live `GET /admin/schema` is owed when the token is at hand.

### Left

- Step 5 taken down 2026-10-08 (seven mutants, `kinds.hand.json` → `oral`; rendered at the end of `KINDS.md`). R1–R7 ruled the same day (README §9, ruled table). Nothing of ONT-000 is open except the lessons live-schema drift check (item 5 above).
