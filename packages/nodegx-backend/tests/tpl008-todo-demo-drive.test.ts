/**
 * TPL-008 AC10 — the todo list's browser-only demo, in a browser, with no backend.
 *
 * The subject is `templates/todo-list-demo/`, copied and served with **no backend
 * port at all**. Every reading is taken in `beforeAll` and asserted below, so one step
 * that breaks reddens its own rows and says where it stopped.
 *
 * ## What makes it a measurement
 *
 * - 🔴 **The consequence is read from the browser's storage**, the demo's "server":
 *   "the row moved on screen" and "the move was written where the next visit reads it"
 *   are different claims. §6 reloads the page to grade the second.
 * - 🔴 **"It never talks to a backend" is an absence**, so it sits beside its control:
 *   after the drive, the page makes one request of the shape it looks for, and the
 *   same reading must see it.
 * - It drives the two paths the template's drive did not reach until s3 — **reopen and
 *   untick** — and the one that exists only here: **Reset demo**, including a move of
 *   the same example task on both sides of it (the history line a move extends must be
 *   forgotten with the list, or the move fails to save).
 *
 * | AC10 clause | § |
 * |---|---|
 * | opens on the example list, no sign in, says it is a demo | §0 |
 * | add, move (one line), close with a note | §1–§3 |
 * | reopen and untick, each asking why | §4–§5 |
 * | what a visitor did is still there after a reload | §6 |
 * | Reset demo puts the example list back, and a move after it saves | §7 |
 * | no request to a backend, beside a control that sees one | §8 |
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { placeStarterAssets } from './helpers/judge';
import { clickButton, fill } from './helpers/members-drive';
import { withRenderedPage } from './helpers/site-drive';
import {
  buttonDisabled, clickButtonBeside, clickButtonBesideField, clickButtonByField, clickWords, pathname, text, until, wait
} from './helpers/todo-drive';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const DEMO_DIR = path.join(REPO, 'templates', 'todo-list-demo');
/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Demo.ts` — a drift reads as an empty store at §0. */
const STORAGE_KEY = 'nodegx-todo-list-demo-v1';

const NOTES = 'Write the release notes';
const MOT = 'Book the van in for its MOT';
const VAT = 'Chase the accountant about VAT';
const DOMAIN = 'Renew the domain';
const SHIPPED = 'List what shipped';
const CHAIR = 'Order a new desk chair';
const CLOSING_NOTE = 'Booked for Saturday at Mill Lane.';
const REOPEN_NOTE = 'The garage cancelled.';
const UNTICK_NOTE = 'Two fixes were missing from the list.';

interface Row {
  id: string;
  [field: string]: unknown;
}
interface Store {
  Task: Row[];
  Action: Row[];
  Event: Row[];
}

describe('TPL-008 AC10 — the browser-only demo, driven', () => {
  let driveError = '';
  let stoppedAt = '';
  const R: Record<string, unknown> = {};

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-demo-drive-'));
    fs.cpSync(DEMO_DIR, projectDir, { recursive: true });
    const placed = placeStarterAssets(projectDir);
    if (placed.failed.length) throw new Error(`starter assets failed: ${placed.failed.join(', ')}`);

    await withRenderedPage({ projectDir }, async (page) => {
      await page.setViewport({ width: 1280, height: 1400 });
      const shot = async (name: string): Promise<void> => {
        const dir = process.env.TPL008_SHOTS;
        if (!dir) return;
        fs.mkdirSync(dir, { recursive: true });
        const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
        const res = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(res.data, 'base64'));
      };
      const store = async (): Promise<Store | null> => {
        const raw = await page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
        return typeof raw === 'string' ? (JSON.parse(raw) as Store) : null;
      };
      const openTitles = async (): Promise<string[]> =>
        ((await store())?.Task ?? [])
          .filter((t) => t.status !== 'done')
          .sort((a, b) => Number(a.position) - Number(b.position))
          .map((t) => String(t.title));
      const task = async (title: string): Promise<Row | undefined> => ((await store())?.Task ?? []).find((t) => t.title === title);
      const lines = async (title: string, kind: string): Promise<string[]> => {
        const s = await store();
        const t = (s?.Task ?? []).find((x) => x.title === title);
        return (s?.Event ?? []).filter((e) => e.taskId === t?.id && e.kind === kind).map((e) => (e.body ? `${e.summary} | ${e.body}` : String(e.summary)));
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
        // ── §0 The example list, straight away ─────────────────────────────────
        step('§0 boot');
        await until('example list drawn', () => text(page), (s) => s.includes(VAT));
        R.pathname = await pathname(page);
        const boot = await text(page);
        R.bootOrdered = boot.indexOf(NOTES) < boot.indexOf(MOT) && boot.indexOf(MOT) < boot.indexOf(VAT);
        R.bootShows = ['This is a demo.', 'Reset demo', 'List (3)', 'Done (1)', 'Overdue by 1 day', 'Due tomorrow'].filter((s) => !boot.includes(s));
        R.bootSignIn = boot.includes('Sign in') || boot.includes('Sign out');
        const seeded = await store();
        R.seeded = seeded ? [seeded.Task.length, seeded.Action.length, seeded.Event.length] : null;
        await shot('demo-1-list');

        // ── §1 Add a task ──────────────────────────────────────────────────────
        step('§1 add');
        await fill(page, 'add a task', CHAIR);
        await clickButtonByField(page, 'Add', 'Add a task');
        R.afterAdd = await until('task written', openTitles, (t) => t.length === 4);
        await until('task drawn', () => text(page), (s) => s.includes(CHAIR));
        await wait(1000);
        R.addLines = await lines(CHAIR, 'created');

        // ── §2 Move it up twice ────────────────────────────────────────────────
        step('§2 first move');
        await clickButtonBeside(page, CHAIR, 3, 0);
        await until('first move written', openTitles, (t) => t[2] === CHAIR);
        await wait(800);
        step('§2 second move');
        await clickButtonBeside(page, CHAIR, 3, 0);
        R.afterMoves = await until('second move written', openTitles, (t) => t[1] === CHAIR);
        await wait(1500);
        R.moveLines = await lines(CHAIR, 'moved');

        // ── §3 Close one ───────────────────────────────────────────────────────
        step('§3 close');
        await clickButtonBeside(page, MOT, 3, 2);
        await until('close dialog', () => text(page), (s) => s.includes('What happened?'));
        R.okDisabledBeforeNote = await buttonDisabled(page, 'Close task');
        await fill(page, 'what happened', CLOSING_NOTE);
        await clickButton(page, 'Close task');
        await until('close written', () => task(MOT), (t) => t?.status === 'done');
        await wait(1500);
        R.closeLines = await lines(MOT, 'closed');
        R.afterClose = await openTitles();

        // ── §4 Reopen it ───────────────────────────────────────────────────────
        step('§4 reopen');
        await clickButton(page, 'Done (2)');
        await until('done tab', () => text(page), (s) => s.includes(CLOSING_NOTE));
        await clickWords(page, MOT);
        await until('reopen offered', () => buttonDisabled(page, 'Reopen'), (d) => d === false);
        await clickButton(page, 'Reopen');
        await until('reopen dialog', () => text(page), (s) => s.includes('Why is it back?'));
        await fill(page, 'what happened', REOPEN_NOTE);
        await clickButton(page, 'Reopen');
        const reopened = await until('reopen written', () => task(MOT), (t) => t?.status === 'open');
        R.reopened = { status: reopened?.status, closingNote: reopened?.closingNote, closedAt: reopened?.closedAt };
        await wait(1500);
        R.afterReopen = await openTitles();
        R.reopenLines = await lines(MOT, 'reopened');

        // ── §5 Untick an example next action ───────────────────────────────────
        step('§5 untick');
        await clickButton(page, 'List (4)');
        await until('list tab', () => text(page), (s) => s.includes(CHAIR));
        await clickWords(page, NOTES);
        await until('notes open', () => text(page), (s) => s.includes('Lead with the templates'));
        // s8: a ticked next action's line holds two buttons (tick, description), and its
        // title is a field, so the row is found by what that field holds.
        await clickButtonBesideField(page, SHIPPED, 2, 0);
        await until('untick dialog', () => text(page), (s) => s.includes('It goes back in at the bottom of the next actions.'));
        await fill(page, 'what happened', UNTICK_NOTE);
        await clickButton(page, 'Untick');
        const unticked = await until(
          'untick written',
          async () => ((await store())?.Action ?? []).find((a) => a.title === SHIPPED),
          (a) => a?.done === false
        );
        R.unticked = { done: unticked?.done, note: unticked?.note, position: unticked?.position };
        await wait(1500);
        R.untickLines = await lines(NOTES, 'action-undone');
        await shot('demo-2-detail');

        // ── §6 A reload keeps it ───────────────────────────────────────────────
        step('§6 reload');
        const before = JSON.stringify(await store());
        await page.navigate('/');
        await until('drawn after reload', () => text(page), (s) => s.includes(CHAIR) && s.includes('List (4)'));
        await wait(1000);
        R.storeKeptOnReload = JSON.stringify(await store()) === before;
        const reloaded = await text(page);
        R.reloadOrdered = [NOTES, CHAIR, VAT, MOT].map((t) => reloaded.indexOf(t)).every((at, i, all) => at >= 0 && (i === 0 || all[i - 1] < at));

        // ── §7 Reset, with the same example task moved on both sides ───────────
        step('§7 move before reset');
        await clickButtonBeside(page, VAT, 3, 0);
        await until('VAT moved', openTitles, (t) => t[1] === VAT);
        await wait(1500);
        step('§7 reset');
        await clickButton(page, 'Reset demo');
        R.afterReset = await until('store is the example list again', openTitles, (t) => t.length === 3 && !t.includes(CHAIR));
        await until('example list drawn again', () => text(page), (s) => s.includes('List (3)') && !s.includes(CHAIR));
        const reset = await store();
        R.resetShape = reset ? [reset.Task.length, reset.Action.length, reset.Event.length] : null;
        step('§7 move after reset');
        await clickButtonBeside(page, VAT, 3, 0);
        await until('VAT moved after reset', openTitles, (t) => t[1] === VAT);
        await wait(1500);
        R.postResetMoveLines = await lines(VAT, 'moved');
        R.problemAfterReset = (await text(page)).includes('did not save');
        R.consoleErrors = [...page.consoleErrors];

        // ── §8 No backend was asked anything ───────────────────────────────────
        step('§8 network');
        const BACKEND_SHAPE = `performance.getEntriesByType('resource').map(function (e) { return e.name; }).filter(function (n) {
          return /\\/(classes|users|login|logout|functions|__backend|parse)(\\/|\\?|$)/.test(n);
        })`;
        R.backendRequests = JSON.parse(String(await page.evaluate(`JSON.stringify(${BACKEND_SHAPE})`)));
        // The control: a request of that shape, made on purpose, is seen by the same reading.
        await page.evaluate("fetch('/classes/Probe').then(function () { return 1; }, function () { return 0; })");
        await wait(1000);
        R.probeSeen = (JSON.parse(String(await page.evaluate(`JSON.stringify(${BACKEND_SHAPE})`))) as string[]).some((n) => n.includes('/classes/Probe'));
        stoppedAt = 'finished';
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
        R.consoleErrors = [...page.consoleErrors];
        R.textAtFailure = (await text(page).catch(() => '')).slice(0, 2000);
      }
    });
  });

  const DEMO_NOTE_KINDS = { closed: `Closed from #3 | ${CLOSING_NOTE}` };

  it('drives to the end without a step failing', () => {
    expect({ stoppedAt, driveError, textAtFailure: R.textAtFailure }).toEqual({ stoppedAt: 'finished', driveError: '', textAtFailure: undefined });
  });

  it('§0 opens on the example list — no sign in, in order, saying it is a demo', () => {
    expect(R.pathname).toBe('/');
    expect(R.bootOrdered).toBe(true);
    expect(R.bootShows).toEqual([]);
    expect(R.bootSignIn).toBe(false);
    expect(R.seeded).toEqual([4, 3, 13]);
  });

  it('§1–§2 a new task goes in at the bottom, and two presses of up write ONE line', () => {
    expect(R.afterAdd).toEqual([NOTES, MOT, VAT, CHAIR]);
    expect(R.addLines).toEqual(['Added at #4']);
    expect(R.afterMoves).toEqual([NOTES, CHAIR, MOT, VAT]);
    expect(R.moveLines).toEqual(['Moved #4 → #2']);
  });

  it('§3 closing asks what happened and keeps the answer', () => {
    expect(R.okDisabledBeforeNote).toBe(true);
    expect(R.closeLines).toEqual([DEMO_NOTE_KINDS.closed]);
    expect(R.afterClose).toEqual([NOTES, CHAIR, VAT]);
  });

  it('§4 reopening asks why, puts the task at the bottom and clears how it was closed', () => {
    expect(R.reopened).toEqual({ status: 'open', closingNote: '', closedAt: '' });
    expect(R.afterReopen).toEqual([NOTES, CHAIR, VAT, MOT]);
    expect(R.reopenLines).toEqual([`Reopened at #4 | ${REOPEN_NOTE}`]);
  });

  it('§5 unticking asks why, and puts the next action at the bottom of the open ones', () => {
    expect(R.unticked).toEqual({ done: false, note: '', position: 3 });
    expect(R.untickLines).toEqual([`Unticked “${SHIPPED}” | ${UNTICK_NOTE}`]);
  });

  it('§6 what the visitor did is still there after a reload', () => {
    expect(R.storeKeptOnReload).toBe(true);
    expect(R.reloadOrdered).toBe(true);
  });

  it('§7 Reset demo puts the example list back, and a move of the same task after it saves as a new line', () => {
    expect(R.afterReset).toEqual([NOTES, MOT, VAT]);
    expect(R.resetShape).toEqual([4, 3, 13]);
    expect(R.postResetMoveLines).toEqual(['Moved #3 → #2']);
    expect(R.problemAfterReset).toBe(false);
  });

  it('§8 asks no backend anything — and the same reading sees a request that shape when one is made', () => {
    expect(R.backendRequests).toEqual([]);
    expect(R.probeSeen).toBe(true);
  });

  it('logs no console errors on the way', () => {
    expect({ errors: R.consoleErrors, byStep: R.errorsByStep }).toEqual({ errors: [], byStep: {} });
  });
});
