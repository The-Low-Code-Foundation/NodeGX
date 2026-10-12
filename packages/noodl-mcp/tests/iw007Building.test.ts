/**
 * P108 IW-007 (session 5, lane B) — building: her land on the island (the plumbing of brief §4.2), the Workshop on the
 * land, and (below) the Build tab, placing and the drawing. Each rule has an arm beside it: the source mutated, the row
 * red (asserted here), so a row that cannot fail is seen to fail.
 *
 * @module noodl-mcp/tests/iw007Building.test
 */
import * as vm from 'vm';
import { LAND_ID, LAND_PLOT, LAND_SOURCES, REQUESTS, SHOP } from './cg002Content';
import { ADD_PROFILE_SCRIPT, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, DRAW_WORLD_SCRIPT, FAMILY_SCRIPT, ISLAND_CHOOSE_SCRIPT, ISLAND_WORLD_SCRIPT, START_WORLD_SCRIPT, WIN_PAY_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT, PLOT_AT_SCRIPT } from './ig004Island';
import { ISLAND_KEEP_SCRIPT } from './iw006Earn';
import { BUY_SCRIPT, SHOP_CARD_SCRIPT, SHOP_IDS, SHOP_ROWS_SCRIPT } from './iw006Shop';
import { LAND_CARD_SCRIPT, LAND_GHOST_SCRIPT, LAND_PALETTE, LAND_REQUEST_SCRIPT, WITH_GHOST_SCRIPT } from './iw007Building';

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

  it('her rabbit’s bowl: every change of it (a carrot in, one worn) is written to her save the same tick — a reload never shows less than the island did (lane A’s finding)', () => {
    const m = kid();
    const p = active(m);
    p.island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 0, fed: 0 }] };
    const bowl = { id: 'a1', kind: 'bowl', x: 3, y: 4 };
    p.island.plots[LAND_ID] = { program: [blk(1, 'until', { slots: { cond: is(bowl, 'full') }, body: [blk(2, 'go_nearest', { slots: { kind: 'patch' } }), blk(3, 'pick'), blk(4, 'go_to', { slots: { thing: bowl } }), blk(5, 'put')] })], robotId: 'r1', wonAt: 1 };
    const seen: number[] = [];
    tickKeep(m, 120, {
      watch: (s, mm) => {
        const live = s.live[LAND_ID].things.find((t: any) => t.id === 'a1').count;
        expect(active(mm).island.land.animals[0].fed).toBe(live);
        if (seen[seen.length - 1] !== live) seen.push(live);
      }
    });
    expect(seen.slice(0, 4)).toEqual([0, 1, 2, 3]);
  });

  it('arm: a bowl not a moment → the save lags her bowl by a carrot', () => {
    const T = arm(ISLAND_TICK_SCRIPT, "k.indexOf('bowl:') === 0 ? now[k] !== (Number(was[k]) || 0) : ", 'k.indexOf(\'bowl:\') === 0 ? false : ');
    const m = kid();
    const p = active(m);
    p.island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 0, fed: 0 }] };
    const bowl = { id: 'a1', kind: 'bowl', x: 3, y: 4 };
    p.island.plots[LAND_ID] = { program: [blk(1, 'until', { slots: { cond: is(bowl, 'full') }, body: [blk(2, 'go_nearest', { slots: { kind: 'patch' } }), blk(3, 'pick'), blk(4, 'go_to', { slots: { thing: bowl } }), blk(5, 'put')] })], robotId: 'r1', wonAt: 1 };
    let lag = 0;
    tickKeep(m, 120, { tick: T, watch: (s, mm) => { if (active(mm).island.land.animals[0].fed < s.live[LAND_ID].things.find((t: any) => t.id === 'a1').count) lag++; } });
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
    // P108 IW-007 (s6): the land's goal is a part finished (iw007Touch), naming the parts not full yet — was job_done.
    expect([land.id, land.palette, land.needs, land.goal, land.copyKeys.title]).toEqual([LAND_ID, LAND_PALETTE, '', { name: 'part_done', args: ['b1-stone', 'b1-plank'] }, 'iw7bLandTitle']);
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

// ── [B] the Build tab, placing a blueprint, her land's card ──────────────────────────────────────────────────────────

describe('[B] the Build tab — a blueprint bought, placed on a legal footprint only, its card in words (EN + FR)', () => {
  const W = (key: string, lang: 'en' | 'fr' = 'en') => WORDS.find((w: any) => w.key === key)[lang];
  const rich = (n = 200) => {
    const m = kid();
    active(m).shells = { earned: n, spent: 0 };
    return m;
  };
  const shopRows = (model: any, lang = 'en') => bare(SHOP_ROWS_SCRIPT, { model, words: WORDS, lang, tab: SHOP_IDS.tab + 'build' });
  const shopCard = (model: any, id: string, extra: Record<string, unknown> = {}, lang = 'en') => bare(SHOP_CARD_SCRIPT, { model, words: WORDS, lang, requests: REQUESTS, itemId: SHOP_IDS.item + id, ...extra });
  const landCard = (model: any, ghost: unknown = null, lang = 'en') => bare(LAND_CARD_SCRIPT, { model, ghost, requestId: LAND_ID, words: WORDS, lang });
  const ghostDo = (mode: string, model: any, ghost: unknown, extra: Record<string, unknown> = {}) => bare(LAND_GHOST_SCRIPT, { mode, model, ghost, ...extra });

  it('the spa bought from its card (the purchase rule); its row then says “to place” and its card where it goes — no second Buy', () => {
    const m = rich();
    const before = shopCard(m, 'spa');
    expect([before.canBuy, before.showFigures, before.cost]).toEqual([true, true, W('iw6hCost').replace('{n}', String(SHOP.find((i) => i.id === 'spa')!.price))]);
    const b = bare(BUY_SCRIPT, { model: m, itemId: SHOP_IDS.item + 'spa' });
    expect([b.ok, active(b.model).owned]).toEqual([true, ['spa']]);
    expect(shopCard(b.model, 'spa', { bought: 'spa' }).done).toBe(W('iw7bCardPlace'));
    const row = shopRows(b.model).items.find((i: any) => i.id === SHOP_IDS.item + 'spa');
    expect([row.tag, row.hasTag]).toEqual([W('iw7bTagPlace'), true]);
    const after = shopCard(b.model, 'spa', {}, 'fr');
    expect([after.canBuy, after.showFigures, after.done]).toEqual([false, false, W('iw7bCardPlace', 'fr')]);
  });

  it('her land’s card offers the bought blueprint; the ghost starts at its spot, green; a tap on her land moves it; a refused tile says why (EN + FR); Place writes it there', () => {
    const m = rich();
    const b = bare(BUY_SCRIPT, { model: m, itemId: SHOP_IDS.item + 'spa' });
    const c0 = landCard(b.model);
    expect([c0.show, c0.showChips, c0.chips.map((c: any) => c.id), c0.ghostShow]).toEqual([true, true, ['landbp|spa'], false]);
    const g1 = ghostDo('start', b.model, null, { bp: 'landbp|spa' }).ghost;
    expect(g1).toEqual({ bp: 'spa', x: 3, y: 1 });
    const c1 = landCard(b.model, g1);
    expect([c1.ghostShow, c1.ghostOk, c1.ghostLine, c1.ghostThing]).toEqual([true, true, W('iw7bGhostOk'), { kind: 'ghost', bp: 'spa', x: LAND_PLOT.x + 3, y: LAND_PLOT.y + 1, w: 2, pen: 0, ok: true, why: '' }]);
    // A tap on the tile left of the rock (6, 5): the spa would sit on the rock — taken, in words, and no Put.
    const g2 = ghostDo('move', b.model, g1, { x: LAND_PLOT.x + 6, y: LAND_PLOT.y + 5 }).ghost;
    const c2 = landCard(b.model, g2);
    expect([g2, c2.ghostOk, c2.why, c2.ghostLine]).toEqual([{ bp: 'spa', x: 6, y: 5 }, false, 'taken', W('iw7bGhostNo').replace('{why}', W('iw7bWhyTaken'))]);
    expect(landCard(b.model, g2, 'fr').ghostLine).toBe(W('iw7bGhostNo', 'fr').replace('{why}', W('iw7bWhyTaken', 'fr')));
    for (const [x, y, why] of [[7, 1, 'edge'], [0, 2, 'ground'], [6, 4, 'reach']] as const) expect({ why: landCard(b.model, { bp: 'spa', x, y }).why, line: !!landCard(b.model, { bp: 'spa', x, y }).ghostLine }).toEqual({ why, line: true });
    // Place on a refused tile: nothing changes. A tap OFF her land: the ghost stays.
    const no = ghostDo('place', b.model, g2);
    expect([no.ok, no.placed, active(no.model).island.land]).toEqual([false, '', undefined]);
    expect(ghostDo('move', b.model, g2, { x: 3, y: 3 }).ghost).toEqual(g2);
    // Moved back to a legal tile and placed: her land has the spa there, nothing delivered; the ghost is gone.
    const g3 = ghostDo('move', b.model, g2, { x: LAND_PLOT.x + 3, y: LAND_PLOT.y + 1 }).ghost;
    const yes = ghostDo('place', b.model, g3);
    expect([yes.ok, yes.placed, yes.ghost]).toEqual([true, 'spa', { bp: '' }]);
    expect(active(yes.model).island.land.buildings.map((x: any) => [x.bp, x.x, x.y, x.have])).toEqual([['spa', 3, 1, { stone: 0, plank: 0 }]]);
    // The card now says what stands, at its first stage; no chip (nothing left to place); the shop's row: being built.
    const c4 = landCard(yes.model);
    expect([c4.line, c4.showChips]).toEqual([W('iw7bStands').replace('{what}', 'The robot spa').replace('{stage}', W('iw7bStage0')).replace('{n}', '0').replace('{m}', '10'), false]);
    expect(shopRows(yes.model).items.find((i: any) => i.id === SHOP_IDS.item + 'spa').tag).toBe(W('iw7bTagBuilding'));
  });

  it('a ghost cannot come out for a blueprint she has not bought, nor one already placed; cancel puts it away', () => {
    const m = rich();
    expect(ghostDo('start', m, null, { bp: 'landbp|spa' }).ghost).toEqual({ bp: '' });
    const b = bare(BUY_SCRIPT, { model: m, itemId: SHOP_IDS.item + 'spa' });
    const placed = ghostDo('place', b.model, { bp: 'spa', x: 3, y: 1 });
    expect(ghostDo('start', placed.model, null, { bp: 'landbp|spa' }).ghost).toEqual({ bp: '' });
    expect(ghostDo('cancel', b.model, { bp: 'spa', x: 3, y: 1 }).ghost).toEqual({ bp: '' });
    expect(landCard(m).line).toBe(W('iw7bLandEmpty'));
  });

  it('the stage words follow the spa as it rises, and finished says so; the shop row says built', () => {
    const at = (stone: number, plank: number) => {
      const m = kid();
      active(m).owned = ['spa'];
      active(m).island.land = spa(stone, plank);
      return m;
    };
    const line = (m: any) => landCard(m).line;
    expect([line(at(0, 0)), line(at(3, 0)), line(at(6, 1)), line(at(6, 4))]).toEqual([
      ['iw7bStage0', 0],
      ['iw7bStage1', 3],
      ['iw7bStage2', 7],
      ['iw7bStageDone', 10]
    ].map(([k, n]) => W('iw7bStands').replace('{what}', 'The robot spa').replace('{stage}', W(k as string)).replace('{n}', String(n)).replace('{m}', '10')));
    expect(shopRows(at(6, 4)).items.find((i: any) => i.id === SHOP_IDS.item + 'spa').tag).toBe(W('iw7bTagBuilt'));
  });

  it('a tap on her land opens its card (Plot at → Island choose): “Your land”, Go and help opens the Workshop on it; at work there, any robot of hers is named', () => {
    const m = crew();
    const f = runScript(FAMILY_SCRIPT, { model: m });
    const w = isle(m);
    const at = bare(PLOT_AT_SCRIPT, { cards: w.cards, x: LAND_PLOT.x + 2, y: LAND_PLOT.y + 4 });
    expect(at.requestId).toBe(LAND_ID);
    const ch = bare(ISLAND_CHOOSE_SCRIPT, { requestId: LAND_ID, cards: w.cards, requests: REQUESTS, plots: f.plots, robots: f.robots, words: WORDS, lang: 'fr', botName: 'Pip' });
    expect([ch.found, ch.title, ch.canOpen, ch.showHome, ch.robotId, ch.status]).toEqual([true, W('iw7bLandTitle', 'fr'), true, true, 'r1', 'working']);
    // Cobble alone pinned on her land (another kind): the card names Cobble, and Bring home takes Cobble.
    const n = kid();
    n.profiles[0].island.robots.push(cobble('', carry(STONE, 'rock')));
    delete n.profiles[0].island.robots[1].helps;
    n.profiles[0].island.land = spa();
    n.profiles[0].island.plots[LAND_ID] = { program: carry(STONE, 'rock'), robotId: 'cobble', wonAt: 1 };
    const g = runScript(FAMILY_SCRIPT, { model: n });
    const c2 = bare(ISLAND_CHOOSE_SCRIPT, { requestId: LAND_ID, cards: isle(n).cards, requests: REQUESTS, plots: g.plots, robots: g.robots, words: WORDS, lang: 'en', botName: 'Pip' });
    expect([c2.robotId, c2.showHome]).toEqual(['cobble', true]);
    // Pip at work on another plot: her land's card says where, and that he comes home from THAT card (no Bring home here).
    const o = kid();
    o.profiles[0].island.done.push('path-postbox');
    o.profiles[0].island.plots['path-postbox'] = { program: REQUESTS.find((r) => r.id === 'path-postbox')!.referenceProgram, robotId: 'r1', wonAt: 1 };
    const h = runScript(FAMILY_SCRIPT, { model: o });
    const c3 = bare(ISLAND_CHOOSE_SCRIPT, { requestId: LAND_ID, cards: isle(o).cards, requests: REQUESTS, plots: h.plots, robots: h.robots, words: WORDS, lang: 'en', botName: 'Pip' });
    const title = W(REQUESTS.find((r) => r.id === 'path-postbox')!.copyKeys.title);
    expect([c3.line, c3.showHome, c3.canOpen]).toEqual([W('iw7bLandBusy').split('{b}').join('Pip').replace('{plot}', title), false, false]);
  });

  it('the island draws the ghost over her land while one is out (With ghost), and Draw world hands the kits the tree, the ghost and each building’s span', () => {
    const m = kid();
    active(m).island.land = spa(2, 1);
    const w = isle(m).world;
    const g = { kind: 'ghost', bp: 'refuge', x: LAND_PLOT.x + 3, y: LAND_PLOT.y + 3, w: 2, pen: 2, ok: false, why: 'taken' };
    expect(bare(WITH_GHOST_SCRIPT, { world: w, ghost: g, showGhost: false }).world.things.length).toBe(w.things.length);
    const wg = bare(WITH_GHOST_SCRIPT, { world: w, ghost: g, showGhost: true }).world;
    const d = bare(DRAW_WORLD_SCRIPT, { world: wg, words: WORDS, lang: 'en' });
    expect(d.things.find((t: any) => t.kind === 'ghost')).toEqual({ kind: 'ghost', bp: 'refuge', x: LAND_PLOT.x + 3, y: LAND_PLOT.y + 3, w: 2, pen: 2, ok: false });
    expect(d.things.find((t: any) => t.kind === 'tree' && t.id === 'tree')).toMatchObject({ x: LAND_PLOT.x + 7, y: LAND_PLOT.y, left: 6, max: 8 });
    expect(d.things.filter((t: any) => t.of === 'b1').map((t: any) => [t.build, t.bstage, t.bx, t.bw, t.item, t.have, t.need])).toEqual([['spa', 1, LAND_PLOT.x + 3, 2, 'stone', 2, 6], ['spa', 1, LAND_PLOT.x + 3, 2, 'plank', 1, 4]]);
  });
});
