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
 * What it cannot reproduce it refuses by name, before any request is made:
 * - a filter value read from a wired port (the `where` changes while the app runs; P18-S115-QUERYPARAMS);
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
  sort?: string[];
  limit?: number;
  skip?: number;
}

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
    const asked = new Set<string>();
    const queryParameters: Record<string, unknown> = {};
    for (const p of node.parameters) if (p.name.startsWith('qp-')) queryParameters[p.name.slice('qp-'.length)] = valueOf(p.value);
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
    const wiredParams = [...asked].filter((name) => wired(`qp-${name}`));
    if (wiredParams.length > 0) {
      return {
        refuse: `its Filter reads ${wiredParams.map((n) => `"${n}"`).join(', ')} from a wired input, so the query changes while the app runs — not exported in this slice (P18-S115-QUERYPARAMS)`
      };
    }
    if (neutral !== null && neutral !== undefined) {
      if (hasRelatedTo(neutral) && relatedToNeedsALoadedRecord(neutral)) {
        return { refuse: "its Filter asks a relation question whose class the runtime reads off a loaded record — not exported in this slice" };
      }
      if (hasPointsTo(neutral)) {
        return { refuse: "its Filter has a \"points to\" condition, whose target class the export's schema snapshot does not carry" };
      }
      let where: Record<string, unknown>;
      try {
        where = toParseWhere(neutral as Parameters<typeof toParseWhere>[0], { backend: 'nodegx', schema: schemaOf(collectionName, collections) });
      } catch (error) {
        if (error instanceof FilterTranslationError) {
          return { refuse: `the runtime cannot translate its Filter either ("${error.message}"), so it answers Failure and never queries` };
        }
        throw error;
      }
      if (Object.keys(where).length > 0) params.where = where;
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
