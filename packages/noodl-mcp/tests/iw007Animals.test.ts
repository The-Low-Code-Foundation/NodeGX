/**
 * P108 IW-007 (session 5, lane A) — the animals: the shop's Animals shelf (AC2's "the refuge unlocks Animals", "a rabbit
 * bought"), feeding on the engine (AC2's "the bowl empties on wear and the robot refills it" over the land helpers), an
 * animal that never leaves (AC3), and both kits drawing her by her bowl — happy when fed, waiting when hungry, never gone
 * (R2) — with the carrot patch and a carried carrot.
 *
 * Every page script runs as the Function node runs it (a bare `vm` context, Inputs in, Outputs out); the engine rows use
 * the base's LAND_SCRIPT; the kit rows load the BUILT kits (`project/noodl_modules/<kit>/index.js`, rebuilt by each
 * kit's build.mjs). The island rows (her rabbit on the island, a robot pinned on the land) are `[A]` in iw007Build.test.ts.
 *
 * @module noodl-mcp/tests/iw007Animals.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ANIMALS, LAND_ID, LAND_PLOT, REQUESTS, SHOP, WEAR } from './cg002Content';
import { ADD_PROFILE_SCRIPT, DECODE_SAVE_SCRIPT, ENCODE_SAVE_SCRIPT, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, DRAW_WORLD_SCRIPT, FAMILY_SCRIPT, ISLAND_WORLD_SCRIPT } from './cg003Scripts';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { BUY_SCRIPT, SHOP_CARD_SCRIPT, SHOP_IDS, SHOP_ROWS_SCRIPT } from './iw006Shop';
import { IW7A_DEFAULT_NAMES, IW7A_SHOP_SHARED } from './iw007Animals';
import { LAND_SCRIPT } from './iw007Land';

const compiled = new Map<string, vm.Script>();
/** Run a script in a bare vm context — only what the script brings (the Function node's way). */
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
const WORDS = JSON.parse(ALL_WORDS_JSON) as Array<{ key: string; en: string; fr: string }>;
const word = (key: string, lang: 'en' | 'fr' = 'en') => WORDS.find((w) => w.key === key)![lang];
const price = (id: string) => SHOP.find((i) => i.id === id)!.price;
const capacity = (kind: string) => ANIMALS.find((a) => a.id === kind)!.capacity;

const kid = (lang = 'en') => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang, robotName: 'Pip' }).model;
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
const funded = (m: any, n: number) => {
  helper(SAVE_HELPERS, 'earnShells', active(m), n);
  return m;
};
/** Her land with a refuge at (3, 3) — finished when `done`, one stone short otherwise. */
const withRefuge = (m: any, done = true) => {
  active(m).island.land = { buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: done ? 4 : 3 } }], animals: [] };
  return m;
};
const rows = (model: any, tab: string, lang = 'en', script = SHOP_ROWS_SCRIPT) => bare(script, { model, words: WORDS, lang, tab: SHOP_IDS.tab + tab });
const card = (model: any, itemId: string, extra: Record<string, unknown> = {}, lang = 'en') => bare(SHOP_CARD_SCRIPT, { model, words: WORDS, lang, requests: [], itemId: SHOP_IDS.item + itemId, ...extra });
const buy = (model: any, itemId: string, name?: string, script = BUY_SCRIPT) => bare(script, { model, itemId: SHOP_IDS.item + itemId, ...(name === undefined ? {} : { name }) });
const itemIds = (r: any) => r.items.map((i: any) => i.id.replace(SHOP_IDS.item, ''));

// ── the shop ─────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('IW-007 AC2 (lane A) — the refuge unlocks Animals; an animal bought and named', () => {
  it('🔴 shut until a refuge on her land is FINISHED: nothing to buy and one line, EN and FR; finished, the rabbit and the sheep and no line', () => {
    for (const lang of ['en', 'fr'] as const) {
      const none = rows(funded(kid(lang), 100), 'animals', lang);
      const short = rows(withRefuge(funded(kid(lang), 100), false), 'animals', lang);
      const open = rows(withRefuge(funded(kid(lang), 100)), 'animals', lang);
      expect([none.items, none.showLater, none.later]).toEqual([[], true, word('iw7aShut', lang)]);
      expect([short.items, short.showLater, short.later]).toEqual([[], true, word('iw7aShut', lang)]);
      expect([itemIds(open), open.showItems, open.showLater]).toEqual([['rabbit', 'sheep'], true, false]);
      expect(open.items.map((i: any) => i.name)).toEqual(['rabbit', 'sheep'].map((id) => SHOP.find((s) => s.id === id)!.name[lang]));
    }
    // Known-firing beside it: the Build tab is not lane A's — it says its own line, refuge or not. (s5 merge: lane B's
    // Build tab is open and its line says where a bought blueprint goes — iw7bBuildHow, no longer iw6hLaterBuild.)
    expect(rows(withRefuge(kid()), 'build').later).toBe(word('iw7bBuildHow'));
  });

  it('🔴 the card: what she has, the cost, what is left, and the name box (the default name in it); short, no name box and how many more', () => {
    const m = withRefuge(funded(kid(), 100));
    const c = card(m, 'rabbit');
    expect([c.showCard, c.showFigures, c.cost, c.canBuy, c.showName, c.namePlaceholder, c.showNone]).toEqual([true, true, word('iw6hCost').split('{n}').join(String(price('rabbit'))), true, true, IW7A_DEFAULT_NAMES.rabbit.en, false]);
    expect(card(withRefuge(funded(kid('fr'), 100)), 'sheep', {}, 'fr').namePlaceholder).toBe(IW7A_DEFAULT_NAMES.sheep.fr);
    const poor = card(withRefuge(funded(kid(), price('rabbit') - 3)), 'rabbit');
    expect([poor.canBuy, poor.showName, poor.short]).toEqual([false, false, word('iw6hShort').split('{n}').join('3')]);
  });

  it('🔴 Buy: her name on her, the bowl empty (fed 0) at a pen place, spent up by the price; the card then says who waits by her bowl', () => {
    const m = withRefuge(funded(kid(), 100));
    const spent = active(m).shells.spent;
    const b = buy(m, 'rabbit', '  Flopsy ');
    expect([b.ok, b.bought, active(b.model).shells.spent - spent]).toEqual([true, 'rabbit', price('rabbit')]);
    expect(active(b.model).island.land.animals.map((a: any) => [a.kind, a.name, a.at, a.slot, a.fed])).toEqual([['rabbit', 'Flopsy', 'b2', 0, 0]]);
    const after = card(b.model, 'rabbit', { bought: 'rabbit' });
    expect([after.done, after.showFigures, after.canBuy, after.showName]).toEqual([word('iw7aBought_rabbit').split('{name}').join('Flopsy'), false, false, false]);
    expect(after.done).toContain('her bowl');
    // The sheep's line is his (EN); FR says "son bol" for both.
    const s = buy(b.model, 'sheep', 'Bramble');
    expect(card(s.model, 'sheep', { bought: 'sheep' }).done).toBe(word('iw7aBought_sheep').split('{name}').join('Bramble'));
    expect(card(s.model, 'sheep', { bought: 'sheep' }, 'fr').done).toBe(word('iw7aBought_sheep', 'fr').split('{name}').join('Bramble'));
  });

  it('🔴 an empty name box: she takes the name the box showed — numbered only when one of hers already wears it', () => {
    let m: any = withRefuge(funded(kid(), 200));
    m = buy(m, 'rabbit', '').model;
    expect(active(m).island.land.animals.map((a: any) => a.name)).toEqual([IW7A_DEFAULT_NAMES.rabbit.en]);
    // A second refuge place: the next rabbit with no name is "Hazel 2" (the card's box said so first).
    expect(card(m, 'rabbit').namePlaceholder).toBe(`${IW7A_DEFAULT_NAMES.rabbit.en} 2`);
    m = buy(m, 'rabbit').model;
    expect(active(m).island.land.animals.map((a: any) => a.name)).toEqual([IW7A_DEFAULT_NAMES.rabbit.en, `${IW7A_DEFAULT_NAMES.rabbit.en} 2`]);
  });

  it('🔴 the pen full (two places, two animals): the card says so, no Buy, no name box; Buy refuses with pen and nothing is spent', () => {
    let m: any = withRefuge(funded(kid(), 200));
    m = buy(m, 'rabbit', 'Flopsy').model;
    m = buy(m, 'sheep', 'Bramble').model;
    const c = card(m, 'rabbit');
    expect([c.showCard, c.none, c.showNone, c.canBuy, c.showName]).toEqual([true, word('iw7aPenFull'), true, false, false]);
    const spent = active(m).shells.spent;
    const r = buy(m, 'rabbit', 'Third');
    expect([r.ok, r.error, active(r.model).shells.spent - spent, active(r.model).island.land.animals.length]).toEqual([false, 'pen', 0, 2]);
    // Known-firing: one place free again (a land with one animal) sells again.
    expect(card(withRefuge(funded(kid(), 200)), 'rabbit').canBuy).toBe(true);
  });

  it('🔴 arm: the shelf not asking for a FINISHED refuge → it opens beside a refuge one stone short (the first row fails)', () => {
    const anchor = 'buildingDone(land.buildings[i])';
    expect(IW7A_SHOP_SHARED.split(anchor).length).toBe(2);
    expect(SHOP_ROWS_SCRIPT.split(anchor).length).toBe(2);
    const mutant = SHOP_ROWS_SCRIPT.replace(anchor, 'true');
    expect(itemIds(rows(withRefuge(kid(), false), 'animals', 'en', mutant))).toEqual(['rabbit', 'sheep']);
  });

  it('🔴 arm: Buy not taking the default name → an animal with no name (the empty-box row fails)', () => {
    const anchor = "iw7aIt.kind === 'animal' && !name.trim()";
    expect(BUY_SCRIPT.split(anchor).length).toBe(2);
    const mutant = BUY_SCRIPT.replace(anchor, 'false');
    const m = buy(withRefuge(funded(kid(), 100)), 'rabbit', '', mutant).model;
    expect(active(m).island.land.animals.map((a: any) => a.name)).toEqual(['']);
  });
});

// ── feeding, on the engine and the land helpers ──────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const L = new Function(`${LAND_SCRIPT}; return { newRun: newRun, step: step, apply: apply, worldOf: worldOf, wearOf: wearOf, landRequest: landRequest, landThings: landThings, landKeep: landKeep, landOf: landOf };`)() as any;
const blk = (id: number, t: string, extra: Record<string, unknown> = {}) => ({ id, t, ...extra });
/** The feeding job as a child teaches it: until [her bowl] is full { go to nearest patch, pick, go to [her bowl], put }. */
const feeding = (bowl: { id: string; x: number; y: number }, from = 'patch') => [
  blk(1, 'until', { slots: { cond: { op: 'is', thing: { id: bowl.id, kind: 'bowl', x: bowl.x, y: bowl.y }, state: 'full' } }, body: [blk(2, 'go_nearest', { slots: { kind: from } }), blk(3, 'pick'), blk(4, 'go_to', { slots: { thing: { id: bowl.id, kind: 'bowl', x: bowl.x, y: bowl.y } } }), blk(5, 'put')] })
];
const landWithRabbit = () => ({ buildings: [{ id: 'b2', bp: 'refuge', x: 3, y: 3, have: { plank: 6, stone: 4 } }], animals: [{ id: 'a1', kind: 'rabbit', name: 'Flopsy', at: 'b2', slot: 0, fed: 0 }] });
/** One robot runs a program on a world to its end (or `max` steps); the world the engine wrote. */
function runOn(world: any, program: any[], max = 600) {
  let w = world;
  let run = L.newRun(program, 'r', 'en');
  let n = 0;
  for (; n < max && !run.done; n++) {
    const s = L.step(run, w, null);
    run = s.run;
    w = L.apply(w, s.delta);
  }
  return { w, n, done: run.done };
}
const landWorld = (land: any) => {
  const req = L.landRequest(land);
  return L.worldOf({ map: req.map, things: req.things, robots: [{ id: 'r', x: 0, y: 0, d: 1, carry: [], basket: 1, home: { x: 0, y: 0, d: 1 } }], job: req.job, seed: 1 });
};
const bowlOf = (w: any) => w.things.find((t: any) => t.id === 'a1');

describe('IW-007 AC2 + AC3 (lane A) — feeding on the land: the bowl filled from the patch, emptied by wear, filled again; she never leaves', () => {
  it('🔴 the feeding job fills her bowl to its capacity from the patch (a carrot each trip), and finishes', () => {
    const r = runOn(landWorld(landWithRabbit()), feeding({ id: 'a1', x: 3, y: 4 }));
    expect([r.done, bowlOf(r.w).count, bowlOf(r.w).capacity, r.w.things.find((t: any) => t.id === 'patch').left]).toEqual([true, capacity('rabbit'), capacity('rabbit'), 0]);
    // Known-firing: the same walk to the TREE brings planks her bowl refuses — a fixed three trips leave it empty.
    const wrong = runOn(landWorld(landWithRabbit()), [blk(1, 'repeat', { n: 3, body: feeding({ id: 'a1', x: 3, y: 4 }, 'tree')[0].body })]);
    expect([wrong.done, bowlOf(wrong.w).count]).toEqual([true, 0]);
  });

  it('🔴 wear takes a carrot every WEAR.bowl ticks until her bowl is empty; she is still there, by it, at every tick; the job run again fills it', () => {
    let w = runOn(landWorld(landWithRabbit()), feeding({ id: 'a1', x: 3, y: 4 })).w;
    const drops: number[] = [];
    let always = true;
    for (let t = 1; t <= WEAR.bowl * (capacity('rabbit') + 1); t++) {
      const was = bowlOf(w).count;
      for (const d of L.wearOf(w, t)) w = L.apply(w, d);
      if (bowlOf(w).count < was) drops.push(t);
      const b = bowlOf(w);
      always = always && !!b && b.animal === 'rabbit' && b.name === 'Flopsy' && b.x === 3 && b.y === 4;
    }
    expect([drops, bowlOf(w).count, always]).toEqual([[1, 2, 3].map((k) => k * WEAR.bowl), 0, true]);
    // The patch regrew meanwhile (WEAR.patch): the job run again fills her bowl again.
    expect(w.things.find((t: any) => t.id === 'patch').left).toBeGreaterThanOrEqual(capacity('rabbit'));
    const again = runOn(w, feeding({ id: 'a1', x: 3, y: 4 }));
    expect([again.done, bowlOf(again.w).count]).toEqual([true, capacity('rabbit')]);
  });

  it('🔴 the land kept from the island: fed follows her bowl down (wear) and up (a feed); she is never removed, her name kept through a save code', () => {
    const land: any = landWithRabbit();
    const things = L.landThings(land);
    things.find((t: any) => t.id === 'a1').count = 2;
    expect([L.landKeep(land, things), land.animals[0].fed]).toEqual([true, 2]);
    things.find((t: any) => t.id === 'a1').count = 0;
    expect([L.landKeep(land, things), land.animals[0].fed]).toEqual([true, 0]);
    // A keep with her bowl absent (a world that lost it) leaves her as she is — nothing removes an animal.
    expect([L.landKeep(land, things.filter((t: any) => t.id !== 'a1')), land.animals.map((a: any) => [a.id, a.name, a.fed])]).toEqual([false, [['a1', 'Flopsy', 0]]]);
    const m = kid();
    active(m).island.land = land;
    const back = runScript(DECODE_SAVE_SCRIPT, { code: runScript(ENCODE_SAVE_SCRIPT, { model: m }).code });
    expect(active(back.model).island.land.animals).toEqual(land.animals);
  });
});

// ── the kits ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');
const BUILT_2D = path.join(LIBRARY, 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'index.js');
const BUILT_3D = path.join(LIBRARY, 'garden-3d-kit', 'project', 'noodl_modules', 'garden-3d-kit', 'index.js');
/** Load built kit sources into one bare context (the 2D kit first, as a page loads both); the modules they defined. */
function loadKits(sources: string[]): any[] {
  const modules: any[] = [];
  const context: Record<string, any> = { Noodl: { defineModule: (m: any) => modules.push(m) }, React, console, setTimeout, clearTimeout };
  context.__noodl_modules = modules;
  vm.createContext(context);
  sources.forEach((src, i) => vm.runInContext(src, context, { filename: `kit${i}/index.js` }));
  return modules;
}
const garden = (src = fs.readFileSync(BUILT_2D, 'utf8')) => loadKits([src])[0].reactNodes.find((n: any) => n.name === 'garden-kit.Garden');
/** Garden drawn as a page draws it: Map as rows (a world the engine wrote) or as Draw world's { rows, legend }. */
const draw = (node: any, w: { map: unknown; things: unknown[]; robots: unknown[] }) => renderToStaticMarkup(React.createElement(node.getReactComponent(), { map: Array.isArray(w.map) ? { rows: w.map } : w.map, things: w.things, robots: w.robots }));
const cellOf = (html: string, x: number, y: number) => {
  const at = html.indexOf(`data-x="${x}" data-y="${y}"`);
  return html.slice(html.lastIndexOf('<button', at), html.indexOf('</button>', at));
};
/** A bowl by a pen tile as the land writes it, then fed by the ENGINE: a robot with `n` carrots puts them in. */
function fedWorld(kind: 'rabbit' | 'sheep', n: number) {
  const bowl = { kind: 'bowl', id: 'a1', item: 'carrot', capacity: capacity(kind), count: 0, food: 0, animal: kind, name: kind === 'rabbit' ? 'Flopsy' : 'Bramble', x: 1, y: 0 };
  const w = L.worldOf({ map: ['GGG', 'GGG'], things: [bowl, { kind: 'patch', id: 'patch', x: 2, y: 1, left: 3, max: 4 }], robots: [{ id: 'r', x: 1, y: 1, d: 0, carry: Array(n).fill('carrot'), basket: 4 }] });
  return runOn(w, Array.from({ length: n }, (_, i) => blk(i + 1, 'put'))).w;
}
const PET_READ = (cell: string) => ({
  animal: (cell.match(/data-animal="([^"]+)"/) || [])[1],
  mood: (cell.match(/data-mood="([^"]+)"/) || [])[1],
  sprite: (cell.match(/class="gd-sprite gd-pet[^"]*" data-sprite="([^"]+)"/) || [])[1],
  bowl: (cell.match(/class="gd-sprite gd-thing gd-bowl gd-pet-bowl[^"]*" data-sprite="([^"]+)"/) || [])[1],
  name: (cell.match(/data-pet-name="([^"]+)"/) || [])[1],
  meter: (cell.match(/class="gd-meter([^"]*)" data-meter="([^"]+)"/) || []).slice(1).join('|')
});

describe('IW-007 (lane A) — garden-kit draws her by her bowl: happy fed, waiting hungry, never gone; the patch; a carried carrot', () => {
  it('🔴 from worlds the engine wrote: a rabbit and a sheep at 0 (waiting), 1, and full (happy, a hop) — her name pill, the bowl’s meter in carrots', () => {
    const node = garden();
    const seen: unknown[] = [];
    for (const kind of ['rabbit', 'sheep'] as const)
      for (const n of [0, 1, capacity(kind)]) {
        const w = fedWorld(kind, n);
        expect(bowlOf(w).count).toBe(n);
        seen.push([kind, n, PET_READ(cellOf(draw(node, w), 1, 0))]);
        expect(node.world.job.petMood(bowlOf(w))).toBe(n > 0 ? 'happy' : 'waiting');
      }
    const cap = (k: string) => capacity(k);
    const look = (kind: string, n: number, name: string) => ({
      animal: kind,
      mood: n > 0 ? 'happy' : 'waiting',
      sprite: kind + (n > 0 ? 'Happy' : 'Wait'),
      bowl: n > 0 ? 'bowlCarrots' : 'bowl',
      name,
      meter: ` gd-m-carrot${n >= cap(kind) ? ' gd-full' : ''} gd-meter-top|${n}/${cap(kind)}`
    });
    expect(seen).toEqual([
      ['rabbit', 0, look('rabbit', 0, 'Flopsy')], ['rabbit', 1, look('rabbit', 1, 'Flopsy')], ['rabbit', 3, look('rabbit', 3, 'Flopsy')],
      ['sheep', 0, look('sheep', 0, 'Bramble')], ['sheep', 1, look('sheep', 1, 'Bramble')], ['sheep', 4, look('sheep', 4, 'Bramble')]
    ]);
    // The happy one hops (an animation, stilled for reduced motion); the waiting one is still.
    expect(cellOf(draw(node, fedWorld('rabbit', 2)), 1, 0)).toMatch(/gd-pet gd-pet-happy/);
    expect(node.css as string).toMatch(/\.gd-pet\.gd-pet-happy\{animation:gd-hop/);
    expect(node.css as string).toMatch(/prefers-reduced-motion: reduce\)\{\.gd-pet\.gd-pet-happy\{animation:none\}/);
    // Known-firing beside it: a bowl with no animal (Biscuit's) keeps its old look — no animal, no name.
    const plain = cellOf(draw(node, { map: ['GGG'], things: [{ kind: 'bowl', x: 1, y: 0, food: 1, count: 1, full: true }], robots: [] }), 1, 0);
    expect([/data-animal/.test(plain), /data-sprite="bowlFull"/.test(plain)]).toEqual([false, true]);
  });

  it('🔴 the patch shows its carrots by what is left (a meter in carrots), bare soil with sprouts used up; a picked carrot rides on the robot’s back', () => {
    const node = garden();
    const patch = (left: number) => cellOf(draw(node, { map: ['GGG'], things: [{ kind: 'patch', id: 'patch', x: 1, y: 0, left, max: 4 }], robots: [] }), 1, 0);
    expect([4, 3, 1, 0].map((n) => [(patch(n).match(/data-patch="(\d)"/) || [])[1], (patch(n).match(/class="gd-meter([^"]*)" data-meter="([^"]+)"/) || []).slice(1).join('|')])).toEqual([
      ['4', ' gd-m-carrot gd-meter-top|4/4'], ['3', ' gd-m-carrot gd-meter-top|3/4'], ['1', ' gd-m-carrot gd-meter-top|1/4'], ['0', ' gd-m-carrot gd-meter-top|0/4']
    ]);
    expect(patch(0)).toMatch(/gd-patch gd-used/);
    // The engine picks one: the patch shrinks and the carrot is the robot's load.
    const w = runOn(L.worldOf({ map: ['GGG'], things: [{ kind: 'patch', id: 'patch', x: 1, y: 0, left: 3, max: 4 }], robots: [{ id: 'r', x: 0, y: 0, d: 1, carry: [] }] }), [blk(1, 'pick')]).w;
    const html = draw(node, w);
    expect([w.things[0].left, w.robots[0].carry, (html.match(/data-load="([^"]+)"/) || [])[1], (cellOf(html, 1, 0).match(/data-patch="(\d)"/) || [])[1]]).toEqual([2, ['carrot'], 'carrot', '2']);
  });

  it('🔴 on the island (a wide world) she is drawn too, her meter the compact bar in carrot orange', () => {
    const node = garden();
    const map = Array.from({ length: 6 }, () => 'G'.repeat(24));
    const html = draw(node, { map, things: [{ kind: 'bowl', id: 'a1', item: 'carrot', capacity: 3, count: 0, animal: 'rabbit', name: 'Flopsy', x: 5, y: 2 }, { kind: 'patch', id: 'p', x: 1, y: 5, left: 2, max: 4 }], robots: [] });
    expect([/data-wide="1"/.test(html), PET_READ(cellOf(html, 5, 2)).mood, PET_READ(cellOf(html, 5, 2)).name]).toEqual([true, 'waiting', 'Flopsy']);
    expect(node.css as string).toMatch(/\.gd-world\[data-wide="1"\] \.gd-meter\.gd-m-carrot\{--c:#E06A1E\}/);
  });

  it('🔴 arm: her mood not read from her bowl → a hungry rabbit drawn happy (the first row fails); arm: the animal branch gone → no rabbit at all (never gone fails)', () => {
    const src = fs.readFileSync(BUILT_2D, 'utf8');
    const moodLine = "return n > 0 ? 'happy' : 'waiting';";
    expect(src.split(moodLine).length).toBe(2);
    expect(PET_READ(cellOf(draw(garden(src.replace(moodLine, "return 'happy';")), fedWorld('rabbit', 0)), 1, 0)).mood).toBe('happy');
    const branch = "else if (t.kind === 'bowl' && t.animal) petEls(t, i, m, extras);";
    expect(src.split(branch).length).toBe(2);
    expect(PET_READ(cellOf(draw(garden(src.replace(branch, '')), fedWorld('rabbit', 0)), 1, 0)).animal).toBeUndefined();
  });
});

// ── the 3D kit ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** A THREE stub: every class the kit constructs, counted by name, with just enough shape for the builders (ig007Garden3d's). */
function threeStub() {
  const counts: Record<string, number> = {};
  const vec = () => ({ x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } });
  const cls = (name: string, extra?: (this: any, ...args: any[]) => void) =>
    function (this: any, ...args: any[]) {
      counts[name] = (counts[name] || 0) + 1;
      this.type = name;
      this.name = '';
      this.position = vec();
      this.rotation = vec();
      this.scale = vec();
      this.scale.set(1, 1, 1);
      this.children = [];
      this.userData = {};
      this.matrix = {};
      this.instanceMatrix = {};
      this.add = (...kids: any[]) => kids.forEach((k) => this.children.push(k));
      this.remove = () => {};
      this.traverse = (f: (o: any) => void) => {
        f(this);
        this.children.forEach((c: any) => c.traverse && c.traverse(f));
      };
      this.getObjectByName = (n: string) => {
        let hit: any = null;
        this.traverse((o: any) => { if (!hit && o.name === n) hit = o; });
        return hit;
      };
      this.updateMatrix = () => {};
      this.setMatrixAt = () => {};
      this.setColorAt = () => { this.instanceColor = {}; };
      this.lookAt = () => {};
      this.updateProjectionMatrix = () => {};
      this.dispose = () => {};
      if (extra) extra.apply(this, args);
    };
  const THREE: Record<string, any> = {};
  for (const n of ['Group', 'Object3D', 'Mesh', 'InstancedMesh', 'Scene', 'PerspectiveCamera', 'DirectionalLight', 'HemisphereLight']) THREE[n] = cls(n);
  for (const n of ['BoxGeometry', 'ConeGeometry', 'CylinderGeometry', 'IcosahedronGeometry', 'SphereGeometry', 'PlaneGeometry', 'MeshLambertMaterial', 'Color']) THREE[n] = cls(n);
  THREE.WebGLRenderer = cls('WebGLRenderer', function (this: any) {
    this.info = { render: { calls: 0 } };
    this.setPixelRatio = () => {};
    this.setSize = () => {};
    this.render = () => { this.info.render.calls = 7; };
  });
  return { THREE, counts };
}
/** A fake DOM just wide enough for the engine's overlay and root attributes (ig007Garden3d's). */
function fakeDom() {
  const mk = (): any => ({
    style: {},
    attrs: {} as Record<string, string>,
    children: [] as any[],
    textContent: '',
    setAttribute(k: string, v: string) { this.attrs[k] = v; },
    getAttribute(k: string) { return this.attrs[k]; },
    removeAttribute(k: string) { delete this.attrs[k]; },
    appendChild(c: any) { this.children.push(c); return c; },
    removeChild(c: any) { this.children.splice(this.children.indexOf(c), 1); },
    get firstChild() { return this.children[0] || null; }
  });
  const doc = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {}, createElement: () => mk(), createTextNode: (t: string) => ({ text: t }) };
  const root = Object.assign(mk(), { clientWidth: 600, clientHeight: 450 });
  const canvas = { getContext: () => ({}), addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0 }), setPointerCapture() {} };
  return { doc, root, canvas, overlay: mk() };
}

describe('IW-007 (lane A) — garden-3d-kit builds her by her bowl, the patch and a carried carrot; her name in the overlay; a hop when fed', () => {
  const both = () => loadKits([fs.readFileSync(BUILT_2D, 'utf8'), fs.readFileSync(BUILT_3D, 'utf8')]);
  const node3d = () => both()[1].reactNodes.find((n: any) => n.name === 'garden-3d-kit.Garden3D');
  const names = (g: any) => {
    const out: string[] = [];
    g.traverse((o: any) => o.name && out.push(o.name));
    return out.sort();
  };

  it('🔴 a rabbit and a sheep standing (fed) or sitting (waiting) by a bowl with carrots or none — honestly counted; petMood pinned to garden-kit’s', () => {
    const mods = both();
    const node = mods[1].reactNodes.find((n: any) => n.name === 'garden-3d-kit.Garden3D');
    const node2d = mods[0].reactNodes.find((n: any) => n.name === 'garden-kit.Garden');
    const got: unknown[] = [];
    for (const kind of ['rabbit', 'sheep'] as const)
      for (const n of [0, 2]) {
        const w = fedWorld(kind, n);
        const st = threeStub();
        const built = node.scene.buildScene({ map: node.world.parseMap({ rows: w.map }), things: node.world.parseThings(w.things), robots: [] }, st.THREE);
        expect(st.counts.Mesh + (st.counts.InstancedMesh || 0)).toBe(built.meshCount);
        const g = built.things.find((x: any) => x.userData.kind === 'bowl');
        expect(node.job.petMood(bowlOf(w))).toBe(node2d.world.job.petMood(bowlOf(w)));
        got.push([kind, n, g.userData.mood, g.userData.petName, g.userData.meter.text, names(g).filter((x) => x !== 'wool' && x !== 'ear').join(' '), g.userData.lift]);
      }
    expect(got).toEqual([
      ['rabbit', 0, 'waiting', 'Flopsy', '0/3', 'animal body bowl head tail', 0.72],
      ['rabbit', 2, 'happy', 'Flopsy', '2/3', 'animal body bowl carrots head tail', 0.72],
      ['sheep', 0, 'waiting', 'Bramble', '0/4', 'animal bowl head', 0.72],
      ['sheep', 2, 'happy', 'Bramble', '2/4', 'animal bowl carrots head legs legs', 0.72]
    ]);
  });

  it('🔴 the patch by what is left (carrots, then sprouts), its chip in carrots; a carrot on a robot’s back', () => {
    const node = node3d();
    const patch = (left: number) => {
      const st = threeStub();
      const b = node.scene.buildScene({ map: node.world.parseMap({ rows: ['GGG'] }), things: node.world.parseThings([{ kind: 'patch', id: 'p', x: 1, y: 0, left, max: 4 }]), robots: [] }, st.THREE);
      return [b.things[0].userData.carrots, b.things[0].userData.meter.text, b.things[0].userData.meter.icon, b.meshCount === st.counts.Mesh + (st.counts.InstancedMesh || 0)];
    };
    expect([4, 2, 0].map(patch)).toEqual([[4, '4/4', 'carrot', true], [2, '2/4', 'carrot', true], [0, '0/4', 'carrot', true]]);
    const st = threeStub();
    const bot = node.scene.buildRobot(st.THREE, (c: number) => new st.THREE.MeshLambertMaterial({ color: c }), node.world.parseRobots([{ x: 0, y: 0, d: 1, carry: ['carrot'] }])[0], { meshCount: 0, geos: null });
    expect(bot.children.find((c: any) => c.name === 'load').userData.load).toBe('carrot');
  });

  it('🔴 her name is a pill in the overlay; a carrot landing in her bowl makes her hop (frames while she hops, then still)', () => {
    const node = node3d();
    const { THREE } = threeStub();
    const dom = fakeDom();
    const frames: Array<() => void> = [];
    let t = 1000;
    const eng = node.engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => t, raf: (f: () => void) => (frames.push(f), frames.length), caf: () => {}, onTap: () => {} });
    const worldOf = (n: number) => {
      const w = fedWorld('rabbit', n);
      return { map: node.world.parseMap({ rows: w.map }), things: node.world.parseThings(w.things), robots: [] };
    };
    eng.setWorld(worldOf(0));
    while (frames.length) frames.shift()!();
    const pills = dom.overlay.children.filter((c: any) => /gd3-pet/.test(c.className));
    expect(pills.map((c: any) => [c.textContent, c.attrs['data-mood']])).toEqual([['Flopsy', 'waiting']]);
    // A carrot lands: she is redrawn happy and hops — a frame a quarter of the way through has her up, the last one down.
    eng.setWorld(worldOf(1));
    expect(frames.length).toBeGreaterThan(0);
    t += 175;
    frames.shift()!();
    const pet = () => eng.built.things.find((g: any) => g.userData.kind === 'bowl').getObjectByName('animal');
    const up = pet().position.y;
    let n = 0;
    while (frames.length && n < 100) {
      t += 50;
      frames.shift()!();
      n++;
    }
    expect([up > 0.1, pet().position.y, frames.length, dom.root.attrs['data-idle'], eng.built.things.find((g: any) => g.userData.kind === 'bowl').userData.mood]).toEqual([true, 0, 0, 'true', 'happy']);
    // Known-firing beside it: a world where her bowl did NOT rise (the same count) draws no hop: she stays down, and the
    // frames stop at once.
    eng.setWorld(worldOf(1));
    let still = 0;
    while (frames.length && still < 100) {
      t += 50;
      frames.shift()!();
      still++;
      expect(pet().position.y).toBe(0);
    }
    expect(still).toBeLessThanOrEqual(1);
    eng.destroy();
  });

  it('🔴 arm: the rise not marked → no hop when a carrot lands (the hop row fails)', () => {
    const src3d = fs.readFileSync(BUILT_3D, 'utf8');
    const anchor = 'if (before && petCount(before) < g.userData.fed) anims.hops[key] = t0;';
    expect(src3d.split(anchor).length).toBe(2);
    const node = loadKits([fs.readFileSync(BUILT_2D, 'utf8'), src3d.replace(anchor, '')])[1].reactNodes.find((n: any) => n.name === 'garden-3d-kit.Garden3D');
    const { THREE } = threeStub();
    const dom = fakeDom();
    const frames: Array<() => void> = [];
    let t = 1000;
    const eng = node.engine.create({ THREE, root: dom.root, canvas: dom.canvas, overlay: dom.overlay, doc: dom.doc, now: () => t, raf: (f: () => void) => (frames.push(f), frames.length), caf: () => {}, onTap: () => {} });
    const worldOf = (n: number) => {
      const w = fedWorld('rabbit', n);
      return { map: node.world.parseMap({ rows: w.map }), things: node.world.parseThings(w.things), robots: [] };
    };
    eng.setWorld(worldOf(0));
    while (frames.length) frames.shift()!();
    eng.setWorld(worldOf(1));
    t += 175;
    if (frames.length) frames.shift()!();
    expect(eng.built.things.find((g: any) => g.userData.kind === 'bowl').getObjectByName('animal').position.y).toBe(0);
    eng.destroy();
  });
});

// ── the drawer: "go to nearest" offers the land's patch and tree ──────────────────────────────────────────────────────

describe('IW-007 (lane A) — the drawer’s “go to nearest” offers the carrot patch and the tree (a real Blockly 12.3.1)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Blockly = require(path.join(LIBRARY, 'garden-kit', 'project', 'noodl_modules', 'garden-kit', 'blockly_compressed.js'));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { JSDOM } = require('jsdom');
  Blockly.utils.xml.injectDependencies(new JSDOM('<!DOCTYPE html>').window);
  const blocksOf = (src: string) => {
    const modules: any[] = [];
    const context: Record<string, any> = { Noodl: { defineModule: (m: any) => modules.push(m) }, React, console, setTimeout, clearTimeout, Blockly };
    vm.createContext(context);
    vm.runInContext(src, context, { filename: 'garden-kit/index.js' });
    const node = modules[0].reactNodes.find((n: any) => n.name === 'garden-kit.Blocks');
    node.defineBlocks(Blockly);
    return node;
  };
  const kindsOf = (node: any, lang: string, words: unknown[] = []) => {
    const ws = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(node.translate.toBlockly(feeding({ id: 'a1', x: 3, y: 4 })), ws);
      const back = node.translate.toEngine(Blockly.serialization.workspaces.save(ws));
      const go = ws.getAllBlocks(false).find((b: any) => b.type === 'garden_go_nearest');
      // The block's context is the node's: words and language the page sends (here set on the workspace as the node does).
      const field = go.getField('KIND');
      const opts = field.optionsList();
      return { back: back[0].body[0].slots.kind, opts: opts.map((o: any) => o[1]), labels: opts.slice(-2).map((o: any) => o[0]), text: field.getText_(), lang, words };
    } finally {
      ws.dispose();
    }
  };

  it('🔴 the feeding program round-trips through Blockly with go to nearest 🥕 patch; the kind list ends with the patch and the tree', () => {
    const node = blocksOf(fs.readFileSync(BUILT_2D, 'utf8'));
    const got = kindsOf(node, 'en');
    expect(got.back).toBe('patch');
    // The two land sources close the list (a value the list lacks would be appended raw: the words prove they are listed).
    expect([got.opts.slice(-2), got.labels, got.text]).toEqual([['patch', 'tree'], ['🥕 carrot patch', '🌳 tree'], '🥕 carrot patch']);
    expect(got.opts.slice(0, 2)).toEqual(['egg', 'rock']);
  });
});

// ── on the island: her land drawn through the page's own scripts (Read family → Island world → tick → Draw world → kit) ──

describe('IW-007 AC2 (lane A) — on the island: a bought rabbit appears at once by her empty bowl, waiting; fed by a pinned robot she is happy', () => {
  /** The island as the Island page builds it, ticked n times, then Draw world: what the kits are given. */
  const island = (model: any, ticks = 0) => {
    const f = runScript(FAMILY_SCRIPT, { model });
    let out = bare(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land });
    for (let i = 0; i < ticks; i++) out = bare(ISLAND_TICK_SCRIPT, { state: out.state, built: out.state });
    return bare(DRAW_WORLD_SCRIPT, { world: out.world, words: WORDS, lang: 'en', botName: 'Pip' });
  };
  const near = (d: any, x: number, y: number, kind: string) => d.things.find((t: any) => t.kind === kind && t.x === LAND_PLOT.x + x && t.y === LAND_PLOT.y + y);

  it('🔴 bought: her bowl reaches the kits with her kind and name, empty (0/3) — the kit draws her waiting there; the patch reaches them with its carrots', () => {
    const m = buy(withRefuge(funded(kid(), 100)), 'rabbit', 'Flopsy').model;
    const d = island(m);
    expect(near(d, 3, 4, 'bowl')).toMatchObject({ animal: 'rabbit', name: 'Flopsy', count: 0, capacity: capacity('rabbit'), item: 'carrot' });
    expect(near(d, 0, 5, 'patch')).toMatchObject({ left: 3, max: 4 });
    const html = draw(garden(), { map: d.map, things: d.things, robots: d.robots });
    expect(PET_READ(cellOf(html, LAND_PLOT.x + 3, LAND_PLOT.y + 4))).toMatchObject({ animal: 'rabbit', mood: 'waiting', name: 'Flopsy' });
    expect((cellOf(html, LAND_PLOT.x, LAND_PLOT.y + 5).match(/data-patch="(\d)"/) || [])[1]).toBe('3');
    // Known-firing beside it: before Buy, no animal stands on her land.
    expect(island(withRefuge(funded(kid(), 100))).things.some((t: any) => t.animal)).toBe(false);
  });

  it('🔴 a feeding robot pinned on her land: within a few island ticks her bowl has carrots and the kit draws her happy', () => {
    const m = buy(withRefuge(funded(kid(), 100)), 'rabbit', 'Flopsy').model;
    const p = active(m);
    const id = p.island.land.animals[0].id;
    p.island.plots[LAND_ID] = { program: feeding({ id, x: 3, y: 4 }), robotId: p.island.robots[0].id, wonAt: 1 };
    let ticks = 0;
    let d: any = island(m);
    while (ticks < 200 && !(near(d, 3, 4, 'bowl').count > 0)) d = island(m, (ticks += 5));
    expect([ticks > 0 && ticks < 200, near(d, 3, 4, 'bowl').name]).toEqual([true, 'Flopsy']);
    expect(PET_READ(cellOf(draw(garden(), { map: d.map, things: d.things, robots: d.robots }), LAND_PLOT.x + 3, LAND_PLOT.y + 4)).mood).toBe('happy');
  });

  it('🔴 arm: Draw world without lane A’s bowl line → her bowl reaches the kits as a plain bowl, no animal (the first row fails)', () => {
    const anchor = "else if (t.kind === 'bowl' && t.animal) things.push(";
    expect(DRAW_WORLD_SCRIPT.split(anchor).length).toBe(2);
    const line = DRAW_WORLD_SCRIPT.slice(DRAW_WORLD_SCRIPT.indexOf(anchor), DRAW_WORLD_SCRIPT.indexOf('\n', DRAW_WORLD_SCRIPT.indexOf(anchor)));
    const mutant = DRAW_WORLD_SCRIPT.replace(line, '');
    const m = buy(withRefuge(funded(kid(), 100)), 'rabbit', 'Flopsy').model;
    const f = runScript(FAMILY_SCRIPT, { model: m });
    const world = bare(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], land: f.land }).world;
    const bowl = bare(mutant, { world, words: WORDS, lang: 'en', botName: 'Pip' }).things.find((t: any) => t.kind === 'bowl' && t.x === LAND_PLOT.x + 3);
    expect([bowl.animal, bowl.name]).toEqual([undefined, undefined]);
  });
});
