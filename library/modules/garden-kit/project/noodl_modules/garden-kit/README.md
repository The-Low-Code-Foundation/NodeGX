# Garden Kit

Two nodes for Bot Garden (Phase 105, CG-001). No backend, no network, no image files. The source is
`library/modules/garden-kit/src/kit.js`; `index.js` is that file under a banner (`build.mjs`). Nothing is
bundled above it.

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
| Motion / Action / Control / Ask Blocks, Running Glow | input | colour | The mockup's colours by default. |
| Program | output | string | The program as JSON text, after every edit. Byte-identical when read back through the Program input. |
| Changed | output | signal | An edit happened. |
| Selected | output | string | The container a palette tap inserts into, or empty. |

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

A robot is never drawn smaller than 56px, whatever the tile size, so its face reads at 21px or more on a
phone-width 12-column map (the P95 AC9 lesson). Reduced motion stills the puddle pop, the bump, the cheer
and the glides.

## What it bundles, and the licences

- **Nothing external.** Every sprite (the robot, the tulip, the tree, the rock, the house, the letter, the
  bowl) and every block icon is inline SVG written for this kit, ported from the Bot Garden mockup
  (`dev-docs/tasks/phase-78-the-templates/tpl-012-mockups/bot-garden.html`). No font, no image, no audio
  is bundled or fetched at runtime; `index.js` carries no `fetch`, no `http` URL and no `<img>`.
- The kit's code is part of OpenNoodl / NodeGX and carries the repository's licence (GPL-3.0).
- `icon.png` (the library-shelf icon) is game-kit's icon, copied as a placeholder until CG-007 draws the
  garden's own.

Sounds are `game-kit.Sound`'s (synthesised, no files); faces on the profile page are `game-kit.Avatar`'s —
that kit's README carries the DiceBear licences. Bot Garden installs both kits, and only both (D41).
