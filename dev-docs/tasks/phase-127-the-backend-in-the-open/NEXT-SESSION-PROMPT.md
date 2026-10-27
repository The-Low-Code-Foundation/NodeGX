# Phase 127 — next session (lane 9 on the BOARD)

Read [README.md](README.md), then the task you take.

## s1 (2026-10-26): scoped; BKO-001 started

Richard asked why the map does not draw in the chat and whether the backend is still open. Two read-only audits
answered both (the facts are in the README's table and in BKO-002 / BKO-003). He ruled R1 (the project's files are the
truth for workflows and triggers) by approving the plan, and said "let's scope it up on the board and start working
through". The phase and the board's lane 9 were written this session. BKO-001 is the first task.

**BKO-001 built and graded the same day** (commits `0275990c3`, `6d64e5426`, `78b8a528e`, `8494038c5`; the
session log at the bottom of BKO-001 has the grades). The agent's rules, workflows and triggers now land in the
project's files (`nodegx.security.json`, the new `nodegx.automations.json`), a backend starts from them, and the
full-stack deploy carries them. Bug P127-BKO001-BACKENDONLY is fixed in code.

## s2 (2026-10-26): BKO-001 AC6, BKO-002 in the fake host

- **BKO-001 AC6 ✅** (noodl-mcp `837b4ece8`): `get_project_info` and `session_status` carry `automations`
  (agree / drift with both ways to agree through the existing tools / unknown with the reason).
- **BKO-002 built** (Studio `f50fb31`). Privacy in a conversation **was broken**, measured first and filed as
  P127-BKO002-HOSTEDPRIVACY, now fixed. Data → Map now draws the map in a src-less frame. The gate is Studio's
  `npm run check:hosted` (9/9). AC4 was replaced: the CORS header stays in Studio, not the map package (the reason
  is in BKO-002's log).

## s3 (2026-10-26): BKO-003 built in the package

The map made a `LearnerProfile` table in every app's backend (its "who is signed in" read the training app's table,
and the backend makes a table on a query): **P127-BKO003-PROFILEWRITE**, fixed. The map now reads the app's own
people, groups and tables (`lib/people.mjs`, `projectTables`), draws a table the backend lacks, survives one failed
source, and says no training word. `test/any-app.test.mjs` (in `npm test`) 38/38; the whole suite 104 checks; the
training copy unchanged. The session log in BKO-003 has the mutants and the recording control.

## s4 (2026-10-26): BKO-004 built

A cloud function opens as its graph on Workflow → **On the backend**, from a step that runs it, from a helper it
places, and (with the map 0.1.3) from the map's panel; it says what it reads and writes and its last run. Read only.
Gates: Studio `check:functions` (fngraph 695/695, Chrome 46/46), `check:hosted` 16/16, the whole `check` list green;
six mutants red. The session log in BKO-004 has it all. Filed: **P127-BKO004-FNSTEPS** (a function's run records no
nodes, so its steps cannot be lit).

## s5 (2026-10-27): BKO-005 built

Workflow → **On the backend** lists the triggers and workflows in `nodegx.automations.json` above the functions, in a
person's words (a schedule in the backend's own cron words). A trigger opens as a flow into what it starts; a workflow
as its steps left to right, error routes red, each function step opening the function, the last run lit step by step.
A trigger's On/Off and a daily schedule's time are changed in Studio on the backend and in the file together
(`POST /api/automations/trigger`), and the agent's `what_changed_since` now answers `automations` with what the person
changed. Studio `4dc3310`; noodl-mcp `962f1716c`. The session log in BKO-005 has the grades and mutants.
Fixed on the way: **P127-BKO005-QUIETHOVER**.

🔴 The drive (`check:automations`) needs an agent server with BKO-001: the published `@nodegx/mcp` 0.2.6 has none. It
ran with `NODEGX_MCP=<scratch>/noodl-mcp.cjs`, built from this checkout by `esbuild` with `build-common.mjs` and another
`outfile` (never `dist/`, which Desktop runs). It joins `check` once `@nodegx/mcp` is republished.

## s6 (2026-10-27): BKO-006, the three briefs run and graded

The round is [`briefs/`](briefs/) (BKO-006's session log says how to run it). Three Opus strangers, each given only a
brief and `npm create nodegx@0.2.7`, built a book club, a repair shop's job board and a team's shared expenses with
sign-in, private rows, cloud functions and (two of three) a trigger; ~$6 and 20–40 min each. Graded: works, drawn
inside the conversation (Studio `editor/brief-check.mjs`) and shipped to a throwaway VM, all green; "open" missed only
the tables, now kept in `metadata.dbCollections` by `provision_backend`. Eight defects fixed (NodeGX 2fde69490,
412a19833; Studio 668212a, which also moved Studio's pins to the published 0.2.7 / 0.1.3); eight open rows filed
(`node scripts/bugs.js --from P127`).

**Next, in order (s7):**

1. **Richard rules SCHEDULEAUTH** (2 of 3 strangers opened a scheduled function to anyone, because a schedule runs as
   a visitor). Recommendation in the row: schedules and row changes run as the backend; webhooks stay visitors.
2. **Richard publishes `@nodegx/mcp` 0.2.8** with today's fixes (TABLESNOTINFILES is the one that makes "open" pass
   for a stranger), and the backend with it; then `automations-drive.mjs` can join Studio's `check` (it needs BKO-005's
   `what_changed_since`, which 0.2.7 lacks).
3. **Richard's fourth brief in Claude Desktop**, from the `.mcpb` (BKO-006's second half; BKO-002 AC2, BKO-004 AC3,
   BKO-005 AC1 ride along). Ask before rebuilding the Desktop dist.
4. The open rows with no owner, worst first: CLOUDUSERNODE, NOROLESFAILS, RUNONCHANGEGUESS (2 of 3), COMPVISIBLE and
   DRIVEHALFRUN (re-measure first: reported only), EMPTYSTARTPAGE, ROLESNOTINFILES.
5. The grader: drive a group-only rule (the expenses brief's) in `grade.mjs`.
6. BKO-005's map half (a trigger on the map; a map publish). Later: BKO-001 AC5 is in effect done by `travel.mjs`
   (three apps, their rules, functions, triggers and workflows on a VM) — fold it in when the task file is next read.

🔴 Traps met: a stranger's `--open` opens a browser on Richard's screen (the runner shims `open`); `claude -p` stays up
while a preview it started runs, and a turn's end is not the run's end; zsh does not split `$VAR` into paths (use an
array); the noodl-mcp suite takes ~16 min and has 8 red files at HEAD that are not this lane's.

**Older order (s6), kept for the record:**

1. **BKO-006**, three briefs no template covers, built by an agent, every part in the files and drawn.
2. **Richard:** publish `@nodegx/backend-map` 0.1.3 (Studio's pin and `vendor/NODEGX.json` move together), and a
   `@nodegx/mcp` carrying BKO-001 and BKO-005 (then `automations-drive.mjs` goes into Studio's `check`).
3. **Desktop:** BKO-002 AC2, BKO-004 AC3 and BKO-005 AC1 inside a real conversation, after the rebuild Richard approves.
4. BKO-005's map half: a backend trigger drawn on the map, wired to its table and its function (`fire`); a map publish.
5. Later: BKO-001 AC5 (the VM).

**Older order (s4), kept for the record:**

1. **BKO-005**, workflows and triggers drawn: it reads `nodegx.automations.json` (BKO-001) and puts them under
   "On the backend" beside the functions (`renderFnList` in `studio.html`, `functionList` in `editor/fngraph.mjs`).
2. **Richard:** publish `@nodegx/backend-map` 0.1.3 (the map's "Open its steps"; `cd
   dev-docs/tasks/phase-124-the-mystery-of-the-backend/editor && npm publish --access public`), then Studio's pin
   and `vendor/NODEGX.json`'s record move to 0.1.3 together (`npm run check:vendor` says if one is left behind).
3. **BKO-002 AC2 and BKO-004 AC3 in Claude Desktop**: both need Desktop to run a Studio carrying today's commits and a
   `noodl-mcp` carrying `837b4ece8`. Ask before rebuilding anything.
4. Later: **BKO-001 AC5**, a real ship to the throwaway VM, with the release.

**Not live for Richard yet:** Claude Desktop runs the `noodl-mcp` dist and the Studio it finds. A provisioned backend
runs the backend bundle. None was rebuilt. Ask before rebuilding the Desktop dist (from a clean worktree, the CCN rule).
🔴 `make-worktree.sh` symlinks `dist/` to the primary checkout: a build in the worktree writes the PRIMARY's bundle.
🔴 Studio's `studio.html` is a busy file (a peer committed into it during s2). The map change lives in `hosted.js`.
