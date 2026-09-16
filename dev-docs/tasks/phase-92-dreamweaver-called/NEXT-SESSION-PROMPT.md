# Phase 92 — next session

**Written 2026-09-16 at the end of s15 (CHR-009 slice 4: Margin & Padding as paired rows with a per-edge
expander — built, driven, committed; awaits Richard's look).**
Branch `cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform
half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`,
`nodegx-backend/*`, `noodl-runtime/*` are theirs; they also had staged `library/prefabs/date-picker` deletions).
Never commit their files; commit by pathspec.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slices 1–3 approved (s12–s14). **Slice 4 (s15, §9) awaits his look.** AC4 met on real input |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 4

Same crop, before → after: `verdicts/CHR-009/2026-09-16/rows/props-group-lower-{dark,light}.png` →
`verdicts/CHR-009/2026-09-16/box/props-group-lower-{dark,light}.png`. States: `box/props-group-box-{expanded,mixed,120,percent}-dark.png`.
Ask him three things:

1. The look of the paired rows (the 150px box → two 30px rows; `Style` header 661 → 575).
2. 🔴 **POL-012's "set all four at once" lock is removed.** It was a reported request (P39 item 14). All four is now
   `↕` then `↔`. Keep it removed, or add a one-entry "all four" (CHR-009 §9.1 names two shapes)?
3. The mixed display (empty field, muted `mixed`, both values in the tooltip) and typed units (`50%`; no px suffix).

## Then, in order (ranked by SCREEN AREA)

1. The two alignment icon strips (`Alignment`; `Align and justify content`) — ~160px of the lower crop, unlabelled,
   off the label column. Now the largest region left.
2. `Fixed` chip beside Width/Height (no home in the mockup); 28px `Position`/`Layout` selects → 26 (measure first).
3. §3.4 proper (Variant/State inside General); colour field; Advanced CSS footer.
4. Small: comment field 4px overshoot in the Comment tab; Escape on the Variant picker (compare against HEAD first);
   a token in a pair field ellipsises (`--sp…`) — look at a Text Input.

## Settled in s15 (and where the handoff/docs were wrong)

- The handoff's item 1 held: Margin & Padding was the largest region. Taken as planned.
- 🔴 **`scrubCommit.ts` called the `if (args.oldValue)` trap "unreachable from margin/padding".** True of the old
  single-side drag, false for a pair: a drag from an unset side left the dragged value after undo. Fixed
  (`MarginPaddingType.commitDrag`), unit-tested, re-driven.
- 🔴 A hover-drawn unit toggle **stole value clicks** (`120` + Enter stored `0%`). Units are typed now. Don't bring back a
  click target that appears under the pointer.
- The expander state lives on the view (like POL-012's lock did), not in React state and not in the model.

## Traps (s12–s15)

- 🔴 **Numbers passed while the picture was broken** (s12 `1(`; s13 a divider; s15 a clipped placeholder the value-only
  clip check could not see). Look at the PNG after every drive; measure placeholders too.
- 🔴 **A text-slicing script edit can hit a NESTED selector** — s15 cut at `.Track .Expander {` ⇒ `SassError`, "Reload
  prevented", blank page, the drive times out on `launcher`. After an SCSS edit grep `dev.log` for `SassError|ERROR in`.
- 🔴 `npx prettier --write` on a test file **hoists imports above `jest.mock`** (import-sort plugin) — churn in another
  task's file. Don't run it on files you only touched lightly.
- 🔴 CDP never sends a mouse-leave: park the pointer (`mouseMoved 5,5`) before reading anything hover-dependent.
- 🔴 **A guard like `model.owner && model.owner.on(…)` can be a permanent no-op.** Check a subscription binds.
- 🔴 Importing the `PropertyPanelInput` **index** into a spec pulls `Icon` ⇒ `Tests: 0 total`. A spec importing
  `marginPaddingEdit` needs stubs for `propertyeditor/utils`, `@noodl-models/nodelibrary` and `NumberUnitInput`.
- 🔴 A setup write straight to `setParameter` is invisible to the panel — read the model, not the row.
- A switched-off row is DRAWN (gated, dimmed), not removed. A read mid-rebuild finds no row for ~100ms.
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry at `recentProjects[0]`, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
  npm run dev:debug` in background, wait for a marker string in `http://localhost:8080/src/editor/index.bundle.js`,
  `location.reload()` via CDP after each rebuild, `box/drive-box.js --expect=<copy>`, `npm run dev:stop`, restore
  recents and compare `shasum`.
- One heavy job at a time: stop the stack BEFORE the full jest run.

## Still Richard's

1. **Slice 4's look + the POL-012 lock question** (above).
2. R6 final ("ok so far"; ask again once the rows are done).
3. The `···` menu is DECLINED — don't build it. CHR-007 AC4 `_portsHash` clause declined — don't revisit quietly.
4. The Projects tab's two full-width cards (BST-003 / UNI-001).
5. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s15 (2026-09-16, before the slice-4 commit)

`tsc --noEmit` (editor) **0 errors**. Full editor `tests-unit` **470 suites / 7,685 tests, EXIT 0** (stack down; s14 +
exactly the new `chr-009/marginPaddingRows`, 17). Mutants: axis swap → 7 red, drag-commit bypass → 2 red.
`npm run type` / `npm run colors` holding. `test:ci` **not run**.
