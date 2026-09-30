/**
 * P108 IW-003 — the missions as jobs: the engine gate of README §7 and IW-003 §5 (AC1, AC2, the hint rows of §6).
 *
 * Written by the session-3 orchestrator BEFORE the lanes (the s3 base); each lane turns its own rows green. Every row
 * names its lane, so a lane runs its own with `npx jest tests/iw003Missions.test.ts -t "\[M\]"`:
 *
 * - **[M]** Mamie Rose — tulip-door (the can folded in), tulips-three, eggs-count, rows-trick, mamie-note;
 * - **[S]** Sami's stones — path-stones, rock-flower, sami-bench (new: the first build);
 * - **[P]** the post — path-postbox, letter-say, sami-thanks, envelopes (new: Olive reads the name → go to that door);
 * - **[B]** Biscuit — bowl-if, wall-until, meow-when.
 *
 * Until every lane is merged this file is red for the lanes not merged yet (a missing mission, a mission not on the job
 * model yet). A lane's gate is its OWN rows' exit status; the merged tree's gate is the whole file.
 *
 * The rows:
 * 1. **is a job** (AC1): the request has a `job` (≥ 1 target, a home), its goal includes `job_done`, and no goal is
 *    `carrying` or `thing_at`.
 * 2. **wins on three seeds** (AC2): its reference program, in both languages, every band from its own up (band 7–9 runs
 *    it with every repeat unrolled and every trick inlined, as the engine gate's AC1 does), on seeds 1, 2, 3 — done,
 *    goal met, no bump, no puddle, inside the brain (BRAIN_SIZE), under the run cap, and the job's every WEAR period
 *    longer than the run (so a finished job is SEEN finished before it reopens).
 * 3. **teaches what it says** (AC2, README §7): a mission that teaches `until` (trick 3), a count (trick 6) or seeking
 *    (its reference walks with `go_nearest` / `go_to`) is `seeded`, and its lane's NAIVE program (the fixed `repeat N`
 *    or fixed walk a child writes instead) LOSES on at least one of the three seeds while winning on at least one (so
 *    it is a real near-miss, not a program that never works).
 * 4. **the layout varies**: a seeded mission lays at least two different worlds over seeds 1, 2, 3.
 * 5. **the hints**: a run that ends with the job part done says how much ({w} of {t}), never "Not quite yet".
 *
 * @module noodl-mcp/tests/iw003Missions.test
 */
import { BAND_PALETTE, Block, BRAIN_SIZE, GardenRequest, REQUESTS, WEAR, needsOf, ROBOTS, ROBOT_MOVES, ROBOT_CONTROLS } from './cg002Content';
import { APPLY_DELTA_SCRIPT, CHOOSE_HINT_SCRIPT, ENGINE, GOAL_SCRIPT, MAX_TICKS, NEW_RUN_SCRIPT, STEP_SCRIPT, helper, runScript } from './cg002Scripts';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { writtenAnswer } = require('../../../dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/olive-written.js');
import { OLIVE_TABLE } from './cg005Olive';

// ── The lanes and their missions (the brief's §4 table) ─────────────────────────────────────────────────────────────

export const LANES: Readonly<Record<'M' | 'S' | 'P' | 'B', ReadonlyArray<string>>> = {
  M: ['tulip-door', 'tulips-three', 'eggs-count', 'rows-trick', 'mamie-note'],
  S: ['path-stones', 'rock-flower', 'sami-bench'],
  P: ['path-postbox', 'letter-say', 'sami-thanks', 'envelopes'],
  B: ['bowl-if', 'wall-until', 'meow-when']
};
const SEEDS = [1, 2, 3] as const;

// ── The naive programs (row 3): each lane appends its own block, one entry per mission that teaches until/count/seek ──
// A NAIVE program is what a child writes INSTEAD of sensing: the fixed `repeat N` or the fixed walk that happens to fit
// one layout. Ids are any whole numbers (the engine never reads them for meaning).

// [M] Mamie's lane:
const NAIVE_M: Record<string, Block[]> = {};
// [S] Sami's stones lane:
/** A walk as a child records it with the pad: F forward, L left, R right, K pick up, D put down. */
const walkS = (src: string): Block[] => src.split(' ').map((c, i) => ({ id: i + 1, t: ({ F: 'fwd', L: 'left', R: 'right', K: 'pick', D: 'put' } as Record<string, Block['t']>)[c] }));
const NAIVE_S: Record<string, Block[]> = {
  // The path taught on day 1 (seed 1: the rocks at (2,1) and (5,1)), step by step — what go to nearest walked that day.
  // The next day the rocks lie elsewhere: the first pick reaches for a rock that is not there, and no square fills.
  'path-stones': walkS('L F K K K K R F R D D D D R R F L K K K K R R F R F D D D D L F L K K K K R R D D D D R R K K K K R F R D D D D'),
  // The bench by fours: a fixed "pick four" from the nearest rock, twice. On a day the nearest rock holds fewer than
  // four, the fifth pick finds it used up (a bump) and the bench stays short; on a day of fours it is built.
  'sami-bench': [
    {
      id: 1,
      t: 'repeat',
      n: 2,
      body: [
        { id: 2, t: 'go_nearest', slots: { kind: 'rock' } },
        { id: 3, t: 'repeat', n: 4, body: [{ id: 4, t: 'pick' }] },
        { id: 5, t: 'go_to', slots: { thing: { id: 'bench', kind: 'site', x: 4, y: 2 } } },
        { id: 6, t: 'repeat', n: 4, body: [{ id: 7, t: 'put' }] }
      ]
    }
  ]
};
// [P] the post lane:
// envelopes: the child who skips Olive and walks the letters to the three doors in a row — the order that happens to be
// seed 1's deal (Biscuit, Mamie Rose, Sami). On seeds 2 and 3 a door refuses the letter (wrongDoor) and the job stays open.
const P_BOX = { id: 'postbox', kind: 'postbox', x: 2, y: 2 };
const P_DOOR = (id: string, x: number) => ({ id, kind: 'door', x, y: 1 });
const NAIVE_P: Record<string, Block[]> = {
  envelopes: [
    ['door-biscuit', 7],
    ['door-mamie', 1],
    ['door-sami', 4]
  ].flatMap(([door, x], k) => [
    { id: 10 * k + 1, t: 'go_to', slots: { thing: P_BOX } },
    { id: 10 * k + 2, t: 'pick' },
    { id: 10 * k + 3, t: 'go_to', slots: { thing: P_DOOR(String(door), Number(x)) } },
    { id: 10 * k + 4, t: 'put' }
  ]) as Block[]
};
// [B] Biscuit's lane:
const NAIVE_B: Record<string, Block[]> = {
  // wall-until: the ball fetched with an until, then the way back counted — four steps home fits a wall at 6, walks into
  // the basket when the wall is at 5 (a bump) and stops a tile short when it is at 7 (the ball dropped on the path).
  'wall-until': [
    { id: 1, t: 'until', slots: { sensor: 'wall_ahead' }, body: [{ id: 2, t: 'fwd' }] },
    { id: 3, t: 'left' },
    { id: 4, t: 'pick' },
    { id: 5, t: 'left' },
    { id: 6, t: 'repeat', n: 4, body: [{ id: 7, t: 'fwd' }] },
    { id: 8, t: 'put' }
  ]
};
const NAIVE: Record<string, Block[]> = { ...NAIVE_M, ...NAIVE_S, ...NAIVE_P, ...NAIVE_B };

// ── Harness (the engine gate's own loop: Step, then Apply delta; Olive answered by her written answer) ────────────────

/** The world a request opens on, laid from `seed` the way Start world lays it. */
function worldOf(r: GardenRequest, seed: number) {
  const rs = r.robotStart;
  const robot: Record<string, unknown> = { id: 'pip', x: rs.x, y: rs.y, d: rs.d };
  if (rs.carry) robot.carry = [...rs.carry];
  if (rs.basket) robot.basket = rs.basket;
  if (rs.can !== undefined) robot.can = rs.can;
  if (rs.canMax !== undefined) robot.canMax = rs.canMax;
  const world = { map: [...r.map], things: r.things.map((t) => ({ ...t })), robots: [robot], schedule: r.schedule ? r.schedule.map((s) => ({ ...s })) : [] };
  return helper<any>(ENGINE, 'seedWorld', world, JSON.parse(JSON.stringify(r)), seed);
}

function runToEnd(program: ReadonlyArray<Block>, world: any, lang: string) {
  let run = runScript(NEW_RUN_SCRIPT, { program, robotId: 'pip', lang }).run;
  let ticks = 0;
  let done = false;
  const tick = (r: any, w: any, answer: unknown = null) => {
    const st = runScript(STEP_SCRIPT, { run: r, world: w, answer });
    return { st, run: st.run, world: runScript(APPLY_DELTA_SCRIPT, { world: w, delta: st.delta }).world };
  };
  while (ticks < MAX_TICKS) {
    let t = tick(run, world);
    if (t.st.waiting) {
      const q = t.st.request;
      const a = { ok: false, fallback: true, ...(writtenAnswer(OLIVE_TABLE, q.rung, q.slots, q.lang) || {}) };
      t = tick(t.st.run, t.world, { seq: q.seq, ...a });
    }
    run = t.run;
    world = t.world;
    ticks++;
    if (t.st.done) {
      done = true;
      break;
    }
  }
  return { run, world, done, ticks };
}

/** Band 7–9's child records primitives: every repeat unrolled, every trick inlined (the engine gate's AC1 rule). */
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
    if (Array.isArray((b as any).else)) typesIn((b as any).else, out);
  }
  return out;
}
const countBlocks = (list: ReadonlyArray<Block>): number => list.reduce((n, b) => n + 1 + countBlocks(b.body ?? []) + countBlocks(((b as any).else as Block[]) ?? []), 0);
const goalsOf = (r: GardenRequest) => (Array.isArray(r.goal) ? r.goal : [r.goal]) as ReadonlyArray<{ name: string }>;
const met = (r: GardenRequest, program: ReadonlyArray<Block>, end: { world: any; run: any }) => runScript(GOAL_SCRIPT, { world: end.world, run: end.run, program, goal: r.goal });
const teaches = (r: GardenRequest) => r.tricks.includes(3) || r.tricks.includes(6) || typesIn(r.referenceProgram).has('go_nearest') || typesIn(r.referenceProgram).has('go_to');
const req = (id: string) => REQUESTS.find((r) => r.id === id);

// ── The rows ────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('IW-003 — the missions as jobs (the engine gate, README §7)', () => {
  it('the lanes cover every request, each once, and name the two new missions', () => {
    const all = Object.values(LANES).flat();
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...REQUESTS.map((r) => r.id)].sort());
  });

  for (const [lane, ids] of Object.entries(LANES)) {
    for (const id of ids) {
      describe(`[${lane}] ${id}`, () => {
        it(`[${lane}] ${id} exists and is a job: job targets + home, goal job_done, no carrying / thing_at win`, () => {
          const r = req(id);
          expect({ id, exists: !!r }).toEqual({ id, exists: true });
          const job = r!.job;
          expect({ id, targets: (job?.targets.length ?? 0) > 0, home: !!job?.home }).toEqual({ id, targets: true, home: true });
          const names = goalsOf(r!).map((g) => g.name);
          expect({ id, jobDone: names.includes('job_done'), old: names.filter((n) => n === 'carrying' || n === 'thing_at') }).toEqual({ id, jobDone: true, old: [] });
        });

        it(`[${lane}] ${id} wins with its reference program on seeds 1, 2, 3, EN and FR, every band from its own`, () => {
          const r = req(id);
          expect({ id, exists: !!r }).toEqual({ id, exists: true });
          const robot = ROBOTS.find((x) => x.id === needsOf(r!))!;
          const can = new Set<string>([...ROBOT_MOVES, ...ROBOT_CONTROLS, ...robot.palette]);
          const longest = { ticks: 0 };
          for (const band of [1, 2] as const) {
            if (band < r!.band) continue;
            const program = band === 1 ? unrolled(r!.referenceProgram) : r!.referenceProgram;
            // Every block is the band's, the request's and the robot's; the brain holds it (band 10–12's program).
            const olive = (t: string) => t.startsWith('olive:') && band === 2 && (r!.rungs ?? []).includes(t.slice(6));
            for (const t of typesIn(program)) expect({ id, band, t, band_: BAND_PALETTE[band].includes(t as any) || olive(t), request: r!.palette.includes(t as any) || olive(t), robot: can.has(t) }).toEqual({ id, band, t, band_: true, request: true, robot: true });
            if (band === 2 || r!.band === 1) expect({ id, band, blocks: countBlocks(r!.referenceProgram) <= BRAIN_SIZE }).toEqual({ id, band, blocks: true });
            for (const lang of ['en', 'fr']) for (const seed of SEEDS) {
              const end = runToEnd(program, worldOf(r!, seed), lang);
              const g = met(r!, program, end);
              expect({ id, band, lang, seed, done: end.done, met: g.met, missing: g.missing, bumps: end.run.bumps, puddles: end.run.puddles }).toEqual({ id, band, lang, seed, done: true, met: true, missing: [], bumps: 0, puddles: 0 });
              longest.ticks = Math.max(longest.ticks, end.ticks);
            }
          }
          // The job wears no sooner than the run takes: every TARGET's wear period is longer than the longest run (a
          // source regrowing sooner is harmless — it only refills; IW-002 §6's rule).
          const w1 = worldOf(r!, 1);
          const targetOf = (t: string | readonly [number, number]) => (Array.isArray(t) ? w1.things.find((x: any) => x.x === t[0] && x.y === t[1]) : w1.things.find((x: any) => String(x.id) === String(t)));
          const kinds = new Set((r!.job?.targets ?? []).map(targetOf).filter((t: any) => t && WEAR[t.kind as keyof typeof WEAR] !== undefined).map((t: any) => t.kind as keyof typeof WEAR));
          for (const k of kinds) expect({ id, kind: k, period: WEAR[k] > longest.ticks }).toEqual({ id, kind: k, period: true });
        });

        it(`[${lane}] ${id} teaches what it says: seeded where it teaches until / a count / seeking, and a fixed program loses on a seed`, () => {
          const r = req(id);
          expect({ id, exists: !!r }).toEqual({ id, exists: true });
          if (!teaches(r!)) return;
          expect({ id, seeded: !!r!.seeded, naive: !!NAIVE[id] }).toEqual({ id, seeded: true, naive: true });
          const outcomes = SEEDS.map((seed) => {
            const end = runToEnd(NAIVE[id], worldOf(r!, seed), 'en');
            return end.done && met(r!, NAIVE[id], end).met;
          });
          expect({ id, losesOnOne: outcomes.includes(false), winsOnOne: outcomes.includes(true) }).toEqual({ id, losesOnOne: true, winsOnOne: true });
          const layouts = new Set(SEEDS.map((seed) => { const w = worldOf(r!, seed); return JSON.stringify({ map: w.map, things: w.things }); }));
          expect({ id, layouts: layouts.size >= 2 }).toEqual({ id, layouts: true });
        });

        it(`[${lane}] ${id}: a run that ends with the job part done names how much, never "Not quite yet"`, () => {
          const r = req(id);
          expect({ id, exists: !!r }).toEqual({ id, exists: true });
          // An empty run's end: the untouched world, one tick taken (a program of one turn).
          const program: Block[] = [{ id: 1, t: 'left' }];
          const end = runToEnd(program, worldOf(r!, 1), 'en');
          const hint = runScript(CHOOSE_HINT_SCRIPT, { world: end.world, program, run: end.run, goalMet: false, freePlay: false, allowed: [...r!.palette] });
          expect({ id, key: hint.key }).not.toEqual({ id, key: 'hintNotYet' });
          if (!r!.rungs?.length) expect({ id, key: hint.key, total: hint.vars?.t > 0 }).toEqual({ id, key: 'iw3Job', total: true });
        });
      });
    }
  }

  it('the job hints: no can in hand → iw3NoCan; a job 1 of 2 full → iw3Job {w: 1, t: 2}', () => {
    const world = {
      map: ['GGGG', 'GGGG'],
      things: [
        { kind: 'tulip', id: 'a', x: 1, y: 0, have: 3, need: 3 },
        { kind: 'tulip', id: 'b', x: 3, y: 0, have: 0, need: 3 },
        { kind: 'can', id: 'can', x: 0, y: 1, level: 0, max: 3 }
      ],
      robots: [{ id: 'pip', x: 1, y: 1, d: 0 }],
      job: { targets: ['a', 'b'], home: { x: 0, y: 0 } }
    };
    const program: Block[] = [{ id: 1, t: 'left' }];
    const end = runToEnd(program, JSON.parse(JSON.stringify(world)), 'en');
    expect(runScript(CHOOSE_HINT_SCRIPT, { world: end.world, program, run: end.run, goalMet: false }).key).toBe('iw3Job');
    expect(runScript(CHOOSE_HINT_SCRIPT, { world: end.world, program, run: end.run, goalMet: false }).vars).toEqual({ w: 1, t: 2 });
    const water: Block[] = [{ id: 1, t: 'water' }];
    const dry = runToEnd(water, JSON.parse(JSON.stringify(world)), 'en');
    expect(runScript(CHOOSE_HINT_SCRIPT, { world: dry.world, program: water, run: dry.run, goalMet: false }).key).toBe('iw3NoCan');
  });

  it('the seeded layouts of the s3 base: choose, shuffle and place are laid from the seed after the wall and the eggs', () => {
    const REQ = {
      id: 'fixture',
      seeded: {
        wallAt: [5, 7],
        choose: [{ thing: 'note', field: 'text', among: ['red', 'yellow'] }],
        shuffle: { things: ['e1', 'e2', 'e3'], field: 'to', values: ['Mamie', 'Sami', 'Biscuit'] },
        place: [{ thing: 'ball', among: [[1, 1], [2, 1], [3, 1]] }]
      },
      robotStart: { x: 0, y: 3, d: 1 }
    };
    const base = () => ({ map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP'], things: [{ kind: 'note', id: 'note', x: 0, y: 0 }, { kind: 'letter', id: 'e1', x: 0, y: 1 }, { kind: 'letter', id: 'e2', x: 0, y: 1 }, { kind: 'letter', id: 'e3', x: 0, y: 1 }, { kind: 'ball', id: 'ball', x: 0, y: 2 }], robots: [] });
    const laid = (seed: number) => helper<any>(ENGINE, 'seedWorld', base(), JSON.parse(JSON.stringify(REQ)), seed);
    expect(JSON.stringify(laid(7))).toBe(JSON.stringify(laid(7)));
    const texts = new Set<string>(), balls = new Set<string>(), deals = new Set<string>();
    for (let s = 1; s <= 30; s++) {
      const w = laid(s);
      const byId = (id: string) => w.things.find((t: any) => t.id === id);
      texts.add(byId('note').text);
      balls.add(`${byId('ball').x},${byId('ball').y}`);
      const deal = ['e1', 'e2', 'e3'].map((id) => byId(id).to);
      expect([...deal].sort()).toEqual(['Biscuit', 'Mamie', 'Sami']);
      deals.add(deal.join('|'));
      // The wall is drawn first, so it is exactly where a request with only wallAt puts it on this seed.
      const wallOnly = helper<any>(ENGINE, 'seedWorld', base(), { id: 'w', seeded: { wallAt: [5, 7] }, robotStart: { x: 0, y: 3, d: 1 } }, s);
      expect(w.map).toEqual(wallOnly.map);
    }
    expect([texts.size, balls.size, deals.size >= 4]).toEqual([2, 3, true]);
  });
});
