/**
 * Array Filter (catalog type `Filter Collection`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts` on 2026-10-01
 * (NSP-012), with run-on-value-change.ts and collection.ts beside it.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node REBUILDS its output from scratch at the frame end —
 * a NEW anonymous array every run (`Collection.create`, :527; a guid draw, and one more per
 * plain-object row), so `Items` is REPLACED, never mutated (NSP-012 AC6) and the input array is
 * never touched. A run is scheduled, once per frame (:453-455), by any of six paths: the `Filter`
 * and `Refresh` pulses (an invocation each, a token per press, :411-419); `Items` arriving
 * (:208-211), `Enabled` CHANGING (:219-224, DEF-046), any `filter…` setting changing
 * (:556-561), and the bound array's own `change` (:162-166) — each of those four behind its `Run
 * On Value Change` box. The run (:457-537): with no array bound it is SILENT unless a press asked,
 * and then fails every press with `array-filter/no-items` (:466-480); otherwise it copies the
 * array's items, and when `Enabled` is truthy applies the filter and the sort (:483-490 — the
 * operators and the comparator below, verbatim), where a pattern that will not compile or a
 * row the test cannot read FAILS with `array-filter/filter-failed` and the thrown message
 * (:491-514), then `Skip` and `Limit` (:516-520); then `Items`, `First Item Id` and `Count` are
 * sent, `Filtered` pulses (a value-level announcement, every run), and every press reports
 * `done` (:527-536). A failure writes `Error`; the same message is RAISED once until a run
 * succeeds (:420-452, :523-525) — a press owes its outcome regardless, and a value-path failure
 * with no press pulses `Failure` as a plain signal, once per distinct message (:449-451).
 *
 * The settings are PANEL ports the runtime registers on first write (:544-552 — any name at all);
 * `getFilter` / `getSort` / `getLimit` / `getSkip` (:349-393) read them raw: a `filterLimit` of
 * `0` means 10, a `Skip` of `'2'` slices as JavaScript slices.
 */

import type { ChangeEvent, ValueInputDecl } from '../spec';
import { defineNode } from '../spec';
import type { RecordRef } from '../registry';
import { valueDidChange } from './condition';
import { errorOutput, runOnChange } from './data-base';

/* eslint-disable eqeqeq, @typescript-eslint/no-explicit-any */

type Filter = Record<string, Record<string, unknown>>;
type SortSpec = Record<string, 1 | -1>;

/** :44-68 — loose comparisons on purpose; `$neq` alone tolerates a missing key. */
export function applyFilter(item: Record<string, unknown>, filter: Filter): boolean {
  for (const key in filter) {
    const op = filter[key];
    if (op['$neq'] !== undefined) {
      if (!(item[key] != op['$neq'])) return false;
    } else if (item[key] === undefined) return false;
    else if (op['$eq'] !== undefined && !(item[key] == op['$eq'])) return false;
    else if (op['$gt'] !== undefined && !((item[key] as any) > (op['$gt'] as any))) return false;
    else if (op['$lt'] !== undefined && !((item[key] as any) < (op['$lt'] as any))) return false;
    else if (op['$gte'] !== undefined && !((item[key] as any) >= (op['$gte'] as any))) return false;
    else if (op['$lte'] !== undefined && !((item[key] as any) <= (op['$lte'] as any))) return false;
    else if (op['$regex'] !== undefined) {
      const a = item[key] + '';
      const regex = new RegExp(op['$regex'] as string, op['$case'] !== true ? 'i' : undefined);
      if (!regex.test(a)) return false;
    }
  }
  return true;
}

/** :76-98 — the comparator, bound to its sort spec; a record sorts by its data. */
export function sorter(this: SortSpec, isRecord: (v: unknown) => v is RecordRef, a: unknown, b: unknown): number {
  if (isRecord(a)) a = a.data;
  if (isRecord(b)) b = b.data;
  for (const key in this) {
    const _a = (a as Record<string, unknown>)[key] as any;
    const _b = (b as Record<string, unknown>)[key] as any;
    if (_a !== _b) {
      if (typeof _a === 'string' && typeof _b === 'string') {
        if (this[key] === 1) return _a > _b ? 1 : -1;
        else return _a > _b ? -1 : 1;
      } else if (typeof _a === 'number' && typeof _b === 'number') {
        return this[key] === 1 ? _a - _b : _b - _a;
      } else {
        if (this[key] === 1) return _a > _b ? 1 : -1;
        else return _a > _b ? -1 : 1;
      }
    }
  }
  return 0;
}

/** :349-369 */
function getFilter(settings: Readonly<Record<string, unknown>>): Filter | undefined {
  if (!settings['filterFilter']) return undefined;
  const filter: Filter = {};
  for (const f of String(settings['filterFilter']).split(',')) {
    const op = '$' + (settings['filterFilterOp-' + f] || 'eq');
    filter[f] = {};
    filter[f][op] = settings['filterFilterValue-' + f];
    const option = settings['filterFilterOption-case-' + f];
    if (option) filter[f]['$case'] = option;
  }
  return filter;
}
/** :370-381 */
function getSort(settings: Readonly<Record<string, unknown>>): SortSpec | undefined {
  if (!settings['filterSort']) return undefined;
  const sort: SortSpec = {};
  for (const s of String(settings['filterSort']).split(',')) sort[s] = settings['filterSort-' + s] === 'descending' ? -1 : 1;
  return sort;
}
/** :382-387 */
const getLimit = (settings: Readonly<Record<string, unknown>>): unknown => (!settings['filterEnableLimit'] ? undefined : settings['filterLimit'] || 10);
/** :388-393 */
const getSkip = (settings: Readonly<Record<string, unknown>>): unknown => (!settings['filterEnableLimit'] ? undefined : settings['filterSkip'] || 0);

/** :563-714 updatePorts — the port a settings name is drawn as. */
function settingPort(name: string): ValueInputDecl {
  const group = (f: string) => f + ' filter';
  if (name === 'filterEnableLimit') return { type: 'boolean', coerce: 'none', displayName: 'Use limit', group: 'Limit', examples: [true, false] };
  if (name === 'filterLimit') return { type: 'number', coerce: 'none', displayName: 'Limit', group: 'Limit', examples: [1, 2, 0, '2'] };
  if (name === 'filterSkip') return { type: 'number', coerce: 'none', displayName: 'Skip', group: 'Limit', examples: [1, 0, '1'] };
  if (name === 'filterFilter') return { type: 'stringlist', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', examples: ['a', 'a,b', 'name'] };
  if (name === 'filterSort') return { type: 'stringlist', coerce: 'none', editOnly: true, displayName: 'Sort', group: 'Sort', examples: ['a', 'b,a', 'name'] };
  let m: RegExpMatchArray | null;
  if ((m = /^filterFilterType-(.*)$/.exec(name))) return { type: 'enum', enums: ['string', 'number', 'boolean'], default: 'string', coerce: 'none', displayName: 'Type', group: group(m[1]) };
  if ((m = /^filterFilterOp-(.*)$/.exec(name))) return { type: 'enum', enums: ['eq', 'neq', 'regex', 'lt', 'gt', 'gte', 'lte'], default: 'eq', coerce: 'none', displayName: 'Op', group: group(m[1]) };
  if ((m = /^filterFilterOption-case-(.*)$/.exec(name))) return { type: 'boolean', default: false, coerce: 'none', displayName: 'Case sensitive', group: group(m[1]) };
  if ((m = /^filterFilterValue-(.*)$/.exec(name))) return { type: '*', coerce: 'none', displayName: 'Value', group: group(m[1]), examples: [1, 'x', '2', 'a.*', '[', true, 'Ada'] };
  if ((m = /^filterSort-(.*)$/.exec(name))) return { type: 'enum', enums: ['ascending', 'descending'], default: 'ascending', coerce: 'none', displayName: 'Sort', group: m[1] + ' sort' };
  return { type: '*', coerce: 'none' };
}

export type FilterState = {
  /** `_internal.collection` — an array of this registry, a plain array, or whatever else arrived */
  source: unknown;
  /** `_internal.filteredCollection`, by name */
  filteredId: string | undefined;
  enabled: unknown;
  settings: Readonly<Record<string, unknown>>;
  lastError: string | undefined;
  lastReported: string | undefined;
  /** `pendingFilterOutcomes` — one per press, the port each came in on (:411-419) */
  tokens: ReadonlyArray<'filter' | 'refresh'>;
  scheduled: boolean;
  /** the `Filter settings` checkbox, mirrored for the derived reducer */
  runOnSettings: boolean;
};

type Outcomes = Array<{ port: 'filter' | 'refresh'; outcome: 'done' | 'failure'; error?: string }>;

export const FilterCollection = defineNode({
  type: 'Filter Collection',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts',
  needs: ['registry', 'random'],

  // :101-131, :161-182 — `enabled` is established by `initialize` (:179), the declared default never runs a setter
  state: { source: undefined, filteredId: undefined, enabled: true, settings: {}, lastError: undefined, lastReported: undefined, tokens: [], scheduled: false, runOnSettings: true } as FilterState,
  outcomes: ['done', 'failure'], // :317-322

  inputs: {
    // :202-212
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'Array to filter; the node re-runs whenever this array changes, unless you untick it under Run On Value Change',
      examples: [[{ a: 1, name: 'Ada' }, { a: 2, name: 'Lin' }, { a: 3, name: 'ada' }]]
    },
    // :213-225
    enabled: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Enabled',
      group: 'General',
      description: 'When false the input array passes straight through — unfiltered, unsorted and unlimited'
    },
    // :226-235
    filter: {
      type: 'signal',
      outcome: true,
      displayName: 'Filter',
      group: 'Actions',
      description:
        'Runs the filter now and replaces Items with the result. This is additional to it re-running when Items, Enabled, the filter settings or the array contents change; untick any of those under Run On Value Change to stop it'
    },
    // :240-248
    refresh: {
      type: 'signal',
      outcome: true,
      displayName: 'Refresh',
      group: 'Actions',
      description: 'Runs the filter now — the same action as Filter, under the name the rest of the Array family uses'
    },
    // :153-160
    'runOnChange-items': runOnChange('Items'),
    'runOnChange-enabled': runOnChange('Enabled'),
    'runOnChange-array': runOnChange('Array contents'),
    'runOnChange-filterSettings': runOnChange('Filter settings')
  },

  outputs: {
    // :251-259
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'A new array holding the records that passed, in sort order; the input array is never modified',
      from: (s, w) => (s.filteredId !== undefined ? w.registry.collection(s.filteredId) : undefined)
    },
    // :260-271
    firstItemId: {
      type: 'string',
      displayName: 'First Item Id',
      group: 'General',
      description: 'Id of the first record that passed, or empty when nothing matched',
      from: (s, w) => {
        if (s.filteredId === undefined) return undefined;
        const first = w.registry.collection(s.filteredId).get(0);
        return first !== undefined ? first.getId() : undefined;
      }
    },
    // :282-290
    count: { type: 'number', displayName: 'Count', group: 'General', description: 'How many records passed the filter, after Skip and Limit have been applied', from: (s, w) => (s.filteredId !== undefined ? w.registry.collection(s.filteredId).size() : 0) },
    // :304-311
    modified: {
      type: 'signal',
      displayName: 'Filtered',
      group: 'Events',
      description: 'Fires once the filter has run and Items is up to date, whether an author asked for the run or an input changed; wire Done instead for the outcome of a Filter you triggered'
    },
    // :323-331
    error: errorOutput('Why the last run failed, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    // :208-211 → bindCollection :340-344
    items: (s, v, i, w) => {
      if (w.registry.isCollection(s.source)) w.unwatch({ collection: s.source.getId() }); // :341
      if (w.registry.isCollection(v)) w.watch({ collection: v.getId() }); // :343
      return { set: { source: v, scheduled: s.scheduled || i['runOnChange-items'] }, send: [] }; // :210
    },
    // :219-224
    enabled: (s, v, i) => ({ set: { enabled: v, scheduled: s.scheduled || (valueDidChange(s.enabled, v) && i['runOnChange-enabled']) }, send: [] }),
    // :232-234, :245-247 → requestFilter :411-419
    filter: (s) => ({ set: { tokens: [...s.tokens, 'filter'], scheduled: true }, outcome: 'deferred', send: [] }),
    refresh: (s) => ({ set: { tokens: [...s.tokens, 'refresh'], scheduled: true }, outcome: 'deferred', send: [] }),
    'runOnChange-items': () => ({ send: [] }),
    'runOnChange-enabled': () => ({ send: [] }),
    'runOnChange-array': () => ({ send: [] }),
    'runOnChange-filterSettings': (_s, v) => ({ set: { runOnSettings: v }, send: [] })
  },
  {
    derived: {
      // :563-714
      inputs: (params) => {
        const out: Record<string, ValueInputDecl> = {};
        const names = ['filterEnableLimit', ...(params.filterEnableLimit ? ['filterLimit', 'filterSkip'] : []), 'filterFilter', 'filterSort'];
        if (params.filterFilter) {
          for (const f of String(params.filterFilter).split(',')) {
            names.push('filterFilterType-' + f, 'filterFilterOp-' + f);
            if (params['filterFilterOp-' + f] === 'regex') names.push('filterFilterOption-case-' + f);
            names.push('filterFilterValue-' + f);
          }
        }
        if (params.filterSort) for (const s of String(params.filterSort).split(',')) names.push('filterSort-' + s);
        for (const n of names) out[n] = settingPort(n);
        return out;
      },
      // :544-552 — any name at all, on first write
      discover: settingPort,
      candidates: ['filterEnableLimit', 'filterLimit', 'filterSkip', 'filterFilter', 'filterSort', 'filterFilterOp-a', 'filterFilterValue-a', 'filterFilterValue-name', 'filterFilterOption-case-a', 'filterSort-a', 'filterSort-name'],
      // :556-561 userInputSetter
      on: (s, port, v) => {
        const previous = s.settings[port];
        const settings = { ...s.settings, [port]: v };
        return { set: { settings, scheduled: s.scheduled || (valueDidChange(previous, v) && s.runOnSettings) }, send: [] };
      }
    },
    // :457-537 — the run. Three paths leave nothing on the wire — no run due, a run with no array
    // and no press (:466-480), a failure already announced (:434-435) — and return ONE shape, so
    // a suite that cannot tell them apart is not asked to.
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled) return idle;
      const tokens = s.tokens;
      const requested = tokens.length > 0;
      const fail = (code: string, message: string): ReturnType<typeof afterRun> => {
        // :420-452 reportFailure
        const repeat = s.lastReported === message;
        if (requested) {
          const outcomes: Outcomes = tokens.map((port) => ({ port, outcome: 'failure', error: code }));
          return { set: { scheduled: false, tokens: [], lastError: message, lastReported: message }, send: ['error'], outcomes };
        }
        if (repeat) return { ...idle, send: ['error'] }; // :434-435 — Error re-sent, nothing raised, nothing pulsed
        return { set: { scheduled: false, lastError: message, lastReported: message }, send: ['error'], emit: ['failure'] }; // :449-451 — a plain pulse, no invocation
      };
      if (!s.source) {
        if (requested) return fail('array-filter/no-items', 'Nothing to filter — no array is connected to the Items input'); // :471-478
        return idle; // :466-480 silent
      }
      // :483 — a copy of the array's items (a plain array's `items` is itself, collection.ts :436-447)
      let filtered: unknown[] = ([] as unknown[]).concat(w.registry.isCollection(s.source) ? s.source.items : (s.source as unknown[]));
      if (s.enabled) {
        const filter = getFilter(s.settings);
        const sort = getSort(s.settings);
        try {
          if (filter) filtered = filtered.filter((m) => applyFilter((m as { data: Record<string, unknown> }).data, filter)); // :489
          if (sort) filtered.sort(sorter.bind(sort, w.registry.isRecord)); // :490
        } catch (e) {
          return fail('array-filter/filter-failed', 'The filter could not be applied: ' + ((e as Error).message || String(e))); // :507-513
        }
        const skip = getSkip(s.settings) as number;
        if (skip) filtered = filtered.slice(skip, filtered.length); // :516-517
        const limit = getLimit(s.settings) as number;
        if (limit) filtered = filtered.slice(0, limit); // :519-520
      }
      const collection = w.registry.collectionCreate(filtered); // :527 — a new anonymous array
      return afterRun(collection.getId(), tokens);
    },
    world: {
      // :162-166 — the bound array changed
      change: (s, i, e: ChangeEvent, w) =>
        e.kind === 'collection' && w.registry.isCollection(s.source) && e.id === s.source.getId() && i['runOnChange-array'] ? { set: { scheduled: true }, send: [] } : { send: [] }
    }
  }
);

/** :525-536 — the successful run's patch: values, the announcement, the outcomes. */
function afterRun(filteredId: string, tokens: ReadonlyArray<'filter' | 'refresh'>): { set: Partial<FilterState>; send: Array<'items' | 'firstItemId' | 'count' | 'error'>; emit?: Array<'modified' | 'failure'>; outcomes?: Outcomes } {
  const outcomes: Outcomes = tokens.map((port) => ({ port, outcome: 'done' }));
  return { set: { scheduled: false, tokens: [], lastReported: undefined, filteredId }, send: ['firstItemId', 'items', 'count'], emit: ['modified'], outcomes };
}
