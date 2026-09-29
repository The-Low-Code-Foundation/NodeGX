# Phase 106 — The island grows: a world, the right robot for the job, Olive where a rule cannot decide

**Scoped:** 2026-09-28, from Richard's first play of the packaged "Olive's Island" (P105 s4 build) on the Mac.
**Status: 🟡 session 3 built (2026-09-29): IG-003 ✅ (Drive · Teach · Play; Predict back as an islander's challenge; a `?` on every placed block), IG-004 🟡 (one 46×22 island, a plot per request, save v4, the island tick, the Island page on the renderer; the tablet and the packaged upgrade drive are owed), s2's leftovers (the fold nudge, dry tulips that keep their colour; `go to` scoped for a ruling). Merged gates: 471 specs, page drive 327/327, modes 90/90, island 65/65 (+3D 5/5), Olive 22/22, Workshop 3D 24/24 + nogl 8/8, fixture 18/18, shell 91/91. Session 2 built: IG-002 ✅ (water fetched, stones mined, the load drawn), IG-006 🟡 (Olive reads: three blocks, cards, three requests, five lessons; the FR read is Richard's, one CPU exam run failed a lesson probe), IG-007 🟡 (`Garden 3D` placed in the Workshop behind the `renderer` rule; Richard grades the look, the tablet reads the frame time). Session 1: IG-001 ✅, IG-000 🟡 (the 3D mockup published, Richard grades). Richard ruled 2026-09-28: *"So if we can go 3D and a bit more 'open world' let's do it. I like your thinking."* — R1–R8 as recommended (§3). Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).** **Prefix: `IG`.**
Parent: [Phase 105](../phase-105-the-coding-garden/README.md) (the game as it stands: CG-001–CG-008).

## 0. Richard's words, verbatim, the same day

> *"one thing I really liked about Autonauts was this concept of building a world where the robots are trained
> to do a particular mission and you leave them doing their thing and move on to another area to add another
> robot scenario, but you see all the scenarios happening in the peripheries and it feels like you're building up
> a world of robots. We don't need an RTS thing … but a bit more of a proper world building scenario would be
> amazing IF it's actually feasible."*

> *"If you tell me we can switch to Fable and it can switch the 2D world into a simple 3D polygon world that will
> run on the kids' tablets and be able to pan around zoom and see the robots moving around a 3D world, that would
> be epic. I've seen a lot of vibe coded games from Codex and Gemini, are we saying Claude isn't up to the task??"*

> 1. *"The missions are childish in a way that seems excessive. … watering the tulips, there are patches of water,
>    and it feels more obvious that Pip should be collecting water, watering a tulip, going back to collect water
>    … There are rocks on the map that could be 'mined' to make that happen, and placing the 'rocks' looks silly.
>    The rocks and the postbox are like emojis in a miniscule white bubble."*
> 2. *"we're missing a kind of 'free roaming' mode where you can just give pip a command like 'forward' and he just
>    goes forward … once you see you have the right combination of actions you move into teaching mode to do the
>    scratch and lock it in for the robot to start repeating."*
> 3. *"Wtf is predict? It seems completely useless, unless I'm misunderstanding but then it's bad UX"*
> 4. *"Olive at the bottom of the screen seems to not really give any useful advice, or the advice doesn't
>    correspond to the situation or actions available. Also 'Ask Olive' does fuck all. Adding an AI step also
>    seems to do fuck all, unless you do step by step in which case the Olive block at the bottom loads infinitely"*
> 5. *"The highlighting around the scratch steps is hard to see, it's yellow on a pale yellow background"*
> 6. *"the AI steps don't make sense and don't work … the steps have no explanation about what they do … 'Is it
>    a... ?' has two parts you need to fill in, but it's not clear why … 'without the letter e' and I'd have to be
>    a neurosurgeon to work out what that actually means … I think we fucked up the AI part of the app. … It should
>    be used in steps where a programmatic workflow isn't 100% reliable, and you need an AI step to make sure like
>    the tulip hasn't died or isn't getting overwatered or something, something only an LLM could detect by being
>    fed the data and the instructions … 'ah yes this is really where an LLM unlocks the whole game'"*
> 7. *"having just one robot is a bit limited. … 'the right robot for the job', where as you progress you unlock
>    robots who have new scratch abilities … a watering robot, a rock laying robot, etc. Each one with its own
>    name, its own accessories and upgrades."*

## 1. What was measured against each point (2026-09-28, HEAD `fb9420a63`)

The generator sources are `packages/noodl-mcp/tests/cg00{2,3,5,7}*.ts`; the kit is
`library/modules/garden-kit/src/kit.js`; the shell is `phase-105…/garden-desktop/shell/`.

### The world (global point 1)

- **It was in the spec and it was dropped.** TPL-012 §2.3 ends: *"The world grows: a request completed leaves the
  tulips watered, the path built, the cat fed, and the child's programs keep running on the island the way
  Autonauts' bots do."* Ruling R10 (s3) chose the mockup's **sea with pins** for the Island page, and no task
  ever carried the "programs keep running" sentence. Today:
  - every request is an isolated 8×6 scene built fresh by `Start world` (`cg003Scripts.ts:105-133`);
  - the Island page has **no tile world** at all: CSS sea and land, six decorative pins, one one-tile `Garden`
    for the kid's robot (`cg003Components.ts:1201-1244`);
  - **no program is ever saved.** `gardenProgram` is an in-memory Variable; the profile has no program field;
    `Complete request` only marks done, blooms a trick and gives the reward (`cg002Scripts.ts:851-871`);
  - the save model's `island.placed` array exists and is **never written** by any glue.
- **What already exists for it:** the engine's world is `{map, things, robots[], events, schedule}` and steps any
  number of robots (`robotOf`, engine AC8); the kit draws N robots (`robotPlaces`, `kit.js:1032-1056`) and was
  measured at 12×8 with two robots: p95 29.9 ms at CPU ×4 on the Mac (target < 50). `runToEnd` runs a program
  with no Olive, deterministically (`cg002Scripts.ts:404-414`) — that is the "robot keeps working" loop for free.
- **Verdict: feasible, no RTS needed.** One persistent island grid per kid; each islander's request is a **plot**
  on it (a rectangle of tiles); winning a request **pins the program and the robot to the plot**, and the Island
  page steps every pinned program on one timer so the robots are seen working from the periphery. Nothing is
  maintained, mined for the economy, or lost. Cost: save model v4 (plots + programs + robots), a request field
  `plot`, an island tick script, the Island page rebuilt on the kit's `Garden` instead of CSS pins, a camera
  (pan/zoom). Two sessions in 2D. This is the change that makes point 7 (robots) and point 1 (resources) land
  somewhere.

### 3D (global point 2)

- **Nothing in the way of it but a ruling.** The renderer is a DOM grid with inline SVG sprites (no canvas, no
  WebGL: 0 hits for `getContext`/`webgl`/`three` in the kit). It was chosen in CG-001 for tablet safety, not
  because 3D was judged impossible. The kit's contract is **ports** (`Map`, `Things`, `Robots`, `Bubble`, running
  id, tapped tile), so a `Garden 3D` node with the same ports is a **renderer swap**: the engine, the requests,
  the fold, Olive and the pages do not change.
- **The pattern exists in the library:** `maplibre` vendors an 803 KB WebGL library through `manifest.json`
  `dependencies` (`library/modules/maplibre/project/noodl_modules/maplibre/manifest.json`); three.js minified
  is ~0.7 MB. The app already ships a 532 MB model; size is not the question.
- **The tablet is the question, and it is unmeasured:** Core m3-7Y30 with Intel HD 615, Windows 10, 4 GB. WebGL2
  in Chrome/Electron on that GPU handles a low-poly scene of a few hundred meshes at 60 fps; what is unknown is
  the frame rate **while Olive runs on the same CPU** (on the Windows runner every Olive call already passes
  12 s, CG-008 §9). A 3D spike is worth nothing until it is timed on the tablet with a model call in flight.
- **Where vibe-coded 3D games get their look:** asset packs (Kenney's CC0 nature/character kits) or
  deliberately flat-shaded primitives (boxes, cones, spheres, a toon material). Both are available here; the
  second needs no download and no licence file and is the honest first pass. The mockup's palette carries over.
- **Verdict: feasible; do it as its own lane, after the world model.** The world model (plots, robots,
  resources) is renderer-agnostic and is the bigger product change; the renderer is a port-level swap that can
  be driven in a worktree against the same engine and graded on the tablet. Doing 3D first would rebuild the
  Island page twice.

### 1. "Childish": resources, mining, the emoji pills

- **The pills are a page-glue shortcut, not a kit sprite:** the kit knows tiles `grass path water tree rock house
  bed` and things `tulip puddle letter bowl label`. A **stone**, the **post box** and the Predict flag are
  `label` things with emoji text (`🪨 📮 🏁`, `cg003Scripts.ts:160-176`) drawn in an 11 px white pill
  (`kit.js:1004`). The post box tile itself is drawn as **path**.
- **There is no water resource:** `water` acts on the tile ahead for free, forever (`cg002Scripts.ts:271-277`).
  Water tiles are obstacles (`BLOCKING_TILES = W R T H`). The rock is also an obstacle, never a source.
- **There is already an inventory:** `carry[]` with a basket of 4; `pick`/`put` of `letter egg stone food`; the
  path-stones request **starts** with 4 stones in the basket (`cg002Content.ts:214`), which is why "placing
  rocks" comes from nowhere. The kit does not draw what a robot carries.
- **Verdict: the model is one step from what Richard describes.** Add `fill` (at a water tile: the can holds
  N waters; each `water` spends one; an empty can makes nothing happen and the tulip stays dry — the error
  message) and let `pick` at a rock tile yield a stone (a rock has M stones, then it is a small rock, then
  gone). Draw stone, post box, the carried load and the can level as SVG sprites in the kit. Rewrite the
  tulips and the path requests around fetch-and-return: the loop the child discovers is `repeat: fill, go,
  water, come back`, which is a better loop than `repeat 4: forward`.

### 2. Free roaming (drive without recording)

- **Measured: there is no drive-only mode.** Every pad press records a block AND moves the robot
  (`RECORD_STEP_SCRIPT`, `cg003Scripts.ts:196-226`; the comment at `cg003Components.ts:931` says so). The pad
  is fixed to `fwd left water right` regardless of the request (its only input is `show`), so on the stones
  request `put down` can only come from the palette, where a tap adds a block **without** moving the robot.
- **Verdict: build the mode Richard describes; it is Autonauts' own order.** Three states on the bar: **Drive**
  (a pad for every action the request allows; the robot moves, nothing is recorded), **Teach** (as now: the
  robot moves and the steps are recorded), **Play**. Drive is also the free-roaming the younger band wants.
  Small: the pad gets a filtered action list and a `record` flag.

### 3. Predict

- **Measured:** band 10–12 only (`mounted` on `isOlder`). Pressing it shows "Where will Pip end? Tap a tile."
  and arms the next tile tap; the tap runs the program silently with `runToEnd` and compares the end tile.
  A **hit just plays the program with no message**; a miss sets a flag, draws 🏁 on the real end and the hint
  becomes "You tapped one tile, Pip stopped on another". One step does not cancel predict mode, so a later tap
  still counts as a guess. It is the 6e programme's *prévoir avant d'exécuter* (TPL-012 §2.1) built as a bare
  button with no framing.
- **Verdict: a ruling (R5).** Either cut it from the bar, or make it an islander's challenge on named requests
  ("Before you press Play, show me where Pip will stop"), with a visible "You were right!" and the flag on a
  miss. Not both a permanent button and no explanation.

### 4. Olive's advice, the Ask Olive button, the infinite "thinking"

- **The hint table is 11 rules, first match wins** (`CHOOSE_HINT_SCRIPT`, `cg002Scripts.ts:643-676`). Three
  defects explain what Richard saw:
  - **"Perfect! Could you do it with fewer blocks?"** fires on **every** win of ≤ 8 blocks (`MANY_BLOCKS = 8`),
    including `repeat 4 × (put down, forward)` = 3 blocks, which is the request's own `referenceProgram`
    (`cg002Content.ts:220`). The reference program is never fed to the hint.
  - **Free play has no branch:** its goal is `[]` so `goalMet` is never true; every run falls to bump / puddle /
    "did w of t" / "Not quite yet".
  - **A run leaks across requests:** `gardenRun` is never reset (Start over and a request change only call
    `Runner stop`), so the previous request's bumps, puddles and `ran` shape the next request's first hint.
- **"Ask Olive" is a hint refresh:** its only wire is `plChoose go` (`cg003Components.ts:1040`). It sends no
  question and runs nothing; if the hint key is unchanged, nothing visible happens.
- **"Olive is thinking" never clears in One step:** the Runner parks on an ask block (`run.waiting = true`);
  the answer arrives and hits `rnLoop`, whose condition is `mode == playing`, so in step mode it is ignored and
  `waiting` stays true until the **next** Step press (`cg003Components.ts:622-628`, `cg005Olive.ts:458`).
  Start over and Teach do not reset it either. Pressing One step while she thinks sends a duplicate ask.
- **Verdict: defects, no ruling needed (§4).** The button goes or becomes something that asks.

### 5. The running-block highlight

- **Measured:** `.gd-blk.gd-run { outline: 3px solid var(--gd-run) }` with `--block-run = #FFD166` (the `--sun`
  token). It sits on the steps panel `#FFFFFF` (1.44:1) and inside a repeat on `#FFF0DA` (1.29:1). Against the
  block fills it is 3.2–3.4:1. Nothing else marks the running block.
- **Verdict: defect (§4).** A dark ring (the ink colour) plus a lift, or a pulsing fill, measured ≥ 3:1 on
  both backgrounds; the same token feeds the drag drop-line and should not.

### 6. The AI steps

- **Measured: the family is not wired to anything a child can see or use.**
  - Olive's answers are **never displayed**: a `blocks` answer becomes the proposal card; every other answer is
    stored in `run.lastAnswer` and no bubble, card or line shows it (`cg002Scripts.ts:341`; the kit's `olive`
    bubble style is unused). The plain `say` block also shows no bubble (`delta.say` without `sayKey`).
  - The `olive_says` sensor exists in the engine but **is not in the picker's SENSORS list**
    (`cg003Scripts.ts:230`), and `repeat n = 'olive'` cannot be set from the kit — so **"if Olive says yes"
    cannot be built**, although the rung 5 hint tells the child to build it.
  - Rung 9's after-run line says "Olive used the letter e anyway" **whether she did or not**; no block checks
    letters; the sentence is never shown.
  - **No block has an explanation.** The palette tooltip is the label; the per-rung "how to use it" lines
    (`or#Line`) are defined and rendered nowhere; the Skills cards use different titles from the block labels
    ("Olive and the rule" vs "without the letter e"). `do [row]` is the "run a named trick" block with three
    hardcoded names and no trick to run in free play.
- **What Richard imagines, against the model readout (TPL-012 §2.6, 55 probes ×2–3):** "the tulip has died / is
  overwatered, only an LLM could tell" is a **judgement**, and judgement is the column Qwen3.5-0.8B fails
  reliably (mood always "triste", a watering can is an "animal", 14+9 → 14). Building the unlock there would
  build it on the model's failures. The column it **passes** is **reading and naming**: pick the object a
  sentence asks for (6/6), words → blocks (9/9), positive yes/no about a concrete thing (16/18), FR → EN (3/3).
- **Verdict: rebuild the AI part on the passing column, and put it where a rule cannot reach — free text.**
  The game's world is fully known to the program; the one thing a program cannot parse is **what an islander
  wrote**. So Olive's job in a program is to read: Mamie's note says which flowers today ("the red ones, not
  the yellow"), Sami's letter says where to go, a sign says what a plot needs. Three blocks, each with an
  answer the child can see and wire:
  - `read [note] → what` (the object/place named; feeds `go to` / `if Olive read …`),
  - `ask Olive: is the thing ahead [a flower]?` as an **if-sensor** with a yes/no the child sees, and a majority
    vote when it is wrong (rung 6, the one rung that is a real programming lesson),
  - `say` (the delight; the bubble must show).
  The eighteen "lessons about the model" leave the Workshop palette; the ones worth keeping (count, maths,
  the rule, tall tales) become an **Olive's lessons** page of canned exercises for band 10–12, or are cut (R7).
  Every block gets a one-line card and an example on first tap. A ruling (R6/R7).

### 7. The right robot for the job

- **Measured:** one robot per profile (`profile.robot = {name, color, eye, hat}`); the engine and the kit take N
  robots; the palette is `band × request.palette`, a **filter on an input** (`PALETTE_SCRIPT`,
  `cg002Scripts.ts:698-740`), so a per-robot ability list is a new input, not an engine change. Rewards today
  are hats, stickers, items and seeds.
- **Verdict: feasible and it completes the world model.** Robots are unlocked by islanders and each robot has an
  ability set (its palette), a name the child can change, a colour, a hat slot and an upgrade or two (a bigger
  can, a bigger basket = the `basket` field that already exists). The robot that solves a plot is the robot
  that stays on it working, so a new job needs a new robot — which is the reason to unlock one.

## 2. The product, in one sentence each

> **A child looks at her island from above, pans to a plot, and sees the robot she taught last week still
> watering the row. An islander on the next plot asks for a path; she has no robot that carries stones, so
> Sami lends her one. She drives it around first, then teaches it, and leaves it laying stones while she
> zooms out to watch all three work.**

> **The owl is the only one on the island who can read. When a note says which flowers want water today, the
> child asks Olive to read it and wires the answer into an `if`. When Olive is wrong, three asks and a count
> put it right.**

## 3. Rulings, in plain words

**Ruled 2026-09-28** from *"if we can go 3D and a bit more 'open world' let's do it. I like your thinking. Can we scope these into tasks please?"*: every row takes its first option. One change to the recommendation because of "go 3D": the renderer lane (IG-007) starts in session 1 beside the fixes, on the Workshop scene, so the Island page (IG-004) is built once, on the 3D node with the 2D node as the fallback. R2's tablet gate stands: below 30 fps with Olive in flight, the tablet gets the 2D renderer and the numbers come back here.

| # | Question | Options (first = recommended = RULED) |
|---|---|---|
| R1 | **The island becomes one world:** each request is a plot on one persistent grid per kid, and a won plot keeps its robot running its program, visible from the map. This replaces the sea with pins (R10 of P105). Yes? | **Yes, in 2D first** / keep the pins and add a "working robots" strip / no |
| R2 | **3D:** build a `Garden 3D` renderer node (three.js, flat-shaded low-poly, pan and zoom) as a separate lane, graded on the tablet with Olive running, and only then decide whether it replaces the 2D world? | **Yes, as a lane after R1 lands, gate = tablet frame time with a model call in flight** / 3D now, world later / stay 2D |
| R3 | **Resources:** water is fetched from a water tile (the can holds N), stones are picked from rocks (a rock yields M, then shrinks); the tulips and path requests are rewritten around fetch-and-return. Yes? | **Yes** / water free, stones mined / keep both free |
| R4 | **Drive mode:** a third state on the bar, Drive (move, nothing recorded, every allowed action on the pad), before Teach. Yes? | **Yes** / fold Drive into Teach with a record toggle |
| R5 | **Predict:** cut the button; it comes back only as a named islander challenge with a visible right/wrong? | **Yes, cut and re-enter as a challenge** / cut for good / keep the button with an explanation |
| R6 | **Olive's blocks become three: read, is-it-a (as an if-sensor with a visible yes/no), say.** Every block gets a card on first tap. Yes? | **Yes** / keep the current family and wire it up / cut Olive from the Workshop altogether |
| R7 | **The 18 lessons about the model** (counting, maths, the rule, tall tales…): move to an "Olive's lessons" page of canned exercises for band 10–12, or cut? | **Move, five lessons at most** / cut / keep as blocks |
| R8 | **Robots for the job:** unlocked by islanders, each with its own palette, name, colour, hat slot and an upgrade (bigger can, bigger basket). Rewards become robots and upgrades. Yes? | **Yes** / one robot that gains abilities (today) |
| R9 | **Ruled 2026-09-29 (s3), NOT the recommended option.** IG-004 as written did not add up: every request an 8×6 plot on a 24×16 island, but there are 12 requests + free play = 13 plots (576+ tiles) and 24×16 has 384 (room for about six; the mockup shows three). How do the requests sit on the island? | six places, requests share one (recommended) / **a bigger island, one plot per request (≈36–46 × 22, ≈800–1000 tiles) — RULED** (built s3: `REQUESTS` holds 13, not 12, so 14 plots + home on 5×3 slots = **46 × 22**, 1012 tiles; the 2D gate held, p95 16.7 ms at CPU ×4); the 2D fallback draws ≈2× the tiles, so IG-004 AC6's 2D frame gate is the risk to read / 24×16 with only some requests drawn |

**What does not change, unless said:** the model (R3 of P105: Qwen3.5-0.8B, one model for every child), no
chat, no free text to the model, nothing timed or scored, one island per kid, nothing leaves the house.

**One honest line on the model:** the LLM moment Richard imagines ("only an LLM could tell the tulip is
dying") is a judgement, and the shipped model fails judgements 3/3. Reading free text is the moment it wins
16/18 or better. If Richard wants judgement, that is a bigger model on the Mac only, which reopens P105 R3.

## 4. Defects with no ruling needed (fix first, one lane, half a session)

Each was measured above; none blocks a ruling and every one is on the surface Richard saw.

| # | Defect | Where |
|---|---|---|
| D1 | "Olive is thinking" never clears in One step; Start over / Teach do not clear it; a Step while she thinks sends a duplicate ask | `cg003Components.ts:622-640`, `cg005Olive.ts:458` |
| D2 | `gardenRun` leaks across requests: the last request's bumps, puddles and `ran` shape the next one's hint | `cg003Components.ts:900, 1031` |
| D3 | "fewer blocks" fires on every win ≤ 8 blocks, including the reference program; feed `referenceProgram`'s count and say "Perfect!" when matched | `cg002Scripts.ts:667`, `cg002Content.ts:220` |
| D4 | Free play has no hint branch (goal `[]`), so it says "Not quite yet" / "did w of t" | `cg002Scripts.ts:435, 643-676` |
| D5 | The running-block ring is `#FFD166` on white (1.44:1) and on `#FFF0DA` (1.29:1) | `kit.js:363`, `cg007Look.ts:128` |
| D6 | Olive's answers are never shown; `say` shows no bubble | `cg002Scripts.ts:292, 341`, `cg003Scripts.ts:193` |
| D7 | `olive_says` missing from the picker's sensors; "if Olive says" cannot be built | `cg003Scripts.ts:230` |
| D8 | The "Ask Olive" button is a hint refresh with no visible effect | `cg003Components.ts:1040` |
| D9 | Stone, post box and the flag are emoji in an 11 px pill; the post box tile draws as path | `cg003Scripts.ts:160-186`, `kit.js:1004` |
| D10 | The pad is fixed to `fwd left water right` whatever the request allows | `cg003Content.ts:123-128`, `cg003Components.ts:545` |

## 5. The board

| Task | What | Depends on | Lane | Status |
|---|---|---|---|---|
| [IG-000 — the mockup](IG-000-THE-MOCKUP.md) | the island in flat-shaded 3D, Drive/Teach/Play, the robot cards, Olive reads — an artifact Richard grades; the first frame-time reading on the tablet | — | M | 🟡 built, published (s1) — Richard grades, tablet reads |
| [IG-001 — the fixes](IG-001-THE-FIXES.md) | §4 D1–D10, each driven: the stuck thinking, the run leak, "fewer blocks", free play's hint, the ring, answers shown, `olive_says`, the button, the sprites, the pad | — | A | ✅ s1, 11/11 ACs |
| [IG-002 — resources](IG-002-RESOURCES-AND-SPRITES.md) | `fill` and the can, stones from rocks, the load drawn; tulips and path rewritten as fetch-and-return (R3) | 001 | A | ✅ s2, 6/6 ACs (AC3's “Perfect!” at band 10–12 only) |
| [IG-003 — Drive, Teach, Play](IG-003-DRIVE-TEACH-PLAY.md) | the Drive state, the pad by request, Predict cut and re-entered as an islander challenge (R4, R5) | 001 | B | ✅ s3, 6/6 ACs (Richard reads the `ig3` FR lines) |
| [IG-004 — the island as a world](IG-004-THE-ISLAND-AS-A-WORLD.md) | one island per kid (46×22 after R9: 14 plots — 13 requests + free play — and home), plots from requests, save v4, pinned programs, the island tick, the Island page on the renderer (R1, R9) | 002, 007 | E | 🟡 s3: AC1–5 driven, AC6 Mac 2D p95 16.7 ms at CPU ×4, AC7 but the packaged upgrade drive; the tablet (AC6 3D) is Richard's |
| [IG-005 — robots for the job](IG-005-ROBOTS-FOR-THE-JOB.md) | Pip, Cobble, Pocket, Echo: palette per robot, unlocked by islanders, upgrades, My robots (R8) | 004 | B | ⬜ |
| [IG-006 — Olive reads](IG-006-OLIVE-READS.md) | `read`, `is it a…?` as an if-sensor with the vote, `say`; a card per block; five lessons on Skills; the exam re-cut (R6, R7) | 001, 002 | C | 🟡 s2: AC1–4, 6, 7 driven; AC5 FR read = Richard; AC8 CPU exam 2/3 (a lesson probe); `go to [what Olive read]` not built |
| [IG-007 — Garden 3D](IG-007-GARDEN-3D.md) | `garden-3d-kit`: `Garden 3D` on the same ports, three.js vendored, primitives, pan/zoom, the 2D fallback by rule; **gate = tablet frame time with Olive in flight** (R2) | 000 for the look | D (worktree) | 🟡 s2: AC1 (Mac, software GL), AC2, AC4, AC6 (module, picker, template) driven; AC5 = Richard's grade, AC3 = the tablet, AC6's Windows installer |
| [IG-008 — the kids' verdict](IG-008-THE-KIDS-VERDICT.md) | the two children play; their words the same day | all | — | ⬜ |

### Order and lanes

- **Session 1:** IG-001 (lane A, first job) ∥ IG-000 (lane M) ∥ IG-007 on the Workshop scene (lane D, worktree).
  Richard grades the mockup and reads the tablet's frame time at the end of it.
- **Session 2 (as run, 2026-09-29):** IG-002 (A) ∥ IG-006 (C) ∥ IG-007 placement + fallback + look (D); merged on `cline-dev`.
- **Session 3 (as run, 2026-09-29):** R9 ruled at the start; IG-003 (B) ∥ IG-004 (E) ∥ s2's leftovers (F); merged on `cline-dev` (`e8f8533bf` → `11ec09771`).
- **Session 4:** IG-005 (B) ∥ the s3 look/behaviour leftovers (NEXT-SESSION-PROMPT); the Windows build through P105 CG-008's workflow when Richard says push; then IG-008.
- Every session ends with `/next` (the handoff and the memory) — the standing rule. Lanes share no files
  except `cg002Content.ts` (the vocabulary, IG-002 owns it) and the word table (append-only per lane).

Gates as P105 §6 (the kit in a two-module project, the engine in both languages and bands, the template
regenerated byte-identical, the pages driven at both sizes, the look beside the mockup, the exam on the real
model, the Windows installer). A working wireframe is not the mockup: IG-000 before IG-004 and IG-007's look.

## 6. Out of scope

An economy (raw materials that run out, upkeep, failure states); multiplayer; a bigger model on the tablet; a
model the child chats with; anything timed or scored; the kids' names in this repo.
