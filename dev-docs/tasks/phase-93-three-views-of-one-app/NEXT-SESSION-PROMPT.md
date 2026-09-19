# Phase 93 — next session

**Written 2026-09-19, end of session 22.** s1–5 drove TVW-003; s6–11 closed TVW-001; s12–13 closed
TVW-002; s14–17 built and closed TVW-004 (bar Richard's AC6 look) and TVW-005; s18 built and drove
TVW-006 and censused TVW-007; s19 got two rulings and reshaped TVW-008; s20 photographed four
eyebrow placements; s21 built TVW-007's trail and closed AC3 and AC4. **s22 built TVW-007's hover
and its `Edit ›` door — one surface — and closed no AC, because AC2b's criterion is a photograph.**

## The board, re-derived from the task files

| id | task | built | driven |
|---|---|---|---|
| TVW-001 | The panel tells the truth | ✅ | **CLOSED — all 8 ACs** |
| TVW-002 | The preview says what it is not showing | ✅ | **CLOSED — all 7 ACs** |
| TVW-003 | One selection, three surfaces | ✅ | **CLOSED — all 6 ACs** |
| TVW-004 | Layers | ✅ | AC1–5, AC7 green. **AC6's 20 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-005 | Layers can move things | ✅ | **CLOSED — all 6 ACs** |
| TVW-006 | The structure lane | ✅ | AC1–4, AC6 green. **AC5's 18 shots SENT s18 — Richard's verdict is all that is left** |
| TVW-007 | An instance says what it is | ✅ slices 1–3 | **AC2 ✅ AC3 ✅ AC4 ✅.** AC1, AC2b and AC5 all need **one drive** — the script exists and is UNRUN. The 4 placement shots are WITH RICHARD |
| TVW-008 | The board | ✅ slice 1 | Reshaped by R-7. AC8's `test:ci` half green. **Slice 2 is the surface and needs the box** |
| TVW-009 | The words (needs 001, 002, 004) | — | — |
| TVW-010 | The disorientation test (needs all) | — | — |

**ACs closed: 52** (unchanged at s22).

## 🔴 Start here

1. **THREE verdicts are with Richard and nobody else can do any of them**: TVW-004 AC6 (20 shots,
   s18), TVW-006 AC5 (18 shots, s18), TVW-007's four placement shots (s20). The first two close
   their tasks on the spot. **Do not re-send any of them.** No ruling file had landed at s22
   (checked: no `*RULING*` under `dev-docs/` newer than 2026-09-17, and no commit since
   `692b8f0a3` touched one).
2. **🔴 If you can get 9222, DRIVE. TVW-007 is one drive away from three ACs.**
   `node scripts/devtools/drive-tvw007-hover.js` covers AC1's and AC2b's remainder and takes AC5's
   shots. It has **never run** — s22 could not drive — so budget for instrument faults first
   ([[a-new-instruments-first-drive-finds-instrument-faults]]). It refuses on an editor it cannot
   attribute to your own CLI, which is the guard to keep.
3. **If Richard has ruled on the placement**: the winner becomes a constant, `eyebrowPlacement.ts`
   is **deleted** along with the three losing branches in `instanceEyebrow.ts`. 🔴 Do not leave the
   switch standing — a switch that outlives its verdict is a second copy of a decision.
4. **If you cannot drive**, the honest build is **TVW-008 slice 2** (the board's surface) or
   `in 3 places ▾` — §6 measured that **44%** of placed components have two or more parents, so the
   multi-parent case is the ordinary one and the hover card is now the natural place to hang it.
5. 🔴 **Check whose editor is on 9222 before anything.** See below; it has not stopped being true.

## 🔴 What s22 owes the next drive

AC2b was written to be graded **on the rendered surface a person sees, not on the handler firing**,
and s22 could not photograph anything. Three claims are argued and not photographed:

1. **That the card appears at all**, and that its path is at the pixel it is drawn at. The specs
   assert the markup; only `elementFromPoint` on a live canvas says nothing is over it.
2. **That `Edit ›` can be pressed.** The close condition is specified and mutation-tested — the
   card survives `node-leave` for `graceMs: 220` and stays while the pointer is on it — but a real
   pointer crossing 8px of canvas is the only thing that proves the journey works.
3. **That the door passes `viaInstance`.** No spec can reach it (it is an options object inside the
   controller, which needs a renderer). The trail showing a **diamond crumb** after pressing
   `Edit ›` is where it is graded. The drive reads that crumb off the DOM.

Also still owed from s21 and unchanged: `test:ci` for AC6 (a peer held a `dev` stack all session).

## 🔴 The drive hazard, unchanged from s20 and s21

`npm run dev:debug` exiting **144** is the **single-instance lock**, not a launch failure — an
Electron is already on 9222 and it may be a **peer's**. `cdp.js` attaches to whoever holds the port
and never asks whose it is. **Two dev stacks cannot coexist on this checkout** (webpack-dev-server
hardcodes `:8080`), so "start my own on another port" is not available — `NOODLPORT` does not move
webpack.

At s22 there were **six** live Claude CLIs on this box; the editor on 9222 walked (10 PPID hops) to
CLI `21296`, a peer's, which had launched it four minutes before this session began. That is why
s22 did not drive. ⚠️ **Never `dev:stop` a stack you have not attributed** — and note the guard has
to fail CLOSED: an owner you cannot name is not an absent one.

## What s22 built

`canvas/instanceHover.ts` (pure — the close condition as a state machine, the content, the anchor,
the graph→pane transform), `InstanceHoverController.ts` (timer, slot, coordinates; no rules),
`CanvasOverlays/InstanceHoverCard/`, a new `instanceHoverRoot` layer at `INSTANCE_HOVER_Z = 8`, and
wiring in `NodeGraphEditorNode.mouse`, `ViewportActions.setPanAndScale` and `switchToComponent`.

- 🔴 **The door is deliberately NOT painted in the node's top-right.** `NodeGraphEditorNode.ts:263`
  reads that 20×20 rectangle as the **connection-drag zone**; a control there takes the gesture
  away from all 9,634 instance nodes in the corpus, silently. So both the path and the door ride on
  one surface anchored *outside* the card — which also means **the canvas still needs no
  sub-region click dispatch**, and AC2b's warning about building one is discharged rather than
  deferred.
- 🔴 **A DOM overlay above the canvas silences the canvas's own leave event.** A pointer that lands
  on the card stops producing canvas mouse events, so the node's `move-out` never arrives. The
  state machine therefore treats an arrival on either surface as a departure from the other; a
  version that only cleared `overNode` on `node-leave` leaves a card on screen with the pointer
  nowhere near it.
- The card is **screen-space**, not inside `#nodegraph-dom-layer` — that layer carries the pan/zoom
  transform, so a card mounted there would shrink with the graph, and the hover has to stay legible
  at the zooms where the painted count is gated off.
- **Gates**: `tests-unit/tvw-007` **80 specs / 6 suites green**; **16 mutants, 16 killed**;
  `test:main` **520 suites / 8,292 specs, exit 0**; `typecheck:editor` and `:editor-tests` **0**.
  🔴 `test:ci` NOT run.
- ⚠️ **Two mutants survived their first run** because the arm written for each read the same answer
  in both arms — a narrow pane never reaches the alignment guard at all. Both cases were replaced
  with ones where correct and mutant differ.

## Committing

🔴 The working tree carries other sessions' work (P78 TPL-009, P94's Styles panel, P96, P97, P98,
docs). **Commit through a temporary index with a compare-and-swap** — `BASE=$(git rev-parse HEAD)`,
`GIT_INDEX_FILE`, `read-tree $BASE`, stage only your paths (untracked first: a pathspec commit skips
them), `write-tree`, `commit-tree -p $BASE`, `update-ref HEAD $NEW $BASE`. Then refresh the real
index immediately (`git show --name-only --format="" -z HEAD | xargs -0 git reset -q --`) and
confirm `git diff --cached --stat` is empty. This worked cleanly at s21 and s22.

⚠️ `scripts/devtools/` holds peers' untracked drive scripts. Never `git add` that directory; name
your file.
