// P132 BWF-006 AC3, in the Electron app on a copy of Greenhouse: a *Call an API* step added to "When a plant is watered"
// from the step menu, its settings filled by *Paste a curl command* with a public weather API that takes no key
// (Open-Meteo's current temperature for Paris), tested on a Watering row (BWF-002's sample), and the answer read as a
// tree the next step can pick from (BWF-003). A real call over the internet: it needs the network. Reads, it does not
// grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout (`npm run build` in
// packages/nodegx-backend first). It drops ELECTRON_RUN_AS_NODE (see greenhouse-drive-bwf005.mjs).
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// scratch output (the copy, its backend, the shots): NODEGX_DRIVE_DIR, else the OS temp dir
const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf006');
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
  const wfNow = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).workflows.find((w) => w.id === 'when-watered');
  say('steps before', JSON.stringify(wfNow().steps.map((x) => [x.id, x.kind, x.next ?? null])));
  // 1. a Call an API after the check, from the step menu
  await press('#steps .autoview .step[data-id="check"] h3');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect [data-act=addafter]')`)); i++) await wait(250);
  await press('#wfinspect [data-act=addafter]');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('.menu .item[data-kind="http-request"]')`)); i++) await wait(250);
  say('menu: Integrations', JSON.stringify(await ev(`(() => { const h = [...document.querySelectorAll('.menu.actions .h')].find((x) => x.textContent === 'Integrations'); const out = []; for (let n = h?.nextElementSibling; n && !n.classList.contains('h'); n = n.nextElementSibling) out.push(n.innerText.replace(/\\s+/g, ' ')); return out; })()`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf006-menu.png'));
  await press('.menu .item[data-kind="http-request"]');
  const call = () => wfNow().steps.find((x) => x.kind === 'http-request');
  for (let i = 0; i < 40 && !call(); i++) await wait(250);
  if (!call()) throw new Error(`no Call an API was added (${await ev(`document.getElementById('toast')?.textContent`)})`);
  say('added', JSON.stringify(call()));
  // 2. Paste a curl command: the line from Open-Meteo's docs
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect [data-act=pastecurl]')`)); i++) await wait(250);
  say('panel before', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .props > .field > label, #wfinspect .props .sechead')].map((l) => l.textContent)`)));
  await press('#wfinspect [data-act=pastecurl]');
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect [data-input=curl]')`)); i++) await wait(250);
  await ev(`(() => { const t = document.querySelector('#wfinspect [data-input=curl]'); t.value = 'curl "https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m"'; })()`);
  await press('#wfinspect [data-act=fillcurl]');
  for (let i = 0; i < 40 && !/open-meteo/.test(call()?.params?.url ?? ''); i++) await wait(250);
  await wait(500);
  say('filled', JSON.stringify(call()?.params));
  say('panel after', JSON.stringify(await ev(`document.querySelector('#wfinspect .props')?.innerText?.slice(0, 900)`)));
  say('backend has', JSON.stringify((await api('/api/backend/admin/workflow-defs/when-watered')).json?.workflow?.steps?.map((x) => [x.id, x.kind, x.params ?? null])));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf006-filled.png'));
  // 3. tested on the sample
  const prior = (await api('/api/backend/admin/workflow-defs')).json.lastRuns?.['when-watered']?.id;
  await press('#steps .testrow [data-act=test]');
  say('warning', await ev(`document.querySelector('.surescrim')?.innerText`));
  if (await ev(`!!document.querySelector('.surescrim [data-act=yes]')`)) await press('.surescrim [data-act=yes]');
  for (let i = 0; i < 80 && (await api('/api/backend/admin/workflow-defs')).json.lastRuns?.['when-watered']?.id === prior; i++) await wait(250);
  await wait(800);
  say('run line', await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`));
  const rec = (await api(`/api/backend/executions/${(await api('/api/backend/admin/workflow-defs')).json.lastRuns['when-watered'].id}`)).json;
  say('record', JSON.stringify({ status: rec.status, steps: rec.steps.map((s) => [s.nodeId, s.status, s.error ?? null]) }));
  const out = rec.steps.find((s) => s.nodeId === call().id)?.outputData;
  say('the answer', JSON.stringify(out?.body?.current ?? out).slice(0, 300));
  // 4. the answer as a tree on the step, and as values the next step can pick
  await press(`#steps .autoview .step[data-id="${call().id}"] h3`);
  for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .rundata .rdout')`)); i++) await wait(250);
  say('tree line', await ev(`document.querySelector('#wfinspect .rdout li[data-path="body.current.temperature_2m"]')?.innerText`));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf006-tested.png'));
  const nextId = call().next?.[0];
  say('next step', nextId);
  if (nextId) {
    await press(`#steps .autoview .step[data-id="${nextId}"] h3`);
    const at = `upstream.${call().id}.body.current.temperature_2m`;
    for (let i = 0; i < 20 && !(await ev(`!!document.querySelector('#wfinspect .pickfield[data-path="${at}"]')`)); i++) await wait(250);
    say('next step can pick', await ev(`document.querySelector('#wfinspect .pickfield[data-path="${at}"]')?.closest('li, .readline, div')?.innerText?.slice(0, 200)`), '|', await ev(`!!document.querySelector('#wfinspect .pickfield[data-path="${at}"]')`));
    if (b.screenshot) await b.screenshot(join(S, 'gh-bwf006-next-reads.png'));
  }
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
