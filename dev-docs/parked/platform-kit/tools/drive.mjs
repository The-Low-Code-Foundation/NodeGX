// Drives the game in headless Chrome over the DevTools protocol, for testing: runs a list of steps, prints the page's
// console and errors, and writes screenshots. The game must be served (node tools/serve.mjs).
//   node tools/drive.mjs <url> <steps.json> <out-dir>
// The window is the owner's device: 1600 × 1000 at pixel ratio 1 unless the steps file's first step says otherwise,
// { "viewport": [width, height, pixelRatio] } (the Surface Pro: [1368, 912, 2]).
// A step is { "wait": ms } | { "eval": "js" } | { "shot": "name.png" } | { "click": [x, y] }
//   | { "drag": [x1, y1, x2, y2] } | { "key": "KeyW", "ms": 500 } | { "type": "text" }
//   | { "keyDown": "ArrowRight", "vk": 39 } | { "keyUp": "ArrowRight" }   (a key HELD across steps, for a game)
//   | { "clickAt": "js giving {x, y}" } | { "hoverAt": "…" } | { "dragAt": "…", "by": [dx, dy] }
// An eval step with "expect" is a check: "r => r.meshes === 12" runs on its value (JSON-parsed when it parses) and
// prints PASS or FAIL with the label. A waitFor that times out is a FAIL too. Exit 1 when anything failed, 0 when
// every check passed (s5, 2026-10-19: before this the drive always exited 0 and "green" meant read by eye).
//   On Node 20, run it as `node --experimental-websocket tools/drive.mjs …` (WebSocket is built in from Node 22).
//   Headless Chrome draws on the CPU (SwiftShader): its frame rate is not any real device's. Never record it.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [url, stepsFile, outDir] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const [vw, vh, vdpr] = steps[0]?.viewport ?? [1600, 1000, 1];
fs.mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// A port nothing answers on: a Chrome that cannot bind its port starts anyway, and the drive would attach to whatever
// already holds it (2026-10-29: another session's Goose window on 9333 got /life/ loaded into it).
const answers = async (p) => fetch(`http://127.0.0.1:${p}/json/version`).then(() => true, () => false);
let port;
do port = 9444 + Math.floor(Math.random() * 500);
while (await answers(port));
const profile = path.join(outDir, `.chrome-profile-${port}`);
process.on('exit', () => chrome.kill());
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${vw},${vh}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
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
    // A page whose main thread is stuck answers nothing: say so instead of waiting forever.
    setTimeout(() => {
      if (!pending.has(i)) return;
      pending.delete(i);
      console.log(`[stuck] ${method} had no answer in 45 s: the page's main thread is busy`);
      resolve({ result: {}, error: 'no answer in 45 s' });
    }, 45000);
  });
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: vdpr, mobile: false });
await send('Page.navigate', { url });
await sleep(1500);

let checks = 0;
let failed = 0;
const verdict = (ok, label, saw) => {
  checks++;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        saw: ${String(saw).slice(0, 1500)}`}`);
};
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
    if (!ok) verdict(false, `waitFor ${step.label ?? step.waitFor}`, 'timed out');
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
    if (step.expect) {
      let got = v?.value;
      try {
        if (typeof got === 'string') got = JSON.parse(got);
      } catch {}
      let ok = false;
      try {
        ok = !!new Function(`return (${step.expect})`)()(got);
      } catch (e) {
        ok = false;
      }
      verdict(ok, step.label ?? step.eval.slice(0, 60), JSON.stringify(got));
    }
  }
  if (step.clickSel) {
    // Where a person would click: the element's centre, or the card's place on the map.
    const expr = `(() => { const els = [...document.querySelectorAll(${JSON.stringify(step.clickSel)})].filter(e => ${JSON.stringify(step.text ?? '')} === '' || e.textContent.trim().includes(${JSON.stringify(step.text ?? '')})); const el = els[${step.nth ?? 0}]; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    const p = r.result?.result?.value;
    if (!p) console.log('[click] not found:', step.clickSel, step.text ?? '');
    else {
      step.click = [p.x, p.y];
      console.log('[click]', step.clickSel, step.text ?? '', 'at', p.x, p.y);
    }
  }
  if (step.click) {
    const [x, y] = step.click;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await mouse('mousePressed', x, y);
    await mouse('mouseReleased', x, y);
  }
  if (step.hoverAt) {
    // The pointer resting over a point an expression names ({ x, y }), with no button down.
    const expr = step.hoverAt;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    const p = r.result?.result?.value;
    if (!p) console.log('[hover] not found:', step.hoverAt);
    else {
      for (const [dx, dy] of [[-3, -3], [0, 0]]) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + dx, y: p.y + dy });
      console.log('[hover] at', p.x, p.y);
    }
  }
  if (step.dragAt || step.clickAt) {
    // A point an expression names ({ x, y }): dragged by `by` [dx, dy] (Shift with `shift: true`), or clicked.
    const r = await send('Runtime.evaluate', { expression: step.dragAt ?? step.clickAt, returnByValue: true });
    const p = r.result?.result?.value;
    if (!p) console.log('[at] not found:', step.dragAt ?? step.clickAt);
    else if (step.clickAt) step.click = [p.x, p.y];
    else step.drag = [p.x, p.y, p.x + step.by[0], p.y + step.by[1]];
    console.log('[at]', JSON.stringify(step.drag ?? step.click ?? null));
    if (step.click) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y });
      await mouse('mousePressed', p.x, p.y);
      await mouse('mouseReleased', p.x, p.y);
      step.click = null;
    }
  }
  if (step.drag) {
    const mods = step.shift ? 8 : 0;
    const [x1, y1, x2, y2] = step.drag;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1 });
    await mouse('mousePressed', x1, y1, { modifiers: mods });
    for (let i = 1; i <= 10; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1 + ((x2 - x1) * i) / 10, y: y1 + ((y2 - y1) * i) / 10, button: 'left', buttons: 1, modifiers: mods });
      await sleep(step.stepMs ?? 30);
    }
    await mouse('mouseReleased', x2, y2, { modifiers: mods });
  }
  if (step.key) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: step.key, key: step.keyName ?? step.key, windowsVirtualKeyCode: step.vk ?? 0, modifiers: step.modifiers ?? 0 });
    await sleep(step.ms ?? 50);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: step.key, key: step.keyName ?? step.key, modifiers: step.modifiers ?? 0 });
  }
  if (step.keyDown) await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: step.keyDown, key: step.keyName ?? step.keyDown, windowsVirtualKeyCode: step.vk ?? 0 });
  if (step.keyUp) await send('Input.dispatchKeyEvent', { type: 'keyUp', code: step.keyUp, key: step.keyName ?? step.keyUp, windowsVirtualKeyCode: step.vk ?? 0 });
  if (step.type) await send('Input.insertText', { text: step.type });
  if (step.shot) {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, step.shot), Buffer.from(r.result.data, 'base64'));
    console.log('[shot]', path.join(outDir, step.shot));
  }
}
ws.close();
chrome.kill();
console.log(`\n${checks - failed} / ${checks} checks PASS`);
process.exit(failed ? 1 : 0);
