# IG-003 — Drive, Teach, Play: try it first, then lock it in

**Opened 2026-09-28**, from README §1 points 2 and 3, rulings R4 and R5. **Status: ⬜ not started.** Depends
on IG-001 (D10 the pad). Lane B.

## 1. The person sentence

> **A child presses Drive and walks the robot around the plot with the pad, trying things, nothing
> remembered. When she has the moves, she presses Teach and does them again; now every press is a block.
> Play runs the blocks. The Predict button is gone; an islander sometimes asks "show me where it stops"
> and says "you were right!"**

## 2. What it is

- **Three states on the bar** (`cg003Components.ts` Workshop): **Drive · Teach · Play · One step · Start over**.
  Drive shows the pad (IG-001 D10's allowed keys) with `record = false`: `RECORD_STEP_SCRIPT` steps the world
  and does not push a block. Teach is today's behaviour. Switching Drive → Teach resets the robot to the
  request's start (the recording must replay from the start, README §1 point 2's trap) and says so in one
  line: "Back to the start. Now show {b} the moves." Play and One step as today. The program panel greys
  while driving.
- **Free play** opens in Drive; a request opens in Drive too, with the islander's card above.
- **Predict, re-entered as a challenge (R5).** The button goes. A request may carry `challenge: 'predict'`;
  on those, when the program is non-empty and unplayed, the islander's card says "Before you press Play,
  tap where {b} will stop." A hit shows "You were right!" with a tick on the tile and then plays; a miss
  shows the flag on the real end tile and the existing `hintPredictMiss`. One step cancels the challenge for
  that run. Two requests carry it: the tulips (band 10–12 only) and one of IG-006's reads.
- **Band 7–9** gets Drive too (it is the free-roaming the younger band wanted); the challenge never shows
  there.

## 3. Acceptance criteria

1. Page drive: in Drive, four pad presses move the robot four tiles and the program stays `[]`; the block
   count reads "0 blocks".
2. Drive → Teach resets the robot to the start; the same four presses record four blocks and the robot is
   at the same end tile as in 1; Play replays from the start and ends there.
3. Teach → Drive keeps the program; driving does not change it; Play still runs it.
4. No `plPredict` in the generated template; on the tulips request at band 10–12 with a program in place the
   challenge line shows; a correct tap shows the tick line then plays; a wrong tap shows the flag and the
   miss hint; at band 7–9 nothing shows.
5. The hint table does not fire on Drive presses (a bump while driving is a bump animation, not a hint);
   the first hint after Teach begins is `hintEmpty` or the pattern hint, never a leftover.
6. Both languages, both sizes, 0 console errors; engine + template gates; byte-identical regeneration.

## 4. How to build it

The mode is one `States` node (`drive | teach | play`) with `useTransitions: false` (P105 trap D49); the pad
gets a `record` input; the Runner's `stop` is called on every transition. The challenge is a flag on the
request, read by Start world and the Owl row.

## 5. Gates

As IG-001 §5; the P105 page-drive wrappers gain the three-state clauses.

## 6. Traps

Teach after a Play used to continue from where the run ended while the recording replayed from the start:
the reset on entering Teach is the fix and the AC. `gardenRun` reset (IG-001 D2) must run on the Drive → Teach
transition too. A `Select` in a Modal closes it (editor-ui pointers): the islander's card is a card, not a
modal.
