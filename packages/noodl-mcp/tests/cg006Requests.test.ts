/**
 * CG-006 — the gate over the content: the requests, the Olive rungs framed as
 * requests, the ring-fenced moments and their probes, the words, the rewards.
 *
 * The acceptance criteria, as numbered in
 * `dev-docs/tasks/phase-105-the-coding-garden/CG-006-THE-REQUESTS.md` §5:
 *
 * - **AC1** every §2 row is a request whose reference program the engine runs
 *   to its goal, EN and FR, at every band from its own up (band 7–9 runs the
 *   program a child records: repeats unrolled, tricks inlined);
 * - **AC2** every §3 rung is framed (islander, block, outcome), its rung-table
 *   entries and exam probes exist and are designed on the column §3 gives it;
 *   every §4 probe is well-formed against the shell's OWN checks (offline:
 *   canned replies, never the model);
 * - **AC3** every string EN + FR (Richard reads the FR: not graded here);
 * - **AC4** rewards are cosmetic, never bought, each names its islander;
 * - **AC5** no request text carries a timer, a score, a streak or a "missed";
 * - **AC6** §4's add-probe rows each carry a probe and a decision.
 *
 * Session 3 adds Richard's rulings of 2026-09-28: rung 9 = G1 "no letter e"; no
 * EN must-contain on the thank-you; every rung band 10–12 (band 7–9 keeps the
 * hints); the six measured moments promoted to rungs 13–18 in the SHIPPED
 * tables; the voiced hint lines from one source; the name Olive's Island.
 *
 * The engine is not re-implemented: every run goes through the shipped
 * `Logic/*` scripts (`FUNCTION_SCRIPTS`) with `runScript`, as `cg002Engine.test.ts` does.
 *
 * @module noodl-mcp/tests/cg006Requests.test
 */
import fs from 'fs';
import path from 'path';
import { BAND_PALETTE, Block, GardenRequest, HINTS, OLIVE_RUNGS, REQUESTS, VOICED_HINT_KEYS, WORDS, WORD_KEYS } from './cg002Content';
import { UPGRADES } from './cg002Content';
import { ENGINE, FUNCTION_SCRIPTS, MAX_TICKS, PALETTE_SCRIPT, helper, runScript } from './cg002Scripts';
import { OLIVE_LESSON_IDS, OLIVE_SLOTS_SCRIPT, OLIVE_WORDS, PALETTE_RUNG_IDS } from './cg005Olive';
import { DROPPED_LISTS, DROPPED_RUNGS, Expect, MOMENTS, PROBES, RETIRED_RUNGS, decide, meets, mergeTemplates } from './cg006Probes';
import { IG006_WORDS } from './cg003Content';

/** P106 IG-006: a request's, a rung's or a moment's words live in the engine's table, Olive's, or IG-006's page words. */
const ALLW: Record<string, { en: string; fr: string }> = { ...IG006_WORDS, ...OLIVE_WORDS, ...WORDS };

const REPO = path.resolve(__dirname, '..', '..', '..');
const SHELL = path.join(REPO, 'dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exam = require(path.join(SHELL, 'exam.js'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const check = require(path.join(SHELL, 'olive-check.js'));
const TEMPLATES = JSON.parse(fs.readFileSync(path.join(SHELL, 'olive-templates.json'), 'utf8'));
const READOUT = fs.readFileSync(path.join(REPO, 'dev-docs/tasks/phase-78-the-templates/tpl-012-olive-exam/results-2026-09-27-metal.txt'), 'utf8');

/** The shipped script of a `Logic/*` component. */
function script(component: string): string {
  const f = FUNCTION_SCRIPTS.find((x) => x.component === component);
  if (!f) throw new Error('no script ' + component);
  return f.script;
}
const NEW_RUN = script('Logic/New run');
const STEP = script('Logic/Step');
const APPLY = script('Logic/Apply delta');
const GOAL = script('Logic/Goal met');
const FIND_REPEAT = script('Logic/Find repeat');
const TRANSLATE = script('Logic/Translate words');
const COMPLETE = script('Logic/Complete request');
const ADD_PROFILE = script('Logic/Add profile');

const WORD_ROWS = WORD_KEYS.map((key) => ({ key, ...WORDS[key] }));

// ── Harness (the page's own loop over the shipped scripts) ──────────────────

/** P108 IW-003 (s3 base): laid from seed 1 the way Start world lays it (a request with no job and no seeded layout is untouched). */
function worldOfRequest(r: GardenRequest, seed = 1) {
  const robot: Record<string, unknown> = { id: 'pip', x: r.robotStart.x, y: r.robotStart.y, d: r.robotStart.d };
  if (r.robotStart.carry) robot.carry = [...r.robotStart.carry];
  if (r.robotStart.basket) robot.basket = r.robotStart.basket;
  // IG-002: the can, as Start world passes it.
  if (r.robotStart.can !== undefined) robot.can = r.robotStart.can;
  if (r.robotStart.canMax !== undefined) robot.canMax = r.robotStart.canMax;
  const world = { map: [...r.map], things: r.things.map((t) => ({ ...t })), robots: [robot], schedule: r.schedule ? r.schedule.map((s) => ({ ...s })) : [] };
  return helper<any>(ENGINE, 'seedWorld', world, JSON.parse(JSON.stringify(r)), seed);
}

function runToEnd(program: ReadonlyArray<Block>, world: any, lang = 'en') {
  let run = runScript(NEW_RUN, { program, robotId: 'pip', lang }).run;
  const deltas: any[] = [];
  let ticks = 0;
  let done = false;
  while (ticks < MAX_TICKS) {
    const st = runScript(STEP, { run, world, answer: null });
    world = runScript(APPLY, { world, delta: st.delta }).world;
    run = st.run;
    deltas.push(st.delta);
    ticks++;
    if (st.done) {
      done = true;
      break;
    }
  }
  return { run, world, deltas, ticks, done };
}

function goalOf(r: GardenRequest, program: ReadonlyArray<Block>, lang = 'en') {
  const end = runToEnd(program, worldOfRequest(r), lang);
  return { end, goal: runScript(GOAL, { world: end.world, run: end.run, program, goal: r.goal }) };
}

/** What a band 7–9 child records: repeats unrolled, tricks inlined, primitives only. */
function unrolled(list: ReadonlyArray<Block>, tricks: Record<string, ReadonlyArray<Block>> = {}, next = { n: 1000 }): Block[] {
  const out: Block[] = [];
  for (const b of list) if (b.t === 'trick') tricks[String(b.slots?.name)] = b.body ?? [];
  for (const b of list) {
    if (b.t === 'repeat') for (let k = 0; k < (b.n ?? 0); k++) out.push(...unrolled(b.body ?? [], tricks, next));
    else if (b.t === 'do') out.push(...unrolled(tricks[String(b.slots?.name)] ?? [], tricks, next));
    else if (b.t === 'trick') continue;
    else out.push({ ...b, id: next.n++ });
  }
  return out;
}

function typesIn(list: ReadonlyArray<Block>, out = new Set<string>()): Set<string> {
  for (const b of list) {
    out.add(b.t);
    if (b.body) typesIn(b.body, out);
  }
  return out;
}

const prog = (...ts: Array<Block['t']>): Block[] => ts.map((t, i) => ({ id: i + 1, t }));
const byId = (id: string) => {
  const r = REQUESTS.find((x) => x.id === id);
  if (!r) throw new Error('no request ' + id);
  return r;
};

// ── The §2 table, as the task file writes it ────────────────────────────────

/** [§2 row, request id, islander, trick, reward id, reward kind]. */
const SECTION2: ReadonlyArray<[string, string, string, number, string, string]> = [
  ['1', 'path-postbox', 'sami', 1, 'cap', 'hat'],
  ['1b', 'tulip-door', 'mamie', 1, 'tulip', 'sticker'],
  ['2', 'tulips-three', 'mamie', 2, 'sun', 'hat'],
  ['2b', 'path-stones', 'sami', 2, 'seeds', 'seed'],
  ['3', 'wall-until', 'biscuit', 3, 'paw', 'sticker'],
  ['4', 'bowl-if', 'biscuit', 4, 'crown', 'hat'],
  ['5', 'meow-when', 'biscuit', 5, 'bell', 'item'],
  ['6', 'eggs-count', 'mamie', 6, 'basket', 'item'],
  ['7', 'rows-trick', 'mamie', 7, 'gnome', 'item']
];

const ISLANDER_WORD: Record<string, string> = { sami: 'islSami', mamie: 'islMamie', biscuit: 'islBiscuit' };

/** Every word key a request, a rung or a moment shows. */
function requestFacingKeys(): string[] {
  const keys = new Set<string>();
  for (const r of REQUESTS) for (const k of Object.values(r.copyKeys)) keys.add(k);
  for (const r of OLIVE_RUNGS) {
    keys.add(r.copyKeys.title);
    keys.add(r.copyKeys.line);
    keys.add(r.copyKeys.lesson);
  }
  for (const m of MOMENTS) {
    keys.add(m.copyKeys.title);
    keys.add(m.copyKeys.line);
  }
  return [...keys];
}

/** The rung "after" lines are in the hint table; they are request text too. */
function requestFacingHints(): string[] {
  return OLIVE_RUNGS.map((r) => r.copyKeys.hint);
}

// ── AC5's instrument: the words a timed, scored or streaked game uses ───────

const NOT_A_LETTER_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_A_LETTER_AFTER = '(?![\\p{L}\\p{N}])';
const PRESSURE_EN = ['timer', 'timed', 'time limit', 'time’s up', "time's up", 'seconds?', 'minutes?', 'hurry', 'countdown', 'clock', 'scores?', 'scored', 'points?', 'streaks?', 'in a row', 'every day', 'daily', 'missed', 'lives', 'leaderboard', 'best time', 'fastest', 'quick(ly)?', 'deadline'];
const PRESSURE_FR = ['chrono', 'chronomètre', 'chronométré', 'minuteur', 'secondes?', 'minutes?', 'dépêche(-toi)?', 'vite', 'compte à rebours', 'scores?', 'points?', 'séries?', 'd’affilée', "d'affilée", 'de suite', 'tous les jours', 'chaque jour', 'ratée?s?', 'manquée?s?', 'vies?', 'classement', 'record', 'le plus rapide'];
const pressure = (lang: 'en' | 'fr') => new RegExp(NOT_A_LETTER_BEFORE + '(' + (lang === 'en' ? PRESSURE_EN : PRESSURE_FR).join('|') + ')' + NOT_A_LETTER_AFTER, 'iu');
const MONEY_EN = ['buy', 'bought', 'price', 'cost', 'coins?', 'gems?', 'pay', 'shop', 'store', '€', '\\$'];
const MONEY_FR = ['acheter', 'achète', 'acheté', 'prix', 'coûte', 'pièces?', 'gemmes?', 'payer', 'boutique', 'magasin', 'euros?'];
const money = (lang: 'en' | 'fr') => new RegExp('(' + NOT_A_LETTER_BEFORE + '(' + (lang === 'en' ? MONEY_EN : MONEY_FR).join('|') + ')' + NOT_A_LETTER_AFTER + '|[€$])', 'iu');

describe('CG-006 — the requests', () => {
  describe('AC1 — every §2 row is a request whose reference program reaches its goal, EN and FR, every band it allows', () => {
    it('the nine §2 rows are nine requests with the islander, the trick and the reward the task file gives them', () => {
      expect(SECTION2).toHaveLength(9);
      for (const [row, id, islander, trick, rewardId, kind] of SECTION2) {
        const r = byId(id);
        expect({ row, islander: r.islander, tricks: r.tricks, reward: r.reward }).toEqual({ row, islander, tricks: [trick], reward: { kind, id: rewardId, from: islander } });
      }
      // Every request is a §2 row, or the D3 letter (a `say` request, rung 1's stage).
      const rest = REQUESTS.map((r) => r.id).filter((id) => !SECTION2.some((s) => s[1] === id));
      // P106 IG-006 appends Olive's three (Mamie's note, the rock and the flowers, Sami's thank-you).
      expect(rest).toEqual(['letter-say', 'mamie-note', 'rock-flower', 'sami-thanks']);
      // Band 7–9 gets the steps and the repeat rows (the fold is band 10–12's): 1, 1b, 2, 2b.
      expect(REQUESTS.filter((r) => r.band === 1).map((r) => r.id)).toEqual(['path-postbox', 'tulip-door', 'tulips-three', 'path-stones']);
    });

    const rows: Array<[string, string, number, GardenRequest]> = [];
    for (const [, id] of SECTION2) for (const lang of ['en', 'fr']) for (const band of [1, 2]) if (band >= byId(id).band) rows.push([id, lang, band, byId(id)]);

    it('26 runs: four band 7–9 rows × two bands × two languages, five band 10–12 rows × two languages', () => {
      expect(rows).toHaveLength(4 * 2 * 2 + 5 * 2);
    });

    it.each(rows)('%s · %s · band %i', (id, lang, band, r) => {
      const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
      const palette = new Set<string>(BAND_PALETTE[band as 1 | 2]);
      for (const t of typesIn(program)) expect({ block: t, inBand: palette.has(t), inRequest: r.palette.includes(t as Block['t']) }).toEqual({ block: t, inBand: true, inRequest: true });
      const { end, goal } = goalOf(r, program, lang);
      expect({ id, done: end.done, met: goal.met, missing: goal.missing, bumps: end.run.bumps, puddles: end.run.puddles }).toEqual({ id, done: true, met: true, missing: [], bumps: 0, puddles: 0 });
      expect(end.ticks).toBeLessThan(100);
      // The card in the language: title, blurb, the islander's line, the reward, the gift — no placeholder left.
      const words = runScript(TRANSLATE, { lang, words: WORD_ROWS, botName: 'Pip' });
      for (const key of Object.values(r.copyKeys)) expect({ key, text: words[key] }).toEqual({ key, text: expect.stringMatching(/^[^{}]*\S[^{}]*$/) });
    });

    it('no request is met by doing nothing, and each fails for a plausible wrong program (the goal reads the world, not the blurb)', () => {
      const wrong: Record<string, Block[]> = {
        'path-postbox': prog('fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd'),
        // P108 IW-003 (lane M): the can picked and filled, and the pours made one tile short of the tulip.
        'tulip-door': prog('pick', 'left', 'fill', 'left', 'fwd', 'water', 'water', 'water'),
        // IW-003 (lane M): yesterday's dance — one drink a tulip, so each is 1 of 3 and the job is not done.
        'tulips-three': [{ id: 1, t: 'repeat', n: 3, body: prog('fill', 'left', 'left', 'fwd', 'water', 'right', 'fwd', 'right', 'fwd') }],
        'path-stones': [{ id: 1, t: 'left' }, { id: 2, t: 'repeat', n: 4, body: prog('pick') }, { id: 9, t: 'right' }, { id: 10, t: 'repeat', n: 4, body: prog('fwd', 'put') }],
        'wall-until': prog('fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'left'),
        'bowl-if': [{ id: 1, t: 'repeat', n: 2, body: prog('fwd', 'fwd', 'left', 'put', 'right') }],
        'meow-when': prog('fwd', 'fwd'),
        // IW-003 (lane M): four eggs picked up and never brought to the basket; the trick made and used once.
        'eggs-count': [{ id: 1, t: 'repeat', n: 4, body: [{ id: 2, t: 'go_nearest', slots: { kind: 'egg' } }, { id: 3, t: 'pick' }] }],
        'rows-trick': [{ id: 1, t: 'trick', slots: { name: 'row' }, body: [...prog('fill', 'left', 'left'), { id: 7, t: 'repeat', n: 3, body: prog('fwd', 'left', 'water', 'right') }] }, { id: 20, t: 'do', slots: { name: 'row' } }]
      };
      for (const [, id] of SECTION2) {
        const r = byId(id);
        expect({ id, emptyMet: goalOf(r, []).goal.met, wrongMet: goalOf(r, wrong[id]).goal.met }).toEqual({ id, emptyMet: false, wrongMet: false });
      }
      // 1b's wrong turn is the README's own sentence: the puddle is the error message.
      const door = goalOf(byId('tulip-door'), wrong['tulip-door']);
      expect([door.end.run.puddles, door.goal.missing]).toEqual([1, ['job_done', 'no_puddle']]);
      // 2b laid one tile late: the stone that should start the path is missing, the post box got one.
      const late = goalOf(byId('path-stones'), wrong['path-stones']);
      expect(late.end.world.things).toEqual(expect.arrayContaining([{ kind: 'stone', x: 7, y: 3 }]));
      expect(late.goal.missing).toEqual(['thing_at']);
    });

    it('row 2 "the fold offered": the band 10–12 recording of the tulips offers repeat 3; band 7–9 is never offered one', () => {
      const r = byId('tulips-three');
      const recording = unrolled(r.referenceProgram);
      // IG-002: the fetch-and-return dance; IW-003 (lane M): eleven blocks a pass (fill, turn round, walk, three pours,
      // step down, walk back).
      expect(recording).toHaveLength(33);
      const b2 = runScript(FIND_REPEAT, { program: recording, band: 2 });
      expect({ found: b2.found, offer: b2.offer, count: b2.count, len: b2.len }).toEqual({ found: true, offer: true, count: 3, len: 11 });
      expect(runScript(FIND_REPEAT, { program: recording, band: 1 }).offer).toBe(false);
    });

    it('row 2b: four stones laid, the basket empty, the robot on the last one; the recording offers a fold that covers all eight blocks', () => {
      const r = byId('path-stones');
      const { end } = goalOf(r, r.referenceProgram);
      expect(end.world.things).toEqual([3, 4, 5, 6].map((x) => ({ kind: 'stone', x, y: 3 })));
      expect(end.world.robots[0]).toMatchObject({ x: 6, y: 3, carry: [] });
      const found = runScript(FIND_REPEAT, { program: unrolled(r.referenceProgram), band: 2 });
      // Richard's tie-break ruling (2026-09-28, CG-002 §7): equal cover → the higher count, so this is repeat 4 { put fwd }.
      expect({ offer: found.offer, count: found.count, len: found.len }).toEqual({ offer: true, count: 4, len: 2 });
    });

    it('row 1b: the water lands on the tulip under the house, and nowhere else', () => {
      const r = byId('tulip-door');
      const { end } = goalOf(r, r.referenceProgram);
      // IW-003 (lane M): three drinks from the can Pip picked up (the can is in his hand, not on the plot).
      expect(end.world.things).toEqual([{ kind: 'tulip', id: 'tulip', x: 6, y: 1, watered: true, have: 3, need: 3 }]);
      expect(end.deltas.filter((d) => d.water).map((d) => d.water)).toEqual([{ x: 6, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 1 }]);
    });
  });

  describe('AC2 (§3) — the Olive rungs, framed as requests and graded as data (P106 IG-006: three blocks; the lessons apart)', () => {
    it('three rungs, 1–3 — say, read, is it a…? (R6): 🎓 only on is it a…? (the vote is the lesson); the eighteen are gone', () => {
      expect(OLIVE_RUNGS.map((r) => r.n)).toEqual([1, 2, 3]);
      expect(OLIVE_RUNGS.map((r) => r.table)).toEqual([['say-thanks'], ['read'], ['is-it-a']]);
      expect(OLIVE_RUNGS.filter((r) => r.mark === 'grad').map((r) => r.n)).toEqual([3]);
      expect(OLIVE_RUNGS.map((r) => r.islander)).toEqual(['sami', 'mamie', 'sami']);
      expect(OLIVE_RUNGS.map((r) => r.block)).toEqual(['say', 'ask', 'if']);
      expect(OLIVE_RUNGS.filter((r) => r.moment)).toEqual([]);
      // Each block is the rung of one of IG-006's requests.
      for (const r of OLIVE_RUNGS) expect({ n: r.n, request: REQUESTS.filter((q) => q.id.match(/^(mamie-note|rock-flower|sami-thanks)$/) && (q.rungs || []).includes(r.table[0])).length }).toEqual({ n: r.n, request: 1 });
    });

    it('every rung names rung-table entries that exist in the SHIPPED table, with the ladder its exam column says, the band it says, and a shape the table knows; the lessons are the rest', () => {
      for (const r of OLIVE_RUNGS) {
        for (const id of r.table) expect({ n: r.n, id, inTable: !!TEMPLATES.rungs[id], use: TEMPLATES.rungs[id]?.use }).toEqual({ n: r.n, id, inTable: true, use: 'block' });
        const ladders = new Set(r.table.map((id) => TEMPLATES.rungs[id].ladder));
        if (r.examColumn === 'green') expect({ n: r.n, ladders: [...ladders] }).toEqual({ n: r.n, ladders: ['pass'] });
        for (const id of r.table) expect({ n: r.n, id, band: TEMPLATES.rungs[id].band, n2: TEMPLATES.rungs[id].n }).toEqual({ n: r.n, id, band: r.band, n2: r.n });
        if (r.shape) expect({ n: r.n, shape: r.shape, known: !!TEMPLATES.shapes[r.shape], same: r.table.some((id) => TEMPLATES.rungs[id].shape === r.shape) }).toEqual({ n: r.n, shape: r.shape, known: true, same: true });
      }
      // Every table rung is a block here, one of the five lessons (R7), or the hint voicing — nothing else ships.
      const claimed = OLIVE_RUNGS.flatMap((r) => r.table);
      expect(new Set(claimed).size).toBe(claimed.length);
      expect(Object.keys(TEMPLATES.rungs).filter((id) => id !== 'voice-hint' && !claimed.includes(id) && !OLIVE_LESSON_IDS.includes(id))).toEqual([]);
      expect(OLIVE_LESSON_IDS).toEqual(['count-tulips', 'maths', 'no-letter-e', 'tall-tales', 'translate']);
      for (const id of OLIVE_LESSON_IDS) expect({ id, use: TEMPLATES.rungs[id].use, band: TEMPLATES.rungs[id].band }).toEqual({ id, use: 'lesson', band: 2 });
    });

    it('every rung names exam probes that exist, on its own rung-table entries, designed on its column; every other probe is a lesson’s or the voicing’s', () => {
      const probes = new Map<string, any>(exam.PROBES.map((p: any) => [p.id, p]));
      for (const r of OLIVE_RUNGS) {
        const mine = r.probes.map((id) => probes.get(id));
        for (const [i, p] of mine.entries()) expect({ n: r.n, id: r.probes[i], exists: !!p, onRung: !!p && r.table.includes(p.rung) }).toEqual({ n: r.n, id: r.probes[i], exists: true, onRung: true });
        const modes = new Set(mine.map((p) => p.mode));
        if (r.examColumn === 'green') expect({ n: r.n, fail: modes.has('fail'), pass: modes.has('pass') }).toEqual({ n: r.n, fail: false, pass: true });
      }
      const claimed = new Set(OLIVE_RUNGS.flatMap((r) => r.probes));
      const orphans = exam.PROBES.filter((p: any) => p.rung !== 'voice-hint' && !OLIVE_LESSON_IDS.includes(p.rung) && !claimed.has(p.id)).map((p: any) => p.id);
      expect(orphans).toEqual([]);
    });

    it('ruling 2 lives on as a LESSON: “never use the letter e” (G1) — its probes, its line; "under 5 words", G2 and the rung-9 after-run line are gone', () => {
      const probes = exam.PROBES.filter((p: any) => p.rung === 'no-letter-e');
      expect(probes.map((p: any) => [p.id, p.lang, p.mode, p.expect])).toEqual([
        ['R9-G1-fr', 'fr', 'fail', { kind: 'lacks', letters: ['e'] }],
        ['R9-G1-en', 'en', 'fail', { kind: 'lacks', letters: ['e'] }]
      ]);
      expect(TEMPLATES.rungs['no-letter-e']).toMatchObject({ n: 9, use: 'lesson', band: 2, ladder: 'fail', shape: 'sentence', slots: {} });
      const everything = JSON.stringify([TEMPLATES, exam.PROBES, WORDS, HINTS, OLIVE_WORDS, PROBES, DROPPED_RUNGS]);
      for (const gone of ['under-five-words', 'UnderFiveWords', 'no-water', 'or9LineG1', 'or9LineG2', 'say-thanks-en-wide', 'say-thanks-en-none', 'TY-A-en', 'TY-B-en', 'R9-G2']) expect({ gone, found: everything.includes(gone) }).toEqual({ gone, found: false });
      for (const lang of ['en', 'fr'] as const) expect(WORDS.or9Line[lang]).toMatch(lang === 'en' ? /letter e/ : /lettre e/);
      for (let n = 4; n <= 18; n++) expect({ n, line: HINTS['oliveRung' + n] }).toEqual({ n, line: undefined });
    });

    it('ruling 4: Olive’s blocks are band 10–12 only — band 7–9 is offered none and every slot refuses there; band 10–12 reaches all three; the hints stay in both bands', () => {
      const W = [...WORD_ROWS, ...Object.keys(OLIVE_WORDS).map((key) => ({ key, ...OLIVE_WORDS[key] }))];
      expect(OLIVE_RUNGS.filter((r) => r.band !== 2).map((r) => r.n)).toEqual([]);
      for (const lang of ['en', 'fr']) {
        const b1 = runScript(PALETTE_SCRIPT, { band: 1, lang, words: W, rungs: 'all', exam: null });
        const b2 = runScript(PALETTE_SCRIPT, { band: 2, lang, words: W, rungs: 'all', exam: null });
        expect({ lang, band1: b1.offered, olive1: b1.olive.length, band2: b2.offered }).toEqual({ lang, band1: [], olive1: 0, band2: PALETTE_RUNG_IDS });
        expect(b2.offered).toEqual(['say-thanks', 'read', 'is-it-a']);
        expect(new Set(b2.offered.map((id: string) => TEMPLATES.rungs[id].n))).toEqual(new Set(OLIVE_RUNGS.map((r) => r.n)));
      }
      for (const rung of PALETTE_RUNG_IDS) expect({ rung, reason: runScript(OLIVE_SLOTS_SCRIPT, { rung, band: 1, lang: 'fr', words: W, slots: {} }).reason }).toEqual({ rung, reason: 'not-in-band' });
      expect(TEMPLATES.rungs['voice-hint'].band).toBe(1);
    });

    it('every rung’s card resolves in both languages: title, line, lesson, and the hint the table says after the run (and the resting one)', () => {
      for (const lang of ['en', 'fr'] as const) {
        for (const r of OLIVE_RUNGS) {
          for (const key of [r.copyKeys.title, r.copyKeys.line, r.copyKeys.lesson]) expect({ n: r.n, key, text: (ALLW[key]?.[lang] || '').split('{b}').join('Pip') }).toEqual({ n: r.n, key, text: expect.stringMatching(/^[^{}]*\S[^{}]*$/) });
          expect({ n: r.n, hint: !!HINTS[r.copyKeys.hint]?.[lang], resting: !!HINTS['oliveResting' + r.n]?.[lang] }).toEqual({ n: r.n, hint: true, resting: true });
        }
      }
      // The moments CG-006 promoted to rungs 13–18 left with the rest (R6/R7): their tables are kept as evidence only.
      for (const m of MOMENTS.filter((x) => x.rung)) expect({ id: m.id, retired: !!RETIRED_RUNGS[m.rung!.table], shipped: !!TEMPLATES.rungs[m.rung!.table] }).toEqual({ id: m.id, retired: true, shipped: false });
    });

    it('one source for the voiced hints: the page\'s seven lines ARE the shell\'s table (derived), and every placeholder is one the shell fills', () => {
      expect([...VOICED_HINT_KEYS].sort()).toEqual([...TEMPLATES.lists.hintKeys.en].sort());
      expect([...VOICED_HINT_KEYS].sort()).toEqual([...TEMPLATES.lists.hintKeys.fr].sort());
      for (const key of VOICED_HINT_KEYS) expect({ key, page: HINTS[key] }).toEqual({ key, page: { en: TEMPLATES.hints[key].en, fr: TEMPLATES.hints[key].fr } });
      const slots = Object.keys(TEMPLATES.rungs['voice-hint'].slots);
      for (const key of VOICED_HINT_KEYS) {
        for (const lang of ['en', 'fr'] as const) {
          const holes = [...HINTS[key][lang].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
          expect({ key, lang, unknown: holes.filter((h) => !slots.includes(h)) }).toEqual({ key, lang, unknown: [] });
          const v = check.checkSlots(TEMPLATES, 'voice-hint', { key, b: 'Bo', n: '4', w: '2', t: '5' }, lang).values;
          const user = check.compose(TEMPLATES, 'voice-hint', v, { lang }).user;
          // The page's line with the same values, exactly, inside the prompt.
          expect({ key, lang, filled: user.includes(HINTS[key][lang].replace(/\{b\}/g, 'Bo').replace(/\{n\}/g, '4').replace(/\{w\}/g, '2').replace(/\{t\}/g, '5')) }).toEqual({ key, lang, filled: true });
        }
      }
    });

    it('ruling 7: the game is called Olive’s Island / L’île d’Olive, and no word says "Bot Garden"', () => {
      expect(WORDS.brand).toEqual({ en: 'Olive’s Island', fr: 'L’île d’Olive' });
      const said = WORD_KEYS.flatMap((k) => ['en', 'fr'].map((l) => [k, (WORDS[k] as any)[l]])).filter(([, t]) => /bot garden|jardin des bots/i.test(t));
      expect(said).toEqual([]);
      // The save code moves islands now, not "a garden".
      expect([WORDS.guD2.en, WORDS.saveCodeBad.en].filter((t) => /garden/i.test(t))).toEqual([]);
    });
  });

  describe('AC2 (§4) — the moments\' probes are well-formed against the shell\'s own checks (offline, canned replies; the model is the exam\'s)', () => {
    const merged = mergeTemplates(TEMPLATES);

    it('the promoted moments are in the SHIPPED table; the dropped ones only in the merged evidence, which never overwrites the shell\'s', () => {
      const before = JSON.stringify(TEMPLATES);
      mergeTemplates(TEMPLATES);
      expect(JSON.stringify(TEMPLATES)).toBe(before);
      for (const id of Object.keys(DROPPED_RUNGS)) expect({ id, shipped: !!TEMPLATES.rungs[id] }).toEqual({ id, shipped: false });
      for (const name of Object.keys(DROPPED_LISTS)) expect({ name, shipped: !!TEMPLATES.lists[name] }).toEqual({ name, shipped: false });
      expect(Object.keys(merged.rungs).length).toBe(Object.keys(TEMPLATES.rungs).length + Object.keys(DROPPED_RUNGS).length + Object.keys(RETIRED_RUNGS).length);
      // A shipped probe is the exam's own entry, field for field; a dropped one is in no exam.
      const examIds = new Map<string, any>(exam.PROBES.map((p: any) => [p.id, p]));
      for (const p of PROBES) {
        const { moment, column, canned, shipped, ...rest } = p;
        if (shipped) expect({ id: p.id, same: JSON.stringify(rest) === JSON.stringify(examIds.get(p.id)) }).toEqual({ id: p.id, same: true });
        else expect({ id: p.id, inExam: examIds.has(p.id), rungShipped: !!TEMPLATES.rungs[p.rung] }).toEqual({ id: p.id, inExam: false, rungShipped: false });
      }
      // IG-006: only the letter-e lesson's two ship; the six moments' sixteen are evidence (their rungs were cut).
      expect(PROBES.filter((p) => p.shipped).map((p) => p.id)).toEqual(['R9-G1-fr', 'R9-G1-en']);
    });

    it.each(PROBES.map((p) => [p.id, p] as const))('%s: slots pass checkSlots, compose gives its shape, the canned reply grades as its column — on the SHIPPED table when shipped', (_id, p) => {
      const table = p.shipped ? TEMPLATES : merged;
      const slots = check.checkSlots(table, p.rung, p.slots, p.lang);
      expect({ id: p.id, ok: slots.ok, reason: slots.reason }).toEqual({ id: p.id, ok: true, reason: undefined });
      const prompt = check.compose(table, p.rung, slots.values, { lang: p.lang, shape: p.shape, temperature: p.temperature });
      expect(prompt.shape).toBe(p.shape ?? table.rungs[p.rung].shape);
      expect(prompt.user).not.toMatch(/\{\w+\}/);
      expect(prompt.system).not.toMatch(/\{\w+\}/);
      const reply = check.checkOutput(p.canned, prompt);
      // A canned green reply passes every check; a canned 🎓 reply is a VALID answer that breaks the rule (a refusal
      // would be the fallback, not the lesson); a mixed one only has to be valid.
      expect({ id: p.id, ok: reply.ok, reason: reply.reason }).toEqual({ id: p.id, ok: true, reason: undefined });
      const verdict = meets(p.expect, reply);
      if (p.column === 'green') expect({ id: p.id, met: verdict }).toEqual({ id: p.id, met: true });
      if (p.column === 'grad') expect({ id: p.id, met: verdict }).toEqual({ id: p.id, met: false });
      // The exam grades every kind these probes use (a kind it does not know can never pass: exam.test.js).
      expect({ id: p.id, known: exam.KINDS.includes(p.expect.kind) }).toEqual({ id: p.id, known: true });
      // The mode says the same as the column: a 🎓 probe is asserted as failing; a mixed one is recorded.
      expect({ id: p.id, mode: p.mode }).toEqual({ id: p.id, mode: p.column === 'grad' ? 'fail' : p.column === 'mixed' ? 'record' : 'pass' });
    });

    it('one grader: this file\'s `meets` IS the exam\'s `meetsOne` (the EXAM_KIND_PATCH of s2 is in exam.js; nothing is copied back here)', () => {
      const keeps = { ok: true, text: 'Un chat noir.' };
      const lacksE: Expect = { kind: 'lacks', letters: ['e'] };
      expect([meets(lacksE, keeps), exam.meetsOne(lacksE, keeps)]).toEqual([true, true]);
      for (const p of PROBES) for (const text of [p.canned, 'Un chat noir.', 'Pip avance, tourne à gauche et arrose.', 'Pip waters it.']) expect({ id: p.id, text, same: meets(p.expect, { ok: true, text }) === exam.meetsOne(p.expect, { ok: true, text }) }).toEqual({ id: p.id, text, same: true });
    });

    it('`lacks` reads whole words: "beau" and "oiseau" are not "eau"; "l’eau" is', () => {
      const noWater: Expect = { kind: 'lacks', words: ['eau', 'arrose'] };
      expect(meets(noWater, { ok: true, text: 'Un bel oiseau, un beau chapeau.' })).toBe(true);
      expect(meets(noWater, { ok: true, text: 'Pip porte de l’eau.' })).toBe(false);
      expect(meets(noWater, { ok: true, text: "Pip porte de l'eau." })).toBe(false);
      expect(meets(noWater, { ok: true, text: 'Pip arrose.' })).toBe(false);
      expect(meets({ kind: 'lacks', letters: ['e'] }, { ok: true, text: 'Un chat très joli.' })).toBe(false);
      expect(meets({ kind: 'lacks', letters: ['e'] }, { ok: true, text: 'Un chat joli.' })).toBe(true);
    });

    /** The replies the 2026-09-27 battery recorded under one `## <id>` heading. */
    function recorded(id: string): string[] {
      const at = READOUT.indexOf('## ' + id + ' ');
      expect(at).toBeGreaterThanOrEqual(0);
      const rest = READOUT.slice(at).split('\n').slice(1);
      const out: string[] = [];
      for (const line of rest) {
        if (line.startsWith('## ')) break;
        const m = line.match(/^\s+\[\d+ms\] (.*)$/);
        if (m) out.push(m[1]);
      }
      return out;
    }

    it('the recorded readout that decided ruling 2, graded by the shipped grader: G1 breaks its rule 3/3 (kept); G2 KEEPS its rule 3/3 (dropped); B5 broke "under 5" 3/3 in the battery', () => {
      const g1 = PROBES.find((p) => p.id === 'R9-G1-fr')!;
      // G2 "never mention water" is retired; its rule, whole words (accents folded), is kept here as the record of why.
      const g2 = { expect: { kind: 'lacks', words: ['eau', 'eaux', 'arroser', 'arrose', 'arroses', 'arrosent', 'arrosé', 'arrosée', 'arrosés', 'arrosage', 'arrosoir', 'pluie', 'mouiller', 'mouillé'] } as Expect };
      const g1r = recorded('G1');
      const g2r = recorded('G2');
      const b5r = recorded('B5');
      expect([g1r.length, g2r.length, b5r.length]).toEqual([3, 3, 3]);
      const kept = (e: Expect, xs: string[]) => xs.filter((t) => meets(e, { ok: true, text: t })).length;
      // G1: every reply has an e → the 🎓 shows. G2: no reply mentions water → the 🎓 does NOT show on this readout.
      expect([kept(g1.expect, g1r), kept(g2.expect, g2r)]).toEqual([0, 3]);
      // B5 in the battery broke "under 5 words" 3/3 (7 words); the contract test the same day obeyed 6/6 (CG-004 §7 a).
      expect(kept({ kind: 'wordsAtMost', n: 4 }, b5r)).toBe(0);
    });

    it('ruling 3: the EN thank-you has no must-contain — the recorded A9 replies and a thank-you without "thank" both pass in EN; FR still needs "merci"', () => {
      const a9 = recorded('A9');
      expect(a9).toHaveLength(3);
      const en = check.compose(TEMPLATES, 'say-thanks', { to: 'Mamie Rose', deed: 'watered her three tulips' }, { lang: 'en' });
      const fr = check.compose(TEMPLATES, 'say-thanks', { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, { lang: 'fr' });
      expect([en.mustContain, fr.mustContain]).toEqual([[], ['merci']]);
      for (const t of a9) expect({ t, ok: check.checkOutput(t, en).ok }).toEqual({ t, ok: true });
      // The reply the old list refused (CG-006 §7: "I really appreciate…" → must-contain), and §7.1's candidate-A miss.
      for (const t of ['I really appreciate you trusting me with your garden, Mamie Rose!', 'Thank Mamie Rose for trusting you with the garden.']) expect({ t, ok: check.checkOutput(t, en).ok }).toEqual({ t, ok: true });
      expect(check.checkOutput('Bonjour Mamie Rose, quel beau jardin !', fr).reason).toBe('must-contain');
      // The exam's EN thank-you probe is graded `ok` (a thank-you came back through every check) — P02, the CPU red of s2.
      expect(exam.PROBES.find((p: any) => p.id === 'P02')).toMatchObject({ rung: 'say-thanks', lang: 'en', mode: 'pass', expect: { kind: 'ok' } });
    });
  });

  describe('AC3 — every string is in the word table, EN and FR', () => {
    const facing = requestFacingKeys();

    it('every request, rung and moment key exists with an EN and an FR line, and the two differ', () => {
      expect(facing.length).toBeGreaterThanOrEqual(REQUESTS.length * 5 + OLIVE_RUNGS.length * 3 + MOMENTS.length * 2 - 3);
      for (const key of facing) {
        const w = ALLW[key];
        expect({ key, en: !!w?.en?.trim(), fr: !!w?.fr?.trim() }).toEqual({ key, en: true, fr: true });
        // "Seeds" / "Graines" differ; only a proper noun may be the same, and none of these is one.
        expect({ key, same: w.en === w.fr }).toEqual({ key, same: false });
      }
    });

    it('the French is typeset as French: « » not "", ’ not \', and a space before ! ? : ;', () => {
      for (const key of facing) {
        const fr = ALLW[key].fr;
        expect({ key, straight: /["']/.test(fr) }).toEqual({ key, straight: false });
        expect({ key, noSpaceBefore: /\S[!?:;]/.test(fr.replace(/\{b\}/g, 'Pip')) }).toEqual({ key, noSpaceBefore: false });
      }
    });

    it('the whole table: every word has both languages, and the robot\'s name fills every {b}', () => {
      for (const lang of ['en', 'fr'] as const) {
        const words = runScript(TRANSLATE, { lang, words: WORD_ROWS, botName: 'Bo' });
        for (const key of WORD_KEYS) expect({ key, lang, text: words[key].length > 0, b: words[key].includes('{b}') }).toEqual({ key, lang, text: true, b: false });
      }
      // A line with {b} names the robot the profile named.
      expect(runScript(TRANSLATE, { lang: 'fr', words: WORD_ROWS, botName: 'Bo' }).rqDoorLine).toContain('Bo peut');
    });
  });

  describe('AC4 — rewards are cosmetic, never bought, and each names the islander it came from', () => {
    it('every reward is a hat, a sticker, a seed or an item, comes from the request\'s islander, and its gift line names that islander in both languages', () => {
      for (const r of REQUESTS) {
        expect({ id: r.id, kind: ['hat', 'sticker', 'seed', 'item'].includes(r.reward.kind), from: r.reward.from }).toEqual({ id: r.id, kind: true, from: r.islander });
        for (const lang of ['en', 'fr'] as const) {
          const gift = ALLW[r.copyKeys.gift][lang];
          const who = ALLW[ISLANDER_WORD[r.islander]][lang];
          const thing = ALLW[r.copyKeys.reward][lang].toLowerCase();
          expect({ id: r.id, lang, gift, namesWho: gift.includes(who), namesThing: gift.toLowerCase().includes(thing) }).toEqual({ id: r.id, lang, gift, namesWho: true, namesThing: true });
        }
      }
      // Ten requests, ten different gifts: no two requests hand out the same thing.
      expect(new Set(REQUESTS.map((r) => r.reward.id)).size).toBe(REQUESTS.length);
    });

    it('no request, reward or gift line mentions money — and the instrument catches a planted price', () => {
      for (const r of REQUESTS) {
        expect({ id: r.id, field: Object.keys(r).filter((k) => /price|cost|coin|buy|shop/i.test(k)), rewardField: Object.keys(r.reward).filter((k) => !['kind', 'id', 'from'].includes(k)) }).toEqual({ id: r.id, field: [], rewardField: [] });
      }
      for (const key of requestFacingKeys()) for (const lang of ['en', 'fr'] as const) expect({ key, lang, money: money(lang).test(ALLW[key][lang]) }).toEqual({ key, lang, money: false });
      // Known-firing beside the absence.
      expect(['Buy the crown for 3 coins', 'A hat for €2', 'Only 50 gems!'].map((t) => money('en').test(t))).toEqual([true, true, true]);
      expect(['Achète la couronne', 'Le prix : 3 pièces', 'Va à la boutique'].map((t) => money('fr').test(t))).toEqual([true, true, true]);
    });

    it('a finished request puts its reward on the profile that finished it: hats on the hat rail, the rest on the sticker page', () => {
      let model: any = runScript(ADD_PROFILE, { model: null, name: 'A', band: 1, lang: 'fr', face: 'f1', robotName: 'Pip', color: '#FF7A59', eye: 'round' }).model;
      for (const r of REQUESTS) model = runScript(COMPLETE, { model, profileId: model.profiles[0].id, requestId: r.id, tricks: r.tricks, reward: r.reward }).model;
      const p = model.profiles[0];
      expect([...p.hats].sort()).toEqual(REQUESTS.filter((r) => r.reward.kind === 'hat').map((r) => r.reward.id).sort());
      // P106 IG-005: the upgrades (items) the catalogue gives after their requests are on the sticker page too.
      expect([...p.stickers].sort()).toEqual([...REQUESTS.filter((r) => r.reward.kind !== 'hat').map((r) => r.reward.id), ...UPGRADES.map((u) => u.id)].sort());
      expect(model.island.done).toHaveLength(REQUESTS.length);
    });
  });

  describe('AC5 — no request carries a timer, a score, a streak or a "you missed"', () => {
    it('no request-facing line in either language uses the words of pressure', () => {
      const hits: string[] = [];
      for (const key of requestFacingKeys()) for (const lang of ['en', 'fr'] as const) if (pressure(lang).test(ALLW[key][lang])) hits.push(key + ':' + lang + ': ' + ALLW[key][lang]);
      for (const key of requestFacingHints()) for (const lang of ['en', 'fr'] as const) if (pressure(lang).test(HINTS[key][lang])) hits.push(key + ':' + lang + ': ' + HINTS[key][lang]);
      expect(hits).toEqual([]);
    });

    it('no request has a field for time, score, streak, lives or a deadline (a `schedule` is the world\'s events, by tick, never a clock)', () => {
      for (const r of REQUESTS) expect({ id: r.id, fields: Object.keys(r).filter((k) => /time|score|streak|live|deadline|point|limit/i.test(k)) }).toEqual({ id: r.id, fields: [] });
      for (const r of OLIVE_RUNGS) expect({ n: r.n, fields: Object.keys(r).filter((k) => /time|score|streak|live|deadline|point|limit/i.test(k)) }).toEqual({ n: r.n, fields: [] });
    });

    it('the instrument fires on every planted line (known-firing beside the absence)', () => {
      const en = ['Beat the timer!', 'Your score: 3', 'A 5-day streak!', 'You missed a day.', 'Hurry up!', '30 seconds left', 'Three in a row!'];
      const fr = ['Bats le chrono !', 'Ton score : 3', 'Une série de 5 jours !', 'Tu as raté un jour.', 'Dépêche-toi !', 'Encore 30 secondes', 'Trois de suite !', 'Vite !'];
      expect(en.filter((t) => !pressure('en').test(t))).toEqual([]);
      expect(fr.filter((t) => !pressure('fr').test(t))).toEqual([]);
      // And does not fire on the island's ordinary words.
      expect(['Every time I meow', 'one after the other', 'most of the time'].filter((t) => pressure('en').test(t))).toEqual([]);
      expect(['tout à l’heure', 'à chaque fois', 'l’une après l’autre'].filter((t) => pressure('fr').test(t))).toEqual([]);
    });
  });

  describe('AC6 — §4\'s add-probe rows each carry a probe and a decision', () => {
    it('thirteen moments with the status §4 gave them; the nine add-probe rows each have a probe, the four others their evidence', () => {
      expect(MOMENTS.map((m) => m.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13']);
      expect(MOMENTS.filter((m) => m.status === 'add-probe').map((m) => m.id)).toEqual(['E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10']);
      expect(MOMENTS.filter((m) => m.status === 'ship').map((m) => m.id)).toEqual(['E1', 'E11', 'E12']);
      expect(MOMENTS.filter((m) => m.status === 'grown-ups').map((m) => m.id)).toEqual(['E13']);
      // §4's columns: 🎓 on 8 (and on 9, 12, 13, which are mixed / certain); E9 mixed.
      expect(MOMENTS.filter((m) => m.column === 'grad').map((m) => m.id)).toEqual(['E8']);
      expect(MOMENTS.filter((m) => m.column === 'mixed').map((m) => m.id)).toEqual(['E9']);
      for (const m of MOMENTS) {
        if (m.status === 'add-probe') {
          const mine = PROBES.filter((p) => p.moment === m.id).map((p) => p.id);
          expect({ id: m.id, probes: m.probes }).toEqual({ id: m.id, probes: mine });
          expect({ id: m.id, some: m.probes.length > 0, decision: ['promoted', 'dropped'].includes(m.decision), evidence: /§7\.1/.test(m.evidence ?? '') }).toEqual({ id: m.id, some: true, decision: true, evidence: true });
        } else expect({ id: m.id, evidence: !!m.evidence, decision: m.decision }).toEqual({ id: m.id, evidence: true, decision: 'ships' });
        for (const key of [m.copyKeys.title, m.copyKeys.line]) expect({ key, en: !!WORDS[key]?.en, fr: !!WORDS[key]?.fr }).toEqual({ key, en: true, fr: true });
      }
      // No probe without a home, no id twice.
      const homes = new Set([...MOMENTS.map((m) => m.id), 'rung9']);
      expect(PROBES.filter((p) => !homes.has(p.moment)).map((p) => p.id)).toEqual([]);
      expect(new Set(PROBES.map((p) => p.id)).size).toBe(PROBES.length);
    });

    it('the decisions are the real model\'s (CG-006 §7.1): E3 E4 E5 E8 E9 E10 promoted to rungs 13–18, E2 E6 E7 dropped; since IG-006 (R6/R7) every one of their probes is evidence', () => {
      expect(MOMENTS.filter((m) => m.status === 'add-probe').map((m) => [m.id, m.decision, m.rung?.n ?? null])).toEqual([
        ['E2', 'dropped', null], ['E3', 'promoted', 13], ['E4', 'promoted', 14], ['E5', 'promoted', 15], ['E6', 'dropped', null],
        ['E7', 'dropped', null], ['E8', 'promoted', 16], ['E9', 'promoted', 17], ['E10', 'promoted', 18]
      ]);
      // A promoted moment's probes are all shipped (in the exam, on its rung); a dropped one's are all evidence.
      for (const m of MOMENTS.filter((x) => x.status === 'add-probe')) {
        const mine = PROBES.filter((p) => p.moment === m.id);
        expect({ id: m.id, shipped: [...new Set(mine.map((p) => p.shipped))] }).toEqual({ id: m.id, shipped: [false] });
        if (m.rung) for (const p of mine) expect({ id: p.id, rung: p.rung }).toEqual({ id: p.id, rung: m.rung.table });
      }
      // decide() over the §7.1 readout (majority per probe on the CPU path; Metal agreed on every decision) reproduces
      // every decision. Only what §7.1 measured is here: E3-count and E5-en were not run (recorded, and decide() reads
      // no recorded probe of a green moment); E9-en was not run either, so both of its values are tried.
      const measured: Record<string, boolean> = { 'E2-empty': false, 'E2-row-fr': false, 'E2-row-en': true, 'E3-fr': true, 'E3-en': true, 'E4-fr': true, 'E4-en': true, 'E5-fr': true, 'E5-apt': false, 'E6-polite': false, 'E6-poem': true, 'E6-shorter': true, 'E7-tulipe': true, 'E7-lettre': false, 'E8-fr': false, 'E8-en': false, 'E9-arrosoir': false, 'E9-chouette': false, 'E9-rocher': true, 'E10-fr': true, 'E10-en': true };
      for (const e9en of [true, false]) {
        const readout = { ...measured, 'E9-en': e9en };
        const rows = PROBES.filter((p) => p.id in readout).map((p) => ({ id: p.id, mode: p.mode, met: readout[p.id], pass: p.mode === 'fail' ? !readout[p.id] : readout[p.id] }));
        for (const m of MOMENTS.filter((x) => x.status === 'add-probe')) expect({ id: m.id, e9en, decided: decide(m, rows) }).toEqual({ id: m.id, e9en, decided: m.decision });
      }
    });

    it('decide(): no rows → awaiting; the column held → promoted; contradicted → dropped; mixed needs disagreement', () => {
      const row = (id: string, pass: boolean) => {
        const p = PROBES.find((x) => x.id === id)!;
        const met = p.mode === 'fail' ? !pass : pass;
        return { id, mode: p.mode, met, pass };
      };
      const e2 = MOMENTS.find((m) => m.id === 'E2')!;
      const e8 = MOMENTS.find((m) => m.id === 'E8')!;
      const e9 = MOMENTS.find((m) => m.id === 'E9')!;
      expect(decide(e2, [])).toBe('awaiting-probe');
      expect(decide(e2, [row('E2-row-fr', true)])).toBe('awaiting-probe');
      expect(decide(e2, [row('E2-row-fr', true), row('E2-row-en', true)])).toBe('promoted');
      expect(decide(e2, [row('E2-row-fr', true), row('E2-row-en', false)])).toBe('dropped');
      // A 🎓 row: "pass" means she failed as designed.
      expect(decide(e8, [row('E8-fr', true), row('E8-en', true)])).toBe('promoted');
      expect(decide(e8, [{ id: 'E8-fr', mode: 'fail', met: true, pass: false }, row('E8-en', true)])).toBe('dropped');
      const rec = (id: string, met: boolean) => ({ id, mode: 'record' as const, met, pass: met });
      expect(decide(e9, [rec('E9-arrosoir', true), rec('E9-chouette', false), rec('E9-rocher', true), rec('E9-en', true)])).toBe('promoted');
      expect(decide(e9, [rec('E9-arrosoir', true), rec('E9-chouette', true), rec('E9-rocher', true), rec('E9-en', true)])).toBe('dropped');
      expect(decide(e9, [rec('E9-arrosoir', true), rec('E9-chouette', false), rec('E9-rocher', true)])).toBe('awaiting-probe');
      expect(decide(MOMENTS.find((m) => m.id === 'E1')!, [])).toBe('ships');
    });
  });
});
