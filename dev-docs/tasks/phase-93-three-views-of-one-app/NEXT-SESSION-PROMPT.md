# Phase 93 — next session

**Written 2026-09-17, end of session 5.** Session 1 scoped the phase and built TVW-003 slice 1;
sessions 2–4 built and drove slices 2–4 (canvas binding, instance paths, hover); session 5 built and
drove slice 5 (the bench gets the editor bridge) and closed AC4.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | — | — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | 🟡 slices 1–5: store, canvas binding, instance paths, hover, bench bridge | AC2 ✅ AC3 ✅ **AC4 ✅** AC5 ✅ AC6 ✅ · AC1 🟡 (solid vs "dashed", Richard) |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 5 (TVW-003 AC2, AC3, AC4, AC5, AC6).** TVW-003 is one ruling from closed.
Built-but-undriven: the detached preview's select and hover paths; the authoring preview's *absence*
of a bridge (graded by spec only).

## Gate readings (2026-09-17, session 5)

- editor `npx jest tests-unit/tvw-003` (from `packages/noodl-editor`): **4 suites / 40**; bridge spec
  armed (bridge with no design mode → 1 red; unguarded script → 1 red).
- `tsc -p packages/noodl-editor --noEmit` EXIT=0 (viewer untouched this session).
- `test:ci` seed 18181 on `8c7f57a0` + slice 5, cache cleared, alone: **2984 specs, 8 failures** — the
  recorded eight by name. No new red. (The background notification said exit 0; the log's `EXIT=1`
  is the real one, from the eight.)
- Driven on a live editor: TVW-003 §6 slice 5 table.

## What session 5 settled

- **The handoff was right about AC4** — re-measured by reading before building: no `preload` on the
  bench `<webview>`, and `viewer.jsx` builds the inspector only under `window.NoodlEditor`.
- **Smallest bridge = the same preload, bench only.** `sandboxEditorBridge(designMode, appPath)`;
  `useSandboxViewer({ designMode })` returns `preload` and sets the inspector on dom-ready and on
  every Design | Preview flip, in place. `SandboxPreview` (authoring) passes nothing → no bridge.
- The bench click needs **no new editor path**: `inspectPaths` → `inspectNodes` → store, and
  `authoredPath` drops the bench harness instance id, so the store holds `[["hero_head"]]`.
- With the canvas on another component, a bench click moves the canvas to the definition. Correct —
  the bench shows a definition, not an instance.
- The app preview did not move (`scrollY` 0).

## Next, in order

1. **TVW-001** (Components panel, `ComponentsPanelNew/` only) — unblocked, and TVW-004 needs it. Read
   its task file and the proposal §4.1 first.
2. **TVW-003 close-out** the moment Richard answers AC1's style word (a one-line change either way:
   reword the AC, or draw hover dashed in `highlighter.ts`, which needs the viewer rebuilt —
   `src/external/viewer` is gitignored build output).
3. Optional, no AC asks it: the bench outlining a canvas selection/hover inside itself (§2's "the
   bench client gets the same"). Don't build it before TVW-001.

## Rulings owed by Richard

- **AC1 hover outline: solid or dashed?** Today's canvas hover outline in the preview is a solid 2px
  teal line with box-model chips (unchanged from before P93). AC1 says "dashed". Keep solid (AC reworded),
  or make hover dashed so it reads differently from the selected outline?

R-A…R-I inherited, R-J ruled.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §2, §4, §7; the mock's scenario 2.
2. README §2 and §6. TVW-003 §6 has every slice's drive table and the plumbing map.

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
(scratchpad, gone — the shapes are above). Bench: `EventDispatcher.instance.emit('preview-bench-mount',
{target})` (the module with `EventDispatcher.instance`); its guest target is `--target=noodl-sandbox=`.
🔴 An absence ("no store write") needs a guest `pointerdown` counter beside it, or it grades nothing.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
