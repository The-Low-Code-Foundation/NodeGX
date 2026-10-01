/**
 * P108 IW-007 — building and animals: the gate of IW-007 §3 (AC1–AC3 on the engine, the save and the island tick).
 *
 * Written by the session-5 orchestrator BEFORE the lanes (the s5 base); each lane turns its own rows green. Every row
 * names its lane, so a lane runs its own with `npx jest tests/iw007Build.test.ts -t "\[B\]"`:
 *
 * - **[base]** green on the base: the tables, the two new sources, a bowl's own food, a building's stage and that it
 *   never wears, the land helpers (landLegal / landPlace / landJob / landKeep), the save's land, the purchase rule, and
 *   the spa built by two robots carrying two materials on the engine alone;
 * - **[B]** building (lane B): her land on the island (Read family's `land`, Island world's `land` input — the land plot
 *   drawn with each building at its stage), a robot pinned on the land and a second one of ANY kind helping, the island
 *   ticking the spa to finished, the keep writing it back (never lower);
 * - **[A]** animals (lane A): a rabbit in a finished refuge seen on the island by her bowl; a feeding robot pinned on the
 *   land refills the bowl after wear empties it; she never leaves.
 *
 * Until every lane is merged this file is red for the lanes not merged yet. A lane's gate is its OWN rows' exit status
 * (and `[base]`'s); the merged tree's gate is the whole file.
 *
 * @module noodl-mcp/tests/iw007Build.test
 */
import * as vm from 'vm';
import { ANIMALS, BLUEPRINTS, JOB_VOCABULARY, LAND_HOME, LAND_ID, LAND_MAP, LAND_PLOT, LAND_SOURCES, REQUESTS, SHOP, SOURCE_ITEMS, WEAR } from './cg002Content';
import { ADD_PROFILE_SCRIPT, DECODE_SAVE_SCRIPT, ENCODE_SAVE_SCRIPT, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { ISLAND_KEEP_SCRIPT } from './iw006Earn';
import { LAND_SCRIPT } from './iw007Land';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const COPIES = require('../../../dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell/copies.js');

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
/** The land helpers and the engine, compiled once (a helper() call compiles the whole engine every time). */
const L = new Function(
  `${LAND_SCRIPT}; return { newRun: newRun, step: step, apply: apply, worldOf: worldOf, wearOf: wearOf, landOf: landOf, landThings: landThings, landJob: landJob, landRequest: landRequest, landLegal: landLegal, landPlace: landPlace, landKeep: landKeep, buyItem: buyItem, earnShells: earnShells, buildingDone: buildingDone };`
)() as any;
const blk = (id: number, t: string, extra: Record<string, unknown> = {}) => ({ id, t, ...extra });
const is = (thing: Record<string, unknown>, state: string) => ({ op: 'is', thing, state });
/** A carry program: until that part is done, fetch one from the nearest source of that kind and put it in. */
const carry = (part: Record<string, unknown>, source: string, base = 1) => [
  blk(base, 'until', { slots: { cond: is(part, 'done') }, body: [blk(base + 1, 'go_nearest', { slots: { kind: source } }), blk(base + 2, 'pick'), blk(base + 3, 'go_to', { slots: { thing: part } }), blk(base + 4, 'put')] })
];
/** Two runs stepped in turn on ONE world (the island's way), to both their ends. */
function together(world: any, a: { id: string; program: any[] }, b: { id: string; program: any[] }, max = 3000) {
  let w = L.worldOf(world);
  let ra = L.newRun(a.program, a.id, 'en');
  let rb = L.newRun(b.program, b.id, 'en');
  let da = false;
  let db = false;
  let ticks = 0;
  for (; ticks < max && !(da && db); ticks++) {
    if (!da) { const s = L.step(ra, w, null); ra = s.run; w = L.apply(w, s.delta); da = s.done; }
    if (!db) { const s = L.step(rb, w, null); rb = s.run; w = L.apply(w, s.delta); db = s.done; }
  }
  return { w, ticks, da, db, ra, rb };
}
const landWorld = (land: any, robots: any[]) => {
  const req = L.landRequest(land);
  return { map: req.map, things: req.things, robots, job: req.job, seed: 1 };
};
const robot = (id: string, x: number, y: number) => ({ id, x, y, d: 1, carry: [], basket: 4, home: { x, y, d: 1 } });
const kid = () => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang: 'en', robotName: 'Pip' }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);

// ── [base] the tables ────────────────────────────────────────────────────────────────────────────────────────────────

describe('[base] IW-007 tables — blueprints, animals, the land, the shop rows', () => {
  it('[base] every blueprint is one row of parts, one material each, 3–5 stages, its materials what a source gives; every animal eats what a source gives', () => {
    const items = new Set(Object.values(SOURCE_ITEMS));
    expect(SOURCE_ITEMS).toEqual({ rock: 'stone', tree: 'plank', patch: 'carrot' });
    for (const b of BLUEPRINTS) {
      expect({ id: b.id, stages: b.stages >= 3 && b.stages <= 5, distinct: new Set(b.parts.map((p) => p.item)).size === b.parts.length, sourced: b.parts.every((p) => items.has(p.item)), needs: b.parts.every((p) => p.need > 0) }).toEqual({ id: b.id, stages: true, distinct: true, sourced: true, needs: true });
    }
    for (const a of ANIMALS) expect({ id: a.id, eats: items.has(a.eats), capacity: a.capacity > 0 }).toEqual({ id: a.id, eats: true, capacity: true });
    expect(BLUEPRINTS.filter((b) => b.does === 'animals').map((b) => b.id)).toEqual(['refuge']);
  });

  it('[base] the shop sells every blueprint on Build and every animal on Animals, each with a name and a line in EN and FR', () => {
    for (const b of BLUEPRINTS) expect(SHOP.filter((i) => i.kind === 'blueprint' && i.blueprint === b.id && i.tab === 'build').length).toBe(1);
    for (const a of ANIMALS) expect(SHOP.filter((i) => i.kind === 'animal' && i.animal === a.id && i.tab === 'animals').length).toBe(1);
    for (const i of SHOP.filter((x) => x.tab === 'build' || x.tab === 'animals')) expect({ id: i.id, ok: !!(i.name.en && i.name.fr && i.line.en && i.line.fr && i.name.en !== i.name.fr && i.price > 0) }).toEqual({ id: i.id, ok: true });
  });

  it('[base] the land is the meadow R6 kept: (46, 15), no request on it, its sources on grass, home on grass', () => {
    expect(LAND_PLOT).toEqual({ x: 46, y: 15 });
    expect(REQUESTS.some((r) => r.plot.x === LAND_PLOT.x && r.plot.y === LAND_PLOT.y)).toBe(false);
    for (const t of LAND_SOURCES) expect({ id: t.id, ground: LAND_MAP[t.y][t.x], source: !!SOURCE_ITEMS[t.kind] }).toEqual({ id: t.id, ground: 'G', source: true });
    expect(LAND_MAP[LAND_HOME.y][LAND_HOME.x]).toBe('G');
  });

  it('[base] the shell’s copies of the land tables (copies.js) are the content’s', () => {
    expect(COPIES.LAND_BLUEPRINTS).toEqual(Object.fromEntries(BLUEPRINTS.map((b) => [b.id, { parts: b.parts.map((p) => [p.item, p.need]), pen: b.pen ?? 0 }])));
    expect(COPIES.LAND_ANIMALS).toEqual(Object.fromEntries(ANIMALS.map((a) => [a.id, a.capacity])));
  });
});

// ── [base] the engine: two new sources, a bowl's own food, a building's stage, never worn ─────────────────────────────

describe('[base] IW-007 engine — sources, bowls, buildings', () => {
  const pickAhead = (thing: any) => {
    const w = L.worldOf({ map: ['GG'], things: [thing], robots: [{ id: 'r', x: 0, y: 0, d: 1, carry: [] }] });
    const s = L.step(L.newRun([blk(1, 'pick')], 'r', 'en'), w, null);
    return { delta: s.delta, after: L.apply(w, s.delta) };
  };

  it('[base] a tree gives a plank and a patch a carrot per pick, each shrinking; a rock still gives a stone (its delta unchanged)', () => {
    const tree = pickAhead({ kind: 'tree', id: 't', x: 1, y: 0, left: 2, max: 4 });
    expect([tree.delta.pick.kind, tree.after.robots[0].carry, tree.after.things[0].left]).toEqual(['plank', ['plank'], 1]);
    const patch = pickAhead({ kind: 'patch', id: 'p', x: 1, y: 0, left: 1, max: 4 });
    expect([patch.delta.pick.kind, patch.after.robots[0].carry, patch.after.things[0].left]).toEqual(['carrot', ['carrot'], 0]);
    const rock = pickAhead({ kind: 'rock', id: 'r', x: 1, y: 0, left: 2, max: 4 });
    expect(rock.delta.pick).toEqual({ id: 'r', kind: 'stone', x: 1, y: 0, rock: true });
  });

  it('[base] each source regrows on its own clock (tree 40, patch 30, rock 30), never past its max', () => {
    const w = { map: ['GGG'], things: [{ kind: 'tree', id: 't', x: 0, y: 0, left: 0, max: 1 }, { kind: 'patch', id: 'p', x: 1, y: 0, left: 0, max: 2 }, { kind: 'rock', id: 'r', x: 2, y: 0, left: 0, max: 2 }], robots: [], seed: 1 };
    const at = (n: number) => L.wearOf(w, n).filter((d: any) => d.regrow).map((d: any) => d.regrow.id).sort();
    expect([WEAR.tree, WEAR.patch]).toEqual([40, 30]);
    expect([at(30), at(40), at(120)]).toEqual([['p', 'r'], ['t'], ['p', 'r', 't']]);
    let full = L.worldOf({ ...w, things: [{ kind: 'tree', id: 't', x: 0, y: 0, left: 1, max: 1 }] });
    expect(L.wearOf(full, 40).filter((d: any) => d.regrow)).toEqual([]);
    full = L.apply(L.worldOf(w), L.wearOf(w, 40).find((d: any) => d.regrow));
    expect(full.things[0].left).toBe(1);
  });

  it('[base] a rabbit’s bowl takes carrots and nothing else; a food bowl still takes food and refuses a carrot', () => {
    const feed = (bowl: any, carry: string) => {
      const w = L.worldOf({ map: ['GG'], things: [bowl], robots: [{ id: 'r', x: 0, y: 0, d: 1, carry: [carry] }] });
      const s = L.step(L.newRun([blk(1, 'put')], 'r', 'en'), w, null);
      const after = L.apply(w, s.delta);
      return [!!s.delta.feed, after.things[0].count ?? after.things[0].food, after.robots[0].carry.length];
    };
    const rabbit = { kind: 'bowl', id: 'a1', item: 'carrot', capacity: 3, count: 1, food: 1, animal: 'rabbit', x: 1, y: 0 };
    expect(feed(rabbit, 'carrot')).toEqual([true, 2, 0]);
    expect(feed(rabbit, 'food')).toEqual([false, 1, 1]);
    expect(feed({ kind: 'bowl', x: 1, y: 0, food: 0 }, 'food')).toEqual([true, 1, 0]);
    expect(feed({ kind: 'bowl', x: 1, y: 0, food: 0 }, 'carrot')).toEqual([false, 0, 1]);
  });

  it('[base] a building’s parts share one stage by the share of ALL its materials (0 · 1 · 2 · 3 finished), moved by every drop', () => {
    const stages = (stone: number, plank: number) => {
      const land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone, plank } }], animals: [] };
      return L.worldOf({ map: LAND_MAP.slice(), things: L.landThings(land), robots: [] }).things.filter((t: any) => t.of === 'b1').map((t: any) => t.bstage);
    };
    expect([stages(0, 0), stages(1, 0), stages(4, 0), stages(6, 3), stages(6, 4)]).toEqual([[0, 0], [1, 1], [1, 1], [2, 2], [3, 3]]);
    expect(stages(5, 0)).toEqual([2, 2]);
    // A drop moves it: one stone onto a spa at 4 + 0 (2 under half of 10 → 1) makes 5 of 10 (half → 2).
    const land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 4, plank: 0 } }], animals: [] };
    const w = L.worldOf({ map: LAND_MAP.slice(), things: L.landThings(land), robots: [{ id: 'r', x: 2, y: 1, d: 1, carry: ['stone'] }] });
    const s = L.step(L.newRun([blk(1, 'put')], 'r', 'en'), w, null);
    expect(L.apply(w, s.delta).things.filter((t: any) => t.of === 'b1').map((t: any) => [t.item, t.have, t.bstage])).toEqual([['stone', 5, 2], ['plank', 0, 2]]);
  });

  it('[base] a building never wears (keep); a path square beside it still does (known-firing)', () => {
    const land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 6, plank: 4 } }], animals: [] };
    const things = L.landThings(land).concat([{ kind: 'site', id: 'sq', x: 0, y: 3, have: 2, need: 4 }]);
    const worn = L.wearOf({ map: LAND_MAP.slice(), things, robots: [], seed: 1 }, WEAR.site).filter((d: any) => d.wear).map((d: any) => d.wear.id);
    expect(worn).toEqual(['sq']);
    const only = L.wearOf({ map: LAND_MAP.slice(), things: L.landThings(land), robots: [], seed: 1 }, WEAR.site * 3).filter((d: any) => d.wear);
    expect(only).toEqual([]);
  });

  it('[base] the spa built by two robots carrying two materials (stones from the rock, planks from the tree): both parts full, finished', () => {
    const land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] };
    const stone = { id: 'b1-stone', kind: 'site', x: 3, y: 1 };
    const plank = { id: 'b1-plank', kind: 'site', x: 4, y: 1 };
    const r = together(landWorld(land, [robot('cobble', 0, 0), robot('pip', 1, 0)]), { id: 'cobble', program: carry(stone, 'rock') }, { id: 'pip', program: carry(plank, 'tree', 10) });
    const parts = r.w.things.filter((t: any) => t.of === 'b1').map((t: any) => [t.item, t.have, t.need, t.bstage]);
    expect({ parts, both: r.da && r.db }).toEqual({ parts: [['stone', 6, 6, 3], ['plank', 4, 4, 3]], both: true });
    // Known-firing beside it: ONE robot carrying stones only leaves the planks short — the building is not finished.
    const one = together(landWorld(land, [robot('cobble', 0, 0), robot('pip', 1, 0)]), { id: 'cobble', program: carry(stone, 'rock') }, { id: 'pip', program: [] });
    expect(one.w.things.filter((t: any) => t.of === 'b1').map((t: any) => t.bstage)).toEqual([2, 2]);
  });
});

// ── [base] the land helpers ──────────────────────────────────────────────────────────────────────────────────────────

describe('[base] IW-007 land helpers — where a ghost may go, the job, what the island writes back', () => {
  const empty = () => ({ buildings: [], animals: [] });

  it('[base] landLegal: both blueprints fit their default spot on an empty land; every refusal names why', () => {
    for (const b of BLUEPRINTS) expect({ id: b.id, why: L.landLegal(empty(), b.id, b.spot.x, b.spot.y) }).toEqual({ id: b.id, why: '' });
    expect(L.landLegal(empty(), 'castle', 3, 1)).toBe('unknown');
    expect(L.landLegal(empty(), 'spa', 7, 1)).toBe('edge');
    expect(L.landLegal(empty(), 'refuge', 3, 5)).toBe('edge');
    expect(L.landLegal(empty(), 'spa', 0, 2)).toBe('ground'); // the meadow's scenery tree at (1, 2)
    expect(L.landLegal(empty(), 'spa', 6, 5)).toBe('taken'); // (7, 5) is the rock
    expect(L.landLegal(empty(), 'spa', 0, 0)).toBe('taken'); // home
    expect(L.landLegal(empty(), 'spa', 5, 2)).toBe('');
    expect(L.landLegal(empty(), 'spa', 6, 4)).toBe('reach'); // walls the rock in: (6, 5) is then reached from nowhere
    expect(L.landLegal(empty(), 'refuge', 6, 4)).toBe('taken'); // its pen on the rock
    expect(L.landLegal(empty(), 'spa', 6, 1)).toBe('reach'); // walls the tree in: (6, 0) scenery, (7, 1) the spa
    const one = empty();
    expect(L.landPlace(one, 'spa', 3, 1, 'b1')).toEqual({ ok: true, error: '', id: 'b1' });
    expect([L.landLegal(one, 'spa', 3, 3), L.landLegal(one, 'refuge', 3, 1), L.landLegal(one, 'refuge', 3, 3)]).toEqual(['built', 'taken', '']);
    expect(L.landPlace(one, 'spa', 3, 3)).toEqual({ ok: false, error: 'built', id: '' });
    expect(one.buildings).toEqual([{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }]);
  });

  it('[base] landJob: nothing on the land is no job; every part and every animal’s bowl is a target; home is LAND_HOME', () => {
    expect(L.landJob(empty())).toBeNull();
    const land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 6, plank: 4 } }, { id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 1, fed: 2 }] };
    expect(L.landJob(land)).toEqual({ targets: ['b1-stone', 'b1-plank', 'b2-plank', 'b2-stone', 'a1'], home: LAND_HOME });
    const bowl = L.landThings(land).find((t: any) => t.id === 'a1');
    expect(bowl).toEqual({ kind: 'bowl', id: 'a1', item: 'carrot', capacity: 3, count: 2, food: 2, animal: 'rabbit', name: 'Flopsy', x: 4, y: 4 });
    const req = L.landRequest(land);
    expect([req.id, req.plot, req.map, req.goal]).toEqual([LAND_ID, LAND_PLOT, LAND_MAP, { name: 'job_done' }]);
  });

  it('[base] landKeep: a part’s have only rises (never un-builds), a bowl’s count is her fed, unknown things are ignored', () => {
    const land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 4, plank: 1 } }], animals: [] as any[] };
    const t = L.landThings(land);
    t.find((x: any) => x.id === 'b1-stone').have = 5;
    t.find((x: any) => x.id === 'b1-plank').have = 0;
    expect(L.landKeep(land, t)).toBe(true);
    expect(land.buildings[0].have).toEqual({ stone: 5, plank: 1 });
    expect(L.landKeep(land, t)).toBe(false);
  });
});

// ── [base] the save and the purchase rule ────────────────────────────────────────────────────────────────────────────

describe('[base] IW-007 save — her land in the profile, the codes, buying a blueprint and an animal', () => {
  const rich = () => {
    const m = kid();
    L.earnShells(active(m), 500);
    return m;
  };
  const refugeDone = (m: any) => {
    active(m).island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [] };
    return m;
  };

  it('[base] a profile with no land has no land field (an old island reads as before); a land round-trips the code and is kept by the model', () => {
    const m = kid();
    expect('land' in active(m).island).toBe(false);
    const enc = runScript(ENCODE_SAVE_SCRIPT, { model: m }).code;
    refugeDone(m);
    const enc2 = runScript(ENCODE_SAVE_SCRIPT, { model: m }).code;
    expect(enc2).not.toBe(enc);
    const back = runScript(DECODE_SAVE_SCRIPT, { code: enc2 });
    expect([back.ok, back.migrated, active(back.model).island.land, back.model.island.land]).toEqual([true, false, active(m).island.land, active(m).island.land]);
  });

  it('[base] a blueprint is bought once into owned (a second is owned); an animal needs a FINISHED refuge, a free place, her name', () => {
    const m = rich();
    const p = active(m);
    expect(L.buyItem(p, 'spa')).toMatchObject({ ok: true, error: '' });
    expect(p.owned).toEqual(['spa']);
    expect(L.buyItem(p, 'spa')).toMatchObject({ ok: false, error: 'owned' });
    expect(L.buyItem(p, 'rabbit', { name: 'Flopsy' })).toMatchObject({ ok: false, error: 'refuge' });
    p.island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 3 } }], animals: [] };
    expect(L.buyItem(p, 'rabbit', { name: 'Flopsy' })).toMatchObject({ ok: false, error: 'refuge' });
    p.island.land.buildings[0].have.stone = 4;
    const spent = p.shells.spent;
    const r1 = L.buyItem(p, 'rabbit', { name: '  Flopsy ' });
    const r2 = L.buyItem(p, 'sheep', { name: '' });
    expect([r1.ok, r2.ok, p.shells.spent - spent]).toEqual([true, true, 45]);
    expect(p.island.land.animals.map((a: any) => [a.kind, a.name, a.at, a.slot, a.fed])).toEqual([['rabbit', 'Flopsy', 'b2', 0, 0], ['sheep', '', 'b2', 1, 0]]);
    expect(L.buyItem(p, 'rabbit')).toMatchObject({ ok: false, error: 'pen' });
    expect(p.owned).toEqual(['spa']);
  });

  it('[base] a short balance says how many more for a blueprint and an animal', () => {
    const m = kid();
    const p = active(m);
    L.earnShells(p, 10);
    expect(L.buyItem(p, 'refuge')).toMatchObject({ ok: false, error: 'short', short: 40 });
    refugeDone(m);
    expect(L.buyItem(p, 'rabbit')).toMatchObject({ ok: false, error: 'short', short: 10 });
  });

  it('[base] arm: buyItem’s refuge check not asking for a finished one → a rabbit lands by an unfinished refuge (the row above fails)', () => {
    const anchor = '!buildingDone(rb)';
    expect(SAVE_HELPERS.split(anchor).length).toBe(2);
    const A = new Function(`${SAVE_HELPERS.replace(anchor, 'false')}; return { buyItem: buyItem, earnShells: earnShells };`)() as any;
    const m = kid();
    const p = active(m);
    A.earnShells(p, 100);
    p.island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 1, stone: 0 } }], animals: [] };
    expect(A.buyItem(p, 'rabbit').ok).toBe(true);
  });
});

// ── [B] and [A]: the island (the lanes' rows) ────────────────────────────────────────────────────────────────────────

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
/** The island as the Island page builds it: Read family's outputs (its `land` too — lane B's) into Island world. */
function isle(model: any) {
  const f = runScript(FAMILY_SCRIPT, { model });
  return bare(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land });
}
/** Ticks the island from the model's build, keeping the model at every moment as the page does; returns the last state and model. */
function tickKeep(model: any, ticks: number, watch?: (state: any, model: any) => void) {
  let state = isle(model).state;
  let m = model;
  for (let t = 0; t < ticks; t++) {
    state = bare(ISLAND_TICK_SCRIPT, { state, built: state }).state;
    const k = bare(ISLAND_KEEP_SCRIPT, { state, model: m, robots: [], words: WORDS, lang: 'en' });
    if (k.due) m = k.model;
    if (watch) watch(state, m);
  }
  return { state, model: m };
}
const atLand = (things: any[], id: string) => things.find((t: any) => String(t.id) === id || String(t.id).endsWith(':' + id));

describe('[B] IW-007 building on the island — her land drawn, two robots, the spa finished, the save kept', () => {
  it('[B] Read family gives her land; Island world draws the land plot at LAND_PLOT with each building at its stage', () => {
    const m = kid();
    active(m).island.land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 6, plank: 2 } }], animals: [] };
    expect(runScript(FAMILY_SCRIPT, { model: m }).land).toEqual(active(m).island.land);
    const w = isle(m).world;
    const parts = w.things.filter((t: any) => t.of === 'b1').map((t: any) => [t.x, t.y, t.bstage]);
    expect(parts).toEqual([[LAND_PLOT.x + 3, LAND_PLOT.y + 1, 2], [LAND_PLOT.x + 4, LAND_PLOT.y + 1, 2]]);
  });

  it('[B] a robot pinned on the land and a second of ANOTHER kind helping finish the spa on the island tick; the save’s spa only ever rises and ends finished', () => {
    const m = kid();
    const p = active(m);
    p.island.robots.push({ id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none', helps: LAND_ID, program: carry({ id: 'b1-stone', kind: 'site', x: 3, y: 1 }, 'rock') });
    p.island.land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 0, plank: 0 } }], animals: [] };
    p.island.plots[LAND_ID] = { program: carry({ id: 'b1-plank', kind: 'site', x: 4, y: 1 }, 'tree', 10), robotId: 'r1', wonAt: 1 };
    const seen: number[] = [];
    const r = tickKeep(m, 600, (_s, mm) => {
      const b = active(mm).island.land?.buildings?.[0];
      if (b) seen.push(b.have.stone + b.have.plank);
    });
    expect(active(r.model).island.land.buildings[0].have).toEqual({ stone: 6, plank: 4 });
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1])).toBe(true);
  });
});

describe('[A] IW-007 animals on the island — her rabbit by its bowl, fed by a robot, never gone', () => {
  const withRabbit = () => {
    const m = kid();
    const p = active(m);
    L.earnShells(p, 100);
    p.island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [] };
    L.buyItem(p, 'rabbit', { name: 'Flopsy' });
    return m;
  };

  it('[A] her rabbit is on the island by her bowl at the refuge’s pen (the bowl a land thing with animal and name)', () => {
    const m = withRabbit();
    const id = active(m).island.land.animals[0].id;
    const bowl = atLand(isle(m).world.things, id);
    expect(bowl).toMatchObject({ kind: 'bowl', animal: 'rabbit', name: 'Flopsy', x: LAND_PLOT.x + 3, y: LAND_PLOT.y + 4 });
  });

  it('[A] a feeding robot pinned on the land fills her bowl, wear empties it, the robot fills it again; she is still there', () => {
    const m = withRabbit();
    const p = active(m);
    const id = p.island.land.animals[0].id;
    const bowlRef = { id, kind: 'bowl', x: 3, y: 4 };
    p.island.plots[LAND_ID] = { program: [blk(1, 'until', { slots: { cond: is(bowlRef, 'full') }, body: [blk(2, 'go_nearest', { slots: { kind: 'patch' } }), blk(3, 'pick'), blk(4, 'go_to', { slots: { thing: bowlRef } }), blk(5, 'put')] })], robotId: 'r1', wonAt: 1 };
    const fed: number[] = [];
    const r = tickKeep(m, WEAR.bowl * 4, (s) => {
      const b = atLand(s.live?.[LAND_ID]?.things ?? [], id);
      if (b) fed.push(Number(b.count));
    });
    const full = ANIMALS.find((a) => a.id === 'rabbit')!.capacity;
    const firstFull = fed.indexOf(full);
    const dipped = fed.findIndex((v, i) => i > firstFull && v < full);
    expect({ firstFull: firstFull >= 0, dipped: dipped > firstFull, refilled: fed.slice(dipped).includes(full) }).toEqual({ firstFull: true, dipped: true, refilled: true });
    expect(active(r.model).island.land.animals.map((a: any) => [a.id, a.kind, a.name])).toEqual([[id, 'rabbit', 'Flopsy']]);
  });
});

// Keep the vocabulary import honest: the two new kinds are in the one table the kits copy.
it('[base] tree and patch are sources in JOB_VOCABULARY with their items', () => {
  expect(JOB_VOCABULARY.filter((k) => k.kind === 'tree' || k.kind === 'patch').map((k) => [k.kind, k.role, k.item, k.blocks])).toEqual([['tree', 'source', 'plank', true], ['patch', 'source', 'carrot', true]]);
});
