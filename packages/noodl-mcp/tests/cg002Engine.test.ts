/**
 * CG-002 — the gate over the engine: every Function script, run the way the
 * node runs it (`Inputs` in, `Outputs` out), against the content it ships.
 *
 * The acceptance criteria, as numbered in
 * `dev-docs/tasks/phase-105-the-coding-garden/CG-002-THE-ENGINE.md` §3:
 *
 * - **AC1** every request runs its reference program to its goal, in both
 *   languages and every band from its own up;
 * - **AC2** `step` is deterministic over 200 seeded programs, with the `until`
 *   guard and nested `repeat`;
 * - **AC3** 30 recorded programs fold as expected; fold then unfold restores;
 * - **AC4** every hint key has a line in both languages; 12 named states pick
 *   the expected key; no "tell me";
 * - **AC5** one island per kid (v3); a save code round-trips; a v1 or v2 code
 *   decodes by the migration rule and asks for its own save;
 * - **AC6** sensors read the world only; `olive_says` is a sensor over the
 *   last answer;
 * - **AC7** `predictEnd`;
 * - **AC8** two robots on one world share no Variable;
 * - **AC9** no backtick, no `${`, in any script.
 *
 * @module noodl-mcp/tests/cg002Engine.test
 */
import { BAND_PALETTE, Block, BlockType, GardenRequest, HINTS, HINT_KEYS, OLIVE_RUNGS, REQUESTS, WORDS, WORD_KEYS } from './cg002Content';
import {
  ADD_PROFILE_SCRIPT,
  APPLY_DELTA_SCRIPT,
  CHOOSE_HINT_SCRIPT,
  COMPLETE_REQUEST_SCRIPT,
  DECODE_SAVE_SCRIPT,
  ENCODE_SAVE_SCRIPT,
  FIND_REPEAT_SCRIPT,
  FOLD_SCRIPT,
  FUNCTION_SCRIPTS,
  GOAL_SCRIPT,
  HINT_LINE_SCRIPT,
  HINT_TABLE_SCRIPT,
  MANY_BLOCKS,
  MAX_TICKS,
  NEW_RUN_SCRIPT,
  PALETTE_SCRIPT,
  PREDICT_END_SCRIPT,
  SAVE_VERSION,
  SENSE_SCRIPT,
  STEP_SCRIPT,
  TRANSLATE_SCRIPT,
  UNFOLD_SCRIPT,
  UNTIL_GUARD,
  portsOf,
  runScript
} from './cg002Scripts';
// CG-002 §8 (s3, the save model): the helpers the v3 rows read directly.
import { ROBOT_NAME_MAX, SAVE_HELPERS, helper } from './cg002Scripts';

const WORD_ROWS = WORD_KEYS.map((key) => ({ key, ...WORDS[key] }));
const HINT_ROWS = HINT_KEYS.map((key) => ({ key, ...HINTS[key] }));

// ── Harness ─────────────────────────────────────────────────────────────────

/** The world a request opens on: its map, its things, one robot at the start. */
function worldOfRequest(r: GardenRequest, robotId = 'pip') {
  const robot: Record<string, unknown> = { id: robotId, x: r.robotStart.x, y: r.robotStart.y, d: r.robotStart.d };
  if (r.robotStart.carry) robot.carry = [...r.robotStart.carry];
  if (r.robotStart.basket) robot.basket = r.robotStart.basket;
  return { map: [...r.map], things: r.things.map((t) => ({ ...t })), robots: [robot], schedule: r.schedule ? r.schedule.map((s) => ({ ...s })) : [] };
}

/** One tick the way the page does it: Step, then Apply delta. */
function tick(run: any, world: any, answer: unknown = null) {
  const st = runScript(STEP_SCRIPT, { run, world, answer });
  const applied = runScript(APPLY_DELTA_SCRIPT, { world, delta: st.delta });
  return { st, run: st.run, world: applied.world };
}

/** Run a program to its end (every ask answered by `answers`, else the fallback). Returns the deltas, the run and the world. */
function runToEnd(program: ReadonlyArray<Block>, world: any, robotId = 'pip', lang = 'en', answers: ReadonlyArray<Record<string, unknown>> = [], cap = MAX_TICKS) {
  let run = runScript(NEW_RUN_SCRIPT, { program, robotId, lang }).run;
  const deltas: any[] = [];
  const glows: any[] = [];
  let ticks = 0;
  let done = false;
  let asked = 0;
  while (ticks < cap) {
    let t = tick(run, world);
    if (t.st.waiting) {
      const a = answers[asked] ?? { ok: false, fallback: true };
      asked++;
      t = tick(t.st.run, t.world, { seq: t.st.request.seq, ...a });
    }
    run = t.run;
    world = t.world;
    deltas.push(t.st.delta);
    glows.push(t.st.glowId);
    ticks++;
    if (t.st.done) {
      done = true;
      break;
    }
  }
  return { run, world, deltas, glows, ticks, done };
}

/** A tiny notation for programs: F L R W P D S C are the primitives; r3[…] u[…] i[…] w[…] t[…] o are containers and `do`. Ids are pre-order from 1. */
function parse(src: string): Block[] {
  let id = 1;
  const prim: Record<string, BlockType> = { F: 'fwd', L: 'left', R: 'right', W: 'water', P: 'pick', D: 'put', S: 'say', C: 'count_inc' };
  const tokens = src.match(/r\d+\[|u\[|i\[|w\[|t\[|\]|[FLRWPDSCo]/g) ?? [];
  let at = 0;
  const list = (): Block[] => {
    const out: Block[] = [];
    while (at < tokens.length) {
      const tok = tokens[at++];
      if (tok === ']') return out;
      if (tok in prim) out.push({ id: id++, t: prim[tok] });
      else if (tok === 'o') out.push({ id: id++, t: 'do', slots: { name: 'row' } });
      else if (tok.startsWith('r')) {
        const b: Block = { id: id++, t: 'repeat', n: Number(tok.slice(1, -1)) };
        b.body = list();
        out.push(b);
      } else if (tok === 'u[') {
        const b: Block = { id: id++, t: 'until', slots: { sensor: 'wall_ahead' } };
        b.body = list();
        out.push(b);
      } else if (tok === 'i[') {
        const b: Block = { id: id++, t: 'if', slots: { sensor: 'tulip_ahead' } };
        b.body = list();
        out.push(b);
      } else if (tok === 'w[') {
        const b: Block = { id: id++, t: 'when', slots: { event: 'meow' } };
        b.body = list();
        out.push(b);
      } else if (tok === 't[') {
        const b: Block = { id: id++, t: 'trick', slots: { name: 'row' } };
        b.body = list();
        out.push(b);
      }
    }
    return out;
  };
  return list();
}

/** The shape of a program without its ids: what fold → unfold must restore. */
function shape(list: ReadonlyArray<Block>): unknown[] {
  return list.map((b) => ({ t: b.t, ...(b.n !== undefined ? { n: b.n } : {}), ...(b.slots ? { slots: b.slots } : {}), ...(b.body ? { body: shape(b.body) } : {}) }));
}

/** Every block type used anywhere in a program. */
function typesIn(list: ReadonlyArray<Block>, out = new Set<string>()): Set<string> {
  for (const b of list) {
    out.add(b.t);
    if (b.body) typesIn(b.body, out);
  }
  return out;
}

/** The program a band-1 child records: the reference program with every repeat unrolled and every trick inlined (primitives only). */
function unrolled(list: ReadonlyArray<Block>, tricks: Record<string, ReadonlyArray<Block>> = {}, next = { n: 1000 }): Block[] {
  const out: Block[] = [];
  for (const b of list) {
    if (b.t === 'trick') tricks[String(b.slots?.name)] = b.body ?? [];
  }
  for (const b of list) {
    if (b.t === 'repeat') for (let k = 0; k < (b.n ?? 0); k++) out.push(...unrolled(b.body ?? [], tricks, next));
    else if (b.t === 'do') out.push(...unrolled(tricks[String(b.slots?.name)] ?? [], tricks, next));
    else if (b.t === 'trick') continue;
    else out.push({ ...b, id: next.n++ });
  }
  return out;
}

/** mulberry32: a seeded PRNG for AC2's 200 programs. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCKUP_WORLD = () => worldOfRequest(REQUESTS.find((r) => r.id === 'tulips-three')!);
const OPEN_ROW = () => ({ map: ['GGTGGGTH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'], things: [], robots: [{ id: 'pip', x: 0, y: 3, d: 1 }] });

describe('CG-002 — the engine', () => {
  describe('AC1 — every request runs its reference program to its goal, in both languages and every band from its own up', () => {
    const rows: Array<[string, string, number, GardenRequest]> = [];
    for (const r of REQUESTS) for (const lang of ['en', 'fr']) for (const band of [1, 2]) if (band >= r.band) rows.push([r.id, lang, band, r]);

    it('the list covers the three D3 requests and every one of the seven tricks', () => {
      const ids = REQUESTS.map((r) => r.id);
      expect(ids).toEqual(expect.arrayContaining(['tulips-three', 'bowl-if', 'letter-say']));
      const tricks = new Set(REQUESTS.flatMap((r) => [...r.tricks]));
      expect([...tricks].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(new Set(ids).size).toBe(ids.length);
      // CG-006: four requests open at band 7–9 (both bands), six at band 10–12 only: 4×2×2 + 6×2×1.
      expect(rows).toHaveLength(28);
    });

    it.each(rows)('%s · %s · band %i', (_id, lang, band, r) => {
      const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
      // Every block the band's child could have placed is in that band's palette, and in the request's own.
      const palette = new Set<string>(BAND_PALETTE[band as 1 | 2]);
      for (const t of typesIn(program)) expect({ block: t, inBand: palette.has(t), inRequest: r.palette.includes(t as BlockType) }).toEqual({ block: t, inBand: true, inRequest: true });
      const end = runToEnd(program, worldOfRequest(r), 'pip', lang);
      const goal = runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program, goal: r.goal });
      expect({ id: r.id, lang, band, done: end.done, ticks: end.ticks, met: goal.met, missing: goal.missing }).toEqual({ id: r.id, lang, band, done: true, ticks: end.ticks, met: true, missing: [] });
      expect(end.ticks).toBeLessThan(400);
      expect(end.run.bumps).toBe(0);
      expect(end.run.puddles).toBe(0);
      // The card's copy resolves in the language: title, blurb, the islander's line, the reward.
      const words = runScript(TRANSLATE_SCRIPT, { lang, words: WORD_ROWS, botName: 'Pip' });
      for (const key of Object.values(r.copyKeys)) expect({ key, text: words[key] }).toEqual({ key, text: expect.stringMatching(/\S/) });
      expect(words[r.copyKeys.line]).not.toContain('{b}');
      // A `say` says its line in the language (the delta carries the key; the page resolves it).
      const said = end.deltas.filter((d) => d.say);
      for (const d of said) expect(words[d.say.text]).toMatch(/\S/);
      if (r.goal instanceof Array && r.goal.some((g) => g.name === 'said')) expect(said.length).toBeGreaterThan(0);
    });

    it('the goal is data: no request carries a function, and every goal name is one GOAL_SCRIPT knows', () => {
      const known = ['every_tulip_watered', 'thing_at', 'bowl_has', 'robot_at', 'facing', 'carrying', 'uses', 'handled', 'said', 'no_puddle', 'senses'];
      for (const name of known) expect({ name, inScript: GOAL_SCRIPT.includes(`g.name === '${name}'`) }).toEqual({ name, inScript: true });
      for (const r of REQUESTS) {
        expect(JSON.parse(JSON.stringify(r))).toEqual(r);
        const goals = Array.isArray(r.goal) ? r.goal : [r.goal];
        for (const g of goals) expect({ id: r.id, goal: g.name, known: known.includes(g.name) }).toEqual({ id: r.id, goal: g.name, known: true });
        // The reward names the islander it came from, and is never bought.
        expect(r.reward.from).toBe(r.islander);
      }
    });

    it('the goal is not met on the untouched world, so the gate can tell a run from a no-op', () => {
      for (const r of REQUESTS) {
        const run = runScript(NEW_RUN_SCRIPT, { program: r.referenceProgram, robotId: 'pip', lang: 'en' }).run;
        const g = runScript(GOAL_SCRIPT, { world: worldOfRequest(r), run, program: r.referenceProgram, goal: r.goal });
        expect({ id: r.id, met: g.met }).toEqual({ id: r.id, met: false });
      }
    });

    it('Biscuit\'s bowl: the full bowl is untouched and the empty one is filled — a program that feeds every bowl fails the goal', () => {
      const r = REQUESTS.find((x) => x.id === 'bowl-if')!;
      const greedy = parse('r2[F F L D R]');
      const end = runToEnd(greedy, worldOfRequest(r));
      const g = runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program: greedy, goal: r.goal });
      expect(g.met).toBe(false);
      expect(g.missing).toEqual(['bowl_has', 'uses']);
    });
  });

  describe('AC2 — step is deterministic: 200 seeds, the until guard, nested repeat', () => {
    const PRIMS: BlockType[] = ['fwd', 'left', 'right', 'water', 'pick', 'put', 'count_inc'];
    /**
     * A random program: primitives, nested repeats to depth 3, and top-level `until`s whose sensor never comes true so
     * the guard must bite. An until's body is primitives only and an until never sits inside a repeat: 27 × 40 passes
     * is a legitimate 5 000-tick program (seed 60 made one), which is not what the 2 000-tick cap is for.
     */
    function randomProgram(rand: () => number, depth = 0, next = { n: 1 }, inUntil = false): Block[] {
      const out: Block[] = [];
      const len = 1 + Math.floor(rand() * 5);
      for (let i = 0; i < len; i++) {
        const roll = rand();
        if (roll < 0.6 || depth >= 3 || inUntil) out.push({ id: next.n++, t: PRIMS[Math.floor(rand() * PRIMS.length)] });
        else if (roll < 0.85 || depth > 0) out.push({ id: next.n++, t: 'repeat', n: 1 + Math.floor(rand() * 3), body: randomProgram(rand, depth + 1, next, inUntil) });
        else out.push({ id: next.n++, t: 'until', slots: { sensor: rand() < 0.5 ? 'tulip_ahead' : 'basket_full' }, body: randomProgram(rand, depth + 1, next, true) });
      }
      return out;
    }

    it('200 seeded programs: the same program on the same world gives the same deltas twice, and every run ends', () => {
      let untils = 0;
      let nested = 0;
      let guarded = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const program = randomProgram(prng(seed));
        const text = JSON.stringify(program);
        if (text.includes('"until"')) untils++;
        if (/"repeat"[^\]]*"repeat"/.test(text)) nested++;
        const a = runToEnd(program, OPEN_ROW());
        const b = runToEnd(JSON.parse(text), OPEN_ROW());
        expect({ seed, done: a.done, ticks: a.ticks }).toEqual({ seed, done: true, ticks: a.ticks });
        expect(JSON.stringify(a.deltas)).toBe(JSON.stringify(b.deltas));
        expect(JSON.stringify(a.glows)).toBe(JSON.stringify(b.glows));
        expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
        if (a.run.guardHits > 0) guarded++;
      }
      // The sample really contains what the AC names.
      expect(untils).toBeGreaterThan(40);
      expect(nested).toBeGreaterThan(20);
      expect(guarded).toBeGreaterThan(20);
    });

    it(`🔴 the until guard: a sensor that never comes true runs the body exactly ${UNTIL_GUARD} times, then the program goes on`, () => {
      const program = parse('u[L] F');
      program[0].slots = { sensor: 'tulip_ahead' };
      const end = runToEnd(program, OPEN_ROW());
      const turns = end.deltas.filter((d) => d.turn).length;
      const checks = end.deltas.filter((d) => d.check).length;
      expect({ turns, checks, guardHits: end.run.guardHits, done: end.done }).toEqual({ turns: UNTIL_GUARD, checks: UNTIL_GUARD + 1, guardHits: 1, done: true });
      // The F after the until still ran: the guard leaves the loop, it does not end the program.
      expect(end.deltas.filter((d) => d.move)).toHaveLength(1);
      expect(end.world.robots[0]).toMatchObject({ x: 1, y: 3, d: (1 + 3 * UNTIL_GUARD) % 4 });
    });

    it('an until whose sensor comes true stops there: walk to the wall is seven steps and no bump', () => {
      const end = runToEnd(parse('u[F] L'), OPEN_ROW());
      expect(end.deltas.filter((d) => d.move)).toHaveLength(7);
      expect(end.run.bumps).toBe(0);
      expect(end.run.guardHits).toBe(0);
      expect(end.world.robots[0]).toMatchObject({ x: 7, y: 3, d: 0 });
    });

    it('nested repeat: 3 × (2 × forward) is six moves, and every noop glows the repeat it belongs to', () => {
      const program = parse('r3[r2[F]]');
      const end = runToEnd(program, OPEN_ROW());
      expect(end.deltas.filter((d) => d.move)).toHaveLength(6);
      expect(end.world.robots[0]).toMatchObject({ x: 6, y: 3 });
      const glowIds = end.glows.filter((g) => g !== null);
      expect(glowIds.filter((g) => g === 1)).toHaveLength(3);
      expect(glowIds.filter((g) => g === 2)).toHaveLength(6);
      expect(glowIds.filter((g) => g === 3)).toHaveLength(6);
    });

    it('a step is one primitive per tick, and a tick that changes nothing still publishes fresh objects', () => {
      const world = OPEN_ROW();
      const run = runScript(NEW_RUN_SCRIPT, { program: parse('r1[F]'), robotId: 'pip', lang: 'en' }).run;
      const first = runScript(STEP_SCRIPT, { run, world, answer: null });
      expect(first.delta.noop).toBe(true);
      expect(first.run).not.toBe(run);
      expect(first.delta).not.toBe(run);
      const applied = runScript(APPLY_DELTA_SCRIPT, { world, delta: first.delta });
      expect(applied.world).not.toBe(world);
      expect(applied.world.robots[0]).toMatchObject({ x: 0, y: 3, d: 1 });
      const second = runScript(STEP_SCRIPT, { run: first.run, world: applied.world, answer: null });
      expect(second.delta.move).toEqual({ id: 'pip', x: 1, y: 3 });
      // The input world was never written.
      expect(world.robots[0]).toEqual({ id: 'pip', x: 0, y: 3, d: 1 });
    });
  });

  describe('AC3 — the fold: 30 recorded programs, and folding then unfolding restores the sequence', () => {
    /** [notation, expected plan or null]. The tie-break is Richard\'s (2026-09-28): on equal coverage the SHORTER sequence, the higher count, wins. */
    const FIXTURES: Array<[string, { i: number; len: number; count: number; c?: number } | null]> = [
      ['F F F', { i: 0, len: 1, count: 3 }],
      ['F F F F', { i: 0, len: 1, count: 4 }],
      ['F L F L F L', { i: 0, len: 2, count: 3 }],
      ['F F L W R F F L W R F F L W R', { i: 0, len: 5, count: 3 }],
      ['L F F F F F F F', { i: 1, len: 1, count: 7 }],
      ['F W F W F W F W', { i: 0, len: 2, count: 4 }],
      ['F R F R F R F', { i: 0, len: 2, count: 3 }],
      ['W', null],
      ['', null],
      ['F L', null],
      ['F F', { i: 0, len: 1, count: 2 }],
      ['F L R F L R F L R F L R', { i: 0, len: 3, count: 4 }],
      ['S F F F S', { i: 1, len: 1, count: 3 }],
      ['F F F L L L', { i: 0, len: 1, count: 3 }],
      ['F F F L L L L', { i: 3, len: 1, count: 4 }],
      ['F W R F W R F W L', { i: 0, len: 3, count: 2 }],
      ['r3[F F] F F F F', { i: 1, len: 1, count: 4 }],
      ['r2[F F F]', { i: 0, len: 1, count: 3, c: 1 }],
      ['u[F L F L]', { i: 0, len: 2, count: 2, c: 1 }],
      ['F r3[W W] L', { i: 0, len: 1, count: 2, c: 2 }],
      ['F F F r2[L]', { i: 0, len: 1, count: 3 }],
      ['i[F F] F', { i: 0, len: 1, count: 2, c: 1 }],
      ['r2[r2[F F F]]', { i: 0, len: 1, count: 3, c: 2 }],
      ['P C F P C F P C F P C F', { i: 0, len: 3, count: 4 }],
      ['F F F F F F', { i: 0, len: 1, count: 6 }],
      ['F F F F F', { i: 0, len: 1, count: 5 }],
      ['L F F L F F L F F', { i: 0, len: 3, count: 3 }],
      ['F F W F F W F F W F', { i: 0, len: 3, count: 3 }],
      ['W W W W W W W W W', { i: 0, len: 1, count: 9 }],
      ['F S F S F S F', { i: 0, len: 2, count: 3 }]
    ];

    it('has thirty fixtures', () => {
      expect(FIXTURES).toHaveLength(30);
    });

    it.each(FIXTURES)('"%s" folds as expected', (src, expected) => {
      const program = parse(src);
      const found = runScript(FIND_REPEAT_SCRIPT, { program, band: 2 });
      if (!expected) {
        expect({ src, found: found.found }).toEqual({ src, found: false });
        expect(found.offer).toBe(false);
        return;
      }
      expect({ src, i: found.i, len: found.len, count: found.count, c: found.containerId }).toEqual({ src, i: expected.i, len: expected.len, count: expected.count, c: expected.c ?? null });
      expect(found.cover).toBe(expected.len * expected.count);
      expect(found.offer).toBe(found.cover >= 3);
      expect(found.textKey).toBe(expected.len === 1 ? 'tidyFound1' : 'tidyFound');
      // Fold, then the child taps ✕ on the repeat: the shape is back.
      const folded = runScript(FOLD_SCRIPT, { program, i: found.i, len: found.len, count: found.count, containerId: found.containerId });
      expect(folded.folded).toBe(true);
      // The run of len × count blocks became one repeat holding len: exact arithmetic, on the artefact.
      expect(folded.blocks).toBe(countAll(program) - expected.len * expected.count + 1 + expected.len);
      const rep = findById(folded.program, folded.repeatId);
      expect(rep).toMatchObject({ t: 'repeat', n: expected.count });
      expect(rep.body).toHaveLength(expected.len);
      const back = runScript(UNFOLD_SCRIPT, { program: folded.program, repeatId: folded.repeatId });
      expect(back.unfolded).toBe(true);
      expect(shape(back.program)).toEqual(shape(program));
      // Ids stay unique through both.
      expect(idsOf(folded.program).size).toBe(countAll(folded.program));
      expect(idsOf(back.program).size).toBe(countAll(back.program));
    });

    it('the fold is never applied by the finder, and band 7–9 is never offered one', () => {
      const program = parse('F F L W R F F L W R F F L W R');
      const before = JSON.stringify(program);
      const b1 = runScript(FIND_REPEAT_SCRIPT, { program, band: 1 });
      expect([b1.found, b1.offer]).toEqual([true, false]);
      expect(JSON.stringify(program)).toBe(before);
      expect(runScript(FIND_REPEAT_SCRIPT, { program: parse('F F'), band: 2 }).offer).toBe(false);
    });

    it('the folded tulip program runs to the same end as the recording it came from', () => {
      const r = REQUESTS.find((x) => x.id === 'tulips-three')!;
      const recording = unrolled(r.referenceProgram);
      const found = runScript(FIND_REPEAT_SCRIPT, { program: recording, band: 2 });
      const folded = runScript(FOLD_SCRIPT, { program: recording, i: found.i, len: found.len, count: found.count, containerId: found.containerId });
      expect(folded.program).toHaveLength(1);
      const a = runToEnd(recording, worldOfRequest(r));
      const b = runToEnd(folded.program, worldOfRequest(r));
      expect(JSON.stringify(a.world)).toBe(JSON.stringify(b.world));
      expect(runScript(GOAL_SCRIPT, { world: b.world, run: b.run, program: folded.program, goal: r.goal }).met).toBe(true);
    });

    function countAll(list: ReadonlyArray<Block>): number {
      return list.reduce((n, b) => n + 1 + (b.body ? countAll(b.body) : 0), 0);
    }
    function idsOf(list: ReadonlyArray<Block>, out = new Set<number>()): Set<number> {
      for (const b of list) {
        out.add(b.id);
        if (b.body) idsOf(b.body, out);
      }
      return out;
    }
    function findById(list: ReadonlyArray<Block>, id: number): any {
      for (const b of list) {
        if (b.id === id) return b;
        if (b.body) {
          const f = findById(b.body, id);
          if (f) return f;
        }
      }
      return null;
    }
  });

  describe('AC4 — every hint key has a line in both languages; twelve named states pick the expected key; no "tell me"', () => {
    it('every key resolves to a non-empty line in EN and FR, the two differ, and none says "tell me"', () => {
      expect(HINT_KEYS.length).toBeGreaterThanOrEqual(21);
      for (const key of HINT_KEYS) {
        for (const lang of ['en', 'fr'] as const) {
          const line = runScript(HINT_LINE_SCRIPT, { hints: HINT_ROWS, key, lang, vars: { n: 3, w: 2, t: 3, k: 12 }, botName: 'Pip' });
          expect({ key, lang, found: line.found, text: line.text }).toEqual({ key, lang, found: true, text: expect.stringMatching(/\S/) });
          expect(line.text).not.toMatch(/\{[a-z]\}/);
          expect(line.text).not.toMatch(/tell me|dis-moi|dis moi/i);
        }
        expect(HINTS[key].en).not.toBe(HINTS[key].fr);
      }
      // The generated table mints every key as a port.
      const ports = portsOf(HINT_TABLE_SCRIPT).outputs;
      for (const key of HINT_KEYS) expect(ports).toContain(key);
      const fr = runScript(HINT_TABLE_SCRIPT, { lang: 'fr', hints: HINT_ROWS, botName: 'Bo' });
      expect(fr.hintBump).toContain('Bo');
      expect(fr.hintBump).not.toContain('{b}');
    });

    const world = () => MOCKUP_WORLD();
    const ranRun = (extra: Record<string, unknown> = {}) => ({ ...runScript(NEW_RUN_SCRIPT, { program: parse('F'), robotId: 'pip', lang: 'en' }).run, tick: 5, ...extra });
    const distinct12 = parse('F L W R S F R W L S P D');
    const twelveStates: Array<[string, Record<string, unknown>, string, Record<string, unknown>]> = [
      ['empty program', { program: [] }, 'hintEmpty', {}],
      ['the tulip recording, unfolded (15 blocks, cover 15)', { program: parse('F F L W R F F L W R F F L W R'), band: 2 }, 'hintPattern', { n: 3 }],
      ['folded and done, six blocks', { program: parse('r3[F F L W R]'), goalMet: true, run: ranRun() }, 'hintDone', { k: 6 }],
      ['done with twelve blocks that do not fold', { program: distinct12, goalMet: true, run: ranRun() }, 'hintDoneMany', { k: 12 }],
      ['a bump, goal unmet', { program: parse('F'), run: ranRun({ bumps: 1 }) }, 'hintBump', {}],
      ['a puddle, no bump', { program: parse('W'), run: ranRun({ puddles: 1 }) }, 'hintWet', {}],
      ['ran clean and missed the goal: 2 of 3 tulips', { program: parse('F L'), run: ranRun(), world: wateredWorld(2) }, 'hintMissed', { w: 2, t: 3 }],
      ['a program, not run yet', { program: parse('F L'), run: runScript(NEW_RUN_SCRIPT, { program: parse('F L'), robotId: 'pip', lang: 'en' }).run }, 'hintStart', {}],
      ['a Predict miss, even though the goal was met', { program: parse('r3[F]'), goalMet: true, run: ranRun(), predictAsked: true, predictHit: false }, 'hintPredictMiss', {}],
      ['Olive fell back, over a bump', { program: parse('F'), run: ranRun({ bumps: 1 }), oliveFallback: true }, 'oliveResting', {}],
      ['rung 4 just played, ran clean, goal unmet', { program: parse('F L'), run: ranRun(), oliveRung: 4 }, 'oliveRung4', {}],
      ['an unfolded repetition beats a bump', { program: parse('F F F F L'), run: ranRun({ bumps: 1 }) }, 'hintPattern', { n: 4 }]
    ];

    it('has twelve named states', () => {
      expect(twelveStates).toHaveLength(12);
      expect(new Set(twelveStates.map((s) => s[2])).size).toBeGreaterThanOrEqual(10);
    });

    it.each(twelveStates)('%s → %s', (_name, inputs, key, vars) => {
      const chosen = runScript(CHOOSE_HINT_SCRIPT, { world: world(), ...inputs });
      expect({ key: chosen.key, vars: chosen.vars }).toEqual({ key, vars: expect.objectContaining(vars) });
      expect(HINT_KEYS).toContain(chosen.key);
    });

    it('every Olive rung, 1 to the last (18 since CG-006 s3), has its own after-run line — none falls through to hintMissed', () => {
      const ns = OLIVE_RUNGS.map((r) => r.n);
      expect(Math.max(...ns)).toBe(18);
      for (const n of ns) {
        const chosen = runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F L'), run: ranRun(), oliveRung: n });
        expect({ n, key: chosen.key }).toEqual({ n, key: 'oliveRung' + n });
        expect(HINT_KEYS).toContain(chosen.key);
      }
    });

    it('the priority is a ladder: done beats a bump, a bump beats a puddle, a Predict hit is silent', () => {
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F'), goalMet: true, run: ranRun({ bumps: 1, puddles: 1 }) }).key).toBe('hintDone');
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F'), run: ranRun({ bumps: 1, puddles: 1 }) }).key).toBe('hintBump');
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('r3[F]'), goalMet: true, run: ranRun(), predictAsked: true, predictHit: true }).key).toBe('hintDone');
      // Done-with-many is measured against the constant, on the artefact.
      const many = parse('F L W R S F R W L S P D').slice(0, MANY_BLOCKS + 1);
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: many, goalMet: true, run: ranRun() }).key).toBe('hintDoneMany');
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: many.slice(0, MANY_BLOCKS), goalMet: true, run: ranRun() }).key).toBe('hintDone');
    });

    function wateredWorld(n: number) {
      const w = MOCKUP_WORLD();
      for (let i = 0; i < n; i++) w.things[i].watered = true;
      return w;
    }
  });

  describe('AC5 — the save: one island per kid (v3, ruling 8); a code round-trips; a v1 or v2 family migrates by the rule and asks for its own save', () => {
    const TULIPS = REQUESTS.find((r) => r.id === 'tulips-three')!;
    const complete = (model: any, profileId: string, r: GardenRequest = TULIPS, script = COMPLETE_REQUEST_SCRIPT) =>
      runScript(script, { model, profileId, requestId: r.id, tricks: r.tricks, reward: r.reward });
    const twoKids = () => {
      let model: any = runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Léa', band: 2, lang: 'fr', face: 'f3', robotName: 'Pip', color: '#FF7A59', eye: 'wink' }).model;
      model = runScript(ADD_PROFILE_SCRIPT, { model, name: 'Maya', band: 1, lang: 'en', face: 'f1', robotName: 'Bo', color: '#5FB4E8', eye: 'happy' }).model;
      return model;
    };
    const family = () => {
      let model = twoKids();
      const done = complete(model, model.profiles[0].id);
      expect([done.newlyDone, done.bloomed, done.found]).toEqual([true, ['n2'], true]);
      model = done.model;
      // One island per kid: the second child finishing the same request is HER first time.
      const again = complete(model, model.profiles[1].id);
      expect([again.newlyDone, again.bloomed]).toEqual([true, ['n2']]);
      model = again.model;
      model.profiles[0].island.placed = [{ kind: 'stone', x: 3, y: 3 }];
      return model;
    };
    const v2Code = () => {
      const v2 = {
        v: 2, f: ['fam2', 1700000000000],
        p: [['p1', 'Sam', 2, 'en', 'f2', 'Pip', '#FF7A59', 'round', 'cap', 'sb-----', ['letter'], ['cap']], ['p2', 'Noa', 1, 'fr', 'f5', 'Bo', '#5FB4E8', 'happy', 'none', 's------', [], []]],
        d: ['tulips-three', 'path-postbox'], pl: [{ kind: 'stone', x: 1, y: 3 }], a: 'p2'
      };
      return 'BG1.' + Buffer.from(JSON.stringify(v2), 'utf8').toString('base64url');
    };

    it('🔴 one island per kid: A finishes the tulips, B’s island still offers them; the island on screen is the active kid’s', () => {
      let model = twoKids();
      const [a, b] = model.profiles.map((p: any) => p.id);
      expect(model.island.activeId).toBe(b); // the newest player is playing
      const done = complete(model, a);
      model = done.model;
      expect([done.newlyDone, done.found]).toEqual([true, true]);
      expect(model.profiles[0].island.done).toEqual(['tulips-three']);
      expect(model.profiles[1].island.done).toEqual([]);
      // B is on screen: B's island, not A's.
      expect(model.island).toEqual({ activeId: b, done: [], placed: [] });
      // Through the store and back (the page reads what it stored), then A on screen.
      const stored = JSON.parse(JSON.stringify(model));
      const read = helper<any>(SAVE_HELPERS, 'modelOf', stored);
      expect(read.island.done).toEqual([]);
      const asA = helper<any>(SAVE_HELPERS, 'activate', read, a);
      expect(asA.island.done).toEqual(['tulips-three']);
      // The island on screen IS the active kid's (the same array): a reader of model.island.done reads hers.
      expect(asA.island.done).toBe(asA.profiles[0].island.done);
      // A request done twice by the same kid is done once.
      expect(complete(model, a).newlyDone).toBe(false);
      // No profile given: the active kid (B) finished it.
      const byActive = runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: TULIPS.id, tricks: TULIPS.tricks, reward: TULIPS.reward }).model;
      expect(byActive.profiles.map((p: any) => p.island.done)).toEqual([['tulips-three'], ['tulips-three']]);
    });

    it('🔴 a v3 model reads each kid’s island from the kid, never the family-level copy (a stale copy cannot leak)', () => {
      const model = family();
      const tampered = JSON.parse(JSON.stringify(model));
      tampered.island.done = ['rows-trick', 'eggs-count'];
      tampered.island.placed = [{ kind: 'gnome', x: 0, y: 0 }];
      const read = helper<any>(SAVE_HELPERS, 'modelOf', tampered);
      expect(read.profiles.map((p: any) => p.island.done)).toEqual([['tulips-three'], ['tulips-three']]);
      expect(read.island.done).toEqual(read.profiles[1].island.done);
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', tampered)).toBe(false);
    });

    it('🔴 the model written as a code decodes to an identical model (v3, each kid’s island in her row)', () => {
      const model = family();
      expect(model.v).toBe(SAVE_VERSION);
      expect(SAVE_VERSION).toBe(3);
      expect(model.profiles[0].hats).toEqual(['sun']);
      expect(model.profiles[0].tricks).toEqual({ n1: 'sprout', n2: 'bloom', n3: 'seed', n4: 'seed', n5: 'seed', n6: 'seed', n7: 'seed' });
      const enc = runScript(ENCODE_SAVE_SCRIPT, { model });
      expect(enc.code).toMatch(/^BG1\.[A-Za-z0-9_-]+$/);
      expect(enc.length).toBeLessThan(600);
      const packed = JSON.parse(Buffer.from(enc.code.slice(4), 'base64url').toString('utf8'));
      expect(packed.v).toBe(3);
      expect([packed.d, packed.pl]).toEqual([undefined, undefined]);
      expect(packed.p.map((row: unknown[]) => [row[12], row[13]])).toEqual([[['tulips-three'], [{ kind: 'stone', x: 3, y: 3 }]], [['tulips-three'], []]]);
      const dec = runScript(DECODE_SAVE_SCRIPT, { code: enc.code });
      expect([dec.ok, dec.error, dec.migrated, dec.profiles]).toEqual([true, '', false, 2]);
      expect(dec.model).toEqual(model);
      // A second encode of the decoded model is byte-identical: nothing drifts through the code.
      expect(runScript(ENCODE_SAVE_SCRIPT, { model: dec.model }).code).toBe(enc.code);
    });

    it('🔴 a v2 code (one island for the family) decodes by the rule — every kid keeps what the family had done — and says migrated', () => {
      const dec = runScript(DECODE_SAVE_SCRIPT, { code: v2Code() });
      expect([dec.ok, dec.migrated, dec.profiles]).toEqual([true, true, 2]);
      expect(dec.model.v).toBe(SAVE_VERSION);
      expect(dec.model.profiles.map((p: any) => p.island)).toEqual([
        { done: ['tulips-three', 'path-postbox'], placed: [{ kind: 'stone', x: 1, y: 3 }] },
        { done: ['tulips-three', 'path-postbox'], placed: [{ kind: 'stone', x: 1, y: 3 }] }
      ]);
      // Two islands, not one shared: finishing a request on one leaves the other as it was.
      expect(dec.model.profiles[0].island.done).not.toBe(dec.model.profiles[1].island.done);
      expect(dec.model.profiles[0]).toMatchObject({ tricks: { n1: 'sprout', n2: 'bloom' }, stickers: ['letter'], hats: ['cap'] });
      expect(dec.model.island).toEqual({ activeId: 'p2', done: ['tulips-three', 'path-postbox'], placed: [{ kind: 'stone', x: 1, y: 3 }] });
      // Saved again, it is a v3 code, and decoding THAT is no longer a migration.
      const enc = runScript(ENCODE_SAVE_SCRIPT, { model: dec.model });
      expect(JSON.parse(Buffer.from(enc.code.slice(4), 'base64url').toString('utf8')).v).toBe(3);
      const again = runScript(DECODE_SAVE_SCRIPT, { code: enc.code });
      expect([again.migrated, again.model]).toEqual([false, dec.model]);
    });

    it('🔴 a v1 code (no tricks, stickers, hats or placed things) still decodes, the family’s done given to every kid', () => {
      const v1 = { v: 1, f: ['fam1', 1700000000000], p: [['p1', 'Sam', 2, 'en', 'f2', 'Pip', '#FF7A59', 'round', 'cap']], d: ['path-postbox'], a: 'p1' };
      const code = 'BG1.' + Buffer.from(JSON.stringify(v1), 'utf8').toString('base64url');
      const dec = runScript(DECODE_SAVE_SCRIPT, { code });
      expect([dec.ok, dec.migrated, dec.profiles]).toEqual([true, true, 1]);
      expect(dec.model.v).toBe(SAVE_VERSION);
      expect(dec.model.profiles[0]).toEqual({
        id: 'p1', name: 'Sam', band: 2, lang: 'en', face: 'f2',
        robot: { name: 'Pip', color: '#FF7A59', eye: 'round', hat: 'cap' },
        tricks: { n1: 'sprout', n2: 'seed', n3: 'seed', n4: 'seed', n5: 'seed', n6: 'seed', n7: 'seed' }, stickers: [], hats: [],
        island: { done: ['path-postbox'], placed: [] }
      });
      expect(dec.model.island).toEqual({ activeId: 'p1', done: ['path-postbox'], placed: [] });
      const enc = runScript(ENCODE_SAVE_SCRIPT, { model: dec.model });
      expect(runScript(DECODE_SAVE_SCRIPT, { code: enc.code }).migrated).toBe(false);
    });

    it('🔴 a STORED v2 model (what localStorage holds today) loads by the same rule and says its migration is due; the v3 it becomes does not', () => {
      const stored = {
        v: 2, family: { id: 'fam2', created: 1700000000000 },
        profiles: [{ id: 'p1', name: 'Sam', robot: { name: 'Pip' } }, { id: 'p2', name: 'Noa', robot: { name: 'Bo' } }],
        island: { done: ['tulips-three'], placed: [], activeId: 'p1' }
      };
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', stored)).toBe(true);
      const model = helper<any>(SAVE_HELPERS, 'modelOf', stored);
      expect([model.v, model.profiles.map((p: any) => p.island.done)]).toEqual([3, [['tulips-three'], ['tulips-three']]]);
      // Written back (the page does it at once), it is v3: loading it again migrates nothing and changes nothing.
      const written = JSON.parse(JSON.stringify(model));
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', written)).toBe(false);
      expect(helper<any>(SAVE_HELPERS, 'modelOf', written)).toEqual(model);
      // Known-firing beside the absence: nobody stored, nothing due; a v1 model is due too.
      expect([helper<boolean>(SAVE_HELPERS, 'migrationDue', null), helper<boolean>(SAVE_HELPERS, 'migrationDue', { v: 2, profiles: [] }), helper<boolean>(SAVE_HELPERS, 'migrationDue', { v: 1, profiles: [{ id: 'x' }] })]).toEqual([false, false, true]);
    });

    it(`the robot's name is kept to ${ROBOT_NAME_MAX} characters`, () => {
      const m = runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'A', robotName: 'Bartholomew-the-3rd' }).model;
      expect(m.profiles[0].robot.name).toBe('Bartholomew-the-3rd'.slice(0, ROBOT_NAME_MAX));
      expect(ROBOT_NAME_MAX).toBe(16);
    });

    it('a bad code is refused and names it; a seventh profile is refused; a nameless one too', () => {
      const bad = runScript(DECODE_SAVE_SCRIPT, { code: 'BG1.notacode' });
      expect(bad).toMatchObject({ ok: false, error: 'bad' });
      // A refused code publishes no model at all (the Grown-ups paste box wires it into the page's store).
      expect('model' in bad).toBe(false);
      expect(runScript(DECODE_SAVE_SCRIPT, { code: 'RS1.abc' })).toMatchObject({ ok: false, error: 'bad' });
      let model: any = null;
      for (let i = 0; i < 6; i++) model = runScript(ADD_PROFILE_SCRIPT, { model, name: 'P' + i, band: 1, lang: 'en' }).model;
      const seventh = runScript(ADD_PROFILE_SCRIPT, { model, name: 'P7', band: 1, lang: 'en' });
      expect([seventh.ok, seventh.error, seventh.count]).toEqual([false, 'full', 6]);
      expect(runScript(ADD_PROFILE_SCRIPT, { model, name: '  ', band: 1, lang: 'en' }).error).toBe('name');
    });

    describe('arms: each save-model rule mutated in memory, and the row that kills it', () => {
      const mutate = (script: string, from: string, to: string) => {
        if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
        return script.replace(from, to);
      };
      it('the migration gives the family’s island to the ACTIVE kid only → the v2 rule row fails', () => {
        const m = mutate(DECODE_SAVE_SCRIPT, 'if (old) p.island = islandOf(isl);', "if (old && p.id === String(isl.activeId)) p.island = islandOf(isl);");
        // Decode passes v3 to modelOf with the family island per profile, so the rule lives in decode's own row: mutate there too.
        const m2 = mutate(m, 'island: v3 ? { done: a[12], placed: a[13] } : family', "island: v3 ? { done: a[12], placed: a[13] } : (a[0] === packed.a ? family : {})");
        expect(runScript(m2, { code: v2Code() }).model.profiles.map((p: any) => p.island.done)).not.toEqual([['tulips-three', 'path-postbox'], ['tulips-three', 'path-postbox']]);
        const stored = { v: 2, profiles: [{ id: 'p1' }, { id: 'p2' }], island: { done: ['tulips-three'], activeId: 'p1' } };
        expect(helper<any>(mutate(SAVE_HELPERS, 'if (old) p.island = islandOf(isl);', "if (old && p.id === String(isl.activeId)) p.island = islandOf(isl);"), 'modelOf', stored).profiles[1].island.done).toEqual([]);
      });
      it('a v3 model read from the family-level copy (no per-profile read) → the stale-copy row fails', () => {
        const m = mutate(SAVE_HELPERS, 'if (old) p.island = islandOf(isl);', 'p.island = islandOf(isl.done ? isl : p.island);');
        const tampered = JSON.parse(JSON.stringify(family()));
        tampered.island.done = ['rows-trick'];
        expect(helper<any>(m, 'modelOf', tampered).profiles[0].island.done).toEqual(['rows-trick']);
      });
      it('Complete request marks the family instead of the kid → the one-island-per-kid row fails', () => {
        const m = mutate(COMPLETE_REQUEST_SCRIPT, 'if (requestId && p.island.done.indexOf(requestId) === -1) { p.island.done.push(requestId); newlyDone = true; }', 'if (requestId) { for (var q = 0; q < model.profiles.length; q++) if (model.profiles[q].island.done.indexOf(requestId) === -1) model.profiles[q].island.done.push(requestId); newlyDone = true; }');
        const model = twoKids();
        expect(complete(model, model.profiles[0].id, TULIPS, m).model.profiles[1].island.done).toEqual(['tulips-three']);
      });
      it('the migration never says it is due → the stored-v2 row fails', () => {
        const m = mutate(SAVE_HELPERS, '!(Number(raw.v) >= SAVE_VERSION);\n}', 'false;\n}');
        expect(helper<boolean>(m, 'migrationDue', { v: 2, profiles: [{ id: 'p1' }] })).toBe(false);
      });
      it('encode drops a kid’s own island → the round-trip row fails', () => {
        const m = mutate(ENCODE_SAVE_SCRIPT, 'p.hats, p.island.done, p.island.placed]', 'p.hats, [], p.island.placed]');
        const model = family();
        expect(runScript(DECODE_SAVE_SCRIPT, { code: runScript(m, { model }).code }).model).not.toEqual(model);
      });
    });
  });

  describe('AC6 — sensors read the world only; olive_says is a sensor over the last answer', () => {
    it('🔴 no script reaches the DOM, the window, storage, or a Variable', () => {
      for (const { component, script } of FUNCTION_SCRIPTS) {
        for (const word of ['document', 'window', 'localStorage', 'sessionStorage', 'navigator', 'Noodl.', 'fetch(', 'XMLHttpRequest']) {
          expect({ component, word, found: script.includes(word) }).toEqual({ component, word, found: false });
        }
      }
      // Known-firing beside it: the same check finds the word in a script that has it.
      expect(FUNCTION_SCRIPTS[0].script + ' document.body').toContain('document');
    });

    it('every sensor reads the world JSON: the wall, a tulip, an empty bowl, a full basket, the count', () => {
      const w = MOCKUP_WORLD();
      const sense = (sensor: string, extra: Record<string, unknown> = {}) => runScript(SENSE_SCRIPT, { world: extra.world ?? w, robotId: 'pip', sensor, ...extra }).value;
      expect(sense('wall_ahead')).toBe(false);
      expect(sense('wall_ahead', { world: { ...w, robots: [{ id: 'pip', x: 7, y: 3, d: 1 }] } })).toBe(true);
      expect(sense('wall_ahead', { world: { ...w, robots: [{ id: 'pip', x: 0, y: 4, d: 1 }] } })).toBe(true);
      expect(sense('tulip_ahead')).toBe(false);
      expect(sense('tulip_ahead', { world: { ...w, robots: [{ id: 'pip', x: 2, y: 3, d: 0 }] } })).toBe(true);
      const bowls = { ...w, things: [{ kind: 'bowl', x: 1, y: 3, food: 0 }], robots: [{ id: 'pip', x: 0, y: 3, d: 1 }] };
      expect(sense('bowl_empty', { world: bowls })).toBe(true);
      expect(sense('bowl_empty', { world: { ...bowls, things: [{ kind: 'bowl', x: 1, y: 3, food: 1 }] } })).toBe(false);
      expect(sense('bowl_empty')).toBe(false);
      expect(sense('basket_full', { world: { ...w, robots: [{ id: 'pip', x: 0, y: 3, d: 1, basket: 2, carry: ['egg', 'egg'] }] } })).toBe(true);
      expect(sense('basket_full', { world: { ...w, robots: [{ id: 'pip', x: 0, y: 3, d: 1, basket: 2, carry: ['egg'] }] } })).toBe(false);
      expect(sense('count_is', { arg: 3, count: 3 })).toBe(true);
      expect(sense('count_is', { arg: 3, count: 2 })).toBe(false);
      expect(sense('no_such_sensor')).toBe(false);
    });

    it('🔴 olive_says reads only value or text of the last answer: yes/oui, no/non, a word from a one-of; a fallback with no value is false', () => {
      const says = (answer: unknown, arg?: unknown) => runScript(SENSE_SCRIPT, { world: MOCKUP_WORLD(), robotId: 'pip', sensor: 'olive_says', arg, answer }).value;
      expect(says({ ok: true, value: 'yes' }, 'yes')).toBe(true);
      expect(says({ ok: true, value: 'Oui' }, 'yes')).toBe(true);
      expect(says({ ok: true, text: 'yes' }, 'yes')).toBe(true);
      expect(says({ ok: true, value: 'no' }, 'yes')).toBe(false);
      expect(says({ ok: true, value: 'non' }, 'no')).toBe(true);
      expect(says({ ok: true, value: 'croquettes' }, 'croquettes')).toBe(true);
      expect(says({ ok: true, value: 'lettre' }, 'croquettes')).toBe(false);
      expect(says({ ok: false, fallback: true }, 'yes')).toBe(false);
      expect(says({ ok: false, fallback: true, value: 'no' }, 'no')).toBe(true);
      expect(says(null, 'yes')).toBe(false);
      // The sensor never reads anything but value/text: ms, rung and the rest are invisible to it.
      expect(says({ ok: true, ms: 900, rung: 5, shape: 'yes_no', yes: true }, 'yes')).toBe(false);
    });

    it('🔴 an ask parks the run with the CG-004 request shape, resumes on a matching answer, drops a stale one, and gates the branch after it', () => {
      const program: Block[] = [
        { id: 1, t: 'ask', slots: { rung: 5, args: ['croquettes', 'lettre', 'graines'], shape: 'one_of', dial: 0 } },
        { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'croquettes' }, body: [{ id: 3, t: 'fwd' }] },
        { id: 4, t: 'left' }
      ];
      const world = OPEN_ROW();
      let run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'fr' }).run;
      const parked = runScript(STEP_SCRIPT, { run, world, answer: null });
      expect([parked.waiting, parked.done, parked.glowId, parked.tick]).toEqual([true, false, 1, 0]);
      expect(parked.request).toEqual({ seq: 1, rung: 5, slots: ['croquettes', 'lettre', 'graines'], lang: 'fr', shape: 'one_of', temperature: 0 });
      // Still parked with no answer; the tick does not advance; the world is not touched.
      const still = runScript(STEP_SCRIPT, { run: parked.run, world, answer: null });
      expect([still.waiting, still.tick]).toEqual([true, 0]);
      // A stale answer (another park's seq) is dropped: the abandoned arm.
      const stale = runScript(STEP_SCRIPT, { run: still.run, world, answer: { seq: 7, ok: true, value: 'croquettes' } });
      expect(stale.waiting).toBe(true);
      // The matching answer resumes, and the sensor after it reads it.
      const resumed = runScript(STEP_SCRIPT, { run: stale.run, world, answer: { seq: 1, ok: true, value: 'croquettes', ms: 800 } });
      expect([resumed.waiting, resumed.tick, resumed.delta.answered]).toEqual([false, 1, { ok: true, value: 'croquettes', text: undefined, fallback: false }]);
      run = resumed.run;
      const end = runToEnd(program, world, 'pip', 'fr', [{ ok: true, value: 'croquettes' }]);
      expect(end.deltas.filter((d) => d.move)).toHaveLength(1);
      expect(end.world.robots[0]).toMatchObject({ x: 1, y: 3, d: 0 });
      // Another word: the branch is skipped, the left still runs.
      const other = runToEnd(program, world, 'pip', 'fr', [{ ok: true, value: 'lettre' }]);
      expect(other.deltas.filter((d) => d.move)).toHaveLength(0);
      expect(other.world.robots[0]).toMatchObject({ x: 0, y: 3, d: 0 });
      // The fallback: the run still finishes; the branch is skipped; the answer is marked so the owl row can say so.
      const fallback = runToEnd(program, world, 'pip', 'fr');
      expect(fallback.done).toBe(true);
      expect(fallback.run.lastAnswer).toEqual({ ok: false, value: undefined, text: undefined, fallback: true });
      expect(fallback.world.robots[0]).toMatchObject({ x: 0, y: 3, d: 0 });
    });

    it('a repeat driven by Olive takes its count from the answer, capped at nine, and zero on a fallback', () => {
      const program: Block[] = [
        { id: 1, t: 'ask', slots: { rung: 7, args: [], shape: 'number', dial: 0 } },
        { id: 2, t: 'repeat', n: 0, slots: { n: 'olive' }, body: [{ id: 3, t: 'fwd' }] }
      ];
      expect(runToEnd(program, OPEN_ROW(), 'pip', 'en', [{ ok: true, value: 3 }]).world.robots[0].x).toBe(3);
      expect(runToEnd(program, OPEN_ROW(), 'pip', 'en', [{ ok: true, value: '2' }]).world.robots[0].x).toBe(2);
      expect(runToEnd(program, OPEN_ROW(), 'pip', 'en', [{ ok: true, value: 40 }]).deltas.filter((d) => d.move || d.bump)).toHaveLength(9);
      expect(runToEnd(program, OPEN_ROW(), 'pip', 'en').world.robots[0].x).toBe(0);
    });

    it('a puddle is the error message: watering grass, a path or a rock leaves one; water and a tulip do not', () => {
      const at = (x: number, y: number, d: number, program = parse('W')) => runToEnd(program, { ...MOCKUP_WORLD(), robots: [{ id: 'pip', x, y, d }] });
      expect(at(0, 3, 1).world.things.filter((t: any) => t.kind === 'puddle')).toEqual([{ kind: 'puddle', x: 1, y: 3 }]);
      expect(at(0, 3, 2).run.puddles).toBe(1); // grass below
      expect(at(4, 4, 1).run.puddles).toBe(1); // the rock at 5,4
      expect(at(0, 4, 1).run.puddles).toBe(0); // the pond at 1,4
      expect(at(0, 3, 3).run.puddles).toBe(0); // off the map
      const tul = at(2, 3, 0);
      expect([tul.run.puddles, tul.run.watered, tul.world.things[0].watered]).toEqual([0, 1, true]);
      // Two waterings of one tile make one puddle and two splashes.
      const twice = at(0, 3, 1, parse('W W'));
      expect([twice.run.puddles, twice.deltas.filter((d) => d.splash).length]).toEqual([1, 2]);
    });

    it('pick and put move a thing between the tile ahead and the basket; the basket has a size; a bowl takes food', () => {
      const w = { ...OPEN_ROW(), things: [{ kind: 'letter', x: 1, y: 3 }, { kind: 'egg', x: 2, y: 3 }], robots: [{ id: 'pip', x: 0, y: 3, d: 1, basket: 1 }] };
      const end = runToEnd(parse('P F P F D'), w);
      // The basket held one: the egg was not picked; the letter was put down at 3,3.
      expect(end.world.robots[0].carry).toEqual([]);
      expect(end.world.things).toEqual([{ kind: 'egg', x: 2, y: 3 }, { kind: 'letter', x: 3, y: 3 }]);
      expect(end.deltas.filter((d) => d.nothing)).toHaveLength(1);
      const fed = runToEnd(parse('D D'), { ...OPEN_ROW(), things: [{ kind: 'bowl', x: 1, y: 3, food: 0 }], robots: [{ id: 'pip', x: 0, y: 3, d: 1, carry: ['food'] }] });
      expect(fed.world.things[0].food).toBe(1);
      expect(fed.world.robots[0].carry).toEqual([]);
      expect(fed.deltas.filter((d) => d.nothing)).toHaveLength(1);
    });
  });

  describe('AC7 — predictEnd returns the tile the robot ends on', () => {
    it('the tulip request ends at 6,3 facing right; a tap there hits, a tap beside it misses', () => {
      const r = REQUESTS.find((x) => x.id === 'tulips-three')!;
      const p = runScript(PREDICT_END_SCRIPT, { program: r.referenceProgram, world: worldOfRequest(r), robotId: 'pip' });
      expect({ x: p.x, y: p.y, d: p.d, known: p.known, asked: p.asked, hit: p.hit }).toEqual({ x: 6, y: 3, d: 1, known: true, asked: false, hit: false });
      expect(runScript(PREDICT_END_SCRIPT, { program: r.referenceProgram, world: worldOfRequest(r), robotId: 'pip', tapX: 6, tapY: 3 })).toMatchObject({ asked: true, hit: true });
      expect(runScript(PREDICT_END_SCRIPT, { program: r.referenceProgram, world: worldOfRequest(r), robotId: 'pip', tapX: 5, tapY: 3 })).toMatchObject({ asked: true, hit: false });
      // The prediction is what the run does: the same end as a full run.
      const end = runToEnd(r.referenceProgram, worldOfRequest(r));
      expect(end.world.robots[0]).toMatchObject({ x: p.x, y: p.y, d: p.d });
    });

    it('a program that walks into the wall ends on the last tile before it, bumps counted; an empty program ends where it starts', () => {
      const p = runScript(PREDICT_END_SCRIPT, { program: parse('r9[F]'), world: OPEN_ROW(), robotId: 'pip' });
      expect({ x: p.x, y: p.y, bumps: p.bumps, known: p.known }).toEqual({ x: 7, y: 3, bumps: 2, known: true });
      const none = runScript(PREDICT_END_SCRIPT, { program: [], world: OPEN_ROW(), robotId: 'pip' });
      expect({ x: none.x, y: none.y, d: none.d, ticks: none.ticks }).toEqual({ x: 0, y: 3, d: 1, ticks: 1 });
    });

    it('a program with an ask predicts along the fallback, and says it is known', () => {
      const program: Block[] = [{ id: 1, t: 'ask', slots: { rung: 6, args: [], shape: 'yes_no', dial: 0 } }, { id: 2, t: 'if', slots: { sensor: 'olive_says', arg: 'yes' }, body: [{ id: 3, t: 'fwd' }] }, { id: 4, t: 'fwd' }];
      const p = runScript(PREDICT_END_SCRIPT, { program, world: OPEN_ROW(), robotId: 'pip' });
      expect({ x: p.x, known: p.known }).toEqual({ x: 1, known: true });
    });
  });

  describe('AC8 — two robots: two programs step in turn on one world without sharing a Variable', () => {
    it('🔴 each run keeps its own count, pc and bumps; both robots move on the one world; the deltas name their robot', () => {
      let world: any = { ...OPEN_ROW(), robots: [{ id: 'pip', x: 0, y: 3, d: 1 }, { id: 'bo', x: 7, y: 1, d: 3 }] };
      let a = runScript(NEW_RUN_SCRIPT, { program: parse('r3[F C]'), robotId: 'pip', lang: 'en' }).run;
      let b = runScript(NEW_RUN_SCRIPT, { program: parse('r2[F] F'), robotId: 'bo', lang: 'fr' }).run;
      const seen: string[] = [];
      for (let i = 0; i < 20 && !(a.done && b.done); i++) {
        const ta = tick(a, world);
        a = ta.run;
        world = ta.world;
        if (ta.st.delta.move || ta.st.delta.count) seen.push('a:' + ta.st.delta.robot);
        const tb = tick(b, world);
        b = tb.run;
        world = tb.world;
        if (tb.st.delta.move) seen.push('b:' + tb.st.delta.robot);
      }
      expect(world.robots).toEqual([{ id: 'pip', x: 3, y: 3, d: 1, carry: [] }, { id: 'bo', x: 4, y: 1, d: 3, carry: [] }]);
      expect([a.count, b.count]).toEqual([3, 0]);
      expect([a.done, b.done]).toEqual([true, true]);
      expect(seen.every((s) => s === 'a:pip' || s === 'b:bo')).toBe(true);
      expect(seen.filter((s) => s === 'b:bo')).toHaveLength(3);
      // 3 × (noop, F, C) + the done tick = 10; 2 × (noop, F) + F + the done tick = 6. The one that finished first stays finished while the other goes on.
      expect([a.tick, b.tick]).toEqual([10, 6]);
    });

    it('a robot walking into the other bumps: the world is one world', () => {
      const world = { ...OPEN_ROW(), things: [{ kind: 'bowl', x: 2, y: 3, food: 0 }], robots: [{ id: 'pip', x: 0, y: 3, d: 1 }, { id: 'bo', x: 5, y: 3, d: 3 }] };
      const a = runToEnd(parse('F F F'), world, 'pip');
      // pip stops at the bowl; the bowl is a thing in the shared world.
      expect(a.world.robots[0]).toMatchObject({ x: 1, y: 3 });
      expect(a.run.bumps).toBe(2);
      expect(a.world.robots[1]).toMatchObject({ x: 5, y: 3 });
    });

    it('no script text names a Variable, an Object store or a global: the state travels on the ports', () => {
      for (const { component, script } of FUNCTION_SCRIPTS) {
        expect({ component, variable: /Noodl\.(Variables|Objects|Arrays)/.test(script), global: /globalThis|\bself\./.test(script) }).toEqual({ component, variable: false, global: false });
      }
    });
  });

  describe('AC9 — no backtick, no interpolation, in any script', () => {
    it('🔴 every script text is free of ` and ${', () => {
      for (const { component, script } of FUNCTION_SCRIPTS) {
        expect({ component, backtick: script.includes('`'), dollar: script.includes('${') }).toEqual({ component, backtick: false, dollar: false });
      }
      // Known-firing beside it.
      expect('a `b` c'.includes('`')).toBe(true);
    });
  });

  describe('the ports the graph wires', () => {
    it('every script mints the outputs its component publishes, and every input is a real name', () => {
      const expected: Record<string, string[]> = {
        'Logic/New run': ['run', 'steps', 'blocks', 'handlers'],
        'Logic/Step': ['run', 'delta', 'glowId', 'done', 'waiting', 'request', 'tick', 'count', 'bumps', 'puddles', 'sayKey'],
        'Logic/Apply delta': ['world', 'things', 'robots', 'tulips'],
        'Logic/Sense': ['value', 'sensor'],
        'Logic/Goal met': ['met', 'missing', 'done', 'total'],
        'Logic/Find repeat': ['found', 'i', 'len', 'count', 'cover', 'containerId', 'offer', 'textKey', 'sample', 'vars'],
        'Logic/Fold': ['program', 'repeatId', 'folded', 'blocks'],
        'Logic/Unfold': ['program', 'unfolded'],
        'Logic/Predict end': ['x', 'y', 'd', 'ticks', 'known', 'asked', 'hit', 'bumps'],
        'Logic/Choose hint': ['key', 'vars', 'isOlive'],
        'Logic/Hint line': ['text', 'found', 'key'],
        'Logic/Palette': ['palette', 'count', 'band'],
        'Logic/Add profile': ['model', 'ok', 'error', 'profileId', 'count'],
        'Logic/Complete request': ['model', 'newlyDone', 'bloomed', 'found'],
        'Logic/Encode save code': ['code', 'length'],
        'Logic/Decode save code': ['model', 'ok', 'error', 'migrated', 'profiles'],
        'Logic/Translate words': ['lang', 'isFr', ...WORD_KEYS],
        'Logic/Hint table': ['lang', ...HINT_KEYS]
      };
      expect(Object.keys(expected).sort()).toEqual(FUNCTION_SCRIPTS.map((f) => f.component).sort());
      for (const { component, script } of FUNCTION_SCRIPTS) {
        const ports = portsOf(script);
        for (const name of expected[component]) expect({ component, port: name, has: ports.outputs.includes(name) }).toEqual({ component, port: name, has: true });
        for (const input of ports.inputs) expect(input).toMatch(/^[a-z][A-Za-z]*$/);
      }
      expect(FUNCTION_SCRIPTS.map((f) => f.component)).toHaveLength(new Set(FUNCTION_SCRIPTS.map((f) => f.component)).size);
    });

    it('translate publishes every word in the chosen language, with the robot\'s name filled in', () => {
      const en = runScript(TRANSLATE_SCRIPT, { lang: 'en', words: WORD_ROWS, botName: 'Pip' });
      const fr = runScript(TRANSLATE_SCRIPT, { lang: 'fr', words: WORD_ROWS, botName: 'Pip' });
      expect([en.bFwd, fr.bFwd, en.cFwd, fr.cFwd, fr.isFr]).toEqual(['forward', 'avancer', 'go', 'hop', true]);
      for (const key of WORD_KEYS) {
        expect({ key, en: en[key].length > 0, fr: fr[key].length > 0 }).toEqual({ key, en: true, fr: true });
        expect(en[key]).not.toContain('{b}');
      }
      // Both bands' labels exist for every block type.
      const LABEL: Record<string, string> = { fwd: 'Fwd', left: 'Left', right: 'Right', water: 'Water', pick: 'Pick', put: 'Put', say: 'Say', repeat: 'Repeat', until: 'Until', if: 'If', when: 'When', count_inc: 'CountInc', trick: 'Trick', do: 'Do', ask: 'Ask' };
      for (const t of Object.keys(LABEL)) expect({ t, word: WORDS['b' + LABEL[t]] !== undefined, caption: WORDS['c' + LABEL[t]] !== undefined }).toEqual({ t, word: true, caption: true });
    });

    it('the palette: band 7–9 is six icon blocks with captions; band 10–12 is every block with its word; a request narrows it', () => {
      const b1 = runScript(PALETTE_SCRIPT, { band: 1, words: WORD_ROWS, lang: 'fr' });
      expect(b1.palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'water', 'pick', 'put']);
      expect(b1.palette[0]).toEqual({ id: 'fwd', kind: 'motion', label: 'avancer', caption: 'hop', hasBody: false, hasCount: false, slots: [], band: 1 });
      const b2 = runScript(PALETTE_SCRIPT, { band: 2, words: WORD_ROWS, lang: 'en' });
      expect(b2.count).toBe(15);
      expect(b2.palette.find((p: any) => p.id === 'repeat')).toMatchObject({ hasBody: true, hasCount: true, label: 'repeat' });
      expect(b2.palette.find((p: any) => p.id === 'ask')).toMatchObject({ kind: 'ask', slots: ['rung', 'args', 'shape', 'dial'] });
      const r = REQUESTS.find((x) => x.id === 'wall-until')!;
      expect(runScript(PALETTE_SCRIPT, { band: 2, words: WORD_ROWS, lang: 'en', allowed: r.palette }).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'until']);
      // Band 7–9 never sees a control block, whatever the request lists.
      expect(runScript(PALETTE_SCRIPT, { band: 1, words: WORD_ROWS, lang: 'en', allowed: r.palette }).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right']);
    });
  });
});
