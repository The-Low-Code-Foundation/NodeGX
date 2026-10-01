/**
 * P108 session 7 — IW-007's small owed items and R5, each rule with a row and an ARM (the rule mutated at one anchor goes
 * red, asserted):
 *
 * 1. **R5, the Workshop's run cap** (Richard, 2026-10-01: "~400 ticks"): `RUN_CAP` is at least twice the longest WINNING
 *    run there is — every mission's reference program on three seeds, and a one-part job on her land (the longest).
 * 2. **Two robots' name pills never cover each other** (`pillSides`, both kits; s6's "Cobble ²ip" at a plot's home).
 * 3. **The spa's rest**: once her spa is finished, a robot whose job is done walks to a tile in front of it (`restOf`,
 *    `landJob`'s `rest`) — the shop's own words ("Robots rest there when a job is done") were a promise nothing kept.
 * 4. **A helper's drops earn** (IW-008's second robot on a plot, her land's helper): its own lap pays its own fill.
 * 5. **A fed animal gives her present** when a robot fills her bowl right up (ANIMALS' gift): shells and a line.
 *
 * @module noodl-mcp/tests/p108s7.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as React from 'react';
import { ANIMALS, LAND_HOME, LAND_ID, REQUESTS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, APPLY_DELTA_SCRIPT, COMPLETE_REQUEST_SCRIPT, ENGINE, MAX_TICKS, NEW_RUN_SCRIPT, RUN_CAP, STEP_SCRIPT, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT, START_WORLD_SCRIPT } from './cg003Scripts';
import { OLIVE_TABLE } from './cg005Olive';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { ISLAND_KEEP_SCRIPT } from './iw006Earn';
import { LAND_REQUEST_SCRIPT } from './iw007Building';
import { LAND_SCRIPT } from './iw007Land';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { writtenAnswer } = require('../../../dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/olive-written.js');

const WORDS = JSON.parse(ALL_WORDS_JSON);
const W = (key: string, lang: 'en' | 'fr' = 'en'): string => WORDS.find((w: any) => w.key === key)[lang];
const J = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const bare = (s: string, i: Record<string, unknown>) => J(runScript(s, J(i)));
const blk = (id: number, t: string, extra: Record<string, unknown> = {}) => ({ id, t, ...extra });
const is = (thing: Record<string, unknown>, state: string) => ({ op: 'is', thing, state });
const carry = (part: Record<string, unknown>, source: string, base = 1) => [
  blk(base, 'until', { slots: { cond: is(part, 'done') }, body: [blk(base + 1, 'go_nearest', { slots: { kind: source } }), blk(base + 2, 'pick'), blk(base + 3, 'go_to', { slots: { thing: part } }), blk(base + 4, 'put')] })
];
const STONE = { id: 'b1-stone', kind: 'site', x: 3, y: 1 };
const PLANK = { id: 'b1-plank', kind: 'site', x: 4, y: 1 };
const STONES = carry(STONE, 'rock', 1);
const PLANKS = carry(PLANK, 'tree', 10);
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const cobble = () => ({ id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none' });
/** A source mutated at one anchor (exactly one), for an arm. */
function arm(src: string, anchor: string, by: string): string {
  expect(src.split(anchor).length).toBe(2);
  return src.replace(anchor, by);
}
/** A family with Cobble lent and `land` on her land. */
function family(land: unknown) {
  const m = runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
  const p = active(m);
  p.island.robots.push(cobble());
  p.island.land = land;
  return m;
}
const win = (model: any, program: unknown[], robotId: string) => bare(COMPLETE_REQUEST_SCRIPT, { model, requestId: LAND_ID, program: JSON.stringify(program), robotId, now: 1759300000000 }).model;
/** Pip taught the stones and Cobble the planks on her land (Cobble helps), as the touch drive teaches them. */
const crew = (land: unknown) => win(win(family(land), STONES, 'r1'), PLANKS, 'cobble');

/** Her island as the Island page builds it, from the family as Read family gives it (the held state as Kept). */
function build(model: any, kept?: unknown, tick = ISLAND_WORLD_SCRIPT) {
  const f = runScript(FAMILY_SCRIPT, { model });
  return runScript(tick, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land, kept });
}
/** The Island page for `ticks` ticks: the tick, Island keep after each, a write built again from the store (iw006Earn's `play`). */
function play(model: any, ticks: number, o: { tick?: string; keep?: string } = {}) {
  let m = model;
  let built = build(m).state;
  let state = built;
  const lines: string[] = [];
  for (let t = 0; t < ticks; t++) {
    state = runScript(o.tick ?? ISLAND_TICK_SCRIPT, { state, built }).state;
    const f = runScript(FAMILY_SCRIPT, { model: m });
    const k = runScript(o.keep ?? ISLAND_KEEP_SCRIPT, { state, model: m, robots: f.robots, words: WORDS, lang: 'en' });
    if (k.due) {
      m = k.model;
      if (k.text) lines.push(k.text);
      built = build(m, state).state;
      if (built.build === state.build) state = built;
    }
  }
  return { model: m, state, lines, earned: active(m).shells.earned as number };
}

// ── 1. R5 ────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('R5 — the Workshop’s run cap (Richard: ~400 ticks)', () => {
  /** A mission's reference program to its end, Olive answered by her written line (iw003Missions' harness). */
  function ticksOf(r: any, seed: number) {
    const rs = r.robotStart;
    const robot: Record<string, unknown> = { id: 'pip', x: rs.x, y: rs.y, d: rs.d };
    for (const k of ['carry', 'basket', 'can', 'canMax']) if (rs[k] !== undefined) robot[k] = J(rs[k]);
    let world = helper<any>(ENGINE, 'seedWorld', { map: [...r.map], things: J(r.things), robots: [robot], schedule: J(r.schedule ?? []) }, J(r), seed);
    let run = runScript(NEW_RUN_SCRIPT, { program: r.referenceProgram, robotId: 'pip', lang: 'en' }).run;
    for (let t = 1; t <= MAX_TICKS; t++) {
      let st = runScript(STEP_SCRIPT, { run, world, answer: null });
      if (st.waiting) {
        const q = st.request;
        st = runScript(STEP_SCRIPT, { run: st.run, world, answer: { seq: q.seq, ok: false, fallback: true, ...(writtenAnswer(OLIVE_TABLE, q.rung, q.slots, q.lang) || {}) } });
      }
      run = st.run;
      world = runScript(APPLY_DELTA_SCRIPT, { world, delta: st.delta }).world;
      if (st.done) return t;
    }
    return -1;
  }
  /** One part of a building on her land carried by one robot from her land's start, in the Workshop's world. */
  function landTicks(bp: string) {
    const m = family({ buildings: [{ id: 'b1', bp, x: 3, y: 1, have: {} }], animals: [] });
    const f = runScript(FAMILY_SCRIPT, { model: m });
    const reqs = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: f.land }).requests;
    const s = bare(START_WORLD_SCRIPT, { requests: reqs, requestId: LAND_ID, seed: 1 });
    return s.world.things
      .filter((t: any) => t.of === 'b1')
      .map((p: any) => {
        const end: any = helper(ENGINE, 'runToEnd', carry({ id: p.id, kind: 'site', x: p.x, y: p.y }, p.item === 'stone' ? 'rock' : 'tree'), J(s.world), 'r1', 'en');
        expect({ bp, part: p.id, known: end.known }).toEqual({ bp, part: p.id, known: true });
        return end.ticks as number;
      });
  }

  it('RUN_CAP is 400, under MAX_TICKS, and at least twice the longest winning run (missions on seeds 1–3; a part on her land)', () => {
    const missions = REQUESTS.map((r) => Math.max(...[1, 2, 3].map((seed) => ticksOf(r, seed))));
    expect(missions.filter((t) => t < 0)).toEqual([]);
    const land = [...landTicks('spa'), ...landTicks('refuge')];
    const longest = Math.max(...missions, ...land);
    // Measured 2026-10-01: missions ≤ 110 (path-stones), her land 134 (the spa's stones). Known-firing: the reading is real.
    expect([RUN_CAP, RUN_CAP < MAX_TICKS, longest > 100, 2 * longest <= RUN_CAP]).toEqual([400, true, true, true]);
  });
});

// ── 2. Name pills ────────────────────────────────────────────────────────────────────────────────────────────────────

describe('two robots’ name pills never cover each other (pillSides; s6: “Cobble ²ip” at home)', () => {
  const LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');
  const kit = (dir: string, file: string, name: string) => {
    const modules: any[] = [];
    const context: Record<string, any> = { Noodl: { defineModule: (m: any) => modules.push(m) }, React, console, setTimeout, clearTimeout };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(LIBRARY, dir, 'project', 'noodl_modules', dir, file), 'utf8'), context, { filename: `${dir}/${file}` });
    return modules[0].reactNodes.find((n: any) => n.name === name);
  };
  const two = kit('garden-kit', 'index.js', 'garden-kit.Garden').world.pillSides as (i: unknown[]) => boolean[];
  const three = kit('garden-3d-kit', 'index.js', 'garden-3d-kit.Garden3D').world.pillSides as (i: unknown[]) => boolean[];
  /**
   * A robot on tile (x, y) of `tile` px, its name `w` px wide — the 2D kit's geometry: the robot's box is the tile, at least
   * the kit's ROBOT_MIN_PX (56: on the island it is 3½ tiles), its pill (19 px) at 92% of it, or over it at 8%.
   */
  const MIN = kit('garden-kit', 'index.js', 'garden-kit.Garden').sprite.minPx as number;
  const at = (x: number, y: number, tile: number, w: number) => {
    const box = Math.max(tile, MIN);
    return { x: (x + 0.5) * tile, below: (y + 0.5) * tile + 0.42 * box, above: (y + 0.5) * tile - 0.42 * box, w, h: 19 };
  };
  const rect = (it: any, up: boolean) => ({ l: it.x - it.w / 2, r: it.x + it.w / 2, t: up ? it.above - it.h : it.below, b: up ? it.above : it.below + it.h });
  const overlaps = (items: any[], ups: boolean[]) => {
    const rs = items.map((it, i) => rect(it, ups[i]));
    let n = 0;
    for (let i = 0; i < rs.length; i++) for (let k = i + 1; k < rs.length; k++) if (rs[i].l < rs[k].r && rs[k].l < rs[i].r && rs[i].t < rs[k].b && rs[k].t < rs[i].b) n++;
    return n;
  };
  // The island at 1368: a tile ~16 px, "Pip" 34 px and "Cobble" 52 px wide; Pip at home, Cobble on the tile beside.
  const HOME = [at(0, 0, 16, 34), at(1, 0, 16, 52)];

  it('at a plot’s home on the island: the second pill goes over its robot, and nothing covers anything', () => {
    expect([MIN, two(HOME)]).toEqual([56, [false, true]]);
    expect([overlaps(HOME, [false, false]), overlaps(HOME, two(HOME))]).toEqual([1, 0]);
  });

  it('known-firing: the Workshop (a 60 px tile) and robots far apart keep every pill under; one robot, or one with no name, never moves', () => {
    expect(two([at(0, 0, 60, 34), at(1, 0, 60, 52)])).toEqual([false, false]);
    expect(two([at(0, 0, 16, 34), at(6, 0, 16, 52)])).toEqual([false, false]);
    expect(two([at(0, 0, 16, 34)])).toEqual([false]);
    expect(two([at(0, 0, 16, 0), at(1, 0, 16, 52)])).toEqual([false, false]);
    // A crew of three in a row: the middle one over, the third under (its over would meet the middle one's).
    const row = [at(0, 0, 16, 40), at(1, 0, 16, 40), at(2, 0, 16, 40)];
    expect(two(row)).toEqual([false, true, false]);
  });

  it('a robot right above another (a helper on the tile below, or one walking past): the UPPER one’s pill goes over — whichever robot comes first', () => {
    const stack = [at(0, 0, 16, 34), at(0, 1, 16, 52)];
    expect([two(stack), two([stack[1], stack[0]])]).toEqual([[true, false], [false, true]]);
    expect([overlaps(stack, [false, false]), overlaps(stack, two(stack))]).toEqual([1, 0]);
  });

  it('🔴 the 3D kit’s copy gives garden-kit’s answers (the two copies cannot drift unseen)', () => {
    const cases = [HOME, [at(0, 0, 60, 34), at(1, 0, 60, 52)], [at(0, 0, 16, 40), at(1, 0, 16, 40), at(2, 0, 16, 40)], [at(0, 0, 16, 34), at(0, 1, 16, 52)], [at(0, 1, 16, 52), at(0, 0, 16, 34)], [], [null, { w: 'x' }], 'junk'];
    for (const c of cases) expect({ c, got: three(c as any) }).toEqual({ c, got: two(c as any) });
  });

  it('ARM: a pillSides that never sends a pill over leaves the two at home covering each other', () => {
    const src = fs.readFileSync(path.join(LIBRARY, 'garden-kit', 'src', 'kit.js'), 'utf8');
    const from = src.indexOf('  function pillSides(items) {');
    const body = src.slice(from, src.indexOf('\n    return out;\n  }\n', from) + '\n    return out;\n  }\n'.length);
    const mutant = new Function(`${arm(body, 'var goUp = meets(down) && !meets(up);', 'var goUp = false;')}; return pillSides;`)();
    expect(overlaps(HOME, mutant(HOME))).toBe(1);
  });
});

// ── 3. The spa's rest ────────────────────────────────────────────────────────────────────────────────────────────────

describe('the spa’s rest — robots whose job is done walk to her finished spa', () => {
  // Two rows in front of the spa at (3, 1), one tile out at each end: on the 2D island a robot is ~2½ tiles wide, and on
  // the row right under it the two hid the spa and each other (the touch drive's shot, s7).
  const REST = [{ x: 2, y: 3, d: 0 }, { x: 5, y: 3, d: 0 }];
  const spot = (r: any) => (r ? { x: r.x, y: r.y, d: r.d } : null);
  const land = (s: any) => s.live[LAND_ID];

  it('landJob gives the spa’s rest (a tile per robot in front of it, clear of it); next to the spa’s left edge the next free spot is taken; a land with only the refuge has none', () => {
    const job = helper<any>(LAND_SCRIPT, 'landJob', { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: {} }], animals: [] });
    expect([job.home, job.rest]).toEqual([LAND_HOME, { of: 'b1', tiles: REST }]);
    expect(helper<any>(LAND_SCRIPT, 'landJob', { buildings: [{ id: 'b1', bp: 'spa', x: 0, y: 1, have: {} }], animals: [] }).rest.tiles).toEqual([{ x: 2, y: 3, d: 0 }, { x: 0, y: 2, d: 0 }]);
    expect(helper<any>(LAND_SCRIPT, 'landJob', { buildings: [{ id: 'r', bp: 'refuge', x: 3, y: 3, have: {} }], animals: [] }).rest).toBeUndefined();
  });

  it('Pip (stones) and Cobble (planks) build the spa on the island, then rest in front of it, facing it — not at her land’s home', () => {
    const end = play(crew({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] }), 360);
    const lv = land(end.state);
    expect(lv.things.filter((t: any) => t.of === 'b1').map((t: any) => [t.have, t.need])).toEqual([[6, 6], [4, 4]]);
    expect([lv.phase, spot(lv.robot), lv.mate.phase, spot(lv.mate.robot)]).toEqual(['wait', REST[0], 'wait', REST[1]]);
  });

  it('known-firing: a done job with the spa NOT finished (its planks short, the refuge done) goes home as before', () => {
    const lv = land(play(crew({ buildings: [{ id: 'r', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 3 } }, { id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] }), 40).state);
    // Not done: still at work (no rest while the spa is going up).
    expect(lv.phase).not.toBe('wait');
    expect(helper<any>(ENGINE, 'restOf', { map: ['GGGGG'], things: [{ kind: 'site', of: 'b1', have: 5, need: 6 }], robots: [{ id: 'a' }], job: { targets: [], rest: { of: 'b1', tiles: REST } } }, { id: 'a' })).toBeNull();
    expect(helper<any>(ENGINE, 'restOf', { map: ['GGGGG'], things: [{ kind: 'site', of: 'b1', have: 6, need: 6 }], robots: [{ id: 'a' }, { id: 'b' }], job: { targets: [], rest: { of: 'b1', tiles: REST } } }, { id: 'b' })).toEqual(REST[1]);
  });

  it('a save kept with the job done: the island built again (an app restart) has Pip waiting at his rest, not at home', () => {
    const m = play(crew({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] }), 360).model;
    const lv = land(build(m).state);
    expect([lv.phase, spot(lv.robot)]).toEqual(['wait', REST[0]]);
  });

  it('ARM: the engine without the rest — the two end at her land’s home and the tile beside it', () => {
    const tick = arm(ISLAND_TICK_SCRIPT, '  var rest = restOf(w, r);\n  if (rest) return rest;', '');
    const lv = land(play(crew({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] }), 360, { tick }).state);
    expect([lv.phase, spot(lv.robot)]).toEqual(['wait', { x: LAND_HOME.x, y: LAND_HOME.y, d: LAND_HOME.d }]);
    expect(spot(lv.mate.robot)).not.toEqual(REST[1]);
  });
});

// ── 4. A helper's drops earn ─────────────────────────────────────────────────────────────────────────────────────────

describe('a helper’s drops earn (its own lap pays its own fill)', () => {
  const SPA = () => crew({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] });

  it('the spa built by Pip and Cobble pays all ten steps — six to Pip, four to Cobble, each on his own line', () => {
    const end = play(SPA(), 360);
    const pay = (who: string) => end.lines.join(' · ').split(' · ').filter((l) => l.startsWith(who + ' +')).reduce((n, l) => n + Number(/\+(\d+)/.exec(l)![1]), 0);
    expect([end.earned, pay('Pip'), pay('Cobble')]).toEqual([10, 6, 4]);
  });

  it('ARM: the helper’s lap not paid — Cobble’s four planks earn nothing (the s6 gap)', () => {
    const tick = arm(ISLAND_TICK_SCRIPT, 'if (phase === \'work\') { mpaid = iw6Pay(', 'if (false) { mpaid = iw6Pay(');
    const end = play(SPA(), 360, { tick });
    expect([end.earned, end.lines.some((l) => l.includes('Cobble'))]).toEqual([6, false]);
  });
});

// ── 5. A fed animal's present ────────────────────────────────────────────────────────────────────────────────────────

describe('a fed animal gives her present when a robot fills her bowl right up', () => {
  const BOWL = { id: 'a1', kind: 'bowl', x: 3, y: 4 };
  const FEED = [blk(1, 'until', { slots: { cond: is(BOWL, 'full') }, body: [blk(2, 'go_nearest', { slots: { kind: 'patch' } }), blk(3, 'pick'), blk(4, 'go_to', { slots: { thing: BOWL } }), blk(5, 'put')] })];
  const PEN = (fed: number) => win(family({ buildings: [{ id: 'r1b', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Hazel', at: 'r1b', slot: 0, fed }] }), FEED, 'r1');
  const CLOVER = W('iw7sGiftClover').replace('{a}', 'Hazel').replace('{n}', '1');

  it('the table: the rabbit a clover (+1), the sheep wool (+2); both lines in EN and FR', () => {
    expect(ANIMALS.map((a) => [a.id, a.gift])).toEqual([['rabbit', { word: 'iw7sGiftClover', shells: 1 }], ['sheep', { word: 'iw7sGiftWool', shells: 2 }]]);
    expect([W('iw7sGiftClover'), W('iw7sGiftWool'), W('iw7sGiftClover', 'fr'), W('iw7sGiftWool', 'fr')]).toEqual([
      '🍀 {a} found you a clover +{n} 🐚',
      '🧶 {a} gives you wool +{n} 🐚',
      '🍀 {a} t’a trouvé un trèfle +{n} 🐚',
      '🧶 {a} te donne de la laine +{n} 🐚'
    ]);
  });

  /** Every shell a line names, added up (the wallet must hold exactly what the lines said). */
  const said = (lines: string[]) => lines.join(' · ').split(' · ').reduce((n, l) => n + Number((/\+(\d+)/.exec(l) || [0, 0])[1]), 0);

  it('Hazel hungry: Pip fills her bowl on the island and, at the third carrot, she gives a clover (+1) beside his +3; fed full again after wear, again', () => {
    const end = play(PEN(0), 120);
    expect(end.lines.slice(0, 2)).toEqual([CLOVER, 'Pip +3 🐚']);
    const clovers = end.lines.filter((l) => l === CLOVER).length;
    // Measured: in 120 ticks her bowl wears once (WEAR.bowl 60) and Pip fills it again: two clovers, 3 + 1 carrots.
    expect([clovers, end.earned, said(end.lines)]).toEqual([2, 6, 6]);
  });

  it('known-firing: her bowl full in the save — nothing to fill, no present', () => {
    const end = play(PEN(3), 40);
    expect([end.lines.filter((l) => l.includes('🍀')).length, end.earned]).toEqual([0, 0]);
  });

  it('ARM: no presents — the bowl filled, her clover never given', () => {
    const keep = arm(ISLAND_KEEP_SCRIPT, '>= spec.capacity && (Math.floor(Number(as[a].fed)) || 0) < spec.capacity)', '>= spec.capacity && false)');
    const end = play(PEN(0), 120, { keep });
    expect([end.lines.filter((l) => l.includes('🍀')).length, end.earned]).toEqual([0, 4]);
  });
});
