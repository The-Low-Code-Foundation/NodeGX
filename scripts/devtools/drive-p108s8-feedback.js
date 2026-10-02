#!/usr/bin/env node
/**
 * P108 session 8 — what Richard found playing the island (2026-10-02), driven on the DEPLOYED template the way a child
 * meets it (the deploy drive-all.sh makes: drive-cg003-pages.js assemble + nodegx deploy).
 *
 * Clauses:
 *   TABS    the top bar has four tabs — Island, My robot, Skills, Grown-ups — and no Workshop tab.
 *   CAN     Water my three tulips: the can lies on the grass between Pip and the pond; the pad's pick key picks it up
 *           (Pip holds it, the grass is bare). Screenshots before and after.
 *   WALK    Sami's path (Cobble): the pad has "go to the nearest rock" AND "go to the nearest square". On her land (the
 *           rock across it from home) a press on the rock key walks — the robot keeps moving for about one Step Ms a tile of
 *           its route (a jump is one Step Ms) and, in 2D, is drawn on each tile of the route in turn; the world is at the
 *           rock at once (the page reads it so). (Sami's rocks are seeded; on some days the nearest is one step away.)
 *   SPLIT   1420 × 900: the divider stands between the world and the steps; the steps are 44vw by default; a drag of
 *           250 px to the right narrows the steps by 250 and the world grows; the width is kept after the page is left
 *           and opened again; the arrow key moves it 32 px; a double-click gives the default back. 1024 × 768: the
 *           divider is there and the steps take 43vw.
 *   LAND    her land with the refuge placed and the rock at 1 of 8 on the island: the Workshop's rock chip says 1/8 and
 *           grows back (a sprout), the tree's chip is there; Pip walks to the rock, picks its last stone, a second pick
 *           says "The rock is empty. It grows back, a stone at a time."; at the refuge's plank part the stone is refused
 *           with "This part wants planks." and stays in his hands.
 *   0 console errors.
 *
 * Usage: node scripts/devtools/drive-p108s8-feedback.js <deploy-dir> --project <assembled-project> [--mode 2d|3d] [--shots <dir>] [--json <file>]
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
  console.error('usage: drive-p108s8-feedback.js <deploy-dir> --project <assembled-project> [--mode 2d|3d] [--shots <dir>] [--json <file>]');
  process.exit(2);
}
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
const w = (lang, key, name = 'Pip') => String(WORDS[lang][key] || '').split('{b}').join(name);
const REQUESTS = staticRows('Data/Requests');
const req = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, req(id).copyKeys.title);
const LAND = pageRun('Logic/Land card', { model: {} }, '\n;Outputs.LAND_PLOT = LAND_PLOT; Outputs.LAND_ID = LAND_ID;');
const LP = LAND.LAND_PLOT;
const win = (model, id, robotId = 'r1') => pageRun('Logic/Complete request', { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(req(id).referenceProgram), robotId, now: 1759300000000 }).model;
const STEP_MS = Number((nodesOf('Workshop/Play').find((n) => n.id === 'plGarden') || { parameters: {} }).parameters.stepMs) || 380;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = { mode: MODE, stepMs: STEP_MS };
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
    if (msg.method === 'Runtime.exceptionThrown') errors.push(String((msg.params.exceptionDetails && (msg.params.exceptionDetails.exception || {}).description) || msg.params.exceptionDetails.text).slice(0, 300));
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
    if (SHOTS) await page.screenshot(path.join(SHOTS, `s8-${MODE}-${name}.png`));
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
  const hasText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const typeInto = async (finder, value) => {
    await evaluate(`(() => { const el = (${finder}); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
  };
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${STORE_KEY}; try { return JSON.parse(localStorage.getItem(k)).model || null; } catch (e) { return null; } })()`);
  const store = (model) => evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); v.model = ${JSON.stringify(model)}; delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const gotIt = async (label) => {
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${label})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const WORLD = `(() => { const W = Noodl.Variables.gardenWorld; return W ? JSON.parse(JSON.stringify({ things: W.things || [], robots: W.robots || [] })) : null; })()`;
  const ROOT3 = `document.querySelector('.bg-stage [data-gd3-world]')`;
  const ready3d = async (label) => {
    if (MODE !== '3d') return;
    const r = await until(`(() => { const e = ${ROOT3}; return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 20000);
    check(`3D: Garden 3D is on the stage (${label})`, r === 'true', r);
  };
  const resetRenderer = () => evaluate(`(() => { const k = ${STORE_KEY}; if (!k) return; const v = JSON.parse(localStorage.getItem(k)); delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); })()`);
  // Bubbles as they appear (Garden 3D's lasts 1.1 s).
  const watchBubbles = () => evaluate(`(() => { window.__s8B = []; if (window.__s8O) window.__s8O.disconnect(); const seen = () => document.querySelectorAll('.bg-stage .gd3-bubble, .bg-stage .gd-bubble').forEach((e) => { const t = e.innerText.trim(); if (t && window.__s8B[window.__s8B.length - 1] !== t) window.__s8B.push(t); }); window.__s8O = new MutationObserver(seen); window.__s8O.observe(document.body, { childList: true, subtree: true, characterData: true }); return true; })()`);
  const bubbles = () => evaluate('window.__s8B || []');
  const key = (slug) => first(`.bg-pad .bg-key-${slug}`);
  const press = async (slug, label) => {
    await tap(key(slug), label || `the pad's ${slug}`);
    await wait(STEP_MS + 150);
  };

  const freshFamily = async (tag) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    await tap(first('button.bg-profile-new'), `new player (${tag})`);
    await typeInto(first('input'), 'Ada');
    await tap(hasText('.bg-seg-btn', '10–12'), `band 10–12 (${tag})`);
    await tap(hasText('button.bg-btn', w('en', 'create')), `create (${tag})`);
    await until('location.pathname', (p) => p === '/island');
    await wait(900);
  };
  /** Cobble lent (path-postbox won), Pip home — as drive-iw007-touch.js seeds it — and anything else the clause needs. */
  const seeded = async (more) => {
    let m = win(await stored(), 'path-postbox');
    for (const p of m.profiles) for (const k of Object.keys(p.island.plots)) if (p.island.plots[k].robotId === 'r1') p.island.plots[k] = { program: null, robotId: '', wonAt: p.island.plots[k].wonAt };
    if (more) m = more(m) || m;
    await store(m);
    await page.navigate('/island');
    await wait(1800);
  };
  const openQuest = async (id) => {
    if (MODE === '3d') {
      await resetRenderer();
      await page.navigate('/island');
      await wait(1200);
    }
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await tap(hasText('.bg-quest', titleOf('en', id)), `open ${id}`);
    await until('location.pathname', (p) => p === '/workshop', 4000);
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    await ready3d(id);
    await wait(900);
    await gotIt(id);
  };

  await page.setViewport({ name: '1420', width: 1420, height: 900, mobile: false });
  await freshFamily('s8');

  // ── TABS ──
  const tabs = await evaluate(`[...document.querySelectorAll('.bg-tabs .bg-tab')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim())`);
  check('TABS: four tabs — Island, My robot, Skills, Grown-ups — no Workshop', JSON.stringify(tabs) === JSON.stringify(['navIsland', 'navRobot', 'navSkills', 'navGrown'].map((k) => w('en', k))), tabs);
  await shot('tabs');

  // ── CAN ──
  await openQuest('tulips-three');
  const canBefore = await evaluate(WORLD);
  const can0 = canBefore && canBefore.things.find((t) => t.kind === 'can');
  const pip0 = canBefore && canBefore.robots[0];
  check('CAN: the can lies on the grass at (1, 1), empty, between Pip (2, 1) and the pond; his hands are empty', !!can0 && can0.x === 1 && can0.y === 1 && can0.level === 0 && pip0.x === 2 && pip0.y === 1 && !pip0.holds, { can0, pip0 });
  if (MODE === '2d') check('CAN: the 2D world draws it on its tile', await evaluate(`!!document.querySelector('.bg-stage .gd-cell[data-x="1"][data-y="1"] .gd-canthing')`), 'no .gd-canthing at 1,1');
  await shot('can-on-the-grass');
  const pickKey = await evaluate(`!!${key('pick')}`);
  check('CAN: the pad has a pick key', pickKey, pickKey);
  await press('pick', 'pick the can up');
  const canAfter = await evaluate(WORLD);
  check('CAN: picked — Pip holds the can (0 of 3), the grass is bare', !!canAfter && canAfter.robots[0].holds === 'can' && canAfter.robots[0].can === 0 && !canAfter.things.some((t) => t.kind === 'can'), canAfter && { robot: canAfter.robots[0], cans: canAfter.things.filter((t) => t.kind === 'can') });
  if (MODE === '2d') check('CAN: the 2D world draws the can in his hand, none on the grass', await evaluate(`(() => { const b = document.querySelector('.bg-stage .gd-bot'); return !!b && b.getAttribute('data-holds') === 'can' && !document.querySelector('.bg-stage .gd-canthing'); })()`), 'still on the grass or not held');
  await shot('can-picked');

  // ── WALK ──
  await seeded();
  await openQuest('path-stones');
  const goKeys = await evaluate(`[...document.querySelectorAll('.bg-pad .bg-key-go')].filter((e) => e.offsetParent !== null).map((e) => [e.className.match(/bg-key-go-nearest-[a-z]+|bg-key-go-to-[a-z]+/)[0], e.getAttribute('aria-label') || e.title || e.innerText])`);
  check('WALK: the pad has go to the nearest rock AND go to the nearest square', JSON.stringify(goKeys.map((k) => k[0])) === JSON.stringify(['bg-key-go-nearest-rock', 'bg-key-go-nearest-site']), goKeys);
  /** Sample where the robot is DRAWN every 30 ms in the page (2D: its style's left/top — the tile it is drawn on; 3D: its group's position). */
  const sampleWalk = async (ms) => {
    await evaluate(`(() => { window.__s8W = []; const t0 = performance.now(); clearInterval(window.__s8I); window.__s8I = setInterval(() => {
      const e = document.querySelector('.bg-stage [data-gd3-world]');
      if (e && e.gd3 && e.getAttribute('data-ready') === 'true') { const r = e.gd3.robotAt(0); if (r) window.__s8W.push([Math.round(performance.now() - t0), +r.x.toFixed(3), +r.z.toFixed(3)]); return; }
      const b = document.querySelector('.bg-stage .gd-bot'); if (b) window.__s8W.push([Math.round(performance.now() - t0), b.style.left, b.style.top, b.getAttribute('data-x'), b.getAttribute('data-y')]);
    }, 30); return true; })()`);
    await wait(ms);
    return evaluate(`(() => { clearInterval(window.__s8I); return window.__s8W; })()`);
  };
  await shot('walked-to-the-rock');

  /**
   * A go press measured: where the robot is drawn, every 30 ms, from the press until it settles. The route (via) is read
   * off the world; the 2D tiles are mapped from the robot's left/top (robotPlaces: (x + .5) / w).
   */
  const measureWalk = async (slug, label) => {
    const before = await evaluate(WORLD);
    const dims = await evaluate(`(() => { const m = Noodl.Variables.gardenWorld.map; const rows = Array.isArray(m) ? m : m && m.rows; return rows ? [String(rows[0]).length, rows.length] : [8, 6]; })()`);
    const sampling = sampleWalk(STEP_MS * 16);
    await wait(60);
    await tap(key(slug), label);
    const samples = await sampling;
    const after = await evaluate(WORLD);
    const via = (after && after.robots[0].via) || [];
    const walk = { from: [before.robots[0].x, before.robots[0].y], to: [after.robots[0].x, after.robots[0].y], via, samples: samples.length, dims };
    const sig = (x) => x.slice(1, 3).join(',');
    let firstMove = -1;
    let lastMove = -1;
    for (let i = 1; i < samples.length; i++) if (sig(samples[i]) !== sig(samples[i - 1])) {
      if (firstMove < 0) firstMove = samples[i - 1][0];
      lastMove = samples[i][0];
    }
    walk.movingMs = lastMove - firstMove;
    readings[`walk-${slug}`] = walk;
    check(`WALK (${label}): the route has more than one tile (via ${JSON.stringify(via)})`, via.length > 1, walk);
    // A walk of n tiles takes about n Step Ms (2D: n - 1 waits, then the last CSS glide; 3D: n glides); a jump, one.
    check(`WALK (${label}): the robot keeps moving ~${via.length} Step Ms (${STEP_MS} ms each), not one — ${walk.movingMs} ms`, via.length > 1 && walk.movingMs >= (via.length - 1) * STEP_MS * 0.8, walk);
    if (MODE === '2d') {
      const tiles = [];
      for (const x of samples) {
        const t = [Math.round((parseFloat(x[1]) * dims[0]) / 100 - 0.5), Math.round((parseFloat(x[2]) * dims[1]) / 100 - 0.5)];
        if (!tiles.length || tiles[tiles.length - 1].join() !== t.join()) tiles.push(t);
      }
      walk.drawn = tiles;
      check(`WALK (${label}): in 2D the robot is drawn on each tile of the route in turn`, JSON.stringify(tiles.slice(1)) === JSON.stringify(via), { drawn: tiles, via });
      // The first frame the robot is drawn moving already says the end (data-x / data-y): the world changed once.
      const firstMoving = samples.findIndex((x, i) => i > 0 && sig(x) !== sig(samples[i - 1]));
      const fm = firstMoving > 0 ? samples[firstMoving] : null;
      check(`WALK (${label}): in 2D its data-x / data-y are the end at once (the world changed once)`, !!fm && fm[3] === String(after.robots[0].x) && fm[4] === String(after.robots[0].y), { firstMoving: fm, end: walk.to });
    }
    return walk;
  };

  // ── SPLIT ──
  const sizes = () => evaluate(`(() => { const d = document.querySelector('.gd-divider'); const s = document.querySelector('.bg-steps'); const g = document.querySelector('.bg-stage .gd-world, .bg-stage [data-gd3-world]');
    const r = (e) => (e && e.offsetParent !== null ? Math.round(e.getBoundingClientRect().width) : null);
    let kept = null; try { kept = localStorage.getItem('bot-garden-steps-w'); } catch (e) {}
    return { divider: r(d), parentIsGrid: !!d && !!d.parentElement && d.parentElement.classList.contains('bg-ws'), steps: r(s), world: r(g), vw: innerWidth, kept }; })()`);
  const s0 = await sizes();
  readings.split0 = s0;
  check('SPLIT: the divider is a column of the Workshop grid, between the world and the steps', s0.divider === 16 && s0.parentIsGrid, s0);
  check(`SPLIT: the steps take 44vw by default (${Math.round(0.44 * s0.vw)} px)`, Math.abs(s0.steps - Math.round(0.44 * s0.vw)) <= 2, s0);
  await shot('split-default');
  const grip = await where(`document.querySelector('.gd-divider .gd-divider-grip')`);
  check('SPLIT: the grip is under a finger (nothing covers it)', grip.found && grip.hit, grip);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: grip.x, y: grip.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 10; i++) await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: grip.x + 20 * i, y: grip.y, button: 'left', buttons: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: grip.x + 200, y: grip.y, button: 'left', buttons: 0, clickCount: 1 });
  await wait(600);
  const s1 = await sizes();
  readings.split1 = s1;
  check('SPLIT: a 200 px drag to the right narrows the steps by 200 px and the world grows', Math.abs(s0.steps - 200 - s1.steps) <= 3 && s1.world > s0.world, { before: s0, after: s1 });
  // The drawer stays beside the program (the divider's Min keeps the workspace off the phone's strip layout).
  const drawerSide = await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); const p = document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]'); if (!r || !p) return null; const a = r.getBoundingClientRect(), b = p.getBoundingClientRect(); return { narrow: r.classList.contains('gd-narrow'), inView: b.top >= 0 && b.bottom <= innerHeight, left: Math.round(b.left - a.left) }; })()`);
  check('SPLIT: … and the drawer stays beside the program, on screen', !!drawerSide && !drawerSide.narrow && drawerSide.inView, drawerSide);
  // The narrowest the divider allows (a drag far right) still keeps it there.
  const g2 = await where(`document.querySelector('.gd-divider .gd-divider-grip')`);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g2.x, y: g2.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 10; i++) await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g2.x + 60 * i, y: g2.y, button: 'left', buttons: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g2.x + 600, y: g2.y, button: 'left', buttons: 0, clickCount: 1 });
  await wait(600);
  const sMin = await sizes();
  const drawerMin = await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); return r ? r.classList.contains('gd-narrow') : null; })()`);
  readings.splitMin = { ...sMin, narrow: drawerMin };
  check('SPLIT: dragged as far as it goes, the steps stop at 420 px and the drawer is still beside the program', Math.abs(sMin.steps - 420) <= 2 && drawerMin === false, readings.splitMin);
  await shot('split-narrowest');
  // Back to the 200 px drag for the clauses below.
  const g3 = await where(`document.querySelector('.gd-divider .gd-divider-grip')`);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g3.x, y: g3.y, button: 'left', buttons: 1, clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g3.x - (s1.steps - sMin.steps), y: g3.y, button: 'left', buttons: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g3.x - (s1.steps - sMin.steps), y: g3.y, button: 'left', buttons: 0, clickCount: 1 });
  await wait(600);
  check('SPLIT: the width is kept on this computer', s1.kept === String(s1.steps), s1);
  await shot('split-dragged');
  await tab(0);
  await openQuest('path-stones');
  const s2 = await sizes();
  check('SPLIT: left and opened again, the steps keep the dragged width', Math.abs(s2.steps - s1.steps) <= 2, { dragged: s1, again: s2 });
  await tap(`document.querySelector('.gd-divider .gd-divider-grip')`, 'focus the divider');
  await evaluate(`document.querySelector('.gd-divider').focus()`);
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
  await wait(400);
  const s3 = await sizes();
  check('SPLIT: the left arrow widens the steps by 32 px', Math.abs(s3.steps - s2.steps - 32) <= 2, { before: s2, after: s3 });
  const dbl = await where(`document.querySelector('.gd-divider .gd-divider-grip')`);
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dbl.x, y: dbl.y, button: 'left', buttons: 1, clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dbl.x, y: dbl.y, button: 'left', buttons: 0, clickCount: 1 });
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dbl.x, y: dbl.y, button: 'left', buttons: 1, clickCount: 2 });
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dbl.x, y: dbl.y, button: 'left', buttons: 0, clickCount: 2 });
  await wait(500);
  const s4 = await sizes();
  check('SPLIT: a double-click gives the default back and keeps nothing', Math.abs(s4.steps - s0.steps) <= 2 && s4.kept === null, s4);
  await page.setViewport({ name: '1024', width: 1024, height: 768, mobile: false });
  await wait(600);
  const s5 = await sizes();
  readings.split1024 = s5;
  check('SPLIT: 1024 × 768 — the divider is there and the steps take 43vw', s5.divider === 16 && Math.abs(s5.steps - Math.round(0.43 * 1024)) <= 2, s5);
  await shot('split-1024');
  await page.setViewport({ name: '1420', width: 1420, height: 900, mobile: false });
  await wait(600);

  // ── LAND ──
  await seeded((m) => {
    const p = m.profiles.find((x) => x.id === m.island.activeId);
    p.owned = Array.from(new Set([...(p.owned || []), 'refuge']));
    p.island.land = { buildings: [{ id: 'b1', bp: 'refuge', x: 3, y: 3, have: { plank: 0, stone: 0 } }], animals: [], left: { rock: 1, tree: 6, patch: 3 } };
    return m;
  });
  await tab(0);
  await until('location.pathname', (p) => p === '/island', 3000);
  await wait(600);
  // Her land's card: a free tile of it (a building or a robot may stand over one).
  let opened = false;
  for (const [dx, dy] of [[2, 4], [1, 3], [5, 2], [6, 4], [1, 1], [2, 2]]) {
    const finder = `document.querySelector('.bg-isle .gd-cell[data-x="${LP.x + dx}"][data-y="${LP.y + dy}"]')`;
    if (MODE === '3d') {
      const e = await evaluate(`(() => { const r = document.querySelector('.bg-isle [data-gd3-world]'); if (!r || !r.gd3) return null; r.scrollIntoView({ block: 'center' }); const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${LP.x + dx}, ${LP.y + dy}); return { x: c.left + s.sx, y: c.top + s.sy }; })()`);
      if (e) for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(e.x), y: Math.round(e.y), button: 'left', clickCount: 1 });
      else if ((await where(finder)).found) await tap(finder, 'her land');
    } else await tap(finder, 'her land');
    await wait(500);
    if (await evaluate(`(() => { const e = document.querySelector('.bg-plot-open'); return !!e && e.offsetParent !== null; })()`)) {
      opened = true;
      break;
    }
  }
  check("LAND: her land's card opens", opened, opened);
  await tap(first('.bg-plot-open'), 'Teach Pip here');
  await until('location.pathname', (p) => p === '/workshop', 4000);
  await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
  await ready3d('her land');
  await wait(900);
  await gotIt('her land');
  const chips = await evaluate(`[...document.querySelectorAll('.bg-stage .gd-meter, .bg-stage .gd3-meter')].map((c) => ({ kind: c.getAttribute('data-kind'), meter: c.getAttribute('data-meter'), grows: c.getAttribute('data-grows') === 'true' }))`);
  readings.landChips = chips;
  const rock = chips.find((c) => c.kind === 'rock');
  const tree = chips.find((c) => c.kind === 'tree');
  check("LAND: the rock's chip says the island's 1/8 (not a fresh 6) and that it grows back", !!rock && rock.meter === '1/8' && rock.grows, chips);
  check("LAND: the tree has its chip (6/8, growing back)", !!tree && tree.meter === '6/8' && tree.grows, chips);
  await shot('land-chips');
  await watchBubbles();
  // Home is the land's corner, the rock the far side: the walk Richard saw as a jump.
  await measureWalk('go-nearest-rock', 'her land: Pip from home to the rock');
  await shot('land-walked-to-the-rock');
  await press('pick', 'pick the last stone');
  await press('pick', 'pick again: the rock is empty');
  const afterPicks = await evaluate(WORLD);
  const said1 = await bubbles();
  check('LAND: the last stone in his hands; a second pick says the rock grows back', afterPicks.robots[0].carry.join() === 'stone' && said1.includes(w('en', 'sayGrowsRock')), { carry: afterPicks.robots[0].carry, said: said1 });
  await shot('land-rock-empty');
  await tap(key('go-to-site'), 'go to the refuge (its first part: the planks)');
  await wait(STEP_MS * 16);
  await press('put', 'put the stone on the plank part');
  const afterPut = await evaluate(WORLD);
  const said2 = await bubbles();
  const plankPart = afterPut.things.find((t) => t.kind === 'site' && t.item === 'plank');
  check('LAND: the stone on the plank part is refused with "This part wants planks." and stays in his hands', afterPut.robots[0].carry.join() === 'stone' && plankPart && plankPart.have === 0 && said2.includes(w('en', 'sayWantsPlank')), { carry: afterPut.robots[0].carry, plankPart, said: said2 });
  await shot('land-wrong-part');

  check('0 console errors', errors.length === 0, errors.slice(0, 5));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} clauses passed`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results, readings, errors }, null, 2));
  return failed;
})
  .then((failed) => process.exit(failed ? 1 : 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
