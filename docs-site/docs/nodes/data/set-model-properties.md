---
title: "Set Object Properties"
---
Set Object Properties: writes declared property values onto an existing client-side object, chosen by id or from the repeater item.

Set Object Properties mutates an object in the client-side object store. The target is chosen by `idSource` (Id Source): with 'Specify explicitly' (the default) the `modelId` (Id) input names the object — it accepts either an id string or an object value directly; with 'From repeater' the node walks up the component tree and targets the item object of the closest enclosing Repeater (For Each) item, which is the idiomatic way to edit "this row's" data from inside an item component. When `store` (Do) fires, every property declared in `properties` is written from its input, then `done` (Done) fires, followed by `completed`. Because everything bound to the same object shares it, the change immediately propagates to Object nodes, repeater item bindings and Component Inputs reading that object.

## When to use it

Use it to change one or more properties of an existing client-side object in a single action — especially from inside a repeater item with Id Source 'From repeater'. To create the object first use Create New Object (NewModel); to write a single property continuously prefer an Object (Model2) node's property inputs; for cloud records use Update Record (SetDbModelProperties) plus a save to persist.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `SetModelProperties` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `idSource` | Enum (`explicit`, `foreach`) | `explicit` | Where the object comes from: the Id input, or the item of the Repeater this node sits inside |
| `modelId` | String (ModelName id) | — | Id of the object to act on, which is created the first time it is named; an Object may be wired here instead, and null or blank binds nothing so Do fails |
| `properties` | Stringlist | — | Names the properties to write; each name listed here gets a value input and a type selector |
| `repeaterComponent` | Component | — | Which Repeater to take the item from when several are nested; leave blank to use the nearest one, and ignored unless Id Source is From repeater |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | Signal | — | Writes the property values currently on the inputs onto the object named by Id |

### What each input does

**Id Source** (`idSource`)

- From repeater: at the frame's end it binds to the object of the row it sits in
- otherwise: kept; the object stays bound until the next Id

**Repeater Component** (`repeaterComponent`)

- under From repeater: at the frame's end it binds to the object of that repeater's row (blank: the nearest)
- otherwise: kept, and read only under From repeater

**Id** (`modelId`)

- empty: no object bound, so a Do fails; Id is sent
- otherwise: bound to the object it names (made if none has it); Id is sent

**Properties** (`properties`)

- always: nothing while it runs; each name makes a value input (and a type for it)

**Do** (`store`)

- always: at the frame's end the property inputs are written onto the bound object, one write for the frame's presses; each answered Done, or Failure with no object bound

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the object this node acted on, which is how a newly created one is picked up downstream |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the properties have been written onto the object and anything watching it has been told |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why no object was bound, and what to set so that one is |
| `failure` | Signal | — | Fires when there was no object to act on, so nothing was written, after the reason has been put on Error |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Property input ports are created from the "properties" parameter of the object schema being written.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| idSource = explicit OR idSource NOT SET | `modelId` | — |
| idSource = foreach | `repeaterComponent` | — |

## Ports at runtime

Property inputs are runtime-discovered from the `properties` parameter: each declared name p produces a value input `prop-<p>` (group Property Values) and an edit-only enum `type-<p>` (String/Boolean/Number/Date/Array/Object/Any, default Any). Only names present in `properties` are written on store. Additionally a declared port group hides `modelId` unless `idSource` is 'explicit' (or unset). Static values can be supplied as `prop-<p>` parameters instead of connections. NDA-012: an empty Id (null or an empty string) binds nothing, so `Do` fires `failure` with `set-object-properties/no-object` rather than writing into a process-wide shared record and reporting Done.

## Patterns

- Inside a repeater item component: `idSource` = 'foreach', a button's click → `store`: edit the current row's object without passing ids around.
- Create New Object `id` → `modelId`: set further properties on a just-created object.

## Watch out for

- Using it on cloud record objects and expecting the database to change — writes are client-side only; follow with a Save Record action to persist.

## Examples

**Repeater item writes back to its own record object**

Inside a Repeater item component, Repeater Item (For Each Actions) exposes `itemId` — the id of this row's object. Wiring it into Set Object Properties (SetModelProperties) `modelId` makes the write target exactly this row: toggling the checkbox stores `done` on the row's object, and every other node bound to that object updates. The row never needs to know which list it belongs to. The title rides the checkbox's own `label` port (`useLabel` on) rather than a sibling Text, so the words are a real click target that toggles the box.

**A rich-text editor with a toolbar and local drafts**

The larger companion to the single-button component: a `Static Data` node holds the list of toolbar commands, a `For Each` draws one button per entry, and the editor itself is mounted by a `JavaScriptFunction` onto a `Group`'s element. Two details are worth more than the editor. The draft is saved to `localStorage` on a `Timer` and read back on mount, which is the whole of 'don't lose my work' and costs two function nodes. And `Model2` plus `SetModelProperties` keep the document in the project's own data model rather than only inside the third-party editor, so something other than the editor can read what was typed. ⚠️ The toolbar is driven by data, so adding a command is a row in the `Static Data` node — not a new button.

## Related nodes

[Create New Object](./new-model.md), [Object](./model2.md), [Update Record](./set-db-model-properties.md), [Repeater](../visual/for-each.md), [Variable](./variable2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "properties": [],
  "inputValues": {},
  "inputTypes": {},
  "jobs": [],
  "stores": 0,
  "scheduled": false
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/set-object-properties.ts"
/**
 * Set Object Properties (catalog type `SetModelProperties`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/setmodelpropertiesnode.ts` on 2026-10-01
 * (NSP-012), with the mixins in modelcrudbase.ts (object-crud-base.ts): `addModelId` with inputs
 * and outputs, `addFailure` under `set-object-properties`, `addInputProperties`.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Id` binds the record of that name the moment it arrives —
 * a record handed in becomes its id (modelcrudbase.ts :233), an EMPTY id (`undefined`, `null`,
 * `''`) binds nothing (:289-293), anything else reaches its record create-on-read (:295-296) —
 * and `Id` is re-sent (:298-301); there is no checkbox and no compare. `Id Source` =
 * `From repeater` binds the enclosing Repeater's item at the frame end (:200-203, :262-266); a
 * node outside one binds NOTHING (foreachitem.ts :124-136). `Do` writes the held property values
 * onto the bound record at the frame end (:537-571) — see object-crud-base.ts for the write —
 * and reports `done` (:569); with no record bound it FAILS with `set-object-properties/no-object`,
 * the sentence on `Error` naming which way it was unbound (:556-563, :79-105). Two presses in one
 * frame do ONE write and report one outcome per press, a failure too (only the first raises). Row C9
 * (fixed, ruled "One Done per press"): the guard sat before the token, so the runtime reported one.
 */

import { defineNode } from '../spec';
import { emptyId, errorOutput, propertyNames } from './data-base';
import { discoverProperty, PROPERTIES_INPUT, PROPERTY_CANDIDATES, propertyInputs, pushInputValues, type PropertyState } from './object-crud-base';

/** :22 */
export const FAILURE_CODE_PREFIX = 'set-object-properties';

/** modelcrudbase.ts :79-85 */
export const NO_OBJECT_MESSAGE = (action: string, fromRepeater: boolean) =>
  fromRepeater
    ? 'Nothing to ' + action + ' — Id Source is "From repeater" and no item resolved.'
    : 'Nothing to ' + action + ' — no object is bound. Set the Id input, or connect one, before triggering this node.';

type Job = 'bind' | 'store';

type SetObjectState = PropertyState & {
  modelId: unknown;
  bound: string | undefined;
  idSource: unknown;
  repeaterComponent: unknown;
  error: string | undefined;
  jobs: readonly Job[];
  stores: number;
  scheduled: boolean;
};

export const SetModelProperties = defineNode({
  type: 'SetModelProperties',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/setmodelpropertiesnode.ts; modelcrudbase.ts',
  needs: ['registry'],

  state: { modelId: undefined, bound: undefined, idSource: undefined, repeaterComponent: undefined, error: undefined, properties: [], inputValues: {}, inputTypes: {}, jobs: [], stores: 0, scheduled: false } as SetObjectState,
  init: (_w, params) => ({ properties: propertyNames(params.properties) }), // modelcrudbase.ts :461
  outcomes: ['done', 'failure'], // :48-50 + `addFailure` :56

  inputs: {
    // modelcrudbase.ts :187-204
    idSource: {
      type: 'enum',
      enums: ['explicit', 'foreach'],
      default: 'explicit',
      coerce: 'none',
      editOnly: true,
      displayName: 'Id Source',
      group: 'General',
      description: 'Where the object comes from: the Id input, or the item of the Repeater this node sits inside'
    },
    // :209-221
    repeaterComponent: {
      when: (p) => p.idSource === 'foreach',
      type: 'component',
      coerce: 'none',
      displayName: 'Repeater Component',
      group: 'General',
      description: 'Which Repeater to take the item from when several are nested; leave blank to use the nearest one, and ignored unless Id Source is From repeater',
      examples: ['Row', '']
    },
    // :222-237
    modelId: {
      when: (p) => p.idSource === 'explicit' || p.idSource === undefined,
      type: 'string',
      coerce: 'none',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object to act on, which is created the first time it is named; an Object may be wired here instead, and null or blank binds nothing so Do fails',
      examples: ['m1', 'm2', 'm3', 'zz']
    },
    properties: PROPERTIES_INPUT,
    // :30-38
    store: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Writes the property values currently on the inputs onto the object named by Id'
    }
  },

  outputs: {
    // modelcrudbase.ts :244-253
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object this node acted on, which is how a newly created one is picked up downstream',
      from: (s) => (s.bound !== undefined ? s.bound : s.modelId)
    },
    // modelcrudbase.ts :60-68
    error: errorOutput('Why no object was bound, and what to set so that one is', (s: { error: unknown }) => s.error)
  }
}).on(
  {
    // modelcrudbase.ts :200-203
    idSource: (s, v) =>
      v === 'foreach'
        ? { says: "From repeater: at the frame's end it binds to the object of the row it sits in", set: { idSource: v, jobs: [...s.jobs, 'bind' as const] }, send: [] }
        : { says: 'otherwise: kept; the object stays bound until the next Id', set: { idSource: v, jobs: s.jobs }, send: [] },
    // :215-220
    repeaterComponent: (s, v) =>
      s.idSource === 'foreach'
        ? { says: "under From repeater: at the frame's end it binds to the object of that repeater's row (blank: the nearest)", set: { repeaterComponent: v || undefined, jobs: [...s.jobs, 'bind' as const] }, send: [] }
        : { says: 'otherwise: kept, and read only under From repeater', set: { repeaterComponent: v || undefined, jobs: s.jobs }, send: [] },
    // :232-237 → setModelID :289-297 → setModel :298-301
    modelId: (_s, value, _i, w) => {
      const v = w.registry.isRecord(value) ? value.getId() : value; // :233
      if (emptyId(v)) return { says: 'empty: no object bound, so a Do fails; Id is sent', set: { modelId: v, bound: undefined }, send: ['id'] }; // :290-293
      return { says: 'otherwise: bound to the object it names (made if none has it); Id is sent', set: { modelId: v, bound: w.registry.model(v).getId() }, send: ['id'] }; // :295-296
    },
    properties: () => ({ says: 'always: nothing while it runs; each name makes a value input (and a type for it)', send: [] }),
    // :34-37 → modelcrudbase.ts :537-543 — one write per frame; one outcome per press (the contract's reading, row C9)
    store: (s) => ({ says: 'always: at the frame\'s end the property inputs are written onto the bound object, one write for the frame\'s presses; each answered Done, or Failure with no object bound', set: { stores: s.stores + 1, scheduled: true, jobs: s.scheduled ? s.jobs : [...s.jobs, 'store' as const] }, outcome: 'deferred', send: [] })
  },
  {
    derived: {
      inputs: propertyInputs,
      discover: discoverProperty,
      candidates: PROPERTY_CANDIDATES,
      on: (s, port, v) =>
        port.startsWith('prop-')
          ? { set: { inputValues: { ...s.inputValues, [port.slice('prop-'.length)]: v } }, send: [] }
          : { set: { inputTypes: { ...s.inputTypes, [port.slice('type-'.length)]: v } }, send: [] }
    },
    // the frame's scheduled callbacks, in order (:263, :546)
    afterInputs: (s, _i, w) => {
      if (s.jobs.length === 0) return { send: [] };
      let bound = s.bound;
      let error = s.error;
      let scheduled = s.scheduled;
      let stores = s.stores;
      const send: Array<'id' | 'error'> = [];
      const outcomes: Array<{ port: 'store'; outcome: 'done' | 'failure'; error?: string }> = [];
      for (const job of s.jobs) {
        if (job === 'bind') {
          bound = undefined; // modelcrudbase.ts :264 — outside any Repeater the walk misses
          send.push('id'); // :300
          continue;
        }
        // :546-570
        scheduled = false;
        const n = stores;
        stores = 0;
        if (bound === undefined) {
          error = NO_OBJECT_MESSAGE('store', s.idSource === 'foreach'); // :80-87
          send.push('error');
          for (let k = 0; k < n; k++) outcomes.push({ port: 'store', outcome: 'failure', error: FAILURE_CODE_PREFIX + '/no-object' }); // :99-104
          continue;
        }
        pushInputValues(s, w, bound); // :566
        for (let k = 0; k < n; k++) outcomes.push({ port: 'store', outcome: 'done' }); // :569
      }
      return { set: { bound, error, scheduled, stores, jobs: [] }, send: [...new Set(send)], outcomes };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
