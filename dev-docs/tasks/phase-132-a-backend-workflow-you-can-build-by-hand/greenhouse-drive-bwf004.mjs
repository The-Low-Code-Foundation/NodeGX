// P132 BWF-004 AC3, in the Electron app on a copy of Greenhouse: "When a plant is watered" tested on a picked Watering
// row watered on 28 October (BWF-002's drive, greenhouse-drive.mjs, unchanged up to the test), then a Return added after
// its last step whose value is built from the formula menu, no JSON typed: *Time between* the Watering's `at` (picked
// from the run) and Now, in days; tested again, the number read off the panel and the backend's record. Reads, it does
// not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX
// checkout (Studio then runs the checkout's backend: `npm run build` in packages/nodegx-backend first, its dist/ is
// gitignored and goes stale). It drops ELECTRON_RUN_AS_NODE, which a shell under VS Code or Claude Code inherits and
// which starts Electron as plain Node (`app` undefined in main.cjs). The next task copies it and changes the middle.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// scratch output (the copy, its backend, the shots): NODEGX_DRIVE_DIR, else the OS temp dir
const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf004');
const studio = '/Users/richardosborne/vscode_projects/nodegx-studio';
const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
const root = join(S, 'gh'), gh = join(root, 'Greenhouse');
process.env.NODEGX_BACKENDS_DIR = join(root, 'backends');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(...a);

rmSync(root, { recursive: true, force: true });
cpSync(SRC, gh, { recursive: true, filter: (p) => !/\/(\.git|node_modules|\.nodegx)(\/|$)/.test(p) });
{
  const at = join(gh, 'nodegx.project.json'), pj = JSON.parse(readFileSync(at, 'utf8'));
  delete pj.metadata.cloudservices; delete pj.metadata.cloudservicesLive;
  writeFileSync(at, JSON.stringify(pj, null, 2));
}
const backends = await import(join(studio, 'lib/backend.mjs'));
say('attach', JSON.stringify(await backends.attachNewBackend(gh)));
const { attach } = await import(join(studio, 'editor/cdp.mjs'));
const electron = createRequire(join(studio, 'app/check.mjs'))('electron');
const port = 9461;
const proc = spawn(electron, [studio, gh, '--hidden', `--remote-debugging-port=${port}`], { env: Object.fromEntries(Object.entries({ ...process.env, NODEGX_STUDIO_USER_DATA: join(root, 'ud'), NODEGX_STUDIO_SINGLE_INSTANCE: '1' }).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')), stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; proc.stdout.on('data', (d) => (log += d)); proc.stderr.on('data', (d) => (log += d));
let b;
try {
  b = await attach({ port, width: 1600, height: 1000, match: (t) => /^http:\/\/127\.0\.0\.1:\d+\/?$/.test(t.url) });
  const ev = (x) => b.evaluate(x);
  for (let i = 0; i < 360 && !/^ready/.test(await ev('document.title')); i++) await wait(250);
  say('title', await ev('document.title'));
  const origin = await ev('location.origin');
  const api = async (path, init = {}) => { const r = await fetch(origin + path, { headers: { 'content-type': 'application/json' }, ...init }); return { status: r.status, json: await r.json().catch(() => null) }; };
  for (let i = 0; i < 120 && (await api('/api/backend-status')).json?.phase !== 'running'; i++) await wait(500);
  say('backend', JSON.stringify((await api('/api/backend-status')).json));
  say('deploy', JSON.stringify((await api('/api/functions/deploy', { method: 'POST' })).json).slice(0, 300));
  const plant = await api('/api/backend/classes/Plant', { method: 'POST', body: JSON.stringify({ name: 'Monstera', room: 'Living room', waterEvery: 7 }) });
  const watering = await api('/api/backend/classes/Watering', { method: 'POST', body: JSON.stringify({ plant: { __type: 'Pointer', className: 'Plant', objectId: plant.json?.objectId }, note: 'A good soak', at: { __type: 'Date', iso: '2026-10-28T09:00:00.000Z' } }) });
  say('rows', plant.status, plant.json?.objectId, watering.status, watering.json?.objectId ?? JSON.stringify(watering.json));
  await wait(1500);

  // the Backend tab, the workflow
  await ev(`document.querySelector('#rail [data-tab=backend]').click()`);
  for (let i = 0; i < 40 && !(await ev(`!!document.querySelector('#autolist .row[data-workflow="when-watered"]')`)); i++) await wait(250);
  await ev(`document.querySelector('#autolist .row[data-workflow="when-watered"]').click()`);
  for (let i = 0; i < 120 && !(await ev(`!!document.querySelector('#steps .testrow [data-act=sample]:not([disabled])') && !/Reading the sample/.test(document.querySelector('#steps .testrow')?.innerText)`)); i++) await wait(250);
  say('testrow', await ev(`document.querySelector('#steps .testrow')?.innerText`));
  say('diag', JSON.stringify(await ev(`(async () => ({ samples: await fetch('/api/automations/samples').then((r) => r.status + ' ' + r.headers.get('content-type')).catch((e) => 'ERR ' + e.message), sampleBtn: document.querySelector('#steps [data-act=sample]')?.disabled, testBtn: document.querySelector('#steps [data-act=test]')?.disabled, facts: document.querySelector('#steps .fnfacts')?.innerText }))()`)));
  // the sample: a real click on its button, a Watering row picked
  // scrolled into view first: after a test the panel runs past the window, and a press below it lands on nothing
  const at = async (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const before = el.getBoundingClientRect().top; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, before: Math.round(before), h: innerHeight }; })()`);
  const press = async (sel) => { const p = await at(sel); if (!p) throw new Error(`nothing at ${sel}`); if (p.before > p.h) say(`(${sel} was at y=${p.before}, below the window's ${p.h}: scrolled to it)`); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(60); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400); };
  await press('#steps .testrow [data-act=sample]');
  for (let i = 0; i < 40 && !(await ev(`!!document.querySelector('.menu.sample [data-row]')`)); i++) await wait(250);
  say('sample form', JSON.stringify(await ev(`(() => { const m = document.querySelector('.menu.sample'); return m && { kind: m.querySelector('[data-input=samplekind]').value, table: m.querySelector('[data-input=sampletable]')?.value, action: m.querySelector('[data-input=sampleaction]')?.value, rows: m.querySelector('.samplerows')?.innerText }; })()`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-sample.png'));
  await press('.menu.sample [data-row]');
  await press('.menu.sample [data-act=keepsample]');
  say('sample words', await ev(`document.querySelector('#steps .testrow .samplewords')?.innerText`));
  await press('#steps .testrow [data-act=test]');
  say('warning', await ev(`document.querySelector('.surescrim')?.innerText`));
  await press('.surescrim [data-act=yes]');
  for (let i = 0; i < 60 && !/Tested/.test(await ev(`document.querySelector('#steps .fnfacts .run')?.innerText ?? ''`)); i++) await wait(250);
  await wait(400);
  say('run line', await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`));
  say('cards', JSON.stringify(await ev(`[...document.querySelectorAll('#steps .autoview .step[data-id]')].map((c) => [c.dataset.id, c.className, c.querySelector('.lit')?.textContent])`)));
  await press('#steps .autoview .step[data-id="mark"] h3');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .rundata')`)); i++) await wait(250);
  say('mark panel', JSON.stringify(await ev(`(() => { const b = document.querySelector('#wfinspect .rundata'); return b && { head: b.querySelector('.sechead')?.textContent, in: [...b.querySelectorAll('.rdin li[data-path]')].map((l) => l.dataset.path).slice(0, 30), out: b.querySelector('.rdout')?.innerText?.slice(0, 300), ok: b.querySelector('.ok,.warn')?.textContent }; })()`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-tested.png'));
  const defs = await api('/api/backend/admin/workflow-defs');
  const rec = (await api(`/api/backend/executions/${defs.json.lastRuns['when-watered'].id}`)).json;
  say('record', JSON.stringify({ trigger: rec.triggerType, meta: rec.metadata, status: rec.status, steps: rec.steps.map((s) => [s.nodeId, s.status]) }));
  // P132 BWF-004: a Return after the last step, its value a formula built from the menu
  const wfNow = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'when-watered');
  await press('#steps .autoview .step[data-id="mark"] h3');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect [data-act=addafter]')`)); i++) await wait(250);
  await press('#wfinspect [data-act=addafter]');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu .item[data-kind="return"]')`)); i++) await wait(250);
  say('step menu box', JSON.stringify(await ev(`(() => { const m = document.querySelector('.menu.actions'); if (!m) return null; const r = m.getBoundingClientRect(), cs = getComputedStyle(m), it = m.querySelector('.item[data-kind="return"]'); it?.scrollIntoView({ block: 'center' }); const ir = it?.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), window: innerHeight, position: cs.position, maxHeight: cs.maxHeight, overflowY: cs.overflowY, returnAfterScroll: ir && Math.round(ir.top) }; })()`)));
  say('step menu', JSON.stringify(await ev(`({ menus: [...document.querySelectorAll('.menu')].map((m) => m.className + ': ' + [...m.querySelectorAll('[data-kind]')].map((x) => x.dataset.kind).join(',')), addafter: [...document.querySelectorAll('#wfinspect [data-act=addafter]')].map((x) => x.outerHTML.slice(0, 200)) })`)));
  await press('.menu .item[data-kind="return"]');
  for (let i = 0; i < 40 && !wfNow().steps.some((x) => x.kind === 'return'); i++) await wait(250);
  const ret = wfNow().steps.find((x) => x.kind === 'return');
  if (!ret) throw new Error('no Return was added: stopping before anything else is changed');
  say('return added', JSON.stringify(ret), 'mark next', JSON.stringify(wfNow().steps.find((x) => x.id === 'mark').next));
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .field.runvalue .rvmode')`)); i++) await wait(250);
  say('value modes', JSON.stringify(await ev(`[...document.querySelector('#wfinspect .field.runvalue .rvmode').options].map((o) => o.textContent)`)));
  await ev(`(() => { const sel = document.querySelector('#wfinspect .field.runvalue .rvmode'); sel.value = 'fn'; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu.formulas .item[data-fn="date-difference"]')`)); i++) await wait(250);
  say('formula menu', JSON.stringify(await ev(`[...document.querySelectorAll('.menu.formulas .h')].map((x) => x.textContent + ': ' + [...x.parentElement.querySelectorAll('.item')].length)`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf004-menu.png'));
  await press('.menu.formulas .item[data-fn="date-difference"]');
  const value = () => wfNow().steps.find((x) => x.id === ret.id)?.params?.value;
  for (let i = 0; i < 40 && value()?.$fn !== 'date-difference'; i++) await wait(250);
  say('picked', JSON.stringify(value()), '|', await ev(`document.querySelector('#wfinspect .formula .fxwords')?.innerText`));
  // From: from the run, the Watering's `at`
  await ev(`(() => { const sel = document.querySelector('#wfinspect .formula .field[data-arg="from"] .rvmode'); sel.value = 'from'; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu.picker .pickfield[data-path="body.at"]')`)); i++) await wait(250);
  await press('.menu.picker .pickfield[data-path="body.at"]');
  for (let i = 0; i < 40 && JSON.stringify(value()?.args?.[0]) !== '{"$path":"body.at"}'; i++) await wait(250);
  await wait(500);
  say('from picked', JSON.stringify(value()), '|', await ev(`document.querySelector('#wfinspect .formula .fxwords')?.innerText`), '|', await ev(`document.querySelector('#wfinspect .formula .field[data-arg="from"] .pill')?.innerText`));
  say('backend has', JSON.stringify((await api('/api/backend/admin/workflow-defs/when-watered')).json?.workflow?.steps?.find((x) => x.id === ret.id)?.params));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf004-formula.png'));
  // tested again: the number
  await press('#steps .testrow [data-act=test]');
  if (await ev(`!!document.querySelector('.surescrim [data-act=yes]')`)) await press('.surescrim [data-act=yes]');
  const before = (await api('/api/backend/admin/workflow-defs')).json.lastRuns['when-watered'].id;
  for (let i = 0; i < 60 && (await api('/api/backend/admin/workflow-defs')).json.lastRuns['when-watered'].id === before; i++) await wait(250);
  await wait(800);
  say('run line', await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`));
  const rec2 = (await api(`/api/backend/executions/${(await api('/api/backend/admin/workflow-defs')).json.lastRuns['when-watered'].id}`)).json;
  say('record', JSON.stringify({ meta: rec2.metadata, status: rec2.status, steps: rec2.steps.map((s) => [s.nodeId, s.status, s.nodeId === ret.id ? s.outputData : undefined]) }));
  say('expected days', Math.trunc((Date.now() - Date.parse('2026-10-28T09:00:00Z')) / 864e5));
  await press(`#steps .autoview .step[data-id="${ret.id}"] h3`);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .rundata .rdout')`)); i++) await wait(250);
  say('panel out', JSON.stringify(await ev(`document.querySelector('#wfinspect .rundata .rdout')?.innerText`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf004-tested.png'));
} catch (e) {
  say('ERROR', e.stack);
  say(log.slice(-2000));
} finally {
  try { b?.close?.(); } catch {}
  proc.kill();
  await wait(1500);
  // the backend Studio started is stopped with it; anything left on this backends dir is ours to stop
  const left = spawnSync('pgrep', ['-f', join(root, 'backends')], { encoding: 'utf8' }).stdout.trim();
  if (left) { say('stopping leftover backend', left); for (const pid of left.split('\n')) try { process.kill(Number(pid)); } catch {} }
}
