// P132 BWF-013 AC1, in the Electron app on a copy of Greenhouse, by a person's presses (CDP mouse events and typed
// text; a native <select> is set by value, as every drive here does). *New* under Reusable pieces makes *Find thirsty
// plants*: it runs Check thirst and answers "Checked <how many> plants for <who>", <who> what its runner sends.
// *The morning check* (a time starts it) runs it from *Add a step at the start*; *When a plant is watered* (a Watering
// row starts it) runs it from *Add a step after* its last step. Each sends its own `who`, typed after *Add a value*.
// Both tested from their test rows. Then *Open that run* on the morning check's step, Back, the piece's row and first
// card, and a ring shown, not offered, inside the piece.
// (Built from greenhouse-drive-bwf012.mjs.)
//
// Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout (`npm run
// build` in packages/nodegx-backend first), outside the Bash sandbox.
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf013');
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
  say('deploy', JSON.stringify((await api('/api/functions/deploy', { method: 'POST' })).json).slice(0, 200));
  say('pieces served', (await api('/api/backend/admin/workflow-step-kinds')).json?.pieces);
  const plant = await api('/api/backend/classes/Plant', { method: 'POST', body: JSON.stringify({ name: 'Monstera', room: 'Living room', waterEvery: 7 }) });
  const watering = await api('/api/backend/classes/Watering', { method: 'POST', body: JSON.stringify({ plant: { __type: 'Pointer', className: 'Plant', objectId: plant.json?.objectId }, note: 'A good soak', at: { __type: 'Date', iso: '2026-10-28T09:00:00.000Z' } }) });
  say('rows', plant.status, watering.status);
  await wait(1500);

  // ---- the person's hands
  const at = async (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const pressAt = async (p) => { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y }); await wait(40); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 }); await wait(60); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400); };
  const press = async (sel) => { const p = await at(sel); if (!p) throw new Error(`nothing at ${sel} (toast: ${await ev(`document.getElementById('toast')?.textContent`)})`); await pressAt(p); };
  const until = async (js, n = 40) => { for (let i = 0; i < n && !(await ev(js)); i++) await wait(250); return ev(js); };
  // pressed into, everything in it selected (as a person's triple-click or select-all would), then typed
  const typeOver = async (sel, text) => {
    await press(sel);
    await ev(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); if (t.select) t.select(); else { const r = document.createRange(); r.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } })()`);
    await b.send('Input.insertText', { text }); await wait(300);
  };
  const mark = (labelText, as) => ev(`(() => { const f = [...document.querySelectorAll('#wfinspect .field')].find((x) => x.querySelector(':scope > label')?.textContent === ${JSON.stringify(labelText)}); if (f) f.setAttribute('data-drive', ${JSON.stringify(as)}); return !!f; })()`);
  const file = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8'));
  const wfOf = (id) => file().workflows.find((w) => w.id === id);
  const openRow = async (sel, ready) => {
    await ev(`(() => { window.__evs = []; const t0 = performance.now(); for (const k of ['pointerdown', 'mousedown', 'mouseup', 'click', 'focusout']) document.addEventListener(k, (e) => window.__evs.push([k, Math.round(performance.now() - t0), e.target?.className || e.target?.tagName, e.target?.isConnected, e.target?.closest?.('.row')?.dataset?.workflow ?? e.target?.closest?.('.row')?.dataset?.apicall ?? null]), true); window.__rows = 0; new MutationObserver((ms) => { for (const m of ms) for (const n of m.removedNodes) if (n.classList?.contains('row') || n.querySelector?.('.row')) window.__rows++; }).observe(document.getElementById('autolist'), { childList: true, subtree: true }); })()`);
    const p = await at(sel);
    await press(sel);
    const ok = await until(ready, 80);
    say(`(row ${sel}: ${ok ? 'opened' : 'NOT opened'}; events ${JSON.stringify(await ev('window.__evs'))}; list rows redrawn ${await ev('window.__rows')})`);
    if (!ok) {
      say(`(${sel} pressed at ${JSON.stringify(p)}: not ready; under the press ${await ev(`document.elementFromPoint(${p?.x}, ${p?.y})?.outerHTML?.slice(0, 160)`)}; row selected ${await ev(`document.querySelector(${JSON.stringify(sel)})?.getAttribute('aria-selected')`)}; steps ${JSON.stringify(await ev(`document.getElementById('steps')?.innerText?.slice(0, 300)`))}; testrow ${JSON.stringify(await ev(`document.querySelector('#steps .testrow')?.innerText`))})`);
      say('(the same row by .click(), to tell the press from the open)'); await ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
      say('(after .click():', await until(ready, 80), JSON.stringify(await ev(`document.getElementById('steps')?.innerText?.slice(0, 300)`)), ')');
    }
  };
  const lastRun = async (id) => (await api('/api/backend/admin/workflow-defs')).json?.lastRuns?.[id]?.id;
  const test = async (id) => {
    const prior = await lastRun(id);
    await until(`!document.querySelector('#steps .testrow [data-act=test]')?.disabled`, 60);
    await press('#steps .testrow [data-act=test]'); await wait(400);
    const warning = await ev(`document.querySelector('.surescrim')?.innerText`);
    if (await ev(`!!document.querySelector('.surescrim [data-act=yes]')`)) await press('.surescrim [data-act=yes]');
    for (let i = 0; i < 80 && (await lastRun(id)) === prior; i++) await wait(250);
    await wait(600);
    const rec = (await api(`/api/backend/executions/${await lastRun(id)}`)).json;
    return { warning: warning?.replace(/\s+/g, ' ').slice(0, 160), status: rec?.status, steps: rec?.steps?.map((s) => [s.nodeId, s.status, s.error ?? null]), runLine: await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`) };
  };

  const choose = (sel, value) => ev(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); if (!s) return false; s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  // pressed where a person continues a sentence: near the box's right end (its middle may be a value's chip, whose
  // press opens the chip's own menu: s17's first run lost its second value that way)
  const typeIn = async (sel, text, { clear = false } = {}) => {
    const r = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const b = el.getBoundingClientRect(); return { x: b.right - 6, y: b.top + b.height / 2 }; })()`);
    if (!r) throw new Error(`nothing to type in at ${sel}`);
    await pressAt(r);
    say(`(typing into ${sel}: under the press ${await ev(`document.elementFromPoint(${r.x}, ${r.y})?.className`)}; a menu open: ${await ev(`!!document.querySelector('.menu')`)})`);
    await ev(`(() => { const c = document.querySelector(${JSON.stringify(sel)}); const r = document.createRange(); r.selectNodeContents(c); if (!${clear}) r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
    await b.send('Input.insertText', { text }); await wait(300);
  };
  const P = 'find-thirsty-plants';
  const runStep = (id) => wfOf(id)?.steps?.find((s) => s.kind === 'run-workflow');
  const elsewhere = async () => { await press('#steps .autoview .event-card h2'); await wait(300); };

  await ev(`document.querySelector('#rail [data-tab=backend]').click()`); // the rail is not the thing under test
  await until(`!!document.querySelector('.wfback .row[data-workflow="when-watered"]')`);
  await wait(1000); // P132-PRESSLOSTINREDRAW: the list redraws in the first ~80 ms
  say('0 the list: Workflows', JSON.stringify(await ev(`[...document.querySelectorAll('#autolist .row')].map((r) => r.dataset.workflow ?? r.dataset.trigger)`)));
  say('0 the list: Reusable pieces', JSON.stringify(await ev(`document.querySelector('#fnsec')?.textContent + ' | ' + document.querySelector('#fnsub')?.textContent + ' | ' + document.querySelector('#piecelist')?.innerText.replace(/\s+/g, ' ') + ' | ' + document.querySelector('#fnlist')?.innerText.replace(/\s+/g, ' ')`)));

  // ---- 1. New, under Reusable pieces
  await press('#newpiece');
  await until(`!!document.querySelector('.menu.newpiece input')`);
  say('1 New asks', JSON.stringify(await ev(`[...document.querySelectorAll('.menu.newpiece label')].map((l) => l.textContent)`)), 'first step', await ev(`document.querySelector('.menu.newpiece select')?.value`));
  await typeOver('.menu.newpiece input', 'Find thirsty plants');
  say('1 note', await ev(`document.querySelector('.menu.newpiece .note')?.textContent`));
  await press('.menu.newpiece .foot button.primary');
  for (let i = 0; i < 40 && !wfOf(P); i++) await wait(250);
  say('1 made', JSON.stringify(wfOf(P)), 'triggers on it', file().triggers.filter((t) => t.target?.name === P).length);
  await until(`document.querySelector('#steps .autoview')?.dataset.workflow === '${P}'`);
  say('1 its first card', JSON.stringify(await ev(`document.querySelector('#steps .autoview .step[data-id="starts"]')?.innerText`)));
  say('1 its row', JSON.stringify(await ev(`document.querySelector('#piecelist .row[data-piece="${P}"]')?.innerText`)), 'in Workflows?', await ev(`!!document.querySelector('#autolist .row[data-workflow="${P}"]')`));
  // its end: a Return after Check thirst
  await press('#steps .autoview .step[data-id="first"] h3');
  await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
  await press('#wfinspect [data-act=addafter]');
  await until(`!!document.querySelector('.menu .item[data-kind="return"]')`);
  await press('.menu .item[data-kind="return"]');
  const endOf = () => wfOf(P)?.steps?.find((s) => s.kind === 'return');
  for (let i = 0; i < 40 && !endOf(); i++) await wait(250);
  say('1 a Return added', JSON.stringify(endOf()));

  // ---- 2. The morning check runs it: Add a step at the start
  await openRow('.wfback .row[data-workflow="morning-check"]', `document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check'`);
  await press('#steps [data-act=addfirst]');
  await until(`!!document.querySelector('.menu .item[data-kind="run-workflow"]')`);
  say('2 the menu item', JSON.stringify(await ev(`document.querySelector('.menu .item[data-kind="run-workflow"]')?.innerText`)));
  await press('.menu .item[data-kind="run-workflow"]');
  for (let i = 0; i < 40 && !runStep('morning-check'); i++) await wait(250);
  say('2 added', JSON.stringify(runStep('morning-check')), 'entry', wfOf('morning-check')?.entry);
  await until(`!!document.querySelector('#wfinspect select[data-input=piece]')`);
  say('2 the piece picker', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect select[data-input=piece] optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.textContent + (o.disabled ? ' (disabled)' : ''))])`)));
  if (runStep('morning-check')?.params?.workflow !== P) { await choose('#wfinspect select[data-input=piece]', P); for (let i = 0; i < 40 && runStep('morning-check')?.params?.workflow !== P; i++) await wait(250); }
  say('2 runs', runStep('morning-check')?.params?.workflow);
  await until(`!!document.querySelector('#wfinspect [data-act=addsend]')`);
  say('2 what it sends, before', JSON.stringify(await ev(`document.querySelector('#wfinspect [data-pieceasks]')?.parentElement?.innerText.split('What it sends the piece')[1]?.slice(0, 200)`)));
  await press('#wfinspect [data-act=addsend]');
  await until(`!!document.querySelector('.menu.ask [data-input=askname]')`);
  await b.send('Input.insertText', { text: 'who' }); await wait(200);
  await press('.menu.ask [data-act=create]');
  for (let i = 0; i < 40 && !('who' in (runStep('morning-check')?.params?.send ?? {})); i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect .field.runvalue .vcompose')`);
  await mark('who', 'who');
  await typeIn('#wfinspect [data-drive=who] .vcompose', 'the morning check', { clear: true });
  await elsewhere();
  for (let i = 0; i < 40 && runStep('morning-check')?.params?.send?.who !== 'the morning check'; i++) await wait(250);
  say('2 in the file', JSON.stringify(runStep('morning-check')?.params));
  say('2 on the backend', JSON.stringify((await api('/api/backend/admin/workflow-defs/morning-check')).json?.workflow?.steps?.find((s) => s.kind === 'run-workflow')?.params));
  say('2 its card', JSON.stringify(await ev(`document.querySelector('#steps .autoview .step[data-kind="run-workflow"]')?.innerText`)));

  // ---- 3. When a plant is watered runs it: Add a step after its last step
  await openRow('.wfback .row[data-workflow="when-watered"]', `document.querySelector('#steps .autoview')?.dataset.workflow === 'when-watered'`);
  await press('#steps .autoview .step[data-id="mark"] h3');
  await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
  await press('#wfinspect [data-act=addafter]');
  await until(`!!document.querySelector('.menu .item[data-kind="run-workflow"]')`);
  await press('.menu .item[data-kind="run-workflow"]');
  for (let i = 0; i < 40 && !runStep('when-watered'); i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect select[data-input=piece]')`);
  if (runStep('when-watered')?.params?.workflow !== P) { await choose('#wfinspect select[data-input=piece]', P); for (let i = 0; i < 40 && runStep('when-watered')?.params?.workflow !== P; i++) await wait(250); }
  await until(`!!document.querySelector('#wfinspect [data-act=addsend]')`);
  await press('#wfinspect [data-act=addsend]');
  await until(`!!document.querySelector('.menu.ask [data-input=askname]')`);
  await b.send('Input.insertText', { text: 'who' }); await wait(200);
  await press('.menu.ask [data-act=create]');
  for (let i = 0; i < 40 && !('who' in (runStep('when-watered')?.params?.send ?? {})); i++) await wait(250);
  await until(`!!document.querySelector('#wfinspect .field.runvalue .vcompose')`);
  await mark('who', 'who');
  await typeIn('#wfinspect [data-drive=who] .vcompose', 'watering', { clear: true });
  await elsewhere();
  for (let i = 0; i < 40 && runStep('when-watered')?.params?.send?.who !== 'watering'; i++) await wait(250);
  say('3 in the file', JSON.stringify(runStep('when-watered')), 'mark.next', JSON.stringify(wfOf('when-watered')?.steps?.find((s) => s.id === 'mark')?.next));

  // ---- 4. The piece's answer, composed: "Checked " + how many it checked + " plants for " + who
  await openRow(`#piecelist .row[data-piece="${P}"]`, `document.querySelector('#steps .autoview')?.dataset.workflow === '${P}'`);
  say('4 the piece row', JSON.stringify(await ev(`document.querySelector('#piecelist .row[data-piece="${P}"]')?.innerText`)));
  say('4 its first card', JSON.stringify(await ev(`document.querySelector('#steps .autoview .step[data-id="starts"]')?.innerText`)));
  const endId = endOf()?.id;
  await press(`#steps .autoview .step[data-id="${endId}"] h3`);
  await until(`!!document.querySelector('#wfinspect .field.runvalue')`);
  say('4 what the end can read', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .reads .pickfield')].map((x) => x.dataset.path)`)));
  say('4 the Return\'s settings', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .field.runvalue > label')].map((l) => l.textContent)`)));
  // what the page sends and redraws while the answer is composed (a lost second value, s17's first run)
  await ev(`(() => { window.__log = []; const t0 = performance.now(); const T = () => Math.round(performance.now() - t0);
    const f0 = window.fetch; window.fetch = (u, o) => { if (String(u).includes('/api/automations/workflow') && o?.body) { try { const j = JSON.parse(o.body); window.__log.push([T(), 'save', JSON.stringify(j.workflow?.steps?.find((s) => s.kind === 'return')?.params?.value ?? null)]); } catch {} } return f0(u, o); };
    new MutationObserver((ms) => { if (ms.some((m) => [...m.addedNodes].some((x) => x.classList?.contains('props') || x.querySelector?.('.vcompose')))) window.__log.push([T(), 'panel redrawn']); }).observe(document.getElementById('wfinspect'), { childList: true, subtree: true });
    for (const k of ['focusin', 'focusout']) document.addEventListener(k, (e) => window.__log.push([T(), k, (e.target.className || e.target.tagName) + '', e.relatedTarget ? (e.relatedTarget.className || e.relatedTarget.tagName) + '' : null]), true);
    for (const k of ['mousedown', 'click']) document.addEventListener(k, (e) => window.__log.push([T(), k, (e.target.className || e.target.tagName) + '']), true);
  })()`);
  await mark('Value', 'value');
  await typeIn('#wfinspect [data-drive=value] .vcompose', 'Checked ', { clear: true });
  await press('#wfinspect [data-drive=value] [data-act=addvalue]');
  await until(`!!document.querySelector('.menu.picker .pickfield[data-path="upstream.first.result.checked"]')`);
  say('4 the picker offers', JSON.stringify(await ev(`[...document.querySelectorAll('.menu.picker .pickfield')].map((x) => x.dataset.path)`)));
  await press('.menu.picker .pickfield[data-path="upstream.first.result.checked"]');
  for (let i = 0; i < 40 && endOf()?.params?.value?.$fn !== 'text'; i++) await wait(250);
  await mark('Value', 'value');
  await typeIn('#wfinspect [data-drive=value] .vcompose', ' plants for ');
  await press('#wfinspect [data-drive=value] [data-act=addvalue]');
  await until(`!!document.querySelector('.menu.picker .pickfield[data-path="body.who"]')`);
  await press('.menu.picker .pickfield[data-path="body.who"]');
  for (let i = 0; i < 40 && endOf()?.params?.value?.args?.length !== 4; i++) await wait(250);
  say('4 the answer in the file', JSON.stringify(endOf()?.params?.value));
  await mark('Value', 'value');
  say('4 the composer reads', JSON.stringify(await ev(`document.querySelector('#wfinspect [data-drive=value] .vcompose')?.innerText`)));
  say('4 log', JSON.stringify(await ev('window.__log')));
  if (process.env.STOP_AFTER === '4') throw new Error('stopped after 4 (STOP_AFTER)');

  // ---- 5. both tested, from their test rows
  const outOf = async (id) => { const rec = (await api(`/api/backend/executions/${await lastRun(id)}`)).json; const s = rec?.steps?.find((x) => x.nodeId === runStep(id)?.id); return { status: rec?.status, output: s?.outputData ?? null, error: s?.error ?? null }; };
  for (const id of ['morning-check', 'when-watered']) {
    await openRow(`.wfback .row[data-workflow="${id}"]`, `document.querySelector('#steps .autoview')?.dataset.workflow === '${id}' && !/Reading the sample/.test(document.querySelector('#steps .testrow')?.innerText)`);
    await press('#steps .testrow [data-act=sample]');
    await until(`!!document.querySelector('.menu.sample [data-act=keepsample]')`);
    if (await ev(`!!document.querySelector('.menu.sample [data-row]')`)) await press('.menu.sample [data-row]');
    await press('.menu.sample [data-act=keepsample]');
    say(`5 ${id} sample`, await ev(`document.querySelector('#steps .testrow .samplewords')?.innerText`));
    say(`5 ${id} test`, JSON.stringify(await test(id)));
    say(`5 ${id} the piece's step`, JSON.stringify(await outOf(id)));
  }

  // ---- 6. Open that run, from the morning check's step, and Back
  await openRow('.wfback .row[data-workflow="morning-check"]', `document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check' && /Last run|Tested|run/.test(document.querySelector('#steps .fnfacts .run')?.innerText ?? '')`);
  const mrun = runStep('morning-check')?.id;
  await press(`#steps .autoview .step[data-id="${mrun}"] h3`);
  await until(`!!document.querySelector('#wfinspect [data-act=openpiecerun]')`);
  say('6 the step\'s run, in its panel', JSON.stringify(await ev(`document.querySelector('#wfinspect .rundata')?.innerText`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf013-runner.png'));
  await press('#wfinspect [data-act=openpiecerun]');
  await until(`document.querySelector('#steps .autoview')?.dataset.workflow === '${P}' && !!document.querySelector('#steps .autoview .step.litok')`);
  say('6 opened', await ev(`document.querySelector('#steps .autoview')?.dataset.workflow`), 'lit', JSON.stringify(await ev(`[...document.querySelectorAll('#steps .autoview .step[data-id]')].map((c) => [c.dataset.id, c.classList.contains('litok') ? 'ran' : c.classList.contains('litfail') ? 'failed' : c.classList.contains('litnot') ? 'not reached' : '-'])`)));
  say('6 it says', JSON.stringify(await ev(`document.querySelector('#steps .pieceparent')?.innerText`)), 'run line', JSON.stringify(await ev(`document.querySelector('#steps .fnfacts .run')?.innerText`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf013-piece-run.png'));
  await press('#steps [data-act=backtorunner]');
  await until(`document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check'`);
  say('6 Back', await ev(`document.querySelector('#steps .autoview')?.dataset.workflow`), 'picked', await ev(`document.querySelector('#steps .autoview .step.picked')?.dataset.id`), 'panel open', await ev(`!!document.querySelector('#wfinspect [data-act=openpiecerun]')`));

  // ---- 7. A ring, shown and not offered: a Run a workflow added at the piece's start, its picker read, then deleted
  await openRow(`#piecelist .row[data-piece="${P}"]`, `document.querySelector('#steps .autoview')?.dataset.workflow === '${P}'`);
  const before = JSON.stringify(wfOf(P));
  await press('#steps [data-act=addfirst]');
  await until(`!!document.querySelector('.menu .item[data-kind="run-workflow"]')`);
  await press('.menu .item[data-kind="run-workflow"]');
  for (let i = 0; i < 40 && !runStep(P); i++) await wait(250);
  say('7 added inside the piece, running', runStep(P)?.params?.workflow);
  await until(`!!document.querySelector('#wfinspect select[data-input=piece]')`);
  say('7 its picker', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect select[data-input=piece] option')].map((o) => o.textContent + (o.disabled ? ' [not offered]' : ''))`)));
  await press('#wfinspect .head button.danger');
  for (let i = 0; i < 40 && runStep(P); i++) await wait(250);
  say('7 deleted; the piece as before', JSON.stringify(wfOf(P)) === before);
  say('problems', JSON.stringify(b.problems?.slice(-5) ?? null));
} catch (e) {
  say('ERROR', e.stack);
  say(log.slice(-2000));
} finally {
  try { b?.close?.(); } catch {}
  proc.kill();
  await wait(1500);
  const left = spawnSync('pgrep', ['-f', join(root, 'backends')], { encoding: 'utf8' }).stdout.trim();
  if (left) { say('stopping leftover backend', left); for (const pid of left.split('\n')) try { process.kill(Number(pid)); } catch {} }
}
