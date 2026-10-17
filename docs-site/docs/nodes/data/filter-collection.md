---
title: "Array Filter"
---
Array Filter: filters, sorts and limits an input array into a new output array, re-running automatically when the source changes.

Takes an array on `items`, applies the filter, sort and limit configured in its parameters, and outputs the result as a new array on `items` — the input array is never mutated, and each run produces a fresh array object. It re-runs automatically whenever `items`, `enabled`, the filter settings or the source array's contents change; each of those is a Run On Value Change tick-box, ticked by default, and connecting the `filter` signal does not turn any of them off. With `enabled` false the input passes through unfiltered (still as a copy). After each run `modified` (Filtered) fires and `count`/`firstItemId` describe the output; a run you triggered with `filter` or `refresh` also reports `done`/`failure` and then `completed`. Filter operators: eq/neq for all types, lt/gt/lte/gte for numbers, regex (with optional case sensitivity) for strings, and in/nin ("Is one of" / "Is not one of") for strings and numbers: their Values port takes a wired Array (a record counts by its id) or typed text "a, b, c"; like neq, nin keeps a row without the property.

## When to use it

Client-side filtering, searching and sorting of arrays already in memory — e.g. a live search box over a Static Array or shared Array. For server data prefer filtering in the Query Records node so the database does the work; for reshaping item properties use Array Map.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Filter Collection` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 4 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `enabled` | Boolean | `true` | When false the input array passes straight through — unfiltered, unsorted and unlimited |
| `items` | Array | — | Array to filter; the node re-runs whenever this array changes, unless you untick it under Run On Value Change |
| `runOnChange-array` | Boolean | `true` | Whether a new value on Array contents re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `runOnChange-enabled` | Boolean | `true` | Whether a new value on Enabled re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `runOnChange-filterSettings` | Boolean | `true` | Whether a new value on Filter settings re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `runOnChange-items` | Boolean | `true` | Whether a new value on Items re-runs this node. On by default; untick to make this input passive so only the control signal runs it |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `filter` | Signal | — | Runs the filter now and replaces Items with the result. This is additional to it re-running when Items, Enabled, the filter settings or the array contents change; untick any of those under Run On Value Change to stop it |
| `refresh` | Signal | — | Runs the filter now — the same action as Filter, under the name the rest of the Array family uses |

### What each input does

**Items** (`items`)

- always: kept, and watched when it is a shared array; ticked under Run On Value Change, the filter runs at the frame's end

**Enabled** (`enabled`)

- always: kept; a change, ticked under Run On Value Change, runs the filter at the frame's end — off, the array passes through unfiltered, unsorted and unlimited

**Filter** (`filter`)

- always: the filter runs at the frame's end, one run for the frame's presses — Items, First Item Id and Count are sent, Filtered fires, then each press's Done or Failure

**Refresh** (`refresh`)

- always: the same as Filter

**Items** (`runOnChange-items`)

- always: read when the next Items arrives

**Enabled** (`runOnChange-enabled`)

- always: read when Enabled next changes

**Array contents** (`runOnChange-array`)

- always: read when the bound array's contents next change

**Filter settings** (`runOnChange-filterSettings`)

- always: kept; read when a filter setting next changes

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many records passed the filter, after Skip and Limit have been applied |
| `firstItemId` | String | — | Id of the first record that passed, or empty when nothing matched |
| `items` | Array | — | A new array holding the records that passed, in sort order; the input array is never modified |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once a Filter or Refresh you triggered has run and Items is up to date |
| `modified` | Signal | — | Fires once the filter has run and Items is up to date, whether an author asked for the run or an input changed; wire Done instead for the outcome of a Filter you triggered |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last run failed, in one sentence; empty until something fails |
| `failure` | Signal | — | Fires when the filter could not be applied — a pattern that will not compile, or a Filter pulse with no array connected |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Some ports are discovered at runtime from user code, parameters or connected components, and are pushed to the editor per instance; the static port list below is incomplete for such instances.

## Ports at runtime

The filter/sort/limit configuration creates its own input ports, pushed to the editor per instance: `filterFilter` (a stringlist of property names — a dotted name such as `owner.id` reads the field inside a field, unless a row has a field with that exact name) generates, per property &lt;p>, `filterFilterType-<p>` (string/number/boolean), `filterFilterOp-<p>` (eq, neq, regex, in, nin for strings; eq, neq, lt, gt, gte, lte, in, nin for numbers), `filterFilterValue-<p>` (a connectable value — wire a text input here for live search) and, for regex, `filterFilterOption-case-<p>`. `filterSort` (stringlist) generates `filterSort-<p>` (ascending/descending) per property. `filterEnableLimit` (boolean) reveals `filterLimit` (default 10) and `filterSkip` (default 0). An authoring tool must set `filterFilter`/`filterSort` first and use exactly these generated names.

## Patterns

- Static Array or Array `items` → Array Filter `items` → Repeater `items`: a filtered local list.
- Text Input `text` → `filterFilterValue-<prop>` with op regex: live search-as-you-type.

## Watch out for

- Filtering large cloud datasets client-side — put the filter in Query Records instead so only matching records are fetched.

## Examples

**Static array filtered and mapped into a list**

Local data without a backend: Static Array holds inline JSON, Array Filter narrows it with a per-item filter script, Array Map reshapes each element with a map script, and the result drives a Repeater. Filter and Map are non-destructive — they emit new arrays and leave the source untouched, so several differently-filtered views can share one source.

## Related nodes

[Array](./collection2.md), [Static Array](./static-data.md), [Array Map](./map-collection.md), [Repeater](../visual/for-each.md), [Query Records](../cloud-services/db-collection2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 4. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)
- random numbers (`random`)

### Starting state

```json
{
  "enabled": true,
  "settings": {},
  "tokens": [],
  "scheduled": false,
  "runOnSettings": true
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Items (`items`) | `array-literal` | text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]` |
| Items (`runOnChange-items`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |
| Enabled (`runOnChange-enabled`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |
| Array contents (`runOnChange-array`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |
| Filter settings (`runOnChange-filterSettings`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Filter or Refresh is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/array-filter.ts"
/**
 * Array Filter (catalog type `Filter Collection`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts` on 2026-10-01
 * (NSP-012), with run-on-value-change.ts and collection.ts beside it.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node REBUILDS its output from scratch at the frame end —
 * a NEW anonymous array every run (`Collection.create`, :546; a guid draw, and one more per
 * plain-object row), so `Items` is REPLACED, never mutated (NSP-012 AC6) and the input array is
 * never touched. A run is scheduled, once per frame (:472-474), by any of six paths: the `Filter`
 * and `Refresh` pulses (an invocation each, a token per press, :430-438); `Items` arriving
 * (:227-230), `Enabled` CHANGING (:238-243, DEF-046), any `filter…` setting changing
 * (:575-580), and the bound array's own `change` (:181-185) — each of those four behind its `Run
 * On Value Change` box. The run (:476-556): with no array bound it is SILENT unless a press asked,
 * and then fails every press with `array-filter/no-items` (:485-499); otherwise it copies the
 * array's items, and when `Enabled` is truthy applies the filter and the sort (:502-509 — the
 * operators and the comparator below, verbatim), where a pattern that will not compile or a
 * row the test cannot read FAILS with `array-filter/filter-failed` and the thrown message
 * (:510-533), then `Skip` and `Limit` (:535-539); then `Items`, `First Item Id` and `Count` are
 * sent, `Filtered` pulses (a value-level announcement, every run), and every press reports
 * `done` (:546-555). A failure writes `Error`; the same message is RAISED once until a run
 * succeeds (:439-471, :542-544) — a press owes its outcome regardless, and a value-path failure
 * with no press pulses `Failure` as a plain signal, once per distinct message (:468-470).
 *
 * The settings are PANEL ports the runtime registers on first write (:563-571 — any name at all);
 * `getFilter` / `getSort` / `getLimit` / `getSkip` (:368-412) read them raw: a `filterLimit` of
 * `0` means 10, a `Skip` of `'2'` slices as JavaScript slices.
 */

import type { ChangeEvent, ValueInputDecl } from '../spec';
import { defineNode } from '../spec';
import { notAList } from './items-input';
import type { CollectionRef, RecordRef, RegistryScript } from '../registry';
import { valueDidChange } from './condition';
import { errorOutput, runOnChange } from './data-base';

/* eslint-disable eqeqeq, @typescript-eslint/no-explicit-any */

type Filter = Record<string, Record<string, unknown>>;
type SortSpec = Record<string, 1 | -1>;

/**
 * P109-S8-ARRAYFILTERPATH (ruled 2026-10-05, "Yes, exact name first"): the value a filter key names in a row. A row that
 * HAS a field with that exact name gives it, dots and all; otherwise a dotted key is a path into nested objects
 * (`owner.id` → `item.owner.id`), and a step that is not an object ends it as `undefined` (absent, as for any missing
 * field). Measured before the ruling: 0 of 253 filter keys in 55 projects contain a dot, so no list reads differently.
 */
function fieldOf(item: Record<string, unknown>, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(item, key) || !key.includes('.')) return item[key];
  let at: unknown = item;
  for (const step of key.split('.')) {
    if (at === null || typeof at !== 'object') return undefined;
    at = (at as Record<string, unknown>)[step];
  }
  return at;
}

/** :44-72 — loose comparisons on purpose; `$neq` and `$nin` alone tolerate a missing key. */
export function applyFilter(item: Record<string, unknown>, filter: Filter, isRecord: (v: unknown) => v is RecordRef, isCollection: (v: unknown) => v is CollectionRef): boolean {
  const listOf = (v: unknown) => listOfValues(v, isRecord, isCollection);
  for (const key in filter) {
    const op = filter[key];
    const got = fieldOf(item, key);
    if (op['$neq'] !== undefined) {
      if (!(got != op['$neq'])) return false;
    } else if (op['$nin'] !== undefined) {
      if (listOf(op['$nin']).some((m) => got == m)) return false; // :51-53
    } else if (got === undefined) return false;
    else if (op['$eq'] !== undefined && !(got == op['$eq'])) return false;
    else if (op['$gt'] !== undefined && !((got as any) > (op['$gt'] as any))) return false;
    else if (op['$lt'] !== undefined && !((got as any) < (op['$lt'] as any))) return false;
    else if (op['$gte'] !== undefined && !((got as any) >= (op['$gte'] as any))) return false;
    else if (op['$lte'] !== undefined && !((got as any) <= (op['$lte'] as any))) return false;
    else if (op['$in'] !== undefined && !listOf(op['$in']).some((m) => got == m)) return false; // :61
    else if (op['$regex'] !== undefined) {
      const a = got + '';
      const regex = new RegExp(op['$regex'] as string, op['$case'] !== true ? 'i' : undefined);
      if (!regex.test(a)) return false;
    }
  }
  return true;
}

/**
 * :74-87 — the list an `$in` / `$nin` test compares against: a wired array's records count by id (a plain
 * array's records too, other members as they are); typed text is a comma list, each piece trimmed and an empty
 * one dropped; any other single value is a list of one.
 */
function listOfValues(value: unknown, isRecord: (v: unknown) => v is RecordRef, isCollection: (v: unknown) => v is CollectionRef): unknown[] {
  const ids = (m: unknown) => (isRecord(m) ? m.getId() : m);
  if (isCollection(value)) return value.items.map(ids);
  if (Array.isArray(value)) return value.map(ids);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter((v) => v !== '');
  return [value];
}

/** :95-117 — the comparator, bound to its sort spec; a record sorts by its data. */
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

/** :368-388 */
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
/** :389-400 */
function getSort(settings: Readonly<Record<string, unknown>>): SortSpec | undefined {
  if (!settings['filterSort']) return undefined;
  const sort: SortSpec = {};
  for (const s of String(settings['filterSort']).split(',')) sort[s] = settings['filterSort-' + s] === 'descending' ? -1 : 1;
  return sort;
}
/** :401-406 */
const getLimit = (settings: Readonly<Record<string, unknown>>): unknown => (!settings['filterEnableLimit'] ? undefined : settings['filterLimit'] || 10);
/** :407-412 */
const getSkip = (settings: Readonly<Record<string, unknown>>): unknown => (!settings['filterEnableLimit'] ? undefined : settings['filterSkip'] || 0);

/** :661-683 `filterOps` — the operators the Op dropdown offers for each filter Type. A play accepts all nine, whatever the Type. */
const FILTER_OPS: Readonly<Record<string, readonly string[]>> = {
  string: ['eq', 'neq', 'regex', 'in', 'nin'],
  boolean: ['eq', 'neq'],
  number: ['eq', 'neq', 'lt', 'gt', 'gte', 'lte', 'in', 'nin']
};

/** :661-683 — the words the Op dropdown shows. */
const FILTER_OP_LABELS: Readonly<Record<string, string>> = {
  eq: 'Equals',
  neq: 'Not Equals',
  regex: 'Matches RegEx',
  lt: 'Less than',
  gt: 'Greater than',
  gte: 'Greater than or equal',
  lte: 'Less than or equal',
  in: 'Is one of',
  nin: 'Is not one of'
};

/** :582-739 updatePorts — the port a settings name is drawn as. */
function settingPort(name: string): ValueInputDecl {
  const group = (f: string) => f + ' filter';
  if (name === 'filterEnableLimit') return { type: 'boolean', coerce: 'none', displayName: 'Use limit', group: 'Limit', examples: [true, false] };
  if (name === 'filterLimit') return { type: 'number', coerce: 'none', displayName: 'Limit', group: 'Limit', examples: [1, 2, 0, '2'] };
  if (name === 'filterSkip') return { type: 'number', coerce: 'none', displayName: 'Skip', group: 'Limit', examples: [1, 0, '1'] };
  if (name === 'filterFilter') return { type: 'stringlist', coerce: 'none', editOnly: true, displayName: 'Filter', group: 'Filter', examples: ['a', 'a,b', 'name', 'owner', 'a,name'] };
  if (name === 'filterSort') return { type: 'stringlist', coerce: 'none', editOnly: true, displayName: 'Sort', group: 'Sort', examples: ['a', 'b,a', 'name'] };
  let m: RegExpMatchArray | null;
  if ((m = /^filterFilterType-(.*)$/.exec(name))) return { type: 'enum', enums: ['string', 'number', 'boolean'], labels: { string: 'String', number: 'Number', boolean: 'Boolean' }, default: 'string', coerce: 'none', displayName: 'Type', group: group(m[1]) };
  if ((m = /^filterFilterOp-(.*)$/.exec(name))) return { type: 'enum', enums: ['eq', 'neq', 'regex', 'lt', 'gt', 'gte', 'lte', 'in', 'nin'], labels: FILTER_OP_LABELS, default: 'eq', coerce: 'none', displayName: 'Op', group: group(m[1]), examples: ['in', 'nin', 'in', 'nin', 'eq', 'regex'] };
  if ((m = /^filterFilterOption-case-(.*)$/.exec(name))) return { type: 'boolean', default: false, coerce: 'none', displayName: 'Case sensitive', group: group(m[1]) };
  if ((m = /^filterFilterValue-(.*)$/.exec(name))) return { type: '*', coerce: 'none', displayName: 'Value', group: group(m[1]), examples: [1, 'x', '2', 'a.*', '[', true, 'Ada', ...LISTS, ...LISTS, ...LISTS] };
  if ((m = /^filterSort-(.*)$/.exec(name))) return { type: 'enum', enums: ['ascending', 'descending'], labels: { ascending: 'Ascending', descending: 'Descending' }, default: 'ascending', coerce: 'none', displayName: 'Sort', group: m[1] + ' sort' };
  return { type: '*', coerce: 'none' };
}

/** s35 — what an `Is one of` can be handed: typed lists (one with an empty piece), plain arrays, wired arrays of records */
const LISTS: readonly unknown[] = ['1, 3', 'Ada, x', ' 2 ,', 'u1, u3', [1, '3'], ['Ada', 'Lin'], { $array: 'owners' }, { $array: 'rows' }];

/**
 * s35 — the records a generated run filters: `a` a number (one a string, one absent), `name` with a case twin, `owner`
 * the id of one of `owners` (so a wired array of records is a list of ids), and an empty registry.
 */
const ROWS: Readonly<Record<string, Record<string, unknown>>> = {
  r1: { a: 1, name: 'Ada', owner: 'u1' },
  r2: { a: 2, name: 'Lin', owner: 'u2' },
  r3: { a: 3, name: 'ada', owner: 'u3' },
  r4: { a: '3', name: 'x' },
  r6: { a: 0, name: '' },
  r5: { name: 'Lin', owner: 'u1' },
  u1: { name: 'Ada' },
  u2: { name: 'Lin' }
};
const REGISTRIES: readonly RegistryScript[] = [
  { models: ROWS, collections: { rows: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'], owners: ['u1', 'u2'] } },
  { models: ROWS, collections: { rows: ['r3', 'r1', 'r5'], owners: ['u2'] } },
  {}
];

export type FilterState = {
  /** `_internal.collection` — an array of this registry, a plain array, or whatever else arrived */
  source: unknown;
  /** `_internal.filteredCollection`, by name */
  filteredId: string | undefined;
  enabled: unknown;
  settings: Readonly<Record<string, unknown>>;
  lastError: string | undefined;
  lastReported: string | undefined;
  /** `pendingFilterOutcomes` — one per press, the port each came in on (:430-438) */
  tokens: ReadonlyArray<'filter' | 'refresh'>;
  scheduled: boolean;
  /** the `Filter settings` checkbox, mirrored for the derived reducer */
  runOnSettings: boolean;
};

type Outcomes = Array<{ port: 'filter' | 'refresh'; outcome: 'done' | 'failure'; error?: string }>;

export const FilterCollection = defineNode({
  type: 'Filter Collection',
  // v2 (NSP-012 s35, read from P109's `2c38d43a4`): two operators, `in` ("Is one of") and `nin` ("Is not one of") —
  // the value is a list (a wired array's records by id, typed text split on commas, else a list of one), members
  // compared loosely like `eq`; `nin` keeps a row without the property, like `neq`, and `in` drops it. v1 had no such
  // operators: an Op of `in` tested only that the property was present.
  // v3 (s36, row C59 ruled "fix both" by Richard 2026-10-03): the filter tests a RECORD's data and any other row as it
  // is — the sort's rule (:95-97). A plain array of plain objects (what a Function outputs) now filters; v2 failed every
  // filtered run on it with `array-filter/filter-failed` ("Cannot read properties of undefined"). A `null` row still fails.
  // v4 (P109 ISL-026, P107-C10 ruled "Refuse it with a Failure"): a value on Items that is not a list — a number, `true`, a plain
  // object, a record — fails the run with `array-filter/not-a-list` and produces no items; v3 filtered it as a list of one
  // (the runtime threw in the setter).
  version: 4,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/filtercollectionnode.ts',
  needs: ['registry', 'random'],
  worldPool: { registries: REGISTRIES },

  // :120-150, :180-201 — `enabled` is established by `initialize` (:198), the declared default never runs a setter
  state: { source: undefined, filteredId: undefined, enabled: true, settings: {}, lastError: undefined, lastReported: undefined, tokens: [], scheduled: false, runOnSettings: true } as FilterState,
  outcomes: ['done', 'failure'], // :336-341

  inputs: {
    // :221-231
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'Array to filter; the node re-runs whenever this array changes, unless you untick it under Run On Value Change',
      // s35 — mostly a registry array: while a plain array was the only example no generated run ever applied a filter
      // (v2 failed every one on it, row C59); v3 filters both
      examples: [...Array(10).fill({ $array: 'rows' }), { $array: 'owners' }, [{ a: 1, name: 'Ada' }, { a: 2, name: 'Lin' }, { a: 3, name: 'ada' }], []]
    },
    // :232-244
    enabled: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Enabled',
      group: 'General',
      description: 'When false the input array passes straight through — unfiltered, unsorted and unlimited'
    },
    // :245-254
    filter: {
      type: 'signal',
      outcome: true,
      displayName: 'Filter',
      group: 'Actions',
      description:
        'Runs the filter now and replaces Items with the result. This is additional to it re-running when Items, Enabled, the filter settings or the array contents change; untick any of those under Run On Value Change to stop it'
    },
    // :259-267
    refresh: {
      type: 'signal',
      outcome: true,
      displayName: 'Refresh',
      group: 'Actions',
      description: 'Runs the filter now — the same action as Filter, under the name the rest of the Array family uses'
    },
    // :172-179
    'runOnChange-items': runOnChange('Items'),
    'runOnChange-enabled': runOnChange('Enabled'),
    'runOnChange-array': runOnChange('Array contents'),
    'runOnChange-filterSettings': runOnChange('Filter settings')
  },

  outputs: {
    // :270-278
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'A new array holding the records that passed, in sort order; the input array is never modified',
      from: (s, w) => (s.filteredId !== undefined ? w.registry.collection(s.filteredId) : undefined)
    },
    // :279-290
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
    // :301-309
    count: { type: 'number', displayName: 'Count', group: 'General', description: 'How many records passed the filter, after Skip and Limit have been applied', from: (s, w) => (s.filteredId !== undefined ? w.registry.collection(s.filteredId).size() : 0) },
    // :323-330
    modified: {
      type: 'signal',
      displayName: 'Filtered',
      group: 'Events',
      description: 'Fires once the filter has run and Items is up to date, whether an author asked for the run or an input changed; wire Done instead for the outcome of a Filter you triggered'
    },
    // :342-350
    error: errorOutput('Why the last run failed, in one sentence; empty until something fails', (s: { lastError: unknown }) => s.lastError)
  }
}).on(
  {
    // :227-230 → bindCollection :359-363
    items: (s, v, i, w) => {
      if (w.registry.isCollection(s.source)) w.unwatch({ collection: s.source.getId() }); // :360
      if (w.registry.isCollection(v)) w.watch({ collection: v.getId() }); // :362
      return { says: "always: kept, and watched when it is a shared array; ticked under Run On Value Change, the filter runs at the frame's end", set: { source: v, scheduled: s.scheduled || i['runOnChange-items'] }, send: [] }; // :229
    },
    // :238-243
    enabled: (s, v, i) => ({ says: "always: kept; a change, ticked under Run On Value Change, runs the filter at the frame's end — off, the array passes through unfiltered, unsorted and unlimited", set: { enabled: v, scheduled: s.scheduled || (valueDidChange(s.enabled, v) && i['runOnChange-enabled']) }, send: [] }),
    // :251-253, :264-266 → requestFilter :430-438
    filter: (s) => ({ says: "always: the filter runs at the frame's end, one run for the frame's presses — Items, First Item Id and Count are sent, Filtered fires, then each press's Done or Failure", set: { tokens: [...s.tokens, 'filter'], scheduled: true }, outcome: 'deferred', send: [] }),
    refresh: (s) => ({ says: 'always: the same as Filter', set: { tokens: [...s.tokens, 'refresh'], scheduled: true }, outcome: 'deferred', send: [] }),
    'runOnChange-items': () => ({ says: 'always: read when the next Items arrives', send: [] }),
    'runOnChange-enabled': () => ({ says: 'always: read when Enabled next changes', send: [] }),
    'runOnChange-array': () => ({ says: "always: read when the bound array's contents next change", send: [] }),
    'runOnChange-filterSettings': (_s, v) => ({ says: 'always: kept; read when a filter setting next changes', set: { runOnSettings: v }, send: [] })
  },
  {
    derived: {
      // :582-739
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
        // :704-713 — `Is one of` / `Is not one of` take a list, so the value port is `Values`, typed `*`; any other Op's value port
        // is typed by the filter's Type, `string` when unset (NSP-020 s80, oracle (a): it was `*` for every Op)
        // :661-683, :708-717 — the Op dropdown offers the operators of the filter's Type, `string` when unset (P107 s101: oracle (a)
        // grades a derived port's enums since R37 drew cloud nodes from their specs; it offered all nine for every Type)
        if (params.filterFilter)
          for (const f of String(params.filterFilter).split(','))
            out['filterFilterOp-' + f] = { ...out['filterFilterOp-' + f], enums: FILTER_OPS[(params['filterFilterType-' + f] as string) || 'string'] ?? FILTER_OPS.string };
        if (params.filterFilter)
          for (const f of String(params.filterFilter).split(','))
            if (params['filterFilterOp-' + f] === 'in' || params['filterFilterOp-' + f] === 'nin') out['filterFilterValue-' + f] = { ...out['filterFilterValue-' + f], displayName: 'Values' };
            else out['filterFilterValue-' + f] = { ...out['filterFilterValue-' + f], type: ((params['filterFilterType-' + f] as string) || 'string') as ValueInputDecl['type'] };
        // :616-633 — Limit and Skip are drawn with the defaults `getLimit` / `getSkip` (:401-412) read for an unset one
        if (params.filterEnableLimit) {
          out.filterLimit = { ...out.filterLimit, default: 10 };
          out.filterSkip = { ...out.filterSkip, default: 0 };
        }
        return out;
      },
      // :563-571 — any name at all, on first write
      discover: settingPort,
      candidates: ['filterEnableLimit', 'filterLimit', 'filterSkip', 'filterFilter', 'filterSort', 'filterFilterOp-a', 'filterFilterValue-a', 'filterFilterValue-name', 'filterFilterOption-case-a', 'filterSort-a', 'filterSort-name'],
      // :575-580 userInputSetter
      on: (s, port, v) => {
        const previous = s.settings[port];
        const settings = { ...s.settings, [port]: v };
        return { set: { settings, scheduled: s.scheduled || (valueDidChange(previous, v) && s.runOnSettings) }, send: [] };
      }
    },
    // :476-556 — the run. Three paths leave nothing on the wire — no run due, a run with no array
    // and no press (:485-499), a failure already announced (:453-454) — and return ONE shape, so
    // a suite that cannot tell them apart is not asked to.
    afterInputs: (s, _i, w) => {
      const idle = { set: { scheduled: false }, send: [] as Array<'error'> };
      if (!s.scheduled) return idle;
      const tokens = s.tokens;
      const requested = tokens.length > 0;
      const fail = (code: string, message: string): ReturnType<typeof afterRun> => {
        // :439-471 reportFailure
        const repeat = s.lastReported === message;
        if (requested) {
          const outcomes: Outcomes = tokens.map((port) => ({ port, outcome: 'failure', error: code }));
          return { set: { scheduled: false, tokens: [], lastError: message, lastReported: message }, send: ['error'], outcomes };
        }
        if (repeat) return { ...idle, send: ['error'] }; // :453-454 — Error re-sent, nothing raised, nothing pulsed
        return { set: { scheduled: false, lastError: message, lastReported: message }, send: ['error'], emit: ['failure'] }; // :468-470 — a plain pulse, no invocation
      };
      const refused = notAList(s.source, (v) => w.registry.isCollection(v)); // v4 — C10
      if (refused !== undefined) return fail('array-filter/not-a-list', refused);
      if (!s.source) {
        if (requested) return fail('array-filter/no-items', 'Nothing to filter — no array is connected to the Items input'); // :490-497
        return idle; // :485-499 silent
      }
      // :502 — a copy of the array's items (a plain array's `items` is itself, collection.ts :455-466)
      let filtered: unknown[] = ([] as unknown[]).concat(w.registry.isCollection(s.source) ? s.source.items : (s.source as unknown[]));
      if (s.enabled) {
        const filter = getFilter(s.settings);
        const sort = getSort(s.settings);
        try {
          if (filter) filtered = filtered.filter((m) => applyFilter((w.registry.isRecord(m) ? m.data : m) as Record<string, unknown>, filter, w.registry.isRecord, w.registry.isCollection)); // :508 — v3, C59: a record's data, any other row as it is
          if (sort) filtered.sort(sorter.bind(sort, w.registry.isRecord)); // :509
        } catch (e) {
          return fail('array-filter/filter-failed', 'The filter could not be applied: ' + ((e as Error).message || String(e))); // :526-532
        }
        const skip = getSkip(s.settings) as number;
        if (skip) filtered = filtered.slice(skip, filtered.length); // :535-536
        const limit = getLimit(s.settings) as number;
        if (limit) filtered = filtered.slice(0, limit); // :538-539
      }
      const collection = w.registry.collectionCreate(filtered); // :546 — a new anonymous array
      return afterRun(collection.getId(), tokens);
    },
    world: {
      // :181-185 — the bound array changed
      change: (s, i, e: ChangeEvent, w) =>
        e.kind === 'collection' && w.registry.isCollection(s.source) && e.id === s.source.getId() && i['runOnChange-array'] ? { set: { scheduled: true }, send: [] } : { send: [] }
    }
  }
);

/** :544-555 — the successful run's patch: values, the announcement, the outcomes. */
function afterRun(filteredId: string, tokens: ReadonlyArray<'filter' | 'refresh'>): { set: Partial<FilterState>; send: Array<'items' | 'firstItemId' | 'count' | 'error'>; emit?: Array<'modified' | 'failure'>; outcomes?: Outcomes } {
  const outcomes: Outcomes = tokens.map((port) => ({ port, outcome: 'done' }));
  return { set: { scheduled: false, tokens: [], lastReported: undefined, filteredId }, send: ['firstItemId', 'items', 'count'], emit: ['modified'], outcomes };
}
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
