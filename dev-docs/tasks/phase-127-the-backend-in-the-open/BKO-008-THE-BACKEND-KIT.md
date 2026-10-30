# BKO-008 — The backend kit: what anyone needs to build their own backend editor

**Phase:** [127](README.md). **Depends on:** BKO-007 (the writers it publishes are proven there first). **State:** open,
scoped 2026-10-30.

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
