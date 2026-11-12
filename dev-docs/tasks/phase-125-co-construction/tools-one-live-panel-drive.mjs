// Three Studio panels mounted 6 s apart in one Chrome, each answered like a host: ui/initialize, then its open_studio
// result with panelId/issuedAt. Then: an outside write, HOLD from the live panel, the agent's release, a wake.
//   node serve.mjs <COPY of a project> --port <studio-port>  (nodegx-studio/editor), then, with the sandbox off:
//   node tools-one-live-panel-drive.mjs <studio-port> <host-port> <cdp-port> <project-copy> [noresult]
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import WebSocket from '../../../node_modules/ws/index.js';

const [studioPort, hostPort, cdpPort, projectDir, mode] = process.argv.slice(2);
const sendResult = mode !== 'noresult';
const panel = `http://127.0.0.1:${studioPort}/panel`;
const html = `<!doctype html><body style="margin:0"><pre id="log"></pre><div id="frames"></div><script>
const issued = {};
window.addPanel = (i, issuedAt) => {
  const f = document.createElement('iframe'); f.id = 'p' + i; f.src = ${JSON.stringify(panel)};
  f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  f.style.cssText = 'width:1000px;height:640px;display:block;border:1px solid red';
  issued[i] = issuedAt; document.getElementById('frames').append(f);
};
window.heights = {};
window.addEventListener('message', (ev) => {
  const m = ev.data; if (!m || m.jsonrpc !== '2.0') return;
  const f = [...document.querySelectorAll('iframe')].find((x) => x.contentWindow === ev.source); if (!f) return;
  const i = f.id.slice(1);
  const reply = (result) => ev.source.postMessage({ jsonrpc: '2.0', id: m.id, result }, '*');
  if (m.method === 'ui/initialize') reply({ protocolVersion: m.params.protocolVersion, hostInfo: { name: 'fake-host', version: '0' }, hostCapabilities: {}, hostContext: { displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'] } });
  else if (m.method === 'ui/notifications/initialized') {
    if (${sendResult}) ev.source.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { content: [{ type: 'text', text: JSON.stringify({ ok: true, panelId: 'panel-' + i, issuedAt: issued[i] }) }] } }, '*');
  } else if (m.method === 'ui/notifications/size-changed') window.heights[i] = m.params.height;
  else if (m.method === 'ui/notifications/request-teardown') document.getElementById('log').textContent += 'teardown requested by panel ' + i + '\\n';
  else if (m.id !== undefined) reply({});
});
</script>`;
const host = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(Number(hostPort), '127.0.0.1');
const udd = fs.mkdtempSync(os.tmpdir() + '/drive3-udd-');
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${udd}`, '--use-mock-keychain', '--no-first-run', '--window-size=1100,2200', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => rej(new Error('cdp timeout ' + method)), 60000); });
const evalTop = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
async function inFrame(i, expression) {
  const tree = (await send('Page.getFrameTree')).frameTree;
  const c = (tree.childFrames || [])[i];
  if (!c) return 'no frame';
  const { executionContextId } = await send('Page.createIsolatedWorld', { frameId: c.frame.id, worldName: 'w' + Math.random() });
  const v = await send('Runtime.evaluate', { contextId: executionContextId, expression, returnByValue: true, awaitPromise: true });
  return v.result.value ?? v.exceptionDetails?.text;
}
const STATE = `JSON.stringify({ quiet: document.documentElement.dataset.quiet || '', state: document.getElementById('hoststate')?.textContent, banner: document.querySelector('#problems:not([hidden]) h4')?.textContent || '', primary: (() => { const f = document.querySelector('#app iframe:not([style*=hidden])'); try { return f && getComputedStyle(f.contentDocument.documentElement).getPropertyValue('--primary').trim(); } catch { return 'x'; } })(), frames: document.querySelectorAll('#app iframe').length })`;
async function readAll(label) {
  const n = await evalTop('document.querySelectorAll("iframe").length');
  console.log(`[${label}]`);
  for (let i = 0; i < n; i++) console.log(`  panel ${i + 1}: ${await inFrame(i, STATE)}  height=${await evalTop(`window.heights[${i + 1}]`)}`);
}
const pj = `${projectDir}/nodegx.project.json`;
const setPrimary = (hex) => fs.writeFileSync(pj, fs.readFileSync(pj, 'utf8').replace(/("name": "--primary",\s*"value": )"#[0-9a-f]{6}"/, `$1"${hex}"`));
try {
  let list; for (let t = 0; t < 50; t++) { try { list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json(); break; } catch { await sleep(200); } }
  ws = new WebSocket(list.find((x) => x.type === 'page').webSocketDebuggerUrl); await new Promise((r) => ws.on('open', r));
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${hostPort}/` }); await sleep(1500);
  const t0 = Date.now();
  for (const i of [1, 2, 3]) { await evalTop(`addPanel(${i}, ${t0 + i * 1000})`); await sleep(i === 3 ? 20000 : 6000); }
  await readAll('three panels mounted, 6 s apart');
  console.log('  host log:', JSON.stringify(await evalTop('document.getElementById("log").textContent')));
  setPrimary('#16a34a'); await sleep(8000);
  await readAll('8 s after an outside write (--primary #16a34a)');
  const t = await inFrame(2, `(async () => { const t = performance.now(); const r = await fetch('/api/hold', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ held: true, note: 'drive' }) }); return (await r.json()).held + ' in ' + Math.round(performance.now() - t) + ' ms'; })()`);
  console.log('HOLD from panel 3:', t);
  execSync(`curl -s -X POST -H 'content-type: application/json' -d '{"held":false,"by":"agent","words":"make it blue"}' http://127.0.0.1:${studioPort}/api/hold`);
  await sleep(1500);
  console.log('panel 3 strip after the agent released:', await inFrame(2, `document.getElementById('hoststate').textContent + ' | class=' + document.getElementById('hoststate').className`));
  await inFrame(0, `document.getElementById('wakebtn').click()`);
  await sleep(15000);
  await readAll('panel 1 brought back');
  setPrimary('#9333ea'); await sleep(8000);
  await readAll('8 s after another outside write (--primary #9333ea)');
  await evalTop(`addPanel(4, ${t0})`); await sleep(8000);
  console.log('panel 4 (an OLD call remounted):', await inFrame(3, STATE), 'studio booted:', await inFrame(3, 'String(!!window.__ob)'));
} catch (e) { console.log('DRIVE ERROR', e.message); } finally {
  try { ws?.close(); } catch {}
  chrome.kill('SIGTERM'); host.close(); await sleep(500); fs.rmSync(udd, { recursive: true, force: true });
}
