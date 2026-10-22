# Threadspace — s2: Richard plays it, then the loop is tuned, then the NodeGX panel

**Written 2026-10-21 by Fable 5.1, end of s1** (the session that built the prototype from nothing).
Read, in order: this file; `README.md` (what is built, the controls, the architecture, the NodeGX and
network plan). Say "Fable" in your first message. Verify a claim here by measuring it, not by trusting it.

## Where it stands

Built in one session as `dev-docs/parked/threadspace/`, standalone three.js, ~4,500 lines, no bundler.
Richard's ask (verbatim intent): *a prototype with the minimum features to make it fun and cool,
standalone, with the plan to expand it in NodeGX later; the FTL / Gala layout — 3D view left, NodeGX
HUD right; forget multiplayer but plan async multiplayer (own universe, shared factions/claims/news);
FPS boarding "I really want that".* All of that is in, FPS included.

**Built vs. driven, per feature:** the table in `README.md` §"What is built" is the record. Count of
built-but-undriven rows: **6** (Vex flying a set course; courier/capture/raid turn-in; shipyard
upgrades + paint; hiring; claims; the Wren being lost). Each has a code path and a panel button but no
drive step. That is the prototype's real debt.

**Readings (2026-10-21, uncommitted tree at the time of writing; see the commit this file lands in):**

| drive | how | reading |
|---|---|---|
| smoke | `node tools/drive.mjs http://127.0.0.1:8787/ tests/smoke.json shots` (server: `node server.mjs`) | **21 / 21** |
| boarding | `… tests/boarding.json …` | **15 / 15** after the dt clamp went to 0.1 (was 13/15 at 0.05: software GL runs ~8 fps and a 2-s hold did not complete in 5.5 s real) |
| eva | `… tests/eva.json …` | **11 / 11** |
| all three | `sh tools/run-all.sh` | exit 0 |

Gate on exit codes: the drive exits 1 on any FAIL or a timed-out waitFor.

**Not observed:** how it feels with a mouse and a real GPU (headless Chrome grants no pointer lock,
so every drive flew on the arrows and keys); sound; the title screen's Continue; the helm view's prow
and the Wren's nose after the last size change (the shots `02-helm.png`, `08-dogfight.png`,
`b1-airlock.png` in `shots/` are from the run before it — re-shoot).

## What s1 settled

- **Entities, seats, controllers** is the architecture, and it held: every item on Richard's list
  became "the player controller attaches to a different thing". Swapping with crew is swapping which
  seat holds the player (`game.setPhase`, `placeCrew`).
- **Interiors in the host's frame.** A room is a child of the ship; the camera is placed through the
  ship's matrix each frame; exteriors are invisible from inside by back-face culling, so a canopy is a
  gap. No physics engine: circle-vs-box sliding on one floor.
- **Threads are the precision fix.** One sector loaded at a time; a jump is a fade.
- 🔴 **Three visual defects only a screenshot showed:** the Wren's nose cone sat at eye level and
  filled the cockpit (fixed: smaller, lower, eye at y 1.25; body/canopy/engine hidden in cockpit via
  `userData.cockpitHidden`); a prow added "to see the ship from the helm" was 4 m wide at 4 m and filled
  the view (fixed: low and thin); the Star Wars battle station from the copied `space.mjs` was in the
  sky (replaced by a cinder star). **Look at every shot; `stats()` cannot see the view.**
- 🔴 **s2 (2026-10-22): a fourth one, and it was the first thing Richard saw.** New captain → a flat grey wall:
  the hull shell is overlapping boxes, and the bow box's aft face is a *front* face inside the corridor, 1.5 m
  from the spawn. Back-face culling hides only the box you are in. Fix: the five shell meshes are on
  `SHELL_LAYER` and the `walk` camera leaves it off (`ships.mjs`, `game.mjs` frame). The drive now reads the
  view with `__game.debug.see()` (what the centre ray hits); use it for every "what do I see" check.
  Ledger: `dev-docs/bugs/ts-s2-shellface-*.md`.
- 🔴 **s2 (2026-10-22): a fourth one, and it was the first thing Richard saw.** New captain → a flat grey wall:
  the hull shell is overlapping boxes, and the bow box's aft face is a *front* face inside the corridor, 1.5 m
  from the spawn. Back-face culling hides only the box you are in. Fix: the five shell meshes are on
  `SHELL_LAYER` and the `walk` camera leaves it off (`ships.mjs`, `game.mjs` frame). The drive now reads the
  view with `__game.debug.see()` (what the centre ray hits); use it for every "what do I see" check.
  Ledger: `dev-docs/bugs/ts-s2-shellface-*.md`.
- 🔴 **A fighter with a minimum speed cannot hack an airlock.** `speed[0]` 25 → 0 for the Wren, hack
  range 30 → 45 m, and the fighter *latches* to the hull once the hack starts.
- 🔴 **The corvette's turrets killed the Kestrel in 14 s while the drive sat 400 m off** (30 dmg ×2 /
  1.1 s). Now 14 dmg / 1.4 s, and a turret cannot fire at anything within 90 m: *get under her guns* is
  the boarding approach, by design.
- 🔴 **Software GL is ~8–10 fps; a dt clamp of 0.05 made game time run at half speed**, so held-key
  drives walked half the distance and a timed hold never completed. Clamp is 0.1 now; checks still
  allow for it.
- Defenders could see the airlock through doorways as wide as the room: doorways are 2 m now; a
  defender's own body is excluded from its sight ray (`cast(…, ignore)`).
- The `tools/drive.mjs` is the NodeGX Scene editor's, unchanged but for the header; `clickCard` and
  friends reference `__game.screenOf`, which does not exist — unused.

## Next, in order

**Rulings owed by Richard (ask in one line each, at the start):**
1. Did he play it, and what broke or bored him first? Fix that before anything below.
2. The name. "Threadspace" is a working title.
3. Where it lives: stays under `dev-docs/parked/`, or its own repo (it has no NodeGX dependency yet).
4. NodeGX now or later: build the panel as a NodeGX app next (README §Growing it, step 1), or tune
   the standalone loop first.

**An agent can do alone:**
1. **Re-shoot** `02-helm`, `08-dogfight`, `b1-airlock` and look at them (the last nose/prow change
   is unobserved).
2. **Drive the six undriven rows** (README table): Vex flying a course to the station and the dock
   prompt arriving; courier turn-in at the Hollow with the cargo check; `buyUpgrade` + `applyUpgrades`
   changing `ship.*` and the helm's `speedMax`; `setPaint` recolouring all three hulls; `hire('moss')`
   and the marine shooting on a boarding; `canClaim` → `claimSector` → the map shows the captain.
3. **Feel pass on a real GPU** (Richard's screen): mouse gains (`fly.manual` 0.0035, walk 0.0022,
   turret 0.0025), the Wren's turn rate, the Kestrel's; HUD label clutter in the Drift.
4. **Cadet mode** (README §For the girls): a flag in `freshState`, read by `spawnHunters`, `offers`,
   raider damage.
5. **The wire against a NodeGX backend**: implement `net.mjs`'s four calls over the backend's HTTP
   API, keep `LocalNet` as the fallback when there is no backend.
6. Music: `music.mjs` from the map editor is not copied; a track of Richard's in `public/music/`.

## How to run and drive

```
cd dev-docs/parked/threadspace
npm start                                   # :8787, opens the browser
node server.mjs --port 8787 &               # for drives
node tools/drive.mjs http://127.0.0.1:8787/ tests/smoke.json shots
sh tools/run-all.sh                         # all three on :8793, exit 1 on any FAIL
```

`window.__game` is the game; `__game.debug.{use, phase, go, credits, killHostiles, assist, stats}` are
the drive's shortcuts past the walking. Tear the server and Chrome down when a drive ends (shared box).
