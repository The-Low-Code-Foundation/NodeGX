/**
 * The four assertions the suite needs.
 *
 * Deliberately not jest's `expect`: this suite is framework-neutral (see
 * `index.ts`), and a case that reached for `expect` would bind the contract
 * package to a test runner at runtime. Four functions is the whole budget — if
 * a case needs a fifth, it is probably asserting something adapter-specific.
 *
 * @module conformance/assert
 */

import { ConformanceError } from './context';

/** Fail with `what` unless `cond`. */
export function ok(cond: boolean, what: string): asserts cond {
  if (!cond) throw new ConformanceError(what);
}

/** Strict equality, with both sides in the message. */
export function eq<T>(actual: T, expected: T, what: string): void {
  if (actual !== expected) {
    throw new ConformanceError(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Deep equality over the JSON-shaped values the storage layer returns.
 *
 * Key order is normalised, so this compares *values* and not the object-literal
 * spelling an adapter happened to build. Array order is significant — a case
 * that does not care about order sorts first.
 */
export function deepEq(actual: unknown, expected: unknown, what: string): void {
  const a = JSON.stringify(normalise(actual));
  const b = JSON.stringify(normalise(expected));
  if (a !== b) throw new ConformanceError(`${what}: expected ${b}, got ${a}`);
}

function normalise(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(normalise);
  if (v && typeof v === 'object') {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = normalise(src[k]);
    return out;
  }
  return v;
}

/**
 * The sorted values of one property across a result set.
 *
 * Almost every read case wants "which rows came back", not "in what order" —
 * ordering is asserted only by the cases that are about ordering, so that a
 * `degraded` adapter (§3.4) which returns correct rows in a different order
 * passes everything except those.
 */
export function pluck(rows: Record<string, unknown>[], key: string): string[] {
  return rows.map((r) => String(r[key])).sort();
}
