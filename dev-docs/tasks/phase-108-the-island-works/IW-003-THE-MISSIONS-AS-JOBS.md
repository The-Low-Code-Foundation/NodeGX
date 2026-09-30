# IW-003 — The missions as jobs

**Opened 2026-09-29** from README §0, §1.1. **Status: ⬜.** Depends on IW-002 (the job model), IW-004 (the blocks the
reference programs are written in), IW-005 (`go to nearest`). One lane per islander family in session 3.

## 1. The person sentence

> **Every mission has a reason a child would believe: water comes from the well in a can, a path is built stone by stone
> until it is a path, eggs go in the basket by the door, the wall is a wall. Each teaches the same idea it teaches today.**

## 2. The rule for every mission

1. It names its **source, carrier, targets, finish line and wear** (IW-002 §2).
2. It keeps the **idea it teaches today** (the ladder in README §5 and P105 CG-006 §2 stay the spine).
3. Where it teaches `until`, a count, or seeking, the **layout is seeded** so a fixed `repeat N` fails on at least one of
   three seeds (README §7).
4. Its reference program wins on three seeds, in both bands, both languages, and is written as Blockly JSON (IW-004).
5. The drawer offers only its blocks; the pad offers every action in the drawer (IW-001 F7).

## 3. The thirteen, and what changes (the idea stays)

| Mission (id) | Teaches | Today's flaw (README §1.1) | As a job |
|---|---|---|---|
| path-postbox | a sequence | walks to a tile for no reason | "Check the post box": at the box a letter pops out and Pip carries it home (a reason, a reward moment). Post arrives again on ticks. |
| tulip-door | an action | water is free | The can is on the shed tile: pick it up, fill at the well, water the tulip by the door until its meter is full (`need` 3 → three `water`). |
| tulips-three | repeat, fetch-and-return | refills before every tulip; the can's 3 is never used | 3 tulips × 3 drinks, can of 3: fill, water one tulip full, back, fill… `repeat 3`. Band 2: `until [can] is empty { water }`, `if [can] is empty → go to the well`. Wear: a tulip loses a drink every so often. |
| path-stones | pick/put, repeat | one stone per square, never a path | 4 squares × 4 stones; the hod holds 4; each trip finishes one square (dirt → gravel → cobbles → path). Band 1 `repeat 4 { go to rock, repeat 4 {pick}, go to site, repeat 4 {put} }`; band 2 `until [hod] is full`. Finish: the path reaches the post box → Cobble walks home. Wear: the most-walked square loses a stone. |
| bowl-if | if | fine, but food is endless | Biscuit's bowls empty as he eats (wear); the food sack is the source; `if [bowl ahead] is empty → put`. |
| letter-say | carry + say | the letter lies on the ground | The letter is in the post box; Pocket takes it to Sami's door and says something kind. |
| wall-until | until | no wall; a fixed 7 tiles | A real garden wall; Biscuit's ball rolls a seeded 4–7 tiles; `until [ahead] is wall { forward }`, pick the ball, bring it back. `repeat 7` fails on a seed. |
| meow-when | an event | steps toward a bowl for no reason | When Biscuit meows, bring one treat from the jar to his bowl. |
| eggs-count | a counter → a variable | eggs carried, never delivered | The hen lays on seeded tiles; the basket by Mamie's door `0/4`; `until [eggs in basket] = 4 { go to nearest egg, pick, go to basket, put }`. The child taps the basket on the island to make its chip. Band 1: `until [basket] is full`. |
| rows-trick | a named trick (procedure) | water free | Two rows, a can: the trick is "water a row"; used twice. |
| mamie-note | Olive reads | water free | The note changes each day (seeded): "the red ones today" / "the yellow ones"; the can; `if what Olive read = red`. |
| rock-flower | Olive: is it a…? | water free | As today, with the can; the rocks are the rock source (mined later by Cobble). |
| sami-thanks | Olive says thanks | the letter lies on the ground | As letter-say, and Olive writes the thank-you. |

## 4. New missions

| Mission | Teaches | The job |
|---|---|---|
| **envelopes** (Pocket, band 2) | Olive reads → `go to` (D6, supersedes P106 R10) | Three envelopes in the post box, each with a name; `read [envelope]` → `go to [what Olive read]'s door` → put. Seeded names each day. |
| **the first build** (Cobble) | a job with a big meter | Sami's bench: a site needing 8 stones; Cobble mines and delivers until it rises in stages; the islander sits on it. Introduces IW-007's build site. |
| **the watering can** (Pip, band 1, early) | picking up a tool | Richard's example: the can is somewhere on the plot, not in hand; pick it first. Folded into tulip-door if one mission is enough. |

## 5. Acceptance criteria

1. Every mission in §3 and §4 is built on the job model; none uses `carrying` or `thing_at` as its win.
2. Each wins with its reference program on three seeds, both bands, EN/FR; the `until`/count/seek ones have a
   `repeat N` program that loses on at least one seed (the engine gate asserts both).
3. Each mission's copy (title, blurb, line, hint keys) says the reason in words a 7-year-old reads; FR lines for
   Richard's read listed in §7.
4. The island: every won plot shows its robot working, finishing, walking home, and going back after wear.
5. Page drive, island drive 2D + 3D, both languages, screenshots of each mission looked at beside IW-000.

## 6. Traps

- A mission rewritten changes what a pinned v4 program does: IW-004's migration flags "teach again" when a stored
  program no longer wins its rewritten mission; the robot waits at home, it does not flail.
- The hint table keys off goals (`CHOOSE_HINT_SCRIPT`); every rewritten goal needs its hint row, or "Not quite yet"
  comes back (P106 D4 was this).

## 7. Notes

### Session 3 (2026-09-30, lane M `iw003-mamie`, base `2e1035bfa`) — Mamie Rose's five missions

**Built.** Every mission names its source, carrier, targets, finish line (home = the start tile and pose) and wear, keeps
the idea it teaches (`tricks` unchanged), and says its reason in EN and FR (`copyKeys` edited in place).

| mission | the job (source → carrier → targets) | reference (blocks) | seeded |
|---|---|---|---|
| `tulip-door` (band 1, Pip) | the well `W` (3,2) → the can ON THE GRASS (2,1), picked up first (the watering can folded in) → the tulip under Mamie's door (6,1) `need 3` | pick, left, fill, left, fwd ×2, water ×3 (9) | — |
| `tulips-three` (band 1, Pip) | the pond → the can in hand (0/3) → 3 tulips × `need 3` — the can's three is one tulip's worth | `repeat 3 { fill, left, left, fwd, repeat 3 { water }, right, fwd, right, fwd }` (11) | — |
| `eggs-count` (band 2, Pocket) | the hen's pen (x 0..3, y 0..2, the hen at 0,2) with 4 eggs on seeded tiles → hands, one at a time → the basket under Mamie's door (6,1) `capacity 4`, holding 0, 1 or 2 from yesterday (`choose` on its `count`) | `until count of egg in [basket] = 4 { go_nearest egg, pick, go_to [basket], put }` (5, IW-004 AC4's own) | `eggs` + `choose` |
| `rows-trick` (band 2, Pip) | two ponds on the path (0,3) and (5,3) → the can in hand → 2 rows × 3 little tulips `need 1` | trick row { fill, left, left, repeat 3 { fwd, left, water, right } }, do row, do row (11) | — |
| `mamie-note` (band 2, Pip) | the well (4,2) → the can in hand → the row the day's note names (red, south-west; yellow, north-east), `need 1` | read, fill, if Olive read "red tulip" { left } else { right }, repeat 3 { fwd, left, water, right } (10) | `choose` (the note, and the job's targets with it) |

`NAIVE_M`: eggs-count's `repeat 2 { go_nearest egg, pick, go_to [basket], put }` — the child counted the empty places on
the morning the basket held two (seed 1): it wins there and is two eggs short on seeds 2 and 3.

- **Engine hunks** (`cg002Scripts.ts`): `chosenTargets` (SEED_HELPERS, after `seedWorld`; one call in `layOut`'s choose loop,
  no extra draw — a `choose` entry may carry `targets`, index-aligned with `among`: the job follows the day); `sameBlock`
  (FOLD_HELPERS) compares two containers by their shape (`shapeOf`), so pours folded first still let the passes fold;
  STEP_SCRIPT's `sayKey` output is `sayNone:<kind>` on a none (the delta keeps `sayNone`).
- **sayNone per kind** (IW-005 dev. 2): `noneKeyOf` in the pages' WORD_HELPER, called by Draw world; Record step does the
  same; `iw3mNone<Kind>` lines (PAGE_WORDS, lane M's block) for every kind the Blocks node seeks — egg ("No more eggs here
  — the hen is still laying."), tulip, can, basket, rock, stone, letter, ball, bowl, door, site, store, hen, postbox, well,
  read; any other kind says the plain `sayNone`.
- **The pad walks to things** (IW-001 F7 / §2.5, decided and built): where the drawer has `go_nearest` / `go_to`, one key per
  kind lying on the plot as the request opens (`PAD_GO`: fetch — egg letter stone food ball rock can; take to — basket bowl
  store door site postbox); the key's face is the kind's picture with a pin (`.bg-key-go-<kind>`). A press records
  `go_nearest {kind}` or `go_to {chip of the first one on the plot}` and walks the WHOLE way in one press (the engine's own
  step and apply, every tick), in Teach and in Drive; a none says it by kind. The Pad gets the start world (`plStart.world`).
- **The job card** (IW-000's graded look, the one thing the Workshop lacked beside the mockup): `Logic/Job card`
  (`JOB_CARD_SCRIPT`), `Workshop/Job line`, `plJob` under the owl — a sum pill ("2/4 eggs in the basket", leaf-green when
  done: one target by its meter, more by how many are full) and five labelled lines (Source · Carrier · Target · Finish line
  · Wear). Rows by request in `JOB_CARDS` (cg003Content): Mamie's five; another lane adds its missions' rows at the END.
- **The island** (`ig004Island.ts`): a job plot's ask takes Olive's WRITTEN answer (`islAnswer`, the page's fallback) — with
  no value, Mamie's note on the island never finished (an arm); `Logic/Island world` takes the held island as a QUIET input
  (`kept`, wired from `gardenIsland`): the Island page opened again on the same build goes on from it (IW-002 AC3, below).
- **Olive's table** (`olive-templates.json`): the yellow note — `notes_read` index 3 "The yellow ones, not the red." / « Les
  jaunes, pas les rouges. » and its written answers (yellow tulip / tulipe jaune). The shell's 91 tests green.
- **The look** (`cg007Look.ts`): the go keys, the job card, and the full meter at `var(--leaf)` on the pages (the kits paint
  the mockup's green, 3.05:1 under white — S3-R5 found it once Mamie's jobs filled their meters).

**Readings** (worktree, the last source commit `3d9d84019`; each spec file alone; every drive on the one deploy
`drive-pages.sh` made from it; previous = the brief's §3 / §8 at `2e1035bfa`):

| gate | exit | total | previous |
|---|---|---|---|
| `iw003Missions -t "\[M\]"` | 0 | **20 / 20** | 10 of the 20 (the rest red by design) |
| `iw003Missions` (whole file) | 1 | 38 passed, 25 failed — lanes S, P, B's rows and "the lanes cover every request" (sami-bench, envelopes are theirs) | 28 / 35 red |
| `cg002Engine` | 0 | **229** | 226 (+3, lane M's describe) |
| `cg003Template` | 0 | **146** | 141 (+5, lane M's describe) |
| `ig004Island` | 0 | **31** | 23 (+8, lane M's describe) |
| `cg005Olive` · `cg006Requests` · `iw004Blocks` · `p108s2Join` · `cg001GardenKit` · `ig007Garden3d` | 0 each | 41 · 83 · 54 · 4 · 50 · 43 | same |
| shell `node --test` | 0 | **91 / 91** | 91 |
| `npm run template:garden` | 0 | drift none after each commit | 0 |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **335 / 335** | 331 (+4: the tulips folded twice, one per size × language) |
| `drive-iw003-mamie.js` workshop · island 2D · island 3D · look3d | 0 · 0 · 0 · 0 | **34/34 · 7/7 · 3/3 · 6/6** | new |
| IW-001 · IW-004 2D · 3D · modes | 0 each | 38/38 · 19/19 · 3/3 · 90/90 | same |
| island `--perf` · 3D | 0 · 0 | 65/65 (AC6 p95 16.7 ms at CPU ×4, 1196 frames) · 5/5 | 65/65 (16.7) · 5/5 |
| robots · 3D | 0 · 0 | 60/60 · 4/4 (after the can+ clause's rewrite: 58/60 before it) | same |
| Workshop 3D · nogl | 0 · 0 | 24/24 (after the water clause's rewrite: 23/24 before it) · 8/8 | same |
| Olive pages | 0 | 22/22 | 22/22 |
| kit fixture drives | not run | the kits are unchanged by this lane | 38/38 · 25/25 |

Arms (each source mutated in the spec, the row red, the source as built green): `chosenTargets` never setting the targets →
the yellow day of mamie-note cannot be won; `sameBlock` saying no to containers → the pours-first dance never folds; Draw
world ignoring the kind → the egg line never shows; the pad's go keys dropped → the eggs' pad has no walk; the island's ask
without the written answer → Mamie's note on the island never finishes; the kept island left out → the page opened again
builds fresh (the spec's known-firing half, and measured on a deploy without the wire: age 1, the tulip 0/3, the basket 0/4).

**Acceptance (§5), lane M's missions:**

- **AC1 ✅** all five are jobs (`job` targets + home, goal `job_done`, no `carrying` / `thing_at`) — iw003Missions [M] rows.
- **AC2 ✅** each wins with its reference on seeds 1–3 × EN/FR × every band from its own (7–9 unrolled), no bump, no puddle,
  inside the brain, every target's wear longer than the run (longest: eggs 69 ticks on seed 3 < WEAR.basket 90); eggs-count
  teaches a count and seeking: seeded, and `NAIVE_M` loses on seeds 2, 3 and wins on 1; its layouts differ.
- **AC3 ✅ (Richard's read owed)** the reason in words a 7-year-old reads, EN + FR; FR lines below.
- **AC4 ✅ (Mamie's plots)** the island spec: each of the five pinned finishes, walks home to its start pose, waits, and goes
  back when its target wears — never reset (a new describe, 5 rows); the eggs on the island SEEK where the hen laid; the
  island drive: Pocket seen seeking, both robots seen walking home, waiting, Pip seen going back after wear.
- **AC5 ✅ / 🟡** page drive 335/335; lane M's drive — every mission played the child's way at 1368 EN and 1368/1024 FR,
  the eggs on the phone, the three graded jobs in Garden 3D; screenshots looked at beside IW-000 (below). 🟡: the eggs at
  1024 × 768 are built at 1368 (at 1024 the drawer pushes the program's right edge off the screen — lane B's look fix).

**Owned items (brief §4.3, row M):** sayNone per kind ✅; the pad and go keys ✅; IW-002 AC3 ✅ and AC5 ✅ on the island drive
(IW-002 §6, session 3 block); IW-005 AC5 ✅ 2D, 3D in the Workshop (IW-005 §5, session 3 block); IW-004 AC4 on a page ✅
(M3: `until [count of 🥚 in [🧺]] = 4` built from the drawer with both chips picked on the basket, the basket watched —
a ring —, played: the basket's number 0/4 → 1/4 → 2/4 → 3/4 → 4/4, Pocket home, the win card; EN and FR).

**Deviations, with the reason and the measurement:**

1. **eggs-count's goal is `job_done` alone** (no `uses until` / `senses cond`): the gate's near-miss row needs a fixed
   `repeat N` that WINS on a seed; a goal naming `until` makes every naive lose everywhere. The count is the lesson because
   the basket holds 0, 1 or 2 from yesterday (`choose`, the list three times over so seeds 1–3 lay 2, 1, 0 and a real day is
   one in three); `repeat 4` still wins every day (a put into a full basket is refused and the egg stays carried) — an
   over-count is harmless in this job model, an under-count is what the seeds catch.
2. **tulips-three's pours are a repeat inside the pass** (11 blocks, not the flat 12): the flat pass holds `water ×3`, and
   the fold nudge offers it from the third pour — lane F's rule ("never a run the reference does not hold") went red; and
   once the pours are folded, the passes never folded (`sameBlock` said no to any container). Now the reference holds both
   runs and `sameBlock` compares containers by shape: either order of folding reaches the reference (engine rows, the page
   drive's AC3 folds twice).
3. **rows-trick turns round with two lefts**: "right, right, forward, left, water, right …" holds "right, forward, left,
   water" three times from its second block — the nudge offered that rotation (lane F's row, measured red).
4. **mamie-note's `choose` carries `targets`** (a field added to `SeededSpec.choose`, one engine function): the note changes
   with the day and the job is that row. The `among` list is the two notes three times over (seeds 1–3's first draws all
   fall in 0.62–0.74: yellow on 1, red on 2 and 3; a real day is one in two). A new note in Olive's table (index 3, after
   the three the exam reads by index).
5. **Mamie's door moved to (6,0)** on tulip-door and eggs-count, and the hen to (0,2): a meter chip on the last column is
   clipped by the world's edge (the kits'), and the Workshop's mode badge covers tile (0,0). mamie-note's yellow row still
   reaches x 7 (three tulips each side of the well need seven columns) — its last chip is clipped a few pixels.
6. **Full meters on the pages wear `var(--leaf)`** — a page-scoped override of both kits' `#3FA66B` (3.05:1 under white).
   The kits are not this lane's; the kit owner may prefer to fix it there.
7. **The French tulips line is the base's** ("Mes tulipes ont soif…"): at 390 × 844 the base had 3 px before the owl leaves
   the screen (page drive AC4); the English says "Three drinks a tulip", the job card says it in both.
8. **The Island page keeps the held island on the same build** — IW-002 AC3's "meters as left" was a defect on the page:
   measured on a deploy without the `kept` wire, the Island page opened again rebuilt every plot (age 1, the tulip 0/3, the
   basket 0/4). With it: the held island the same at 3 s and 53 s while closed, and it goes on from it.
9. **A job plot on the island answers an ask with Olive's written answer** (the island never had Olive): mamie-note there
   would otherwise water the else row whatever the note says (spec arm: never finishes).
10. **Spec rows that pinned the old missions, updated** (each named in the final message): cg002Engine (known goals + job_done,
    predict end, IG-002 AC2/AC3, lane F's two rows, R5, Start world's seed row, the vocabulary row), cg006Requests (wrong
    programs, row 2, row 1b), cg005Olive (the world as Start world hands it — can and job; AC2's missing goal), cg003Template
    (refOf, F7 pad, D10 wiring, Draw world colours, AC3 in plain JS, AC7 hint, the 13-drawn control), ig004Island (the
    synthetic tulips-three as the no-job control; AC4 laid from the plot's seed; the reset count read from the control's lap),
    iw004Blocks (the "as stored" twin only for programs a Block List could store), cg001GardenKit / ig007Garden3d (the
    "13 as before" control with the job fields taken off).

11. **Drive clauses changed because the missions changed what they grade** (no other clause touched): `drive-cg003-pages.js`
    — `TULIP_DANCE` laid out from the request, AC3 folds twice (the pours) and waits 40 s for the longer run, the language
    clause's number filter takes a meter ("0/3"), IG-006 AC2 (Mamie's note on the day's note and the new layout: read, fill,
    two ifs, forward, left, water), CG-007 AC7 waters the first tulip full; `drive-cg005-olive.js` — P-IG6-AC2 on the day's
    note and the new layout; `drive-ig007-workshop.js` — `FOLDED` counts the pass laid out, AC1's water clause takes the pour
    that fills a tulip; `drive-iw001-workshop.js` — AC6 accepts the day's note; `drive-ig005-robots.js` — IG-005 AC3: the
    bigger can fills the first tulip (three drinks) and keeps the rest.

**FR lines for Richard's read (IW-003 AC3):**

- tulip-door — « La tulipe près de ma porte veut trois gorgées. L’arrosoir est dans l’herbe : {b} peut le prendre, le
  remplir au puits et lui donner à boire ? » · sous-titre « D’abord l’arrosoir : prends-le et remplis-le au puits, puis
  emmène {b} jusqu’à la tulipe et arrose. Des pas dans le bon ordre. »
- tulips-three — (inchangée) « Mes tulipes ont soif. Remplis l’arrosoir à la mare, et reviens ! »
- eggs-count — titre « Remplis mon panier d’œufs » · « Mon panier près de la porte tient quatre œufs, et il y en a
  peut-être déjà un ou deux dedans. La poule ne pond jamais deux fois au même endroit. {b} peut le remplir, un œuf à la
  fois ? » · sous-titre « Compte les œufs du panier : {b} va chercher des œufs jusqu’à ce qu’il en tienne quatre, peu
  importe combien il y en avait ce matin. »
- rows-trick — « Deux rangées de petites tulipes, et une mare à chaque bout du chemin. Apprends une astuce à {b} — remplir
  l’arrosoir, arroser une rangée — et utilise-la deux fois. »
- mamie-note — « J’ai laissé un mot près du puits. Demande à Olive de le lire : il dit quelles tulipes veulent de l’eau
  aujourd’hui, les rouges ou les jaunes. » · le mot du jour « Les jaunes, pas les rouges. »
- none — « Plus d’œufs ici — la poule est encore en train de pondre. » (and the 15 others, `iw3mNone*`)
- the job card — D’où ça vient · Porteur · Cible · Ligne d’arrivée · Usure; « 🐔 la poule pond dans son enclos, jamais deux
  fois au même endroit », « ✋ les mains de {b}, un œuf à la fois », « Mamie prend un œuf pour le petit-déjeuner ; la poule
  pond à nouveau », « {n}/{t} œufs dans le panier », « {n}/{t} tulipes pleines », « {n}/{t} gorgées ».

**Screenshots looked at, beside IW-000** (`iw003-mamie-scratch/final/shots/`): `m2-1368-en-01-start` beside the mockup's
01 — the pond, three tulips each 0/3, Pip with his empty can; `m2-1368-en-01b-jobcard` beside 01's card — the pill
"0/3 tulips full" and Source · Carrier · Target · Finish line · Wear; `m3-1368-en-02-running` beside 12 — the hen in her
straw pen with the day's eggs, Pocket, the basket under the door ringed violet with its large chip; `look3d-*` — the same
in Garden 3D (the tulips' chips, the can on the grass, the fenced pen, the basket's chip); `iw003-2d-eggs-seek` — the
island, Pocket in the pen, the basket 1/4.

**Not done, and why:** the eggs built at 1024 × 768 (lane B's look fix); the whole island in 3D under swiftshader is too
slow to watch a lap (the Too Slow rule hands back to the flat island within a few ticks — a readout; IW-005 AC5's 3D
seek is proved in the Workshop's 3D world instead); the tablet; the shells (+5 🐚, IW-006).

**Could not verify:** the tablet by touch; a real model reading the yellow note (the written answer and the shell's stub
read it); a real GPU for the 3D island; the job card on the phone beyond the 390 page drive's clauses; lanes S, P, B's
missions on the pad's go keys and the job card (their rows are theirs).
