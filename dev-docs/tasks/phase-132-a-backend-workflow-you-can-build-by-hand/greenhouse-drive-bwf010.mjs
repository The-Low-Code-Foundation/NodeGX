// P132 BWF-010 AC1 (AC3's Electron half), in the Electron app on a copy of Greenhouse: the Workflows list is one row per
// workflow (5, not 9); *The morning check* opens with *Every morning at 08:00* as its first card; its time is moved from
// that card's settings (real presses), and the project's file and the backend then say the same. Also read: a workflow
// nothing starts (qzdzqzzq) has a first card that says so, with *Add what starts it*.
// Reads, it does not grade: it prints what it measured. Run with NODEGX_REPO set to the NodeGX checkout, the Bash
// sandbox off, NODEGX_DRIVE_DIR your scratchpad. It drops ELECTRON_RUN_AS_NODE (see greenhouse-drive-bwf005.mjs).
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const S = process.env.NODEGX_DRIVE_DIR || join(tmpdir(), 'p132-greenhouse-drive-bwf010');
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
  const at = async (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const press = async (sel) => { const p = await at(sel); if (!p) throw new Error(`nothing at ${sel}`); await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y }); await wait(80); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 }); await wait(60); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 }); await wait(400); };
  const until = async (js, n = 40) => { for (let i = 0; i < n && !(await ev(js)); i++) await wait(250); return ev(js); };
  const fileT = () => JSON.parse(readFileSync(join(gh, 'nodegx.automations.json'), 'utf8')).triggers.find((t) => t.target?.name === 'morning-check');

  // AC1: the list
  await press('#rail [data-tab=backend]');
  await until(`!!document.querySelector('#autolist .row[data-workflow="morning-check"]') && !/differs/.test(document.getElementById('autolist').innerText)`, 60);
  await wait(800);
  say('list rows', JSON.stringify(await ev(`[...document.querySelectorAll('#autolist .row')].map((r) => ({ workflow: r.dataset.workflow ?? null, trigger: r.dataset.trigger ?? null, text: r.innerText.replace(/\\s+/g, ' ').trim() }))`), null, 1));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf010-list.png'));

  // AC1: The morning check, its first card
  await press('#autolist .row[data-workflow="morning-check"]');
  await until(`document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check' && !/Reading its last run/.test(document.querySelector('#steps .fnfacts')?.innerText ?? '')`, 60);
  await wait(800);
  const cols = () => ev(`[...document.querySelectorAll('#steps .autoview .fncol')].map((c) => [...c.querySelectorAll('.step')].map((s) => s.dataset.id))`);
  say('columns', JSON.stringify(await cols()));
  const tid = fileT().id;
  say('first card', JSON.stringify(await ev(`document.querySelector('#steps .autoview .fncol .step')?.innerText`)));
  say('trigger wire', JSON.stringify(await ev(`[...document.querySelectorAll('#steps svg.wires path[data-kind]')].filter((p) => p.dataset.from === 'trigger:${tid}').map((p) => ({ kind: p.dataset.kind, to: p.dataset.to }))`)));
  const firstRect = await ev(`(() => { const a = document.querySelector('#steps .autoview .step[data-id="trigger:${tid}"]')?.getBoundingClientRect(), e = document.querySelector('#steps .autoview .step[data-id="check"]')?.getBoundingClientRect(); return a && e && { triggerRight: Math.round(a.right), entryLeft: Math.round(e.left), onScreen: a.left >= 0 && a.right <= innerWidth }; })()`);
  say('placed', JSON.stringify(firstRect));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf010-canvas.png'));

  // AC1: its time moved there, by presses on the card and in its settings
  await press(`#steps .autoview .step[data-id="trigger:${tid}"] h3`);
  await until(`!document.getElementById('wfinspect').hidden && !!document.querySelector('#wfinspect input[type=time]')`);
  say('panel', JSON.stringify(await ev(`document.getElementById('wfinspect').innerText.slice(0, 400)`)));
  await ev(`(() => { const t = document.querySelector('#wfinspect input[type=time]'); t.focus(); t.value = '07:30'; t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 40 && fileT().schedule.cron !== '30 7 * * *'; i++) await wait(250);
  await wait(800);
  const beT = (await api(`/api/backend/admin/triggers/${encodeURIComponent(tid)}`)).json?.trigger;
  say('file cron', fileT().schedule.cron, '| backend cron', beT?.schedule?.cron, '| toast', JSON.stringify(await ev(`document.getElementById('toast')?.textContent`)));
  say('card now', JSON.stringify(await ev(`document.querySelector('#steps .autoview .step[data-id="trigger:${tid}"] h3')?.innerText`)), '| row now', JSON.stringify(await ev(`document.querySelector('#autolist .row[data-workflow="morning-check"]')?.innerText.replace(/\\s+/g, ' ')`)));
  say('still the workflow, panel open', await ev(`document.querySelector('#steps .autoview')?.dataset.workflow === 'morning-check' && !document.getElementById('wfinspect').hidden`));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf010-moved.png'));

  // a workflow nothing starts
  await press('#autolist .row[data-workflow="qzdzqzzq"]');
  await until(`document.querySelector('#steps .autoview')?.dataset.workflow === 'qzdzqzzq'`, 40);
  await wait(600);
  say('qzdzqzzq columns', JSON.stringify(await cols()), '| first card', JSON.stringify(await ev(`document.querySelector('#steps .autoview .step[data-id="starts"]')?.innerText`)));
  if (b.screenshot) await b.screenshot(join(S, 'gh-bwf010-nostart.png'));
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
