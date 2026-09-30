/**
 * The trace — what a node did, in one form whichever implementation did it (NSP-002 §2.1).
 *
 * Inputs and outputs in one ordered stream; `settle` marks where the target drains its frame.
 * Between two settles the events are grouped canonically: `value` events SORTED BY PORT NAME
 * (changed since the last settle only), then `signal` events in emission order, then `outcome`
 * events in invocation order. "Changed" is canonical inequality with the last value RECORDED for
 * the port (nothing before the first settle, so the first settle records every defined output),
 * "sorted by port name" is code-unit order, and what a frame records for an output is the last
 * DEFINED value it held after any step of the frame — adapter.ts spells the three out (NSP-006).
 * That grouping is a rule of the FORMAT, so that a runtime which
 * pulses a signal synchronously inside a setter and delivers the value at frame end (the
 * interpreted runtime) and one that does both at once (the interpreter) produce the same trace —
 * and so that a target which knows nothing of the spec's declaration order (NSP-006) can still
 * produce a comparable one. `completed` is never an event: every `outcome` implies it. A `failure`
 * outcome's `error` is the implementation's error CODE, not its message.
 *
 * `subject` — what the event happened to — is omitted in a one-node trace, names a node id in a
 * graph trace (NSP-008), and is left open for an app-level subject later (README §8). Nothing in
 * this package emits one; the type must not forbid one.
 *
 * The JSON schema is `schema/trace.schema.json` (`src/schema.ts` validates against it), the
 * canonicaliser is `src/canonical.ts`; this file is the type both agree with.
 */

import type { Outcome } from './spec';

interface Base {
  subject?: string;
}

export type TraceEvent =
  | (Base & { t: 'set'; port: string; value?: unknown })
  | (Base & { t: 'in'; port: string })
  | (Base & { t: 'settle' })
  | (Base & { t: 'value'; port: string; value: unknown })
  | (Base & { t: 'signal'; port: string })
  | (Base & { t: 'outcome'; port: string; value: Outcome; error?: string });

/** Trace-format version — must match the `/v1.json` in the schema's `$id` (tests/schema.test.ts). */
export const TRACE_FORMAT_VERSION = 1;
