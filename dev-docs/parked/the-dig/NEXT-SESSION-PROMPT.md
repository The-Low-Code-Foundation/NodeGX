# The Dig: next session

Read `README.md` here first (the brief in Richard's words, what is built, the tests). The memory
`richards-motivation-app` holds why this exists and his rulings. Keep his tone rules: no streaks, no points, no
"should", nothing social, warn but never punish.

## Where it stands (2026-10-31, round 1)

The game is playable on the desktop and the iPhone (landscape): dig, light, ore, caverns, ravines, lava, crawlers and
stalkers, the rifle and the bow, crafting, the planted rooms, carving an answer to wake the portal, secret worlds
from the plant, the trophy case, the time bars, and saving to the server. Drives: smoke 13/13, phone 11/11
(`sh tools/run-all.sh`, outside the Bash sandbox). The night shift is drafted (`tools/nightly-prompt.md`,
`tools/nightly.sh`, `tools/check-plants.mjs`) but **not installed**. Today's rooms are the samples.

## Next, in order

1. **Richard plays it on his iPhone** (`npm run lan`, then Safari at the LAN address, Add to Home Screen). Write his
   reactions into the README the same day, verbatim. Sensitivity, the stick, the dig gesture, the darkness, the
   secret worlds' feel.
2. **Put it on the nexus VM** behind Caddy (HTTPS), so the phone reaches it from anywhere. Ask Richard before
   pushing anything to the VM.
3. **Install the night shift there**: Claude Code on the VM, `TODO_EXPORT` pointed at the todo template's
   backend (TPL-008's Projects tab holds each project's next move), the cron line. Do a first manual run with him
   watching the file it writes. He may want a `data/life.md` of standing facts in his own words.
4. Later, from his play: an honest check-in room after a planned time (the prompt asks for it; the game shows it
   as an ordinary room), the real dig log (photos and what moved in the real cave), sounds from files instead of
   synthesis, and a NodeGX side (the trophy case and the answers as a NodeGX app).

## Traps met

- Headless Chrome throttles requestAnimationFrame between inputs and runs software GL at about 3 fps under load:
  wait on outcomes (`waitFor`), never a fixed `wait` before a check.
- The drive's evals share one global scope: wrap any `const` in `{ … }`.
- A paused frame must still put the camera on the player (`player.place()`), or a jump between worlds shows the old
  world from the old place.
- A fog set for the cave makes open country vanish at the far edge: push fog out above ground.

## Product findings

None met (no NodeGX in round 1).
