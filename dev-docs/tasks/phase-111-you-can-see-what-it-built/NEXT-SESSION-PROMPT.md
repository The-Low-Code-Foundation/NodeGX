# Phase 111 — next session

**Rewritten 2026-10-19 by lane 7, session 2 (branch `l7-editor`, from `a2c4fc09c`).** Session 1's text is kept below
the first line, the scoping text below the second.

## Where lane 7 stands

| task | state |
|---|---|
| SEE-000 the census | 🟡 built in part: script, gate, honesty by hand ✅; the cost table (AC3) and the code app's row (§3.4) deferred |
| SEE-001 the honesty number | 🟡 built in every surface: `honesty.ts`, the MCP, the ratchet, the sentence, **the editor (s2)** ✅; the editor drive ⬜ (primary); AC6 ⬜ (Richard) |
| SEE-002 … SEE-012 | ⬜ never built |

## The next step: drive the editor surface from primary, then AC6

Session 2 built SEE-001 §4 item 3 (see SEE-001 §8) and graded it in plain Node (12 tests, 8 mutants killed) and in
pixels (a jasmine spec that runs only in `test:ci`). Nobody has looked at it in the running editor yet.

**The drive** (primary, after the branch lands, after `test:ci`):

1. Copy the template, never the original (opening a project writes files into it):
   `cp -R templates/digital-bricks-training <scratch>/dbt-honesty` and open the copy.
2. **The header** of the Project panel, left of the `+`, reads **`66% known`**. Hover: `Honesty: 66% known (475 known, 245
   script, 20 unspecced). 11.8% weighed by script lines (3393 lines).` then the sentence. It is 66, not the ledger's 67
   (`honesty-ledger.json`: 67, 578/285/20), because the editor loads through the registry and 33 cloud functions are not
   in it (bug `P111-SEE001-DBTCLOUDUNREGISTERED`); the MCP's `get_project_info` on the same copy says the same 66%.
   Click: the five components with the most script, the first `Pages/Settings  34 script · 56.4%`, then `People/Their
   path 21 script · 50%`, `Pages/Home 17 script · 59.5%`, `Pages/Course 15 script · 68.8%`, `People/Add a learner
   14 script · 54.8%`.
3. **Two rows** on the Components tab: `Settings` (Pages) reads **`56.4%`** behind a pink bar; click it: 12 script parts,
   the first `Forget the session here, then Home, saying it is done`, then a disabled `+22 more script nodes`. `App` reads
   **`40%`**. A row with no script carries no number, e.g. `Step chip` (Lesson) or `Roster row` (People): blank, and its
   `×N` lines up with the rows that have one.
4. **The canvas mark.** Open `Logic/Standing` (row reads `66.7%`): the Function `Count, pace, trajectory` has a 3px pink bar
   down the right edge of its titlebar; its two other nodes do not. A kit node carries it too: `Course/Trajectory row`'s
   `dbt-lesson.RatingGauge` (`Where they are against the goal`). A component instance never does. Clicking a script part
   in a row's popover opens its component with that node selected, and that node carries the bar.
5. AC2's live arm: add a Function node to `Logic/Standing`; its row reads `50%` and the header `65.9% known`
   (hover: 246 script). Delete it: back to `66.7%` and `66%`.

Then **AC6**: Richard reads the header and the rows on the training template and says whether the script list tells him
anything he did not know. His words go into SEE-001.

## Then

- The board's next lane-7 task (SEE-011, SEE-012).
- Owed small: the MCP's `apply_plan` result carries no honesty line yet (create/update do).

## Gates this lane added

- `packages/nodegx-node-spec/tests/see-census.test.ts`, `honesty-ledger.test.ts`, `honesty.test.ts` and
  `packages/noodl-mcp/tests/see001Honesty.test.ts` (session 1; see below).
- `packages/noodl-editor/tests-unit/see-001/honestyView.test.ts` (session 2, the `test:main` runner): the editor's walk
  reads the ledger's and the MCP's numbers, the panel's words, the canvas marks exactly the script parts.
- `packages/noodl-editor/tests/canvas/NodeScriptMark.test.ts` (session 2, jasmine, `test:ci`): the bar's pixels.

## Bugs found

- `P111-SEE001-DBTCLOUDUNREGISTERED` (session 1): it is why the editor and the MCP read 66% and the ledger 67%.

---

# Phase 111 — session 1 (kept)

**Rewritten 2026-10-19 by lane 7, session 1 (branch `l7-honesty`, from `e7e3e77db`).** Earlier text (scoping, 2026-10-01)
is kept below the line.

## Where lane 7 stands

| task | state |
|---|---|
| SEE-000 the census | 🟡 built in part: script, gate, honesty by hand ✅; the cost table (AC3) and the code app's row (§3.4) deferred |
| SEE-001 the honesty number | 🟡 built but for the editor: `honesty.ts`, the MCP surfaces, the ratchet, the sentence ✅; editor ⬜; AC6 ⬜ (Richard) |
| SEE-002 … SEE-012 | ⬜ never built |

The numbers (2026-10-19): training template **67.0%** known (578 known, 285 script, 148 of them kit nodes) and **6.9%**
by script lines; todo **87.9%** / 9.8%. All sixteen templates are in `CENSUS.md` and `honesty-ledger.json`.

## The next task to build in lane 7

1. **SEE-001's editor surface** (§4 item 3): the project number in the components panel header
   (`packages/noodl-editor/src/editor/src/views/panels/ComponentsPanelNew`), each component's number on its row, the
   script nodes marked on the canvas. Read `projectHonesty` from `@nodegx/node-spec`; never restate the rule. It needs a
   drive from primary (open a COPY of `templates/digital-bricks-training`, read the header and two rows against
   `honesty-ledger.json`). Then AC6: Richard reads it.
2. Or the board's next lane-7 task (SEE-011, SEE-012), if Richard rules the editor surface can wait.
3. Owed small: the MCP's `apply_plan` result carries no honesty line yet (create/update do).

## Gates this lane added (they run in the node-spec package suite, so in the PR workflow)

- `packages/nodegx-node-spec/tests/see-census.test.ts` — `census.js --check`: a template whose counts move without a
  regenerated `census.json` is red. **A template commit now regenerates the census in the same commit**
  (`node scripts/see/census.js`).
- `packages/nodegx-node-spec/tests/honesty-ledger.test.ts` — `honesty-ledger.js --check`: a template's number that
  falls is red; one that rises is red until `node scripts/see/honesty-ledger.js --write`.
- `packages/nodegx-node-spec/tests/honesty.test.ts` — the rule held to phase 107's files and to the census.
- `packages/noodl-mcp/tests/see001Honesty.test.ts` — the MCP surfaces on the real training template, with ceilings.

## Rulings owed

- **R-SEE-001-a:** the number counts nodes; counted by script lines it is about a tenth as high on the training
  template (6.9% against 67.0%). Both are shown; Richard says which one leads.
- R1–R5, R7 as below.

## Bugs found

- `P111-SEE001-DBTCLOUDUNREGISTERED` — the training template's 33 cloud functions are not in its registry, so the MCP
  reads 49 of 82 components (66.0% there against the census's 67.0%).

---

# Phase 111 — next session

**Written 2026-10-01 at scoping, HEAD `22303a534`.** Nothing is built. This file is the board until a session builds.

## The board (re-derived from the task files, 2026-10-01)

| task | state |
|---|---|
| SEE-000 the census | ⬜ never built |
| SEE-001 the honesty number | ⬜ never built |
| SEE-002 the text form | ⬜ never built |
| SEE-003 the picture follows the app | ⬜ never built |
| SEE-004 the script becomes nodes | ⬜ never built |
| SEE-005 the nodes as a code library | ⬜ never built |
| SEE-006 arrive with your code | ⬜ never built |
| SEE-007 the entrance moves | ⬜ never built |
| SEE-008 the companion door | ⬜ never built |
| SEE-009 the words on the tin | ⬜ never built |
| SEE-010 Richard's verdict | ⬜ never built |

## The next task to build

**SEE-000, the census.** First step: `scripts/see/census.js` over `templates/`, counting what the runtime instantiates
(reuse `scripts/node-spec/census.js`'s rule), reproducing README §1's two rows and explaining the wrapper over-count.
Then SEE-001 and SEE-002 in parallel; neither waits on a ruling to start (R1 only decides where the text form lives on
disk, and the recommendation keeps the JSON as the file).

## Rulings owed by Richard (README §8, plain words there)

R1 text form as file or as view · R2 show the number always · R3 Functions count as script until NSP-017 · R4 import as
fixture first · R5 one entrance for everyone · R6 publish `@nodegx/nodes-react` · R7 the slice, not the whole app.
Recommendations are in the table; none blocks SEE-000.

## The phase's end condition

README §7, eight criteria; the last is Richard's verdict on the training slice built through the door (SEE-010). Zero of
eight are met.

## What scoping settled

- Not an experiment phase. Richard declined the two measuring experiments (token factor; hand import of one screen) as
  preconditions. They survive only as acceptance criteria inside SEE-002 and SEE-006, measured once the thing exists.
- RISE read in full and ruled out as a mechanism, kept as an instinct (README §3).
- The training template measured: 147 Functions, 7,796 lines of script, in 1,037 nodes (README §1). That number is the
  phase's starting line.

## Product findings

None yet; nothing was built.
