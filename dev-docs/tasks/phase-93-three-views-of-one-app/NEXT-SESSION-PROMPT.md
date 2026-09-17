# Phase 93 — next session

**Written 2026-09-17, end of session 2.** Session 1 scoped the phase and built TVW-003 slice 1;
session 2 built and drove slice 2.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | — | — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | 🟡 slices 1–2: store, canvas binding, preview relay | 🟡 slice 2 driven; AC2 ✅; AC1 canvas half only |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 1 of the phase's (TVW-003 AC2).** Built-but-undriven: none.

## Gate readings

- `npx jest tests-unit/tvw-003` (from `packages/noodl-editor`): **3 suites / 28 passed**, armed with 4
  mutants in session 2 (and 5 in session 1).
- `tsc -p packages/noodl-editor --noEmit`: exit 0, 2026-09-17, with the slice 2 files confirmed in
  `--listFiles`.
- `test:ci`, 2026-09-17, slice 2 uncommitted on `834f64660`, seed 39393, `.webpack-cache` cleared,
  alone: **2984 specs, 8 failures** — the recorded eight by name (SUB-006 ×3, NDA-017 ×2,
  SUB-011 ×3, all P88's fixtures). No new red.

## What session 2 settled

- **The store is a mirror, not the replacement** (decided in slice 1, held): `NodeSelector` still
  owns copy/paste/delete/marquee; no `selectNode` caller moved.
- **Only the app's canvas is bound** (`NodeGraphContext`). The change-review, diff and
  authoring-preview canvases are separate `NodeGraphEditor`s and stay off the store.
- **The canvas must never write back while applying.** Not for echo (the store dedups equal writes)
  but because its version is lossy: on Home it holds `home_hero` of `[home_hero, hero_head]`.
- **`SelectionActions` settles before publishing** — a depth counter — or every click reads as
  "nothing selected, then the node" and the preview drops and redraws its outline.
- **`EditorDocument`'s sidebar "hack" is gone.** Its `activeChanged` twin was redundant: the canvas's
  own FH-008 deselect already writes `[]`. Driven: `selectNode('null')` still reaches the preview.
- Departure recorded, not asked (does not reach the person): a preview click on the node the store
  already holds is now dropped as an equal write, so it no longer re-centres the canvas.

## Next, in order

1. **TVW-003 slice 3 — the viewer half.** `noodl-viewer-react/src/inspector.ts` sends the instance
   path (walk the node's `nodeScope`/`componentOwner` up to the root), `editorapi.inspectNodes` and
   the `inspectNodes` handler in `EditorDocument` accept a path, `highlighter` outlines only the
   addressed instance. That closes AC1 (real click) and AC3. The detached-preview ipc
   (`viewer-inspect-node`, `viewer-select-node`) follows the same shape.
2. **TVW-003 slice 4 — hover through the store**, targeted at the app client (landmine 2), then the
   bench (AC4) and AC5's `describeRows` characterisation.
3. **TVW-001** in parallel if a second lane is running — it touches `ComponentsPanelNew/`, not the
   files above. Its row click writes `selectionStore.select('panel', component, [])`, which the canvas
   binding already turns into a component switch.

## Rulings owed by Richard

None open. R-A…R-I inherited, R-J ruled.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §2, §4, §7; the mock's scenario 2.
2. README §2 and §6. TVW-003 §6 carries the slice 2 drive table and the existing-plumbing map.

## How the drive was done (reuse it)

Scratch profile (`firstRunLegal.json` + `recently_opened_project.json` pointing at a copy of
`Landing page test V2`), `NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333 NOODL_USER_DATA_DIR=<scratch>
npm run dev:debug -- --quiet`. Modules via `window.webpackChunknoodl_editor.push([[Symbol()],{},r=>window.__wreq=r])`;
the canvas is `NodeGraphContextTmp.nodeGraph`; the design toggle is `[class*=ModeSegmentedButton]`;
the preview is spied by wrapping `webview.executeJavaScript`. Coordinate clicks go through
`cdp.js`'s exported `appTarget`/`connect`/`dispatchClick` (`webview` target for the preview, guest
coordinates). 🔴 Reset a spy in a *separate* eval from the write you are measuring.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Slice 3 makes the canvas *stay* when the
preview is clicked; the reverse must never appear.
