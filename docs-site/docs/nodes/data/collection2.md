---
title: "Array"
---
Array: binds to a shared client-side array by id — read its items and count, seed its contents, and react to changes made anywhere.

Client-side arrays live in a global registry keyed by id: every node that names the same id — this node, Insert/Remove/Clear Array nodes, other components — reads and mutates the same underlying array. Collection2 binds to the array named on `collectionId` (Id) and exposes it on `items` (the live array), plus `count`, `firstItemId` and `id`. Whenever the array's contents change — from any node or code, anywhere in the app — `changed` fires and `count`/`firstItemId` update. Connecting an array to the `items` input copies that source array's contents into this array, and keeps re-copying while the source changes. If `fetch` (signal) is connected the node defers: a new `collectionId` only takes effect when `fetch` fires (then `fetched` fires), and automatic `changed` events are suppressed.

## When to use it

Local list state shared across components without any wiring between them: give every interested node the same Array Id. For server data use DbCollection2 (Query Records); for a single object use Model2 (Object); to mutate the array use Insert/Remove/Clear Array nodes rather than manipulating `items` in code.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Collection2` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `collectionId` | String (CollectionName id) | — | Id of the shared array to bind to; the first node to use an id creates the array, and every later node naming it reaches the same one |
| `items` | Array | — | undefined leaves this Array's current collection alone (no opinion supplied). null clears it — every item is removed and Changed fires once, the same as connecting an empty collection. |
| `runOnChange-array` | Boolean | `true` | Whether a new value on Array contents re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `runOnChange-collectionId` | Boolean | `true` | Whether a new value on Id re-runs this node. On by default; untick to make this input passive so only the control signal runs it |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `fetch` | Signal | — | Re-reads the array named by Id and rebinds this node to it. This is additional to Id rebinding on change and to array changes being announced; untick either under Run On Value Change to stop it |

### What each input does

**Id** (`collectionId`)

- a new Id, ticked under Run On Value Change: bound to the array it names now (made if none has it); Id, Items, First Item Id and Count follow
- otherwise (the same Id, or unticked): Id is sent and the binding stays

**Items** (`items`)

- empty: nothing
- the bound array itself: nothing
- otherwise: at the frame's end its items are copied into the bound array (a new one when none is bound and Id is ticked under Run On Value Change), and the node follows that list as it changes; Changed fires when the copy moved anything and Array contents is ticked

**Fetch** (`fetch`)

- always: at the frame's end the node rebinds to the array its Id names, one rebind for the frame's presses; Fetched fires, and each press is answered Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `count` | Number | — | How many objects the bound array holds |
| `firstItemId` | String | — | Id of the first object in the array, or empty while the array holds nothing |
| `id` | String | — | Id of the array this node is currently bound to |
| `items` | Array | — | The bound array itself, for a Repeater or another Array node to read |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires when the bound array gains or loses items; with Array contents unticked it stays silent and only Fetch updates the node |
| `completed` | Signal | — | Fires after every invocation. This node has no other outcome — no Unchanged and no Failure — so it always fires together with Done, and wiring either one does the same thing. It is here on every action so that reaching for it is never a per-node decision |
| `done` | Signal | — | Fires when a Fetch finished and the outputs are up to date |
| `fetched` | Signal | — | Fires once Fetch has rebound this node and the outputs are up to date |

## Patterns

- Same `collectionId` in many components: a list page shows the array while a form elsewhere inserts into it — no connections needed between them.
- `items` → For Each `items`: the canonical local list.
- Feed `collectionId` from Create New Array `id` to bind to a dynamically created array.

## Watch out for

- Using it for cloud data — it is purely client-side, nothing is persisted; use DbCollection2 (Query Records) instead.

## Examples

**Named shared array with insert, remove and clear**

A client-side list without a backend: an Array node (Collection2) binds to the named shared array 'todos' and feeds a Repeater. Add Item (CollectionInsert), Remove Item (CollectionRemove) and Clear (CollectionClear) mutate the same array by its `collectionId`; every node bound to that id — including the Array feeding the list — sees the change immediately. Ids on wires tie the writers to the store. Remove is the row’s to raise: `/Todo Row` publishes a `remove` signal on its `Component Outputs`, and the Repeater re-publishes it as `itemOutputSignal-remove` while setting `itemActionItemId` to the row that fired — the trigger and the id both leave the Repeater, so they always describe the same row.

**Run Tasks: batch-process an array with a worker component**

Run Tasks executes its `taskTemplate` component once per element of `items`, up to `maxRunningTasks` at a time, and fires `completed` when the whole batch has finished, whatever the outcome — `done` is the narrower signal that the run finished having done its work. The worker is a plain component: it receives the item's properties through Component Inputs and reports completion through Component Outputs signals (success/failure), which Run Tasks consumes to schedule the next task. Here a fresh array is assembled with New Array and processed on click.

## Related nodes

[Create New Array](./collection-new.md), [Insert Object Into Array](./collection-insert.md), [Remove Object From Array](./collection-remove.md), [Clear Array](./collection-clear.md), [Array Filter](./filter-collection.md), [Array Map](./map-collection.md), [Repeater](../visual/for-each.md), [Object](./model2.md), [Query Records](../cloud-services/db-collection2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)
- random numbers (`random`)

### Starting state

```json
{
  "jobs": [],
  "fetches": 0,
  "fetchScheduled": false,
  "copyScheduled": false,
  "changeScheduled": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Items (`items`) | `array-literal` | text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]` |
| Id (`runOnChange-collectionId`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |
| Array contents (`runOnChange-array`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Fetch is triggered, the node reports exactly one of **Done**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/array.ts"
/**
 * Array (catalog type `Collection2`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode2.ts` on 2026-10-01 (NSP-012),
 * with run-on-value-change.ts and collection.ts beside it.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: an Array node is a WINDOW onto one shared array. `Id` names it
 * (:114-136): when the id changed and the `Id` checkbox is on (`shouldRunOnValueChanged`, DEF-046),
 * the node binds to the array of that name — `Collection.get(id)`, create-on-read, and an
 * `undefined` id binds a fresh ANONYMOUS array (a guid draw, collection.ts :790-795) — and sends
 * `Id`, `Items`, `First Item Id` and `Count` at once (:264-276); otherwise only `Id` is re-sent
 * (:133). `Items` COPIES another array into the bound one at the frame end (:137-157, :277-326 —
 * `undefined` abstains, the bound array itself is ignored, anything else is diffed INTO the
 * bound array in place with `set`, `null` emptying it); a node not yet bound binds an anonymous
 * array first when the `Id` checkbox is on (:319-320). `Fetch` rebinds by the current id at the
 * frame end — one rebind for any number of presses, one `done` PER press (:293-315), `Fetched`
 * before the outcomes.
 *
 * What the wire shows and what it does not: the bound array's CHANGES (its own `change`, from
 * this node's copy or from any other node that holds it) are announced at the frame end — ONE
 * `Changed` per frame however many changes, with `First Item Id` and `Count` re-sent (:70-86) —
 * but `Items` is NOT re-sent: downstream holds the same live array and sees the mutation through
 * its own subscription, so on the wire `Items` keeps the snapshot of its last send while `Count`
 * moves (NSP-012 AC6: mutated in place, not replaced). Changes of the SOURCE array copy again
 * at the frame end, once per frame (:92-94, :327-335). The `Array contents` checkbox silences
 * the announcement (:73).
 *
 * Frame-end work runs in SCHEDULING order (nodecontext.ts `updateDirtyNodes`): each `Items`
 * write queues its own copy (:154-156, uncoalesced), `Fetch` and the source copy and the
 * announcement each queue once (:302-303, :328-329, :77-78), and work a job's own writes
 * schedule runs in the next pass of the same frame (the `jobs` list below, and the interpreter's
 * repeated `afterInputs`).
 */

import type { ChangeEvent, Outcome, WorldView } from '../spec';
import { defineNode } from '../spec';
import { valueDidChange } from './condition';
import { runOnChange } from './data-base';

/** One `scheduleAfterInputsHaveUpdated` callback, in the order scheduled (:154, :305, :331, :80). */
type Job = { job: 'source'; value: unknown } | { job: 'fetch' } | { job: 'copy' } | { job: 'changed' };

export type ArrayState = {
  /** `_internal.collectionId` — the id as last sent (an array handed in becomes its id, :126) */
  collectionId: unknown;
  /** `_internal.collection`, by its raw name (`undefined` = none bound) */
  bound: unknown;
  /** `_internal.sourceCollection` — an array of this registry, a plain array, `null`, or nothing yet */
  source: unknown;
  jobs: readonly Job[];
  /** `_internal.pendingFetch` tokens */
  fetches: number;
  fetchScheduled: boolean; // hasScheduledSetCollection
  copyScheduled: boolean; // hasScheduledCopyItems
  changeScheduled: boolean; // collectionChangedScheduled (:69)
};

type Checkboxes = { readonly 'runOnChange-collectionId': boolean; readonly 'runOnChange-array': boolean };

/** :264-276 `setCollection` — swap the subscription, send the four values AT THE FLAG (a copy may follow in the same pass). */
function bind(st: ArrayState, w: WorldView, name: unknown): void {
  const collection = w.registry.collection(name);
  if (st.bound !== undefined) w.unwatch({ collection: st.bound }); // :265-267
  st.bound = collection.getId();
  w.send('id', st); // :270
  w.watch({ collection: st.bound }); // :271
  w.send('items', st); // :273
  w.send('firstItemId', st); // :274
  w.send('count', st); // :275
}

/** :70-86 `collectionChangedCallback` — the bound array changed: announce once per frame, at the frame end. */
function onBoundChanged(st: ArrayState, i: Checkboxes): void {
  if (!i['runOnChange-array']) return; // :73
  if (st.changeScheduled) return; // :77
  st.changeScheduled = true; // :78
  st.jobs = [...st.jobs, { job: 'changed' }]; // :80
}

/** :316-326 `_copySourceItems` — a copy that moved anything is this node's own write to the array it watches (:291 → :70). */
function copySourceItems(st: ArrayState, i: Checkboxes, w: WorldView): void {
  if (st.bound === undefined && i['runOnChange-collectionId']) bind(st, w, undefined); // :319-320 — anonymous
  if (st.bound !== undefined && w.registry.collection(st.bound).set(st.source)) onBoundChanged(st, i); // :325 — `null` empties (collection.ts :490)
}

export const Collection2 = defineNode({
  type: 'Collection2',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode2.ts',
  needs: ['registry', 'random'],

  state: { collectionId: undefined, bound: undefined, source: undefined, jobs: [], fetches: 0, fetchScheduled: false, copyScheduled: false, changeScheduled: false } as ArrayState,
  outcomes: ['done'], // :237-239 — no Failure, no Unchanged

  inputs: {
    // :114-136
    collectionId: {
      type: 'string',
      coerce: 'none',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the shared array to bind to; the first node to use an id creates the array, and every later node naming it reaches the same one',
      examples: ['abc', 'def', 'empty']
    },
    // :137-158 — a string literal is evaluated by the port's array typecast (node.ts setInputValue)
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description:
        "undefined leaves this Array's current collection alone (no opinion supplied). null clears it — every item is removed and Changed fires once, the same as connecting an empty collection."
    },
    // :159-167
    fetch: {
      type: 'signal',
      outcome: true,
      displayName: 'Fetch',
      group: 'Actions',
      description:
        'Re-reads the array named by Id and rebinds this node to it. This is additional to Id rebinding on change and to array changes being announced; untick either under Run On Value Change to stop it'
    },
    // :63-67 runOnValueChange: inputs ['collectionId'], sources [array]
    'runOnChange-collectionId': runOnChange('Id'),
    'runOnChange-array': runOnChange('Array contents')
  },

  outputs: {
    // :170-178
    id: { type: 'string', displayName: 'Id', group: 'General', description: 'Id of the array this node is currently bound to', from: (s) => (s.bound !== undefined ? s.bound : s.collectionId) },
    // :179-187 — the array itself
    items: {
      type: 'array',
      displayName: 'Items',
      group: 'General',
      description: 'The bound array itself, for a Repeater or another Array node to read',
      from: (s, w) => (s.bound !== undefined ? w.registry.collection(s.bound) : undefined)
    },
    // :188-199
    firstItemId: {
      type: 'string',
      displayName: 'First Item Id',
      group: 'General',
      description: 'Id of the first object in the array, or empty while the array holds nothing',
      from: (s, w) => {
        if (s.bound === undefined) return undefined;
        const first = w.registry.collection(s.bound).get(0);
        return first !== undefined ? first.getId() : undefined;
      }
    },
    // :200-208
    count: { type: 'number', displayName: 'Count', group: 'General', description: 'How many objects the bound array holds', from: (s, w) => (s.bound !== undefined ? w.registry.collection(s.bound).size() : 0) },
    // :209-214
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the bound array gains or loses items; with Array contents unticked it stays silent and only Fetch updates the node' },
    // :215-220
    fetched: { type: 'signal', displayName: 'Fetched', group: 'Events', description: 'Fires once Fetch has rebound this node and the outputs are up to date' }
  }
}).on(
  {
    // :125-135
    collectionId: (s, value, i, w) => {
      const v = w.registry.isCollection(value) ? value.getId() : value; // :126
      const previous = s.collectionId; // :129
      if (valueDidChange(previous, v) && i['runOnChange-collectionId']) {
        // :131 → setCollectionID → setCollection(Collection.get(v)); `id` reads the bound name, so
        // it is sent after the patch (nothing else moves in between)
        const st = { ...s, collectionId: v };
        bind(st, w, v);
        return { says: 'a new Id, ticked under Run On Value Change: bound to the array it names now (made if none has it); Id, Items, First Item Id and Count follow', set: { collectionId: v, bound: st.bound }, send: [] };
      }
      return { says: 'otherwise (the same Id, or unticked): Id is sent and the binding stays', set: { collectionId: v }, send: ['id'] }; // :133
    },
    // :145-157
    items: (s, v, _i, w) => {
      if (v === undefined) return { says: 'empty: nothing', send: [] }; // :150 — abstains
      if (s.bound !== undefined && w.registry.isCollection(v) && v.getId() === s.bound) return { says: 'the bound array itself: nothing', send: [] }; // :151 — the bound array itself
      return { says: 'otherwise: at the frame\'s end its items are copied into the bound array (a new one when none is bound and Id is ticked under Run On Value Change), and the node follows that list as it changes; Changed fires when the copy moved anything and Array contents is ticked', set: { jobs: [...s.jobs, { job: 'source', value: v }] }, send: [] }; // :153-156
    },
    // :293-303 — a token per press, one rebind per frame
    fetch: (s) => ({
      says: 'always: at the frame\'s end the node rebinds to the array its Id names, one rebind for the frame\'s presses; Fetched fires, and each press is answered Done',
      set: { fetches: s.fetches + 1, fetchScheduled: true, jobs: s.fetchScheduled ? s.jobs : [...s.jobs, { job: 'fetch' }] },
      outcome: 'deferred',
      send: []
    })
  },
  {
    // the frame's scheduled callbacks in order, pass after pass until none is queued — the
    // scheduler's loop (nodecontext.ts :453-490): a job's own write queues the announcement for
    // the next pass of the same frame
    afterInputs: (s, i, w) => {
      if (s.jobs.length === 0) return { send: [] };
      const st: ArrayState = { ...s };
      const emit: Array<'changed' | 'fetched'> = [];
      const outcomes: Array<{ port: 'fetch'; outcome: Outcome }> = [];
      for (let pass = 0; pass < 10 && st.jobs.length > 0; pass++) {
        const jobs = st.jobs;
        st.jobs = [];
        for (const job of jobs) {
        switch (job.job) {
          case 'source': {
            // :277-292 setSourceCollection(value), then _copySourceItems
            if (w.registry.isCollection(st.source)) w.unwatch({ collection: st.source.getId() }); // :280-282
            st.source = job.value;
            if (w.registry.isCollection(job.value)) w.watch({ collection: job.value.getId() }); // :288-289
            copySourceItems(st, i, w); // :291
            break;
          }
          case 'copy': {
            st.copyScheduled = false; // :332
            copySourceItems(st, i, w); // :333
            break;
          }
          case 'fetch': {
            st.fetchScheduled = false; // :306
            const n = st.fetches; // :307-308
            st.fetches = 0;
            bind(st, w, st.collectionId); // :310 setCollectionID(collectionId)
            emit.push('fetched'); // :312
            for (let k = 0; k < n; k++) outcomes.push({ port: 'fetch', outcome: 'done' }); // :313
            break;
          }
          case 'changed': {
            emit.push('changed'); // :81
            w.send('firstItemId', st); // :82
            w.send('count', st); // :83
            st.changeScheduled = false; // :84
            break;
          }
        }
        }
      }
      const set = { bound: st.bound, source: st.source, jobs: st.jobs, fetches: st.fetches, fetchScheduled: st.fetchScheduled, copyScheduled: st.copyScheduled, changeScheduled: st.changeScheduled };
      return { set, send: [], emit, outcomes };
    },
    world: {
      // ANOTHER node wrote the bound array (:70-86) and / or the source array (:92-94)
      change: (s, i, e: ChangeEvent, w) => {
        const st: ArrayState = { ...s };
        if (e.kind === 'collection' && e.id === s.bound) onBoundChanged(st, i);
        const sourceId = w.registry.isCollection(s.source) ? s.source.getId() : undefined;
        if (e.kind === 'collection' && e.id === sourceId && !st.copyScheduled) {
          st.copyScheduled = true; // :328-329
          st.jobs = [...st.jobs, { job: 'copy' }]; // :331
        }
        return { set: { jobs: st.jobs, changeScheduled: st.changeScheduled, copyScheduled: st.copyScheduled }, send: [] };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
