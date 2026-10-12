/**
 * Aggregate Records (`noodl.cloud.aggregate`) — read from `packages/noodl-viewer-cloud/src/nodes/data/aggregatenode.js`, with
 * `packages/noodl-runtime/src/api/cloudstore.js`, `api/queryutils.ts` and `api/backends/ParseWireAdapter.ts` beside it, on
 * 2026-10-12 (NSP-022 s99). Cloud only: graded on the runtime's cloud target. The last of the seventeen.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (aggregatenode.js unless named).
 *
 * WHICH SEAM — measured before a line of this (NSP-022 §6.8). The node asks `CloudStore.forScope(modelScope)` (:156), the
 * LEGACY store: no backend is resolved (cloudstore.js :495-501), so its adapter is always the Parse wire (:46-110) and BACKEND
 * (world.ts, R9) — the contract-resolved stores — never sees the call ("the project with none is the legacy store, not a world
 * this seam plays", world.ts). In a cloud function the Parse wire is a `fetch` to the process's loopback, `_noodl_cloudservices`
 * (ParseWireAdapter.ts :228-361) — HOST's `cloudServices` (s97) — so the call travels on NETWORK, exactly as Request's caller
 * lookup does, and what the adapter does with each answer is graded, not stood in.
 *
 * THE RULE, before the citations. A write to Class, the Filter, a filter parameter or any setting the node keeps by name asks
 * for ONE aggregation at the frame's end — unless `Do` is wired, when only `Do` asks (`isInputConnected('storageFetch')`,
 * :77/:327/:332/:394). `Aggregates` and each aggregate's Property and Operation are read then and ask for nothing (:45-47,
 * :334-346). At the frame's end (:104-114) the filter is lowered first: a visual filter that cannot be translated fails the
 * node at once (:145-152). Then the aggregates are read off the project's classes (`CloudStore._collections`, the
 * `dbCollections` metadata — world.ts PROJECT `collections`, :286-310): an aggregate is asked for only when its Property is a
 * column of the class's `schema.properties`, with its Operation, or — none chosen — `distinct` for a String column and `avg`
 * for anything else. ⚠️ An aggregate the list names whose Property was never written THROWS there (`defs[a].prop` on
 * `undefined`, :297); the frame-end callback swallows it (nodecontext.ts) and the node does nothing at all — no request, no
 * Success, no Failure (P107-S99-AGGNOPROP). Then ONE request: `GET <endpoint>/aggregate/<Class>?…` with the Parse wire's
 * spelling (ParseWireAdapter.ts :405-473): `match=`/`group=` and `objectId: null`, or — `dbVersionMajor` above 4 —
 * `$match=`/`$group=` and `_id: null`; the master key and the run's id when the process gave them. A 200 or 201 whose JSON has
 * exactly one result row hands the node that row's value for every aggregate asked; any other row count hands it nothing — and
 * the node calls both a Success (:160-167). Every failure — no address, a status that is not 200/201, a body that is not JSON,
 * a `null` body, a request that never reached a server — is the same sentence, `Failed to aggregate.` (the adapter calls
 * `error()` with nothing, ParseWireAdapter.ts :467-470; :168-170), on Error, then Failure (:97-103).
 *
 * WHAT A SUCCESS SENDS (:160-167): each aggregate's output, `agg-<name>`, only when it exists — a wire made it
 * (`registerOutputIfNeeded`, :315-323) — and only for the names the answer carried. ⚠️ An answer with no row carries no names:
 * the outputs keep the PREVIOUS aggregation's values on their wires while Success fires (P107-S99-AGGSTALE). Error is never
 * cleared by a Success.
 *
 * THE FILTER (:173-191): the saved filter is lowered as `queryutils.convertVisualFilter` does, but WITHOUT a value-port prefix
 * (:180-183 passes none; Query Records passes `qp-`). The parameters are kept by their bare name (`qp-min` → `min`, :357-360),
 * so a condition in the builder's saved shape, whose connected value is named `qp-…`, never finds its value: the condition is
 * dropped as unresolved and the node aggregates the WHOLE class (P107-S99-AGGFILTERPREFIX). The retired visual shape (`rules`,
 * `input`) resolves. With the class in the project's metadata the lowering has its schema (`schemaFor`, queryutils.ts
 * :106-138, either cached shape).
 *
 * THE BUILT-IN BACKEND (P107-S99-AGGCOLUMNS): our own backend's `dbCollections` carries `columns`, not `schema.properties`
 * (nodegx-backend byob-admin.ts `getSchema`). `getAggregates` reads only `schema.properties` (:290-292), so on a project bound to
 * it every aggregate is dropped: the request asks for none, and the answer's row count decides Success. (In the editor the same
 * check draws no Property / Operation ports and no outputs, :455.)
 *
 * NOT SPECCED, named:
 *   - THE JAVASCRIPT FILTER (`Filter` = Javascript, :192-284) — the author's script; NSP-017's escape hatch, as in Query Records.
 *     `storageFilterType`, `storageJSONFilter` and `storageFilterValue-…` are not driven.
 *   - a `relatedTo` condition whose class the record store must supply (`resolveRelatedClasses`, queryutils.ts :177-200).
 *   - the editor's warnings (:116-143, no editor in a play); `raiseRuntimeError` on the error bus (not a port).
 *   - the outputs' types as the editor draws them (`agg-<name>` number or string by the column, :490-516): at play an output
 *     exists only when wired, typed by nothing.
 *   - the browser's XHR face of the Parse wire: this node runs only in a cloud function.
 */

import type { Filter } from '../../../nodegx-backend-contract/src/translators';
import { toParseWhere } from '../../../nodegx-backend-contract/src/translators';
import type { InputDecl, OutputDecl, ValueInputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import type { CollectionScript, HostScript } from '../world';
import { classPicker, selectedClass } from './record-base';
import { toNeutral } from './record-match';

type Def = { prop?: unknown; op?: unknown };

type State = {
  /** :74-78 `_internal.name` */
  name: unknown;
  /** :45-47 `_internal.aggregatesList` */
  list: unknown;
  /** :334-346 `_internal.aggregates` — each name's Property and Operation */
  defs: Readonly<Record<string, Def>>;
  /** :324-328 */
  visualFilter: unknown;
  /** :329-333 `_internal.queryParameters`, by bare name */
  qp: Readonly<Record<string, unknown>>;
  /** :107-108 `fetchScheduled` */
  scheduled: boolean;
  /** :161 `_internal.aggregateValues` — what the outputs read; undefined until a Success */
  values: Readonly<Record<string, unknown>> | undefined;
  /** :98 */
  error: unknown;
  /** the spec's own: the next request's id, and each request in flight → the aggregate names it asked for */
  nextId: number;
  inFlight: Readonly<Record<string, readonly string[]>>;
};

/** :169 — every failure's sentence: the Parse wire's aggregate calls `error()` with nothing (ParseWireAdapter.ts :467-470). */
export const AGGREGATE_FAILED = 'Failed to aggregate.';

/** :185 — a visual filter that throws with no message. */
const FILTER_NOT_APPLIED = 'The filter could not be applied.';

/** ParseWireAdapter.ts :421-428 — the operations the wire spells, in the order it tries them; any other spells `{}`. */
const WIRE_OPS: ReadonlyArray<readonly [string, string]> = [
  ['avg', '$avg'],
  ['sum', '$sum'],
  ['max', '$max'],
  ['min', '$min'],
  ['distinct', '$addToSet']
];

/** cloudstore.js :569-586 — the class of that name in the project's `dbCollections` (a later entry wins, as the cache's keys do). */
function classOf(w: WorldView, name: unknown): CollectionScript | undefined {
  let found: CollectionScript | undefined;
  for (const c of w.collections()) if (c.name === name) found = c;
  return found;
}

/** queryutils.ts :106-138 `schemaFor` — either cached shape: `schema.properties`, or the built-in backend's `columns`. */
function schemaFor(w: WorldView, name: unknown): { collection: string; properties: Record<string, unknown> } | undefined {
  if (!name) return undefined;
  const c = classOf(w, name) as (CollectionScript & { columns?: unknown }) | undefined;
  if (!c) return undefined;
  if (c.schema) return { collection: name as string, properties: c.schema.properties as Record<string, unknown> };
  if (Array.isArray(c.columns)) {
    const properties: Record<string, unknown> = {};
    for (const column of c.columns as Array<{ name?: string; type?: unknown; required?: unknown; targetClass?: unknown } | null>) {
      if (column && column.name) properties[column.name] = { type: column.type, required: column.required, targetClass: column.targetClass };
    }
    return { collection: name as string, properties };
  }
  return undefined;
}

/**
 * :173-191 `getStorageFilter` (the visual branch), through queryutils.ts :295-306 `convertVisualFilter` — no value-port prefix
 * (P107-S99-AGGFILTERPREFIX), the legacy store's backend type (`nodegx`, :157-167), the class's schema. A document with no key is
 * no filter. A throw is the failure, with its message.
 */
function filterOf(s: State, w: WorldView): { where?: Readonly<Record<string, unknown>> } | { failed: string } {
  if (s.visualFilter === undefined) return {};
  try {
    const neutral: Filter | undefined = toNeutral(s.visualFilter, s.qp, '');
    if (neutral === undefined) return {};
    const where = toParseWhere(neutral, { backend: 'nodegx', schema: schemaFor(w, s.name) as never }) as Record<string, unknown>;
    return Object.keys(where).length === 0 ? {} : { where };
  } catch (e) {
    return { failed: (e as Error | undefined)?.message || FILTER_NOT_APPLIED };
  }
}

/**
 * :286-310 `getAggregates` — the group the request asks for, by aggregate name; `'throws'` where the runtime throws (a list that
 * is not text, :296; a name with no Property or Operation ever written, :297).
 */
function groupOf(s: State, w: WorldView): Record<string, Record<string, unknown>> | 'throws' {
  if (!s.list) return {};
  const klass = classOf(w, s.name);
  const properties = klass?.schema?.properties;
  if (!klass || !klass.schema || !properties) return {};
  if (typeof s.list !== 'string') return 'throws';
  const group: Record<string, Record<string, unknown>> = {};
  for (const a of s.list.split(',')) {
    const def = s.defs[a];
    if (def === undefined) return 'throws';
    if (def.prop === undefined) continue;
    const column = properties[def.prop as string];
    if (column === undefined) continue;
    const fallback = column.type === 'String' ? 'distinct' : 'avg';
    group[a] = { [(def.op as string) || fallback]: def.prop };
  }
  return group;
}

/** :97-103 `setError` — Error, then Failure. */
const failure = (set: Partial<State> = {}, message: string = AGGREGATE_FAILED) => ({ set: { ...set, error: message }, send: ['error'] as const, emit: ['failure'] as const });

/** :104-114 — a write that asks for an aggregation, unless `Do` is wired */
const asks = (s: State, w: WorldView): Partial<State> => (!w.wired('storageFetch') && !s.scheduled ? { scheduled: true } : {});

/** `agg-<name>` — read off the last Success (:311-314) */
const aggOutput = (name: string): OutputDecl<State> => ({ type: '*', displayName: name, group: 'Aggregates', description: 'The value of the ' + name + ' aggregate from the last aggregation', from: (s) => s.values?.[name] });

/** The visual filters a panel holds: the builder's saved shape (connected, static, empty), the retired visual shape, a refused `pointsTo`, an operator the lowering does not know. */
const FILTERS: readonly unknown[] = [
  { type: 'and', conditions: [{ field: 'points', operator: 'greaterThan', valueSource: 'connected', valuePortName: 'qp-min' }] },
  { type: 'and', conditions: [{ field: 'points', operator: 'greaterThan', valueSource: 'static', value: 3 }] },
  { combinator: 'and', rules: [{ property: 'points', operator: 'greater than', input: 'min' }] },
  { combinator: 'or', rules: [{ property: 'name', operator: 'equal to', value: 'ada' }, { property: 'points', operator: 'less than', input: 'min' }] },
  { type: 'and', conditions: [{ field: 'owner', operator: 'pointsTo', valueSource: 'static', value: 'u1' }] },
  { type: 'and', conditions: [] }
];

/** :357-385 `registerInputIfNeeded` — every port but `aggregates` registers on its first write. */
function discover(port: string): InputDecl | undefined {
  if (port === 'storageFetch') return { type: 'signal', displayName: 'Do', group: 'Actions', description: 'Runs the aggregation now; once wired, it is the only thing that does' };
  if (port === 'collectionName') return { type: 'string', coerce: 'none', displayName: 'Class', group: 'General', description: 'The class to aggregate over', examples: ['Score', 'Score', 'Score', 'Score', 'Nope', undefined] };
  if (port === 'visualFilter') return { type: 'object', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', description: 'Which records the aggregation covers', examples: FILTERS };
  if (port.startsWith('qp-')) return { type: '*', coerce: 'none', displayName: port.slice('qp-'.length), group: 'Query Parameters', description: 'The value the filter reads for ' + port.slice('qp-'.length), examples: [3, 0, 10, 'a', undefined] };
  if (port.startsWith('aggprop-')) return { type: 'string', coerce: 'none', editOnly: true, displayName: 'Property', group: port.slice('aggprop-'.length), description: 'The column this aggregate is computed over', examples: ['points', 'points', 'name', 'nope', undefined] };
  if (port.startsWith('aggop-')) return { type: 'string', coerce: 'none', editOnly: true, displayName: 'Operation', group: port.slice('aggop-'.length), description: 'min, max, sum or avg for a number column; distinct for a text one', examples: ['sum', 'avg', 'min', 'max', 'distinct', 'count', undefined] };
  // NOT IN THIS SPEC (header): the Javascript filter
  if (port === 'storageFilterType' || port === 'storageJSONFilter' || port.startsWith('storageFilterValue-')) return undefined;
  // :383-385 — any other name is kept by name and asks for an aggregation (`userInputSetter`, :390-395)
  return { type: '*', coerce: 'none', displayName: port, group: 'General', description: 'Kept by name; a write runs the aggregation again unless Do is wired', examples: [1, 'x'] };
}

/** :561-565 `_collectInputs` — the `qp-` ports the editor draws: the retired visual shape's `input`s only (a saved-shape filter draws none). */
function drawnParameters(query: unknown): string[] {
  const names: string[] = [];
  const walk = (q: { rules?: unknown[]; input?: unknown } | undefined): void => {
    if (q === undefined || q === null) return;
    if (q.rules !== undefined) (q.rules as Array<typeof q>).forEach(walk);
    else if (q.input !== undefined && !names.includes(q.input as string)) names.push(q.input as string);
  };
  walk(query as never);
  return names;
}

/** The project a sequence plays with: the Parse-shaped cache (both spellings), the built-in backend's `columns`, none. */
const SCORE: CollectionScript = { name: 'Score', schema: { properties: { points: { type: 'Number' }, name: { type: 'String' }, done: { type: 'Boolean' } } } };
const COLUMNS = { name: 'Score', columns: [{ name: 'points', type: 'Number' }, { name: 'name', type: 'String' }] } as unknown as CollectionScript;

/** HOST's `cloudServices` (s97): the backend's loopback, with and without a run; none (a function outside a backend). */
const CLOUD = { appId: 'app1', masterKey: 'mk', endpoint: 'http://127.0.0.1:8577' };
const HOSTS: readonly HostScript[] = [{ cloudServices: CLOUD }, { cloudServices: CLOUD }, { cloudServices: { ...CLOUD, runId: 'run-1' } }, {}];

export const AggregateRecords = defineNode({
  type: 'noodl.cloud.aggregate',
  version: 1,
  source:
    'packages/noodl-viewer-cloud/src/nodes/data/aggregatenode.js; packages/noodl-runtime/src/api/cloudstore.js; packages/noodl-runtime/src/api/queryutils.ts; packages/noodl-runtime/src/api/backends/ParseWireAdapter.ts',
  needs: ['project', 'host', 'network'],
  worldPool: {
    hosts: HOSTS,
    projectData: [{ collections: [SCORE] }, { collections: [SCORE], dbVersionMajor: 5 }, { collections: [SCORE] }, { collections: [COLUMNS] }, {}],
    // what the loopback answers (ParseWireAdapter.ts :335-360)
    responses: [
      { status: 200, body: { results: [{ total: 12, avgPts: 4, names: ['a', 'b'], extra: 1 }] } },
      { status: 200, body: { results: [{ total: 7 }] } },
      { status: 200, body: { results: [] } },
      { status: 200, body: { results: [{ total: 1 }, { total: 2 }] } },
      { status: 201, body: { results: [{ total: 3, names: [] }] } },
      { status: 200, body: 'null' },
      { status: 200, body: 'not json' },
      { status: 200, body: { results: [null] } },
      { status: 400, body: { code: 141, error: 'Unknown aggregate operator' } },
      { status: 500, body: '<html>bad gateway</html>' },
      { error: 'fetch failed' }
    ],
    delays: [0, 0, 1, 50]
  },

  // :17-23 initialize
  state: { name: undefined, list: undefined, defs: {}, visualFilter: undefined, qp: {}, scheduled: false, values: undefined, error: undefined, nextId: 1, inFlight: {} } as State,

  inputs: {
    // :38-48 — kept; read at the frame's end, asks for nothing
    aggregates: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Aggregates',
      group: 'Aggregates',
      description: 'Names of the aggregates to compute, each of which gets its own property and operation inputs',
      examples: ['total,avgPts,names', 'total,avgPts,names', 'total', 'total,extra', 'names', '', undefined]
    }
  },

  outputs: {
    // :51-56
    fetched: { type: 'signal', displayName: 'Success', group: 'Events', description: 'Fires once the aggregation has returned and the aggregate outputs are up to date' },
    // :57-62
    failure: { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the aggregation could not be run, after the reason has been reported on the error channel' },
    // :63-71
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the last aggregation failed; empty until one does' }
  }
}).on(
  {
    aggregates: (_s, v) => ({ says: 'always: kept, and read when the next aggregation goes; asks for none itself', set: { list: v }, send: [] })
  },
  {
    derived: {
      // :400-624 `updatePorts` — what the editor draws, in its order: Class, Filter type, Do; per aggregate its Property and, once
      // that is a number or text column, its Operation; the visual filter and its parameters. ⚠️ The runtime draws the
      // aggregates' ports only off a class cached in the Parse shape (`schema.properties`, :455) — none on the built-in backend
      // (P107-S99-AGGCOLUMNS); `context.schema` here is the editor's schema whatever its cache's shape.
      inputs: (params, context) => {
        const out: Record<string, InputDecl> = {
          collectionName: classPicker(discover('collectionName') as ValueInputDecl, context),
          storageFilterType: { type: 'enum', enums: ['simple', 'json'], drawnDefault: 'simple', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'General', undriven: 'the Javascript filter is not in this spec (header)' },
          storageFetch: discover('storageFetch')!
        };
        const klass = selectedClass(params, context);
        if (typeof params.aggregates === 'string' && params.collectionName !== undefined && klass) {
          const columns = Object.keys(klass.fields).filter((k) => klass.fields[k].type === 'number' || klass.fields[k].type === 'string');
          for (const a of params.aggregates.split(',')) {
            out['aggprop-' + a] = { ...(discover('aggprop-' + a) as ValueInputDecl), type: 'enum', enums: columns };
            const field = klass.fields[params['aggprop-' + a] as string];
            if (field?.type === 'number') out['aggop-' + a] = { ...(discover('aggop-' + a) as ValueInputDecl), type: 'enum', enums: ['min', 'max', 'sum', 'avg'], drawnDefault: 'avg' };
            else if (field?.type === 'string') out['aggop-' + a] = { ...(discover('aggop-' + a) as ValueInputDecl), type: 'enum', enums: ['distinct'], drawnDefault: 'distinct' };
          }
        }
        if (params.storageFilterType === undefined || params.storageFilterType === 'simple') {
          if (params.collectionName !== undefined) {
            if (klass) out.visualFilter = { ...(discover('visualFilter') as ValueInputDecl), type: 'query-filter' };
            if (params.visualFilter !== undefined) for (const name of drawnParameters(params.visualFilter)) out['qp-' + name] = discover('qp-' + name)!;
          }
        } else if (params.storageFilterType === 'json') {
          out.storageJSONFilter = { type: 'string', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', undriven: 'the Javascript filter is not in this spec (header)' };
        }
        return out;
      },
      needs: ['schema'],
      discover,
      candidates: ['collectionName', 'visualFilter', 'qp-min', 'aggprop-total', 'aggop-total', 'aggprop-avgPts', 'aggprop-names', 'aggop-names', 'aggprop-extra', 'storageFetch', 'limit'],
      // :315-323 — a wire from any `agg-` name registers it
      discoverOutput: (port) => (port.startsWith('agg-') ? aggOutput(port.slice('agg-'.length)) : undefined),
      outputCandidates: ['agg-total', 'agg-avgPts', 'agg-names', 'agg-extra'],
      on: (s, port, v, _derived, w) => {
        if (port === 'collectionName') return { says: 'a Class: kept, and an aggregation at the frame’s end unless Do is wired', set: { name: v, ...asks(s, w) }, send: [] }; // :74-78
        if (port === 'visualFilter') return { set: { visualFilter: v, ...asks(s, w) }, send: [] }; // :324-328
        if (port.startsWith('qp-')) return { set: { qp: { ...s.qp, [port.slice('qp-'.length)]: v }, ...asks(s, w) }, send: [] }; // :329-333
        // :334-346 — a Property or an Operation is kept under its aggregate's name; any other `agg…` name keeps nothing
        if (port.startsWith('aggprop-')) {
          const a = port.slice('aggprop-'.length);
          return { set: { defs: { ...s.defs, [a]: { ...s.defs[a], prop: v } } }, send: [] };
        }
        if (port.startsWith('aggop-')) {
          const a = port.slice('aggop-'.length);
          return { set: { defs: { ...s.defs, [a]: { ...s.defs[a], op: v } } }, send: [] };
        }
        if (port.startsWith('agg')) return { send: [] };
        // :390-395 — kept in `storageSettings`, which only the Javascript filter reads (not in this spec): here, only the ask
        return { set: asks(s, w), send: [] };
      },
      // :362-371 — `Do`, wired or not
      signal: () => ({ says: 'one aggregation at the frame’s end, however many presses', set: { scheduled: true }, send: [] })
    },

    // :109-113 then :115-172 `fetch`, once, at the frame's end
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { set: { scheduled: false }, send: [] }; // a frame that asked for nothing leaves it false
      const drained = { scheduled: false };
      const f = filterOf(s, w);
      if ('failed' in f) return failure(drained, f.failed); // :145-152 — the filter's own words
      const group = groupOf(s, w);
      // :297 — the throw is swallowed by the frame-end callback (nodecontext.ts): nothing is asked, nothing is told
      if (group === 'throws') return { says: 'an aggregate named with no Property written: nothing at all (P107-S99-AGGNOPROP)', set: drained, send: [] };
      // ParseWireAdapter.ts :228-238 — the loopback's address in a cloud function; else the project's endpoint
      const cloud = w.hostCloud();
      const project = w.cloudServices();
      const address = cloud ? cloud.endpoint : project?.endpoint;
      if (!address) return failure(drained); // P107-C33's refusal, reported as the one sentence
      // ParseWireAdapter.ts :405-449 — the grouping, then the version's spelling
      const grouping: Record<string, unknown> = {};
      for (const k of Object.keys(group)) {
        const g: Record<string, string> = {};
        const hit = WIRE_OPS.find(([op]) => group[k][op] !== undefined);
        if (hit) g[hit[1]] = '$' + String(group[k][hit[0]]);
        grouping[k] = g;
      }
      const v = w.dbVersionMajor() as unknown;
      const modern = !!v && (v as number) > 4;
      const args: string[] = [];
      if (modern) {
        grouping._id = null;
        if (f.where) args.push('$match=' + encodeURIComponent(JSON.stringify(f.where)));
        args.push('$group=' + JSON.stringify(grouping));
      } else {
        grouping.objectId = null;
        if (f.where) args.push('match=' + encodeURIComponent(JSON.stringify(f.where)));
        args.push('group=' + JSON.stringify(grouping));
      }
      // ParseWireAdapter.ts :302-339 — the fetch face
      const headers: Record<string, unknown> = { 'X-Parse-Application-Id': cloud ? cloud.appId : project?.appId, 'Content-Type': 'application/json' };
      if (cloud && cloud.masterKey !== undefined) headers['X-Parse-Master-Key'] = cloud.masterKey;
      if (cloud && cloud.runId !== undefined) headers['X-NodeGX-Run'] = cloud.runId;
      const id = String(s.nextId);
      return {
        says: 'one request for the aggregates asked; what it answers is told on Success or Failure',
        set: { ...drained, nextId: s.nextId + 1, inFlight: { ...s.inFlight, [id]: Object.keys(group) } },
        send: [],
        request: { id, method: 'GET', url: address + '/aggregate/' + String(s.name) + '?' + args.join('&'), headers }
      };
    },

    world: {
      // ParseWireAdapter.ts :340-360 (the answer) → :451-471 (aggregate's two callbacks) → :160-170 (the node's)
      response: (s, _i, res, w) => {
        const keys = s.inFlight[res.id];
        if (!keys) return { send: [] };
        const { [res.id]: _done, ...rest } = s.inFlight;
        const set = { inFlight: rest };
        if ('error' in res || 'aborted' in res) return failure(set); // :356-358
        if (res.status !== 200 && res.status !== 201) return failure(set); // :348-355
        let body: unknown;
        try {
          body = JSON.parse(res.body ?? '');
        } catch {
          return failure(set); // :343-346
        }
        // :455-466 — a throw here (a `null` body, a `null` row) lands in the chain's `.catch`: a failure
        if (body === null || body === undefined) return failure(set);
        const results = (body as { results?: unknown }).results as ArrayLike<unknown> | undefined;
        let values: Record<string, unknown> = {};
        if (results && results.length === 1) {
          const row = results[0];
          // the row is read once per aggregate asked: a `null` row throws only when something was asked
          if ((row === null || row === undefined) && keys.length > 0) return failure(set);
          for (const k of keys) values[k] = (row as Record<string, unknown>)[k];
        } else values = {};
        // :160-167 — each aggregate the answer carried, when a wire made its output; then Success
        const sendDerived = Object.keys(values)
          .map((k) => 'agg-' + k)
          .filter((port) => w.hasOutput(port));
        return { set: { ...set, values }, send: [], sendDerived, emit: ['fetched'] };
      }
    }
  }
);
