# Phase 92 — next session

**Written 2026-09-16 at the end of s13 (CHR-009 slice 2: the head — built, driven, committed).**
Branch `cline-dev`. Phase commits: `git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform
half (`~/vscode_projects/nodegx-community`, deployed `f39d20f`) was not touched.

⚠️ A **P88 peer** works in this checkout (`validation/*`, `noodl-mcp/*`, `templates/rocket-school/*`, `library/*`,
`nodegx-backend/*` are theirs). Never commit their files; commit by pathspec.

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001, 002, 003, 005, 006, 012 | ✅ closed on Richard's look |
| CHR-007 | ✅ built s4, invisible by design |
| CHR-008 the panel is one tree | 🟡 R8, identity, scaffold, 1 widget **inert** (s8–s11). Left: undo re-seed defect, 37 widgets, AC3/AC4 wrong as written (§10.4) |
| **CHR-009 the panel designed** | 🟡 slice 1 rows (s12), slice 2 the head (s13, §7) — Richard: *"looks nice"*. Next slice below |
| CHR-004, 010, 011 | ⬜ |

## Settled after s13

**Richard's rulings on slice 2 (2026-09-16, after s13):** (1) direction — *"Yeah it looks nice"*; (2) the Comment-tab
marker — *"I like it"* (**ruled: keep**); (3) R6's 116px column — *"looks ok so far"* (**still a trial, trending keep**);
(4) the mockup's `···` menu — *"I'd leave them where they are actually"* (**ruled: the help / rename / delete buttons
stay in the node row; do not build the menu**).

So there is no look pending: go straight to the build list.

## Then, in order

1. **§3.4 proper** — `Variant`/`State` INSIDE General, under the filter. Today they sit above the filter because
   `Ports` renders the filter and General is a `Ports` group. Two ways: let `Ports` host the two rows at the top of
   General, or move the filter out of `Ports` into the head above the `ScrollArea` (it would no longer need FB-017's
   sticky — measure that before deleting anything).
2. **One control height**: `PropertyPanelSelectInput` (Position/Layout, 28px) and legacy `.property-value` → 26 (AC2).
3. The gutter connection dot (AC3) replacing the `●` after the label; paired Gap/Padding rows (AC4).
4. The resizing segment (four icons + stray dot → per-axis mode segment); colour field; Advanced CSS footer.
5. Small: the comment field overshoots the tab strip's right edge by ~4px inside the Comment tab; Escape does not
   close the Variant picker (not compared against HEAD — check before calling it a regression).

## Traps (s12–s13)

- 🔴 **Numbers passed while the picture was broken** (s12 `1(`; s13 a full-bleed divider). Look at the PNG after every drive.
- 🔴 **A later-loading stylesheet wins an equal-specificity override.** `visualstates.css` is required after
  `variantseditor.css`; fix a rule at its source, not with an override in an earlier file.
- 🔴 A popout covers the panel with `.popup-layer-blocker` — a drive's next click must be on the blocker.
- AC2's font-size count depends on the scope: the whole `BasePanel` reads 4 (13 = the `Properties` title, 15 = the
  node name); `.sidebar-property-editor` alone read 2. Name the scope with the number.
- The dev log's "two children with the same key" errors carry a UUID key (launcher recents) — not the panel.
- Recipe: copy `templates/story-engine` to scratch, back up `~/Library/Application Support/NodeGX/recently_opened_project.json`
  (sha `a1ea46f2…`), insert one `Story engine` entry, `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 npm run dev:debug`
  in background, wait for a marker string in `http://localhost:8080/src/editor/index.bundle.js`,
  `head/drive-head.js --expect=<copy>`, `npm run dev:stop`, restore recents and compare `shasum`.
- One heavy job at a time: stop the stack BEFORE jest/tsc.

## Still Richard's

1. R6 final ("looks ok so far" — ask again once the rows are done). The `···` menu is DECLINED — don't build it.
2. CHR-007 AC4 `_portsHash` clause declined — don't revisit quietly.
3. The Projects tab's two full-width cards (BST-003 / UNI-001).
4. Whether CHR-008's §3.1 conversions resume after CHR-009, or only where a CHR-009 region needs one.

## Readings at the end of s13 (2026-09-16)

`tsc --noEmit` (editor) **0 errors**. Full editor `tests-unit` **468 suites / 7,650 tests, EXIT 0** (stack down).
`npm run type` / `npm run colors` holding. `leg-005`'s rewritten R7 assertion red against HEAD's panel, green after.
`test:ci` **not run**.
