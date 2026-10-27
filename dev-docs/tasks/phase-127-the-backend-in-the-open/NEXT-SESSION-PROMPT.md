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

## s7 (2026-10-27): SCHEDULEAUTH ruled and built; CLOUDUSERNODE fixed; NOROLESFAILS measured

- **SCHEDULEAUTH.** Richard was asked what a run the app starts by itself should count as (two of three strangers had
  opened a weekly job's function to the internet). He ruled **"counts as the app"**: a schedule, a row change and
  Studio's run-now (a trigger's or a workflow's) pass a function's "signed in only" with nobody signed in; a webhook, a
  direct call and the MCP door stay visitors. Built in `3e86bd685`: `nodegx-backend/src/workflow/startedByApp.ts`, the
  dispatcher and the workflow engine mark the in-process request `startedByApp` (never a header or a body field), the
  Request node reads it; Request spec v4 with two scenarios; the description in the runtime, the spec, both catalogs,
  the editor's library and `create_backend_trigger`. `p127-schedule-auth.test.ts` 7/7, nine mutants red, conformance
  red with the runtime line reverted.
- **CLOUDUSERNODE fixed.** Reproduced first, word for word: a User node's Fetch inside a function asks
  `GET /users/<id>` with the app's key, which the backend did not serve. It is now `GET /classes/_User/:id` under that
  path, behind the same `data` gate (`a73312163`). `p127-cloud-user-node.test.ts` with rules enforced; two mutants red.
  `ops-rate-limit`'s reviewed route tally moves `data` 19 → 20.
- **NOROLESFAILS does not reproduce at HEAD** (`p127-no-roles.test.ts`; the row has the four shapes measured). The
  round's transcripts were not kept, so the agent's graph cannot be read. 🔴 Keep the lab next round.
- Filed: **P127-S7-SBR015MUTANTSTALE** (SBR-015's broken copy no longer breaks; 5 red checks before this session).
- 🔴 My SCHEDULEAUTH commit missed `security-functions.test.ts` (CWF-017 asserted a run from Studio was refused); found
  by the wider run and updated in the s7 docs commit. Run the whole backend suite after a behaviour change, not only
  the files named after it.
- Seen red and not this lane's: node-spec's stranger hash gate for `dropdown.ts` and the Options scenario (since
  `aa9f30cdd` / `7083a8595`), census and honesty ledgers (a peer's working-tree edits), `isl040-sessions`
  (`actingSession.ts` is a second `_Session` writer since P124).

## s8 (2026-10-27): npm 0.2.8 cut, packed and graded; waiting on Richard's publish

Richard: "First: cut npm 0.2.8". Before the cut, **P128-S2-EMPTYSTATEREFUSED fixed** (`6cdafc718`, this lane's row:
the `ui-empty-state` example taught the wire COMPVISIBLE refuses; now a Group's `mounted`. `npmauditExampleInvalid`
116/116, red with HEAD's catalog). Release commit **`1d4592272`** (pushed with the 50 before it): `@nodegx/mcp`, the
three create-* and `@nodegx/preview` at 0.2.8, `@nodegx/node-spec` 0.2.2 (Request spec v4, the six controls'
Visible); project-contract, export and canvas-look stay (nothing they ship from moved since `541f6d3e0`). The lockfile
is HEAD's with four version lines (a peer's working-tree lockfile edit is not in it; its four lines were moved to
match). Gates before: create-nodegx 34/34, publishable.js 6/0, bugs.js gate 0 blockers on five kits, canon:check
16/16, changelog through the offline copy checks.

Packed in the worktree `OpenNoodl-worktrees/npm-0.2.8` at `1d4592272`, every linked build output replaced by a real
folder first (primary's dist untouched, mtimes read before and after); `check-pack-paths` passed (mcp 133 files,
preview 30). Tarballs and `SHASUMS.txt` in `OpenNoodl-worktrees/npm-0.2.8-tarballs`:

| tarball | shasum (sha1) | bytes |
|---|---|---|
| `nodegx-node-spec-0.2.2.tgz` | `00825cda607020c6399b142973f7238ff93ed13f` | 6,478,038 |
| `nodegx-preview-0.2.8.tgz` | `25e84daea9c33a3aa6f12ff1a9e7eeb30fcc5fda` | 6,245,365 |
| `nodegx-mcp-0.2.8.tgz` | `0856abb26305675407578839781c66e75b06167d` | 12,421,505 |
| `create-nodegx-0.2.8.tgz` | `52ce66adac9341b8f7cc116b0fa0e28a4b9c2b0c` | 43,751 |
| `create-nodegx-vibe-0.2.8.tgz` | `b84670cd6772f172a5e724a7786e9df1445f5b07` | 13,815 |
| `create-nodegx-cline-0.2.8.tgz` | `1f177f1c2f6d2278ce3afda69157d3bdbd712d00` | 14,064 |

Graded from the tarballs, outside the checkout, HOME empty: file lists equal to 0.2.7's (node-spec adds
`visible-at-once.d.ts` and its map); each fix counted in 0.2.7's tarball and 0.2.8's (0.2.7 is the control):
`startedByApp` 0→10, `users/:id` 12→13, `alsoInProjectEnvFile` 0→1, ROLESNOTINFILES's sentence 0→1, the same
`cli.js` byte for byte in mcp and preview; `data-ndl-keyboard-click` 0→2 in both viewers; `emptyWrap` 0→4 and
`option-set` 0→2 in `noodl-mcp.cjs`; `function-run-on-change-unknown`, `fire_backend_trigger`,
`click-area-holds-a-control` new; no `/Users/` in either bundle. A fresh install of mcp, preview, node-spec and the
published project-contract 0.2.2 / canvas-look 0.1.0: **npm audit 0**, project-contract resolves node-spec 0.2.2.
stranger-kit 16 CJS + 2 ESM, types under node/bundler/node16; stranger-render "DONE — clean"; stranger-backend every
step (the 400 names the `.env` line); `nodegx-deploy --full-stack` on a todo-list copy exit 0, `start.js` `/`,
`/health`, `nodegx-config.json`, the licence 200, a sign-up 201, a clean stop; `create-nodegx my-apps` pins
`@nodegx/mcp@0.2.8` (5 places).

**Publish = Richard's terminal (OTP):** `scripts/own/publish-npm.sh ../OpenNoodl-worktrees/npm-0.2.8-tarballs`
(node-spec, preview, mcp, then the three create-*; it skips what is live and waits out npm's review). After: read each
shasum from the registry's full document against the table, `npm create nodegx@0.2.8` pins mcp 0.2.8, Studio's pins
move to mcp/preview 0.2.8 with `vendor/NODEGX.json`, `automations-drive.mjs` joins Studio's `check`, and the
changelog page (nodegx-web, Richard's upload).

🔴 My first grade printed four NO probes that were my script's: `probe()` set `v=yes`, which overwrote the loop's
`v`, so every probe after the first read a folder that does not exist and counted 0 in both versions. A probe that
reads 0 in the control too is reading nothing; the live stranger-backend run had already shown the new `.env` sentence.

**Next, in order (s8):**

1. **Cut npm 0.2.8, once P128 settles** (Richard, 2026-10-27: "Wait for P128 to settle"; ask him whether it has
   before cutting). There is no separate backend bundle: `@nodegx/mcp`'s `prepack` copies the backend in
   (`build-backend-copy.mjs`), so one mcp release carries s6's and s7's fixes (TABLESNOTINFILES makes "open" pass for
   a stranger; SCHEDULEAUTH, CLOUDUSERNODE). Nothing is cut yet: Richard ran `publish-npm.sh` on a folder that did not
   exist and it skipped every package. The recipe is the 0.2.7 re-cut's (`dev-docs/reviews/beta-bug-sweep-2026-10-24.md`
   "The npm 0.2.7 re-cut") and the 0.2.6 cut's (phase-26 NEXT-SESSION-PROMPT, `2cac89c05`): a release commit (mcp and
   the three create-* to 0.2.8, any package whose shipped code moved, the lockfile's version lines only, CHANGELOG
   through the copy checks), **ask Richard before pushing**, pack in a clean worktree at the pushed commit (linked
   `dist/` replaced by real folders, `check-pack-paths` must pass), grade the tarballs outside the checkout, write
   `SHASUMS.txt`, then hand him `scripts/own/publish-npm.sh ../OpenNoodl-worktrees/npm-0.2.8-tarballs`. Check first
   whether node-spec (Request spec v4) and preview (the full-stack deploy carries the backend) must move too. After
   the publish, `automations-drive.mjs` joins Studio's `check`.
2. **Richard's fourth brief in Claude Desktop**, from the `.mcpb` (BKO-002 AC2, BKO-004 AC3, BKO-005 AC1 ride along).
   Ask before rebuilding the Desktop dist.
3. The open rows (`node scripts/bugs.js --from P127`): ROLESNOTINFILES, FNSTEPS, S7-SBR015MUTANTSTALE; NOROLESFAILS
   only with a kept lab. RUNONCHANGEGUESS, COMPVISIBLE, DRIVEHALFRUN and EMPTYSTARTPAGE were fixed by the Beta sweep
   s17 (L3) the same afternoon (`30cb6671c`, `79cbc4674`, `4bf7e4664`, `809c2c231`).
4. The grader: drive a group-only rule (the expenses brief's) in `grade.mjs`.
5. BKO-005's map half (a trigger on the map; a map publish). BKO-001 AC5 is in effect done by `travel.mjs`: fold it in.

**Older order (s6 → s7), kept for the record:**

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
