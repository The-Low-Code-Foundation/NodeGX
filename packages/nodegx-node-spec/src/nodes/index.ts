/**
 * The registry — every spec this package holds, keyed by catalog `typeName`.
 *
 * NSP-009's ledger counts this against the 147 picker nodes in the census
 * (dev-docs/tasks/phase-107-the-node-says-what-it-does/census.json).
 */

import type { AnyNodeSpec } from '../spec';
import { And } from './and';
import { BooleanVariable } from './boolean';
import { BooleanToString } from './boolean-to-string';
import { ColorVariable } from './color';
import { ColorBlend } from './color-blend';
import { Condition } from './condition';
import { Counter } from './counter';
import { Inverter } from './inverter';
import { Log } from './log';
import { NumberVariable } from './number';
import { NumberRemapper } from './number-remapper';
import { Or } from './or';
import { StringVariable } from './string';
import { StringFormat } from './string-format';
import { StringMapper } from './string-mapper';
import { Substring } from './substring';
import { Switch } from './switch';
import { ValueChanged } from './value-changed';

export const specs: Readonly<Record<string, AnyNodeSpec>> = Object.freeze({
  // NSP-004 — the pilot five
  [Counter.type]: Counter,
  [Switch.type]: Switch,
  [And.type]: And,
  [Condition.type]: Condition,
  [StringFormat.type]: StringFormat,
  // NSP-011 — logic, math, strings, variables, converters
  [BooleanVariable.type]: BooleanVariable,
  [NumberVariable.type]: NumberVariable,
  [StringVariable.type]: StringVariable,
  [ColorVariable.type]: ColorVariable,
  [BooleanToString.type]: BooleanToString,
  [ColorBlend.type]: ColorBlend,
  [Inverter.type]: Inverter,
  [Log.type]: Log,
  [NumberRemapper.type]: NumberRemapper,
  [Or.type]: Or,
  [StringMapper.type]: StringMapper,
  [Substring.type]: Substring,
  [ValueChanged.type]: ValueChanged
});

export function specFor(typeName: string): AnyNodeSpec | undefined {
  return specs[typeName];
}

export {
  And,
  BooleanToString,
  BooleanVariable,
  ColorBlend,
  ColorVariable,
  Condition,
  Counter,
  Inverter,
  Log,
  NumberRemapper,
  NumberVariable,
  Or,
  StringFormat,
  StringMapper,
  StringVariable,
  Substring,
  Switch,
  ValueChanged
};
