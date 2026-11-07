/**
 * CronScheduler — fires schedule triggers while the service runs (WF-005
 * implementation step 2).
 *
 * The scheduler loop is deliberately trivial (the parsing in cron.ts is the hard
 * part): for each enabled schedule trigger, compute the next fire and arm one
 * timer; on fire, dispatch and re-arm. Single process, no queue — honest v1
 * semantics.
 *
 * ## Missed-fire policy (decided + documented)
 *
 * The service is not always running, so fires can be "missed" while it is down.
 * The DEFAULT policy is **skip**: missed windows are ignored and the trigger
 * resumes at the next FUTURE occurrence. A trigger may opt into
 * **run-once-on-start**: if one or more fires were missed while down, the target
 * runs exactly ONCE at startup (never once per missed window — no thundering
 * catch-up), then resumes normally. This is `computeStartPlan`, unit-tested in
 * tests/scheduler.test.ts.
 *
 * Rationale: "run once to catch up, or skip" is the honest pair of choices for a
 * single-process scheduler; replaying every missed window risks a storm and
 * implies a durability guarantee we do not make (Risks table: "explicit
 * documented policy beats false precision"). The UI shows last-fired / next-fire
 * so the behavior is legible.
 *
 * ## Overlap policy (FED-004)
 *
 * The missed-fire policy above is about fires due while the service was DOWN.
 * This is the other one, and for years there was no word for it: a fire due
 * while the previous fire of the same schedule is still RUNNING.
 *
 * 🔴 **`running` below is the SCHEDULER's own lifecycle, not the target's.** That
 * distinction is the entire task. `start()` sets it, `stop()` clears it, and
 * nothing in this file ever asked whether the thing it was about to dispatch was
 * already going — so a fifteen-minute poll against a source that took twenty
 * minutes started a second poll on top of the first, every time, for as long as
 * the source stayed slow.
 *
 * `inFlight` is the answer: one entry per trigger id, set BEFORE the dispatch
 * and cleared when the dispatch settles either way. `queued` holds the at-most-
 * one waiting fire that `queue-one` allows. Both are per PROCESS, which is the
 * only thing there is — the same honest v1 caveat the module has always carried.
 *
 * What a skipped fire is NOT: a failure. It is recorded through the dispatcher's
 * `recordSkip`, which writes a successful execution row carrying
 * `disposition: 'skipped-overlap'` and the id of the run it yielded to, and
 * which does not touch the fire counter or the fire metric. A schedule skipping
 * correctly every morning must not look like a schedule that is broken.
 *
 * ## A host that keeps the clock (P115 HST-016)
 *
 * On Cloudflare the backend lives in a Durable Object, which is evicted when idle (a pending timer holds it at most
 * 15 minutes, and eviction drops the timer), and `skip` then skipped the missed fire: a daily schedule on a quiet
 * deployed app never fired. With `wake`, this scheduler arms NO timer. It says the earliest instant it must be woken
 * at (`wake(at)`, null for none), the host sets its own alarm to it, and on that alarm calls `fireDue()`, which fires
 * every schedule due by now and resolves when their runs have settled (so the host can keep the object alive for them).
 *
 * The alarm wakes an object that is not running, so the service starts FIRST, and a plain start computes the NEXT
 * occurrence: the one that woke it would be skipped. So in wake mode a start keeps the STORED next fire as due when it
 * is an occurrence of the current cron, at most `WAKE_GRACE_MS` past and not yet fired. That is the alarm arriving,
 * not a window missed while down; older than that, the missed-fire policy applies as on Node.
 *
 * @module nodegx-backend/triggers/scheduler
 */

import { logger } from '../ops/logger';
import { buildRunPayload } from '../workflow/runPayload';
import { parseCron, CronExpression } from './cron';
import type { OverlapPolicy, TriggerDef, TriggerType } from './registry';
import { effectiveOverlapPolicy } from './registry';
import type { FireInput, FireOutcome, RejectionInput, SkipInput, TriggerResultShape } from './dispatcher';

// setTimeout clamps delays > ~24.8 days; chunk long waits so a monthly/yearly
// schedule doesn't fire immediately from an overflowed delay.
const MAX_TIMER_MS = 2 ** 31 - 1;

/** HST-016: how late a host's alarm may be and still be the alarm for a fire (else: a window missed while down). */
export const WAKE_GRACE_MS = 15 * 60 * 1000;

/**
 * The minimal registry surface the scheduler drives. The concrete
 * `TriggerRegistry` (WF-005) satisfies this structurally; so does BAK-007's
 * backup schedule registry — this is what makes it ONE scheduler class with two
 * consumers, not two schedulers. The scheduler only ever reads schedule
 * triggers and stamps their next-fire time.
 */
export interface SchedulerRegistry {
  byType(type: TriggerType): TriggerDef[];
  get(id: string): TriggerDef | null;
  setNextFire(id: string, nextFireAt: string | null): void;
}

/**
 * The minimal dispatch surface the scheduler drives. `TriggerDispatcher`
 * (WF-005) satisfies this; BAK-007's backup dispatcher does too (its `fire`
 * runs a backup instead of a function). Both write LOUD execution records.
 */
export interface SchedulerDispatcher {
  fire(input: FireInput): Promise<FireOutcome>;
  recordRejection(input: RejectionInput): TriggerResultShape;
  /**
   * FED-004, OPTIONAL on purpose. `TriggerDispatcher` implements it; the two
   * adapters that reuse this scheduler for their own single synthetic schedule
   * (BAK-007's backup, FSF's orphan sweep) do not, and must not be made to —
   * they have no trigger registry to stamp.
   *
   * ⚠️ They still GET the overlap policy: a backup that runs long no longer has
   * a second one started on top of it, which is a fix they wanted and never
   * asked for. What they do not get is the execution ROW; the ops log line the
   * scheduler writes either way is what keeps that from being silent.
   */
  recordSkip?(input: SkipInput): TriggerResultShape;
}

export interface SchedulerDeps {
  registry: SchedulerRegistry;
  dispatcher: SchedulerDispatcher;
  /** Injectable clock for tests. */
  now?: () => Date;
  /**
   * P115 HST-016: the host keeps the clock. No timer is armed; the earliest instant this scheduler must be woken at is
   * reported here (null: none), and the host calls `fireDue()` at it.
   */
  wake?: (at: Date | null) => void;
}

export interface StartPlan {
  /** Fire once immediately to satisfy run-once-on-start after a missed window. */
  fireNow: boolean;
  /** The next scheduled fire strictly after `now`. */
  nextFireAt: Date;
}

/**
 * Decide, at startup, whether a schedule trigger owes a catch-up fire and when
 * its next fire is. Pure — no timers, no IO — so the missed-fire policy is
 * tested directly.
 */
export function computeStartPlan(trigger: TriggerDef, now: Date): StartPlan {
  if (!trigger.schedule) throw new Error(`trigger ${trigger.id} is not a schedule trigger`);
  const cron: CronExpression = parseCron(trigger.schedule.cron);
  const nextFireAt = cron.next(now);

  let fireNow = false;
  if (trigger.schedule.missedFirePolicy === 'run-once-on-start' && trigger.status.lastFiredAt) {
    const last = new Date(trigger.status.lastFiredAt);
    if (!isNaN(last.getTime())) {
      // A fire was due between lastFired and now → we missed at least one.
      const dueAfterLast = cron.next(last);
      if (dueAfterLast.getTime() <= now.getTime()) fireNow = true;
    }
  }
  return { fireNow, nextFireAt };
}

/**
 * The next `count` fires of a cron expression strictly after `after` (BMG-008 §3.1).
 *
 * This is what the preview route answers, and it is HERE rather than in the
 * route so that the page's *Next runs* and the scheduler's arming are the same
 * computation: `computeStartPlan` above takes `cron.next(now)` for the first
 * fire, and this takes the same `next`, chained. Pure — no timers, no IO. An
 * unreachable expression throws `CronParseError` exactly as arming would.
 */
export function nextFireTimes(cron: string, after: Date, count: number): Date[] {
  const expression = parseCron(cron);
  const out: Date[] = [];
  let at = after;
  for (let i = 0; i < count; i++) {
    at = expression.next(at);
    out.push(at);
  }
  return out;
}

export class CronScheduler {
  private readonly registry: SchedulerRegistry;
  private readonly dispatcher: SchedulerDispatcher;
  private readonly now: () => Date;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private running = false;
  /**
   * FED-004 — the trigger ids whose previous fire has NOT finished, and the
   * execution id each one reported when it started (`null` until it does, or
   * for good when history is off).
   *
   * 🔴 Set before the dispatch, not after: `dispatcher.fire` awaits the whole
   * run, so an entry written on the way back is an entry that never exists
   * while it is needed.
   */
  private inFlight = new Map<string, { executionId: string | null }>();
  /**
   * `queue-one`'s at-most-one waiting fire, keyed by trigger id and holding the
   * source string the fire would have carried. A Map rather than a Set because
   * the source is what tells an operator, in the execution record, that this
   * run is the delayed one.
   */
  private queued = new Map<string, string>();
  /** HST-016, wake mode only: the instant each armed schedule is due at, in place of its timer. */
  private readonly wake: ((at: Date | null) => void) | null;
  private due = new Map<string, Date>();
  private lastWake: number | null | undefined = undefined;
  /** HST-016: each trigger's run in flight, so `fireDue` can wait for what it started. */
  private runs = new Map<string, Promise<void>>();

  constructor(deps: SchedulerDeps) {
    this.registry = deps.registry;
    this.dispatcher = deps.dispatcher;
    this.now = deps.now || (() => new Date());
    this.wake = deps.wake || null;
  }

  /**
   * HST-016: fire every schedule due by now (wake mode), and resolve when the runs they started have settled. Each
   * fired schedule is re-armed for its next occurrence first, so the host's next wake is already reported.
   */
  async fireDue(): Promise<void> {
    if (!this.wake || !this.running) return;
    const now = this.now().getTime();
    const fired: string[] = [];
    for (const [id, at] of [...this.due]) {
      if (at.getTime() > now) continue;
      this.due.delete(id);
      fired.push(id);
      this.onFire(id);
    }
    this.reportWake();
    await Promise.all(fired.map((id) => this.runs.get(id)).filter(Boolean));
  }

  /** The earliest due instant, to the host, when it changed. */
  private reportWake(): void {
    if (!this.wake) return;
    let min: number | null = null;
    for (const at of this.due.values()) if (min === null || at.getTime() < min) min = at.getTime();
    if (min === this.lastWake) return;
    this.lastWake = min;
    this.wake(min === null ? null : new Date(min));
  }

  /** HST-016: in wake mode, the stored next fire this start must keep as due now (the alarm that woke it), or null. */
  private dueAtStart(trigger: TriggerDef): Date | null {
    if (!this.wake || !trigger.schedule || !trigger.status || !trigger.status.nextFireAt) return null;
    const stored = new Date(trigger.status.nextFireAt);
    const now = this.now().getTime();
    if (isNaN(stored.getTime()) || stored.getTime() > now || now - stored.getTime() > WAKE_GRACE_MS) return null;
    const last = trigger.status.lastFiredAt ? new Date(trigger.status.lastFiredAt).getTime() : NaN;
    if (!isNaN(last) && last >= stored.getTime()) return null;
    try {
      // An occurrence of the CURRENT cron: an edit since must not fire on the old one's instant.
      return parseCron(trigger.schedule.cron).next(new Date(stored.getTime() - 1000)).getTime() === stored.getTime() ? stored : null;
    } catch {
      return null;
    }
  }

  /** Arm every enabled schedule trigger. Idempotent (clears then re-arms). */
  start(): void {
    this.running = true;
    this.stop(false);
    for (const trigger of this.registry.byType('schedule')) {
      if (!trigger.enabled || !trigger.schedule) continue;
      this.arm(trigger.id);
    }
    // HST-016: after a re-arm that left nothing armed (the last schedule disabled), the host is told "none".
    this.reportWake();
  }

  /** Recompute after a registry change (admin/MCP edited triggers). */
  reschedule(): void {
    if (this.running) this.start();
  }

  private arm(triggerId: string): void {
    const trigger = this.registry.get(triggerId);
    if (!trigger || !trigger.enabled || !trigger.schedule) return;

    const dueNow = this.dueAtStart(trigger);
    if (dueNow) {
      this.armAt(trigger.id, dueNow);
      return;
    }

    let plan: StartPlan;
    try {
      plan = computeStartPlan(trigger, this.now());
    } catch (e) {
      // An unreachable/invalid cron (should have failed validation) — record a
      // loud rejection and do not arm, rather than throwing in startup.
      this.dispatcher.recordRejection({
        triggerType: 'schedule',
        triggerId: trigger.id,
        workflowId: trigger.target.name,
        source: `schedule ${trigger.id}`,
        reason: `schedule not armed: ${e instanceof Error ? e.message : String(e)}`,
        triggerData: { cron: trigger.schedule.cron }
      });
      return;
    }

    this.registry.setNextFire(trigger.id, plan.nextFireAt.toISOString());

    if (plan.fireNow) {
      // One-shot catch-up; do not await (fire-and-forget, loud on failure).
      // FED-004: through the policy like any other fire — `reschedule()` calls
      // `start()`, so this path CAN be reached while a run is in flight.
      this.requestFire(trigger, 'run-once-on-start catch-up');
    }

    this.armAt(trigger.id, plan.nextFireAt);
  }

  /** Arm a timer for a specific instant, chunking waits past the setTimeout cap. */
  private armAt(triggerId: string, when: Date): void {
    if (this.wake) {
      this.due.set(triggerId, when);
      this.reportWake();
      return;
    }
    const delay = when.getTime() - this.now().getTime();
    if (delay > MAX_TIMER_MS) {
      const t = setTimeout(() => this.armAt(triggerId, when), MAX_TIMER_MS);
      if (typeof t.unref === 'function') t.unref();
      this.timers.set(triggerId, t);
      return;
    }
    const t = setTimeout(() => this.onFire(triggerId), Math.max(0, delay));
    if (typeof t.unref === 'function') t.unref();
    this.timers.set(triggerId, t);
  }

  private onFire(triggerId: string): void {
    const trigger = this.registry.get(triggerId);
    if (!trigger || !trigger.enabled || !trigger.schedule) return;

    this.requestFire(trigger, `schedule ${trigger.schedule.cron}`);

    // Re-arm for the following occurrence.
    //
    // ⚠️ This happens whether the fire above was dispatched, queued or skipped,
    // and it has to: the next occurrence of a cron expression is a fact about
    // the clock, not about what the last fire decided. A schedule that skipped
    // is still a schedule.
    try {
      const cron = parseCron(trigger.schedule.cron);
      const next = cron.next(this.now());
      this.registry.setNextFire(triggerId, next.toISOString());
      this.armAt(triggerId, next);
    } catch {
      // Unreachable cron mid-run — stop re-arming (already recorded on arm()).
    }
  }

  /**
   * FED-004 — the ONE door every fire goes through, where the overlap policy is
   * applied. Three outcomes and no fourth: dispatch now, wait for the running
   * one, or record a skip.
   */
  private requestFire(trigger: TriggerDef, source: string): void {
    const policy: OverlapPolicy = effectiveOverlapPolicy(trigger);
    const running = this.inFlight.get(trigger.id);

    // `allow` is what every schedule did before this existed, and nothing about
    // that path changed — it does not even read `inFlight`.
    if (policy === 'allow' || !running) {
      this.dispatch(trigger.id, source);
      return;
    }

    if (policy === 'queue-one' && !this.queued.has(trigger.id)) {
      this.queued.set(trigger.id, `${source} (queued behind the previous run)`);
      return;
    }

    this.recordSkip(trigger, source, policy, running.executionId);
  }

  /**
   * Start a run and hold the in-flight entry for as long as it lasts.
   *
   * The entry object is created and stored FIRST, then handed to the fire as a
   * closure that fills in the execution id when the run announces one. That
   * ordering is what makes "which run is still going" answerable during the
   * window it is asked in.
   */
  private dispatch(triggerId: string, source: string): void {
    const entry: { executionId: string | null } = { executionId: null };
    this.inFlight.set(triggerId, entry);

    const settled = (): void => this.onRunSettled(triggerId);
    const run = this.fire(triggerId, source, (executionId: string) => {
      entry.executionId = executionId;
    }).then(settled, settled);
    this.runs.set(triggerId, run);
    void run.then(() => {
      if (this.runs.get(triggerId) === run) this.runs.delete(triggerId);
    });
  }

  /**
   * A dispatch has settled — successfully or not, which is the same thing to
   * this map. Release the slot, and let a waiting fire go.
   */
  private onRunSettled(triggerId: string): void {
    this.inFlight.delete(triggerId);

    const waiting = this.queued.get(triggerId);
    if (waiting === undefined) return;
    this.queued.delete(triggerId);

    // A `stop()` while a fire was waiting ends the wait rather than honouring
    // it — a disarmed scheduler must not dispatch, and a queued fire is a fire
    // that has not happened yet.
    if (!this.running) return;
    const trigger = this.registry.get(triggerId);
    if (!trigger || !trigger.enabled || !trigger.schedule) return;
    this.dispatch(triggerId, waiting);
  }

  /** Write the skip down: an ops line always, an execution row where there is one. */
  private recordSkip(trigger: TriggerDef, source: string, policy: OverlapPolicy, yieldedTo: string | null): void {
    const reason =
      policy === 'queue-one'
        ? 'a fire of this schedule is already waiting for the running one to finish'
        : 'the previous fire of this schedule is still running';

    // The ops line is unconditional, because the execution row is not: the two
    // adapters that reuse this scheduler have no registry to stamp, and a skip
    // nobody can see reads exactly like a scheduler that has stopped firing.
    logger.info('schedule.skippedOverlap', {
      triggerId: trigger.id,
      target: trigger.target.name,
      targetKind: trigger.target.kind,
      overlapPolicy: policy,
      yieldedTo,
      source,
      reason
    });

    if (!this.dispatcher.recordSkip) return;
    this.dispatcher.recordSkip({
      trigger,
      source,
      policy,
      yieldedTo,
      reason,
      triggerData: {
        cron: trigger.schedule ? trigger.schedule.cron : undefined,
        overlapPolicy: policy,
        yieldedTo
      }
    });
  }

  private async fire(triggerId: string, source: string, onStarted?: (executionId: string) => void): Promise<void> {
    const trigger = this.registry.get(triggerId);
    if (!trigger) return;
    const firedAt = this.now().toISOString();
    const cron = trigger.schedule ? trigger.schedule.cron : undefined;
    await this.dispatcher.fire({
      trigger,
      triggerType: 'schedule',
      source,
      // FED-004: how the in-flight entry learns which run it is holding.
      onStarted,
      payload: buildRunPayload({
        type: 'schedule',
        triggerId,
        firedAt,
        cron,
        // The schedule's authored payload IS the run's body — the same slot a
        // webhook's JSON lands in, which is what lets one definition read
        // `body.mode` whichever entry point started it (F8). A schedule that
        // authored none still sends `{}`, exactly as before.
        body: trigger.schedule ? trigger.schedule.payload : undefined,
        legacy: { triggerId, firedAt, cron }
      })
    });
  }

  /** Disarm all timers. Pass false to keep `running` (internal re-arm). */
  stop(markStopped = true): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    if (this.wake) {
      this.due.clear();
      // An internal re-arm (`start()` → `stop(false)`) reports once it has re-armed, not a null in between.
      if (markStopped) this.reportWake();
    }
    if (markStopped) {
      this.running = false;
      // A queued fire is one that has not happened; a stopped scheduler owes
      // nobody a delayed dispatch. `inFlight` is deliberately NOT cleared —
      // those runs are still going, and their entries are what `onRunSettled`
      // removes when they finish.
      this.queued.clear();
    }
  }
}
