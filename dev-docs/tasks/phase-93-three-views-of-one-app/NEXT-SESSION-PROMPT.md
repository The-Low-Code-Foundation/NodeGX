# Phase 93 — next session

**Written 2026-09-17, end of session 3.** Session 1 scoped the phase and built TVW-003 slice 1;
session 2 built and drove slice 2; session 3 built and drove slice 3 (the viewer sends and outlines
instance paths).

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | — | — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | 🟡 slices 1–3: store, canvas binding, preview relay, instance paths both ways | 🟡 AC2 ✅, AC3 ✅, AC1 click half ✅ (hover half = slice 4); AC4, AC5 open; AC6 at the floor for slice 3 |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 2 (TVW-003 AC2, AC3).** Built-but-undriven: the detached preview's path (same API
and ipc payload as the docked one, not exercised).

## Gate readings (2026-09-17)

- viewer `npx jest tests/tvw-003-instance-path.test.ts` (from `packages/noodl-viewer-react`): **10
  passed**, armed with 3 mutants; with `tests/fb-016*` 6 suites / 116.
- editor `npx jest tests-unit/tvw-003` (from `packages/noodl-editor`): **3 suites / 31**, `authoredPath`
  armed (1 red).
- `tsc -p packages/noodl-editor --noEmit` exit 0 (after the last edit); `tsc -p packages/noodl-viewer-react --noEmit` exit 0.
- `test:ci`, 2026-09-17, slice 3 uncommitted on `4d59dda6`, seed 06949, `.webpack-cache` cleared, alone:
  **2984 specs, 8 failures** — the recorded eight by name (SUB-006 ×3, NDA-017 ×2, SUB-011 ×3). No new red.

## What session 3 settled

- **A path is an in-order subsequence match** (`pathAddresses`). The canvas's `[id]` still outlines
  every instance; a preview click's path outlines one.
- **The store keeps only authored ids** (`authoredPath`): a Page Router's page and a For Each row are
  fresh `guid()`s per render and would address nothing after a reload. Consequence recorded as a
  departure: For Each rows are not told apart.
- **The root instance has no `parentNodeScope`** — measured on the running runtime, it is the walk's
  stop condition.
- 🔴 **The handoff was wrong about coordinates**: `cdp.js appTarget('webview')` + `dispatchClick` take
  **editor-window** coordinates (guest point + the webview's rect origin), not guest ones. A guest
  point clicked the sticky nav.
- An equal path re-sent the preview outline on every repeat click (a new array each time); the
  `EditorDocument` state now keeps the old array for an equal path. Driven: second click, no resend.

## Next, in order

1. **TVW-003 slice 4 — hover through the store**: canvas hover writes `selectionStore.setHover`, the
   preview subscriber sends `highlightNodesAtPath` to the **app client only** (landmine 2: today
   `hoverStart`/`hoverEnd` broadcast to every client, the bench included). That closes AC1's hover half.
2. **AC4 (bench)** — bench `Hero`, click its headline on the bench, canvas on Hero selects `Headline`.
   The bench client is `sandbox-<guid>` (`useSandboxViewer.ts`); check whether it runs the same
   `Inspector` → `inspectPaths` path. **AC5** — `describeRows` characterisation, before/after.
   **AC6** — `test:ci` at the floor once slice 4 lands.
3. **TVW-001** in parallel if a second lane is running (touches `ComponentsPanelNew/` only).

## Rulings owed by Richard

None open. R-A…R-I inherited, R-J ruled.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §2, §4, §7; the mock's scenario 2.
2. README §2 and §6. TVW-003 §6 carries the slice 2 and 3 drive tables and the plumbing map.

## How the drive was done (reuse it)

Scratch profile (`firstRunLegal.json` + `recently_opened_project.json` pointing at a copy of
`Landing page test V2`), `NOODLPORT=8675 NOODL_REMOTE_DEBUG_PORT=9444 NOODL_USER_DATA_DIR=<scratch>
npm run dev:debug -- --quiet` (**a peer used 9333/8674 this session — check `lsof -sTCP:LISTEN`
first**). The project list opens the copy on a click on its `h3`. Modules via
`window.webpackChunknoodl_editor.push([[Symbol()],{},r=>window.__wreq=r])`; store = the module
exporting `selectionStore` + `authoredPath`; canvas = `NodeGraphContextTmp.nodeGraph`; design toggle
`[class*=ModeSegmentedButton]`; preview spied by wrapping `webview.executeJavaScript`; runtime in the
guest = `NoodlEditorHighlightAPI.highlighter.noodlRuntime`. AC3 target: `sc_title` in `sv_c2`
("Product design") on Home. 🔴 Reset a spy in a *separate* eval from the write; 🔴 an eval that
throws halfway may already have subscribed a spy — a doubled log is yours. 🔴 `cdp.js reload` left
the dev renderer blank for 4+ min; relaunch instead.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover through the store must outline in the
preview, never scroll it.
