# IW-003 — The missions as jobs

**Opened 2026-09-29** from README §0, §1.1. **Status: 🟡 s3 (2026-09-30, four lanes merged, §7) — all fifteen missions are jobs (the thirteen + the envelopes + Sami's bench); AC1 ✅, AC2 ✅ (the gate `iw003Missions` 63/63), AC4 ✅, AC5 ✅ on the drives; AC3's FR lines and AC5's look beside IW-000 are Richard's read; four look items open (§7, the merge).** Depends on IW-002 (the job model), IW-004 (the blocks the
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

(empty)

### Session 3 (2026-09-30, lane S `iw003-stones`) — Sami's stones: path-stones, rock-flower, sami-bench (new)

**Built** (base `2e1035bfa`; every name is the s3 brief §4's; nothing renamed).

- **path-stones** (Cobble, band 7–9, trick 2 — pick/put, repeat). Source: two rocks of eight (`left 8, max 8`, ids `r1 r2`),
  laid by the seed (`seeded.place`: r1 among (1,1) (2,1) (0,2), r2 among (5,1) (6,2) (4,5) (6,1) — three layouts on seeds
  1–3). Carrier: Cobble's hod of four (`robotStart.basket 4`). Targets: four sites `s1–s4` at (3..6, 3) between Sami's
  path and the post box, `need 4` each — dirt → gravel → cobbles → path. Finish: the path reaches the post box; home =
  the start (2,3) facing east. Wear: the most-walked square loses a stone (`WEAR.site` 120). Reference (the graded
  mockup's program, block for block): `repeat 4 { go to nearest rock, repeat 4 { pick up }, go to nearest site, repeat 4
  { put down } }` — 7 blocks; band 7–9 records it unrolled. Band 10–12's other path, `until [hod] is full { pick }` /
  `until [hod] is empty { put }`, wins on every seed too (engine spec row). Words: title "Build the path to the post box",
  the line says why (four squares of dirt, four stones a square, the hod holds four, the rocks move).
- **rock-flower** (Echo, band 10–12, trick 4 — Olive: is it a…?). As today, with the can: Echo carries an empty can of
  three (`robotStart can 0, canMax 3`; Echo has fill) and fills it at the pond below the start (row 4 now `WWWGGGGG`); the
  two flowers are the targets (`t1 t2`, a drink each — a meter 0/1); the rocks are rock sources (`max 4`); home = the
  start. Reference: `right, fill, left, repeat 4 { forward, left, is it a…? (a flower, 3 times), if Olive says yes
  { water }, right }` — 10 blocks.
- **sami-bench** (new, Cobble, band 10–12, trick 3 — until; plot (46, 8), islander `sami`, the last entry of the literal
  `REQUESTS` before `...IG006_REQUESTS()`, through `SAMI_BENCH()` declared beside `IG006_REQUESTS`). One site `bench` at
  (4,2) with `build: 'bench'`, `need 8`; three rocks whose stones the seed chooses (`seeded.choose` on `left`: r1 among
  2 3 4, r2 among 2 4 6 3, r3 among 4 6 — at least 8 on every seed), the hod of four. Reference: `until [bench] is done
  { until [hod] is full { go to nearest rock, pick up }, go to [bench], until [hod] is empty { put down } }` — 7 blocks,
  the bench and the hod as chips. Why band 10–12 and `until`: the lesson is the big meter — eight stones is two hods, and
  a rock holds a different number each day, so "pick four" runs dry on some days (NAIVE_S loses on seeds 1 and 3, wins
  on 2); band 7–9 would only repeat path-stones' repeat. Reward: the bench sticker (`STICKER.bench` 🪑).
- **Engine** (`ENGINE`, a lane S block after `varStep`, no backtick, no `${`): `seekSkips(t)` — go to nearest passes over a
  rock with no stones (`left` 0; one with a `max` stays on the map) **and a target already full** (a site or a tulip at
  its need — the mockup's rule; `go to nearest site` needs it); `pathSite(t)` / `buildSite(t)`. Call-site hunks: `nearestOf`
  (one line, `if (seekSkips(t)) continue;`), `tileAt` (only a path site reads as `P` when full), `blocked` (`||
  buildSite(th[i])`). **The bench blocks at every stage** (robots walk round a building; a finished bench is furniture
  Sami sits on) and **never reads as path**.
- **Kits**: the bench by stage in both — `benchStage(t)` = 0 pegs and string on dirt · 1 a leg · 2 two legs · 3 the seat ·
  4 built (the back; Sami sits on it), by have/need (need 8: 0–1, 2–3, 4–5, 6–7, 8), on both job looks and pinned equal.
  garden-kit: `SPRITES.bench0–4`, `benchEls` (the Garden region, after `WORLD_CSS`), one call-site line before the path
  site's; garden-3d-kit: `THING_BUILDERS.site` wrapped (a bench branch; the path square's builder unchanged), the chip
  lifted over it (`placeThing`, one line). `Draw world` passes `build` (`JOB_FIELDS.push('build')`).
- **The blocks say bench** (`blocks.js`, three small hunks — lane B's file): a thing named by its id wears its own word on
  the chip (`iw3sK_<id>`) and its states theirs (`iw3sS_<state>_<id>`); `wordsOf` takes those two prefixes. Measured
  before: the bench's until read "until [🟫 square] is path"; now "until [🪑 bench] is built" / "jusqu'à [🪑 banc] est
  construit" (driven).
- **Words** (lane S blocks): `WORDS` `iw3sBench…`, `iw3sStickerBench`, `iw3sGiftBench`; `REQUEST_SUBS` `sami-bench` →
  `iw3sSubBench`; `PAGE_WORDS` `iw3sK_bench`, `iw3sS_done_bench`, `iw3sS_dirt_bench`; in place: `rqStonesTitle`,
  `rqStonesLine`, `subPathStones`, `rqFlowerLine`, `subRockFlower`.
- **NAIVE_S** (`iw003Missions.test.ts`): path-stones — the walk taught on day 1 (seed 1's rocks), wins seed 1, loses 2
  and 3; sami-bench — `repeat 2 { go to nearest rock, repeat 4 pick, go to [bench], repeat 4 put }`, wins seed 2, loses
  1 and 3 (a used-up rock, a bump, the bench short).

**Readings** (worktree, on the final commit; spec files one at a time; drives on ONE deploy made by `drive-pages.sh`;
previous = the brief's §3 readings on `2e1035bfa`):

| gate | exit | total | previous |
|---|---|---|---|
| `cg002Engine.test.ts` | 0 | **237 / 237** | 226 (+2: sami-bench's AC1 rows EN/FR; +9: the lane S describe — 5 rows, 4 arms) |
| `iw003Missions.test.ts -t "[S]"` | 0 | **12 passed** (51 skipped) | 5 of 12 (7 red by design) |
| `iw003Missions.test.ts` (whole, for the orchestrator) | 1 | 35 passed, 28 failed (lanes M, P, B not merged) | 28 passed |
| `cg003Template` · `cg005Olive` · `cg006Requests` · `ig004Island` · `p108s2Join` | 0 each | 141 · 41 · 83 · 23 · 4 | same |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **51** · **44** | 50 · 43 (+1 each: the bench by stage) |
| `iw004Blocks` | 0 | **56** | 54 (+2: sami-bench's two bands) |
| `npm run template:garden` | 0 | drift committed with the source; re-run in the drive: 0 drift | 0 |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **327 / 327** | 331 — 4 fewer by design: IG-002's four stones clauses a pass (rock shrinks, load, laid, Perfect) are three on the job model (rocks mined + load, stages, Perfect) × 4 passes |
| `drive-iw003-stones.js` (new) 2D | 0 | **32 / 32** | — |
| `drive-iw003-stones.js --mode 3d` | 0 | **14 / 14** (no Too Slow on this run; one earlier run fell back to 2D mid-run under swiftshader — the known flake — and the drive now resets the stored renderer before each 3D request and says when 3D is not on the stage) | — |
| kit fixture 2D `drive-cg001-kit.js` | 0 | **39 / 39** | 38 (+1 the bench) |
| kit fixture 3D `drive-ig007-3d.js` | 0 | **26 / 26** | 25 (+1) |
| island 2D `--perf` · 3D | 0 · 0 | **65 / 65** (AC6 p95 16.8 ms at CPU ×4, 1199 frames, 23 moves) · **5 / 5** | 65 · 5 |
| robots 2D · 3D | 0 · 0 | **60 / 60** · **4 / 4** | 60 · 4 |
| IW-001 · IW-004 2D · IW-004 3D · modes | 0 each | 38 · 19 · 3 · 90 | same |
| Workshop 3D · nogl | 0 · 0 | 24 · 8 | same |
| Olive `drive-olive.sh pages` | 0 | **22 / 22** | 22 |
| shell `node --test` | 0 | 91 / 91 | 91 |

**Arms** (each rule mutated, the row red, restored by copy): the used-up-rock skip dropped from `nearestOf` → the IW-003
[S] rows path-stones and sami-bench red (2) and the engine arm row picks the empty rock; the full-target skip dropped →
`go to nearest site` stops at the square that is path; the bench reading as path → its tile is `P`; the bench not
blocking → a robot walks onto it; 2D Sami never drawn → the kit row red; 3D first leg missing → the kit row red.

**Screenshots looked at** (`iw003-stones-scratch/pages/iw003s-2d`, `iw003s-3d`, `kit2d/shots`, `kit3d/shots`):
`iw3s-ps-1368-en-03-mid` — Cobble with a stone on his back beside the first square turned gravel, the other three dirt
0/4, the rocks' chips 4/8 and 8/8; beside the mockup's `09-path-running` the program is the mockup's block for block and
the squares, chips and hod read the same; `iw3s-ps-3d-1368-en-03-mid` — the same in the round (dirt and cobbles patches,
chips over the squares and rocks), the mockup's 3D look; `iw3s-ps-*-03-home` — four sand path squares 4/4 green, "Home!
All done.", Cobble on his start tile; `iw3s-sb-1024-en-03-mid` — two legs of the bench (4/8) in the watch ring;
`iw3s-sb-*-03-home` — the bench built, Sami on it, 8/8 green, Cobble home; the win card "New: Bench sticker · Cobble
learned: repeat until"; the program reads "until [🪑 bench] is built { until [✋ what Cobble holds] is full { go to the
nearest 🪨 rock, pick up }, go to [🪑 bench], until [✋ what Cobble holds] is empty { put down } }"; `iw003s-2d-bench-0…8`
and `iw003s-3d-bench-0…8` — pegs and a dashed plan on dirt, a leg, two legs, the seat, the built bench on gravel with Sami
sitting (the first 2D look had his head under the chip and the 3D back on the path side hiding him — both fixed and
re-looked at); `ig004-ac6-three-robots` — Cobble at work on the stones' plot with its chips, the bench's plot at (46, 8)
with 0/8 and its rocks; `iw3s-rf-*-03-home` — both flowers 1/1, Echo home.

**Against §5:** AC1 ✅ for S's three (job, targets + home, `job_done`, no `carrying`/`thing_at`). AC2 ✅ (three seeds × EN/FR
× bands; path-stones and sami-bench seeded, NAIVE_S loses on ≥1 seed and wins on ≥1; rock-flower teaches `if`, not
seeded). AC3 ✅ in words (FR below for Richard's read). AC4 🟡 — the island draws my plots with their meters and Cobble at
work (island drive 65/65, screenshot), and the engine spec proves the stones' plot trace; the drive clauses "finishing,
walking home, going back after wear" on a plot are lane M's (brief §4.3) — not driven on my plots. AC5 ✅ for S (page
drive, my drive 2D + 3D, both languages, 1024/1368/390, looked at beside IW-000). Owned: `go_nearest rock` skips a used-up
rock ✅ (spec row + arm); the bench in the engine ✅ and drawn by stage in both kits ✅ (specs + kit drives + screenshots).

**Deviations, with the reason:**

1. **path-stones is seeded** (`place`, the rocks' tiles), though §4.2's table says "—": the gate's row 3 demands a seeded
   layout and a losing NAIVE for any mission whose reference walks with `go_nearest`, and the graded mockup's program
   walks with it. Measured: seeds 1–3 lay three layouts; the taught walk of seed 1 loses on 2 and 3.
2. **`go to nearest` also skips a full target** (a site or a tulip at its need), not only a used-up rock — the mockup's
   rule, and what `go to nearest site` needs (without it the second trip walks back to the first square, the arm row).
   Lane M: a full tulip is passed over too.
3. **The bench blocks at every stage** (asked: "decide whether a finished bench blocks") — a building is walked round,
   never over, while it rises and after; `JOB_VOCABULARY`'s `site` row keeps `blocks: false` (a path square); the
   engine's `buildSite` is the one rule.
4. **sami-bench's goal is `job_done` alone** (no `uses until`): the gate's row 3 needs the fixed-count program to WIN on a
   seed, which a `uses until` goal forbids; the seeded rocks carry the lesson (the naive run bumps a used-up rock).
5. **rock-flower's can is Echo's own** (`robotStart can 0`), not a can thing to pick up: the lesson is Olive's vote, the
   brief says "as today, with the can", and a pick would have added two blocks to a 10-block program.
6. **Blocks words for a thing named by its id** — three hunks in `blocks.js` (lane B's file) and `iw3s…` words: the bench's
   until read "until [🟫 square] is path" (measured on the page) — a 7-year-old's misreading. B may prefer to fold this
   into its own words; the key shapes are `iw3sK_<id>`, `iw3sS_<state>_<id>`.
7. **WEAR unchanged**: path-stones' longest run is 110 ticks (band 10–12, seed 3) < `site` 120; sami-bench 78; rock-flower 47
   < `tulip` 60.
8. **Spec clauses the rewrite broke, changed** (each a small hunk): `cg002Engine` — AC1 row count (from the list, not 34),
   the known goal names (+ `job_done`), IG-002 AC3's stones consequence, the fill-palette row (+ `go_nearest`,
   `ROCKS_ON_PURPOSE` + sami-bench), the fold-nudge bodies (+ each repeat body as recorded), IG-005 AC1's two stones
   palettes, IW-002's wear-vs-run rule (per target kind), IW-002 AC4's "no job, no seed" (the requests with neither;
   known-firing on the job ones), IW-005's "only the sixteen" (every block the engine's or Olive's); `cg006Requests` —
   the rest list, the tick bound (a job's by its targets' wear), 2b's wrong program and its row; `cg003Template` — Start
   world / Record step / Draw world on the stones (seed 1), Island rows (+ sami-bench), the 13-unchanged half (requests
   with no job); `cg005Olive` — its world laid as Start world lays it; `ig004Island` — the solo trace's seed and window,
   AC4's laid plot; `cg001GardenKit` / `ig007Garden3d` — the 13-unchanged clauses (no job, no seed); `iw004Blocks` — the
   "as stored" arm only where Block List could hold the program (no object slot).
9. **Drive clauses changed**: `drive-cg003-pages.js` — IG-002 stones (AC4 rocks + load, AC4 stages, AC3 Perfect: built
   from the drawer and Played), IG-001 D9/D5/D3 stones (built from the drawer), IG-006 AC3 (right, fill, left first), the
   AC9 words filter (a meter's "n/m"); `drive-ig005-robots.js` — `winRequest` builds a go-to-nearest reference from the
   drawer (no pad key walks to a thing), IG-005 AC1's palette list (+ the walks); `drive-cg005-olive.js` — P-IG6-AC3
   (right, fill, left first). New clauses at the END of `drive-cg001-kit.js` / `drive-ig007-3d.js` (the bench).

**FR lines for Richard's read:**

- rqStonesTitle — « Construis le chemin jusqu'à la boîte aux lettres »
- rqStonesLine — « Quatre cases sont encore de la terre. Quatre pierres font d'une case un chemin, et la hotte de {b} en
  porte quatre. Les rochers ne sont pas toujours au même endroit ! »
- subPathStones — « Au rocher, quatre pierres dans la hotte, à une case, quatre pierres posées. Quatre cases, le même
  trajet : range-le dans un « répéter ». »
- rqFlowerLine — « Des fleurs et des rochers, côte à côte. Remplis l'arrosoir à la mare, puis demande à Olive si chacun est
  une fleur avant que {b} l'arrose : les rochers ne boivent pas. Si elle se trompe, demande trois fois. »
- subRockFlower — « Remplis d'abord l'arrosoir à la mare. Olive a raison presque tout le temps, pas à chaque fois.
  Demande trois fois, et le compte décide. »
- iw3sBenchTitle — « Construis un banc pour Sami » · iw3sBenchBlurb — « Répéter jusqu'à »
- iw3sBenchLine — « J'aimerais tant un banc pour m'asseoir. Il faut huit pierres : deux hottes pleines. Les rochers ont
  plus de pierres certains jours, moins d'autres jours : remplis la hotte jusqu'à ce qu'elle soit pleine, et continue
  jusqu'à ce que mon banc soit construit ! »
- iw3sSubBench — « Personne ne sait combien de pierres a un rocher aujourd'hui. {b} peut remplir la hotte jusqu'à ce
  qu'elle soit pleine, et continuer jusqu'à ce que le banc soit construit. »
- iw3sStickerBench — « Autocollant banc » · iw3sGiftBench — « Un autocollant banc, offert par Sami »
- iw3sK_bench — « 🪑 banc » · iw3sS_done_bench — « est construit » · iw3sS_dirt_bench — « n'est pas encore construit »

**Not done, and why:** the island clauses for my plots (finishing, walking home, going back after wear) — lane M owns the
island drive's job clauses this session; the mockup's job card (source · carrier · target · finish line · wear) and its
"1/4 squares are path" summary are not on the Workshop — no lane owns them this session.

**Could not verify / seen, not mine:** the tablet (touch; Sami's size on a small tile); a real GPU (3D under swiftshader
fell back to 2D once mid-run — the known flake); at 1024 × 768 the bench's program runs past the workspace's right
edge, so the drive brings a slot in with ⤢, a drag of the background and − (8 zooms, 4 drags in the 2D run) — lane B's
look fix; the drawer's `go to nearest` always starts on "egg", so on Cobble's missions a child must change it (lane B's
drawer); Cobble's name pill sits over the chip of the square below him (2D); on the island the flowers' and rocks'
compact chips on rock-flower's plot touch (lane B's compact chips); a built bench shows Sami sitting while his islander
pin may also stand on the island (two Samis), not driven.

### Session 3 (2026-09-30, lane P `iw003-post`) — the post: path-postbox, letter-say, sami-thanks, and the envelopes

**Built.** Every name is brief s3 §4's; nothing renamed.

- **The four missions on the job model** (`cg002Content.ts`). Each: source = a `postbox` thing with its letter(s) on its
  tile; carrier = the robot's hands (Pip) / satchel (Pocket); target = a `door` thing (`owner`, `count 0`, `capacity 1`,
  item `letter`) under its owner's house; finish line = every door full, then the walk home; wear = `WEAR.door` (90).
  Home = the start tile and pose.
  - `path-postbox` (Pip, band 1, trick 1): post box (2,2), Sami's door (7,3) at the path's end under his house (7,2).
    Reference: `fwd fwd left pick right fwd fwd fwd fwd put` — still a sequence, 10 blocks. Palette `fwd left right pick put`.
  - `letter-say` (Pocket, band 2, trick 1): post box (1,4), Sami's door (7,3). Reference `fwd right pick left repeat 5
    {fwd} put say(thanksSami)`; goal `job_done` + `said`.
  - `sami-thanks` (Pocket, band 2, predict): the note stays; post box (2,4), Mamie Rose's door (5,2) under her house.
    Reference `repeat 2 {fwd} right pick left repeat 3 {fwd} left put olive:say-thanks(Mamie Rose, carried her letter)`.
  - **`envelopes` (NEW; Pocket, band 2, islander `mamie`, plot (46,1), the LAST entry of `IG006_REQUESTS()`; tricks [2]):**
    a street of three houses and doors (Mamie Rose (1,1), Sami (4,1), Biscuit (7,1)), the post box (2,2) with letters
    `e1 e2 e3` whose `to` is `shuffle`d per seed over the three names; Pocket starts (3,3) facing the houses. Reference
    `repeat 3 { go_to [post box], pick, olive:read, go_to {ref:'read'}, put }` (6 blocks). Palette `fwd left right pick
    put go_to repeat`, rung `read`; goal `job_done`. Reward: sticker `envelope` (💌).
- **The door in the engine** (`ENGINE`, new functions after `varStep`, lane-P comment): `mailPick` (a letter picked keeps
  its `to` on the delta; a letter taken back out of a door wears its owner's name), `mailPut` (a door ahead: only its item,
  one at a time, to capacity — `full` + `sayFull` past it; a letter with a name only into the door whose `owner` equals
  it, else delta `wrongDoor: { id, x, y, to, owner }`, sayKey `iw3pWrongDoor`, `run.wrongDoors`, the letter stays in
  hand; a letter with no name goes into any door; a posted letter is delta `post: { id, x, y, into, owner, to }` + `meter`,
  sayKey `iw3pPosted`), `mailWear` (from `wearOf`: every `WEAR.door` ticks one full door — the seed picks — takes its
  letter in, and the letter the post box gets that tick is addressed to that owner, else to a door still waiting),
  `mailApply` (from `apply`), `mailEnvelopeTo` / `mailRead` / `mailFallback` (Olive), `mailRan` (the hint).
  **The carry design:** `carry` stays a list of plain strings. An addressed letter's name rides in `carryTo`, a list
  BESIDE it (`carryTo[i]` is the name on `carry[i]`, `''` for none), kept in step by `mailApply` (both lists only ever
  pop and push at their ends) and deleted when no carried thing has a name — so a robot that never touches an addressed
  letter has exactly the JSON it had (spec rows). A letter put on the ground keeps its `to` there.
  Call-site hunks: `exec` pick (two `mailPick` calls), `exec` put (one `mailPut` line), `wearOf` (one `mailWear` line),
  `apply` (one `mailApply` line before `return w`), `CHOOSE_HINT_SCRIPT` (one `iw3pRead` line before `oliveRung`).
- **Olive's read of an envelope** (IW-005 dev. 6, closed): `OLIVE_ENGINE.oliveRequestOf` → `mailRead`: when the robot
  holds an addressed letter (else the letter a pick would take from the tile ahead), the read's `note` is the envelope —
  `notes_read` "For Sami." / "Pour Sami." — and her `options` are the doors' owners on the plot, in world order;
  `oliveAnswered` → `mailFallback`: an envelope read that comes back with NO word (the island's tick and `runToEnd` take
  the fallback with none) reads the name, exactly the shell's written answer. `go_to {ref:'read'}` then walks to the door
  by `owner` (IW-005's REF read, unchanged). The shell's table: `notes_read` + 3 envelopes (EN/FR index-aligned),
  `plot_objects` + `Mamie Rose`, `Sami`, `Biscuit` (the same in both languages), `written.read` + the 3 → the name.
  `cg005Olive.ts` exports `ENVELOPE_NAMES` / `ENVELOPE_NOTES` (built from the shell's table; it throws if the table
  lacks one). Pocket's palette gains `olive:read` (ROBOTS row — the envelopes need it; the drawer shows it only where a
  request's rungs offer read).
- **The hint** (§6 trap 2): after a run whose Olive read an envelope, `oliveRung2` ("use if Olive read… to send {b} to
  the right row") would send a child to the if block — `iw3pRead` "Olive read the name on the envelope. “Go to” what
  Olive read takes {b} to that door." takes its place (only when the run read an envelope; Mamie's note keeps oliveRung2).
- **Drawn in both kits:** 2D sprites `door` / `doorMail` (the letter's corner in the slot once one is through), a name
  plate (`.gd-plate`, `data-owner`) under the door, hidden on a wide world (the island); 3D `THING_BUILDERS.door`
  (step, frame, panel, letterbox, knob; + the letter at count > 0), its chip over the lintel (`METER_LIFT.door` 0.98), the
  plate a `gd3-plate` pill in the overlay seated on the door's step. `Draw world` passes `door` and `owner`
  (`JOB_THINGS.door`, `JOB_FIELDS.push('owner')`); a letter's `to` is NOT passed (Olive reads it; the child does not).
- **The drawer** (`blocks.js` `toolboxOf`, lane B's file, one hunk): the envelopes' palette has go to and Olive's read but
  no until/if, and the value blocks came only with until/if — so "what Olive read" could not be put into go to. A band
  10–12 drawer with `go_to` + `olive:read` and no until/if now offers that one chip (nothing else).
- **Words** (EN + FR): `WORDS` lane-P block `iw3pEnvTitle iw3pEnvBlurb iw3pEnvLine iw3pStickerEnvelope iw3pGiftEnvelope
  iw3pPosted iw3pWrongDoor`; `HINTS` `iw3pRead`; `PAGE_WORDS` (REQUEST_SUBS) `iw3pSubEnvelopes`; edited in place:
  `rqPathTitle rqPathLine rqLetterLine thanksSami` (WORDS), `rqThanksTitle rqThanksLine` (IG006_WORDS), `subPathPostbox
  subLetterSay` (REQUEST_SUBS).

**Readings** (worktree, final commit `94ffd2f3a`; spec files one at a time; the drives on ONE deploy from
`drive-pages.sh` at `4888ec79c` + the drive fix; previous = brief s3 §3):

| gate | exit | total | previous |
|---|---|---|---|
| `iw003Missions -t "\[P\]"` | 0 | **16 passed** (47 skipped) | 6 of 16 green at the base |
| `iw003Missions` whole | 1 (other lanes' rows, by design) | 38 passed, 25 failed, 63 | 28 / 35 |
| `cg002Engine` | 0 | **239** | 226 (+13: the lane-P describe's 7 rows + 4 arms, and the envelopes' 2 AC1 rows) |
| `cg003Template` | 0 | **143** | 141 (+2 lane P) |
| `cg005Olive` | 0 | 41 | 41 |
| `cg006Requests` | 0 | 83 | 83 |
| `ig004Island` | 0 | **24** | 23 (+1 lane P) |
| `cg001GardenKit` | 0 | **52** | 50 (+2 lane P) |
| `ig007Garden3d` | 0 | **45** | 43 (+2 lane P) |
| `iw004Blocks` | 0 | **57** | 54 (+1 drawer row, +2 envelopes round-trip rows) |
| `p108s2Join` | 0 | 4 | 4 |
| shell `node --test` | 0 | **92** | 91 (+1 envelope test) |
| `npm run template:garden` | 0 | drift committed with the source; re-run inside the last page drive: 0 drift | — |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **331/331** | 331/331 (the first run read 329/331: the AC9 island language pair — my doors' "0/1" chips; fixed below) |
| `drive-iw003-post.js` 2D (new) | 0 | **17/17** | — |
| `drive-iw003-post.js --mode 3d` (new) | 0 on run 3 | **10/10** (run 1: 9/10 — the FR doors' 3D chips read empty after the win while the engine read 1/1 ×3; run 2: crashed before the first clause at the new-player form, fixed by waiting for it; run 3: 10/10) | — |
| island drive 2D `--perf` | 0 | **65/65**; AC6 p95 16.8 ms at CPU ×4 (1196 frames, 23 moves) | 65/65, 16.7 ms |
| island drive 3D | 0 | **5/5** | 5/5 |
| `drive-iw001-workshop.js` | 0 | **38/38** (36/38 before the AC6 fix below) | 38/38 |
| `drive-iw004-blocks.js` | 0 | 19/19 | 19/19 |
| `drive-ig003-modes.js` | 0 | 90/90 | 90/90 |
| `drive-ig005-robots.js` | 0 | 60/60 | 60/60 |
| `drive-olive.sh pages` | 0 | 22/22 | 22/22 |
| kit drive 2D `drive-cg001-kit.js` | 0 | **40/40** (+2 lane P) | 38/38 |
| kit drive 3D `drive-ig007-3d.js` | 0 | **27/27** (+2 lane P) | 25/25 |

Not re-run: Workshop 3D / nogl (no
tulip-plot change of mine), robots 3D, IW-004 3D.

**Screenshots looked at** (`iw003-post-scratch/`): `pages/post-2d/iw003-p1-postbox-start-1024.png` — Sami's plot: the red
post box with the letter peeking at (2,2), Sami's house at the path's end with the door under it, its "Sami" plate and a
"0/1" letter chip; the band 7–9 drawer (go, left, right, take, drop); `…-p1-postbox-won-1024.png` — "Home! All done." over
Pip at the start, the win card "Thank you, Pip!", 10 blocks, New: Cap, Sami lends Cobble; `…-p3-envelopes-built-2d-en.png`
— the street: three houses, three doors with plates Mamie Rose / Sami / Biscuit and 0/1 chips, the post box ringed violet
(the go-to chip watched), the program `repeat 3 { go to [post box], pick up, read the note, go to [what Olive read],
put down }`, the pad with arrows, take, drop and Olive's read; `…-p3-envelopes-won-2d-fr.png` — « Merci, Poche ! », 6 blocs,
Nouveau : Autocollant enveloppe, Poche a appris : répéter; `…-p3-envelopes-no-put-en.png` — Pocket at Biscuit's door
carrying letters, three 0/1 chips, the owl: "Olive read the name on the envelope. “Go to” what Olive read takes Pocket to
that door."; `…-p4-sami-thanks-390.png` — the note, the post box with its letter, Pocket; Mamie Rose's plate shows and
her door sits UNDER the drive pad (see findings); `pages/post-3d/iw003-p3-envelopes-built-3d-fr.png` — Garden 3D: the
houses, the doors in the round with their plates on their steps, 0/1 chips, the post box ringed, the FR program
(aller à [boîte aux lettres] … aller à [ce qu’Olive a lu]); `kit2d/shots/iw003-2d-doors-after.png` — Sami's door with
the letter in its slot and a green 1/1, the others 0/1, Biscuit's letter still peeking from the post box;
`kit3d/shots/iw003-3d-doors-after.png` — the same in 3D, the plates on the steps, the post box visible (the first 3D
cut put the plate a tile forward, over the post box — seen, fixed in `cae8ea4cc`, re-driven);
`pages/island-2d/ig004-ac6-three-robots.png` — Pip home on Sami's path plot beside a green 1/1 door chip, the
envelopes' plot padlocked top right, no plates on the island.

**Acceptance, against §5 (my missions) and brief §4.3 row P:**

1. ✅ path-postbox, letter-say, sami-thanks and envelopes are jobs (`job` targets + home, `job_done`, no `carrying` /
   `thing_at`) — gate row 1 ×4.
2. ✅ each wins on seeds 1–3 × EN/FR × every band from its own (gate row 2 ×4; the longest run: the envelopes, 46 ticks <
   `WEAR.door` 90, and below `WEAR.tulip` 60, which the IW-002 row measures against every request); the envelopes teach
   `go_to`, are `seeded` (shuffle; seeds 1 / 2 / 3 deal Biscuit·Mamie·Sami / Sami·Mamie·Biscuit / the same as 2), and
   `NAIVE_P.envelopes` (the three doors in a row, no read: seed 1's order) wins on seed 1 and loses on 2 and 3 (row 3).
3. ✅ the copy says the reason in a 7-year-old's words, EN + FR (FR lines below, for Richard).
4. 🟡 the island: the spec (`ig004Island` lane P) plays the envelopes plot on the tick: Olive's read with no word, three
   letters to three doors, home, wait; at `WEAR.door` a neighbour takes a letter in, the post box gets one addressed to
   that door, Pocket goes back and delivers it there (never a wrong door). The island drive shows Pip home on Sami's
   path plot with its door green; no island DRIVE clause of mine (the island's job clauses are lane M's).
5. ✅ page drive, my drive 2D + 3D (both languages, 1024 / 1368 / 390), island 2D + 3D, screenshots looked at.

Owned items: ✅ the door in the engine (spec rows + arms: the owner check, the name kept on pick, the fallback read, the
wear's address); ✅ doors in both kits (specs + both fixture drives, screenshots); ✅ Olive's read of an envelope
(options, written answers, the shell's own slot check and grammar in a shell test; the real route through the stub in my
drive: the note sent was the envelope, the options the three names).

**Deviations and choices, with reasons:**

1. **The engine reads the name itself when Olive gives no word** (`mailFallback`): the island's tick and `runToEnd`
   answer every ask with a bare fallback, so without it a pinned envelopes program could never deliver on the island.
   The value it reads is exactly the shell's written answer for that envelope. Mamie's note is unchanged (no word → no read).
2. **A new delta `post`** (not `stow`): `stow` is the site/basket/store put, and a door also carries `owner` / `to`.
   New delta keys: `post`, `wrongDoor`; `pick.to`, `letter.to`; robot field `carryTo`; run counter `wrongDoors`.
3. **Pocket's palette + `olive:read`** (a `ROBOTS` row): the gate requires every block to be the robot's, and the
   envelopes are Pocket's. **A `blocks.js` hunk** (lane B's file): the read chip for go to (above).
4. **Home = start** for all four; for **sami-thanks' Predict** that means a program that finishes the job always ends at
   home — the challenge now asks "does the job get done?" more than "where". Kept (IW-002 dev. 7); flagged for Richard.
5. **envelopes: tricks [2]** (the loop over three letters; no trick number names "go to what Olive read"). Start (3,3)
   facing the houses and the post box at (2,2), so the run (46 ticks) stays under every wear period (first layout: 64).
6. **Shared spec / drive rows re-cut** because a mission on the job model changes them (each named): `cg002Engine` AC1
   rows count (derived from REQUESTS), goal names (+ `job_done`), Start world's no-job row (a job request starts with its
   job and a seed), the "sixteen old blocks" row (any engine block); `cg006Requests` `rest` (+ envelopes);
   `cg005Olive` IG-006 three (not the last three any more; worlds laid through `seedWorld`); `ig004Island` AC4 (a
   seeded field is the plot's seed's); `cg003Template` Island rows blocked (+ envelopes), Draw world's known-firing half
   (requests with no job); `cg001GardenKit` / `ig007Garden3d` the 13-requests rows (requests with no job);
   `iw004Blocks` the v4-stored half skipped for programs with a chip slot (Block List never stored one). Drives:
   `drive-cg003-pages.js` S4-PATH (the missed run on Sami's path says "0 of 1 done"), AC9 `words()` (a meter's "0/1" is
   language-free); `drive-iw001-workshop.js` AC6 pick/put (the letter is in the post box now).

**FR lines for Richard's read** (IW-003 AC3): rqPathTitle « Apporte ma lettre depuis la boîte aux lettres » ·
rqPathLine « Une lettre m’attend dans la boîte aux lettres. {b} peut aller la chercher et l’apporter à ma porte ? » ·
rqLetterLine « Il y a du courrier pour moi dans la boîte aux lettres ! Apporte-le à ma porte, et dis quelque chose de
gentil en arrivant. » · thanksSami « Du courrier pour toi, Sami ! Belle journée ! » · rqThanksTitle « Porte la lettre,
puis dis merci » · rqThanksLine « Il y a une lettre pour Mamie Rose dans la boîte aux lettres. Porte-la à sa porte, puis
laisse Olive trouver les mots pour la remercier. » · iw3pEnvTitle « Apporte chaque lettre à la bonne porte » ·
iw3pEnvBlurb « Aller à ce qu’Olive a lu » · iw3pEnvLine « Trois lettres sont arrivées pour mes voisins. Demande à Olive
de lire le nom sur chacune, puis {b} l’apporte à cette porte ! » · iw3pStickerEnvelope « Autocollant enveloppe » ·
iw3pGiftEnvelope « Un autocollant enveloppe, offert par Mamie Rose » · iw3pPosted « Livrée ! » · iw3pWrongDoor « Pas cette
porte ! Quel nom est écrit sur la lettre ? » · iw3pRead « Olive a lu le nom sur l’enveloppe. « Aller à » ce qu’Olive a lu
emmène {b} à cette porte. » · subPathPostbox « Conduis {b} jusqu’à la boîte aux lettres, prends la lettre, et porte-la à la
porte de Sami. Chaque pas devient un bloc. » · subLetterSay « Va chercher la lettre dans la boîte aux lettres, porte-la à
la porte de Sami, puis donne à {b} quelque chose de gentil à dire. » · iw3pSubEnvelopes « Un programme ne sait pas lire un
nom, Olive si. {b} prend une lettre, Olive la lit, puis « aller à » ce qu’elle a lu. » · the envelopes' notes « Pour Mamie
Rose. » « Pour Sami. » « Pour Biscuit. »

**Found, not mine to fix (for the orchestrator):** the read block's label is "read the note" / « lire le mot » (the
rung's word) on the envelopes too; on the phone (390) the drive pad sits over the world's right half on every mission
(sami-thanks' door and chip are under it); the 3D world's plate sits on the door step, but on the 14 px island all
plates are hidden (the doors show only their compact chips).

**Could not verify:** a REAL model reading an envelope (the stub and the written answer only; the exam has no envelope
probe); sami-thanks played to its win on a page (drawn at 390 only — its Olive block's slots need the picker); the
tablet; the island DRIVE seeing Pocket go back after a door wears (the tick spec does); the 3D drive's run-1 red
(FR chips read empty after the win, engine 1/1 ×3) did not come back on run 3.

**For the merge:** shared regions touched — `ENGINE` (lane-P functions after `varStep`; hunks in `exec` pick/put,
`wearOf`, `apply`, `CHOOSE_HINT_SCRIPT`), `OLIVE_ENGINE` (`oliveRequestOf`, `oliveAnswered`), `DRAW_WORLD_SCRIPT`
(`JOB_FIELDS.push('owner')`, `JOB_THINGS.door`), `LOOK_ROWS_SCRIPT` STICKER (+ `envelope`), `ROBOTS` (Pocket), `WORDS` /
`HINTS` end blocks, `REQUEST_SUBS` (end), `IG006_WORDS` (rqThanks*), the kits (Garden region sprite table end + one
cell branch; `THING_BUILDERS` end, `METER_LIFT.door`, the overlay's plate loop, the labels' position line), `blocks.js`
`toolboxOf`. Both kits' built `index.js` and `templates/bot-garden` must be rebuilt / regenerated after the merge.

### Session 3 (2026-09-30, lane B `iw003-biscuit`, base `2e1035bfa`) — Biscuit's missions; the ball; teach again

**Built** (commits `112611263`, `daa458cf9`, `ff3ebbe45`, `0865296c8`).

- **bowl-if** (Cobble, band 10–12, if): source the food sack (`store` `sack`, item food, count 99, no capacity: no chip)
  at 0,2; carrier Cobble's hands; targets three bowls `b1 b2 b3` at 2,2 · 4,2 · 6,2, capacity 1 each; the seed deals
  which one Biscuit has NOT eaten from (`seeded.shuffle` of `food` over `[0, 0, 1]`); home = start 0,3 facing right.
  Reference: `left, pick, pick, right, repeat 3 { fwd, fwd, left, if [the bowl is empty] { put }, right }` (11 blocks).
  Goal `job_done` + `uses if`. Wear: a bowl empties every `WEAR.bowl` (60) island ticks and Cobble goes back.
- **wall-until** (Pip, until): a real wall `L` on the path at a seeded column 5–7 (`wallAt`), Biscuit's ball in the
  corner by it — the tile before the wall, one row up (`seeded.byWall`, new, see engine) — and his basket `bed`
  (item ball, capacity 1) at 0,3, beside Pip's start 1,3. Reference: `until [the wall is ahead] { fwd }, left, pick,
  left, until [the wall is ahead] { fwd }, put` (8 blocks; the way back ends facing the basket, which blocks). Goal
  `job_done` + `no_bump` (new) + `uses until`. `repeat 7 {fwd}` bumps into the wall on every seed (spec row); the
  NAIVE_B program (until out, a counted `repeat 4` back) wins on the wall at 6 and loses at 5 (a bump) and 7.
  Wear: Biscuit takes the ball out of the basket (`WEAR.basket`, 90) and it rolls back to its spot by the wall.
- **meow-when** (Pip, when): source the treat jar (`store` `jar`, item food) at 1,2; target the bowl at 2,3,
  capacity 2; meows at ticks 1 and 8 (the handler, a noop and four steps, ends before the next). Reference:
  `when meow { left, pick, right, put }` — turn to the jar, take a treat, turn back, put it in the bowl. Goal
  `job_done` + `handled meow 2`; Pip never leaves home.
- **Engine hunks** (`cg002Scripts.ts`, each under a `P108 IW-003 (lane B)` comment): `goalMet` — goal `no_bump` (one
  line); `SEED_HELPERS.layOut` — one call line after `place` + new `layByWall` (a thing laid at the drawn wall + dx/dy,
  its tile written as `spot` on the container `spotOn` names; draws nothing from the seed); `apply`'s `wear` — a call
  to new `rollOut` (after `varStep`): a container with a `spot` puts the worn item back there when it is PICKABLE;
  `CHOOSE_HINT_SCRIPT` — one line: every target full and home but no win → `iw3bTrick`.
- **Content**: `Goal.name` + `'no_bump'`; `SeededSpec.byWall`; `HINTS.iw3bTrick` (lane block); copy edited in place
  (`rqBowlLine`, `rqWallTitle`, `rqWallLine`, `rqMeowTitle`, `rqMeowLine`); `PAGE_WORDS.iw3bTeachAgain`.
- **Draw world**: the `ball` passes through; a bowl with a capacity and no `count` is handed its `food` as `count`.
- **Both kits**: the ball (2D sprite / 3D `ballOf`: sphere + seam), on the grass, as a robot's load, and in Biscuit's
  basket (`basketBall`); a store of food shows biscuits, not stones (`storeFood` / 3D biscuits); a container's meter
  reads `count`, else `food` (the engine's rule; both copies of `meterOf`, still pinned equal); the island's compact
  meter is a bar (2D ≤ min(12 px, 82 % of the tile); 3D ≤ 12 px and 80 % of the tile as the camera sees it, set each
  frame) — neighbouring tulips' chips no longer overlap on the 14 px island.

**Readings** (worktree, each spec file alone, exit 0 unless named; previous = brief §3 at `2e1035bfa`):

| gate | exit | total | previous |
|---|---|---|---|
| `iw003Missions -t "\[B\]"` | 0 | **12 / 12** | the base's B rows red by design (count per lane not measured) |
| `iw003Missions` whole file | 1 | 35 passed, 28 red (M, S, P rows, not in this worktree) | 28 / 35 red |
| `cg002Engine` | 0 | **232** | 226 (+6: lane B describe — wall and ball over 40 seeds, repeat 7 / repeat 4, the ball rolls back, bowl-if's seeds, meow-when, the iw3bTrick hint) |
| `ig004Island` | 0 | **29** | 23 (+6: teach again ×4, wall-until and bowl-if/meow-when going round on the island) |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **53** · **46** | 50 · 43 (+3 each) |
| `cg003Template` · `cg005Olive` · `cg006Requests` · `iw004Blocks` · `p108s2Join` | 0 each | 141 · 41 · 83 · 54 · 4 | same |
| `npm run template:garden` | 0 | engine gate 232/232; 0 drift after `0865296c8` | 0 |
| page drive `drive-pages.sh` (`--mockup`), final deploy | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **331/331** | 331/331 |
| `drive-iw003-biscuit.js` (new), final deploy | 0 | **24/24** | — |
| island 2D `--perf` / 3D | 0 / 0 | **65/65** (AC6 p95 16.7 ms at CPU ×4, 1200 frames) / **5/5** | 65/65 / 5/5 |
| IW-004 2D / 3D | 0 / 1 then 0 | **19/19** / 2 of 4 (the chip not found, a lone red) then **3/3** | 19/19 / 3/3 |
| IW-001 · modes · robots 2D / 3D | 0 each | **38/38** · **90/90** · **60/60** / **4/4** | same |
| Workshop 3D / nogl | 1 then 0 / 0 | 3D fell back to 2D (Too Slow under swiftshader: the brief's known flake), then **24/24** (p95 26.1 ms) / **8/8** | 24/24 / 8/8 |
| Olive `drive-olive.sh pages` · shell `node --test` | 0 · 0 | **22/22** · **91/91** | same |
| kit fixtures 2D / 3D | 0 / 0 | **41/41** / **27/27** (BALL, FOOD, BARS; 3D BALL, BARS) | 38/38 / 25/25 |

Drives and screenshots (all LOOKED at): `iw003-biscuit-scratch/pages/iw003b/` — `iw003b-look-1368-en-wall-until.png`
(the stone wall on the path, the ball red in the corner above the tile before it, the basket 0/1, the program whole),
`iw003b-look-1024-wall-until.png` (the whole program at scale 0.53 beside the drawer, the pad and Play on the first
screen), `iw003b-look-390-wall-until.png`, `iw003b-bowl-if-1368-en-won.png` (three bowls 1/1 green, Cobble home, "Thank
you, Cobble!", Biscuit lends Pocket), `iw003b-meow-when-1368-fr-won.png` (the bowl 2/2, « Merci, Pip ! »),
`iw003b-island-meow-when-again.png` (Cobble on bowl-if with green bars, Pip on meow-when, Pocket home),
`iw003b-teach-island-en.png` and `iw003b-teach-workshop-fr.png` (below); kit fixtures `kit2d/shots/iw003-2d-*`,
`kit3d/shots/iw003-3d-*` (the ball on Pip's back in 3D; the island bars apart).

**Against §5:** AC1 ✅ (the three on the job model, no `carrying`/`thing_at`). AC2 ✅ (seeds 1–3 × EN/FR, band 10–12;
wall-until seeded, its fixed walks lose on a seed). AC3 🟡 copy says the reason; FR lines below for Richard's read.
AC4 ✅ for Biscuit's plots (spec: wall-until and both bowls go round; drive: meow-when's Pip finishes, waits, goes back).
AC5 🟡 page and island drives both languages, 1024 / 1368 / 390, 2D + 3D kits; the look beside IW-000 is Richard's.
Owned items: the ball in both kits ✅; the Workshop look ✅ (IW-004 §6); teach again ✅ (IW-004 §6).

**Deviations, with reasons:** (1) **`no_bump`, a new goal**: without it a `repeat 7 {fwd}` walks into the wall and
stops where `until` stops (a bump is harmless), so "repeat 7 must lose" could not hold. (2) **`seeded.byWall` and
`rollOut`, new**: the base's `wallAt` and `place` draw independently, so the ball could not be "just before the wall";
and a ball stowed in the basket leaves the map, so wear would reopen a job with nothing to fetch (the robot would
flail). (3) **wall-until keeps `uses until`**, so NAIVE_B uses an until out and a counted walk back (a fully fixed walk
cannot win the goal on any seed; the near-miss is the counted way home). (4) **bowl-if's `if` does not change the
world**: a put into a full bowl is refused ("It's full!", the item stays carried), so a walk that puts everywhere
fills the job too; the goal keeps `uses if`, and the new hint `iw3bTrick` tells her the job is done but not the way
the card asks. (5) **The sack and the jar hold 99 and never refill** (`store` wears in `wearOf`; no source refill for
a store): about an hour of island play. (6) **meow-when's Pip never walks** (turn, take, turn, put), so the two meows
never interleave. (7) **wall-until's robot starts at 1,3** (the basket stands at 0,3).

**FR lines for Richard's read:** « Je mange dans mes trois gamelles toute la journée. Prends à manger dans le sac et
remplis seulement les vides, {b} ! » · « Rapporte ma balle du mur » · « Ma balle a roulé jusqu’au mur. Avance jusqu’au
mur, ramasse-la et rapporte-la dans mon panier — sans te cogner, {b} ! » · « Quand je miaule, apporte-moi une
friandise » · « À chaque miaulement, {b} prend une friandise dans le bocal et la met dans ma gamelle. Miaou ! » ·
« Réapprends à {b} — le travail a changé. {b} attend à la maison. » · « Le travail est fait ! Maintenant, apprends à {b}
comme la carte le demande — avec son bloc à elle. »

**Could not verify:** the tablet; a real GPU; the look beside IW-000 (Richard's); the other lanes' rewritten missions
under teach again (proved on a fixture of a rewritten request and on Biscuit's three old programs); a Blockly `when`
block shows its event slot "…" until a child picks one (the engine reads meow when none is set — IW-004's).

### Session 3 merge (orchestrator, 2026-09-30, `p108-s3-merge`)

Merged P → B → S → M (the order the lanes finished), then `cline-dev` (P107 s2, the training template: no shared file).
What the merge had to decide, beyond keeping both lanes' appended blocks:

- **A pinned program the rewritten job outgrew now waits (B) — and lane P's island row pinned exactly that** on path-postbox:
  the row now asks Olive first and then runs path-postbox's own reference, so it still proves an ask never parks.
- **The island's tick row counted resets on path-postbox**, which is a job now (it finishes and waits): re-cut to "every
  pinned plot finished its job or went round inside the 200 ticks".
- **Lane M's `sameBlock`** (containers match by shape, so the tulips' pours fold and the passes still fold) offered bowl-if's
  rotated body holding its `if` (lane F's fold-nudge rule, red on the join): narrowed to REPEATS only — an if / until / when
  never matches, as before. M's fold row and its arm green.
- **Mamie's note changes with the day (M)**: lane P's envelope row compared the read with the request's note; it now reads
  the laid world's. The yellow note sits after the three envelopes in `notes_read` (looked up by text, never by index).
- **The pad's go keys (M) beside the stones (S)**: the page drive's stones-pad clauses read a go key as `go:<kind>`; the action
  keys compare as before, and a go key must show exactly where the request offers a walk.
- The Olive requests' order (S's bench is the last of the literal list, P's envelopes the last of `IG006_REQUESTS()`), the
  `rest` / blocked lists, and two missing commas where two lanes' word blocks now meet.

**Merged readings** (`p108-s3-merge`, `5afba75cb`; each spec file alone; every drive on one deploy; each exit 0):
garden specs **800** — cg002Engine 259, cg003Template 148, cg005Olive 41, cg006Requests 83, ig004Island 38, cg001GardenKit 56,
ig007Garden3d 49, iw004Blocks 59, p108s2Join 4, **iw003Missions 63/63**; shell 92/92; `template:garden` exit 0, 0 drift.
Page drive **331/331** (`--mockup`; the first run 326/331 — the five stones-pad clauses above, fixed, re-run) · IW-001 38/38 ·
IW-004 19/19 + 3D 3/3 · modes 90/90 · robots 60/60 + 3D 4/4 · island `--perf` 65/65 (AC6 p95 16.8 ms at CPU ×4) + 3D 5/5 ·
Workshop 3D 24/24 + nogl 8/8 · Olive 22/22 · lane M 34/34 · 7/7 · 3/3 · 6/6 · lane S 32/32 + 3D 14/14 · lane P 17/17 +
3D 10/10 · lane B 24/24 · kit fixtures 2D 44/44, 3D 30/30.

**Looked at on the merged deploy** (`p108-s3-merge-scratch/pages/`): `mamie-ws/m3-1368-en-02-running.png` — the hen's pen,
the basket ringed at 2/4, the job card under the world, the program the mockup's block for block; `stones/iw3s-sb-1024-en-03-mid.png`
— the bench at 4/8 with Cobble beside it, **but the program's right edge cut off at 1024** ("what Cobble h…", "rock");
`post/iw003-p3-envelopes-won-2d-en.png` — three doors at 1/1 green, the win card; `island-shots/ig004-1368-en-01-island.png`
— the 55 × 22 island, every plot's meters as bars, the new column's plots (the envelopes on Mamie's row, the bench on Sami's).

**Open after the merge (look items, not gates):** (1) the 1024 fit (lane B) does not hold for the bench's program;
(2) the envelopes' read block still says "read the note"; (3) the drawer's `go to nearest` always starts on "egg"; (4) at
390 the drive pad covers the right half of the world (sami-thanks' door under it); (5) `iw3Job` says "0 of 1 done" on the
eggs (the basket is one target); (6) full meters are 3.05:1 in both kits (the page overrides with `--leaf`; the kits owe it);
(7) possibly two Samis on the island (his pin and the one on the bench), not driven. **For Richard:** the FR lines (each
lane's block above), the look beside IW-000, and sami-thanks' Predict — with home = start, a finished job always ends at
home, so the challenge now asks "does the job get done?" more than "where does it stop?" (lane P, deviation 5).

### Session 4 (2026-09-30, lane L `iw-look`, base `81a1e7ba2`) — the seven look items

> Restored at the merge (2026-10-01) from the lane's own edits: the lane wrote this block, the disk filled before it
> could commit it, and the worktree folder was deleted to free the disk. Deviation 4 carries the lane's final report.

**Built** (each hunk under a `P108 IW-003 look (lane L)` comment). Every item was shown red on the base's own deploy first
(`drive-iw-look.js`, 80/126 on the base with the fit, read and seek clauses, 5/19 with the pad, hint and Sami ones;
`iw-look-scratch/base/`), then built, then green.

1. **The widest program whole at 1024 × 768, 1368 × 900 and 390** (`blocks.js`). Measured on the base, all fifteen
   reference programs loaded into the workspace, EN and FR: 26 of 90 had a block past the view's edge. Two causes. (a) A
   program the graph hands in whole or a block at a time (a pinned plot's program, the pad in Teach — `appendOne`) was
   never fitted: that path runs with Blockly's events off, so the edit-time fit never saw it (the eggs' until 468 px in a
   351 px view at 1368, scale 0.8); and the load-time fit measured before Blockly had drawn the blocks. Now `appendOne`
   fits too, and every fit runs after Blockly's queued renders (`whenDrawn`). (b) Beside a side drawer some programs
   cannot be whole even at the fit's floor 0.5 (Sami's bench at 1024: 263 px of stack for 168 px of room). Now, zoomed
   to 0.5 and redrawn there (the side drawer's own width follows the zoom — 248 px at 0.8, 191 at 0.5 on one drawer),
   a program still cut moves the drawer to the workspace's foot (the phone's strip; `stripIfCut` → `toStrip`, the
   program, the lock and the ring kept), where the floor is 0.45 (the zoom's own minScale, `FIT_MIN_STRIP`); the drawer
   goes back beside the program when it fits there again at 0.5 with 16 px to spare. At 1024 the drawer moves to the foot
   for 5 of 15 programs in English and 10 of 15 in French (the drawer is 196–269 px of a 412 px box); at 1368 for none;
   a phone's drawer was always the strip. The widest program is the eggs' until (`count of 🥚 in [🧺] = 4`): 0.63 at
   1024 EN, 0.57 FR (strip); 0.53 at 1368 EN, 0.5 FR (beside the drawer); 0.5 at 390 EN, 0.46 FR. Sami's bench: 0.72 /
   0.68 at 1024 (strip), 0.6 / 0.52 at 1368, 0.57 / 0.55 at 390.
2. **The envelopes' read reads the envelope.** Palette (the engine's) takes the request (a new wire from Start world):
   where the plot's letters carry a name (`iwlReadsEnvelope`), Olive's read is "read the envelope" / « lire l’enveloppe »
   — in the drawer, on the placed block, on the pad's key (Pad keys take an Olive key's label from the palette) and on
   its card (Block card, the request wired in too: its title, its line, and an example that reads then goes to the door,
   drawn with the same word). Mamie's note keeps "read the note", its line and its if (the control in every row).
3. **`go to nearest` starts on what the job seeks.** Palette's `go_nearest` entry carries `seek` — the kind of the
   request's reference program's first go to nearest (`iwlFirstSeek`) — Kit palette passes it on, and the drawer block
   starts on it: rock on the stones and the bench, egg on the eggs (the drawer said "egg" on all three).
4. **The phone's pad under the world** (`cg007Look.ts`, the phone rule rewritten in place). Measured on the base: every
   key of the pad on the world's right half (5 to 8 keys), sami-thanks' door under the forward key. Now under 600 px the
   stage is a column — the world, then the pad, 48 px keys in a row, ← ↑ → first (the mockup's ≤ 900 rule) — and the room
   is taken back from Mamie's dots (hidden on a phone: the tulips' chips and the job card say how many are full; beside
   her line they squeezed it to four lines) and the controls' spare margin; the controls are a little tighter (8px 10px,
   14 px) so the French Conduire · Apprendre · Jouer fit one row. AC4 on the tulips, re-measured: Play's bottom 756 (was
   760 EN / 783 FR), the owl's top 812 (was 818 / 841), EN and FR.
5. **"N of 4 done" on the eggs.** Choose hint: a job of ONE target counts that target's meter (the job card's rule) —
   "2 of 4 done" on the basket, "4 of 8" on the bench, "1 of 3" on a tulip; a one-letter door and a job of many targets
   say what they said.
6. **The kits' full green** (`METER_FULL` in both kits): `#058149` — the page's own `--leaf` — on the full chip (its
   numbers are text, white: 4.95:1, the 4.5:1 rule) and the island's full bar (a mark: 4.95:1 against its white ring, the
   3:1 rule). The mockup's `#3FA66B` measured 3.05:1. The page's `--leaf` override (lane M) is now the kits' own colour.
7. **One Sami on the island** — driven: two on the base (his pin standing, and on his built bench), with the bench won and
   his other requests open, and with all his requests done. Draw world now reads each draw: a built bench seats him when
   his pin has nothing to ask (he does not stand as well); with a request to ask (his bubble) he stands and the bench is
   drawn `vacant` (both kits honour it). Read each draw, so a bench that wears and is mended keeps one Sami.

**Readings** (worktree; spec files one at a time on the final tree `02d20a159`; the drives on ONE deploy from
`drive-pages.sh` at `02d20a159` unless named; previous = the brief's §3 on `81a1e7ba2`):

| gate | exit | total | previous |
|---|---|---|---|
| `iwLook` (new) | 0 | **15 / 15** | — (each 🔴 row red under its arm) |
| `cg001GardenKit` · `ig007Garden3d` | 0 · 0 | **57** · **50** | 56 · 49 (+1 each: the vacant bench) |
| `cg003Template` | 0 | 148 | 148 (one row re-cut: the phone's pad) |
| `cg002Engine` · `iw006Save` · `cg005Olive` · `cg006Requests` · `ig004Island` · `iw004Blocks` · `p108s2Join` · `iw003Missions` | 0 each | 259 · 16 · 41 · 83 · 38 · 59 · 4 · 63/63 | same |
| shell `node --test` | 0 | 92 / 92 | 92 |
| `npm run template:garden` | 0 | 0 drift | 0 |
| page drive `drive-pages.sh` (`--mockup`) | 0 (generate 0 · assemble 0 · deploy 0 · drive 0) | **331 / 331**; AC4 at 390: Play's bottom 752, the owl's top 808 (EN and FR) | 331 / 331 (760 / 818 EN, 783 / 841 FR) |
| `drive-iw-look.js` (new) | 0 | **143 / 143** | the base: 80 / 126 (fit · read · seek), 5 / 19 (pad · hint · Sami) |
| modes · IW-001 · IW-004 2D · 3D | 0 each | 90 / 90 · 38 / 38 · 19 / 19 · 3 / 3 | same |
| island `--perf` · 3D | 0 · 0 | 65 / 65 (AC6 p95 16.7 ms at CPU ×4, 1198 frames) · 5 / 5 | 65 / 65 (16.8) · 5 / 5 |
| Olive `drive-olive.sh pages` (the same source, deployed just before the commit) | 0 | 22 / 22 (P-390 red at 865 of 844 with a two-row pad; green with one row) | 22 / 22 |
| robots (no screenshots: the disk was full) | the JSON write failed (ENOSPC) after the clauses | 60 / 60 clauses | 60 / 60 |
| `drive-iw003-mamie.js` workshop (no screenshots) | 0 | 34 / 34 | 34 / 34 |
| robots 3D · Workshop 3D · nogl | 0 each, on `f90473561` (before the two fixes) | 4 / 4 · 24 / 24 · 8 / 8 | same |
| mamie island 2D / 3D / look3d · stones 2D / 3D · post 2D / 3D · biscuit · kit fixtures 2D / 3D | **not run on the final tree** — the box's disk filled (ENOSPC: 143 MB free of 460 GB, not this lane's) | — | 7 · 3 · 6 · 32 · 14 · 17 · 10 · 24 · 44 · 30 |

**Arms** (each source mutated, the row red, restored by copy): the one-target hint off → item 5's row; `seek` never set
→ item 3's two rows; Kit palette dropping `seek` → its row; the read label never the envelope → item 2's two rows; the
envelope card never chosen → its two rows; Pad keys' Olive label off → item 2's two rows; Draw world's Sami rule off →
item 7's two rows; each kit's `METER_FULL` back to `#3FA66B` → item 6's rows (2D, 3D); each kit ignoring `vacant` → the
lane-L row in cg001GardenKit / ig007Garden3d.

**Screenshots looked at** (`iw-look-scratch/pages/look-shots/`): `iwl-fit-1024-en-sami-bench` — the bench's program whole
at 0.72, the drawer a strip at the workspace's foot (forward, turn left, turn right…), "go to the nearest 🪨 rock";
`iwl-fit-1368-fr-eggs-count` — « jusqu’à nombre de 🥚 œuf dans 🧺 panier = 4 » whole at 0.8 over the strip;
`iwl-fit-390-fr-eggs-count` — whole and small (0.46); `iwl-pad-390-fr-sami-thanks` — the whole world, Mamie Rose's door
and its 0/1 under the house, the pad a row under it (↰ ↑ ↱ take drop), Conduire · Apprendre · Jouer on one row;
`iwl-pad-390-en-envelopes` — the three doors whole, the pad in two rows (eight keys); `iwl-read-card-1368-fr-envelopes`
— « lire l’enveloppe », its line, the example ramasser · lire l’enveloppe · aller à · poser; `iwl-read-drawer-*` — the
drawer's violet read block; `iwl-hint-1368-*-eggs` — "3 of 4 done…" / « 1 sur 4, c’est fait… »; `iwl-sami-*` (cropped)
— Sami sitting on his built bench under a dark-green full bar, no one standing by it; with a request open, he stands by
that plot and the bench is empty.

**Against §4.5 (brief s4):** 1 ✅ · 2 ✅ · 3 ✅ · 4 ✅ (with the cost below) · 5 ✅ · 6 ✅ (4.5:1 text rule; 3:1 mark rule for
the bar) · 7 ✅ (it was a defect: driven, two Samis).

**Deviations, with the reason:**

1. **The strip drawer at 1024** (item 1): "the widest program whole" cannot be met beside a side drawer that takes
   196–269 px of the 412 px box — Sami's bench would need 0.32 there. The drawer moves to the foot only for a program
   still cut at 0.5 beside it (measured, per program); every other program keeps the side drawer. The cost: at 1024 a
   child building a long program sees the drawer jump to the foot once, and the strip shows three or four blocks at a
   time (a sideways scroll). Richard may prefer a narrower side drawer at 1024 — a look call, not measured with the
   children.
2. **0.45 on a phone's strip** (Blockly's own minScale, what − reaches): the French eggs' until is 650 units wide; the
   phone's workspace is 330 px. It shows whole at 0.46 — small; a two-line until is the other way (a block shape).
3. **Mamie's dots hidden on a phone** and **the phone's controls 8px 10px / 14 px** (the mockup's ≤ 560 is 9px 14px /
   15 px): the room for the pad under the world without Play or the owl leaving the first screen (AC4).
4. **Play still drops on some phone missions** (item 4, final tree `02d20a159`: a pad of seven keys or more is one row
   that scrolls sideways, like the phone's drawer). Play's bottom is 825 on the eggs and 832 on the envelopes in English
   (on the first screen), 848 on the eggs in French — 4 px below it (the base had 852 with the pad over the world). AC4
   grades the tulips; this is flagged for Richard.
5. **Spec rows re-cut** (each named): `cg003Template` "P106 s4 (b): the pad … absolute only in the phone rule" → the
   phone's column, never absolute; `ig007Garden3d` "the island's compact meter …" → `--c:#058149`; `drive-cg001-kit.js`
   `GREEN` → `rgb(5, 129, 73)`.

**FR lines for Richard's read:** « lire l’enveloppe » · « Olive lit le nom sur l’enveloppe que tient {b}. Ensuite,
« aller à » ce qu’Olive a lu emmène {b} à cette porte. » · (the hint, unchanged words) « 2 sur 4, c’est fait. Qu’est-ce
qui attend encore ? »

**Could not verify:** the tablet (touch on the strip drawer at 1024; a real 1024 × 768 screen's dpr); a real phone's text
at 0.46; the island's one Sami in Garden 3D on a real GPU (the 3D kit's vacant bench is graded in its spec; the island 3D
drive ran under swiftshader); the bench wearing and mended on the island in a long watch (Draw world's rule is per draw;
spec rows only).
