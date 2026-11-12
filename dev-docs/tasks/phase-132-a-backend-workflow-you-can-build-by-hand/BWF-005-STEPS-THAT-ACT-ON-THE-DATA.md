# BWF-005 — Steps that act on the data

**Phase:** [132](README.md). **Repo:** NodeGX `packages/nodegx-backend/src/workflow/steps/` (new kinds), the node spec
or contract if workflow kinds are specced there, `packages/noodl-mcp` (instructions, the backend group's examples);
nodegx-studio (the forms). **After:** BWF-003 (a record's fields are filled with picked values).

## Why

Richard's point 5: "most of the steps require some kind of code or knowledge of JSON". The catalog is plumbing plus one
action, *Run a function*. In Bubble's backend workflows the steps **are** the actions: *Create a new thing*, *Make
changes to a thing*, *Delete*, *Do a search for*. Here every one of those is a cloud function a person has to author
as a node graph first. Greenhouse's *Mark watered* is a six-step function that a single *Change a record* step would be.

## What to build

1. **Four kinds** in `kinds.ts`, each with its params, output shape and prose:
   - `create-record`: table, fields (each a value: literal, `$path`, `$fn`). Out: the record.
   - `update-record`: table, which record (an id value), fields to change. Out: the record after.
   - `delete-record`: table, which record. Out: `{ deleted, id }`.
   - `find-records`: table, conditions (field · operator · value, all/any, the backend's query operators), sort, limit,
     *one* or *many*. Out: a list (or one record, or empty). Routes `none` / `some` like `filter`.
2. **Who the step acts as.** Ruling owed (README): the recommendation is *as the app*, the same as a cloud function the
   app's own trigger starts (P127 SCHEDULEAUTH: "a run the app starts itself counts as the app"), so privacy rules
   written for people do not block the app's own work; a webhook-started run stays a visitor's. Measure what a
   `call-function` step's function runs as today before proposing anything different.
3. **They write through the same path as everything else**: the backend's data layer with its hooks, so a db-change
   trigger fires on a record a step made (and the engine's existing guard against a workflow re-triggering itself is
   checked, or one is added: a row change made by workflow W does not start W again).
4. **The agent.** The kinds arrive through the catalog; the MCP's backend instructions and its examples say a record
   change in a workflow is a step, not a function. A `kit:` / regression line on the row if the kinds are specced.
5. **Studio's forms** from the table's schema: a table picker; its fields listed with a value box each (picker and
   formulas); conditions as sentences ("*plant* is *the Plant that was watered*"). The form is generated from the kind's
   params and the table's columns, not hand-built per table.

## Acceptance

- AC1: backend tests per kind (made, changed, deleted, found one / many / none), and a privacy test for the ruling.
- AC2: a db-change trigger on Plant fires once for a Plant a step made; a workflow that changes its own trigger table
  does not loop (a test).
- AC3: on a copy of Greenhouse, *When a plant is watered* rebuilt in Studio as *Change a record* (the Plant's
  `lastWatered` = the Watering's date) with no function, no JSON typed; a test run (BWF-002) changes the row.
- AC4: an agent asked for "when a watering is logged, update the plant's last-watered date" writes the step, not a cloud
  function (the file read after).

## s6 (2026-11-03): built

**Backend** (`packages/nodegx-backend`): four kinds in `steps/records.ts`, specced in `kinds.ts` under the category
*Workflow Records* (Studio's step menu shows them under *Records*): `create-record` (Create a record), `update-record`
(Change a record), `delete-record` (Delete a record), `find-records` (Find records). Out: `{ record, id }`,
`{ record, id }` (the row after), `{ deleted: true, id }`, `{ items, count, first }` with routes `empty` / `nonempty`
as Filter's. A record is named by an id, a link (Pointer) or a record (`recordIdOf`). A field's value is written in
the form its column takes (`toWire`: an ISO string to a Date, an id or a record to a Pointer), read from the table's
columns, so *the Watering's date* lands in *lastWatered* as a date. *Find records*' conditions are
`[{ field, op, value }]` with the condition language's names, cut to the thirteen a search runs (`FIND_OPS`, served as
the param's `enums`), `match` all / any, `sortBy`, `order`, `limit` (1–1000, default 100).

**Same path as everything else (item 3).** The steps call the backend's own `/classes` routes over loopback, the
`_noodl_cloudservices` a Record node inside a function uses, so rules, hooks, `stampCreate` and the ChangeBus apply by
construction. A step's requests are charged to a run of their own (`functionRuns.within`, the HLT-023 header).

**R5, the switch.** `ignorePrivacyRules` on the workflow (types, registry, `projectWorkflow`, validated as a boolean,
in the MCP's `create_backend_workflow` schema). On unless `false`: the request carries the app's key. Off: no
credential at all, since no trigger today starts a run for a signed-in person, so the table's visitor rules decide,
and a refusal ends *The step acted as a visitor because this workflow's "Ignore privacy rules" is off.* 🔴 A local
backend is **dev-open** by default (`security.json` `devOpen: true` on loopback), which lets every visitor past every
rule: with the switch off nothing is refused there. The test locks the backend the way a deployed one is. Studio has
no control for the switch yet (it is written by the agent or by hand); the BWF-009 walk is the place to ask whether a
person needs to see it.

**The agent (item 4).** `call-function`'s *when to use* no longer says reading or writing records is a function's
job; it points at the record steps. The MCP's `list_backend_step_kinds` and its `kind` field list the four, the latter
saying "A row made, changed, deleted or found in a workflow is one of the four record steps, NOT a cloud function".

**Studio** (`editor/studio.html`): the settings are generated from the catalog's `control`: `table` a choice of the
app's tables, `record-fields` a value box per column of the chosen table (typed, from the run, or a formula; empty
leaves the field alone), `record-conditions` rows of *field · how · value* with the served operators' words and *Add a
condition*. A record step added from the menu starts on the table the workflow starts from, its record the row that
started it, so it saves at once (the P132-FILTERNOCONDITION lesson). The columns come from the project, else the
backend's `/admin/schema` (`loadAutoTables`, now also for a record step's table).

### Acceptance

- **AC1 green**: `tests/p132-bwf-005-record-steps.test.ts`, 11 tests over a real BackendService: made (a typed date
  stored as a date), changed through the Watering's link (another field left alone), a missing record fails the step
  by name, deleted, found many / one / none with routes, `any` with *starts with* and a date before a date, write-time
  refusals. **R5's privacy test**: a visitor's own PUT is refused (the control), the step with the switch off is refused
  and says so and the row is unchanged, the same step with the switch on changes it. A mutant forcing the switch on
  turns that test red.
- **AC2 green**: same file. A db-change trigger on Plant fires once for a Plant a step made (one Note); a workflow
  started by a Plant change that changes that Plant runs once (the existing guard, `maxChangeDepth` 1, tested not built).
- **AC3 green in the Electron app** on a Greenhouse copy ([greenhouse-drive-bwf005.mjs](greenhouse-drive-bwf005.mjs)):
  *Mark the plant watered* (the function step) deleted; *Change a record* added from the step menu, under *Records*; its
  table set to Plant; its record and *lastWatered* picked from the run, shown as "plant · from the Watering that was
  made" and "at · from the Watering that was made"; no JSON typed. Tested on the Watering of 28 October: the Plant's
  `lastWatered` went from today (the old function's write when the row was made) to `2026-10-28T09:00:00.000Z`; no
  function left in the workflow. Also in Chrome in `check:automations` (Task table, a field typed, the test changes the row,
  a *Find records* condition added by a click).
- **AC4 green** ([agent-round-bwf005.mjs](agent-round-bwf005.mjs), `--setup` builds the lab, `--grade` reads it): a
  Greenhouse copy **without** what AC4 asks for (its *Mark the plant watered* step and the *Mark watered* function taken
  out, else "it already does that" is the right answer), its own backend from the checkout. One `claude -p` on Opus,
  AC4's sentence as written: *"When a watering is logged, update the plant's last-watered date."* It wrote an
  `update-record` step on Plant, record `body.plant`, `lastWatered` = a formula (the Watering's `at`, else its
  `createdAt`, else now), and `thirsty: false` (it said why: the morning check would otherwise leave a watered plant
  marked thirsty), then a Return. **No function file, no function step.** Its own words: it used a record step
  "because the backend's own step catalog is explicit about it". $3.50, 44 turns, 4.1 min. It read the step catalog
  whole (58,123 characters, under the 120,000 s5 set for Claude Code). It tested on a real Watering, then put the
  data back.
  🔴 It also found Plant had **no `lastWatered` column** on the lab's backend, and added it. That is the lab, not the
  product: the drives' `attachNewBackend` makes a backend without the project's declared columns, where Studio's own
  `provisionFor` seeds them (and Greenhouse is not one of Studio's templates). Noted in the script for the next lab.

**Gate drift met:** P132-STU093WORDS (Studio's check still wanted s5's old failure words; fixed) and
P132-BST006GOLDEN (the MCP's bound-briefing capture says 67 backend tools, the server 68, red before this session's
change; open). A first start of the Electron drive's backend exited with code 1 once, while a peer's `check:editor`
ran; it started at once on the next try, so the cause is unmeasured.

**Still open after s6:** Studio shows no control for *Ignore privacy rules*; a *Find records* result feeds nothing
per item yet (`for-each` calls a function, not a step, so "change every plant found" still needs one); a Date field
typed as text is written as a date only when the backend's table already has the column.
