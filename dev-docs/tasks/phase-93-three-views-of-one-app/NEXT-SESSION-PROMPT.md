# Phase 93 — next session

**Written 2026-09-17, end of session 10.** Sessions 1–5 built and drove TVW-003 slices 1–5. Session 6
started TVW-001 (slice 1, AC1 + AC2); s7 built and drove slice 2 (row d, AC3); s8 slice 3 (row c,
AC4); s9 slice 4 (row e, sheets retired, AC5). **Session 10 built TVW-001 slice 5 (row f, the
Workbench words) and closed AC6** (`950ac4623`). AC6 is a static criterion and owes no drive.

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 slices 1 (a, b), 2 (d), 3 (c), 4 (e), 5 (f) ✅ — **all six rows built** | **AC1–AC6 ✅** · AC7 (Richard) — · AC8 green at s10, re-read at close |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 12** (TVW-003 all six; TVW-001 AC1–AC6).

## Gate readings (2026-09-17, session 10)

- `npm run test:ci`: **2985 specs, 8 failures, seed 38645** — **the recorded floor**, the same eight
  by name as s9 read at seed 46376 (3 SUB-006, 3 SUB-011, 2 NDA-017), none of them TVW's. Two
  different seeds agreeing is as close to "this is the floor, not luck" as this gate gets.
  🔴 The run's own exit is **1** at the floor, exactly as a real regression would exit — gate on the
  readout's names, never on the exit code alone. Delete `packages/noodl-editor/tests/test-results.json`
  before starting, or a stale file reads as a pass; check its mtime afterwards either way.
  🔴 Backgrounding `npm run test:ci; echo $?` reports the **echo's** 0, not the run's 1.
- **s9's flagged debt is clear.** `tests/components/createMenu.spec.ts` — "the gate most likely to be
  red" — passes. It was already green in s9's own run, which finished after that handoff was written.
- `npx jest tests-unit/tvw-001`: **6 suites / 54** (was 5 / 46). Armed — six mutants on
  `benchWords.ts`, each red, each `cmp`-proven applied before the run, restored `cmp`-clean.
- `npx jest tests-unit/vfn-011 tests-unit/tvw-001`: **10 suites / 109** green.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**. 🔴 Always `--noEmit`.
- Hex ratchet **16/16 holding**; font-size ratchet **−6 under baseline**; `chr-004` + `chr-009`
  **13 suites / 134** green.
- ✅ **AC8's gates are all green at s10** — but AC8 closes with the task, so re-read them after
  whatever AC7 changes.

## What session 10 settled

- **Slice 5 is built and AC6 is closed** (`950ac4623`). All six of TVW-001's rows are now built.
  Detail in TVW-001 §7; the AC6 exclusion list is now written into the task's §6.
- **The Workbench says its own name, from one module.** `views/VisualCanvas/benchWords.ts` —
  `WORKBENCH`, `OPEN_ON_WORKBENCH`, `CAPTION_JOIN`, `benchCaptionRest`, `benchCaption` — feeds the
  caption, the panel's menu row and the scope picker, so the word cannot drift into three dialects.
- 🔴 **Two of the handoff's instructions described work that was already done or impossible.**
  *"Re-pin FIX-019's caption spec to the new text"* — **there is no such spec.** FIX-019's block in
  `tests/canvas/preview-scope.test.ts:207` pins `isDivergedFromCanvas` booleans and asserts no
  strings; nothing in the repo pinned the caption text. It was unguarded for its whole life, which is
  *how* it sat a ruling behind without a gate noticing — so s10 **wrote** the first pin rather than
  moving one. And *"Open on the Workbench directly under Open"*: it was **already** directly under
  *Open*, so row f was a rename, not a reorder.
- **The scope chip's picker had no heading at all** — not a wrong one. The list under *App preview*
  was component names that never said what picking one does. Added, with a `.ScopeHeading` in tokens
  only (`--font-size-xs`), so the font-size ratchet counts no new raw px.
- **"Sample values." was checked before it was written.** `ComponentBench` calls `buildBenchExport`
  without `useSampleData` (default `true`) *and* mounts the viewer with it hardcoded — two
  independent reads. The `Real backend` branch cannot reach this caption. A test pins the sentence
  and says that if a data toggle ever arrives, that assertion is the one that should fail, and the
  fix is a parameter, never a deletion.
- 🔴 **There is a SECOND surface calling itself a bench** — the Blockly logic run bench (VFN-011),
  whose criterion 3 requires it to say it runs *in the editor* on values you type. **Richard ruled:
  swap the jargon, do not rename it.** `SANDBOX_NOTE` → `TEST_VALUES_NOTE`
  (`'test values — not your app's data'`), `'Sandbox run…'` → `'Test run…'`; it was never given the
  name *Workbench*. Three of the four `vfn-011/bench.spec.ts` assertions referenced the **constant**
  and needed no edit — that is the pin working, and the argument for asserting constants.

## Next, in order

1. **AC7 — the only thing between TVW-001 and closed.** Screenshots in
   `verdicts/TVW-001/<date>/`: the panel at 300px and 240px, both themes, on the corpus
   (`Landing page test V2`) and on a cloud project (`Members area (TPL-001)` has cloud functions).
   Then **Richard rules WORTHY**; that ruling is not yours to make.
2. ⚠️ **Slice 5's JSX has never been seen rendered.** The caption's two-element split, the new
   `.ScopeHeading` and the renamed menu row are graded by unit tests only, and a jsdom spec is not a
   look. AC7's drive is also their first look — expect instrument faults before product faults, and
   check the caption does not wrap badly at 240px (that is what `CAPTION_JOIN`'s nbsp is for).
3. Re-read AC8's gates after AC7's changes, then close TVW-001.
4. Then TVW-002 (the preview strip) unblocks, and TVW-004 (Layers) needs 001 + 003 — both now met.
5. Optional, no AC asks it: the bench outlining a canvas selection or hover inside itself.

**The AC7 list, carried forward:** the `Not in a router` heading repeats the row chip; rows are 26px
under 30px headings; home sorts after folders; in the *Used in* popover a parent's count renders on a
second line under the path (`MenuDialogItem.endSlot` draws below the label). Meta alignment is
**done** (s8). From s9, for Richard to see: a folder rename now writes the label, so renaming a
legacy `Design` folder sheds its `#` (opt-in migration, never automatic); dragging `#Design` to the
root lands it at `/Design`; *Move to…* is gone from both row menus with no replacement. **From s10:**
the caption now leads with the word *Workbench*; the menu row reads *Open on the Workbench*; the
scope picker has gained a `WORKBENCH` heading it never had.

## Not driven, and why

🔴 **The root-drop refusal for a cloud row grades nothing** (inherited from s9, still true). Its
control — root-dropping an ordinary browser component — did not move it either, so "the cloud row
stayed put" is equally consistent with "root drop does not fire under a synthetic drag at all".
Row-to-row drops *do* fire, so the difference is `handleTreeMouseUp`'s
`PopupLayer.instance.isDragging()` gate, which s9 did not touch. Either get the control firing or
leave the row alone; do not record it as a pass.

🔴 **Nothing in slice 5 was driven, and nothing in it needed to be.** AC6 is a static criterion. Do
not record the unit suites as a look — see item 2 above.

## Rulings owed by Richard

- **AC7's WORTHY ruling** on TVW-001, once the screenshots exist.
- 🔴 **Open, surfaced by s10, and NOT TVW-001's to settle:** the Blockly logic bench still calls
  itself *"the bench"* in its own prose. It now shares no vocabulary with the Workbench and says
  *"test values"* rather than *"sandbox"*, but whether that surface gets a name of its own is a
  product question. Ask in plain words if a task needs it; do not rename it in passing.

R-A…R-I inherited, R-J ruled. Slice 4's and slice 5's decisions are not rulings; he sees them at AC7.

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

🔴 **The working tree carries other sessions' work** — still true at s10, and it moved *during* the
session: the phase-92 peer's chr-004 / look-gate move landed as `b908859d5` while s10's `test:ci` was
running, so HEAD changed under the run. **Commit by explicit pathspec only**; a bare `git commit`
sweeps a peer's files into yours. Add untracked files first — a pathspec commit skips them otherwise.
Check afterwards that the peer's commit did not carry your staged files (`git show --stat <theirs>`).

🔴 **`git commit -- <paths> -F msg` fails**: everything after `--` is a pathspec, so `-F` is read as a
filename. Put `-F <file>` *before* the `--`.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** Hover outlines, never scrolls — driven
`scrollY` 0 in s4; keep it that way when the bench gets its bridge.
