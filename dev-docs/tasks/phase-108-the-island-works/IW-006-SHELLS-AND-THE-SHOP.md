# IW-006 — Shells and the shop

**Opened 2026-09-29** from README §0 and ruling R1 (*"Yep reverse it"*), defaults D1–D4, D8. **Status: 🟡 s4 (lanes E and H, merged 2026-10-01) — AC1 ✅ AC2 ✅ (earning, the wallet; lane E), AC3 ✅ AC4 ✅ (the shop,
the helpers; lane H), AC5 🟡: v4 → v5 driven on a deployed page in EN/FR, the packaged upgrade drive over a real v4 app is
session 5's. §5 "Session 4 merge" lists what is owed.**
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

### Session 4 (2026-09-30, lane H `iw006-shop`, base `81a1e7ba2`) — the shop (AC3), the helpers (AC4), upgrades sold, the brain

**Built.**
- **The shop on the Island page** (`Island/Shop`, `Island/Shop item`; glue in `tests/iw006Shop.ts`): a "🐚 32 · Shop" /
  "🐚 32 · Boutique" button beside the page's head (the balance on it, `earned − spent`); pressed, the shop opens over
  the island (the win card's veil): its title, "🐚 N shells", ✕; five tabs as chips (Build · Animals · Robots · Upgrades ·
  Helpers — Build and Animals sell nothing yet and say so in one line); each item a card with its picture (the
  catalogue's icon), its price on the sun, its name and one line (the catalogue's, EN/FR); a tap opens **the purchase
  card**: You have · It costs · Left after — or "You need N more shells." and no Buy; Buy / Not now. A copy's card has a
  name box ("Pip 3" by default, the kind and its number); a brain's card has chips of her robots at the size before (one
  alone is picked for her); an upgrade she has says "It's yours already."; right after Buy the card says only "It's
  yours!". Every pick is a button (no Select in the sheet, P92). `Logic/Buy` is `buyItem` on the active profile — the one
  place spent rises (a gate row: no other script the pages run calls buyItem or raises spent).
- **What the shop shows:** Robots — a copy of each kind her island has (buyItem refuses the rest). Upgrades — the two
  brains always; can+ / basket+ / boots once the request an islander gave it after is done AND a robot of hers fits it;
  one given before (a sticker) shows as Yours. Helpers — all three; one held says "Ready to use".
- **Upgrades moved to the shop** (the brief's default): `COMPLETE_REQUEST_SCRIPT` no longer gives can+ / basket+ / boots
  (Upgraded stays empty); a sticker given before still counts (`robotRow`). The rows that read the gift now buy it with
  `buyItem`: cg002Engine IG-005 "AC3: can+ on Pip makes fill give 6", cg003Template IG-005 "Job robot: the stones need
  Cobble" (the boots) and "Start world puts the job robot on the world" (can+ and basket+), cg006Requests AC4 "a finished
  request puts its reward on the profile" (the upgrades are no longer on the sticker page).
- **The helpers (AC4)** — ENGINE (after `varStep`): `helperRain` (every tulip of the world full), `helperOn` (selfcan: every
  can held or lying on the plot full; barrow: the robot carries `BARROW_CARRY` = 8), `helperFits` (never on a job that is
  done; rain: a tulip not full; selfcan: a can world or a robot with a can; barrow: a target that takes carried things).
  The island tick (`ig004Island.ts`): a job plot steps through `islHelped`, which puts a riding helper on before the step
  and again after it, and at the finish line (the robot turns to wait) drops it (`helperDone` for that one tick; the
  robot's own basket back). A held helper is used **from its shop card**: the card lists the jobs it helps now (a pinned
  robot at work, the job not done, nothing riding on it, the helper fitting it) as chips, then Use it (`Logic/Use
  helper`): it leaves `owned`; rain fills that plot's tulips at once and is gone; the can and the barrow ride on the job —
  on the island's running state (`gardenIsland`, set before the family is written) and in the save (the plot's `live`,
  `helper` in it). An island built from a save with a riding helper has it riding again.
- **The brain:** `Logic/Brain size` in `Workshop/Play` reads the job robot's row (`plIn.robot`, Job robot's) and feeds the
  Blocks node's Brain Size: 12 until a bigger brain is bought for that robot, then 16, 20.

**Readings** (each exit 0; spec files alone; drives on one deploy of `78d3069a7` made by `drive-pages.sh`, the shop drive
again on the final commit — see the final message): `iw006Shop` **34/34** (NEW; arms: short price, upgrades all at once,
a helper left in owned, a riding helper past its finish line, a can that does not fill, the build counting live, the gift
given again, the card just bought keeping its figures, helperFits); `iw006Save` 16 · `cg003Template` 148 · `cg002Engine`
259 · `ig004Island` 38 · `cg005Olive` 41 · `cg006Requests` 83 · `cg001GardenKit` 56 · `ig007Garden3d` 49 · `iw004Blocks` 59 ·
`p108s2Join` 4 · `iw003Missions` 63/63; shell 92/92; `template:garden` exit 0, 0 drift. Page drive **331/331**; **shop
drive 60/60** (BUTTON and each TAB at 1024 × 768, 1368 × 900, 390 × 844, EN and FR; SHORT and BUY at the three widths EN
and 1368 FR, the balance kept across a reload; BRAIN: 13 blocks placed, the 17th refused "Pip’s brain holds 16 blocks";
SELFCAN / RAIN / BARROW on the island's own state; 0 console and network errors); IW-001 38/38 · IW-004 19/19 + 3D 3/3 ·
modes 90/90 · island `--perf` 65/65 (p95 16.8 ms at CPU ×4) + 3D 5/5 · robots 60/60 + 3D 4/4 · Workshop 3D 24/24 + nogl
8/8 · Olive 22/22 · Mamie 34/34 · stones 32/32 · post 17/17 · Biscuit 24/24. Kit fixtures not run: no kit source changed.

**Looked at:** `iw6h-1368-en-tab-upgrades.png` (four cards: bigger can, bigger hod, the two brains, each price on the
sun); `iw6h-1368-en-card.png` (the card: 32 · 30 · left 2, the name box "Bubbles", Buy it / Not now); `iw6h-1368-fr-short.png`
("Il te faut encore 8 coquillages." in its box, no Acheter); `iw6h-390-en-card.png` (the phone: two cards a row, the
purchase card whole); `iw6h-390-fr-tab-build.png` (the build line, the five chips wrapping); `iw6h-brain-workshop-16.png`
(16 blocks, "Pip’s brain holds 16 blocks." over the program); `iw6h-1368-en-00-island.png` (the button level with the title).

**Deviations, with reasons.**
1. **A helper is used from its shop card, not the plot card** (the brief's default). The plot card is lane C's
   (`ISLAND_CHOOSE_SCRIPT`, `Island/World` — assign and copy land there this session): the shop needs no hunk in it, and
   the child uses a helper the moment she buys it. The card names each job by its request's title and robot.
2. **The build hash leaves a plot's `live` out** — lane E's line (`islandWorldScript`: `var build = islHash(…)`). The
   helpers need it: a helper used writes the plot's live, and at the base that rebuilt the island (the rain's full tulips
   dropped). The same rule the brief states (🔴); **at the merge E's line stands** and mine goes.
3. **Upgrades show only when a robot of hers fits them** (besides the request done): boots with no Pocket buys nothing.
4. **Robot copies show only for kinds she has** — a locked copy would be a card with no Buy and nothing to say that
   My robots does not already say.
5. **Prices unchanged** (the base's first guess): lane E measures what a mission pays; retune at the merge from E's table.

**Not done / owed at the merge.**
- **Lane E:** E's live writes (a lap ends, the finish line, the page left) must carry the running state's
  `live[id].helper` into `plots[id].live.helper` — the finish line has already dropped it from the state, so E's write
  there is what clears it from the save. Until then (this lane alone) a save keeps `live.helper` after its job finished,
  and an island built from it lets the helper ride once more.
- **Lane C:** My robots' upgrade slot still says "Empty slot · Bigger can · from Mamie Rose" (`ROBOT_CARDS_SCRIPT`,
  `ig5UpEmpty`): the islanders no longer give it — it is in the shop now.
- The win card's gift line never names an upgrade now (Upgraded is empty); a "now in the shop" line under the thanks
  would be E's Win card (principle 2: smaller than the thanks).

**FR lines for Richard's read:** « 🐚 {n} · Boutique », « La boutique », « 🐚 {n} coquillages », Construire · Animaux ·
Robots · Améliorations · Coups de pouce, « Les plans arrivent plus tard : un spa pour robots, un refuge pour animaux, un
pont. », « Les animaux arrivent quand le refuge est construit. », « Tu as 🐚 {n} », « Ça coûte 🐚 {n} », « Il te restera
🐚 {n} », « Il te faut encore {n} coquillages. » / « … 1 coquillage. », « Acheter », « Pas maintenant », « C’est à toi ! »,
« C’est déjà à toi. », « À toi », « Prêt à servir », « Son nom », « Quel robot ? », « {r} · {n} blocs », « Aucun robot
n’est prêt : il lui faut d’abord le cerveau d’avant. », « Ton île a {n} robots : elle est pleine. », « Utilise-le pour un
travail : », « L’utiliser », « Aucun robot ne fait un travail qu’il aide en ce moment. Garde-le pour plus tard ! »,
« {what} : au travail sur « {plot} » ! ».

**Could not verify:** the helper cleared from the save at its finish line (E's write, above); the shop by touch on the
tablet; the self-filling can on a program that loops `until the can is empty` (the can never empties, so such a loop runs
to the until guard — no reference program does it; for Richard: is "never needs the pond" meant to change a program's
path, or only its can?).

### Session 4 merge (orchestrator, 2026-09-30 → 10-01, `p108-s4-merge` then `p108-s4m`) — all four lanes

**Order:** a base first (`81a1e7ba2`: save v5 — shells, owned, a plot's live job, brains, robot copies — the shop's
catalogue and the one purchase rule), then lanes C (IW-008 the crew) ∥ H (the shop) ∥ E (earning) ∥ L (IW-003's seven
look items), merged C → H → E (`a0a532c88`), then L (`1ed916d65`), then `cline-dev` (P107 nsp-007, dbt-template l183; no
shared file).

**What the merge decided:** the appended blocks of C, H, E and L kept side by side (DRIVE, PAGE_WORDS, GLUE_SCRIPTS, the
imports); the island's build hash is lane E's line (`iw6Unlive`: a plot's `live` is left out of it — the brief's rule;
lane H's `buildPlots` loop dropped, its arm re-anchored); a job plot starts from lane E's saved live job, then lane C's
second robot; lane H's `islHelped` writes `helper: ''` at the finish line, so lane E's Island keep drops the helper from
the save. `p108s4Join.test.ts` (new) grades the two seams no lane could see: the helper leaves the save at its finish line
(with its arm), and a copy bought in the shop is sent to a plot by the crew's rule and works it. `templates/bot-garden`
regenerated after each merge.

**Interrupted:** the disk filled (143 MB free) after E's merge, while lane L's last drives ran; the worktree folder was
deleted to free it (2026-10-01). Every lane's commits survived on their branches. Lane L's IW-003 notes never reached a
commit; they were rebuilt from the lane's own edits (IW-003 §7, "Session 4"). The merge resumed in a new worktree
`p108-s4m` from `a0a532c88`.

**Readings on the merged tree** (`p108-s4m` at `b4aeeeef1` + the drive fix below, 2026-10-01; every exit 0):

| gate | total |
|---|---|
| specs, one file at a time (`packages/noodl-mcp`, `npx jest tests/<f>.test.ts`) | cg002Engine 259 · cg003Template 148 · cg005Olive 41 · cg006Requests 83 · ig004Island 38 · cg001GardenKit 57 · ig007Garden3d 50 · iw004Blocks 59 · p108s2Join 4 · iw003Missions 63 · iw006Save 17 · **iw006Earn 34 · iw006Shop 34 · iw008Crew 25 · iwLook 15 · p108s4Join 3** = **930** |
| shell `node --test` | 92 / 92 |
| `npm run template:garden` | exit 0, 0 drift |
| page drive (`--mockup`) | **331 / 331** |
| the s4 drives | look 143/143 · earn 15/15 · shop 60/60 · crew 39/39 · crew `--perf` at the cap 5/5 |
| the earlier drives | modes 90 · IW-001 38 · IW-004 19 + 3D 3 · island `--perf` 69 + 3D 5 · robots 60 + 3D 4 · Workshop 3D 24 + nogl 8 · Olive 22 · Mamie workshop 34, island 7, island 3D 3, look3d 6 · stones 32 + 3D 14 · post 17 + 3D 10 · Biscuit 24 · kit fixtures 2D 44, 3D 30 |

All of them on one deploy, by `drives/drive-all.sh` (new: the runner every session kept in a scratch folder, now in the
repo). Screenshots looked at: the shop's card at 1368 and the crew on the island (C/H/E merge); the bench's program whole at
1024 FR with the drawer at the foot, the phone's pad under the world at 390 FR (L merge).

**One red at the join, and it was the drive:** stones 3D read 13/14 twice on the merged tree — sami-bench's "Cobble says
'Home! All done.'" never seen — and 14/14 on `a0a532c88` (C+H+E) and on lane L's tip alone. Garden 3D's bubble lasts
1.1 s; the 3D sampler reads every 1.8 s or more, so whether a sample lands on it is a matter of phase, and lane L's
per-draw work moved the phase. The drive now records every bubble as it appears (a MutationObserver installed before
Play) beside the samples: on the merged tree the bubbles were *Got it! · There. · Got it! · There. · Home! All done.*,
the samples alone still missed it (`homeSampled: false` in the readings) — 14/14; stones 2D 32/32 with the same drive.

**Owed (not done this session):**
- **My robots' upgrade slot still says "Empty slot · Bigger can · from Mamie Rose"** (`ROBOT_CARDS_SCRIPT`, `ig5UpEmpty`):
  the islanders no longer give upgrades — they are sold in the shop (lane H, "Not done / owed", for lane C; the merge did
  not settle it). A child is told to wait for a gift that never comes.
- **Prices are the base's first guesses** (a copy 30, upgrades 15–20, brains 25 / 40, helpers 6–10): lane E's earnings
  table (above) is what a mission pays; retune from it (lane H's deviation 5).
- The win card never names an upgrade now; a "now in the shop" line under the thanks (lane H).
- A crew robot sent from My robots (lane C: only from the plot card).
- AC5's packaged upgrade drive over a real v4 app (session 5, with IW-007).

**For Richard:** each lane's FR lines (E, H above; C in IW-008 §5; L in IW-003 §7); the self-filling can — is "never
needs the pond" meant to change a program's path, or only its can? (lane H); the strip drawer at 1024 vs a narrower side
drawer, Play 4 px below the first screen on the French eggs at 390 (lane L); "more land" beyond 55 × 22 (IW-008).

### Session 5 (2026-10-01, lane O `iw006-owed`, base `b40be26c8`) — the owed items; AC5 driven on a real v4 app

**Built** (new `packages/noodl-mcp/tests/iw006Owed.ts` + `iw006Owed.test.ts`; hunks elsewhere each under
`// P108 IW-006 owed (lane O)`):

1. **My robots' upgrade slot** (`ROBOT_CARDS_SCRIPT` → `iw6oUpText`): the islanders no longer give upgrades, so an empty
   slot never names one. It names the upgrade **by the shop's own name** (the card she will look for — the old word was
   "Bigger basket", the shop sells "a bigger hod"), says the island's shop and SHOP's price; not on the shelf yet (the
   shop's own rule: its request done and a robot of hers it fits) it names the request that puts it there: "Empty slot ·
   in the island's shop: a bigger hod, 🐚 15" / "Empty slot · in the shop after “Water both rows the same way”: a bigger
   can, 🐚 15". A filled slot: a sticker (an islander's gift from before the shop) still says who gave it — it is true;
   a purchase says "· from the shop". **A tap on the slot does not open the shop** (the shop's open state is a States node
   local to `Island/Shop`; opening it from another page means a new global and a hunk in lane H's component): the slot
   SAYS where (the brief's "else says where"). Robot cards now reads Read family's `stickers` and `done`.
2. **Prices retuned** (numbers only): boots 20 → **15**, spa 40 → **30**, refuge 50 → **35**, rabbit 20 → **15**, sheep 25 →
   **20**; copies 30, can+ / basket+ 15, brains 25 / 40, helpers 6 / 8 / 10 kept. The rules (each a row of
   `iw006Owed.test.ts` O2, read from SHOP and from what the engine pays — a rule mutated to the base's prices goes red):
   a helper < one average first win; the three upgrades ONE price, 1–1½ first wins; a copy 2–3 first wins; brain16 <
   brain20 < 4 wins; band 7–9's four first wins (46) buy the refuge on their own; the refuge + her first animal within 3
   more minutes of her robots on the island; spa < refuge, an animal < the refuge, rabbit < sheep. Measured by the spec
   (Win pay on every job; ten minutes of Island tick + Island keep): every first win **173** 🐚 (avg **11.5**), band 7–9's
   four **46**; band 7–9's two robots (Pip on tulips-three, Cobble on path-stones) **+29 / 10 min = 2.9/min**; band 10–12's
   four robots (lane E's set) **+125 / 10 min = 12.5/min**.

   | item | 🐚 | first wins | min, 7–9 (2 robots) | min, 10–12 (4 robots) |
   |---|---|---|---|---|
   | a robot copy (each kind) | 30 | 2.6 | 10.3 | 2.4 |
   | can+ · basket+ · boots | 15 | 1.3 | 5.2 | 1.2 |
   | brain 16 · brain 20 | 25 · 40 | 2.2 · 3.5 | 8.6 · 13.8 | 2.0 · 3.2 |
   | rain · self-filling can · barrow | 6 · 8 · 10 | 0.5 · 0.7 · 0.9 | 2.1 · 2.8 · 3.4 | 0.5 · 0.6 · 0.8 |
   | spa · refuge | 30 · 35 | 2.6 · 3.0 | 10.3 · 12.1 | 2.4 · 2.8 |
   | rabbit · sheep | 15 · 20 | 1.3 · 1.7 | 5.2 · 6.9 | 1.2 · 1.6 |

   (a band 7–9 child's purse is her four first wins, 46, then ~3 a minute: the refuge 35 is hers from the wins, the
   rabbit 4 more minutes of watching — the materials are the real work.) **Literal price pins read from SHOP now:**
   `iw006Shop.test.ts` (32 / 30 / 22 / 29 / 2 / 50 / 40 / 20 / 15 / 10 — a copy's, brain16's, can+'s, the helpers'),
   `iw006Save.test.ts` (30 + 25 + 6, 22 / 8, 30), `iw007Build.test.ts` `[base]` (45 = rabbit + sheep, 40 = refuge − 10,
   10 = rabbit − 10 — these two rows went red with the retune and read SHOP now), `p108s4Join.test.ts` (40 / left 10),
   `iw008Crew.test.ts` (30, 25). `cg003Template.test.ts`'s Robot cards row pinned the owed defect itself ("… · from Mamie
   Rose") — it reads the shop line now. Drives with a copy's 30 or a brain's 25 typed (still right): `drive-iw006-shop.js`
   SHORT / BUY / BRAIN, `drive-iw008-crew.js`'s `buy` (lanes H / C — not edited; they read the catalogue elsewhere).
3. **"Now in the shop"** (`Logic/Shop news`, Pages/Workshop after Complete request → Play → the win card's `wnShop`): a
   FIRST win (Complete request's Newly Done) of the request an upgrade is unlocked by, when she does not have it and a
   robot of hers fits it: "Now in the shop: a bigger hod, 🐚 15" — under the thanks and the "+N 🐚" line, 14 px against
   the thanks' 26 (principle 2). Nothing on a replay, nothing for an upgrade she has, nothing when no robot fits
   (wall-until without Pocket), nothing for a win that shelves none.
4. **A crew robot sent from My robots** (`Logic/Send robot`, `Robot/Card`'s "Send {r} to a job" chips): a card of hers
   lists the jobs she has WON that need its kind (her band), ringed where it works or helps; a tap is lane C's assign rule
   run unchanged (`assignRobotScript`'s text, the request taken from the chip) — works a plot nobody works, helps the robot
   there, home when tapped where it is, refused when two already work there — and the line is said on THAT robot's card,
   in My robots' words ("Bubbles works on “…” now." — the plot card's "here" would be wrong on My robots). **Hook for the
   land (lane B, not built):** `iw006Owed.ts` header + `iw6oSendPlots` — when Robot cards reads Read family's `land`, push a
   `LAND_ID` chip for a robot of ANY kind, and `Logic/Send robot` hands `crewAssign` lane B's `landRequest` (it looks the
   request up in `Inputs.requests` by id).
5. **AC5 — the packaged upgrade drive over a REAL v4 app** (`garden-desktop/drive-upgrade-v4.js`, new). The v4 app is
   real: the Mac package a P105/P108 session built on 2026-09-29 (its page declares `SAVE_VERSION = 4` — the drive reads it
   from the bundle and refuses anything else), copied out of primary's `shell/dist` into this lane's scratch (read only).
   The current app is this lane's ONE packaged build (`build-app.js --no-model --allow-development-engine`, then
   `npm run dist:mac`; signed by the keychain's Developer ID, not notarised). Per band of the fixture, one throwaway home:
   launch 1 = the v4 app — its own Grown-ups page takes the authentic v4 code ("Paste a code" → "Replace the islands"):
   its own decoder and store write the family (storage v 4) and its shell backs it up at quit; launch 2 = the current
   build over the same home — storage v5 within milliseconds with no tap, every profile field-for-field what the v4 app
   stored but for the wallet {0, 0} and owned [] added, the robots, stickers, hats, plots and their programs listed and
   equal, every kid on Profiles, each kid's island in HER language with her requests done by their titles in it; the
   day's backup rewritten as v5 and its save code decoded by the current template; every request on 127.0.0.1.
   GARDEN_OLIVE_STUB=1 on every launch (no model loaded: the owl is CG-004's drive, not this one's).

**Readings** (worktree `iw006-owed`; each exit 0 unless said; previous = brief §8 on `b40be26c8`):

| gate | exit | total | previous |
|---|---|---|---|
| `iw006Owed.test.ts` (NEW: O1 3 · O2 3 · O3 3 · O4 3 rows + 7 arms) | 0 | **19 / 19** | — |
| cg002Engine · cg003Template · cg005Olive · cg006Requests · ig004Island | 0 each | 259 · 148 · 41 · 83 · 38 | same |
| cg001GardenKit · ig007Garden3d · iw004Blocks · p108s2Join · iw003Missions | 0 each | 57 · 50 · 59 · 4 · 63 | same |
| iw006Save · iw006Earn · iw006Shop · iw008Crew · iwLook · p108s4Join | 0 each | 17 · 34 · 34 · 25 · 15 · 3 | same |
| `iw007Build` | 1 | **18 passed, 4 failed, 22** — the 2 `[B]` and 2 `[A]` rows (by design); the two `[base]` rows the retune reddened read SHOP and are green | 18 / 4 / 22 |
| shell `node --test tests/*.test.js` | 0 | 92 / 92 (with and without `build-output`) | 92 |
| `npm run template:garden` | 0 | regenerated and committed with each group; drive-all's generate: 0 drift | 0 |
| `drive-all.sh owed robots robots-3d earn shop crew iw001 stones` (one deploy, `iw006-owed-scratch/drives/`) | 0 | page drive **331 / 331** (generate 0, drift none, assemble 0, deploy 0 fresh) · **owed 19 / 19** (NEW) · robots 60 / 60 · robots 3D 4 / 4 · earn 15 / 15 · shop 60 / 60 · crew 39 / 39 · IW-001 38 / 38 · stones 32 / 32 | 331 · — · 60 · 4 · 15 · 60 · 39 · 38 · 32 |
| `drive-upgrade-v4.js --v4-exe <the 2026-09-29 v4 package> --exe <this lane's package>` (AC5) | 0 | **18 / 18** (`iw006-owed-scratch/upgrade/final.{log,json}`) | — |
| `drive-upgrade.js --exe <this lane's package>` (CG-004 AC8/AC9, the same build relaunched) | 0 | **10 / 10** PASS (`upgrade/orig.json`) | — |

AC5's readings: band 10–12 (Noa FR, Sam EN): the v4 app stored v 4 with both kids; launch 2 found it **v5 2 ms** after the
page was drawn (no tap); Noa's 4 robots, 9 stickers, 3 hats, 9 plots (each its robot and its program's blocks) and Sam's
2 / 1 / 1 / 2 identical before and after; Noa's island in French (9 requests' titles), Sam's in English (2); the day's
backup v4 after launch 1, v5 after launch 2, its code decoded by the current template to both kids. Band 7–9 (Léa FR):
the stored family IS the fixture's model; v5 in 1 ms; her island in French. Hosts: 127.0.0.1 (199) and data: (56) only.
The packaged app's page declares SAVE_VERSION 5, the v4 one 4 (read from each bundle on disk).

**Screenshots looked at** (`iw006-owed-scratch/drives/pages/owed-shots/`): `iw6o-1368-fr-win-shop.png` — « Merci,
Cobble ! » 26 px, « +17 🐚 coquillages pour le travail », then « Nouveau dans la boutique : une plus grande hotte, 🐚 15 »
the same small grey; `iw6o-1024-en-win-shop.png` (the dev deploy) — the same in English; `iw6o-1368-fr-robots-slot.png` —
four cards: Pip « … après « Arrose les deux rangées de la même façon » : un plus grand arrosoir, 🐚 15 », Cobble « dans la
boutique de l’île : une plus grande hotte, 🐚 15 », Poche (boots, after « Rapporte ma balle du mur »), Écho (the can) — no
islander named; `iw6o-1024-en-robots-sent.png` — "Send Bubbles to a job", his post-box chip ink, "Bubbles works on “Bring
my letter from the post box” now."; Pip's chip on the tulip door ink; `iw6o-1368-fr-island-card.png` — the island: Bubbles
drawn on the post box's plot, its card « Bubbles travaille ici », the request list « ✓ fait · Bubbles travaille ici »;
`iw6o-390-fr-robots-send.png` — the send chips wrapping on two lines inside the card.

**Deleted after the drives (disk):** `garden-desktop/shell/dist` (the package, 706 MB), `garden-desktop/shell/build-output`
(26 MB, no model), the v4 package's copy in this lane's scratch (1.1 GB; primary's `shell/dist` was only read), the drives'
throwaway homes, the dev deploy, every drive's screenshots but `owed-shots/`.

**Not done / not mine:** opening the shop from My robots' slot (it says where — above); the land in My robots' send list
(the hook — lane B's); a Windows run of the v4 drive (CI's job builds Windows; the v4 app here is a Mac package).

**Deviations, with reasons:**
1. **The slot names the upgrade by the SHOP's name** (the brief: "names the upgrade"): the robot card's own upgrade word
   ("Bigger basket · 8 things") is not what the shop calls it ("A bigger hod") — a child sent to the shop must find that
   card. Seen in the drive's readings (the slot and the shop side by side).
2. **AC5's launch 1 is a real v4 BUILD, not the current build seeding storage** (the brief: "launch 1 seeds a v4 family …
   as the v4 app left it"): a packaged v4 app was on this box; its own page decoded the fixture's code and wrote its own
   store. Measured: band 7–9's stored family IS the fixture's model, field for field; band 10–12's differs in ONE field —
   Noa's `cardsSeen` (IW-001 F8, added to the v4 save after that build): the v4 app's decoder dropped it, and "nothing
   lost" is graded against what the v4 app stored.
3. **A chip on My robots wraps inside its panel** (lane O's CSS block, `.bg-robot-card .bg-chip, .bg-robo .bg-chip`): at
   390 FR the page scrolled sideways (scrollWidth 435) — a hat still to earn, "Chapeau tournesol · un cadeau de Mamie
   Rose", 405 px, in the stage's options and on each card (pre-existing: IG-005's hats; lane C's 390 FR family had the sun
   hat), and a long job title on the new send chips. Measured after: 390.

**FR lines for Richard's read** (`iw6o…`): « Emplacement vide · dans la boutique de l’île : {up}, 🐚 {n} » · « Emplacement
vide · dans la boutique après « {q} » : {up}, 🐚 {n} » · « {up} · de la boutique » · « Nouveau dans la boutique : {what} »
(« une plus grande hotte, 🐚 15 ») · « Envoyer {r} sur un travail » · « {r} travaille sur « {plot} » maintenant. » · « {r}
aide {m} sur « {plot} » maintenant. » · « Deux robots travaillent déjà sur « {plot} ». ».

**Could not verify:** the tablet; Windows (the v4 drive runs on a Mac package); the owl in the upgraded app (stubbed — a
model on a shared box is the exam's CPU); notarisation (`dist:mac` skips it: no notarize options); the cause of one
renderer console line in launch 2 of the v4 drive, both bands — « Electron sandboxed_renderer.bundle.js script failed to
run: TypeError: Cannot destructure property 'preloadScripts' of 'binding.startupData' as it is null » — the page ran and
every clause held; the v4 app's launches and CG-004's drive relaunching one build (both Electron 43.2.0, the same
webPreferences) did not log it: it appears when the current build opens a home a DIFFERENT build left. Not chased.
