# Phase 92 — next session

**Written 2026-09-15 at the end of s5 (CHR-005).** Branch `cline-dev`. Phase commits before s5:
`2225624e1` (scoping, CHR-001, rulings), `0a4c53e24` + `9706a1a81` (CHR-002), `f25d5816f` + `57512511d` +
`965ce9cbb` + `e2352b60c` (CHR-003), `e3bafda8d` + `c6f24e1f0` + `af852a884` (CHR-007), `b2b5c230b`
(R2–R8 ruled). s5's commit is listed in `git log -- dev-docs/tasks/phase-92-dreamweaver-called`.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard looked, s3: "Looks good." |
| CHR-003 one radius, one shadow, one box model | ✅ built s3. **Not yet looked at by Richard** |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| **CHR-005 one launcher page** | ✅ **built s5 — the first visible change. Not yet looked at by Richard.** §6 of the task file |
| CHR-004, 006, 008, 009, 010, 011 | ⬜ not built |

## First job: show Richard CHR-005

The shots are in `verdicts/CHR-005/2026-09-15/`: 16 drive shots (four tabs × 1368×900 and 700×500 × dark
and light) plus three AC4 arm shots. The PNGs are gitignored by ruling, so they are local only — hand him
the folder, or re-run `drive.js` on a fresh stack. What he is judging: one column, one title, one
toolbar, one card, one filter chip and one set of buttons on all four tabs. Template cards show a
**wireframe**, because no shelf entry carries a picture yet. That is CHR-006's job, and it will look
like placeholders until CHR-006 lands.

## Then, in order

1. **CHR-006** — the pictures. R4 is ruled: `thumbnail` + `eyebrow` on the shelf entry, headless render
   as a fallback. Inherited from CHR-005 (task §6.5):
   - the card, the grid and `LauncherCardWireframe` already exist — CHR-006 changes the picture slot and the grid spans only;
   - 🔴 `Templates.tsx` may **not** name `needsBackend` (the `rel-013` "cannot create" absence row), so the backend tag needs a display-only prop;
   - `object-position: top center` for the demo shots (task §5).
2. **Track B:** CHR-008 (R8 ruled), then CHR-009 (R6 trial, R7 tab). CHR-008 inherits from CHR-007:
   `focusGatePort`'s retry wants a `ref`, and the five hash clears exist because the hash cannot see
   expansion or undone values.
3. CHR-004 is now smaller than scoped: CHR-005 retired three CSS-text pins (task §6.4), and the drive
   script's rendered-contrast pass (`drive.js` `CONTRAST`) is a working prototype of the gate R3 asks for.

## Still Richard's

1. **CHR-005's look** (above) and **CHR-003's look** — both block nothing.
2. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — told him in s4; do not quietly revisit.
3. R6 becomes final only on his look at CHR-009's screenshots.
4. R7's marker-on-the-tab detail was proposed, not ruled.
5. **New from s5:** the Projects tab still stacks two full-width cards (Connect Claude Code, Join the
   community) above the grid. Those placements are BST-003's and UNI-001's rulings, not this phase's —
   ask before moving them below the projects.

## What s5 settled, including where the handoff and the task file were wrong

- 🔴 **CHR-005 §2 was wrong four ways** (task §6.1): the tab arrays were already data; `MOCK_PROJECTS`'
  default-on never applied inside the editor; `PrimaryButtonSize.Small` already existed; and a
  `thumbURI` is a **3.16:1 strip**, not a picture — so project captures are fitted to width, not cropped.
- 🔴 **AC2's instrument cannot show the fix.** CHR-001's `measure.js` counts every `button,[role=button]`
  (tabs, chips, cards, the settings glyph) and still reads 7. By kind: 1 button style, 2 chip styles,
  1 card. Grade by kind; never claim the 7 moved.
- The drive **found a defect nothing else could**: a page too short to scroll centred its column 4px
  off the others (no scrollbar). `scrollbar-gutter: stable`.
- The drive **found a contrast defect I introduced**: the selected chip's primary label on the primary
  wash was 3.6:1 in light. Fixed; the second run reads 0 on Templates.
- Pre-existing and left alone: the project kebab (1.36 / 1.22 fill, no edge), the selected folder row
  (1.23 / 1.12), the segmented tab's active fill (1.17 / 1.10).
- §3.8 (inline styles, `ProjectSettingsModal` stylesheet) is **unbuilt**. No AC grades it; 42 of the 65
  are `GitHubRepos` and the unreachable `LearningCenter`.

## Readings taken this session (2026-09-15, s5, tree = `b2b5c230b` + CHR-005)

- `tsc -p packages/noodl-editor --noEmit`: **EXIT=0**.
- jest, the 19 specs importing a changed module: **664 / 664, EXIT=0** after the folder-tree re-point
  (first run 658/664 — all 6 reds that one pin, task §6.4).
- Ratchets unpiped: type / colors / tokens:css / icons:css **all EXIT=0**; type baseline 128 → 127 (Chip only).
- **`test:ci`** (cache cleared, alone, seed 84922): **`2984 specs, 8 failures`**, fresh `test-results.json`
  (18:15:24), **the same eight by name** (`SUB-006` ×3, `SUB-011` ×3, `NDA-017` ×2). A reading of 8 with a
  different name in it is a regression.
- Drive: AC1 met on all 16 shots (numbers in task §6.3); AC4 both arms with controls.

## How to drive the chrome (the recipe that worked in s5)

- Profile: `profile/` holding `firstRunLegal.json` (`{"shown":true,"version":"0.1.0"}`), `editorSettings.json`
  (`{"settings":{}}`) and `recently_opened_project.json` (`{recentProjects:[…]}`). Rows copied from
  `~/Library/Application Support/NodeGX/recently_opened_project.json` **with their `thumbURI`**, and
  `retainedProjectDirectory` pointed at `cp -R` copies.
- `cd packages/noodl-editor && env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS NOODLPORT=8674
  NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<profile> npm run start` — READY in about 70s. Wait for
  **both** `compiled successfully` and a `page` on `:9333/json/list`.
- 🔴 **HMR can leave the old CSS live.** A later "compiled successfully" line never printed; read the rule
  text out of `document.styleSheets` before trusting a re-drive, and `location.reload()` if needed.
- Stop: the 8080 listener pid, then the Electron **main** pid (the one with `MacOS/Electron
  --user-data-dir=`), then its crashpad handler. 🔴 `grep profile | awk` also matches the helper
  processes; a multi-line pid list makes `kill` fail and the Electron keeps 9333. Check the three ports after.

## Traps (details in the task files' §6)

- 🔴 One heavy job at a time. s5 ran tsc → jest → stack → drive → teardown → jest → `test:ci`, in that order.
- 🔴 Anything `TemplatesTabBody` renders must be **hook-free** (`renderElements` calls components), and a
  spec that reaches `PrimaryButton` needs FLD-017's `Icon` `jest.mock`.
- 🔴 A notification's "exit code 0" reports the wrapping subshell — the log's `EXIT=` line is the reading.
- 🔴 `Ports.ts` does not load in plain jest; zsh does not word-split `$VAR`; a throw during collection is
  `Tests: 0 total`.
