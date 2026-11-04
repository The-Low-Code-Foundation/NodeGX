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

Click **New captain**: you start at your locker, dressing your captain (name, skin, hair, eyes, face, jacket, trim; the locker in
your quarters does it again later). **Tab, from anywhere, pauses the game and opens the command map** (below). Click the view to take the mouse (Esc gives it back; the **Release mouse**
button on the Ship tab does too). With the mouse free, a click on a mark in the view **selects** it instead: a hostile
becomes the target (Dag, on the turret, fires on it), anything you can fly to becomes the course (Vex flies it). The
captain's chair never takes the mouse: it is the click-to-command seat.

| where | keys |
|---|---|
| anywhere | **Tab** pauses and opens the command map (Tab, Esc or E goes back exactly where you were) · **P** runs or pauses with the map open · **V** third person / your own eyes |
| the command map | click a contact: "What will Vex do?" — pick who (the Kestrel, or a crewed ship of your fleet), a move (fly to, dock, jump, scoop, attack, keep away, pick me up, follow, hold), a weapons stance for that step (fire at will, return fire, fire on her only, hold fire), then **Do it now** or **Then, after that** (a chain). Spare a hostile so no gun of yours fires on her. Drag orbits, wheel zooms, W A S D pans |
| walking | W A S D · mouse looks · **E** uses what you face · the captain's chair opens the map running |
| the helm / the Wren | mouse or arrows steer · A D roll · W S throttle (or the wheel) · Space / click fires (Wren) · T targets what is under the crosshair, else the next one · **V** chase view / cockpit · E stands up / lands · **J** jumps a thread or docks when in range · the Wren scoops any pod she flies through |
| the turret | mouse aims · click or Space fires · T target · E climbs down |
| the captain's chair (Tab) | click a contact: target it or set a course · drag orbits · wheel zooms · T next target · Tab or E back |
| space walk | W S A D forward/back/sideways · R F up/down · Shift burns · mouse looks · E grabs a pod, goes back in at the Kestrel's airlock, or hacks another hull's airlock |
| boarding | W A S D · mouse aims · click or Space fires (24 rounds) · **R** reloads · hold E at the bridge console to seize her · E at the airlock leaves |

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

## s4 (2026-10-22): Richard's eight

| # | Richard | built | where |
|---|---|---|---|
| 1 | people like people; customise yours; third person | Minecraft-proportioned blocky people (crew, civilian, EVA suit, Rook armour), pixel faces, real elbows and knees, poses (idle, walk/run, sit, console, aim, float, dead, wave); the locker; V wherever you walk, board or space-walk | `people.mjs`, `game.mjs` `dressAvatar` `openWardrobe`, `walk.mjs` `placeCamera(…, third)` |
| 2 | interiors you can recognise | panelled walls and plated decks as textures in metres, a lit sign over every door, consoles with screens; the bridge's wraparound helm, side stations and command dais; the turret's ladder and hatch; the airlock's suits and hazard stripes; your bunk, locker and desk; a new engine room with a reactor; the hold's racks and crane; the bay's marked pad and blast door; the Rook ship grimmer; the concourse with signed kiosks and people. Each room baked to a few dozen meshes | `interiors.mjs`, `decor.mjs` |
| 3 | a taken ship waits for crew to cross over | a kept prize is adrift until someone suits up, goes out of the Kestrel's airlock and jets across (within 1 km), visible in space; recall them the same way; a prize left adrift stays in its sector | `game.mjs` `keepShip` `sendCrew` `recallCrew`, `ai.mjs` `transfers` `follower` |
| 4 | pause, the map, orders, chains; gunner sparing; the Wren | the command map and its card; plans of chained steps with a stance each; the capture target spared by default; no gun fires on the hull you hack or board; the Wren dying ejects you (or strands you aboard) instead of killing you; a new Wren from a yard; "come and pick me up" | `command.mjs`, `orders.mjs`, `game.mjs` `wrenLost` `buyWren` |
| 5 | crew stats | Piloting, Gunnery, Engineering, Combat (1–10); four posts (helm, turret, engines, boarding party), each reading one stat, and the Crew tab says what it comes to in numbers; four new hires (Bram, Tavi at Haven; Juno, Kesh at the Hollow) | `data.mjs` `STATS` `POSTS` `HIRE`, `game.mjs` `crewEffect`, `panel.mjs` `crewCard` |
| 6 | a gun with animations | a first-person rifle drawn in its own pass (never sinks into a wall): sway, walk bob, recoil, muzzle flash, a 1.6 s reload (R, or by itself when empty), equip; defenders and your boarding party hold rifles and aim | `people.mjs` `Viewmodel` `rifle`, `game.mjs` (the second render pass) |
| 7 | the nose floats ahead of the window | an inner bow deck the bridge sees, hidden from outside by the hull (TS-S4-NOSE) | `ships.mjs` `frigate` |
| 8 | stations, asteroids, derelicts | Haven: a lathed hub, a windowed habitat ring with spokes, solar wings, radiators, blinkers, shuttles; Rook's Hollow built into a big rock with a lit cave mouth; seven rock shapes per sector palette with gravel; the Meridian torn open with ribs, cables, embers, a distress beacon and a debris field | `scenery.mjs` |

**Not built:** planetary landing (ruled out for now), multiplayer of any kind (see below), the second
turret seat Ilse's blurb promises, quarters customisation beyond a bed, ship switching to a fleet ship
mid-job, music.

## s5 (2026-10-29): the Shipyard, a model says what you can change

Richard: *"the interior and exterior are still too basic. This is where NodeGX could come in… no matter what we code, we
build in ways to expose parameters to the user and let the user tweak… a ship editor prototype sandbox… you don't build a
three.js app with NodeGX nodes, the 3D game is still going to be a lot of javascript, BUT the code is baked with NodeGX
ethos."* This is PLY-009's step 0 ([phase 126](../../tasks/phase-126-the-play-kit/PLY-009-A-MODEL-SAYS-WHAT-YOU-CAN-CHANGE.md)),
built on the game's own ship rather than an extracted copy.

**Open it:** the **Shipyard** button on the title screen, **Open the shipyard ↗** on the Ship tab (and in a station's yard),
or **http://127.0.0.1:8787/shipyard.html**. Save there, come back to the game's tab, and the Ship tab offers **Refit her
now** (it saves and reloads like Continue: you are back aboard in the same sector). The shipyard's colours win unless the
captain has painted her at a station's paint shop; then that paint stays and the rest of the design changes. (s5's first
cut had no way in from the game, and the game read the design only at load: Richard, *"I can start a new game and edit my
captain, but not the ship."* `tests/refit.json` drives the way in, the refit and the paint rule.) If Save says the server
predates the shipyard, stop `npm start` and start it again: the save endpoint is new.

- **The Kestrel is a model** (`src/models/kestrel.mjs`): 28 named parts (20 outside, 8 rooms) and 79 settings, each with a
  type, a default, a range, a unit and the parts it shapes. `build(values)` makes her; the game and the shipyard call the
  same function, so what the shipyard shows is what the game flies. Her old `frigate()` is gone from `ships.mjs`.
- **The shipyard is built from the declaration** (`src/shipyard.mjs` knows nothing about a Kestrel). Every control in its
  panel comes from `model.settings`; add a setting there and it appears. Click a part to point at it: it is outlined and the
  card lists the settings that shape it. Amber **handles** on the stage are settings made physical (beam, height, nose,
  wing tip, mast, turret): drag one and the value follows, clamped to its range. **Outside**, **Cutaway** (the decks with
  the ceilings off; click a room) and **Stand inside** (ten places the crew stand). Undo, redo, reset, a "changed from the
  model" list with a revert on each row.
- **Checks run on every change**, so a person can't break the game without seeing it: the rooms fit inside the hull, the
  airlock reaches the hull, the drives sit on the stern, the nacelles stand clear, the Wren fits through the bay door.
  Clicking a failing check points at the part.
- **Save** writes only the values that differ from the defaults to `public/ships/kestrel.json` (`server.mjs`
  `POST /api/design/kestrel`). The game reads it when it starts (`src/models/designs.mjs`); a new captain's paint comes from
  it, and a saved game keeps the paint chosen at the paint shop. `?design=default` in the game's URL ignores the file.
- **The gate PLY-009 asked for:** "Check that every setting changes the picture" renders each setting at its two extremes
  from fixed angles and counts the pixels that differ. A setting that changes nothing is inert, and an inert setting
  teaches a person a lie.
- **Less basic, as settings:** a three-tone hull (her back lighter, her belly darker, one shell mesh: `loft` takes a
  material per octagon face), armour plates down her flanks, copper radiator fins aft, surface detail (vents, hatches,
  conduits, sensor domes, antennas; seeded, so a layout can be kept), a livery stripe, her name on both flanks, up to
  three rows of windows, two to four main drives. Inside, every room's walls, deck, accent strip and lamps, and the
  ship's trim, brightness, floor strips and ceiling ribs.
- **Found by the checks on the ship as drawn:** the turret pod's wall comes 0.23 m through her starboard flank
  (TS-S5-TURRETWALL), and the Wren is 11.7 m across against an 8 m bay door (TS-S5-WRENBAY). Both wait on Richard's choice.

## s6 (2026-10-29/30): the animations between seats

Richard, after driving the shipyard (his verdict is in PLY-009): *"maybe some animations would be cool, like getting into
the airlock and alarms going off… an animation to open the wren's cockpit and jump in and it closes and alarms go off and
the hanger opens and you go out… when you approach the kestrel you have to ask to dock first, the hangar doors open, you
have to fly at least to the door and let the animation take over and land you back in the hangar safely and the alarms go
off and you get out."*

- **Out through the airlock** (9 s): you walk to the middle of the airlock and the inner door comes down; a blink and you
  are suited, the visor's rim round the view; the klaxon, red lamps, the hiss and mist streaming to the door,
  "DEPRESSURISING 3·2·1"; the outer door and the hull's own hatch lift, and you drift out into the space walk.
- **Back in** (8 s): you glide in, the doors shut, the air comes back under amber, a chime and "PRESSURE NOMINAL", the
  helmet off, the inner door up.
- **Launch** (14 s, four shots): the canopy lifts on its hinge, a ladder comes out, you climb and drop into the seat, the
  canopy seals. The bay's klaxon and spinning beacons, the Wren's outer wing panels fold up, the blast door parts and her
  stern door opens through a real hole in the hull (the stern is now a plate with the bay's mouth cut out). Through her
  canopy she lifts and slides out, her wings spread, and from off her quarter the doors close behind her.
- **Coming home:** within 1.2 km, **E calls the Kestrel**. Whoever has the helm answers, the bay vents, its lamps flash and
  the doors open; the HUD marks **BAY DOOR · N m**. Fly to the door (within 70 m astern of it) and **the bay's guidance
  takes her**: lines her up, folds her wings, slides her in over the pad, sets her down, shuts the doors, brings the air
  back, and a turntable turns her nose to the door. You climb out and down, and stand facing into the bay with
  **E Climb into the Wren** on offer. Fly more than 1.6 km off and the bay closes again.
- **E (or Tab) skips** any of them and lands in exactly the state the full run ends in: each animation is a `Sequence`
  (`src/sequence.mjs`) of tracks that only *set* state from k (0→1), so a skip runs every track left to its end, and each
  ends in the verb the old instant hand-over used (`setPhase('eva')`, `launch()`, `land()`). `?cine=0` turns them off;
  the old suites run that way.
- **TS-S5-WRENBAY, decided by default:** the Wren's outer wing panels fold up (7.3 m folded against the 8 m door), so the
  shipyard's Wren check passes. Richard can still choose a smaller Wren or a belly bay.
- **The alarm is in the rooms, not a new light:** a room's lamp specs and its ceiling panels turn red, amber or green;
  the light pool is still 8.

**Found by s6's first drive and fixed:**

- 🔴 **An event and a track crossing in one slow frame ran in the wrong order.** The timeline fired every event due, then
  ran every track: the frame that crossed 3.6 s fired "attach to the Wren, sit in her seat", and then the climb's last
  step put your body at its bay-frame coordinates while it was already her child. You rode out 27 m behind her, standing
  in space (s10's picture; no check failed). Now the tracks catch up to each event's time before it fires, and
  `tests/sequences.json` checks you are in her seat as she leaves.
- The landing put you 1.5 m from her flank facing it (the picture was a grey wall), and 4.5 m from her use point, so E
  beside her did nothing: the reach is now 4.8 m and you face into the bay.
- The vent mist drew as hard white squares (a bare `PointsMaterial`); the beacon beams read as sheets of orange paper (a
  flat additive cone; now faded along the beam); the high bay shot looked through a pipe and two gas bottles.

## On nodegx.io (2026-11-04)

The game is live at `nodegx.io/threadspace/`, with a card on `nodegx.io/demos/`. That folder is a COPY: after any change
here, `npm run site:check` says whether the live one is stale (and which files), and `npm run site` rebuilds it into
`nodegx-web/site/threadspace` and prints the push. Built by `tools/build-static.mjs`: root paths made relative, only the four three.js files the game
imports, and each page marked `<html data-static>`, so the shipyard keeps a saved design in the visitor's browser
(`src/models/store.mjs`) instead of posting to `server.mjs`. It ships `public/ships/kestrel.json` as it stands, so visitors
fly Richard's 2026-10-30 design. Rebuild and re-push the folder after any change here. Measured on the copy served from a
subfolder by a plain file server: smoke 38/38; the shipyard drive the same as on `npm start` (TS-S7-YARDSAVE).

## Tests

```
sh tools/run-all.sh        # smoke (38 checks), boarding (20), eva (12), command (27) with ?cine=0, then sequences (31,
                           # the animations on); exit 1 on any FAIL
node tools/drive.mjs http://127.0.0.1:8795/ tests/look.json shots   # the scenery: four screenshots, one check
node tools/drive.mjs http://127.0.0.1:8795/shipyard.html tests/shipyard.json shots   # the shipyard, the save, the game reading it, the gate
node tools/drive.mjs http://127.0.0.1:8795/ tests/refit.json shots            # the way in from the game, Refit her now, the paint rule
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
  `turret`, `tactical` (the chair: the command map, running), `fighter`, `eva`, `board`, `dock`, `jump`, `wardrobe`, `scene` (an
  animation is playing: `game.cine`). The
  command map is an overlay, not a phase: the seat under it keeps its state and gets no input while it is open. Each phase has a controller with
  `frame(input, dt)` and `placeCamera(camera)`. Everything else in the file is the universe ticking:
  missions, standing, trade, the fleet's jobs, docking, jumping, the save.
- **`sequence.mjs`** — `Sequence` (a timeline of tracks, events and camera shots; `skip()` lands where the full run
  lands) and `Tweens` (things that move while you play on, like the bay doors after you call).
- **`cinematics.mjs`** — the four animations: `airlockOut`, `airlockIn`, `launchSequence`, `landSequence`, all in the
  Kestrel's frame, so a ship under way carries them.
- **`world.mjs`** — `Entity` (a thing with a place, a hull, a side) and `World` (the sector: builds it
  from `data.mjs` + a seed, tears it down on a jump).
- **`interiors.mjs`** — rooms built in the *host's* frame (the ship's, the station's). A bridge inside a
  flying frigate stays still under your feet because the camera is placed through the host's matrix each
  frame. Walls are colliders; seats and doors are *interactables* the walk controller offers with E.
  Exterior hulls are invisible from inside (back-face culling), so a window is just a gap in an interior
  wall.
- **`controllers/`** — `walk` (circle-vs-box sliding; the over-the-shoulder camera pulled in by the walls), `fly`
  (pitch/yaw/roll/throttle, also the autopilot's hands, which take the pilot's turn rate and braking), `turret`, `eva`,
  `board` (walk + rifle + defenders + your boarding party).
- **`orders.mjs`** — plans: for each of your ships a list of steps (a move and an optional weapons stance), flown by `drive`
  and shot by `prey`; the spared set. **`command.mjs`** — the command map (pause, camera, the card). The card is DOM over
  state and verbs, like the panel: the NodeGX seam.
- **`people.mjs`** — the blocky people, their poses, the rifle and the first-person viewmodel. **`decor.mjs`** — wall and deck
  textures, signs, screens, `bake` (merges a room's still meshes per material). **`scenery.mjs`** — stations, the asteroid
  fields, the derelict, each merged into a handful of meshes, their lamps blinking in one Points cloud.
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
