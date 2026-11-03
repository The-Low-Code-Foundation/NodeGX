# P132 — next session

**BWF-004 is done** (s4 built it; s5, 2026-11-03, ran AC4: [the record](BWF-004-FORMULAS-WITHOUT-CODE.md#s5-2026-11-03-ac4-the-agent-run-and-three-things-it-found)).
Formulas are `{"$fn": "<name>", "args": [...]}` from the backend's closed list of 27 (`steps/formulas.ts`, served as
`formulaLanguage`). s5's agent, asked to make *When a plant is watered* give back how many days ago the watering was,
wrote a `date-difference` formula and no cloud function ([agent-round-bwf004.mjs](agent-round-bwf004.mjs), `build`
round). AC4's own sentence ("work out how many days…") was read as a question and answered; it built nothing. s5 fixed
what the round met: P132-STEPKINDSCUT (the step catalog passed Claude Code's 50,000-character cut with s4's formulas;
now raised for Claude Code), P132-RUNERRORNOREASON (a failed run names its step and the step's message), and a clearer
refusal for a transform's `$default` nested in a formula.

**Next: BWF-005** ([task](BWF-005-STEPS-THAT-ACT-ON-THE-DATA.md)): create, change, delete, find a record as steps.
**Ruled (R5, README):** a Bubble-style *Ignore privacy rules* switch per workflow, **on by default**. On, a record step
acts as the app; off, as whoever the run is for (nobody, for a schedule). Measured before asking: a function's record
access always runs as the system (`service.ts:638-645`, the loopback client's admin key), and Greenhouse's Plant may
be changed by its creator only, so *Mark watered* as a step (AC3) needs the switch on. Design noted in s5, not built: a
record step can write through that same loopback (`globalThis._noodl_cloudservices`: endpoint, admin key, `X-NodeGX-Run`)
so hooks, the ChangeBus (db-change triggers) and run attribution are the function path's by construction; with the
switch off it sends no admin key. The db-change loop guard already exists (`triggers/dbchange.ts`, a depth cap of 1):
AC2 tests it, it does not build one. A record's fields are filled with the same `runValueField` in Studio.

BWF-005's AC4 (an agent writes the step, not a function) reuses [agent-round-bwf004.mjs](agent-round-bwf004.mjs): add a
prompt, keep the lab. 🔴 Rebuild `packages/noodl-mcp` first (`node build.mjs`; s5 found its dist a day older than the
words it was testing) and the backend's `dist/`. 🔴 Fence the repo and the other rounds by name, never all of
`//Users/**`: Claude Code saves a result over 50,000 characters under `~/.claude/projects/` and the agent must be able to
open it. Write the request as a change to the app, not a question: s5's question-shaped AC sentence built nothing.

What s4 leaves (still open):

- **A record's date** (a Watering's `at`) unfolds in *What it can read* into `__type` and `iso`; a person wants it
  whole, as a Pointer already is (`readTree` in `studio.html` folds a Pointer only).
- **A JSON setting** (a Transform's fields, Validate's rules, a Switch's cases: `jsonField`) still takes no formula
  control and no drop.
- **Text with values** is the `text` formula, its parts slots one under another; a single line with pills inline
  ("Hi {name}, your {plant} needs water") is not built.

Before anything: `git status` in both repos (NodeGX `cline-dev`, `../nodegx-studio`). Studio's `editor/studio.html` is
the file every Studio session edits; an uncommitted change in it is someone's live work, and a pathspec commit takes a
peer's unstaged hunks with yours (s3's commit took opennoodl-5d's: `git diff -U0 editor/studio.html | grep ^@@` first).
Three `docs/look/s2-composer-*.png` in Studio are still someone else's, uncommitted. NodeGX's index may hold a peer's
staged file: commit through a temporary index.

🔴 **Studio from the kit** (backend 0.2.9) has no tests (`testRuns`) and no formulas (`formulaLanguage`) until a NodeGX
release carries `511e41d5d` and `8d9907ccf`: Studio refuses the test and offers no formula there (both graded). Drive
with `NODEGX_REPO=<the NodeGX checkout>`, and **rebuild the backend's `dist/` first** if `src/` is newer
(`npm run build` in `packages/nodegx-backend`, gitignored; it bundles to `dist/index.js`).

**Driving the Electron app on a Greenhouse copy:** [greenhouse-drive.mjs](greenhouse-drive.mjs) (s2: sample, test, up
to a step), [greenhouse-drive-bwf003.mjs](greenhouse-drive-bwf003.mjs) (s3: a field dragged onto a setting) and
[greenhouse-drive-bwf004.mjs](greenhouse-drive-bwf004.mjs) (s4: a Return added, its value a formula from the menu, a
value picked from the run, tested again). Copy the newest. Each copies Greenhouse, gives it its own backend
(`NODEGX_BACKENDS_DIR`), starts Studio's Electron hidden on CDP 9461 (check it is free:
`lsof -nP -iTCP:9461 -sTCP:LISTEN`), and drops `ELECTRON_RUN_AS_NODE`. Set `NODEGX_DRIVE_DIR` to your scratchpad.
🔴 After a test a step's panel runs past the 1000 px window: s4's `press` scrolls its target into view and says so; the
s2/s3 drives' `press` does not. In a template string passed to `ev`, a backslash is lost (`'value\\s+'` became
`values+`): write the check without one.

Studio gates before you commit: `npm run check:automations` (with and without `NODEGX_REPO`), `check:hosted`,
`check:editor`, `check:app` (screen unlocked), one at a time, the Chrome ones outside the Bash sandbox. Never
`nice -n 10 NODEGX_REPO=… npm …` (nice runs the assignment as a program, exit 127): `NODEGX_REPO=… nice -n 10 npm …`.
Backend: the 39 suites that reach the workflow layer (`grep -lE "workflow/|WorkflowEngine|WorkflowSubsystem|/steps/|workflow-defs|stepKindCatalog" tests/*.test.ts`)
run in about 3 minutes; the whole backend suite holds 305 suites with browser drives and is not one gate.

Still open: the list shows triggers as rows of their own (BWF-001 item 8's fold); TriggerTest's three ports crowd the
column gap at 71 %; Richard's re-walk of BWF-001 points 2–4 (AC7).
