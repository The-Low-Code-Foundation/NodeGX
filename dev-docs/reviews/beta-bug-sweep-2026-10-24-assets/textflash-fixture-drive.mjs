// TEXTFLASH drive: one preview per viewer build, headless Chrome over raw CDP, a MutationObserver from document start.
// node drive.mjs <label> <preview-dist-dir> <project-dir> <runs>
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [label, dist, project, runsArg] = process.argv.slice(2);
const runs = Number(runsArg || 3);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const preview = spawn(process.execPath, [join(dist, 'noodl-preview.cjs'), project, '--port', '0'], {
  env: { ...process.env, NODE_PATH: '/Users/richardosborne/vscode_projects/OpenNoodl/node_modules' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let out = '';
preview.stdout.on('data', (d) => (out += d));
preview.stderr.on('data', (d) => (out += d));
let url;
for (let i = 0; i < 100 && !url; i++) {
  await wait(100);
  url = (out.match(/http:\/\/(?:127\.0\.0\.1|localhost):\d+\/?/) || [])[0];
}
if (!url) {
  console.log('NO URL', out);
  preview.kill();
  process.exit(2);
}

const profile = mkdtempSync(join(tmpdir(), 'flash-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--window-size=800,900', 'about:blank'], { stdio: 'ignore' });
let wsUrl;
for (let i = 0; i < 100 && !wsUrl; i++) {
  await wait(100);
  const f = join(profile, 'DevToolsActivePort');
  if (existsSync(f)) {
    const [port, path] = readFileSync(f, 'utf8').trim().split('\n');
    if (port && path) wsUrl = `ws://127.0.0.1:${port}${path}`;
  }
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((r) => {
    const mid = ++id;
    pending.set(mid, r);
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });

const INSTRUMENT = `(() => {
  const log = { inserts: [], frames: [] };
  window.__flash = log;
  new MutationObserver((recs) => {
    const t = performance.now();
    for (const r of recs) {
      if (r.type === 'characterData') log.inserts.push({ t, chr: r.target.data });
      for (const n of r.addedNodes) log.inserts.push({ t, text: n.textContent });
    }
    requestAnimationFrame(() => log.frames.push({ t: performance.now(), text: document.body ? document.body.innerText : '' }));
  }).observe(document, { childList: true, subtree: true, characterData: true });
})();`;

const results = [];
for (let run = 0; run < runs; run++) {
  const { result } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: att } = await send('Target.attachToTarget', { targetId: result.targetId, flatten: true });
  const s = att.sessionId;
  await send('Page.enable', {}, s);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT }, s);
  await send('Page.navigate', { url }, s);
  await wait(3000);
  // Rows arriving on a page already on screen (STU-032's shape: a query answering after the page opened).
  await send('Runtime.evaluate', { expression: `window.__flash.inserts.length = 0; window.__flash.frames.length = 0;
    Noodl.Arrays.flash = [0,1,2,3,4].map((i) => ({ id: 'task-' + Date.now() + '-' + i, text: 'task ' + i }));`, returnByValue: true }, s);
  await wait(1500);
  const { result: ev } = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__flash)', returnByValue: true }, s);
  const log = JSON.parse(ev.result.value);
  const placeholderLines = (text) => text.split('\n').filter((l) => l.trim() === '?').length;
  const frameHits = log.frames.filter((f) => placeholderLines(f.text) > 0);
  const insertHits = log.inserts.filter((i) => typeof i.text === 'string' && /\?/.test(i.text));
  const last = log.frames[log.frames.length - 1];
  results.push({
    run,
    frames: log.frames.length,
    framesShowingPlaceholder: frameHits.length,
    maxPlaceholderRowsInAFrame: Math.max(0, ...frameHits.map((f) => placeholderLines(f.text))),
    insertsHoldingPlaceholder: insertHits.length,
    firstHit: frameHits[0] ? frameHits[0].text.slice(0, 200) : null,
    finalText: last ? last.text.slice(0, 300) : null,
    inserts: log.inserts.slice(0, 12),
    frameTexts: log.frames.map((f) => f.text.slice(0, 80))
  });
  await send('Target.closeTarget', { targetId: result.targetId });
}
console.log(JSON.stringify({ label, url, results }, null, 1));
ws.close();
chrome.kill();
preview.kill();
await wait(500);
rmSync(profile, { recursive: true, force: true });
process.exit(0);
