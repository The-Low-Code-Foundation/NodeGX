# IW-007 — Building and animals

**Opened 2026-09-29** from README §0 ("the more they drop the resources the more the house pops up … a robot spa or an
animal refuge … buy a sheep and a rabbit … task a robot with collecting food and feeding them"). **Status: ✅ s6
(2026-10-01, on `cline-dev`): AC1 ✅ — the spa bought, placed, and built by Pip and Cobble, BOTH taught on her land by
touch (her land's card names her robots of any kind, a tap chooses who learns, a win there makes the second robot the
helper), the spa finished in 104 s on the island; AC2 ✅ — feeding taught on her land by touch and won while two
buildings stand, her bowl filled on the island (wear and refill: lane A's drive); AC3 ✅; AC4 ✅. The pen's look and the
chips' words fixed (s6). **s7: the owed items paid** — robots rest at the finished spa, a helper's drops earn, a fed
animal gives her present, two robots' name pills never cover each other (both kits), the touch path driven in 3D
(§4 "Session 7"). Not built: a tune on the last drop (the kit has no sound).** Depends on IW-005 (seek), IW-006 (the shop). Lane B or E.

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

### Session 5 (2026-10-01, lane B `iw007-build`, base `b40be26c8`) — building: her land, the Build tab, the ghost, the spa built by two robots, 2D + 3D

**Built** (new file `packages/noodl-mcp/tests/iw007Building.ts`; hunks elsewhere each under `// P108 IW-007 (lane B): …`):

- **The island plumbing (brief §4.2), first commit `b37112fdb`** — Read family outputs `land`; Island world takes
  `Inputs.land` and adds her land as a plot (id `land`, at LAND_PLOT), drawn with or without anything on it; status
  `working` only when a robot is pinned AND something stands (a job), else `open` (never locked, never won). A helper of
  ANY kind on the land (`helps: 'land'`; the same-kind rule stays on request plots). A land built from a save: buildings and
  bowls from the land, the sources' `left` from the live job (`iw7bLandOnto`). The build hash adds which buildings stand
  where and which animals — never `have`/`fed` (`iw7bLandKey`). On the land a drop that raises a building is a moment
  (`iw7bDropMoment`, the tick), so Island keep writes every drop (`landKeep`, never lower). Workshop: `Logic/Land request`
  (new) adds her land to the requests (`gardenRequestId` = `land`; its palette: the walks, pick, put, until, repeat).
- **Teach again on the land (decided):** the land plot is judged by its TEAM — stale when the job lacks something and
  neither the pinned program nor the helper's, each run alone to its end from the land as it stands, fills one step
  (both robots then wait at home and the card asks to teach again; one program that fills a step keeps both working).
- **The Build tab** (`iw006Shop.ts` hunks + `BUILD_SHOP`): every blueprint shows; bought, its row says "to place" /
  "being built" / "built" and its card says where it is (no second Buy); the tab's line says where a bought one goes.
- **Her land's card** (Island choose opens `land`; `Logic/Land card` new): "Your land", what stands (each building, its
  stage word and materials), a chip per blueprint to place; a robot of hers at work elsewhere is named (no Bring home
  here). **The ghost** (`Logic/Land ghost`, by mode start · move · place · cancel; held in `gardenGhost`; `Logic/With ghost`
  puts it on the island's world): at the blueprint's spot, moved by a tap on her land, green where `landLegal` says `''`,
  red with the reason in words (edge · ground · taken · reach · built, EN + FR), Put it here only where it fits.
- **Drawing, both kits** (lane B blocks after Sami's bench; built files committed): one sprite across a building's parts
  by `bstage` (spa0..3, refuge0..3: pegs and string · the frame · the walls · finished; 2D two tiles wide and two tall,
  3D the first part builds the whole building across `bx`/`bw`), the parts' ground dirt then gravel, the refuge's pen
  fence once finished, the puff on the last drop (2D: a building seen below its last stage then at it; 3D: markThings →
  `anims.puffs`, shown and swelled for PUFF_MS), her land's tree by its planks, a plank on a robot's back, the ghost.
  Draw world passes the tree, the ghost and each part's `bstage`, `of`, `bx`, `bw`.
- **A land bowl's change is a keep moment too** (`0126a13d1`, lane A's finding: the store lagged her bowl by a carrot):
  `iw7bDropMoment` also fires when an animal's bowl on the land changes (fed or worn). Row + arm.
- **Drives:** `scripts/devtools/drive-iw007-build.js` (new, 2D + `--mode 3d`, in `drives/drive-all.sh` as `build`,
  `build-3d`); lane B clauses at the END of `drive-cg001-kit.js` (4) and `drive-ig007-3d.js` (5).

**Readings** (worktree; each spec file alone, `npx jest tests/<f>.test.ts`; previous = brief §8):

| gate | exit | total | previous |
|---|---|---|---|
| `iw007Building.test.ts` (NEW: 16 rows + 5 arms) | 0 | **21 / 21** | — |
| `iw007Build.test.ts` | 0 | **22 / 22** (the [B] rows green; the [A] rows also pass on this plumbing) | 18 + 4 red |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **62** · **52** (+5, +2: her land drawn) | 57 · 50 |
| cg002Engine 259 · cg003Template 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · iw004Blocks 59 · p108s2Join 4 · iw003Missions 63 · iw006Save 17 · iw006Earn 34 · iw006Shop 34 · iw008Crew 25 · iwLook 15 · p108s4Join 3 | 0 each | same | same |
| all spec files | 0 | **980** in 18 files | 952 (930 + iw007Build 22) |
| shell `node --test` | 0 | 92 / 92 | 92 |
| `npm run template:garden` | 0 | regenerated, committed with each group | 0 |
| kit fixture 2D `drive-cg001-kit.js` | 0 | **48 / 48** (+4) | 44 |
| kit fixture 3D `drive-ig007-3d.js` | 0 | **35 / 35** (+5) | 30 |
| `drive-iw007-build.js` 2D (dev deploy) | 0 | **26 / 26** (the spa built in 104 s) | — |
| `drive-iw007-build.js --mode 3d` (dev deploy) | 0 | **4 / 4** (the live puff seen: 4 samples; no Too Slow) | — |
| `drives/drive-all.sh island island-3d shop earn crew robots robots-3d stones stones-3d kit2d kit3d build build-3d` on `a0917409e` (one deploy; exit 0, DONE) | generate 0 · 0 drift · deploy fresh · page drive 0 | **page 331/331** · island `--perf` 69/69 · island-3d 5/5 · shop **54/60** · earn 15/15 · crew 39/39 · robots 60/60 · robots-3d 4/4 · stones 32/32 · stones-3d 14/14 · kit2d 48/48 · kit3d 35/35 · build 26/26 · build-3d 4/4 | 331 · 69 · 5 · 60 · 15 · 39 · 60 · 4 · 32 · 14 · 44 · 30 |
| shop drive again (its Build clause re-pointed: the six reds were the old "Build sells nothing yet" clause at three widths × EN/FR), same deploy | 0 | **60 / 60** | 60 |
| `drive-iw007-build.js` 2D on the final commit `0126a13d1` (the land bowl moment), fresh deploy | 0 | **26 / 26** | 26 |

**Looked at** (`iw007-build-scratch/`): `dev/build-shots/*-land.png` (her land ×3) — the ghost green at (3, 1), red over
the rock's tile; the spa's pegs and string on dirt, the frame (Pip at its side), the walls, finished with its red roof,
bath and steam, the meters green, Pip and Cobble home; the first look had the roof under the island's compact meters —
the 2D sprite is now two tiles tall. `kit2d/shots/iw7b-2d-*` — the four stages, the puff over the finished spa, the
refuge with roof, door and pen, the tree with planks / a few / a stump, Pip with a plank, the ghosts. `kit3d/shots/iw7b-3d-*`
— the same in 3D (pegs, posts and beams, walls, roof and bath with the puff's spheres; the refuge's pen rails; ghost slabs).
`dev/build-3d-shots/` — the spa on the 3D island at each stage; the live last plank framed close with the puff.

**Against §3:** AC1 ✅ for buildings (bought in the Build tab, placed on a legal footprint only — refusals in words —,
built by two robots with two materials on the island tick, each stage drawn in 2D and 3D, the last drop finishes it with
a puff). AC3 ✅ for buildings (the save's spa only rises: spec rows + the drive's store reads; `keep` never wears; reload
keeps it). AC4 ✅ for buildings (the island drives 2D + 3D: `drive-iw007-build.js`). AC2 and the frame gate are lane A's.

**Deviations, with reasons:**
1. **The two robots' programs are SEEDED in the drive** (the brief allowed it): a Workshop win on the land needs ONE
   program that finishes the whole job (`job_done`), so a child pins her first robot by teaching it to carry both
   materials; a second robot is not yet sendable to the land by touch (lane C's crew pills ask for a robot of the plot's
   kind on a WON plot — not built for the land this session).
2. **A Workshop win on the land pays nothing and never starts the land done** (Win pay hunk, lane E's file): the
   building rises on the island, a drop at a time; a land lap pays its steps there (D2), no bonus (`JOB_BONUS` has none).
3. **Each drop is a save moment** on the land (not only a lap's end): a reload never loses a wall; ~10 writes a spa.
4. **The ghost is a Variable `gardenGhost`** beside `gardenIsland` (cg003Template's island-Variables row re-pointed).
5. **Rows changed, with the reason:** cg002Engine stamped-island cards (+ `land`), cg003Template Job robot wiring
   (`wsLandReqs`) and the Variables, iw006Shop's tab row (Build's half), cg001GardenKit's reduced-motion list (+ gd-puff).
6. **No tune on the last drop:** garden-kit has no sound (game-kit's `Sound` is not on the island); the puff only.
7. **The spa's `rest` is not built** (robots resting there when done) — as the brief says.

**FR lines for Richard's read** (`PAGE_WORDS`, `iw7b…`): « Ton terrain » · « Ton terrain à toi : un arbre pour les
planches, un rocher pour les pierres, un carré de carottes. Apprends à {b} à les porter jusqu’à ce que tu construis
ici. » · « Achète un plan ici, puis touche ton terrain sur l’île (le pré en bas à droite) pour le poser. » · « À toi · à
poser » · « En construction » · « Construit » · « C’est à toi ! Touche ton terrain sur l’île pour le poser. » · « Il est
tracé sur ton terrain : les robots le construisent. » · « Il est construit sur ton terrain. » · « Rien n’est construit ici
pour l’instant. Achète un plan dans l’onglet Construire de la boutique, puis pose-le ici. » · « Un plan à poser : » ·
« Il tient ici ! Touche une autre case de ton terrain pour le déplacer. » · « Pas ici : {why} Touche une autre case de
ton terrain. » · « il dépasserait de ton terrain. » · « il lui faut de l’herbe, pas un arbre. » · « il y a déjà quelque
chose. » · « il bloquerait le chemin des robots. » · « celui-là est déjà construit. » · « Le poser ici » · « Pas
maintenant » · « {what} : {stage} · {n}/{m} » · « piquets et ficelle » · « la charpente » · « les murs » · « terminé ! » ·
« {b} travaille sur « {plot} ». Pour lui apprendre un travail sur ton terrain, ramène d’abord {b} à la maison depuis
là-bas. »

**Not done, and why:** the crew pills on her land's card (send any robot to work / help there by touch — lane C's
scripts ask for the plot's kind and a won plot; for Richard / a later lane); a Workshop goal for one material (a robot
pinned by teaching it stones only) — needs a goal the engine does not have; a short tune (no sound in the kit).

**Could not verify:** the tablet (touch on 16 px island tiles while placing — the ghost moves by a tap on a tile, which
is small on the island at 390); Garden 3D on a real GPU (swiftshader only; it did not fall back this run); earning from
the helper's drops (lane E's island earnings count the plot's first robot — the helper's planks/stones pay nothing).


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

### Session 5 merge (orchestrator, 2026-10-01, `p108-s5`) — the base, then lanes O → B → A

**Order:** a base (`b40be26c8`: her land, BLUEPRINTS, ANIMALS, the tree and the patch as sources, a building's `bstage`,
`keep`, a bowl's own food, `island.land` in the save, `tests/iw007Land.ts`, the gate `iw007Build.test.ts`, BRIEF-s5.md),
then lanes O (IW-006, fast-forward), B (`dea17b77e`), A (`7673e3fab`). Lane B committed the island plumbing first
(`b37112fdb`); the orchestrator handed that sha to lane A mid-session, and lane A merged it.

**What the merge decided:** B × O — four appended blocks side by side (drive-all, DRIVE, PAGE_WORDS, GLUE_SCRIPTS and the
imports). A onto O + B — both kits had B's block and A's block appended at one spot and git shared B's closing line with
the common tail (`}` in kit.js, `return g; };` in kit3d.js): restored, `node --check` on both, then every doubly-touched
file checked line for line against base + each lane's adds and removes — exact but for the hand joins: the kits' `LOADS`
(plank, carrot), `anims` (`puffs`, `hops`) and `busy`; the shop's shared tail (`BUILD_SHOP`, `IW7A_SHOP_SHARED`), its
`later` line (B's Build line, then A's `iw7aLater`), its bought line (B's blueprint line, then A's animal line); the tab
row and the shop drive's TAB clause (Build B's, Animals A's); the reduced-motion list (+ `gd-puff`, + `gd-pet-happy`);
the kit fixtures' A clauses re-inserted whole after B's. **One red at the join, a spec:** lane A's control row "the Build
tab is not mine, it says its old line" pinned `iw6hLaterBuild`, which lane B had replaced with `iw7bBuildHow` — re-pointed
(`6a2685fa1`). Lane A's "save lags her bowl by a carrot" had been fixed by lane B (`0126a13d1`, a land bowl's change is a
keep moment).

**Readings on the merged tree** (`p108-s5` at `6a2685fa1`, 2026-10-01; every exit 0): specs, one file at a time — cg002Engine
259 · cg003Template 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · cg001GardenKit 62 · ig007Garden3d 52 ·
iw004Blocks 59 · p108s2Join 4 · iw003Missions 63 · iw006Save 17 · iw006Earn 34 · iw006Shop 34 · iw008Crew 25 · iwLook 15 ·
p108s4Join 3 · **iw007Build 22 · iw006Owed 19 · iw007Building 21 · iw007Animals 22** = **1021** in 20 files; shell 92/92;
`template:garden` exit 0, 0 drift. The whole drive set on ONE deploy (`drives/drive-all.sh`, DONE): page drive **331/331** · look 143 · earn 15 · shop 60 · crew 39 + `--perf` 5 · modes 90 · IW-001 38 · IW-004 19 + 3D 3 · island `--perf` 69 + 3D 5 · robots 60 + 3D 4 · Workshop 3D 24 + nogl 8 · Olive 22 · Mamie 34 + 7 + 3 + 6 · stones 32 + 3D 14 · post 17 + 3D 10 · Biscuit 24 · kit fixtures 2D **50** (+4 B, +2 A) and 3D **37** (+5 B, +2 A) · **owed 19 · build 26 + 3D 4 · animals 16 + 3D 4 + `--perf` 5** (new).

**Looked at:** `build-shots/iw7b-1368-en-07-reloaded-land.png` — after a reload the spa stands finished (red roof, the bath
and its steam), both its meters green; the tree with its planks, the patch, the rock at the land's edges; Cobble and Pip at
home. `animals-perf/iw7a-perf-land-1368.png` — the spa and the refuge both finished, Flopsy and Bramble by their bowls, the
names staggered; **a look item:** the rabbit stands half hidden behind the sheep and the two animals sit over the refuge's
meter chips.

**Measured at the merge (not a drive):** on the engine, with the spa and the refuge standing, a feeding program
(`until [her bowl] is full { go to nearest patch; pick; go to her bowl; put }`) WINS on the land in 46 ticks (job_done 5/5);
with the spa unfinished it cannot (4/5). So AC2's "taught" is reachable in the Workshop on the land once she has built —
not yet driven on the page.

**Owed (session 6):** a second robot sent onto the land BY TOUCH (AC1: today only a seeded save puts a helper there — the
land card's crew pills, or lane O's hook in `tests/iw006Owed.ts` for My robots' send); teaching on the land driven (AC2);
the look item above; the spa's `rest`; a tune on the last drop; a helper's drops earning; two drives that type a price.

### Session 6 (2026-10-01, on `cline-dev` from `47929a133`) — her land by touch: a second robot, and teaching there

**Measured first** (the page's own scripts, `tests/iw007Touch.test.ts` began as the measurement): a 10-block program
carrying both materials WON on the land (`job_done`, 194 ticks) — so one robot could be taught there, but only the whole
job; her land's card showed no robots (the crew row asked for the plot's kind and a won plot) and a tap had nowhere to
go ("Cobble can't do this job": the land is not in the catalogue); **a second robot sent with a COPY of the first's
program stood still** (one rock, one tree: the source reserved by the robot already at work — 183 ticks against 181
alone), while two robots on two materials built the spa in 131. A Workshop win on the land also put `land` in `done`.
So "send Cobble to help" (the handoff's words) was a dead end as specified: each robot must learn its OWN job there.

**Built** (hunks under `// P108 IW-007 (s6)`; new: `tests/iw007Touch.test.ts`, `scripts/devtools/drive-iw007-touch.js`):
- **The land's goal is a part finished** — `part_done` (ENGINE `goalMet`; args: the targets not full when the run began,
  `iw7tOpenTargets` in `iw7bLandRequest`). A run that fills a building's part or an animal's bowl wins; not "and home"
  (the engine walks a robot home only when the WHOLE job is done). Pip learns the stones, Cobble the planks; feeding
  wins while a building is still going up.
- **Her land's card names her robots of ANY kind** (`Logic/Crew chips` on the land: every robot, shown with two or more;
  "Your robots" · "Tap a robot to choose who learns a job here. Each one can carry something different."). **A tap
  CHOOSES** (`Logic/Assign robot` on the land: `chose`/`chosen`, nothing written) into the Variable `gardenLandBot`;
  the card re-reads (`iwAgain`); Go and help says **"Teach Cobble here"**; the Workshop's `Job robot` teaches the robot
  chosen (`iw7tLandPick` in CREW_PICK: chosen, else the one at work there, else the helper, else Pip's rule). A chosen
  helper's card: "Cobble helps here, with the job you taught Cobble here. Go in to teach it again, or bring Cobble home."
- **A win on her land** (`Logic/Complete request`): the first robot works it; a robot that wins there while another is
  at work there becomes the HELPER with its own program (a helper there before goes home with its program; the save
  keeps one helper per plot); the land is never put in `done`.
- **Fixed, found by driving it by touch (every spec was green):**
  1. **The Workshop on her land wiped her program at every "Got it"** (and would have at the win): Read family's `land`
     is a fresh object on every read, so each profile write re-ran Land request → Start world's reset. Read family now
     also gives `landText`; the Workshop wires that (equal text is not published again). `dev-docs/bugs/p108-iw7-wsreset-…`.
  2. **Cobble's drawer on the land was empty**: Start world said the land `needs` 'pip' (`req.needs || 'pip'`), so the
     palette refused every block to another kind. Her land needs no kind now.
  3. The Workshop's card on the land said "Free play" under "'s request": an islander-less request is named by its own
     title and blurb ("Your land" · "Build").
  4. `land` put in `done` by a win there (`dev-docs/bugs/p108-iw7-landdone-…`).
- **My robots' "send to a job" does not list the land** (decided; lane O's hook in `iw006Owed.ts` closed): a sent robot
  runs a copy, and a copy stands still there.
- **Two look items a child sees on her land** (after the touch drive's screenshots):
  - **The chips' words** (`dev-docs/bugs/p108-iw7-partword-…`): `Logic/Pick thing` puts a land part's `build` and `item`
    (only a part of a building of hers: `of` set — Sami's bench and a path square are as before) and her bowl's `name` on
    the chip; garden-kit's `chipLabel` says "🧱 the spa's stone part" / « 🧱 la partie en pierre du spa », "🥣 Hazel's
    bowl" / « 🥣 le bol de Hazel », and a part's states "is built" / « est construite » (`iw7tK_*`, `iw7tS_*`; kit
    `src/blocks.js`, `chipLabel` exported for the gate; built with `build.mjs`).
  - **The pen** (the s5 merge's look item): on the island an animal was drawn at 180% of a tile, 70% into the next pen
    place and 110% up, above the chips (z 3 over 2) — the rabbit half hidden behind the sheep, both over their bowls'
    chips. Now 160% (lane A's floor: ≥ 20 px on a 390 phone — 140% gave 18 px and its clause went red), centred on her
    place, in front of the pen's fence (tried under it at z 1: the check passed, but LOOKED AT, the rabbit all but
    vanished under the fence), her own cell's chip lifted above her (z 4, `:has(>.gd-pet)` — the island's other chips keep
    their place under the robots), an animal on an odd column a little lower, and **the lower one in front** (z 3, the
    upper z 2 — looked at: with the later cell on top, the sheep covered the rabbit's head; now only a leg is behind a
    neighbour) (kit `src/kit.js`, `gd-pet-odd`). Graded on the page: a clause in `drive-iw007-animals.js --perf` — one
    animal's box covers under a third of the other's, and the four chips round them (each bowl's, the refuge part's
    above) are what a finger meets at their centres (lent pointer events: a chip is `pointer-events:none`, and the first
    version of this check read FALSE on every kit for that reason). On the OLD kit it fails: 44%, 2/4.
- Two drives read their prices from SHOP (`drive-iw006-shop.js` the copy and the brain, `drive-iw008-crew.js` the copy).
- `drives/drive-all.sh`: `touch` added; the generator called directly (the root `package.json` is broken, below).

**Decided here (the order is ours, R4; change any by saying so):**
1. Her land is taught **robot by robot**, each its own part (the person sentence: "teaches Cobble to carry stones and a
   new robot to carry planks"); at most TWO robots work her land (one at work, one helping — the save's one-helper rule).
2. **The feeding pin when she places a new building:** the land is judged by its team (lane B's rule): a feeding robot
   still fills a step, so it keeps feeding; the new building waits for a robot taught to build it. With two robots on the
   land she chooses which job each keeps (e.g. Cobble re-taught from planks to feeding — driven).

**Readings** (2026-10-01; each exit 0 unless said):

| gate | total | previous |
|---|---|---|
| `iw007Touch.test.ts` (NEW: 16 rows + 5 arm rows; mutated sources inside rows too — each rule's arm red, asserted) | **21 / 21** | — |
| the other 20 spec files, one at a time | **1021** (cg002Engine 259 · cg003Template 148 · … · iw007Animals 22) | 1021 |
| all 21 spec files, the final tree | **1042**, every exit 0 | 1021 in 20 |
| shell `node --test` | 92 / 92 | 92 |
| generator (`generate-garden-template.ts`, called directly) | exit 0, then cg003Template's byte-for-byte row green (0 drift) | 0 |
| `drive-iw007-touch.js` (NEW) | **25 / 25** — Pip taught the stones and Cobble the planks by touch, both WON; the chip says "🧱 the spa's stone part … is built"; the spa built on the island in **104 s**, Pip seen carrying stones and Cobble planks, store 6/6 · 4/4; Cobble re-taught to feed Hazel ("🥣 Hazel's bowl"), WON with two buildings standing, her bowl 3/3 on the island in 25 s; FR 390 card words; 0 console errors | — |
| **final set on the final tree** (`drive-all.sh animals-perf animals touch kit2d`, one deploy, DONE) | page drive **331/331** · animals `--perf` **6/6** (the pen: one covers 29% of the other, 4/4 chips on top; p95 16.8 ms at CPU ×4) · animals 16/16 · touch 25/25 · kit fixtures 2D 50/50 | 331 · 5 · 16 · — · 50 |
| the pen clause on the OLD kit (the s5 deploy of this session's first set) | **red, as it should be**: one covers 44%, 2/4 chips on top | — |

**Regression set on one deploy** (`drives/drive-all.sh`, the session-6 tree before the two look items — the look items touch
only the kit's chips and the island's pen, re-driven in the final set above; every exit 0,
DONE): page drive **331/331** · touch **23/23** · build 26/26 · animals 16/16 · owed 19/19 · shop **60/60** (prices from
SHOP) · crew **39/39** (the copy's price from SHOP) · earn 15/15 · island `--perf` 69/69 · robots 60/60 · modes 90/90 ·
iw004 19/19 · stones 32/32.

**Looked at** (`touch-shots/`): `iw7t-02-cobble-chosen` (the card: "Your robots", Pip · Cobble with Cobble in ink,
"Teach Cobble here"); `iw7t-pip-stones-won` / `iw7t-feed-won` ("Thank you, Pip!" / "Thank you, Cobble!", 5 blocks.
Neat!); `iw7t-04-here` ("Pip works here · Cobble helps", "Cobble helps here, …", Teach Cobble here · Bring Cobble home,
"The robot spa: finished! · 10/10"). Seen there and fixed after (above): the spa's part chip read "square … is path" and
her bowl "bowl 1". Not fixed: at home Pip's and Cobble's name pills overlap ("Cobble ²ip").

**Not done, and why:** the spa's `rest`; a tune on the last drop (no sound in garden-kit); "a fed animal sometimes gives
something" (no AC asks); a helper's drops earning (lane E's earnings pay the plot's first robot); two robots' name pills
overlapping at home; 3D for the touch path (the 2D island and Workshop only; the build drive's 3D clauses still read the seeded crew).

**Found, not this phase's:** the primary checkout's root `package.json` is Nightbook's app manifest since 2026-09-28
(`dev-docs/bugs/p108-repo-pkgjson-…`): every `npm run` fails there. Not restored here.

### Session 7 (2026-10-01, on `cline-dev` from `a91b73247`) — the owed small items, and R5

**Asked first, in plain words** (README §3): R5 → *"~400 ticks"*; more land → *"not in this phase"*; the root
`package.json` → *"restore it"* (done). **R5 was re-measured before it was asked:** the session-1 reading (longest
reference run 41 ticks, "a cap of 200 leaves five times that") was stale — path-stones takes 110, a one-part job on her
land 134 (the spa's stones), a whole spa by one program 194. The old recommendation would have cut a winning run.

**Built** (hunks under `// P108 s7`; new: `tests/p108s7.test.ts`):
- **R5:** `RUN_CAP` = 400 (`cg002Scripts.ts`); `Logic/Run cap` uses it (≈ 2¾ min at 420 ms a tick, Olive's "going round
  and round" line at the cap, IW-001's); MAX_TICKS (2000) still bounds Predict and the gate. A gate row keeps it at least
  twice the longest winning run (every mission on seeds 1–3, a part on her land) — a longer job turns it red.
- **Two robots' name pills** (`pillSides`, garden-kit; garden-3d-kit's copy pinned to it): a pill stays under its robot
  unless it would meet one already placed, then it goes over its robot; placed lowest-on-screen first, so of two robots
  one above the other it is the upper one whose pill goes over (the first version, in robot order, left that case
  covered: seen while writing the drive's clause, then pinned by a spec row with the kit's real 56 px robot box). 2D: after each draw, from where each robot is GOING (`data-up`); 3D: every frame from
  the projected points, a pill's size read once per name.
- **The spa's rest** (`P108-S7-SPAREST`: the shop says "Robots rest there when a job is done" — nothing did): `landJob`
  gives a placed spa's `rest` (its id; a free, reachable grass tile per robot, D13: two rows in front of it, one tile out
  at each end — the first version, the row right under it, hid the spa and each robot behind the other on the island:
  seen on the touch drive's shot, not by any check); the engine's `homeOf` asks `restOf` first — the spa FINISHED, read
  live, so the walk after the last plank goes there; a save kept with the job done puts the robot at its rest on the
  next build (`iw6Resume`). `Logic/Land request` now carries ENGINE (the rest asks which tiles a robot can reach).
- **A helper's drops earn** (`P108-S7-HELPERPAY`): `islWithMate` counts the helper's own fill and pays it at its
  program's end by the one rule (`iw6Pay`); Island keep adds it with its own "Cobble +N 🐚" line. Holds for a crew helper
  on a request plot too (IW-008).
- **A fed animal's present** (D12): ANIMALS' `gift` (rabbit: a clover +1, sheep: wool +2, words `iw7sGiftClover` /
  `iw7sGiftWool`); Island keep gives it when a robot filled her bowl right up (full on the plot, not full in her save —
  read before `landKeep` writes her fed; wear only ever lowers a bowl).
- **The touch path in 3D:** `drive-iw007-touch.js --mode 3d` (`drives/drive-all.sh` `touch-3d`): every tap on a world is
  the 3D kit's own `screenOfTile` on its canvas; the drive follows whichever world is drawn (the 55 × 22 island can trip
  Too Slow under software GL and the flat island takes over — recorded, not hidden). New clauses in both modes: REST
  (the tiles from the page's own `landJob`), PILLS (every settled moment while the two build: no pill covers another,
  and the robots did come close with a pill sent over — the known-firing half), PAY, GIFT; 3D: the Workshop on her land
  is Garden 3D while Pip's parts are picked on its world.

**Readings** (2026-10-01; every exit 0 unless said):

| gate | total | previous |
|---|---|---|
| `p108s7.test.ts` (NEW: 17 rows, 5 of them arms — each rule mutated at one anchor, red asserted) | **17 / 17** | — |
| all 22 spec files, one run, the final tree | **1059**, exit 0 (the crew's 12-robot tick p95 2.0 ms; one earlier run read 6.6 ms > 5 with a peer's jest at 86% CPU beside it — alone: 1.7, 1.9) | 1042 in 21 |
| shell `node --test` | 92 / 92 | 92 |
| generator (`npm run template:garden` — the root `package.json` restored) | exit 0; cg003Template's byte-for-byte row green | 0 |
| **drive set 1** (`drive-all.sh`, every drive, one deploy of the tree before the last two kit edits) | page **331/331** · look 143 · earn 15 · shop 60 · crew 39 · crew `--perf` 5 · modes 90 · iw001 **38** (reads the deployed cap: 400) · iw004 19 · iw004-3d 3 · island `--perf` 69 · island-3d 5 · robots 60 · wsnogl 8 · olive 22/22 · mamie-ws 34 · mamie-isl 7 · mamie-isl3d 3 · mamie-look3d 6 · stones 32 · post 17 · post-3d 10 · biscuit 24 · kit2d 50 · kit3d 37 · owed 19 · build 26 · build-3d 4 · animals 16 — 🔴 **ws3d** red (Too Slow under software GL in Play) and **stones-3d** 13/14 (a meter sampler missed a count): a peer's Docker VM at 163% CPU, load 9.5; **ws3d on the SAME build, quiet: 24/24, p95 18.5 ms** (contention, not the change). The set hit the 2-hour limit before animals-3d/perf, touch, touch-3d | 331 · … |
| **drive set 2** (fresh deploy of the FINAL tree) | page **331/331** · ws3d **24/24** · stones-3d **14/14** · animals-3d 4/4 · animals `--perf` 6/6 · touch **29/29** · kit3d 37/37 · touch-3d **29/29** (below) | — |
| `drive-iw007-touch.js` (2D) | **29/29** — REST: Pip and Cobble at (48, 18) and (51, 18) island, not home; PILLS: 85 settled moments while they built, 0 with a pill covering another — 38 times two robots stood close, 24 of them with a pill sent over; PAY: "Cobble +4 🐚", "Pip +6 🐚", the wallet +10; GIFT: "🍀 Hazel found you a clover +1 🐚"; the spa in 105 s | 25 |
| `drive-iw007-touch.js --mode 3d` (final tree; a first run on it at load 5.5 stopped when the drawer's `is` had not scrolled under the finger — alone, quiet: green) | **29/29** — Pip and Cobble taught by taps on Garden 3D's world in the Workshop on her land (both `3d`); the island began in 3D and fell back to flat under software GL (Too Slow, 55 × 22), where REST, PAY and GIFT were read; no PILLS clause in this mode (the 3D sampler reads no pills) | — |

**Not done, and why:** a tune on the last drop (garden-kit has no sound; game-kit's `Sound` is not on the island page —
a sound is a new port on the kit, and nothing a child does waits on it); the rest on the 3D island seen under a real GPU
(swiftshader fell back to the flat island on the 55 × 22 island; the Workshop stayed 3D).


