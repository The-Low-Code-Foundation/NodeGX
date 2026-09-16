# Phase 92 — next session

**Written 2026-09-16 at the end of s18 (slice 6 ruled "looks good"; CHR-009 slice 7 — the `Border Style` /
`Corner Radius` pickers as rows — built, driven, committed; awaits Richard's look).**
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
| **CHR-009 the panel designed** | 🟡 slices 1–6 approved (slice 6 at the start of s18, §11.6). **Slice 7 (s18, §12) awaits his look** |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 7

Say up front it is **not** a height win (−4px per strip): it is the column, the labels, and one new thing.
Same crop, before → after: `verdicts/CHR-009/2026-09-16/height/after/props-group-bottom-light.png` →
`scope/after/props-group-bottom-light.png`; the mark: `scope/after/props-group-scope-set-dark.png` (top-left corner
set to 8, All corners selected); 4× glyphs: `scope/after/zoom-{edge,corner}-{dark,light}.png`. Ask three things:
1. Does it look right? (`Edge` / `Corner` as labels — renamable, display-only.)
2. **The set-mark** (a 4px dot on a side that holds its own value) is new, not in the mockup — keep it?
3. The corner glyphs are right but subtle at 1× — good enough?

## Then, in order (ranked by SCREEN AREA)

1. The colour field (its swatch is 30px beside a 26px field; §2 wants swatch + mono hex + alpha in ONE field) —
   `Border Color`, `Background Color`, `Shadow Color` on the Group.
2. §3.4 proper (Variant/State inside General); Advanced CSS footer.
3. A per-side border field draws EMPTY instead of the inherited all-sides value (checkerboard swatch) — found s18
   (§12.4), pre-existing. Decide with Richard whether a side shows the inherited value as a placeholder.
4. Small: comment field 4px overshoot; Escape on the Variant picker (compare against HEAD first); a token in a pair
   field ellipsises; a binding chip on an align row; `Box Sizing`'s value ellipsises at 156px.
5. A Text node's `Text Horizontal Align` label at 116px: predicted, not driven. Look at a Text node.

## Settled in s18 (and where the handoff was wrong)

- Richard: slice 6 **looks good** (§11.6).
- 🔴 **"the same shape slice 5 replaced (~50px each)" was wrong twice.** The strips were a `TabGroup`'s tab bar — a
  scope picker that writes nothing — not value controls; and the row saves **4px** per strip, not ~50
  (`Corner Radius` header 611 → 607, `Box Shadow` 728 → 720).
- 🔴 `Ports` never disposed its `TabGroup`s (they sit in groups, not `this.views`): a leaked React root per rebuild.
  Now tracked and disposed (the row also listens to `parametersChanged`).

## Traps (s12–s18)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17). Look at the PNG after every drive; a 14px
  glyph needs a 4× CDP clip (`scope/zoom-scope.js`) — no PIL on this Mac.
- 🔴 **The served bundle can carry a TSX change while the renderer runs the old module.** Before a drive, check the
  renderer: `webpackChunknoodl_editor.push(…)` → `String(r.m[key]).includes('<new text>')` (both drive scripts do).
- 🔴 A drive click on a row that is scrolled off reads `not reachable` with a negative `y`: scroll first (s18).
- 🔴 The select renders a measuring COPY of its options: pick an option by `elementFromPoint`, not by text.
- 🔴 A CDP Cmd+A selects nothing on macOS (`1` + `0.5` = `10.5`): call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is 450 suites; plain `npx jest` adds `tests-main` 22. Name the command.
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
  npm run dev:debug` in background (exit 144 on `dev:stop` is the stop, not a failure), wait for `:9333/json/version`,
  run the latest drive (`scope/drive-scope.js --expect=<copy>`, or `height/drive-height.js` for every control's height),
  `npm run dev:stop`, restore recents, compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest.

## Still Richard's

1. **Slice 7's look, the set-mark, the corner glyphs** (above).
2. R6 final ("ok so far"; ask again once the rows are done).
3. The `···` menu is DECLINED, don't build it. CHR-007 AC4 `_portsHash` clause declined, don't revisit quietly.
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s18 (2026-09-16, working tree on `6621a992b` + slice 7, before its commit)

`tsc --noEmit` (editor) **0 errors**. `npx jest` (editor, stack down) **472 suites / 7,705 tests, EXIT 0** (s17's
471 / 7,697 + `chr-009/scopeRows` 8). Mutants on the new spec: `isSet` ignores the tab → 3 red; order sort removed →
3 red. `npm run type` / `npm run colors` holding. `test:ci` **not run**. `dev.log`: 0 `SassError|ERROR in`, 0
`synchronously unmount` this session (s17 saw it repeat — not reproduced, still not attributed).
