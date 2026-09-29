# Phase 108 — The island works: jobs with a finish line, real blocks, and something to build

**Scoped:** 2026-09-29, from Richard's notes after playing Olive's Island at the end of P106 session 4.
**Status: 🟡 session 1 merged 2026-09-30 — IW-001 ✅, IW-002 engine 🟡, IW-000 🟡 published and graded by Richard. Rulings R1–R4 (§3); R5 open (§3). Start with [NEXT-SESSION-PROMPT.md](NEXT-SESSION-PROMPT.md).**
**Prefix: `IW`.** Parent: [Phase 106](../phase-106-the-island-grows/README.md) (the world, the robots, 3D, Olive reads).
Grandparent: [Phase 105](../phase-105-the-coding-garden/README.md). Research: [TPL-012 briefing](../phase-78-the-templates/tpl-012-research-briefing.md),
Rocket School's [rewards research](../phase-87-the-first-play-test/rkt-010-rewards-research.md), and §5 below (new, 2026-09-29).

## 0. Richard's words, 2026-09-29

> *"the missions are sort of fun, but I feel like there's a world of variety we're missing here. … when Pip is supposed
> to water tulips, they're actually water tiles on the ground that aren't necessary to 'pick up' before watering. …
> Pip would reset and collect the water to feed the tulips over and over … the Rubble first mission where he needs to
> put down rocks to make a path. There's a bug that could in theory turn into a feature: he puts one tiny rock down on
> each of the four squares … if Rubble repeated this activity, and with every repeated activity he increased the
> 'amount of stone' on each path square until it became a path, that would make more sense. It would even make sense
> then to 'bring him home' because at one point the job would be done. … You get the reward when the programming
> workflow runs correctly, and maybe a bonus when the job is fully complete. Maybe the plot could also reset after a
> certain amount of time … and you can repeat the mission for extra points (a system we don't have yet …)."*

> *"Right now the water, the rocks, the letter on the ground, they're always in one place … One of the really cool
> concepts in Autonauts was the robot was taught to 'seek out' trees to cut down or rocks to mine … 'if square contains
> rock, mine' … The rocks or letters or whatever could regenerate eventually."*

> *"the first clause in the 'until' should really be another blockly block, and there we would be greatly helped by the
> ability to set variables. … Why can't the user set the egg as a variable by clicking on it on the 3D map while in
> 'choose variable' mode or something? Then the 'until' block could have added to it 'variable: egg' and you put it in
> a 'count' block, which goes in an 'equals' block and you add the 'number' block and set it to 4. … if you keep adding
> canned clauses it's going to make the list miles long by the time we get to a few dozen missions. The 'if' block is
> another silly one, where the first clause can be 'Pip reads red tulip' you still see the second clause '1 2 3 4 5'."*

> *"in that egg mission, it would make more sense if the robot picks up 4 eggs and then drops them in a basket next to
> the house … In the Biscuit 'keeping going until the wall' mission, there's no wall. … For watering, the robot could
> have to pick up a can, which could be turned into a variable, and then fills the can … If the can water level is
> equal 0, go back and get water."*

> *"you can't drag drop the blockly blocks from the drawer into the workflow … the blockly area isn't big enough …
> maybe it just needs to be taller … You can't cancel a run once it starts … Every time you click a block in the drawer
> for the first time, it throws up the tutorial but doesn't place the block. I actually think the question mark icon on
> the block makes much more sense in the drawer and not on the workflow list of blocks, it's backwards. … the driving
> options don't currently correspond to what's expected in each mission, most of them just have forward and turn."*

> *"Another mission idea: building things. … dropping them at a building site, and the more they drop the resources the
> more the house pops up. … in free place maybe you have a large area for yourself, where you can spend your earned
> 'points' on a blueprint for a building, like a robot spa or an animal refuge … once the animal refuge is there, you
> can buy a sheep and a rabbit … and task a robot with collecting food and feeding them. … not just having one of each
> robot, but having eventually an army of robots … copies of pip or rubble, with their own name, with a job … multiple
> plots needed eventually … closer to Autonauts but without the full game RTS type engine."*

"Rubble" is Richard's name for **Cobble**, the stone robot (`cg002Content.ts:995`). The task files say Cobble.

## 1. What was measured against each point (2026-09-29, HEAD `0ed7447c9`)

Paths are shortened: **C** = `packages/noodl-mcp/tests/cg002Content.ts`, **E** = `…/cg002Scripts.ts` (the engine),
**S3** = `…/cg003Scripts.ts`, **K3** = `…/cg003Components.ts`, **ISL** = `…/ig004Island.ts`, **LOOK** = `…/cg007Look.ts`,
**KIT** = `library/modules/garden-kit/src/kit.js`. Every map is 8×6 (C:915). There are 13 requests (C:175, C:823).

### 1.1 The missions are scenes with a win check, not jobs

| Richard saw | What the code does |
|---|---|
| Water tiles you don't need to fetch from | Only `tulips-three` has a can (`can:0, canMax:3`, C:212). `tulip-door`, `rows-trick`, `mamie-note`, `rock-flower` have no `can` → null → **water is free** (E:187-188, C:142). The reference program of `tulips-three` refills before every tulip, so it never uses the can's 3. |
| One tiny rock per square, no path | `put` drops a `stone` thing on any unblocked tile (E:333, E:479). The tile stays grass; no square has an amount. The win is `thing_at stone` = **at least one** stone (E:502). The stones land on the grass tiles (3..6, 3) of `PPPGGGGB` (C:239). |
| The eggs go nowhere | A picked egg leaves the map into `carry` (E:475-476). There is no basket thing and no drop-off; the win is **carrying 4** (`carrying`, E:506). "Basket" is only the reward's name (C:345). |
| No wall | `wall_ahead` = `blocked()` (E:211) and an out-of-bounds tile counts as blocked: the wall is **the map's edge**. The kit "does not know what a wall is" (KIT:21). |
| The job is never done | On the island a pinned run that ends holds "done" for `ISLAND_HOLD_TICKS = 3` ticks, then the plot **resets and the run restarts forever** (ISL:26-37). Nothing wears, nothing finishes, the robot never comes home. |
| Resources always in one place | Things sit where the request puts them; picked or mined things are removed; **nothing regrows**. The engine has no randomness to vary a layout (`Math.random` only mints ids, E:284, E:888). |
| `until` distance is fixed | `wall-until` is a fixed 7-tile row (C:297), so `repeat 7 {fwd}` does the same job as `until`. A loop that senses is only worth learning where the distance **changes**. |

### 1.2 The blocks

- **Not Blockly.** A custom React list, `garden-kit.BlockList` (KIT:444-775). 16 block types + `olive:<rung>` (C:61-64).
- **`until` and `if` share one fixed list of 8 canned clauses** (`SENSORS`, S3:320): wall ahead, tulip ahead, bowl empty,
  basket full, count is, Olive says yes/no, can empty. Every mission shows all 8 (the wall mission offers "the bowl is
  empty"). The only filter: `olive_read:<thing>` options are appended when `olive:read` is in the palette (S3:332-335).
- **The second slot `#` (1–9) is always drawn** (S3:339) and the engine reads it for two clauses only (`count_is`,
  `olive_says`, E:216-217). "Pip reads red tulip · 3" is meaningless, as Richard said.
- **No variables, no numbers-as-blocks, no comparisons, no value blocks.** One hidden counter: `count_inc` adds 1 (E:338),
  `count_is N` tests equality (E:216).

### 1.3 The Workshop

- **No Stop.** The bar is Drive · Teach · Play · One step · Start over (K3:870-875). During a run everything but Play is
  disabled and Play restarts the run. The Runner has a `stop` input (K3:717-721) that only Drive, Teach and a request
  change fire. `UNTIL_GUARD = 40` passes per `until` (E:67, E:425); `MAX_TICKS = 2000` applies to `runToEnd` only
  (E:73, E:486), not the page's Runner — a `repeat 9 { until … }` grinds with no way out.
- **The first tap on a drawer block places nothing, by design.** `CARD_GATE_SCRIPT` (S3:797-826) undoes the add and opens
  the card; "Got it" marks it seen. The seen list is a page `Variable` `gardenCardsSeen` (K3:962), **not in the save**
  (unmeasured at runtime: the cards probably come back after a restart, and are shared by siblings).
- **The `?` sits on placed blocks** (KIT:650-663); drawer blocks carry only a `title` tooltip (KIT:747).
- **No drag from the drawer**: pointerdown ignores `.gd-palette` (KIT:575); drag only reorders placed blocks.
- **Tapping a placed simple block deletes it** (KIT:609-615), next to its `?` and `✕` — a child deletes by accident.
- **The program area:** drawer and program share one scroll box capped at `min(52vh, 460px)`, 38vh under 980 px
  (LOOK:318-319); the steps column is 400 px (LOOK:264).
- **The Drive pad** = move keys + whichever of water / fill / pick / put the request allows (`cg003Content.ts:163-171`,
  S3:269-274). No say, no read, nothing for `if`/`until`.

### 1.4 What already exists to build on

- The engine steps N robots with inventories (`carry[]`, `basket`, `can`/`canMax`), mines rocks (`rock{left}`), fetches
  water, and runs a program headless and deterministically (`runToEnd`).
- The island: one 46×22 world per child, a plot per request, pinned programs, a tick (P106 IG-004); four robots with
  their own palettes, lent by islanders, three upgrades (C:994-1016).
- Rewards are cosmetic: hats, stickers, seeds, items, robots (C:159). **No currency exists**; "no timers, streaks,
  points" is written at C:797 and in P105 README out-of-scope (line 167) and P106 README §6 — reversed by R1 below.
- **Blockly is already in the repo:** `blockly@12.3.1` in `packages/noodl-editor/package.json:205`, Apache-2.0,
  `blockly.min.js` 1.1 MB, `msg/fr.js` + `msg/en.js` shipped, the **Zelos** renderer (the Scratch-style look) built in,
  and a `maxBlocks` workspace option. The garden kit vendors three.js the same way (P106 IG-007), so the pattern exists.

## 2. The product, in one sentence each

> **Every mission is a job: somewhere to get the stuff, something to carry it in, a thing that fills up as the robot
> works, and a finish line. The robot comes home when it is done; later the tulips are thirsty again and it goes back.**

> **A condition is something the child can point at: she taps the basket by Mamie's door on the island and it becomes a
> block, `eggs in [basket]`, with its number drawn on the basket as the robot fills it.**

> **What the robots earn buys blueprints; the robots carry stones to the plot and the robot spa rises as they drop them;
> then there is a refuge, then a rabbit, then a robot whose job is feeding it.**

## 3. Rulings, in plain words

**Given 2026-09-29**, on the four questions asked in the chat (Richard's answers verbatim in the right column).

| # | Question | Answer |
|---|---|---|
| R1 | The game rules out "anything scored". Reverse that, as long as the points are what your robots' jobs produce and nothing earned is ever taken away? | *"Yep reverse it"* — **ruled: yes.** Built as §4.3. |
| R2 | Thirst and wear tick only while the game is open, and things pause instead of dying? | *"Sure"* — **ruled: yes.** |
| R3 | Switch the Workshop to real Blockly, or keep extending our own block list? | *"Yep 'real' blockly, but like Scratch you can modify the blockly display and mechanics to make it much easier for kids to use please"* — **ruled: Blockly 12, customised the way Scratch customised it** (IW-004 §2 lists the changes). |
| R4 | Order: fixes, then a mockup of 3 missions, then the build? | *"Whatever the best order you think is"* — **ruled: §6's order.** |

**Defaults chosen here (no ruling asked; change any by saying so):**

| # | Default | Why |
|---|---|---|
| D1 | **One currency, shells 🐚 / coquillages**, not one per material | A 7-year-old reads one number. Materials (stones, planks, eggs, food) are **things in the world** the robots carry, not a wallet; buildings need both (§4.3). |
| D2 | A job pays shells when **a run makes progress on it**, a **bonus when it is finished**, and pays again only **after it has worn** | Richard's rhythm; the wear clock is the only cap, so there is nothing to grind faster than the island wears. |
| D3 | A robot pinned to a worn job **goes back by itself** and earns for it, but only while the game is open (R2) | Richard's "Pip would reset and collect the water … over and over"; the island keeps its life at the edges (P106 R1). |
| D4 | Earned shells only grow; spending is a second number (Rocket School P95 R1); a purchase shows a card: what you have, the cost, what is left | Precedent the kids already know; rkt-010 "never take anything away". |
| D5 | Seeking is a **rule**, never Olive: `go to nearest [thing]` is a path search | The model cannot count or judge (TPL-012 §2.6, 55 probes); Olive keeps **reading** (notes, signs, envelopes). |
| D6 | Supersedes **P106 R10** (`go to [what Olive read]`): `go to` is built (IW-005) and the envelope mission makes it winnable | R10's recommendation was "drop it" because no mission could win with it; IW-003 adds that mission. |
| D7 | No real-time clocks: wear and regrowth count **island ticks while a page is open** | R2; one of the children dislikes time pressure (§5). |
| D8 | No leaderboards, no sibling comparison, shells private to each profile | rkt-010 §1.3–1.4. |

**Open, asked after session 1 (2026-09-30):**

| # | Question | Options |
|---|---|---|
| R5 | **The run cap is 14 minutes long.** A run that never ends (`repeat 9 { until the wall is ahead { turn left } }`) stops by itself only at the engine's `MAX_TICKS` = 2000 ticks — at 420 ms a tick, about 14 minutes; that very program ends earlier, by the `until` guard, after 742 ticks (~5 min). Stop (built) is what gets a child out. Should the Workshop also give up sooner? The longest reference run today is 41 ticks (`rows-trick`, IW-002 §6), so a cap of 200 leaves five times that. | **a page cap of ~200 ticks (≈1½ min) with Olive's "going round and round" line (recommended)** / stop at the first `until` guard hit / keep 2000 (IW-001 §6 deviation 1) |

**Found in session 1, not this phase's to fix:** a `For Each` fed a new list while it is still rebuilding after its
mount keeps BOTH sets of rows (`packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx`, `scheduleRefresh`
queues the async refresh without awaiting it). Lane A saw the pad draw ten keys for five and worked round it with a
settle latch (`Logic/Latch`, `PAD_SETTLE_MS` 120) — IW-001 §6 deviation 6. Any other repeater fed twice in quick
succession can show it. Owner: the runtime (P99, "the ones nobody owned").

## 4. The design

### 4.1 The job model (engine: IW-002)

Every mission is built from four parts plus a finish line; the world wears between runs.

| Part | What it is | Examples |
|---|---|---|
| **Source** | a thing that gives, and **refills** on island ticks | the well (never runs out), a rock (`left` regrows), the hen (lays an egg on a free tile of her pen), the post box (a letter arrives), the food sack |
| **Carrier** | a thing the robot holds, with a **level** drawn on it | the can (0/3, picked up from the shed first), the hod (stones), a satchel, hands |
| **Target** | a thing with a **meter** `have/need` drawn on it | a tulip `drinks 2/3`, a path square `stones 1/4` (dirt → gravel → cobbles → path), the egg basket `3/4`, a bowl, a build site `stones 7/20` |
| **Finish line** | every target full | the bed blooms / the path reaches the post box → the robot **walks home**, the islander thanks, the bonus |
| **Wear** | per target, in island ticks, only while open | a tulip's drinks drop by one; the most-walked path square loses a stone; Biscuit eats from his bowl; the hen lays |

A wall is a real tile (`wall`, blocking, drawn in both renderers); a basket is a container thing (`count/capacity`); the
can is a thing the robot picks up (so it can be a block, R3). Each run of a mission may **seed** a layout (the wall's
distance, the eggs' places, today's note) from a seeded generator stored in the world, so tests stay deterministic and
`until` / seek are worth more than a fixed `repeat`.

### 4.2 The blocks (IW-004)

- **Blockly 12, Zelos look, customised for kids** (R3): drag from the drawer, a tap on a drawer block also adds it; the `?`
  on the **drawer** blocks, never on placed ones; drag a block back to the drawer to delete it (no tap-to-delete);
  big touch targets; icon-first blocks at 7–9; the running block glows; zoom buttons; the drawer always open, no
  categories at 7–9.
- **Conditions are a thing + a state, and the thing comes from the world.** A thing slot has a "👆 pick on the island"
  button: tap the basket in the 2D or 3D world → a `[basket]` chip. The state list is **filtered by the thing's kind**
  (a can offers `is empty / is full / has N`; a basket `is full / is empty / has N eggs`; the tile ahead `is wall /
  has tulip / has rock`). This is what scales: the list comes from the chosen thing, not from every mission ever made.
- **Values for 10–12:** `count of [🥚] in [basket]`, `[can]'s water`, `=` `<` `>`, a number block, `set [name] to`,
  `change [name] by 1`, `what Olive read`. The value is **drawn on the thing** in the world as it changes (Scratch's
  variable monitor; research §5).
- **Brain size:** each robot's program is capped by `maxBlocks` (e.g. 12 → 16 → 20, an upgrade) — a reason to fold
  steps into a loop (Autonauts' brain memory).

### 4.3 Shells, the shop, building (IW-006, IW-007)

- **Earn (D2, D3):** a run that makes progress on a job's meter; a bonus at the finish line; again once it has worn.
  Nothing for minutes played; nothing taken away.
- **Spend (D4):** a shop in the Island page: **blueprints** (robot spa, animal refuge, bridge, bench), **animals**
  (hen, rabbit, sheep — after the refuge), **robot copies** (a new Pip or Cobble, named by the child), **upgrades**
  (bigger can, basket, boots — today's three — and brain size), **helpers** (Richard's "cheat items": a rain cloud that
  waters one plot once, a self-filling can for one job, a wheelbarrow that carries 8).
- **Build (IW-007):** a bought blueprint goes on a free plot as a ghost; it needs **materials delivered** (stones from
  the rock, planks from a tree); it rises in stages as each drop lands (Autonauts' blueprint); the robot that drops the
  last piece finishes it. The refuge unlocks animals; an animal gets a bowl, and feeding it is a new job.

### 4.4 Seek, regrow, and the crew (IW-005, IW-008)

- `go to nearest [thing]` (path search on the plot; a found thing is **reserved** so two robots never chase the same
  egg), `if [here / ahead] has [thing]`, `go to [what Olive read]`.
- Sources regrow on ticks (§4.1). The search area is the robot's plot (Autonauts' area signs come later if at all).
- **The crew:** several named copies of one robot kind, each assigned to a plot; "copy this robot's program onto that
  one"; My robots lists them with their job and brain size.

## 5. The research (2026-09-29, a research agent; sources as it cited them)

**In the repo:** the only child feedback on file is one child's, relayed by Richard: loved Rocket School's profile customisation,
hates time pressure, no negative feedback for a missed day (`phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md:18-19`).
Neither child has played Olive's Island (P106 IG-008 ⬜). rkt-010: earn for learning actions not minutes, never take
anything away, deterministic unlocks with the next target visible, customisation is what you buy, stars private.
P95 R1: stars spendable, earned only grows, `spent` a second number, a confirmation card.

**Principles, each with its source:**

1. The currency should be the world's own stuff — children 7–11 learned more and played 7× longer when the maths was the
   mechanic (Habgood & Ainsworth 2011). → materials are things robots carry; shells pay for choosing.
2. Rewards that **inform** help; rewards that **control** ("do this to get paid") hurt (Deci, Koestner & Ryan 2001).
   "Water 10× → 50 points" is the risky contract shape: show the meter filling and the thanks, and let the shells follow.
3. Autonomy, competence, relatedness predict enjoyment (Ryan, Rigby & Przybylski 2006) — islanders asking is relatedness.
4. The child's own actions become the program (Autonauts); children hated pre-filled locked blocks (Fraser 2015, *Ten
   things we've learned from Blockly*).
5. Conditions are things the robot senses (Kodu: "WHEN see apple DO move toward", with filters).
6. Few, distinct blocks; loops and conditionals in different colours; one-sentence instructions, kids close popups
   unread; circular arrows for turns (Fraser 2015).
7. Make a variable visible — Scratch's stage monitor; Kodu's coloured scores. Children read a variable as a maths
   unknown or think it keeps its history (Grover & Basu 2017; K-12 misconception reviews) → a basket whose count changes.
8. Juice: a big response to a small input — the last stone visibly finishes the building.
9. Care loops pause rather than punish (Stardew crops stop growing, die only after missed days); Animal Crossing's
   weeds-while-away is its most criticised loop → R2, D7.
10. Idle pleasure is watching your system work (CHI 2018 *Playing to Wait*); waiting gates make it exploitative → no
    "come back in 4 hours", ever.
11. A gentle world for debugging: Autonauts has no real cost of failure.

**Mechanics borrowed:** Autonauts — find nearest in an area with reservation; `until hands full / bucket empty /
storage full`; blueprints that fill with materials; copying a bot's program; brain memory 12 → 16 → 20.
7 Billion Humans — `remember nearest datacube` (a variable holds a found thing, not a number). Cargo-Bot — a condition
as a badge on a block. Kodable / Lightbot — coloured-tile conditions. Minecraft agent — sense only ahead/left/right.

**Anti-patterns:** expected task-contingent rewards (d ≈ −0.28 to −0.40, stronger in children; Lepper 1973); decay as
guilt; leaderboards; long condition dropdowns; a "tell me the answer" button (50% bypass, TPL-012 briefing §5).

**Age ladder (French programme bounds: cycle 2 sequences ≤15, 6e repeat + predict, 4e conditions + variables, 3e
conditional loops):** 7–8 sequence, `repeat N`, `go to nearest [tapped thing]`, one sensed `until` (hands full / can
empty); 8–9 counters drawn on things, conditions on things, copying a job; 10–11 value chips, `=` `<` `>`, if/else,
predict, brain size; 11–12 `set`/`change` named variables, named jobs as procedures, Olive's read in a condition.
A sensed `until` before the 3e text is an inference, not a source.

## 6. The board

| Task | What | Depends on | Status |
|---|---|---|---|
| [IW-000 — the mockup](IW-000-THE-MOCKUP.md) | three missions as jobs on real Blockly (tulips with can + meters, Cobble's path by the stone, Mamie's eggs to the basket with a tapped variable) — an artifact Richard and the children play; Blockly by touch on the tablet | — | 🟡 s1: published https://claude.ai/artifact/FQwh2xGNTKXxau4wtiMuX3, drive 61/61; Richard: *"perfect, exactly what I wanted"*; tablet AC5 + the children owed |
| [IW-001 — the Workshop fixes](IW-001-THE-WORKSHOP-FIXES.md) | Stop + a run cap; drawer tap places the block; `?` on the drawer; tap no longer deletes; a taller program area; the pad = the drawer's actions; cards seen saved | — | ✅ s1 (lane A): AC1–AC8 driven, `drive-iw001-workshop.js` 38/38; R5 asks about the cap |
| [IW-002 — the job model](IW-002-THE-JOB-MODEL.md) | sources that refill, carriers with levels, targets with meters, finish line + home, wear on ticks, walls, containers, the can as a thing, seeded layouts; both renderers draw it | — | 🟡 s1 (lane J): the engine half, specs +38; drawing (lane D) + drive clauses owed |
| [IW-003 — the missions as jobs](IW-003-THE-MISSIONS-AS-JOBS.md) | all 13 rewritten on the job model + the envelope mission (Olive reads, `go to`) + the first build site; `until` missions vary their distance | 002, 004, 005 | ⬜ |
| [IW-004 — real blocks](IW-004-REAL-BLOCKS.md) | Blockly 12 vendored, Zelos, the kid customisations, thing + state conditions picked on the island, value blocks by band, values drawn on things, brain size, Teach/fold/hints/cards on Blockly, stored programs migrated | 000 (look), 001 | ⬜ |
| [IW-005 — seek and regrow](IW-005-SEEK-AND-REGROW.md) | `go to nearest`, `if here/ahead has`, reservation, `go to [what Olive read]`; regrowth rules | 002 | ⬜ |
| [IW-006 — shells and the shop](IW-006-SHELLS-AND-THE-SHOP.md) | earning rules D2/D3, the wallet D4, the shop, helpers, save v5 | 002 | ⬜ |
| [IW-007 — building and animals](IW-007-BUILDING-AND-ANIMALS.md) | blueprints on free plots, materials delivered, staged rise, the refuge, animals and feeding jobs | 005, 006 | ⬜ |
| [IW-008 — the crew and more land](IW-008-THE-CREW-AND-MORE-LAND.md) | named robot copies, copy a program, assign to a plot, more land; the frame gate with many robots | 005, 006 | ⬜ |
| [IW-009 — the kids' verdict](IW-009-THE-KIDS-VERDICT.md) | the two children play the mockup (after IW-000) and the build (last); their words the same day | 000; all | ⬜ |

### Order (R4: the order is ours)

- **Session 1:** IW-001 (lane A, first job — Richard feels it the same day) ∥ IW-000 the mockup (lane M) ∥ IW-002 the
  engine's job model, headless with its gate (lane J, worktree). Richard and the children play the mockup; the tablet
  reads Blockly by touch.
- **Session 2:** IW-004 on the kit (lane B) ∥ IW-005 in the engine (lane J) ∥ IW-002's drawing in both renderers (lane D).
- **Session 3:** IW-003 the missions (one lane per islander family, the vocabulary table written into the brief first).
- **Session 4:** IW-006 shells and the shop ∥ IW-008 the crew.
- **Session 5:** IW-007 building and animals; the packaged upgrade drive over a v4 save.
- **Then:** IW-009 with the build.

**Why this order:** the fixes are cheap and survive the Blockly swap (Stop, the run cap, the pad, the saved cards) — the
parts that do not (drawer drag, tap-delete) get the cheapest fix that stops the harm. The mockup settles the look of
Blockly and the job meters **before** 13 missions are rewritten twice. The job model is engine-only and can start at
once. The economy comes after the jobs, because what it pays for is jobs.

**What P106 still owes, and how it meets this phase:** IG-004 AC7 (packaged upgrade drive) becomes IW-007's v4→v5 drive;
the lend chain played stays P106's; R11/R12 stay P106's; **R10 is superseded by D6**; IG-008 is merged into IW-009.

## 7. Gates (as P106 §5, plus)

- The engine gate: every mission in both languages and both bands wins with its reference program, **on three seeds**
  (a seeded layout must be winnable on every seed), and a fixed `repeat N` loses on at least one seed where the
  mission teaches `until` or seek.
- The block gate: every reference program round-trips Blockly JSON → engine program → Blockly JSON byte-identical;
  every stored v4 program migrates and still wins its (unchanged) request or is flagged "teach again".
- The page drive at 1024 × 768 and 1368 × 900 and a phone; the 3D Workshop and island drives; the look beside IW-000.
- The tablet: Blockly drag by touch, and the island's frame time with the crew at its cap and Olive in flight.

## 8. Out of scope

Real-time decay (D7); anything lost (plants die, buildings fall, shells taken back); leaderboards; random packs or
time-limited shop items; waiting gates ("come back later"); Olive judging (reading only, D5); a model the child chats
with; multiplayer; an RTS (no combat, no enemies, no fog). Names, ages and the tablet spec stay out of the repo.
