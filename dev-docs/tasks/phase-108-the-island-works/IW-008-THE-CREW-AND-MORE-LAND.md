# IW-008 — The crew and more land

**Opened 2026-09-29** from README §0 ("an army of robots … copies of pip or rubble, with their own name, with a job …
multiple plots needed"). **Status: 🟡 s4 (lane C, merged 2026-10-01) — the crew: AC1–AC5 ✅ on the Mac (crew cap 12, p95 16.7 ms at CPU ×4);
the tablet with Olive in flight is Richard's; "more land" not built — a question for Richard (R6 stands).** Depends on IW-005, IW-006. Lane D.

## 1. The person sentence

> **She has three Pips — Pip, Bubbles and Sprout — each named by her, each on its own plot doing its own job. She copies
> Pip's watering program onto Sprout and drags Sprout to the carrot patch. From above she sees nine robots at work.**

## 2. What it is

- **Copies:** a robot bought in the shop is a new row of a kind (pip, cobble, pocket, echo) with its own name, colour,
  hat, brain size and program; P106 IG-005's robot rows already carry these fields (save stays compatible).
- **Jobs:** a robot is assigned to a plot (drag its card onto the plot on the Island page, or from My robots). One
  robot per plot job; a plot may have a second robot for a second job (feeding + watering).
- **Copy a program:** My robots → "copy [Pip]'s program to…" → another robot of a kind whose palette covers it (a
  program using `pick` cannot go to Pip — say why).
- **More land:** the island gains free plots, bought as land in the shop (or earned by finishing a family of
  missions). P106 R9 built 46 × 22 on 5 × 3 slots; more land adds slot rows — **gated on the frame time**.
- **A cap:** a crew cap (e.g. 12 robots) set by the tablet's frame reading, not by design.

## 3. Acceptance criteria

1. Buy, name and assign three copies; each works its own plot; the save round-trips.
2. Copy a program between two robots of one kind; a refused copy says which block the target cannot do.
3. Reservation (IW-005) across the crew: no two robots on one egg.
4. The frame gate on the Mac at CPU ×4 with the crew at its cap: p95 under the P106 IG-004 AC6 target; the tablet
   reading with Olive in flight is Richard's.
5. Island drives 2D + 3D with the crew at its cap; My robots at three widths.

## 4. Traps

- Path searches for many robots per tick (IW-005 §4).
- The 3D kit redraws a robot on map/things change (P106 s2 trap: the can level went stale) — with many robots, redraw
  by robot, not the scene.

## 5. Notes

### Session 4 (2026-09-30 → 10-01, lane C `iw008-crew`, base `81a1e7ba2`) — the crew (AC1–AC5); "more land" not built

**Built** (new file `packages/noodl-mcp/tests/iw008Crew.ts`, hunks elsewhere each under `// P108 IW-008 (lane C): …`):

- **The save** (v5 stays v5; two OPTIONAL robot-row fields, mirrored in the shell's `copies.js`): `program` — what a robot
  carries while it is not pinned (copied onto it, or kept when it comes home: Bring home now keeps it); `helps` — the plot
  it works as the SECOND robot beside the one pinned there. `crewHelps` (in `islandOf`) keeps a helper only beside a robot
  pinned there, with a program, one per plot, never while it is pinned itself. Packed as a robot row's 8th and 9th fields
  (null before a later one); a family with neither packs byte for byte as the base did (spec + the shell's byte test).
  `robotRow` now carries `helps`, `program` (its plot's when pinned) and `blocks`.
- **Which robot does a job** (`CREW_PICK`): the one at work on that plot, else one of that kind at home (pinned nowhere,
  helping nowhere), else the first of that kind (busy — the card says where). Used by the Workshop's Job robot (it now
  reads the plots), Island rows (a busy Pip no longer blocks a job a free copy can take) and the plot card.
- **Send a robot to a plot, by touch** (`Logic/Assign robot`, `Logic/Crew chips`, Island/World's crew row): on the card of
  a plot she has WON, when she has two robots of its kind or more, a pill per robot of that kind (ink when it works or helps
  there) — tap one to send it, tap it again to bring it home. Nobody there: it works the plot — the plot's own program (the
  one that won it) when the plot kept one, else the program it carries; someone there: it HELPS, with its own program (else
  a copy of the plot's); a third is refused ("Two robots already work here."). A robot moved on leaves its old plot's
  program for the next robot (as a win elsewhere always did). Refusals in words: no program to run, a block its kind cannot
  place, a brain too small.
- **Copy a program** (`Logic/Copy program`, My robots' "copy {r}'s program to" pills): onto a robot at home or helping, its
  row; onto a robot at work, its plot runs the copy at once. Refused — nothing changes — with the FIRST block (reading order,
  loops and else included) the target's kind cannot place, in her words and band ("Cobble can’t do “fill the can”, so
  Cobble can’t take Bubbles’s program."), or both numbers when the brain is too small ("Pip’s program has 33 blocks, but
  Pebble’s brain holds 12."), or "{f} has no program to copy yet." What a kind can place is `CREW_CAN`: the moves every robot
  has, the controls, the kind's own blocks (after D9 every robot picks and puts, so the task's "a program using `pick` cannot
  go to Pip" is now "a program that waters cannot go to Cobble").
- **My robots with a crew** (`ROBOT_CARDS_SCRIPT`, `Robot/Card`): a card per robot she has (a copy beside its kind's first;
  the first keeps the kind as its id, a copy its robot id), a locked card per kind not lent yet; each card's brain and what
  it knows ("12 blocks · knows a program of 9"), where it works or helps, the copy pills, the copy's line on the card it was
  said on. H makes the brain reach the Workshop; this card only draws it.
- **The island with many robots** (`ig004Island.ts`): `HOME_SPOTS` for `CREW_CAP` (the four IG-005 spots, then eight round
  the home slot — the path above it, the path on its left, the shore — two tiles apart at least); a job plot's second robot:
  its own run, laps and phase (the first's machine), stepped after the first on the world the first left, walking home to
  its own tile (the free tile behind its start, else its left, right, ahead); drawn in its own look. The tick steps every
  pinned run and every helper each tick.
- **The 3D kit redraws by robot, not the scene** (§4 trap): a write that changes only the things redraws the things
  (`buildThings`, moved out of `buildScene` unchanged); a robot whose own look changed (a fill, a pick) is redrawn alone,
  where it is drawn, its glide going on; the scene is built whole only for a new map or a robot more or fewer. Counters on
  the root: `data-scene-builds`, `data-thing-builds`, `data-robot-builds` (the 3D drive read 1 · 3 · 7 before Too Slow).
- **Found by the drive, fixed:** My robots showed every copy's card twice (14 cards for 9) — README §3's For Each defect (a
  list answered again while it rebuilt); a kind's card was never doubled. The cards and the crew pills now reach their For
  Each through IW-001 F7's settle latch (Timer `PAD_SETTLE_MS` + `Logic/Latch`).

**Readings** (worktree; each spec file alone; previous = brief §3 / §8 at `81a1e7ba2`):

| gate | exit | total | previous |
|---|---|---|---|
| `iw008Crew.test.ts` (NEW) | 0 | **25 / 25** (18 rows + 7 arms) | — |
| `iw006Save.test.ts` | 0 | **17 / 17** (+1: the crew's two fields) | 16 |
| `cg002Engine` · `cg003Template` · `ig004Island` · `ig007Garden3d` | 0 each | 259 · 148 · 38 · 49 | same |
| `cg005Olive` · `cg006Requests` · `cg001GardenKit` · `iw004Blocks` · `p108s2Join` · `iw003Missions` | 0 each | 41 · 83 · 56 · 59 · 4 · 63 | same |
| shell `node --test tests/*.test.js` | 0 | **92 / 92** (the crew case inside the v5 byte test) | 92 |
| `npm run template:garden` | 0 | drift committed with the source; re-run in the page drive: 0 drift | 0 |
| page drive `drive-pages.sh` (`--mockup`), on `9f664e89a` | 0 (generate 0 · assemble 0 · deploy 0 · drive 0; 0 drift) | **331 / 331** | 331/331 |
| `drive-iw008-crew.js` 2D (NEW) | 0 | **39 / 39** | — |
| `drive-iw008-crew.js --perf` (AC4) | 0 | **5 / 5**; p95 **16.7 ms** at CPU ×4 (×4.1 measured), 12 robots, 1200 frames, max 33.2 ms, 0 over 50 | — |
| `drive-iw008-crew.js --mode 3d` | 0 | **4 / 4** (readout: 12 names in the 3D overlay, then Too Slow under swiftshader) | — |
| island 2D `--perf` · 3D | 0 · 0 | **65/65** (AC6 p95 16.7 ms) · **5/5** | 65/65 · 5/5 |
| robots 2D · 3D | 0 · 0 | **60/60** · **4/4** | 60/60 · 4/4 |
| IW-001 · modes · IW-004 2D · 3D | 0 each | 38/38 · 90/90 · 19/19 · 3/3 | same |
| Workshop 3D · nogl · kit fixtures 3D | 0 each | 24/24 · 8/8 · 30/30 | same |
| lane drives: mamie island · workshop · stones · post · biscuit | 0 each | 7/7 · 34/34 · 32/32 · 17/17 · 24/24 | same |
| Olive pages (`drive-olive.sh pages`) | 0 | 22/22 | 22/22 |

The spec's readings: 300 ticks × 12 robots at work (11 plots, one with two) — tick p95 **1.6 ms** (gate < 5 ms, the bare
`vm`); AC3 400 ticks, Pocket + Pocket 2 on the eggs — picks 7 + 6, 0 clashes (the arm with reservations ignored: clashes).
The page's AC3: 40 s, 158 reads of `gardenIsland`, 9 reads with both walking to an egg, 0 to the same one, both reserving.

**Screenshots looked at** (`iw008-crew-scratch/`): `crew-2d/iw008-1368-en-01-crew-row.png` — tulip-door's card, "YOUR CREW
FOR THIS JOB", five pills, the tap line; `…-03-two-pockets.png` — two Pockets on Mamie's pen, both pills ink, "Pocket works
here · Pocket 2 helps", the said line; `…-05-refused.png` / `myrobots-390-fr-card.png` — the brain line ("12 blocs ·
connaît un programme de 8"), "COPIER LE PROGRAMME DE NIMBUS VERS" and its pills wrap at 390; `crew-perf/iw008-cap-island-1368.png`
— twelve robots, each named on its plot; `crew-3d/iw008-3d-island-cap-1368-first.png` — the 3D island, twelve name pills.

**Acceptance, against §3:**

- **AC1 ✅** (the shop's Buy is lane H's): copies bought by the base's `buyItem` (named), sent BY TOUCH on the plot card to
  three plots, each seen working its own plot and stepping, 1368 EN and 390 FR; the save code round-trips (the Grown-ups
  box on the page, and the spec).
- **AC2 ✅**: copy between two robots of one kind; refused onto another kind NAMING the first block it cannot do; refused
  by the brain with both numbers; EN, FR, band 7–9's words.
- **AC3 ✅**: a second robot on a plot (built — IW-008 §2) and IW-005's reservation across the crew: never one egg (spec
  400 ticks with its arm; the page 40 s).
- **AC4 ✅ on the Mac** (2D, CPU ×4, the crew at CREW_CAP = 12: p95 16.7 ms ≤ 50). **CREW_CAP stays 12** (not lowered: the
  reading gives no reason). The tablet with Olive in flight is Richard's.
- **AC5 ✅**: the island drives in 2D and 3D with the crew at its cap; My robots at 1368, 1024 and 390 (a card per robot,
  once each, inside the page, no sideways scroll, a brain line on each).
- **More land: not built** (the brief: a question for Richard; R6's 55 × 22 stands).

**Deviations and choices, with reasons:**

1. **Two optional robot-row fields, not one** (brief §4.2 allowed `program`): `helps` too — a second robot on a plot must
   survive a save for AC3 to be reachable. Both mirrored in `copies.js`, a row in `iw006Save.test.ts`, a case in the shell's
   byte test.
2. **Assign = tap the plot, then the robot's pill** (the brief: drag or tap robot-then-plot, C decides): the plot card is
   where a child already goes to act on a plot, pills are buttons (no Select in a Modal), and a tap is what a tablet does
   best. Not built: sending from My robots.
3. **Only a plot she has WON can be worked by a crew robot** ('open' refused): a job is learnt in the Workshop, and
   IW-006's earning (D2, D3) assumes a won plot.
4. **A plot's kept program wins over the one the robot carries** (the robot's is used only where the plot kept none — the
   person sentence's "carrot patch"): the program that won a plot is the one most sure to work there.
5. **Copying onto a robot at work gives its plot the copy at once** (Autonauts'): "Sprout knows it now" means Sprout runs it.
6. **Bringing the first robot home sends its helper home too** (a helper is kept only beside a robot pinned there).
7. **ig007Garden3d's row** "a Robots write that changes only the can…" asserted the scene rebuilt (`eng.built` new); it now
   asserts THAT robot's group is new and the scene kept. **cg003Template's My robots row** reads the fleet through the latch.
8. My robots' cards and the crew pills go through the settle latch (the For Each defect above): a card appears 120 ms after
   its list settles.

**FR lines for Richard's read** (`PAGE_WORDS`, `iw8c…`): « Ton équipe pour ce travail » · « Touche un robot pour l’envoyer
ici. Touche-le encore pour le ramener à la maison. » · « {r} travaille ici » · « {r} aide » · « {r} travaille ici
maintenant. » · « {r} aide {m} ici maintenant. » · « {r} est rentré à la maison. » · « {r} n’a pas encore de programme pour
ce travail. Gagne-le avec {r}, ou copie un programme dans Mes robots. » · « Deux robots travaillent déjà ici. » · « {r} ne
sait pas faire ce travail. » · « {r} ne sait pas faire « {blk} », et le programme de ce travail en a besoin. » · « Le
programme de ce travail a {k} blocs, mais le cerveau de {r} n’en tient que {n}. » · « Copier le programme de {r} vers » ·
« {r} connaît maintenant le programme de {f}. » · « {r} ne sait pas faire « {blk} » : {r} ne peut pas prendre le programme de
{f}. » · « Le programme de {f} a {k} blocs, mais le cerveau de {r} n’en tient que {n}. » · « {f} n’a pas encore de programme
à copier. » · « Cerveau » · « {n} blocs · {knows} » · « connaît un programme de {k} » · « pas encore de programme » · « Aide
sur « {plot} » ». (« rentré » is masculine whatever the robot: the robots are "il" everywhere in the game.)

**Could not verify:** the tablet (AC4's frame time with Olive in flight; Garden 3D at the cap on a real GPU — swiftshader
hands the island to the flat one within a few ticks); buying a copy through lane H's shop (seeded by `buyItem`); earning
from a helper's laps (lane E's island earnings count the plot's first robot as far as this lane knows — to settle at the
merge); a crew robot sent from My robots (not built).

