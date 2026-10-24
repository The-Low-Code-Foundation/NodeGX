# Phase 126 — The play kit: our games' learnings, for anyone's Claude Code

**Opened:** 2026-10-24, by Richard: *"let's write it up and add a lane but maybe less priority than the Claude NodeGX
Studio integration and publishing."* **Lane:** 8 on the [board](../../BOARD.md), below lanes 2 and 3.

> "If you compare the disappointing result of the zombie game we made in another repo … to the success we had with the
> gala dance game and the threadspace game, it's night and day. … Do you think there's a world in which nodegx has a
> specific npm package for game design that's called upon when someone needs 3D rendering … that uses nodegx principles
> (or not) and our learnings here to promise users a faster 'first play' experience that really takes into account
> their desires and play style? … and of course there's NodeGX to handle the surrounding game menus and interfaces like
> the right menu in all the games we've made so far, which I think is actually a VERY clever way of making games without
> going FULL 3D and taxing the LLM too much" — Richard, 2026-10-24

> "I'd add in things like access to 3D models we know look good as starting points, like the Minecraft style
> characters, castle, spaceship and station, asteroids, etc. so we can start making a library of the most common 3D
> objects that we already have a good, open source model for, perhaps not installed with the npm package but as
> optional extra packages? Or a Github repo to pull from as needed? Maybe also pulling in other open source libraries of
> 3D models we confirm actually look good … I want people to take advantage of our learnings and skills in this repo as
> much as I now can, and keep contributing to it as we go. Perhaps users of the npm package can opt in to having their
> best models shared with whatever open source library we create, so the community also contribute to it (with
> moderator review I suppose)." — Richard, 2026-10-24

## The claim, as Richard ruled it (2026-10-24)

Two claims, kept apart:

1. **Faster to first fun play.** This means *removing the learning and trial-and-error phase* from the toy build, not
   NodeGX making 3D development faster: *"by faster I just meant removing the learning and trial and error phase from
   the 'to the first fun play' build and the 'toy' version."* The kit carries what we paid for (the procedure, the
   traps, the harness, objects that already look good). The claim reaches the site only after PLY-007 measures it.
2. **NodeGX for the menus around the world.** The right-hand panel in every game so far (the Gala's plan and shop,
   Threadspace's crew and orders, Squirm's brain) is app work. Built in NodeGX, it can be edited and tweaked later by a
   person, in Studio. That is the NodeGX claim: *"it opens up the possibility for easier game editing and tweaking in
   the future, not that it makes the development faster."*

We are **not** claiming that a node graph makes 3D easier for an LLM. OWN-023 round 3 measured the app layer and found a
tie on Opus and code ahead on DeepSeek. The per-frame game loop stays code.

## Why the good games were good (what the kit carries)

Dead Weight (`~/vscode_projects/dead-weight`, June–August 2026, top-down zombie survival) was specced as a 15-feature
MVP and farmed from a task board: 70 commits, about 22,000 lines, and a 2,800-line `LEARNINGS.md` of fixes after the
fact. The Gala, the castle, Threadspace and Squirm were built the way the castle pilot's
[CANON.md](../phase-118-the-castle-holds/CANON.md) says:

- **The toy is a loop.** It starts as the smallest version that's fun. Richard plays it, his list goes into LOOK.md
  word for word, and one pass builds every point. The fun arrived in the rounds (CANON §1–2).
- **Two playable sketches, not descriptions.** Richard picked Coin Run over Mole Bop in one click (three-in-nodes s5, R5).
- **Copy the genre for each solved mechanic** (camera, controls, inventory) before building it (CANON §3).
- **Look, don't trust a count.** Threadspace passed 21/21 on a picture of a grey wall. No boarding shot landed while
  its check passed. The castle's Retina canvas showed a quarter of the scene for five versions while every headless
  drive at pixel ratio 1 looked right (CANON §4). The kit's harness screenshots every view at the person's device
  ratio, gates "what do I see" on a centre-ray read (`__game.debug.see()`), and exits 1 on a failed check.
- **Shapes that held:** a pure engine with no rendering in it (the Gala's `src/engine.js`), the world drawn
  separately, the panel as DOM over `game.state` plus verbs (Threadspace's `panel.mjs`), the data as rows
  (`data.mjs`), and entities with seats and controllers.
- **Traps, each measured once:** a fixed pool of 8 lights (19 point lights made boarding unplayable on a Mac), shell
  faces on their own layer, a dt clamp of 0.1 (0.05 ran game time at half speed under software GL), rays cast in the
  right frame, `Box3.setFromObject` measuring in world space, no automatic camera motion (CANON §5), `for…of` over a
  Map running zero times in the viewer, and the rest in the trap list PLY-001 gathers.

## What exists on day one

**Measured 2026-10-24:** the repo holds **no model files** (`git ls-files` over `*.glb *.gltf *.fbx *.obj`, tracked
and untracked: 0). Every object that looks good is **code**: a function that builds a three.js group from parameters.

| object | where | entry points |
|---|---|---|
| blocky Minecraft-style people, looks, rifle | `dev-docs/parked/threadspace/public/src/people.mjs` | `makePerson`, `LOOKS`, `randomLook`, `animatePerson`, `rifle` |
| ships: frigate, fighter, corvette, freighter, gate, pod | `…/threadspace/public/src/ships.mjs` | `frigate`, `fighter`, …, `loft`, `metal`, `SHELL_LAYER` |
| station, asteroid field, derelict | `…/threadspace/public/src/scenery.mjs` | `station`, `asteroidField`, `derelict` |
| dressed interiors: panels, signs, screens, pipes, baking | `…/threadspace/public/src/decor.mjs` | `surfaces`, `sign`, `screen`, `pipe`, `bake` |
| light pool | `…/threadspace/public/src/lights.mjs` | |
| castle, defenders, forest | `dev-docs/tasks/phase-118-the-castle-holds/toy/index.html` | one file |
| dancers on counts, dance school | `dev-docs/tasks/phase-122-the-gala/game/src/{people,world}.js` | 🔴 the folder is untracked and holds facts about Richard's children; copy code only, never data |
| worm, connectome creature | `dev-docs/parked/squirm/src/` | `creature.js`, `engine.js` |
| three.js as NodeGX nodes | `library/modules/three-kit/` (`@nodegx/three-kit`) | Scene, Mesh, Light, Group, Body, Camera, Keys |
| drive harness | `dev-docs/parked/three-in-nodes/editor/tools/drive.mjs` (Threadspace uses it) | `expect`, exit 1, 45 s stuck guard |

That code-not-files finding shapes the shelf. A generator suits an LLM: it can read it, and change a paint, a look or a
seed, but it cannot read a `.glb`. So the shelf has two kinds of entry: **generators** (ours, as code, with parameters)
and **files** (glTF from vetted open packs and from the community). Every entry gets a **render card**: the same light,
the same three angles, at pixel ratio 2. "Looks good" is a judgement made on that picture, by Richard or a moderator.

## The parts

| id | task | depends on |
|---|---|---|
| [PLY-001](PLY-001-THE-SKILL-A-STRANGER-READS.md) | the skill a stranger's Claude Code reads: procedure, traps, harness recipe | — (the base version Richard asked for "at the very least") |
| [PLY-002](PLY-002-THE-STARTER-AND-THE-HARNESS.md) | `npx @nodegx/play new`: the four-part starter and the drive harness | 001 |
| [PLY-003](PLY-003-OUR-SHELF.md) | our shelf: the generators we already have, extracted and carded | R2 (licence) |
| [PLY-004](PLY-004-OTHER-PEOPLES-SHELVES.md) | open packs we've confirmed look good (Kenney, Quaternius, Poly Haven …), licences checked per pack | 003's card |
| [PLY-005](PLY-005-THE-PANEL-IS-A-NODEGX-APP.md) | the panel built in NodeGX: the world as one kit node, menus a person tweaks in Studio | 002, lane 2's Studio |
| [PLY-006](PLY-006-THE-COMMUNITY-SHELF.md) | opt-in sharing of a person's best models, moderator review | 003, 004 |
| [PLY-007](PLY-007-FIRST-PLAY-MEASURED.md) | first play, measured: a stranger's Claude Code with and without the kit | 001–003 |
| [PLY-008](PLY-008-THE-GAME-IN-STUDIO-IN-THE-CONVERSATION.md) | the game in Studio inside Claude Desktop: a probe first (does WebGL draw, do keys arrive, does a write reset the game), then the Studio changes, handed to lane 2 | probe: CCN-001 ✅; rest: lane 2 |

**PLY-008's probe comes first, ahead of the lane's priority.** Richard's worry (2026-10-24) is that Studio settles
into a shape that games can't use. The probe is one sitting, so run it before Studio V1 freezes, and give its results
to lane 2.

PLY-001 → 002 → 003 is the base version a stranger can use. PLY-007 can run as soon as those three exist, before the
NodeGX half. PLY-005 waits for Studio V1 (lane 2) because its claim is a person editing the menus in Studio.

## Rulings owed (Richard's)

| # | question | recommendation |
|---|---|---|
| R1 | the package name | `@nodegx/play` (one word a person says aloud; "game" is too narrow: Richard also named 3D for graphs and apps) |
| R2 | 🔴 **the shelf's licence.** This repo is GPL-3.0-only, and so is `@nodegx/three-kit`. A stranger who starts a game from a GPL generator owes GPL on the game when they distribute it. Starting points need to be free of that. | publish the shelf (generators and cards) and the starter as **MIT**, the trap list and skill as **CC BY 4.0**. That needs Richard as the copyright holder of that code (written in this repo for him); upstream Noodl code is not part of it |
| R3 | where the shelf lives | a **GitHub repo** (`nodegx/shelf`) as the source of truth. A small catalog (name, kind, licence, card URL, size) ships inside `@nodegx/play`, and `npx @nodegx/play add station` copies one entry into the project and pins the commit, the way `npx @nodegx/three-kit add` copies into `noodl_modules/`. Contributions arrive as PRs, so moderation is PR review, a mechanism that already exists. Packages per set (`@nodegx/shelf-space`) only if offline use or size asks for them |
| R4 | who moderates | Richard first; a second person once PLY-006 has a queue |
| R5 | the procedure's intake questions | the castle's one-exchange brief (CANON procedure §1), plus three questions about play: *which games did you love, what did you actually do in them, what bored you* (Richard's Threadspace list of 30 items was the best brief we have had) |

## Not in it

- **A node-graph game loop for LLMs.** The per-frame code stays code (see the claim). three-in-nodes' Body, Camera and
  behaviour sentences stay the route for *people* composing simple games by hand. They are a different audience, in
  the same family.
- **Our games themselves.** The Gala, Threadspace, Squirm and the castle stay side work Richard names by name (board
  §2). This phase takes their *learnings and objects*, never their roadmaps.
- **Hosting the files ourselves** (a CDN, an upload server) before R3 is ruled.
- **Anything with a brand or an IP lookalike** on the shelf. A hand-made Millennium Falcon is not CC0.
- **Live multiplayer.** Async state (Threadspace's `net.mjs` shape) is a backend concern for lane 6, later.

## Records

A product phase, so it has task files (CANON §9's four-file shape is for a toy, and this is not one). Defects go in
`dev-docs/bugs/` with the prefix `P126-`. The handoff is [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).
