/**
 * TPL-013 — Star Class: Rocket School's edition for school children in Sub-Saharan Africa.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## An edition, not a fork
 *
 * Rocket School (TPL-007) is ~16 000 lines of generator, and almost none of it is
 * French: the engine, the four games, the hangar, the moon and the profiles are
 * the same for a child in Lagos as for one in Lyon. What is French is a short,
 * countable list (measured 2026-10-14 over the 101 components):
 *
 * | what | where | hits |
 * |---|---|---|
 * | the class names CE2 · CM1 · CM2 · 6e | the curriculum, 20 engine scripts, the new-player form | 284 |
 * | the euro | the proportion question, its worked line, its Teach card | 21 |
 * | French history | the history bank (Landmarks of French history, prehistory, antiquity) | 7 |
 * | the name and the save key | Data/Words, four page titles, the store | 9 |
 *
 * So {@link editionComponents} takes the components TPL-007 authors and changes
 * exactly those, and the door writes the result through the same plan. Rocket
 * School's own artefact is untouched (its drift gate says so), and a fix to the
 * engine reaches both games on the next regeneration.
 *
 * ## 🔴 Every replacement is counted
 *
 * TPL-007 §11 trap 1: an edit script that asserts before writing can write
 * nothing, and the pipeline after it measures the old artefact. Here a
 * replacement that does not match the number of times it is expected to is a
 * thrown error, and {@link frenchLeftIn} is the gate's census of what must be
 * gone from the result.
 *
 * ## What waits on a ruling (TPL-013 §6)
 *
 * The name, which countries' class names and money, and whether the levels stay
 * four. Each is one field of {@link AFRICA_EDITION}.
 *
 * @module noodl-mcp/tests/tpl013Edition
 */
import { CURRICULUM, LEVELS, TEACH_CARDS, WORDS, type Level, type Skill, type TeachCard } from './tpl007Curriculum';
import { STORAGE_KEY, TPL007_COMPONENTS, type Tpl007Component } from './tpl007Components';
import { HUNT_KINDS, HUNT_LEVEL_KINDS, LEVEL_BASE, MERGE_POOL_GROUPS, SKIN_DEFAULT, SKIN_TONES } from './tpl007Scripts';
import { SUBJECTS, TOPICS } from './tpl007Subjects';
import { DISPLAY_FONT } from './tpl007Theme';
import { YOUNG_CASES, YOUNG_GENERATORS, YOUNG_SKILLS, YOUNG_TOPIC } from './tpl013Young';
import { JSS_CASES, JSS_GENERATORS, JSS_SKILLS, JSS_TOPICS } from './tpl013Jss';
import { BANK_SKILLS, BANK_TOPICS } from './tpl013Banks';
import { TEMPLATE_ID as ROCKET_ID, TEMPLATE_PROJECT_NAME as ROCKET_NAME } from './tpl007Template';

export interface Edition {
  /** The template folder, and the id the generator refuses to clear anything else under. */
  id: string;
  /** The project name, the page titles and the app's name on screen. */
  name: string;
  /** The localStorage key — different from Rocket School's so both can live in one browser on nodegx.io. */
  storageKey: string;
  /** Rocket School's class → this edition's, one for one. Ids must be single words: the engine matches them whole. */
  levels: Readonly<Record<Level, string>>;
  /** The class a skill marked `beyond` (Rocket School's 5e) belongs to. When it is one of `classes`, those skills are that class's own. */
  beyond: string;
  /** SC-1: every class this edition offers, youngest first. `levels` names four of them. */
  classes: ReadonlyArray<string>;
  /**
   * SC-1: how many classes below the one picked a new player starts. TPL-013 §2.1.2: most children are two or three years
   * behind their class, so the class is a label and a first guess. The rating starts there and the race climbs from it.
   */
  startBelow: number;
  /**
   * s3 (Richard, 2026-10-15): "the level should be more a starting yard stick which the system can adapt if the kid needs to go
   * up or down a level". `up` right answers in a row lift the race a class (it says ⬆️ and the class); `down` misses in a row
   * drop it one (silently). Neither stops at the class picked.
   */
  jump: { up: number; down: number };
  /**
   * SC-5 (Richard, 2026-10-15: "darker by default"): the skin tones (`SKIN_TONES` ids) a face's seed chooses among until the child
   * picks one. Rocket School's is empty, which leaves DiceBear's own range, about half of it light.
   */
  skinDefault: ReadonlyArray<string>;
  /** SC-1: Number Hunt by class, one entry per class of `classes`: the kinds drawn, and each kind's biggest square (0 = never). */
  hunt: {
    kinds: ReadonlyArray<ReadonlyArray<HuntKind>>;
    max: Readonly<Record<HuntKind, ReadonlyArray<number>>>;
    /** s5: the classes whose grid is asked as a picture (`❓ + ❓ = 14`), not a sentence: they cannot read it yet (§2.2.2). */
    pictures: ReadonlyArray<string>;
  };
  /** SC-2: skills this edition adds, already in its own class names, and the topics they are filed under (shown first). */
  addSkills: ReadonlyArray<Skill>;
  addTopics: ReadonlyArray<{ id: string; subject: string; name: { en: string; fr: string } }>;
  /** SC-2: the generators those skills name: code put beside `generate`, and the cases its switch gains. */
  addGenerators: { code: string; cases: string };
  /** Subjects whose skills this edition does not ship (the chooser hides a subject with no skills). */
  dropSubjects: ReadonlyArray<string>;
  /** SC-4: the subjects the chooser offers, in its order: Rocket School's that are kept, and this edition's own (a bank's). */
  subjects: ReadonlyArray<{ id: string; name: { en: string; fr: string }; glyph: string }>;
  /**
   * SC-4: a topic of Rocket School's filed under another subject here, and renamed. Its skills move with it. Rocket School's
   * English word lists are French ↔ English: for a child whose school is in English, they are French words.
   */
  moveTopics: Readonly<Record<string, { subject: string; name: { en: string; fr: string } }>>;
  /** Nodes to take out, per component: a setting that only served a dropped subject. Their wires and places go with them. */
  removeNodes: Readonly<Record<string, ReadonlyArray<string>>>;
  /** Nodes and wires to add, per component; a visual node is placed under a parent the component has (see `Graft`). */
  addNodes: Readonly<Record<string, Graft>>;
  /** Money, per language: the symbol and where it sits, and how many of it one euro of the original question becomes. */
  money: { scale: number; en: { prefix: string; suffix: string }; fr: { prefix: string; suffix: string } };
}

type HuntKind = keyof typeof HUNT_KINDS;

/**
 * What an edition adds to one component. `ports` grows its Component Inputs or Outputs node (and the component's own port list
 * with it), so a value can travel through an instance; `place` puts a visual node into a parent's children, at an index.
 */
export interface Graft {
  nodes: ReadonlyArray<unknown>;
  connections: ReadonlyArray<unknown>;
  ports?: Readonly<Record<string, ReadonlyArray<[string, string]>>>;
  place?: ReadonlyArray<{ id: string; parent: string; at: number }>;
  /** Parameters merged into a node the component already has (s5: a new Function input that only the Run signal reads). */
  params?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

/** An answer that is only pictures (no digit, no letter) is drawn at --text-3xl; anything else at the button's own --text-xl. */
export const OPTION_SIZE_SCRIPT = [
  "var label = String(Inputs.label || '');",
  "Outputs.size = /[0-9]/.test(label) || label.toLowerCase() !== label.toUpperCase() ? 'var(--text-xl)' : 'var(--text-3xl)';"
].join('\n');

/** s4: the jump's own moment, over the verdict's headline. Numerals and a glyph only: P1–P2 cannot read (§2.2.2). */
export const JUMP_CARD: Graft = {
  ports: { fbIn: [['jumpTo', 'string']] },
  place: [{ id: 'fbJump', parent: 'fbCard', at: 0 }],
  nodes: [
    {
      id: 'fbJump',
      type: 'Group',
      label: 'Up a class',
      parent: 'fbCard',
      parameters: {
        sizeMode: 'contentSize',
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 'var(--space-2)',
        backgroundColor: 'var(--primary)',
        borderRadius: 'var(--radius-full)',
        paddingLeft: 'var(--space-6)',
        paddingRight: 'var(--space-6)',
        paddingTop: 'var(--space-2)',
        paddingBottom: 'var(--space-2)',
        cssClassName: 'rkt-result',
        mounted: false
      },
      children: ['fbJumpGlyph', 'fbJumpClass']
    },
    { id: 'fbJumpGlyph', type: 'Text', label: 'The arrow', parent: 'fbJump', parameters: { text: '⬆️', sizeMode: 'contentSize', fontSize: 'var(--text-4xl)', cssClassName: 'rkt-result-glyph' } },
    {
      id: 'fbJumpClass',
      type: 'Text',
      label: 'The class it went up to',
      parent: 'fbJump',
      parameters: { text: '', sizeMode: 'contentSize', fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-extrabold)', color: 'var(--primary-foreground)', fontFamily: DISPLAY_FONT }
    },
    { id: 'fbHasJump', type: 'Expression', label: 'Up a class?', parameters: { expression: "((jumpTo || '') + '').length > 0" } }
  ],
  connections: [
    { fromId: 'fbIn', fromProperty: 'jumpTo', toId: 'fbJumpClass', toProperty: 'text' },
    { fromId: 'fbIn', fromProperty: 'jumpTo', toId: 'fbHasJump', toProperty: 'jumpTo' },
    { fromId: 'fbHasJump', fromProperty: 'result', toId: 'fbJump', toProperty: 'mounted' }
  ]
};

export const AFRICA_EDITION: Edition = {
  // Richard, 2026-10-14: "For the name, let's go with Star Class".
  id: 'star-class',
  name: 'Star Class',
  storageKey: 'star-class',
  // Nigeria's and Liberia's names (Primary 3, Grade 3); Ghana says Basic 3, Kenya Grade 3. P3 reads as all of them.
  levels: { CE2: 'P3', CM1: 'P4', CM2: 'P5', '6e': 'P6' },
  beyond: 'JSS1',
  // TPL-013 §2.2.1: Primary 1 to the end of junior secondary (Ghana B9, Kenya Grade 9, Francophone 3e).
  classes: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'JSS1', 'JSS2', 'JSS3'],
  startBelow: 2,
  jump: { up: 5, down: 3 },
  // ✋🏽 ✋🏾 ✋🏿: brown to darkest. A child can still pick any of the five, on the form or in the hangar.
  skinDefault: ['t3', 't4', 't5'],
  // P3–P6 are Rocket School's CE2–6e rows. P1 adds within 20 and P2 within 30 (Ghana B1–B2). JSS keeps P6's grids until SC-3.
  hunt: {
    kinds: [
      ['add2'],
      ['add2', 'add2', 'add3', 'sub2'],
      ...HUNT_LEVEL_KINDS,
      HUNT_LEVEL_KINDS[3],
      HUNT_LEVEL_KINDS[3],
      HUNT_LEVEL_KINDS[3]
    ],
    max: {
      add2: [9, 12, 15, 30, 50, 99, 99, 99, 99],
      add3: [0, 9, 15, 30, 50, 99, 99, 99, 99],
      sub2: [0, 20, 20, 60, 100, 999, 999, 999, 999],
      mul2: [0, 0, 10, 10, 12, 15, 15, 15, 15],
      div2: [0, 0, 0, 0, 60, 99, 99, 99, 99],
      add100: [0, 0, 99, 99, 99, 99, 99, 99, 99],
      add1000: [0, 0, 0, 0, 950, 950, 950, 950, 950],
      dec: [0, 0, 0, 0, 99, 99, 99, 99, 99]
    },
    pictures: ['P1', 'P2']
  },
  // TPL-013 §2.2.2: P1–P2 cannot read the questions, so their skills are numbers and pictures (tpl013Young.ts).
  // SC-3: JSS1–JSS3's own maths, each pinned to a programme topic (tpl013Jss.ts), so they no longer borrow P6's.
  // SC-4: the text banks, English and Basic Science (tpl013Banks.ts), from P3.
  addSkills: [...YOUNG_SKILLS, ...JSS_SKILLS, ...BANK_SKILLS],
  addTopics: [YOUNG_TOPIC, ...JSS_TOPICS, ...BANK_TOPICS],
  addGenerators: { code: YOUNG_GENERATORS + JSS_GENERATORS, cases: YOUNG_CASES + JSS_CASES },
  // Richard, 2026-10-14: "We can dump typing practice for sure". The keyboard layout only ever served typing.
  dropSubjects: ['history', 'typing'],
  // SC-4. English is the language of school here, so its glyph is a letter, not a flag.
  subjects: [
    { id: 'maths', name: { en: 'Maths', fr: 'Maths' }, glyph: '🔢' },
    { id: 'english', name: { en: 'English', fr: 'Anglais' }, glyph: '🔤' },
    { id: 'science', name: { en: 'Science', fr: 'Sciences' }, glyph: '🔬' },
    { id: 'french', name: { en: 'French', fr: 'Français' }, glyph: '📝' }
  ],
  moveTopics: { 'en-vocab': { subject: 'french', name: { en: 'French words', fr: 'Mots anglais' } } },
  removeNodes: { 'Game/Header': ['hdKeys', 'hdKeyItems'] },
  // SC-2: a pile of things on an answer button is counted, so it is drawn bigger than a number (measured: 8 bananas at the
  // number size touch each other on a 390 px phone).
  addNodes: {
    'Game/Option button': {
      nodes: [{ id: 'obSize', type: 'JavaScriptFunction', label: 'Bigger for a pile of things', parameters: { functionScript: OPTION_SIZE_SCRIPT } }],
      connections: [
        { fromId: 'obIn', fromProperty: 'label', toId: 'obSize', toProperty: 'in-label' },
        { fromId: 'obSize', fromProperty: 'out-size', toId: 'obBtn', toProperty: 'fontSize' }
      ]
    },
    // s4: Richard never saw the jump (it was "· ⬆️ P2" in the small speed line), so it has its own card on the verdict.
    'Logic/Grade answer': {
      nodes: [],
      ports: { gradeanswerOut: [['jumpTo', 'string']] },
      connections: [{ fromId: 'gradeanswerFn', fromProperty: 'out-jumpTo', toId: 'gradeanswerOut', toProperty: 'jumpTo' }]
    },
    'Race/Round': { nodes: [], connections: [{ fromId: 'rdGrade', fromProperty: 'jumpTo', toId: 'rdBanner', toProperty: 'jumpTo' }] },
    'Game/Feedback banner': JUMP_CARD,
    // s5: Number Hunt plays at the class the rating has reached, like the race, so its builder is given the model. Only Run
    // reads it: a model saved mid-hunt must not deal a new grid.
    'Logic/New hunt': {
      nodes: [],
      ports: { newhuntIn: [['model', 'object']] },
      params: { newhuntFn: { 'runOnChange-in-model': false } },
      connections: [{ fromId: 'newhuntIn', fromProperty: 'model', toId: 'newhuntFn', toProperty: 'in-model' }]
    },
    'Hunt/Play': { nodes: [], connections: [{ fromId: 'hpIn', fromProperty: 'model', toId: 'hpNewHunt', toProperty: 'model' }] }
  },
  // Naira in English, CFA francs in French. An exercise book is ₦200–₦600, not ₦2.
  money: { scale: 100, en: { prefix: '₦', suffix: '' }, fr: { prefix: '', suffix: ' FCFA' } }
};

// ── Counted replacement ─────────────────────────────────────────────────────

/** Replace every `from` in `text`, and throw unless there were exactly `expected` of them. */
export function replaceCounted(text: string, from: string, to: string, expected: number, where: string): string {
  const found = text.split(from).length - 1;
  if (found !== expected) throw new Error(`${where}: expected ${expected} × ${JSON.stringify(from)}, found ${found}`);
  return text.split(from).join(to);
}

function levelRules(edition: Edition): Array<[RegExp, string]> {
  return [
    ...LEVELS.map((l): [RegExp, string] => [new RegExp(`\\b${l}\\b`, 'g'), edition.levels[l]]),
    [/\b5e\b/g, edition.beyond]
  ];
}

/** Rename the classes and the product in one string. Applied to every string of every component. */
function renameIn(text: string, edition: Edition): string {
  let out = text;
  for (const [pattern, to] of levelRules(edition)) out = out.replace(pattern, to);
  return out.split(ROCKET_NAME).join(edition.name).split(STORAGE_KEY).join(edition.storageKey);
}

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as unknown as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, mapStrings(v, fn)])) as T;
  }
  return value;
}

// ── Money ───────────────────────────────────────────────────────────────────

function amount(n: number, lang: 'en' | 'fr', edition: Edition): string {
  const m = edition.money[lang];
  const v = n * edition.money.scale;
  const grouped = lang === 'fr' ? v.toLocaleString('fr-FR').replace(/\s/g, ' ') : v.toLocaleString('en-GB');
  return `${m.prefix}${grouped}${m.suffix}`;
}

/** The three € sentences of the curriculum and its Teach card, re-said in the edition's money. */
function moneyText(edition: Edition): Record<string, string> {
  const en = (n: number) => amount(n, 'en', edition);
  const fr = (n: number) => amount(n, 'fr', edition);
  return {
    '3 cakes cost 6 €: find ONE first (2 €), then multiply.': `3 loaves cost ${en(6)}: find ONE first (${en(2)}), then multiply.`,
    '3 gâteaux coûtent 6 € : trouve d’abord UN (2 €), puis multiplie.': `3 pains coûtent ${fr(6)} : trouve d’abord UN (${fr(2)}), puis multiplie.`,
    '3 cakes cost 6 €. What do 5 cost? Find ONE first: 6 ÷ 3 = 2 € each. Then 5 × 2 = 10 €. Whenever two things go up together, go back to one.':
      `3 loaves cost ${en(6)}. What do 5 cost? Find ONE first: ${en(6)} ÷ 3 = ${en(2)} each. Then 5 × ${en(2)} = ${en(10)}. Whenever two things go up together, go back to one.`,
    '3 gâteaux coûtent 6 €. Combien pour 5 ? Trouve d’abord UN : 6 ÷ 3 = 2 € chacun. Puis 5 × 2 = 10 €. Quand deux choses montent ensemble, reviens à un.':
      `3 pains coûtent ${fr(6)}. Combien pour 5 ? Trouve d’abord UN : ${fr(6)} ÷ 3 = ${fr(2)} chacun. Puis 5 × ${fr(2)} = ${fr(10)}. Quand deux choses montent ensemble, reviens à un.`,
    '3 → 6 €   so   1 → 2 €   so   5 → 10 €': `3 → ${en(6)}   so   1 → ${en(2)}   so   5 → ${en(10)}`,
    '3 → 6 €   donc   1 → 2 €   donc   5 → 10 €': `3 → ${fr(6)}   donc   1 → ${fr(2)}   donc   5 → ${fr(10)}`,
    // The tagline, without the typing the edition does not ship.
    'Maths and typing practice that flies.': 'Maths, English and more, practice that flies.',
    'Des maths et de la frappe qui décollent.': 'Des maths, du français et plus encore, qui décollent.'
  };
}

function swapMoney<T>(value: T, edition: Edition): T {
  const table = moneyText(edition);
  return mapStrings(value, (s) => table[s] ?? s);
}

/**
 * The proportion question, in the script `Logic/Pick next question` runs. Three edits, each counted:
 * the unit price is scaled (so 3 books cost ₦600, not ₦6, and the answer the child types is scaled with it),
 * the prompt and the worked line say the edition's money through one `money()` helper.
 */
function moneyInScript(script: string, edition: Edition, where: string): string {
  const { scale, en, fr } = edition.money;
  const helper =
    `function money(n, lang) { return isFr(lang) ? ${JSON.stringify(fr.prefix)} + fmtNum(n, lang) + ${JSON.stringify(fr.suffix)} : ` +
    `${JSON.stringify(en.prefix)} + fmtNum(n, lang) + ${JSON.stringify(en.suffix)}; }\n`;
  let out = script;
  out = replaceCounted(out, 'function proportionWorked(a, b, unit, lang) {', `${helper}function proportionWorked(a, b, unit, lang) {`, 1, where);
  out = replaceCounted(
    out,
    "(a * unit) + ' ÷ ' + a + ' = ' + unit + says(lang, ' € each, then ', ' € chacun, puis ') + b + ' × ' + unit + ' = ' + (b * unit) + ' €.'",
    "money(a * unit, lang) + ' ÷ ' + a + ' = ' + money(unit, lang) + says(lang, ' each, then ', ' chacun, puis ') + b + ' × ' + money(unit, lang) + ' = ' + money(b * unit, lang) + '.'",
    1,
    where
  );
  out = replaceCounted(out, 'var unit = rnd(2, p.max), a = rnd(2, 6), b;', `var unit = rnd(2, p.max) * ${scale}, a = rnd(2, 6), b;`, 1, where);
  out = replaceCounted(
    out,
    "a + ' cahiers coûtent ' + (a * unit) + ' €. Combien coûtent ' + b + ' cahiers ?'",
    "a + ' cahiers coûtent ' + money(a * unit, lang) + '. Combien coûtent ' + b + ' cahiers ?'",
    1,
    where
  );
  out = replaceCounted(
    out,
    "a + ' notebooks cost ' + (a * unit) + ' €. How much do ' + b + ' notebooks cost?'",
    "a + ' exercise books cost ' + money(a * unit, lang) + '. How much do ' + b + ' exercise books cost?'",
    1,
    where
  );
  return out;
}

// ── The classes (SC-1) ──────────────────────────────────────────────────────

/**
 * The Elo base of every class. Rocket School's are 250 apart from CE2's 800 (a skill's `diff` spreads it by up to 250 more),
 * so the ladder keeps that step, anchored where CE2 lands. Rocket's four classes keep exactly their bases, or this throws.
 */
export function editionLevelBase(edition: Edition = AFRICA_EDITION): Record<string, number> {
  const anchor = edition.classes.indexOf(edition.levels.CE2);
  if (anchor < 0) throw new Error(`the classes do not include ${edition.levels.CE2}`);
  const base = Object.fromEntries(edition.classes.map((c, i) => [c, LEVEL_BASE.CE2 + 250 * (i - anchor)]));
  for (const l of LEVELS) if (base[edition.levels[l]] !== LEVEL_BASE[l]) throw new Error(`${edition.levels[l]} would not keep ${l}'s base ${LEVEL_BASE[l]}`);
  return base;
}

/** Number Hunt's kinds with this edition's biggest squares, one per class. */
export function editionHuntKinds(edition: Edition = AFRICA_EDITION): typeof HUNT_KINDS {
  const n = edition.classes.length;
  if (edition.hunt.kinds.length !== n) throw new Error(`hunt.kinds has ${edition.hunt.kinds.length} classes, not ${n}`);
  return Object.fromEntries(
    (Object.keys(HUNT_KINDS) as HuntKind[]).map((k) => {
      const max = edition.hunt.max[k];
      if (max.length !== n) throw new Error(`hunt.max.${k} has ${max.length} classes, not ${n}`);
      return [k, { ...HUNT_KINDS[k], max }];
    })
  ) as unknown as typeof HUNT_KINDS;
}

/** Make Ten's tile groups, with the class each one opens at moved to where that class sits in this ladder. 0 stays "always". */
export function editionMergeGroups(edition: Edition = AFRICA_EDITION): Array<(typeof MERGE_POOL_GROUPS)[number]> {
  return MERGE_POOL_GROUPS.map((g) => ({ ...g, fromLevel: g.fromLevel === 0 ? 0 : edition.classes.indexOf(edition.levels[LEVELS[g.fromLevel]]) })) as Array<
    (typeof MERGE_POOL_GROUPS)[number]
  >;
}

/**
 * What the edition adds beside `levelIndex`, in every script that has the helpers. Rocket School has none of it: its four
 * classes have something to ask in every subject, and its rating starts at the class picked.
 */
function ladderHelpers(edition: Edition): string {
  return [
    '',
    `var START_BELOW = ${edition.startBelow};`,
    `var JUMP_UP = ${edition.jump.up}, JUMP_DOWN = ${edition.jump.down};`,
    '/**',
    ' * A child is "in" a class when that class\'s own skills are the ones they get right 3 times in 4: Elo puts that 400·log10(3) ≈ 190',
    ' * above the skill, so 190 above the class\'s base. Without it a rating on P2\'s base is asked P1\'s skills, and a jump changes nothing.',
    ' */',
    'var PLAY_AT = 190;',
    '/** TPL-013 SC-1: a new player is rated START_BELOW classes below the one picked; the class is a first guess. */',
    'function startRating(level) { return classRating(Math.max(0, levelIndex(level) - START_BELOW)); }',
    '/** The rating that puts a child at the start of class i. */',
    'function classRating(i) { return LEVEL_BASE[LEVELS[i]] + PLAY_AT + 50; }',
    '/** The class the race asks from: the highest class whose base the rating has reached. The class picked is only where it began. */',
    'function playIndex(r) { var p = 0; for (var i = 0; i < LEVELS.length; i++) if (r >= LEVEL_BASE[LEVELS[i]] + PLAY_AT) p = i; return p; }',
    '/** A class with nothing to ask in this subject yet borrows the nearest class that has something, below before above. */',
    'function nearestClass(curriculum, wanted, li) {',
    '  for (var d = 1; d < LEVELS.length; d++) {',
    '    var tries = [li - d, li + d];',
    '    for (var t = 0; t < 2; t++) {',
    '      var at = tries[t];',
    '      if (at < 0 || at >= LEVELS.length) continue;',
    '      var got = curriculum.filter(function (sk) { return wanted.indexOf(subjectOf(sk)) !== -1 && !sk.beyond && levelIndex(sk.level) === at; });',
    '      if (got.length) return got;',
    '    }',
    '  }',
    '  return [];',
    '}'
  ].join('\n');
}

const LEVEL_INDEX_LINE = "function levelIndex(level) { var i = LEVELS.indexOf(String(level || 'CE2')); return i < 0 ? 0 : i; }";
const RATING_LINE = 'var r = Number(model.rating) || (LEVEL_BASE[level] + 50);';
const MODEL_RATING_LINE = 'model.rating = Math.round(r);';
/**
 * The jump, in the grader, after the rating has moved: a run of right answers lifts it to the next class's start, a run of
 * misses drops it to the class below's. Kept across races in `model.place`; player two's turns (forB) count for nothing.
 */
const JUMP_CODE = [
  "// TPL-013 s3: the class is a starting yard stick. A run either way moves the race one class from where the run began.",
  "var place = model.place && typeof model.place === 'object' ? model.place : { right: 0, miss: 0, at: -1 };",
  "var jumped = '';",
  "if (!forB) {",
  "  var was = playIndex(before);",
  "  place = correct",
  "    ? { right: (Number(place.right) || 0) + 1, miss: 0, at: Number(place.right) > 0 ? place.at : was }",
  "    : { right: 0, miss: (Number(place.miss) || 0) + 1, at: Number(place.miss) > 0 ? place.at : was };",
  "  var from = typeof place.at === 'number' && place.at >= 0 ? place.at : was;",
  "  if (place.right >= JUMP_UP && from < LEVELS.length - 1) { r = Math.max(r, classRating(from + 1)); jumped = 'up'; place = { right: 0, miss: 0, at: -1 }; }",
  "  else if (place.miss >= JUMP_DOWN && from > 0) { r = Math.min(r, classRating(from - 1)); jumped = 'down'; place = { right: 0, miss: 0, at: -1 }; }",
  "}",
  'model.place = place;',
  'Outputs.jumped = jumped;',
  "Outputs.jumpTo = jumped === 'up' ? LEVELS[playIndex(r)] : '';",
  'Outputs.playing = LEVELS[playIndex(r)];',
  ''
].join('\n');
const GENERATE_LINE = 'function generate(skill, lang, layout, wordLists, model) {';
/** s5: the class Number Hunt and Make Ten play at is the race's, from the rating; the class picked only says where it began. */
const HUNT_LEVEL_LINE = "var level = String(Inputs.level || 'CE2');";
const PLAY_LEVEL = 'LEVELS[playIndex(Number(Inputs.model && Inputs.model.rating) || startRating(Inputs.level))]';
const MERGE_LI_LINE = '  var li = levelIndex(level), skills = (model && model.skills) || {};';
const HUNT_INSTRUCTION_LINE = "Outputs.instruction = g.cells.length ? huntInstruction(kind, target, lang) : '';";
/** s5: a grid asked as a picture: one ❓ per square to tap, joined by the sign, and the target. Numerals and symbols only. */
function huntPictureCode(edition: Edition): string {
  return [
    `var HUNT_PICTURES = ${JSON.stringify(edition.hunt.pictures)};`,
    "function huntPicture(kind, target, count, lang) { var q = []; for (var i = 0; i < count; i++) q.push('❓'); return q.join(huntSign(kind)) + ' = ' + fmtNum(target, lang); }",
    "Outputs.instruction = !g.cells.length ? '' : HUNT_PICTURES.indexOf(String(g.level)) !== -1 ? huntPicture(kind, target, Number(g.count) || 2, lang) : huntInstruction(kind, target, lang);"
  ].join('\n');
}
const FIRST_CASE = "    case 'list': return listQ(skill, p, lang, model);";
const FALLBACK_LINE =
  'if (!candidates.length) candidates = curriculum.filter(function (sk) { return wanted.indexOf(subjectOf(sk)) !== -1 && !sk.beyond; });';

/** Replace `var name = <Rocket's table>;` with this edition's, once, where a script carries it. */
function swapTable(script: string, name: string, from: unknown, to: unknown, where: string): string {
  const line = `var ${name} = ${JSON.stringify(from)};`;
  return script.includes(line) ? replaceCounted(script, line, `var ${name} = ${JSON.stringify(to)};`, 1, where) : script;
}

/** Every class table a script carries, swapped for the ladder's; the picker and the grader rate a new player below the class picked. */
function classesInScript(script: string, edition: Edition, where: string): string {
  let out = script;
  out = swapTable(out, 'LEVELS', LEVELS, edition.classes, where);
  out = swapTable(out, 'LEVEL_BASE', LEVEL_BASE, editionLevelBase(edition), where);
  out = swapTable(out, 'HUNT_KINDS', HUNT_KINDS, editionHuntKinds(edition), where);
  out = swapTable(out, 'HUNT_LEVEL_KINDS', HUNT_LEVEL_KINDS, edition.hunt.kinds, where);
  out = swapTable(out, 'MERGE_POOL_GROUPS', MERGE_POOL_GROUPS, editionMergeGroups(edition), where);
  if (out.includes(LEVEL_INDEX_LINE)) out = replaceCounted(out, LEVEL_INDEX_LINE, LEVEL_INDEX_LINE + ladderHelpers(edition), 1, where);
  if (where === 'Logic/Pick next question') {
    out = replaceCounted(out, GENERATE_LINE, `${edition.addGenerators.code}${GENERATE_LINE}`, 1, where);
    out = replaceCounted(out, FIRST_CASE, `${FIRST_CASE}${edition.addGenerators.cases}`, 1, where);
    out = replaceCounted(out, RATING_LINE, `var r = Number(model.rating) || startRating(level);\nli = playIndex(r);`, 1, where);
    out = replaceCounted(out, FALLBACK_LINE, 'if (!candidates.length) candidates = nearestClass(curriculum, wanted, li);', 1, where);
  }
  if (where === 'Logic/New hunt') out = replaceCounted(out, HUNT_LEVEL_LINE, `var level = ${PLAY_LEVEL};`, 1, where);
  if (out.includes(MERGE_LI_LINE)) out = replaceCounted(out, MERGE_LI_LINE, '  var li = playIndex(Number(model && model.rating) || startRating(level)), skills = (model && model.skills) || {};', 1, where);
  if (where === 'Logic/Draw hunt') out = replaceCounted(out, HUNT_INSTRUCTION_LINE, huntPictureCode(edition), 1, where);
  if (where === 'Logic/Grade answer') {
    out = replaceCounted(out, RATING_LINE, 'var r = Number(model.rating) || startRating(level);', 1, where);
    out = replaceCounted(out, MODEL_RATING_LINE, `${JUMP_CODE}${MODEL_RATING_LINE}`, 1, where);
  }
  return out;
}

/** The new-player form's class choice: every class of the ladder. */
function withClassChoice(component: Tpl007Component, edition: Edition): Tpl007Component {
  if (component.path !== 'Profiles/New player form') return component;
  let found = 0;
  const nodes = component.nodes.map((n) => {
    const node = n as { id?: string; label?: string; parameters?: Record<string, unknown> };
    if (node.id !== 'nfLevelItems') return n;
    found++;
    return { ...node, label: 'The classes', parameters: { ...node.parameters, json: JSON.stringify(edition.classes.map((c) => ({ label: c, value: c }))) } };
  });
  if (found !== 1) throw new Error(`${component.path}: expected 1 × nfLevelItems, found ${found}`);
  return { ...component, nodes };
}

// ── The data ────────────────────────────────────────────────────────────────

export function editionCurriculum(edition: Edition = AFRICA_EDITION): Skill[] {
  const kept = CURRICULUM.filter((skill) => !edition.dropSubjects.includes(String(skill.subject))).map((skill) => {
    const moved = skill.topic ? edition.moveTopics[skill.topic] : undefined;
    return moved ? ({ ...skill, subject: moved.subject } as Skill) : skill;
  });
  return swapMoney(kept, edition)
    .map((skill) => mapStrings(skill, (s) => renameIn(s, edition)))
    .map((skill) => {
      // SC-1: Rocket School's 5e is a class here, so its skills are asked in it like any other, not only when ticked.
      if (!skill.beyond || !edition.classes.includes(skill.beyond)) return skill;
      const { beyond, ...rest } = skill;
      return { ...rest, level: beyond } as unknown as Skill;
    })
    .concat(edition.addSkills);
}

export function editionTeachCards(edition: Edition = AFRICA_EDITION): TeachCard[] {
  const used = new Set(editionCurriculum(edition).map((s) => s.teach).filter(Boolean));
  return swapMoney(TEACH_CARDS, edition)
    .filter((card) => used.has(card.id))
    .map((card) => mapStrings(card, (s) => renameIn(s, edition)));
}

// ── The components ──────────────────────────────────────────────────────────

/** The interface words, as Data/Words carries them ({ key, en, fr } rows), with the tagline re-said. */
export function editionWords(edition: Edition = AFRICA_EDITION): Array<{ key: string; en: string; fr: string }> {
  return swapMoney(Object.entries(WORDS).map(([key, w]) => ({ key, ...w })), edition).map((row) => mapStrings(row, (s) => renameIn(s, edition)));
}

const DATA_JSON: Readonly<Record<string, (e: Edition) => unknown>> = {
  'Data/Words': editionWords,
  'Data/Curriculum': editionCurriculum,
  'Data/Teach cards': editionTeachCards
};

function withData(component: Tpl007Component, edition: Edition): Tpl007Component {
  const make = DATA_JSON[component.path];
  if (!make) return component;
  const nodes = component.nodes.map((n) => {
    const node = n as { type?: string; parameters?: { json?: string } };
    if (node.type !== 'Static Data') return n;
    return { ...node, parameters: { ...node.parameters, json: JSON.stringify(make(edition), null, 2) } };
  });
  return { ...component, nodes };
}

/** The chooser's subject and topic tables, without the subjects this edition drops. */
/** The chooser's topics: the edition's own first, then Rocket School's that are kept, a moved one under its new subject. */
export function editionTopics(edition: Edition = AFRICA_EDITION): Array<{ id: string; subject: string; name: { en: string; fr: string } }> {
  const kept = TOPICS.filter((t) => !edition.dropSubjects.includes(t.subject)).map((t) => ({ ...t, ...(edition.moveTopics[t.id] ?? {}) }));
  for (const id of Object.keys(edition.moveTopics)) if (!TOPICS.some((t) => t.id === id)) throw new Error(`moveTopics: no topic ${id}`);
  return [...edition.addTopics, ...kept];
}

function subjectsInScript(script: string, edition: Edition, where: string): string {
  let out = script;
  for (const d of edition.dropSubjects) if (edition.subjects.some((x) => x.id === d)) throw new Error(`subjects lists ${d}, which is dropped`);
  if (out.includes('var SUBJECTS = ')) out = replaceCounted(out, `var SUBJECTS = ${JSON.stringify(SUBJECTS)};`, `var SUBJECTS = ${JSON.stringify(edition.subjects)};`, 1, where);
  if (out.includes('var TOPICS = ')) {
    out = replaceCounted(out, `var TOPICS = ${JSON.stringify(TOPICS)};`, `var TOPICS = ${JSON.stringify(editionTopics(edition))};`, 1, where);
  }
  if (out.includes('var SUBJECT_NAMES = ')) {
    const names = (list: ReadonlyArray<{ id: string; name: { en: string; fr: string } }>) => JSON.stringify(Object.fromEntries(list.map((s) => [s.id, s.name])));
    out = replaceCounted(out, `var SUBJECT_NAMES = ${names(SUBJECTS)};`, `var SUBJECT_NAMES = ${names(edition.subjects)};`, 1, where);
  }
  return out;
}

/** SC-5: the skins a face's seed chooses among, in every script that carries the skin lines (a face drawn or kept). */
function skinInScript(script: string, edition: Edition, where: string): string {
  for (const t of edition.skinDefault) if (!SKIN_TONES.some((x) => x.id === t)) throw new Error(`skinDefault: no tone ${t}`);
  return swapTable(script, 'SKIN_DEFAULT', SKIN_DEFAULT, edition.skinDefault, where);
}

function withScripts(component: Tpl007Component, edition: Edition): Tpl007Component {
  const nodes = component.nodes.map((n) => {
    const node = n as { parameters?: { functionScript?: string } };
    let script = node.parameters?.functionScript;
    if (!script) return n;
    if (component.path === 'Logic/Pick next question' && script.includes('function proportionQ')) script = moneyInScript(script, edition, component.path);
    script = subjectsInScript(script, edition, component.path);
    script = classesInScript(script, edition, component.path);
    script = skinInScript(script, edition, component.path);
    return script === node.parameters?.functionScript ? n : { ...node, parameters: { ...node.parameters, functionScript: script } };
  });
  return { ...component, nodes };
}

/** Take nodes out of a component: from its node list, from every parent's children, and every wire that touches them. */
export function withoutNodes(component: Tpl007Component, ids: ReadonlyArray<string>): Tpl007Component {
  if (!ids.length) return component;
  const gone = new Set(ids);
  const present = new Set(component.nodes.map((n) => (n as { id: string }).id));
  for (const id of ids) if (!present.has(id)) throw new Error(`${component.path}: no node ${id} to remove`);
  const nodes = component.nodes
    .filter((n) => !gone.has((n as { id: string }).id))
    .map((n) => {
      const node = n as { children?: string[] };
      return node.children ? { ...node, children: node.children.filter((c) => !gone.has(c)) } : n;
    });
  const connections = component.connections.filter((w) => {
    const wire = w as { fromId: string; toId: string };
    return !gone.has(wire.fromId) && !gone.has(wire.toId);
  });
  return { ...component, nodes, connections };
}

/**
 * Add nodes, ports and wires to a component. A node id the component already has is refused (ids are project-wide), and so is
 * a port on a node that is not its Component Inputs or Outputs, or a place under a parent it does not have.
 */
export function withNodes(component: Tpl007Component, add: Graft | undefined): Tpl007Component {
  if (!add) return component;
  const present = new Set(component.nodes.map((n) => (n as { id: string }).id));
  for (const n of add.nodes) if (present.has((n as { id: string }).id)) throw new Error(`${component.path}: already has a node ${(n as { id: string }).id}`);
  const ids = new Set([...present, ...add.nodes.map((n) => (n as { id: string }).id)]);
  for (const w of add.connections) {
    const wire = w as { fromId: string; toId: string };
    if (!ids.has(wire.fromId) || !ids.has(wire.toId)) throw new Error(`${component.path}: a wire to a node it does not have (${wire.fromId} → ${wire.toId})`);
  }
  let { inputs, outputs } = component;
  const grown = new Set<string>();
  const placed = new Set<string>();
  const nodes = component.nodes.map((n) => {
    let node = n as { id: string; type: string; ports?: Array<{ name: string; type: string; plug: string }>; children?: string[]; parameters?: Record<string, unknown> };
    const more = add.ports?.[node.id];
    if (more) {
      const plug = node.type === 'Component Inputs' ? 'output' : node.type === 'Component Outputs' ? 'input' : null;
      if (!plug) throw new Error(`${component.path}: ${node.id} is not a Component Inputs or Outputs node`);
      node = { ...node, ports: [...(node.ports ?? []), ...more.map(([name, type]) => ({ name, type, plug }))] };
      const list = more.map(([name, type]) => ({ name, type }));
      if (plug === 'output') inputs = [...(inputs ?? []), ...list];
      else outputs = [...(outputs ?? []), ...list];
      grown.add(node.id);
    }
    const params = add.params?.[node.id];
    if (params) node = { ...node, parameters: { ...node.parameters, ...params } };
    for (const p of add.place ?? []) {
      if (p.parent !== node.id) continue;
      const children = [...(node.children ?? [])];
      children.splice(p.at, 0, p.id);
      node = { ...node, children };
      placed.add(p.id);
    }
    return node;
  });
  for (const id of Object.keys(add.ports ?? {})) if (!grown.has(id)) throw new Error(`${component.path}: no node ${id} to give ports to`);
  for (const id of Object.keys(add.params ?? {})) if (!present.has(id)) throw new Error(`${component.path}: no node ${id} to set parameters on`);
  for (const p of add.place ?? []) if (!placed.has(p.id)) throw new Error(`${component.path}: no parent ${p.parent} to place ${p.id} in`);
  return { ...component, inputs, outputs, nodes: [...nodes, ...add.nodes], connections: [...component.connections, ...add.connections] };
}

/** Rocket School's components, as this edition. */
export function editionComponents(edition: Edition = AFRICA_EDITION, base: ReadonlyArray<Tpl007Component> = TPL007_COMPONENTS): Tpl007Component[] {
  return base.map((c) => {
    const trimmed = withNodes(withoutNodes(c, edition.removeNodes[c.path] ?? []), edition.addNodes[c.path]);
    const data = withClassChoice(withData(withScripts(trimmed, edition), edition), edition);
    return mapStrings(data, (s) => renameIn(s, edition));
  });
}

/** What must be gone from an edition: every place a French class, the euro or the old name survives. */
export function frenchLeftIn(
  components: ReadonlyArray<Tpl007Component>,
  edition: Edition = AFRICA_EDITION
): Array<{ path: string; what: string; count: number }> {
  const checks: Array<[string, RegExp]> = [
    ...LEVELS.map((l): [string, RegExp] => [l, new RegExp(`\\b${l}\\b`, 'g')]),
    ['5e', /\b5e\b/g],
    ['€', /€/g],
    [ROCKET_NAME, new RegExp(ROCKET_NAME, 'g')],
    [ROCKET_ID, new RegExp(ROCKET_ID, 'g')],
    ['French history', /histoire de France|French history/g]
  ];
  const found: Array<{ path: string; what: string; count: number }> = [];
  for (const c of components) {
    // The edition's own name may contain the old one (say "Rocket School Junior"): take it out before counting.
    const text = JSON.stringify({ nodes: c.nodes, description: c.description }).split(edition.name).join('').split(edition.storageKey).join('');
    for (const [what, re] of checks) {
      const count = (text.match(re) ?? []).length;
      if (count) found.push({ path: c.path, what, count });
    }
  }
  return found;
}

// ── START-HERE ──────────────────────────────────────────────────────────────

/** "a, b and c". */
function subjectList(names: ReadonlyArray<string>): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The edition's own first page: what it is, what changed from Rocket School, and the first thing to change. */
export function editionStartHere(edition: Edition = AFRICA_EDITION): string {
  const skills = editionCurriculum(edition);
  const by = (subject: string) => skills.filter((s) => s.subject === subject).length;
  const first = edition.classes[0];
  const last = edition.classes[edition.classes.length - 1];
  return [
    `# ${edition.name}`,
    '',
    `${subjectList(edition.subjects.map((x) => x.name.en))} practice for school children from ${first} to ${last} (${edition.classes.join(', ')}), in an`,
    'English or French interface, built entirely out of NodeGX nodes. Press **Run**, make a player, and race the computer',
    'to the planet.',
    '',
    `It is an edition of Rocket School: the same four games, the same learner model, the same hangar and moon. What`,
    `differs is the school: ${edition.classes.length} classes, money is naira in English and CFA francs in French, and neither typing nor`,
    'the French history bank is shipped.',
    '',
    `The class a child picks is a first guess. A new player is rated ${edition.startBelow} classes below it, and the race climbs`,
    'to their class as they answer. A class with nothing to ask yet borrows the nearest class that has something.',
    '',
    'There is no backend and nothing is downloaded while playing. Profiles and progress live in this browser',
    `(localStorage, key \`${edition.storageKey}\`), and every player has a **save code** to carry their progress to`,
    'another device.',
    '',
    '## The first thing to change',
    '',
    'Open **Data/Curriculum** and find the node labelled **"the skills — this list IS the school"**. One entry is one',
    `skill, with the class it starts in (\`"level": "${edition.levels.CE2}"\`). ${skills.length} skills ship: ${subjectList(edition.subjects.map((x) => `${x.id === 'maths' ? 'maths' : x.name.en} (${by(x.id)})`))}.`,
    'Add an entry and every game can ask about it.',
    '',
    '## How it is made',
    '',
    '`npm run template:star-class` writes this folder. It builds Rocket School through the same plan and changes',
    'only the class names, the money, the subjects and the name (`packages/noodl-mcp/tests/tpl013Edition.ts`), so a fix',
    'to the game reaches both.',
    ''
  ].join('\n');
}
