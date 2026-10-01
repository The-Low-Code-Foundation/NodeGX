#!/usr/bin/env node
/**
 * IW-007 (P108 s6) — her land BY TOUCH, on the DEPLOYED template (`drives/drive-all.sh` assembles a copy of
 * `templates/bot-garden` and deploys it to `$OUT/deploy`): a second robot onto her land, and teaching on the land.
 *
 * Usage:
 *   node scripts/devtools/drive-iw007-touch.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d]
 *
 * --mode 3d (P108 s7): the same taps on Garden 3D under software GL (swiftshader) — a tile is tapped where the 3D kit's
 * own `screenOfTile` puts it on the canvas (her land on the island, a part or her bowl picked in the Workshop).
 *
 * The family is made the game's way (a new player on the page; Cobble lent by the page's own Complete request; shells by
 * the page's own earnShells). Then EVERYTHING is done by touch, 1368 × 900 EN, headless (the flat island):
 *   PLACE  the spa bought in the Build tab, its ghost put on its spot of her land (`Put it here`).
 *   CREW   her land's card: "Your robots" — Pip and Cobble (another kind) — Pip ringed, the line says a tap chooses;
 *          Go and help reads "Teach Pip here".
 *   PIP    Teach Pip here → the Workshop on her land with Pip; built from the drawer by taps: until [the spa's stones] is
 *          done { go to nearest rock, pick up, go to [the spa's stones], put down } (the two parts picked ON the world);
 *          Played: the win card. The store: Pip at work on the land with that program; the land not in `done`.
 *   COBBLE back on the island, a tap on Cobble's pill rings him and Go and help reads "Teach Cobble here"; the Workshop
 *          with Cobble; until [the spa's planks] is done { go to nearest tree, … }; the win card. The store: Cobble HELPS
 *          on the land with his own program, Pip still at work there.
 *   BUILD  the island: the spa at every stage, Pip seen carrying stones and Cobble planks, finished; the store 6/6 · 4/4.
 *   REST   (s7) Pip and Cobble walk to the finished spa and rest in front of it, a tile each (the page's landJob says
 *          which) — not at her land's home.
 *   PILLS  (s7, flat island) while the two build, at every settled moment (400 ms after a robot moved: its glide
 *          done), no two name pills cover each other — and the robots WERE close enough for that (one pill went over).
 *   PAY    (s7) Cobble's planks earn: his own "+N 🐚" line on the island, and the wallet holds what the lines said.
 *   HERE   her land's card: "Pip works here · Cobble helps"; Cobble chosen → "Cobble helps here, …", Bring Cobble home.
 *   FEED   the refuge finished and Hazel the rabbit seeded; Cobble re-taught on her land by touch: until [her bowl] is
 *          full { go to nearest carrot patch, … } — WON while the land holds two buildings; the store: Cobble helps with
 *          the feeding program; on the island her bowl reaches 3/3 — and (s7) she gives her clover: its line is seen.
 *   FR     390 × 844: the card's robots line and "Apprendre à Pip ici" in French.
 *   0 console errors.
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
  console.error('usage: drive-iw007-touch.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d]');
  process.exit(2);
}
// 3D: Chrome with SOFTWARE WebGL (swiftshader), as drive-iw004-blocks.js --mode 3d.
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};
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
const WORDS = { en: {}, fr: {} };
for (const r of staticRows('Data/Words')) {
  WORDS.en[r.key] = r.en;
  WORDS.fr[r.key] = r.fr;
}
const w = (lang, key) => String(WORDS[lang][key] || '');
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(String(v)), text);
const REQUESTS = staticRows('Data/Requests');
const req = (id) => REQUESTS.find((r) => r.id === id);
const SAVE = pageRun('Logic/Bring home', { model: {} }, '\n;Outputs.earnShells = earnShells; Outputs.modelOf = modelOf; Outputs.SHOP = SHOP; Outputs.BLUEPRINTS = BLUEPRINTS;');
const LAND = pageRun('Logic/Land card', { model: {} }, '\n;Outputs.LAND_PLOT = LAND_PLOT; Outputs.LAND_ID = LAND_ID;');
const LP = LAND.LAND_PLOT;
const LAND_ID = LAND.LAND_ID;
const item = (id) => SAVE.SHOP.find((i) => i.id === id);
const spec = (bp) => SAVE.BLUEPRINTS.find((b) => b.id === bp);
const win = (model, id, robotId = 'r1') => pageRun('Logic/Complete request', { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(req(id).referenceProgram), robotId, now: 1759300000000 }).model;

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

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  const errors = [];
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive();
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(String(msg.params.exceptionDetails && (msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text).slice(0, 300));
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
  });
  await client.send('Runtime.enable');
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
  const where = (finder, scroll = true) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      if (${scroll}) el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, hit: !!at && (el === at || el.contains(at)) }; })()`);
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
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${STORE_KEY}; try { return JSON.parse(localStorage.getItem(k)).model || null; } catch (e) { return null; } })()`);
  const store = (model) => evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); v.model = ${JSON.stringify(model)}; delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const active = async () => {
    const m = await stored();
    return m ? m.profiles.find((p) => p.id === m.island.activeId) : null;
  };
  const cellOf = (x, y) => `document.querySelector('.bg-isle .gd-cell[data-x="${x}"][data-y="${y}"]')`;
  /**
   * P108 s7: where a finger meets tile (x, y) of the world in `scope` ('.bg-isle' the island, '.bg-stage' the Workshop):
   * the 2D cell's centre, or in 3D the kit's own screenOfTile on its canvas — `hit` when nothing covers it there.
   */
  /**
   * Which world is drawn in `scope` now: '3d' (Garden 3D ready), '2d' (the flat cells — the page, or Garden 3D's own
   * fallback: under software GL the 55 × 22 island can trip Too Slow and the flat island takes over), or '' (neither yet).
   */
  const drawn = (scope) => evaluate(`(() => { const e = document.querySelector('${scope} [data-gd3-world]'); if (e && e.gd3 && e.getAttribute('data-ready') === 'true') return '3d'; return document.querySelector('${scope} .gd-cell') ? '2d' : ''; })()`);
  const tileAt = async (scope, x, y) => {
    const now = MODE === '3d' ? await until(`(() => { const e = document.querySelector('${scope} [data-gd3-world]'); if (e && e.gd3 && e.getAttribute('data-ready') === 'true') return '3d'; return document.querySelector('${scope} .gd-cell') ? '2d' : ''; })()`, Boolean, 15000) : '2d';
    if (now !== '3d') return where(`document.querySelector('${scope} .gd-cell[data-x="${x}"][data-y="${y}"]')`);
    const ROOT = `document.querySelector('${scope} [data-gd3-world]')`;
    return evaluate(`(() => { const r = ${ROOT}; if (!r || !r.gd3) return { found: false }; r.scrollIntoView({ block: 'center' }); const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${x}, ${y}); const px = c.left + s.sx, py = c.top + s.sy; const at = document.elementFromPoint(px, py); return { found: true, x: px, y: py, hit: !!at && !!at.getAttribute && at.getAttribute('data-gd3-canvas') !== null, top: at ? at.className || at.tagName : null }; })()`);
  };
  const tapTile = async (scope, x, y, label) => {
    if (MODE !== '3d' || (await drawn(scope)) === '2d') return tap(`document.querySelector('${scope} .gd-cell[data-x="${x}"][data-y="${y}"]')`, label);
    const p = await tileAt(scope, x, y);
    if (!p.found || !p.hit) {
      check(`tap ${label}`, false, p);
      return false;
    }
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(p.x), y: Math.round(p.y), button: 'left', clickCount: 1 });
    await wait(250);
    return true;
  };
  /** The robots on the island (island tiles) and, in 2D, their name pills' boxes on the page. */
  const BOTS = `(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); if (e && e.gd3 && e.gd3.world) return e.gd3.world.robots.map((r) => ({ name: r.name || '', x: r.x, y: r.y, load: (r.carry || [])[(r.carry || []).length - 1] || null, in3d: true }));
    return [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => { const n = b.querySelector('.gd-name'); const r = n ? n.getBoundingClientRect() : null; const l = b.querySelector('.gd-load'); return { name: n ? n.innerText.trim() : '', x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), load: l ? l.getAttribute('data-load') : null, up: !!n && n.hasAttribute('data-up'), pill: r ? { l: r.left, r: r.right, t: r.top, b: r.bottom } : null }; }); })()`;
  /** The island's "+N 🐚" lines from now on (each line as it appears), and the wallet as it stood when this began. */
  const payWatch = () => evaluate(`(() => { const m = JSON.parse(localStorage.getItem(${STORE_KEY})).model; const a = m.profiles.find((x) => x.id === m.island.activeId);
    const w = window.__iw7tPay = { lines: [], earned0: a.shells.earned, seen: new WeakSet() };
    const read = () => document.querySelectorAll('.bg-isle-pay').forEach((e) => { if (w.seen.has(e) || !e.innerText.trim()) return; w.seen.add(e); w.lines.push(e.innerText.trim()); });
    if (w.obs) w.obs.disconnect(); w.obs = new MutationObserver(read); w.obs.observe(document.body, { childList: true, subtree: true, characterData: true }); read(); return true; })()`);
  const said = (lines) => lines.join(' · ').split(' · ').reduce((n, l) => n + Number((/\+(\d+)/.exec(l) || [0, 0])[1]), 0);
  const nameOf = (lang, id) => item(id).name[lang];
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
    // Pip stays home (path-postbox's win pinned him there): her land is the job this drive teaches him.
    for (const p of m.profiles) for (const k of Object.keys(p.island.plots)) if (p.island.plots[k].robotId === 'r1') p.island.plots[k] = { program: null, robotId: '', wonAt: p.island.plots[k].wonAt };
    await store(m);
    await page.navigate('/island');
    await wait(1800);
    return m;
  };
  /** Her land's card as a child reads it: the land's lines, her robots on it (ringed = ink), Go and help, Bring home. */
  const CARD = `(() => { const c = document.querySelector('.bg-plot-card'); if (!c || c.offsetParent === null) return { up: false }; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; const vis = (s) => { const e = c.querySelector(s); return !!e && e.offsetParent !== null; };
    const lum = (e) => { const m = getComputedStyle(e).backgroundColor.match(/\\d+(\\.\\d+)?/g) || [255, 255, 255]; return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; };
    return { up: true, title: t('.bg-plot-title'), line: t('.bg-plot-line'), land: t('.bg-land-line'), crew: vis('.bg-crew'), crewL: t('.bg-crew .bg-caps'), tapLine: t('.bg-crew-tap'), here: t('.bg-crew-here'),
      robots: [...c.querySelectorAll('.bg-crew .bg-chip')].filter((e) => e.offsetParent !== null).map((e) => ({ name: e.innerText.trim(), on: lum(e) < 0.5 })),
      open: t('.bg-plot-open'), home: t('.bg-bring-home') }; })()`;
  const openLand = async (tag) => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island', 3000);
    await wait(600);
    // A free tile of her land a finger can reach (a building, a pen animal or a robot may stand over one).
    let spot = null;
    for (const [dx, dy] of [[2, 4], [1, 3], [5, 2], [6, 4], [1, 1], [2, 2]]) {
      const p = await tileAt('.bg-isle', LP.x + dx, LP.y + dy);
      if (p.found && p.hit) {
        spot = [dx, dy];
        break;
      }
    }
    await tapTile('.bg-isle', LP.x + (spot ? spot[0] : 2), LP.y + (spot ? spot[1] : 4), `her land (${tag})`);
    return until(CARD, (c) => c.up && c.title === w('en', 'iw7bLandTitle') || (c.up && c.title === w('fr', 'iw7bLandTitle')), 3000);
  };

  // ── the Workshop (drive-iw003-stones.js's taps) ──
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const WS = `${BK}.__gardenBlocks.workspace()`;
  const reveal = (id) => evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
  const gotIt = async (label) => {
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${label})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const palTap = async (id) => {
    await reveal(id);
    await wait(150);
    await tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), `palette ${id}`);
    await wait(200);
    await gotIt(id);
  };
  const blockSvg = (id) => `(${WS}.getBlockById(${JSON.stringify(String(id))}) || { getSvgRoot: () => null }).getSvgRoot()`;
  const fieldSvg = (blockExpr, field) => `((b) => { const f = b && b.getField(${JSON.stringify(field)}); return f && f.getSvgRoot ? f.getSvgRoot() : null; })(${blockExpr})`;
  const blockOf = (id) => `${WS}.getBlockById(${JSON.stringify(String(id))})`;
  const condOf = (id) => `((b) => b && b.getInputTargetBlock('COND'))(${blockOf(id)})`;
  const chipOf = (blockExpr) => `((b) => { const c = b && b.getInputTargetBlock('THING'); return c ? c.getSvgRoot() : null; })(${blockExpr})`;
  const newest = (t) => evaluate(`(() => { const l = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]')].map((e) => Number(e.getAttribute('data-id'))).filter((n) => isFinite(n)); return l.length ? String(Math.max(...l)) : ''; })()`);
  const selectedIs = (id) => evaluate(`((e) => e ? e.getAttribute('data-sel') : '')(${blockSvg(id)})`);
  const tapInWs = async (finder, label) => {
    for (const fix of [null, 'fit', 'out']) {
      if (fix) {
        await tap(`document.querySelector('.bg-blocks-box .gd-bk-zoom [data-zoom="${fix}"]')`, `the workspace’s ${fix}`);
        await wait(450);
      }
      const p = await where(finder, false);
      if (p.found && p.hit) return tap(finder, label);
    }
    return tap(finder, label);
  };
  const selectRep = async (id, label) => {
    for (let k = 0; k < 3 && (await selectedIs(id)) !== '1'; k++) await tapInWs(fieldSvg(blockOf(id), 'WORD'), `${label}: take the ${id}`);
    return (await selectedIs(id)) === '1';
  };
  const slot = async (blockExpr, field, opt, label) => {
    await tapInWs(fieldSvg(blockExpr, field), `${label}: its ${field}`);
    await wait(200);
    return tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${opt}"]`), `${label}: ${opt}`);
  };
  const pickOnWorld = async (chipFinder, x, y, label) => {
    await tapInWs(chipFinder, `${label}: the chip (pick on the world)`);
    await until(`!!document.querySelector('.bg-blocks-box .gd-bk.gd-picking')`, Boolean, 2000);
    return tapTile('.bg-stage', x, y, `${label}: the tile ${x},${y}`);
  };
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l : []; })()`;
  const WON = `(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`;
  const WIN_TEXT = `(() => { const c = document.querySelector('.bg-win-card'); return c && c.offsetParent !== null ? c.innerText.replace(/\\s+/g, ' ').trim() : ''; })()`;
  const WS_BOT = `(() => { const n = document.querySelector('.bg-stage .gd-bot .gd-name') || document.querySelector('.bg-stage .gd3-name'); return { bot: n ? n.textContent.trim() : '', req: Noodl.Variables.gardenRequestId || '' }; })()`;
  /** What the child reads on an until: its chip's words and its state's (P108 s6: a land part's own words). */
  const CHIP_WORDS = (u) => `((b) => { const c = b && b.getInputTargetBlock('THING'); const tx = (r) => (r ? r.textContent.replace(/\u00a0/g, ' ').trim() : ''); return { chip: tx(c && c.getSvgRoot()), state: tx(b && b.getField('STATE').getSvgRoot()) }; })(${condOf(u)})`;
  /** until [part] is done { go to nearest <source>, pick up, go to [part], put down } — the part picked on the world. */
  const buildCarry = async (part, source, label) => {
    await palTap('until');
    const u = await newest('until');
    await selectRep(u, `${label}: until`);
    await palTap('is');
    await pickOnWorld(chipOf(condOf(u)), part.x, part.y, `${label}: the part`);
    await slot(condOf(u), 'STATE', 'done', `${label}: done`);
    await selectRep(u, `${label}: until (the body)`);
    await palTap('go_nearest');
    await slot(blockOf(await newest('go_nearest')), 'KIND', source, `${label}: go to nearest`);
    await selectRep(u, `${label}: until (the pick)`);
    await palTap('pick');
    await selectRep(u, `${label}: until (the walk back)`);
    await palTap('go_to');
    await pickOnWorld(chipOf(blockOf(await newest('go_to'))), part.x, part.y, `${label}: go to the part`);
    await selectRep(u, `${label}: until (the put)`);
    await palTap('put');
    readings[`${label}-words`] = await evaluate(CHIP_WORDS(u));
    // s7: the last tap's block can land a moment after the tap (software GL, 3D): read the program once it holds the put.
    return until(PROGRAM, (l) => JSON.stringify(l).includes('"t":"put"'), 4000);
  };
  const teachHere = async (label, part, source) => {
    await tap(first('.bg-plot-open'), `${label}: Teach … here`);
    await until('location.pathname', (p) => p === '/workshop', 4000);
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    await wait(900);
    await gotIt(`${label}: the first card`);
    const who = await evaluate(WS_BOT);
    const prog = await buildCarry(part, source, label);
    readings[`${label}-world`] = await drawn('.bg-stage');
    await shot(`iw7t-${label}-program`);
    await tap(first('.bg-controls .bg-i-play'), `${label}: Play`);
    const won = await until(WON, Boolean, 150000);
    const text = won ? await evaluate(WIN_TEXT) : '';
    await shot(`iw7t-${label}-won`);
    if (won) await tap(byText('.bg-win-card button', w('en', 'winStay')), `${label}: Keep tinkering`);
    await wait(400);
    return { who, prog, won, text };
  };
  const shape = (prog) => JSON.stringify(prog.map(function walk(b) { return [b.t, b.slots ? Object.keys(b.slots).sort() : [], (b.body || []).map(walk)]; }));

  // ── 1368 EN ──
  await page.setViewport({ name: '1368', width: 1368, height: 900, mobile: false });
  const tag = '1368-en';
  check(`${tag}: a new player lands on the island`, await freshFamily(tag, 'en'), await evaluate('location.pathname'));
  await seeded(item('spa').price + 5);
  // PLACE — bought in the Build tab, its ghost put on its spot (drive-iw007-build.js grades every word of this).
  await tap(first('.bg-shop-open'), 'the shop');
  await tap(byText('.bg-shop-tabs .bg-chip', w('en', 'iw6hTabBuild')), 'the Build tab');
  await tap(byText('.bg-shop-items .bg-shop-item .bg-shop-name', nameOf('en', 'spa')), 'the spa');
  await tap(first('.bg-shop-buy'), 'Buy');
  await wait(600);
  await tap(first('.bg-shop-close'), 'close the shop');
  let c = await openLand(tag);
  await tap(hasText('.bg-plot-card .bg-land-row .bg-chip', nameOf('en', 'spa')), "the spa's chip");
  await until(`!!document.querySelector('.bg-ghost-put') && document.querySelector('.bg-ghost-put').offsetParent !== null`, Boolean, 3000);
  await tap(first('.bg-ghost-put'), 'Put it here');
  const land = await until(`(() => { const m = JSON.parse(localStorage.getItem(${STORE_KEY})).model; const a = m.profiles.find((x) => x.id === m.island.activeId); return a.island.land || null; })()`, (l) => !!l && l.buildings.length === 1, 4000);
  const b = land && land.buildings[0];
  check(`PLACE ${tag}: the spa bought and put on her land by touch`, !!b && b.bp === 'spa', land);
  const parts = spec('spa').parts;
  const partAt = (it) => ({ x: b.x + parts.find((q) => q.item === it).dx, y: b.y });

  // CREW — her robots of any kind on her land's card.
  c = await until(CARD, (x) => x.up && x.crew && x.robots.length === 2, 4000);
  readings.crew = c;
  check(`CREW ${tag}: her land's card shows "${w('en', 'iw7tCrewL')}" — Pip and Cobble (another kind), Pip ringed; "${w('en', 'iw7tCrewTap')}"`,
    c.crew && JSON.stringify(c.robots) === JSON.stringify([{ name: 'Pip', on: true }, { name: 'Cobble', on: false }]) && String(c.crewL).toLowerCase() === w('en', 'iw7tCrewL').toLowerCase() && c.tapLine === w('en', 'iw7tCrewTap'), c);
  check(`CREW ${tag}: Go and help reads "${fill(w('en', 'iw7tTeach'), { b: 'Pip' })}"`, c.open === fill(w('en', 'iw7tTeach'), { b: 'Pip' }), c.open);
  await shot('iw7t-01-crew');

  // PIP — taught the stones in the Workshop on her land.
  const pip = await teachHere('pip-stones', partAt('stone'), 'rock');
  readings.pip = { who: pip.who, won: pip.won, text: pip.text, prog: pip.prog };
  check(`PIP ${tag}: the Workshop opens on her land with Pip`, pip.who.req === LAND_ID && pip.who.bot === 'Pip', pip.who);
  check(`PIP ${tag}: until [the spa's stones] is done { go to nearest rock, pick up, go to [the spa's stones], put down } built by taps`, shape(pip.prog) === JSON.stringify([['until', ['cond'], [['go_nearest', ['kind'], []], ['pick', [], []], ['go_to', ['thing'], []], ['put', [], []]]]]), pip.prog);
  const pw = readings['pip-stones-words'] || {};
  check(`PIP ${tag}: the chip says "${w('en', 'iw7tK_spa_stone')}" and "${w('en', 'iw7tS_done')}" (not the path square's words)`, pw.chip === w('en', 'iw7tK_spa_stone') && pw.state === w('en', 'iw7tS_done'), pw);
  check(`PIP ${tag}: Played — one material WINS on her land (the win card)`, pip.won, pip.text);
  if (MODE === '3d') check(`3D ${tag}: the Workshop on her land is Garden 3D while Pip's parts are picked by taps on its world (not the flat fallback)`, readings['pip-stones-world'] === '3d', readings['pip-stones-world']);
  let p = await active();
  check(`PIP ${tag}: the store — Pip at work on her land with that program, the land not in done`, p.island.plots[LAND_ID] && p.island.plots[LAND_ID].robotId === 'r1' && shape(p.island.plots[LAND_ID].program) === shape(pip.prog) && !p.island.done.includes(LAND_ID), { plot: p.island.plots[LAND_ID], done: p.island.done });

  // COBBLE — chosen on the card, taught the planks.
  c = await openLand(tag);
  await tap(byText('.bg-plot-card .bg-crew .bg-chip', 'Cobble'), "Cobble's pill");
  c = await until(CARD, (x) => x.up && x.robots.some((r) => r.name === 'Cobble' && r.on) && x.open === fill(w('en', 'iw7tTeach'), { b: 'Cobble' }), 4000);
  check(`COBBLE ${tag}: a tap on Cobble's pill rings him; Go and help reads "${fill(w('en', 'iw7tTeach'), { b: 'Cobble' })}"; nothing written`, c.robots.some((r) => r.name === 'Cobble' && r.on) && !c.robots.some((r) => r.name === 'Pip' && r.on) && c.open === fill(w('en', 'iw7tTeach'), { b: 'Cobble' }), c);
  await shot('iw7t-02-cobble-chosen');
  const cob = await teachHere('cobble-planks', partAt('plank'), 'tree');
  readings.cobble = { who: cob.who, won: cob.won, text: cob.text, prog: cob.prog };
  check(`COBBLE ${tag}: the Workshop opens on her land with Cobble`, cob.who.req === LAND_ID && cob.who.bot === 'Cobble', cob.who);
  check(`COBBLE ${tag}: the planks Played — the win card`, cob.won, cob.text);
  p = await active();
  const cr = p.island.robots.find((r) => r.id === 'cobble');
  check(`COBBLE ${tag}: the store — Cobble HELPS on her land with his own program, Pip still at work there`, cr && cr.helps === LAND_ID && shape(cr.program) === shape(cob.prog) && p.island.plots[LAND_ID].robotId === 'r1', { cobble: cr, plot: p.island.plots[LAND_ID] });

  // BUILD — the island: the two taught robots build the spa.
  await tab(0);
  await until('location.pathname', (x) => x === '/island', 3000);
  await wait(1200);
  await payWatch();
  if (MODE === '3d')
    await evaluate(`(() => { window.__iw7t = { stages: [], loads: {}, t0: performance.now(), worlds: [] };
    setInterval(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); const wv = e && e.gd3 && e.gd3.built ? '3d' : '2d'; const ws = window.__iw7t.worlds; if (ws[ws.length - 1] !== wv) ws.push(wv);
      if (wv === '2d') { const bd = document.querySelector('.bg-isle .gd-bld[data-build="spa"]'); const st2 = bd ? bd.getAttribute('data-bstage') : null; const s2 = window.__iw7t.stages; if (st2 !== null && s2[s2.length - 1] !== st2) s2.push(st2);
        document.querySelectorAll('.bg-isle .gd-bot').forEach((r) => { const l = r.querySelector('.gd-load'); const n = (r.querySelector('.gd-name') || {}).innerText || ''; if (l) { window.__iw7t.loads[n] = window.__iw7t.loads[n] || []; const v = l.getAttribute('data-load'); if (window.__iw7t.loads[n].indexOf(v) === -1) window.__iw7t.loads[n].push(v); } }); return; } const b = e.gd3.built.things.find((g) => g.userData.building && String(g.userData.stage || '').indexOf('spa') === 0); const st = b ? String(b.userData.stage).replace('spa', '') : null; const s = window.__iw7t.stages; if (st !== null && s[s.length - 1] !== st) s.push(st);
      (e.gd3.world.robots || []).forEach((r) => { const v = (r.carry || [])[(r.carry || []).length - 1]; if (!v) return; const n = r.name || ''; window.__iw7t.loads[n] = window.__iw7t.loads[n] || []; if (window.__iw7t.loads[n].indexOf(v) === -1) window.__iw7t.loads[n].push(v); }); }, 100);
    return true; })()`);
  else await evaluate(`(() => { window.__iw7t = { stages: [], loads: {}, t0: performance.now(), pills: { settled: 0, near: 0, nearUp: 0, meets: 0, first: null } };
    const box = document.querySelector('.bg-isle');
    // s7: the pills, measured once each glide is done (a robot moved → 400 ms; a step glides in ~380 ms).
    let pt = null;
    const pills = () => { const P = window.__iw7t.pills; const l = [...box.querySelectorAll('.gd-bot')].map((b) => { const n = b.querySelector('.gd-name'); return n ? { name: n.innerText.trim(), x: +b.getAttribute('data-x'), y: +b.getAttribute('data-y'), up: n.hasAttribute('data-up'), r: n.getBoundingClientRect() } : null; }).filter(Boolean);
      P.settled++;
      for (let i = 0; i < l.length; i++) for (let k = i + 1; k < l.length; k++) { const a = l[i], c = l[k];
        const near = Math.abs(a.x - c.x) <= 3 && Math.abs(a.y - c.y) <= 2; const meet = a.r.left < c.r.right && c.r.left < a.r.right && a.r.top < c.r.bottom && c.r.top < a.r.bottom;
        if (near) { P.near++; if (a.up || c.up) P.nearUp++; }
        if (meet) { P.meets++; if (!P.first) P.first = [a, c].map((q) => ({ name: q.name, x: q.x, y: q.y, up: q.up })); } } };
    new MutationObserver(() => { clearTimeout(pt); pt = setTimeout(pills, 400); }).observe(box, { subtree: true, attributes: true, attributeFilter: ['data-x', 'data-y'] });
    const read = () => { const b = box.querySelector('.gd-bld[data-build="spa"]'); const st = b ? b.getAttribute('data-bstage') : null; const s = window.__iw7t.stages; if (st !== null && s[s.length - 1] !== st) s.push(st);
      box.querySelectorAll('.gd-bot').forEach((r) => { const l = r.querySelector('.gd-load'); const n = (r.querySelector('.gd-name') || {}).innerText || ''; if (l) { window.__iw7t.loads[n] = window.__iw7t.loads[n] || []; const v = l.getAttribute('data-load'); if (window.__iw7t.loads[n].indexOf(v) === -1) window.__iw7t.loads[n].push(v); } }); };
    new MutationObserver(read).observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-bstage', 'data-load', 'data-x', 'data-y'] });
    read(); return true; })()`);
  const t0 = Date.now();
  let rec = null;
  while (Date.now() < t0 + 5 * 60 * 1000) {
    rec = await evaluate('window.__iw7t');
    if (rec.stages[rec.stages.length - 1] === '3') break;
    await wait(1000);
  }
  readings.build = { ...rec, seconds: Math.round((Date.now() - t0) / 1000) };
  await shot('iw7t-03-built');
  check(`BUILD ${tag}: the spa rises on the island to finished (stages ${(rec && rec.stages.join(' → ')) || 'none'}) in ${readings.build.seconds} s`, !!rec && rec.stages[rec.stages.length - 1] === '3', rec);
  check(`BUILD ${tag}: Pip seen carrying stones, Cobble planks`, !!rec && (rec.loads.Pip || []).includes('stone') && (rec.loads.Cobble || []).includes('plank'), rec && rec.loads);
  await wait(2500);
  p = await active();
  const sb = p.island.land.buildings[0];
  check(`BUILD ${tag}: the store holds the spa finished — 6/6 stones, 4/4 planks`, sb.have.stone === 6 && sb.have.plank === 4, sb);

  // REST (s7) — the job done, the two walk to the finished spa and rest in front of it, a tile each (under its parts).
  // Where the page's own landJob says they rest (plot tiles), on the island.
  const restAt = pageRun('Logic/Land card', { model: {} }, `\n;Outputs.rest = landJob(${JSON.stringify(p.island.land)}).rest;`).rest.tiles.map((t) => ({ x: LP.x + t.x, y: LP.y + t.y }));
  const atRest = (bots) => ['Pip', 'Cobble'].every((n, i) => bots.some((r) => r.name === n && r.x === restAt[i].x && r.y === restAt[i].y));
  const resting = await until(BOTS, atRest, 60000);
  readings.rest = { want: restAt, bots: resting, home: { x: LP.x, y: LP.y }, world: await drawn('.bg-isle'), worlds: rec && rec.worlds };
  await shot('iw7t-03b-rest');
  check(`REST ${tag}: Pip and Cobble rest in front of the finished spa — island (${restAt[0].x}, ${restAt[0].y}) and (${restAt[1].x}, ${restAt[1].y}), not her land's home (${LP.x}, ${LP.y})`, atRest(resting), resting);
  if (rec && rec.pills) {
    const P = rec.pills;
    readings.pills = P;
    // Known-firing: the robots came close (within 3 tiles across, 2 down) and a pill went over — the case the rule is for.
    check(`PILLS ${tag}: while the two built, no two name pills covered each other at any of ${P.settled} settled moments — and ${P.near} times they stood close, ${P.nearUp} with a pill sent over`, P.settled > 20 && P.meets === 0 && P.near > 0 && P.nearUp > 0, P);
  }
  const pay = await evaluate('window.__iw7tPay');
  const nowEarned = (await active()).shells.earned;
  readings.pay = { lines: pay.lines, earned0: pay.earned0, earned: nowEarned };
  check(`PAY ${tag}: Cobble's planks earn — his own "Cobble +N 🐚" line on the island beside Pip's; the wallet rose by what the lines said (${said(pay.lines)})`, pay.lines.some((l) => /Cobble \+\d+/.test(l)) && pay.lines.some((l) => /Pip \+\d+/.test(l)) && nowEarned - pay.earned0 === said(pay.lines), readings.pay);

  // HERE — who works her land, said on its card; the helper chosen.
  c = await openLand(tag);
  const hereWant = `${fill(w('en', 'iw8cWorks'), { r: 'Pip' })} · ${fill(w('en', 'iw8cHelps'), { r: 'Cobble' })}`;
  check(`HERE ${tag}: her land's card says "${hereWant}"`, c.here === hereWant, c);
  if (!c.robots.some((r) => r.name === 'Cobble' && r.on)) await tap(byText('.bg-plot-card .bg-crew .bg-chip', 'Cobble'), "Cobble's pill");
  c = await until(CARD, (x) => x.up && x.line === fill(w('en', 'iw7tHelpsHere'), { b: 'Cobble' }), 4000);
  check(`HERE ${tag}: Cobble chosen — "${fill(w('en', 'iw7tHelpsHere'), { b: 'Cobble' }).slice(0, 40)}…", Bring Cobble home`, c.line === fill(w('en', 'iw7tHelpsHere'), { b: 'Cobble' }) && c.home === fill(w('en', 'ig4Home'), { b: 'Cobble' }), c);
  await shot('iw7t-04-here');

  // FEED — the refuge finished and Hazel the rabbit by her bowl (seeded: drive-iw007-animals.js grades buying her), then
  // Cobble — his planks all in — taught on her land to feed her, by touch; on the island he fills her bowl.
  {
    const m = await stored();
    const a = m.profiles.find((x) => x.id === m.island.activeId);
    const rs = spec('refuge');
    a.island.land.buildings.push({ id: 'rf1', bp: 'refuge', x: rs.spot.x, y: rs.spot.y, have: Object.fromEntries(rs.parts.map((q) => [q.item, q.need])) });
    a.island.land.animals = [{ id: 'a1', kind: 'rabbit', name: 'Hazel', at: 'rf1', slot: 0, fed: 0 }];
    await store(m);
    await page.navigate('/island');
    await wait(1500);
    const bowl = { x: rs.spot.x, y: rs.spot.y + 1 };
    c = await openLand(tag);
    if (!c.robots.some((r) => r.name === 'Cobble' && r.on)) await tap(byText('.bg-plot-card .bg-crew .bg-chip', 'Cobble'), "Cobble's pill (to feed)");
    await until(CARD, (x) => x.up && x.open === fill(w('en', 'iw7tTeach'), { b: 'Cobble' }), 4000);
    await tap(first('.bg-plot-open'), 'feed: Teach Cobble here');
    await until('location.pathname', (x) => x === '/workshop', 4000);
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    await wait(900);
    await gotIt('feed: the first card');
    await palTap('until');
    const u = await newest('until');
    await selectRep(u, 'feed: until');
    await palTap('is');
    await pickOnWorld(chipOf(condOf(u)), bowl.x, bowl.y, 'feed: her bowl');
    await slot(condOf(u), 'STATE', 'full', 'feed: full');
    await selectRep(u, 'feed: until (the body)');
    await palTap('go_nearest');
    await slot(blockOf(await newest('go_nearest')), 'KIND', 'patch', 'feed: go to nearest');
    await selectRep(u, 'feed: until (the pick)');
    await palTap('pick');
    await selectRep(u, 'feed: until (the walk back)');
    await palTap('go_to');
    await pickOnWorld(chipOf(blockOf(await newest('go_to'))), bowl.x, bowl.y, 'feed: go to her bowl');
    await selectRep(u, 'feed: until (the put)');
    await palTap('put');
    readings.feedWords = await evaluate(CHIP_WORDS(u));
    const feedProg = await until(PROGRAM, (l) => JSON.stringify(l).includes('"t":"put"'), 4000);
    await shot('iw7t-feed-program');
    await tap(first('.bg-controls .bg-i-play'), 'feed: Play');
    const fed = await until(WON, Boolean, 150000);
    readings.feed = { prog: feedProg, won: fed, text: fed ? await evaluate(WIN_TEXT) : '' };
    await shot('iw7t-feed-won');
    if (fed) await tap(byText('.bg-win-card button', w('en', 'winStay')), 'feed: Keep tinkering');
    check(`FEED ${tag}: until [her bowl] is full { go to nearest carrot patch, pick up, go to [her bowl], put down } built by taps and WON on her land (the spa standing, the refuge finished)`, fed && shape(feedProg) === JSON.stringify([['until', ['cond'], [['go_nearest', ['kind'], []], ['pick', [], []], ['go_to', ['thing'], []], ['put', [], []]]]]), readings.feed);
    check(`FEED ${tag}: the chip says "${fill(w('en', 'iw7tK_bowl'), { name: 'Hazel' })}" (not "bowl 1")`, readings.feedWords && readings.feedWords.chip === fill(w('en', 'iw7tK_bowl'), { name: 'Hazel' }), readings.feedWords);
    p = await active();
    const fc = p.island.robots.find((r) => r.id === 'cobble');
    check(`FEED ${tag}: the store — Cobble helps on her land with the feeding program (it replaced his planks), Pip still at work there`, fc && fc.helps === LAND_ID && shape(fc.program) === shape(feedProg) && p.island.plots[LAND_ID].robotId === 'r1', { cobble: fc, plot: p.island.plots[LAND_ID] });
    await tab(0);
    await until('location.pathname', (x) => x === '/island', 3000);
    await payWatch();
    const t1 = Date.now();
    const full = await until(`(() => { const m = JSON.parse(localStorage.getItem(${STORE_KEY})).model; const a = m.profiles.find((x) => x.id === m.island.activeId); return a.island.land.animals[0].fed; })()`, (n) => n >= 3, 180000);
    readings.feed.islandSeconds = Math.round((Date.now() - t1) / 1000);
    await shot('iw7t-feed-island');
    check(`FEED ${tag}: on the island Cobble fills Hazel's bowl — 3/3 in the store after ${readings.feed.islandSeconds} s`, full >= 3, full);
    const clover = fill(w('en', 'iw7sGiftClover'), { a: 'Hazel', n: 1 });
    const gift = await until('window.__iw7tPay.lines', (l) => l.includes(clover), 6000);
    readings.gift = gift;
    check(`GIFT ${tag}: her bowl filled right up, Hazel gives her present — "${clover}" on the island`, gift.includes(clover), gift);
  }

  // FR — the card's words on a phone.
  await page.setViewport({ name: '390', width: 390, height: 844, mobile: true });
  check('390-fr: a new player lands on the island', await freshFamily('390-fr', 'fr'), await evaluate('location.pathname'));
  await seeded(5);
  c = await openLand('390-fr');
  check(`FR 390: « ${w('fr', 'iw7tCrewL')} » — Pip et Cobble; « ${w('fr', 'iw7tCrewTap').slice(0, 30)}… »; « ${fill(w('fr', 'iw7tTeach'), { b: 'Pip' })} »`,
    c.crew && String(c.crewL).toLowerCase() === w('fr', 'iw7tCrewL').toLowerCase() && c.tapLine === w('fr', 'iw7tCrewTap') && c.robots.map((r) => r.name).join('|') === 'Pip|Cobble' && c.open === fill(w('fr', 'iw7tTeach'), { b: 'Pip' }), c);
  await shot('iw7t-05-fr-390');

  check('no console errors, no uncaught exceptions', errors.length === 0, errors.slice(0, 5));
}).then(() => {
  const passed = results.filter((r) => r.ok).length;
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results, readings }, null, 2));
  console.log(`\n${passed}/${results.length} clauses passed`);
  process.exit(passed === results.length && results.length > 0 ? 0 : 1);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
