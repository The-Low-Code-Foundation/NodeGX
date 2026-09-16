# Phase 92 — next session

**Written 2026-09-16 at the end of s19 (CHR-009 slice 8 — the colour field — built, driven, committed; awaits Richard's
look).** Branch `cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform
half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`,
`nodegx-backend/*`, `noodl-runtime/*` are theirs; staged `library/prefabs/date-picker` deletions are theirs).
Never commit their files; commit by pathspec. In s19 a peer ran its own `dev` stack (9222) for ~8 min: launching
yours then would have reaped it — wait for their `scripts/start.ts` pid to exit (`kill -0`), as s19 did.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–7 approved; **slice 8 (the colour field) awaits his look** (§13) |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 8

Show him `verdicts/CHR-009/2026-09-16/scope/after/props-group-bottom-{dark,light}.png` (before) beside
`color/after/props-group-bottom-{dark,light}.png` (after), plus `color/after/zoom-typed-dark.png` and
`color/after/props-group-color-picker-dark.png`. Ask the three ⚠️ in §13.2:
1. The swatch's 2px radius (`--radius-sm`) is a third radius on the panel; AC2 wants ≤ 2.
2. An opaque hex shows `100%`. Keep it, or show a suffix only when there is an alpha (the mockup)?
3. A project token (`var(--background)`) draws a transparent checkered swatch: `resolveColor` knows colour styles,
   not the project's CSS variables. Pre-existing. Worth resolving?

Record his ruling in §13 before building anything else.

## Then, in order (ranked by SCREEN AREA)

1. §3.4 proper (Variant/State inside General); the Advanced CSS footer.
2. A per-side border field draws EMPTY instead of the inherited all-sides value (§12.4, re-seen s19: four per-side
   `Border Color` fields read `''`). Decide with Richard whether a side shows the inherited value as a placeholder.
3. Small: comment field 4px overshoot; Escape on the Variant picker (compare against HEAD first); a token in a pair
   field ellipsises; a binding chip on an align row; `Box Sizing`'s value ellipsises at 156px.
4. A Text node's `Text Horizontal Align` label at 116px: predicted, not driven. Look at a Text node.

## Settled in s19 (and where the handoff was wrong)

- The handoff described the colour field as "its swatch is 30px beside a 26px field". True, but it missed the defect
  under it: 🔴 **a stored alpha was stripped from the text and shown nowhere, and a typed hex then dropped it.** The
  Group's `Shadow Color` is 20% and read `#000000`. Now shown (`20%`), and kept when a 6-digit hex is typed.
- 🔴 **The picker covered the field it edits** once the swatch moved inside the field's left edge: `showPopout`
  opens to the right of its anchor. All the numbers had passed; the PNG caught it. Anchored on the field now.
- The editor jest's one red (`tests-main/relay-auth.test.js`, a viewer-disconnect timing assertion) passed 3/3 alone:
  a load flake at load 13–19, not this slice.

## Traps (s12–s19)

- 🔴 **Numbers passed while the picture was broken** (s12, s13, s15, s17, s19). Look at the PNG after every drive; a
  14px glyph needs a 4× CDP clip. A zoom on "the first visible X" can catch one scrolled under the filter: name the row.
- 🔴 **The served bundle can carry a TSX change while the renderer runs the old module** (s17, again s19). Check
  `webpackChunknoodl_editor.push(…)` → `String(r.m[key]).includes('<new text>')` for EVERY changed module, then
  `Page.reload` and retry (`color/drive-color.js` checks both of its modules).
- 🔴 A drive click on a row that is scrolled off reads `not reachable` with a negative `y`: scroll first (s18).
- 🔴 The select renders a measuring COPY of its options: pick an option by `elementFromPoint`, not by text.
- 🔴 A CDP Cmd+A selects nothing on macOS (`1` + `0.5` = `10.5`): call `input.select()` in the page.
- 🔴 `npx jest tests-unit` is 451 suites; plain `npx jest` adds `tests-main` 22. Name the command.
- 🔴 `2>&1 > file` sends jest's report (stderr) to the TERMINAL: write `> file 2>&1`.
- 🔴 No `timeout` binary on this Mac (`command not found`; EXIT 127 looks like a drive failure).
- 🔴 A text-slicing script edit can hit a NESTED selector ⇒ `SassError`, blank page. Grep `dev.log` for `SassError|ERROR in`.
- 🔴 `npx prettier --write` on a test file hoists imports above `jest.mock`.
- 🔴 CDP never sends a mouse-leave: park the pointer (`mouseMoved 5,5`) before reading anything hover-dependent.
- 🔴 A backtick in a comment inside a JS template literal ends the string: `node --check` every drive edit.
- 🔴 Importing the `PropertyPanelInput` **index** into a spec pulls `Icon` ⇒ `Tests: 0 total`. `NumberUnitInput` cannot load
  at all. A component with hooks cannot be walked by `renderElements`: split a hook-free view (`ColorFieldView`, s19).
- 🔴 A setup write straight to `setParameter` is invisible to the panel: read the model, not the row.
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
  npm run dev:debug` in background (exit 144 on `dev:stop` is the stop, not a failure), wait for `:9333/json/version`
  (290s at load ~10 in s19), run the latest drive (`color/drive-color.js --expect=<copy>`), `npm run dev:stop`,
  restore recents, compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest; check `ps` for a peer's `start.ts`/jest first.

## Still Richard's

1. Slice 8's look and its three ⚠️ (above).
2. R6 final ("ok so far"; ask again once the rows are done).
3. The `···` menu is DECLINED, don't build it. CHR-007 AC4 `_portsHash` clause declined, don't revisit quietly.
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.
6. Whether a per-side border field shows the inherited all-sides value (§12.4).

## Readings at the end of s19 (2026-09-16, working tree on `fecdeb122` + slice 8, before its commit)

`tsc --noEmit` (editor) **0 errors, EXIT 0**. `npm run type` / `npm run colors` / `npm run tokens:css` **holding**.
`npx jest tests-unit/chr-009/colorField.test.tsx` **7/7**; mutants: alpha preservation removed → 1 red, suffix never
drawn → 1 red (both run before the anchor change; the anchor test was updated after and passes in the full run).
`npx jest` (editor, stack down) **473 suites / 7,712 tests: 7,711 passed, 1 failed, EXIT 1** — the red is
`tests-main/relay-auth.test.js`, re-run alone **3 × 14/14 EXIT 0**. `test:ci` **not run**. `dev.log`: 0
`SassError|ERROR in`, 0 `synchronously unmount`. Recents restored byte-identical (`a1ea46f2…`).
