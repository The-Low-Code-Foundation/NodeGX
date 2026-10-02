#!/usr/bin/env node
/**
 * IG-007 (P106 s2) — drive Olive's Island's Workshop with the renderer in place, on the DEPLOYED template.
 *
 * The deploy is the page drive's (`drive-cg003-pages.js assemble` + `nodegx deploy`): the template exactly as
 * `npm run template:garden` writes it, garden-3d-kit in its `noodl_modules/`. A stub Olive answers `/__garden/*` inside
 * Chrome, as in the page drive. Every press is a CDP mouse event at an element `elementFromPoint` says is on top.
 *
 * Usage:
 *   node scripts/devtools/drive-ig007-workshop.js <deploy-dir> --mode 3d   [--shots <dir>] [--json <file>]
 *   node scripts/devtools/drive-ig007-workshop.js <deploy-dir> --mode nogl [--shots <dir>] [--json <file>]
 *
 * --mode 3d    Chrome with SOFTWARE WebGL (`--use-angle=swiftshader`): the Workshop draws Garden 3D. AC1 — the tulips
 *              request end to end (the pad drives Pip through the request's reference program, the fold, Play, the win), and at
 *              every step the ENGINE's world (Noodl.Variables.gardenWorld) is what the 3D node draws: Pip's tile and
 *              facing, the watered tulips. Predict's tap goes through the 3D canvas (Tile Tapped on the same wires).
 *              AC4's slow arm: a main-thread hog makes every frame > 50 ms; Too Slow fires, the page writes
 *              { mode: 2d, why: slow } and swaps in Garden; the next Workshop open is 2D from the first frame; the
 *              Grown-ups page says why, and its switch brings 3D back.
 * --mode nogl  Chrome with `--disable-3d-apis` (Supported forced false): the Workshop draws Garden (2D) with no
 *              console error, the choice { mode: 2d, why: unsupported } is written, the tulips pass end to end on 2D,
 *              the next open never mounts the 3D node, and the Grown-ups page names the renderer.
 *
 * 🔴 The frame times under swiftshader are a software renderer's on this Mac's CPU: a readout, never AC3 (the tablet).
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
const MODE = arg('--mode');
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
if (!DIR || DIR.startsWith('--') || !['3d', 'nogl'].includes(MODE)) {
  console.error('usage: drive-ig007-workshop.js <deploy-dir> --mode 3d|nogl [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// The words, from the deployed project's own table (the page drive reads the project; the deploy carries the same JSON).
function loadWords() {
  const REPO = path.join(__dirname, '..', '..');
  const file = path.join(REPO, 'templates', 'bot-garden', 'components', 'Data', 'Words', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  const rows = JSON.parse(list.find((n) => n.type === 'Static Data').parameters.json);
  const out = {};
  for (const r of rows) out[r.key] = r.en;
  return out;
}
const WORDS = loadWords();
const w = (key, name = 'Pip') => String(WORDS[key] || '').split('{b}').join(name);

/**
 * The tulip request, from the template's own Data/Requests (the one whose title is rqTulipsTitle): where Pip starts,
 * his can, and the reference program. IG-002 (P106 s2) rewrote it as fetch-and-return; nothing below types a tile or a
 * press — the presses are the reference program laid out, the fold is its first repeat, the ends are the engine's.
 */
function loadTulips() {
  const REPO = path.join(__dirname, '..', '..');
  const nodes = JSON.parse(fs.readFileSync(path.join(REPO, 'templates', 'bot-garden', 'components', 'Data', 'Requests', 'nodes.json'), 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
  const rows = JSON.parse(list.find((n) => n.type === 'Static Data').parameters.json);
  return rows.find((r) => r.copyKeys && r.copyKeys.title === 'rqTulipsTitle');
}
const TULIPS = loadTulips();
/** A program as the pad presses that record it: a repeat laid out n times. */
const layOut = (blocks) => blocks.flatMap((b) => (b.t === 'repeat' ? Array.from({ length: Number(b.n) || 0 }, () => layOut(b.body || [])).flat() : [b.t]));
const PRESSES = layOut(TULIPS.referenceProgram);
const FIRST_REPEAT = TULIPS.referenceProgram.find((b) => b.t === 'repeat');
/**
 * Blocks drawn once the fold is taken: the blocks outside the repeat, the repeat, and its body. P108 IW-003 (lane M): the
 * body as recorded — flat (the pass holds its three pours; the first fold is the pass ×3, the pours fold after).
 */
const FOLDED = TULIPS.referenceProgram.length + (FIRST_REPEAT ? layOut(FIRST_REPEAT.body).length : 0);
const START = TULIPS.robotStart;
// P108 s8: the can lies on the grass (Pip starts with none: null); its size is the can lying there.
const START_CAN = START.can === undefined ? null : START.can;
const CAN_MAX = (TULIPS.things.find((t) => t.kind === 'can') || {}).max || START.canMax;
const TULIP_COUNT = TULIPS.things.filter((t) => t.kind === 'tulip').length;

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

/** Counts every mount of either world, from the first byte of every document (a MutationObserver at document start). */
const MOUNT_COUNTER = `(() => {
  window.__mounts = { gd: 0, gd3: 0 };
  const seen = new WeakSet();
  const scan = (root) => {
    if (!root || !root.querySelectorAll) return;
    const all = [root, ...root.querySelectorAll('.gd-world, [data-gd3-world]')];
    for (const e of all) {
      if (!e.matches || seen.has(e)) continue;
      if (e.matches('[data-gd3-world]')) { seen.add(e); window.__mounts.gd3++; }
      else if (e.matches('.gd-world')) { seen.add(e); window.__mounts.gd++; }
    }
  };
  new MutationObserver((list) => { for (const m of list) for (const n of m.addedNodes) scan(n); }).observe(document, { childList: true, subtree: true });
})();`;

const CHROME = MODE === '3d' ? { gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : { chromeArgs: ['--disable-3d-apis'] };

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
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: MOUNT_COUNTER });

  const until = async (expr, ok, ms = 8000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(150);
      last = await evaluate(expr);
    }
    return last;
  };
  /**
   * A screenshot under software GL stalls the frames the fallback rule times (a capture reads the canvas back): after
   * one, wait until the 3D node's Frame Ms is back under 34 ms (≤ 4 s), so the drive's own instrument never trips the
   * rule it is grading. Run 2 of this drive lost its 3D node between two shots (Frame Ms read 63.1 just before).
   */
  const shot = async (name) => {
    if (!SHOTS) return;
    await page.screenshot(path.join(SHOTS, `${name}.png`));
    if (MODE === '3d') await until(`(() => { const e = document.querySelector('.bg-stage [data-gd3-world]'); return e ? Number(e.getAttribute('data-frame-ms') || 0) : 0; })()`, (ms) => ms <= 34, 4000);
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
  const key = (op) => tap(first(`.bg-pad .bg-key-${op}`), `key ${op}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const stored = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { const v = k ? JSON.parse(localStorage.getItem(k)) : null; return v ? (v.renderer === undefined ? null : v.renderer) : null; } catch (e) { return 'error ' + e; } })()`);
  const mounts = () => evaluate('window.__mounts ? { ...window.__mounts } : null');
  const worlds = () => evaluate(`({ gd: document.querySelectorAll('.bg-stage .gd-world').length, gd3: document.querySelectorAll('.bg-stage [data-gd3-world]').length })`);
  const ROOT = `document.querySelector('.bg-stage [data-gd3-world]')`;
  const attrs = () => evaluate(`(() => { const e = ${ROOT}; if (!e) return null; const o = {}; for (const a of e.attributes) o[a.name] = a.value; return o; })()`);
  /** The engine's world (the Variable the Runner and the pad write) beside what the 3D node draws of it. */
  const pair = () =>
    evaluate(`(() => {
      const W = typeof Noodl !== 'undefined' && Noodl.Variables ? Noodl.Variables.gardenWorld : null;
      const root = ${ROOT};
      const eng = root && root.gd3;
      const bot = W && W.robots && W.robots[0];
      const tulips = W && Array.isArray(W.things) ? W.things.filter((t) => t.kind === 'tulip') : [];
      const drawn = eng && eng.built ? eng.built.things.filter((g) => g.userData.kind === 'tulip') : [];
      const r = eng && eng.robotAt(0);
      const map = eng && eng.world && eng.world.map;
      return {
        engine: bot ? { x: bot.x, y: bot.y, d: bot.d, wet: tulips.filter((t) => t.watered === true || t.state === 'watered' || t.state === 'wet').length, tulips: tulips.length, can: bot.can === undefined ? null : bot.can } : null,
        drawn: r && map ? { x: Math.round(r.x + map.w / 2 - 0.5), y: Math.round(r.z + map.h / 2 - 0.5), d: ((Math.round(-r.yaw / (Math.PI / 2)) % 4) + 4) % 4, gliding: r.gliding, wet: drawn.filter((g) => g.userData.wet).length, tulips: drawn.length, can: (() => { let lv = null; const g = eng.built && eng.built.robots[0]; if (g) g.traverse((o) => { if (o.name === 'level') lv = o.userData.can; }); return lv; })() } : null
      };
    })()`);
  /** Wait until the 3D node has settled on the engine's world (a glide takes Step Ms). */
  const agree = async (label, ms = 4000) => {
    const end = Date.now() + ms;
    let last = await pair();
    const same = (l) => !!(l.engine && l.drawn && l.engine.x === l.drawn.x && l.engine.y === l.drawn.y && l.engine.d === l.drawn.d && l.engine.wet === l.drawn.wet && l.engine.can === l.drawn.can);
    while (Date.now() < end && !(same(last) && !last.drawn.gliding)) {
      await wait(120);
      last = await pair();
    }
    const ok = same(last);
    (readings.agree = readings.agree || []).push({ label, ...last });
    return { ok, last };
  };

  const freshFamily = async () => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
  };
  const openTulips = async () => {
    await tap(byText('.bg-quest', w('rqTulipsTitle')), 'the tulip request');
    await until('location.pathname', (p) => p === '/workshop');
    await wait(400);
  };

  await page.setViewport({ width: 1368, height: 912, mobile: false });
  await freshFamily();
  await tap(first('button.bg-profile-new'), 'new player (the card)');
  await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
  await wait(250);
  await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
  await tap(byText('button.bg-btn', w('create')), 'create');
  const island = await until('location.pathname', (p) => p === '/island');
  // IG-004 (P106 s3): the Island is drawn behind the SAME renderer rule now (Island/World), so the island is where the
  // rule first applies: in 3D nothing is stored (it draws); with no WebGL2 the island writes { 2d, unsupported } itself.
  const boot = MODE === '3d' ? await stored() : await until(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); try { return k ? JSON.parse(localStorage.getItem(k)).renderer || null : null; } catch (e) { return null; } })()`, (v) => !!v, 6000);
  check(`BOOT (${MODE}): a new profile lands on the island; the renderer rule applies there first (IG-004): ${MODE === '3d' ? 'nothing stored, 3D draws' : '{ 2d, unsupported } stored by the island'}`, island === '/island' && (MODE === '3d' ? boot === null : !!boot && boot.mode === '2d' && boot.why === 'unsupported'), { island, stored: boot });
  await wait(600);
  await openTulips();

  if (MODE === '3d') {
    // ── AC1: the Workshop draws Garden 3D ──
    const ready = await until(`(() => { const e = ${ROOT}; return e ? { supported: e.getAttribute('data-supported'), ready: e.getAttribute('data-ready'), helpers: e.getAttribute('data-helpers'), w: e.getAttribute('data-w'), h: e.getAttribute('data-h') } : null; })()`, (v) => v && v.ready === 'true' && v.w === '8', 12000);
    const wl = await worlds();
    readings.boot3d = { ready, worlds: wl, mounts: await mounts(), stored: await stored() };
    check('AC1: the Workshop draws Garden 3D (Supported true, Ready, the 8×6 tulip plot, garden-kit’s helpers) and no 2D world', ready && ready.supported === 'true' && ready.ready === 'true' && ready.w === '8' && ready.h === '6' && ready.helpers === 'sibling' && wl.gd3 === 1 && wl.gd === 0, readings.boot3d);
    await wait(800);
    await shot('ac1-3d-01-start');
    const start = await agree('start');
    check(`AC1: the 3D node draws the engine’s start — Pip on ${START.x},${START.y} facing d ${START.d}, the can ${START_CAN === null ? 'not in hand' : `at ${START_CAN} of ${CAN_MAX}`}, ${TULIP_COUNT} dry tulips (the request's own start)`, start.ok && start.last.engine.x === START.x && start.last.engine.y === START.y && start.last.engine.d === START.d && start.last.engine.can === START_CAN && start.last.drawn.tulips === TULIP_COUNT && start.last.engine.wet === 0, start.last);

    // Drive with the pad: Teach, then the reference program laid out press by press; after every press the engine
    // and the 3D node agree (tile, facing, wet tulips, the can's level).
    await control('rec');
    const padShown = await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean);
    check('AC1: Teach shows the pad over the 3D world (the pad keys are on top: elementFromPoint)', padShown && (await where(first('.bg-pad .bg-key-fwd'), false)).hit, padShown);
    const steps = [];
    let midGlide = null;
    for (let k = 0; k < PRESSES.length; k++) {
      const before = (await pair()).engine;
      await key(PRESSES[k]);
      if (PRESSES[k] === 'fwd' && !midGlide) {
        await wait(120);
        midGlide = await pair();
        readings.midGlide = midGlide;
        await shot('ac1-3d-02-mid-glide');
      }
      const a = await agree(`press ${k + 1} ${PRESSES[k]}`);
      steps.push({ k: k + 1, op: PRESSES[k], ok: a.ok, before, after: a.last.engine, drawn: a.last.drawn });
      if (k === FIRST_REPEAT.body.length - 1) await shot('ac1-3d-03-first-tulip');
    }
    readings.steps = steps;
    const bad = steps.filter((x) => !x.ok);
    check(`AC1: all ${PRESSES.length} presses of the reference program — after EVERY press the 3D node draws what the engine holds (tile, facing, wet tulips, can level)`, bad.length === 0 && steps.length === PRESSES.length, bad.slice(0, 3));
    const fill = steps.find((x) => x.op === 'fill');
    check('AC1: fill — the engine’s can goes to canMax and the 3D can’s level shows it', !!fill && fill.ok && fill.after.can === CAN_MAX && fill.drawn.can === CAN_MAX, fill);
    const fwd = steps.find((x) => x.op === 'fwd' && (x.after.x !== x.before.x || x.after.y !== x.before.y));
    check('AC1: a forward — the engine moves Pip one tile and the 3D node glides him there (mid-way it was gliding)', !!fwd && fwd.ok && Math.abs(fwd.after.x - fwd.before.x) + Math.abs(fwd.after.y - fwd.before.y) === 1 && midGlide && midGlide.drawn && midGlide.drawn.gliding === true, { fwd, midGlide });
    const turn = steps.find((x) => x.op === 'left' || x.op === 'right');
    check('AC1: a turn — the engine’s facing changes by a quarter and the 3D node’s does too', !!turn && turn.ok && ((turn.after.d - turn.before.d + 4) % 4 === (turn.op === 'left' ? 3 : 1)), turn);
    // P108 IW-003 (lane M): a tulip wants three drinks — the pour that fills one (its last drink) makes it wet.
    const water = steps.find((x) => x.op === 'water' && x.after.wet > x.before.wet);
    check('AC1: water — the pour that fills a tulip: one more tulip wet and one drop less in the can, in the engine and in 3D', !!water && water.ok && water.after.wet === water.before.wet + 1 && water.after.can === water.before.can - 1 && water.drawn.wet === water.after.wet, water);
    const blocks = await evaluate(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`);
    const last = steps[steps.length - 1] || {};
    check(`AC1: ${PRESSES.length} presses, ${PRESSES.length} blocks; at the end all ${TULIP_COUNT} tulips are wet in both`, blocks === PRESSES.length && last.ok && last.after.wet === TULIP_COUNT && last.drawn.wet === TULIP_COUNT, { blocks, last });
    await shot('ac1-3d-04-taught');
    // The fold.
    const tidy = await until(`(() => { const e = document.querySelector('.bg-tidy'); return e && e.offsetParent !== null ? e.innerText : ''; })()`, Boolean);
    await tap(first('.bg-tidy .bg-i-tidy'), 'Fold it');
    const folded = await until(`(() => { const r = document.querySelector('.gd-prog .gd-blk[data-t="repeat"]'); return r ? document.querySelectorAll('.gd-prog .gd-blk[data-id]').length : 0; })()`, (n) => n === FOLDED);
    check(`AC1: the fold is offered and taken — the reference program's pass ×3 (${FOLDED} blocks: a repeat holding ${layOut(FIRST_REPEAT.body).length})`, !!tidy && folded === FOLDED, { tidy, folded });
    // Play: the world is reset to its start, then the program runs; sample the pair while it plays.
    await control('play');
    const samples = [];
    const t0 = Date.now();
    let won = false;
    while (Date.now() - t0 < 60000 && !won) {
      const p = await pair();
      if (p.engine && p.drawn) samples.push(p);
      won = await evaluate(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`);
      // No screenshot while it plays: a capture under software GL stalls the frames the rule is timing.
      await wait(200);
    }
    const settled = await agree('after the win', 3000);
    readings.play = { samples: samples.length, distinctTiles: [...new Set(samples.map((s) => `${s.engine.x},${s.engine.y}`))].length, won, settled: settled.last };
    check(`AC1: Play runs the folded program to the win card; the 3D node ends where the engine ends (can too), all ${TULIP_COUNT} tulips wet in both`, won && settled.ok && settled.last.engine.wet === TULIP_COUNT && settled.last.drawn.wet === TULIP_COUNT && readings.play.distinctTiles >= 4, readings.play);
    const endTile = settled.last.engine;
    await shot('ac1-3d-06-win');
    // The win card's backdrop blur over a MOVING canvas made every software-GL frame slow and tripped the rule (run 3
    // of this drive): the scene is drawn on demand now, so under the card it is still, draws nothing and is not timed.
    await wait(4000);
    const underCard = { attrs: await attrs(), worlds: await worlds(), stored: await stored() };
    readings.underCard = underCard;
    check('AC4: four seconds of the win card over the still 3D scene — nothing drawn (idle), no Too Slow, still 3D', underCard.attrs && underCard.attrs['data-idle'] === 'true' && !underCard.attrs['data-too-slow'] && underCard.worlds.gd3 === 1 && underCard.stored === null, underCard);
    const fm = await attrs();
    readings.frame = { frameMs: fm && fm['data-frame-ms'], drawCalls: fm && fm['data-draw-calls'], meshes: fm && fm['data-meshes'], tooSlow: fm && fm['data-too-slow'], renderer: 'swiftshader (software), this Mac' };
    console.log(`FRAME READOUT  Workshop 8×6 under software GL: p95 ${readings.frame.frameMs} ms, ${readings.frame.drawCalls} draw calls, ${readings.frame.meshes} meshes`);
    check('AC1: through the whole request the rule stayed on 3D (no Too Slow, nothing stored)', !(fm && fm['data-too-slow']) && (await stored()) === null, { frame: readings.frame, stored: await stored() });
    // AC5: a close look at Pip for the side-by-side — the win card closed with Keep tinkering, a wheel zoom over him.
    const keep = await evaluate(`!![...document.querySelectorAll('.bg-win-card button')].find((b) => b.offsetParent !== null && !b.innerText.includes(${JSON.stringify(w('winIsland'))}))`);
    if (keep) {
      await tap(`[...document.querySelectorAll('.bg-win-card button')].find((b) => b.offsetParent !== null && !b.innerText.includes(${JSON.stringify(w('winIsland'))}))`, 'keep tinkering');
      const pipAt = () => evaluate(`(() => { const r = ${ROOT}; const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${endTile.x}, ${endTile.y}); return { x: c.left + s.sx, y: c.top + s.sy, cx: c.left + c.width / 2, cy: c.top + c.height / 2 }; })()`);
      let pip = await pipAt();
      for (let i = 0; i < 2; i++) await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(pip.cx), y: Math.round(pip.cy), deltaX: 0, deltaY: -240 });
      await wait(300);
      // Drag the ground under Pip to the middle of the stage (a pan follows the finger).
      pip = await pipAt();
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(pip.x), y: Math.round(pip.y), button: 'left', clickCount: 1 });
      for (let i = 1; i <= 10; i++) await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(pip.x + ((pip.cx - pip.x) * i) / 10), y: Math.round(pip.y + ((pip.cy - pip.y) * i) / 10), button: 'left' });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(pip.cx), y: Math.round(pip.cy), button: 'left', clickCount: 1 });
      await wait(600);
      readings.closeup = { before: pip, after: await pipAt(), state: await evaluate(`${ROOT}.gd3.state`) };
      await shot('ac5-3d-closeup');
      await tab(0);
    } else {
      await tap(byText('.bg-win-card button', w('winIsland')), 'back to the island');
    }

    // Predict through the 3D canvas: back to the island, the tulips again, a few presses, then the islander's challenge
    // (P106 IG-003: Predict is no longer a button — Drive with a program not yet played asks it, Pip back at the start).
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
    await openTulips();
    await until(`(() => { const e = ${ROOT}; return e && e.getAttribute('data-ready'); })()`, (v) => v === 'true', 12000);
    // The first presses of the reference program (up to its first forward): the real end is where the engine has Pip
    // when teaching is done; the wrong tile is any other tile on the canvas.
    await control('rec');
    const firstFwd = PRESSES.indexOf('fwd');
    for (const op of PRESSES.slice(0, firstFwd + 1)) await key(op);
    const realEnd = (await pair()).engine;
    await control('drive');
    const asked = await until(`document.body.innerText.includes(${JSON.stringify(w('ig3PredictAsk'))})`, Boolean);
    const tilePoint = async (x, y) =>
      evaluate(`(() => { const r = ${ROOT}; const c = r.querySelector('[data-gd3-canvas]').getBoundingClientRect(); const s = r.gd3.screenOfTile(${x}, ${y}); return { x: c.left + s.sx, y: c.top + s.sy, top: (() => { const at = document.elementFromPoint(c.left + s.sx, c.top + s.sy); return at ? (at.getAttribute('data-gd3-canvas') ? 'canvas' : at.className) : null; })() }; })()`);
    const wrong = { x: (realEnd.x + 3) % 8, y: (realEnd.y + 2) % 6 };
    const miss = await tilePoint(wrong.x, wrong.y);
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(miss.x), y: Math.round(miss.y), button: 'left', clickCount: 1 });
    const flag = await until(`(() => { const e = ${ROOT}; const f = e && e.gd3.built ? e.gd3.built.things.find((g) => g.userData.kind === 'flag') : null; return f ? f.userData.x + ',' + f.userData.y : null; })()`, Boolean, 4000);
    await shot('ac1-3d-07-predict-miss');
    check(`AC1: Predict through the 3D canvas — a tap on tile ${wrong.x},${wrong.y} (the canvas is on top there) comes out of Tile Tapped, and the real end ${realEnd.x},${realEnd.y} is drawn as the flag in 3D`, asked && miss.top === 'canvas' && flag === `${realEnd.x},${realEnd.y}`, { asked, wrong, miss, flag, realEnd });
    // A miss settles the challenge for that program; one more block (a turn: the end tile stays) asks it again.
    await control('rec');
    await key('left');
    await control('drive');
    await until(`document.body.innerText.includes(${JSON.stringify(w('ig3PredictAsk'))})`, Boolean);
    const stillThere = { worlds: await worlds(), stored: await stored(), attrs: await attrs() };
    readings.beforeHit = stillThere;
    if (!stillThere.worlds.gd3) throw new Error('the 3D node is gone before the Predict hit: ' + JSON.stringify(stillThere));
    const hit = await tilePoint(realEnd.x, realEnd.y);
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: Math.round(hit.x), y: Math.round(hit.y), button: 'left', clickCount: 1 });
    const moved = await until(`(() => { const W = Noodl.Variables.gardenWorld; const b = W && W.robots && W.robots[0]; return b ? b.x + ',' + b.y : null; })()`, (v) => v === `${realEnd.x},${realEnd.y}`, 8000);
    const afterHit = await agree('predict hit');
    check(`AC1: a right tap on ${realEnd.x},${realEnd.y} plays from the start; the engine and the 3D node end there`, moved === `${realEnd.x},${realEnd.y}` && afterHit.ok && afterHit.last.drawn.x === realEnd.x && afterHit.last.drawn.y === realEnd.y, { ...afterHit.last, stored: await stored(), worlds: await worlds(), errors: page.consoleErrors.slice(0, 3) });
    // P106 IG-003: the hit leaves the tick on the tile (and "You were right!" on the islander's card) — in 3D too.
    const tick3d = await evaluate(`(() => { const e = ${ROOT}; const t = e && e.gd3.built ? e.gd3.built.things.find((g) => g.userData.kind === 'tick') : null; return t ? t.userData.x + ',' + t.userData.y : null; })()`);
    await shot('ac1-3d-08-predict-hit');
    check(`AC1 (IG-003): after the right tap the tick stands on ${realEnd.x},${realEnd.y} in 3D and the islander says "${w('ig3PredictRight')}"`, tick3d === `${realEnd.x},${realEnd.y}` && (await evaluate('document.body.innerText')).includes(w('ig3PredictRight')), { tick3d });

    // ── AC4, the slow arm: a main-thread hog (a slow computer, or Olive on the same CPU) while a finger is held on the
    // world (the scene is drawn on demand: a held finger keeps it drawing, as a child panning while Olive thinks) ──
    const mounts0 = await mounts();
    const centre = await evaluate(`(() => { const c = ${ROOT}.querySelector('[data-gd3-canvas]').getBoundingClientRect(); return { x: Math.round(c.left + c.width / 2), y: Math.round(c.top + c.height / 2) }; })()`);
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: centre.x, y: centre.y, button: 'left', clickCount: 1 });
    const hogAt = Date.now();
    await evaluate(`window.__hog = setInterval(() => { const t = performance.now(); while (performance.now() - t < 75) {} }, 0)`);
    const swapped = await until(`(() => { const s = document.querySelectorAll('.bg-stage .gd-world').length; const t = document.querySelectorAll('.bg-stage [data-gd3-world]').length; return { gd: s, gd3: t }; })()`, (v) => v.gd === 1 && v.gd3 === 0, 20000);
    const swapMs = Date.now() - hogAt;
    await evaluate('clearInterval(window.__hog)');
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: centre.x + 30, y: centre.y + 30, button: 'left', clickCount: 1 });
    await wait(500);
    const slowStored = await stored();
    readings.slow = { swapped, stored: slowStored, mountsBefore: mounts0, swapMs };
    check('AC4: frames above 50 ms for 3 s — Too Slow fires, the page writes { 2d, slow } and swaps in the 2D Garden', swapped.gd === 1 && swapped.gd3 === 0 && slowStored && slowStored.mode === '2d' && slowStored.why === 'slow', readings.slow);
    await shot('ac4-3d-08-swapped-to-2d');
    // The next open is instant: 2D from the first frame, the 3D node never mounted.
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
    const m1 = await mounts();
    await openTulips();
    await wait(1500);
    const m2 = await mounts();
    const wl2 = await worlds();
    readings.nextOpen = { before: m1, after: m2, worlds: wl2 };
    check('AC4: the next Workshop open is the 2D Garden from the start — the 3D node is never mounted', m2.gd3 === m1.gd3 && m2.gd > m1.gd && wl2.gd === 1 && wl2.gd3 === 0, readings.nextOpen);
    // The Grown-ups page says why, and its switch brings 3D back.
    await tab(3);
    await until('location.pathname', (p) => p === '/grown-ups');
    await wait(800);
    const line = await evaluate(`(() => { const e = document.querySelector('.bg-renderer-line'); return e ? e.innerText : null; })()`);
    await shot('ac4-3d-09-grown-ups-slow');
    check('AC4: the Grown-ups page names the renderer and why ("too slow")', line === w('guRendSlow'), { line, want: w('guRendSlow') });
    await tap(byText('.bg-renderer-switch .bg-seg-btn', w('guRend3d')), 'the 3D island switch');
    await wait(500);
    const back3d = await stored();
    const line3d = await evaluate(`(() => { const e = document.querySelector('.bg-renderer-line'); return e ? e.innerText : null; })()`);
    check('AC4: the switch writes { 3d, grown-up } and the line says 3D', back3d && back3d.mode === '3d' && back3d.why === 'grown-up' && line3d === w('guRend3dLine'), { back3d, line3d });
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
    await openTulips();
    const again = await until(`(() => { const e = ${ROOT}; return e ? e.getAttribute('data-ready') : null; })()`, (v) => v === 'true', 12000);
    check('AC4: … and the Workshop draws Garden 3D again', again === 'true' && (await worlds()).gd === 0, { again, worlds: await worlds() });
  } else {
    // ── AC4, Supported forced false: the 2D Garden, the choice written, no console error ──
    const settled = await until(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); let r = null; try { r = JSON.parse(localStorage.getItem(k)).renderer || null; } catch (e) {} return { gd: document.querySelectorAll('.bg-stage .gd-world').length, gd3: document.querySelectorAll('.bg-stage [data-gd3-world]').length, stored: r }; })()`, (v) => v.gd === 1 && v.gd3 === 0 && !!v.stored, 10000);
    const m = await mounts();
    readings.nogl = { settled, mounts: m, webgl2: await evaluate(`!!document.createElement('canvas').getContext('webgl2')`) };
    check('AC4: with 3D APIs disabled there is no WebGL2 (the forced arm is real)', readings.nogl.webgl2 === false, readings.nogl.webgl2);
    check('AC4: Supported false — the page writes { 2d, unsupported } and the Workshop draws the 2D Garden (the 3D node tried once and is gone)', settled.gd === 1 && settled.gd3 === 0 && settled.stored && settled.stored.mode === '2d' && settled.stored.why === 'unsupported' && m.gd3 === 1, readings.nogl);
    await shot('ac4-nogl-01-workshop-2d');
    // The same path on 2D: the reference program pressed, the fold, play, win.
    await control('rec');
    await until(`!!document.querySelector('.bg-pad .bg-key-fwd')`, Boolean);
    for (const op of PRESSES) await key(op);
    const taughtN = await evaluate(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`);
    await until(`(() => { const e = document.querySelector('.bg-tidy'); return e && e.offsetParent !== null; })()`, Boolean);
    await tap(first('.bg-tidy .bg-i-tidy'), 'Fold it');
    const foldedN = await until(`document.querySelectorAll('.gd-prog .gd-blk[data-id]').length`, (n) => n === FOLDED);
    await control('play');
    const won = await until(`(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`, Boolean, 60000);
    check(`AC4: the tulips pass end to end on the 2D Garden (teach ${PRESSES.length}, fold to ${FOLDED}, play, the win card)`, won && taughtN === PRESSES.length && foldedN === FOLDED, { won, taughtN, foldedN });
    await shot('ac4-nogl-02-win');
    await tap(byText('.bg-win-card button', w('winIsland')), 'back to the island');
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
    const m1 = await mounts();
    await openTulips();
    await wait(1500);
    const m2 = await mounts();
    readings.nextOpen = { before: m1, after: m2, worlds: await worlds() };
    check('AC4: the next Workshop open is instant — the 3D node is never mounted again, the 2D Garden is', m2.gd3 === m1.gd3 && m2.gd > m1.gd && readings.nextOpen.worlds.gd === 1, readings.nextOpen);
    await tab(3);
    await until('location.pathname', (p) => p === '/grown-ups');
    await wait(800);
    const g = await evaluate(`(() => { const e = document.querySelector('.bg-renderer-line'); const on = [...document.querySelectorAll('.bg-renderer-switch .bg-seg-btn')].map((b) => ({ text: b.innerText, bg: getComputedStyle(b).backgroundColor })); return { line: e ? e.innerText : null, on }; })()`);
    readings.grown = g;
    await shot('ac4-nogl-03-grown-ups');
    check('AC4: the Grown-ups page names the renderer — the flat garden, because this computer cannot draw 3D — and the switch shows Flat garden pressed', g.line === w('guRendNoGl') && g.on.length === 2 && g.on[1].text === w('guRend2d') && g.on[1].bg !== g.on[0].bg, g);
  }

  check(`0 console errors through the ${MODE} drive`, page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check(`0 network errors through the ${MODE} drive`, page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, mode: MODE, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
