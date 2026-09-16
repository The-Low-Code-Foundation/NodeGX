# Phase 92 — next session

**Written 2026-09-16 at the end of s16 (CHR-009 slice 5: the alignment ports as labelled rows — built, driven,
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
| **CHR-009 the panel designed** | 🟡 slices 1–4 approved (s12–s15; slice 4 in s16, §9.6). **Slice 5 (s16, §10) awaits his look** |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 5

Same crop, before → after: `verdicts/CHR-009/2026-09-16/box/props-group-lower-{dark,light}.png` →
`verdicts/CHR-009/2026-09-16/align/props-group-lower-{dark,light}.png`. Also `align/props-group-align-stretch-dark.png`.
Ask him:

1. The look of the alignment rows (labels, one track per port, pressed = value in effect).
2. ⚠️ **The panel got 40px longer** (`Style` header 575 → 615). Keep, or put `Align X` + `Align Y` on ONE row as two
   3-segment tracks (Size Mode's W/H shape, −32px)?
3. 🔴 **Still unanswered from s15: POL-012's "set all four at once" lock** — keep removed, or a one-entry "all four"?
4. (He said "CHR 012 look good" about slice 4's screens — confirm that was slice 4.)

## Then, in order (ranked by SCREEN AREA)

1. `Fixed` chip beside Width/Height (no home in the mockup); 28px `Position`/`Layout` selects → 26 (measure first).
2. §3.4 proper (Variant/State inside General); colour field; Advanced CSS footer.
3. Small: comment field 4px overshoot; Escape on the Variant picker (compare against HEAD first); a token in a pair
   field ellipsises; a binding chip on an align row (the `connectedRowPolicy` exception's "no single port" reason is gone).
4. A Text node's `Text Horizontal Align` will ellipsise at 116px — predicted, not driven. Look at a Text node.

## Settled in s16 (and where the handoff was wrong)

- The handoff's item 1 (alignment strips, "largest region") held as a region, but **"largest area" was not "rows save
  height"**: labelled rows cost +40px. Rank by area changed, and say which way it moved.
- 🔴 **`Align Items → Stretch` was unpickable in the panel** since `14815f1e3`: the strip drew an icon per known value.
  The rows draw a segment per ENUM value. Grade a picker against the enum, not against its icon set.
- Pressing the segment already in effect writes nothing (the legacy strip un-set it). Un-set = the row's reset dot.

## Traps (s12–s16)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15). Look at the PNG after every drive.
- 🔴 `2>&1 > file` sends jest's report (stderr) to the TERMINAL, not the file — write `> file 2>&1`.
- 🔴 No `timeout` binary on this Mac (`command not found`, EXIT 127 looks like a drive failure).
- 🔴 A text-slicing script edit can hit a NESTED selector ⇒ `SassError`, blank page. Grep `dev.log` for `SassError|ERROR in`.
- 🔴 `npx prettier --write` on a test file hoists imports above `jest.mock` — don't run it on lightly-touched files.
- 🔴 CDP never sends a mouse-leave: park the pointer (`mouseMoved 5,5`) before reading anything hover-dependent.
- 🔴 A guard like `model.owner && model.owner.on(…)` can be a permanent no-op. Check a subscription binds.
- 🔴 Importing the `PropertyPanelInput` **index** into a spec pulls `Icon` ⇒ `Tests: 0 total`. Import `PropertyPanelRow` directly.
- 🔴 A setup write straight to `setParameter` is invisible to the panel — read the model, not the row.
- `UndoQueue.instance` has `queue`/`ptr`, not `undos` (s16's depth read printed keys; the model read was the grade).
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
  npm run dev:debug` in background, poll the bundle at `http://localhost:8080/src/editor/index.bundle.js` for a marker
  string, run `align/drive-align.js --expect=<copy>` (template for the next drive), `npm run dev:stop`, restore recents,
  compare `shasum`.
- One heavy job at a time: stop the stack BEFORE the full jest run.

## Still Richard's

1. **Slice 5's look + the +40px question** (above).
2. **The POL-012 lock** (s15, unanswered).
3. R6 final ("ok so far"; ask again once the rows are done).
4. The `···` menu is DECLINED — don't build it. CHR-007 AC4 `_portsHash` clause declined — don't revisit quietly.
5. The Projects tab's two full-width cards (BST-003 / UNI-001).
6. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s16 (2026-09-16, before the slice-5 commit, parent `f55aa4a70`)

`tsc --noEmit` (editor) **0 errors**. Full editor `tests-unit` **471 suites / 7,697 tests, EXIT 0** (stack down; s15 +
exactly `chr-009/alignRows`, 12). Mutants: glyph-set filter → 4 red, order removed → 4 red. `npm run type` /
`npm run colors` holding. `test:ci` **not run**.
