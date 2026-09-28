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
 * Every block type the engine knows. The band-1 palette is the first six; the
 * rest arrive in band 10–12 (TPL-012 §2.2).
 */
export const BLOCK_TYPES = [
  'fwd', 'left', 'right', 'water', 'pick', 'put',
  'say', 'repeat', 'until', 'if', 'when', 'count_inc', 'trick', 'do', 'ask'
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** The sensors a `until` / `if` block may read. `count_is` and `olive_says` take an arg. */
export const SENSORS = ['wall_ahead', 'tulip_ahead', 'bowl_empty', 'basket_full', 'count_is', 'olive_says'] as const;
export type Sensor = (typeof SENSORS)[number];

/** The events a `when` block may arm. The world fires them (a request's schedule). */
export const EVENTS = ['meow'] as const;

/** The palette a band may use, by block id (CG-001's `Palette` is built from this plus the labels). */
export const BAND_PALETTE: Readonly<Record<Band, ReadonlyArray<BlockType>>> = {
  1: ['fwd', 'left', 'right', 'water', 'pick', 'put'],
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
  name: 'every_tulip_watered' | 'thing_at' | 'bowl_has' | 'robot_at' | 'facing' | 'carrying' | 'uses' | 'handled' | 'said' | 'no_puddle' | 'senses';
  args?: ReadonlyArray<string | number>;
}

/** A thing on a tile. `watered` on a tulip, `food` on a bowl, `text` on a label. */
export interface Thing {
  kind: 'tulip' | 'bowl' | 'letter' | 'egg' | 'stone' | 'food' | 'label' | 'puddle';
  x: number;
  y: number;
  watered?: boolean;
  food?: number;
  text?: string;
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
 */
export interface GardenRequest {
  id: string;
  islander: 'sami' | 'mamie' | 'biscuit';
  band: Band;
  tricks: ReadonlyArray<number>;
  map: ReadonlyArray<string>;
  things: ReadonlyArray<Thing>;
  robotStart: { x: number; y: number; d: number; carry?: ReadonlyArray<string>; basket?: number };
  schedule?: ReadonlyArray<{ tick: number; event: string }>;
  goal: Goal | ReadonlyArray<Goal>;
  palette: ReadonlyArray<BlockType>;
  /**
   * The Olive rungs this request offers as `ask:<rung>` blocks (ids of `olive-templates.json`), band 10-12 requests only
   * (Richard's ruling 4, 2026-09-28: Olive's lessons are band 10-12; band 7-9 keeps the owl's hints and offers no rung).
   * CG-005 s3: each rung sits with the islander §3 frames it with and the trick it fits; the rest are free play's.
   */
  rungs?: ReadonlyArray<string>;
  reward: { kind: 'hat' | 'sticker' | 'seed' | 'item'; id: string; from: 'sami' | 'mamie' | 'biscuit' };
  copyKeys: { title: string; blurb: string; line: string; reward: string; gift: string };
  referenceProgram: ReadonlyArray<Block>;
}

const MOCKUP_MAP = ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] as const;

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
    id: 'tulips-three',
    islander: 'mamie',
    band: 1,
    tricks: [2],
    map: MOCKUP_MAP,
    things: [
      { kind: 'tulip', x: 2, y: 2, watered: false },
      { kind: 'tulip', x: 4, y: 2, watered: false },
      { kind: 'tulip', x: 6, y: 2, watered: false }
    ],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: { name: 'every_tulip_watered' },
    palette: ['fwd', 'left', 'right', 'water', 'repeat'],
    reward: { kind: 'hat', id: 'sun', from: 'mamie' },
    copyKeys: { title: 'rqTulipsTitle', blurb: 'rqTulipsBlurb', line: 'rqTulipsLine', reward: 'hatSun', gift: 'giftSun' },
    referenceProgram: [blk('repeat', { n: 3, body: b1('fwd', 'fwd', 'left', 'water', 'right') })]
  },
  {
    // CG-006 §2 row 2b: repeat, with put. The path stops at (2,3); four stones carry it to the post box at (7,3).
    id: 'path-stones',
    islander: 'sami',
    band: 1,
    tricks: [2],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPGGGGB', 'GWWGGRGG', 'GGGGGTGG'],
    things: [],
    robotStart: { x: 2, y: 3, d: 1, carry: ['stone', 'stone', 'stone', 'stone'], basket: 4 },
    goal: [
      { name: 'thing_at', args: ['stone', 3, 3] },
      { name: 'thing_at', args: ['stone', 4, 3] },
      { name: 'thing_at', args: ['stone', 5, 3] },
      { name: 'thing_at', args: ['stone', 6, 3] }
    ],
    palette: ['fwd', 'left', 'right', 'put', 'repeat'],
    reward: { kind: 'seed', id: 'seeds', from: 'sami' },
    copyKeys: { title: 'rqStonesTitle', blurb: 'rqStonesBlurb', line: 'rqStonesLine', reward: 'seeds', gift: 'giftSeeds' },
    referenceProgram: [blk('repeat', { n: 4, body: b1('put', 'fwd') })]
  },
  {
    id: 'bowl-if',
    islander: 'biscuit',
    band: 2,
    tricks: [4],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [
      { kind: 'bowl', x: 2, y: 2, food: 1 },
      { kind: 'bowl', x: 4, y: 2, food: 0 }
    ],
    robotStart: { x: 0, y: 3, d: 1, carry: ['food', 'food'] },
    goal: [{ name: 'bowl_has', args: [4, 2, 1] }, { name: 'bowl_has', args: [2, 2, 1] }, { name: 'uses', args: ['if', 1] }],
    palette: ['fwd', 'left', 'right', 'put', 'repeat', 'if'],
    rungs: ['what-wants', 'is-it-a'],
    reward: { kind: 'hat', id: 'crown', from: 'biscuit' },
    copyKeys: { title: 'rqBowlTitle', blurb: 'rqBowlBlurb', line: 'rqBowlLine', reward: 'hatCrown', gift: 'giftCrown' },
    referenceProgram: [
      blk('repeat', {
        n: 2,
        body: [blk('fwd'), blk('fwd'), blk('left'), blk('if', { slots: { sensor: 'bowl_empty' }, body: [blk('put')] }), blk('right')]
      })
    ]
  },
  {
    id: 'letter-say',
    islander: 'sami',
    band: 2,
    tricks: [1],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPB', 'GWWGGRGG', 'GGGGGTGG'],
    things: [{ kind: 'letter', x: 1, y: 3 }],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: [{ name: 'thing_at', args: ['letter', 7, 3] }, { name: 'said', args: [1] }],
    palette: ['fwd', 'left', 'right', 'pick', 'put', 'say', 'repeat'],
    rungs: ['say-thanks', 'translate', 'letter'],
    reward: { kind: 'sticker', id: 'letter', from: 'sami' },
    copyKeys: { title: 'rqLetterTitle', blurb: 'rqLetterBlurb', line: 'rqLetterLine', reward: 'stickerLetter', gift: 'giftLetter' },
    referenceProgram: [blk('pick'), blk('repeat', { n: 6, body: b1('fwd') }), blk('put'), blk('say', { slots: { text: 'thanksSami' } })]
  },
  {
    id: 'wall-until',
    islander: 'biscuit',
    band: 2,
    tricks: [3],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [],
    robotStart: { x: 0, y: 3, d: 1 },
    goal: [{ name: 'robot_at', args: [7, 3] }, { name: 'facing', args: [0] }, { name: 'uses', args: ['until', 1] }],
    palette: ['fwd', 'left', 'right', 'until'],
    rungs: ['words-to-blocks', 'count-in-words'],
    reward: { kind: 'sticker', id: 'paw', from: 'biscuit' },
    copyKeys: { title: 'rqWallTitle', blurb: 'rqWallBlurb', line: 'rqWallLine', reward: 'stickerPaw', gift: 'giftPaw' },
    referenceProgram: [blk('until', { slots: { sensor: 'wall_ahead' }, body: [blk('fwd')] }), blk('left')]
  },
  {
    id: 'meow-when',
    islander: 'biscuit',
    band: 2,
    tricks: [5],
    map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
    things: [{ kind: 'bowl', x: 3, y: 3, food: 0 }],
    robotStart: { x: 0, y: 3, d: 1 },
    schedule: [{ tick: 1, event: 'meow' }, { tick: 4, event: 'meow' }],
    goal: [{ name: 'handled', args: ['meow', 2] }, { name: 'robot_at', args: [2, 3] }],
    palette: ['fwd', 'left', 'right', 'when'],
    rungs: ['narrate-run'],
    reward: { kind: 'item', id: 'bell', from: 'biscuit' },
    copyKeys: { title: 'rqMeowTitle', blurb: 'rqMeowBlurb', line: 'rqMeowLine', reward: 'itemBell', gift: 'giftBell' },
    referenceProgram: [blk('when', { slots: { event: 'meow' }, body: [blk('fwd')] })]
  },
  {
    id: 'eggs-count',
    islander: 'mamie',
    band: 2,
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
    rungs: ['count-tulips', 'maths-seeds', 'maths'],
    reward: { kind: 'item', id: 'basket', from: 'mamie' },
    copyKeys: { title: 'rqEggsTitle', blurb: 'rqEggsBlurb', line: 'rqEggsLine', reward: 'itemBasket', gift: 'giftBasket' },
    referenceProgram: [blk('until', { slots: { sensor: 'count_is', arg: 4 }, body: b1('pick', 'count_inc', 'fwd') })]
  },
  {
    id: 'rows-trick',
    islander: 'mamie',
    band: 2,
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
    rungs: ['name-one', 'name-three', 'name-trick', 'explain-program'],
    reward: { kind: 'item', id: 'gnome', from: 'mamie' },
    copyKeys: { title: 'rqRowsTitle', blurb: 'rqRowsBlurb', line: 'rqRowsLine', reward: 'itemGnome', gift: 'giftGnome' },
    referenceProgram: [
      blk('trick', { slots: { name: 'row' }, body: [blk('repeat', { n: 3, body: b1('fwd', 'fwd', 'left', 'water', 'right') })] }),
      blk('do', { slots: { name: 'row' } }),
      blk('right'),
      blk('right'),
      blk('do', { slots: { name: 'row' } })
    ]
  }
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
  { n: 1, mark: 'green', examColumn: 'green', islander: 'sami', band: 2, block: 'say', shape: 'sentence', table: ['say-thanks'], probes: ['P01', 'P02'], copyKeys: rungKeys(1) },
  { n: 2, mark: 'green', examColumn: 'green', islander: 'mamie', band: 2, block: 'ask', shape: 'list_of_3', table: ['name-three', 'name-one'], probes: ['P03', 'P04', 'P05', 'P24', 'P25'], copyKeys: rungKeys(2) },
  { n: 3, mark: 'green', examColumn: 'green', islander: 'sami', band: 2, block: 'ask', shape: 'blocks', table: ['words-to-blocks'], probes: ['P06', 'P07', 'P08', 'P23'], copyKeys: rungKeys(3) },
  { n: 4, mark: 'grad', examColumn: 'grad', islander: 'sami', band: 2, block: 'ask', shape: 'blocks', table: ['count-in-words'], probes: ['P09', 'P26'], copyKeys: rungKeys(4) },
  { n: 5, mark: 'green', examColumn: 'green', islander: 'biscuit', band: 2, block: 'ask', shape: 'one_of', table: ['what-wants'], probes: ['P10', 'P11', 'P27'], copyKeys: rungKeys(5) },
  { n: 6, mark: 'grad', examColumn: 'green', islander: null, band: 2, block: 'if', shape: 'yes_no', table: ['is-it-a'], probes: ['P12', 'P13', 'P28'], copyKeys: rungKeys(6) },
  { n: 7, mark: 'grad', examColumn: 'grad', islander: 'mamie', band: 2, block: 'ask', shape: 'integer', table: ['count-tulips'], probes: ['P14', 'P29'], copyKeys: rungKeys(7) },
  { n: 8, mark: 'grad', examColumn: 'both', islander: null, band: 2, block: 'ask', shape: 'integer', table: ['maths-seeds', 'maths'], probes: ['P15', 'P16', 'P30', 'P31'], copyKeys: rungKeys(8) },
  { n: 9, mark: 'grad', examColumn: 'grad', islander: null, band: 2, block: 'ask', shape: 'sentence', table: ['no-letter-e'], probes: ['R9-G1-fr', 'R9-G1-en'], copyKeys: rungKeys(9) },
  { n: 10, mark: 'grad', examColumn: 'grad', islander: null, band: 2, block: null, shape: null, table: ['tall-tales'], probes: ['P18', 'P33'], copyKeys: rungKeys(10) },
  { n: 11, mark: 'green', examColumn: 'both', islander: 'sami', band: 2, block: 'ask', shape: 'sentence', table: ['translate'], probes: ['P19', 'P20'], copyKeys: rungKeys(11) },
  { n: 12, mark: 'green', examColumn: 'green', islander: null, band: 2, block: 'ask', shape: 'two_lines', table: ['poem'], probes: ['P21', 'P34'], copyKeys: rungKeys(12) },
  // CG-006 §4's moments, promoted on the real-model readings of §7.1 (CPU and Metal agreed on every decision).
  { n: 13, mark: 'green', examColumn: 'green', islander: null, band: 2, block: 'ask', shape: 'sentence', table: ['explain-program'], probes: ['E3-fr', 'E3-en', 'E3-count'], copyKeys: momentKeys(13, 3), moment: 'E3' },
  { n: 14, mark: 'green', examColumn: 'green', islander: null, band: 2, block: 'ask', shape: 'sentence', table: ['narrate-run'], probes: ['E4-fr', 'E4-en'], copyKeys: momentKeys(14, 4), moment: 'E4' },
  { n: 15, mark: 'green', examColumn: 'green', islander: null, band: 2, block: 'ask', shape: 'one_word', table: ['name-trick'], probes: ['E5-fr', 'E5-apt', 'E5-en'], copyKeys: momentKeys(15, 5), moment: 'E5' },
  { n: 16, mark: 'grad', examColumn: 'grad', islander: null, band: 2, block: 'ask', shape: 'list_of_3', table: ['sort-words'], probes: ['E8-fr', 'E8-en'], copyKeys: momentKeys(16, 8), moment: 'E8' },
  { n: 17, mark: 'grad', examColumn: 'mixed', islander: null, band: 2, block: 'ask', shape: 'sentence', table: ['define'], probes: ['E9-arrosoir', 'E9-chouette', 'E9-rocher', 'E9-en'], copyKeys: momentKeys(17, 9), moment: 'E9' },
  { n: 18, mark: 'green', examColumn: 'green', islander: null, band: 2, block: 'ask', shape: 'sentence', table: ['letter'], probes: ['E10-fr', 'E10-en'], copyKeys: momentKeys(18, 10), moment: 'E10' }
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
  hintPredictMiss: s('You tapped one tile, {b} stopped on another. Follow the steps with your finger, one by one.', 'Tu as touché une case, {b} s’est arrêté sur une autre. Suis les pas avec ton doigt, un par un.'),
  oliveThinking: s('Olive is thinking…', 'Olive réfléchit…'),
  oliveResting: s('Olive is resting. Here is her written line.', 'Olive se repose. Voici sa phrase écrite.'),
  oliveRung1: s('Run it twice: Olive never says a thank-you the same way.', 'Lance-le deux fois : Olive ne dit jamais un merci de la même façon.'),
  oliveRung2: s('Turn the dial: "same every time" or "surprise me". Olive changes her mind.', 'Tourne la molette : « pareil à chaque fois » ou « surprends-moi ». Olive change d’avis.'),
  oliveRung3: s('Olive turned the words into blocks. Place them and see if {b} agrees.', 'Olive a transformé les mots en blocs. Pose-les et vois si {b} est d’accord.'),
  oliveRung4: s('Olive gave one step for "three squares". Olive cannot count: a repeat can.', 'Olive a donné un seul pas pour « trois cases ». Olive ne sait pas compter : un « répéter », si.'),
  oliveRung5: s('Olive picked what Biscuit wants. Use "if Olive says…" to send {b} the right way.', 'Olive a trouvé ce que veut Biscuit. Utilise « si Olive dit… » pour envoyer {b} du bon côté.'),
  oliveRung6: s('Olive was wrong about the thing ahead. Ask three times and count the yeses.', 'Olive s’est trompée sur ce qu’il y a devant. Demande trois fois et compte les oui.'),
  oliveRung7: s('Olive guessed a number. A count block does not guess.', 'Olive a deviné un nombre. Un bloc « compter » ne devine pas.'),
  oliveRung8: s('Olive got the small sum right and the big one wrong. A rule beats a guess.', 'Olive a trouvé la petite somme, pas la grande. Une règle bat une devinette.'),
  oliveRung9: s('Olive used the letter e anyway. A program that checks every letter catches it.', 'Olive a quand même utilisé la lettre e. Un programme qui vérifie chaque lettre la prend sur le fait.'),
  oliveRung10: s('Olive answered with confidence. Check it in a book before you believe it.', 'Olive a répondu avec assurance. Vérifie dans un livre avant de la croire.'),
  oliveRung11: s('Olive translates one way better than the other. Tools have a good direction.', 'Olive traduit mieux dans un sens que dans l’autre. Les outils ont un bon sens.'),
  oliveRung12: s('A poem for the tulip. Sometimes silly, always hers.', 'Un poème pour la tulipe. Parfois farfelu, toujours le sien.'),
  oliveRung13: s('Olive read your blocks back. Does her sentence say what {b} did?', 'Olive a relu tes blocs. Sa phrase dit-elle bien ce que {b} a fait ?'),
  oliveRung14: s('Olive told the story of the run. Find the step the puddle came from.', 'Olive a raconté le trajet. Trouve le pas d’où vient la flaque.'),
  oliveRung15: s('Olive suggested a name. Keep it, or give your trick a better one.', 'Olive a proposé un nom. Garde-le, ou trouve mieux pour ton astuce.'),
  oliveRung16: s('Olive’s order is not alphabetical. A program that sorts gets it right every time.', 'L’ordre d’Olive n’est pas alphabétique. Un programme qui range ne se trompe jamais.'),
  oliveRung17: s('Some of Olive’s answers are made up. Which ones? Check in a book.', 'Certaines réponses d’Olive sont inventées. Lesquelles ? Vérifie dans un livre.'),
  oliveRung18: s('Olive wrote the letter her way. The thing asked for is always in it: the check makes sure.', 'Olive a écrit la lettre à sa façon. La chose demandée y est toujours : la vérification s’en assure.')
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
  navRobot: s('My robot', 'Mon robot'),
  navSkills: s('Skills', 'Astuces'),
  navGrown: s('Grown-ups', 'Parents'),
  navProfiles: s('Profiles', 'Profils'),
  // Band 10–12 block words.
  bFwd: s('forward', 'avancer'),
  bLeft: s('turn left', 'tourner à gauche'),
  bRight: s('turn right', 'tourner à droite'),
  bWater: s('water', 'arroser'),
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
  // Band 7–9 captions.
  cFwd: s('go', 'hop'),
  cLeft: s('left', 'gauche'),
  cRight: s('right', 'droite'),
  cWater: s('water', 'eau'),
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
  // Sensors and events.
  sWallAhead: s('the wall is ahead', 'le mur est devant'),
  sTulipAhead: s('a tulip is ahead', 'une tulipe est devant'),
  sBowlEmpty: s('the bowl is empty', 'la gamelle est vide'),
  sBasketFull: s('the basket is full', 'le panier est plein'),
  sCountIs: s('the count is', 'le compte est'),
  sOliveSays: s('Olive says', 'Olive dit'),
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
  rqTulipsLine: s('"My three tulips are so thirsty. Can {b} water them for me?"', '« Mes trois tulipes ont tellement soif. {b} peut les arroser pour moi ? »'),
  rqBowlTitle: s('Feed me, but only if my bowl is empty', 'Nourris-moi, mais seulement si ma gamelle est vide'),
  rqBowlBlurb: s('If', 'Si'),
  rqBowlLine: s('"Two bowls. One is full already. Fill only the empty one, {b}!"', '« Deux gamelles. L’une est déjà pleine. Remplis seulement la vide, {b} ! »'),
  rqLetterTitle: s('Deliver a letter and say something kind', 'Livre une lettre et dis quelque chose de gentil'),
  rqLetterBlurb: s('Say', 'Dire'),
  rqLetterLine: s('"Take my letter to the post box, and say something nice when you get there."', '« Porte ma lettre à la boîte aux lettres, et dis quelque chose de gentil en arrivant. »'),
  rqWallTitle: s('Walk to the wall, then turn', 'Va jusqu’au mur, puis tourne'),
  rqWallBlurb: s('Repeat until', 'Répéter jusqu’à'),
  rqWallLine: s('"Keep going until the wall, then turn left. I want to see {b} stop by itself."', '« Continue jusqu’au mur, puis tourne à gauche. Je veux voir {b} s’arrêter tout seul. »'),
  rqMeowTitle: s('When I meow, come to the bowl', 'Quand je miaule, viens à la gamelle'),
  rqMeowBlurb: s('When', 'Quand'),
  rqMeowLine: s('"Every time I meow, {b} takes one step towards my bowl. Miaow!"', '« À chaque miaulement, {b} fait un pas vers ma gamelle. Miaou ! »'),
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
  rqStonesLine: s('"My path stops too soon. Four stones, one after the other, all the way to the post box!"', '« Mon chemin s’arrête trop tôt. Quatre pierres, l’une après l’autre, jusqu’à la boîte aux lettres ! »'),
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
  n1p: s('{b} does exactly what you say, one step after another.', '{b} fait exactement ce que tu dis, un pas après l’autre.'),
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
  saveCodeBad: s('That code is not an island save.', 'Ce code n’est pas une sauvegarde de l’île.')
};

/** The word keys, for the generated translate script and the gate. */
export const WORD_KEYS: ReadonlyArray<string> = Object.keys(WORDS);

export const REQUESTS_JSON = JSON.stringify(REQUESTS, null, 2);
export const OLIVE_RUNGS_JSON = JSON.stringify(OLIVE_RUNGS, null, 2);
export const HINTS_JSON = JSON.stringify(HINT_KEYS.map((key) => ({ key, en: HINTS[key].en, fr: HINTS[key].fr })), null, 2);
export const WORDS_JSON = JSON.stringify(WORD_KEYS.map((key) => ({ key, en: WORDS[key].en, fr: WORDS[key].fr })), null, 2);
