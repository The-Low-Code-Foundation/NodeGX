# Phase 92 — next session

**Written 2026-09-16 at the end of s14 (CHR-009 slice 3: Size Mode row, gutter mark, section rhythm, and the
open-panel wire defect — built, driven, committed).**
Branch `cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform
half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/*`, `library/*`,
`nodegx-backend/*`, `noodl-runtime/*` are theirs). Never commit their files; commit by pathspec.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slice 1 rows (s12), slice 2 head (s13, ruled "looks nice"), **slice 3 (s14, §8) awaits his look** |
| CHR-004, 010, 011 | ⬜ |

## First: Richard's look at slice 3

Same crop pair: `verdicts/CHR-009/2026-09-16/head/props-group-top-{dark,light}.png` (before) beside
`verdicts/CHR-009/2026-09-16/rows/props-group-top-{dark,light}.png` (after); plus `rows/props-group-width-connected-dark.png`.
PNGs are gitignored — they are on disk locally. Questions for him:

1. Direction of the `Size Mode` row (W/H given|fits segments replacing the four icons).
2. **The gutter dot with no outline on unmarked rows** — the mockup/AC3 draw an outline everywhere; not built (§8.1). Keep or add?
3. R6 still a trial ("ok so far").

## Then, in order (ranked by SCREEN AREA, s12's lesson)

1. **Margin & Padding** (~145px of the lower crop, `rows/props-group-lower-dark.png`) → paired `Margin` / `Padding` rows
   (↕ ↔) with a per-edge expander (AC4). `MarginPaddingInput.tsx`, `marginPaddingEdit.ts`. Decide and record the mixed display.
2. The two alignment icon strips (Alignment; Align and Justify Content) — off the label column, unlabelled.
3. `Fixed` chip beside Width/Height (no home in the mockup); 28px `Position`/`Layout` selects → 26 (measure first).
4. §3.4 proper (Variant/State inside General); colour field; Advanced CSS footer.
5. Small: comment field 4px overshoot in the Comment tab; Escape on the Variant picker (compare against HEAD first).

## Settled in s14 (and where the handoff was wrong)

- The handoff put §3.4 first; it moves two rows by 40px. Taken instead: the size strip + gutter + section padding.
- 🔴 **`Ports.bindModel`'s graph subscriptions had never bound** (`ModelProxy` has no `owner`): a wire drawn into the
  selected node did not show its chip until another node was selected. Fixed with `graphOf`/`nodeOf`; before/after
  pair in CHR-009 §8.2. ⚠️ This also switches ON FB-017's child attach/detach hint refresh — **not separately driven**;
  worth one drive (drag a child into a Group with its panel open, watch the overflow hint).
- The `●` after a label was never a connection mark — it is FB-018's reset dot. Connection was only the chip.

## Traps (s12–s14)

- 🔴 **Numbers passed while the picture was broken** (s12 `1(`; s13 a full-bleed divider). Look at the PNG after every drive.
- 🔴 **A guard like `model.owner && model.owner.on(…)` can be a permanent no-op.** Check a subscription binds before reasoning about it.
- 🔴 Importing the `PropertyPanelInput` **index** into a spec pulls `Icon` ⇒ `Tests: 0 total`. Import `…/PropertyPanelRow`.
- 🔴 A later-loading stylesheet wins an equal-specificity override; fix a rule at its source.
- A switched-off row is DRAWN (gated, dimmed), not removed — read live / gated / absent.
- A read mid-rebuild finds no row for ~100ms; retry on the END state.
- `timeout` is not installed on this Mac. A popout covers the panel with `.popup-layer-blocker`.
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug`
  in background, wait for a marker string in `http://localhost:8080/src/editor/index.bundle.js`, `location.reload()` via CDP
  after a rebuild, `rows/drive-rows.js --expect=<copy>`, `npm run dev:stop`, restore recents and compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest/tsc. A dev rebuild here took 73–217 s.

## Still Richard's

1. Slice 3's look + the gutter outline question (above). R6 final.
2. The `···` menu is DECLINED — don't build it. CHR-007 AC4 `_portsHash` clause declined — don't revisit quietly.
3. The Projects tab's two full-width cards (BST-003 / UNI-001).
4. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s14 (2026-09-16)

`tsc --noEmit` (editor) **0 errors**. Full editor `tests-unit` **469 suites / 7,668 tests, EXIT 0** (stack down; s13 +
exactly the new `chr-009/sizeModeRow` 1/18). Axis-swap mutant → 5 red. `npm run type` / `npm run colors` holding.
`test:ci` **not run**.
