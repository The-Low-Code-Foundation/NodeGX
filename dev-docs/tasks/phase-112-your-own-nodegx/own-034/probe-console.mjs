// OWN-034: load an app in headless Chrome, print its console and page errors, reload it (same profile, so storage
// is kept) and print them again. For reading what a running NodeGX graph does at load, which a grade only reports.
//   node probe-console.mjs <url> [--steps "add:Drink water"]     (run with the Bash sandbox off: Chrome)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [URL_] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'own034-probe-'));
const port = 59800 + Math.floor(Math.random() * 90);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', 'about:blank'], { stdio: 'ignore' });
let target;
for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const waiting = new Map();
const send = (method, params = {}) => new Promise((res) => { const n = ++id; waiting.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result); waiting.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') console.log(`  [${m.params.type}]`, m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  if (m.method === 'Runtime.exceptionThrown') console.log('  [exception]', m.params.exceptionDetails.exception?.description?.slice(0, 300));
});
await send('Runtime.enable');
await send('Page.enable');
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
console.log('— first load');
await send('Page.navigate', { url: URL_ });
await sleep(3000);
console.log('— seed storage through the app: type a name, press Add');
await evalJs(`(async () => { const i = document.querySelector('input'); i.focus(); document.execCommand('insertText', false, 'Drink water'); await new Promise(r => setTimeout(r, 300)); document.querySelector('.add-button').click(); })()`);
await sleep(1500);
console.log('  storage:', await evalJs(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k).slice(0, 200)])))`));
console.log('— reload');
await send('Page.reload');
await sleep(3000);
console.log('  rows:', await evalJs(`[...document.querySelectorAll('.item-name')].map(e => e.innerText).join(' | ')`));
ws.close(); chrome.kill(); fs.rmSync(profile, { recursive: true, force: true });
