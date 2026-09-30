/**
 * The trace — what a node did, in one form whichever implementation did it (NSP-002 §2.1).
 *
 * Inputs and outputs in one ordered stream; `settle` marks where the target drains its frame.
 * Between two settles the events are grouped canonically: `value` events in the spec's output
 * declaration order, then `signal` events in emission order, then `outcome` events in invocation
 * order. That grouping is a rule of the FORMAT, so that a runtime which pulses a signal
 * synchronously inside a setter and delivers the value at frame end (the interpreted runtime) and
 * one that does both at once (the interpreter) produce the same trace.
 *
 * `subject` — what the event happened to — is omitted in a one-node trace, names a node id in a
 * graph trace (NSP-008), and is left open for an app-level subject later (README §8). Nothing in
 * this package emits one; the type must not forbid one.
 *
 * The JSON schema and the canonicaliser are NSP-002's; this file is the type both will agree with.
 */

import type { Outcome } from './spec';

interface Base {
  subject?: string;
}

export type TraceEvent =
  | (Base & { t: 'set'; port: string; value: unknown })
  | (Base & { t: 'in'; port: string })
  | (Base & { t: 'settle' })
  | (Base & { t: 'value'; port: string; value: unknown })
  | (Base & { t: 'signal'; port: string })
  | (Base & { t: 'outcome'; port: string; value: Outcome; error?: string });

/** Trace-format version, for the schema NSP-002 writes. */
export const TRACE_FORMAT_VERSION = 1;
