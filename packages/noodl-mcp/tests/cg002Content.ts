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
    id: 'path-postbox',
    islander: 'sami',
    band: 1,
    plot: { x: 1, y: 8 },
    tricks: [1],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPB', 'GWWGGRGG', 'GGGGGTGG'],
    things: [],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: { name: 'robot_at', args: [7, 3] },
    palette: ['fwd', 'left', 'right'],
    reward: { kind: 'hat', id: 'cap', from: 'sami' },
    copyKeys: { title: 'rqPathTitle', blurb: 'rqPathBlurb', line: 'rqPathLine', reward: 'hatCap', gift: 'giftCap' },
    referenceProgram: b1('fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd')
  },
  {
    // CG-006 §2 row 1b: steps in order, with a turn and a water. The tulip stands under the house (7,0).
    id: 'tulip-door',
    islander: 'mamie',
    band: 1,
    plot: { x: 1, y: 1 },
    tricks: [1],
    map: ['GGTGGGTH', 'GGGGGGGF', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [{ kind: 'tulip', x: 7, y: 1, watered: false }],
    robotStart: { x: 4, y: 3, d: 1 },
    goal: [{ name: 'every_tulip_watered' }, { name: 'no_puddle' }],
    palette: ['fwd', 'left', 'right', 'water'],
    reward: { kind: 'sticker', id: 'tulip', from: 'mamie' },
    copyKeys: { title: 'rqDoorTitle', blurb: 'rqDoorBlurb', line: 'rqDoorLine', reward: 'stickerTulip', gift: 'giftTulip' },
    referenceProgram: b1('fwd', 'fwd', 'fwd', 'left', 'fwd', 'water')
  },
  {
    // IG-002 (P106 s2, ruling R3): fetch and return. The pond is the left edge (x 0, rows 1–4), the three tulips stand in
    // the bed at x 3, and the robot starts at (1,1) facing the pond with an EMPTY can of three. Each pass fills the can,
    // turns round, walks to a tulip, waters it, steps down a row and walks back to the pond: the nine-block body the fold
    // finds in the recorded dance (IG-002 AC2). The tulips stay first in `things` (the engine gate's watered-world helper).
    id: 'tulips-three',
    islander: 'mamie',
    band: 1,
    plot: { x: 10, y: 1 },
    tricks: [2],
    map: ['GGTGGGTH', 'WGGFGGGG', 'WGGFGGGG', 'WGGFPPPP', 'WGGGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'tulip', x: 3, y: 1, watered: false },
      { kind: 'tulip', x: 3, y: 2, watered: false },
      { kind: 'tulip', x: 3, y: 3, watered: false }
    ],
    robotStart: { x: 1, y: 1, d: 3, can: 0, canMax: 3 },
    goal: { name: 'every_tulip_watered' },
    palette: ['fwd', 'left', 'right', 'water', 'fill', 'repeat'],
    challenge: 'predict',
    reward: { kind: 'hat', id: 'sun', from: 'mamie' },
    copyKeys: { title: 'rqTulipsTitle', blurb: 'rqTulipsBlurb', line: 'rqTulipsLine', reward: 'hatSun', gift: 'giftSun' },
    referenceProgram: [blk('repeat', { n: 3, body: b1('fill', 'left', 'left', 'fwd', 'water', 'right', 'fwd', 'right', 'fwd') })]
  },
  {
    // CG-006 §2 row 2b, rewritten by IG-002 (R3): the basket starts EMPTY and a rock of four stands on the grass beside
    // the start (2,2). Turn to it, pick four stones, turn back, and lay them from (3,3) to (6,3), towards the post box.
    id: 'path-stones',
    islander: 'sami',
    band: 1,
    plot: { x: 10, y: 8 },
    tricks: [2],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPGGGGB', 'GWWGGRGG', 'GGGGGTGG'],
    things: [{ kind: 'rock', x: 2, y: 2, left: 4 }],
    robotStart: { x: 2, y: 3, d: 1, basket: 4 },
    goal: [
      { name: 'thing_at', args: ['stone', 3, 3] },
      { name: 'thing_at', args: ['stone', 4, 3] },
      { name: 'thing_at', args: ['stone', 5, 3] },
      { name: 'thing_at', args: ['stone', 6, 3] }
    ],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'repeat'],
    needs: 'cobble',
    reward: { kind: 'seed', id: 'seeds', from: 'sami' },
    copyKeys: { title: 'rqStonesTitle', blurb: 'rqStonesBlurb', line: 'rqStonesLine', reward: 'seeds', gift: 'giftSeeds' },
    referenceProgram: [blk('left'), blk('repeat', { n: 4, body: b1('pick') }), blk('right'), blk('repeat', { n: 4, body: b1('put', 'fwd') })]
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
    id: 'letter-say',
    islander: 'sami',
    band: 2,
    plot: { x: 19, y: 8 },
    tricks: [1],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPB', 'GWWGGRGG', 'GGGGGTGG'],
    things: [{ kind: 'letter', x: 1, y: 3 }],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: [{ name: 'thing_at', args: ['letter', 7, 3] }, { name: 'said', args: [1] }],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'say', 'repeat'],
    needs: 'pocket',
    rungs: ['say-thanks'],
    reward: { kind: 'sticker', id: 'letter', from: 'sami' },
    copyKeys: { title: 'rqLetterTitle', blurb: 'rqLetterBlurb', line: 'rqLetterLine', reward: 'stickerLetter', gift: 'giftLetter' },
    referenceProgram: [blk('pick'), blk('repeat', { n: 6, body: b1('fwd') }), blk('put'), blk('say', { slots: { text: 'thanksSami' } })]
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
    id: 'eggs-count',
    islander: 'mamie',
    band: 2,
    plot: { x: 19, y: 1 },
    tricks: [6],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'egg', x: 1, y: 3 },
      { kind: 'egg', x: 2, y: 3 },
      { kind: 'egg', x: 3, y: 3 },
      { kind: 'egg', x: 4, y: 3 },
      { kind: 'egg', x: 5, y: 3 }
    ],
    robotStart: { x: 0, y: 3, d: 1, basket: 6 },
    goal: [{ name: 'carrying', args: ['egg', 4] }, { name: 'uses', args: ['count_inc', 1] }, { name: 'senses', args: ['count_is', 1] }, { name: 'thing_at', args: ['egg', 5, 3] }],
    palette: ['fwd', 'left', 'right', 'pick', 'until', 'count_inc'],
    needs: 'pocket',
    reward: { kind: 'item', id: 'basket', from: 'mamie' },
    copyKeys: { title: 'rqEggsTitle', blurb: 'rqEggsBlurb', line: 'rqEggsLine', reward: 'itemBasket', gift: 'giftBasket' },
    referenceProgram: [blk('until', { slots: { sensor: 'count_is', arg: 4 }, body: b1('pick', 'count_inc', 'fwd') })]
  },
  {
    id: 'rows-trick',
    islander: 'mamie',
    band: 2,
    plot: { x: 28, y: 1 },
    tricks: [7],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'FGFGFGGG', 'GGGGGTGG'],
    things: [
      { kind: 'tulip', x: 2, y: 2, watered: false },
      { kind: 'tulip', x: 4, y: 2, watered: false },
      { kind: 'tulip', x: 6, y: 2, watered: false },
      { kind: 'tulip', x: 0, y: 4, watered: false },
      { kind: 'tulip', x: 2, y: 4, watered: false },
      { kind: 'tulip', x: 4, y: 4, watered: false }
    ],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: [{ name: 'every_tulip_watered' }, { name: 'uses', args: ['do', 2] }],
    palette: ['fwd', 'left', 'right', 'water', 'repeat', 'trick', 'do'],
    reward: { kind: 'item', id: 'gnome', from: 'mamie' },
    copyKeys: { title: 'rqRowsTitle', blurb: 'rqRowsBlurb', line: 'rqRowsLine', reward: 'itemGnome', gift: 'giftGnome' },
    referenceProgram: [
      blk('trick', { slots: { name: 'row' }, body: [blk('repeat', { n: 3, body: b1('fwd', 'fwd', 'left', 'water', 'right') })] }),
      blk('do', { slots: { name: 'row' } }),
      blk('right'),
      blk('right'),
      blk('do', { slots: { name: 'row' } })
    ]
  },
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
  iw3Job: s('{w} of {t} done. What is still waiting?', '{w} sur {t}, c’est fait. Qu’est-ce qui attend encore ?')
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
  thanksSami: s('Thank you, Sami. Your letter is on its way!', 'Merci, Sami. Ta lettre est en route !'),
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
  rqPathTitle: s('Walk the path to the post box', 'Suis le chemin jusqu’à la boîte aux lettres'),
  rqPathBlurb: s('Steps in order', 'Des pas dans l’ordre'),
  rqPathLine: s('"The post box is at the end of the path. Can {b} walk there?"', '« La boîte aux lettres est au bout du chemin. {b} peut y aller ? »'),
  rqTulipsTitle: s('Water my three tulips', 'Arrose mes trois tulipes'),
  rqTulipsBlurb: s('Repeat', 'Répéter'),
  rqTulipsLine: s('"My tulips are thirsty. Fill the can at the pond, and come back!"', '« Mes tulipes ont soif. Remplis l’arrosoir à la mare, et reviens ! »'),
  rqBowlTitle: s('Feed me, but only if my bowl is empty', 'Nourris-moi, mais seulement si ma gamelle est vide'),
  rqBowlBlurb: s('If', 'Si'),
  rqBowlLine: s('"I eat from my three bowls all day. Take food from the sack and fill only the empty ones, {b}!"', '« Je mange dans mes trois gamelles toute la journée. Prends à manger dans le sac et remplis seulement les vides, {b} ! »'),
  rqLetterTitle: s('Deliver a letter and say something kind', 'Livre une lettre et dis quelque chose de gentil'),
  rqLetterBlurb: s('Say', 'Dire'),
  rqLetterLine: s('"Take my letter to the post box, and say something nice when you get there."', '« Porte ma lettre à la boîte aux lettres, et dis quelque chose de gentil en arrivant. »'),
  rqWallTitle: s('Fetch my ball from the wall', 'Rapporte ma balle du mur'),
  rqWallBlurb: s('Repeat until', 'Répéter jusqu’à'),
  rqWallLine: s('"My ball rolled all the way to the wall. Walk until the wall, pick it up and bring it back to my basket — without a bump, {b}!"', '« Ma balle a roulé jusqu’au mur. Avance jusqu’au mur, ramasse-la et rapporte-la dans mon panier — sans te cogner, {b} ! »'),
  rqMeowTitle: s('When I meow, bring me a treat', 'Quand je miaule, apporte-moi une friandise'),
  rqMeowBlurb: s('When', 'Quand'),
  rqMeowLine: s('"Every time I meow, {b} takes one treat from the jar and puts it in my bowl. Miaow!"', '« À chaque miaulement, {b} prend une friandise dans le bocal et la met dans ma gamelle. Miaou ! »'),
  rqEggsTitle: s('Collect four eggs, then stop', 'Ramasse quatre œufs, puis arrête'),
  rqEggsBlurb: s('Counting', 'Compter'),
  rqEggsLine: s('"Four eggs for the cake, not five. Can {b} keep count?"', '« Quatre œufs pour le gâteau, pas cinq. {b} sait compter ? »'),
  rqRowsTitle: s('Water both rows the same way', 'Arrose les deux rangées de la même façon'),
  rqRowsBlurb: s('A trick with a name', 'Une astuce avec un nom'),
  rqRowsLine: s('"Two rows of tulips. Teach {b} one trick and use it twice."', '« Deux rangées de tulipes. Apprends une astuce à {b} et utilise-la deux fois. »'),
  rqDoorTitle: s('Water the tulip by my door', 'Arrose la tulipe près de ma porte'),
  rqDoorBlurb: s('Steps in order', 'Des pas dans l’ordre'),
  rqDoorLine: s('"There is one tulip by my front door, and she is thirsty. Can {b} give her a drink?"', '« Il y a une tulipe près de ma porte, et elle a soif. {b} peut lui donner à boire ? »'),
  rqStonesTitle: s('Lay four stones on the path', 'Pose quatre pierres sur le chemin'),
  rqStonesBlurb: s('Repeat', 'Répéter'),
  rqStonesLine: s('"My path stops too soon. Take four stones from the rock, and lay them all the way to the post box!"', '« Mon chemin s’arrête trop tôt. Prends quatre pierres dans le rocher, et pose-les jusqu’à la boîte aux lettres ! »'),
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
  sayNone: s('There’s none left to find.', 'Il n’y en a plus à trouver.')
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
      id: 'mamie-note',
      islander: 'mamie',
      band: 2,
      plot: { x: 37, y: 1 },
      tricks: [4],
      map: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GGFGFGFG', 'GGGGGTGG'],
      things: [
        at('note', 0, 2, { text: 'The red ones, not the yellow.' }),
        at('tulip', 2, 2, { watered: false, color: 'red' }),
        at('tulip', 4, 2, { watered: false, color: 'red' }),
        at('tulip', 6, 2, { watered: false, color: 'red' }),
        at('tulip', 2, 4, { watered: false, color: 'yellow' }),
        at('tulip', 4, 4, { watered: false, color: 'yellow' }),
        at('tulip', 6, 4, { watered: false, color: 'yellow' })
      ],
      robotStart: { x: 0, y: 3, d: 1 },
      goal: goal([{ name: 'tulips_watered', args: ['red', 3] }, { name: 'tulips_watered', args: ['yellow', 0] }, { name: 'uses', args: ['olive:read', 1] }, { name: 'senses', args: ['olive_read:red_tulip', 1] }]),
      palette: ['fwd', 'left', 'right', 'water', 'repeat', 'if'],
      rungs: ['read'],
      reward: { kind: 'sticker', id: 'note', from: 'mamie' },
      copyKeys: { title: 'rqNoteTitle', blurb: 'rqNoteBlurb', line: 'rqNoteLine', reward: 'stickerNote', gift: 'giftNote' },
      referenceProgram: [
        olive('read'),
        blk('repeat', {
          n: 3,
          body: [
            blk('fwd'),
            blk('fwd'),
            blk('if', { slots: { sensor: 'olive_read:red_tulip' }, body: b1('left', 'water', 'right') }),
            blk('if', { slots: { sensor: 'olive_read:yellow_tulip' }, body: b1('right', 'water', 'left') })
          ]
        })
      ]
    },
    {
      id: 'rock-flower',
      islander: 'sami',
      band: 2,
      plot: { x: 28, y: 8 },
      tricks: [4],
      map: ['GGTGGGTH', 'GGGGGGGG', 'GFGFGGGG', 'PPPPPPPP', 'GWWGGGGG', 'GGGGGTGG'],
      things: [
        at('sign', 0, 2, { text: 'The tulips want water today.' }),
        at('tulip', 1, 2, { watered: false, color: 'red' }),
        at('rock', 2, 2, { left: 4 }),
        at('tulip', 3, 2, { watered: false, color: 'red' }),
        at('rock', 4, 2, { left: 4 })
      ],
      robotStart: { x: 0, y: 3, d: 1 },
      goal: goal([{ name: 'every_tulip_watered' }, { name: 'no_puddle' }, { name: 'uses', args: ['olive:is-it-a', 1] }, { name: 'senses', args: ['olive_says:yes', 1] }]),
      palette: ['fwd', 'left', 'right', 'water', 'repeat', 'if'],
      needs: 'echo',
      rungs: ['is-it-a'],
      reward: { kind: 'sticker', id: 'flower', from: 'sami' },
      copyKeys: { title: 'rqFlowerTitle', blurb: 'rqFlowerBlurb', line: 'rqFlowerLine', reward: 'stickerFlower', gift: 'giftFlower' },
      referenceProgram: [
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
      map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPB', 'GWWGGRGG', 'GGGGGTGG'],
      things: [at('note', 0, 2, { text: 'Take the letter to Mamie Rose.' }), at('letter', 1, 3)],
      robotStart: { x: 0, y: 3, d: 1 },
      goal: goal([{ name: 'thing_at', args: ['letter', 7, 3] }, { name: 'said', args: [1] }, { name: 'uses', args: ['olive:say-thanks', 1] }]),
      palette: ['fwd', 'left', 'right', 'pick', 'put', 'repeat'],
      needs: 'pocket',
      challenge: 'predict',
      rungs: ['say-thanks'],
      reward: { kind: 'sticker', id: 'thanks', from: 'sami' },
      copyKeys: { title: 'rqThanksTitle', blurb: 'rqThanksBlurb', line: 'rqThanksLine', reward: 'stickerThanks', gift: 'giftThanks' },
      referenceProgram: [blk('pick'), blk('repeat', { n: 6, body: b1('fwd') }), blk('put'), olive('say-thanks', { to: 'Mamie Rose', deed: 'carried her letter' })]
    }
  ];
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
  { id: 'pocket', defaultName: s('Pocket', 'Poche'), colour: '#FFB347', accessory: 'satchel', palette: ['pick', 'put', 'say', 'olive:say-thanks'], canMax: 3, basket: 6, upgrade: 'boots', lentBy: 'biscuit', unlockedBy: 'bowl-if' },
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
  choose?: ReadonlyArray<{ thing: string; field: string; among: ReadonlyArray<unknown> }>;
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
