#!/usr/bin/env node
/**
 * The page-designer spike, driven inside the Nightbook shell (TPL-011 §3.6, DESKTOP §2): decorate
 * tonight's page with real input, quit, open again, and the page is exactly as she left it.
 *
 *   node dev-docs/tasks/phase-78-the-templates/nightbook-desktop/drive-page-designer.js [--exe <path>]
 *
 * build-app.js must have run with `--project …/nightbook-desktop/spike-app`.
 *
 *   launch 1 (home A)   fonts load from the app, with no request leaving 127.0.0.1
 *                       ★ from the toolbar → dragged with the mouse → pinched and turned with two fingers
 *                       Words → typed → Chewy + Rainbow on them; Pink dots behind the page
 *                       a 3000 × 2000 photo through the picker, shrunk
 *                       "Saved on this tablet"; ONE JournalPage record, holding every item
 *   launch 2 (home A)   the page comes back: every item where it was, the words, the font, the photo
 *   launch 3 (home B)   CONTROL: a fresh home draws an empty page — so launch 2 read home A's disk
 *   launch 4 (home U)   THE UPGRADE: a home 0.0.1 left behind (the todo list's rules in security.json)
 *                       — a sticker is saved, and the old rules are kept beside the new ones
 *
 * Every launch gets its own NIGHTBOOK_HOME; nothing touches the real app data.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const lib = require('./drive-lib');
const { config, CDP_PORT, ORIGIN, wait, until, portListening, quit, backendsFor } = lib;

const argv = process.argv.slice(2);
const exeIdx = argv.indexOf('--exe');
const EXE = exeIdx >= 0 ? path.resolve(argv[exeIdx + 1]) : null;
const launch = (home) => lib.launch(home, EXE);

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''}`);
}

function writePng(file, w, h2) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h2, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) row.set(x < w / 2 ? [224, 69, 123] : [76, 182, 232], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h2 }, () => row));
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

// ── Reading and pressing ───────────────────────────────────────────────────

/** What the page draws, per item: enough to say "exactly as she left it". */
const SNAPSHOT = `(function () {
  var stage = document.querySelector('.nb-stage');
  return {
    background: stage ? stage.style.background : null,
    items: Array.prototype.map.call(document.querySelectorAll('[data-nb-item]'), function (el) {
      var t = el.querySelector('.nb-text');
      var img = el.querySelector('img');
      return {
        kind: el.getAttribute('data-kind'),
        left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height,
        transform: el.style.transform || '', z: el.style.zIndex,
        text: t ? t.innerText : (el.getAttribute('data-kind') === 'sticker' ? el.innerText : ''),
        font: t ? t.style.fontFamily : '',
        letters: t ? t.querySelectorAll('span').length : 0,
        photo: img ? img.src.slice(0, 23) + '…' + img.src.length : ''
      };
    })
  };
})()`;

async function centreOf(page, selector) {
  const r = await page.evaluate(`(function () {
    var e = document.querySelector(${JSON.stringify(selector)});
    if (!e) return null;
    e.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!r) throw new Error(`nothing matches ${selector}`);
  return r;
}

async function buttonAt(page, label) {
  const r = await page.evaluate(`(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) { return (x.innerText || '').trim() === ${JSON.stringify(label)}; })[0];
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!r) throw new Error(`no button "${label}"`);
  return r;
}

const mouse = (page, type, x, y, buttons = 1) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });

async function click(page, p) {
  await mouse(page, 'mousePressed', p.x, p.y);
  await mouse(page, 'mouseReleased', p.x, p.y, 0);
  await wait(300);
}

async function press(page, label) {
  await click(page, await buttonAt(page, label));
}

async function drag(page, from, to, steps = 12) {
  await mouse(page, 'mousePressed', from.x, from.y);
  for (let i = 1; i <= steps; i++) await mouse(page, 'mouseMoved', from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
  await mouse(page, 'mouseReleased', to.x, to.y, 0);
  await wait(300);
}

async function type(page, text) {
  for (const ch of text) {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  }
  await wait(200);
}

const records = (page) =>
  page.evaluate(`fetch('/classes/JournalPage').then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })`);

const statusText = (page) => page.evaluate(`document.body ? document.body.innerText : ''`);

// ── The drive ───────────────────────────────────────────────────────────────

async function main() {
  for (const p of [CDP_PORT, config.port]) {
    if (await portListening(p)) throw new Error(`port ${p} is already taken; nothing was launched`);
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'nightbook-designer-'));
  const homeA = path.join(scratch, 'A');
  const homeB = path.join(scratch, 'B');
  const photo = path.join(scratch, 'gala.png');
  writePng(photo, 3000, 2000);
  const R = { home: scratch, checks };

  // ── launch 1 ──
  console.log('· launch 1 (home A)');
  let app = await launch(homeA);
  let page = app.page;
  const requests = [];
  await page.send('Network.enable');
  // Requests are read from the browser's own log below, not assumed.
  await until('the page drawn', () => page.evaluate(`!!document.querySelector('.nb-stage')`), (v) => v === true, 60_000);
  R.shownAtMs = Date.now() - app.t0;
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const fonts = await page.evaluate(`Promise.all(${JSON.stringify(['Chewy', 'Caveat', 'Bungee', 'Pacifico', 'Cherry Bomb One', 'Rubik Doodle Shadow'])}.map(function (f) {
    return document.fonts.load('24px "' + f + '"', 'Aé œ').then(function (list) { return [f, list.length > 0 && document.fonts.check('24px "' + f + '"', 'Aé œ')]; });
  }))`);
  check('the six display fonts load from the app itself', fonts.every(([, ok]) => ok), fonts);

  const empty = await page.evaluate(SNAPSHOT);
  check('a first evening starts on an empty page', empty.items.length === 0, { items: empty.items.length });

  // ★, then drag it.
  await press(page, '★');
  await until('the star', () => page.evaluate(`document.querySelectorAll('[data-nb-item]').length`), (n) => n === 1);
  const star = await centreOf(page, '[data-kind="sticker"]');
  await drag(page, star, { x: star.x - 220, y: star.y - 90 });
  // Two fingers on it: twice as far apart, a quarter-ish turn.
  const s2 = await centreOf(page, '[data-kind="sticker"]');
  const touch = (t, pts) => page.send('Input.dispatchTouchEvent', { type: t, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1, radiusX: 4, radiusY: 4, force: 1 })) });
  const fingers = (d, turn) => {
    const a = (turn * Math.PI) / 180;
    return [
      { x: s2.x - (d / 2) * Math.cos(a), y: s2.y - (d / 2) * Math.sin(a) },
      { x: s2.x + (d / 2) * Math.cos(a), y: s2.y + (d / 2) * Math.sin(a) }
    ];
  };
  await touch('touchStart', [fingers(40, 0)[0]]);
  await touch('touchStart', fingers(40, 0));
  for (let i = 1; i <= 10; i++) await touch('touchMove', fingers(40 + 4 * i, 2 * i));
  await touch('touchEnd', []);
  await wait(400);
  const afterPinch = (await page.evaluate(SNAPSHOT)).items[0];
  check('the star was dragged, pinched bigger and turned', afterPinch && /rotate\(20deg\)/.test(afterPinch.transform) && parseFloat(afterPinch.width) > 200, afterPinch);

  // Words, typed in place, then Chewy and Rainbow on them.
  await press(page, 'Words');
  await until('the caret in the new box', () => page.evaluate(`!!(document.activeElement && document.activeElement.getAttribute('data-nb-edit'))`), (v) => v === true);
  await type(page, 'Swim gala! We came 2nd.');
  const words = await statusText(page);
  check('Words counts what she types, live', words.includes('5 words tonight'), words.match(/\d+ words? tonight/));
  // Leave the box by tapping the page, then pick the words and choose.
  const paper = await page.evaluate(`(function () { var r = document.querySelector('.nb-stage').getBoundingClientRect(); return { x: r.left + 20, y: r.bottom - 20 }; })()`);
  await click(page, paper);
  await click(page, await centreOf(page, '[data-kind="text"]'));
  await press(page, 'Chewy');
  await press(page, 'Rainbow');
  await press(page, 'Pink dots');
  const styled = (await page.evaluate(SNAPSHOT)).items.find((i) => i.kind === 'text');
  check('the words wear Chewy and Rainbow', styled && /Chewy/.test(styled.font) && styled.letters === 'Swim gala! We came 2nd.'.length, styled);

  // A photo through the picker.
  await press(page, 'Photo');
  const doc = await page.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.nb-page input[type=file]' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [photo] });
  await until('the photo', () => page.evaluate(`!!document.querySelector('[data-kind="photo"] img')`), (v) => v === true);
  const dims = await page.evaluate(`new Promise(function (res) { var i = new Image(); i.onload = function () { res([i.naturalWidth, i.naturalHeight]); }; i.src = document.querySelector('[data-kind="photo"] img').src; })`);
  check('the photo is shrunk to 1200 px before it is kept', dims[0] === 1200 && dims[1] === 800, dims);

  await until('saved', () => statusText(page), (s) => s.includes('Saved on this tablet'), 15_000);
  // Put everything down, so the snapshot is the page and not its handles.
  await click(page, paper);
  await wait(1500);
  const before = await page.evaluate(SNAPSHOT);
  const rec = await records(page);
  const rows = (rec.body && rec.body.results) || [];
  check('ONE JournalPage record for tonight', rec.status === 200 && rows.length === 1, { status: rec.status, rows: rows.length, error: rec.body && rec.body.error });
  const kept = rows[0] && rows[0].items;
  check('…holding every item on the page', Array.isArray(kept) && kept.length === before.items.length && kept.length === 3, { kept: Array.isArray(kept) ? kept.map((i) => i.kind) : kept });
  check('…and the background she chose', rows[0] && /FFC2DA/i.test(String(rows[0].background || '')), { background: rows[0] && rows[0].background });
  R.recordBytes = rows[0] ? JSON.stringify(rows[0]).length : 0;
  // The tablet's window: 2736 × 1824 at 200 % is 1368 × 912. The whole page must be in view.
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1368, height: 912, deviceScaleFactor: 2, mobile: false });
  await page.evaluate('window.scrollTo(0, 0)');
  await wait(600);
  const fit = await page.evaluate(`(function () { var r = document.querySelector('.nb-page').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), viewport: innerHeight }; })()`);
  check('on the tablet\'s 1368 × 912 window the whole page is in view', fit.bottom <= fit.viewport && fit.width >= 900, fit);
  const shotT = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(scratch, 'tablet-size.png'), Buffer.from(shotT.data, 'base64'));
  await page.send('Emulation.clearDeviceMetricsOverride');
  await wait(400);
  const shot1 = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(scratch, 'launch1.png'), Buffer.from(shot1.data, 'base64'));
  const log = await page.evaluate(`performance.getEntriesByType('resource').map(function (e) { return e.name; })`);
  const away = log.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('no request left 127.0.0.1', away.length === 0, away.slice(0, 5));
  requests.push(...log);
  R.launch1Quit = await quit(app);
  await wait(1500);

  // ── launch 2 ──
  console.log('· launch 2 (home A)');
  app = await launch(homeA);
  page = app.page;
  await until('the page drawn', () => page.evaluate(`document.querySelectorAll('[data-nb-item]').length`), (n) => n === before.items.length, 60_000);
  await wait(800);
  const after = await page.evaluate(SNAPSHOT);
  const same = JSON.stringify(after) === JSON.stringify(before);
  check('after a restart the page is EXACTLY as she left it', same, same ? { items: after.items.length } : { before, after });
  const shot2 = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(scratch, 'launch2.png'), Buffer.from(shot2.data, 'base64'));
  R.launch2Quit = await quit(app);
  await wait(1500);

  // ── launch 3: control ──
  console.log('· launch 3 (home B, control)');
  app = await launch(homeB);
  page = app.page;
  await until('the page drawn', () => page.evaluate(`!!document.querySelector('.nb-stage')`), (v) => v === true, 60_000);
  await wait(2500);
  const fresh = await page.evaluate(SNAPSHOT);
  check('CONTROL: a fresh home draws an empty page', fresh.items.length === 0, { items: fresh.items.length });
  R.launch3Quit = await quit(app);
  await wait(1500);

  // ── launch 4: the upgrade, as the tablet has it ──
  console.log('· launch 4 (home U: what 0.0.1 left behind)');
  const homeU = path.join(scratch, 'U');
  const bookU = path.join(homeU, 'userData', 'book');
  fs.mkdirSync(bookU, { recursive: true });
  const todoPolicy = path.join(__dirname, '..', '..', '..', '..', 'templates', 'todo-list', 'nodegx.security.json');
  fs.copyFileSync(todoPolicy, path.join(bookU, 'security.json'));
  app = await launch(homeU);
  page = app.page;
  await until('the page drawn', () => page.evaluate(`!!document.querySelector('.nb-stage')`), (v) => v === true, 60_000);
  await press(page, '♥');
  const upgraded = await until('saved or not', () => statusText(page), (t) => t.includes('Saved on this tablet') || t.includes('Not saved'), 15_000);
  check('UPGRADE: over 0.0.1\'s rules, tonight\'s page is still saved', upgraded.includes('Saved on this tablet'), upgraded.match(/Saved on this tablet|Not saved[^\n]*/));
  const keptOld = fs.readdirSync(bookU).filter((f) => /^security\.before-.*\.json$/.test(f));
  check('…and the old rules are kept beside the new ones, not deleted', keptOld.length === 1 && JSON.parse(fs.readFileSync(path.join(bookU, keptOld[0]), 'utf8')).collections.Task, keptOld);
  R.launch4Quit = await quit(app);
  await wait(1500);

  const left = backendsFor(homeA).concat(backendsFor(homeB), backendsFor(homeU));
  check('no backend outlives the app', left.length === 0, left);

  R.verdict = checks.every((c) => c.ok) ? 'PASS' : 'FAIL';
  const out = JSON.stringify(R, null, 2);
  if (process.env.NIGHTBOOK_DRIVE_REPORT) fs.writeFileSync(process.env.NIGHTBOOK_DRIVE_REPORT, out);
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} — ${R.verdict}; screenshots in ${scratch}`);
  process.exit(R.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  console.error(`drive-page-designer: ${e.stack || e.message}`);
  process.exit(1);
});
