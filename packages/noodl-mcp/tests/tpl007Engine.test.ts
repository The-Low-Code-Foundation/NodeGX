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
  NEW_BOARD_SCRIPT,
  PARSE_SET_SCRIPT,
  PICK_ITEM_SCRIPT,
  PICK_QUESTION_SCRIPT,
  RACE_STEP,
  SAVE_MODEL_SCRIPT,
  SELECT_PROFILE_SCRIPT,
  SLIDE_MERGE_SCRIPT,
  STAR_RULE,
  TEACH_CARD_SCRIPT,
  TOGGLE_INDEX_SCRIPT,
  TRANSLATE_SCRIPT,
  UPDATE_SETTINGS_SCRIPT,
  UPSERT_SET_SCRIPT,
  WEAR_ITEM_SCRIPT,
  portsOf,
  runScript
} from './tpl007Scripts';

const WORD_ROWS = WORD_KEYS.map((key) => ({ key, ...require('./tpl007Curriculum').WORDS[key] }));
const WORD_LIST_ROWS = [{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: WORD_LISTS.fr }];

/** Run a helper function out of HELPERS by name. */
function helper<T>(name: string, ...args: unknown[]): T {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const fn = new Function('args', `${HELPERS}; return ${name}.apply(null, args);`);
  return fn(args) as T;
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
        const q = pick({ curriculum: [skill], level: skill.level, lang, layout: lang === 'fr' ? 'azerty' : 'qwerty', mode: skill.strand === 'typing' ? 'typing' : 'maths' });
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
      expect(en.rows.map((r: any) => r.cells.length)).toEqual([4, 4, 4, 4]);
      expect(en.rows[0].cells.map((c: any) => c.kind)).toEqual(['empty', 'unit', 'ten', 'tens']);
      expect([en.rows[1].cells[0].kind, en.rows[1].cells[1].kind]).toEqual(['big', 'unit']);
      expect(en.rows[0].cells.map((c: any) => c.fx)).toEqual(['rkt-merge-tile', 'rkt-merge-tile rkt-land-b', 'rkt-merge-tile rkt-join-b', 'rkt-merge-tile']);
      expect(runScript(DRAW_MERGE_SCRIPT, { game: { ...game, moves: 4 }, lang: 'en' }).rows[0].cells[2].fx).toBe('rkt-merge-tile rkt-join-a');
      expect([en.rows[3].cells[3].word, runScript(DRAW_MERGE_SCRIPT, { game, lang: 'fr' }).rows[3].cells[3].word]).toEqual(['1,234', '1 234']);
      // A repeater row needs an id, or a re-run piles rows up.
      expect(new Set(en.rows.flatMap((r: any) => [r.id, ...r.cells.map((c: any) => c.id)])).size).toBe(20);
      expect([en.phase, en.over, runScript(DRAW_MERGE_SCRIPT, { game: { ...game, over: true }, lang: 'en' }).phase]).toEqual(['playing', false, 'over']);
      expect(runScript(DRAW_MERGE_SCRIPT, {}).rows.flatMap((r: any) => r.cells.map((c: any) => c.kind))).toEqual(Array(16).fill('empty'));
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
      const keys = [...new Set([...rows.flatMap((r: any) => Object.keys(r)), ...rows.flatMap((r: any) => r.cells.flatMap((c: any) => Object.keys(c)))])].sort();
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
    const draw = (game: any, lang = 'en') => runScript(DRAW_HUNT_SCRIPT, { game, lang });
    const kinds = (d: any): string[] => d.rows.flatMap((r: any) => r.cells.map((c: any) => c.kind));
    const fxRow = (d: any, r = 0): string[] => d.rows[r].cells.map((c: any) => c.fx);
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
      expect(d.rows.map((r: any) => r.cells.length)).toEqual([4, 4, 4, 4]);
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
      expect(new Set(d.rows.flatMap((r: any) => [r.id, ...r.cells.map((c: any) => c.id)])).size).toBe(20);
      const empty = runScript(DRAW_HUNT_SCRIPT, {});
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
      const keys = [...new Set([...rows.flatMap((r: any) => Object.keys(r)), ...rows.flatMap((r: any) => r.cells.flatMap((c: any) => Object.keys(c)))])].sort();
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
    const next = (g: any) => runScript(MONSTER_MOVE_SCRIPT, { game: g, action: 'next' });
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
      expect(app.profiles.some((p: any) => p.name === 'Léa')).toBe(false);
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
    const MATHS = CURRICULUM.filter((skill) => skill.strand !== 'typing');

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
            const q = pick({ curriculum: [skill], level: skill.level, lang, mode: skill.strand === 'typing' ? 'typing' : 'maths' });
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
    const MATHS = CURRICULUM.filter((skill) => skill.strand !== 'typing');
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

  describe('PLY-006 — the comeback: earned, visible, and only when behind', () => {
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

    it('🔴 AC5: three right answers in a row charge one ⚡; a wrong answer breaks the chain but never discharges it; it is spent only while behind', () => {
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

    it('🔴 AC5: firing a turbo doubles the answer that spends it, and asking for one you have not got, or while level, does nothing', () => {
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
      // Level with the computer: the turbo is not spent and the answer is a plain one.
      const level = right({ model: held, myAt: 0.5, cpuAt: 0.5, useTurbo: true });
      expect([level.turboUsed, level.turbo]).toEqual([false, 1]);
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
    const me = (app: any) => app.profiles.find((p: any) => p.id === app.activeId);
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
      expect(shown.rows.map((r: any) => r.id)).not.toContain('crown');
      expect([shown.elsewhere, shown.elsewhereText]).toEqual([1, expect.stringMatching(/1 objet t’appartient/)]);
      // Still owned, and worn again the moment the face comes back (wear is keyed by look).
      expect(me(app).owned).toEqual(['crown']);
      app = runScript(UPDATE_SETTINGS_SCRIPT, { app, look: 'big-smile' }).app;
      expect(runScript(HANGAR_SHELF_SCRIPT, { app, shelf, tab: 'face' }).rows.find((r: any) => r.id === 'crown').worn).toBe(true);
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
});
