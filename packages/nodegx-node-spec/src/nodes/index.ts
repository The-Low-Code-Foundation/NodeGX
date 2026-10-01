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
import { DateAdd } from './date-add';
import { DateCompare } from './date-compare';
import { DateDifference } from './date-difference';
import { DateParts } from './date-parts';
import { DateToString } from './date-to-string';
import { Delay } from './delay';
import { Hash } from './hash';
import { HttpRequest } from './http';
import { Inverter } from './inverter';
import { Log } from './log';
import { NewModel } from './new-object';
import { Now } from './now';
import { NumberVariable } from './number';
import { Model2 } from './object';
import { NumberRemapper } from './number-remapper';
import { Or } from './or';
import { ParseCSV } from './parse-csv';
import { ParseXML } from './parse-xml';
import { ParseFeed } from './parse-feed';
import { AnimateToValue } from './animate-to-value';
import { ScreenResolution } from './screen-resolution';
import { ExternalLink } from './external-link';
import { RandomBytes } from './random-bytes';
import { Repeat } from './repeat';
import { JSONStreamParser } from './json-stream-parser';
import { PatternExtractor } from './pattern-extractor';
import { TextAccumulator } from './text-accumulator';
import { StreamBuffer } from './stream-buffer';
import { SetModelProperties } from './set-object-properties';
import { SetVariable } from './set-variable';
import { StaticData } from './static-array';
import { States } from './states';
import { StringVariable } from './string';
import { StringFormat } from './string-format';
import { StringMapper } from './string-mapper';
import { Substring } from './substring';
import { Switch } from './switch';
import { ToCSV } from './to-csv';
import { UniqueId } from './unique-id';
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
  [SetVariable.type]: SetVariable,
  // NSP-013 — dates, time, randomness, parsers
  [DateAdd.type]: DateAdd,
  [DateCompare.type]: DateCompare,
  [DateDifference.type]: DateDifference,
  [DateParts.type]: DateParts,
  [DateToString.type]: DateToString,
  [Now.type]: Now,
  [Hash.type]: Hash,
  [RandomBytes.type]: RandomBytes,
  [UniqueId.type]: UniqueId,
  [ParseCSV.type]: ParseCSV,
  [ParseXML.type]: ParseXML,
  [ParseFeed.type]: ParseFeed,
  [AnimateToValue.type]: AnimateToValue,
  [ScreenResolution.type]: ScreenResolution,
  [ExternalLink.type]: ExternalLink,
  [States.type]: States,
  [ToCSV.type]: ToCSV,
  [Repeat.type]: Repeat,
  [JSONStreamParser.type]: JSONStreamParser,
  [PatternExtractor.type]: PatternExtractor,
  [TextAccumulator.type]: TextAccumulator,
  [StreamBuffer.type]: StreamBuffer
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
  DateAdd,
  DateCompare,
  DateDifference,
  DateParts,
  DateToString,
  Delay,
  Hash,
  HttpRequest,
  Now,
  ParseCSV,
  ParseXML,
  ParseFeed,
  AnimateToValue,
  ScreenResolution,
  ExternalLink,
  States,
  RandomBytes,
  Repeat,
  JSONStreamParser,
  PatternExtractor,
  TextAccumulator,
  StreamBuffer,
  ToCSV,
  UniqueId,
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
