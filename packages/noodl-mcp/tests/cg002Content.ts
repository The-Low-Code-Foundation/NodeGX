/**
 * CG-002 — the content the engine reads: the request schema and a minimal request
 * list, the hint table, the word table. EN and FR on every string.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What lives here and who owns it
 *
 * - {@link REQUESTS} — the request SCHEMA ({@link GardenRequest}) and a minimal
 *   list: the three D3 requests (tulips/repeat, Biscuit's bowl/if, Sami's
 *   letter/say) plus one per remaining trick (steps, until, when, count, a named
 *   trick), so the engine gate (AC1) covers every trick. CG-006 owns the full
 *   content; it extends this array and the gate proves each entry by running its
 *   reference program to its goal.
 * - {@link HINTS} — every hint key CG-002 §2 names, each with an EN and an FR
 *   written line. Olive (CG-005) may voice a key; the table is the truth. There
 *   is no "tell me" line, by ruling (TPL-012 finding 5). 🔴 The seven lines Olive
 *   may VOICE are read from the shell's rung table (`olive-templates.json`
 *   `hints`), the one source for them (CG-006 s3): the line the page writes and
 *   the line the shell asks Olive to say again cannot drift. Edit them THERE.
 * - {@link WORDS} — the interface, both bands' block labels, the sensors, the
 *   islanders, the rewards. One `Static Data`, mined into `Logic/Translate words`
 *   one line per key.
 *
 * ## The goal is data, never JS
 *
 * A request's goal is a predicate NAME with args (`every_tulip_watered`,
 * `thing_at`, `bowl_has`, `robot_at`, `facing`, `carrying`, `uses`, `handled`,
 * `said`), evaluated by `GOAL_SCRIPT` in `cg002Scripts.ts`. A list means all of
 * them must hold. No function ever sits in this file.
 *
 * ## Contract with the kit (CG-001 §2, in the same words)
 *
 * A map is rows of chars with a legend; a robot is `{ id, x, y, d }` with `d`
 * 0–3 clockwise from up; things are `{ kind, x, y, ... }`; a program is a list of
 * `{ id, t, n?, body?, slots? }` blocks. The kit draws these; the engine owns
 * what they mean.
 *
 * @module noodl-mcp/tests/cg002Content
 */
import * as fs from 'fs';
import * as path from 'path';

export type Lang = 'en' | 'fr';
export type Band = 1 | 2;

/** A bilingual string. */
export interface Bi {
  en: string;
  fr: string;
}

const s = (en: string, fr: string): Bi => ({ en, fr });

// ── The program model (typed here so the content can carry reference programs) ──

/**
 * Every block type the engine knows. The band-1 palette is the first seven; the
 * rest arrive in band 10–12 (TPL-012 §2.2). IG-002 (P106 s2): `fill` fills the
 * robot's can at the pond ahead.
 */
export const BLOCK_TYPES = [
  'fwd', 'left', 'right', 'water', 'fill', 'pick', 'put',
  'say', 'repeat', 'until', 'if', 'when', 'count_inc', 'trick', 'do', 'ask',
  // P108 IW-005 (lane J): the engine's new statements. No palette offers them yet (IW-003 does): band 10-12 stops at ask.
  'go_nearest', 'go_to', 'set', 'change'
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** The sensors a `until` / `if` block may read. `count_is` and `olive_says` take an arg. IG-002: `can_empty`. */
export const SENSORS = ['wall_ahead', 'tulip_ahead', 'bowl_empty', 'basket_full', 'count_is', 'olive_says', 'can_empty'] as const;
export type Sensor = (typeof SENSORS)[number];

/** The events a `when` block may arm. The world fires them (a request's schedule). */
export const EVENTS = ['meow'] as const;

/** The palette a band may use, by block id (CG-001's `Palette` is built from this plus the labels). */
export const BAND_PALETTE: Readonly<Record<Band, ReadonlyArray<BlockType>>> = {
  // P108 IW-003 (s3 base): band 7–9 walks to a thing (README §5's ladder: `go to nearest [tapped thing]` at 7–8); band
  // 10–12 has every block, the variables too. A request's `palette` still narrows it, and the robot's list (below).
  1: ['fwd', 'left', 'right', 'water', 'fill', 'pick', 'put', 'go_nearest', 'go_to'],
  2: [...BLOCK_TYPES]
};

/**
 * One block. `n` is the count of a `repeat`; `body` the children of a container
 * (`repeat`, `until`, `if`, `when`, `trick`); `slots` the block's parameters:
 * `sensor`+`arg` on `until`/`if`, `event` on `when`, `name` on `trick`/`do`,
 * `text` on `say`, and `rung`/`args`/`shape`/`dial` on `ask` (CG-005 §2). A
 * `repeat` whose `slots.n` is `'olive'` takes its count from the last answer.
 */
export interface Block {
  id: number;
  t: BlockType;
  n?: number;
  body?: Block[];
  slots?: Record<string, unknown>;
}

// ── The request schema ──────────────────────────────────────────────────────

/** A goal predicate: a name and its args. A request's goal is one or a list (all must hold). */
export interface Goal {
  name: 'every_tulip_watered' | 'thing_at' | 'bowl_has' | 'robot_at' | 'facing' | 'carrying' | 'uses' | 'handled' | 'said' | 'no_puddle' | 'senses' | 'job_done'
    // P108 IW-003 (lane B): the run bumped into nothing (Biscuit's wall: a fixed walk that crashes into it loses).
    | 'no_bump';
  args?: ReadonlyArray<string | number>;
}

/**
 * A thing on a tile. `watered` on a tulip, `food` on a bowl, `text` on a label, a sign or a note. IG-002 (P106 s2, the
 * shared vocabulary of the s2 brief §4): a `rock` is a mineable rock on a grass tile with `left` stones (a request
 * places 4; `pick` takes one, and at 0 the engine removes it) and blocks a move like a tulip; a `sign` (a post with a
 * board, blocks a move) and a `note` (paper on the ground, does not block) carry `text` in the request's language, which
 * the kit never draws on the tile. The map's `R` tile stays a decorative rock that yields nothing.
 */
export interface Thing {
  kind:
    | 'tulip' | 'bowl' | 'letter' | 'egg' | 'stone' | 'food' | 'label' | 'puddle' | 'rock' | 'sign' | 'note'
    // P108 IW-003 (s3 base): the job kinds (JOB_VOCABULARY) and the ball, so a request states them without a cast.
    | 'site' | 'basket' | 'store' | 'can' | 'hen' | 'postbox' | 'door' | 'ball';
  x: number;
  y: number;
  watered?: boolean;
  food?: number;
  text?: string;
  left?: number;
  /** P108 IW-003: the job fields (IW-002 §6) — an id to name it in `job.targets` / `seeded`, meters, containers, owners. */
  id?: string;
  have?: number;
  need?: number;
  count?: number;
  capacity?: number;
  item?: string;
  level?: number;
  max?: number;
  owner?: string;
  to?: string;
  color?: string;
  build?: string;
  pen?: ReadonlyArray<number>;
}

/**
 * One request: an islander asking for help. `band` is the LOWEST band it is
 * offered to; the gate runs it at every band from there up. `tricks` names the
 * trick(s) it teaches (TPL-012 §2.3's numbers, 1–7). `map` is rows of chars
 * (`G` grass, `P` path, `W` water, `R` rock, `T` tree, `H` house, `F` a tulip's
 * tile, `B` the post box's tile); `things` sit on tiles; `robotStart` is
 * `{ x, y, d, carry? }`; `schedule` is the events the world fires, by tick;
 * `palette` is the block ids offered; `referenceProgram` reaches `goal` (the
 * gate proves it); `copyKeys` name the word-table keys the card shows —
 * `gift` is the reward line that names the islander it came from (CG-006 AC4).
 * P106 IG-004 (R1 + R9): `plot` is the island tile where the request's 8×6
 * map's top-left sits — the request IS that plot of the island (ISLAND_BASE).
 */
export interface GardenRequest {
  id: string;
  islander: 'sami' | 'mamie' | 'biscuit';
  band: Band;
  plot: { x: number; y: number };
  tricks: ReadonlyArray<number>;
  map: ReadonlyArray<string>;
  things: ReadonlyArray<Thing>;
  /**
   * IG-002: `can` is the robot's can at the start — a number (0 on a request with a pond to fetch from) or absent/null
   * (no can: water is free, as before IG-002); `canMax` is what `fill` fills it to (default 3, IG-005 upgrades it).
   */
  robotStart: { x: number; y: number; d: number; carry?: ReadonlyArray<string>; basket?: number; can?: number | null; canMax?: number };
  schedule?: ReadonlyArray<{ tick: number; event: string }>;
  goal: Goal | ReadonlyArray<Goal>;
  palette: ReadonlyArray<BlockType>;
  /**
   * The Olive rungs this request offers as `ask:<rung>` blocks (ids of `olive-templates.json`), band 10-12 requests only
   * (Richard's ruling 4, 2026-09-28: Olive's lessons are band 10-12; band 7-9 keeps the owl's hints and offers no rung).
   * CG-005 s3: each rung sits with the islander §3 frames it with and the trick it fits; the rest are free play's.
   */
  rungs?: ReadonlyArray<string>;
  /** P106 IG-003 (R5): an islander's challenge — `predict`: before Play, tap where the robot will stop (band 10–12 only). */
  challenge?: 'predict';
  /** P106 IG-005 (R8): the robot kind this request needs (default `pip`); its plot is padlocked until that robot is owned. */
  needs?: RobotKind;
  reward: { kind: 'hat' | 'sticker' | 'seed' | 'item' | 'robot'; id: string; from: 'sami' | 'mamie' | 'biscuit' };
  copyKeys: { title: string; blurb: string; line: string; reward: string; gift: string };
  referenceProgram: ReadonlyArray<Block>;
  /** P108 IW-002: the finish line — target thing ids (or `[x, y]` tiles; the engine mints `t<n>`), and the robot's home tile. */
  job?: JobSpec;
  /** P108 IW-002: a layout laid from the world's seed (a wall's column, eggs on some of these tiles). */
  seeded?: SeededSpec;
}

let nextId = 1;
const blk = (t: BlockType, extra: Partial<Block> = {}): Block => ({ id: nextId++, t, ...extra });
const b1 = (...types: BlockType[]) => types.map((t) => blk(t));

/**
 * The request list (CG-006 §2): the three D3 requests, one per remaining trick,
 * and the two band 7–9 extras (1b the tulip by the door, 2b the path stones),
 * so every §2 row is an entry and AC1 covers all seven tricks and `say`.
 * Four open at band 7–9 (path-postbox, tulip-door, tulips-three, path-stones);
 * the rest need a control block and open at band 10–12.
 */
export const REQUESTS: ReadonlyArray<GardenRequest> = [
  {
    // P108 IW-003 (lane P): a job. The source is the post box (a letter waits in it for Sami), the carrier Pip's hands,
    // the target Sami's door at the end of the path (a door, capacity 1: the letter through it is the finish line), then
    // home. Still a sequence (trick 1): walk, turn, pick, turn, walk, put — ten blocks, no loop.
    id: 'path-postbox',
    islander: 'sami',
    band: 1,
    plot: { x: 1, y: 8 },
    tricks: [1],
    map: ['GGTGGGTG', 'GGGGGGGG', 'GGGGGGGH', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'postbox', id: 'postbox', x: 2, y: 2 },
      { kind: 'letter', id: 'letter', x: 2, y: 2, to: 'Sami' },
      { kind: 'door', id: 'door-sami', x: 7, y: 3, owner: 'Sami', count: 0, capacity: 1 }
    ],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: { name: 'job_done' },
    palette: ['fwd', 'left', 'right', 'pick', 'put'],
    reward: { kind: 'hat', id: 'cap', from: 'sami' },
    copyKeys: { title: 'rqPathTitle', blurb: 'rqPathBlurb', line: 'rqPathLine', reward: 'hatCap', gift: 'giftCap' },
    referenceProgram: b1('fwd', 'fwd', 'left', 'pick', 'right', 'fwd', 'fwd', 'fwd', 'fwd', 'put'),
    job: { targets: ['door-sami'], home: { x: 0, y: 3, d: 1 } }
  },
  {
    // CG-006 §2 row 1b: steps in order. P108 IW-003 (lane M): a job, and the watering can folded in (IW-003 §4, "the
    // watering can"): the can lies on the plot beside Pip, EMPTY; Pip picks it up, turns to the well (3,2) and fills it,
    // turns and walks to the tulip under Mamie's door (6,1; her house at 6,0 — off the plot's edge, so its meter is
    // whole), which wants three drinks (a meter, 0/3). The tulip full is the finish line: Pip walks home to where he
    // started. Source the well, carrier the can, target the tulip.
    id: 'tulip-door',
    islander: 'mamie',
    band: 1,
    plot: { x: 1, y: 1 },
    tricks: [1],
    map: ['GGTGGGHT', 'GGGGGGFG', 'GGGWGGGG', 'PPPPPPPP', 'GGGGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'tulip', id: 'tulip', x: 6, y: 1, watered: false, have: 0, need: 3 },
      { kind: 'can', id: 'can', x: 2, y: 1, level: 0, max: 3 }
    ],
    robotStart: { x: 3, y: 1, d: 3 },
    goal: [{ name: 'job_done' }, { name: 'no_puddle' }],
    palette: ['fwd', 'left', 'right', 'pick', 'fill', 'water'],
    reward: { kind: 'sticker', id: 'tulip', from: 'mamie' },
    copyKeys: { title: 'rqDoorTitle', blurb: 'rqDoorBlurb', line: 'rqDoorLine', reward: 'stickerTulip', gift: 'giftTulip' },
    referenceProgram: b1('pick', 'left', 'fill', 'left', 'fwd', 'fwd', 'water', 'water', 'water'),
    job: { targets: ['tulip'], home: { x: 3, y: 1, d: 3 } }
  },
  {
    // IG-002 (P106 s2, ruling R3): fetch and return. The pond is the left edge (x 0, rows 1–4), the three tulips stand in
    // the bed at x 3, and the robot starts at (1,1) facing the pond with an EMPTY can of three in its hand. P108 IW-003
    // (lane M): each tulip wants THREE drinks (a meter, 0/3), so the can's three is one tulip's worth: each pass fills
    // the can, turns round, walks to a tulip, pours all three (a repeat of its own), steps down a row and walks back to
    // the pond. The recorded dance is eleven presses a pass; the fold finds the pass ×3 and the pours ×3, in either
    // order (the fold compares a repeat by its shape). All three full is the finish line: Pip walks home to (1,1).
    // The tulips stay first in `things` (the engine gate's watered-world helper).
    id: 'tulips-three',
    islander: 'mamie',
    band: 1,
    plot: { x: 10, y: 1 },
    tricks: [2],
    map: ['GGTGGGTH', 'WGGFGGGG', 'WGGFGGGG', 'WGGFPPPP', 'WGGGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'tulip', id: 't1', x: 3, y: 1, watered: false, have: 0, need: 3 },
      { kind: 'tulip', id: 't2', x: 3, y: 2, watered: false, have: 0, need: 3 },
      { kind: 'tulip', id: 't3', x: 3, y: 3, watered: false, have: 0, need: 3 }
    ],
    robotStart: { x: 1, y: 1, d: 3, can: 0, canMax: 3 },
    goal: { name: 'job_done' },
    palette: ['fwd', 'left', 'right', 'water', 'fill', 'repeat'],
    challenge: 'predict',
    reward: { kind: 'hat', id: 'sun', from: 'mamie' },
    copyKeys: { title: 'rqTulipsTitle', blurb: 'rqTulipsBlurb', line: 'rqTulipsLine', reward: 'hatSun', gift: 'giftSun' },
    referenceProgram: [blk('repeat', { n: 3, body: [...b1('fill', 'left', 'left', 'fwd'), blk('repeat', { n: 3, body: b1('water') }), ...b1('right', 'fwd', 'right', 'fwd')] })],
    job: { targets: ['t1', 't2', 't3'], home: { x: 1, y: 1, d: 3 } }
  },
  {
    // CG-006 §2 row 2b, rewritten by IG-002 (R3), then by P108 IW-003 (lane S) as a JOB: four squares of dirt at (3..6, 3)
    // between Sami's path and the post box, four stones each (dirt → gravel → cobbles → path); two rocks of eight are the
    // source, Cobble's hod of four the carrier. Each trip fills one square: go to the nearest rock, pick four, go to the
    // nearest square that is not path yet, put four — four trips, a repeat. The rocks lie somewhere new each day (seeded):
    // a walk taught on one day misses the rock the next, go to nearest finds it. The path reaches the post box → Cobble
    // walks home; the busiest square loses a stone (wear) and Cobble goes back.
    id: 'path-stones',
    islander: 'sami',
    band: 1,
    plot: { x: 10, y: 8 },
    tricks: [2],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPGGGGB', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'site', id: 's1', x: 3, y: 3, have: 0, need: 4, item: 'stone' },
      { kind: 'site', id: 's2', x: 4, y: 3, have: 0, need: 4, item: 'stone' },
      { kind: 'site', id: 's3', x: 5, y: 3, have: 0, need: 4, item: 'stone' },
      { kind: 'site', id: 's4', x: 6, y: 3, have: 0, need: 4, item: 'stone' },
      { kind: 'rock', id: 'r1', x: 1, y: 1, left: 8, max: 8 },
      { kind: 'rock', id: 'r2', x: 5, y: 1, left: 8, max: 8 }
    ],
    robotStart: { x: 2, y: 3, d: 1, basket: 4 },
    goal: { name: 'job_done' },
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'repeat', 'go_nearest'],
    needs: 'cobble',
    reward: { kind: 'seed', id: 'seeds', from: 'sami' },
    copyKeys: { title: 'rqStonesTitle', blurb: 'rqStonesBlurb', line: 'rqStonesLine', reward: 'seeds', gift: 'giftSeeds' },
    job: { targets: ['s1', 's2', 's3', 's4'], home: { x: 2, y: 3, d: 1 } },
    seeded: { place: [{ thing: 'r1', among: [[1, 1], [2, 1], [0, 2]] }, { thing: 'r2', among: [[5, 1], [6, 2], [4, 5], [6, 1]] }] },
    referenceProgram: [
      blk('repeat', {
        n: 4,
        body: [blk('go_nearest', { slots: { kind: 'rock' } }), blk('repeat', { n: 4, body: b1('pick') }), blk('go_nearest', { slots: { kind: 'site' } }), blk('repeat', { n: 4, body: b1('put') })]
      })
    ]
  },
  {
    // P108 IW-003 (lane B): Biscuit's bowls as a job. The food sack (a store of food, 0,2) is the source, Cobble's hands
    // the carrier, three bowls of one helping each the targets; Biscuit has eaten from two of them (which two: the seed),
    // so Cobble takes two from the sack and walks the row, putting only where the bowl is empty. On the island a bowl
    // empties as he eats (WEAR.bowl) and the robot goes back. The if keeps its meaning: a fixed walk that puts in the
    // bowls that were empty yesterday puts in a full one today (refused: "It's full!"), and the goal asks for the if.
    id: 'bowl-if',
    islander: 'biscuit',
    band: 2,
    plot: { x: 1, y: 15 },
    tricks: [4],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'store', id: 'sack', x: 0, y: 2, item: 'food', count: 99 },
      { kind: 'bowl', id: 'b1', x: 2, y: 2, food: 0, capacity: 1 },
      { kind: 'bowl', id: 'b2', x: 4, y: 2, food: 0, capacity: 1 },
      { kind: 'bowl', id: 'b3', x: 6, y: 2, food: 0, capacity: 1 }
    ],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: [{ name: 'job_done' }, { name: 'uses', args: ['if', 1] }],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'repeat', 'if'],
    needs: 'cobble',
    rungs: ['is-it-a'],
    reward: { kind: 'hat', id: 'crown', from: 'biscuit' },
    copyKeys: { title: 'rqBowlTitle', blurb: 'rqBowlBlurb', line: 'rqBowlLine', reward: 'hatCrown', gift: 'giftCrown' },
    job: { targets: ['b1', 'b2', 'b3'], home: { x: 0, y: 3, d: 1 } },
    seeded: { shuffle: { things: ['b1', 'b2', 'b3'], field: 'food', values: [0, 0, 1] } },
    referenceProgram: [
      blk('left'),
      blk('pick'),
      blk('pick'),
      blk('right'),
      blk('repeat', {
        n: 3,
        body: [blk('fwd'), blk('fwd'), blk('left'), blk('if', { slots: { sensor: 'bowl_empty' }, body: [blk('put')] }), blk('right')]
      })
    ]
  },
  {
    // P108 IW-003 (lane P): the post box (Sami's letter in it) → Pocket's satchel → Sami's door, and something kind said
    // there (carry + say, trick 1). The finish line: the letter through the door, the words said, then home.
    id: 'letter-say',
    islander: 'sami',
    band: 2,
    plot: { x: 19, y: 8 },
    tricks: [1],
    map: ['GGTGGGTG', 'GGGGGGGG', 'GGGGGGGH', 'PPPPPPPP', 'GGWWGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'postbox', id: 'postbox', x: 1, y: 4 },
      { kind: 'letter', id: 'letter', x: 1, y: 4, to: 'Sami' },
      { kind: 'door', id: 'door-sami', x: 7, y: 3, owner: 'Sami', count: 0, capacity: 1 }
    ],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: [{ name: 'job_done' }, { name: 'said', args: [1] }],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'say', 'repeat'],
    needs: 'pocket',
    rungs: ['say-thanks'],
    reward: { kind: 'sticker', id: 'letter', from: 'sami' },
    copyKeys: { title: 'rqLetterTitle', blurb: 'rqLetterBlurb', line: 'rqLetterLine', reward: 'stickerLetter', gift: 'giftLetter' },
    referenceProgram: [blk('fwd'), blk('right'), blk('pick'), blk('left'), blk('repeat', { n: 5, body: b1('fwd') }), blk('put'), blk('say', { slots: { text: 'thanksSami' } })],
    job: { targets: ['door-sami'], home: { x: 0, y: 3, d: 1 } }
  },
  {
    // P108 IW-003 (lane B): a real wall, and Biscuit's ball. The wall (L) stands on the path at a column the seed picks
    // (5–7); the ball has rolled into the corner by it (byWall: the tile before the wall, one row up). Pip walks until the
    // wall is ahead, picks the ball, turns back and walks until his basket (0,3) is ahead, and puts it in. The goal asks
    // for no bump: a fixed repeat 7 walks into the wall on every seed, a fixed repeat 4 fits one wall of three.
    id: 'wall-until',
    islander: 'biscuit',
    band: 2,
    plot: { x: 10, y: 15 },
    tricks: [3],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'basket', id: 'bed', x: 0, y: 3, item: 'ball', count: 0, capacity: 1 },
      { kind: 'ball', id: 'ball', x: 4, y: 2 }
    ],
    robotStart: { x: 1, y: 3, d: 1 },
    goal: [{ name: 'job_done' }, { name: 'no_bump' }, { name: 'uses', args: ['until', 1] }],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'until'],
    reward: { kind: 'sticker', id: 'paw', from: 'biscuit' },
    copyKeys: { title: 'rqWallTitle', blurb: 'rqWallBlurb', line: 'rqWallLine', reward: 'stickerPaw', gift: 'giftPaw' },
    job: { targets: ['bed'], home: { x: 1, y: 3, d: 1 } },
    seeded: { wallAt: [5, 7], byWall: [{ thing: 'ball', dx: -1, dy: -1, spotOn: 'bed' }] },
    referenceProgram: [
      blk('until', { slots: { sensor: 'wall_ahead' }, body: [blk('fwd')] }),
      blk('left'),
      blk('pick'),
      blk('left'),
      blk('until', { slots: { sensor: 'wall_ahead' }, body: [blk('fwd')] }),
      blk('put')
    ]
  },
  {
    // P108 IW-003 (lane B): Biscuit's treats. The treat jar (a store of food, 1,2) is the source, Pip's hands the carrier,
    // Biscuit's bowl (2,3, two treats) the target. Nobody knows when he meows (the schedule: ticks 1 and 8); each time,
    // Pip turns to the jar, takes one treat, turns back to the bowl and puts it in. Home is where he stands.
    id: 'meow-when',
    islander: 'biscuit',
    band: 2,
    plot: { x: 19, y: 15 },
    tricks: [5],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'store', id: 'jar', x: 1, y: 2, item: 'food', count: 99 },
      { kind: 'bowl', id: 'bowl', x: 2, y: 3, food: 0, capacity: 2 }
    ],
    robotStart: { x: 1, y: 3, d: 1 },
    schedule: [{ tick: 1, event: 'meow' }, { tick: 8, event: 'meow' }],
    goal: [{ name: 'job_done' }, { name: 'handled', args: ['meow', 2] }],
    palette: ['left', 'right', 'pick', 'put', 'when'],
    reward: { kind: 'item', id: 'bell', from: 'biscuit' },
    copyKeys: { title: 'rqMeowTitle', blurb: 'rqMeowBlurb', line: 'rqMeowLine', reward: 'itemBell', gift: 'giftBell' },
    job: { targets: ['bowl'], home: { x: 1, y: 3, d: 1 } },
    referenceProgram: [blk('when', { slots: { event: 'meow' }, body: [blk('left'), blk('pick'), blk('right'), blk('put')] })]
  },
  {
    // P108 IW-003 (lane M): the eggs as a job. The hen lays in her pen (x 0..3, y 0..2; she sits at 0,2 — the Workshop's
    // mode badge covers the world's top-left tile) on four tiles
    // the day's seed picks; Pocket carries one egg at a time to Mamie's basket under her door (6,1), which holds four. The
    // basket already has an egg or two from yesterday (the seed chooses 0, 1 or 2), so the count is the lesson: a fixed
    // `repeat 2` fits one morning and not the next, and `until [count of eggs in the basket] = 4` fits every one (IW-004
    // AC4's program). The basket full is the finish line: Pocket walks home. Wear: Mamie takes an egg for breakfast.
    id: 'eggs-count',
    islander: 'mamie',
    band: 2,
    plot: { x: 19, y: 1 },
    tricks: [6],
    map: ['GGGGGGHT', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'hen', id: 'hen', x: 0, y: 2, pen: [0, 0, 3, 2] },
      { kind: 'basket', id: 'basket', x: 6, y: 1, count: 0, capacity: 4, item: 'egg' }
    ],
    robotStart: { x: 5, y: 1, d: 3, basket: 6 },
    // The basket full and Pocket home is the whole win: a `repeat N` that fits the day wins that day (the lesson is that
    // it does not fit the next one — the gate's near-miss row), so no goal asks for the until by name.
    goal: [{ name: 'job_done' }],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'until', 'go_nearest', 'go_to'],
    needs: 'pocket',
    reward: { kind: 'item', id: 'basket', from: 'mamie' },
    copyKeys: { title: 'rqEggsTitle', blurb: 'rqEggsBlurb', line: 'rqEggsLine', reward: 'itemBasket', gift: 'giftBasket' },
    referenceProgram: [
      blk('until', {
        slots: { cond: { op: 'cmp', cmp: 'eq', a: { op: 'count', what: 'egg', thing: { id: 'basket', kind: 'basket', x: 6, y: 1 } }, b: { op: 'num', n: 4 } } },
        body: [blk('go_nearest', { slots: { kind: 'egg' } }), blk('pick'), blk('go_to', { slots: { thing: { id: 'basket', kind: 'basket', x: 6, y: 1 } } }), blk('put')]
      })
    ],
    job: { targets: ['basket'], home: { x: 5, y: 1, d: 3 } },
    seeded: {
      eggs: { count: 4, among: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2]] },
      // 0, 1 or 2 from yesterday, three times over: a day is one in three of each, and the gate's seeds lay all three
      // (their fifth draws, after the four eggs, fall at 0.97, 0.88, 0.76: two on seed 1, one on 2, none on 3).
      choose: [{ thing: 'basket', field: 'count', among: [0, 1, 2, 0, 1, 2, 0, 1, 2] }]
    }
  },
  {
    // P108 IW-003 (lane M): the named trick with a can. Two ponds on the path (0,3) and (5,3); Pip starts facing the
    // left one with an empty can of three. The trick "row" fills the can, turns round and waters the three tulips on
    // one side of the path, one drink each, ending at the other pond — so the same trick, used again from there, waters
    // the other row. Both rows full is the finish line (Pip is already home, facing the pond he started at).
    id: 'rows-trick',
    islander: 'mamie',
    band: 2,
    plot: { x: 28, y: 1 },
    tricks: [7],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGFFFGGG', 'WPPPPWGG', 'GFFFGGGG', 'GGGGGTGG'],
    things: [
      { kind: 'tulip', id: 'a1', x: 2, y: 2, watered: false, have: 0, need: 1 },
      { kind: 'tulip', id: 'a2', x: 3, y: 2, watered: false, have: 0, need: 1 },
      { kind: 'tulip', id: 'a3', x: 4, y: 2, watered: false, have: 0, need: 1 },
      { kind: 'tulip', id: 'b1', x: 3, y: 4, watered: false, have: 0, need: 1 },
      { kind: 'tulip', id: 'b2', x: 2, y: 4, watered: false, have: 0, need: 1 },
      { kind: 'tulip', id: 'b3', x: 1, y: 4, watered: false, have: 0, need: 1 }
    ],
    robotStart: { x: 1, y: 3, d: 3, can: 0, canMax: 3 },
    goal: [{ name: 'job_done' }, { name: 'uses', args: ['do', 2] }],
    palette: ['fwd', 'left', 'right', 'water', 'fill', 'repeat', 'trick', 'do'],
    reward: { kind: 'item', id: 'gnome', from: 'mamie' },
    copyKeys: { title: 'rqRowsTitle', blurb: 'rqRowsBlurb', line: 'rqRowsLine', reward: 'itemGnome', gift: 'giftGnome' },
    referenceProgram: [
      // Turned round by two lefts, not two rights: "right, right, forward, left, water, right …" holds "right, forward,
      // left, water" three times from its second block, and the fold nudge would offer that rotation (lane F's rule).
      blk('trick', { slots: { name: 'row' }, body: [blk('fill'), blk('left'), blk('left'), blk('repeat', { n: 3, body: b1('fwd', 'left', 'water', 'right') })] }),
      blk('do', { slots: { name: 'row' } }),
      blk('do', { slots: { name: 'row' } })
    ],
    job: { targets: ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'], home: { x: 1, y: 3, d: 3 } }
  },
  // ── P108 IW-003 (lane S): Sami's bench — Cobble's first build (a site with build: 'bench', need 8), slot (46, 8) (R6) ──
  SAMI_BENCH(),
  // ── P106 IG-006 (lane C): three requests that carry Olive's three blocks, band 10–12, Pip (appended; IG-005's Echo later).
  ...IG006_REQUESTS()
];

/** The ids, for the gate and the island page. */
export const REQUEST_IDS: ReadonlyArray<string> = REQUESTS.map((r) => r.id);

// ── The Olive rungs, as requests (CG-006 §3) ────────────────────────────────

/**
 * One rung of the Olive ladder (TPL-012 §2.6) framed as a request: who asks,
 * which block, what the child sees happen. `mark` is §3's column (`grad` = 🎓:
 * Olive fails on purpose and the child fixes it with a program). `examColumn`
 * is what the exam's probes for this rung are designed on — it differs from
 * `mark` where the lesson is about Olive being MOSTLY right (rung 6: the probes
 * are green, the 🎓 is the majority vote) or where one rung has a green and a
 * red half (8: 2+3 and 14+9; 11: FR→EN and EN→FR). `table` names the entries
 * of the shell's rung table (`garden-desktop/shell/olive-templates.json`),
 * `probes` the exam's probe ids (`shell/exam.js`). Graded only as data this
 * session: the interpreter's shape consumption is CG-005's.
 *
 * Richard's rulings of 2026-09-28 (CG-006 §8): rung 9's rule is G1 "never use
 * the letter e" (she breaks it 3/3 EN and FR on CPU and Metal; "under 5 words"
 * was obeyed 6/6 and G2 "never mention water" kept 3/3); every rung is band
 * 10–12 (band 7–9 keeps the owl's hints, game-chosen, and offers no rung — the
 * page's gate reads the band from the rung TABLE, so `band` here must equal the
 * table's, which the gate asserts). Rungs 13–18 are CG-006 §4's moments E3 E4
 * E5 E8 E9 E10, promoted on the readings of §7.1; their title and line are the
 * moment's own word keys (`mo3Title` …). `examColumn: 'mixed'` (rung 17, E9) is
 * offered when her answers DISAGREE (`verdict: 'mixed'` in the table).
 */
export interface OliveRung {
  n: number;
  mark: 'green' | 'grad';
  examColumn: 'green' | 'grad' | 'both' | 'mixed';
  islander: 'sami' | 'mamie' | 'biscuit' | null;
  /** The band it is offered to: 2 (10–12) for every rung, by Richard's ruling 4 (2026-09-28). Equal to the table's. */
  band: Band;
  /** The block the child places; null for rung 10 (canned questions, no block). */
  block: 'say' | 'ask' | 'if' | null;
  /** The shape card (CG-005 §2 / the rung table's `shapes`); null where the block has none. */
  shape: 'sentence' | 'one_word' | 'list_of_3' | 'blocks' | 'one_of' | 'yes_no' | 'integer' | 'two_lines' | null;
  table: ReadonlyArray<string>;
  probes: ReadonlyArray<string>;
  copyKeys: { title: string; line: string; lesson: string; hint: string };
  /** The §4 moment a rung 13–18 was promoted from. */
  moment?: 'E3' | 'E4' | 'E5' | 'E8' | 'E9' | 'E10';
}

const rungKeys = (n: number) => ({ title: 'or' + n + 'Title', line: 'or' + n + 'Line', lesson: 'or' + n + 'Lesson', hint: 'oliveRung' + n });

/** A promoted moment's card: the moment's own title and line, the rung's lesson and after-run hint. */
const momentKeys = (n: number, e: number) => ({ title: 'mo' + e + 'Title', line: 'mo' + e + 'Line', lesson: 'or' + n + 'Lesson', hint: 'oliveRung' + n });

export const OLIVE_RUNGS: ReadonlyArray<OliveRung> = [
  // P106 IG-006 (R6): the ladder is three blocks — say, read, is it a…? — each on a column the model passes. The other
  // rungs left the palette; five survive as Olive's lessons on Skills (cg005Olive.ts OLIVE_LESSON_IDS, R7).
  { n: 1, mark: 'green', examColumn: 'green', islander: 'sami', band: 2, block: 'say', shape: 'sentence', table: ['say-thanks'], probes: ['P01', 'P02'], copyKeys: { title: 'rungSayThanks', line: 'cdOliveSay', lesson: 'or1Lesson', hint: 'oliveRung1' } },
  { n: 2, mark: 'green', examColumn: 'green', islander: 'mamie', band: 2, block: 'ask', shape: 'one_of', table: ['read'], probes: ['RD1-fr', 'RD2-fr', 'RD3-fr', 'RD1-en', 'RD2-en', 'RD3-en'], copyKeys: { title: 'rungRead', line: 'cdOliveRead', lesson: 'lsRead', hint: 'oliveRung2' } },
  { n: 3, mark: 'grad', examColumn: 'green', islander: 'sami', band: 2, block: 'if', shape: 'yes_no', table: ['is-it-a'], probes: ['IA1-fr', 'IA2-fr', 'IA3-fr', 'IA4-fr', 'IA5-fr', 'IA6-fr', 'IA1-en', 'IA2-en', 'IA3-en', 'IA4-en', 'IA5-en', 'IA6-en'], copyKeys: { title: 'rungIsItA', line: 'or6Line', lesson: 'or6Lesson', hint: 'oliveRung3' } }
];

// ── The hint table ──────────────────────────────────────────────────────────

/**
 * Keys by state (CG-002 §2): empty program, an unfolded repetition, a goal
 * unmet with the count of what was done, a bump, a puddle, a Predict miss, a
 * done-with-many-blocks, the start, and the Olive keys (thinking, resting, one
 * per rung). `{b}` is the robot's name; `{n}`, `{w}`, `{t}`, `{k}`, `{x}`, `{y}`
 * are filled by the page from `CHOOSE_HINT_SCRIPT`'s `vars`. Never a "tell me".
 */
/** The shell's rung table: the ONE source of the seven hint lines Olive may voice (its `hints`, keyed by `lists.hintKeys`). */
const SHELL_TABLE_PATH = path.join(__dirname, '..', '..', '..', 'dev-docs', 'tasks', 'phase-105-the-coding-garden', 'garden-desktop', 'shell', 'olive-templates.json');
const SHELL_HINTS: Readonly<Record<string, Bi>> = JSON.parse(fs.readFileSync(SHELL_TABLE_PATH, 'utf8')).hints;

/** The keys Olive may voice, in the order the page's table lists them. */
export const VOICED_HINT_KEYS = ['hintStart', 'hintEmpty', 'hintPattern', 'hintMissed', 'hintBump', 'hintWet', 'hintDone'] as const;

/** One voiced line, from the shell's table, as a fresh object (never a shared reference a script could mutate). */
function voiced(key: (typeof VOICED_HINT_KEYS)[number]): Bi {
  const b = SHELL_HINTS[key];
  if (!b || !b.en || !b.fr) throw new Error(`olive-templates.json hints has no ${key} in both languages`);
  return s(b.en, b.fr);
}

export const HINTS: Readonly<Record<string, Bi>> = {
  hintStart: voiced('hintStart'),
  hintEmpty: voiced('hintEmpty'),
  hintPattern: voiced('hintPattern'),
  hintMissed: voiced('hintMissed'),
  // A missed goal with no tulips to count (the path, the stones, the letter): hintMissed's "{w} of {t}" read "0 of 0".
  hintNotYet: s('Not quite yet. Play it with One step and watch each block.', 'Pas tout à fait. Joue-le avec « Un pas » et regarde chaque bloc.'),
  hintBump: voiced('hintBump'),
  hintWet: voiced('hintWet'),
  hintDone: voiced('hintDone'),
  hintDoneMany: s('It works, with {k} blocks. The same steps come back: a repeat could hold them.', 'Ça marche, avec {k} blocs. Les mêmes pas reviennent : un « répéter » pourrait les tenir.'),
  // IG-001 D3 (P106 s1): a win with no more blocks than the request's own reference program. Not voiced: a plain "Perfect!".
  hintPerfect: s('Perfect! Not one block too many.', 'Parfait ! Pas un bloc de trop.'),
  // IG-001 D4: free play has no goal, so a clean run used to fall to "Not quite yet"; this is its own line. Not voiced.
  hintFree: s('{b} did what you said. Try a new idea, or ask an islander.', '{b} a fait ce que tu as dit. Essaie une nouvelle idée, ou va voir un habitant.'),
  // IG-002 (P106 s2): `water` with an empty can pours nothing (the tulip stays dry); a `pick` where a rock was used up.
  // Not voiced (as hintPerfect/hintFree: the shell's hintKeys table is untouched).
  hintDry: s('The can is empty. Where is the pond?', 'L’arrosoir est vide. Où est la mare ?'),
  hintRockGone: s('Nothing left in that rock! {b} has the stones: where do they go?', 'Plus rien dans ce rocher ! {b} a les pierres : où vont-elles ?'),
  hintPredictMiss: s('You tapped one tile, {b} stopped on another. Follow the steps with your finger, one by one.', 'Tu as touché une case, {b} s’est arrêté sur une autre. Suis les pas avec ton doigt, un par un.'),
  // P106 s4: a program not run yet, while just driving — "press Teach and show" read as if the steps were not there.
  hintDriveReady: s('{b} still knows your steps. Press Play to watch them, or Teach to change them.', '{b} connaît toujours tes pas. Appuie sur Jouer pour les regarder, ou sur Apprendre pour les changer.'),
  oliveThinking: s('Olive is thinking…', 'Olive réfléchit…'),
  oliveResting: s('Olive is resting. Here is her written line.', 'Olive se repose. Voici sa phrase écrite.'),
  // P106 IG-006 AC7: after a run, the line names the block Olive was asked — and says she was resting when the written
  // answer stood in. The rungs 4–18 lines left with their rungs.
  oliveRung1: s('Olive said thank you through {b}. Run it twice: she never says it the same way.', 'Olive a dit merci par la voix de {b}. Lance-le deux fois : elle ne le dit jamais pareil.'),
  oliveRung2: s('Olive read the note. Use “if Olive read…” to send {b} to the right row.', 'Olive a lu le mot. Utilise « si Olive a lu… » pour envoyer {b} vers la bonne rangée.'),
  oliveRung3: s('Olive said whether the thing ahead is one. When she is wrong, ask 3 times and count the yeses.', 'Olive a dit si ce qui est devant en est un. Quand elle se trompe, demande 3 fois et compte les oui.'),
  oliveResting1: s('Olive is resting, so {b} used her written thank-you.', 'Olive se repose, alors {b} a pris son merci écrit.'),
  oliveResting2: s('Olive is resting, so {b} used her written answer to “read the note”.', 'Olive se repose, alors {b} a pris sa réponse écrite à « lire le mot ».'),
  oliveResting3: s('Olive is resting, so {b} used her written answer to “is it a…?”.', 'Olive se repose, alors {b} a pris sa réponse écrite à « est-ce un… ? ».'),
  // P108 IW-001 (lane A) F2: a played run stopped by the cap (MAX_TICKS). Not voiced.
  iw1Loop: s('{b} is going round and round — is there a loop that never ends?', '{b} tourne en rond — y a-t-il une boucle qui ne s’arrête jamais ?'),
  // P108 IW-003 (s3 base): the job hints. A run that tried to fill or water with no can in hand; a run that ended with
  // the job part done ({w} of {t} targets full — every mission is a job now, so this replaces "Not quite yet"). Not voiced.
  iw3NoCan: s('{b} needs the can in hand first. Where is it?', '{b} doit d’abord prendre l’arrosoir. Où est-il ?'),
  iw3Job: s('{w} of {t} done. What is still waiting?', '{w} sur {t}, c’est fait. Qu’est-ce qui attend encore ?'),
  // ── P108 IW-003 (lane P): Olive read an envelope — oliveRung2's "if Olive read… the right row" would send a child to the
  // if block; the envelopes teach go to [what Olive read]. Not voiced. ──
  iw3pRead: s('Olive read the name on the envelope. “Go to” what Olive read takes {b} to that door.', 'Olive a lu le nom sur l’enveloppe. « Aller à » ce qu’Olive a lu emmène {b} à cette porte.'),

  // ── P108 IW-003 (lane B): the job is done but not the way it was asked (the goal wants the mission's block). Not voiced.
  iw3bTrick: s('The job is done! Now teach {b} the way the card asks — with its own block.', 'Le travail est fait ! Maintenant, apprends à {b} comme la carte le demande — avec son bloc à elle.')
};

export const HINT_KEYS: ReadonlyArray<string> = Object.keys(HINTS);

// ── The word table ──────────────────────────────────────────────────────────

/**
 * Every string, keyed. Block labels come twice: `b*` is the band 10–12 word,
 * `c*` the band 7–9 caption (short, read as a caption under an icon). `{b}` is
 * the robot's name.
 */
export const WORDS: Readonly<Record<string, Bi>> = {
  brand: s('Olive’s Island', 'L’île d’Olive'),
  navIsland: s('Island', 'Île'),
  navWorkshop: s('Workshop', 'Atelier'),
  navRobot: s('My robots', 'Mes robots'),
  navSkills: s('Skills', 'Astuces'),
  navGrown: s('Grown-ups', 'Parents'),
  navProfiles: s('Profiles', 'Profils'),
  // Band 10–12 block words.
  bFwd: s('forward', 'avancer'),
  bLeft: s('turn left', 'tourner à gauche'),
  bRight: s('turn right', 'tourner à droite'),
  bWater: s('water', 'arroser'),
  bFill: s('fill the can', 'remplir l’arrosoir'),
  bPick: s('pick up', 'ramasser'),
  bPut: s('put down', 'poser'),
  bSay: s('say', 'dire'),
  bRepeat: s('repeat', 'répéter'),
  bTimes: s('times', 'fois'),
  bUntil: s('until', 'jusqu’à'),
  bIf: s('if', 'si'),
  bWhen: s('when', 'quand'),
  bCountInc: s('count +1', 'compter +1'),
  bTrick: s('a trick called', 'une astuce nommée'),
  bDo: s('do', 'faire'),
  bAsk: s('ask Olive', 'demander à Olive'),
  // P108 IW-003 (s3 base): the four statements IW-005 built, named for the palette and the pad.
  bGoNearest: s('go to the nearest', 'aller au plus proche'),
  bGoTo: s('go to', 'aller à'),
  bSet: s('set', 'mettre'),
  bChange: s('change', 'changer'),
  // Band 7–9 captions.
  cFwd: s('go', 'hop'),
  cLeft: s('left', 'gauche'),
  cRight: s('right', 'droite'),
  cWater: s('water', 'eau'),
  cFill: s('fill', 'remplis'),
  cPick: s('take', 'prends'),
  cPut: s('drop', 'pose'),
  cSay: s('say', 'dis'),
  cRepeat: s('again', 'encore'),
  cUntil: s('until', 'jusqu’à'),
  cIf: s('if', 'si'),
  cWhen: s('when', 'quand'),
  cCountInc: s('+1', '+1'),
  cTrick: s('trick', 'astuce'),
  cDo: s('do', 'fais'),
  cAsk: s('Olive', 'Olive'),
  cGoNearest: s('find', 'cherche'),
  cGoTo: s('go to', 'va à'),
  cSet: s('set', 'mets'),
  cChange: s('change', 'change'),
  // Sensors and events.
  sWallAhead: s('the wall is ahead', 'le mur est devant'),
  sTulipAhead: s('a tulip is ahead', 'une tulipe est devant'),
  sBowlEmpty: s('the bowl is empty', 'la gamelle est vide'),
  sBasketFull: s('the basket is full', 'le panier est plein'),
  sCountIs: s('the count is', 'le compte est'),
  sOliveSays: s('Olive says', 'Olive dit'),
  sCanEmpty: s('the can is empty', 'l’arrosoir est vide'),
  eMeow: s('Biscuit meows', 'Biscuit miaule'),
  // Olive shapes and the dial (CG-005 §2).
  shWord: s('a word', 'un mot'),
  shNumber: s('a number', 'un nombre'),
  shYesNo: s('yes or no', 'oui ou non'),
  shOneOf: s('one of…', 'un parmi…'),
  shList3: s('a list of 3', 'une liste de 3'),
  shSentence: s('a sentence', 'une phrase'),
  shCard: s('a card', 'une carte'),
  shBlocks: s('blocks', 'des blocs'),
  dialSame: s('same every time', 'pareil à chaque fois'),
  dialSurprise: s('surprise me', 'surprends-moi'),
  // The workshop.
  teach: s('Teach {b}', 'Apprendre à {b}'),
  teachStop: s('Done teaching', 'Fin de la leçon'),
  play: s('Play', 'Jouer'),
  step: s('One step', 'Un pas'),
  reset: s('Start over', 'Recommencer'),
  predict: s('Predict', 'Prévoir'),
  predictAsk: s('Where will {b} end? Tap a tile.', 'Où {b} va-t-il finir ? Touche une case.'),
  ask: s('Ask Olive', 'Demander à Olive'),
  owlMeta: s('Olive lives on this computer. No internet needed.', 'Olive habite dans cet ordinateur. Pas besoin d’internet.'),
  scriptH: s('{b}’s steps', 'Les pas de {b}'),
  tidyGo: s('Fold it', 'Plier'),
  tidyNo: s('Not now', 'Pas maintenant'),
  tidyFound: s('I spotted the same {len} steps, {n} times in a row.', 'J’ai vu les mêmes {len} pas, {n} fois de suite.'),
  tidyFound1: s('{n} × "{s}" in a row.', '{n} × « {s} » de suite.'),
  blocks: s('{n} blocks', '{n} blocs'),
  block1: s('1 block', '1 bloc'),
  empty: s('No steps yet. Press "Teach {b}" and drive, or tap a block.', 'Pas encore de pas. Appuie sur « Apprendre à {b} » et conduis, ou touche un bloc.'),
  recording: s('{b} is learning…', '{b} apprend…'),
  sayBump: s('Boing!', 'Boing !'),
  saySplash: s('Splash!', 'Splash !'),
  sayDrink: s('Glug glug!', 'Glou glou !'),
  sayPick: s('Got it!', 'Je l’ai !'),
  sayPut: s('There.', 'Voilà.'),
  sayFill: s('Full!', 'Plein !'),
  sayDry: s('Empty…', 'Vide…'),
  thanksSami: s('Post for you, Sami! Have a lovely day.', 'Du courrier pour toi, Sami ! Belle journée !'),
  thanksMamie: s('Dear Mamie Rose, your tulips are drinking and so am I.', 'Chère Mamie Rose, tes tulipes boivent et moi aussi.'),
  thanksBiscuit: s('Biscuit, your bowl is full. Purr away!', 'Biscuit, ta gamelle est pleine. Ronronne !'),
  winFew: s('{k} blocks. Neat!', '{k} blocs. Bien joué !'),
  winMany: s('{k} blocks. It works, and it could be shorter.', '{k} blocs. Ça marche, et ça pourrait être plus court.'),
  winLearn: s('{b} learned: {trick}', '{b} a appris : {trick}'),
  winIsland: s('Back to the island', 'Retour à l’île'),
  winStay: s('Keep tinkering', 'Continuer à bricoler'),
  // The island.
  isEyebrow: s('Your island', 'Ton île'),
  isTitle: s('Who needs a hand today?', 'Qui a besoin d’aide aujourd’hui ?'),
  isSub: s('Every request teaches {b} one new trick. Nothing is timed and nothing runs out. The garden waits for you.', 'Chaque demande apprend une nouvelle astuce à {b}. Rien n’est chronométré, rien ne s’épuise. Le jardin t’attend.'),
  isReq: s('Requests', 'Demandes'),
  isFree: s('Free play', 'Jeu libre'),
  done: s('done', 'fait'),
  sandH: s('{b}’s garden', 'Le jardin de {b}'),
  sandP: s('No request. Plant, build, teach {b} anything.', 'Sans demande. Plante, construis, apprends n’importe quoi à {b}.'),
  // The islanders.
  islSami: s('Sami', 'Sami'),
  islMamie: s('Mamie Rose', 'Mamie Rose'),
  islBiscuit: s('Biscuit', 'Biscuit'),
  // The requests' copy.
  rqPathTitle: s('Bring my letter from the post box', 'Apporte ma lettre depuis la boîte aux lettres'),
  rqPathBlurb: s('Steps in order', 'Des pas dans l’ordre'),
  rqPathLine: s('"A letter is waiting for me in the post box. Can {b} fetch it and bring it to my door?"', '« Une lettre m’attend dans la boîte aux lettres. {b} peut aller la chercher et l’apporter à ma porte ? »'),
  rqTulipsTitle: s('Water my three tulips', 'Arrose mes trois tulipes'),
  rqTulipsBlurb: s('Repeat', 'Répéter'),
  // P108 IW-003 (lane M): the three drinks said in English; the French keeps its line (at 390 × 844 its task card has three
  // pixels to spare before the owl leaves the screen — the page drive's AC4 — and the job card says "3 tulipes × 3 gorgées").
  rqTulipsLine: s('"Three drinks a tulip. Fill the can at the pond, and come back!"', '« Mes tulipes ont soif. Remplis l’arrosoir à la mare, et reviens ! »'),
  rqBowlTitle: s('Feed me, but only if my bowl is empty', 'Nourris-moi, mais seulement si ma gamelle est vide'),
  rqBowlBlurb: s('If', 'Si'),
  rqBowlLine: s('"I eat from my three bowls all day. Take food from the sack and fill only the empty ones, {b}!"', '« Je mange dans mes trois gamelles toute la journée. Prends à manger dans le sac et remplis seulement les vides, {b} ! »'),
  rqLetterTitle: s('Deliver a letter and say something kind', 'Livre une lettre et dis quelque chose de gentil'),
  rqLetterBlurb: s('Say', 'Dire'),
  rqLetterLine: s('"There is post for me in the post box! Bring it to my door, and say something nice when you get there."', '« Il y a du courrier pour moi dans la boîte aux lettres ! Apporte-le à ma porte, et dis quelque chose de gentil en arrivant. »'),
  rqWallTitle: s('Fetch my ball from the wall', 'Rapporte ma balle du mur'),
  rqWallBlurb: s('Repeat until', 'Répéter jusqu’à'),
  rqWallLine: s('"My ball rolled all the way to the wall. Walk until the wall, pick it up and bring it back to my basket — without a bump, {b}!"', '« Ma balle a roulé jusqu’au mur. Avance jusqu’au mur, ramasse-la et rapporte-la dans mon panier — sans te cogner, {b} ! »'),
  rqMeowTitle: s('When I meow, bring me a treat', 'Quand je miaule, apporte-moi une friandise'),
  rqMeowBlurb: s('When', 'Quand'),
  rqMeowLine: s('"Every time I meow, {b} takes one treat from the jar and puts it in my bowl. Miaow!"', '« À chaque miaulement, {b} prend une friandise dans le bocal et la met dans ma gamelle. Miaou ! »'),
  rqEggsTitle: s('Fill my egg basket', 'Remplis mon panier d’œufs'),
  rqEggsBlurb: s('Counting', 'Compter'),
  rqEggsLine: s('"My basket by the door holds four eggs, and there may be one or two in it already. The hen never lays in the same place twice. Can {b} fill it, one egg at a time?"', '« Mon panier près de la porte tient quatre œufs, et il y en a peut-être déjà un ou deux dedans. La poule ne pond jamais deux fois au même endroit. {b} peut le remplir, un œuf à la fois ? »'),
  rqRowsTitle: s('Water both rows the same way', 'Arrose les deux rangées de la même façon'),
  rqRowsBlurb: s('A trick with a name', 'Une astuce avec un nom'),
  rqRowsLine: s('"Two rows of little tulips, and a pond at each end of the path. Teach {b} one trick — fill the can, water a row — and use it twice."', '« Deux rangées de petites tulipes, et une mare à chaque bout du chemin. Apprends une astuce à {b} — remplir l’arrosoir, arroser une rangée — et utilise-la deux fois. »'),
  rqDoorTitle: s('Water the tulip by my door', 'Arrose la tulipe près de ma porte'),
  rqDoorBlurb: s('Steps in order', 'Des pas dans l’ordre'),
  rqDoorLine: s('"The tulip by my door wants three drinks. The watering can is on the grass: can {b} pick it up, fill it at the well and give her a drink?"', '« La tulipe près de ma porte veut trois gorgées. L’arrosoir est dans l’herbe : {b} peut le prendre, le remplir au puits et lui donner à boire ? »'),
  rqStonesTitle: s('Build the path to the post box', 'Construis le chemin jusqu’à la boîte aux lettres'),
  rqStonesBlurb: s('Repeat', 'Répéter'),
  rqStonesLine: s('"Four squares are still dirt. Four stones turn a square into path, and {b}’s hod holds four. The rocks are not always in the same place!"', '« Quatre cases sont encore de la terre. Quatre pierres font d’une case un chemin, et la hotte de {b} en porte quatre. Les rochers ne sont pas toujours au même endroit ! »'),
  // Rewards.
  hatNone: s('None', 'Aucun'),
  hatCap: s('Cap', 'Casquette'),
  hatSun: s('Sunflower hat', 'Chapeau tournesol'),
  hatCrown: s('Crown', 'Couronne'),
  stickerLetter: s('Letter sticker', 'Autocollant lettre'),
  stickerPaw: s('Paw sticker', 'Autocollant patte'),
  stickerTulip: s('Tulip sticker', 'Autocollant tulipe'),
  itemBell: s('Bell', 'Clochette'),
  itemBasket: s('Basket', 'Panier'),
  itemGnome: s('Garden gnome', 'Nain de jardin'),
  seeds: s('Seeds', 'Graines'),
  rewardFrom: s('a gift from {who}', 'un cadeau de {who}'),
  // Each reward names the islander it came from (CG-006 AC4). Cosmetic, never bought.
  giftCap: s('A cap, from Sami', 'Une casquette, offerte par Sami'),
  giftTulip: s('A tulip sticker, from Mamie Rose', 'Un autocollant tulipe, offert par Mamie Rose'),
  giftSun: s('A sunflower hat, from Mamie Rose', 'Un chapeau tournesol, offert par Mamie Rose'),
  giftSeeds: s('A packet of seeds, from Sami', 'Un sachet de graines, offert par Sami'),
  giftPaw: s('A paw sticker, from Biscuit', 'Un autocollant patte, offert par Biscuit'),
  giftCrown: s('A crown, from Biscuit', 'Une couronne, offerte par Biscuit'),
  giftLetter: s('A letter sticker, from Sami', 'Un autocollant lettre, offert par Sami'),
  giftBell: s('A bell, from Biscuit', 'Une clochette, offerte par Biscuit'),
  giftBasket: s('A basket, from Mamie Rose', 'Un panier, offert par Mamie Rose'),
  giftGnome: s('A garden gnome, from Mamie Rose', 'Un nain de jardin, offert par Mamie Rose'),
  // The Olive rungs as requests (CG-006 §3): the card's title, the line, the lesson on the Skills page.
  or1Title: s('Say thank you to Mamie Rose', 'Dis merci à Mamie Rose'),
  or1Line: s('"Can {b} tell Mamie Rose thank you? Twice, please!"', '« {b} peut dire merci à Mamie Rose ? Deux fois, s’il te plaît ! »'),
  or1Lesson: s('Olive never says it the same way twice. She is not a calculator.', 'Olive ne le dit jamais deux fois pareil. Ce n’est pas une calculatrice.'),
  or2Title: s('Name my three new tulips', 'Donne un nom à mes trois nouvelles tulipes'),
  or2Line: s('"Three new tulips, and not one has a name! Ask Olive for three."', '« Trois nouvelles tulipes, et pas une n’a de nom ! Demandes-en trois à Olive. »'),
  or2Lesson: s('The shape card says what comes back: here, a list of three. The dial says how surprising it is.', 'La carte de forme dit ce qui revient : ici, une liste de trois. La molette dit si c’est surprenant.'),
  or3Title: s('My route, in words', 'Mon chemin, en mots'),
  or3Line: s('"I wrote {b}’s route in words. Can Olive turn it into blocks?"', '« J’ai écrit le chemin de {b} avec des mots. Olive peut le changer en blocs ? »'),
  or3Lesson: s('A program is a sentence made exact. Olive suggests, you check, {b} runs it.', 'Un programme, c’est une phrase rendue précise. Olive propose, tu vérifies, {b} le fait.'),
  or4Title: s('Three squares, then water', 'Trois cases, puis arrose'),
  or4Line: s('"Go forward three squares, then water." Ask Olive for the blocks, then try them.', '« Avance de trois cases, puis arrose. » Demande les blocs à Olive, puis essaie-les.'),
  or4Lesson: s('Olive gives one step for three. She cannot count, but a repeat 3 can.', 'Olive donne un seul pas pour trois. Elle ne sait pas compter, mais un « répéter 3 », si.'),
  or5Title: s('What does Biscuit want?', 'Qu’est-ce que Biscuit veut ?'),
  or5Line: s('"Biscuit left me a letter. Ask Olive what Biscuit wants, and let her answer choose the way."', '« Biscuit m’a laissé une lettre. Demande à Olive ce que veut Biscuit, et laisse la réponse d’Olive choisir le chemin. »'),
  or5Lesson: s('Olive’s answer can steer a program: if Olive says kibble, go to the bowl.', 'La réponse d’Olive peut guider un programme : si Olive dit croquettes, va à la gamelle.'),
  or6Title: s('Is it a flower?', 'Est-ce que c’est une fleur ?'),
  or6Line: s('"Is the thing in front of {b} a flower?" Ask Olive before you water it.', '« Ce qu’il y a devant {b}, c’est une fleur ? » Demande à Olive avant d’arroser.'),
  or6Lesson: s('Olive is right most of the time, not every time. Ask three times and count the yeses.', 'Olive a raison presque tout le temps, pas à chaque fois. Demande trois fois et compte les oui.'),
  or7Title: s('How many tulips do I have?', 'Combien j’ai de tulipes ?'),
  or7Line: s('"How many tulips do I have? Ask Olive, then let {b} count them."', '« Combien j’ai de tulipes ? Demande à Olive, puis laisse {b} les compter. »'),
  or7Lesson: s('Olive guesses a number. A program that counts does not guess.', 'Olive devine un nombre. Un programme qui compte ne devine pas.'),
  or8Title: s('Olive’s sums', 'Les additions d’Olive'),
  or8Line: s('Give Olive two sums, a small one and a big one. Who gets both right, Olive or you?', 'Donne deux additions à Olive, une petite et une grande. Qui trouve les deux, Olive ou toi ?'),
  or8Lesson: s('A calculator follows a rule. Olive guesses, and big sums trip her up.', 'Une calculatrice suit une règle. Olive devine, et les grandes additions la font trébucher.'),
  or9Title: s('Olive and the rule', 'Olive et la règle'),
  or9Line: s('Ask Olive to describe a tulip without the letter e, then check it with a program.', 'Demande à Olive de décrire une tulipe sans la lettre e, puis vérifie avec un programme.'),
  or9Lesson: s('Olive does not keep a rule about her own words. A checking program does.', 'Olive ne respecte pas une règle sur ses propres mots. Un programme qui vérifie, si.'),
  or10Title: s('Olive’s tall tales', 'Les histoires à dormir debout d’Olive'),
  or10Line: s('Olive answers questions about the world. Mark each answer true or false, then look it up in a book.', 'Olive répond à des questions sur le monde. Marque chaque réponse vrai ou faux, puis vérifie dans un livre.'),
  or10Lesson: s('Olive sounds sure of herself even when she is wrong. Check before you believe her.', 'Olive a l’air sûre d’elle, même quand elle se trompe. Vérifie avant de la croire.'),
  or11Title: s('Translate my note', 'Traduis mon petit mot'),
  or11Line: s('"My cousin reads French. Can Olive translate Mamie Rose’s note for him?"', '« Mon cousin lit l’anglais. Olive peut lui traduire le petit mot de Mamie Rose ? »'),
  or11Lesson: s('Olive translates French into English well, and the other way round less well. Tools have a good direction.', 'Olive traduit bien du français vers l’anglais, et moins bien dans l’autre sens. Les outils ont un bon sens.'),
  or12Title: s('A poem for my tulip', 'Un poème pour ma tulipe'),
  or12Line: s('Give your tulip a name, and Olive writes her a two-line poem.', 'Donne un nom à ta tulipe, et Olive lui écrit un poème de deux lignes.'),
  or12Lesson: s('A poem for your sticker page. Sometimes silly, always new.', 'Un poème pour ta page d’autocollants. Parfois farfelu, toujours nouveau.'),
  // Rungs 13–18, the promoted moments (their card title and line are the moment's mo*Title / mo*Line below).
  or13Lesson: s('Reading a program is a skill. Olive’s sentence is close, but words to blocks and back loses a little on the way.', 'Lire un programme, ça s’apprend. La phrase d’Olive est proche, mais des mots aux blocs et retour, un peu se perd en chemin.'),
  or14Lesson: s('A run tells a story. The puddle in Olive’s story shows which step to fix.', 'Un trajet raconte une histoire. La flaque dans l’histoire d’Olive montre le pas à corriger.'),
  or15Lesson: s('A good name says what a trick does. Olive suggests one; you decide.', 'Un bon nom dit ce que fait une astuce. Olive en propose un ; c’est toi qui choisis.'),
  or16Lesson: s('Olive cannot put words in order. Sorting is a rule, and a program follows rules.', 'Olive ne sait pas ranger des mots. Ranger, c’est une règle, et un programme suit les règles.'),
  or17Lesson: s('Some of Olive’s answers are true and some are made up, and she sounds just as sure. Check in a book.', 'Certaines réponses d’Olive sont vraies, d’autres inventées, et elle a l’air aussi sûre. Vérifie dans un livre.'),
  or18Lesson: s('Olive writes the words; the request says what is asked. A check makes sure the thing asked for is always there.', 'Olive écrit les mots ; la demande dit ce qui est demandé. Une vérification s’assure que la chose demandée est toujours là.'),
  // The moments worth ring-fencing (CG-006 §4): a card title and its line. E13 is a Grown-ups card.
  mo1Title: s('Olive forgets', 'Olive oublie'),
  mo1Line: s('Ask Olive the name she gave your tulip just before. She has no memory, but {b}’s program does.', 'Demande à Olive le nom qu’elle a donné à ta tulipe tout à l’heure. Elle n’a pas de mémoire, mais le programme de {b}, si.'),
  mo2Title: s('Olive can’t see the garden', 'Olive ne voit pas le jardin'),
  mo2Line: s('Ask Olive which way the tulip is. Then tell her what the row looks like, and ask again.', 'Demande à Olive de quel côté est la tulipe. Puis décris-lui la rangée, et redemande.'),
  mo3Title: s('Explain my program', 'Explique mon programme'),
  mo3Line: s('Olive turns your blocks back into a sentence. Is it what you meant?', 'Olive transforme tes blocs en une phrase. Est-ce bien ce que tu voulais dire ?'),
  mo4Title: s('Olive tells the story of the run', 'Olive raconte le trajet'),
  mo4Line: s('After a run, Olive says what {b} did. A puddle in the story is a clue.', 'Après le trajet, Olive raconte ce que {b} a fait. Une flaque dans l’histoire, c’est un indice.'),
  mo5Title: s('Name my trick', 'Trouve un nom pour mon astuce'),
  mo5Line: s('Olive reads the blocks inside your trick and suggests a name for it.', 'Olive lit les blocs de ton astuce et lui propose un nom.'),
  mo6Title: s('Say it another way', 'Dis-le autrement'),
  mo6Line: s('Ask Olive to say a line more politely, or like a poem. Then ask her to make it shorter, and count the words.', 'Demande à Olive de dire une phrase plus poliment, ou comme un poème. Puis demande-lui de la raccourcir, et compte les mots.'),
  mo7Title: s('A word becomes a sticker', 'Un mot devient un autocollant'),
  mo7Line: s('Olive picks a little picture for a word, for your sticker page.', 'Olive choisit une petite image pour un mot, pour ta page d’autocollants.'),
  mo8Title: s('Put these words in order', 'Range ces mots'),
  mo8Line: s('Ask Olive to put three words in alphabetical order. Then let a program do it.', 'Demande à Olive de ranger trois mots dans l’ordre alphabétique. Puis laisse un programme le faire.'),
  mo9Title: s('Olive’s dictionary', 'Le dictionnaire d’Olive'),
  mo9Line: s('Olive explains a garden word. Some answers are right and some are made up, so check them.', 'Olive explique un mot du jardin. Certaines réponses sont justes, d’autres sont inventées : vérifie-les.'),
  mo10Title: s('Olive writes the letters', 'Olive écrit les lettres'),
  mo10Line: s('Olive writes each islander’s request in her own words, so the island sounds a little different each time. What they ask for never changes.', 'Olive écrit chaque demande avec ses mots à elle, alors l’île sonne un peu différemment à chaque fois. Ce qu’on demande, lui, ne change jamais.'),
  mo11Title: s('Slow blocks', 'Les blocs lents'),
  mo11Line: s('An Olive block inside a repeat thinks on every turn. Ask once, and keep the answer.', 'Un bloc Olive dans un « répéter » réfléchit à chaque tour. Demande une fois, et garde la réponse.'),
  mo12Title: s('Two Olives disagree', 'Deux Olive pas d’accord'),
  mo12Line: s('Ask twice with the dial on "surprise me" and compare. Which answer do you trust?', 'Demande deux fois avec la molette sur « surprends-moi » et compare. À quelle réponse fais-tu confiance ?'),
  mo13Title: s('The fence', 'La clôture'),
  mo13Line: s('In Olive’s exam, the model still answers questions that are not about the garden. That is why a child never types to her freely.', 'Dans l’examen d’Olive, le modèle répond quand même aux questions qui ne parlent pas du jardin. C’est pour ça qu’un enfant ne lui écrit jamais librement.'),
  // My robot.
  rbTitle: s('Make {b} yours', '{b}, à ta façon'),
  rbSub: s('Colours, hats and a name are always free. Hats are gifts from the islanders you helped.', 'Les couleurs, les chapeaux et le nom sont toujours gratuits. Les chapeaux sont des cadeaux des habitants que tu as aidés.'),
  rbName: s('Name', 'Nom'),
  rbColour: s('Colour', 'Couleur'),
  rbEyes: s('Eyes', 'Yeux'),
  eyeRound: s('Round', 'Ronds'),
  eyeHappy: s('Happy', 'Contents'),
  eyeWink: s('Wink', 'Clin d’œil'),
  rbHat: s('Hat', 'Chapeau'),
  rbStickers: s('Stickers on {b}’s shell', 'Autocollants sur la coque de {b}'),
  // Skills.
  ntTitle: s('What {b} can do now', 'Ce que {b} sait faire'),
  ntSub: s('Each trick is a block. A trick blooms the first time you use it to finish a request. There is no score and nothing wilts.', 'Chaque astuce est un bloc. Une astuce fleurit la première fois que tu l’utilises pour finir une demande. Pas de score, rien ne fane.'),
  stBloom: s('Blooming', 'En fleur'),
  stSprout: s('Sprouted', 'Germée'),
  stSeed: s('Seed', 'Graine'),
  n1: s('Steps in order', 'Des pas dans l’ordre'),
  n1p: s('{b} does exactly what you say, one step after another: forward, turn, fill, water, pick, put.', '{b} fait exactement ce que tu dis, un pas après l’autre : avancer, tourner, remplir, arroser, ramasser, poser.'),
  n2: s('Repeat', 'Répéter'),
  n2p: s('Do the same dance several times, without saying it several times.', 'Faire la même danse plusieurs fois, sans la dire plusieurs fois.'),
  n3: s('Repeat until', 'Répéter jusqu’à'),
  n3p: s('Keep going until something is true, like reaching the wall.', 'Continuer jusqu’à ce que quelque chose soit vrai, comme toucher le mur.'),
  n4: s('If', 'Si'),
  n4p: s('Only do it when something is true: water only if a tulip is ahead.', 'Le faire seulement si c’est vrai : arroser seulement s’il y a une tulipe devant.'),
  n5: s('When', 'Quand'),
  n5p: s('Start when something happens: when Biscuit meows, go to the bowl.', 'Démarrer quand quelque chose arrive : quand Biscuit miaule, aller à la gamelle.'),
  n6: s('Counting', 'Compter'),
  n6p: s('{b} keeps a number in mind, like how many eggs are in the basket.', '{b} garde un nombre en tête, comme le nombre d’œufs dans le panier.'),
  n7: s('A trick with a name', 'Une astuce avec un nom'),
  n7p: s('Bundle steps into one new block, like "water a row", and use it anywhere.', 'Regrouper des pas dans un nouveau bloc, comme « arroser une rangée », et l’utiliser partout.'),
  oliveCant: s('Olive can’t do this here yet', 'Olive ne sait pas encore faire ça ici'),
  // Profiles.
  whoIsPlaying: s('Who is playing?', 'Qui joue ?'),
  newProfile: s('New player', 'Nouveau joueur'),
  yourName: s('Your name', 'Ton prénom'),
  yourBand: s('Your age', 'Ton âge'),
  band1: s('7–9', '7–9'),
  band2: s('10–12', '10–12'),
  language: s('Language', 'Langue'),
  robotName: s('Your robot’s name', 'Le nom de ton robot'),
  create: s('Let’s go!', 'C’est parti !'),
  cancel: s('Cancel', 'Annuler'),
  // Grown-ups.
  guTitle: s('Olive, offline', 'Olive, hors ligne'),
  guSub: s('Olive is the helper owl. Her hints come from the game’s own rules. A small language model, stored on this computer, only puts them into friendly words and writes the islanders’ thank-yous.', 'Olive est la chouette qui aide. Ses indices viennent des règles du jeu. Un petit modèle de langage, stocké sur cet ordinateur, ne fait que les formuler gentiment et écrire les mercis des habitants.'),
  guWhereH: s('Where Olive lives', 'Où habite Olive'),
  guNoModel: s('No model at all. The game still works: Olive uses her written lines.', 'Aucun modèle. Le jeu marche quand même : Olive utilise ses phrases écrites.'),
  guRulesH: s('What Olive is allowed to do', 'Ce qu’Olive a le droit de faire'),
  guR1: s('Say a hint in her own words. The hint itself is decided by the game, not by the model.', 'Dire un indice avec ses mots. L’indice lui-même est décidé par le jeu, pas par le modèle.'),
  guR2: s('Write a thank-you or a greeting for an islander, in French or English, under 25 words.', 'Écrire un merci ou un bonjour pour un habitant, en français ou en anglais, en moins de 25 mots.'),
  guR3: s('Never place a block, never solve a request, never talk about anything outside the island.', 'Ne jamais poser un bloc, ne jamais résoudre une demande, ne jamais parler d’autre chose que de l’île.'),
  guR4: s('Every line is checked against a word list before it is shown. A refused line falls back to a written one.', 'Chaque phrase est vérifiée avec une liste de mots avant d’être montrée. Une phrase refusée est remplacée par une phrase écrite.'),
  guDataH: s('Nothing leaves the house', 'Rien ne sort de la maison'),
  guD1: s('No account, no internet, no adverts. The game is installed like any other program.', 'Pas de compte, pas d’internet, pas de pub. Le jeu s’installe comme n’importe quel programme.'),
  guD2: s('Saved on this computer. A save code moves the family’s islands to another computer.', 'Sauvegardé sur cet ordinateur. Un code de sauvegarde déplace les îles de la famille vers un autre ordinateur.'),
  guD3: s('No timers, streaks, points or "you missed a day". Rewards are cosmetic and always earnable.', 'Pas de chrono, de série, de points ni de « tu as raté un jour ». Les récompenses sont décoratives et toujours gagnables.'),
  guTryH: s('Try Olive', 'Essayer Olive'),
  guTryGo: s('Ask', 'Demander'),
  saveCodeH: s('Save code', 'Code de sauvegarde'),
  saveCodeCopy: s('Copy the code', 'Copier le code'),
  saveCodePaste: s('Paste a code', 'Coller un code'),
  saveCodeBad: s('That code is not an island save.', 'Ce code n’est pas une sauvegarde de l’île.'),
  // ── P108 IW-002 (lane J): what the robot says at a job's new moments (the sayKeys of brief §4.2) ──
  sayFull: s('It’s full!', 'C’est plein !'),
  sayNoCan: s('I need the can.', 'Il me faut l’arrosoir.'),
  sayHome: s('Home! All done.', 'À la maison ! Tout est fait.'),
  // ── P108 IW-005 (lane J): go to nearest / go to found nothing to reach (the none event) ──
  sayNone: s('There’s none left to find.', 'Il n’y en a plus à trouver.'),
  // ── P108 IW-003 (lane P): the post — the envelopes' card, and what a robot says at a door ──
  iw3pEnvTitle: s('Take each letter to the right door', 'Apporte chaque lettre à la bonne porte'),
  iw3pEnvBlurb: s('Go to what Olive read', 'Aller à ce qu’Olive a lu'),
  iw3pEnvLine: s('"Three letters came for my neighbours. Ask Olive to read the name on each one, then {b} takes it to that door!"', '« Trois lettres sont arrivées pour mes voisins. Demande à Olive de lire le nom sur chacune, puis {b} l’apporte à cette porte ! »'),
  iw3pStickerEnvelope: s('Envelope sticker', 'Autocollant enveloppe'),
  iw3pGiftEnvelope: s('An envelope sticker, from Mamie Rose', 'Un autocollant enveloppe, offert par Mamie Rose'),
  iw3pPosted: s('Delivered!', 'Livrée !'),
  iw3pWrongDoor: s('Not this door! Whose name is on the letter?', 'Pas cette porte ! Quel nom est écrit sur la lettre ?'),
  // ── P108 IW-003 (lane S): Sami's bench (the first build) — the card, the reward, the gift ──
  iw3sBenchTitle: s('Build Sami a bench', 'Construis un banc pour Sami'),
  iw3sBenchBlurb: s('Repeat until', 'Répéter jusqu’à'),
  iw3sBenchLine: s('"I would love a bench to sit on. It takes eight stones: two full hods. The rocks hold more stones some days and fewer on others, so fill the hod until it is full, and keep going until my bench is built!"', '« J’aimerais tant un banc pour m’asseoir. Il faut huit pierres : deux hottes pleines. Les rochers ont plus de pierres certains jours, moins d’autres jours : remplis la hotte jusqu’à ce qu’elle soit pleine, et continue jusqu’à ce que mon banc soit construit ! »'),
  iw3sStickerBench: s('Bench sticker', 'Autocollant banc'),
  iw3sGiftBench: s('A bench sticker, from Sami', 'Un autocollant banc, offert par Sami')
};

/** The word keys, for the generated translate script and the gate. */
export const WORD_KEYS: ReadonlyArray<string> = Object.keys(WORDS);

export const REQUESTS_JSON = JSON.stringify(REQUESTS, null, 2);
export const OLIVE_RUNGS_JSON = JSON.stringify(OLIVE_RUNGS, null, 2);
export const HINTS_JSON = JSON.stringify(HINT_KEYS.map((key) => ({ key, en: HINTS[key].en, fr: HINTS[key].fr })), null, 2);
export const WORDS_JSON = JSON.stringify(WORD_KEYS.map((key) => ({ key, en: WORDS[key].en, fr: WORDS[key].fr })), null, 2);

// ── P106 IG-006 (lane C): Olive's three requests, appended to REQUESTS above (declared here, hoisted) ──────────

/**
 * P106 IG-006: Mamie's note (read → if), the rock and the flowers (is it a…? → the vote), Sami's thank-you (say). The
 * words (title, blurb, line, reward, gift) are in the page's word table (`cg003Content.ts` PAGE_WORDS). A `note`/`sign`
 * thing carries `text` in English — the engine sends the note in the run's language (the rung table's `notes_read`
 * lists, index-aligned); a tulip carries `color` (IG-006's addition to brief §4's vocabulary). `olive:<rung>` is an
 * Olive block (cg005Olive.ts `oliveType`); `tulips_watered` is IG-006's goal (so many tulips of one colour watered).
 */
function IG006_REQUESTS(): GardenRequest[] {
  const at = (kind: string, x: number, y: number, extra: Record<string, unknown> = {}) => ({ kind, x, y, ...extra }) as unknown as Thing;
  const olive = (rung: string, slots?: Record<string, string>) => blk(('olive:' + rung) as BlockType, slots ? { slots } : {});
  const goal = (g: Array<{ name: string; args?: Array<string | number> }>) => g as unknown as GardenRequest['goal'];
  return [
    {
      // P108 IW-003 (lane M): Olive reads, then if — as a job with the can. Mamie's note changes with the day (the seed
      // chooses "the red ones" or "the yellow ones", and the job's targets are that row): Pip faces the well (4,2) with
      // an empty can, Olive reads the note, Pip fills the can (three drinks, one per tulip), and ONE if turns him
      // towards the day's row — left to the red bed (south-west), else right to the yellow bed (north-east). The same
      // walk-and-pour then waters whichever row he faces. Today's three full is the finish line: Pip walks home.
      id: 'mamie-note',
      islander: 'mamie',
      band: 2,
      plot: { x: 37, y: 1 },
      tricks: [4],
      map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGWFFF', 'PPPPPPPP', 'GFFFGGGG', 'GGGGGTGG'],
      things: [
        at('note', 3, 2, { id: 'note', text: 'The red ones, not the yellow.' }),
        at('tulip', 3, 4, { id: 'r1', watered: false, color: 'red', have: 0, need: 1 }),
        at('tulip', 2, 4, { id: 'r2', watered: false, color: 'red', have: 0, need: 1 }),
        at('tulip', 1, 4, { id: 'r3', watered: false, color: 'red', have: 0, need: 1 }),
        at('tulip', 5, 2, { id: 'y1', watered: false, color: 'yellow', have: 0, need: 1 }),
        at('tulip', 6, 2, { id: 'y2', watered: false, color: 'yellow', have: 0, need: 1 }),
        at('tulip', 7, 2, { id: 'y3', watered: false, color: 'yellow', have: 0, need: 1 })
      ],
      robotStart: { x: 4, y: 3, d: 0, can: 0, canMax: 3 },
      goal: goal([{ name: 'job_done' }, { name: 'uses', args: ['olive:read', 1] }, { name: 'uses', args: ['if', 1] }]),
      palette: ['fwd', 'left', 'right', 'water', 'fill', 'repeat', 'if'],
      rungs: ['read'],
      reward: { kind: 'sticker', id: 'note', from: 'mamie' },
      copyKeys: { title: 'rqNoteTitle', blurb: 'rqNoteBlurb', line: 'rqNoteLine', reward: 'stickerNote', gift: 'giftNote' },
      referenceProgram: [
        olive('read'),
        blk('fill'),
        blk('if', { slots: { sensor: 'olive_read:red_tulip' }, body: b1('left'), ...({ else: b1('right') } as unknown as Partial<Block>) }),
        blk('repeat', { n: 3, body: b1('fwd', 'left', 'water', 'right') })
      ],
      job: { targets: ['r1', 'r2', 'r3'], home: { x: 4, y: 3, d: 0 } },
      seeded: {
        // The two notes, three times over and index-aligned with their rows: a day is still one in two of each, and the
        // gate's seeds 1, 2, 3 (whose first draws all fall in 0.62..0.74) lay both — yellow on 1, red on 2 and 3.
        choose: [
          {
            thing: 'note',
            field: 'text',
            among: ['The red ones, not the yellow.', 'The yellow ones, not the red.', 'The red ones, not the yellow.', 'The yellow ones, not the red.', 'The red ones, not the yellow.', 'The yellow ones, not the red.'],
            targets: [['r1', 'r2', 'r3'], ['y1', 'y2', 'y3'], ['r1', 'r2', 'r3'], ['y1', 'y2', 'y3'], ['r1', 'r2', 'r3'], ['y1', 'y2', 'y3']]
          }
        ]
      }
    },
    {
      // P108 IW-003 (lane S): as today, with the can — Echo carries an empty can of three (the robot's own, IG-002) and
      // fills it at the pond below the start before Olive is asked about each thing; the two flowers are the targets
      // (a drink each, a meter), the rocks are rock sources (a max: they regrow when Cobble mines them one day). Home is
      // the start: when both flowers have drunk, Echo walks back.
      id: 'rock-flower',
      islander: 'sami',
      band: 2,
      plot: { x: 28, y: 8 },
      tricks: [4],
      map: ['GGTGGGTH', 'GGGGGGGG', 'GFGFGGGG', 'PPPPPPPP', 'WWWGGGGG', 'GGGGGTGG'],
      things: [
        at('sign', 0, 2, { text: 'The tulips want water today.' }),
        at('tulip', 1, 2, { id: 't1', watered: false, color: 'red', have: 0, need: 1 }),
        at('rock', 2, 2, { left: 4, max: 4 }),
        at('tulip', 3, 2, { id: 't2', watered: false, color: 'red', have: 0, need: 1 }),
        at('rock', 4, 2, { left: 4, max: 4 })
      ],
      robotStart: { x: 0, y: 3, d: 1, can: 0, canMax: 3 },
      goal: goal([{ name: 'job_done' }, { name: 'no_puddle' }, { name: 'uses', args: ['olive:is-it-a', 1] }, { name: 'senses', args: ['olive_says:yes', 1] }]),
      palette: ['fwd', 'left', 'right', 'water', 'fill', 'repeat', 'if'],
      needs: 'echo',
      rungs: ['is-it-a'],
      reward: { kind: 'sticker', id: 'flower', from: 'sami' },
      copyKeys: { title: 'rqFlowerTitle', blurb: 'rqFlowerBlurb', line: 'rqFlowerLine', reward: 'stickerFlower', gift: 'giftFlower' },
      job: { targets: ['t1', 't2'], home: { x: 0, y: 3, d: 1 } },
      referenceProgram: [
        blk('right'),
        blk('fill'),
        blk('left'),
        blk('repeat', {
          n: 4,
          body: [blk('fwd'), blk('left'), olive('is-it-a', { kind: 'a flower', times: '3' }), blk('if', { slots: { sensor: 'olive_says:yes' }, body: b1('water') }), blk('right')]
        })
      ]
    },
    {
      id: 'sami-thanks',
      islander: 'sami',
      band: 2,
      plot: { x: 37, y: 8 },
      tricks: [1],
      // P108 IW-003 (lane P): as letter-say — the post box → Pocket's satchel → Mamie Rose's door — and Olive writes the
      // thank-you. The note still names who the letter is for.
      map: ['GGTGGGTG', 'GGGGGHGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGWW', 'GGTGGGWG'],
      things: [
        at('note', 0, 2, { text: 'Take the letter to Mamie Rose.' }),
        at('postbox', 2, 4, { id: 'postbox' }),
        at('letter', 2, 4, { id: 'letter', to: 'Mamie Rose' }),
        at('door', 5, 2, { id: 'door-mamie', owner: 'Mamie Rose', count: 0, capacity: 1 })
      ],
      robotStart: { x: 0, y: 3, d: 1 },
      goal: goal([{ name: 'job_done' }, { name: 'said', args: [1] }, { name: 'uses', args: ['olive:say-thanks', 1] }]),
      palette: ['fwd', 'left', 'right', 'pick', 'put', 'repeat'],
      needs: 'pocket',
      challenge: 'predict',
      rungs: ['say-thanks'],
      reward: { kind: 'sticker', id: 'thanks', from: 'sami' },
      copyKeys: { title: 'rqThanksTitle', blurb: 'rqThanksBlurb', line: 'rqThanksLine', reward: 'stickerThanks', gift: 'giftThanks' },
      referenceProgram: [
        blk('repeat', { n: 2, body: b1('fwd') }),
        blk('right'),
        blk('pick'),
        blk('left'),
        blk('repeat', { n: 3, body: b1('fwd') }),
        blk('left'),
        blk('put'),
        olive('say-thanks', { to: 'Mamie Rose', deed: 'carried her letter' })
      ],
      job: { targets: ['door-mamie'], home: { x: 0, y: 3, d: 1 } }
    },
    {
      // P108 IW-003 (lane P, NEW; D6 supersedes P106 R10): the envelopes. Three letters in the post box, each with a name
      // dealt by the day's seed; three doors on the street, each with its owner. Olive reads the name on the envelope in
      // Pocket's satchel, and go to [what Olive read] walks to that door (IW-005's REF read, by the door's owner). A fixed
      // walk to the doors in a row wins only on the day the names happen to come in that order.
      id: 'envelopes',
      islander: 'mamie',
      band: 2,
      plot: { x: 46, y: 1 },
      tricks: [2],
      map: ['GHGGHGGH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'GTGGGGTG'],
      things: [
        at('door', 1, 1, { id: 'door-mamie', owner: 'Mamie Rose', count: 0, capacity: 1 }),
        at('door', 4, 1, { id: 'door-sami', owner: 'Sami', count: 0, capacity: 1 }),
        at('door', 7, 1, { id: 'door-biscuit', owner: 'Biscuit', count: 0, capacity: 1 }),
        at('postbox', 2, 2, { id: 'postbox' }),
        at('letter', 2, 2, { id: 'e1', to: 'Mamie Rose' }),
        at('letter', 2, 2, { id: 'e2', to: 'Sami' }),
        at('letter', 2, 2, { id: 'e3', to: 'Biscuit' })
      ],
      robotStart: { x: 3, y: 3, d: 0 },
      goal: goal([{ name: 'job_done' }]),
      palette: ['fwd', 'left', 'right', 'pick', 'put', 'go_to', 'repeat'],
      needs: 'pocket',
      rungs: ['read'],
      reward: { kind: 'sticker', id: 'envelope', from: 'mamie' },
      copyKeys: { title: 'iw3pEnvTitle', blurb: 'iw3pEnvBlurb', line: 'iw3pEnvLine', reward: 'iw3pStickerEnvelope', gift: 'iw3pGiftEnvelope' },
      referenceProgram: [
        blk('repeat', {
          n: 3,
          body: [blk('go_to', { slots: { thing: { id: 'postbox', kind: 'postbox', x: 2, y: 2 } } }), blk('pick'), olive('read'), blk('go_to', { slots: { thing: { ref: 'read' } } }), blk('put')]
        })
      ],
      job: { targets: ['door-mamie', 'door-sami', 'door-biscuit'], home: { x: 3, y: 3, d: 0 } },
      seeded: { shuffle: { things: ['e1', 'e2', 'e3'], field: 'to', values: ['Mamie Rose', 'Sami', 'Biscuit'] } }
    }
  ];
}

// ── P108 IW-003 (lane S): Sami's bench, appended to REQUESTS above (declared here, hoisted) ──────────────────────

/**
 * P108 IW-003 (lane S): the first build (IW-003 §4, "a job with a big meter"). Sami wants a bench beside his path: ONE
 * site with `build: 'bench'` that needs 8 stones — two hods of four — and rises in stages as they land (both kits draw it
 * by have/need); built, Sami sits on it. The source: three rocks whose stones differ each day (`choose` on `left`, seeded),
 * so "pick four" runs dry on one day and not on another; the lesson is `until`: fill the hod until it is full (the
 * nearest rock that still has stones: go to nearest skips a used-up one), take it to the bench, empty it, and keep going
 * until the bench is built. Band 10–12 (the conditions are things: the hod, the bench); the bench blocks at every stage
 * (a building is walked round, never over) and a finished one never reads as path.
 */
function SAMI_BENCH(): GardenRequest {
  const bench = { id: 'bench', kind: 'site', x: 4, y: 2 };
  const is = (thing: Record<string, unknown>, state: string) => ({ op: 'is', thing, state });
  return {
    id: 'sami-bench',
    islander: 'sami',
    band: 2,
    plot: { x: 46, y: 8 },
    tricks: [3],
    map: ['GGGGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'TGGGGGGT'],
    things: [
      { kind: 'site', id: 'bench', x: 4, y: 2, have: 0, need: 8, item: 'stone', build: 'bench' },
      { kind: 'rock', id: 'r1', x: 2, y: 5, left: 4, max: 6 },
      { kind: 'rock', id: 'r2', x: 5, y: 5, left: 4, max: 6 },
      { kind: 'rock', id: 'r3', x: 6, y: 1, left: 4, max: 6 }
    ],
    robotStart: { x: 1, y: 3, d: 1, basket: 4 },
    goal: { name: 'job_done' },
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'until', 'go_nearest', 'go_to'],
    needs: 'cobble',
    reward: { kind: 'sticker', id: 'bench', from: 'sami' },
    copyKeys: { title: 'iw3sBenchTitle', blurb: 'iw3sBenchBlurb', line: 'iw3sBenchLine', reward: 'iw3sStickerBench', gift: 'iw3sGiftBench' },
    job: { targets: ['bench'], home: { x: 1, y: 3, d: 1 } },
    seeded: { choose: [{ thing: 'r1', field: 'left', among: [2, 3, 4] }, { thing: 'r2', field: 'left', among: [2, 4, 6, 3] }, { thing: 'r3', field: 'left', among: [4, 6] }] },
    referenceProgram: [
      blk('until', {
        slots: { cond: is(bench, 'done') },
        body: [
          blk('until', { slots: { cond: is({ ref: 'held' }, 'full') }, body: [blk('go_nearest', { slots: { kind: 'rock' } }), blk('pick')] }),
          blk('go_to', { slots: { thing: bench } }),
          blk('until', { slots: { cond: is({ ref: 'held' }, 'empty') }, body: b1('put') })
        ]
      })
    ]
  };
}

// ── P106 IG-004 (lane E): the island — its size, its base map, free play's plot and the robots' home ─────────────

/** A plot: every request's map is 8 × 6 (the Workshop frames exactly this). */
export const PLOT_W = 8;
export const PLOT_H = 6;
/**
 * The island (README R9, ruled 2026-09-29: a bigger island, ONE plot per request). Fifteen 8 × 6 slots in five
 * columns and three rows, a one-tile path between every two, a one-tile shore all round: 1 + 5 × 8 + 4 + 1 = 46 wide,
 * 1 + 3 × 6 + 2 + 1 = 22 tall, 1012 tiles. Thirteen requests + free play take fourteen slots; the fifteenth is home
 * (the house, the pond, the rock field). Each islander's plots are one row: Mamie Rose's on top, Sami's in the middle,
 * Biscuit's below with the garden and home. Fewer columns would need a fourth row (4 × 4 = 37 × 29 = 1073 tiles).
 *
 * P108 R6 (ruled 2026-09-30, "Widen to 55×22"): one more column for IW-003's two new missions — six columns, eighteen
 * slots, 1 + 6 × 8 + 5 + 1 = 55 wide, 1210 tiles. Mamie's envelopes take the new slot on her row (46, 1), Sami's bench
 * the one on his (46, 8); Biscuit's row keeps (46, 15) empty for IW-007's building. A slot no request, free play or home
 * sits on is a MEADOW (`ISLAND_MEADOW_MAP`), stamped in the base: the land the island has left.
 */
export const ISLAND_W = 55;
export const ISLAND_H = 22;
/** Free play ("the garden", never pinned) — the brief's FREE_PLAY_PLOT. */
export const FREE_PLAY_PLOT: { x: number; y: number } = { x: 28, y: 15 };
/** The spare slot: home — the robots not at work stand on its path. */
export const ISLAND_HOME_PLOT: { x: number; y: number } = { x: 37, y: 15 };
/** Where a robot not at work stands (the next one beside it, on the home path). */
export const ISLAND_HOME: { x: number; y: number } = { x: 39, y: 17 };
/** The home slot's own map: the house, the path the robots wait on, the pond, the rock field (R: a rock that yields nothing). */
export const ISLAND_HOME_MAP: ReadonlyArray<string> = ['GGTGGGWW', 'GHGGGWWW', 'GGPPPGWG', 'GGGGPGGG', 'TGRGGGRG', 'GGGRGGTG'];
/** P108 R6: an empty slot's map — grass, two trees, a tuft of tulip leaves: land nobody works yet (IW-007 builds on it). */
export const ISLAND_MEADOW_MAP: ReadonlyArray<string> = ['GGGGGGTG', 'GGGGGGGG', 'GTGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGTGG'];
/**
 * The island's base map, ISLAND_W × ISLAND_H: the shore (grass, a tree at each corner and along it), the paths between
 * the slots, home stamped in its slot, and `.` where a request's plot (or free play's) is stamped by `Logic/Island
 * world`. The content gate (cg002Engine AC4) checks every `.` is under exactly one plot and no plot sits on anything else.
 * P108 R6: a slot with no request, free play or home on it is stamped as a meadow here, so it is never an unstamped `.`.
 */
export const ISLAND_BASE: ReadonlyArray<string> = (() => {
  const rows: string[][] = [];
  const shoreTrees = new Set(['0,0', '54,0', '0,21', '54,21', '13,0', '31,0', '49,0', '22,21', '40,21', '0,11', '54,11']);
  for (let y = 0; y < ISLAND_H; y++) {
    const row: string[] = [];
    for (let x = 0; x < ISLAND_W; x++) {
      const shore = x === 0 || y === 0 || x === ISLAND_W - 1 || y === ISLAND_H - 1;
      const inSlot = !shore && (x - 1) % (PLOT_W + 1) < PLOT_W && (y - 1) % (PLOT_H + 1) < PLOT_H;
      row.push(shore ? (shoreTrees.has(`${x},${y}`) ? 'T' : 'G') : inSlot ? '.' : 'P');
    }
    rows.push(row);
  }
  ISLAND_HOME_MAP.forEach((r, y) => r.split('').forEach((c, x) => (rows[ISLAND_HOME_PLOT.y + y][ISLAND_HOME_PLOT.x + x] = c)));
  // P108 R6: every slot whose top-left no request, free play or home claims is a meadow.
  const claimed = new Set([...REQUESTS.map((r) => `${r.plot.x},${r.plot.y}`), `${FREE_PLAY_PLOT.x},${FREE_PLAY_PLOT.y}`, `${ISLAND_HOME_PLOT.x},${ISLAND_HOME_PLOT.y}`]);
  for (let sy = 1; sy + PLOT_H < ISLAND_H; sy += PLOT_H + 1)
    for (let sx = 1; sx + PLOT_W < ISLAND_W; sx += PLOT_W + 1)
      if (!claimed.has(`${sx},${sy}`)) ISLAND_MEADOW_MAP.forEach((r, y) => r.split('').forEach((ch, x) => (rows[sy + y][sx + x] = ch)));
  return rows.map((r) => r.join(''));
})();

// ── P106 IG-005 (lane B): robots for the job — the catalogue, the upgrades, and what each robot can do ─────────────

/** The robot kinds (R8): Pip from the start, then one lent by each islander. */
export type RobotKind = 'pip' | 'cobble' | 'pocket' | 'echo';
/** The upgrades, given as `item` rewards (they sit on the sticker page too): a bigger can, a bigger basket, boots. */
export type UpgradeId = 'can+' | 'basket+' | 'boots';

/**
 * One robot of the catalogue. `palette` is what it can do BEYOND the moves every robot has (`ROBOT_MOVES`) and the
 * controls of the band (`ROBOT_CONTROLS`): its actions and its Olive blocks. `canMax` is what `fill` fills its can to
 * where a request has a pond (IG-002), `basket` what it carries; `upgrade` the one slot it has. `lentBy` / `unlockedBy`:
 * the islander who lends it and the request whose win does (null for Pip, who is there from the start).
 */
export interface RobotSpec {
  id: RobotKind;
  defaultName: Bi;
  colour: string;
  accessory: 'can' | 'hod' | 'satchel' | 'bell';
  palette: ReadonlyArray<string>;
  canMax: number;
  basket: number;
  upgrade: UpgradeId;
  lentBy: 'sami' | 'mamie' | 'biscuit' | null;
  unlockedBy: string | null;
}

/**
 * Every robot has these moves: forward and the two turns. P108 IW-003 (s3 base, README D9): and hands — every mission is a
 * job with something to pick up (the can, a letter, the food) — and the walk to a thing (`go to nearest`, `go to`).
 */
export const ROBOT_MOVES: ReadonlyArray<string> = ['fwd', 'left', 'right', 'pick', 'put', 'go_nearest', 'go_to'];
/** And the controls of the band (band 7–9 has none): the palette's band filter still decides which show. */
export const ROBOT_CONTROLS: ReadonlyArray<string> = ['repeat', 'until', 'if', 'when', 'count_inc', 'trick', 'do', 'set', 'change'];

/**
 * The catalogue (IG-005 §2). Each request's `needs` is one of these, and every request's reference program uses only
 * what its robot can do (the engine gate proves it, both bands). Who lends whom is a chain with no loop: Pip wins Sami's
 * post-box walk and Mamie's note; Sami's walk lends Cobble (the stones, Biscuit's bowl); the bowl lends Pocket (the
 * eggs, the letters); the note lends Echo (the rocks and the flowers). Pip reads with Olive (the note is the child's
 * first Olive job); Echo has every Olive block — a palette choice, not an engine rule (IG-005 §6).
 */
export const ROBOTS: ReadonlyArray<RobotSpec> = [
  { id: 'pip', defaultName: s('Pip', 'Pip'), colour: '#FF7A59', accessory: 'can', palette: ['water', 'fill', 'olive:read'], canMax: 3, basket: 4, upgrade: 'can+', lentBy: null, unlockedBy: null },
  { id: 'cobble', defaultName: s('Cobble', 'Cobble'), colour: '#7A8CA3', accessory: 'hod', palette: ['pick', 'put'], canMax: 3, basket: 4, upgrade: 'basket+', lentBy: 'sami', unlockedBy: 'path-postbox' },
  { id: 'pocket', defaultName: s('Pocket', 'Poche'), colour: '#FFB347', accessory: 'satchel', palette: ['pick', 'put', 'say', 'olive:say-thanks', 'olive:read'], canMax: 3, basket: 6, upgrade: 'boots', lentBy: 'biscuit', unlockedBy: 'bowl-if' },
  { id: 'echo', defaultName: s('Echo', 'Écho'), colour: '#8F6BFF', accessory: 'bell', palette: ['water', 'fill', 'say', 'olive:read', 'olive:is-it-a', 'olive:say-thanks'], canMax: 3, basket: 4, upgrade: 'can+', lentBy: 'mamie', unlockedBy: 'mamie-note' }
];

/** One upgrade: who gives it, after which request, which robots it fits, and what it changes. */
export interface UpgradeSpec {
  id: UpgradeId;
  from: 'sami' | 'mamie' | 'biscuit';
  unlockedBy: string;
  fits: ReadonlyArray<RobotKind>;
  canMax?: number;
  basket?: number;
  stepFactor?: number;
}

/** The upgrades (IG-005 §2): Mamie's bigger can (3 → 6), Sami's bigger basket (4 → 8), Biscuit's boots (Step Ms × 0.7). */
export const UPGRADES: ReadonlyArray<UpgradeSpec> = [
  { id: 'can+', from: 'mamie', unlockedBy: 'rows-trick', fits: ['pip', 'echo'], canMax: 6 },
  { id: 'basket+', from: 'sami', unlockedBy: 'path-stones', fits: ['cobble'], basket: 8 },
  { id: 'boots', from: 'biscuit', unlockedBy: 'wall-until', fits: ['pocket'], stepFactor: 0.7 }
];

/** The robot a request needs (Pip when it names none). */
export const needsOf = (r: { needs?: RobotKind }): RobotKind => r.needs ?? 'pip';

export const ROBOTS_JSON = JSON.stringify(ROBOTS);
export const UPGRADES_JSON = JSON.stringify(UPGRADES);

// ── P108 IW-002 (lane J): the job model — its vocabulary, the wear clock, the seeded layouts ─────────────────────

/** A job (P108 IW-002, brief §4.2): every target full is the finish line; then the robot walks to `home` (and faces `d`). */
export interface JobSpec {
  targets: ReadonlyArray<string | readonly [number, number]>;
  home: { x: number; y: number; d?: number };
}
/**
 * A seeded layout: `wallAt: [lo, hi]` puts one wall tile (`L`) at a column from lo to hi on row `wallRow` (default the
 * robot's start row); `eggs: { count, among }` lays `count` eggs on distinct tiles of `among`. The world's `seed` picks.
 */
export interface SeededSpec {
  wallAt?: readonly [number, number];
  wallRow?: number;
  eggs?: { count: number; among: ReadonlyArray<readonly [number, number]> };
  /** P108 IW-003 (s3 base): one value of `among` into the field of the thing with that id (today's note, a colour). */
  choose?: ReadonlyArray<{
    thing: string;
    field: string;
    among: ReadonlyArray<unknown>;
    /** P108 IW-003 (lane M): the job's targets for each value of among, index-aligned (Mamie's note: today's row). */
    targets?: ReadonlyArray<ReadonlyArray<string>>;
  }>;
  /** P108 IW-003 (s3 base): `values` shuffled and dealt one to each thing, in `things` order (the envelopes' names). */
  shuffle?: { things: ReadonlyArray<string>; field: string; values: ReadonlyArray<unknown> };
  /** P108 IW-003 (s3 base): the thing with that id moved to one tile of `among` (a ball, a can on the plot). */
  place?: ReadonlyArray<{ thing: string; among: ReadonlyArray<readonly [number, number]> }>;
  /**
   * P108 IW-003 (lane B): the thing with that id laid beside the wall this seed drew (`wallAt`): at the wall's tile plus
   * (dx, dy); `spotOn` names a container that remembers that tile, so the thing it loses to wear goes back there
   * (Biscuit's ball rolls back to the wall). Laid after `place`; it draws nothing from the seed.
   */
  byWall?: ReadonlyArray<{ thing: string; dx: number; dy: number; spotOn?: string }>;
}

/** The wall tile (brief §4.2): blocking, drawn by both kits (session 2). The map edge stays blocked too. */
export const WALL_TILE = 'L';
/** A path site's look by `have / need`: 0 · under half · under full · full (the tile then reads as path, `P`). */
export const SITE_STAGES = ['dirt', 'gravel', 'cobbles', 'path'] as const;
/** The most eggs a hen's pen holds before she stops laying (a `hen` may name its own `capacity`). */
export const HEN_CAPACITY = 4;

/** What a job thing is for (README §4.1): a target has a meter, a container counts an item, a carrier is held, a source gives. */
export type JobRole = 'target' | 'container' | 'carrier' | 'source';
export interface JobKind {
  kind: 'tulip' | 'site' | 'basket' | 'bowl' | 'store' | 'can' | 'rock' | 'hen' | 'postbox' | 'door';
  role: JobRole;
  /** The fields the engine reads and writes on it (renderers draw from these). */
  fields: ReadonlyArray<string>;
  /** A container's item when it names none; a site's too. */
  item?: string;
  /** Does it stop a robot walking onto its tile (the engine's BLOCKING_THINGS)? */
  blocks: boolean;
  /** The wear clock that touches it, a key of WEAR (none: it never wears). */
  wear?: keyof typeof WEAR;
}

/**
 * Wear (R2, D7): island ticks between two wears of one thing of each kind. Wear runs ONLY in the island tick (only while
 * a page is open; the tick is `STEP_MS × 2` = 760 ms, about 78 a minute), never in the Workshop. The numbers, measured
 * 2026-09-29: the longest reference run is 41 ticks (rows-trick; tulips-three 31, path-stones 23) and the walk home on
 * an 8 × 6 plot is at most 12 moves plus turns, so a target wears no sooner than 60 ticks (~46 s): a job that finishes
 * is SEEN done, its robot at home, before it reopens — and a child sees the robot go back within a minute of play.
 * The path wears slowest (stone: 120 ticks, ~1.5 min); Biscuit eats every 60; Mamie takes an egg every 90. Sources run
 * faster than the targets they feed so a reopened job never waits on them: the rock regrows a stone every 30 ticks (four
 * in two minutes, one path square's worth), the hen lays every 20 (a pen of four in about a minute), a letter every 90.
 */
export const WEAR = { tulip: 60, site: 120, bowl: 60, basket: 90, store: 120, rock: 30, hen: 20, postbox: 90, door: 90 } as const;

/** The job vocabulary (brief §4.2) — ONE table the engine, the mockup and both renderers read by these names. */
export const JOB_VOCABULARY: ReadonlyArray<JobKind> = [
  { kind: 'tulip', role: 'target', fields: ['have', 'need', 'watered', 'droop'], blocks: true, wear: 'tulip' },
  { kind: 'site', role: 'target', fields: ['have', 'need', 'item', 'stage', 'walked', 'build'], item: 'stone', blocks: false, wear: 'site' },
  { kind: 'basket', role: 'container', fields: ['count', 'capacity', 'item'], item: 'egg', blocks: true, wear: 'basket' },
  { kind: 'bowl', role: 'container', fields: ['count', 'capacity', 'item', 'food'], item: 'food', blocks: true, wear: 'bowl' },
  { kind: 'store', role: 'container', fields: ['count', 'capacity', 'item'], item: 'stone', blocks: true, wear: 'store' },
  { kind: 'can', role: 'carrier', fields: ['level', 'max'], blocks: true },
  { kind: 'rock', role: 'source', fields: ['left', 'max'], blocks: true, wear: 'rock' },
  { kind: 'hen', role: 'source', fields: ['pen', 'capacity'], blocks: true, wear: 'hen' },
  { kind: 'postbox', role: 'source', fields: [], blocks: true, wear: 'postbox' },
  { kind: 'door', role: 'container', fields: ['count', 'capacity', 'item', 'owner'], item: 'letter', blocks: true, wear: 'door' }
];
/** The kinds by role, for the engine (`JOB_KINDS[kind]` is its role). */
export const JOB_KINDS: Readonly<Record<string, JobRole>> = Object.fromEntries(JOB_VOCABULARY.map((k) => [k.kind, k.role]));
/** A container's (or a site's) item when it names none. */
export const JOB_ITEMS: Readonly<Record<string, string>> = Object.fromEntries(JOB_VOCABULARY.filter((k) => k.item).map((k) => [k.kind, k.item as string]));

// ── P108 IW-004 (lane B): the robot's brain ────────────────────────────────────────────────────────────────────────

/**
 * The most blocks a robot's program may hold (Autonauts' brain memory, README §4.2): the Workshop's Blocks node greys the
 * drawer when the program holds this many and a tap on it says why ("fold some steps into a repeat"). 12 for every robot
 * until IW-006 sells the bigger brains (12 → 16 → 20). Measured 2026-09-30: the longest reference program is 10 blocks
 * (tulips-three: repeat + 9), so every request still fits with room for one mistake; Teach may record past it (the page's
 * own recording, not the drawer) and the fold makes the room back.
 */
export const BRAIN_SIZE = 12;

// ── P108 IW-006 / IW-008 (session-4 base): the economy's names — shells, the shop, brains, the crew ───────────────

/**
 * The brain sizes a robot can have (README §4.2, Autonauts' brain memory): every robot starts at {@link BRAIN_SIZE}; the
 * shop's Upgrades tab sells the next size, one robot at a time (a robot row carries `brain` only once it is bigger).
 */
export const BRAIN_SIZES = [12, 16, 20] as const;

/** The most robots one island keeps (IW-008 §2: set by the frame reading, not by design — lane C measures it and may lower it). */
export const CREW_CAP = 12;

/** The shop's tabs, in the order they are drawn (IW-006 §2). Build and Animals stay empty until IW-007 fills them. */
export const SHOP_TABS = ['build', 'animals', 'robots', 'upgrades', 'helpers'] as const;
export type ShopTab = (typeof SHOP_TABS)[number];

/**
 * One thing the shop sells (IW-006 §2): its tab, its price in shells, what it is, and its picture and one line in both
 * languages. `kind` says what buying it does (`buyItem` in the save helpers is the one rule):
 * - `robot` — a new row of that robot kind (a copy, IW-008): only a kind the island already has, never past CREW_CAP;
 * - `upgrade` — an upgrade id into `owned` (today's can+, basket+, boots: the shop sells them; islanders' gifts stay stickers);
 * - `brain` — ONE robot's brain to `size` (only from the size before it);
 * - `helper` — one helper into `owned`, used up by the job it helps (IW-006 AC4); one of each held at a time.
 */
export interface ShopItem {
  id: string;
  tab: ShopTab;
  price: number;
  kind: 'robot' | 'upgrade' | 'brain' | 'helper';
  robot?: RobotKind;
  upgrade?: UpgradeId;
  size?: number;
  /** A helper's effect, read by the lane that builds it (IW-006 §2): the rain cloud, the self-filling can, the wheelbarrow. */
  helper?: 'rain' | 'selfcan' | 'barrow';
  icon: string;
  name: Bi;
  line: Bi;
}

/**
 * The shop's catalogue (session-4 base; prices are the orchestrator's first guess, D1 — lane E measures what a mission
 * pays and lane H may retune them, saying why). A job's run pays about its targets' steps (tulips-three 9, path-stones 16),
 * a finished job a bonus of 5–10: a robot copy is two finished jobs; a helper less than one.
 */
export const SHOP: ReadonlyArray<ShopItem> = [
  { id: 'robot:pip', tab: 'robots', price: 30, kind: 'robot', robot: 'pip', icon: '🤖', name: s('A new Pip', 'Un nouveau Pip'), line: s('Another watering robot. You name it.', 'Un autre robot arroseur. Tu lui donnes un nom.') },
  { id: 'robot:cobble', tab: 'robots', price: 30, kind: 'robot', robot: 'cobble', icon: '🪨', name: s('A new Cobble', 'Un nouveau Cobble'), line: s('Another stone carrier. You name it.', 'Un autre porteur de pierres. Tu lui donnes un nom.') },
  { id: 'robot:pocket', tab: 'robots', price: 30, kind: 'robot', robot: 'pocket', icon: '🎒', name: s('A new Pocket', 'Un nouveau Poche'), line: s('Another carrier of letters and eggs.', 'Un autre porteur de lettres et d’œufs.') },
  { id: 'robot:echo', tab: 'robots', price: 30, kind: 'robot', robot: 'echo', icon: '🔔', name: s('A new Echo', 'Un nouvel Écho'), line: s('Another robot who asks Olive.', 'Un autre robot qui demande à Olive.') },
  { id: 'can+', tab: 'upgrades', price: 15, kind: 'upgrade', upgrade: 'can+', icon: '🪣', name: s('A bigger can', 'Un plus grand arrosoir'), line: s('Six pours instead of three.', 'Six arrosages au lieu de trois.') },
  { id: 'basket+', tab: 'upgrades', price: 15, kind: 'upgrade', upgrade: 'basket+', icon: '🧺', name: s('A bigger hod', 'Une plus grande hotte'), line: s('Cobble carries eight stones.', 'Cobble porte huit pierres.') },
  { id: 'boots', tab: 'upgrades', price: 20, kind: 'upgrade', upgrade: 'boots', icon: '👢', name: s('Quick boots', 'Des bottes rapides'), line: s('Pocket walks faster.', 'Poche marche plus vite.') },
  { id: 'brain16', tab: 'upgrades', price: 25, kind: 'brain', size: 16, icon: '🧠', name: s('A bigger brain', 'Un plus grand cerveau'), line: s('One robot remembers 16 blocks.', 'Un robot retient 16 blocs.') },
  { id: 'brain20', tab: 'upgrades', price: 40, kind: 'brain', size: 20, icon: '🧠', name: s('The biggest brain', 'Le plus grand cerveau'), line: s('One robot remembers 20 blocks.', 'Un robot retient 20 blocs.') },
  { id: 'rain', tab: 'helpers', price: 6, kind: 'helper', helper: 'rain', icon: '🌧️', name: s('A rain cloud', 'Un nuage de pluie'), line: s('Waters every tulip on one plot, once.', 'Arrose toutes les tulipes d’un terrain, une fois.') },
  { id: 'selfcan', tab: 'helpers', price: 8, kind: 'helper', helper: 'selfcan', icon: '✨', name: s('A self-filling can', 'Un arrosoir magique'), line: s('Never needs the pond, for one job.', 'Jamais besoin de la mare, pour un travail.') },
  { id: 'barrow', tab: 'helpers', price: 10, kind: 'helper', helper: 'barrow', icon: '🛒', name: s('A wheelbarrow', 'Une brouette'), line: s('Carries eight, for one job.', 'Porte huit choses, pour un travail.') }
];
export const SHOP_JSON = JSON.stringify(SHOP);
