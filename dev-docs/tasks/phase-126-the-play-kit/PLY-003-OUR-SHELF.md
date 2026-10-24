# PLY-003 — Our shelf: the objects we already have

**Phase:** [126](README.md). **Depends on:** R2 (the licence) and R3 (where the shelf lives).

## What

Extract the generators that already look good (README, "What exists on day one") into standalone modules. Each module
imports only three.js, takes its parameters as one object, and returns a `THREE.Group`. Each one also **names its parts
and declares its settings** in PLY-009's `model` shape. Today's generators do neither: the frigate takes 2 settings,
its shape is constants, and no part is named. First set, in Richard's order:
Minecraft-style people (with looks, animation and the rifle), the castle, the spaceships, the station, asteroids. Then
the derelict, dressed interior pieces and the Gala's dancers (code only; nothing from the Gala's data).

Each entry is a folder: the module, `entry.json` (name, kind `generator`, parameters with their defaults and ranges,
licence, source game, triangle count at the defaults), and `card.png`, the render card: the same three-point light,
front, three-quarter and top, at pixel ratio 2, plus one strip of three random parameter sets (a generator's range is
part of how it looks).

`tools/card.mjs` renders a card headless for any entry, generator or file, so PLY-004 and PLY-006 use the same picture.

## The games keep working

The extraction must not fork the code. Threadspace and the others import from the shelf module afterwards, or the shelf
records the commit it copied from and says so. Do not edit a game a peer has open: Threadspace s4 was uncommitted on
2026-10-22, so check `git status` and mtimes on its folder first.

## Acceptance

- **AC1.** Five entries (people, castle, ships, station, asteroids), each with a card. Richard looks at the cards and
  says which ones look good. The ones he refuses go back or come off, and his words go in this file.
- **AC2.** Each module runs in an empty three.js page with no import from the game it came from (the drive loads it
  alone).
- **AC3.** `npx @nodegx/play add <name>` copies an entry into a project made by PLY-002, and the smoke drive's
  screenshot shows it.
- **AC4.** Every entry's licence is the one R2 ruled. A scan of the shelf for children's names and school details
  returns 0.
