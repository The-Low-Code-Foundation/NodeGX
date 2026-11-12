# Phase 130 — PLATFORM: a game built under the canon, then put under the heat

**Opened:** 2026-10-30, on Richard's ask (BRIEF.md has his words verbatim). **CLOSED 2026-10-31** (Richard: *"I think this lane might be a dead end"*); the verdict is [RESULTS.md](RESULTS.md)'s last section. **State before the close:** rulings 1–7 and 9 in; s2 done 2026-10-30: the harness built in [`parked/platform-kit/`](../../parked/platform-kit/README.md) (the kit, the people baked ahead, ten gates proven on a fixture), both lab folders made in `~/vscode_projects/platform-lab/{A,B}`; s2b sealed them (`_make/arm.mjs`); next = s3, the build (Richard drives Opus 5.5).
**Working title:** PLATFORM (the game is a platformer; the title is ruling 8, still open).
**Read in this order:** this page → [BRIEF.md](BRIEF.md) → [GAME.md](GAME.md) → [PEOPLE.md](PEOPLE.md) →
[THE-TEST.md](THE-TEST.md) → [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).

## What this phase is

The test of P129's canon (*built to be changed*, draft 2), run the only way a canon can be tested: on a game nobody in this
repo has built yet, by an agent that has never read this repo, under a harness that **obliges** it to write the latent
layer, and then under an owner who is deliberately pedantic about what they want changed.

Three parts, in order:

1. **The harness** (us, one or two sittings): the smallest play kit that makes the canon binding. Knobs, models, places and a
   registry as a library; a checker that exits 1 on every gate in P129 CANON §7; a drive harness; the note the agent
   reads. Plus the one hard technical piece the game needs and a stranger would burn a day on: **hundreds of people on a
   Windows tablet** (PEOPLE.md), measured first, shipped as a shelf module.
2. **The build** (Opus 5.5, in a fresh folder with no memory of this repo): a Fallout Shelter spin-off (GAME.md), built in
   the castle's rounds (a brief, a picture, the owner plays and writes a list, a round builds the list). Two arms: A with
   the harness, B bare with the same brief. Day one is expected to look the same (OWN-023).
3. **The heat** (Richard, then Opus again): the owner asks for changes, pedantic and specific, from "the lamps are too
   white" to "I want the generator exhaust to be real particles and tune it myself" to "add the drowned lighthouse out
   past the bay". A follow-up Opus session on each arm handles the list. What is measured is in THE-TEST.md: files touched,
   engine files touched, old checks still green, the owner's design files intact, tool calls before the first edit, and
   whether it built only what was asked.

## Why this and not the Triage conversion

P129 §11 recommended converting Triage's tuning constants first because it is cheap. Richard chose this instead
(*"I'd rather design a new phase where we let Opus take a crack"*): a conversion measures the layer on code we wrote
knowing the canon; a stranger building from scratch measures whether the harness makes a stranger write it. The second is
the claim the site would make. The Triage conversion stays in P129 as the cheap fallback if the harness is late.

## The game in one paragraph

A drowned city after the bombs and the melt. Your people live in the dry top floors of one office tower, seen from the
side like a dollhouse: 3D rooms with the front wall cut away, read like a 2D platformer, with the sea line across the
cutaway and the flooded floors below it (pump one out to claim it). Dwellers keep the lights on, grow food, make fresh
water, fall out with each other and vote. Parties take the boat to whatever still sticks out of the water, and the player
may take the controls: a side-scrolling platformer over roofs and broken floors, short swims, melee and a few bullets
against irradiated things, loot, a clock of rads, and the boat home. Nobody dies for good: the lost are stranded, and a
rescue is the next expedition. GAME.md has the loop.

## Relations

- **P129** (the canon) — this phase is its measurement; its §12 ruling 3 (the month-two test) is THE-TEST.md's ask 7.
- **P126** (the play kit) — PLY-001/002 (skill, starter, harness) get built here as the minimum; PLY-003's shelf gets its
  first entry (the people); PLY-007's shape (with and without) is THE-TEST.md's two arms.
- **P118 CANON.md** (the castle procedure) — the rounds, LOOK.md, no automatic camera motion, the owner's device.
- **Life Sim, Triage, Threadspace** — the people pipeline, the sandbox, the cutaway and the model declaration come from
  there; nothing is copied into the stranger's folder except the harness and the shelf.
- **OWN-023, OWN-018** — the stranger-round recipe (memory: a fresh folder, record what the agent could reach).

## Rulings

Ruled 2026-10-30 (s1), each with the question as asked:

1. **The setting.** Asked: *"where does the colony live?"* (metro recommended; a tower in a drowned world; a buried ark).
   **Ruled: a tower, drowned world** (not the recommendation). GAME.md rewritten for it; THE-TEST.md asks 5 and 7
   reworded (the roof, not the mezzanine; a drowned lighthouse with glowing jellyfish, not a flooded station with eels).
2. **Who it is for** and 3. **Death.** Asked together: *"Who is the game for, and can people die?"* **Ruled: you, PG like
   Triage, no deaths** (as recommended): irradiated monsters, no gore; a fallen dweller is stranded and the next
   expedition is the rescue.
4. **The people.** Asked: flat animated pictures made from Life Sim's 12 realistic people for the crowd, real 3D for the
   1–3 you steer, a test page on the tablet first (200 and 400 flat beside real 3D, frame rate on screen). **Ruled: build
   the test page** (as recommended). Nothing about the look is claimed until it has run on the tablet.
5. **Two arms or one,** 6. **Who is the pedant** and 7. **Where the lab lives.** Asked together. **Ruled: two copies, you
   are the owner, built in `~/vscode_projects/platform-lab/A` and `/B`** (as recommended), outside this repo; the game
   comes back into `dev-docs/parked/platform/` afterwards.

9. **The people's look.** Asked (s1b–s1c): which library, and whether to make Rocketbox's clean people read as
   survivors (scavenged mixes, wear, survivor gear) or allow a paid pack. **Ruled 2026-10-30: *"simple functional
   clothes, no customisation, and just make do with what we have. They don't need to look dirty or worn, they're quite
   small and I think it's not worth the effort."*** So: Rocketbox people in functional clothes as the library ships
   them; no recolouring, no wardrobe, no survivor pass, no paid pack. (After *"The 2D models obviously work best"*: the
   crowd is flat.)

Still owed:

8. **The title.** PLATFORM meant the metro station; with the tower it only means "a platformer". Yours, or keep it.

## Records

| date | what |
|---|---|
| 2026-10-30 | scoped: brief, game, people research (three.js has no stock skinned instancing; InstancedMesh2 and VAT are the two library routes; sprites from the 3D models are the fit for a fixed side view), the test protocol with ten pedantic asks and two arms; nothing built |
| 2026-10-30 | s1: rulings 1–7 in (the tower, not the metro; GAME.md rewritten, THE-TEST asks 5 and 7 reworded); the people probe built in `dev-docs/parked/platform-probe/` (200 and 400 flat people in one draw call, recoloured; 24 real 3D as the yardstick; a side-by-side page), driven green headless, built for nodegx.io/lab/; waits on Richard's tablet run |
| 2026-10-30 | s1b: Richard: flat wins, so try heavier, more interesting people, with armour and weapons. The zoo built (`platform-probe/zoo.html`, PEOPLE.md §7): 19 people from four libraries (Rocketbox job outfits MIT, Quaternius CC0, KayKit CC0, Open Source Avatars VRM CC0/CC-BY), all flattened and matching in six clips, gear baked as layers (a row per piece, depth-masked), fitted to any rig from its hand bones; 3/3 dev + static; waits on Richard's pick |
| 2026-10-30 | s1c: Richard: Rocketbox is best but looks like well-dressed Sims, not survivors. Measured: none of the 115 is worn, and no free MIT/CC0 survivor characters exist. Built a bake-time survivor pass (fade, grime, flood stain to a tide line) and a shelf of the five scruffiest Rocketbox people; zoo 24 people, 4/4 dev; next = mismatched outfits + rips + survivor gear layers, or a paid pack if ruled |
| 2026-10-30 | ruling 9: *"simple functional clothes, no customisation … make do with what we have"*. The survivor pass, wardrobe mixes and paid packs are off; the zoo stays in the probe as the record. Next = s2 (the harness) with `kit/people.mjs` = flat Rocketbox people as shipped |
| 2026-10-30 | s2: the harness, [`parked/platform-kit/`](../../parked/platform-kit/README.md). Twelve Rocketbox people (six women, six men, work clothes) baked **ahead** in 8.2 s: one 4096 × 2048 crowd sheet (walk, idle, work, fix, sit, talk; head/chest/hips/hands/feet recorded per cell for pointing) and twelve real-3D party GLBs with 19 clips. The kit (knobs, model, place, design, registry, strings, people), `serve`/`drive`/`what`/`check`. A fixture game (two rooms, 20 flat people, one real): **10 / 10 gates**; gate 1's first draft 24 reds of 101 numbers, none misread; every gate proven to fire on a broken copy, controls green (14 / 14). `CLAUDE.md` written. `_make/lab.mjs` made `platform-lab/A` (packed kit + brief) and `/B` (three.js, the drive tool, the people as GLBs, the brief), one commit each |
| 2026-10-30 | s2b: the lab sealed before s3. A plain `claude` in a lab folder loaded 11 MCP servers, `nodegx` among them (it tells an agent to build any app as a NodeGX project); `..` reached this repo and the other arm. `_make/arm.mjs A\|B` starts Opus 5.5 with no MCP, no skills or commands, and Read/Edit denied outside the arm (proven with a haiku probe beside an unsealed control); `_make/read-lab.mjs` reads an arm's sessions (dollars, minutes, tool calls before the first edit, check runs and reds, reaches outside) and git. s3 = Richard runs `node _make/arm.mjs A` and `B` |
| 2026-10-30–31 | s3–s4: we ran both arms headless (sealed) and relayed Richard's words. Both games fun after two rounds (A *Waterline* 86 min, $17.45; B *High Water* 63 min, $12.80); B looked nearer finished. Heat ask 1 (his): a monster sandbox; B built the better editor by making the creatures parametric on demand in 14 min (7 files); A's sat on its declaration (1 file) but the declaration was too thin. **Closed** on his ruling; RESULTS.md |
