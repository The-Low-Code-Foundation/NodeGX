# Next session — P109 session 44

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 43 (2026-10-11, on `cline-dev`, primary tree):** the board stays **38 of 52 closed**. ISL-044 went to 5 of 6
and ISL-046 to 4 of 9 (two rows found and filed). Every row was re-measured at HEAD first. Each fix was red on the old
code and green after.

## The board (re-derived from the task files' `**Status` lines, s43)

| task | state | what is left | blocked on |
|---|---|---|---|
| ISL-044 editor reads right | 🟢 5 / 6 | LISTDEFAULTTYPE | Richard's ruling (asked s43, below) |
| ISL-046 templates & kits | 🟢 4 / 9 | ROUTINEREFUSAL, SECONDVISIT (buildable); MOVEARROW, INSTALLER, TPL011UNREADID | MOVEARROW a ruling; INSTALLER the tablets; TPL011UNREADID P78's untracked Nightbook pile |
| ISL-045 node inputs | ⬜ 5 bugs | INSTANCEROOT, DROPDOWNEMPTYRESET (buildable); MOUNTED, VARIDS, BUILTINBOUNDARY | 3 rulings inside |
| ISL-043 export | ⬜ 8 bugs (2 high) | all | P18 is live in `nodegx-export` |
| ISL-007, 008, 009, 010, 018, 022, 024, 025, 035, 037 | 🟡/🟢/⬜ | as in s40's list | outside this phase |

## Do, in this order

1. **Re-read the board yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`). Do not copy the table above.
2. **The rulings first, if Richard answered** (MOVEARROW, LISTDEFAULTTYPE): build what he chose.
3. **ISL-046 ROUTINEREFUSAL** (medium). The proposal is in its ledger file. Not the constant-false Condition: a
   second refusal would publish `hasError: true` again, which is no change, so it would stay hidden. The D81 drive
   (`packages/nodegx-backend/tests/isl046-d81-routine-dates-drive.test.ts`) already logs the reading. Make it an
   assertion.
4. **ISL-045 INSTANCEROOT and DROPDOWNEMPTYRESET.** Check P107 first: `packages/nodegx-node-spec` had a peer's open
   edits all of s43 (`query-records.ts` was rewritten mid-session, and a build failed on it once).
5. **ISL-046 SECONDVISIT** (low): read the 3D engine on the second visit to the Workshop before choosing a fix.
6. Ask ISL-045's three rulings at the end, in plain words, with what you built beside them.

## Human decisions owed

- **MOVEARROW (asked s42 and s43).** Planning is set aside. Opening a project in it adds a "→ " to the project's
  stored next move every time. Fix the shelved planner now (half a day), or close the bug until Planning comes back?
- **LISTDEFAULTTYPE (asked s43).** A Function output added to its list shows Type "String", but the port is untyped
  until another type is picked. Make it really String (every existing untouched output changes type), or have the
  panel say "Any" until one is picked (nothing saved changes)? Recommended: "Any".
- 🔴 **The working copy's `package-lock.json`** is still the stale 2026-09-24 file that removes
  `@nodegx/node-spec`'s entries. s43 left it alone too.
- **`templates/nightbook/` is untracked** (P78's pile, with its kit and 14 `tpl011*` specs). s43 changed the Date
  picker's source (`Reset`). Nightbook's copy will change the next time its generator runs, and its byte gate will
  then differ in `Coming/Date picker`.
- **Still owed:** `P109-S36-STALEMCPDIST`, the `nodegx` bin rebuild, and s38/s39's list.

## What s43 built (commits)

- **ISL-046:**
  - D81 `37f35c8c4`: the Date picker's `Reset` signal. TPL-008's routine pane sends it when another routine opens.
    The prefab and four templates were regenerated.
  - METERS3D `050ca561b`: `chipLifts`, so the 3D Workshop's chips never cover each other on the first visit.
    `drive-iw007-touch.js` gains METERS.
- **ISL-044:**
  - OGIMAGE `eba414b90`: og:image width and height offer no spacing tokens.
  - NESTEDSIGNAL `c3d6b2f66`: the deploy's wire check runs the runtime port pass to a fixed point.
  - ICONBTN `e76db56b4` and `9b3d1f3a8`: every editor button has an accessible name. A typed `ariaLabel` was added
    and 45 caller files named; the narrow top bar's three buttons were fixed after the editor reading.
  - LONGTOAST `12a971c32`: a toast keeps its title on screen and scrolls its message.
  - SHIFTTAB: re-measured, not a trap. Closed `wontfix` with the reading (`9b3d1f3a8`).
- **Found and filed:**
  - `P109-S43-ROUTINEREFUSAL`: a routine's refusal sentence follows the person to the next routine.
  - `P109-S43-SECONDVISIT`: on the second visit, the 3D Workshop's chips are never measured.

## Gate readings (2026-10-11)

- **Drives (each red on HEAD, green on the fix):**
  - Prefab date picker drive: 34/34.
  - `isl046-d81-routine-dates-drive`: 4/4.
  - `drive-iw007-touch --mode 3d`: 28/31 against HEAD's 27/31. Pip's METERS turned green; BUILD and PAY are red on
    both (`P109-S18-TOUCHBUILD`); Cobble's METERS is SECONDVISIT.
- **noodl-mcp:**
  - TPL-008/010 and settle specs: 262/264. The 2 reds are `cmp004Parts`, red in a clean worktree since P102.
  - `def038SettledTemplates`: 29/31. The 2 reds are Nightbook (untracked) and the training demo (`P109-S6-DEF038`).
  - Kit specs: 143/143.
- **noodl-preview:** GAM-023 8/8, deploy 25/25, on the rebuilt `dist/nodegx-deploy.cjs` (gitignored, rebuilt
  14:32).
- **noodl-editor:** HLT-012/006 36/36, `isl-044` census 3/3.
- **Typecheck:** editor `tsc --noEmit` 0 errors. Core-ui's program has 45 errors that were there before
  (execution-history, graphDiff and the like); none was added.

## What s43 learned

- **A Function never re-runs on an identical value** (DEF-046's `shouldRunOnValueChanged`). A pulse wired into one of
  its inputs lands as `true` then `false` in one pass, so the script cannot see it. Count pulses in a run-wired
  Function (the Date picker's `mounted` and `Reset`).
- **A headless port pass must run to a fixed point.** One pass types a component's outputs before the For Each inside
  it has minted the ports that feed them. In the editor, the runtime re-mints when port types update.
- **A typed prop is the census.** Making `ariaLabel` required when no `label` is drawn made the compiler list all 69
  callers. A spec then covers the one `.jsx` file outside it.
- **Restore HEAD's CSS with an injected style.** On the same page, that is the control for a CSS fix.
- **The 3D overlay caches chip sizes per text,** and on a second visit to the Workshop every chip cached 0 × 0. A
  `ResizeObserver` asking for a frame changed nothing, so it was taken out unproven.
- **An orphaned headless Chrome (a "toy-" profile, no tool in this repo makes one) ran at 300–500% for 25 minutes**
  and pushed the load to 71. A drive died under it on a tap. Read `uptime` and the top processes before trusting a
  red tap.

## Recipes

- **A toast from the page:** `webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { req = r; }])`, then find
  `ToastLayer` in `req.c`. The same reaches `ProjectModel` and `WarningsModel`.
- **Real Tab keys in the editor:** the scratch probe used one CDP WebSocket, `Emulation.setFocusEmulationEnabled`,
  then `Input.dispatchKeyEvent` `rawKeyDown`/`keyUp` with `modifiers: 8` for Shift. Read `document.activeElement`
  after each.
- **The 3D touch drive by hand:** `drive-cg003-pages.js assemble <dir>/project`, `nodegx deploy … --allow-development-engine`,
  `drive-iw007-touch.js <dir>/deploy --project <dir>/project --mode 3d`. About 10 minutes on a quiet box.
- Commit through a temporary index, as before (`GIT_INDEX_FILE`, `read-tree HEAD`, add, commit, then
  `git reset -q -- <exact paths>`).

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged. The older ones are spent.
