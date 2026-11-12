/**
 * P123-STU-FNRUNVALUES — what went into and came out of each node a cloud function ran, made safe
 * to keep in the execution record.
 *
 * A workflow's step has always carried `inputData` / `outputData` (WorkflowEngine startNode /
 * completeNode). A function's step carried only `{ outcome, detail? }`: the node's port values
 * existed in the live trace and nowhere else, and a run from last night has no live trace. The
 * runtime now hands the sink each acting node's port values (`NodeRunContext.recordValues`), and
 * this module is what turns those live references into something the record may hold.
 *
 * ## The pipeline, per port, in this order
 *
 *  1. **Detach.** `JSON.parse(JSON.stringify(v))`: the runtime hands LIVE references (a `Model`, an
 *     array the graph keeps mutating), so the copy is taken now, inside the sink. A value that
 *     cannot be serialised becomes the substrate's own `__error` marker, for that port only —
 *     one circular `Model` must not cost the other ports their values.
 *  2. **Redact by name** — the service's ONE key rule (`SENSITIVE_KEY_PATTERN`, through
 *     `ops/redact.ts`): a port, or a key at any depth inside a port's value, named like `password`,
 *     `secret`, `token`, `apiKey`, `authorization`… becomes `[REDACTED]`. Dynamic ports carry their
 *     prefix (`pm-password`, `prop-sessionToken`) and the pattern is a substring match, so they are
 *     caught. ONE exemption, measured on `Model Request` (fed-003): a key ending `Tokens` holding a
 *     NUMBER is a token COUNT (`maxTokens`, `usage.inputTokens`), and redacting it hid what a run
 *     cost while protecting nothing — a credential is never a number named in the plural.
 *  3. **Redact by value** — the `SecretValueScrubber` the log line and the step's old `inputData`
 *     already went through: every function secret the backend holds (secrets.json, the project's
 *     `.env`, `NODEGX_SECRET_*`), wherever it turns up, under whatever name.
 *  4. **Bound** — `boundValue` at `maxValueBytes`, AFTER the scrub (record-bounds.ts: a cut made
 *     first could split a secret and defeat the match). Then the whole map is fitted under the
 *     same bound by cutting its largest ports to markers, so one huge port does not get the whole
 *     step replaced by a single marker when `BoundedExecutionLogger.take` measures it.
 *
 * The node's OWN context — what it hands `beginOutcome` (`Log`'s line, `Model Request`'s provider,
 * model and secret NAME) — is laid over the ports and keeps the treatment it always had: by value,
 * not by name. It is the node's deliberate account of the invocation; `Model Request` passes
 * `apiKeySecret: 'MODEL_KEY'` precisely so the record says WHICH secret, and FED-003 AC3 asserts
 * that name is there.
 *
 * The run budget (`maxRunBytes`) and the run's `recordCapped` stamp stay where they were:
 * `BoundedExecutionLogger`, which every value written here still passes through (it now counts a
 * port cut one level down, too).
 *
 * ## 🔴 A node whose output IS a secret
 *
 * `Secret`'s `Value` port is a credential by construction, and value scrubbing alone misses one
 * shorter than `MIN_SCRUBBABLE_LENGTH`. Its outputs are therefore redacted by node TYPE, whole
 * ({@link redactAllPorts}). Its input (`name`) is the secret's NAME, which the graph already
 * carries in plain text.
 *
 * @module nodegx-backend/workflow/stepValues
 */

import { boundValue } from '../execution/record-bounds';
import { isSensitiveKey, REDACTED } from '../ops/redact';

/** Node types every one of whose outputs is a credential. */
export const SECRET_OUTPUT_NODE_TYPES: ReadonlySet<string> = new Set(['noodl.cloud.secret']);

/** The marker a cut value becomes is about this size; cutting anything smaller would grow it. */
const MARKER_FLOOR_BYTES = 1200;

/** Same depth as the shared scrubbers: past it a value is kept as it is. */
const MAX_DEPTH = 6;

export interface StepValueOptions {
  /** The value scrubber over the backend's secrets, when there is one. */
  scrub?: { scrubValue(value: unknown): unknown };
  /** `executions.maxValueBytes` for this run. */
  maxValueBytes: number;
}

function jsonLength(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    return json === undefined ? 0 : json.length;
  } catch {
    return 0;
  }
}

/** A key that names a credential, unless it is a token COUNT (see the module note, step 2). */
function redactsByName(key: string, value: unknown): boolean {
  if (!isSensitiveKey(key)) return false;
  return !(typeof value === 'number' && /tokens$/i.test(key));
}

/** Step 2, over a detached (plain JSON) value. */
function redactByName(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redactByName(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = redactsByName(key, v) ? REDACTED : redactByName(v, depth + 1);
  }
  return out;
}

/** Step 1, port by port. */
function detach(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(values)) {
    let json: string | undefined;
    try {
      json = JSON.stringify(values[name]);
    } catch (e) {
      out[name] = { __error: 'Failed to serialize data', __message: e instanceof Error ? e.message : 'Unknown error' };
      continue;
    }
    if (json === undefined) continue;
    out[name] = JSON.parse(json);
  }
  return out;
}

/**
 * A record-safe copy of a node's port map: detached, redacted by name and by value, bounded.
 *
 * @param ports the node's port values (`RuntimeStepStart.inputs` / `RuntimeStepEnd.outputs`)
 * @param own   the node's own context (`RuntimeStepStart.inputData`), laid over the ports and
 *              redacted by value only, as it always was
 * @returns `undefined` when there is nothing to record, so a step with no values carries no `{}`
 */
export function recordablePortValues(
  ports: Record<string, unknown> | undefined,
  options: StepValueOptions,
  own?: Record<string, unknown>
): Record<string, unknown> | undefined {
  const fromPorts =
    ports && typeof ports === 'object' ? (redactByName(detach(ports), 0) as Record<string, unknown>) : {};
  const fromNode = own && typeof own === 'object' ? detach(own) : {};
  const merged = { ...fromPorts, ...fromNode };
  if (Object.keys(merged).length === 0) return undefined;

  // Step 3.
  const scrubbed = (options.scrub ? options.scrub.scrubValue(merged) : merged) as Record<string, unknown>;

  // Step 4 — per port, then the map as a whole.
  const max = options.maxValueBytes;
  const out: Record<string, unknown> = {};
  const sizes: Record<string, number> = {};
  for (const name of Object.keys(scrubbed)) {
    const bounded = boundValue(scrubbed[name], max);
    out[name] = bounded.value;
    sizes[name] = bounded.truncated ? 0 : bounded.bytes;
  }
  while (jsonLength(out) > max) {
    let largest: string | undefined;
    for (const name of Object.keys(sizes)) {
      if (sizes[name] > MARKER_FLOOR_BYTES && (largest === undefined || sizes[name] > sizes[largest])) largest = name;
    }
    // Nothing left worth cutting: the logger's own whole-value bound has the last word.
    if (largest === undefined) break;
    out[largest] = boundValue(out[largest], MARKER_FLOOR_BYTES).value;
    sizes[largest] = 0;
  }
  return out;
}

/** Every port of a node whose outputs are credentials, replaced whole. */
export function redactAllPorts(values: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!values) return undefined;
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(values)) if (values[name] !== undefined) out[name] = REDACTED;
  return Object.keys(out).length ? out : undefined;
}
