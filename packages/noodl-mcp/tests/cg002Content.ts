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
 *   is no "tell me" line, by ruling (TPL-012 finding 5).
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
  name: 'every_tulip_watered' | 'thing_at' | 'bowl_has' | 'robot_at' | 'facing' | 'carrying' | 'uses' | 'handled' | 'said' | 'no_puddle';
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
 * gate proves it); `copyKeys` name the word-table keys the card shows.
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
  reward: { kind: 'hat' | 'sticker' | 'seed' | 'item'; id: string; from: 'sami' | 'mamie' | 'biscuit' };
  copyKeys: { title: string; blurb: string; line: string; reward: string };
  referenceProgram: ReadonlyArray<Block>;
}

const MOCKUP_MAP = ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] as const;

let nextId = 1;
const blk = (t: BlockType, extra: Partial<Block> = {}): Block => ({ id: nextId++, t, ...extra });
const b1 = (...types: BlockType[]) => types.map((t) => blk(t));

/** The three D3 requests, then one per remaining trick, so AC1 covers all seven and `say`. */
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
    copyKeys: { title: 'rqPathTitle', blurb: 'rqPathBlurb', line: 'rqPathLine', reward: 'hatCap' },
    referenceProgram: b1('fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd')
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
    copyKeys: { title: 'rqTulipsTitle', blurb: 'rqTulipsBlurb', line: 'rqTulipsLine', reward: 'hatSun' },
    referenceProgram: [blk('repeat', { n: 3, body: b1('fwd', 'fwd', 'left', 'water', 'right') })]
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
    reward: { kind: 'hat', id: 'crown', from: 'biscuit' },
    copyKeys: { title: 'rqBowlTitle', blurb: 'rqBowlBlurb', line: 'rqBowlLine', reward: 'hatCrown' },
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
    reward: { kind: 'sticker', id: 'letter', from: 'sami' },
    copyKeys: { title: 'rqLetterTitle', blurb: 'rqLetterBlurb', line: 'rqLetterLine', reward: 'stickerLetter' },
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
    reward: { kind: 'sticker', id: 'paw', from: 'biscuit' },
    copyKeys: { title: 'rqWallTitle', blurb: 'rqWallBlurb', line: 'rqWallLine', reward: 'stickerPaw' },
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
    reward: { kind: 'item', id: 'bell', from: 'biscuit' },
    copyKeys: { title: 'rqMeowTitle', blurb: 'rqMeowBlurb', line: 'rqMeowLine', reward: 'itemBell' },
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
    goal: [{ name: 'carrying', args: ['egg', 4] }, { name: 'uses', args: ['count_inc', 1] }, { name: 'thing_at', args: ['egg', 5, 3] }],
    palette: ['fwd', 'left', 'right', 'pick', 'until', 'count_inc'],
    reward: { kind: 'item', id: 'basket', from: 'mamie' },
    copyKeys: { title: 'rqEggsTitle', blurb: 'rqEggsBlurb', line: 'rqEggsLine', reward: 'itemBasket' },
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
    reward: { kind: 'item', id: 'gnome', from: 'mamie' },
    copyKeys: { title: 'rqRowsTitle', blurb: 'rqRowsBlurb', line: 'rqRowsLine', reward: 'itemGnome' },
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

// ── The hint table ──────────────────────────────────────────────────────────

/**
 * Keys by state (CG-002 §2): empty program, an unfolded repetition, a goal
 * unmet with the count of what was done, a bump, a puddle, a Predict miss, a
 * done-with-many-blocks, the start, and the Olive keys (thinking, resting, one
 * per rung). `{b}` is the robot's name; `{n}`, `{w}`, `{t}`, `{k}`, `{x}`, `{y}`
 * are filled by the page from `CHOOSE_HINT_SCRIPT`'s `vars`. Never a "tell me".
 */
export const HINTS: Readonly<Record<string, Bi>> = {
  hintStart: s('Hello! Someone on the island is waiting. Press Teach and show {b} what to do.', 'Coucou ! Quelqu’un t’attend sur l’île. Appuie sur Apprendre et montre à {b} quoi faire.'),
  hintEmpty: s('Drive {b} yourself first: press Teach and use the arrows. {b} remembers every step.', 'Conduis {b} toi-même d’abord : appuie sur Apprendre et utilise les flèches. {b} retient chaque pas.'),
  hintPattern: s('Look at the steps: the same little dance, over and over. What if {b} could "do this {n} times"?', 'Regarde les pas : la même petite danse, encore et encore. Et si {b} pouvait « faire ça {n} fois » ?'),
  hintMissed: s('{b} did {w} of {t}. Which one did {b} walk past?', '{b} en a fait {w} sur {t}. Lequel a-t-il raté ?'),
  hintBump: s('{b} bumped into something. Which step sent {b} the wrong way?', '{b} s’est cogné. Quel pas l’a envoyé du mauvais côté ?'),
  hintWet: s('A puddle! {b} watered where there is no tulip. Where was {b} facing?', 'Une flaque ! {b} a arrosé là où il n’y a pas de tulipe. Il regardait où ?'),
  hintDone: s('Perfect! Could you do it with fewer blocks? A repeat counts as one.', 'Parfait ! Tu peux le faire avec moins de blocs ? Un « répéter » compte pour un.'),
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
  oliveRung8: s('Olive got the small sum and missed the big one. A rule beats a guess.', 'Olive a réussi la petite somme et raté la grande. Une règle bat une devinette.'),
  oliveRung9: s('Olive ignored "under 5 words". The shape card kept the rule for her.', 'Olive a ignoré « moins de 5 mots ». La carte de forme a gardé la règle à sa place.'),
  oliveRung10: s('Olive answered with confidence. Check it in a book before you believe it.', 'Olive a répondu avec assurance. Vérifie dans un livre avant de la croire.'),
  oliveRung11: s('Olive translates one way better than the other. Tools have a good direction.', 'Olive traduit mieux dans un sens que dans l’autre. Les outils ont un bon sens.'),
  oliveRung12: s('A poem for the tulip. Sometimes silly, always hers.', 'Un poème pour la tulipe. Parfois farfelu, toujours le sien.')
};

export const HINT_KEYS: ReadonlyArray<string> = Object.keys(HINTS);

// ── The word table ──────────────────────────────────────────────────────────

/**
 * Every string, keyed. Block labels come twice: `b*` is the band 10–12 word,
 * `c*` the band 7–9 caption (short, read as a caption under an icon). `{b}` is
 * the robot's name.
 */
export const WORDS: Readonly<Record<string, Bi>> = {
  brand: s('Bot Garden', 'Bot Garden'),
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
  guD2: s('Saved on this computer. A save code moves a garden to another computer.', 'Sauvegardé sur cet ordinateur. Un code de sauvegarde déplace un jardin vers un autre ordinateur.'),
  guD3: s('No timers, streaks, points or "you missed a day". Rewards are cosmetic and always earnable.', 'Pas de chrono, de série, de points ni de « tu as raté un jour ». Les récompenses sont décoratives et toujours gagnables.'),
  guTryH: s('Try Olive', 'Essayer Olive'),
  guTryGo: s('Ask', 'Demander'),
  saveCodeH: s('Save code', 'Code de sauvegarde'),
  saveCodeCopy: s('Copy the code', 'Copier le code'),
  saveCodePaste: s('Paste a code', 'Coller un code'),
  saveCodeBad: s('That code is not a garden.', 'Ce code n’est pas un jardin.')
};

/** The word keys, for the generated translate script and the gate. */
export const WORD_KEYS: ReadonlyArray<string> = Object.keys(WORDS);

export const REQUESTS_JSON = JSON.stringify(REQUESTS, null, 2);
export const HINTS_JSON = JSON.stringify(HINT_KEYS.map((key) => ({ key, en: HINTS[key].en, fr: HINTS[key].fr })), null, 2);
export const WORDS_JSON = JSON.stringify(WORD_KEYS.map((key) => ({ key, en: WORDS[key].en, fr: WORDS[key].fr })), null, 2);
