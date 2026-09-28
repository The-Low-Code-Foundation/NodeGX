# IG-005 — The right robot for the job: a catalogue, unlocked by islanders, each with its own blocks

**Opened 2026-09-28**, from README §1 point 7 and ruling R8. **Status: ⬜ not started.** Depends on IG-004
(robots live on plots). Lane B.

## 1. The person sentence

> **Pip waters. When Sami asks for a path, the child has no robot that carries stones, so Sami lends Cobble,
> who is orange, wears a hod, and knows `pick` and `put`. She names him, teaches him, leaves him laying the
> path, and goes back to Pip. Later Mamie gives Pip a bigger can.**

## 2. What it is

- **The catalogue** (`cg002Content.ts`, `ROBOTS`): four robots, each `{ id, defaultName: {en, fr}, colour,
  accessory, palette, canMax, basket, lentBy, unlockedBy }`:

  | id | default name | accessory | palette (beyond `fwd left right` and the controls of the band) | unlocked by |
  |---|---|---|---|---|
  | `pip` | Pip | the can | `water fill` | the start |
  | `cobble` | Cobble | a hod | `pick put` (stones) | Sami's first request |
  | `pocket` | Pocket | a satchel | `pick put` (letters, food), basket 6 | Biscuit's bowl |
  | `echo` | Echo | a bell | `say`, and the `ask Olive` blocks (band 10–12) | Mamie's note (IG-006) |

  Every robot can be renamed (≤ 16, the existing `ROBOT_NAME_MAX`) and wears any owned hat.
- **Upgrades** as rewards: `can+` (canMax 3 → 6, from Mamie), `basket+` (4 → 8, from Sami), `boots` (Step
  Ms × 0.7, from Biscuit). Rewards today (hats, stickers, items, seeds) stay; `item` gains the upgrade ids
  and `robot` is a new reward kind.
- **The palette becomes band × request × robot:** `PALETTE_SCRIPT` takes `robot.palette` as a third input; a
  request names the robot kind it needs (`needs: 'cobble'`) and the plot is padlocked until that robot is
  owned (IG-004 AC5's line).
- **My robot → My robots** (`cg003Components.ts`): a card per owned robot (name, colour from the catalogue,
  eyes, hat, its blocks as chips, its upgrade, "at work on … / at home"); the new-player form picks Pip's
  name only. Save v4 already carries `island.robots`.
- **Both renderers** draw the accessory (kit sprite + 3D primitive) and the robot's colour from the catalogue.

## 3. Acceptance criteria

1. Engine gate: the palette for band 7–9 × tulips × Pip is `fwd left right water fill`; × path-stones × Cobble
   is `fwd left right pick put`; × Cobble on tulips is refused (`needs`).
2. A `robot` reward adds the robot to `island.robots` with its default name in the profile's language; the
   page drive wins Sami's letter and finds Cobble on My robots, unnamed by the child, named "Cobble" / "Cobble".
3. `can+` on Pip makes `fill` give 6; the drive waters six tulips on one fill after the upgrade and three
   before.
4. Two robots on the island at once, each on its plot, each in its colour with its accessory; a screenshot
   looked at in both renderers.
5. The padlock line names the lender and the request; both languages.
6. Both languages, both sizes, 0 console errors; save code round-trip with three robots; template gates.

## 4. How to build it

The catalogue and the palette input first (engine gate); then the reward kinds and Complete request; then My
robots on the page; then the sprites and the 3D accessories; then the padlock text. The mockup's robot cards
(IG-000) are the look.

## 5. Gates

As IG-001 §5.

## 6. Traps

Echo carrying the Olive blocks is a palette choice, not an engine rule: the engine's ask blocks stay usable by
any robot in tests. A hat is per profile (owned) and per robot (worn): two fields. The kit's `HATS` list draws
only `cap sun crown`; a new hat owes both renderers.
