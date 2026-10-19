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
 *   node scripts/devtools/drive-three-kit.js assemble <project-dir> --outside   (the ball moved out of the Scene)
 *   node scripts/devtools/drive-three-kit.js assemble <project-dir> --game      (fixture-game: Body, Camera, Keys)
 *   node scripts/devtools/drive-three-kit.js <deploy-dir> --game
 *   node scripts/devtools/drive-three-kit.js <deploy-dir> --outside              (one clause, OUTSIDE)
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
 *
 * --game (s5, `fixture-game/`: a Fixed floor, a ball that Moves, a Ghost ring, a Camera following the ball, Keys):
 *   GBOOT  the page drew, no console error; the census holds 3 Bodies (fixed, moves, ghost) and a Camera following "Ball"
 *   LAND   the ball dropped from y 2 comes to rest ON the floor (y = its radius 0.45, grounded); Now Y reached the
 *          graph; its Hit Name is "Floor"
 *   FOLLOW the camera stands where the Camera node says: Distance 8 in front of and Height 6 above the ball
 *   KEYS   a held ArrowRight (CDP key events) makes Keys X 1 and rolls the ball right; released, Keys X is 0 again
 *   RING   rolled into the Ghost ring at x 3: Hit fires once (rings 1, Hit Name "Ball"), the ring jumps to x −3
 *          through the graph (Counter → Expression → Jump To X), and the ball passed through it (a Ghost is solid to nothing)
 *   FELL   rolled off the edge: Fell fires once (falls 1) and its wire to Reset puts the ball back at x 0
 *   PAUSE  the engine's pause(true) (an editor's Edit mode) holds the ball at its start, y 2, and nothing falls;
 *          pause(false) and it lands again
 *
 * --outside (PARKED-THREE-S2-MESHOUTSIDE's repro: the ball moved from the Scene to the page's Layout Group):
 *   OUTSIDE exactly one console error, naming Mesh "ball" and the Scene it needs; Mesh Count 11 (the ball is not drawn).
 *           Its control is the main run's BOOT: the same page with the ball inside logs no error.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { withDeployedSite } = require('./drive-deployed.js');

const REPO = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(REPO, 'dev-docs', 'parked', 'three-in-nodes', process.argv.includes('--game') ? 'fixture-game' : 'fixture');
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
  if (process.argv.includes('--outside')) {
    const file = path.join(out, 'components', 'Pages', 'Home', 'nodes.json');
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    const byId = Object.fromEntries(doc.nodes.map((n) => [n.id, n]));
    byId.scene.children = byId.scene.children.filter((c) => c !== 'ball');
    byId.layout.children.push('ball');
    byId.ball.parent = 'layout';
    fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  }
  const three = path.join(out, 'noodl_modules', 'three-kit', 'three.min.js');
  console.log(JSON.stringify({ assembled: out, threeBytes: fs.existsSync(three) ? fs.statSync(three).size : null, kitBytes: fs.statSync(path.join(KIT, 'index.js')).size }));
  process.exit(fs.existsSync(three) ? 0 : 1);
}

const DIR = process.argv[2];
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
const OUTSIDE = process.argv.includes('--outside');
const GAME = process.argv.includes('--game');
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


  if (GAME) {
    await page.client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    const KEY = { ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40 };
    const key = (type, code) => page.client.send('Input.dispatchKeyEvent', { type, code, key: code, windowsVirtualKeyCode: KEY[code], nativeVirtualKeyCode: KEY[code] });
    const until = async (what, ms) => {
      const t0 = Date.now();
      let last;
      while (Date.now() - t0 < ms) {
        last = await what();
        if (last && last.ok) return last;
        await wait(100);
      }
      return last || { ok: false };
    };
    const bodies = (c) => c.objects.filter((o) => o.kind === 'body');
    const ballOf = (c) => c.objects.find((o) => o.kind === 'body' && o.name === 'Ball');
    const ringOf = (c) => c.objects.find((o) => o.kind === 'body' && o.name === 'Ring');

    // GBOOT
    const marker = await evaluate(`document.body.innerText.includes('three-kit game drew')`);
    const c0 = await census();
    const kinds = bodies(c0).map((b) => b.body).sort().join(',');
    const camNode = c0.objects.find((o) => o.kind === 'camera');
    check('GBOOT the page drew, no console error; 3 Bodies (fixed, ghost, moves) and a Camera following "Ball"', marker && page.consoleErrors.length === 0 && kinds === 'fixed,ghost,moves' && camNode && camNode.follow === 'Ball', { marker, kinds, camNode, consoleErrors: page.consoleErrors });

    // LAND — gate on the state, not the clock: software GL runs at a fraction of real time.
    const land = await until(async () => {
      const b = ballOf(await census());
      return { ok: !!b && b.grounded && Math.abs(b.y - 0.45) < 0.02 && Math.abs(b.vy) < 0.5, b };
    }, 8000);
    const yVar = await vars('ballY');
    const hitVar = await vars('ballHit');
    readings.land = { ball: land.b, ballY: yVar, ballHit: hitVar };
    check('LAND  the ball dropped from y 2 rests on the floor (y 0.45, its radius; grounded); Now Y reached the graph; Hit Name "Floor"', land.ok && typeof yVar === 'number' && Math.abs(yVar - 0.45) < 0.03 && hitVar === 'Floor', readings.land);

    // FOLLOW — Distance 8 in front (angle 0 is +z), Height 6 above the ball's middle, once the smoothing settles.
    const follow = await until(async () => {
      const c = await census();
      const b = ballOf(c);
      const cam = c.camera;
      return { ok: !!b && Math.abs(cam.x - b.x) < 0.05 && Math.abs(cam.y - (b.y + 6)) < 0.05 && Math.abs(cam.z - (b.z + 8)) < 0.05, cam, b: b && { x: b.x, y: b.y, z: b.z } };
    }, 6000);
    readings.follow = follow;
    check('FOLLOW the camera stands 8 in front of and 6 above the ball (the Camera node, Follow "Ball")', follow.ok, follow);
    await shot('g1-landed');

    // KEYS + RING — hold ArrowRight: Keys X is 1, the ball rolls right into the ring at x 3.
    const x0 = ballOf(await census()).x;
    await key('rawKeyDown', 'ArrowRight');
    await wait(200);
    const keysHeld = await vars('keysX');
    const ring = await until(async () => {
      const rings = await vars('rings');
      const r = ringOf(await census());
      return { ok: rings >= 1 && !!r && Math.abs(r.x + 3) < 1e-6, rings };
    }, 10000);
    const cRing = await census();
    const ringVar = await vars('ringHit');
    readings.keys = { x0, keysHeld, ballAfter: ballOf(cRing) };
    check('KEYS  ArrowRight held: Keys X is 1 and the ball rolls right', keysHeld === 1 && ballOf(cRing).x > x0 + 1, readings.keys);
    const ringBody = ringOf(cRing);
    readings.ring = { rings: ring.rings, ringHit: ringVar, ring: ringBody, ball: ballOf(cRing) };
    await shot('g2-ring');

    // FELL — keep holding: past x 6 the ball leaves the floor, falls, Fell → Reset puts it back at x 0.
    const fell = await until(async () => {
      const falls = await vars('falls');
      return { ok: falls >= 1, falls };
    }, 15000);
    await key('keyUp', 'ArrowRight');
    await wait(300);
    const keysUp = await vars('keysX');
    const rings2 = await vars('rings');
    check('RING  into the Ghost ring: Hit once (rings 1, Hit Name "Ball"); the graph moved the ring to x −3 (Jump To X); the ball went on through it to the edge', ring.ok && rings2 === 1 && ringVar === 'Ball' && ringBody && Math.abs(ringBody.x + 3) < 1e-6 && fell.ok, Object.assign(readings.ring, { ringsAfterFall: rings2 }));
    const cFell = await census();
    const bFell = ballOf(cFell);
    readings.fell = { falls: fell.falls, ball: bFell, keysUp };
    check('FELL  off the edge: Fell once (falls 1); its wire to Reset brings the ball back to x 0; Keys X 0 once released', fell.ok && fell.falls === 1 && Math.abs(bFell.x) < 1 && keysUp === 0, readings.fell);
    await shot('g3-reset');

    // PAUSE — what an editor's Edit mode does: every Body at its start, nothing falls; then it plays again.
    await evaluate(`(${ROOT}).__threeKit.pause(true)`);
    await wait(600);
    const p1 = ballOf(await census());
    await wait(600);
    const p2 = ballOf(await census());
    await evaluate(`(${ROOT}).__threeKit.pause(false)`);
    const relanded = await until(async () => {
      const b = ballOf(await census());
      return { ok: !!b && b.grounded && Math.abs(b.y - 0.45) < 0.02, b };
    }, 8000);
    readings.pause = { p1, p2, relanded: relanded.b };
    check('PAUSE pause(true) holds the ball at its start (y 2) and it does not fall; pause(false) and it lands again', Math.abs(p1.y - 2) < 1e-6 && Math.abs(p2.y - 2) < 1e-6 && Math.abs(p1.x) < 1e-6 && relanded.ok, readings.pause);

    readings.consoleErrors = page.consoleErrors;
    return;
  }

  if (OUTSIDE) {
    const meshes = await vars('meshes');
    const ball = (await census()).objects.find((o) => o.name === 'ball');
    const said = page.consoleErrors.filter((e) => /three-kit: Mesh "ball" is not inside a Scene/.test(e));
    readings.outside = { meshes, ball: ball || null, consoleErrors: page.consoleErrors };
    check('OUTSIDE the ball outside the Scene: exactly one console error, naming Mesh "ball"; Mesh Count 11; no ball in the scene', page.consoleErrors.length === 1 && said.length === 1 && meshes === 11 && !ball, readings.outside);
    await shot('outside');
    return;
  }

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
