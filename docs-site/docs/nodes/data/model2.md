---
title: "Object"
---
Object: binds to one client-side object by id and exposes its properties reactively; the shared store behind repeater items and app state.

Object (Model2) is a window onto one object in the client-side object store. Bind it via `modelId` (or, per `idSource`, the enclosing repeater item) and the properties declared on the node become value outputs that update whenever anything writes the object — Set Object Properties, cloud-data nodes, scripts. `changed` fires on each such write. Objects are shared by id: every Object node with the same id sees the same data, which is how unconnected parts of a graph stay in sync.

## When to use it

Read client-side objects: repeater items, records fetched from the cloud (records are objects whose id is the record id), and structured app state. To write, pair with Set Object Properties or New Object; for lists use Array (Collection2); for scalar state use Variable.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `Model2` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `idSource` | Enum (`explicit`, `foreach`) | `explicit` | Where the object comes from: the Id input, or the item of the Repeater this node sits inside |
| `modelId` | String (ModelName id) | — | Id of the object to bind to, which is created the first time it is named; an Object or a plain JS object may be wired here instead, and null or blank binds nothing |
| `properties` | Stringlist | — | Names the properties to read and write; each name listed here gets an input, an output and a Changed signal |
| `repeaterComponent` | Component | — | Which Repeater to take the item from when several are nested; leave blank to use the nearest one, and ignored unless Get Id from is From repeater |
| `runOnChange-modelId` | Boolean | `true` | Whether a new value on Id re-runs this node. On by default; untick to make this input passive so only the control signal runs it |
| `runOnChange-object` | Boolean | `true` | Whether a new value on Object properties re-runs this node. On by default; untick to make this input passive so only the control signal runs it |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `fetch` | Signal | — | Re-reads the object named by Id now. This is additional to Id rebinding on change and to changes being announced; untick either under Run On Value Change to stop it |

### What each input does

**Get Id from** (`idSource`)

- From repeater: at the frame's end it binds to the object of the row it sits in
- otherwise: kept; the object stays bound until the next Id

**Repeater Component** (`repeaterComponent`)

- under From repeater: at the frame's end it binds to the object of that repeater's row (blank: the nearest)
- otherwise: kept, and read only under From repeater

**Id** (`modelId`)

- a new Id, ticked under Run On Value Change: bound to the object it names now (made if none has it) and Fetched fires — an empty Id unbinds, silently; an object handed writes its keys onto that object first
- otherwise (the same Id, or unticked): Id is sent and the binding stays; an object handed still writes its keys onto the object it names

**Properties** (`properties`)

- always: nothing while it runs; each name makes an input, an output and its own Changed

**Fetch** (`fetch`)

- always: at the frame's end the node rebinds to the object its Id names, one rebind for the frame's presses; Fetched fires, and each press is answered Done, or Failure with no Id

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the object this node is bound to, whether that came from the Id input or from a repeater item. This names the object; the Object output carries the object itself, which is what a node that watches or reads it wants |
| `object` | Object | — | The bound object itself, for Object Changed or anything else that reads or watches the object rather than naming it; empty while nothing is bound |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires whenever any property of the bound object changes, from this node or from anywhere else |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when a Fetch finished and the property outputs are up to date |
| `fetched` | Signal | — | Fires once a new object has been bound and its property outputs are up to date |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `failure` | Signal | — | Fires when Fetch was pressed with no Id to bind to, with the reason on the error channel |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Property input/output ports are created from the "properties" parameter (the schema of the object being read/written).

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| idSource = explicit OR idSource NOT SET | `modelId` | — |
| idSource = foreach | `repeaterComponent` | — |

## Ports at runtime

Property ports are generated from the `properties` list on the node instance (and the connected schema where one exists) — they are per-instance, not in the catalog. `idSource` swaps the id between an explicit input and the enclosing repeater item (declared-port-groups). NDA-012: an empty Id (null or an empty string) binds nothing and does not fire `fetched`, rather than minting a throwaway object; a real id still springs into existence on first use. Property values that arrive before the Id are held and written the moment an object is bound.

## Patterns

- Repeater row: item id → Object → property outputs into the row's visuals.
- Ids travel over wires; Objects resolve them where the data is needed.

## Watch out for

- Duplicating object data into Variables 'for convenience' — bind another Object node to the same id instead; the store already shares it.

## Examples

**Create a client-side object and bind to it by id**

Create New Object (NewModel) makes a fresh client-side object with the property values on its schema-declared inputs and outputs the new `id`. An Object node (Model2) bound to that id then exposes the object's properties reactively — the create node acts, the Object node observes. This id-handoff is the core client-data shape: writers and readers connect through ids, not direct wires.

**Repeater item writes back to its own record object**

Inside a Repeater item component, Repeater Item (For Each Actions) exposes `itemId` — the id of this row's object. Wiring it into Set Object Properties (SetModelProperties) `modelId` makes the write target exactly this row: toggling the checkbox stores `done` on the row's object, and every other node bound to that object updates. The row never needs to know which list it belongs to. The title rides the checkbox's own `label` port (`useLabel` on) rather than a sibling Text, so the words are a real click target that toggles the box.

**A rich-text editor with a toolbar and local drafts**

The larger companion to the single-button component: a `Static Data` node holds the list of toolbar commands, a `For Each` draws one button per entry, and the editor itself is mounted by a `JavaScriptFunction` onto a `Group`'s element. Two details are worth more than the editor. The draft is saved to `localStorage` on a `Timer` and read back on mount, which is the whole of 'don't lose my work' and costs two function nodes. And `Model2` plus `SetModelProperties` keep the document in the project's own data model rather than only inside the third-party editor, so something other than the editor can read what was typed. ⚠️ The toolbar is driven by data, so adding a command is a row in the `Static Data` node — not a new button.

## Related nodes

[Create New Object](./new-model.md), [Set Object Properties](./set-model-properties.md), [Array](./collection2.md), [Record](../cloud-services/db-model2.md), [Component Object](../component-utilities/net-noodl-component-object.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)
- random numbers (`random`)

### Starting state

```json
{
  "properties": [],
  "inputValues": {},
  "dirty": {},
  "jobs": [],
  "fetches": 0,
  "fetchScheduled": false,
  "storeScheduled": false
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Id (`runOnChange-modelId`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |
| Object properties (`runOnChange-object`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Fetch is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/object.ts"
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
    connectionsOnly: true, // modelnode2.ts :509 — the panel draws no field for a property, only its wire
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
/** One frame's pulses in the order the runtime sends them (spec.ts `pulses`): declared, or `{ derived }`. */
type Pulse = 'fetched' | 'changed' | { derived: string };

function setModelID(st: ObjectState, w: WorldView, id: unknown, emit: Pulse[]): void {
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
  // v3 (P109 ISL-027, row C11 ruled "Make them fire"): `<property> Changed` fires on the runtime now, so its
  // ORDER is graded for the first time. The runtime's listener sends each property's Changed and then Changed
  // for every key a write moves, one key at a time (modelnode2.ts onModelChangedCallback); v2 queued every
  // `<property> Changed` of a frame ahead of every Changed and Fetched, an order nothing had observed.
  version: 3,
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
      when: (p) => p.idSource === 'foreach',
      type: 'component',
      coerce: 'none',
      displayName: 'Repeater Component',
      group: 'General',
      description: 'Which Repeater to take the item from when several are nested; leave blank to use the nearest one, and ignored unless Get Id from is From repeater',
      examples: ['Row', '']
    },
    // :240-273
    modelId: {
      when: (p) => p.idSource === 'explicit' || p.idSource === undefined,
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
    idSource: (s, v) =>
      v === 'foreach'
        ? { says: "From repeater: at the frame's end it binds to the object of the row it sits in", set: { idSource: v, jobs: [...s.jobs, 'bind' as const] }, send: [] }
        : { says: 'otherwise: kept; the object stays bound until the next Id', set: { idSource: v, jobs: s.jobs }, send: [] },
    // :233-238
    repeaterComponent: (s, v) =>
      s.idSource === 'foreach'
        ? { says: "under From repeater: at the frame's end it binds to the object of that repeater's row (blank: the nearest)", set: { repeaterComponent: v || undefined, jobs: [...s.jobs, 'bind' as const] }, send: [] }
        : { says: 'otherwise: kept, and read only under From repeater', set: { repeaterComponent: v || undefined, jobs: s.jobs }, send: [] },
    // :250-272
    modelId: (s, value, i, w) => {
      let v: unknown = value;
      // the bound record's own listener (:107-116) heard each key `Model.create` changed on it — written
      // here, beside the write (a node never hears its own write, registry.ts); NSP-013 s12, found by
      // generated seed 1104497702 once the daily rotation stopped replaying one corpus (T4)
      const own: Pulse[] = [];
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
              own.push({ derived: 'changed-' + key }); // :113
            }
            own.push('changed'); // :115
          }
        }
      }
      const previous = s.modelId; // :265
      if (valueDidChange(previous, v) && i['runOnChange-modelId']) {
        // :268 setModelID(v)
        const st: ObjectState = { ...s, modelId: v };
        const pulses: Pulse[] = [...own];
        setModelID(st, w, v, pulses);
        return { says: 'a new Id, ticked under Run On Value Change: bound to the object it names now (made if none has it) and Fetched fires — an empty Id unbinds, silently; an object handed writes its keys onto that object first', set: { modelId: v, bound: st.bound, jobs: st.jobs, storeScheduled: st.storeScheduled }, send: [], pulses };
      }
      return { says: 'otherwise (the same Id, or unticked): Id is sent and the binding stays; an object handed still writes its keys onto the object it names', set: { modelId: v }, send: ['id'], pulses: own }; // :270
    },
    // :274-280 — `set: function () {}`
    properties: () => ({ says: 'always: nothing while it runs; each name makes an input, an output and its own Changed', send: [] }),
    // :289-291 → :349-354 — a token per press, one rebind per frame
    fetch: (s) => ({ says: 'always: at the frame\'s end the node rebinds to the object its Id names, one rebind for the frame\'s presses; Fetched fires, and each press is answered Done, or Failure with no Id', set: { fetches: s.fetches + 1, fetchScheduled: true, jobs: s.fetchScheduled ? s.jobs : [...s.jobs, 'fetch' as const] }, outcome: 'deferred', send: [] })
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
      const pulses: Pulse[] = [];
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
                  pulses.push({ derived: 'changed-' + key }); // :113
                }
                pulses.push('changed'); // :115
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
            setModelID(st, w, st.modelId, pulses); // :371
            for (let k = 0; k < n; k++) outcomes.push({ port: 'fetch', outcome: 'done' }); // :372
            break;
          }
        }
        }
      }
      return {
        set: { bound: st.bound, dirty: st.dirty, jobs: st.jobs, fetches: st.fetches, fetchScheduled: st.fetchScheduled, storeScheduled: st.storeScheduled },
        send: [],
        pulses,
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
