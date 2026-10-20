// Drives the map page in headless Chrome over the DevTools protocol, for testing: runs a list of
// steps, prints the page's console and errors, and writes screenshots.
//   node tools/drive.mjs <url> <steps.json> <out-dir>
// A step is { "wait": ms } | { "eval": "js" } | { "shot": "name.png" } | { "click": [x, y] }
//   | { "drag": [x1, y1, x2, y2] } | { "key": "KeyW", "ms": 500 } | { "type": "text" }
//   On Node 20, run it as `node --experimental-websocket tools/drive.mjs …` (WebSocket is built in from Node 22).
//   The page's preview takes 15–30 s to boot in headless Chrome: wait for it before testing it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [url, stepsFile, outDir] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9333 + Math.floor(Math.random() * 500);
const profile = path.join(outDir, `.chrome-profile-${port}`);
process.on('exit', () => chrome.kill());
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1600,1000', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    if (targets.some((t) => t.type === 'page')) break;
  } catch {}
  await sleep(200);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    console.log(`[console.${msg.params.type}]`, msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 600));
  } else if (msg.method === 'Runtime.exceptionThrown') {
    console.log('[exception]', (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text).slice(0, 800));
  } else if (msg.method === 'Log.entryAdded') {
    console.log(`[log.${msg.params.entry.level}]`, msg.params.entry.text.slice(0, 400), msg.params.entry.url ?? '');
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(1500);

const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
for (const step of steps) {
  if (step.wait) await sleep(step.wait);
  if (step.waitFor) {
    // Polls an expression until it is truthy (or the timeout, default 60 s, passes).
    const until = Date.now() + (step.timeout ?? 60000);
    let ok = false;
    while (!ok && Date.now() < until) {
      const r = await send('Runtime.evaluate', { expression: `!!(${step.waitFor})`, returnByValue: true });
      ok = r.result?.result?.value === true;
      if (!ok) await sleep(250);
    }
    console.log('[waitFor]', step.waitFor, ok ? 'ok' : 'TIMED OUT');
  }
  if (step.node) {
    // Another process acting on the files mid-session (a node script with its arguments).
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, step.node, { encoding: 'utf8' });
    console.log('[node]', step.node.join(' '), '→', (r.stdout + r.stderr).trim().slice(0, 300));
  }
  if (step.eval) {
    const r = await send('Runtime.evaluate', { expression: step.eval, awaitPromise: true, returnByValue: true });
    const v = r.result?.result;
    console.log('[eval]', step.label ?? step.eval.slice(0, 60), '→', String(JSON.stringify(v?.value ?? v?.description ?? r.result?.exceptionDetails?.exception?.description ?? r.error)).slice(0, 3000));
  }
  if (step.clickSel || step.clickCard) {
    // Where a person would click: the element's centre, or the card's place on the map.
    const expr = step.clickSel
      ? `(() => { const els = [...document.querySelectorAll(${JSON.stringify(step.clickSel)})].filter(e => ${JSON.stringify(step.text ?? '')} === '' || e.textContent.trim().includes(${JSON.stringify(step.text ?? '')})); const el = els[${step.nth ?? 0}]; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
      : `__map.map.screenOf(${JSON.stringify(step.clickCard[0])}, ${JSON.stringify(step.clickCard[1])})`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    const p = r.result?.result?.value;
    if (!p) console.log('[click] not found:', step.clickSel ?? step.clickCard, step.text ?? '');
    else {
      step.click = [p.x, p.y];
      console.log('[click]', step.clickSel ?? step.clickCard.join(' '), step.text ?? '', 'at', p.x, p.y);
    }
  }
  if (step.click) {
    const [x, y] = step.click;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await mouse('mousePressed', x, y);
    await mouse('mouseReleased', x, y);
  }
  if (step.hoverCard || step.hoverAt) {
    // The pointer resting over a card, or over a point an expression names ({ x, y }), with no button down.
    const expr = step.hoverCard ? `__map.map.screenOf(${JSON.stringify(step.hoverCard[0])}, ${JSON.stringify(step.hoverCard[1])})` : step.hoverAt;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    const p = r.result?.result?.value;
    if (!p) console.log('[hover] not found:', step.hoverCard ?? step.hoverAt);
    else {
      for (const [dx, dy] of [[-3, -3], [0, 0]]) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + dx, y: p.y + dy });
      console.log('[hover]', step.hoverCard ? step.hoverCard.join(' ') : 'point', 'at', p.x, p.y);
    }
  }
  if (step.dragCard) {
    const [key, cid, dx, dy] = step.dragCard;
    const r = await send('Runtime.evaluate', { expression: `__map.map.screenOf(${JSON.stringify(key)}, ${JSON.stringify(cid)})`, returnByValue: true });
    const p = r.result?.result?.value;
    if (p) step.drag = [p.x, p.y, p.x + dx, p.y + dy];
    console.log('[drag]', key, cid, JSON.stringify(step.drag));
  }
  if (step.drag) {
    const [x1, y1, x2, y2] = step.drag;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
    await mouse('mousePressed', x1, y1);
    for (let i = 1; i <= 10; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + ((x2 - x1) * i) / 10, y: y1 + ((y2 - y1) * i) / 10, button: 'left', buttons: 1 });
    await mouse('mouseReleased', x2, y2);
  }
  if (step.key) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: step.key, key: step.keyName ?? step.key, windowsVirtualKeyCode: step.vk ?? 0, modifiers: step.modifiers ?? 0 });
    await sleep(step.ms ?? 50);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: step.key, key: step.keyName ?? step.key, modifiers: step.modifiers ?? 0 });
  }
  if (step.type) await send('Input.insertText', { text: step.type });
  if (step.shot) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, step.shot), Buffer.from(r.result.data, 'base64'));
    console.log('[shot]', path.join(outDir, step.shot));
  }
}
ws.close();
chrome.kill();
process.exit(0);
