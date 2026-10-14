// Does a lesson page survive a reload? Home → tap Greetings → read the URL → Page.reload → read the page again.
// Then a control: a direct load of the home URL, which must render.
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const S = path.dirname(new URL(import.meta.url).pathname); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(S, 'chrome-')); const port = 59990 + Math.floor(Math.random() * 9);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--use-mock-keychain', 'about:blank'], { stdio: 'ignore' });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page'); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = {}; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
const text = async () => { await sleep(3000); return { url: await ev('location.href'), text: (await ev('document.body.innerText')).slice(0, 160).replace(/\n/g, ' | ') }; };
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:59500/' }); console.log('home', await text());
const at = await ev(`(() => { const el = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Greetings'); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 });
const lesson = await text(); console.log('tapped', lesson);
await send('Page.reload'); console.log('reloaded', await text());
await send('Page.navigate', { url: lesson.url }); console.log('direct', await text());
await send('Page.navigate', { url: 'http://127.0.0.1:59500/' }); console.log('control home', await text());
chrome.kill(); setTimeout(() => { fs.rmSync(profile, { recursive: true, force: true }); process.exit(0); }, 500);
