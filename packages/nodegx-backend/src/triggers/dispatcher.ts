/**
 * TriggerDispatcher — the ONE firing contract shared by all three trigger types
 * (WF-005 implementation step 1).
 *
 * Every trigger — cron, webhook, db-change — arrives here. There is exactly one
 * path from "trigger fired" to "execution started, record written":
 *
 *   fire()            — the target exists → run it (WorkflowRunner logs the
 *                       execution record), then stamp the trigger's status.
 *   recordRejection() — the fire was refused (bad webhook secret, oversize body,
 *                       missing target, disabled hook) → write a LOUD failed
 *                       execution record and stamp status. Never a silent drop
 *                       (RUN-004 loud-failure doctrine, restated for triggers).
 *
 * Both paths produce an execution record and both update the registry, so the
 * History Panel and the trigger UI agree by construction. Workflows (WF-001)
 * become a second target `kind` here and nothing else changes — the "designed
 * twice" risk closed by one contract.
 *
 * "NEVER A SILENT DROP" USED TO MEAN ONLY THE RECORD (CWF-002)
 * -----------------------------------------------------------
 * The sentence above was written about execution records, and it was true about
 * them. It was NOT true of the answer: a workflow target computed an output,
 * the engine put it on the run result, and this file serialised
 * `{executionId, status}` and threw the value away. Every caller outside the
 * editor got nothing back. `responseMode: 'sync'` is the fix, and the sentence
 * now covers what it always read as covering.
 *
 * One fact to have straight before reading `fireWorkflow`, because the obvious
 * reading is wrong: `sync` does not make the dispatcher wait. It ALREADY waits,
 * in both modes and always has — `fireWorkflow` awaits `workflows.run()`, and
 * the webhook route awaits `fire()`. So a webhook pointed at a workflow with a
 * ten-minute `wait` step has been holding an HTTP connection for ten minutes
 * since WF-005. What `sync` adds is (a) the output in the body and (b) a CAP on
 * that wait. `async` is unchanged in every respect, including that one.
 *
 * THE METRIC MOVES EXACTLY WHERE THE STATUS STAMP DOES
 * ----------------------------------------------------
 * `nodegx_trigger_fires_total` used to count function-target fires and refusals
 * and NOTHING ELSE: `fireWorkflow` stamped the registry and never called
 * `recordTriggerFire`, so a backend whose triggers all point at workflows
 * reported zero fires forever while the History Panel showed hundreds. The
 * invariant that closes it — and the one to keep — is that **every**
 * `registry.recordFire` in this file is paired with exactly one
 * `recordTriggerFire`, with the same ok/failure verdict. That gives
 * exactly-once counting for free in the awkward case: a `sync` fire that trips
 * its answer cap stamps nothing at 504 (the run is still going) and stamps once
 * later, when the run really finishes — so the 504 is not counted twice, and
 * the late completion is not lost.
 *
 * @module nodegx-backend/triggers/dispatcher
 */

import type { ExecutionHistory } from '../execution/ExecutionStore';
import type { WorkflowRunner, RunTriggerContext } from '../workflow/WorkflowRunner';
import type { WorkflowSubsystem } from '../workflow/WorkflowSubsystem';
import type { TriggerDef, TriggerResult, TriggerRegistry, TriggerSkip } from './registry';
import { DEFAULT_RESPONSE_TIMEOUT_MS } from './registry';

/**
 * FED-004 — the disposition a skipped fire's execution record carries, in ONE
 * place because three readers branch on it: this file writes it, the admin
 * dashboard's trigger view shows it, and the drive asserts it.
 */
export const SKIPPED_OVERLAP = 'skipped-overlap';
import { recordTriggerFire } from '../ops/metrics';

/**
 * The trigger-result shape `recordRejection` returns. Re-exported under a
 * scheduler-facing name so `scheduler.ts` can depend on the dispatch surface
 * (SchedulerDispatcher) without importing the registry's concrete type.
 */
export type TriggerResultShape = TriggerResult;

export interface DispatcherDeps {
  registry: TriggerRegistry;
  executions: ExecutionHistory;
  getRunner: () => WorkflowRunner | null;
  /** WF-001: resolves the workflow subsystem for `target.kind === 'workflow'`. */
  getWorkflows?: () => WorkflowSubsystem | null;
  backendId: string;
  backendName: string;
}

export interface FireInput {
  trigger: TriggerDef;
  triggerType: RunTriggerContext['type'];
  /** Human-readable origin recorded on the execution. */
  source: string;
  /** Becomes the function request body (JSON). */
  payload: Record<string, unknown>;
  /** Extra request headers passed to the function (webhook forwards a subset). */
  headers?: Record<string, unknown>;
  /** BAK-009: the HTTP request that delivered this fire (webhooks only). */
  requestId?: string;
  /**
   * FED-004 — called with this fire's execution id the moment the record is
   * opened, before the target runs. Relayed verbatim onto the run's trigger
   * context, which is the only thing this file does with it.
   */
  onStarted?: (executionId: string) => void;
}

/**
 * FED-004 — a fire the overlap policy declined to dispatch.
 *
 * It is its own input, and its own verb below, because it is neither of the two
 * things this dispatcher had. It is not a `fire` (nothing ran) and it is not a
 * `recordRejection` (nothing was refused, and nothing failed): the schedule did
 * exactly what it was configured to do. What it shares with both is that it is
 * LOUD — a decision nobody can see is indistinguishable from a scheduler that
 * has quietly stopped firing, which is the exact complaint this whole phase
 * exists to answer.
 */
export interface SkipInput {
  trigger: TriggerDef;
  /** Human-readable origin, the same string a fire would have carried. */
  source: string;
  /** The policy that made the decision. */
  policy: string;
  /** The execution this fire yielded to, when the running run reported one. */
  yieldedTo: string | null;
  /** The reason, in the words an operator reads in the History Panel. */
  reason: string;
  /** What the fire WOULD have delivered — recorded so the skip is diffable against a run. */
  triggerData: Record<string, unknown>;
}

export interface RejectionInput {
  triggerType: RunTriggerContext['type'];
  /** Trigger id when a trigger matched; omitted for an unmatched hook. */
  triggerId?: string;
  /** workflowId recorded (target function name, or a `hook:<slug>` sentinel). */
  workflowId: string;
  source: string;
  reason: string;
  triggerData: Record<string, unknown>;
  /** BAK-009: the HTTP request that was refused, when a request was involved. */
  requestId?: string;
}

/** Everything a fire produced: the persisted status plus the HTTP response the
 *  webhook route relays back to the caller. */
export interface FireOutcome {
  result: TriggerResult;
  statusCode: number;
  body: string;
  /**
   * Extra response headers the relaying route should set (CWF-002).
   *
   * A `sync` fire answers with the workflow's output AS the body — no envelope,
   * because an envelope is exactly what makes a webhook awkward to consume from
   * anything that is not this editor. The execution id still has to reach the
   * caller somehow, so it rides in `X-Execution-Id`, where it is available to
   * anyone who wants it and invisible to everyone who does not.
   */
  headers?: Record<string, string>;
}

type Settled<T> = { state: 'fulfilled'; value: T } | { state: 'rejected'; reason: unknown } | { state: 'pending' };

/**
 * Await a promise, but give up on the ANSWER after `ms`.
 *
 * The promise is NOT cancelled on a trip: the run continues, writes its
 * execution record and stamps the trigger when it finishes. Giving up on the
 * answer and giving up on the work are different decisions, and a webhook that
 * took too long to reply is not a reason to abandon a half-done run.
 */
function withCap<T>(p: Promise<T>, ms: number): Promise<Settled<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ state: 'pending' }), ms);
    if (typeof timer.unref === 'function') timer.unref();
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve({ state: 'fulfilled', value });
      },
      (reason) => {
        clearTimeout(timer);
        resolve({ state: 'rejected', reason });
      }
    );
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

export class TriggerDispatcher {
  constructor(private readonly deps: DispatcherDeps) {}

  /**
   * Fire a trigger at its target. Returns the trigger result (also stamped onto
   * the registry). A missing runner or missing target function is a loud failed
   * record, not a thrown error — one fire never crashes the scheduler/bus.
   */
  async fire(input: FireInput): Promise<FireOutcome> {
    const { trigger, triggerType, source, payload, headers, requestId } = input;
    const firedAt = nowIso();
    const targetName = trigger.target.name;

    // WF-001: a workflow target runs through the engine (which writes its own
    // workflow-level + per-step execution records). Same dispatcher path, second
    // target kind — no second dispatch path.
    if (trigger.target.kind === 'workflow') {
      return this.fireWorkflow(trigger, triggerType, source, targetName, payload, firedAt, requestId, input.onStarted);
    }

    const runner = this.deps.getRunner();
    if (!runner) {
      const result = this.finishRejected(trigger.id, {
        triggerType,
        triggerId: trigger.id,
        workflowId: targetName,
        source,
        reason: 'Backend workflow runner is not ready — trigger fire dropped',
        triggerData: payload,
        requestId
      });
      return { result, statusCode: 503, body: JSON.stringify({ error: result.error }) };
    }

    // A trigger pointing at a function that does not exist must be LOUD: run()
    // would 404 without writing any record, so we write the failed record here.
    if (!runner.hasFunction(targetName)) {
      const result = this.finishRejected(trigger.id, {
        triggerType,
        triggerId: trigger.id,
        workflowId: targetName,
        source,
        reason: `Trigger target function "${targetName}" not found on this backend`,
        triggerData: payload,
        requestId
      });
      return { result, statusCode: 404, body: JSON.stringify({ error: result.error }) };
    }

    let result: TriggerResult;
    let statusCode = 500;
    let body = '';
    try {
      const response = await runner.run(
        targetName,
        { body: JSON.stringify(payload), headers: headers || {} },
        { type: triggerType, source, triggerId: trigger.id, requestId, onStarted: input.onStarted }
      );
      statusCode = response.statusCode;
      body = response.body;
      const ok = response.statusCode >= 200 && response.statusCode < 300;
      result = {
        ok,
        at: nowIso(),
        statusCode: response.statusCode,
        error: ok ? undefined : `Target returned HTTP ${response.statusCode}`
      };
    } catch (e) {
      // run() already logs its own failure record; we only record status here.
      const message = e instanceof Error ? e.message : String(e);
      result = { ok: false, at: nowIso(), error: message };
      body = JSON.stringify({ error: message });
    }

    this.deps.registry.recordFire(trigger.id, { firedAt, result });
    recordTriggerFire(triggerType, result.ok);
    return { result, statusCode, body };
  }

  /** The `target.kind === 'workflow'` branch of fire(). */
  private async fireWorkflow(
    trigger: TriggerDef,
    triggerType: RunTriggerContext['type'],
    source: string,
    workflowId: string,
    payload: Record<string, unknown>,
    firedAt: string,
    requestId?: string,
    onStarted?: (executionId: string) => void
  ): Promise<FireOutcome> {
    const workflows = this.deps.getWorkflows ? this.deps.getWorkflows() : null;
    if (!workflows) {
      const result = this.finishRejected(trigger.id, {
        triggerType,
        triggerId: trigger.id,
        workflowId,
        source,
        reason: 'Workflow engine is not ready — trigger fire dropped',
        triggerData: payload,
        requestId
      });
      return { result, statusCode: 503, body: JSON.stringify({ error: result.error }) };
    }

    // CWF-002. `sync` is the ONLY branch that behaves differently; the `async`
    // path below is the identical `await` it has always been, so an existing
    // trigger cannot change behaviour by having this feature added around it.
    const sync = trigger.responseMode === 'sync';
    const runPromise = workflows.run(
      workflowId,
      { type: triggerType, source, triggerId: trigger.id, requestId, onStarted },
      payload
    );

    let found: boolean;
    let runResult: Awaited<typeof runPromise>['result'];

    if (sync) {
      const capMs =
        trigger.responseTimeoutMs && trigger.responseTimeoutMs > 0
          ? trigger.responseTimeoutMs
          : DEFAULT_RESPONSE_TIMEOUT_MS;
      const settled = await withCap(runPromise, capMs);
      if (settled.state === 'pending') {
        // The answer is late; the RUN is not abandoned. Stamp the trigger when
        // it eventually finishes so the panel and the history still agree —
        // just later than the caller did.
        void runPromise.then(
          (late) => {
            if (!late.found || !late.result) return;
            const lateResult = this.resultOf(late.result);
            this.deps.registry.recordFire(trigger.id, { firedAt, result: lateResult });
            recordTriggerFire(triggerType, lateResult.ok);
          },
          () => undefined
        );
        const message =
          `Workflow "${workflowId}" did not finish within ${capMs}ms. It is still running — ` +
          'its result is in the execution history. Raise responseTimeoutMs, or use responseMode "async".';
        const result: TriggerResult = { ok: false, at: nowIso(), statusCode: 504, error: message };
        return {
          result,
          statusCode: 504,
          body: JSON.stringify({ status: 'running', error: message })
        };
      }
      // A rejection propagates exactly as it did before this branch existed.
      if (settled.state === 'rejected') throw settled.reason;
      ({ found, result: runResult } = settled.value);
    } else {
      ({ found, result: runResult } = await runPromise);
    }

    if (!found || !runResult) {
      const result = this.finishRejected(trigger.id, {
        triggerType,
        triggerId: trigger.id,
        workflowId,
        source,
        reason: `Trigger target workflow "${workflowId}" not found on this backend`,
        triggerData: payload,
        requestId
      });
      return { result, statusCode: 404, body: JSON.stringify({ error: result.error }) };
    }

    // The engine already wrote the execution records; we only stamp trigger status.
    const result = this.resultOf(runResult);
    const ok = result.ok;
    this.deps.registry.recordFire(trigger.id, { firedAt, result });
    recordTriggerFire(triggerType, result.ok);

    if (!sync) {
      // Unchanged since WF-005, and deliberately so: this is what every trigger
      // that does not opt in still answers.
      return {
        result,
        statusCode: ok ? 200 : 500,
        body: JSON.stringify({ executionId: runResult.executionId, status: runResult.status })
      };
    }

    return {
      result,
      statusCode: ok ? 200 : 500,
      ...(runResult.executionId ? { headers: { 'X-Execution-Id': runResult.executionId } } : {}),
      // SUCCESS answers with the workflow's own output and nothing else — a
      // Return step's value, or the last step's output when there is no Return
      // step. `null` when the run produced nothing, which is a true statement
      // rather than an empty object pretending to be one.
      //
      // FAILURE keeps the error ENVELOPE. The 404/503/refused bodies in this
      // file are envelopes too, and a sync-mode caller parsing "the output"
      // must never be handed an error that happens to be shaped like one.
      body: ok
        ? JSON.stringify(runResult.output === undefined ? null : runResult.output)
        : JSON.stringify({
            executionId: runResult.executionId,
            status: runResult.status,
            error: result.error
          })
    };
  }

  /** The trigger-status stamp for a finished workflow run. */
  private resultOf(runResult: { status: string; error?: string }): TriggerResult {
    const ok = runResult.status === 'success';
    return {
      ok,
      at: nowIso(),
      statusCode: ok ? 200 : 500,
      error: ok ? undefined : runResult.error || `workflow ${runResult.status}`
    };
  }

  /**
   * Record a refused fire loudly: a failed execution record + status stamp,
   * without running the target. This is how an unauthenticated webhook, an
   * oversize body, or an unmatched hook becomes visible in the History Panel
   * instead of vanishing.
   */
  recordRejection(input: RejectionInput): TriggerResult {
    const result: TriggerResult = { ok: false, at: nowIso(), error: input.reason };
    recordTriggerFire(input.triggerType, false);
    this.writeFailedRecord(input);
    if (input.triggerId) {
      this.deps.registry.recordFire(input.triggerId, { firedAt: result.at, result });
    }
    return result;
  }

  /**
   * FED-004 — record a fire the overlap policy declined, loudly and without
   * calling it a failure.
   *
   * ⚠️ **Three things this deliberately does NOT do**, each of which the obvious
   * implementation (`recordRejection` with a different string) would do:
   *
   *  1. It does not `registry.recordFire`. `fireCount` counts runs; a skip has
   *     none. It calls `recordSkip`, which keeps its own count.
   *  2. It does not `recordTriggerFire`. `nodegx_trigger_fires_total` is a fire
   *     counter and a skip is not a fire — a skip that incremented it would
   *     make a healthy skipping schedule indistinguishable from a firing one on
   *     the only instrument an operator has for that question.
   *  3. It does not complete the execution record as a FAILURE. A skip is a
   *     successful outcome of the policy, and the disposition is in the
   *     metadata where the History Panel reads `timedOut` and `rejected`.
   */
  recordSkip(input: SkipInput): TriggerResult {
    const at = nowIso();
    const logger = this.deps.executions.createLogger();
    if (logger) {
      try {
        logger.startExecution({
          workflowId: input.trigger.target.name,
          workflowName: input.trigger.target.name,
          triggerType: 'schedule',
          triggerData: input.triggerData,
          metadata: {
            backendId: this.deps.backendId,
            backendName: this.deps.backendName,
            triggerSource: input.source,
            triggerId: input.trigger.id,
            // The word AC1 reads, and the word the dashboard branches on.
            disposition: SKIPPED_OVERLAP,
            overlapPolicy: input.policy,
            // "each naming the run it yielded to" — the whole point of the
            // record. `null` is written rather than omitted, so a skip that
            // could not name one says so instead of looking like an older row.
            yieldedTo: input.yieldedTo
          }
        });
        // Succeeded: the policy did its job. The row's `disposition` is what
        // says it did not run.
        logger.completeExecution(true);
      } catch {
        // A logging failure must never propagate into the scheduler's timer.
      }
    }
    this.deps.registry.recordSkip(input.trigger.id, {
      at,
      policy: input.policy as TriggerSkip['policy'],
      yieldedTo: input.yieldedTo
    });
    return { ok: true, at, error: undefined };
  }

  /** Shared tail of fire()'s early-out branches. */
  private finishRejected(triggerId: string, input: RejectionInput): TriggerResult {
    return this.recordRejection({ ...input, triggerId });
  }

  private writeFailedRecord(input: RejectionInput): void {
    const logger = this.deps.executions.createLogger();
    if (!logger) return;
    try {
      logger.startExecution({
        workflowId: input.workflowId,
        workflowName: input.workflowId,
        triggerType: input.triggerType,
        triggerData: input.triggerData,
        metadata: {
          backendId: this.deps.backendId,
          backendName: this.deps.backendName,
          triggerSource: input.source,
          ...(input.triggerId ? { triggerId: input.triggerId } : {}),
          ...(input.requestId ? { requestId: input.requestId } : {}),
          rejected: true
        }
      });
      logger.completeExecution(false, new Error(input.reason));
    } catch {
      // A logging failure must never propagate into the fire path.
    }
  }
}
