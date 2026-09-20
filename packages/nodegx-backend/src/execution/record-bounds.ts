/**
 * The size bounds on what an execution record may hold (PRD-002).
 *
 * ## Why count caps were not enough
 *
 * `WorkflowRunner` caps a run at 200 log lines and 1,000 steps, and the shared cloud substrate
 * caps one value at 50KB (`execution-history/store.ts`, `MAX_DATA_SIZE`). What nothing bounded was
 * the **sum**: a thousand steps each carrying a value just under the per-value cap is ~100MB from
 * one run, and `executions.retentionDays` defaults to 30. Richard's incident was records of
 * ~10MB each written by a workflow that misfired one run in two; the per-value cap here would
 * have turned each of those into a 1KB preview, and the per-run budget is for the shape that cap
 * cannot see — many merely-large values that add up.
 *
 * ## Two bounds, because they fail differently
 *
 *  - **Per value** ({@link RecordBounds.maxValueBytes}): one enormous step input or trigger body.
 *    The value is replaced by a marker that names its original size and keeps a preview.
 *  - **Per run** ({@link RecordBounds.maxRunBytes}): the total the run's record may hold. Once
 *    reached, further values are replaced by a smaller marker, the run's `metadata.recordCapped`
 *    is stamped so `GET /executions?capped=true` can name the workflow, and the run **continues** —
 *    this is a bound on the record, never on the execution.
 *
 * ## 🔴 Truncate AFTER scrubbing, never before
 *
 * `SecretValueScrubber` matches secret values against text. Cutting first can split a secret in
 * half and defeat the match, publishing a fragment of a credential into the record. Every caller
 * of {@link boundValue} in this package receives its value from the scrubber, and
 * `prd-002-a-run-cannot-eat-the-disk.test.ts` plants a secret across the boundary to prove it.
 *
 * "Bytes" here is JSON length in UTF-16 code units — the same measure the cloud substrate's own
 * `maxDataSize` uses, so the two fences agree. It is a bound on the record on disk to within a
 * factor of two for non-ASCII text, which is the precision a disk budget needs.
 *
 * @module nodegx-backend/execution/record-bounds
 */

export interface RecordBounds {
  /** Largest single value (a step's input, a trigger body, a log argument) the record keeps whole. */
  maxValueBytes: number;
  /** Total the record of one run may hold before further detail is omitted. */
  maxRunBytes: number;
}

/** A value after bounding, and how much of the record it will occupy. */
export interface BoundedValue {
  value: unknown;
  /** Length of what will be STORED — the marker's size when truncated, not the original's. */
  bytes: number;
  truncated: boolean;
  /** JSON length of the original, whether or not it was cut. */
  originalBytes: number;
}

/** The marker a cut value is replaced with. Field names match the cloud substrate's own, so the run inspector reads both. */
export interface TruncatedMarker {
  __truncated: true;
  __originalSize: number;
  __maxSize: number;
  __preview: string;
}

/** The marker a value is replaced with once the run's budget is spent. */
export interface OmittedMarker {
  __omitted: true;
  __reason: 'run record budget reached';
  __originalSize: number;
  __runBudgetBytes: number;
}

/** How much of a cut value survives as a preview. Matches the cloud substrate. */
export const PREVIEW_CHARS = 1000;

/** `1.5KB`, `10.4MB` — one decimal, for the marker an operator reads. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return `${n}`;
  if (n < 1024) return `${n}B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)}${units[unit]}`;
}

/**
 * Bound one value. `undefined`/`null` pass through at zero cost; anything unserialisable becomes
 * the same `__error` marker the substrate writes, so a value the store could not have kept
 * anyway does not count against the run.
 */
export function boundValue(value: unknown, maxBytes: number): BoundedValue {
  if (value === undefined || value === null) return { value, bytes: 0, truncated: false, originalBytes: 0 };
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch (e) {
    const marker = { __error: 'Failed to serialize data', __message: e instanceof Error ? e.message : 'Unknown error' };
    const bytes = JSON.stringify(marker).length;
    return { value: marker, bytes, truncated: false, originalBytes: bytes };
  }
  // `JSON.stringify(undefined)` inside an object is fine, but a bare function/symbol yields
  // undefined here — the store would write NULL, so it costs nothing.
  if (json === undefined) return { value: undefined, bytes: 0, truncated: false, originalBytes: 0 };
  if (json.length <= maxBytes) return { value, bytes: json.length, truncated: false, originalBytes: json.length };
  const marker: TruncatedMarker = {
    __truncated: true,
    __originalSize: json.length,
    __maxSize: maxBytes,
    __preview: json.slice(0, PREVIEW_CHARS) + '…'
  };
  return { value: marker, bytes: JSON.stringify(marker).length, truncated: true, originalBytes: json.length };
}

/** The marker for a value dropped because the run's budget is spent. Small by construction. */
export function omittedMarker(originalBytes: number, runBudgetBytes: number): OmittedMarker {
  return { __omitted: true, __reason: 'run record budget reached', __originalSize: originalBytes, __runBudgetBytes: runBudgetBytes };
}

/**
 * Bound free text — a log line's message, an error message or stack. The suffix names the
 * original size so the reader sees the cause (`…[truncated, 10.4MB]`) rather than a sentence
 * that just stops.
 */
export function boundText(text: string, maxBytes: number): string {
  if (typeof text !== 'string' || text.length <= maxBytes) return text;
  return `${text.slice(0, maxBytes)}…[truncated, ${formatBytes(text.length)}]`;
}

/** Cheap structural test for a stored value: was it cut, or dropped for the run budget? */
export function isBoundedMarker(value: unknown): value is TruncatedMarker | OmittedMarker {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.__truncated === true || v.__omitted === true;
}
