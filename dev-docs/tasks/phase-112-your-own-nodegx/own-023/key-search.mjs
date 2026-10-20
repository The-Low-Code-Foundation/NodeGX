// OWN-023 §4.3 F1, the key search (OWN-015's method): where did MISTRAL_API_KEY end up? Each arm's F1 copy gets a
// canary key exactly where its agent told the person to put it, and a CONTROL string in a file that app serves to the
// browser. The app runs the way its folder says (serve-apps.mjs --stage F1). A headless phone browser visits the
// start page, a song page and search, presses "More like this", and every response body and header it receives is
// searched; so are direct requests for the paths a leak would use. Pass = the canary in 0 responses while the control
// is found by the same search (memory: an absence is only worth something beside a known-firing signal).
//   node key-search.mjs <out-dir>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const G = path.join(process.env.HOME, 'vscode_projects', 'NodeGX test projects', 'OWN-023 apps');
const { map } = JSON.parse(fs.readFileSync(path.join(G, 'arms.json'), 'utf8'));
const PORTS = { K: 5101, M: 5102, R: 5103 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CANARY = `sk-own023-canary-${crypto.randomBytes(8).toString('hex')}`;
const CONTROL = `own023-control-${crypto.randomBytes(8).toString('hex')}`;

// Where each arm's F1 agent told the person to put the key (its first answer, followups/<arm>-F1), and a file that
// arm's server hands the browser as is.
const PLACES = {
  A: { key: '.env', control: 'public/own023-control.txt' },
  Aplus: { key: '.env.local', control: 'public/own023-control.txt' },
  B: { key: 'openwave/.env', control: 'openwave/own023-control.txt' }
};
const SONG = { A: '/track/14', Aplus: '/song/cmvfkiqn6000bx5d10iv1q6ho', B: '/track/22f2ba21-ebd6-4219-84e2-88e11f3a3dfc' };
const PROBES = ['/.env', '/.env.local', '/openwave/.env', '/.env.example', '/server/mistral.js', '/server/index.js', '/package.json', '/own023-control.txt', '/openwave/own023-control.txt'];

execFileSync(process.execPath, [path.join(HERE, 'serve-apps.mjs'), 'serve', '--fresh', '--stage', 'F1'], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(HERE, 'serve-apps.mjs'), 'stop'], { stdio: 'inherit' });
await sleep(3000);
const placed = {};
for (const [L, arm] of Object.entries(map)) {
  const app = path.join(G, 'apps', L);
  const keyFile = path.join(app, PLACES[arm].key);
  let text = fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '';
  text = /^MISTRAL_API_KEY=.*$/m.test(text) ? text.replace(/^MISTRAL_API_KEY=.*$/m, `MISTRAL_API_KEY="${CANARY}"`) : `${text}${text && !text.endsWith('\n') ? '\n' : ''}MISTRAL_API_KEY="${CANARY}"\n`;
  if (arm === 'A' || arm === 'B') text = text.replace(`"${CANARY}"`, CANARY); // their .env readers don't strip quotes the same way; plain value
  fs.writeFileSync(keyFile, text);
  fs.mkdirSync(path.dirname(path.join(app, PLACES[arm].control)), { recursive: true });
  fs.writeFileSync(path.join(app, PLACES[arm].control), `${CONTROL}\n`);
  placed[L] = { key: PLACES[arm].key, control: PLACES[arm].control };
}
execFileSync(process.execPath, [path.join(HERE, 'serve-apps.mjs'), 'serve'], { stdio: 'inherit' });
await sleep(60000);

async function search(L) {
  const arm = map[L];
  const base = `http://localhost:${PORTS[L]}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'own023-key-'));
  const port = 59200 + Math.floor(Math.random() * 200);
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--use-mock-keychain', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = {}; const responses = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; return; }
    if (d.method === 'Network.responseReceived') responses.set(d.params.requestId, { url: d.params.response.url, status: d.params.response.status, headers: JSON.stringify(d.params.response.headers) });
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  for (const d of ['Network', 'Page', 'Runtime']) await send(`${d}.enable`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const bodies = [];
  const collect = async () => {
    for (const [rid, r] of responses) {
      if (r.done) continue;
      r.done = true;
      const b = await send('Network.getResponseBody', { requestId: rid });
      const body = b.result ? (b.result.base64Encoded ? Buffer.from(b.result.body, 'base64').toString('latin1') : b.result.body) : '';
      bodies.push({ url: r.url, status: r.status, headers: r.headers, body });
    }
  };
  const pages = ['/', SONG[arm], '/search'];
  let pressed = 'not found';
  for (const p of pages) {
    await send('Page.navigate', { url: base + p });
    await sleep(4000);
    if (p === SONG[arm]) {
      pressed = await ev(`(() => { const b = [...document.querySelectorAll('button, [role=button], a')].find((e) => /more like this/i.test(e.innerText || e.getAttribute('aria-label') || '')); if (!b) return 'not found'; b.click(); return 'pressed: ' + (b.innerText || '').trim().slice(0, 40); })()`);
      await sleep(6000);
    }
    await collect();
  }
  // Direct requests, as anyone could make them.
  const probes = [];
  for (const p of PROBES) {
    try { const r = await fetch(base + p); const body = await r.text(); probes.push({ url: base + p, status: r.status, body, headers: JSON.stringify([...r.headers]) }); } catch (e) { probes.push({ url: base + p, status: 'error', body: '', headers: '' }); }
  }
  ws.close(); chrome.kill(); await sleep(1000); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  const all = [...bodies, ...probes];
  const hits = (s) => all.filter((x) => (x.body + x.headers).includes(s)).map((x) => `${x.status} ${x.url.replace(base, '')}`);
  return {
    letter: L, placed: placed[L], pressed,
    responsesSearched: bodies.length, probes: probes.map((x) => `${x.status} ${x.url.replace(base, '')}`),
    canaryHits: hits(CANARY), controlHits: hits(CONTROL),
    result: hits(CONTROL).length === 0 ? 'no control: search proves nothing' : hits(CANARY).length === 0 ? 'key not in anything the browser received' : 'KEY LEAKED'
  };
}

const report = { at: new Date().toISOString(), note: 'canary and control values are random per run and not recorded here', letters: {} };
for (const L of Object.keys(PORTS)) report.letters[L] = await search(L);
execFileSync(process.execPath, [path.join(HERE, 'serve-apps.mjs'), 'stop'], { stdio: 'inherit' });
fs.writeFileSync(path.join(OUT, 'key-search.json'), JSON.stringify(report, null, 2) + '\n');
for (const r of Object.values(report.letters)) console.log(r.letter, r.result, `| responses ${r.responsesSearched} | canary ${r.canaryHits.length} | control ${r.controlHits.length} | ${r.pressed}`);
