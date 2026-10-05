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
import { clickButtonBeside, clickWords, text, until, wait } from './helpers/todo-drive';

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
        await make('Project', tk, { name: 'Own course', kind: 'building', move: '', position: 3 });
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
        await until('tab drawn', () => text(page), (s) => s.includes('Your move') && s.includes('Money'));
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

        // ── §7 Phone width ───────────────────────────────────────────────────────
        step('§7 phone');
        await page.setViewport({ width: 390, height: 844, mobile: true });
        await clickButton(page, 'Projects');
        await until('tab at 390', () => text(page), (s) => s.includes('Your move'));
        await wait(800);
        R.phoneScrollWidth = await page.evaluate('document.documentElement.scrollWidth');
        await shot('pj-7-phone');
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
  });

  it('no console errors on the way', () => {
    expect(R.errorsByStep).toEqual({});
  });
});
