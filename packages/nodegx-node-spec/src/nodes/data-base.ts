/**
 * What the data nodes (NSP-012) share: the `Run On Value Change` checkbox ports (run-on-value-change.ts
 * :126-140 — `runOnChange-<input>`, default on, only an explicit `false` unticks), the identifier
 * ports that name a record or an array, the `Error` string the failing ones carry, and the two
 * sentences the empty-value rules are written in.
 *
 * R3 (a): the runtime wins by default. Every rule cites the line it was read from.
 */

import type { ValueInputDecl } from '../spec';

/** run-on-value-change.ts :126-140 — the checkbox governing `displayName`. */
export function runOnChange(displayName: string) {
  return {
    type: 'boolean',
    default: true,
    coerce: 'not-false',
    displayName,
    group: 'Run On Value Change',
    description: 'Whether a new value on ' + displayName + ' re-runs this node. On by default; untick to make this input passive so only the control signal runs it'
  } as const;
}

/** A port that names a shared array (`identifierOf: 'CollectionName'`) or record — a string, as sent. */
export function identifier(displayName: string, group: string, description: string, examples: readonly unknown[]): ValueInputDecl {
  return { type: 'string', coerce: 'none', displayName, group, description, examples };
}

/** The `Error` string output the failing data nodes carry (collection-failure.ts :124-134, crud-mixins `_addFailure`). */
export function errorOutput<S>(description: string, from: (s: Readonly<S>) => unknown) {
  return { type: 'string', displayName: 'Error', group: 'Error', description, from } as const;
}

/** An id is EMPTY for the Object family when it is `undefined`, `null` or `''` (modelnode2.ts :395, modelcrudbase.ts :290). */
export function emptyId(id: unknown): boolean {
  return id === undefined || id === null || id === '';
}

/** The names a comma-separated `properties` parameter lists (modelcrudbase.ts :461-463; modelnode2.ts :496-498). */
export function propertyNames(properties: unknown): string[] {
  if (!properties) return [];
  return String(properties).split(',');
}
