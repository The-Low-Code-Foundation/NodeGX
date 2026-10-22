# Threadspace — s4: Richard plays s3, then the five undriven rows, cadet mode, the wire

**Written 2026-10-22 at the end of s3.** Read, in order: this file; `README.md` (what is built, the controls, the
architecture, the NodeGX and network plan). Verify a claim here by measuring it, not by trusting it.

## Where it stands

s1 built the prototype (standalone three.js, no bundler). s2 fixed the spawn wall (TS-S2-SHELLFACE). **s3 took Richard's
first real play** (2026-10-22: *"actually a really fucking cool game"*) and his ten points, all done:

| # | Richard's point | s3 | evidence |
|---|---|---|---|
| M1 | inside, W is sometimes forwards, sometimes sideways | a sign error in the walk's rotation (TS-S3-WALKAXES) | smoke: 32 steps × headings, worst dot 1.0 (s2 code: −1) |
| M2 | a third-person view behind the Wren | **V** toggles a chase view, the Wren and the helm | smoke: camera behind and above, body drawn; shots `08b-wren-chase`, `l3` below |
| M3 | cargo only on a space walk? | the Kestrel always scooped within 45 m (nobody knew); now the Wren scoops what she flies through, and a **Tractor beam** upgrade (800 cr) pulls from 250 m with a visible beam; pods are courses Vex flies to; the Meridian core still needs hands | smoke: Wren scoop, core left; stock Kestrel leaves a pod at 200 m, tractor takes it in 2.6 s |
| M4 | NPC approach slows forever | proportional throttle never arrives (TS-S3-CRAWL); braking curve | 700 m → dockable: 54.7 s → 15.3 s |
| M5 | no shields / hull / danger on contacts | bars under every ship's bracket, a threat word vs what you are in, a target card, a Contacts list on the Nav tab | smoke: threat words on the Rooks; shot `l5` (Carrion: DEADLY in the Wren) |
| M6 | can't target for the NPC gunner | Dag fires on **your target**, else the nearest threat; "DAG" over what he is shooting | smoke |
| M7 | click things in 3D like Eve | with the mouse free, a click on a mark selects it (hostile → target, place → course); the captain's chair never takes the mouse (drag orbits); T aims at the crosshair first | smoke: a real pointer event in the chair |
| G1 | "inside a cube" | the sky was a 2048×1024 picture on a sphere: texel lattice + pole fan (TS-S3-SKYGRID); now a nebula from direction, baked per sector to a cube map at infinity, 7,000 round stars, a sun | shots `03-tactical`, `l2` |
| G2 | holes and gaps inside | side-room doorways opened onto 1.5–2 m of space; black ceilings; bare windows (TS-S3-HOLES). Passages, lit ribbed ceilings, framed glass, a 6 m concourse | smoke + boarding probes (s2 code: null) |
| G3 | ships look shitty | lofted chamfered plated hulls (convex, see README), lit windows, plumes that grow with speed, a turning station ring, a segmented gate | shots `02b-turret`, `l3-helm-chase`, `l5-carrion` |

Shots are in `shots/` (gitignored: on this machine only; `l1`–`l6` are s3's look pass, re-shoot with a drive).

**Readings (2026-10-22, end of s3, each drive run alone at `nice 19` against `node server.mjs --port 8795`):**

| drive | reading |
|---|---|
| `tests/smoke.json` | **36 / 36**, exit 0 |
| `tests/boarding.json` | **16 / 16**, exit 0 |
| `tests/eva.json` | **11 / 11**, exit 0 |

`sh tools/run-all.sh` runs all three on :8793. The two new probes (WALKAXES, HOLES) were each run once against s2's
`walk.mjs` / `interiors.mjs` in a scratch copy and **failed there**, then passed on s3's.

**Not observed (all of it needs Richard's screen):** how any of it feels with a mouse and a real GPU (the chase spring,
V, the click radius of 22 px, the drag-orbit); the sky at its real-GPU bake size (1024 a face: headless bakes 128, so every
shot's nebula is blurrier than his) and whether the nebula is now too bright or still too faint (gain 1.6–1.7); the bake's
cost on a sector jump (six passes + PMREM, inside the 1.7 s fade); the threat words' calibration (a rough
time-to-kill ratio, `game.threatOf`); sound.

## What s3 settled

- 🔴 **A check that a probe "hit something within 3 m" passed on an empty view.** `debug.see()` reports a miss as
  `Infinity`, JSON sends it as `null`, `null < 3` is true. Ask `typeof d === 'number'`. **Run every new check once against
  the code it fixes**; it must fail there.
- 🔴 **Placing the Kestrel with `debug.go` after an undock puts her straight below the dock** (she undocks 220 m above it),
  and `lookAt` along a vertical line is degenerate: the autopilot check read 25.7 s, nearly all of it a turn. Start her
  level, nose on (the check does).
- 🔴 **A new window frame put two mullions and a console screen in the helm's view.** The helm's eye is now just behind the
  glass (z −33.15). Any change to the bridge room: re-shoot the helm.
- **Hulls are lofts kept convex**, so a camera inside one (the helm, a boarder) sees out through all of it; the Kestrel's
  shell loft is still on `SHELL_LAYER` for the walking camera.
- s1/s2, still true: entities + seats + controllers; interiors in the host's frame; threads are the float precision fix;
  software GL runs ~8–10 fps (dt clamp 0.1); `stats()` cannot see the view — look at every shot and gate views on `see()`.

## Next, in order

**Rulings owed by Richard (one line each):**
1. Played s3? Do the ten land, and what broke or bored him next? Fix that first.
2. M7: clicking is in. Does he still want the panel as the main way to command, or more in the 3D view (orders on a
   right-click, a radial menu)?
3. The name ("Threadspace" is a working title); where it lives (`dev-docs/parked/` or its own repo); NodeGX now or later.

**An agent can do alone:**
1. **Drive the five rows still built-but-undriven** (README table): courier / capture / raid turn-in; `setPaint` recolouring
   all three hulls (check it on the new `MeshStandardMaterial`s); `hire('moss')` and the marine on a boarding; `canClaim` →
   `claimSector`; the Wren lost.
2. **The panel's tabs overflow**: with a mission count, "WIRE" is cut off at 380 px (shot `07-drift`). Wrap or shorten.
3. **HUD labels overlap** when contacts line up (shot `l4`: the hauler and the gate's labels on top of each other).
4. **The Guild hauler's boarding rooms sit across its containers**, which are boxes that are not convex with the rooms; board
   her and look (no drive boards the hauler).
5. **Cadet mode** (README §For the girls); **the wire** against a NodeGX backend (`net.mjs`); music.

## How to run and drive

```
cd dev-docs/parked/threadspace
npm start                                   # :8787, opens the browser
node server.mjs --port 8795 &               # for drives
nice -n 19 node tools/drive.mjs http://127.0.0.1:8795/ tests/smoke.json shots
sh tools/run-all.sh                         # all three on :8793, exit 1 on any FAIL
```

`window.__game` is the game; `__game.debug.{use, phase, go, credits, killHostiles, assist, stats, see}` are the drive's
shortcuts. Tear the server and Chrome down when a drive ends (shared box).
