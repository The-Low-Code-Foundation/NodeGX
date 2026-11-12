# BWF-012 — Saved API calls (R7)

**Phase:** [132](README.md). **Ruling:** R7 (2026-11-03), before the Beta. **Size:** about 1 session (engine, file,
MCP words, Studio).

## What he asked

> "It'd be nice to save API calls with the 'Call an API' node, like in Bubble, so you can reuse them in other workflows"

## Build

1. **The file:** a saved call is a named entry in the project's files beside the workflows (`nodegx.automations.json`,
   a new `apiCalls` list, `automations/shape.ts`), holding what *Call an API* holds today (address, method, query,
   headers, body, authentication by Secret name: never a value, BWF-006's rule), plus which parts are **blanks** a
   workflow fills (named, each with a type and an example).
2. **The engine:** `http-request` takes `call: "<name>"` and `fill: { <blank>: value }`; the saved call's settings are
   merged under the step's own at run time, so a change to the saved call reaches every workflow using it. Validate:
   an unknown call name or an unfilled blank is an error naming them. Rule 1: written backend first, then the file.
3. **Studio:** *Save this call* on a *Call an API* step's panel (name it, tick which parts are blanks); the step menu's
   Integrations lists each saved call by name; picked, the panel shows only its blanks (each a setting as any other,
   BWF-011's composer), and *Open the saved call* to change it for everyone. A list of saved calls under the workflows.
4. **The agent:** the catalog says saved calls exist and the MCP's backend tools can list them; a brief that names a
   service already saved uses it.

## Acceptance

- AC1: a weather call saved from a *Call an API* step, used by name in a second workflow with only the city filled;
  both tested; the key is in neither file (BWF-006 AC2's check).
- AC2: changing the saved call's address changes what both workflows call, with no edit to either.
- AC3: an agent asked to "use the weather call in a new workflow" writes `call: …`, no copy of its settings.

## s15 (2026-11-04): built (engine, file, MCP, Studio); AC1 and AC2 green in Chrome

**The shape.** A saved call is `{ id, name?, description?, params, blanks? }` in the project file's `apiCalls`
(beside `workflows` and `triggers`; absent when there are none, so a project without any keeps the file an older
backend reads). `params` are *Call an API*'s own, checked by the same `validateHttpRequestParams` (so the key rule
is BWF-006's: a Secret's name, never a value). A blank is `{ name, type?, example?, description? }`, written inside
the params as `{"$path": "fill.<blank>"}` (inside a formula too). A saved call reads **only** its blanks: a
`body.…` in one is refused, because it would mean something different in every workflow. A step uses one as
`{ kind: 'http-request', params: { call: '<id>', fill: { <blank>: value } } }`; anything else the step sets is its
own and wins (`query`/`headers` merged by name).

**The engine** (NodeGX `packages/nodegx-backend`): `workflow/apiCalls.ts` (the rules, pure),
`workflow/apiCallTypes.ts` (the shapes, no imports: the MCP names them without loading the engine),
`workflow/ApiCallRegistry.ts` (`<dataDir>/api-calls.json`, refused at start when invalid, as `workflow-defs/` is).
`WorkflowSubsystem` owns it, loaded before the workflow registry, which checks a written workflow's uses (an unknown
call, a blank left out of `fill`, a `fill` for no blank: each named). The executor reads the call **when the step
runs** (AC2's mechanism) and refuses an unfilled blank again there. Routes `GET /admin/api-calls` (with `usedBy`),
`GET`/`PUT`/`DELETE /admin/api-calls/:id`. A delete while a workflow uses the call is a 409 naming the workflows, and
so is a new blank its workflows do not fill (a 400). The file is seeded into an empty backend with the calls
**before** the workflows, and compared (`diffAutomations`, only when the backend was asked: an older backend has no
route). Backups carry `api-calls.json`, and a restore reloads it before `workflow-defs/`. Catalog **1.10.0**:
`call` and `fill` on `http-request`, `savedCalls: true`, a note saying when to save one. WORKFLOW-NODES.md has a
*Saved API calls* section.

**The MCP:** 🔴 `patchAutomations` wrote back `version`, `workflows`, `triggers` only, so the first workflow an agent
wrote would have deleted every saved call from the project (s9's lesson: three writers of one file, each with its own
field list). It now keeps `apiCalls` and patches one by id (`kind: 'apiCall'`). `list_backend_workflows` answers
`apiCalls` and `apiCallsUsedBy` beside the workflows (no new tool: the budget). The drift check asks
`/admin/api-calls` (a 404 = an older backend, not compared). The editor's `project-automations.js` and Studio's
`saveWorkflow` patch the parsed file in place, so they kept the list already: checked by reading.

**Studio** (`editor/serve.mjs` `POST /api/automations/api-call`, backend first then the file, put back on a file
failure; `automations.mjs` `callParts` / `saveCallFrom` / `stepForCall` / `usersOfCall` / `callId` / `readsRun`):
- *Save this call* beside *Paste a curl command* on a Call an API step: a name, and a tick per part (the address,
  each query, header and body entry). A part read from the run is ticked and locked ("each workflow fills it in").
  Saved, the step becomes `{ call, fill }` with each blank filled by what the step had there, so it does exactly
  what it did.
- The step menu lists each saved call by name under Integrations ("A saved call: fill in city"). Picked, the step
  is `{ call, fill: { <blank>: its example or '' } }` (an empty blank is stored: the s12 family, a new step must be
  storable), named after the call. Its panel says which saved call, has *Open the saved call ↗*, and asks only for
  its blanks, each a composer (BWF-011).
- *Saved API calls* under the workflows in the list ("Used by 2 workflows · fills in city"). Opened: the canvas says
  who uses it (each opens), *Delete* is off while any does; the right panel is Call an API's own form written to the
  call, and its blanks with their examples (one no setting reads can be removed).
- 🔴 **After *Save the call* the panel's redraw put the caret in whichever input took the name box's place**, and an
  outside change waits for a focused field to be left (`takeOutside`), so the next workflow written from outside
  never drew (the drive's first run, 144/145). The name box is now left before the save.

**Gates.** NodeGX: `tests/p132-bwf-012-saved-api-calls.test.ts` 10/10 (AC1: two workflows, one city from the run and
one typed, the key sent and in no file but `secrets.json`; AC2: the address changed, both call it, neither
definition's `updatedAt` moved; the refusals; the file seeded and compared). A mutant switching off the write-time
check failed the refusals test. The 43 suites reaching the workflow layer: 659/666, the 7 the pins this moves (the
catalog version in 5, the admin route tally +4, the docs coverage wanting `call` and `fill`), all moved and 195/195.
noodl-mcp `tests/p132SavedCalls.test.ts` 2/2, `p127ProjectFiles` + `workflowProposals` 25/25; its `tsc` has 19
errors, all from two committed P128 test files (one imports the step catalog, which reaches the engine), none in
`src/`. Studio: check:automations unit 144/144, drive 167/167 with `NODEGX_REPO` (the new section: saved from a
step, picked by name in a second workflow, the city typed, both run on a local API, the key in no file, the
address changed on the saved call and both call it, unedited).

**AC3, green** ([agent-round-bwf012.mjs](agent-round-bwf012.mjs)): a Greenhouse copy with a saved `weather` call in
its file and no workflow using it; the backend made from the copy was seeded with the call by the product's own path
(BKO-001's seeding). One `claude -p` on Opus, the checkout's MCP (dist rebuilt), asked "Use the weather call in a new
workflow: every morning at 7, get the weather in Lyon." In 1.8 minutes and $1.41: a workflow `morning-weather` whose
step is `{ call: "weather", fill: { city: "Lyon" } }` plus its own retry policy, **no address, header or key copied**,
a 07:00 schedule trigger, no cloud function. Its own test run failed on `api.example.com` (ENOTFOUND), which shows
the step took the saved call's address and filled the city; it said so, and said the call's address is a placeholder
to point at a real service. 🔴 It found the call by grepping the project's files, not through
`list_backend_workflows`' new `apiCalls`: that path is in, and ungraded by an agent.

**Still open:**
- **The NodeGX editor** (BWF-008): NOT CHECKED how its Workflows panel draws a step with `call` (it reads the
  catalog, which now serves `call` and `fill` with controls it does not know). It has no *Save this call*, no saved
  calls in its menu, no list. Its file writer patches in place, so it keeps `apiCalls` (read, not driven).
- **No MCP tool writes a saved call**: an agent can use one, not make one (a brief that says "save it for reuse" gets
  a step). One tool, or `update_backend_workflow` taking `apiCalls`: the tool budget decides.
- **Studio from the kit** has none of it until a NodeGX release carries catalog 1.10.0 (Studio refuses in words).
- An older backend refuses a project file that has `apiCalls` ("unknown key"): a project that uses saved calls needs
  a backend at this commit or later.
- ~~Not driven in the Electron app~~: driven in s16, below.
- In a saved call's panel a blank can be removed and its example changed; a new blank can only be made by *Save this
  call* (no "+ A blank" with a place to put it). A step that uses a call has no *Stop using it* (copy the settings in).
- P132-FOCUSBYINDEX filed (low): the panel restores the focus by position, the mechanism under s15's drive miss.

## s16 (2026-11-04): AC1 and AC2 green in the Electron app, by presses

[greenhouse-drive-bwf012.mjs](greenhouse-drive-bwf012.mjs): a Greenhouse copy, Studio's Electron app at `60796d4` +
s16's fixes, the backend from the NodeGX checkout, a weather API run by the script on 127.0.0.1. Every step was a CDP
mouse press or typed text, with no `.click()` on the product's controls (the Backend tab's rail button aside).
- *When a plant is watered*: the Watering sample kept; *Add a step after* → *Call an API*; *Paste a curl command* with
  `?city=Paris&units=metric` and a Bearer key; the key asked a Secret's name (`API_KEY` offered, value hidden),
  `WEATHER_KEY` typed. *Save this call*: the box offers the address, city and units unticked (the city was typed, not
  read from the run); city ticked by a press, "The weather" typed, *Save the call*. The step became
  `{ call: "the-weather", fill: { city: "Paris" } }`, the file's `apiCalls` holds the address, `units`, the Secret's
  name and the blank `city` (example "Paris"). The list row says "Used by 1 workflow · fills in city". Tested: success,
  the API saw `/forecast?city=Paris` with the key.
- *The morning check* (a schedule starts it, the other way in): the schedule's sample kept; *Add a step after* → the
  menu's Integrations lists "The weather — A saved call: fill in city" under Call an API and Send an email; picked, the
  step is `{ call, fill: { city: "Paris" } }` (the example). The panel says "Uses the saved call The weather", city
  typed over with "Lyon", the box left. List: "Used by 2 workflows". Tested: success, the API saw `city=Lyon`.
- AC2: the saved call opened from the list (who uses it, each opens; *Delete* off), its Address typed over with
  `/v2/forecast`. The file and the backend both have the new address. **Neither workflow changed**, in the file or on
  the backend (`updatedAt` the same). Both tested again from their own rows: `/v2/forecast?city=Paris` and
  `/v2/forecast?city=Lyon`, each with the key.
- The key: in no project file, in neither workflow nor the saved call on the backend. The only file holding it is the
  backend's `secrets.json` (every file under the copy and its backends dir searched).
- Two clean runs in a row (6, 7), and run 8 after the fixes below.

**Three things a person would trip on, fixed (nodegx-studio, this session):**
- In the saved call's settings the city read **"fill › city · from the run"**. It is not from the run: each
  workflow fills it in. `pathWords` now says "city · from each workflow" for a `fill.` path (unit check added).
- *Save this call*'s ticks ran together on one line ("Query: city (now "Paris") ☐ Query: units…"). Now one per line.
- The list's *Saved API calls* heading was a bold line unlike *Workflows* and *Reusable pieces*. It is now the same
  `h3.sec` with a line under it ("an outside API set up once, used by name in any workflow").

🔴 **P132-PRESSLOSTINREDRAW** (filed, low): in 3 of 8 runs the first press on a list row opened nothing. The press got
`mousedown` and `mouseup` and no `click`, because the list was rebuilt between them (it is rebuilt 3 times in the
~80 ms after the tab opens). A person cannot press that soon, and idle redraws are 0. The drive waits 1 s, as a person
would. The open reach is an agent's write landing mid-press (unmeasured).

Gates: check:automations with `NODEGX_REPO` 145/145 + 167/167. Its first run froze the page's main thread for 60 s
in RECORDSTEPREFUSED's section, before any saved call exists, so none of the changed code runs there. OBS was taking
410 % CPU. The re-run was green.
