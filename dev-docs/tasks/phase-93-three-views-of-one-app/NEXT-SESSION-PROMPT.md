# Phase 93 — next session

**Written 2026-09-17, end of session 6.** Sessions 1–5 built and drove TVW-003 slices 1–5. Session 6
started TVW-001: slice 1 (rows a + b) built and driven, AC1 and AC2 closed.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 slice 1: highlight follows the canvas (a), `×N`/`unplaced`/`empty`/route meta (b) | **AC1 ✅ AC2 ✅** · AC3–8 — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | 🟡 slices 1–5 | AC2–6 ✅ · AC1 🟡 (solid vs "dashed", Richard) |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 7** (TVW-003 AC2–6; TVW-001 AC1, AC2).

## Gate readings (2026-09-17, session 6)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **1 suite / 9**, armed (2 mutants).
- `tsc -p packages/noodl-editor --noEmit` EXIT=0.
- `test:ci` **not run** in s6 — owed before TVW-001 closes (AC8). Run it alone, cache cleared.
- Driven: TVW-001 §7 slice 1 table.

## What session 6 settled

- **AC1's first step names a gesture that does nothing**: double-clicking a Router opens its
  properties (no component-typed port). Driven instead through a canvas double-click on the `Hero`
  instance on Home, then ⌘[. Reword the AC (not a ruling).
- Meta rules that the AC did not spell out, written in `componentUsage.ts` and TVW-001 §7: home,
  unplaced popups and cloud functions carry no meta; `empty` wins over every kind.
- The usage index already carries each instance's `{parent, nodeId}` — slice 3's *Used in* popover
  needs no second walk.

## Next, in order

1. **TVW-001 slice 2 — row d, sections by role** (`Pages` in Router order with the start page
   marked, `Components`, `Logic`, `Cloud functions`; unrouted pages in `Pages`; two Routers = two
   groups). `componentKind.ts` refuses a `logic` kind on purpose — R-H allows it only because `empty`
   is separate; `routedBy` in the usage index is already there for the chip. Then AC3 (add/remove from
   the Router's Pages editor, undo both ways).
2. Slice 3 (c, AC4), slice 4 (e, AC5), slice 5 (f, AC6), then AC7 screenshots (fix the meta
   alignment beside a warning dot first) and AC8.
3. **TVW-003 close-out** the moment Richard answers AC1's style word.

## Rulings owed by Richard

- **AC1 hover outline: solid or dashed?** Today's canvas hover outline in the preview is a solid 2px
  teal line with box-model chips (unchanged from before P93). AC1 says "dashed". Keep solid (AC reworded),
  or make hover dashed so it reads differently from the selected outline?

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
