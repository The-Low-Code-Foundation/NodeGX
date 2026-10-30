# BKO-008 — The backend kit: what anyone needs to build their own backend editor

**Phase:** [127](README.md). **Depends on:** BKO-007 (the writers it publishes are proven there first). **State:** built
2026-10-30 (s1), AC1–AC4 measured; in `@nodegx/backend-map` **0.1.6, unpublished** (it carries BKO-007's 0.1.5 too).

> "I guess we should make it possible to build your own backend visual editor / viewer outside tools like NodeGX
> Studio, but we can inspire ourselves from the work already done there." — Richard, 2026-10-30

## Why

The front end already has this. The `nodegx-your-own-editor` skill (`packages/create-nodegx/profiles/core/skills/`)
names six questions every editor answers and the package that answers each one (`@nodegx/project-contract`,
`node-spec`, `preview`, `canvas-look`), plus a suite that says PASS. Three strangers built three editors from it
(OWN-008). The backend has nothing like it. An agent asked for "a view of who can see what in my app" today has to
rediscover the admin routes, the two places a rule lives, and why naming a table isn't handing over its rows
(P124-S3-LENSBYNAMING).

The answers exist, but in the map's `lib/`, private to the map:

| question | answered today by |
|---|---|
| What's in the backend: tables, fields, rows, people, roles? | `lib/backend.mjs`, `people.mjs`, `reach.mjs` `loadWorld` |
| Who may touch a table, in words? | `lib/rules.mjs` + `public/words.js` (`ruleWords`, `tableRule`) |
| What do the functions and pages touch? | `lib/project.mjs` (`analyseProject`, `scriptTouches`: *names*, not *hands over*) |
| What starts by itself: triggers and workflows? | `lib/triggers.mjs` (`triggerFlows`) |
| What did one person actually get? | `lib/asperson.mjs`, `reach.mjs` (`personReach`, run as them on the MCP door) |
| How do I change a rule or a trigger so it holds? | `setTableRule`; BKO-007's trigger writer |
| What ran just now? | `/executions` (the map's poll in `server.mjs`) |

The "write it live and into the file" logic exists three times already: noodl-mcp `backend/projectFiles.ts`, Studio
`editor/automations.mjs`, the map's `rules.mjs`. A fourth copy in every stranger's editor is how they drift.

## What it becomes

1. **A published kit**, from the map's `lib/`, with no screen in it: the facts, the as-person runs, the writers
   (rules, triggers, workflows: both places, stale-refusal, rollback), and the runs feed. The map is rebuilt on it.
   That's the proof the kit is enough: the map imports nothing private.
2. **A backend suite**, the editor suite's twin. A script of backend edits (grant, revoke, add trigger, remove
   trigger, schedule, turn off) applied through the editor's adapter, then compared with the kit's reference writer
   on the live backend **and** the files. PASS, or a sentence naming what differs: *"Lesson in nodegx.security.json
   lets signed-in people see it; the backend doesn't."* It has a control that must fail, as the editor suite does.
3. **Words** for every fact, from the backend's own vocabulary (`ruleWords`, `scheduleWords`, the step kinds), so a
   stranger's editor says the same thing Studio says. The canon's rule: one text, quoted.

## Where it lives (ruling R2 below)

`package-lock.json` holds a peer's uncommitted edit today (2026-10-30), and a new workspace under `packages/` needs a
lockfile entry (P124 s3 kept the map in `dev-docs/` for the same reason). Until R2 is ruled, build it as a `./kit`
export of `@nodegx/backend-map` (`exports: { "./kit": "./lib/index.mjs" }`). That needs no new workspace and no
lockfile change, and it can move to its own package without changing its API.

## Acceptance

1. The map imports only the kit's public exports. `grep` over `public/` and `server.mjs` for `lib/` paths returns
   nothing but the kit's entry.
2. The backend suite says PASS on the map's own adapter, on the todo template and one any-app project. The
   control (a writer that skips the file) says FAIL with the file named.
3. The kit is packed (`npm pack`), installed outside the checkout, and the suite is run from there.
4. noodl-mcp and Studio are **not** changed in this task. Their copies are listed in the task file with a sentence
   each saying what moving them onto the kit would take. That's a later row, owned by whoever is on lane 2/3.

## Rulings

| id | question | recommendation |
|---|---|---|
| R2 | Its own package (`@nodegx/backend-kit`, beside `project-contract`) or `@nodegx/backend-map/kit`? | Start as `/kit`; move to its own package when the lockfile is free, before BKO-009's stranger round, so the skill names a package that says what it is |

## The other copies (AC4: not changed here)

| copy | what it writes | what moving it onto the kit would take |
|---|---|---|
| noodl-mcp `src/backend/projectFiles.ts` (`writeBoth`, `patchRules`, `patchAutomations`) and the trigger and rule tools in `src/tools/backendTools.ts` | the agent's rules, function rules, workflows and triggers: backend first, the file patched by id, the backend put back if the file fails | It's TypeScript bundled into `@nodegx/mcp` and can't import an `.mjs` package from `dev-docs/`. It needs R2's own package (`@nodegx/backend-kit` under `packages/`, built like `project-contract`). Then `patchRules`/`patchAutomations` become the kit's file patchers and `writeBoth` stays as the binding (which backend is this project's). It also needs the kit to learn what the agent writes that the map doesn't: workflows, function rules (FNLIMITFILEONLY) and webhooks. |
| Studio `editor/serve.mjs` `setTrigger` (`POST /api/automations/trigger`) and `editor/automations.mjs` | a trigger turned on or off, its daily time moved, removed; STU-092's workflows | Its rules already go through the kit (Privacy posts to the map's `/api/table-rule`). Its trigger writer patches the file entry in place with `JSON.stringify(…, 2)` and refuses a trigger the file lacks. The kit's re-projects the entry from what the backend stored (`projectTrigger`), sorts by id, and adds one the file lacks. Moving it means calling the mounted map's `/api/hand/trigger-enabled` (or importing `makeHands`) for on/off and remove, after running the backend suite with a Studio adapter to see whether the two write the same bytes. That's unmeasured. The time move (`PUT` with a new cron) and the workflow writer have no kit writer yet. |
| the map (`lib/rules.mjs`, `lib/hands.mjs`) | rules and triggers | done: it *is* the kit |

## Session log

### s1 (2026-10-30): the kit, the suite, the map rebuilt on it

BKO-007 was finished but uncommitted in the same files, and its session was waiting on Richard. On his word this
session committed it first (`b9adee5ae`), then built on top.

**As built** (`dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor/`):
- `lib/index.mjs` is the kit's one entry, exported as `@nodegx/backend-map/kit`. Its header names the seven questions
  and each one's answer. `lib/words.js` (moved from `public/`, exported as `/kit/words.js`) touches neither Node nor the
  DOM. The server serves it to the page at `/words.js`, which is the address Studio already imports.
  `static/build.mjs` copies it into the public recording (that copy would have lost it).
- Moved out of `server.mjs` unchanged: `lib/facts.mjs` (`readFacts`, which was `buildMap` without the look;
  `tableRows`; `rolesIn`), `lib/runs.mjs` (`makeRuns`) and `lib/lens.mjs` (`makeLens`: the reach on a 15 s world,
  with `forget()`). `changeRule` now forgets the world too. Before, only the hands did.
- **Turn off** was the one edit kind with no writer: the map could only remove a trigger. `makeHands().setEnabled`
  uses the backend's `/enabled` (the trigger keeps its secret and history), patches the file's entry from what the
  backend stored, puts the backend back if the file fails, and has an undo. It's `/api/hand/trigger-enabled`, and the
  trigger panel has **Turn it off / Turn it on** beside **Remove it** (renamed from "Stop it running by itself", which
  read the same as off). The toast names the function and its schedule, never the trigger's id (the first screenshot
  said "schedule-acceptprivacy").
- `lib/suite.mjs` (`runSuite`, `referenceAdapter`, `EDIT_KINDS`) and `bin/backend-suite.js`: six kinds
  (`grant`, `revoke`, `add_trigger`, `schedule`, `turn_off`, `remove_trigger`), with `"@N"` naming the trigger edit N
  made. After each edit the suite reads the backend and both files itself. It compares each table's entry and each
  trigger (type, on/off, target, cron, table, actions: Studio's `agrees` tuple) in both places with the kit's own
  writer, then each file byte for byte as the kit writes it. Each difference is said once. At the end both places
  are put back and it says whether they were.

**Measured:**
- AC1: `grep -rn "lib/" server.mjs public/` returns nothing. The server imports `@nodegx/backend-map/kit` by name (the
  package refers to itself) and serves the words through `import.meta.resolve('@nodegx/backend-map/kit/words.js')`.
- AC2 (`test/backend-suite.test.mjs`, in `npm test`): members-area (8 edits, every kind) and todo (4, rules only: it
  has no function), each a copy with its own backend. The map's adapter (`test/backend-adapter.mjs`, the page's own
  requests with the stamps it last saw) and the kit's reference writers both say PASS, and both places are put back.
  The control (`test/backend-adapter-skipfile.mjs`) says FAIL on both, naming `nodegx.security.json` (and
  `nodegx.automations.json` on members-area). Its first sentence: *"Meeting in nodegx.security.json is reading the
  member group or the admin group, adding the admin group; the backend says reading anyone signed in, adding the
  admin group."* A second control writes the same rules with four spaces and says FAIL once, "written differently
  … line 2". The command exits 0 and 1 accordingly. Each copy's folder is byte-identical at the end.
- AC3: `npm pack` (26 files) was installed in a scratch folder outside the checkout, with its dependencies from the
  registry. `backend-suite` from that `node_modules/.bin`, on a members-area copy and its own backend: PASS exit 0,
  control FAIL exit 1, five sentences.
- The map's whole `npm test`: 227 ok, exit 0 (BKO-007 left it at 207). The Chrome drive gained four checks (turned
  off in both places, the panel says so and offers Turn it on) and passes 35/35.
- AC4: the table above.

**Traps met:** the suite's own first FAIL was a removed trigger reading `undefined` rather than `null`, so "none"
never equalled "none". 🔴 The backend lists a table whose entry was put back LAST, so a whole-config JSON compare
says "not put back" when every entry is equal: compare table by table. A `.trim()` in the "written differently"
sentence hid the only difference, the indent.

**Not done:** workflows have no kit writer (Studio's STU-092 and noodl-mcp each have one), so the suite has no
workflow edits. R2 is still open, and the kit stays `/kit` (`package-lock.json` still holds a peer's edit). 0.1.6 is
for Richard to publish (it also carries BKO-007). Studio still pins 0.1.4 and needs no code change to move: it
mounts `handler()`, imports `/backend-map/words.js`, and reads `lib/project.mjs` by path, which is still there.
