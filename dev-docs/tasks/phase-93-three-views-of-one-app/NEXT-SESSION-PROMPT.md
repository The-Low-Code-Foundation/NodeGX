# Phase 93 — next session

**Written 2026-09-17, end of session 7.** Sessions 1–5 built and drove TVW-003 slices 1–5. Session 6
started TVW-001: slice 1 (rows a + b) built and driven, AC1 and AC2 closed; then closed TVW-003 on
Richard's hover ruling (slice 6). **Session 7 built and drove TVW-001 slice 2 (row d, sections by
role) and closed AC3.** The drive found two defects that blocked it, and both are fixed: the panel's
kinds were stale on first open, and the Router's Pages editor could not be undone.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 slices 1 (a, b) and 2 (d) ✅ | **AC1 ✅ AC2 ✅ AC3 ✅** · AC4–8 — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** — AC1 ✅ (hover 1px / selection 2px, ruled) |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 9** (TVW-003 all six — closed; TVW-001 AC1, AC2, AC3).

## Gate readings (2026-09-17, session 7, after both fixes)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **3 suites / 23**, armed (s6: 2
  mutants; s7: 3 on `componentSections.ts` + 1 on `pagesValue.ts`, all red, restored `cmp` clean).
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- `test:ci` **not run** in s6 or s7. It is owed before TVW-001 closes (AC8); run it alone with the
  cache cleared. s7 touched `propertyeditor/Pages/Pages.tsx`, which no spec in `tests/` references.
- Driven: TVW-001 §7 has the slice 1 and slice 2 tables.

## What session 7 settled

- Slice 2's decisions are in TVW-001 §7 "Slice 2 — what was built": Pages flat in Router order,
  headed per Router only when >1 group; `start` marker; home in Pages only with a `Page` node;
  `empty` always in Components (the spec's "its folder's section" has no answer for a split folder);
  cloud rows keep full paths; cross-boundary drags refused in the sectioned view. None is a ruling —
  but Richard sees them at AC7.
- AC1 reworded in the task file to the s6-driven sequence (the handoff's "reword owed" is done).
- 🔴 **Defect 1, fixed:** on first open every visual component was filed under `Logic`, because
  `allowAsChild` reads a cached `node.type` that resolves only after the node library loads. The
  panel now rebuilds on NodeLibrary events. The same staleness was behind PNL-006's wrong glyphs.
- 🔴 **Defect 2, fixed:** the Router's Pages editor mutated the parameter object that undo holds, so
  add, remove and start page could not be undone. `pagesValue.ts` now returns a new object per edit.
- Filter: a section heading's count is now the rows that survive the filter.
- Seen for AC7 (not fixed): the `Not in a router` heading repeats the row chip; rows are 26px under
  30px headings; home sorts after folders.
- 🔴 The sectioned view is **only the unfiltered view** (`currentSheet === null`, the default). A
  selected sheet still draws the old tree — deliberately, until slice 4.

## What session 6 settled

- **AC1's first step names a gesture that does nothing**: double-clicking a Router opens its
  properties (no component-typed port). Driven instead through a canvas double-click on the `Hero`
  instance on Home, then ⌘[. Reword the AC (not a ruling).
- Meta rules that the AC did not spell out, written in `componentUsage.ts` and TVW-001 §7: home,
  unplaced popups and cloud functions carry no meta; `empty` wins over every kind.
- The usage index already carries each instance's `{parent, nodeId}` — slice 3's *Used in* popover
  needs no second walk.

## Next, in order

1. **TVW-001 slice 3 — row c, AC4**: `×N` becomes a button that opens a *Used in* popover (X-Ray's
   rows, `ComponentXRayPanel.tsx:142-160`), fed by `usage.instances` (`{parent, nodeId}`, already
   in the index). Picking one calls `switchToComponent(parent, {node})`; assert `activeComponent`
   and the selection. On LPV2, `ServiceCard ×4` and `StatTile ×4` are the `×3`-or-more candidates.
2. Slice 4 (e, AC5). Sheets retire; `#Sheet` folders draw as folders (the unfiltered view still
   strips them); a door for the first cloud function once the sheet selector goes (today the cloud
   section's empty text names no door). Drive a drag across the cloud boundary here: s7 could not,
   because the QA fixture has no cloud folder.
3. Slice 5 (f, AC6), then AC7 screenshots (fix the meta alignment beside a warning dot and the three
   s7 notes first) and AC8 (`test:ci`).
4. Optional, no AC asks it: the bench outlining a canvas selection or hover inside itself.

## Rulings owed by Richard

None open. **Ruled s6:** preview hover outline is 1px, selection 2px (TVW-003 slice 6).

R-A…R-I inherited, R-J ruled.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §4.3; TVW-001 §2 and §7.
2. README §2 and §6. TVW-003 §6 has the selection plumbing map.

## How the drive was done (reuse it)

Scratch profile (`firstRunLegal.json` copied from the live profile + `recently_opened_project.json`
pointing at a copy of `Landing page test V2`), `NOODLPORT=8680 NOODL_REMOTE_DEBUG_PORT=9444
NOODL_USER_DATA_DIR=<scratch> npm run dev:debug -- --quiet`. **Check `ps` for a peer's `dev:debug` and
wait for it** (s4 waited 20 min); cold compile ≈ 6 min. Open the copy by clicking its `h3`. Canvas =
`window.__nodeGraphEditor`; modules via `webpackChunknoodl_editor.push([[Symbol()],{},r=>window.__wreq=r])`,
then the module with `selectionStore`+`authoredPath` and the one with `ProjectModel.instance`. Design
mode = first `[class*=ModeSegmentedButton]`. Node screen point = canvas rect origin +
(`node.global` + `getPanAndScale()`) × scale — pan the node in first with `setPanAndScale`. Preview
clicks through the editor target at guest point + webview rect origin; guest reads via
`webview.executeJavaScript` or the `localhost:<NOODLPORT>` target. Spy by wrapping
`webview.executeJavaScript`; 🔴 reset it in a separate eval. Stop with `node scripts/devtools/stop-dev.js`
(`--list` first). Drive scripts (s7's are in its scratchpad, gone): `ev.js` (`--target=<substr>` + expression, awaited) and `click.js x y`
(scratchpad, gone — the shapes are above). 🔴 cdp.js reads `NOODL_REMOTE_DEBUG_PORT` at require time —
set it to 9444 before requiring, or every call hits 9222. 🔴 zsh does not word-split `$P`: pass
coordinates as two literal args. 🔴 A double-click on a non-component node hides the Components tree
(0×0 rects) — click the rail's Components button first. Bench: `EventDispatcher.instance.emit('preview-bench-mount',
{target})` (the module with `EventDispatcher.instance`); its guest target is `--target=noodl-sandbox=`.
🔴 An absence ("no store write") needs a guest `pointerdown` counter beside it, or it grades nothing.
s7 additions: theme = the module exporting `ThemeManager` → `setMode('light'|'dark')`; panel-only PNG
= `Page.captureScreenshot` with `clip` = the tree's BasePanel rect (`sips -c` crops from the CENTRE);
Router node → `__nodeGraphEditor.selectNode(findNodeWithId(id))`, then *Add new page* is
`.sidebar-fullwidth-button`, the popup rows `.variant-item-name`, a page's menu
`.router-pages-actions-icon`; the rail's Components button (26,101) brings the tree back after the
property panel. `location.reload()` returns to the launcher, so re-`cp` the project copy there to
reset it.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
