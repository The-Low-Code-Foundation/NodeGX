/**
 * CG-006 §4 — the ring-fenced moments as PROBE DATA for Olive's exam, and the
 * two content rulings (rung 9's rule, the EN thank-you must-contain) as probe
 * data for both candidates. Nothing here runs the model.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What lives here
 *
 * - {@link MOMENTS} — E1–E13 from CG-006 §4: the lesson, the status the task
 *   file gave it (`ship` / `add-probe` / `grown-ups`), the probes that decide
 *   it, and the DECISION (AC6): `promoted` (to §3, with its probe), `dropped`,
 *   or `awaiting-probe` (the probe is written; the exam has not run it).
 * - {@link PROPOSED_RUNGS} / {@link PROPOSED_LISTS} — the rung-table entries the
 *   probes need that `garden-desktop/shell/olive-templates.json` does not have
 *   yet, in THAT file's shape, so {@link mergeTemplates} makes a table the
 *   shell's own `checkSlots` / `compose` / `checkOutput` accept unchanged.
 * - {@link PROBES} — in `shell/exam.js`'s `PROBES` shape (`id, from, rung, lang,
 *   slots, temperature?, times?, mode, expect`) plus `moment`, `column` (what
 *   the moment is designed on: `green`, `grad` = 🎓, `mixed`) and `canned` — a
 *   model reply written by hand that grades AS THE COLUMN SAYS, so the gate can
 *   prove the wiring (slots in list, shape, check) without a model. A canned
 *   reply is not a measurement of Olive; the exam is.
 * - {@link RULINGS} — rung 9's two candidate rules (G1 "no letter e", G2 "never
 *   mention water") and the EN thank-you's two candidates (widen the list, drop
 *   it for EN). Probed both ways. NOT chosen: those are Richard's.
 * - {@link meets} — one reply against one expectation: `exam.js`'s `meetsOne`
 *   for the kinds it knows, plus the two this file adds ({@link NEW_EXPECT_KINDS}).
 * - {@link decide} — a moment's decision from an exam's rows, by §4's rule: "a
 *   moment ships only after its probe is green (or reliably red, for a 🎓)".
 *
 * ## 🔴 Two new expectation kinds, and why the exam must learn them first
 *
 * `lacks` (G1, G2) and `containsAll` (E3) are not in `exam.js`'s `meetsOne`,
 * whose `default` is `false`. A `mode: 'fail'` probe with an unknown kind is
 * therefore ALWAYS "failing as the ladder expects": a vacuous 🎓 pass. The
 * gate measures that on the real `exam.js`; {@link EXAM_KIND_PATCH} is the
 * exact case text to add before these probes are handed over.
 *
 * @module noodl-mcp/tests/cg006Probes
 */

export type Column = 'green' | 'grad' | 'mixed';
export type Decision = 'promoted' | 'dropped' | 'awaiting-probe';
export type Lang = 'en' | 'fr';

/** An exam expectation. The first six kinds are `exam.js`'s; `lacks` and `containsAll` are new. */
export type Expect =
  | { kind: 'ok' }
  | { kind: 'equals'; value: unknown }
  | { kind: 'items'; n: number }
  | { kind: 'contains'; any: ReadonlyArray<string> }
  | { kind: 'wordsAtMost'; n: number }
  | { kind: 'lines'; n: number }
  | { kind: 'lacks'; letters?: ReadonlyArray<string>; words?: ReadonlyArray<string> }
  | { kind: 'containsAll'; all: ReadonlyArray<string> };

export const EXAM_KINDS = ['ok', 'equals', 'items', 'contains', 'wordsAtMost', 'lines'] as const;
export const NEW_EXPECT_KINDS = ['lacks', 'containsAll'] as const;

export interface Probe {
  id: string;
  /** The §4 moment or the ruling it decides. */
  moment: string;
  /** The battery probe it is trimmed from, or '—'. */
  from: string;
  rung: string;
  lang: Lang;
  slots: Record<string, string>;
  shape?: string;
  temperature?: number;
  times?: number;
  mode: 'pass' | 'fail' | 'record';
  expect: Expect;
  column: Column;
  /** A hand-written model reply (raw, as the model would emit it) that grades as `column` says. Not a measurement. */
  canned: string;
}

// ── The tables the probes need (olive-templates.json's shape) ───────────────

type BiList = { fr: string[]; en: string[] };

/** Lists the proposed rungs draw their slots from. A slot is a list word, never free text. */
export const PROPOSED_LISTS: Readonly<Record<string, BiList>> = {
  map_rows: {
    fr: ['La rangée de Pip, de gauche à droite : tulipe, Pip, herbe, herbe.'],
    en: ["Pip's row, from left to right: tulip, Pip, grass, grass."]
  },
  directions: { fr: ['gauche', 'droite', 'devant', 'derrière'], en: ['left', 'right', 'ahead', 'behind'] },
  programs: {
    fr: ['avancer, avancer, gauche, arroser', 'droite, avancer, arroser'],
    en: ['forward, forward, turn left, water', 'turn right, forward, water']
  },
  traces: {
    fr: ["avancé, avancé, tourné à droite, arrosé l'herbe, une flaque"],
    en: ['moved, moved, turned right, watered the grass, a puddle']
  },
  trick_bodies: {
    fr: ['avancer, avancer, gauche, arroser, droite'],
    en: ['forward, forward, turn left, water, turn right']
  },
  rewrite_lines: { fr: ["Donne-moi de l'eau pour mes tulipes."], en: ['Give me water for my tulips.'] },
  rewrite_hows: { fr: ['plus poliment', 'comme un poème', 'en plus court'], en: ['more politely', 'like a poem', 'shorter'] },
  emoji_words: { fr: ['tulipe', 'chat', 'lettre', 'œuf'], en: ['tulip', 'cat', 'letter', 'egg'] },
  emojis: { fr: ['🌷', '🐱', '💌', '🥚', '🌻', '💧'], en: ['🌷', '🐱', '💌', '🥚', '🌻', '💧'] },
  word_triples: { fr: ['tulipe, arrosoir, chat'], en: ['tulip, bucket, cat'] },
  garden_words: { fr: ['un arrosoir', 'un pissenlit', 'une chouette', 'un rocher'], en: ['a watering can', 'a dandelion', 'an owl', 'a rock'] },
  request_objects: { fr: ['croquettes', 'graines', 'lettre', 'œufs'], en: ['kibble', 'seeds', 'letter', 'eggs'] }
};

/** A rung-table entry. `extends` copies an existing rung and overrides what is given (the two thank-you candidates). */
export interface RungTemplate {
  n: number;
  ladder: 'pass' | 'fail';
  shape: string;
  shapes?: string[];
  temperature: number;
  maxTokens: number;
  slots: Record<string, { list?: string; text?: true; regex?: string; optional?: true }>;
  options?: string;
  system: string | { fr: string; en: string };
  user: { fr: string; en: string };
  mustContain?: { fr?: string[]; en?: string[] };
}

export const PROPOSED_RUNGS: Readonly<Record<string, RungTemplate | { extends: string; override: Partial<RungTemplate> }>> = {
  // E2 — she knows only what the slot tells her. The row is optional: empty, she can only guess.
  'which-way': {
    n: 0, ladder: 'pass', shape: 'one_of', temperature: 0.2, maxTokens: 24,
    slots: { row: { list: 'map_rows', optional: true } }, options: 'directions', system: 'olive',
    user: { fr: '{row} De quel côté de Pip est la tulipe ?', en: '{row} Which side of Pip is the tulip on?' }
  },
  // E3 — blocks → a sentence.
  'explain-program': {
    n: 0, ladder: 'pass', shape: 'sentence', temperature: 0.2, maxTokens: 48,
    slots: { program: { list: 'programs' } }, system: 'olive',
    user: { fr: 'Voici les blocs de Pip, dans l’ordre : {program}. Dis en une phrase ce que fait Pip.', en: "Here are Pip's blocks, in order: {program}. Say in one sentence what Pip does." }
  },
  // E4 — the run's trace → a sentence.
  'narrate-run': {
    n: 0, ladder: 'pass', shape: 'sentence', temperature: 0.5, maxTokens: 48,
    slots: { trace: { list: 'traces' } }, system: 'olive',
    user: { fr: 'Voici ce que Pip a fait : {trace}. Raconte-le en une phrase.', en: 'This is what Pip did: {trace}. Tell it in one sentence.' }
  },
  // E5 — a trick's body → a name.
  'name-trick': {
    n: 0, ladder: 'pass', shape: 'one_word', temperature: 0.8, maxTokens: 24,
    slots: { body: { list: 'trick_bodies' } }, system: 'olive',
    user: { fr: 'Voici une astuce de Pip : {body}. Donne-lui un nom court.', en: "Here is one of Pip's tricks: {body}. Give it a short name." }
  },
  // E6 — transform a given line: politely / like a poem (green), shorter (a rule: expected red).
  rewrite: {
    n: 0, ladder: 'pass', shape: 'sentence', shapes: ['sentence', 'two_lines'], temperature: 0.5, maxTokens: 64,
    slots: { line: { list: 'rewrite_lines' }, how: { list: 'rewrite_hows' } }, system: 'olive',
    user: { fr: 'Redis cette phrase {how} : « {line} »', en: 'Say this line {how}: "{line}"' }
  },
  // E7 — a word → a sticker, as an enum of pictures (the grammar holds the shape; the question is the mapping).
  emoji: {
    n: 0, ladder: 'pass', shape: 'one_of', temperature: 0.2, maxTokens: 24,
    slots: { word: { list: 'emoji_words' } }, options: 'emojis', system: 'olive',
    user: { fr: 'Quelle image va avec le mot « {word} » ?', en: 'Which picture goes with the word "{word}"?' }
  },
  // E8 🎓 — ordering is a rule; the program sorts.
  'sort-words': {
    n: 0, ladder: 'fail', shape: 'list_of_3', temperature: 0.2, maxTokens: 48,
    slots: { words: { list: 'word_triples' } }, system: 'olive',
    user: { fr: 'Range ces trois mots dans l’ordre alphabétique : {words}.', en: 'Put these three words in alphabetical order: {words}.' }
  },
  // E9 🎓 — a definition of a garden word: small models make things up about the world.
  define: {
    n: 0, ladder: 'fail', shape: 'sentence', temperature: 0.5, maxTokens: 48,
    slots: { word: { list: 'garden_words' } }, system: 'olive',
    user: { fr: 'Explique à un enfant ce que c’est, {word}, en une phrase.', en: 'Explain to a child what {word} is, in one sentence.' }
  },
  // E10 — the letter generator: flavour from data, the data is the truth (must-contain the object).
  letter: {
    n: 0, ladder: 'pass', shape: 'sentence', temperature: 0.8, maxTokens: 48,
    slots: { who: { list: 'islanders' }, object: { list: 'request_objects' } }, system: 'olive',
    user: { fr: 'Ce que {who} veut : {object}. Écris la demande de {who} à Pip, en une phrase, comme si {who} parlait.', en: "What {who} wants: {object}. Write {who}'s request to Pip in one sentence, as if {who} were speaking." },
    mustContain: { fr: ['{object}'], en: ['{object}'] }
  },
  // Rung 9, candidate G1 — the battery's G1 prompt, word for word in FR.
  'no-letter-e': {
    n: 9, ladder: 'fail', shape: 'sentence', temperature: 0.8, maxTokens: 48, slots: {}, system: 'olive',
    user: { fr: 'Décris une tulipe en une phrase SANS utiliser la lettre e.', en: 'Describe a tulip in one sentence WITHOUT using the letter e.' }
  },
  // Rung 9, candidate G2 — the battery's G2 prompt, word for word in FR.
  'no-water': {
    n: 9, ladder: 'fail', shape: 'sentence', temperature: 0.8, maxTokens: 48, slots: {}, system: 'olive',
    user: { fr: "Décris le travail de Pip au jardin en une phrase, sans jamais parler d'eau ni d'arrosage.", en: "Describe Pip's work in the garden in one sentence, without ever mentioning water or watering." }
  },
  // The EN thank-you, candidate A: widen the must-contain list (FR keeps "merci").
  'say-thanks-en-wide': { extends: 'say-thanks', override: { mustContain: { fr: ['merci'], en: ['thank', 'grateful', 'appreciate', 'cheers', 'kind of you', 'so glad'] } } },
  // The EN thank-you, candidate B: no must-contain in EN (FR keeps "merci").
  'say-thanks-en-none': { extends: 'say-thanks', override: { mustContain: { fr: ['merci'] } } }
};

/** The shell's table plus this file's lists and rungs, as a NEW object (the base is never written). */
export function mergeTemplates(base: any): any {
  const t = JSON.parse(JSON.stringify(base));
  for (const [name, list] of Object.entries(PROPOSED_LISTS)) {
    if (t.lists[name]) throw new Error('list already in the table: ' + name);
    t.lists[name] = list;
  }
  for (const [id, r] of Object.entries(PROPOSED_RUNGS)) {
    if (t.rungs[id]) throw new Error('rung already in the table: ' + id);
    if ('extends' in r) {
      const from = t.rungs[r.extends];
      if (!from) throw new Error('extends an unknown rung: ' + r.extends);
      t.rungs[id] = { ...JSON.parse(JSON.stringify(from)), ...r.override };
    } else t.rungs[id] = JSON.parse(JSON.stringify(r));
  }
  return t;
}

// ── The probes ──────────────────────────────────────────────────────────────

/** Whole words the G2 rule forbids ("never mention water"), accents folded. Whole words: "beau" is not "eau". */
const WATER_WORDS = {
  fr: ['eau', 'eaux', 'arroser', 'arrose', 'arroses', 'arrosent', 'arrosé', 'arrosée', 'arrosés', 'arrosage', 'arrosoir', 'pluie', 'mouiller', 'mouillé'],
  en: ['water', 'waters', 'watered', 'watering', 'wet', 'rain', 'raining', 'sprinkle', 'hose']
};

export const PROBES: ReadonlyArray<Probe> = [
  // E2 — Olive can't see the garden.
  { id: 'E2-empty', moment: 'E2', from: '—', rung: 'which-way', lang: 'fr', slots: {}, mode: 'record', expect: { kind: 'equals', value: 'gauche' }, column: 'mixed', canned: '{ "objet": "droite" }' },
  { id: 'E2-row-fr', moment: 'E2', from: '—', rung: 'which-way', lang: 'fr', slots: { row: PROPOSED_LISTS.map_rows.fr[0] }, mode: 'pass', expect: { kind: 'equals', value: 'gauche' }, column: 'green', canned: '{ "objet": "gauche" }' },
  { id: 'E2-row-en', moment: 'E2', from: '—', rung: 'which-way', lang: 'en', slots: { row: PROPOSED_LISTS.map_rows.en[0] }, mode: 'pass', expect: { kind: 'equals', value: 'left' }, column: 'green', canned: '{ "objet": "left" }' },
  // E3 — explain my program.
  { id: 'E3-fr', moment: 'E3', from: 'D1 reversed', rung: 'explain-program', lang: 'fr', slots: { program: PROPOSED_LISTS.programs.fr[0] }, mode: 'pass', expect: { kind: 'containsAll', all: ['avance', 'gauche', 'arros'] }, column: 'green', canned: 'Pip avance deux fois, tourne à gauche et arrose la tulipe.' },
  { id: 'E3-en', moment: 'E3', from: '—', rung: 'explain-program', lang: 'en', slots: { program: PROPOSED_LISTS.programs.en[0] }, mode: 'pass', expect: { kind: 'containsAll', all: ['forward', 'left', 'water'] }, column: 'green', canned: 'Pip goes forward twice, turns left and waters the tulip.' },
  // The round trip is lossy: does "avancer, avancer" come back as "deux fois"? Recorded, the lesson either way.
  { id: 'E3-count', moment: 'E3', from: '—', rung: 'explain-program', lang: 'fr', slots: { program: PROPOSED_LISTS.programs.fr[0] }, mode: 'record', expect: { kind: 'contains', any: ['deux'] }, column: 'mixed', canned: 'Pip avance, tourne à gauche et arrose.' },
  // E4 — Olive narrates the run.
  { id: 'E4-fr', moment: 'E4', from: '—', rung: 'narrate-run', lang: 'fr', slots: { trace: PROPOSED_LISTS.traces.fr[0] }, mode: 'pass', expect: { kind: 'contains', any: ['flaque'] }, column: 'green', canned: 'Pip a avancé deux fois, a tourné à droite et a fait une flaque dans l’herbe.' },
  { id: 'E4-en', moment: 'E4', from: '—', rung: 'narrate-run', lang: 'en', slots: { trace: PROPOSED_LISTS.traces.en[0] }, mode: 'pass', expect: { kind: 'contains', any: ['puddle'] }, column: 'green', canned: 'Pip walked twice, turned right and made a puddle on the grass.' },
  // E5 — name my trick.
  { id: 'E5-fr', moment: 'E5', from: 'B1', rung: 'name-trick', lang: 'fr', slots: { body: PROPOSED_LISTS.trick_bodies.fr[0] }, mode: 'pass', expect: { kind: 'ok' }, column: 'green', canned: '{ "prenom": "Arroseur" }' },
  { id: 'E5-apt', moment: 'E5', from: '—', rung: 'name-trick', lang: 'fr', slots: { body: PROPOSED_LISTS.trick_bodies.fr[0] }, mode: 'record', expect: { kind: 'contains', any: ['arros', 'rang', 'tulip', 'pluie', 'goutte'] }, column: 'mixed', canned: '{ "prenom": "Zigzag" }' },
  // E6 — rewrite: politely and like a poem (green), shorter (a rule about her own words: expected red).
  { id: 'E6-polite', moment: 'E6', from: '—', rung: 'rewrite', lang: 'fr', slots: { line: PROPOSED_LISTS.rewrite_lines.fr[0], how: 'plus poliment' }, mode: 'pass', expect: { kind: 'contains', any: ["s'il te plait", 's’il te plait', "s'il vous plait", 's’il vous plait', 'merci', 'pourrais', 'pourriez', 'voudrais'] }, column: 'green', canned: "Pourrais-tu me donner de l'eau pour mes tulipes, s'il te plaît ?" },
  { id: 'E6-poem', moment: 'E6', from: 'A5', rung: 'rewrite', lang: 'fr', slots: { line: PROPOSED_LISTS.rewrite_lines.fr[0], how: 'comme un poème' }, shape: 'two_lines', mode: 'pass', expect: { kind: 'lines', n: 2 }, column: 'green', canned: "Une goutte d'eau, s'il te plaît,\npour mes tulipes qui ont soif." },
  { id: 'E6-shorter', moment: 'E6', from: 'B5', rung: 'rewrite', lang: 'fr', slots: { line: PROPOSED_LISTS.rewrite_lines.fr[0], how: 'en plus court' }, mode: 'fail', expect: { kind: 'wordsAtMost', n: 5 }, column: 'grad', canned: "Donne-moi un peu d'eau pour mes belles tulipes." },
  // E7 — a word → a sticker.
  { id: 'E7-tulipe', moment: 'E7', from: '—', rung: 'emoji', lang: 'fr', slots: { word: 'tulipe' }, mode: 'pass', expect: { kind: 'equals', value: '🌷' }, column: 'green', canned: '{ "objet": "🌷" }' },
  { id: 'E7-lettre', moment: 'E7', from: '—', rung: 'emoji', lang: 'fr', slots: { word: 'lettre' }, mode: 'pass', expect: { kind: 'equals', value: '💌' }, column: 'green', canned: '{ "objet": "💌" }' },
  // E8 🎓 — sort these words. The input is in neither order, so a copy of it is not a sort.
  { id: 'E8-fr', moment: 'E8', from: 'G3/G4', rung: 'sort-words', lang: 'fr', slots: { words: PROPOSED_LISTS.word_triples.fr[0] }, mode: 'fail', expect: { kind: 'equals', value: ['arrosoir', 'chat', 'tulipe'] }, column: 'grad', canned: '{ "noms": ["tulipe", "arrosoir", "chat"] }' },
  { id: 'E8-en', moment: 'E8', from: '—', rung: 'sort-words', lang: 'en', slots: { words: PROPOSED_LISTS.word_triples.en[0] }, mode: 'fail', expect: { kind: 'equals', value: ['bucket', 'cat', 'tulip'] }, column: 'grad', canned: '{ "noms": ["tulip", "bucket", "cat"] }' },
  // E9 🎓 — Olive's dictionary: expected mixed, shown as such. Recorded; the decision reads the set.
  { id: 'E9-arrosoir', moment: 'E9', from: 'C3', rung: 'define', lang: 'fr', slots: { word: 'un arrosoir' }, mode: 'record', expect: { kind: 'contains', any: ['arros', "l'eau", 'l’eau', 'de l eau'] }, column: 'mixed', canned: "Un arrosoir, c'est un objet pour donner de l'eau aux fleurs." },
  { id: 'E9-chouette', moment: 'E9', from: 'C3', rung: 'define', lang: 'fr', slots: { word: 'une chouette' }, mode: 'record', expect: { kind: 'contains', any: ['oiseau'] }, column: 'mixed', canned: "Une chouette, c'est une fleur qui pousse la nuit." },
  { id: 'E9-rocher', moment: 'E9', from: 'C3', rung: 'define', lang: 'fr', slots: { word: 'un rocher' }, mode: 'record', expect: { kind: 'contains', any: ['pierre', 'caillou'] }, column: 'mixed', canned: "Un rocher, c'est une grosse pierre très dure." },
  // E10 — the letter generator, with a must-contain on the object (the data is the truth).
  { id: 'E10-fr', moment: 'E10', from: 'C5', rung: 'letter', lang: 'fr', slots: { who: 'Biscuit', object: 'croquettes' }, mode: 'pass', expect: { kind: 'contains', any: ['croquettes'] }, column: 'green', canned: 'Pip, mon ami, apporte-moi des croquettes, j’ai un petit creux !' },
  { id: 'E10-en', moment: 'E10', from: '—', rung: 'letter', lang: 'en', slots: { who: 'Biscuit', object: 'kibble' }, mode: 'pass', expect: { kind: 'contains', any: ['kibble'] }, column: 'green', canned: 'Pip, my friend, could you bring me some kibble for my bowl?' },
  // Rung 9, candidate G1 "no letter e": the rule is kept when the answer lacks an e. 🎓 = she breaks it.
  { id: 'R9-G1-fr', moment: 'rung9', from: 'G1', rung: 'no-letter-e', lang: 'fr', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] }, column: 'grad', canned: 'La tulipe blanc est d’une couleur très pâle.' },
  { id: 'R9-G1-en', moment: 'rung9', from: '—', rung: 'no-letter-e', lang: 'en', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', letters: ['e'] }, column: 'grad', canned: 'The tulip is a pretty red flower.' },
  // Rung 9, candidate G2 "never mention water".
  { id: 'R9-G2-fr', moment: 'rung9', from: 'G2', rung: 'no-water', lang: 'fr', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', words: WATER_WORDS.fr }, column: 'grad', canned: 'Pip arrose les tulipes tous les matins.' },
  { id: 'R9-G2-en', moment: 'rung9', from: '—', rung: 'no-water', lang: 'en', slots: {}, times: 3, mode: 'fail', expect: { kind: 'lacks', words: WATER_WORDS.en }, column: 'grad', canned: 'Pip waters the tulips every morning.' },
  // The EN thank-you, candidate A (a wider list) and B (none in EN). Green: a thank-you comes back.
  { id: 'TY-A-en', moment: 'thanks-en', from: 'A9', rung: 'say-thanks-en-wide', lang: 'en', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' }, mode: 'pass', expect: { kind: 'ok' }, column: 'green', canned: 'I really appreciate you trusting me with your garden, Mamie Rose!' },
  { id: 'TY-B-en', moment: 'thanks-en', from: 'A9', rung: 'say-thanks-en-none', lang: 'en', slots: { to: 'Mamie Rose', deed: 'watered her three tulips' }, mode: 'pass', expect: { kind: 'ok' }, column: 'green', canned: 'I really appreciate you trusting me with your garden, Mamie Rose!' }
];

// ── The moments (CG-006 §4) and their decisions (AC6) ───────────────────────

export interface Moment {
  id: string;
  lesson: string;
  /** The task file's status column. */
  status: 'ship' | 'add-probe' | 'grown-ups';
  column: Column | 'certain';
  /** Word keys (cg002Content WORDS). */
  copyKeys: { title: string; line: string };
  /** Where a `ship` row's evidence already is (the readout, the exam, by design). */
  evidence?: string;
  /** The probes that decide an `add-probe` row. */
  probes: ReadonlyArray<string>;
  decision: Decision | 'ships';
}

const mk = (n: number) => ({ title: 'mo' + n + 'Title', line: 'mo' + n + 'Line' });

export const MOMENTS: ReadonlyArray<Moment> = [
  { id: 'E1', lesson: 'a model has no memory; the program’s variable does', status: 'ship', column: 'certain', copyKeys: mk(1), evidence: 'by design: the shell keeps no context between asks (owl.js clears the sequence per ask)', probes: [], decision: 'ships' },
  { id: 'E2', lesson: 'she knows only what you tell her; that is the prompt', status: 'add-probe', column: 'green', copyKeys: mk(2), probes: ['E2-empty', 'E2-row-fr', 'E2-row-en'], decision: 'awaiting-probe' },
  { id: 'E3', lesson: 'reading code; words → blocks → words is lossy', status: 'add-probe', column: 'green', copyKeys: mk(3), probes: ['E3-fr', 'E3-en', 'E3-count'], decision: 'awaiting-probe' },
  { id: 'E4', lesson: 'reading a trace; debugging in words', status: 'add-probe', column: 'green', copyKeys: mk(4), probes: ['E4-fr', 'E4-en'], decision: 'awaiting-probe' },
  { id: 'E5', lesson: 'naming; the model as a label-maker', status: 'add-probe', column: 'green', copyKeys: mk(5), probes: ['E5-fr', 'E5-apt'], decision: 'awaiting-probe' },
  { id: 'E6', lesson: 'transformation vs invention; "shorter" is a rule', status: 'add-probe', column: 'green', copyKeys: mk(6), probes: ['E6-polite', 'E6-poem', 'E6-shorter'], decision: 'awaiting-probe' },
  { id: 'E7', lesson: 'reshaping into a symbol', status: 'add-probe', column: 'green', copyKeys: mk(7), probes: ['E7-tulipe', 'E7-lettre'], decision: 'awaiting-probe' },
  { id: 'E8', lesson: 'ordering is a rule; the program sorts', status: 'add-probe', column: 'grad', copyKeys: mk(8), probes: ['E8-fr', 'E8-en'], decision: 'awaiting-probe' },
  { id: 'E9', lesson: 'small models make things up about the world', status: 'add-probe', column: 'mixed', copyKeys: mk(9), probes: ['E9-arrosoir', 'E9-chouette', 'E9-rocher'], decision: 'awaiting-probe' },
  { id: 'E10', lesson: 'flavour from data; the data is the truth', status: 'add-probe', column: 'green', copyKeys: mk(10), probes: ['E10-fr', 'E10-en'], decision: 'awaiting-probe' },
  { id: 'E11', lesson: 'a call costs time; ask once, remember the answer', status: 'ship', column: 'certain', copyKeys: mk(11), evidence: 'by design: the interpreter parks per ask (CG-002 AC6), the owl row shows thinking (CG-005 §2)', probes: [], decision: 'ships' },
  { id: 'E12', lesson: 'variability; when to trust a single answer', status: 'ship', column: 'certain', copyKeys: mk(12), evidence: 'the readout F2 (three names at 1.2) and exam P05 (distinct ≥ 2)', probes: [], decision: 'ships' },
  { id: 'E13', lesson: 'why the game never lets a child type freely to her', status: 'grown-ups', column: 'certain', copyKeys: mk(13), evidence: 'the readout H1–H3 and exam P18 (the fence fails on purpose)', probes: [], decision: 'ships' }
];

// ── The rulings, probed both ways and NOT chosen ────────────────────────────

export const RULINGS = {
  rung9: {
    question: 'Rung 9 teaches "Olive does not keep a rule about her own words". "Under 5 words" is obeyed 6/6 (CG-004 §7 finding a). Which rule replaces it?',
    candidates: [
      { id: 'G1', rule: 'no letter e', table: 'no-letter-e', probes: ['R9-G1-fr', 'R9-G1-en'], lineKey: 'or9LineG1' },
      { id: 'G2', rule: 'never mention water', table: 'no-water', probes: ['R9-G2-fr', 'R9-G2-en'], lineKey: 'or9LineG2' }
    ],
    chosen: null as null | 'G1' | 'G2'
  },
  thanksEn: {
    question: 'The EN thank-you must-contain (thank, grateful) refused her English 2/2 in the contract test (CG-004 §7 finding c). Widen it, or drop it for EN?',
    candidates: [
      { id: 'A', rule: 'widen: thank, grateful, appreciate, cheers, kind of you, so glad', table: 'say-thanks-en-wide', probes: ['TY-A-en'] },
      { id: 'B', rule: 'drop must-contain for EN; FR keeps merci', table: 'say-thanks-en-none', probes: ['TY-B-en'] }
    ],
    chosen: null as null | 'A' | 'B'
  }
};

// ── Grading ─────────────────────────────────────────────────────────────────

/** `exam.js`'s fold: accents off, lower case. */
export function fold(s: unknown): string {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function wordsOf(text: string): string[] {
  return text
    .split(/\s+/)
    .flatMap((w) => w.split(/['’]/))
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

/**
 * One reply against one expectation. The six `exam.js` kinds are graded exactly as its `meetsOne` does (the gate
 * compares the two on every probe); `lacks` and `containsAll` are this file's.
 */
export function meets(expect: Expect, x: { ok: boolean; value?: unknown; text?: string } | null): boolean {
  if (!x || !x.ok) return false;
  const got = x.value !== undefined ? x.value : x.text;
  switch (expect.kind) {
    case 'ok':
      return true;
    case 'equals':
      return JSON.stringify(got) === JSON.stringify(expect.value);
    case 'items':
      return Array.isArray(x.value) && x.value.length === expect.n && x.value.every((s) => typeof s === 'string' && s.trim());
    case 'contains': {
      const f = fold(got);
      return expect.any.some((a) => f.includes(fold(a)));
    }
    case 'wordsAtMost':
      return String(x.text || '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length <= expect.n;
    case 'lines':
      return String(x.text || '').split('\n').filter((l) => l.trim()).length === expect.n;
    case 'containsAll': {
      const f = fold(got);
      return expect.all.every((a) => f.includes(fold(a)));
    }
    case 'lacks': {
      const f = fold(got);
      if ((expect.letters || []).some((l) => f.includes(fold(l)))) return false;
      const ws = new Set(wordsOf(f));
      return !(expect.words || []).some((w) => ws.has(fold(w)));
    }
    default:
      return false;
  }
}

/** The exam's majority rule (`exam.js` `met`): more than half the replies meet the expectation. */
export function majority(expect: Expect, replies: ReadonlyArray<{ ok: boolean; value?: unknown; text?: string }>): boolean {
  if (!replies.length) return false;
  return replies.filter((r) => meets(expect, r)).length * 2 > replies.length;
}

/** An exam row as `runExam` writes it (only what `decide` reads). */
export interface ExamRow {
  id: string;
  mode: 'pass' | 'fail' | 'record';
  met: boolean;
  pass: boolean;
}

/**
 * A moment's decision from an exam's rows (§4: "a moment ships only after its probe is green, or reliably red for a
 * 🎓"). No row for an asserted probe → `awaiting-probe`. Green / 🎓: every asserted probe passed → `promoted`, any
 * failed → `dropped` (the readout contradicts the design; a re-run is the orchestrator's call, per CG-004 finding b
 * on CPU). Mixed: the recorded probes must disagree among themselves (≥ 1 met and ≥ 1 not) → `promoted`; all the
 * same → `dropped` (the lesson "check her" does not show).
 */
export function decide(moment: Moment, rows: ReadonlyArray<ExamRow>): Decision | 'ships' {
  if (moment.status !== 'add-probe') return 'ships';
  const byId = new Map(rows.map((r) => [r.id, r]));
  const mine = moment.probes.map((id) => PROBES.find((p) => p.id === id)!);
  if (moment.column === 'mixed') {
    const got = mine.map((p) => byId.get(p.id));
    if (got.some((r) => !r)) return 'awaiting-probe';
    const met = got.filter((r) => r!.met).length;
    return met > 0 && met < got.length ? 'promoted' : 'dropped';
  }
  const asserted = mine.filter((p) => p.mode !== 'record');
  if (!asserted.length) return 'awaiting-probe';
  const got = asserted.map((p) => byId.get(p.id));
  if (got.some((r) => !r)) return 'awaiting-probe';
  return got.every((r) => r!.pass) ? 'promoted' : 'dropped';
}

/** The exact cases `exam.js` `meetsOne` needs before the `lacks` / `containsAll` probes are handed to it. */
export const EXAM_KIND_PATCH = [
  "    case 'containsAll': {",
  '      const f = fold(got);',
  '      return expect.all.every((a) => f.includes(fold(a)));',
  '    }',
  "    case 'lacks': {",
  '      const f = fold(got);',
  '      if ((expect.letters || []).some((l) => f.includes(fold(l)))) return false;',
  "      const ws = new Set(f.split(/\\s+/).flatMap((w) => w.split(/['’]/)).map((w) => w.replace(/^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$/gu, '')).filter(Boolean));",
  '      return !(expect.words || []).some((w) => ws.has(fold(w)));',
  '    }'
].join('\n');
