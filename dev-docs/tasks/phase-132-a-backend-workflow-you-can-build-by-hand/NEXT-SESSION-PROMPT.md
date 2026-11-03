# P132 — next session

**BWF-004 is built** (s4, 2026-11-03; its [s4 logs](BWF-004-FORMULAS-WITHOUT-CODE.md#s4-2026-11-03-the-engine-half--items-14-ac1-and-ac2-green)
have each AC). A setting's value is typed, read from the run, or **a formula**: `{"$fn": "<name>", "args": [...]}` from
the backend's closed list of 27 (`packages/nodegx-backend/src/workflow/steps/formulas.ts`, served as `formulaLanguage`,
catalog 1.8.0), on in every step param, condition operand and transform field. In Studio it is picked by its words and
drawn as a sentence ("days between at and now"); AC3 held in the Electron app on a Greenhouse copy (6 days). NodeGX
`8d9907ccf`; nodegx-studio `759b834` (the editor) and `550d82a` (P132-STEPMENUOFFSCREEN, found on the way).

**First: BWF-004's AC4, the agent run.** "Work out how many days since the plant was watered in the workflow" asked of
an agent on a Greenhouse copy through the checkout's MCP: it should write a `$fn` formula, not a cloud function (one
run, the result read from `nodegx.automations.json`). Its words are in `noodl-mcp` `backendTools.ts` (the step `params`
description and `list_backend_step_kinds`); the always-on instructions say nothing about workflows. If the agent writes a
function anyway, the measurement is which words it read, not a new sentence by reflex (budget gate:
`tests/toolDisclosure.test.ts`).

**Then BWF-005** ([task](BWF-005-STEPS-THAT-ACT-ON-THE-DATA.md)): steps that act on the data (create, change, delete,
find a record). Its owed ruling: who a record step acts as (recommend "as the app", P127-BKO006-SCHEDULEAUTH). A
record's fields are filled with the same `runValueField` (typed / from the run / a formula).

What s4 leaves:

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
