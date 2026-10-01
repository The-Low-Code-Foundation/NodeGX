#!/usr/bin/env node
/**
 * IW-007 (P108 s5, lane B) — building on her land, driven on the DEPLOYED template (the page drive's deploy:
 * `drive-pages.sh` / `drives/drive-all.sh` assemble a copy of `templates/bot-garden` and deploy it to `$OUT/deploy`).
 *
 * Usage:
 *   node scripts/devtools/drive-iw007-build.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d]
 *
 * The family is made the game's way: a new player made on the page; Cobble lent by the page's own Complete request
 * (path-postbox won); shells by the page's own earnShells (the one place `earned` rises); then EVERYTHING the lane builds
 * is done by touch on the page — the shop's Build tab, the spa's card, Buy; a tap on her land, the blueprint's chip,
 * the ghost moved by taps (a refused tile says why), Put it here.
 * The two robots' programs are SEEDED in the save (as the crew drive seeds its family): Pip pinned on her land with a
 * program that carries planks from the nearest tree to the spa's plank part, Cobble helping (`helps: 'land'`) with one
 * that carries stones from the nearest rock to its stone part — a Workshop win on the land needs ONE program that
 * finishes the whole building, which is not what AC1 asks to see (two robots, two materials).
 *
 * --mode 2d (default) headless Chrome, no GPU (the flat island), 1368 × 900 EN:
 *   BUY     the shop's Build tab sells the spa and the refuge, its line says where a bought one goes; the spa's card
 *           (have · cost · left); Buy → "It's yours! Tap your land…"; the store: owned, spent
 *   GHOST   her land's card: "Your land", the blueprint's chip; the ghost at its spot, green, "It fits here!"; a tap on
 *           the tile beside the rock → red, the reason in words, no Put; a tap back → green; Put it here → the store's
 *           land has the spa at (3, 1); the island draws it at its first stage (pegs and string)
 *   BUILD   the two robots on the island tick: every stage of the spa seen in order (a MutationObserver installed first),
 *           each robot seen carrying its own material, the store's spa only ever rising, the puff on the last drop,
 *           both robots home; screenshots at each stage
 *   SAVE    the page reloaded: the spa still finished, the store holds 6/6 · 4/4; the shop's row says Built
 *   FR      390 × 844 FR, a fresh family: the refuge bought in « Construire », its ghost refused over the rock with the
 *           French reason, then placed on its spot
 * --mode 3d  software GL (swiftshader): the spa seeded at each of its four stages, the island framed on the robots by
 *   "Find my robots": a screenshot per stage and the building read off the 3D scene; then the last plank dropped live —
 *   the puff seen by an in-page recorder (a sampler every 50 ms, installed before) — or, under software GL's Too Slow,
 *   the flat island said so.
 *
 * Exits 0 when every clause passed, 1 when any failed, 2 on a usage error.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const DIR = process.argv[2];
const PROJECT = arg('--project');
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
const MODE = arg('--mode') || '2d';
if (!DIR || DIR.startsWith('--') || !PROJECT || !['2d', '3d'].includes(MODE)) {
  console.error('usage: drive-iw007-build.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says (never typed here) ──
function nodesOf(component) {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
}
const staticRows = (c) => JSON.parse(nodesOf(c).find((n) => n.type === 'Static Data').parameters.json);
const functionScript = (c) => String(nodesOf(c).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript);
const pageRun = (c, inputs, tail = '') => {
  const out = {};
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', functionScript(c) + tail)(JSON.parse(JSON.stringify(inputs)), out);
  return out;
};
const WORD_ROWS = staticRows('Data/Words');
const WORDS = { en: {}, fr: {} };
for (const r of WORD_ROWS) {
  WORDS.en[r.key] = r.en;
  WORDS.fr[r.key] = r.fr;
}
const w = (lang, key) => String(WORDS[lang][key] || '');
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(String(v)), text);
const REQUESTS = staticRows('Data/Requests');
const req = (id) => REQUESTS.find((r) => r.id === id);
/** The save helpers, the shop's catalogue, the blueprints and her land, out of the page's own scripts. */
const SAVE = pageRun('Logic/Bring home', { model: {} }, '\n;Outputs.buyItem = buyItem; Outputs.earnShells = earnShells; Outputs.modelOf = modelOf; Outputs.SHOP = SHOP; Outputs.BLUEPRINTS = BLUEPRINTS;');
const LAND = pageRun('Logic/Land card', { model: {} }, '\n;Outputs.LAND_PLOT = LAND_PLOT; Outputs.LAND_ID = LAND_ID;');
const LP = LAND.LAND_PLOT;
const LAND_ID = LAND.LAND_ID;
const item = (id) => SAVE.SHOP.find((i) => i.id === id);
const spec = (bp) => SAVE.BLUEPRINTS.find((b) => b.id === bp);
const win = (model, id, robotId = 'r1') => pageRun('Logic/Complete request', { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(req(id).referenceProgram), robotId, now: 1759300000000 }).model;
const blk = (id, t, extra = {}) => ({ id, t, ...extra });
const is = (thing, state) => ({ op: 'is', thing, state });
/** A carry program: until that part is done, fetch one from the nearest source of that kind and put it in. */
const carry = (part, source, base) => [blk(base, 'until', { slots: { cond: is(part, 'done') }, body: [blk(base + 1, 'go_nearest', { slots: { kind: source } }), blk(base + 2, 'pick'), blk(base + 3, 'go_to', { slots: { thing: part } }), blk(base + 4, 'put')] })];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};
const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: () => ({ ok: true, text: 'Thank you! (stub)', ms: 5 })
};
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive();
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
  });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/__garden/*', requestStage: 'Request' }] });
  const until = async (expr, ok, ms = 8000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(150);
      last = await evaluate(expr);
    }
    return last;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  /** Her land up close (×3): the tiles round it, cut from the page (the island draws a tile ~16 px at 1368). */
  const landShot = async (name) => {
    if (!SHOTS) return;
    const r = await evaluate(`(() => { const a = document.querySelector('.bg-isle .gd-cell[data-x="${LP.x - 1}"][data-y="${LP.y - 1}"]'), b = document.querySelector('.bg-isle .gd-cell[data-x="${LP.x + 8}"][data-y="${LP.y + 6}"]') || document.querySelector('.bg-isle .gd-cell[data-x="${LP.x + 7}"][data-y="${LP.y + 5}"]'); if (!a || !b) return null; a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return { x: ra.left + scrollX, y: ra.top + scrollY, width: rb.right - ra.left, height: rb.bottom - ra.top }; })()`);
    if (!r) return;
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 3 }, captureBeyondViewport: true });
    fs.writeFileSync(path.join(SHOTS, `${name}-land.png`), Buffer.from(data, 'base64'));
  };
  const where = (finder, scroll = true) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      if (${scroll}) el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, hit: !!at && (el === at || el.contains(at)), at: at ? String(at.className && at.className.baseVal !== undefined ? at.className.baseVal : at.className).slice(0, 60) : null }; })()`);
  const tap = async (finder, label) => {
    let p = await where(finder);
    for (let i = 0; i < 20 && !p.found; i++) {
      await wait(150);
      p = await where(finder);
    }
    if (p.found) {
      await wait(200);
      p = await where(finder, false);
    }
    if (!p.found || !p.hit) {
      check(`tap ${label}`, false, p);
      return false;
    }
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(250);
    return true;
  };
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim() === ${JSON.stringify(needle)})`;
  const hasText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const typeInto = async (finder, value) => {
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
  };
  const seg = (label) => tap(hasText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${STORE_KEY}; try { return JSON.parse(localStorage.getItem(k)).model || null; } catch (e) { return null; } })()`);
  const store = (model) => evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); v.model = ${JSON.stringify(model)}; delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const active = async () => {
    const m = await stored();
    return m ? m.profiles.find((p) => p.id === m.island.activeId) : null;
  };
  const cellOf = (x, y) => `document.querySelector('.bg-isle .gd-cell[data-x="${x}"][data-y="${y}"]')`;
  const freshFamily = async (tag, lang) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    if (lang === 'fr') {
      await seg('FR');
      await wait(600);
    }
    await tap(first('button.bg-profile-new'), `new player (${tag})`);
    await typeInto(first('input'), 'Ada');
    await tap(hasText('.bg-seg-btn', '10–12'), `band 10–12 (${tag})`);
    await tap(hasText('button.bg-btn', w(lang, 'create')), `create (${tag})`);
    const at = await until('location.pathname', (p) => p === '/island');
    await wait(900);
    return at === '/island';
  };
  /** Her family with Cobble (path-postbox won: Sami lends him) and shells earned (the page's earnShells). */
  const seeded = async (shells) => {
    let m = win(await stored(), 'path-postbox');
    m = SAVE.modelOf(m);
    SAVE.earnShells(m.profiles.find((p) => p.id === m.island.activeId), shells);
    await store(m);
    await page.navigate('/island');
    await wait(1800);
    return m;
  };
  /** The two robots on her land (seeded, see the header): Pip pinned with the planks, Cobble helping with the stones. */
  const crewOnLand = (model, bId) => {
    const m = JSON.parse(JSON.stringify(model));
    const p = m.profiles.find((x) => x.id === m.island.activeId);
    const sp = p.island.land.buildings.find((b) => b.id === bId);
    const parts = spec(sp.bp).parts;
    const at = (it) => ({ id: `${bId}-${it}`, kind: 'site', x: sp.x + parts.find((q) => q.item === it).dx, y: sp.y });
    for (const k of Object.keys(p.island.plots)) if (p.island.plots[k].robotId === 'r1') p.island.plots[k].robotId = '';
    p.island.plots[LAND_ID] = { program: carry(at('plank'), 'tree', 1), robotId: 'r1', wonAt: 1759300000100 };
    const cob = p.island.robots.find((r) => r.id === 'cobble');
    cob.helps = LAND_ID;
    cob.program = carry(at('stone'), 'rock', 20);
    return m;
  };
  const SHOP_BTN = '.bg-shop-open';
  const SHOP_CARD = `(() => { const c = document.querySelector('.bg-shop-card'); if (!c || c.offsetParent === null) return null; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : ''; }; const vis = (s) => { const e = c.querySelector(s); return !!e && e.offsetParent !== null; };
    return { name: t('.bg-shop-card-name'), figs: [...c.querySelectorAll('.bg-shop-fig')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()), done: t('.bg-shop-done'), buy: vis('.bg-shop-buy') }; })()`;
  const SHOP_ITEMS = `(() => { const items = [...document.querySelectorAll('.bg-shop-items .bg-shop-item')].filter((e) => e.offsetParent !== null); const later = document.querySelector('.bg-shop-later');
    return { items: items.map((e) => ({ name: (e.querySelector('.bg-shop-name') || {}).innerText, tag: (e.querySelector('.bg-shop-tag') || { offsetParent: null }).offsetParent !== null ? e.querySelector('.bg-shop-tag').innerText.trim() : '' })), later: later && later.offsetParent !== null ? later.innerText.trim() : '' }; })()`;
  const CARD = `(() => { const c = document.querySelector('.bg-plot-card'); if (!c || c.offsetParent === null) return { up: false }; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; const vis = (s) => { const e = c.querySelector(s); return !!e && e.offsetParent !== null; };
    return { up: true, title: t('.bg-plot-title'), line: t('.bg-plot-line'), land: t('.bg-land-line'), chips: [...c.querySelectorAll('.bg-land-row .bg-chip')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()), ghost: t('.bg-ghost-line'), put: vis('.bg-ghost-put'), no: vis('.bg-ghost-no') }; })()`;
  const GHOST = `(() => { const g = document.querySelector('.bg-isle .gd-ghost'); return g ? { ok: g.getAttribute('data-ghost'), at: g.getAttribute('data-at'), bp: g.getAttribute('data-bp') } : null; })()`;
  const BLD = `(() => { const b = [...document.querySelectorAll('.bg-isle .gd-bld')]; return b.map((e) => ({ id: e.getAttribute('data-building'), build: e.getAttribute('data-build'), stage: e.getAttribute('data-bstage') })); })()`;
  const nameOf = (lang, id) => item(id).name[lang];

  /** Buy a blueprint through the shop's Build tab, by touch. */
  const buyBlueprint = async (lang, bp, tag) => {
    await tap(first(SHOP_BTN), `the shop's button (${tag})`);
    await until(`!!document.querySelector('.bg-shop-panel') && document.querySelector('.bg-shop-panel').offsetParent !== null`, (v) => v, 3000);
    await tap(byText('.bg-shop-tabs .bg-chip', w(lang, 'iw6hTabBuild')), `the Build tab (${tag})`);
    const tabRead = await until(SHOP_ITEMS, (r) => r.items.length >= 2, 3000);
    await tap(byText('.bg-shop-items .bg-shop-item .bg-shop-name', nameOf(lang, bp)), `${bp}'s card (${tag})`);
    const before = await until(SHOP_CARD, (c) => !!c && c.buy, 3000);
    await shot(`iw7b-${tag}-shop-card`);
    await tap(first('.bg-shop-buy'), `Buy (${tag})`);
    const after = await until(SHOP_CARD, (c) => !!c && c.done === w(lang, 'iw7bCardPlace'), 4000);
    await shot(`iw7b-${tag}-shop-bought`);
    return { tabRead, before, after };
  };
  const closeShop = async (tag) => {
    if (await evaluate(`!!document.querySelector('.bg-shop-panel') && document.querySelector('.bg-shop-panel').offsetParent !== null`)) await tap(first('.bg-shop-close'), `close the shop (${tag})`);
    await wait(300);
  };
  /** Her land's card, opened by a tap on a free tile of her land. */
  const openLand = async (lang, tag) => {
    await tap(cellOf(LP.x + 2, LP.y + 4), `her land (${tag})`);
    return until(CARD, (c) => c.up && c.title === w(lang, 'iw7bLandTitle'), 3000);
  };

  if (MODE === '3d') return threeD();

  // ── 2D, 1368 EN: buy, place, build, keep ──
  {
    const tag = '1368-en';
    const lang = 'en';
    await page.setViewport({ name: '1368', width: 1368, height: 900, mobile: false });
    check(`${tag}: a new player lands on the island`, await freshFamily(tag, lang), await evaluate('location.pathname'));
    const spaPrice = item('spa').price;
    await seeded(spaPrice + 15);
    // BUY
    const b = await buyBlueprint(lang, 'spa', tag);
    readings.buy = b;
    check(`BUY ${tag}: the Build tab sells the spa and the refuge, and says where a bought blueprint goes`, b.tabRead.items.map((i) => i.name).join('|') === [nameOf(lang, 'spa'), nameOf(lang, 'refuge')].join('|') && b.tabRead.later === w(lang, 'iw7bBuildHow'), b.tabRead);
    check(`BUY ${tag}: the spa's card — you have ${spaPrice + 15} · it costs ${spaPrice} · left after 15, and Buy`, !!b.before && b.before.buy && JSON.stringify(b.before.figs) === JSON.stringify([fill(w(lang, 'iw6hHave'), { n: spaPrice + 15 }), fill(w(lang, 'iw6hCost'), { n: spaPrice }), fill(w(lang, 'iw6hLeft'), { n: 15 })]), b.before);
    let p = await active();
    check(`BUY ${tag}: bought — the card says "${w(lang, 'iw7bCardPlace')}" and no Buy; the store: the spa owned, ${spaPrice} spent`, !!b.after && !b.after.buy && p.owned.includes('spa') && p.shells.spent === spaPrice, { card: b.after, owned: p.owned, shells: p.shells });
    const row = await evaluate(SHOP_ITEMS);
    check(`BUY ${tag}: its row in the Build tab says "${w(lang, 'iw7bTagPlace')}"`, row.items.some((i) => i.name === nameOf(lang, 'spa') && i.tag === w(lang, 'iw7bTagPlace')), row);
    await closeShop(tag);
    // GHOST
    const c0 = await openLand(lang, tag);
    check(`GHOST ${tag}: a tap on her land opens its card — "${w(lang, 'iw7bLandTitle')}", a chip to place the spa`, c0.up && c0.chips.length === 1 && c0.chips[0] === fill(w(lang, 'iw7bPlaceChip'), { what: nameOf(lang, 'spa') }), c0);
    await shot(`iw7b-${tag}-01-land-card`);
    await tap(byText('.bg-plot-card .bg-land-row .bg-chip', c0.chips[0]), `the spa's chip (${tag})`);
    const spot = spec('spa').spot;
    const g1 = await until(GHOST, (g) => !!g, 3000);
    const c1 = await until(CARD, (c) => c.up && !!c.ghost, 3000);
    check(`GHOST ${tag}: the spa's ghost at its spot (${spot.x}, ${spot.y}) of her land, green; the card says "${w(lang, 'iw7bGhostOk')}" with Put it here`, !!g1 && g1.ok === 'ok' && g1.at === `${LP.x + spot.x},${LP.y + spot.y}` && c1.ghost === w(lang, 'iw7bGhostOk') && c1.put, { g1, c1 });
    await shot(`iw7b-${tag}-02-ghost-green`);
    await landShot(`iw7b-${tag}-02-ghost-green`);
    // The tile left of the rock: the spa would stand on it — refused, in words, no Put.
    await tap(cellOf(LP.x + 6, LP.y + 5), `the tile beside the rock (${tag})`);
    const g2 = await until(GHOST, (g) => !!g && g.ok === 'no', 3000);
    const c2 = await until(CARD, (c) => c.up && c.ghost !== w(lang, 'iw7bGhostOk'), 3000);
    const refusal = fill(w(lang, 'iw7bGhostNo'), { why: w(lang, 'iw7bWhyTaken') });
    check(`GHOST ${tag}: moved by a tap onto the rock's tile — red, the card says "${refusal}", no Put`, !!g2 && g2.at === `${LP.x + 6},${LP.y + 5}` && c2.ghost === refusal && !c2.put, { g2, c2 });
    await shot(`iw7b-${tag}-03-ghost-red`);
    await landShot(`iw7b-${tag}-03-ghost-red`);
    // A tile of the edge: the spa would stick out.
    await tap(cellOf(LP.x + 7, LP.y + 2), `the edge of her land (${tag})`);
    const c3 = await until(CARD, (c) => c.up && c.ghost === fill(w(lang, 'iw7bGhostNo'), { why: w(lang, 'iw7bWhyEdge') }), 3000);
    check(`GHOST ${tag}: on her land's edge — "${fill(w(lang, 'iw7bGhostNo'), { why: w(lang, 'iw7bWhyEdge') })}"`, c3.ghost === fill(w(lang, 'iw7bGhostNo'), { why: w(lang, 'iw7bWhyEdge') }) && !c3.put, c3);
    await tap(cellOf(LP.x + spot.x, LP.y + spot.y), `the spa's spot again (${tag})`);
    const c4 = await until(CARD, (c) => c.up && c.put, 3000);
    check(`GHOST ${tag}: back on a legal tile — green again, Put it here`, c4.put && c4.ghost === w(lang, 'iw7bGhostOk'), c4);
    await tap(first('.bg-ghost-put'), `Put it here (${tag})`);
    p = await until(`(() => { const k = ${STORE_KEY}; const m = JSON.parse(localStorage.getItem(k)).model; const a = m.profiles.find((x) => x.id === m.island.activeId); return a.island.land || null; })()`, (l) => !!l && l.buildings.length === 1, 4000);
    const bId = p && p.buildings[0] ? p.buildings[0].id : '';
    check(`GHOST ${tag}: placed — her land in the store has the spa at (${spot.x}, ${spot.y}), nothing delivered yet`, !!p && p.buildings[0].bp === 'spa' && p.buildings[0].x === spot.x && p.buildings[0].y === spot.y && p.buildings[0].have.stone === 0 && p.buildings[0].have.plank === 0, p);
    const drawn = await until(BLD, (list) => list.length === 1, 4000);
    const c5 = await until(CARD, (c) => c.up && !!c.land && !c.ghost, 3000);
    const stands0 = fill(w(lang, 'iw7bStands'), { what: nameOf(lang, 'spa'), stage: w(lang, 'iw7bStage0'), n: 0, m: 10 });
    check(`GHOST ${tag}: the island draws the spa at its first stage (pegs and string), the ghost gone; the card says "${stands0}"`, drawn.length === 1 && drawn[0].stage === '0' && !(await evaluate(GHOST)) && c5.land === stands0, { drawn, c5 });
    await shot(`iw7b-${tag}-04-placed`);
    await landShot(`iw7b-${tag}-04-placed`);
    await tap(first('.bg-plot-close'), 'close the card');

    // BUILD — the two robots seeded (see the header), the page reloaded; stages recorded as they change.
    const m2 = crewOnLand(await stored(), bId);
    await store(m2);
    await page.navigate('/island');
    await wait(1500);
    await evaluate(`(() => { window.__iw7b = { stages: [], puffs: 0, loads: {}, t0: performance.now() };
      const box = document.querySelector('.bg-isle');
      const read = () => { const b = box.querySelector('.gd-bld[data-build="spa"]'); const st = b ? b.getAttribute('data-bstage') : null; const s = window.__iw7b.stages; if (st !== null && s[s.length - 1] !== st) s.push(st);
        if (box.querySelector('.gd-puff')) window.__iw7b.puffSeen = true;
        box.querySelectorAll('.gd-bot').forEach((r) => { const l = r.querySelector('.gd-load'); const n = (r.querySelector('.gd-name') || {}).innerText || ''; if (l) { window.__iw7b.loads[n] = window.__iw7b.loads[n] || []; const v = l.getAttribute('data-load'); if (window.__iw7b.loads[n].indexOf(v) === -1) window.__iw7b.loads[n].push(v); } }); };
      new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches('.gd-puff') || n.querySelector && n.querySelector('.gd-puff'))) window.__iw7b.puffs++; read(); }).observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-bstage', 'data-load', 'data-x', 'data-y'] });
      read(); return true; })()`);
    const shotAt = {};
    const savedHave = [];
    const t0 = Date.now();
    const end = t0 + 6 * 60 * 1000;
    let rec = null;
    while (Date.now() < end) {
      rec = await evaluate('window.__iw7b');
      const last = rec.stages[rec.stages.length - 1];
      if (last !== undefined && !shotAt[last]) {
        shotAt[last] = true;
        await shot(`iw7b-${tag}-05-stage-${last}`);
        await landShot(`iw7b-${tag}-05-stage-${last}`);
      }
      const a = await active();
      const sb = a && a.island.land ? a.island.land.buildings.find((x) => x.id === bId) : null;
      if (sb) savedHave.push(sb.have.stone + sb.have.plank);
      if (last === '3' && rec.puffs > 0) {
        await wait(400);
        break;
      }
      await wait(700);
    }
    rec = await evaluate('window.__iw7b');
    readings.build = { rec, savedHave: savedHave.filter((v, i) => i === 0 || v !== savedHave[i - 1]) };
    const cobName = m2.profiles[0].island.robots.find((r) => r.id === 'cobble').name;
    const pipName = m2.profiles[0].robot.name;
    check(`BUILD ${tag}: every stage of the spa seen in order on the island — pegs · the frame · the walls · finished (${Math.round((Date.now() - t0) / 1000)} s)`, JSON.stringify(rec.stages) === JSON.stringify(['0', '1', '2', '3']), rec.stages);
    check(`BUILD ${tag}: two robots, two materials — ${pipName} seen carrying planks, ${cobName} stones`, (rec.loads[pipName] || []).includes('plank') && (rec.loads[cobName] || []).includes('stone'), rec.loads);
    check(`BUILD ${tag}: the last drop finishes it with a puff (recorded as it appeared)`, rec.puffs >= 1, { puffs: rec.puffs });
    const sh = readings.build.savedHave;
    check(`BUILD ${tag}: the store's spa only ever rose, drop by drop, and holds 6/6 · 4/4`, sh.every((v, i) => i === 0 || v > sh[i - 1]) && sh[sh.length - 1] === 10, sh);
    await wait(2500);
    await shot(`iw7b-${tag}-06-finished`);
    await landShot(`iw7b-${tag}-06-finished`);
    // SAVE — the page reloaded.
    await page.navigate('/island');
    await wait(2500);
    const reload = await until(BLD, (list) => list.length === 1, 4000);
    p = await active();
    const sb = p.island.land.buildings.find((x) => x.id === bId);
    check(`SAVE ${tag}: reloaded — the spa still stands finished on the island; the store holds stone 6/6 · plank 4/4`, reload.length === 1 && reload[0].stage === '3' && sb.have.stone === 6 && sb.have.plank === 4, { reload, have: sb.have });
    await shot(`iw7b-${tag}-07-reloaded`);
    await landShot(`iw7b-${tag}-07-reloaded`);
    const card = await openLand(lang, tag);
    const standsDone = fill(w(lang, 'iw7bStands'), { what: nameOf(lang, 'spa'), stage: w(lang, 'iw7bStageDone'), n: 10, m: 10 });
    check(`SAVE ${tag}: her land's card says "${standsDone}"`, card.land === standsDone, card);
    await tap(first('.bg-plot-close'), 'close the card');
    await tap(first(SHOP_BTN), `the shop's button (${tag})`);
    await tap(byText('.bg-shop-tabs .bg-chip', w(lang, 'iw6hTabBuild')), `the Build tab (${tag})`);
    const rowBuilt = await until(SHOP_ITEMS, (r) => r.items.some((i) => i.tag === w(lang, 'iw7bTagBuilt')), 3000);
    check(`SAVE ${tag}: the spa's row in the Build tab says "${w(lang, 'iw7bTagBuilt')}"`, rowBuilt.items.some((i) => i.name === nameOf(lang, 'spa') && i.tag === w(lang, 'iw7bTagBuilt')), rowBuilt);
    await closeShop(tag);
  }

  // ── 390 FR: the refuge bought, its ghost refused over the rock in French, then placed ──
  {
    const tag = '390-fr';
    const lang = 'fr';
    await page.setViewport({ name: '390', width: 390, height: 844, mobile: true });
    check(`${tag}: a new player lands on the island`, await freshFamily(tag, lang), await evaluate('location.pathname'));
    await seeded(item('refuge').price + 5);
    const b = await buyBlueprint(lang, 'refuge', tag);
    check(`BUY ${tag}: « ${w(lang, 'iw6hTabBuild')} » sells the refuge; bought — « ${w(lang, 'iw7bCardPlace')} »`, !!b.before && b.before.buy && !!b.after && !b.after.buy, { before: b.before, after: b.after });
    await closeShop(tag);
    const c0 = await openLand(lang, tag);
    await tap(byText('.bg-plot-card .bg-land-row .bg-chip', c0.chips[0] || 'none'), `the refuge's chip (${tag})`);
    await until(GHOST, (g) => !!g, 3000);
    await tap(cellOf(LP.x + 6, LP.y + 4), `the tile above the rock (${tag})`);
    const refusal = fill(w(lang, 'iw7bGhostNo'), { why: w(lang, 'iw7bWhyTaken') });
    const c1 = await until(CARD, (c) => c.up && c.ghost === refusal, 3000);
    const g1 = await evaluate(GHOST);
    check(`GHOST ${tag}: the refuge's pen over the rock — red, « ${refusal} », no Put`, !!g1 && g1.ok === 'no' && c1.ghost === refusal && !c1.put, { g1, c1 });
    await evaluate(`(() => { const c = document.querySelector('.bg-plot-card'); if (c) c.scrollIntoView({ block: 'end' }); })()`);
    await shot(`iw7b-${tag}-ghost-red`);
    const spot = spec('refuge').spot;
    await tap(cellOf(LP.x + spot.x, LP.y + spot.y), `the refuge's spot (${tag})`);
    await until(CARD, (c) => c.up && c.put, 3000);
    await tap(first('.bg-ghost-put'), `Le poser ici (${tag})`);
    const land = await until(`(() => { const k = ${STORE_KEY}; const m = JSON.parse(localStorage.getItem(k)).model; const a = m.profiles.find((x) => x.id === m.island.activeId); return a.island.land || null; })()`, (l) => !!l && l.buildings.length === 1, 4000);
    check(`GHOST ${tag}: placed on its spot — her land has the refuge at (${spot.x}, ${spot.y})`, !!land && land.buildings[0].bp === 'refuge' && land.buildings[0].x === spot.x && land.buildings[0].y === spot.y, land);
    const vw = await evaluate(`({ sw: document.documentElement.scrollWidth, w: innerWidth })`);
    check(`${tag}: no sideways scroll of the page`, vw.sw <= vw.w + 1, vw);
    await shot(`iw7b-${tag}-placed`);
  }
  check('0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return finish();

  // ── 3D: the spa at each stage, then the last plank live (the puff) ──
  async function threeD() {
    const tag = '3d-1368';
    await page.setViewport({ name: '1368', width: 1368, height: 912, mobile: false });
    check(`${tag}: a new player lands on the island`, await freshFamily(tag, 'en'), await evaluate('location.pathname'));
    await seeded(0);
    const ROOT = `document.querySelector('.bg-isle [data-gd3-world]')`;
    const B3 = `(() => { const e = ${ROOT}; if (!e || !e.gd3 || !e.gd3.built) return null; const b = e.gd3.built.things.find((g) => g.userData.building); const names = []; if (b) b.traverse((o) => { if (o !== b && o.name && names.indexOf(o.name) === -1) names.push(o.name); }); const pf = b && b.getObjectByName ? b.getObjectByName('puff') : null; return { stage: b ? b.userData.stage : null, parts: names.sort().join(' '), puffing: !!(pf && pf.visible), tooSlow: e.getAttribute('data-too-slow') }; })()`;
    const flat = () => evaluate(`document.querySelectorAll('.bg-isle .gd-cell').length > 0`);
    const seen = [];
    const at = { 0: [0, 0], 1: [2, 0], 2: [6, 1], 3: [6, 4] };
    // Pip pinned on her land with a program that fills nothing (a turn): the land's team is judged stale, so he waits at
    // its home — on the land, where "Find my robots" frames — and the spa stays at the stage seeded for the screenshot.
    for (const st of [0, 1, 2, 3]) {
      const m = await stored();
      const a = m.profiles.find((x) => x.id === m.island.activeId);
      a.island.land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: at[st][0], plank: at[st][1] } }], animals: [] };
      for (const k of Object.keys(a.island.plots)) if (a.island.plots[k].robotId === 'r1') a.island.plots[k].robotId = '';
      a.island.plots[LAND_ID] = { program: [blk(1, 'left')], robotId: 'r1', wonAt: 1759300000100 };
      await store(m);
      await page.navigate('/island');
      const r = await until(B3, (v) => !!v && !!v.stage, 15000);
      await tap(first('.bg-isle-find'), `find my robots (${st})`);
      await wait(1800);
      seen.push({ st, ...(await evaluate(B3)), flat: await flat() });
      await shot(`iw7b-3d-spa-stage-${st}`);
      readings[`3d-${st}`] = r;
    }
    readings.three = seen;
    check(`3D: the spa built by Garden 3D at each of its four stages — pegs and string · the frame · the walls · the roof and its bath (framed on the robots at work on her land)`, JSON.stringify(seen.map((s) => [s.stage, s.parts])) === JSON.stringify([['spa0', 'peg string'], ['spa1', 'beam post'], ['spa2', 'beam post wall'], ['spa3', 'bath puff roof wall']]), seen);
    // The last plank live: the spa one plank short, Pip pinned with the planks; a recorder samples the 3D scene every 50 ms.
    const m0 = await stored();
    m0.profiles.find((x) => x.id === m0.island.activeId).island.land = { buildings: [{ id: 'b1', bp: 'spa', x: 3, y: 1, have: { stone: 6, plank: 3 } }], animals: [] };
    await store(crewOnLand(m0, 'b1'));
    await page.navigate('/island');
    await until(B3, (v) => !!v && !!v.stage, 15000);
    await tap(first('.bg-isle-find'), 'find my robots (live)');
    await evaluate(`(() => { window.__iw7b3 = { stages: [], puff: 0 }; const id = setInterval(() => { const e = ${ROOT}; if (!e || !e.gd3 || !e.gd3.built) return; const b = e.gd3.built.things.find((g) => g.userData.building); if (!b) return; const s = window.__iw7b3.stages; if (s[s.length - 1] !== b.userData.stage) s.push(b.userData.stage); const pf = b.getObjectByName ? b.getObjectByName('puff') : null; if (pf && pf.visible) window.__iw7b3.puff++; }, 50); window.__iw7b3.id = id; return true; })()`);
    const live = await until(`window.__iw7b3`, (r) => r.stages.includes('spa3') && r.puff > 0, 90000);
    await shot('iw7b-3d-spa-finished-live');
    const fell = await flat();
    readings.live3d = { live, fell };
    check('3D: the last plank dropped live — the spa reaches its last stage and the puff is seen over it (a sampler every 50 ms) — or, under software GL, the flat island took over and says so', (live.stages.includes('spa3') && live.puff > 0) || fell, readings.live3d);
    check('3D: 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    return finish();
  }

  function finish() {
    return { dir: DIR, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
  }
})
  .then((out) => {
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} clauses passed${SHOTS ? `; screenshots in ${SHOTS}` : ''}`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error('DRIVE FAILED:', e && e.stack ? e.stack : e);
    process.exit(1);
  });
