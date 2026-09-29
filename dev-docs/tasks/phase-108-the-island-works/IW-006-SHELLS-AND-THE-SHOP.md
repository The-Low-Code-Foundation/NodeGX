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
