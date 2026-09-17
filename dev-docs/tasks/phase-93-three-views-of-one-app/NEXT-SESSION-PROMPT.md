# Phase 93 — next session

**Written 2026-09-17, end of session 9.** Sessions 1–5 built and drove TVW-003 slices 1–5. Session 6
started TVW-001 (slice 1, AC1 + AC2); session 7 built and drove slice 2 (row d, AC3); session 8 built
and drove slice 3 (row c, AC4). **Session 9 built and drove TVW-001 slice 4 (row e, sheets retired)
and closed AC5.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 slices 1 (a, b), 2 (d), 3 (c), 4 (e) ✅ | **AC1 ✅ AC2 ✅ AC3 ✅ AC4 ✅ AC5 ✅** · AC6–8 — |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 11** (TVW-003 all six; TVW-001 AC1–AC5).

## Gate readings (2026-09-17, session 9)

- `npx jest tests-unit/tvw-001` (from `packages/noodl-editor`): **5 suites / 46** (was 4 / 33).
  Armed — five mutants on `folderDisplay.ts`, each red, each `cmp`-proven to have applied before the
  run. Restored, `cmp` clean.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**. 🔴 Always `--noEmit`: `tsc -p <package>` emits
  in place and reddens ~85 suites.
- `npm run test:ci` — **started at the end of s9 after `rm -rf packages/noodl-editor/.webpack-cache`,
  result not in hand when this was written. Read it before trusting AC8.** The log is at
  `scratchpad/testci.log`; the run's own exit code is the gate, and a stale
  `packages/noodl-editor/test-results.json` reads as a pass, so check its mtime. Baseline is **6 at
  seed 39386** (`test-ci-baseline-is-six-at-seed-39386`).
- 🔴 **`tests/components/createMenu.spec.ts` was rewritten this session** and has not been run. It is
  the one gate most likely to be red: it pinned the sheet-based create menu, and R-C removes what
  most of it asserted. If `test:ci` is above the floor, look there first.

## What session 9 settled

- **Slice 4 is built and driven; AC5 is closed.** Detail and the drive table are in TVW-001 §7.
- **The design decision: the `#` comes off the label and stays on the path.** Not taste — the code
  forces it. `useComponentActions` maps what the tree hands it straight onto real component names,
  and `sheetPrefix` (the thing that used to put back what a selected sheet stripped) is deleted. A
  display label leaking into a path position silently renames a legacy project's folders. So
  `FolderItemData.path` keeps `/#Design` and `name` reads `Design`, via the new pure
  `folderDisplay.ts`. Driven both ways: the row says `Design`, `ProjectModel` still says
  `/#Design/Card`, and creating in that folder lands at `/#Design/SheetProof`.
- 🔴 **`addComponentToFolderStructure` now keys its folder lookup on the path, not the name** —
  after stripping, `/#Design/…` and `/Design/…` both read `Design` and would have merged into one
  folder whose path was whichever was seen first.
- **The cloud door was about to be shut by this slice, and had to be reopened.** SPR-005's answer to
  "you are in a browser folder" was a disabled row saying *choose Cloud Functions in the sheet
  selector*. With no selector that is an uninstructable instruction — F83's finding restored intact.
  *Create Cloud Function Component* is now **enabled from every folder context** and creates into
  `#__cloud__` whatever was right-clicked, with its end slot naming that destination. Driven: header
  `+` at the project root → `/#__cloud__/chargeCard`.
- **The handoff's slice-4 plan was right about the drag and wrong about the fixture.** It said to
  drive a cloud-boundary drag "here, because the QA fixture has no cloud folder" — true, and the
  drag is now driven. But **no project on this machine has a `#` folder** (all 128 checked) and the
  editor can no longer make one, so AC5's fixture had to be built on disk:
  `NodeGX test projects/TVW-001 Slice4 Drive`.
- **Deleted:** `SheetSelector.tsx`, `SheetSelector.module.scss`, `useSheetManagement.ts`,
  `buildTreeFromProject` (88 lines, no caller left), `panelProps.options`, `Sheet`,
  `ComponentsPanelOptions`, `CLOUD_SHEET.displayName` (a second spelling of `SECTION_LABEL.cloud`,
  already drifted by a capital letter). `StringInputDialog` stays — `BackendServicesPanel` uses it.

## Next, in order

1. **Read the `test:ci` result** (above) before anything else. If `createMenu.spec` is red, that is
   s9's debt, not a new finding.
2. Slice 5 (f, AC6): *Open on the Workbench* directly under *Open*; the `VisualCanvas.tsx:352-355`
   caption; the scope chip's picker heading; sweep every user-visible *bench* / *isolated component*
   / *sandbox* string; re-pin FIX-019's caption spec to the new text.
3. AC7 screenshots (panel at 300px and 240px, both themes, corpus + a cloud project — use
   `Members area (TPL-001)`, which has cloud functions), then AC8.
4. Optional, no AC asks it: the bench outlining a canvas selection or hover inside itself.

**The AC7 list, carried forward:** the `Not in a router` heading repeats the row chip; rows are 26px
under 30px headings; home sorts after folders; in the *Used in* popover a parent's count renders on a
second line under the path (`MenuDialogItem.endSlot` draws below the label). Meta alignment is
**done** (s8). New from s9, for Richard to see: a folder rename now writes the label, so renaming a
legacy `Design` folder sheds its `#` (opt-in migration, never automatic); dragging `#Design` to the
root lands it at `/Design`; *Move to…* is gone from both row menus with no replacement.

## Not driven, and why

🔴 **The root-drop refusal for a cloud row grades nothing.** Its control — root-dropping an ordinary
browser component — did not move it either, so "the cloud row stayed put" is equally consistent with
"root drop does not fire under a synthetic drag at all". Row-to-row drops *do* fire (controlled and
passing), so the difference is `handleTreeMouseUp`'s `PopupLayer.instance.isDragging()` gate, which
s9 did not touch — it only made the guard beside it unconditional. Either get the control firing or
leave the row alone; do not record it as a pass.

## Rulings owed by Richard

None open. R-A…R-I inherited, R-J ruled. Slice 4's decisions above are not rulings; he sees them at
AC7.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §4.3; TVW-001 §2 and §7.
2. README §2 and §6. TVW-003 §6 has the selection plumbing map.

## How the drive was done (reuse it)

Scratch profile: **the live profile is `~/Library/Application Support/NodeGX/`**, not
`OpenNoodl Editor/` — copy its `firstRunLegal.json` into a scratch dir and write a
`recently_opened_project.json` pointing at a copy of the project. Then
`NOODLPORT=8680 NOODL_REMOTE_DEBUG_PORT=9444 NOODL_USER_DATA_DIR=<scratch> npm run dev:debug -- --quiet`,
backgrounded **as the call's own command** (`&` inside a backgrounded tool call dies with its
wrapper). Cold compile ≈ 6 min. Gate on the CDP port, never on the launcher's exit code:

```bash
until curl -s -m2 http://127.0.0.1:9444/json/list >/dev/null; do sleep 5; done
```

Open the project by clicking its `h3` on the launcher. Canvas = `window.__nodeGraphEditor`; modules
via `webpackChunknoodl_editor.push([[Symbol()],{},(r)=>{window.__wreq=r;}])`, then scan
`Object.keys(__wreq.m)` for the one exporting `ProjectModel.instance`. Stop with
`node scripts/devtools/stop-dev.js` (`--list` first).

**s9's helpers are in the scratchpad and will be gone — the shapes are worth rewriting:** `ev.js`
(`--target=<substr>` + expression), `click.js x y`, `drag.js x1 y1 x2 y2`, `shot.js out.png`.
🔴 `cdp.js` reads `NOODL_REMOTE_DEBUG_PORT` **at require time** — set it before requiring, or every
call hits 9222. 🔴 `cdp.js` exports only `appTarget`, `connect`, `evaluate`, `elementCentre`,
`dispatchClick`, `httpJson`, `KNOWN_TARGETS` — **`dispatchDrag` is *not* exported**, and calling it
throws *after* your "before" reading, leaving an unchanged "after" that looks exactly like a refusal.
`evaluate(client, expr)` takes a client, not an options object. 🔴 zsh does not word-split `$P`: pass
coordinates as two literal args. 🔴 A double-click on a non-component node hides the Components tree
(0×0 rects) — click the rail's Components button (26,101) to bring it back.

🔴 **A `MenuDialog` renders every row twice**, a measuring ghost ~36px above the real one. Clicking a
row's measured centre hits the row *above* it and produces a confident, wrong result. Resolve every
click point with `document.elementFromPoint(cx, cy)` and use only the copy that returns itself.

Filling a `StringInputPopup`: set `.value` through
`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` and dispatch a bubbling
`input` event, then click the `Add` button (also elementFromPoint-checked).

## The box — read this before planning a drive

**Only one dev stack can run in this checkout at a time.** `webpack-dev-server` hardcodes
`port: 8080` *and* `publicPath: http://localhost:8080/`; `NOODLPORT` does not move it. Check
`node scripts/devtools/stop-dev.js --list` and `lsof -nP -iTCP:8080 -sTCP:LISTEN` first, and **ask
the peer holding it rather than waiting blind** — s9 did, and got the box in minutes.

✅ **Teardown sweeps the whole checkout, by every route.** Announce before you run it. `test:ci` is
plain Node and is safe beside a live stack; launching an *editor* is what kills a running `test:ci`.

⚠️ `dev-debug.js` opens `.logs/dev.log` with `flags: 'w'`, so launching **truncates a peer's live
log**.

## Committing, this week especially

🔴 **The working tree carries other sessions' staged work** — s9 found staged deletions under
`packages/noodl-editor/tests-unit/chr-004/` and `scripts/look-gate/` belonging to a phase-92 peer
mid-move. **Commit by explicit pathspec only**; a bare `git commit` sweeps them into your commit.
Add untracked files first — a pathspec commit skips them otherwise.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
