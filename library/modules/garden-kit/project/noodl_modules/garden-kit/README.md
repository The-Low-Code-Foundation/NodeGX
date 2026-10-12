# Garden Kit

Three nodes for Bot Garden (Phase 105, CG-001; Blocks since P108 IW-004). No backend, no network, no image files. The
source is `library/modules/garden-kit/src/blocks.js` and `src/kit.js`; `index.js` is those two files under a banner
(`build.mjs`). Nothing is bundled into it: Blockly is vendored beside it (below).

The rule every node follows: **the kit draws; the engine interprets.** `Block List` does not know what
"repeat" does — it draws the block the palette describes and emits the program as JSON on every edit.
`Garden` does not know what a wall is — it draws the tiles the map names and the robots where the graph
says they are. Which block is running, whether a tulip is watered, where a puddle appeared: all of it
arrives on a port.

## Block List (`garden-kit.BlockList`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Palette | input | object / JSON | The blocks this band may use: `[{ id, kind, icon, label: { en, fr }, hasBody, hasCount, slots }]`. `kind` is `motion`, `action`, `control` or `ask` (the colour); `icon` one of `fwd left right water loop if wall say pick put count owl`; `slots` `[{ key, label, options: [{ value, label }], text?, max? }]`. Empty draws the mockup's eight. |
| Program | input | object / JSON | The program: `[{ id, t, n?, body?, slots? }]`. What the graph sends replaces what is drawn; the node's own emitted text is not read back as a change. |
| Band | input | number | `1` draws icon-first blocks with the word as an 11px caption and never opens a keyboard; `2` draws icon and word. The switch is live: the same elements, restyled. Default 2. |
| Language | input | enum | `en` (default) or `fr`. |
| Running Id | input | string | The id of the block to glow. Empty glows none. |
| Locked | input | boolean | True while a run plays: no edits. Default false. |
| Show Palette | input | boolean | Default true. |
| Show Help | input | boolean | A `?` on every placed block (P106 IG-003). Default false. |
| Motion / Action / Control / Ask Blocks, Running Glow | input | colour | The mockup's colours by default. |
| Program | output | string | The program as JSON text, after every edit. Byte-identical when read back through the Program input. |
| Changed | output | signal | An edit happened. |
| Selected | output | string | The container a palette tap inserts into, or empty. |
| Help Block | output | string | The kind (`t`) of the block whose `?` was tapped. |
| Help | output | signal | A block's `?` was tapped (Help Block is set first). The `?` edits nothing. |

Gestures: tap a palette block to add it (into the selected container, else at the end); drag a block with
a finger, a pen or a mouse to move it (before or after the block under the pointer, into an empty body, or
to the end); a drag that ends outside the list puts the block back; tap a container's header to select it;
tap a simple block or its ✕ to remove it; −/+ on a repeat's count (1–9); a slot on an ask block opens a
picker of the palette's words. Long-press does nothing (the context menu is suppressed).

## Garden (`garden-kit.Garden`) — visual

| Port | Direction | Type | Description |
|---|---|---|---|
| Map | input | object / JSON | `{ rows: ["GGTGGGTH", …], legend: { G: "grass", … } }` or just the rows. Kinds: `grass path water tree rock house bed`. A `bed` draws a dry tulip until a Thing waters it. Ragged rows are padded with grass. |
| Things | input | object / JSON | `[{ kind, x, y, … }]`: `tulip` (`watered`), `puddle`, `letter`, `bowl` (`full`), `label` (`text`). |
| Robots | input | object / JSON | One or two: `{ x, y, d, colour, eyes, hat, name, bump }`. `d` is 0 up, 1 right, 2 down, 3 left. `bump` is a count: raise it once per bump and the robot bumps in place. Two robots on one tile are drawn smaller, offset, never overlapping. |
| Bubble | input | object / JSON | `{ robot, text, style: plain \| olive, ms }`. |
| Step Ms | input | number | How long a glide takes. Default 380. |
| Celebrate | input | signal | The robots hop for a moment. |
| Tile X, Tile Y | output | number | The last tapped tile. |
| Tile Tapped | output | signal | A tile was tapped. |
| Ready | output | signal | The world is on the page. |

A robot is never drawn smaller than 56px, whatever the tile size, so its face (the visor's smaller side —
a robot facing right is rotated, so its visor's height is what is seen as width) reads at 22px or more on
a phone-width 12-column map (the P95 AC9 lesson). Reduced motion stills the puddle pop, the bump, the cheer
and the glides.

## Blocks (`garden-kit.Blocks`) — visual (P108 IW-004)

The program editor on **real Blockly 12**, made for children the way Scratch made it: the Zelos look, the drawer always
open on the workspace's left edge (a tap on a drawer block adds it — into the selected container, else at the end — or
drag it out), a block dragged back onto the drawer is thrown away (no trashcan, no tap-to-delete), a `?` on the DRAWER
blocks only (it opens the block's card), big pickers instead of typing (a keyboard only at 10–12 where the slot allows
it), no context menu but Help and Duplicate, `+ − ⤢` zoom buttons, the running block glowing with an ink ring. It keeps
**Block List's ports** (Palette, Program, Band, Language, Running Id, Locked, Show Palette, Show Help, the colours;
Program, Changed, Selected, Help Block, Help) and adds its own:

| Port | Direction | Type | Description |
|---|---|---|---|
| Words | input | array | The page's `{ key, en, fr }` rows; the `iw4…` keys replace the node's own words. |
| Robot Name | input | string | The `{b}` in the words. |
| Brain Size | input | number | The most blocks the program may hold; the drawer greys out when full and a tap says why. 0: none. |
| Pick | input | object | `{ n, ref }` — the thing tapped on the world while Picking, as a chip REF `{ id?, kind, x, y }`. |
| Blocks | output | number | How many blocks the program holds. |
| Brain Full | output | signal | A block was refused: the brain is full. |
| Picking | output | boolean | A chip was tapped and waits for a thing on the world. |
| Pick Armed | output | signal | Picking just turned on. |
| Watch | output | string | The chips the program uses, as a JSON list of REFs (the world draws them large). |

**Blockly is a view.** Program in and out is the engine program `{ id, t, n?, slots?, body?, else? }` — Blockly JSON never
leaves the node, and a Blockly block's id IS the engine id. The translator (`translate.toBlockly` / `toEngine` on the
node definition) keeps every engine block's own shape in the Blockly block's extraState, so a program goes engine →
Blockly → engine byte for byte (the gate: `packages/noodl-mcp/tests/iw004Blocks.test.ts`, through a real headless
Blockly too). Conditions: a lone legacy sensor block is `slots.sensor` / `slots.arg`; anything else (a thing chip and
its state, `count of`, `level of`, `= < >`, and / or / not, numbers, variables, what Olive read) is `slots.cond`.
Band 7–9's drawer has no value blocks; 10–12's has them wherever the drawer has `until` or `if`.

## What it bundles, and the licences

- **Blockly 12.3.1** (Apache-2.0, Google LLC and the Blockly authors) — `blockly_compressed.js` (967,598 bytes),
  `blockly-msg-fr.js` and `blockly-msg-en.js` (Blockly's own French and English messages), each unmodified from the
  npm package, `LICENSE.txt` beside them. The manifest loads them before `index.js` (FR, then `blockly-msg-keep.js` —
  three lines of ours that keep the French — then EN), from the app's own files, **never from a CDN**; Blockly's media
  option is `data:,`, so nothing is fetched for its cursors or sounds.
- **Nothing external in `index.js`.** Every sprite (the robot, the tulip, the tree, the rock, the house, the letter, the
  bowl) and every block icon is inline SVG written for this kit, ported from the Bot Garden mockup
  (`dev-docs/tasks/phase-78-the-templates/tpl-012-mockups/bot-garden.html`). No font, no image, no audio
  is bundled or fetched at runtime; `index.js` carries no `fetch`, no `http` URL and no `<img>`.
- The kit's code is part of OpenNoodl / NodeGX and carries the repository's licence (GPL-3.0).
- `icon.png` (the library-shelf icon) is game-kit's icon, copied as a placeholder until CG-007 draws the
  garden's own.

Sounds are `game-kit.Sound`'s (synthesised, no files); faces on the profile page are `game-kit.Avatar`'s —
that kit's README carries the DiceBear licences. Bot Garden installs both kits, and only both (D41).
