/**
 * P115 HST-016 — schedules on a host's clock (`scheduleWake`), for a host whose process is evicted when idle.
 *
 * On Cloudflare the backend lives in a Durable Object: a pending timer holds an idle object at most 15 minutes, and
 * eviction drops the timer. With `missedFirePolicy: 'skip'` the next start then skipped the fire, so a daily schedule
 * on a quiet deployed app never fired. In wake mode the scheduler arms no timer, tells the host when it must be woken,
 * and fires what is due when the host calls; a start at the woken instant keeps the stored fire as due.
 *
 *   1. CronScheduler in wake mode, on a fake clock, with the real TriggerRegistry (persisted status).
 *   2. The whole BackendService over an "eviction": stopped, then started again on the same data dir at an instant a
 *      schedule is due. Control: the same restart WITHOUT `scheduleWake` (Node's timers) skips that fire.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SecretsStore } from '../src/config/SecretsStore';
import type { FireInput, FireOutcome, TriggerDispatcher } from '../src/triggers/dispatcher';
import { TriggerRegistry } from '../src/triggers/registry';
import { CronScheduler, WAKE_GRACE_MS } from '../src/triggers/scheduler';
import { BackendService } from '../src/service';
import { adminToken } from './helpers/http';

jest.setTimeout(30000);

const made: string[] = [];
afterAll(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});
function tmp(label: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `hst016-${label}-`));
  made.push(d);
  return d;
}

const at = (hh: number, mm: number, ss = 0) => new Date(Date.UTC(2026, 10, 7, hh, mm, ss));

/** A registry on disk with one hourly schedule, and a dispatcher that records its fires as the real one stamps them. */
function rig(dir: string, cron = '0 * * * *') {
  const registry = new TriggerRegistry(dir, new SecretsStore(dir));
  const id = registry.list()[0]?.id ?? registry.upsert({ id: 'hourly', type: 'schedule', target: { kind: 'workflow', name: 'tick' }, schedule: { cron, missedFirePolicy: 'skip' } }).trigger.id;
  return { registry, id };
}
function dispatcher(registry: TriggerRegistry, clock: { now: Date }) {
  const fires: string[] = [];
  let settle: () => void = () => undefined;
  const d = {
    fire: (input: FireInput): Promise<FireOutcome> => {
      fires.push(clock.now.toISOString());
      registry.recordFire(input.trigger.id, { firedAt: clock.now.toISOString() });
      // The run takes a while: fireDue must wait for it.
      return new Promise((resolve) => {
        settle = () => resolve({ ok: true } as unknown as FireOutcome);
      });
    },
    recordRejection: () => ({}) as never
  } as unknown as TriggerDispatcher;
  return { d, fires, settle: () => settle() };
}

describe('CronScheduler with a host clock (wake mode)', () => {
  test('arms NO timer and tells the host the next occurrence', () => {
    const dir = tmp('arm');
    const { registry } = rig(dir);
    const clock = { now: at(12, 30) };
    const wakes: Array<string | null> = [];
    const spy = jest.spyOn(global, 'setTimeout');
    const s = new CronScheduler({ registry, dispatcher: dispatcher(registry, clock).d, now: () => clock.now, wake: (w) => wakes.push(w ? w.toISOString() : null) });
    s.start();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(wakes).toEqual([at(13, 0).toISOString()]);
    s.stop();
    expect(wakes[wakes.length - 1]).toBeNull();
  });

  test('fireDue fires only what is due, re-arms for the next, and waits for the run', async () => {
    const dir = tmp('due');
    const { registry } = rig(dir);
    const clock = { now: at(12, 30) };
    const wakes: string[] = [];
    const disp = dispatcher(registry, clock);
    const s = new CronScheduler({ registry, dispatcher: disp.d, now: () => clock.now, wake: (w) => w && wakes.push(w.toISOString()) });
    s.start();
    await s.fireDue(); // 12:30: nothing due
    expect(disp.fires).toEqual([]);

    clock.now = at(13, 0, 1);
    let done = false;
    const p = s.fireDue().then(() => (done = true));
    await new Promise((r) => setImmediate(r));
    expect(disp.fires).toEqual([at(13, 0, 1).toISOString()]);
    expect(wakes[wakes.length - 1]).toBe(at(14, 0).toISOString());
    expect(done).toBe(false); // the run is still going
    disp.settle();
    await p;
    expect(done).toBe(true);
    s.stop();
  });

  describe('a start at the instant the host woke it (the object was evicted)', () => {
    /** Armed at 12:30 (stored next fire 13:00), "evicted", then a FRESH scheduler + registry at `restart`. */
    function evictedAndWokenAt(restart: Date, opts: { wake: boolean; editCron?: string; firedAt?: Date } = { wake: true }) {
      const dir = tmp('evict');
      const first = rig(dir);
      const clock = { now: at(12, 30) };
      const s1 = new CronScheduler({ registry: first.registry, dispatcher: dispatcher(first.registry, clock).d, now: () => clock.now, wake: () => undefined });
      s1.start();
      expect(first.registry.get(first.id)!.status.nextFireAt).toBe(at(13, 0).toISOString());
      if (opts.firedAt) first.registry.recordFire(first.id, { firedAt: opts.firedAt.toISOString() });
      if (opts.editCron) {
        const t = first.registry.get(first.id)!;
        first.registry.upsert({ id: t.id, type: 'schedule', target: t.target, schedule: { cron: opts.editCron, missedFirePolicy: 'skip' } });
        first.registry.setNextFire(t.id, at(13, 0).toISOString()); // as stored before the edit was rescheduled
      }
      // Evicted: nothing in memory survives. A new registry reads what was persisted.
      const second = rig(dir);
      clock.now = restart;
      const disp = dispatcher(second.registry, clock);
      const wakes: string[] = [];
      const s2 = new CronScheduler({
        registry: second.registry,
        dispatcher: disp.d,
        now: () => clock.now,
        ...(opts.wake ? { wake: (w: Date | null) => w && wakes.push(w.toISOString()) } : {})
      });
      s2.start();
      return { s2, disp, wakes };
    }

    test('the due fire is kept and fired (the alarm, not a missed window)', async () => {
      const { s2, disp, wakes } = evictedAndWokenAt(at(13, 0, 2));
      expect(wakes[0]).toBe(at(13, 0).toISOString());
      const p = s2.fireDue();
      await new Promise((r) => setImmediate(r));
      expect(disp.fires).toHaveLength(1);
      expect(wakes[wakes.length - 1]).toBe(at(14, 0).toISOString());
      disp.settle();
      await p;
      s2.stop();
    });

    test('control: the same restart on Node timers (no wake) SKIPS it: the defect this fixes', async () => {
      const { s2, disp } = evictedAndWokenAt(at(13, 0, 2), { wake: false });
      await new Promise((r) => setTimeout(r, 20));
      expect(disp.fires).toEqual([]);
      s2.stop();
    });

    test('later than the grace: a missed window, the missed-fire policy applies (skip)', async () => {
      const { s2, disp, wakes } = evictedAndWokenAt(new Date(at(13, 0).getTime() + WAKE_GRACE_MS + 60_000));
      await s2.fireDue();
      expect(disp.fires).toEqual([]);
      expect(wakes[0]).toBe(at(14, 0).toISOString());
      s2.stop();
    });

    test('a cron edited since: the old instant is not an occurrence, so it is not fired', async () => {
      const { s2, disp, wakes } = evictedAndWokenAt(at(13, 0, 2), { wake: true, editCron: '30 * * * *' });
      await s2.fireDue();
      expect(disp.fires).toEqual([]);
      expect(wakes[0]).toBe(at(13, 30).toISOString());
      s2.stop();
    });

    test('already fired at that instant (evicted mid-run): not fired twice', async () => {
      const { s2, disp } = evictedAndWokenAt(at(13, 0, 30), { wake: true, firedAt: at(13, 0, 1) });
      await s2.fireDue();
      expect(disp.fires).toEqual([]);
      s2.stop();
    });
  });

  test('the last schedule switched off: the host is told there is nothing to wake for', () => {
    const dir = tmp('off');
    const { registry, id } = rig(dir);
    const clock = { now: at(12, 30) };
    const wakes: Array<string | null> = [];
    const s = new CronScheduler({ registry, dispatcher: dispatcher(registry, clock).d, now: () => clock.now, wake: (w) => wakes.push(w ? w.toISOString() : null) });
    s.start();
    registry.setEnabled(id, false);
    s.reschedule();
    expect(wakes).toEqual([at(13, 0).toISOString(), null]);
    s.stop();
  });
});

describe('the whole service on a host clock, over an eviction', () => {
  const TICK = { version: 1, workflows: [{ id: 'tick', name: 'Tick', entry: 'done', steps: [{ id: 'done', kind: 'return', params: { value: { ticked: true } } }] }], triggers: [{ id: 'every-minute', type: 'schedule', name: 'Every minute', target: { kind: 'workflow', name: 'tick' }, schedule: { cron: '* * * * *' } }] };

  async function trigger(base: string, dataDir: string) {
    const r = await fetch(`${base}/admin/triggers/every-minute`, { headers: { authorization: `Bearer ${adminToken(dataDir)}` } });
    return ((await r.json()) as { trigger: { status: { fireCount: number; lastFiredAt: string | null; nextFireAt: string | null } } }).trigger.status;
  }

  /** First life: started and stopped. Then the stored next fire is set to the current minute (due now, as when the
   *  alarm for it arrives), and the service is started again on the same data dir. */
  async function evicted(withWake: boolean) {
    const dataDir = tmp('svc');
    const projectDir = tmp('svc-project');
    fs.writeFileSync(path.join(projectDir, 'nodegx.automations.json'), JSON.stringify(TICK));
    const one = new BackendService({ dataDir, port: 0, backendId: 'hst016', enforceRules: true, projectDir, scheduleWake: () => undefined });
    await one.start();
    await one.stop();
    const file = path.join(dataDir, 'triggers.json');
    const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(stored) ? stored : stored.triggers;
    const due = new Date(Math.floor(Date.now() / 60_000) * 60_000);
    list[0].status.nextFireAt = due.toISOString();
    fs.writeFileSync(file, JSON.stringify(stored, null, 2));

    const wakes: Array<string | null> = [];
    const two = new BackendService({ dataDir, port: 0, backendId: 'hst016', enforceRules: true, projectDir, ...(withWake ? { scheduleWake: (w: Date | null) => wakes.push(w ? w.toISOString() : null) } : {}) });
    const base = (await two.start()).listen.url;
    return { two, base, dataDir, wakes, due };
  }

  test('woken at the due instant: the service fires it, and asks to be woken at the next minute', async () => {
    const { two, base, dataDir, wakes, due } = await evicted(true);
    try {
      expect(wakes[0]).toBe(due.toISOString());
      await two.fireDueSchedules();
      const status = await trigger(base, dataDir);
      expect(status.fireCount).toBe(1);
      expect(wakes[wakes.length - 1]).toBe(new Date(due.getTime() + 60_000).toISOString());
      expect(status.nextFireAt).toBe(wakes[wakes.length - 1]);
    } finally {
      await two.stop();
    }
  });

  test('control: the same restart without a host clock skips it', async () => {
    const { two, base, dataDir } = await evicted(false);
    try {
      await new Promise((r) => setTimeout(r, 50));
      expect((await trigger(base, dataDir)).fireCount).toBe(0);
    } finally {
      await two.stop();
    }
  });
});
