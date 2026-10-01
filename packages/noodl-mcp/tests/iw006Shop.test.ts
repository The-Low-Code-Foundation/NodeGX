/**
 * P108 IW-006 (session 4, lane H) — the gate over the shop: what it shows (AC3), the purchase card (D4: what she has, the
 * cost, what is left, or how many more shells), Buy (the one purchase rule), the helpers each for exactly one job (AC4),
 * the upgrades moved from the islanders' first wins into the shop, and the robot's brain reaching the Workshop's Blocks
 * node. Every script runs the way the Function node runs it: a bare `vm` context, `Inputs` in, `Outputs` out.
 *
 * @module noodl-mcp/tests/iw006Shop.test
 */
import * as vm from 'vm';

import { BRAIN_SIZE, CREW_CAP, REQUESTS, SHOP, SHOP_TABS, UPGRADES } from './cg002Content';
import { ADD_PROFILE_SCRIPT, COMPLETE_REQUEST_SCRIPT, DECODE_SAVE_SCRIPT, ENCODE_SAVE_SCRIPT, ENGINE, SAVE_HELPERS, helper, runScript } from './cg002Scripts';
import { ALL_WORDS_JSON, FAMILY_SCRIPT, GLUE_SCRIPTS, ISLAND_WORLD_SCRIPT, JOB_ROBOT_SCRIPT } from './cg003Scripts';
import { CG003_COMPONENTS, LOGIC_SPECS } from './cg003Components';
import { ISLAND_TICK_SCRIPT } from './ig004Island';
import { BRAIN_SCRIPT, BUY_SCRIPT, SHOP_CARD_SCRIPT, SHOP_FIRST_TAB, SHOP_IDS, SHOP_PATHS, SHOP_ROWS_SCRIPT, USE_HELPER_SCRIPT } from './iw006Shop';

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
const fill = (t: string, v: Record<string, unknown>) => Object.entries(v).reduce((a, [k, x]) => a.split(`{${k}}`).join(String(x)), t);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const req = (id: string) => REQUESTS.find((r) => r.id === id)!;

const kid = (lang = 'en') => runScript(ADD_PROFILE_SCRIPT, { model: null, name: 'Ada', band: 2, lang, robotName: 'Pip' }).model;
const win = (model: any, id: string, robotId?: string) =>
  runScript(COMPLETE_REQUEST_SCRIPT, { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: clone(req(id).referenceProgram), robotId, now: 1759300000000 });
const active = (m: any) => m.profiles.find((p: any) => p.id === m.island.activeId);
/** A family with shells: earned through the one earning rule (earnShells), as lane E's runs will. */
const funded = (m: any, n: number) => { helper(SAVE_HELPERS, 'earnShells', active(m), n); return m; };
/** P108 IW-006 owed (lane O): a price is SHOP's, never a literal (lane O retuned the prices; the rows below read them). */
const P = (id: string) => SHOP.find((i) => i.id === id)!.price;
/** A copy's price: the rows below were written at 30 (32 = a copy + 2, 22 = a copy − 8, 50 / 40 = a copy + 20 / + 10). */
const COPY = P('robot:pip');

const rows = (model: any, tab?: string, lang = 'en') => bare(SHOP_ROWS_SCRIPT, { model, words: WORDS, lang, tab });
const card = (model: any, itemId: string, extra: Record<string, unknown> = {}, lang = 'en') => bare(SHOP_CARD_SCRIPT, { model, words: WORDS, lang, requests: REQUESTS, itemId: SHOP_IDS.item + itemId, ...extra });
const buy = (model: any, itemId: string, extra: Record<string, unknown> = {}) => bare(BUY_SCRIPT, { model, itemId: SHOP_IDS.item + itemId, ...extra });
const ids = (list: Array<{ id: string }>) => list.map((r) => r.id.replace(SHOP_IDS.item, ''));

/** Her island as the Island page builds it (Read family → Island world), and one tick of it. */
function isle(model: any, kept?: unknown) {
  const f = runScript(FAMILY_SCRIPT, { model });
  return bare(ISLAND_WORLD_SCRIPT, { requests: REQUESTS, plots: f.plots, robots: f.robots, done: f.done, band: f.band, pins: [], kept });
}
const tick = (state: any) => bare(ISLAND_TICK_SCRIPT, { state, built: state }).state;
const use = (model: any, itemId: string, plotId: string, state: any) => bare(USE_HELPER_SCRIPT, { model, itemId: SHOP_IDS.item + itemId, plotId: SHOP_IDS.plot + plotId, state });

describe('IW-006 AC3 — the shop: what it shows', () => {
  it('🔴 five tabs in order, in both languages; it opens on Robots; Build sells the blueprints (and says where they go); Animals sells nothing yet and says so in one line', () => {
    const m = kid();
    for (const lang of ['en', 'fr'] as const) {
      const r = rows(m, undefined, lang);
      expect(r.tabs.map((t: any) => [t.id, t.label, t.selected])).toEqual(SHOP_TABS.map((t) => [SHOP_IDS.tab + t, word(`iw6hTab${t[0].toUpperCase()}${t.slice(1)}`, lang), t === SHOP_FIRST_TAB]));
      // P108 IW-007 (lane B): the Build tab is open — every blueprint, and one line: buy one, then tap your land to place it.
      const b = rows(m, SHOP_IDS.tab + 'build', lang);
      expect([ids(b.items), b.showItems, b.showLater, b.later]).toEqual([SHOP.filter((i) => i.kind === 'blueprint').map((i) => i.id), true, true, word('iw7bBuildHow', lang)]);
      // P108 IW-007 (lane A): Animals, shut until a refuge on her land is finished, says build the refuge first (iw7aShut);
      // it opens with the refuge (iw007Animals.test.ts).
      const e = rows(m, SHOP_IDS.tab + 'animals', lang);
      expect([e.items, e.showItems, e.showLater, e.later]).toEqual([[], false, true, word('iw7aShut', lang)]);
    }
    // Known-firing: Robots, Upgrades and Helpers sell something, and say nothing about later.
    for (const t of ['robots', 'upgrades', 'helpers']) expect([t, rows(m, t).showItems, rows(m, t).showLater]).toEqual([t, true, false]);
  });

  it('🔴 the balance on the button: earned − spent, EN and FR; it falls by what she bought', () => {
    const m = funded(kid(), COPY + 2);
    expect([rows(m).btnText, rows(m, undefined, 'fr').btnText]).toEqual([`🐚 ${COPY + 2} · Shop`, `🐚 ${COPY + 2} · Boutique`]);
    const b = buy(m, 'robot:pip');
    expect(b.ok).toBe(true);
    expect([rows(b.model).balance, rows(b.model).btnText, rows(b.model).balText]).toEqual([2, '🐚 2 · Shop', '🐚 2 shells']);
  });

  it('🔴 each item: a picture, a price, its name and one line in her language (the catalogue’s)', () => {
    const m = funded(win(kid('fr'), 'rows-trick').model, 5);
    for (const tab of ['robots', 'upgrades', 'helpers']) {
      for (const it of rows(m, tab, 'fr').items) {
        const s = SHOP.find((x) => SHOP_IDS.item + x.id === it.id)!;
        expect({ id: it.id, icon: it.icon, price: it.price, name: it.name, line: it.line }).toEqual({ id: it.id, icon: s.icon, price: `🐚 ${s.price}`, name: s.name.fr, line: s.line.fr });
      }
    }
  });

  it('🔴 Robots: a copy of each kind her island has, no other (buyItem refuses the rest)', () => {
    expect(ids(rows(kid(), 'robots').items)).toEqual(['robot:pip']);
    const lent = win(kid(), 'path-postbox').model;
    expect(ids(rows(lent, 'robots').items)).toEqual(['robot:pip', 'robot:cobble']);
  });

  it('🔴 Upgrades: the brains always; can+ / basket+ / boots once the request an islander gave it after is done and a robot of hers fits it; one given before still counts (Yours)', () => {
    expect(ids(rows(kid(), 'upgrades').items)).toEqual(['brain16', 'brain20']);
    // Mamie's rows done: the bigger can comes to the shop (it is no longer given — a row below).
    const rt = win(kid(), 'rows-trick').model;
    expect(ids(rows(rt, 'upgrades').items)).toEqual(['can+', 'brain16', 'brain20']);
    // Sami's stones need Cobble: done, with Cobble lent, the bigger hod too. Boots fit Pocket only: wall-until done without
    // Pocket shows nothing; with Pocket (bowl-if lends her) it shows.
    let m = win(win(kid(), 'path-postbox').model, 'path-stones', 'cobble').model;
    expect(ids(rows(m, 'upgrades').items)).toEqual(['basket+', 'brain16', 'brain20']);
    m = win(m, 'wall-until').model;
    expect(ids(rows(m, 'upgrades').items)).not.toContain('boots');
    m = win(m, 'bowl-if', 'cobble').model;
    expect(ids(rows(m, 'upgrades').items)).toContain('boots');
    // A v4 profile given the can by Mamie keeps it: the shop shows it as hers, and sells it no more.
    const given = kid();
    active(given).stickers.push('can+');
    const it = rows(given, 'upgrades').items.find((x: any) => x.id === SHOP_IDS.item + 'can+');
    expect([it && it.tag, it && it.hasTag]).toEqual([word('iw6hYours'), true]);
    expect([card(given, 'can+').canBuy, card(given, 'can+').done]).toEqual([false, word('iw6hYoursLine')]);
  });

  it('Helpers: all three; one she holds says Ready to use', () => {
    const m = funded(kid(), P('rain'));
    expect(ids(rows(m, 'helpers').items)).toEqual(['rain', 'selfcan', 'barrow']);
    const b = buy(m, 'rain');
    const held = rows(b.model, 'helpers').items.map((x: any) => [x.id.replace(SHOP_IDS.item, ''), x.tag]);
    expect(held).toEqual([['rain', word('iw6hHeld')], ['selfcan', ''], ['barrow', '']]);
  });
});

describe('IW-006 AC3 — the purchase card (D4)', () => {
  it('🔴 what she has, the cost, what is left; a copy’s card asks its name (the kind’s and its number by default)', () => {
    const m = funded(kid(), COPY + 2);
    const c = card(m, 'robot:pip');
    expect([c.showCard, c.icon, c.name, c.have, c.cost, c.left, c.showLeft, c.showShort, c.canBuy, c.showName, c.namePlaceholder]).toEqual([true, '🤖', 'A new Pip', `You have 🐚 ${COPY + 2}`, `It costs 🐚 ${COPY}`, 'Left after: 🐚 2', true, false, true, true, 'Pip 2']);
    const fr = card(m, 'robot:pip', {}, 'fr');
    expect([fr.name, fr.have, fr.cost, fr.left, fr.namePlaceholder]).toEqual(['Un nouveau Pip', `Tu as 🐚 ${COPY + 2}`, `Ça coûte 🐚 ${COPY}`, 'Il te restera 🐚 2', 'Pip 2']);
  });

  it('🔴 a price she cannot pay says how many more shells, and has no Buy (EN, FR, one shell)', () => {
    const m = funded(kid(), COPY - 8);
    const c = card(m, 'robot:pip');
    expect([c.have, c.cost, c.showLeft, c.showShort, c.short, c.canBuy, c.showName]).toEqual([`You have 🐚 ${COPY - 8}`, `It costs 🐚 ${COPY}`, false, true, 'You need 8 more shells.', false, false]);
    expect(card(m, 'robot:pip', {}, 'fr').short).toBe('Il te faut encore 8 coquillages.');
    expect(card(funded(kid(), COPY - 1), 'robot:pip').short).toBe('You need 1 more shell.');
    // Known-firing: with exactly the price, Buy shows and nothing is short.
    expect([card(funded(kid(), COPY), 'robot:pip').canBuy, card(funded(kid(), COPY), 'robot:pip').left]).toEqual([true, 'Left after: 🐚 0']);
  });

  it('🔴 a brain’s card picks the robot: only robots at the size before; one alone is picked for her; two wait for her tap', () => {
    const one = funded(kid(), 100);
    const c1 = card(one, 'brain16');
    expect([c1.robots.map((r: any) => [r.id, r.label, r.selected]), c1.robotId, c1.canBuy]).toEqual([[[SHOP_IDS.robot + 'r1', 'Pip · 12 blocks', true]], 'r1', true]);
    const brain20 = card(one, 'brain20');
    expect([brain20.robots, brain20.canBuy, brain20.none, brain20.showNone]).toEqual([[], false, word('iw6hNoBrain'), true]);
    const two = funded(win(kid(), 'path-postbox').model, 100);
    const c2 = card(two, 'brain16');
    expect([c2.robots.length, c2.robotId, c2.canBuy]).toEqual([2, '', false]);
    const picked = card(two, 'brain16', { robotId: SHOP_IDS.robot + 'cobble' });
    expect([picked.robotId, picked.canBuy, picked.robots.filter((r: any) => r.selected).map((r: any) => r.id)]).toEqual(['cobble', true, [SHOP_IDS.robot + 'cobble']]);
  });

  it('🔴 a full island (CREW_CAP robots) sells no more copies, and says why', () => {
    const m = funded(kid(), 1000);
    while (active(m).island.robots.length < CREW_CAP) expect(helper<any>(SAVE_HELPERS, 'buyItem', active(m), 'robot:pip').ok).toBe(true);
    const c = card(m, 'robot:pip');
    expect([c.canBuy, c.showName, c.none]).toEqual([false, false, fill(word('iw6hFull'), { n: CREW_CAP })]);
  });

  it('🔴 “It’s yours!” on the card of what was just bought — and only that (no “you need N more” under it); on no other card', () => {
    const m = funded(kid(), COPY + 20);
    const b = buy(m, 'robot:pip');
    const c = card(b.model, 'robot:pip', { bought: 'robot:pip' });
    expect([c.done, c.showDone, c.showFigures, c.showShort, c.canBuy, c.showName]).toEqual([word('iw6hBought'), true, false, false, false, false]);
    // Known-firing: the same card a moment later (another item tapped, then this one) sells again and says it is short.
    const again = card(b.model, 'robot:pip', { bought: 'none' });
    expect([again.showDone, again.showFigures, again.showShort]).toEqual([false, true, true]);
    expect(card(m, 'rain', { bought: 'barrow' }).showDone).toBe(false);
  });
});

describe('IW-006 AC2 / AC3 — Buy: the one purchase rule on her profile', () => {
  it('🔴 Buy spends through buyItem only: spent rises by the price, earned never moves; a refusal changes nothing', () => {
    const m = funded(kid(), COPY + 10);
    const before = clone(active(m).shells);
    const b = buy(m, 'robot:pip', { name: 'Bubbles' });
    const p = active(b.model);
    expect([b.ok, b.bought, p.shells.earned, p.shells.spent - before.spent, p.island.robots[p.island.robots.length - 1].name]).toEqual([true, 'robot:pip', COPY + 10, COPY, 'Bubbles']);
    const no = buy(b.model, 'robot:pip');
    expect([no.ok, no.error, no.short, no.bought, active(no.model).shells]).toEqual([false, 'short', COPY - 10, '', p.shells]);
    // A brain for the robot the card chose (its row id).
    const br = buy(funded(b.model, P('brain16')), 'brain16', { robotId: SHOP_IDS.robot + 'r1' });
    expect([br.ok, active(br.model).island.robots[0].brain]).toEqual([true, 16]);
    // Round-trip: what she bought survives the save code.
    const back = runScript(DECODE_SAVE_SCRIPT, { code: runScript(ENCODE_SAVE_SCRIPT, { model: br.model }).code }).model;
    expect([active(back).shells, active(back).island.robots.length]).toEqual([active(br.model).shells, 2]);
  });

  it('🔴 AC2: nothing but Logic/Buy spends — no other script the pages run calls buyItem or raises spent', () => {
    const outside = LOGIC_SPECS.filter((s) => s.script.split(SAVE_HELPERS).join('').match(/buyItem\(|shells\.spent\s*[+]?=/)).map((s) => s.path);
    expect(outside).toEqual(['Logic/Buy']);
  });
});

describe('IW-006 AC4 — every helper does what its line says for exactly one job, then is gone', () => {
  /** Ada's island: tulips-three pinned to Pip, path-stones to Cobble; shells to spend. */
  const family = () => {
    let m = win(kid(), 'path-postbox').model;
    m = win(m, 'tulips-three', 'r1').model;
    m = win(m, 'path-stones', 'cobble').model;
    return funded(m, 100);
  };
  const liveOf = (s: any, id: string) => s.live[id];
  const tulips = (s: any, id: string) => liveOf(s, id).things.filter((t: any) => t.kind === 'tulip').map((t: any) => `${t.have}/${t.need}`);

  it('🔴 a held helper’s card lists the jobs it helps now (a robot at work on a job not done, the helper fitting it) and says Use it', () => {
    const b = buy(family(), 'rain');
    const s = isle(b.model).state;
    const rain = card(b.model, 'rain', { state: s });
    expect([rain.showUse, rain.plots.map((x: any) => x.id), rain.plotId, rain.canUse, rain.showFigures, rain.canBuy]).toEqual([true, [SHOP_IDS.plot + 'tulips-three'], 'tulips-three', true, false, false]);
    const bar = buy(b.model, 'barrow');
    const bc = card(bar.model, 'barrow', { state: s });
    expect(bc.plots.map((x: any) => x.id)).toEqual([SHOP_IDS.plot + 'path-postbox', SHOP_IDS.plot + 'path-stones'].filter((id) => s.plots.find((p: any) => SHOP_IDS.plot + p.id === id && p.status === 'working')));
    // No job it helps: it says so, and keeps it for later.
    const none = card(b.model, 'rain', { state: isle(kid()).state });
    expect([none.showUse, none.canUse, none.none]).toEqual([false, false, word('iw6hNoJob')]);
  });

  it('🔴 rain: every tulip of that plot full at once, the job done — and the cloud gone (owned, the island, the save)', () => {
    const b = buy(family(), 'rain');
    const s0 = isle(b.model).state;
    expect(tulips(s0, 'tulips-three').every((t: string) => t.startsWith('0/'))).toBe(true);
    const u = use(b.model, 'rain', 'tulips-three', s0);
    expect([u.ok, u.error, u.used]).toEqual([true, '', 'rain|tulips-three']);
    expect(tulips(u.state, 'tulips-three')).toEqual(['3/3', '3/3', '3/3']);
    expect([active(u.model).owned, liveOf(u.state, 'tulips-three').helper, active(u.model).island.plots['tulips-three'].live.helper]).toEqual([[], undefined, undefined]);
    expect(active(u.model).island.plots['tulips-three'].live.things.filter((t: any) => t.kind === 'tulip').map((t: any) => t.have)).toEqual([3, 3, 3]);
    // The robot finishes what it was doing and walks home: the job waits.
    let s = u.state;
    for (let i = 0; i < 60 && liveOf(s, 'tulips-three').phase !== 'wait'; i++) s = tick(s);
    expect(liveOf(s, 'tulips-three').phase).toBe('wait');
    // Once: a second use is refused (she holds none).
    expect(use(u.model, 'rain', 'tulips-three', s).error).toBe('held');
  });

  it('🔴 the self-filling can: the robot’s can is full on every tick of that job; at its finish line it is gone, and the next lap pours the can down again', () => {
    const b = buy(family(), 'selfcan');
    const u = use(b.model, 'selfcan', 'tulips-three', isle(b.model).state);
    expect([u.ok, active(u.model).owned, liveOf(u.state, 'tulips-three').helper, active(u.model).island.plots['tulips-three'].live.helper]).toEqual([true, [], 'selfcan', 'selfcan']);
    let s = u.state;
    const riding: number[] = [];
    let t = 0;
    for (; t < 200 && liveOf(s, 'tulips-three').phase !== 'wait'; t++) {
      s = tick(s);
      const c = liveOf(s, 'tulips-three');
      if (c.helper) riding.push(c.robot.can);
    }
    const max = liveOf(s, 'tulips-three').robot.canMax;
    expect([liveOf(s, 'tulips-three').phase, riding.length > 10, riding.every((c) => c === max), liveOf(s, 'tulips-three').helper || '', liveOf(s, 'tulips-three').helperDone]).toEqual(['wait', true, true, '', 'selfcan']);
    // The next lap (wear reopens the job): the can is a can again — it runs down.
    const after: number[] = [];
    for (let k = 0; k < 300 && after.length < 40; k++) {
      s = tick(s);
      const c = liveOf(s, 'tulips-three');
      if (c.phase === 'work') after.push(c.robot.can);
    }
    expect([after.length > 0, Math.min(...after) < max, liveOf(s, 'tulips-three').helper]).toEqual([true, true, undefined]);
  });

  it('🔴 the wheelbarrow: that plot’s robot carries 8 until the job is done, then its own 4 again', () => {
    const b = buy(family(), 'barrow');
    const s0 = isle(b.model).state;
    const own = liveOf(s0, 'path-stones').robot.basket;
    const u = use(b.model, 'barrow', 'path-stones', s0);
    expect([u.ok, liveOf(u.state, 'path-stones').robot.basket]).toEqual([true, 8]);
    let s = u.state;
    const riding: number[] = [];
    for (let t = 0; t < 400 && liveOf(s, 'path-stones').phase !== 'wait'; t++) {
      s = tick(s);
      if (liveOf(s, 'path-stones').helper) riding.push(liveOf(s, 'path-stones').robot.basket);
    }
    expect([own, liveOf(s, 'path-stones').phase, riding.length > 5, riding.every((n) => n === 8), liveOf(s, 'path-stones').robot.basket, liveOf(s, 'path-stones').helper || '']).toEqual([4, 'wait', true, true, own, '']);
    // The other plot never saw it.
    expect(liveOf(s, 'tulips-three').helper).toBeUndefined();
  });

  it('🔴 refused, nothing changes: a helper she does not hold; a job it does not help (rain on the stones); a plot nobody works', () => {
    const m = family();
    const s = isle(m).state;
    expect(use(m, 'rain', 'tulips-three', s)).toMatchObject({ ok: false, error: 'held', used: '' });
    const b = buy(m, 'rain');
    expect(use(b.model, 'rain', 'path-stones', s)).toMatchObject({ ok: false, error: 'fits' });
    expect(use(b.model, 'rain', 'rows-trick', s)).toMatchObject({ ok: false, error: 'plot' });
    const r = use(b.model, 'rain', 'path-stones', s);
    expect([active(r.model).owned, r.state]).toEqual([['rain'], s]);
  });

  it('🔴 the riding helper is kept: in the save code, and on an island built again from that save (not rebuilt by the use)', () => {
    const b = buy(family(), 'selfcan');
    const s0 = isle(b.model).state;
    const u = use(b.model, 'selfcan', 'tulips-three', s0);
    // The island held (kept) goes on after the family is written: writing a plot's live does not rebuild it.
    const again = isle(u.model, u.state);
    expect([again.state.build === s0.build, again.state.live['tulips-three'].helper]).toEqual([true, 'selfcan']);
    // After a restart (nothing kept): the save code carries it, and the island built from it has it riding.
    const code = runScript(ENCODE_SAVE_SCRIPT, { model: u.model }).code;
    const back = runScript(DECODE_SAVE_SCRIPT, { code }).model;
    expect(active(back).island.plots['tulips-three'].live.helper).toBe('selfcan');
    expect(isle(back).state.live['tulips-three'].helper).toBe('selfcan');
  });
});

describe('IW-006 — the upgrades moved to the shop', () => {
  it('🔴 a first win gives no upgrade now (Upgraded empty, no sticker); the shop sells it; bought, it works as the gift did (Pip’s can 6)', () => {
    const won = win(kid(), 'rows-trick');
    expect([won.upgraded, active(won.model).stickers.includes('can+')]).toEqual([[], false]);
    const m = funded(won.model, P('can+'));
    expect(card(m, 'can+').canBuy).toBe(true);
    const b = buy(m, 'can+');
    const pip = helper<any[]>(SAVE_HELPERS, 'robotRowsOf', active(b.model))[0];
    expect([b.ok, pip.canMax, pip.upgraded]).toEqual([true, 6, true]);
    // Every upgrade the islanders gave is on sale, at a price.
    for (const u of UPGRADES) expect(SHOP.some((i) => i.kind === 'upgrade' && i.upgrade === u.id && i.price > 0)).toBe(true);
  });
});

describe('IW-006 — the brain reaches the Workshop’s Blocks node', () => {
  it('🔴 Brain size is the job robot’s row’s brain (12 until one is bought; then 16, 20)', () => {
    const m = funded(kid(), 100);
    const job = (model: any) => runScript(JOB_ROBOT_SCRIPT, { requests: REQUESTS, requestId: 'tulips-three', robots: runScript(FAMILY_SCRIPT, { model }).robots, lang: 'en' }).robot;
    expect(bare(BRAIN_SCRIPT, { robot: job(m) }).size).toBe(BRAIN_SIZE);
    const b16 = buy(m, 'brain16', { robotId: 'r1' });
    expect(bare(BRAIN_SCRIPT, { robot: job(b16.model) }).size).toBe(16);
    const b20 = buy(b16.model, 'brain20', { robotId: 'r1' });
    expect(bare(BRAIN_SCRIPT, { robot: job(b20.model) }).size).toBe(20);
    expect(bare(BRAIN_SCRIPT, { robot: null }).size).toBe(BRAIN_SIZE);
  });

  it('🔴 the graph: the Workshop’s robot row → Brain size → the Blocks node’s Brain Size; the Workshop page hands Play the job robot’s row', () => {
    const play = CG003_COMPONENTS.find((c) => c.path === 'Workshop/Play')!;
    const has = (c: any, a: string, ap: string, b: string, bp: string) => c.connections.some((w: any) => w.fromId === a && w.fromProperty === ap && w.toId === b && w.toProperty === bp);
    expect([has(play, 'plIn', 'robot', 'plBrain', 'robot'), has(play, 'plBrain', 'size', 'plBlocks', 'brainSize')]).toEqual([true, true]);
    expect(play.nodes.find((n: any) => n.id === 'plBrain')!.type).toBe('/Logic/Brain size');
    const ws = CG003_COMPONENTS.find((c) => c.path === 'Pages/Workshop')!;
    expect(has(ws, 'wsJob', 'robot', 'wsPlay', 'robot')).toBe(true);
  });
});

describe('IW-006 AC3 — the shop in the graph', () => {
  const comp = (p: string) => CG003_COMPONENTS.find((c) => c.path === p)!;
  const has = (c: any, a: string, ap: string, b: string, bp: string) => c.connections.some((w: any) => w.fromId === a && w.fromProperty === ap && w.toId === b && w.toProperty === bp);

  it('🔴 the Island page: the shop beside the head (its button carries the balance), writing the family through the page’s store', () => {
    const page = comp('Pages/Island');
    const top = page.nodes.find((n: any) => n.id === 'isTop')!;
    expect(top.children).toEqual(['isHead', 'isShop']);
    expect(page.nodes.find((n: any) => n.id === 'isShop')!.type).toBe(SHOP_PATHS.shop);
    expect([has(page, 'isStore', 'model', 'isShop', 'model'), has(page, 'isShop', 'model', 'isStore', 'model'), has(page, 'isShop', 'write', 'isStore', 'write')]).toEqual([true, true, true]);
    const shop = comp(SHOP_PATHS.shop.slice(1));
    expect(has(shop, 'shRows', 'btnText', 'shOpen', 'label')).toBe(true);
  });

  it('🔴 Buy writes only when it bought; Use it sets the island’s running state before the family is written; every pick is a button (no Select in the sheet)', () => {
    const shop = comp(SHOP_PATHS.shop.slice(1));
    expect([has(shop, 'shBuyFn', 'ok', 'shBuyOk', 'condition'), has(shop, 'shBuyOk', 'ontrue', 'shOut', 'write'), has(shop, 'shBuyFn', 'ran', 'shOut', 'write')]).toEqual([true, true, false]);
    expect([has(shop, 'shUseOk', 'ontrue', 'shSetIsle', 'do'), has(shop, 'shSetIsle', 'done', 'shOut', 'write')]).toEqual([true, true]);
    expect(shop.nodes.filter((n: any) => /select|dropdown/i.test(String(n.type)))).toEqual([]);
    // The card's state (the island as it runs) is quiet: the card is not drawn again on every island tick.
    const cardSpec = comp('Logic/Shop card');
    const fn = cardSpec.nodes.find((n: any) => n.type === 'JavaScriptFunction')!;
    expect((fn.parameters as any)['runOnChange-in-state']).toBe(false);
  });

  it('the shop’s scripts are registered glue, driven the way their seams say (Buy and Use helper on Go)', () => {
    const names = GLUE_SCRIPTS.map((g) => g.component);
    for (const n of ['Logic/Shop rows', 'Logic/Shop card', 'Logic/Buy', 'Logic/Use helper', 'Logic/Brain size']) expect(names).toContain(n);
    const spec = (p: string) => LOGIC_SPECS.find((s) => s.path === p)!;
    expect([spec('Logic/Buy').go, spec('Logic/Use helper').go, spec('Logic/Shop rows').go, spec('Logic/Shop card').go]).toEqual([true, true, false, false]);
  });
});

describe('arms: each rule mutated, and the row that kills it', () => {
  const mutate = (script: string, from: string, to: string) => {
    if (script.split(from).length !== 2) throw new Error(`the arm's anchor must occur exactly once: ${from}`);
    return script.replace(from, to);
  };
  it('Upgrades given on a first win again → the moved-upgrade row fails', () => {
    const m = mutate(COMPLETE_REQUEST_SCRIPT, "// P108 IW-006 (lane H): the upgrades moved to the shop", "for (var u = 0; u < UPGRADES.length; u++) if (requestId && UPGRADES[u].unlockedBy === requestId && p.stickers.indexOf(UPGRADES[u].id) === -1) { p.stickers.push(UPGRADES[u].id); upgraded.push(UPGRADES[u].id); }\n  //");
    expect(runScript(m, { model: kid(), requestId: 'rows-trick', tricks: [], reward: null }).upgraded).toEqual(['can+']);
  });
  it('the card just bought keeps its figures → the “only that” row fails', () => {
    const m = mutate(SHOP_CARD_SCRIPT, 'if ((justBought && !held) || justUsed) {', 'if (false) {');
    const b = buy(funded(kid(), COPY + 20), 'robot:pip');
    expect(bare(m, { model: b.model, words: WORDS, lang: 'en', requests: REQUESTS, itemId: 'robot:pip', bought: 'robot:pip' }).showShort).toBe(true);
  });
  it('the card forgets the short price → the short row’s Buy shows', () => {
    const m = mutate(SHOP_CARD_SCRIPT, 'out.canBuy = can && !blocked;', 'out.canBuy = !blocked;');
    expect(bare(m, { model: funded(kid(), COPY - 8), words: WORDS, lang: 'en', requests: REQUESTS, itemId: 'robot:pip' }).canBuy).toBe(true);
  });
  it('the shop shows every upgrade at once → the upgrades row fails', () => {
    const m = mutate(SHOP_ROWS_SCRIPT, "if (!up || p.island.done.indexOf(up.unlockedBy) === -1) return false;", 'if (!up) return false;');
    expect(bare(m, { model: kid(), words: WORDS, lang: 'en', tab: 'upgrades' }).items.map((i: any) => i.id)).toContain(SHOP_IDS.item + 'can+');
  });
  it('a helper that stays in owned when used → the rain row fails', () => {
    const m = mutate(USE_HELPER_SCRIPT, 'p.owned.splice(p.owned.indexOf(it.id), 1);', '');
    let fam = win(kid(), 'tulips-three', 'r1').model;
    fam = funded(fam, P('rain'));
    const b = buy(fam, 'rain');
    expect(active(bare(m, { model: b.model, itemId: 'rain', plotId: 'tulips-three', state: isle(b.model).state }).model).owned).toEqual(['rain']);
  });
  it('a riding helper that outlives its finish line → the self-filling can row fails (it is still riding once the job waits)', () => {
    // Merge (s4): the finish line now also writes helper '' (lane E's Island keep drops it from the save); the arm keeps it riding.
    const m = mutate(ISLAND_TICK_SCRIPT, "out.helper = '';\n    return out;", 'out.helper = h;');
    let fam = funded(win(kid(), 'tulips-three', 'r1').model, P('selfcan'));
    const b = buy(fam, 'selfcan');
    let s = use(b.model, 'selfcan', 'tulips-three', isle(b.model).state).state;
    for (let t = 0; t < 200 && s.live['tulips-three'].phase !== 'wait'; t++) s = bare(m, { state: s, built: s }).state;
    expect([s.live['tulips-three'].phase, s.live['tulips-three'].helper]).toEqual(['wait', 'selfcan']);
  });
  it('a self-filling can that does not fill → the can row fails', () => {
    const m = mutate(ENGINE, "if (h === 'selfcan' && canOf(r) !== null) r.can = canMaxOf(r);", "if (h === 'selfcan' && canOf(r) !== null) r.can = canMaxOf(r) - 1;");
    expect(helper<any>(m, 'helperOn', { things: [], robots: [{ id: 'a', can: 0, canMax: 3 }] }, 'selfcan').robots[0].can).toBe(2);
    expect(helper<any>(ENGINE, 'helperOn', { things: [], robots: [{ id: 'a', can: 0, canMax: 3 }] }, 'selfcan').robots[0].can).toBe(3);
  });
  it('the build counts a plot’s live again → a helper used rebuilds the island (the kept-island row fails)', () => {
    // Merge (s4): the hash line is lane E's (iw6Unlive), the rule the same.
    const m = mutate(ISLAND_WORLD_SCRIPT, 'islHash(JSON.stringify([iw6Unlive(saved),', 'islHash(JSON.stringify([saved,');
    const b = buy(funded(win(kid(), 'tulips-three', 'r1').model, P('selfcan')), 'selfcan');
    const f = (model: any, kept?: unknown) => { const r = runScript(FAMILY_SCRIPT, { model }); return bare(m, { requests: REQUESTS, plots: r.plots, robots: r.robots, done: r.done, band: r.band, pins: [], kept }); };
    const s0 = f(b.model).state;
    const u = use(b.model, 'selfcan', 'tulips-three', s0);
    expect(f(u.model, u.state).state.build === s0.build).toBe(false);
  });
  it('the barrow on a job with nothing to carry → helperFits says no to rain on stones, yes to barrow', () => {
    const w = (things: any[], targets: string[]) => ({ map: ['GGG'], things, robots: [{ id: 'r', x: 0, y: 0, d: 1, carry: [] }], job: { targets, home: { x: 0, y: 0 } } });
    const stones = w([{ id: 's1', kind: 'site', x: 1, y: 0, have: 0, need: 4 }], ['s1']);
    expect([helper(ENGINE, 'helperFits', stones, 'rain'), helper(ENGINE, 'helperFits', stones, 'barrow'), helper(ENGINE, 'helperFits', stones, 'selfcan')]).toEqual([false, true, false]);
    const done = w([{ id: 's1', kind: 'site', x: 1, y: 0, have: 4, need: 4 }], ['s1']);
    expect(helper(ENGINE, 'helperFits', done, 'barrow')).toBe(false);
  });
});
