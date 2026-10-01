/**
 * Object (catalog type `Model2`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/modelnode2.ts` on 2026-10-01 (NSP-012), with
 * foreachitem.ts, run-on-value-change.ts and model.ts beside it.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: an Object node is a WINDOW onto one shared record. `Id` names
 * it (:240-273): a record handed in becomes its id, a PLAIN OBJECT handed in is turned into a
 * record first — named by its `id` field, anonymous (a guid draw) without one, every other field
 * written (:251-260, model.ts `create`); when the id CHANGED and the `Id` checkbox is on
 * (`shouldRunOnValueChanged`, DEF-046) the node binds: an EMPTY id (`undefined`, `null`, `''`)
 * binds nothing (:394-398 — `Id` and `Object` re-sent, `Object` as `null`), any other reaches
 * the record of that name, create-on-read (:400), sends `Id`, `Object` and every property output
 * the record already holds (:404-443), and pulses `Fetched` (:402); otherwise only `Id` is re-sent
 * (:270). `Get Id from` = `From repeater` binds the enclosing Repeater's item at the frame end
 * (:215-218, :302-306); a node that is not inside one binds NOTHING and says so on the error
 * channel (foreachitem.ts :124-136) — the lone-node case this spec covers.
 *
 * PROPERTIES: `Properties` names them; each gets an input, an output and a `<p> Changed` signal
 * (:492-533). A value arriving on `prop-<p>` is held (:479-490) and WRITTEN onto the record at the
 * frame end, once per frame, every held key that differs from what the record holds (:307-332,
 * `model.set(key, value, { resolve: true })` — a dotted key writes into a nested record); with no
 * record bound the values are kept and written the moment one is (:425-441, :325). Every write
 * of a key on the record — by this node or by any other holder — notifies this node (:107-116):
 * when the `Object properties` checkbox is on, `prop-<key>` is re-sent and `<key> Changed` pulses
 * if the key is one of this node's properties, and `Changed` pulses for any key. `Fetch` rebinds
 * by the current id at the frame end — one rebind for any number of presses, one outcome per
 * press: `failure` with `object/fetch-failed` when the id is empty (:361-368), else `done` after
 * `Fetched` (:370-372).
 */

import type { ChangeEvent, OutputDecl, ValueInputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import { valueDidChange } from './condition';
import { emptyId, propertyNames, runOnChange } from './data-base';

/** :33 */
export const OBJECT_FETCH_ERROR_CODE = 'object/fetch-failed';

/** One `scheduleAfterInputsHaveUpdated` callback, in scheduling order (:303, :312, :356). */
type Job = 'bind' | 'store' | 'fetch';

export type ObjectState = {
  /** `_internal.modelId` as last sent (dereferenced to an id, :251-260) */
  modelId: unknown;
  /** `_internal.model`, by its raw id (`undefined` = none bound) */
  bound: unknown;
  idSource: unknown;
  repeaterComponent: unknown;
  /** the property names the mount parameters list — what `hasOutput('prop-…')` answers for */
  properties: readonly string[];
  inputValues: Readonly<Record<string, unknown>>;
  dirty: Readonly<Record<string, true>>;
  jobs: readonly Job[];
  fetches: number;
  fetchScheduled: boolean; // hasScheduledSetModel
  storeScheduled: boolean; // hasScheduledStore
};

/** The property ports an editor draws for a `properties` parameter (:492-533). */
function propertyInput(p: string): ValueInputDecl {
  return {
    type: '*',
    coerce: 'none',
    displayName: p,
    group: 'Properties',
    description: 'Reads and writes the ' + p + ' property of the bound object; a value arriving before an object is bound is held and written once one is',
    examples: ['v', 1, true, { n: 1 }]
  };
}

/** :404-443 setModel — swap the subscription; send Id, Object and the property outputs the record holds; flush what arrived before it. */
function setModel(st: ObjectState, w: WorldView, id: unknown): void {
  if (st.bound !== undefined) w.unwatch({ model: st.bound }); // :405-407
  st.bound = id;
  w.send('id', st); // :410
  w.send('object', st); // :414
  if (id !== undefined) {
    const model = w.registry.model(id);
    w.watch({ model: id }); // :418
    for (const key of Object.keys(model.data)) if (st.properties.includes(key)) w.send('prop-' + key, st); // :421-423 — at the flag: a store may follow in the same frame
    if (Object.keys(st.dirty).length > 0 && !st.storeScheduled) {
      st.storeScheduled = true; // :441 scheduleStore
      st.jobs = [...st.jobs, 'store'];
    }
  }
}

/** :394-403 setModelID — an empty id binds nothing; a name reaches its record and announces Fetched. */
function setModelID(st: ObjectState, w: WorldView, id: unknown, emit: Array<'fetched' | 'changed'>): void {
  if (emptyId(id)) {
    setModel(st, w, undefined);
    return;
  }
  setModel(st, w, w.registry.model(id).getId()); // :400-401 — create-on-read
  emit.push('fetched'); // :402
}

export const Model2 = defineNode({
  type: 'Model2',
  // v2 (NSP-013 s12): a plain object on Id that names the record the node is ALREADY bound to writes its
  // fields into that record, and the node reacts to that write as to any other on its record — Changed
  // (and the property's output) for each key whose value differs. v1 wrote the fields and reacted to none.
  version: 2,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/modelnode2.ts',
  needs: ['registry', 'random'],

  // :43-62, :101-105
  state: {
    modelId: undefined,
    bound: undefined,
    idSource: undefined,
    repeaterComponent: undefined,
    properties: [],
    inputValues: {},
    dirty: {},
    jobs: [],
    fetches: 0,
    fetchScheduled: false,
    storeScheduled: false
  } as ObjectState,
  // the graph's `properties` parameter — what the editor derived the ports from (:496-498)
  init: (_w, params) => ({ properties: propertyNames(params.properties) }),
  outcomes: ['done', 'failure'], // :196-199

  inputs: {
    // :202-219
    idSource: {
      type: 'enum',
      enums: ['explicit', 'foreach'],
      default: 'explicit',
      coerce: 'none',
      editOnly: true,
      displayName: 'Get Id from',
      group: 'General',
      description: 'Where the object comes from: the Id input, or the item of the Repeater this node sits inside'
    },
    // :227-239
    repeaterComponent: {
      type: 'component',
      coerce: 'none',
      displayName: 'Repeater Component',
      group: 'General',
      description: 'Which Repeater to take the item from when several are nested; leave blank to use the nearest one, and ignored unless Get Id from is From repeater',
      examples: ['Row', '']
    },
    // :240-273
    modelId: {
      type: 'string',
      coerce: 'none',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object to bind to, which is created the first time it is named; an Object or a plain JS object may be wired here instead, and null or blank binds nothing',
      examples: ['m1', 'm2', 'm3', 'zz', { id: 'm1', a: 9 }, { b: 2 }]
    },
    // :274-280 — panel only; the ports it names are the derived ones below
    properties: {
      type: 'stringlist',
      coerce: 'none',
      editOnly: true,
      displayName: 'Properties',
      group: 'Properties',
      description: 'Names the properties to read and write; each name listed here gets an input, an output and a Changed signal',
      examples: ['a', 'a,b', 'name,count']
    },
    // :281-292
    fetch: {
      type: 'signal',
      outcome: true,
      displayName: 'Fetch',
      group: 'Actions',
      description: 'Re-reads the object named by Id now. This is additional to Id rebinding on change and to changes being announced; untick either under Run On Value Change to stop it'
    },
    // :96-100 runOnValueChange: inputs ['modelId'], sources [object]
    'runOnChange-modelId': runOnChange('Id'),
    'runOnChange-object': runOnChange('Object properties')
  },

  outputs: {
    // :128-137
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description:
        'Id of the object this node is bound to, whether that came from the Id input or from a repeater item. This names the object; the Object output carries the object itself, which is what a node that watches or reads it wants',
      from: (s) => (s.bound !== undefined ? s.bound : s.modelId)
    },
    // :162-171 — `null`, never `undefined`, while nothing is bound
    object: {
      type: 'object',
      displayName: 'Object',
      group: 'General',
      description: 'The bound object itself, for Object Changed or anything else that reads or watches the object rather than naming it; empty while nothing is bound',
      from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound) : null)
    },
    // :172-177
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires whenever any property of the bound object changes, from this node or from anywhere else' },
    // :178-183
    fetched: { type: 'signal', displayName: 'Fetched', group: 'Events', description: 'Fires once a new object has been bound and its property outputs are up to date' }
  }
}).on(
  {
    // :215-218
    idSource: (s, v) => ({ set: { idSource: v, jobs: v === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :233-238
    repeaterComponent: (s, v) => ({ set: { repeaterComponent: v || undefined, jobs: s.idSource === 'foreach' ? [...s.jobs, 'bind' as const] : s.jobs }, send: [] }),
    // :250-272
    modelId: (s, value, i, w) => {
      let v: unknown = value;
      // the bound record's own listener (:107-116) heard each key `Model.create` changed on it — written
      // here, beside the write (a node never hears its own write, registry.ts); NSP-013 s12, found by
      // generated seed 1104497702 once the daily rotation stopped replaying one corpus (T4)
      const own: { emit: Array<'fetched' | 'changed'>; emitDerived: string[] } = { emit: [], emitDerived: [] };
      if (w.registry.isRecord(v)) v = v.getId(); // :251
      else if (typeof v === 'object' && v !== null) {
        // :259-260 — `Model.create`: the record named by `id`, every other key `set` (model.ts — a `set` notifies when `!==`)
        const data = v as Record<string, unknown>;
        const bound = s.bound !== undefined ? w.registry.model(s.bound) : undefined;
        const before = bound ? Object.fromEntries(Object.keys(data).map((k) => [k, bound.get(k)])) : {};
        const created = w.registry.create(v);
        v = created.getId();
        if (bound && created.getId() === s.bound && i['runOnChange-object']) {
          for (const key of Object.keys(data)) {
            if (key === 'id' || before[key] === data[key]) continue;
            if (s.properties.includes(key)) {
              w.send('prop-' + key, s); // :111 — at the flag
              own.emitDerived.push('changed-' + key); // :113
            }
            own.emit.push('changed'); // :115
          }
        }
      }
      const previous = s.modelId; // :265
      if (valueDidChange(previous, v) && i['runOnChange-modelId']) {
        // :268 setModelID(v)
        const st: ObjectState = { ...s, modelId: v };
        const emit: Array<'fetched' | 'changed'> = [...own.emit];
        setModelID(st, w, v, emit);
        return { set: { modelId: v, bound: st.bound, jobs: st.jobs, storeScheduled: st.storeScheduled }, send: [], emit, emitDerived: own.emitDerived };
      }
      return { set: { modelId: v }, send: ['id'], emit: own.emit, emitDerived: own.emitDerived }; // :270
    },
    // :274-280 — `set: function () {}`
    properties: () => ({ send: [] }),
    // :289-291 → :349-354 — a token per press, one rebind per frame
    fetch: (s) => ({ set: { fetches: s.fetches + 1, fetchScheduled: true, jobs: s.fetchScheduled ? s.jobs : [...s.jobs, 'fetch' as const] }, outcome: 'deferred', send: [] })
  },
  {
    derived: {
      // :492-533 updatePorts — one input, one output and one Changed per property named
      inputs: (params) => Object.fromEntries(propertyNames(params.properties).map((p) => ['prop-' + p, propertyInput(p)])),
      outputs: (params) => {
        const out: Record<string, OutputDecl<ObjectState>> = {};
        for (const p of propertyNames(params.properties)) {
          out['prop-' + p] = {
            type: '*',
            displayName: p,
            group: 'Properties',
            description: 'Reads and writes the ' + p + ' property of the bound object; a value arriving before an object is bound is held and written once one is',
            // :474-477 userOutputGetter — `get(name, { resolve: true })`
            from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get(p, { resolve: true }) : undefined)
          };
          out['changed-' + p] = { type: 'signal', displayName: p + ' Changed', group: 'Events', description: 'Fires when the ' + p + ' property changes, from this node or from anywhere else' };
        }
        return out;
      },
      // :461-470 registerInputIfNeeded — any `prop-…` name, on first write
      discover: (port) => (port.startsWith('prop-') ? propertyInput(port.slice('prop-'.length)) : undefined),
      candidates: ['prop-a', 'prop-b', 'prop-zz'],
      // :479-490 userInputSetter
      on: (s, port, v, _derived, w) => {
        const name = port.slice('prop-'.length);
        const inputValues = { ...s.inputValues, [name]: v };
        const valueChanged = s.bound !== undefined ? w.registry.model(s.bound).get(name) !== v : true; // :485
        if (!valueChanged) return { set: { inputValues }, send: [] };
        const dirty = { ...s.dirty, [name]: true as const }; // :487
        if (s.storeScheduled) return { set: { inputValues, dirty }, send: [] }; // :308
        return { set: { inputValues, dirty, storeScheduled: true, jobs: [...s.jobs, 'store' as const] }, send: [] }; // :488 scheduleStore
      }
    },
    // the frame's scheduled callbacks in order, pass after pass until none is queued (nodecontext.ts
    // :453-490): a bind that flushes held values queues the store for the next pass of the same frame
    afterInputs: (s, i, w) => {
      if (s.jobs.length === 0) return { send: [] };
      const st: ObjectState = { ...s };
      const emit: Array<'fetched' | 'changed'> = [];
      const emitDerived: string[] = [];
      const outcomes: Array<{ port: 'fetch'; outcome: 'done' | 'failure'; error?: string }> = [];
      for (let pass = 0; pass < 10 && st.jobs.length > 0; pass++) {
        const jobs = st.jobs;
        st.jobs = [];
        for (const job of jobs) {
        switch (job) {
          case 'bind': // :302-306 — outside any Repeater the walk misses: nothing is bound (foreachitem.ts :124-136)
            setModel(st, w, undefined);
            break;
          case 'store': {
            // :312-331
            st.storeScheduled = false;
            if (st.bound === undefined) break; // :325 — kept, written when an object arrives
            const model = w.registry.model(st.bound);
            for (const key of Object.keys(st.dirty)) {
              const value = st.inputValues[key];
              // :327-329 — the write; a key that lands on THIS record and differs notifies this node's own
              // listener inside the write (:107-116): the announcement sits here, beside the write
              const own = key.indexOf('.') === -1 && model.get(key) !== value;
              model.set(key, value, { resolve: true });
              if (own && i['runOnChange-object']) {
                if (st.properties.includes(key)) {
                  w.send('prop-' + key, st); // :111 — at the flag
                  emitDerived.push('changed-' + key); // :113
                }
                emit.push('changed'); // :115
              }
            }
            st.dirty = {}; // :330
            break;
          }
          case 'fetch': {
            // :356-373
            st.fetchScheduled = false;
            const n = st.fetches;
            st.fetches = 0;
            if (emptyId(st.modelId)) {
              for (let k = 0; k < n; k++) outcomes.push({ port: 'fetch', outcome: 'failure', error: OBJECT_FETCH_ERROR_CODE }); // :362-367
              break;
            }
            setModelID(st, w, st.modelId, emit); // :371
            for (let k = 0; k < n; k++) outcomes.push({ port: 'fetch', outcome: 'done' }); // :372
            break;
          }
        }
        }
      }
      return {
        set: { bound: st.bound, dirty: st.dirty, jobs: st.jobs, fetches: st.fetches, fetchScheduled: st.fetchScheduled, storeScheduled: st.storeScheduled },
        send: [],
        emit,
        emitDerived,
        outcomes
      };
    },
    world: {
      // :107-116 onModelChangedCallback — the bound record, any key, written by ANOTHER node
      change: (s, i, e: ChangeEvent) => {
        if (e.kind !== 'model' || e.id !== s.bound || !i['runOnChange-object']) return { send: [] };
        const key = String(e.name);
        const own = s.properties.includes(key); // hasOutput('prop-' + name) / hasOutput('changed-' + name)
        return { sendDerived: own ? ['prop-' + key] : [], emitDerived: own ? ['changed-' + key] : [], emit: ['changed'], send: [] };
      }
    }
  }
);
