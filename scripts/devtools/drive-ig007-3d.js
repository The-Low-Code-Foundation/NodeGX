#!/usr/bin/env node
/**
 * IG-007 — drive the Garden 3D node in a headless Chrome with SOFTWARE WebGL, on the DEPLOYED two-module project.
 *
 * The project is `packages/noodl-mcp/tests/fixtures/garden-3d-app` with `garden-3d-kit` and `garden-kit` copied in
 * beside it (nothing else — P105 D41). Every kit port is fed by a Variable, so this drive plays the engine's part
 * through `Noodl.Variables.set(...)` and reads what came back OUT OF THE PORTS (Tile X, Tile Y, a Counter on Tile
 * Tapped and on Ready, Supported, Frame Ms — all written into Variables by the graph), then the pixels.
 *
 * Usage:
 *   node scripts/devtools/drive-ig007-3d.js assemble <project-dir>
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs <project-dir> <deploy-dir> --allow-development-engine
 *   node scripts/devtools/drive-ig007-3d.js <deploy-dir> [--shots <dir>] [--json <file>]
 *
 * 🔴 The deploy exits 0 EVEN WHEN IT REFUSES TO WRITE (it prints {"ok":false}); check <deploy-dir>/index.html's mtime.
 * 🔴 Chrome runs with `--use-angle=swiftshader`: the frame times are a software renderer's on this Mac's CPU and say
 *    nothing about the tablet (IG-007 AC3 is Richard's, on the tablet). Supported, Ready, the pixels, the glide and
 *    the tap are what this drive grades.
 *
 * Clauses (each beside its known-firing half):
 *   BOOT   the page drew, Noodl.Variables is reachable, index.html loads three.min.js BEFORE garden-3d-kit/index.js
 *   SUPP   Supported came out of the port as true; the root says so; garden-kit's helpers were found on the page
 *   READY  Ready fired once (the Counter); the root carries data-ready
 *   PIXELS the canvas region of a screenshot is not one colour (≥ 200 distinct colours), draw calls > 0
 *   GLIDE  a Robots write moves the robot's name pill across the screen, mid-glide it reports gliding, and the
 *          screenshots before and after differ inside the robot's region
 *   TURN   a d write changes the robot's yaw without moving it; BUMP a risen count recoils; HOP Celebrate lifts it
 *   TAP    a CDP mouse press and release on a tile centre (≤ 8 px) fires Tile Tapped with that Tile X / Tile Y; a
 *          CDP touch tap on another tile does the same; a 60 px drag pans and fires nothing; a wheel zooms in bounds
 *   CAMERA island frames the whole map, plot with a Focus frames closer (screenshots of both)
 *   BUBBLE a Bubble shows near the robot and does not eat a press (elementFromPoint at its centre is the canvas)
 *   FRAME  Frame Ms came out of the port as a number > 0 (a READOUT under software GL, not a pass)
 *   ISLAND a 24×16 map with three robots draws ≤ 500 meshes (screenshot)
 * P108 IW-002 AC6 (lane D), at the end — the job world the ENGINE writes (the template's Step script; the same world
 * drive-cg001-kit.js draws in 2D), fed through the Variables:
 *   JOB    every new thing built (the wall tiles, the sites by stage, the basket's eggs, the store, the can and its level,
 *          the used rock, the hen and her pen, a letter standing in the post box, the tulips part / full / drooping) and
 *          every meter a chip in the overlay with the engine's numbers (screenshot)
 *   WATCH  Watch rings the chips' things (DOM rings sized by the tile) and draws their meters large (screenshot)
 *   PICK   Picking frames the world violet; the pointer over the basket lifts it (the engine's own reading) and a real
 *          click still reports Tile X / Tile Y / Tile Tapped through the graph's Variables (screenshot)
 *   SEEDS  IW-002 AC4's kit half: seeds 1, 2, 3 build three layouts, each the engine's; seed 2 again builds seed 2's
 * P108 IW-003 (lane B), at the end:
 *   BALL   Biscuit's things in 3D from the template's own wall-until and bowl-if worlds: the ball by the wall, on Pip's
 *          back, in the basket; the food sack with biscuits (shots)
 *   BARS   a 46×22 world of job things, the island camera: every compact chip is a 12 px bar, no two touching (shot)
 *   0 console errors.
 * Exits 0 when every clause passed, 1 when any did, 2 on a usage error.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { withDeployedSite } = require('./drive-deployed.js');

const REPO = path.join(__dirname, '..', '..');
const FIXTURE = path.join(REPO, 'packages', 'noodl-mcp', 'tests', 'fixtures', 'garden-3d-app');
const KITS = ['garden-3d-kit', 'garden-kit'].map((k) => [k, path.join(REPO, 'library', 'modules', k, 'project', 'noodl_modules', k)]);
const MESH_BUDGET = 500;

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

if (process.argv[2] === 'assemble') {
  const out = process.argv[3];
  if (!out) {
    console.error('usage: drive-ig007-3d.js assemble <project-dir>');
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
  const three = path.join(out, 'noodl_modules', 'garden-3d-kit', 'three.min.js');
  console.log(JSON.stringify({ assembled: out, modules, threeBytes: fs.existsSync(three) ? fs.statSync(three).size : null, kitBytes: Object.fromEntries(KITS.map(([n, d]) => [n, fs.statSync(path.join(d, 'index.js')).size])) }, null, 1));
  process.exit(modules.length === 2 && fs.existsSync(three) ? 0 : 1);
}

const DIR = process.argv[2];
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-ig007-3d.js <deploy-dir> [--shots <dir>] [--json <file>]  |  assemble <project-dir>');
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

/**
 * A PNG decoder for what Page.captureScreenshot returns (8-bit RGB or RGBA, no interlace): enough to count colours
 * in a region and to compare two shots inside a box. No dependency; ~40 lines.
 */
function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colourType = 6;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colourType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`unsupported PNG: depth ${data[8]} interlace ${data[12]}`);
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = colourType === 6 ? 4 : colourType === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, bpp, data: out, at: (x, y) => out.readUIntBE((y * width + x) * bpp, 3) };
}

function distinctColours(png, box) {
  const seen = new Set();
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(png.width, Math.ceil(box.x + box.w));
  const y1 = Math.min(png.height, Math.ceil(box.y + box.h));
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) seen.add(png.at(x, y));
  return seen.size;
}

function differing(a, b, box) {
  let n = 0;
  let total = 0;
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(a.width, b.width, Math.ceil(box.x + box.w));
  const y1 = Math.min(a.height, b.height, Math.ceil(box.y + box.h));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      total++;
      if (a.at(x, y) !== b.at(x, y)) n++;
    }
  return { differing: n, total, fraction: total ? n / total : 0 };
}

const MAP8 = { rows: ['GGTGGGTH', 'GGGGGGGG', 'GGFGFGFG', 'PPPPPPPP', 'GWWGGRGG', 'GGGGGTGG'] };
const PIP = { x: 0, y: 3, d: 1, colour: '#FF7A59', eyes: 'round', hat: 'none', name: 'Pip' };
const BO = { x: 5, y: 1, d: 2, colour: '#8F6BFF', eyes: 'happy', hat: 'cap', name: 'Bo' };
const COBBLE = { x: 20, y: 12, d: 3, colour: '#4FA7DC', eyes: 'wink', hat: 'sun', name: 'Cobble' };
const ISLAND = (() => {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 24; x++) {
      const edge = x === 0 || y === 0 || x === 23 || y === 15;
      const k = (x * 7 + y * 3) % 17;
      r += edge ? 'W' : k === 0 ? 'T' : k === 1 ? 'R' : k === 2 ? 'H' : k === 3 ? 'F' : k === 4 ? 'W' : k === 5 ? 'P' : k === 6 ? 'T' : 'G';
    }
    rows.push(r);
  }
  return { rows };
})();

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
// ── P108 IW-003 (lane P): a street of three doors and a post box; the engine posts Sami's letter ──
const P_STREET = () => ({
  map: ['GHGGHGGH', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'GTGGGGTG'],
  things: [
    { kind: 'door', id: 'dm', x: 1, y: 1, owner: 'Mamie Rose', count: 0, capacity: 1 },
    { kind: 'door', id: 'ds', x: 4, y: 1, owner: 'Sami', count: 0, capacity: 1 },
    { kind: 'door', id: 'db', x: 7, y: 1, owner: 'Biscuit', count: 0, capacity: 1 },
    { kind: 'postbox', id: 'pb', x: 2, y: 2 },
    { kind: 'letter', id: 'l1', x: 2, y: 2, to: 'Sami' },
    { kind: 'letter', id: 'l2', x: 2, y: 2, to: 'Biscuit' }
  ],
  robots: [{ id: 'pip', x: 3, y: 3, d: 0, name: 'Pocket', colour: '#FFB347', accessory: 'satchel' }]
});
/** Pocket takes Sami's letter from the post box to his door: go to [post box], pick, go to [Sami's door], put. */
const P_POST = [{ id: 1, t: 'go_to', slots: { thing: { id: 'pb', kind: 'postbox', x: 2, y: 2 } } }, { id: 2, t: 'pick' }, { id: 3, t: 'go_to', slots: { thing: { id: 'ds', kind: 'door', x: 4, y: 1 } } }, { id: 4, t: 'put' }];

withDeployedSite({ dir: DIR, gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, async (page) => {
  const evaluate = (expr) => page.evaluate(expr);
  const setVar = async (name, value) => {
    await evaluate(`Noodl.Variables.set(${JSON.stringify(name)}, ${JSON.stringify(value)})`);
    await wait(120);
  };
  const setJson = (name, value) => setVar(name, JSON.stringify(value));
  const getVar = (name) => evaluate(`Noodl.Variables.get(${JSON.stringify(name)})`);
  const until = async (expr, ok, ms = 10000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(150);
      last = await evaluate(expr);
    }
    return last;
  };
  const shotFile = (name) => (SHOTS ? path.join(SHOTS, `${name}.png`) : null);
  const shot = async (name) => {
    const file = shotFile(name);
    if (!file) {
      const { data } = await page.client.send('Page.captureScreenshot', { format: 'png' });
      return decodePng(Buffer.from(data, 'base64'));
    }
    await page.screenshot(file);
    return decodePng(fs.readFileSync(file));
  };
  const rect = (selector) =>
    evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
  const ROOT = `document.querySelector('[data-gd3-world]')`;
  const attrs = () => evaluate(`(() => { const e = ${ROOT}; if (!e) return null; const o = {}; for (const a of e.attributes) o[a.name] = a.value; return o; })()`);
  const robot = (i) => evaluate(`${ROOT}.gd3.robotAt(${i})`);
  const state = () => evaluate(`${ROOT}.gd3.state`);
  /** Where a tile's centre is on the page, from the node's own projection (the drive taps there). */
  const tilePoint = async (x, y) => {
    const c = await rect('[data-gd3-canvas]');
    const s = await evaluate(`${ROOT}.gd3.screenOfTile(${x}, ${y})`);
    return { x: c.x + s.sx, y: c.y + s.sy };
  };
  const mouse = (type, x, y, extra) => page.client.send('Input.dispatchMouseEvent', Object.assign({ type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 }, extra || {}));
  const touch = (type, points) => page.client.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) });

  // ── BOOT ─────────────────────────────────────────────────────────────────
  await page.setViewport({ width: 1024, height: 800 });
  await page.navigate('/');
  const marker = await until(`document.body.innerText.includes('ig007 page drew')`, (v) => v === true, 15000);
  const api = await until(`typeof Noodl !== 'undefined' && !!Noodl.Variables`, (v) => v === true, 10000);
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const threeAt = html.indexOf('garden-3d-kit/three.min.js');
  const kitAt = html.indexOf('garden-3d-kit/index.js');
  readings.boot = { marker, api, threeAt, kitAt, modules: await evaluate(`Array.isArray(window.__noodl_modules) ? window.__noodl_modules.map((m) => m && m.name) : 'n/a'`), THREE: await evaluate(`typeof THREE !== 'undefined' ? THREE.REVISION : null`) };
  check('BOOT: the page drew, Noodl.Variables is reachable, index.html loads three.min.js before garden-3d-kit/index.js, THREE r158 is a global', marker && api && threeAt !== -1 && kitAt !== -1 && threeAt < kitAt && readings.boot.THREE === '158', readings.boot);

  await setJson('map', MAP8);
  await setJson('robots', [PIP]);
  await setJson('things', []);
  await setVar('bubble', '');
  await setVar('stepMs', 380);
  await setVar('camera', 'island');
  await setVar('focus', '');

  // ── SUPP + READY ─────────────────────────────────────────────────────────
  const ready = await until(`({ supported: Noodl.Variables.get('supported'), ready: Noodl.Variables.get('ready'), attrs: (() => { const e = ${ROOT}; if (!e) return null; const o = {}; for (const a of e.attributes) o[a.name] = a.value; return o; })() })`, (v) => v.attrs && v.attrs['data-ready'] === 'true' && v.ready >= 1, 10000);
  readings.ready = ready;
  check('SUPP: Supported came out of the port as true, the root agrees, and garden-kit’s helpers were found on the page', ready.supported === true && ready.attrs && ready.attrs['data-supported'] === 'true' && ready.attrs['data-helpers'] === 'sibling', ready);
  check('READY: Ready fired once (the Counter reads 1) and the root carries data-ready', ready.ready === 1 && ready.attrs && ready.attrs['data-ready'] === 'true' && ready.attrs['data-w'] === '8' && ready.attrs['data-h'] === '6', ready);

  // ── PIXELS ───────────────────────────────────────────────────────────────
  await wait(600);
  const canvasRect = await rect('[data-gd3-canvas]');
  const island8 = await shot('island-8x6');
  const colours = distinctColours(island8, canvasRect);
  const a0 = await attrs();
  readings.pixels = { canvasRect, colours, drawCalls: a0 && a0['data-draw-calls'], meshes: a0 && a0['data-meshes'] };
  check('PIXELS: the canvas is not one colour (≥ 200 distinct colours in its region) and the renderer made draw calls', colours >= 200 && Number(readings.pixels.drawCalls) > 0, readings.pixels);

  // ── GLIDE ────────────────────────────────────────────────────────────────
  const pillBefore = await rect('.gd3-name[data-robot="0"]');
  const before = await shot('glide-before');
  await evaluate(`Noodl.Variables.set('robots', ${JSON.stringify(JSON.stringify([{ ...PIP, x: 2 }]))})`);
  await wait(150);
  const mid = await robot(0);
  const midShot = await shot('glide-mid');
  await wait(600);
  const after = await robot(0);
  const pillAfter = await rect('.gd3-name[data-robot="0"]');
  const afterShot = await shot('glide-after');
  const region = pillBefore && pillAfter ? { x: Math.min(pillBefore.x, pillAfter.x) - 40, y: Math.min(pillBefore.y, pillAfter.y) - 90, w: Math.abs(pillAfter.x - pillBefore.x) + pillBefore.w + 80, h: Math.abs(pillAfter.y - pillBefore.y) + 130 } : canvasRect;
  const diff = differing(before, afterShot, region);
  const midDiff = differing(before, midShot, region);
  readings.glide = { pillBefore, pillAfter, mid, after, region, diff, midDiff, dataX: await evaluate(`document.querySelector('.gd3-name[data-robot="0"]').getAttribute('data-x')`) };
  // P106 s2: the camera is turned 0.42 rad (the mockup's), so two tiles along +x run right AND down the screen: the pill
  // moves where the node's own projection says the tile centre went (± 12 px), > 40 px in all.
  readings.glide.expected = await evaluate(`(() => { const r = ${ROOT}.gd3; const a = r.screenOfTile(0, 3); const b = r.screenOfTile(2, 3); return { dx: b.sx - a.sx, dy: b.sy - a.sy }; })()`);
  const moved = pillBefore && pillAfter ? { dx: pillAfter.x - pillBefore.x, dy: pillAfter.y - pillBefore.y } : null;
  check('GLIDE: a Robots write glides the robot two tiles — the name pill moved > 40 px the way the tiles run on screen, it reported gliding mid-way, and the shots differ in its region', moved && Math.hypot(moved.dx, moved.dy) > 40 && Math.abs(moved.dx - readings.glide.expected.dx) < 12 && Math.abs(moved.dy - readings.glide.expected.dy) < 12 && mid && mid.gliding === true && after && after.gliding === false && diff.fraction > 0.02 && midDiff.fraction > 0.005 && readings.glide.dataX === '2', readings.glide);

  // ── TURN / BUMP / HOP ────────────────────────────────────────────────────
  const yaw0 = (await robot(0)).yaw;
  await setJson('robots', [{ ...PIP, x: 2, d: 2 }]);
  await wait(450);
  const turned = await robot(0);
  readings.turn = { yaw0, turned };
  check('TURN: a d write changes the yaw by a quarter turn without moving the robot', turned && Math.abs(Math.abs(turned.yaw - yaw0) - Math.PI / 2) < 0.05 && Math.abs(turned.x - after.x) < 0.01, readings.turn);
  await evaluate(`Noodl.Variables.set('robots', ${JSON.stringify(JSON.stringify([{ ...PIP, x: 2, d: 2, bump: 1 }]))})`);
  await wait(60);
  const bumping = await robot(0);
  await wait(450);
  const rested = await robot(0);
  readings.bump = { bumping, rested };
  check('BUMP: a risen bump count recoils the robot for a moment and it comes back to its tile', bumping && bumping.bumping === true && rested && rested.bumping === false && Math.abs(rested.x - turned.x) < 0.01 && Math.abs(rested.z - turned.z) < 0.01, readings.bump);
  await setVar('celebrate', 1);
  await wait(250);
  const hopping = await robot(0);
  await wait(1400);
  const landed = await robot(0);
  readings.hop = { hopping, landed };
  check('HOP: Celebrate lifts the robot off its tile and it lands again', hopping && hopping.y > landed.y + 0.05 && Math.abs(landed.y - rested.y) < 0.01, readings.hop);

  // ── TAP ──────────────────────────────────────────────────────────────────
  const taps0 = Number((await getVar('taps')) || 0);
  const p52 = await tilePoint(5, 2);
  await mouse('mouseMoved', p52.x, p52.y, { button: 'none' });
  await mouse('mousePressed', p52.x, p52.y);
  await mouse('mouseMoved', p52.x + 3, p52.y + 2);
  await mouse('mouseReleased', p52.x + 3, p52.y + 2);
  const tap1 = await until(`({ taps: Noodl.Variables.get('taps'), x: Noodl.Variables.get('tileX'), y: Noodl.Variables.get('tileY') })`, (v) => Number(v.taps) === taps0 + 1, 3000);
  readings.tap = { taps0, p52, tap1 };
  check('TAP: a mouse press and release 3 px apart on tile 5,2 fires Tile Tapped once with Tile X 5, Tile Y 2 (read from the graph’s Variables)', Number(tap1.taps) === taps0 + 1 && Number(tap1.x) === 5 && Number(tap1.y) === 2, readings.tap);
  const p14 = await tilePoint(1, 4);
  await touch('touchStart', [p14]);
  await touch('touchEnd', []);
  const tap2 = await until(`({ taps: Noodl.Variables.get('taps'), x: Noodl.Variables.get('tileX'), y: Noodl.Variables.get('tileY') })`, (v) => Number(v.taps) === taps0 + 2, 3000);
  readings.tap.touch = { p14, tap2 };
  check('TAP: a touch tap on tile 1,4 (the water) fires Tile Tapped with Tile X 1, Tile Y 4', Number(tap2.taps) === taps0 + 2 && Number(tap2.x) === 1 && Number(tap2.y) === 4, readings.tap.touch);
  const stBefore = await state();
  const p33 = await tilePoint(3, 3);
  await mouse('mousePressed', p33.x, p33.y);
  for (let i = 1; i <= 6; i++) await mouse('mouseMoved', p33.x + i * 10, p33.y + i * 5);
  await mouse('mouseReleased', p33.x + 60, p33.y + 30);
  await wait(200);
  const stAfter = await state();
  const tapsAfterDrag = Number(await getVar('taps'));
  readings.drag = { stBefore, stAfter, tapsAfterDrag };
  check('DRAG: a 60 px drag pans the camera (the target moved) and fires no tap', tapsAfterDrag === taps0 + 2 && stAfter && stBefore && (Math.abs(stAfter.tx - stBefore.tx) > 0.05 || Math.abs(stAfter.tz - stBefore.tz) > 0.05) && Math.abs(stAfter.dist - stBefore.dist) < 1e-6, readings.drag);
  await mouse('mouseWheel', p33.x, p33.y, { deltaX: 0, deltaY: -600 });
  await wait(200);
  const zoomed = await state();
  const bounds = await evaluate(`(() => { const r = ${ROOT}; const m = r.gd3.world.map; return r.gd3.constructor === Object ? null : null; })()`);
  void bounds;
  readings.wheel = { before: stAfter, zoomed };
  check('WHEEL: a wheel up zooms in (the distance shrank) and stays above zero', zoomed.dist < stAfter.dist && zoomed.dist > 0, readings.wheel);

  // ── CAMERA ───────────────────────────────────────────────────────────────
  // 🔴 Run 1: the port already read 'island' from boot, so writing 'island' after the wheel zoom changed nothing (a
  // same-value write is not a change, in the node or in the runtime) and the "island" state read was the zoomed one.
  // A finger's zoom holds until Camera or Focus CHANGES; the page re-frames by changing the port.
  await setVar('camera', 'follow');
  await wait(300);
  await setVar('camera', 'island');
  await wait(600);
  const islandState = await state();
  await shot('camera-island');
  await setJson('focus', { x: 0, y: 2, w: 4, h: 3 });
  await setVar('camera', 'plot');
  await wait(700);
  const plotState = await state();
  const plotShot = await shot('camera-plot');
  const plotColours = distinctColours(plotShot, canvasRect);
  readings.camera = { islandState, plotState, plotColours, attr: (await attrs())['data-camera'] };
  check('CAMERA: island frames the whole map; plot with Focus {0,2,4,3} frames closer and to the left', plotState.dist < islandState.dist * 0.8 && plotState.tx < islandState.tx - 1 && readings.camera.attr === 'plot' && plotColours >= 200, readings.camera);
  await setVar('camera', 'island');
  await wait(600);

  // ── BUBBLE ───────────────────────────────────────────────────────────────
  await setJson('bubble', { robot: 0, text: 'Glug glug!', ms: 4000 });
  const bubble = await until(`(() => { const b = document.querySelector('.gd3-bubble'); if (!b) return null; const r = b.getBoundingClientRect(); const p = document.querySelector('.gd3-name[data-robot="0"]').getBoundingClientRect(); const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { text: b.textContent, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, pill: { x: p.left, y: p.top }, under: under ? (under.getAttribute('data-gd3-canvas') ? 'canvas' : under.className) : null }; })()`, (v) => !!v, 3000);
  await shot('bubble');
  readings.bubble = bubble;
  check('BUBBLE: the bubble shows the text near the robot (≤ 160 px from its pill) and does not eat a press (elementFromPoint at its centre is the canvas)', bubble && bubble.text === 'Glug glug!' && Math.hypot(bubble.rect.x - bubble.pill.x, bubble.rect.y - bubble.pill.y) <= 160 && bubble.under === 'canvas', bubble);

  // ── FRAME ────────────────────────────────────────────────────────────────
  await wait(1200);
  const frameMs = await getVar('frameMs');
  readings.frame = { frameMs, attr: (await attrs())['data-frame-ms'], renderer: 'swiftshader (software), this Mac' };
  console.log(`FRAME READOUT  Frame Ms p95 under software GL at 8×6: ${frameMs}`);
  check('FRAME: Frame Ms came out of the port as a number > 0 (a readout, not a pass — software GL)', typeof frameMs === 'number' && frameMs > 0, readings.frame);

  // ── ISLAND 24×16 ─────────────────────────────────────────────────────────
  await setVar('bubble', '');
  await setJson('map', ISLAND);
  await setJson('robots', [{ ...PIP, x: 2, y: 2 }, { ...BO, x: 8, y: 6 }, COBBLE]);
  await setJson('things', Array.from({ length: 30 }, (_, i) => ({ kind: ['tulip', 'puddle', 'letter', 'bowl', 'label'][i % 5], x: 1 + (i % 22), y: 1 + ((i * 3) % 14), watered: i % 2 === 0, full: i % 3 === 0, text: 'hi' })));
  await setVar('camera', 'island');
  await wait(900);
  const islandAttrs = await attrs();
  const big = await shot('island-24x16');
  readings.island = { meshes: islandAttrs['data-meshes'], drawCalls: islandAttrs['data-draw-calls'], w: islandAttrs['data-w'], h: islandAttrs['data-h'], colours: distinctColours(big, await rect('[data-gd3-canvas]')), pills: await evaluate(`document.querySelectorAll('.gd3-name').length`) };
  check(`ISLAND: a 24×16 map with 30 things and three robots draws ≤ ${MESH_BUDGET} meshes, three name pills, and is not one colour`, Number(readings.island.meshes) <= MESH_BUDGET && Number(readings.island.meshes) > 50 && readings.island.w === '24' && readings.island.pills === 3 && readings.island.colours >= 200, readings.island);

  // ── VOCAB (P106 s2, the common brief's §4) ─────────────────────────────
  // Drawn through the engine with the kit's OWN helpers: on this branch garden-kit's parseRobots (the sibling helper a
  // page with both kits uses) does not carry can / canMax / carry yet — lane A adds them; after the merge the ports do.
  await setVar('bubble', '');
  const vocab = await evaluate(`(() => {
    const node = window.__noodl_modules.find((m) => m.reactNodes && m.reactNodes.some((n) => n.name === 'garden-3d-kit.Garden3D')).reactNodes.find((n) => n.name === 'garden-3d-kit.Garden3D');
    const W = node.world;
    const eng = ${ROOT}.gd3;
    eng.setWorld({
      map: W.parseMap({ rows: ['GGGGGGGG', 'GGGGGGGG', 'PPPPPPPB', 'GGGGGGGG', 'GWWGGGGG', 'GGGGGTGG'] }),
      things: W.parseThings([{ kind: 'rock', x: 1, y: 1, left: 4 }, { kind: 'rock', x: 2, y: 1, left: 2 }, { kind: 'rock', x: 3, y: 1, left: 1 }, { kind: 'sign', x: 5, y: 1, text: 'Tulips this way' }, { kind: 'note', x: 6, y: 3, text: 'the red ones' }, { kind: 'stone', x: 4, y: 3 }, { kind: 'stone', x: 5, y: 3 }]),
      robots: W.parseRobots([{ x: 1, y: 2, d: 1, name: 'Pip', can: 2, canMax: 3, carry: ['stone'] }, { x: 3, y: 3, d: 2, name: 'Cobble', colour: '#3E63C8', hat: 'cap', eyes: 'happy', can: 0, carry: ['letter'] }, { x: 5, y: 4, d: 3, name: 'Pocket', colour: '#8F6BFF', hat: 'sun', eyes: 'wink', carry: ['cake'] }])
    });
    const things = eng.built.things.map((g) => g.userData.kind + (g.userData.size ? ':' + g.userData.size : ''));
    const bots = eng.built.robots.map((g) => { let level = null; let load = null; g.traverse((o) => { if (o.name === 'level') level = { share: +o.scale.y.toFixed(2), visible: o.visible }; if (o.name === 'load') load = o.userData.load; }); return { level, load }; });
    const labels = [...document.querySelectorAll('.gd3-label')].map((e) => e.textContent);
    return { things, bots, labels, meshes: eng.meshCount };
  })()`);
  await setJson('focus', { x: 0, y: 0, w: 8, h: 6 });
  await setVar('camera', 'plot');
  await wait(900);
  await shot('vocab-8x6');
  readings.vocab = vocab;
  check('VOCAB: rocks big / medium / small by left, a sign and a note (their text not on the tile), stones; the can at 2 of 3, empty at 0, none at null; the loads stone, letter, parcel', JSON.stringify(vocab.things.filter((k) => k.startsWith('rock'))) === JSON.stringify(['rock:big', 'rock:medium', 'rock:small']) && vocab.things.includes('sign') && vocab.things.includes('note') && vocab.labels.length === 0 && vocab.bots[0].level && vocab.bots[0].level.share === 0.67 && vocab.bots[1].level && vocab.bots[1].level.visible === false && vocab.bots[2].level === null && JSON.stringify(vocab.bots.map((b) => b.load)) === JSON.stringify(['stone', 'letter', 'parcel']), vocab);

  // ══ P108 IW-002 AC6 (lane D): the job model in 3D from a world the ENGINE wrote, Watch, Picking, seeds ══
  const ENG = engineApi();
  await page.setViewport({ width: 1024, height: 800 });
  await setVar('bubble', '');
  await setVar('watch', '');
  await setVar('picking', false);
  const job = jobWorld(ENG);
  readings.iw002 = { engineWorld: job };
  await setJson('map', { rows: job.map });
  await setJson('things', job.things);
  await setJson('robots', job.robots);
  await setJson('focus', { x: 0, y: 0, w: 8, h: 6 });
  await setVar('camera', 'island');
  await wait(300);
  await setVar('camera', 'plot');
  await wait(900);
  const JOB3 = `(() => {
    const eng = ${ROOT}.gd3;
    const by = (k) => eng.built.things.filter((g) => g.userData.kind === k);
    const named = (g, n) => { let f = null; g.traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
    const chips = [...document.querySelectorAll('.gd3-meter')].map((c) => c.getAttribute('data-kind') + ':' + c.getAttribute('data-meter') + (c.classList.contains('gd3-full') ? ':full' : '') + (c.classList.contains('gd3-watch') ? ':watch' : ''));
    const rings = [...document.querySelectorAll('.gd3-ring')].map((r) => { const b = r.getBoundingClientRect(); return { ring: r.getAttribute('data-ring'), at: (r.getAttribute('data-x') || 'r' + r.getAttribute('data-robot')) + ',' + (r.getAttribute('data-y') || ''), w: Math.round(b.width), h: Math.round(b.height), colour: getComputedStyle(r).borderTopColor }; });
    return {
      walls: eng.built.tiles.filter((m) => m.name === 'tiles-wall').length,
      sites: by('site').map((g) => g.userData.stage),
      eggsInBasket: by('basket').map((g) => g.userData.eggs),
      canLevel: by('can').map((g) => +named(g, 'level').scale.y.toFixed(2)),
      rocks: by('rock').map((g) => g.userData.size),
      pen: by('hen').map((g) => g.userData.pen),
      letterInBox: by('letter').map((g) => !!g.userData.inBox),
      tulips: by('tulip').map((g) => g.userData.x + ':' + (g.userData.wet ? 'wet' : g.userData.look || 'dry')),
      robotCan: (() => { const r = eng.built.robots[0]; const l = r && named(r, 'level'); return l ? +l.scale.y.toFixed(2) : null; })(),
      chips, rings, meshes: eng.meshCount, watched: ${ROOT}.getAttribute('data-watched')
    };
  })()`;
  const j3 = await evaluate(JOB3);
  readings.iw002.drawn = j3;
  await shot('iw002-3d-job-world');
  check('IW-002 AC6 (3D): the engine’s job world builds — two wall tiles, sites dirt · gravel · cobbles · path, 3 eggs in the basket, the can at 2/3, a regrowing and a used rock, the hen’s 3×2 pen, a letter standing in the post box, tulips part · full · drooping, Pip’s can at 1/3',
    j3.walls === 1 && JSON.stringify(j3.sites) === JSON.stringify(['dirt', 'gravel', 'cobbles', 'path']) && JSON.stringify(j3.eggsInBasket) === '[3]' && JSON.stringify(j3.canLevel) === '[0.67]' && JSON.stringify(j3.rocks) === JSON.stringify(['medium', 'used']) && JSON.stringify(j3.pen) === JSON.stringify([{ x: 0, y: 4, w: 3, h: 2 }]) && JSON.stringify(j3.letterInBox) === '[true]' && JSON.stringify(j3.tulips) === JSON.stringify(['1:part', '2:wet', '3:droop']) && j3.robotCan === 0.33, j3);
  check('IW-002 AC6 (3D): every meter is the mockup’s chip in the overlay with the engine’s numbers — the tulips 2/3, 3/3 green, 2/3; the sites 0/4 … 4/4 green; the basket 3/4, the store 2/6, the can 2/3, the rocks 2/4 and 0/4; Pip’s held can 1/3',
    JSON.stringify([...j3.chips].sort()) === JSON.stringify(['basket:3/4', 'can:1/3', 'can:2/3', 'rock:0/4', 'rock:2/4', 'site:0/4', 'site:1/4', 'site:3/4', 'site:4/4:full', 'store:2/6', 'tulip:2/3', 'tulip:2/3', 'tulip:3/3:full']), j3.chips);
  await setJson('watch', [{ id: 'tu1', kind: 'tulip', x: 99, y: 99 }, { kind: 'basket', x: 6, y: 1 }, { kind: 'can', x: 1, y: 1 }, { kind: 'ahead', x: 3, y: 1 }]);
  await wait(500);
  const w3 = await evaluate(JOB3);
  readings.iw002.watch = w3;
  await shot('iw002-3d-watch');
  check('IW-002 (brief §4.4) Watch (3D): four rings — the tulip by id, the basket, Pip holding the can, the tile ahead — violet ellipses the size of a tile on screen; the three meters watched are large, the rest not',
    JSON.stringify(w3.rings.map((r) => r.ring + '@' + r.at).sort()) === JSON.stringify(['basket@6,1', 'robot@r0,', 'tile@3,1', 'tulip@1,0']) && w3.rings.every((r) => r.w > 20 && r.h > 10 && r.colour === 'rgb(143, 107, 255)') && w3.chips.filter((c) => c.endsWith(':watch')).length === 3 && w3.watched === '4', { rings: w3.rings, chips: w3.chips });
  await setVar('watch', '');
  await wait(300);
  const unw = await evaluate(JOB3);
  check('IW-002 Watch (3D): empty rings nothing', unw.rings.length === 0 && !unw.chips.some((c) => c.endsWith(':watch')), unw.rings);
  // ── PICKING ──
  const border0 = await evaluate(`getComputedStyle(${ROOT}).borderTopColor`);
  await setVar('picking', true);
  await wait(300);
  const pb = await tilePoint(6, 1);
  const baseY = await evaluate(`${ROOT}.gd3.built.things.find((g) => g.userData.kind === 'basket').position.y`);
  await mouse('mouseMoved', pb.x, pb.y, { button: 'none' });
  await wait(400);
  const hover = await evaluate(`(() => { const e = ${ROOT}; const t = e.gd3.built.things; const b = t.find((g) => g.userData.kind === 'basket'); const s = t.find((g) => g.userData.kind === 'store'); return { hover: e.getAttribute('data-hover'), picking: e.getAttribute('data-picking'), cls: e.className, border: getComputedStyle(e).borderTopColor, basketY: b.position.y, basketLifted: b.userData.lifted, storeLifted: s.userData.lifted }; })()`);
  await shot('iw002-3d-picking');
  const tapsP = Number((await getVar('taps')) || 0);
  await mouse('mousePressed', pb.x, pb.y);
  await mouse('mouseReleased', pb.x + 2, pb.y + 1);
  const tapP = await until(`({ taps: Noodl.Variables.get('taps'), x: Noodl.Variables.get('tileX'), y: Noodl.Variables.get('tileY') })`, (v) => Number(v.taps) === tapsP + 1, 3000);
  readings.iw002.picking = { border0, baseY, hover, tapP };
  check('IW-002 (brief §4.4) Picking (3D): the world is framed violet, the basket under the pointer is lifted (the store beside it is not), and a click still reports Tile X 6 / Tile Y 1 / Tile Tapped',
    /gd3-picking/.test(hover.cls) && hover.border === 'rgb(143, 107, 255)' && border0 !== hover.border && hover.picking === 'true' && hover.hover === '6,1' && hover.basketLifted === true && hover.basketY > baseY + 0.1 && hover.storeLifted === false && Number(tapP.taps) === tapsP + 1 && Number(tapP.x) === 6 && Number(tapP.y) === 1, readings.iw002.picking);
  await setVar('picking', false);
  await wait(300);
  const off = await evaluate(`(() => { const e = ${ROOT}; const b = e.gd3.built.things.find((g) => g.userData.kind === 'basket'); return { border: getComputedStyle(e).borderTopColor, y: b.position.y }; })()`);
  check('IW-002 Picking (3D): off, the frame is the world’s own and the basket is down again', off.border === border0 && Math.abs(off.y - baseY) < 1e-6, off);
  // ── SEEDS ──
  const seeds3 = {};
  for (const seed of [1, 2, 3, 2]) {
    const w = seededWorld(ENG, seed);
    await setJson('map', { rows: w.map });
    await setJson('things', w.things);
    await setJson('robots', w.robots);
    await wait(700);
    const got = await evaluate(`(() => { const eng = ${ROOT}.gd3; return { wall: eng.world.map.cells.filter((c) => c.kind === 'wall').map((c) => c.x + ',' + c.y).join(' '), eggs: eng.built.things.filter((g) => g.userData.kind === 'egg').map((g) => g.userData.x + ',' + g.userData.y).sort().join(' '), wallMesh: eng.built.tiles.filter((m) => m.name === 'tiles-wall').length }; })()`);
    const engineSaid = { wall: w.map.map((r, y) => [...r].map((c, x) => (c === 'L' ? x + ',' + y : null)).filter(Boolean)).flat().join(' '), eggs: w.things.filter((t) => t.kind === 'egg').map((t) => t.x + ',' + t.y).sort().join(' '), wallMesh: 1 };
    const key = seed in seeds3 ? `${seed}-again` : String(seed);
    seeds3[key] = { got, engineSaid };
    if (key === String(seed)) await shot(`iw002-3d-seed-${seed}`);
  }
  readings.iw002.seeds = seeds3;
  const l3 = (k) => JSON.stringify(seeds3[k].got);
  check('IW-002 AC4 (the 3D kit): seeds 1, 2, 3 build three layouts — each the wall and eggs the engine laid — and seed 2 again builds seed 2’s', new Set([l3('1'), l3('2'), l3('3')]).size === 3 && l3('2-again') === l3('2') && ['1', '2', '3'].every((k) => JSON.stringify(seeds3[k].got) === JSON.stringify(seeds3[k].engineSaid)), seeds3);

  // ══ P108 IW-003 (lane P): the doors in 3D — the street before and after the ENGINE posts Sami's letter ══
  {
    const ENGP = engineApi();
    await setJson('watch', '');
    await setJson('focus', { x: 0, y: 0, w: 8, h: 6 });
    const start = ENGP.worldOf(P_STREET());
    const after = engineRun(ENGP, JSON.parse(JSON.stringify(start)), P_POST);
    const DOORS3 = `(() => { const eng = ${ROOT}.gd3; const doors = eng.built.things.filter((g) => g.userData.kind === 'door');
      return { doors: doors.map((g) => ({ x: g.userData.x, owner: g.userData.owner, mail: !!g.userData.mail })),
        plates: [...document.querySelectorAll('.gd3-plate')].map((e) => e.getAttribute('data-owner') + '=' + e.textContent + '@' + Math.round(parseFloat(e.style.left)) + ',' + Math.round(parseFloat(e.style.top))),
        chips: [...document.querySelectorAll('.gd3-meter[data-kind="door"]')].map((c) => c.getAttribute('data-meter') + (c.classList.contains('gd3-full') ? ':full' : '')) }; })()`;
    for (const [when, w] of [['before', start], ['after', after]]) {
      await setJson('map', { rows: w.map });
      await setJson('things', w.things);
      await setJson('robots', w.robots.map((r) => ({ x: r.x, y: r.y, d: r.d, name: 'Pocket', colour: '#FFB347', accessory: 'satchel', carry: r.carry })));
      await wait(900);
      readings['iw003-3d-' + when] = await evaluate(DOORS3);
      await shot(`iw003-3d-doors-${when}`);
    }
    const b = readings['iw003-3d-before'];
    const a = readings['iw003-3d-after'];
    const owners = (r) => r.plates.map((p) => p.split('@')[0]);
    check('IW-003 (3D, lane P): the street — three doors built, each with its owner’s plate in the overlay (Mamie Rose, Sami, Biscuit) and a 0/1 chip', b.doors.length === 3 && JSON.stringify(owners(b)) === JSON.stringify(['Mamie Rose=Mamie Rose', 'Sami=Sami', 'Biscuit=Biscuit']) && JSON.stringify(b.chips) === JSON.stringify(['0/1', '0/1', '0/1']) && b.doors.every((d) => !d.mail), b);
    check('IW-003 (3D, lane P): after the engine’s run Sami’s door holds the letter (drawn in its slot) and reads 1/1 green; the others 0/1', JSON.stringify(a.doors.map((d) => d.mail)) === JSON.stringify([false, true, false]) && JSON.stringify(a.chips) === JSON.stringify(['0/1', '1/1:full', '0/1']), a);
  }

  // ══ P108 IW-003 (lane B): Biscuit's things in 3D, from the template's own requests; the island's meters as bars ══
  {
    readings.iw003b = {};
    const reqNodes = JSON.parse(fs.readFileSync(path.join(REPO, 'templates', 'bot-garden', 'components', 'Data', 'Requests', 'nodes.json'), 'utf8'));
    const REQS = JSON.parse((Array.isArray(reqNodes) ? reqNodes : reqNodes.nodes || Object.values(reqNodes)).find((n) => n.type === 'Static Data').parameters.json);
    const laid = (id, seed) => {
      const r = REQS.find((x) => x.id === id);
      return ENG.worldOf(ENG.seedWorld({ map: r.map.slice(), things: JSON.parse(JSON.stringify(r.things)), robots: [{ id: 'pip', x: r.robotStart.x, y: r.robotStart.y, d: r.robotStart.d, carry: [], name: 'Pip', colour: '#FF7A59' }] }, JSON.parse(JSON.stringify(r)), seed));
    };
    const runFor = (w, program, stop) => {
      let run = ENG.newRun(program, 'pip', 'en', 'iw003b');
      for (let i = 0; i < 300 && !run.done && !stop(w); i++) {
        const st = ENG.step(run, w, null);
        w = ENG.apply(w, st.delta);
        run = st.run;
      }
      return w;
    };
    const B3 = `(() => { const eng = ${ROOT}.gd3; const by = (k) => eng.built.things.filter((g) => g.userData.kind === k); const named = (g, n) => { let f = null; g.traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
      const r = eng.built.robots[0]; const load = r && named(r, 'load');
      return { balls: by('ball').map((g) => g.userData.x + ',' + g.userData.y), basketBall: by('basket').map((g) => !!g.userData.ball), food: by('store').map((g) => g.userData.food || 0), load: load ? load.userData.load : null, walls: eng.built.tiles.filter((m) => m.name === 'tiles-wall').length }; })()`;
    const show3 = async (w, name) => {
      await setJson('map', { rows: w.map });
      await setJson('things', w.things);
      await setJson('robots', w.robots);
      await setJson('focus', { x: 0, y: 0, w: 8, h: 6 });
      await setVar('camera', 'plot');
      await wait(900);
      const got = await evaluate(B3);
      await shot(name);
      return got;
    };
    await page.setViewport({ width: 1024, height: 800 });
    const wall = REQS.find((x) => x.id === 'wall-until');
    const w0 = laid('wall-until', 1);
    const ball0 = w0.things.find((t) => t.kind === 'ball');
    const start = await show3(w0, 'iw003-3d-wall-until-start');
    const carrying = await show3(runFor(JSON.parse(JSON.stringify(w0)), wall.referenceProgram, (w) => (w.robots[0].carry || []).includes('ball')), 'iw003-3d-wall-until-carrying');
    const end = await show3(runFor(JSON.parse(JSON.stringify(w0)), wall.referenceProgram, () => false), 'iw003-3d-wall-until-end');
    const sack = await show3(laid('bowl-if', 1), 'iw003-3d-bowl-if');
    readings.iw003b.ball = { start, carrying, end, sack, ball0 };
    check('IW-003 (lane B) BALL (3D): the ball by the wall (the engine’s tile), then on Pip’s back, then in Biscuit’s basket and off the grass; the food sack carries biscuits',
      start.walls === 1 && start.balls.join() === `${ball0.x},${ball0.y}` && carrying.load === 'ball' && end.balls.length === 0 && end.basketBall.includes(true) && sack.food.length === 1 && sack.food[0] > 0, readings.iw003b.ball);
    // BARS: a 46×22 world with neighbouring tulips and a basket per plot, framed whole.
    const map = [];
    for (let y = 0; y < 22; y++) map.push(Array.from({ length: 46 }, () => (y === 7 || y === 14 ? 'P' : 'G')).join(''));
    const things = [];
    for (let p = 0; p < 13; p++) {
      const ox = (p % 5) * 9 + 1;
      const oy = Math.floor(p / 5) * 7 + 1;
      things.push({ kind: 'tulip', x: ox, y: oy, need: 3, have: p % 4 }, { kind: 'tulip', x: ox + 1, y: oy, need: 3, have: (p + 1) % 4 }, { kind: 'basket', x: ox + 4, y: oy + 1, count: p % 5, capacity: 4 });
    }
    await setJson('map', { rows: map });
    await setJson('things', things);
    await setJson('robots', []);
    await setVar('camera', 'island');
    await wait(1200);
    const bars = await evaluate(`[...document.querySelectorAll('.gd3-meter')].map((m) => { const r = m.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, at: m.getAttribute('data-x') + ',' + m.getAttribute('data-y'), wide: ${ROOT}.getAttribute('data-wide') }; })`);
    await shot('iw003-3d-island-bars');
    const hit = [];
    let neighbours = 0;
    for (let i = 0; i < bars.length; i++)
      for (let j = i + 1; j < bars.length; j++) {
        const [ax, ay] = bars[i].at.split(',').map(Number);
        const [bx, by] = bars[j].at.split(',').map(Number);
        if (Math.abs(ax - bx) + Math.abs(ay - by) === 1) neighbours++;
        const a = bars[i], b = bars[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) hit.push([a.at, b.at]);
      }
    readings.iw003b.bars = { n: bars.length, neighbours, hit, sample: bars.slice(0, 4) };
    check(`IW-003 (lane B) BARS (3D): the island camera on 46×22 — the ${bars.length} compact meters are bars of at most 12 px (80 % of a tile on screen), none touching another (${neighbours} on neighbouring tiles)`,
      bars.length === 39 && neighbours > 0 && hit.length === 0 && bars.every((b) => b.w <= 12.5 && b.wide === '1'), readings.iw003b.bars);
  }

  // ══ P108 IW-003 (lane S): Sami's bench in 3D, put by put, from worlds the ENGINE wrote ══
  {
    await page.setViewport({ width: 1024, height: 800 });
    await setVar('watch', '');
    await setVar('picking', false);
    await setVar('bubble', '');
    const benchAfter = (puts) =>
      engineRun(ENG, { map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'PPPPPPPP', 'GGGGGGGG', 'GGGGGGGG'], things: [{ kind: 'site', id: 'bench', x: 4, y: 2, have: 0, need: 8, item: 'stone', build: 'bench' }, { kind: 'site', id: 's1', x: 2, y: 2, have: 4, need: 4, item: 'stone' }], robots: [{ id: 'pip', x: 4, y: 3, d: 0, carry: Array(8).fill('stone'), basket: 8, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' }] }, Array.from({ length: puts }, (_, i) => ({ id: i + 1, t: 'put' })));
    const BENCH3 = `(() => { const eng = ${ROOT}.gd3; const sites = eng.built.things.filter((g) => g.userData.kind === 'site'); const bench = sites.find((g) => g.userData.bench !== undefined); const names = []; if (bench) bench.traverse((o) => { if (o.name) names.push(o.name); }); const chip = [...document.querySelectorAll('.gd3-meter')].find((c) => c.getAttribute('data-kind') === 'site' && c.getAttribute('data-meter').endsWith('/8')); return { bench: bench ? bench.userData.bench : null, parts: names.sort().join(' '), path: sites.filter((g) => g.userData.bench === undefined).map((g) => g.userData.stage).join(','), chip: chip ? chip.getAttribute('data-meter') + (chip.classList.contains('gd3-full') ? ':full' : '') : null, meshes: eng.meshCount }; })()`;
    const benches3 = [];
    for (const puts of [0, 2, 4, 6, 8]) {
      const w = benchAfter(puts);
      await setJson('map', { rows: w.map });
      await setJson('things', w.things);
      await setJson('robots', w.robots);
      await setJson('focus', { x: 0, y: 0, w: 8, h: 6 });
      await setVar('camera', 'plot');
      await wait(900);
      benches3.push({ puts, ...(await evaluate(BENCH3)) });
      await shot(`iw003s-3d-bench-${puts}`);
    }
    readings.iw003s = { benches: benches3 };
    check('IW-003 lane S (3D): the engine’s bench, put by put — pegs (0/8) · a leg · two legs · the seat · the back with Sami sitting (8/8, green); the full path square beside it stays a path square',
      JSON.stringify(benches3.map((b) => [b.bench, b.parts, b.chip])) === JSON.stringify([[0, '', '0/8'], [1, 'leg', '2/8'], [2, 'leg leg', '4/8'], [3, 'leg leg seat', '6/8'], [4, 'back leg leg sami seat', '8/8:full']]) && benches3.every((b) => b.path === 'path'), benches3);
  }

  // ══ P108 IW-007 (lane A): her animals in 3D by their bowls, fed and hungry, from worlds the ENGINE wrote; the patch; a carrot ══
  {
    await page.setViewport({ width: 1024, height: 800 });
    await setVar('watch', '');
    await setVar('picking', false);
    await setVar('bubble', '');
    const petAfter = (animal, n) =>
      engineRun(ENG, { map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG'], things: [{ kind: 'bowl', id: 'a1', item: 'carrot', capacity: animal === 'rabbit' ? 3 : 4, count: 0, food: 0, animal, name: animal === 'rabbit' ? 'Flopsy' : 'Bramble', x: 3, y: 2 }, { kind: 'patch', id: 'patch', x: 1, y: 4, left: 3, max: 4 }], robots: [{ id: 'pip', x: 3, y: 3, d: 0, carry: Array(n).fill('carrot'), basket: 4, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' }] }, Array.from({ length: n }, (_, i) => ({ id: i + 1, t: 'put' })));
    const PET3 = `(() => { const eng = ${ROOT}.gd3; const g = eng.built.things.find((x) => x.userData.kind === 'bowl'); const p = eng.built.things.find((x) => x.userData.kind === 'patch'); const names = []; if (g) g.traverse((o) => { if (o.name) names.push(o.name); }); const pill = document.querySelector('.gd3-pet'); const chip = [...document.querySelectorAll('.gd3-meter')].find((c) => c.getAttribute('data-kind') === 'bowl');
      return { mood: g ? g.userData.mood : null, animal: g ? g.userData.animal : null, parts: names.filter((n) => n !== 'wool' && n !== 'ear').sort().join(' '), pill: pill ? [pill.innerText, pill.getAttribute('data-mood')] : null, chip: chip ? chip.getAttribute('data-meter') + (chip.classList.contains('gd3-full') ? ':full' : '') : null, carrotIcon: chip ? !!chip.querySelector('.gd3-mi-carrot') : false, patch: p ? p.userData.carrots : null }; })()`;
    const pets3 = [];
    for (const [animal, n] of [['rabbit', 0], ['rabbit', 3], ['sheep', 0], ['sheep', 4]]) {
      const w = petAfter(animal, n);
      await setJson('map', { rows: w.map });
      await setJson('things', w.things);
      await setJson('robots', w.robots);
      await setJson('focus', { x: 0, y: 0, w: 8, h: 6 });
      await setVar('camera', 'plot');
      await wait(900);
      pets3.push({ animal, n, ...(await evaluate(PET3)) });
      await shot(`iw7a-3d-${animal}-${n}`);
    }
    readings.iw7a = { pets: pets3 };
    check('IW-007 lane A (3D): by her bowl, from worlds the engine wrote — the rabbit at 0 sitting, waiting (0/3), at 3 standing happy with carrots in her bowl (3/3 green); the sheep at 0 lying, at 4 on his legs (4/4); her name a pill in the overlay with her mood; the chip in carrots; the patch’s three carrots',
      JSON.stringify(pets3.map((p) => [p.animal, p.mood, p.parts, p.pill, p.chip])) === JSON.stringify([
        ['rabbit', 'waiting', 'animal body bowl head tail', ['Flopsy', 'waiting'], '0/3'],
        ['rabbit', 'happy', 'animal body bowl carrots head tail', ['Flopsy', 'happy'], '3/3:full'],
        ['sheep', 'waiting', 'animal bowl head', ['Bramble', 'waiting'], '0/4'],
        ['sheep', 'happy', 'animal bowl carrots head legs legs', ['Bramble', 'happy'], '4/4:full']
      ]) && pets3.every((p) => p.carrotIcon && p.patch === 3), pets3);
    const picked = engineRun(ENG, { map: ['GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG'], things: [{ kind: 'patch', id: 'patch', x: 2, y: 4, left: 3, max: 4 }], robots: [{ id: 'pip', x: 1, y: 4, d: 1, carry: [], basket: 4, name: 'Cobble', colour: '#7A8CA3', accessory: 'hod' }] }, [{ id: 1, t: 'pick' }]);
    await setJson('things', picked.things);
    await setJson('robots', picked.robots);
    await wait(900);
    const carried = await evaluate(`(() => { const eng = ${ROOT}.gd3; const r = eng.built.robots[0]; const load = r && r.children.find((c) => c.name === 'load'); const p = eng.built.things.find((x) => x.userData.kind === 'patch'); return { load: load ? load.userData.load : null, patch: p ? p.userData.carrots : null }; })()`);
    readings.iw7a.carried = carried;
    await shot('iw7a-3d-patch-picked');
    check('IW-007 lane A (3D): the patch picked by the engine — two carrots left, the carrot on Cobble’s back', carried.load === 'carrot' && carried.patch === 2, carried);
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
