/**
 * NSP-019 R31 / R33 — the types that HAVE a spec and no words yet.
 *
 * The property panel draws *How this node works* for a type whose catalog entry carries `rules`
 * and a dashed *How it works: spec in progress* for one of these. The catalog has no other sign
 * that a spec exists, and asking the spec package would load every spec on every selection, so
 * the list is a committed snapshot: `tests-unit/nsp-019/howItWorks.test.tsx` computes it from the
 * spec registry and the catalog and goes red the day it moves (memory: a second copy of a palette
 * drifts silently).
 */
import inProgress from './spec-in-progress.json';

const TYPES: ReadonlySet<string> = new Set(inProgress as string[]);

export function isSpecInProgress(typeName: string): boolean {
  return TYPES.has(typeName);
}

export function specInProgressTypes(): readonly string[] {
  return [...TYPES];
}
