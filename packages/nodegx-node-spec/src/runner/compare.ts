/**
 * Trace comparison — the first differing line, side by side (NSP-003 §2.3).
 */

import type { TraceEvent } from '../trace';

export interface Difference {
  /** Index of the first event that differs; `-1` when the traces are equal. */
  index: number;
  reference?: TraceEvent;
  actual?: TraceEvent;
  /** The target THREW at this point instead of producing an event (adapter.ts `PlayError`). */
  threw?: string;
}

/**
 * The difference when the target threw after producing `partial`: the first differing event if
 * there is one before the throw, otherwise the throw itself where the next event should be.
 */
export function differenceWithThrow(reference: readonly TraceEvent[], partial: readonly TraceEvent[], threw: string): Difference {
  const d = compareTraces(reference, partial);
  if (d.index >= 0 && d.index < partial.length) return { ...d, threw };
  return { index: partial.length, reference: reference[partial.length], threw };
}

export function eventKey(e: TraceEvent): string {
  return JSON.stringify(e, Object.keys(e).sort());
}

export function compareTraces(reference: readonly TraceEvent[], actual: readonly TraceEvent[]): Difference {
  const n = Math.max(reference.length, actual.length);
  for (let i = 0; i < n; i++) {
    const r = reference[i];
    const a = actual[i];
    if (r === undefined || a === undefined || eventKey(r) !== eventKey(a)) return { index: i, reference: r, actual: a };
  }
  return { index: -1 };
}

export function formatDifference(d: Difference, referenceName = 'reference', actualName = 'actual'): string {
  if (d.index < 0) return 'traces are equal';
  const show = (e: TraceEvent | undefined) => (e === undefined ? '<end of trace>' : JSON.stringify(e));
  const actual = d.threw !== undefined && d.actual === undefined ? `<threw: ${d.threw}>` : show(d.actual);
  return `first difference at event ${d.index}:\n  ${referenceName.padEnd(12)} ${show(d.reference)}\n  ${actualName.padEnd(12)} ${actual}`;
}

/** Whether a trace grades anything: an observation event exists (an arm with no predicate grades nothing). */
export function hasObservation(trace: readonly TraceEvent[]): boolean {
  return trace.some((e) => e.t === 'value' || e.t === 'signal' || e.t === 'outcome' || e.t === 'request');
}
