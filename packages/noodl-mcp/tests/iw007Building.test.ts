/**
 * P108 IW-007 (session 5, lane B) — building: her land on the island (the plumbing of brief §4.2), the Workshop on the
 * land, and (below) the Build tab, placing and the drawing. Each rule has an arm beside it: the source mutated, the row
 * red (asserted here), so a row that cannot fail is seen to fail.
 *
 * @module noodl-mcp/tests/iw007Building.test
 */
import * as vm from 'vm';
import { LAND_ID, LAND_PLOT, LAND_SOURCES, REQUESTS } from './cg002Content';
import { ADD_PROFILE_SCRIPT, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT, START_WORLD_SCRIPT, WIN_PAY_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { ISLAND_KEEP_SCRIPT } from './iw006Earn';
import { LAND_PALETTE, LAND_REQUEST_SCRIPT } from './iw007Building';

const compiled = new Map<string, vm.Script>();
/** A page script run as the runtime runs it: its own context, inputs and outputs through JSON. */
function bare(script: string, inputs: Record<string, unknown>): Record<string, any> {
  let s = compiled.get(script);
  if (!s) {
    s = new vm.Script(`(function (Inputs, Outputs) {\n${script}\n})(Inputs, Outputs);`);
    compiled.set(script, s);
  }
  const Outputs: Record<string, any> = {};
  s.runInNewContext({ Inputs: JSON.parse(JSON.stringify(inputs)), Outputs });
  return JSON.parse(JSON.stringify(Outputs));
}
const WORDS = JSON.parse(ALL_WORDS_JSON);
const blk = (id: number, t: string, extra: Record<string, unknown> = {}) => ({ id, t, ...extra });
const is = (thing: Record<string, unknown>, state: string) => ({ op: 'is', thing, state });
const carry = (part: Record<string, unknown>, source: string, base = 1) => [
  blk(base, 'until', { slots: { cond: is(part, 'done') }, body: [blk(base + 1, 'go_nearest', { slots: { kind: source } }), blk(base + 2, 'pick'), blk(base + 3, 'go_to', { slots: { thing: part } }), blk(base + 4, 'put')] })
];
const STONE = { id: 'b1-stone', kind: 'site', x: 3, y: 1 };
const PLANK = { id: 'b1-plank', kind: 'site', x: 4, y: 1 };
const kid = () => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const spa = (stone = 0, plank = 0) => ({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone, plank } }], animals: [] as any[] });
const cobble = (helps: string, program: unknown[]) => ({ id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none', helps, program });

/** The island as the Island page builds it (Island world over Read family), with a world script that may be an arm. */
function isle(model: any, script = ISLAND_WORLD_SCRIPT) {
  const f = runScript(FAMILY_SCRIPT, { model });
  return bare(script, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land });
}
/** A model with Pip pinned on her land (planks) and Cobble helping (stones): the spa built by two robots. */
function crew(land = spa()) {
  const m = kid();
  const p = active(m);
  p.island.robots.push(cobble(LAND_ID, carry(STONE, 'rock')));
  p.island.land = land;
  p.island.plots[LAND_ID] = { program: carry(PLANK, 'tree', 10), robotId: 'r1', wonAt: 1 };
  return m;
}
function tickKeep(model: any, ticks: number, o: { tick?: string; keep?: string; watch?: (s: any, m: any, t: number) => void } = {}) {
  let state = isle(model).state;
  let m = model;
  for (let t = 0; t < ticks; t++) {
    state = bare(o.tick ?? ISLAND_TICK_SCRIPT, { state, built: state }).state;
    const k = bare(o.keep ?? ISLAND_KEEP_SCRIPT, { state, model: m, robots: [], words: WORDS, lang: 'en' });
    if (k.due) m = k.model;
    o.watch?.(state, m, t);
  }
  return { state, model: m };
}
/** A source mutated at one anchor (exactly one), for an arm. */
function arm(src: string, anchor: string, by: string): string {
  expect(src.split(anchor).length).toBe(2);
  return src.replace(anchor, by);
}

describe('[B] plumbing — her land is a plot of the island (brief §4.2)', () => {
  it('the land is on every island, open, its three sources drawn at LAND_PLOT — with nothing standing on it and no land in the save', () => {
    const w = isle(kid());
    const card = w.cards.find((c: any) => c.id === LAND_ID);
    expect(card).toMatchObject({ id: LAND_ID, x: LAND_PLOT.x, y: LAND_PLOT.y, status: 'open', lock: '', needs: '' });
    for (const s of LAND_SOURCES) expect(w.world.things.find((t: any) => t.id === s.id && t.kind === s.kind)).toMatchObject({ x: LAND_PLOT.x + s.x, y: LAND_PLOT.y + s.y, left: s.left });
  });

  it('a land with a building but nobody pinned is open, the building drawn at its stage; pinned with nothing standing it stays open (no job)', () => {
    const m = kid();
    active(m).island.land = spa(2, 0);
    const w = isle(m);
    expect(w.cards.find((c: any) => c.id === LAND_ID).status).toBe('open');
    expect(w.world.things.filter((t: any) => t.of === 'b1').map((t: any) => t.bstage)).toEqual([1, 1]);
    const n = kid();
    active(n).island.plots[LAND_ID] = { program: carry(PLANK, 'tree'), robotId: 'r1', wonAt: 1 };
    expect(isle(n).cards.find((c: any) => c.id === LAND_ID).status).toBe('open');
    // Known-firing: with the spa standing, the same pin works the land.
    active(n).island.land = spa();
    expect(isle(n).cards.find((c: any) => c.id === LAND_ID).status).toBe('working');
  });

  it('a helper of ANOTHER kind works her land; on a request plot the crew’s same-kind rule still holds (known-firing)', () => {
    const w = isle(crew());
    expect(Object.keys(w.state.live[LAND_ID].mate ?? {})).toContain('robot');
    expect(w.state.live[LAND_ID].mate.robot.id).toBe('cobble');
    // The same Cobble helping Pip on tulips-three (Pip's job) is sent home.
    const m = kid();
    const p = active(m);
    p.island.done.push('tulips-three');
    p.island.robots.push(cobble('tulips-three', carry(PLANK, 'tree')));
    const req = REQUESTS.find((r) => r.id === 'tulips-three')!;
    p.island.plots['tulips-three'] = { program: req.referenceProgram, robotId: 'r1', wonAt: 1 };
    expect(isle(m).state.live['tulips-three'].mate).toBeUndefined();
  });

  it('arm: the land’s any-kind rule dropped → Cobble never helps on her land', () => {
    const A = arm(ISLAND_WORLD_SCRIPT, '(!isLand && kindOf(mh) !== needs)', 'kindOf(mh) !== needs');
    expect(isle(crew(), A).state.live[LAND_ID].mate).toBeUndefined();
  });

  it('the build hash moves with which buildings stand where (and animals), never with what was delivered or fed', () => {
    const hash = (land: any) => {
      const m = kid();
      active(m).island.land = land;
      return isle(m).state.build;
    };
    const base = hash(spa(0, 0));
    expect(hash(spa(5, 3))).toBe(base);
    expect(hash({ buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 2, have: { stone: 0, plank: 0 } }], animals: [] })).not.toBe(base);
    const refuge = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 0, fed: 0 }] };
    const fed = JSON.parse(JSON.stringify(refuge));
    fed.animals[0].fed = 3;
    expect(hash(fed)).toBe(hash(refuge));
    expect(hash({ ...refuge, animals: [] })).not.toBe(hash(refuge));
  });

  it('arm: a hash that reads the land whole (have too) → a delivered stone rebuilds the island', () => {
    const A = arm(ISLAND_WORLD_SCRIPT, 'var landKey = iw7bLandKey(Inputs.land);', 'var landKey = Inputs.land ? [Inputs.land] : null;');
    const h = (land: any) => {
      const m = kid();
      active(m).island.land = land;
      return isle(m, A).state.build;
    };
    expect(h(spa(5, 3))).not.toBe(h(spa(0, 0)));
  });

  it('every drop that raises the spa is written to her save at once (the keep), never only at a lap’s end; it never falls', () => {
    const m = crew();
    const drops: number[] = [];
    let lastSaved = 0;
    tickKeep(m, 120, {
      watch: (s, mm, t) => {
        const live = s.live[LAND_ID].things.filter((x: any) => x.of === 'b1').reduce((a: number, x: any) => a + x.have, 0);
        const b = active(mm).island.land.buildings[0];
        const saved = b.have.stone + b.have.plank;
        if (live > lastSaved) drops.push(t);
        expect({ t, saved }).toEqual({ t, saved: live });
        lastSaved = saved;
      }
    });
    expect(drops.length).toBeGreaterThan(2);
  });

  it('arm: the drop moment removed → the save lags behind the spa between laps', () => {
    const T = arm(ISLAND_TICK_SCRIPT, 'if (plot.job && plot.land) return iw7bDropMoment(', 'if (false) return iw7bDropMoment(');
    const m = crew();
    let lag = 0;
    tickKeep(m, 120, {
      tick: T,
      watch: (s, mm) => {
        const live = s.live[LAND_ID].things.filter((x: any) => x.of === 'b1').reduce((a: number, x: any) => a + x.have, 0);
        const b = active(mm).island.land.buildings[0];
        if (b.have.stone + b.have.plank < live) lag++;
      }
    });
    expect(lag).toBeGreaterThan(0);
  });

  it('a land built from a save goes on from it: the sources’ left from the live job, the buildings from the land (a new one placed since appears)', () => {
    const m = crew();
    const r = tickKeep(m, 60);
    const p = active(r.model);
    const live = p.island.plots[LAND_ID].live;
    expect(live).toBeTruthy();
    const treeLeft = live.things.find((t: any) => t.id === 'tree').left;
    expect(treeLeft).toBeLessThan(6);
    p.island.land.buildings.push({ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 0, stone: 0 } });
    const w = isle(r.model);
    const things = w.state.live[LAND_ID].things;
    expect(things.find((t: any) => t.id === 'tree').left).toBe(treeLeft);
    expect(things.filter((t: any) => t.of === 'b2').map((t: any) => [t.item, t.have])).toEqual([['plank', 0], ['stone', 0]]);
    const b1 = p.island.land.buildings[0].have;
    expect(things.filter((t: any) => t.of === 'b1').map((t: any) => t.have)).toEqual([b1.stone, b1.plank]);
  });

  it('teach again on her land (decided): stale when neither program fills a step of what the job lacks; one that fills keeps both working', () => {
    // Both carry planks to a spa whose planks are in (it lacks stones): nothing either does helps — both wait at home.
    const m = kid();
    const p = active(m);
    p.island.robots.push(cobble(LAND_ID, carry(PLANK, 'tree')));
    p.island.land = spa(0, 4);
    p.island.plots[LAND_ID] = { program: carry(PLANK, 'tree', 10), robotId: 'r1', wonAt: 1 };
    const w = isle(m);
    expect([w.cards.find((c: any) => c.id === LAND_ID).stale, w.state.live[LAND_ID].phase, w.state.live[LAND_ID].mate]).toEqual([true, 'teach', undefined]);
    expect(w.state.home.map((r: any) => r.id)).toContain('cobble');
    // The helper carries stones: not stale, both at work.
    const ok = isle(crew(spa(0, 4)));
    expect([!!ok.cards.find((c: any) => c.id === LAND_ID).stale, ok.state.live[LAND_ID].phase, ok.state.live[LAND_ID].mate?.robot?.id]).toEqual([false, 'work', 'cobble']);
    // A finished land (nothing lacks) is never stale: its robots wait for wear (a bowl) at home.
    const done = isle(crew(spa(6, 4)));
    expect(!!done.cards.find((c: any) => c.id === LAND_ID).stale).toBe(false);
  });

  it('arm: the land’s team never judged → the two plank carriers run (and the card never asks to teach again)', () => {
    const A = arm(ISLAND_WORLD_SCRIPT, 'if (isLand && plot.job && iw7bLandStale(plot, live[req.id])) {', 'if (false) {');
    const m = kid();
    const p = active(m);
    p.island.robots.push(cobble(LAND_ID, carry(PLANK, 'tree')));
    p.island.land = spa(0, 4);
    p.island.plots[LAND_ID] = { program: carry(PLANK, 'tree', 10), robotId: 'r1', wonAt: 1 };
    expect(isle(m, A).state.live[LAND_ID].phase).toBe('work');
  });

  it('the Workshop opens her land: Land request adds it (the land as it stands, its palette), Start world lays it', () => {
    const m = kid();
    active(m).island.land = spa(2, 1);
    const f = runScript(FAMILY_SCRIPT, { model: m });
    const reqs = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: f.land }).requests;
    expect(reqs.length).toBe(REQUESTS.length + 1);
    const land = reqs[reqs.length - 1];
    expect([land.id, land.palette, land.needs, land.goal, land.copyKeys.title]).toEqual([LAND_ID, LAND_PALETTE, '', { name: 'job_done' }, 'iw7bLandTitle']);
    expect(WORDS.find((w: any) => w.key === 'iw7bLandTitle')).toMatchObject({ en: 'Your land', fr: 'Ton terrain' });
    const s = runScript(START_WORLD_SCRIPT, { requests: reqs, requestId: LAND_ID, seed: 1 });
    expect([s.found, s.world.things.filter((t: any) => t.of === 'b1').map((t: any) => t.have), s.world.job.targets]).toEqual([true, [2, 1], ['b1-stone', 'b1-plank']]);
    // Twice through (a page re-run) never adds it twice.
    expect(bare(LAND_REQUEST_SCRIPT, { requests: reqs, land: f.land }).requests.length).toBe(REQUESTS.length + 1);
  });

  it('a Workshop win on her land pays nothing there and never starts the land done (the building rises on the island); a request still does (known-firing)', () => {
    const m = kid();
    active(m).island.land = spa();
    const f = runScript(FAMILY_SCRIPT, { model: m });
    const reqs = bare(LAND_REQUEST_SCRIPT, { requests: REQUESTS, land: f.land }).requests;
    const pay = bare(WIN_PAY_SCRIPT, { requestId: LAND_ID, requests: reqs, plots: f.plots, done: f.done, words: WORDS, lang: 'en' });
    expect([pay.pay, pay.jobLive]).toEqual([0, null]);
    const other = bare(WIN_PAY_SCRIPT, { requestId: 'path-stones', requests: reqs, plots: f.plots, done: f.done, words: WORDS, lang: 'en' });
    expect([other.pay > 0, !!other.jobLive]).toEqual([true, true]);
    const A = arm(WIN_PAY_SCRIPT, "id !== 'free' && id !== 'land'", "id !== 'free'");
    expect(bare(A, { requestId: LAND_ID, requests: reqs, plots: f.plots, done: f.done, words: WORDS, lang: 'en' }).jobLive).not.toBeNull();
  });
});
