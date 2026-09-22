/**
 * What a run spent on model calls (FED-003 §3.4).
 *
 * ## Why this is DERIVED at read time and not stored beside the array
 *
 * `WorkflowRunner` stamps `metadata.modelCalls` — one entry per call, written as each call
 * settles. The total is a function of that array, so storing it too would be a second copy of a
 * number, updated by a second writer, on a row that a run can append to after the total was
 * written. There is exactly one way for those to disagree and no way for a reader to tell which
 * is right. So the array is the record and this is the arithmetic, run when somebody asks.
 *
 * ## Why the backend computes it rather than the dashboard
 *
 * Because the dashboard is not the only reader. The admin UI shows an execution as the JSON the
 * route returns; the editor's History panel reads the same route; MCP's backend tools read it
 * too. A sum computed in one of those three is a sum the other two do not have, and phase 96's
 * first rule is that a capability does not live somewhere a person cannot reach it.
 *
 * @module nodegx-backend/execution/modelCost
 */

/** One `Model Request` call as the runtime recorded it. See `noodl-runtime/src/runcontext.ts`. */
interface RecordedModelCall {
  model?: unknown;
  inputTokens?: unknown;
  outputTokens?: unknown;
  cacheReadTokens?: unknown;
  cacheWriteTokens?: unknown;
  durationMs?: unknown;
}

/** The arithmetic, plus the one thing arithmetic cannot say: which models were used. */
export interface ModelCostSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /**
   * Tokens written to the prompt cache (HLT-019). ⚠️ Not in {@link line}: the sentence's shape was
   * ruled on 2026-09-19 and nobody has ruled on a clause for writes. A record from before HLT-019
   * has no such field and sums to 0.
   */
  cacheWriteTokens: number;
  /** Time spent waiting on models, which is not the same as the run's duration. */
  durationMs: number;
  /** Each distinct model this run called, in first-seen order. */
  models: string[];
  /**
   * The same numbers as one sentence a person reads without arithmetic — FED-003 §5.5, ruled by
   * Richard on 2026-09-19 after FED-006 put the record in front of him:
   *
   * `11 model calls · 1,320 in / 121 out tokens · 412 ms · claude-opus-5`
   *
   * 🔴 **There is no money in it, and that is the ruling, not an omission.** A currency figure
   * needs a price per model, per token class; the backend does not have one and any table it
   * carried would go stale silently while continuing to render confidently. A number nobody
   * checks is worse than no number when people act on it. Tokens and counts are what this process
   * actually observed, so tokens and counts are what it says.
   *
   * Composed here rather than in the dashboard for the same reason the sum is: three readers —
   * the admin UI, the editor's History panel and MCP's backend tools — and a sentence written in
   * one of them is a sentence the other two do not have.
   */
  line: string;
}

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

/**
 * Thousands separators, without `toLocaleString`.
 *
 * ⚠️ `toLocaleString()` reads the HOST's locale, so the same run renders `1,320` on one machine
 * and `1.320` on another — and a record is a thing people paste to each other. This is the one
 * grouping, everywhere.
 */
const grouped = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** `412 ms` under a second, `1.3 s` over it — the resolution a person can act on, either way. */
const duration = (ms: number): string => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

/** The sentence. See {@link ModelCostSummary.line}. */
export function formatModelCost(summary: Omit<ModelCostSummary, 'line'>): string {
  const tokens =
    summary.cacheReadTokens > 0
      ? `${grouped(summary.inputTokens)} in (${grouped(summary.cacheReadTokens)} cached) / ` +
        `${grouped(summary.outputTokens)} out tokens`
      : `${grouped(summary.inputTokens)} in / ${grouped(summary.outputTokens)} out tokens`;

  return [
    `${grouped(summary.calls)} model call${summary.calls === 1 ? '' : 's'}`,
    tokens,
    duration(summary.durationMs),
    // Absent rather than empty when the provider answered without naming a model: a trailing
    // separator with nothing after it reads as a value that failed to load.
    ...(summary.models.length ? [summary.models.join(', ')] : [])
  ].join(' \u00b7 ');
}

/**
 * Sum a run's model calls, or `undefined` when it made none.
 *
 * ⚠️ `undefined` rather than a zeroed summary, deliberately: every run that never touches a model
 * would otherwise carry a cost block full of zeros, and "this run spent nothing" and "this run
 * could not have spent anything" are different sentences. The overwhelming majority of runs are
 * the second.
 */
export function summariseModelCalls(metadata: unknown): ModelCostSummary | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const calls = (metadata as { modelCalls?: unknown }).modelCalls;
  if (!Array.isArray(calls) || calls.length === 0) return undefined;

  const summary: Omit<ModelCostSummary, 'line'> = {
    calls: calls.length,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    durationMs: 0,
    models: []
  };

  for (const raw of calls as RecordedModelCall[]) {
    if (!raw || typeof raw !== 'object') continue;
    summary.inputTokens += num(raw.inputTokens);
    summary.outputTokens += num(raw.outputTokens);
    summary.cacheReadTokens += num(raw.cacheReadTokens);
    summary.cacheWriteTokens += num(raw.cacheWriteTokens);
    summary.durationMs += num(raw.durationMs);
    const model = typeof raw.model === 'string' ? raw.model : '';
    if (model && summary.models.indexOf(model) === -1) summary.models.push(model);
  }

  return { ...summary, line: formatModelCost(summary) };
}
