# Phase 93 — next session

**Written 2026-09-18, end of session 11.** s1–5 built and drove TVW-003. s6–s10 built TVW-001's six
rows (slices 1–5) and closed AC1–AC6. **Session 11 drove AC7, found three defects, took Richard's
rulings on all of them, built the fixes and re-drove.** He ruled **"worthy once the above are
done"** — they are done, so AC7 needs only his look at the `ac7b-*` re-shoot. Both passes are
written up in TVW-001 §"AC7 — the screenshot pass" and §"AC7 — Richard's rulings, built and
re-driven".

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | 🟡 all six rows built + AC7's three fixes | **AC1–AC6 ✅** · **AC7: ruled, fixed, re-driven — needs only his look at `ac7b-*`** · AC8 re-read green at s11 |
| TVW-002 | The preview says what it is not showing (needs 001) | — | — |
| TVW-003 | One selection, three surfaces | ✅ slices 1–6 | **CLOSED** |
| TVW-004 | Layers (needs 001, 003) | — | — |
| TVW-005 | Layers can move things (needs 004) | — | — |
| TVW-006 | The structure lane | — | — |
| TVW-007 | An instance says what it is (needs 003) | — | — |
| TVW-008 | The board (needs 002) | — | — |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 12** (TVW-003 all six; TVW-001 AC1–AC6). Unchanged by s11 — a screenshot pass closes
nothing by itself.

## What s11 settled

**The 13 shots are in `verdicts/TVW-001/2026-09-17/`**, named `ac7-*`. 🔴 **The PNGs are
gitignored** (`.gitignore:265`, `dev-docs/tasks/**/verdicts/**/*.png`) — they exist on this
machine only, so a fresh clone or worktree will not have them. What *is* committed is the
`manifest.json` (surface / state / viewport / theme / build sha per image) and the `numbers.json`
the verdicts README requires for TVW-001, which carry every measurement quoted below. The eight AC7 asks for
(`{corpus,cloud}-{300,240}-{light,dark}`) plus five first looks. Both widths were set by dragging
the **real divider**, so they are the product's own clamps: `MIN_PANEL_WIDTH` is **240**, which makes
AC7's narrow case the enforced minimum rather than an arbitrary number.

**Slice 5's JSX was correct on its first sight** — the two-element caption, the `.ScopeHeading`
(DOM `Workbench`, CSS-uppercased, `--font-size-xs`), and *Open on the Workbench* under *Open*. The
`MenuDialog` measuring ghost reproduced exactly as the handoffs describe.

🔴 **The previous handoff's narrow-width worry was the wrong question.** It said to check the caption
"does not wrap badly at 240px (that is what `CAPTION_JOIN`'s nbsp is for)". **The caption cannot
wrap** — `white-space: nowrap` + `text-overflow: ellipsis`, and it is the only flex-shrinkable item
in the strip. It truncates. That is the third handoff in a row whose most confident sentence was its
wrong one; keep reading these as claims to measure, not as facts.

## Rulings owed by Richard

**All four AC7 questions were ruled on 2026-09-18 and all are built.** What is left is his look at
the `ac7b-*` re-shoot, since he ruled *"worthy once the above are done"*.

1. ✅ **Cut "Sample values." from the caption** — done. It was the second meaning of *sample* on one
   surface, ~44px above the summary's "No sample data".
2. ✅ **The size controls shrink, not the sentence** — done. `.FrameRoot` `flex-shrink: 0 → 100`
   with a 96px floor. At the same 646px panel the caption went from 105px of the 330px it needed to
   247 of 248; at 300px it is whole.
3. ✅ **Stop inventing a route from the page title — DISPLAY ONLY** — done, in the pure
   `authoredPageUrl.ts`. ⚠️ He was **re-asked** after the first question turned out to be
   under-measured: the fallback is written out in **three** places, and two of them decide the URLs
   a deployed app and the dev preview actually serve. Those were left alone deliberately. Do not
   "finish the job" by changing them — that is a routing change and needs its own ruling.
4. ⏳ **The WORTHY look** on `verdicts/TVW-001/2026-09-18/`.

Still open from s10, and **not** TVW-001's: whether the Blockly logic bench gets a name of its own.

## Next, in order

1. **Richard's WORTHY look** at `verdicts/TVW-001/2026-09-18/` (`ac7b-*`). Open them for him —
   markdown links do not work in his VS Code (`open -a Preview <paths>`).
2. Then **close TVW-001**. AC8 was re-read at s11 with the fixes in and is green (below).
3. Then TVW-002 (the preview strip) unblocks; TVW-004 (Layers) needs 001 + 003, both met.
4. 🔴 **TVW-002 and TVW-008 both contain wording AC7 has already ruled against** — four places:
   TVW-002's person sentence and its shape-1 string, TVW-008 §1 and its honesty caption, all saying
   *"sample values"* / *"not the app's data"*. That phrasing was cut from the Workbench on
   2026-09-18 because it collides with the bench summary's "No sample data". **Both task files have
   been annotated in place** with a section at the end, so you will see it where you build rather
   than only here. Say the data thing once, in one vocabulary.

## Gates at s11 (with the AC7 fixes in)

- `npm run test:ci`: **2985 specs, 8 failures, seed 98435, HEAD 382b716f, 67s** — the floor, the
  same eight **by name** (3 SUB-006, 2 NDA-017, 3 SUB-011), none of them TVW's. That is now a
  **fourth** seed agreeing (s9 46376, s10 38645, a peer's 68399, this one).
  🔴 Exit is **1** at the floor, exactly as a real regression exits. Gate on the names in
  `tests/test-results.json`, and delete that file first or a stale one reads as a pass.
- `npx jest tests-unit/tvw-001`: **7 suites / 63** (was 6/54). `tvw-001 + vfn-011`: **11 / 118**.
- `tsc -p packages/noodl-editor --noEmit` **EXIT=0**. 🔴 zsh does not give you `PIPESTATUS` through a
  pipe — redirect to a file and read `$?`, or you will gate on nothing.
- Font-size ratchet **−6**; hex ratchet **16/16**.
- Mutants: **3 red and `cmp`-proven**. ⚠️ A 4th reported `Tests: 0 total`, which is a suite that
  **failed to compile** — not a pass. 🔴 An earlier mutant attempt *silently did not apply* (bad
  shell escaping) and the suite passed: that is the false green the `cmp` check exists to catch.

## Measured this session, reusable

- ✅ **The route chip is truthful, even when it is ugly.** Driving the app to the chip's own 57-char
  URL renders the whole Home page (4892 chars); a nonsense path renders **0**. The control is what
  makes that a finding — a catch-all router would have rendered Home either way.
- ✅ **s8's meta alignment holds.** At 240px every `[data-test="component-tree-meta"]` has right edge
  **258**, warning-dot row included.
- ✅ ***Used in* on the right fixture.** `/Components/Logic/Scroll to section` is the only corpus
  component with 2+ **parents** (×8 over 3). Heading `Used in 3 places · 8 times`; rows 2+1+5. The
  recorded unevenness now has a number: a row with a count is **51px**, without is **29px**.
- ⚠️ **`Duplicate component name /#__cloud__/test` on opening the cloud fixture is NOT ours** — it is
  `phase-80/UNOWNED-ROWS-TO-MEASURE.md:114-125`, whose reading says no editor code is implicated.
  One fresh measurement for that row: it claims the editor sees only `TypeError: fetch failed`, but
  here the editor showed the real cause, so either that is fixed or the `backend:update-workflow`
  IPC is a different path from the PUT sequence it describes.

## How the drive was done (reuse it — corrected at s11)

Scratch profile: the live profile is `~/Library/Application Support/NodeGX/`. Copy its
`firstRunLegal.json` into `<scratch>/profile` and write a `recently_opened_project.json` whose
`recentProjects[]` rows carry `retainedProjectDirectory`, `latestAccessed`, `id`, `name` — pointing
at **copies** of the projects. Then, backgrounded **as the call's own command**:

```bash
NOODLPORT=8680 NOODL_REMOTE_DEBUG_PORT=9444 NOODL_USER_DATA_DIR=<scratch>/profile \
  npm run dev:debug -- --quiet
```

Gate on the CDP port, never the launcher's exit code. **Warm, it was up in 60s, not 6 minutes.**

**Helper (`drive.js`), worth rewriting — it is four commands over `scripts/devtools/cdp.js`:**
`ev <expr>`, `click x y`, `rclick x y`, `drag x1 y1 x2 y2`, `shot <file>`.
- 🔴 `cdp.js` reads `NOODL_REMOTE_DEBUG_PORT` **at require time** — set it before requiring.
- 🔴 `dispatchClick(client, {x, y})` takes an **object**, not two numbers. `dispatchDrag` is **not
  exported** — copy its press/move/release shape via `client.send('Input.dispatchMouseEvent', …)`.
- 🔴 Resolve every click point with `document.elementFromPoint` first; a `MenuDialog` renders every
  row twice, ~36px apart.
- 🔴 `elementFromPoint` returning `NOTHING` usually means **below the fold** — the viewport is 784px
  and the tree scrolls; set `[data-test="component-tree"]`'s `scrollTop` and re-measure.

**Levers, with citations:**
- Theme: `__wreq('./src/editor/src/models/ThemeManager.ts').ThemeManager.setMode('light'|'dark')` —
  the persisted path. Get `__wreq` with
  `webpackChunknoodl_editor.push([[Symbol()],{},(r)=>{window.__wreq=r;}])`. Read the result in a
  **separate eval** from the write.
- Panel width: drag the tall `[class*="FrameDivider-module__Divider"]`; panel width = divider x − 52
  (`RAIL_WIDTH`). Stored **per project** in `EditorSettings` under `editor-sidebar-widths` /
  `selection-slot`, so **it resets when you switch projects** — re-drag after every switch.
- Selectors: panel `[data-panel-id="components"]`; rows `[data-test="component-tree-item"]`; metas
  `[data-test="component-tree-meta"][data-tone=…]`; sections `[data-test="component-tree-section"]`;
  caption `[data-test="bench-caption"]` (`>strong` + `>span`); summary `[data-test="bench-summary"]`;
  scope chip `[data-test="preview-scope-chip"]`, targets `[data-test="preview-scope-target-<name>"]`.
- Exit to launcher: the brand dot, `[class*="BrandExit"]` at ~(26,61).

## The box

**Only one dev stack per checkout** (`webpack-dev-server` hardcodes 8080; `NOODLPORT` does not move
it). Check `node scripts/devtools/stop-dev.js --list` and `lsof -nP -iTCP:8080 -sTCP:LISTEN`, and
**ask the peer holding it** — s9 did, s11 did, both got the box in minutes. Announce before
teardown; it sweeps the whole checkout. `test:ci` is plain Node and safe beside a live stack;
launching an *editor* is what kills a running `test:ci`. `dev-debug.js` truncates `.logs/dev.log`.

## Committing

🔴 **The working tree carries other sessions' work.** Commit by **explicit pathspec only**; add
untracked files first (a pathspec commit skips them). `git commit -- <paths> -F msg` fails —
everything after `--` is a pathspec, so put `-F <file>` **before** the `--`.

## Read first

1. `future-projects/THREE-VIEWS-OF-ONE-APP.md` §4.3; TVW-001 §2 and §7 (the AC7 section is last).
2. README §2 and §6. TVW-003 §6 has the selection plumbing map.

## The rule that will be tempting to break

**The app preview never moves because the canvas did.** s11 moved it deliberately, twice, to test
whether the route chip named a real URL — and put it back. That is a probe, not a canvas-driven
move; the rule is about what the *editor* does on its own.
