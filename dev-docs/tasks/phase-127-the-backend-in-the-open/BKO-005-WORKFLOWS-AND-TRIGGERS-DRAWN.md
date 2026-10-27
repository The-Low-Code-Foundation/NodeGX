# BKO-005 — Backend workflows and triggers, drawn

**Phase:** [127](README.md). **Depends on:** BKO-001 (reads `nodegx.automations.json`), BKO-004 (the "On the backend"
list and the function view a step opens).

## What it becomes

- **A trigger is the head of a flow**, in the words a person uses: "Every day at 9:00", "When a Task is created",
  "When a webhook arrives at /hooks/…". Its wire runs to the function or workflow it starts. On the map, a trigger is
  a node wired to its table (row change) and to its function (`fire`, the P124 README §3 word).
- **A backend workflow (WF-001) is drawn as a DAG.** Its steps run left to right, error routes in red, and each step
  opens its cloud function (BKO-004). The step kinds are already words (`/admin/workflow-step-kinds`).
- **The last run lit up** from `/executions`: which step it reached, how long each took, where it failed.
- **Two edits a person can make in Studio:** a trigger on / off, and a schedule's time. Each writes the file and the
  backend together (BKO-001's rule). The agent sees the change in `what_changed_since`.
- Both appear in Workflow → On the backend, and on the map.

## Acceptance

1. The BKO-001 project (a daily trigger, a two-step workflow, a row-change trigger) draws all three, in plain words,
   in Studio on its own and inside the conversation.
2. Turning the daily trigger off in Studio: the file and the backend both say off, `what_changed_since` lists it, and
   the agent's next `list_backend_triggers` agrees.
3. Moving the time to 10:00: the same three checks.
4. A workflow run that fails at step 2 is drawn failing at step 2.
5. Specs added to `check:editor` / `check:data`.

## Session log

### s5 (2026-10-27): built in Studio and in noodl-mcp; the map's half left

**What was read first.** The project's `nodegx.automations.json` (BKO-001) is already in the page: Studio's page holds
every project JSON file in memory and redraws on an outside change, so the list reads the file itself and an agent's
change arrives live. The backend says the rest through Studio's admin proxy: `GET /admin/triggers` decorates a schedule
with `scheduleWords` (its one cron gloss, `triggers/cronWords.ts`, so Studio makes no sentence about when something
runs), `GET /admin/workflow-defs` gives `lastRuns`, `GET /executions/:id` gives a workflow run's steps by step id
(the engine records each one under `step.id`), and `/admin/workflow-step-kinds` names each kind. `what_changed_since`
read components only.

**As built.**

| where | what |
|---|---|
| Studio `editor/automations.mjs` (pure) | `triggerHead` ("Every day at 09:00" from the backend's words, "When a Task is created", "When a webhook arrives at /hooks/…/slug"; the cron itself when no words), `targetOf`, `scheduleTime` / `atTime` (only a cron with a plain minute and hour: one that runs more than once a day is the agent's to change), `workflowLayout` (columns by longest path from the entry; `next`, named routes and `onError` each a wire, an `onError` or a route named like a failure a `fail` wire; unreached steps loose and last; a wire to a missing step said as dangling), `agrees` (file vs backend copy on what decides what runs and when), `stepsOfRun`, `runLine` ("failed at step 2, Tell the owner: …") |
| Studio `serve.mjs` `POST /api/automations/trigger` | `{ id, enabled \| time }`: BKO-001's rule from Studio's side — the backend first (`/enabled`, or `PUT` with the moved cron), then the file's entry patched by id and nothing else touched (written atomically, registered in `known` first so the watcher does not echo it), the backend put back if the file fails. Refused: a trigger the file lacks (R1), a backend not running here (so the two never part), an unmovable cron |
| Studio `studio.html` Workflow → On the backend | triggers (head, On/Off switch, what they start, "the backend's copy differs" when it does) and workflows above BKO-004's functions; what only the backend has is counted, not drawn. A trigger opens as a flow: what starts it → the function (Open its steps, BKO-004) or the workflow; its switch, its time (a time field and Move it), whether the backend agrees, last and next fire; off, its wire is drawn dead. A workflow opens as its steps left to right in BKO-004's look, error routes red, a function step opening the function (Back returns), who starts it, its last run lit: each step ✓ ran / ✗ failed here / not reached, the wires it crossed lit (`wireRan` honours a wire's own `ran`) |
| noodl-mcp `ProjectStore` / `projectFiles.writeBoth` / `what_changed_since` | the store keeps the automations file as it last saw it (at open, after the agent's own writes); `what_changed_since` answers `automations`: a sentence per trigger or workflow ("trigger "Morning digest" (trg_…) was turned off", "…was moved from Every day at 09:00 (0 9 * * *) to Every day at 10:00 (0 10 * * *)", added, removed, changed), told once. 🔴 An agent write while a person's change is untold does not mark it seen, so the person's change is still told |

**Found and fixed: P127-BKO005-QUIETHOVER.** In the dark workflow canvas every `quiet` button lost its words on hover
(the light theme's hover background under the canvas's light text): "Move it" was a blank white box in the first
screenshot. One rule: `.wf button:hover` has its own background.

**Grades.**
- Studio `editor/automations-check.mjs` (pure, in `check`) **31/31**.
- Studio `editor/automations-drive.mjs` (Chrome; `check:automations`) **29/29**: the todo template, its backend made by
  Studio's Start a backend, the agent (noodl-mcp built from this checkout into a scratch file, `NODEGX_MCP`) makes a
  daily trigger, a three-step workflow (wait → call `notifyOwner` → on error, stop) and a row-change trigger through
  its tools; all three land in the file; a Task row fires the workflow, which fails at step 2 (the function is not on
  the backend). Listed in words, the backend agreeing; the trigger a flow; the workflow 3 columns, a then wire and a
  fail wire, step 1 ✓ and step 2 ✗ "Failed here: Step target function "notifyOwner" not found on this backend", "failed
  at step 2, Tell the owner", the crossed wire lit. Off in Studio: file off, backend off, the agent's
  `what_changed_since` says "was turned off", its `list_backend_triggers` agrees, the wire drawn dead. Moved to 10:00:
  file `0 10 * * *` (still off), backend the same, `what_changed_since` says exactly the move, the list agrees, the
  page says "Every day at 10:00". A trigger the file lacks: 409.
- Studio `editor/hosted-check.mjs` (the panel at a foreign origin with the host's CSP) **19/19**, 3 new: a trigger and
  a workflow listed and drawn inside the conversation (the cron's words asked across origins), and switched off there
  (file and backend both off). Made through the admin API with the file written as BKO-001 writes it, because the
  kit's published `@nodegx/mcp` 0.2.6 predates BKO-001; the agent's own path is the drive's.
- noodl-mcp `tests/p127ProjectFiles.test.ts` **14/14**, 4 new (the agent's own writes not told back; off, said once,
  list agrees; moved, said in the cron's words; 🔴 a person's change still told after an agent write).
- Mutants, each red: Studio's route skipping the backend write (2 red: backend off, agent's list); `onError` drawn as a
  plain wire (1); `scheduleTime` without its integer test (1, after adding `9.5` and `1e1`: the first try was an
  equivalent mutant, NaN already failed the range); writeBoth marking seen over a person's untold change (1).
- Studio's other gates after the change: `check:editor` 204/204, timeline 53/53, functions 46/46, fngraph 695/695,
  rules 20/20, phrases 85/85, pagedata 33/33, reusable 12/12, layout tips 10/10, vendor PASS.

**Against the acceptance list:** AC1 ✅ in Studio on its own and in the fake host (`look/bko-005-list.png`,
`-trigger.png`, `-workflow-failed.png`; the hosted half graded by `hosted-check`, no shot: its `--shots` rewrites BKO-002's tracked ones); in Claude Desktop it waits with BKO-002 AC2. AC2 ✅
(`look/bko-005-trigger-off.png`). AC3 ✅ (`look/bko-005-trigger-moved.png`). AC4 ✅. AC5 ✅ with one change of shape, as
BKO-004: a gate of its own (`check:automations`, the pure half in `check`) and three lines in `check:hosted`. The drive
is not in `check` yet: it needs an agent server carrying BKO-001, and the published `@nodegx/mcp` (0.2.6) does not; it
says so and goes in `check` with the next `@nodegx/mcp`.

**Left:** "and on the map": the map reads `/admin/triggers` but draws no backend trigger; a trigger node wired to its
table and its function (`fire`) is a backend-map change and another publish (after 0.1.3). A webhook's and a row
change's settings are the agent's to change (only on/off and a daily time are Studio's). The scratch noodl-mcp build
for the drive also carried a peer's uncommitted `backendTools.ts` edits.
