/**
 * TPL-013 — the gate over Rocket School's Sub-Saharan Africa edition.
 *
 * - **Nothing French survives** that the edition says it changed: no CE2 · CM1 ·
 *   CM2 · 6e, no euro, no French history, no old name or save key.
 * - **Rocket School is untouched**: the edition never mutates the components it
 *   is given.
 * - **The money question is asked in the edition's money**, in both languages,
 *   and the answer the child types is the scaled one (₦600, not 6).
 * - **SC-1: nine classes**, P1 to JSS3: the form offers them, every script
 *   carries the ladder's tables (never Rocket's four), Number Hunt and Make Ten
 *   draw from every class's row, a new player is rated two classes below the
 *   one picked, and a class with nothing to ask borrows the nearest one.
 * - **The checked-in `templates/star-class/` is what the generator
 *   writes today** (the drift gate TPL-007 has).
 *
 * @module noodl-mcp/tests/tpl013Edition.test
 */
import * as fs from 'fs';
import * as path from 'path';

import { CURRICULUM, LEVELS, WORD_LISTS } from './tpl007Curriculum';
import { TPL007_COMPONENTS } from './tpl007Components';
import { HUNT_LEVEL_KINDS, LEVEL_BASE, MERGE_POOL_GROUPS, runScript } from './tpl007Scripts';
import { buildRocketTemplateProject, prepareRocketArtefact, START_HERE_FILE } from './tpl007Template';
import {
  AFRICA_EDITION,
  editionComponents,
  editionCurriculum,
  editionHuntKinds,
  editionLevelBase,
  editionStartHere,
  editionTopics,
  editionTeachCards,
  frenchLeftIn,
  JUMP_CARD,
  OPTION_SIZE_SCRIPT,
  replaceCounted,
  withNodes
} from './tpl013Edition';
import { YOUNG_GENERATORS, YOUNG_KINDS, YOUNG_SKILLS } from './tpl013Young';
import { JSS_SKILLS, JSS_SOURCES } from './tpl013Jss';
import { BANK_SKILLS, BANK_SOURCES, BANK_TOPICS } from './tpl013Banks';

jest.setTimeout(600_000);

const edition = AFRICA_EDITION;
const OUTPUT = path.join(__dirname, '..', '..', '..', 'templates', edition.id);
const CLASSES = edition.classes;
const COMPONENTS = editionComponents();

function scriptOf(componentPath: string): string {
  const c = COMPONENTS.find((x) => x.path === componentPath);
  const node = c?.nodes.find((n) => (n as { parameters?: { functionScript?: string } }).parameters?.functionScript) as
    | { parameters: { functionScript: string } }
    | undefined;
  if (!node) throw new Error(`no script in ${componentPath}`);
  return node.parameters.functionScript;
}

function askProportion(lang: 'en' | 'fr') {
  return runScript(scriptOf('Logic/Pick next question'), {
    curriculum: editionCurriculum(),
    model: { rating: 0, skills: {}, lastSkill: '', answered: 0 },
    level: edition.levels['6e'],
    lang,
    layout: 'qwerty',
    mode: 'maths',
    answerMode: 'typed',
    focus: ['proportion'],
    wordLists: [{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: WORD_LISTS.fr }],
    nonce: 1
  });
}

/** Mirrors the edition's PLAY_AT: a child is in a class once their rating is this far above its base. */
const PLAY_AT = 190;
const fresh = () => ({ rating: 0, skills: {} as Record<string, unknown>, lastSkill: '', answered: 0 });
/** A model rated into the start of a class (the edition's classRating): what a child who has climbed there carries. */
const ratedAt = (c: string) => ({ ...fresh(), rating: editionLevelBase()[c] + PLAY_AT + 50 });

function pick(over: Record<string, unknown> = {}) {
  return runScript(scriptOf('Logic/Pick next question'), {
    curriculum: editionCurriculum(),
    model: fresh(),
    level: 'P5',
    lang: 'en',
    layout: 'qwerty',
    mode: 'maths',
    answerMode: 'auto',
    wordLists: [{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: WORD_LISTS.fr }],
    nonce: 1,
    ...over
  });
}

const levelOf = (id: string) => String(editionCurriculum().find((s) => s.id === id)?.level);
const classesAsked = (over: Record<string, unknown>, n = 60) => [...new Set(Array.from({ length: n }, () => levelOf(pick(over).skillId)))].sort();

describe('TPL-013 the edition', () => {
  it('leaves nothing French it says it changed', () => {
    expect(frenchLeftIn(editionComponents())).toEqual([]);
  });

  it('the census sees a class name when one is left (the known-firing control)', () => {
    expect(frenchLeftIn(TPL007_COMPONENTS).some((f) => f.what === 'CM1')).toBe(true);
  });

  it('does not change the components it is given', () => {
    const before = JSON.stringify(TPL007_COMPONENTS);
    editionComponents();
    expect(JSON.stringify(TPL007_COMPONENTS)).toBe(before);
  });

  it('files every skill in one of its own classes, and drops only history and typing', () => {
    const skills = editionCurriculum();
    expect(skills.every((s) => CLASSES.includes(String(s.level)))).toBe(true);
    expect(skills.filter((s) => s.subject === 'history' || s.subject === 'typing')).toEqual([]);
    expect(skills.length).toBe(CURRICULUM.filter((s) => s.subject !== 'history' && s.subject !== 'typing').length + YOUNG_SKILLS.length + JSS_SKILLS.length + BANK_SKILLS.length);
    const used = new Set(skills.map((s) => s.teach).filter(Boolean));
    expect(editionTeachCards().every((c) => used.has(c.id))).toBe(true);
  });

  it('asks the money question in naira in English, with the scaled answer', () => {
    for (let i = 0; i < 20; i++) {
      const q = askProportion('en');
      expect(q.skillId).toBe('proportion');
      expect(q.prompt).toMatch(/^\d exercise books cost ₦[\d,]+00\. How much do \d exercise books cost\?$/);
      expect(Number(q.answer) % 100).toBe(0);
      expect(q.worked).toContain('₦');
      expect(q.worked).not.toContain('€');
    }
  });

  it('asks it in CFA francs in French', () => {
    const q = askProportion('fr');
    expect(q.prompt).toMatch(/cahiers coûtent [\d   ]+ FCFA\. Combien coûtent \d cahiers \?$/);
    expect(Number(q.answer) % 100).toBe(0);
    expect(q.worked).toContain('FCFA');
  });

  it('takes the keyboard choice out of the player menu, with its wires', () => {
    const header = editionComponents().find((c) => c.path === 'Game/Header')!;
    const text = JSON.stringify(header);
    expect(text).not.toContain('"hdKeys"');
    expect(text).not.toContain('"hdKeyItems"');
    const before = TPL007_COMPONENTS.find((c) => c.path === 'Game/Header')!;
    expect(JSON.stringify(before)).toContain('"hdKeys"');
    expect(header.connections.length).toBe(before.connections.length - 5);
  });

  it('refuses a replacement that does not match the count it expects', () => {
    expect(() => replaceCounted('a a', 'a', 'b', 1, 'here')).toThrow('expected 1');
    expect(replaceCounted('a a', 'a', 'b', 2, 'here')).toBe('b b');
  });

  it('is what the generator writes today (drift)', async () => {
    const built = await buildRocketTemplateProject({ components: editionComponents(), projectName: edition.name });
    const tmp = path.join(fs.mkdtempSync(path.join(require('os').tmpdir(), 'tpl013-')), edition.id);
    prepareRocketArtefact(built, tmp, {
      id: edition.id,
      writeStartHere: (out) => {
        fs.mkdirSync(path.join(out, path.dirname(START_HERE_FILE)), { recursive: true });
        fs.writeFileSync(path.join(out, START_HERE_FILE), editionStartHere(edition));
      }
    });
    const list = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(path.join(dir, e.name)).map((f) => `${e.name}/${f}`) : [e.name])).sort();
    const want = list(tmp);
    expect(list(OUTPUT)).toEqual(want);
    const differing = want.filter((f) => !fs.readFileSync(path.join(tmp, f)).equals(fs.readFileSync(path.join(OUTPUT, f))));
    expect(differing).toEqual([]);
  });
});

describe('TPL-013 SC-1 nine classes', () => {
  const base = editionLevelBase();

  it('offers the nine classes in the new-player form, youngest first', () => {
    const form = COMPONENTS.find((c) => c.path === 'Profiles/New player form')!;
    const items = form.nodes.find((n) => (n as { id: string }).id === 'nfLevelItems') as { parameters: { json: string } };
    expect(JSON.parse(items.parameters.json).map((i: { value: string }) => i.value)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'JSS1', 'JSS2', 'JSS3']);
  });

  it('every script that carries the class tables carries the ladder, and none keeps Rocket School’s four', () => {
    const scripts = (cs: ReadonlyArray<(typeof COMPONENTS)[number]>) =>
      cs.flatMap((c) => c.nodes.map((n) => (n as { parameters?: { functionScript?: string } }).parameters?.functionScript).filter((x): x is string => !!x));
    const rocket = scripts(TPL007_COMPONENTS).filter((x) => x.includes('var LEVELS = ')).length;
    const mine = scripts(COMPONENTS).filter((x) => x.includes('var LEVELS = '));
    expect(rocket).toBeGreaterThan(10);
    expect(mine.length).toBe(rocket);
    for (const x of mine) {
      expect(x).toContain(`var LEVELS = ${JSON.stringify(CLASSES)};`);
      expect(x).toContain(`var LEVEL_BASE = ${JSON.stringify(base)};`);
      expect(x).toContain('var START_BELOW = 2;');
    }
    for (const x of scripts(COMPONENTS)) {
      expect(x).not.toContain(`var LEVELS = ${JSON.stringify(LEVELS)}`);
      expect(x).not.toContain(`var HUNT_LEVEL_KINDS = ${JSON.stringify(HUNT_LEVEL_KINDS)}`);
      expect(x).not.toContain(`var MERGE_POOL_GROUPS = ${JSON.stringify(MERGE_POOL_GROUPS)}`);
    }
  });

  it('keeps Rocket School’s bases for P3–P6 and steps 250 a class either side', () => {
    for (const l of LEVELS) expect(base[edition.levels[l]]).toBe(LEVEL_BASE[l]);
    expect(CLASSES.map((c) => base[c])).toEqual([300, 550, 800, 1050, 1300, 1550, 1800, 2050, 2300]);
  });

  it('asks Rocket School’s 5e skills in JSS1 like any other, and none is left marked beyond', () => {
    const skills = editionCurriculum();
    expect(skills.filter((s) => s.beyond)).toEqual([]);
    // SC-3's own JSS1 maths and SC-4's JSS1 banks sit beside them.
    expect(skills.filter((s) => String(s.level) === 'JSS1' && !JSS_SKILLS.includes(s) && !BANK_SKILLS.includes(s)).map((s) => s.id).sort()).toEqual(CURRICULUM.filter((s) => s.beyond).map((s) => s.id).sort());
  });

  it.each(CLASSES)('%s: Number Hunt builds its own class’s grids, 1–3 ways each, no square over the class’s biggest', (level) => {
    const li = CLASSES.indexOf(level);
    const kinds = editionHuntKinds();
    for (let n = 0; n < 40; n++) {
      const g = runScript(scriptOf('Logic/New hunt'), { level, model: ratedAt(level) }).game;
      expect(edition.hunt.kinds[li]).toContain(g.kind);
      expect(g.ways.length).toBeGreaterThanOrEqual(1);
      expect(g.ways.length).toBeLessThanOrEqual(3);
      const spec = kinds[g.kind as keyof typeof kinds] as { max: ReadonlyArray<number>; tenths?: boolean };
      const biggest = spec.tenths ? spec.max[li] / 10 : spec.max[li];
      expect({ kind: g.kind, biggest: Math.max(...g.cells) <= biggest }).toEqual({ kind: g.kind, biggest: true });
    }
  });

  it('Make Ten: single numbers to P3, teens from P4, fives to 95 from P5', () => {
    const pool = (level: string) => new Set<number>(runScript(scriptOf('Logic/New merge board'), { level, model: ratedAt(level) }).pool);
    const [ones, teens, allFives] = MERGE_POOL_GROUPS.map((g) => [...g.tiles] as number[]);
    const fives = allFives.filter((t) => t > 20);
    for (const level of ['P1', 'P2', 'P3']) expect([...pool(level)].sort((a, b) => a - b)).toEqual(ones);
    expect(teens.every((t) => pool('P4').has(t))).toBe(true);
    expect(fives.some((t) => pool('P4').has(t))).toBe(false);
    for (const level of ['P5', 'P6', 'JSS1', 'JSS3']) expect(fives.every((t) => pool(level).has(t))).toBe(true);
  });

  it('🔴 a new player picked into P5 is asked from P3 and the class below it: rated two classes below', () => {
    expect(classesAsked({ level: 'P5' })).toEqual(['P2', 'P3']);
  });

  it('a player whose rating has reached their class is asked from it and the class below', () => {
    expect(classesAsked({ level: 'P5', model: { ...fresh(), rating: base.P5 + PLAY_AT + 100 } })).toEqual(['P4', 'P5']);
  });

  it('🔴 s3: a rating lifts the race above the class picked — the class is where it began, not a ceiling', () => {
    expect(classesAsked({ level: 'P4', model: { ...fresh(), rating: base.P6 + PLAY_AT + 100 } })).toEqual(['P5', 'P6']);
  });

  it('a class with nothing to ask borrows the nearest that has something: JSS3’s English is P6’s (and since SC-3 its maths is its own)', () => {
    // A rating above every class: JSS3's own maths, and JSS2's as the class below (the picker's two-class window).
    expect(classesAsked({ level: 'JSS3', model: { ...fresh(), rating: 4000 } })).toEqual(['JSS2', 'JSS3']);
    // An English player at JSS3 borrows from English's own nearest class, not maths'.
    const english = classesAsked({ level: 'JSS3', mode: 'english', model: { ...fresh(), rating: 4000 } });
    expect(english.length).toBeGreaterThan(0);
    expect(english.every((c) => editionCurriculum().some((s) => s.subject === 'english' && s.level === c))).toBe(true);
  });

  it('🔴 the grader rates a new player from the class two below too, so the first answer does not jump them back up', () => {
    const q = pick({ level: 'P5' });
    const g = runScript(scriptOf('Logic/Grade answer'), {
      model: fresh(),
      skillId: q.skillId,
      answer: q.answer,
      typed: q.answer,
      shownAt: Date.now(),
      fluentMs: q.fluentMs,
      itemDiff: q.itemDiff,
      level: 'P5',
      lang: 'en',
      timedOut: false,
      elapsedOverride: 500,
      raceId: 'r1'
    });
    expect(g.model.rating).toBeGreaterThan(base.P3 + PLAY_AT);
    expect(g.model.rating).toBeLessThan(base.P3 + PLAY_AT + 50 + 41);
  });
});

describe('TPL-013 SC-2 P1 and P2: numbers and pictures', () => {
  const base = editionLevelBase();
  /** Graphemes, without spaces: 🥭🥭 🥭 is three things. */
  const things = (text: string) => [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)].map((g) => g.segment).filter((g) => g.trim());
  const ask = (id: string, lang: 'en' | 'fr' = 'en') => pick({ focus: [id], level: 'P2', lang });
  const LETTER = /\p{L}/u;

  it('files nine skills in P1 and P2, all maths, all tapped, each naming a generator the picker has', () => {
    const script = scriptOf('Logic/Pick next question');
    expect(YOUNG_SKILLS.length).toBe(9);
    expect(new Set(YOUNG_SKILLS.map((sk) => sk.name.en)).size).toBe(9);
    for (const sk of YOUNG_SKILLS) {
      expect(['P1', 'P2']).toContain(String(sk.level));
      expect({ id: sk.id, subject: sk.subject, answer: sk.answer, topic: sk.topic }).toEqual({ id: sk.id, subject: 'maths', answer: 'options', topic: 'counting' });
      expect(script).toContain(`case '${sk.generator}':`);
      expect(editionCurriculum().some((s) => s.id === sk.id)).toBe(true);
    }
    // The control: Rocket School's picker has none of them.
    const rocket = TPL007_COMPONENTS.find((c) => c.path === 'Logic/Pick next question')!;
    expect(JSON.stringify(rocket)).not.toContain('countObjects');
  });

  it.each(YOUNG_SKILLS.map((s) => s.id))('🔴 %s: nothing to read but numerals — 60 questions, both languages, no letter on any line a child sees', (id) => {
    for (let n = 0; n < 60; n++) {
      const q = ask(id, n % 2 ? 'fr' : 'en');
      expect(q.skillId).toBe(id);
      const lines = { name: q.skillName, prompt: q.prompt, worked: q.worked, strategy: q.strategy, options: q.options.join(' | ') };
      for (const [what, text] of Object.entries(lines)) expect({ what, text, letter: LETTER.test(String(text)) }).toEqual({ what, text, letter: false });
      expect(q.kind).toBe('options');
      expect(q.optionValues.length).toBeGreaterThanOrEqual(2);
      expect(new Set(q.optionValues).size).toBe(q.optionValues.length);
      expect(q.optionValues).toContain(q.answer);
    }
  });

  it('🔴 P78-TPL013-MISSINGTHREE: 0 ? 10 15 20 (the one row that ran out of distractors) still offers four, none in the row', () => {
    const missingQ = new Function(
      'function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); } function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; } ' +
        'function shuffle(arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }' +
        YOUNG_GENERATORS + '; return missingNumberQ;'
    )();
    // That row comes up about once in 200 (measured: 996 in 200 000), so 4 000 draws see it about 20 times.
    let seen = 0;
    for (let i = 0; i < 4000 && seen < 20; i++) {
      const q = missingQ({ max: 100, steps: [1, 2, 5, 10] });
      if (q.prompt !== '0  ?  10  15  20') continue;
      seen++;
      expect(q.options.length).toBe(4);
      expect(q.options.filter((o: string) => ['0', '10', '15', '20'].includes(o))).toEqual([]);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('the known-firing control: the letter check sees the words of a P6 question', () => {
    const q = pick({ focus: ['proportion'], level: 'P6' });
    expect(LETTER.test(q.prompt)).toBe(true);
  });

  it('count: the pile holds exactly the answer, grouped in fives', () => {
    for (let n = 0; n < 60; n++) {
      const q = ask(n % 2 ? 'count-10' : 'count-20');
      const pileText = q.prompt.replace(' = ?', '');
      expect(things(pileText).length).toBe(Number(q.answer));
      for (const group of pileText.split(' ')) expect(things(group).length).toBeLessThanOrEqual(5);
    }
  });

  it('more: the answer is the bigger pile, of one kind of thing', () => {
    for (let n = 0; n < 60; n++) {
      const q = ask(n % 2 ? 'more-10' : 'more-20');
      const [a, b] = q.optionValues.map((v: string) => things(v));
      expect(new Set([...a, ...b]).size).toBe(1);
      expect(things(q.answer).length).toBe(Math.max(a.length, b.length));
    }
  });

  it('match: the answer pile holds the numeral asked, and no other pile does', () => {
    for (let n = 0; n < 60; n++) {
      const q = ask('match-10');
      expect(things(q.answer).length).toBe(Number(q.prompt));
      expect(q.optionValues.filter((v: string) => things(v).length === Number(q.prompt))).toEqual([q.answer]);
    }
  });

  it('missing: the row with the answer put back counts on in one step, inside the class’s range', () => {
    for (let n = 0; n < 60; n++) {
      const id = n % 2 ? 'missing-20' : 'missing-100';
      const q = ask(id);
      const row = q.prompt.split(/\s+/).map((x: string) => (x === '?' ? Number(q.answer) : Number(x)));
      const step = row[1] - row[0];
      expect(step).toBeGreaterThan(0);
      expect(row.every((v: number, i: number) => i === 0 || v - row[i - 1] === step)).toBe(true);
      expect(Math.max(...row)).toBeLessThanOrEqual(id === 'missing-20' ? 20 : 100);
      // 🔴 No wrong option is already in the row: the answer would be "the one not on screen", with nothing counted.
      const shown = row.filter((v: number) => v !== Number(q.answer));
      expect({ id, row: q.prompt, inRow: q.optionValues.filter((v: string) => v !== q.answer && shown.includes(Number(v))) }).toEqual({ id, row: q.prompt, inRow: [] });
      expect(q.optionValues.length).toBe(4);
    }
  });

  it('odd one out: P1 by kind (three of one kind, one of another), P2 by number (three the same, one not)', () => {
    const kindOf = (e: string) => YOUNG_KINDS.findIndex((k) => k.includes(e));
    for (let n = 0; n < 60; n++) {
      const q = ask('odd-kind');
      const rest = q.optionValues.filter((v: string) => v !== q.answer);
      expect(rest.length).toBe(3);
      expect(new Set(rest.map(kindOf)).size).toBe(1);
      expect(kindOf(q.answer)).not.toBe(kindOf(rest[0]));
      const c = ask('odd-count');
      const others = c.optionValues.filter((v: string) => v !== c.answer).map((v: string) => things(v).length);
      expect(new Set(others).size).toBe(1);
      expect(things(c.answer).length).not.toBe(others[0]);
    }
  });

  it('🔴 a new P1 player’s race asks only P1 skills, and a new P3 player starts there too (two below)', () => {
    expect(classesAsked({ level: 'P1' })).toEqual(['P1']);
    expect(classesAsked({ level: 'P3' })).toEqual(['P1']);
    // The control: rated at P2, a P2 player is asked P2 and P1.
    expect(classesAsked({ level: 'P2', model: { ...fresh(), rating: base.P2 + PLAY_AT + 100 } })).toEqual(['P1', 'P2']);
  });

  it('an answer that is a pile of things is drawn bigger than a number or a word, on Star Class’s button only', () => {
    const size = (label: string) => runScript(OPTION_SIZE_SCRIPT, { label }).size;
    for (const pile of ['🍌🍌🍌🍌🍌 🍌🍌🍌', '🐐', '✏️ 📚', '⭐⭐⭐⭐⭐ ⭐']) expect({ pile, size: size(pile) }).toEqual({ pile, size: 'var(--text-3xl)' });
    for (const other of ['8', '3/4', '1 234 567', 'cahier', 'P5', '−4', '0,25']) expect({ other, size: size(other) }).toEqual({ other, size: 'var(--text-xl)' });
    const mine = COMPONENTS.find((c) => c.path === 'Game/Option button')!;
    expect(mine.connections).toContainEqual({ fromId: 'obSize', fromProperty: 'out-size', toId: 'obBtn', toProperty: 'fontSize' });
    expect(JSON.stringify(TPL007_COMPONENTS.find((c) => c.path === 'Game/Option button'))).not.toContain('obSize');
  });

  it('🔴 the edition adds no node id another component already uses (ids are project-wide)', () => {
    const twice = (cs: ReadonlyArray<(typeof COMPONENTS)[number]>) => {
      const seen = new Map<string, string>();
      const out: string[] = [];
      for (const c of cs) for (const n of c.nodes) {
        const id = (n as { id: string }).id;
        if (seen.has(id)) out.push(`${id}: ${seen.get(id)} and ${c.path}`);
        seen.set(id, c.path);
      }
      return out;
    };
    // Rocket School's own one (Merge/Tile and Moon/Alien tile both say mtIn; the plan door writes the second as mtIn-2).
    expect(twice(TPL007_COMPONENTS)).toEqual(['mtIn: Merge/Tile and Moon/Alien tile']);
    expect(twice(COMPONENTS)).toEqual(twice(TPL007_COMPONENTS));
  });

  it('the chooser files them under Counting, the first maths topic', () => {
    expect(scriptOf('Logic/Focus choices')).toMatch(/var TOPICS = \[\{"id":"counting","subject":"maths"/);
  });
});

describe('TPL-013 s3 the class is a starting yard stick: it jumps up and down', () => {
  const base = editionLevelBase();
  /** Answer n questions for a player of `level`, right or wrong, carrying the model; returns the model and each grade. */
  function run(level: string, answers: boolean[], model: Record<string, any> = fresh(), over: Record<string, unknown> = {}) {
    const grades: Array<Record<string, any>> = [];
    for (const right of answers) {
      const q = pick({ level, model });
      const g = runScript(scriptOf('Logic/Grade answer'), {
        model, skillId: q.skillId, answer: q.answer, typed: right ? q.answer : 'nope', shownAt: Date.now(), fluentMs: q.fluentMs,
        itemDiff: q.itemDiff, level, lang: 'en', timedOut: false, elapsedOverride: 800, raceId: 'r1', ...over
      });
      model = g.model;
      grades.push(g);
    }
    return { model, grades };
  }

  it('🔴 five right in a row lift a new P3 player from P1 to P2, and the grader hands the banner P2 to show', () => {
    const { model, grades } = run('P3', [true, true, true, true, true]);
    expect(grades.slice(0, 4).map((g) => g.jumped)).toEqual(['', '', '', '']);
    expect(grades.slice(0, 4).map((g) => g.jumpTo)).toEqual(['', '', '', '']);
    expect(grades[4].jumped).toBe('up');
    expect(grades[4].playing).toBe('P2');
    expect(grades[4].jumpTo).toBe('P2');
    // s4: the jump has its own card now, so the small speed line no longer carries it.
    expect(grades[4].boost).not.toContain('⬆️');
    expect(model.rating).toBeGreaterThanOrEqual(base.P2 + PLAY_AT + 50);
    expect(classesAsked({ level: 'P3', model })).toEqual(['P1', 'P2']);
  });

  it('🔴 right after a jump the new class is what is asked most (the jump changes the questions, not just the number)', () => {
    const { model } = run('P3', [true, true, true, true, true]);
    const levels = Array.from({ length: 80 }, () => levelOf(pick({ level: 'P3', model }).skillId));
    expect(levels.filter((l) => l === 'P2').length).toBeGreaterThan(levels.filter((l) => l === 'P1').length);
  });

  it('keeps on climbing past the class picked: a P1 player who gets everything right reaches P4 in 15 answers', () => {
    const { model, grades } = run('P1', Array(15).fill(true));
    expect(grades.filter((g) => g.jumped === 'up').map((g) => g.playing)).toEqual(['P2', 'P3', 'P4']);
    expect(classesAsked({ level: 'P1', model })).toEqual(['P3', 'P4']);
  });

  it('three misses in a row drop the race a class, and say nothing about it', () => {
    const up = run('P5', [], { ...fresh(), rating: base.P5 + PLAY_AT + 60 }).model;
    const { model, grades } = run('P5', [false, false, false], up);
    expect(grades[2].jumped).toBe('down');
    expect(grades[2].playing).toBe('P4');
    expect(grades.map((g) => g.boost).join(' ')).not.toMatch(/⬇️|⬆️/);
    expect(grades.map((g) => g.jumpTo)).toEqual(['', '', '']);
    expect(model.rating).toBeLessThan(base.P5 + PLAY_AT);
  });

  it('a right answer between misses starts the count again (two misses, a right, two misses: no drop)', () => {
    const start = { ...fresh(), rating: base.P5 + PLAY_AT + 60 };
    const { grades } = run('P5', [false, false, true, false, false], start);
    expect(grades.map((g) => g.jumped)).toEqual(['', '', '', '', '']);
  });

  it('the ends hold: JSS3 does not jump up, P1 does not jump down', () => {
    const top = run('JSS3', Array(5).fill(true), { ...fresh(), rating: base.JSS3 + PLAY_AT + 60 });
    expect(top.grades.map((g) => g.jumped)).toEqual(['', '', '', '', '']);
    const bottom = run('P1', Array(3).fill(false));
    expect(bottom.grades.map((g) => g.jumped)).toEqual(['', '', '']);
  });

  it('the run is kept across races (a new race id does not reset it)', () => {
    const first = run('P3', [true, true, true]).model;
    const { grades } = run('P3', [true, true], first, { raceId: 'r2' });
    expect(grades[1].jumped).toBe('up');
  });

  it('player two’s turns count for nothing towards a jump', () => {
    const { grades } = run('P3', Array(6).fill(true), fresh(), { forB: true });
    expect(grades.map((g) => g.jumped)).toEqual(['', '', '', '', '', '']);
  });

  it('Rocket School’s grader has no jump (the control)', () => {
    const rocket = TPL007_COMPONENTS.find((c) => c.path === 'Logic/Grade answer')!;
    expect(JSON.stringify(rocket)).not.toContain('JUMP_UP');
    expect(scriptOf('Logic/Grade answer')).toContain('var JUMP_UP = 5, JUMP_DOWN = 3;');
  });
});

describe('TPL-013 s4 the jump has its own moment: a big ⬆️ P2 card on the verdict', () => {
  type Node = { id: string; type: string; parent?: string; children?: string[]; ports?: Array<{ name: string; plug: string }>; parameters?: Record<string, unknown> };
  type Wire = { fromId: string; fromProperty: string; toId: string; toProperty: string };
  const of = (list: ReadonlyArray<{ path: string }>, p: string) => list.find((c) => c.path === p) as unknown as { nodes: Node[]; connections: Wire[]; inputs?: Array<{ name: string }>; outputs?: Array<{ name: string }> };
  const has = (c: { connections: Wire[] }, w: Wire) => c.connections.some((x) => x.fromId === w.fromId && x.fromProperty === w.fromProperty && x.toId === w.toId && x.toProperty === w.toProperty);

  it('the grader publishes jumpTo out of its component, and the race hands it to the banner', () => {
    const grade = of(COMPONENTS, 'Logic/Grade answer');
    expect(grade.outputs!.map((p) => p.name)).toContain('jumpTo');
    expect(grade.nodes.find((n) => n.id === 'gradeanswerOut')!.ports!.filter((p) => p.name === 'jumpTo')).toEqual([{ name: 'jumpTo', type: 'string', plug: 'input' }]);
    expect(has(grade, { fromId: 'gradeanswerFn', fromProperty: 'out-jumpTo', toId: 'gradeanswerOut', toProperty: 'jumpTo' })).toBe(true);
    expect(has(of(COMPONENTS, 'Race/Round'), { fromId: 'rdGrade', fromProperty: 'jumpTo', toId: 'rdBanner', toProperty: 'jumpTo' })).toBe(true);
    const banner = of(COMPONENTS, 'Game/Feedback banner');
    expect(banner.inputs!.map((p) => p.name)).toContain('jumpTo');
    expect(banner.nodes.find((n) => n.id === 'fbIn')!.ports!.filter((p) => p.name === 'jumpTo')).toEqual([{ name: 'jumpTo', type: 'string', plug: 'output' }]);
  });

  it('🔴 the card is the first thing in the verdict, above the glyph and the headline, and shows only when there was a jump', () => {
    const banner = of(COMPONENTS, 'Game/Feedback banner');
    expect(banner.nodes.find((n) => n.id === 'fbCard')!.children).toEqual(['fbJump', 'fbTop', 'fbTitle', 'fbMessage', 'fbRow']);
    const card = banner.nodes.find((n) => n.id === 'fbJump')!;
    expect(card.parameters).toMatchObject({ mounted: false, cssClassName: 'rkt-result', backgroundColor: 'var(--primary)' });
    expect(card.children).toEqual(['fbJumpGlyph', 'fbJumpClass']);
    expect(has(banner, { fromId: 'fbIn', fromProperty: 'jumpTo', toId: 'fbJumpClass', toProperty: 'text' })).toBe(true);
    expect(has(banner, { fromId: 'fbHasJump', fromProperty: 'result', toId: 'fbJump', toProperty: 'mounted' })).toBe(true);
    // Bigger than the headline (3xl), so it is the first thing a child sees.
    for (const id of ['fbJumpGlyph', 'fbJumpClass']) expect(banner.nodes.find((n) => n.id === id)!.parameters!.fontSize).toBe('var(--text-4xl)');
  });

  it('Rocket School has none of it (the control)', () => {
    const banner = of(TPL007_COMPONENTS, 'Game/Feedback banner');
    expect(banner.nodes.map((n) => n.id)).not.toContain('fbJump');
    expect(banner.inputs!.map((p) => p.name)).not.toContain('jumpTo');
    expect(of(TPL007_COMPONENTS, 'Logic/Grade answer').outputs!.map((p) => p.name)).not.toContain('jumpTo');
  });

  it('a graft refuses a port on a node that is not a Component Inputs or Outputs, and a place under a parent the component lacks', () => {
    const banner = TPL007_COMPONENTS.find((c) => c.path === 'Game/Feedback banner')!;
    expect(() => withNodes(banner, { ...JUMP_CARD, ports: { fbCard: [['x', 'string']] } })).toThrow(/fbCard is not a Component Inputs or Outputs/);
    expect(() => withNodes(banner, { ...JUMP_CARD, place: [{ id: 'fbJump', parent: 'nope', at: 0 }] })).toThrow(/no parent nope/);
    expect(() => withNodes(banner, { ...JUMP_CARD, ports: { nope: [['x', 'string']] } })).toThrow(/no node nope/);
  });
});

describe('TPL-013 SC-5 Star Class faces are darker by default', () => {
  const scripts = (list: ReadonlyArray<{ path: string; nodes: unknown[] }>) =>
    list.flatMap((c) => c.nodes.map((n) => ({ path: c.path, script: (n as { parameters?: { functionScript?: string } }).parameters?.functionScript ?? '' }))).filter((x) => x.script.includes('var SKIN_DEFAULT = '));
  const scriptIn = (componentPath: string, has: string) =>
    (COMPONENTS.find((c) => c.path === componentPath)!.nodes.map((n) => (n as { parameters?: { functionScript?: string } }).parameters?.functionScript ?? '').find((x) => x.includes(has)))!;

  it('🔴 every script that keeps or draws a face carries the darker default, and none Rocket School’s empty one', () => {
    const mine = scripts(COMPONENTS);
    // The known-firing signal: Rocket School's own scripts carry the line too, empty, in the same places.
    const rocket = scripts(TPL007_COMPONENTS);
    expect(mine.map((x) => x.path)).toEqual(rocket.map((x) => x.path));
    expect(mine.length).toBeGreaterThanOrEqual(5);
    expect(mine.filter((x) => !x.script.includes('var SKIN_DEFAULT = ["t3","t4","t5"];')).map((x) => x.path)).toEqual([]);
    expect(rocket.filter((x) => !x.script.includes('var SKIN_DEFAULT = [];')).map((x) => x.path)).toEqual([]);
  });

  it('a player who has picked none: the seed chooses among ✋🏽 ✋🏾 ✋🏿, on the form and once made', () => {
    expect(runScript(scriptIn('Profiles/New player form', 'skinOptions'), { skin: '' }).options).toEqual({ skinColor: ['c68642', '8d5524', '5c3317'] });
    const app = runScript(scriptIn('Logic/Create profile', 'Inputs.skin'), { app: undefined, name: 'Ada', look: 'big-smile', seed: 'Ada', level: 'P3', lang: 'en' }).app;
    expect(runScript(scriptOf('Logic/Active profile'), { app }).faceOptions).toEqual({ skinColor: ['c68642', '8d5524', '5c3317'] });
  });

  it('and one who has picked: their own, light ones included', () => {
    const app = runScript(scriptOf('Logic/Create profile'), { app: undefined, name: 'Ada', look: 'big-smile', seed: 'Ada', level: 'P3', lang: 'en', skin: 't1' }).app;
    expect(runScript(scriptOf('Logic/Active profile'), { app }).faceOptions).toEqual({ skinColor: ['f2d3b1'] });
  });
});

describe('TPL-013 SC-3 maths for JSS1–JSS3, each pinned to a programme topic, each a trap', () => {
  // The prompts keep a number with its unit (no-break spaces); the parsers below read them as plain spaces.
  const ask = (id: string, lang: 'en' | 'fr' = 'en'): Record<string, any> => {
    const q = pick({ focus: [id], level: 'JSS3', lang, model: { ...fresh(), rating: 4000 } });
    return { ...q, prompt: String(q.prompt).replace(/\u00a0/g, ' '), raw: String(q.prompt) };
  };
  const num = (t: string) => Number(t.replace(/−/g, '-').replace(/[()+]/g, ''));

  it('files ten skills in JSS1–JSS3, all maths, all tapped, all traps, each named in the sources at its own class', () => {
    const script = scriptOf('Logic/Pick next question');
    expect(JSS_SKILLS.length).toBe(10);
    expect(Object.keys(JSS_SOURCES).sort()).toEqual(JSS_SKILLS.map((sk) => sk.id).sort());
    for (const sk of JSS_SKILLS) {
      expect({ id: sk.id, level: String(sk.level), subject: sk.subject, answer: sk.answer, trap: sk.trap }).toEqual({ id: sk.id, level: JSS_SOURCES[sk.id].level, subject: 'maths', answer: 'options', trap: true });
      expect(JSS_SOURCES[sk.id].topic).toMatch(/NERDC|NGM/);
      expect(script).toContain(`case '${sk.generator}':`);
    }
    for (const c of ['JSS1', 'JSS2', 'JSS3']) expect(JSS_SKILLS.filter((sk) => String(sk.level) === c).length).toBeGreaterThanOrEqual(3);
    // No id clashes with Rocket School's (its 'proportion' is why ours is 'proportion-jss').
    expect(new Set(editionCurriculum().map((sk) => sk.id)).size).toBe(editionCurriculum().length);
  });

  it('🔴 the picker declares no function and no case twice (a second case never runs; a second function replaces the first)', () => {
    const script = scriptOf('Logic/Pick next question');
    const twice = (text: string, re: RegExp) =>
      Object.entries([...(text.match(re) ?? [])].reduce<Record<string, number>>((n, m) => ({ ...n, [m]: (n[m] ?? 0) + 1 }), {})).filter(([, c]) => c > 1).map(([m]) => m);
    expect(twice(script, /function \w+\(/g)).toEqual([]);
    expect(twice(script, /case '[^']+':/g)).toEqual([]);
    // The known-firing control: Rocket's proportion case added a second time is seen.
    const doubled = script.replace("case 'list':", "case 'proportion': return null;\n    case 'list':");
    expect(twice(doubled, /case '[^']+':/g)).toEqual(["case 'proportion':"]);
  });

  it('Rocket School’s picker has none of it (the control)', () => {
    const rocket = TPL007_COMPONENTS.find((c) => c.path === 'Logic/Pick next question')!;
    expect(JSON.stringify(rocket)).not.toContain('dirAddSub');
  });

  it.each(JSS_SKILLS.map((sk) => sk.id))('%s: 60 questions in both languages — buttons, the answer among them, nothing undefined', (id) => {
    for (let n = 0; n < 60; n++) {
      const lang = n % 2 ? 'fr' : 'en';
      const q = ask(id, lang);
      expect(q.skillId).toBe(id);
      expect(q.kind).toBe('options');
      expect(q.optionValues.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.optionValues).size).toBe(q.optionValues.length);
      expect(q.optionValues).toContain(q.answer);
      for (const text of [q.prompt, q.worked, q.strategy, ...q.options]) expect(String(text)).not.toMatch(/undefined|NaN|null|Infinity/);
    }
  });

  /** Each skill's answer, worked out again from the English prompt a child reads, and the answer its misconception gives. */
  const CHECKS: Record<string, (q: any) => { right: string; trap: string | null }> = {
    'dir-addsub': (q) => {
      const [, a, op, b] = q.prompt.match(/^(\([+−]\d+\)) ([+−]) (\([+−]\d+\))/)!;
      const right = op === '+' ? num(a) + num(b) : num(a) - num(b);
      return { right: String(right), trap: String(-right) };
    },
    'dir-muldiv': (q) => {
      const [, a, op, b] = q.prompt.match(/^(\([+−]\d+\)) ([×÷]) (\([+−]\d+\))/)!;
      const right = op === '×' ? num(a) * num(b) : num(a) / num(b);
      return { right: String(right), trap: String(-right) };
    },
    'eq-two-step': (q) => {
      const [, a, op, b, c] = q.prompt.match(/^(\d+)x ([+−]) (\d+) = (\d+)/)!.map(String);
      const right = op === '+' ? (Number(c) - Number(b)) / Number(a) : (Number(c) + Number(b)) / Number(a);
      return { right: String(right), trap: String(op === '+' ? Number(c) - Number(b) : Number(c) + Number(b)) };
    },
    'eq-fractions': (q) => {
      const [, a, b, c] = q.prompt.match(/^x\/(\d+) \+ (\d+) = (\d+)/)!.map(Number);
      return { right: String(a * (c - b)), trap: String(c - b) };
    },
    'area-rect-tri': (q) => {
      const tri = q.prompt.match(/triangle, base (\d+) cm, height (\d+) cm/);
      if (tri) return { right: String((Number(tri[1]) * Number(tri[2])) / 2), trap: String(Number(tri[1]) * Number(tri[2])) };
      const [, l, w] = q.prompt.match(/rectangle, (\d+) cm × (\d+) cm/)!.map(Number);
      return { right: String(l * w), trap: 2 * (l + w) === l * w ? null : String(2 * (l + w)) };
    },
    'volume-cuboid': (q) => {
      const [, l, w, h] = q.prompt.match(/(\d+) cm × (\d+) cm × (\d+) cm/)!.map(Number);
      return { right: String(l * w * h), trap: String(l + w + h) };
    },
    'indices-laws': (q) => {
      const digits = (t: string) => Number(t.split('').map((ch) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)).join(''));
      const pw = q.prompt.match(/^\((\w)([⁰-⁹¹²³]+)\)([⁰-⁹¹²³]+) = \?$/u);
      if (pw) return { right: `${pw[1]}^${digits(pw[2]) * digits(pw[3])}`, trap: `${pw[1]}^${digits(pw[2]) + digits(pw[3])}` };
      const [, base, m, op, n] = q.prompt.match(/^(\w)([⁰-⁹¹²³]+) ([×÷]) \w([⁰-⁹¹²³]+) = \?$/u)!;
      const [mm, nn] = [digits(m), digits(n)];
      if (op === '×') return { right: `${base}^${mm + nn}`, trap: mm * nn === mm + nn ? null : `${base}^${mm * nn}` };
      return { right: `${base}^${mm - nn}`, trap: `${base}^${mm + nn}` };
    },
    'ratio-share': (q) => {
      const [, total, a, b, which] = q.prompt.match(/^Share (\d+) \w+ in the ratio (\d+) : (\d+)\. The (bigger|smaller) share/)!;
      const part = Number(total) / (Number(a) + Number(b));
      const right = (which === 'bigger' ? Math.max(Number(a), Number(b)) : Math.min(Number(a), Number(b))) * part;
      // Half each, the commonest misreading of "share", when it is a whole number and not the answer.
      const half = Number(total) / 2;
      return { right: String(right), trap: Number.isInteger(half) && half !== right ? String(half) : null };
    },
    'proportion-jss': (q) => {
      const direct = q.prompt.match(/^(\d+) bags hold (\d+) mangoes\. How many in (\d+) bags\?/);
      if (direct) {
        const [n1, have, n2] = direct.slice(1).map(Number);
        return { right: String((have / n1) * n2), trap: String(have + (n2 - n1)) };
      }
      const [, w1, d1, w2] = q.prompt.match(/^(\d+) workers take (\d+) days .* for (\d+) workers\?/)!.map(Number);
      return { right: String((w1 * d1) / w2), trap: String(d1 + (w2 - w1)) };
    },
    'area-circle': (q) => {
      const r = Number(q.prompt.match(/radius (\d+) cm/)![1]);
      return { right: String((22 * r * r) / 7), trap: String((44 * r) / 7) };
    }
  };

  it.each(JSS_SKILLS.map((sk) => sk.id))('🔴 %s: the answer is right, worked out again from the prompt, and the misconception’s answer is a button', (id) => {
    let trapped = 0, asked = 0;
    for (let n = 0; n < 60; n++) {
      const q = ask(id, 'en');
      const { right, trap } = CHECKS[id](q);
      expect({ prompt: q.prompt, answer: q.answer }).toEqual({ prompt: q.prompt, answer: right });
      if (trap === null || trap === right) continue;
      asked++;
      if (q.optionValues.includes(trap)) trapped++;
    }
    // Every question whose misconception gives a different number offers it.
    expect(asked).toBeGreaterThan(30);
    expect(trapped).toBe(asked);
  });

  it('a number stays with its unit on a phone: no plain space between 21 and cm, or inside (π = 22/7)', () => {
    for (const id of ['area-rect-tri', 'volume-cuboid', 'area-circle']) {
      for (let n = 0; n < 20; n++) {
        const { raw } = ask(id, n % 2 ? 'fr' : 'en');
        expect({ id, raw, split: / cm|= \?|π =/.test(raw) }).toEqual({ id, raw, split: false });
      }
    }
  });

  it('the trap check is live: a question whose options lost the misconception would be caught', () => {
    const q = ask('area-circle');
    const { trap } = CHECKS['area-circle'](q);
    expect(q.optionValues.filter((v: string) => v !== trap)).not.toContain(trap);
    expect(q.optionValues).toContain(trap);
  });

  it('🔴 a player rated into JSS1, JSS2, JSS3 is asked that class’s own maths (no more borrowing P6’s)', () => {
    const base = editionLevelBase();
    for (const c of ['JSS1', 'JSS2', 'JSS3'] as const) {
      const asked = classesAsked({ level: c, model: { ...fresh(), rating: base[c] + PLAY_AT + 60 } });
      expect({ c, own: asked.includes(c), p6: asked.includes('P6') && c !== 'JSS1' }).toEqual({ c, own: true, p6: false });
    }
  });
});

describe('TPL-013 s5 Number Hunt and Make Ten play at the rating’s class; P1–P2 hunt from a picture', () => {
  const of = (list: ReadonlyArray<{ path: string }>, p: string) => list.find((c) => c.path === p) as { path: string; inputs?: Array<{ name: string }>; nodes: Array<{ id: string; parameters?: Record<string, unknown> }>; connections: Array<{ fromId: string; fromProperty: string; toId: string; toProperty: string }> };
  const hunt = (over: Record<string, unknown>) => runScript(scriptOf('Logic/New hunt'), over).game;
  const draw = (game: Record<string, unknown>, lang = 'en') => runScript(scriptOf('Logic/Draw hunt'), { game, lang });
  const huntClasses = (over: Record<string, unknown>, n = 30) => [...new Set(Array.from({ length: n }, () => String(hunt(over).level)))].sort();

  it('the hunt’s builder takes the model, only Run reads it, and the game hands it the player’s', () => {
    const builder = of(COMPONENTS, 'Logic/New hunt');
    expect(builder.inputs!.map((p) => p.name)).toEqual(['run', 'level', 'model']);
    expect(builder.nodes.find((n) => n.id === 'newhuntFn')!.parameters!['runOnChange-in-model']).toBe(false);
    expect(builder.connections).toContainEqual({ fromId: 'newhuntIn', fromProperty: 'model', toId: 'newhuntFn', toProperty: 'in-model' });
    expect(of(COMPONENTS, 'Hunt/Play').connections).toContainEqual({ fromId: 'hpIn', fromProperty: 'model', toId: 'hpNewHunt', toProperty: 'model' });
  });

  it('🔴 a new player picked into P5 hunts at P3 (two below, as the race asks), not at P5', () => {
    expect(huntClasses({ level: 'P5', model: fresh() })).toEqual(['P3']);
    expect(huntClasses({ level: 'P5' })).toEqual(['P3']);
  });

  it('🔴 a P3 player who has climbed to P5 hunts P5’s grids, above the class picked', () => {
    expect(huntClasses({ level: 'P3', model: ratedAt('P5') })).toEqual(['P5']);
    for (let n = 0; n < 20; n++) expect(edition.hunt.kinds[CLASSES.indexOf('P5')]).toContain(hunt({ level: 'P3', model: ratedAt('P5') }).kind);
  });

  it('the next grid stays at the class the hunt began in', () => {
    let g = hunt({ level: 'P5', model: ratedAt('P1') });
    g = { ...g, found: g.ways };
    const next = runScript(scriptOf('Logic/Hunt move'), { game: g, action: 'next' }).game;
    expect({ round: next.round, level: next.level, kind: next.kind }).toEqual({ round: 2, level: 'P1', kind: 'add2' });
  });

  it('🔴 Make Ten deals from the rating’s class: a P5 pick with a P1 rating gets single numbers, a P1 pick rated P5 gets fives', () => {
    const [ones, , allFives] = MERGE_POOL_GROUPS.map((g) => [...g.tiles] as number[]);
    const fives = allFives.filter((t) => t > 20);
    const pool = (level: string, model: Record<string, unknown>) => new Set<number>(runScript(scriptOf('Logic/New merge board'), { level, model }).pool);
    expect([...pool('P5', ratedAt('P1'))].sort((a, b) => a - b)).toEqual(ones);
    expect([...pool('P5', fresh())].sort((a, b) => a - b)).toEqual(ones);
    expect(fives.every((t) => pool('P1', ratedAt('P5')).has(t))).toBe(true);
  });

  it.each(['P1', 'P2'])('🔴 %s: the hunt is asked as ❓ + ❓ = 14, numerals and symbols only, in either language', (c) => {
    for (let n = 0; n < 30; n++) {
      const g = hunt({ level: c, model: ratedAt(c) });
      for (const lang of ['en', 'fr']) {
        const { instruction } = draw(g, lang);
        const want = Array.from({ length: g.count }, () => '❓').join(g.kind === 'sub2' ? ' − ' : ' + ') + ' = ' + g.target;
        expect({ kind: g.kind, instruction, letters: /\p{L}/u.test(instruction) }).toEqual({ kind: g.kind, instruction: want, letters: false });
      }
    }
  });

  it('P3 and up keep the sentence (the known-firing control for the letter check)', () => {
    const { instruction } = draw(hunt({ level: 'P3', model: ratedAt('P3') }));
    expect(instruction).toMatch(/^Pick \d numbers/);
    expect(/\p{L}/u.test(instruction)).toBe(true);
  });

  it('Rocket School’s hunt and Make Ten are untouched (the control)', () => {
    const rocket = of(TPL007_COMPONENTS, 'Logic/New hunt');
    expect(rocket.inputs!.map((p) => p.name)).toEqual(['run', 'level']);
    const rocketScript = (p: string) => String(of(TPL007_COMPONENTS, p).nodes.find((n) => n.parameters?.functionScript)!.parameters!.functionScript);
    expect(rocketScript('Logic/New hunt')).toContain("var level = String(Inputs.level || 'CE2');");
    expect(rocketScript('Logic/New merge board')).toContain('var li = levelIndex(level), skills');
    expect(rocketScript('Logic/Draw hunt')).not.toContain('HUNT_PICTURES');
  });

  it('a graft refuses parameters for a node the component lacks', () => {
    const builder = TPL007_COMPONENTS.find((c) => c.path === 'Logic/New hunt')!;
    expect(() => withNodes(builder, { nodes: [], connections: [], params: { nope: { a: 1 } } })).toThrow(/no node nope to set parameters on/);
  });
});

describe('TPL-013 SC-4 the text banks: English and Basic Science', () => {
  type Item = { q: string; a: string; opts?: string[]; note?: { en: string }; src?: string };
  const itemsOf = (sk: { params: Record<string, unknown> }) => (sk.params as { items: Item[] }).items;
  const text = (sk: (typeof BANK_SKILLS)[number]) => JSON.stringify(sk);
  const ask = (id: string, lang = 'en') =>
    runScript(scriptOf('Logic/Pick next question'), {
      curriculum: editionCurriculum(),
      model: ratedAt(String(BANK_SKILLS.find((x) => x.id === id)!.level)),
      level: 'P3',
      lang,
      layout: 'qwerty',
      mode: String(BANK_SKILLS.find((x) => x.id === id)!.subject),
      answerMode: 'auto',
      focus: [id],
      wordLists: [{ lang: 'en', words: WORD_LISTS.en }, { lang: 'fr', words: WORD_LISTS.fr }],
      nonce: 1
    });

  it('every bank skill is P3 to JSS3 (text starts at P3), filed under a subject and a topic the chooser has, with a fresh id', () => {
    const subjects = edition.subjects.map((x) => x.id);
    const topics = editionTopics().map((t) => t.id);
    const rocketIds = new Set(CURRICULUM.map((x) => x.id));
    for (const sk of BANK_SKILLS) {
      expect({ id: sk.id, level: CLASSES.indexOf(String(sk.level)) >= CLASSES.indexOf('P3'), subject: subjects.includes(String(sk.subject)), topic: topics.includes(String(sk.topic)), fresh: !rocketIds.has(sk.id) }).toEqual({ id: sk.id, level: true, subject: true, topic: true, fresh: true });
      expect(itemsOf(sk).length).toBeGreaterThanOrEqual(8);
    }
    expect(new Set(editionCurriculum().map((x) => x.id)).size).toBe(editionCurriculum().length);
  });

  it('🔴 no two items of a skill share the engine’s key (their first 48 characters)', () => {
    for (const sk of BANK_SKILLS) {
      const keys = itemsOf(sk).map((it) => it.q.slice(0, 48));
      expect({ id: sk.id, dup: keys.filter((k, i) => keys.indexOf(k) !== i) }).toEqual({ id: sk.id, dup: [] });
    }
  });

  it('an item with its own buttons has its answer among them once, and at least one other', () => {
    for (const sk of BANK_SKILLS) for (const it of itemsOf(sk)) if (it.opts) {
      expect({ q: it.q, once: it.opts.filter((o) => o === it.a).length, others: it.opts.length - 1 >= 1, distinct: new Set(it.opts).size === it.opts.length }).toEqual({ q: it.q, once: 1, others: true, distinct: true });
    }
  });

  it('🔴 a bank whose buttons are the other items’ answers never uses a question word as an answer (it would be right twice)', () => {
    for (const sk of BANK_SKILLS) {
      const bare = itemsOf(sk).filter((it) => !it.opts);
      if (!bare.length) continue;
      const qs = new Set(bare.map((it) => it.q));
      expect({ id: sk.id, both: bare.map((it) => it.a).filter((a) => qs.has(a)) }).toEqual({ id: sk.id, both: [] });
      expect(new Set(bare.map((it) => it.a)).size).toBeGreaterThanOrEqual(4);
    }
  });

  it('🔴 every science item names a source the table has, and every source is used', () => {
    const used = new Set<string>();
    for (const sk of BANK_SKILLS.filter((x) => x.subject === ('science' as never))) for (const it of itemsOf(sk)) {
      expect({ q: it.q, src: !!it.src && it.src in BANK_SOURCES }).toEqual({ q: it.q, src: true });
      used.add(String(it.src));
    }
    expect(Object.keys(BANK_SOURCES).filter((k) => !used.has(k))).toEqual([]);
  });

  it('British spelling, and none of the research’s traps (§2.2.4)', () => {
    const us = /\b(color|colors|center|favorite|neighbor|gray|program|organize|recognize|practise\b(?= is)|meter\b|liter\b|aluminum|diarrhea|fiber|behavior|tumor)\b/i;
    const traps = /Sheba|richest|never colon|\b5[45] countries|Ghana Empire.*\d{3,4}|discovered/i;
    for (const sk of BANK_SKILLS) expect({ id: sk.id, us: us.exec(text(sk))?.[0] ?? null, trap: traps.exec(text(sk))?.[0] ?? null }).toEqual({ id: sk.id, us: null, trap: null });
    // The known-firing controls: each pattern sees what it is for.
    expect(us.test('my favorite color')).toBe(true);
    expect(traps.test('Mansa Musa, the richest man')).toBe(true);
  });

  it.each(BANK_SKILLS.map((x) => x.id))('%s: the picker asks it, with the answer among two to four distinct buttons', (id) => {
    for (let n = 0; n < 25; n++) {
      const q = ask(id);
      expect(q.skillId).toBe(id);
      expect({ prompt: q.prompt.length > 0, has: q.optionValues.includes(q.answer), n: q.optionValues.length >= 2 && q.optionValues.length <= 4, distinct: new Set(q.optionValues).size === q.optionValues.length }).toEqual({ prompt: true, has: true, n: true, distinct: true });
    }
  });

  it('the chooser offers Maths, English, Science and French, and Rocket School’s English word lists sit under French as French words', () => {
    expect(scriptOf('Logic/Focus choices')).toContain(`var SUBJECTS = ${JSON.stringify(edition.subjects)};`);
    const moved = editionTopics().find((t) => t.id === 'en-vocab')!;
    expect(moved).toMatchObject({ subject: 'french', name: { en: 'French words' } });
    const vocab = editionCurriculum().filter((x) => x.topic === 'en-vocab');
    expect(vocab.length).toBeGreaterThan(5);
    expect(vocab.every((x) => x.subject === 'french')).toBe(true);
    for (const t of BANK_TOPICS) expect(editionTopics().map((x) => x.id)).toContain(t.id);
  });

  it('a P3 Science race asks only science (the subject is the mode)', () => {
    for (let n = 0; n < 40; n++) {
      const q = pick({ level: 'P3', mode: 'science', model: ratedAt('P3') });
      expect(String(editionCurriculum().find((x) => x.id === q.skillId)?.subject)).toBe('science');
    }
  });
});
