# Next session — P109 session 30

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 29 (2026-10-07 → 08, on `cline-dev`):** **ISL-038 closed, 15 of 15.** Landed: C87 + C89 (`31c78fe6e`), C88 + C90
(`9e4c79935`), C86 + C95 with the Group spec v3 (`3364b47f6`), C83 (`c335f5d90`), and C81 as ruled "the zone tracks itself"
(`52fdaf088`), each graded on the runtime target at seeds 13 and 20732 with a control. Docs `5913ef609` and s29's closing commit.
The board is **23 of 47 closed**. Records: ISL-038 §10 and "§10 continued".

## How s29 worked (read before touching a shared node)

- P107 grades the specs in the same tree. Every fix was built in a worktree (`scripts/devtools/make-worktree.sh <name> HEAD
  /Users/richardosborne/vscode_projects`), graded there, rebased onto P107's latest commit, and landed. Where P107 had an
  **open edit** on a landing path (`conformance.test.ts`, `equivalent-mutants.ts`), the landing was a compare-and-swap of the
  ref, `git checkout HEAD -- <clean paths>`, and the peer's working copy rebuilt as the new HEAD plus exactly their delta
  (`git merge-file`, then check: the lines added and removed, as a multiset, equal the peer's). Tell P107 the hash after.
- P107 asks for CPU windows by message. Pause your loop's shell with `kill -STOP <its zsh pid>` (the run in progress
  finishes, the next waits), reply "go after PID n", and `kill -CONT` on their "done". Never `pkill` by name.
- **The spec-package gate list for any visual spec change** (s29 missed the page model once): `cd packages/nodegx-node-spec &&
  npx jest tests/page-model.test.ts tests/catalog-parity.test.ts tests/schema.test.ts tests/batch-visual.test.ts` (~10 min),
  then the runtime per node group so no run hits jest's 30-minute `beforeAll`: `NSP_ONLY=Text,Circle,Image`, `Group`, `Video`.
- A fast probe for a handful of scenarios on the runtime target: a throwaway test calling `runConformance(spec,
  withViewerNodes(runtimeTarget()), { sequences: 0, mutants: false, scenarios })` with `loadScenarios(type)` filtered by name
  (s29's `zz-s29-probe.test.ts`, in the scratchpad, never committed). Seconds, not minutes; use it for controls.

## What s29 found that the handoff did not know

- 🔴 **A runtime fix for C90 was wrong and the runtime grade caught it.** `bindToWrapper` brought Click back but fired it
  before Pointer Up. Block Pointer Events also stopped the scroller's moves, so a scroll Group with it on never followed a drag.
- 🔴 **C81's proposed fix could not be graded** (browsers do not reliably report a drag leaving the window, and the target fires
  a replaced element's leave at a detached element), so it was asked and ruled.
- **Fixing a modelled row strands mutants** (C86: two `person.click` survivors until a scenario reached the lost branch; C81:
  ~20 per node until write-always). Memory: `fixing-a-modelled-row-can-strand-a-mutant`.
- **P107's open helper code can read what you delete** (`heldAt`, used by P107's Video rows, stays in `conformance.test.ts`).
- The P109 s27 probe `zz-p109s27-slider-scenarios.test.ts` was left in the primary tree; s29 deleted it.

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (23) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027, 028, 029, 030, 032, 033, 038 |
| 🟡 Track F, building | ISL-031 (20 of 23: the Text's drag rows C77, C78, C79) |
| 🟡 building | ISL-013 (slice 1 landed; left AC1's deployed drive, AC3's Settings → Kits, AC4 garden kits, AC5 job table, AC6 census) |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |
| ⬜ Track G, not started | ISL-039 … ISL-047: 51 bugs no phase owned. Blockers in ISL-039, security rows in ISL-040 |
| ⬜ not scoped | P107's rows handed over under R16 after ISL-038 was scoped: the Drag (C101–C106), the Component Stack (C107–C114), the Page Router (C115–C118) |

## Do, in this order

1. **ISL-031's Text drag rows C77, C78, C79** (C79 is a known row on the Text, Shape, Image, Group and Video). drag-drop.ts is
   free: P107's Drag spec reads react-draggable, not drag-drop.ts. Known rows live in `conformance.test.ts`, which P107 edits:
   check `git status` and land by compare-and-swap if it is dirty.
2. **Scope a task for P107-C101 … C118** (README §4 format, from the ledger files): the Drag's C101 (high: on touch nothing
   inside a Drag can be tapped — react-draggable cancels touchstart; it hits the Site Builder SectionRow's buttons and fields;
   proposed fix a `cancel` selector in Drag.tsx), C102 (Axis X still reports Drag Y and Delta Y), C103 (Drag draws only its
   first child), C104 (CSS Class and Style do nothing), C105 (a Snap Do that waited for the mount runs from 0), C106 (a Start
   Drag X/Y of NaN blanks the page: a setState loop); the Component Stack's C107 … C114 (C107 and C110 medium: requests never
   answered; record in P107 NSP-016 §7.17); the Page Router's C115 … C118 (C115 and C117 medium; §7.18). None has a `task:`
   line yet. Then build, worst first.
3. **ISL-013 slice 2:** AC4 (garden-3d-kit `requires` garden-kit, drops its copy and the `__noodl_modules` walk; retire the pin
   gates by name; regenerate the kit copies and the template, byte-compare), AC5 (the job table's one home), AC6 (every shipped
   module's injection byte-identical), AC3's Settings → Kits, AC1's deployed drive. The exporter's two bootstraps are P18's.
4. Then ISL-018 AC5, ISL-012 AC3.
5. **Track G (ISL-039 … ISL-047, README §4)**: its blockers and security rows outrank items 3–4 by severity; Richard picks the
   order (asked s29, not yet answered). `packages/nodegx-backend` was quiet on 2026-10-07 (no open edits, last commit 10-05).

## Decisions for Richard (not yours)

- **Track G's order**: the data-loss blockers (ISL-039: a restored backup loses workflows, sign-in, files and settings; migrate
  overwrites a PostgreSQL database that already holds rows), the security holes (ISL-040: a cloud function can set any account
  field, adminAccess included; a function deployed with no rule runs for any signed-in user), or the kits (ISL-013 slice 2).
- **Layout of an unlabelled control (s26, measured in jsdom only)**: a real-browser check on a form template before a release.
- `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY` (recommendation: yes), `P109-S20-LISTDEFAULTTYPE`,
  `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export):** ISL-013's `getModule` is not on the exporter's two kit bootstraps; ISL-038's fixes were not checked on the
  exported app. Plus s26's and earlier lists (STATESRUN, FEEDZONE, BADBODY, …).
- **P107:** C100 (a `<video>` takes no pointer or file drop) stays open, so C81 cannot show on the Video's runtime yet.
- **Release notes, add (s29):** a Group with an empty Tag draws a div instead of stopping the page; a wired 1 in Native platform
  scroll is native scroll; a snapping scroll Group counts its cards for Drop Index; a scroll Group with Block Pointer Events on
  fires Click and follows a drag; a Group off the page reports Unchanged to Focus (new Unchanged output); a click after a Group's
  Tag changes counts as a click on it; a keyboard-carried card never drops into a column that left the page (Space cancels); a
  file drop zone goes dark when Accept File Drops is switched off or it leaves the page, and a redrawn zone counts afresh.

## Gate readings taken s29 (2026-10-07 → 08)

- **Group six** (graded on `c9106c613` + the three commits, landed as `31c78fe6e`…`3364b47f6`): runtime, Group v3 at seeds 13
  and 20732 (1390 / 1395, the 5 the open C79 row; 0 divergences); Circle and Image at 13, Text at both (earlier run); interpreter
  Group conforms; viewer 1807 / 1807; catalog, merge, docs:nodes, cloud-library, port-groups checks clean. Control: HEAD's three
  viewer files red on exactly 15 row scenarios, 9 twins green on both. 🔴 `page-model.test.ts` was **not** run and went red
  (G4 `stampOn`); P107 fixed the helper in `3236d5f03`.
- **C83** (`c335f5d90`): runtime, the five at 13 and 20732; spec package 361 / 361; viewer 1807 / 1807; control red on all five.
- **C81** (`52fdaf088`): runtime, the five at 13 and 20732; after rebasing onto `b28354feb`, the five at 13 again and the spec
  package 371 / 371; after rebasing onto `afb4bffe6` (P107's Router: its own rows only), page model + catalog parity + schema
  359 / 359; viewer 1807 / 1807; control red on 11 / 48 / 48 / 13.
- `bugs.js check`: 5 problems, none from s29's rows (the same five as s28).

## Recipes

- **A CAS commit:** `GIT_INDEX_FILE=<tmp>`, `git read-tree HEAD`, `git add` the paths, check the staged count, `commit-tree`,
  `update-ref HEAD NEW BASE`, then reset each committed path in the real index.
- **Landing a branch over a peer's open edit:** `git update-ref refs/heads/cline-dev <branch> <old>`; `git checkout HEAD -- p`
  for each clean landing path; for the dirty one, `git reset -q -- p` and write `git merge-file -p peer base mine` (or replay
  your edit onto the peer's copy if it conflicts); prove the multiset of changed lines equals the peer's delta.
- **A control:** back up each file by name, `git show HEAD:$f > $f`, run the probe, restore in the same command and `cmp`.
- **Why a mutant lives:** log the twin's `example` once from `runner/mutants.ts` (the `for (const b of branches.values())`
  loop), run one node, restore the file and `cmp`.
