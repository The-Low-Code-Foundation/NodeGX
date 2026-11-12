# PLY-002 — The starter and the harness

**Phase:** [126](README.md). **Depends on:** PLY-001.

## What

`npx @nodegx/play new <name>` writes a game that runs, in the shape that held up in Threadspace and the Gala:

- `src/engine.js`: pure state and rules, no three.js, testable in node (the Gala's engine; Squirm's stub-DOM run caught
  a balance bug in seconds)
- `src/world.js`: the scene, camera, light pool, dt clamp, resize at the device's pixel ratio
- `src/panel.js`: DOM over `game.state` plus verbs, the right-hand column (FTL / Gala layout). This is the seam
  PLY-005 replaces with NodeGX
- `src/data.js`: rows, the shape a backend would hold
- three.js vendored (a pinned version, no bundler, ES modules), `npm start`
- `tools/drive.mjs` and `tests/smoke.json`: the harness from three-in-nodes s5 (`expect`, exit 1, stuck guard),
  software WebGL flags, screenshots at a configurable pixel ratio and window size, `__game.debug.see()` and
  `__game.debug.state()`
- `tools/assemble.mjs`: one self-contained HTML file for an Artifact or a static site (Squirm's)

It starts on a playable scene: a person, a floor, one thing to do, the panel showing it. It never starts on an empty
canvas (CANON §6, applied to the starter).

## Acceptance

- **AC1.** `new` → `npm start` → a controllable person on screen, from a clean folder, with no network after install.
- **AC2.** `npm test` runs the smoke drive. It goes red when the camera is pointed at a wall (the SHELLFACE shape),
  showing that the `see()` gate grades what is on screen.
- **AC3.** The drive runs at pixel ratio 2 by default, and a canvas sized only by `inset: 0` fails it.
- **AC4.** `assemble` gives one HTML file that runs offline in a browser.
