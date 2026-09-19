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
  durationMs?: unknown;
}

/** The arithmetic, plus the one thing arithmetic cannot say: which models were used. */
export interface ModelCostSummary {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /** Time spent waiting on models, which is not the same as the run's duration. */
  durationMs: number;
  /** Each distinct model this run called, in first-seen order. */
  models: string[];
}

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

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

  const summary: ModelCostSummary = {
    calls: calls.length,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    durationMs: 0,
    models: []
  };

  for (const raw of calls as RecordedModelCall[]) {
    if (!raw || typeof raw !== 'object') continue;
    summary.inputTokens += num(raw.inputTokens);
    summary.outputTokens += num(raw.outputTokens);
    summary.cacheReadTokens += num(raw.cacheReadTokens);
    summary.durationMs += num(raw.durationMs);
    const model = typeof raw.model === 'string' ? raw.model : '';
    if (model && summary.models.indexOf(model) === -1) summary.models.push(model);
  }

  return summary;
}
