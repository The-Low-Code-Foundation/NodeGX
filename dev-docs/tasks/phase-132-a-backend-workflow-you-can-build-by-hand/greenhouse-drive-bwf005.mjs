// P132 BWF-005 AC3, in the Electron app on a copy of Greenhouse: "When a plant is watered" rebuilt with no function. Its
// *Mark the plant watered* (a call to the Mark watered cloud function) deleted from its panel, a *Change a record* added
// from the step menu in its place and set by clicks, no JSON typed: the table Plant, the record the Watering's plant
// (picked from the run), `lastWatered` the Watering's `at` (picked from the run). Tested on a Watering row watered on
// 28 October (BWF-002's sample, as greenhouse-drive.mjs picks it), the Plant row read back. Reads, it does not grade: it
// prints what it measured. Run with NODEGX_REPO set to the NodeGX
// checkout (Studio then runs the checkout's backend: `npm run build` in packages/nodegx-backend first, its dist/ is
// gitignored and goes stale). It drops ELECTRON_RUN_AS_NODE, which a shell under VS Code or Claude Code inherits and
// which starts Electron as plain Node (`app` undefined in main.cjs). The next task copies it and changes the middle.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// scratch output (the copy, its backend, the shots): NODEGX_DRIVE_DIR, else the OS temp dir
const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf005');
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
  // the sample: a real click on its button, a Watering row picked (kept; the test comes after the rebuild)
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
  const plantBefore = (await api(`/api/backend/classes/Plant/${plant.json?.objectId}`)).json;
  say('plant before', JSON.stringify({ lastWatered: plantBefore?.lastWatered ?? null }));
  const wfNow = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'when-watered');
  // 1. the function step deleted from its own panel
  await press('#steps .autoview .step[data-id="mark"] h3');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .head button.danger')`)); i++) await wait(250);
  await press('#wfinspect .head button.danger');
  for (let i = 0; i < 40 && wfNow().steps.some((x) => x.id === 'mark'); i++) await wait(250);
  say('after delete', JSON.stringify(wfNow().steps.map((x) => [x.id, x.kind, x.next])));
  // 2. a Change a record after the check, from the step menu
  await press('#steps .autoview .step[data-id="check"] h3');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect [data-act=addafter]')`)); i++) await wait(250);
  await press('#wfinspect [data-act=addafter]');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu .item[data-kind="update-record"]')`)); i++) await wait(250);
  say('menu: Records', JSON.stringify(await ev(`(() => { const h = [...document.querySelectorAll('.menu.actions .h')].find((x) => x.textContent === 'Records'); const out = []; for (let n = h?.nextElementSibling; n && !n.classList.contains('h'); n = n.nextElementSibling) out.push(n.innerText.replace(/\\s+/g, ' ')); return out; })()`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf005-menu.png'));
  await press('.menu .item[data-kind="update-record"]');
  const upd = () => wfNow().steps.find((x) => x.kind === 'update-record');
  for (let i = 0; i < 40 && !upd(); i++) await wait(250);
  if (!upd()) throw new Error(`no Change a record was added (${await ev(`document.getElementById('toast')?.textContent`)})`);
  say('added', JSON.stringify(upd()));
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect select[data-input=table]')`)); i++) await wait(250);
  // 3. the table: Plant (a <select>: its value set and changed, as a person's choice in the native list does)
  await ev(`(() => { const s = document.querySelector('#wfinspect select[data-input=table]'); s.value = 'Plant'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 40 && upd()?.params?.table !== 'Plant'; i++) await wait(250);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .recfields[data-table="Plant"]')`)); i++) await wait(250);
  say('fields offered', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .recfields .field.runvalue > label')].map((l) => l.textContent)`)));
  // 4. which record: its pill pressed, the Watering's plant picked from the menu
  const recordPill = `#wfinspect .field.runvalue:not(.recfields .field) .pill`;
  say('record now', await ev(`[...document.querySelectorAll('#wfinspect .field.runvalue')].find((f) => f.querySelector('label')?.textContent === 'Which record')?.querySelector('.rvpill')?.innerText`));
  await ev(`[...document.querySelectorAll('#wfinspect .field.runvalue')].find((f) => f.querySelector('label')?.textContent === 'Which record')?.querySelector('.pill')?.setAttribute('data-drive', 'record')`);
  await press('#wfinspect .pill[data-drive=record]');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu.picker .pickfield[data-path="body.plant"]')`)); i++) await wait(250);
  await press('.menu.picker .pickfield[data-path="body.plant"]');
  for (let i = 0; i < 40 && JSON.stringify(upd()?.params?.record) !== '{"$path":"body.plant"}'; i++) await wait(250);
  await wait(400);
  say('record picked', JSON.stringify(upd()?.params?.record), '|', await ev(`[...document.querySelectorAll('#wfinspect .field.runvalue')].find((f) => f.querySelector('label')?.textContent === 'Which record')?.querySelector('.rvpill')?.innerText`));
  // 5. lastWatered: From the run, the Watering's at
  await ev(`[...document.querySelectorAll('#wfinspect .recfields .field.runvalue')].find((f) => f.querySelector('label')?.textContent === 'lastWatered')?.querySelector('.rvmode')?.setAttribute('data-drive', 'lw')`);
  await ev(`(() => { const sel = document.querySelector('#wfinspect .rvmode[data-drive=lw]'); sel.value = 'from'; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu.picker .pickfield[data-path="body.at"]')`)); i++) await wait(250);
  await press('.menu.picker .pickfield[data-path="body.at"]');
  for (let i = 0; i < 40 && JSON.stringify(upd()?.params?.fields) !== '{"lastWatered":{"$path":"body.at"}}'; i++) await wait(250);
  await wait(400);
  say('fields picked', JSON.stringify(upd()?.params?.fields), '|', await ev(`[...document.querySelectorAll('#wfinspect .recfields .field.runvalue')].find((f) => f.querySelector('label')?.textContent === 'lastWatered')?.querySelector('.rvpill')?.innerText`));
  const stored = wfNow();
  say('the workflow now', JSON.stringify(stored.steps.map((x) => [x.id, x.kind, x.ref ?? null, x.params ?? null, x.next ?? null])));
  say('any function step', stored.steps.some((x) => x.kind === 'call-function'));
  say('backend has', JSON.stringify((await api('/api/backend/admin/workflow-defs/when-watered')).json?.workflow?.steps?.map((x) => [x.id, x.kind, x.params ?? null])));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf005-set.png'));
  // 6. tested on the sample: the Plant row read back
  const prior = (await api('/api/backend/admin/workflow-defs')).json.lastRuns?.['when-watered']?.id;
  await press('#steps .testrow [data-act=test]');
  say('warning', await ev(`document.querySelector('.surescrim')?.innerText`));
  if (await ev(`!!document.querySelector('.surescrim [data-act=yes]')`)) await press('.surescrim [data-act=yes]');
  for (let i = 0; i < 60 && (await api('/api/backend/admin/workflow-defs')).json.lastRuns?.['when-watered']?.id === prior; i++) await wait(250);
  await wait(800);
  say('run line', await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`));
  const rec = (await api(`/api/backend/executions/${(await api('/api/backend/admin/workflow-defs')).json.lastRuns['when-watered'].id}`)).json;
  say('record', JSON.stringify({ trigger: rec.triggerType, meta: rec.metadata, status: rec.status, steps: rec.steps.map((s) => [s.nodeId, s.status, s.error ?? null]) }));
  const plantAfter = (await api(`/api/backend/classes/Plant/${plant.json?.objectId}`)).json;
  say('plant after', JSON.stringify({ lastWatered: plantAfter?.lastWatered ?? null, name: plantAfter?.name }));
  await press(`#steps .autoview .step[data-id="${upd().id}"] h3`);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .rundata .rdout')`)); i++) await wait(250);
  say('panel', JSON.stringify(await ev(`document.querySelector('#wfinspect .rundata')?.innerText?.slice(0, 500)`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf005-tested.png'));
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
