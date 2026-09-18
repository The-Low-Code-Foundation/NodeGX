/**
 * TPL-008 — the todo list, in a browser, against an enforcing backend.
 *
 * The subject is `templates/todo-list/`, the artefact a person receives — copied,
 * bound to a fresh backend that runs the template's own policy, and served.
 * Every reading is taken in `beforeAll` and asserted below, so one step that
 * breaks reddens its own rows and says where it stopped.
 *
 * ## What makes it a measurement
 *
 * - 🔴 **`devOpen: false`**, from the shipped policy, asserted before anything else.
 *   Dev-open disables row ACLs, and "your list is private" would pass on anything.
 * - 🔴 **The browser does everything a person does, through the app's own controls.**
 *   The account is made on the Sign in page; every task, move, close and note is a
 *   click or typing in the rendered page.
 * - 🔴 **The consequence is read from the SERVER**, with the session the browser
 *   holds — "the row moved on screen" and "the position was written" are different
 *   claims, and "the history says so" is a third.
 *
 * | AC | criterion | § |
 * |---|---|---|
 * | AC3 | sign up → three tasks list 1, 2, 3 in the order added | §1 |
 * | AC4 | move #3 up twice → 3,1,2 and ONE history line "Moved #3 → #1" | §2 |
 * | AC5 | close needs a note; closed task leaves the list, shows under Done, has a `closed` line | §3 |
 * | AC6 | next actions: add, tick with a note, describe — each leaves a line | §4 |
 * | AC7 | another account sees none of it; nobody can delete | §6 |
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { request } from './helpers/http';
import { placeStarterAssets } from './helpers/judge';
import { clickButton, currentSession, fill } from './helpers/members-drive';
import { bindProjectToBackend, RenderedPage, withRenderedPage } from './helpers/site-drive';
import { blur, buttonDisabled, clickButtonBeside, clickButtonByField, clickWords, pathname, pickDate, text, themeSwitches, until, wait } from './helpers/todo-drive';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const TEMPLATE_DIR = path.join(REPO, 'templates', 'todo-list');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const POLICY = require(path.join(REPO, 'templates', 'todo-list.security.json')) as Record<string, unknown>;

const PERSON = { email: 'richard@example.invalid', password: 'a long enough password' };
const STRANGER = { email: 'stranger@example.invalid', password: 'another long password' };

const MOT = 'Book the van in for its MOT';
const VAT = 'Chase the accountant about VAT';
const NOTES = 'Write the release notes';
const NOTES_RENAMED = 'Write the 0.2.3 release notes';
const CLOSING_NOTE = 'Booked for Saturday at Mill Lane.';
const ACTION = 'List what shipped';
const TICK_NOTE = 'Pulled it from the merged PRs.';
const DESCRIPTION = 'Lead with the templates, not the fixes.';
const NOTE = 'The draft is in the shared folder.';
const UNTICK_NOTE = 'Two fixes were missing from the list.';
const REOPEN_NOTE = 'The garage cancelled.';
const DEADLINE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Row {
  objectId: string;
  [field: string]: unknown;
}

describe('TPL-008 — the todo list, driven', () => {
  let service: BackendService | undefined;
  let base = '';
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
  const openTitles = async (token: string): Promise<string[]> =>
    (await rows('Task', token))
      .filter((t) => t.status !== 'done')
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((t) => String(t.title));
  const eventsFor = async (token: string, taskTitle: string): Promise<Row[]> => {
    const task = (await rows('Task', token)).find((t) => t.title === taskTitle);
    if (!task) return [];
    return (await rows('Event', token)).filter((e) => e.taskId === task.objectId);
  };
  /** D72: what a screen reader calls each button on screen, read from Chrome's own accessibility tree. */
  const buttonNames = async (page: RenderedPage): Promise<string[]> => {
    const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<unknown> } }).client;
    const tree = (await client.send('Accessibility.getFullAXTree')) as {
      nodes: Array<{ ignored?: boolean; role?: { value?: string }; name?: { value?: string } }>;
    };
    // An icon font's private-use glyph is not a name anyone can hear.
    return tree.nodes
      .filter((n) => !n.ignored && n.role?.value === 'button')
      .map((n) => String(n.name?.value ?? '').replace(/[-]/g, '').trim());
  };
  /** How the first "Move up" button looks: its words take no room, and its icon does. */
  const ICON_BUTTON_LOOK = `(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) {
      return (x.textContent || '').trim() === 'Move up';
    })[0];
    if (!b) return 'absent';
    var glyph = b.querySelector('span');
    var words = Array.prototype.filter.call(b.childNodes, function (n) { return n.nodeType === 3; })[0];
    var range = document.createRange();
    if (words) range.selectNodeContents(words);
    return JSON.stringify({
      fontSize: getComputedStyle(b).fontSize,
      iconDrawn: !!glyph && glyph.getBoundingClientRect().width > 0,
      wordsWidth: words ? Math.round(range.getBoundingClientRect().width) : -1
    });
  })()`;

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-drive-project-'));
    fs.cpSync(TEMPLATE_DIR, projectDir, { recursive: true });
    const placed = placeStarterAssets(projectDir);
    if (placed.failed.length) throw new Error(`starter assets failed: ${placed.failed.join(', ')}`);

    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-drive-data-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(POLICY));

    service = new BackendService({ dataDir, port: 0, backendId: 'tpl008-drive', backendName: 'TPL-008 todo list' });
    const started = await service.start();
    base = started.listen.url;
    enforced = started.security.enforced;
    if (!enforced) return;
    bindProjectToBackend(projectDir, 'tpl008-drive', started.listen.port);

    await withRenderedPage({ projectDir, backendPort: started.listen.port }, async (page) => {
      await page.setViewport({ width: 1280, height: 1400 });
      /**
       * Pictures, only when asked for (`TPL008_SHOTS=<dir>`). A drive that passes
       * says the app works; it says nothing about how it looks.
       */
      const shot = async (name: string): Promise<void> => {
        const dir = process.env.TPL008_SHOTS;
        if (!dir) return;
        fs.mkdirSync(dir, { recursive: true });
        const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
        const res = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(res.data, 'base64'));
      };
      /** Console errors attributed to the step that was running when they arrived. */
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
        // ── §0 A stranger is sent to Sign in ────────────────────────────────────
        step('§0 redirect');
        R.redirectedTo = await until('sent to sign in', () => pathname(page), (p) => p === '/sign-in');
        await until('sign in drawn', () => text(page), (s) => s.includes('Create account'));
        // The theme switch is on this page too (the demo's theme drive grades what it does).
        // 🔴 Headless Chrome follows the machine's own light/dark setting, so read it beside the switch.
        R.signInSystemDark = await page.evaluate("matchMedia('(prefers-color-scheme: dark)').matches");
        R.signInSwitches = await themeSwitches(page);
        // Which collections a signed-out visitor's browser asked for. It should be none.
        R.bootRequests = await page.evaluate(
          "JSON.stringify(performance.getEntriesByType('resource').map(function (e) { return e.name; })" +
            ".filter(function (n) { return n.indexOf('/classes/') !== -1; }))"
        );

        // ── §1 Make an account, add three tasks ─────────────────────────────────
        step('§1 create account');
        await fill(page, 'email', PERSON.email);
        await fill(page, 'password', PERSON.password);
        await clickButton(page, 'Create account');
        R.afterSignUp = await until('lands on the list', () => pathname(page), (p) => p === '/');
        const token = await until('holds a session', () => currentSession(page), (t) => !!t);
        R.session = !!token;
        const tk = String(token);

        step('§1 add tasks');
        for (const [i, title] of [MOT, VAT, NOTES].entries()) {
          await fill(page, 'add a task', title);
          await clickButtonByField(page, 'Add', 'Add a task');
          await until(`task ${i + 1} written`, () => openTitles(tk), (t) => t.length === i + 1);
          await until(`task ${i + 1} drawn`, () => text(page), (s) => s.includes(title));
        }
        R.titlesAfterAdd = await openTitles(tk);
        const shown = await text(page);
        R.drawnInOrder = shown.indexOf(MOT) < shown.indexOf(VAT) && shown.indexOf(VAT) < shown.indexOf(NOTES);
        R.addedSummaries = (await Promise.all([MOT, VAT, NOTES].map((t) => eventsFor(tk, t)))).map((es) =>
          es.map((e) => `${e.kind}: ${e.summary}`)
        );
        R.addFieldEmptied = await page.evaluate(`(function () {
          var f = Array.prototype.filter.call(document.querySelectorAll('input'), function (i) {
            return (i.getAttribute('placeholder') || '').indexOf('Add a task') === 0;
          })[0];
          return f ? f.value : 'absent';
        })()`);

        // ── §2 Move #3 up twice ────────────────────────────────────────────────
        step('§2 first move');
        await clickButtonBeside(page, NOTES, 3, 0);
        await until('first move written', () => openTitles(tk), (t) => t[1] === NOTES);
        await until('first move drawn', () => text(page), (s) => s.indexOf(NOTES) < s.indexOf(VAT));
        await wait(800);
        step('§2 second move');
        await clickButtonBeside(page, NOTES, 3, 0);
        R.titlesAfterMoves = await until('second move written', () => openTitles(tk), (t) => t[0] === NOTES);
        await wait(1500);
        R.moveLines = (await eventsFor(tk, NOTES)).filter((e) => e.kind === 'moved').map((e) => String(e.summary));
        await shot('1-list');
        R.listButtonNames = await buttonNames(page);
        R.iconButtonLook = await page.evaluate(ICON_BUTTON_LOOK);

        // ── §3 Close one, with a note ──────────────────────────────────────────
        step('§3 close');
        await clickButtonBeside(page, MOT, 3, 2);
        await until('dialog open', () => text(page), (s) => s.includes('What happened?'));
        await shot('2-close-dialog');
        R.okDisabledBeforeNote = await buttonDisabled(page, 'Close task');
        await fill(page, 'what happened', CLOSING_NOTE);
        R.okDisabledAfterNote = await buttonDisabled(page, 'Close task');
        await clickButton(page, 'Close task');
        const closed = await until(
          'close written',
          async () => (await rows('Task', tk)).find((t) => t.title === MOT),
          (t) => !!t && t.status === 'done'
        );
        R.closed = { status: closed?.status, closingNote: closed?.closingNote };
        await wait(1500);
        R.closeLines = (await eventsFor(tk, MOT)).filter((e) => e.kind === 'closed').map((e) => `${e.summary} | ${e.body}`);
        R.openAfterClose = await openTitles(tk);
        R.dialogGone = !(await text(page)).includes('What happened?');
        step('§3 done tab');
        await clickButton(page, 'Done (1)');
        R.doneTabText = await until('done tab shows it', () => text(page), (s) => s.includes(CLOSING_NOTE));
        await clickButton(page, 'List (2)');
        await until('back on the list', () => text(page), (s) => s.includes(VAT));

        // ── §4 Open a task: next actions ───────────────────────────────────────
        step('§4 open task');
        await clickWords(page, NOTES);
        await until('detail open', () => text(page), (s) => s.includes('Next actions'));
        step('§4 add action');
        await fill(page, 'add a next action', ACTION);
        await clickButtonByField(page, 'Add', 'Add a next action');
        await until('action written', () => rows('Action', tk), (a) => a.length === 1);
        await until('action drawn', () => text(page), (s) => s.includes(ACTION));
        R.actionNamesBefore = await buttonNames(page);
        step('§4 tick action');
        await clickButtonBeside(page, ACTION, 3, 0);
        await until('tick dialog', () => text(page), (s) => s.includes('A line is enough.'));
        await fill(page, 'what happened', TICK_NOTE);
        await clickButton(page, 'Tick off');
        const ticked = await until('tick written', () => rows('Action', tk), (a) => a[0]?.done === true);
        R.ticked = { done: ticked[0].done, note: ticked[0].note };
        await wait(1500);
        R.actionNamesAfter = await buttonNames(page);
        // s3: untick was wired and never clicked. A ticked line holds one button, its tick box.
        step('§4 untick action');
        await clickButtonBeside(page, ACTION, 1, 0);
        await until('untick dialog', () => text(page), (s) => s.includes('It goes back in at the bottom of the next actions.'));
        await fill(page, 'what happened', UNTICK_NOTE);
        await clickButton(page, 'Untick');
        const unticked = await until('untick written', () => rows('Action', tk), (a) => a[0]?.done === false);
        R.unticked = { done: unticked[0].done, note: unticked[0].note, position: unticked[0].position };
        await wait(1500);
        R.untickLines = (await eventsFor(tk, NOTES)).filter((e) => e.kind === 'action-undone').map((e) => `${e.summary} | ${e.body}`);
        step('§4 describe action');
        await clickWords(page, ACTION);
        await until('description open', () =>
          page.evaluate("document.querySelectorAll('textarea[placeholder=\"Add a description\"]').length"), (n) => Number(n) === 1);
        await fill(page, 'add a description', DESCRIPTION);
        await blur(page);
        const described = await until('description written', () => rows('Action', tk), (a) => a[0]?.description === DESCRIPTION);
        R.description = described[0].description;
        await wait(1500);

        // ── §5 A note, a rename, a deadline ───────────────────────────────────
        step('§5 note');
        await fill(page, 'add a note', NOTE);
        await clickButtonByField(page, 'Add note', 'Add a note');
        await until('note written', () => eventsFor(tk, NOTES), (es) => es.some((e) => e.kind === 'note'));
        await until('note drawn', () => text(page), (s) => s.includes(NOTE));
        step('§5 rename');
        await fill(page, 'task title', NOTES_RENAMED);
        await blur(page);
        await until('rename written', () => openTitles(tk), (t) => t.includes(NOTES_RENAMED));
        await wait(1500);
        // The deadline is picked from the calendar (2026-09-16). Five days out, so the day is always in
        // the future, at most one page of the calendar away, and inside `due()`'s "Due in N days" week.
        step('§5 deadline');
        R.deadlineWanted = DEADLINE;
        R.deadlinePicker = await pickDate(page, DEADLINE);
        const dated = await until(
          'deadline written',
          async () => (await rows('Task', tk)).find((t) => t.title === NOTES_RENAMED),
          (t) => !!t && t.deadline === DEADLINE
        );
        R.deadline = dated?.deadline;
        await wait(1500);
        R.deadlineDue = (await text(page)).match(/Due in \d+ days/)?.[0] ?? '';
        R.historyKinds = (await eventsFor(tk, NOTES_RENAMED)).map((e) => String(e.kind)).sort();
        R.detailText = await text(page);
        await page.evaluate('(function () { window.scrollTo(0, 0); return true; })()');
        await shot('3-detail');
        if (process.env.TPL008_SHOTS) {
          await page.setViewport({ width: 390, height: 844, mobile: true });
          await wait(1000);
          await shot('4-phone-detail');
          await clickButton(page, '← Back');
          await wait(1000);
          await shot('5-phone-list');
          await page.setViewport({ width: 1280, height: 1400 });
          await wait(1000);
        }

        // ── §5b Reopen the closed task (s3: wired and never clicked) ──────────
        step('§5b reopen');
        await clickButton(page, 'Done (1)');
        await until('done tab', () => text(page), (s) => s.includes(CLOSING_NOTE));
        await clickWords(page, MOT);
        await until('reopen offered', () => buttonDisabled(page, 'Reopen'), (d) => d === false);
        await clickButton(page, 'Reopen');
        await until('reopen dialog', () => text(page), (s) => s.includes('Why is it back?'));
        await fill(page, 'what happened', REOPEN_NOTE);
        // The page's own Reopen is behind the dialog now; clickButton takes the reachable one.
        await clickButton(page, 'Reopen');
        const reopened = await until(
          'reopen written',
          async () => (await rows('Task', tk)).find((t) => t.title === MOT),
          (t) => !!t && t.status === 'open'
        );
        R.reopened = { status: reopened?.status, closingNote: reopened?.closingNote, closedAt: reopened?.closedAt };
        await wait(1500);
        R.openAfterReopen = await openTitles(tk);
        R.reopenLines = (await eventsFor(tk, MOT)).filter((e) => e.kind === 'reopened').map((e) => `${e.summary} | ${e.body}`);

        // ── §6 Somebody else, and deleting ─────────────────────────────────────
        step('§6 stranger');
        const signup = await request<{ sessionToken?: string }>(base, 'POST', '/users', {
          body: { username: STRANGER.email, email: STRANGER.email, password: STRANGER.password }
        });
        R.strangerSignup = signup.status;
        const st = String(signup.json?.sessionToken ?? '');
        R.strangerSees = {
          Task: (await rows('Task', st)).length,
          Action: (await rows('Action', st)).length,
          Event: (await rows('Event', st)).length
        };
        const someTask = (await rows('Task', tk))[0];
        const deleted = await request(base, 'DELETE', `/classes/Task/${someTask.objectId}`, {
          headers: { 'x-parse-session-token': tk }
        });
        R.ownerDeleteStatus = deleted.status;
        R.tasksAfterDelete = (await rows('Task', tk)).length;

        // ── §7 Sign out ────────────────────────────────────────────────────────
        step('§7 sign out');
        await clickButton(page, 'Sign out');
        R.afterSignOut = await until('back at sign in', () => pathname(page), (p) => p === '/sign-in');
        R.consoleErrors = [...page.consoleErrors];
        stoppedAt = 'finished';
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
        R.consoleErrors = [...page.consoleErrors];
        R.textAtFailure = (await text(page).catch(() => '')).slice(0, 2000);
      }
    });
  });

  afterAll(async () => {
    await service?.stop();
  });

  const where = () => `stopped at ${stoppedAt}${driveError ? ` — ${driveError}` : ''}`;

  it('runs against an ENFORCING backend (devOpen false)', () => {
    expect(enforced).toBe(true);
  });

  it('drives to the end without a step failing', () => {
    expect({ stoppedAt, driveError, textAtFailure: R.textAtFailure }).toEqual({ stoppedAt: 'finished', driveError: '', textAtFailure: undefined });
  });

  it('§0 sends a signed-out visitor to Sign in', () => {
    expect(R.redirectedTo).toBe('/sign-in');
    // Both buttons are there, and the one showing is the other theme from the machine's own.
    expect(typeof R.signInSystemDark).toBe('boolean');
    expect(R.signInSwitches).toEqual({ inDom: 2, shown: [R.signInSystemDark ? 'Use light theme' : 'Use dark theme'] });
  });

  it('§1 AC3 — an account made on the page; three tasks list in the order added, each with an "Added at #n" line', () => {
    expect([R.afterSignUp, R.session]).toEqual(['/', true]);
    expect(R.titlesAfterAdd).toEqual([MOT, VAT, NOTES]);
    expect(R.drawnInOrder).toBe(true);
    expect(R.addedSummaries).toEqual([['created: Added at #1'], ['created: Added at #2'], ['created: Added at #3']]);
    expect(R.addFieldEmptied).toBe('');
  });

  it('§2 AC4 — two presses of up move #3 to #1, and write ONE line saying so', () => {
    expect(R.titlesAfterMoves).toEqual([NOTES, MOT, VAT]);
    expect(R.moveLines).toEqual(['Moved #3 → #1']);
  });

  it('§3 AC5 — closing asks what happened, refuses an empty answer, and keeps the answer', () => {
    expect([R.okDisabledBeforeNote, R.okDisabledAfterNote]).toEqual([true, false]);
    expect(R.closed).toEqual({ status: 'done', closingNote: CLOSING_NOTE });
    expect(R.closeLines).toEqual([`Closed from #2 | ${CLOSING_NOTE}`]);
    expect(R.openAfterClose).toEqual([NOTES, VAT]);
    expect(R.dialogGone).toBe(true);
    expect(String(R.doneTabText)).toContain(MOT);
  });

  it('§4 AC6 — a next action is added, ticked with a note and described', () => {
    expect(R.ticked).toEqual({ done: true, note: TICK_NOTE });
    expect(R.description).toBe(DESCRIPTION);
  });

  it('§4 unticking asks why, clears what happened and puts the next action at the bottom of the open ones', () => {
    expect(R.unticked).toEqual({ done: false, note: '', position: 2 });
    expect(R.untickLines).toEqual([`Unticked “${ACTION}” | ${UNTICK_NOTE}`]);
  });

  it('§5b reopening asks why, puts the task at the bottom and clears how it was closed', () => {
    expect(R.reopened).toEqual({ status: 'open', closingNote: '', closedAt: '' });
    expect(R.openAfterReopen).toEqual([NOTES_RENAMED, VAT, MOT]);
    expect(R.reopenLines).toEqual([`Reopened at #3 | ${REOPEN_NOTE}`]);
  });

  it('🔴 D72 — every button on the list has a name a screen reader says; the icon still shows and the words do not', () => {
    const names = (R.listButtonNames as string[]) ?? [];
    const count = (name: string) => names.filter((x) => x === name).length;
    // Three open tasks, each with up, down and close — the known-firing half beside "no nameless button".
    expect({ nameless: count(''), up: count('Move up'), down: count('Move down'), close: count('Close this task') }).toEqual({
      nameless: 0,
      up: 3,
      down: 3,
      close: 3
    });
    expect(JSON.parse(String(R.iconButtonLook ?? '"unread"'))).toEqual({ fontSize: '0px', iconDrawn: true, wordsWidth: 0 });
    // The tick box's name follows its state, both ways.
    expect([(R.actionNamesBefore as string[]) ?? [], (R.actionNamesAfter as string[]) ?? []].map((ns) => ns.filter((n) => n.startsWith('Mark ')))).toEqual([
      ['Mark done'],
      ['Mark not done']
    ]);
  });

  it('§5 a note, a rename and a deadline each leave a line; the deadline is picked from a calendar', () => {
    // A date input with the calendar opening on a press — not a text box asking for YYYY-MM-DD.
    expect(R.deadlinePicker).toEqual({ inputType: 'date', calendarOpened: true });
    expect(R.deadline).toBe(R.deadlineWanted);
    expect(R.deadlineDue).toBe('Due in 5 days');
    expect(R.historyKinds).toEqual(
      ['action-added', 'action-described', 'action-done', 'action-undone', 'created', 'deadline', 'moved', 'note', 'renamed'].sort()
    );
    expect(String(R.detailText)).toContain(NOTE);
  });

  it('§6 AC7 — another account sees none of it, and not even the owner can delete', () => {
    expect(R.strangerSignup).toBe(201);
    expect(R.strangerSees).toEqual({ Task: 0, Action: 0, Event: 0 });
    expect(R.ownerDeleteStatus).toBe(403);
    expect(R.tasksAfterDelete).toBe(3);
  });

  it('§7 Sign out goes back to Sign in', () => {
    expect(R.afterSignOut).toBe('/sign-in');
  });

  it('logs no console errors on the way', () => {
    // The step each error arrived during rides along, so a red here says WHERE.
    expect({ errors: R.consoleErrors, byStep: R.errorsByStep }).toEqual({ errors: [], byStep: {} });
  });
});
