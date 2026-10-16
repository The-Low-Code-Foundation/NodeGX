/**
 * P18-S115-QUERYFILTER (EXP-011 §82). What a Query Records asks the backend for: its `where`, its `order`, its `limit`
 * and its `skip`, as the running app sends them.
 *
 * Before this the exported query was `query('<Class>')` with no parameters, whatever the node's Filter, Sort and Limit
 * said, so a filtered list held every record in the class, and nothing said so. The probe of EXP-008 never saw it: the
 * catalog gives Query Records no static inputs, so it had nothing to vary.
 *
 * The filter is translated by the runtime's own translator, not a copy of it: the calls `QueryUtils.convertVisualFilter`
 * makes (`visualQueryToNeutral` for the QueryEditor shape, `savedFilterToNeutral` with `dropUnresolvedConnected` for
 * the builder's, then `toParseWhere` for the NodeGX backend), run here at export time. Every value this slice accepts
 * is known when the project is exported, so the `where` is a constant: the one the runtime computes at its first fetch.
 * The rest of the node's settings follow `dbcollectionnode2.ts` line for line (`getStorageFilter`, `getStorageLimit`,
 * `getStorageSkip`, `convertVisualSorting`).
 *
 * P18-S115-QUERYPARAMS. A filter value read from a wired port is known only while the app runs, so its `where` is built
 * there (`WiredWhere`): the same translator runs here once for every combination of those values being set or unset,
 * with a marker standing for each set value, and the app picks the combination and puts each value where its marker
 * sits. An unset value drops its condition, as `dropUnresolvedConnected` and the QueryEditor's own rule do. A marker
 * must land whole under a plain comparison (`$eq`, `$ne`, `$lt`, `$gt`, `$lte`, `$gte`), where the translator passes
 * the value through `parseValue` and nothing else; anywhere else (a lowered regex, an `$in` list, a relation) it is
 * refused by name.
 *
 * What it cannot reproduce it refuses by name, before any request is made:
 * - a wired filter value whose query is run by its wired Fetch (P18-S116-QUERYFETCH), whose Run On Value Change box is
 *   unticked, that more than one wire feeds, that also holds a typed-in value, or that lands anywhere but a plain
 *   comparison; more than three of them;
 * - the Javascript filter (a script the runtime runs on every fetch);
 * - a Search term (the backend's full-text path, BAK-008);
 * - a Filter, Sort, Use Limit, Limit or Skip input that is itself wired;
 * - a relation filter whose class the runtime reads off a loaded record (`resolveRelatedClasses`), and a "points to"
 *   condition, whose target class the export's schema snapshot does not carry;
 * - a filter the translator itself refuses: the runtime answers it with Failure and never queries (`setError`).
 */

import {
  FilterTranslationError,
  isVisualQueryFormat,
  savedFilterToNeutral,
  toParseWhere,
  visualQueryToNeutral,
  type FilterSchema,
  type SavedFilterGroup
} from '@noodl/backend-contract/translators';

import type { CollectionIR, ComponentIR, NodeIR, ParamValue } from '../ir/types';

/** What the exported query sends beside `_method: 'GET'`; each key only where the runtime sends it. */
export interface QueryParamsPlan {
  where?: unknown;
  /** P18-S115-QUERYPARAMS. In place of `where` when the Filter reads a wired value: the `where` is built in the app. */
  wired?: WiredWhere;
  sort?: string[];
  limit?: number;
  skip?: number;
}

/** Where a wired value goes in a `where`: the parameter's name, and whether its column is a Date (`parseValue`'s fork). */
export interface WiredValueMark {
  [WIRED_VALUE]: string;
  date: boolean;
}

export const WIRED_VALUE = '@nodegx/wired-value';

/**
 * P18-S115-QUERYPARAMS. The runtime translator's `where` for every combination of the wired values: `cases[mask]`, where
 * bit `i` of `mask` is set when `params[i]` holds a value (not `undefined`). `undefined` is no `where` at all. Each value
 * sits as a `WiredValueMark`.
 */
export interface WiredWhere {
  /** The wired parameters' names (the `qp-` port without its prefix), in the order the filter first reads them. */
  params: string[];
  cases: Array<Record<string, unknown> | undefined>;
}

/** Three wired values are eight translations; the corpus reads at most two. */
export const MAX_WIRED_PARAMS = 3;

export type QuerySettings = { params: QueryParamsPlan } | { refuse: string };

const paramOf = (node: NodeIR, name: string): ParamValue | undefined => node.parameters.find((p) => p.name === name)?.value;

/** A parameter's value as the runtime's setter receives it: a literal or a JSON blob; anything else is not one. */
const valueOf = (value: ParamValue | undefined): unknown =>
  value === undefined ? undefined : value.kind === 'literal' || value.kind === 'json' ? value.value : undefined;

/** `{ field: { operator: value } }` / `{ and | or: [...] }` — true when any leaf asks a relation question. */
function hasRelatedTo(filter: unknown): boolean {
  if (filter === null || typeof filter !== 'object') return false;
  const record = filter as Record<string, unknown>;
  if (Array.isArray(record.and)) return record.and.some(hasRelatedTo);
  if (Array.isArray(record.or)) return record.or.some(hasRelatedTo);
  return 'relatedTo' in record;
}

function relatedToNeedsALoadedRecord(filter: unknown): boolean {
  if (filter === null || typeof filter !== 'object') return false;
  const record = filter as Record<string, unknown>;
  if (Array.isArray(record.and)) return record.and.some(relatedToNeedsALoadedRecord);
  if (Array.isArray(record.or)) return record.or.some(relatedToNeedsALoadedRecord);
  const relatedTo = record.relatedTo as { className?: unknown } | undefined;
  return relatedTo !== undefined && (relatedTo.className === undefined || relatedTo.className === '');
}

function hasPointsTo(filter: unknown): boolean {
  if (filter === null || typeof filter !== 'object') return false;
  const record = filter as Record<string, unknown>;
  if (Array.isArray(record.and)) return record.and.some(hasPointsTo);
  if (Array.isArray(record.or)) return record.or.some(hasPointsTo);
  return Object.values(record).some((condition) => condition !== null && typeof condition === 'object' && 'pointsTo' in condition);
}

/**
 * The schema `QueryUtils.schemaFor` hands the translator, from the project's `dbCollections` snapshot: a column's type
 * is what decides whether a typed-in date goes on the wire as Parse's date envelope.
 */
function schemaOf(collectionName: string, collections: readonly CollectionIR[]): FilterSchema | undefined {
  const collection = collections.find((c) => c.name === collectionName);
  if (collection === undefined) return undefined;
  const properties: Record<string, { type?: string }> = {};
  for (const column of collection.columns) properties[column.name] = { type: column.type };
  return { collection: collectionName, properties };
}

export function querySettingsOf(node: NodeIR, component: ComponentIR, collections: readonly CollectionIR[]): QuerySettings {
  const wired = (port: string) => component.connections.some((c) => c.toId === node.id && c.toProperty === port);
  const collectionName = String(valueOf(paramOf(node, 'collectionName')) ?? '');

  for (const port of ['storageFilterType', 'visualFilter', 'visualSort', 'storageEnableLimit', 'storageLimit', 'storageSkip']) {
    if (wired(port)) return { refuse: `its ${port} input is wired — which records it asks for must be readable off the graph in this slice` };
  }
  if (valueOf(paramOf(node, 'storageFilterType')) === 'json') {
    return { refuse: 'its Filter is a Javascript filter, a script the runtime runs on every fetch — the export translates the Visual filter only' };
  }
  const search = valueOf(paramOf(node, 'search'));
  if (wired('search') || (search !== undefined && search !== '' && search !== null)) {
    return { refuse: "it searches (the Search input), which is the backend's full-text path — not exported in this slice" };
  }

  const params: QueryParamsPlan = {};

  // `getStorageFilter`'s simple branch. The query parameters are the node's `qp-` inputs, keyed by the bare name.
  const visualFilter = valueOf(paramOf(node, 'visualFilter'));
  if (visualFilter !== undefined) {
    const typedIn: Record<string, unknown> = {};
    for (const p of node.parameters) if (p.name.startsWith('qp-')) typedIn[p.name.slice('qp-'.length)] = valueOf(p.value);
    const schema = schemaOf(collectionName, collections);

    /** The runtime's conversion with these parameter values: the translator's `where`, or why the runtime would fail. */
    const translate = (queryParameters: Record<string, unknown>, asked: Set<string>): { where?: Record<string, unknown> } | { refuse: string } => {
      const read = (name: string): unknown => {
        asked.add(name);
        return queryParameters[name];
      };
      let neutral: unknown;
      // `convertVisualFilterToNeutral`'s own fork; anything that is neither shape (null, a string) reads as no filter there too.
      if (isVisualQueryFormat(visualFilter)) {
        // `visualQueryToNeutral` reads `parameters[input]`; a proxy hears which names it asked for.
        const parameters = new Proxy(queryParameters, { get: (_target, key) => (typeof key === 'string' ? read(key) : undefined) });
        neutral = visualQueryToNeutral(visualFilter, parameters);
      } else {
        // The builder stores the port name whole (`qp-x`); the setter keys the value by the bare name.
        const bare = (portName: string) => (portName.startsWith('qp-') ? portName.slice('qp-'.length) : portName);
        neutral = savedFilterToNeutral(visualFilter as unknown as SavedFilterGroup, (portName) => read(bare(portName)), {
          dropUnresolvedConnected: true
        });
      }
      if (neutral === null || neutral === undefined) return {};
      if (hasRelatedTo(neutral) && relatedToNeedsALoadedRecord(neutral)) {
        return { refuse: "its Filter asks a relation question whose class the runtime reads off a loaded record — not exported in this slice" };
      }
      if (hasPointsTo(neutral)) {
        return { refuse: "its Filter has a \"points to\" condition, whose target class the export's schema snapshot does not carry" };
      }
      let where: Record<string, unknown>;
      try {
        where = toParseWhere(neutral as Parameters<typeof toParseWhere>[0], { backend: 'nodegx', schema });
      } catch (error) {
        if (error instanceof FilterTranslationError) {
          return { refuse: `the runtime cannot translate its Filter either ("${error.message}"), so it answers Failure and never queries` };
        }
        throw error;
      }
      return Object.keys(where).length > 0 ? { where } : {};
    };

    // The typed-in reading first: it says which parameters the filter reads, and is the whole answer when none is wired.
    const asked = new Set<string>();
    const typedInReading = translate(typedIn, asked);
    const wiredParams = [...asked].filter((name) => wired(`qp-${name}`));
    if (wiredParams.length === 0) {
      if ('refuse' in typedInReading) return typedInReading;
      if (typedInReading.where !== undefined) params.where = typedInReading.where;
    } else {
      const reading = wiredWhereOf(node, component, wiredParams, typedIn, schema, translate);
      if ('refuse' in reading) return reading;
      params.wired = reading;
    }
  }

  // `convertVisualSorting`, verbatim: the list is sent as it is, an empty one as `order: ''`.
  const visualSort = valueOf(paramOf(node, 'visualSort'));
  if (Array.isArray(visualSort)) {
    params.sort = visualSort.map((s: { property?: unknown; order?: unknown }) => (s?.order === 'descending' ? '-' : '') + String(s?.property));
  }

  // `getStorageLimit` / `getStorageSkip`: nothing unless Use Limit is ticked, then `storageLimit || 10` and `storageSkip || 0`.
  if (valueOf(paramOf(node, 'storageEnableLimit'))) {
    const limit = Number(valueOf(paramOf(node, 'storageLimit')) || 10);
    const skip = Number(valueOf(paramOf(node, 'storageSkip')) || 0);
    params.limit = limit;
    params.skip = skip;
  }

  return { params };
}

/** A marker no typed-in value carries: NUL cannot be typed into the property panel. */
const markerOf = (name: string) => `\u0000nodegx-qp:${name}\u0000`;

/** The comparisons whose value the Parse dialect passes through `parseValue` alone (translators/parse.ts `conditionValue`). */
const PLAIN_COMPARISONS = new Set(['$eq', '$ne', '$lt', '$gt', '$lte', '$gte']);

/**
 * P18-S115-QUERYPARAMS. The `where` for each combination of the wired values being set or unset, each set value a
 * marker placed by the runtime's own translator. A refusal names the parameter and the reason.
 */
function wiredWhereOf(
  node: NodeIR,
  component: ComponentIR,
  params: string[],
  typedIn: Record<string, unknown>,
  schema: FilterSchema | undefined,
  translate: (queryParameters: Record<string, unknown>, asked: Set<string>) => { where?: Record<string, unknown> } | { refuse: string }
): WiredWhere | { refuse: string } {
  const quoted = params.map((n) => `"${n}"`).join(', ');
  const wiresInto = (port: string) => component.connections.filter((c) => c.toId === node.id && c.toProperty === port);
  if (wiresInto('storageFetch').length > 0) {
    return {
      refuse: `its Filter reads ${quoted} from a wired input and its Fetch is wired, so the query runs when Fetch is sent — a wired Fetch is not exported in this slice (P18-S116-QUERYFETCH)`
    };
  }
  if (params.length > MAX_WIRED_PARAMS) {
    return { refuse: `its Filter reads ${params.length} values from wired inputs; the export builds a \`where\` from at most ${MAX_WIRED_PARAMS}` };
  }
  for (const name of params) {
    if (wiresInto(`qp-${name}`).length > 1) {
      return { refuse: `two wires feed its "${name}" input — last-writer-wins is not statically ordered` };
    }
    // Which arrives first, the typed-in value or the wire's, is the runtime's scheduling; 0 of 87 wired ports carry one.
    if (paramOf(node, `qp-${name}`) !== undefined) {
      return { refuse: `its "${name}" input is wired and holds a typed-in value too — which one the first fetch reads is not exported in this slice` };
    }
    // `setQueryParameter` asks `shouldRunOnValueChanged('qp-<name>')`: unticked, a new value waits for the next fetch.
    if (valueOf(paramOf(node, `runOnChange-qp-${name}`)) === false) {
      return {
        refuse: `its Run On Value Change box for "${name}" is unticked, so a new value waits for a fetch something else starts — not exported in this slice`
      };
    }
  }

  const cases: WiredWhere['cases'] = [];
  for (let mask = 0; mask < 1 << params.length; mask++) {
    const values: Record<string, unknown> = { ...typedIn };
    params.forEach((name, i) => {
      // A wired port's value replaces the typed-in one; until a value arrives the setter has stored nothing.
      values[name] = mask & (1 << i) ? markerOf(name) : undefined;
    });
    const reading = translate(values, new Set());
    if ('refuse' in reading) return reading;
    if (reading.where === undefined) {
      cases.push(undefined);
      continue;
    }
    const placed = placeMarkers(reading.where, params, schema);
    if ('refuse' in placed) return placed;
    cases.push(placed.where);
  }
  return { params, cases };
}

/** The translator's `where` with each marker swapped for a `WiredValueMark`, or the refusal for one it cannot place. */
function placeMarkers(
  where: Record<string, unknown>,
  params: string[],
  schema: FilterSchema | undefined
): { where: Record<string, unknown> } | { refuse: string } {
  let refusal: string | undefined;
  const nameIn = (text: string) => params.find((name) => text.includes(markerOf(name)));
  const walk = (value: unknown, key: string | undefined, field: string | undefined): unknown => {
    if (typeof value === 'string') {
      const name = nameIn(value);
      if (name === undefined) return value;
      if (value !== markerOf(name) || key === undefined || !PLAIN_COMPARISONS.has(key) || field === undefined) {
        refusal ??= `its Filter puts the value of "${name}" somewhere other than a plain comparison (${key ?? 'the top'}${field === undefined || field === key ? '' : ` on "${field}"`}), which the runtime reshapes per value — not exported in this slice`;
        return value;
      }
      const mark: WiredValueMark = { [WIRED_VALUE]: name, date: schema?.properties?.[field]?.type === 'Date' };
      return mark;
    }
    if (Array.isArray(value)) return value.map((item) => walk(item, key, field));
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v, k, k.startsWith('$') ? field : k);
      return out;
    }
    return value;
  };
  const placed = walk(where, undefined, undefined) as Record<string, unknown>;
  return refusal === undefined ? { where: placed } : { refuse: refusal };
}

/** True for a `WiredValueMark`. */
export const isWiredValueMark = (value: unknown): value is WiredValueMark =>
  value !== null && typeof value === 'object' && WIRED_VALUE in (value as Record<string, unknown>);

/**
 * One case's `where` as TypeScript: the translator's document printed as JSON (its `$eq` keys need the quotes), each
 * value at its mark printed by `valueCode`.
 */
export function wiredWhereCode(where: Record<string, unknown>, valueCode: (name: string, date: boolean) => string): string {
  const codes: string[] = [];
  const json = JSON.stringify(where, (_key, value: unknown) => {
    if (!isWiredValueMark(value)) return value;
    codes.push(valueCode(value[WIRED_VALUE], value.date));
    return `\u0000${codes.length - 1}\u0000`;
  });
  return json.replace(/"\\u0000(\d+)\\u0000"/g, (_m, index: string) => codes[Number(index)]);
}
