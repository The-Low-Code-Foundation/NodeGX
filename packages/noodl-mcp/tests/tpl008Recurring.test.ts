/**
 * TPL-008-RC — Today, and things that repeat: the decisions that are invisible in a screenshot.
 *
 * Every script here runs the way the runtime runs a Function node (`Inputs` in, `Outputs` out,
 * signals as calls), on fixtures dated relative to the moment the suite runs — so "today" is
 * always today, and a slot is late or not because of the `now` handed in, never the wall clock.
 * No build: the template's own artefact is graded by `tpl008Template.test.ts`.
 *
 * - §1 the schedule rules (RC6, RC8) — one source, `SCHEDULE_FNS`;
 * - §2 Today (RC2) and the list of everything that repeats;
 * - §3 a routine's pane, and Missed (RC4);
 * - §4 the commands: schedule, dates, a tick (RC3);
 * - §5 the host's sender (RC5) — the same schedule, byte for byte, against a real SQLite file;
 * - §6 the demo: example items, and an old visitor's list keeps everything it had (AC7);
 * - §7 the policy.
 *
 * @module noodl-mcp/tests/tpl008Recurring.test
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  CLOCK_SCRIPT,
  ROUTINE_DATES_SCRIPT,
  SAY_REFUSAL_SCRIPT,
  SCHEDULE_FNS,
  SELECTED_ROUTINE_SCRIPT,
  SET_SCHEDULE_SCRIPT,
  TICK_ROUTINE_SCRIPT,
  TODAY_ROWS_SCRIPT,
  VIEW_LINK_SCRIPT
} from './tpl008Components';
import { DEMO_READ_SCRIPT, DEMO_STORAGE_KEY } from './tpl008Demo';

const REPO = path.join(__dirname, '..', '..', '..');
const SENDER = path.join(REPO, 'dev-docs', 'tasks', 'phase-78-the-templates', 'todo-digitalbricks', 'push', 'sender.js');
const POLICY = path.join(REPO, 'templates', 'todo-list.security.json');

/** Run a Function node's script the way the runtime does: `Inputs` in, `Outputs` out, signals as calls. */
function run(script: string, inputs: Record<string, unknown>, win?: unknown): { outputs: Record<string, unknown>; signals: string[] } {
  const signals: string[] = [];
  const outputs = new Proxy({} as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      return () => signals.push(key);
    }
  });
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', 'window', script)(inputs, outputs, win ?? {});
  return { outputs: { ...outputs }, signals };
}

interface Sched {
  schedSlots(cadence: string, text: string): Array<{ day: string; time: string; key: string }>;
  schedOn(r: Record<string, unknown>, d: Date): string[];
  schedDescribe(r: Record<string, unknown>): string;
  schedTime(text: string): string | null;
  schedDate(text: string): Date | null;
  schedSlotLabel(cadence: string, s: { day: string; time: string }): string;
}
// eslint-disable-next-line no-new-func
const S = new Function(`${SCHEDULE_FNS}\nreturn { schedSlots, schedOn, schedDescribe, schedTime, schedDate, schedSlotLabel };`)() as Sched;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const NOW = new Date();
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const plus = (n: number) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n);
const WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
/** Noon today — before it, 08:00 is late and 20:00 is not. */
const NOON = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 0).getTime();

// ── §1 ─────────────────────────────────────────────────────────────────────

describe('§1 the schedule (RC6, RC8)', () => {
  it('slots: kept in order, deduplicated, and anything that is not a slot of that timescale dropped', () => {
    expect(S.schedSlots('weekly', 'thu@09:00, tue@09:00,xyz@10:00,tue@09:00,tue@25:00,Wed @ 07:30').map((s) => s.key)).toEqual([
      'tue@09:00',
      'wed@07:30',
      'thu@09:00'
    ]);
    expect(S.schedSlots('monthly', '31@09:00,last@17:00,05@08:00,0@01:00,32@01:00').map((s) => s.key)).toEqual(['5@08:00', '31@09:00', 'last@17:00']);
    // A daily one has no days: whatever is written before the @ is not a day.
    expect(S.schedSlots('daily', '20:00,08:00,tue@08:00').map((s) => s.key)).toEqual(['08:00', '20:00']);
    expect(S.schedSlots('hourly', '08:00')).toEqual([]);
  });

  it('weekly: on its weekdays only, each time once, in time order', () => {
    const r = { cadence: 'weekly', slots: 'tue@14:00,tue@09:00,thu@09:00', startDate: '2026-09-01', endDate: '', status: 'active' };
    expect(S.schedOn(r, day(2026, 9, 22))).toEqual(['09:00', '14:00']); // a Tuesday
    expect(S.schedOn(r, day(2026, 9, 23))).toEqual([]); // a Wednesday
    expect(S.schedOn(r, day(2026, 9, 24))).toEqual(['09:00']); // a Thursday
  });

  it('monthly: a 31st in a 30-day month is its last day; "last" is the last day; one occurrence per time', () => {
    const r = { cadence: 'monthly', slots: '31@09:00,last@09:00,last@17:00,15@08:00', startDate: '2026-01-01', status: 'active' };
    expect(S.schedOn(r, day(2026, 9, 30))).toEqual(['09:00', '17:00']);
    expect(S.schedOn(r, day(2026, 10, 30))).toEqual([]);
    expect(S.schedOn(r, day(2026, 10, 31))).toEqual(['09:00', '17:00']);
    expect(S.schedOn(r, day(2026, 2, 28))).toEqual(['09:00', '17:00']);
    expect(S.schedOn(r, day(2026, 9, 15))).toEqual(['08:00']);
    // 🔴 The 31st ALONE — the fixture above also has "last" at 09:00, which hides a missing clamp
    // (measured: with the clamp removed, only the sender's byte check went red).
    const only31 = { cadence: 'monthly', slots: '31@08:30', startDate: '2026-01-01', status: 'active' };
    expect([day(2026, 9, 30), day(2026, 2, 28), day(2026, 10, 30), day(2026, 10, 31)].map((d) => S.schedOn(only31, d))).toEqual([
      ['08:30'], ['08:30'], [], ['08:30']
    ]);
  });

  it('start, end and stop bound it — from the day it stopped, nothing', () => {
    const r = { cadence: 'daily', slots: '08:00', startDate: '2026-09-10', endDate: '2026-09-20', status: 'active' };
    expect(S.schedOn(r, day(2026, 9, 9))).toEqual([]);
    expect(S.schedOn(r, day(2026, 9, 10))).toEqual(['08:00']);
    expect(S.schedOn(r, day(2026, 9, 20))).toEqual(['08:00']);
    expect(S.schedOn(r, day(2026, 9, 21))).toEqual([]);
    const stopped = { ...r, endDate: '', status: 'stopped', stoppedAt: new Date(2026, 8, 15, 11, 30).toISOString() };
    expect(S.schedOn(stopped, day(2026, 9, 14))).toEqual(['08:00']);
    expect(S.schedOn(stopped, day(2026, 9, 15))).toEqual([]);
  });

  it('says what it is in words', () => {
    expect(S.schedDescribe({ cadence: 'daily', slots: '20:00,08:00' })).toBe('Every day at 08:00 and 20:00');
    expect(S.schedDescribe({ cadence: 'weekly', slots: 'thu@09:00,tue@09:00' })).toBe('Every Tue and Thu at 09:00');
    expect(S.schedDescribe({ cadence: 'weekly', slots: 'tue@09:00,thu@14:00' })).toBe('Every Tue at 09:00; Thu at 14:00');
    expect(S.schedDescribe({ cadence: 'monthly', slots: '1@09:00,15@09:00,last@09:00' })).toBe('Every month on the 1st, the 15th and the last day at 09:00');
    expect(S.schedDescribe({ cadence: 'monthly', slots: '22@09:00' })).toBe('Every month on the 22nd at 09:00');
    expect(S.schedDescribe({ cadence: 'weekly', slots: '' })).toBe('No times yet');
    expect(S.schedSlotLabel('monthly', { day: 'last', time: '17:00' })).toBe('Last day 17:00');
    expect(S.schedSlotLabel('weekly', { day: 'fri', time: '10:00' })).toBe('Fri 10:00');
  });

  it('reads a typed time the way a person types one, and refuses what is not a time', () => {
    const read = (t: string) => S.schedTime(t);
    expect(['8', '08', '8:30', '830', '0830', '20.15', '2015', '8pm', '8:30 PM', '12am', '12pm', ' 7 h 05 '].map(read)).toEqual([
      '08:00', '08:00', '08:30', '08:30', '08:30', '20:15', '20:15', '20:00', '20:30', '00:00', '12:00', '07:05'
    ]);
    expect(['24:00', '8:61', '13pm', '0am', 'abc', '', '8:3'].map(read)).toEqual([null, null, null, null, null, null, null]);
    expect(S.schedDate('2026-02-30')).toBeNull();
    expect(S.schedDate('2026-02-28')?.getDate()).toBe(28);
  });
});

// ── §2 ─────────────────────────────────────────────────────────────────────

describe('§2 Today (RC2), and everything that repeats', () => {
  const tasks = [
    { id: 'late', title: 'Chase the VAT', position: 3, status: 'open', deadline: iso(plus(-2)) },
    { id: 'now', title: 'Pay the rent', position: 2, status: 'open', deadline: iso(TODAY) },
    { id: 'soon', title: 'Renew the domain', position: 1, status: 'open', deadline: iso(plus(3)) },
    { id: 'far', title: 'Plan the holiday', position: 4, status: 'open', deadline: iso(plus(10)) },
    { id: 'shut', title: 'Old one', position: 5, status: 'done', deadline: iso(plus(-1)) },
    { id: 'none', title: 'No deadline', position: 6, status: 'open', deadline: '' }
  ];
  const actions = [{ id: 'a1', taskId: 'late', title: 'Ring them', position: 1, done: false }];
  const routines = [
    { id: 'tabs', title: 'Take the tablets', cadence: 'daily', slots: '08:00,20:00', startDate: iso(plus(-5)), endDate: '', status: 'active' },
    { id: 'walk', title: 'A walk', cadence: 'weekly', slots: `${WEEK[TODAY.getDay()]}@07:00`, startDate: iso(plus(-20)), endDate: '', status: 'active' },
    { id: 'gym', title: 'Gym', cadence: 'daily', slots: '18:00', startDate: iso(plus(1)), endDate: '', status: 'active' },
    { id: 'gone', title: 'Old habit', cadence: 'daily', slots: '09:00', startDate: iso(plus(-9)), endDate: '', status: 'stopped', stoppedAt: plus(-2).toISOString() },
    { id: 'over', title: 'Finished course', cadence: 'daily', slots: '10:00', startDate: iso(plus(-9)), endDate: iso(plus(-1)), status: 'active' }
  ];
  const checks = [{ id: 'c1', routineId: 'tabs', date: iso(TODAY), time: '08:00', doneAt: '', note: '' }];
  const built = run(TODAY_ROWS_SCRIPT, { tasks, actions, routines, checks, selectedId: 'tabs', now: NOON });
  const rows = built.outputs.rows as Array<Record<string, unknown>>;

  it('overdue, then what repeats today by its time, then due today, then the next 7 days — each heading once', () => {
    expect(rows.map((r) => [r.heading, r.title, r.time])).toEqual([
      ['Overdue', 'Chase the VAT', ''],
      ['Today · 1 done', 'A walk', '07:00'],
      ['Today · 1 done', 'Take the tablets', '20:00'],
      ['Due today', 'Pay the rent', ''],
      ['Next 7 days', 'Renew the domain', '']
    ]);
    expect(rows.map((r) => r.showHeading)).toEqual([true, true, false, true, true]);
    expect(built.outputs.todayLabel).toBe('Today (4)');
  });

  it('an occurrence already ticked is gone; one whose time has passed says so, in red; the next is quiet', () => {
    const walk = rows[1];
    const tablets = rows[2];
    expect([walk.meta, walk.hasMeta, walk.metaColor]).toEqual(['Not done yet', true, 'var(--destructive)']);
    expect([tablets.hasMeta, tablets.isRoutine, tablets.bg]).toEqual([false, true, 'var(--surface)']);
    expect(tablets.id).toBe(`r:tabs|${iso(TODAY)}|20:00`);
    expect([tablets.routineId, tablets.date, tablets.targetId]).toEqual(['tabs', iso(TODAY), 'tabs']);
  });

  it('a task keeps its next action and its lateness; every row id is unique', () => {
    expect([rows[0].meta, rows[0].metaColor, rows[0].isRoutine, rows[0].targetId]).toEqual([
      'Overdue by 2 days · Next: Ring them',
      'var(--destructive)',
      false,
      'late'
    ]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('everything that repeats: current ones by title first, finished ones after in the quiet colour', () => {
    const list = built.outputs.routineRows as Array<Record<string, unknown>>;
    expect(list.map((r) => r.title)).toEqual(['A walk', 'Gym', 'Take the tablets', 'Finished course', 'Old habit']);
    expect(list[1].meta).toBe(`Every day at 18:00 · Starts ${fmtDay(plus(1))}`);
    expect(String(list[3].meta)).toMatch(/^Every day at 10:00 · Ended /);
    expect(String(list[4].meta)).toMatch(/^Every day at 09:00 · Stopped /);
    expect(list.map((r) => r.titleColor)).toEqual([
      'var(--foreground)', 'var(--foreground)', 'var(--foreground)', 'var(--muted-foreground)', 'var(--muted-foreground)'
    ]);
  });

  it('an empty day is an empty list, and the tab says 0', () => {
    const empty = run(TODAY_ROWS_SCRIPT, { tasks: [], actions: [], routines: [], checks: [], selectedId: '', now: NOON });
    expect([empty.outputs.rows, empty.outputs.todayLabel]).toEqual([[], 'Today (0)']);
  });
});

function fmtDay(d: Date): string {
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${d.getDate()} ${
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
  }`;
}

// ── §3 ─────────────────────────────────────────────────────────────────────

describe('§3 a routine’s pane, and Missed (RC4)', () => {
  const r = {
    id: 'tabs',
    title: 'Take the tablets',
    cadence: 'daily',
    slots: '08:00,20:00',
    startDate: iso(plus(-10)),
    endDate: '',
    status: 'active',
    createdAt: plus(-3).toISOString()
  };
  const checks = [
    { routineId: 'tabs', date: iso(plus(-3)), time: '08:00' },
    { routineId: 'tabs', date: iso(plus(-3)), time: '20:00' },
    { routineId: 'tabs', date: iso(plus(-2)), time: '08:00' },
    { routineId: 'tabs', date: iso(plus(-1)), time: '08:00' },
    { routineId: 'tabs', date: iso(plus(-1)), time: '20:00' }
  ];
  const events = [
    { id: 'e1', taskId: 'tabs', kind: 'routine-added', summary: 'Added: every day at 09:00', at: plus(-3).toISOString() },
    { id: 'e2', taskId: 'other', kind: 'note', summary: 'Note', at: plus(-1).toISOString() }
  ];
  const pane = run(SELECTED_ROUTINE_SCRIPT, { routines: [r], checks, events, selectedId: 'tabs', days: '', now: NOON });

  it('a missed occurrence is a line — none before the routine existed, none for today, never a ticked one', () => {
    const lines = (pane.outputs.historyRows as Array<{ id: string; line: string }>).map((h) => h.line);
    expect(lines.filter((l) => l.endsWith('Missed'))).toEqual([`${fmtDay(plus(-2))} 20:00 · Missed`]);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/Added: every day at 09:00$/);
  });

  it('what it shows: its words, its times, no days to pick for a daily one, and Stop', () => {
    expect(pane.outputs).toMatchObject({
      found: true,
      cadence: 'daily',
      scheduleLine: 'Every day at 08:00 and 20:00',
      statusLine: `Since ${fmtDay(plus(-10))} · no end date`,
      noSlots: false,
      showDays: false,
      canStop: true,
      isStopped: false
    });
    expect((pane.outputs.slotRows as unknown[]).length).toBe(2);
  });

  it('weekly shows seven days and monthly 1–31 and Last, the picked ones filled', () => {
    const weekly = run(SELECTED_ROUTINE_SCRIPT, { routines: [{ ...r, cadence: 'weekly', slots: 'tue@09:00' }], checks: [], events: [], selectedId: 'tabs', days: 'tue,fri', now: NOON });
    const chips = weekly.outputs.dayChips as Array<{ id: string; bg: string }>;
    expect(chips.map((c) => c.id)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    expect(chips.filter((c) => c.bg === 'var(--primary)').map((c) => c.id)).toEqual(['tue', 'fri']);
    const monthly = run(SELECTED_ROUTINE_SCRIPT, { routines: [{ ...r, cadence: 'monthly', slots: '' }], checks: [], events: [], selectedId: 'tabs', days: '', now: NOON });
    expect((monthly.outputs.dayChips as unknown[]).length).toBe(32);
    expect([monthly.outputs.noSlots, monthly.outputs.statusColor]).toEqual([true, 'var(--destructive)']);
  });

  it('stopped or ended: no Stop, and a stopped one says why', () => {
    const stopped = run(SELECTED_ROUTINE_SCRIPT, {
      routines: [{ ...r, status: 'stopped', stoppedAt: plus(-1).toISOString(), stopNote: 'Course finished.' }],
      checks,
      events: [],
      selectedId: 'tabs',
      days: '',
      now: NOON
    });
    expect(stopped.outputs).toMatchObject({ canStop: false, isStopped: true, stopNote: 'Course finished.' });
    const ended = run(SELECTED_ROUTINE_SCRIPT, { routines: [{ ...r, endDate: iso(plus(-1)) }], checks, events: [], selectedId: 'tabs', days: '', now: NOON });
    expect([ended.outputs.canStop, ended.outputs.statusLine]).toEqual([false, `Ended ${fmtDay(plus(-1))}`]);
    expect(run(SELECTED_ROUTINE_SCRIPT, { routines: [r], checks, events, selectedId: 'nope', now: NOON }).outputs.found).toBe(false);
  });
});

// ── §4 ─────────────────────────────────────────────────────────────────────

/** The words of a guard's verdict (`refusalAbout` in `tpl008Components.ts`): '' accepted, a sentence refused. */
const said = (r: { outputs: Record<string, unknown> }) => (r.outputs.verdict as { about: string; error: string } | undefined)?.error;

describe('§4 the commands', () => {
  const daily = { id: 'x', title: 'Tablets', cadence: 'daily', slots: '08:00,20:00', startDate: '2026-09-01', endDate: '' };
  const weekly = { id: 'w', title: 'Call', cadence: 'weekly', slots: 'fri@10:00', startDate: '2026-09-01', endDate: '' };
  const sched = (row: Record<string, unknown>, change: string, extra: Record<string, unknown> = {}) =>
    run(SET_SCHEDULE_SCRIPT, { routines: [row], routineId: row.id, change, ...extra });

  it('a new timescale keeps the times, on today’s weekday or date', () => {
    const toWeekly = sched(daily, 'weekly');
    const d = WEEK[new Date().getDay()];
    expect([toWeekly.outputs.cadence, toWeekly.outputs.slots, toWeekly.signals]).toEqual(['weekly', `${d}@08:00,${d}@20:00`, ['go']]);
    const toMonthly = sched(weekly, 'monthly');
    expect(toMonthly.outputs.slots).toBe(`${new Date().getDate()}@10:00`);
    expect(sched(weekly, 'daily').outputs.slots).toBe('10:00');
    expect(sched(daily, 'daily').signals).toEqual([]);
  });

  it('add: the typed time on every day picked — Tuesday and Thursday at 9 is one Add', () => {
    const added = sched(weekly, 'add', { days: 'thu,tue', timeText: '9' });
    expect([added.outputs.slots, added.outputs.summary, added.outputs.verdict]).toEqual([
      'tue@09:00,thu@09:00,fri@10:00',
      'Schedule: every Tue at 09:00; Thu at 09:00; Fri at 10:00',
      { about: 'w', error: '' }
    ]);
    expect(sched(daily, 'add', { timeText: '1pm' }).outputs.slots).toBe('08:00,13:00,20:00');
  });

  it('add refuses in words: not a time, no day picked, already there — and writes nothing', () => {
    const cases = [
      sched(daily, 'add', { timeText: 'soon' }),
      sched(weekly, 'add', { days: '', timeText: '09:00' }),
      sched(daily, 'add', { timeText: '8' })
    ];
    expect(cases.map((c) => [said(c), c.signals])).toEqual([
      ['Type a time like 08:00, 8:30 or 8pm.', []],
      ['Pick at least one day first.', []],
      ['That time is already there.', []]
    ]);
  });

  it('remove takes one time out, and its words follow', () => {
    const removed = sched(daily, 'remove', { slotKey: '20:00' });
    expect([removed.outputs.slots, removed.outputs.summary]).toEqual(['08:00', 'Schedule: every day at 08:00']);
  });

  it('dates: a start is required, an end may be cleared, and it never ends before it starts', () => {
    const dates = (which: string, text: string, row = { ...daily, endDate: '2026-10-31' }) =>
      run(ROUTINE_DATES_SCRIPT, { routines: [row], routineId: row.id, which, text });
    expect(dates('end', '2026-08-01').outputs.verdict).toEqual({ about: 'x', error: 'It cannot end before it starts.' });
    expect(said(dates('start', '2026-11-05'))).toBe('It cannot start after it ends.');
    expect(said(dates('start', ''))).toBe('It needs a start date — the day it first comes up.');
    expect(said(dates('end', '2026-02-30'))).toBe('Use a date like 2026-10-06.');
    const cleared = dates('end', '');
    expect([cleared.outputs.endDate, cleared.outputs.startDate, cleared.outputs.summary, cleared.signals]).toEqual(['', '2026-09-01', 'End date cleared', ['go']]);
    expect(dates('end', '2026-10-31').signals).toEqual([]);
    expect(dates('start', '2026-09-08').outputs.summary).toBe('Starts Tue 8 Sep');
  });

  it('P109-S43-ROUTINEREFUSAL — a refusal is said while its record is open, and again when made again', () => {
    // One node: `this` is kept between runs, as the runtime keeps it.
    const self = {};
    const say = (verdict: unknown, about: string) => {
      const outputs: Record<string, unknown> = {};
      // eslint-disable-next-line no-new-func
      new Function('Inputs', 'Outputs', SAY_REFUSAL_SCRIPT).call(self, { verdict, about }, outputs);
      return [outputs.error, outputs.hasError];
    };
    const refused = { about: 'pilates', error: 'It cannot end before it starts.' };
    expect(say(undefined, 'pilates')).toEqual(['', false]);
    expect(say(refused, 'pilates')).toEqual([refused.error, true]);
    expect(say(refused, 'tablets')).toEqual(['', false]);
    expect(say(refused, 'pilates')).toEqual(['', false]);
    expect(say({ ...refused }, 'pilates')).toEqual([refused.error, true]);
    expect(say({ about: 'pilates', error: '' }, 'pilates')).toEqual(['', false]);
    // A verdict about a record no longer open when it lands is not said.
    expect(say({ ...refused }, 'tablets')).toEqual(['', false]);
  });

  it('a tick is one occurrence — that routine, that day, that time — with or without a note', () => {
    const rows = [
      { id: 'r:tabs|2026-09-23|20:00', isRoutine: true, routineId: 'tabs', date: '2026-09-23', time: '20:00' },
      { id: 't:task', isRoutine: false, targetId: 'task' }
    ];
    const ticked = run(TICK_ROUTINE_SCRIPT, { rows, rowId: 'r:tabs|2026-09-23|20:00', note: '  ' });
    expect([ticked.outputs.routineId, ticked.outputs.date, ticked.outputs.time, ticked.outputs.note, ticked.outputs.summary, ticked.signals]).toEqual([
      'tabs', '2026-09-23', '20:00', '', 'Done (20:00)', ['go']
    ]);
    expect(run(TICK_ROUTINE_SCRIPT, { rows, rowId: 't:task', note: 'x' }).signals).toEqual([]);
  });

  it('the clock keeps one interval, and the reminder link opens Today', () => {
    expect(CLOCK_SCRIPT).toMatch(/if \(this\.clockStarted\) return;/);
    expect(run(VIEW_LINK_SCRIPT, {}, { location: { search: '?view=today' } }).signals).toEqual(['today']);
    expect(run(VIEW_LINK_SCRIPT, {}, { location: { search: '?task=abc' } }).signals).toEqual([]);
  });
});

// ── §5 ─────────────────────────────────────────────────────────────────────

describe('§5 the host’s sender (RC5)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sender = require(SENDER) as {
    routinesDue(db: unknown, owner: string, now: { date: string; hour: number; minute: number }, sub: string, sent: Record<string, string>): Array<{ time: string; key: string }>;
    routineMessage(r: Record<string, unknown>, time: string, date: string): Record<string, string>;
    SCHEDULE_FNS_MARKERS: [string, string];
  };

  it('🔴 carries the template’s schedule byte for byte — the phone buzzes on the days Today lists', () => {
    const text = fs.readFileSync(SENDER, 'utf8');
    const [begin, end] = sender.SCHEDULE_FNS_MARKERS;
    const from = text.indexOf('\n', text.indexOf(begin)) + 1;
    const to = text.indexOf(end);
    expect(from).toBeGreaterThan(0);
    expect(text.slice(from, to)).toBe(SCHEDULE_FNS);
  });

  it('pushes a slot once, within the hour after its time, never once it is ticked, never someone else’s', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-rc-sender-')), 'local.db');
    const db = new DatabaseSync(file);
    db.exec('create table "Routine" (objectId text, owner text, title text, cadence text, slots text, startDate text, endDate text, status text, stoppedAt text)');
    db.exec('create table "RoutineCheck" (objectId text, owner text, routineId text, date text, time text)');
    const add = db.prepare('insert into "Routine" values (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    add.run('tabs', 'me', 'Take the tablets', 'daily', '08:00,20:00', '2026-09-01', '', 'active', '');
    add.run('call', 'me', 'Call the client', 'weekly', 'wed@08:00', '2026-09-01', '2026-09-30', 'active', '');
    add.run('theirs', 'them', 'Not mine', 'daily', '08:00', '2026-09-01', '', 'active', '');
    add.run('quit', 'me', 'Stopped', 'daily', '08:00', '2026-09-01', '', 'stopped', '2026-09-20T10:00:00.000Z');
    const due = (hour: number, minute: number, sent: Record<string, string> = {}, date = '2026-09-23') =>
      sender.routinesDue(db, 'me', { date, hour, minute }, 'dev1', sent).map((d) => d.key);

    expect(due(7, 59)).toEqual([]);
    expect(due(8, 0)).toEqual(['dev1|tabs|2026-09-23|08:00', 'dev1|call|2026-09-23|08:00']);
    expect(due(8, 59)).toHaveLength(2);
    expect(due(9, 0)).toEqual([]);
    expect(due(8, 10, { 'dev1|tabs|2026-09-23|08:00': '2026-09-23' })).toEqual(['dev1|call|2026-09-23|08:00']);
    // Thursday: the weekly one is not due; after its end date, nothing.
    expect(due(8, 5, {}, '2026-09-24')).toEqual(['dev1|tabs|2026-09-24|08:00']);
    expect(due(8, 5, {}, '2026-10-07')).toEqual(['dev1|tabs|2026-10-07|08:00']);
    db.prepare('insert into "RoutineCheck" values (?, ?, ?, ?, ?)').run('c1', 'me', 'tabs', '2026-09-23', '08:00');
    expect(due(8, 30)).toEqual(['dev1|call|2026-09-23|08:00']);
    db.close();

    expect(sender.routineMessage({ objectId: 'tabs', title: 'Take the tablets' }, '20:00', '2026-09-23')).toEqual({
      title: 'Take the tablets',
      body: '20:00 · tick it off in Today',
      tag: 'todo-routine-tabs-2026-09-23-20:00',
      url: '/?view=today'
    });
  });
});

// ── §6 ─────────────────────────────────────────────────────────────────────

describe('§6 the demo (AC7)', () => {
  const browser = (stored?: unknown) => {
    const store: Record<string, string> = {};
    if (stored !== undefined) store[DEMO_STORAGE_KEY] = JSON.stringify(stored);
    return {
      store,
      window: {
        localStorage: {
          getItem: (k: string) => (k in store ? store[k] : null),
          setItem: (k: string, v: string) => {
            store[k] = v;
          },
          removeItem: (k: string) => {
            delete store[k];
          }
        }
      }
    };
  };

  it('a new visitor gets things that repeat, ticked on the days before, with one evening missed', () => {
    const b = browser();
    const read = run(DEMO_READ_SCRIPT, { taskId: '' }, b.window);
    const routines = read.outputs.routines as Array<Record<string, string>>;
    const checks = read.outputs.checks as Array<Record<string, string>>;
    expect(routines.map((r) => r.title).sort()).toEqual(['Call Salon Collective about the payment', 'Pilates', 'Send the month’s invoices', 'Take the tablets']);
    const tablets = checks.filter((c) => c.routineId === 'seed-routine-tablets');
    expect(tablets.length).toBe(12 * 2 - 1); // started twelve days ago, twice a day, less the one missed evening
    expect(tablets.some((c) => c.date === iso(plus(-3)) && c.time === '20:00')).toBe(false);
    expect(checks.every((c) => c.date < iso(TODAY))).toBe(true);
    // Today is left to the visitor: the tablets are both still there to tick.
    const today = run(TODAY_ROWS_SCRIPT, { tasks: read.outputs.tasks, actions: read.outputs.actions, routines, checks, selectedId: '', now: NOON });
    expect((today.outputs.rows as Array<Record<string, unknown>>).filter((r) => r.title === 'Take the tablets').map((r) => r.time)).toEqual(['08:00', '20:00']);
  });

  it('🔴 a visitor whose list predates this keeps every task and line, and gains the examples', () => {
    const old = {
      Task: [{ id: 'mine', title: 'My own task', position: 1, status: 'open', deadline: '' }],
      Action: [],
      Event: [{ id: 'ev', taskId: 'mine', kind: 'created', summary: 'Added at #1', at: new Date().toISOString() }]
    };
    const b = browser(old);
    const read = run(DEMO_READ_SCRIPT, { taskId: '' }, b.window);
    expect((read.outputs.tasks as Array<{ id: string }>).map((t) => t.id)).toEqual(['mine']);
    expect((read.outputs.routines as unknown[]).length).toBe(4);
    const saved = JSON.parse(b.store[DEMO_STORAGE_KEY]) as { Event: Array<{ id: string; taskId: string }> };
    expect(saved.Event.some((e) => e.id === 'ev')).toBe(true);
    expect(saved.Event.some((e) => e.taskId === 'seed-routine-tablets')).toBe(true);
    // Read again: nothing grows twice.
    const again = JSON.parse(JSON.stringify(saved));
    run(DEMO_READ_SCRIPT, { taskId: '' }, b.window);
    expect(JSON.parse(b.store[DEMO_STORAGE_KEY])).toEqual(again);
  });
});

// ── §7 ─────────────────────────────────────────────────────────────────────

describe('§7 the policy', () => {
  it('Routine is the Task rule; a RoutineCheck can be written once and never edited; nothing is deleted', () => {
    const policy = JSON.parse(fs.readFileSync(POLICY, 'utf8')) as { collections: Record<string, { permissions: Record<string, string>; creatorOwns: boolean }> };
    expect(policy.collections.Routine).toEqual(policy.collections.Task);
    expect(policy.collections.RoutineCheck).toEqual({
      permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'nobody', delete: 'nobody' },
      creatorOwns: true
    });
  });
});
