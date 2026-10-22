# Threadspace

A space game prototype, standalone, in three.js. You own a frigate, the **Kestrel**. You can walk her
decks, sit at her helm, climb into her turret, launch her one fighter (the **Wren**) from the bay and
fly it, step out of her airlock in a suit, and board a pirate corvette through its belly airlock with a
rifle. Two crew fly and shoot for you when you are not in the seat. Stations have a mission board, a
market, a shipyard and a bar. Three sectors hang off each other by **threads**: mapped wormholes, one
gate each, a loading screen dressed as lore.

The screen is the one Richard described: **the 3D view on the left, a NodeGX-style panel on the right**.
The panel changes with where you are (ship, nav, crew, missions, fleet, the wire; the station's board,
trade, yard; the boarding status). Everything on it reads one state object and calls one set of verbs,
and nothing on it touches three.js. That panel is the seam where NodeGX comes in (see **Growing it**).

Working title. Rename at will.

## Run it

```
cd dev-docs/parked/threadspace
npm start            # installs three.js on first run, serves on :8787, opens the browser
```

Click **New captain**. Click the view to take the mouse (Esc gives it back; the **Release mouse**
button on the Ship tab does too). With the mouse free, a click on a mark in the view **selects** it instead: a hostile
becomes the target (Dag, on the turret, fires on it), anything you can fly to becomes the course (Vex flies it). The
captain's chair never takes the mouse: it is the click-to-command seat.

| where | keys |
|---|---|
| walking | W A S D · mouse looks · **E** uses what you face · Tab is the captain's chair |
| the helm / the Wren | mouse or arrows steer · A D roll · W S throttle (or the wheel) · Space / click fires (Wren) · T targets what is under the crosshair, else the next one · **V** chase view / cockpit · E stands up / lands · **J** jumps a thread or docks when in range · the Wren scoops any pod she flies through |
| the turret | mouse aims · click or Space fires · T target · E climbs down |
| the captain's chair (Tab) | click a contact: target it or set a course · drag orbits · wheel zooms · T next target · Tab or E back |
| space walk | W S A D forward/back/sideways · R F up/down · Shift burns · mouse looks · E grabs a pod, goes back in at the Kestrel's airlock, or hacks another hull's airlock |
| boarding | W A S D · mouse aims · click or Space fires · hold E at the bridge console to seize her · E at the airlock leaves |

**The loop, in one sitting (10–15 min):** walk to the helm, fly to Haven Station (J to dock), take the
bounty, buy medicine, undock, J at the gate to the Drift, walk aft to the bay, E into the Wren, kill
three Rooks, land astern of the Kestrel, jump to Cinder Reach, hack the Carrion's belly airlock from the
Wren, clear four defenders, hold E on her bridge, keep her, send her on a patrol, space-walk to the
Meridian's data core, dock back at Haven and turn it all in.

## What is built (all of it driven headless, 2026-10-21)

| feature | where | state |
|---|---|---|
| Frigate with a walkable interior: bridge, corridor, turret pod, airlock, quarters, hold (one crate per cargo unit), bay | `interiors.mjs` `frigateInterior` | driven |
| Seats: helm, turret, captain's chair (orbit view), fighter, airlock (space walk) | `game.mjs` `setPhase`, `controllers/` | driven |
| Flight model shared by the helm and the Wren; autopilot (`toward`, `hold`) | `controllers/fly.mjs` | driven |
| Crew: Vex flies the course you set (or holds) on a braking curve; Dag works the turret on your target, or the nearest threat; you swap in and out by sitting | `ai.mjs` `crew`, `game.mjs` `setCrew` `navStop` | driven (s3: Vex's course to the dock, 15 s from 700 m; Dag on your target) |
| Contacts: hull and shield bars and a threat word (LOW · MEDIUM · HIGH · DEADLY, against what you are in) on every ship's bracket; a target card; the Nav tab's Contacts list with Target buttons; click a mark to select; T aims at the crosshair | `hud.mjs`, `game.mjs` `select` `press` `threatOf`, `panel.mjs` `contacts` | driven (s3) |
| Chase view (V) for the Wren and the helm, on a soft spring | `game.mjs` `chaseCamera` | driven (s3, the Wren) |
| Pods: the Kestrel scoops within 45 m, the Wren anything she flies through, the tractor beam (yard, 800 cr) pulls from 250 m; the Meridian's core needs a space walk | `game.mjs` `tractor` `scoop`, `space.mjs` `beams` | driven (s3) |
| Rooks that hunt the thing you are in, break off close, lead their shots; the Carrion's turrets; the Guild hauler on its lane | `ai.mjs` | driven |
| Bolts with a per-step hull test, bursts, shards | `combat.mjs` | driven |
| Launch and land the Wren; the Wren lost → medbay, 300 cr | `game.mjs` `launch` `land` `wrenLost` | driven / built |
| Docking: concourse with kiosks (board, trader, yard, bar) you walk to; the Kestrel parked outside the window | `interiors.mjs` `concourseInterior` | driven |
| Missions: bounty, courier ×2, salvage (space walk), capture (boarding), raid (the hauler) | `data.mjs` `MISSIONS`, `game.mjs` `offers`…`turnIn` | bounty + salvage driven; courier/capture/raid built |
| Standing with Concord, Rooks, Guild; hunters jump in when a faction hates you; Concord confiscates contraband | `game.mjs` `hostile` `spawnHunters` `confiscate` | driven (hunters) / built |
| Trade: 4 goods, prices per station, contraband only at the Hollow | `panel.mjs` `tab_trade` | driven |
| Shipyard: repairs, 9 upgrades (shields, drive, turret, racks, tractor, cannons, hull, rifle, armour), hull paint, engine/cannon colour | `data.mjs` `UPGRADES` `PAINTS` | built (the tractor: driven) |
| Hire: Ilse (gunner), Moss (marine who boards with you and shoots) | `data.mjs` `HIRE`, `board.mjs` `marineFrame` | built |
| Boarding: hack bar at the airlock, the Wren latches to the hull, FPS inside with 4 defenders (line of sight by ray, strafe, hitscan), seize the bridge, keep or scuttle | `controllers/board.mjs`, `game.mjs` `board`…`scuttleShip` | driven |
| Fleet: a kept ship follows and shoots; orders Follow / Hold / Patrol (2 min) / Trade run (3 min) with real-time timers that survive saves | `ai.mjs` `follower`, `game.mjs` `fleetOrder` `fleetJobs` | driven |
| Space walk: 6-DoF pack, 3 min of air, grab pods, hack an airlock from outside | `controllers/eva.mjs` | driven |
| Threads: gates on a ring, J jumps, arrival at the matching gate; a map on the Nav tab | `world.mjs` `load`, `panel.mjs` `threadMap` | driven |
| Claims: lay claim to a cleared sector with a fleet ship present (2,000 cr) | `game.mjs` `claimSector`, `net.mjs` | built |
| Save to localStorage on dock and jump; Continue on the title | `game.mjs` `save` `load` | driven |
| Sound: synthesised blasters, turbolasers, booms, hits (from the X-wing demo) | `sfx.mjs` | built |
| The look (s3): lofted, chamfered, plated hulls with lit windows and plumes that grow with speed; a nebula sky per sector baked to a cube map at infinity, 7,000 round stars, a sun; framed windows, passages between rooms, lit ceilings | `ships.mjs` `loft`, `space.mjs`, `interiors.mjs` | read from the shots |

**Not built:** planetary landing (ruled out for now), multiplayer of any kind (see below), the second
turret seat Ilse's blurb promises, quarters customisation beyond a bed, ship switching to a fleet ship
mid-job, music.

## Tests

```
sh tools/run-all.sh        # smoke (37 checks), boarding (18), eva (11); exit 1 on any FAIL
```

Each drive runs the real page in headless Chrome on software GL and gates on `__game.stats()` and, where
the question is what you *see*, on `__game.debug.see()`: what the camera's centre ray lands on, through the
camera's own layers (distance, colour, geometry). Screenshots land in `shots/`; look at every one — s1's
`01-bridge.png` was a flat grey wall (the hull's own bow block in the corridor, TS-S2-SHELLFACE) and 21/21 passed. Software GL runs at ~8–10 fps, so held-key distances in a drive are
shorter than on a real GPU; the checks allow for it. A drive does not test the mouse (headless Chrome
grants no pointer lock), nor how it feels.

🔴 **`see()` reports a miss as `dist: Infinity`, which JSON sends as `null`, and `null < 3` is true.** A check that
asks "is something within 3 m" must ask `typeof d === 'number' && d < 3`, or it passes on an empty view (s3: the first
TS-S3-HOLES check passed on the broken code). Every new check was run once against the code it fixes, and failed there.

## How it is put together

`public/src/`:

- **`game.mjs`** — one state machine over the *seats*. `phase` is where you are: `walk`, `helm`,
  `turret`, `tactical`, `fighter`, `eva`, `board`, `dock`, `jump`. Each phase has a controller with
  `frame(input, dt)` and `placeCamera(camera)`. Everything else in the file is the universe ticking:
  missions, standing, trade, the fleet's jobs, docking, jumping, the save.
- **`world.mjs`** — `Entity` (a thing with a place, a hull, a side) and `World` (the sector: builds it
  from `data.mjs` + a seed, tears it down on a jump).
- **`interiors.mjs`** — rooms built in the *host's* frame (the ship's, the station's). A bridge inside a
  flying frigate stays still under your feet because the camera is placed through the host's matrix each
  frame. Walls are colliders; seats and doors are *interactables* the walk controller offers with E.
  Exterior hulls are invisible from inside (back-face culling), so a window is just a gap in an interior
  wall.
- **`controllers/`** — `walk` (circle-vs-box sliding), `fly` (pitch/yaw/roll/throttle, also the
  autopilot's hands), `turret`, `eva`, `board` (walk + rifle + defenders), `tactical` (orbit).
- **`ai.mjs`** — raiders, the corvette, the hauler, followers, and your own crew.
- **`combat.mjs`** — a pool of bolts, each stepped and tested against every live entity not on its
  side (coarse sphere, then the hull's box in its own frame).
- **`hud.mjs`** — the 2D overlay: brackets, diamonds, lead points, bars.
- **`panel.mjs`** — the right-hand panel. DOM only. Reads `game.state`, calls `game.*` verbs.
- **`data.mjs`** — factions, sectors and threads, goods and prices, ship classes, upgrades, paints,
  crew for hire, mission templates, fleet jobs.
- **`net.mjs`** — the network seam (below). Local stand-in.
- **`ships.mjs`** — the hulls. Big shapes are `loft`s through chamfered octagons, kept **convex** (each step in width and
  height smaller than the last toward the ends): a camera inside a convex hull sees every face from behind, so the helm's
  eye inside the bow and a boarder inside the Carrion see out through her. A non-convex hull would put one of its own faces
  in your view (that was TS-S2-SHELLFACE).
- **`lights.mjs`** — a fixed pool of 8 point lights moved each frame onto the room lights nearest you, in only the rooms
  you are in. Interiors say where their lights are; they never own a `PointLight`. Every point light in a three.js scene
  costs every lit pixel, seen or not, and changing their number recompiles every material (TS-S3-BOARDFPS: 19 lights
  aboard the hauler, a third of the frame rate). Also in the frame: the Kestrel's decks are drawn only while you walk them,
  a boarded hull's outside is hidden while you are in it, and the pixel ratio steps down when frames run slow.
- **`space.mjs`** — the sky: a nebula computed from direction and baked to a cube map per sector (`setSector`), stars,
  the sun, planets, dust, the tractor's beams. **`sfx.mjs`** — synthesised sound.

## Growing it

### Into NodeGX

The split is already drawn: **the panel is the NodeGX app; the 3D view is the engine.**

1. **The panel is a NodeGX app.** `panel.mjs` reads one object (`game.state` + a few live numbers)
   and calls verbs (`accept`, `buy`, `setCrew`, `fleetOrder`, `jump`, `dock`, `keepShip`…). A NodeGX app
   with the same tabs gets the state as a page object and sends the verbs as signals, through the
   iframe/postMessage bridge or by embedding the engine canvas as a three-kit Scene. The FTL-like layout
   is the app's own page.
2. **`data.mjs` is the backend.** Factions, sectors, stations, goods, missions, upgrades, crew for
   hire and fleet jobs are rows. Move them to NodeGX collections; the station's board becomes a query.
   Mission state and the save (`game.state`) become the captain's record.
3. **`net.mjs` is the wire.** See the next section: the first real backend call.
4. The 3D half stays as it is, or its ship-builders become three-kit nodes later (Body, Camera, Keys
   already exist in `three-in-nodes`).

### Asynchronous multiplayer (planned, not built)

The design Richard asked for: every captain plays in their own universe; no live ships from other
players; but you are not alone. What crosses the network is **news, claims and factions**, through
`net.mjs`:

| call | meaning | backend |
|---|---|---|
| `post(captain, text, kind)` | something worth telling: a capture, a kill streak, a claim | `posts` collection |
| `feed(limit)` | the wire on the bar and the Wire tab | query, newest first |
| `claims()` / `claim(sector, captain, faction)` | who holds each sector; newest claim wins, another captain can take it back | `claims` collection, one row per sector |
| (next) `faction(create/join)`, `bounty(post/take)`, `share(loot)` | player factions with shared standing, bounties on each other's heads, loot split between members | `factions`, `bounties`, `ledger` |

The local stand-in keeps the wire in localStorage, so the game is already written against the
interface; a NodeGX backend replaces one file. Other captains' ships could appear as *fleet ships on
jobs* in your universe (a hauler "run by Captain Okafor", AI-flown), which is how a universe feels
inhabited without netcode.

### For the girls

A **cadet** setting: start in the Wren with a courier job, no boarding offers, no pirate board at the
Hollow, Rooks with half the damage. A difficulty setting, not a separate game. Not built.

## Credits

The flight model, HUD brackets, synthesised sound and starfield come from the X-wing cockpit in the
NodeGX map editor (`dev-docs/tasks/phase-112-your-own-nodegx/own-008/map/editor/public/pilot.mjs`
and friends), rewritten for a ship you can stand up in.
