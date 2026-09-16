# Phase 92 — next session

**Written 2026-09-16 at the end of s17 (CHR-009 slice 6: one control height + `Fixed` only on a %, built, driven,
committed; awaits Richard's look).**
Branch `cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform
half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`,
`nodegx-backend/*`, `noodl-runtime/*` are theirs; staged `library/prefabs/date-picker` deletions are theirs).
Never commit their files; commit by pathspec.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–5 approved (slice 5 at the start of s17, §10.5). **Slice 6 (s17, §11) awaits his look** |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 6

It's a small visual change, so say that up front. Same crops, before → after:
`verdicts/CHR-009/2026-09-16/height/before/props-group-bottom-light.png` → `height/after/props-group-bottom-light.png`
(selects and text fields 27 → 26), and `height/after/props-group-width-px-dark.png` (Width on px: no chip, the field
fills the column). Ask: does it look right? (He already ruled "Only when %" for `Fixed`, so the question is only
how it looks.)

## Then, in order (ranked by SCREEN AREA)

1. **The `Border Style` and `Corner Radius` icon strips**: unlabelled, off the label column, the same shape slice 5
   replaced (~50px each in `after/props-group-bottom-*`). Check what each strip's ports are before designing.
2. The colour field (its swatch is 30px beside a 26px field; §2 wants swatch + mono hex + alpha in ONE field).
3. §3.4 proper (Variant/State inside General); Advanced CSS footer.
4. Small: comment field 4px overshoot; Escape on the Variant picker (compare against HEAD first); a token in a pair
   field ellipsises; a binding chip on an align row; `Box Sizing`'s value ellipsises at 156px.
5. A Text node's `Text Horizontal Align` label at 116px: predicted, not driven. Look at a Text node.

## Settled in s17 (and where the handoff was wrong)

- Richard: slice 5 **looks good**; **keep two rows** (+40px accepted); POL-012 lock **stays removed**. His "CHR 012
  look good" was a general remark about the community pages, not a ruling on slice 4 (§10.5).
- 🔴 **"28px selects" was wrong: they were 27, and so was every 12px text input; mono inputs were 25.5.** The base
  input never stated a height (padding + Chromium's `<input>` line box). Now `height: 26px`.
- 🔴 **Every height number passed while `px` drew at the top of Corner Radius's field** (a `height: 100%` child of a
  heightless select root, centred only by the old padding). Only the PNG showed it. `collapsedInputs` now counts it,
  armed in the page (12.5 with the fix undone).
- `Fixed` is drawn only on a % (ruled), driven % → px → undo.

## Traps (s12–s17)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17). Look at the PNG after every drive.
- 🔴 **The served bundle can carry a TSX change while the renderer runs the old module**, and the page reloads LATER.
  Before a drive, check the renderer: `webpackChunknoodl_editor.push(…)` → `String(r.m[key]).includes('<new text>')`.
  s17 drove old code once and read the "defect" it had just fixed.
- 🔴 The select renders a measuring COPY of its options: pick an option by `elementFromPoint`, not by text.
- 🔴 A CDP Cmd+A selects nothing on macOS (`1` + `0.5` = `10.5`): call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is 449 suites; s16's "471" was plain `npx jest` (+ `tests-main` 22). Name the command.
- 🔴 `2>&1 > file` sends jest's report (stderr) to the TERMINAL: write `> file 2>&1`.
- 🔴 No `timeout` binary on this Mac (`command not found`; EXIT 127 looks like a drive failure).
- 🔴 A text-slicing script edit can hit a NESTED selector ⇒ `SassError`, blank page. Grep `dev.log` for `SassError|ERROR in`.
- 🔴 `npx prettier --write` on a test file hoists imports above `jest.mock`.
- 🔴 CDP never sends a mouse-leave: park the pointer (`mouseMoved 5,5`) before reading anything hover-dependent.
- 🔴 A backtick in a comment inside a JS template literal ends the string: `node --check` every drive edit.
- 🔴 Importing the `PropertyPanelInput` **index** into a spec pulls `Icon` ⇒ `Tests: 0 total`. `NumberUnitInput` cannot load at all.
- 🔴 A setup write straight to `setParameter` is invisible to the panel: read the model, not the row.
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
  npm run dev:debug` in background, check the renderer's module source (above), run
  `height/drive-height.js --expect=<copy>` (the latest template: measures every control by kind + collapsed inputs),
  `npm run dev:stop`, restore recents, compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. **Slice 6's look** (above).
2. R6 final ("ok so far"; ask again once the rows are done).
3. The `···` menu is DECLINED, don't build it. CHR-007 AC4 `_portsHash` clause declined, don't revisit quietly.
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s17 (2026-09-16, working tree on `5424b08f7`, before the slice-6 commit)

`tsc --noEmit` (editor) **0 errors**. `npx jest` (editor) **471 suites / 7,697 tests, EXIT 0** (tests-unit 449/7,408 +
tests-main 22/289; s16's count exactly, no new spec). `npm run type` / `npm run colors` holding. `test:ci` **not run**.
Not attributed: `Attempted to synchronously unmount a root while React was already rendering` repeats in `dev.log`.
