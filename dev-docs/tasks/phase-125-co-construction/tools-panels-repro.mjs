// N Studio panels from ONE origin in ONE Chrome (as Claude Desktop draws one per open_studio), then an outside
// write (as the agent's set_project_tokens). Reads each panel's problem banner and the --primary its app draws.
//   node serve.mjs <COPY of a project> --port <studio-port>   (nodegx-studio/editor), then
//   node tools-panels-repro.mjs <studio-port> <host-port> <cdp-port> <that copy> <n>   (sandbox off: it starts Chrome)
// P125-PUPPY2-THREEPANELS: n=2 takes the write; n=3 times out in every panel, a fetch from a panel stalls, and
// removing one panel brings the others back. It WRITES the copy's nodegx.project.json (--primary).
import http from 'node:http';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import WebSocket from '../../../node_modules/ws/index.js';

const [studioPort, hostPort, cdpPort, projectDir, nStr] = process.argv.slice(2);
const n = Number(nStr);
const html = `<!doctype html><body style="margin:0">${Array.from({ length: n }, (_, i) =>
  `<iframe id="p${i}" src="http://127.0.0.1:${studioPort}/panel" sandbox="allow-scripts allow-same-origin allow-forms" style="width:1000px;height:700px;display:block"></iframe>`).join('')}</body>`;
const host = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(Number(hostPort), '127.0.0.1');

const udd = fs.mkdtempSync(os.tmpdir() + '/panels-udd-');
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${udd}`, '--use-mock-keychain', '--no-first-run', '--window-size=1100,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); setTimeout(() => rej(new Error('cdp timeout ' + method)), 60000); });
try {
  let list; for (let t = 0; t < 50; t++) { try { list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json(); break; } catch { await sleep(200); } }
  const page = list.find((x) => x.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => ws.on('open', r));
  ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  await send('Page.enable');
  const read = async (label) => {
    const tree = (await send('Page.getFrameTree')).frameTree;
    const out = [];
    for (const [i, c] of (tree.childFrames || []).entries()) {
      const { executionContextId } = await send('Page.createIsolatedWorld', { frameId: c.frame.id, worldName: 'r' + Math.random() });
      const v = await send('Runtime.evaluate', { contextId: executionContextId, returnByValue: true, expression:
        `JSON.stringify({ banner: document.querySelector('#problems h4')?.textContent || '', hidden: document.querySelector('#problems')?.hidden, shows: window.__ob?.shows ?? null, primary: (() => { const f = document.querySelector('#app iframe:not([style*=hidden])'); try { return f?.contentWindow && getComputedStyle(f.contentDocument.documentElement).getPropertyValue('--primary').trim(); } catch (e) { return 'x'; } })() })` });
      out.push(`panel ${i + 1}: ${v.result.value}`);
    }
    console.log(`[${label}]\n  ` + out.join('\n  '));
  };
  // panels open one after another, like three messages
  await send('Page.navigate', { url: `http://127.0.0.1:${hostPort}/` });
  await sleep(30000);
  await read(`${n} panel(s) open, 30 s`);
  // the agent's colour change, from outside Studio
  const pj = `${projectDir}/nodegx.project.json`;
  fs.writeFileSync(pj, fs.readFileSync(pj, 'utf8').replace(/"#1d4ed8"/, '"#16a34a"'));
  await sleep(30000);
  await read('30 s after an outside write to nodegx.project.json (--primary → #16a34a)');
  const tree = (await send('Page.getFrameTree')).frameTree;
  const { executionContextId: c1 } = await send('Page.createIsolatedWorld', { frameId: tree.childFrames[0].frame.id, worldName: 'probe' });
  const probe = await send('Runtime.evaluate', { contextId: c1, awaitPromise: true, returnByValue: true, expression: `Promise.race([fetch('http://127.0.0.1:${studioPort}/api/hold').then(r => 'answered ' + r.status), new Promise(r => setTimeout(() => r('STALLED 5 s'), 5000))])` });
  console.log('fetch /api/hold from panel 1:', probe.result.value);
  const est = (await import('node:child_process')).execSync(`lsof -nP -iTCP:${studioPort} -sTCP:ESTABLISHED | grep -ci chrome || true`).toString().trim();
  console.log('Chrome connections ESTABLISHED to Studio:', est);
  // the intervention: take the last panel away (as scrolling it out of a conversation does NOT, but closing does)
  await send('Runtime.evaluate', { expression: `document.getElementById('p${n - 1}').remove()` });
  await sleep(2000);
  fs.writeFileSync(pj, fs.readFileSync(pj, 'utf8').replace(/"#16a34a"/, '"#9333ea"'));
  await sleep(30000);
  await read('panel ' + n + ' removed, then another outside write (--primary → #9333ea)');
} finally {
  try { ws?.close(); } catch {}
  chrome.kill('SIGTERM'); host.close();
  await sleep(500); fs.rmSync(udd, { recursive: true, force: true });
}
