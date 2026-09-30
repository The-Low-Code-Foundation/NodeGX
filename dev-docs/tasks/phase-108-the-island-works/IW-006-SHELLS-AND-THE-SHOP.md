# IW-006 — Shells and the shop

**Opened 2026-09-29** from README §0 and ruling R1 (*"Yep reverse it"*), defaults D1–D4, D8. **Status: ⬜.**
Depends on IW-002. Lane E.

## 1. The person sentence

> **Her tulips are watered and the shells tick up; the bed blooms and Mamie gives a bonus. In the shop she sees the
> animal refuge costs 40 shells and 20 stones; she has 32; the card says what she will have left when she can buy it.**

## 2. What it is

- **Earning (D2, D3):** a run that makes progress on a job's meter pays 1 shell per target step filled, capped per run;
  a finished job pays a bonus (5–10 by mission); a job pays again only after wear has reopened it. A pinned robot
  earns the same way while the game is open. Nothing for time played; no streaks.
- **The wallet (D4):** `earned` only grows; `spent` is a second number; the balance shown is `earned − spent`
  (Rocket School P95 R1). Private to the profile (D8).
- **The shop** on the Island page: tabs **Build** (blueprints — IW-007), **Animals** (after the refuge), **Robots**
  (copies — IW-008), **Upgrades** (today's can+, basket+, boots move here from islander unlocks, plus brain size
  12 → 16 → 20), **Helpers** (Richard's "cheat items": a rain cloud that fills every tulip on one plot once; a
  self-filling can for one job; a wheelbarrow that carries 8 for one job). Every item has a picture, a price, one line.
- **The purchase card:** what you have, the cost, what is left; Buy / Not now. A price you cannot pay shows how many
  more shells.
- **Islander rewards stay:** hats, stickers and robots lent by islanders are gifts, not shop items (the surprise and the
  thanks are what research §5 says protects the fun).
- **Save v5:** `shells {earned, spent}`, `owned[]`, the job meters per plot, the wear clock per plot, robots' brain
  size. Migrates v4 (and v3 via v4); writes at once on load.

## 3. Acceptance criteria

1. Engine/glue gate: earnings per the table for each mission, both bands; a done-and-unworn job earns nothing more;
   the cap per run holds.
2. The wallet never goes down on earning; `spent` rises only through the purchase card; balance correct across reload.
3. The shop: each tab drawn at 1024 × 768, 1368 × 900 and a phone; a purchase driven end to end; a short balance says
   how many more.
4. Every helper does what its line says for exactly one job, then is gone.
5. v4 → v5 migration driven on a real v4 save (the packaged upgrade drive, P105 CG-004's), EN/FR.

## 4. Traps

- Two profiles on one island file (the family model): shells are per profile, the island's plots are shared — a
  sibling's robot earning must pay the robot's owner, not whoever is looking.
- Research §5 principle 2: the meter and the thanks come first on screen; the shell count follows. Do not put a "+5"
  bigger than the tulip blooming.

## 5. Notes

### Session 4 (2026-09-30, lane E `iw006-earn`)

**Built — AC1, AC2, AC5 (earning; the shop is lane H's).**

- **The rule** — one function, `iw6Pay` (`packages/noodl-mcp/tests/iw006Earn.ts`, `EARN_ENGINE`, appended to
  `ISLAND_ENGINE`): a run pays **1 shell per target step it filled** (each job target's NET meter rise — a tulip's
  drinks, a square's stones, the basket's eggs, a door's letters), at most `SHELLS_RUN_CAP` = **10** a run, plus the
  islander's bonus `JOB_BONUS[request]` (5–10, `cg002Content.ts` after the base's block) when the job crosses its finish
  line — **whole for a win in the Workshop, its share for an island lap** that redid part of a job (bonus × steps filled /
  the job's steps, rounded). Nothing for time; no streaks. `earnShells` stays the only place `earned` rises; nothing here
  touches `spent`.
- **The Workshop** — `Logic/Win pay` (new, `Pages/Workshop`: the win → Win pay → Complete request) reads HER island
  before the win is recorded: never won → the plot's whole lack at the island's own laying; won and worn (its saved live
  job short of the finish) → what it lacks; won and not worn — or drawn won with no live job (its robot brought home) →
  **nothing** (AC1). It hands Complete request the pay and `jobLive`, the plot as a done job (the reference program's end
  on the island's laying, every target full, a can in hand put back where the job lays it): **the plot starts done** and
  its robot waits at home until wear reopens it. The win card: **"+N 🐚 shells for the job"** under the thanks and the
  gifts, 14 px against the thanks' 26 px (principle 2), a moment after the card (Win pay runs as the card opens).
- **The island** (D3) — `islStepJob` counts the robot's own fill (the meters before and after ITS delta — never the
  wear's) into the lap's gain; the program run to its end is a lap and pays it; a lap's end and wear reopening a done job
  are the **moments**. `Logic/Island keep` (new, `Island/World`, after every tick) writes each moment's plot `live` job
  and the lap's shells into the ACTIVE profile (ruling 8 — the island ticking is hers; a plot no longer pinned to that
  robot is skipped) and the store writes; otherwise it writes nothing. A chip **"Pip +3 🐚"** shows for 4 s at the island's
  top, after the meter it filled (at its foot it covered Biscuit's bubble — seen in the drive's screenshot, moved); under
  the island on a phone.
- **The live job in the save** — the build name is taken over the saved plots **without** `live` (`iw6Unlive`); a build
  with nothing kept (an app restart) resumes each pinned job plot from its saved `live` (`iw6Resume`: things, wear clock,
  seed, spent, a helper riding on it; the robot at home; `wait` when the job is done). IW-002 AC3 now holds across a
  restart (E5 below).
- The trap in §4 (a sibling's robot paying whoever looks) is met by one island per kid: Island keep pays the active
  profile only for plots pinned in HER save to a robot of hers; a sibling's robots are never on her island.

**The earnings table** (the gate `iw006Earn.test.ts` measures each row's steps with the engine; the band does not change
the pay — only which missions a kid can open):

| Mission | Band | Steps (the island's laying) | Paid for steps (cap 10) | Bonus | A first win |
|---|---|---|---|---|---|
| path-postbox | 7–9 | 1 | 1 | 5 | **6** |
| tulip-door | 7–9 | 3 | 3 | 5 | **8** |
| tulips-three | 7–9 | 9 | 9 | 6 | **15** |
| path-stones | 7–9 | 16 | **10** (capped) | 7 | **17** |
| bowl-if | 10–12 | 2 (one bowl starts full) | 2 | 8 | **10** |
| letter-say | 10–12 | 1 | 1 | 6 | **7** |
| wall-until | 10–12 | 1 | 1 | 8 | **9** |
| meow-when | 10–12 | 2 | 2 | 8 | **10** |
| eggs-count | 10–12 | 4 | 4 | 9 | **13** |
| rows-trick | 10–12 | 6 | 6 | 10 | **16** |
| sami-bench | 10–12 | 8 | 8 | 9 | **17** |
| mamie-note | 10–12 | 3 | 3 | 10 | **13** |
| rock-flower | 10–12 | 2 | 2 | 9 | **11** |
| sami-thanks | 10–12 | 1 | 1 | 7 | **8** |
| envelopes | 10–12 | 3 | 3 | 10 | **13** |

Every first win: **173** 🐚; band 7–9's four: **46**. An island lap after wear: tulip-door 1 + ⌊5/3⌉ = **3**, tulips-three
1 + ⌊6/9⌉ = **2**, rock-flower 1 + ⌊9/2⌉ = **6**, path-postbox (the door takes its one letter in) 1 + 5 = **6**. Measured: four
robots on tulips-three, path-stones, eggs-count and rock-flower, **ten minutes** of the Island page (789 ticks): **+125 🐚**
in 53 writes (37 paid laps) — with the whole bonus at every finish it would be **+324** (the reason for the share). For
lane H's prices: a robot copy (30) is about two first wins, or ~2½ minutes of four robots at work.

**Readings (worktree `iw006-earn`, each exit 0 unless said):**
- Specs (`cd packages/noodl-mcp && npx jest tests/<f>.test.ts`, one file at a time, on the lane's last commit): **iw006Earn
  34/34 (new)**, iw006Save 16, cg002Engine 259, cg003Template 148, ig004Island 38, cg005Olive 41, cg006Requests 83,
  cg001GardenKit 56, ig007Garden3d 49, iw004Blocks 59, p108s2Join 4, iw003Missions 63 — every one the base's total; the
  shell `node --test tests/*.test.js` 92/92. `npm run template:garden` exit 0; the regenerated tree committed.
- Arms in `iw006Earn.test.ts` (each rule mutated, its row red, the text restored): no cap → path-stones 16; Win pay paying
  a plot drawn won; the build name over `live`; the lap's gain never reset; Island keep writing without a moment (30 writes
  in 30 ticks); the resume dropped (the worn tulip back to 0/3, clock 0).
- **`drive-iw006-earn.js` 15/15** (new; `iw006-earn-scratch/pages/iw006e.{log,json}`, shots `pages/shots-iw006e/`, each
  looked at): the win card's "+6 🐚 shells for the job" (EN 1024) and "+8 🐚 coquillages pour le travail" (FR 1368) under the
  thanks and the gifts, small; the replay card without it; the chip "Pip +3 🐚" at the island's top at 1024 (between the
  tap line and Find my robots) and under the island at 390; the restart (Pip at home, the tulip full); both migrated
  families' Profiles and each kid's island in her language.
- The page drive (`drive-pages.sh`, `--mockup`): **331/331** on the lane's first commit and **331/331** again on its last (`iw006-earn-scratch/pages-final/`, generate 0, no
  drift).
- Every other drive on the same deploy (`iw006-earn-scratch/pages/drives/<name>.{log,json}`): island `--perf` **69/69**
  (65 + 4: IG-004 AC3's clause now reads the won plot starting done, then steps once wear is in the save — p95 16.7 ms at
  CPU ×4) + 3D 5/5 · robots 60/60 + 3D 4/4 · IW-001 38/38 · IW-004 19/19 + 3D 3/3 · modes 90/90 · Workshop 3D 24/24 (the
  known software-GL flake once: "null querySelector"; 24/24 run again) + nogl 8/8 · Olive 22/22 · Mamie workshop 34/34,
  island 7/7, island 3D 3/3, look3d 6/6 · stones 32/32 + 3D 14/14 · post 17/17 + 3D 10/10 · Biscuit **24/24** (its island
  clause red once — 23/24 — as the won plot now starts waiting; the clause reads wait → work → wait). The kit fixtures (2D
  44, 3D 30) were not run: neither kit changed.

**Deviations (with the reason and the measurement):**
1. **The island pays the bonus's share, not the whole bonus, at each finish** (the brief: "the bonus when the job crosses
   its finish line"). Wear reopens a job one drink / stone / letter at a time, so every refill crosses the finish line
   again: the whole bonus each time is +324 🐚 in ten minutes against +125 with the share (above) — the bonus would
   become pay for time the page is open. A lap that redoes a whole job (path-postbox's one letter) gets it whole.
2. **A win in the Workshop always pays the whole bonus** (even a worn re-win one step short): the bonus is the thanks for
   the job she was asked to do. A re-win of a pinned plot needs wear first, which only the Island page makes (R2) and
   whose robot refills it at once — measured rare, not a loop.
3. **The Workshop's pay is the island plot's lack, not the Workshop run's own rise** (the Workshop world starts fresh
   every run: the two agree on a first win; on a worn plot only the lack is honest).
4. **Moments are a lap's end and wear reopening a job — no "the page is left" write.** A lap's gain is paid at its end;
   a write when the page closes would keep the half-filled meters without paying them (those steps then lost). Without
   it, a lap cut short by closing the app is redone after the restart and paid then; a waiting plot's wear clock goes on
   from its last moment (R2: things pause).
5. **A can in the robot's hand goes back where the job lays it in the saved live job** (`iw6CanBack`): the save's `live`
   has no robot in it (§4.1's shape, unchanged), and a robot built at home after a restart must find the can its program
   picks up (without it, tulip-door's Pip could never water again — found by the gate).
6. **A pinned plot from a v4 save (no live job) keeps v4's behaviour**: the island starts it at the job's start, so its
   first island lap pays the job once (tulips-three: 15). Every plot won from v5 on starts done.

**Not done / not mine:** the balance on the Island page's head is H's (Read family does not output `shells` yet — H adds
it); the helpers (H) — Island keep carries a plot's `helper` (`'helper' in` the tick's plot state, else the saved one), and
only the robot's own delta counts as pay, so a rain cloud's fill pays nothing; the crew (C) — the gain is per plot, one
robot per plot.

**FR lines for Richard's read:** `iw6eWinPay` « +{n} 🐚 coquillages pour le travail » · `iw6eIslePay` « {r} +{n} 🐚 ».

**Could not verify:** the packaged upgrade drive over a real v4 app (session 5's; AC5 here is driven on the deployed page
with the fixture's v4 families in its storage); the tablet; the island chip in Garden 3D is the page's HTML over the
renderer (not looked at in 3D); the shop spending what is earned (H).
