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

  constructor(deps: SchedulerDeps) {
    this.registry = deps.registry;
    this.dispatcher = deps.dispatcher;
    this.now = deps.now || (() => new Date());
  }

  /** Arm every enabled schedule trigger. Idempotent (clears then re-arms). */
  start(): void {
    this.running = true;
    this.stop(false);
    for (const trigger of this.registry.byType('schedule')) {
      if (!trigger.enabled || !trigger.schedule) continue;
      this.arm(trigger.id);
    }
  }

  /** Recompute after a registry change (admin/MCP edited triggers). */
  reschedule(): void {
    if (this.running) this.start();
  }

  private arm(triggerId: string): void {
    const trigger = this.registry.get(triggerId);
    if (!trigger || !trigger.enabled || !trigger.schedule) return;

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
    this.fire(triggerId, source, (executionId: string) => {
      entry.executionId = executionId;
    }).then(settled, settled);
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
