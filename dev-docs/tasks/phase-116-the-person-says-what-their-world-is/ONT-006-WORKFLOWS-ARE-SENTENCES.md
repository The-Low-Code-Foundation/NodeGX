# ONT-006 — Workflows are sentences

**Opened 2026-10-08.** **Depends on ONT-001 and NSP-014** (✅). **Status: 🟡 s9 (2026-10-09, Fable 5.1) — AC1 ✅ (the engine and the world), AC2 ✅ (three rows, both engines), AC3 ✅; §3.4's view is ONT-008's. **s10 (Opus 5.5):** the MCP's world tools read and write the fourth file; a write that leaves the verbs out grades them against the world it writes; the runner takes an arm's answer; the reach names verbs (ONT-007 §6.10). See §6.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Fable 5.1** — it invents a small language (a verb over the graph with named failure arms); the sentence shape wrong is a phase-level mistake, not a bug. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Fable 5.1; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **The thing I do every week is a sentence over my world with its failures named, and when a step cannot be done the
> system says which one and why, in the words I used.**

## 2. Why

README §1 readings 4 and 7. The workflow engine has fifteen step kinds with error edges; the 24 backend nodes are
specced as the requests they make and what they do with each answer, failures included (NSP-014 AC5). What does not
exist is the workflow as a sentence. Acme's enrolment note is that sentence, written by hand after an incident:
*when a membership is activated, create or update the person here, create or update them in the mailing system,
enrol them in the learning platform; if they have no account there yet, skip the enrolment and record it.* The
"skip and record" arm is P107's known row for a person: counted, never hidden.

## 3. What to build

1. **The verb.** `verbs.json` in `docs/world/`: a sentence, the nouns and relations it touches, its steps as sentences,
   and its failure arms, each with what the person sees. A verb's steps bind to step kinds and to specced nodes by
   name; the binding is checked by the validator.
2. **The projection.** A verb projects to a workflow definition (`WorkflowDefinition`, `steps`, success and error
   edges) through the admin workflow route, never by hand; the failure arms become error edges whose target step
   records the arm in the person's words.
3. **The grade.** A verb's claims played through NSP-014's world: the requests it makes, in order, and the arm taken on
   each scripted failure. The enrolment fixture: the member exists elsewhere → three requests and done; the member does
   not → two requests, the arm "no account there yet" recorded, the membership still created.
4. **The view.** Each verb is a button in the data manager (ONT-008) with its sentence under it, and a run shows the
   arm taken in the person's words, from the engine's run record (BMG-009's Runs page already lists runs; this adds the
   sentence).

## 4. Acceptance criteria

1. The enrolment verb projects to a runnable workflow and both arms are taken on the fixture, with the request count
   asserted in the world.
2. The archive verb (the archive note's table, "stays / ends") projects to a workflow whose steps are the rows of
   that table, and a claim per row passes on both adapters.
3. A verb that names a step kind or a node that does not exist is refused by the validator with the name expected.

## 5. Watch for

- **A throw wears the emitter's name** (memory). The arm recorded must name the step that took it, not the one that
  reported it.
- **Cloud-only nodes** (NSP-022) are not specced; a verb that binds to one is `outside` in the runner's words, counted.
- **Server-side verbs** run in the engine; client-side ones in the app. The verb says which, and the projection
  refuses a mix it cannot honour.

## 6. Built

### 6.1 s9, 2026-10-09 — the language, the projection, the grade (Fable 5.1)

| Piece | Where | What it does |
|---|---|---|
| The file | `docs/world/verbs.json` (`VERBS_FILE`); `WorldFiles.verbs?` — the fourth file, optional; `schemas/world.schema.json` `verbsFile` | A verb: `id`, the person's `name` for it, the whole `sentence` (failures included), `when` (what sets it off), `runs` (`server` — the backend's engine — or `app`), `about` (the nouns and relations it touches), `steps`. A step: `says`, `does` — `make`, `update`, `end`, `remove`, `keep` here, `ask` another system — `on` (a noun, or a relation that is a record of its own), `fields` (an update's), `by` (an end's date, when the kind does not say), `system` (an ask's, in the words an `exists-elsewhere` relation names it), `node` and `kind` (the bindings, when not the ones `does` implies), and one `fails` arm. An arm: `when`, `then` (`record-and-go-on` past the steps it `skips`, or `stop`), `sees` (what the person sees), `answers` (the question of a relation's kind it is the answer to — the enrolment note answers `exists-elsewhere`'s `hereFirst`). |
| The validator | `validateVerbs()` (`world/verbs.ts`); `validateWorld()` runs it when the file is there, over a world the three files already describe | Every binding checked by name, every refusal naming what was expected (AC3): the noun or relation (`one of person, account, membership`), the system (`one of the learning platform, the mailing system`), the node (`one of the specced nodes: …` — `VERB_NODES`, NSP-014's 24 with where each runs from the census, pinned by test to the spec package's scenario files), the step kind (`VERB_STEP_KINDS`, the engine's fifteen, pinned by test to `workflow/types.ts`), the question. A server verb bound to an app-only node, or an app verb to a cloud-only one, is "a mix the projection cannot honour". A cloud-only node (NSP-022, specced nowhere) is **`outside`**: counted by verb and step, never refused, never hidden. World-aware: an `end` with nothing to mark it (no `by`, no `ends` relation, no `startsEnds`) is refused with what would; a `remove` of a noun that `ends` is refused as the end-by-delete mistake; an `update` must name the properties it writes (an update that writes nothing cannot be graded); a `keep` binds to no node and cannot fail; an arm's `skips` are the steps right after its own, in order. |
| The projection | `projectVerb()` (`world/verb-project.ts`) → `VerbWorkflow` (`WorkflowInput`'s shape: the registry owns the timestamps) + `VerbFunction[]` | A step is a `call-function` step named `<verb>-<step>` (the component at `/#__cloud__/<verb>-<step>`, which `workflowReach` already finds), `next` the step after; a `keep` is a `transform` whose output notes what stays; an arm is the step the `onError` edge leads to — a `transform` that records `{ arm, step, when, sees, error: previous.error.message }` and goes on past the skipped steps, or a `stop` with the arm's words and `isError`. The functions the agent owes: `ref`, what it does, the node that does it, the collection and fields, an end's field (`until` for an `is-on` with dates, `endedAt` for a noun that `ends`), the system. |
| The claims | `verbClaims()`; `ClaimStep` grew `there` (the row is still there) and `holds` (a field holds exactly a value) in `project.ts` and the backend contract's `claims.ts` | A claim per row that touches records, in ONT-003's shape so `runClaim` grades it on any engine: `make` → made; `update` → changed and read back, field by field; `end` → the end field set, read back, and the row still there; `remove` → gone; **`keep` → not held**: "their record stays" is what the store does not keep (who may delete is the collection's permissions, BMG-006) — the claim is `remove … refused` and measured to fail at that step, as ONT-003's not-held claims are. An `ask` has no record claim: its grade is the request and the arm. |
| The words | `verbWords()` | The sentence, when, where it runs; each step with what does it (`makes a person (Create Record)`, `asks the learning platform (HTTP Request)`); each arm (`If they have no account there yet: it is recorded and the verb goes on, without enrol. You see: “…”`); a step with no arm: `the verb stops there and says which step, and why`; the outside count. |
| The write rule | `planWorldWrite` writes the fourth file when the candidate has it; the revision takes it in only when it is there | A world of three files keeps the revision it had. |

### 6.2 Decisions

- **One arm per step.** The engine routes every failure of a step down its one `onError` edge; a step cannot tell "no account there" from "the platform is down" without a `switch` on `previous.error` — a structure in the engine's words, not the person's. So a step has one arm, and a second kind of failure is a second step (the validator says so). The default, no arm, is the engine's own: the run halts at the step and says which.
- **The sentence stays in the file.** `WorkflowDefinition` has no description and the registry rebuilds a definition from a whitelist, so the sentence lives in `verbs.json` by workflow id, and a view reads it from there (§3.4, ONT-008). What a run shows is the arm's `sees`, in the arm step's output.
- **A keep is a step.** The archive note's rows are "stays / ends"; a stays row is a `transform` that notes it, so the run says it in the person's words, and its claim measures what the store does not keep.
- **Where it runs is a declaration the validator honours**, against the census's `availableIn` for each node; `runs: 'app'` projects to the same definition and is the app's to run (not built: the engine is server-side).
- **The world's grade lives in the backend's jest.** `@nodegx/node-spec`'s interpreter is played through ts-jest from `nodegx-backend/tests` (a relative `require` of `src/adapter`, `src/adapters/interpreter`, `src/world`), behind a guard that names why if it cannot load. It loaded.
- **The fixture names two other systems, on two nouns** — bug `P116-ONT-003-two-systems` (§6.6): two `exists-elsewhere` relations from one noun cannot project. The mailing relation is on the account and says so.

### 6.3 Graded

Readings 2026-10-09 ~18:25 CEST on the working tree over HEAD `6b4e37b13`, in band, no peer suite:

- `nodegx-project-contract` `npx jest tests/verbs.test.ts`: **25 / 25** (the whole package 182 / 182): the fixture (the enrolment note and the archive note as `verbs.json`) validates with nothing outside and passes the JSON Schema; AC3's refusals, each naming what was expected; a cloud-only node counted; the projection's steps, edges, arm params and functions for both verbs and for an arm that stops; the claims' shapes; the words; `VERB_NODES` ⇔ the spec package's scenario files, `VERB_STEP_KINDS` ⇔ `types.ts`; the write rule's fourth file and revision.
- `nodegx-backend` `npx jest --runInBand tests/ont-006-verbs`: **16 / 16, exit 0** — AC1 in the REAL engine (`WorkflowEngine` with `CompositeStepExecutor`'s real `transform` and `stop`, the functions scripted): both definitions pass `validateWorkflowDefinition`; the member exists → three requests, every step done, the arm skipped; the member does not → two requests, `learning-account` error, `no-account-there` success with `{ arm, step, when, sees, error: 'no such learner' }`, `enrol` skipped, the run a success; the mutant (the error edge taken out) halts the run (`unroutedError`); an arm that stops fails the run with the arm's words; the archive verb keeps its note and goes on past the arm to the person's own end. AC1 in NSP-014's world (the interpreter): an `ask` is one `request`, a 404 its Failure and a 200 its Done; a `make` is one `create` handed to the backend (R9), a refusal its Failure. AC2 on SQLite and PostgreSQL: the archive verb's three rows — `record-stays` not held and failing at the refused remove, `memberships-end` and `person-ends` held and passing; the mutant (the end never written) fails at the read-back (`until holds …`); the enrolment's one row passes.
- Not regressed: `nodegx-backend-contract` 199 / 199; `npm run ontology-census:check` fresh. The older ONT specs and the MCP's world tools: §6.3 of the handoff's next reading, run after this file was written (see NEXT-SESSION-PROMPT).

### 6.4 Acceptance

1. ✅ **The enrolment verb** projects to a definition the admin route takes and runs in the engine; both arms are taken on the fixture; the requests are counted in the engine (every `ask` function called: 3 and 2) and in the world (one request per ask, the 404 the arm hangs on).
2. ✅ **The archive verb**'s steps are the rows of the note's table (stays; memberships end; access ends; the person has left), and a claim per record row passes on both adapters — with "stays" measured not kept by the store, as the thesis says it is not (permissions are BMG-006's).
3. ✅ A verb naming a node or a step kind that does not exist is refused with the name expected.
§3.4, the view: ONT-008's (a button per verb with the sentence under it; the run's arm from `sees`).

### 6.5 Owed

- ~~The MCP's world tools do not read the fourth file.~~ s10, §6.7.
- ~~`workflowReach`'s sibling.~~ s10: `verbReach()`, ONT-007 §6.10; AC1 ✅ there.
- ~~The runner counts an arm's `answers`.~~ s10, §6.7.
- The real cloud functions (`enrol-person-here`, …) are the agent's to write; the claims grade them the same way once they exist (ONT-009).

### 6.6 Found

- **Bug `P116-ONT-003-two-systems`** (medium): two `exists-elsewhere` relations from one noun both make `idElsewhere`, and the projection refuses the world — a person in two other systems, the corpus's common case, cannot be said. **Fixed s13** (ONT-003 §6.8): the field is named after the relation (`mailingId`). The `world-verbs` fixture still has the mailing relation on the account; it was not moved back.
- **The engine records steps in its own order**: a skipped arm can be recorded before the steps that ran (topological, not the verb's). A view that lists a run's steps in the verb's order sorts by the verb (ONT-008).

### 6.7 s10, 2026-10-09 — the fourth file on the MCP, the write rule, the runner (Opus 5.5)

| Piece | Where | What it does |
|---|---|---|
| `validate_world` reads `verbs.json` | `noodl-mcp/src/tools/worldTools.ts` | Read when it is there (its text joins the revision only then, so a world of three files keeps its revision); graded with the three through `nextQuestions` → `validateWorld`; the answer gains `verbs`: `outside`, and per verb its words (`verbWords`) and the functions it calls (`projectVerb`'s — what the agent writes). Unreadable ⇒ `partial`, named in `unreadable`. |
| `write_world` takes `verbs` | same | Optional. Left out, the verbs on disk are kept. |
| The write rule grades kept verbs | `world/write.ts` `planWorldWrite` | **Found:** a write that left the verbs out validated only the three files, so taking out a relation (or renaming a noun) a verb names was written, and `verbs.json` pointed at nothing. Now the kept verbs are graded against the candidate; a verbs file on disk that is not JSON stops such a write ("pass the verbs with the write"). Mutant-checked in the contract and through the MCP. |
| The runner takes an arm's answer | `world/runner.ts` `nextQuestions` | A question the relation has not answered, which a failure arm `answers`, is not asked: it goes on the record with `said` = the arm's `sees` and `by: { verb, step, arm }`. The relation's own answer, when there is one, stays the record. |
| An arm answers in words only | `world/verbs.ts` `validateVerbs` | **Decision (s10, for Fable/Richard to revisit):** an arm's answer is its words — what is skipped, what the person sees — so it may answer only a question whose answer is `words` (`exists-elsewhere`: `hereFirst`, `nameThere`, `endsThere`). An arm naming a yes/no or one-of question is refused with where to write it instead (`relations[<id>].answers`). |
| The brief | `world/brief.ts` | "What the person does": the fourth file, optional, a step's one way to fail, the functions are the agent's to write; "Verbs you leave out are kept". Passes the content-authoring `written.py` lint; pinned in `brief.test.ts`. |

**Graded** (2026-10-09, over `d53e5f283` then `333ffbc65`, in band): contract **192 / 192** (`verbs.test.ts` 25 → 31;
`brief.test.ts` pins the new paragraph), both tsconfigs clean (two type errors in s9's specs that only
`tsconfig.tests.json` sees, fixed). `noodl-mcp` `ont002WorldTools toolDisclosure` **30 / 30** (`ont002WorldTools` 7 → 12),
`[surface] 8261 tokens / 20 resident tools — 19 under` — unchanged, both tools deferred (one arm: the working tree; s9's
8,261 on HEAD is the other). Backend `ont-006-verbs ont-007-migration ont-005-mutants ont-003-claims ont-003-write`
**122 / 122**. Mutants: the kept-verbs grade off (red in the contract and the MCP); the arm lookup off; the relation's
answer replaced by the arm's; the words-only refusal off — each red on its own spec only.

