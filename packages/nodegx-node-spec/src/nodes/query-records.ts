/**
 * Query Records (`DbCollection2`) — read from `packages/noodl-runtime/src/nodes/std-library/data/dbcollectionnode2.ts`
 * on 2026-10-02 (NSP-014 s23), with `api/queryutils.ts` and the backend contract's filter translators
 * (`@noodl/backend-contract/translators`) beside it. SLICE A: the query a node makes and what it does with the answer.
 * SLICE B (s24): watching the store — another node's write on the bound backend patches the rows in place.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: a Query Records node has NO declared input — every port is registered on its
 * first write (:1147-1208). Writing the Class, the Search or a filter parameter (`qp-<name>`) re-queries when the
 * value CHANGED and that port's own Run On Value Change box is on; the Backend and every query setting (the visual
 * filter, the sort, Use limit / Limit / Skip, Fetch total count, any other name) share ONE box, `Query settings` —
 * the visual filter and the sort re-query on every write, changed or not (:1118-1127); `Do` (`storageFetch`)
 * re-queries always. However many arrive in a frame, ONE query runs at the frame's end (:820-829).
 *
 * THE QUERY (:831-944): a Backend the project does not have fails at once with the not-configured sentence (no
 * call). Otherwise a fresh anonymous array is made for the answer (a guid draw, `Collection.get()`), then the filter
 * is built (:946-1089): the visual filter becomes the contract's NEUTRAL filter (two saved shapes; a rule whose
 * parameter port has supplied nothing does not narrow the query) and ALSO the Parse `where` the local matcher reads
 * — and that lowering can REFUSE a filter (a `pointsTo` with no class schema), which fails the query with the
 * refusal's message and makes no call. Then the node hands its backend `query({ collection: <Class>, where: <the
 * neutral filter>, sort: <'-'-prefixed names, from the visual sort>, limit, skip, count, search })` (world.ts BACKEND,
 * R9): `limit` / `skip` only under Use limit (`Limit || 10`, `Skip || 0`, :1092-1102), `count` whether Fetch total
 * count is on, `search` the Search text or nothing when it is empty.
 * SUCCESS (:888-904): each row becomes a registry record under its `objectId` (`_fromJSON`, as Record's — the Class
 * as it is when the answer lands), the array holds them in the answer's order; a total count handed back is kept and
 * re-sent on `Total Count`; the array becomes `Items` (Items, First Record Id, Is Empty and Count re-sent) and Success
 * pulses. FAILURE (:905-943): the FIRST failure publishes the empty array (Items `[]`, Is Empty true); a later one
 * keeps the rows already shown (REL-011b). Error is the backend's message or `Failed to fetch.`, then Failure pulses.
 * Error is never cleared. A Do while a query is out is a second query; each answer publishes its own array.
 *
 * THE OUTPUTS: `Items` is the array itself (`undefined` before the first answer), First Record Id the first record's
 * id, Is Empty true until an array is held, Count its size or 0. `Total Count` (and any other output a graph wires,
 * :1109-1116) reads the stored setting of that name. The Realtime outputs read nothing until a subscription runs.
 *
 * NO OUTCOME CONTRACT: `Success` is `fetched` and `Failure` a plain signal — Do has no tokens; this node predates
 * ERG-001 (the Record node's twin has them).
 *
 * WATCHING THE STORE (slice B, s24; :251-363, :600-616). The node listens to ONE store: the legacy store from creation
 * (:372, which no world write reaches), then the store of the backend each query resolved (:850 — before the filter
 * is built, so a refused filter still moves it; the not-configured backend does not). A write ANOTHER node made on
 * that backend (world.ts BACKEND `events`; graph s08 with the real writers) is heard when the `Record changes` box is
 * ticked, an array is held (an answer or the first failure landed), and the write's class is the Class AS IT IS NOW.
 * With a Search term the node re-queries at the next frame end (BAK-008) and patches nothing. Otherwise the record is
 * read from the registry (which already holds the write) and matched against the query MADE last — its Parse `where`,
 * sort and limit (:873-879), even while that query's answer is still out — by the LOCAL matcher (record-match.ts):
 *   - `create`: a match joins — under a sort before the first member that sorts after it, with none at the end; then,
 *     over Limit, one is dropped: the LAST under a descending first sort key, otherwise the FIRST (row C40);
 *   - `save`: a member that no longer matches leaves; a non-member that now matches joins as a create does; a member
 *     that still matches keeps its place, whatever moved (row C41);
 *   - `delete`: the member goes.
 * A change re-sends Items, Count, First Record Id and Is Empty; a create or save that changed nothing re-sends nothing,
 * and a delete re-sends the four even when nothing was removed (unchanged values: no trace shows it). The node's own array watcher (:237-249) re-sends three of them
 * at the frame end — the same values, so no trace shows it.
 *
 * NOT SPECCED, named (each a later slice or a seam not built):
 *   - REALTIME (`Subscribe To Changes`, :650-805): a subscription per transport — a REALTIME seam the world does not
 *     have. `realtime` is not accepted by this spec (the generator never writes it); the outputs keep their unsubscribed
 *     values.
 *   - THE JAVASCRIPT FILTER (`Filter` = Javascript, :996-1089): the author's script, run with `where` / `filter` /
 *     `sort` / `Inputs` / `$vars` — NSP-017's escape hatch. `storageFilterType`, `storageJSONFilter` and
 *     `storageFilterValue-…` are not accepted here.
 *   - the success's schema conversions (as Record's); a relation filter's class read off the record store; the
 *     editor's warnings (no editor in a play); `raiseRuntimeError` on the error bus (not a port).
 */

import type { Filter } from '../../../nodegx-backend-contract/src/translators';
import { isVisualQueryFormat, savedFilterToNeutral, toParseWhere, visualQueryToNeutral, type SavedFilterGroup, type VisualQueryNode } from '../../../nodegx-backend-contract/src/translators';
import type { InputDecl, OutputDecl } from '../spec';
import { defineNode } from '../spec';
import type { RecordRef } from '../registry';
import type { BackendScript } from '../world';
import { valueDidChange } from './condition';
import { NO_BACKEND_MESSAGE } from './record-base';
import { compareObjects, matchesQuery } from './record-match';

type QueryRecordsState = {
  /** `_internal.name` — the Class (:563-570) */
  name: unknown;
  /** `_internal.backendId` (:1179-1186) */
  backendId: unknown;
  /** `_internal.visualFilter` (:1118-1122) */
  visualFilter: unknown;
  /** `_internal.visualSorting` (:1123-1127) */
  visualSorting: unknown;
  /** `_internal.search` (:1131-1138) */
  search: unknown;
  /** `_internal.queryParameters`, by bare name (:1139-1146) */
  queryParameters: Readonly<Record<string, unknown>>;
  /** `_internal.storageSettings` — every other port, by name (:1215-1222); a success's total count lands here too (:899) */
  settings: Readonly<Record<string, unknown>>;
  /** `_internal.collection`, by the array's id (`undefined` until the first answer or first failure) */
  collection: string | undefined;
  /** `_internal.error` (:814) */
  error: string | undefined;
  /** `_internal.fetchScheduled` (:822-828) */
  fetchScheduled: boolean;
  /** every query made, by the spec's call id: the array minted for its answer (:852) */
  calls: Readonly<Record<string, string>>;
  nextCall: number;
  /** s24 — `_internal.boundStore`: the backend whose store the node listens to (:600-616, rebound at a query :850); `undefined`: the legacy store it bound in `initialize` (:372), which no world write reaches */
  bound: string | undefined;
  /** s24 — `_internal.currentQuery` (:873-879): the Parse `where`, sort and limit of the last query MADE — what a write made elsewhere is matched against */
  query: { where: Readonly<Record<string, unknown>> | undefined; sort: readonly string[] | undefined; limit: number | undefined } | undefined;
  /** s24 — the `Record changes` box (`runOnChange-records`, :233), read by the store listener (:253) */
  recordsBox: boolean;
};

/** :1205-1207 → :1215-1222 — any other name is a stored setting, re-querying when it changed under the Query settings box. */
const GENERIC_SETTING = (name: string): InputDecl => ({
  type: '*',
  coerce: 'none',
  displayName: name,
  group: 'Query',
  description: 'Stored by name; a change re-queries under Query settings',
  examples: SETTING_EXAMPLES[name] ?? [true, 'x']
});

/** The settings the editor draws (updatePorts :1227-1456), with the values a panel holds. */
const SETTING_EXAMPLES: Readonly<Record<string, readonly unknown[]>> = {
  storageEnableLimit: [true, true, false],
  storageLimit: [2, 1, 0, 5],
  storageSkip: [1, 0, 3],
  storageEnableCount: [true, false]
};

/** Visual filters a panel holds: the builder's saved shape (static, connected, a refused `pointsTo`, empty) and the retired QueryEditor shape. */
const FILTERS: readonly unknown[] = [
  { type: 'and', conditions: [{ field: 'title', operator: 'equalTo', valueSource: 'static', value: 'a' }] },
  { type: 'and', conditions: [{ field: 'n', operator: 'greaterThan', valueSource: 'connected', valuePortName: 'qp-min' }] },
  { type: 'or', conditions: [{ field: 'title', operator: 'equalTo', valueSource: 'static', value: 'a' }, { field: 'n', operator: 'lessThan', valueSource: 'connected', valuePortName: 'qp-min' }] },
  { type: 'and', conditions: [{ field: 'owner', operator: 'pointsTo', valueSource: 'static', value: 'u1' }] },
  { type: 'and', conditions: [] },
  { combinator: 'and', rules: [{ property: 'title', operator: 'equal to', input: 'min' }] }
];

const SORTS: readonly unknown[] = [[{ property: 'title', order: 'ascending' }], [{ property: 'n', order: 'descending' }, { property: 'title', order: 'ascending' }], []];

/** :1153-1159 — a filter parameter port; the bare name keys `queryParameters`. */
const queryParameter = (name: string): InputDecl => ({ type: '*', coerce: 'none', displayName: name, group: 'Query Parameters', description: 'The value the filter reads for ' + name, examples: [1, 3, 'a', undefined] });

/** run-on-value-change.ts — a checkbox: absent or anything but `false` is ticked. */
const checkbox = (displayName: string): InputDecl => ({
  type: 'boolean',
  default: true,
  coerce: 'not-false',
  displayName,
  group: 'Run On Value Change',
  description: 'Whether a new value on ' + displayName + ' re-runs this node. On by default; untick to make this input passive so only the control signal runs it'
});

const ticked = (derived: Readonly<Record<string, unknown>>, governed: string) => derived['runOnChange-' + governed] !== false;

/** :1227-1456 updatePorts — `Do`, `Class`, `Backend`, `Search`, the visual filter and sort, by first write. */
function discover(port: string): InputDecl | undefined {
  if (port === 'storageFetch') return { type: 'signal', displayName: 'Do', group: 'Actions', description: 'Runs the query again now' };
  if (port === 'collectionName') return { type: 'string', coerce: 'none', displayName: 'Class', group: 'General', description: 'The class to query', examples: ['Lesson', 'Lesson', 'Lesson', 'Lesson', 'Lesson', 'Note', '', undefined] };
  if (port === 'backendId') return { type: 'string', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', description: 'Which backend to query', examples: ['_active_', 'main', 'other', 'nope'] };
  if (port === 'search') return { type: 'string', coerce: 'none', displayName: 'Search', group: 'Search', description: 'Full-text search term; empty for none', examples: ['ada', 'ada', '', undefined] };
  if (port === 'visualFilter') return { type: 'object', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', description: 'The visual filter', examples: FILTERS };
  if (port === 'visualSort') return { type: 'array', coerce: 'none', editOnly: true, displayName: 'Sort', group: 'Sorting', description: 'The visual sort', examples: SORTS };
  if (port.startsWith('qp-')) return queryParameter(port.slice('qp-'.length));
  if (port.startsWith('runOnChange-')) return checkbox(port.slice('runOnChange-'.length));
  // NOT IN SLICE A (header): the realtime subscription and the Javascript filter
  if (port === 'realtime' || port === 'storageFilterType' || port === 'storageJSONFilter' || port.startsWith('storageFilterValue-')) return undefined;
  return GENERIC_SETTING(port); // :1205-1207 userInputSetter
}

/** queryutils.ts :278-293 convertVisualFilterToNeutral — both saved shapes; an unresolved connected rule drops. */
function toNeutral(query: unknown, parameters: Readonly<Record<string, unknown>>): Filter | undefined {
  const neutral = isVisualQueryFormat(query as VisualQueryNode)
    ? visualQueryToNeutral(query as VisualQueryNode, { ...parameters })
    : savedFilterToNeutral(query as SavedFilterGroup, (portName) => parameters[portName.startsWith('qp-') ? portName.slice('qp-'.length) : portName], { dropUnresolvedConnected: true });
  return neutral === null ? undefined : neutral;
}

/**
 * queryutils.ts :295-306 convertVisualFilter — the same filter lowered to Parse for the local matcher; it may THROW (a
 * refusal). The backend type is the legacy store's, which answers `nodegx` unconditionally (:157-169); a play's
 * project has no class schema cached (`schemaFor` → undefined), so `pointsTo` is refused. A document with no key is
 * no filter (:306).
 */
function lowerToParse(neutral: Filter | undefined): Readonly<Record<string, unknown>> | undefined {
  if (neutral === undefined) return undefined;
  const where = toParseWhere(neutral, { backend: 'nodegx', schema: undefined }) as Record<string, unknown>;
  return Object.keys(where).length === 0 ? undefined : where;
}

/**
 * s24 — writes made elsewhere (world.ts BACKEND `events`): one at every doubling of the clock from 2 ms to 65 s, so an
 * advance made after the first query reaches some whatever its size — a record created that matches `title = a`, one
 * that does not, a member saved out of the filter and back, a member deleted, a non-member deleted, a write to another
 * class. Measured s24: with the seven hand-placed writes of the first draft, 1 sequence in 400 (two seeds) acted on one.
 */
const WRITE_CYCLE: ReadonlyArray<Omit<NonNullable<BackendScript['events']>[number], 'at'>> = [
  { type: 'create', collection: 'Lesson', objectId: 'r4', data: { title: 'a', n: 0 } },
  { type: 'save', collection: 'Lesson', objectId: 'r1', data: { title: 'z', n: 9 } },
  { type: 'create', collection: 'Note', objectId: 'r5', data: { title: 'a', n: 4 } },
  { type: 'delete', collection: 'Lesson', objectId: 'r2' },
  { type: 'create', collection: 'Lesson', objectId: 'r6', data: { title: 'b', n: 5 } },
  { type: 'save', collection: 'Lesson', objectId: 'r6', data: { title: 'a', n: 1 } },
  { type: 'delete', collection: 'Lesson', objectId: 'r9' },
  { type: 'save', collection: 'Lesson', objectId: 'r1', data: { title: 'a', n: 1 } }
];
const WRITES: NonNullable<BackendScript['events']> = Array.from({ length: 16 }, (_, k) => ({ at: 2 ** (k + 1), ...WRITE_CYCLE[k % WRITE_CYCLE.length] }));

/** The backends a sequence plays with: rows at once (weighted), rows with a total count, an empty answer, late, refused with and without a message, silent, two backends — and (s24) the same worlds with writes made elsewhere. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { answers: [{ answer: { ok: { results: [{ objectId: 'r1', title: 'a', n: 1 }, { objectId: 'r2', title: 'b', n: 2 }] } } }] },
  { answers: [{ answer: { ok: { results: [{ objectId: 'r1', title: 'a', n: 1 }, { objectId: 'r2', title: 'b', n: 2 }] } } }], events: WRITES },
  { answers: [{ answer: { ok: { results: [{ objectId: 'r1', title: 'a', n: 1 }, { objectId: 'r2', title: 'b', n: 2 }, { objectId: 'r3', title: 'c', n: 3 }] } } }], events: WRITES },
  { answers: [{ answer: { ok: { results: [{ objectId: 'r2', title: 'b', n: 2 }], count: 7 } } }], events: WRITES },
  { answers: [{ answer: { ok: { results: [] } } }] },
  { answers: [{ answer: { ok: { results: [] } } }], events: [{ at: 1, type: 'create', collection: 'Lesson', objectId: 'r7', data: { title: 'a', n: 2 } }, { at: 10, type: 'create', collection: 'Lesson', objectId: 'r8', data: { title: 'b', n: 8 } }, ...WRITES] },
  { backends: ['main', 'other'], answers: [{ answer: { ok: { results: [{ objectId: 'r3', title: 'c' }] } }, after: 1 }] },
  { backends: ['main', 'other'], answers: [{ answer: { ok: { results: [{ objectId: 'r1', title: 'a', n: 1 }] } }, after: 1 }], events: [{ at: 5, backend: 'other', type: 'create', collection: 'Lesson', objectId: 'r4', data: { title: 'a', n: 0 } }, ...WRITES.slice(1)] },
  { answers: [{ answer: { error: 'Forbidden' } }] },
  { answers: [{ answer: { error: 'Forbidden' } }], events: WRITES },
  { answers: [{ answer: { error: null }, after: 10 }] },
  { answers: [{ answer: { never: true } }] },
  { backends: ['main', 'other'], answers: [{ match: { backend: 'other' }, answer: { error: 'Unknown class' } }, { match: { collection: 'Lesson' }, answer: { ok: { results: [{ objectId: 'r1', title: 'a' }] } }, after: 1 }, { answer: { error: '' } }] }
];

export const QueryRecords = defineNode({
  type: 'DbCollection2',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/dbcollectionnode2.ts; api/queryutils.ts; @noodl/backend-contract translators',
  needs: ['backend', 'registry', 'random'],
  worldPool: { backends: BACKENDS },

  state: {
    name: undefined,
    backendId: undefined,
    visualFilter: undefined,
    visualSorting: undefined,
    search: undefined,
    queryParameters: {},
    settings: {},
    collection: undefined,
    error: undefined,
    fetchScheduled: false,
    calls: {},
    nextCall: 1,
    bound: undefined,
    query: undefined,
    recordsBox: true
  } as QueryRecordsState,

  inputs: {},

  outputs: {
    // :391-399
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'Records the query matched, in the order Sort asks for; empty before the first query has run',
      from: (s, w) => (s.collection !== undefined ? w.registry.collection(s.collection) : undefined)
    },
    // :400-411
    firstItemId: {
      type: 'string',
      displayName: 'First Record Id',
      group: 'General',
      description: 'Id of the first matched record, for feeding a Record node without going through a repeater',
      from: (s, w) => (s.collection !== undefined ? w.registry.collection(s.collection).get(0)?.getId() : undefined)
    },
    // :412-423
    isEmpty: {
      type: 'boolean',
      displayName: 'Is Empty',
      group: 'General',
      description: 'True when the query matched nothing, and also true before the first query has run',
      from: (s, w) => (s.collection !== undefined ? w.registry.collection(s.collection).size() === 0 : true)
    },
    // :424-432
    count: {
      type: 'number',
      displayName: 'Count',
      group: 'General',
      description: 'How many records are in Items, which Limit caps — turn on Fetch total count for the uncapped figure',
      from: (s, w) => (s.collection !== undefined ? w.registry.collection(s.collection).size() : 0)
    },
    // :433-438
    fetched: { type: 'signal', displayName: 'Success', group: 'Events', description: 'Fires once the query has returned and Items is up to date' },
    // :439-444
    failure: { type: 'signal', displayName: 'Failure', group: 'Events', description: 'Fires when the query could not be run, after the reason has been reported on the error channel' },
    // :445-453
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last query failed; empty until one does', from: (s) => s.error },
    // :461-551 — the Realtime group: what the getters read while no subscription has ever run (NOT IN SLICE A)
    subscribed: { type: 'boolean', displayName: 'Subscribed', group: 'Realtime', description: 'True while the backend has confirmed the subscription and is delivering changes', from: () => false },
    realtimeStatus: {
      type: 'string',
      displayName: 'Realtime Status',
      group: 'Realtime',
      description: 'connecting, subscribed, interrupted or stopped. Four states rather than a boolean, because "connecting for the first time" and "dropped and retrying" want different things on screen',
      from: () => ''
    },
    realtimeError: { type: 'object', displayName: 'Realtime Error', group: 'Realtime', description: 'The last realtime failure, with a code and whether retrying can help; null until one happens', from: () => null },
    realtimeFailure: { type: 'signal', displayName: 'Realtime Failure', group: 'Realtime', description: 'Fires when a subscription cannot connect, is rejected, or has been given up on' },
    created: { type: 'signal', displayName: 'Record Created', group: 'Realtime', description: 'Another client created a record in this collection' },
    updated: { type: 'signal', displayName: 'Record Updated', group: 'Realtime', description: 'Another client updated a record in this collection' },
    deleted: { type: 'signal', displayName: 'Record Deleted', group: 'Realtime', description: 'Another client deleted a record from this collection' },
    changed: {
      type: 'signal',
      displayName: 'Records Changed',
      group: 'Realtime',
      description: 'Any of the three, and also the backend saying the view may be stale after a reconnect — the one to react to if you do not care which happened'
    },
    changedEvent: { type: 'string', displayName: 'Change Type', group: 'Realtime', description: 'create, update, delete, init or resync', from: () => '' },
    changedRecord: {
      type: 'object',
      displayName: 'Changed Record',
      group: 'Realtime',
      description: 'The record the change was about. ⚠️ Null on a delete against Directus, which sends only the key — use Changed Record Id, which every backend fills',
      from: () => null
    },
    changedRecords: { type: 'array', displayName: 'Changed Records', group: 'Realtime', description: 'Every record in the change frame; some backends batch', from: () => [] },
    changedRecordId: { type: 'string', displayName: 'Changed Record Id', group: 'Realtime', description: "The id of the changed record, always a string — even where the backend's primary key is an integer", from: () => '' }
  }
}).on(
  {},
  {
    derived: {
      // :233-234 — the two boxes registered in `initialize`, whatever the params
      inputs: () => ({ 'runOnChange-records': checkbox('records'), 'runOnChange-querySettings': checkbox('querySettings') }),
      // :1109-1116 — an output a graph wires reads the stored setting of its name; the editor draws `Total Count` (:1348-1354)
      outputs: () => ({
        storageTotalCount: { type: 'number', displayName: 'Total Count', group: 'Total Count', description: 'How many records match, ignoring Limit', from: (s) => s.settings.storageTotalCount } as OutputDecl<QueryRecordsState>
      }),
      discover,
      candidates: ['storageFetch', 'collectionName', 'backendId', 'search', 'visualFilter', 'visualSort', 'qp-min', 'storageEnableLimit', 'storageLimit', 'storageSkip', 'storageEnableCount', 'runOnChange-collectionName', 'runOnChange-search', 'runOnChange-qp-min', 'runOnChange-querySettings', 'runOnChange-records'],
      on: (s, port, v, derived) => {
        const schedule = (go: boolean) => (go && !s.fetchScheduled ? { fetchScheduled: true } : {});
        if (port === 'runOnChange-records') return { set: { recordsBox: v !== false }, send: [] }; // s24 — read by the store listener
        if (port.startsWith('runOnChange-')) return { send: [] }; // the box only records its answer
        if (port === 'collectionName') return { set: { name: v, ...schedule(valueDidChange(s.name, v) && ticked(derived, 'collectionName')) }, send: [] }; // :563-570
        if (port === 'search') return { set: { search: v, ...schedule(valueDidChange(s.search, v) && ticked(derived, 'search')) }, send: [] }; // :1131-1138
        if (port === 'visualFilter') return { set: { visualFilter: v, ...schedule(ticked(derived, 'querySettings')) }, send: [] }; // :1118-1122
        if (port === 'visualSort') return { set: { visualSorting: v, ...schedule(ticked(derived, 'querySettings')) }, send: [] }; // :1123-1127
        if (port === 'backendId') return { set: { backendId: v, ...schedule(valueDidChange(s.backendId, v) && ticked(derived, 'querySettings')) }, send: [] }; // :1177-1184
        if (port.startsWith('qp-')) {
          const name = port.slice('qp-'.length); // :1139-1146
          return { set: { queryParameters: { ...s.queryParameters, [name]: v }, ...schedule(valueDidChange(s.queryParameters[name], v) && ticked(derived, port)) }, send: [] };
        }
        // :1215-1222 userInputSetter
        return { set: { settings: { ...s.settings, [port]: v }, ...schedule(valueDidChange(s.settings[port], v) && ticked(derived, 'querySettings')) }, send: [] };
      },
      // :1161-1168 — Do: one query at the frame end, always
      signal: () => ({ set: { fetchScheduled: true }, send: [] })
    },
    // :820-944 — the frame's one query
    afterInputs: (s, _i, w) => {
      if (!s.fetchScheduled) return { send: [] };
      const failed = (error: string) => ({ set: { fetchScheduled: false, error }, send: ['error' as const], emit: ['failure' as const] });
      const backend = w.backendFor(s.backendId); // :843-849
      if (backend === undefined) return failed(NO_BACKEND_MESSAGE(s.backendId));
      // :850 — the store's listeners move to this backend's store now, before the filter is built
      const c = w.registry.collection(); // :852 — the answer's array, minted (a guid draw) before the filter is built
      // :947-995 — the simple filter (the only one in slice A)
      let neutral: Filter | undefined;
      let where: Readonly<Record<string, unknown>> | undefined;
      if (s.visualFilter !== undefined) {
        try {
          neutral = toNeutral(s.visualFilter, s.queryParameters);
          where = lowerToParse(neutral);
        } catch (e) {
          const f = failed((e as Error).message || 'The filter could not be applied.'); // :982, :853-856
          return { ...f, set: { ...f.set, bound: backend } };
        }
      }
      const sort = s.visualSorting !== undefined ? (s.visualSorting as Array<{ property: string; order?: string }>).map((x) => (x.order === 'descending' ? '-' : '') + x.property) : undefined; // queryutils.ts :440-444
      const useLimit = !!s.settings.storageEnableLimit; // :1092-1102
      const limit = useLimit ? (s.settings.storageLimit as number) || 10 : undefined;
      const skip = useLimit ? (s.settings.storageSkip as number) || 0 : undefined;
      const count = !!s.settings.storageEnableCount; // :1104-1107
      const search = s.search || undefined; // :865
      const id = 'query:' + s.nextCall;
      return {
        // :873-879 — the query MADE is what a later write is matched against, whether or not its answer has landed
        set: { fetchScheduled: false, calls: { ...s.calls, [id]: c.getId() }, nextCall: s.nextCall + 1, bound: backend, query: { where, sort, limit } },
        send: [],
        // :880-889
        backend: { id, op: 'query', backend, args: { collection: s.name, where: neutral, sort, limit, skip, count, search } }
      };
    },
    world: {
      backend: (s, _i, answer, w) => {
        const c = w.registry.collection(s.calls[answer.id]);
        const publish = { collection: c.getId() };
        const all = ['items', 'firstItemId', 'isEmpty', 'count'] as const;
        if (!('ok' in answer)) {
          // :941-942 — the first failure publishes the empty array; a later one keeps what is shown
          const first = s.collection === undefined;
          return { set: { ...(first ? publish : {}), error: answer.error || 'Failed to fetch.' }, send: [...(first ? all : []), 'error'], emit: ['failure'] };
        }
        // :888-904
        const { results, count } = answer.ok as { results?: Array<Record<string, unknown>>; count?: number };
        if (results !== undefined) {
          c.set(
            results.map((item) => {
              // cloudstore.js _fromJSON :407-422 — the Class as it is now
              const m = w.registry.model(item.objectId);
              m._class = s.name;
              for (const key in item) if (key !== 'objectId' && key !== 'ACL') m.set(key, item[key]);
              return m;
            })
          );
        }
        const settings = count !== undefined ? { settings: { ...s.settings, storageTotalCount: count } } : {};
        return { set: { ...publish, ...settings }, send: [...all], sendDerived: count !== undefined ? ['storageTotalCount'] : [], emit: ['fetched'] };
      },
      // s24 — :251-363 `cloudStoreEvents`: a write made elsewhere, heard on the store this node is bound to
      store: (s, _i, e, w) => {
        if (!s.recordsBox) return { send: [] }; // :253
        if (s.bound !== e.backend) return { send: [] }; // :600-616 — a store it never bound tells it nothing
        if (s.collection === undefined) return { send: [] }; // :255
        if (e.collection !== s.name) return { send: [] }; // :256 — the Class as it is NOW, not as queried
        if (s.search) return { set: s.fetchScheduled ? {} : { fetchScheduled: true }, send: [] }; // :266-269 — a search re-queries
        const c = w.registry.collection(s.collection);
        const q = s.query!; // an array is held only once a query was made
        const all = ['items', 'count', 'firstItemId', 'isEmpty'] as const;
        // :271-319 — at its sorted place (before the first member that sorts after it), or at the end with no sort; then Limit
        const add = (m: RecordRef) => {
          const sort = q.sort;
          const hasSort = sort !== undefined && sort.length > 0; // :285-286 — an empty sort is no sort
          if (hasSort) {
            let i = 0;
            for (i = 0; i < c.size(); i++) if (compareObjects(sort, c.get(i)!, m) > 0) break;
            c.addAtIndex(m, i);
          } else c.add(m);
          // :301-311 — over Limit, one is dropped: the LAST under a descending first sort key, otherwise the FIRST
          const size = c.size();
          if (q.limit !== undefined && size > q.limit) {
            const descending = hasSort && sort[0].charAt(0) === '-';
            c.remove(c.get(descending ? size - 1 : 0)!);
          }
          return { send: all };
        };
        if (e.type === 'create') {
          const m = w.registry.model(e.object?.objectId); // :322 — the id the record carries
          return matchesQuery(m, q.where) ? add(m) : { send: [] };
        }
        const m = w.registry.model(e.objectId);
        if (e.type === 'save') {
          // :330-349 — out of the filter: removed; into it: added; a member that still matches keeps its place
          const matches = matchesQuery(m, q.where);
          if (!matches && c.contains(m)) {
            c.remove(m);
            return { send: all };
          }
          return matches && !c.contains(m) ? add(m) : { send: [] };
        }
        // :350-362 — removed if a member; the four re-sent either way
        c.remove(m);
        return { send: all };
      }
    }
  }
);
