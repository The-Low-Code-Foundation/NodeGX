#!/usr/bin/env node
/**
 * Drive the Journal Page on a bare page, with REAL input: mouse, touch (two fingers) and keys through
 * CDP `Input.*`, a photo through the file input. Every check reads what the kit handed out
 * (`window.__nb`), which is what a graph would receive.
 *
 *   node library/modules/nightbook-kit/harness/drive-harness.js [--keep]
 *
 * Builds the kit and the harness first. Its own Chrome, its own port (9447) and profile, headless.
 */
'use strict';

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const http = require('http');
const WebSocket = require('ws');

const HERE = __dirname;
const KIT = path.join(HERE, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9447;
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-harness-'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}

/** A PNG of one colour, written without a library: a known size for the shrink check. */
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
  for (let x = 0; x < w; x++) row.set([76, 182, 232], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: h2 }, () => row));
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let s = '';
      res.on('data', (d) => (s += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(s));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  execFileSync(process.execPath, [path.join(KIT, 'build.mjs')], { stdio: 'inherit' });
  execFileSync(process.execPath, [path.join(HERE, 'build-harness.mjs'), path.join(work, 'site')], { stdio: 'inherit' });
  const photo = path.join(work, 'wide.png');
  writePng(photo, 3000, 2000);

  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(work, 'profile')}`, '--no-first-run', '--window-size=1000,900', 'about:blank'], { stdio: 'ignore' });
  let ws;
  try {
    let targets;
    for (let i = 0; i < 50; i++) {
      try {
        targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
        if (targets.some((t) => t.type === 'page')) break;
      } catch (e) {
        /* not up yet */
      }
      await wait(200);
    }
    const target = targets.find((t) => t.type === 'page');
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => ws.once('open', r));
    let seq = 0;
    const pending = {};
    const errors = [];
    ws.on('message', (m) => {
      const msg = JSON.parse(m);
      if (msg.id && pending[msg.id]) {
        pending[msg.id](msg);
        delete pending[msg.id];
      } else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq;
        pending[id] = (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result));
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`eval: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
      return r.result.value;
    };
    const nb = () => evaluate('JSON.parse(JSON.stringify(window.__nb))');
    const rectOf = (sel) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; })()`);
    const settle = () => wait(120);

    const mouse = async (type, x, y, buttons = 1) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1, pointerType: 'mouse' });
    const mouseDrag = async (from, to, steps = 10) => {
      await mouse('mousePressed', from.x, from.y);
      for (let i = 1; i <= steps; i++) await mouse('mouseMoved', from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
      await mouse('mouseReleased', to.x, to.y, 0);
      await settle();
    };
    const click = async (p) => {
      await mouse('mousePressed', p.x, p.y);
      await mouse('mouseReleased', p.x, p.y, 0);
      await settle();
    };
    const clickSel = async (sel) => click(await rectOf(sel));
    const typeText = async (text) => {
      for (const ch of text) {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
      }
      await settle();
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Page.navigate', { url: 'file://' + path.join(work, 'site', 'index.html') });
    await wait(800);

    const scale = await evaluate(`(() => { const s = document.querySelector('.nb-stage'); return s ? s.getBoundingClientRect().width / 1000 : 0; })()`);
    check('the page draws, fitted to its 800 px host', Math.abs(scale - 0.8) < 0.001, { scale });

    // 1. A sticker, from the toolbar.
    await clickSel('#b-addSticker');
    let s = await nb();
    const sticker = s.items[0];
    check('Add Sticker puts one ★ on the page and picks it', s.items.length === 1 && sticker.kind === 'sticker' && sticker.text === '★' && s.picked === sticker.id, { n: s.items.length, picked: s.picked });
    check('…and it is handed out once (Items, then Changed)', s.changes === 1, { changes: s.changes });

    // 2. Drag it with the mouse: +200, +100 screen px = +250, +125 page units.
    const c0 = await rectOf(`[data-nb-item="${sticker.id}"]`);
    const before = s.changes;
    await mouseDrag({ x: c0.x, y: c0.y }, { x: c0.x + 200, y: c0.y + 100 });
    s = await nb();
    const dragged = s.items.find((i) => i.id === sticker.id);
    check('a mouse drag moves it by the screen distance ÷ the scale', Math.abs(dragged.x - sticker.x - 250) < 1 && Math.abs(dragged.y - sticker.y - 125) < 1, { dx: dragged.x - sticker.x, dy: dragged.y - sticker.y });
    check('ONE write for the whole drag (ten moves)', s.changes - before === 1, { writes: s.changes - before });

    // 3. The corner handle: a sticker keeps its shape.
    const rh = await rectOf(`[data-nb-item="${sticker.id}"] [data-nb-handle="resize"]`);
    await mouseDrag({ x: rh.x, y: rh.y }, { x: rh.x + 60, y: rh.y + 60 });
    s = await nb();
    const grown = s.items.find((i) => i.id === sticker.id);
    check('the corner handle makes it bigger, keeping its shape', grown.w > dragged.w * 1.3 && Math.abs(grown.w - grown.h) < 0.5, { w: Math.round(grown.w), h: Math.round(grown.h) });

    // 4. The turn handle: sweep a quarter turn about the centre; it lands on 90.
    const box = await rectOf(`[data-nb-item="${sticker.id}"]`);
    const th = await rectOf(`[data-nb-item="${sticker.id}"] [data-nb-handle="turn"]`);
    const r = Math.hypot(th.x - box.x, th.y - box.y);
    const start = { x: th.x, y: th.y };
    await mouse('mousePressed', start.x, start.y);
    for (let i = 1; i <= 12; i++) {
      const a = -Math.PI / 2 + ((Math.PI / 2 + 0.03) * i) / 12; // from straight up, round to just past the right
      await mouse('mouseMoved', box.x + r * Math.cos(a), box.y + r * Math.sin(a));
    }
    await mouse('mouseReleased', box.x + r * Math.cos(0.03), box.y + r * Math.sin(0.03), 0);
    await settle();
    s = await nb();
    const turned = s.items.find((i) => i.id === sticker.id);
    check('the turn handle turns it, and 91.7° lands on 90', turned.rot === 90, { rot: turned.rot });

    // 5. Two fingers: spread from 60 px apart to 120 and turn by ~30°.
    const pc = await rectOf(`[data-nb-item="${sticker.id}"]`);
    const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i + 1, radiusX: 4, radiusY: 4, force: 1 })) });
    const beforePinch = s.changes;
    const fingers = (d, turn) => {
      const a = (turn * Math.PI) / 180;
      return [
        { x: pc.x - (d / 2) * Math.cos(a), y: pc.y - (d / 2) * Math.sin(a) },
        { x: pc.x + (d / 2) * Math.cos(a), y: pc.y + (d / 2) * Math.sin(a) }
      ];
    };
    await touch('touchStart', [fingers(60, 0)[0]]);
    await touch('touchStart', fingers(60, 0));
    for (let i = 1; i <= 10; i++) await touch('touchMove', fingers(60 + 6 * i, 3 * i));
    await touch('touchEnd', []);
    await settle();
    s = await nb();
    const pinchedIt = s.items.find((i) => i.id === sticker.id);
    check('two fingers make it twice as big', Math.abs(pinchedIt.w / turned.w - 2) < 0.1, { factor: +(pinchedIt.w / turned.w).toFixed(3) });
    check('…and turn it by the angle they swept (90 + 30)', Math.abs(pinchedIt.rot - 120) < 1.5, { rot: pinchedIt.rot });
    check('…in ONE write', s.changes - beforePinch === 1, { writes: s.changes - beforePinch });

    // 6. Words: Add Text starts typing at once; the keys are reported; a tap on the page ends it.
    await clickSel('#b-addText');
    const active = await evaluate(`document.activeElement && document.activeElement.getAttribute('data-nb-edit')`);
    s = await nb();
    const textId = s.picked;
    check('Add Text opens a box and the caret is in it', !!textId && active === textId, { active, picked: textId });
    await typeText('I did my best backstroke');
    s = await nb();
    check('Words counts as she types, before anything is kept', s.words === 5, { words: s.words });
    check('Key reports the keys, for the keyboard helper', s.keys.slice(-3).join('') === 'oke', { last: s.keys.slice(-3) });
    const stage = await rectOf('.nb-stage');
    await click({ x: stage.x - stage.w / 2 + 20, y: stage.y + stage.h / 2 - 20 });
    s = await nb();
    const typed = s.items.find((i) => i.id === textId);
    check('a tap on the page keeps the words', typed && typed.text === 'I did my best backstroke', { text: typed && typed.text });
    check('…and nothing is picked any more', s.picked === '', { picked: s.picked });

    // 7. Tap once picks; tap again types.
    await clickSel(`[data-nb-item="${textId}"]`);
    let editingNow = await evaluate(`!!document.querySelector('[data-nb-edit]')`);
    check('one tap on words picks them without typing', !editingNow && (await nb()).picked === textId);
    await clickSel(`[data-nb-item="${textId}"] .nb-text`);
    editingNow = await evaluate(`document.activeElement && document.activeElement.getAttribute('data-nb-edit')`);
    check('a second tap starts typing', editingNow === textId, { active: editingNow });
    await typeText('!!');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await settle();
    s = await nb();
    check('Escape keeps what she added', s.items.find((i) => i.id === textId).text === 'I did my best backstroke!!', { text: s.items.find((i) => i.id === textId).text });

    // 8. A choice applies to what is picked: rainbow on the words.
    await evaluate(`window.__nb.setChoice({ effect: 'rainbow', font: 'Chewy' })`);
    await settle();
    s = await nb();
    const styled = s.items.find((i) => i.id === textId);
    check('a new Effect and Font apply to the picked words', styled.style.effect === 'rainbow' && styled.style.font === 'Chewy', styled.style);
    const spans = await evaluate(`document.querySelectorAll('[data-nb-item="${textId}"] .nb-text span').length`);
    check('…drawn letter by letter', spans === 'I did my best backstroke!!'.length, { spans });
    const stickerStyle = s.items.find((i) => i.id === sticker.id).style;
    check('…and the sticker that was not picked keeps its own', stickerStyle.effect === 'none' && stickerStyle.font === '', stickerStyle);

    // 9. A photo, 3000 × 2000, through the file input.
    await clickSel('#b-addPhoto');
    const doc = await send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.nb-page input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId, files: [photo] });
    let photoItem;
    for (let i = 0; i < 40 && !photoItem; i++) {
      await wait(150);
      s = await nb();
      photoItem = s.items.find((x) => x.kind === 'photo');
    }
    check('a photo from the picker lands on the page', !!photoItem, { problem: s.photoProblem });
    if (photoItem) {
      const dims = await evaluate(`new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = window.__nb.items.find((x) => x.kind === 'photo').src; })`);
      check('…shrunk to a 1600 px long edge, as a JPEG', dims[0] === 1600 && dims[1] === 1067 && photoItem.src.startsWith('data:image/jpeg'), { dims });
      check('…in its own shape on the page (300 wide)', photoItem.w === 300 && photoItem.h === 200, { w: photoItem.w, h: photoItem.h });
      check('Photo Bytes says how big it is as kept', s.photoBytes > 0 && s.photoBytes < 400000, { bytes: s.photoBytes });
    }

    // 10. The ✕ takes it off; a slide off the ✕ does not.
    const n0 = s.items.length;
    const x = await rectOf(`[data-nb-item="${photoItem.id}"] [data-nb-handle="remove"]`);
    await mouseDrag({ x: x.x, y: x.y }, { x: x.x + 80, y: x.y + 80 }, 4);
    check('sliding off the ✕ takes nothing away', (await nb()).items.length === n0);
    await click({ x: x.x, y: x.y });
    s = await nb();
    check('a tap on the ✕ takes it off the page', s.items.length === n0 - 1 && !s.items.some((i) => i.id === photoItem.id), { n: s.items.length });

    // 11. A closed page: nothing moves, nothing is handed out.
    await evaluate(`window.__nb.setEditable(false)`);
    await settle();
    const handles = await evaluate(`document.querySelectorAll('[data-nb-handle]').length`);
    const closedBefore = s.changes;
    const sc = await rectOf(`[data-nb-item="${sticker.id}"]`);
    await mouseDrag({ x: sc.x, y: sc.y }, { x: sc.x - 150, y: sc.y }, 6);
    s = await nb();
    check('a closed page draws no handles', handles === 0, { handles });
    check('…and a drag on it changes nothing', s.changes === closedBefore && s.items.find((i) => i.id === sticker.id).x === pinchedIt.x, { writes: s.changes - closedBefore });

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(work, 'harness.png'), Buffer.from(shot.data, 'base64'));
    check('no page errors', errors.length === 0, errors.slice(0, 5));
    console.log(`screenshot: ${path.join(work, 'harness.png')}`);
  } finally {
    if (ws) ws.close();
    chrome.kill('SIGTERM');
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  fs.writeFileSync(path.join(work, 'report.json'), JSON.stringify(results, null, 2));
  if (!process.argv.includes('--keep')) fs.rmSync(path.join(work, 'profile'), { recursive: true, force: true });
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
