// Tiny CDP driver: node cdp.mjs <script.mjs>  — the script gets {ev, shot, sleep, nav, key, typeText, send, requests}
// `requests` is every request the page made ({method, url}), in order — BMG-002 AC3 reads the sort the server was sent.
import fs from 'fs';
const t = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const logs = []; const requests = [];
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data);
  if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') logs.push('ERR ' + d.params.args.map(a=>a.value||a.description).join(' '));
  if (d.method === 'Network.requestWillBeSent') requests.push({ method: d.params.request.method, url: d.params.request.url });
  if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(expr.slice(0,80) + ' -> ' + JSON.stringify(r.result.exceptionDetails.exception?.description)); return r.result.result.value; };
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(process.env.S + '/' + name + '.png', Buffer.from(r.result.data, 'base64')); };
const nav = async (url) => { await send('Page.navigate', { url }); await sleep(1200); };
const key = async (k) => { const code = { Enter: 13, Escape: 27, Tab: 9 }[k]; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, windowsVirtualKeyCode: code }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, windowsVirtualKeyCode: code }); };
const typeText = async (s) => send('Input.insertText', { text: s });
const script = (await import(process.argv[2])).default;
try { await script({ ev, shot, sleep, nav, key, typeText, send, requests }); } catch (e) { console.log('FAILED:', e.message); }
console.log(logs.length ? logs.join('\n') : 'no page errors');
ws.close(); process.exit(0);
