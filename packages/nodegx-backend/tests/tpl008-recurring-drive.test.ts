/**
 * TPL-008-RC — things that repeat, in a browser, against an enforcing backend.
 *
 * The subject is `templates/todo-list/`, bound to a fresh backend running the template's own
 * policy. The browser does everything through the app's own controls; the consequence is read
 * from the SERVER with the session the browser holds — and, last, **the host's push sender is
 * pointed at that backend's own SQLite file**: the columns it reads (`owner`, `objectId`,
 * `routineId`, …) are the ones this backend writes, or the phone never buzzes.
 *
 * | AC | § |
 * |---|---|
 * | AC4 a tick is one `RoutineCheck`, owned, and it leaves Today | §2 |
 * | AC6 a schedule built from the pane (daily 08:00 + 20:00; weekly Tue + Thu 10:00), Stop | §1, §3 |
 * | AC1 policy: a check is never edited, nothing is deleted, a stranger sees nothing | §4 |
 * | AC8 the sender, on this backend's file: due once in its window, not once ticked | §5 |
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { request } from './helpers/http';
import { placeStarterAssets } from './helpers/judge';
import { clickAt, clickButton, currentSession, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';
import { buttonDisabled, clickButtonByField, pathname, text, until, wait } from './helpers/todo-drive';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const TEMPLATE_DIR = path.join(REPO, 'templates', 'todo-list');
const SENDER = path.join(REPO, 'dev-docs', 'tasks', 'phase-78-the-templates', 'todo-digitalbricks', 'push', 'sender.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const POLICY = require(path.join(REPO, 'templates', 'todo-list.security.json')) as Record<string, unknown>;

const PERSON = { email: 'richard@example.invalid', password: 'a long enough password' };
const STRANGER = { email: 'stranger@example.invalid', password: 'another long password' };
const TABLETS = 'Take the tablets';
const CLIENT = 'Call the client about the invoice';
const STOP_NOTE = 'They paid.';

const pad = (n: number) => String(n).padStart(2, '0');
const NOW = new Date();
const TODAY = `${NOW.getFullYear()}-${pad(NOW.getMonth() + 1)}-${pad(NOW.getDate())}`;

interface Row {
  objectId: string;
  [field: string]: unknown;
}

/** Press the tick on the Today line holding both `time` and `title`. */
async function tickToday(page: RenderedPage, time: string, title: string): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      var title = ${JSON.stringify(title)}, time = ${JSON.stringify(time)};
      var leaves = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === title;
      });
      for (var i = 0; i < leaves.length; i++) {
        for (var el = leaves[i].parentElement; el; el = el.parentElement) {
          var bs = el.querySelectorAll('button');
          if (bs.length === 0) continue;
          if (bs.length !== 1) break;
          if ((el.innerText || '').split('\\n').map(function (s) { return s.trim(); }).indexOf(time) < 0) break;
          bs[0].scrollIntoView({ block: 'center', behavior: 'instant' });
          var r = bs[0].getBoundingClientRect();
          return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        }
      }
      return 'absent';
    })()`)
  );
  if (found === 'absent') throw new Error(`no Today line for "${time} ${title}"`);
  const at = JSON.parse(found) as { x: number; y: number };
  await clickAt(page, at.x, at.y);
}

/**
 * Press the ✕ on the time chip reading `label`. 🔴 Not `clickButtonBeside`: the first "09:00" on the
 * page is Today's line for it, whose one button is the TICK — the first run pressed it.
 */
async function removeSlot(page: RenderedPage, label: string): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      var leaves = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(label)};
      });
      for (var i = 0; i < leaves.length; i++) {
        var bs = leaves[i].parentElement ? leaves[i].parentElement.querySelectorAll('button') : [];
        if (bs.length !== 1 || (bs[0].innerText || '').trim() !== '✕') continue;
        bs[0].scrollIntoView({ block: 'center', behavior: 'instant' });
        var r = bs[0].getBoundingClientRect();
        return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      return 'absent';
    })()`)
  );
  if (found === 'absent') throw new Error(`no time chip "${label}" with a ✕`);
  const at = JSON.parse(found) as { x: number; y: number };
  await clickAt(page, at.x, at.y);
}

describe('TPL-008-RC — things that repeat, driven against a backend', () => {
  let service: BackendService | undefined;
  let base = '';
  let dataDir = '';
  let enforced = false;
  let driveError = '';
  let stoppedAt = '';
  const R: Record<string, unknown> = {};

  const rows = async (className: string, token: string): Promise<Row[]> => {
    const res = await request<{ results?: Row[] }>(base, 'GET', `/classes/${className}?limit=1000`, {
      headers: { 'x-parse-session-token': token }
    });
    return res.json?.results ?? [];
  };

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-rc-project-'));
    fs.cpSync(TEMPLATE_DIR, projectDir, { recursive: true });
    const placed = placeStarterAssets(projectDir);
    if (placed.failed.length) throw new Error(`starter assets failed: ${placed.failed.join(', ')}`);

    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-rc-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(POLICY));

    service = new BackendService({ dataDir, port: 0, backendId: 'tpl008-rc-drive', backendName: 'TPL-008-RC' });
    const started = await service.start();
    base = started.listen.url;
    enforced = started.security.enforced;
    if (!enforced) return;
    bindProjectToBackend(projectDir, 'tpl008-rc-drive', started.listen.port);

    await withRenderedPage({ projectDir, backendPort: started.listen.port }, async (page) => {
      await page.setViewport({ width: 1280, height: 1400 });
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
        step('§0 sign up');
        await until('sent to sign in', () => pathname(page), (p) => p === '/sign-in');
        await until('sign in drawn', () => text(page), (s) => s.includes('Create account'));
        await fill(page, 'email', PERSON.email);
        await fill(page, 'password', PERSON.password);
        await clickButton(page, 'Create account');
        await until('lands on the list', () => pathname(page), (p) => p === '/');
        const token = String(await until('holds a session', () => currentSession(page), (t) => !!t));
        R.token = token;
        await until('Today tab', () => text(page), (s) => s.includes('Today (0)'));
        await clickButton(page, 'Today (0)');
        await until('Today drawn', () => text(page), (s) => s.includes('Nothing repeats yet.'));

        // ── §1 Twice a day: 08:00 and 20:00 ────────────────────────────────────
        step('§1 daily');
        await fill(page, 'add something that repeats', TABLETS);
        await clickButtonByField(page, 'Add', 'Add something that repeats');
        const routine = async (title: string) => (await rows('Routine', token)).find((r) => r.title === title);
        await until('added', () => routine(TABLETS), (r) => r?.slots === '09:00');
        await until('pane', () => text(page), (s) => s.includes('Stop it'));
        await fill(page, 'a time, like', '20:00');
        await clickButton(page, 'Add time');
        await until('20:00', () => routine(TABLETS), (r) => r?.slots === '09:00,20:00');
        await removeSlot(page, '09:00');
        await until('09:00 out', () => routine(TABLETS), (r) => r?.slots === '20:00');
        await fill(page, 'a time, like', '8am');
        await clickButton(page, 'Add time');
        const daily = await until('08:00 in', () => routine(TABLETS), (r) => r?.slots === '08:00,20:00');
        R.daily = { cadence: daily?.cadence, slots: daily?.slots, startDate: daily?.startDate };
        R.dailyWords = (await until('said', () => text(page), (s) => s.includes('Every day at 08:00 and 20:00'))).includes('Today (2)');
        await wait(1500);
        R.dailyScheduleLines = (await rows('Event', token)).filter((e) => e.taskId === daily?.objectId && e.kind === 'schedule').map((e) => e.summary);

        // ── §2 Tick the morning one ────────────────────────────────────────────
        step('§2 tick');
        await tickToday(page, '08:00', TABLETS);
        await until('dialog', () => text(page), (s) => s.includes('Done. Anything to add?'));
        await clickButton(page, 'Done');
        const checks = await until('check written', () => rows('RoutineCheck', token), (c) => c.length === 1);
        R.check = { routineId: checks[0].routineId === daily?.objectId, date: checks[0].date, time: checks[0].time, note: checks[0].note };
        R.checkAcl = Object.keys((checks[0].ACL as Record<string, unknown>) ?? {});
        await until('Today (1)', () => text(page), (s) => s.includes('Today (1)'));
        R.checkId = checks[0].objectId;

        // ── §3 Weekly, Tue + Thu at 10:00, then stopped ────────────────────────
        step('§3 weekly');
        await fill(page, 'add something that repeats', CLIENT);
        await clickButtonByField(page, 'Add', 'Add something that repeats');
        await until('added', () => routine(CLIENT), (r) => !!r);
        await until('its pane', () => text(page), (s) => s.includes('Every day at 09:00'));
        await clickButton(page, 'Every week');
        await until('weekly', () => routine(CLIENT), (r) => r?.cadence === 'weekly');
        await clickButton(page, 'Tue');
        await clickButton(page, 'Thu');
        await fill(page, 'a time, like', '10');
        await clickButton(page, 'Add time');
        await until('Tue and Thu', () => routine(CLIENT), (r) => /tue@10:00/.test(String(r?.slots)) && /thu@10:00/.test(String(r?.slots)));
        await clickButton(page, 'Stop it');
        await until('why', () => text(page), (s) => s.includes('Why is it stopping?'));
        R.stopDisabled = await buttonDisabled(page, 'Stop it');
        await fill(page, 'what happened', STOP_NOTE);
        await clickButton(page, 'Stop it');
        const stopped = await until('stopped', () => routine(CLIENT), (r) => r?.status === 'stopped');
        R.stopped = { note: stopped?.stopNote, at: !!stopped?.stoppedAt };

        // ── §4 The policy, from outside the app ────────────────────────────────
        step('§4 policy');
        const headers = { 'x-parse-session-token': token };
        R.editCheck = (await request(base, 'PUT', `/classes/RoutineCheck/${R.checkId}`, { headers, body: { note: 'rewritten' } })).status;
        R.deleteCheck = (await request(base, 'DELETE', `/classes/RoutineCheck/${R.checkId}`, { headers })).status;
        R.deleteRoutine = (await request(base, 'DELETE', `/classes/Routine/${daily?.objectId}`, { headers })).status;
        R.checkNoteAfter = (await rows('RoutineCheck', token))[0]?.note;
        const signUp = await request<{ sessionToken?: string }>(base, 'POST', '/users', {
          body: { username: STRANGER.email, email: STRANGER.email, password: STRANGER.password }
        });
        const theirs = String(signUp.json?.sessionToken ?? '');
        R.strangerSees = [(await rows('Routine', theirs)).length, (await rows('RoutineCheck', theirs)).length, theirs !== ''];
        R.consoleErrors = [...page.consoleErrors];
        stoppedAt = 'finished';
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
        R.consoleErrors = [...page.consoleErrors];
        R.textAtFailure = (await text(page).catch(() => '')).slice(0, 3000);
      }
    });

    // ── §5 The host's sender, on this backend's own file ─────────────────────
    const db = [path.join(dataDir, 'data', 'local.db'), path.join(dataDir, 'local.db')].find((f) => fs.existsSync(f));
    R.dbFound = !!db;
    if (db && stoppedAt === 'finished') {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sender = require(SENDER) as {
        routinesDue(db: unknown, owner: string, now: { date: string; hour: number; minute: number }, sub: string, sent: Record<string, string>): Array<{ key: string; time: string }>;
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite');
      const file = new DatabaseSync(db, { readOnly: true });
      const owner = String((file.prepare('select owner from "Routine" limit 1').get() as { owner?: string } | undefined)?.owner ?? '');
      const due = (hour: number, minute: number) => sender.routinesDue(file, owner, { date: TODAY, hour, minute }, 'dev', {}).map((d) => d.time);
      R.sender = { owner: owner !== '', at0805: due(8, 5), at2005: due(20, 5), at2105: due(21, 5) };
      file.close();
    }
  });

  afterAll(async () => {
    await service?.stop();
  });

  it('runs against the shipped, enforced policy', () => {
    expect(enforced).toBe(true);
  });

  it('drives to the end without a step failing', () => {
    expect({ stoppedAt, driveError, textAtFailure: R.textAtFailure }).toEqual({ stoppedAt: 'finished', driveError: '', textAtFailure: undefined });
  });

  it('§1 twice a day, built in the pane: 08:00 and 20:00 from today, both in Today, one schedule line', () => {
    expect(R.daily).toEqual({ cadence: 'daily', slots: '08:00,20:00', startDate: TODAY });
    expect(R.dailyWords).toBe(true);
    expect(R.dailyScheduleLines).toEqual(['Schedule: every day at 08:00 and 20:00']);
  });

  it('§2 a tick is one RoutineCheck on the server — that day, that time, private to its owner — and Today counts one fewer', () => {
    expect(R.check).toEqual({ routineId: true, date: TODAY, time: '08:00', note: '' });
    expect(R.checkAcl).toHaveLength(1);
  });

  it('§3 weekly Tue + Thu, then stopped with a reason', () => {
    expect(R.stopDisabled).toBe(true);
    expect(R.stopped).toEqual({ note: STOP_NOTE, at: true });
  });

  it('§4 a check is never rewritten, nothing is deleted, and a stranger sees none of it', () => {
    expect([R.editCheck, R.deleteCheck, R.deleteRoutine]).toEqual([403, 403, 403]);
    expect(R.checkNoteAfter).toBe('');
    expect(R.strangerSees).toEqual([0, 0, true]);
  });

  it('§5 the sender, reading this backend’s own file: 08:00 is ticked, 20:00 is due in its hour and not after', () => {
    expect(R.dbFound).toBe(true);
    expect(R.sender).toEqual({ owner: true, at0805: [], at2005: ['20:00'], at2105: [] });
  });

  it('no console errors', () => {
    expect(R.errorsByStep).toEqual({});
    expect(R.consoleErrors).toEqual([]);
  });
});
