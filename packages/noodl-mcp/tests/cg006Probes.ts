/**
 * CG-006 §4 — the ring-fenced moments and their DECISIONS (AC6), as data over
 * Olive's exam. Nothing here runs the model.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## What lives here (session 3, after Richard's rulings of 2026-09-28)
 *
 * - {@link MOMENTS} — E1–E13 from CG-006 §4: the lesson, the status the task
 *   file gave it, the probes that decided it, and the DECISION. The six the real
 *   model held (CG-006 §7.1: E3 E4 E5 E8 E9 E10) are `promoted` and now live in
 *   the SHIPPED tables as rungs 13–18: their rung-table entries in
 *   `garden-desktop/shell/olive-templates.json`, their probes in `shell/exam.js`.
 *   The three it did not (E2 E6 E7) are `dropped`; their tables and probes stay
 *   below as the recorded evidence ({@link DROPPED_RUNGS}, {@link DROPPED_LISTS}),
 *   so a re-frame (CG-006 §8) is one edit and one probe run.
 * - {@link PROBES} — every moment's probes plus rung 9's. A promoted one is the
 *   exam's own entry (read from `exam.js`, never re-typed here) plus what only
 *   this file knows: the moment, the column it was designed on (`green`, `grad`
 *   = 🎓, `mixed`) and a `canned` reply — written by hand, graded AS THE COLUMN
 *   SAYS, so the gate proves the wiring (slots in list, shape, check) without a
 *   model. A canned reply is not a measurement of Olive; the exam is.
 * - {@link meets} / {@link majority} — the exam's own `meetsOne` / `met`: one
 *   grader, so this file and the exam cannot disagree about a reply.
 * - {@link decide} — a moment's decision from an exam's rows, by §4's rule: "a
 *   moment ships only after its probe is green (or reliably red, for a 🎓)".
 *
 * The rulings themselves are no longer data here: rung 9 is G1 "no letter e"
 * (the rung table's `no-letter-e`, probes R9-G1-fr/en in `exam.js`); the EN
 * thank-you has no must-contain (`say-thanks.mustContain = { fr: ['merci'] }`).
 * G2 "never mention water" and the two thank-you candidates are retired; the
 * readout that decided them is graded in `cg006Requests.test.ts`.
 *
 * @module noodl-mcp/tests/cg006Probes
 */
import * as path from 'path';

export type Column = 'green' | 'grad' | 'mixed';
export type Decision = 'promoted' | 'dropped' | 'awaiting-probe';
export type Lang = 'en' | 'fr';

/** An exam expectation (`exam.js` `KINDS`). */
export type Expect =
  | { kind: 'ok' }
  | { kind: 'equals'; value: unknown }
  | { kind: 'items'; n: number }
  | { kind: 'contains'; any: ReadonlyArray<string> }
  | { kind: 'wordsAtMost'; n: number }
  | { kind: 'lines'; n: number }
  | { kind: 'lacks'; letters?: ReadonlyArray<string>; words?: ReadonlyArray<string> }
  | { kind: 'containsAll'; all: ReadonlyArray<string> };

export interface Probe {
  id: string;
  /** The §4 moment, or `rung9`. */
  moment: string;
  /** The measurement it stands on: a battery probe id, `CG-006 §7.1`, or '—'. */
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
  /** True when the probe is the exam's own entry (a promoted moment, rung 9); false for a dropped moment's evidence. */
  shipped: boolean;
}

/** The shell folder: the rung table and the exam. */
export const SHELL_DIR = path.join(__dirname, '..', '..', '..', 'dev-docs', 'tasks', 'phase-105-the-coding-garden', 'garden-desktop', 'shell');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const EXAM = require(path.join(SHELL_DIR, 'exam.js'));

// ── The dropped moments' tables (olive-templates.json's shape): the evidence, kept re-runnable ─────────────────────

type BiList = { fr: string[]; en: string[] };

/** Lists only the DROPPED moments' rungs use. The promoted ones' lists are in the shipped table. */
export const DROPPED_LISTS: Readonly<Record<string, BiList>> = {
  map_rows: {
    fr: ['La rangée de Pip, de gauche à droite : tulipe, Pip, herbe, herbe.'],
    en: ["Pip's row, from left to right: tulip, Pip, grass, grass."]
  },
  directions: { fr: ['gauche', 'droite', 'devant', 'derrière'], en: ['left', 'right', 'ahead', 'behind'] },
  rewrite_lines: { fr: ["Donne-moi de l'eau pour mes tulipes."], en: ['Give me water for my tulips.'] },
  rewrite_hows: { fr: ['plus poliment', 'comme un poème', 'en plus court'], en: ['more politely', 'like a poem', 'shorter'] },
  emoji_words: { fr: ['tulipe', 'chat', 'lettre', 'œuf'], en: ['tulip', 'cat', 'letter', 'egg'] },
  emojis: { fr: ['🌷', '🐱', '💌', '🥚', '🌻', '💧'], en: ['🌷', '🐱', '💌', '🥚', '🌻', '💧'] }
};

/** A rung-table entry, as `olive-templates.json` writes one. */
export interface RungTemplate {
  n: number;
  band?: 1 | 2;
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

/** The dropped moments' rungs, exactly as they were probed on 2026-09-28 (CG-006 §7.1). Never shipped. */
export const DROPPED_RUNGS: Readonly<Record<string, RungTemplate>> = {
  // E2 — she knows only what the slot tells her. The row is optional: empty, she can only guess.
  'which-way': {
    n: 0, ladder: 'pass', shape: 'one_of', temperature: 0.2, maxTokens: 24,
    slots: { row: { list: 'map_rows', optional: true } }, options: 'directions', system: 'olive',
    user: { fr: '{row} De quel côté de Pip est la tulipe ?', en: '{row} Which side of Pip is the tulip on?' }
  },
  // E6 — transform a given line: politely / like a poem (green), shorter (a rule: expected red).
  rewrite: {
    n: 0, ladder: 'pass', shape: 'sentence', shapes: ['sentence', 'two_lines'], temperature: 0.5, maxTokens: 64,
    slots: { line: { list: 'rewrite_lines' }, how: { list: 'rewrite_hows' } }, system: 'olive',
    user: { fr: 'Redis cette phrase {how} : « {line} »', en: 'Say this line {how}: "{line}"' }
  },
  // E7 — a word → a sticker, as an enum of pictures.
  emoji: {
    n: 0, ladder: 'pass', shape: 'one_of', temperature: 0.2, maxTokens: 24,
    slots: { word: { list: 'emoji_words' } }, options: 'emojis', system: 'olive',
    user: { fr: 'Quelle image va avec le mot « {word} » ?', en: 'Which picture goes with the word "{word}"?' }
  }
};


// ── P106 IG-006 (R6/R7): the promoted moments' rungs 13–18 LEFT the shipped table with the other cut rungs ─────────
// Their tables and exam probes are kept here verbatim (as shipped at f784833b8), so the readings of CG-006 §7.1 stay
// re-runnable (`mergeTemplates`, probe-cg006.mjs) and this file's decisions stay graded. They are not in the exam.

/** The retired rungs' lists (the shipped table's before IG-006). */
export const RETIRED_LISTS: Readonly<Record<string, BiList>> = {
  "programs": {
    "fr": [
      "avancer, avancer, gauche, arroser",
      "droite, avancer, arroser"
    ],
    "en": [
      "forward, forward, turn left, water",
      "turn right, forward, water"
    ]
  },
  "traces": {
    "fr": [
      "avancé, avancé, tourné à droite, arrosé l'herbe, une flaque"
    ],
    "en": [
      "moved, moved, turned right, watered the grass, a puddle"
    ]
  },
  "trick_bodies": {
    "fr": [
      "avancer, avancer, gauche, arroser, droite"
    ],
    "en": [
      "forward, forward, turn left, water, turn right"
    ]
  },
  "word_triples": {
    "fr": [
      "tulipe, arrosoir, chat"
    ],
    "en": [
      "tulip, bucket, cat"
    ]
  },
  "garden_words": {
    "fr": [
      "un arrosoir",
      "un pissenlit",
      "une chouette",
      "un rocher"
    ],
    "en": [
      "a watering can",
      "a dandelion",
      "an owl",
      "a rock"
    ]
  },
  "request_objects": {
    "fr": [
      "croquettes",
      "graines",
      "lettre",
      "œufs"
    ],
    "en": [
      "kibble",
      "seeds",
      "letter",
      "eggs"
    ]
  }
};

/** The retired rungs 13–18, exactly as they shipped. */
export const RETIRED_RUNGS: Readonly<Record<string, RungTemplate & { use?: string; verdict?: string }>> = {
  "explain-program": {
    "n": 13,
    "band": 2,
    "ladder": "pass",
    "shape": "sentence",
    "temperature": 0.2,
    "maxTokens": 48,
    "slots": {
      "program": {
        "list": "programs"
      }
    },
    "system": "olive",
    "user": {
      "fr": "Voici les blocs de Pip, dans l’ordre : {program}. Dis en une phrase ce que fait Pip.",
      "en": "Here are Pip's blocks, in order: {program}. Say in one sentence what Pip does."
    },
    "use": "retired"
  },
  "narrate-run": {
    "n": 14,
    "band": 2,
    "ladder": "pass",
    "shape": "sentence",
    "temperature": 0.5,
    "maxTokens": 48,
    "slots": {
      "trace": {
        "list": "traces"
      }
    },
    "system": "olive",
    "user": {
      "fr": "Voici ce que Pip a fait : {trace}. Raconte-le en une phrase.",
      "en": "This is what Pip did: {trace}. Tell it in one sentence."
    },
    "use": "retired"
  },
  "name-trick": {
    "n": 15,
    "band": 2,
    "ladder": "pass",
    "shape": "one_word",
    "temperature": 0.8,
    "maxTokens": 24,
    "slots": {
      "body": {
        "list": "trick_bodies"
      }
    },
    "system": "olive",
    "user": {
      "fr": "Voici une astuce de Pip : {body}. Donne-lui un nom court.",
      "en": "Here is one of Pip's tricks: {body}. Give it a short name."
    },
    "use": "retired"
  },
  "sort-words": {
    "n": 16,
    "band": 2,
    "ladder": "fail",
    "shape": "list_of_3",
    "temperature": 0.2,
    "maxTokens": 48,
    "slots": {
      "words": {
        "list": "word_triples"
      }
    },
    "system": "olive",
    "user": {
      "fr": "Range ces trois mots dans l’ordre alphabétique : {words}.",
      "en": "Put these three words in alphabetical order: {words}."
    },
    "use": "retired"
  },
  "define": {
    "n": 17,
    "band": 2,
    "ladder": "fail",
    "verdict": "mixed",
    "shape": "sentence",
    "temperature": 0.5,
    "maxTokens": 48,
    "slots": {
      "word": {
        "list": "garden_words"
      }
    },
    "system": "olive",
    "user": {
      "fr": "Explique à un enfant ce que c’est, {word}, en une phrase.",
      "en": "Explain to a child what {word} is, in one sentence."
    },
    "use": "retired"
  },
  "letter": {
    "n": 18,
    "band": 2,
    "ladder": "pass",
    "shape": "sentence",
    "temperature": 0.8,
    "maxTokens": 48,
    "slots": {
      "who": {
        "list": "islanders"
      },
      "object": {
        "list": "request_objects"
      }
    },
    "system": "olive",
    "user": {
      "fr": "Ce que {who} veut : {object}. Écris la demande de {who} à Pip, en une phrase, comme si {who} parlait.",
      "en": "What {who} wants: {object}. Write {who}'s request to Pip in one sentence, as if {who} were speaking."
    },
    "mustContain": {
      "fr": [
        "{object}"
      ],
      "en": [
        "{object}"
      ]
    },
    "use": "retired"
  }
};

/** The retired rungs' exam probes, exactly as `exam.js` carried them (CG-006 §7.1's readings). */
export const RETIRED_PROBES: ReadonlyArray<any> = [
  // CG-006 §4's moments promoted to rungs 13–18 (s3), each probe as measured in CG-006 §7.1 (CPU and Metal agreed on
  // every decision). The EN twins nobody measured (E5-en, E9-en) are recorded, one sample.
  // 13 — E3 explain my program (✅).
  { id: 'E3-fr', from: 'CG-006 §7.1', rung: 'explain-program', lang: 'fr', slots: { program: 'avancer, avancer, gauche, arroser' }, mode: 'pass', expect: { kind: 'containsAll', all: ['avance', 'gauche', 'arros'] } },
  { id: 'E3-en', from: 'CG-006 §7.1', rung: 'explain-program', lang: 'en', slots: { program: 'forward, forward, turn left, water' }, mode: 'pass', expect: { kind: 'containsAll', all: ['forward', 'left', 'water'] } },
  // The round trip is lossy: does "avancer, avancer" come back as "deux fois"? Recorded: the lesson either way.
  { id: 'E3-count', from: '—', rung: 'explain-program', lang: 'fr', slots: { program: 'avancer, avancer, gauche, arroser' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['deux'] } },
  // 14 — E4 Olive narrates the run (✅).
  { id: 'E4-fr', from: 'CG-006 §7.1', rung: 'narrate-run', lang: 'fr', slots: { trace: "avancé, avancé, tourné à droite, arrosé l'herbe, une flaque" }, mode: 'pass', expect: { kind: 'contains', any: ['flaque'] } },
  { id: 'E4-en', from: 'CG-006 §7.1', rung: 'narrate-run', lang: 'en', slots: { trace: 'moved, moved, turned right, watered the grass, a puddle' }, mode: 'pass', expect: { kind: 'contains', any: ['puddle'] } },
  // 15 — E5 name my trick (✅: a one-word name comes back; how apt it is, is recorded).
  { id: 'E5-fr', from: 'CG-006 §7.1', rung: 'name-trick', lang: 'fr', slots: { body: 'avancer, avancer, gauche, arroser, droite' }, mode: 'pass', expect: { kind: 'ok' } },
  { id: 'E5-apt', from: '—', rung: 'name-trick', lang: 'fr', slots: { body: 'avancer, avancer, gauche, arroser, droite' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['arros', 'rang', 'tulip', 'pluie', 'goutte'] } },
  { id: 'E5-en', from: '—', rung: 'name-trick', lang: 'en', slots: { body: 'forward, forward, turn left, water, turn right' }, times: 1, mode: 'record', expect: { kind: 'ok' } },
  // 16 — E8 🎓 sort these words: reliably wrong (0/3 FR and EN, both paths), so the program sorts. The input is in
  // neither order, so a copy of it is not a sort.
  { id: 'E8-fr', from: 'CG-006 §7.1', rung: 'sort-words', lang: 'fr', slots: { words: 'tulipe, arrosoir, chat' }, mode: 'fail', expect: { kind: 'equals', value: ['arrosoir', 'chat', 'tulipe'] } },
  { id: 'E8-en', from: 'CG-006 §7.1', rung: 'sort-words', lang: 'en', slots: { words: 'tulip, bucket, cat' }, mode: 'fail', expect: { kind: 'equals', value: ['bucket', 'cat', 'tulip'] } },
  // 17 — E9 🎓 Olive's dictionary: MIXED by design (the rung's `verdict: 'mixed'`): offered when her definitions
  // DISAGREE — some right, some made up. Recorded; the rung verdict reads the set. `arroser`, not `arros`: the headword
  // "arrosoir" itself contains "arros", so the old expectation met whenever she repeated the word.
  { id: 'E9-arrosoir', from: 'CG-006 §7.1', rung: 'define', lang: 'fr', slots: { word: 'un arrosoir' }, mode: 'record', expect: { kind: 'contains', any: ['arroser', "l'eau", 'l’eau', 'de l eau'] } },
  { id: 'E9-chouette', from: 'CG-006 §7.1', rung: 'define', lang: 'fr', slots: { word: 'une chouette' }, mode: 'record', expect: { kind: 'contains', any: ['oiseau'] } },
  { id: 'E9-rocher', from: 'CG-006 §7.1', rung: 'define', lang: 'fr', slots: { word: 'un rocher' }, mode: 'record', expect: { kind: 'contains', any: ['pierre', 'caillou'] } },
  { id: 'E9-en', from: '—', rung: 'define', lang: 'en', slots: { word: 'a rock' }, times: 1, mode: 'record', expect: { kind: 'contains', any: ['stone'] } },
  // 18 — E10 the letter generator (✅, with the rung's must-contain on the object: the data is the truth).
  { id: 'E10-fr', from: 'CG-006 §7.1', rung: 'letter', lang: 'fr', slots: { who: 'Biscuit', object: 'croquettes' }, mode: 'pass', expect: { kind: 'contains', any: ['croquettes'] } },
  { id: 'E10-en', from: 'CG-006 §7.1', rung: 'letter', lang: 'en', slots: { who: 'Biscuit', object: 'kibble' }, mode: 'pass', expect: { kind: 'contains', any: ['kibble'] } }
];

/** The shipped table plus the dropped moments' lists and rungs, as a NEW object (the base is never written). */
export function mergeTemplates(base: any): any {
  const t = JSON.parse(JSON.stringify(base));
  for (const [name, list] of Object.entries(DROPPED_LISTS)) {
    if (t.lists[name]) throw new Error('list already in the table: ' + name);
    t.lists[name] = list;
  }
  for (const [id, r] of Object.entries(DROPPED_RUNGS)) {
    if (t.rungs[id]) throw new Error('rung already in the table: ' + id);
    t.rungs[id] = JSON.parse(JSON.stringify(r));
  }
  // IG-006: the retired rungs 13–18 and their lists, so their probes can be run again (never shipped).
  for (const [name, list] of Object.entries(RETIRED_LISTS)) if (!t.lists[name]) t.lists[name] = JSON.parse(JSON.stringify(list));
  for (const [id, r] of Object.entries(RETIRED_RUNGS)) if (!t.rungs[id]) t.rungs[id] = JSON.parse(JSON.stringify(r));
  return t;
}

// ── The probes ──────────────────────────────────────────────────────────────

/**
 * The exam's own probe `id`, with this file's moment / column / canned reply; since IG-006, a retired rung's probe comes
 * from RETIRED_PROBES and is `shipped: false`. Throws if neither has it.
 */
function shipped(id: string, moment: string, column: Column, canned: string): Probe {
  const live = (EXAM.PROBES as any[]).find((x) => x.id === id);
  const p = live || RETIRED_PROBES.find((x) => x.id === id);
  if (!p) throw new Error('exam.js has no probe ' + id);
  return { ...JSON.parse(JSON.stringify(p)), moment, column, canned, shipped: !!live };
}

/** A dropped moment's probe, kept as the evidence (never in the exam). */
function dropped(p: Omit<Probe, 'shipped' | 'from'> & { from?: string }): Probe {
  return { from: '—', ...p, shipped: false };
}

const ROW = DROPPED_LISTS.map_rows;
const LINE = DROPPED_LISTS.rewrite_lines.fr[0];

export const PROBES: ReadonlyArray<Probe> = [
  // E2 — Olive can't see the garden. DROPPED: FR with the row in the slot said derrière / devant / devant, never gauche.
  dropped({ id: 'E2-empty', moment: 'E2', rung: 'which-way', lang: 'fr', slots: {}, mode: 'record', expect: { kind: 'equals', value: 'gauche' }, column: 'mixed', canned: '{ "objet": "droite" }' }),
  dropped({ id: 'E2-row-fr', moment: 'E2', rung: 'which-way', lang: 'fr', slots: { row: ROW.fr[0] }, mode: 'pass', expect: { kind: 'equals', value: 'gauche' }, column: 'green', canned: '{ "objet": "gauche" }' }),
  dropped({ id: 'E2-row-en', moment: 'E2', rung: 'which-way', lang: 'en', slots: { row: ROW.en[0] }, mode: 'pass', expect: { kind: 'equals', value: 'left' }, column: 'green', canned: '{ "objet": "left" }' }),
  // E3 — explain my program. PROMOTED: rung 13.
  shipped('E3-fr', 'E3', 'green', 'Pip avance deux fois, tourne à gauche et arrose la tulipe.'),
  shipped('E3-en', 'E3', 'green', 'Pip goes forward twice, turns left and waters the tulip.'),
  shipped('E3-count', 'E3', 'mixed', 'Pip avance, tourne à gauche et arrose.'),
  // E4 — Olive narrates the run. PROMOTED: rung 14.
  shipped('E4-fr', 'E4', 'green', 'Pip a avancé deux fois, a tourné à droite et a fait une flaque dans l’herbe.'),
  shipped('E4-en', 'E4', 'green', 'Pip walked twice, turned right and made a puddle on the grass.'),
  // E5 — name my trick. PROMOTED: rung 15.
  shipped('E5-fr', 'E5', 'green', '{ "prenom": "Arroseur" }'),
  shipped('E5-apt', 'E5', 'mixed', '{ "prenom": "Zigzag" }'),
  shipped('E5-en', 'E5', 'mixed', '{ "prenom": "Sprinkler" }'),
  // E6 — rewrite it. DROPPED: "polite" adds a preamble (1/3, 0/3); "shorter" she does, so it cannot be the 🎓.
  dropped({ id: 'E6-polite', moment: 'E6', rung: 'rewrite', lang: 'fr', slots: { line: LINE, how: 'plus poliment' }, mode: 'pass', expect: { kind: 'contains', any: ["s'il te plait", 's’il te plait', "s'il vous plait", 's’il vous plait', 'merci', 'pourrais', 'pourriez', 'voudrais'] }, column: 'green', canned: "Pourrais-tu me donner de l'eau pour mes tulipes, s'il te plaît ?" }),
  dropped({ id: 'E6-poem', moment: 'E6', from: 'A5', rung: 'rewrite', lang: 'fr', slots: { line: LINE, how: 'comme un poème' }, shape: 'two_lines', mode: 'pass', expect: { kind: 'lines', n: 2 }, column: 'green', canned: "Une goutte d'eau, s'il te plaît,\npour mes tulipes qui ont soif." }),
  dropped({ id: 'E6-shorter', moment: 'E6', from: 'B5', rung: 'rewrite', lang: 'fr', slots: { line: LINE, how: 'en plus court' }, mode: 'fail', expect: { kind: 'wordsAtMost', n: 5 }, column: 'grad', canned: "Donne-moi un peu d'eau pour mes belles tulipes." }),
  // E7 — a word → a sticker. DROPPED: "lettre" → 🌻 / 🌻 / 🌷, only the garden's emoji.
  dropped({ id: 'E7-tulipe', moment: 'E7', rung: 'emoji', lang: 'fr', slots: { word: 'tulipe' }, mode: 'pass', expect: { kind: 'equals', value: '🌷' }, column: 'green', canned: '{ "objet": "🌷" }' }),
  dropped({ id: 'E7-lettre', moment: 'E7', rung: 'emoji', lang: 'fr', slots: { word: 'lettre' }, mode: 'pass', expect: { kind: 'equals', value: '💌' }, column: 'green', canned: '{ "objet": "💌" }' }),
  // E8 🎓 — sort these words. PROMOTED: rung 16.
  shipped('E8-fr', 'E8', 'grad', '{ "noms": ["tulipe", "arrosoir", "chat"] }'),
  shipped('E8-en', 'E8', 'grad', '{ "noms": ["tulip", "bucket", "cat"] }'),
  // E9 🎓 — Olive's dictionary, mixed by design. PROMOTED: rung 17.
  shipped('E9-arrosoir', 'E9', 'mixed', "Un arrosoir, c'est un objet pour donner de l'eau aux fleurs."),
  shipped('E9-chouette', 'E9', 'mixed', "Une chouette, c'est une fleur qui pousse la nuit."),
  shipped('E9-rocher', 'E9', 'mixed', "Un rocher, c'est une grosse pierre très dure."),
  shipped('E9-en', 'E9', 'mixed', 'A rock is a big hard stone.'),
  // E10 — the letter generator, with the rung's must-contain on the object. PROMOTED: rung 18.
  shipped('E10-fr', 'E10', 'green', 'Pip, mon ami, apporte-moi des croquettes, j’ai un petit creux !'),
  shipped('E10-en', 'E10', 'green', 'Pip, my friend, could you bring me some kibble for my bowl?'),
  // Rung 9 = G1 "no letter e" (ruling 2): the rule is kept when the answer lacks an e. 🎓 = she breaks it.
  shipped('R9-G1-fr', 'rung9', 'grad', 'La tulipe blanc est d’une couleur très pâle.'),
  shipped('R9-G1-en', 'rung9', 'grad', 'The tulip is a pretty red flower.')
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
  /** Where a `ship` row's evidence already is (the readout, the exam, by design); a decided row's readings. */
  evidence?: string;
  /** The probes that decide an `add-probe` row. */
  probes: ReadonlyArray<string>;
  decision: Decision | 'ships';
  /** A promoted moment's rung: its number on the ladder and its rung-table id. */
  rung?: { n: number; table: string };
}

const mk = (n: number) => ({ title: 'mo' + n + 'Title', line: 'mo' + n + 'Line' });
const S71 = 'CG-006 §7.1, probe-cg006.mjs on the real model, CPU 2 threads and Metal, 2026-09-28: ';

export const MOMENTS: ReadonlyArray<Moment> = [
  { id: 'E1', lesson: 'a model has no memory; the program’s variable does', status: 'ship', column: 'certain', copyKeys: mk(1), evidence: 'by design: the shell keeps no context between asks (owl.js clears the sequence per ask)', probes: [], decision: 'ships' },
  { id: 'E2', lesson: 'she knows only what you tell her; that is the prompt', status: 'add-probe', column: 'green', copyKeys: mk(2), probes: ['E2-empty', 'E2-row-fr', 'E2-row-en'], decision: 'dropped', evidence: S71 + 'FR with the row 0/3 (derrière, devant, devant), EN 3/3 — the FR half contradicts the design' },
  { id: 'E3', lesson: 'reading code; words → blocks → words is lossy', status: 'add-probe', column: 'green', copyKeys: mk(3), probes: ['E3-fr', 'E3-en', 'E3-count'], decision: 'promoted', evidence: S71 + 'FR 3/3 both paths; EN 2/3 CPU, 3/3 Metal', rung: { n: 13, table: 'explain-program' } },
  { id: 'E4', lesson: 'reading a trace; debugging in words', status: 'add-probe', column: 'green', copyKeys: mk(4), probes: ['E4-fr', 'E4-en'], decision: 'promoted', evidence: S71 + 'FR 3/3, EN 3/3, both paths', rung: { n: 14, table: 'narrate-run' } },
  { id: 'E5', lesson: 'naming; the model as a label-maker', status: 'add-probe', column: 'green', copyKeys: mk(5), probes: ['E5-fr', 'E5-apt', 'E5-en'], decision: 'promoted', evidence: S71 + '3/3 both paths ("apt" recorded 0/3)', rung: { n: 15, table: 'name-trick' } },
  { id: 'E6', lesson: 'transformation vs invention; "shorter" is a rule', status: 'add-probe', column: 'green', copyKeys: mk(6), probes: ['E6-polite', 'E6-poem', 'E6-shorter'], decision: 'dropped', evidence: S71 + 'polite 1/3 CPU, 0/3 Metal (a preamble and a question); "shorter" obeyed 3/3 CPU, 1/3 Metal, so it cannot be the 🎓' },
  { id: 'E7', lesson: 'reshaping into a symbol', status: 'add-probe', column: 'green', copyKeys: mk(7), probes: ['E7-tulipe', 'E7-lettre'], decision: 'dropped', evidence: S71 + 'tulipe 3/3, lettre 0/3 both paths (🌻 / 🌻 / 🌷: only the garden’s emoji)' },
  { id: 'E8', lesson: 'ordering is a rule; the program sorts', status: 'add-probe', column: 'grad', copyKeys: mk(8), probes: ['E8-fr', 'E8-en'], decision: 'promoted', evidence: S71 + 'sorted 0/3 FR and EN, both paths: reliably wrong, as the lesson needs', rung: { n: 16, table: 'sort-words' } },
  { id: 'E9', lesson: 'small models make things up about the world', status: 'add-probe', column: 'mixed', copyKeys: mk(9), probes: ['E9-arrosoir', 'E9-chouette', 'E9-rocher', 'E9-en'], decision: 'promoted', evidence: S71 + 'mixed on both paths (CPU rocher 3/3, arrosoir 0/3, chouette 0/3; Metal 1/3, 0/3, 2/3)', rung: { n: 17, table: 'define' } },
  { id: 'E10', lesson: 'flavour from data; the data is the truth', status: 'add-probe', column: 'green', copyKeys: mk(10), probes: ['E10-fr', 'E10-en'], decision: 'promoted', evidence: S71 + 'FR 2/3 CPU, 3/3 Metal; EN 3/3 both — the must-contain on the object holds', rung: { n: 18, table: 'letter' } },
  { id: 'E11', lesson: 'a call costs time; ask once, remember the answer', status: 'ship', column: 'certain', copyKeys: mk(11), evidence: 'by design: the interpreter parks per ask (CG-002 AC6), the owl row shows thinking (CG-005 §2)', probes: [], decision: 'ships' },
  { id: 'E12', lesson: 'variability; when to trust a single answer', status: 'ship', column: 'certain', copyKeys: mk(12), evidence: 'the readout F2 (three names at 1.2) and exam P05 (distinct ≥ 2)', probes: [], decision: 'ships' },
  { id: 'E13', lesson: 'why the game never lets a child type freely to her', status: 'grown-ups', column: 'certain', copyKeys: mk(13), evidence: 'the readout H1–H3 and exam P18 (the fence fails on purpose)', probes: [], decision: 'ships' }
];

// ── Grading: the exam's own ─────────────────────────────────────────────────

/** `exam.js`'s fold: accents off, lower case. */
export function fold(s: unknown): string {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** One reply against one expectation: `exam.js` `meetsOne`, the one grader. */
export function meets(expect: Expect, x: { ok: boolean; value?: unknown; text?: string } | null): boolean {
  return EXAM.meetsOne(expect, x);
}

/** The exam's majority rule (`exam.js` `met`): more than half the replies meet the expectation. */
export function majority(expect: Expect, replies: ReadonlyArray<{ ok: boolean; value?: unknown; text?: string }>): boolean {
  return EXAM.met(expect, replies);
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
 * failed → `dropped`. Mixed: the recorded probes must disagree among themselves (≥ 1 met and ≥ 1 not) → `promoted`;
 * all the same → `dropped` (the lesson "check her" does not show). The exam's rung verdict for a promoted rung uses the
 * same rule (`exam.js` `verdictOf`), so a machine offers the rung exactly when this would have promoted it.
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
