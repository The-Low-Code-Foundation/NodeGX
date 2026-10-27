// NOANCESTOR drive: the F2 music app (copy) on a scratch preview, Search's Genre filter changed, every console line kept.
// node drive.mjs <preview-dist-dir> <project-dir> <home>
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [dist, project, home, previewCmd] = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const backendDir = join(home, '.noodl', 'backends', 'backend_mvfkn0qqxd7no');
const backend = spawn(process.execPath, ['/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend/dist/cli.js', 'serve', '--data-dir', backendDir, '--port', '8584', '--host', '127.0.0.1', '--backend-id', 'backend_mvfkn0qqxd7no', '--project-dir', project], { stdio: ['ignore', 'pipe', 'pipe'] });
let bout = '';
backend.stdout.on('data', (d) => (bout += d));
backend.stderr.on('data', (d) => (bout += d));
for (let i = 0; i < 200 && !/NODEGX_BACKEND_READY/.test(bout); i++) await wait(100);
console.log('BACKEND', /NODEGX_BACKEND_READY/.test(bout) ? 'ready' : 'NOT READY ' + bout.slice(-400));
const preview = previewCmd ? spawn('npx', ['--offline', '-y', '--package=@nodegx/preview@' + previewCmd, 'noodl-preview', project, '--port', '8611', '--no-watch'], { env: { ...process.env, HOME: home, npm_config_cache: '/Users/richardosborne/vscode_projects/NodeGX test projects/OWN-023 apps/.npm' }, stdio: ['ignore', 'pipe', 'pipe'] }) : spawn(process.execPath, [join(dist, 'noodl-preview.cjs'), project, '--port', '8611', '--no-watch'], {
  env: { ...process.env, HOME: home, NODE_PATH: '/Users/richardosborne/vscode_projects/OpenNoodl/node_modules' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let out = '';
preview.stdout.on('data', (d) => (out += d));
preview.stderr.on('data', (d) => (out += d));
let url;
for (let i = 0; i < 300 && !url; i++) {
  await wait(100);
  url = /8611/.test(out) ? 'http://127.0.0.1:8611' : undefined;
}
if (!url) {
  console.log('NO URL', out);
  preview.kill();
  process.exit(2);
}
url = url.replace(/\/$/, '');
await wait(2500); // the local backend

const profile = mkdtempSync(join(tmpdir(), 'noanc-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
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
const logs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
  if (m.method === 'Runtime.consoleAPICalled') logs.push({ at: stage, type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400) });
  if (m.method === 'Runtime.exceptionThrown') logs.push({ at: stage, type: 'exception', text: (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').slice(0, 400) });
  if (m.method === 'Log.entryAdded') logs.push({ at: stage, type: 'log-' + m.params.entry.level, text: (m.params.entry.text + ' ' + (m.params.entry.url || '')).slice(0, 300) });
});
const send = (method, params = {}, sessionId) =>
  new Promise((r) => {
    const mid = ++id;
    pending.set(mid, r);
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
let stage = 'load';
const { result } = await send('Target.createTarget', { url: 'about:blank' });
const { result: att } = await send('Target.attachToTarget', { targetId: result.targetId, flatten: true });
const s = att.sessionId;
await send('Page.enable', {}, s);
await send('Runtime.enable', {}, s);
await send('Log.enable', {}, s);
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, s)).result?.result?.value;

await send('Page.navigate', { url: url + '/search' }, s);
await wait(6000);
const selects = await evaluate(`JSON.stringify([...document.querySelectorAll('select')].map((x) => [...x.options].map((o) => o.value + '=' + o.text)))`);
const body0 = await evaluate(`document.body.innerText.slice(0, 600)`);
console.log('URL', url);
console.log('SELECTS', selects);
console.log('BODY0', JSON.stringify(body0));
const pick = async (selIndex, optIndex, label) => {
  stage = label;
  const r = await evaluate(`(() => { const sel = document.querySelectorAll('select')[${selIndex}]; if (!sel || !sel.options[${optIndex}]) return 'no option'; sel.value = sel.options[${optIndex}].value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); return sel.value; })()`);
  await wait(2500);
  const count = await evaluate(`(document.body.innerText.match(/\\d+ songs?|No songs[^\\n]*/) || ['?'])[0]`);
  return r + ' -> ' + count;
};
const n = JSON.parse(selects || '[]')[0]?.length || 0;
for (let k = 1; k < Math.min(n, 6); k++) console.log('PICK genre', k, await pick(0, k, 'genre-' + k));
console.log('PICK genre any', await pick(0, 0, 'genre-any'));
stage = 'rapid';
for (let round = 0; round < 4; round++) {
  for (let k = 1; k < Math.min(n, 8); k++) {
    await evaluate(`(() => { const sel = document.querySelectorAll('select')[0]; sel.value = sel.options[${k}].value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await wait(15 + 20 * round);
  }
}
await wait(3000);
console.log('RAPID ->', await evaluate(`(document.body.innerText.match(/\\d+ songs?/) || ['?'])[0]`));
console.log('BODY1', JSON.stringify(await evaluate(`document.body.innerText.slice(0, 400)`)));
console.log('LOGS', JSON.stringify(logs.filter((l) => !/favicon/.test(l.text)), null, 1).slice(0, 6000));
ws.close();
chrome.kill();
preview.kill();
backend.kill();
await wait(800);
rmSync(profile, { recursive: true, force: true });
process.exit(0);
