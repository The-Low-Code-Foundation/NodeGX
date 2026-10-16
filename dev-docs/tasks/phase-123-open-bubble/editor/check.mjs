/**
 * P123 Open Bubble — the gate. Copies the repo's todo-list template, starts an ephemeral backend for the copy, serves
 * the editor on it and drives every tab in headless Chrome over CDP: select, type, resize, reorder, add, delete,
 * undo (Design); the event list, a step's settings, an added action (Workflow); a new type, a field, a row (Data).
 * Every assertion reads the files the kit's store wrote, the backend, or the app on screen — never the editor's
 * own claim.
 *
 *   node check.mjs            PASS n/n and exit 0, or the failing lines and exit 1
 *
 * Needs the deploy runtime, the in-page preview bundle and Orbit's look.js / specs.js (serve.mjs says which is missing).
 */
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { browser } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..', '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const lineFrom = (proc, pattern, ms = 30000) => new Promise((ok, no) => {
  let out = ''; const t = setTimeout(() => no(new Error(`no "${pattern}" in ${ms} ms:\n${out.slice(-800)}`)), ms);
  const on = (d) => { out += d; const m = out.match(pattern); if (m) { clearTimeout(t); ok(m); } };
  proc.stdout.on('data', on); proc.stderr.on('data', on);
});

const tmp = mkdtempSync(join(tmpdir(), 'open-bubble-check-'));
const project = join(tmp, 'todo-list');
cpSync(join(repo, 'templates/todo-list'), project, { recursive: true });
const children = [];
const results = [];
const ok = (cond, what, detail) => { results.push({ cond: !!cond, what, detail }); console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${what}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 220) : ''}`); };
let b;
try {
  // a backend of the copy's own, in memory
  const backendPort = await freePort();
  const backend = spawn(process.execPath, [join(repo, 'packages/nodegx-backend/bin/nodegx-backend.js'), 'serve', '--data-dir', join(tmp, 'backend'), '--port', String(backendPort), '--token', 'open-bubble-check', '--backend-id', 'open_bubble_check', '--backend-name', 'Open Bubble check', '--ephemeral'], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(backend);
  await lineFrom(backend, /NODEGX_BACKEND_READY/);
  const pjPath = join(project, 'nodegx.project.json');
  const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
  pj.metadata ??= {};
  pj.metadata.cloudservices = { instanceId: 'open_bubble_check', endpoint: `http://127.0.0.1:${backendPort}`, appId: 'open_bubble_check', type: 'nodegx' };
  writeFileSync(pjPath, JSON.stringify(pj, null, 2));
  // the editor on the copy
  const port = await freePort();
  const server = spawn(process.execPath, [join(here, 'serve.mjs'), project, '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(server);
  await lineFrom(server, /open-bubble: http/);
  const url = `http://127.0.0.1:${port}/`;

  b = await browser({ port: await freePort(), width: 1600, height: 1000 });
  await b.goto(url);
  const title = await b.waitTitle((t) => t.startsWith('ready'), 90000);
  console.log(`check: ${title}`);
  await wait(1200);
  const page = () => b.evaluate('document.getElementById("pagepick").value');
  const comp = (key) => b.evaluate(`JSON.stringify(__ob.store.readComponent(${JSON.stringify(key)}).files)`).then(JSON.parse);
  const onDisk = (rel) => JSON.parse(readFileSync(join(project, rel), 'utf8'));
  const centreOf = (id) => b.evaluate(`(() => { const el = __ob.preview.elementsOf(${JSON.stringify(id)})[0]; if (!el) return null; const r = el.getBoundingClientRect(); const o = document.getElementById('overlay').getBoundingClientRect(); return { x: Math.round(o.left + r.left + r.width/2), y: Math.round(o.top + r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(o.top + r.top) }; })()`);
  const appText = () => b.evaluate('__ob.preview.frame.contentDocument.body.innerText');
  const shows = () => b.evaluate('__ob.shows || 0');
  const rebuilt = async (n0) => { await b.until(`(__ob.shows || 0) > ${n0} && document.getElementById("status").textContent.startsWith("App on screen")`, 30000); await wait(300); };
  const status = () => b.evaluate('document.getElementById("status").textContent');

  console.log('check: Design');
  // the Router starts on Todo; the app's own gate sends a visitor to Sign in, and the editor follows it
  ok((await page()) === 'Pages/Sign in' && (await appText()).includes('Sign in'), 'the editor shows the page the app is on (Todo redirects a visitor to Sign in)', { page: await page() });
  const sign = await comp('Pages/Sign in');
  const title1 = sign.nodes.nodes.find((n) => n.label === 'App name').id;
  const lead = sign.nodes.nodes.find((n) => n.label === 'What this is').id;
  const card = sign.nodes.nodes.find((n) => n.label === 'Sign-in card').id;
  let at = await centreOf(title1);
  await b.click(at.x, at.y); await wait(300);
  ok((await b.evaluate('document.querySelector("#right .head input")?.value')) === 'App name', 'clicking the app name in the page selects it and the property editor shows it');
  {
    const fields = await b.evaluate(`[...document.querySelectorAll('#right .field')].map(f => f.querySelector('label').textContent)`);
    const idx = fields.indexOf('Text');
    const n0 = await shows();
    await b.evaluate(`(() => { const f = [...document.querySelectorAll('#right .field')][${idx}]; const i = f.querySelector('input,textarea'); i.focus(); i.select(); })()`);
    await b.type('Open Bubble todo');
    await rebuilt(n0);
    ok(onDisk('components/Pages/Sign in/nodes.json').nodes.find((n) => n.id === title1).parameters.text === 'Open Bubble todo' && (await appText()).includes('Open Bubble todo'), 'typing in the Text field is written to nodes.json on disk and the app shows it');
  }
  {
    const n0 = await shows(); const before = (await centreOf(title1)).w;
    const hnd = await b.rectOf('.handle.e');
    await b.drag({ x: hnd.x, y: hnd.y }, { x: hnd.x - 100, y: hnd.y });
    await rebuilt(n0);
    const n = onDisk('components/Pages/Sign in/nodes.json').nodes.find((n) => n.id === title1);
    const after = (await centreOf(title1)).w;
    ok(n.parameters.width?.unit && after < before - 60, 'pulling the east handle writes a width the app then has', { before, after, width: n.parameters.width });
  }
  {
    const n0 = await shows(); const from = await centreOf(lead); const to = await centreOf(title1);
    await b.drag({ x: from.x, y: from.y }, { x: to.x, y: to.top + 4 }, 16);
    await rebuilt(n0);
    const kids = onDisk('components/Pages/Sign in/nodes.json').nodes.find((n) => n.id === card).children;
    ok(kids.indexOf(lead) < kids.indexOf(title1), 'dragging the lead above the title reorders the card\'s children on disk', { order: kids.slice(0, 3) });
  }
  {
    let n0 = await shows();
    await b.clickSel('#palette button:nth-child(3)');
    at = await centreOf(title1); await b.click(at.x, at.y); await rebuilt(n0);
    const added = onDisk('components/Pages/Sign in/nodes.json').nodes.find((n) => n.type === 'net.noodl.controls.button' && n.parameters?.label === 'Button');
    ok(added && added.parent === card && (await appText()).includes('Button'), 'a Button from the palette lands in the card on disk and in the app', { parent: added?.parent });
    n0 = await shows(); await b.evaluate('document.activeElement && document.activeElement.blur()'); await b.key('Delete', 'Delete', 46); await rebuilt(n0);
    ok(!onDisk('components/Pages/Sign in/nodes.json').nodes.some((n) => n.parameters?.label === 'Button'), 'the Delete key removes it from disk');
    n0 = await shows(); await b.clickSel('#undo'); await rebuilt(n0);
    ok(onDisk('components/Pages/Sign in/nodes.json').nodes.some((n) => n.parameters?.label === 'Button'), 'Undo puts it back on disk');
  }
  console.log('check: Workflow');
  await b.clickSel('[data-tab=workflow]'); await wait(300);
  const events = await b.evaluate('[...document.querySelectorAll("#events .row")].map(r => r.firstChild.textContent)');
  ok(events.some((e) => /^When Sign in: /.test(e)) && events.some((e) => /^When Create account: /.test(e)), 'the sign-in page lists its button events', events);
  await b.evaluate(`[...document.querySelectorAll("#events .row")].find(r => r.firstChild.textContent.startsWith("When Sign in: ")).click()`); await wait(300);
  const steps = await b.evaluate('[...document.querySelectorAll("#steps .step h3")].map(r => r.firstChild.textContent)');
  ok(steps.length >= 1 && /Log In/i.test(steps[0]), 'the Sign in click\'s first step is the Log In action', steps);
  await b.clickSel('#steps .step button'); await wait(200);
  const fields = await b.evaluate(`[...document.querySelectorAll('#steps .step .props')].filter(p => p.style.display !== 'none').flatMap(p => [...p.querySelectorAll('.field label')].map(l => l.textContent))`);
  ok(fields.length > 0, 'a step opens its settings as fields', fields.slice(0, 6));
  {
    const n0 = await shows();
    await b.clickSel('#steps button.primary'); await wait(200); await b.type('Go to page'); await wait(200); await b.clickSel('.menu .item'); await rebuilt(n0);
    const c = onDisk('components/Pages/Sign in/nodes.json'); const w = onDisk('components/Pages/Sign in/connections.json');
    const nav = c.nodes.filter((n) => n.type === 'RouterNavigate');
    const wired = nav.some((n) => w.connections.some((x) => x.toId === n.id && x.toProperty === 'navigate'));
    ok(wired, 'an added "Go to page" action is a Navigate node on disk, wired from the step before it', { navigates: nav.length });
  }
  console.log('check: Data');
  await b.clickSel('[data-tab=data]'); await wait(300);
  await b.evaluate(`window.prompt = () => 'Note'`); await b.clickSel('#newtype'); await wait(800);
  ok(onDisk('nodegx.project.json').metadata.dbCollections.some((c) => c.name === 'Note'), 'a new data type is written into nodegx.project.json');
  await b.evaluate(`window.prompt = () => 'title'`); await b.clickSel('#datamain .bar button'); await wait(800);
  ok(onDisk('nodegx.project.json').metadata.dbCollections.find((c) => c.name === 'Note').columns.some((c) => c.name === 'title'), 'a new field is written into the type');
  await wait(1200);
  await b.clickSel('#datamain .bar button.primary'); await wait(1500);
  const rows = await fetch(`http://127.0.0.1:${backendPort}/classes/Note?limit=10`, { headers: { 'X-Parse-Application-Id': 'open_bubble_check' } }).then((r) => r.json());
  ok(rows.results?.length === 1, '"+ New entry" creates a row on the backend', { rows: rows.results?.length });
  ok((await status()).startsWith('App on screen'), 'after every edit the app still validates and draws', await status());
  const problems = b.problems.filter((p) => !/Invalid connection|doesn't have a port|Failed to load resource/.test(p));
  ok(problems.length === 0, 'no exceptions in the editor page', problems.slice(0, 3));
} catch (err) {
  ok(false, `the gate itself: ${err.message.split('\n')[0]}`);
} finally {
  try { await b?.close(); } catch { /* gone */ }
  for (const c of children) c.kill();
  rmSync(tmp, { recursive: true, force: true });
}
const passed = results.filter((r) => r.cond).length;
console.log(`check: ${passed === results.length ? 'PASS' : 'FAIL'} ${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
