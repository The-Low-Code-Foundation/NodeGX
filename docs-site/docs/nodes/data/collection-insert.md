---
title: "Insert Object Into Array"
---
Insert Object Into Array: appends an existing object, referenced by its id, to a shared array when Do fires.

When `add` (Do) fires, resolves `collectionId` (Array Id) to the shared array and `modifyId` (Object Id) to the shared object, appends the object to the end of the array, and reports one outcome: `done` (Done) when the object was added, or `unchanged` (Unchanged) when the array already held it — arrays hold each object once, so a repeat insert changes nothing. `failure` (Failure) fires when either id is unset. `completed` (Completed) fires after all three. Because arrays are shared by id, every Array node and Repeater bound to the same Array Id sees the new item immediately.

## When to use it

Adding items to a local shared array — typically right after Create New Object has created the object to add. For removing use Remove Object From Array; for cloud data use the record nodes instead (nothing here is persisted).

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `CollectionInsert` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `collectionId` | String (CollectionName id) | — | Id of the array to insert into; clearing it unbinds the node, and the next Do then fails rather than writing to a throwaway array |
| `modifyId` | String | — | Id of the object to insert; a record with this id is created if none has been loaded yet |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `add` | Signal | — | Adds the object named by Object Id to the array, or fires Failure if either cannot be resolved |

### What each input does

**Array Id** (`collectionId`)

- empty: no array bound, so a Do fails
- otherwise: bound to the array it names (made if none has it), or to the array handed

**Object Id** (`modifyId`)

- always: kept as the object the next Do adds

**Do** (`add`)

- always: at the frame's end, once per press, the object is added to the array (made if no object has that Id); answered Done, Unchanged when it was in it already, Failure with no Object Id or no array bound

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the object has been added to the array |
| `unchanged` | Signal | — | Fires when the object was already in the array, so nothing was added |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last attempt changed nothing, in one sentence; empty until something fails |
| `failure` | Signal | — | Fires when the array or the object could not be resolved, so nothing was changed |

## Patterns

- Create New Object `created` → `add` and `id` → `modifyId`: the canonical create-then-insert flow.

## Watch out for

- Trying to insert a raw value or JS object — `modifyId` takes an object id, not the data itself; create an object first with Create New Object.

## Examples

**Named shared array with insert, remove and clear**

A client-side list without a backend: an Array node (Collection2) binds to the named shared array 'todos' and feeds a Repeater. Add Item (CollectionInsert), Remove Item (CollectionRemove) and Clear (CollectionClear) mutate the same array by its `collectionId`; every node bound to that id — including the Array feeding the list — sees the change immediately. Ids on wires tie the writers to the store. Remove is the row’s to raise: `/Todo Row` publishes a `remove` signal on its `Component Outputs`, and the Repeater re-publishes it as `itemOutputSignal-remove` while setting `itemActionItemId` to the row that fired — the trigger and the id both leave the Repeater, so they always describe the same row.

## Related nodes

[Array](./collection2.md), [Remove Object From Array](./collection-remove.md), [Clear Array](./collection-clear.md), [Create New Array](./collection-new.md), [Create New Object](./new-model.md), [Object](./model2.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "adds": 0
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/array-insert.ts"
/**
 * Insert Object Into Array (catalog type `CollectionInsert`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-insert.ts` and
 * `collection-failure.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Array Id` binds as Clear Array's does (collection-failure.ts
 * :91-101). `Object Id` is kept as sent (:46-48). Each `Do` is one invocation (:56) done at the
 * frame end in press order (:58-96): with no Object Id ever sent it fails with
 * `insert-into-array/no-object-id` (:66-69 — checked FIRST); with no array bound,
 * `insert-into-array/no-array` (:71-74); otherwise the record NAMED by Object Id is reached —
 * create-on-read, so an id nothing has loaded is minted empty and inserted (:92, `Model.get`;
 * `null` names the record `'null'`) — and added to the array in place: `done` when it joined,
 * `unchanged` when it was already a member (:93-95, the ERG-001 reference case; `add` is a silent
 * no-op on a member, collection.ts :663). `Error` carries a failure's sentence and is never
 * cleared by a later success.
 */

import { defineNode } from '../spec';
import { NO_ARRAY } from './array-clear';
import { errorOutput, identifier } from './data-base';

/** collection-failure.ts :160-167 */
export const NO_OBJECT_ID = (action: string) => 'Nothing to ' + action + ' — no Object Id was supplied. Connect one before triggering this node.';

export const CollectionInsert = defineNode({
  type: 'CollectionInsert',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-insert.ts; collection-failure.ts',
  needs: ['registry'],

  state: { bound: undefined as string | undefined, modifyId: undefined as unknown, error: undefined as string | undefined, adds: 0 },
  outcomes: ['done', 'unchanged', 'failure'], // :101-105

  inputs: {
    // :28-40
    collectionId: identifier(
      'Array Id',
      'General',
      'Id of the array to insert into; clearing it unbinds the node, and the next Do then fails rather than writing to a throwaway array',
      ['abc', 'empty', 'def']
    ),
    // :41-49 — as sent
    modifyId: identifier('Object Id', 'Modify', 'Id of the object to insert; a record with this id is created if none has been loaded yet', ['m1', 'm2', 'm3', 'zz']),
    // :50-98
    add: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Adds the object named by Object Id to the array, or fires Failure if either cannot be resolved'
    }
  },

  outputs: {
    error: errorOutput('Why the last attempt changed nothing, in one sentence; empty until something fails', (s: { error: unknown }) => s.error)
  }
}).on(
  {
    collectionId: (_s, v, _i, w) => {
      if (v === undefined || v === null) return { says: 'empty: no array bound, so a Do fails', set: { bound: undefined }, send: [] };
      const name = w.registry.isCollection(v) ? v.getId() : v;
      return { says: 'otherwise: bound to the array it names (made if none has it), or to the array handed', set: { bound: w.registry.collection(name).getId() }, send: [] };
    },
    modifyId: (_s, v) => ({ says: 'always: kept as the object the next Do adds', set: { modifyId: v }, send: [] }),
    add: (s) => ({ says: 'always: at the frame\'s end, once per press, the object is added to the array (made if no object has that Id); answered Done, Unchanged when it was in it already, Failure with no Object Id or no array bound', set: { adds: s.adds + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :58-96, once per press in press order
    afterInputs: (s, _i, w) => {
      if (s.adds === 0) return { send: [] };
      let error = s.error;
      const outcomes: Array<{ port: 'add'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      for (let k = 0; k < s.adds; k++) {
        if (s.modifyId === undefined) {
          error = NO_OBJECT_ID('insert'); // :66-69
          outcomes.push({ port: 'add', outcome: 'failure', error: 'insert-into-array/no-object-id' });
          continue;
        }
        if (s.bound === undefined) {
          error = NO_ARRAY('insert'); // :71-74
          outcomes.push({ port: 'add', outcome: 'failure', error: 'insert-into-array/no-array' });
          continue;
        }
        const collection = w.registry.collection(s.bound);
        const model = w.registry.model(s.modifyId); // :92 — create-on-read
        const alreadyPresent = collection.contains(model); // :93
        collection.add(model); // :94
        outcomes.push({ port: 'add', outcome: alreadyPresent ? 'unchanged' : 'done' }); // :95
      }
      return error === s.error ? { set: { adds: 0 }, send: [], outcomes } : { set: { adds: 0, error }, send: ['error'], outcomes };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
