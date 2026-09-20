/**
 * The execution logger every record on this backend is born through — with the record bounded
 * by bytes as well as by count (PRD-002).
 *
 * ## Why here and not in the eight callers
 *
 * `ExecutionHistory.createLogger()` has eight call sites — the cloud-function runner, the
 * workflow engine, the trigger dispatcher (twice), the backup manager (twice), the backup
 * subsystem and the file subsystem — and every one of them writes through the object this
 * class extends. PRD-002 §3.4 asked for the single write point or a reason there are two; this
 * is the single write point. A cap applied in `WorkflowRunner` alone would have bounded cloud
 * functions and left the workflow engine's records, which are written unscrubbed and
 * uncounted, exactly as large as before.
 *
 * ## What is bounded, and where the marker goes
 *
 *  - Every value the substrate would store — `triggerData`, `metadata`, a step's `inputData`
 *    and `outputData` — passes {@link boundValue} at `maxValueBytes`. A cut value becomes the
 *    substrate's own `__truncated` marker (original size named, 1,000-character preview).
 *  - Their stored sizes accumulate against `maxRunBytes`. The value that crosses the budget is
 *    still kept (it is itself bounded); every value after it is replaced by an `__omitted`
 *    marker that names the size it would have been. The run's `metadata.recordCapped` is
 *    stamped at that moment — not at completion, because the run this matters most for is the
 *    one that never finishes — and refreshed with final counts when the run ends.
 *  - `errorMessage` / `errorStack` on the execution and on a step pass {@link boundText}, since
 *    a thrown error carrying a 10MB response body is the same exposure wearing a different name.
 *
 * Each of the two events is announced ONCE per run on the ops log, in the pattern
 * `MAX_LOG_LINES_PER_RUN` set: a loop that cuts a thousand values must not write a thousand
 * warnings, and a cap nobody announces is a correctness bug wearing a safety hat.
 *
 * ## 🔴 Scrub first
 *
 * This class never scrubs: it receives what the caller hands it, and in the cloud-function path
 * that is already the scrubber's output (`WorkflowRunner.createRunContext`). Bounding after
 * scrubbing is what keeps a secret from being cut in half and escaping the match — see
 * `record-bounds.ts` and the straddling-secret test.
 *
 * @module nodegx-backend/execution/BoundedExecutionLogger
 */

import type { ExecutionLogger as CloudExecutionLogger } from '@cloud-runtime/execution-history/ExecutionLogger';
import type { ExecutionStore as CloudExecutionStore } from '@cloud-runtime/execution-history/store';

import { logger } from '../ops/logger';
import { boundText, boundValue, omittedMarker, RecordBounds } from './record-bounds';

// Runtime require, type import — the same split `ExecutionStore.ts` explains: the cloud runtime
// is bundled in by esbuild (jest: moduleNameMapper) and must not enter this package's module
// graph, while its types are right there and were being thrown away.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const executionHistory = require('@cloud-runtime/execution-history');
const CloudLogger: typeof CloudExecutionLogger = executionHistory.ExecutionLogger;

type StartExecutionParams = Parameters<CloudExecutionLogger['startExecution']>[0];
type StartNodeParams = Parameters<CloudExecutionLogger['startNode']>[0];
type Data = Record<string, unknown> | undefined;

export interface BoundedLoggerOptions {
  /** Read once per run at `startExecution` — live through `PUT /admin/ops`, stable within a run. */
  getBounds: () => RecordBounds;
}

/** What `metadata.recordCapped` holds. Stamped on the first event; refreshed at completion. */
export interface RecordCappedStamp {
  /** Values replaced by a `__truncated` marker (over `maxValueBytes`). */
  valuesTruncated: number;
  /** Values replaced by an `__omitted` marker (after `maxRunBytes` was reached). */
  valuesOmitted: number;
  /** The bounds in force for this run, so the record explains itself. */
  maxValueBytes: number;
  maxRunBytes: number;
  /** What the record holds, in the same measure as the bounds. */
  recordBytes: number;
  /** True once the run budget was reached. */
  budgetReached: boolean;
  hint: string;
}

export const RECORD_CAPPED_HINT =
  'this run produced more record than executions.maxValueBytes / maxRunBytes allow — the run itself completed; ' +
  'raise the bounds in ops.json or make the workflow produce less';

export class BoundedExecutionLogger extends CloudLogger {
  private readonly getBounds: () => RecordBounds;
  private bounds: RecordBounds;
  private workflowId = '';
  private runBytes = 0;
  private valuesTruncated = 0;
  private valuesOmitted = 0;
  private budgetReached = false;
  private announcedTruncation = false;

  constructor(store: CloudExecutionStore, options: BoundedLoggerOptions) {
    // The substrate keeps its own per-value fence. It is set to the same number, read now, so
    // the two never disagree about what "too large" means within one run.
    const bounds = options.getBounds();
    super(store, { maxDataSize: bounds.maxValueBytes });
    this.getBounds = options.getBounds;
    this.bounds = bounds;
  }

  startExecution(params: StartExecutionParams): string {
    this.bounds = this.getBounds();
    this.updateConfig({ maxDataSize: this.bounds.maxValueBytes });
    this.workflowId = params.workflowId;
    this.runBytes = 0;
    this.valuesTruncated = 0;
    this.valuesOmitted = 0;
    this.budgetReached = false;
    this.announcedTruncation = false;

    const triggerData = this.take(params.triggerData, 'triggerData', null);
    const metadata = this.take(params.metadata, 'metadata', null);
    const executionId = super.startExecution({ ...params, triggerData, metadata });
    // A trigger body alone can spend the budget. The stamp could not be written before the
    // row existed, so it is written now.
    if (executionId && (this.budgetReached || this.valuesTruncated > 0)) this.stamp(executionId);
    return executionId;
  }

  startNode(params: StartNodeParams): string {
    const inputData = this.take(params.inputData, 'inputData', this.getCurrentExecutionId());
    return super.startNode({ ...params, inputData });
  }

  completeNode(stepId: string, success: boolean, outputData?: Record<string, unknown>, error?: Error): void {
    const bounded = this.take(outputData, 'outputData', this.getCurrentExecutionId());
    super.completeNode(stepId, success, bounded, error ? this.boundError(error) : undefined);
  }

  completeExecution(success: boolean, error?: Error): void {
    const executionId = this.getCurrentExecutionId();
    super.completeExecution(success, error ? this.boundError(error) : undefined);
    // Final counts, after the substrate has written status — `updateExecution` merges nothing
    // itself, so the stamp re-reads and re-merges, and does not touch status.
    if (executionId && (this.budgetReached || this.valuesTruncated > 0)) this.stamp(executionId);
  }

  /** How much record this run has produced so far. Diagnostics. */
  get recordBytes(): number {
    return this.runBytes;
  }

  // ==========================================================================

  /**
   * Bound one value against both limits and account for it. Returns what the substrate should
   * store. `null`/`undefined` cost nothing and pass through as `undefined`.
   */
  private take(value: unknown, what: string, executionId: string | null): Data {
    if (value === undefined || value === null) return undefined;

    const bounded = boundValue(value, this.bounds.maxValueBytes);
    if (bounded.truncated) {
      this.valuesTruncated++;
      if (!this.announcedTruncation) {
        this.announcedTruncation = true;
        logger.warn('execution.record.truncated', {
          workflow: this.workflowId,
          executionId: executionId || undefined,
          what,
          originalBytes: bounded.originalBytes,
          maxValueBytes: this.bounds.maxValueBytes,
          hint: 'a value larger than executions.maxValueBytes — stored as a marker with a preview; the run continues'
        });
      }
    }

    if (this.budgetReached) {
      this.valuesOmitted++;
      return omittedMarker(bounded.originalBytes, this.bounds.maxRunBytes) as unknown as Data;
    }

    this.runBytes += bounded.bytes;
    if (this.runBytes > this.bounds.maxRunBytes) {
      this.budgetReached = true;
      logger.warn('execution.record.capped', {
        workflow: this.workflowId,
        executionId: executionId || undefined,
        recordBytes: this.runBytes,
        maxRunBytes: this.bounds.maxRunBytes,
        hint: 'executions.maxRunBytes reached — the rest of this run’s values are omitted from the record; the run continues'
      });
      if (executionId) this.stamp(executionId);
    }
    return bounded.value as Data;
  }

  /** Merge `recordCapped` into the row's metadata, leaving every other key and the status alone. */
  private stamp(executionId: string): void {
    const store = this.getStore();
    const existing = store.getExecution(executionId);
    const recordCapped: RecordCappedStamp = {
      valuesTruncated: this.valuesTruncated,
      valuesOmitted: this.valuesOmitted,
      maxValueBytes: this.bounds.maxValueBytes,
      maxRunBytes: this.bounds.maxRunBytes,
      recordBytes: this.runBytes,
      budgetReached: this.budgetReached,
      hint: RECORD_CAPPED_HINT
    };
    store.updateExecution(executionId, { metadata: { ...(existing?.metadata || {}), recordCapped } });
  }

  /**
   * An error whose message and stack are bounded. A plain object is enough — the substrate reads
   * `.message` and `.stack` and nothing else — and it means a 10MB message is never copied into
   * a second Error just to be cut.
   */
  private boundError(error: Error): Error {
    const max = this.bounds.maxValueBytes;
    const message = boundText(String(error.message || ''), max);
    const stack = error.stack !== undefined ? boundText(String(error.stack), max) : undefined;
    if (message === error.message && stack === error.stack) return error;
    return { name: error.name, message, stack } as Error;
  }
}
