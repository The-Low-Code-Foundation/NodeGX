/**
 * BMG-008 — the schedule builder and the trigger drawer's model, under jsdom.
 *
 * AC1: every mode emits its documented cron and the backend's `parseCron`
 * accepts it; `fromCron` puts a saved cron back into the right mode or *Custom*.
 * AC6: the payload editor round-trips typed values. AC8: the cron field is
 * rendered only in *Custom*, and there is no textarea anywhere on the page.
 */
import * as fs from 'fs';
import * as path from 'path';

import { mount, unmount, change, click, settle, q, qa, text } from './dom';

import { parseCron } from '../../src/triggers/cron';
import { cronWords } from '../../src/triggers/cronWords';
import { DEFAULT_SCHEDULE, MINUTE_STEPS, ScheduleState, fromCron, scheduleProblem, sortDays, toCron } from '../../src/admin/app/composers/schedule';
import { ScheduleBuilder, SchedulePreview } from '../../src/admin/app/composers/ScheduleBuilder';
import { objectFromRows, rowsFromObject } from '../../src/admin/app/composers/KeyValueEditor';
import { draftFrom, draftProblem, slugify, toInput, webhookExample, webhookUrl, whenWords } from '../../src/admin/app/views/triggers';

const state = (patch: Partial<ScheduleState>): ScheduleState => ({ ...DEFAULT_SCHEDULE, ...patch });

describe('BMG-008 AC1 — each mode emits its documented cron, and the backend accepts it', () => {
  const table: Array<[string, ScheduleState, string]> = [
    ['every 5 minutes', state({ mode: 'minutes', everyMinutes: 5 }), '*/5 * * * *'],
    ['every 30 minutes', state({ mode: 'minutes', everyMinutes: 30 }), '*/30 * * * *'],
    ['every hour at 0 past', state({ mode: 'hourly', minute: 0 }), '0 * * * *'],
    ['every hour at 45 past', state({ mode: 'hourly', minute: 45 }), '45 * * * *'],
    ['every day at 09:00', state({ mode: 'daily', time: '09:00' }), '0 9 * * *'],
    ['every day at 23:30', state({ mode: 'daily', time: '23:30' }), '30 23 * * *'],
    ['Mon Wed Fri at 09:00', state({ mode: 'weekly', time: '09:00', days: [1, 3, 5] }), '0 9 * * 1,3,5'],
    ['Sat Sun at 07:15', state({ mode: 'weekly', time: '07:15', days: [6, 0] }), '15 7 * * 0,6'],
    ['the 1st at 09:00', state({ mode: 'monthly', time: '09:00', dayOfMonth: 1 }), '0 9 1 * *'],
    ['the 28th at 18:00', state({ mode: 'monthly', time: '18:00', dayOfMonth: 28 }), '0 18 28 * *'],
    ['custom, as typed', state({ mode: 'custom', custom: '0 9-17 * * MON-FRI' }), '0 9-17 * * MON-FRI'],
    ['custom preset', state({ mode: 'custom', custom: ' @daily ' }), '@daily']
  ];

  it.each(table)('%s', (_label, s, cron) => {
    expect(toCron(s)).toBe(cron);
    expect(() => parseCron(cron)).not.toThrow();
  });

  it('every minute step the select offers is accepted', () => {
    for (const n of MINUTE_STEPS) expect(() => parseCron(toCron(state({ mode: 'minutes', everyMinutes: n })))).not.toThrow();
  });

  it('an incomplete state has a sentence and no cron', () => {
    expect(scheduleProblem(state({ mode: 'weekly', days: [] }))).toBe('Pick at least one day.');
    expect(toCron(state({ mode: 'weekly', days: [] }))).toBe('');
    expect(scheduleProblem(state({ mode: 'daily', time: '' }))).toBe('Pick a time of day.');
    expect(scheduleProblem(state({ mode: 'monthly', dayOfMonth: 0 }))).toMatch(/day of the month/);
    expect(scheduleProblem(state({ mode: 'hourly', minute: 60 }))).toMatch(/0–59/);
    expect(scheduleProblem(state({ mode: 'custom', custom: '  ' }))).toBe('Type a cron expression.');
    expect(scheduleProblem(state({ mode: 'custom', custom: 'anything at all' }))).toBeNull();
  });
});

describe('BMG-008 AC1 — fromCron opens a saved cron in the mode that can show it', () => {
  it('reads back what every mode emits', () => {
    const cases: ScheduleState[] = [
      state({ mode: 'minutes', everyMinutes: 15 }),
      state({ mode: 'hourly', minute: 30 }),
      state({ mode: 'daily', time: '09:00' }),
      state({ mode: 'weekly', time: '09:00', days: [1, 3, 5] }),
      state({ mode: 'monthly', time: '09:00', dayOfMonth: 15 })
    ];
    for (const s of cases) {
      const back = fromCron(toCron(s));
      expect(back.mode).toBe(s.mode);
      expect(toCron(back)).toBe(toCron(s));
    }
  });

  it('*/15 is "every 15 minutes"; @daily is "every day at 00:00"', () => {
    expect(fromCron('*/15 * * * *')).toMatchObject({ mode: 'minutes', everyMinutes: 15 });
    expect(fromCron('@daily')).toMatchObject({ mode: 'daily', time: '00:00' });
    expect(fromCron('@hourly')).toMatchObject({ mode: 'hourly', minute: 0 });
    expect(fromCron('@weekly')).toMatchObject({ mode: 'weekly', time: '00:00', days: [0] });
    expect(fromCron('@monthly')).toMatchObject({ mode: 'monthly', time: '00:00', dayOfMonth: 1 });
    expect(fromCron('* * * * *')).toMatchObject({ mode: 'minutes', everyMinutes: 1 });
  });

  it('a range or a Sunday-as-7 in the weekday field is read into the day chips', () => {
    expect(fromCron('0 9 * * 1-5')).toMatchObject({ mode: 'weekly', days: [1, 2, 3, 4, 5] });
    expect(fromCron('0 9 * * 7')).toMatchObject({ mode: 'weekly', days: [0] });
    expect(fromCron('0 9 * * 5,1')).toMatchObject({ mode: 'weekly', days: [1, 5] });
  });

  it('what no mode can show opens in Custom with the text kept', () => {
    for (const cron of ['*/7 * * * *', '0 */2 * * *', '0 9 * 6 *', '0 9 * * mon', '0 9 1 * 1', '0 9 1,15 * *', '@yearly', 'not a cron', '0 9 * * */2']) {
      const s = fromCron(cron);
      expect(s.mode).toBe('custom');
      expect(s.custom).toBe(cron);
      expect(toCron(s)).toBe(cron);
    }
    expect(fromCron('').mode).toBe('custom');
  });

  it('sortDays keeps week order, drops duplicates and reads 7 as Sunday', () => {
    expect(sortDays([5, 1, 7, 1, 3])).toEqual([1, 3, 5, 0]);
  });
});

describe('BMG-008 the words agree with the modes', () => {
  it('every mode’s cron has a sentence from the shared gloss', () => {
    expect(cronWords(toCron(state({ mode: 'minutes', everyMinutes: 10 })))).toBe('Every 10 minutes');
    expect(cronWords(toCron(state({ mode: 'hourly', minute: 15 })))).toBe('Every hour at 15 past');
    expect(cronWords(toCron(state({ mode: 'daily', time: '09:00' })))).toBe('Every day at 09:00');
    expect(cronWords(toCron(state({ mode: 'weekly', time: '09:00', days: [1, 3, 5] })))).toBe('Every Monday, Wednesday and Friday at 09:00');
    expect(cronWords(toCron(state({ mode: 'monthly', time: '09:00', dayOfMonth: 1 })))).toBe('On the 1st of every month at 09:00');
  });
});

// ----------------------------------------------------------------- the builder --

function fakePreview(calls: string[]) {
  return async (cron: string): Promise<SchedulePreview> => {
    calls.push(cron);
    try {
      const expr = parseCron(cron);
      const next: string[] = [];
      let at = new Date(2026, 8, 25, 12, 0);
      for (let i = 0; i < 5; i++) {
        at = expr.next(at);
        next.push(at.toISOString());
      }
      return { valid: true, error: null, words: cronWords(cron), next, timezone: 'Europe/Paris' };
    } catch (e) {
      return { valid: false, error: (e as Error).message, words: null, next: [] };
    }
  };
}

function mountBuilder(value: string) {
  const emitted: string[] = [];
  const calls: string[] = [];
  const root = mount(<ScheduleBuilder id="sb" value={value} onChange={(c) => emitted.push(c)} preview={fakePreview(calls)} />);
  return { root, emitted, calls, done: () => unmount(root) };
}

const cronField = (root: HTMLElement) => root.querySelector<HTMLInputElement>('input[aria-label="Cron expression"]');
const modeRadio = (root: HTMLElement, mode: string) => q<HTMLInputElement>(root, 'input[type=radio][value="' + mode + '"]');

describe('BMG-008 ScheduleBuilder (AC2 rendering, AC8)', () => {
  it('opens a saved weekly cron on the week mode with its days ticked, and no cron field', async () => {
    const b = mountBuilder('0 9 * * 1,3,5');
    expect(modeRadio(b.root, 'weekly').checked).toBe(true);
    const ticked = qa<HTMLInputElement>(b.root, '.sched-day input').filter((i) => i.checked).map((i) => i.getAttribute('aria-label'));
    expect(ticked).toEqual(['Monday', 'Wednesday', 'Friday']);
    expect(q<HTMLInputElement>(b.root, 'input[aria-label="Time of day"]').value).toBe('09:00');
    expect(cronField(b.root)).toBeNull();
    expect(qa(b.root, 'textarea').length).toBe(0);
    b.done();
  });

  it('shows the sentence, five next runs and the zone from the preview it was handed', async () => {
    const b = mountBuilder('0 9 * * 1,3,5');
    await settle(320);
    expect(b.calls).toEqual(['0 9 * * 1,3,5']);
    expect(text(q(b.root, '.sched-words'))).toBe('Every Monday, Wednesday and Friday at 09:00');
    const items = qa(b.root, '.sched-next li').map((li) => li.textContent);
    expect(items.length).toBe(5);
    // What the preview answered, drawn as the person's local time — nothing recomputed here.
    expect(items[0]).toBe(new Date(2026, 8, 28, 9, 0).toLocaleString());
    expect(text(b.root)).toContain('Europe/Paris');
    b.done();
  });

  it('AC8: the cron field appears in Custom only, and Custom keeps a saved cron the modes cannot show', async () => {
    const b = mountBuilder('0 */2 * * *');
    expect(modeRadio(b.root, 'custom').checked).toBe(true);
    expect(cronField(b.root)!.value).toBe('0 */2 * * *');
    change(modeRadio(b.root, 'daily'), true);
    expect(cronField(b.root)).toBeNull();
    change(modeRadio(b.root, 'custom'), true);
    expect(cronField(b.root)).not.toBeNull();
    b.done();
  });

  it('emits the cron for every change, and a preview problem is shown in the server’s words', async () => {
    const b = mountBuilder('');
    await settle(320);
    // A new schedule starts as "every day at 09:00".
    expect(b.emitted[b.emitted.length - 1]).toBe('0 9 * * *');
    change(modeRadio(b.root, 'minutes'), true);
    change(q<HTMLSelectElement>(b.root, 'select[aria-label="Minutes"]'), '10');
    expect(b.emitted[b.emitted.length - 1]).toBe('*/10 * * * *');
    change(modeRadio(b.root, 'custom'), true);
    const field = cronField(b.root)!;
    field.value = '61 * * * *';
    field.dispatchEvent(new (globalThis as any).window.Event('input', { bubbles: true }));
    await settle(320);
    expect(b.emitted[b.emitted.length - 1]).toBe('61 * * * *');
    expect(text(q(b.root, '.notice.bad'))).toMatch(/out of range/);
    b.done();
  });

  it('a week with no day ticked says so and sends nothing to the server', async () => {
    const b = mountBuilder('0 9 * * 1');
    await settle(320);
    const callsBefore = b.calls.length;
    click(q(b.root, '.sched-day input[aria-label="Monday"]'));
    await settle(320);
    expect(b.emitted[b.emitted.length - 1]).toBe('');
    expect(text(q(b.root, '.notice.warn'))).toBe('Pick at least one day.');
    expect(b.calls.length).toBe(callsBefore);
    b.done();
  });
});

// ----------------------------------------------------------- the drawer's model --

describe('BMG-008 the drawer’s model', () => {
  it('AC6: a payload of {limit: 10, dryRun: true, since: <date>} round-trips with its types', () => {
    const since = '2026-09-01T07:00:00.000Z';
    const rows = rowsFromObject({ limit: 10, dryRun: true, since, tag: 'nightly' });
    expect(rows.map((r) => r.type)).toEqual(['number', 'boolean', 'date', 'text']);
    const back = objectFromRows(rows);
    expect(back).toEqual({ limit: 10, dryRun: true, since, tag: 'nightly' });
    expect(typeof back.limit).toBe('number');
    expect(typeof back.dryRun).toBe('boolean');
    const d = draftFrom({ id: 't1', type: 'schedule', schedule: { cron: '0 9 * * *', missedFirePolicy: 'skip', payload: { limit: 10, dryRun: true, since } }, target: { kind: 'function', name: 'digest' }, effectiveOverlapPolicy: 'queue-one', enabled: true }, 'skip');
    const input = toInput(d) as { schedule: { payload: unknown; overlapPolicy: string; cron: string } };
    expect(input.schedule.payload).toEqual({ limit: 10, dryRun: true, since });
    // The policy shown is the ROUTE's effective one, and it is sent back explicitly.
    expect(input.schedule.overlapPolicy).toBe('queue-one');
    expect(input.schedule.cron).toBe('0 9 * * *');
  });

  it('a new schedule takes the overlap default the list route answered, never a copy of its own', () => {
    expect(draftFrom(null, 'allow').overlap).toBe('allow');
    expect(draftFrom(null, 'skip').overlap).toBe('skip');
  });

  it('says what is missing, in order, before a save is offered', () => {
    const d = draftFrom(null, 'skip');
    expect(draftProblem(d)).toBe('Pick when it runs.');
    expect(draftProblem({ ...d, type: 'schedule' })).toBe('Pick the function it runs.');
    expect(draftProblem({ ...d, type: 'schedule', targetKind: 'workflow' })).toBe('Pick the workflow it runs.');
    expect(draftProblem({ ...d, type: 'schedule', targetName: 'digest' })).toBe('Finish the schedule.');
    expect(draftProblem({ ...d, type: 'schedule', targetName: 'digest', cron: '0 9 * * *' })).toBeNull();
    expect(draftProblem({ ...d, type: 'webhook', targetName: 'digest' })).toBe('Give the hook a path.');
    expect(draftProblem({ ...d, type: 'webhook', targetName: 'digest', slug: 'Bad Slug' })).toMatch(/lowercase/);
    expect(draftProblem({ ...d, type: 'webhook', targetName: 'digest', slug: 'stripe-payments' })).toBeNull();
    expect(draftProblem({ ...d, type: 'db-change', targetName: 'digest' })).toBe('Pick the collection to watch.');
    expect(draftProblem({ ...d, type: 'db-change', targetName: 'digest', collection: 'Pet' })).toMatch(/created, changed, deleted/);
    expect(draftProblem({ ...d, type: 'db-change', targetName: 'digest', collection: 'Pet', actions: ['create'] })).toBeNull();
    expect(draftProblem({ ...d, type: 'webhook', targetKind: 'workflow', targetName: 'ping', slug: 'a', sync: true, waitS: 900 })).toMatch(/between 1 and 300/);
  });

  it('builds the body each kind of trigger posts, and sync only for a workflow', () => {
    const d = draftFrom(null, 'skip');
    expect(toInput({ ...d, type: 'webhook', name: 'Stripe', targetName: 'onPayment', slug: 'stripe', scheme: 'token', maxBodyBytes: 65536 })).toEqual({
      type: 'webhook',
      name: 'Stripe',
      enabled: true,
      target: { kind: 'function', name: 'onPayment' },
      webhook: { slug: 'stripe', scheme: 'token', maxBodyBytes: 65536 }
    });
    expect(toInput({ ...d, type: 'db-change', targetKind: 'workflow', targetName: 'ping', collection: 'Pet', actions: ['create', 'delete'], sync: true, waitS: 12 })).toEqual({
      type: 'db-change',
      name: undefined,
      enabled: true,
      target: { kind: 'workflow', name: 'ping' },
      responseMode: 'sync',
      responseTimeoutMs: 12000,
      dbChange: { collection: 'Pet', actions: ['create', 'delete'] }
    });
    // An empty payload is omitted, not sent as {}.
    const sched = toInput({ ...d, type: 'schedule', targetName: 'digest', cron: '0 9 * * *' }) as { schedule: Record<string, unknown> };
    expect(sched.schedule).toEqual({ cron: '0 9 * * *', missedFirePolicy: 'skip', overlapPolicy: 'skip' });
  });

  it('the list’s When column: the route’s words, the hook’s path, the collection and its actions', () => {
    expect(whenWords({ id: 'a', type: 'schedule', schedule: { cron: '0 9 * * *' }, scheduleWords: 'Every day at 09:00' })).toBe('Every day at 09:00');
    expect(whenWords({ id: 'a', type: 'schedule', schedule: { cron: '0 9-17 * * 1' }, scheduleWords: null })).toBe('0 9-17 * * 1');
    expect(whenWords({ id: 'b', type: 'webhook', webhook: { slug: 'stripe' } })).toBe('webhook · /stripe');
    expect(whenWords({ id: 'c', type: 'db-change', dbChange: { collection: 'Pet', actions: ['create', 'delete'] } })).toBe('Pet: created, deleted');
  });

  it('the URL and the example call carry the secret the way the scheme expects', () => {
    const url = webhookUrl('http://127.0.0.1:8697', 'bmg8', 'stripe');
    expect(url).toBe('http://127.0.0.1:8697/hooks/bmg8/stripe');
    expect(webhookExample(url, 'token', 'whsec_x')).toContain("X-Webhook-Token: whsec_x'");
    const signed = webhookExample(url, 'hmac-sha256', 'whsec_x');
    expect(signed).toContain("-hmac 'whsec_x'");
    expect(signed).toContain('X-Hub-Signature-256: sha256=$SIG');
    expect(slugify('Stripe payments!')).toBe('stripe-payments');
  });

  it('AC8: the view spells no JSON textarea and no raw cron field of its own', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../src/admin/app/views/triggers.tsx'), 'utf-8');
    expect(source).not.toContain('<textarea');
    expect(source).not.toMatch(/JSON\.parse\(/);
    expect(source).not.toContain('placeholder="* * * * *"');
  });
});
