# IW-004 — Real blocks: Blockly, made for children the way Scratch made it

**Opened 2026-09-29** from README §1.2 and ruling R3: *"Yep 'real' blockly, but like Scratch you can modify the blockly
display and mechanics to make it much easier for kids to use please"*. **Status: 🟡 s2 (lane B, §6) — the Workshop on Blockly 12: AC1–AC3 and AC5–AC8 ✅; AC4 ✅ on the engine at the merge (`p108s2Join.test.ts`), on a page with IW-003; AC9 ✅ but the tablet (Richard's).** Depends on IW-000 (the look,
the touch reading) and IW-001 (the bar, the pad). Lane B.

## 1. The person sentence

> **She drags `repeat` out of the drawer, drops it under `fill`, drags `water` inside it. To say "until the basket is
> full" she taps the basket on the island and it becomes a block. At 11 she builds `count of 🥚 in [basket] = 4` from
> three blocks, and watches the number on the basket change as Pocket works.**

## 2. What it is

**Blockly 12.3.1** (Apache-2.0; already in the repo at `packages/noodl-editor/package.json:205`; `blockly.min.js`
1.1 MB; `msg/en.js`, `msg/fr.js`) **vendored into the garden kit** the way IG-007 vendored three.js (the module
manifest's `dependencies`). A new kit component `garden-kit.Blocks` replaces `BlockList` (KIT:444-775) on the same
ports (program in/out, palette, running id, band, lang, locked) so the pages barely change.

**The Scratch-style changes (R3):**

| Change | How |
|---|---|
| The Scratch look: round, big, chunky | the built-in **Zelos** renderer; a theme from the game's tokens (`--block-motion`, `--block-loop`…, P105 CG-007) |
| Drag from the drawer; a tap also adds | Blockly's flyout drags natively; a flyout click listener adds the block at the end of the selected stack (today's tap habit) |
| The drawer always open, no categories at 7–9 | a flyout-only toolbox (`toolbox: {kind:'flyoutToolbox'}`) at band 1; categories as coloured tabs at band 2 |
| `?` on the drawer blocks only | a `FieldImage` `?` added when `block.isInFlyout`; it opens the block's card (P106 IG-006 cards) |
| Delete by dragging back to the drawer | Blockly's flyout-as-trash (drop on the flyout deletes); no trashcan icon; no tap-to-delete |
| Icon-first blocks at 7–9 | band 1 blocks are an icon + one word; band 2 adds the words |
| One way to build a condition | a thing slot (`garden_thing`) with a `👆` button; the state dropdown is a dynamic `FieldDropdown` whose options depend on the chip's kind |
| Nothing a child can break | no context menu except Help and Duplicate; no comments, no collapse, no disable; `maxBlocks` = the robot's brain size |
| The running block glows | `workspace.highlightBlock(id)`; Zelos draws a glow; the ring contrast rule of P106 D5 (≥ 3:1) |
| Room | the workspace fills the right column to the bar; zoom +/−/fit buttons; the scale starts at the kids' size and the flyout keeps its own scale |
| Touch | pointer events are Blockly's own; drag threshold and snap radius raised for fingers (reading from IW-000 AC5) |

Check `scratch-blocks` (Scratch's own Blockly fork) before starting: if its current release sits on Blockly 12 and is
maintained, weigh adopting its look; otherwise take the ideas, not the fork. Not measured.

**The blocks, by band** (README §5's ladder):

- **Both:** forward, turn left/right, water, fill, pick, put, say, repeat N, until ⟨condition⟩, if ⟨condition⟩,
  `go to nearest [thing]`, `go to [thing]`, the trick blocks, Olive's blocks.
- **Conditions at 7–9:** `[thing chip] is ⟨state⟩` — states from the kind (can: empty/full; basket: empty/full;
  ahead: wall/tulip/rock/nothing; bowl: empty/full).
- **At 10–12, value blocks:** `count of [kind] in [thing]`, `[thing]'s level`, a number, `=` `<` `>`, `and`/`not`,
  `what Olive read`, `set [name] to`, `change [name] by`, if/else.
- **The value drawn on the world:** every chip used in the program shows its live value on its thing in the world as
  the robot works (the basket reads 3/4) — a monitor, not a hidden number.

**The program format:** the engine keeps its own program model (`{t, id, body, …}`); a translator maps Blockly JSON ↔
engine program, extended with **expressions** for conditions and values (a small evaluator in the engine, `sense()`
becomes `evalCond()`; the old `sensor/arg` pairs translate into expressions). Teach appends blocks to the workspace
(into the selected C-block); the fold (repeat detection) works on the engine program and writes back.

**Stored programs (save):** v4 `island.plots[].program` in the old format migrate on load; one that no longer wins its
rewritten mission is kept and marked "teach again" (IW-003 §6). An on-load migration writes the save at once.

## 3. Acceptance criteria

1. Every block of today's vocabulary exists in Blockly; every reference program round-trips Blockly JSON → engine →
   Blockly JSON byte-identical (the block gate, README §7).
2. Drag from the drawer, tap-to-add, drag-to-drawer delete, drop into a C-block — each driven with pointer events at
   1024 × 768 and on a touch-emulated phone.
3. A thing picked on the island (2D and 3D) becomes a chip; the state list differs by kind; a band-1 drawer shows no
   value blocks, band 2 does.
4. `until [eggs in basket] = 4` and `until [basket] is full` both win eggs-count; the basket's number is drawn and
   changes as the robot puts.
5. `maxBlocks` stops a 13th block on a 12-block brain with a line that says why.
6. Teach records into the workspace; the fold offers `repeat` on the tulips dance (P106 IG-002 AC2) as it does today.
7. Cards: the `?` on a drawer block opens its card; placed blocks carry no `?`.
8. A v4 save with stored programs loads, migrates, writes back, and its plots still work or say "teach again".
9. EN/FR (Blockly's own messages + ours); the tablet by touch (Richard's reading); 0 console errors.

## 4. Gates

Garden specs + the new block gate; page drive; modes drive (Drive · Teach · Play on Blockly); Workshop 3D drive;
template byte-identical; the look beside IW-000.

## 5. Traps

- Blockly injects into a DOM node and owns it; a React re-render must never remount it (hold the workspace in a ref,
  feed programs by `Blockly.serialization.workspaces.load` only when they differ).
- Blockly's CSS is injected globally; scope the kit's overrides under the workspace's class or the editor chrome of a
  NodeGX project will pick them up.
- A 1.1 MB script in a runtime module: the template must still generate byte-identical and the packaged app must load
  it offline (the shell has no network at first run).

## 6. Notes

### Session 2 (2026-09-30, lane B `iw004-blocks`, base `a9d8850fd`)

**Built.**

- **Blockly 12.3.1 vendored into garden-kit** the way garden-3d-kit vendors three.js: `blockly_compressed.js` (967,598
  bytes), `blockly-msg-fr.js`, `blockly-msg-en.js` — byte for byte from `node_modules/blockly` (the spec compares them) —
  with `blockly-msg-keep.js` between them (three lines of ours: both message files write into one `Blockly.Msg`, so the
  French is kept before the English overwrites it), `LICENSE.txt` (Apache-2.0), the README and the shell's NOTICE
  crediting it. The manifest's `dependencies` load them before `index.js`; nothing is fetched (Blockly's `media` is
  `data:,`, sounds off, no trashcan or zoom sprites; every icon is inline SVG path data drawn by a field of our own, so
  `index.js` still carries no `http`, `url(`, `<img>` — CG-001 AC10 unchanged).
- **`garden-kit.Blocks`** (`library/modules/garden-kit/src/blocks.js`, above `kit.js` in `index.js`; `kit.js` only
  registers it; Block List stays in the kit, its gate unchanged). Block List's ports (Palette, Program, Band, Language,
  Running Id, Locked, Show Palette, Show Help, the six colours; Program, Changed, Selected, Help Block, Help) plus
  **Words** (the page's rows, `iw4…` keys), **Robot Name**, **Brain Size**, **Pick** (`{ n, ref }`) in and **Blocks**,
  **Brain Full**, **Picking**, **Pick Armed**, **Watch** (the chips the program uses, JSON REFs) out. The workspace is
  injected once into a host `div` React never renders into and held in a ref; props reach it through `update()`, which
  re-injects only for what Blockly cannot change in place (band, language, palette, colours, the narrow layout) and
  loads a program only when the graph sends a NEW one that is not the node's own text (a render with an older prop
  never undoes an edit — measured: the first cut reloaded on every prop change and threw edits away). Every rule of the
  node's CSS is under `.gd-bk` (a spec clause reads every selector).
- **The kid customisations (IW-000 §7, as graded):** Zelos, a theme from the page's block tokens (`var(--block-…)` read
  off the page: Blockly's theme needs the colour itself); the drawer always open (`flyoutToolbox`) with its own scale
  (0.84 at 7–9, 0.74 at 10–12, 0.62 on a phone) through a `VerticalFlyout` subclass — and on a workspace under 420 px (a
  phone) a **horizontal strip at the workspace's foot**; tap a drawer block to add it (into the selected container, else
  at the end; a new container is selected, as Block List did; a value block goes into the first empty slot of the
  selected block, depth first) or drag it out; drag a block back onto the drawer to throw it away (no trashcan, no
  tap-delete); the `?` only on the top blocks of the drawer (a `?` field of our own; it fires Help Block + Help, places
  nothing); every slot is a **KidPick** field: a tap opens the node's own picker of big buttons (`.gd-picker .gd-opt`),
  a keyboard only at 10–12 where the palette's slot allows it; the context menu is **Help + Duplicate** only (every other
  item unregistered; Duplicate is ours so the copy gets whole-number ids and respects the brain, in Blockly's own word:
  "Dupliquer" in French); the running block wears `highlightBlock` and a 4 px ink ring over a white halo; + − ⤢ buttons;
  snap 48 / connect 64 / drag 6 px for fingers. A block made in Blockly gets the next whole-number id of the program
  (the flyout's `serializeBlock` and tap-add renumber the copy), so Teach's and the fold's `maxId + 1` keep working.
- **Conditions and values (brief §4.3):** until / if / if-else hold a COND input with a shadow **sensor** block (the
  palette's canned sensors — today's requests are built with them), which a child can replace with a **thing chip and
  its state** (`garden_is` + `garden_thing`; the state list comes from the chip's kind: tulip thirsty / drunk, the tile
  ahead wall / clear / has, can·basket·bowl·store empty / full / has N, site, rock, other: in front), **count of**,
  **level of**, **= < >**, **and / or**, **not**, a **number**, a **text**, a **variable**, **what Olive read**; the
  statements go to nearest, go to (a chip), set, change, if + else. Band 7–9's drawer shows none of the value blocks;
  10–12's shows them wherever the drawer has until or if (set/change/var only when the palette offers set/change —
  IW-003's). A chip is armed by a tap; the page's `Logic/Pick thing` turns the next tile tap on either world into a REF.
- **The translator** (`node.translate.toBlockly/toEngine`, pure): engine block ↔ Blockly block with the engine id as
  the Blockly id; each block keeps its own engine shape in `extraState.src` (key order, untouched slots, value types),
  so a program comes back byte-identical whatever it was written with (the reference programs' `arg: 4`, a stored v4
  program's `"arg": "4"` in Block List's key order). A condition that is exactly one legacy sensor is written as
  `slots.sensor` / `slots.arg` (today's engine reads it; a `cond: { op: 'sensor' }` read in comes back as a `cond`);
  anything else as `slots.cond`. An op or a type the kit does not know rides whole (opaque blocks).
- **The Workshop** (`cg003Components` / `cg003Scripts` / `cg007Look`, the lane's regions): `plBlocks` is Blocks on Block
  List's wires + words, the robot's name, `brainSize: BRAIN_SIZE` (12, `cg002Content` END); the card's example stays a
  Block List. `Logic/Pick thing` (Garden and Garden 3D's Tile X/Y/Tapped → the thing on that tile from the world JSON →
  `{ id?, kind, x, y }`; the robot → held / ahead) → Blocks.Pick. `Logic/Var monitor` → a line under the world
  (`plVars`) with the run's `vars` (lane J's `set`/`change`). The if/else drawer block's card is if's. The steps column
  is the workspace: `clamp(420px, 43vw, 780px)` beside the world (the panel's height), 70vh under 980 px; driving paints
  the workspace on the paper. The card flow (IW-001 F3/F4/F8) is unchanged: a first block of a kind opens its card, the
  `?` on the drawer opens it, Got it saves it on her profile. Teach and the fold work on the engine program and the
  workspace reloads from it (Teach records into the selected container: Selected is the selected statement's id).
- **The fold walks an if's else** (the orchestrator's finding from lane J): `FOLD_HELPERS` and the fold's count.
- **Words:** 78 `iw4…` keys (the node's own, equal to the page's — a spec clause) + `iw4VarsH`, EN + FR, one block at the
  end of `PAGE_WORDS`.

**Readings** (worktree, on `524cf4653` — the commit before the wiring commit; each spec file alone; every drive on the
one deploy `drive-pages.sh` made from it; previous = brief §3's merged reading at `a9d8850fd`):

| gate | exit | total | previous |
|---|---|---|---|
| garden specs, seven files (cg002Engine 199, cg003Template 139, cg005Olive 41, cg006Requests 83, ig004Island 21, cg001GardenKit 40, ig007Garden3d 38) | 0 each | **561** | 551 (+5 cg003Template's IW-004 describe, +5 cg001's Blocks describe) |
| `iw004Blocks.test.ts` (new) | 0 | **54** | — |
| `npm run template:garden` | 0 | engine gate 199/199; drift 0 after the commit | 0 |
| page drive `drive-pages.sh` (`--mockup`) | 0 | **331/331** | 331/331 |
| `drive-iw001-workshop.js` | 0 | **38/38** | 38/38 |
| `drive-iw004-blocks.js` (new) | 0 | **19/19** (2D) + **3/3** (`--mode 3d`) | — |
| `drive-ig003-modes.js` | 0 | **90/90** | 90/90 |
| `drive-ig004-island.js --perf` / `--mode 3d` | 0 / 0 | **65/65** / **5/5** | 65/65 / 5/5 |
| `drive-ig005-robots.js` / `--mode 3d` | 0 / 0 | **60/60** / **4/4** | 60/60 / 4/4 |
| `drive-ig007-workshop.js --mode 3d` / `nogl` | 0 / 0 | **24/24** (p95 17.9 ms, swiftshader) / **8/8** | 24/24 / 8/8 |
| `drive-olive.sh pages` | 0 | **22/22** | 22/22 |
| shell `node --test` | 0 | **91/91** | 91/91 |

Reds on the way, named: the Workshop 3D drive (swiftshader) lost Garden 3D to its Too Slow rule on four runs between
`7204348e1` and `6956103d2` — twice during Teach (press 16–18: every pad press reloaded the workspace; fixed by appending
the one block) and twice during Play (Blockly's glow filter + a re-tag of every block per tick; fixed by one class per
tick) — and passed on the fourth run of `6956103d2` and on `524cf4653`. The page drive's 390-en fold pair was red once on
`6956103d2` (329/331: the fold offer tapped, the program left at 27) and not seen again (331/331 twice since). Frame Ms
during Play, one run each: p95 37.9 ms with the workspace, 30.9 ms with it hidden.

The wiring commit (the last, alone) was checked against lane D's kits (`p108-s2-merge`'s built Garden and Garden 3D,
lane D's kit.js with this lane's two-line hook, rebuilt with blocks.js, in the worktree for the test only, then put
back): `template:garden` exit 0; cg003Template 139/139; `drive-iw004-blocks.js` 19/19 on that deploy, and the world wears
the violet frame while a chip is picking (screenshot looked at). In this worktree alone the generator refuses the four
wires (`nonexistent-port`: Garden has no `watch` / `picking` here), so that commit carries the source only and the
orchestrator regenerates after the merge.

**Acceptance criteria.**

1. ✅ Every block of today's vocabulary (`BLOCK_TYPES` + Olive's rungs) and every new statement / expression has a
   Blockly block; the block gate: every reference program (13 × 2 bands, raw and as stored), the v4 plots and 13
   fixture programs round-trip byte-identical, pure and through a real headless Blockly (`iw004Blocks`, 54).
2. ✅ Driven with pointer events at 1024 × 768 and with touch on an emulated phone (390 × 844): drag from the drawer,
   tap to add, drop into a C-block's mouth, drag back to the drawer (`drive-iw004-blocks.js`, 8 clauses).
3. ✅ A thing picked on the island becomes a chip — 2D (drive) and 3D (`--mode 3d`, a tap through `screenOfTile` on the
   swiftshader canvas); the state list differs by kind (tulip vs the tile ahead); band 7–9's drawer has no value block,
   10–12's has all eleven.
4. ⬜ Not provable in this lane: `until [eggs in basket] = 4` and `until [basket] is full` WIN eggs-count only when the
   engine evaluates `cond` (lane J, merged after) AND eggs-count has a basket (IW-003 rewrites the missions). Proved here:
   both conditions are built from the drawer, emitted as the contract's `cond` and round-trip; the basket's number is
   drawn by lane D's `watch` (wired in the last commit).
5. ✅ The 13th block on a 12-block brain is refused with "Pip's brain holds 12 blocks. Fold some steps into a repeat to
   make room." and the drawer greys (drive).
6. ✅ Teach records into the workspace, into the selected repeat (drive); the fold on the tulips dance (page drive AC3
   and IG-002 AC3, unchanged, green).
7. ✅ The `?` on a drawer block opens its card and places nothing; placed blocks carry none (drive; page drive IG-006 AC5).
8. ✅ as the brief reduced it: a stored v4 program loads, displays and re-emits byte-identical (the gate's "as stored"
   rows and the v4 plots); nothing to migrate (the format is unchanged).
9. ✅ EN / FR: Blockly's own messages (Duplicate / Dupliquer) and ours (the menu, the drawer's words) switch; 0 console
   errors, 0 network errors in every drive. ⬜ the tablet by touch is Richard's.

**Deviations, with the reason.**

1. **A lone legacy sensor is written as `sensor`/`arg`, not `cond`** (brief §4.2 says every condition built in Blockly is
   `cond`): today's engine (and the 13 requests' goals — `senses` counts sensor checks) read the pair; writing
   `cond: { op: 'sensor' }` would make every request built from the drawer depend on lane J's evaluator and change what
   the `senses` goals count. Every other condition is `cond`.
2. **The block type names added** (IW-000 §7's kept): `garden_say`, `garden_when`, `garden_count_inc`, `garden_trick`,
   `garden_do`, `garden_ask`, `garden_olive` (every `olive:<rung>`, the rung in its extraState), `garden_if_else`,
   `garden_set`, `garden_change`, `garden_sensor` (the legacy sensors), `garden_level`, `garden_logic` (and/or),
   `garden_not`, `garden_number` (not Blockly's `math_number`: that would vendor blocks_compressed.js too),
   `garden_text`, `garden_var`, `garden_read`, `garden_unknown` / `garden_expr` / `garden_expr_val` (opaque carriers).
   The compare field is `OP` = `eq|lt|gt` (the contract's ids, not IW-000's `EQ|LT|GT`).
3. **The phone's drawer is a strip at the workspace's FOOT.** Measured on Blockly 12.3.1: with a horizontal flyout at
   the top (`toolboxPosition: 'start'`), a block dragged out of it was DRAWN one flyout-height away from where Blockly
   connects it (the drag layer and the canvas disagree by the strip's size), so a block let go under `forward` snapped
   above it; at the foot nothing is offset (the touch drive's four clauses, red then green). A side drawer on a 330 px
   workspace left the program ~70 px (the first page-drive run at 390: six IG-006 clauses red).
4. **The steps column is IW-000's `clamp(440px, 50vw, 780px)` from 1200 px up and `clamp(420px, 43vw, 780px)` under it:**
   measured at 1024 × 768, 50vw made the pad wrap under the world and pushed Play below the fold; at 1368, 43vw clipped
   Olive's widest French blocks.
9. **No `highlightBlock`:** the running block is our ink ring over a white halo (one class a tick), not Blockly's glow —
   Zelos paints its glow with an SVG filter, measured costly beside Garden 3D on software GL.
10. **Teach's press appends one block** to the workspace instead of reloading it (a program that is the one on show plus
   one block at the end of a list); anything else from the graph (the fold, Start over, Use them) reloads.
5. **The brain applies to the drawer, not to Teach** (the page records past it; the fold makes the room back): IW-001's
   20-block program at 1368 is now TAUGHT with the pad (its AC5 clause), and the page drive's fetch-and-return dance
   (27 presses) still folds.
6. **The card's example stays a Block List** (a second Blockly for three blocks is heavy; the card is read, not edited).
7. **The chip's words:** the thing's kind word and its number when the world names it (`tulip 2`), never its tile.
8. Drive clauses changed because Blockly changed what they grade: page drive — the 390 AC4 box clause, IG-006 AC1's
   names, IG-006 AC5's cross (now a drag to the drawer), the IG-001 D5 ring pair; IW-001 — AC1's repeat count (the N
   picker), AC4's cross, AC5 (one workspace; the 20 blocks taught; the phone's strip); modes — the AC1 driving ground;
   Olive — the if's word and its body. Spec clauses: cg001 AC1 (three nodes), ig007 overlay (four nodes), cg003Template
   AC4/F6 box CSS, IG-007 AC1 (Garden's outputs 3 → 6), IG-003 AC1–3 (the driving ground), IG-003 AC4 (tile taps also to
   Pick thing).

**Could not verify.** The tablet by touch (Richard's; the drive's touch is Chrome's emulation); the engine running the
new ops (lane J's; merged after); the world drawing `watch` / `picking` (lane D's; the wiring is the last commit alone);
AC4's win on eggs-count (IW-003); a real GPU for the 3D pick (swiftshader); the packaged app loading Blockly offline (the
shell's build; the manifest loads the files from the app's own folder and the spec pins that nothing is fetched).

### Session 2 merge (orchestrator, 2026-09-30, `p108-s2-merge`)

- **AC4 across the join** (`packages/noodl-mcp/tests/p108s2Join.test.ts`, 4/4): "until [basket] is full" and "until count of 🥚
  in [basket] = 4", built as Blockly blocks, translated by this node and run on lane J's engine, fill the basket to 4 in EN
  and FR. Two traps the round-trip gate cannot see because every block carries its engine block as `extraState.src`: the
  same program with **every memo stripped** (a child's fresh drag) still wins, and a child's **edited field beats the memo**
  (`= 4` → `= 3` stops at 3; `is full` → `is empty` ends at once).
- **The watch/picking wiring** (`69105b31b`, source only in lane B's worktree) generated on the merged tree: +24 lines in
  `Workshop/Play/connections.json`; every merged drive (README §6, session 2) ran on it.
- **Seen on the merged deploy:** at 1024 × 768 the drawer takes most of the steps column and the program's right edge is cut
  off (`iw004-ac2-1024-built.png`: "forwar", "turn lef" under ▶). A look item for session 3; not graded by any clause.
