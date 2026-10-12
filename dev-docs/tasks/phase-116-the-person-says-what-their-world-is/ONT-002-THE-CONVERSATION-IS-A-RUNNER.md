# ONT-002 — The conversation is a runner

**Opened 2026-10-08.** **Depends on ONT-001, ONT-005 and R5.** **Status: ✅ s14, 2026-10-10 — AC1–AC4 met s6 (Fable 5.1, §6.5); "through what?" built s14 (Opus 5.5, §6.7). Writing the rule into `security.json` is ONT-008's (no writer of permissions exists yet).**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1 for the brief; Opus 5.5 for the runner** — the brief decides whether the questions arrive before the schema — the thesis itself; the runner is mechanical. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **Every question I am asked about my world has a reason, and the reason is written down: a mistake that would have
> survived if I had not answered it.**

## 2. Why

Richard: *"it's not pushing the user to predict what things might come up."* A free-form chat asks whatever it thinks
of, or nothing. P107's runner has the shape this needs: generate, grade, and report the mutants that survive. Here a
surviving mutant is a classic mistake the person's answers so far do not rule out, and the question that kills it is
the next question. Nothing else is asked.

## 3. What to build

1. **The brief.** One document an agent reads before the first sentence: what an ontology is in NodeGX terms (README
   §3), how to write a noun and a relation into the files, the one tool, and the rule that a question is asked only when
   the tool names it. Served where P112 R3 serves the kit's brief.
2. **The runner.** `validate` over a project's `docs/world/`: project (ONT-003), generate each relation's mutants (ONT-005),
   grade the mutants against the claims the answers so far make, and return the survivors as a list of questions in
   the person's words, each with the kind, the relation and the incident it stands for. Empty list means the world is
   described enough to build.
3. **The budget.** Questions ranked by the corpus incidents each would have prevented (ONT-000 step 3); the runner
   returns the top few, not all. A question with no incident behind it is asked only when a mutant survives and nothing
   ranked higher does.
4. **The record.** Each answer written into `relations.json` with the question it answered, so a view can show "what it
   asked me and what I said" (README §2, *See it*).
5. **The one tool** (R5). `validate_ontology`, or the existing `validate_project` grown by one section, whichever the
   budget gate allows. Measured before chosen.

## 4. Acceptance criteria

1. On a fixture world with no answers, the runner asks, in order, the questions whose incidents rank highest, and asks
   nothing for a relation whose mutants are all dead.
2. On the Acme-shaped fixture with the *ends* and *exists elsewhere* questions unanswered, those two are in the first
   list returned (ONT-009's precondition).
3. Every question returned names its mutant and its incident; a question with neither cannot be returned.
4. The tool surface after this task is inside the MCP budget gate.

## 5. Watch for

- **The MCP cannot write `docs/world/` today (found by ONT-001, 2026-10-08).** `write_project_doc` refuses every path under
  `docs/` that is not `.md` (the editor's `assertInsideDocs`, `docsText.ts:438`). Claude Code can write the files with its
  own tools; an agent on the MCP alone cannot. The writer exists and is pure (`planWorldWrite` in
  `@nodegx/project-contract/world`, the `if_revision` rule) — whether R5's one tool writes through it, or the docs
  containment widens to `docs/world/*.json`, is this task's call, after the budget gate is measured.

- **The agent asks anyway.** The brief says the rule; the honesty number for the ontology (README §12) counts answers
  with no question behind them.
- **A predicate with no arm** (memory: *an arm with no predicate in it*). A mutant whose claim grades nothing in both
  arms is not a question; ONT-005's suite proves each mutant can fail before it can ask.
- **Question text is copy.** Pass it through the content-authoring skill (memory).

## 6. Built

**s6, 2026-10-09, Fable 5.1 (the brief and the runner both; the runner's pattern was ONT-005's, so the model check was
read as the brief's).** The runner, the budget, the record, the brief and the one tool (with the write beside it) exist;
the measured numbers are in §6.3, the decisions in §6.4.

### 6.1 The frame

A question is asked when it is unanswered and one of two things holds: **a mistake stands** — a mutant of ONT-005's
that this question kills and that survives without an engine (`gradeStatically` says `survives`, or `run`: the engine
would have to decide) — or **somebody paid for it**: the incident behind the question was lived (a note, or one of
Richard's rows). A question read off a schema (`census`, `task`) with nothing standing is *for the record*: listed,
never asked. That is §3.3 read literally: *a question with no incident behind it is asked only when a mutant survives*.
The incident report's question (`is-on/counts`) is the case that decided it — the projection ignores its answer, so no
mutant stands, and without the second clause the phase's third note would never be asked.

The rank is the incident first (note, then oral, then census), then how often the kind occurs in the corpus
(`evidence.rows`), then the kind's own question order, then file order. **The budget is five** (`QUESTION_BUDGET`),
the rest counted in `waiting`; `enough` says nothing stands. The list is deterministic.

Three questions no relation carries are asked here, each with a **home for its answer** so it is asked once:

| question | when | home | what the answer does |
|---|---|---|---|
| **Who signs in?** (ONT-004's first owed question) | an `owned-by` relation exists and no noun says so | `nouns[].signsIn: true` (one noun at most; the validator refuses two) | the noun's collection gets a `login` Link to the users collection — the hop `worldRule()` starts from; `loginHop(schema)` reads it back |
| **The kind-picker** (ONT-005 §6.6: "is `category` one of a fixed list?") | a noun has a text field nobody has placed: not `freeWords`, no `one-of` about it | `properties[].freeWords: true`, or a `choice` with a `one-of` relation | one question **per world**, naming every such field, ranked **last** — per noun it outranked everything the person had said (eight of ten on the every-kind world) |
| **Through what?** (ONT-004's second) | an `owned-by` answered `path: true`, once a noun `signsIn` (before that, who signs in is the question) | `relations[].through`: the steps from the noun that signs in to the owner | `ownerRule()` compiles it with the login into the path rule (§6.7) |

The two additions to the format are optional keys (no version bump): `schemas/world.schema.json` and the validator
agree on both (ajv in the tests), and `freeWords` is refused on anything but a text.

### 6.2 What it is

| piece | where | what it does |
|---|---|---|
| the runner | `nodegx-project-contract/world/runner.ts` `nextQuestions(files, {limit})` | validates, then `worldMutants()`; per relation, per unanswered question: the standing mutants it kills; the three world-level questions; the rank and the budget. Returns `ask`, `waiting`, `enough`, `record`, `forTheRecord`, `volunteered`, `schema`; or the validator's problems |
| the record | `RunnerReport.record` | every answered question with its words in the person's nouns, what was said, and whether it was `asked` or `volunteered` — the second when no incident is behind it, no seed is killed by it, and no answer to it would change the kind or the schema (`answerMatters()` in `mutants.ts`, the per-question check made callable). `volunteered` is the honesty number for the ontology (§5) |
| the words | `mutants.ts` `askWords()`, `plural()` | the article and the plural the noun takes: *an account*, *companies*, *people* — the questions read *a account* and *companys* before |
| the brief | `world/brief.ts` `worldBrief()`, `BRIEF_EXAMPLE` | generated from `WORLD_KINDS` (the table) and a typed example world the test validates and projects; the rule, the three files, the two extra answers, what the answers become, how to write. ~6,500 characters. Passed `written.py` and `closer.py` (the content-authoring skill's checks) after four rewrites |
| the tool | `noodl-mcp/src/tools/worldTools.ts` `validate_world` | reads `docs/world/`; no world → the brief and where the files go; a file missing → `partial`, which; a world → the report, the revision, a one-line `note` saying what to do next; `brief: true` sends the brief as well, `limit` the budget |
| the write | `write_world` | the three files through `planWorldWrite` (the `if_revision` rule; the validator), written with `docsTools`' atomic write (now exported), and the next questions back with the write. A conflict returns the current revision in `details`; an invalid world returns `problems` |
| the group | `toolGroups.ts` | both in the deferred **`backend`** group (`validate_world` first, `write_world` in `WRITE_ONLY_TOOLS`); `provision_backend`'s description gains one sentence pointing at `validate_world` (deferred: free) |
| the fixture | `tests/fixtures/world-membership-unasked` | the membership world + the course platform (`exists-elsewhere`, `hereFirst` unanswered) + `person.signsIn`; a test pins it as *membership plus exactly that* |
| the specs | `tests/runner.test.ts` (19), `tests/brief.test.ts` (3), `noodl-mcp/tests/ont002WorldTools.test.ts` (7), `toolDisclosure.test.ts` (the backend count now read off the manifest, not a literal) | AC1–AC3 and the budget without an engine; AC2 through the tool; both tools absent from the resident list and present after `find_tools({group:"backend"})` |

### 6.3 What it measured

| world | asks | first | waiting at 5 | for the record | volunteered |
|---|---|---|---|---|---|
| `world-membership-unasked` (AC2) | 3 | `on-the-course-platform/hereFirst`, `leaves/whatStays`, the picker | 0 | 7 | **6 of 35** (`whenEnds` ×2, `grows`, `depth`, `moves`, `wins`: hand-written before the runner existed) |
| the same with every answer taken out (AC1) | 30 | `membership/counts`, `employment/counts`, `hereFirst`, `whatStays`, `comesBack`, `backAs`; then Richard's rows by the kind's rows (`account-company/several`, `sameTime` ×2, `otherWay`); then census; the picker last | 25 | 15 | 0 |
| `world-every-kind` (fully answered) | 3 | `leaves/whatStays` (the archive note, inert, lived), who signs in, the picker | 0 | 6 | 23 of 54 |
| `world-categories-unanswered` (AC3's silent half) | 1 | the picker, naming `name`, `category`, `subcategory` | 0 | 0 | 0 |
| `BRIEF_EXAMPLE` | 3 | `counts`, `sameTime`, `startsEnds` | 0 | — | — |

**The resident surface (AC4): 8,261 tokens, 19 under the 8,280 bar — on both arms**, the four MCP files at HEAD and
with the change, in the same minute (`toolDisclosure.test.ts`'s `[surface]` line). Both tools are deferred; the
group's `(N tools)` went 61 → 63 at the same width.

**Green:** `@nodegx/project-contract` 117/117 (was 95); `noodl-mcp` `ont002WorldTools` 7/7, `toolDisclosure` 18/18;
`ontology-census:check`; `tsc` on both packages (the three `cg00x` spec errors in `noodl-mcp/tests` predate this
session: `p109-s10-typecheckmcp…`). `nodegx-backend`'s ONT-003/004/005 specs: see §6.5.

### 6.4 Decisions this session made

| left open | decided | why |
|---|---|---|
| what makes a question askable (§3.2 "surviving mutants") | **a standing mutant, or a lived incident** (§6.1) | `counts` has no mutant and is the incident report's question; `whatStays` has one only through a seed (`end-by-delete`). "Survives" is read without an engine: `survives` or `run` |
| the engine's verdict | **not consulted** | the runner is a tool call; ONT-005's engine grade is a suite. A mutant the engine would kill is still asked about, and the honest sentence is "the engine would have to decide" |
| the budget | **5**, a parameter | "a person asked twelve things about one link stops answering" (README §12); five fits one sitting; the rest are counted, never hidden |
| the picker's rank | **last, one per world** | measured per noun first: on the every-kind world it took eight of the ten slots with "is `name` a fixed list?" — fatigue by construction. Its incident is real (Richard's categories) and it stays askable; it waits |
| the record (§3.4 "each answer with the question it answered") | **derived, not stored**: the answer's key is the question id; `record` renders the words | writing the question text into `relations.json` duplicates the kind's data and drifts |
| the honesty number (§5 "answers with no question behind them") | **`volunteered`**: an answer no incident, no seed and no projection would have asked for | the validator already refuses an answer to a question the kind does not ask; what is left is an answer that changes nothing |
| R5's loader census | **`worldBrief()` has one caller**, `grade()` in `worldTools.ts`, and sends it only with `world: 'none'` or `brief: true`; both tools are in the deferred group | a landing page's agent never opens the backend group, so never reads it — by construction, not by a flag |
| the one tool vs. the write | **two tools, both free** | `write_project_doc` refuses `docs/world/*.json` and bypasses the revision rule; widening the editor's containment was the other way (§5) and would have let a write in that never read the files. R5's budget concern is measured: 0 |
| "through what?" | **not built** | the answer is a chain (relation ids that connect the owner's noun to the login); as words it is a doc, not a guard (memory: a known hazard in a docblock is not a guard); as a structure it needs an answer shape (`{type:'chain'}`) and `answers` values widened to lists — a format change ONT-006 or ONT-008 can own with the first rule that needs it |
| `signsIn`'s column | **a plain Link, not unique** | a unique index on a Link to the users collection would make ONT-003 a claim its seeder cannot seed (it makes no user rows); "one person per login" is said in the brief, not held |

### 6.5 The acceptance criteria

1. ✅ **On a fixture world with no answers, the questions whose incidents rank highest come first, and a relation
   whose mutants are all dead gets nothing.** `runner.test.ts` AC1: tiers non-decreasing (the picker last by rule);
   the three notes lead; `topic-tree/inherits` (census, inert, no seed) is for the record, never asked; a fully
   answered relation is not asked about.
2. ✅ **On the Acme-shaped fixture with *ends* and *exists elsewhere* unanswered, those two are the first list.**
   `world-membership-unasked`: `hereFirst` then `whatStays`, both `note`, each with its mutant (`silent-skip`,
   `end-by-delete`); answered, neither returns and the record shows both as `asked`. Also through the tool
   (`ont002WorldTools.test.ts`).
3. ✅ **Every question names its mutant and its incident.** On six fixtures and the no-answers world every returned
   question has standing mutants or a lived incident, a `prevents`, a `mistake` and a `home`; every mutant named stands
   (not `cannot`, not `notApplicable`, not refused) or is a kind's seed by id.
4. ✅ **The tool surface is inside the budget.** 8,261 on both arms (§6.3).

**Not re-run this session:** `nodegx-backend`'s `ont-003-claims`, `ont-004-world`, `ont-004-rule`, `ont-005-mutants`
(a peer's `jest -w 2` held the box for the whole session; one heavy job). What touches them: `askWords()`'s article
and plural (strings the ONT-005 spec prints, pins by id), and the projection's `login` column (no fixture they read
sets `signsIn`). Run them first next session.

### 6.6 Found, for other tasks

- **"Through what?"** (ONT-004's second question) is owed, with its design in §6.4. Until then `owned-by` with
  `path: true` projects a rule that says "through a chain" and `worldRule()` takes the chain from the caller.
- **ONT-008:** `loginHop(schema)` gives the manager the hop a rule starts from; `RunnerReport.record` and
  `volunteered` are "what it asked me and what I said" and the honesty number per world; `forTheRecord` is the list a
   view shows greyed.
- **ONT-009:** the persona's run is `validate_world` → the brief → the files → `validate_world` again; the test
  of the thesis is whether `hereFirst` and `whatStays` arrive before the first collection. They do on the fixture.
- **The fixtures were written before the runner:** on the hand-written worlds 6 of 35 and 23 of 54 answers are
  volunteered. A world written through the runner should read 0; ONT-009 measures a real one.
- **`askWords` grammar** was wrong in every question since ONT-001 ("a account", "companys"); fixed in `mutants.ts`,
  not in the kinds. `worldPath()`'s "the persons reached from…" (`paths.ts`) still says *persons*; its spec pins it.

**s10, 2026-10-09 (Opus 5.5) — the runner reads the verbs.** A question the relation has not answered, which a verb's
failure arm `answers`, is not asked: it is on the record with the arm's `sees` and `by` (ONT-006 §6.7). An arm may answer
only a question answered in words. `validate_world`/`write_world` read and write `verbs.json`; the surface is unchanged at
8,261 tokens.

### 6.7 s14, 2026-10-10 — through what (Opus 5.5)

**Built.** The answer is a **key on the relation**, `through`, a list of steps (`{ relation, back?, where? }`), not a
value in `answers`: an answer is one word or yes/no, and widening `answers` to lists would have changed every
answer's shape for one question (§6.4's "a format change … with the first rule that needs it"; `ownerRule()` is that
rule). Optional, no version bump, as `signsIn` was. Not a kind question either, so `kinds.hand.json` did not move
(ONT-011 is changing it). The steps start at the noun that signs in and end on the owner. The last hop, from the owner
back to what it owns, is the relation itself and is not said.

- **The validator walks it over the nouns** (`validate.ts`, pure, runs in a page): it refuses a chain on any kind but
  `owned-by`, without `path: true`, with nobody signing in, through a relation that is unknown, is itself or does not
  join two nouns, read the wrong way, on the wrong noun, a self relation with no direction, or ending anywhere but
  the owner. `schemas/world.schema.json` takes the same shape; ajv and the validator agree on the four shape refusals.
- **`ownerRule(schema, files, relation)`** (`paths.ts`) compiles the whole rule from the files: `loginHop` → the
  chain → back along the owner link. `worldRule()` took the login and the chain from its caller. A chain the nouns
  allow and the schema cannot follow (a list read the other way round) is refused there, and **the runner refuses it
  too** (`ok: false` at `relations[i].through`), rather than asking questions over it.
- **The runner** asks "through what?" once a noun signs in (before that, who signs in is the question). The question
  has its home, the `visible-to-all` mutants and the path question's incident. A chain said goes on the record in
  words ("membership where role is holder"). `diffWorld` names a changed chain (`relation-through`). The brief has
  one sentence about it.
- **Graded.** `tests/through.test.ts` 26 (fixture `world-owned-through`: the membership world, the person signs in, a
  note that is its account's, through membership as holder), with three mutants each red on its own cases (the
  validator's end check gone, 2; the chain dropped from `ownerRule`, 3; asked although answered, 2).
  `nodegx-backend/tests/ont-002-through.test.ts` runs the compiled rule as the `$path` on SQLite and PostgreSQL. A
  holder of two accounts sees both notes, the other holder theirs, a member none. With the engine ignoring hop
  filters (`path-ignores-hop-filters`), the member sees `["n1","n2"]`: caught on both engines.
- Measured (13:20–13:30 CEST): `nodegx-project-contract` **245 / 245**, `tsc` clean (both configs);
  `ont-002-through` **4 / 4**; `noodl-mcp` `ont002WorldTools` + `toolDisclosure` **30 / 30**, surface **8,261**
  (unchanged: the brief is read only through `validate_world`).
- **Not built:** `all` (a tree step) in a chain, which needs a depth the format has no word for yet; checking a
  step's `where` names a field the record it lands on has (the engine reads an unknown field as no match). Nothing
  writes the rule into `security.json`: who may see what is BMG-006's, and ONT-008's page is the first writer.
