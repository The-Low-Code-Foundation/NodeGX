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
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when the bound array gains or loses items; suppressed while Fetch is connected' },
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
        return { set: { collectionId: v, bound: st.bound }, send: [] };
      }
      return { set: { collectionId: v }, send: ['id'] }; // :133
    },
    // :145-157
    items: (s, v, _i, w) => {
      if (v === undefined) return { send: [] }; // :150 — abstains
      if (s.bound !== undefined && w.registry.isCollection(v) && v.getId() === s.bound) return { send: [] }; // :151 — the bound array itself
      return { set: { jobs: [...s.jobs, { job: 'source', value: v }] }, send: [] }; // :153-156
    },
    // :293-303 — a token per press, one rebind per frame
    fetch: (s) => ({
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
