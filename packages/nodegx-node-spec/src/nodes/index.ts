/**
 * The registry — every spec this package holds, keyed by catalog `typeName`.
 *
 * NSP-009's ledger counts this against the 147 picker nodes in the census
 * (dev-docs/tasks/phase-107-the-node-says-what-it-does/census.json).
 */

import type { AnyNodeSpec } from '../spec';
import { Counter } from './counter';

export const specs: Readonly<Record<string, AnyNodeSpec>> = Object.freeze({
  [Counter.type]: Counter
});

export function specFor(typeName: string): AnyNodeSpec | undefined {
  return specs[typeName];
}

export { Counter };
