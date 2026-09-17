# Phase 93 — next session

**Written 2026-09-17, end of session 4.** Session 1 scoped the phase and built TVW-003 slice 1;
sessions 2–3 built and drove slices 2–3 (canvas binding, instance paths); session 4 built and drove
slice 4 (canvas hover through the store) and closed AC5 and AC6.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | — | — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | 🟡 slices 1–4: store, canvas binding, instance paths, hover | AC2 ✅ AC3 ✅ AC5 ✅ AC6 ✅ · AC1 🟡 (solid vs "dashed", Richard) · **AC4 ❌** |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 4 (TVW-003 AC2, AC3, AC5, AC6).** Built-but-undriven: the detached preview's select and
hover paths (same payloads as docked, over ipc `viewer-select-node` / `viewer-hover-node`).

## Gate readings (2026-09-17, session 4)

- editor `npx jest tests-unit/tvw-003` (from `packages/noodl-editor`): **3 suites / 35**; hover specs
  armed (unconditional clear on leave → 1 red; no clear on unbind → 1 red).
- `tsc -p packages/noodl-editor --noEmit` EXIT=0; `tsc -p packages/noodl-viewer-react --noEmit` EXIT=0.
- `test:ci` seed 18181 on `3b63ca5e` + slice 4, cache cleared, alone: **2984 specs, 8 failures** — the
  recorded eight by name. No new red.
- Driven on a live editor: hover on/off with outline rect equal to the element and `scrollY` 0; AC5
  panel text identical canvas-click vs preview-click on a Group and a Text. Tables in TVW-003 §6.

## What session 4 settled

- **Hover goes through the store**: `SelectionStoreBinding` gives the app canvas `setPreviewHover`;
  `EditorDocument`'s preview subscriber sends `hoverNode(path)` to the docked webview and over ipc to
  the detached one. The relay `hoverStart`/`hoverEnd` broadcast is removed (sender and viewer listener).
- 🔴 **The handoff was wrong about landmine 2.** The broadcast was not reaching a bench that drew it:
  only `CanvasView`'s webview loads `webview-preload-viewer.js`, so only the app preview ever had the
  listener. Measured by reading (`CanvasView.ts:98`, the only `preload` in `views/`).
- 🔴 **Which makes AC4 harder than the handoff assumed**: the bench webview has no `window.NoodlEditor`,
  so no `Inspector`, so a click on the bench selects nothing today. Re-measure on a running bench first.
- 🔴 **Slice 3's "editor-window coordinates" note was about the wrong target**: `cdp.js appTarget('webview')`
  matches nothing and falls back to the editor page. The embedded preview is its own target:
  `appTarget('localhost:<NOODLPORT>')`. An editor-window screenshot did not show the guest outline;
  the webview target's own capture did.
- Read-only canvases (review/diff/authoring) no longer outline hover in the preview — slice 2's rule.

## Next, in order

1. **AC4 (bench)** — drive a bench on `Hero` and confirm (eval `typeof window.NoodlEditor` in the
   sandbox target) that it has no inspector bridge. If so, decide the smallest bridge: the preload is
   shared with the app preview and brings `inspectPaths` + the highlight API; the sandbox hook
   (`views/SandboxSurface/useSandboxViewer.ts`) also serves the authoring preview, where a click must
   NOT move the app canvas. Then: click the headline on the bench → canvas on Hero selects `Headline`.
2. **TVW-003 close-out** once AC4 lands and Richard answers AC1's style word.
3. **TVW-001** (Components panel, `ComponentsPanelNew/` only) — unblocked, and TVW-004 needs it.

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
(`--list` first). Drive scripts from s4: `drive-hover.js`, `drive-ac5b.js` (scratchpad, gone — the
shapes are above).

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
