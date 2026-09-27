# CMP-004 — Motion: easing and duration

**Opened 2026-09-24.** **Status: ✅ BUILT s1 (2026-09-24): codecs `token-codecs/motion.ts` (AC1 as specs); tiles with curves, Play with two balls, chips + slider + feel line (`MotionComposers.tsx`); rows read *Quick · 150 ms* and *Slows at the end · …* (driven). AC2's motion shots are CMP-007's look.** Depends on CMP-001.

## 1. The person sentence

> **Someone makes their menus feel snappier by picking *Quick* and *Slows at the end*, watching a
> ball do it — and never meets `cubic-bezier`.**

## 2. What to build (mockup: *Easing and duration composers* board, minus the curve handles)

**Easing.** Named curves, each a tile with its curve drawn small: *Steady* (`linear`),
*Speeds up* (`--ease-in`), *Slows at the end* (`--ease-out`), *Smooth both ends* (`--ease-in-out`),
*Bouncy* (`--ease-bounce`) — **exactly** the five defaults' values, and one more (*Natural*,
`cubic-bezier(0.25, 0.1, 0.25, 1)`). A **Play** button runs a ball on this curve beside one at a
steady speed, over half a second so the shape is visible. A value that matches no tile shows as
*"Your own curve"* with its curve drawn, and can be replaced by a tile; its numbers are only
editable as text in this phase.

**Duration.** Chips (*Instant 75 · Quick 150 · Normal 300 · Slow 500 · Leisurely 1000*), a slider
0–1000ms in steps of 25, the number large, a line saying what that speed is good for, and a ball
beside one at 300ms for comparison.

## 3. The codecs

- Easing: `linear`, or `cubic-bezier(a, b, c, d)` in the spacing the defaults use. `ease`,
  `steps()` and keywords → `null` → text mode.
- Duration: `<n>ms`. `s` units → `null` (counted by CMP-006; if common, read and **write back as
  `s`**).

## 4. Acceptance criteria

1. All 5 easing and 8 duration defaults decode and re-encode byte-identical.
2. On a drive: the ball's motion visibly differs between *Steady* and *Bouncy* (two shots mid-play,
   or a frame count). The duration ball visibly takes longer at 1000 than at 150.
3. Apply writes one undo step. The group's rows read *"Quick · 150 ms"* and *"Slows at the end"*.
