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

(empty)

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
