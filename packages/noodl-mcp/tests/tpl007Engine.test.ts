/**
 * TPL-007 — the gate over the engine: every Function script, run the way the
 * node runs it (`Inputs` in, `Outputs` out), against the curriculum it ships.
 *
 * What it grades:
 *
 * - **Every skill generates a well-formed question, many times.** A generator
 *   that throws on one seed in fifty is a game that stops one question in fifty.
 * - **The answer is always among the options** when there are options, and the
 *   trap options are present on the trap skills — the misconception's own
 *   answer is on the buttons, which is the whole point of the trap.
 * - **The number spellers are right** on the cases the programmes and the
 *   misconception literature care about (230 million, 3 040, quatre-vingt-dix).
 * - **The model moves the way the briefing says**: a fluent answer raises the
 *   rating and doubles the half-life; a miss lowers it and halves it; two
 *   misses demote; a due review is served first; the last skill is never
 *   served twice running.
 * - **The merge rule is the bond rule**: 7 and 3 join, 7 and 4 do not.
 * - **A save code round-trips** a profile with its skills.
 * - **The port names a graph will wire exist in the text** — the runtime mines
 *   them from the script, so a port a wire names must be a port the text mints.
 *
 * @module noodl-mcp/tests/tpl007Engine.test
 */
import * as fs from 'fs';
import * as path from 'path';

import { CURRICULUM, HANGAR_LOOKS, HANGAR_SHELF, MIN_FACE_ITEMS_PER_LOOK, TEACH_CARDS, WORD_KEYS, WORD_LISTS, LEVELS } from './tpl007Curriculum';
import {
  ACTIVE_PROFILE_SCRIPT,
  BUILD_HUNT_SCRIPT,
  CHECK_HUNT_SCRIPT,
  CREATE_PROFILE_SCRIPT,
  DECODE_SAVE_SCRIPT,
  DELETE_PROFILE_SCRIPT,
  DRAW_HUNT_SCRIPT,
  DRAW_MERGE_SCRIPT,
  DRAW_MONSTER_SCRIPT,
  ENCODE_SAVE_SCRIPT,
  FINISH_HUNT_SCRIPT,
  FINISH_MERGE_SCRIPT,
  FINISH_MONSTER_SCRIPT,
  FINISH_RACE_SCRIPT,
  HUNT_HELP_AFTER,
  HUNT_MOVE_SCRIPT,
  HUNT_ROUNDS,
  HUNT_STAR_RULE,
  LIMIT_FACTOR,
  MONSTER,
  MONSTER_LOOKS,
  MONSTER_MOVE_SCRIPT,
  MONSTER_STAR_RULE,
  NEW_HUNT_SCRIPT,
  NEW_MONSTER_SCRIPT,
  MERGE_MODES,
  MERGE_POOL_GROUPS,
  MERGE_STAR_RULE,
  FUNCTION_SCRIPTS,
  GRADE_ANSWER_SCRIPT,
  COMEBACK,
  ROLL_FACE_SCRIPT,
  ROLL_HISTORY,
  SHOP_FROM,
  HANGAR_SHELF_SCRIPT,
  HELPERS,
  LIST_PROFILES_SCRIPT,
  LIST_SETS_SCRIPT,
  MAX_PROFILES,
  MOON_ACT_SCRIPT,
  MOON_VIEW_SCRIPT,
  NEW_BOARD_SCRIPT,
  PARSE_SET_SCRIPT,
  PICK_ITEM_SCRIPT,
  PICK_QUESTION_SCRIPT,
  RACE_STEP,
  SAVE_MODEL_SCRIPT,
  SKIN_FACE_SCRIPT,
  SKIN_TONES,
  SELECT_PROFILE_SCRIPT,
  SLIDE_MERGE_SCRIPT,
  STAR_RULE,
  TEACH_CARD_SCRIPT,
  TOGGLE_INDEX_SCRIPT,
  TRANSLATE_SCRIPT,
  UPDATE_SETTINGS_SCRIPT,
  UPSERT_SET_SCRIPT,
  WEAR_ITEM_SCRIPT,
  FOCUS_SCRIPT,
  FOCUS_CHOICES_SCRIPT,
  TOGGLE_ID_SCRIPT,
  ITEM_LEARNED_AT,
  TRIP_ACT_SCRIPT,
  TRIP_VIEW_SCRIPT,
  SCHOOL_ACT_SCRIPT,
  SCHOOL_VIEW_SCRIPT,
  portsOf,
  runScript
} from './tpl007Scripts';
import { FRENCH_VERBS, SUBJECTS, TOPICS, TOPIC_OF } from './tpl007Subjects';

const WORD_ROWS = WORD_KEYS.map((key) => ({ key, ...require('./tpl007Curriculum').WORDS[key] }));
const WORD_LIST_ROWS = [{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: WORD_LISTS.fr }];

/** Run a helper function out of HELPERS by name. */
function helper<T>(name: string, ...args: unknown[]): T {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('args', `${HELPERS}; return ${name}.apply(null, args);`);
  return fn(args) as T;
}

/** A drawn board as the draw scripts hand it to the repeaters: rows of cells, each with an id (read as these specs read it). */
interface GridCell {
  id: string;
  kind: string;
  fx: string;
  [field: string]: unknown;
}
interface GridRow {
  id: string;
  cells: GridCell[];
  [field: string]: unknown;
}
interface Drawn {
  rows: GridRow[];
  [field: string]: unknown;
}
/** One row a view script hands a repeater: a shelf item, a set, a food, a dome, an alien in the book. */
interface ViewRow {
  id: string;
  name?: string;
  label?: string;
  colour?: string;
  selected?: boolean;
  use?: boolean;
  [field: string]: unknown;
}
/** A player profile in the app state, as far as these specs read one. */
interface Profile {
  id: string;
  name: string;
  [field: string]: unknown;
}

const freshModel = () => ({ rating: 0, skills: {} as Record<string, any>, lastSkill: '', answered: 0 });

function pick(overrides: Record<string, unknown> = {}) {
  return runScript(PICK_QUESTION_SCRIPT, {
    curriculum: CURRICULUM,
    model: freshModel(),
    level: 'CM1',
    lang: 'en',
    layout: 'qwerty',
    mode: 'maths',
    answerMode: 'auto',
    wordLists: WORD_LIST_ROWS,
    nonce: 1,
    ...overrides
  });
}

function grade(q: Record<string, any>, typed: string, overrides: Record<string, unknown> = {}) {
  return runScript(GRADE_ANSWER_SCRIPT, {
    model: freshModel(),
    skillId: q.skillId,
    answer: q.answer,
    typed,
    shownAt: Date.now(),
    fluentMs: q.fluentMs,
    itemDiff: q.itemDiff,
    level: 'CM1',
    lang: 'en',
    strategy: q.strategy,
    timedOut: false,
    ...overrides
  });
}

describe('TPL-007 — the engine', () => {
  describe('the number spellers', () => {
    it.each([
      [230000000, 'two hundred and thirty million', 'deux cent trente millions'],
      [3040, 'three thousand and forty', 'trois mille quarante'],
      [205000, 'two hundred and five thousand', 'deux cent cinq mille'],
      [71, 'seventy-one', 'soixante et onze'],
      [80, 'eighty', 'quatre-vingts'],
      [81, 'eighty-one', 'quatre-vingt-un'],
      [90, 'ninety', 'quatre-vingt-dix'],
      [99, 'ninety-nine', 'quatre-vingt-dix-neuf'],
      [21, 'twenty-one', 'vingt et un'],
      [100, 'one hundred', 'cent'],
      [200, 'two hundred', 'deux cents'],
      [201, 'two hundred and one', 'deux cent un'],
      [1000, 'one thousand', 'mille'],
      [1001, 'one thousand and one', 'mille un'],
      [2000000, 'two million', 'deux millions'],
      [1000000000, 'one billion', 'un milliard'],
      [3500000000, 'three billion five hundred million', 'trois milliards cinq cents millions'],
      [999999999, 'nine hundred and ninety-nine million nine hundred and ninety-nine thousand nine hundred and ninety-nine', 'neuf cent quatre-vingt-dix-neuf millions neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf']
    ])('%i → EN "%s" / FR "%s"', (n, en, fr) => {
      expect(helper<string>('spellEn', n)).toBe(en);
      expect(helper<string>('spellFr', n)).toBe(fr);
    });

    it('formats numbers the way each language reads them', () => {
      // RKT-003: French groups with a narrow no-break space, so a phone never breaks "8 266" across two lines.
      expect(helper<string>('fmtNum', 1234567.5, 'fr')).toBe('1\u202f234\u202f567,5');
      expect(helper<string>('fmtNum', 1234567.5, 'en')).toBe('1,234,567.5');
      expect(helper<string>('fmtNum', 0.25, 'fr')).toBe('0,25');
    });

    it('a typed answer is compared as a number when it is one — spaces, commas and dots forgiven', () => {
      expect(helper<boolean>('sameAnswer', '230 000 000', '230000000')).toBe(true);
      // …and an answer copied from the screen, narrow no-break spaces and all, still grades.
      expect(helper<boolean>('sameAnswer', '230\u202f000\u202f000', '230000000')).toBe(true);
      expect(helper<boolean>('sameAnswer', '230,000,000', '230000000')).toBe(true);
      expect(helper<boolean>('sameAnswer', '230.000.000', '230000000')).toBe(true);
      expect(helper<boolean>('sameAnswer', '0,25', '0.25')).toBe(true);
      expect(helper<boolean>('sameAnswer', '2,50', '25')).toBe(false);
      expect(helper<boolean>('sameAnswer', ' Rocket ', 'rocket')).toBe(true);
      expect(helper<boolean>('sameAnswer', '200300000', '230000000')).toBe(false);
    });
  });

  describe('the curriculum', () => {
    it('has every level, both strands of maths, typing, and at least ten traps', () => {
      for (const level of LEVELS) expect(CURRICULUM.some((s) => s.level === level)).toBe(true);
      expect(CURRICULUM.filter((s) => s.strand === 'typing').length).toBeGreaterThanOrEqual(6);
      expect(CURRICULUM.filter((s) => s.trap).length).toBeGreaterThanOrEqual(10);
      const ids = CURRICULUM.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every skill names a Teach card that exists, in both languages', () => {
      const cardIds = new Set(TEACH_CARDS.map((c) => c.id));
      for (const skill of CURRICULUM) {
        expect({ skill: skill.id, teach: skill.teach, known: cardIds.has(skill.teach) }).toEqual({ skill: skill.id, teach: skill.teach, known: true });
        expect(skill.name.en.length).toBeGreaterThan(2);
        expect(skill.name.fr.length).toBeGreaterThan(2);
        expect(skill.strategy.fr).not.toBe(skill.strategy.en);
      }
      for (const card of TEACH_CARDS) {
        expect(card.steps).toHaveLength(3);
        // Faded: each step shorter than the one before, in both languages.
        expect(card.steps[1].en.length).toBeLessThan(card.steps[0].en.length);
        expect(card.steps[2].en.length).toBeLessThan(card.steps[1].en.length);
        expect(card.steps[1].fr.length).toBeLessThan(card.steps[0].fr.length);
        expect(card.steps[2].fr.length).toBeLessThan(card.steps[1].fr.length);
      }
    });

    /** RKT-004 AC2 — every skill whose card is missing, and every card missing a title, a step or its example in a language. */
    const teachGaps = (curriculum: ReadonlyArray<{ id: string; teach: string }>, cards: typeof TEACH_CARDS): string[] => {
      const ids = new Set(cards.map((c) => c.id));
      const out = curriculum.filter((skill) => !ids.has(skill.teach)).map((skill) => `${skill.id} → ${skill.teach}`);
      for (const card of cards) {
        for (const lang of ['en', 'fr'] as const) {
          if (!card.title[lang]) out.push(`${card.id}: no title (${lang})`);
          if (card.steps.length !== 3 || card.steps.some((step) => !step[lang])) out.push(`${card.id}: not three steps (${lang})`);
          if (!card.example[lang]) out.push(`${card.id}: no example (${lang})`);
        }
      }
      return out;
    };

    it('🔴 RKT-004 AC2: every skill opens a card that exists, with a title, three steps and an example in both languages', () => {
      expect(teachGaps(CURRICULUM, TEACH_CARDS)).toEqual([]);
    });

    it('RKT-004 AC2 sabotage arm: a skill pointing at a card that does not exist is named', () => {
      expect(teachGaps([...CURRICULUM, { id: 'sabotage', teach: 'no-such-card' }], TEACH_CARDS)).toEqual(['sabotage → no-such-card']);
    });

    it.each(CURRICULUM.map((s) => [s.id, s] as const))('%s generates a sound question 60 times, in both languages, on both layouts', (_id, skill) => {
      for (let i = 0; i < 60; i++) {
        const lang = i % 2 ? 'fr' : 'en';
        const q = pick({ curriculum: [skill], level: skill.level, lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', mode: String(skill.subject) });
        expect(q.skillId).toBe(skill.id);
        expect(typeof q.prompt).toBe('string');
        expect(q.prompt.length).toBeGreaterThan(0);
        expect(typeof q.answer).toBe('string');
        expect(q.answer.length).toBeGreaterThan(0);
        expect(q.answer).not.toBe('NaN');
        expect(q.answer).not.toContain('undefined');
        expect(q.prompt).not.toContain('undefined');
        expect(q.prompt).not.toContain('NaN');
        if (q.kind === 'options') {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.options.length).toBeLessThanOrEqual(4);
          expect(q.optionValues).toHaveLength(q.options.length);
          const hit = q.optionValues.some((v: string) => helper<boolean>('sameAnswer', v, q.answer));
          expect({ prompt: q.prompt, answer: q.answer, options: q.optionValues, hit }).toEqual(expect.objectContaining({ hit: true }));
          expect(new Set(q.optionValues.map((v: string) => helper<string>('normalise', v))).size).toBe(q.optionValues.length);
        } else {
          expect(q.options).toEqual([]);
        }
        expect(q.fluentMs).toBe(skill.fluentMs);
        expect(q.limitMs).toBe(skill.fluentMs * 3);
        expect(q.teach).toBe(skill.teach);
        if (skill.strand === 'typing') {
          expect(q.isTyping).toBe(true);
          expect(q.nextKey).toBe(q.answer.charAt(0));
        }
      }
    });

    it('the big-number dictation is typed only, and the prompt is the number in words of the chosen language', () => {
      const en = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'big-999999999'), level: 'CM2', lang: 'en' });
      expect(en.kind).toBe('typed');
      expect(en.prompt).toMatch(/^Write in digits: /);
      expect(helper<string>('spellEn', Number(en.answer))).toBe(en.prompt.replace('Write in digits: ', ''));
      const fr = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'big-999999999'), level: 'CM2', lang: 'fr' });
      expect(fr.prompt).toMatch(/^Écris en chiffres : /);
      expect(helper<string>('spellFr', Number(fr.answer))).toBe(fr.prompt.replace('Écris en chiffres : ', ''));
    });

    it('🔴 the trap options carry the misconception: 52 − 38 offers 26, 3 + 4 × 2 offers 14, 2.5 × 10 offers 2.50', () => {
      let sawBug = false;
      for (let i = 0; i < 80 && !sawBug; i++) {
        const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'sub-borrow'), level: 'CM1', answerMode: 'options' });
        const m = q.prompt.match(/^(\d+) − (\d+) = \?$/)!;
        const a = Number(m[1]), b = Number(m[2]);
        const bug = Math.abs(Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10));
        if (bug !== a - b) {
          expect(q.optionValues).toContain(String(bug));
          sawBug = true;
        }
      }
      expect(sawBug).toBe(true);

      const ops = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'order-ops'), level: 'CM2', answerMode: 'options' });
      const om = ops.prompt.match(/^(\d+) \+ (\d+) × (\d+) = \?$/)!;
      expect(ops.optionValues).toContain(String((Number(om[1]) + Number(om[2])) * Number(om[3])));
      expect(ops.answer).toBe(String(Number(om[1]) + Number(om[2]) * Number(om[3])));

      let sawAddZero = false;
      for (let i = 0; i < 80 && !sawAddZero; i++) {
        const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'dec-pow10'), level: 'CM2', answerMode: 'options', lang: 'en' });
        const pm = q.prompt.match(/^([\d.]+) × (\d+) = \?$/);
        if (pm && pm[1].includes('.')) {
          expect(q.options).toContain(pm[1] + '0');
          sawAddZero = true;
        }
      }
      expect(sawAddZero).toBe(true);
    });

    it('decimal comparison never lets the whole-number reading win', () => {
      for (let i = 0; i < 40; i++) {
        const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'dec-compare-3'), level: 'CM2', lang: 'en' });
        const [a, b] = q.optionValues.map(Number);
        const wholeReading = Number(String(a).replace('.', '')) > Number(String(b).replace('.', '')) ? a : b;
        expect(Number(q.answer)).toBe(Math.max(a, b));
        expect(wholeReading).not.toBe(Math.max(a, b));
      }
    });
  });

  describe('picking', () => {
    it('serves a due review before anything else, and never the same skill twice running', () => {
      const model = freshModel();
      model.skills['table-7'] = { d: 900, n: 12, streak: 3, miss: 0, last: [1, 1, 1], hl: 2, due: Date.now() - 1000, m: 2, best: 1500, fluentRun: 1 };
      model.lastSkill = 'table-3';
      const q = pick({ model, level: 'CE2' });
      expect(q.skillId).toBe('table-7');
      // Due but it was the last one: something else is served.
      model.lastSkill = 'table-7';
      for (let i = 0; i < 20; i++) expect(pick({ model, level: 'CE2' }).skillId).not.toBe('table-7');
    });

    it('a CE2 profile is never asked a CM2 skill, and a 6e profile draws from below too', () => {
      const ce2Ids = new Set(CURRICULUM.filter((s) => s.level === 'CE2').map((s) => s.id));
      for (let i = 0; i < 60; i++) expect(ce2Ids.has(pick({ level: 'CE2' }).skillId)).toBe(true);
      const seen = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const id = pick({ level: '6e' }).skillId;
        seen.add(CURRICULUM.find((s) => s.id === id)!.level);
      }
      expect(seen.has('6e')).toBe(true);
      expect(seen.has('CM2')).toBe(true);
    });

    it('typing mode serves only typing skills, maths mode never does', () => {
      for (let i = 0; i < 40; i++) {
        const typing = pick({ mode: 'typing', level: 'CM2' }).skillId;
        const maths = pick({ mode: 'maths', level: 'CM2' }).skillId;
        expect(CURRICULUM.find((s) => s.id === typing)!.strand).toBe('typing');
        expect(CURRICULUM.find((s) => s.id === maths)!.strand).not.toBe('typing');
      }
    });

    it('typing on AZERTY drills the AZERTY home row', () => {
      for (let i = 0; i < 30; i++) {
        const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'type-home'), level: 'CE2', mode: 'typing', layout: 'azerty' });
        expect('qsdfjklm').toContain(q.answer);
        const qw = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'type-home'), level: 'CE2', mode: 'typing', layout: 'qwerty' });
        expect('asdfjkl').toContain(qw.answer);
      }
    });

    it('custom mode serves the person’s own questions, with options when they gave some', () => {
      const set = [{ q: 'Capital of France?', a: 'Paris', opts: ['Lyon', 'Paris', 'Nice'] }, { q: '7 × 6', a: '42' }];
      for (let i = 0; i < 20; i++) {
        const q = pick({ mode: 'custom', customSet: set });
        expect(q.skillId).toBe('custom');
        if (q.prompt === 'Capital of France?') {
          expect(q.kind).toBe('options');
          expect(q.optionValues.sort()).toEqual(['Lyon', 'Nice', 'Paris']);
        } else {
          expect(q.kind).toBe('typed');
          expect(q.answer).toBe('42');
        }
      }
    });
  });

  describe('grading', () => {
    it('a fluent correct answer raises the rating, doubles the half-life ×2.5, and moves the rocket a full step', () => {
      const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
      const g = grade(q, q.answer, { elapsedOverride: 1200 });
      expect(g.correct).toBe(true);
      expect(g.fluent).toBe(true);
      expect(g.outcome).toBe('fluent');
      expect(g.ratingDelta).toBeGreaterThan(0);
      expect(g.model.skills['table-7'].hl).toBe(2.5);
      expect(g.model.skills['table-7'].due).toBeGreaterThan(Date.now() + 2 * 86400000);
      expect(g.gain).toBe(RACE_STEP);
      expect(g.cpuGain).toBeGreaterThan(0);
      expect(g.cpuGain).toBeLessThan(RACE_STEP);
      expect(g.message).toBe('');
      expect(g.model.lastSkill).toBe('table-7');
      expect(g.model.answered).toBe(1);
    });

    it('a slow correct answer still counts, moves the rocket less, and is not fluent', () => {
      const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
      const g = grade(q, q.answer, { elapsedOverride: q.fluentMs * 2.5 });
      expect(g.correct).toBe(true);
      expect(g.fluent).toBe(false);
      expect(g.outcome).toBe('correct');
      expect(g.gain).toBeGreaterThanOrEqual(RACE_STEP * 0.5);
      expect(g.gain).toBeLessThan(RACE_STEP);
    });

    it('🔴 a wrong answer moves nothing, lowers the rating, halves the half-life, and says the answer with the strategy', () => {
      const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
      const g = grade(q, 'nope', { elapsedOverride: 500 });
      expect(g.correct).toBe(false);
      expect(g.gain).toBe(0);
      expect(g.ratingDelta).toBeLessThan(0);
      expect(g.model.skills['table-7'].hl).toBe(0.5);
      expect(g.message).toContain(`The answer was ${q.answer}.`);
      expect(g.message).toContain(q.strategy);
      // Fast and wrong is still wrong: speed never scores without accuracy.
      expect(g.outcome).toBe('wrong');
    });

    it('🔴 RKT-012: a typing word is graded by the keys the pad refused: none as before, one or two never fluent, three a miss', () => {
      const skill = CURRICULUM.find((s) => s.strand === 'typing')!;
      const q = pick({ curriculum: [skill], level: skill.level, mode: 'typing' });
      const at = (mistakes: number | undefined) => grade(q, q.answer, { elapsedOverride: 200, ...(mistakes === undefined ? {} : { mistakes }) });
      expect([undefined, 0, 1, 2, 3, 7].map((m) => [m, at(m).outcome])).toEqual([[undefined, 'fluent'], [0, 'fluent'], [1, 'correct'], [2, 'correct'], [3, 'wrong'], [7, 'wrong']]);
      const three = at(3);
      expect(three.gain).toBe(0);
      expect(three.message).toContain('3 wrong keys.');
      // Spelled right, so the correction must not read "You answered rocket. The answer was rocket."
      expect(three.message).not.toContain('The answer was');
      expect(grade(q, q.answer, { elapsedOverride: 200, mistakes: 3, lang: 'fr' }).message).toContain('3 touches fausses.');
      // Sabotage arm: a word NOT spelled right is still corrected with the answer, whatever the count.
      expect(grade(q, 'zz', { elapsedOverride: 200, mistakes: 3 }).message).toContain('The answer was');
    });

    it('a timeout is graded as a miss even when the typed text happens to be right', () => {
      const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
      const g = grade(q, q.answer, { timedOut: true });
      expect(g.correct).toBe(false);
      expect(g.outcome).toBe('timeout');
    });

    it('mastery climbs new → familiar → proficient → mastered on a due review, and demotes on two misses', () => {
      const skill = CURRICULUM.find((s) => s.id === 'table-7')!;
      let model = freshModel();
      const q = () => pick({ curriculum: [skill], level: 'CE2', model });
      const answerRight = (opts: Record<string, unknown> = {}) => {
        const qq = q();
        model = grade(qq, qq.answer, { model, elapsedOverride: 1000, ...opts }).model;
        return model.skills['table-7'].m;
      };
      const answerWrong = () => {
        const qq = q();
        model = grade(qq, 'wrong', { model, elapsedOverride: 1000 }).model;
        return model.skills['table-7'].m;
      };
      expect(answerRight()).toBe(0);
      answerRight(); answerRight(); answerRight();
      expect(answerRight()).toBe(1); // five in a row, ≥70% of the last ten
      // Five correct in a row with three fluent — already true, so the next correct makes it proficient.
      expect(answerRight()).toBe(2);
      // Mastered only on a correct answer to a DUE review.
      expect(answerRight()).toBe(2);
      expect(answerRight({ wasDue: true })).toBe(3);
      // Two misses in a row: one step down.
      expect(answerWrong()).toBe(3);
      expect(answerWrong()).toBe(2);
    });

    it('the CPU is faster against a stronger player, so a race stays winnable rather than free', () => {
      const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
      const weak = grade(q, q.answer, { model: { ...freshModel(), rating: 700 }, elapsedOverride: 1000 });
      const strong = grade(q, q.answer, { model: { ...freshModel(), rating: 1400 }, elapsedOverride: 1000 });
      expect(strong.cpuGain).toBeGreaterThan(weak.cpuGain);
      // Eight fluent answers reach the planet; the CPU needs more than eight rounds against anyone.
      expect(1 / strong.cpuGain).toBeGreaterThan(8);
    });
  });

  describe('Make Ten Merge', () => {
    const slide = (board: number[], dir: string) => runScript(SLIDE_MERGE_SCRIPT, { board, dir, pool: [1] });

    it('🔴 two tiles merge only when their sum is a multiple of ten', () => {
      const r = slide([7, 3, 0, 0, 7, 4, 0, 0, 25, 25, 0, 0, 14, 6, 0, 0], 'left');
      expect(r.board.slice(0, 2)).toEqual([10, 0].map((v, i) => (i === 0 ? 10 : r.board[1])));
      expect(r.board[0]).toBe(10);
      expect(r.board[4]).toBe(7);
      expect(r.board[5]).toBe(4);
      expect(r.board[8]).toBe(50);
      expect(r.board[12]).toBe(20);
      expect(r.merges).toBe(3);
      expect(r.score).toBe(10 + 50 + 20);
      expect(r.biggest).toBe(50);
      expect(r.moved).toBe(true);
    });

    it('a slide that changes nothing spawns nothing and reports moved=false', () => {
      const board = [7, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const r = slide(board, 'left');
      expect(r.moved).toBe(false);
      expect(r.board).toEqual(board);
    });

    it('a moved board gains exactly one tile from the pool', () => {
      const r = slide([0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'left');
      expect(r.board[0]).toBe(7);
      expect(r.board.filter((v: number) => v > 0)).toHaveLength(2);
      expect(r.board.filter((v: number) => v === 1)).toHaveLength(1);
    });

    it('game over when nothing can slide or merge; up and down work column-wise', () => {
      const full = [1, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1];
      expect(slide(full, 'left').gameOver).toBe(true);
      const col = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0];
      const up = slide(col, 'up');
      expect(up.board[0]).toBe(10);
      const down = slide(col, 'down');
      expect(down.board[12]).toBe(10);
    });

    it('a new board has two tiles', () => {
      const r = runScript(NEW_BOARD_SCRIPT, { pool: [3, 7], nonce: 1 });
      expect(r.board).toHaveLength(16);
      expect(r.board.filter((v: number) => v > 0)).toHaveLength(2);
      expect([r.game.board, r.game.over, r.game.made, r.game.landed.length]).toEqual([r.board, false, 0, 2]);
      expect(r.game.id).toMatch(/^m\w+$/);
      expect(runScript(NEW_BOARD_SCRIPT, { pool: [3, 7] }).game.id).not.toBe(r.game.id);
    });

    it('🔴 new tiles come from the bonds the child is on: single numbers at CE2, teens from CM1 or once pairs to 10 are proficient, fives from CM2, the weakest twice as often', () => {
      const pool = (level: string, m: Record<string, number> = {}) =>
        runScript(NEW_BOARD_SCRIPT, { level, model: { ...freshModel(), skills: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { m: v }])) } }).pool as number[];
      const [ones, teens, fives] = MERGE_POOL_GROUPS.map((g) => [...g.tiles] as number[]);
      const set = (p: number[]) => [...new Set(p)].sort((a, b) => a - b);
      expect(set(pool('CE2'))).toEqual(ones);
      expect(set(pool('CE2', { 'bond-10': 2 }))).toEqual(set([...ones, ...teens]));
      expect(set(pool('CM1'))).toEqual(set([...ones, ...teens]));
      expect(set(pool('CM2'))).toEqual(set([...ones, ...teens, ...fives]));
      // At CM1 with pairs to 10 mastered, the teens are the weakest, so 13 is drawn twice as often as 3.
      const cm1 = pool('CM1', { 'bond-10': 3 });
      expect([cm1.filter((v) => v === 13).length, cm1.filter((v) => v === 3).length]).toEqual([2, 1]);
      // Known-firing beside it: with nothing mastered the single numbers are the weakest.
      expect([pool('CM1').filter((v) => v === 13).length, pool('CM1').filter((v) => v === 3).length]).toEqual([1, 2]);
      // No drawn tile is dead on arrival: every tile in every pool has a partner in the same pool that makes a multiple of ten.
      for (const p of [pool('CE2'), pool('CM1'), pool('CM2'), pool('6e')]) {
        for (const v of p) expect({ v, partner: p.some((w) => (v + w) % 10 === 0) }).toEqual({ v, partner: true });
      }
      // Every group is a bond skill the curriculum really has.
      for (const g of MERGE_POOL_GROUPS) expect({ skill: g.skill, inCurriculum: CURRICULUM.some((s) => s.id === g.skill) }).toEqual({ skill: g.skill, inCurriculum: true });
    });

    it('a slide carries the game: the id is kept, the totals add up, and the squares that joined and landed are named', () => {
      const game = { id: 'm1', board: [7, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pool: [1], score: 20, made: 2, biggest: 10, moves: 4, over: false };
      const r = runScript(SLIDE_MERGE_SCRIPT, { game, dir: 'left' });
      expect([r.game.id, r.game.score, r.game.made, r.game.moves, r.game.biggest, r.game.over, r.game.joined]).toEqual(['m1', 30, 3, 5, 10, false, [0]]);
      expect(r.game.landed).toHaveLength(1);
      expect(r.game.board[r.game.landed[0]]).toBe(1);
      // A press that moves nothing keeps the totals, and names nothing to pop.
      const still = runScript(SLIDE_MERGE_SCRIPT, { game: { ...r.game, board: [7, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, dir: 'left' });
      expect([still.moved, still.game.moves, still.game.made, still.game.joined, still.game.landed]).toEqual([false, 5, 3, [], []]);
    });

    it('a board played to the end locks, and every square that joined on the way holds a multiple of ten', () => {
      const dirs = ['left', 'up', 'right', 'down'];
      for (let n = 0; n < 12; n++) {
        let game = runScript(NEW_BOARD_SCRIPT, { level: n % 2 ? 'CM2' : 'CE2', model: freshModel() }).game;
        let moves = 0;
        while (!game.over && moves < 3000) {
          const r = runScript(SLIDE_MERGE_SCRIPT, { game, dir: dirs[(moves + n) % 4] });
          for (const i of r.game.joined) expect(r.game.board[i] % 10).toBe(0);
          game = r.game;
          moves++;
        }
        expect({ n, over: game.over }).toEqual({ n, over: true });
      }
    });

    it('the drawn board is four rows of four, each square coloured by its kind, and the pop classes swap every move', () => {
      const game = { board: [0, 7, 10, 30, 120, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1234], joined: [2], landed: [1], moves: 3, score: 40, made: 2, biggest: 1234, over: false };
      const en = runScript(DRAW_MERGE_SCRIPT, { game, lang: 'en' });
      expect(en.rows.map((r: GridRow) => r.cells.length)).toEqual([4, 4, 4, 4]);
      expect(en.rows[0].cells.map((c: GridCell) => c.kind)).toEqual(['empty', 'unit', 'ten', 'tens']);
      expect([en.rows[1].cells[0].kind, en.rows[1].cells[1].kind]).toEqual(['big', 'unit']);
      expect(en.rows[0].cells.map((c: GridCell) => c.fx)).toEqual(['rkt-merge-tile', 'rkt-merge-tile rkt-land-b', 'rkt-merge-tile rkt-join-b', 'rkt-merge-tile']);
      expect(runScript(DRAW_MERGE_SCRIPT, { game: { ...game, moves: 4 }, lang: 'en' }).rows[0].cells[2].fx).toBe('rkt-merge-tile rkt-join-a');
      expect([en.rows[3].cells[3].word, runScript(DRAW_MERGE_SCRIPT, { game, lang: 'fr' }).rows[3].cells[3].word]).toEqual(['1,234', '1 234']);
      // A repeater row needs an id, or a re-run piles rows up.
      expect(new Set(en.rows.flatMap((r: GridRow) => [r.id, ...r.cells.map((c) => c.id)])).size).toBe(20);
      expect([en.phase, en.over, runScript(DRAW_MERGE_SCRIPT, { game: { ...game, over: true }, lang: 'en' }).phase]).toEqual(['playing', false, 'over']);
      expect(runScript(DRAW_MERGE_SCRIPT, {}).rows.flatMap((r: GridRow) => r.cells.map((c) => c.kind))).toEqual(Array(16).fill('empty'));
    });

    it('🔴 Easy: a helper tile is the partner of a single number on the board; Hard draws from the pool alone (the modes are one constant)', () => {
      expect(MERGE_MODES).toEqual({ easy: { helper: 0.5 }, hard: { helper: 0 } });
      const one = (helper: number) =>
        runScript(SLIDE_MERGE_SCRIPT, { game: { id: 'm', board: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pool: [1, 2, 3, 4, 5, 6, 7, 8, 9], helper }, dir: 'right' }).game;
      // The helper always on: the only single number on the board is 3, so the new tile is always 7.
      for (let n = 0; n < 40; n++) {
        const g = one(1);
        expect([g.board[g.landed[0]], g.helper]).toEqual([7, 1]);
      }
      // Known-firing beside it: with no helper, the pool's other numbers land too.
      expect(new Set(Array.from({ length: 200 }, () => { const g = one(0); return g.board[g.landed[0]]; })).size).toBeGreaterThan(3);
      // A new board takes its mode's helper, Easy unless Hard is asked for, and a slide keeps it.
      const easy = runScript(NEW_BOARD_SCRIPT, { level: 'CE2' }).game;
      const hard = runScript(NEW_BOARD_SCRIPT, { level: 'CE2', mode: 'hard' }).game;
      expect([easy.mode, easy.helper, hard.mode, hard.helper]).toEqual(['easy', MERGE_MODES.easy.helper, 'hard', MERGE_MODES.hard.helper]);
      expect(runScript(SLIDE_MERGE_SCRIPT, { game: { ...hard, board: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, dir: 'right' }).game).toMatchObject({ mode: 'hard', helper: 0 });
    });

    it('Easy is easier, measured: the same random player makes at least half as many joins again on Easy as on Hard', () => {
      const dirs = ['left', 'up', 'right', 'down'];
      const joinsOn = (mode: string) => {
        let game = runScript(NEW_BOARD_SCRIPT, { level: 'CE2', mode }).game;
        for (let moves = 0; !game.over && moves < 2000; moves++) {
          let next = null;
          for (const d of [...dirs].sort(() => Math.random() - 0.5)) {
            const r = runScript(SLIDE_MERGE_SCRIPT, { game, dir: d });
            if (r.moved) { next = r.game; break; }
          }
          if (!next) break;
          game = next;
        }
        return game.made;
      };
      const mean = (mode: string) => Array.from({ length: 30 }, () => joinsOn(mode)).reduce((a, b) => a + b, 0) / 30;
      const [easy, hard] = [mean('easy'), mean('hard')];
      expect({ easy, hard, easier: easy >= 1.5 * hard }).toEqual({ easy, hard, easier: true });
    });

    it('a full board with a join still there is its own state, so the rule can give way to a hint; a locked board is not "full"', () => {
      const full = [3, 7, 1, 2, 4, 5, 6, 8, 9, 1, 2, 3, 4, 5, 6, 8];
      expect([
        runScript(DRAW_MERGE_SCRIPT, { game: { board: full, over: false } }).fullness,
        runScript(DRAW_MERGE_SCRIPT, { game: { board: full, over: true } }).fullness,
        runScript(DRAW_MERGE_SCRIPT, { game: { board: [3, 0, ...Array(14).fill(1)], over: false } }).fullness
      ]).toEqual(['full', 'roomy', 'roomy']);
    });

    it('the mode is kept on the player: Easy until Hard is chosen, and junk changes nothing', () => {
      const app = runScript(CREATE_PROFILE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, name: 'Léa', look: 'pixel-art', seed: 'L', level: 'CE2', lang: 'fr' }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).mergeMode).toBe('easy');
      const hard = runScript(UPDATE_SETTINGS_SCRIPT, { app: JSON.parse(JSON.stringify(app)), mergeMode: 'hard' }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app: hard }).mergeMode).toBe('hard');
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app: runScript(UPDATE_SETTINGS_SCRIPT, { app: hard, mergeMode: 'medium' }).app }).mergeMode).toBe('hard');
    });

    it('🔴 D64: no row or square the board draws carries a field the runtime Model answers for itself (a For Each makes each one a Model)', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loaded = require('../../noodl-runtime/src/model');
      const RuntimeModel = loaded.default ?? loaded;
      const reserved = new Set<string>(['data']);
      for (let p = RuntimeModel.prototype; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) for (const n of Object.getOwnPropertyNames(p)) reserved.add(n);
      // Known-firing: the name that bit the hangar is on the list.
      expect([reserved.has('on'), reserved.has('get')]).toEqual([true, true]);
      const rows = runScript(DRAW_MERGE_SCRIPT, { game: { board: [7, 3], moves: 1, joined: [0], landed: [1] }, lang: 'en' }).rows;
      const keys = [...new Set([...rows.flatMap((r: GridRow) => Object.keys(r)), ...rows.flatMap((r: GridRow) => r.cells.flatMap((c) => Object.keys(c)))])].sort();
      expect(keys).toEqual(['cells', 'fx', 'id', 'kind', 'word']);
      expect(keys.filter((k) => reserved.has(k))).toEqual([]);
    });

    it('🔴 a finished board pays once: a star a join up to the cap, plus a landing’s five; a second Finish, or an abandoned board, pays nothing', () => {
      const over = { id: 'm7', board: [], made: 6, biggest: 60, over: true };
      const first = runScript(FINISH_MERGE_SCRIPT, { model: { ...freshModel(), stars: 10 }, game: over, lang: 'en' });
      expect([first.paid, first.starsEarned, first.stars, first.starsText]).toEqual([true, 6 * MERGE_STAR_RULE.join + MERGE_STAR_RULE.finish, 21, '+11 ⭐']);
      const again = runScript(FINISH_MERGE_SCRIPT, { model: first.model, game: over, lang: 'en' });
      expect([again.paid, again.starsEarned, again.stars]).toEqual([false, 0, 21]);
      const long = runScript(FINISH_MERGE_SCRIPT, { model: { ...freshModel(), stars: 0 }, game: { ...over, id: 'm8', made: 40 }, lang: 'fr' });
      expect([long.starsEarned, long.why]).toEqual([MERGE_STAR_RULE.joinCap + MERGE_STAR_RULE.finish, expect.stringMatching(/le maximum/)]);
      const abandoned = runScript(FINISH_MERGE_SCRIPT, { model: { ...freshModel(), stars: 3 }, game: { ...over, id: 'm9', over: false }, lang: 'en' });
      expect([abandoned.paid, abandoned.stars]).toEqual([false, 3]);
      // PLY-002: a purse that can buy the cheapest thing on the shelf offers the hangar; one that cannot, does not.
      expect(first.earnedPick).toBe(true);
      expect(runScript(FINISH_MERGE_SCRIPT, { model: { ...freshModel(), stars: 0, spent: 0 }, game: { ...over, id: 'm10', made: 0, over: false }, lang: 'en' }).earnedPick).toBe(false);
      expect(SHOP_FROM).toBeLessThanOrEqual(first.stars);
      // Sabotage arm: without the board id check, the second Finish pays again.
      const doctored = FINISH_MERGE_SCRIPT.replace('model.lastMergeId !== id', 'true');
      expect(doctored).not.toBe(FINISH_MERGE_SCRIPT);
      expect(runScript(doctored, { model: first.model, game: over, lang: 'en' }).paid).toBe(true);
    });
  });

  describe('Number Hunt', () => {
    /**
     * What a set of squares makes, worked out from PLY-003's table rather than read from the script: add, multiply,
     * the bigger minus the smaller, the bigger over the smaller when it divides exactly. Tenths are rounded, because
     * 0.1 + 0.2 is not 0.3 in binary.
     */
    const huntMade = (kind: string, values: number[]) => {
      const round2 = (v: number) => Math.round(v * 100) / 100;
      if (kind === 'mul2') return values.reduce((a, b) => a * b, 1);
      if (kind === 'sub2') return round2(Math.max(...values) - Math.min(...values));
      if (kind === 'div2') {
        const hi = Math.max(...values);
        const lo = Math.min(...values);
        return lo && hi % lo === 0 ? hi / lo : NaN;
      }
      return round2(values.reduce((a, b) => a + b, 0));
    };

    it.each(LEVELS)('%s builds a grid whose target has 1–3 solutions, and the checker agrees', (level) => {
      for (let i = 0; i < 15; i++) {
        const lang = i % 2 ? 'fr' : 'en';
        const h = runScript(BUILD_HUNT_SCRIPT, { level, lang, nonce: i });
        expect(h.cells).toHaveLength(16);
        expect(h.solutions).toBeGreaterThanOrEqual(1);
        expect(h.solutions).toBeLessThanOrEqual(3);
        // PLY-003: a fixed-target kind says its number in the sentence; a decimals target is said in the child's own punctuation.
        const said = h.kind === 'add100' ? '100' : h.kind === 'add1000' ? '1000' : String(h.target).replace('.', lang === 'fr' ? ',' : '.');
        expect(h.instruction).toContain(said);
        // Count the solutions independently and check one with the checker.
        const idx = [...Array(16).keys()];
        const combos: number[][] = [];
        const rec = (start: number, chosen: number[]) => {
          if (chosen.length === h.count) { combos.push([...chosen]); return; }
          for (let k = start; k < 16; k++) { chosen.push(idx[k]); rec(k + 1, chosen); chosen.pop(); }
        };
        rec(0, []);
        const value = (c: number[]) => huntMade(h.kind, c.map((j) => h.cells[j].v));
        const solutions = combos.filter((c) => value(c) === h.target);
        expect(solutions).toHaveLength(h.solutions);
        const check = runScript(CHECK_HUNT_SCRIPT, { cells: h.cells, selected: solutions[0], count: h.count, target: h.target, kind: h.kind });
        expect(check.correct).toBe(true);
        expect(check.complete).toBe(true);
        const wrong = runScript(CHECK_HUNT_SCRIPT, { cells: h.cells, selected: solutions[0].slice(0, 1), count: h.count, target: h.target, kind: h.kind });
        expect(wrong.complete).toBe(false);
        expect(wrong.correct).toBe(false);
      }
    });

    it('toggling an index adds it, toggling again removes it, and the cap holds', () => {
      let r = runScript(TOGGLE_INDEX_SCRIPT, { list: [], index: 3, max: 2 });
      expect(r.list).toEqual([3]);
      r = runScript(TOGGLE_INDEX_SCRIPT, { list: r.list, index: 5, max: 2 });
      expect(r.list).toEqual([3, 5]);
      r = runScript(TOGGLE_INDEX_SCRIPT, { list: r.list, index: 9, max: 2 });
      expect(r.list).toEqual([3, 5]);
      r = runScript(TOGGLE_INDEX_SCRIPT, { list: r.list, index: 3, max: 2 });
      expect(r.list).toEqual([5]);
    });
  });

  describe('Number Hunt, the game (§12.2)', () => {
    /**
     * What a set of squares makes, worked out from PLY-003's table rather than read from the script: add, multiply,
     * the bigger minus the smaller, the bigger over the smaller when it divides exactly. Tenths are rounded, because
     * 0.1 + 0.2 is not 0.3 in binary.
     */
    const huntMade = (kind: string, values: number[]) => {
      const round2 = (v: number) => Math.round(v * 100) / 100;
      if (kind === 'mul2') return values.reduce((a, b) => a * b, 1);
      if (kind === 'sub2') return round2(Math.max(...values) - Math.min(...values));
      if (kind === 'div2') {
        const hi = Math.max(...values);
        const lo = Math.min(...values);
        return lo && hi % lo === 0 ? hi / lo : NaN;
      }
      return round2(values.reduce((a, b) => a + b, 0));
    };

    // A grid made by hand: the pairs that make 20 are exactly 3 + 17 (squares 0, 1) and 8 + 12 (squares 2, 3).
    const CELLS = [3, 17, 8, 12, 1, 2, 4, 6, 25, 30, 40, 50, 60, 70, 80, 90];
    const hunt = (over: Record<string, unknown> = {}): any => ({ id: 'h1', level: 'CE2', round: 1, rounds: HUNT_ROUNDS, kind: 'add2', count: 2, cells: CELLS, target: 20, ways: [[0, 1], [2, 3]], found: [], shown: [], picked: [], missed: [], lately: [], said: [], note: 'start', made: 0, helped: 0, misses: 0, gridMisses: 0, taps: 0, over: false, ...over });
    const move = (game: any, action: string, index?: number) => runScript(HUNT_MOVE_SCRIPT, { game, action, index });
    const taps = (game: any, ...indexes: number[]): any => indexes.reduce((g, i) => move(g, 'tap', i).game, game);
    const draw = (game: any, lang = 'en') => runScript(DRAW_HUNT_SCRIPT, { game, lang }) as Drawn;
    const kinds = (d: Drawn): string[] => d.rows.flatMap((r) => r.cells.map((c) => c.kind));
    const fxRow = (d: Drawn, r = 0): string[] => d.rows[r].cells.map((c) => c.fx);
    const waysIn = (cells: number[], kind: string, count: number, target: number) => {
      const out: number[][] = [];
      const rec = (start: number, chosen: number[]) => {
        if (chosen.length === count) {
          const v = huntMade(kind, chosen.map((j) => cells[j]));
          if (v === target) out.push([...chosen]);
          return;
        }
        for (let k = start; k < cells.length; k++) rec(k + 1, [...chosen, k]);
      };
      rec(0, []);
      return out;
    };

    it.each(LEVELS)('%s: a new hunt is the first of five grids, and its ways are every set of squares that makes the target', (level) => {
      expect(HUNT_ROUNDS).toBe(5);
      const ids = new Set<string>();
      for (let n = 0; n < 12; n++) {
        const g = runScript(NEW_HUNT_SCRIPT, { level }).game;
        expect([g.round, g.rounds, g.cells.length, g.over, g.made, g.found, g.picked]).toEqual([1, HUNT_ROUNDS, 16, false, 0, [], []]);
        expect(g.ways.length).toBeGreaterThanOrEqual(1);
        expect(g.ways.length).toBeLessThanOrEqual(3);
        // Counted again here, independently: the grid's ways are ALL of them, so "there are 2 ways" is true.
        expect(waysIn(g.cells, g.kind, g.count, g.target)).toEqual(g.ways);
        expect(g.id).toMatch(/^h\w+$/);
        ids.add(g.id);
      }
      expect(ids.size).toBe(12);
    });

    it('🔴 a tap grows the pick, and a full pick is checked at once and cleared: right is found and counted, wrong is a miss that says its sum', () => {
      const one = move(hunt(), 'tap', 0);
      expect([one.changed, one.game.picked, one.game.made]).toEqual([true, [0], 0]);
      expect(move(one.game, 'tap', 0).game.picked).toEqual([]);
      const right = taps(hunt(), 1, 0);
      expect([right.picked, right.found, right.made, right.note, right.said]).toEqual([[], [[0, 1]], 1, 'right', [3, 17]]);
      const wrong = taps(hunt(), 0, 2);
      expect([wrong.picked, wrong.found, wrong.missed, wrong.misses, wrong.gridMisses, wrong.note]).toEqual([[], [], [0, 2], 1, 1, 'wrong']);
      expect([draw(wrong).note, draw(wrong, 'fr').note]).toEqual(['3 + 8 = 11, not 20. Try again.', '3 + 8 = 11, pas 20. Essaie encore.']);
      expect(draw(taps(hunt({ kind: 'mul2', target: 51, ways: [[0, 1]] }), 0, 2)).note).toBe('3 × 8 = 24, not 51. Try again.');
      // The same way again pays nothing, and is not a miss either.
      const again = taps(right, 0, 1);
      expect([again.made, again.found.length, again.misses, again.note]).toEqual([1, 1, 0, 'again']);
      expect(draw(again).note).toBe('You already found 3 + 17 = 20.');
      // The game the node was given is never changed in place.
      const before = hunt();
      move(before, 'tap', 3);
      expect(before.picked).toEqual([]);
      // A tap on no square changes nothing (known-firing beside it: square 15 does).
      expect([move(hunt(), 'tap', 16).changed, move(hunt(), 'tap', 1.5).changed, move(hunt(), 'tap').changed, move(hunt(), 'tap', 15).changed]).toEqual([false, false, false, true]);
    });

    it('🔴 Show me one: refused until two misses on this grid, then it shows a way not found yet, pays nothing, and the grid counts it', () => {
      expect(HUNT_HELP_AFTER).toBe(2);
      const oneMiss = taps(hunt(), 0, 2);
      expect([move(oneMiss, 'show').changed, draw(oneMiss).canShow]).toEqual([false, false]);
      const twoMisses = taps(oneMiss, 0, 2);
      expect([draw(twoMisses).canShow, twoMisses.gridMisses]).toEqual([true, 2]);
      const shown = move(taps(twoMisses, 0, 1), 'show').game;
      expect([shown.shown, shown.helped, shown.made, shown.note]).toEqual([[[2, 3]], 1, 1, 'shown']);
      expect([draw(shown).note, draw(shown, 'fr').note]).toEqual(['Here is one: 8 + 12 = 20. That was the last one.', 'En voici une : 8 + 12 = 20. C’était la dernière.']);
      expect([draw(shown).phase, draw(shown).canShow, kinds(draw(shown)).slice(0, 4)]).toEqual(['found', false, ['found', 'found', 'shown', 'shown']]);
      // Finding a shown way afterwards pays nothing.
      expect(taps({ ...shown, over: false, ways: [[0, 1], [2, 3], [4, 7]] }, 3, 2).made).toBe(1);
    });

    it('🔴 Next grid comes only once every way is found; the totals carry; the last grid’s last way ends the hunt, and nothing moves after', () => {
      expect(move(taps(hunt(), 0, 1), 'next').changed).toBe(false);
      const cleared = taps(hunt({ gridMisses: 1, misses: 1 }), 0, 1, 2, 3);
      expect([draw(cleared).phase, cleared.over, draw(cleared).note, draw(cleared, 'fr').note]).toEqual(['found', false, '✅ 8 + 12 = 20 · all 2 found!', '✅ 8 + 12 = 20 · toutes trouvées !']);
      expect(move(cleared, 'tap', 5).changed).toBe(false);
      const next = move(cleared, 'next').game;
      expect([next.round, next.made, next.misses, next.gridMisses, next.found, next.note, next.id]).toEqual([2, 2, 1, 0, [], 'start', 'h1']);
      expect(waysIn(next.cells, next.kind, next.count, next.target)).toEqual(next.ways);
      const last = taps(hunt({ round: HUNT_ROUNDS }), 0, 1, 2, 3);
      expect([last.over, draw(last).phase, draw(last).over]).toEqual([true, 'over', true]);
      expect([move(last, 'tap', 4).changed, move(last, 'next').changed, move(last, 'show').changed]).toEqual([false, false, false]);
      // Known-firing beside it: the same grid one before the last is not the end.
      expect(taps(hunt({ round: HUNT_ROUNDS - 1 }), 0, 1, 2, 3).over).toBe(false);
    });

    it('a hunt played through by a child who finds every way ends over, on the last grid, with every way counted', () => {
      for (let n = 0; n < 8; n++) {
        let g = runScript(NEW_HUNT_SCRIPT, { level: LEVELS[n % LEVELS.length] }).game;
        let ways = 0;
        for (let guard = 0; guard < 50 && !g.over; guard++) {
          ways += g.ways.length;
          for (const way of g.ways) g = taps(g, ...way);
          if (!g.over) g = move(g, 'next').game;
        }
        expect({ n, over: g.over, round: g.round, made: g.made, helped: g.helped }).toEqual({ n, over: true, round: HUNT_ROUNDS, made: ways, helped: 0 });
      }
    });

    it('the drawn hunt is four rows of four: each number shows where it stands, a way just found pops, a wrong pick shakes, and the next tap stills both', () => {
      const d = draw(taps(hunt(), 0, 1, 2));
      expect(d.rows.map((r: GridRow) => r.cells.length)).toEqual([4, 4, 4, 4]);
      expect(kinds(d).slice(0, 4)).toEqual(['found', 'found', 'picked', 'idle']);
      const justFound = taps(hunt(), 0, 1);
      expect(fxRow(draw(justFound))).toEqual(['rkt-hunt-tile rkt-hunt-found rkt-join-a', 'rkt-hunt-tile rkt-hunt-found rkt-join-a', 'rkt-hunt-tile rkt-hunt-idle', 'rkt-hunt-tile rkt-hunt-idle']);
      expect(fxRow(draw(move(justFound, 'tap', 2).game))).toEqual(['rkt-hunt-tile rkt-hunt-found', 'rkt-hunt-tile rkt-hunt-found', 'rkt-hunt-tile rkt-hunt-picked', 'rkt-hunt-tile rkt-hunt-idle']);
      const shaken = taps(hunt(), 0, 2);
      expect([fxRow(draw(shaken))[0], fxRow(draw(move(shaken, 'tap', 4).game))[0]]).toEqual(['rkt-hunt-tile rkt-hunt-wrong rkt-shake-a', 'rkt-hunt-tile rkt-hunt-idle']);
      // The two names swap with the move count, so a pop on the very next move restarts.
      expect(fxRow(draw({ ...justFound, taps: 3 }))[0]).toBe('rkt-hunt-tile rkt-hunt-found rkt-join-b');
      expect([d.rows[3].cells[3].word, d.rows[3].cells[3].at, d.rows[0].cells[1].word]).toEqual(['90', 15, '17']);
      // A repeater row needs an id, or a re-run piles rows up.
      expect(new Set(d.rows.flatMap((r: GridRow) => [r.id, ...r.cells.map((c) => c.id)])).size).toBe(20);
      const empty = runScript(DRAW_HUNT_SCRIPT, {}) as Drawn;
      expect([kinds(empty), empty.phase, empty.note, empty.instruction]).toEqual([Array(16).fill('idle'), 'playing', '', '']);
    });

    it('the words: the instruction, the progress, and the note, in both languages', () => {
      expect([draw(hunt()).instruction, draw(hunt(), 'fr').instruction]).toEqual(['Pick 2 numbers that add up to 20', 'Choisis 2 nombres dont la somme fait 20']);
      expect([draw(hunt()).progress, draw(hunt({ round: 3 }), 'fr').progress]).toEqual(['Grid 1 of 5 · found 0 of 2', 'Grille 3 sur 5 · trouvées : 0 sur 2']);
      expect([draw(hunt()).note, draw(hunt(), 'fr').note, draw(hunt({ ways: [[0, 1]], count: 2 })).note]).toEqual(['There are 2 ways. Tap 2 numbers.', 'Il y a 2 façons. Touche 2 nombres.', 'There is 1 way. Tap 2 numbers.']);
      expect([draw(taps(hunt(), 0, 1)).note, draw(taps(hunt(), 0, 1), 'fr').note, draw(taps(hunt(), 0, 1)).noteKind]).toEqual(['✅ 3 + 17 = 20 · 1 more to find', '✅ 3 + 17 = 20 · encore 1 à trouver', 'right']);
      expect([draw(hunt()).noteKind, draw(taps(hunt(), 0, 2)).noteKind]).toEqual(['quiet', 'wrong']);
    });

    it('🔴 D64: no row or number the grid draws carries a field the runtime Model answers for itself', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loaded = require('../../noodl-runtime/src/model');
      const RuntimeModel = loaded.default ?? loaded;
      const reserved = new Set<string>(['data']);
      for (let p = RuntimeModel.prototype; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) for (const n of Object.getOwnPropertyNames(p)) reserved.add(n);
      expect([reserved.has('on'), reserved.has('get')]).toEqual([true, true]);
      const rows = draw(taps(hunt(), 0, 1)).rows;
      const keys = [...new Set([...rows.flatMap((r: GridRow) => Object.keys(r)), ...rows.flatMap((r: GridRow) => r.cells.flatMap((c) => Object.keys(c)))])].sort();
      expect(keys).toEqual(['at', 'cells', 'fx', 'id', 'kind', 'word']);
      expect(keys.filter((k) => reserved.has(k))).toEqual([]);
    });

    it('🔴 a finished hunt pays once: a star a way found up to the cap, plus a landing’s five; a way shown pays nothing; a second Finish, or a hunt left unfinished, pays nothing', () => {
      expect(HUNT_STAR_RULE).toEqual({ way: 1, wayCap: 15, finish: STAR_RULE.finish });
      const over = { id: 'h7', made: 6, helped: 2, over: true };
      const first = runScript(FINISH_HUNT_SCRIPT, { model: { ...freshModel(), stars: 10 }, game: over, lang: 'en' });
      expect([first.paid, first.starsEarned, first.stars, first.starsText, first.why, first.line, first.headline]).toEqual([true, 11, 21, '+11 ⭐', 'ways found +6 · hunt finished +5', '6 ways found · 2 shown', 'Hunt complete!']);
      const again = runScript(FINISH_HUNT_SCRIPT, { model: first.model, game: over, lang: 'en' });
      expect([again.paid, again.starsEarned, again.stars]).toEqual([false, 0, 21]);
      const long = runScript(FINISH_HUNT_SCRIPT, { model: freshModel(), game: { ...over, id: 'h8', made: 40, helped: 0 }, lang: 'fr' });
      expect([long.starsEarned, long.why, long.line, long.headline]).toEqual([HUNT_STAR_RULE.wayCap + HUNT_STAR_RULE.finish, 'trouvées +15 (le maximum) · chasse finie +5', '40 trouvées', 'Chasse terminée !']);
      const left = runScript(FINISH_HUNT_SCRIPT, { model: { ...freshModel(), stars: 3 }, game: { ...over, id: 'h9', over: false }, lang: 'en' });
      expect([left.paid, left.stars]).toEqual([false, 3]);
      // PLY-002: a purse that can buy the cheapest thing offers the hangar; an empty one does not.
      expect(first.earnedPick).toBe(true);
      expect(runScript(FINISH_HUNT_SCRIPT, { model: { ...freshModel(), stars: 0, spent: 0 }, game: { ...over, id: 'h10', over: false }, lang: 'en' }).earnedPick).toBe(false);
      // The hunt's id is its own: a Make Ten board paid with the same id does not stop the hunt paying.
      expect(runScript(FINISH_HUNT_SCRIPT, { model: { ...freshModel(), lastMergeId: 'h7' }, game: over, lang: 'en' }).paid).toBe(true);
      // Sabotage arm: without the hunt id check, the second Finish pays again.
      const doctored = FINISH_HUNT_SCRIPT.replace('model.lastHuntId !== id', 'true');
      expect(doctored).not.toBe(FINISH_HUNT_SCRIPT);
      expect(runScript(doctored, { model: first.model, game: over, lang: 'en' }).paid).toBe(true);
    });
  });

  describe('Monster Gate, the game (§16)', () => {
    const game = (over: Record<string, unknown> = {}): any => ({ id: 'm1', style: 'gate', timed: false, hearts: MONSTER.hearts, beaten: 0, hp: MONSTER.hp, start: 1, pos: 1, streak: 0, right: 0, answered: 0, event: 'start', fresh: false, healed: false, over: false, won: false, moves: 0, ...over });
    const move = (g: any, outcome: string, extra: Record<string, unknown> = {}) => runScript(MONSTER_MOVE_SCRIPT, { game: g, action: 'answer', outcome, ...extra });
    const answers = (g: any, ...outcomes: string[]): any => outcomes.reduce((acc, o) => move(acc, o).game, g);
    const next = (g: Record<string, unknown>) => runScript(MONSTER_MOVE_SCRIPT, { game: g, action: 'next' });
    const draw = (g: any, lang = 'en') => runScript(DRAW_MONSTER_SCRIPT, { game: g, lang });

    it('the rule table is the ruling: three monsters, three hearts, four hits, a heart back after three quick answers', () => {
      expect(MONSTER).toEqual({ monsters: 3, hearts: 3, hp: 4, bigHit: 2, smallHit: 1, creep: { practice: 1 / 3, challenge: 0.25 }, back: { practice: 0.15, challenge: 1 }, push: 2, step: 1.5, pushStart: 0.5, healRun: 3 });
      expect(MONSTER_LOOKS).toEqual(['horns', 'eye', 'spikes']);
    });

    it('a new game: three hearts, the first monster at full health, a new id; Push it back starts it in the middle', () => {
      const ids = new Set<string>();
      for (const [style, timed] of [['gate', false], ['gate', true], ['push', false], ['push', true], ['nonsense', 'yes']] as const) {
        const out = runScript(NEW_MONSTER_SCRIPT, { style, timed });
        const g = out.game;
        const push = style === 'push';
        expect({ style, g: [g.style, g.timed, g.hearts, g.beaten, g.hp, g.start, g.pos, g.over, out.timeScale, out.id] }).toEqual({ style, g: [push ? 'push' : 'gate', timed === true, 3, 0, 4, 1, push ? 0.5 : 1, false, 1, g.id] });
        expect(g.id).toMatch(/^m\w+$/);
        ids.add(g.id);
      }
      expect(ids.size).toBe(5);
    });

    it('🔴 Beat it to the gate: a quick answer is a big hit and a slow one a small hit, each knocks it back; four hits and it runs away, and Next brings the next', () => {
      // PLY-004: in Practice a right answer pushes it back by MONSTER.back.practice, not all the way.
      const quick = move(game({ start: 0.5, pos: 0.5 }), 'fluent').game;
      expect([quick.hp, quick.start, quick.pos, quick.event, quick.right, quick.answered]).toEqual([2, 0.65, 0.65, 'bigHit', 1, 1]);
      // In Challenge it still is all the way — Richard: "in the defi mode it works well with the timer adding stakes".
      expect(move(game({ timed: true, start: 0.5, pos: 0.5 }), 'fluent').game.start).toBe(1);
      const slow = move(game(), 'correct').game;
      expect([slow.hp, slow.event]).toEqual([3, 'hit']);
      const beaten = answers(game(), 'fluent', 'correct', 'correct');
      expect([beaten.beaten, beaten.hp, beaten.fresh, beaten.event, beaten.over]).toEqual([1, 4, true, 'beaten', false]);
      // Known-firing beside it: one hit fewer and it stands.
      expect(answers(game(), 'fluent', 'correct').beaten).toBe(0);
      const arrived = next(beaten);
      expect([arrived.changed, arrived.game.fresh, arrived.game.event, arrived.game.beaten, arrived.game.hp]).toEqual([true, false, 'arrive', 1, 4]);
      expect(next(arrived.game).changed).toBe(false);
    });

    it('🔴 ruling 2: a wrong answer, it creeps closer (a third of the way in Practice, a quarter in Challenge), and creeping all the way costs a heart', () => {
      const p1 = move(game(), 'wrong').game;
      expect([p1.start, p1.pos, p1.event, p1.hearts, p1.right]).toEqual([0.667, 0.667, 'creep', 3, 0]);
      expect(answers(game(), 'wrong', 'wrong').hearts).toBe(3);
      const p3 = answers(game(), 'wrong', 'wrong', 'wrong');
      expect([p3.start, p3.event, p3.hearts]).toEqual([1, 'bang', 2]);
      const c = (n: number) => answers(game({ timed: true }), ...Array(n).fill('wrong'));
      expect([c(1).start, c(2).start, c(3).start, c(3).hearts, c(4).event, c(4).hearts, c(4).start]).toEqual([0.75, 0.5, 0.25, 3, 'bang', 2, 1]);
      // In Challenge a right answer still knocks a crept monster all the way back (PLY-004 left that alone).
      expect(move(c(3), 'correct').game.start).toBe(1);
    });

    it('🔴 PLY-004: in Practice only a QUICK right answer pushes it back, a slow one holds it, and wrong answers accumulate', () => {
      // Slow but right: the hit lands, the monster neither gains nor loses ground. This is the half that makes Practice tense.
      const slow = move(game({ start: 0.5, pos: 0.5 }), 'correct').game;
      expect([slow.hp, slow.start, slow.event]).toEqual([3, 0.5, 'hit']);
      // Quick and right: pushed back by MONSTER.back.practice.
      const quick = move(game({ start: 0.5, pos: 0.5 }), 'fluent').game;
      expect([quick.hp, quick.start, quick.event]).toEqual([2, 0.65, 'bigHit']);
      // 🔴 The finding itself: wrong answers now ACCUMULATE. Wrong, right, wrong leaves it two creeps in — under the
      // rule Richard played, the right answer in the middle threw it all the way back and it was one creep in.
      expect(answers(game(), 'wrong', 'correct', 'wrong').start).toBe(0.334);
      const asShipped = MONSTER_MOVE_SCRIPT.replace('quick ? MONSTER.back.practice : 0', 'MONSTER.back.challenge');
      expect(asShipped).not.toBe(MONSTER_MOVE_SCRIPT);
      // 🔴 The whole sequence has to run under the old script — building the prefix with the NEW one and applying
      // one old move measures a mixture of the two rules, and reads as if nothing had changed.
      const asShippedRun = ['wrong', 'correct', 'wrong'].reduce((g: any, o) => runScript(asShipped, { game: g, action: 'answer', outcome: o }).game, game());
      expect(asShippedRun.start).toBe(0.667);
      // Challenge is untouched: Richard says the clock already carries it.
      expect(move(game({ timed: true, start: 0.5, pos: 0.5 }), 'correct').game.start).toBe(1);
    });

    it('🔴 PLY-004: the compromise, measured — a child at 40% right loses the gate, one at 75% wins but feels it', () => {
      /** 120 seeded Practice games at a fixed accuracy, half the right answers quick. Returns how many were lost, and the hearts a winner spent. */
      const many = (accuracy: number, script = MONSTER_MOVE_SCRIPT) => {
        let lost = 0;
        let heartsSpent = 0;
        const games = 120;
        for (let t = 0; t < games; t++) {
          let seed = 1000 + t * 7919;
          const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
          let g = runScript(NEW_MONSTER_SCRIPT, { style: 'gate', timed: false }).game;
          let n = 0;
          while (!g.over && n < 400) {
            const outcome = rand() < accuracy ? (rand() < 0.5 ? 'fluent' : 'correct') : 'wrong';
            g = runScript(script, { game: g, action: 'answer', outcome }).game;
            if (g.fresh) g = runScript(script, { game: g, action: 'next' }).game;
            n++;
          }
          if (g.over && g.won !== true) lost++;
          else heartsSpent += MONSTER.hearts - g.hearts;
        }
        return { lossPct: Math.round((100 * lost) / games), heartsSpent: heartsSpent / Math.max(1, games - lost) };
      };
      const guessing = many(0.4);
      const learning = many(0.75);
      // A child guessing loses the gate more often than not.
      expect(guessing.lossPct).toBeGreaterThan(40);
      // A child answering the way the selector aims for (~75%) wins — that is the pedagogy, not a bug…
      expect(learning.lossPct).toBeLessThan(10);
      // …but they no longer cruise: they spend hearts getting there, which is the "stakes" half of Richard's ask.
      expect(learning.heartsSpent).toBeGreaterThan(0.25);
      // 🔴 The arm that reproduces what he played: give a slow right answer the full knock-back, and the same
      // guessing child is close to safe while the learning child never loses a heart at all.
      const asShipped = MONSTER_MOVE_SCRIPT.replace('quick ? MONSTER.back.practice : 0', 'MONSTER.back.challenge');
      expect(asShipped).not.toBe(MONSTER_MOVE_SCRIPT);
      expect(many(0.4, asShipped).lossPct).toBeLessThan(guessing.lossPct);
      expect(many(0.75, asShipped).heartsSpent).toBeLessThan(learning.heartsSpent);
    });

    it('🔴 out of time it bangs the gate: a heart gone, and it backs off; the next question’s clock is the walk from where it stands (Challenge, the gate way only)', () => {
      const t = move(game({ timed: true, start: 0.5, pos: 0.5 }), 'timeout');
      expect([t.game.hearts, t.game.event, t.game.start, t.timeScale]).toEqual([2, 'bang', 1, 1]);
      expect([move(game({ timed: true }), 'wrong').timeScale, move(game({ timed: false }), 'wrong').timeScale]).toEqual([0.75, 1]);
      expect(move(game({ style: 'push', timed: true, pos: 0.5 }), 'wrong', { cpuGain: 0.05 }).timeScale).toBe(1);
    });

    it('🔴 ruling 7: three quick answers in a row give a heart back, up to three; a slow or wrong answer starts the run again', () => {
      const hurt = game({ hearts: 2, hp: 99 });
      const healed = answers(hurt, 'fluent', 'fluent', 'fluent');
      expect([healed.hearts, healed.healed, healed.streak]).toEqual([3, true, 0]);
      expect([draw(healed).note, draw(healed, 'fr').note]).toEqual(['A big hit! Three quick answers: a heart back!', 'Un grand coup ! Trois réponses rapides : un cœur de plus !']);
      expect(answers(hurt, 'fluent', 'correct', 'fluent', 'fluent').hearts).toBe(2);
      const full = answers(game({ hp: 99 }), 'fluent', 'fluent', 'fluent');
      expect([full.hearts, full.healed, full.streak]).toEqual([3, false, 0]);
    });

    it('🔴 three monsters beaten is a win, three hearts gone a loss, and nothing moves after either', () => {
      const won = answers(game({ beaten: 2, hp: 2 }), 'fluent');
      expect([won.over, won.won, won.beaten]).toEqual([true, true, 3]);
      const lost = answers(game({ hearts: 1, timed: true }), 'timeout');
      expect([lost.over, lost.won, lost.hearts]).toEqual([true, false, 0]);
      for (const g of [won, lost]) expect([move(g, 'fluent').changed, next(g).changed]).toEqual([false, false]);
      // Known-firing beside it: one monster or one heart earlier, the same answer ends nothing.
      expect([answers(game({ beaten: 1, hp: 2 }), 'fluent').over, answers(game({ hearts: 2, timed: true }), 'timeout').over]).toEqual([false, false]);
      // The game the node was given is never changed in place, and what is not an outcome changes nothing.
      const before = game();
      move(before, 'fluent');
      expect(before.hp).toBe(4);
      expect([move(game(), '').changed, move(game(), 'maybe').changed, runScript(MONSTER_MOVE_SCRIPT, { action: 'answer', outcome: 'fluent' }).changed]).toEqual([false, false, false]);
    });

    it('🔴 Push it back: a right answer pushes by twice the race’s gain and every answer it steps one and a half computer steps; into its cave it is beaten, at the gate a heart', () => {
      const p = (over: Record<string, unknown> = {}) => game({ style: 'push', pos: 0.5, ...over });
      const pushed = move(p(), 'fluent', { gain: RACE_STEP, cpuGain: 0.06 }).game;
      expect([pushed.pos, pushed.event]).toEqual([0.66, 'pushed']);
      const stepped = move(p(), 'wrong', { gain: 0, cpuGain: 0.06 }).game;
      expect([stepped.pos, stepped.event, stepped.hearts]).toEqual([0.41, 'stepped', 3]);
      const home = move(p({ pos: 0.9 }), 'fluent', { gain: RACE_STEP, cpuGain: 0.06 }).game;
      expect([home.beaten, home.fresh, home.event, home.pos]).toEqual([1, true, 'beaten', 0.5]);
      const gate = move(p({ pos: 0.05 }), 'timeout', { gain: 0, cpuGain: 0.06 }).game;
      expect([gate.hearts, gate.event, gate.pos]).toEqual([2, 'bang', 0.5]);
      expect(draw(pushed).pips).toBe('');
    });

    it('whole games end, and not forever: a child always quick wins both ways, a child always wrong loses both, at the rating’s extremes', () => {
      for (const style of ['gate', 'push']) {
        for (const timed of [false, true]) {
          // The computer rocket's step at its fastest (the strongest child): the hardest push.
          let quick = runScript(NEW_MONSTER_SCRIPT, { style, timed }).game;
          let n = 0;
          while (n < 60 && !quick.over) {
            quick = move(quick, 'fluent', { gain: RACE_STEP, cpuGain: RACE_STEP * 0.7 }).game;
            if (quick.fresh) quick = next(quick).game;
            n++;
          }
          expect({ style, timed, won: quick.won, answers: n }).toEqual({ style, timed, won: true, answers: style === 'gate' ? 6 : 15 });
          // At its slowest (the weakest child): the gentlest step.
          let wrong = runScript(NEW_MONSTER_SCRIPT, { style, timed }).game;
          let m = 0;
          while (m < 80 && !wrong.over) {
            wrong = move(wrong, 'wrong', { gain: 0, cpuGain: RACE_STEP * 0.35 }).game;
            m++;
          }
          expect({ style, timed, lost: wrong.over && !wrong.won, answers: m }).toEqual({ style, timed, lost: true, answers: style === 'gate' ? (timed ? 12 : 9) : 24 });
        }
      }
    });

    it('the lane is drawn from the game: hearts, which monster, its hits left, its look and its moves, where it stands, and where a Challenge walk starts', () => {
      const d0 = draw(game());
      expect([d0.hearts, d0.line, d0.pips, d0.look, d0.monsterClass, d0.laneClass, d0.rest, d0.walkFrom, d0.phase, d0.note]).toEqual(['❤️ ❤️ ❤️', 'Monster 1 of 3', '●●●●', 'horns', 'rkt-monster rkt-monster-horns', 'rkt-lane rkt-lane-gate', 1, 0, 'playing', 'It only moves when you get one wrong.']);
      const hit = move(game(), 'fluent').game;
      expect([draw(hit).pips, draw(hit).monsterClass, draw(hit).note]).toEqual(['●●○○', 'rkt-monster rkt-monster-horns rkt-monster-hit-b', 'A big hit!']);
      const crept = move(game({ timed: true }), 'wrong').game;
      expect([draw(crept).rest, draw(crept).walkFrom, draw(crept).monsterClass, draw(crept).note]).toEqual([0.75, 0.75, 'rkt-monster rkt-monster-horns rkt-monster-lunge-b', 'It creeps closer.']);
      const bang = move(game({ hearts: 2, timed: true }), 'timeout').game;
      expect([draw(bang).hearts, draw(bang).laneClass, draw(bang).rest, draw(bang).note]).toEqual(['❤️ 🤍 🤍', 'rkt-lane rkt-lane-gate rkt-bang-b', 1, 'Bang! It reached the gate: a heart gone.']);
      const beaten = answers(game({ hp: 2, timed: true }), 'fluent');
      expect([draw(beaten).line, draw(beaten).look, draw(beaten).pips, draw(beaten).monsterClass, draw(beaten).walkFrom, draw(beaten).rest, draw(beaten).note]).toEqual(['Monster 1 of 3', 'horns', '○○○○', 'rkt-monster rkt-monster-horns rkt-monster-gone', 0, 1, 'It runs away!']);
      const second = next(beaten).game;
      expect([draw(second).line, draw(second).look, draw(second).pips, draw(second).monsterClass, draw(second).walkFrom, draw(second).note]).toEqual(['Monster 2 of 3', 'eye', '●●●●', 'rkt-monster rkt-monster-eye rkt-monster-arrive-a', 1, 'Here comes the next one!']);
      expect(draw(next(answers(game({ beaten: 1, hp: 2 }), 'fluent')).game).look).toBe('spikes');
      const push = draw(game({ style: 'push', pos: 0.41 }));
      expect([push.rest, push.walkFrom, push.laneClass, push.pips, push.note]).toEqual([0.41, 0, 'rkt-lane rkt-lane-push', '', 'Push it back into its cave.']);
      const home = draw(move(game({ style: 'push', pos: 0.9 }), 'fluent', { gain: RACE_STEP, cpuGain: 0.06 }).game);
      expect([home.rest, home.note, home.monsterClass]).toEqual([1, 'Back into its cave!', 'rkt-monster rkt-monster-horns rkt-monster-gone']);
      const won = draw({ ...game(), beaten: 3, over: true, won: true, fresh: true });
      const lost = draw({ ...game(), hearts: 0, over: true, won: false, event: 'bang' });
      expect([won.phase, won.note, won.look, won.rest, lost.phase, lost.note, lost.rest, lost.hearts]).toEqual(['over', 'All three sent home!', 'spikes', 1, 'over', 'It got in!', 0, '🤍 🤍 🤍']);
      expect([draw(game(), 'fr').line, draw(game(), 'fr').note, draw(game({ timed: true }), 'fr').note, draw(game({ timed: true })).note]).toEqual(['Monstre 1 sur 3', 'Il n’avance que si tu te trompes.', 'Réponds avant qu’il n’atteigne la porte.', 'Answer before it reaches the gate.']);
      const empty = runScript(DRAW_MONSTER_SCRIPT, {});
      expect([empty.hearts, empty.line, empty.note, empty.pips, empty.phase, empty.rest, empty.walkFrom]).toEqual(['❤️ ❤️ ❤️', '', '', '', 'playing', 1, 0]);
    });

    it('🔴 a finished game pays a landing’s five once, win or lose; the card says the game’s whole take, answers included; a game left unfinished pays nothing', () => {
      expect(MONSTER_STAR_RULE).toEqual({ finish: STAR_RULE.finish });
      const tallied = { ...freshModel(), stars: 20, race: { id: 'm7', run: 0, bestRun: 0, rightStars: 9, levelStars: 10 } };
      const won = { id: 'm7', over: true, won: true, beaten: 3, right: 9 };
      const first = runScript(FINISH_MONSTER_SCRIPT, { model: tallied, game: won, lang: 'en' });
      expect([first.paid, first.starsEarned, first.stars, first.starsText, first.why, first.headline, first.line, first.won]).toEqual([true, 5, 25, '+24 ⭐', 'right answers +9 · new level +10 · game finished +5', 'The gate held!', '3 monsters sent home · 9 right', true]);
      const again = runScript(FINISH_MONSTER_SCRIPT, { model: first.model, game: won, lang: 'en' });
      expect([again.paid, again.stars, again.starsText]).toEqual([false, 25, '+24 ⭐']);
      const lost = runScript(FINISH_MONSTER_SCRIPT, { model: { ...freshModel(), race: { id: 'm8', rightStars: 1, levelStars: 0 } }, game: { id: 'm8', over: true, won: false, beaten: 2, right: 1 }, lang: 'fr' });
      expect([lost.paid, lost.starsText, lost.why, lost.headline, lost.line, lost.won]).toEqual([true, '+6 ⭐', 'bonnes réponses +1 · partie finie +5', 'Le monstre est entré !', 'Tu en as renvoyé 2 sur 3 · 1 bonne réponse', false]);
      const left = runScript(FINISH_MONSTER_SCRIPT, { model: { ...freshModel(), stars: 3 }, game: { id: 'm9', over: false }, lang: 'en' });
      expect([left.paid, left.stars, left.starsText, left.why]).toEqual([false, 3, '', '']);
      // Another game's tally is not this one's.
      expect(runScript(FINISH_MONSTER_SCRIPT, { model: { ...freshModel(), race: { id: 'r1', rightStars: 7, levelStars: 0 } }, game: { id: 'm10', over: true, won: true, beaten: 3, right: 7 }, lang: 'en' }).starsText).toBe('+5 ⭐');
      // RKT-011: a take of 24 reaching 25 crosses 15 and offers the pick; 6 reaching 5 crosses none.
      expect([first.earnedPick, lost.earnedPick]).toEqual([true, false]);
      // Its id is its own: a hunt paid under the same id does not stop the game paying.
      expect(runScript(FINISH_MONSTER_SCRIPT, { model: { ...freshModel(), lastHuntId: 'm7' }, game: won, lang: 'en' }).paid).toBe(true);
      // Sabotage arm: without the game id check, the second Finish pays again.
      const doctored = FINISH_MONSTER_SCRIPT.replace('model.lastMonsterId !== id', 'true');
      expect(doctored).not.toBe(FINISH_MONSTER_SCRIPT);
      expect(runScript(doctored, { model: first.model, game: won, lang: 'en' }).paid).toBe(true);
    });

    it('the grader says a hit or a push in Monster Gate and the race keeps its rocket words; the picker’s clock takes a scale in (0, 1] and ignores anything else', () => {
      const q = pick({ level: 'CE2' });
      const at = (game: string | undefined, typed: string, elapsed: number) => grade(q, typed, { game, elapsedOverride: elapsed });
      const quickMs = 100;
      const slowMs = q.fluentMs * 2;
      expect([at(undefined, q.answer, quickMs).boost, at(undefined, 'nope', quickMs).boost]).toEqual([expect.stringMatching(/full boost$/), 'No boost']);
      expect([at('gate', q.answer, quickMs).boost, at('gate', q.answer, quickMs).boostPct, at('gate', q.answer, slowMs).boost, at('gate', q.answer, slowMs).boostPct, at('gate', 'nope', quickMs).boost, at('gate', 'nope', quickMs).boostPct]).toEqual([expect.stringMatching(/^⚡ .+ · big hit$/), 100, expect.stringMatching(/ · small hit$/), 50, 'No hit', 0]);
      expect([at('push', q.answer, slowMs).boost, at('push', 'nope', quickMs).boost, grade(q, '', { game: 'push', timedOut: true, lang: 'fr' }).boost, grade(q, '', { timedOut: true, lang: 'fr' }).boost]).toEqual([expect.stringMatching(/ · push 50%$/), 'No push', 'Pas de poussée', 'Ta fusée ne bouge pas']);
      const base = pick({ level: 'CE2' });
      expect(base.limitMs).toBe(base.fluentMs * LIMIT_FACTOR);
      const scaled = pick({ level: 'CE2', limitScale: 0.25 });
      expect(scaled.limitMs).toBe(Math.round(scaled.fluentMs * LIMIT_FACTOR * 0.25));
      for (const junk of [0, -1, 2, 'x', undefined]) {
        const r = pick({ level: 'CE2', limitScale: junk });
        expect({ junk, limitMs: r.limitMs }).toEqual({ junk, limitMs: r.fluentMs * LIMIT_FACTOR });
      }
    });
  });

  describe('profiles in the store', () => {
    it('create, select, save a model, list, delete — and the cap of six', () => {
      let app: any = undefined;
      app = runScript(CREATE_PROFILE_SCRIPT, { app, name: 'Léa', look: 'thumbs', seed: 'Léa', level: 'CM1', lang: 'fr' }).app;
      app = runScript(CREATE_PROFILE_SCRIPT, { app, name: 'Sam', look: 'pixel-art', seed: 'Sam', level: 'CE2', lang: 'en' }).app;
      expect(app.profiles).toHaveLength(2);
      expect(app.activeId).toBe(app.profiles[1].id);
      expect(app.profiles[0].layout).toBe('azerty');
      expect(app.profiles[1].layout).toBe('qwerty');

      app = runScript(SELECT_PROFILE_SCRIPT, { app, profileId: app.profiles[0].id }).app;
      const active = runScript(ACTIVE_PROFILE_SCRIPT, { app });
      expect(active.name).toBe('Léa');
      expect(active.hasProfile).toBe(true);
      expect(active.lang).toBe('fr');
      expect(active.due).toBe(0);

      const model = { ...freshModel(), rating: 1111, answered: 3 };
      app = runScript(SAVE_MODEL_SCRIPT, { app, profileId: app.activeId, model }).app;
      const list = runScript(LIST_PROFILES_SCRIPT, { app });
      expect(list.count).toBe(2);
      expect(list.profiles[0].answered).toBe(3);
      expect(list.profiles[0].days7).toBe(1);
      expect(list.profiles[0].selected).toBe(true);
      expect(list.canAdd).toBe(true);

      for (let i = 0; i < 10; i++) app = runScript(CREATE_PROFILE_SCRIPT, { app, name: `Kid ${i}` }).app;
      expect(app.profiles).toHaveLength(MAX_PROFILES);
      expect(runScript(LIST_PROFILES_SCRIPT, { app }).canAdd).toBe(false);

      app = runScript(DELETE_PROFILE_SCRIPT, { app, profileId: app.profiles[0].id }).app;
      expect(app.profiles).toHaveLength(MAX_PROFILES - 1);
      expect(app.profiles.some((p: Profile) => p.name === 'Léa')).toBe(false);
    });

    it('🔴 RKT-008 AC1: Update settings renames under Create’s rules (trimmed, 24 characters), and an empty name is refused', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa', look: 'thumbs', seed: 'Léa', level: 'CM1', lang: 'fr' }).app;
      app = runScript(CREATE_PROFILE_SCRIPT, { app, name: 'Sam', level: 'CE2', lang: 'en' }).app;
      const lea = app.profiles[0].id;
      const rename = (a: any, name: unknown, script = UPDATE_SETTINGS_SCRIPT) => runScript(script, { app: a, profileId: lea, name }).app;
      const next = rename(app, '  Zoé  ');
      expect(next.profiles[0].name).toBe('Zoé');
      expect(rename(app, 'Maximilienne-Alexandrine Dupont').profiles[0].name).toBe('Maximilienne-Alexandrine');
      // A form that was never typed in sends nothing, and a cleared box sends blanks: either way the name stays.
      for (const blank of ['', '   ', undefined, null]) expect(rename(app, blank).profiles[0].name).toBe('Léa');
      // Only that player, and only the name: Sam and the rest of Léa are as they were.
      expect(next.profiles[1]).toEqual(app.profiles[1]);
      expect({ ...next.profiles[0], name: 'Léa' }).toEqual(app.profiles[0]);
      // Sabotage: without the trim and the empty check, a blank box renames Léa to spaces.
      const sabotaged = UPDATE_SETTINGS_SCRIPT.replace(/var name = .*\n/, 'var name = String(Inputs.name);\n');
      expect(sabotaged).not.toBe(UPDATE_SETTINGS_SCRIPT);
      expect(rename(app, '   ', sabotaged).profiles[0].name).not.toBe('Léa');
    });

    it('RKT-008: the menu’s sound pills write the profile’s true/false, and Active profile says which pill is on', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa', lang: 'fr' }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).soundMode).toBe('on');
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, soundMode: 'off' }).app;
      expect(app.profiles[0].sound).toBe(false);
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).soundMode).toBe('off');
      expect(runScript(UPDATE_SETTINGS_SCRIPT, { app, soundMode: 'loud' }).app.profiles[0].sound).toBe(false);
      expect(runScript(UPDATE_SETTINGS_SCRIPT, { app, soundMode: 'on' }).app.profiles[0].sound).toBe(true);
    });

    it('🔴 RKT-008 AC7: a keyboard a key press reports is stored once, and never over one the child picked', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Sam', lang: 'en' }).app;
      expect(app.profiles[0].layout).toBe('qwerty');
      const seen = (a: any, layoutSeen: string, script = UPDATE_SETTINGS_SCRIPT) => runScript(script, { app: a, layoutSeen }).app;
      // An English player on a French keyboard: one telling key, and the profile is AZERTY, still unpicked.
      app = seen(app, 'azerty');
      expect([app.profiles[0].layout, app.profiles[0].layoutPicked]).toEqual(['azerty', undefined]);
      // The same keyboard again writes nothing new.
      expect(seen(app, 'azerty')).toEqual(app);
      // The child picks UK beside the map: kept, and no later key press undoes it (UK and US are one QWERTY to a key press).
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, layout: 'qwerty-uk' }).app;
      expect([app.profiles[0].layout, app.profiles[0].layoutPicked]).toEqual(['qwerty-uk', true]);
      expect(seen(app, 'azerty').profiles[0].layout).toBe('qwerty-uk');
      expect(seen(app, 'qwerty').profiles[0].layout).toBe('qwerty-uk');
      // Sabotage: without the picked check, one key press undoes the child's choice.
      const sabotaged = UPDATE_SETTINGS_SCRIPT.replace('app.profiles[i].layoutPicked !== true && ', '');
      expect(sabotaged).not.toBe(UPDATE_SETTINGS_SCRIPT);
      expect(seen(app, 'azerty', sabotaged).profiles[0].layout).toBe('azerty');
    });

    it('with no profile, the active profile is an honest empty', () => {
      const a = runScript(ACTIVE_PROFILE_SCRIPT, { app: null });
      expect(a.hasProfile).toBe(false);
      expect(a.profileId).toBe('');
    });

    it('🔴 a save code round-trips a profile and its skills, and a bad code is refused without touching the store', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa', look: 'thumbs', seed: 'Léa', level: 'CM1', lang: 'fr' }).app;
      const model = { rating: 1120, answered: 9, lastSkill: 'table-7', skills: { 'table-7': { d: 905, n: 9, streak: 4, miss: 0, last: [1, 1], hl: 4, due: Date.now() + 86400000 * 4, m: 2, best: 1400, fluentRun: 3 } } };
      app = runScript(SAVE_MODEL_SCRIPT, { app, model }).app;
      const enc = runScript(ENCODE_SAVE_SCRIPT, { app });
      expect(enc.code).toMatch(/^RS1\.[A-Za-z0-9_-]+$/);
      expect(enc.length).toBeLessThan(400);

      let other: any = { profiles: [], activeId: '', sets: [] };
      const dec = runScript(DECODE_SAVE_SCRIPT, { app: other, code: enc.code });
      expect(dec.ok).toBe(true);
      const back = runScript(ACTIVE_PROFILE_SCRIPT, { app: dec.app });
      expect(back.name).toBe('Léa');
      expect(back.level).toBe('CM1');
      expect(back.lang).toBe('fr');
      expect(back.layout).toBe('azerty');
      expect(back.model.rating).toBe(1120);
      expect(back.model.answered).toBe(9);
      expect(back.model.skills['table-7'].m).toBe(2);
      expect(back.model.skills['table-7'].hl).toBe(4);
      expect(Math.abs(back.model.skills['table-7'].due - model.skills['table-7'].due)).toBeLessThan(3600000);

      const bad = runScript(DECODE_SAVE_SCRIPT, { app: other, code: 'RS1.notacode' });
      expect(bad.ok).toBe(false);
      expect(bad.error).toBe('bad');
      expect(bad.app.profiles).toHaveLength(0);
    });

    it('question sets: parse rows or JSON, save, list, and serve', () => {
      const parsed = runScript(PARSE_SET_SCRIPT, { json: '[{"q":"2+2","a":"4"},["3+3","6",["5","6"]]]' });
      expect(parsed.valid).toBe(true);
      expect(parsed.items).toEqual([{ q: '2+2', a: '4' }, { q: '3+3', a: '6', opts: ['5', '6'] }]);
      expect(runScript(PARSE_SET_SCRIPT, { json: 'not json' }).valid).toBe(false);
      expect(runScript(PARSE_SET_SCRIPT, { rows: [{ q: ' a ', a: ' b ' }, { q: '', a: 'x' }] }).items).toEqual([{ q: 'a', a: 'b' }]);

      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa' }).app;
      const saved = runScript(UPSERT_SET_SCRIPT, { app, name: 'Capitals', items: parsed.items });
      app = saved.app;
      const list = runScript(LIST_SETS_SCRIPT, { app, setId: saved.setId });
      expect(list.count).toBe(1);
      expect(list.chosenName).toBe('Capitals');
      expect(list.chosenItems).toHaveLength(2);
      const q = pick({ mode: 'custom', customSet: list.chosenItems });
      expect(['2+2', '3+3']).toContain(q.prompt);
    });
  });

  describe('words and cards', () => {
    it('translate publishes every word key as an output, in the chosen language', () => {
      const en = runScript(TRANSLATE_SCRIPT, { lang: 'en', words: WORD_ROWS });
      const fr = runScript(TRANSLATE_SCRIPT, { lang: 'fr', words: WORD_ROWS });
      expect(en.gameRace).toBe('Rocket Race');
      expect(fr.gameRace).toBe('Course de fusées');
      expect(fr.isFr).toBe(true);
      for (const key of WORD_KEYS) {
        expect(typeof en[key]).toBe('string');
        expect(en[key].length).toBeGreaterThan(0);
      }
      const ports = portsOf(TRANSLATE_SCRIPT).outputs;
      for (const key of WORD_KEYS) expect(ports).toContain(key);
    });

    it('a Teach card fades: step 0 says the most, step 2 the least', () => {
      const s0 = runScript(TEACH_CARD_SCRIPT, { cards: TEACH_CARDS, teachId: 'place-value', lang: 'fr', step: 0 });
      const s2 = runScript(TEACH_CARD_SCRIPT, { cards: TEACH_CARDS, teachId: 'place-value', lang: 'fr', step: 2 });
      expect(s0.found).toBe(true);
      expect(s0.isFaded).toBe(false);
      expect(s2.isFaded).toBe(true);
      expect(s2.text.length).toBeLessThan(s0.text.length);
      expect(s0.example).toContain('230 000 000');
      expect(runScript(TEACH_CARD_SCRIPT, { cards: TEACH_CARDS, teachId: 'nope', lang: 'en', step: 0 }).found).toBe(false);
    });
  });

  describe('RKT-004 — the correction works through the question that was asked', () => {
    const flat = (text: string) => text.replace(/[\s  ]/g, '');
    // P113: the maths subject only — a French form, a word or a date has no numbers to work through and no numeric pad (graded in the P113 block).
    const MATHS = CURRICULUM.filter((skill) => skill.subject === 'maths');

    /** For each maths skill, the first question whose worked line is empty, leaves out a number of the prompt, or never shows the answer. */
    const workedGaps = (script: string): string[] => {
      const out = new Map<string, string>();
      for (const skill of MATHS) {
        for (let i = 0; i < 40 && !out.has(skill.id); i++) {
          const lang = i % 2 ? 'fr' : 'en';
          const q = runScript(script, { curriculum: [skill], model: freshModel(), level: skill.level, lang, layout: 'qwerty', mode: 'maths', answerMode: 'auto', wordLists: WORD_LIST_ROWS, nonce: 1 });
          const worked = flat(String(q.worked || ''));
          const answered = worked.includes(flat(q.answer)) || worked.includes(flat(helper<string>('fmtNum', Number(q.answer), lang)));
          const left = (flat(q.prompt).match(/\d+/g) ?? []).filter((digits) => !worked.includes(digits));
          if (!worked || !answered || left.length) out.set(skill.id, `${skill.id} (${lang}): "${q.prompt}" → "${q.worked}"`);
        }
      }
      return [...out.values()];
    };

    it('🔴 every maths skill works its own numbers through to the answer (40 questions each, EN and FR)', () => {
      expect(workedGaps(PICK_QUESTION_SCRIPT)).toEqual([]);
    });

    it('sabotage arm: a picker that drops the worked line has every maths skill named', () => {
      const bare = PICK_QUESTION_SCRIPT.replace("Outputs.worked = String(q.worked || '')", "Outputs.worked = String('')");
      expect(bare).not.toBe(PICK_QUESTION_SCRIPT);
      expect(workedGaps(bare)).toHaveLength(MATHS.length);
    });

    it('the correction says the worked line, never the skill’s fixed example; a typing tip is said as before', () => {
      const bridge = CURRICULUM.find((skill) => skill.id === 'add-bridge')!;
      const q = pick({ curriculum: [bridge], level: 'CE2', lang: 'fr' });
      const graded = grade(q, '1', { lang: 'fr', worked: q.worked });
      expect(graded.message).toBe(`Tu as répondu 1. La réponse était ${q.answer}. ${q.worked}`);
      expect(graded.message).not.toContain(q.strategy);
      // An equals sign never ends a line: it is held to both neighbours with no-break spaces.
      expect(q.worked).not.toMatch(/ =|= /);
      expect(q.worked).toContain('\u00a0=\u00a0');
      const typing = CURRICULUM.find((skill) => skill.strand === 'typing')!;
      const t = pick({ curriculum: [typing], level: typing.level, mode: 'typing' });
      expect(t.worked).toBe('');
      expect(grade(t, 'zzz', { worked: t.worked }).message).toBe(`You answered zzz. The answer was ${t.answer}.` + (t.strategy ? ` ${t.strategy}` : ''));
    });

    it('a decimal is rounded half up, so the worked line’s “5 or more, so up” agrees with the answer', () => {
      const skill = CURRICULUM.find((s) => s.id === 'round-dec')!;
      for (let i = 0; i < 300; i++) {
        const q = pick({ curriculum: [skill], level: skill.level, lang: 'en' });
        const m = q.prompt.match(/^Round (\d+(?:\.\d+)?) to the nearest (whole|tenth)$/);
        expect({ prompt: q.prompt, parsed: !!m }).toEqual({ prompt: q.prompt, parsed: true });
        const cents = Math.round(Number(m![1]) * 100);
        const expected = m![2] === 'whole' ? Math.floor((cents + 50) / 100) : Math.floor((cents + 5) / 10) / 10;
        expect({ prompt: q.prompt, answer: Number(q.answer) }).toEqual({ prompt: q.prompt, answer: expected });
      }
    });

    it('🔴 the stage drive’s worst-case correction is still at least as long as the longest real one (RKT-003 foldWorst)', () => {
      const drive = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'devtools', 'drive-rkt003-stage.js'), 'utf8');
      for (const lang of ['fr', 'en'] as const) {
        const worst = drive.match(new RegExp(`${lang}: \\{\\s*prompt: '[^']*',\\s*message: '([^']*)'`))![1];
        let longest = '';
        for (const skill of CURRICULUM) {
          for (let i = 0; i < 40; i++) {
            const q = pick({ curriculum: [skill], level: skill.level, lang, mode: String(skill.subject) });
            // RKT-005: the correction now starts with the child's own answer, cut at twelve characters — so the longest one is a long entry.
            const message = String(grade(q, 'x'.repeat(40), { lang, worked: q.worked }).message);
            if (message.length > longest.length) longest = message;
          }
        }
        expect({ lang, longest, fits: longest.length <= worst.length }).toEqual({ lang, longest, fits: true });
      }
    });
  });

  describe('RKT-005 — the answer pad’s keys, and a correction in the child’s own terms', () => {
    // P113: the maths subject only — a French form, a word or a date has no numbers to work through and no numeric pad (graded in the P113 block).
    const MATHS = CURRICULUM.filter((skill) => skill.subject === 'maths');
    const TYPING = CURRICULUM.filter((skill) => skill.strand === 'typing');
    /** The accents in a word list, by the picker's own rule: a letter with a capital that is not a–z. */
    const accentsOf = (words: ReadonlyArray<string>) =>
      [...new Set(words.join('').toLowerCase().split('').filter((c) => c !== c.toUpperCase() && !/[a-z]/.test(c)))].sort().join('');

    it('🔴 AC4: a French typing question’s strip is exactly the accents its word list uses; English has none', () => {
      expect(accentsOf(WORD_LISTS.fr)).toBe('âèéê');
      for (const skill of TYPING) {
        const fr = pick({ curriculum: [skill], level: skill.level, lang: 'fr', layout: 'azerty', mode: 'typing' });
        const en = pick({ curriculum: [skill], level: skill.level, lang: 'en', mode: 'typing' });
        expect({ skill: skill.id, fr: [fr.padKeys, fr.padNumeric], en: [en.padKeys, en.padNumeric] }).toEqual({ skill: skill.id, fr: [accentsOf(WORD_LISTS.fr), false], en: ['', false] });
      }
    });

    it('AC4 sabotage arm: a French word with ÿ grows the strip by exactly ÿ', () => {
      const skill = CURRICULUM.find((s) => s.id === 'type-words-short')!;
      const lists = [{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: [...WORD_LISTS.fr, 'ÿack'] }];
      const q = pick({ curriculum: [skill], level: skill.level, lang: 'fr', mode: 'typing', wordLists: lists });
      expect(q.padKeys).toBe(accentsOf([...WORD_LISTS.fr, 'ÿ']));
      expect(q.padKeys.length).toBe(accentsOf(WORD_LISTS.fr).length + 1);
    });

    /** Skills with a typed answer the pad cannot enter, or that does not grade right once entered; and the decimal skills seen. */
    const padGaps = (script: string) => {
      const gaps = new Map<string, string>();
      const decimals = new Set<string>();
      for (const skill of MATHS) {
        for (let i = 0; i < 60; i++) {
          const lang = i % 2 ? 'fr' : 'en';
          const q = runScript(script, { curriculum: [skill], model: freshModel(), level: skill.level, lang, layout: 'qwerty', mode: 'maths', answerMode: 'typed', wordLists: WORD_LIST_ROWS, nonce: 1 });
          if (q.kind !== 'typed') continue;
          const entry = lang === 'fr' ? String(q.answer).replace('.', ',') : String(q.answer);
          if (/[.,]/.test(entry)) decimals.add(`${skill.id} (${lang})`);
          const missing = [...entry].filter((c) => !String(q.padKeys).includes(c));
          const right = grade(q, entry, { lang }).correct;
          if (!q.padNumeric || missing.length || !right) gaps.set(skill.id, `${skill.id} (${lang}): answer ${q.answer}, keys "${q.padKeys}", numeric ${q.padNumeric}, missing "${missing.join('')}", graded right ${right}`);
        }
      }
      return { gaps: [...gaps.values()], decimals: [...decimals].sort() };
    };

    it('🔴 AC1/AC3: every typed maths answer can be entered from its pad, and grades right as entered (60 questions a skill, EN and FR)', () => {
      const { gaps, decimals } = padGaps(PICK_QUESTION_SCRIPT);
      expect(gaps).toEqual([]);
      // The known-firing signal beside the absence: decimal answers were among them, in both languages.
      expect(decimals.some((d) => d.endsWith('(fr)')) && decimals.some((d) => d.endsWith('(en)'))).toBe(true);
      const q = pick({ curriculum: [CURRICULUM.find((s) => s.id === 'add-to-20')!], level: 'CE2', lang: 'fr' });
      expect([q.padKeys, pick({ curriculum: [CURRICULUM.find((s) => s.id === 'add-to-20')!], level: 'CE2', lang: 'en' }).padKeys]).toEqual(['1234567890,', '1234567890.']);
    });

    it('AC3 sabotage arm: a French pad given the English decimal point names every skill with a French decimal answer', () => {
      const bare = PICK_QUESTION_SCRIPT.replace("'1234567890' + (isFr(lang) ? ',' : '.')", "'1234567890' + '.'");
      expect(bare).not.toBe(PICK_QUESTION_SCRIPT);
      const frDecimalSkills = padGaps(PICK_QUESTION_SCRIPT).decimals.filter((d) => d.endsWith('(fr)')).map((d) => d.split(' ')[0]);
      const named = padGaps(bare).gaps.map((g) => g.split(' ')[0]);
      expect(frDecimalSkills.length).toBeGreaterThan(0);
      expect(named.sort()).toEqual([...new Set(frDecimalSkills)].sort());
    });

    it('🔴 a French correction writes its decimal the way the French pad does, after the child’s own answer', () => {
      const skill = CURRICULUM.find((s) => s.id === 'dec-pow10')!;
      const decimalQuestion = (lang: string) => {
        for (let i = 0; i < 400; i++) {
          const q = pick({ curriculum: [skill], level: skill.level, lang });
          if (/^\d{1,3}\.\d+$/.test(q.answer)) return q;
        }
        throw new Error(`no decimal ${lang} question in 400 draws`);
      };
      const fr = decimalQuestion('fr');
      expect(grade(fr, '98765', { lang: 'fr', worked: fr.worked }).message).toBe(`Tu as répondu 98765. La réponse était ${fr.answer.replace('.', ',')}. ${fr.worked}`);
      const en = decimalQuestion('en');
      expect(grade(en, '98765', { lang: 'en', worked: en.worked }).message).toBe(`You answered 98765. The answer was ${en.answer}. ${en.worked}`);
      // An option's value carries a dot; said to a French child, it wears a comma.
      expect(grade(fr, '2.5', { lang: 'fr' }).message.startsWith('Tu as répondu 2,5. ')).toBe(true);
    });

    it('a timeout says no answer of the child’s; a long entry is cut to twelve characters; a big answer is grouped', () => {
      const add = pick({ curriculum: [CURRICULUM.find((s) => s.id === 'add-to-20')!], level: 'CE2', lang: 'en' });
      expect(grade(add, '12', { lang: 'en', timedOut: true }).message.startsWith('The answer was ')).toBe(true);
      expect(grade(add, 'x'.repeat(40), { lang: 'en' }).message.startsWith(`You answered ${'x'.repeat(11)}…. `)).toBe(true);
      const big = pick({ curriculum: [CURRICULUM.find((s) => s.id === 'big-999999999')!], level: 'CM2', lang: 'fr' });
      expect(grade(big, '1', { lang: 'fr' }).message).toContain(`La réponse était ${helper<string>('fmtNum', Number(big.answer), 'fr')}.`);
    });
  });

  describe('RKT-007 — the boost the child is shown is the speed that moved the rocket', () => {
    /** Every way the line, the speed and the gain disagree, over a sweep of answer times, in both languages. */
    function disagreements(script: string): string[] {
      const out: string[] = [];
      for (const lang of ['en', 'fr']) {
        const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2', lang });
        const f = Number(q.fluentMs);
        for (const elapsed of [400, f * 0.9, f, f + 1, f * 1.2, f * 1.5, f * 1.8, f * 2, f * 2.5, f * 4]) {
          const g = runScript(script, { model: freshModel(), skillId: q.skillId, answer: q.answer, typed: q.answer, shownAt: Date.now(), fluentMs: f, itemDiff: q.itemDiff, level: 'CE2', lang, strategy: q.strategy, timedOut: false, elapsedOverride: elapsed });
          const said = String(g.boost);
          const pct = said.match(/(\d+)\s?%/);
          const shown = g.fluent ? (said.includes(lang === 'fr' ? 'turbo à fond' : 'full boost') ? 100 : NaN) : pct ? Number(pct[1]) : NaN;
          const tag = `${lang} ${Math.round(elapsed)} ms: "${said}", speed ${g.speed}, gain ${g.gain}`;
          if (shown !== Math.round(g.speed * 100)) out.push(`${tag} — the line says ${shown}%`);
          if (g.boostPct !== Math.round(g.speed * 100)) out.push(`${tag} — the meter says ${g.boostPct}%`);
          if (Math.abs(g.gain - RACE_STEP * g.speed) > 0.001) out.push(`${tag} — the rocket moved ${g.gain}, not ${RACE_STEP} × speed`);
          if (!(g.speed >= 0.5 && g.speed <= 1)) out.push(`${tag} — speed is outside 0.5–1`);
        }
      }
      return out;
    }

    it('🔴 AC1: over every answer time, the percentage said is the grader’s speed, and the rocket moved one step × that speed', () => {
      expect(disagreements(GRADE_ANSWER_SCRIPT)).toEqual([]);
    });

    it('sabotage arm: the line works out its own percentage (a second formula), and the gate names the times it lies', () => {
      const sabotaged = GRADE_ANSWER_SCRIPT.replace('var boostPct = Math.round(speed * 100);', 'var boostPct = Math.round(Math.max(0.5, 1 - (elapsed - fluentMs) / (3 * fluentMs)) * 100);');
      expect(sabotaged).not.toBe(GRADE_ANSWER_SCRIPT);
      expect(disagreements(sabotaged).length).toBeGreaterThan(0);
    });

    it('sabotage arm: the rocket moves by a formula of its own, and the gate names it', () => {
      // PLY-006 added the comeback multipliers to this one formula; the arm still replaces the WHOLE of it.
      const sabotaged = GRADE_ANSWER_SCRIPT.replace(`var gain = correct ? ${RACE_STEP} * speed * slip * turboMult : 0;`, `var gain = correct ? ${RACE_STEP} * (elapsed <= fluentMs ? 1 : 0.5) : 0;`);
      expect(sabotaged).not.toBe(GRADE_ANSWER_SCRIPT);
      expect(disagreements(sabotaged).length).toBeGreaterThan(0);
    });

    it('the four lines, in both languages: seconds with the local decimal mark, and nothing for speed when the answer earned nothing', () => {
      const q = pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
      const f = Number(q.fluentMs);
      const line = (lang: string, typed: string, extra: Record<string, unknown>) => grade(q, typed, { lang, ...extra });
      expect(line('fr', q.answer, { elapsedOverride: 2140 }).boost).toBe('⚡ 2,1 s · turbo à fond');
      expect(line('en', q.answer, { elapsedOverride: 2140 }).boost).toBe('⚡ 2.1 s · full boost');
      const slow = line('fr', q.answer, { elapsedOverride: f * 1.5 });
      expect(slow.boost).toBe(`${String(Math.round(f * 1.5 / 100) / 10).replace('.', ',')} s · turbo 75 %`);
      expect(slow.speed).toBe(0.75);
      const wrong = line('en', 'nope', { elapsedOverride: 500 });
      expect([wrong.boost, wrong.speed, wrong.gain, wrong.boostPct]).toEqual(['No boost', 0, 0, 0]);
      const late = line('fr', q.answer, { timedOut: true });
      expect([late.boost, late.speed, late.gain, late.boostPct]).toEqual(['Ta fusée ne bouge pas', 0, 0, 0]);
    });
  });

  describe('RKT-010 — stars that add up', () => {
    const fresh = () => freshModel();
    /** One answer, graded the way Race/Round grades it: right fast, right slow, wrong, or out of time. */
    const answerOn = (model: any, skillId: string, how: 'fluent' | 'slow' | 'wrong' | 'timeout', extra: Record<string, unknown> = {}, script = GRADE_ANSWER_SCRIPT) =>
      runScript(script, { model, skillId, answer: '42', typed: how === 'wrong' ? '41' : '42', shownAt: Date.now(), fluentMs: 4000, itemDiff: 1000, level: 'CE2', lang: 'en', timedOut: how === 'timeout', elapsedOverride: how === 'slow' ? 7000 : 800, raceId: 'r1', ...extra });
    /** A race of right (1) and wrong (0) answers under one id, each on a skill of its own (so no mastery moves), then Finished. */
    const race = (model: any, raceId: string, pattern: number[], timed: boolean, grade: string, finish: string) => {
      let m = model;
      pattern.forEach((right, i) => (m = answerOn(m, `${raceId}-${i}`, right ? 'fluent' : 'wrong', { raceId }, grade).model));
      return runScript(finish, { model: m, raceId, timed, lang: 'en' });
    };

    /** Every row of RKT-010 §3.1 the scripts disagree with, by name. */
    function table(grade = GRADE_ANSWER_SCRIPT, finish = FINISH_RACE_SCRIPT): string[] {
      const out: string[] = [];
      const said = (row: string, got: unknown, want: unknown) => {
        if (JSON.stringify(got) !== JSON.stringify(want)) out.push(`${row}: ${JSON.stringify(got)}, not ${JSON.stringify(want)}`);
      };
      said('a fluent right answer', answerOn(fresh(), 'a', 'fluent', {}, grade).starsEarned, STAR_RULE.right);
      said('a slow right answer pays the same as a fluent one', answerOn(fresh(), 'a', 'slow', {}, grade).starsEarned, STAR_RULE.right);
      said('a wrong answer', answerOn(fresh(), 'a', 'wrong', {}, grade).starsEarned, 0);
      said('a timeout', answerOn(fresh(), 'a', 'timeout', {}, grade).starsEarned, 0);
      said('player two’s right answer', answerOn(fresh(), 'a', 'fluent', { forB: true }, grade).starsEarned, 0);
      let m: any = fresh();
      const paid: number[] = [];
      for (let i = 0; i < 5; i++) {
        const g = answerOn(m, 'a', 'fluent', {}, grade);
        paid.push(g.starsEarned);
        m = g.model;
      }
      said('five fluent answers: the fifth makes the skill familiar and pays the level', { paid, mastery: m.skills.a.m }, { paid: [1, 1, 1, 1, 1 + STAR_RULE.level], mastery: 1 });
      const first = race(fresh(), 'race1', [1, 1, 1, 0], false, grade, finish);
      said('a landing pays, and the first race sets the record without paying for it', { earned: first.starsEarned, best: first.model.bests.practice, newBest: first.newBest }, { earned: STAR_RULE.finish, best: 3, newBest: false });
      const second = race(first.model, 'race2', [1, 1, 1, 1, 0], false, grade, finish);
      said('a longer run in a row is a new best', { earned: second.starsEarned, best: second.model.bests.practice, newBest: second.newBest }, { earned: STAR_RULE.finish + STAR_RULE.best, best: 4, newBest: true });
      const third = race(second.model, 'race3', [1, 0, 1, 0], false, grade, finish);
      said('a shorter run pays the landing only', { earned: third.starsEarned, best: third.model.bests.practice }, { earned: STAR_RULE.finish, best: 4 });
      const defi = race(third.model, 'race4', [1, 1, 1, 1, 1, 1], true, grade, finish);
      said('Défi keeps a record of its own, set without pay by its first race', { earned: defi.starsEarned, bests: defi.model.bests }, { earned: STAR_RULE.finish, bests: { practice: 4, defi: 6 } });
      const take = 4 * STAR_RULE.right + STAR_RULE.finish + STAR_RULE.best;
      said('the race says its whole take', { total: second.raceStars, text: second.starsText, why: second.why }, { total: take, text: `+${take} ⭐`, why: 'New best! · right answers +4 · landed +5 · new best +5' });
      // A win and a loss pay the same landing because the script is never told which it was.
      said('the landing reads nothing about who won', portsOf(finish).inputs.filter((i) => /win|won|lost|lose/i.test(i)), []);
      return out;
    }

    it('🔴 AC2: every row of the earning table holds', () => {
      expect(table()).toEqual([]);
    });

    it.each([
      ['a slow answer pays less', 'grade', 'var rightStars = correct ? STAR_RULE.right : 0;', 'var rightStars = fluent ? STAR_RULE.right : 0;', 'a slow right answer pays the same'],
      ['a timeout pays', 'grade', 'var rightStars = correct ? STAR_RULE.right : 0;', 'var rightStars = (correct || timedOut) ? STAR_RULE.right : 0;', 'a timeout'],
      ['a loss pays a smaller landing', 'finish', 'race.finishStars = STAR_RULE.finish;', 'race.finishStars = Inputs.won === true ? STAR_RULE.finish : 2;', 'the landing reads nothing about who won'],
      ['the first race pays a record', 'finish', "if (typeof had !== 'number') model.bests[mode] = race.bestRun;", "if (typeof had !== 'number') { model.bests[mode] = race.bestRun; race.bestStars = STAR_RULE.best; }", 'the first race sets the record without paying']
    ])('AC2 sabotage arm: %s, and the gate names the row', (_what, which, from, to, row) => {
      const grade = which === 'grade' ? GRADE_ANSWER_SCRIPT.replace(from, to) : GRADE_ANSWER_SCRIPT;
      const finish = which === 'finish' ? FINISH_RACE_SCRIPT.replace(from, to) : FINISH_RACE_SCRIPT;
      expect(grade + finish).not.toBe(GRADE_ANSWER_SCRIPT + FINISH_RACE_SCRIPT);
      expect(table(grade, finish).join('\n')).toContain(row);
    });

    /** 1,000 seeded answers over three skills, a third of them wrong, so mastery rises, falls and rises again. */
    function monotonic(script: string) {
      let seed = 20260913;
      const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
      let model: any = fresh();
      let before = 0;
      const drops: string[] = [];
      const levelPaid: Record<string, number> = {};
      const highest: Record<string, number> = {};
      let repromotions = 0;
      for (let i = 0; i < 1000; i++) {
        const skill = `s${Math.floor(rand() * 3)}`;
        const was = model.skills[skill]?.m ?? 0;
        const how = rand() < 1 / 3 ? 'wrong' : 'fluent';
        const g = answerOn(model, skill, how, { wasDue: rand() < 0.5, raceId: `r${Math.floor(i / 12)}` }, script);
        if (g.stars < before) drops.push(`answer ${i}: ${before} → ${g.stars}`);
        before = g.stars;
        const now = g.model.skills[skill].m;
        levelPaid[skill] = (levelPaid[skill] ?? 0) + g.starsEarned - (how === 'fluent' ? STAR_RULE.right : 0);
        if (now > was && now <= (highest[skill] ?? 0)) repromotions++;
        highest[skill] = Math.max(highest[skill] ?? 0, now);
        model = g.model;
      }
      const overpaid = Object.keys(levelPaid).filter((s) => levelPaid[s] !== STAR_RULE.level * highest[s]).map((s) => `${s}: paid ${levelPaid[s]} for a highest level of ${highest[s]}`);
      return { drops, overpaid, repromotions, highest };
    }

    it('🔴 AC3: over 1,000 seeded answers the total never drops, and each level of each skill is paid once however often it is re-reached', () => {
      const run = monotonic(GRADE_ANSWER_SCRIPT);
      expect({ drops: run.drops, overpaid: run.overpaid }).toEqual({ drops: [], overpaid: [] });
      // Known-firing: the run really did demote and re-promote, and reached past the first level, so "paid once" was tested.
      expect(run.repromotions).toBeGreaterThan(0);
      expect(Math.max(...Object.values(run.highest))).toBeGreaterThanOrEqual(2);
    });

    it('AC3 sabotage arm: a demotion lowers the paid level, so a re-promotion pays again, and the gate names the skill', () => {
      const sabotaged = GRADE_ANSWER_SCRIPT.replace('if (st.miss >= 2 && m > 0) m -= 1;', 'if (st.miss >= 2 && m > 0) { m -= 1; st.paid = m; }');
      expect(sabotaged).not.toBe(GRADE_ANSWER_SCRIPT);
      expect(monotonic(sabotaged).overpaid.length).toBeGreaterThan(0);
    });

    it('🔴 AC4: the same graded model saved twice, and the same race finished twice, each pay once', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa', lang: 'fr' }).app;
      const g = answerOn(fresh(), 'a', 'fluent', { raceId: 'r9' });
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: g.model }).app;
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: g.model }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).stars).toBe(STAR_RULE.right);
      const once = runScript(FINISH_RACE_SCRIPT, { model: g.model, raceId: 'r9', timed: false, lang: 'fr' });
      const twice = runScript(FINISH_RACE_SCRIPT, { model: once.model, raceId: 'r9', timed: false, lang: 'fr' });
      const take = STAR_RULE.right + STAR_RULE.finish;
      expect([once.starsEarned, twice.starsEarned, twice.stars, twice.raceStars, twice.starsText, twice.why]).toEqual([STAR_RULE.finish, 0, take, take, `+${take} ⭐`, 'bonnes réponses +1 · arrivée +5']);
      // A race with no id (a mint that never ran) pays no landing, rather than one for every Finished.
      expect(runScript(FINISH_RACE_SCRIPT, { model: g.model, raceId: '', timed: false }).starsEarned).toBe(0);
      // Sabotage: a landing added at save time pays twice when the same model is saved twice.
      const addsAtSave = SAVE_MODEL_SCRIPT.replace('if (model) app.profiles[i].model = model;', 'if (model) { model.stars = (model.stars || 0) + 5; app.profiles[i].model = model; }');
      expect(addsAtSave).not.toBe(SAVE_MODEL_SCRIPT);
      let bad: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa' }).app;
      const g2 = answerOn(fresh(), 'a', 'fluent', { raceId: 'r9' });
      bad = runScript(addsAtSave, { app: bad, model: g2.model }).app;
      bad = runScript(addsAtSave, { app: bad, model: g2.model }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app: bad }).stars).not.toBe(STAR_RULE.right + 5);
    });

    it('🔴 AC5: a profile from before stars is granted 10 per level reached and not paid for them again; v2 codes round-trip; a v1 code still decodes', () => {
      const oldSkill = (m: number) => ({ d: 900, n: 12, streak: 0, miss: 0, last: [1, 1, 1], hl: 4, due: Date.now() + 86400000, m, best: 1200, fluentRun: 0 });
      const v1Model = { rating: 1100, answered: 40, lastSkill: '', skills: { a: oldSkill(2), b: oldSkill(3), c: oldSkill(0) } };
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa', lang: 'fr' }).app;
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: v1Model }).app;
      const grant = STAR_RULE.level * 5;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).stars).toBe(grant);
      // Not paid again: a right answer that leaves the proficient skill proficient pays the answer only.
      const g = answerOn(v1Model, 'a', 'fluent', { wasDue: false });
      expect([g.starsEarned, g.stars, g.model.skills.a.paid, g.model.skills.a.m]).toEqual([STAR_RULE.right, grant + STAR_RULE.right, 2, 2]);
      // Sabotage: the migration grants but does not mark the levels paid, and the next answer pays them a second time.
      const unmarked = GRADE_ANSWER_SCRIPT.replace('model.skills[id].paid = lv;', '');
      expect(unmarked).not.toBe(GRADE_ANSWER_SCRIPT);
      expect(answerOn(v1Model, 'a', 'fluent', { wasDue: false }, unmarked).starsEarned).not.toBe(STAR_RULE.right);

      app = runScript(SAVE_MODEL_SCRIPT, { app, model: { ...g.model, bests: { practice: 4, defi: 6 } } }).app;
      const enc = runScript(ENCODE_SAVE_SCRIPT, { app });
      const dec = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code: enc.code });
      expect(dec.ok).toBe(true);
      const back = runScript(ACTIVE_PROFILE_SCRIPT, { app: dec.app });
      const paidOf = (model: any) => Object.fromEntries(Object.entries(model.skills).map(([k, s]: [string, any]) => [k, s.paid]));
      expect({ stars: back.stars, paid: paidOf(back.model), bests: back.model.bests }).toEqual({ stars: grant + STAR_RULE.right, paid: { a: 2, b: 3, c: 0 }, bests: { practice: 4, defi: 6 } });

      const v1Code = 'RS1.' + Buffer.from(JSON.stringify({ v: 1, n: 'Sam', k: 'thumbs', s: 'Sam', l: 'CM1', g: 'en', y: 'qwerty', r: 1000, a: 9, d: [], sk: { a: [900, 9, 4, 16, 0, 2, 1400, 0] } }), 'utf8').toString('base64url');
      const old = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code: v1Code });
      expect(old.ok).toBe(true);
      const sam = runScript(ACTIVE_PROFILE_SCRIPT, { app: old.app });
      expect([sam.name, sam.stars, answerOn(sam.model, 'a', 'fluent').starsEarned]).toEqual(['Sam', STAR_RULE.level * 2, STAR_RULE.right]);
    });

    it('the profile list, which Game/Profile card repeats over, carries no stars (AC6’s other half)', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa' }).app;
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: answerOn(fresh(), 'a', 'fluent').model }).app;
      const row = runScript(LIST_PROFILES_SCRIPT, { app }).profiles[0];
      expect(Object.keys(row).filter((k) => /star/i.test(k))).toEqual([]);
      // Known-firing: the same filter finds the field in the profile itself.
      expect(Object.keys(row.model).filter((k) => /star/i.test(k))).toEqual(['stars']);
    });
  });

  describe('PLY-005 — the faces rolled, and the way back through them', () => {
    const roll = (inputs: Record<string, unknown>) => runScript(ROLL_FACE_SCRIPT, inputs);
    /** Walk a list of actions the way the form does: each move's history and place feed the next. */
    const walk = (moves: Array<[string, string?]>) => {
      let state: Record<string, any> = { history: [], at: -1 };
      const seen: Array<Record<string, any>> = [];
      for (const [action, seed] of moves) {
        state = roll({ history: state.history, at: state.at, action, seed });
        seen.push(state);
      }
      return { last: state, seen };
    };

    it('🔴 AC2: roll five, walk back five, and the faces come back in reverse; forward returns', () => {
      const five: Array<[string, string?]> = [['set', 'a'], ['roll', 'b'], ['roll', 'c'], ['roll', 'd'], ['roll', 'e']];
      const rolled = walk(five);
      expect([rolled.last.seed, rolled.last.history, rolled.last.canBack, rolled.last.canForward]).toEqual(['e', ['a', 'b', 'c', 'd', 'e'], true, false]);
      let state = rolled.last;
      const back: string[] = [];
      for (let i = 0; i < 6; i++) { state = roll({ ...state, action: 'back' }); back.push(state.seed); }
      // 🔴 Five steps back reach the first face, and a sixth changes nothing — Back at the start is not an error.
      expect(back).toEqual(['d', 'c', 'b', 'a', 'a', 'a']);
      expect([state.canBack, state.canForward, state.position]).toEqual([false, true, '1/5']);
      const forward: string[] = [];
      for (let i = 0; i < 6; i++) { state = roll({ ...state, action: 'forward' }); forward.push(state.seed); }
      expect(forward).toEqual(['b', 'c', 'd', 'e', 'e', 'e']);
      expect([state.canBack, state.canForward, state.position]).toEqual([true, false, '5/5']);
    });

    it('🔴 AC3: a roll from the middle appends at the end and loses nothing — every earlier face is still reachable', () => {
      let state: Record<string, any> = walk([['set', 'a'], ['roll', 'b'], ['roll', 'c']]).last;
      state = roll({ ...state, action: 'back' });
      state = roll({ ...state, action: 'back' });
      expect([state.seed, state.at]).toEqual(['a', 0]);
      // Rolling from the first face keeps b and c, and steps to the new one.
      state = roll({ ...state, action: 'roll', seed: 'd' });
      expect([state.seed, state.history, state.at]).toEqual(['d', ['a', 'b', 'c', 'd'], 3]);
      // And b and c are still there to walk back to.
      const walked: string[] = [];
      for (let i = 0; i < 3; i++) { state = roll({ ...state, action: 'back' }); walked.push(state.seed); }
      expect(walked).toEqual(['c', 'b', 'a']);
    });

    it('AC4: set starts the list at exactly one face, so a form that has just opened has nothing to go back to', () => {
      const opened = roll({ history: ['x', 'y', 'z'], at: 2, action: 'set', seed: 'fresh' });
      expect([opened.history, opened.at, opened.seed, opened.canBack, opened.canForward, opened.position]).toEqual([['fresh'], 0, 'fresh', false, false, '1/1']);
      // An existing player's own face is where their list starts.
      expect(roll({ history: [], at: -1, action: 'set', seed: 'Léa' }).history).toEqual(['Léa']);
    });

    it('the history is capped, and a move that cannot apply changes nothing', () => {
      let state: Record<string, any> = roll({ history: [], at: -1, action: 'set', seed: 's0' });
      for (let i = 1; i <= ROLL_HISTORY + 10; i++) state = roll({ ...state, action: 'roll', seed: `s${i}` });
      expect(state.history.length).toBe(ROLL_HISTORY);
      // The cap drops the OLDEST, and the newest is what is drawn.
      expect([state.history[state.history.length - 1], state.history[0]]).toEqual([`s${ROLL_HISTORY + 10}`, `s${11}`]);
      // A roll with no seed, and an action that is not one, leave the list exactly as it was.
      const before = { history: state.history, at: state.at };
      expect(roll({ ...before, action: 'roll', seed: '' }).history).toEqual(before.history);
      expect(roll({ ...before, action: 'sideways' }).at).toBe(before.at);
      // Junk in: no crash, and an empty list is honest about having nothing to walk.
      expect(roll({ history: 'not a list', at: 'nowhere', action: 'back' })).toEqual(expect.objectContaining({ history: [], canBack: false, canForward: false, position: '' }));
    });
  });

  describe('PLY-006 — the comeback: earned, visible, and the automatic half only when behind', () => {
    // 🔴 ONE question per answer. Calling the picker twice — `grade(q(), q().answer)` — grades one question against
    // another one's answer, so every answer is wrong, every gain is 0 and every multiplier reads 1. It looks like the
    // feature is dead when it is the harness that is.
    const q = () => pick({ curriculum: CURRICULUM.filter((s) => s.id === 'table-7'), level: 'CE2' });
    const right = (opts: Record<string, unknown> = {}) => { const one = q(); return grade(one, one.answer, { elapsedOverride: 1200, raceId: 'r1', ...opts }); };
    const at = (myAt: number, cpuAt: number, extra: Record<string, unknown> = {}) => right({ myAt, cpuAt, ...extra });

    it('🔴 AC4: the slipstream is 1 at and below the threshold, rises with the gap, caps at +60%, and is never given to a wrong answer', () => {
      // Level, ahead, and just at the threshold: no help at all.
      expect([at(0.5, 0.5).slip, at(0.8, 0.2).slip, at(0.5, 0.5 + COMEBACK.behindFrom).slip]).toEqual([1, 1, 1]);
      // Behind: it rises with the gap, and stops at +60%.
      const small = at(0.2, 0.2 + COMEBACK.behindFrom + 0.15).slip;
      const big = at(0.1, 0.1 + COMEBACK.behindFrom + 0.3).slip;
      expect(small).toBeGreaterThan(1);
      expect(big).toBeGreaterThan(small);
      expect(at(0, 0.95).slip).toBeCloseTo(1 + COMEBACK.slipMax, 5);
      // 🔴 Never for a wrong answer: the gain it would multiply is zero, and the number itself stays 1.
      const missed = grade(q(), 'nonsense', { elapsedOverride: 1200, raceId: 'r1', myAt: 0, cpuAt: 0.8 });
      expect([missed.slip, missed.gain]).toEqual([1, 0]);
      // 🔴 And never for the computer: its step is the same however far ahead it is.
      expect(at(0, 0.9).cpuGain).toBe(at(0.9, 0.9).cpuGain);
    });

    it('AC4 sabotage arm: give the slipstream to a wrong answer and the gate sees the rocket move on a miss', () => {
      const doctored = GRADE_ANSWER_SCRIPT.replace('var slip = correct ? slipstream(gap) : 1;', 'var slip = slipstream(gap);');
      expect(doctored).not.toBe(GRADE_ANSWER_SCRIPT);
      const one = q();
      const missed = runScript(doctored, { model: freshModel(), skillId: one.skillId, answer: one.answer, typed: 'nonsense', fluentMs: one.fluentMs, itemDiff: one.itemDiff, level: 'CE2', lang: 'en', elapsedOverride: 1200, raceId: 'r1', myAt: 0, cpuAt: 0.8 });
      expect(missed.slip).toBeGreaterThan(1);
    });

    it('🔴 AC5: three right answers in a row charge one ⚡; a wrong answer breaks the chain but never discharges it; only one is held', () => {
      const run = (outcomes: Array<'right' | 'wrong'>, opts: Record<string, unknown> = {}) => {
        let model: any = freshModel();
        let last: any = {};
        for (const o of outcomes) {
          const question = q();
          last = grade(question, o === 'right' ? question.answer : 'nonsense', { elapsedOverride: 1200, raceId: 'r1', model, myAt: 0, cpuAt: 0.8, ...opts });
          model = last.model;
        }
        return last;
      };
      expect(COMEBACK.chainAt).toBe(3);
      // Two in a row: charging, nothing held.
      expect([run(['right', 'right']).chain, run(['right', 'right']).turbo]).toEqual([2, 0]);
      // Three: one held, and the chain starts again.
      expect([run(['right', 'right', 'right']).chain, run(['right', 'right', 'right']).turbo]).toEqual([0, 1]);
      // A wrong answer breaks the chain…
      expect(run(['right', 'right', 'wrong']).chain).toBe(0);
      // …but never discharges one already earned.
      expect(run(['right', 'right', 'right', 'wrong']).turbo).toBe(1);
      // Only one is held at a time.
      expect(run(['right', 'right', 'right', 'right', 'right', 'right']).turbo).toBe(1);
    });

    it('🔴 AC5 (R5): firing a turbo doubles the answer that spends it — level or behind — and asking for one you have not got does nothing', () => {
      const charge = (opts: Record<string, unknown> = {}) => {
        let model: any = freshModel();
        for (let i = 0; i < 3; i++) { const question = q(); model = grade(question, question.answer, { elapsedOverride: 1200, raceId: 'r1', model, myAt: 0, cpuAt: 0.8, ...opts }).model; }
        return model;
      };
      const held = charge();
      const plain = right({ model: held, myAt: 0, cpuAt: 0.8 });
      const fired = right({ model: held, myAt: 0, cpuAt: 0.8, useTurbo: true });
      expect([plain.turboUsed, fired.turboUsed]).toEqual([false, true]);
      expect(fired.gain).toBeCloseTo(plain.gain * COMEBACK.turboMult, 5);
      expect(fired.turbo).toBe(0);
      // 🔴 R5 (Richard, 2026-09-18) REVERSES this clause. It used to assert that firing while level did nothing
      // (`[false, 1]`), and that is the defect driving AC8 found: the three right answers that charge a turbo are the
      // same three that close the gap, so a child who earned one was level by the time they held it and the button had
      // already gone. A charged turbo is now spendable whenever it is held.
      const level = right({ model: held, myAt: 0.5, cpuAt: 0.5, useTurbo: true });
      expect([level.turboUsed, level.turbo]).toEqual([true, 0]);
      expect(level.gain).toBeCloseTo(right({ model: held, myAt: 0.5, cpuAt: 0.5 }).gain * COMEBACK.turboMult, 5);
      // …and the SLIPSTREAM is still behind-only, which is what keeps the automatic half of the comeback honest: the
      // same level answer gets no slipstream at all, so firing doubled a plain gain and not an assisted one.
      expect(level.slip).toBe(1);
      // A child AHEAD may also spend one they earned. Nothing is given — they answered three in a row for it.
      const ahead = right({ model: held, myAt: 0.8, cpuAt: 0.2, useTurbo: true });
      expect([ahead.turboUsed, ahead.slip]).toEqual([true, 1]);
      // Nothing held: asking changes nothing.
      expect(right({ model: freshModel(), myAt: 0, cpuAt: 0.8, useTurbo: true }).turboUsed).toBe(false);
      // A new race id starts the chain clean, and a bought turbo can start it charged.
      expect(right({ raceId: 'r2', model: held, myAt: 0, cpuAt: 0.8 }).turbo).toBe(0);
      expect(right({ raceId: 'r3', model: held, myAt: 0, cpuAt: 0.8, startTurbo: 1, useTurbo: true }).turboUsed).toBe(true);
    });

    it('🔴 AC6: the clause that grades Richard’s sentence — a bad start is recoverable, and the race has not become easy', () => {
      /**
       * A whole race through the REAL grader.
       *
       * 🔴 `badStart` is defined by the STATE Richard named — *"the CPU rocket is at the middle point"* — not by a
       * number of missed questions. The child answers wrong until the computer reaches halfway, and only then starts
       * answering at `accuracy`. Four-wrong-then-play was tried first and was not his scenario at all: four misses
       * leave the computer at about 0.2, and the child recovers from that without any help (73% of the time).
       *
       * The child fires a turbo the moment they hold one: the simplest policy a child could follow, and the least
       * flattering to the design.
       */
      const races = (accuracy: number, badStart: boolean, on: boolean) => {
        let won = 0;
        const N = 400;
        for (let t = 0; t < N; t++) {
          let seed = 7919 * t + 13;
          const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
          let me = 0;
          let cpu = 0;
          let model: any = freshModel();
          let n = 0;
          while (me < 1 && cpu < 1 && n < 120) {
            const one = q();
            const isRight = badStart && cpu < 0.5 ? false : rand() < accuracy;
            const ms = isRight && rand() < 0.5 ? 1200 : Number(one.fluentMs) * 1.4;
            const r = runScript(GRADE_ANSWER_SCRIPT, {
              model, skillId: one.skillId, answer: one.answer, typed: isRight ? one.answer : 'nonsense',
              fluentMs: one.fluentMs, itemDiff: one.itemDiff, level: 'CE2', lang: 'en',
              elapsedOverride: ms, raceId: 'r' + t,
              // Off: the grader is told nothing about the gap, which is exactly the build Richard played.
              myAt: on ? me : 0, cpuAt: on ? cpu : 0, useTurbo: on
            });
            model = r.model;
            me += Number(r.gain) || 0;
            cpu += Number(r.cpuGain) || 0;
            n++;
          }
          if (me >= 1 && me > cpu) won++;
        }
        return Math.round((100 * won) / N);
      };

      // 🔴 RED first, and this is the whole finding: let the computer reach halfway and the race is over.
      const badBefore = races(0.75, true, false);
      expect(badBefore).toBeLessThanOrEqual(2);
      // With the comeback on, a child who then answers well comes back often enough to believe it is worth trying.
      const badAfter = races(0.75, true, true);
      expect(badAfter).toBeGreaterThanOrEqual(15);
      // …and a clean race has NOT become a gift. A fix that makes winning free is not a fix.
      const cleanBefore = races(0.75, false, false);
      const cleanAfter = races(0.75, false, true);
      expect(cleanAfter).toBeGreaterThanOrEqual(cleanBefore);
      expect(cleanAfter - cleanBefore).toBeLessThanOrEqual(15);
      // A child who is guessing still loses, comeback or not.
      expect(races(0.35, false, true)).toBeLessThanOrEqual(35);
      // The four numbers this gate is built on, printed so a change of heart is a change of numbers.
      expect({ badBefore, badAfter, cleanBefore, cleanAfter }).toEqual({ badBefore, badAfter, cleanBefore, cleanAfter });
    });
  });

  describe('PLY-001 / PLY-002 — the hangar is a shop, it fits the face you chose, and nothing owned is ever taken away', () => {
    const shelf = HANGAR_SHELF;
    const me = (app: any) => app.profiles.find((p: Profile) => p.id === app.activeId);
    const newPlayer = (look: string) => runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Léa', lang: 'fr', look }).app;
    const withTotal = (app: any, stars: number) => runScript(SAVE_MODEL_SCRIPT, { app, model: { ...(me(app).model || {}), stars } }).app;
    const spent = (app: any) => Number(me(app).model?.spent) || 0;
    const costOf = (id: string) => shelf.find((i) => i.id === id)?.cost ?? 0;
    /** The purse, worked out from PLY-002's words rather than from the script: what was earned, less what was spent. */
    // 🔴 Not clamped at 0 the way the script clamps it: a gate that mirrors the clamp can never SEE an overdraw.
    const purseOf = (app: any) => (Number(me(app).model?.stars) || 0) - spent(app);

    it('🔴 PLY-001 AC2: the face shelf holds every item that fits the chosen face and NO item that does not', () => {
      for (const look of HANGAR_LOOKS) {
        const app = newPlayer(look);
        const rows = runScript(HANGAR_SHELF_SCRIPT, { app, shelf, tab: 'face' }).rows as Array<{ id: string }>;
        const fits = shelf.filter((i) => i.kind === 'face' && i.faces && (i.faces as any)[look]).map((i) => i.id);
        expect(rows.map((r) => r.id).sort()).toEqual(fits.sort());
        // PLY-001 AC3: and a shelf that fits is never a thin one.
        expect(rows.length).toBeGreaterThanOrEqual(MIN_FACE_ITEMS_PER_LOOK);
      }
    });

    it('PLY-001 AC2 sabotage arm: put RKT-011’s “show it greyed” branch back, and a misfit is offered again', () => {
      const doctored = HANGAR_SHELF_SCRIPT.replace('  if (!itemFits(item, look)) continue;', '');
      expect(doctored).not.toBe(HANGAR_SHELF_SCRIPT);
      const app = newPlayer('adventurer');
      const rows = runScript(doctored, { app, shelf, tab: 'face' }).rows as Array<{ id: string }>;
      const offered = rows.map((r) => r.id);
      expect(offered).toContain('cap'); // a pixel-art hat, on an adventurer face — exactly what Richard was shown
    });

    it('PLY-001 §3.4: a face with nothing to wear offers nothing, says so, and still has its rocket', () => {
      const app = newPlayer('thumbs');
      const face = runScript(HANGAR_SHELF_SCRIPT, { app, shelf, tab: 'face' });
      expect(face.rows).toEqual([]);
      const rocket = runScript(HANGAR_SHELF_SCRIPT, { app, shelf, tab: 'rocket' });
      expect(rocket.rows.length).toBe(shelf.filter((i) => i.kind === 'rocket').length);
    });

    it('PLY-001 §3.2: what is owned for another face is counted, never offered and never removed', () => {
      let app = withTotal(newPlayer('big-smile'), 500);
      app = runScript(PICK_ITEM_SCRIPT, { app, itemId: 'crown', shelf }).app;
      expect(me(app).owned).toEqual(['crown']);
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, look: 'adventurer' }).app;
      const shown = runScript(HANGAR_SHELF_SCRIPT, { app, shelf, tab: 'face' });
      expect(shown.rows.map((r: ViewRow) => r.id)).not.toContain('crown');
      expect([shown.elsewhere, shown.elsewhereText]).toEqual([1, expect.stringMatching(/1 objet t’appartient/)]);
      // Still owned, and worn again the moment the face comes back (wear is keyed by look).
      expect(me(app).owned).toEqual(['crown']);
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, look: 'big-smile' }).app;
      expect(runScript(HANGAR_SHELF_SCRIPT, { app, shelf, tab: 'face' }).rows.find((r: ViewRow) => r.id === 'crown').worn).toBe(true);
    });

    /** 60 seeded races at about 20 ⭐ each. After each one the child changes face now and then, and taps every item on the shelf. */
    function sixtyRaces(buyScript: string) {
      let seed = 20260918;
      const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
      const LOOKS = ['big-smile', 'pixel-art', 'adventurer', 'thumbs'];
      let app: any = newPlayer('big-smile');
      let stars = 0;
      let before = { stars: 0, owned: [] as string[], spent: 0 };
      const faults: string[] = [];
      let bought = 0;
      let retappedOwned = 0;
      let refusedTooDear = 0;
      let lookChanges = 0;
      for (let race = 1; race <= 60; race++) {
        stars += 13 + Math.floor(rand() * 15);
        app = withTotal(app, stars);
        if (rand() < 0.2) {
          app = runScript(UPDATE_SETTINGS_SCRIPT, { app, look: LOOKS[Math.floor(rand() * LOOKS.length)] }).app;
          lookChanges++;
        }
        const shown = runScript(ACTIVE_PROFILE_SCRIPT, { app });
        if (shown.stars < before.stars) faults.push(`race ${race}: what was EARNED dropped, ${before.stars} → ${shown.stars}`);
        if (spent(app) < before.spent) faults.push(`race ${race}: what was SPENT dropped, ${before.spent} → ${spent(app)}`);
        if (shown.picks !== purseOf(app)) faults.push(`race ${race}: the purse says ${shown.picks} but earned − spent is ${purseOf(app)}`);
        for (const item of shelf) {
          const was: string[] = me(app).owned || [];
          const purseBefore = purseOf(app);
          const r = runScript(buyScript, { app, itemId: item.id, shelf });
          const now: string[] = me(r.app).owned || [];
          if (was.includes(item.id)) {
            retappedOwned++;
            if (r.picked) faults.push(`race ${race}: ${item.id} was already owned, and was paid for again`);
          }
          if (r.why === 'tooDear') refusedTooDear++;
          if (r.picked) {
            bought++;
            const purseAfter = purseOf(r.app);
            if (purseAfter !== purseBefore - costOf(item.id)) faults.push(`race ${race}: buying ${item.id} (${costOf(item.id)} ⭐) took the purse ${purseBefore} → ${purseAfter}`);
            if (purseAfter < 0) faults.push(`race ${race}: buying ${item.id} overdrew the purse`);
            if (now.length !== was.length + 1) faults.push(`race ${race}: buying ${item.id} took owned ${was.length} → ${now.length}`);
          } else if (JSON.stringify(now) !== JSON.stringify(was) || purseOf(r.app) !== purseBefore) {
            faults.push(`race ${race}: a refused buy of ${item.id} (${r.why}) changed what is owned or the purse`);
          }
          if (new Set(now).size !== now.length) faults.push(`race ${race}: owned lists an item twice: ${now.join(', ')}`);
          app = r.app;
        }
        const ownedAfter: string[] = me(app).owned || [];
        const lost = before.owned.filter((id) => !ownedAfter.includes(id));
        if (lost.length) faults.push(`race ${race}: lost ${lost.join(', ')}`);
        before = { stars: runScript(ACTIVE_PROFILE_SCRIPT, { app }).stars, owned: ownedAfter, spent: spent(app) };
      }
      return { faults: [...new Set(faults)], bought, retappedOwned, refusedTooDear, lookChanges, stars, owned: before.owned.length };
    }

    it('🔴 PLY-002 AC: over 60 seeded races every buy costs exactly its price, the purse never goes negative, what was EARNED never drops, and owned only grows', () => {
      const run = sixtyRaces(PICK_ITEM_SCRIPT);
      expect(run.faults).toEqual([]);
      // Known-firing: things were really bought, owned items really were tapped again, something really was too dear, and the face really changed.
      expect(run.bought).toBeGreaterThanOrEqual(10);
      expect(run.retappedOwned).toBeGreaterThan(0);
      expect(run.refusedTooDear).toBeGreaterThan(0);
      expect(run.lookChanges).toBeGreaterThan(0);
      expect(run.stars).toBeGreaterThan(SHOP_FROM * 20);
    });

    it('PLY-002 sabotage arm: a buy that does not charge the purse is caught by the gate, and it names the race', () => {
      const doctored = PICK_ITEM_SCRIPT.replace('model.spent = spentOf(model) + cost;', 'model.spent = spentOf(model);');
      expect(doctored).not.toBe(PICK_ITEM_SCRIPT);
      expect(sixtyRaces(doctored).faults.join('\n')).toMatch(/took the purse/);
    });

    it('PLY-002 sabotage arm: a buy that does not check the purse overdraws, and the gate says so', () => {
      const doctored = PICK_ITEM_SCRIPT.replace("else if (!canAfford(item, before)) why = 'tooDear';", '');
      expect(doctored).not.toBe(PICK_ITEM_SCRIPT);
      expect(sixtyRaces(doctored).faults.join('\n')).toMatch(/overdrew the purse/);
    });

    it('a buy is refused, changing nothing, for a free item, an owned one, one that does not fit, and one it cannot afford; what it buys is worn at once', () => {
      let app: any = withTotal(newPlayer('big-smile'), costOf('crown'));
      const tryBuy = (id: string) => runScript(PICK_ITEM_SCRIPT, { app, itemId: id, shelf });
      expect([tryBuy('glasses').why, tryBuy('cap').why, tryBuy('nothing-here').why]).toEqual(['free', 'fits', 'unknown']);
      const got = tryBuy('crown');
      expect([got.picked, got.cost, got.purseBefore, got.purseAfter]).toEqual([true, costOf('crown'), costOf('crown'), 0]);
      expect([me(got.app).owned, me(got.app).wear]).toEqual([['crown'], { face: { 'big-smile': { accessories: 'sailormoonCrown' } }, paint: '', pattern: '' }]);
      app = got.app;
      expect([tryBuy('crown').why, tryBuy('cat-ears').why]).toEqual(['owned', 'tooDear']);
      // A free paint goes on, and off again, and the rocket is tomato once more.
      const on = runScript(WEAR_ITEM_SCRIPT, { app, itemId: 'paint-green', shelf });
      expect([on.worn, runScript(ACTIVE_PROFILE_SCRIPT, { app: on.app }).paint]).toEqual([true, 'var(--rocket-paint-green)']);
      const off = runScript(WEAR_ITEM_SCRIPT, { app: on.app, itemId: 'paint-green', shelf });
      expect([off.worn, runScript(ACTIVE_PROFILE_SCRIPT, { app: off.app }).paint]).toEqual([false, 'var(--primary)']);
      // What is not owned cannot be worn.
      expect(runScript(WEAR_ITEM_SCRIPT, { app, itemId: 'cat-ears', shelf }).changed).toBe(false);
    });

    it('🔴 PLY-002: paint and pattern are two layers — a rocket wears one of each, and neither takes the other off', () => {
      let app: any = withTotal(newPlayer('pixel-art'), 1000);
      app = runScript(PICK_ITEM_SCRIPT, { app, itemId: 'paint-purple', shelf }).app;
      app = runScript(PICK_ITEM_SCRIPT, { app, itemId: 'dots', shelf }).app;
      const shown = runScript(ACTIVE_PROFILE_SCRIPT, { app });
      expect([shown.paint, shown.pattern]).toEqual(['var(--rocket-paint-purple)', 'dots']);
      // A second paint replaces the paint and leaves the decal alone.
      app = runScript(PICK_ITEM_SCRIPT, { app, itemId: 'paint-orange', shelf }).app;
      const after = runScript(ACTIVE_PROFILE_SCRIPT, { app });
      expect([after.paint, after.pattern]).toEqual(['var(--rocket-paint-orange)', 'dots']);
    });
  });

  describe('the ports the graph wires', () => {
    it('every script mints the outputs its component publishes', () => {
      const expected: Record<string, string[]> = {
        'Logic/Pick next question': ['skillId', 'prompt', 'answer', 'options', 'optionValues', 'kind', 'isTyping', 'nextKey', 'fluentMs', 'limitMs', 'strategy', 'teach', 'itemDiff', 'shownAt', 'skillName', 'predicted', 'worked', 'padKeys', 'padNumeric'],
        'Logic/Grade answer': ['correct', 'fluent', 'outcome', 'elapsedMs', 'model', 'gain', 'cpuGain', 'message', 'mastery', 'ratingDelta', 'streak', 'missCount', 'starsEarned', 'stars'],
        'Logic/Finish race': ['model', 'starsEarned', 'raceStars', 'starsText', 'why', 'newBest', 'stars', 'earnedPick'],
        'Logic/Pick item': ['app', 'picked', 'why'],
        'Logic/Wear item': ['app', 'worn', 'changed'],
        'Logic/Hangar shelf': ['rows', 'count', 'picks', 'hasPicks'],
        'Logic/Slide and merge': ['board', 'moved', 'score', 'merges', 'biggest', 'gameOver', 'game'],
        'Logic/New merge board': ['board', 'pool', 'game', 'mode'],
        'Logic/Draw merge board': ['rows', 'score', 'made', 'biggest', 'over', 'phase', 'scoreLine', 'fullness'],
        'Logic/Finish merge': ['paid', 'model', 'starsEarned', 'stars', 'earnedPick', 'won', 'starsText', 'why', 'headline', 'line'],
        'Logic/Build number hunt': ['cells', 'target', 'count', 'kind', 'solutions', 'instruction'],
        'Logic/Check hunt pick': ['value', 'picked', 'complete', 'correct'],
        'Logic/New hunt': ['game', 'rounds'],
        'Logic/Hunt move': ['game', 'changed', 'note'],
        'Logic/Draw hunt': ['rows', 'instruction', 'progress', 'note', 'noteKind', 'phase', 'over', 'canShow', 'made', 'helped', 'round'],
        'Logic/Finish hunt': ['paid', 'model', 'starsEarned', 'stars', 'earnedPick', 'won', 'starsText', 'why', 'headline', 'line'],
        'Logic/New monster game': ['game', 'id', 'timeScale'],
        'Logic/Monster move': ['game', 'changed', 'event', 'timeScale'],
        'Logic/Draw monster': ['hearts', 'heartsLeft', 'line', 'note', 'pips', 'look', 'monsterClass', 'laneClass', 'rest', 'walkFrom', 'phase', 'over', 'won', 'beaten', 'right'],
        'Logic/Finish monster': ['paid', 'model', 'starsEarned', 'stars', 'earnedPick', 'won', 'starsText', 'why', 'headline', 'line'],
        'Logic/Active profile': ['hasProfile', 'profileId', 'name', 'look', 'seed', 'level', 'lang', 'layout', 'sound', 'answerMode', 'mergeMode', 'model', 'due', 'days7', 'answered', 'stars', 'faceOptions', 'paint', 'picks', 'hasPicks', 'nextAt', 'nextPct', 'nextText', 'sets'],
        'Logic/Encode save code': ['code', 'length'],
        'Logic/Decode save code': ['app', 'ok', 'error', 'profileId']
      };
      for (const { component, script } of FUNCTION_SCRIPTS) {
        const ports = portsOf(script);
        for (const name of expected[component] ?? []) expect({ component, port: name, has: ports.outputs.includes(name) }).toEqual({ component, port: name, has: true });
        // Nothing mints a port by accident from prose: every input read is a real one.
        for (const input of ports.inputs) expect(input).toMatch(/^[a-z][A-Za-z]*$/);
      }
      expect(FUNCTION_SCRIPTS.map((f) => f.component)).toHaveLength(new Set(FUNCTION_SCRIPTS.map((f) => f.component)).size);
    });
  });

  // ── P113 — the third play test: choose what to practise, revision lists, French / English / history, what learning pays ──

  describe('P113 REV-001 — the focus: a subject, and the skills ticked in it', () => {
    it('every skill carries a subject and a topic that exists, and every maths and typing skill is filed by TOPIC_OF', () => {
      const topicIds = new Set(TOPICS.map((t) => t.id));
      const subjectIds = new Set(SUBJECTS.map((s) => s.id));
      for (const skill of CURRICULUM) {
        expect({ skill: skill.id, subject: skill.subject, known: subjectIds.has(skill.subject!) }).toEqual({ skill: skill.id, subject: skill.subject, known: true });
        expect({ skill: skill.id, topic: skill.topic, known: topicIds.has(skill.topic!) }).toEqual({ skill: skill.id, topic: skill.topic, known: true });
        // A topic belongs to the skill's own subject: a French skill filed under a maths topic would hide in the wrong menu.
        expect(TOPICS.find((t) => t.id === skill.topic)!.subject).toBe(skill.subject);
      }
      for (const skill of CURRICULUM.filter((s) => s.subject === 'maths' || s.subject === 'typing')) expect(TOPIC_OF[skill.id]).toBe(skill.topic);
      // The four subjects Richard named, each with something at CE2 and something at 6e.
      for (const subject of ['french', 'english', 'history'] as const) {
        const mine = CURRICULUM.filter((s) => s.subject === subject);
        expect({ subject, count: mine.length >= 5 }).toEqual({ subject, count: true });
        expect({ subject, ce2: mine.some((s) => s.level === 'CE2'), sixth: mine.some((s) => s.level === '6e') }).toEqual({ subject, ce2: true, sixth: true });
      }
    });

    it('🔴 a focus serves ONLY the ticked skills, whatever their level — a CE2 child who ticks tables 5 and 8 is never asked anything else', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 80; i++) seen.add(pick({ level: 'CE2', focus: ['table-5', 'table-8'], mode: 'maths' }).skillId);
      expect([...seen].sort()).toEqual(['table-5', 'table-8']);
      // Above the level: a CE2 child whose parent ticked a 6e skill gets it (the choice is theirs), where the level alone never would.
      const above = new Set<string>();
      for (let i = 0; i < 20; i++) above.add(pick({ level: 'CE2', focus: ['frac-quotient'], mode: 'maths' }).skillId);
      expect([...above]).toEqual(['frac-quotient']);
      const plain = new Set<string>();
      for (let i = 0; i < 80; i++) plain.add(pick({ level: 'CE2', mode: 'maths' }).skillId);
      expect(plain.has('frac-quotient')).toBe(false);
    });

    it('🔴 ruling 1 (2026-10-04): the 5e verb study is a choice, identify-only — never in "everything", asked only when ticked, marked 5e', () => {
      const beyond = CURRICULUM.filter((sk) => sk.beyond);
      expect(beyond.map((sk) => `${sk.id}:${sk.beyond}`).sort()).toEqual(['fr-verb-subj:5e', 'fr-verb-voice:5e']);
      // Identify-only: no 5e skill makes the child produce a form, and the typed subjonctif is gone.
      expect(beyond.every((sk) => sk.generator === 'list' && sk.answer === 'options')).toBe(true);
      expect(CURRICULUM.some((sk) => sk.id === 'fr-conj-subjonctif')).toBe(false);
      // The programme's own banks no longer ask the subjonctif: it lives only in the 5e spot-it bank.
      const bankOf = (id: string) => ((CURRICULUM.find((sk) => sk.id === id)!.params as any).items as Array<{ a: { en: string } }>).map((it) => it.a.en);
      expect(bankOf('fr-verb-mode').some((a) => /subjonctif/.test(a))).toBe(false);
      expect(bankOf('fr-verb-tense').some((a) => /subjonctif/.test(a))).toBe(false);
      expect([...new Set(bankOf('fr-verb-subj'))].sort()).toEqual(['indicatif', 'subjonctif']);
      // Everything at 6e, 300 draws: never a 5e skill. Ticked, it is all that is asked, with its two buttons.
      const plain = new Set<string>();
      for (let i = 0; i < 300; i++) plain.add(pick({ level: '6e', mode: 'french' }).skillId);
      expect(plain.size).toBeGreaterThan(5);
      expect([...plain].filter((id) => beyond.some((sk) => sk.id === id))).toEqual([]);
      for (let i = 0; i < 20; i++) {
        const q = pick({ level: '6e', mode: 'french', focus: ['fr-verb-subj'] });
        expect(q.skillId).toBe('fr-verb-subj');
        expect([...q.options].sort()).toEqual(['indicatif', 'subjonctif']);
      }
      // The chooser offers both, unticked, each saying 5e (not the child's own 6e).
      const rows = runScript(FOCUS_CHOICES_SCRIPT, { curriculum: CURRICULUM, sets: [], level: '6e', lang: 'fr', subject: 'french', topic: 'verb-study', skills: [] }).skillRows as Array<{ value: string; label: string; selected: boolean }>;
      expect(rows.filter((r) => /· 5e$/.test(r.label)).map((r) => r.value).sort()).toEqual(['fr-verb-subj', 'fr-verb-voice']);
      expect(rows.find((r) => r.value === 'fr-verb-subj')!.label).toBe('Repérer le subjonctif · 5e');
      // Sabotage: without the picker's skip, "everything" serves a 5e skill.
      const leaky = PICK_QUESTION_SCRIPT.replace('if (sk.beyond) continue;', '');
      expect(leaky).not.toBe(PICK_QUESTION_SCRIPT);
      const leaked = new Set<string>();
      for (let i = 0; i < 300; i++) leaked.add(runScript(leaky, { curriculum: CURRICULUM, model: freshModel(), level: '6e', lang: 'en', layout: 'qwerty', mode: 'french', answerMode: 'auto', wordLists: WORD_LIST_ROWS, nonce: 1 }).skillId);
      expect([...leaked].some((id) => beyond.some((sk) => sk.id === id))).toBe(true);
    });

    it('🔴 a subject mode serves that subject at the child’s level and below, and maths never serves French', () => {
      const bySubject = (mode: string, level: string) => {
        const seen = new Set<string>();
        for (let i = 0; i < 120; i++) seen.add(pick({ level, mode }).skillId);
        return [...seen].map((id) => CURRICULUM.find((s) => s.id === id)!);
      };
      const frenchCe2 = bySubject('french', 'CE2');
      expect(frenchCe2.length).toBeGreaterThan(0);
      expect(frenchCe2.every((s) => s.subject === 'french' && s.level === 'CE2')).toBe(true);
      const history6e = bySubject('history', '6e');
      expect(history6e.every((s) => s.subject === 'history')).toBe(true);
      expect(history6e.some((s) => s.level === '6e')).toBe(true);
      expect(bySubject('maths', '6e').every((s) => s.subject === 'maths')).toBe(true);
      expect(bySubject('english', 'CE2').every((s) => s.subject === 'english' && s.level === 'CE2')).toBe(true);
    });

    it('Logic/Focus turns a saved focus into the picker’s mode, skills and line — and a list into its items', () => {
      const run = (over: Record<string, unknown>) => runScript(FOCUS_SCRIPT, { curriculum: CURRICULUM, sets: [], level: 'CE2', lang: 'en', subject: 'maths', skills: [], ...over });
      const all = run({});
      expect({ mode: all.mode, focus: all.focus, line: all.line, hasFocus: all.hasFocus }).toEqual({ mode: 'maths', focus: [], line: 'Maths · everything (CE2)', hasFocus: false });
      const two = run({ skills: ['table-5', 'table-8', 'fr-plural'] });
      expect(two.focus).toEqual(['table-5', 'table-8']);
      expect(two.line).toBe('Maths · 5 times table, 8 times table');
      const many = run({ subject: 'french', skills: ['fr-plural', 'fr-homophones-ce2', 'fr-word-class-ce2'], lang: 'fr' });
      expect({ mode: many.mode, line: many.line, count: many.count }).toEqual({ mode: 'french', line: 'Français · 3 notions', count: 3 });
      const sets = [{ id: 'abc', name: 'Histoire lundi', items: [{ q: 'Néandertal', a: 'vers -40 000' }], both: true }];
      const list = run({ sets, subject: 'set:abc', lang: 'fr' });
      expect({ mode: list.mode, id: list.customSetId, both: list.customSetBoth, line: list.line, items: list.customSet.length, isList: list.isList }).toEqual({ mode: 'custom', id: 'abc', both: true, line: 'Ma liste · Histoire lundi', items: 1, isList: true });
      // A list that was deleted falls back to maths, everything — never to a blank race.
      const gone = run({ sets, subject: 'set:nope' });
      expect({ mode: gone.mode, line: gone.line }).toEqual({ mode: 'maths', line: 'Maths · everything (CE2)' });
      // A subject that does not exist falls back the same way.
      expect(run({ subject: 'latin' }).mode).toBe('maths');
    });

    it('Logic/Focus choices offers nothing above the child’s level, falls back to the first topic, and files the lists under My lists', () => {
      const run = (over: Record<string, unknown>) => runScript(FOCUS_CHOICES_SCRIPT, { curriculum: CURRICULUM, sets: [], level: 'CE2', lang: 'en', subject: 'french', topic: '', skills: [], ...over });
      const ce2 = run({});
      expect(ce2.subjectRows.map((r: { value: string }) => r.value)).toEqual(['maths', 'french', 'english', 'history', 'typing', 'lists']);
      expect(ce2.subjectRows.find((r: { value: string }) => r.value === 'french').selected).toBe(true);
      // CE2 French has conjugation, word classes, homophones and plurals — not the 6e verb study, not the CM1 feminines' topic alone.
      const topics = ce2.topicRows.map((r: { value: string }) => r.value);
      expect(topics).toEqual(['conjugation', 'word-classes', 'homophones', 'agreement']);
      expect(ce2.topic).toBe('conjugation');
      expect(ce2.skillRows.map((r: { value: string }) => r.value)).toEqual(['fr-conj-present']);
      // A 6e child sees every level up to theirs, with the class on a skill that is not theirs.
      const sixth = run({ level: '6e', topic: 'verb-study', skills: ['fr-verb-mode', 'fr-verb-group'] });
      expect(sixth.topicRows.map((r: { value: string }) => r.value)).toContain('verb-study');
      expect(sixth.topicRows.find((r: { value: string }) => r.value === 'verb-study').label).toMatch(/✓2$/);
      const rows = sixth.skillRows as Array<{ value: string; label: string; selected: boolean }>;
      expect(rows.find((r) => r.value === 'fr-verb-mode')!.selected).toBe(true);
      expect(rows.find((r) => r.value === 'fr-verb-group')!.label).toMatch(/· CM1$/);
      expect(rows.find((r) => r.value === 'fr-verb-mode')!.label).not.toMatch(/·/);
      expect(sixth.allTicked).toBe(false);
      expect(run({ level: '6e', topic: 'verb-study', skills: sixth.topicIds }).allTicked).toBe(true);
      // A topic that is not in this subject falls back to the first.
      expect(run({ topic: 'tables' }).topic).toBe('conjugation');
      // My lists: the sets are the topics; with none, saving falls back to maths rather than to an empty list.
      const none = run({ subject: 'lists' });
      expect({ isLists: none.isLists, topics: none.topicRows, save: none.saveSubject, hasSets: none.hasSets }).toEqual({ isLists: true, topics: [], save: 'maths', hasSets: false });
      const sets = [{ id: 'a1', name: 'Verbes', items: [{ q: 'x', a: 'y' }] }, { id: 'b2', name: 'Dates', items: [] }];
      const some = run({ subject: 'lists', sets });
      expect(some.topicRows.map((r: { value: string; label: string; selected: boolean }) => [r.value, r.label, r.selected])).toEqual([['set:a1', 'Verbes (1)', true], ['set:b2', 'Dates (0)', false]]);
      expect(some.saveSubject).toBe('set:a1');
      expect(run({ subject: 'set:b2', sets }).saveSubject).toBe('set:b2');
    });

    it('Logic/Toggle id: toggle, all, none, set, clear', () => {
      const run = (over: Record<string, unknown>) => runScript(TOGGLE_ID_SCRIPT, { list: ['a', 'b'], id: '', action: 'toggle', ids: [], ...over });
      expect(run({ id: 'c' }).list).toEqual(['a', 'b', 'c']);
      expect(run({ id: 'a' }).list).toEqual(['b']);
      expect(run({ action: 'all', ids: ['b', 'c', 'd'] }).list).toEqual(['a', 'b', 'c', 'd']);
      expect(run({ action: 'none', ids: ['a', 'x'] }).list).toEqual(['b']);
      expect(run({ action: 'set', ids: ['z'] }).list).toEqual(['z']);
      expect(run({ action: 'clear' })).toEqual({ list: [], count: 0 });
      expect(run({}).list).toEqual(['a', 'b']);
    });

    it('the focus is kept on the profile: Update settings writes it, Active profile reads it back, and a profile with none is on maths, everything', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Saoirse', level: 'CE2' }).app;
      const before = runScript(ACTIVE_PROFILE_SCRIPT, { app });
      expect({ subject: before.focusSubject, skills: before.focusSkills }).toEqual({ subject: 'maths', skills: [] });
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, focusSubject: 'maths', focusSkills: ['table-5', 'table-8'] }).app;
      const after = runScript(ACTIVE_PROFILE_SCRIPT, { app });
      expect({ subject: after.focusSubject, skills: after.focusSkills }).toEqual({ subject: 'maths', skills: ['table-5', 'table-8'] });
      // A settings write that says nothing about the focus leaves it alone.
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, soundMode: 'off' }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).focusSkills).toEqual(['table-5', 'table-8']);
    });
  });

  describe('P113 REV-003 — lists and conjugation', () => {
    const LISTS = CURRICULUM.filter((s) => s.generator === 'list');
    const CONJ = CURRICULUM.filter((s) => s.generator === 'conjugate');

    it('🔴 a list asks its own items: at most four buttons, the answer among them, the others drawn from the list (60× each, EN and FR)', () => {
      expect(LISTS.length).toBeGreaterThanOrEqual(30);
      for (const skill of LISTS) {
        const items = (skill.params as { items: Array<{ q: unknown; a: unknown; opts?: unknown[] }> }).items;
        const answers = new Set<string>();
        for (const it of items) for (const lang of ['en', 'fr'] as const) {
          const a = typeof it.a === 'string' ? it.a : (it.a as Record<string, string>)[lang];
          const q = typeof it.q === 'string' ? it.q : (it.q as Record<string, string>)[lang];
          answers.add(helper<string>('normalise', a));
          answers.add(helper<string>('normalise', q));
          for (const o of it.opts ?? []) answers.add(helper<string>('normalise', typeof o === 'string' ? o : (o as Record<string, string>)[lang]));
        }
        for (let i = 0; i < 60; i++) {
          const lang = i % 2 ? 'fr' : 'en';
          const q = pick({ curriculum: [skill], level: skill.level, lang, mode: String(skill.subject) });
          expect({ skill: skill.id, key: q.itemKey.length > 0, count: q.itemCount }).toEqual({ skill: skill.id, key: true, count: items.length });
          expect(q.skillName).toMatch(new RegExp(` · 0/${items.length} ✓$`));
          if (q.kind === 'options') {
            expect(q.optionValues.length).toBeLessThanOrEqual(4);
            for (const v of q.optionValues) expect({ skill: skill.id, option: v, fromList: answers.has(helper<string>('normalise', v)) }).toEqual({ skill: skill.id, option: v, fromList: true });
          }
        }
      }
    });

    it('a two-item list of a person’s own is typed (two buttons would be a coin toss); four items get buttons; given buttons are kept', () => {
      const two = [{ q: 'Capital of France?', a: 'Paris' }, { q: '7 × 6', a: '42' }];
      for (let i = 0; i < 20; i++) expect(pick({ mode: 'custom', customSet: two, customSetId: 's1' }).kind).toBe('typed');
      const four = [{ q: 'a', a: '1' }, { q: 'b', a: '2' }, { q: 'c', a: '3' }, { q: 'd', a: '4' }];
      for (let i = 0; i < 20; i++) {
        const q = pick({ mode: 'custom', customSet: four, customSetId: 's1' });
        expect(q.skillId).toBe('set:s1');
        expect(q.optionValues.sort()).toEqual(['1', '2', '3', '4']);
      }
      const own = [{ q: 'Il ___ parti.', a: 'a', opts: ['a', 'à'] }, { q: 'x', a: 'y' }];
      const q = pick({ mode: 'custom', customSet: own, customSetId: 's1', nonce: 2 });
      if (q.prompt === 'Il ___ parti.') expect(q.optionValues.sort()).toEqual(['a', 'à']);
    });

    it('🔴 a list asked both ways is asked both ways, with the instruction for each direction', () => {
      const colours = CURRICULUM.find((s) => s.id === 'en-colours')!;
      const leads = new Set<string>();
      for (let i = 0; i < 80; i++) leads.add(pick({ curriculum: [colours], level: 'CE2', lang: 'fr', mode: 'english' }).prompt.split(' ')[0]);
      expect([...leads].sort()).toEqual(['En']);
      const full = new Set<string>();
      for (let i = 0; i < 80; i++) full.add(pick({ curriculum: [colours], level: 'CE2', lang: 'fr', mode: 'english' }).prompt.split(' ').slice(0, 2).join(' '));
      expect([...full].sort()).toEqual(['En anglais', 'En français']);
      // Backwards, the English word is asked and the French one is the answer.
      for (let i = 0; i < 40; i++) {
        const q = pick({ curriculum: [colours], level: 'CE2', lang: 'en', mode: 'english' });
        if (q.prompt.startsWith('In French:')) expect(['rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'orange', 'rose', 'violet', 'marron', 'gris']).toContain(q.answer);
        else expect(q.prompt.startsWith('In English:')).toBe(true);
      }
    });

    it('🔴 the item just asked waits a turn, and an item not yet learned is asked more than one that is', () => {
      const skill = CURRICULUM.find((s) => s.id === 'fr-verb-group')!;
      const items = (skill.params as { items: Array<{ q: { fr: string } }> }).items;
      const model = freshModel();
      model.skills[skill.id] = { d: 1000, n: 0, items: {}, lastItem: items[0].q.fr };
      for (let i = 0; i < 60; i++) expect(pick({ curriculum: [skill], level: '6e', mode: 'french', model }).itemKey).not.toBe(items[0].q.fr);
      // Every item learned but the last: the last is asked far more than its share.
      const learned = freshModel();
      const mem: Record<string, { n: number; k: number; ok: boolean; paid: boolean }> = {};
      for (const it of items.slice(0, -1)) mem[it.q.fr] = { n: 2, k: 2, ok: true, paid: true };
      learned.skills[skill.id] = { d: 1000, n: 0, items: mem };
      let hits = 0;
      for (let i = 0; i < 200; i++) if (pick({ curriculum: [skill], level: '6e', mode: 'french', model: learned }).itemKey === items[items.length - 1].q.fr) hits++;
      expect(hits).toBeGreaterThan(200 * 0.08);
      // And the eyebrow counts what is learned.
      expect(pick({ curriculum: [skill], level: '6e', mode: 'french', model: learned }).skillName).toMatch(new RegExp(` · ${items.length - 1}/${items.length} ✓$`));
    });

    /** One question on one verb, one tense and one person, so the form can be asserted exactly. */
    const conj = (verb: string, tense: string, person: number, lang = 'fr') => {
      const base = CURRICULUM.find((s) => s.id === 'fr-conj-present')!;
      return pick({ curriculum: [{ ...base, params: { verbs: [verb], tenses: [tense], persons: [person] } }], level: '6e', lang, mode: 'french', answerMode: 'options' });
    };

    it('🔴 conjugation: the forms a French test marks (être, aller, avoir, finir, manger across the tenses), with the pronoun elided before a vowel', () => {
      const cases: Array<[string, string, number, string, string]> = [
        ['être', 'present', 3, 'sommes', 'nous ___'],
        ['aller', 'futur', 0, 'irai', 'j’___'],
        ['aller', 'passeCompose', 5, 'sont allés', 'ils ___'],
        ['aller', 'passeCompose', 2, 'est allé', 'il ___'],
        ['manger', 'imparfait', 3, 'mangions', 'nous ___'],
        ['manger', 'imparfait', 0, 'mangeais', 'je ___'],
        ['avoir', 'subjonctif', 0, 'aie', 'que j’___'],
        ['finir', 'subjonctif', 2, 'finisse', 'qu’il ___'],
        ['aller', 'imperatif', 1, 'va', '(tu) ___'],
        ['chanter', 'passeSimple', 5, 'chantèrent', 'ils ___'],
        ['être', 'passeSimple', 2, 'fut', 'il ___'],
        ['prendre', 'conditionnel', 4, 'prendriez', 'vous ___'],
        ['venir', 'plusQueParfait', 3, 'étions venus', 'nous ___'],
        ['faire', 'present', 4, 'faites', 'vous ___'],
        ['avoir', 'present', 0, 'ai', 'j’___']
      ];
      for (const [verb, tense, person, form, tail] of cases) {
        const q = conj(verb, tense, person);
        expect({ verb, tense, person, answer: q.answer, tail: q.prompt.endsWith(tail) }).toEqual({ verb, tense, person, answer: form, tail: true });
        expect(q.prompt).toContain('« ' + verb + ' »');
        // The correction is the paradigm, and it holds the answer.
        expect(q.worked.replace(/\s+/g, ' ')).toContain(form.split(' ')[0]);
        expect(q.optionValues).toContain(form);
      }
      expect(conj('finir', 'present', 3).prompt).toBe('Conjugue « finir » au présent : nous ___');
      expect(conj('finir', 'imparfait', 3).prompt).toBe('Conjugue « finir » à l’imparfait : nous ___');
      expect(conj('finir', 'present', 3, 'en').prompt).toBe('Conjugate « finir » in the présent: nous ___');
      // The passé simple skill asks only il and ils.
      const ps = CURRICULUM.find((s) => s.id === 'fr-conj-passe-simple')!;
      for (let i = 0; i < 40; i++) expect(pick({ curriculum: [ps], level: 'CM2', lang: 'fr', mode: 'french' }).prompt).toMatch(/: ils? ___$/);
    });

    it('every conjugation skill generates 60× in both languages: four distinct buttons, the answer among them, the pad carrying the accents, and no verb it names is missing from the tables', () => {
      const known = new Set(FRENCH_VERBS.map((v) => v.inf));
      for (const skill of CONJ) {
        for (const verb of (skill.params as { verbs: string[] }).verbs) expect({ skill: skill.id, verb, known: known.has(verb) }).toEqual({ skill: skill.id, verb, known: true });
        for (let i = 0; i < 60; i++) {
          const lang = i % 2 ? 'fr' : 'en';
          const q = pick({ curriculum: [skill], level: skill.level, lang, mode: 'french', answerMode: 'options' });
          expect(q.optionValues).toHaveLength(4);
          expect(new Set(q.optionValues).size).toBe(4);
          expect(q.optionValues).toContain(q.answer);
          const typed = pick({ curriculum: [skill], level: skill.level, lang, mode: 'french', answerMode: 'typed' });
          expect(typed.kind).toBe('typed');
          expect(typed.padNumeric).toBe(false);
          for (const ch of typed.answer) if (ch !== ch.toUpperCase() && !/[a-z ]/.test(ch)) expect({ skill: skill.id, ch, onPad: typed.padKeys.includes(ch) }).toEqual({ skill: skill.id, ch, onPad: true });
          // Graded right as a French child would type it, straight or curly apostrophe aside.
          expect(grade(typed, typed.answer, { lang }).correct).toBe(true);
        }
      }
    });

    it('numbers in English and centuries: forty-seven or forty seven both grade right; 1515 is the XVIe, 1500 the XVe, 2024 the XXIe', () => {
      const en20 = CURRICULUM.find((s) => s.id === 'en-numbers-100')!;
      for (let i = 0; i < 40; i++) {
        const q = pick({ curriculum: [en20], level: '6e', lang: 'fr', mode: 'english', answerMode: 'typed' });
        const n = Number(q.prompt.replace(/\D/g, ''));
        expect(q.answer).toBe(helper<string>('spellEn', n));
        expect(grade(q, q.answer.replace(/-/g, ' '), { lang: 'fr' }).correct).toBe(true);
      }
      const century = CURRICULUM.find((s) => s.id === 'hi-century')!;
      const at = (year: number) => pick({ curriculum: [{ ...century, params: { min: year, max: year } }], level: 'CM1', lang: 'fr', mode: 'history' });
      expect(at(1515).answer).toBe('XVIe');
      expect(at(1500).answer).toBe('XVe');
      expect(at(2024).answer).toBe('XXIe');
      expect(at(1789).answer).toBe('XVIIIe');
      // The trap is on the buttons: 1515 offers the XVe.
      expect(at(1515).optionValues).toContain('XVe');
      expect(new Set(at(1515).optionValues).size).toBe(4);
    });
  });

  describe('P113 REV-004 — what learning pays', () => {
    const q0 = { skillId: 'fr-verb-mode', answer: 'subjonctif', fluentMs: 8000, itemDiff: 1600, strategy: '' };
    const ask = (model: any, typed: string, itemKey: string, over: Record<string, unknown> = {}) =>
      runScript(GRADE_ANSWER_SCRIPT, { model, skillId: q0.skillId, answer: q0.answer, typed, shownAt: Date.now(), fluentMs: q0.fluentMs, itemDiff: q0.itemDiff, level: '6e', lang: 'fr', strategy: '', timedOut: false, itemKey, itemCount: 2, raceId: 'r1', ...over });

    it(`🔴 an item is learned after ${ITEM_LEARNED_AT} right answers in a row and pays ${STAR_RULE.item} ⭐ once; a miss unlearns it without taking anything back; every item learned pays the list’s ${STAR_RULE.list} ⭐ once`, () => {
      let g = ask(freshModel(), 'subjonctif', 'q1');
      expect({ learned: g.itemLearned, stars: g.starsEarned }).toEqual({ learned: false, stars: STAR_RULE.right });
      g = ask(g.model, 'subjonctif', 'q1');
      expect({ learned: g.itemLearned, stars: g.starsEarned, count: g.learned, done: g.listDone }).toEqual({ learned: true, stars: STAR_RULE.right + STAR_RULE.item, count: 1, done: false });
      expect(g.boost).toContain('📚 +' + STAR_RULE.item);
      const starsAfterItem = g.stars;
      g = ask(g.model, 'subjonctif', 'q1');
      expect({ learned: g.itemLearned, stars: g.starsEarned }).toEqual({ learned: false, stars: STAR_RULE.right });
      // A miss: no longer learned, nothing taken back, and re-learning pays nothing.
      g = ask(g.model, 'indicatif', 'q1');
      expect({ learned: g.learned, stars: g.stars }).toEqual({ learned: 0, stars: starsAfterItem + STAR_RULE.right });
      g = ask(g.model, 'subjonctif', 'q1');
      g = ask(g.model, 'subjonctif', 'q1');
      expect({ learned: g.learned, itemLearned: g.itemLearned, paid: g.starsEarned }).toEqual({ learned: 1, itemLearned: false, paid: STAR_RULE.right });
      // The second item: learning it completes the list of two.
      g = ask(g.model, 'subjonctif', 'q2');
      g = ask(g.model, 'subjonctif', 'q2');
      expect({ done: g.listDone, stars: g.starsEarned }).toEqual({ done: true, stars: STAR_RULE.right + STAR_RULE.item + STAR_RULE.list });
      expect(g.boost).toContain('🏆 +' + STAR_RULE.list);
      // Once.
      g = ask(g.model, 'indicatif', 'q2');
      g = ask(g.model, 'subjonctif', 'q2');
      g = ask(g.model, 'subjonctif', 'q2');
      expect({ done: g.listDone, learned: g.learned }).toEqual({ done: false, learned: 2 });
      // The race remembers what learning paid, and the finish says it.
      expect(g.model.race.itemStars).toBe(STAR_RULE.item * 2 + STAR_RULE.list);
      const finish = runScript(FINISH_RACE_SCRIPT, { model: g.model, raceId: 'r1', timed: false, lang: 'en' });
      expect(finish.why).toContain('learned +' + (STAR_RULE.item * 2 + STAR_RULE.list));
    });

    it('player two’s turns learn nothing for this profile, and a generated maths question (no item) is graded as before', () => {
      let g = ask(freshModel(), 'subjonctif', 'q1', { forB: true });
      g = ask(g.model, 'subjonctif', 'q1', { forB: true });
      expect({ learned: g.itemLearned, stars: g.starsEarned, ok: g.model.skills['fr-verb-mode'].items.q1.ok }).toEqual({ learned: true, stars: 0, ok: true });
      const plain = ask(freshModel(), 'subjonctif', '');
      expect({ learned: plain.learned, items: plain.model.skills['fr-verb-mode'].items }).toEqual({ learned: 0, items: undefined });
    });
  });

  describe('P113 REV-002 — a revision list typed as a parent types it', () => {
    it('🔴 plain text, one line per question, with the separator a person actually used: =, →, a tab, a colon, a dash', () => {
      const text = 'Néandertal disparaît = vers -40 000\nqu’il vienne → subjonctif\nfeu maîtrisé\tvers -400 000\nLascaux : vers -20 000\nHomo sapiens en Europe - vers -45 000\n\nune ligne sans réponse\n2 + 2 = ? = 4';
      const parsed = runScript(PARSE_SET_SCRIPT, { json: text });
      expect(parsed.items).toEqual([
        { q: 'Néandertal disparaît', a: 'vers -40 000' },
        { q: 'qu’il vienne', a: 'subjonctif' },
        { q: 'feu maîtrisé', a: 'vers -400 000' },
        { q: 'Lascaux', a: 'vers -20 000' },
        { q: 'Homo sapiens en Europe', a: 'vers -45 000' },
        { q: '2 + 2 = ?', a: '4' }
      ]);
      expect({ count: parsed.count, skipped: parsed.skipped, valid: parsed.valid }).toEqual({ count: 6, skipped: 1, valid: true });
      // JSON still works, and a bare word is nothing to save.
      expect(runScript(PARSE_SET_SCRIPT, { json: '[["a","b"]]' }).items).toEqual([{ q: 'a', a: 'b' }]);
      expect(runScript(PARSE_SET_SCRIPT, { json: 'hello' })).toEqual(expect.objectContaining({ valid: false, skipped: 1 }));
    });

    it('a saved list keeps whether it is asked both ways, and lists back its text for the editor', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Ellie', level: '6e' }).app;
      const items = runScript(PARSE_SET_SCRIPT, { json: 'go = went\nsee = saw' }).items;
      const saved = runScript(UPSERT_SET_SCRIPT, { app, name: 'Irregular verbs', items, both: true });
      const list = runScript(LIST_SETS_SCRIPT, { app: saved.app, setId: saved.setId });
      expect({ both: list.chosenBoth, text: list.chosenText, rowBoth: list.sets[0].both }).toEqual({ both: true, text: 'go = went\nsee = saw', rowBoth: true });
      // The focus can point at it, and the picker then asks it both ways under its own skill id.
      const focus = runScript(FOCUS_SCRIPT, { curriculum: CURRICULUM, sets: list.sets.map((r: { id: string }) => saved.app.sets.find((s: { id: string }) => s.id === r.id)), level: '6e', lang: 'en', subject: 'set:' + saved.setId, skills: [] });
      const seen = new Set<string>();
      for (let i = 0; i < 40; i++) {
        const q = pick({ mode: focus.mode, customSet: focus.customSet, customSetId: focus.customSetId, customSetBoth: focus.customSetBoth, level: '6e' });
        expect(q.skillId).toBe('set:' + saved.setId);
        seen.add(q.prompt);
      }
      expect([...seen].sort()).toEqual(['go', 'saw', 'see', 'went']);
    });

    it('a typed word forgives a hyphen for a space, a curly apostrophe, and a full stop at the end — and nothing else', () => {
      expect(helper<boolean>('sameAnswer', 'forty-seven', 'forty seven')).toBe(true);
      expect(helper<boolean>('sameAnswer', "qu'il", 'qu’il')).toBe(true);
      expect(helper<boolean>('sameAnswer', 'subjonctif.', 'Subjonctif')).toBe(true);
      expect(helper<boolean>('sameAnswer', 'etais', 'étais')).toBe(false);
      expect(helper<boolean>('sameAnswer', '12.', '12')).toBe(true);
      expect(helper<boolean>('sameAnswer', '2.5', '2,5')).toBe(true);
    });

    it('🔴 the save code carries the lists and the focus (Richard, 2026-10-04: "yep"), under their own ids, and a refused code adds no list', () => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Ellie', level: '6e' }).app;
      app = runScript(UPSERT_SET_SCRIPT, { app, setId: 'sHist', name: 'History Monday', items: [{ q: 'Lascaux', a: 'vers -20 000' }], both: false }).app;
      app = runScript(UPSERT_SET_SCRIPT, { app, setId: 'sVoc', name: 'English words', items: [{ q: 'le chien', a: 'the dog' }, { q: 'la maison', a: 'the house' }], both: true }).app;
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, focusSubject: 'set:sVoc', focusSkills: [] }).app;
      const code = runScript(ENCODE_SAVE_SCRIPT, { app }).code;
      expect(code).toMatch(/^RS1\.[A-Za-z0-9_-]+$/);

      // Another computer, empty: the player, the focus on the list, and both lists with their ids and both-ways flag.
      const there = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code });
      expect(there.ok).toBe(true);
      expect(there.app.sets).toEqual([
        { id: 'sHist', name: 'History Monday', items: [{ q: 'Lascaux', a: 'vers -20 000' }], both: false },
        { id: 'sVoc', name: 'English words', items: [{ q: 'le chien', a: 'the dog' }, { q: 'la maison', a: 'the house' }], both: true }
      ]);
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app: there.app }).focusSubject).toBe('set:sVoc');

      // A computer that has an older copy of one list and a list of its own: the code's copy wins, the other list stays.
      const busy = { profiles: [], activeId: '', sets: [{ id: 'sHist', name: 'History (old)', items: [], both: false }, { id: 'sMine', name: 'Mine', items: [{ q: 'a', a: 'b' }], both: false }] };
      const merged = runScript(DECODE_SAVE_SCRIPT, { app: busy, code });
      expect(merged.app.sets.map((x: ViewRow) => `${x.id}:${x.name}`)).toEqual(['sHist:History Monday', 'sMine:Mine', 'sVoc:English words']);

      // A full store refuses the code, and its lists do not slip in.
      let full: any = { profiles: [], activeId: '', sets: [] };
      for (let i = 0; i < MAX_PROFILES; i++) full = runScript(CREATE_PROFILE_SCRIPT, { app: full, name: `P${i}` }).app;
      const refused = runScript(DECODE_SAVE_SCRIPT, { app: full, code });
      expect([refused.ok, refused.error, refused.app.sets.length]).toEqual([false, 'full', 0]);

      // A v3 code (before lists) still loads, with no list and no focus.
      const v3 = 'RS1.' + Buffer.from(JSON.stringify({ v: 3, n: 'Sam', k: 'thumbs', s: 'Sam', l: 'CM1', g: 'en', y: 'qwerty', r: 0, a: 0, d: [], sk: {}, st: 0, b: {}, o: [], w: {}, sp: 0 }), 'utf8').toString('base64url');
      const old = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code: v3 });
      expect([old.ok, old.app.sets.length, old.app.profiles[0].focus]).toEqual([true, 0, undefined]);
    });
  });

  describe('P113 REV-005 — the moon: adopt, feed, dress, and nothing ever gets worse', () => {
    const withPurse = (stars: number, lang = 'en') => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Ellie', level: '6e', lang }).app;
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: { rating: 0, answered: 0, lastSkill: '', skills: {}, stars, spent: 0, bests: {} } }).app;
      return app;
    };
    const act = (app: any, action: string, over: Record<string, unknown> = {}) => runScript(MOON_ACT_SCRIPT, { app, action, ...over });
    const view = (app: any, over: Record<string, unknown> = {}) => runScript(MOON_VIEW_SCRIPT, { app, ...over });
    const me = (app: any) => app.profiles.find((p: Profile) => p.id === app.activeId);

    it('🔴 the first alien is free, the next costs 60 ⭐ from the hangar’s purse, and a short purse changes nothing', () => {
      let app = withPurse(50);
      expect(view(app)).toEqual(expect.objectContaining({ has: false, adoptFree: true, canAdopt: true, adoptButton: 'Adopt · free!', purseLine: 'You have 50 ⭐' }));
      const first = act(app, 'adopt', { species: 'bean', colour: 'pink', name: '  Zorpina  ' });
      expect([first.ok, first.said]).toEqual([true, 'Welcome to the moon, Zorpina!']);
      app = first.app;
      expect(me(app).model.spent).toBe(0);
      const v = view(app);
      expect(v.aliens).toEqual([expect.objectContaining({ name: 'Zorpina', species: 'bean', colour: 'var(--alien-pink)', grown: 0, selected: true, line: 'Baby' })]);
      expect([v.adoptCost, v.canAdopt, v.anotherLine]).toEqual([60, false, '＋ Adopt another alien · 60 ⭐']);
      // 50 ⭐ is not 60: refused, said gently, and the store is exactly as it was.
      const short = act(app, 'adopt', { species: 'blob' });
      expect([short.ok, short.why, short.said]).toEqual([false, 'tooDear', 'Not enough stars yet: a game earns more!']);
      expect(short.app).toEqual(app);
      // With 60 more earned, the second comes, and is spent for.
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: { ...me(app).model, stars: 110 } }).app;
      const second = act(app, 'adopt', { species: 'fuzz', colour: 'nope', name: '' });
      expect(second.ok).toBe(true);
      const two = me(second.app);
      expect([two.moon.aliens.length, two.model.spent, two.model.stars, two.moon.aliens[1].colour, two.moon.aliens[1].name]).toEqual([2, 60, 110, 'lime', 'Puff']);
      expect(two.moon.sel).toBe(two.moon.aliens[1].id);
    });

    it('a moon holds six aliens, and the seventh is refused', () => {
      let app = withPurse(10000);
      for (let i = 0; i < 6; i++) app = act(app, 'adopt', { species: 'star' }).app;
      expect(view(app)).toEqual(expect.objectContaining({ count: 6, full: true, canAdopt: false, anotherLine: '' }));
      const seventh = act(app, 'adopt', {});
      expect([seventh.ok, seventh.why, me(seventh.app).moon.aliens.length]).toEqual([false, 'full', 6]);
      expect(me(app).model.spent).toBe(60 + 90 + 120 + 160 + 200);
    });

    it('🔴 a meal spends its price and counts; the favourite counts two and is found the first time; six meals grow it, eighteen grow it up', () => {
      let app = act(withPurse(500), 'adopt', { species: 'blob', name: 'Zib' }).app;
      const fav = me(app).moon.aliens[0].fav as string;
      const other = ['strawberry', 'cookie', 'doughnut', 'pizza', 'cheese', 'cake'].find((f) => f !== fav)!;
      expect(view(app).favLine).toBe('Favourite food: ❓ — find it!');
      const yum = act(app, 'feed', { foodId: other });
      expect(yum.ok).toBe(true);
      expect(yum.said).toMatch(/^Zib munches .+\. Yum!$/);
      app = yum.app;
      const loved = act(app, 'feed', { foodId: fav });
      expect(loved.said).toMatch(/^Zib LOVES .+! It’s the favourite: two meals in one\.$/);
      app = loved.app;
      expect([me(app).moon.aliens[0].meals, me(app).moon.aliens[0].found]).toEqual([3, true]);
      expect(view(app).favLine).toMatch(/^Favourite food: \S+ /);
      expect(view(app).selLine).toBe('Baby · 3 meals · 3 more to grow');
      // Three more of the favourite: 9 meals, it grew on the way past 6, and said so.
      let said = '';
      for (let i = 0; i < 2; i++) { const r = act(app, 'feed', { foodId: fav }); app = r.app; said = r.said; }
      expect(said).toMatch(/ Zib grew!$/);
      expect([view(app).selGrown, view(app).selLine]).toEqual([1, 'Young · 7 meals · 11 more to grow']);
      for (let i = 0; i < 6; i++) app = act(app, 'feed', { foodId: fav }).app;
      expect([view(app).selGrown, view(app).selLine, view(app).aliens[0].line]).toEqual([2, 'Grown up! · 19 meals', 'Grown up']);
      // Spent is every meal's price; stars (earned) never moved.
      expect(me(app).model.stars).toBe(500);
      expect(view(app).foods.every((f: ViewRow) => f.use === true)).toBe(true);
    });

    it('🔴 something to wear is bought once, put on the chosen alien at once, and then goes on or off any alien for free', () => {
      let app = withPurse(160);
      app = act(app, 'adopt', { species: 'squid', name: 'Tako' }).app;
      app = act(app, 'adopt', { species: 'trio', name: 'Oko' }).app; // 60
      const crown = view(app).wear.find((w: ViewRow) => w.id === 'crown');
      expect(crown).toEqual(expect.objectContaining({ line: '80 ⭐', use: false, ask: true, dim: false, showAlien: true, species: 'trio', hat: 'crown' }));
      const bought = act(app, 'buy', { wearId: 'crown' });
      expect([bought.ok, bought.said]).toEqual([true, 'Oko is wearing the crown!']);
      app = bought.app;
      expect([me(app).moon.owned, me(app).moon.aliens[1].wear.hat, me(app).model.spent]).toEqual([['crown'], 'crown', 140]);
      expect(view(app).wear.find((w: ViewRow) => w.id === 'crown')).toEqual(expect.objectContaining({ line: 'On ✓', use: true, ask: false, worn: true }));
      // Bought twice: refused. Off again: free. On the other alien: free.
      expect(act(app, 'buy', { wearId: 'crown' }).why).toBe('owned');
      const off = act(app, 'wear', { wearId: 'crown' });
      expect([off.said, me(off.app).moon.aliens[1].wear.hat]).toEqual(['Oko takes off the crown.', '']);
      app = act(off.app, 'select', { alienId: me(off.app).moon.aliens[0].id }).app;
      app = act(app, 'wear', { wearId: 'crown' }).app;
      expect([me(app).moon.aliens[0].wear.hat, me(app).model.spent]).toEqual(['crown', 140]);
      // Not owned cannot be worn; too dear cannot be bought, and is greyed.
      expect(act(app, 'wear', { wearId: 'tophat' }).why).toBe('notOwned');
      expect(act(app, 'buy', { wearId: 'starglasses' }).why).toBe('tooDear');
      expect(view(app).wear.find((w: ViewRow) => w.id === 'starglasses')).toEqual(expect.objectContaining({ dim: true, ask: false }));
    });

    it('the moon speaks French to a French player, and the adopt card draws every species in the colour being chosen', () => {
      let app = withPurse(100, 'fr');
      const v0 = view(app, { draftSpecies: 'star', draftColour: 'sky' });
      expect(v0.adoptSpecies).toHaveLength(6);
      expect(v0.adoptSpecies.every((r: ViewRow) => r.colour === 'var(--alien-sky)')).toBe(true);
      expect(v0.adoptSpecies.filter((r: ViewRow) => r.selected).map((r: ViewRow) => r.id)).toEqual(['star']);
      expect([v0.suggestedName, v0.adoptButton, v0.purseLine, v0.adoptColours[0].label]).toEqual(['Stella', 'Adopter · gratuit !', 'Tu as 100 ⭐', 'Citron vert']);
      const r = act(app, 'adopt', { species: 'star', colour: 'sky', name: 'Nova' });
      expect(r.said).toBe('Bienvenue sur la Lune, Nova !');
      app = r.app;
      expect(view(app).selLine).toBe('Bébé · 0 repas · encore 6 pour grandir');
      expect(act(app, 'buy', { wearId: 'bow' }).said).toBe('Et voilà : Nœud pour Nova !');
    });

    it('🔴 nothing on the moon has a clock: the same store read later says the same thing, and the save code carries the moon', () => {
      let app = act(withPurse(100), 'adopt', { species: 'bean', name: 'Beep' }).app;
      app = act(app, 'feed', { foodId: 'cookie' }).app;
      const now = view(app);
      const realNow = Date.now;
      try {
        Date.now = () => realNow() + 1000 * 60 * 60 * 24 * 30;
        expect(view(app)).toEqual(now);
      } finally {
        Date.now = realNow;
      }
      const code = runScript(ENCODE_SAVE_SCRIPT, { app }).code;
      const there = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code });
      expect(view(there.app).aliens).toEqual(now.aliens);
      expect(view(there.app).purse).toBe(now.purse);
    });
  });

  describe('TPL-014 M1 — the Alien Book, the domes and the surprise egg: somewhere for the stars to go', () => {
    const withPurse = (stars: number, lang = 'en') => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Ellie', level: '6e', lang }).app;
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: { rating: 0, answered: 0, lastSkill: '', skills: {}, stars, spent: 0, bests: {} } }).app;
      return app;
    };
    const act = (app: any, action: string, over: Record<string, unknown> = {}) => runScript(MOON_ACT_SCRIPT, { app, action, ...over });
    const view = (app: any, over: Record<string, unknown> = {}) => runScript(MOON_VIEW_SCRIPT, { app, ...over });
    const me = (app: any) => app.profiles.find((p: Profile) => p.id === app.activeId);
    const fill = (app: any, n: number) => { for (let i = 0; i < n; i++) app = act(app, 'adopt', { species: 'star', colour: 'sunny' }).app; return app; };

    it('🔴 the book has every species in every colour; an alien had is drawn and named, one never had is a grey shape with no name', () => {
      let app = act(withPurse(0), 'adopt', { species: 'bean', colour: 'pink', name: 'Tilly' }).app;
      const v = view(app);
      expect(v.book).toHaveLength(36);
      expect([v.bookCount, v.bookLine]).toEqual([1, 'Alien Book · 1 of 36']);
      expect(v.book.find((r: ViewRow) => r.id === 'bean-pink')).toEqual(expect.objectContaining({ name: 'Bean', line: 'Pink', colour: 'var(--alien-pink)', species: 'bean' }));
      expect(v.book.find((r: ViewRow) => r.id === 'bean-lime')).toEqual(expect.objectContaining({ name: '?', line: '', colour: 'var(--muted)', species: 'bean' }));
      expect(view(app, {}).book.filter((r: ViewRow) => r.name !== '?')).toHaveLength(1);
      expect(runScript(MOON_VIEW_SCRIPT, { app: withPurse(0, 'fr') }).bookLine).toBe('Le livre des aliens · 0 sur 36');
    });

    it('🔴 a moon from before the book opens with the aliens it already has, and the first thing done on it keeps them', () => {
      let app = withPurse(500);
      // An old moon: aliens, no `met`, no `domes`.
      const p = me(app);
      p.moon = { aliens: [{ id: 'a1', species: 'blob', colour: 'lime', name: 'Zib', meals: 20, fav: 'cake', found: true, wear: { hat: 'crown' } }, { id: 'a2', species: 'squid', colour: 'sky', name: 'Wiggo', meals: 3, fav: 'pizza', found: false, wear: {} }], sel: 'a1', owned: ['crown'] };
      expect(view(app).bookCount).toBe(2);
      app = act(app, 'feed', { foodId: 'cookie' }).app;
      expect(me(app).moon.met).toEqual(['blob-lime', 'squid-sky']);
      expect(me(app).moon.domes).toEqual([]);
    });

    it('🔴 a dome makes room for two more aliens; built once; too dear refused with the store as it was', () => {
      let app = fill(withPurse(3200), 6); // 3200 − 630 (six) − 1000 (dome) − 520 (two more) = 1050, short of 1500
      expect(view(app)).toEqual(expect.objectContaining({ full: true, canAdopt: false }));
      const crater = view(app).bigs.find((b: ViewRow) => b.id === 'crater');
      expect(crater).toEqual(expect.objectContaining({ label: 'Crater Dome', line: '1000 ⭐ · room for 2 more', ask: true, dim: false, worn: false }));
      const spentBefore = me(app).model.spent;
      const built = act(app, 'build', { thingId: 'crater' });
      expect([built.ok, built.said]).toEqual([true, 'The Crater Dome is built: room for 2 more aliens!']);
      app = built.app;
      expect(me(app).model.spent).toBe(spentBefore + 1000);
      expect(view(app)).toEqual(expect.objectContaining({ full: false, canAdopt: true, anotherLine: '＋ Adopt another alien · 240 ⭐' }));
      expect(view(app).bigs.find((b: ViewRow) => b.id === 'crater')).toEqual(expect.objectContaining({ line: 'Built ✓ · room for 2 more', ask: false, worn: true }));
      expect(act(app, 'build', { thingId: 'crater' }).why).toBe('owned');
      app = fill(app, 2);
      expect([me(app).moon.aliens.length, view(app).full]).toEqual([8, true]);
      expect(act(app, 'adopt', {}).why).toBe('full');
      // The ridge dome is 1500; with less left, it is greyed and refused, and nothing changes.
      const purse = view(app).purse;
      expect(purse).toBeLessThan(1500);
      expect(view(app).bigs.find((b: ViewRow) => b.id === 'ridge')).toEqual(expect.objectContaining({ ask: false, dim: true }));
      const short = act(app, 'build', { thingId: 'ridge' });
      expect([short.ok, short.why]).toEqual([false, 'tooDear']);
      expect(short.app).toEqual(app);
      expect(act(app, 'build', { thingId: 'castle' }).why).toBe('unknown');
    });

    it('🔴 the egg always hatches an alien never had, until every one has been had, and needs room', () => {
      let app = withPurse(100000);
      const seen = new Set<string>();
      for (let i = 0; i < 6; i++) {
        const r = act(app, 'egg');
        expect(r.ok).toBe(true);
        app = r.app;
        const born = me(app).moon.aliens[me(app).moon.aliens.length - 1];
        const key = `${born.species}-${born.colour}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(r.said).toMatch(/^The egg hatched: meet \S+, a [a-z]+ \S+!$/);
        expect(me(app).moon.sel).toBe(born.id);
      }
      expect(view(app).full).toBe(true);
      expect(view(app).bigs.find((b: ViewRow) => b.id === 'egg')).toEqual(expect.objectContaining({ ask: false, dim: true, line: 'The moon is full: build a dome first' }));
      expect(act(app, 'egg').why).toBe('full');
      expect(me(app).model.spent).toBe(6 * 300);
      // Every page met, the book is full, and an egg still hatches (any alien).
      const p = me(app);
      p.moon.met = [];
      for (const sp of ['blob', 'bean', 'trio', 'squid', 'fuzz', 'star']) for (const c of ['lime', 'mint', 'sky', 'lilac', 'pink', 'sunny']) p.moon.met.push(`${sp}-${c}`);
      app = act(app, 'build', { thingId: 'crater' }).app;
      expect(view(app).bigs.find((b: ViewRow) => b.id === 'egg').line).toBe('300 ⭐ · a surprise alien');
      expect(act(app, 'egg').ok).toBe(true);
    });

    it('🔴 a hatched or adopted alien is never given a name another alien on the moon already has', () => {
      // Driven 2026-10-14: her moon had Tilly the pink Bean; an egg hatched a lime Bean and called it Tilly too.
      let app = withPurse(100000);
      for (let i = 0; i < 6; i++) app = act(app, 'adopt', { species: 'bean', colour: 'pink' }).app;
      app = act(app, 'build', { thingId: 'crater' }).app;
      app = act(app, 'build', { thingId: 'ridge' }).app;
      for (let i = 0; i < 4; i++) app = act(app, 'egg').app;
      const names = me(app).moon.aliens.map((a: { name: string }) => a.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
      expect(names.slice(0, 6)).toEqual(['zorp', 'tilly', 'nok', 'beep', 'zorp 2', 'tilly 2']);
      expect(names.includes(view(app, { draftSpecies: 'bean' }).suggestedName.toLowerCase())).toBe(false);
    });

    it('the egg says how many it could be, in both languages', () => {
      const app = act(withPurse(400), 'adopt', { species: 'blob', colour: 'lime' }).app;
      expect(view(app).bigs.find((b: ViewRow) => b.id === 'egg')).toEqual(expect.objectContaining({ line: '300 ⭐ · an alien you have never had (35 it could be)', ask: true }));
      const fr = act(withPurse(400, 'fr'), 'adopt', { species: 'blob', colour: 'lime' }).app;
      expect(view(fr).bigs.map((b: ViewRow) => b.label)).toEqual(['Dôme du cratère', 'Dôme de la crête', 'Œuf surprise', 'Jardin de lune', 'Cadre à cartes postales']);
      expect(act(fr, 'egg').said).toMatch(/^L’œuf éclot : voici \S+, un /);
    });

    it('🔴 the save code carries the book and the domes', () => {
      let app = withPurse(3000);
      app = act(app, 'egg').app;
      app = act(app, 'build', { thingId: 'crater' }).app;
      const before = view(app);
      const code = runScript(ENCODE_SAVE_SCRIPT, { app }).code;
      const there = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code });
      const after = view(there.app);
      expect([after.bookCount, after.bigs[0].worn, after.purse]).toEqual([before.bookCount, true, before.purse]);
    });
  });

  // ── TPL-014 M2–M5 — the moon grows: the Expedition, its gear, Alien school, the fourth form, the garden ──
  describe('TPL-014 M2–M5 — the moon grows: an expedition, gear, Alien school, the fourth form, the garden', () => {
    const withPurse = (stars: number, lang = 'en') => {
      let app: any = runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Ellie', level: '6e', lang }).app;
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: { rating: 0, answered: 0, lastSkill: '', skills: {}, stars, spent: 0, bests: {} } }).app;
      return app;
    };
    const moonAct = (app: any, action: string, over: Record<string, unknown> = {}) => runScript(MOON_ACT_SCRIPT, { app, action, ...over });
    const moonView = (app: any) => runScript(MOON_VIEW_SCRIPT, { app });
    const tripAct = (app: any, action: string, over: Record<string, unknown> = {}) => runScript(TRIP_ACT_SCRIPT, { app, action, ...over });
    const tripView = (app: any) => runScript(TRIP_VIEW_SCRIPT, { app });
    const schoolAct = (app: any, action: string, over: Record<string, unknown> = {}) => runScript(SCHOOL_ACT_SCRIPT, { app, action, ...over });
    const schoolView = (app: any) => runScript(SCHOOL_VIEW_SCRIPT, { app });
    const me = (app: any) => app.profiles.find((p: Profile) => p.id === app.activeId);
    /** Her moon: Zib (a grown Blob) and Wiggo (a grown Squiggle), and stars to spend. */
    const herMoon = (stars = 2000, lang = 'en') => {
      let app = withPurse(stars, lang);
      app = moonAct(app, 'adopt', { species: 'blob', colour: 'lime', name: 'Zib' }).app;
      app = moonAct(app, 'adopt', { species: 'squid', colour: 'sky', name: 'Wiggo' }).app;
      for (const a of me(app).moon.aliens) a.meals = 20;
      me(app).moon.sel = me(app).moon.aliens[0].id;
      return app;
    };
    /**
     * A planet drawn by hand, so a walk can be written down. Home is the bottom-left corner (30); plain everywhere but a pond
     * (20, 21) and a crater (22). A crystal at 25, a postcard at 26, a seed at 27, an egg clue at 0, a shell in the pond, a
     * meteorite in the crater.
     */
    const landed = (given: any) => {
      const app = JSON.parse(JSON.stringify(given));
      const map = Array(36).fill('p');
      map[30] = 'h';
      map[20] = 'w';
      map[21] = 'w';
      map[22] = 'c';
      const items = Array(36).fill('');
      Object.assign(items, { 25: 'crystal', 26: 'postcard', 27: 'seed', 0: 'egg', 21: 'shell', 22: 'meteor' });
      const seen = Array(36).fill(false);
      for (const i of [30, 24, 31]) seen[i] = true;
      me(app).moon.trip = { id: 't1', planet: 'Zuma', map, items, seen, pos: 30, who: me(app).moon.aliens[0].id, aim: -1, hopped: false, bag: [] };
      return app;
    };
    /** Aim at a tile and answer the question it asks. */
    const step = (app: any, at: number, correct = true) => {
      const aimed = tripAct(app, 'aim', { at });
      expect({ at, aimed: aimed.ok, why: aimed.why }).toEqual({ at, aimed: true, why: '' });
      return tripAct(aimed.app, 'answer', { correct });
    };
    const trip = (app: any) => me(app).moon.trip;

    it('🔴 every planet is 6 × 6, lands at home with its neighbours seen, and its plain ground is joined up, so every find on it can be reached (500 planets)', () => {
      const app = herMoon();
      for (let n = 0; n < 500; n++) {
        const t = me(tripAct(app, 'start').app).moon.trip;
        expect(t.map).toHaveLength(36);
        expect([t.pos, t.map[30]]).toEqual([30, 'h']);
        expect(t.seen.map((s: boolean, i: number) => (s ? i : -1)).filter((i: number) => i >= 0)).toEqual([24, 30, 31]);
        const reach = new Set([30]);
        const todo = [30];
        while (todo.length) {
          const at = todo.pop()!;
          for (const j of [at - 6, at + 6, at % 6 ? at - 1 : -1, at % 6 < 5 ? at + 1 : -1]) if (j >= 0 && j < 36 && !reach.has(j) && t.map[j] !== 'w' && t.map[j] !== 'c') { reach.add(j); todo.push(j); }
        }
        const plain = t.map.map((k: string, i: number) => (k === 'p' || k === 'h' ? i : -1)).filter((i: number) => i >= 0);
        expect(plain.filter((i: number) => !reach.has(i))).toEqual([]);
        // The finds: eight on plain ground and the egg clue (two of 36 met), a shell in the water, a meteorite in a crater.
        const on = (where: string) => t.items.map((k: string, i: number) => (k && (where === 'p' ? t.map[i] === 'p' : t.map[i] === where) ? k : '')).filter(Boolean).sort();
        expect(on('p')).toEqual(['crystal', 'crystal', 'egg', 'fossil', 'fossil', 'postcard', 'postcard', 'seed', 'seed']);
        expect(on('w')).toEqual(['shell']);
        expect(on('c')).toEqual(['meteor']);
        expect(t.items[30]).toBe('');
        expect(t.map.filter((k: string) => k === 'c')).toHaveLength(3);
        expect(t.map.filter((k: string) => k === 'w').length).toBeGreaterThanOrEqual(1);
      }
    });

    it('a trip starts with the chosen alien on the planet the trip count names; a second Start, or one with no alien, changes nothing', () => {
      const app = herMoon();
      const r = tripAct(app, 'start');
      expect([r.ok, r.said]).toEqual([true, 'Landed on Zuma! Zib steps out of the rocket.']);
      expect([trip(r.app).who, trip(r.app).planet]).toEqual([me(app).moon.aliens[0].id, 'Zuma']);
      expect(tripAct(r.app, 'start').why).toBe('onTrip');
      expect(tripAct(withPurse(0), 'start').why).toBe('noAlien');
      me(app).moon.trips = 1;
      expect(trip(tripAct(app, 'start').app).planet).toBe('Pobo');
    });

    it('🔴 a right answer walks one tile and picks up what lies there; a wrong one moves nothing and loses nothing; a far tile is refused', () => {
      let app = landed(herMoon());
      expect(tripAct(app, 'aim', { at: 18 }).why).toBe('far');
      // Wrong: the aim is cleared, and nothing else is different.
      const before = JSON.parse(JSON.stringify(trip(app)));
      const wrong = step(app, 24, false);
      expect([wrong.ok, wrong.said]).toEqual([true, 'Not quite. Nothing is lost: pick a tile and try again.']);
      expect(trip(wrong.app)).toEqual(before);
      // Right: up one, then across to the crystal.
      app = step(app, 24).app;
      expect([trip(app).pos, trip(app).seen[18]]).toEqual([24, false]);
      const found = step(app, 25);
      expect(found.said).toBe('Right! Zib found a crystal 💎!');
      app = found.app;
      expect([trip(app).pos, trip(app).items[25], trip(app).bag]).toEqual([25, '', [{ k: 'crystal', by: me(app).moon.aliens[0].id, card: '' }]]);
      const v = tripView(app);
      expect([v.bagLine, v.countLine, v.title]).toEqual(['💎', '1 finds · the bag holds 6', 'Planet Zuma']);
      expect(v.rows).toHaveLength(6);
      expect(v.rows[4].cells[1]).toEqual(expect.objectContaining({ at: 25, me: true, edge: 'here', species: 'blob', kind: 'plain' }));
      expect(v.rows[4].cells.map((c: { edge: string }) => c.edge)).toEqual(['near', 'here', 'near', 'none', 'none', 'none']);
      expect(v.rows[0].cells[0]).toEqual(expect.objectContaining({ kind: 'fog', glyph: '' }));
      // Answering with no tile aimed is refused.
      expect(tripAct(app, 'answer', { correct: true }).why).toBe('noAim');
    });

    it('🔴 the lantern clears the fog on all four sides with each right answer; without it, only the tile walked onto', () => {
      let app = landed(herMoon());
      app = step(app, 24).app;
      expect([18, 25].map((i) => trip(app).seen[i])).toEqual([false, false]);
      app = moonAct(app, 'build', { thingId: 'lantern' }).app;
      expect(me(app).moon.gear).toEqual(['lantern']);
      const lit = step(app, 25);
      expect(lit.said).toBe('Right! Zib found a crystal 💎!');
      expect([19, 26, 31, 24].map((i) => trip(lit.app).seen[i])).toEqual([true, true, true, true]);
    });

    it('🔴 water needs a swimmer: a Blob is refused at seen water, fog that turns out to be water stops it, and a Squiggle swims in for the shell', () => {
      let app = landed(herMoon());
      for (const at of [24, 25, 26]) app = step(app, at).app;
      // 20 is water under fog: a right answer shows it, and the Blob stays where it is.
      const wet = step(app, 20);
      expect(wet.said).toBe('Right! But that tile is water: Zib can’t swim. A Squiggle can.');
      app = wet.app;
      expect([trip(app).pos, trip(app).seen[20]]).toEqual([26, true]);
      expect(tripAct(app, 'aim', { at: 20 }).said).toBe('Zib can’t swim. A Squiggle can: switch aliens.');
      expect(tripView(app).tip).toMatch(/Water needs a swimmer: switch to a Squiggle\.$/);
      const swap = tripAct(app, 'crew', { alienId: me(app).moon.aliens[1].id });
      expect(swap.said).toBe('Wiggo takes the lead. It can swim!');
      app = step(swap.app, 20).app;
      app = step(app, 21).app;
      expect(trip(app).bag.map((b: { k: string }) => b.k)).toEqual(['crystal', 'postcard', 'shell']);
      expect(tripView(app).crew.map((c: { label: string }) => c.label)).toEqual(['Zib', 'Wiggo · swims']);
    });

    it('🔴 a crater takes the jetpack, once a trip; climbing out is free; the gear never answers the question', () => {
      let app = landed(herMoon());
      for (const at of [24, 25, 26, 27, 28]) app = step(app, at).app;
      app = step(app, 22, false).app; // fog: wrong, nothing seen
      expect(trip(app).seen[22]).toBe(false);
      const noJet = step(app, 22);
      expect(noJet.said).toBe('Right! But that tile is a crater: it takes the jetpack.');
      app = noJet.app;
      expect(tripAct(app, 'aim', { at: 22 }).why).toBe('crater');
      app = moonAct(app, 'build', { thingId: 'jetpack' }).app;
      // The question is still asked: a wrong answer with the jetpack moves nothing.
      expect(trip(step(app, 22, false).app).pos).toBe(28);
      app = step(app, 22).app;
      expect([trip(app).pos, trip(app).hopped, trip(app).bag.map((b: { k: string }) => b.k).pop()]).toEqual([22, true, 'meteor']);
      app = step(app, 28).app; // out again, free
      me(app).moon.trip.map[29] = 'c';
      me(app).moon.trip.seen[29] = true;
      expect(tripAct(app, 'aim', { at: 29 }).why).toBe('hopped');
    });

    it('🔴 the bag holds six, the big boots two more; a find that will not fit waits on its tile', () => {
      let app = landed(herMoon());
      me(app).moon.trip.bag = Array.from({ length: 6 }, () => ({ k: 'fossil', by: '', card: '' }));
      app = step(app, 24).app;
      const full = step(app, 25);
      expect(full.said).toBe('Right! Zib walks on. The bag is full: come home to empty it, and the 💎 waits here.');
      expect([trip(full.app).pos, trip(full.app).items[25], trip(full.app).bag.length]).toEqual([25, 'crystal', 6]);
      app = moonAct(full.app, 'build', { thingId: 'boots' }).app;
      app = step(step(app, 24).app, 25).app;
      expect([trip(app).bag.length, tripView(app).countLine]).toEqual([7, '7 finds · the bag holds 8']);
    });

    it('🔴 Come home brings everything: the finds counted, seeds to plant, an egg to hatch free, new postcards, and each alien’s own finds; nothing is lost', () => {
      let app = landed(herMoon());
      for (const at of [24, 25, 26, 27]) app = step(app, at).app;
      // The pond is in the way (20, 21), so back along the row and up the left side to the egg clue at 0.
      for (const at of [26, 25, 24, 18, 12, 6, 0]) app = step(app, at).app;
      const bag = trip(app).bag.map((b: { k: string }) => b.k);
      expect(bag).toEqual(['crystal', 'postcard', 'seed', 'egg']);
      expect(trip(app).bag[1].card).toBe('volcano');
      const home = tripAct(app, 'home');
      expect([home.ok, home.said]).toEqual([true, 'Home safe with 💎 📮 🌱 🥚! Everything goes in the Alien Book.']);
      const moon = me(home.app).moon;
      expect([moon.trip, moon.trips, moon.finds, moon.seeds, moon.eggs, moon.cards, moon.aliens[0].finds]).toEqual([null, 1, { crystal: 1, postcard: 1, seed: 1, egg: 1 }, 1, 1, ['volcano'], 4]);
      // The egg from the trip hatches free, with an alien never had.
      const v = moonView(home.app);
      expect(v.bigs[0]).toEqual(expect.objectContaining({ id: 'clue', line: 'free · ×1 · tap to hatch it', use: true }));
      expect(v.findsLine).toBe('Found on expeditions: 💎 ×1  🌱 ×1  📮 ×1  🥚 ×1');
      const spent = me(home.app).model.spent;
      const hatched = moonAct(home.app, 'egg', { thingId: 'clue' });
      expect([hatched.ok, me(hatched.app).moon.eggs, me(hatched.app).model.spent, me(hatched.app).moon.aliens.length]).toEqual([true, 0, spent, 3]);
      expect(moonAct(hatched.app, 'egg', { thingId: 'clue' }).why).toBe('noEgg');
      // The next postcard found is the next one not had yet.
      let again = landed(home.app);
      again = step(step(step(again, 24).app, 25).app, 26).app;
      expect(trip(again).bag.map((b: { card: string }) => b.card)).toEqual(['', 'rings']);
      // An empty bag comes home too.
      expect(tripAct(landed(herMoon()), 'home').said).toBe('Home safe. Nothing found this time, and nothing lost.');
      expect(tripAct(home.app, 'home').why).toBe('noTrip');
    });

    it('🔴 a trip survives a reload and travels in the save code; the old map shows the egg clue under the fog', () => {
      let app = landed(herMoon());
      app = step(step(app, 24).app, 25).app;
      const view = tripView(app);
      const reloaded = JSON.parse(JSON.stringify(app));
      expect(tripView(reloaded)).toEqual(view);
      const code = runScript(ENCODE_SAVE_SCRIPT, { app }).code;
      const there = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code });
      expect(tripView(there.app).rows).toEqual(view.rows);
      expect(view.rows[0].cells[0].glyph).toBe('');
      app = moonAct(app, 'build', { thingId: 'map' }).app;
      expect(tripView(app).rows[0].cells[0]).toEqual(expect.objectContaining({ kind: 'fog', glyph: '🥚' }));
      // A broken trip is no trip: the moon still opens.
      me(app).moon.trip = { map: [1, 2, 3] };
      expect([tripView(app).has, tripView(app).canStart]).toEqual([false, true]);
    });

    it('gear is bought once from the moon with earned stars, says what it does, and is greyed when too dear', () => {
      let app = herMoon(160);
      const spent = me(app).model.spent;
      const gear = moonView(app).gear;
      expect(gear.map((g: ViewRow) => g.id)).toEqual(['lantern', 'jetpack', 'map', 'boots']);
      expect(gear[0]).toEqual(expect.objectContaining({ glyph: '🔦', label: 'Lantern', line: '120 ⭐ · each right answer clears the fog on all four sides', ask: false, dim: true }));
      expect(gear[1]).toEqual(expect.objectContaining({ ask: true, dim: false }));
      const jet = moonAct(app, 'build', { thingId: 'jetpack' });
      expect(jet.said).toBe('🎒 Jetpack for expeditions: hop into one crater a trip.');
      app = jet.app;
      expect(me(app).model.spent).toBe(spent + 60);
      expect(moonView(app).gear[1]).toEqual(expect.objectContaining({ worn: true, ask: false, line: 'Yours ✓ · hop into one crater a trip' }));
      expect(moonAct(app, 'build', { thingId: 'jetpack' }).why).toBe('owned');
      expect(moonAct(app, 'build', { thingId: 'lantern' }).why).toBe('tooDear');
    });

    it('🔴 Alien school: a right answer teaches the alien a topic, a full topic stays full, a wrong one changes nothing; the bars never go down', () => {
      let app = herMoon();
      const zib = () => me(app).moon.aliens[0];
      const r = schoolAct(app, 'teach', { correct: true, topic: 'tables' });
      expect(r.said).toBe('“Oh! I see. Times tables: 1 of 5. Another one?”');
      app = r.app;
      const before = JSON.parse(JSON.stringify(me(app).moon));
      const miss = schoolAct(app, 'teach', { correct: false, topic: 'tables' });
      expect([miss.ok, miss.said]).toEqual([true, '“Hmm, tricky. Shall we try one like it?”']);
      expect(me(miss.app).moon).toEqual(before);
      for (let i = 0; i < 3; i++) app = schoolAct(app, 'teach', { correct: true, topic: 'tables' }).app;
      expect(schoolAct(app, 'teach', { correct: true, topic: 'tables' }).said).toBe('“I get Times tables now! Look at me!”');
      app = schoolAct(app, 'teach', { correct: true, topic: 'tables' }).app;
      expect(schoolAct(app, 'teach', { correct: true, topic: 'tables' }).said).toBe('“I knew that one, thank you!”');
      expect(zib().taught).toEqual({ tables: 5 });
      const v = schoolView(app);
      expect([v.title, v.topics]).toEqual(['Zib is stuck', [{ id: 'tables', label: 'Times tables', line: 'Learned ✓', pct: 100 }]]);
      expect(schoolAct(app, 'teach', { correct: true, topic: '' }).why).toBe('noTopic');
    });

    it('🔴 the fourth form: three topics make a grown-up a Scholar; twenty finds an Explorer; its favourite ten times a Superstar; a young one waits, and a form is kept', () => {
      let app = herMoon();
      const zib = () => me(app).moon.aliens[0];
      zib().meals = 10; // young
      const teachTopic = (t: string) => { for (let i = 0; i < 5; i++) app = schoolAct(app, 'teach', { correct: true, topic: t }).app; };
      teachTopic('tables');
      teachTopic('divide');
      teachTopic('bonds');
      expect([zib().forms, schoolView(app).formLine]).toEqual([[], 'Zib grows up first (8 more meals): the fourth form comes after.']);
      // Grown up by eating, and the form it earned comes with it.
      let said = '';
      for (let i = 0; i < 8; i++) { const r = moonAct(app, 'feed', { foodId: 'strawberry' === zib().fav ? 'cookie' : 'strawberry' }); app = r.app; said = r.said; }
      expect(said).toMatch(/Zib grew! Zib became a Scholar!$/);
      expect([zib().forms, zib().form]).toEqual([['scholar'], 'scholar']);
      expect(moonView(app).aliens[0]).toEqual(expect.objectContaining({ form: 'scholar', line: 'Scholar' }));
      const v = schoolView(app);
      expect(v.forms.map((f: ViewRow) => f.line)).toEqual(['Showing ✓ · tap to put away', 'bring home 20 finds with it · 0 of 20', 'its favourite food, 10 times · 0 of 10']);
      expect(v.evo.map((e: ViewRow) => [e.name, e.grown, e.form, e.selected])).toEqual([['Baby', 0, '', false], ['Young', 1, '', false], ['Grown up', 2, '', false], ['Scholar', 2, 'scholar', true]]);
      // Put away, and shown again; one not taken cannot be shown.
      app = schoolAct(app, 'form', { formId: 'scholar' }).app;
      expect(zib().form).toBe('');
      expect(schoolAct(app, 'form', { formId: 'explorer' }).why).toBe('notOwned');
      // Superstar: its favourite, ten times.
      for (let i = 0; i < 10; i++) app = moonAct(app, 'feed', { foodId: zib().fav }).app;
      expect([zib().forms, zib().favs]).toEqual([['scholar', 'superstar'], 10]);
      // Explorer: twenty finds brought home with it.
      app = landed(app);
      me(app).moon.trip.bag = Array.from({ length: 20 }, () => ({ k: 'fossil', by: zib().id, card: '' }));
      const home = tripAct(app, 'home');
      expect(home.said).toMatch(/ Zib became an Explorer!$/);
      expect(me(home.app).moon.aliens[0].forms).toEqual(['scholar', 'superstar', 'explorer']);
    });

    it('🔴 the garden: built once; a seed from a trip planted; ripe once enough stars are earned; picked as free meals that feed for nothing', () => {
      let app = herMoon(2000);
      expect(moonAct(app, 'plant').why).toBe('noGarden');
      app = moonAct(app, 'build', { thingId: 'garden' }).app;
      expect(moonAct(app, 'plant').why).toBe('noSeed');
      me(app).moon.seeds = 2;
      const planted = moonAct(app, 'plant');
      expect(planted.said).toBe('A seed is planted. Every right answer waters it!');
      app = planted.app;
      let v = moonView(app);
      expect([v.hasGarden, v.canPlant, v.plantLine, v.plots[0].line, v.plots[0].use]).toEqual([true, true, '🌱 Plant a seed · 1 to plant', '15 more ⭐ to earn', false]);
      expect(moonAct(app, 'pick', { thingId: '0' }).why).toBe('notRipe');
      // Stars earned water it (spending does not).
      app = runScript(SAVE_MODEL_SCRIPT, { app, model: { ...me(app).model, stars: me(app).model.stars + 15 } }).app;
      v = moonView(app);
      expect([v.plots[0].use, v.plots[0].line]).toEqual([true, 'Ripe! Tap to pick']);
      const crop = me(app).moon.plots[0].food;
      const picked = moonAct(app, 'pick', { thingId: '0' });
      expect(picked.said).toMatch(/ picked: 3 free meals!$/);
      app = picked.app;
      expect([me(app).moon.plots, me(app).moon.larder]).toEqual([[], { [crop]: 3 }]);
      const food = moonView(app).foods[0];
      expect(food).toEqual(expect.objectContaining({ id: crop, line: 'free · ×3', use: true, cost: 0 }));
      const spent = me(app).model.spent;
      app = moonAct(app, 'feed', { foodId: crop }).app;
      expect([me(app).model.spent, me(app).moon.larder[crop], me(app).moon.aliens[0].meals]).toEqual([spent, 2, 21]);
      app = moonAct(moonAct(app, 'feed', { foodId: crop }).app, 'feed', { foodId: crop }).app;
      expect([me(app).moon.larder, moonAct(app, 'feed', { foodId: crop }).why]).toEqual([{}, 'noFood']);
    });

    it('🔴 the new things to wear: headphones and a flower crown on the head, little wings and a cape on the back, each bought once', () => {
      let app = herMoon(1000);
      const wear = moonView(app).wear;
      expect(wear.map((w: ViewRow) => w.id).slice(-4)).toEqual(['headphones', 'flowers', 'cape', 'wings']);
      expect(wear.find((w: ViewRow) => w.id === 'wings')).toEqual(expect.objectContaining({ line: '150 ⭐', back: 'wings', hat: '', showAlien: true }));
      app = moonAct(app, 'buy', { wearId: 'crown' }).app;
      app = moonAct(app, 'buy', { wearId: 'wings' }).app;
      expect(me(app).moon.aliens[0].wear).toEqual({ hat: 'crown', eyes: '', neck: '', back: 'wings' });
      expect(moonView(app)).toEqual(expect.objectContaining({ selBack: 'wings', selHat: 'crown' }));
      app = moonAct(app, 'buy', { wearId: 'cape' }).app;
      expect(me(app).moon.aliens[0].wear.back).toBe('cape');
    });

    it('the moon says what there is to aim for, and the frame hangs the postcards', () => {
      let app = herMoon(400);
      me(app).moon.cards = ['volcano', 'rings'];
      const goals = moonView(app).goals;
      expect(goals.map((g: { id: string }) => g.id)).toEqual(['book', 'dome', 'form', 'cards']);
      expect(goals[0]).toEqual({ id: 'book', label: 'Alien Book', line: '2 of 36 aliens met', pct: 6 });
      expect(goals[1]).toEqual(expect.objectContaining({ label: 'Crater Dome', pct: Math.round((100 * moonView(app).purse) / 1000) }));
      expect(goals[3]).toEqual({ id: 'cards', label: 'Postcards', line: '2 of 20 found on trips', pct: 10 });
      expect(moonView(app).hasFrame).toBe(false);
      app = moonAct(app, 'build', { thingId: 'frame' }).app;
      const v = moonView(app);
      expect([v.hasFrame, v.cardsLine, v.cards.map((c: ViewRow) => c.glyph)]).toEqual([true, 'Postcards · 2 of 20', ['🌋', '🪐']]);
      expect(v.tripLine).toBe('Explore a planet with an alien. Your answers move it.');
      expect(moonView(landed(app)).tripLine).toBe('Your trip to Zuma is waiting: 0 finds in the bag.');
    });

    it('the Expedition and the school speak French to a French player', () => {
      let app = landed(herMoon(2000, 'fr'));
      expect(tripView(app).title).toBe('Planète Zuma');
      app = step(app, 24).app;
      expect(step(app, 25).said).toBe('Juste ! Zib a trouvé : 💎 cristal !');
      expect(tripAct(app, 'home').said).toBe('De retour. Rien trouvé cette fois, et rien perdu.');
      expect(schoolAct(app, 'teach', { correct: true, topic: 'tables' }).said).toBe('« Oh ! Je vois. Tables de multiplication : 1 sur 5. Encore une ? »');
      expect(schoolView(app).title).toBe('Zib est bloqué');
    });

    it('the verdict line on a trip is a step, and at school a lesson; a wrong one loses nothing', () => {
      const grade = (game: string, typed: string) => runScript(GRADE_ANSWER_SCRIPT, { model: freshModel(), skillId: 'mul-2-5-10', level: 'CM1', lang: 'en', answer: '10', typed, fluentMs: 4000, shownAt: Date.now() - 1000, game });
      expect(grade('trip', '10').boost).toMatch(/^🧭 1\.0 s · one step$/);
      expect(grade('trip', '9').boost).toBe('No step · nothing lost');
      expect(grade('school', '10').boost).toMatch(/^🎓 1\.0 s · taught$/);
      expect(grade('school', '9').boost).toBe('Still learning');
    });
  });

  // ── TPL-013 SC-5 — skin tones, for both games (Richard, 2026-10-15) ──
  describe('TPL-013 SC-5 — a skin a child picks, kept with what they wear', () => {
    const me = (app: any) => app.profiles.find((p: Profile) => p.id === app.activeId);
    const make = (skin?: string, look = 'big-smile') => runScript(CREATE_PROFILE_SCRIPT, { app: undefined, name: 'Ada', look, seed: 'Ada', lang: 'en', skin }).app;

    it('five tones, each its own colour and its own ✋, light to dark', () => {
      expect(SKIN_TONES.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4', 't5']);
      expect(new Set(SKIN_TONES.map((t) => t.hex)).size).toBe(5);
      expect(SKIN_TONES.map((t) => t.hand)).toEqual(['✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿']);
      // Light to dark by luminance, so the row reads in order.
      const lum = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
      const l = SKIN_TONES.map((t) => lum(t.hex));
      expect(l).toEqual([...l].sort((a, b) => b - a));
    });

    it('🔴 a skin picked on the form is the face’s skin on every look, and it reads back as the one picked', () => {
      for (const look of HANGAR_LOOKS) {
        const a = runScript(ACTIVE_PROFILE_SCRIPT, { app: make('t4', look) });
        expect({ look, skin: a.skin, skinColor: a.faceOptions.skinColor }).toEqual({ look, skin: 't4', skinColor: ['8d5524'] });
      }
    });

    it('none picked: no skinColor at all, so DiceBear keeps its own range (Rocket School’s faces, unchanged — the control)', () => {
      const a = runScript(ACTIVE_PROFILE_SCRIPT, { app: make() });
      expect([a.skin, a.faceOptions]).toEqual(['', {}]);
      expect(me(make()).wear).toBeUndefined();
    });

    it('a skin that is not one of the five is refused, at making and at changing', () => {
      expect(me(make('purple')).wear).toBeUndefined();
      let app = make('t2');
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, skin: '#000' }).app;
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).skin).toBe('t2');
    });

    it('🔴 changing the skin keeps everything worn (a hat on the face, the rocket’s paint), and what is worn keeps the skin', () => {
      let app = make('t1', 'pixel-art');
      me(app).wear = { ...me(app).wear, face: { 'pixel-art': { hat: 'variant03' } }, paint: 'var(--chart-2)' };
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, skin: 't5' }).app;
      const a = runScript(ACTIVE_PROFILE_SCRIPT, { app });
      expect([a.skin, a.faceOptions.skinColor, a.faceOptions.hat, a.paint]).toEqual(['t5', ['5c3317'], ['variant03'], 'var(--chart-2)']);
      // The other way: putting an item on goes through wearOf, which must not drop the skin.
      const item = HANGAR_SHELF.find((i) => i.kind === 'face' && i.free === true && i.faces && (i.faces as any)['pixel-art']);
      if (item) {
        app = runScript(WEAR_ITEM_SCRIPT, { app, shelf: HANGAR_SHELF, itemId: item.id }).app;
        expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).skin).toBe('t5');
      }
    });

    it('🔴 the skin survives a reload (the store is JSON) and the save code, and a code from before it restores with none', () => {
      const app = JSON.parse(JSON.stringify(make('t3')));
      expect(runScript(ACTIVE_PROFILE_SCRIPT, { app }).skin).toBe('t3');
      const code = runScript(ENCODE_SAVE_SCRIPT, { app }).code;
      const there = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code });
      expect([there.ok, runScript(ACTIVE_PROFILE_SCRIPT, { app: there.app }).skin]).toEqual([true, 't3']);
      const old = runScript(ENCODE_SAVE_SCRIPT, { app: make() }).code;
      const back = runScript(DECODE_SAVE_SCRIPT, { app: { profiles: [], activeId: '', sets: [] }, code: old });
      expect([back.ok, runScript(ACTIVE_PROFILE_SCRIPT, { app: back.app }).skin]).toEqual([true, '']);
    });

    it('the form’s face, before there is a player: the skin picked, or nothing for DiceBear to override', () => {
      expect(runScript(SKIN_FACE_SCRIPT, { skin: 't2' }).options).toEqual({ skinColor: ['e0ac80'] });
      expect(runScript(SKIN_FACE_SCRIPT, { skin: '' }).options).toEqual({});
      expect(runScript(SKIN_FACE_SCRIPT, { skin: 'nope' }).options).toEqual({});
    });
  });
});
