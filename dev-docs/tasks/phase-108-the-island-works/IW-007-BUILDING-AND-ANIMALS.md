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
- **Drives:** `scripts/devtools/drive-iw007-build.js` (new, 2D + `--mode 3d`, in `drives/drive-all.sh` as `build`,
  `build-3d`); lane B clauses at the END of `drive-cg001-kit.js` (4) and `drive-ig007-3d.js` (5).

**Readings** (worktree; each spec file alone, `npx jest tests/<f>.test.ts`; previous = brief §8):

| gate | exit | total | previous |
|---|---|---|---|
| `iw007Building.test.ts` (NEW: 15 rows + 4 arms) | 0 | **19 / 19** | — |
| `iw007Build.test.ts` | 0 | **22 / 22** (the [B] rows green; the [A] rows also pass on this plumbing) | 18 + 4 red |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **62** · **52** (+5, +2: her land drawn) | 57 · 50 |
| cg002Engine 259 · cg003Template 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · iw004Blocks 59 · p108s2Join 4 · iw003Missions 63 · iw006Save 17 · iw006Earn 34 · iw006Shop 34 · iw008Crew 25 · iwLook 15 · p108s4Join 3 | 0 each | same | same |
| all spec files | 0 | **978** in 18 files | 952 (930 + iw007Build 22) |
| shell `node --test` | 0 | 92 / 92 | 92 |
| `npm run template:garden` | 0 | regenerated, committed with each group | 0 |
| kit fixture 2D `drive-cg001-kit.js` | 0 | **48 / 48** (+4) | 44 |
| kit fixture 3D `drive-ig007-3d.js` | 0 | **35 / 35** (+5) | 30 |
| `drive-iw007-build.js` 2D (dev deploy) | 0 | **26 / 26** (the spa built in 104 s) | — |
| `drive-iw007-build.js --mode 3d` (dev deploy) | 0 | **4 / 4** (the live puff seen: 4 samples; no Too Slow) | — |
| drive-all (page + named drives, final commit) | READINGS-PENDING | READINGS-PENDING | 331 · … |

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

