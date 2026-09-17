# Phase 93 — next session

**Written 2026-09-17, end of session 7.** Sessions 1–5 built and drove TVW-003 slices 1–5. Session 6
started TVW-001: slice 1 (rows a + b) built and driven, AC1 and AC2 closed; then closed TVW-003 on
Richard's hover ruling (slice 6). **Session 7 built TVW-001 slice 2 (row d, sections by role) —
unit-graded and typechecked, NOT DRIVEN**: a peer session held the dev stack the whole session
(relaunched it the moment it exited), so no editor was launched.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 slice 1 (a, b) ✅ · slice 2 (d, sections by role) **built, undriven** | **AC1 ✅ AC2 ✅** · AC3–8 — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** — AC1 ✅ (hover 1px / selection 2px, ruled) |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 8** (TVW-003 all six — closed; TVW-001 AC1, AC2).

## Gate readings (2026-09-17, session 7)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **2 suites / 18**, armed (s6: 2
  mutants; s7: 3 mutants on `componentSections.ts`, each 1 red, restored `cmp` clean).
- `tsc -p packages/noodl-editor --noEmit` EXIT=0 (after fixing 3 narrowing errors the new
  `section` TreeNode raised in `ComponentsPanelReact`, `useDragDrop`, `useRenameMode`).
- `test:ci` **not run** in s6 or s7 — owed before TVW-001 closes (AC8). Run it alone, cache cleared.
- Driven: TVW-001 §7 slice 1 table. **Slice 2: nothing driven.**

## What session 7 settled

- Slice 2's decisions are in TVW-001 §7 "Slice 2 — what was built": Pages flat in Router order,
  headed per Router only when >1 group; `start` marker; home in Pages only with a `Page` node;
  `empty` always in Components (the spec's "its folder's section" has no answer for a split folder);
  cloud rows keep full paths; cross-boundary drags refused in the sectioned view. None is a ruling —
  but Richard sees them at AC7.
- AC1 reworded in the task file to the s6-driven sequence (the handoff's "reword owed" is done).
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

1. **Drive slice 2 FIRST** (dev stack, copy of `Landing page test V2`): the four headings
   (`[data-test=component-tree-section]`, `data-section`), Pages in the Router's order with one
   `[data-test=component-tree-start]`, every row still clickable/highlighting, filter keeps headings
   only over survivors, both themes. Then `NodeGX QA Fixture` for the cloud section (rows present,
   right-click create menu offers cloud templates, drag to a browser folder refused). Check `ps` for a
   peer `dev:debug` first — s7 lost the whole drive to one.
2. **AC3** — create a page no Router lists → under `Pages` with `not in a router`; add it in the
   Router's Pages editor → chip goes, route appears, row moves into Router order; remove; undo both.
3. Slice 3 (c, AC4), slice 4 (e, AC5 — also: `#Sheet` folders drawn as folders, and a first-cloud-function door once the sheet selector goes), slice 5 (f, AC6), then AC7 screenshots (fix the meta
   alignment beside a warning dot first) and AC8.
4. Optional, no AC asks it: the bench outlining a canvas selection/hover inside itself.

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
(`--list` first). Drive scripts from s5: `ev.js` (`--target=<substr>` + expression, awaited) and `click.js x y`
(scratchpad, gone — the shapes are above). 🔴 cdp.js reads `NOODL_REMOTE_DEBUG_PORT` at require time —
set it to 9444 before requiring, or every call hits 9222. 🔴 zsh does not word-split `$P`: pass
coordinates as two literal args. 🔴 A double-click on a non-component node hides the Components tree
(0×0 rects) — click the rail's Components button first. Bench: `EventDispatcher.instance.emit('preview-bench-mount',
{target})` (the module with `EventDispatcher.instance`); its guest target is `--target=noodl-sandbox=`.
🔴 An absence ("no store write") needs a guest `pointerdown` counter beside it, or it grades nothing.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
