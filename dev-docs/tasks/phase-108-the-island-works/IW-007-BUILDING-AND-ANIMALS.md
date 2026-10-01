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

### Session 5 (2026-10-01, lane A `iw007-animals`, base `b40be26c8`) — the animals (AC2, AC3 for animals, AC4's frame gate)

**Built** (new files `packages/noodl-mcp/tests/iw007Animals.ts`, `iw007Animals.test.ts`, `scripts/devtools/drive-iw007-animals.js`;
hunks elsewhere each under `// P108 IW-007 (lane A): …`; lane B's land plumbing `b37112fdb` merged in at `ab100d31c`):

- **The Animals tab** (`IW7A_SHOP_SHARED`, appended to iw006Shop's shared script; hunks in `shShows`, the rows' `later`, the
  card's animal branch and bought line, Buy's default name): shut — "Build the refuge first: your animals will live there."
  and nothing to buy — until a refuge on her land is FINISHED (`buildingDone`, the same test `buyItem` makes for `refuge`);
  then the rabbit and the sheep. The purchase card has the copy's name box; an empty box takes the default name the box
  shows (Hazel / Noisette, Cloud / Nuage — numbered only when one of hers already wears it); a full pen says "Every place
  in the refuge’s pen is taken." and has no Buy; after Buy the card says "{name} is waiting by her bowl on your land. A
  robot can bring her carrots!" (his, for the sheep). Buy is `Logic/Buy` → `buyItem` (the one place spent rises).
- **Her by her bowl, in both kits** (garden-kit `petEls` / `patchEls`, garden-3d-kit `THING_BUILDERS.bowl` wrapped and
  `THING_BUILDERS.patch`; built files committed): fed (count > 0) she stands, happy — 2D a small hop now and then (CSS,
  stilled for reduced motion), 3D a hop when a carrot lands (one shot: a still scene still draws nothing); hungry (0) she
  sits by her bowl and waits (ears laid back, eyes on the bowl — never sad), never gone (R2). Rabbit: fur, long ears, a
  white tail; sheep: wool, a dark face, legs when standing, lying in his wool when waiting. Her name a pill (2D in the
  cell; 3D in the overlay, `.gd3-pet`). Her bowl's meter in carrots (`2/3`, a carrot icon, the island's bar orange). On
  the island (a wide world) she is drawn about two tiles tall. `petMood` on both job looks, pinned equal.
- **The carrot patch** drawn by what is left (four places; used up, bare soil with a sprout in each — it regrows), its
  meter left/max in carrots; **a carried carrot** on a robot's back (2D load sprite, 3D cone + leaves).
- **Draw world** (the page script between the island and the kits): an animal's bowl now reaches the kits with `animal`
  and `name` (the job fields alone dropped them — the kits drew a plain bowl), the patch with its `left` (it was dropped).
- **The drawer's "go to nearest"** lists the carrot patch and the tree (blocks.js `SEEK_KINDS`, words `iw7aK_patch`,
  `iw7aK_tree` — the node's own fallback kept apart from its iw4 table, which the page's must mirror).
- **Feeding**: taught as any job — `until [her bowl] is full { go to nearest 🥕 patch, pick up, go to [her bowl], put down }`;
  pinned on the land (`plots.land`) it fills her bowl on the island's tick, wear (WEAR.bowl) takes a carrot, the robot
  goes back. Lane B's plumbing carries it (the island, the keep); this lane adds nothing to the tick.

**Readings** — _placeholder: filled in the next commit, after the last drive run._

**Not done, and why** — _placeholder._

**Deviations, with reasons** — _placeholder._

**FR lines for Richard's read:** « Construis d’abord le refuge : tes animaux y vivront. » · « Le refuge n’est pas encore
fini. Tes robots peuvent le construire ! » · « Toutes les places de l’enclos du refuge sont prises. » · « {name} t’attend
près de son bol, sur ton terrain. Un robot peut lui apporter des carottes ! » (rabbit and sheep alike: « son bol ») ·
« 🥕 carré de carottes » · « 🌳 arbre » · the default names « Noisette » (the rabbit), « Nuage » (the sheep).

**Could not verify** — _placeholder._
