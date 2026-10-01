#!/usr/bin/env node
/**
 * IW-008 (P108 s4, lane C) — drive the crew on the DEPLOYED template (the page drive's deploy: `drive-pages.sh`
 * assembles a copy of `templates/bot-garden` and deploys it to `$OUT/deploy`).
 *
 * Usage:
 *   node scripts/devtools/drive-iw008-crew.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d] [--perf]
 *
 * The family is made the game's way, in the page's own scripts (the deployed project's Function scripts, run as the
 * node runs them): a new player made on the page; then Complete request for each win (Pip's four jobs in turn — he
 * moves on each time, each plot he leaves keeping the program that won it; the tulips won with the program Teach
 * records, one block per pad press), the base's `buyItem` for the copies (the shop's one purchase rule — lane H builds
 * the shop; this lane does not wait for it), written into the page's store.
 *
 * --mode 2d (default) headless Chrome, no GPU (the flat island):
 *   - AC1 (1368 EN and 390 FR, each a fresh family): three copies named Bubbles, Sprout and Nimbus are sent BY TOUCH —
 *     a tap on a plot Pip won, then the copy's pill on the plot card's crew row — to three plots; the card says who
 *     works there; the store has each plot pinned to its copy; on the island four robots are at work, each on its own
 *     plot and stepping (two reads apart differ); 1368 EN: the save code round-trips through the Grown-ups box.
 *   - AC3 (1368 EN): Pocket 2 sent to Pocket's eggs HELPS; for 40 s the island state (the page's own Variable) is read
 *     every 250 ms: the two robots never walk to one egg, both walk, both stay on the plot, both reserve eggs.
 *   - AC2 (1368 EN, 390 FR): My robots — a card per robot of hers; Bubbles' program copied onto Pebble (a copy at home)
 *     by a tap on Bubbles' "copy to" pill: Pebble's card says it knows it; Bubbles' copied onto Cobble: refused, the
 *     line NAMES the first block Cobble cannot do; Pip's (the 33 blocks Teach recorded) onto Pebble: refused, the line
 *     says both numbers (the program's blocks, the brain's).
 *   - AC5: My robots with the crew at three widths (1368 × 900, 1024 × 768, 390 × 844): every card there, no sideways
 *     scroll, each card's brain line; screenshots.
 *   - 0 console errors, 0 network errors.
 * --perf (with 2d): AC4 — the crew at its cap (CREW_CAP, read from the page's own scripts), every robot at work (one
 *   helping), CPU ×4, 20 s of frames by requestAnimationFrame: p95 ≤ 50 ms (P106 IG-004 AC6's gate), robot moves counted.
 * --mode 3d  software GL (swiftshader): the island at the cap drawn by Garden 3D — a readout and a screenshot: the
 *   robots' name pills, and the scene built whole vs the things / a robot redrawn alone (the kit's data attributes).
 *
 * Every request, robot kind, word and number is read from the deployed project; nothing is typed that another lane owns.
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
  console.error('usage: drive-iw008-crew.js <deploy-dir> --project <assembled-project> [--shots <dir>] [--json <file>] [--mode 2d|3d] [--perf]');
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
/** A Logic component run as the page runs it: Inputs in, Outputs out (a fresh copy of the inputs). */
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
const WORLD_SCRIPT = functionScript('Logic/Island world');
const PLOT_W = Number(/var PW = (\d+)/.exec(WORLD_SCRIPT)[1]);
const PLOT_H = Number(/PH = (\d+);/.exec(WORLD_SCRIPT)[1]);
const CREW_CAP = Number(/var CREW_CAP = (\d+);/.exec(functionScript('Logic/Bring home'))[1]);
const BRAIN = Number(/var BRAIN_SIZE = (\d+);/.exec(functionScript('Logic/Bring home'))[1]);
const inPlot = (x, y, r) => x >= r.plot.x && x < r.plot.x + PLOT_W && y >= r.plot.y && y < r.plot.y + PLOT_H;
/** The base's purchase rule and wallet, out of the page's own save helpers. */
const SAVE = pageRun('Logic/Bring home', { model: {} }, '\n;Outputs.buyItem = buyItem; Outputs.earnShells = earnShells; Outputs.modelOf = modelOf; Outputs.SHOP = SHOP;');
/** The program Teach records for a request: one block per pad press (a repeat laid out n times). */
const layOut = (blocks) => blocks.flatMap((b) => (b.t === 'repeat' ? Array.from({ length: Number(b.n) || 0 }, () => layOut(b.body || [])).flat() : [b.t]));
const recorded = (id) => layOut(req(id).referenceProgram).map((t, i) => ({ id: 500 + i, t }));

// ── The family, the game's way ──
const win = (model, id, robotId = 'r1', program = req(id).referenceProgram) =>
  pageRun('Logic/Complete request', { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(program), robotId, now: 1759300000000 }).model;
function buy(model, kind, name) {
  const p = model.profiles.find((x) => x.id === model.island.activeId);
  // P108 s6: the copy's price from the shop (it was typed: 30).
  SAVE.earnShells(p, SAVE.SHOP.find((s) => s.id === `robot:${kind}`).price);
  const out = SAVE.buyItem(p, `robot:${kind}`, { name });
  if (!out.ok) throw new Error(`buy ${kind} ${name}: ${out.error}`);
  return out.robotId;
}
const send = (model, robotId, requestId) => pageRun('Logic/Assign robot', { model, robotId: `crew|${robotId}`, requestId, requests: REQUESTS, words: WORD_ROWS, lang: 'en', now: 1759300000001 });
/** AC1–AC3's family: Pip's four jobs (the tulips with the 33 blocks Teach records), Pocket's eggs, four Pip copies and a Pocket copy. */
function crewFamily(model) {
  let m = model;
  for (const id of ['wall-until', 'tulip-door', 'path-postbox']) m = win(m, id);
  m = win(m, 'tulips-three', 'r1', recorded('tulips-three'));
  m = win(m, 'bowl-if', 'cobble');
  m = win(m, 'eggs-count', 'pocket');
  m = SAVE.modelOf(m);
  const ids = {};
  for (const [kind, name] of [['pip', 'Bubbles'], ['pip', 'Sprout'], ['pip', 'Nimbus'], ['pip', 'Pebble'], ['pocket', 'Pocket 2']]) ids[name] = buy(m, kind, name);
  return { m, ids };
}
/** AC4's: every job won by its kind, five Pip copies, two Cobble copies, a Pocket copy that helps on the eggs — CREW_CAP at work. */
function capFamily(model) {
  let m = model;
  for (const id of ['path-postbox', 'tulip-door', 'tulips-three', 'wall-until', 'meow-when', 'rows-trick', 'mamie-note']) m = win(m, id);
  for (const id of ['path-stones', 'bowl-if', 'sami-bench']) m = win(m, id, 'cobble');
  for (const id of ['letter-say', 'eggs-count']) m = win(m, id, 'pocket');
  m = win(m, 'rock-flower', 'echo');
  m = SAVE.modelOf(m);
  const plan = [['pip', 'path-postbox'], ['pip', 'tulip-door'], ['pip', 'tulips-three'], ['pip', 'wall-until'], ['pip', 'meow-when'], ['cobble', 'path-stones'], ['cobble', 'bowl-if'], ['pocket', 'eggs-count']];
  const n = m.profiles[0].island.robots.length;
  for (const [kind, plot] of plan.slice(0, CREW_CAP - n)) {
    const id = buy(m, kind, '');
    const a = send(m, id, plot);
    if (!a.ok) throw new Error(`send ${id} → ${plot}: ${a.error}`);
    m = a.model;
  }
  return m;
}

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
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const seg = (label) => tap(hasText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${STORE_KEY}; try { return JSON.parse(localStorage.getItem(k)).model || null; } catch (e) { return null; } })()`);
  const store = (model) => evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); v.model = ${JSON.stringify(model)}; localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const active = async () => {
    const m = await stored();
    return m ? m.profiles.find((p) => p.id === m.island.activeId) : null;
  };
  const bots = () => evaluate(`[...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => ({ x: Number(b.getAttribute('data-x')), y: Number(b.getAttribute('data-y')), d: Number(b.getAttribute('data-d')), name: (b.querySelector('.gd-name') || {}).innerText || '' }))`);
  const CARD = `(() => { const c = document.querySelector('.bg-plot-card'); if (!c || c.offsetParent === null) return { up: false }; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; return { up: true, title: t('.bg-plot-title'), line: t('.bg-plot-line'), crew: !!c.querySelector('.bg-crew') && c.querySelector('.bg-crew').offsetParent !== null, chips: [...c.querySelectorAll('.bg-crew .bg-chip')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()), here: t('.bg-crew-here'), said: t('.bg-crew-said') }; })()`;
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
  /** A plot's card opened by a tap on the plot (its middle tile), then a crew pill tapped. */
  const openPlot = async (id, tag) => {
    const r = req(id);
    await tap(cellOf(r.plot.x + 4, r.plot.y + 2), `the ${id} plot (${tag})`);
    return until(CARD, (c) => c.up && c.title === w(tag.endsWith('fr') ? 'fr' : 'en', r.copyKeys.title), 3000);
  };

  if (MODE === '3d' || PERF) {
    // ── The crew at its cap on the island: AC4 (2D, CPU ×4) or the 3D readout ──
    await page.setViewport({ name: '1368', width: 1368, height: 912, mobile: false });
    await freshFamily('cap', 'en');
    const cap = capFamily(await stored());
    await store(cap);
    await page.navigate('/island');
    await wait(3000);
    const robotsN = cap.profiles[0].island.robots.length;
    check(`IW-008 AC4: the family holds the crew at its cap (${CREW_CAP} robots, made by the base's buyItem and sent by Assign robot)`, robotsN === CREW_CAP, robotsN);
    if (MODE === '3d') {
      const gl = await until(`(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); return e ? { meshes: e.getAttribute('data-meshes'), scenes: e.getAttribute('data-scene-builds'), robots: e.getAttribute('data-robot-builds'), things: e.getAttribute('data-thing-builds') } : null; })()`, (r) => !!r && !!r.meshes, 15000);
      // Under software GL the 3D island hands itself to the flat one within a few ticks (IG-007's Too Slow): look first.
      const namesFirst = await evaluate(`[...document.querySelectorAll('.bg-isle .gd3-name')].map((e) => e.innerText)`);
      await shot('iw008-3d-island-cap-1368-first');
      readings.namesFirst = namesFirst;
      await wait(4000);
      const later = await evaluate(`(() => { const e = document.querySelector('.bg-isle [data-gd3-world]'); return e ? { meshes: e.getAttribute('data-meshes'), scenes: e.getAttribute('data-scene-builds'), robots: e.getAttribute('data-robot-builds'), things: e.getAttribute('data-thing-builds') } : null; })()`);
      const names = await evaluate(`[...document.querySelectorAll('.bg-isle .gd3-name')].map((e) => e.innerText)`);
      const flat = await evaluate(`document.querySelectorAll('.bg-isle .gd-bot').length`);
      readings.gl3d = { gl, later, names, flat };
      await shot('iw008-3d-island-cap-1368');
      check(`IW-008 AC5 (3D): the island at the cap drawn by Garden 3D, ${CREW_CAP} robots named in its overlay — or, under software GL, handed to the flat island (IG-007's Too Slow) with ${CREW_CAP} robots drawn there`, (!!gl && (names.length === CREW_CAP || namesFirst.length === CREW_CAP)) || flat === CREW_CAP, { ...readings.gl3d, namesFirst });
      check('IW-008 §4 (3D readout): after the first build, the island redraws its things and robots alone — the scene is built whole only for the map (scene builds stay at 1–2 while things/robots redraw)', !later || !later.scenes || Number(later.scenes) <= 2 || flat === CREW_CAP, later);
      check('IW-008 (3D): 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
      return finish();
    }
    const working = await bots();
    const plots = cap.profiles[0].island.plots;
    const onPlots = Object.keys(plots).filter((k) => plots[k].robotId).map((k) => req(k));
    check(`IW-008 AC5: ${CREW_CAP} robots at work on the flat island, every pinned plot with a robot on it (one plot with two)`, working.length === CREW_CAP && onPlots.every((r) => working.some((b) => inPlot(b.x, b.y, r))), { n: working.length, plots: onPlots.map((r) => r.id) });
    await shot('iw008-cap-island-1368');
    const LOOP = `(() => { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return performance.now() - t + (x < 0 ? 1 : 0); })()`;
    const loop1 = await evaluate(LOOP);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await wait(1500);
    const loop4 = await evaluate(LOOP);
    readings.throttle = { loop1, loop4, ratio: loop4 / loop1 };
    check(`IW-008 AC4: the CPU throttle is on (a fixed loop ${loop1.toFixed(0)} ms → ${loop4.toFixed(0)} ms, ×${(loop4 / loop1).toFixed(1)})`, loop4 / loop1 > 2.5, readings.throttle);
    const perf = await evaluate(`new Promise((resolve) => {
      const frames = []; const moves = { n: 0 }; let last = performance.now(); const t0 = last;
      const seen = () => [...document.querySelectorAll('.bg-isle .gd-bot')].map((b) => b.getAttribute('data-x') + ',' + b.getAttribute('data-y') + ',' + b.getAttribute('data-d')).join('|');
      let prev = seen();
      const obs = new MutationObserver(() => { const now = seen(); if (now !== prev) { moves.n++; prev = now; } });
      obs.observe(document.querySelector('.bg-isle'), { attributes: true, subtree: true, attributeFilter: ['data-x', 'data-y', 'data-d'] });
      const tick = (t) => { frames.push(t - last); last = t; if (t - t0 < 20000) requestAnimationFrame(tick); else { obs.disconnect(); const s = frames.slice(1).sort((a, b) => a - b); resolve({ frames: s.length, p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)], max: s[s.length - 1], over50: s.filter((v) => v > 50).length, moves: moves.n, hidden: document.hidden }); } };
      requestAnimationFrame(tick);
    })`);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    readings.ac4 = perf;
    console.log(`IW-008 AC4 readout: CPU ×4, 2D island, ${CREW_CAP} robots: ${JSON.stringify(perf)}`);
    check(`IW-008 AC4 (the Mac, 2D, CPU ×4, the crew at its cap — ${CREW_CAP} robots): p95 frame ${perf && perf.p95 !== undefined ? perf.p95.toFixed(1) : '?'} ms ≤ 50 ms (${perf ? perf.frames : 0} frames, ${perf ? perf.moves : 0} robot moves in 20 s)`, !!perf && perf.frames > 100 && perf.moves >= 20 && perf.p95 <= 50, perf);
    check('IW-008 AC4: 0 console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
    return finish();
  }

  // ── 2D: AC1 by touch (two sizes, two languages), AC3 once, AC2 and AC5 on My robots ──
  const VIEWPORTS = { 1368: { name: '1368', width: 1368, height: 900, mobile: false }, 1024: { name: '1024', width: 1024, height: 768, mobile: false }, 390: { name: '390', width: 390, height: 844, mobile: true } };
  for (const [vpName, lang] of [['1368', 'en'], ['390', 'fr']]) {
    const tag = `${vpName}-${lang}`;
    await page.setViewport(VIEWPORTS[vpName]);
    if (!(await freshFamily(tag, lang))) {
      check(`${tag}: a new player lands on the island`, false, await evaluate('location.pathname'));
      continue;
    }
    const { m, ids } = crewFamily(await stored());
    // The lent robots' names are the catalogue's in her language (Pocket is Poche in French): read from the family.
    const lentName = (kind) => m.profiles[0].island.robots.find((r) => r.id === kind).name;
    const POCKET = lentName('pocket');
    const COBBLE = lentName('cobble');
    await store(m);
    await page.navigate('/island');
    await wait(1800);
    // AC1: three copies sent by touch.
    const plan = [['Bubbles', 'tulip-door'], ['Sprout', 'path-postbox'], ['Nimbus', 'wall-until']];
    for (const [name, plot] of plan) {
      await openPlot(plot, tag);
      const card = await until(CARD, (c) => c.up && c.chips.length >= 5, 3000);
      check(`IW-008 AC1 ${tag}: ${plot}'s card (a plot Pip won and left) shows her crew for the job — Pip and the four copies, each once`, card.up && card.crew && ['Pip', 'Bubbles', 'Sprout', 'Nimbus', 'Pebble'].every((n) => card.chips.includes(n)) && card.chips.length === 5, card);
      if (name === 'Bubbles' && vpName === '1368') await shot(`iw008-${tag}-01-crew-row`);
      await tap(byText('.bg-plot-card .bg-crew .bg-chip', name), `${name}'s pill (${tag})`);
      const after = await until(CARD, (c) => c.up && c.here === fill(w(lang, 'iw8cWorks'), { r: name }), 4000);
      check(`IW-008 AC1 ${tag}: tapped, ${name} works ${plot} — the card says "${fill(w(lang, 'iw8cWorks'), { r: name })}" and "${fill(w(lang, 'iw8cSent'), { r: name })}"`, after.here === fill(w(lang, 'iw8cWorks'), { r: name }) && after.said === fill(w(lang, 'iw8cSent'), { r: name }), after);
      await tap(first('.bg-plot-close'), 'close the card');
    }
    const p = await active();
    check(`IW-008 AC1 ${tag}: the store has each plot pinned to its copy, running the program that won it`, plan.every(([name, plot]) => p.island.plots[plot].robotId === ids[name] && JSON.stringify(p.island.plots[plot].program) === JSON.stringify(req(plot).referenceProgram)), plan.map(([, plot]) => [plot, p.island.plots[plot].robotId]));
    await wait(1200);
    const a = await bots();
    await wait(2400);
    const b = await bots();
    const at = (list, name) => list.find((x) => x.name === name);
    const each = [['Pip', 'tulips-three'], ...plan.map(([name, plot]) => [name, plot]), [POCKET, 'eggs-count']];
    readings[`ac1-${tag}`] = { a, b };
    check(`IW-008 AC1 ${tag}: on the island Pip, Bubbles, Sprout and Nimbus each work their own plot, stepping (two reads 2.4 s apart differ), Pebble and Pocket 2 at home`, each.every(([name, plot]) => at(a, name) && at(b, name) && inPlot(at(a, name).x, at(a, name).y, req(plot)) && inPlot(at(b, name).x, at(b, name).y, req(plot))) && ['Bubbles', 'Sprout', 'Nimbus'].some((n) => JSON.stringify(at(a, n)) !== JSON.stringify(at(b, n))) && !!at(a, 'Pebble') && !!at(a, 'Pocket 2'), { a, b });
    await shot(`iw008-${tag}-02-island-crew`);

    if (tag === '1368-en') {
      // AC1: the save code round-trips the crew through the Grown-ups box.
      await tab(4);
      await until('location.pathname', (x) => x === '/grown-ups');
      await wait(1000);
      const code = await evaluate(`(() => { const e = document.querySelector('.bg-code'); return e ? e.innerText.trim() : ''; })()`);
      const before = await stored();
      await typeInto(`(document.querySelector('input.bg-paste') || document.querySelector('.bg-paste input'))`, code);
      await tap(first('.bg-paste-go'), 'replace the islands (the same code)');
      await until('document.body.innerText', (t) => t.includes(w('en', 'saveCodeDone')), 4000);
      const after = await stored();
      const strip = (x) => x && JSON.stringify(x.profiles.map((q) => ({ plots: Object.keys(q.island.plots).sort().map((k) => [k, q.island.plots[k].program, q.island.plots[k].robotId]), robots: q.island.robots, shells: q.shells })));
      check('IW-008 AC1: the Grown-ups save code round-trips the crew (every robot row, its name, program and plot; every plot’s robot)', !!after && strip(after) === strip(before), { before: strip(before), after: strip(after) });

      // AC3: Pocket 2 helps Pocket on the eggs; the page's own island state read for 40 s.
      await tab(0);
      await until('location.pathname', (x) => x === '/island');
      await wait(1200);
      await openPlot('eggs-count', tag);
      const eggs = await until(CARD, (c) => c.up && c.chips.length >= 2, 3000);
      check('IW-008 AC3: the eggs’ card shows Pocket and Pocket 2', eggs.chips.includes('Pocket') && eggs.chips.includes('Pocket 2'), eggs);
      await tap(byText('.bg-plot-card .bg-crew .bg-chip', 'Pocket 2'), 'Pocket 2’s pill');
      const helps = await until(CARD, (c) => c.up && (c.said || '') === fill(w('en', 'iw8cHelping'), { r: 'Pocket 2', m: 'Pocket' }), 4000);
      check(`IW-008 AC3: tapped, Pocket 2 helps — "${fill(w('en', 'iw8cHelping'), { r: 'Pocket 2', m: 'Pocket' })}", the card says who works and who helps`, helps.said === fill(w('en', 'iw8cHelping'), { r: 'Pocket 2', m: 'Pocket' }) && helps.here === `${fill(w('en', 'iw8cWorks'), { r: 'Pocket' })} · ${fill(w('en', 'iw8cHelps'), { r: 'Pocket 2' })}`, helps);
      await tap(first('.bg-plot-close'), 'close the card');
      await wait(1500);
      const SAMPLE = `(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live && s.live['eggs-count']; if (!c) return null; const tgt = (run) => { const st = run && run.steps ? run.steps[run.pc] : null; return st && st.op === 'seek' && st.target ? String(st.target.id) : ''; }; return { a: tgt(c.run), b: c.mate ? tgt(c.mate.run) : '', ra: c.robot ? [c.robot.x, c.robot.y] : null, rb: c.mate && c.mate.robot ? [c.mate.robot.x, c.mate.robot.y] : null, res: c.reserved || {}, basket: (c.things || []).filter((t) => t.kind === 'basket').map((t) => t.count)[0] }; })()`;
      const ac3 = { samples: 0, clash: 0, bothWalk: 0, off: 0, reservedBy: {}, mate: false, baskets: [] };
      const end = Date.now() + 40000;
      while (Date.now() < end) {
        const s = await evaluate(SAMPLE);
        if (s) {
          ac3.samples++;
          if (s.rb) ac3.mate = true;
          if (s.a && s.b) ac3.bothWalk++;
          if (s.a && s.b && s.a === s.b) ac3.clash++;
          for (const [x, y] of [s.ra, s.rb].filter(Boolean)) if (x < 0 || y < 0 || x >= PLOT_W || y >= PLOT_H) ac3.off++;
          for (const k of Object.keys(s.res)) ac3.reservedBy[s.res[k]] = (ac3.reservedBy[s.res[k]] || 0) + 1;
          if (ac3.baskets[ac3.baskets.length - 1] !== s.basket) ac3.baskets.push(s.basket);
        }
        await wait(250);
      }
      readings.ac3 = ac3;
      check(`IW-008 AC3: for 40 s (${ac3.samples} reads of the page's island) two Pockets on one pen never walk to the same egg (${ac3.bothWalk} reads with both walking to an egg, ${ac3.clash} to the same one), both reserve eggs, neither leaves the plot`, ac3.mate && ac3.samples > 100 && ac3.bothWalk > 0 && ac3.clash === 0 && ac3.off === 0 && ac3.reservedBy.pocket > 0 && ac3.reservedBy[Object.keys(ac3.reservedBy).find((k) => k !== 'pocket')] > 0, ac3);
      await tap(cellOf(req('eggs-count').plot.x + 4, req('eggs-count').plot.y + 2), 'the eggs again');
      await shot('iw008-1368-en-03-two-pockets');
      await tap(first('.bg-plot-close'), 'close the card');
    }

    // AC2: copy a program on My robots.
    await tab(2);
    await until('location.pathname', (x) => x === '/my-robot' || x.includes('robot'));
    await wait(1400);
    const CARDS = `[...document.querySelectorAll('.bg-robot-card')].filter((c) => c.offsetParent !== null).map((c) => { const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; const inp = c.querySelector('input'); return { name: inp && inp.offsetParent !== null ? inp.value : t('h3'), brain: t('.bg-robot-brain'), where: t('.bg-robot-where'), copy: [...c.querySelectorAll('.bg-robot-copy .bg-chip')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()), said: t('.bg-robot-said'), locked: c.className.includes('bg-robot-locked') }; })`;
    const cards0 = await until(CARDS, (l) => l.length >= 8, 6000);
    const owned = cards0.filter((c) => !c.locked).map((c) => c.name);
    check(`IW-008 AC5 ${tag}: My robots has a card per robot of hers (Pip, Bubbles, Sprout, Nimbus, Pebble, ${COBBLE}, ${POCKET}, Pocket 2) and Echo locked`, ['Pip', 'Bubbles', 'Sprout', 'Nimbus', 'Pebble', COBBLE, POCKET, 'Pocket 2'].every((n) => owned.includes(n)) && cards0.filter((c) => c.locked).length === 1, cards0.map((c) => [c.name, c.locked]));
    const card = (name) => `[...document.querySelectorAll('.bg-robot-card')].find((c) => c.offsetParent !== null && ((c.querySelector('input') || {}).value === ${JSON.stringify(name)}))`;
    const chipOn = (from, to) => `[...(${card(from)}).querySelectorAll('.bg-robot-copy .bg-chip')].find((e) => e.offsetParent !== null && e.innerText.trim() === ${JSON.stringify(to)})`;
    const cardNow = async (name) => (await evaluate(CARDS)).find((c) => c.name === name);
    const pebble0 = await cardNow('Pebble');
    check(`IW-008 AC2 ${tag}: Pebble (a copy at home) knows no program yet — "${fill(w(lang, 'iw8cBrainText'), { n: BRAIN, knows: w(lang, 'iw8cKnowsNone') })}"`, !!pebble0 && pebble0.brain === fill(w(lang, 'iw8cBrainText'), { n: BRAIN, knows: w(lang, 'iw8cKnowsNone') }), pebble0);
    await tap(chipOn('Bubbles', 'Pebble'), `copy Bubbles → Pebble (${tag})`);
    const pebble = await until(`(${CARDS}).find((c) => c.name === 'Pebble')`, (c) => !!c && !!c.said, 4000);
    const knowsN = req('tulip-door').referenceProgram.length;
    check(`IW-008 AC2 ${tag}: Bubbles' program copied onto Pebble: "${fill(w(lang, 'iw8cCopied'), { r: 'Pebble', f: 'Bubbles' })}" on Pebble's card, which now knows ${knowsN} blocks`, !!pebble && pebble.said === fill(w(lang, 'iw8cCopied'), { r: 'Pebble', f: 'Bubbles' }) && pebble.brain === fill(w(lang, 'iw8cBrainText'), { n: BRAIN, knows: fill(w(lang, 'iw8cKnows'), { k: knowsN }) }), pebble);
    if (vpName === '1368') await shot(`iw008-${tag}-04-copied`);
    const program = (await active()).island.robots.find((r) => r.name === 'Pebble').program;
    check(`IW-008 AC2 ${tag}: … and the store has the copy on Pebble's row`, JSON.stringify(program) === JSON.stringify(req('tulip-door').referenceProgram), program);
    // Refused: a block Cobble cannot place — named.
    const firstBad = req('tulip-door').referenceProgram.map((b) => b.t).find((t) => ['water', 'fill'].includes(t));
    const blk = w(lang, 'b' + firstBad.charAt(0).toUpperCase() + firstBad.slice(1));
    await tap(chipOn('Bubbles', COBBLE), `copy Bubbles → ${COBBLE} (${tag})`);
    const cobble = await until(`(${CARDS}).find((c) => c.name === ${JSON.stringify(COBBLE)})`, (c) => !!c && !!c.said, 4000);
    check(`IW-008 AC2 ${tag}: Bubbles' program onto ${COBBLE} is refused, naming the first block ${COBBLE} cannot do: "${fill(w(lang, 'iw8cNoBlock'), { r: COBBLE, f: 'Bubbles', blk })}"`, !!cobble && cobble.said === fill(w(lang, 'iw8cNoBlock'), { r: COBBLE, f: 'Bubbles', blk }), cobble);
    // Refused: the brain — the 33 blocks Teach recorded for the tulips, onto a 12-block brain.
    await tap(chipOn('Pip', 'Pebble'), `copy Pip → Pebble (${tag})`);
    const brainSaid = fill(w(lang, 'iw8cNoBrain'), { f: 'Pip', r: 'Pebble', k: recorded('tulips-three').length, n: BRAIN });
    const pebble2 = await until(`(${CARDS}).find((c) => c.name === 'Pebble')`, (c) => !!c && c.said === brainSaid, 4000);
    check(`IW-008 AC2 ${tag}: Pip's program (the ${recorded('tulips-three').length} blocks Teach recorded) onto Pebble is refused: "${brainSaid}"; Pebble keeps Bubbles' program`, !!pebble2 && pebble2.said === brainSaid && JSON.stringify((await active()).island.robots.find((r) => r.name === 'Pebble').program) === JSON.stringify(req('tulip-door').referenceProgram), pebble2);
    if (vpName === '1368') await shot(`iw008-${tag}-05-refused`);
    check(`IW-008 ${tag}: 0 console errors, 0 network errors so far`, page.consoleErrors.length === 0 && page.networkErrors.length === 0, { console: page.consoleErrors.slice(0, 5), network: page.networkErrors.slice(0, 5) });
  }

  // AC5: My robots with the crew at three widths (the 390-fr family is in the store).
  for (const vpName of ['1368', '1024', '390']) {
    await page.setViewport(VIEWPORTS[vpName]);
    await page.navigate('/island');
    await wait(900);
    await tab(2);
    await wait(1400);
    const layout = await evaluate(`(() => { const cards = [...document.querySelectorAll('.bg-robot-card')].filter((c) => c.offsetParent !== null); const vw = document.documentElement.clientWidth; return { names: cards.map((c) => { const i = c.querySelector('input'); return i && i.offsetParent !== null ? i.value : (c.querySelector('h3') || {}).innerText; }), n: cards.length, owned: cards.filter((c) => !c.className.includes('bg-robot-locked')).length, brains: cards.filter((c) => { const b = c.querySelector('.bg-robot-brain'); return b && b.offsetParent !== null && b.innerText.trim().length > 0; }).length, sideways: document.scrollingElement.scrollWidth > vw + 1, outside: cards.filter((c) => { const r = c.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1; }).length, vw }; })()`);
    readings[`layout-${vpName}`] = layout;
    const fleet = (await active()).island.robots.length;
    check(`IW-008 AC5 My robots at ${vpName}: a card per robot of hers (${fleet}) and one locked (Echo), each once; every card inside the page, no sideways scroll, a brain line on each of hers`, layout.n === fleet + 1 && layout.owned === fleet && new Set(layout.names).size === layout.n && !layout.sideways && layout.outside === 0 && layout.brains === layout.owned, layout);
    await evaluate(`(() => { const f = document.querySelector('.bg-robots'); if (f) f.scrollIntoView({ block: 'start' }); })()`);
    await wait(300);
    await shot(`iw008-myrobots-${vpName}-fr`);
    // The copy row and the brain line of the fourth card (a copy), in view.
    await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-robot-card')].filter((x) => x.offsetParent !== null)[3]; if (c) c.querySelector('.bg-robot-brain').scrollIntoView({ block: 'center' }); })()`);
    await wait(300);
    await shot(`iw008-myrobots-${vpName}-fr-card`);
  }
  check('IW-008: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('IW-008: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
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
