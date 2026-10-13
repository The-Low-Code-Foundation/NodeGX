/**
 * Query Records (`DbCollection2`) — read from `packages/noodl-runtime/src/nodes/std-library/data/dbcollectionnode2.ts`
 * on 2026-10-02 (NSP-014 s23), with `api/queryutils.ts` and the backend contract's filter translators
 * (`@noodl/backend-contract/translators`) beside it. SLICE A: the query a node makes and what it does with the answer.
 * SLICE B (s24): watching the store — another node's write on the bound backend patches the rows in place.
 * SLICE C (s35): Subscribe To Changes — the realtime subscription (BCN-008), through world.ts REALTIME.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: a Query Records node has NO declared input — every port is registered on its
 * first write (:1148-1209). Writing the Class, the Search or a filter parameter (`qp-<name>`) re-queries when the
 * value CHANGED and that port's own Run On Value Change box is on; the Backend and every query setting (the visual
 * filter, the sort, Use limit / Limit / Skip, Fetch total count, any other name) share ONE box, `Query settings` —
 * the visual filter and the sort re-query on every write, changed or not (:1119-1128); `Do` (`storageFetch`)
 * re-queries always. However many arrive in a frame, ONE query runs at the frame's end (:821-830).
 *
 * THE QUERY (:832-945): a Backend the project does not have fails at once with the not-configured sentence (no
 * call). Otherwise a fresh anonymous array is made for the answer (a guid draw, `Collection.get()`), then the filter
 * is built (:947-1090): the visual filter becomes the contract's NEUTRAL filter (two saved shapes; a rule whose
 * parameter port has supplied nothing does not narrow the query) and ALSO the Parse `where` the local matcher reads
 * — and that lowering can REFUSE a filter (a `pointsTo` with no class schema), which fails the query with the
 * refusal's message and makes no call. Then the node hands its backend `query({ collection: <Class>, where: <the
 * neutral filter>, sort: <'-'-prefixed names, from the visual sort>, limit, skip, count, search })` (world.ts BACKEND,
 * R9): `limit` / `skip` only under Use limit (`Limit || 10`, `Skip || 0`, :1093-1103), `count` whether Fetch total
 * count is on, `search` the Search text or nothing when it is empty.
 * SUCCESS (:889-905): each row becomes a registry record under its `objectId` (`_fromJSON`, as Record's — the Class
 * as it is when the answer lands), the array holds them in the answer's order; a total count handed back is kept and
 * re-sent on `Total Count`; the array becomes `Items` (Items, First Record Id, Is Empty and Count re-sent) and Success
 * pulses. FAILURE (:906-944): the FIRST failure publishes the empty array (Items `[]`, Is Empty true); a later one
 * keeps the rows already shown (REL-011b). Error is the backend's message or `Failed to fetch.`, then Failure pulses.
 * Error is never cleared. A Do while a query is out is a second query; each answer publishes its own array.
 *
 * THE OUTPUTS: `Items` is the array itself (`undefined` before the first answer), First Record Id the first record's
 * id, Is Empty true until an array is held, Count its size or 0. `Total Count` (and any other output a graph wires,
 * :1110-1117) reads the stored setting of that name. The Realtime outputs read nothing until a subscription runs.
 *
 * NO OUTCOME CONTRACT: `Success` is `fetched` and `Failure` a plain signal — Do has no tokens; this node predates
 * ERG-001 (the Record node's twin has them).
 *
 * WATCHING THE STORE (slice B, s24; :251-363, :600-616). The node listens to ONE store: the legacy store from creation
 * (:372, which no world write reaches), then the store of the backend each query resolved (:851 — before the filter
 * is built, so a refused filter still moves it; the not-configured backend does not). A write ANOTHER node made on
 * that backend (world.ts BACKEND `events`; graph s08 with the real writers) is heard when the `Record changes` box is
 * ticked, an array is held (an answer or the first failure landed), and the write's class is the Class AS IT IS NOW.
 * With a Search term the node re-queries at the next frame end (BAK-008) and patches nothing. Otherwise the record is
 * read from the registry (which already holds the write) and matched against the query MADE last — its Parse `where`,
 * sort and limit (:874-880), even while that query's answer is still out — by the LOCAL matcher (record-match.ts):
 *   - `create`: a match joins — under a sort before the first member that sorts after it, with none at the end; then,
 *     over Limit, the record that sorts LAST is dropped, under any sort; with NO sort, a join that would go over Limit
 *     asks the backend again instead, since only it knows which records the Limit keeps (v4, row C40);
 *   - `save`: a member that no longer matches leaves; a non-member that now matches joins as a create does; a member
 *     that still matches moves to where it now sorts — the four re-sent only when its place changed; with no sort it
 *     stays (v4, row C41);
 *   - `delete`: the member goes.
 * A change re-sends Items, Count, First Record Id and Is Empty; a create or save that changed nothing re-sends nothing,
 * and a delete re-sends the four even when nothing was removed (unchanged values: no trace shows it). The node's own array watcher (:237-249) re-sends three of them
 * at the frame end — the same values, so no trace shows it.
 *
 * SUBSCRIBE TO CHANGES (slice C, s35; :650-806 — Subscribe To Changes' twin, BCN-008). Writing `realtime` (`!!value`,
 * :650-653; unset is off), the Class or the Backend schedules ONE reconnect at the frame's end (:656-663) — v5 (row C55
 * ruled "Ignore repeated values"): only when the value really changed (`valueDidChange`, whatever its box); v4 reconnected
 * at every write, changed or not. The frame end runs its two callbacks — the query and the reconnect — in the
 * order they were FIRST scheduled that frame (`scheduleAfterInputsHaveUpdated`), so a reconnect asked for before the query
 * makes its calls first (`subscribeFirst`). A reconnect (:665-715) first TEARS DOWN (:717-727): the subscription held is
 * disposed, and a status held is cleared — Subscribed and Realtime Status sent. Then, with `realtime` on and a Class, it
 * resolves the Backend: none is the not-configured error with the backend id as written (:685-693 — the Backend id raw in
 * the sentence); otherwise it subscribes `{ collection, primaryKey }` — no filter (the header at :640-648: a transport that
 * cannot filter server-side must not filter client-side) — and then, as Subscribe To Changes does, reads the new
 * subscription's status off the handle (:714, v2 — row D29 fixed): Realtime Status is `connecting` from the subscribe
 * (world.ts REALTIME: `connecting` is never TOLD, so v1 showed it empty until the backend's first status). What the subscription tells lands as Subscribe To Changes' does (:745-806): a STATUS (a `subscribed` clears
 * a held error), a CHANGE (the four Change outputs; `init` pulses nothing, a create / update / delete its signal then
 * Records Changed, anything else Records Changed alone — and then, but for `init`, the query re-runs at the next frame
 * end when the `Record changes` box is ticked, :773-775), an ERROR (Realtime Error, Realtime Failure). The error is not
 * cleared by a teardown.
 *
 * NOT SPECCED, named (each a later slice or a seam not built):
 *   - in the realtime half: the SSR gate (:681-682 — no play is a server render), `realtimeSupportFor` (every play's
 *     backend speaks realtime), the schema's primary key (none has a class schema: `id`), `_onNodeDeleted`'s teardown.
 *   - THE JAVASCRIPT FILTER (`Filter` = Javascript, :997-1090): the author's script, run with `where` / `filter` /
 *     `sort` / `Inputs` / `$vars` — NSP-017's escape hatch. `storageFilterType`, `storageJSONFilter` and
 *     `storageFilterValue-…` are not accepted here.
 *   - the success's schema conversions (as Record's); a relation filter's class read off the record store; the
 *     editor's warnings (no editor in a play); `raiseRuntimeError` on the error bus (not a port).
 */

import type { Filter } from '../../../nodegx-backend-contract/src/translators';
import type { InputDecl, OutputDecl, ValueInputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import type { RecordRef } from '../registry';
import type { BackendScript, RealtimeScriptEvent } from '../world';
import { valueDidChange } from './condition';
import { backendPickerPort, classPicker, NO_BACKEND_MESSAGE, selectedClass } from './record-base';
import { compareObjects, filterParameterNames, lowerToParse, matchesQuery, toNeutral } from './record-match';
import { sameList } from '../world';

type QueryRecordsState = {
  /** `_internal.name` — the Class (:563-570) */
  name: unknown;
  /** `_internal.backendId` (:1180-1187) */
  backendId: unknown;
  /** `_internal.visualFilter` (:1119-1123) */
  visualFilter: unknown;
  /** `_internal.visualSorting` (:1124-1128) */
  visualSorting: unknown;
  /** `_internal.search` (:1132-1139) */
  search: unknown;
  /** `_internal.queryParameters`, by bare name (:1140-1147) */
  queryParameters: Readonly<Record<string, unknown>>;
  /** `_internal.storageSettings` — every other port, by name (:1216-1223); a success's total count lands here too (:900) */
  settings: Readonly<Record<string, unknown>>;
  /** `_internal.collection`, by the array's id (`undefined` until the first answer or first failure) */
  collection: string | undefined;
  /** `_internal.error` (:815) */
  error: string | undefined;
  /** `_internal.fetchScheduled` (:823-829) */
  fetchScheduled: boolean;
  /** every query made, by the spec's call id: the array minted for its answer (:853) */
  calls: Readonly<Record<string, string>>;
  nextCall: number;
  /** s24 — `_internal.boundStore`: the backend whose store the node listens to (:600-616, rebound at a query :851); `undefined`: the legacy store it bound in `initialize` (:372), which no world write reaches */
  bound: string | undefined;
  /** s24 — `_internal.currentQuery` (:874-880): the Parse `where`, sort and limit of the last query MADE — what a write made elsewhere is matched against */
  query: { where: Readonly<Record<string, unknown>> | undefined; sort: readonly string[] | undefined; limit: number | undefined } | undefined;
  /** s24 — the `Record changes` box (`runOnChange-records`, :233), read by the store listener (:253) */
  recordsBox: boolean;
  /** s35 — `_internal.realtime` (:650-653) */
  realtime: boolean;
  /** s35 — `_internal.realtimeReconfigureScheduled` (:656-663) */
  rtScheduled: boolean;
  /** s35 — the reconnect was scheduled before the query this frame: its calls are made first */
  rtFirst: boolean;
  /** s35 — the spec's id of the subscription held (`_internal.subscription`), `undefined` when none */
  sub: string | undefined;
  nextSub: number;
  /** s35 — `_internal.realtimeStatus`, `realtimeError`, `realtimeEvent`, `changedRecord(s)`, `changedRecordId` */
  status: string | undefined;
  rtError: unknown;
  event: unknown;
  record: unknown;
  records: unknown;
  recordId: unknown;
};

/** :1206-1208 → :1216-1223 — any other name is a stored setting, re-querying when it changed under the Query settings box. */
const GENERIC_SETTING = (name: string): InputDecl => ({
  type: '*',
  coerce: 'none',
  displayName: name,
  group: 'Query',
  description: 'Stored by name; a change re-queries under Query settings',
  examples: SETTING_EXAMPLES[name] ?? [true, 'x']
});

/** :1261-1262 — the script a Javascript filter starts with. */
/** The words the Filter dropdown shows (dbcollectionnode2.ts `storageFilterType`). */
const FILTER_TYPE_LABELS = { simple: 'Visual', json: 'Javascript' };

const DEFAULT_JSON_QUERY = '// Write your query script here, check out the reference documentation for examples\n' + 'where({ })\n';

/** A setting as the editor draws it (`updatePorts` :1310-1391): its type, its label, its group. */
const setting = (name: string, type: 'boolean' | 'number', displayName: string, group: string): ValueInputDecl => ({ ...(GENERIC_SETTING(name) as ValueInputDecl), type, displayName, group });

/** :1386-1391 — `Total Count`, in group General. */
const totalCount = (): OutputDecl<QueryRecordsState> => ({ type: 'number', displayName: 'Total Count', group: 'General', description: 'How many records match, ignoring Limit', from: (s) => s.settings.storageTotalCount });

/** The settings the editor draws (updatePorts :1228-1457), with the values a panel holds. */
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

/** :1154-1160 — a filter parameter port; the bare name keys `queryParameters`. */
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

/** :1228-1457 updatePorts — `Do`, `Class`, `Backend`, `Search`, the visual filter and sort, by first write. */
function discover(port: string): InputDecl | undefined {
  if (port === 'storageFetch') return { type: 'signal', displayName: 'Do', group: 'Actions', description: 'Runs the query again now' };
  if (port === 'collectionName') return { type: 'string', coerce: 'none', displayName: 'Class', group: 'General', description: 'The class to query', examples: ['Lesson', 'Lesson', 'Lesson', 'Lesson', 'Lesson', 'Note', '', undefined] };
  if (port === 'backendId') return { type: 'string', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', description: 'Which backend to query', examples: ['_active_', 'main', 'other', 'nope'] };
  if (port === 'search') return { type: 'string', coerce: 'none', displayName: 'Search', group: 'Search', description: 'Full-text search term; empty for none', examples: ['ada', 'ada', '', undefined] };
  if (port === 'visualFilter') return { type: 'object', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', description: 'The visual filter', examples: FILTERS };
  if (port === 'visualSort') return { type: 'array', coerce: 'none', editOnly: true, displayName: 'Sort', group: 'Sorting', description: 'The visual sort', examples: SORTS };
  if (port.startsWith('qp-')) return queryParameter(port.slice('qp-'.length));
  if (port.startsWith('runOnChange-')) return checkbox(port.slice('runOnChange-'.length));
  // :1327-1337 — s35, slice C
  if (port === 'realtime')
    return {
      type: 'boolean',
      default: false,
      coerce: 'none',
      displayName: 'Subscribe To Changes',
      group: 'Realtime',
      description: 'Keep Items current from the server: re-runs this query when another client creates, updates or deletes a record, and fires the Record Created/Updated/Deleted signals. Not every backend can — see Realtime Error.',
      examples: [true, true, true, false, 1, '', undefined]
    };
  // NOT IN THIS SPEC (header): the Javascript filter
  if (port === 'storageFilterType' || port === 'storageJSONFilter' || port.startsWith('storageFilterValue-')) return undefined;
  return GENERIC_SETTING(port); // :1206-1208 userInputSetter
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

/**
 * s35 — what a subscription tells (world.ts REALTIME), one entry at every doubling of the clock from 1 ms, so an advance after
 * any subscribe reaches some (Subscribe To Changes' cycle, s33): confirmations, the three changes and a batch, a key-only
 * delete, `init`, `resync`, an interruption and an error — each change but `init` re-runs the query under its box.
 */
const TOLD_CYCLE: ReadonlyArray<Omit<RealtimeScriptEvent, 'at'>> = [
  { status: 'subscribed' },
  { change: { type: 'create', ids: ['r4'], records: [{ id: 'r4', title: 'a' }] } },
  { change: { type: 'init', ids: ['r1'], records: [{ id: 'r1' }] } },
  { change: { type: 'update', ids: ['r1'], records: [{ id: 'r1', title: 'b' }] } },
  { change: { type: 'delete', ids: ['r2'], records: [], recordsComplete: false } },
  { status: 'interrupted' },
  { error: { message: 'The realtime connection went down before it was confirmed (errored).', code: 'CONNECT_FAILED' } },
  { status: 'subscribed' },
  { change: { type: 'resync' } },
  { change: { type: 'create', ids: ['r5', 'r6'], records: [{ id: 'r5' }, { id: 'r6' }] } }
];
const told = (offset: number): RealtimeScriptEvent[] => Array.from({ length: 16 }, (_, k) => ({ at: 2 ** k, ...TOLD_CYCLE[(k + offset) % TOLD_CYCLE.length] }) as RealtimeScriptEvent);
/** The subscribe rule each pool world puts FIRST — a match-less query rule answering a subscribe is a script error (world.ts REALTIME). */
const SUBSCRIBES: ReadonlyArray<NonNullable<BackendScript['answers']>[number]> = [
  { match: { op: 'subscribe' }, answer: { stream: told(0) } },
  { match: { op: 'subscribe' }, answer: { stream: told(3) } },
  { match: { op: 'subscribe' }, answer: { stream: [{ at: 1, error: { message: 'Not authorised', code: 'AUTH_FAILED' } }] } },
  { match: { op: 'subscribe' }, answer: { stream: [{ at: 1, status: 'subscribed' }, { at: 1000, error: { message: 'No heartbeat', code: 'HEARTBEAT_MISSED', kind: 'fatal' } }] } },
  { match: { op: 'subscribe' }, answer: { never: true } }
];

/** The backends a sequence plays with: rows at once (weighted), rows with a total count, an empty answer, late, refused with and without a message, silent, two backends — and (s24) the same worlds with writes made elsewhere; (s35) each with a subscription first. */
const QUERY_BACKENDS: ReadonlyArray<BackendScript> = [
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
const BACKENDS: ReadonlyArray<BackendScript> = QUERY_BACKENDS.map((b, i) => ({ ...b, answers: [SUBSCRIBES[i % SUBSCRIBES.length], ...(b.answers ?? [])] }));

type QueryPatch = { set?: Partial<QueryRecordsState>; send?: string[]; emit?: string[]; backend?: unknown };

/** :832-945 — the query, when one is due (the frame end's first callback, or its second — afterInputs). */
function query(s: QueryRecordsState, w: WorldView): QueryPatch {
  if (!s.fetchScheduled) return { send: [] };
  const failed = (error: string) => ({ set: { fetchScheduled: false, error }, send: ['error' as const], emit: ['failure' as const] });
  const backend = w.backendFor(s.backendId); // :844-850
  if (backend === undefined) return failed(NO_BACKEND_MESSAGE(s.backendId));
  // :851 — the store's listeners move to this backend's store now, before the filter is built
  const c = w.registry.collection(); // :853 — the answer's array, minted (a guid draw) before the filter is built
  // :948-996 — the simple filter (the only one in slice A)
  let neutral: Filter | undefined;
  let where: Readonly<Record<string, unknown>> | undefined;
  if (s.visualFilter !== undefined) {
    try {
      neutral = toNeutral(s.visualFilter, s.queryParameters, 'qp-');
      where = lowerToParse(neutral);
    } catch (e) {
      const f = failed((e as Error).message || 'The filter could not be applied.'); // :983, :854-857
      return { ...f, set: { ...f.set, bound: backend } };
    }
  }
  const sort = s.visualSorting !== undefined ? (s.visualSorting as Array<{ property: string; order?: string }>).map((x) => (x.order === 'descending' ? '-' : '') + x.property) : undefined; // queryutils.ts :440-444
  const useLimit = !!s.settings.storageEnableLimit; // :1093-1103
  const limit = useLimit ? (s.settings.storageLimit as number) || 10 : undefined;
  const skip = useLimit ? (s.settings.storageSkip as number) || 0 : undefined;
  const count = !!s.settings.storageEnableCount; // :1105-1108
  const search = s.search || undefined; // :866
  const id = 'query:' + s.nextCall;
  return {
    // :874-880 — the query MADE is what a later write is matched against, whether or not its answer has landed
    set: { fetchScheduled: false, calls: { ...s.calls, [id]: c.getId() }, nextCall: s.nextCall + 1, bound: backend, query: { where, sort, limit } },
    send: [],
    // :881-890
    backend: { id, op: 'query', backend, args: { collection: s.name, where: neutral, sort, limit, skip, count, search } }
  };
}

const STATUS_SENDS = ['subscribed', 'realtimeStatus'];
const CHANGE_SENDS = ['changedEvent', 'changedRecord', 'changedRecords', 'changedRecordId'];

/** :665-727 — the reconnect, when one is due: the teardown, then the subscription (slice C). */
function reconnect(s: QueryRecordsState, w: WorldView): { set: Partial<QueryRecordsState>; send?: string[]; emit?: string[]; unsubscribe?: string[]; subscribe?: { id: string; op: string; backend: string; args: Record<string, unknown> } } {
  if (!s.rtScheduled) return { set: {} };
  // :717-727 — the teardown: the subscription disposed; a status held cleared and sent
  const set: Partial<QueryRecordsState> = { rtScheduled: false, rtFirst: false };
  const send: string[] = [];
  const unsubscribe = s.sub !== undefined ? [s.sub] : undefined;
  if (s.sub !== undefined) set.sub = undefined;
  if (s.status) {
    set.status = undefined;
    send.push(...STATUS_SENDS);
  }
  const torn = { set, send, ...(unsubscribe ? { unsubscribe } : {}) };
  if (!s.realtime) return torn; // :668
  if (!s.name) return torn; // :669-670
  const backend = w.backendFor(s.backendId); // :684
  if (backend === undefined) {
    // :685-693 → :798-803 — the Backend id as written, raw
    const rtError = { message: `The backend this node is set to ("${String(s.backendId)}") is not configured in this project.`, code: 'CAPABILITY_UNAVAILABLE', kind: 'fatal' };
    return { ...torn, set: { ...set, rtError }, send: [...send, 'realtimeError'], emit: ['realtimeFailure'] };
  }
  // :707-713 — no filter; the primary key the wire's convention (header); then :714 (v2, D29) — the new subscription's
  // status, read off the handle: `connecting`, Subscribed and Realtime Status sent
  const id = 'sub:' + s.nextSub;
  return { ...torn, set: { ...set, sub: id, nextSub: s.nextSub + 1, status: 'connecting' }, send: [...new Set([...send, ...STATUS_SENDS])], subscribe: { id, op: 'subscribe', backend, args: { collection: s.name, primaryKey: 'id' } } };
}

export const QueryRecords = defineNode({
  type: 'DbCollection2',
  // v2 (s36, row D29 ruled "Yes, say connecting" by Richard 2026-10-03): a subscription made shows Realtime Status
  // `connecting` at once, read off the handle (:714) as Subscribe To Changes does; v1 showed it empty until the backend's
  // first status. Every cite past :713 moved by one line with the fix.
  // v3 (P109 ISL-027, row C49 ruled "Compare the list's contents"): an answer's list with the same contents as the one the record
  // holds is not written again (cloudstore.js `_fromJSON`), so it is no change; v2 wrote the new array and the record store's `!==`
  // called it changed.
  // v4 (P109 ISL-029, rows C40 "Drop the last; re-query if unsorted" and C41 "Move it to its new place"): over Limit the record
  // that sorts last is dropped under any sort, and with no sort the query runs again; a saved member that still matches moves
  // to where it now sorts. v3 dropped the FIRST unless the first sort key was descending, and left a saved member in place.
  // v5 (P109 ISL-030, row C55 ruled "Ignore repeated values"): Subscribe To Changes, the Class and the Backend reconnect the
  // subscription only when they really change; v4 reconnected at every write.
  version: 5,
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
    recordsBox: true,
    realtime: false,
    rtScheduled: false,
    rtFirst: false,
    sub: undefined,
    nextSub: 1,
    status: undefined,
    rtError: undefined,
    event: undefined,
    record: undefined,
    records: undefined,
    recordId: undefined
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
    // :461-551 — the Realtime group (slice C): each getter reads its field, with a fallback
    subscribed: { type: 'boolean', displayName: 'Subscribed', group: 'Realtime', description: 'True while the backend has confirmed the subscription and is delivering changes', from: (s) => s.status === 'subscribed' },
    realtimeStatus: {
      type: 'string',
      displayName: 'Realtime Status',
      group: 'Realtime',
      description: 'connecting, subscribed, interrupted or stopped. Four states rather than a boolean, because "connecting for the first time" and "dropped and retrying" want different things on screen',
      from: (s) => s.status || ''
    },
    realtimeError: { type: 'object', displayName: 'Realtime Error', group: 'Realtime', description: 'The last realtime failure, with a code and whether retrying can help; null until one happens', from: (s) => s.rtError || null },
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
    changedEvent: { type: 'string', displayName: 'Change Type', group: 'Realtime', description: 'create, update, delete, init or resync', from: (s) => s.event || '' },
    changedRecord: {
      type: 'object',
      displayName: 'Changed Record',
      group: 'Realtime',
      description: 'The record the change was about. ⚠️ Null on a delete against Directus, which sends only the key — use Changed Record Id, which every backend fills',
      from: (s) => s.record || null
    },
    changedRecords: { type: 'array', displayName: 'Changed Records', group: 'Realtime', description: 'Every record in the change frame; some backends batch', from: (s) => s.records || [] },
    changedRecordId: { type: 'string', displayName: 'Changed Record Id', group: 'Realtime', description: "The id of the changed record, always a string — even where the backend's primary key is an integer", from: (s) => s.recordId || '' }
  }
}).on(
  {},
  {
    derived: {
      // NSP-020 s84 — what the editor draws (`updatePorts` :1264-1489), in its order: the Backend picker and the Class from the
      // project; the Filter type (the Javascript one is not this spec's, so never driven); Search; the Limit group; Do; the four
      // Run On Value Change boxes the node registers whatever the params (:233-234 registers two at `initialize`); Subscribe To
      // Changes; Fetch total count; then — Visual, a Class set — the Filter and Sort builders when the schema has the Class, and
      // one `qp-` port and its box per parameter the saved filter names. At play there is no schema; the rest is the params'
      inputs: (params, context) => {
        const out: Record<string, InputDecl> = {
          ...backendPickerPort(context),
          collectionName: classPicker(discover('collectionName') as ValueInputDecl, context),
          storageFilterType: { type: 'enum', enums: ['simple', 'json'], labels: FILTER_TYPE_LABELS, drawnDefault: 'simple', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'General', undriven: 'the Javascript filter is not in this spec (header)' },
          search: discover('search')!,
          storageEnableLimit: setting('storageEnableLimit', 'boolean', 'Use limit', 'Limit')
        };
        if (params.storageEnableLimit) {
          out.storageLimit = { ...setting('storageLimit', 'number', 'Limit', 'Limit'), drawnDefault: 10 };
          out.storageSkip = { ...setting('storageSkip', 'number', 'Skip', 'Limit'), drawnDefault: 0 };
        }
        out.storageFetch = discover('storageFetch')!;
        // the boxes are drawn edit-only (run-on-value-change.ts `allowEditOnly`): a box takes no wire
        for (const [governed, label] of [['collectionName', 'Class'], ['search', 'Search'], ['records', 'Record changes'], ['querySettings', 'Query settings']]) out['runOnChange-' + governed] = { ...(checkbox(label) as ValueInputDecl), editOnly: true };
        out.realtime = discover('realtime')!;
        out.storageEnableCount = setting('storageEnableCount', 'boolean', 'Fetch total count', 'Total Count');
        // :1452-1458 — the Javascript filter's script, drawn and never driven; its `storageFilterValue-` ports (:1460-1486, read
        // from the script's `$name`s and `Inputs.name`s) are not drawn here: the Javascript filter is not in this spec (header)
        if (params.storageFilterType === 'json') out.storageJSONFilter = { type: 'string', coerce: 'none', editOnly: true, codeEditor: 'javascript', displayName: 'Filter', group: 'Filter', drawnDefault: DEFAULT_JSON_QUERY, undriven: 'the Javascript filter is not in this spec (header)' };
        if ((params.storageFilterType === undefined || params.storageFilterType === 'simple') && params.collectionName !== undefined) {
          if (selectedClass(params, context)) {
            out.visualFilter = { ...(discover('visualFilter') as ValueInputDecl), type: 'query-filter', valuePortPrefix: 'qp-', filterBackend: true };
            out.visualSort = { ...(discover('visualSort') as ValueInputDecl), type: 'query-sorting' };
          }
          if (params.visualFilter !== undefined) {
            for (const name of filterParameterNames(params.visualFilter, 'qp-')) {
              out['qp-' + name] = queryParameter(name);
              out['runOnChange-qp-' + name] = { ...(checkbox(name) as ValueInputDecl), editOnly: true };
            }
          }
        }
        return out;
      },
      // :1381-1391 — the editor draws Total Count once Fetch total count is ticked; at play it exists only when wired
      // (`registerOutputIfNeeded` :1146-1153, the send gated on `hasOutput` :929)
      outputs: (params): Record<string, OutputDecl<QueryRecordsState>> => (params.storageEnableCount ? { storageTotalCount: { ...totalCount(), onWire: true } as OutputDecl<QueryRecordsState> } : {}),
      needs: ['schema', 'backends'],
      // :1146-1153 — a wire out of any name reads the stored setting of that name (`userOutputGetter`)
      discoverOutput: (port) => (port === 'storageTotalCount' ? totalCount() : ({ type: '*', displayName: port, group: 'General', from: (s) => s.settings[port] } as OutputDecl<QueryRecordsState>)),
      outputCandidates: ['storageTotalCount'],
      discover,
      candidates: ['storageFetch', 'collectionName', 'backendId', 'search', 'visualFilter', 'visualSort', 'qp-min', 'storageEnableLimit', 'storageLimit', 'storageSkip', 'storageEnableCount', 'runOnChange-collectionName', 'runOnChange-search', 'runOnChange-qp-min', 'runOnChange-querySettings', 'runOnChange-records', 'realtime'],
      on: (s, port, v, derived) => {
        const schedule = (go: boolean) => (go && !s.fetchScheduled ? { fetchScheduled: true } : {});
        // s35 — :656-663 the frame's one reconnect; first asked for before any query this frame ⇒ its calls come first
        const reconnect = (fetching: boolean) => (s.rtScheduled ? {} : { rtScheduled: true, rtFirst: !fetching });
        if (port === 'runOnChange-records') return { set: { recordsBox: v !== false }, send: [] }; // s24 — read by the store listener
        if (port.startsWith('runOnChange-')) return { send: [] }; // the box only records its answer
        // :650-653 — v5 (row C55 ruled "Ignore repeated values"): the reconnect only when it changed (unset is off)
        if (port === 'realtime') return valueDidChange(s.realtime, !!v) ? { set: { realtime: !!v, ...reconnect(s.fetchScheduled) }, send: [] } : { send: [] };
        if (port === 'collectionName') {
          // :563-571 — the query only when the Class changed under its box; v5 (C55): the reconnect only when it changed
          const changed = valueDidChange(s.name, v);
          const fetch = schedule(changed && ticked(derived, 'collectionName'));
          return { set: { name: v, ...fetch, ...(changed ? reconnect(s.fetchScheduled || 'fetchScheduled' in fetch) : {}) }, send: [] };
        }
        if (port === 'search') return { set: { search: v, ...schedule(valueDidChange(s.search, v) && ticked(derived, 'search')) }, send: [] }; // :1132-1139
        if (port === 'visualFilter') return { set: { visualFilter: v, ...schedule(ticked(derived, 'querySettings')) }, send: [] }; // :1119-1123
        if (port === 'visualSort') return { set: { visualSorting: v, ...schedule(ticked(derived, 'querySettings')) }, send: [] }; // :1124-1128
        if (port === 'backendId') {
          // :1178-1188 — likewise: the query when it changed under Query settings; v5 (C55): the reconnect only when it changed
          const changed = valueDidChange(s.backendId, v);
          const fetch = schedule(changed && ticked(derived, 'querySettings'));
          return { set: { backendId: v, ...fetch, ...(changed ? reconnect(s.fetchScheduled || 'fetchScheduled' in fetch) : {}) }, send: [] };
        }
        if (port.startsWith('qp-')) {
          const name = port.slice('qp-'.length); // :1140-1147
          return { set: { queryParameters: { ...s.queryParameters, [name]: v }, ...schedule(valueDidChange(s.queryParameters[name], v) && ticked(derived, port)) }, send: [] };
        }
        // :1216-1223 userInputSetter
        return { set: { settings: { ...s.settings, [port]: v }, ...schedule(valueDidChange(s.settings[port], v) && ticked(derived, 'querySettings')) }, send: [] };
      },
      // :1162-1169 — Do: one query at the frame end, always
      signal: () => ({ set: { fetchScheduled: true }, send: [] })
    },
    // :821-830 + :656-663 — the frame's end: the query and the reconnect, each in the order first scheduled (slice C)
    afterInputs: (s, _i, w) => {
      if (!s.fetchScheduled && !s.rtScheduled) return { send: [] };
      const q = query(s, w);
      const r = reconnect(s, w);
      const [first, second] = s.rtFirst ? [r, q] : [q, r];
      return {
        set: { ...q.set, ...r.set },
        send: [...new Set([...(first.send ?? []), ...(second.send ?? [])])],
        ...(first.emit || second.emit ? { emit: [...(first.emit ?? []), ...(second.emit ?? [])] } : {}),
        ...('backend' in q && q.backend ? { backend: q.backend } : {}),
        ...(r.unsubscribe ? { unsubscribe: r.unsubscribe } : {}),
        ...(r.subscribe ? { subscribe: r.subscribe } : {}),
        // only when there is a query to come after: the order is between the two callbacks' calls
        ...(s.rtFirst && (r.unsubscribe || r.subscribe) && 'backend' in q && q.backend ? { subscribeFirst: true } : {})
      } as never;
    },
    world: {
      backend: (s, _i, answer, w) => {
        const c = w.registry.collection(s.calls[answer.id]);
        const publish = { collection: c.getId() };
        const all = ['items', 'firstItemId', 'isEmpty', 'count'] as const;
        if (!('ok' in answer)) {
          // :942-943 — the first failure publishes the empty array; a later one keeps what is shown
          const first = s.collection === undefined;
          return { set: { ...(first ? publish : {}), error: answer.error || 'Failed to fetch.' }, send: [...(first ? all : []), 'error'], emit: ['failure'] };
        }
        // :889-905
        const { results, count } = answer.ok as { results?: Array<Record<string, unknown>>; count?: number };
        if (results !== undefined) {
          c.set(
            results.map((item) => {
              // cloudstore.js _fromJSON :407-422 — the Class as it is now
              const m = w.registry.model(item.objectId);
              m._class = s.name;
              for (const key in item) {
                if (key === 'objectId' || key === 'ACL') continue;
                if (Array.isArray(item[key]) && sameList(m.get(key), item[key] as unknown[])) continue; // v3, C49
                m.set(key, item[key]);
              }
              return m;
            })
          );
        }
        const settings = count !== undefined ? { settings: { ...s.settings, storageTotalCount: count } } : {};
        // :929 — Total Count is flagged only when a wire registered it (s84: the interpreter would mint it on the send)
        return { set: { ...publish, ...settings }, send: [...all], sendDerived: count !== undefined && w.hasOutput('storageTotalCount') ? ['storageTotalCount'] : [], emit: ['fetched'] };
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
        const sort = q.sort;
        const hasSort = sort !== undefined && sort.length > 0; // :285-286 — an empty sort is no sort
        // :271-319 — at its sorted place (before the first member that sorts after it), or at the end with no sort; then Limit
        const add = (m: RecordRef) => {
          // v4 (C40): with no sort only the backend knows which records a Limit keeps — one that would go over it asks again
          if (!hasSort && q.limit !== undefined && c.size() + 1 > q.limit) return { set: s.fetchScheduled ? {} : { fetchScheduled: true }, send: [] };
          if (hasSort) {
            let i = 0;
            for (i = 0; i < c.size(); i++) if (compareObjects(sort, c.get(i)!, m) > 0) break;
            c.addAtIndex(m, i);
          } else c.add(m);
          // :301-311 — over Limit, the record that sorts LAST is dropped, under any sort (v4, C40: v3 dropped the FIRST
          // unless the first sort key was descending)
          const size = c.size();
          if (q.limit !== undefined && size > q.limit) c.remove(c.get(size - 1)!);
          return { send: all };
        };
        if (e.type === 'create') {
          const m = w.registry.model(e.object?.objectId); // :322 — the id the record carries
          return matchesQuery(m, q.where) ? add(m) : { send: [] };
        }
        const m = w.registry.model(e.objectId);
        if (e.type === 'save') {
          // :330-349 — out of the filter: removed; into it: added; a member that still matches moves to where it now sorts
          // (v4, C41: v3 left it in its old place), the four re-sent only when its place changed; with no sort it stays
          const matches = matchesQuery(m, q.where);
          if (!matches && c.contains(m)) {
            c.remove(m);
            return { send: all };
          }
          if (matches && !c.contains(m)) return add(m);
          if (!matches || !hasSort) return { send: [] };
          let from = -1;
          for (let k = 0; k < c.size(); k++) if (c.get(k) === m) from = k;
          c.remove(m);
          let i = 0;
          for (i = 0; i < c.size(); i++) if (compareObjects(sort, c.get(i)!, m) > 0) break;
          c.addAtIndex(m, i);
          return i !== from ? { send: all } : { send: [] };
        }
        // :350-362 — removed if a member; the four re-sent either way
        c.remove(m);
        return { send: all };
      },
      // s35 — :745-806: what the subscription tells (world.ts REALTIME), as Subscribe To Changes hears it
      realtime: (s, _i, e) => {
        if ('status' in e) {
          // :778-786
          if (e.status === 'subscribed' && s.rtError) return { set: { status: e.status, rtError: null }, send: ['realtimeError', ...STATUS_SENDS] as never[] };
          return { set: { status: e.status }, send: [...STATUS_SENDS] as never[] };
        }
        if ('error' in e) return { set: { rtError: e.error }, send: ['realtimeError'] as never[], emit: ['realtimeFailure'] }; // :798-803
        // :745-776
        const c = e.change;
        const set: Partial<QueryRecordsState> = {
          event: c.type,
          record: c.recordsComplete && c.records.length > 0 ? c.records[0] : null,
          records: c.recordsComplete ? c.records : [],
          recordId: c.ids.length > 0 ? c.ids[0] : ''
        };
        if (c.type === 'init') return { set, send: [...CHANGE_SENDS] as never[] }; // :761
        const signal = ({ create: 'created', update: 'updated', delete: 'deleted' } as const)[c.type as 'create' | 'update' | 'delete'];
        // :773-775 — and the query again at the next frame end, under the Record changes box
        if (s.recordsBox && !s.fetchScheduled) set.fetchScheduled = true;
        return { set, send: [...CHANGE_SENDS] as never[], emit: signal ? [signal, 'changed'] : ['changed'] };
      }
    }
  }
);
