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
 *   AC3  a drag with pointerType touch, pen and mouse reorders and publishes Program; a drag ending outside puts it back
 *   AC5  Band 1 → 2 restyles the same element (no remount)
 *   AC6  8×6 and 12×8 at 1368×912 and 390×844: no horizontal scroll, the face ≥ 20px
 *   AC7  step, turn, bump, water, puddle — each read off the DOM and screenshotted, EN and FR
 *   AC8  two robots on two tiles and on one tile: two labelled sprites whose boxes do not intersect
 *   AC9  12×8 with two robots under CPU throttling ×4: ms from a Robots write to the next paint, p50 / p95 / max — a READOUT
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
      const r = await evaluate(`({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, face: (() => { const f = document.querySelector('[data-face]'); return f ? Math.round(f.getBoundingClientRect().width * 10) / 10 : null; })(), world: (() => { const w = document.querySelector('[data-gd-world]'); const r = w.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), cells: w.querySelectorAll('.gd-cell').length }; })() })`);
      const key = `${label}@${vp.width}x${vp.height}`;
      readings.ac6[key] = r;
      check(`AC6: ${key} — no horizontal scroll and the robot's face ≥ 20px`, r.scrollW <= r.innerW && r.face !== null && r.face >= 20 && r.world.cells === (label === '8x6' ? 48 : 96), r);
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
    await setJson('bubble', { robot: 0, text: WORDS[lang].bump, ms: 1500 });
    await setJson('robots', [{ ...PIP, x: 1, d: 2, bump: 1 }]);
    const bumped = await until(`({ bump: (document.querySelector('.gd-turn') || {}).getAttribute && document.querySelector('.gd-turn').getAttribute('data-bump'), cls: !!document.querySelector('.gd-turn.gd-bump'), bubble: (document.querySelector('.gd-bubble') || {}).textContent || '' })`, (v) => v.bump === '1', 2000);
    const stillThere = await rect('.gd-bot[data-robot="0"]');
    const bump = bumped.bump === '1' && stillThere && Math.abs(stillThere.x - botAfter.x) < 2 && bumped.bubble.includes(WORDS[lang].bump);
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
    readings.ac7[lang] = { botBefore, botAfter, rotBefore, rotAfter, bumped, watered, puddled, word };
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
