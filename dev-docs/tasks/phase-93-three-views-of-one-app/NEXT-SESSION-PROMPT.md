# Phase 93 — next session

**Written 2026-09-20, end of session 25.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built TVW-004/005; s18 built and drove TVW-006; s19 got two rulings and reshaped
TVW-008; s20–22 built TVW-007's eyebrow, trail and hover; s23 built TVW-008's surface; s24 drove
TVW-007's hover.
**s25 ran the two gates nobody had run, closed TVW-007 AC6 and TVW-008 AC8, found that AC1's
"with the Hero node selected" was never implemented, built it, and drove AC1 to 24/24.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ | **AC1, AC2, AC2b, AC3, AC4, AC6 green. ONLY AC5 (Richard's WORTHY) is left** |
| TVW-008 | The board | ✅ slices 1–2 | **AC8 ✅.** AC1, AC3–AC7 need the drive |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 57** (54 at s24; s25 added TVW-007 **AC1** and **AC6**, TVW-008 **AC8**).

## 🔴 Start here

1. **TVW-008 is the whole remaining build, and it is one drive from six ACs** (AC1, AC3–AC7). Its
   script does not exist. Everything it needs is now known and cheap — see §"what s25 learned"
   below, which will save that drive an hour of the faults s25 paid for. AC4 additionally needs the
   **authored fixture** TVW-008 §9.6 describes: a component with a `bench.scenarios[0]` that
   visibly changes what draws (the input must be **connected** to the visual root and its scenario
   value must differ from the node's default, or the arm passes on dead code). **0 of 5,922
   components in the corpus have a scenario**, so it must be authored, not found.
2. **THREE verdicts are with Richard and nobody else can do any of them**: TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20). The first two close
   their tasks on the spot. **Do not re-send them.** No ruling file had landed at s25.
3. 🔴 **One ruling is OWED and it is small.** s25 wired the trail crumb to restore the selection but
   **deliberately did not do the same for ⌘[**. §4 asks for selection on the trail press and asks
   ⌘[/⌘] only for the right trail, so the two gestures now land in the same place and differ in
   selection. If that reads wrong it is a one-line change in `goToCurrent`. **Ask Richard in plain
   words; do not decide it silently.** TVW-007 §12.5 has the reasoning.
4. **If Richard has ruled on the placement**: the winner becomes a constant, `eyebrowPlacement.ts`
   is **deleted** with the three losing branches in `instanceEyebrow.ts`. 🔴 A switch that outlives
   its verdict is a second copy of a decision.
5. **TVW-009 and TVW-010 are unblocked** — 001, 002 and 004 are all built. TVW-009 is the cheapest
   unstarted task on the board if TVW-008's drive is not on.

## 🔴 What s25 learned — read this BEFORE writing TVW-008's drive

Full record in TVW-007 §12.7–§12.8. **Four instrument faults, and all four were one mistake:
reading "present" where the arm needed "usable."** The fourth phase running to pay for
`correct ≠ usable`.

1. 🔴 **`ed.selector.selection` DOES NOT EXIST. It is `ed.selector._selected`, an Array.** The
   reader mapped `undefined` to `[]` and reported *"nothing is selected"* — **failing AC1's
   headline arm against a wire that worked**. Arm any reader with a known-firing control
   (`selectNode(x)` then read back) before you trust an absence it reports.
2. **Aiming is not hitting.** A visual child is drawn INSIDE its parent, so hovering the child's
   centre opens the **parent's** card. Choose a subject by measurement: hover each candidate, keep
   the first whose card names it. ⚠️ `instanceHover.state.node` is **not exposed** — the card's own
   path is the identity.
3. **The Components panel opens on the LAYERS tab**, so `component-tree-item` matches 0 rows.
4. 🔴 **And once tabbed, the tree is `0 × 0`.** 18 rows in the DOM, `display:flex`,
   `visibility:visible`, **every rect zero** — a click computed from a row lands at `(0,0)`. Three
   separate arms read *"the component is not in the panel"* when the panel simply had no size.
   **`SidebarModel.instance.switch('components')`** gives it one. The panel's own filter input has
   the same defect and is **still invisible** (`offsetWidth` 0), so expand folders by clicking.
   **Grade `boxedRows > 0`, never `querySelector` alone.**

**Keys, for any drive that needs them.** ⌘[ / ⌘] are real and live in
`EditorDocument.tsx:755-763`. A first grep over `views/nodegrapheditor` and the Electron menu found
**nothing** and nearly recorded the gesture as unbuilt. The handler matches on **`event.key`**
(`KeyCodeUtils.fromString`), so dispatch `key: '['` with **`modifiers: 4`**;
`windowsVirtualKeyCode` alone fires nothing. 🔴 **Press real keys** — `navBack` calls the same
`goBack` the trail's back button calls, so calling it directly re-grades the button.

## 🔴 The two gate lies s25 paid for

1. **`NODE_OPTIONS=--max-old-space-size=2048` killed webpack at 60s with SIGABRT.** That number is
   the *test runner's*; it is **half** this box's 4144MB default, and the repo sets none. s21–s23
   had always run on the default. **Do not carry a heap number between contexts.**
2. 🔴 **The harness reported that dead run as "exit code 0"**, because a backgrounded command
   reports its LAST statement — the real 134 survived only because it was captured into the log.
   **Read the duration and the artefact mtime, never the harness's exit line.** A 60-second
   `test:ci` with an unmoved `test-results.json` did not run.

## The gates, as of s25

- **`test:ci` AT THE FLOOR, twice.** 3012 specs, 8 failures, and the eight are the floor **by name**
  (3 SUB-006, 3 SUB-011, 2 NDA-017) at **two different seeds** — 52534 and 01627. Fresh
  `test-results.json` both times, mtime matching each run's END.
- **`test:main` 521 suites / 8350 specs, exit 0.**
- 🔴 **An AC clause can be graded by the OTHER RUNNER.** TVW-007 AC6 also names `leg-005`/LGC-008's
  trail-visibility pins, which live in `tests-unit/` = **jest**. The jasmine `test:ci` never loads
  them, so their silence in that log means *absent*, not *green*. Read both.
- **`board-export.test.ts` ran for the first time since s23's `boardFrameMounts` extraction and is
  green** — the s24 handoff named it the likeliest breakage. Its describes are all `TVW-008 …`,
  which is why grepping the log for `board-export` reads zero.

## 🔴 The drive hazard

`npm run dev:debug` exiting **144** is the **single-instance lock**, not a launch failure — and the
Electron on 9222 may be a **peer's**. `cdp.js` attaches to whoever holds the port and never asks
whose it is. **Two dev stacks cannot coexist** (`webpack.renderer.dev.js:24,38` hardcode 8080).
**Attribute before you touch**: `lsof -nP -iTCP:9222 -sTCP:LISTEN -t`, then walk `ppid` to a Claude
Code pid and compare with your own. ⚠️ **Never `dev:stop` a stack you have not attributed.**
⚠️ **`dev:stop --list` first** and check the list for peers' `noodl-mcp` Electrons; at s25 it was
clean (46 processes, all mine) and the teardown left every peer alive.
⏱️ **The stack takes ~7 minutes to reach 9222** — the Viewer webpack alone took 364s. Start it
early and do desk work while it boots.

## Committing

🔴 The working tree carries other sessions' work — **~99 dirty files** at s25. **Commit through a
temporary index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`, `GIT_INDEX_FILE`,
`read-tree $BASE`, `update-index --add` **naming your paths** (untracked included; a pathspec commit
skips them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE`. Then refresh the
real index (`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`) and confirm
`git diff --cached --stat` is empty. ⚠️ **The base moved under s25 TWICE** — peers landed P97 and
another commit mid-session — which is exactly what the CAS is for. **Re-read `HEAD` immediately
before each commit.**

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file. ⚠️ `dev-docs/tasks/**/verdicts/**/*.png` is **gitignored** — shots are for Richard and
the local record, never committed.
