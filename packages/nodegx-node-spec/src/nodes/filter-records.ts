/**
 * Filter Records (`FilterDBModels`) — read from `packages/noodl-runtime/src/nodes/std-library/data/filterdbmodelsnode.ts`
 * on 2026-10-02 (NSP-014 s25), with `api/queryutils.ts`, `run-on-value-change.ts` and `api/cloudstore.js` beside it.
 * Array Filter's twin (array-filter.ts) over RECORDS: the same six trigger paths, the same run, the same failure rule;
 * the filter and the sort are Query Records' visual ones, matched locally (record-match.ts).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node REBUILDS its output from the array on Items at the frame end — a NEW
 * anonymous array every run (`Collection.create`, :503; a guid draw), so `Items` is REPLACED, and nothing is ever
 * requested of a backend ("one subscription, no requests", :42). A run is scheduled, once per frame (:429-430), by: the
 * `Filter` pulse (an invocation, a token per press, :394-401); `Items` arriving (:203-206), `Enabled` CHANGING
 * (:214-219, DEF-046), the visual filter or sort ARRIVING (changed or not, :516-525), a filter parameter (`fp-<name>`,
 * its own box) or any other setting CHANGING (:526-534, :581-587); the bound array's own `change` (:147-151); and a
 * SAVE heard on the store the node is bound to (:153-166) — each behind its `Run On Value Change` box.
 *
 * THE RUN (:432-511): with nothing on Items it is SILENT unless a press asked, and then fails every press with
 * `filter-records/no-items` (:440-452). Otherwise it copies the array's items, and when `Enabled` is truthy: the visual
 * filter, lowered to Parse (two saved shapes; a rule whose parameter port has supplied nothing does not narrow), keeps
 * the records that match (`matchesQuery`, record-match.ts) — a filter the lowering refuses, or a row the matcher cannot
 * read (a plain object: `model.get is not a function`), FAILS with `filter-records/filter-failed` and the thrown message
 * (:457-482); then the visual sort (`compareObjects`), `Skip` and `Limit` (Use limit: `Limit || 10`, `Skip || 0`,
 * :369-380, :484-497). Then `Items`, `First Record Id` and `Count` are sent, `Filtered` pulses (every run), and every
 * press reports `done` (:500-510). A failure writes `Error`; the same message is RAISED once until a run succeeds
 * (:402-427) — a press owes its outcome regardless, and a value-path failure with no press pulses `Failure` as a plain
 * signal, once per distinct message.
 *
 * THE SORT THAT CANNOT COMPARE (row, NSP-014 §6.14): the runtime sorts OUTSIDE the filter's `try` (:491), so a Sorting
 * over two or more rows that are not records (`a.get is not a function`) throws out of the scheduled run — the press's
 * token already drained (:436-437), no outcome ever. Stated here as the filter's failure, which is what the sentence on
 * `Failure` promises ("when the filter could not be applied"); the runtime's reading is the known row.
 *
 * WATCHING THE STORE (:153-166, :321-329, :547-553). The node listens for `save` — not `create`, not `delete` — on ONE
 * store: the LEGACY store from creation (:172, which no world write reaches: world.ts BACKEND), moved by a write to
 * `Backend` to that backend's store (`CloudStore.forBackend(…) || CloudStore.instance`: a backend the project does not
 * have puts it back on the legacy store). Row C42: the editor hides the Backend picker when the project has ONE backend
 * (`hideWhenSingleBackend`), so that port is never written there and the node never hears a save. A save on the bound
 * store re-runs the node when the `Record changes` box is ticked, a visual filter is held, an array is held, the save's
 * class is the Class, and the array holds that record (`contains(Model.get(id))`, the GLOBAL registry).
 *
 * NOT SPECCED, named: a `relatedTo` filter's class read off the record store (`resolveRelatedClasses`, queryutils.ts
 * :177-195 — no example filter has one); the editor's ports (`updatePorts`, :617-805: no editor in a play);
 * `raiseRuntimeError` on the error bus (not a port); `_onNodeDeleted`.
 */

import type { ChangeEvent, InputDecl, ValueInputDecl } from '../spec';
import { defineNode } from '../spec';
import type { RecordRef, RegistryScript } from '../registry';
import type { BackendScript } from '../world';
import { valueDidChange } from './condition';
import { errorOutput, runOnChange } from './data-base';
import { compareObjects, lowerToParse, matchesQuery, toNeutral } from './record-match';

type FilterRecordsState = {
  /** `_internal.collection` — a registry array, a plain array, or whatever else arrived (:316-320) */
  source: unknown;
  /** `_internal.filteredCollection`, by name */
  filteredId: string | undefined;
  /** `_internal.enabled` — `true` from `initialize` (:174) */
  enabled: unknown;
  /** `_internal.collectionName` (:513-515) */
  collectionName: unknown;
  /** `_internal.visualFilter` / `visualSorting` (:516-525) */
  visualFilter: unknown;
  visualSorting: unknown;
  /** `_internal.filterParameters`, by bare name (:526-534) */
  filterParameters: Readonly<Record<string, unknown>>;
  /** `_internal.filterSettings` — every other port, by name (:581-587) */
  settings: Readonly<Record<string, unknown>>;
  lastError: string | undefined;
  lastReported: string | undefined;
  /** `pendingFilterOutcomes` — one per `Filter` press (:394-401) */
  tokens: number;
  /** `collectionChangedScheduled` (:429-433) */
  scheduled: boolean;
  /** `_internal.boundStore`: the backend whose store the node listens to; `undefined` the legacy store (:172, :547-553) */
  bound: string | undefined;
  /** the `Filter settings` box, mirrored for the derived reducer */
  settingsBox: boolean;
};

/** A registry array's items, or a plain array itself (collection.ts :436-447 — the `items` getter on every array). */
const itemsOf = (source: unknown, isCollection: (v: unknown) => boolean): unknown[] =>
  ([] as unknown[]).concat(isCollection(source) ? (source as { items: unknown[] }).items : (source as unknown[]));

/** Visual filters a panel holds: the builder's saved shape (static, connected, a refused `pointsTo`, empty) and the retired QueryEditor shape. */
const FILTERS: readonly unknown[] = [
  { type: 'and', conditions: [{ field: 'title', operator: 'equalTo', valueSource: 'static', value: 'a' }] },
  { type: 'and', conditions: [{ field: 'title', operator: 'equalTo', valueSource: 'static', value: 'a' }] },
  { type: 'and', conditions: [{ field: 'n', operator: 'greaterThan', valueSource: 'connected', valuePortName: 'fp-min' }] },
  { type: 'or', conditions: [{ field: 'title', operator: 'equalTo', valueSource: 'static', value: 'a' }, { field: 'n', operator: 'lessThan', valueSource: 'connected', valuePortName: 'fp-min' }] },
  { type: 'and', conditions: [{ field: 'owner', operator: 'pointsTo', valueSource: 'static', value: 'u1' }] },
  { type: 'and', conditions: [] },
  { combinator: 'and', rules: [{ property: 'title', operator: 'equal to', input: 'min' }] }
];

const SORTS: readonly unknown[] = [[{ property: 'n', order: 'ascending' }], [{ property: 'n', order: 'descending' }, { property: 'title', order: 'ascending' }], []];

/** run-on-value-change.ts — a checkbox: absent or anything but `false` is ticked. */
const checkbox = (displayName: string): InputDecl => ({ ...runOnChange(displayName) });

const ticked = (derived: Readonly<Record<string, unknown>>, governed: string) => derived['runOnChange-' + governed] !== false;

/** :535-577 registerInputIfNeeded — every port but the three declared ones is registered on its first write. */
function discover(port: string): InputDecl | undefined {
  if (port === 'collectionName') return { type: 'string', coerce: 'none', displayName: 'Class', group: 'General', description: 'The class whose saves re-run the filter', examples: ['Lesson', 'Lesson', 'Lesson', 'Note', undefined] };
  if (port === 'backendId') return { type: 'string', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', description: 'Which backend’s saves to listen to', examples: ['_active_', '_active_', 'main', 'other', 'nope'] };
  if (port === 'visualFilter') return { type: 'object', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', description: 'The visual filter', examples: FILTERS };
  if (port === 'visualSorting') return { type: 'array', coerce: 'none', editOnly: true, displayName: 'Sorting', group: 'Sorting', description: 'The visual sort', examples: SORTS };
  if (port.startsWith('fp-')) return { type: '*', coerce: 'none', displayName: port.slice('fp-'.length), group: 'Filter Parameters', description: 'The value the filter reads for ' + port.slice('fp-'.length), examples: [1, 2, 'a', undefined] };
  if (port.startsWith('runOnChange-')) return checkbox(port.slice('runOnChange-'.length));
  return setting(port); // :574-576 userInputSetter
}

/** :632-658 — the Limit group the editor draws; any other name is stored all the same. */
function setting(name: string): ValueInputDecl {
  if (name === 'filterEnableLimit') return { type: 'boolean', coerce: 'none', displayName: 'Use limit', group: 'Limit', examples: [true, true, false] };
  if (name === 'filterLimit') return { type: 'number', coerce: 'none', displayName: 'Limit', group: 'Limit', examples: [1, 2, 0, '1'] };
  if (name === 'filterSkip') return { type: 'number', coerce: 'none', displayName: 'Skip', group: 'Limit', examples: [1, 0, '1'] };
  return { type: '*', coerce: 'none', displayName: name, group: 'Filter', examples: [true, 'x'] };
}

/** The records a sequence starts with: a class's three rows in the array `rows`, one row, none. */
const LESSONS = { r1: { title: 'a', n: 1 }, r2: { title: 'b', n: 2 }, r3: { title: 'a', n: 3 } };
const REGISTRIES: readonly RegistryScript[] = [
  { models: LESSONS, collections: { rows: ['r1', 'r2', 'r3'] }, classes: { r1: 'Lesson', r2: 'Lesson', r3: 'Lesson' } },
  { models: LESSONS, collections: { rows: ['r1', 'r2', 'r3'] }, classes: { r1: 'Lesson', r2: 'Lesson', r3: 'Lesson' } },
  { models: { r1: LESSONS.r1 }, collections: { rows: ['r1'] }, classes: { r1: 'Lesson' } },
  {}
];

/**
 * Writes made elsewhere (world.ts BACKEND `events`): one at every doubling of the clock from 2 ms to 65 s, as Query
 * Records' — a member saved out of the filter and back, a non-matching member saved into it, a member re-sorted, a
 * create and a delete (neither heard), a save of another class, a save of a record the array does not hold.
 */
const WRITE_CYCLE: ReadonlyArray<Omit<NonNullable<BackendScript['events']>[number], 'at'>> = [
  { type: 'save', collection: 'Lesson', objectId: 'r1', data: { title: 'z' } },
  { type: 'save', collection: 'Lesson', objectId: 'r2', data: { title: 'a' } },
  { type: 'create', collection: 'Lesson', objectId: 'r4', data: { title: 'a', n: 0 } },
  { type: 'save', collection: 'Lesson', objectId: 'r3', data: { n: 0 } },
  { type: 'save', collection: 'Note', objectId: 'r5', data: { title: 'a' } },
  { type: 'delete', collection: 'Lesson', objectId: 'r2' },
  { type: 'save', collection: 'Lesson', objectId: 'r9', data: { title: 'a' } },
  { type: 'save', collection: 'Lesson', objectId: 'r1', data: { title: 'a' } }
];
const WRITES: NonNullable<BackendScript['events']> = Array.from({ length: 16 }, (_, k) => ({ at: 2 ** (k + 1), ...WRITE_CYCLE[k % WRITE_CYCLE.length] }));

/** The backends a sequence plays with: nobody writing; writes on the active backend; two backends, writes on each. */
const BACKENDS: ReadonlyArray<BackendScript> = [
  {},
  { events: WRITES },
  { events: WRITES },
  { backends: ['main', 'other'], events: [{ at: 1, backend: 'other', type: 'save', collection: 'Lesson', objectId: 'r1', data: { title: 'z' } }, ...WRITES] }
];

type Outcomes = Array<{ port: 'filter'; outcome: 'done' | 'failure'; error?: string }>;

export const FilterRecords = defineNode({
  type: 'FilterDBModels',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/filterdbmodelsnode.ts; api/queryutils.ts; @noodl/backend-contract translators',
  needs: ['registry', 'random', 'backend'],
  worldPool: { registries: REGISTRIES, backends: BACKENDS },

  // :144-178 — `enabled` is established by `initialize` (:174); the declared default never runs a setter
  state: {
    source: undefined,
    filteredId: undefined,
    enabled: true,
    collectionName: undefined,
    visualFilter: undefined,
    visualSorting: undefined,
    filterParameters: {},
    settings: {},
    lastError: undefined,
    lastReported: undefined,
    tokens: 0,
    scheduled: false,
    bound: undefined,
    settingsBox: true
  } as FilterRecordsState,
  outcomes: ['done', 'failure'], // :295-298

  inputs: {
    // :198-207
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'The records to filter, normally the Items output of a Query Records node',
      examples: [{ $array: 'rows' }, { $array: 'rows' }, { $array: 'rows' }, [], [{ title: 'a' }, { title: 'b' }]]
    },
    // :208-220
    enabled: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Enabled',
      group: 'General',
      description: 'Passes every record through unchanged when off, rather than emptying the result'
    },
    // :221-230
    filter: {
      type: 'signal',
      outcome: true,
      displayName: 'Filter',
      group: 'Actions',
      description:
        'Re-runs the filter now. This is additional to it re-running when Items, Enabled, the filter settings or the records themselves change; untick any of those under Run On Value Change to stop it'
    },
    // :136-143
    'runOnChange-items': runOnChange('Items'),
    'runOnChange-enabled': runOnChange('Enabled'),
    'runOnChange-records': runOnChange('Record changes'),
    'runOnChange-filterSettings': runOnChange('Filter settings')
  },

  outputs: {
    // :233-241
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'The records that matched, after Sorting, Skip and Limit have been applied',
      from: (s, w) => (s.filteredId !== undefined ? w.registry.collection(s.filteredId) : undefined)
    },
    // :242-253
    firstItemId: {
      type: 'string',
      displayName: 'First Record Id',
      group: 'General',
      description: 'Id of the first record in the result, and nothing at all when the result is empty',
      from: (s, w) => {
        if (s.filteredId === undefined) return undefined;
        const first = w.registry.collection(s.filteredId).get(0);
        return first !== undefined ? first.getId() : undefined;
      }
    },
    // :264-272
    count: {
      type: 'number',
      displayName: 'Count',
      group: 'General',
      description: 'How many records are in the result after Skip and Limit, not how many matched the filter',
      from: (s, w) => (s.filteredId !== undefined ? w.registry.collection(s.filteredId).size() : 0)
    },
    // :281-288
    modified: {
      type: 'signal',
      displayName: 'Filtered',
      group: 'Events',
      description: 'Fires each time the result has been rebuilt, including when the same records come back and including runs nobody triggered; wire Done for the outcome of a Filter you triggered'
    },
    // :299-307
    error: errorOutput('Why the most recent failed run failed, kept after a later run succeeds', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    // :203-206 → bindCollection :316-320
    items: (s, v, i, w) => {
      if (w.registry.isCollection(s.source)) w.unwatch({ collection: s.source.getId() }); // :313
      if (w.registry.isCollection(v)) w.watch({ collection: v.getId() }); // :319
      return { set: { source: v, scheduled: s.scheduled || i['runOnChange-items'] }, send: [] }; // :205
    },
    // :214-219
    enabled: (s, v, i) => ({ set: { enabled: v, scheduled: s.scheduled || (valueDidChange(s.enabled, v) && i['runOnChange-enabled']) }, send: [] }),
    // :227-229 → requestFilter :394-401
    filter: (s) => ({ set: { tokens: s.tokens + 1, scheduled: true }, outcome: 'deferred', send: [] }),
    'runOnChange-items': () => ({ send: [] }),
    'runOnChange-enabled': () => ({ send: [] }),
    'runOnChange-records': () => ({ send: [] }),
    'runOnChange-filterSettings': (_s, v) => ({ set: { settingsBox: v }, send: [] })
  },
  {
    derived: {
      // the editor's ports need the class's schema (:666-712), which a play has none of: no port is drawn from params
      inputs: () => ({}),
      discover,
      candidates: ['collectionName', 'backendId', 'visualFilter', 'visualSorting', 'fp-min', 'filterEnableLimit', 'filterLimit', 'filterSkip', 'runOnChange-fp-min'],
      on: (s, port, v, derived, w) => {
        const schedule = (go: boolean) => (go && !s.scheduled ? { scheduled: true } : {});
        if (port.startsWith('runOnChange-')) return { send: [] }; // the box only records its answer
        if (port === 'collectionName') return { set: { collectionName: v }, send: [] }; // :513-515 — stored, nothing run
        if (port === 'backendId') return { set: { bound: w.backendFor(v) }, send: [] }; // :547-553 — the subscription moves, nothing run
        if (port === 'visualFilter') return { set: { visualFilter: v, ...schedule(s.settingsBox) }, send: [] }; // :516-520 — changed or not
        if (port === 'visualSorting') return { set: { visualSorting: v, ...schedule(s.settingsBox) }, send: [] }; // :521-525
        if (port.startsWith('fp-')) {
          const name = port.slice('fp-'.length); // :526-534 — its own box, keyed by the PORT name
          return { set: { filterParameters: { ...s.filterParameters, [name]: v }, ...schedule(valueDidChange(s.filterParameters[name], v) && ticked(derived, port)) }, send: [] };
        }
        // :581-587 userInputSetter
        return { set: { settings: { ...s.settings, [port]: v }, ...schedule(valueDidChange(s.settings[port], v) && s.settingsBox) }, send: [] };
      }
    },
    // :428-511 — the run. Three paths leave nothing on the wire — no run due, a run with no array and no press
    // (:440-452), a failure already announced (:413-426) — and return ONE shape.
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled) return idle;
      const requested = s.tokens > 0; // :436-438 — drained before the run starts
      const fail = (code: string, message: string) => {
        // :402-427 reportFailure
        const repeat = s.lastReported === message;
        if (requested) {
          const outcomes: Outcomes = Array.from({ length: s.tokens }, () => ({ port: 'filter' as const, outcome: 'failure' as const, error: code }));
          return { set: { scheduled: false, tokens: 0, lastError: message, lastReported: message }, send: ['error' as const], outcomes };
        }
        if (repeat) return { ...idle, send: ['error' as const] }; // Error re-sent, nothing raised, nothing pulsed
        return { set: { scheduled: false, lastError: message, lastReported: message }, send: ['error' as const], emit: ['failure' as const] }; // :426 — a plain pulse, no invocation
      };
      if (!s.source) {
        if (requested) return fail('filter-records/no-items', 'Nothing to filter — no records are connected to the Items input'); // :443-450
        return idle;
      }
      let filtered = itemsOf(s.source, (v) => w.registry.isCollection(v)); // :455
      if (s.enabled) {
        try {
          if (s.visualFilter !== undefined) {
            // :459-467 — lowered with the `fp-` parameters, then matched record by record
            const where = lowerToParse(toNeutral(s.visualFilter, s.filterParameters, 'fp-'));
            if (where) filtered = filtered.filter((m) => matchesQuery(m as RecordRef, where));
          }
          // :486-491 — an empty sort is no sort. THE SORT THAT CANNOT COMPARE (header): inside the failure path here
          const sorting = s.visualSorting as Array<{ property: string; order?: string }> | undefined;
          if (sorting !== undefined && sorting.length > 0) {
            const sort = sorting.map((x) => (x.order === 'descending' ? '-' : '') + x.property); // queryutils.ts :440-444
            filtered.sort((a, b) => compareObjects(sort, a as RecordRef, b as RecordRef));
          }
        } catch (e) {
          return fail('filter-records/filter-failed', 'The filter could not be applied: ' + ((e as Error).message || String(e))); // :474-479
        }
        const skip = (!s.settings['filterEnableLimit'] ? undefined : s.settings['filterSkip'] || 0) as number; // :375-380
        if (skip) filtered = filtered.slice(skip, filtered.length); // :493-494
        const limit = (!s.settings['filterEnableLimit'] ? undefined : s.settings['filterLimit'] || 10) as number; // :369-374
        if (limit) filtered = filtered.slice(0, limit); // :496-497
      }
      const collection = w.registry.collectionCreate(filtered); // :503 — a new anonymous array
      const outcomes: Outcomes = Array.from({ length: s.tokens }, () => ({ port: 'filter' as const, outcome: 'done' as const }));
      // :500-510 — values first, then the announcement, then the invocation's outcome last
      return { set: { scheduled: false, tokens: 0, lastReported: undefined, filteredId: collection.getId() }, send: ['firstItemId', 'items', 'count'], emit: ['modified'], outcomes };
    },
    world: {
      // :147-151 — the bound array changed
      change: (s, i, e: ChangeEvent, w) =>
        e.kind === 'collection' && w.registry.isCollection(s.source) && e.id === s.source.getId() && i['runOnChange-records'] ? { set: { scheduled: true }, send: [] } : { send: [] },
      // :153-166 — a SAVE heard on the store this node is bound to
      store: (s, i, e, w) => {
        if (e.type !== 'save') return { send: [] }; // :328 — `save` is the one event it listens for
        if (s.bound !== e.backend) return { send: [] }; // :172, :547-553 — the legacy store hears no world write
        if (!i['runOnChange-records']) return { send: [] }; // :154
        if (s.visualFilter === undefined) return { send: [] }; // :156
        if (s.source === undefined) return { send: [] }; // :157
        if (e.collection !== s.collectionName) return { send: [] }; // :158
        // :164 — the GLOBAL registry's record; a plain array holds none of them
        const m = w.registry.model(e.objectId);
        const holds = w.registry.isCollection(s.source) ? s.source.contains(m) : Array.isArray(s.source) && s.source.includes(m);
        return holds ? { set: { scheduled: true }, send: [] } : { send: [] };
      }
    }
  }
);
