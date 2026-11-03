// P132 BWF-003 AC1, in the Electron app on a copy of Greenhouse: "When a plant is watered" tested on a picked Watering
// row (BWF-002's drive, greenhouse-drive.mjs, unchanged up to the test), then its function step's `plant` emptied and
// the Watering's `plant` dragged onto it from *What it can read*. Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX
// checkout (Studio then runs the checkout's backend: `npm run build` in packages/nodegx-backend first, its dist/ is
// gitignored and goes stale). It drops ELECTRON_RUN_AS_NODE, which a shell under VS Code or Claude Code inherits and
// which starts Electron as plain Node (`app` undefined in main.cjs). The next task copies it and changes the middle.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// scratch output (the copy, its backend, the shots): NODEGX_DRIVE_DIR, else the OS temp dir
const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf003');
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
  const watering = await api('/api/backend/classes/Watering', { method: 'POST', body: JSON.stringify({ plant: { __type: 'Pointer', className: 'Plant', objectId: plant.json?.objectId }, note: 'A good soak' }) });
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
  const at = async (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const press = async (sel) => { const p = await at(sel); if (!p) throw new Error(`nothing at ${sel}`); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(60); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400); };
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
  // P132 BWF-003: the function step after the test; what it can read, from the run
  await press('#steps .autoview .step[data-id="mark"] h3');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .reads .readsrc')`)); i++) await wait(250);
  say('mark reads', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .reads .readsrc')].map((x) => ({ root: x.dataset.root, from: x.dataset.from, head: x.querySelector('summary')?.innerText, lines: [...x.querySelectorAll('.vtree > li')].map((l) => l.innerText.replace(/\s+/g, ' ').slice(0, 60)).slice(0, 12) }))`)));
  const plantField = `[...document.querySelectorAll('#wfinspect .field.runvalue')].find((f) => f.querySelector('label')?.textContent === 'plant')`;
  say('plant before', await ev(`${plantField}?.querySelector('.rvctl')?.innerText`), JSON.stringify(JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'when-watered').steps[1].params));
  // emptied: Typed, nothing in it
  await ev(`(() => { const sel = ${plantField}.querySelector('.rvmode'); sel.value = 'typed'; sel.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await wait(1500);
  const markParams = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'when-watered').steps[1].params;
  say('plant emptied', JSON.stringify(markParams()), await ev(`${plantField}?.querySelector('.rvctl')?.innerText`));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf003-emptied.png'));
  // dragged: the Watering's plant onto it
  await ev(`(() => { const dt = new DataTransfer(); const from = document.querySelector('#wfinspect .reads .pickfield[data-path="body.plant"]'); const to = ${plantField}; from.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })); to.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })); to.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })); })()`);
  for (let i = 0; i < 40 && JSON.stringify(markParams().plant) !== '{"$path":"body.plant"}'; i++) await wait(250);
  await wait(500);
  say('plant dragged', JSON.stringify(markParams()), '|', await ev(`${plantField}?.querySelector('.pill')?.innerText`));
  const def = (await api('/api/backend/admin/workflow-defs/when-watered')).json;
  say('backend has', JSON.stringify(def?.workflow?.steps?.[1]?.params ?? def));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf003-dragged.png'));
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
