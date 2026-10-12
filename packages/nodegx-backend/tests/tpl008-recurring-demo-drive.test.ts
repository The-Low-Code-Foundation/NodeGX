/**
 * TPL-008-RC — Today, and things that repeat, driven in a browser on the demo (no backend).
 *
 * The subject is `templates/todo-list-demo/`, copied and served with no backend. Every reading
 * is taken in `beforeAll` and asserted below, so one step that breaks reddens its own rows.
 * 🔴 **The consequence is read from the browser's storage** — the demo's server — not from the
 * screen alone: "the row went away" and "that occurrence was logged as done" are two claims.
 *
 * | AC | § |
 * |---|---|
 * | AC3 Today's order | §0 |
 * | AC4 a tick, with and without a note, leaves Today | §1–§2 |
 * | AC6 a new item → weekly Tue + Thu 09:00 (one history line), an end date, Stop | §3–§5, §7 |
 * | AC5 a missed evening reads Missed | §6 |
 * | RC3 a task ticked from Today is the list's close | §8 |
 * | RC5 the reminder's link opens Today; it all survives a reload | §9 |
 * | a phone: nothing scrolls sideways | §10 |
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { placeStarterAssets } from './helpers/judge';
import { clickAt, clickButton, fill } from './helpers/members-drive';
import { withRenderedPage } from './helpers/site-drive';
import type { RenderedPage } from './helpers/site-drive';
import { buttonDisabled, clickButtonBeside, clickButtonByField, clickWords, text, until, wait } from './helpers/todo-drive';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const DEMO_DIR = path.join(REPO, 'templates', 'todo-list-demo');
/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Demo.ts`. */
const STORAGE_KEY = 'nodegx-todo-list-demo-v1';

const TABLETS = 'Take the tablets';
const SALON = 'Call Salon Collective about the payment';
const VAT = 'Chase the accountant about VAT';
const NOTES = 'Write the release notes';
const CLIENT = 'Call the client about the invoice';
const DINNER = 'Took it with dinner.';
const PAID = 'They paid in full.';
const VAT_NOTE = 'Sent them the figures.';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const NOW = new Date();
const plus = (n: number) => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + n);
const TODAY = iso(plus(0));
const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DOW_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (d: Date) => `${DOW_NAME[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;

interface Row {
  id: string;
  [field: string]: unknown;
}
interface Store {
  Task: Row[];
  Action: Row[];
  Event: Row[];
  Routine: Row[];
  RoutineCheck: Row[];
}

/** Press the tick on the Today line holding both `time` and `title` (a task's line has no time: pass ''). */
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
          var words = (el.innerText || '').split('\\n').map(function (s) { return s.trim(); });
          if (time !== '' && words.indexOf(time) < 0) break;
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

/** Is there a Today line with this time and title? */
async function todayHas(page: RenderedPage, time: string, title: string): Promise<boolean> {
  return (await page.evaluate(`(function () {
    var title = ${JSON.stringify(title)}, time = ${JSON.stringify(time)};
    return Array.prototype.some.call(document.querySelectorAll('body *'), function (e) {
      if (e.children.length !== 0 || (e.textContent || '').trim() !== title) return false;
      for (var el = e.parentElement; el; el = el.parentElement) {
        var bs = el.querySelectorAll('button');
        if (bs.length === 0) continue;
        if (bs.length !== 1) return false;
        return (el.innerText || '').split('\\n').map(function (s) { return s.trim(); }).indexOf(time) >= 0;
      }
      return false;
    });
  })()`)) as boolean;
}

/** Press the button whose label starts with `prefix` ("Today (" — its count changes). */
async function clickStarting(page: RenderedPage, prefix: string): Promise<string> {
  const label = String(
    await page.evaluate(`(function () {
      var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) {
        return (x.innerText || '').trim().indexOf(${JSON.stringify(prefix)}) === 0;
      })[0];
      return b ? (b.innerText || '').trim() : '';
    })()`)
  );
  if (!label) throw new Error(`no button starts "${prefix}"`);
  await clickButton(page, label);
  return label;
}

/** Pick a day in the Nth date picker on the page, through its calendar. */
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

describe('TPL-008-RC — Today and things that repeat, driven on the demo', () => {
  let driveError = '';
  let stoppedAt = '';
  const R: Record<string, unknown> = {};

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-rc-drive-'));
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
        fs.writeFileSync(path.join(dir, `rc-${name}.png`), Buffer.from(res.data, 'base64'));
      };
      const store = async (): Promise<Store | null> => {
        const raw = await page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
        return typeof raw === 'string' ? (JSON.parse(raw) as Store) : null;
      };
      const routine = async (title: string): Promise<Row | undefined> => ((await store())?.Routine ?? []).find((r) => r.title === title);
      const checksOf = async (title: string): Promise<Row[]> => {
        const s = await store();
        const r = (s?.Routine ?? []).find((x) => x.title === title);
        return (s?.RoutineCheck ?? []).filter((c) => c.routineId === r?.id);
      };
      const lines = async (title: string, kind: string, onlyToday = false): Promise<string[]> => {
        const s = await store();
        const id = [...(s?.Task ?? []), ...(s?.Routine ?? [])].find((x) => x.title === title)?.id;
        return (s?.Event ?? [])
          .filter((e) => e.taskId === id && e.kind === kind)
          // The example list has two days of its own "Done" lines before today's.
          .filter((e) => !onlyToday || iso(new Date(String(e.at))) === TODAY)
          .map((e) => (e.body ? `${e.summary} | ${e.body}` : String(e.summary)));
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
        // ── §0 Today, in its order ──────────────────────────────────────────────
        step('§0 boot');
        await until('list drawn', () => text(page), (s) => s.includes(VAT) && s.includes('Today ('));
        R.todayLabel = await clickStarting(page, 'Today (');
        await until('Today drawn', () => text(page), (s) => s.includes('Things that repeat'));
        const t0 = await text(page);
        R.todayOrder = ['Overdue', VAT, '08:00', '20:00', 'Next 7 days', NOTES, 'Things that repeat'].map((w) => t0.indexOf(w));
        R.todayTablets = [await todayHas(page, '08:00', TABLETS), await todayHas(page, '20:00', TABLETS)];
        R.listShowsFour = ['Pilates', SALON, 'Send the month’s invoices', TABLETS].every((w) => t0.includes(w));
        R.pilatesStarts = t0.includes(`Starts ${fmtDay(plus(5))}`);
        await shot('1-today');

        // ── §1 Tick the morning's, no note ──────────────────────────────────────
        step('§1 tick, no note');
        await tickToday(page, '08:00', TABLETS);
        await until('check dialog', () => text(page), (s) => s.includes('Done. Anything to add?'));
        R.doneEnabledEmpty = await buttonDisabled(page, 'Done');
        await clickButton(page, 'Done');
        await until('08:00 logged', () => checksOf(TABLETS), (c) => c.some((x) => x.date === TODAY && x.time === '08:00'));
        await until('08:00 gone from Today', () => todayHas(page, '08:00', TABLETS), (v) => v === false);
        const morning = (await checksOf(TABLETS)).find((x) => x.date === TODAY && x.time === '08:00');
        R.morning = { note: morning?.note, hasDoneAt: typeof morning?.doneAt === 'string' && String(morning?.doneAt).length > 0 };
        R.eveningStill = await todayHas(page, '20:00', TABLETS);
        R.headingCounts = (await text(page)).includes('Today · 1 done');
        await wait(800);
        R.morningLines = (await lines(TABLETS, 'routine-done', true)).filter((l) => l.startsWith('Done (08:00)'));

        // ── §2 Tick the evening's, with a note ──────────────────────────────────
        step('§2 tick, with a note');
        await tickToday(page, '20:00', TABLETS);
        await until('check dialog', () => text(page), (s) => s.includes('Done. Anything to add?'));
        await fill(page, 'what happened', DINNER);
        await clickButton(page, 'Done');
        await until('20:00 logged', () => checksOf(TABLETS), (c) => c.some((x) => x.date === TODAY && x.time === '20:00'));
        R.evening = (await checksOf(TABLETS)).find((x) => x.date === TODAY && x.time === '20:00')?.note;
        await until('20:00 gone from Today', () => todayHas(page, '20:00', TABLETS), (v) => v === false);
        await wait(800);
        R.eveningLines = (await lines(TABLETS, 'routine-done', true)).filter((l) => l.startsWith('Done (20:00)'));

        // ── §3 A new one opens in the pane, every day at 09:00 ──────────────────
        step('§3 add');
        await fill(page, 'add something that repeats', CLIENT);
        await clickButtonByField(page, 'Add', 'Add something that repeats');
        const added = await until('routine written', () => routine(CLIENT), (r) => !!r);
        R.added = { cadence: added?.cadence, slots: added?.slots, startDate: added?.startDate, status: added?.status };
        await until('opened in the pane', () => text(page), (s) => s.includes('Every day at 09:00') && s.includes('Stop it'));
        R.addedLines = await lines(CLIENT, 'routine-added');

        // ── §4 Weekly, Tue and Thu at 09:00, in one line of history ─────────────
        step('§4 weekly');
        await clickButton(page, 'Every week');
        const wd = DOW[NOW.getDay()];
        await until('weekly written', () => routine(CLIENT), (r) => r?.cadence === 'weekly' && r?.slots === `${wd}@09:00`);
        await until('days to pick', () => text(page), (s) => s.includes('Pick the days, then add a time'));
        await clickButton(page, 'Tue');
        await clickButton(page, 'Thu');
        await fill(page, 'a time, like', '9');
        await clickButton(page, 'Add time');
        await until('Tue and Thu added', () => routine(CLIENT), (r) => String(r?.slots).includes('tue@09:00') && String(r?.slots).includes('thu@09:00'));
        R.chipsAfterAdd = await page.evaluate(`(function () {
          return ['Tue', 'Thu'].map(function (w) {
            var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) { return (x.innerText || '').trim() === w; })[0];
            return b ? getComputedStyle(b).backgroundColor : 'absent';
          });
        })()`);
        if (wd !== 'tue' && wd !== 'thu') {
          await clickButtonBeside(page, `${DOW_NAME[NOW.getDay()]} 09:00`, 1, 0);
        }
        R.weekly = (await until('only Tue and Thu', () => routine(CLIENT), (r) => r?.slots === 'tue@09:00,thu@09:00'))?.slots;
        await until('said in words', () => text(page), (s) => s.includes('Every Tue and Thu at 09:00'));
        await wait(1500);
        R.scheduleLines = await lines(CLIENT, 'schedule');
        await shot('2-weekly');

        // ── §5 An end date ──────────────────────────────────────────────────────
        step('§5 end date');
        const end = iso(plus(28));
        await pickDateIn(page, 1, end);
        R.endDate = (await until('end written', () => routine(CLIENT), (r) => r?.endDate === end))?.endDate;
        await until('the list says until when', () => text(page), (s) => s.includes(`Every Tue and Thu at 09:00 · Until ${fmtDay(plus(28))}`));
        R.dateLines = await lines(CLIENT, 'routine-dates');

        // ── §6 The missed evening ───────────────────────────────────────────────
        step('§6 missed');
        await clickWords(page, TABLETS);
        await until('tablets open', () => text(page), (s) => s.includes('Every day at 08:00 and 20:00'));
        const t6 = await text(page);
        R.missedLine = t6.includes(`${fmtDay(plus(-3))} 20:00 · Missed`);
        R.missedCount = (t6.match(/· Missed/g) ?? []).length;
        R.dinnerInHistory = t6.includes(DINNER);
        await shot('3-history');

        // ── §7 Stop one, with a reason ──────────────────────────────────────────
        step('§7 stop');
        await clickWords(page, SALON);
        await until('salon open', () => text(page), (s) => s.includes('Every Fri at 10:00'));
        await clickButton(page, 'Stop it');
        await until('stop dialog', () => text(page), (s) => s.includes('Why is it stopping?'));
        R.stopDisabledEmpty = await buttonDisabled(page, 'Stop it');
        await fill(page, 'what happened', PAID);
        await clickButton(page, 'Stop it');
        const stopped = await until('stopped', () => routine(SALON), (r) => r?.status === 'stopped');
        R.stopped = { stopNote: stopped?.stopNote, hasStoppedAt: !!stopped?.stoppedAt };
        await until('says why', () => text(page), (s) => s.includes('Why it stopped') && s.includes(PAID));
        const t7 = await text(page);
        R.salonLast = t7.lastIndexOf(SALON) > t7.lastIndexOf('Pilates') && t7.includes('Stopped ');
        R.salonInToday = await todayHas(page, '10:00', SALON);

        // ── §8 A task from Today is the list's close ────────────────────────────
        step('§8 close from Today');
        await tickToday(page, '', VAT);
        await until('close dialog', () => text(page), (s) => s.includes('What happened?'));
        R.closeDisabledEmpty = await buttonDisabled(page, 'Close task');
        await fill(page, 'what happened', VAT_NOTE);
        await clickButton(page, 'Close task');
        const closed = await until('closed', async () => ((await store())?.Task ?? []).find((t) => t.title === VAT), (t) => t?.status === 'done');
        R.closedNote = closed?.closingNote;
        await until('gone from Today', () => todayHas(page, '', VAT), (v) => v === false);
        R.listLabelAfter = (await text(page)).includes('List (2)');

        // ── §9 The reminder's link, after a reload ──────────────────────────────
        step('§9 link');
        const before = JSON.stringify(await store());
        await page.navigate('/?view=today');
        await until('Today straight away', () => text(page), (s) => s.includes('Things that repeat'));
        await wait(1000);
        R.linkOpensToday = true;
        R.keptOnReload = JSON.stringify(await store()) === before;
        R.tabletsStillDone = !(await todayHas(page, '08:00', TABLETS)) && !(await todayHas(page, '20:00', TABLETS));

        // ── §10 A phone ─────────────────────────────────────────────────────────
        step('§10 phone');
        await page.setViewport({ width: 390, height: 844, mobile: true });
        await page.navigate('/?view=today');
        await until('Today on a phone', () => text(page), (s) => s.includes('Things that repeat'));
        await wait(800);
        R.phoneToday = await page.evaluate('document.documentElement.scrollWidth');
        await shot('4-phone-today');
        await clickWords(page, CLIENT);
        await until('pane on a phone', () => text(page), (s) => s.includes('Every Tue and Thu at 09:00') && s.includes('← Back'));
        await wait(800);
        R.phonePane = await page.evaluate('document.documentElement.scrollWidth');
        await shot('5-phone-pane');
        R.consoleErrors = [...page.consoleErrors];
        stoppedAt = 'finished';
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
        R.consoleErrors = [...page.consoleErrors];
        R.textAtFailure = (await text(page).catch(() => '')).slice(0, 3000);
      }
    });
  });

  it('drives to the end without a step failing', () => {
    expect({ stoppedAt, driveError, textAtFailure: R.textAtFailure }).toEqual({ stoppedAt: 'finished', driveError: '', textAtFailure: undefined });
  });

  it('§0 Today: overdue, then what repeats by its time, then the next 7 days, then everything that repeats', () => {
    expect(R.todayLabel).toMatch(/^Today \(\d+\)$/);
    const at = R.todayOrder as number[];
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(R.todayTablets).toEqual([true, true]);
    expect(R.listShowsFour).toBe(true);
    expect(R.pilatesStarts).toBe(true);
  });

  it('§1–§2 a tick logs that one occurrence — with no note, or with one — and it leaves Today', () => {
    expect(R.doneEnabledEmpty).toBe(false);
    expect(R.morning).toEqual({ note: '', hasDoneAt: true });
    expect(R.eveningStill).toBe(true);
    expect(R.headingCounts).toBe(true);
    expect(R.morningLines).toEqual(['Done (08:00)']);
    expect(R.evening).toBe(DINNER);
    expect(R.eveningLines).toEqual([`Done (20:00) | ${DINNER}`]);
  });

  it('§3–§5 a new one: every day at 09:00 from today, then Tue and Thu at 09:00 in ONE history line, then an end date', () => {
    expect(R.added).toEqual({ cadence: 'daily', slots: '09:00', startDate: iso(NOW), status: 'active' });
    expect(R.addedLines).toEqual(['Added: every day at 09:00']);
    expect(R.weekly).toBe('tue@09:00,thu@09:00');
    expect(R.scheduleLines).toEqual(['Schedule: every Tue and Thu at 09:00']);
    // The picks are spent once the time is added: neither chip is filled any more.
    expect((R.chipsAfterAdd as string[]).every((c) => c === 'rgba(0, 0, 0, 0)')).toBe(true);
    expect(R.endDate).toBe(iso(plus(28)));
    expect(R.dateLines).toEqual([`Ends ${fmtDay(plus(28))}`]);
  });

  it('§6 the evening nobody ticked reads Missed — and only that one', () => {
    expect(R.missedLine).toBe(true);
    expect(R.missedCount).toBe(1);
    expect(R.dinnerInHistory).toBe(true);
  });

  it('§7 Stop needs a reason, keeps it, and the stopped one goes to the end of the list and out of Today', () => {
    expect(R.stopDisabledEmpty).toBe(true);
    expect(R.stopped).toEqual({ stopNote: PAID, hasStoppedAt: true });
    expect(R.salonLast).toBe(true);
    expect(R.salonInToday).toBe(false);
  });

  it('§8 ticking a task in Today asks what happened, and closes it', () => {
    expect(R.closeDisabledEmpty).toBe(true);
    expect(R.closedNote).toBe(VAT_NOTE);
    expect(R.listLabelAfter).toBe(true);
  });

  it('§9 a reminder’s link opens Today, and a reload keeps every tick', () => {
    expect(R.linkOpensToday).toBe(true);
    expect(R.keptOnReload).toBe(true);
    expect(R.tabletsStillDone).toBe(true);
  });

  it('§10 on a phone nothing scrolls sideways, and there are no console errors anywhere', () => {
    expect([R.phoneToday, R.phonePane]).toEqual([390, 390]);
    expect(R.errorsByStep).toEqual({});
    expect(R.consoleErrors).toEqual([]);
  });
});
