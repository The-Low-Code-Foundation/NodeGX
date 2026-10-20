// Opens a converted project in the P123 Open Bubble editor headless and screenshots the four tabs.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { join, resolve } from 'node:path';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
const [,, project, outDir] = process.argv;
import { dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const editor = join(dirname(fileURLToPath(import.meta.url)), '..', 'editor');
const { browser } = await import(join(editor, 'cdp.mjs'));
mkdirSync(outDir, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const lineFrom = (proc, pattern, ms = 30000) => new Promise((ok, no) => { let out = ''; const t = setTimeout(() => no(new Error(`no "${pattern}" in ${ms} ms:\n${out.slice(-800)}`)), ms); const on = (d) => { out += d; const m = out.match(pattern); if (m) { clearTimeout(t); ok(m); } }; proc.stdout.on('data', on); proc.stderr.on('data', on); });
const children = []; let b;
try {
  const port = await freePort();
  const server = spawn(process.execPath, [join(editor, 'serve.mjs'), resolve(project), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(server);
  await lineFrom(server, /open-bubble: http/);
  b = await browser({ port: await freePort(), width: 1600, height: 1000 });
  await b.goto(`http://127.0.0.1:${port}/`);
  const title = await b.waitTitle((t) => t.startsWith('ready'), 90000);
  console.log('title:', title);
  await wait(1500);
  const status = () => b.evaluate('document.getElementById("status").textContent');
  console.log('status:', await status());
  console.log('page:', await b.evaluate('document.getElementById("pagepick").value'));
  console.log('tree:', await b.evaluate(`[...document.querySelectorAll('#tree .row, #tree li, #tree [data-id]')].slice(0,30).map(r => r.textContent.trim().slice(0,40))`));
  const centreOf = (id) => b.evaluate(`(() => { const el = __ob.preview.elementsOf(${JSON.stringify(id)})[0]; if (!el) return null; const r = el.getBoundingClientRect(); const o = document.getElementById('overlay').getBoundingClientRect(); return { x: Math.round(o.left + r.left + r.width / 2), y: Math.round(o.top + r.top + r.height / 2) }; })()`);
  // the first button of the start page, whatever the app
  const pageKey = await b.evaluate('document.getElementById("pagepick").value');
  const nodesFile = join(resolve(project), 'components', pageKey, 'nodes.json');
  const firstButton = JSON.parse(readFileSync(nodesFile, 'utf8')).nodes.find((n) => n.type === 'net.noodl.controls.button');
  const at = firstButton ? await centreOf(firstButton.id) : null; console.log('first button', firstButton?.label, 'at', at);
  if (at) { await b.click(at.x, at.y); await wait(500); }
  await b.screenshot(join(outDir, 'ob-design.png'));
  console.log('props:', await b.evaluate(`[...document.querySelectorAll('#right .field label')].slice(0,12).map(l => l.textContent)`));
  await b.clickSel('[data-tab=workflow]'); await wait(400);
  const events = await b.evaluate('[...document.querySelectorAll("#events .row")].map(r => r.firstChild.textContent)'); console.log('events:', events);
  await b.evaluate(`([...document.querySelectorAll("#events .row")].find(r => /Click/.test(r.firstChild.textContent)) || document.querySelector("#events .row"))?.click()`); await wait(400);
  console.log('steps:', await b.evaluate('[...document.querySelectorAll("#steps .step h3")].map(r => r.firstChild.textContent)'));
  await b.clickSel('#steps .step .acts button').catch(() => {}); await wait(300);
  await b.screenshot(join(outDir, 'ob-workflow.png'));
  await b.clickSel('[data-tab=data]'); await wait(500);
  console.log('types:', await b.evaluate(`[...document.querySelectorAll('#data .row, #typelist .row')].map(r => r.textContent.trim().slice(0,30))`));
  await b.screenshot(join(outDir, 'ob-data.png'));
  await b.clickSel('[data-tab=styles]'); await wait(400);
  console.log('styles:', await b.evaluate(`[...document.querySelectorAll('#stylelist .row')].map(r => r.textContent.trim().slice(0,30))`));
  await b.evaluate(`([...document.querySelectorAll('#stylelist .row')].find(r => /Button/.test(r.textContent)) || document.querySelector('#stylelist .row'))?.click()`); await wait(400);
  await b.screenshot(join(outDir, 'ob-styles.png'));
  await b.clickSel('[data-tab=design]'); await wait(400);
  const second = [...(await b.evaluate(`JSON.stringify([...document.getElementById("pagepick").options].map(o => o.value))`).then(JSON.parse))].filter((v) => v !== pageKey)[0];
  if (second) { await b.evaluate(`document.getElementById("pagepick").value = ${JSON.stringify(second)}; document.getElementById("pagepick").dispatchEvent(new Event("change"))`); await wait(4000); console.log('second page', second); }
  console.log('status after page switch:', await status());
  await b.screenshot(join(outDir, 'ob-second-page.png'));
  console.log('problems:', b.problems.slice(0, 8));
} catch (e) { console.error('DRIVE FAILED:', e.message); }
finally { try { await b?.close(); } catch {} for (const c of children) c.kill(); }
