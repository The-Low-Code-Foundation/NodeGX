# The Dig

A Minecraft-style first-person dig into an infinite deep, for Richard's own use. Each night Claude plants rooms in
the rock. Each room holds a stone with instructions. Carving an answer wakes a portal to a small secret world made
for that day, with treasure to bring home to a trophy case. It is a parked prototype, not on the board.

## The brief, in Richard's words (2026-10-31)

> "When I first started playing minecraft, the ONLY thing I wanted to do was dig. I wanted to make a tunnel
> downwards, digging knowing that at some point it should open out into a cave … jumping around ledges, seeing the
> deadly casms, seeing monsters on far off parts I better avoid … The journey through an infinite deep was
> captivating. FPS only please … hunting rifle and bow and arrow for fun."

> "Every night Claude Code runs in the background to evaluate my todo list or whatever I've put into the app the
> previous day. It builds a bunch of possible paths for the following day … So when I wake up, I know that Claude
> has been working in secret on things I need to learn, research, reflect on, gratitude time, Headspace time, a walk
> … Then we get back into the game and I start digging."

> "'here are your instructions, if you want to unlock the 'portal' … you need to write an answer to the
> instructions' … it's not the game tricking me with like diamond walls I can't dig through, it's a portal to a
> reward when I've done something."

> "Don't limit it to 15 mins, maybe put a dismissable warning bar up when the player has spent 15, 30, 45 mins in
> the game, yellow, orange, red. But don't punish the player for playing multiple sessions in one day. In fact try
> to not punish in general, just warn."

> "The key to this is Claude running every night and pushing the new stuff to the server for the next day. That's
> the genius 'it's truly new and special' part of it."

Also from that conversation: streaks and points have never motivated him, being told what to do is his kryptonite,
nothing social, iPhone in landscape, and a phone screen has little room for buttons.

## Run it

```sh
npm start          # installs three.js the first time, serves on http://127.0.0.1:8797 and opens it
npm run lan        # the same, reachable from the phone on the same Wi-Fi: open the LAN address it prints in Safari,
                   # then Share → Add to Home Screen for full screen
```

URL switches: `?fresh=1` (a new cave), `?seed=123`, `?peaceful=1` (no crawlers), `?mute=1`, `?lite=1` (a short draw
distance for slow machines), `?date=2026-11-01` (pretend it's that day).

`data/` holds everything personal and is never committed: `plants/<date>.json` (written by the night shift),
`answers.jsonl` (what he carved), `trophies.json`, and `save.json` (the cave, the player, the pack). With no plants
file, the game uses `public/sample-plants.json` and says so.

## What is built (round 1, 2026-10-31)

- **The deep.** 16³ chunks, endless in every direction and downward. Grass, dirt and trees at the surface, then
  stone, then deepstone below 48. There are spaghetti tunnels, caverns that grow commoner and bigger with depth,
  ravines with ledges, and a lava level at the bottom of every 80-block band. You find coal, iron and gravel (which
  gives flint), glow moss and crystals on cave walls deeper down, and the odd supply crate.
- **Light is Minecraft's.** Light levels run 0–15, flood-filled from torches, lava, crystals, glow moss and the sky,
  and are baked into the vertex colours with smooth lighting and ambient occlusion. Caves are dark, so torches
  matter.
- **Hand.** The pick digs (hardness per block) and places torches. Rubble builds bridges. The hunting rifle is a
  bolt action with a scope zoom, and head shots do triple damage. The bow is held to draw; arrows arc, stick in
  walls and can be picked back up. Crafting in the menu: 1 coal makes 4 torches, 1 iron + 1 coal makes 6 rounds,
  1 flint makes 3 arrows.
- **Creatures.** Crawlers keep to the dark and won't walk into bright light, so torches keep them off. Stalkers
  appear below 60. Their eyes glow, so you see them on far ledges first. Bugs, robots and beasts live behind the
  portals.
- **The planted rooms.** One room per plant, placed 18–48 blocks from where you are, in rock beside a cave where
  possible. The rune walls glow, so a crack shows them, and a hum grows as you near a room still waiting for an
  answer. The lectern holds the instructions and the ask. Carving an answer posts it to `/api/answer` and wakes the
  portal.
- **The secret worlds.** Each world is built from the plant's `world`: one of 8 themes, its colours, and 3–6 places
  in a ring (shrine, ruin, a tower with a stair, a research station). Treasure floats at those places, notes sit on
  lecterns, and the enemies are the ones Claude picked. Going back through the return portal ends the session with
  a summary: "Done for now" or "Keep digging".
- **No punishment.** Dying keeps the pack, and you come round at your last torch. Time bars appear at 15, 30 and 45
  minutes (yellow, orange, red); they can be dismissed and never stop the game.
- **The phone (landscape).** Three things are always on screen: the hotbar, Jump, and the menu. Fire and Aim appear
  only with a weapon in hand, and Use only when there is something to read or take. Moving is a floating stick on
  the left half; push it to the rim to run. The right half looks: hold still to dig, tap to place a torch. Craft,
  the trophy case, sound and help live in the menu. The player auto-jumps one-block steps. Panels fit a 390 px
  screen.
- **Desktop.** WASD, Shift to run, Space to jump, the mouse to look (pointer lock). The left button digs or fires;
  the right button places a torch or rubble, or aims the rifle. F places a torch, E uses, 1–4 pick a slot, C
  crafts, T opens the trophy case, Esc pauses.

## The night shift (drafted, not installed)

`tools/nightly-prompt.md` is the brief for `claude -p`. It covers the mix of room kinds, asks that are concrete
plans, honest follow-ups on yesterday's plans with no scolding and no streaks, no invented facts, notes with real
content, and no "should". `tools/nightly.sh` runs it and keeps only a file that passes `tools/check-plants.mjs`.
The server applies the same check, so a broken night falls back to the last good day.

To install it on the nexus VM:
1. Serve the game from the VM over HTTPS (Caddy), so the phone reaches it anywhere.
2. Install and sign in to Claude Code on the VM.
3. Point `TODO_EXPORT` at the todo template's backend.
4. Add the cron line.

## Tests

`sh tools/run-all.sh` starts its own server on 8798 with a throwaway data folder and runs two drives in headless
Chrome (run it outside the Bash sandbox: Chrome cannot start inside it).
- `tests/smoke.json` (desktop): load; dig; find a cave; torchlight; the room and its lectern; carve an answer, which
  reaches the server and wakes the portal; go through to the Paperwork Mesa (2 treasures, robots); take the treasure
  (the trophy case grows); go home (summary); the 15-minute bar; the rifle kills a crawler; save. 13/13 on
  2026-10-31.
- `tests/phone.json` (844 × 390, touch): what is on screen; hold to dig; tap for a torch; walk with the stick; Fire
  and Aim with the rifle; draw and loose the bow; Use at the lectern; the menu. 11/11 on 2026-10-31.

Screenshots land in `shots/` (not committed). Under a loaded machine, software rendering runs at about 3 fps, so the
checks wait on outcomes, not on clocks.

## Product findings

None met: round 1 does not use NodeGX yet (a standalone three.js prototype, like Triage and Threadspace).
