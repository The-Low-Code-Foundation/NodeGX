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

(empty)
