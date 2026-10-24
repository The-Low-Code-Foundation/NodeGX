# PLY-008 — The game in Studio, in the conversation

**Phase:** [126](README.md). **Depends on:** lane 3's panel (CCN-001 ✅) for the probe; lane 2's Studio V1 for the rest.

> "With us focussing so much on the NodeGX Studio, I'm worried this game making stuff won't work very well or it won't
> be compatible with how NodeGX Studio renders these kinds of apps. Do we need to consider additions or changes to the
> Studio so people can make games directly inside Claude Desktop and see the progressive results and apply our 'true
> copilot' principle?" — Richard, 2026-10-24

## Step 0: the probe (cheap, and worth running before Studio V1 settles)

Nothing has measured a WebGL scene in Studio, let alone in Studio inside Claude Desktop. Before anything is designed,
open a three-kit project (`dev-docs/parked/three-in-nodes/fixture-game/`, Coin Run's) through `open_studio` in Claude
Desktop and record, for the inline panel, for Full screen and for Open in a window:

1. Does the scene draw at all? The host's sandbox may not pass WebGL, or the nested frame may need a `frameDomains` entry.
2. Do keys reach the game, or does the chat input keep focus?
3. Does a mouse drag orbit the camera? Is pointer lock refused (needed for FPS mouse-look)?
4. The frame rate, read from `requestAnimationFrame` deltas inside the panel, not from a clamped dt.
5. After the agent's next write, does the preview rebuild and **reset the game state**? (Studio's preview builds a new
   frame per update, about 1 s in three-in-nodes s4; the Scene editor avoided that with live `setParameter`.)

Each answer is a row here with the date, and each failure is a `P126-` bug file. If (1) fails inline, the route is the
window, and Studio's game projects open there by default.

## What Studio likely needs (to confirm from the probe, not assume)

- **Play and Edit in the panel.** The world node runs live and gets the keys; Pause is Edit (the three-kit engine already
  has `pause(true)`). HOLD while playing stops the agent and keeps the game where it is.
- **A change keeps the game running.** A parameter change (speed, gravity, a paint) applies to the running world without a
  rebuild, the Scene editor's mechanism. Only a structural change rebuilds.
- **The world's parameters as controls.** A generator's parameters (PLY-003's `entry.json`) appear as live sliders and
  swatches in Studio's inspector. That's what a person tweaks while the agent works, and `what_changed_since` reports it
  back to the agent.
- **A Scene tab.** The three-in-nodes Scene editor (`dev-docs/parked/three-in-nodes/editor/`, s4–s5: picking, the Body
  selection rule, behaviour sentences) as one more Studio view over the same files, not a separate app. (DIRECTION's
  first pillar: an editor for this app is a view over its files.)
- **A burst is a playable step.** For a game, a burst ends when there is something new to play, not after a file write.
  Show before apply = two playable sketches to pick from, inside **one** panel (a third panel starves every panel:
  PUPPY2-THREEPANELS).
- **Evidence the agent can read.** `render_report` on a game returns the drive harness's screenshots at the person's
  pixel ratio and the `see()` reads, within the host's 1 MB answer.

## Acceptance

- **AC1.** The probe's five rows, measured in Claude Desktop, written here, with every failure filed as a bug.
- **AC2.** From the probe, a short list of Studio changes handed to lane 2 as STU rows (in nodegx-studio
  `docs/SCOPE.md`), each naming the probe row it comes from. Lane 2 decides when. This task does not edit Studio.
- **AC3.** Once lane 2 builds them, Richard makes Coin Run's next change in the conversation: he plays, holds, tweaks a
  speed in Studio while the game runs, and the agent carries on from it.
