# IG-002 — Resources: water is fetched, stones are mined, the load is drawn

**Opened 2026-09-28**, from README §1 point 1 and ruling R3. **Status: ⬜ not started.** Depends on IG-001
(D9 sprites, D10 pad). Lane A.

## 1. The person sentence

> **The robot's can holds three waters; at the pond it fills; each tulip drinks one; with an empty can the
> tulip stays dry and that is the error. Stones come out of the rock one `pick` at a time, and the rock gets
> smaller. The loop a child discovers is fetch, go, use, come back.**

## 2. What it is

- **Engine (`cg002Scripts.ts`).** New primitive `fill`: with a water tile ahead, `can = canMax` (default 3,
  a robot field, IG-005 upgrades it); `water` spends one; `water` with `can = 0` does nothing but raise a
  `dry` event (no puddle). New sensor `can empty`. `pick` with a rock ahead: the rock thing's `left`
  decrements, a `stone` enters `carry`; at `left = 0` the rock tile becomes grass. `basket` (already 4)
  bounds stones as it bounds letters. The world's `robots[]` gains `can` and `canMax`.
- **Things (`cg002Content.ts`).** `rock` becomes a thing `{kind:'rock', x, y, left}` on a grass tile (the
  tile kind `R` stays for decorative rocks that yield nothing); `stone`, `postbox`, `sign` and `note` are
  things (IG-006 reads `note`/`sign`).
- **Requests (`cg002Content.ts`, `cg006`).** *Tulips* becomes "three tulips, the pond two tiles behind you,
  a can of three": the reference program is `repeat 3 { fill, fwd, fwd, water, back, back }` or the child's
  own with turns; the fold finds the six-block dance. *Path-stones* starts with an **empty** basket and a
  rock of four beside the start. The two requests' hint keys and FR/EN copy are rewritten; every other
  request keeps its map with `R` tiles as decoration.
- **Kit (`kit.js`).** Sprites: the rock at three sizes by `left`, the stone, the post box (D9), the sign, the
  note, and on the robot: the can's level (0–3 drops on the can) and the load (a stone or letter on the
  back). The 3D node (IG-007) draws the same vocabulary; this task writes the vocabulary once in
  `cg002Content.ts` and both renderers read it.
- **Pad (from D10).** `fill` and `pick` keys appear where allowed.

## 3. Acceptance criteria

1. Engine gate: `fill` at a pond fills to `canMax`; `water` ×3 then a fourth on a tulip leaves it dry and
   raises `dry`; `fill` with no water ahead is a no-op with a `bump`-free event; `pick` on a rock of 4 ×4
   fills the basket and the rock is gone on the fifth `pick` (a bump, nothing carried); FR and EN lines for
   `hintDry` ("The can is empty. Where is the pond?") and `hintRockGone`.
2. The fold on the recorded tulips dance (`fill fwd fwd water left left fwd fwd right right` ×3) offers
   `repeat 3` with the nine-block body; the engine gate asserts it in both bands.
3. Tulips and path-stones each win with their reference program and say `hintPerfect` (IG-001 D3); each is
   driven by hand in the page drive, EN and FR, both sizes.
4. Every new thing renders as inline SVG with a kit class; the can shows 3/2/1/0 drops as the drive waters;
   the stone on the back appears after `pick` and vanishes after `put`. Screenshots looked at.
5. The Skills page's trick 1 card says "forward, turn, fill, water, pick, put" in both languages.
6. Garden specs, kit gate, page drive, template byte-identical, 0 console errors.

## 4. How to build it

Engine first with the gate (`cg002` spec: primitives, sensors, goals, the fold); then the vocabulary table
and the two requests; then the kit sprites; then the pad and the drive. `canMax` and `basket` are robot
fields from day one so IG-005's upgrades are a number, not a branch.

## 5. Gates

As IG-001 §5, plus the P105 engine gate's rule: every request generated in both languages and both bands
with its reference program winning.

## 6. Traps

`water` on a non-tulip tile still makes a puddle when the can is not empty: the puddle is the error message
the spec keeps. A thing on a tile blocks a move (tulips and bowls do); the rock must block too, or the robot
walks into it. The `.gd-label` shortcut is gone after D9: any new thing without a sprite draws NOTHING, and
the drive must assert the element, not the absence of an error (`verify-the-consequence-not-just-the-mechanism`).
