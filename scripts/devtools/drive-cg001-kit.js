#!/usr/bin/env node
/**
 * CG-001 — drive the garden kit in a headless Chrome, on the DEPLOYED two-module project (D41).
 *
 * The project is `packages/noodl-mcp/tests/fixtures/garden-app` with `garden-kit` and `game-kit` copied in beside it
 * (nothing else — a kit that works beside 33 modules can fail beside two). Every kit port is fed by a Variable, so
 * this drive plays the engine's part through `Noodl.Variables.set(...)` and reads what the kit drew. It never runs a
 * program: it moves the robot the way CG-002's interpreter will, one port write at a time.
 *
 * Usage:
 *   node scripts/devtools/drive-cg001-kit.js assemble <project-dir>
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs <project-dir> <deploy-dir> --allow-development-engine
 *   node scripts/devtools/drive-cg001-kit.js <deploy-dir> [--shots <dir>] [--json <file>]
 *
 * 🔴 The deploy exits 0 EVEN WHEN IT REFUSES TO WRITE (it prints {"ok":false}); check <deploy-dir>/index.html's mtime.
 *
 * Clauses (each beside its known-firing half — the marker Text and the Avatar prove the page and game-kit drew):
 *   AC1  both kits on the page under Group roots, beside a game-kit Avatar
 *   LOOK the tiles are sized and paint apart (path, water unlike grass) and the tree, tulip and house draw their art
 *   AC3  a drag with pointerType touch, pen and mouse reorders and publishes Program; a drag ending outside puts it back
 *   AC5  Band 1 → 2 restyles the same element (no remount)
 *   AC6  8×6 and 12×8 at 1368×912 and 390×844: no horizontal scroll, the face ≥ 20px
 *   AC7  step, turn, bump, water, puddle — each read off the DOM and screenshotted, EN and FR
 *   AC8  two robots on two tiles and on one tile: two labelled sprites whose boxes do not intersect
 *   AC9  12×8 with two robots under CPU throttling ×4: ms from a Robots write to the next paint, p50 / p95 / max — a READOUT
 * P108 IW-002 AC6 (lane D), at the end — a job world made by the ENGINE (the template's own Step script: worldOf, then
 * one watering run through step + apply), fed through the Variables:
 *   JOB    every new thing drawn: the wall tiles, tulip meters (part-watered, full and green, worn and drooping), the
 *          four site stages with their stones, the basket / store counts, the can on the map and in Pip's hand, a used
 *          rock and a regrowing one, the hen and her pen with its eggs, a letter in the post box (screenshot)
 *   WATCH  Watch rings the chips' things (by id, by kind on its tile, the held can's robot, a tile) and draws their
 *          meters large; empty rings nothing (screenshots)
 *   PICK   Picking frames the world in violet and lifts what is under the pointer; a real click still reports Tile X /
 *          Tile Y / Tile Tapped (read from the graph's Variables); off, the frame goes
 *   SEEDS  IW-002 AC4's kit half: the engine's seedWorld on seeds 1, 2, 3 draws three layouts (wall column, egg tiles);
 *          the same seed twice draws the same (screenshots)
 *   METER-PERF  the island's frame gate with meters drawn: a 46×22 world, 13 plots of job things with meters, three
 *          robots stepping every 380 ms, CPU ×4, 20 s of frames — p95 ≤ 50 ms (IG-004 AC6's bar), beside the same
 *          world with no job fields (a readout of what the meters cost)
 * Exits 0 when every clause passed, 1 when any did, 2 on a usage error.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const REPO = path.join(__dirname, '..', '..');
const FIXTURE = path.join(REPO, 'packages', 'noodl-mcp', 'tests', 'fixtures', 'garden-app');
const KITS = ['garden-kit', 'game-kit'].map((k) => [k, path.join(REPO, 'library', 'modules', k, 'project', 'noodl_modules', k)]);

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

if (process.argv[2] === 'assemble') {
  const out = process.argv[3];
  if (!out) {
    console.error('usage: drive-cg001-kit.js assemble <project-dir>');
    process.exit(2);
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(FIXTURE, out, { recursive: true });
  for (const [name, dir] of KITS) {
    if (!fs.existsSync(path.join(dir, 'index.js'))) {
      console.error(`missing built kit: ${dir}/index.js`);
      process.exit(1);
    }
    fs.cpSync(dir, path.join(out, 'noodl_modules', name), { recursive: true });
  }
  const modules = fs.readdirSync(path.join(out, 'noodl_modules'));
  console.log(JSON.stringify({ assembled: out, modules, kitBytes: Object.fromEntries(KITS.map(([n, d]) => [n, fs.statSync(path.join(d, 'index.js')).size])) }, null, 1));
  process.exit(modules.length === 2 ? 0 : 1);
}

const DIR = process.argv[2];
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-cg001-kit.js <deploy-dir> [--shots <dir>] [--json <file>]  |  assemble <project-dir>');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const MAP8 = { rows: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] };
const MAP12 = { rows: ['GGTGGGTHGGGG', 'GGGGGGGGGGGG', 'GGFGFGFGGFGG', 'PPPPPPPPPPPP', 'GWWGGRGGGGTG', 'GGGGGTGGGGGG', 'GGFGGGGGRGGG', 'GGGGGGGGGGGG'] };
const PIP = { x: 0, y: 3, d: 1, colour: '#FF7A59', eyes: 'round', hat: 'none', name: 'Pip' };
const BO = { x: 5, y: 1, d: 2, colour: '#8F6BFF', eyes: 'happy', hat: 'cap', name: 'Bo' };
const PROGRAM = '[{"id":1,"t":"fwd"},{"id":2,"t":"repeat","n":3,"body":[{"id":3,"t":"left"},{"id":4,"t":"water"}]},{"id":5,"t":"say","slots":{"to":"sami"}}]';
const WORDS = { en: { drink: 'Glug glug!', splash: 'Splash!', bump: 'Boing!' }, fr: { drink: 'Glou glou !', splash: 'Splash !', bump: 'Boing !' } };

// ── P108 IW-002 AC6 (lane D): the engine, read from the template the generator wrote (the Step component's own script,
// cut before its first line of wiring) — so the job worlds below are the world JSON the engine writes, not a hand copy.
function engineApi() {
  const file = path.join(REPO, 'templates', 'bot-garden', 'components', 'Logic', 'Step', 'nodes.json');
  const nodes = JSON.parse(fs.readFileSync(file, 'utf8')).nodes;
  const script = nodes.map((n) => n.parameters && n.parameters.functionScript).find((t) => typeof t === 'string' && t.includes('function step('));
  const cut = script.indexOf('\nvar st = step(');
  if (cut === -1) throw new Error('the Step script changed shape: no "var st = step(" line');
  // eslint-disable-next-line no-new-func
  return new Function(`${script.slice(0, cut)}\nreturn { newRun: newRun, step: step, apply: apply, worldOf: worldOf, seedWorld: seedWorld };`)();
}
/** Run a program on a world as the page does (Step, then Apply delta) and return the world the engine wrote. */
function engineRun(ENG, world, program) {
  let run = ENG.newRun(program, 'pip', 'en', 'iw002');
  let w = world;
  for (let i = 0; i < 200 && !run.done; i++) {
    const st = ENG.step(run, w, null);
    w = ENG.apply(w, st.delta);
    run = st.run;
  }
  return w;
}
/** One 8×6 job world with every new thing: worldOf (site stages), then Pip waters the first tulip once (1 → 2 drinks, can 2 → 1). */
function jobWorld(ENG) {
  const base = {
    map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGLLGG', 'PPPPPPPP', 'GGGGGGGG', 'GGGGGGGG'],
    things: [
      { kind: 'tulip', id: 'tu1', x: 1, y: 0, need: 3, have: 1, watered: false },
      { kind: 'tulip', id: 'tu2', x: 2, y: 0, need: 3, have: 3, watered: true },
      { kind: 'tulip', id: 'tu3', x: 3, y: 0, need: 3, have: 3, watered: true },
      { kind: 'site', id: 's1', x: 4, y: 3, need: 4, have: 0, item: 'stone' },
      { kind: 'site', id: 's2', x: 5, y: 3, need: 4, have: 1, item: 'stone' },
      { kind: 'site', id: 's3', x: 6, y: 3, need: 4, have: 3, item: 'stone' },
      { kind: 'site', id: 's4', x: 7, y: 3, need: 4, have: 4, item: 'stone' },
      { kind: 'basket', id: 'b1', x: 6, y: 1, count: 3, capacity: 4, item: 'egg' },
      { kind: 'store', id: 'st1', x: 7, y: 1, count: 2, capacity: 6, item: 'stone' },
      { kind: 'can', x: 4, y: 4, level: 2, max: 3 },
      { kind: 'rock', id: 'r1', x: 5, y: 4, left: 2, max: 4 },
      { kind: 'rock', id: 'r2', x: 6, y: 4, left: 0, max: 4 },
      { kind: 'hen', id: 'hen', x: 1, y: 5, pen: [0, 4, 2, 5] },
      { kind: 'postbox', id: 'pb', x: 7, y: 5 }
    ],
    robots: [{ id: 'pip', x: 1, y: 1, d: 0, holds: 'can', can: 2, canMax: 3, name: 'Pip', colour: '#FF7A59' }]
  };
  let w = engineRun(ENG, ENG.worldOf(base), [{ id: 1, t: 'water' }]);
  // The island tick's own deltas, written by apply (the only writer): the hen lays two, a letter comes, a tulip wears.
  w = ENG.apply(w, { lay: { x: 0, y: 4 } });
  w = ENG.apply(w, { lay: { x: 2, y: 5 } });
  w = ENG.apply(w, { letter: { x: 7, y: 5 } });
  w = ENG.apply(w, { wear: { id: 'tu3', kind: 'tulip', x: 3, y: 0, have: 2 } });
  return w;
}
/** Start world's seeded layout for a seed: the wall at one column of 2..5 on row 0, three eggs among eight tiles of row 5. */
function seededWorld(ENG, seed) {
  const req = { seeded: { wallAt: [2, 5], wallRow: 0, eggs: { count: 3, among: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5]] } } };
  return ENG.seedWorld({ map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'GGGGGGGG'], things: [], robots: [{ id: 'pip', x: 0, y: 3, d: 1, name: 'Pip' }] }, req, seed);
}
/** The island's 46×22, 13 plots of 8×6 in a grid (the island's plot size), each with a job's things; three robots at work. */
function islandWorld(withMeters) {
  const map = [];
  for (let y = 0; y < 22; y++) map.push(Array.from({ length: 46 }, (_, x) => (y === 7 || y === 14 ? 'P' : (x * 7 + y * 3) % 23 === 0 ? 'T' : 'G')).join(''));
  const things = [];
  for (let p = 0; p < 13; p++) {
    const ox = (p % 5) * 9 + 1;
    const oy = Math.floor(p / 5) * 7 + 1;
    const add = (t) => things.push(withMeters ? t : Object.fromEntries(Object.entries(t).filter(([k]) => ['kind', 'x', 'y', 'watered', 'left'].includes(k))));
    add({ kind: 'tulip', x: ox, y: oy, need: 3, have: p % 4, watered: p % 4 === 3 });
    add({ kind: 'tulip', x: ox + 1, y: oy, need: 3, have: (p + 1) % 4, watered: (p + 1) % 4 === 3 });
    if (withMeters) add({ kind: 'site', x: ox + 2, y: oy + 2, need: 4, have: p % 5 });
    add({ kind: withMeters ? 'basket' : 'bowl', x: ox + 4, y: oy + 1, count: p % 5, capacity: 4 });
    add({ kind: 'rock', x: ox + 5, y: oy + 3, left: (p % 4) + 1, max: 4 });
  }
  const robots = [{ x: 2, y: 3, d: 1, name: 'Pip', colour: '#FF7A59' }, { x: 11, y: 10, d: 1, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' }, { x: 20, y: 17, d: 1, name: 'Pocket', colour: '#FFB347', accessory: 'satchel' }];
  return { map, things, robots };
}

withDeployedSite({ dir: DIR }, async (page) => {
  const evaluate = (expr) => page.evaluate(expr);
  const setVar = async (name, value) => {
    await evaluate(`Noodl.Variables.set(${JSON.stringify(name)}, ${JSON.stringify(value)})`);
    await wait(120);
  };
  const setJson = (name, value) => setVar(name, JSON.stringify(value));
  const until = async (expr, ok, ms = 10000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(200);
      last = await evaluate(expr);
    }
    return last;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const ORDER = `[...document.querySelectorAll('.gd-prog .gd-blk[data-id]')].map((e) => e.getAttribute('data-id'))`;
  const PROGRAM_OUT = `String(Noodl.Variables.get('programOut') || '')`;
  const order = () => evaluate(ORDER);
  const walk = (list, out = []) => {
    for (const b of list) {
      out.push(String(b.id));
      if (b.body) walk(b.body, out);
    }
    return out;
  };
  const rect = (selector) =>
    evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
  const rects = (selector) =>
    evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })`);
  const intersects = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const resetProgram = async () => {
    // 🔴 Session 1: pen and mouse read publishedChanged:false because the kit republished the SAME reordered JSON the
    // previous drag had published (before === after). The output Variable is emptied before every drag.
    await setVar('programOut', '');
    await setVar('program', '[]');
    await setVar('program', PROGRAM);
    await until(ORDER, (o) => JSON.stringify(o) === JSON.stringify(['1', '2', '3', '4', '5']), 4000);
  };
  const layout = async () => {
    await setJson('map', MAP8);
    await setJson('robots', [PIP]);
    await setJson('things', []);
    await setVar('bubble', '');
    await setVar('stepMs', 380);
    await setVar('program', PROGRAM);
    await setVar('palette', '');
    await setVar('runningId', '');
    await setVar('band', 2);
    await setVar('language', 'en');
    await setVar('locked', false);
  };

  // ── Boot ─────────────────────────────────────────────────────────────────
  await page.setViewport({ width: 1368, height: 912 });
  await page.navigate('/');
  const marker = await until(`document.body.innerText.includes('cg001 page drew')`, (v) => v === true, 15000);
  const api = await until(`typeof Noodl !== 'undefined' && !!Noodl.Variables`, (v) => v === true, 10000);
  check('the page drew and Noodl.Variables is reachable', marker && api, { marker, api });
  await layout();
  const drew = await until(
    `({ world: !!document.querySelector('[data-gd-world][data-w="8"]'), blocks: document.querySelectorAll('.gd-prog .gd-blk[data-id]').length, ada: document.querySelectorAll('img[alt="Ada"]').length, modules: Array.isArray(window.__noodl_modules) ? window.__noodl_modules.map((m) => m && m.name) : 'n/a' })`,
    (v) => v.world && v.blocks === 5 && v.ada === 1,
    10000
  );
  readings.ac1 = drew;
  check('AC1: the Garden (8 columns), the Block List (5 blocks) and a game-kit Avatar all drew under Group roots', drew.world && drew.blocks === 5 && drew.ada === 1, drew);
  await shot('ac1-two-modules');
  // THE LOOK (README §6): the tiles paint apart — session 1 drew one flat rectangle (the bridge’s display:block beat the grid).
  const look = await evaluate(`(() => {
    const bg = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).backgroundImage + '|' + getComputedStyle(e).backgroundColor : null; };
    const size = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
    return { display: getComputedStyle(document.querySelector('[data-gd-world]')).display, grass: bg('.gd-cell.gd-grass'), path: bg('.gd-cell.gd-path'), water: bg('.gd-cell.gd-water'), tree: bg('.gd-cell.gd-tree'), cell: size('.gd-cell.gd-grass'), treeArt: size('.gd-cell.gd-tree [data-sprite="tree"]'), tulipArt: size('.gd-cell.gd-bed [data-sprite="tulip"]'), houseArt: size('.gd-cell.gd-house [data-sprite="house"]') };
  })()`);
  readings.look = look;
  check('THE LOOK: the world is a grid of sized tiles, path and water paint unlike grass, and a tree, a tulip and a house draw their art', look.display === 'grid' && look.cell && look.cell.w >= 40 && look.cell.h >= 40 && look.path !== look.grass && look.water !== look.grass && look.treeArt && look.treeArt.w >= 30 && look.tulipArt && look.tulipArt.w >= 20 && look.houseArt && look.houseArt.w >= 30, look);

  // ── AC3: drags with three pointer types, and one that ends outside ───────
  const DRAG = (pointerType, fromId, to) => `(async () => {
    const PT = ${JSON.stringify(pointerType)};
    const src = document.querySelector('.gd-prog .gd-blk[data-id="${fromId}"]');
    if (!src) return { error: 'no source block' };
    const r1 = src.getBoundingClientRect();
    const x0 = r1.left + r1.width / 2, y0 = r1.top + r1.height / 2;
    let x1, y1;
    ${to.selector ? `const dst = document.querySelector(${JSON.stringify(to.selector)}); if (!dst) return { error: 'no target' }; const r2 = dst.getBoundingClientRect(); x1 = r2.left + r2.width / 2; y1 = r2.bottom - 3;` : `x1 = ${to.x}; y1 = ${to.y};`}
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const fire = (type, target, x, y) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: PT, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y }));
    fire('pointerdown', src, x0, y0);
    await frame();
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      fire('pointermove', document, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
      await frame();
    }
    const dragging = !!document.querySelector('.gd-blk.gd-drag');
    const line = !!document.querySelector('.gd-dropline');
    fire('pointerup', document, x1, y1);
    await frame();
    return { dragging, line, from: [x0, y0], to: [x1, y1] };
  })()`;
  const outBefore = await evaluate(PROGRAM_OUT);
  readings.ac3 = {};
  for (const pt of ['touch', 'pen', 'mouse']) {
    await resetProgram();
    const before = await evaluate(PROGRAM_OUT);
    const drag = await evaluate(DRAG(pt, 1, { selector: '.gd-prog .gd-blk[data-id="5"]' }));
    const after = await until(ORDER, (o) => o[o.length - 1] === '1', 3000);
    const published = await evaluate(PROGRAM_OUT);
    let walked = null;
    try {
      walked = walk(JSON.parse(published));
    } catch (e) {
      walked = `unparseable: ${published.slice(0, 80)}`;
    }
    const ok = JSON.stringify(after) === JSON.stringify(['2', '3', '4', '5', '1']) && JSON.stringify(walked) === JSON.stringify(['2', '3', '4', '5', '1']) && published !== before;
    readings.ac3[pt] = { drag, after, walked, publishedChanged: published !== before };
    check(`AC3: a ${pt} drag of block 1 to after block 5 reorders the list and publishes Program`, ok, readings.ac3[pt]);
    await shot(`ac3-drag-${pt}`);
  }
  await resetProgram();
  const beforeOutside = await evaluate(PROGRAM_OUT);
  const world = await rect('[data-gd-world]');
  const outside = await evaluate(DRAG('touch', 1, { x: Math.round(world.x + world.w / 2), y: Math.round(world.y + world.h / 2) }));
  await wait(400);
  const afterOutside = await order();
  const publishedOutside = await evaluate(PROGRAM_OUT);
  readings.ac3.outside = { outside, afterOutside, publishedChanged: publishedOutside !== beforeOutside };
  check('AC3: a touch drag that ends outside the list (on the garden) puts the block back and publishes nothing', outside.dragging && JSON.stringify(afterOutside) === JSON.stringify(['1', '2', '3', '4', '5']) && publishedOutside === beforeOutside, readings.ac3.outside);
  void outBefore;

  // ── AC5: the band switch is live ─────────────────────────────────────────
  await evaluate(`(document.querySelector('.gd-prog .gd-blk[data-id="1"]') || {}).__cg001 = 'kept'`);
  const fontBefore = await evaluate(`getComputedStyle(document.querySelector('.gd-prog .gd-blk[data-id="1"] .gd-n')).fontSize`);
  await setVar('band', 1);
  const band1 = await until(`({ band: (document.querySelector('[data-gd-blocks]') || {}).getAttribute && document.querySelector('[data-gd-blocks]').getAttribute('data-band'), kept: (document.querySelector('.gd-prog .gd-blk[data-id="1"]') || {}).__cg001, font: getComputedStyle(document.querySelector('.gd-prog .gd-blk[data-id="1"] .gd-n')).fontSize })`, (v) => v.band === '1', 3000);
  readings.ac5 = { fontBand2: fontBefore, ...band1 };
  check('AC5: Band 1 restyles the same block element (no remount) and its word becomes a caption', band1.band === '1' && band1.kept === 'kept' && parseFloat(band1.font) <= 12 && parseFloat(fontBefore) >= 14, readings.ac5);
  await shot('ac5-band1');
  await setVar('band', 2);

  // ── AC6: two maps, two viewports ─────────────────────────────────────────
  readings.ac6 = {};
  for (const [label, map] of [['8x6', MAP8], ['12x8', MAP12]]) {
    await setJson('map', map);
    for (const vp of [{ width: 1368, height: 912, mobile: false }, { width: 390, height: 844, mobile: true }]) {
      await page.setViewport(vp);
      await wait(400);
      const r = await evaluate(`({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, face: (() => { const f = document.querySelector('[data-face]'); if (!f) return null; const r = f.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height) * 10) / 10; })(), world: (() => { const w = document.querySelector('[data-gd-world]'); const r = w.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), cells: w.querySelectorAll('.gd-cell').length }; })() })`);
      const key = `${label}@${vp.width}x${vp.height}`;
      readings.ac6[key] = r;
      // The face is the visor’s SMALLER side on screen: session 1 read 12px on a 56px box because a robot facing right is rotated 90°.
      check(`AC6: ${key} — no horizontal scroll and the robot's face ≥ 20px (its smaller side, rotated as it faces)`, r.scrollW <= r.innerW && r.face !== null && r.face >= 20 && r.world.cells === (label === '8x6' ? 48 : 96), r);
      await shot(`ac6-${label}-${vp.width}x${vp.height}`);
    }
  }
  await page.setViewport({ width: 1368, height: 912, mobile: false });
  await setJson('map', MAP8);

  // ── AC7: step, turn, bump, water, puddle — EN then FR ─────────────────────
  readings.ac7 = {};
  for (const lang of ['en', 'fr']) {
    await setVar('language', lang);
    await setJson('robots', [PIP]);
    await setJson('things', []);
    await wait(500);
    const botBefore = await rect('.gd-bot[data-robot="0"]');
    await setJson('robots', [{ ...PIP, x: 1 }]);
    await wait(500);
    const botAfter = await rect('.gd-bot[data-robot="0"]');
    const step = botAfter && botBefore && Math.abs(botAfter.x - botBefore.x) > 20 && Math.abs(botAfter.y - botBefore.y) < 2;
    await shot(`ac7-step-${lang}`);
    const rotBefore = await evaluate(`getComputedStyle(document.querySelector('.gd-turn')).transform`);
    await setJson('robots', [{ ...PIP, x: 1, d: 2 }]);
    await wait(450);
    const rotAfter = await evaluate(`getComputedStyle(document.querySelector('.gd-turn')).transform`);
    const turn = rotBefore !== rotAfter && (await evaluate(`document.querySelector('.gd-bot').getAttribute('data-d')`)) === '2';
    await shot(`ac7-turn-${lang}`);
    // 🔴 Session 1 (fr): this waited for data-bump === '1', but the kit counts bumps for the life of the sprite (a RISING count
    // restarts the animation, exactly as designed), so the second language read '2', the 2 s wait ran out, and the 1.5 s bubble
    // had gone by the time it was read. Instrument fault: the wait is for a RISE, and the bubble outlives the wait.
    const BUMP_READ = `({ bump: Number((document.querySelector('.gd-turn') || { getAttribute: () => 0 }).getAttribute('data-bump') || 0), cls: !!document.querySelector('.gd-turn.gd-bump'), bubble: (document.querySelector('.gd-bubble') || {}).textContent || '' })`;
    const bumpBefore = (await evaluate(BUMP_READ)).bump;
    await setJson('bubble', { robot: 0, text: WORDS[lang].bump, ms: 4000 });
    await setJson('robots', [{ ...PIP, x: 1, d: 2, bump: 1 }]);
    const bumped = await until(BUMP_READ, (v) => v.bump === bumpBefore + 1, 2000);
    const stillThere = await rect('.gd-bot[data-robot="0"]');
    const bump = bumped.bump === bumpBefore + 1 && stillThere && Math.abs(stillThere.x - botAfter.x) < 2 && bumped.bubble.includes(WORDS[lang].bump);
    await shot(`ac7-bump-${lang}`);
    await setJson('bubble', { robot: 0, text: WORDS[lang].drink, ms: 1500 });
    await setJson('things', [{ kind: 'tulip', x: 2, y: 2, watered: true }]);
    const watered = await until(`({ wet: document.querySelectorAll('.gd-tulip.gd-wet').length, dry: document.querySelectorAll('.gd-tulip.gd-dry').length, bubble: (document.querySelector('.gd-bubble') || {}).textContent || '' })`, (v) => v.wet === 1, 2000);
    const water = watered.wet === 1 && watered.dry === 2 && watered.bubble.includes(WORDS[lang].drink);
    await shot(`ac7-water-${lang}`);
    await setJson('bubble', { robot: 0, text: WORDS[lang].splash, ms: 1500 });
    await setJson('things', [{ kind: 'tulip', x: 2, y: 2, watered: true }, { kind: 'puddle', x: 1, y: 4 }]);
    const puddled = await until(`({ puddles: document.querySelectorAll('.gd-puddle').length, at: (document.querySelector('.gd-cell[data-x="1"][data-y="4"] .gd-puddle') ? 'right cell' : 'elsewhere'), bubble: (document.querySelector('.gd-bubble') || {}).textContent || '' })`, (v) => v.puddles === 1, 2000);
    const puddle = puddled.puddles === 1 && puddled.at === 'right cell' && puddled.bubble.includes(WORDS[lang].splash);
    await shot(`ac7-puddle-${lang}`);
    const word = await evaluate(`(document.querySelector('.gd-prog .gd-blk[data-id="1"] .gd-n') || {}).textContent`);
    readings.ac7[lang] = { botBefore, botAfter, rotBefore, rotAfter, bumpBefore, bumped, watered, puddled, word };
    check(`AC7 (${lang}): step moved the robot one tile`, step, { botBefore, botAfter });
    check(`AC7 (${lang}): turn changed the robot's rotation without moving it`, turn, { rotBefore, rotAfter });
    check(`AC7 (${lang}): bump animated in place, with its word in a bubble`, bump, bumped);
    check(`AC7 (${lang}): watering stood the tulip up, with its word`, water, watered);
    check(`AC7 (${lang}): a puddle popped on the right tile, with its word`, puddle, puddled);
    check(`AC7 (${lang}): the block word is in the language asked`, word === (lang === 'fr' ? 'avancer' : 'forward'), word);
  }
  await setVar('language', 'en');

  // ── AC8: two robots ──────────────────────────────────────────────────────
  await setJson('robots', [PIP, BO]);
  await wait(500);
  const two = await rects('.gd-bot');
  const names = await evaluate(`[...document.querySelectorAll('.gd-name')].map((e) => e.textContent)`);
  readings.ac8 = { apart: { two, names } };
  check('AC8: two robots on two tiles: two labelled sprites whose boxes do not intersect', two.length === 2 && !intersects(two[0], two[1]) && names.join(',') === 'Pip,Bo', readings.ac8.apart);
  await shot('ac8-two-robots');
  await setJson('robots', [{ ...PIP, x: 3, y: 1 }, { ...BO, x: 3, y: 1 }]);
  await wait(500);
  const shared = await rects('.gd-bot');
  readings.ac8.shared = shared;
  check('AC8: two robots on ONE tile: still two sprites whose boxes do not intersect', shared.length === 2 && !intersects(shared[0], shared[1]), shared);
  await shot('ac8-shared-tile');

  // ── AC9: the repaint readout at 12×8 with two robots, CPU ×4 ─────────────
  await setJson('map', MAP12);
  await setJson('robots', [PIP, BO]);
  await wait(500);
  await page.client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const robots = [{ ...PIP, x: (i % 11) + 1, y: 3, d: 1 }, { ...BO, x: 10 - (i % 10), y: 1, d: 3 }];
    const ms = await evaluate(`(async () => { const t0 = performance.now(); Noodl.Variables.set('robots', ${JSON.stringify(JSON.stringify(robots))}); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return performance.now() - t0; })()`);
    samples.push(Math.round(ms * 10) / 10);
    await wait(120);
  }
  await page.client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sorted = [...samples].sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  readings.ac9 = { cpuThrottle: 4, map: '12x8', robots: 2, samples, p50: q(0.5), p95: q(0.95), max: sorted[sorted.length - 1] };
  console.log(`AC9 READOUT  write→paint ms at 12×8, two robots, CPU ×4: p50 ${readings.ac9.p50}  p95 ${readings.ac9.p95}  max ${readings.ac9.max}  (${samples.join(' ')})`);
  check('AC9: a numbered readout was captured (the number, not a pass, is the deliverable)', samples.length === 20 && samples.every((s) => s > 0), readings.ac9);
  await shot('ac9-12x8-two-robots');

  // ══ P108 IW-002 AC6 (lane D): the job model drawn from a world the ENGINE wrote, Watch, Picking, seeds, the frame gate ══
  const ENG = engineApi();
  await page.setViewport({ width: 1368, height: 912, mobile: false });
  await setVar('bubble', '');
  await setVar('watch', '');
  await setVar('picking', false);
  await setVar('stepMs', 380);
  const job = jobWorld(ENG);
  readings.iw002 = { engineWorld: job };
  await setJson('map', { rows: job.map });
  await setJson('things', job.things);
  await setJson('robots', job.robots);
  await wait(600);
  const JOB_READ = `(() => {
    const q = (s) => [...document.querySelectorAll(s)];
    const cell = (x, y) => document.querySelector('.gd-cell[data-x="' + x + '"][data-y="' + y + '"]');
    const meter = (x, y) => { const m = cell(x, y) && cell(x, y).querySelector('.gd-meter'); return m ? { text: m.getAttribute('data-meter'), kind: m.getAttribute('data-kind'), full: m.classList.contains('gd-full'), bg: getComputedStyle(m).backgroundColor, on: m.querySelectorAll('.gd-pip.gd-on').length, pips: m.querySelectorAll('.gd-pip').length, font: getComputedStyle(m).fontSize, w: Math.round(m.getBoundingClientRect().width) } : null; };
    const tulip = (x) => { const t = cell(x, 0).querySelector('.gd-tulip'); return t ? t.getAttribute('class').replace('gd-sprite ', '') : null; };
    return {
      walls: q('.gd-cell.gd-wall [data-sprite="wall"]').map((e) => e.closest('.gd-cell').getAttribute('data-x') + ',' + e.closest('.gd-cell').getAttribute('data-y')),
      tulips: [1, 2, 3].map((x) => ({ look: tulip(x), meter: meter(x, 0) })),
      sites: [4, 5, 6, 7].map((x) => ({ stage: (cell(x, 3).querySelector('.gd-site') || { getAttribute: () => null }).getAttribute('data-site'), meter: meter(x, 3), bg: cell(x, 3).querySelector('.gd-site') ? getComputedStyle(cell(x, 3).querySelector('.gd-site')).backgroundColor : null })),
      basket: { sprite: (cell(6, 1).querySelector('[data-sprite^="basket"]') || { getAttribute: () => null }).getAttribute('data-sprite'), meter: meter(6, 1) },
      store: { sprite: (cell(7, 1).querySelector('[data-sprite^="store"]') || { getAttribute: () => null }).getAttribute('data-sprite'), meter: meter(7, 1) },
      can: { level: (cell(4, 4).querySelector('[data-sprite="wateringCan"]') || { getAttribute: () => null }).getAttribute('data-level'), meter: meter(4, 4) },
      held: (() => { const b = document.querySelector('.gd-bot[data-robot="0"]'); const c = b && b.querySelector('.gd-can'); return b ? { holds: b.getAttribute('data-holds'), can: c ? c.getAttribute('data-can') + '/' + c.getAttribute('data-can-max') : null, accs: [...b.querySelectorAll('[data-accessory]')].map((a) => a.getAttribute('data-accessory')) } : null; })(),
      rocks: [5, 6].map((x) => ({ used: !!cell(x, 4).querySelector('.gd-boulder.gd-used'), size: (cell(x, 4).querySelector('.gd-boulder') || { getAttribute: () => '' }).getAttribute('class'), meter: meter(x, 4) })),
      hen: !!cell(1, 5).querySelector('[data-sprite="hen"]'),
      pen: (document.querySelector('.gd-penfence') || { getAttribute: () => null }).getAttribute('data-pen'),
      penCells: q('.gd-cell.gd-in-pen').length,
      penBg: getComputedStyle(cell(0, 5)).backgroundColor,
      eggs: q('[data-sprite="egg"]').map((e) => e.closest('.gd-cell').getAttribute('data-x') + ',' + e.closest('.gd-cell').getAttribute('data-y')),
      letterIn: !!cell(7, 5).querySelector('.gd-letter-in'),
      meters: q('.gd-meter').length
    };
  })()`;
  const drawn = await evaluate(JOB_READ);
  readings.iw002.drawn = drawn;
  await shot('iw002-2d-job-world');
  const tu = job.things.filter((t) => t.kind === 'tulip');
  const GREEN = 'rgb(63, 166, 107)';
  check('IW-002 AC6 (2D): the engine’s tulips — part-watered 2/3 half up, 3/3 wet with a green meter, the worn one drooping at 2/3; pips = drinks', JSON.stringify(drawn.tulips.map((t) => [t.look, t.meter && t.meter.text, t.meter && t.meter.on, t.meter && t.meter.full])) === JSON.stringify([['gd-tulip gd-dry gd-part', `${tu[0].have}/3`, tu[0].have, false], ['gd-tulip gd-wet', '3/3', 3, true], ['gd-tulip gd-dry gd-droop', '2/3', 2, false]]) && tu[0].have === 2 && drawn.tulips[1].meter.bg === GREEN, { tulips: drawn.tulips, engine: tu });
  check('IW-002 AC6 (2D): the wall tiles (L) draw the wall; the four path sites draw dirt · gravel · cobbles · path with their stones of 4, the path one green', drawn.walls.join(' ') === '4,2 5,2' && JSON.stringify(drawn.sites.map((x) => [x.stage, x.meter && x.meter.text, x.meter && x.meter.full])) === JSON.stringify([['dirt', '0/4', false], ['gravel', '1/4', false], ['cobbles', '3/4', false], ['path', '4/4', true]]) && new Set(drawn.sites.map((x) => x.bg)).size === 4, { walls: drawn.walls, sites: drawn.sites });
  check('IW-002 AC6 (2D): the basket 3/4 with eggs peeking, the store 2/6 with stones on it, the can on the map at 2/3 (its water drawn), Pip holding the can at 1/3 in his hand', drawn.basket.sprite === 'basketEggs' && drawn.basket.meter.text === '3/4' && drawn.basket.meter.on === 3 && drawn.store.sprite === 'storeFull' && drawn.store.meter.text === '2/6' && drawn.can.level === '2/3' && drawn.can.meter.text === '2/3' && drawn.held && drawn.held.holds === 'can' && drawn.held.can === '1/3', { basket: drawn.basket, store: drawn.store, can: drawn.can, held: drawn.held });
  check('IW-002 AC6 (2D): a regrowing rock 2/4, a used one as a faint stub at 0/4; the hen in her straw pen (6 tiles, one rail) with her two eggs; a letter in the post box', !drawn.rocks[0].used && /gd-boulder-mid/.test(drawn.rocks[0].size) && drawn.rocks[0].meter.text === '2/4' && drawn.rocks[1].used && drawn.rocks[1].meter.text === '0/4' && drawn.hen && drawn.pen === '0,4,3,2' && drawn.penCells === 6 && drawn.penBg !== 'rgba(0, 0, 0, 0)' && drawn.eggs.sort().join(' ') === '0,4 2,5' && drawn.letterIn, { rocks: drawn.rocks, hen: drawn.hen, pen: drawn.pen, penCells: drawn.penCells, penBg: drawn.penBg, eggs: drawn.eggs, letterIn: drawn.letterIn });

  // ── WATCH ──
  await setJson('watch', [{ id: 'tu1', kind: 'tulip', x: 99, y: 99 }, { kind: 'basket', x: 6, y: 1 }, { kind: 'can', x: 1, y: 1 }, { kind: 'ahead', x: 3, y: 1 }]);
  await wait(400);
  const W_READ = `(() => { const q = (s) => [...document.querySelectorAll(s)]; return { rings: q('.gd-ring').map((r) => r.getAttribute('data-ring') + '@' + (r.closest('.gd-cell') ? r.closest('.gd-cell').getAttribute('data-x') + ',' + r.closest('.gd-cell').getAttribute('data-y') : 'robot')), watched: q('.gd-meter.gd-watch').map((m) => m.getAttribute('data-kind') + ':' + m.getAttribute('data-meter') + ':' + getComputedStyle(m).fontSize + ':' + Math.round(m.getBoundingClientRect().width)), ringColour: q('.gd-ring')[0] ? getComputedStyle(q('.gd-ring')[0]).borderTopColor : null, other: (() => { const m = document.querySelector('.gd-meter:not(.gd-watch)'); return m ? getComputedStyle(m).fontSize : null; })(), bot: !!document.querySelector('.gd-bot.gd-watch') }; })()`;
  const watching = await evaluate(W_READ);
  readings.iw002.watch = watching;
  await shot('iw002-2d-watch');
  check('IW-002 (brief §4.4) Watch (2D): four chips ring four things — the tulip by id, the basket on its tile, the held can on Pip, the tile ahead — violet; their meters large (15 px beside 11 px)', JSON.stringify(watching.rings.sort()) === JSON.stringify(['basket@6,1', 'robot@robot', 'tile@3,1', 'tulip@1,0']) && watching.watched.length === 2 && watching.watched.every((w) => w.split(':')[2] === '15px') && watching.other === '11px' && watching.ringColour === 'rgb(143, 107, 255)' && watching.bot, watching);
  await setVar('watch', '');
  await wait(300);
  const unwatched = await evaluate(W_READ);
  check('IW-002 Watch (2D): empty rings nothing and every meter is back to its size', unwatched.rings.length === 0 && unwatched.watched.length === 0 && !unwatched.bot, unwatched);

  // ── PICKING ──
  const borderOff = await evaluate(`getComputedStyle(document.querySelector('[data-gd-world]')).borderTopColor`);
  await setVar('picking', true);
  await wait(300);
  const basketCell = await rect('.gd-cell[data-x="6"][data-y="1"]');
  const spriteBefore = await rect('.gd-cell[data-x="6"][data-y="1"] [data-sprite^="basket"]');
  const cx = basketCell.x + basketCell.w / 2;
  const cy = basketCell.y + basketCell.h / 2;
  await page.client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(cx), y: Math.round(cy), button: 'none' });
  await wait(400);
  const spriteLifted = await rect('.gd-cell[data-x="6"][data-y="1"] [data-sprite^="basket"]');
  const other = await rect('.gd-cell[data-x="7"][data-y="1"] [data-sprite^="store"]');
  const pickRead = await evaluate(`({ cls: document.querySelector('[data-gd-world]').className, border: getComputedStyle(document.querySelector('[data-gd-world]')).borderTopColor, cursor: getComputedStyle(document.querySelector('.gd-cell')).cursor, storeTransform: getComputedStyle(document.querySelector('.gd-cell[data-x="7"][data-y="1"] [data-sprite^="store"]')).transform })`);
  await shot('iw002-2d-picking');
  const taps0 = Number((await evaluate(`Noodl.Variables.get('taps')`)) || 0);
  await page.client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(cx), y: Math.round(cy), button: 'left', clickCount: 1 });
  await page.client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(cx), y: Math.round(cy), button: 'left', clickCount: 1 });
  const tapped = await until(`({ taps: Noodl.Variables.get('taps'), x: Noodl.Variables.get('tileX'), y: Noodl.Variables.get('tileY') })`, (v) => Number(v.taps) === taps0 + 1, 3000);
  readings.iw002.picking = { borderOff, spriteBefore, spriteLifted, other, pickRead, tapped };
  check('IW-002 (brief §4.4) Picking (2D): the world is framed violet, the basket under the pointer lifts (its neighbour does not), and a click still reports Tile X 6 / Tile Y 1 / Tile Tapped', /gd-picking/.test(pickRead.cls) && pickRead.border === 'rgb(143, 107, 255)' && borderOff !== pickRead.border && pickRead.cursor === 'crosshair' && spriteLifted.y < spriteBefore.y - 3 && pickRead.storeTransform === 'none' && Number(tapped.taps) === taps0 + 1 && Number(tapped.x) === 6 && Number(tapped.y) === 1, readings.iw002.picking);
  await setVar('picking', false);
  await page.client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, button: 'none' });
  await wait(300);
  const borderBack = await evaluate(`getComputedStyle(document.querySelector('[data-gd-world]')).borderTopColor`);
  check('IW-002 Picking (2D): off, the frame is the world’s own again', borderBack === borderOff, { borderOff, borderBack });

  // ── SEEDS (IW-002 AC4, the kit half) ──
  const seedsSeen = {};
  for (const seed of [1, 2, 3, 2]) {
    const w = seededWorld(ENG, seed);
    await setJson('map', { rows: w.map });
    await setJson('things', w.things);
    await setJson('robots', w.robots);
    await wait(400);
    const layout = await evaluate(`({ wall: [...document.querySelectorAll('.gd-cell.gd-wall')].map((c) => c.getAttribute('data-x') + ',' + c.getAttribute('data-y')).join(' '), eggs: [...document.querySelectorAll('[data-sprite="egg"]')].map((e) => e.closest('.gd-cell').getAttribute('data-x') + ',' + e.closest('.gd-cell').getAttribute('data-y')).sort().join(' ') })`);
    const engineSaid = { wall: w.map.map((r, y) => [...r].map((c, x) => (c === 'L' ? x + ',' + y : null)).filter(Boolean)).flat().join(' '), eggs: w.things.filter((t) => t.kind === 'egg').map((t) => t.x + ',' + t.y).sort().join(' ') };
    seedsSeen[seed in seedsSeen ? `${seed}-again` : seed] = { layout, engineSaid };
    if (!(`${seed}-shot` in seedsSeen)) await shot(`iw002-2d-seed-${seed}`);
    seedsSeen[`${seed}-shot`] = true;
  }
  const lay = (k) => JSON.stringify(seedsSeen[k].layout);
  readings.iw002.seeds = seedsSeen;
  check('IW-002 AC4 (the 2D kit): seeds 1, 2, 3 draw three layouts — each exactly the wall and eggs the engine laid — and seed 2 again draws seed 2’s', new Set([lay(1), lay(2), lay(3)]).size === 3 && lay('2-again') === lay(2) && [1, 2, 3].every((k) => JSON.stringify(seedsSeen[k].layout) === JSON.stringify(seedsSeen[k].engineSaid) && seedsSeen[k].layout.wall && seedsSeen[k].layout.eggs.split(' ').length === 3), seedsSeen);

  // ── METER-PERF: the island's frame gate with meters drawn ──
  for (const withMeters of [false, true]) {
    const isl = islandWorld(withMeters);
    await page.setViewport({ width: 1368, height: 912, mobile: false });
    await setJson('map', { rows: isl.map });
    await setJson('things', isl.things);
    await setJson('robots', isl.robots);
    await setVar('watch', '');
    await wait(900);
    const count = await evaluate(`({ meters: document.querySelectorAll('.gd-meter').length, cells: document.querySelectorAll('.gd-cell').length, wide: document.querySelector('[data-gd-world]').getAttribute('data-wide') })`);
    if (withMeters) await shot('iw002-2d-island-meters');
    const LOOP = `(() => { const t = performance.now(); let x = 0; for (let i = 0; i < 3e7; i++) x = (x + i * 7) % 1000003; return performance.now() - t + (x < 0 ? 1 : 0); })()`;
    const loop1 = await evaluate(LOOP);
    await page.client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await wait(1500);
    const loop4 = await evaluate(LOOP);
    const perf = await evaluate(`new Promise((resolve) => {
      const base = ${JSON.stringify(isl.robots)}; const things = ${JSON.stringify(isl.things)};
      const frames = []; let last = performance.now(); const t0 = last; let n = 0; const moves = { n: 0 }; const longTasks = [];
      const seen = () => [...document.querySelectorAll('[data-gd-world] .gd-bot')].map((b) => b.getAttribute('data-x')).join('|');
      let prev = seen();
      const obs = new MutationObserver(() => { const now = seen(); if (now !== prev) { moves.n++; prev = now; } });
      obs.observe(document.querySelector('[data-gd-world]'), { attributes: true, subtree: true, attributeFilter: ['data-x'] });
      let lt = null; try { lt = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(Math.round(e.duration)))); lt.observe({ entryTypes: ['longtask'] }); } catch (e) { lt = null; }
      const timer = setInterval(() => { n++; const bots = base.map((r, i) => Object.assign({}, r, { x: r.x + (n % 6), d: 1 })); Noodl.Variables.set('robots', JSON.stringify(bots));
        if (${withMeters ? 'true' : 'false'} && n % 4 === 0) { const t2 = things.map((t) => t.kind === 'tulip' && t.need ? Object.assign({}, t, { have: n % (t.need + 1) }) : t); Noodl.Variables.set('things', JSON.stringify(t2)); } }, 380);
      const tick = (t) => { frames.push(t - last); last = t; if (t - t0 < 20000) requestAnimationFrame(tick); else { clearInterval(timer); obs.disconnect(); if (lt) lt.disconnect(); const s = frames.slice(1).sort((a, b) => a - b); resolve({ frames: s.length, p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], p99: s[Math.floor(s.length * 0.99)], max: s[s.length - 1], over50: s.filter((v) => v > 50).length, writes: n, moves: moves.n, longTasks: longTasks.length, longestTask: longTasks.length ? Math.max.apply(null, longTasks) : 0, hidden: document.hidden }); } };
      requestAnimationFrame(tick);
    })`);
    await page.client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    readings.iw002[withMeters ? 'perfMeters' : 'perfPlain'] = { count, throttle: { loop1, loop4, ratio: loop4 / loop1 }, perf };
    console.log(`IW-002 METER-PERF readout (${withMeters ? 'WITH meters' : 'no job fields'}): 46×22, three robots, CPU ×4 (loop ×${(loop4 / loop1).toFixed(1)}): ${JSON.stringify(perf)} ${JSON.stringify(count)}`);
    if (withMeters)
      check(`IW-002 METER-PERF (2D, the island's frame gate with meters drawn): p95 ${perf.p95.toFixed(1)} ms ≤ 50 ms at CPU ×4 with ${count.meters} meters on a 46×22 world (${perf.frames} frames, ${perf.moves} robot moves drawn, ${perf.longTasks} long tasks; the same world with no job fields read ${readings.iw002.perfPlain.perf.p95.toFixed(1)} ms)`, loop4 / loop1 > 2.5 && count.meters >= 30 && count.cells === 46 * 22 && count.wide === '1' && perf.frames > 100 && perf.writes >= 40 && perf.moves >= 40 && perf.p95 <= 50 && !perf.hidden, readings.iw002);
  }

  // ══ P108 IW-003 (lane S): Sami's bench rising by the stone, from worlds the ENGINE wrote (Cobble puts 0, 2, 4, 6, 8) ══
  {
    await page.setViewport({ width: 1024, height: 800, mobile: false });
    await setVar('watch', '');
    await setVar('picking', false);
    await setVar('bubble', '');
    const benchAfter = (puts) =>
      engineRun(ENG, { map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'GGGGGGGG'], things: [{ kind: 'site', id: 'bench', x: 4, y: 2, have: 0, need: 8, item: 'stone', build: 'bench' }, { kind: 'site', id: 's1', x: 2, y: 2, have: 4, need: 4, item: 'stone' }], robots: [{ id: 'pip', x: 4, y: 3, d: 0, carry: Array(8).fill('stone'), basket: 8, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' }] }, Array.from({ length: puts }, (_, i) => ({ id: i + 1, t: 'put' })));
    const BENCH_READ = `(() => { const c = document.querySelector('.gd-cell[data-x="4"][data-y="2"]'); const m = c && c.querySelector('.gd-meter'); const s = document.querySelector('.gd-cell[data-x="2"][data-y="2"] .gd-site'); const art = c && c.querySelector('[data-bench]'); const sami = c && c.querySelector('[data-sits="bench"]'); return { stage: art ? art.getAttribute('data-bench') : null, sprite: art ? art.getAttribute('data-sprite') : null, ground: (c && c.querySelector('.gd-site') || { getAttribute: () => null }).getAttribute('data-site'), sits: !!sami, samiH: sami ? Math.round(sami.getBoundingClientRect().height) : 0, meter: m ? m.getAttribute('data-meter') + (m.classList.contains('gd-full') ? ':full' : '') : null, pathSquare: s ? s.getAttribute('data-site') : null }; })()`;
    const benches = [];
    for (const puts of [0, 2, 4, 6, 8]) {
      const w = benchAfter(puts);
      await setJson('map', { rows: w.map });
      await setJson('things', w.things);
      await setJson('robots', w.robots);
      await wait(500);
      const b = await evaluate(BENCH_READ);
      benches.push({ puts, have: w.things.find((t) => t.id === 'bench').have, ...b });
      await shot(`iw003s-2d-bench-${puts}`);
    }
    readings.iw003s = { benches };
    check('IW-003 lane S (2D): the engine’s bench, put by put — stage 0 (pegs, 0/8) · 1 a leg (2/8) · 2 two legs (4/8) · 3 the seat (6/8) · 4 built (8/8, green) with Sami sitting on it; never a path square, beside a full path square that is',
      JSON.stringify(benches.map((b) => [b.have, b.stage, b.meter, b.sits])) === JSON.stringify([[0, '0', '0/8', false], [2, '1', '2/8', false], [4, '2', '4/8', false], [6, '3', '6/8', false], [8, '4', '8/8:full', true]]) && benches.every((b) => b.ground !== 'path' && b.pathSquare === 'path') && benches[4].samiH > 10, benches);
  }

  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  return { dir: DIR, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
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
