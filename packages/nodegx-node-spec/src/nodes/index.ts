/**
 * The registry — every spec this package holds, keyed by catalog `typeName`.
 *
 * NSP-009's ledger counts this against the 147 picker nodes in the census
 * (dev-docs/tasks/phase-107-the-node-says-what-it-does/census.json).
 */

import type { AnyNodeSpec } from '../spec';
import { And } from './and';
import { Condition } from './condition';
import { Counter } from './counter';
import { StringFormat } from './string-format';
import { Switch } from './switch';

export const specs: Readonly<Record<string, AnyNodeSpec>> = Object.freeze({
  [Counter.type]: Counter,
  [Switch.type]: Switch,
  [And.type]: And,
  [Condition.type]: Condition,
  [StringFormat.type]: StringFormat
});

export function specFor(typeName: string): AnyNodeSpec | undefined {
  return specs[typeName];
}

export { And, Condition, Counter, StringFormat, Switch };
