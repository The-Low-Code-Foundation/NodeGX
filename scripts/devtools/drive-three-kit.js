#!/usr/bin/env node
/**
 * THREE-IN-NODES (dev-docs/parked/THREE-IN-NODES.md) — drive the three-kit prototype in a headless Chrome with SOFTWARE
 * WebGL, on the DEPLOYED fixture. The claim under test: a NodeGX graph with a Scene node and Mesh children, a For Each
 * among them, draws a three.js scene the graph controls — one mesh per row, a wire moves a mesh, a tap comes back out of
 * a port.
 *
 * Usage:
 *   node scripts/devtools/drive-three-kit.js assemble <project-dir>
 *   node node_modules/.bin/nodegx deploy <project-dir> <deploy-dir> --allow-development-engine
 *   node scripts/devtools/drive-three-kit.js <deploy-dir> [--shots <dir>] [--json <file>]
 *
 * 🔴 Gate on the deploy's EXIT CODE: 0 wrote the site; 11 refused a development engine (the flag above).
 * 🔴 Chrome runs with `--use-angle=swiftshader`: frame counts are a software renderer's and say nothing about a GPU.
 *
 * Clauses (each beside its known-firing half):
 *   BOOT    the page drew (the marker Text), index.html loads three.min.js BEFORE three-kit/index.js, no console error
 *   SUPP    Supported came out of the port as true; the Scene root carries data-ready
 *   READY   Ready fired once (a Counter into a Variable)
 *   ROWS    Mesh Count out of the port is 9: the 8 boxes the For Each made from the Static Data plus the ball; the scene
 *           graph (read on the root, not the pixels) holds one box per row, each with the row's name, x and height
 *   PIXELS  the canvas region of a screenshot is not one colour (≥ 100 distinct colours; flat shading has few)
 *   SPIN    the ball spins: the renderer's frame count rises over 600 ms with nothing else changing
 *   WIRE    a Variable write (ballY = 4) moves the ball to y 4 in the scene graph — the graph owns the position
 *   TAP     a CDP mouse press and release on the tallest bar's projected centre fires Tapped and Tapped Name = "sat"
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { withDeployedSite } = require('./drive-deployed.js');

const REPO = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(REPO, 'dev-docs', 'parked', 'three-in-nodes', 'fixture');
const KIT = path.join(REPO, 'library', 'modules', 'three-kit', 'project', 'noodl_modules', 'three-kit');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

if (process.argv[2] === 'assemble') {
  const out = process.argv[3];
  if (!out) {
    console.error('usage: drive-three-kit.js assemble <project-dir>');
    process.exit(2);
  }
  if (!fs.existsSync(path.join(KIT, 'index.js'))) {
    console.error(`missing built kit: ${KIT}/index.js (node library/modules/three-kit/build.mjs)`);
    process.exit(1);
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(FIXTURE, out, { recursive: true });
  fs.cpSync(KIT, path.join(out, 'noodl_modules', 'three-kit'), { recursive: true });
  const three = path.join(out, 'noodl_modules', 'three-kit', 'three.min.js');
  console.log(JSON.stringify({ assembled: out, threeBytes: fs.existsSync(three) ? fs.statSync(three).size : null, kitBytes: fs.statSync(path.join(KIT, 'index.js')).size }));
  process.exit(fs.existsSync(three) ? 0 : 1);
}

const DIR = process.argv[2];
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
if (!DIR || !fs.existsSync(path.join(DIR, 'index.html'))) {
  console.error('usage: drive-three-kit.js <deploy-dir> [--shots <dir>] [--json <file>]  |  assemble <project-dir>');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A PNG decoder for what Page.captureScreenshot returns (8-bit RGB/RGBA, no interlace) — drive-ig007-3d.js's. */
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

const ROOT = "document.querySelector('[data-three-scene]')";
const CENSUS = `JSON.stringify((${ROOT}).__threeKit.census())`;

withDeployedSite({ dir: DIR, gpu: true, chromeArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }, async (page) => {
  const evaluate = (expr) => page.evaluate(expr);
  const vars = async (name) => evaluate(`JSON.stringify(Noodl.Variables.get(${JSON.stringify(name)}))`).then((v) => (v === undefined || v === 'undefined' ? undefined : JSON.parse(v)));
  const census = async () => JSON.parse(await evaluate(CENSUS));
  const shot = async (name) => {
    if (!SHOTS) return null;
    const file = path.join(SHOTS, `${name}.png`);
    await page.screenshot(file);
    return file;
  };
  await page.setViewport({ width: 1024, height: 640 });
  await wait(1500);

  // BOOT
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const iThree = html.indexOf('three.min.js');
  const iKit = html.indexOf('three-kit/index.js');
  const marker = await evaluate(`document.body.innerText.includes('three-in-nodes page drew')`);
  readings.scriptOrder = { three: iThree, kit: iKit };
  check('BOOT  the page drew, three.min.js before three-kit/index.js, no console error', marker && iThree > -1 && iKit > iThree && page.consoleErrors.length === 0, { marker, iThree, iKit, consoleErrors: page.consoleErrors, networkErrors: page.networkErrors });

  // SUPP + READY
  const supported = await vars('supported');
  const ready = await evaluate(`(${ROOT}) && (${ROOT}).getAttribute('data-ready')`);
  check('SUPP  Supported true out of the port; root data-ready', supported === true && ready === 'true', { supported, ready });
  const readyCount = await vars('ready');
  check('READY Ready fired once', readyCount === 1, { readyCount });

  // ROWS
  await wait(500);
  const meshes = await vars('meshes');
  const attr = await evaluate(`(${ROOT}).getAttribute('data-meshes')`);
  const c1 = await census();
  const bars = c1.objects.filter((o) => o.kind === 'mesh' && !o.parent && o.name !== 'ball').sort((a, b) => a.x - b.x);
  const expect = [['mon', 3], ['tue', 5], ['wed', 2], ['thu', 6], ['fri', 4], ['sat', 7], ['sun', 1], ['avg', 4]];
  const rowsOk = bars.length === 8 && expect.every(([n, v], i) => bars[i] && bars[i].name === n && Math.abs(bars[i].h - v) < 1e-6 && Math.abs(bars[i].y - v / 2) < 1e-6);
  readings.census = c1;
  // 12 = the eight boxes the For Each made, the ball, and the robot's three parts (a 3D Group is not a mesh).
  check('ROWS  Mesh Count 12 out of the port; one box per Static Data row with its name, x order and height', meshes === 12 && attr === '12' && rowsOk, { meshes, attr, bars: bars.map((b) => [b.name, b.x, b.h, b.y]) });

  // GROUP — the robot's parts sit in its 3D Group: their parent is the group, and a part at the group's middle stands
  // where the group stands in the world (x −6 from Animate To Value's first target, z 4 from the group's own Z).
  const robot = c1.objects.find((o) => o.kind === 'group' && o.name === 'robot');
  const parts = robot ? c1.objects.filter((o) => o.parent === robot.id) : [];
  const body = parts.find((o) => o.shape === 'box' && Math.abs(o.h - 1.6) < 1e-6);
  const groupOk = !!robot && parts.length === 3 && Math.abs(robot.x + 6) < 1e-6 && Math.abs(robot.z - 4) < 1e-6 && !!body && Math.abs(body.wx + 6) < 1e-6 && Math.abs(body.wz - 4) < 1e-6 && Math.abs(body.wy - 0.8) < 1e-6;
  check('GROUP the robot is a 3D Group of 3 meshes; its body stands where the group stands (world x −6, z 4, centre y 0.8)', groupOk, { robot, parts });

  // SIZE — the page sizes the Scene: Height 520 px from the graph, Width 100 % of a 1024 px page by default.
  const rect = JSON.parse(await evaluate(`JSON.stringify((${ROOT}).querySelector('canvas').getBoundingClientRect())`));
  check('SIZE  the canvas is the Scene\'s Height (520 px, set in the graph) by its default Width (100 % = 1024 px)', Math.round(rect.height) === 520 && Math.round(rect.width) === 1024, rect);

  // PIXELS
  const f1 = await shot('01-scene');
  let colours = null;
  if (f1) {
    colours = distinctColours(decodePng(fs.readFileSync(f1)), { x: rect.x, y: rect.y, w: rect.width, h: rect.height });
    readings.colours = colours;
    check('PIXELS the canvas region of the screenshot has ≥ 100 distinct colours (flat shading: 9 solids + a grid read 165 on 2026-10-19)', colours >= 100, { colours, rect });
  } else {
    check('PIXELS (skipped: no --shots)', true, null);
  }

  // SPIN
  const framesA = (await census()).frames;
  await wait(600);
  const framesB = (await census()).frames;
  readings.frames = { a: framesA, b: framesB };
  check('SPIN  the ball spins: frames rise over 600 ms', framesB > framesA, { framesA, framesB });

  // WIRE
  await evaluate(`Noodl.Variables.set('ballY', 4)`);
  await wait(400);
  const ball = (await census()).objects.find((o) => o.name === 'ball');
  check('WIRE  ballY = 4 through a Variable moves the ball to y 4', ball && Math.abs(ball.y - 4) < 1e-6, ball);

  // TAP
  const sat = bars.find((b) => b.name === 'sat');
  const at = sat ? JSON.parse(await evaluate(`JSON.stringify((${ROOT}).__threeKit.projectOf(${JSON.stringify(sat.id)}))`)) : null;
  if (at) {
    const mouse = (type, x, y) => page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
    await mouse('mouseMoved', at.x, at.y);
    await mouse('mousePressed', at.x, at.y);
    await mouse('mouseReleased', at.x, at.y);
    await wait(400);
  }
  const tappedName = await vars('tappedName');
  const taps = await vars('taps');
  readings.tap = { at, tappedName, taps };
  check('TAP   a press and release on the tallest bar fires Tapped once with Tapped Name "sat"', tappedName === 'sat' && taps === 1, { at, tappedName, taps });
  await shot('02-after-tap');

  // ANIM — the built-in Animate To Value is the tween: robotX −6 → 6 over 800 ms, read mid-way and after.
  const groupX = async () => (await census()).objects.find((o) => o.kind === 'group' && o.name === 'robot');
  await evaluate(`Noodl.Variables.set('robotX', 6)`);
  await wait(300);
  const mid = await groupX();
  await wait(1200);
  const end = await groupX();
  const endBody = (await census()).objects.find((o) => body && o.id === body.id);
  readings.anim = { mid: mid && mid.x, end: end && end.x, endBodyWx: endBody && endBody.wx };
  check('ANIM  Animate To Value glides the robot: mid-way strictly between −6 and 6, then at 6 with its body', !!mid && mid.x > -6 && mid.x < 6 && !!end && Math.abs(end.x - 6) < 1e-6 && !!endBody && Math.abs(endBody.wx - 6) < 1e-6, readings.anim);

  // GTAP — a tap on the robot's body (no Name of its own): the Scene says "robot" and the group's Tapped fires once.
  const bodyAt = body ? JSON.parse(await evaluate(`JSON.stringify((${ROOT}).__threeKit.projectOf(${JSON.stringify(body.id)}))`)) : null;
  if (bodyAt) {
    const mouse = (type, x, y) => page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
    await mouse('mouseMoved', bodyAt.x, bodyAt.y);
    await mouse('mousePressed', bodyAt.x, bodyAt.y);
    await mouse('mouseReleased', bodyAt.x, bodyAt.y);
    await wait(400);
  }
  const gName = await vars('tappedName');
  const gTaps = await vars('robotTaps');
  const allTaps = await vars('taps');
  readings.groupTap = { at: bodyAt, tappedName: gName, robotTaps: gTaps, taps: allTaps };
  check('GTAP  a tap on the robot\'s unnamed body: Tapped Name "robot", the group\'s Tapped once, the Scene\'s twice in all', gName === 'robot' && gTaps === 1 && allTaps === 2, readings.groupTap);
  await shot('03-robot-glided');

  readings.consoleErrors = page.consoleErrors;
  readings.networkErrors = page.networkErrors;
});

process.on('exit', () => {
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass} / ${results.length} clauses PASS`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results, readings }, null, 1));
  if (pass !== results.length) process.exitCode = 1;
});
