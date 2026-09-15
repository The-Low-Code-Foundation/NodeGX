# Phase 92 — next session

**Written 2026-09-15 at the end of s4 (CHR-007).** Branch `cline-dev`. Phase commits so far:
`2225624e1` (scoping, CHR-001, rulings), `0a4c53e24` + `9706a1a81` (CHR-002), `f25d5816f` +
`57512511d` + `965ce9cbb` + `e2352b60c` (CHR-003), then s4: `e3bafda8d` (CHR-007 characterisation,
alone), `c6f24e1f0` (the CHR-007 refactor), and this handoff's docs commit.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard looked, s3: "Looks good." |
| CHR-003 one radius, one shadow, one box model | ✅ built s3. **Not yet looked at by Richard** — `verdicts/CHR-003/2026-09-15/` |
| CHR-007 the rows become descriptors | ✅ built s4 — CHR-007 §6. Nothing visible changed, by design; 20/20 panels identical |
| CHR-004, 005, 006, 008, 009, 010, 011 | ⬜ not built |
| R1–R8 | ✅ **all ruled 2026-09-15** — README §4. R6 is a **trial** (needs Richard's look + a rendered truncation count); R7 went **against** the proposal (the comment becomes a tab beside `Ports`) |

## Richard, after s4 — what he said, and what it changes

> "I'm assuming so far we haven't reached the mockup level of quality, just font and surface level
> stuff? Cuz everything in the tasks up to now still looks like shit"

He is right, and the order is why: CHR-002/003 were consistency passes and CHR-007 was invisible by
design. **Three sessions have produced nothing that looks different.** The launcher never needed
CHR-004 or CHR-007 first. **So Track A goes next** — the first screenshot that can be judged against
the mockup is the point of the next session.

## Still Richard's

1. CHR-003's look — offer it; it blocks nothing.
2. **CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`"** (CHR-007 §6.2) — told Richard in s4;
   do not quietly revisit.
3. R6 becomes final only on his look at CHR-009's screenshots.
4. R7's marker-on-the-tab detail was proposed, not ruled.

## First job

1. **Build CHR-005** (one `LauncherPage`: 1120px column, one title, one toolbar, one `Tabs`, one
   button, one chip, one card; `LauncherButton` deleted per R2; Projects on the Templates card per R5;
   `MOCK_PROJECTS` off). 🔴 Re-read CHR-005 §2 at HEAD first — the last two task files were wrong four
   and six ways. 🔴 Look at a few real `thumbURI`s before designing around them (R5's caveat).
2. **R3 is done inside CHR-005, not before it:** when a CSS-text test reddens, replace the pin with a
   rendered-contrast or behaviour assertion; do not bump the literal, and do not retune tests nothing
   reddened.
3. Then **CHR-006** (Templates grid with real shots; R4 registry `thumbnail` + install-time render
   fallback). End each with screenshots in `verdicts/<task>/<date>/` and **ask Richard to look**.
4. Track B afterwards: CHR-008 (R8 ruled — the whole task is unblocked), then CHR-009 (R6 trial, R7
   tab). CHR-008 inherits from CHR-007: `focusGatePort`'s retry wants a `ref`, and the five hash
   clears exist because the hash cannot see expansion or undone values.

🔴 Do not farm the P88 `test:ci` reds. Do not re-take the before picture.

## Readings taken this session (2026-09-15, s4)

- **Characterisation** `tests-unit/chr-007/widgetDispatch.test.ts`: snapshot written at `e2352b60c`
  **before any source edit**; after the refactor **8/8 with the file unchanged**. Mutant (`identifier`
  above `textArea`) red — on the **synthetic** ports only; the 1,982 catalog ports stayed green.
- `describeRows` spec **15/15**, no DOM, reverted arm included.
- jest over `property-editor/ fb-017/ fb-018/ fb-021/ fb-022/ leg-005/ rel-014/ chr-007/ cn-014 cn-015`:
  **28 suites / 475 tests green**. Retarget mutants red both ways.
- `tsc -p packages/noodl-editor --noEmit`: **0 errors**; control — all eight changed files are in its
  2,928-file list.
- **`test:ci`**, `e2352b60c` + the CHR-007 tree, cache cleared, alone, seed 39393: **`2984 specs, 8
  failures`**, fresh `test-results.json`, **the same eight by full name** (`SUB-006` ×3, `SUB-011` ×3,
  `NDA-017` ×2). A reading of 8 with a different name in it is a regression.
- **AC1 drive**: 20 panels, stability control 20/20 on one build, then **20/20 identical** on the
  rebuilt refactor. Script: `verdicts/CHR-007/2026-09-15/panelFingerprint.js` (selects any node by id —
  reuse it for CHR-008, whose whole claim is also "the panel looks the same").

## How to drive the chrome (unchanged recipe, one addition)

- One dev stack from `packages/noodl-editor`, `npm run start`, with `NOODLPORT=8674
  NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<scratch>/profile`; seed `firstRunLegal.json`,
  `editorSettings.json` (`{"settings":{}}`) and `recently_opened_project.json` (`{recentProjects:[…]}`,
  ids from each project's **`nodegx.project.json`**) pointing at fresh `cp -R` copies.
- 🔴 A CDP page on 9333 is **not** "ready": the first wait read READY in 0s while webpack was still
  compiling. Wait for **both** the page and `compiled successfully` in the log.
- ✅ Select nodes by id, no coordinates: `__nodeGraphEditor.getActiveComponent().owner
  .getComponentWithName(name)` → `switchToComponent(c, {pushHistory:false})` → `findNodeWithId(id)` →
  `selectNode(n)`, then read `.sidebar-property-editor`.
- Stop by process group (the Electron with `--user-data-dir=…/profile` → pgid → TERM, KILL, then its
  crashpad handler). Ports 9333 / 8674 / 8080 free after.

## Traps (details in CHR-007 §6.4, CHR-003 §6.5)

- 🔴 **One heavy job at a time** (Richard, s3). s4 ran the renderer build, `tsc`, jest and `test:ci`
  strictly in sequence and tore the stack down between drives.
- 🔴 `Ports.ts` does not load in plain jest. Stub every import; see the characterisation's mock block.
- 🔴 zsh does not word-split an unquoted `$VAR` — jest got eight paths as one pattern and "No tests
  found" exits 1 like a red. Use an array.
- 🔴 A throw during jest collection is `Tests: 0 total`, not a red row.
- 🔴 Editing `src/` while a dev stack is up rebuilds it — capture a before picture first, then edit.
- 🔴 A repo grep for a token counts the built `index.bundle.js` copies. Count source.
