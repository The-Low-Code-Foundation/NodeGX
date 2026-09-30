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
// P106 IG-005: the robot catalogue and the upgrades.
import { ROBOTS, UPGRADES, needsOf } from './cg002Content';
// P106 IG-004: the island's content gate (AC4) runs HERE, in the gate the generator runs first.
import { FREE_PLAY_PLOT, ISLAND_BASE, ISLAND_H, ISLAND_HOME_MAP, ISLAND_HOME_PLOT, ISLAND_MEADOW_MAP, ISLAND_W, PLOT_H, PLOT_W } from './cg002Content';
import { islandProblems } from './ig004Island';
import { FREE_PLAY, ISLAND_WORLD_SCRIPT } from './cg003Scripts';
import {
  ADD_PROFILE_SCRIPT,
  APPLY_DELTA_SCRIPT,
  BRING_HOME_SCRIPT,
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
import { ENGINE, ROBOT_NAME_MAX, SAVE_HELPERS, UPDATE_ROBOT_SCRIPT, helper } from './cg002Scripts';
// P106 IG-006: the page's own fallback for an Olive step is the rung's WRITTEN answer (cg005Olive's Ask Olive).
import { OLIVE_TABLE, OLIVE_WORDS } from './cg005Olive';
import { IG006_WORDS } from './cg003Content';
// P108 IW-002 (lane J): the job model — its vocabulary, the wear clock, the seed, Start world's seed line.
import { HEN_CAPACITY, JOB_KINDS, JOB_VOCABULARY, SITE_STAGES, WALL_TILE, WEAR } from './cg002Content';
import { SEED_HELPERS } from './cg002Scripts';
import { START_WORLD_SCRIPT } from './cg003Scripts';
// P108 IW-005 (lane J): the new statements' types and their meta.
import { BLOCK_TYPES } from './cg002Content';
import { BLOCK_META } from './cg002Scripts';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { writtenAnswer } = require('../../../dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/olive-written.js');
/** What the page answers a parked Olive step with when she does not: the written answer, as Ask Olive does. */
const written = (req: { rung: string; slots: Record<string, string>; lang: string }) => ({ ok: false, fallback: true, ...(writtenAnswer(OLIVE_TABLE, req.rung, req.slots, req.lang) || {}) });

const WORD_ROWS = WORD_KEYS.map((key) => ({ key, ...WORDS[key] }));
const HINT_ROWS = HINT_KEYS.map((key) => ({ key, ...HINTS[key] }));

// ── Harness ─────────────────────────────────────────────────────────────────

/**
 * The world a request opens on: its map, its things, one robot at the start. P108 IW-003 (s3 base): laid from a seed the
 * way Start world lays it (`seedWorld`: the job copied in, the seeded layout laid) — seed 1 unless one is given; a
 * request with neither `job` nor `seeded` is untouched, exactly as before.
 */
function worldOfRequest(r: GardenRequest, robotId = 'pip', seed = 1) {
  const robot: Record<string, unknown> = { id: robotId, x: r.robotStart.x, y: r.robotStart.y, d: r.robotStart.d };
  if (r.robotStart.carry) robot.carry = [...r.robotStart.carry];
  if (r.robotStart.basket) robot.basket = r.robotStart.basket;
  // IG-002: the can, as Start world passes it (a number on a request with a pond; absent = no can, water is free).
  if (r.robotStart.can !== undefined) robot.can = r.robotStart.can;
  if (r.robotStart.canMax !== undefined) robot.canMax = r.robotStart.canMax;
  const world = { map: [...r.map], things: r.things.map((t) => ({ ...t })), robots: [robot], schedule: r.schedule ? r.schedule.map((s) => ({ ...s })) : [] };
  return helper<any>(ENGINE, 'seedWorld', world, JSON.parse(JSON.stringify(r)), seed);
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
      const a = answers[asked] ?? written(t.st.request);
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

/** A tiny notation for programs: F L R W P D S C are the primitives (K is IG-002's fill); r3[…] u[…] i[…] w[…] t[…] o are containers and `do`. Ids are pre-order from 1. */
function parse(src: string): Block[] {
  let id = 1;
  const prim: Record<string, BlockType> = { F: 'fwd', L: 'left', R: 'right', W: 'water', P: 'pick', D: 'put', S: 'say', C: 'count_inc', K: 'fill' };
  const tokens = src.match(/r\d+\[|u\[|i\[|w\[|t\[|\]|[FLRWPDSCKo]/g) ?? [];
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

/**
 * The mockup's garden: three dry tulips in the bed of row 2, the pond at 1–2,4, the rock tile at 5,4, the robot at 0,3
 * facing right with no can (free water). It was the tulips request's world until IG-002 rewrote that request as
 * fetch-and-return; the sensor, puddle and hint rows below are about this garden, so it is written out here.
 */
const MOCKUP_WORLD = () => ({
  map: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'],
  things: [
    { kind: 'tulip', x: 2, y: 2, watered: false },
    { kind: 'tulip', x: 4, y: 2, watered: false },
    { kind: 'tulip', x: 6, y: 2, watered: false }
  ],
  robots: [{ id: 'pip', x: 0, y: 3, d: 1 } as Record<string, unknown>],
  schedule: [] as Array<{ tick: number; event: string }>
});
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
      // CG-006: four requests open at band 7–9 (both bands), six at band 10–12 only; IG-006 adds three at 10–12: 4×2×2 + 9×2×1.
      expect(rows).toHaveLength(34);
    });

    it.each(rows)('%s · %s · band %i', (_id, lang, band, r) => {
      const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
      // Every block the band's child could have placed is in that band's palette, and in the request's own.
      const palette = new Set<string>(BAND_PALETTE[band as 1 | 2]);
      // IG-006: an Olive block (olive:<rung>) is offered by the request's rungs, band 10–12 only.
      const olive = (t: string) => t.startsWith('olive:') && band === 2 && (r.rungs ?? []).includes(t.slice(6));
      for (const t of typesIn(program)) expect({ block: t, inBand: palette.has(t) || olive(t), inRequest: r.palette.includes(t as BlockType) || olive(t) }).toEqual({ block: t, inBand: true, inRequest: true });
      const end = runToEnd(program, worldOfRequest(r), 'pip', lang);
      const goal = runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program, goal: r.goal });
      expect({ id: r.id, lang, band, done: end.done, ticks: end.ticks, met: goal.met, missing: goal.missing }).toEqual({ id: r.id, lang, band, done: true, ticks: end.ticks, met: true, missing: [] });
      expect(end.ticks).toBeLessThan(400);
      expect(end.run.bumps).toBe(0);
      expect(end.run.puddles).toBe(0);
      // The card's copy resolves in the language: title, blurb, the islander's line, the reward.
      // (IG-006's three requests keep their copy in the page's word table, cg003Content IG006_WORDS: the page's Translate carries both.)
      const words = { ...Object.fromEntries(Object.entries(IG006_WORDS).map(([k, v]) => [k, v[lang as 'en' | 'fr'].split('{b}').join('Pip')])), ...runScript(TRANSLATE_SCRIPT, { lang, words: WORD_ROWS, botName: 'Pip' }) };
      for (const key of Object.values(r.copyKeys)) expect({ key, text: words[key] }).toEqual({ key, text: expect.stringMatching(/\S/) });
      expect(words[r.copyKeys.line]).not.toContain('{b}');
      // A `say` says its line in the language (the delta carries the key; the page resolves it).
      const said = end.deltas.filter((d) => d.say);
      for (const d of said) expect(words[d.say.text]).toMatch(/\S/);
      // (IG-006: a thank-you Olive wrote is said too — the olive bubble on the tick her answer is consumed.)
      const oliveSaid = end.deltas.filter((d) => d.answered && d.sayText);
      if (r.goal instanceof Array && r.goal.some((g) => g.name === 'said')) expect(said.length + oliveSaid.length).toBeGreaterThan(0);
    });

    it('the goal is data: no request carries a function, and every goal name is one GOAL_SCRIPT knows', () => {
      const known = ['every_tulip_watered', 'thing_at', 'bowl_has', 'robot_at', 'facing', 'carrying', 'uses', 'handled', 'said', 'no_puddle', 'senses', 'tulips_watered'];
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

    it('s4: the fold is offered only where the request has a repeat block (Sami\u2019s path has none), or no list at all', () => {
      const program = parse('F F F F F');
      const offer = (allowed?: string[]) => runScript(FIND_REPEAT_SCRIPT, { program, band: 2, allowed }).offer;
      expect(offer(['fwd', 'left', 'right'])).toBe(false);
      expect(offer(['fwd', 'left', 'right', 'water', 'repeat'])).toBe(true);
      expect(offer([])).toBe(true); // free play: nothing restricted
      expect(offer(undefined)).toBe(true);
      // Every band 10–12-playable request without repeat in its palette is refused, by the request table itself.
      for (const r of REQUESTS) expect({ id: r.id, offer: offer(r.palette.slice()) }).toEqual({ id: r.id, offer: r.palette.includes('repeat') });
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
      // IG-006 AC7: an after-run line per Olive block (1–3) and a resting line per block; no rung 4–18 line is left.
      expect(HINT_KEYS.filter((k) => /^oliveRung\d+$/.test(k))).toEqual(OLIVE_RUNGS.map((r) => 'oliveRung' + r.n));
      expect(HINT_KEYS.filter((k) => /^oliveResting\d+$/.test(k))).toEqual(OLIVE_RUNGS.map((r) => 'oliveResting' + r.n));
      expect(HINT_KEYS).toEqual(expect.arrayContaining(['hintStart', 'hintEmpty', 'hintPattern', 'hintMissed', 'hintNotYet', 'hintBump', 'hintWet', 'hintDone', 'hintDoneMany', 'hintPerfect', 'hintFree', 'hintPredictMiss', 'oliveThinking', 'oliveResting']));
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
      ['rung 3 (is it a…?) just played, ran clean, goal unmet', { program: parse('F L'), run: ranRun(), oliveRung: 3 }, 'oliveRung3', {}],
      ['an unfolded repetition beats a bump', { program: parse('F F F F L'), run: ranRun({ bumps: 1 }) }, 'hintPattern', { n: 4 }]
    ];

    it('s4: a run that missed a goal with no tulips in the world says hintNotYet, never "0 of 0"', () => {
      const noTulips = { ...world(), things: world().things.filter((t: { kind: string }) => t.kind !== 'tulip') };
      const chosen = runScript(CHOOSE_HINT_SCRIPT, { world: noTulips, program: parse('F'), run: ranRun() });
      expect([chosen.key, chosen.vars]).toEqual(['hintNotYet', {}]);
      // The pattern nudge ("do this 5 times") is the fold's words: not where the request has no repeat (the s4 drive).
      const five = { world: noTulips, program: parse('F F F F F'), run: ranRun() };
      expect(runScript(CHOOSE_HINT_SCRIPT, { ...five, allowed: ['fwd', 'left', 'right'] }).key).toBe('hintNotYet');
      expect(runScript(CHOOSE_HINT_SCRIPT, { ...five, allowed: ['fwd', 'repeat'] }).key).toBe('hintPattern');
      expect(runScript(CHOOSE_HINT_SCRIPT, { ...five, allowed: [] }).key).toBe('hintPattern');
      expect(HINTS.hintNotYet.en).not.toMatch(/tulip|\{w\}|\{t\}/);
      expect(HINTS.hintNotYet.fr).toContain(WORDS.step.fr);
      expect(HINTS.hintNotYet.en).toContain(WORDS.step.en);
    });

    it('🔴 P106 s4 (c): in Drive with a program not yet run the owl says Play or Teach, never "press Teach and show"; Teach and no mode keep the start line', () => {
      const ready = { world: world(), program: parse('F L'), run: runScript(NEW_RUN_SCRIPT, { program: parse('F L'), robotId: 'pip', lang: 'en' }).run };
      expect(runScript(CHOOSE_HINT_SCRIPT, { ...ready, mode: 'drive' }).key).toBe('hintDriveReady');
      expect(runScript(CHOOSE_HINT_SCRIPT, { ...ready, mode: 'teach' }).key).toBe('hintStart');
      expect(runScript(CHOOSE_HINT_SCRIPT, ready).key).toBe('hintStart');
      // Empty, or a run behind it, Drive changes nothing.
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: [], mode: 'drive' }).key).toBe('hintEmpty');
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F'), run: ranRun({ bumps: 1 }), mode: 'drive' }).key).toBe('hintBump');
      for (const lang of ['en', 'fr'] as const) {
        expect(HINTS.hintDriveReady[lang]).toContain(WORDS.play[lang]);
        expect(HINTS.hintDriveReady[lang]).toContain(IG006_WORDS.ig3Teach[lang]);
        expect(HINTS.hintDriveReady[lang]).not.toBe(HINTS.hintStart[lang]);
      }
    });

    it('has twelve named states', () => {
      expect(twelveStates).toHaveLength(12);
      expect(new Set(twelveStates.map((s) => s[2])).size).toBeGreaterThanOrEqual(10);
    });

    it.each(twelveStates)('%s → %s', (_name, inputs, key, vars) => {
      const chosen = runScript(CHOOSE_HINT_SCRIPT, { world: world(), ...inputs });
      expect({ key: chosen.key, vars: chosen.vars }).toEqual({ key, vars: expect.objectContaining(vars) });
      expect(HINT_KEYS).toContain(chosen.key);
    });

    it('every Olive block, rungs 1–3 (IG-006), has its own after-run line and its own resting line — none falls through to hintMissed', () => {
      const ns = OLIVE_RUNGS.map((r) => r.n);
      expect(ns).toEqual([1, 2, 3]);
      for (const n of ns) {
        const rest = runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F L'), run: ranRun(), oliveRung: n, oliveFallback: true });
        expect({ n, key: rest.key }).toEqual({ n, key: 'oliveResting' + n });
        for (const lang of ['en', 'fr'] as const) expect(HINTS['oliveResting' + n][lang]).toMatch(lang === 'en' ? /resting/ : /repose/);
      }
      // A rung past the last (an old run's number) is not a block: it says the plain resting line, and no rung line.
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F L'), run: ranRun(), oliveRung: 6, oliveFallback: true }).key).toBe('oliveResting');
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F L'), run: ranRun(), oliveRung: 6 }).key).not.toMatch(/^oliveRung/);
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

    it('🔴 IG-001 D3: a win with the request’s own block count is hintPerfect; a longer win says hintDone; over MANY_BLOCKS hintDoneMany — the line in EN and FR', () => {
      const stones = REQUESTS.find((r) => r.id === 'path-stones')!;
      const refCount = helper<number>(ENGINE, 'countBlocks', [...stones.referenceProgram]);
      const w = worldOfRequest(stones);
      // The consequence, on the engine: the reference program run to its end meets the goal.
      const perfect = runToEnd(stones.referenceProgram, w);
      const met = runScript(GOAL_SCRIPT, { world: perfect.world, run: perfect.run, program: stones.referenceProgram, goal: stones.goal }).met;
      // IG-002: the stones' reference mines first — turn to the rock, repeat 4 pick, turn back, repeat 4 (put, fwd).
      expect([perfect.done, met, refCount]).toEqual([true, true, 7]);
      const choose = (program: ReadonlyArray<Block>, run: unknown, extra: Record<string, unknown> = {}) =>
        runScript(CHOOSE_HINT_SCRIPT, { world: perfect.world, program, run, goalMet: true, allowed: [...stones.palette], referenceCount: refCount, ...extra });
      expect(choose(stones.referenceProgram, perfect.run).key).toBe('hintPerfect');
      // One block more than the reference: done, and it could be shorter.
      expect(choose(parse('L r4[P] R r4[D F] F'), ranRun()).key).toBe('hintDone');
      // Eight single blocks on a request that allows repeat: the fold nudge outranks the win (the tidy offer is up too);
      // on a palette with no repeat, hintDone; nine blocks, hintDoneMany (the constant, never the literal).
      const eight = parse('D F D F D F D F');
      expect(eight).toHaveLength(MANY_BLOCKS);
      expect(choose(eight, ranRun()).key).toBe('hintPattern');
      expect(choose(eight, ranRun(), { allowed: ['fwd', 'put'] }).key).toBe('hintDone');
      expect(choose(parse('D F D F D F D F F'), ranRun(), { allowed: ['fwd', 'put'] }).key).toBe('hintDoneMany');
      // No reference count (free play, an older caller): never Perfect.
      expect(choose(stones.referenceProgram, perfect.run, { referenceCount: undefined }).key).toBe('hintDone');
      expect(choose(stones.referenceProgram, perfect.run, { referenceCount: 0 }).key).toBe('hintDone');
      for (const lang of ['en', 'fr'] as const) {
        const line = runScript(HINT_LINE_SCRIPT, { hints: HINT_ROWS, key: 'hintPerfect', lang, vars: {}, botName: 'Pip' });
        expect({ lang, found: line.found, text: line.text }).toEqual({ lang, found: true, text: expect.stringMatching(lang === 'en' ? /Perfect/ : /Parfait/) });
      }
    });

    it('🔴 IG-001 D4: free play has its own line after a clean run; a bump or a puddle still hints; a rung’s lesson still outranks it', () => {
      const free = (extra: Record<string, unknown>) => runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F F L'), freePlay: true, ...extra });
      expect([free({ run: ranRun() }).key, free({ run: ranRun() }).vars]).toEqual(['hintFree', {}]);
      expect(free({ run: ranRun({ bumps: 1 }) }).key).toBe('hintBump');
      expect(free({ run: ranRun({ puddles: 1 }) }).key).toBe('hintWet');
      expect(free({ run: ranRun(), oliveRung: 3 }).key).toBe('oliveRung3');
      expect(free({ run: ranRun(), oliveFallback: true }).key).toBe('oliveResting');
      // Not run yet: the start line. Not free play: the missed line, as before.
      expect(free({ run: runScript(NEW_RUN_SCRIPT, { program: parse('F F L'), robotId: 'pip', lang: 'en' }).run }).key).toBe('hintStart');
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F F L'), run: ranRun(), freePlay: false }).key).toBe('hintMissed');
      for (const key of ['hintFree', 'hintPerfect']) {
        expect(HINT_KEYS).toContain(key);
        expect(HINTS[key].en).not.toBe(HINTS[key].fr);
        expect(HINTS[key].en).not.toMatch(/tell me/i);
      }
      expect(HINTS.hintFree.en).toContain('{b}');
    });

    function wateredWorld(n: number) {
      const w = MOCKUP_WORLD();
      for (let i = 0; i < n; i++) w.things[i].watered = true;
      return w;
    }
  });

  describe('AC5 — the save: one island per kid (v3, ruling 8); a code round-trips; a v1 or v2 family migrates by the rule and asks for its own save', () => {
    const TULIPS = REQUESTS.find((r) => r.id === 'tulips-three')!;
    const complete = (model: any, profileId: string, r: GardenRequest = TULIPS, script = COMPLETE_REQUEST_SCRIPT, program?: unknown) =>
      runScript(script, { model, profileId, requestId: r.id, tricks: r.tricks, reward: r.reward, program, now: 1759000000000 });
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
      // IG-004: A's tulips won with a program: the plot keeps it, and A's robot is pinned there.
      model = complete(model, model.profiles[0].id, TULIPS, COMPLETE_REQUEST_SCRIPT, TULIPS.referenceProgram).model;
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
      expect(model.island).toEqual({ activeId: b, done: [], plots: {}, robots: [{ id: 'r1' }] });
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
      tampered.island.plots = { 'rows-trick': { program: [{ id: 1, t: 'fwd' }], robotId: 'r1', wonAt: 1 } };
      const read = helper<any>(SAVE_HELPERS, 'modelOf', tampered);
      expect(read.profiles.map((p: any) => p.island.done)).toEqual([['tulips-three'], ['tulips-three']]);
      expect(Object.keys(read.island.plots)).toEqual([]);
      expect(read.island.done).toEqual(read.profiles[1].island.done);
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', tampered)).toBe(false);
    });

    it('🔴 the model written as a code decodes to an identical model (v4, each kid’s island in her row: done, plots, robots)', () => {
      const model = family();
      expect(model.v).toBe(SAVE_VERSION);
      expect(SAVE_VERSION).toBe(4);
      expect(model.profiles[0].hats).toEqual(['sun']);
      expect(model.profiles[0].tricks).toEqual({ n1: 'sprout', n2: 'bloom', n3: 'seed', n4: 'seed', n5: 'seed', n6: 'seed', n7: 'seed' });
      const enc = runScript(ENCODE_SAVE_SCRIPT, { model });
      expect(enc.code).toMatch(/^BG1\.[A-Za-z0-9_-]+$/);
      // A pinned program rides in the code: two kids, one tulips program (the ten-block reference), well under a paste box.
      expect(enc.length).toBeLessThan(1200);
      const packed = JSON.parse(Buffer.from(enc.code.slice(4), 'base64url').toString('utf8'));
      expect(packed.v).toBe(4);
      expect([packed.d, packed.pl]).toEqual([undefined, undefined]);
      expect(packed.p.map((row: unknown[]) => [row[12], row[13], row[14]])).toEqual([
        [['tulips-three'], [['tulips-three', JSON.parse(JSON.stringify(TULIPS.referenceProgram)), 'r1', 1759000000000]], ['r1']],
        [['tulips-three'], [], ['r1']]
      ]);
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
      // IG-004: v2's `pl` (placed things) is dropped — nothing ever wrote it.
      expect(dec.model.profiles.map((p: any) => p.island)).toEqual([
        { done: ['tulips-three', 'path-postbox'], plots: {}, robots: [{ id: 'r1' }] },
        { done: ['tulips-three', 'path-postbox'], plots: {}, robots: [{ id: 'r1' }] }
      ]);
      // Two islands, not one shared: finishing a request on one leaves the other as it was.
      expect(dec.model.profiles[0].island.done).not.toBe(dec.model.profiles[1].island.done);
      expect(dec.model.profiles[0]).toMatchObject({ tricks: { n1: 'sprout', n2: 'bloom' }, stickers: ['letter'], hats: ['cap'] });
      expect(dec.model.island).toEqual({ activeId: 'p2', done: ['tulips-three', 'path-postbox'], plots: {}, robots: [{ id: 'r1' }] });
      // Saved again, it is a v4 code, and decoding THAT is no longer a migration.
      const enc = runScript(ENCODE_SAVE_SCRIPT, { model: dec.model });
      expect(JSON.parse(Buffer.from(enc.code.slice(4), 'base64url').toString('utf8')).v).toBe(4);
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
        island: { done: ['path-postbox'], plots: {}, robots: [{ id: 'r1' }] }
      });
      expect(dec.model.island).toEqual({ activeId: 'p1', done: ['path-postbox'], plots: {}, robots: [{ id: 'r1' }] });
      const enc = runScript(ENCODE_SAVE_SCRIPT, { model: dec.model });
      expect(runScript(DECODE_SAVE_SCRIPT, { code: enc.code }).migrated).toBe(false);
    });

    it('🔴 a STORED v2 model loads by the same rule and says its migration is due; the v4 it becomes does not', () => {
      const stored = {
        v: 2, family: { id: 'fam2', created: 1700000000000 },
        profiles: [{ id: 'p1', name: 'Sam', robot: { name: 'Pip' } }, { id: 'p2', name: 'Noa', robot: { name: 'Bo' } }],
        island: { done: ['tulips-three'], placed: [], activeId: 'p1' }
      };
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', stored)).toBe(true);
      const model = helper<any>(SAVE_HELPERS, 'modelOf', stored);
      expect([model.v, model.profiles.map((p: any) => p.island.done)]).toEqual([4, [['tulips-three'], ['tulips-three']]]);
      // Written back (the page does it at once), it is v4: loading it again migrates nothing and changes nothing.
      const written = JSON.parse(JSON.stringify(model));
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', written)).toBe(false);
      expect(helper<any>(SAVE_HELPERS, 'modelOf', written)).toEqual(model);
      // Known-firing beside the absence: nobody stored, nothing due; a v1 model is due too.
      expect([helper<boolean>(SAVE_HELPERS, 'migrationDue', null), helper<boolean>(SAVE_HELPERS, 'migrationDue', { v: 2, profiles: [] }), helper<boolean>(SAVE_HELPERS, 'migrationDue', { v: 1, profiles: [{ id: 'x' }] }), helper<boolean>(SAVE_HELPERS, 'migrationDue', { v: 3, profiles: [{ id: 'x' }] })]).toEqual([false, false, true, true]);
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
        const m = mutate(DECODE_SAVE_SCRIPT, 'if (old) p.island = islandOf({ done: isl.done });', "if (old && p.id === String(isl.activeId)) p.island = islandOf({ done: isl.done });");
        // Decode hands modelOf the family island per profile, so the rule lives in decode's own row: mutate there too.
        const m2 = mutate(m, ': v3 ? { done: a[12] } : family;', ': v3 ? { done: a[12] } : (a[0] === packed.a ? family : {});');
        expect(runScript(m2, { code: v2Code() }).model.profiles.map((p: any) => p.island.done)).not.toEqual([['tulips-three', 'path-postbox'], ['tulips-three', 'path-postbox']]);
        const stored = { v: 2, profiles: [{ id: 'p1' }, { id: 'p2' }], island: { done: ['tulips-three'], activeId: 'p1' } };
        expect(helper<any>(mutate(SAVE_HELPERS, 'if (old) p.island = islandOf({ done: isl.done });', "if (old && p.id === String(isl.activeId)) p.island = islandOf({ done: isl.done });"), 'modelOf', stored).profiles[1].island.done).toEqual([]);
      });
      it('a v3 model read from the family-level copy (no per-profile read) → the stale-copy row fails', () => {
        const m = mutate(SAVE_HELPERS, 'if (old) p.island = islandOf({ done: isl.done });', 'p.island = islandOf(isl.done ? isl : p.island);');
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
        const m = mutate(ENCODE_SAVE_SCRIPT, 'p.hats, p.island.done, plots, robots]', 'p.hats, [], plots, robots]');
        const model = family();
        expect(runScript(DECODE_SAVE_SCRIPT, { code: runScript(m, { model }).code }).model).not.toEqual(model);
      });
    });
  });

  describe('IG-004 AC1 — save v4: a won plot keeps its program and its robot; v3 codes (one per band, P105’s encoder) restore every profile', () => {
    // The fixtures were written by the v3 encoder itself (cg002Scripts.ts at f182a2d9e): authentic P105 codes.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const V3 = require('./fixtures/ig004-v3-saves.json') as Record<'band1' | 'band2', { code: string; profiles: any[] }>;
    const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
    const win = (model: any, id: string, program: unknown, extra: Record<string, unknown> = {}) =>
      runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: id === 'free' ? [] : req(id).tricks, reward: id === 'free' ? null : req(id).reward, program, now: 1759000000000, ...extra });
    const kid = () => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
    const TULIP_PROG = JSON.parse(JSON.stringify(req('tulips-three').referenceProgram));
    const STONE_PROG = JSON.parse(JSON.stringify(req('path-stones').referenceProgram));

    for (const band of ['band1', 'band2'] as const) {
      it(`🔴 a v3 code from P105 (${band === 'band1' ? 'band 7–9' : 'band 10–12, two kids'}) restores every profile, done request, hat, sticker and trick; it says migrated; the v4 code it becomes does not`, () => {
        const fx = V3[band];
        const packed = JSON.parse(Buffer.from(fx.code.slice(4), 'base64url').toString('utf8'));
        expect(packed.v).toBe(3);
        const dec = runScript(DECODE_SAVE_SCRIPT, { code: fx.code });
        expect([dec.ok, dec.error, dec.migrated, dec.profiles]).toEqual([true, '', true, fx.profiles.length]);
        expect(dec.model.v).toBe(4);
        for (const [i, want] of fx.profiles.entries()) {
          const got = dec.model.profiles[i];
          const { island, ...rest } = want;
          expect({ ...got, island: undefined }).toEqual({ ...rest, island: undefined });
          // Every done request kept; placed (v3's never-written list) gone; no plot pinned (v3 kept no program); the one robot.
          expect(got.island).toEqual({ done: island.done, plots: {}, robots: [{ id: 'r1' }] });
          expect('placed' in got.island).toBe(false);
        }
        expect(fx.profiles.some((p) => p.hats.length > 0 && p.stickers.length > 0)).toBe(true);
        // Written back as a code it is v4, and reading THAT migrates nothing and changes nothing.
        const again = runScript(ENCODE_SAVE_SCRIPT, { model: dec.model });
        expect(JSON.parse(Buffer.from(again.code.slice(4), 'base64url').toString('utf8')).v).toBe(4);
        const back = runScript(DECODE_SAVE_SCRIPT, { code: again.code });
        expect([back.migrated, back.model]).toEqual([false, dec.model]);
      });
    }

    it('🔴 a STORED v3 model (what localStorage holds before IG-004) is due its migration, loads as v4 with placed dropped, and once written back is not due', () => {
      const stored = { v: 3, family: { id: 'f3', created: 1 }, profiles: V3.band2.profiles.map((p) => ({ ...p, island: { ...p.island, placed: [{ kind: 'stone', x: 1, y: 1 }] } })), island: { activeId: 'p-noa', done: [], placed: [] } };
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', stored)).toBe(true);
      const model = helper<any>(SAVE_HELPERS, 'modelOf', stored);
      expect(model.v).toBe(4);
      expect(model.profiles.map((p: any) => p.island.done)).toEqual(V3.band2.profiles.map((p) => p.island.done));
      expect(model.profiles.every((p: any) => !('placed' in p.island))).toBe(true);
      expect(model.island).toEqual({ activeId: 'p-noa', done: ['path-postbox'], plots: {}, robots: [{ id: 'r1' }] });
      const written = JSON.parse(JSON.stringify(model));
      expect(helper<boolean>(SAVE_HELPERS, 'migrationDue', written)).toBe(false);
      expect(helper<any>(SAVE_HELPERS, 'modelOf', written)).toEqual(model);
    });

    it('🔴 Complete request pins the program and the robot to the plot; a win elsewhere moves the robot; no program, free play or an unknown robot pins nothing', () => {
      let model = kid();
      const a = win(model, 'tulips-three', TULIP_PROG);
      expect([a.newlyDone, a.pinned]).toEqual([true, 'r1']);
      expect(a.model.island.plots).toEqual({ 'tulips-three': { program: TULIP_PROG, robotId: 'r1', wonAt: 1759000000000 } });
      // The program as the kit hands it (JSON text) is kept as a list.
      expect(win(kid(), 'tulips-three', JSON.stringify(TULIP_PROG)).model.island.plots['tulips-three'].program).toEqual(TULIP_PROG);
      model = a.model;
      // The same robot wins the stones: it works ONE plot — the tulips keep their program, no robot on them.
      const b = win(model, 'path-stones', STONE_PROG, { now: 1759000000500 });
      expect(b.model.island.plots['tulips-three'].robotId).toBe('');
      expect(b.model.island.plots['path-stones']).toEqual({ program: STONE_PROG, robotId: 'r1', wonAt: 1759000000500 });
      expect(helper<string>(SAVE_HELPERS, 'plotOfRobot', b.model.island, 'r1')).toBe('path-stones');
      // Known-firing beside each absence: the same call WITH a program pins.
      expect(win(kid(), 'tulips-three', undefined).model.island.plots).toEqual({});
      expect(win(kid(), 'tulips-three', []).model.island.plots).toEqual({});
      expect(win(kid(), 'free', TULIP_PROG).model.island.plots).toEqual({});
      expect(win(kid(), 'tulips-three', TULIP_PROG, { robotId: 'r9' }).model.island.plots).toEqual({});
    });

    it('🔴 bring the robot home: the plot keeps its win (done, wonAt) and loses its program; the robot is free; a second call frees nothing', () => {
      const pinned = win(kid(), 'tulips-three', TULIP_PROG).model;
      const home = runScript(BRING_HOME_SCRIPT, { model: pinned });
      expect([home.freed, home.found]).toEqual(['tulips-three', true]);
      expect(home.model.island.plots['tulips-three']).toEqual({ program: null, robotId: '', wonAt: 1759000000000 });
      expect(home.model.island.done).toEqual(['tulips-three']);
      expect(helper<string>(SAVE_HELPERS, 'plotOfRobot', home.model.island, 'r1')).toBe('');
      expect(runScript(BRING_HOME_SCRIPT, { model: home.model }).freed).toBe('');
      // Through the code and back, the brought-home plot is the same.
      const code = runScript(ENCODE_SAVE_SCRIPT, { model: home.model }).code;
      expect(runScript(DECODE_SAVE_SCRIPT, { code }).model).toEqual(home.model);
    });

    it('a robot pinned to two plots (a hand-edited save) keeps the one won last; a robot the island does not have pins nothing; `free` is never a plot', () => {
      const raw = { v: 4, profiles: [{ id: 'p', name: 'A', island: { done: ['a', 'b'], robots: [{ id: 'r1' }, { id: 'r2' }, 'r2', { id: '' }], plots: { a: { program: [{ id: 1, t: 'fwd' }], robotId: 'r1', wonAt: 5 }, b: { program: [{ id: 1, t: 'left' }], robotId: 'r1', wonAt: 9 }, c: { program: [{ id: 1, t: 'fwd' }], robotId: 'r7', wonAt: 1 }, free: { program: [{ id: 1, t: 'fwd' }], robotId: 'r2', wonAt: 1 } } } }], island: { activeId: 'p' } };
      const m = helper<any>(SAVE_HELPERS, 'modelOf', raw);
      expect(m.island.robots).toEqual([{ id: 'r1' }, { id: 'r2' }]);
      expect(Object.keys(m.island.plots).sort()).toEqual(['a', 'b', 'c']);
      expect([m.island.plots.a.robotId, m.island.plots.b.robotId, m.island.plots.c.robotId]).toEqual(['', 'r1', '']);
    });

    describe('arms: each v4 rule mutated, and the row that kills it', () => {
      const mutate = (script: string, from: string, to: string) => {
        if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
        return script.replace(from, to);
      };
      it('Complete request leaves the robot on its old plot → the one-plot-per-robot row fails', () => {
        const m = mutate(COMPLETE_REQUEST_SCRIPT, "if (other !== requestId && p.island.plots[other].robotId === robotId) p.island.plots[other].robotId = '';", '{}');
        const first = runScript(m, { model: kid(), requestId: 'tulips-three', program: TULIP_PROG, now: 1 }).model;
        const twice = runScript(m, { model: first, requestId: 'path-stones', program: STONE_PROG, now: 2 }).model;
        // modelOf's own guard still unpins the older one on the NEXT read; the script's own output has both pinned.
        expect([twice.island.plots['tulips-three'].robotId, twice.island.plots['path-stones'].robotId]).toEqual(['r1', 'r1']);
      });
      it('Bring home keeps the program → the bring-home row fails', () => {
        const m = mutate(BRING_HOME_SCRIPT, '{ program: null, robotId: \'\', wonAt', '{ program: p.island.plots[freed].program, robotId: \'\', wonAt');
        expect(runScript(m, { model: win(kid(), 'tulips-three', TULIP_PROG).model }).model.island.plots['tulips-three'].program).toEqual(TULIP_PROG);
      });
      it('decode ignores a v4 row’s plots → the round-trip row fails', () => {
        const m = mutate(DECODE_SAVE_SCRIPT, 'var island = v4 ? { done: a[12], plots: plots, robots: robots }', 'var island = v4 ? { done: a[12] }');
        const model = win(kid(), 'tulips-three', TULIP_PROG).model;
        expect(runScript(m, { code: runScript(ENCODE_SAVE_SCRIPT, { model }).code }).model).not.toEqual(model);
      });
      it('migrationDue stops at v3 → the stored-v3 row fails', () => {
        const m = mutate(SAVE_HELPERS, '!(Number(raw.v) >= SAVE_VERSION);\n}', '!(Number(raw.v) >= 3);\n}');
        expect(helper<boolean>(m, 'migrationDue', { v: 3, profiles: [{ id: 'p' }] })).toBe(false);
      });
    });
  });

  describe('IG-004 AC4 — the island’s content: every plot inside it, no two overlapping, the ruled size (R9); fails here, so it fails at generate time', () => {
    const problems = (requests: ReadonlyArray<any> = REQUESTS, freePlot = FREE_PLAY_PLOT) =>
      islandProblems({ requests, freePlot, homePlot: ISLAND_HOME_PLOT, base: ISLAND_BASE, w: ISLAND_W, h: ISLAND_H, plotW: PLOT_W, plotH: PLOT_H });

    it('🔴 every request has a plot inside the island; no two plots (free play and home too) overlap; every slot of the base is exactly one plot', () => {
      expect(problems()).toEqual([]);
      for (const r of REQUESTS) expect({ id: r.id, plot: Number.isInteger(r.plot?.x) && Number.isInteger(r.plot?.y) }).toEqual({ id: r.id, plot: true });
      // One plot per request (R9), plus free play; home is a spare slot, and (P108 R6) so is every meadow.
      const slots = ISLAND_BASE.join('').split('.').length - 1;
      expect(slots).toBe((REQUESTS.length + 1) * PLOT_W * PLOT_H);
      const meadows = 6 * 3 - REQUESTS.length - 2;
      const meadowTiles = ISLAND_MEADOW_MAP.join('');
      let found = 0;
      for (let sy = 1; sy + PLOT_H < ISLAND_H; sy += PLOT_H + 1) for (let sx = 1; sx + PLOT_W < ISLAND_W; sx += PLOT_W + 1) if (ISLAND_BASE.slice(sy, sy + PLOT_H).map((r) => r.slice(sx, sx + PLOT_W)).join('') === meadowTiles) found++;
      expect({ meadows: found }).toEqual({ meadows });
    });

    it('R9, widened by P108 R6: 55 × 22 (six columns of three rows), each islander’s plots side by side in one row', () => {
      expect([ISLAND_W, ISLAND_H, ISLAND_W * ISLAND_H]).toEqual([55, 22, 1210]);
      expect(ISLAND_W).toBeLessThanOrEqual(55);
      expect(ISLAND_H).toBeLessThanOrEqual(22);
      for (const who of ['mamie', 'sami', 'biscuit']) expect({ who, rows: [...new Set(REQUESTS.filter((r) => r.islander === who).map((r) => r.plot.y))] }).toEqual({ who, rows: [REQUESTS.find((r) => r.islander === who)!.plot.y] });
    });

    it('🔴 the stamped island (Logic/Island world) is ISLAND_W × ISLAND_H, every request’s map where its plot says, free play’s and home’s in theirs', () => {
      const out = runScript(ISLAND_WORLD_SCRIPT, { requests: JSON.parse(JSON.stringify(REQUESTS)), plots: {}, done: [], band: 2, robots: [{ id: 'r1' }], pins: [] });
      const rows: string[] = out.world.map;
      expect([rows.length, rows.every((r) => r.length === ISLAND_W), rows.join('').length]).toEqual([ISLAND_H, true, ISLAND_W * ISLAND_H]);
      const at = (p: { x: number; y: number }) => rows.slice(p.y, p.y + PLOT_H).map((r) => r.slice(p.x, p.x + PLOT_W));
      for (const r of REQUESTS) expect({ id: r.id, map: at(r.plot) }).toEqual({ id: r.id, map: [...r.map] });
      expect(at(FREE_PLAY_PLOT)).toEqual(FREE_PLAY.map);
      expect(at(ISLAND_HOME_PLOT)).toEqual([...ISLAND_HOME_MAP]);
      expect(rows.join('')).not.toContain('.');
      expect(out.cards.map((c: any) => c.id)).toEqual([...REQUESTS.map((r) => r.id), 'free']);
    });

    describe('arms: a bad plot, and the check that names it', () => {
      const moved = (id: string, plot: { x: number; y: number } | undefined) => REQUESTS.map((r) => (r.id === id ? { ...r, plot } : r));
      it('a plot moved onto its neighbour → both named, and the slot it left is named', () => {
        const p = problems(moved('tulips-three', { x: 5, y: 1 }));
        expect(p).toContain('tulip-door and tulips-three overlap');
        expect(p.some((x) => /slot tile 1[0-7],1 is under 0 plots/.test(x))).toBe(true);
      });
      it('a plot off the edge → named; free play on home → named; a request with no plot → named', () => {
        expect(problems(moved('mamie-note', { x: 50, y: 1 }))).toContain('mamie-note’s plot (50, 1) is not inside the 55 × 22 island'.replace('’', "'"));
        expect(problems(REQUESTS, ISLAND_HOME_PLOT)).toContain('free and home overlap');
        expect(problems(moved('bowl-if', undefined))).toContain('bowl-if has no plot');
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
    it('the tulip request (IG-002: fetch and return) ends at 1,4 facing the pond; a tap there hits, a tap beside it misses', () => {
      const r = REQUESTS.find((x) => x.id === 'tulips-three')!;
      const p = runScript(PREDICT_END_SCRIPT, { program: r.referenceProgram, world: worldOfRequest(r), robotId: 'pip' });
      expect({ x: p.x, y: p.y, d: p.d, known: p.known, asked: p.asked, hit: p.hit }).toEqual({ x: 1, y: 4, d: 3, known: true, asked: false, hit: false });
      expect(runScript(PREDICT_END_SCRIPT, { program: r.referenceProgram, world: worldOfRequest(r), robotId: 'pip', tapX: 1, tapY: 4 })).toMatchObject({ asked: true, hit: true });
      expect(runScript(PREDICT_END_SCRIPT, { program: r.referenceProgram, world: worldOfRequest(r), robotId: 'pip', tapX: 2, tapY: 4 })).toMatchObject({ asked: true, hit: false });
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

  describe('IG-001 (P106 s1) — D6 what Olive said is spoken; D7 the sensor the picker offers', () => {
    it('🔴 D6: an answer is spoken on the tick that consumes it (sayText, olive style); `say` carries its word key, plain', () => {
      const w = MOCKUP_WORLD();
      const program: Block[] = [{ id: 1, t: 'olive:say-thanks' as BlockType, slots: { to: 'Mamie Rose', deed: 'watered her three tulips' } }, { id: 2, t: 'say', slots: { text: 'thanksMamie' } }, { id: 3, t: 'say' }];
      const run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang: 'en' }).run;
      let t = tick(run, w);
      expect([t.st.waiting, t.st.sayText, t.st.sayStyle]).toEqual([true, '', '']);
      t = tick(t.run, t.world, { seq: t.st.request.seq, ok: true, text: 'Thank you, Mamie Rose!' });
      expect([t.st.delta.sayText, t.st.delta.sayStyle, t.st.sayText, t.st.sayStyle, t.st.sayKey]).toEqual(['Thank you, Mamie Rose!', 'olive', 'Thank you, Mamie Rose!', 'olive', '']);
      // The next tick says nothing of Olive's; `say` speaks its word key, plain — and the block with no text its default.
      t = tick(t.run, t.world);
      expect([t.st.delta.sayKey, t.st.delta.sayStyle, t.st.sayKey, t.st.sayText]).toEqual(['thanksMamie', 'plain', 'thanksMamie', '']);
      t = tick(t.run, t.world);
      expect([t.st.delta.sayKey, t.st.delta.say.text]).toEqual(['thanksMamie', 'thanksMamie']);
      // The written (fallback) answer is spoken too.
      let c = tick(runScript(NEW_RUN_SCRIPT, { program: program.slice(0, 1), robotId: 'pip', lang: 'fr' }).run, w);
      c = tick(c.run, c.world, { seq: c.st.request.seq, ok: false, fallback: true, text: 'Merci beaucoup, Mamie Rose !' });
      expect([c.st.sayText, c.st.sayStyle]).toEqual(['Merci beaucoup, Mamie Rose !', 'olive']);
      // IG-006: no rung ships a blocks shape any more, so no Olive block can propose blocks.
      expect(Object.values(OLIVE_TABLE.rungs).map((r: any) => r.shape)).not.toContain('blocks');
    });

    it('🔴 D7: the picker’s sensor "Olive says yes / no" (olive_says:yes, olive_says:no) reads the last answer; an `if` on it runs its body only when she said so', () => {
      const w = MOCKUP_WORLD();
      const d0 = w.robots[0].d as number;
      const prog = (arg: string): Block[] => [{ id: 1, t: 'olive:is-it-a' as BlockType, slots: { kind: 'a flower' } }, { id: 2, t: 'if', slots: { sensor: 'olive_says:' + arg }, body: [{ id: 3, t: 'left' }] }];
      for (const [said, arg, turned] of [['yes', 'yes', true], ['no', 'yes', false], ['no', 'no', true], ['oui', 'yes', true], ['non', 'no', true], ['yes', 'no', false]] as const) {
        const end = runToEnd(prog(arg), w, 'pip', 'en', [{ ok: true, value: said }]);
        expect({ said, arg, done: end.done, d: end.world.robots[0].d }).toEqual({ said, arg, done: true, d: turned ? (d0 + 3) % 4 : d0 });
      }
      // Sense reads the same spelling, and the older one (sensor olive_says with an arg) still works.
      expect(runScript(SENSE_SCRIPT, { world: w, sensor: 'olive_says:yes', robotId: 'pip', answer: { value: 'yes' } }).value).toBe(true);
      expect(runScript(SENSE_SCRIPT, { world: w, sensor: 'olive_says:no', robotId: 'pip', answer: { value: 'yes' } }).value).toBe(false);
      expect(runScript(SENSE_SCRIPT, { world: w, sensor: 'olive_says', arg: 'no', robotId: 'pip', answer: { value: 'no' } }).value).toBe(true);
      expect(runScript(SENSE_SCRIPT, { world: w, sensor: 'olive_says:yes', robotId: 'pip', answer: null }).value).toBe(false);
    });
  });

  describe('IG-002 (P106 s2) — resources: the can is filled at the pond, stones come out of a rock, the load is carried', () => {
    const TULIPS = () => REQUESTS.find((r) => r.id === 'tulips-three')!;
    const STONES = () => REQUESTS.find((r) => r.id === 'path-stones')!;
    /** A pond at 0,0; the robot at 1,0 facing it; a dry tulip at 2,0 and another at 2,1. */
    const pond = (can: unknown, extra: Record<string, unknown> = {}) => ({
      map: ['WGF', 'GGF'],
      things: [
        { kind: 'tulip', x: 2, y: 0, watered: false },
        { kind: 'tulip', x: 2, y: 1, watered: false }
      ],
      robots: [{ id: 'pip', x: 1, y: 0, d: 3, can, ...extra }]
    });
    /** A rock of four on grass at 1,0; the robot at 0,0 facing it. */
    const quarry = (extra: Record<string, unknown> = {}, rock: Record<string, unknown> = { kind: 'rock', x: 1, y: 0, left: 4 }) => ({
      map: ['GGG', 'GGG'],
      things: [rock],
      robots: [{ id: 'pip', x: 0, y: 0, d: 1, ...extra }]
    });
    const refCount = (r: GardenRequest) => helper<number>(ENGINE, 'countBlocks', [...r.referenceProgram]);

    it('🔴 fill at the pond fills the can to canMax (a robot field, default 3); with no water ahead it is a no-op, never a bump', () => {
      const full = runToEnd(parse('K'), pond(0));
      expect(full.world.robots[0].can).toBe(3);
      expect(full.deltas[0]).toMatchObject({ fill: { id: 'pip', x: 0, y: 0 }, can: { id: 'pip', can: 3 }, sayKey: 'sayFill' });
      expect(runToEnd(parse('K'), pond(0, { canMax: 5 })).world.robots[0].can).toBe(5);
      expect(runToEnd(parse('K'), pond(2)).world.robots[0].can).toBe(3);
      // A robot with no can gets one at the pond: the can is a field, not a request setting.
      expect(runToEnd(parse('K'), pond(null)).world.robots[0].can).toBe(3);
      // Facing the tulip, not the pond: nothing happens, no bump, the can as it was.
      const miss = runToEnd(parse('L L K'), pond(1));
      const last = miss.deltas[2];
      expect([last.nothing, last.bump, last.fill, miss.run.bumps, miss.world.robots[0].can]).toEqual([true, undefined, undefined, 0, 1]);
      // WORDS carries both the band 10–12 word and the band 7–9 caption, EN and FR.
      for (const k of ['bFill', 'cFill', 'sayFill', 'sayDry', 'sCanEmpty']) expect({ k, en: !!WORDS[k]?.en, fr: !!WORDS[k]?.fr, differ: WORDS[k]?.en !== WORDS[k]?.fr }).toEqual({ k, en: true, fr: true, differ: true });
    });

    it('🔴 water spends one; three waters then a fourth on a dry tulip leaves it dry and raises dry (no puddle); a robot with no can waters for free', () => {
      const program = parse('K L L W W W R F L W');
      const end = runToEnd(program, pond(0));
      const cans = end.deltas.filter((d) => d.can).map((d) => d.can.can);
      expect(cans).toEqual([3, 2, 1, 0]);
      const dry = end.deltas.filter((d) => d.dry);
      expect(dry).toEqual([expect.objectContaining({ dry: { id: 'pip', x: 2, y: 1 }, sayKey: 'sayDry' })]);
      expect(end.world.things.find((t: any) => t.x === 2 && t.y === 1)).toEqual({ kind: 'tulip', x: 2, y: 1, watered: false });
      expect([end.run.dries, end.run.puddles, end.run.bumps, end.world.things.filter((t: any) => t.kind === 'puddle').length]).toEqual([1, 0, 0, 0]);
      expect(end.world.robots[0].can).toBe(0);
      // The known-firing control: a robot with no can (and no fill, which would give it one) waters the second tulip.
      const free = runToEnd(parse('L L W W W R F L W'), pond(null));
      expect([free.run.dries, free.world.things.every((t: any) => t.watered)]).toEqual([0, true]);
      expect(free.deltas.some((d) => d.can)).toBe(false);
      // A puddle is still the error message when the can is not empty — and that pour spends one too.
      const wet = runToEnd(parse('L W'), pond(2));
      expect([wet.run.puddles, wet.world.robots[0].can]).toEqual([1, 1]);
      // The hint names it: dry, not "not quite yet".
      const chosen = runScript(CHOOSE_HINT_SCRIPT, { world: end.world, program, run: end.run, goalMet: false });
      expect(chosen.key).toBe('hintDry');
      // On the tulips request itself: forgetting the pond leaves the tulip dry.
      const forgot = runToEnd(parse('L L F W'), worldOfRequest(TULIPS()));
      expect([forgot.run.dries, forgot.world.things[0].watered]).toEqual([1, false]);
    });

    it('🔴 the sensor "the can is empty": true at 0, false with water in it, false for a robot with no can', () => {
      const sense = (can: unknown) => runScript(SENSE_SCRIPT, { world: pond(can), robotId: 'pip', sensor: 'can_empty' }).value;
      expect([sense(0), sense(2), sense(null), sense(undefined)]).toEqual([true, false, false, false]);
    });

    it('🔴 pick on a rock of 4 × 4 fills the basket and the rock shrinks to nothing; the fifth pick there is a bump with nothing carried', () => {
      let run = runScript(NEW_RUN_SCRIPT, { program: parse('P P P P P'), robotId: 'pip', lang: 'en' }).run;
      let world: any = quarry({ basket: 4 });
      const seen: unknown[] = [];
      for (let i = 0; i < 5; i++) {
        const t = tick(run, world);
        run = t.run;
        world = t.world;
        const rock = world.things.find((x: any) => x.kind === 'rock');
        seen.push({ left: rock ? rock.left : null, carry: world.robots[0].carry.length, bump: !!t.st.delta.bump });
      }
      expect(seen).toEqual([
        { left: 3, carry: 1, bump: false },
        { left: 2, carry: 2, bump: false },
        { left: 1, carry: 3, bump: false },
        { left: null, carry: 4, bump: false },
        { left: null, carry: 4, bump: true }
      ]);
      expect(world.robots[0].carry).toEqual(['stone', 'stone', 'stone', 'stone']);
      expect(world.spent).toEqual(['1,0']);
      expect([run.rockGone, run.bumps]).toEqual([1, 1]);
      // (Where repeat is allowed, five picks in a row are the fold nudge first — the ladder's design; not here.)
      expect(runScript(CHOOSE_HINT_SCRIPT, { world, program: parse('P P P P P'), run, goalMet: false, allowed: ['pick', 'put'] }).key).toBe('hintRockGone');
      // With room in the basket the fifth pick is the same bump: the rock is gone, not the basket full.
      const roomy = runToEnd(parse('P P P P P'), quarry({ basket: 6 }));
      expect([roomy.world.robots[0].carry.length, roomy.run.rockGone]).toEqual([4, 1]);
      // The basket bounds stones as it bounds letters: two picks, and the third leaves the rock at two.
      const small = runToEnd(parse('P P P'), quarry({ basket: 2 }));
      expect([small.world.robots[0].carry.length, small.world.things[0].left, small.deltas[2].nothing, small.run.bumps]).toEqual([2, 2, true, 0]);
      // A pick at an empty tile where no rock ever was is still nothing (not a bump): eggs, letters, the rest as before.
      expect(runToEnd(parse('L P'), quarry()).deltas[1].nothing).toBe(true);
      // The map's R tile is decoration: it yields nothing.
      const tile = runToEnd(parse('P'), { map: ['GR'], things: [], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] });
      expect([tile.world.robots[0].carry, tile.deltas[0].nothing]).toEqual([[], true]);
    });

    it('🔴 a rock and a sign block a move like a tulip; a note does not; a used-up rock no longer blocks', () => {
      expect(runToEnd(parse('F'), quarry()).world.robots[0]).toMatchObject({ x: 0, y: 0 });
      expect(runToEnd(parse('F'), quarry()).run.bumps).toBe(1);
      expect(runToEnd(parse('P P P P F'), quarry()).world.robots[0]).toMatchObject({ x: 1, y: 0 });
      expect(runToEnd(parse('F'), quarry({}, { kind: 'sign', x: 1, y: 0, text: 'Tulips this way' })).world.robots[0]).toMatchObject({ x: 0, y: 0 });
      expect(runToEnd(parse('F'), quarry({}, { kind: 'note', x: 1, y: 0, text: 'The red ones' })).world.robots[0]).toMatchObject({ x: 1, y: 0 });
      // put never lays a stone on a rock.
      expect(runToEnd(parse('D'), quarry({ carry: ['stone'] })).deltas[0].nothing).toBe(true);
    });

    it('🔴 hintDry and hintRockGone: a line in EN and FR, the EN dry line the task file’s own', () => {
      expect(HINTS.hintDry.en).toBe('The can is empty. Where is the pond?');
      for (const key of ['hintDry', 'hintRockGone'])
        for (const lang of ['en', 'fr'] as const) {
          const line = runScript(HINT_LINE_SCRIPT, { hints: HINT_ROWS, key, lang, vars: {}, botName: 'Pip' });
          expect({ key, lang, found: line.found, braces: /[{}]/.test(line.text), text: line.text.length > 10 }).toEqual({ key, lang, found: true, braces: false, text: true });
        }
      expect(HINTS.hintRockGone.en).toContain('{b}');
    });

    it('🔴 AC2: the recorded tulips dance folds to repeat 3 with the nine-block body, in both bands (offered at 10–12 only, as every fold)', () => {
      const r = TULIPS();
      const dance = 'K L L F W R F R F';
      const recording = parse([dance, dance, dance].join(' '));
      expect(recording).toHaveLength(27);
      expect(shape(recording)).toEqual(shape(unrolled(r.referenceProgram)));
      for (const band of [1, 2]) {
        const found = runScript(FIND_REPEAT_SCRIPT, { program: recording, band, allowed: [...r.palette] });
        expect({ band, found: found.found, i: found.i, len: found.len, count: found.count, cover: found.cover, offer: found.offer }).toEqual({ band, found: true, i: 0, len: 9, count: 3, cover: 27, offer: band === 2 });
      }
      const found = runScript(FIND_REPEAT_SCRIPT, { program: recording, band: 2, allowed: [...r.palette] });
      const folded = runScript(FOLD_SCRIPT, { program: recording, i: found.i, len: found.len, count: found.count, containerId: found.containerId });
      expect(folded.program).toHaveLength(1);
      expect(shape(folded.program)).toEqual(shape(r.referenceProgram));
      const end = runToEnd(folded.program, worldOfRequest(r));
      expect(runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program: folded.program, goal: r.goal }).met).toBe(true);
      // The task file's written dance (fill fwd fwd water left left fwd fwd right right) cannot run: after fill the pond
      // is ahead, so its first forward is a bump. The measurement behind the geometry above (task file §7, deviation 1).
      const written = runToEnd(parse('r3[K F F W L L F F R R]'), worldOfRequest(r));
      expect(written.deltas.find((d) => d.op === 'fwd')).toMatchObject({ bump: { x: 0, y: 1 } });
    });

    it('🔴 AC3: tulips and path-stones win with their reference program in EN and FR, both bands, and say hintPerfect at 10–12', () => {
      for (const r of [TULIPS(), STONES()]) {
        for (const band of [1, 2]) {
          for (const lang of ['en', 'fr']) {
            const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
            const end = runToEnd(program, worldOfRequest(r), 'pip', lang);
            const g = runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program, goal: r.goal });
            expect({ id: r.id, band, lang, met: g.met, bumps: end.run.bumps, dries: end.run.dries, puddles: end.run.puddles }).toEqual({ id: r.id, band, lang, met: true, bumps: 0, dries: 0, puddles: 0 });
            const key = runScript(CHOOSE_HINT_SCRIPT, { world: end.world, program, run: end.run, goalMet: true, allowed: [...r.palette], referenceCount: refCount(r) }).key;
            // Band 7–9 has no repeat block, so its program is the unrolled one (longer than the reference): the fold nudge
            // (pre-existing; Choose hint knows no band). At 10–12 the reference is Perfect, however many blocks it has.
            if (band === 2) expect({ id: r.id, lang, key }).toEqual({ id: r.id, lang, key: 'hintPerfect' });
            if (band === 2) expect(runScript(HINT_LINE_SCRIPT, { hints: HINT_ROWS, key, lang, vars: {}, botName: 'Pip' }).text).toBe(HINTS.hintPerfect[lang as 'en' | 'fr']);
          }
        }
      }
      // The tulips' reference is ten blocks, over MANY_BLOCKS: Perfect outranks "done with many" when it IS the reference.
      expect(refCount(TULIPS())).toBeGreaterThan(MANY_BLOCKS);
      // The consequence in the world: three tulips watered, the can left with two; four stones laid, the rock gone.
      const t = runToEnd(TULIPS().referenceProgram, worldOfRequest(TULIPS()));
      expect([t.world.things.filter((x: any) => x.watered).length, t.world.robots[0].can]).toEqual([3, 2]);
      const st = runToEnd(STONES().referenceProgram, worldOfRequest(STONES()));
      expect([st.world.things.filter((x: any) => x.kind === 'stone').length, st.world.things.some((x: any) => x.kind === 'rock'), st.world.robots[0].carry]).toEqual([4, false, []]);
      // Path-stones starts with an EMPTY basket and a rock of four beside the start.
      expect([STONES().robotStart.carry ?? [], STONES().things]).toEqual([[], [{ kind: 'rock', x: 2, y: 2, left: 4 }]]);
      expect([TULIPS().robotStart.can, TULIPS().robotStart.canMax]).toEqual([0, 3]);
    });

    it('the palette carries fill where a request allows it, labelled in both bands; the other requests keep their R tiles as decoration', () => {
      const pal = (band: number, allowed: ReadonlyArray<string>) => runScript(PALETTE_SCRIPT, { band, words: WORD_ROWS, lang: 'en', allowed: [...allowed] }).palette.map((p: any) => p.id);
      expect(pal(1, TULIPS().palette)).toContain('fill');
      expect(pal(2, TULIPS().palette)).toContain('fill');
      expect(pal(2, STONES().palette)).toEqual(['fwd', 'left', 'right', 'pick', 'put', 'repeat']);
      // rock-flower (IG-006) places rocks as the things Olive is asked about; its palette has no pick, so none is mined.
      const ROCKS_ON_PURPOSE = ['path-stones', 'rock-flower'];
      expect(REQUESTS.find((r) => r.id === 'rock-flower')?.palette).not.toContain('pick');
      for (const r of REQUESTS) if (!ROCKS_ON_PURPOSE.includes(r.id)) expect({ id: r.id, rocks: r.things.filter((x) => x.kind === 'rock').length }).toEqual({ id: r.id, rocks: 0 });
    });
  });

  describe('P106 s3 lane F (a) — the fold nudge never offers a run the reference does not hold, press by press', () => {
    /** The body of every repeat in a program, as shapes: what an offered fold may be. */
    const repeatBodies = (list: ReadonlyArray<Block>, out: string[] = []): string[] => {
      for (const b of list) {
        if (b.t === 'repeat') out.push(JSON.stringify(shape(b.body ?? [])));
        if (b.body) repeatBodies(b.body, out);
      }
      return out;
    };

    it('🔴 every request with a repeat, its reference recorded one press at a time: every fold offered and every "do this n times" is one of its own repeats', () => {
      let asked = 0;
      for (const r of REQUESTS) {
        if (!r.palette.includes('repeat')) continue;
        const recording = unrolled(r.referenceProgram);
        const bodies = repeatBodies(r.referenceProgram);
        for (let p = 1; p <= recording.length; p++) {
          const program = recording.slice(0, p);
          const found = runScript(FIND_REPEAT_SCRIPT, { program, band: 2, allowed: [...r.palette] });
          const hint = runScript(CHOOSE_HINT_SCRIPT, { program, allowed: [...r.palette] }).key;
          if (!found.offer && hint !== 'hintPattern') continue;
          asked++;
          const body = JSON.stringify(shape(program.slice(found.i, found.i + found.len)));
          expect({ id: r.id, press: p, hint, body: bodies.includes(body) ? 'the reference’s' : body }).toEqual({ id: r.id, press: p, hint, body: 'the reference’s' });
        }
      }
      // Known-firing beside the absence: the nudge still fires where the reference has a repeat (65 presses measured before, s3).
      expect(asked).toBeGreaterThan(40);
    });

    it('🔴 the tulips dance: nothing offered from the first dance to the second, the nine-block body at the second, ×3 at the third', () => {
      const r = REQUESTS.find((x) => x.id === 'tulips-three')!;
      const recording = unrolled(r.referenceProgram);
      const body = r.referenceProgram[0].body!.length;
      const at = (p: number) => runScript(FIND_REPEAT_SCRIPT, { program: recording.slice(0, p), band: 2, allowed: [...r.palette] });
      // The first dance ends in right, forward, right, forward: a run seen twice that does not start the list is held back.
      for (let p = body; p < body * 2; p++) {
        expect({ press: p, offer: at(p).offer }).toEqual({ press: p, offer: false });
        expect({ press: p, hint: runScript(CHOOSE_HINT_SCRIPT, { program: recording.slice(0, p), allowed: [...r.palette] }).key }).not.toEqual({ press: p, hint: 'hintPattern' });
      }
      expect([at(body * 2).offer, at(body * 2).i, at(body * 2).len, at(body * 2).count]).toEqual([true, 0, body, 2]);
      expect([at(body * 3).offer, at(body * 3).i, at(body * 3).len, at(body * 3).count]).toEqual([true, 0, body, 3]);
      // A run seen twice FROM the start is still the child's own loop, and a third time anywhere is too.
      expect(runScript(FIND_REPEAT_SCRIPT, { program: parse('K L R F R F'), band: 2 }).offer).toBe(false);
      expect(runScript(FIND_REPEAT_SCRIPT, { program: parse('K L R F R F R F'), band: 2 })).toMatchObject({ offer: true, i: 2, len: 2, count: 3 });
      expect(runScript(FIND_REPEAT_SCRIPT, { program: parse('R F R F K L'), band: 2 })).toMatchObject({ offer: true, i: 0, len: 2, count: 2 });
    });
  });

  describe('IG-003 (P106 s3) — Drive · Teach · Play: no leftover hint after a reset; the Predict challenge on two requests', () => {
    const world = () => MOCKUP_WORLD();
    /** The run the Runner holds after Stop (IG-001 D2): an empty program's fresh run, tick 0. */
    const emptied = () => runScript(NEW_RUN_SCRIPT, { program: [], robotId: 'me', lang: 'en' }).run;

    it('🔴 AC5: a goal met with no run behind it is not a win — after a reset the first hint is hintEmpty, the pattern hint or the start, never the last run’s line', () => {
      // The Workshop's Goal met keeps its last answer until the next run finishes; Teach empties the run and asks again.
      const after = (program: ReadonlyArray<Block>) => runScript(CHOOSE_HINT_SCRIPT, { world: world(), program, run: emptied(), goalMet: true, referenceCount: 3 }).key;
      expect(after([])).toBe('hintEmpty');
      expect(after(parse('F F F F'))).toBe('hintPattern');
      expect(after(parse('F L'))).toBe('hintStart');
      // Known-firing: the same program with the run that met it is a win.
      const ran = { ...emptied(), tick: 3 };
      expect(runScript(CHOOSE_HINT_SCRIPT, { world: world(), program: parse('F L'), run: ran, goalMet: true, referenceCount: 3 }).key).toBe('hintPerfect');
    });

    it('🔴 R5: the challenge is on the tulips and on sami-thanks only — the one IG-006 request whose end tile never depends on what Olive answers', () => {
      expect(REQUESTS.filter((r) => r.challenge === 'predict').map((r) => r.id).sort()).toEqual(['sami-thanks', 'tulips-three']);
      for (const r of REQUESTS) expect({ id: r.id, c: r.challenge === undefined || r.challenge === 'predict' }).toEqual({ id: r.id, c: true });
      // The challenge predicts with Predict end (every ask takes the fallback); the run the child watches gets the stub
      // Olive's scripted answers. On sami-thanks the Olive block is a thank-you: it never moves the robot, so the two ends
      // agree for the reference program and for the same blocks with the thank-you moved to the front.
      const thanks = REQUESTS.find((r) => r.id === 'sami-thanks')!;
      const stub = [{ ok: true, text: 'Thank you, Mamie Rose! (stub)' }];
      const olive = thanks.referenceProgram.find((b) => String(b.t).startsWith('olive:'))!;
      for (const program of [thanks.referenceProgram, [olive, ...thanks.referenceProgram.filter((b) => b !== olive)]]) {
        const p = runScript(PREDICT_END_SCRIPT, { program, world: worldOfRequest(thanks), robotId: 'pip' });
        const real = runToEnd(program, worldOfRequest(thanks), 'pip', 'en', stub);
        expect({ x: p.x, y: p.y, known: p.known }).toEqual({ x: real.world.robots[0].x, y: real.world.robots[0].y, known: true });
      }
      // Why not Mamie's note: a program that goes one step further when Olive read the red tulip ends on another tile
      // with her real answer than with the fallback the prediction takes.
      const note = REQUESTS.find((r) => r.id === 'mamie-note')!;
      const readThenGo: Block[] = [{ id: 1, t: 'olive:read' as BlockType }, { id: 2, t: 'if', slots: { sensor: 'olive_read:red_tulip' }, body: [{ id: 3, t: 'fwd' }] }];
      const guess = runScript(PREDICT_END_SCRIPT, { program: readThenGo, world: worldOfRequest(note), robotId: 'pip' });
      const seen = runToEnd(readThenGo, worldOfRequest(note), 'pip', 'en', [{ ok: true, value: 'red tulip' }]);
      expect(guess.x).not.toBe(seen.world.robots[0].x);
    });
  });

  describe('IG-005 (P106 s4) — robots for the job: a palette per robot, lent by islanders, upgrades, the save with three robots', () => {
    const req = (id: string) => REQUESTS.find((r) => r.id === id)!;
    const spec = (k: string) => ROBOTS.find((r) => r.id === k)!;
    const pal = (band: 1 | 2, r: GardenRequest, robot: unknown, extra: Record<string, unknown> = {}) =>
      runScript(PALETTE_SCRIPT, { band, words: WORD_ROWS, lang: 'en', allowed: r.palette, rungs: r.rungs ?? [], robot, needs: needsOf(r), ...extra });
    const kid = (lang = 'en', band = 2) => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band, lang, robotName: 'Pip' }).model;
    const win = (model: any, id: string, extra: Record<string, unknown> = {}) =>
      runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.parse(JSON.stringify(req(id).referenceProgram)), now: 1759100000000, ...extra });
    const rows = (model: any) => helper<any[]>(SAVE_HELPERS, 'robotRowsOf', model.profiles[0]);

    it('🔴 AC1: band 7–9 × tulips × Pip is fwd left right water fill; × path-stones × Cobble is fwd left right pick put; Cobble on the tulips is refused', () => {
      expect(pal(1, req('tulips-three'), spec('pip')).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'water', 'fill']);
      expect(pal(1, req('path-stones'), spec('cobble')).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'pick', 'put']);
      const refused = pal(1, req('tulips-three'), spec('cobble'));
      expect([refused.refused, refused.count, refused.palette]).toEqual([true, 0, []]);
      // Known-firing beside the refusal: the same robot on its own job is not refused; a kind name works as a robot too.
      expect(pal(1, req('path-stones'), 'cobble').refused).toBe(false);
      expect(pal(2, req('tulips-three'), spec('pip')).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'water', 'fill', 'repeat']);
      // The robot narrows the request. P108 IW-003 (s3 base, D9): every robot has hands now, so Pip on the stones' list
      // keeps pick and put; the narrowing is shown by Olive's blocks below (and water/fill/say, each a robot's own).
      expect(pal(2, req('path-stones'), spec('pip'), { needs: '' }).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'pick', 'put', 'repeat']);
      // Echo carries Olive's blocks as a PALETTE choice: Pip (read only) on the flowers loses is it a…?; Echo keeps it.
      const olive = (robot: string) => pal(2, req('rock-flower'), spec(robot), { needs: '' }).palette.map((p: any) => p.id).filter((id: string) => id.startsWith('olive:'));
      expect([olive('pip'), olive('echo')]).toEqual([[], ['olive:is-it-a']]);
      // No robot (free play): nothing filtered, as before IG-005.
      expect(runScript(PALETTE_SCRIPT, { band: 2, words: WORD_ROWS, lang: 'en' }).count).toBe(BAND_PALETTE[2].length);
    });

    it('🔴 every request, every band it allows: its robot is a robot of the catalogue and can place every block of the reference program', () => {
      for (const r of REQUESTS) {
        const kind = needsOf(r);
        expect({ id: r.id, kind, known: !!ROBOTS.find((x) => x.id === kind) }).toEqual({ id: r.id, kind, known: true });
        for (const band of [1, 2] as const) {
          if (band < r.band) continue;
          const program = band === 1 ? unrolled(r.referenceProgram) : r.referenceProgram;
          const ids = new Set<string>(pal(band, r, spec(kind)).palette.map((p: any) => p.id));
          for (const t of typesIn(program)) expect({ id: r.id, band, block: t, placeable: ids.has(t) }).toEqual({ id: r.id, band, block: t, placeable: true });
        }
      }
    });

    it('🔴 the lending chain has no loop: at each band, starting with Pip, every robot a request needs is lent by a request some owned robot can win', () => {
      for (const band of [1, 2] as const) {
        const owned = new Set<string>(['pip']);
        let grew = true;
        while (grew) {
          grew = false;
          for (const r of REQUESTS) if (r.band <= band && owned.has(needsOf(r))) for (const x of ROBOTS) if (x.unlockedBy === r.id && !owned.has(x.id)) { owned.add(x.id); grew = true; }
        }
        for (const r of REQUESTS.filter((x) => x.band <= band)) expect({ band, id: r.id, needs: needsOf(r), reachable: owned.has(needsOf(r)) }).toEqual({ band, id: r.id, needs: needsOf(r), reachable: true });
      }
      // The person sentence: at 7–9 the stones need Cobble, whom Sami lends after his first request (the post-box walk).
      expect([needsOf(req('path-stones')), spec('cobble').unlockedBy, req('path-postbox').band, spec('cobble').lentBy]).toEqual(['cobble', 'path-postbox', 1, 'sami']);
      for (const x of ROBOTS.filter((y) => y.unlockedBy)) expect({ robot: x.id, lender: req(x.unlockedBy!).islander, needs: needsOf(req(x.unlockedBy!)) === x.id }).toEqual({ robot: x.id, lender: x.lentBy, needs: false });
      for (const u of UPGRADES) expect({ u: u.id, from: req(u.unlockedBy).islander }).toEqual({ u: u.id, from: u.from });
    });

    it('🔴 AC2: a robot reward adds the robot to island.robots with its default name in her language; Sami’s first request lends Cobble, “Cobble” in both', () => {
      const en = win(kid('en'), 'path-postbox');
      expect(en.lent).toEqual(['cobble']);
      expect(en.model.island.robots).toEqual([{ id: 'r1' }, { id: 'cobble', kind: 'cobble', name: 'Cobble', color: spec('cobble').colour, eye: 'round', hat: 'none' }]);
      expect(win(kid('fr'), 'path-postbox').model.island.robots[1].name).toBe('Cobble');
      // A reward of kind robot (the kind itself): Pocket, named in French for a French profile.
      const fr = runScript(COMPLETE_REQUEST_SCRIPT, { model: kid('fr'), requestId: 'x', reward: { kind: 'robot', id: 'pocket', from: 'biscuit' } });
      expect([fr.lent, fr.model.island.robots.map((r: any) => r.name)]).toEqual([['pocket'], [undefined, 'Poche']]);
      // Once: a second win lends nothing more; the reward the request always gave (the cap) is still given.
      const twice = win(en.model, 'path-postbox');
      expect([twice.lent, twice.model.island.robots.length, twice.model.profiles[0].hats]).toEqual([[], 2, ['cap']]);
      // The robot works: she now has a robot for the stones, and not for the eggs.
      expect([helper<string>(SAVE_HELPERS, 'jobRobotId', en.model.profiles[0], 'cobble'), helper<string>(SAVE_HELPERS, 'jobRobotId', en.model.profiles[0], 'pocket')]).toEqual(['cobble', '']);
    });

    it('🔴 AC3: can+ on Pip makes fill give 6 — six tulips on one fill after the upgrade, three before', () => {
      const won = win(kid(), 'rows-trick');
      expect(won.upgraded).toEqual(['can+']);
      const before = rows(kid())[0];
      const after = rows(won.model)[0];
      expect([before.kind, before.canMax, before.upgraded, after.canMax, after.upgraded]).toEqual(['pip', 3, false, 6, true]);
      // Six tulips in a row below the path, the pond at its start: fill once, then water, step, water… six times.
      const world = (canMax: number) => ({ map: ['WGGGGGGG', 'GFFFFFFG'], things: [1, 2, 3, 4, 5, 6].map((x) => ({ kind: 'tulip', x, y: 1, watered: false })), robots: [{ id: 'pip', x: 1, y: 0, d: 3, can: 0, canMax }] });
      const prog = parse('K L r6[W L F R]');
      const wet = (canMax: number) => runToEnd(prog, world(canMax)).world.things.filter((t: any) => t.watered).length;
      expect([wet(before.canMax), wet(after.canMax)]).toEqual([3, 6]);
      // The can+ is Pip's and Echo's slot; Cobble keeps his, and Sami's basket+ makes his basket 8, Biscuit's boots Pocket's steps × 0.7.
      let m = win(win(win(win(kid(), 'path-postbox').model, 'bowl-if').model, 'path-stones').model, 'wall-until').model;
      const byKind = Object.fromEntries(rows(m).map((r: any) => [r.kind, r]));
      expect([byKind.cobble.basket, byKind.cobble.upgraded, byKind.pocket.stepFactor, byKind.pocket.upgraded, byKind.pip.canMax]).toEqual([8, true, 0.7, true, 3]);
    });

    it('🔴 AC6: the save code round-trips with three robots (renamed, recoloured, a hat); a session-3 v4 code (robots as ids) restores as it did', () => {
      let m = win(win(kid(), 'path-postbox').model, 'bowl-if').model;
      m = runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'cobble', field: 'name', value: 'Rocky' }).model;
      m = runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'pocket', field: 'color', value: '#3FA66B' }).model;
      m = runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'cobble', field: 'hat', value: 'cap' }).model;
      expect(m.island.robots.map((r: any) => r.id)).toEqual(['r1', 'cobble', 'pocket']);
      const code = runScript(ENCODE_SAVE_SCRIPT, { model: m }).code;
      const back = runScript(DECODE_SAVE_SCRIPT, { code });
      expect([back.ok, back.migrated, back.model]).toEqual([true, false, m]);
      expect(rows(back.model).map((r: any) => [r.name, r.color, r.hat, r.accessory])).toEqual([['Pip', '#FF7A59', 'none', 'can'], ['Rocky', spec('cobble').colour, 'cap', 'hod'], ['Pocket', '#3FA66B', 'none', 'satchel']]);
      // Session 3's encoder packed robots as ids: that code (hand-packed the same way) reads as it did — r1 alone, v4, not migrated.
      const s3 = { v: 4, f: ['f1', 1], a: 'p1', p: [['p1', 'Ada', 2, 'en', 'Ada', 'Pip', '#FF7A59', 'round', 'none', 'sssssss', [], [], ['tulips-three'], [['tulips-three', [{ id: 1, t: 'fwd' }], 'r1', 5]], ['r1']]] };
      const old = runScript(DECODE_SAVE_SCRIPT, { code: 'BG1.' + Buffer.from(JSON.stringify(s3)).toString('base64url') });
      expect([old.ok, old.migrated, old.model.island.robots, old.model.island.plots['tulips-three'].robotId]).toEqual([true, false, [{ id: 'r1' }], 'r1']);
    });

    it('Update robot: r1’s look is the profile’s own (renaming Pip here renames him everywhere); a hat she does not own, a bad colour or an unknown robot change nothing', () => {
      const m = win(kid(), 'path-postbox').model;
      const pip = runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'r1', field: 'name', value: 'Rosie' });
      expect([pip.changed, pip.model.profiles[0].robot.name, pip.model.island.robots[0]]).toEqual([true, 'Rosie', { id: 'r1' }]);
      expect(runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'cobble', field: 'hat', value: 'crown' }).changed).toBe(false);
      expect(runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'cobble', field: 'color', value: 'red' }).changed).toBe(false);
      expect(runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'echo', field: 'name', value: 'X' }).found).toBe(false);
      // Known-firing: an owned hat on Cobble changes it — also as a My robots card sends it (its row id, the card's kind first).
      expect(runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'cobble', field: 'hat', value: 'cap' }).changed).toBe(true);
      const card = runScript(UPDATE_ROBOT_SCRIPT, { model: m, robotId: 'cobble', field: 'color', value: 'cobble|#3FA66B' });
      expect([card.changed, card.model.island.robots[1].color]).toEqual([true, '#3FA66B']);
    });

    describe('arms: each IG-005 rule mutated, and the row that kills it', () => {
      const mutate = (script: string, from: string, to: string) => {
        if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
        return script.replace(from, to);
      };
      it('the palette ignores the robot → AC1’s Cobble-on-tulips row fails', () => {
        const m = mutate(PALETTE_SCRIPT, "var refused = !!bot && needs !== '' && botKind !== needs;", 'var refused = false;');
        expect(runScript(m, { band: 1, words: WORD_ROWS, lang: 'en', allowed: req('tulips-three').palette, robot: spec('cobble'), needs: 'pip' }).count).toBeGreaterThan(0);
      });
      it('decode reads a robot row as its id only → the three-robot round trip fails', () => {
        const m = mutate(DECODE_SAVE_SCRIPT, 'robots.push(Array.isArray(ro) ?', 'robots.push(false ?');
        const model = win(kid(), 'path-postbox').model;
        const got = runScript(m, { code: runScript(ENCODE_SAVE_SCRIPT, { model }).code });
        expect([got.ok, got.model.island.robots]).toEqual([true, [{ id: 'r1' }]]);
        expect(got.model).not.toEqual(model);
      });
      it('the upgrades are not applied → AC3’s six-tulip row reads 3', () => {
        const m = mutate(SAVE_HELPERS, 'if (up.canMax) out.canMax = up.canMax;', '');
        expect(helper<any[]>(m, 'robotRowsOf', win(kid(), 'rows-trick').model.profiles[0])[0].canMax).toBe(3);
      });
    });
  });

  describe('the ports the graph wires', () => {
    it('every script mints the outputs its component publishes, and every input is a real name', () => {
      const expected: Record<string, string[]> = {
        'Logic/New run': ['run', 'steps', 'blocks', 'handlers'],
        'Logic/Step': ['run', 'delta', 'glowId', 'done', 'waiting', 'request', 'tick', 'count', 'bumps', 'puddles', 'sayKey', 'sayText', 'sayStyle'],
        'Logic/Apply delta': ['world', 'things', 'robots', 'tulips'],
        'Logic/Sense': ['value', 'sensor'],
        'Logic/Goal met': ['met', 'missing', 'done', 'total'],
        'Logic/Find repeat': ['found', 'i', 'len', 'count', 'cover', 'containerId', 'offer', 'textKey', 'sample', 'vars'],
        'Logic/Fold': ['program', 'repeatId', 'folded', 'blocks'],
        'Logic/Unfold': ['program', 'unfolded'],
        'Logic/Predict end': ['x', 'y', 'd', 'ticks', 'known', 'asked', 'hit', 'bumps'],
        'Logic/Choose hint': ['key', 'vars', 'isOlive'],
        'Logic/Hint line': ['text', 'found', 'key'],
        'Logic/Palette': ['palette', 'count', 'band', 'refused'],
        'Logic/Add profile': ['model', 'ok', 'error', 'profileId', 'count'],
        'Logic/Complete request': ['model', 'newlyDone', 'bloomed', 'found', 'pinned', 'lent', 'upgraded'],
        'Logic/Encode save code': ['code', 'length'],
        'Logic/Decode save code': ['model', 'ok', 'error', 'migrated', 'profiles'],
        'Logic/Translate words': ['lang', 'isFr', ...WORD_KEYS],
        'Logic/Hint table': ['lang', ...HINT_KEYS],
        // P106 IG-004.
        'Logic/Bring home': ['model', 'freed', 'found'],
        // P106 IG-005.
        'Logic/Update robot': ['model', 'changed', 'found']
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
      const LABEL: Record<string, string> = { fwd: 'Fwd', left: 'Left', right: 'Right', water: 'Water', fill: 'Fill', pick: 'Pick', put: 'Put', say: 'Say', repeat: 'Repeat', until: 'Until', if: 'If', when: 'When', count_inc: 'CountInc', trick: 'Trick', do: 'Do', ask: 'Ask' };
      for (const t of Object.keys(LABEL)) expect({ t, word: WORDS['b' + LABEL[t]] !== undefined, caption: WORDS['c' + LABEL[t]] !== undefined }).toEqual({ t, word: true, caption: true });
    });

    it('the palette: band 7–9 is seven icon blocks with captions (IG-002: fill); band 10–12 is every block with its word; a request narrows it', () => {
      const b1 = runScript(PALETTE_SCRIPT, { band: 1, words: WORD_ROWS, lang: 'fr' });
      expect(b1.palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'water', 'fill', 'pick', 'put', 'go_nearest', 'go_to']);
      expect(b1.palette.map((p: any) => p.id)).toEqual([...BAND_PALETTE[1]]);
      expect(b1.palette.find((p: any) => p.id === 'fill')).toEqual({ id: 'fill', kind: 'action', label: WORDS.bFill.fr, caption: WORDS.cFill.fr, hasBody: false, hasCount: false, slots: [], band: 1 });
      expect(b1.palette[0]).toEqual({ id: 'fwd', kind: 'motion', label: 'avancer', caption: 'hop', hasBody: false, hasCount: false, slots: [], band: 1 });
      const b2 = runScript(PALETTE_SCRIPT, { band: 2, words: WORD_ROWS, lang: 'en' });
      expect(b2.count).toBe(BAND_PALETTE[2].length);
      expect(b2.palette.find((p: any) => p.id === 'repeat')).toMatchObject({ hasBody: true, hasCount: true, label: 'repeat' });
      expect(b2.palette.find((p: any) => p.id === 'ask')).toMatchObject({ kind: 'ask', slots: ['rung', 'args', 'shape', 'dial'] });
      const r = REQUESTS.find((x) => x.id === 'wall-until')!;
      expect(runScript(PALETTE_SCRIPT, { band: 2, words: WORD_ROWS, lang: 'en', allowed: r.palette }).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right', 'until']);
      // Band 7–9 never sees a control block, whatever the request lists.
      expect(runScript(PALETTE_SCRIPT, { band: 1, words: WORD_ROWS, lang: 'en', allowed: r.palette }).palette.map((p: any) => p.id)).toEqual(['fwd', 'left', 'right']);
    });
  });
});

// ── P108 IW-002 (lane J): the job model — meters, containers, the can as a thing, sources, the finish line, wear, seeds ──
describe('IW-002 (P108 s1) — the job model: a target takes exactly its need, a full one refuses, the robot walks home, wear only on the island, seeded layouts', () => {
  const LANGS = ['en', 'fr'] as const;
  const words = (lang: 'en' | 'fr') => runScript(TRANSLATE_SCRIPT, { lang, words: WORD_ROWS, botName: 'Pip' });
  /** Both bands, both languages: band 10–12 runs the program as written, band 7–9 the same program unrolled (primitives only). */
  const ROWS: Array<['en' | 'fr', 1 | 2]> = [['en', 1], ['en', 2], ['fr', 1], ['fr', 2]];
  const forBand = (band: 1 | 2, program: Block[]) => (band === 1 ? unrolled(program) : program);
  /** Every sayKey a run raised resolves to a line in its language. */
  const saidIn = (lang: 'en' | 'fr', deltas: any[]) => {
    const w = words(lang);
    for (const d of deltas) if (d.sayKey) expect({ lang, key: d.sayKey, line: /\S/.test(String(w[d.sayKey] ?? '')) }).toEqual({ lang, key: d.sayKey, line: true });
  };
  const eng = <T = any>(name: string, ...args: unknown[]) => helper<T>(ENGINE, name, ...args);

  it('🔴 the vocabulary is one table: ten kinds by the brief’s names (IW-003 s3: + door), the engine blocks exactly the kinds the table says, the wall tile L blocks, three new sayKeys in EN and FR', () => {
    // P108 IW-003 (s3 base): + door (a container of letters with an owner — the post missions' target).
    expect(JOB_VOCABULARY.map((k) => k.kind)).toEqual(['tulip', 'site', 'basket', 'bowl', 'store', 'can', 'rock', 'hen', 'postbox', 'door']);
    expect(JOB_KINDS).toEqual({ tulip: 'target', site: 'target', basket: 'container', bowl: 'container', store: 'container', can: 'carrier', rock: 'source', hen: 'source', postbox: 'source', door: 'container' });
    expect(WALL_TILE).toBe('L');
    expect(SITE_STAGES).toEqual(['dirt', 'gravel', 'cobbles', 'path']);
    for (const k of JOB_VOCABULARY) {
      const w = { map: ['GG'], things: [{ kind: k.kind, x: 1, y: 0 }], robots: [] };
      expect({ kind: k.kind, blocks: eng('blocked', eng('worldOf', w), 1, 0) }).toEqual({ kind: k.kind, blocks: k.blocks });
      if (k.wear) expect({ kind: k.kind, wear: Number.isInteger(WEAR[k.wear]) && WEAR[k.wear] > 0 }).toEqual({ kind: k.kind, wear: true });
    }
    // The wall: a tile, not a thing; the map edge stays blocked too. Known-firing beside it: grass does not block.
    expect([eng('blocked', eng('worldOf', { map: ['GL'] }), 1, 0), eng('blocked', eng('worldOf', { map: ['GL'] }), 2, 0), eng('blocked', eng('worldOf', { map: ['GL'] }), 0, 0)]).toEqual([true, true, false]);
    for (const k of ['sayFull', 'sayNoCan', 'sayHome']) expect({ k, en: !!WORDS[k]?.en, fr: !!WORDS[k]?.fr, differ: WORDS[k]?.en !== WORDS[k]?.fr }).toEqual({ k, en: true, fr: true, differ: true });
    // The wear numbers are longer than the longest reference run: a job that finishes is seen done before it wears.
    const longest = Math.max(...REQUESTS.map((r) => runToEnd(r.referenceProgram, worldOfRequest(r)).ticks));
    for (const k of ['tulip', 'site', 'bowl', 'basket', 'store'] as const) expect({ k, longer: WEAR[k] > longest }).toEqual({ k, longer: true });
  });

  it.each(ROWS)('🔴 AC1 a tulip takes exactly its need (3 drinks), a fourth pour is refused and says so — %s · band %i', (lang, band) => {
    const world = { map: ['GGG'], things: [{ kind: 'tulip', id: 'tu', x: 1, y: 0, need: 3, have: 0, watered: false }], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
    const end = runToEnd(forBand(band, parse('r4[W]')), world, 'pip', lang);
    const tu = end.world.things[0];
    expect(end.deltas.filter((d) => d.meter).map((d) => [d.meter.id, d.meter.have, d.meter.need])).toEqual([['tu', 1, 3], ['tu', 2, 3], ['tu', 3, 3]]);
    expect([tu.have, tu.need, tu.watered]).toEqual([3, 3, true]);
    expect(end.deltas.filter((d) => d.full)).toEqual([expect.objectContaining({ full: { id: 'tu', x: 1, y: 0 }, sayKey: 'sayFull' })]);
    // Two drinks of three: not watered yet (the meter is the truth), and the run counts it watered once.
    const two = runToEnd(forBand(band, parse('r2[W]')), world, 'pip', lang);
    expect([two.world.things[0].have, two.world.things[0].watered, two.run.watered, end.run.watered]).toEqual([2, false, 0, 1]);
    saidIn(lang, end.deltas);
    // A tulip with no need is need 1: one pour, as every request today — and no meter is written on it.
    const old = runToEnd(parse('W'), { ...world, things: [{ kind: 'tulip', x: 1, y: 0, watered: false }] }, 'pip', lang);
    expect(old.world.things[0]).toEqual({ kind: 'tulip', x: 1, y: 0, watered: true });
    expect(old.deltas.some((d) => d.meter || d.full)).toBe(false);
  });

  it.each(ROWS)('🔴 AC1 a path site takes its need in stones — dirt · gravel · cobbles · path — the tile then reads as path; a fifth stone is refused and stays carried — %s · band %i', (lang, band) => {
    const world = { map: ['GGG'], things: [{ kind: 'site', id: 's1', x: 1, y: 0, need: 4, have: 0, item: 'stone' }], robots: [{ id: 'pip', x: 0, y: 0, d: 1, carry: ['stone', 'stone', 'stone', 'stone', 'stone'], basket: 6 }] };
    expect(eng('worldOf', world).things[0].stage).toBe('dirt');
    let w: any = world;
    let run = runScript(NEW_RUN_SCRIPT, { program: forBand(band, parse('r5[D]')), robotId: 'pip', lang }).run;
    const stages: string[] = [];
    const deltas: any[] = [];
    for (let i = 0; i < 20 && !run.done; i++) {
      const t = tick(run, w);
      run = t.run;
      w = t.world;
      deltas.push(t.st.delta);
      if (t.st.delta.stow) stages.push(w.things[0].stage);
    }
    expect(stages).toEqual(['gravel', 'cobbles', 'cobbles', 'path']);
    expect(deltas.filter((d) => d.full)).toEqual([expect.objectContaining({ full: { id: 's1', x: 1, y: 0 }, sayKey: 'sayFull' })]);
    expect([w.things[0].have, w.robots[0].carry]).toEqual([4, ['stone']]);
    expect(w.things.filter((t: any) => t.kind === 'stone')).toEqual([]);
    // Full, the tile reads as path; the site stays on it and does not block: the robot walks on.
    expect([eng('tileAt', eng('worldOf', w), 1, 0), w.map[0], eng('blocked', eng('worldOf', w), 1, 0)]).toEqual(['P', 'GGG', false]);
    expect(runToEnd(parse('F F'), w, 'pip', lang).world.robots[0]).toMatchObject({ x: 2, y: 0 });
    // Known-firing: a stone that is not the site's item is not put there.
    const egg = runToEnd(parse('D'), { ...world, robots: [{ ...world.robots[0], carry: ['egg'] }] }, 'pip', lang);
    expect([egg.world.things[0].have, egg.world.robots[0].carry, egg.deltas[0].nothing]).toEqual([0, ['egg'], true]);
    saidIn(lang, deltas);
  });

  it.each(ROWS)('🔴 AC1 a basket fills to its capacity and refuses the fifth egg; pick takes one back; a bowl’s food is its count (bowl_has still reads it) — %s · band %i', (lang, band) => {
    const world = { map: ['GGG'], things: [{ kind: 'basket', id: 'b1', x: 1, y: 0, count: 0, capacity: 4, item: 'egg' }], robots: [{ id: 'pip', x: 0, y: 0, d: 1, carry: ['egg', 'egg', 'egg', 'egg', 'egg'], basket: 6 }] };
    const end = runToEnd(forBand(band, parse('r5[D]')), world, 'pip', lang);
    expect(end.deltas.filter((d) => d.meter).map((d) => d.meter.have)).toEqual([1, 2, 3, 4]);
    expect([end.world.things[0].count, end.world.robots[0].carry.length]).toEqual([4, 1]);
    expect(end.deltas.filter((d) => d.full).map((d) => d.sayKey)).toEqual(['sayFull']);
    expect(eng('isFull', end.world.things[0])).toBe(true);
    const back = runToEnd(parse('P'), end.world, 'pip', lang);
    expect([back.world.things[0].count, back.world.robots[0].carry.length, back.deltas[0].pick]).toEqual([3, 2, { id: 'pip', kind: 'egg', x: 1, y: 0, box: true, from: 'b1' }]);
    // A bowl: count ?? food; a put writes both, so bowl_has (which reads food) keeps working; with a capacity it refuses when full.
    const bowl = { map: ['GGG'], things: [{ kind: 'bowl', id: 'bw', x: 1, y: 0, food: 1, capacity: 2 }], robots: [{ id: 'pip', x: 0, y: 0, d: 1, carry: ['food', 'food'] }] };
    const fed = runToEnd(forBand(band, parse('r2[D]')), bowl, 'pip', lang);
    expect([fed.world.things[0].food, fed.world.things[0].count, fed.world.robots[0].carry]).toEqual([2, 2, ['food']]);
    expect(fed.deltas.map((d) => (d.feed ? 'feed' : d.full ? 'full' : '')).filter(Boolean)).toEqual(['feed', 'full']);
    expect(runScript(GOAL_SCRIPT, { world: fed.world, run: fed.run, program: [], goal: { name: 'bowl_has', args: [1, 0, 2] } }).met).toBe(true);
    saidIn(lang, [...end.deltas, ...fed.deltas]);
  });

  it.each(ROWS)('🔴 AC1 the can is a thing: without it in hand fill and water say noCan and change nothing; picked up it holds its level, fills, waters; put back down it keeps its level — %s · band %i', (lang, band) => {
    // The pond at 0,0; the robot at 1,0 facing it; the can on the shed tile 2,0; a dry tulip below the robot.
    const world = { map: ['WGG', 'GFG'], things: [{ kind: 'can', x: 2, y: 0, level: 0, max: 3 }, { kind: 'tulip', x: 1, y: 1, watered: false }], robots: [{ id: 'pip', x: 1, y: 0, d: 3 }] };
    const program = parse('K W R R P L L K L W L D W');
    const end = runToEnd(forBand(band, program), world, 'pip', lang);
    const ops = end.deltas.map((d) => (d.noCan ? 'noCan' : d.holds ? 'holds:' + d.holds.what : d.fill ? 'fill' : d.water ? 'water' : d.turn ? 't' : d.op));
    expect(ops).toEqual(['noCan', 'noCan', 't', 't', 'holds:can', 't', 't', 'fill', 't', 'water', 't', 'holds:', 'noCan', undefined]);
    expect(end.deltas.filter((d) => d.noCan).map((d) => d.sayKey)).toEqual(['sayNoCan', 'sayNoCan', 'sayNoCan']);
    // The first two changed nothing: no can in hand, the can still on the shed, the tulip dry.
    const after2 = runToEnd(parse('K W'), world, 'pip', lang).world;
    expect([after2.robots[0].can, after2.things.find((t: any) => t.kind === 'can'), after2.things[1].watered]).toEqual([undefined, { kind: 'can', x: 2, y: 0, level: 0, max: 3 }, false]);
    // Put back down on the shed with the two waters left; hands empty; the tulip is watered; the last pour is noCan again.
    expect(end.world.things.find((t: any) => t.kind === 'can')).toEqual({ kind: 'can', x: 2, y: 0, level: 2, max: 3 });
    expect([end.world.robots[0].holds, end.world.robots[0].can, end.world.things.find((t: any) => t.kind === 'tulip').watered]).toEqual([undefined, null, true]);
    // A robot row that needs a can and has none: noCan too. Known-firing: the same robot without needsCan waters for free.
    const bare = { map: ['GF'], things: [{ kind: 'tulip', x: 1, y: 0, watered: false }], robots: [{ id: 'pip', x: 0, y: 0, d: 1, needsCan: true }] };
    expect(runToEnd(parse('W'), bare, 'pip', lang).deltas[0]).toMatchObject({ noCan: { id: 'pip' }, sayKey: 'sayNoCan' });
    expect(runToEnd(parse('W'), { ...bare, robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] }, 'pip', lang).world.things[0].watered).toBe(true);
    saidIn(lang, end.deltas);
  });

  it('🔴 AC1 the rock regrows on a wear tick toward its max (and a rock with a max stays at 0 instead of vanishing); the hen lays on a free pen tile, never past her capacity; a letter comes to the post box', () => {
    // A rock with a max: two picks take it to 0, it stays (a third pick is the rockGone bump), wear regrows it one at a time to max.
    const quarry = { map: ['GGG'], things: [{ kind: 'rock', id: 'rk', x: 1, y: 0, left: 2, max: 3 }], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
    const dug = runToEnd(parse('P P P'), quarry);
    expect([dug.world.things, dug.world.robots[0].carry, dug.run.rockGone]).toEqual([[{ kind: 'rock', id: 'rk', x: 1, y: 0, left: 0, max: 3 }], ['stone', 'stone'], 1]);
    let w: any = dug.world;
    const lefts: number[] = [];
    for (let age = 1; age <= WEAR.rock * 4; age++) {
      for (const d of eng<any[]>('wearOf', w, age)) w = eng('apply', w, d);
      if (age % WEAR.rock === 0) lefts.push(w.things[0].left);
    }
    expect(lefts).toEqual([1, 2, 3, 3]);
    expect(eng<any[]>('wearOf', dug.world, WEAR.rock + 1)).toEqual([]);
    // The hen: a 3 × 2 pen with a tulip on one tile; she lays every WEAR.hen ticks on a free tile, never past four eggs.
    const pen = { map: ['GGGG', 'GGGG'], things: [{ kind: 'hen', x: 0, y: 0, pen: [1, 0, 3, 1] }, { kind: 'tulip', x: 2, y: 1, watered: false }], robots: [], seed: 7 };
    w = pen;
    const laid: string[] = [];
    for (let age = 1; age <= WEAR.hen * 6; age++) {
      for (const d of eng<any[]>('wearOf', w, age)) {
        if (d.lay) laid.push(d.lay.x + ',' + d.lay.y);
        w = eng('apply', w, d);
      }
    }
    expect(laid).toHaveLength(HEN_CAPACITY);
    expect(new Set(laid).size).toBe(HEN_CAPACITY);
    for (const at of laid) expect(['1,0', '2,0', '3,0', '1,1', '3,1']).toContain(at);
    expect(w.things.filter((t: any) => t.kind === 'egg')).toHaveLength(HEN_CAPACITY);
    // The seed moved on with every draw (the world is its own replay), and the same seed lays the same tiles again.
    expect(w.seed).not.toBe(7);
    let again: any = pen;
    const laid2: string[] = [];
    for (let age = 1; age <= WEAR.hen * 6; age++) for (const d of eng<any[]>('wearOf', again, age)) { if (d.lay) laid2.push(d.lay.x + ',' + d.lay.y); again = eng('apply', again, d); }
    expect(laid2).toEqual(laid);
    // The post box: a letter on its tile every WEAR.postbox ticks, never a second one while the first is there.
    const post = { map: ['GG'], things: [{ kind: 'postbox', x: 1, y: 0 }], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
    const first = eng<any[]>('wearOf', post, WEAR.postbox);
    expect(first).toEqual([{ letter: { x: 1, y: 0 } }]);
    const withLetter = eng('apply', post, first[0]);
    expect(eng<any[]>('wearOf', withLetter, WEAR.postbox * 2)).toEqual([]);
    // …and the letter on the post box is picked like any letter.
    expect(runToEnd(parse('P'), withLetter).world.robots[0].carry).toEqual(['letter']);
  });

  describe('AC2 — the finish line: jobDone fires when the last target fills; the robot walks home by a path that never crosses a blocking tile', () => {
    // A 5 × 3 plot: a wall (L) across the middle row at 1–3, the tulip at 4,1 closes the right side; home is 2,0 facing down.
    const JOB_WORLD = () => ({
      map: ['GGGGG', 'GLLLG', 'GGGGG'],
      things: [{ kind: 'tulip', x: 4, y: 1, need: 2, have: 0, watered: false }],
      robots: [{ id: 'pip', x: 4, y: 2, d: 0 }],
      job: { targets: [[4, 1]], home: { x: 2, y: 0, d: 2 } }
    });

    it.each(ROWS)('🔴 two drinks fill the tulip → jobDone once; the robot walks round the wall (never through L or the tulip) to home, faces down, says it is home; job_done is met — %s · band %i', (lang, band) => {
      const program = forBand(band, parse('r2[W]'));
      const end = runToEnd(program, JOB_WORLD(), 'pip', lang);
      expect(end.done).toBe(true);
      // The target named by its tile was given an id.
      expect(end.world.things[0].id).toBe('t0');
      expect(end.world.job.targets).toEqual(['t0']);
      const at = end.deltas.findIndex((d) => d.jobDone);
      expect(end.deltas.filter((d) => d.jobDone)).toHaveLength(1);
      // jobDone is raised on the tick after the second drink (the world it reads is the one the drink made).
      expect(end.deltas[at - 1].meter).toMatchObject({ id: 't0', have: 2, need: 2 });
      const walk = end.deltas.slice(at).filter((d) => d.move).map((d) => d.move.x + ',' + d.move.y);
      expect(walk).toEqual(['3,2', '2,2', '1,2', '0,2', '0,1', '0,0', '1,0', '2,0']);
      const blockedTiles = new Set(['1,1', '2,1', '3,1', '4,1']);
      expect(walk.filter((t) => blockedTiles.has(t))).toEqual([]);
      expect([end.run.bumps, end.world.robots[0].x, end.world.robots[0].y, end.world.robots[0].d]).toEqual([0, 2, 0, 2]);
      const home = end.deltas.filter((d) => d.home);
      expect(home).toEqual([expect.objectContaining({ home: { id: 'pip', x: 2, y: 0 }, sayKey: 'sayHome', op: 'home' })]);
      expect(runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program, goal: { name: 'job_done' } })).toMatchObject({ met: true, done: 1, total: 1 });
      saidIn(lang, end.deltas);
    });

    it('🔴 the job done but the robot not home is not job_done; a program that goes on after the job runs its own steps first, then walks home; no job → no walk', () => {
      // Stop the run on the tick jobDone is raised: the tulip is full, the robot is still by it.
      let run = runScript(NEW_RUN_SCRIPT, { program: parse('W W L'), robotId: 'pip', lang: 'en' }).run;
      let w: any = JOB_WORLD();
      for (let i = 0; i < 3; i++) ({ run, world: w } = tick(run, w));
      expect(runScript(GOAL_SCRIPT, { world: w, run, program: [], goal: { name: 'job_done' } })).toMatchObject({ met: false, missing: ['job_done'], done: 1, total: 1 });
      // Its L still runs (the walk is appended after the child's steps), then the walk home.
      const end = runToEnd(parse('W W L'), JOB_WORLD());
      const ops = end.deltas.map((d) => d.op).filter(Boolean);
      expect(ops.slice(0, 3)).toEqual(['water', 'water', 'left']);
      expect(ops.slice(3).every((o) => o === 'home')).toBe(true);
      expect(end.world.robots[0]).toMatchObject({ x: 2, y: 0, d: 2 });
      // Known-firing: the same world without a job — the robot stays where its program leaves it.
      const { job: _job, ...noJob } = JOB_WORLD();
      const plain = runToEnd(parse('W W L'), noJob);
      expect([plain.world.robots[0].x, plain.world.robots[0].y, plain.deltas.some((d) => d.jobDone || d.home)]).toEqual([4, 2, false]);
    });

    it('a home no path reaches: the walk gives up (lost), the run still ends — never a loop', () => {
      // Row 1 is wall with the tulip at its end: the robot's row 2 is cut off from row 0.
      const shut = { ...JOB_WORLD(), map: ['GGGGG', 'LLLLG', 'GGGGG'], job: { targets: [[4, 1]], home: { x: 0, y: 2 } } };
      // Known-firing: a home on its own row is reached.
      expect(runToEnd(parse('r2[W]'), shut).world.robots[0]).toMatchObject({ x: 0, y: 2 });
      const lost = runToEnd(parse('r2[W]'), { ...shut, job: { targets: [[4, 1]], home: { x: 0, y: 0 } } });
      expect([lost.done, lost.deltas.some((d) => d.lost), lost.deltas.some((d) => d.home)]).toEqual([true, true, false]);
    });
  });

  describe('AC3 — wear only on island ticks: the Workshop (step, apply, runToEnd) never wears', () => {
    it('🔴 a finished job left 3 × the longest wear period on step + apply: every meter as it was; wearOf on the same world at that age takes a drink', () => {
      const world = { map: ['GGG'], things: [{ kind: 'tulip', id: 'tu', x: 1, y: 0, need: 1, have: 0 }, { kind: 'bowl', id: 'bw', x: 1, y: 1, count: 2, capacity: 2 }], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }], job: { targets: ['tu'], home: { x: 0, y: 0, d: 1 } } };
      const end = runToEnd(parse('W'), { ...world, map: ['GGG', 'GGG'] });
      let run = end.run;
      let w = end.world;
      const n = 3 * Math.max(...Object.values(WEAR));
      for (let i = 0; i < n; i++) ({ run, world: w } = tick(run, w));
      expect([w.things[0].have, w.things[0].watered, w.things[0].droop, w.things[1].count]).toEqual([1, true, undefined, 2]);
      // Known-firing: the island's own wear at a tulip tick takes the drink, and the tulip droops.
      let worn = w;
      for (const d of eng<any[]>('wearOf', w, WEAR.tulip)) worn = eng('apply', worn, d);
      expect([worn.things[0].have, worn.things[0].watered, worn.things[0].droop]).toEqual([0, false, true]);
      // Wear never goes below 0 and removes nothing.
      let floor: any = worn;
      for (let age = 1; age <= WEAR.tulip * 3; age++) for (const d of eng<any[]>('wearOf', floor, age)) floor = eng('apply', floor, d);
      expect([floor.things.length, floor.things[0].have, floor.things[1].count]).toEqual([2, 0, 0]);
    });

    it('🔴 in the script text, only the island tick calls wearOf: no Workshop script (Step, Apply delta, Predict end, Goal met) does', () => {
      const calls = (script: string) => script.split('wearOf(').length - 1;
      // ENGINE defines it once and never calls it.
      expect(calls(ENGINE)).toBe(1);
      for (const { component, script } of FUNCTION_SCRIPTS) expect({ component, calls: calls(script) }).toEqual({ component, calls: script.includes(ENGINE) ? 1 : 0 });
    });
  });

  describe('AC4 — seeds: one seed lays one layout, the same twice; three seeds lay three; Start world lays it with the engine’s own helpers', () => {
    const REQ = {
      id: 'seeded-fixture',
      map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'GGGGGGGG'],
      things: [],
      robotStart: { x: 0, y: 3, d: 1 },
      seeded: { wallAt: [5, 7], eggs: { count: 4, among: [[1, 1], [2, 1], [3, 1], [4, 1], [1, 5], [2, 5], [3, 5], [4, 5]] } },
      job: { targets: [], home: { x: 0, y: 3, d: 1 } },
      goal: [],
      palette: ['fwd']
    };
    const laid = (seed: number) => eng<any>('seedWorld', { map: [...REQ.map], things: [], robots: [] }, JSON.parse(JSON.stringify(REQ)), seed);
    const layout = (w: any) => JSON.stringify({ map: w.map, eggs: w.things.filter((t: any) => t.kind === 'egg').map((t: any) => [t.x, t.y]).sort() });

    it('🔴 the same seed gives the same layout twice; seeds 1, 2 and 3 give three different ones; the wall lands in 5..7 on the robot’s row; four eggs on four of the eight tiles', () => {
      expect(layout(laid(1))).toBe(layout(laid(1)));
      expect(new Set([1, 2, 3].map((s) => layout(laid(s)))).size).toBe(3);
      for (let s = 1; s <= 40; s++) {
        const w = laid(s);
        const wall = w.map.map((row: string, y: number) => [...row].map((c, x) => (c === 'L' ? `${x},${y}` : '')).filter(Boolean)).flat();
        expect({ s, wall: wall.length === 1 && ['5,3', '6,3', '7,3'].includes(wall[0]) }).toEqual({ s, wall: true });
        const eggs = w.things.filter((t: any) => t.kind === 'egg').map((t: any) => `${t.x},${t.y}`);
        expect({ s, eggs: eggs.length, distinct: new Set(eggs).size, among: eggs.every((e: string) => REQ.seeded.eggs.among.some(([x, y]) => `${x},${y}` === e)) }).toEqual({ s, eggs: 4, distinct: 4, among: true });
      }
      // Over 40 seeds every column of 5..7 is used: the wall's distance really changes (until is worth more than repeat).
      expect(new Set(Array.from({ length: 40 }, (_, i) => laid(i + 1).map[3].indexOf('L'))).size).toBe(3);
      // The world carries its job and its seed, moved on by the draws: the JSON is its own replay.
      expect(laid(1).job).toEqual(REQ.job);
      expect(laid(1).seed).not.toBe(1);
    });

    it('🔴 the engine’s PRNG is mulberry32 (the spec’s own prng gives the same numbers); Start world lays exactly what the engine lays for a seed, and leaves a request with no job and no layout untouched', () => {
      const w = { seed: 12345 };
      const r = eng<() => number>('rngOf', w);
      const p = prng(12345);
      expect([r(), r(), r()]).toEqual([p(), p(), p()]);
      const sw = runScript(START_WORLD_SCRIPT, { requests: [REQ], requestId: REQ.id, nonce: 0, seed: 2 });
      expect(layout(sw.world)).toBe(layout(laid(2)));
      expect([sw.world.seed, sw.world.job]).toEqual([laid(2).seed, REQ.job]);
      // No seed given: one is picked (a uint32), and the layout is one the seed in the world replays.
      const picked = runScript(START_WORLD_SCRIPT, { requests: [REQ], requestId: REQ.id, nonce: 0 });
      expect(Number.isInteger(picked.world.seed) && picked.world.seed >= 0 && picked.world.seed < 2 ** 32).toBe(true);
      // Every request today: no seed, no job on its world (the 13 start exactly as before).
      for (const q of REQUESTS) {
        const out = runScript(START_WORLD_SCRIPT, { requests: JSON.parse(JSON.stringify(REQUESTS)), requestId: q.id, nonce: 0, seed: 9 }).world;
        expect({ id: q.id, seed: out.seed, job: out.job, map: out.map }).toEqual({ id: q.id, seed: undefined, job: undefined, map: q.map });
      }
      // The seed helpers are the engine's own text, in Start world too (one source).
      expect([ENGINE.includes(SEED_HELPERS), START_WORLD_SCRIPT.includes(SEED_HELPERS)]).toEqual([true, true]);
    });
  });

  describe('arms: each IW-002 rule mutated in the engine text, and the row that kills it', () => {
    const mutate = (from: string, to: string) => {
      if (ENGINE.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
      return ENGINE.replace(from, to);
    };
    const JOB = () => ({ map: ['GGGGG', 'GLLLG', 'GGGGG'], things: [{ kind: 'tulip', x: 4, y: 1, need: 2, have: 0, watered: false }], robots: [{ id: 'pip', x: 4, y: 2, d: 0 }], job: { targets: [[4, 1]], home: { x: 2, y: 0, d: 2 } } });
    it('the walk home ignores what blocks (only the map edge) → the AC2 walk crosses the wall or the tulip', () => {
      const m = mutate('if (from[k] !== undefined || blocked(w, nx, ny)) continue;', "if (from[k] !== undefined || tileAt(w, nx, ny) === '') continue;");
      // The engine's own runToEnd has no delta log: step the mutant by hand and read where it moves.
      let run = helper<any>(m, 'newRun', parse('r2[W]'), 'pip', 'en');
      let w: any = JOB();
      const moves: string[] = [];
      for (let i = 0; i < 40 && !run.done; i++) {
        const st = helper<any>(m, 'step', run, w, null);
        if (st.delta.move) moves.push(st.delta.move.x + ',' + st.delta.move.y);
        run = st.run;
        w = helper<any>(m, 'apply', w, st.delta);
      }
      expect(moves.some((t) => ['1,1', '2,1', '3,1', '4,1'].includes(t))).toBe(true);
      // Known-firing: the engine as shipped walks round to 2,0.
      expect(helper<any>(ENGINE, 'runToEnd', parse('r2[W]'), JOB(), 'pip', 'en').world.robots[0]).toMatchObject({ x: 2, y: 0 });
    });
    it('a full tulip is not refused → the fourth pour raises no full, says no sayFull', () => {
      const m = mutate('if (tm.have >= tm.need) { delta.full', 'if (false) { delta.full');
      let run = helper<any>(m, 'newRun', parse('W W W W'), 'pip', 'en');
      let w: any = { map: ['GGG'], things: [{ kind: 'tulip', id: 'tu', x: 1, y: 0, need: 3, have: 0 }], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
      const keys: string[] = [];
      for (let i = 0; i < 6 && !run.done; i++) {
        const st = helper<any>(m, 'step', run, w, null);
        if (st.delta.sayKey) keys.push(st.delta.sayKey);
        run = st.run;
        w = helper<any>(m, 'apply', w, st.delta);
      }
      expect(keys).not.toContain('sayFull');
    });
    it('the finish line appends no walk → the robot stays by the tulip; job_done is not met', () => {
      const m = mutate("run.steps.push({ id: null, op: 'home', guard: 0 });", '');
      const end = helper<any>(m, 'runToEnd', parse('r2[W]'), JOB(), 'pip', 'en');
      expect([end.world.robots[0].x, end.world.robots[0].y]).toEqual([4, 2]);
      expect(helper<any>(m, 'goalMet', end.world, end.run, [], { name: 'job_done' }).met).toBe(false);
    });
    it('the Workshop wears (runToEnd calls wearOf) → the AC3 text row counts two calls in ENGINE', () => {
      const m = mutate('run = st.run; w = apply(w, st.delta); ticks++;', 'run = st.run; w = apply(w, st.delta); ticks++; var wz = wearOf(w, ticks); for (var zi = 0; zi < wz.length; zi++) w = apply(w, wz[zi]);');
      expect(m.split('wearOf(').length - 1).toBe(2);
      // …and it does wear: a watered tulip left long enough in the mutant's runToEnd is dry again.
      const world = { map: ['GGG'], things: [{ kind: 'tulip', id: 'tu', x: 1, y: 0, need: 1, have: 1 }], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
      const long = helper<any>(m, 'runToEnd', Array.from({ length: WEAR.tulip + 2 }, (_, i) => ({ id: i + 1, t: 'left' })), world, 'pip', 'en');
      expect(long.world.things[0].have).toBe(0);
      expect(helper<any>(ENGINE, 'runToEnd', Array.from({ length: WEAR.tulip + 2 }, (_, i) => ({ id: i + 1, t: 'left' })), world, 'pip', 'en').world.things[0].have).toBe(1);
    });
  });
});

// ── P108 IW-005 (lane J) ────────────────────────────────────────────────────

describe('IW-005 (P108 s2) — seek and regrow: go to nearest by path length, reservation, go to a chip or what Olive read, conditions and values, set/change, if/else', () => {
  const eng = <T = any>(name: string, ...args: unknown[]) => helper<T>(ENGINE, name, ...args);
  /** The engine compiled once (a mutant is another text): the rows that step by hand use it. */
  const api = (text: string) => new Function(`${text}; return { newRun: newRun, step: step, apply: apply, worldOf: worldOf, evalCond: evalCond, evalVal: evalVal };`)() as any;
  const E = api(ENGINE);
  const LANGS = ['en', 'fr'] as const;
  const words = (lang: 'en' | 'fr') => runScript(TRANSLATE_SCRIPT, { lang, words: WORD_ROWS, botName: 'Pip' });
  const saidIn = (lang: 'en' | 'fr', deltas: any[]) => {
    const w = words(lang);
    for (const d of deltas) if (d.sayKey) expect({ lang, key: d.sayKey, line: /\S/.test(String(w[d.sayKey] ?? '')) }).toEqual({ lang, key: d.sayKey, line: true });
  };
  const blk = (id: number, t: string, slots?: Record<string, unknown>, body?: any[], els?: any[]): Block => ({ id, t, ...(slots ? { slots } : {}), ...(body ? { body } : {}), ...(els ? { else: els } : {}) }) as any;
  const EGG = (x: number, y: number, id?: string) => ({ kind: 'egg', x, y, ...(id ? { id } : {}) });
  const G = (w: number, h: number) => Array.from({ length: h }, () => 'G'.repeat(w));
  const faces = (r: any) => ({ x: r.x + [0, 1, 0, -1][r.d], y: r.y + [-1, 0, 1, 0][r.d] });
  const nearest = (id: number, kind = 'egg') => blk(id, 'go_nearest', { kind });
  const goTo = (id: number, thing: unknown) => blk(id, 'go_to', { thing });
  const num = (n: unknown) => ({ op: 'num', n });
  const text = (s: string) => ({ op: 'text', s });
  const V = (name: string) => ({ op: 'var', name });
  const cmp = (c: string, a: unknown, b: unknown) => ({ op: 'cmp', cmp: c, a, b });
  const is = (thing: unknown, state: string, extra: Record<string, unknown> = {}) => ({ op: 'is', thing, state, ...extra });
  /** The walk of one go to nearest / go to: its deltas (the ones that glowed that block). */
  const walkOf = (end: { deltas: any[]; glows: any[] }, id: number) => end.deltas.filter((_d, i) => end.glows[i] === id);

  it('🔴 the vocabulary: four new statements at the END of BLOCK_TYPES and in BLOCK_META; IW-003 (s3 base) offers them — band 7–9 the two walks, band 10–12 all four, each with its word and caption; sayNone in EN and FR', () => {
    expect(BLOCK_TYPES.slice(-4)).toEqual(['go_nearest', 'go_to', 'set', 'change']);
    expect(BLOCK_TYPES.slice(0, 16)).toEqual(['fwd', 'left', 'right', 'water', 'fill', 'pick', 'put', 'say', 'repeat', 'until', 'if', 'when', 'count_inc', 'trick', 'do', 'ask']);
    for (const t of BLOCK_TYPES) expect({ t, meta: !!BLOCK_META[t] }).toEqual({ t, meta: true });
    expect([BLOCK_META.go_nearest.slots, BLOCK_META.go_to.slots, BLOCK_META.set.slots, BLOCK_META.change.slots]).toEqual([['kind'], ['thing'], ['name', 'value'], ['name', 'by']]);
    expect(BAND_PALETTE[2]).toEqual([...BLOCK_TYPES]);
    for (const band of [1, 2]) {
      const pal = runScript(PALETTE_SCRIPT, { band, words: WORD_ROWS, lang: 'en' }).palette;
      const ids = pal.map((p: any) => p.id);
      for (const t of ['go_nearest', 'go_to', 'set', 'change']) expect({ band, t, offered: ids.includes(t) }).toEqual({ band, t, offered: band === 2 || t === 'go_nearest' || t === 'go_to' });
      // Each new block wears its own word and caption (the palette's LABEL names them; never the raw id).
      const KEY: Record<string, string> = { go_nearest: 'GoNearest', go_to: 'GoTo', set: 'Set', change: 'Change' };
      for (const p of pal.filter((x: any) => KEY[x.id])) expect({ band, id: p.id, label: p.label, caption: p.caption }).toEqual({ band, id: p.id, label: WORDS['b' + KEY[p.id]].en, caption: WORDS['c' + KEY[p.id]].en });
    }
    expect({ en: !!WORDS.sayNone?.en, fr: !!WORDS.sayNone?.fr, differ: WORDS.sayNone?.en !== WORDS.sayNone?.fr }).toEqual({ en: true, fr: true, differ: true });
    // Every reference program still uses only the sixteen (IW-003 moves the missions).
    for (const r of REQUESTS) for (const t of typesIn(r.referenceProgram)) expect({ id: r.id, t, old: BLOCK_TYPES.indexOf(t as BlockType) < 16 }).toEqual({ id: r.id, t, old: true });
  });

  describe('AC1 — go to nearest: the true nearest by PATH length; ties the same way every time; none when there is none; a blocked target skipped', () => {
    /** A wall across row 1 (open at its right end): egg a is 2 tiles away in a straight line but 11 steps round; egg b is 4 steps. */
    const AROUND = (wall = 'LLLLLLG') => ({ map: ['GGGGGGG', wall, 'GGGGGGG', 'GGGGGGG'], things: [EGG(1, 0, 'a'), EGG(5, 3, 'b')], robots: [{ id: 'pip', x: 1, y: 2, d: 1 }] });

    it.each(LANGS)('🔴 path, not straight line: b (4 steps) over a (2 tiles away, behind the wall); one move or one quarter turn per tick; ends facing b; pick takes it — %s', (lang) => {
      const end = runToEnd([nearest(1), blk(2, 'pick')], AROUND(), 'pip', lang);
      const walk = walkOf(end, 1);
      expect(walk[0]).toMatchObject({ op: 'go_nearest', reserve: { thing: 'b', robot: 'pip', kind: 'egg', x: 5, y: 3 }, aim: { id: 'pip', x: 5, y: 2 } });
      // Every tick of the walk is exactly one move or one quarter turn, and every move is to a neighbouring tile.
      for (const d of walk) expect([!!d.move, !!d.turn].filter(Boolean)).toHaveLength(1);
      expect(walk.map((d) => (d.move ? `${d.move.x},${d.move.y}` : `turn${d.turn.d}`))).toEqual(['2,2', '3,2', '4,2', '5,2', 'turn2']);
      expect(end.world.robots[0].carry).toEqual(['egg']);
      expect(end.world.things.map((t: any) => t.id)).toEqual(['a']);
      // Picked: the reservation went with the egg.
      expect(end.world.reserved).toEqual({});
      expect([end.run.bumps, end.done]).toEqual([0, true]);
      saidIn(lang, end.deltas);
      // Known-firing beside it: with no wall, a IS the nearest (1 step) and is the one found.
      const open = runToEnd([nearest(1)], AROUND('GGGGGGG'), 'pip', lang);
      expect(walkOf(open, 1)[0].reserve).toMatchObject({ thing: 'a' });
    });

    it('🔴 ties: equal path length goes to the upper egg, then the left one — whatever order the world lists them in, run after run', () => {
      const tie = (things: any[]) => runToEnd([nearest(1)], { map: G(7, 5), things, robots: [{ id: 'pip', x: 3, y: 2, d: 0 }] });
      const lr = tie([EGG(5, 2, 'r'), EGG(1, 2, 'l')]);
      expect(walkOf(lr, 1).map((d) => d.reserve?.thing ?? null)[0]).toBe('l');
      expect(walkOf(lr, 1).map((d) => (d.move ? `${d.move.x},${d.move.y}` : `turn${d.turn.d}`))).toEqual(['turn3', '2,2']);
      expect(walkOf(tie([EGG(1, 2, 'l'), EGG(5, 2, 'r')]), 1)[0].reserve.thing).toBe('l');
      const four = [EGG(1, 2, 'l'), EGG(5, 2, 'r'), EGG(3, 4, 'dn'), EGG(3, 0, 'up')];
      const a = tie(four);
      const b = tie([...four].reverse());
      expect([walkOf(a, 1)[0].reserve.thing, walkOf(b, 1)[0].reserve.thing]).toEqual(['up', 'up']);
      expect(JSON.stringify(tie(four).deltas)).toBe(JSON.stringify(a.deltas));
    });

    it('🔴 a blocked target is skipped (walled in: no tile to face it from) for a farther one; with only the walled one: none, sayNone, the block ends and the next one runs', () => {
      const map = ['GGGGGGG', 'GGGGGGG', 'GGGGGGG', 'LLGGGGG', 'GLGGGGG'];
      const both = runToEnd([nearest(1), blk(2, 'pick')], { map, things: [EGG(0, 4, 'c'), EGG(6, 4, 'd')], robots: [{ id: 'pip', x: 2, y: 4, d: 3 }] });
      expect(walkOf(both, 1)[0].reserve.thing).toBe('d');
      expect(walkOf(both, 1).map((d) => (d.move ? `${d.move.x},${d.move.y}` : `turn${d.turn.d}`))).toEqual(['turn0', 'turn1', '3,4', '4,4', '5,4']);
      expect([both.world.robots[0].carry, both.world.things.map((t: any) => t.id)]).toEqual([['egg'], ['c']]);
      for (const lang of LANGS) {
        const only = runToEnd([nearest(1), blk(2, 'left')], { map, things: [EGG(0, 4, 'c')], robots: [{ id: 'pip', x: 2, y: 4, d: 3 }] }, 'pip', lang);
        expect(walkOf(only, 1)).toEqual([expect.objectContaining({ op: 'go_nearest', none: { id: 'pip', kind: 'egg' }, sayKey: 'sayNone' })]);
        expect(walkOf(only, 1)[0].reserve).toBeUndefined();
        // The next block ran on the next tick (the turn), and the run ended.
        expect([walkOf(only, 2)[0].turn, only.done, only.world.robots[0].x]).toEqual([{ id: 'pip', d: 2 }, true, 2]);
        expect(words(lang).sayNone).toBe(WORDS.sayNone[lang]);
        saidIn(lang, only.deltas);
      }
      // Nothing of that kind at all: none too.
      const empty = runToEnd([nearest(1, 'rock')], { map: G(3, 3), things: [EGG(0, 0)], robots: [{ id: 'pip', x: 1, y: 1, d: 0 }] });
      expect(walkOf(empty, 1)[0]).toMatchObject({ none: { id: 'pip', kind: 'rock' }, sayKey: 'sayNone' });
    });

    it('🔴 the path is searched ONCE per walk and kept (the IW-005 §4 trap); searched again only when the thing goes or the next tile blocks — a robot seeking an egg that moved', () => {
      const end = runToEnd([nearest(1)], AROUND());
      expect([end.run.searches, walkOf(end, 1).length]).toEqual([1, 5]);
      // The egg is taken from under the walk after two ticks: the robot searches again and goes for the next one (e).
      let run = runScript(NEW_RUN_SCRIPT, { program: [nearest(1)], robotId: 'pip', lang: 'en' }).run;
      let world: any = { ...AROUND(), things: [EGG(1, 0, 'a'), EGG(5, 3, 'b'), EGG(6, 0, 'e')] };
      const seen: any[] = [];
      for (let i = 0; i < 40; i++) {
        const t = tick(run, world);
        run = t.run;
        world = t.world;
        seen.push(t.st.delta);
        if (i === 1) world = { ...world, things: world.things.filter((x: any) => x.id !== 'b') };
        if (t.st.done) break;
      }
      expect(seen[0].reserve.thing).toBe('b');
      const re = seen.findIndex((d, i) => i > 0 && d.reserve);
      expect(seen[re]).toMatchObject({ release: { robot: 'pip', thing: 'b' }, reserve: { thing: 'e' }, aim: { x: 6, y: 1 } });
      expect(run.searches).toBe(2);
      expect(faces(world.robots[0])).toEqual({ x: 6, y: 0 });
      // Reserved while it walked; the run's end released it.
      expect([seen[re + 1].reserve, seen[seen.length - 1].release, world.reserved]).toEqual([undefined, { robot: 'pip' }, {}]);
      // A wall dropped on the next tile of the route: searched again, walked round, never a bump.
      run = runScript(NEW_RUN_SCRIPT, { program: [nearest(1), blk(2, 'pick')], robotId: 'pip', lang: 'en' }).run;
      world = { ...AROUND(), things: [EGG(5, 3, 'b')] };
      for (let i = 0; i < 40; i++) {
        const t = tick(run, world);
        run = t.run;
        world = t.world;
        if (i === 0) world = { ...world, map: ['GGGGGGG', 'LLLLLLG', 'GGGLGGG', 'GGGGGGG'] };
        if (t.st.done) break;
      }
      expect([run.searches, run.bumps, world.robots[0].carry, world.robots[0].x, world.robots[0].y]).toEqual([2, 0, ['egg'], 4, 3]);
    });
  });

  describe('AC2 — reservation: two robots on one pen of 3 eggs pick each egg once, and neither ever walks to an egg the other reserved', () => {
    /** Both robots are 3 steps from the middle egg; without reservation both go for it. */
    const PEN = () => ({ map: G(7, 4), things: [EGG(3, 0), EGG(0, 0), EGG(6, 0)], robots: [{ id: 'pip', x: 2, y: 3, d: 1 }, { id: 'pocket', x: 4, y: 3, d: 3 }] });
    const PROGRAM = [blk(1, 'repeat', undefined, [nearest(2), blk(3, 'pick')])];
    (PROGRAM[0] as any).n = 2;
    /** Step the two robots in turn on one world (as the island does), and check the invariant after every step. */
    const twoRobots = (A: any) => {
      let w: any = A.worldOf(PEN());
      const runs: any = { pip: A.newRun(PROGRAM, 'pip', 'en'), pocket: A.newRun(PROGRAM, 'pocket', 'en') };
      const deltas: any[] = [];
      const violations: string[] = [];
      for (let t = 0; t < 120 && !(runs.pip.done && runs.pocket.done); t++) {
        for (const id of ['pip', 'pocket']) {
          const st = A.step(runs[id], w, null);
          runs[id] = st.run;
          w = A.apply(w, st.delta);
          deltas.push(st.delta);
          for (const who of ['pip', 'pocket']) {
            const s = runs[who].steps[runs[who].pc];
            if (s && s.op === 'seek' && s.target && (w.reserved || {})[s.target.id] !== who) violations.push(`${t}:${who}→${s.target.id} held by ${(w.reserved || {})[s.target.id]}`);
          }
        }
      }
      return { w, runs, deltas, violations };
    };

    it('🔴 three picks on three different eggs, one none; every walk is to the walker’s own reservation; nothing left reserved at the end', () => {
      const out = twoRobots(E);
      const picks = out.deltas.filter((d) => d.pick).map((d) => `${d.pick.x},${d.pick.y}`);
      expect([...picks].sort()).toEqual(['0,0', '3,0', '6,0']);
      expect(out.deltas.filter((d) => d.none)).toHaveLength(1);
      expect(out.w.robots.map((r: any) => r.carry.length).reduce((a: number, b: number) => a + b, 0)).toBe(3);
      expect(out.violations).toEqual([]);
      // The first two reservations: the middle egg to pip (who stepped first), the right one to pocket (the middle was his nearest too).
      expect(out.deltas.filter((d) => d.reserve).slice(0, 2).map((d) => [d.reserve.robot, d.reserve.thing])).toEqual([['pip', 'egg@3,0'], ['pocket', 'egg@6,0']]);
      expect(out.w.reserved).toEqual({});
      expect([out.runs.pip.done, out.runs.pocket.done]).toEqual([true, true]);
    });

    it('🔴 a run that ends releases what it reserved and did not pick (another robot may have it then)', () => {
      const w = { map: G(5, 1), things: [EGG(4, 0, 'e')], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
      const end = runToEnd([nearest(1)], w);
      expect(end.deltas.filter((d) => d.reserve)).toHaveLength(1);
      expect(end.deltas[end.deltas.length - 1]).toMatchObject({ release: { robot: 'pip' } });
      expect(end.world.reserved).toEqual({});
      // Held while the run was alive: the tick before the end.
      let run = runScript(NEW_RUN_SCRIPT, { program: [nearest(1)], robotId: 'pip', lang: 'en' }).run;
      let world: any = w;
      const t = tick(run, world);
      expect(t.world.reserved).toEqual({ e: 'pip' });
      run = t.run;
      world = t.world;
      // Another robot's go to nearest on the same world skips it: none.
      const other = E.step(E.newRun([nearest(1)], 'pocket', 'en'), { ...world, robots: [...world.robots, { id: 'pocket', x: 2, y: 0, d: 1 }] }, null);
      expect(other.delta).toMatchObject({ none: { id: 'pocket', kind: 'egg' } });
    });

    it('arm: go to nearest ignores reservations → the two robots walk to the same egg (the invariant row fails); the engine as shipped: none', () => {
      const anchor = 'if (isSet(t.id) && res[String(t.id)] && res[String(t.id)] !== r.id) continue;';
      expect(ENGINE.split(anchor)).toHaveLength(2);
      expect(twoRobots(api(ENGINE.replace(anchor, ''))).violations.length).toBeGreaterThan(0);
      expect(twoRobots(E).violations).toEqual([]);
    });
  });

  describe('go to a chip (a thing picked on the world): by its id, else its kind on its tile, else the can in hand; none when it is not there', () => {
    const CHIPS = (robot: Record<string, unknown> = {}) => ({
      map: G(7, 3),
      things: [
        { kind: 'basket', id: 'b1', x: 1, y: 0, count: 0, capacity: 4, item: 'egg' },
        { kind: 'basket', id: 'b2', x: 5, y: 0, count: 0, capacity: 4, item: 'egg' }
      ],
      robots: [{ id: 'pip', x: 3, y: 2, d: 0, ...robot }]
    });
    it('🔴 by id; by kind and tile (no id, or an id no longer in the world); the held can: already there; a chip of nothing: none', () => {
      const r = (chip: unknown, robot?: Record<string, unknown>) => runToEnd([goTo(1, chip)], CHIPS(robot));
      const byId = r({ id: 'b2', kind: 'basket', x: 5, y: 0 });
      expect([byId.world.robots[0].x, byId.world.robots[0].y, faces(byId.world.robots[0])]).toEqual([5, 1, { x: 5, y: 0 }]);
      for (const chip of [{ kind: 'basket', x: 1, y: 0 }, { id: 'gone', kind: 'basket', x: 1, y: 0 }]) {
        const end = r(chip);
        expect({ chip, at: [end.world.robots[0].x, end.world.robots[0].y], faces: faces(end.world.robots[0]) }).toEqual({ chip, at: [2, 0], faces: { x: 1, y: 0 } });
        // go to reserves nothing (a chip is the child's own choice).
        expect(end.deltas.filter((d) => d.reserve)).toEqual([]);
      }
      const can = r({ kind: 'can', x: 0, y: 0 }, { holds: 'can', can: 1 });
      expect([walkOf(can, 1).length, walkOf(can, 1)[0].none, can.world.robots[0].x, can.world.robots[0].y]).toEqual([1, undefined, 3, 2]);
      const none = r({ kind: 'egg', x: 0, y: 0 });
      expect(walkOf(none, 1)).toEqual([expect.objectContaining({ op: 'go_to', none: { id: 'pip', kind: 'egg' }, sayKey: 'sayNone' })]);
    });
  });

  describe('AC3 — go to [what Olive read]: the robot goes to the thing her read names, with the real model’s answer and with the fallback', () => {
    const NOTE: Record<'en' | 'fr', string> = { en: 'The red ones, not the yellow.', fr: 'Les rouges, pas les jaunes.' };
    const RED: Record<'en' | 'fr', string> = { en: 'red tulip', fr: 'tulipe rouge' };
    const TULIPS = (lang: 'en' | 'fr') => ({
      map: G(7, 3),
      things: [{ kind: 'note', x: 0, y: 0, text: NOTE[lang] }, { kind: 'tulip', x: 4, y: 0, color: 'yellow', watered: false }, { kind: 'tulip', x: 6, y: 2, color: 'red', watered: false }],
      robots: [{ id: 'pip', x: 3, y: 1, d: 1 }]
    });
    const READ_GO = [blk(1, 'olive:read'), goTo(2, { ref: 'read' }), blk(3, 'water')];
    const watered = (w: any) => w.things.filter((t: any) => t.kind === 'tulip' && t.watered).map((t: any) => t.color);

    it.each(LANGS)('🔴 the note says red: the real model answers "%s"-side {ok, value} and the robot walks past the nearer yellow to water the red; the fallback (the written answer) does the same', (lang) => {
      const real = runToEnd(READ_GO, TULIPS(lang), 'pip', lang, [{ ok: true, value: RED[lang] }]);
      expect([real.run.lastAnswer.object, real.run.lastAnswer.fallback, watered(real.world)]).toEqual(['red_tulip', false, ['red']]);
      expect(walkOf(real, 2).map((d) => (d.move ? `${d.move.x},${d.move.y}` : `turn${d.turn.d}`))).toEqual(['4,1', '5,1', '6,1', 'turn2']);
      const fallback = runToEnd(READ_GO, TULIPS(lang), 'pip', lang);
      expect([fallback.run.lastAnswer.fallback, fallback.run.lastAnswer.value, fallback.run.lastAnswer.object, watered(fallback.world)]).toEqual([true, RED[lang], 'red_tulip', ['red']]);
      // Known-firing: an answer naming the yellow one sends it to the yellow one.
      const yellow = runToEnd(READ_GO, TULIPS(lang), 'pip', lang, [{ ok: true, value: lang === 'en' ? 'yellow tulip' : 'tulipe jaune' }]);
      expect(watered(yellow.world)).toEqual(['yellow']);
    });

    it('🔴 Mamie’s door: a thing named by its owner (a word that is not one of Olive’s object ids) — found by the real-model answer "Mamie"; the fallback (the note’s written answer is the letter) goes to the letter', () => {
      const MAMIE = (lang: 'en' | 'fr') => ({
        map: G(7, 3),
        things: [{ kind: 'note', x: 0, y: 0, text: lang === 'en' ? 'Take the letter to Mamie Rose.' : 'Porte la lettre à Mamie Rose.' }, { kind: 'door', owner: 'Mamie', x: 6, y: 1 }, { kind: 'letter', x: 1, y: 2 }],
        robots: [{ id: 'pip', x: 3, y: 1, d: 1 }]
      });
      const prog = [blk(1, 'olive:read'), goTo(2, { ref: 'read' }), blk(3, 'pick')];
      const door = runToEnd(prog, MAMIE('en'), 'pip', 'en', [{ ok: true, value: 'Mamie' }]);
      expect([door.run.lastAnswer.object, door.world.robots[0].x, door.world.robots[0].y, faces(door.world.robots[0]), door.world.robots[0].carry]).toEqual(['', 5, 1, { x: 6, y: 1 }, []]);
      for (const lang of LANGS) {
        const fb = runToEnd(prog, MAMIE(lang), 'pip', lang);
        expect({ lang, object: fb.run.lastAnswer.object, at: [fb.world.robots[0].x, fb.world.robots[0].y], carry: fb.world.robots[0].carry }).toEqual({ lang, object: 'letter', at: [1, 1], carry: ['letter'] });
      }
      // Nothing read (no answer yet): go to [what Olive read] finds nothing — none.
      const none = runToEnd([goTo(1, { ref: 'read' })], MAMIE('en'));
      expect(walkOf(none, 1)[0]).toMatchObject({ none: { id: 'pip', kind: 'read' }, sayKey: 'sayNone' });
    });
  });

  describe('conditions and values (brief §4.3): every COND, VAL, REF and STATE shape; an expression never throws', () => {
    const CW = (robot: Record<string, unknown> = {}) =>
      E.worldOf({
        map: ['GGGGG', 'GLGGG', 'GGGGG'],
        things: [
          { kind: 'basket', id: 'bk', x: 2, y: 0, count: 4, capacity: 4, item: 'egg' },
          { kind: 'bowl', id: 'bw', x: 3, y: 0, count: 0, food: 0, capacity: 3 },
          { kind: 'store', id: 'st', x: 4, y: 0, count: 2, capacity: 5, item: 'stone' },
          { kind: 'tulip', id: 'tu', x: 0, y: 2, need: 2, have: 1 },
          { kind: 'site', id: 'si', x: 4, y: 2, need: 4, have: 0 },
          { kind: 'rock', id: 'rk', x: 4, y: 1, left: 0, max: 3 },
          { kind: 'can', id: 'cn', x: 0, y: 0, level: 3, max: 3 },
          { kind: 'hen', id: 'hn', x: 0, y: 1, pen: [2, 2, 3, 2] },
          { kind: 'puddle', x: 2, y: 1 },
          EGG(3, 2),
          EGG(3, 2)
        ],
        robots: [{ id: 'pip', x: 2, y: 2, d: 1, carry: ['egg', 'stone', 'egg'], ...robot }]
      });
    const RUN = { robotId: 'pip', count: 2, vars: { n: 3, word: 'Red' }, lastAnswer: { object: 'red_tulip', value: 'red tulip' } };
    const chip = (id: string, kind: string, x: number, y: number) => ({ id, kind, x, y });
    const BK = chip('bk', 'basket', 2, 0);

    it('🔴 COND is — every state by the thing’s kind', () => {
      const rows: Array<[string, unknown, boolean, Record<string, unknown>?]> = [
        ['ahead has egg', is({ ref: 'ahead' }, 'has', { what: 'egg' }), true],
        ['ahead has stone', is({ ref: 'ahead' }, 'has', { what: 'stone' }), false],
        ['ahead has (anything)', is({ ref: 'ahead' }, 'has'), true],
        ['ahead nothing', is({ ref: 'ahead' }, 'nothing'), false],
        ['ahead wall', is({ ref: 'ahead' }, 'wall'), false],
        ['here nothing', is({ ref: 'here' }, 'nothing'), true],
        ['here wall', is({ ref: 'here' }, 'wall'), false],
        ['ahead (a puddle only) nothing', is({ ref: 'ahead' }, 'nothing'), true, { d: 0 }],
        ['ahead (L) wall', is({ ref: 'ahead' }, 'wall'), true, { x: 1, y: 2, d: 0 }],
        ['ahead (the map edge) wall', is({ ref: 'ahead' }, 'wall'), true, { d: 2 }],
        ['held empty', is({ ref: 'held' }, 'empty'), false],
        ['held full (3 of 4)', is({ ref: 'held' }, 'full'), false],
        ['held has 3', is({ ref: 'held' }, 'has', { n: 3 }), true],
        ['held has 4', is({ ref: 'held' }, 'has', { n: 4 }), false],
        ['held has 2 eggs', is({ ref: 'held' }, 'has', { n: 2, what: 'egg' }), true],
        ['held has 3 eggs', is({ ref: 'held' }, 'has', { n: 3, what: 'egg' }), false],
        ['robot has 1 stone', is({ ref: 'robot' }, 'has', { what: 'stone' }), true],
        ['held can empty', is({ ref: 'held' }, 'empty'), false, { holds: 'can', can: 2, canMax: 3, carry: [] }],
        ['held can full', is({ ref: 'held' }, 'full'), false, { holds: 'can', can: 2, canMax: 3, carry: [] }],
        ['held can has 2', is({ ref: 'held' }, 'has', { n: 2 }), true, { holds: 'can', can: 2, canMax: 3, carry: [] }],
        ['held can has 3', is({ ref: 'held' }, 'has', { n: 3 }), false, { holds: 'can', can: 2, canMax: 3, carry: [] }],
        ['a can chip, the can in hand, empty', is({ kind: 'can', x: 9, y: 9 }, 'empty'), true, { holds: 'can', can: 0, carry: [] }],
        ['a can chip, no can anywhere there', is({ kind: 'can', x: 9, y: 9 }, 'empty'), false],
        ['can (map) full', is(chip('cn', 'can', 0, 0), 'full'), true],
        ['can (map) empty', is(chip('cn', 'can', 0, 0), 'empty'), false],
        ['basket full', is(BK, 'full'), true],
        ['basket has 3', is(BK, 'has', { n: 3 }), true],
        ['basket empty', is(BK, 'empty'), false],
        ['bowl empty', is(chip('bw', 'bowl', 3, 0), 'empty'), true],
        ['bowl full', is(chip('bw', 'bowl', 3, 0), 'full'), false],
        ['store has 2', is(chip('st', 'store', 4, 0), 'has', { n: 2 }), true],
        ['store has 3', is(chip('st', 'store', 4, 0), 'has', { n: 3 }), false],
        ['store full', is(chip('st', 'store', 4, 0), 'full'), false],
        ['tulip thirsty', is(chip('tu', 'tulip', 0, 2), 'thirsty'), true],
        ['tulip drunk', is(chip('tu', 'tulip', 0, 2), 'drunk'), false],
        ['site dirt', is(chip('si', 'site', 4, 2), 'dirt'), true],
        ['site done', is(chip('si', 'site', 4, 2), 'done'), false],
        ['rock used', is(chip('rk', 'rock', 4, 1), 'used'), true],
        ['rock stones', is(chip('rk', 'rock', 4, 1), 'stones'), false],
        ['egg (chip, no id) front', is({ kind: 'egg', x: 3, y: 2 }, 'front'), true],
        ['basket front', is(BK, 'front'), false],
        ['basket purple (no such state)', is(BK, 'purple'), false],
        ['a chip of nothing', is(chip('zz', 'basket', 9, 9), 'empty'), false],
        ['an unknown ref', is({ ref: 'sky' }, 'nothing'), false],
        ['read (red_tulip: none here)', is({ ref: 'read' }, 'thirsty'), false]
      ];
      for (const [name, c, want, robot] of rows) expect({ name, got: E.evalCond(CW(robot), RUN, c) }).toEqual({ name, got: want });
    });

    it('🔴 VAL count / level / var / read / num / text, and COND cmp / and / or / not / sensor', () => {
      const w = CW();
      const vals: Array<[string, unknown, unknown, any?]> = [
        ['count egg ahead', { op: 'count', what: 'egg', thing: { ref: 'ahead' } }, 2],
        ['count egg in basket', { op: 'count', what: 'egg', thing: BK }, 4],
        ['count stone in basket', { op: 'count', what: 'stone', thing: BK }, 0],
        ['count stone in store', { op: 'count', what: 'stone', thing: chip('st', 'store', 4, 0) }, 2],
        ['count egg held', { op: 'count', what: 'egg', thing: { ref: 'held' } }, 2],
        ['count stone robot', { op: 'count', what: 'stone', thing: { ref: 'robot' } }, 1],
        ['count egg in the hen’s pen', { op: 'count', what: 'egg', thing: chip('hn', 'hen', 0, 1) }, 2],
        ['level basket', { op: 'level', thing: BK }, 4],
        ['level can', { op: 'level', thing: chip('cn', 'can', 0, 0) }, 3],
        ['level tulip', { op: 'level', thing: chip('tu', 'tulip', 0, 2) }, 1],
        ['level site', { op: 'level', thing: chip('si', 'site', 4, 2) }, 0],
        ['level rock', { op: 'level', thing: chip('rk', 'rock', 4, 1) }, 0],
        ['level held (what it carries)', { op: 'level', thing: { ref: 'held' } }, 3],
        ['level ahead', { op: 'level', thing: { ref: 'ahead' } }, 0],
        ['var n', V('n'), 3],
        ['var unset', V('nope'), 0],
        ['read', { op: 'read' }, 'red_tulip'],
        ['read, a word that is no object id', { op: 'read' }, 'Mamie', { ...RUN, lastAnswer: { object: '', value: 'Mamie' } }],
        ['read, nothing read', { op: 'read' }, '', { robotId: 'pip' }],
        ['num', num(4), 4],
        ['num not a number', num('x'), 0],
        ['text', text('hi'), 'hi']
      ];
      for (const [name, v, want, run] of vals) expect({ name, got: E.evalVal(w, run ?? RUN, v) }).toEqual({ name, got: want });
      const T = cmp('eq', num(1), num(1));
      const F = cmp('eq', num(1), num(2));
      const conds: Array<[string, unknown, boolean]> = [
        ['eggs in basket = 4', cmp('eq', { op: 'count', what: 'egg', thing: BK }, num(4)), true],
        ['eggs in basket < 5', cmp('lt', { op: 'count', what: 'egg', thing: BK }, num(5)), true],
        ['eggs in basket > 5', cmp('gt', { op: 'count', what: 'egg', thing: BK }, num(5)), false],
        ['texts: trimmed, any case', cmp('eq', text('  Red Tulip '), text('red tulip')), true],
        ['texts do not order', cmp('lt', text('a'), text('b')), false],
        ['a number text is a number', cmp('eq', text('4'), num(4)), true],
        ['var word = "red"', cmp('eq', V('word'), text('red')), true],
        ['read = red_tulip', cmp('eq', { op: 'read' }, text('red_tulip')), true],
        ['no such comparison', cmp('ne', num(1), num(2)), false],
        ['and T F', { op: 'and', a: T, b: F }, false],
        ['and T T', { op: 'and', a: T, b: T }, true],
        ['or T F', { op: 'or', a: T, b: F }, true],
        ['or F F', { op: 'or', a: F, b: F }, false],
        ['not F', { op: 'not', a: F }, true],
        ['not T', { op: 'not', a: T }, false],
        ['sensor count_is 2', { op: 'sensor', sensor: 'count_is', arg: 2 }, true],
        ['sensor wall_ahead', { op: 'sensor', sensor: 'wall_ahead' }, false],
        ['not (sensor tulip_ahead)', { op: 'not', a: { op: 'sensor', sensor: 'tulip_ahead' } }, true]
      ];
      for (const [name, c, want] of conds) expect({ name, got: E.evalCond(w, RUN, c) }).toEqual({ name, got: want });
    });

    it('🔴 a malformed expression reads false (a VAL: 0) and never throws — junk, missing operands, a thousand nots deep, a cycle', () => {
      const w = CW();
      let deep: any = { op: 'is', thing: { ref: 'here' }, state: 'nothing' };
      for (let i = 0; i < 1001; i++) deep = { op: 'not', a: deep };
      const cyc: any = { op: 'and' };
      cyc.a = cyc;
      cyc.b = cyc;
      const junk: unknown[] = [null, undefined, 0, 42, 'x', [], {}, { op: 'is' }, { op: 'is', thing: 5, state: 'full' }, { op: 'cmp' }, { op: 'cmp', cmp: 'eq', a: { op: 'count' }, b: null }, { op: 'and', a: {} }, { op: 'not' }, { op: 'not', a: 'x' }, { op: 'or', a: null, b: { op: 'sensor' } }, { op: 'is', thing: { ref: 'ahead' }, state: {} }, { op: 'is', thing: [], state: 'wall' }, deep, cyc];
      for (const c of junk) {
        expect(() => E.evalCond(w, RUN, c)).not.toThrow();
        expect({ c: typeof c === 'object' && c ? Object.keys(c as object).join() : String(c), got: E.evalCond(w, RUN, c) }).toEqual({ c: typeof c === 'object' && c ? Object.keys(c as object).join() : String(c), got: false });
      }
      // Known-firing: 1000 nots (even) around a true leaf is fine when it is shallow enough — two nots are true.
      expect(E.evalCond(w, RUN, { op: 'not', a: { op: 'not', a: { op: 'is', thing: { ref: 'here' }, state: 'nothing' } } })).toBe(true);
      let deepVal: any = num(1);
      for (let i = 0; i < 100; i++) deepVal = { op: 'count', what: 'egg', thing: deepVal };
      for (const v of [null, {}, { op: 'count' }, { op: 'level', thing: {} }, { op: 'var' }, { op: 'text', s: { x: 1 } }, deepVal]) expect(E.evalVal(w, RUN, v)).not.toBeUndefined();
      expect([null, {}, { op: 'count' }, { op: 'level', thing: {} }, { op: 'var' }].map((v) => E.evalVal(w, RUN, v))).toEqual([0, 0, 0, 0, 0]);
      expect(E.evalVal(w, RUN, { op: 'text', s: { x: 1 } })).toBe('');
      // A run with no world robot at all, and no run: false / 0.
      expect([E.evalCond(E.worldOf({ map: ['G'] }), RUN, is({ ref: 'here' }, 'nothing')), E.evalVal(w, null, num(3))]).toEqual([false, 3]);
    });
  });

  describe('set / change and run.vars; until and if on a cond; if with else', () => {
    it('🔴 set and change write run.vars (change by 1 when no by); the delta carries the vars after it', () => {
      const program = [blk(1, 'set', { name: 'n', value: num(2) }), blk(2, 'change', { name: 'n', by: num(3) }), blk(3, 'change', { name: 'n' }), blk(4, 'set', { name: 't', value: text('hi') }), blk(5, 'set', { name: 'e', value: { op: 'count', what: 'egg', thing: { ref: 'held' } } }), blk(6, 'set', { value: num(9) })];
      const end = runToEnd(program, { map: ['GG'], things: [], robots: [{ id: 'pip', x: 0, y: 0, d: 1, carry: ['egg', 'egg'] }] });
      expect(end.deltas.slice(0, 6).map((d) => [d.op, d.vars ?? null])).toEqual([
        ['set', { n: 2 }],
        ['change', { n: 5 }],
        ['change', { n: 6 }],
        ['set', { n: 6, t: 'hi' }],
        ['set', { n: 6, t: 'hi', e: 2 }],
        ['set', null]
      ]);
      expect(end.run.vars).toEqual({ n: 6, t: 'hi', e: 2 });
    });

    it.each(LANGS)('🔴 until (i = 3) { forward; change i } walks exactly three; the check says cond and its value; cond wins over a sensor left beside it — %s', (lang) => {
      const loop = (slots: Record<string, unknown>) => runToEnd([blk(1, 'set', { name: 'i', value: num(0) }), blk(2, 'until', slots, [blk(3, 'fwd'), blk(4, 'change', { name: 'i' })])], { map: G(7, 1), things: [], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] }, 'pip', lang);
      const end = loop({ cond: cmp('eq', V('i'), num(3)) });
      expect([end.world.robots[0].x, end.run.vars.i, end.run.guardHits, end.run.sensed.cond]).toEqual([3, 3, 0, 4]);
      expect(end.deltas.filter((d) => d.check).map((d) => d.check)).toEqual([false, false, false, true].map((value) => ({ sensor: 'cond', on: true, cond: true, value })));
      expect(loop({ sensor: 'wall_ahead', cond: cmp('eq', V('i'), num(2)) }).world.robots[0].x).toBe(2);
      // Known-firing: the sensor alone (no cond) walks to the edge, as before.
      expect(loop({ sensor: 'wall_ahead' }).world.robots[0].x).toBe(6);
    });

    it('🔴 if … else: the else runs when the check is false; an if with no else is as before; tricks and blocks inside an else are counted', () => {
      const ifElse = [blk(1, 'if', { cond: is({ ref: 'ahead' }, 'wall') }, [blk(2, 'left')], [blk(3, 'fwd')])];
      const open = runToEnd(ifElse, { map: G(3, 1), things: [], robots: [{ id: 'pip', x: 1, y: 0, d: 1 }] });
      expect([open.world.robots[0].x, open.world.robots[0].d, open.deltas[0].check]).toEqual([2, 1, { sensor: 'cond', on: true, cond: true, value: false }]);
      const wall = runToEnd(ifElse, { map: G(3, 1), things: [], robots: [{ id: 'pip', x: 2, y: 0, d: 1 }] });
      expect([wall.world.robots[0].x, wall.world.robots[0].d]).toEqual([2, 0]);
      const noElse = runToEnd([blk(1, 'if', { cond: is({ ref: 'ahead' }, 'wall') }, [blk(2, 'left')])], { map: G(3, 1), things: [], robots: [{ id: 'pip', x: 1, y: 0, d: 1 }] });
      expect([noElse.world.robots[0].x, noElse.world.robots[0].d, noElse.ticks]).toEqual([1, 1, 2]);
      // A trick defined inside an else is a trick; do runs it; the block count includes the else.
      const prog = [blk(1, 'if', { cond: F_() }, [blk(2, 'left')], [blk(3, 'trick', { name: 'hop' }, [blk(4, 'fwd')]), blk(5, 'right')]), blk(6, 'do', { name: 'hop' })];
      expect(runScript(NEW_RUN_SCRIPT, { program: prog, robotId: 'pip', lang: 'en' }).blocks).toBe(6);
      const hop = runToEnd(prog, { map: G(3, 3), things: [], robots: [{ id: 'pip', x: 1, y: 1, d: 0 }] });
      expect([hop.world.robots[0].x, hop.world.robots[0].y, hop.world.robots[0].d]).toEqual([2, 1, 1]);
    });
    function F_() {
      return cmp('eq', num(1), num(2));
    }

    it.each(LANGS)('🔴 “until [basket] is full” and “until count of 🥚 in [basket] = 4” both fill Mamie’s basket by seeking the eggs wherever they lie — %s', (lang) => {
      const BK = { id: 'bk', kind: 'basket', x: 0, y: 1 };
      const EGGS = () => ({ map: G(7, 3), things: [{ kind: 'basket', id: 'bk', x: 0, y: 1, count: 0, capacity: 4, item: 'egg' }, EGG(6, 0), EGG(6, 2), EGG(4, 0), EGG(4, 2), EGG(2, 2)], robots: [{ id: 'pip', x: 1, y: 1, d: 1 }] });
      const body = () => [nearest(2), blk(3, 'pick'), goTo(4, BK), blk(5, 'put')];
      for (const cond of [is(BK, 'full'), cmp('eq', { op: 'count', what: 'egg', thing: BK }, num(4))]) {
        const end = runToEnd([blk(1, 'until', { cond }, body())], EGGS(), 'pip', lang);
        const bk = end.world.things.find((t: any) => t.id === 'bk');
        expect({ op: cond.op, count: bk.count, eggs: end.world.things.filter((t: any) => t.kind === 'egg').length, carry: end.world.robots[0].carry, guard: end.run.guardHits, done: end.done }).toEqual({ op: cond.op, count: 4, eggs: 1, carry: [], guard: 0, done: true });
        // The four picked were the four nearest, each once.
        expect(new Set(end.deltas.filter((d) => d.pick).map((d) => `${d.pick.x},${d.pick.y}`)).size).toBe(4);
        expect(runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program: [], goal: { name: 'senses', args: ['cond', 1] } }).met).toBe(true);
        saidIn(lang, end.deltas);
      }
    });
  });

  it('🔴 AC4 regrowth on island ticks only: a Workshop run three times the longest source period long regrows no rock, lays no egg, brings no letter; wearOf on the same world does', () => {
    const SOURCES = () => ({ map: G(5, 2), things: [{ kind: 'rock', id: 'rk', x: 4, y: 0, left: 0, max: 3 }, { kind: 'hen', x: 0, y: 0, pen: [1, 1, 3, 1] }, { kind: 'postbox', x: 4, y: 1 }], robots: [{ id: 'pip', x: 2, y: 0, d: 0 }], seed: 5 });
    const longest = Math.max(WEAR.rock, WEAR.hen, WEAR.postbox);
    const idle = Array.from({ length: longest * 3 }, (_, i) => blk(i + 1, i % 2 ? 'left' : 'right'));
    const end = runToEnd(idle, SOURCES(), 'pip', 'en', [], longest * 3 + 5);
    expect([end.ticks >= longest * 3, end.world.things.find((t: any) => t.id === 'rk').left, end.world.things.filter((t: any) => t.kind === 'egg' || t.kind === 'letter')]).toEqual([true, 0, []]);
    // Known-firing: the island's wear at each period regrows, lays, brings a letter.
    const kinds = new Set<string>();
    let w: any = SOURCES();
    for (let age = 1; age <= longest; age++) for (const d of eng<any[]>('wearOf', w, age)) { for (const k of Object.keys(d)) kinds.add(k); w = eng('apply', w, d); }
    expect(['regrow', 'lay', 'letter'].filter((k) => kinds.has(k))).toEqual(['regrow', 'lay', 'letter']);
  });

  describe('arms: each IW-005 rule mutated in the engine text, and the row that kills it', () => {
    const mutate = (from: string, to: string) => {
      if (ENGINE.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
      return ENGINE.replace(from, to);
    };
    const AROUND = () => ({ map: ['GGGGGGG', 'LLLLLLG', 'GGGGGGG', 'GGGGGGG'], things: [EGG(1, 0, 'a'), EGG(5, 3, 'b')], robots: [{ id: 'pip', x: 1, y: 2, d: 1 }] });
    const walk = (A: any, program: Block[], world: any) => {
      let run = A.newRun(program, 'pip', 'en');
      let w = A.worldOf(world);
      const deltas: any[] = [];
      for (let i = 0; i < 80 && !run.done; i++) {
        const st = A.step(run, w, null);
        run = st.run;
        w = A.apply(w, st.delta);
        deltas.push(st.delta);
      }
      return { run, w, deltas };
    };
    it('nearest by straight line (not by path) → the AC1 row picks a, behind the wall', () => {
      const m = mutate('if (!best || st.n < best.st.n || (st.n === best.st.n && (t.y < best.t.y || (t.y === best.t.y && t.x < best.t.x)))) best = { t: t, st: st };', 'var sl = Math.abs(t.x - r.x) + Math.abs(t.y - r.y); if (!best || sl < best.sl) best = { t: t, st: st, sl: sl };');
      expect(walk(api(m), [nearest(1)], AROUND()).deltas[0].reserve.thing).toBe('a');
      expect(walk(E, [nearest(1)], AROUND()).deltas[0].reserve.thing).toBe('b');
    });
    it('no path cache (a search every tick) → the trap row counts five searches for one walk', () => {
      const m = mutate('  if (!t || !s.route) {\n    var ps = pathsFrom', '  if (true) {\n    var ps = pathsFrom');
      expect(walk(api(m), [nearest(1)], AROUND()).run.searches).toBe(5);
      expect(walk(E, [nearest(1)], AROUND()).run.searches).toBe(1);
    });
    it('the cond ignored (the legacy sensor read instead) → until (i = 2) walks to the wall', () => {
      const m = mutate('function checkOf(w, run, s) { return s.cond !== undefined ?', 'function checkOf(w, run, s) { return false ?');
      const prog = [blk(1, 'set', { name: 'i', value: num(0) }), blk(2, 'until', { sensor: 'wall_ahead', cond: cmp('eq', V('i'), num(2)) }, [blk(3, 'fwd'), blk(4, 'change', { name: 'i' })])];
      const world = { map: G(7, 1), things: [], robots: [{ id: 'pip', x: 0, y: 0, d: 1 }] };
      expect(walk(api(m), prog, world).w.robots[0].x).toBe(6);
      expect(walk(E, prog, world).w.robots[0].x).toBe(2);
    });
    it('the else never runs → the if/else row stays put', () => {
      const m = mutate('    else if (Array.isArray(s.alt)) run.steps.splice', '    else if (false) run.steps.splice');
      const prog = [blk(1, 'if', { cond: is({ ref: 'ahead' }, 'wall') }, [blk(2, 'left')], [blk(3, 'fwd')])];
      const world = { map: G(3, 1), things: [], robots: [{ id: 'pip', x: 1, y: 0, d: 1 }] };
      expect(walk(api(m), prog, world).w.robots[0].x).toBe(1);
      expect(walk(E, prog, world).w.robots[0].x).toBe(2);
    });
  });
});
