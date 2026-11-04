# BWF-013 — A reusable piece is a workflow others run (R6)

**Phase:** [132](README.md). **Ruling:** R6 (2026-11-03). **Size:** about 2 sessions (engine kind, Studio list and
selection, the editor drawing the kind).

## What he met

> "the 'reusable pieces' list doesn't seem to have any controls. I can't see to create a reusable piece from scratch,
> not select a bunch of nodes in a workflow and group them into a reusable piece."

*Reusable pieces* is the cloud functions list (`renderFnList`): node graphs Studio cannot create, no *New*, and a
workflow's steps cannot become one (steps and nodes are different things). R6: a piece made by hand is a **workflow
with no trigger** that other workflows run. This reverses "sub-workflows" in the README's Not taking.

## Build

1. **Engine:** a `run-workflow` kind: `workflow` (an id), `send` (named values, arriving as the piece's `body`); its
   output is the piece's `return` value. Refused at write: a ring (A runs B runs A), checked across the definitions, as
   `WorkflowEngine.ts` refuses a cycle inside one; at run time a depth cap as a second guard. The run record links the
   child run to its parent step (*Open that run*). Agent catalog words: a piece is how to reuse steps.
2. **Studio list:** *Reusable pieces* shows the workflows no trigger starts, with *New* (a piece: name, first step), and
   the cloud functions under them as "made by the agent: open their steps". A piece's row says which workflows run it.
3. **Make a reusable piece:** select steps on the canvas (shift-press, or a drag box), *Make a reusable piece*: allowed
   when they form one chain in, one way out; they move into a new workflow ending in a `return` of the last step's
   output, and one *Run <piece>* step takes their place, its `send` filled with the values the moved steps read from
   before them (BWF-003's `upstreamOf` / `readSources` say which). Refused in words otherwise ("these steps have two
   ways out").
4. **The NodeGX editor** draws a `run-workflow` step with its piece's name and opens it (BWF-008's panel).

## Acceptance

- AC1: on a Greenhouse copy, *Find thirsty plants* made as a piece with *New*, run from *The morning check* and from a
  second workflow, both tested.
- AC2: two steps of *TriggerTest* grouped into a piece; the workflow's test gives the same result before and after.
- AC3: a ring is refused with both names; an agent asked to reuse steps across two workflows writes `run-workflow`.

## s16 (2026-11-04): Build 1 (the engine) built; Studio, *Make a reusable piece* and the editor are next

**The kind.** `run-workflow` (*Run a workflow*, category Workflow, beside *Call Function* in the catalog's order):
`workflow` (an id, required) and `send` (`{ <name>: value }`, each a literal, `$path` or formula, resolved by the
engine). The piece runs as **its own recorded run** through the same engine, `send` arriving as its `body` (built by
`buildRunPayload`, type `internal_event`, so `body.<name>` reads it as any run's body). The step's output is
`{ result, run }`: `result` what the piece answered (its `return`, else its last step's output), `run` the piece's run
id. Same `result` wrapper as a function step's, so `pathWords` already says `upstream.ask.result.x` as "x".
- The piece's record names its parent: `parentExecutionId`, `parentWorkflowId`, `parentStepId`, `pieceDepth` (for
  *Open that run* in both directions).
- A failing piece fails the step: `the piece "Always fails" failed at its step "Say no": <its message> (its run: …)`,
  so `onError` applies. A cancelled parent cancels the piece (through `onStarted`, the run id as soon as it opens).
- Handed on: the test mark, and "started by the app" (P127-BKO006-SCHEDULEAUTH). A piece run by a schedule's run
  counts as the app, though `internal_event` alone would not (`RunOptions.startedByApp`).
- **Rings refused at write** (`WorkflowRegistry.writeErrors` → `pieces.ts validatePieceUses`), naming them: `"ring-b"
  runs "ring-a", which runs "ring-b" again`, `"loop" runs itself`. **A depth cap of 8** at run time, the second guard.
- **A piece not written yet is a warning, not a refusal** (`definitionWarnings(def, hasWorkflow)` on the admin routes):
  a project file seeds workflow by workflow in its own order, and an agent may write the runner first. The step fails
  naming it if it runs.
- Catalog **1.11.0**, `pieces: true`. WORKFLOW-NODES.md has a `run-workflow` section.

Files: `workflow/pieces.ts` (pure: `pieceOf`, `piecesRunBy`, `ringThrough`, `ringWords`, `MAX_PIECE_DEPTH`),
`workflow/steps/runWorkflow.ts` (the executor and the `PieceRunner` seam), `WorkflowSubsystem.pieces` (the runner),
`StepExecContext.run` (`executionId`, `workflowId`, `depth`, `test`), `RunOptions.parent` / `startedByApp`.

**Gates.** `tests/p132-bwf-013-pieces.test.ts` 11/11 over a real BackendService: two workflows run one piece with
their own values (AC1's engine half); the record links; a failing piece's reason reaches the parent's `onError`; ring
and self refused with names (and the refused one is not stored); the unwritten piece warned then failing by name; the
test mark on the child; the depth cap; what is handed on; cancel. The 44 suites reaching the workflow layer: 670/677
with the 7 being pins this moves (the catalog version in 5, the `source` pattern that allowed only `BWF-00x`, the
kind list in 2), moved, all green. `tsc --noEmit` clean. No MCP or editor test pins the version or the kind list.

**Not done (next):**
- Build 2: Studio's *Reusable pieces* list shows workflows no trigger starts, with *New*; a piece's row says who runs
  it; cloud functions under them as "made by the agent". A `run-workflow` step's panel: a workflow picker
  (`control: 'workflow'`, new) and `send` as key-values with composers; *Open the piece ↗*; the run's *Open that run*.
- Build 3: *Make a reusable piece* from selected steps (shift-press), one chain in, one way out, `send` from
  `readSources`; refused in words otherwise.
- Build 4: the NodeGX editor draws the kind (it reads the catalog; `control: 'workflow'` is new to it, NOT CHECKED).
- The MCP: an agent can write `run-workflow` (it is a kind like any other); `list_backend_workflows` does not say who
  runs a piece. AC3's agent round after Build 2.
- Studio from the kit has none of it until a release carries catalog 1.11.0.
- Rebuild `packages/nodegx-backend/dist` before a Studio drive (`npm run build`): not done this session.

## s17 (2026-11-04): Build 2 (Studio) built; AC1 green in the Electron app by presses

nodegx-studio `c60dee2` (Build 2) and `fc1bc86` (what the Electron drive found). Only when the catalog says `pieces`
(1.11.0); an older backend keeps the old list, word for word (check:automations on the kit 100/100).

**The list.** *Reusable pieces* is the workflows no trigger starts (a trigger starting a FUNCTION of the same name
starts no workflow), each row "Run by “A” and “B” · n steps · last run…", with *New*. The cloud functions sit under
them, headed *Made by the agent*. A workflow nothing starts is no longer listed under *Workflows*: R6 as ruled, so
Richard's leftover `qzdzqzzq` (a switch, no trigger) on Greenhouse now lists as a piece no workflow runs.
*Workflows* keeps its own *New*.

**New piece** (`newAutoForm(e, { piece: true })`): a name and a first step, never what starts it; the note says how a
piece is run. Made with no trigger, opened.

**A Run a workflow step** (the catalog's kind, in the step menu as any kind is):
- Added, it runs the first piece it can run without a ring (else any other workflow); the person picks by name
  (`pieceField`, `control: 'workflow'`): pieces first, then *Workflows something starts*; this workflow is not
  offered, and a workflow that runs this one is shown "(it runs <this>)" and disabled.
- *What it sends the piece*: a composer per name the piece reads (`bodyNames`: `body.<name>` anywhere in its steps'
  settings, never inside a `$literal`), then any other name sent; *Add a value* asks a name (letters, digits, `_`).
- Its card: "Run <piece>", "a reusable piece", *Open the piece ↗* (Back returns to the step; Esc too).
- After a run or test, its panel has *Open that run ↗*: the piece opens on THAT run (`selAuto.runId`, read by
  `readAutoRun`), its steps lit, with "This run was started by <workflow>, at its step “…”. Open that run ↗" (the
  record's `parentWorkflowId` / `parentExecutionId` / `parentStepId`). A failed piece's run is found in the step's
  error ("(its run: …)", `runInFailure`).
- After it, *What it can read* says the piece's answer by its names (`pieceAnswers`: its `return`'s value keys), and
  `pathWords` drops `result` as for a function step.

**Inside a piece**: its first card says "A reusable piece · nothing starts it on its own", then "Run by A and B" (each
a press, opening that workflow), or "No workflow runs it yet"; *Add what starts it* stays (it then becomes a workflow).
*What it can read* shows what it was given as the names its runners send (`readSources` `sent`), before any run.
*Delete* says "It is run by “A” and “B”: that step fails once it is gone."

**Gates.** check:automations 161/161 unit lines (pieces, runners, sent and read names, rings through a second piece,
the run named in a failure, the reads); the Chrome drive 200/200 with `NODEGX_REPO` (a BWF-013 section of 36 lines:
New, two runners each picking the piece and sending their room, both tested, Open that run and Back, the row, the
ring refused at write with both ids, Delete's words), 100/100 on the kit (the section says it is not graded there).
check:editor 262/262, check:app 67/67, check:hosted 45/46 (*Delete type*: P132-HOSTEDRATELIMIT, the admin rate limit,
red at HEAD; this diff adds no backend call).

**AC1 in the Electron app** ([greenhouse-drive-bwf013.mjs](greenhouse-drive-bwf013.mjs), presses): *New* →
"Find thirsty plants", first step Check thirst, then a Return after it. *The morning check* (a time starts it) got
*Run a workflow* from *Add a step at the start*; *When a plant is watered* (a Watering row starts it) from *Add a step
after* its last step. Each picked the piece by name and sent `who`, typed after *Add a value*. The piece's Return
composed by presses: "Checked " + [checked · from Run Cloud Functions/Check thirst] + " plants for " + [who · from what
it was given]. Both tested from their test rows: "Checked 1 plants for the morning check", "Checked 1 plants for
watering", each with the piece's run id. *Open that run* lit the piece's two steps from that run and named its parent;
Back returned to the step, picked, its panel open. A ring probed inside the piece: the two runners "(it runs Find
thirsty plants)" not offered; the probe step deleted, the piece as before.

What the drive found (fixed in `fc1bc86`):
- **P132-STEPWORDSKIND** (filed, fixed): a value from an unnamed step said "from Call Function" beside a card titled
  "Run Cloud Functions/Check thirst". Since BWF-003, for every function step *New* makes. `stepTitle`, red on the
  old `automations.mjs` (measured).
- The first card ran its runner buttons together ("The morning checkWhen a plant is watered"): this session's own,
  never shipped.
- 🔴 Not a product defect, a drive one: the drive pressed the composer's CENTRE to type more words, and after a first
  value the centre is that value's chip, whose press opens the chip's menu; *+ A value* sat under it, so the second
  value and the words before it were never saved. The drive's log (`4 log`: every save the page sent, every panel
  redraw, focus) showed `mousedown pill chip`. A drive that continues a composed sentence presses near the box's END,
  where a person does.

**Not done (next):**
- Build 3: *Make a reusable piece* from selected steps (shift-press), one chain in and one way out, `send` from
  `readSources`; refused in words otherwise.
- Build 4: the NodeGX editor draws `run-workflow` (`control: 'workflow'` is new to it, NOT CHECKED).
- AC2 (two steps of TriggerTest grouped, same test result) waits on Build 3. AC3's agent round (an agent asked to
  reuse steps writes `run-workflow`) can run now: `list_backend_workflows` does not yet say who runs a piece.
- Asks for Richard: a workflow nothing starts now lists as a reusable piece (his `qzdzqzzq`); a new Run a workflow
  step starts on the FIRST piece in the file, not the newest.

## s18 (2026-11-04): Build 3 (*Make a reusable piece*) built; AC2 green in the Electron app by presses

nodegx-studio `2d11ca5`. Studio only, no engine change.

**Choosing.** A shift-press on a step's card chooses it (dashed outline); the step picked before the first shift-press
is chosen too, so "press one, shift-press another" chooses both. A plain press, Esc, *Clear* or opening another
workflow leaves the choice. The canvas hint says "Shift-press steps to make a reusable piece of them." A bar under the
workflow's buttons: "Steps 4 and 5 chosen" (the numbers on their cards: two unnamed steps running one function have
the same title), *Make a reusable piece*, *Clear*, and when they cannot be one piece, why, in words, the button off.

**When they can be one piece** (`automations.mjs pieceFrom`, pure, throws the sentence):
- one way in: one chosen step that the start, or a step outside them, leads to ("These steps have 2 ways in: …");
- at most one way out, the plain next of their only last step ("These steps have 2 ways out: “Branch (IF)” leads on to
  … and … on Yes. A piece comes back to one place."; a single way out on one side only is refused too: after a piece,
  what comes next always runs);
- no Return or Stop among them ("… ends the whole workflow: in a piece it would end only the piece");
- no step after them reads a moved step other than the last ("only the answer of its last step, … comes back out"),
  and no Merge after them (it collects by step name).

**What *Make it* writes** (the piece first, then the workflow, each through `saveAutoWf`):
- the piece: the chosen steps, entry the way-in step, then a Return of `upstream.<last>` (none when the last step has
  sides: the engine answers with it). No trigger.
- each value the moved steps read from before them (`body.*`, `trigger.*`, `upstream.<outside>.*`, the way-in step's
  `previous.*`) is sent by name, one name per path, named by its last part (`upstream.x.items.0.name` → `name`;
  `result` and positions skipped; a clash gets `_2`). Inside the piece each reads `body.<name>`. A Validate rule's
  `path` (a plain string, not a `$path`) is rewritten the same. What a step reads without saying is made explicit
  first: a list kind's `items` (the catalog's `previous.items` default), a Return's value.
- the workflow: one *Run <piece>* step where the moved steps were (in the file's place of the way-in step, every wire
  into it moved to the Run step, its `next` the way out). After it, `upstream.<last>…` reads `upstream.<run>.result…`
  and the next step's `previous…` reads `previous.result…`, so the workflow answers what it did.
- The form's note says what moves, what is sent, and that a moved function step is given what the piece is sent, not
  what started the workflow (a call-function's request body is the run payload + params + previous: inside a piece
  that payload is the piece's). Said, not refused.

**Gates.** check:automations unit lines 181/181 (19 for `pieceFrom`: TriggerTest's two steps, the Return that said
nothing, every refusal named, sends and their rewrites through formulas, `$literal` and Validate paths, a filter's
unsaid items and the step after it); two mutants red (drop the `previous.result` rewrite: 179/181; send nothing:
177/181). The Chrome drive 209/209 with `NODEGX_REPO` (a Build 3 block of 9: a four-step workflow answering "HELLO
KITCHEN", a Return chosen refused in words, picked + shift-pressed chosen, the form's note, the piece and the runner in
the file, the same answer after), 100/100 on the kit (not graded there). check:editor 262/262, check:app 67/67,
check:hosted 46/46 (45/46 on the first run: *Delete type*, P132-HOSTEDRATELIMIT, its toast a leftover; green on re-run).

**AC2 in the Electron app** ([greenhouse-drive-bwf013-ac2.mjs](greenhouse-drive-bwf013-ac2.mjs), presses, a
shift-press is a press with modifier 8): TriggerTest tested on a Plant, its Return's output `{"returned":true,"value":
{"result":{"checked":1,"changed":0}}}`. Transform + Branch shift-pressed: "These steps have 2 ways out …", Make off;
Clear. call-function-2 pressed, call-function shift-pressed: "Steps 4 and 5 chosen"; *Make a reusable piece*, "Check
twice", *Make it*. The file: `check-twice` = the two function steps and a Return of `upstream.call-function`, no
trigger; TriggerTest = transform, branch (its Always now on `run-workflow`), `run-workflow` → `first`, whose value is
now `previous.result`. The backend has both. Tested again: the same output, a number in it (the Return's input shows
the piece's wrapped answer, `{result: {result: …}, run}`: the rewrite is what kept it the same). *Open that run* on the
Run step lit the piece's three steps and named TriggerTest.

🔴 The drive's first version compared `rec.output` before and after: the run record HAS no `output` (its keys:
`id, workflowId, …, steps, kind`), so "the same answer" was `null === null` and passed. The Return step's recorded
`outputData` is the answer; the drive now also asserts a number is in it.

**Not done (next):**
- Build 4: the NodeGX editor draws `run-workflow` (`control: 'workflow'` is new to it, NOT CHECKED). Making a piece
  from a selection in the editor is not in the task.
- AC3's agent round: an agent asked to reuse steps across two workflows writes `run-workflow`.
  `list_backend_workflows` does not yet say who runs a piece.
- A piece's answer read after it says "result › checked · from Run Check twice" when the piece returned a function
  step's whole answer (`pathWords` drops one `result`, the function's own is the second). Correct, wordy.
- Asks for Richard: a moved function step is SAID to be given what the piece is sent, not refused; the bar names steps
  by their card numbers.

## s19 (2026-11-04): Build 4 (the NodeGX editor draws `run-workflow`) built, driven in the dev editor

Measured in s18, confirmed here: the editor knew neither served control (`workflow`, `key-values`), so *Workflow* was a
text box holding the piece's id and *Send* the JSON editor. Built (NodeGX, this commit):

- **The card says "Run <piece>"** by the piece's NAME (`workflowPieces.runTitle`, Studio's `stepTitle`). The name lives
  in another workflow, so no node type can say it (`usePortAsLabel` shows the id, and the library is JSON-copied, so
  no function survives): `NodeGraphNode.derivedTitle`, never persisted, set by the document in `refreshNodeChrome`,
  its own `derivedTitleChanged` event (the canvas relayouts on it; `labelChanged` would mark the workflow unsaved).
  `givenName` keeps it out of the file. An author's own label still wins.
- **The Workflow row** (`WorkflowPieceRow`, port type `workflow-piece`): the backend's workflows by name, *Reusable
  pieces* first, then *Workflows something starts*; the workflow being edited in neither; one that runs it shown as
  "azdazd (it runs Plant round)", disabled. An id not on the backend stays shown and is said. *Open the piece ↗*.
- **Send as named values** (`workflow-key-values`, the param-mapping rows writing ONE param's object), with the names
  the piece reads (`body.<name>`, `bodyNames`) one press away (*+ plant*). Call an API's `query` and `headers` get the
  same rows (type `object`); its `body` (type `any`) keeps the value control. A `send` that is not named values (a
  `$path` to an object, a formula) is drawn as one value, never rewritten.
- **Opening the piece**: the row's button, a double-click on the card, the card's menu (*Open "Find thirsty
  plants"*). An unsaved workflow is saved first (a refused save says why and stays); the toast offers *Back to
  "Plant round"*. The document reads the backend's workflows and triggers on open and after a save (`refreshPieces`).
- Rules ported from Studio's `automations.mjs` into `models/workflow/workflowPieces.ts` (pure): `pieceOf`, `pieceIds`,
  `wouldRing`, `bodyNames`, `runnersOf`, `pieceChoices`, `isNamedValues`, `namedValuesWords`. Change both or neither.

**Driven** in the dev editor on a Greenhouse copy (seeded *Find thirsty plants* reading `body.plant`, *Plant round*
running it, `azdazd` running *Plant round*), backend from Backend Services, removed by id after (census 21 = 21):
the card read **Run Find thirsty plants** on open and the panel header "It starts at Run Find thirsty plants"; the row
offered the pieces by name with `azdazd (it runs Plant round)` disabled; *+ plant*, "Fern", Save: "Saved to the backend
and to nodegx.automations.json", the file's step `{"workflow":"find-thirsty","send":{"plant":"Fern"}}` with **no
`name`**; *Run & pin*: the piece ran as its own run (`parentExecutionId` set) given `body.plant = "Fern"` and answered
`{checked: 0, changed: 0}`, which Plant round returned. *Open the piece ↗* and a double-click both opened it; *Back*
returned. Shots `look/bwf013-s19-1..4`.

🔴 **P132-STALESTEPPANEL** (found by the drive, filed, fixed): opening another workflow, from the list too, left the last
workflow's step on the Properties panel, editable, over a disposed graph. `switchToComponent` clears the selection only
when given a node; `WorkflowEditorService.adopt`/`close` now clear it. Driven: the panel said "No node selected".
🔴 My first words for an empty `send` said "Find thirsty plants reads nothing it is given yet" beside *+ plant*: the
empty hint now names what the piece reads.

Gates: editor jest 24 suites, 307 tests green (workflow, local-backend, bmg-012, fb-018, fb-022, cmg-008/009; the new
`p132-bwf013-pieces` 18 and `p132-stalesteppanel` 3; a mutant removing the clear in `adopt` goes red); `tsc -p
packages/noodl-editor` 0. FB-018's connected-row policy names both new rows `deferred` (a workflow step's settings take
no wire). Not run: the Electron `test:ci` (`tests/workflow/*` read neither changed control).

**Not done (next):** AC3's agent round (`list_backend_workflows` should say who runs a piece first). Making a piece from
selected steps in the EDITOR is not in the task. The seeded `ui` positions overlapped cards (the drive's seed, not
the product).

## s20 (2026-11-04): AC3 green, the MCP says who runs a piece

**The MCP half.** `list_backend_workflows` now answers `pieces`: every workflow another one runs, and every workflow
no trigger starts (Studio's *Reusable pieces*), each `{ id, name, runBy, reads, startedBy }`: the workflows whose
`run-workflow` step names it, the `body.<name>`s it reads (what a step `send`s it), its triggers. The rules are the
engine's (`nodegx-backend/src/workflow/pieces.ts`, new `runnersOf` and `bodyNames`, the Studio and editor ports'
twins: change all three or none); the MCP reads `/admin/triggers` beside `/admin/workflow-defs` and summarises
(`backendTools.ts pieceSummary`). The tool's words say a step wanted in two workflows goes in ONE piece run from both.
🔴 **P132-CREATEWFCALLSONLY** (filed, fixed): `create_backend_workflow` still said every step "invokes a cloud function
in v1", so the tool an agent writes with pointed it at a function. It now names the served kinds and pieces.

Spec `packages/noodl-mcp/tests/p132-bwf013-pieces.test.ts`, 5 green: four pure lines (two runners each once, a
`$literal` holding a `body.` path not read, a triggered workflow another runs listed with its trigger, a function
trigger of the same name starting no workflow) and one through the tool against the built backend (a piece, two
runners, a webhook on one). A mutant emptying `runnersOf` goes red (3). Beside it green: toolDisclosure,
workflowProposals, hls013, the backend's `p132-bwf-013-pieces` 11/11; `tsc` backend 0, noodl-mcp the known 19.

**AC3 by an agent** ([agent-round-bwf013.mjs](agent-round-bwf013.mjs), the MCP's dist rebuilt): a Greenhouse copy
with *The weekly report* and *The monthly report*, each a COPY of the same find-the-thirsty-plants and count steps
before its own email, each on its own schedule. The request, saying neither "piece" nor the kind: "My weekly report
and my monthly report both find the thirsty plants and count them, with the same steps copied in each. Make those
steps one thing both reports use, so I only change them in one place." Opus, $2.18, 2.4 minutes:

- a new workflow `thirsty-plants` holding the find and the count, ending in a `return` of the count's output;
- both reports are now *Run The thirsty plants* then their own email, the email reading `upstream.thirsty.result.count`;
  neither keeps a find; no trigger, no cloud function added; the file and the backend agree;
- it read `list_backend_workflows` and `list_backend_step_kinds` before writing (no grep until after), test-ran the
  piece, and did NOT run the reports because they send email. Its own words: "I used a workflow piece, not a cloud
  function … it keeps the steps visible and editable on the canvas".

Then by hand: the weekly report tested up to its Run step answered `{result: {count: 0, names: ""}, run: …}` (the
piece's own run). The ring refused with both names is the engine's (s16). **AC3 is green; BWF-013's ACs are all green.**

Not graded: it set the piece's concurrency to 2 on its own reasoning (both schedules fire on a Monday the 1st), and the
Run steps carry no `send` (the piece reads nothing it is given). Only one agent round was run.
