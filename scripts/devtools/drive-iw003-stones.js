#!/usr/bin/env node
/**
 * P108 IW-003 (session 3, lane S) — Sami's stones on the job model, driven the way a child plays them on the DEPLOYED
 * template (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx-deploy.cjs`).
 *
 * Every program is BUILT in the Workshop's drawer with real taps (a tap on a drawer block adds it to the selected
 * container; a tap on a container's word selects it; a slot is set from its picker; a chip is picked by a tap on the
 * world), then Played. What a child would see is read off the page: the meter chips on the squares, the bench and the
 * rocks (the kit's `data-meter`), a square's ground by stage (`data-site`), the bench by stage (`data-bench`, Sami sitting:
 * `data-sits`), the load on the robot's back, the bubbles ("Home! All done."), the robot back on its start tile, the win
 * card and the owl's line. A stub Olive answers `/__garden/*` inside Chrome: "is it a…?" says yes about a flower and no
 * about a rock (the engine names the thing ahead in the ask's slots).
 *
 * Clauses (IW-003 §5 AC1–AC3, AC5 for path-stones, sami-bench and rock-flower):
 *   PS  path-stones — the start (four squares of dirt 0/4, two rocks 8/8, an empty hod); the reference built from the
 *       drawer (repeat 4 { go to nearest rock, repeat 4 { pick up }, go to nearest site, repeat 4 { put down } }); Played:
 *       a square seen at every stage dirt → gravel → cobbles → path, a stone on Cobble's back, the rocks' meters going
 *       down, every square 4/4 green, "Home! All done." and Cobble on his start tile, the win card and "Perfect!".
 *       1368 × 912 EN and 390 × 844 FR (the phone).
 *   SB  sami-bench — the start (the bench site 0/8, pegs on dirt, three rocks); the reference built with two chips (the
 *       bench tapped on the world, the hod from the drawer): until [bench] is done { until [hod] is full { go to nearest
 *       rock, pick up }, go to [bench], until [hod] is empty { put down } }; Played: the bench seen at every stage 0 → 4,
 *       its meter 8/8 green, Sami sitting on it, Cobble home, the win card. 1024 × 768 EN and 1368 × 912 FR.
 *   RF  rock-flower — Echo fills the can at the pond, asks Olive about each thing ahead three times, waters only the two
 *       flowers (their meters 1/1 green, the rocks never watered, no puddle), walks home; the win card. 1024 × 768 EN and
 *       1368 × 912 FR.
 *   0 console errors, 0 network errors.
 * `--mode 3d` (swiftshader): PS and SB at 1368 × 912 EN on Garden 3D — the same programs built and Played; the squares
 *   and the bench read off the 3D world's meters (the overlay's chips), screenshots of the path and of Sami on his bench.
 *
 * Usage: node scripts/devtools/drive-iw003-stones.js <deploy-dir> --project <project-dir> [--mode 2d|3d] [--shots <dir>] [--json <file>]
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
const PROJECT = arg('--project') || path.join(__dirname, '..', '..', 'templates', 'bot-garden');
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
const MODE = arg('--mode') || '2d';
if (!DIR || DIR.startsWith('--') || !['2d', '3d'].includes(MODE)) {
  console.error('usage: drive-iw003-stones.js <deploy-dir> --project <project-dir> [--mode 2d|3d] [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const nodesOfComponent = (dir) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...dir.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const tableOf = (component) => JSON.parse(nodesOfComponent(`Data/${component}`).find((n) => n.type === 'Static Data').parameters.json);
const WORD_ROWS = tableOf('Words');
const HINT_ROWS = tableOf('Hints');
const REQUESTS = tableOf('Requests');
const w = (lang, key, name = 'Pip') => String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
const hint = (lang, key, name = 'Pip') => String((HINT_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
const req = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, (req(id) || { copyKeys: {} }).copyKeys.title);
/** The program's shape, ids dropped: what the page holds against what the request's reference is. */
const shapeOf = (list) => JSON.stringify(
  (function strip(l) {
    return (Array.isArray(l) ? l : []).map((b) => {
      const o = { t: b.t };
      if (b.n !== undefined) o.n = Number(b.n);
      if (b.slots && Object.keys(b.slots).length) o.slots = b.slots;
      if (b.body) o.body = strip(b.body);
      return o;
    });
  })(list)
);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const STUB = {
  status: { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } },
  olive: (body) => {
    if (body && body.rung === 'is-it-a') {
      const thing = String((body.slots && body.slots.thing) || '').toLowerCase();
      const yes = /tulip|flower|fleur/.test(thing);
      return { ok: true, value: body.lang === 'fr' ? (yes ? 'oui' : 'non') : yes ? 'yes' : 'no', ms: 5 };
    }
    return { ok: true, text: body && body.lang === 'fr' ? 'Merci ! (stub)' : 'Thank you! (stub)', ms: 5 };
  }
};
const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {};

withDeployedSite({ dir: DIR, ...CHROME }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  const stubCalls = [];
  client.on((msg) => {
    if (msg.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = msg.params;
    let body = {};
    try {
      body = JSON.parse(request.postData || '{}');
    } catch {
      body = {};
    }
    const answer = /\/__garden\/olive\/status/.test(request.url) ? STUB.status : STUB.olive(body);
    stubCalls.push({ url: request.url, body });
    client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
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
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const control = (icon) => tap(first(`.bg-controls .bg-i-${icon}`), `control ${icon}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
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
  /** An element a Blockly block (by its engine id) or one of its fields puts on the screen, as a finder. */
  const blockSvg = (id) => `(${WS}.getBlockById(${JSON.stringify(String(id))}) || { getSvgRoot: () => null }).getSvgRoot()`;
  const fieldSvg = (blockExpr, field) => `((b) => { const f = b && b.getField(${JSON.stringify(field)}); return f && f.getSvgRoot ? f.getSvgRoot() : null; })(${blockExpr})`;
  const blockOf = (id) => `${WS}.getBlockById(${JSON.stringify(String(id))})`;
  const condOf = (id) => `((b) => b && b.getInputTargetBlock('COND'))(${blockOf(id)})`;
  const chipOf = (blockExpr) => `((b) => { const c = b && b.getInputTargetBlock('THING'); return c ? c.getSvgRoot() : null; })(${blockExpr})`;
  /** The newest block of an engine type (the one a tap just added: the highest whole-number id). */
  const newest = (t) => evaluate(`(() => { const l = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]')].map((e) => Number(e.getAttribute('data-id'))).filter((n) => isFinite(n)); return l.length ? String(Math.max(...l)) : ''; })()`);
  const selectedIs = (id) => evaluate(`((e) => e ? e.getAttribute('data-sel') : '')(${blockSvg(id)})`);
  /**
   * A tap on a part of a placed block. A program wider than the workspace runs past its right edge (IW-004's look at
   * 1024 × 768, lane B's to fix): a part a finger cannot reach there is brought in the way a child brings it — the
   * workspace's own ⤢ (show all my blocks), a drag of the workspace's background, then − — and every time it had to is
   * counted (readings.zoomed, readings.panned).
   */
  /** Drag the workspace's own background (not a block) towards the target, as a finger scrolls it. */
  const panToward = async (finder) => {
    const t = await where(finder, false);
    const bg = await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk .blocklyMainBackground'); if (!r) return null; const b = r.getBoundingClientRect(); for (let y = b.bottom - 30; y > b.top + 30; y -= 24) for (let x = b.right - 30; x > b.left + 30; x -= 24) { const at = document.elementFromPoint(x, y); if (at && at.classList && at.classList.contains('blocklyMainBackground')) return { x, y, b: [b.left, b.top, b.right, b.bottom] }; } return null; })()`);
    if (!t.found || !bg) return false;
    const dx = Math.max(-220, Math.min(220, (bg.b[0] + bg.b[2]) / 2 - t.x));
    const dy = Math.max(-160, Math.min(160, (bg.b[1] + bg.b[3]) / 2 - t.y));
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bg.x, y: bg.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 10; i++) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bg.x + (dx * i) / 10, y: bg.y + (dy * i) / 10, button: 'left', buttons: 1 });
      await wait(30);
    }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bg.x + dx, y: bg.y + dy, button: 'left', buttons: 0, clickCount: 1 });
    await wait(350);
    return true;
  };
  const tapInWs = async (finder, label) => {
    for (const fix of [null, 'fit', 'pan', 'pan', 'out', 'pan']) {
      if (fix === 'pan') {
        readings.panned = (readings.panned || 0) + 1;
        await panToward(finder);
      } else if (fix) {
        readings.zoomed = (readings.zoomed || 0) + 1;
        await tap(`document.querySelector('.bg-blocks-box .gd-bk-zoom [data-zoom="${fix}"]')`, `the workspace’s ${fix}`);
        await wait(450);
      }
      const p = await where(finder, false);
      if (p.found && p.hit) return tap(finder, label);
    }
    return tap(finder, label);
  };
  /** Select a container as a child does: a tap on its word (a second tap lets it go, so read it and tap again if need be). */
  const selectRep = async (id, label) => {
    for (let k = 0; k < 3 && (await selectedIs(id)) !== '1'; k++) await tapInWs(fieldSvg(blockOf(id), 'WORD'), `${label}: take the ${id}`);
    return (await selectedIs(id)) === '1';
  };
  /** A slot set from its picker (the node's own big buttons). */
  const slot = async (blockExpr, field, opt, label) => {
    await tapInWs(fieldSvg(blockExpr, field), `${label}: its ${field}`);
    await wait(200);
    return tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${opt}"]`), `${label}: ${opt}`);
  };
  /** A chip picked on the world: a tap on the chip arms Picking; a tap on the thing's tile (2D) or its place on the 3D canvas. */
  const pickOnWorld = async (chipFinder, x, y, label) => {
    await tapInWs(chipFinder, `${label}: the chip (pick on the island)`);
    await until(`!!document.querySelector('.bg-blocks-box .gd-bk.gd-picking')`, Boolean, 2000);
    if (MODE === '3d' && (await evaluate(`!!document.querySelector('.bg-stage [data-gd3-world]')`))) {
      const pt = await evaluate(`(() => { const r = document.querySelector('.bg-stage [data-gd3-world]'); const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${x}, ${y}); return { x: c.left + s.sx, y: c.top + s.sy }; })()`);
      for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(pt.x), y: Math.round(pt.y), button: 'left', clickCount: 1 });
      await wait(400);
      return true;
    }
    return tap(`document.querySelector('.bg-stage .gd-cell[data-x="${x}"][data-y="${y}"]')`, `${label}: the tile ${x},${y}`);
  };
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l : []; })()`;
  const program = () => evaluate(PROGRAM);
  const WORLD = `(() => { const W = Noodl.Variables.gardenWorld; return W ? JSON.parse(JSON.stringify({ things: W.things || [], robots: W.robots || [], job: W.job || null })) : null; })()`;
  /** What a child sees of the job, read off the world (2D: the kit's cells and chips; 3D: the overlay's chips). */
  const SEEN = MODE === '3d'
    ? `(() => { const o = document.querySelector('.bg-stage [data-gd3-world]'); const chips = o ? [...o.querySelectorAll('.gd3-meter')].map((c) => ({ kind: c.getAttribute('data-kind'), meter: c.getAttribute('data-meter'), full: /gd3-full/.test(c.className) })) : []; const bub = [...document.querySelectorAll('.bg-stage .gd3-bubble, .bg-stage .gd-bubble')].map((e) => e.innerText.trim()).join(' | '); return { chips, bubble: bub, sites: [], bench: null, sits: false, load: null }; })()`
    : `(() => { const cells = [...document.querySelectorAll('.bg-stage .gd-cell')]; const chips = [...document.querySelectorAll('.bg-stage .gd-meter')].map((c) => ({ kind: c.getAttribute('data-kind'), meter: c.getAttribute('data-meter'), full: c.classList.contains('gd-full'), x: c.closest('.gd-cell') ? c.closest('.gd-cell').getAttribute('data-x') : '' })); const sites = [...document.querySelectorAll('.bg-stage .gd-site[data-site]')].map((e) => e.closest('.gd-cell').getAttribute('data-x') + ':' + e.getAttribute('data-site')); const b = document.querySelector('.bg-stage [data-bench]'); const l = document.querySelector('.bg-stage .gd-bot .gd-load'); return { chips, sites, bench: b ? b.getAttribute('data-bench') : null, sits: !!document.querySelector('.bg-stage [data-sits="bench"]'), load: l ? l.getAttribute('data-load') + ':' + l.getAttribute('data-carry') : null, bubble: [...document.querySelectorAll('.bg-stage .gd-bubble')].map((e) => e.innerText.trim()).join(' | '), cells: cells.length }; })()`;
  const seen = () => evaluate(SEEN);
  const WON = `(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`;
  const owl = () => evaluate(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`);

  const freshFamily = async () => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
  };
  const newPlayer = async (name) => {
    await tap(first('button.bg-profile-new'), `new player ${name}`);
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(name)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
    await tap(byText('button.bg-btn', w('en', 'create')), 'create');
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
  };
  /** Cobble and Echo, lent (the island's lend chain is drive-ig005-robots.js's to grade): written into her stored island. */
  const lendRobots = async () => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model || v; const a = m.profiles.find((p) => p.id === m.island.activeId); a.island.robots = a.island.robots || [{ id: 'r1' }]; for (const kind of ['cobble', 'echo', 'pocket']) if (!a.island.robots.some((r) => (r.kind || r.id) === kind)) a.island.robots.push({ id: kind, kind }); localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    await wait(1100);
  };
  /**
   * 3D: Garden 3D under swiftshader can fire Too Slow (the known software-GL flake), and the page then stores { 2d, slow }
   * for the profile; each 3D request starts from no stored choice (the rule decides again), and what it decided is read.
   */
  const RENDERER = `(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { const v = k ? JSON.parse(localStorage.getItem(k)) : null; return v && v.renderer !== undefined ? v.renderer : null; } catch (e) { return 'error'; } })()`;
  const resetRenderer = async () => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); if (!k) return; const v = JSON.parse(localStorage.getItem(k)); delete v.renderer; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate('/island');
    await wait(1200);
  };
  const openQuest = async (lang, id) => {
    if (MODE === '3d') await resetRenderer();
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await tap(byText('.bg-quest', titleOf(lang, id)), `open ${id} (${lang})`);
    // A robot at work on a plot it won is brought home first (the card says so), as a child does, then the card again.
    if ((await until('location.pathname', (p) => p === '/workshop', 1500)) !== '/workshop' && (await evaluate(`(() => { const b = document.querySelector('.bg-bring-home'); return !!b && b.offsetParent !== null; })()`))) {
      readings.broughtHome = (readings.broughtHome || 0) + 1;
      await tap(first('.bg-bring-home'), `bring the robot home (for ${id})`);
      await until(`(() => { const b = document.querySelector('.bg-plot-open'); return !!b && b.offsetParent !== null; })()`, Boolean, 4000);
      await wait(300);
      await tap(byText('.bg-quest', titleOf(lang, id)), `open ${id} (${lang}, the robot home)`);
    }
    await until('location.pathname', (p) => p === '/workshop', 4000);
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    if (MODE === '3d') {
      const ready = await until(`(() => { const e = document.querySelector('.bg-stage [data-gd3-world]'); return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 20000);
      check(`3D: Garden 3D is on the stage for ${id} (ready)`, ready === 'true', ready);
    }
    await wait(900);
  };
  /** Play, and watch the run to its end: every state a child sees, sampled; returns them and the end. */
  const playAndWatch = async (ms, onSample) => {
    const samples = [];
    await control('play');
    const end = Date.now() + ms;
    let won = false;
    while (Date.now() < end) {
      samples.push(await seen());
      if (onSample) await onSample(samples[samples.length - 1]);
      won = await evaluate(WON);
      if (won) break;
      // Under software GL every read costs the 3D frame loop time: a sample a second, not four.
      await wait(MODE === '3d' ? 1800 : 250);
    }
    await wait(300);
    if (MODE === '3d') readings[`renderer-after-${samples.length}`] = await evaluate(RENDERER);
    // The last sample that still shows the job's chips (Garden 3D's overlay is hidden under the win card).
    const now = await seen();
    const last = now.chips.length ? now : [...samples].reverse().find((x) => x.chips.length) || now;
    return { samples, won, last, world: await evaluate(WORLD), owl: await owl() };
  };
  const leaveWin = async (lang) => {
    if (await evaluate(WON)) await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
    await wait(400);
  };

  // ── the programs, built as a child taps them ──
  /** repeat 4 { go to nearest rock, repeat 4 { pick up }, go to nearest site, repeat 4 { put down } } */
  const buildStones = async () => {
    await palTap('repeat');
    const r1 = await newest('repeat');
    await slot(blockOf(r1), 'N', '4', 'the trips');
    await selectRep(r1, 'the trips');
    await palTap('go_nearest');
    await slot(blockOf(await newest('go_nearest')), 'KIND', 'rock', 'go to nearest');
    // A tap on a slot selects that block: the trips' repeat is taken again before the next block goes in.
    await selectRep(r1, 'the trips (the picks go in)');
    await palTap('repeat');
    const r2 = await newest('repeat');
    await slot(blockOf(r2), 'N', '4', 'the picks');
    await selectRep(r2, 'the picks');
    await palTap('pick');
    await selectRep(r1, 'the trips (again)');
    await palTap('go_nearest');
    await slot(blockOf(await newest('go_nearest')), 'KIND', 'site', 'go to nearest');
    await selectRep(r1, 'the trips (the puts go in)');
    await palTap('repeat');
    const r3 = await newest('repeat');
    await slot(blockOf(r3), 'N', '4', 'the puts');
    await selectRep(r3, 'the puts');
    await palTap('put');
    return program();
  };
  /** until [bench] is done { until [hod] is full { go to nearest rock, pick up }, go to [bench], until [hod] is empty { put down } } */
  const buildBench = async (bench) => {
    await palTap('until');
    const u1 = await newest('until');
    await selectRep(u1, 'until the bench');
    await palTap('is');
    await pickOnWorld(chipOf(condOf(u1)), bench.x, bench.y, 'the bench');
    await slot(condOf(u1), 'STATE', 'done', 'the bench');
    await selectRep(u1, 'until the bench (the body)');
    await palTap('until');
    const u2 = await newest('until');
    await selectRep(u2, 'until the hod is full');
    await palTap('is');
    await selectRep(u2, 'until the hod is full (the chip)');
    await palTap('thing:held');
    await slot(condOf(u2), 'STATE', 'full', 'the hod');
    await selectRep(u2, 'until the hod is full (the body)');
    await palTap('go_nearest');
    await slot(blockOf(await newest('go_nearest')), 'KIND', 'rock', 'go to nearest');
    await selectRep(u2, 'until the hod is full (the pick goes in)');
    await palTap('pick');
    await selectRep(u1, 'until the bench (again)');
    await palTap('go_to');
    await pickOnWorld(chipOf(blockOf(await newest('go_to'))), bench.x, bench.y, 'go to the bench');
    await selectRep(u1, 'until the bench (once more)');
    await palTap('until');
    const u3 = await newest('until');
    await selectRep(u3, 'until the hod is empty');
    await palTap('is');
    await selectRep(u3, 'until the hod is empty (the chip)');
    await palTap('thing:held');
    await slot(condOf(u3), 'STATE', 'empty', 'the hod');
    await selectRep(u3, 'until the hod is empty (the body)');
    await palTap('put');
    // What the child reads on the outer until: the chip's words and the state's (the bench's own, never "square … is path").
    readings.benchWords = await evaluate(`((b) => { const c = b && b.getInputTargetBlock('THING'); const tx = (r) => (r ? r.textContent.replace(/\u00a0/g, ' ').trim() : ''); return { chip: tx(c && c.getSvgRoot()), state: tx(b && b.getField('STATE').getSvgRoot()) }; })(${condOf(u1)})`);
    return program();
  };
  /** right, fill, left, repeat 4 { forward, left, is it a…? (a flower, 3 times), if Olive says yes { water }, right } */
  const buildFlower = async (lang) => {
    for (const op of ['right', 'fill', 'left']) await palTap(op);
    await palTap('repeat');
    const r = await newest('repeat');
    await slot(blockOf(r), 'N', '4', 'the four');
    await selectRep(r, 'the four');
    for (const op of ['fwd', 'left', 'olive:is-it-a']) await palTap(op);
    const isa = await evaluate(`(() => { const l = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="olive:is-it-a"]')]; return l.length ? l[l.length - 1].getAttribute('data-id') : ''; })()`);
    for (const [key, opt] of [['kind', lang === 'fr' ? 'une fleur' : 'a flower'], ['times', '3']]) {
      await tapInWs(`${blockSvg(isa)}.querySelector('.gd-slot[data-slot="${key}"]')`, `is it a…?: its ${key}`);
      await wait(200);
      await tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${opt}"]`), `is it a…?: ${opt}`);
    }
    await selectRep(r, 'the four (again)');
    await palTap('if');
    const f = await newest('if');
    await tapInWs(`${blockSvg(f)}.querySelector('.gd-slot[data-slot="sensor"]')`, 'the if: its sensor');
    await wait(200);
    await tap(first('.bg-blocks-box .gd-picker .gd-opt[data-opt="olive_says:yes"]'), 'the if: Olive says yes');
    await selectRep(f, 'the if');
    await palTap('water');
    await selectRep(r, 'the four (once more)');
    await palTap('right');
    return program();
  };

  await page.setViewport({ width: 1368, height: 912, mobile: false });
  await freshFamily();
  await newPlayer('Sam');
  await lendRobots();

  const home = (id) => { const r = req(id).robotStart; return [r.x, r.y, r.d]; };
  const atHome = (world, id) => !!world && !!world.robots[0] && JSON.stringify([world.robots[0].x, world.robots[0].y, world.robots[0].d]) === JSON.stringify(home(id));

  // ── PS: path-stones ──
  const PS_RUNS = MODE === '3d' ? [{ vp: { width: 1368, height: 912, mobile: false }, lang: 'en', tag: '3d-1368-en' }] : [{ vp: { width: 1368, height: 912, mobile: false }, lang: 'en', tag: '1368-en' }, { vp: { width: 390, height: 844, mobile: true }, lang: 'fr', tag: '390-fr' }];
  for (const run of PS_RUNS) {
    await page.setViewport(run.vp);
    await seg(run.lang === 'fr' ? 'FR' : 'EN');
    await wait(500);
    await openQuest(run.lang, 'path-stones');
    const start = await seen();
    const w0 = await evaluate(WORLD);
    await shot(`iw3s-ps-${run.tag}-01-start`);
    const siteChips = (s) => s.chips.filter((c) => c.kind === 'site').map((c) => c.meter);
    const rockChips = (s) => s.chips.filter((c) => c.kind === 'rock').map((c) => c.meter);
    check(`PS ${run.tag}: the start — four squares of dirt, each 0/4; two rocks, each 8/8; the hod empty; the job is the four squares (${JSON.stringify(w0 && w0.job)})`, JSON.stringify(siteChips(start)) === JSON.stringify(['0/4', '0/4', '0/4', '0/4']) && JSON.stringify(rockChips(start)) === JSON.stringify(['8/8', '8/8']) && (MODE === '3d' || (start.sites.every((s) => s.endsWith(':dirt')) && start.sites.length === 4 && start.load === null)) && !!w0 && !!w0.job && w0.job.targets.length === 4, { start, job: w0 && w0.job });
    const built = await buildStones();
    await gotIt('the last block');
    check(`PS ${run.tag}: the reference built from the drawer by taps — repeat 4 { go to nearest rock, repeat 4 { pick up }, go to nearest site, repeat 4 { put down } } (7 blocks)`, shapeOf(built) === shapeOf(req('path-stones').referenceProgram), { built: shapeOf(built), want: shapeOf(req('path-stones').referenceProgram) });
    await shot(`iw3s-ps-${run.tag}-02-program`);
    const took = { mid: false, home: false };
    const p = await playAndWatch(90000, async (s) => {
      const mid = MODE === '3d' ? s.chips.some((c) => c.kind === 'site' && c.meter === '2/4') : s.sites.some((x) => /gravel|cobbles/.test(x));
      if (!took.mid && mid) (took.mid = true), await shot(`iw3s-ps-${run.tag}-03-mid`);
      if (!took.home && s.bubble.includes(w(run.lang, 'sayHome'))) (took.home = true), await shot(`iw3s-ps-${run.tag}-03-home`);
    });
    const stages = new Set(p.samples.flatMap((s) => s.sites.map((x) => x.split(':')[1])));
    const loads = new Set(p.samples.map((s) => s.load).filter(Boolean));
    const rocksSeen = new Set(p.samples.flatMap((s) => rockChips(s)));
    const homeSaid = p.samples.some((s) => s.bubble.includes(w(run.lang, 'sayHome')));
    const midShot = p.samples.findIndex((s) => s.sites.some((x) => /gravel|cobbles/.test(x)));
    readings[`ps-${run.tag}`] = { stages: [...stages], loads: [...loads], rocks: [...rocksSeen], samples: p.samples.length, owl: p.owl };
    await shot(`iw3s-ps-${run.tag}-04-won`);
    if (MODE === '2d') check(`PS ${run.tag}: played, the squares were seen at every stage — dirt, gravel, cobbles, path — and a stone rode on Cobble’s back (${[...loads].join(' ')})`, ['dirt', 'gravel', 'cobbles', 'path'].every((k) => stages.has(k)) && [...loads].some((l) => l.startsWith('stone:4')), { stages: [...stages], loads: [...loads], midShot });
    check(`PS ${run.tag}: the rocks were mined — their meters went down (${[...rocksSeen].join(' ')}) — and every square ends 4/4, green`, [...rocksSeen].some((m) => m !== '8/8') && JSON.stringify(siteChips(p.last)) === JSON.stringify(['4/4', '4/4', '4/4', '4/4']) && p.last.chips.filter((c) => c.kind === 'site').every((c) => c.full), { rocks: [...rocksSeen], last: p.last.chips });
    check(`PS ${run.tag}: the job done, Cobble says “${w(run.lang, 'sayHome')}” and stands on his start tile facing the way he started`, homeSaid && atHome(p.world, 'path-stones'), { homeSaid, robot: p.world && p.world.robots[0] });
    check(`PS ${run.tag}: the win card, and the owl says “${hint(run.lang, 'hintPerfect').slice(0, 24)}…”`, p.won && p.owl.includes(hint(run.lang, 'hintPerfect').slice(0, 8)), { won: p.won, owl: p.owl });
    await leaveWin(run.lang);
  }

  // ── SB: sami-bench ──
  const SB_RUNS = MODE === '3d' ? [{ vp: { width: 1368, height: 912, mobile: false }, lang: 'en', tag: '3d-1368-en' }] : [{ vp: { width: 1024, height: 768, mobile: false }, lang: 'en', tag: '1024-en' }, { vp: { width: 1368, height: 912, mobile: false }, lang: 'fr', tag: '1368-fr' }];
  for (const run of SB_RUNS) {
    await page.setViewport(run.vp);
    await seg(run.lang === 'fr' ? 'FR' : 'EN');
    await wait(500);
    await openQuest(run.lang, 'sami-bench');
    const start = await seen();
    const w0 = await evaluate(WORLD);
    const bench = w0 && w0.things.find((t) => t.kind === 'site' && t.build === 'bench');
    await shot(`iw3s-sb-${run.tag}-01-start`);
    const benchChip = (s) => (s.chips.find((c) => c.kind === 'site') || {}).meter;
    check(`SB ${run.tag}: the start — the bench site 0/8 with its pegs on dirt (stage 0), three rocks, the job is the bench`, benchChip(start) === '0/8' && (MODE === '3d' || start.bench === '0') && !!bench && w0.things.filter((t) => t.kind === 'rock').length === 3 && JSON.stringify(w0.job.targets) === JSON.stringify(['bench']), { start, bench, rocks: w0 && w0.things.filter((t) => t.kind === 'rock') });
    const built = await buildBench(bench || { x: 4, y: 2 });
    await gotIt('the last block');
    check(`SB ${run.tag}: the reference built from the drawer, the bench picked on the world and the hod from the drawer — until [bench] is done { until [hod] is full { go to nearest rock, pick up }, go to [bench], until [hod] is empty { put down } }`, shapeOf(built) === shapeOf(req('sami-bench').referenceProgram), { built: shapeOf(built), want: shapeOf(req('sami-bench').referenceProgram) });
    const bw = readings.benchWords || {};
    check(`SB ${run.tag}: the outer until reads “${w(run.lang, 'iw3sK_bench')} ${w(run.lang, 'iw3sS_done_bench')}” — the bench’s own words, not a path square’s`, bw.chip === w(run.lang, 'iw3sK_bench') && bw.state === w(run.lang, 'iw3sS_done_bench'), bw);
    await shot(`iw3s-sb-${run.tag}-02-program`);
    const took = { mid: false, home: false };
    const p = await playAndWatch(90000, async (s) => {
      const chip = (s.chips.find((c) => c.kind === 'site') || {}).meter;
      if (!took.mid && (chip === '4/8' || chip === '5/8')) (took.mid = true), await shot(`iw3s-sb-${run.tag}-03-mid`);
      if (!took.home && s.bubble.includes(w(run.lang, 'sayHome'))) (took.home = true), await shot(`iw3s-sb-${run.tag}-03-home`);
    });
    const stages = new Set(p.samples.map((s) => s.bench).filter((b) => b !== null));
    const metersSeen = new Set(p.samples.map(benchChip).filter(Boolean));
    const homeSaid = p.samples.some((s) => s.bubble.includes(w(run.lang, 'sayHome')));
    readings[`sb-${run.tag}`] = { stages: [...stages], meters: [...metersSeen], owl: p.owl };
    await shot(`iw3s-sb-${run.tag}-04-built`);
    if (MODE === '2d') check(`SB ${run.tag}: played, the bench rose through every stage — ${[...stages].join(' → ')} — and Sami sits on it built`, ['0', '1', '2', '3', '4'].every((k) => stages.has(k)) && p.last.sits, { stages: [...stages], sits: p.last.sits });
    check(`SB ${run.tag}: its meter counted the stones up (${[...metersSeen].join(' ')}) to 8/8, green`, metersSeen.size >= 4 && benchChip(p.last) === '8/8' && p.last.chips.find((c) => c.kind === 'site').full, { meters: [...metersSeen], last: p.last.chips });
    check(`SB ${run.tag}: built, Cobble says “${w(run.lang, 'sayHome')}” and is home on his start tile; the win card`, homeSaid && atHome(p.world, 'sami-bench') && p.won, { homeSaid, robot: p.world && p.world.robots[0], won: p.won, owl: p.owl });
    await leaveWin(run.lang);
  }

  // ── RF: rock-flower (2D only: its look is the flowers', the same in both kits) ──
  if (MODE === '2d') {
    for (const run of [{ vp: { width: 1024, height: 768, mobile: false }, lang: 'en', tag: '1024-en' }, { vp: { width: 1368, height: 912, mobile: false }, lang: 'fr', tag: '1368-fr' }]) {
      await page.setViewport(run.vp);
      await seg(run.lang === 'fr' ? 'FR' : 'EN');
      await wait(500);
      await openQuest(run.lang, 'rock-flower');
      const start = await seen();
      await shot(`iw3s-rf-${run.tag}-01-start`);
      const tulipChips = (s) => s.chips.filter((c) => c.kind === 'tulip').map((c) => c.meter);
      check(`RF ${run.tag}: the start — two flowers, each 0/1, Echo’s can empty`, JSON.stringify(tulipChips(start)) === JSON.stringify(['0/1', '0/1']), start);
      await buildFlower(run.lang);
      await gotIt('the last block');
      const asked0 = stubCalls.filter((c) => c.body && c.body.rung === 'is-it-a').length;
      const took = { home: false };
      const p = await playAndWatch(90000, async (s) => {
        if (!took.home && s.bubble.includes(w(run.lang, 'sayHome'))) (took.home = true), await shot(`iw3s-rf-${run.tag}-03-home`);
      });
      const asks = stubCalls.filter((c) => c.body && c.body.rung === 'is-it-a').slice(asked0).map((c) => String(c.body.slots && c.body.slots.thing));
      const puddles = await evaluate(`document.querySelectorAll('.bg-stage [data-puddle]').length`);
      const homeSaid = p.samples.some((s) => s.bubble.includes(w(run.lang, 'sayHome')));
      readings[`rf-${run.tag}`] = { asks, owl: p.owl };
      await shot(`iw3s-rf-${run.tag}-04-won`);
      check(`RF ${run.tag}: Olive asked three times about each of the four things ahead (${asks.length} asks); the two flowers drank (1/1, green), no puddle`, asks.length === 12 && JSON.stringify(tulipChips(p.last)) === JSON.stringify(['1/1', '1/1']) && p.last.chips.filter((c) => c.kind === 'tulip').every((c) => c.full) && puddles === 0, { asks, last: p.last.chips, puddles });
      check(`RF ${run.tag}: Echo walked home (“${w(run.lang, 'sayHome')}”, on the start tile); the win card`, homeSaid && atHome(p.world, 'rock-flower') && p.won, { homeSaid, robot: p.world && p.world.robots[0], won: p.won, owl: p.owl });
      await leaveWin(run.lang);
    }
  }

  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
})
  .then((out) => {
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} clauses passed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  });
