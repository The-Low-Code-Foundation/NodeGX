# IW-007 — Building and animals

**Opened 2026-09-29** from README §0 ("the more they drop the resources the more the house pops up … a robot spa or an
animal refuge … buy a sheep and a rabbit … task a robot with collecting food and feeding them"). **Status: ⬜.**
Depends on IW-005 (seek), IW-006 (the shop). Lane B or E.

## 1. The person sentence

> **She buys the robot spa, drops its ghost on her free land, and teaches Cobble to carry stones and a new robot to
> carry planks. Each drop raises a wall a little; the robot that brings the last plank finishes it with a puff. Then
> the refuge, then a rabbit, then a robot whose job is to bring the rabbit carrots.**

## 2. What it is

- **Free land:** plots on the island that belong to no islander (today free play's plot + new ones, IW-008).
- **Blueprints:** a building = a footprint, a list of materials `{stone: 20, plank: 10}`, 3–5 build stages. Placed as a
  ghost; the site is a `site` thing (IW-002) with a meter per material; each `put` adds; each stage shows at its share.
- **Materials:** stones (rock, IW-002), planks (a tree source: `chop` gives a log, the saw bench turns logs into planks
  — or planks direct from the tree for band 1), carrots (a veg patch Pip waters, which grows carrots).
- **Buildings do something:** the spa (robots walk there when a job is done — a place to "come home" to); the refuge
  (unlocks animals); a bridge (opens a plot); a bench (an islander sits there).
- **Animals:** bought after the refuge; each has a bowl (a container) that empties on wear; feeding it is a job with a
  source (the carrot patch / the grain sack) — the feeding robot is taught like any other. A fed animal is happy (an
  animation) and sometimes gives something (wool, an egg). A hungry one just waits; nothing dies (R2).
- **Juice:** each stage rises with a pop and dust; the last piece plays a small tune; the islander comes to see.

## 3. Acceptance criteria

1. A blueprint bought, placed on free land (a legal footprint only), built by two robots with two materials; each
   stage drawn in 2D and 3D; the last drop finishes it.
2. The refuge unlocks Animals in the shop; a rabbit bought; a feeding job taught and pinned; the bowl empties on wear
   and the robot refills it.
3. A building never un-builds; an animal never leaves or dies (R2, README §8).
4. Island drives 2D + 3D; the frame gate re-read with two buildings and two animals.

## 4. Notes

(empty)

### Session 5 (2026-10-01, lane A `iw007-animals`, base `b40be26c8`) — the animals (AC2, AC3 for animals, AC4's frame gate)

**Built** (new files `packages/noodl-mcp/tests/iw007Animals.ts`, `iw007Animals.test.ts`, `scripts/devtools/drive-iw007-animals.js`;
hunks elsewhere each under `// P108 IW-007 (lane A): …`; lane B's land plumbing `b37112fdb` merged in at `ab100d31c`):

- **The Animals tab** (`IW7A_SHOP_SHARED`, appended to iw006Shop's shared script; hunks in `shShows`, the rows' `later`, the
  card's animal branch and bought line, Buy's default name): shut — "Build the refuge first: your animals will live there."
  and nothing to buy — until a refuge on her land is FINISHED (`buildingDone`, the same test `buyItem` makes for `refuge`);
  then the rabbit and the sheep. The purchase card has the copy's name box; an empty box takes the default name the box
  shows (Hazel / Noisette, Cloud / Nuage — numbered only when one of hers already wears it); a full pen says "Every place
  in the refuge’s pen is taken." and has no Buy; after Buy the card says "{name} is waiting by her bowl on your land. A
  robot can bring her carrots!" (his, for the sheep). Buy is `Logic/Buy` → `buyItem` (the one place spent rises).
- **Her by her bowl, in both kits** (garden-kit `petEls` / `patchEls`, garden-3d-kit `THING_BUILDERS.bowl` wrapped and
  `THING_BUILDERS.patch`; built files committed): fed (count > 0) she stands, happy — 2D a small hop now and then (CSS,
  stilled for reduced motion), 3D a hop when a carrot lands (one shot: a still scene still draws nothing); hungry (0) she
  sits by her bowl and waits (ears laid back, eyes on the bowl — never sad), never gone (R2). Rabbit: fur, long ears, a
  white tail; sheep: wool, a dark face, legs when standing, lying in his wool when waiting. Her name a pill (2D in the
  cell; 3D in the overlay, `.gd3-pet`). Her bowl's meter in carrots (`2/3`, a carrot icon, the island's bar orange). On
  the island (a wide world) she is drawn about two tiles tall. `petMood` on both job looks, pinned equal.
- **The carrot patch** drawn by what is left (four places; used up, bare soil with a sprout in each — it regrows), its
  meter left/max in carrots; **a carried carrot** on a robot's back (2D load sprite, 3D cone + leaves).
- **Draw world** (the page script between the island and the kits): an animal's bowl now reaches the kits with `animal`
  and `name` (the job fields alone dropped them — the kits drew a plain bowl), the patch with its `left` (it was dropped).
- **The drawer's "go to nearest"** lists the carrot patch and the tree (blocks.js `SEEK_KINDS`, words `iw7aK_patch`,
  `iw7aK_tree` — the node's own fallback kept apart from its iw4 table, which the page's must mirror).
- **Feeding**: taught as any job — `until [her bowl] is full { go to nearest 🥕 patch, pick up, go to [her bowl], put down }`;
  pinned on the land (`plots.land`) it fills her bowl on the island's tick, wear (WEAR.bowl) takes a carrot, the robot
  goes back. Lane B's plumbing carries it (the island, the keep); this lane adds nothing to the tick.

**Readings** (worktree at `87f677253`, lane B's plumbing `b37112fdb` merged; spec files one at a time; drives on ONE deploy
made by `drives/drive-all.sh island island-3d shop kit2d kit3d animals animals-3d animals-perf`; every exit 0):

| gate | total | previous |
|---|---|---|
| `iw007Animals.test.ts` (NEW) | **22 / 22** (shelf, card, Buy, name, pen; feeding fills · wear empties · fills again · never removed · the keep; both kits from engine worlds; the island through Read family → Island world → tick → Draw world → kit; the drawer through a real Blockly; 6 arms) | — |
| `iw007Build.test.ts` | **22 / 22** — `[A]` 2/2 (green with lane B's plumbing alone; this lane's code is not what they grade — the drawing, the tab and the drive are) | 18 + 4 red on the base |
| cg002Engine 259 · cg003Template 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · cg001GardenKit 57 · ig007Garden3d 50 · iw004Blocks 59 · p108s2Join 4 · iw003Missions 63 · iw006Save 17 · iw006Earn 34 · iw006Shop 34 · iw008Crew 25 · iwLook 15 · p108s4Join 3 · iw007Building 13 | all exit 0 | the base's (iw007Building is lane B's) |
| shell `node --test` | 92 / 92 | 92 |
| `npm run template:garden` | exit 0, 0 drift (committed with the source) | 0 |
| page drive (`--mockup`) | **331 / 331** | 331 |
| `drive-iw007-animals.js` 2D (NEW) | **16 / 16** | — |
| `drive-iw007-animals.js --mode 3d` | **4 / 4** (this run: Garden 3D drew her pill "Flopsy · waiting", then Too Slow handed the island to the flat one, where she turned happy; the run before: waiting → happy in Garden 3D itself) | — |
| `drive-iw007-animals.js --perf` (AC4) | **5 / 5** — p95 **16.7 ms** at CPU ×4 (×4.1 measured), 1199 frames, max 33.4 ms, 0 over 50, 22 robot moves in 20 s; her land with the spa and the refuge finished, a rabbit and a sheep, Cobble feeding there beside Pip on the tulips | s4: 16.7 ms (the crew at its cap) |
| island 2D `--perf` · 3D | 69/69 · 5/5 | 69 · 5 |
| shop | 60/60 (its Animals TAB half now expects the shut line) | 60 |
| kit fixtures 2D · 3D | **46/46** · **32/32** (+2 each: lane A's clauses) | 44 · 30 |

FEED / WEAR, recorded on her tile by a MutationObserver from the island's start (1368 EN): 0/3 waiting → 7.8 s 1/3 happy →
16.6 s 2/3 → 25.4 s 3/3 → 47.0 s 2/3 (wear: WEAR.bowl = 60 ticks ≈ 46 s) → 55.0 s 3/3 (the robot went back); every record
has her (never GONE), only "waiting" or "happy". RELOAD: the store's land kept "Flopsy" the rabbit, `fed` 2 (see below).

Screenshots looked at (`iw007-animals-scratch/drives/pages/animals`, `…/animals-perf`, `…/animals-3d`, `…/kit2d/shots`,
`…/kit3d/shots`): `iw7a-1368-en-05-land` (3× close-up: she sits by her empty blue bowl at the refuge's pen, ears back, her
pill "Flopsy", the patch with its carrots and its orange bar, the rock); `iw7a-390-fr-05-land` ("Noisette", the default
name, the same); `iw7a-1368-en-04-bought` (the card: "Flopsy is waiting by her bowl on your land. A robot can bring her
carrots!", Not now, no Buy); `iw7a-390-fr-01-shut` (« Construis d’abord le refuge : tes animaux y vivront. », the five
chips wrapping); `iw7a-perf-land-1368` (the rabbit and the sheep side by side, two bowls, the names staggered, Cobble at
work); `iw7a-2d-rabbit-0/3`, `iw7a-2d-sheep-0/4` (sitting · standing with carrots heaped in the bowl, the meter 0/3 →
3/3 green); `iw7a-3d-rabbit-0/3`, `iw7a-3d-sheep-0/4` (in the round, her pill in the overlay, the chip in carrots);
`iw7a-3d-island-first` (the 3D island, "Flopsy" on her land). Two looks changed what was built: on the island she was a
13 px speck (now about two tiles tall), and the two pen names overlapped (now staggered); in 3D she was a third of a
robot's height (now half as big again).

**Not done, and why**
- **The feeding job taught in the Workshop on the land** by the drive: the drive SEEDS the pin (`plots.land = { program,
  robotId }`, as the crew drive seeds its programs; the program is the one a child teaches). The Workshop on the land is
  lane B's (`Logic/Land request`, merged); teaching it there by touch was not driven by this lane.
- **The land's card** (what tapping her land says and does, pinning a robot from it) is lane B's; this lane pins by seed.
- **A fed animal "sometimes gives something"** (IW-007 §2: wool, an egg) — not built; no AC asks it.

**Deviations, with reasons**
1. **3D hop only when a carrot lands** (2D: a small hop now and then while fed). A hop that never stops would keep Garden
   3D drawing every frame (its loop draws only while something moves — the CPU is Olive's when the scene is still); fed,
   she stands, and each carrot that lands makes her hop.
2. **An empty name box takes a default name** (Hazel / Noisette, Cloud / Nuage — numbered only when taken) in `Logic/Buy`,
   as a robot copy's does in `buyItem`; the base's `buyItem` keeps `name: ''` for an animal (its gate row), so the default
   is the shop's, not the save rule's.
3. **Draw world** (a shared page script) passes `animal`, `name` and the patch: without it the kits never saw her.
4. **Three spec / drive clauses changed in place**: iw006Shop's "Build and Animals sell nothing yet" (its Animals half
   now `iw7aShut`), cg001GardenKit's reduced-motion list (+ the hop, stilled), drive-iw006-shop's TAB Animals half.

**FR lines for Richard's read:** « Construis d’abord le refuge : tes animaux y vivront. » · « Le refuge n’est pas encore
fini. Tes robots peuvent le construire ! » · « Toutes les places de l’enclos du refuge sont prises. » · « {name} t’attend
près de son bol, sur ton terrain. Un robot peut lui apporter des carottes ! » (rabbit and sheep alike: « son bol ») ·
« 🥕 carré de carottes » · « 🌳 arbre » · the default names « Noisette » (the rabbit), « Nuage » (the sheep).

**Could not verify**
- **The save lags the island by up to one carrot**: the keep writes her `fed` at its moments, so a refill a moment before
  a reload is not in the save (the drive: 3/3 on the island, `fed` 2 in the store, 2/3 after the reload — her name and she
  herself always kept). For lane B / the merge: a bowl's rise as a keep moment, as a building's drop already is.
- The tablet (her size on a real island tile, the hop by touch); a real GPU (swiftshader hands the 3D island to the flat
  one within a few ticks, as before); two animals both fed by one program on the page (the perf run's program feeds the
  rabbit first, the sheep after — the patch's four carrots and its regrowth mean the sheep waits; not graded).
