# Phase 132 — A backend workflow you can build by hand

**Opened:** 2026-11-02, on Richard's ask after he tested Studio's Backend tab on Greenhouse ("let's scope this up").
**State:** BWF-001 built 2026-11-02 (s1: nodegx-studio `1cc7aa5`, NodeGX `f14e46fe8`); P132-STEPPANEL found with Richard and fixed (nodegx-studio `2702c96`). BWF-002 built in s2 (NodeGX `4aec3b83b` + `511e41d5d`, nodegx-studio `0872094`). BWF-003 built in s3 (Studio only, nodegx-studio `b4609f8`). BWF-004 built in s4 (NodeGX `8d9907ccf`, nodegx-studio `759b834` + `550d82a`), AC4's agent run open. **Lane:** 9 (the backend in the open) with lane 2 (Studio). It is on the Beta path:
Richard's Beta (BOARD §2, 2026-10-23) is someone like him "building a simple app in Studio, **editing workflows** and
the DB, privacy rules, road testing it and deploying to a VM".
**Read first:** this page, then [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md), then the task you take.

## What Richard asked for (verbatim, 2026-11-02)

> "Basically the whole backend workflows thing is based. I expected it to be something akin to Bubble's backend
> workflows, or in my dreams something like n8n. Can we not shoot for the stars and try to make an n8n clone? Dynamic
> values coming from previous workflow runs and all that stuff. I mean most people won't ever use it manually and will
> let Claude do it for them. BUT our ethos is.... drumroll.... that they'd have the option of visually editing if they
> want to."

> "Also, I hope … that if I open the full NodeGX Editor I'll see these workflows and functions and be able to edit them
> as I used to be able to do in Noodl?"

His five points from the Greenhouse test (Studio from the checkout at nodegx-studio `16c4456`, Greenhouse's real
backend on :8625; screenshot of *TriggerTest* in the Backend tab):

1. A step can't be clicked to edit or see its settings; a step can't be added to an existing workflow.
2. New workflow → *Starts on: Time of day* still shows the table-change fields beside the time; no choice changes the form.
3. The workflow he made with a trigger is not under *Functions*, "even though it is a function I think".
4. Steps can only be added at the start; an If with a Yes branch shows no Yes or No on the canvas.
5. Most steps need code or JSON.

## Richard's re-walk (verbatim, 2026-11-03, Studio on Greenhouse, screenshot of Call an API's Query with *A formula* open)

> "It's still confusing AF. So let's take 'Every day at 8:00' as an example. I want to know what this workflow does and
> where it gets its data from. I open it and I can click the node 'Every day at 8:00' and change the schedule. But
> that's the only thing I can edit in this workflow. If I click the function call, I get taken to that function
> workflow, which is in the same list as its parent scheduled workflow. So it feels bizarre. Why do the scheduled
> workflows even exist as separate entities to the full 'function' workflows and live in the same list?"

> "Additionally, the 'reusable pieces' list doesn't seem to have any controls. I can't see to create a reusable piece
> from scratch, not select a bunch of nodes in a workflow and group them into a reusable piece."

> "When I made a workflow and tried to add a 'delete a record' node, it refused and said I need to have a record to
> delete before adding this. … How does the system know I won't be able to reference the id of the record to delete
> from the 'input' data coming from the first node of the workflow?? It could be a dynamic value I set based on the
> input data."

> "When I made a branch in a workflow, then added a second node to each branch, they flip and the connectors are
> crossed, so the bottom branch continues on the top row, and the top on the bottom row, for no reason seemingly."

> "It'd be nice to save API calls with the 'Call an API' node, like in Bubble, so you can reuse them in other workflows"

> "The 'A formula' options in the workflow node props has the operator stuck to its description text, see screenshot"

> "In n8n and other similar tools, selecting 'from the run' is just a way of inserting a dynamic value into an
> expression. You might want to have 'from the run - SomeStep items:first value' like with the expression composer in
> the Studio in the front end workflow steps, way more customisable."

> "When the value is 'typed' but you know this field takes a bool or integer, it shouldn't offer you always a free text
> field, it should be appropriate to the type it represents if known"

What each was, measured the same day (s12): four were bugs, fixed in nodegx-studio `d4c72c0`: the formula menu's
words (P132-FXMENUWORDS), the crossed branch rows (P132-BRANCHROWSCROSS), a record step refused at the add with no
table change behind the run (P132-RECORDSTEPREFUSED: Studio wrote `record: ''`, the backend refused it; nothing
judged what could reach the step), and typed fields always text (P132-TYPEDISTEXT). *Every morning at 08:00* is a
**trigger**, drawn as a row of its own above the workflow it starts (P132-TRIGGERROWS, BWF-001 item 8's fold, never
done): BWF-010. The other three are R6–R8 below, BWF-011..013.

## The rulings (Richard, 2026-11-02, on the four questions put to him)

| # | question | ruling |
|---|---|---|
| R1 | One concept or two? | **Keep both underneath.** Cloud functions stay node graphs (Noodl's, the app's screens call them); workflows stay step lists the backend runs. Studio shows a person one list of workflows; a function is "a reusable piece a workflow or a screen can run". |
| R2 | Formulas in a step's settings? | **"Ok"**: a small fixed set of formulas (maths, joining text, dates, is empty), no JavaScript in a setting. The engine's no-eval rule (`workflow/values.ts:19-25`) stands. |
| R3 | Connectors to other services? | **"Yep"**: *Call an API* with keys kept in Secrets, nothing more for Beta. No connector library. |
| R4 | Order? | **"A first is fine"**: what's broken first (BWF-001), then the data (BWF-002..004), then the action steps (BWF-005..007), then the NodeGX editor (BWF-008), then the test (BWF-009). |
| R5 | (2026-11-03, BWF-005) Whose privacy rules does a record step obey? | **"A switch per workflow"**: a Bubble-style *Ignore privacy rules* setting on each workflow, **on by default**. On, a record step reads and writes as the app (as a Record node inside a cloud function does today, whatever started the run); off, it acts as whoever the run is for. Put to him with the measurement: a function's record access runs as the system (`service.ts:638-645`, the loopback's admin key) and its Request node's "signed in only" is the only check; Greenhouse's Plant may be changed by its creator only, so *Mark watered* rebuilt as a step works only with the switch on. Chosen over "always as the app" (recommended) and "as the app except webhooks". |
| R6 | (2026-11-03, the re-walk) *"When you make a reusable piece by hand in Studio, what should it be?"* (the list was the cloud functions, which Studio cannot make, and steps cannot be grouped into one) | **"A workflow others run"**: a piece is a workflow with no trigger; a new *Run a workflow* step passes values in and gets its answer back; selecting steps → *Make a reusable piece* moves them into a new workflow and leaves one Run step behind. Cloud functions stay in the list as pieces the agent made. A screen running a hand-made piece is later. Chosen over "Studio builds cloud functions by hand" (steps cannot be grouped into a node graph) and "after the Beta". **Reverses "sub-workflows" in Not taking.** |
| R7 | (2026-11-03) *"Saved API calls, like Bubble's API Connector … Before the Beta or after?"* | **Before the Beta.** A call set up once (address, method, key from Secrets, which parts change), named, kept in the project's files; picked by name in any workflow, only its blanks filled; the agent uses them too. Narrows R3's "nothing more for Beta" by this one thing; still no connector library. |
| R8 | (2026-11-03) *"Values built inside a setting, like n8n and Studio's front-end composer … Before the Beta or after?"* | **Before the Beta.** Text with values dropped in anywhere, and a picked value refined step by step ("Find plants → items → first → name"), built from the formulas underneath (R2 stands: no JavaScript). Replaces "the whole setting is one pill or one formula". |

## What is already there (measured 2026-11-02, so nobody re-derives it)

The **engine is already n8n-shaped**; what is missing is what a person touches.

- `packages/nodegx-backend/src/workflow/`: `WorkflowRunner.ts:281`; the catalog `steps/kinds.ts:312` (v1.7.0), served at
  `GET /admin/workflow-step-kinds` with each kind's params, routes and **output shape**. Kinds: `call-function`,
  `branch` (`ontrue`/`onfalse`), `switch`, `for-each`, `merge`, `transform`, `validate`, `filter`, `sort`,
  `deduplicate`, `split`, `stop`, `return`, `wait`, `wait-until`. **No step acts on the data or the world**: a record,
  an API, an email all live inside a cloud function today.
- A step reads earlier data through `{"$path": "…"}` from `body`, `trigger`, `headers`, `query`, `previous`,
  `upstream.<stepId>` (`values.ts:325-365`), or `{"$literal": …}`. No templating, no expressions, on purpose.
- A step has `next` (always followed), `routes` (named), `onError`; cycles refused at write (`WorkflowEngine.ts:159`);
  loops only through `for-each`. Storage: `nodegx.automations.json` (`automations/shape.ts:18-29`), the file is the
  truth (P127 BKO-001, R1).
- Triggers: `schedule` (cron, missed/overlap policy, payload), `webhook` (slug, HMAC or token), `db-change` (collection,
  create/update/delete); each targets a function or a workflow (`triggers/registry.ts`).
- Already served: `POST /admin/workflow-defs/:id/run` (a run on demand; `wait:false` answers 202 with the execution id),
  `POST /admin/workflow-defs/validate` (the dry run: `valid`, `errors`, the stored `definition`), each run's steps with
  `inputData` / `outputData` (STU-092). The backend has SMTP (`email/Mailer.ts`, the manager's Email page) and a
  secrets store (`config/SecretsStore.ts`).
- **Studio** (`nodegx-studio/editor/studio.html`, STU-092 s30, STU-099 s35): a step card's click → `pickAutoStep`
  (5467) → `renderAutoStepPanel` in `#wfinspect` (5618-5691), with *Add a step after*, *Add on Yes*, *Move earlier /
  later*; gates `check:automations` 52/52 + 42/42 green. Richard still could not open it (BWF-001 measures why). Every
  wire is drawn as `then` or `fail` from one `out` port (5418, 5496); the route words exist only in the panel
  (`ROUTE_WORDS` 5508). The New form (5713-5735) toggles two prebuilt rows; first step = a function or an end.
  *From the run* is a free-text `$path` box with a datalist (5572-5592) that offers every step, upstream or not, and no
  field names.
- **The NodeGX editor**: cloud functions are in the Components panel as node graphs, as in Noodl
  (`ComponentsPanelNew/componentSections.ts:38`, `createMenu.ts`). A **Workflows** sidebar panel exists
  (`router.setup.ts:438-448`, `models/workflow/*`), drawn as a graph with triggers as entry nodes, **read from the
  running backend over IPC, not from the file**; its header comment still says workflows "survive no git clone"
  (`WorkflowsPanel.tsx:38-43`), stale since BKO-001. Its value input has a predecessor picker from correctly computed
  upstream steps (`WorkflowValueInput.tsx:74-167`, `workflowScope.ts`). Not yet opened on Greenhouse: BWF-008's first step.

## The tasks, in order

| id | task | what it is | size | state |
|---|---|---|---|---|
| [BWF-001](BWF-001-WHAT-RICHARD-MET-FIXED.md) | What Richard met, fixed | the step panel opening in the app, a Starts-on form per kind (webhook too), Yes/No drawn on their wires, a + on every wire, a branch never given a hidden `next`, any first step, R1's words in the list | 1 session | **built s1**; STEPPANEL fixed with Richard (`2702c96`) |
| [BWF-002](BWF-002-RUN-IT-ON-SAMPLE-DATA.md) | Run it on sample data | *Test the workflow* / *Test up to this step* with a sample the person picks (a real row, a body); every step's in and out shown | 1 session | **built s2**; tests need a NodeGX release with `511e41d5d` in Studio from the kit |
| [BWF-003](BWF-003-PICK-A-VALUE-FROM-WHAT-CAME-BEFORE.md) | Pick a value from what came before | the trigger's and each upstream step's output as a field tree; click or drag a field into a setting; a value drawn as a pill in words | 1–2 sessions | **built s3**; text with values waits on BWF-004 |
| [BWF-004](BWF-004-FORMULAS-WITHOUT-CODE.md) | Formulas without code (R2) | `{"$fn": …}` in the engine, a closed set; text with values in it; in the catalog for the agent | 1–2 sessions | **built s4**; AC4 green s5 |
| [BWF-005](BWF-005-STEPS-THAT-ACT-ON-THE-DATA.md) | Steps that act on the data | *Create / Change / Delete a record*, *Find records*: new kinds in the engine, the agent's vocabulary, Studio's forms from the table's fields | 2–3 sessions | **built s6**, AC1–AC4 green (AC3 in the Electron app); Studio `c67b142`; needs a NodeGX release for Studio from the kit |
| [BWF-006](BWF-006-CALL-AN-API.md) | Call an API (R3) | an `http-request` kind, its key named from Secrets, never written into the file | 1 session | **built s7**, AC1–AC3 green (AC3 in the Electron app, a real weather API); NodeGX `c3a95ea65`, Studio `0ad1573`; needs a NodeGX release for Studio from the kit |
| [BWF-007](BWF-007-SEND-AN-EMAIL.md) | Send an email | a `send-email` kind over the backend's SMTP, refusing in words when none is set | ½ session | **built s8**, AC1–AC2 green (AC2 in the Electron app, an SMTP catcher); fixed P132-PARAMSHADOW on the way; Studio `9a4287c`; needs a NodeGX release for Studio from the kit |
| [BWF-008](BWF-008-THE-NODEGX-EDITOR-EDITS-THEM-TOO.md) | The NodeGX editor edits them too | its Workflows panel reads and writes the file, draws the new kinds, the same picker and formulas | 1–2 sessions | **s9: step 1 measured (AC1), items 2+4 built**, AC3 and AC2's editor half green in the app; item 3 (words, picker) and AC2's crossing open |
| [BWF-010](BWF-010-THE-TRIGGER-IS-THE-FIRST-STEP.md) ✅ s13 | The trigger is the first step | one row per workflow; what starts it is the first card on its own canvas, changed there (P132-TRIGGERROWS) | 1 session | done s13 |
| [BWF-011](BWF-011-A-VALUE-COMPOSED-IN-ANY-SETTING.md) ✅ s14 | A value composed in any setting (R8) | text with values anywhere in it, a picked value refined (items → first → name), as formulas underneath | 1–2 sessions | done s14 (Studio; the editor open) |
| [BWF-012](BWF-012-SAVED-API-CALLS.md) | Saved API calls (R7) | a call named once in the project's files, picked by name in any workflow, its blanks filled | 1 session | **next** |
| [BWF-013](BWF-013-A-REUSABLE-PIECE-IS-A-WORKFLOW-OTHERS-RUN.md) | A reusable piece is a workflow others run (R6) | *Run a workflow* step; New piece; select steps → *Make a reusable piece* | 2 sessions | open |
| [BWF-009](BWF-009-THE-TEST.md) | The test | Richard builds three workflows by hand with no code and no JSON; an agent builds the same three; both editors draw them | 1 session + Richard | last |

About **10–13 sessions**. BWF-001 alone is what makes today's Backend tab usable; BWF-002..004 are the n8n feel;
BWF-005..007 remove the code.

## Rules for every task here

1. **The file is the truth** (BKO-001 R1). Every write goes backend first (validates), then `nodegx.automations.json`,
   the backend put back if the file fails: Studio's `saveWorkflow` (`serve.mjs:373`) and the MCP's
   `update_backend_workflow` already do it. A new step kind is new rows in `kinds.ts`, never a Studio-only shape.
2. **One catalog, three readers.** Studio, the NodeGX editor and the agent all draw from `GET /admin/workflow-step-kinds`.
   A form is generated from a param's declared type; a hand-built form per kind is the exception, said in the kind's row.
3. **No eval** (R2). A formula is a named function from a closed list in `values.ts`; an unknown one is a `validate`
   error naming the list.
4. **The agent's half is in every action-step task.** The MCP's tool budget (`toolGroups.ts`,
   `tests/toolDisclosure.test.ts`) is not raised: the kinds arrive through the catalog the backend group already reads.
   Say in the instructions that a record or an API call no longer needs a cloud function.
5. **Drive a copy** of Greenhouse with `NODEGX_BACKENDS_DIR=<scratch>/backends` and `metadata.cloudservices` deleted
   (P123-STU-COPYADOPTS). Grade the Electron app, not only the Chrome gate: Richard's point 1 is a panel the gate says
   opens.
6. **Bugs go to the ledger** as `P132-*` rows with `launch: beta` when they touch the walk.

## Not taking (so it is not reopened at full price)

- **A connector library** (Slack, Gmail, Sheets…). R3: *Call an API* + Secrets covers them for Beta.
- **JavaScript in a setting** (n8n's `{{ $json.x * 2 }}`). R2. Code still has a home: a cloud function's Function node.
- **Merging functions and workflows into one object.** R1.
- **Ask an AI as a step.** Not asked; it is *Call an API* with a key until Richard names it.
- ~~Sub-workflows~~: R6 (2026-11-03) takes them as BWF-013. **Loops other than for-each** stay out: the engine refuses cycles on purpose, and a workflow that runs itself (directly or round a ring) must be refused the same way.
- *(the line as it stood, kept for the record:)* **Loops other than for-each, and sub-workflows.** The engine refuses cycles on purpose; a workflow that calls another
  is a later question with its own measurement.

## Rulings owed (Richard), when the task reaches them

- ~~BWF-005: who a record step acts as.~~ Ruled 2026-11-03: R5 above.

## Bugs filed with this phase

`P132-STEPPANEL` (high), `P132-STARTSONFORM`, `P132-NOROUTELABELS`, `P132-BRANCHNEXT` (all `launch: beta`, all
BWF-001's); `P132-EDITORREADSBACKEND` (BWF-008's, fixed s9), `P132-EDITORTRIGGERPUT` (fixed s9), `P132-STUDIOPRIVACYDROP` (open, `launch: beta`); `P132-FILTERNOCONDITION` (`launch: beta`, found in BWF-003); `P132-STEPMENUOFFSCREEN` (`launch: beta`, found in BWF-004). `P132-STU093WORDS` (a Studio gate, fixed) and `P132-BST006GOLDEN` (the MCP's briefing capture, open), met in BWF-005. From Richard's re-walk (s12, nodegx-studio `d4c72c0`): `P132-FXMENUWORDS`, `P132-BRANCHROWSCROSS`, `P132-RECORDSTEPREFUSED`, `P132-TYPEDISTEXT` (fixed), `P132-TRIGGERROWS` (scheduled, BWF-010). `node scripts/bugs.js --from P132`.
