# TBM-008 — The wall in three dimensions

**Opened 2026-10-11 (s2)**, from Richard's reading of the s1 prototype: *"so far it's good in theory but the game display
is rubbish so far. can we not make it 3D polygon stuff on a real wall with some basic physics?"*
**Status: 🟢 built and gated, s2 (2026-10-11, Fable): `prototype/check.mjs` PASS ×3 on the 3D wall, the same 29 checks.**
**Model:** either. The scene is a rendering layer under a page whose writes and reads do not change; a wrong reading costs a look, not a file.

## 1. The person sentence

> **A kid sees a brick wall with wooden planks screwed to it, a red dome of a button, a turnstile that spins when a
> marble drops in, a marble that rolls down a sagging rail and a balloon that bursts into shards that bounce on the
> floor — and when they turn the wall over, every plank turns with it and is a NodeGX node.**

## 2. What was built

[`prototype/mur3d.js`](prototype/mur3d.js), imported by the page; nothing the page writes or reads changed. In one
paragraph: WebGL (three 0.177, bundled by `build.sh` into the gitignored `three.js`) draws the room — a brick wall with a
procedural texture, a wooden floor under the lowest part, warm light from the top left that casts shadows — and, for
every part, a wooden plank with a low-poly flat-shaded costume built from primitives (a dome button, a four-armed
turnstile with a digit housing, a slanted ramp with rails and its own marble, a balloon on a string, a cat with ears and
a tail that sits up and opens its eyes, a bulb that glows, a chalkboard in a frame, a drum with sticks, a sign on a
stick, a screen in a bezel, a railway switch with a lever, a mirror). The strings are rails: tubes along a sagging cubic
between a part's handle and the next part's inlet. The part's own DOM element (its two faces, the text widgets, the
lamp, the button a finger or a gate presses) is pinned onto its plank by three's CSS3D renderer with the same camera,
so a part is still one element, `rotateY(180deg)` still turns it, and the gate's `getBoundingClientRect` and
`elementFromPoint` still land on it.

## 3. The physics, and what it is honest about

| thing | model |
|---|---|
| a marble (a signal on a wire) | a bead on its rail: acceleration = −g · tangent.y, a little drag; shot with just enough speed to reach the far end (energy: v₀² = v_min² + 2g · max rise ahead), because the signal did arrive in the running app. It speeds into the sag and slows out of it; it never stalls (floor 90 px/s). |
| a value on a wire | a glow bead at constant speed; no gravity (a number has no weight) |
| the balloon's pop | 16 tetrahedra, ballistic (g = 2400 px/s²), spinning, bouncing on the floor (restitution .45) and the wall (.5), gone after 2.2 s |
| the ramp's marble | constant acceleration over the Timer's own `duration`: x = L · (t / T)² |
| the button | a spring: down in 80 ms, back with overshoot |
| the turnstile | a quarter turn with overshoot on each count |
| the flip | every plank turns π about its vertical axis in .75 s, the same easing as the DOM's transition; the wall's bricks become the editor's dot grid (`look.colors.dark.ground` / `gridDot`) half-way through and the floor goes |

The marble's timing is a show on top of the trace, not a simulation of the graph: the graph's timing is the runtime's
(the Timer's `duration`, the Repeat's `interval`), and the wall only draws what the trace says happened.

## 4. What it keeps

- **The DOM is the truth for input.** Press, drag, drop, select, the connect popup, the panel: unchanged. The front
  face is see-through so the mesh shows; the button's DOM element is a transparent disc over the dome.
- **The costume follows the files and the trace, as before.** `drawPart` tells the scene when a Switch's `state`
  changes (pop / re-inflate, wake / sleep, glow / dark), when a Counter counts (spin), when a Condition's `result`
  changes (lever); `arrived` and `fired` tell it a roll, a beat, a press. A new `metadata.tchac.skin` rebuilds the costume.
- **The camera is the old camera**: `cam = { x, y, z }` is now the editor point at the stage's centre and the zoom
  (1 = one editor pixel per CSS pixel); pan, wheel-zoom at the pointer, pinch and *Tout voir* are rewritten on it;
  `toWall` is one line.

## 5. Acceptance criteria

1. ✅ The gate passes unchanged: `check.mjs` PASS ×3, 29 checks (the press on the costume, the drag from a handle, the
   drop on a plate, the flip's "no element re-made", the back of the turnstile saying *Counter*).
2. ✅ A press pops the balloon into shards that fall to the floor; the next *Tout remettre* re-inflates it; a marble
   rolls along every signal rail the trace reports; a value slides along a data rail (screenshots in the s2 scratchpad).
3. ✅ No console errors or exceptions across the drive, in headless Chrome on SwiftShader (no GPU).
4. 📋 It runs on the Surface Pro (2017): the Intel HD 615 does WebGL 2 in Chrome, but the frame time there is not
   measured. TBM-003's sitting measures it; `renderer.setPixelRatio` is capped at 1.5 and the shadow map halves on a
   machine with ≤ 4 cores.

## 6. Runs

| run (2026-10-11) | result |
|---|---|
| smoke (`scratchpad/smoke.mjs`): open, press, flip | ready 18 / 15 / 16; 16 shards after the pop; 9 wires seen; 0 problems |
| `check.mjs` run 1 | **PASS** (29 checks) — first run on the 3D wall; the gate's rects and drops all landed |
| `check.mjs` runs 2, 3 | **PASS, PASS** |
