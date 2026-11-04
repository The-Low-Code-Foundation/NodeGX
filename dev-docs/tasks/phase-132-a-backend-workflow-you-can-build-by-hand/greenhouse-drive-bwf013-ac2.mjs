// P132 BWF-013 AC2 (Build 3), in the Electron app on a copy of Greenhouse, by a person's presses (CDP mouse events, a
// shift-press as a press with the Shift modifier, typed text). TriggerTest (a Plant row starts it) is tested on a Plant,
// then two of its steps are made into a piece: a refused pair first (the transform and the branch: two ways out), its
// words read; then call-function-2 pressed and call-function shift-pressed, *Make a reusable piece*, "Check twice",
// *Make it*. Tested again: the run's answer compared with the first.
// (Built from greenhouse-drive-bwf013.mjs.)
//
// Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout (`npm run
// build` in packages/nodegx-backend first), outside the Bash sandbox.
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf013-ac2');
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
  const shiftPress = async (sel) => {
    const p = await at(sel); if (!p) throw new Error(`nothing at ${sel}`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, modifiers: 8 }); await wait(40);
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1, modifiers: 8 }); await wait(60);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1, modifiers: 8 }); await wait(400);
  };
  const T = 'triggertest', NEW = 'check-twice';
  const card = (id) => `#steps .autoview .step[data-id="${id}"] h3`;
  // what the run answered: its Return's recorded output (the record keeps no run-level output); `checked` must be a number,
  // or the comparison below would pass on two nothings
  const answer = async () => { const rec = (await api(`/api/backend/executions/${await lastRun(T)}`)).json; const end = rec?.steps?.find((s) => s.nodeId === 'first'); return { output: end?.outputData ?? null, input: end?.inputData?.previous ?? null }; };

  await ev(`document.querySelector('#rail [data-tab=backend]').click()`); // the rail is not the thing under test
  await until(`!!document.querySelector('.wfback .row[data-workflow="${T}"]')`);
  await wait(1000); // P132-PRESSLOSTINREDRAW
  await openRow(`.wfback .row[data-workflow="${T}"]`, `document.querySelector('#steps .autoview')?.dataset.workflow === '${T}' && !/Reading the sample/.test(document.querySelector('#steps .testrow')?.innerText)`);
  say('0 the hint', JSON.stringify(await ev(`document.querySelector('#steps .wfacts')?.innerText`)));
  // ---- 1. its test on a Plant, before
  await press('#steps .testrow [data-act=sample]');
  await until(`!!document.querySelector('.menu.sample [data-act=keepsample]')`);
  if (await ev(`!!document.querySelector('.menu.sample [data-row]')`)) await press('.menu.sample [data-row]');
  await press('.menu.sample [data-act=keepsample]');
  say('1 sample', await ev(`document.querySelector('#steps .testrow .samplewords')?.innerText`));
  const t1 = await test(T);
  const a1 = await answer();
  say('1 test before', JSON.stringify(t1));
  say('1 its answer', JSON.stringify(a1));

  // ---- 2. a pair that cannot be a piece: refused in words, the button off
  await shiftPress(card('transform'));
  await shiftPress(card('branch'));
  say('2 chosen', JSON.stringify(await ev(`[...document.querySelectorAll('#steps .autoview .step.grouped')].map((c) => c.dataset.id)`)), 'picked', await ev(`document.querySelector('#steps .autoview .step.picked')?.dataset.id ?? null`), 'text selected', JSON.stringify(await ev(`String(getSelection())`)));
  say('2 the bar', JSON.stringify(await ev(`document.querySelector('#steps [data-group]')?.innerText`)), 'Make disabled', await ev(`document.querySelector('#steps [data-act=makepiece]')?.disabled`));
  await press('#steps [data-act=cleargroup]');
  say('2 cleared', await ev(`document.querySelectorAll('#steps .step.grouped').length`), 'bar', await ev(`!!document.querySelector('#steps [data-group]')`));

  // ---- 3. call-function-2 pressed (its panel opens), call-function shift-pressed: both chosen
  await press(card('call-function-2'));
  await until(`!!document.querySelector('#wfinspect')`);
  await shiftPress(card('call-function'));
  say('3 chosen', JSON.stringify(await ev(`[...document.querySelectorAll('#steps .autoview .step.grouped')].map((c) => c.dataset.id)`)));
  say('3 the bar', JSON.stringify(await ev(`document.querySelector('#steps [data-group]')?.innerText`)), 'Make disabled', await ev(`document.querySelector('#steps [data-act=makepiece]')?.disabled`));
  await press('#steps [data-act=makepiece]');
  await until(`!!document.querySelector('.menu.makepiece input')`);
  say('3 the form before a name', JSON.stringify(await ev(`document.querySelector('.menu.makepiece')?.innerText`)));
  await typeOver('.menu.makepiece input', 'Check twice');
  say('3 the note', JSON.stringify(await ev(`document.querySelector('.menu.makepiece .note')?.textContent`)), 'Make it disabled', await ev(`document.querySelector('.menu.makepiece [data-act=makeit]')?.disabled`));
  await press('.menu.makepiece [data-act=makeit]');
  for (let i = 0; i < 40 && !(wfOf(NEW) && wfOf(T)?.steps?.some((s) => s.kind === 'run-workflow')); i++) await wait(250);
  await wait(800);
  say('3 toast', JSON.stringify(await ev(`document.getElementById('toast')?.textContent`)));
  say('3 the piece in the file', JSON.stringify(wfOf(NEW)), 'triggers on it', file().triggers.filter((t) => t.target?.name === NEW).length);
  say('3 TriggerTest in the file', JSON.stringify(wfOf(T)));
  say('3 the canvas', JSON.stringify(await ev(`[...document.querySelectorAll('#steps .autoview .step[data-id]')].map((c) => c.dataset.id + ':' + c.querySelector('h3')?.innerText.replace(/\\s+/g, ' '))`)), 'picked', await ev(`document.querySelector('#steps .autoview .step.picked')?.dataset.id ?? null`), 'grouped left', await ev(`document.querySelectorAll('#steps .step.grouped').length`));
  const defs = (await api('/api/backend/admin/workflow-defs')).json;
  const beOf = (id) => (defs?.workflows ?? defs?.definitions ?? []).find((w) => w.id === id);
  say('3 the backend has both', !!beOf(NEW), JSON.stringify(beOf(T)?.steps?.map((s) => s.id)));
  say('3 the piece\'s row', JSON.stringify(await ev(`document.querySelector('#piecelist .row[data-piece="${NEW}"]')?.innerText`)));

  // ---- 4. tested again: the same answer
  await elsewhere();
  const t2 = await test(T);
  const a2 = await answer();
  say('4 test after', JSON.stringify(t2));
  say('4 its answer', JSON.stringify(a2));
  say('4 THE SAME ANSWER', JSON.stringify(a1.output) === JSON.stringify(a2.output), 'a number in it', typeof a1.output?.value?.result?.checked === 'number', JSON.stringify(a1.output));
  // the piece's own run, from the step
  await press(card('run-workflow'));
  await until(`!!document.querySelector('#wfinspect [data-act=openpiecerun]')`);
  await press('#wfinspect [data-act=openpiecerun]');
  await until(`document.querySelector('#steps .autoview')?.dataset.workflow === '${NEW}'`);
  await wait(800);
  say('4 the piece\'s run', JSON.stringify(await ev(`document.querySelector('#steps .fnfacts')?.innerText?.slice(0, 400)`)), 'lit', JSON.stringify(await ev(`[...document.querySelectorAll('#steps .autoview .step.litok')].map((c) => c.dataset.id)`)));
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
