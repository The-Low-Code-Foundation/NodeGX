#!/usr/bin/env node
/**
 * IG-004 (P106 s3, lane E) — drive the island as ONE world, on the DEPLOYED template (the page drive's deploy:
 * `drive-pages.sh` assembles a copy of `templates/bot-garden` and deploys it to `$OUT/deploy`).
 *
 * Usage:
 *   node scripts/devtools/drive-ig004-island.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d] [--perf]
 *
 * --mode 2d (default) headless Chrome with no GPU: the renderer rule picks the flat island (no WebGL2 here).
 *   For each size (1368×912, 390×844) and each language (EN, FR), a fresh family, one player at 10–12:
 *   - the island before any win: her robot at home, every plot drawn, nothing watered on the tulips' plot;
 *   - AC3: the tulips WON the only way the brief allows — Teach (`control('rec')`), the pad keys, Play
 *     (`control('play')`); back on the island her robot is ON the tulips' plot and STEPPING (two reads of the robot's
 *     tile/facing differ), the stored family is v4 with the program and the robot pinned there; the tulips' card says
 *     the robot works there;
 *   - AC3: the stones' card (the path-stones request) opens the plot card, not the Workshop: "{b} is at work on
 *     “<the tulips' title>”" and "Bring {b} home"; home → the robot is at home, the plot card offers Go and help, the
 *     tulips STAY watered (every tulip of the plot drawn wet), the save says the plot kept its win and lost its program;
 *     Go and help opens the stones in the Workshop;
 *   - AC5: at 7–9, a fence round every plot the band cannot do, and a tap on one says why in one line (the request's
 *     islander and the block it needs), in the language, with no way in;
 *   - AC7 (once, 1368 EN, with a robot at work): the save code on Grown-ups is v4 and carries the pinned plot; pasted
 *     back through the Grown-ups box it restores the same family, and the island still shows the robot at work.
 *   - 0 console errors, 0 network errors.
 * --perf (with 2d): AC6 on the Mac — three robots working three plots (a family written into the store), CPU ×4
 *   (`Emulation.setCPUThrottlingRate` 4), the frame intervals of 20 s read with requestAnimationFrame; p95 reported
 *   whatever it is (the gate is ≤ 50 ms), with the robots' moves counted so the frames are frames of robots moving.
 * --mode 3d  Chrome with software GL (swiftshader): the island drawn by Garden 3D — one screenshot to look at, the
 *   islanders' bubbles in its overlay, her robot at work on its plot. A readout, not a gate (the tablet is AC6's 3D half).
 *
 * Every number a clause compares is read from the deployed project (the requests' plots, the island's home tile, the
 * words): nothing here hard-codes another lane's request.
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
const PERF = process.argv.includes('--perf');
if (!DIR || DIR.startsWith('--') || !PROJECT || !['2d', '3d'].includes(MODE)) {
  console.error('usage: drive-ig004-island.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d] [--perf]');
  process.exit(2);
}

// P108 IW-006: the save's version, read from the page's own encoder (Logic/Encode save code) — never a literal the next
// version has to find and bump (v4 → v5 reddened every clause that typed it).
const SAVE_V = (() => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', 'Logic', 'Encode save code', 'nodes.json'), 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  return Number(/var SAVE_VERSION = (\d+);/.exec(String(list.find((n) => n.type === 'JavaScriptFunction').parameters.functionScript))[1]);
})();
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says (never typed here) ──
function staticRows(component) {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  return JSON.parse(list.find((n) => n.type === 'Static Data').parameters.json);
}
function functionScript(component) {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  return String(list.find((n) => n.type === 'JavaScriptFunction').parameters.functionScript);
}
const WORD_ROWS = staticRows('Data/Words');
const WORDS = { en: {}, fr: {} };
for (const r of WORD_ROWS) {
  WORDS.en[r.key] = r.en;
  WORDS.fr[r.key] = r.fr;
}
const w = (lang, key, name = 'Pip') => String(WORDS[lang][key] || '').split('{b}').join(name);
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(String(v)), text);
const REQUESTS = staticRows('Data/Requests');
const byTitle = (key) => REQUESTS.find((r) => r.copyKeys && r.copyKeys.title === key);
const TULIPS = byTitle('rqTulipsTitle');
const STONES = byTitle('rqStonesTitle');
const PATH = byTitle('rqPathTitle');
// P106 IG-005: the robot a request needs (Pip when it names none), and ANOTHER of the tulips' robot's jobs at 7–9 — the
// plot whose card says "at work on the tulips" (the stones need another robot: they are padlocked until it is lent).
const needsOf = (r) => r.needs || 'pip';
const ANOTHER = REQUESTS.find((r) => Number(r.band) === 1 && r.id !== TULIPS.id && needsOf(r) === needsOf(TULIPS));
const WORLD_SCRIPT = functionScript('Logic/Island world');
const HOME = JSON.parse(/var HOME = (\{[^}]*\});/.exec(WORLD_SCRIPT)[1]);
const PLOT_W = Number(/var PW = (\d+)/.exec(WORLD_SCRIPT)[1]);
const PLOT_H = Number(/PH = (\d+);/.exec(WORLD_SCRIPT)[1]);
const titleOf = (lang, r) => w(lang, r.copyKeys.title);
const islanderWord = (who) => ({ mamie: 'islMamie', sami: 'islSami', biscuit: 'islBiscuit' })[who];
/** A program as the pad presses that record it: a repeat laid out n times. */
const layOut = (blocks) => blocks.flatMap((b) => (b.t === 'repeat' ? Array.from({ length: Number(b.n) || 0 }, () => layOut(b.body || [])).flat() : [b.t]));
const TULIP_PRESSES = layOut(TULIPS.referenceProgram);
const TULIP_COUNT = TULIPS.things.filter((t) => t.kind === 'tulip').length;
const inPlot = (x, y, r) => x >= r.plot.x && x < r.plot.x + PLOT_W && y >= r.plot.y && y < r.plot.y + PLOT_H;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: () => ({ ok: true, text: 'Thank you, Mamie Rose! (stub)', ms: 5 })
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
  const path0 = () => evaluate('location.pathname');
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
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const typeInto = async (finder, value) => {
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
  };
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  // 🔴 The brief's §4.3: a drive that wins a request does it ONLY as Teach → pad keys (or palette) → Play.
  const control = (icon) => tap(first(`.bg-controls .bg-i-${icon}`), `control ${icon}`);
  const key = (op) => tap(first(`.bg-pad .bg-key-${op}`), `key ${op}`);
  const stored = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { const v = JSON.parse(localStorage.getItem(k)); return v.model || null; } catch (e) { return null; } })()`);
  const activeIsland = async () => {
    const m = await stored();
    const a = m && m.profiles.find((p) => p.id === m.island.activeId);
    return { v: m && m.v, island: a ? a.island : null };
  };
  /** The robots drawn on the flat island: their tile, facing, and name. */
  const bots = () => evaluate(`[...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => ({ x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), d: Number(b.getAttribute('data-d')), name: (b.querySelector('.gd-name') || {}).innerText || '' }))`);
  /** Every tulip drawn on a request's plot, wet or dry (the kit's classes: what a child sees). */
  const tulipsOn = (r) => evaluate(`[...document.querySelectorAll('.bg-isle .gd-cell')].filter((c) => { const x = Number(c.getAttribute('data-x')), y = Number(c.getAttribute('data-y')); return x >= ${r.plot.x} && x < ${r.plot.x + PLOT_W} && y >= ${r.plot.y} && y < ${r.plot.y + PLOT_H}; }).map((c) => c.querySelector('.gd-tulip')).filter(Boolean).map((t) => (t.getAttribute('class').includes('gd-wet') ? 'wet' : 'dry'))`);
  const CARD = `(() => { const c = document.querySelector('.bg-plot-card'); if (!c || c.offsetParent === null) return { up: false }; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; return { up: true, who: t('.bg-plot-who'), title: t('.bg-plot-title'), line: t('.bg-plot-line'), open: t('.bg-plot-open'), home: t('.bg-bring-home') }; })()`;
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
    await tap(byText('.bg-seg-btn', '10–12'), `band 10–12 (${tag})`);
    await tap(byText('button.bg-btn', w(lang, 'create')), `create (${tag})`);
    const at = await until('location.pathname', (p) => p === '/island');
    await wait(900);
    return at === '/island';
  };

  if (MODE === '3d') {
    // ── One 3D look at the island (software GL), a robot at work on the tulips ──
    await page.setViewport({ name: '1368', width: 1368, height: 912, mobile: false });
    const ok = await freshFamily('3d', 'en');
    check('3D: a new player lands on the island', ok, await path0());
    // A robot at work, written as the game writes it (the tulips' reference program pinned): the 3D look is the point.
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.done = [${JSON.stringify(TULIPS.id)}]; a.island.plots = { ${JSON.stringify(TULIPS.id)}: { program: ${JSON.stringify(TULIPS.referenceProgram)}, robotId: 'r1', wonAt: 1 } }; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    const gl = await until(`(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); return e ? { w: e.getAttribute('data-w'), h: e.getAttribute('data-h'), meshes: e.getAttribute('data-meshes'), camera: e.getAttribute('data-camera') } : null; })()`, (r) => !!r && !!r.meshes, 15000);
    readings.gl = gl;
    await wait(4000);
    const says = await evaluate(`[...document.querySelectorAll('.bg-isle .gd3-isl-say')].map((e) => [e.getAttribute('data-who'), e.innerText])`);
    const name = await evaluate(`[...document.querySelectorAll('.bg-isle .gd3-name')].map((e) => [e.innerText, e.getAttribute('data-x'), e.getAttribute('data-y')])`);
    const renderer = await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { return JSON.parse(localStorage.getItem(k)).renderer || null; } catch (e) { return null; } })()`);
    readings.gl3d = { says, name, renderer };
    await shot('ig004-3d-island-1368');
    check('3D: the island is drawn by Garden 3D (swiftshader), the whole island framed, 46 wide as the requests need', !!gl && Number(gl.w) >= Math.max(...REQUESTS.map((r) => r.plot.x + PLOT_W)) && gl.camera === 'island' && Number(gl.meshes) > 0, gl);
    check('3D: the islanders say their requests in the overlay (three bubbles)', says.length === 3 && says.every(([, t]) => t.length > 0), says);
    check('3D: her robot is named on the island, on the tulips’ plot', name.length === 1 && inPlot(Number(name[0][1]), Number(name[0][2]), TULIPS), name);
    check('3D: 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    return finish();
  }

  const VIEWPORTS = [
    { name: '1368', width: 1368, height: 912, mobile: false },
    { name: '390', width: 390, height: 844, mobile: true }
  ];
  for (const vp of VIEWPORTS) {
    for (const lang of ['en', 'fr']) {
      const tag = `${vp.name}-${lang}`;
      const shots = tag === '1368-en' || tag === '390-fr';
      await page.setViewport(vp);
      if (!(await freshFamily(tag, lang))) {
        check(`${tag}: a new player lands on the island`, false, await path0());
        continue;
      }
      // The island before any win: her robot at home, the tulips' plot dry.
      const before = await bots();
      const dry0 = await tulipsOn(TULIPS);
      check(`IG-004 ${tag}: before any win her robot is at home (${HOME.x},${HOME.y}), and the tulips’ plot is drawn with its ${TULIP_COUNT} tulips dry`, before.length === 1 && before[0].x === HOME.x && before[0].y === HOME.y && dry0.length === TULIP_COUNT && dry0.every((t) => t === 'dry'), { before, dry0 });
      if (shots) await shot(`ig004-${tag}-01-island`);

      // AC3: win the tulips — Teach, the pad, Play (the brief's only way).
      await tap(byText('.bg-quest', titleOf(lang, TULIPS)), `the tulips (${tag})`);
      await until('location.pathname', (p) => p === '/workshop');
      await wait(900);
      await control('rec');
      await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean, 4000);
      for (const op of TULIP_PRESSES) await key(op);
      await control('play');
      const won = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 40000);
      check(`IG-004 AC3 ${tag}: the tulips won (Teach, ${TULIP_PRESSES.length} pad presses, Play)`, won, won);
      if (!won) continue;
      await tap(byText('.bg-win-card button', w(lang, 'winIsland')), 'back to the island');
      await until('location.pathname', (p) => p === '/island');
      await wait(1500);
      const onPlot = (list) => list.length === 1 && inPlot(list[0].x, list[0].y, TULIPS);
      // P108 IW-006 (lane E): the plot won in the Workshop starts DONE — her robot waits at home on it, the tulips drawn
      // watered, the held plot waiting — until wear reopens the job. The wear is written into the save (one tulip a drink
      // short, as the island's own wear leaves it) and the island opened again: then the robot is seen stepping.
      const a0 = await bots();
      const wet0 = await tulipsOn(TULIPS);
      const held0 = await evaluate(`(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live ? s.live[${JSON.stringify(TULIPS.id)}] : null; return c ? c.phase : null; })()`);
      readings[`startsDone-${tag}`] = { a0, wet0, held0 };
      check(`IG-004 AC3 ${tag} (IW-006): the tulips won, her robot waits on their plot with the job done — its ${TULIP_COUNT} tulips drawn watered, the held plot waiting`, onPlot(a0) && wet0.length === TULIP_COUNT && wet0.every((t) => t === 'wet') && held0 === 'wait', readings[`startsDone-${tag}`]);
      await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); const lv = a.island.plots[${JSON.stringify(TULIPS.id)}].live; const t = lv.things.find((x) => x.kind === 'tulip'); t.have = 2; t.watered = false; localStorage.setItem(k, JSON.stringify(v)); })()`);
      await page.navigate('/island');
      await wait(1500);
      // The robot is ON the tulips' plot, stepping: two reads apart differ, both on the plot.
      const a = await bots();
      await wait(2300);
      const b = await bots();
      readings[`stepping-${tag}`] = { a, b };
      check(`IG-004 AC3 ${tag}: her robot is on the tulips’ plot and stepping (two reads 2.3 s apart differ)`, onPlot(a) && onPlot(b) && JSON.stringify(a) !== JSON.stringify(b), { a, b, plot: TULIPS.plot });
      if (shots) await shot(`ig004-${tag}-02-robot-at-work`);
      // Find my robots (the flat island): the robot scrolled into the island's own box (a phone shows part of it) and ringed.
      await tap(first('.bg-isle-find'), `find my robots (${tag})`);
      await wait(600);
      const found = await evaluate(`(() => { const box = document.querySelector('.bg-isle-scroll'); const bot = box && box.querySelector('.gd-bot'); if (!bot) return null; const a = box.getBoundingClientRect(), b = bot.getBoundingClientRect(); const cx = b.left + b.width / 2, cy = b.top + b.height / 2; const at = document.elementFromPoint(cx, cy); return { inBox: cx >= a.left && cx <= a.right && cy >= a.top && cy <= a.bottom, ringed: box.classList.contains('bg-isle-found'), onTop: !!at && (at.closest('.bg-isle') !== null) && !at.closest('.bg-isle-find, .bg-isle-tap'), scrollLeft: box.scrollLeft }; })()`);
      readings[`find-${tag}`] = found;
      check(`IG-004 ${tag}: "${w(lang, 'ig4Find')}" brings her robot into the island's view (nothing of the page over it) and rings it`, !!found && found.inBox && found.ringed && found.onTop, found);
      if (shots) await shot(`ig004-${tag}-02b-found`);
      const saved = await activeIsland();
      const plot = saved.island && saved.island.plots ? saved.island.plots[TULIPS.id] : null;
      check(`IG-004 AC3 ${tag}: the save is v${SAVE_V} and the tulips’ plot keeps the program that won and the robot pinned there`, saved.v === SAVE_V && !!plot && Array.isArray(plot.program) && plot.program.length > 0 && plot.robotId === 'r1', { v: saved.v, plot });
      const tulipsCard = await evaluate(`(() => { const c = ${byText('.bg-quest', titleOf(lang, TULIPS))}; return c ? c.innerText : null; })()`);
      check(`IG-004 AC3 ${tag}: the tulips’ card says done and that the robot works there`, !!tulipsCard && tulipsCard.includes(w(lang, 'done')) && tulipsCard.includes(w(lang, 'ig4Working')), tulipsCard);

      if (tag === '1368-en') {
        // AC7: the save code round-trips through the Grown-ups box, the pinned plot with it.
        await tab(3);
        await until('location.pathname', (p) => p === '/grown-ups');
        await wait(1000);
        const code = await evaluate(`(() => { const e = document.querySelector('.bg-code'); return e ? e.innerText.trim() : ''; })()`);
        let packed = null;
        try {
          packed = JSON.parse(Buffer.from(code.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        } catch {
          packed = null;
        }
        const row = packed && (packed.p.find((r) => r[0] === packed.a) || packed.p[0]);
        const pinnedRow = row && Array.isArray(row[13]) ? row[13].find((p) => p[0] === TULIPS.id) : null;
        check(`IG-004 AC7: the Grown-ups save code is v${SAVE_V} and carries the tulips’ plot, its program and its robot`, !!packed && packed.v === SAVE_V && !!pinnedRow && Array.isArray(pinnedRow[1]) && pinnedRow[1].length > 0 && pinnedRow[2] === 'r1', { v: packed && packed.v, pinnedRow });
        const beforePaste = await stored();
        const pasteBox = `(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`;
        await typeInto(pasteBox, code);
        await tap(first('.bg-paste-go'), 'replace the islands (the same code)');
        const said = await until('document.body.innerText', (t) => t.includes(w('en', 'saveCodeDone')), 4000);
        const afterPaste = await stored();
        const strip = (m) => m && JSON.stringify(m.profiles.map((p) => ({ id: p.id, name: p.name, robot: p.robot, done: p.island.done, plots: p.island.plots, robots: p.island.robots, hats: p.hats, stickers: p.stickers })));
        check('IG-004 AC7: pasted back through the Grown-ups box, the code restores the same family (plots, robots, done, hats, stickers)', said.includes(w('en', 'saveCodeDone')) && !!afterPaste && afterPaste.v === SAVE_V && strip(afterPaste) === strip(beforePaste), { before: strip(beforePaste), after: strip(afterPaste) });
        await tab(0);
        await until('location.pathname', (p) => p === '/island');
        await wait(1500);
        const again = await bots();
        check('IG-004 AC7: … and the island still shows her robot at work on the tulips’ plot', onPlot(again), again);
      }

      // AC3: another of the robot's jobs while it works the tulips → the plot card says so and offers home. (IG-005: was the
      // stones; they need another robot now, so their card is a padlock — drive-ig005-robots.js grades that.)
      await tap(byText('.bg-quest', titleOf(lang, ANOTHER)), `${ANOTHER.id} (${tag})`);
      await wait(700);
      const stay = await path0();
      const blocked = await until(CARD, (c) => c.up, 3000);
      readings[`blocked-${tag}`] = blocked;
      const atWork = fill(w(lang, 'ig4AtWork'), { plot: titleOf(lang, TULIPS) });
      check(`IG-004 AC3 ${tag}: ${ANOTHER.id}’s card (the same robot’s job) while the robot works the tulips stays on the island and says "${atWork}"`, stay === '/island' && blocked.up && blocked.line === atWork && blocked.line.includes(titleOf(lang, TULIPS)), { stay, blocked, want: atWork });
      check(`IG-004 AC3 ${tag}: … and offers "${w(lang, 'ig4Home')}" (no way in yet)`, blocked.home === w(lang, 'ig4Home') && blocked.open === null, blocked);
      if (shots) await shot(`ig004-${tag}-03-at-work`);
      await tap(first('.bg-bring-home'), `bring Pip home (${tag})`);
      const freed = await until(CARD, (c) => c.up && !!c.open, 4000);
      await wait(900);
      const home = await bots();
      const wet = await tulipsOn(TULIPS);
      const saved2 = await activeIsland();
      const plot2 = saved2.island && saved2.island.plots ? saved2.island.plots[TULIPS.id] : null;
      readings[`home-${tag}`] = { freed, home, wet, plot2 };
      check(`IG-004 AC3 ${tag}: brought home — the robot is at home (${HOME.x},${HOME.y}) and the card offers "${w(lang, 'ig4Open')}"`, home.length === 1 && home[0].x === HOME.x && home[0].y === HOME.y && freed.open === w(lang, 'ig4Open') && freed.home === null, { home, freed });
      check(`IG-004 AC3 ${tag}: … the tulips STAY watered (all ${TULIP_COUNT} drawn wet on their plot) and the plot keeps its win without a program`, wet.length === TULIP_COUNT && wet.every((t) => t === 'wet') && !!plot2 && plot2.program === null && plot2.robotId === '' && saved2.island.done.includes(TULIPS.id), { wet, plot2 });
      if (shots) await shot(`ig004-${tag}-04-home`);
      await tap(first('.bg-plot-open'), `Go and help (${ANOTHER.id}, ${tag})`);
      const ws = await until(`(() => { const h = [...document.querySelectorAll('h1')].find((e) => e.offsetParent !== null); return { path: location.pathname, title: h ? h.innerText : '' }; })()`, (r) => r.path === '/workshop' && r.title.length > 0, 5000);
      check(`IG-004 ${tag}: Go and help opens ${ANOTHER.id} in the Workshop`, ws.path === '/workshop' && ws.title.includes(titleOf(lang, ANOTHER)), ws);

      // AC5: at 7–9, the plots the band cannot do are fenced; a tap says why, in one line, in the language.
      await tab(0);
      await until('location.pathname', (p) => p === '/island');
      await wait(700);
      await seg('7–9');
      await wait(1200);
      // IG-005: and every plot whose robot she has not been lent (this kid has Pip only).
      const locked = REQUESTS.filter((r) => Number(r.band) === 2 || needsOf(r) !== 'pip');
      const fences = await evaluate(`[...document.querySelectorAll('.bg-isle .gd-fence')].map((f) => f.getAttribute('data-fence'))`);
      const padlocks = await evaluate(`document.querySelectorAll('.bg-isle .gd-padlock').length`);
      check(`IG-004 AC5 ${tag}: at 7–9 every plot the band cannot do or her robots cannot (${locked.length}) is fenced and padlocked`, fences.length === locked.length && padlocks === locked.length && locked.every((r) => fences.includes(`${r.plot.x},${r.plot.y},${PLOT_W},${PLOT_H}`)), { fences, padlocks });
      const lockedReq = locked.find((r) => Number(r.band) === 2);
      await tap(cellOf(lockedReq.plot.x + 1, lockedReq.plot.y + 1), `a locked plot (${lockedReq.id}, ${tag})`);
      const why = await until(CARD, (c) => c.up, 3000);
      const reason = fill(w(lang, 'ig4Locked'), { who: w(lang, islanderWord(lockedReq.islander)), trick: w(lang, lockedReq.copyKeys.blurb) });
      readings[`locked-${tag}`] = why;
      check(`IG-004 AC5 ${tag}: a tap on a locked plot says why in one line — "${reason}" — with no way in`, why.up && why.line === reason && !why.line.includes('\n') && why.open === null && why.home === null, { why, want: reason });
      if (shots) await shot(`ig004-${tag}-05-locked`);
      await seg('10–12');
      await wait(700);
      check(`IG-004 ${tag}: 0 console errors, 0 network errors so far`, page.consoleErrors.length === 0 && page.networkErrors.length === 0, { console: page.consoleErrors.slice(0, 5), network: page.networkErrors.slice(0, 5) });
    }
  }

  // ── AC1 on the page: a v3 save code from P105 (the engine gate's fixture, written by the v3 encoder) pasted into the
  // Grown-ups box restores every profile, done request, hat and sticker — stored as v4 at once. ──
  {
    const fx = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'packages', 'noodl-mcp', 'tests', 'fixtures', 'ig004-v3-saves.json'), 'utf8')).band2;
    await page.setViewport(VIEWPORTS[0]);
    await page.navigate('/grown-ups');
    await wait(1200);
    const pasteBox = `(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`;
    await typeInto(pasteBox, fx.code);
    await tap(first('.bg-paste-go'), 'replace the islands (a P105 v3 code)');
    await until('document.body.innerText', (t) => t.includes(w('en', 'saveCodeDone')) || t.includes(w('fr', 'saveCodeDone')), 4000);
    await wait(600);
    const m = await stored();
    const got = m ? m.profiles.map((p) => ({ id: p.id, name: p.name, band: p.band, robot: p.robot.name, done: p.island.done, hats: p.hats, stickers: p.stickers, plots: p.island.plots, placed: 'placed' in p.island })) : null;
    const want = fx.profiles.map((p) => ({ id: p.id, name: p.name, band: p.band, robot: p.robot.name, done: p.island.done, hats: p.hats, stickers: p.stickers, plots: {}, placed: false }));
    check(`IG-004 AC1 (the page): a P105 v3 code pasted in the Grown-ups box restores every profile, done request, hat and sticker, stored as v${SAVE_V} (placed dropped)`, !!m && m.v === SAVE_V && JSON.stringify(got) === JSON.stringify(want), { v: m && m.v, got, want });
  }

  if (PERF) {
    // ── AC6 (the Mac half): three robots at work, the flat island, CPU ×4, 20 s of frames ──
    await page.setViewport(VIEWPORTS[0]);
    await page.navigate('/island');
    await wait(900);
    const three = [TULIPS, STONES, PATH];
    // IG-005: each plot's robot is of the kind it needs (the stones' is lent; a second Pip is a row of Pip's kind).
    const PERF_ROBOTS = three.map((r, i) => (i === 0 ? { id: 'r1' } : { id: needsOf(r) === 'pip' ? 'r' + (i + 1) : needsOf(r), kind: needsOf(r) }));
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId);
      a.island.robots = ${JSON.stringify(PERF_ROBOTS)};
      a.island.done = ${JSON.stringify(three.map((r) => r.id))};
      a.island.plots = { ${three.map((r, i) => `${JSON.stringify(r.id)}: { program: ${JSON.stringify(r.referenceProgram)}, robotId: ${JSON.stringify(PERF_ROBOTS[i].id)}, wonAt: ${i + 1} }`).join(', ')} };
      localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    await wait(2500);
    const working = await bots();
    check('IG-004 AC6: three robots at work, each on its own plot', working.length === 3 && three.every((r) => working.some((x) => inPlot(x.x, x.y, r))), working);
    // The throttle, measured (not assumed): the same fixed loop in the page before and after it.
    const LOOP = `(() => { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return performance.now() - t + (x < 0 ? 1 : 0); })()`;
    const loop1 = await evaluate(LOOP);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await wait(1500);
    const loop4 = await evaluate(LOOP);
    readings.throttle = { loop1, loop4, ratio: loop4 / loop1 };
    check(`IG-004 AC6: the CPU throttle is on (a fixed loop ${loop1.toFixed(0)} ms → ${loop4.toFixed(0)} ms, ×${(loop4 / loop1).toFixed(1)})`, loop4 / loop1 > 2.5, readings.throttle);
    const perf = await evaluate(`new Promise((resolve) => {
      const frames = []; const moves = { n: 0 }; let last = performance.now(); const t0 = last;
      const seen = () => [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => b.getAttribute('data-x') + ',' + b.getAttribute('data-y') + ',' + b.getAttribute('data-d')).join('|');
      let prev = seen();
      const obs = new MutationObserver(() => { const now = seen(); if (now !== prev) { moves.n++; prev = now; } });
      obs.observe(document.querySelector('.bg-isle'), { attributes: true, subtree: true, attributeFilter: ['data-x', 'data-y', 'data-d'] });
      const tick = (t) => { frames.push(t - last); last = t; if (t - t0 < 20000) requestAnimationFrame(tick); else { obs.disconnect(); const s = frames.slice(1).sort((a, b) => a - b); resolve({ frames: s.length, p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)], max: s[s.length - 1], over25: s.filter((v) => v > 25).length, over50: s.filter((v) => v > 50).length, moves: moves.n, hidden: document.hidden }); } };
      requestAnimationFrame(tick);
    })`);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    readings.ac6 = perf;
    console.log(`IG-004 AC6 readout: CPU ×4, 2D island, 3 robots: ${JSON.stringify(perf)}`);
    check(`IG-004 AC6 (the Mac, 2D, CPU ×4, three robots animating): p95 frame ${perf && perf.p95 !== undefined ? perf.p95.toFixed(1) : '?'} ms ≤ 50 ms (${perf ? perf.frames : 0} frames, ${perf ? perf.moves : 0} robot moves in 20 s)`, !!perf && perf.frames > 100 && perf.moves >= 20 && perf.p95 <= 50, perf);
    await shot('ig004-ac6-three-robots');
  }
  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return finish();

  function finish() {
    return { dir: DIR, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
  }
})
  .then((out) => {
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} passed${failed ? `, ${failed} FAILED` : ''}`);
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2));
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
