/**
 * TPL-008-PJ — the Projects tab, in a browser, against an enforcing backend.
 *
 * Planning's data is seeded the way the hosted Planning left it — moves with the arrows its
 * cards wrote into them (`P78-TPL010-MOVEARROW`), one move already *Sent to todo* with an arrow
 * in its title — and then the list is opened as its owner. Every consequence is read back from
 * the SERVER with the browser's own session.
 *
 * | AC | criterion | § |
 * |---|---|---|
 * | AC2 | Planning's moves are tasks with the project's name, no arrow, no duplicate | §1 |
 * | AC1 | the tab lists every project with its next move and money, in the list's look | §2 |
 * | AC3 | Done asks for the next move, and it is the project's next row | §3 |
 * | AC4 | a new balance is written and the money follows it | §4 |
 * | AC5 | Been paid? Tick it closes the bill | §5 |
 * | AC3 | a project's task ticked in the List asks for the next move too | §6 |
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { request } from './helpers/http';
import { placeStarterAssets } from './helpers/judge';
import { clickAt, clickButton, currentSession, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';
import { clickButtonBeside, clickWords, dragRow, text, until, wait } from './helpers/todo-drive';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const TEMPLATE_DIR = path.join(REPO, 'templates', 'todo-list');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const POLICY = require(path.join(REPO, 'templates', 'todo-list.security.json')) as Record<string, unknown>;

const PERSON = { email: 'richard@example.invalid', password: 'a long enough password' };

/**
 * 🔴 `TPL008_PRODUCTION_ENGINE=<noodl.deploy.js>` drives a DEPLOYED build carrying that viewer instead of the
 * repo's own. todo.digitalbricks.io runs a viewer from 2026-09-24, older than `plain: true` reads (HLT-022), and
 * its first open runs the carry-over on real data — so that viewer is the one to have driven.
 */
const PRODUCTION_ENGINE = process.env.TPL008_PRODUCTION_ENGINE || '';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withDeployedSite } = require('../../../scripts/devtools/drive-deployed.js') as {
  withDeployedSite<T>(options: { dir: string; port: number }, fn: (page: RenderedPage) => Promise<T>): Promise<T>;
};

/** Build the bound project the way the host is built, with the given viewer swapped in. */
function deployWithEngine(projectDir: string, engine: string): string {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008pj-site-'));
  fs.rmSync(site, { recursive: true, force: true });
  execFileSync('node', [path.join(REPO, 'packages', 'noodl-preview', 'dist', 'nodegx-deploy.cjs'), projectDir, site, '--allow-development-engine'], { stdio: 'pipe' });
  fs.copyFileSync(engine, path.join(site, 'noodl.deploy.js'));
  return site;
}

const iso = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A header view button: its label carries a count ("List (3)"), so it is found by how it starts. */
async function clickView(page: RenderedPage, name: string): Promise<void> {
  const at = String(
    await page.evaluate(`(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) {
        var t = (x.textContent || '').trim();
        return t === ${JSON.stringify(name)} || t.indexOf(${JSON.stringify(name + ' (')}) === 0;
      })[0];
      if (!b) return 'absent';
      var r = b.getBoundingClientRect();
      return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    })()`)
  );
  if (at === 'absent') throw new Error(`no view button "${name}"`);
  const xy = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, xy.x, xy.y);
}

/** The LAST element reading exactly these words — a project's name, below the Money panel's row of the same name. */
async function clickLastWords(page: RenderedPage, words: string): Promise<void> {
  const at = String(
    await page.evaluate(`(function () {
      var els = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(words)};
      });
      var el = els[els.length - 1];
      if (!el) return 'absent';
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 });
    })()`)
  );
  if (at === 'absent') throw new Error(`no element reads "${words}"`);
  const xy = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, xy.x, xy.y);
}

/** As a person does it: a pointer press at the end of the field holding these words, then keys, one at a time. */
async function typeAtEnd(page: RenderedPage, holding: string, keys: string): Promise<void> {
  const at = String(
    await page.evaluate(`(function () {
      var i = Array.prototype.filter.call(document.querySelectorAll('input'), function (x) { return x.value === ${JSON.stringify(holding)}; })[0];
      if (!i) return 'absent';
      var r = i.getBoundingClientRect();
      return JSON.stringify({ x: r.right - 8, y: r.top + r.height / 2 });
    })()`)
  );
  if (at === 'absent') throw new Error(`no field holds "${holding}"`);
  const xy = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, xy.x, xy.y);
  await wait(200);
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<unknown> } }).client;
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
  for (const ch of keys) {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
    await wait(40);
  }
  await wait(300);
}

/** The Nth date picker on the page, its calendar opened and the day pressed (as `tpl008-recurring-demo-drive` does). */
async function pickDateIn(page: RenderedPage, nth: number, day: string): Promise<void> {
  const press = async (expr: string): Promise<boolean> => {
    const at = String(
      await page.evaluate(`(function () {
        var e = ${expr};
        if (!e) return 'absent';
        e.scrollIntoView({ block: 'center', behavior: 'instant' });
        var r = e.getBoundingClientRect();
        return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      })()`)
    );
    if (at === 'absent') return false;
    const { x, y } = JSON.parse(at) as { x: number; y: number };
    await clickAt(page, x, y);
    return true;
  };
  if (!(await press(`document.querySelectorAll('.ndg-dp-input')[${nth}]`))) throw new Error(`no date picker ${nth}`);
  await until('calendar open', () => page.evaluate(`!!document.querySelector('.ndg-dp-pop')`), (v) => v === true, 5_000);
  for (let i = 0; i < 24; i++) {
    if (await press(`document.querySelector('.ndg-dp-pop [data-day="${day}"]')`)) return;
    if (!(await press(`document.querySelector('.ndg-dp-pop [data-nav="1"]')`))) break;
  }
  throw new Error(`${day} never appeared in the calendar`);
}

/** The button with this label in the smallest element around the LAST text reading `label` — the popup's line, over the card's. */
async function clickLastButtonBeside(page: RenderedPage, label: string, button: string): Promise<void> {
  const at = String(
    await page.evaluate(`(function () {
      var leaves = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(label)};
      });
      var leaf = leaves[leaves.length - 1];
      for (var el = leaf && leaf.parentElement; el; el = el.parentElement) {
        var b = Array.prototype.filter.call(el.querySelectorAll('button'), function (x) { return (x.innerText || '').trim() === ${JSON.stringify(button)}; })[0];
        if (!b) continue;
        b.scrollIntoView({ block: 'center', behavior: 'instant' });
        var r = b.getBoundingClientRect();
        return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      return 'absent:' + leaves.length;
    })()`)
  );
  if (at.startsWith('absent')) throw new Error(`no "${button}" beside the last "${label}" (${at})`);
  const xy = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, xy.x, xy.y);
}

/** Pick an option the way the browser reports a person's pick: the select's value, then a change event. */
async function pickOption(page: RenderedPage, startsWith: string): Promise<void> {
  const ok = String(
    await page.evaluate(`(function () {
      var sels = Array.prototype.slice.call(document.querySelectorAll('select'));
      for (var i = 0; i < sels.length; i++) {
        var o = Array.prototype.filter.call(sels[i].options, function (x) { return x.text.indexOf(${JSON.stringify(startsWith)}) === 0; })[0];
        if (!o) continue;
        sels[i].value = o.value;
        sels[i].dispatchEvent(new Event('change', { bubbles: true }));
        return 'ok';
      }
      return 'absent';
    })()`)
  );
  if (ok !== 'ok') throw new Error(`no option starting "${startsWith}"`);
  await wait(400);
}

interface Row {
  objectId: string;
  [field: string]: unknown;
}

describe('TPL-008-PJ — Projects, driven', () => {
  let service: BackendService | undefined;
  let base = '';
  let driveError = '';
  let stoppedAt = '';
  const R: Record<string, unknown> = {};

  const rows = async (className: string, token: string): Promise<Row[]> =>
    (await request<{ results?: Row[] }>(base, 'GET', `/classes/${className}?limit=1000`, { headers: { 'x-parse-session-token': token } })).json?.results ?? [];
  const make = async (className: string, token: string, body: Record<string, unknown>): Promise<string> => {
    const res = await request<{ objectId?: string }>(base, 'POST', `/classes/${className}`, { headers: { 'x-parse-session-token': token }, body });
    if (!res.json?.objectId) throw new Error(`could not seed ${className}: ${res.status} ${res.text}`);
    return res.json.objectId;
  };

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008pj-drive-project-'));
    fs.cpSync(TEMPLATE_DIR, projectDir, { recursive: true });
    const placed = placeStarterAssets(projectDir);
    if (placed.failed.length) throw new Error(`starter assets failed: ${placed.failed.join(', ')}`);
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008pj-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(POLICY));
    service = new BackendService({ dataDir, port: 0, backendId: 'tpl008pj-drive', backendName: 'TPL-008-PJ projects' });
    const started = await service.start();
    base = started.listen.url;
    R.enforced = started.security.enforced;
    if (!started.security.enforced) return;
    bindProjectToBackend(projectDir, 'tpl008pj-drive', started.listen.port);

    R.engine = PRODUCTION_ENGINE ? `deployed with ${PRODUCTION_ENGINE}` : 'the repo viewer';
    const drive = PRODUCTION_ENGINE
      ? (fn: (page: RenderedPage) => Promise<void>) => withDeployedSite({ dir: deployWithEngine(projectDir, PRODUCTION_ENGINE), port: 0 }, fn)
      : (fn: (page: RenderedPage) => Promise<void>) => withRenderedPage({ projectDir, backendPort: started.listen.port }, fn);
    await drive(async (page: RenderedPage) => {
      await page.setViewport({ width: 1280, height: 1600 });
      const shot = async (name: string): Promise<void> => {
        const dir = process.env.TPL008_SHOTS;
        if (!dir) return;
        fs.mkdirSync(dir, { recursive: true });
        const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
        const res = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(res.data, 'base64'));
      };
      const errorsByStep: Record<string, string[]> = {};
      let seen = 0;
      const step = (name: string) => {
        if (page.consoleErrors.length > seen) {
          errorsByStep[stoppedAt || 'boot'] = page.consoleErrors.slice(seen);
          seen = page.consoleErrors.length;
        }
        stoppedAt = name;
      };
      R.errorsByStep = errorsByStep;
      try {
        // ── §0 An account with nothing: the list, and only the way in ─────────────
        step('§0 sign up');
        await until('sign in drawn', () => text(page), (s) => s.includes('Create account'));
        await fill(page, 'email', PERSON.email);
        await fill(page, 'password', PERSON.password);
        await clickButton(page, 'Create account');
        const tk = String(await until('holds a session', () => currentSession(page), (t) => !!t));
        await until('list drawn', () => text(page), (s) => s.includes('Nothing on the list'));
        await wait(1500);
        const empty = await text(page);
        R.emptyHasWayIn = empty.includes('Also keep track of projects and money');
        R.emptyHasTab = /\bProjects\b/.test(empty.replace('Also keep track of projects and money', ''));

        // ── §1 Planning's data, as the hosted Planning left it ───────────────────
        step('§1 seed');
        const joss = await make('Project', tk, { name: 'Linguaid', kind: 'earning', move: '→ → Find out from Joss', moveDue: iso(6), position: 1 });
        const ade = await make('Project', tk, { name: 'Clarion', kind: 'earning', move: '✓ Wed 30 · ✓ Wed 30 · Call Ade', moveDue: null, position: 2 });
        const course = await make('Project', tk, { name: 'Own course', kind: 'building', move: '', position: 3 });
        await make('Project', tk, { name: 'Admin and asks', kind: 'admin', move: '', position: 4 });
        const sent = await make('Task', tk, { title: '→ Find out from Joss', status: 'open', position: 1, deadline: '', closingNote: '', closedAt: '' });
        const retainer = await make('MoneyItem', tk, { label: 'Clarion', amount: 1200, repeat: 'monthly', date: iso(-9), until: null, monthEnd: false, projectId: ade, billDate: null, billLeadDays: null, likelihood: 100, note: '', position: 1 });
        await make('MoneyItem', tk, { label: 'Rent', amount: -900, repeat: 'monthly', date: iso(4), until: null, monthEnd: false, projectId: null, billDate: null, billLeadDays: null, likelihood: 100, note: '', position: 2 });
        await make('BalanceReading', tk, { date: iso(-2), amount: 300, note: '' });

        step('§1 open as the owner');
        await page.navigate('/');
        await until('carried over', async () => (await rows('Project', tk)).map((p) => String(p.move ?? '')), (m) => m.every((x) => x === ''), 30_000);
        await until('tasks reloaded', () => text(page), (s) => s.includes('Call Ade'));
        const tasks = await rows('Task', tk);
        R.tasksAfterCarry = tasks.map((t) => [t.title, t.projectId === joss ? 'Linguaid' : t.projectId === ade ? 'Clarion' : '', t.status, t.deadline || '']).sort();
        R.sentLinked = tasks.find((t) => t.objectId === sent)?.projectId === joss;
        R.carryEvents = (await rows('Event', tk)).map((e) => String(e.summary)).sort();
        const list = await text(page);
        R.listShowsProject = list.includes('Linguaid') && list.includes('Clarion');
        R.noArrowOnScreen = !list.includes('→ Find out') && !list.includes('✓ Wed 30');
        await shot('pj-1-list');

        // ── §2 The tab ────────────────────────────────────────────────────────────
        step('§2 the tab');
        await clickButton(page, 'Projects');
        // s3 — by kind is the default; most urgent first is one press, and this device remembers it.
        await until('tab drawn by kind', () => text(page), (s) => s.includes('Paying') && s.includes('Money'));
        const byKind = await text(page);
        R.kindDefault = [byKind.includes('Paying'), byKind.includes('Building'), byKind.includes('Your move')];
        await clickButton(page, 'Most urgent first');
        await until('most urgent first', () => text(page), (s) => s.includes('Your move'));
        await page.navigate('/');
        await until('reloaded', () => text(page), (s) => s.includes('Call Ade'));
        await clickButton(page, 'Projects');
        await until('tab drawn, remembered', () => text(page), (s) => s.includes('Your move') && s.includes('Money'));
        R.urgentRemembered = true;
        await wait(800);
        const tab = await text(page);
        R.tabText = tab;
        R.order = ['Clarion', 'Linguaid', 'Own course'].map((n) => tab.indexOf(n));
        R.adminHidden = !tab.includes('Admin and asks');
        R.listHiddenOnTab = !tab.includes('Select a task, or something that repeats');
        R.scrollWidth = await page.evaluate('document.documentElement.scrollWidth');
        await shot('pj-2-tab');

        // ── §3 Done → the next move ───────────────────────────────────────────────
        step('§3 open Linguaid');
        await clickWords(page, 'Linguaid');
        await until('opened', () => text(page), (s) => s.includes('Change the move'));
        await clickButton(page, 'Done');
        await until('asks', () => text(page), (s) => s.includes('Done. What is the next move for Linguaid?'));
        await fill(page, 'The next move', 'Joss replies with the list of OFs');
        await fill(page, 'Waiting on someone', 'Joss');
        await shot('pj-3-done-box');
        step('§3 save');
        await clickButton(page, 'Save');
        await until('next move written', async () => (await rows('Task', tk)).filter((t) => t.projectId === joss && t.status === 'open').map((t) => t.title), (t) => t.length === 1 && t[0] === 'Joss replies with the list of OFs');
        await until('drawn as waiting', () => text(page), (s) => s.includes('Waiting on someone') && s.includes('Waiting on Joss'));
        const jossTasks = (await rows('Task', tk)).filter((t) => t.projectId === joss);
        R.jossTasks = jossTasks.map((t) => [t.title, t.status, t.waitingOn || '']).sort();
        await shot('pj-3-after');

        // ── §3b Change the move, as a person does it (Richard, 2026-10-05: "when I hit 'change the move' I can't edit it") ──
        step('§3b change');
        const fields = async () =>
          JSON.parse(String(await page.evaluate(`JSON.stringify(Array.prototype.filter.call(document.querySelectorAll('input'), function (i) {
            var r = i.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && i.type !== 'date';
          }).map(function (i) { return [i.getAttribute('placeholder') || '', i.value]; }))`))) as Array<[string, string]>;
        if (!(await text(page)).includes('Change the move')) await clickWords(page, 'Linguaid');
        await until('Linguaid open again', () => text(page), (s) => s.includes('Change the move'));
        await clickButton(page, 'Change the move');
        await until('change form', () => text(page), (s) => s.includes('Change the move for Linguaid'));
        await wait(600);
        R.changeOpensOn = (await fields()).filter(([ph]) => ph.startsWith('The next move') || ph.startsWith('Waiting on someone'));
        await typeAtEnd(page, 'Joss replies with the list of OFs', ' now');
        await pickDateIn(page, 0, iso(9));
        await shot('pj-3b-change');
        await clickButton(page, 'Save');
        await until('change written', async () => (await rows('Task', tk)).filter((t) => t.projectId === joss && t.status === 'open').map((t) => [t.title, t.waitingOn, t.deadline]), (t) => t.length === 1 && t[0][0] === 'Joss replies with the list of OFs now');
        R.changed = (await rows('Task', tk)).filter((t) => t.projectId === joss && t.status === 'open').map((t) => [t.title, t.waitingOn || '', t.deadline || '']);

        // ── §3c Add a task for the project ────────────────────────────────────────
        step('§3c add a task');
        await until('still open', () => text(page), (s) => s.includes('Add a task'));
        await clickButton(page, 'Add a task');
        await until('add form', () => text(page), (s) => s.includes('Add a task for Linguaid'));
        await fill(page, 'The next move', 'Send Joss the invoice');
        await clickButton(page, 'Save');
        await until('task added', async () => (await rows('Task', tk)).filter((t) => t.projectId === joss && t.status === 'open').length, (n) => n === 2);
        await until('drawn in the project', () => text(page), (s) => s.includes('In your list (2)') && s.includes('Send Joss the invoice'));
        R.added = (await rows('Task', tk)).filter((t) => t.projectId === joss && t.status === 'open').map((t) => [t.title, Number(t.position)]).sort((x, y) => (x[1] as number) - (y[1] as number)).map((x) => x[0]);

        // ── §3d Edit the project ──────────────────────────────────────────────────
        step('§3d edit project');
        await clickButton(page, 'Edit project');
        await until('project form', () => text(page), (s) => s.includes('Edit the project'));
        R.editOpensOn = (await fields()).filter(([ph]) => ph === 'Its name');
        await fill(page, 'Its name', 'Linguaid Ltd');
        await clickButton(page, 'A fixed price');
        await fill(page, 'Pays within', '30');
        await shot('pj-3d-edit');
        await clickButton(page, 'Save project');
        await until('project written', async () => (await rows('Project', tk)).find((p) => p.objectId === joss)?.name, (n) => n === 'Linguaid Ltd');
        const lp = (await rows('Project', tk)).find((p) => p.objectId === joss) as Row;
        R.edited = [lp.name, lp.kind, lp.billing, lp.termsDays];
        await until('renamed on the tab', () => text(page), (s) => s.includes('Linguaid Ltd'));

        // ── §3e Both ways: the project's task opens in the List, and back ────────
        step('§3e project to task');
        await clickWords(page, 'Send Joss the invoice');
        await until('the List, on that task', async () => String(await page.evaluate(`Array.prototype.map.call(document.querySelectorAll('input'), function (i) { return i.value; }).join('|')`)), (v) => v.split('|').includes('Send Joss the invoice'));
        const paneText = await text(page);
        const picked = String(await page.evaluate(`(function () { var s = document.querySelector('select'); return s && s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : ''; })()`));
        R.taskPane = [picked, paneText.includes('Open the project'), paneText.includes('Your move')];
        await shot('pj-3e-task');
        step('§3e task to project');
        await clickButton(page, 'Open the project');
        await until('back on the project', () => text(page), (s) => s.includes('Your move') && s.includes('Edit project') && s.includes('Send Joss the invoice'));
        R.backOnProject = true;

        // ── §4 A new balance ─────────────────────────────────────────────────────
        step('§4 balance');
        R.lowBefore = (await text(page)).split('\n').find((l) => l.startsWith('Dips to') || l.startsWith('Lowest')) ?? '';
        await fill(page, 'What is in the bank now', '2140');
        await clickButton(page, 'Save balance');
        await until('balance written', async () => (await rows('BalanceReading', tk)).length, (n) => n === 2);
        await until('balance drawn', () => text(page), (s) => s.includes('€2,140'));
        R.readings = (await rows('BalanceReading', tk)).map((r) => [r.date, r.amount]).sort();
        R.lowAfter = (await text(page)).split('\n').find((l) => l.startsWith('Dips to') || l.startsWith('Lowest')) ?? '';

        // ── §5 Been paid? ────────────────────────────────────────────────────────
        step('§5 tick');
        await clickLastWords(page, 'Clarion');
        await until('Clarion open', () => text(page), (s) => s.includes('Been paid €1,200? Tick it'));
        await clickButton(page, 'Been paid €1,200? Tick it');
        await until('mark written', async () => (await rows('MoneyMark', tk)).length, (n) => n === 1);
        const mark = (await rows('MoneyMark', tk))[0];
        R.mark = [mark.itemId === retainer, mark.occurs, mark.payments];
        await until('no longer late', () => text(page), (s) => !s.includes('days late'));
        await shot('pj-5-paid');

        // ── §6 A project's task ticked in the List ───────────────────────────────
        step('§6 list close');
        await clickView(page, 'List');
        await until('list drawn', () => text(page), (s) => s.includes('Call Ade') && !s.includes('Your move'));
        await clickButtonBeside(page, 'Call Ade', 1, 0);
        await until('what happened?', () => text(page), (s) => s.includes('What happened?'));
        await fill(page, 'happened', 'Called him, he is in.');
        await clickButton(page, 'Close task');
        await until('prompt', () => text(page), (s) => s.includes('Closed. What is the next move for Clarion?'));
        await shot('pj-6-prompt');
        await fill(page, 'The next move', 'Send Ade the plan', 0);
        await clickButton(page, 'Save');
        await until('prompt answered', async () => (await rows('Task', tk)).filter((t) => t.projectId === ade && t.status === 'open').map((t) => t.title), (t) => t.length === 1 && t[0] === 'Send Ade the plan');
        await until('prompt gone', () => text(page), (s) => !s.includes('Closed. What is the next move for Clarion?'));
        R.listAfterPrompt = (await text(page)).includes('Send Ade the plan');

        // ── §8 The money popup (Richard: "I can't add expenses and upcoming payments like in the planning template") ──
        step('§8 add money');
        await clickView(page, 'Projects');
        await until('tab', () => text(page), (s) => s.includes('All money in and out'));
        await clickButton(page, '+ Add money');
        await until('money form', () => text(page), (s) => s.includes('Add money') && s.includes('How often'));
        await fill(page, 'What it is', 'Tax bill');
        await fill(page, 'How much', '1,240');
        await pickDateIn(page, 0, iso(12));
        await shot('pj-8-add-money');
        await clickButton(page, 'Save');
        await until('item written', async () => (await rows('MoneyItem', tk)).find((m) => m.label === 'Tax bill'), (m) => !!m);
        const tax = (await rows('MoneyItem', tk)).find((m) => m.label === 'Tax bill') as Row;
        R.taxItem = [tax.amount, tax.repeat, tax.date, tax.projectId ?? null, tax.likelihood];
        await until('popup closed', () => text(page), (s) => !s.includes('How often'));

        step('§8 the lists');
        await clickButton(page, 'All money in and out');
        await until('popup list', () => text(page), (s) => s.includes('Money in and out') && s.includes('Tax bill'));
        R.upcoming = (await text(page)).includes('−€1,240');
        await shot('pj-8-upcoming');
        await clickButton(page, 'Recurring');
        await until('recurring', () => text(page), (s) => s.includes('Every month on the'));
        await clickLastWords(page, 'Rent');
        await until('rent form', () => text(page), (s) => s.includes('Change: Rent'));
        R.rentOpensOn = (await fields()).filter(([ph]) => ph === 'How much (€)');
        await fill(page, 'How much', '950');
        await clickButton(page, 'Save');
        await until('rent written', async () => (await rows('MoneyItem', tk)).find((m) => m.label === 'Rent')?.amount, (a) => a === -950);
        await until('back to the list', () => text(page), (s) => s.includes('Recurring') && !s.includes('Change: Rent'));
        step('§8 end it');
        await clickLastWords(page, 'Rent');
        await until('rent form again', () => text(page), (s) => s.includes('Change: Rent') && s.includes('End it'));
        await clickButton(page, 'End it');
        await until('rent ended', async () => (await rows('MoneyItem', tk)).find((m) => m.label === 'Rent')?.until, (u) => !!u);
        R.rentUntil = (await rows('MoneyItem', tk)).find((m) => m.label === 'Rent')?.until;
        step('§8 paid and untick');
        await clickButton(page, 'Upcoming');
        await until('upcoming again', () => text(page), (s) => s.includes('Tax bill'));
        await clickLastButtonBeside(page, 'Tax bill', 'Paid');
        await until('tax ticked', async () => (await rows('MoneyMark', tk)).filter((m) => m.itemId === tax.objectId && Array.isArray(m.payments) && (m.payments as unknown[]).length === 1).length, (n) => n === 1);
        await clickButton(page, 'Past');
        await until('past', () => text(page), (s) => s.includes('Tax bill') && s.includes('Untick'));
        await shot('pj-8-past');
        await clickLastButtonBeside(page, 'Tax bill', 'Untick');
        await until('tax unticked', async () => (await rows('MoneyMark', tk)).filter((m) => m.itemId === tax.objectId && Array.isArray(m.payments) && (m.payments as unknown[]).length === 0).length, (n) => n === 1);
        await clickButton(page, '✕');
        await until('popup shut', () => text(page), (s) => !s.includes('Money in and out'));

        step('§8 add money for a project');
        // §5 left Clarion open; open it only if it is not.
        if (!(await text(page)).includes('Its money')) await clickWords(page, 'Clarion');
        await until('Clarion open', () => text(page), (s) => s.includes('Add money') && s.includes('Its money'));
        await clickButton(page, 'Add money');
        await until('form for Clarion', () => text(page), (s) => s.includes('Add money for Clarion'));
        R.projectChoices = JSON.parse(String(await page.evaluate(`JSON.stringify((function () {
          var sel = document.querySelector('select');
          return sel ? [Array.prototype.map.call(sel.options, function (o) { return o.text; }), sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : ''] : null;
        })())`)));
        await fill(page, 'How much', '500');
        await clickButton(page, 'Save');
        await until('Clarion item', async () => (await rows('MoneyItem', tk)).filter((m) => m.projectId === ade).length, (n) => n === 2);
        R.clarionItems = (await rows('MoneyItem', tk)).filter((m) => m.projectId === ade).map((m) => [m.label, m.amount]).sort();
        await until('popup shut again', () => text(page), (s) => !s.includes('Add money for Clarion'));
        step('§8 a project money line opens its form');
        await until('the new line on the project', () => text(page), (s) => /\+€500 once, /.test(s));
        const lineAt = JSON.parse(String(await page.evaluate(`(function () {
          var el = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
            return e.children.length === 0 && /^[+]€500 once, /.test((e.textContent || '').trim());
          })[0];
          if (!el) return 'null';
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          var r = el.getBoundingClientRect();
          return JSON.stringify({ x: r.left + 20, y: r.top + r.height / 2 });
        })()`))) as { x: number; y: number } | null;
        if (!lineAt) throw new Error('no +€500 line on Clarion');
        await clickAt(page, lineAt.x, lineAt.y);
        await until('its form', () => text(page), (s) => s.includes('Change: Clarion') && s.includes('Remove it'));
        R.lineOpensOn = (await fields()).filter(([ph]) => ph === 'How much (€)');
        await clickButton(page, 'Cancel');
        await until('popup shut a third time', () => text(page), (s) => !s.includes('Change: Clarion'));

        // ── §9 By kind, in your own order; a task put in a project (Richard: "I can't define the project a task is related to") ──
        step('§9 by kind');
        await clickView(page, 'Projects');
        await until('the tab', () => text(page), (s) => s.includes('By kind'));
        await clickButton(page, 'By kind');
        await until('by kind', () => text(page), (s) => s.includes('Paying') && !s.includes('Your move'));
        const kinds = await text(page);
        R.kindOrder = ['Paying', 'Linguaid Ltd', 'Clarion', 'Building', 'Own course'].map((w) => kinds.indexOf(w, kinds.indexOf('Paying') - 1));
        await shot('pj-9-by-kind');
        step('§9 drag');
        await dragRow(page, 'Linguaid Ltd', 'Own course');
        const pos = async () => {
          const ps = await rows('Project', tk);
          return [Number(ps.find((x) => x.objectId === ade)?.position), Number(ps.find((x) => x.objectId === joss)?.position)];
        };
        await until('order saved', pos, ([a, j]) => a < j);
        await until('drawn in the new order', () => text(page), (s) => s.indexOf('Clarion', s.indexOf('Paying')) < s.indexOf('Linguaid Ltd', s.indexOf('Paying')));
        R.dragged = true;
        await shot('pj-9-dragged');

        step('§9 add an existing task');
        await clickWords(page, 'Own course');
        await until('Own course open', () => text(page), (s) => s.includes('Add an existing task'));
        await clickButton(page, 'Add an existing task');
        await until('picker', () => text(page), (s) => s.includes('Add an existing task to Own course'));
        await pickOption(page, 'Send Joss the invoice');
        await shot('pj-9-link');
        await clickButton(page, 'Add to project');
        await until('linked', async () => (await rows('Task', tk)).find((t) => t.title === 'Send Joss the invoice')?.projectId, (pid) => pid === course);
        await until('drawn under Own course', () => text(page), (s) => s.includes('In your list') && s.includes('Send Joss the invoice'));
        R.linkHistory = (await rows('Event', tk)).filter((e) => e.summary === 'Now part of Own course').length;

        step('§9 a task’s project, from its pane');
        await clickView(page, 'List');
        await until('the List', () => text(page), (s) => s.includes('Send Ade the plan') && !s.includes('Hide this tab'));
        await fill(page, 'Add a task', 'Book the dentist');
        await clickButton(page, 'Add');
        await until('task added', async () => (await rows('Task', tk)).find((t) => t.title === 'Book the dentist'), (t) => !!t);
        await until('in the list', () => text(page), (s) => s.includes('Book the dentist'));
        await clickWords(page, 'Book the dentist');
        await until('its pane', () => text(page), (s) => s.includes('Project') && s.includes('Close task'));
        await pickOption(page, 'Clarion');
        await until('put in Clarion', async () => (await rows('Task', tk)).find((t) => t.title === 'Book the dentist')?.projectId, (pid) => pid === ade);
        await until('the way to it', () => text(page), (s) => s.includes('Open the project'));
        await shot('pj-9-pane');
        R.paneHistory = (await rows('Event', tk)).filter((e) => e.summary === 'Now part of Clarion').length;
        await clickView(page, 'Projects');

        // ── §7 Phone width ───────────────────────────────────────────────────────
        step('§7 phone');
        await page.setViewport({ width: 390, height: 844, mobile: true });
        await clickButton(page, 'Projects');
        await until('tab at 390', () => text(page), (s) => s.includes('Hide this tab'));
        await wait(800);
        R.phoneScrollWidth = await page.evaluate('document.documentElement.scrollWidth');
        await shot('pj-7-phone');
        await clickButton(page, 'All money in and out');
        await until('popup at 390', () => text(page), (s) => s.includes('Money in and out'));
        await wait(500);
        R.phonePopupScrollWidth = await page.evaluate('document.documentElement.scrollWidth');
        await shot('pj-7-phone-popup');
        step('done');
      } catch (e) {
        driveError = `${stoppedAt}: ${(e as Error).message}`;
      }
    });
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('ran end to end on an enforcing backend', () => {
    expect(R.enforced).toBe(true);
    expect(driveError).toBe('');
  });

  it('§0 with no projects: the list as it was, and only the quiet way in', () => {
    expect([R.emptyHasWayIn, R.emptyHasTab]).toEqual([true, false]);
  });

  it('§1 AC2 — Planning’s moves are tasks: arrows off, the sent one linked not copied, the move emptied', () => {
    expect(R.tasksAfterCarry).toEqual([
      ['Call Ade', 'Clarion', 'open', ''],
      ['Find out from Joss', 'Linguaid', 'open', iso(6)]
    ]);
    expect(R.sentLinked).toBe(true);
    expect(R.carryEvents).toEqual([
      'Carried over from Planning: the next move for Clarion',
      'Now the next move for Linguaid',
      'Renamed from “→ Find out from Joss”'
    ]);
    expect([R.listShowsProject, R.noArrowOnScreen]).toEqual([true, true]);
  });

  it('§2 AC1 — the tab: late money first, the admin row never, the list out of the way, no sideways scroll', () => {
    const [clarion, linguaid, course] = R.order as number[];
    expect(clarion).toBeGreaterThan(-1);
    expect(clarion < linguaid && linguaid < course).toBe(true);
    expect(String(R.tabText)).toMatch(/€1,200 · 9 days late/);
    expect([R.adminHidden, R.listHiddenOnTab, R.scrollWidth]).toEqual([true, true, 1280]);
  });

  it('§3 AC3 — Done closes the move and the answer is the next one, waiting on who it names', () => {
    expect(R.jossTasks).toEqual([
      ['Find out from Joss', 'done', ''],
      ['Joss replies with the list of OFs', 'open', 'Joss']
    ]);
  });

  it('§3b s2 — Change the move opens on the move, takes typing and a day from the calendar, and keeps who it waits on', () => {
    expect(R.changeOpensOn).toEqual([
      ['The next move, in a few words', 'Joss replies with the list of OFs'],
      ['Waiting on someone? Their name. Empty if it is your move.', 'Joss']
    ]);
    expect(R.changed).toEqual([['Joss replies with the list of OFs now', 'Joss', iso(9)]]);
  });

  it('§3c s2 — Add a task puts it at the end of the list, under the project', () => {
    expect(R.added).toEqual(['Joss replies with the list of OFs now', 'Send Joss the invoice']);
  });

  it('§3d s2 — Edit project opens on the project and saves its name, billing and terms', () => {
    expect(R.editOpensOn).toEqual([['Its name', 'Linguaid']]);
    expect(R.edited).toEqual(['Linguaid Ltd', 'earning', 'fixed', 30]);
  });

  it('§3e s2 — both ways: a project’s task opens in the List with its project named, and Open the project goes back', () => {
    expect(R.taskPane).toEqual(['Linguaid Ltd', true, false]);
    expect(R.backOnProject).toBe(true);
  });

  it('§8 s2 — the money popup: add an expense, change and end an item, tick and untick, add money for a project', () => {
    expect(R.taxItem).toEqual([-1240, 'once', iso(12), null, 100]);
    expect(R.upcoming).toBe(true);
    expect(R.rentOpensOn).toEqual([['How much (€)', '900']]);
    // Rent had not begun (its first day is in four days), so ending it means it never happens.
    expect(R.rentUntil).toBe(iso(3));
    expect(R.clarionItems).toEqual([['Clarion', 1200], ['Clarion', 500]]);
    // The dropdown's own empty first option comes before the list.
    expect(R.projectChoices).toEqual([['', 'No project', 'Clarion', 'Linguaid Ltd', 'Own course'], 'Clarion']);
    expect(R.lineOpensOn).toEqual([['How much (€)', '500']]);
  });

  it('§2 s3 — by kind is the default, and most urgent first is remembered on the device', () => {
    expect(R.kindDefault).toEqual([true, true, false]);
    expect(R.urgentRemembered).toBe(true);
  });

  it('§9 s3 — by kind in your own order: a drag saves it; an existing task added to a project; a task put in one from its pane', () => {
    const [paying, linguaid, clarion, building, course] = R.kindOrder as number[];
    expect(paying < linguaid && linguaid < clarion && clarion < building && building < course).toBe(true);
    expect(R.dragged).toBe(true);
    expect([R.linkHistory, R.paneHistory]).toEqual([1, 1]);
  });

  it('§4 AC4 — a new balance is today’s reading, and the money sentence follows it', () => {
    expect(R.readings).toEqual([[iso(-2), 300], [iso(0), 2140]].sort());
    expect(String(R.lowBefore)).toMatch(/^(Dips to|Lowest)/);
    expect(R.lowAfter).not.toEqual(R.lowBefore);
  });

  it('§5 AC5 — Been paid? ticks the late repeat, today, in full', () => {
    expect(R.mark).toEqual([true, iso(-9), [{ day: iso(0), amount: 1200 }]]);
  });

  it('§6 AC3 — ticking a project’s task in the List asks for its next move, and saves it', () => {
    expect(R.listAfterPrompt).toBe(true);
  });

  it('§7 the phone: no sideways scroll', () => {
    expect(R.phoneScrollWidth).toBe(390);
    expect(R.phonePopupScrollWidth).toBe(390);
  });

  it('no console errors on the way', () => {
    expect(R.errorsByStep).toEqual({});
  });
});
