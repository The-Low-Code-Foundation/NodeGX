# IW-007 — Building and animals

**Opened 2026-09-29** from README §0 ("the more they drop the resources the more the house pops up … a robot spa or an
animal refuge … buy a sheep and a rabbit … task a robot with collecting food and feeding them"). **Status: ⬜.**
Depends on IW-005 (seek), IW-006 (the shop). Lane B or E.

## 1. The person sentence

> **She buys the robot spa, drops its ghost on her free land, and teaches Cobble to carry stones and a new robot to
> carry planks. Each drop raises a wall a little; the robot that brings the last plank finishes it with a puff. Then
> the refuge, then a rabbit, then a robot whose job is to bring the rabbit carrots.**

## 2. What it is

- **Free land:** plots on the island that belong to no islander (today free play's plot + new ones, IW-008).
- **Blueprints:** a building = a footprint, a list of materials `{stone: 20, plank: 10}`, 3–5 build stages. Placed as a
  ghost; the site is a `site` thing (IW-002) with a meter per material; each `put` adds; each stage shows at its share.
- **Materials:** stones (rock, IW-002), planks (a tree source: `chop` gives a log, the saw bench turns logs into planks
  — or planks direct from the tree for band 1), carrots (a veg patch Pip waters, which grows carrots).
- **Buildings do something:** the spa (robots walk there when a job is done — a place to "come home" to); the refuge
  (unlocks animals); a bridge (opens a plot); a bench (an islander sits there).
- **Animals:** bought after the refuge; each has a bowl (a container) that empties on wear; feeding it is a job with a
  source (the carrot patch / the grain sack) — the feeding robot is taught like any other. A fed animal is happy (an
  animation) and sometimes gives something (wool, an egg). A hungry one just waits; nothing dies (R2).
- **Juice:** each stage rises with a pop and dust; the last piece plays a small tune; the islander comes to see.

## 3. Acceptance criteria

1. A blueprint bought, placed on free land (a legal footprint only), built by two robots with two materials; each
   stage drawn in 2D and 3D; the last drop finishes it.
2. The refuge unlocks Animals in the shop; a rabbit bought; a feeding job taught and pinned; the bowl empties on wear
   and the robot refills it.
3. A building never un-builds; an animal never leaves or dies (R2, README §8).
4. Island drives 2D + 3D; the frame gate re-read with two buildings and two animals.

## 4. Notes

(empty)
