/**
 * The registry — every spec this package holds, keyed by catalog `typeName`.
 *
 * NSP-009's ledger counts this against the 147 picker nodes in the census
 * (dev-docs/tasks/phase-107-the-node-says-what-it-does/census.json).
 */

import type { AnyNodeSpec } from '../spec';
import { And } from './and';
import { Collection2 } from './array';
import { CollectionClear } from './array-clear';
import { FilterCollection } from './array-filter';
import { CollectionInsert } from './array-insert';
import { MapCollection } from './array-map';
import { CollectionNew } from './array-new';
import { CollectionRemove } from './array-remove';
import { BooleanVariable } from './boolean';
import { BooleanToString } from './boolean-to-string';
import { ColorVariable } from './color';
import { ColorBlend } from './color-blend';
import { Condition } from './condition';
import { Counter } from './counter';
import { Delay } from './delay';
import { HttpRequest } from './http';
import { Inverter } from './inverter';
import { Log } from './log';
import { NewModel } from './new-object';
import { NumberVariable } from './number';
import { Model2 } from './object';
import { NumberRemapper } from './number-remapper';
import { Or } from './or';
import { SetModelProperties } from './set-object-properties';
import { SetVariable } from './set-variable';
import { StaticData } from './static-array';
import { StringVariable } from './string';
import { StringFormat } from './string-format';
import { StringMapper } from './string-mapper';
import { Substring } from './substring';
import { Switch } from './switch';
import { Uuid } from './uuid';
import { ValueChanged } from './value-changed';
import { Variable2 } from './variable2';

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
  [ValueChanged.type]: ValueChanged,
  // NSP-007 — the world: clock, randomness, network
  [Delay.type]: Delay,
  [Uuid.type]: Uuid,
  [HttpRequest.type]: HttpRequest,
  // NSP-012 — arrays, objects, variables, stores
  [Collection2.type]: Collection2,
  [CollectionNew.type]: CollectionNew,
  [CollectionClear.type]: CollectionClear,
  [CollectionInsert.type]: CollectionInsert,
  [CollectionRemove.type]: CollectionRemove,
  [FilterCollection.type]: FilterCollection,
  [MapCollection.type]: MapCollection,
  [Model2.type]: Model2,
  [NewModel.type]: NewModel,
  [SetModelProperties.type]: SetModelProperties,
  [StaticData.type]: StaticData,
  [Variable2.type]: Variable2,
  [SetVariable.type]: SetVariable
});

export { EQUIVALENT_MUTANTS } from './equivalent-mutants';

export function specFor(typeName: string): AnyNodeSpec | undefined {
  return specs[typeName];
}

export {
  And,
  Collection2,
  CollectionClear,
  CollectionInsert,
  CollectionNew,
  CollectionRemove,
  FilterCollection,
  MapCollection,
  Model2,
  NewModel,
  SetModelProperties,
  SetVariable,
  StaticData,
  Variable2,
  BooleanToString,
  BooleanVariable,
  ColorBlend,
  ColorVariable,
  Condition,
  Counter,
  Delay,
  HttpRequest,
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
  Uuid,
  ValueChanged
};
