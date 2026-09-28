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
 * The engine is not re-implemented: every run goes through the shipped
 * `Logic/*` scripts (`FUNCTION_SCRIPTS`) with `runScript`, as `cg002Engine.test.ts` does.
 *
 * @module noodl-mcp/tests/cg006Requests.test
 */
import fs from 'fs';
import path from 'path';
import { BAND_PALETTE, Block, GardenRequest, HINTS, OLIVE_RUNGS, REQUESTS, WORDS, WORD_KEYS } from './cg002Content';
import { FUNCTION_SCRIPTS, MAX_TICKS, runScript } from './cg002Scripts';
import { EXAM_KINDS, EXAM_KIND_PATCH, Expect, MOMENTS, PROBES, PROPOSED_LISTS, PROPOSED_RUNGS, RULINGS, decide, fold, meets, mergeTemplates } from './cg006Probes';

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

function worldOfRequest(r: GardenRequest) {
  const robot: Record<string, unknown> = { id: 'pip', x: r.robotStart.x, y: r.robotStart.y, d: r.robotStart.d };
  if (r.robotStart.carry) robot.carry = [...r.robotStart.carry];
  if (r.robotStart.basket) robot.basket = r.robotStart.basket;
  return { map: [...r.map], things: r.things.map((t) => ({ ...t })), robots: [robot], schedule: r.schedule ? r.schedule.map((s) => ({ ...s })) : [] };
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
    for (const c of r.ruleCandidates ?? []) keys.add(c.line);
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
      expect(rest).toEqual(['letter-say']);
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
        'tulip-door': prog('fwd', 'fwd', 'fwd', 'right', 'fwd', 'water'),
        'tulips-three': prog('fwd', 'fwd', 'left', 'water', 'right', 'fwd', 'fwd', 'left', 'water', 'right'),
        'path-stones': [{ id: 1, t: 'repeat', n: 4, body: prog('fwd', 'put') }],
        'wall-until': prog('fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'fwd', 'left'),
        'bowl-if': [{ id: 1, t: 'repeat', n: 2, body: prog('fwd', 'fwd', 'left', 'put', 'right') }],
        'meow-when': prog('fwd', 'fwd'),
        'eggs-count': [{ id: 1, t: 'until', slots: { sensor: 'wall_ahead' }, body: prog('pick', 'count_inc', 'fwd') }],
        'rows-trick': [{ id: 1, t: 'repeat', n: 3, body: prog('fwd', 'fwd', 'left', 'water', 'right') }]
      };
      for (const [, id] of SECTION2) {
        const r = byId(id);
        expect({ id, emptyMet: goalOf(r, []).goal.met, wrongMet: goalOf(r, wrong[id]).goal.met }).toEqual({ id, emptyMet: false, wrongMet: false });
      }
      // 1b's wrong turn is the README's own sentence: the puddle is the error message.
      const door = goalOf(byId('tulip-door'), wrong['tulip-door']);
      expect([door.end.run.puddles, door.goal.missing]).toEqual([1, ['every_tulip_watered', 'no_puddle']]);
      // 2b laid one tile late: the stone that should start the path is missing, the post box got one.
      const late = goalOf(byId('path-stones'), wrong['path-stones']);
      expect(late.end.world.things).toEqual(expect.arrayContaining([{ kind: 'stone', x: 7, y: 3 }]));
      expect(late.goal.missing).toEqual(['thing_at']);
    });

    it('row 2 "the fold offered": the band 10–12 recording of the tulips offers repeat 3; band 7–9 is never offered one', () => {
      const r = byId('tulips-three');
      const recording = unrolled(r.referenceProgram);
      expect(recording).toHaveLength(15);
      const b2 = runScript(FIND_REPEAT, { program: recording, band: 2 });
      expect({ found: b2.found, offer: b2.offer, count: b2.count, len: b2.len }).toEqual({ found: true, offer: true, count: 3, len: 5 });
      expect(runScript(FIND_REPEAT, { program: recording, band: 1 }).offer).toBe(false);
    });

    it('row 2b: four stones laid, the basket empty, the robot on the last one; the recording offers a fold that covers all eight blocks', () => {
      const r = byId('path-stones');
      const { end } = goalOf(r, r.referenceProgram);
      expect(end.world.things).toEqual([3, 4, 5, 6].map((x) => ({ kind: 'stone', x, y: 3 })));
      expect(end.world.robots[0]).toMatchObject({ x: 6, y: 3, carry: [] });
      const found = runScript(FIND_REPEAT, { program: unrolled(r.referenceProgram), band: 2 });
      // The open tie-break ruling (CG-002 §7): equal cover → the longer sequence, so this is repeat 2 { put fwd put fwd }.
      expect({ offer: found.offer, cover: found.count * found.len }).toEqual({ offer: true, cover: 8 });
    });

    it('row 1b: the water lands on the tulip under the house, and nowhere else', () => {
      const r = byId('tulip-door');
      const { end } = goalOf(r, r.referenceProgram);
      expect(end.world.things).toEqual([{ kind: 'tulip', x: 7, y: 1, watered: true }]);
      expect(end.deltas.filter((d) => d.water)).toEqual([expect.objectContaining({ water: { x: 7, y: 1 } })]);
    });
  });

  describe('AC2 (§3) — the twelve Olive rungs, framed as requests and graded as data', () => {
    it('twelve rungs, 1–12, 🎓 exactly where §3 marks it (4, 6, 7, 8, 9, 10); 8 and 10 are band 10–12', () => {
      expect(OLIVE_RUNGS.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(OLIVE_RUNGS.filter((r) => r.mark === 'grad').map((r) => r.n)).toEqual([4, 6, 7, 8, 9, 10]);
      expect(OLIVE_RUNGS.filter((r) => r.band === 2).map((r) => r.n)).toEqual([8, 10]);
      // §3's islanders.
      expect(OLIVE_RUNGS.map((r) => r.islander)).toEqual(['sami', 'mamie', 'sami', 'sami', 'biscuit', null, 'mamie', null, null, null, 'sami', null]);
      // §3's blocks: say (1), none (10), `if Olive says` (6), ask for the rest.
      expect(OLIVE_RUNGS.map((r) => r.block)).toEqual(['say', 'ask', 'ask', 'ask', 'ask', 'if', 'ask', 'ask', 'ask', null, 'ask', 'ask']);
    });

    it('every rung names rung-table entries that exist, with the ladder its exam column says, and a shape the table knows', () => {
      for (const r of OLIVE_RUNGS) {
        for (const id of r.table) expect({ n: r.n, id, inTable: !!TEMPLATES.rungs[id] }).toEqual({ n: r.n, id, inTable: true });
        const ladders = new Set(r.table.map((id) => TEMPLATES.rungs[id].ladder));
        if (r.examColumn === 'green') expect({ n: r.n, ladders: [...ladders] }).toEqual({ n: r.n, ladders: ['pass'] });
        if (r.examColumn === 'grad') expect({ n: r.n, ladders: [...ladders] }).toEqual({ n: r.n, ladders: ['fail'] });
        if (r.shape) expect({ n: r.n, shape: r.shape, known: !!TEMPLATES.shapes[r.shape] }).toEqual({ n: r.n, shape: r.shape, known: true });
      }
    });

    it('every rung names exam probes that exist, on its own rung-table entries, designed on its column (green stays green, 🎓 stays red)', () => {
      const probes = new Map<string, any>(exam.PROBES.map((p: any) => [p.id, p]));
      for (const r of OLIVE_RUNGS) {
        const mine = r.probes.map((id) => probes.get(id));
        for (const [i, p] of mine.entries()) expect({ n: r.n, id: r.probes[i], exists: !!p, onRung: !!p && r.table.includes(p.rung) }).toEqual({ n: r.n, id: r.probes[i], exists: true, onRung: true });
        const modes = new Set(mine.map((p) => p.mode));
        if (r.examColumn === 'green') expect({ n: r.n, fail: modes.has('fail') }).toEqual({ n: r.n, fail: false });
        if (r.examColumn === 'grad') expect({ n: r.n, pass: modes.has('pass') }).toEqual({ n: r.n, pass: false });
        if (r.examColumn === 'both') expect({ n: r.n, pass: modes.has('pass'), fail: modes.has('fail') }).toEqual({ n: r.n, pass: true, fail: true });
      }
      // Every exam probe on a ladder rung belongs to a rung here (voice-hint is not a rung).
      const claimed = new Set(OLIVE_RUNGS.flatMap((r) => r.probes));
      const orphans = exam.PROBES.filter((p: any) => p.rung !== 'voice-hint' && !claimed.has(p.id)).map((p: any) => p.id);
      expect(orphans).toEqual([]);
    });

    it('rung 9 waits for Richard: the rule is not chosen, both candidates are framed and probed, either answer is one edit', () => {
      const nine = OLIVE_RUNGS.find((r) => r.n === 9)!;
      expect(nine.rule).toBe('awaiting-ruling');
      expect(nine.ruleCandidates!.map((c) => c.id)).toEqual(['G1', 'G2']);
      for (const c of nine.ruleCandidates!) {
        expect({ id: c.id, rung: !!PROPOSED_RUNGS[c.table], line: !!WORDS[c.line], probes: c.probes.every((p) => PROBES.some((x) => x.id === p && x.rung === c.table)) }).toEqual({ id: c.id, rung: true, line: true, probes: true });
      }
      expect([RULINGS.rung9.chosen, RULINGS.thanksEn.chosen]).toEqual([null, null]);
      expect(RULINGS.rung9.candidates.map((c) => c.table)).toEqual(nine.ruleCandidates!.map((c) => c.table));
    });

    it('every rung\'s card resolves in both languages: title, line, lesson, and the hint the table says after the run', () => {
      for (const lang of ['en', 'fr'] as const) {
        const words = runScript(TRANSLATE, { lang, words: WORD_ROWS, botName: 'Pip' });
        for (const r of OLIVE_RUNGS) {
          for (const key of [r.copyKeys.title, r.copyKeys.line, r.copyKeys.lesson, ...(r.ruleCandidates ?? []).map((c) => c.line)]) expect({ n: r.n, key, text: words[key] }).toEqual({ n: r.n, key, text: expect.stringMatching(/^[^{}]*\S[^{}]*$/) });
          expect({ n: r.n, hint: !!HINTS[r.copyKeys.hint]?.[lang] }).toEqual({ n: r.n, hint: true });
        }
      }
    });
  });

  describe('AC2 (§4) — the moments\' probes are well-formed against the shell\'s own checks (offline, canned replies; the model is the exam\'s)', () => {
    const merged = mergeTemplates(TEMPLATES);

    it('the merged table adds lists and rungs and never overwrites the shell\'s', () => {
      const before = JSON.stringify(TEMPLATES);
      mergeTemplates(TEMPLATES);
      expect(JSON.stringify(TEMPLATES)).toBe(before);
      for (const id of Object.keys(PROPOSED_RUNGS)) expect({ id, clash: !!TEMPLATES.rungs[id] }).toEqual({ id, clash: false });
      for (const name of Object.keys(PROPOSED_LISTS)) expect({ name, clash: !!TEMPLATES.lists[name] }).toEqual({ name, clash: false });
      expect(Object.keys(merged.rungs).length).toBe(Object.keys(TEMPLATES.rungs).length + Object.keys(PROPOSED_RUNGS).length);
    });

    it.each(PROBES.map((p) => [p.id, p] as const))('%s: slots pass checkSlots, compose gives its shape, the canned reply grades as its column', (_id, p) => {
      const slots = check.checkSlots(merged, p.rung, p.slots, p.lang);
      expect({ id: p.id, ok: slots.ok, reason: slots.reason }).toEqual({ id: p.id, ok: true, reason: undefined });
      const prompt = check.compose(merged, p.rung, slots.values, { lang: p.lang, shape: p.shape, temperature: p.temperature });
      expect(prompt.shape).toBe(p.shape ?? merged.rungs[p.rung].shape);
      expect(prompt.user).not.toMatch(/\{\w+\}/);
      expect(prompt.system).not.toMatch(/\{\w+\}/);
      const reply = check.checkOutput(p.canned, prompt);
      // A canned green reply passes every check; a canned 🎓 reply is a VALID answer that breaks the rule (a refusal
      // would be the fallback, not the lesson); a mixed one only has to be valid.
      expect({ id: p.id, ok: reply.ok, reason: reply.reason }).toEqual({ id: p.id, ok: true, reason: undefined });
      const verdict = meets(p.expect, reply);
      if (p.column === 'green') expect({ id: p.id, met: verdict }).toEqual({ id: p.id, met: true });
      if (p.column === 'grad') expect({ id: p.id, met: verdict }).toEqual({ id: p.id, met: false });
      // Where the exam knows the kind, this file grades exactly as `exam.js` does.
      if ((EXAM_KINDS as readonly string[]).includes(p.expect.kind)) expect(exam.meetsOne(p.expect, reply)).toBe(verdict);
      // The mode says the same as the column: a 🎓 probe is asserted as failing; a mixed one is recorded.
      expect({ id: p.id, mode: p.mode }).toEqual({ id: p.id, mode: p.column === 'grad' ? 'fail' : p.column === 'mixed' ? 'record' : 'pass' });
    });

    it('exam.js knows `lacks` / `containsAll` (the patch, taken by CG-005): a 🎓 probe of those kinds no longer passes vacuously', () => {
      const keeps = { ok: true, text: 'Un chat noir.' };
      const lacksE: Expect = { kind: 'lacks', letters: ['e'] };
      // The reply keeps the rule (no e), so the 🎓 is NOT shown — by this file and, since CG-005 took the patch, by exam.js.
      expect([meets(lacksE, keeps), exam.meetsOne(lacksE, keeps)]).toEqual([true, true]);
      // The patch, compiled as the case block of meetsOne, grades exactly as this file on every new-kind probe.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const patched = new Function('expect', 'got', 'fold', 'switch (expect.kind) {\n' + EXAM_KIND_PATCH + '\n default: return null; }') as (e: Expect, g: unknown, f: (s: unknown) => string) => boolean | null;
      const newKind = PROBES.filter((p) => !(EXAM_KINDS as readonly string[]).includes(p.expect.kind));
      expect(newKind.map((p) => p.id)).toEqual(['E3-fr', 'E3-en', 'R9-G1-fr', 'R9-G1-en', 'R9-G2-fr', 'R9-G2-en']);
      for (const p of newKind) {
        for (const text of [p.canned, 'Un chat noir.', 'Pip avance, tourne à gauche et arrose.', 'Pip marche au soleil.', 'Pip waters it.']) {
          expect({ id: p.id, text, patched: patched(p.expect, text, fold) }).toEqual({ id: p.id, text, patched: meets(p.expect, { ok: true, text }) });
        }
      }
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

    it('the recorded readout, graded by the same checks: G1 breaks its rule 3/3; G2 KEEPS its rule 3/3; B5 broke "under 5" 3/3', () => {
      const g1 = PROBES.find((p) => p.id === 'R9-G1-fr')!;
      const g2 = PROBES.find((p) => p.id === 'R9-G2-fr')!;
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

    it('the EN thank-you: the recorded A9 replies pass the current list (all say "grateful"); a reply without thank/grateful is refused by the current list and accepted by both candidates', () => {
      const a9 = recorded('A9');
      expect(a9).toHaveLength(3);
      const prompt = (rung: string) => check.compose(mergeTemplates(TEMPLATES), rung, { to: 'Mamie Rose', deed: 'watered her three tulips' }, { lang: 'en' });
      for (const t of a9) expect({ t, now: check.checkOutput(t, prompt('say-thanks')).ok }).toEqual({ t, now: true });
      const appreciate = PROBES.find((p) => p.id === 'TY-A-en')!.canned;
      expect([check.checkOutput(appreciate, prompt('say-thanks')).reason, check.checkOutput(appreciate, prompt('say-thanks-en-wide')).ok, check.checkOutput(appreciate, prompt('say-thanks-en-none')).ok]).toEqual(['must-contain', true, true]);
      // FR is untouched by either candidate: "merci" stays required.
      const fr = (rung: string) => check.compose(mergeTemplates(TEMPLATES), rung, { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, { lang: 'fr' });
      for (const rung of ['say-thanks', 'say-thanks-en-wide', 'say-thanks-en-none']) expect({ rung, fr: fr(rung).mustContain }).toEqual({ rung, fr: ['merci'] });
    });
  });

  describe('AC3 — every string is in the word table, EN and FR', () => {
    const facing = requestFacingKeys();

    it('every request, rung and moment key exists with an EN and an FR line, and the two differ', () => {
      expect(facing.length).toBeGreaterThanOrEqual(10 * 5 + 12 * 3 + 2 + 13 * 2 - 3);
      for (const key of facing) {
        const w = WORDS[key];
        expect({ key, en: !!w?.en?.trim(), fr: !!w?.fr?.trim() }).toEqual({ key, en: true, fr: true });
        // "Seeds" / "Graines" differ; only a proper noun may be the same, and none of these is one.
        expect({ key, same: w.en === w.fr }).toEqual({ key, same: false });
      }
    });

    it('the French is typeset as French: « » not "", ’ not \', and a space before ! ? : ;', () => {
      for (const key of facing) {
        const fr = WORDS[key].fr;
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
          const gift = WORDS[r.copyKeys.gift][lang];
          const who = WORDS[ISLANDER_WORD[r.islander]][lang];
          const thing = WORDS[r.copyKeys.reward][lang].toLowerCase();
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
      for (const key of requestFacingKeys()) for (const lang of ['en', 'fr'] as const) expect({ key, lang, money: money(lang).test(WORDS[key][lang]) }).toEqual({ key, lang, money: false });
      // Known-firing beside the absence.
      expect(['Buy the crown for 3 coins', 'A hat for €2', 'Only 50 gems!'].map((t) => money('en').test(t))).toEqual([true, true, true]);
      expect(['Achète la couronne', 'Le prix : 3 pièces', 'Va à la boutique'].map((t) => money('fr').test(t))).toEqual([true, true, true]);
    });

    it('a finished request puts its reward on the profile that finished it: hats on the hat rail, the rest on the sticker page', () => {
      let model: any = runScript(ADD_PROFILE, { model: null, name: 'A', band: 1, lang: 'fr', face: 'f1', robotName: 'Pip', color: '#FF7A59', eye: 'round' }).model;
      for (const r of REQUESTS) model = runScript(COMPLETE, { model, profileId: model.profiles[0].id, requestId: r.id, tricks: r.tricks, reward: r.reward }).model;
      const p = model.profiles[0];
      expect([...p.hats].sort()).toEqual(REQUESTS.filter((r) => r.reward.kind === 'hat').map((r) => r.reward.id).sort());
      expect([...p.stickers].sort()).toEqual(REQUESTS.filter((r) => r.reward.kind !== 'hat').map((r) => r.reward.id).sort());
      expect(model.island.done).toHaveLength(REQUESTS.length);
    });
  });

  describe('AC5 — no request carries a timer, a score, a streak or a "you missed"', () => {
    it('no request-facing line in either language uses the words of pressure', () => {
      const hits: string[] = [];
      for (const key of requestFacingKeys()) for (const lang of ['en', 'fr'] as const) if (pressure(lang).test(WORDS[key][lang])) hits.push(key + ':' + lang + ': ' + WORDS[key][lang]);
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
          expect({ id: m.id, some: m.probes.length > 0, decision: ['promoted', 'dropped', 'awaiting-probe'].includes(m.decision) }).toEqual({ id: m.id, some: true, decision: true });
        } else expect({ id: m.id, evidence: !!m.evidence, decision: m.decision }).toEqual({ id: m.id, evidence: true, decision: 'ships' });
        for (const key of [m.copyKeys.title, m.copyKeys.line]) expect({ key, en: !!WORDS[key]?.en, fr: !!WORDS[key]?.fr }).toEqual({ key, en: true, fr: true });
      }
      // No probe without a home, no id twice.
      const homes = new Set([...MOMENTS.map((m) => m.id), 'rung9', 'thanks-en']);
      expect(PROBES.filter((p) => !homes.has(p.moment)).map((p) => p.id)).toEqual([]);
      expect(new Set(PROBES.map((p) => p.id)).size).toBe(PROBES.length);
    });

    it('this session decided nothing it did not measure: every add-probe row is awaiting its probe', () => {
      expect(MOMENTS.filter((m) => m.status === 'add-probe').map((m) => m.decision)).toEqual(Array(9).fill('awaiting-probe'));
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
      expect(decide(e9, [rec('E9-arrosoir', true), rec('E9-chouette', false), rec('E9-rocher', true)])).toBe('promoted');
      expect(decide(e9, [rec('E9-arrosoir', true), rec('E9-chouette', true), rec('E9-rocher', true)])).toBe('dropped');
      expect(decide(MOMENTS.find((m) => m.id === 'E1')!, [])).toBe('ships');
    });
  });
});
