/**
 * TPL-007 / P113 REV-003 — the subjects beyond maths: French (as the language of school), English (as the foreign
 * language), History. Plus the topics every skill is filed under, which is what the chooser (REV-001) shows.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## Why these are lists, mostly
 *
 * Maths skills are GENERATED (a table, a sum, a number to spell): the generator makes a new question every time.
 * French grammar, English vocabulary and history are mostly FACTS a child has to hold: which mode `que nous
 * finissions` is in, what `cheval` becomes in the plural, roughly when Homo sapiens reached Europe. So most skills
 * here are `generator: 'list'`: a bank of `{ q, a, opts?, note? }` items. The engine (`listQ` in tpl007Scripts.ts)
 * asks an item the child has not learned yet first, draws the wrong buttons from the OTHER items' answers (so the
 * distractors are the real confusions, not invented ones), remembers each item's streak in the learner model, and pays
 * a star when an item is learned and a bigger one when the whole list is (REV-004). A person's own revision list goes
 * through exactly the same engine (REV-002), so "what the teacher gave us" and "what ships" are one mechanism.
 *
 * Conjugation is the exception: it is generated (`conjugateQ`), from the verb tables below.
 *
 * ## 🔴 Dates are said as "vers", and the wrong buttons are far away
 *
 * Richard, 2026-10-04: his daughter's teacher reads prehistory dates from an older textbook, and a child who learns
 * the current date here can be marked wrong at school. So every date item here (1) says `vers` / `around`, (2) carries
 * a `note` saying the range and that older books differ, and (3) is only ever offered beside answers an order of
 * magnitude apart: nobody is asked to pick between -400 000 and -450 000. What a child must know for a test that uses
 * the teacher's own dates goes in a revision list of their own (REV-002), which this engine then drills.
 *
 * ## Content and the interface are two languages
 *
 * The interface is EN by default (the template is for everyone) and the content is the French school's. A French
 * grammar item is French in both interface languages (the material IS French); its instruction is translated. A
 * history item is given in both languages. An English vocabulary item is FR ↔ EN in either direction (`both`).
 *
 * Sources: the briefing beside the task file, `rev-research-briefing.md` (programmes 2025 cycle 2, cycle 3; the
 * Terminologie grammaticale 2020; Eduscol repères). Where the briefing names a disagreement, the item's note says so.
 *
 * @module noodl-mcp/tests/tpl007Subjects
 */
import type { Bi, Skill, TeachCard } from './tpl007Curriculum';

const s = (en: string, fr: string): Bi => ({ en, fr });
/** The same words in both languages: French grammar material, a date, a proper name. */
const same = (text: string): Bi => ({ en: text, fr: text });

// ── Subjects and topics ─────────────────────────────────────────────────────

export type Subject = 'maths' | 'typing' | 'french' | 'english' | 'history';

/** The subjects, in the order the chooser shows them. `lists` (a person's own revision lists) is added by the chooser itself. */
export const SUBJECTS: ReadonlyArray<{ id: Subject; name: Bi; glyph: string }> = [
  { id: 'maths', name: s('Maths', 'Maths'), glyph: '🔢' },
  { id: 'french', name: s('French', 'Français'), glyph: '📝' },
  { id: 'english', name: s('English', 'Anglais'), glyph: '🇬🇧' },
  { id: 'history', name: s('History', 'Histoire'), glyph: '🏺' },
  { id: 'typing', name: s('Typing', 'Frappe'), glyph: '⌨️' }
];

export interface Topic {
  id: string;
  subject: Subject;
  name: Bi;
}

/** Every topic a skill can be filed under. The chooser's second step. Order here is the order shown. */
export const TOPICS: ReadonlyArray<Topic> = [
  // Maths — the programme's own headings.
  { id: 'add-sub', subject: 'maths', name: s('Adding and taking away', 'Additions et soustractions') },
  { id: 'bonds', subject: 'maths', name: s('Pairs that make 10, 20, 100', 'Compléments à 10, 20, 100') },
  { id: 'tables', subject: 'maths', name: s('Times tables', 'Tables de multiplication') },
  { id: 'multiply', subject: 'maths', name: s('Multiplying', 'Multiplier') },
  { id: 'divide', subject: 'maths', name: s('Dividing', 'Diviser') },
  { id: 'big-numbers', subject: 'maths', name: s('Big numbers', 'Les grands nombres') },
  { id: 'place-value', subject: 'maths', name: s('Place value', 'Rangs et chiffres') },
  { id: 'compare-round', subject: 'maths', name: s('Comparing and rounding', 'Comparer et arrondir') },
  { id: 'fractions', subject: 'maths', name: s('Fractions', 'Fractions') },
  { id: 'decimals', subject: 'maths', name: s('Decimals', 'Nombres décimaux') },
  { id: 'percent-proportion', subject: 'maths', name: s('Percentages and proportion', 'Pourcentages et proportionnalité') },
  { id: 'equations', subject: 'maths', name: s('Equals and order of operations', 'Le signe égal et les priorités') },
  // Typing.
  { id: 'keys', subject: 'typing', name: s('Keys', 'Les touches') },
  { id: 'words', subject: 'typing', name: s('Words', 'Les mots') },
  // French.
  { id: 'conjugation', subject: 'french', name: s('Conjugation', 'Conjugaison') },
  { id: 'verb-study', subject: 'french', name: s('The verb: modes, tenses, voices', 'L’étude du verbe : modes, temps, voix') },
  { id: 'word-classes', subject: 'french', name: s('Word classes', 'Les classes de mots') },
  { id: 'homophones', subject: 'french', name: s('Homophones', 'Les homophones') },
  { id: 'agreement', subject: 'french', name: s('Plurals and feminines', 'Pluriels et féminins') },
  // English.
  { id: 'en-vocab', subject: 'english', name: s('Vocabulary', 'Vocabulaire') },
  { id: 'en-numbers', subject: 'english', name: s('Numbers in English', 'Les nombres en anglais') },
  { id: 'en-grammar', subject: 'english', name: s('Grammar', 'Grammaire') },
  // History.
  { id: 'time', subject: 'history', name: s('Periods and centuries', 'Périodes et siècles') },
  { id: 'prehistory', subject: 'history', name: s('Prehistory', 'La Préhistoire') },
  { id: 'antiquity', subject: 'history', name: s('Antiquity', 'L’Antiquité') },
  { id: 'france-landmarks', subject: 'history', name: s('Landmarks of French history', 'Repères de l’histoire de France') }
];

/** Where each maths and typing skill of the original curriculum is filed. The gate asserts every skill has a topic. */
export const TOPIC_OF: Readonly<Record<string, string>> = {
  'add-to-20': 'add-sub', 'add-bridge': 'add-sub', 'sub-bridge': 'add-sub', compensation: 'add-sub', 'sub-compensation': 'add-sub', 'sub-borrow': 'add-sub', 'double-half': 'add-sub',
  'bond-10': 'bonds', 'bond-20': 'bonds', 'bond-100': 'bonds',
  'table-2': 'tables', 'table-3': 'tables', 'table-4': 'tables', 'table-5': 'tables', 'table-6': 'tables', 'table-7': 'tables', 'table-8': 'tables', 'table-9': 'tables', 'table-10': 'tables', 'tables-mixed': 'tables',
  'pow10-int': 'multiply', 'pow10-1000': 'multiply', 'x4-x8': 'multiply', x5: 'multiply', 'x50-x25': 'multiply', 'dec-pow10': 'decimals', 'dec-pow10-small': 'decimals', 'mul-small': 'decimals',
  'euclid-1': 'divide', 'euclid-2': 'divide', 'div-4-8': 'divide', 'div-small': 'decimals',
  'big-10000': 'big-numbers', 'big-999999': 'big-numbers', 'big-999999999': 'big-numbers', 'big-milliard': 'big-numbers',
  'place-value-4': 'place-value', 'place-value-6': 'place-value', 'place-value-9': 'place-value',
  'compare-10000': 'compare-round', 'round-int': 'compare-round', 'round-dec': 'compare-round',
  'frac-unit': 'fractions', 'frac-compare': 'fractions', 'frac-of': 'fractions', 'frac-dec': 'fractions', 'frac-quotient': 'fractions', 'frac-times-int': 'fractions',
  'dec-compare-2': 'decimals', 'dec-compare-3': 'decimals',
  percent: 'percent-proportion', proportion: 'percent-proportion',
  'equals-balance': 'equations', 'order-ops': 'equations',
  'type-home': 'keys', 'type-home-words': 'keys', 'type-top': 'keys', 'type-bottom': 'keys', 'type-digits': 'keys',
  'type-words-short': 'words', 'type-words-long': 'words', 'type-sentence': 'words'
};

// ── French verbs, for the conjugation generator ─────────────────────────────

export type Person = 0 | 1 | 2 | 3 | 4 | 5;
export const PERSONS_FR: ReadonlyArray<string> = ['je', 'tu', 'il', 'nous', 'vous', 'ils'];

/** Imparfait from its stem: the endings are the same for every verb in the language. */
const imparfait = (stem: string): string[] => ['ais', 'ais', 'ait', 'ions', 'iez', 'aient'].map((e) => stem + e);
/** A regular first-group present (`chanter`) and the second group's (`finir`). */
const presentEr = (stem: string): string[] => ['e', 'es', 'e', 'ons', 'ez', 'ent'].map((e) => stem + e);
const presentIr = (stem: string): string[] => ['is', 'is', 'it', 'issons', 'issez', 'issent'].map((e) => stem + e);
const passeSimpleEr = (stem: string): string[] => ['ai', 'as', 'a', 'âmes', 'âtes', 'èrent'].map((e) => stem + e);
const passeSimpleI = (stem: string): string[] => ['is', 'is', 'it', 'îmes', 'îtes', 'irent'].map((e) => stem + e);
const passeSimpleU = (stem: string): string[] => ['us', 'us', 'ut', 'ûmes', 'ûtes', 'urent'].map((e) => stem + e);
const subjEr = (stem: string): string[] => ['e', 'es', 'e', 'ions', 'iez', 'ent'].map((e) => stem + e);

export interface FrenchVerb {
  inf: string;
  group: 1 | 2 | 3;
  /** `avoir` or `être` in the compound tenses. */
  aux: 'avoir' | 'être';
  pp: string;
  /** présent, six persons. */
  pres: string[];
  /** imparfait, six persons (full, because `manger` keeps its e before a and o but not before i). */
  imp: string[];
  /** The stem of the futur simple and the conditionnel présent (`fer-` → je ferai, je ferais). */
  fut: string;
  /** passé simple, six persons. */
  ps: string[];
  /** subjonctif présent, six persons. */
  subj: string[];
  /** impératif présent: tu, nous, vous. Null where the verb has none in use. */
  imper: string[] | null;
}

/**
 * The verbs the programmes name for cycle 2 and cycle 3 (être, avoir, aller, faire, dire, venir, pouvoir, voir, vouloir,
 * prendre, and the first and second groups), plus a few that every list of "verbes fréquents" carries. Every form was
 * written out, not derived, where the verb is irregular.
 */
export const FRENCH_VERBS: ReadonlyArray<FrenchVerb> = [
  { inf: 'être', group: 3, aux: 'avoir', pp: 'été', pres: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], imp: imparfait('ét'), fut: 'ser', ps: ['fus', 'fus', 'fut', 'fûmes', 'fûtes', 'furent'], subj: ['sois', 'sois', 'soit', 'soyons', 'soyez', 'soient'], imper: ['sois', 'soyons', 'soyez'] },
  { inf: 'avoir', group: 3, aux: 'avoir', pp: 'eu', pres: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], imp: imparfait('av'), fut: 'aur', ps: ['eus', 'eus', 'eut', 'eûmes', 'eûtes', 'eurent'], subj: ['aie', 'aies', 'ait', 'ayons', 'ayez', 'aient'], imper: ['aie', 'ayons', 'ayez'] },
  { inf: 'aller', group: 3, aux: 'être', pp: 'allé', pres: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], imp: imparfait('all'), fut: 'ir', ps: passeSimpleEr('all'), subj: ['aille', 'ailles', 'aille', 'allions', 'alliez', 'aillent'], imper: ['va', 'allons', 'allez'] },
  { inf: 'faire', group: 3, aux: 'avoir', pp: 'fait', pres: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], imp: imparfait('fais'), fut: 'fer', ps: ['fis', 'fis', 'fit', 'fîmes', 'fîtes', 'firent'], subj: ['fasse', 'fasses', 'fasse', 'fassions', 'fassiez', 'fassent'], imper: ['fais', 'faisons', 'faites'] },
  { inf: 'dire', group: 3, aux: 'avoir', pp: 'dit', pres: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'], imp: imparfait('dis'), fut: 'dir', ps: ['dis', 'dis', 'dit', 'dîmes', 'dîtes', 'dirent'], subj: ['dise', 'dises', 'dise', 'disions', 'disiez', 'disent'], imper: ['dis', 'disons', 'dites'] },
  { inf: 'venir', group: 3, aux: 'être', pp: 'venu', pres: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'], imp: imparfait('ven'), fut: 'viendr', ps: ['vins', 'vins', 'vint', 'vînmes', 'vîntes', 'vinrent'], subj: ['vienne', 'viennes', 'vienne', 'venions', 'veniez', 'viennent'], imper: ['viens', 'venons', 'venez'] },
  { inf: 'prendre', group: 3, aux: 'avoir', pp: 'pris', pres: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'], imp: imparfait('pren'), fut: 'prendr', ps: ['pris', 'pris', 'prit', 'prîmes', 'prîtes', 'prirent'], subj: ['prenne', 'prennes', 'prenne', 'prenions', 'preniez', 'prennent'], imper: ['prends', 'prenons', 'prenez'] },
  { inf: 'pouvoir', group: 3, aux: 'avoir', pp: 'pu', pres: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], imp: imparfait('pouv'), fut: 'pourr', ps: passeSimpleU('p'), subj: ['puisse', 'puisses', 'puisse', 'puissions', 'puissiez', 'puissent'], imper: null },
  { inf: 'vouloir', group: 3, aux: 'avoir', pp: 'voulu', pres: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'], imp: imparfait('voul'), fut: 'voudr', ps: passeSimpleU('voul'), subj: ['veuille', 'veuilles', 'veuille', 'voulions', 'vouliez', 'veuillent'], imper: null },
  { inf: 'voir', group: 3, aux: 'avoir', pp: 'vu', pres: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], imp: imparfait('voy'), fut: 'verr', ps: ['vis', 'vis', 'vit', 'vîmes', 'vîtes', 'virent'], subj: ['voie', 'voies', 'voie', 'voyions', 'voyiez', 'voient'], imper: ['vois', 'voyons', 'voyez'] },
  { inf: 'devoir', group: 3, aux: 'avoir', pp: 'dû', pres: ['dois', 'dois', 'doit', 'devons', 'devez', 'doivent'], imp: imparfait('dev'), fut: 'devr', ps: passeSimpleU('d'), subj: ['doive', 'doives', 'doive', 'devions', 'deviez', 'doivent'], imper: null },
  { inf: 'savoir', group: 3, aux: 'avoir', pp: 'su', pres: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'], imp: imparfait('sav'), fut: 'saur', ps: passeSimpleU('s'), subj: ['sache', 'saches', 'sache', 'sachions', 'sachiez', 'sachent'], imper: ['sache', 'sachons', 'sachez'] },
  { inf: 'mettre', group: 3, aux: 'avoir', pp: 'mis', pres: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'], imp: imparfait('mett'), fut: 'mettr', ps: ['mis', 'mis', 'mit', 'mîmes', 'mîtes', 'mirent'], subj: subjEr('mett'), imper: ['mets', 'mettons', 'mettez'] },
  { inf: 'partir', group: 3, aux: 'être', pp: 'parti', pres: ['pars', 'pars', 'part', 'partons', 'partez', 'partent'], imp: imparfait('part'), fut: 'partir', ps: passeSimpleI('part'), subj: subjEr('part'), imper: ['pars', 'partons', 'partez'] },
  { inf: 'finir', group: 2, aux: 'avoir', pp: 'fini', pres: presentIr('fin'), imp: imparfait('finiss'), fut: 'finir', ps: passeSimpleI('fin'), subj: subjEr('finiss'), imper: ['finis', 'finissons', 'finissez'] },
  { inf: 'grandir', group: 2, aux: 'avoir', pp: 'grandi', pres: presentIr('grand'), imp: imparfait('grandiss'), fut: 'grandir', ps: passeSimpleI('grand'), subj: subjEr('grandiss'), imper: ['grandis', 'grandissons', 'grandissez'] },
  { inf: 'chanter', group: 1, aux: 'avoir', pp: 'chanté', pres: presentEr('chant'), imp: imparfait('chant'), fut: 'chanter', ps: passeSimpleEr('chant'), subj: subjEr('chant'), imper: ['chante', 'chantons', 'chantez'] },
  { inf: 'jouer', group: 1, aux: 'avoir', pp: 'joué', pres: presentEr('jou'), imp: imparfait('jou'), fut: 'jouer', ps: passeSimpleEr('jou'), subj: subjEr('jou'), imper: ['joue', 'jouons', 'jouez'] },
  { inf: 'manger', group: 1, aux: 'avoir', pp: 'mangé', pres: ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent'], imp: ['mangeais', 'mangeais', 'mangeait', 'mangions', 'mangiez', 'mangeaient'], fut: 'manger', ps: ['mangeai', 'mangeas', 'mangea', 'mangeâmes', 'mangeâtes', 'mangèrent'], subj: subjEr('mang'), imper: ['mange', 'mangeons', 'mangez'] },
  { inf: 'regarder', group: 1, aux: 'avoir', pp: 'regardé', pres: presentEr('regard'), imp: imparfait('regard'), fut: 'regarder', ps: passeSimpleEr('regard'), subj: subjEr('regard'), imper: ['regarde', 'regardons', 'regardez'] }
];

/** The tenses the generator can ask, with the names a French test uses. The id is what a skill's `params.tenses` names. */
export const FRENCH_TENSES: ReadonlyArray<{ id: string; name: string; mode: string }> = [
  { id: 'present', name: 'présent', mode: 'indicatif' },
  { id: 'imparfait', name: 'imparfait', mode: 'indicatif' },
  { id: 'futur', name: 'futur simple', mode: 'indicatif' },
  { id: 'passeCompose', name: 'passé composé', mode: 'indicatif' },
  { id: 'passeSimple', name: 'passé simple', mode: 'indicatif' },
  { id: 'plusQueParfait', name: 'plus-que-parfait', mode: 'indicatif' },
  { id: 'conditionnel', name: 'conditionnel présent', mode: 'indicatif' },
  { id: 'subjonctif', name: 'subjonctif présent', mode: 'subjonctif' },
  { id: 'imperatif', name: 'impératif présent', mode: 'impératif' }
];

// ── Item banks ──────────────────────────────────────────────────────────────

/** One item of a list skill. `opts` given means those are the buttons; otherwise the other items' answers are. */
export interface ListItem {
  q: Bi | string;
  a: Bi | string;
  opts?: ReadonlyArray<Bi | string>;
  /** Said with the correction: the rule, or the range a date really spans. */
  note?: Bi;
  /** This item may be asked backwards (answer → question). */
  both?: boolean;
  id?: string;
}

export interface ListParams {
  items: ReadonlyArray<ListItem>;
  /** The instruction said before the item's own text, forwards. */
  ask?: Bi;
  /** The instruction when the item is asked backwards. */
  askBack?: Bi;
  /** Every item may be asked backwards. */
  both?: boolean;
}

const MODE_NOTE = s('Officially (2020) the conditionnel is a tense of the indicatif; some books still call it a mode.', 'Officiellement (2020), le conditionnel est un temps de l’indicatif ; des manuels en font encore un mode.');

const VERB_MODES: ListItem[] = [
  { q: same('finissez !'), a: same('impératif'), note: s('An order, no subject pronoun: impératif.', 'Un ordre, sans pronom sujet : impératif.') },
  { q: same('nous finirions'), a: same('indicatif'), note: MODE_NOTE },
  { q: same('finir'), a: same('infinitif'), note: s('The verb’s name, as in the dictionary: infinitif.', 'Le nom du verbe, comme dans le dictionnaire : infinitif.') },
  { q: same('finissant'), a: same('participe'), note: s('The -ant form (participe présent) and the -é/-i/-u form (participe passé) are the participe.', 'La forme en -ant (participe présent) et la forme en -é/-i/-u (participe passé) sont le participe.') },
  { q: same('nous finissons'), a: same('indicatif'), note: s('A fact, stated: indicatif.', 'Un fait, affirmé : indicatif.') },
  { q: same('viens ici !'), a: same('impératif') },
  { q: same('elle viendra'), a: same('indicatif') },
  { q: same('venu'), a: same('participe') },
  { q: same('soyez prudents !'), a: same('impératif') },
  { q: same('nous avons chanté'), a: same('indicatif'), note: s('A compound tense of the indicatif (passé composé).', 'Un temps composé de l’indicatif (le passé composé).') },
  { q: same('je voudrais un gâteau'), a: same('indicatif'), note: MODE_NOTE },
  { q: same('chanter'), a: same('infinitif') },
  { q: same('ayant'), a: same('participe') },
  { q: same('allons-y !'), a: same('impératif') },
  { q: same('ils prirent la route'), a: same('indicatif'), note: s('The passé simple is a tense of the indicatif.', 'Le passé simple est un temps de l’indicatif.') },
  { q: same('pris'), a: same('participe') }
];

const VERB_TENSES: ListItem[] = [
  { q: same('nous chantions'), a: same('imparfait') },
  { q: same('ils chantèrent'), a: same('passé simple') },
  { q: same('tu as chanté'), a: same('passé composé') },
  { q: same('vous chanterez'), a: same('futur simple') },
  { q: same('j’avais chanté'), a: same('plus-que-parfait') },
  { q: same('elle chanterait'), a: same('conditionnel présent'), note: MODE_NOTE },
  { q: same('chantons !'), a: same('impératif présent') },
  { q: same('il aura chanté'), a: same('futur antérieur') },
  { q: same('nous chantons'), a: same('présent') },
  { q: same('je finissais'), a: same('imparfait') },
  { q: same('nous finîmes'), a: same('passé simple') },
  { q: same('ils ont fini'), a: same('passé composé') },
  { q: same('tu finiras'), a: same('futur simple') },
  { q: same('vous aviez fini'), a: same('plus-que-parfait') },
  { q: same('nous finirions'), a: same('conditionnel présent'), note: MODE_NOTE },
  { q: same('finis !'), a: same('impératif présent') },
  { q: same('elles seront parties'), a: same('futur antérieur') },
  { q: same('je prends'), a: same('présent') },
  { q: same('il prit'), a: same('passé simple') },
  { q: same('nous étions venus'), a: same('plus-que-parfait') },
  { q: same('vous verriez'), a: same('conditionnel présent'), note: MODE_NOTE }
];

/**
 * P113 ruling 1 (Richard, 2026-10-04): the subjonctif is cycle 4 (5e), so a 6e child only SPOTS it — "subjonctif or indicatif?" —
 * and never conjugates it. Each subjonctif sits beside an indicatif of the same verb, so the « que » and the ending are what tell.
 */
const VERB_SUBJ_SPOT: ListItem[] = [
  { q: same('qu’il vienne'), a: same('subjonctif'), note: s('After « que », a wish or a doubt: subjonctif.', 'Après « que », un souhait ou un doute : subjonctif.') },
  { q: same('il vient'), a: same('indicatif'), note: s('A fact, stated: indicatif.', 'Un fait, affirmé : indicatif.') },
  { q: same('il faut que tu sois là'), a: same('subjonctif'), note: s('« il faut que » always takes the subjonctif.', '« il faut que » appelle toujours le subjonctif.') },
  { q: same('tu es là'), a: same('indicatif') },
  { q: same('que vous fassiez'), a: same('subjonctif') },
  { q: same('vous faites'), a: same('indicatif') },
  { q: same('je veux qu’elle parte'), a: same('subjonctif'), note: s('« vouloir que » wants something: subjonctif.', '« vouloir que » exprime un souhait : subjonctif.') },
  { q: same('elle part'), a: same('indicatif') },
  { q: same('qu’il finisse'), a: same('subjonctif') },
  { q: same('il finit'), a: same('indicatif') },
  { q: same('que nous ayons'), a: same('subjonctif') },
  { q: same('nous avons'), a: same('indicatif') },
  { q: same('bien qu’il pleuve'), a: same('subjonctif'), note: s('« bien que » always takes the subjonctif.', '« bien que » appelle toujours le subjonctif.') },
  { q: same('il pleut'), a: same('indicatif') }
];

const VERB_VOICES: ListItem[] = [
  { q: same('Le chat mange la souris.'), a: same('voix active'), note: s('The subject does the action.', 'Le sujet fait l’action.') },
  { q: same('La souris est mangée par le chat.'), a: same('voix passive'), note: s('The subject undergoes the action: être + participe passé, often « par ».', 'Le sujet subit l’action : être + participe passé, souvent « par ».') },
  { q: same('Les enfants se lavent.'), a: same('voix pronominale'), note: s('A pronoun (me, te, se…) looks back at the subject. Official term: voix pronominale; books often say forme pronominale.', 'Un pronom (me, te, se…) renvoie au sujet. Terme officiel : voix pronominale ; les manuels disent souvent forme pronominale.') },
  { q: same('La maison a été construite en 1900.'), a: same('voix passive') },
  { q: same('Nous construisons une cabane.'), a: same('voix active') },
  { q: same('Je me souviens de ce jour.'), a: same('voix pronominale') },
  { q: same('Les feuilles sont emportées par le vent.'), a: same('voix passive') },
  { q: same('Le vent emporte les feuilles.'), a: same('voix active') },
  { q: same('Vous vous trompez.'), a: same('voix pronominale') },
  { q: same('Ce livre a été écrit par une enfant.'), a: same('voix passive') },
  { q: same('Elle écrit une lettre.'), a: same('voix active') },
  { q: same('Ils se téléphonent tous les soirs.'), a: same('voix pronominale') }
];

const VERB_SIMPLE_COMPOUND: ListItem[] = [
  { q: same('nous avons fini'), a: same('temps composé'), note: s('Auxiliary + participe passé: two words, a compound tense.', 'Auxiliaire + participe passé : deux mots, un temps composé.') },
  { q: same('nous finissons'), a: same('temps simple'), note: s('One word: a simple tense.', 'Un seul mot : un temps simple.') },
  { q: same('elle était partie'), a: same('temps composé') },
  { q: same('elle partait'), a: same('temps simple') },
  { q: same('ils auront vu'), a: same('temps composé') },
  { q: same('ils verront'), a: same('temps simple') },
  { q: same('tu chanterais'), a: same('temps simple') },
  { q: same('tu aurais chanté'), a: same('temps composé') },
  { q: same('je suis venu'), a: same('temps composé') },
  { q: same('je vins'), a: same('temps simple') },
  { q: same('que vous ayez pris'), a: same('temps composé') },
  { q: same('que vous preniez'), a: same('temps simple') }
];

const VERB_GROUPS: ListItem[] = [
  { q: same('chanter'), a: same('1er groupe'), note: s('-er, except aller.', 'En -er, sauf aller.') },
  { q: same('finir'), a: same('2e groupe'), note: s('-ir with -issons: nous finissons.', 'En -ir avec -issons : nous finissons.') },
  { q: same('prendre'), a: same('3e groupe') },
  { q: same('aller'), a: same('3e groupe'), note: s('The one -er verb that is NOT first group: je vais, nous allons, ils vont.', 'Le seul verbe en -er qui n’est PAS du 1er groupe : je vais, nous allons, ils vont.') },
  { q: same('courir'), a: same('3e groupe'), note: s('-ir but no -issons: nous courons. Third group.', 'En -ir mais sans -issons : nous courons. 3e groupe.') },
  { q: same('grandir'), a: same('2e groupe') },
  { q: same('partir'), a: same('3e groupe'), note: s('nous partons, not « partissons »: third group.', 'Nous partons, pas « partissons » : 3e groupe.') },
  { q: same('manger'), a: same('1er groupe') },
  { q: same('voir'), a: same('3e groupe') },
  { q: same('rougir'), a: same('2e groupe') },
  { q: same('être'), a: same('3e groupe'), note: s('être and avoir are third group (some books say « auxiliaires », apart).', 'Être et avoir sont du 3e groupe (certains manuels les mettent à part : « auxiliaires »).') },
  { q: same('jouer'), a: same('1er groupe') },
  { q: same('choisir'), a: same('2e groupe') },
  { q: same('venir'), a: same('3e groupe') },
  { q: same('dire'), a: same('3e groupe') },
  { q: same('réussir'), a: same('2e groupe') },
  { q: same('ouvrir'), a: same('3e groupe'), note: s('-ir but conjugated like -er: j’ouvre. Third group.', 'En -ir mais conjugué comme -er : j’ouvre. 3e groupe.') },
  { q: same('regarder'), a: same('1er groupe') }
];

const VERB_AUX: ListItem[] = [
  { q: same('aller (il … allé)'), a: same('être'), note: s('Verbs of movement and change (aller, venir, partir, arriver, naître, mourir, rester, tomber…) take être.', 'Les verbes de mouvement ou de changement (aller, venir, partir, arriver, naître, mourir, rester, tomber…) prennent être.') },
  { q: same('manger (il … mangé)'), a: same('avoir') },
  { q: same('venir (il … venu)'), a: same('être') },
  { q: same('finir (il … fini)'), a: same('avoir') },
  { q: same('partir (il … parti)'), a: same('être') },
  { q: same('voir (il … vu)'), a: same('avoir') },
  { q: same('arriver (il … arrivé)'), a: same('être') },
  { q: same('prendre (il … pris)'), a: same('avoir') },
  { q: same('tomber (il … tombé)'), a: same('être') },
  { q: same('faire (il … fait)'), a: same('avoir') },
  { q: same('naître (il … né)'), a: same('être') },
  { q: same('dire (il … dit)'), a: same('avoir') },
  { q: same('rester (il … resté)'), a: same('être') },
  { q: same('être (il … été)'), a: same('avoir'), note: s('être takes avoir: il a été.', 'Être prend avoir : il a été.') }
];

const WORD_CLASS_OPTS_CE2 = ['nom', 'verbe', 'déterminant', 'adjectif'];
const WORD_CLASSES_CE2: ListItem[] = ([
  ['Le chat dort.', 'chat', 'nom'], ['Le chat dort.', 'dort', 'verbe'], ['Le chat dort.', 'Le', 'déterminant'],
  ['Une petite maison rouge.', 'petite', 'adjectif'], ['Une petite maison rouge.', 'maison', 'nom'], ['Une petite maison rouge.', 'Une', 'déterminant'],
  ['Les enfants jouent.', 'jouent', 'verbe'], ['Les enfants jouent.', 'enfants', 'nom'], ['Les enfants jouent.', 'Les', 'déterminant'],
  ['Mon frère est grand.', 'grand', 'adjectif'], ['Mon frère est grand.', 'Mon', 'déterminant'], ['Mon frère est grand.', 'est', 'verbe'],
  ['Elle mange une pomme verte.', 'mange', 'verbe'], ['Elle mange une pomme verte.', 'verte', 'adjectif'], ['Elle mange une pomme verte.', 'pomme', 'nom'],
  ['Ce gros chien court vite.', 'gros', 'adjectif'], ['Ce gros chien court vite.', 'court', 'verbe'], ['Ce gros chien court vite.', 'Ce', 'déterminant']
] as const).map(([sentence, word, cls]) => ({ q: same(`« ${word} » dans : ${sentence}`), a: same(cls), opts: WORD_CLASS_OPTS_CE2 }));

const WORD_CLASS_OPTS_6E = ['nom', 'verbe', 'déterminant', 'adjectif', 'pronom', 'adverbe', 'préposition', 'conjonction'];
const WORD_CLASSES_6E: ListItem[] = ([
  ['Il court très vite.', 'très', 'adverbe'], ['Il court très vite.', 'Il', 'pronom'], ['Il court très vite.', 'vite', 'adverbe'],
  ['Le livre est sur la table.', 'sur', 'préposition'], ['Le livre est sur la table.', 'table', 'nom'],
  ['Je viens mais je repars.', 'mais', 'conjonction'], ['Je viens mais je repars.', 'Je', 'pronom'],
  ['Nous partons demain.', 'demain', 'adverbe'], ['Nous partons demain.', 'Nous', 'pronom'],
  ['Elle parle à sa sœur.', 'à', 'préposition'], ['Elle parle à sa sœur.', 'sa', 'déterminant'],
  ['Pierre et Paul arrivent.', 'et', 'conjonction'], ['Pierre et Paul arrivent.', 'arrivent', 'verbe'],
  ['Les oiseaux chantent joyeusement.', 'joyeusement', 'adverbe'], ['Les oiseaux chantent joyeusement.', 'oiseaux', 'nom'],
  ['Tu le vois ?', 'le', 'pronom'], ['Tu le vois ?', 'vois', 'verbe'],
  ['Un vieux pont de pierre.', 'vieux', 'adjectif'], ['Un vieux pont de pierre.', 'de', 'préposition'],
  ['Il pleut, donc je reste.', 'donc', 'conjonction'], ['Il pleut, donc je reste.', 'reste', 'verbe'],
  ['Cette idée est bonne.', 'Cette', 'déterminant'], ['Cette idée est bonne.', 'bonne', 'adjectif'],
  ['Ils ne viendront jamais.', 'jamais', 'adverbe']
] as const).map(([sentence, word, cls]) => ({ q: same(`« ${word} » dans : ${sentence}`), a: same(cls), opts: WORD_CLASS_OPTS_6E }));

const homophone = (sentence: string, answer: string, opts: string[], noteEn: string, noteFr: string): ListItem => ({ q: same(sentence), a: same(answer), opts, note: s(noteEn, noteFr) });

const HOMOPHONES_CE2: ListItem[] = [
  homophone('Il ___ parti à l’école.', 'a', ['a', 'à'], '« a » is the verb avoir: say « avait ». « à » is a preposition.', '« a », c’est le verbe avoir : on peut dire « avait ». « à » est une préposition.'),
  homophone('Je vais ___ la piscine.', 'à', ['a', 'à'], 'You cannot say « avait la piscine »: it is « à ».', 'On ne peut pas dire « avait la piscine » : c’est « à ».'),
  homophone('Mon chat ___ noir.', 'est', ['et', 'est'], '« est » is the verb être: say « était ».', '« est », c’est le verbe être : on peut dire « était ».'),
  homophone('Un chat ___ un chien.', 'et', ['et', 'est'], '« et » adds: say « et puis ».', '« et » ajoute : on peut dire « et puis ».'),
  homophone('___ va à la plage.', 'On', ['On', 'Ont'], '« on » is a pronoun: say « il ».', '« on » est un pronom : on peut dire « il ».'),
  homophone('Ils ___ faim.', 'ont', ['on', 'ont'], '« ont » is the verb avoir: say « avaient ».', '« ont », c’est le verbe avoir : on peut dire « avaient ».'),
  homophone('Elle range ___ cartable.', 'son', ['son', 'sont'], '« son » is a determiner: say « mon ».', '« son » est un déterminant : on peut dire « mon ».'),
  homophone('Les enfants ___ sages.', 'sont', ['son', 'sont'], '« sont » is the verb être: say « étaient ».', '« sont », c’est le verbe être : on peut dire « étaient ».'),
  homophone('Elle ___ une sœur.', 'a', ['a', 'à'], 'Say « avait une sœur »: it works, so « a ».', 'On peut dire « avait une sœur » : donc « a ».'),
  homophone('Il habite ___ Lyon.', 'à', ['a', 'à'], 'Say « avait Lyon »: it does not work, so « à ».', '« avait Lyon » ne marche pas : donc « à ».'),
  homophone('Papa ___ maman arrivent.', 'et', ['et', 'est'], 'Say « et puis maman »: « et ».', '« et puis maman » : donc « et ».'),
  homophone('Le ciel ___ bleu.', 'est', ['et', 'est'], 'Say « était bleu »: « est ».', '« était bleu » marche : donc « est ».'),
  homophone('___ dirait qu’il pleut.', 'On', ['On', 'Ont'], 'Say « il dirait »: « on ».', '« il dirait » marche : donc « on ».'),
  homophone('Elles ___ gagné.', 'ont', ['on', 'ont'], 'Say « avaient gagné »: « ont ».', '« avaient gagné » marche : donc « ont ».'),
  homophone('Ils ___ partis.', 'sont', ['son', 'sont'], 'Say « étaient partis »: « sont ».', '« étaient partis » marche : donc « sont ».'),
  homophone('Il a perdu ___ ballon.', 'son', ['son', 'sont'], 'Say « mon ballon »: « son ».', '« mon ballon » marche : donc « son ».')
];

const HOMOPHONES_6E: ListItem[] = [
  homophone('___ livre est à moi.', 'Ce', ['Ce', 'Se'], '« ce » goes before a noun (say « ces » in the plural). « se » goes before a verb.', '« ce » est devant un nom (au pluriel : « ces »). « se » est devant un verbe.'),
  homophone('Il ___ lave les mains.', 'se', ['ce', 'se'], '« se » goes before a verb: say « nous nous lavons ».', '« se » est devant un verbe : on peut dire « nous nous lavons ».'),
  homophone('___ chaussures sont neuves.', 'Ces', ['Ces', 'Ses'], '« ces » points: say « ces chaussures-là ». « ses » belongs: « les siennes ».', '« ces » montre : « ces chaussures-là ». « ses » appartient : « les siennes ».'),
  homophone('Elle a oublié ___ clés.', 'ses', ['ces', 'ses'], 'They are hers: « ses » (« les siennes »).', 'Ce sont les siennes : « ses ».'),
  homophone('___ une belle journée.', 'C’est', ['C’est', 'S’est'], '« c’est » = « cela est ». « s’est » goes with a reflexive verb: « il s’est levé ».', '« c’est » = « cela est ». « s’est » accompagne un verbe pronominal : « il s’est levé ».'),
  homophone('Il ___ réveillé tôt.', 's’est', ['c’est', 's’est'], 'Say « je me suis réveillé »: « s’est ».', '« je me suis réveillé » marche : donc « s’est ».'),
  homophone('Tu veux du thé ___ du café ?', 'ou', ['ou', 'où'], '« ou » = « ou bien ». « où » says a place.', '« ou » = « ou bien ». « où » indique un lieu.'),
  homophone('___ habites-tu ?', 'Où', ['Ou', 'Où'], 'A place: « où ».', 'Un lieu : « où ».'),
  homophone('Le chien est ___, près de la porte.', 'là', ['la', 'là', 'l’a'], '« là » says a place (« ici »). « la » is a determiner or pronoun. « l’a » = « le/la a ».', '« là » indique un lieu (« ici »). « la » est un déterminant ou un pronom. « l’a » = « le/la a ».'),
  homophone('Il ___ mangé.', 'l’a', ['la', 'là', 'l’a'], 'Say « l’avait mangé »: « l’a ».', '« l’avait mangé » marche : donc « l’a ».'),
  homophone('Ils rangent ___ chambre.', 'leur', ['leur', 'leurs'], 'One room each: singular « leur ». Before a verb « leur » never takes an s.', 'Une chambre : singulier « leur ». Devant un verbe, « leur » ne prend jamais de s.'),
  homophone('Ils rangent ___ affaires.', 'leurs', ['leur', 'leurs'], 'Several things: « leurs ».', 'Plusieurs choses : « leurs ».'),
  homophone('___ heure est-il ?', 'Quelle', ['Quelle', 'Qu’elle'], '« quelle » agrees with a noun. « qu’elle » = « que elle ».', '« quelle » s’accorde avec un nom. « qu’elle » = « que elle ».'),
  homophone('Je crois ___ viendra.', 'qu’elle', ['quelle', 'qu’elle'], 'Say « qu’il viendra »: « qu’elle ».', '« qu’il viendra » marche : donc « qu’elle ».'),
  homophone('J’aime les pommes ___ pas les poires.', 'mais', ['mais', 'mes'], '« mais » opposes (« pourtant »). « mes » = « les miens ».', '« mais » oppose (« pourtant »). « mes » = « les miens ».'),
  homophone('___ parents arrivent.', 'Mes', ['Mais', 'Mes'], 'They are mine: « mes ».', 'Ce sont les miens : « mes ».'),
  homophone('Il ___ nager.', 'peut', ['peu', 'peux', 'peut'], '« il peut » (pouvoir, il). « tu peux ». « peu » = pas beaucoup.', '« il peut » (pouvoir, il). « tu peux ». « peu » = pas beaucoup.'),
  homophone('Tu ___ venir.', 'peux', ['peu', 'peux', 'peut'], '« tu peux », with an x.', '« tu peux », avec un x.'),
  homophone('Il reste ___ de pain.', 'peu', ['peu', 'peux', 'peut'], '« peu » = not much: say « pas beaucoup ».', '« peu » = pas beaucoup.'),
  homophone('___ les enfants sont là.', 'Tous', ['Tout', 'Tous'], 'Plural, before « les enfants »: « tous ».', 'Pluriel, devant « les enfants » : « tous ».'),
  homophone('Il a ___ mangé.', 'tout', ['tout', 'tous'], 'Adverb, invariable: « tout mangé ».', 'Adverbe, invariable : « tout mangé ».'),
  homophone('Elle est partie ___ rien dire.', 'sans', ['sans', 's’en'], '« sans » = without. « s’en » = se + en: « il s’en va ».', '« sans » = privé de. « s’en » = se + en : « il s’en va ».'),
  homophone('Il ___ va demain.', 's’en', ['sans', 's’en'], 'Say « je m’en vais »: « s’en ».', '« je m’en vais » marche : donc « s’en ».'),
  homophone('Je ___ sais rien.', 'n’en', ['ni', 'n’y', 'n’en'], '« n’en » = ne + en (« je ne sais rien de cela »).', '« n’en » = ne + en (« je ne sais rien de cela »).')
];

const plural = (sing: string, plur: string, wrong: string[], noteEn: string, noteFr: string): ListItem => ({ q: s(`Plural of « ${sing} »`, `Le pluriel de « ${sing} »`), a: same(plur), opts: [plur, ...wrong], note: s(noteEn, noteFr) });
const PLURALS: ListItem[] = [
  plural('un cheval', 'des chevaux', ['des chevals', 'des chevaus'], '-al → -aux (except bal, carnaval, festival, chacal…).', '-al → -aux (sauf bal, carnaval, festival, chacal…).'),
  plural('un animal', 'des animaux', ['des animals', 'des animaus'], '-al → -aux.', '-al → -aux.'),
  plural('un bateau', 'des bateaux', ['des bateaus', 'des bateau'], '-eau → -eaux: always an x.', '-eau → -eaux : toujours un x.'),
  plural('un gâteau', 'des gâteaux', ['des gâteaus', 'des gâteau'], '-eau → -eaux.', '-eau → -eaux.'),
  plural('un jeu', 'des jeux', ['des jeus', 'des jeu'], '-eu → -eux (except pneu, bleu: pneus, bleus).', '-eu → -eux (sauf pneu, bleu : pneus, bleus).'),
  plural('un pneu', 'des pneus', ['des pneux', 'des pneu'], 'pneu and bleu take an s: the exception.', 'Pneu et bleu prennent un s : l’exception.'),
  plural('un chou', 'des choux', ['des chous', 'des chou'], 'Seven -ou words take an x: bijou, caillou, chou, genou, hibou, joujou, pou.', 'Sept mots en -ou prennent un x : bijou, caillou, chou, genou, hibou, joujou, pou.'),
  plural('un clou', 'des clous', ['des cloux', 'des clou'], 'Not one of the seven: clous.', 'Pas dans les sept : clous.'),
  plural('un hibou', 'des hiboux', ['des hibous', 'des hibou'], 'One of the seven -ou words with an x.', 'Un des sept mots en -ou avec un x.'),
  plural('une souris', 'des souris', ['des souriss', 'des sourises'], 'Already ends in s: no change.', 'Finit déjà par s : pas de changement.'),
  plural('un nez', 'des nez', ['des nezs', 'des nés'], 'Ends in z: no change.', 'Finit par z : pas de changement.'),
  plural('une noix', 'des noix', ['des noixs', 'des nois'], 'Ends in x: no change.', 'Finit par x : pas de changement.'),
  plural('un travail', 'des travaux', ['des travails', 'des travaux '], 'travail → travaux (also émail, vitrail, corail).', 'travail → travaux (aussi émail, vitrail, corail).'),
  plural('un détail', 'des détails', ['des détaux', 'des détail'], 'Most -ail words take an s.', 'La plupart des mots en -ail prennent un s.'),
  plural('un œil', 'des yeux', ['des œils', 'des œux'], 'A special plural: yeux.', 'Un pluriel à part : yeux.'),
  plural('un bal', 'des bals', ['des baux', 'des bal'], 'bal is an exception to -al → -aux.', 'Bal est une exception à -al → -aux.'),
  plural('un tableau', 'des tableaux', ['des tableaus', 'des tableau'], '-eau → -eaux.', '-eau → -eaux.'),
  plural('un festival', 'des festivals', ['des festivaux', 'des festival'], 'festival is an exception: festivals.', 'Festival est une exception : festivals.')
];

const feminine = (masc: string, fem: string, wrong: string[], noteEn: string, noteFr: string): ListItem => ({ q: s(`Feminine of « ${masc} »`, `Le féminin de « ${masc} »`), a: same(fem), opts: [fem, ...wrong], note: s(noteEn, noteFr) });
const FEMININES: ListItem[] = [
  feminine('heureux', 'heureuse', ['heureuxe', 'heureue'], '-eux → -euse.', '-eux → -euse.'),
  feminine('long', 'longue', ['longe', 'longa'], '-g → -gue.', '-g → -gue.'),
  feminine('blanc', 'blanche', ['blance', 'blanque'], 'blanc → blanche, franc → franche.', 'blanc → blanche, franc → franche.'),
  feminine('gentil', 'gentille', ['gentile', 'gentie'], '-il → -ille.', '-il → -ille.'),
  feminine('neuf', 'neuve', ['neufe', 'neuvee'], '-f → -ve.', '-f → -ve.'),
  feminine('beau', 'belle', ['beaue', 'bele'], 'beau → belle, nouveau → nouvelle.', 'beau → belle, nouveau → nouvelle.'),
  feminine('vieux', 'vieille', ['vieuse', 'vieile'], 'vieux → vieille.', 'vieux → vieille.'),
  feminine('doux', 'douce', ['douse', 'douxe'], 'doux → douce.', 'doux → douce.'),
  feminine('premier', 'première', ['premiere', 'premierre'], '-ier → -ière.', '-ier → -ière.'),
  feminine('fier', 'fière', ['fiere', 'fierre'], '-er → -ère.', '-er → -ère.'),
  feminine('un acteur', 'une actrice', ['une acteure', 'une acteuse'], '-teur → -trice.', '-teur → -trice.'),
  feminine('un chanteur', 'une chanteuse', ['une chantrice', 'une chanteure'], '-eur → -euse when the verb exists (chanter).', '-eur → -euse quand le verbe existe (chanter).'),
  feminine('un boulanger', 'une boulangère', ['une boulangere', 'une boulangeuse'], '-er → -ère.', '-er → -ère.'),
  feminine('un loup', 'une louve', ['une loupe', 'une loupve'], 'loup → louve.', 'loup → louve.'),
  feminine('un chat', 'une chatte', ['une chate', 'une chatee'], 'Double the t: chatte.', 'On double le t : chatte.'),
  feminine('un lion', 'une lionne', ['une lione', 'une lionesse'], '-on → -onne.', '-on → -onne.')
];

// English vocabulary: FR → EN, both ways.
const vocab = (fr: string, en: string): ListItem => ({ q: same(fr), a: same(en), both: true });
const EN_COLOURS: ListItem[] = [['rouge', 'red'], ['bleu', 'blue'], ['vert', 'green'], ['jaune', 'yellow'], ['noir', 'black'], ['blanc', 'white'], ['orange', 'orange'], ['rose', 'pink'], ['violet', 'purple'], ['marron', 'brown'], ['gris', 'grey']].map(([f, e]) => vocab(f, e));
const EN_ANIMALS: ListItem[] = [['un chat', 'a cat'], ['un chien', 'a dog'], ['un oiseau', 'a bird'], ['un poisson', 'a fish'], ['un cheval', 'a horse'], ['une vache', 'a cow'], ['un mouton', 'a sheep'], ['un cochon', 'a pig'], ['un lapin', 'a rabbit'], ['une souris', 'a mouse'], ['un lion', 'a lion'], ['un éléphant', 'an elephant'], ['un singe', 'a monkey'], ['un ours', 'a bear'], ['une poule', 'a hen'], ['une grenouille', 'a frog']].map(([f, e]) => vocab(f, e));
const EN_CLASSROOM: ListItem[] = [['un livre', 'a book'], ['un stylo', 'a pen'], ['un crayon', 'a pencil'], ['une gomme', 'a rubber'], ['une règle', 'a ruler'], ['un cartable', 'a schoolbag'], ['une table', 'a table'], ['une chaise', 'a chair'], ['un tableau', 'a board'], ['une trousse', 'a pencil case'], ['des ciseaux', 'scissors'], ['la colle', 'glue'], ['la maîtresse', 'the teacher'], ['la classe', 'the classroom']].map(([f, e]) => vocab(f, e));
const EN_FAMILY: ListItem[] = [['la mère', 'the mother'], ['le père', 'the father'], ['la sœur', 'the sister'], ['le frère', 'the brother'], ['la grand-mère', 'the grandmother'], ['le grand-père', 'the grandfather'], ['la tante', 'the aunt'], ['l’oncle', 'the uncle'], ['la fille', 'the daughter'], ['le fils', 'the son'], ['les parents', 'the parents'], ['le bébé', 'the baby']].map(([f, e]) => vocab(f, e));
const EN_BODY: ListItem[] = [['la tête', 'the head'], ['les yeux', 'the eyes'], ['le nez', 'the nose'], ['la bouche', 'the mouth'], ['les oreilles', 'the ears'], ['la main', 'the hand'], ['le bras', 'the arm'], ['la jambe', 'the leg'], ['le pied', 'the foot'], ['les cheveux', 'the hair'], ['le dos', 'the back'], ['le ventre', 'the tummy']].map(([f, e]) => vocab(f, e));
const EN_FOOD: ListItem[] = [['une pomme', 'an apple'], ['une banane', 'a banana'], ['le pain', 'bread'], ['le fromage', 'cheese'], ['le lait', 'milk'], ['l’eau', 'water'], ['un œuf', 'an egg'], ['le poulet', 'chicken'], ['les frites', 'chips'], ['une fraise', 'a strawberry'], ['une carotte', 'a carrot'], ['une tomate', 'a tomato'], ['le petit déjeuner', 'breakfast'], ['le déjeuner', 'lunch'], ['le dîner', 'dinner'], ['un gâteau', 'a cake']].map(([f, e]) => vocab(f, e));
const EN_DAYS_MONTHS: ListItem[] = [['lundi', 'Monday'], ['mardi', 'Tuesday'], ['mercredi', 'Wednesday'], ['jeudi', 'Thursday'], ['vendredi', 'Friday'], ['samedi', 'Saturday'], ['dimanche', 'Sunday'], ['janvier', 'January'], ['février', 'February'], ['mars', 'March'], ['avril', 'April'], ['mai', 'May'], ['juin', 'June'], ['juillet', 'July'], ['août', 'August'], ['septembre', 'September'], ['octobre', 'October'], ['novembre', 'November'], ['décembre', 'December']].map(([f, e]) => vocab(f, e));
const EN_CLOTHES: ListItem[] = [['un pantalon', 'trousers'], ['une robe', 'a dress'], ['une jupe', 'a skirt'], ['un pull', 'a jumper'], ['un tee-shirt', 'a T-shirt'], ['une chemise', 'a shirt'], ['un manteau', 'a coat'], ['des chaussures', 'shoes'], ['des chaussettes', 'socks'], ['un chapeau', 'a hat'], ['une écharpe', 'a scarf'], ['des gants', 'gloves']].map(([f, e]) => vocab(f, e));
const EN_WEATHER_TIME: ListItem[] = [['Il pleut.', 'It is raining.'], ['Il fait beau.', 'It is sunny.'], ['Il neige.', 'It is snowing.'], ['Il fait froid.', 'It is cold.'], ['Il fait chaud.', 'It is hot.'], ['Il y a du vent.', 'It is windy.'], ['le matin', 'the morning'], ['l’après-midi', 'the afternoon'], ['le soir', 'the evening'], ['la nuit', 'the night'], ['aujourd’hui', 'today'], ['demain', 'tomorrow'], ['hier', 'yesterday'], ['Il est trois heures.', 'It is three o’clock.']].map(([f, e]) => vocab(f, e));
const EN_HOUSE: ListItem[] = [['la maison', 'the house'], ['la cuisine', 'the kitchen'], ['la chambre', 'the bedroom'], ['la salle de bain', 'the bathroom'], ['le salon', 'the living room'], ['le jardin', 'the garden'], ['la porte', 'the door'], ['la fenêtre', 'the window'], ['le lit', 'the bed'], ['l’escalier', 'the stairs'], ['le toit', 'the roof'], ['la clé', 'the key']].map(([f, e]) => vocab(f, e));
const EN_HOBBIES: ListItem[] = [['jouer au football', 'to play football'], ['nager', 'to swim'], ['lire', 'to read'], ['dessiner', 'to draw'], ['chanter', 'to sing'], ['danser', 'to dance'], ['faire du vélo', 'to ride a bike'], ['regarder la télé', 'to watch TV'], ['écouter de la musique', 'to listen to music'], ['jouer aux jeux vidéo', 'to play video games'], ['cuisiner', 'to cook'], ['courir', 'to run'], ['J’aime…', 'I like…'], ['Je n’aime pas…', 'I don’t like…']].map(([f, e]) => vocab(f, e));

const gap = (sentence: string, answer: string, opts: string[], noteEn: string, noteFr: string): ListItem => ({ q: same(sentence), a: same(answer), opts, note: s(noteEn, noteFr) });
const EN_BE_HAVE: ListItem[] = [
  gap('I ___ ten years old.', 'am', ['am', 'is', 'are'], 'I am. Age takes BE in English, not have.', 'I am. L’âge se dit avec BE en anglais, pas avec have.'),
  gap('She ___ my sister.', 'is', ['am', 'is', 'are'], 'he / she / it → is.', 'he / she / it → is.'),
  gap('They ___ at school.', 'are', ['am', 'is', 'are'], 'we / you / they → are.', 'we / you / they → are.'),
  gap('You ___ my friend.', 'are', ['am', 'is', 'are'], 'you → are, singular or plural.', 'you → are, au singulier comme au pluriel.'),
  gap('We ___ happy.', 'are', ['am', 'is', 'are'], 'we → are.', 'we → are.'),
  gap('It ___ a cat.', 'is', ['am', 'is', 'are'], 'it → is.', 'it → is.'),
  gap('I ___ a dog.', 'have', ['have', 'has'], 'I / you / we / they → have.', 'I / you / we / they → have.'),
  gap('He ___ two brothers.', 'has', ['have', 'has'], 'he / she / it → has.', 'he / she / it → has.'),
  gap('They ___ a big house.', 'have', ['have', 'has'], 'they → have.', 'they → have.'),
  gap('My cat ___ green eyes.', 'has', ['have', 'has'], 'my cat = it → has.', 'my cat = it → has.'),
  gap('___ you ready?', 'Are', ['Am', 'Is', 'Are'], 'A question: Are you…?', 'Une question : Are you… ?'),
  gap('___ she French?', 'Is', ['Am', 'Is', 'Are'], 'Is she…?', 'Is she… ?'),
  gap('There ___ a book on the table.', 'is', ['is', 'are'], 'One thing: there is.', 'Une chose : there is.'),
  gap('There ___ three pens.', 'are', ['is', 'are'], 'Several: there are.', 'Plusieurs : there are.'),
  gap('I ___ not tired.', 'am', ['am', 'is', 'are'], 'I am not.', 'I am not.'),
  gap('She ___ got a bike.', 'has', ['have', 'has'], 'she has got.', 'she has got.')
];
const EN_QUESTION_WORDS: ListItem[] = [
  gap('___ old are you?', 'How', ['How', 'What', 'Where'], 'How old = quel âge.', 'How old = quel âge.'),
  gap('___ is your name?', 'What', ['What', 'Who', 'Where'], 'What is your name = comment tu t’appelles.', 'What is your name = comment tu t’appelles.'),
  gap('___ do you live?', 'Where', ['Where', 'When', 'Why'], 'Where = où.', 'Where = où.'),
  gap('___ is your birthday?', 'When', ['When', 'Where', 'Who'], 'When = quand.', 'When = quand.'),
  gap('___ is that girl?', 'Who', ['Who', 'What', 'How'], 'Who = qui.', 'Who = qui.'),
  gap('___ are you crying?', 'Why', ['Why', 'When', 'Who'], 'Why = pourquoi.', 'Why = pourquoi.'),
  gap('___ colour is it?', 'What', ['What', 'Which', 'How'], 'What colour = de quelle couleur.', 'What colour = de quelle couleur.'),
  gap('___ many brothers have you got?', 'How', ['How', 'What', 'Who'], 'How many = combien.', 'How many = combien.'),
  gap('___ time is it?', 'What', ['What', 'When', 'How'], 'What time is it = quelle heure est-il.', 'What time is it = quelle heure est-il.'),
  gap('___ are you from?', 'Where', ['Where', 'What', 'Why'], 'Where are you from = d’où viens-tu.', 'Where are you from = d’où viens-tu.')
];
const EN_IRREGULAR_PAST: ListItem[] = [['go', 'went'], ['see', 'saw'], ['eat', 'ate'], ['have', 'had'], ['be (I)', 'was'], ['be (they)', 'were'], ['do', 'did'], ['make', 'made'], ['come', 'came'], ['take', 'took'], ['give', 'gave'], ['say', 'said'], ['get', 'got'], ['write', 'wrote'], ['read', 'read'], ['run', 'ran'], ['drink', 'drank'], ['sleep', 'slept'], ['buy', 'bought'], ['think', 'thought']].map(([base, past]) => ({ q: same(base), a: same(past) }));
const EN_PLURALS: ListItem[] = [
  { q: same('child'), a: same('children'), opts: ['children', 'childs', 'childes'] },
  { q: same('box'), a: same('boxes'), opts: ['boxes', 'boxs', 'boxies'] },
  { q: same('man'), a: same('men'), opts: ['men', 'mans', 'mens'] },
  { q: same('woman'), a: same('women'), opts: ['women', 'womans', 'womens'] },
  { q: same('mouse'), a: same('mice'), opts: ['mice', 'mouses', 'mices'] },
  { q: same('foot'), a: same('feet'), opts: ['feet', 'foots', 'feets'] },
  { q: same('tooth'), a: same('teeth'), opts: ['teeth', 'tooths', 'teeths'] },
  { q: same('baby'), a: same('babies'), opts: ['babies', 'babys', 'babyes'] },
  { q: same('sheep'), a: same('sheep'), opts: ['sheep', 'sheeps', 'sheepes'] },
  { q: same('person'), a: same('people'), opts: ['people', 'persons', 'peoples'] },
  { q: same('bus'), a: same('buses'), opts: ['buses', 'buss', 'busies'] },
  { q: same('fish'), a: same('fish'), opts: ['fish', 'fishes', 'fishs'] }
];

// History.
const PERIOD_OPTS = ['la Préhistoire', 'l’Antiquité', 'le Moyen Âge', 'les Temps modernes', 'l’époque contemporaine'];
const PERIODS: ListItem[] = [
  { q: s('Which period comes first?', 'Quelle période vient en premier ?'), a: same('la Préhistoire'), opts: PERIOD_OPTS, note: s('Préhistoire → Antiquité → Moyen Âge → Temps modernes → époque contemporaine.', 'Préhistoire → Antiquité → Moyen Âge → Temps modernes → époque contemporaine.') },
  { q: s('Which period comes right after Prehistory?', 'Quelle période vient juste après la Préhistoire ?'), a: same('l’Antiquité'), opts: PERIOD_OPTS, note: s('Antiquity begins with writing, around -3 300.', 'L’Antiquité commence avec l’écriture, vers -3 300.') },
  { q: s('Which period comes right after Antiquity?', 'Quelle période vient juste après l’Antiquité ?'), a: same('le Moyen Âge'), opts: PERIOD_OPTS, note: s('The Middle Ages begin with the fall of the Western Roman Empire, 476.', 'Le Moyen Âge commence avec la chute de l’Empire romain d’Occident, en 476.') },
  { q: s('Which period comes right after the Middle Ages?', 'Quelle période vient juste après le Moyen Âge ?'), a: same('les Temps modernes'), opts: PERIOD_OPTS, note: s('1492, Columbus reaches America: the usual start of the modern era.', '1492, Christophe Colomb arrive en Amérique : le début habituel des Temps modernes.') },
  { q: s('Which period are we in today?', 'Dans quelle période sommes-nous aujourd’hui ?'), a: same('l’époque contemporaine'), opts: PERIOD_OPTS, note: s('Since the French Revolution, 1789.', 'Depuis la Révolution française, 1789.') },
  { q: s('The castles and knights belong to…', 'Les châteaux forts et les chevaliers, c’est…'), a: same('le Moyen Âge'), opts: PERIOD_OPTS },
  { q: s('The Gauls and the Romans belong to…', 'Les Gaulois et les Romains, c’est…'), a: same('l’Antiquité'), opts: PERIOD_OPTS },
  { q: s('Cave paintings belong to…', 'Les peintures des grottes, c’est…'), a: same('la Préhistoire'), opts: PERIOD_OPTS },
  { q: s('Louis XIV and Versailles belong to…', 'Louis XIV et Versailles, c’est…'), a: same('les Temps modernes'), opts: PERIOD_OPTS },
  { q: s('The two world wars belong to…', 'Les deux guerres mondiales, c’est…'), a: same('l’époque contemporaine'), opts: PERIOD_OPTS },
  { q: s('Which period lasted the longest?', 'Quelle période a duré le plus longtemps ?'), a: same('la Préhistoire'), opts: PERIOD_OPTS, note: s('Millions of years, against a few thousand for all the rest together.', 'Des millions d’années, contre quelques milliers pour toutes les autres réunies.') },
  { q: s('Which period began with the invention of writing?', 'Quelle période commence avec l’invention de l’écriture ?'), a: same('l’Antiquité'), opts: PERIOD_OPTS }
];

/** A date, said as "around". The note carries the range and the disagreement, so a child who learned another figure is told why. */
const date = (qEn: string, qFr: string, answer: string, noteEn: string, noteFr: string): ListItem => ({ q: s(qEn, qFr), a: same(answer), note: s(noteEn, noteFr) });
const PREHISTORY_DATES: ListItem[] = [
  date('Around when did the first humans (genus Homo) appear in Africa?', 'Vers quand apparaissent les premiers humains (genre Homo) en Afrique ?', 'vers -2 500 000', 'Between -2.8 and -2.5 million years (Homo habilis). Lucy, an australopithecine, is older: -3.2 million.', 'Entre -2,8 et -2,5 millions d’années (Homo habilis). Lucy, une australopithèque, est plus ancienne : -3,2 millions.'),
  date('Around when did humans master fire?', 'Vers quand les humains maîtrisent-ils le feu ?', 'vers -400 000', 'The oldest certain hearths are about 400 000 years old. Older books say -500 000 or -450 000; the order is what matters.', 'Les plus anciens foyers certains ont 400 000 ans environ. Des manuels disent -500 000 ou -450 000 ; c’est l’ordre qui compte.'),
  date('Around when did Homo sapiens appear in Africa?', 'Vers quand Homo sapiens apparaît-il en Afrique ?', 'vers -300 000', 'Jebel Irhoud (Morocco), about -300 000. Older books say -200 000 or -100 000.', 'Jebel Irhoud (Maroc), vers -300 000. Les manuels plus anciens disent -200 000 ou -100 000.'),
  date('Around when did Homo sapiens reach Europe?', 'Vers quand Homo sapiens arrive-t-il en Europe ?', 'vers -45 000', 'Between -45 000 and -40 000. Older books say -35 000 or -40 000.', 'Entre -45 000 et -40 000. Les manuels plus anciens disent -35 000 ou -40 000.'),
  date('Around when did the Neanderthals disappear?', 'Vers quand les Néandertaliens disparaissent-ils ?', 'vers -40 000', 'Neanderthals lived in Europe from about -400 000 to -40 000, and met Homo sapiens there.', 'Les Néandertaliens vivent en Europe d’environ -400 000 à -40 000, et y rencontrent Homo sapiens.'),
  date('Around when was the Lascaux cave painted?', 'Vers quand la grotte de Lascaux est-elle peinte ?', 'vers -20 000', 'About -21 000 to -18 000. Chauvet is far older: about -36 000.', 'Vers -21 000 à -18 000. Chauvet est bien plus ancienne : vers -36 000.'),
  date('Around when did farming and herding begin, in the Near East?', 'Vers quand commencent l’agriculture et l’élevage, au Proche-Orient ?', 'vers -10 000', 'Books say -10 000; archaeology (Inrap) puts the first farming villages nearer -12 000. France: around -6 000.', 'Les manuels disent -10 000 ; l’archéologie (Inrap) dit plutôt -12 000. En France : vers -6 000.'),
  date('Around when did farming reach what is now France?', 'Vers quand l’agriculture arrive-t-elle en France ?', 'vers -6 000', 'Around -6 000 in the south, -5 000 in the north.', 'Vers -6 000 au sud, -5 000 au nord.'),
  date('Around when was writing invented, in Mesopotamia?', 'Vers quand l’écriture est-elle inventée, en Mésopotamie ?', 'vers -3 300', 'Cuneiform, around -3 300. It marks the end of Prehistory.', 'L’écriture cunéiforme, vers -3 300. Elle marque la fin de la Préhistoire.'),
  date('Around when did the first cities and states appear (Mesopotamia, Egypt)?', 'Vers quand apparaissent les premières cités et les premiers États (Mésopotamie, Égypte) ?', 'vers -3 500', 'Uruk about -3 500; Egypt united about -3 100.', 'Uruk vers -3 500 ; l’Égypte unifiée vers -3 100.'),
  date('Around when did Homo erectus leave Africa?', 'Vers quand Homo erectus sort-il d’Afrique ?', 'vers -1 800 000', 'The first migrations out of Africa, about -1.8 million years (Dmanisi, Georgia).', 'Les premières migrations hors d’Afrique, vers -1,8 million d’années (Dmanisi, Géorgie).'),
  date('Around when was the Chauvet cave painted?', 'Vers quand la grotte Chauvet est-elle peinte ?', 'vers -36 000', 'About -36 000: among the oldest known paintings in Europe.', 'Vers -36 000 : parmi les plus anciennes peintures connues en Europe.')
];

const fact = (qEn: string, qFr: string, aEn: string, aFr: string, noteEn?: string, noteFr?: string): ListItem => ({ q: s(qEn, qFr), a: s(aEn, aFr), ...(noteEn && noteFr ? { note: s(noteEn, noteFr) } : {}) });
const PREHISTORY_FACTS: ListItem[] = [
  fact('People who move with the seasons, following their food, are…', 'Les humains qui se déplacent au fil des saisons, en suivant leur nourriture, sont…', 'nomads', 'nomades'),
  fact('People who settle in one place, in villages, are…', 'Les humains qui s’installent en un lieu, dans des villages, sont…', 'sedentary', 'sédentaires'),
  fact('The Palaeolithic is the age of…', 'Le Paléolithique, c’est l’âge de…', 'knapped stone', 'la pierre taillée'),
  fact('The Neolithic is the age of…', 'Le Néolithique, c’est l’âge de…', 'polished stone', 'la pierre polie'),
  fact('Farming and herding begin in the…', 'L’agriculture et l’élevage commencent au…', 'Neolithic', 'Néolithique'),
  fact('Homo sapiens means…', 'Homo sapiens signifie…', '“wise man”', '« homme sage »'),
  fact('Paintings on cave walls are called…', 'Les peintures sur les parois des grottes s’appellent…', 'cave (parietal) art', 'l’art pariétal'),
  fact('Mesopotamia means…', 'Mésopotamie signifie…', '“between the rivers”', '« entre les fleuves »', 'The Tigris and the Euphrates.', 'Le Tigre et l’Euphrate.'),
  fact('The writing of Mesopotamia, made of wedge marks in clay, is…', 'L’écriture de Mésopotamie, faite de signes en forme de clous dans l’argile, c’est…', 'cuneiform', 'le cunéiforme'),
  fact('The writing of ancient Egypt is…', 'L’écriture de l’Égypte ancienne, ce sont…', 'hieroglyphs', 'les hiéroglyphes'),
  fact('Lucy, found in Ethiopia in 1974, is a…', 'Lucy, trouvée en Éthiopie en 1974, est une…', 'australopithecine', 'australopithèque', 'About 3.2 million years old.', 'Vieille d’environ 3,2 millions d’années.'),
  fact('The two-faced stone tool of the Palaeolithic is the…', 'L’outil de pierre taillé sur deux faces du Paléolithique, c’est le…', 'hand axe (biface)', 'biface'),
  fact('What ends Prehistory and begins Antiquity?', 'Qu’est-ce qui termine la Préhistoire et commence l’Antiquité ?', 'the invention of writing', 'l’invention de l’écriture'),
  fact('Prehistory ends at different times in different places because…', 'La Préhistoire ne finit pas partout en même temps parce que…', 'writing arrives at different times', 'l’écriture arrive à des moments différents', 'In Gaul it ends with the Roman conquest, around -50.', 'En Gaule, elle finit avec la conquête romaine, vers -50.')
];

const ANTIQUITY_DATES: ListItem[] = [
  date('When was Rome founded, according to legend?', 'En quelle année Rome est-elle fondée, selon la légende ?', '-753', 'The legend of Romulus and Remus. Archaeology finds villages on the hills from about -1 000.', 'La légende de Romulus et Rémus. L’archéologie trouve des villages sur les collines dès -1 000 environ.'),
  date('When did the Roman Republic begin?', 'En quelle année commence la République romaine ?', '-509', 'The last king is driven out.', 'Le dernier roi est chassé.'),
  date('When were the first Olympic Games held?', 'En quelle année ont lieu les premiers Jeux olympiques ?', '-776', 'At Olympia, every four years, in honour of Zeus.', 'À Olympie, tous les quatre ans, en l’honneur de Zeus.'),
  date('In which century did Homer compose the Iliad and the Odyssey?', 'À quel siècle Homère compose-t-il l’Iliade et l’Odyssée ?', 'VIIIe siècle av. J.-C.', 'Around -750. Nobody knows for sure who Homer was.', 'Vers -750. Personne ne sait vraiment qui était Homère.'),
  date('In which century was Athens at its height, under Pericles?', 'À quel siècle Athènes est-elle à son apogée, sous Périclès ?', 'Ve siècle av. J.-C.', 'Democracy, the Parthenon, about -450.', 'La démocratie, le Parthénon, vers -450.'),
  date('When did Caesar defeat Vercingetorix at Alesia?', 'En quelle année César bat-il Vercingétorix à Alésia ?', '-52', 'The end of the Gallic Wars.', 'La fin de la guerre des Gaules.'),
  date('When did Augustus become the first Roman emperor?', 'En quelle année Auguste devient-il le premier empereur romain ?', '-27', 'Octavian takes the name Augustus.', 'Octave prend le nom d’Auguste.'),
  date('When did Emperor Constantine allow Christianity?', 'En quelle année l’empereur Constantin autorise-t-il le christianisme ?', '313', 'The Edict of Milan.', 'L’édit de Milan.'),
  date('When did the Western Roman Empire fall?', 'En quelle année l’Empire romain d’Occident tombe-t-il ?', '476', 'The usual end of Antiquity and start of the Middle Ages.', 'La fin habituelle de l’Antiquité et le début du Moyen Âge.'),
  date('When was the Temple of Jerusalem destroyed by the Romans?', 'En quelle année le Temple de Jérusalem est-il détruit par les Romains ?', '70', 'The Jews are dispersed around the Mediterranean.', 'Les Juifs sont dispersés autour de la Méditerranée.'),
  date('When did Alexander the Great die?', 'En quelle année meurt Alexandre le Grand ?', '-323', 'After conquering an empire from Greece to India.', 'Après avoir conquis un empire de la Grèce à l’Inde.'),
  date('When did Caesar die?', 'En quelle année meurt Jules César ?', '-44', 'Assassinated in Rome, on the Ides of March.', 'Assassiné à Rome, aux ides de mars.')
];

const ANTIQUITY_FACTS: ListItem[] = [
  fact('Believing in many gods is…', 'Croire en plusieurs dieux, c’est…', 'polytheism', 'le polythéisme'),
  fact('Believing in one god is…', 'Croire en un seul dieu, c’est…', 'monotheism', 'le monothéisme', 'The Hebrews were the first monotheists.', 'Les Hébreux sont les premiers monothéistes.'),
  fact('The king of the Greek gods is…', 'Le roi des dieux grecs, c’est…', 'Zeus', 'Zeus'),
  fact('The two great poems of Homer are…', 'Les deux grands poèmes d’Homère sont…', 'the Iliad and the Odyssey', 'l’Iliade et l’Odyssée'),
  fact('A Greek city with its countryside and its own laws is a…', 'Une ville grecque avec sa campagne et ses propres lois, c’est une…', 'city-state (polis)', 'cité (polis)'),
  fact('The twin brothers of Rome’s founding legend are…', 'Les frères jumeaux de la légende de la fondation de Rome sont…', 'Romulus and Remus', 'Romulus et Rémus', 'Fed by a she-wolf.', 'Nourris par une louve.'),
  fact('The public square at the heart of a Roman city is the…', 'La place publique au cœur d’une ville romaine, c’est le…', 'forum', 'forum'),
  fact('The Gaulish chief defeated at Alesia is…', 'Le chef gaulois vaincu à Alésia, c’est…', 'Vercingetorix', 'Vercingétorix'),
  fact('The Gauls adopting Roman ways (language, towns, baths) is called…', 'L’adoption par les Gaulois du mode de vie romain (langue, villes, thermes), c’est la…', 'Romanisation', 'romanisation'),
  fact('The holy book of the Hebrews is the…', 'Le livre sacré des Hébreux, c’est la…', 'Bible (Hebrew Bible)', 'Bible (Bible hébraïque)'),
  fact('The religion founded on the teaching of Jesus is…', 'La religion fondée sur l’enseignement de Jésus, c’est…', 'Christianity', 'le christianisme'),
  fact('Athens’ system where citizens vote the laws is…', 'Le système d’Athènes où les citoyens votent les lois, c’est la…', 'democracy', 'démocratie', 'Only free men born in Athens were citizens.', 'Seuls les hommes libres nés à Athènes étaient citoyens.'),
  fact('The Roman emperor who built the Pax Romana is…', 'L’empereur romain de la Pax Romana, c’est…', 'Augustus', 'Auguste'),
  fact('The language of the Romans is…', 'La langue des Romains, c’est le…', 'Latin', 'latin', 'French comes from it.', 'Le français en vient.')
];

const FRANCE_LANDMARKS: ListItem[] = [
  date('In which year did Caesar defeat the Gauls at Alesia?', 'En quelle année César bat-il les Gaulois à Alésia ?', '-52', 'Vercingetorix surrenders.', 'Vercingétorix se rend.'),
  date('In which year was Clovis baptised?', 'En quelle année Clovis est-il baptisé ?', '496', 'Around 496–508: the first Christian king of the Franks.', 'Vers 496–508 : le premier roi chrétien des Francs.'),
  date('In which year was Charlemagne crowned emperor?', 'En quelle année Charlemagne est-il couronné empereur ?', '800', 'On Christmas Day, in Rome.', 'Le jour de Noël, à Rome.'),
  date('In which year was the battle of Marignan?', 'En quelle année a lieu la bataille de Marignan ?', '1515', 'François Ier.', 'François Ier.'),
  date('In which year did the French Revolution begin?', 'En quelle année commence la Révolution française ?', '1789', 'The storming of the Bastille, 14 July.', 'La prise de la Bastille, le 14 juillet.'),
  date('In which year did the First World War begin?', 'En quelle année commence la Première Guerre mondiale ?', '1914', '1914–1918.', '1914–1918.'),
  date('In which year did the Second World War end?', 'En quelle année finit la Seconde Guerre mondiale ?', '1945', '1939–1945.', '1939–1945.'),
  date('In which year did French women vote for the first time?', 'En quelle année les Françaises votent-elles pour la première fois ?', '1945', 'The right was granted in 1944, first used in 1945.', 'Le droit est accordé en 1944, utilisé pour la première fois en 1945.'),
  date('In which year was Louis XIV born?', 'En quelle année naît Louis XIV ?', '1638', 'King from 1643 to 1715: 72 years.', 'Roi de 1643 à 1715 : 72 ans.'),
  date('In which year did the Second World War begin?', 'En quelle année commence la Seconde Guerre mondiale ?', '1939', '1939–1945.', '1939–1945.')
];

// ── The skills ──────────────────────────────────────────────────────────────

type Draft = Omit<Skill, 'strand' | 'answer' | 'fluentMs' | 'diff' | 'generator' | 'params'> & Partial<Pick<Skill, 'strand' | 'answer' | 'fluentMs' | 'diff'>>;

/** A list skill: options by default, a slow fluent clock (reading a sentence takes longer than reading a sum). */
function list(d: Draft, params: ListParams): Skill {
  return { strand: 'facts', answer: 'options', fluentMs: 8000, diff: 0.4, ...d, generator: 'list', params: params as unknown as Record<string, unknown> };
}

const ASK_MODE = s('Which mode is this verb in?', 'À quel mode est ce verbe ?');
const ASK_TENSE = s('Which tense is this?', 'Quel est ce temps ?');
const ASK_VOICE = s('Active, passive, or pronominal voice?', 'Voix active, passive, ou pronominale ?');
const ASK_SUBJ = s('Subjonctif or indicatif?', 'Subjonctif ou indicatif ?');
const ASK_SIMPLE = s('Simple or compound tense?', 'Temps simple ou temps composé ?');
const ASK_GROUP = s('Which group?', 'Quel groupe ?');
const ASK_AUX = s('Which auxiliary in the passé composé?', 'Quel auxiliaire au passé composé ?');
const ASK_CLASS = s('Which word class?', 'Quelle classe de mots ?');
const ASK_GAP = s('Fill the gap:', 'Complète :');
const ASK_EN = s('In English:', 'En anglais :');
const ASK_FR = s('In French:', 'En français :');
const ASK_PAST = s('The past simple of…', 'Le prétérit de…');
const ASK_PLURAL_EN = s('The plural of…', 'Le pluriel de…');

export const FRENCH_SKILLS: ReadonlyArray<Skill> = [
  // Conjugation, generated. The level says who sees it first; a 6e child sees all of them.
  { id: 'fr-conj-present', level: 'CE2', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'jouer', 'regarder', 'manger'], tenses: ['present'] }, answer: 'typed', fluentMs: 8000, diff: 0.2, name: s('Présent: être, avoir, aller, faire and -er verbs', 'Le présent : être, avoir, aller, faire et les verbes en -er'), strategy: s('Find the stem, then the ending for the person.', 'Trouve le radical, puis la terminaison de la personne.'), teach: 'conjugation' },
  { id: 'fr-conj-present-3', level: 'CM1', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['finir', 'grandir', 'dire', 'venir', 'prendre', 'pouvoir', 'vouloir', 'voir', 'devoir', 'savoir', 'mettre', 'partir'], tenses: ['present'] }, answer: 'typed', fluentMs: 8000, diff: 0.4, name: s('Présent: finir, dire, venir, prendre, pouvoir, voir…', 'Le présent : finir, dire, venir, prendre, pouvoir, voir…'), strategy: s('Third-group verbs change their stem: je viens, nous venons, ils viennent.', 'Les verbes du 3e groupe changent de radical : je viens, nous venons, ils viennent.'), teach: 'conjugation' },
  { id: 'fr-conj-imparfait', level: 'CM1', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'dire', 'venir', 'prendre', 'voir', 'manger'], tenses: ['imparfait'] }, answer: 'typed', fluentMs: 8000, diff: 0.4, name: s('Imparfait', 'L’imparfait'), strategy: s('Take « nous » in the présent, drop -ons, add -ais, -ais, -ait, -ions, -iez, -aient.', 'Prends « nous » au présent, enlève -ons, ajoute -ais, -ais, -ait, -ions, -iez, -aient.'), teach: 'conjugation' },
  { id: 'fr-conj-futur', level: 'CM1', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'dire', 'venir', 'prendre', 'pouvoir', 'voir', 'jouer'], tenses: ['futur'] }, answer: 'typed', fluentMs: 8000, diff: 0.45, name: s('Futur simple', 'Le futur simple'), strategy: s('An r, then -ai, -as, -a, -ons, -ez, -ont: je chanterai, je serai, j’irai.', 'Un r, puis -ai, -as, -a, -ons, -ez, -ont : je chanterai, je serai, j’irai.'), teach: 'conjugation' },
  { id: 'fr-conj-passe-compose', level: 'CM2', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'dire', 'venir', 'prendre', 'voir', 'partir', 'mettre'], tenses: ['passeCompose'] }, answer: 'typed', fluentMs: 9000, diff: 0.5, name: s('Passé composé', 'Le passé composé'), strategy: s('Auxiliary in the présent + participe passé: j’ai fini, je suis venu.', 'Auxiliaire au présent + participe passé : j’ai fini, je suis venu.'), teach: 'conjugation' },
  { id: 'fr-conj-passe-simple', level: 'CM2', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'dire', 'venir', 'prendre', 'voir'], tenses: ['passeSimple'], persons: [2, 5] }, answer: 'typed', fluentMs: 9000, diff: 0.6, name: s('Passé simple (il, ils)', 'Le passé simple (il, ils)'), strategy: s('The tense of stories: il chanta, ils chantèrent; il fut, ils furent.', 'Le temps des récits : il chanta, ils chantèrent ; il fut, ils furent.'), teach: 'conjugation' },
  { id: 'fr-conj-plus-que-parfait', level: '6e', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'venir', 'prendre', 'voir', 'partir'], tenses: ['plusQueParfait'] }, answer: 'typed', fluentMs: 9000, diff: 0.55, name: s('Plus-que-parfait', 'Le plus-que-parfait'), strategy: s('Auxiliary in the imparfait + participe passé: j’avais fini, j’étais venu.', 'Auxiliaire à l’imparfait + participe passé : j’avais fini, j’étais venu.'), teach: 'conjugation' },
  { id: 'fr-conj-conditionnel', level: '6e', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'venir', 'prendre', 'pouvoir', 'vouloir', 'voir'], tenses: ['conditionnel'] }, answer: 'typed', fluentMs: 9000, diff: 0.6, name: s('Conditionnel présent', 'Le conditionnel présent'), strategy: s('The futur’s stem with the imparfait’s endings: je chanterais, je serais, j’irais.', 'Le radical du futur avec les terminaisons de l’imparfait : je chanterais, je serais, j’irais.'), teach: 'conjugation' },
  { id: 'fr-conj-imperatif', level: '6e', subject: 'french', topic: 'conjugation', strand: 'conjugation', generator: 'conjugate', params: { verbs: ['être', 'avoir', 'aller', 'faire', 'chanter', 'finir', 'dire', 'venir', 'prendre', 'voir'], tenses: ['imperatif'] }, answer: 'typed', fluentMs: 8000, diff: 0.5, name: s('Impératif présent', 'L’impératif présent'), strategy: s('Three persons, no pronoun: chante, chantons, chantez. No s on « chante », « va ».', 'Trois personnes, sans pronom : chante, chantons, chantez. Pas de s à « chante », « va ».'), teach: 'verb-study' },
  // The verb, studied (6e). 🔴 The 2025 cycle 3 programme stops at the conditionnel présent and the impératif; the subjonctif,
  // the passive and the pronominal voice are cycle 4 (5e). A 6e test on « l’étude du verbe » asked them (Richard, 2026-10-04), and
  // his ruling the same day: "put in the choices but maybe a simple watered down 'just identify them' version for 5e". So they are
  // `beyond: '5e'` — identify-only, offered in the chooser marked 5e, never in "everything" — and the typed subjonctif is gone.
  list({ id: 'fr-verb-mode', level: '6e', subject: 'french', topic: 'verb-study', name: s('Which mode?', 'Quel mode ?'), strategy: s('Indicatif states, impératif orders, infinitif names, participe describes.', 'L’indicatif affirme, l’impératif ordonne, l’infinitif nomme, le participe décrit.'), teach: 'verb-study', diff: 0.6 }, { items: VERB_MODES, ask: ASK_MODE }),
  list({ id: 'fr-verb-tense', level: '6e', subject: 'french', topic: 'verb-study', name: s('Which tense?', 'Quel temps ?'), strategy: s('Look at the ending, and whether there is an auxiliary.', 'Regarde la terminaison, et s’il y a un auxiliaire.'), teach: 'verb-study', diff: 0.6 }, { items: VERB_TENSES, ask: ASK_TENSE }),
  list({ id: 'fr-verb-subj', level: '6e', beyond: '5e', subject: 'french', topic: 'verb-study', name: s('Spot the subjonctif', 'Repérer le subjonctif'), strategy: s('« que » before the verb, and a wish, a doubt or « il faut »: subjonctif. A plain fact: indicatif.', '« que » devant le verbe, et un souhait, un doute ou « il faut » : subjonctif. Un fait : indicatif.'), teach: 'verb-study', diff: 0.45 }, { items: VERB_SUBJ_SPOT, ask: ASK_SUBJ }),
  list({ id: 'fr-verb-voice', level: '6e', beyond: '5e', subject: 'french', topic: 'verb-study', name: s('Active, passive, pronominal', 'Voix active, passive, pronominale'), strategy: s('Passive: être + participe passé, the subject undergoes. Pronominal: a pronoun looks back at the subject.', 'Passive : être + participe passé, le sujet subit. Pronominale : un pronom renvoie au sujet.'), teach: 'verb-study', diff: 0.65 }, { items: VERB_VOICES, ask: ASK_VOICE }),
  list({ id: 'fr-verb-simple-compound', level: '6e', subject: 'french', topic: 'verb-study', name: s('Simple or compound tense', 'Temps simple ou composé'), strategy: s('One word: simple. Auxiliary + participe: compound.', 'Un mot : simple. Auxiliaire + participe : composé.'), teach: 'verb-study', diff: 0.3 }, { items: VERB_SIMPLE_COMPOUND, ask: ASK_SIMPLE }),
  list({ id: 'fr-verb-group', level: 'CM1', subject: 'french', topic: 'verb-study', name: s('The three groups', 'Les trois groupes'), strategy: s('-er is first (except aller); -ir with -issons is second; everything else is third.', '-er, c’est le 1er (sauf aller) ; -ir avec -issons, le 2e ; tout le reste, le 3e.'), teach: 'conjugation', diff: 0.35 }, { items: VERB_GROUPS, ask: ASK_GROUP }),
  list({ id: 'fr-verb-aux', level: 'CM2', subject: 'french', topic: 'verb-study', name: s('Être or avoir in the passé composé', 'Être ou avoir au passé composé'), strategy: s('Movement and change take être; almost everything else takes avoir.', 'Les verbes de mouvement et de changement prennent être ; presque tout le reste prend avoir.'), teach: 'conjugation', diff: 0.4 }, { items: VERB_AUX, ask: ASK_AUX }),
  // Word classes.
  list({ id: 'fr-word-class-ce2', level: 'CE2', subject: 'french', topic: 'word-classes', name: s('Noun, verb, determiner, adjective', 'Nom, verbe, déterminant, adjectif'), strategy: s('A verb changes with the person; a determiner stands before a noun; an adjective describes it.', 'Un verbe change avec la personne ; un déterminant précède le nom ; un adjectif le décrit.'), teach: 'word-classes', diff: 0.3 }, { items: WORD_CLASSES_CE2, ask: ASK_CLASS }),
  list({ id: 'fr-word-class-6e', level: '6e', subject: 'french', topic: 'word-classes', name: s('Pronoun, adverb, preposition, conjunction', 'Pronom, adverbe, préposition, conjonction'), strategy: s('A pronoun replaces a noun; an adverb never changes; a preposition introduces (à, sur); a conjunction joins (et, mais).', 'Un pronom remplace un nom ; un adverbe ne change jamais ; une préposition introduit (à, sur) ; une conjonction relie (et, mais).'), teach: 'word-classes', diff: 0.55 }, { items: WORD_CLASSES_6E, ask: ASK_CLASS }),
  // Homophones.
  list({ id: 'fr-homophones-ce2', level: 'CE2', subject: 'french', topic: 'homophones', name: s('a / à, et / est, on / ont, son / sont', 'a / à, et / est, on / ont, son / sont'), strategy: s('Swap in another form of the verb: if « avait », « était », « avaient » fits, it is the verb.', 'Remplace par une autre forme du verbe : si « avait », « était », « avaient » marche, c’est le verbe.'), teach: 'homophones', diff: 0.3 }, { items: HOMOPHONES_CE2, ask: ASK_GAP }),
  list({ id: 'fr-homophones-6e', level: '6e', subject: 'french', topic: 'homophones', name: s('ce / se, ces / ses, ou / où, la / là / l’a, leur / leurs…', 'ce / se, ces / ses, ou / où, la / là / l’a, leur / leurs…'), strategy: s('Swap: « ce » → « ces »; « se » → « nous nous »; « où » → a place; « l’a » → « l’avait ».', 'Remplace : « ce » → « ces » ; « se » → « nous nous » ; « où » → un lieu ; « l’a » → « l’avait ».'), teach: 'homophones', diff: 0.55 }, { items: HOMOPHONES_6E, ask: ASK_GAP }),
  // Agreement.
  list({ id: 'fr-plural', level: 'CE2', subject: 'french', topic: 'agreement', name: s('Plurals of nouns', 'Le pluriel des noms'), strategy: s('-s usually; -x for -eau, -eu, -au and seven -ou words; -al → -aux.', '-s en général ; -x pour -eau, -eu, -au et sept mots en -ou ; -al → -aux.'), teach: 'agreement', diff: 0.35 }, { items: PLURALS }),
  list({ id: 'fr-feminine', level: 'CM1', subject: 'french', topic: 'agreement', name: s('Feminines', 'Le féminin'), strategy: s('-e usually; -eux → -euse, -er → -ère, -f → -ve, -teur → -trice.', '-e en général ; -eux → -euse, -er → -ère, -f → -ve, -teur → -trice.'), teach: 'agreement', diff: 0.4 }, { items: FEMININES })
];

export const ENGLISH_SKILLS: ReadonlyArray<Skill> = [
  list({ id: 'en-colours', level: 'CE2', subject: 'english', topic: 'en-vocab', name: s('Colours', 'Les couleurs'), strategy: s('Say the colour of something you can see.', 'Dis la couleur d’un objet que tu vois.'), teach: 'english-words', answer: 'either', diff: 0.1 }, { items: EN_COLOURS, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-animals', level: 'CE2', subject: 'english', topic: 'en-vocab', name: s('Animals', 'Les animaux'), strategy: s('« a » before a consonant sound, « an » before a vowel sound: a cat, an elephant.', '« a » devant une consonne, « an » devant une voyelle : a cat, an elephant.'), teach: 'english-words', answer: 'either', diff: 0.15 }, { items: EN_ANIMALS, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-classroom', level: 'CE2', subject: 'english', topic: 'en-vocab', name: s('The classroom', 'La classe'), strategy: s('Name what is on your desk.', 'Nomme ce qu’il y a sur ton bureau.'), teach: 'english-words', answer: 'either', diff: 0.2 }, { items: EN_CLASSROOM, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-family', level: 'CE2', subject: 'english', topic: 'en-vocab', name: s('The family', 'La famille'), strategy: s('In pairs: mother / father, sister / brother, grandmother / grandfather.', 'Par paires : mother / father, sister / brother, grandmother / grandfather.'), teach: 'english-words', answer: 'either', diff: 0.2 }, { items: EN_FAMILY, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-body', level: 'CE2', subject: 'english', topic: 'en-vocab', name: s('The body', 'Le corps'), strategy: s('Sing it: head, shoulders, knees and toes…', 'Chante-la : head, shoulders, knees and toes…'), teach: 'english-words', answer: 'either', diff: 0.2 }, { items: EN_BODY, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-food', level: 'CM1', subject: 'english', topic: 'en-vocab', name: s('Food', 'La nourriture'), strategy: s('breakfast, lunch, dinner: the three meals.', 'breakfast, lunch, dinner : les trois repas.'), teach: 'english-words', answer: 'either', diff: 0.25 }, { items: EN_FOOD, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-days-months', level: 'CM1', subject: 'english', topic: 'en-vocab', name: s('Days and months', 'Les jours et les mois'), strategy: s('Days and months take a capital letter in English.', 'Les jours et les mois prennent une majuscule en anglais.'), teach: 'english-words', answer: 'either', diff: 0.3 }, { items: EN_DAYS_MONTHS, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-clothes', level: 'CM2', subject: 'english', topic: 'en-vocab', name: s('Clothes', 'Les vêtements'), strategy: s('trousers, shoes, socks, gloves are plural in English.', 'trousers, shoes, socks, gloves sont au pluriel en anglais.'), teach: 'english-words', answer: 'either', diff: 0.3 }, { items: EN_CLOTHES, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-weather-time', level: '6e', subject: 'english', topic: 'en-vocab', name: s('Weather and time of day', 'La météo et les moments de la journée'), strategy: s('Weather takes « it »: it is raining, it is cold.', 'La météo se dit avec « it » : it is raining, it is cold.'), teach: 'english-words', answer: 'either', diff: 0.35 }, { items: EN_WEATHER_TIME, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-house', level: '6e', subject: 'english', topic: 'en-vocab', name: s('The house', 'La maison'), strategy: s('Rooms end in « room »: bedroom, bathroom, living room.', 'Les pièces finissent par « room » : bedroom, bathroom, living room.'), teach: 'english-words', answer: 'either', diff: 0.35 }, { items: EN_HOUSE, ask: ASK_EN, askBack: ASK_FR, both: true }),
  list({ id: 'en-hobbies', level: '6e', subject: 'english', topic: 'en-vocab', name: s('Hobbies', 'Les loisirs'), strategy: s('I like + verb-ing: I like swimming.', 'I like + verbe en -ing : I like swimming.'), teach: 'english-words', answer: 'either', diff: 0.4 }, { items: EN_HOBBIES, ask: ASK_EN, askBack: ASK_FR, both: true }),
  { id: 'en-numbers-20', level: 'CE2', subject: 'english', topic: 'en-numbers', strand: 'vocab', generator: 'numberWordEn', params: { max: 20 }, answer: 'either', fluentMs: 8000, diff: 0.2, name: s('Numbers to 20, in English', 'Les nombres jusqu’à 20, en anglais'), strategy: s('eleven, twelve, then -teen: thirteen, fourteen…', 'eleven, twelve, puis -teen : thirteen, fourteen…'), teach: 'english-words' },
  { id: 'en-numbers-100', level: '6e', subject: 'english', topic: 'en-numbers', strand: 'vocab', generator: 'numberWordEn', params: { max: 100 }, answer: 'either', fluentMs: 9000, diff: 0.4, name: s('Numbers to 100, in English', 'Les nombres jusqu’à 100, en anglais'), strategy: s('Tens end in -ty (twenty, thirty), then a hyphen and the unit: forty-seven.', 'Les dizaines finissent en -ty (twenty, thirty), puis un trait d’union et l’unité : forty-seven.'), teach: 'english-words' },
  list({ id: 'en-be-have', level: '6e', subject: 'english', topic: 'en-grammar', name: s('be and have', 'be et have'), strategy: s('I am, you are, he/she/it is, we/you/they are. he/she/it has, the rest have.', 'I am, you are, he/she/it is, we/you/they are. he/she/it has, les autres have.'), teach: 'english-be', diff: 0.4 }, { items: EN_BE_HAVE, ask: ASK_GAP }),
  list({ id: 'en-question-words', level: '6e', subject: 'english', topic: 'en-grammar', name: s('Question words', 'Les mots interrogatifs'), strategy: s('What, where, when, who, why, how.', 'What (quoi), where (où), when (quand), who (qui), why (pourquoi), how (comment).'), teach: 'english-be', diff: 0.4 }, { items: EN_QUESTION_WORDS, ask: ASK_GAP }),
  list({ id: 'en-irregular-past', level: '6e', subject: 'english', topic: 'en-grammar', name: s('Irregular past tense', 'Le prétérit des verbes irréguliers'), strategy: s('Regular verbs add -ed; these do not. Learn them as pairs: go / went.', 'Les verbes réguliers prennent -ed ; pas ceux-là. Apprends-les par paires : go / went.'), teach: 'english-be', answer: 'either', diff: 0.55 }, { items: EN_IRREGULAR_PAST, ask: ASK_PAST }),
  list({ id: 'en-plurals', level: '6e', subject: 'english', topic: 'en-grammar', name: s('Irregular plurals', 'Les pluriels irréguliers'), strategy: s('-s usually; -es after s, x, ch, sh; -y → -ies; and a few to learn: child / children.', '-s en général ; -es après s, x, ch, sh ; -y → -ies ; et quelques-uns à apprendre : child / children.'), teach: 'english-be', diff: 0.45 }, { items: EN_PLURALS, ask: ASK_PLURAL_EN })
];

export const HISTORY_SKILLS: ReadonlyArray<Skill> = [
  list({ id: 'hi-periods', level: 'CE2', subject: 'history', topic: 'time', name: s('The five periods', 'Les cinq périodes'), strategy: s('Prehistory, Antiquity, Middle Ages, modern era, contemporary era: in that order.', 'Préhistoire, Antiquité, Moyen Âge, Temps modernes, époque contemporaine : dans cet ordre.'), teach: 'periods', diff: 0.2 }, { items: PERIODS }),
  { id: 'hi-century', level: 'CM1', subject: 'history', topic: 'time', strand: 'facts', generator: 'century', params: { min: 1001, max: 2024 }, answer: 'options', fluentMs: 8000, diff: 0.4, name: s('Which century?', 'Quel siècle ?'), strategy: s('Hide the last two digits and add 1: 1515 → 15 + 1 → XVIe. A year ending in 00 stays: 1500 → XVe.', 'Cache les deux derniers chiffres et ajoute 1 : 1515 → 15 + 1 → XVIe. Une année en 00 ne bouge pas : 1500 → XVe.'), teach: 'periods' },
  list({ id: 'hi-france-landmarks', level: 'CE2', subject: 'history', topic: 'france-landmarks', name: s('Landmark dates of France', 'Les grandes dates de la France'), strategy: s('Place each date on the frieze first, then learn the year.', 'Place d’abord chaque date sur la frise, puis apprends l’année.'), teach: 'periods', diff: 0.45 }, { items: FRANCE_LANDMARKS }),
  list({ id: 'hi-prehistory-dates', level: '6e', subject: 'history', topic: 'prehistory', name: s('Prehistory: around when?', 'La Préhistoire : vers quand ?'), strategy: s('Think in orders of magnitude: millions for the first humans, hundreds of thousands for fire, tens of thousands for the caves, thousands for farming.', 'Pense par ordre de grandeur : des millions pour les premiers humains, des centaines de milliers pour le feu, des dizaines de milliers pour les grottes, des milliers pour l’agriculture.'), teach: 'prehistory', diff: 0.6 }, { items: PREHISTORY_DATES }),
  list({ id: 'hi-prehistory-facts', level: '6e', subject: 'history', topic: 'prehistory', name: s('Prehistory: the words', 'La Préhistoire : les mots'), strategy: s('Palaeolithic = knapped stone, hunters who move. Neolithic = polished stone, farmers who settle.', 'Paléolithique = pierre taillée, chasseurs nomades. Néolithique = pierre polie, agriculteurs sédentaires.'), teach: 'prehistory', diff: 0.45 }, { items: PREHISTORY_FACTS }),
  list({ id: 'hi-antiquity-dates', level: '6e', subject: 'history', topic: 'antiquity', name: s('Antiquity: which year?', 'L’Antiquité : quelle année ?'), strategy: s('Before Christ the numbers go down: -776, -753, -509, -52, -27. Then up: 70, 313, 476.', 'Avant Jésus-Christ, les nombres descendent : -776, -753, -509, -52, -27. Ensuite ils montent : 70, 313, 476.'), teach: 'antiquity', diff: 0.6 }, { items: ANTIQUITY_DATES }),
  list({ id: 'hi-antiquity-facts', level: '6e', subject: 'history', topic: 'antiquity', name: s('Antiquity: the words', 'L’Antiquité : les mots'), strategy: s('Greeks: the polis, Zeus, Homer. Romans: the forum, Romulus, Augustus. Hebrews: one god, the Bible.', 'Les Grecs : la cité, Zeus, Homère. Les Romains : le forum, Romulus, Auguste. Les Hébreux : un seul dieu, la Bible.'), teach: 'antiquity', diff: 0.5 }, { items: ANTIQUITY_FACTS })
];

export const SUBJECT_SKILLS: ReadonlyArray<Skill> = [...FRENCH_SKILLS, ...ENGLISH_SKILLS, ...HISTORY_SKILLS];

// ── Teach cards for the new subjects ────────────────────────────────────────

export const SUBJECT_TEACH_CARDS: ReadonlyArray<TeachCard> = [
  {
    id: 'conjugation',
    title: s('Stem and ending', 'Radical et terminaison'),
    steps: [
      s('A conjugated verb is two parts: the stem, which carries the meaning (chant-, fin-), and the ending, which says who and when (-ons = nous, now). Find the stem from « nous » in the présent: nous chantons → chant-, nous finissons → finiss-. Then add the ending the tense and the person call for.', 'Un verbe conjugué, c’est deux parties : le radical, qui porte le sens (chant-, fin-), et la terminaison, qui dit qui et quand (-ons = nous, maintenant). Trouve le radical avec « nous » au présent : nous chantons → chant-, nous finissons → finiss-. Puis ajoute la terminaison du temps et de la personne.'),
      s('Imparfait: -ais, -ais, -ait, -ions, -iez, -aient on that stem. Futur: the infinitive (with its r) + -ai, -as, -a, -ons, -ez, -ont. Compound tenses: an auxiliary + the participe passé.', 'Imparfait : -ais, -ais, -ait, -ions, -iez, -aient sur ce radical. Futur : l’infinitif (avec son r) + -ai, -as, -a, -ons, -ez, -ont. Temps composés : un auxiliaire + le participe passé.'),
      s('Stem, then ending. Who? When?', 'Radical, puis terminaison. Qui ? Quand ?')
    ],
    example: s('nous finissons → finiss-\nje finissais · tu finissais · il finissait\nnous finissions · vous finissiez · ils finissaient', 'nous finissons → finiss-\nje finissais · tu finissais · il finissait\nnous finissions · vous finissiez · ils finissaient')
  },
  {
    id: 'verb-study',
    title: s('The verb: modes, tenses, voices', 'L’étude du verbe : modes, temps, voix'),
    steps: [
      s('The MODE is the way the verb presents the action: indicatif states a fact (il vient), impératif gives an order (viens !), subjonctif says a wish or a doubt after « que » (qu’il vienne), infinitif is the verb’s name (venir), participe is its adjective-like form (venant, venu). In the official terminology the conditionnel is a TENSE of the indicatif (il viendrait).', 'Le MODE, c’est la manière dont le verbe présente l’action : l’indicatif affirme un fait (il vient), l’impératif ordonne (viens !), le subjonctif exprime un souhait ou un doute après « que » (qu’il vienne), l’infinitif nomme le verbe (venir), le participe est sa forme d’adjectif (venant, venu). Dans la terminologie officielle, le conditionnel est un TEMPS de l’indicatif (il viendrait).'),
      s('A TENSE is simple (one word: il venait) or compound (auxiliary + participe: il est venu). The VOICE: active when the subject acts, passive when it undergoes (être + participe, often « par »); the pronominal form has a pronoun looking back at the subject (il se lave).', 'Un TEMPS est simple (un mot : il venait) ou composé (auxiliaire + participe : il est venu). La VOIX : active quand le sujet agit, passive quand il subit (être + participe, souvent « par ») ; la forme pronominale a un pronom qui renvoie au sujet (il se lave).'),
      s('Mode: fact, order, wish, name, or description? Tense: one word or two? Voice: does the subject act, or undergo?', 'Mode : fait, ordre, souhait, nom ou description ? Temps : un mot ou deux ? Voix : le sujet agit, ou subit ?')
    ],
    example: s('il vient → indicatif, présent, simple, active\nqu’il vienne → subjonctif\nil est venu → indicatif, passé composé, compound\nla porte est ouverte par Léa → passive', 'il vient → indicatif, présent, simple, active\nqu’il vienne → subjonctif\nil est venu → indicatif, passé composé, composé\nla porte est ouverte par Léa → passive')
  },
  {
    id: 'word-classes',
    title: s('Word classes', 'Les classes de mots'),
    steps: [
      s('A word belongs to a class whatever the sentence: a noun names (chat, idée), a verb changes with the person and the tense (dort, dormait), a determiner stands before a noun (le, une, mon, ces), an adjective describes a noun and agrees with it (petite, rouge), a pronoun replaces a noun (il, le, nous), an adverb is invariable and modifies (très, vite, demain), a preposition introduces (à, de, sur, dans), a conjunction joins (et, mais, donc, car).', 'Un mot appartient à une classe quelle que soit la phrase : un nom désigne (chat, idée), un verbe change avec la personne et le temps (dort, dormait), un déterminant précède le nom (le, une, mon, ces), un adjectif décrit le nom et s’accorde avec lui (petite, rouge), un pronom remplace un nom (il, le, nous), un adverbe est invariable et modifie (très, vite, demain), une préposition introduit (à, de, sur, dans), une conjonction relie (et, mais, donc, car).'),
      s('Tests: can you put « le » or « une » in front? → noun. Can you put « nous » in front and change it? → verb. Can it change for the plural but not the person? → adjective. Does it never change? → adverb, preposition or conjunction.', 'Des tests : peut-on mettre « le » ou « une » devant ? → nom. Peut-on mettre « nous » devant et le changer ? → verbe. Change-t-il au pluriel mais pas avec la personne ? → adjectif. Ne change-t-il jamais ? → adverbe, préposition ou conjonction.'),
      s('Can it change? With what?', 'Ça change ? Avec quoi ?')
    ],
    example: s('Le (déterminant) petit (adjectif) chat (nom) dort (verbe) très (adverbe) bien (adverbe) sur (préposition) le lit, et (conjonction) il (pronom) rêve.', 'Le (déterminant) petit (adjectif) chat (nom) dort (verbe) très (adverbe) bien (adverbe) sur (préposition) le lit, et (conjonction) il (pronom) rêve.')
  },
  {
    id: 'homophones',
    title: s('Homophones: swap it', 'Les homophones : remplace'),
    steps: [
      s('Two words sound the same and are spelt differently. The trick is to SWAP: if another form of the verb fits, it is the verb. « Il a mangé » → « il avait mangé » works, so « a » (avoir). « Il va à Paris » → « avait Paris » makes no sense, so « à ». « Mon chat est noir » → « était noir », so « est ». « Un chat et un chien » → « et puis un chien », so « et ».', 'Deux mots se prononcent pareil et s’écrivent autrement. L’astuce, c’est de REMPLACER : si une autre forme du verbe marche, c’est le verbe. « Il a mangé » → « il avait mangé » marche, donc « a » (avoir). « Il va à Paris » → « avait Paris » ne veut rien dire, donc « à ». « Mon chat est noir » → « était noir », donc « est ». « Un chat et un chien » → « et puis un chien », donc « et ».'),
      s('on → il; ont → avaient. son → mon; sont → étaient. ce → ces (before a noun); se → nous nous (before a verb). ou → ou bien; où → a place. l’a → l’avait; là → ici.', 'on → il ; ont → avaient. son → mon ; sont → étaient. ce → ces (devant un nom) ; se → nous nous (devant un verbe). ou → ou bien ; où → un lieu. l’a → l’avait ; là → ici.'),
      s('Swap it. Does it still make sense?', 'Remplace. Est-ce que ça a encore un sens ?')
    ],
    example: s('Ils ___ faim → Ils avaient faim ✓ → ont\n___ chapeau → ces chapeaux ✓ → ce\nIl ___ lave → nous nous lavons ✓ → se', 'Ils ___ faim → Ils avaient faim ✓ → ont\n___ chapeau → ces chapeaux ✓ → ce\nIl ___ lave → nous nous lavons ✓ → se')
  },
  {
    id: 'agreement',
    title: s('Plurals and feminines', 'Pluriels et féminins'),
    steps: [
      s('Most plurals add -s. Add -x instead for -eau, -eu, -au (bateaux, jeux) and for seven -ou words (bijou, caillou, chou, genou, hibou, joujou, pou). -al becomes -aux (chevaux), except bal, carnaval, festival, chacal, régal. Words ending in s, x or z do not change. Feminines usually add -e; -eux → -euse, -er → -ère, -f → -ve, -teur → -trice, -on → -onne.', 'La plupart des pluriels prennent -s. Un -x pour -eau, -eu, -au (bateaux, jeux) et pour sept mots en -ou (bijou, caillou, chou, genou, hibou, joujou, pou). -al devient -aux (chevaux), sauf bal, carnaval, festival, chacal, régal. Les mots en s, x, z ne changent pas. Le féminin prend -e en général ; -eux → -euse, -er → -ère, -f → -ve, -teur → -trice, -on → -onne.'),
      s('Look at the last letters: -eau, -eu, -al? → x or aux. s, x, z already? → nothing. -eux, -er, -f, -teur? → the special feminine.', 'Regarde les dernières lettres : -eau, -eu, -al ? → x ou aux. Déjà s, x, z ? → rien. -eux, -er, -f, -teur ? → le féminin spécial.'),
      s('Last letters first.', 'Les dernières lettres d’abord.')
    ],
    example: s('un cheval → des chevaux · un bateau → des bateaux · un chou → des choux\nheureux → heureuse · premier → première · neuf → neuve', 'un cheval → des chevaux · un bateau → des bateaux · un chou → des choux\nheureux → heureuse · premier → première · neuf → neuve')
  },
  {
    id: 'english-words',
    title: s('Learning English words', 'Apprendre des mots anglais'),
    steps: [
      s('A word sticks when you meet it both ways: French → English and English → French. Say it out loud, picture the thing, and use it in a tiny sentence: « It is a red cat. » « a » goes before a consonant sound, « an » before a vowel sound: a dog, an elephant. Days, months and « I » take a capital letter.', 'Un mot reste quand tu le croises dans les deux sens : français → anglais et anglais → français. Dis-le à voix haute, imagine la chose, et mets-le dans une mini-phrase : « It is a red cat. » « a » devant une consonne, « an » devant une voyelle : a dog, an elephant. Les jours, les mois et « I » prennent une majuscule.'),
      s('Numbers: eleven, twelve, then -teen (thirteen… nineteen); tens in -ty (twenty… ninety); a hyphen between ten and unit: forty-seven. one hundred.', 'Les nombres : eleven, twelve, puis -teen (thirteen… nineteen) ; les dizaines en -ty (twenty… ninety) ; un trait d’union entre dizaine et unité : forty-seven. one hundred.'),
      s('Say it, picture it, use it.', 'Dis-le, imagine-le, utilise-le.')
    ],
    example: s('un chat → a cat → It is a black cat.\n47 → forty-seven · 13 → thirteen · 30 → thirty', 'un chat → a cat → It is a black cat.\n47 → forty-seven · 13 → thirteen · 30 → thirty')
  },
  {
    id: 'english-be',
    title: s('be, have, and asking questions', 'be, have, et poser des questions'),
    steps: [
      s('BE: I am, you are, he / she / it is, we are, you are, they are. HAVE: he / she / it has, everyone else have. Age uses BE: I am ten. Questions turn BE round: Are you ready? Is she French? One thing: there is; several: there are.', 'BE : I am, you are, he / she / it is, we are, you are, they are. HAVE : he / she / it has, tous les autres have. L’âge se dit avec BE : I am ten. La question inverse BE : Are you ready? Is she French? Une chose : there is ; plusieurs : there are.'),
      s('Question words: what (quoi), where (où), when (quand), who (qui), why (pourquoi), how (comment); how old, how many. Irregular past: learn the pairs, go / went, see / saw, eat / ate.', 'Les mots interrogatifs : what (quoi), where (où), when (quand), who (qui), why (pourquoi), how (comment) ; how old, how many. Le prétérit irrégulier : apprends les paires, go / went, see / saw, eat / ate.'),
      s('Who is the subject? he, she, it → is, has.', 'Qui est le sujet ? he, she, it → is, has.')
    ],
    example: s('She is ten. She has a dog. Is she French?\nThere is a pen. There are three pens.\ngo → went · see → saw · eat → ate', 'She is ten. She has a dog. Is she French?\nThere is a pen. There are three pens.\ngo → went · see → saw · eat → ate')
  },
  {
    id: 'periods',
    title: s('Periods and centuries', 'Périodes et siècles'),
    steps: [
      s('History is cut into five periods, in order: Prehistory (until writing, about -3 300), Antiquity (until the fall of Rome, 476), the Middle Ages (until 1492), the modern era (until 1789), the contemporary era (until today). A century is a hundred years. To find the century of a year, hide the last two digits and add 1: 1515 → 15 + 1 = 16 → XVIe. A year ending in 00 keeps its number: 1500 → XVe.', 'L’histoire est coupée en cinq périodes, dans l’ordre : la Préhistoire (jusqu’à l’écriture, vers -3 300), l’Antiquité (jusqu’à la chute de Rome, 476), le Moyen Âge (jusqu’en 1492), les Temps modernes (jusqu’en 1789), l’époque contemporaine (jusqu’à aujourd’hui). Un siècle, c’est cent ans. Pour trouver le siècle d’une année, cache les deux derniers chiffres et ajoute 1 : 1515 → 15 + 1 = 16 → XVIe. Une année en 00 garde son nombre : 1500 → XVe.'),
      s('Roman numerals: I 1, V 5, X 10, L 50, C 100. XVI = 10 + 5 + 1 = 16. XIX = 10 + (10 − 1) = 19.', 'Les chiffres romains : I 1, V 5, X 10, L 50, C 100. XVI = 10 + 5 + 1 = 16. XIX = 10 + (10 − 1) = 19.'),
      s('Hide two digits, add one.', 'Cache deux chiffres, ajoute un.')
    ],
    example: s('1515 → XVIe siècle · 1789 → XVIIIe · 2024 → XXIe · 1800 → XVIIIe', '1515 → XVIe siècle · 1789 → XVIIIe · 2024 → XXIe · 1800 → XVIIIe')
  },
  {
    id: 'prehistory',
    title: s('Prehistory: the long story', 'La Préhistoire : la longue histoire'),
    steps: [
      s('Prehistory is almost all of human time. The first humans appear in Africa about 2.5 million years ago, leave Africa about 1.8 million years ago, and master fire about 400 000 years ago. Homo sapiens, our species, appears in Africa about 300 000 years ago and reaches Europe about 45 000 years ago, where Neanderthals already live. Caves are painted (Chauvet about -36 000, Lascaux about -20 000). Then, about -10 000 in the Near East, people begin to farm and herd: the Neolithic. Writing, about -3 300, ends Prehistory.', 'La Préhistoire, c’est presque tout le temps des humains. Les premiers humains apparaissent en Afrique il y a environ 2,5 millions d’années, quittent l’Afrique il y a environ 1,8 million d’années, et maîtrisent le feu il y a environ 400 000 ans. Homo sapiens, notre espèce, apparaît en Afrique il y a environ 300 000 ans et arrive en Europe il y a environ 45 000 ans, où vivent déjà les Néandertaliens. On peint les grottes (Chauvet vers -36 000, Lascaux vers -20 000). Puis, vers -10 000 au Proche-Orient, on cultive et on élève : le Néolithique. L’écriture, vers -3 300, termine la Préhistoire.'),
      s('Dates this old are estimates, and books differ: fire -400 000 or -500 000, sapiens -300 000 or -200 000. The ORDER never changes: humans, fire, sapiens, caves, farming, writing. Think in orders of magnitude: millions, hundreds of thousands, tens of thousands, thousands.', 'Des dates aussi anciennes sont des estimations, et les livres diffèrent : le feu -400 000 ou -500 000, sapiens -300 000 ou -200 000. L’ORDRE ne change jamais : humains, feu, sapiens, grottes, agriculture, écriture. Pense par ordre de grandeur : millions, centaines de milliers, dizaines de milliers, milliers.'),
      s('Millions, hundreds of thousands, tens of thousands, thousands. In that order.', 'Millions, centaines de milliers, dizaines de milliers, milliers. Dans cet ordre.')
    ],
    example: s('-2 500 000 first humans · -400 000 fire · -300 000 sapiens\n-45 000 sapiens in Europe · -20 000 Lascaux · -10 000 farming · -3 300 writing', '-2 500 000 premiers humains · -400 000 le feu · -300 000 sapiens\n-45 000 sapiens en Europe · -20 000 Lascaux · -10 000 agriculture · -3 300 écriture')
  },
  {
    id: 'antiquity',
    title: s('Antiquity around the Mediterranean', 'L’Antiquité autour de la Méditerranée'),
    steps: [
      s('Before Christ, years count DOWN towards 0: -776 (first Olympic Games) comes before -753 (Rome founded), -509 (the Republic), -52 (Alesia), -27 (Augustus). After, they count up: 70 (the Temple destroyed), 313 (Constantine), 476 (Rome falls). The Greeks live in city-states with many gods and Homer’s poems; the Romans build a republic, then an empire; the Hebrews believe in one god and write the Bible; Christianity grows inside the Roman world.', 'Avant Jésus-Christ, les années DESCENDENT vers 0 : -776 (premiers Jeux olympiques) vient avant -753 (fondation de Rome), -509 (la République), -52 (Alésia), -27 (Auguste). Après, elles montent : 70 (le Temple détruit), 313 (Constantin), 476 (chute de Rome). Les Grecs vivent en cités avec beaucoup de dieux et les poèmes d’Homère ; les Romains fondent une république, puis un empire ; les Hébreux croient en un seul dieu et écrivent la Bible ; le christianisme grandit dans le monde romain.'),
      s('Place a date: is it before or after 0? Then which century: -52 is the Ist century BC, 476 the Vth century.', 'Place une date : avant ou après 0 ? Puis quel siècle : -52 est au Ier siècle av. J.-C., 476 au Ve siècle.'),
      s('Before 0 the numbers go down.', 'Avant 0, les nombres descendent.')
    ],
    example: s('-776 · -753 · -509 · -52 · -27 · 70 · 313 · 476', '-776 · -753 · -509 · -52 · -27 · 70 · 313 · 476')
  }
];
