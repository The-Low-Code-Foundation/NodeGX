# IW-004 — Real blocks: Blockly, made for children the way Scratch made it

**Opened 2026-09-29** from README §1.2 and ruling R3: *"Yep 'real' blockly, but like Scratch you can modify the blockly
display and mechanics to make it much easier for kids to use please"*. **Status: ⬜.** Depends on IW-000 (the look,
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

(empty)
