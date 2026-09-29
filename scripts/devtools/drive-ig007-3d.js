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
  const region = pillBefore && pillAfter ? { x: Math.min(pillBefore.x, pillAfter.x) - 40, y: Math.min(pillBefore.y, pillAfter.y) - 90, w: Math.abs(pillAfter.x - pillBefore.x) + pillBefore.w + 80, h: 130 } : canvasRect;
  const diff = differing(before, afterShot, region);
  const midDiff = differing(before, midShot, region);
  readings.glide = { pillBefore, pillAfter, mid, after, region, diff, midDiff, dataX: await evaluate(`document.querySelector('.gd3-name[data-robot="0"]').getAttribute('data-x')`) };
  check('GLIDE: a Robots write glides the robot two tiles — the name pill moved > 40 px, it reported gliding mid-way, and the shots differ in its region', pillBefore && pillAfter && pillAfter.x - pillBefore.x > 40 && Math.abs(pillAfter.y - pillBefore.y) < 6 && mid && mid.gliding === true && after && after.gliding === false && diff.fraction > 0.02 && midDiff.fraction > 0.005 && readings.glide.dataX === '2', readings.glide);

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
