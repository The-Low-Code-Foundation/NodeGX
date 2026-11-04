// P132 BWF-012 AC1 + AC2, in the Electron app on a copy of Greenhouse, by a person's presses (CDP mouse events and
// typed text, no `.click()` on the product's controls). *When watered* gets a Call an API from the step menu, filled by
// *Paste a curl command* (a weather API this script runs on 127.0.0.1, its key asked a Secret's name), then *Save this
// call* with the city ticked. *The morning check* (a schedule starts it: the other way in) picks the saved call by name
// from the step menu and has only its city typed, "Lyon". Both tested from their test rows. Then the saved call opened
// from the list, its Address changed in its own panel, and both tested again: each calls the new address, neither
// workflow's definition changed. The key is looked for in every file.
// (Built from greenhouse-drive-bwf006.mjs and -bwf011.mjs.)
//
// Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout (`npm run
// build` in packages/nodegx-backend first), outside the Bash sandbox. NODEGX_ALLOW_PRIVATE_HTTP=1 is set here so the
// backend may call 127.0.0.1.
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf012');
const studio = '/Users/richardosborne/vscode_projects/nodegx-studio';
const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
const root = join(S, 'gh'), gh = join(root, 'Greenhouse');
process.env.NODEGX_BACKENDS_DIR = join(root, 'backends');
process.env.NODEGX_ALLOW_PRIVATE_HTTP = '1';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(...a);

// the weather API: every call kept (path, city, the key it was sent)
const KEY = 'wx-electron-5d81c0b7a2';
const seen = [];
const weather = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  seen.push({ path: u.pathname, city: u.searchParams.get('city'), auth: req.headers.authorization ?? null });
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ current: { temperature_2m: u.pathname.startsWith('/v2') ? 14 : 12.5 } }));
});
await new Promise((r) => weather.listen(0, '127.0.0.1', r));
const apiUrl = `http://127.0.0.1:${weather.address().port}`;
say('weather API on', apiUrl);

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
  say('saved calls served', (await api('/api/backend/admin/workflow-step-kinds')).json?.savedCalls);
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

  await ev(`document.querySelector('#rail [data-tab=backend]').click()`); // the rail is not the thing under test
  await until(`!!document.querySelector('#autolist .row[data-workflow="when-watered"]')`);
  // 🔴 the list is redrawn three times in the first ~80 ms after the tab opens; a press straddling a redraw gets its
  // mousedown and mouseup but no click (the row it went down on is gone), so nothing opens (P132-PRESSLOSTINREDRAW,
  // runs 1, 2 and 5 of s16). A person cannot press that soon: wait as they would.
  await wait(1000);

  // ---- 1. When watered: a Call an API, filled from a curl line, its key a Secret
  await openRow('#autolist .row[data-workflow="when-watered"]', `!!document.querySelector('#steps .testrow [data-act=sample]:not([disabled])') && !/Reading the sample/.test(document.querySelector('#steps .testrow')?.innerText)`);
  await press('#steps .testrow [data-act=sample]');
  await until(`!!document.querySelector('.menu.sample [data-row]')`);
  await press('.menu.sample [data-row]');
  await press('.menu.sample [data-act=keepsample]');
  say('A sample', await ev(`document.querySelector('#steps .testrow .samplewords')?.innerText`));
  await press('#steps .autoview .step[data-id="check"] h3');
  await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
  await press('#wfinspect [data-act=addafter]');
  await until(`!!document.querySelector('.menu .item[data-kind="http-request"]')`);
  await press('.menu .item[data-kind="http-request"]');
  const callA = () => wfOf('when-watered').steps.find((x) => x.kind === 'http-request');
  for (let i = 0; i < 40 && !callA(); i++) await wait(250);
  if (!callA()) throw new Error(`no Call an API was added (${await ev(`document.getElementById('toast')?.textContent`)})`);
  const aId = callA().id;
  if (!(await ev(`!!document.querySelector('#wfinspect [data-act=pastecurl]')`))) await press(`#steps .autoview .step[data-id="${aId}"] h3`);
  await until(`!!document.querySelector('#wfinspect [data-act=pastecurl]')`);
  await press('#wfinspect [data-act=pastecurl]');
  await until(`!!document.querySelector('#wfinspect [data-input=curl]')`);
  await typeOver('#wfinspect [data-input=curl]', `curl -s "${apiUrl}/forecast?city=Paris&units=metric" \\\n  -H 'Authorization: Bearer ${KEY}'`);
  await press('#wfinspect [data-act=fillcurl]');
  await until(`!!document.querySelector('#wfinspect .addsecret [data-input=secretname]')`);
  say('the key asked a name', JSON.stringify(await ev(`({ name: document.querySelector('#wfinspect .addsecret [data-input=secretname]')?.value, hidden: document.querySelector('#wfinspect .addsecret [data-input=secretvalue]')?.type })`)));
  await typeOver('#wfinspect .addsecret [data-input=secretname]', 'WEATHER_KEY');
  await press('#wfinspect [data-act=savesecret]');
  for (let i = 0; i < 40 && callA()?.params?.authSecret !== 'WEATHER_KEY'; i++) await wait(250);
  say('A filled', JSON.stringify(callA()?.params));

  // ---- 2. Save this call, the city ticked by a press
  if (!(await ev(`!!document.querySelector('#wfinspect [data-act=savecall]')`))) await press(`#steps .autoview .step[data-id="${aId}"] h3`);
  await until(`!!document.querySelector('#wfinspect [data-act=savecall]')`);
  await press('#wfinspect [data-act=savecall]');
  await until(`!!document.querySelector('#wfinspect .savecallbox')`);
  say('the box offers', JSON.stringify(await ev(`[...document.querySelectorAll('#wfinspect .savecallbox .partpick')].map((l) => [l.dataset.part, l.querySelector('input').checked, l.innerText.trim()])`)));
  say('focus in the box', await ev(`document.activeElement?.dataset?.input ?? document.activeElement?.tagName`));
  await press('#wfinspect .savecallbox [data-part="query.city"]');
  say('city ticked', await ev(`document.querySelector('#wfinspect .savecallbox [data-part="query.city"] input')?.checked`));
  await typeOver('#wfinspect [data-input=callname]', 'The weather');
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf012-savebox.png'));
  await press('#wfinspect [data-act=savecallgo]');
  for (let i = 0; i < 40 && callA()?.params?.call !== 'the-weather'; i++) await wait(250);
  await wait(500);
  say('toast', await ev(`document.getElementById('toast')?.textContent`));
  say('A step now', JSON.stringify(callA()?.params));
  say('saved in the file', JSON.stringify(file().apiCalls));
  say('saved on the backend', JSON.stringify((await api('/api/backend/admin/api-calls')).json?.calls?.map((c) => ({ id: c.id, usedBy: c.usedBy }))));
  say('list row', await ev(`document.querySelector('#autolist .row[data-apicall="the-weather"]')?.innerText?.replace(/\\s+/g, ' ')`));
  say('focus after the save', await ev(`document.activeElement?.outerHTML?.slice(0, 100)`));

  // ---- 3. tested
  say('A test 1', JSON.stringify(await test('when-watered')));
  say('API saw', JSON.stringify(seen));

  // ---- 4. The morning check picks it by name, and only its city is typed
  await openRow('#autolist .row[data-workflow="morning-check"]', `document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check' && !!document.querySelector('#steps .testrow [data-act=sample]:not([disabled])') && !/Reading the sample/.test(document.querySelector('#steps .testrow')?.innerText)`);
  await press('#steps .testrow [data-act=sample]');
  await until(`!!document.querySelector('.menu.sample [data-act=keepsample]')`);
  await press('.menu.sample [data-act=keepsample]');
  await press('#steps .autoview .step[data-id="check"] h3');
  await until(`!!document.querySelector('#wfinspect [data-act=addafter]')`);
  await press('#wfinspect [data-act=addafter]');
  await until(`!!document.querySelector('.menu .item[data-call="the-weather"]')`);
  say('menu: Integrations', JSON.stringify(await ev(`(() => { const h = [...document.querySelectorAll('.menu.actions .h')].find((x) => x.textContent === 'Integrations'); const out = []; for (let n = h?.nextElementSibling; n && !n.classList.contains('h'); n = n.nextElementSibling) out.push(n.innerText.replace(/\\s+/g, ' ')); return out; })()`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf012-menu.png'));
  await press('.menu .item[data-call="the-weather"]');
  const callB = () => wfOf('morning-check').steps.find((x) => x.params?.call === 'the-weather');
  for (let i = 0; i < 40 && !callB(); i++) await wait(250);
  if (!callB()) throw new Error(`the saved call was not added (${await ev(`document.getElementById('toast')?.textContent`)})`);
  say('B added', JSON.stringify(callB()));
  const bId = callB().id;
  if (!(await mark('city', 'city'))) await press(`#steps .autoview .step[data-id="${bId}"] h3`);
  await until(`!!document.querySelector('#wfinspect .savedcall')`);
  await mark('city', 'city');
  say('B panel', JSON.stringify(await ev(`document.querySelector('#wfinspect')?.innerText?.slice(0, 500)`)));
  await typeOver('#wfinspect [data-drive=city] .vcompose', 'Lyon');
  await press('#steps .autoview .step[data-id="check"] h3'); await wait(300); // pressed elsewhere: the box is left
  for (let i = 0; i < 40 && callB()?.params?.fill?.city !== 'Lyon'; i++) await wait(250);
  say('B step now', JSON.stringify(callB()?.params));
  say('list row', await ev(`document.querySelector('#autolist .row[data-apicall="the-weather"]')?.innerText?.replace(/\\s+/g, ' ')`));
  say('B test 1', JSON.stringify(await test('morning-check')));
  say('API saw', JSON.stringify(seen));

  // ---- 5. AC2: the saved call opened from the list, its address changed there
  const before = JSON.stringify(['when-watered', 'morning-check'].map(wfOf));
  const defsBefore = JSON.stringify((await api('/api/backend/admin/workflow-defs')).json?.workflows?.filter((w) => ['when-watered', 'morning-check'].includes(w.id)).map((w) => [w.id, w.updatedAt]));
  await openRow('#autolist .row[data-apicall="the-weather"]', `document.querySelector('#steps .autoview')?.dataset.apicall === 'the-weather'`);
  say('saved call canvas', JSON.stringify(await ev(`document.querySelector('#steps .autoview')?.innerText?.replace(/\\s+/g, ' ')`)));
  say('delete off', await ev(`document.querySelector('#steps [data-act=delcall]')?.disabled`));
  await until(`!!document.querySelector('#wfinspect .field.runvalue')`);
  await mark('Address', 'address');
  say('Address reads', JSON.stringify(await ev(`document.querySelector('#wfinspect [data-drive=address] .vcompose')?.innerText`)));
  say('the city in its settings reads', JSON.stringify(await ev(`document.querySelector('#wfinspect .vcompose .pill[data-path="fill.city"]')?.innerText`)));
  say('the list heading', JSON.stringify(await ev(`(() => { const x = document.querySelector('#autolist [data-apicalls]'); return x && { tag: x.tagName, text: x.innerText, next: x.nextElementSibling?.innerText }; })()`)));
  await typeOver('#wfinspect [data-drive=address] .vcompose', `${apiUrl}/v2/forecast`);
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf012-savedcall.png'));
  await press('#steps .autoview .event-card h2'); await wait(300); // pressed elsewhere
  for (let i = 0; i < 40 && file().apiCalls?.[0]?.params?.url !== `${apiUrl}/v2/forecast`; i++) await wait(250);
  await wait(500);
  say('toast', await ev(`document.getElementById('toast')?.textContent`));
  say('address in the file', file().apiCalls?.[0]?.params?.url);
  say('address on the backend', (await api('/api/backend/admin/api-calls/the-weather')).json?.call?.params?.url ?? JSON.stringify((await api('/api/backend/admin/api-calls/the-weather')).json).slice(0, 200));
  say('workflows unedited in the file', JSON.stringify(['when-watered', 'morning-check'].map(wfOf)) === before);
  say('workflows unedited on the backend', JSON.stringify((await api('/api/backend/admin/workflow-defs')).json?.workflows?.filter((w) => ['when-watered', 'morning-check'].includes(w.id)).map((w) => [w.id, w.updatedAt])) === defsBefore);

  // ---- 6. both tested again, from their own rows
  const n = seen.length;
  await openRow('#autolist .row[data-workflow="when-watered"]', `document.querySelector('#steps .autoview')?.dataset.workflow === 'when-watered'`);
  say('A test 2', JSON.stringify(await test('when-watered')));
  await openRow('#autolist .row[data-workflow="morning-check"]', `document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check'`);
  say('B test 2', JSON.stringify(await test('morning-check')));
  say('API saw after the change', JSON.stringify(seen.slice(n)));

  // ---- the key: in Secrets only
  const texts = { project: readFileSync(join(gh, 'nodegx.automations.json'), 'utf8'), calls: JSON.stringify((await api('/api/backend/admin/api-calls')).json), defs: JSON.stringify((await api('/api/backend/admin/workflow-defs')).json?.workflows) };
  say('key in', JSON.stringify(Object.fromEntries(Object.entries(texts).map(([k, t]) => [k, t.includes(KEY)]))));
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const holders = [...walk(gh), ...walk(join(root, 'backends'))].filter((p) => { try { return statSync(p).size < 5e6 && readFileSync(p).includes(KEY); } catch { return false; } });
  say('files holding the key', JSON.stringify(holders.map((p) => p.slice(root.length))));
  say('problems', JSON.stringify(b.problems?.slice(-5) ?? null));
} catch (e) {
  say('ERROR', e.stack);
  say(log.slice(-2000));
} finally {
  try { b?.close?.(); } catch {}
  proc.kill();
  weather.close();
  await wait(1500);
  const left = spawnSync('pgrep', ['-f', join(root, 'backends')], { encoding: 'utf8' }).stdout.trim();
  if (left) { say('stopping leftover backend', left); for (const pid of left.split('\n')) try { process.kill(Number(pid)); } catch {} }
}
