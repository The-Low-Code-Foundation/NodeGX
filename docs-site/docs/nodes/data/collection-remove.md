---
title: "Remove Object From Array"
---
Remove Object From Array: removes an object, referenced by its id, from a shared array when Do fires.

When `remove` (Do) fires, resolves `collectionId` (Array Id) to the shared array and `modifyId` (Object Id) to the shared object, removes that object from the array, and reports one outcome: `done` (Done) when the object was removed, or `unchanged` (Unchanged) when it was not in this array. An Object Id naming a record nothing has loaded is `failure` (Failure) instead — that removal is impossible rather than redundant — as is an unset id. `completed` (Completed) fires after all three. Only the array membership changes — the object itself continues to exist and can still be reached by its id. Every Array node and Repeater bound to the same Array Id updates immediately.

## When to use it

Per-item delete actions in local lists. Inside a Repeater's item component, feed `modifyId` from Repeater Item's `itemId` — that is the idiomatic 'remove this row'. For clearing everything use Clear Array; for cloud records use Delete Record.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `CollectionRemove` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `collectionId` | String (CollectionName id) | — | Id of the array to remove from; clearing it unbinds the node, and the next Do then fails rather than acting on a throwaway array |
| `modifyId` | String | — | Id of the object to remove; the record must already have been loaded, or the removal is refused instead of quietly doing nothing |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `remove` | Signal | — | Removes the object named by Object Id from the array, or fires Failure if either cannot be resolved |

### What each input does

**Array Id** (`collectionId`)

- empty: no array bound, so a Do fails
- otherwise: bound to the array it names (made if none has it), or to the array handed

**Object Id** (`modifyId`)

- always: kept as the object the next Do removes

**Do** (`remove`)

- always: at the frame's end, once per press, the object is taken out of the array; answered Done, Unchanged when it was not in it, Failure with no Object Id, no array bound, or no object with that Id

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the object has been removed from the array |
| `unchanged` | Signal | — | Fires when the object was not in the array, so nothing was removed |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last attempt changed nothing, in one sentence; empty until something fails |
| `failure` | Signal | — | Fires when the array or the object could not be resolved, so nothing was changed |

## Patterns

- Repeater Item `itemId` → `modifyId`, delete button `onClick` → `remove`, with the list's Array Id on `collectionId`: a per-row delete button.

## Examples

**Named shared array with insert, remove and clear**

A client-side list without a backend: an Array node (Collection2) binds to the named shared array 'todos' and feeds a Repeater. Add Item (CollectionInsert), Remove Item (CollectionRemove) and Clear (CollectionClear) mutate the same array by its `collectionId`; every node bound to that id — including the Array feeding the list — sees the change immediately. Ids on wires tie the writers to the store. Remove is the row’s to raise: `/Todo Row` publishes a `remove` signal on its `Component Outputs`, and the Repeater re-publishes it as `itemOutputSignal-remove` while setting `itemActionItemId` to the row that fired — the trigger and the id both leave the Repeater, so they always describe the same row.

## Related nodes

[Array](./collection2.md), [Insert Object Into Array](./collection-insert.md), [Clear Array](./collection-clear.md), [Repeater Item](./for-each-actions.md), [Repeater](../visual/for-each.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "removes": 0
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/array-remove.ts"
/**
 * Remove Object From Array (catalog type `CollectionRemove`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-remove.ts` and
 * `collection-failure.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: binding and `Object Id` as Insert's. Each `Do` (:58) at the
 * frame end, in press order (:60-104): no Object Id → `remove-from-array/no-object-id` (:68-71);
 * no array → `remove-from-array/no-array` (:73-76); an Object Id NO RECORD HAS EVER BEEN LOADED
 * UNDER → `remove-from-array/unknown-object-id` with the id in the sentence (:83-87 — `Model.exists`
 * answers both tiers, and nothing is minted on this path); otherwise the record is removed from
 * the array in place: `done` when it was a member, `unchanged` when it was not (:100-103 — the
 * third path ERG-001 §0 found; `remove` of a non-member is a silent no-op, collection.ts :679-681).
 */

import { defineNode } from '../spec';
import { NO_ARRAY } from './array-clear';
import { NO_OBJECT_ID } from './array-insert';
import { errorOutput, identifier } from './data-base';

/** collection-failure.ts :190-199 */
export const UNKNOWN_OBJECT_ID = (action: string, id: unknown) =>
  `Nothing to ${action} — no record with the Id "${id}" has been loaded, so this would have done nothing. Connect the Id from a query, a Repeater item or an Object node rather than from a raw string.`;

export const CollectionRemove = defineNode({
  type: 'CollectionRemove',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-remove.ts; collection-failure.ts',
  needs: ['registry'],

  state: { bound: undefined as string | undefined, modifyId: undefined as unknown, error: undefined as string | undefined, removes: 0 },
  outcomes: ['done', 'unchanged', 'failure'], // :109-113

  inputs: {
    // :28-40
    collectionId: identifier(
      'Array Id',
      'General',
      'Id of the array to remove from; clearing it unbinds the node, and the next Do then fails rather than acting on a throwaway array',
      ['abc', 'empty', 'def']
    ),
    // :41-51
    modifyId: identifier(
      'Object Id',
      'Modify',
      'Id of the object to remove; the record must already have been loaded, or the removal is refused instead of quietly doing nothing',
      ['m1', 'm2', 'm3', 'zz']
    ),
    // :52-106
    remove: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Removes the object named by Object Id from the array, or fires Failure if either cannot be resolved'
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
    modifyId: (_s, v) => ({ says: 'always: kept as the object the next Do removes', set: { modifyId: v }, send: [] }),
    remove: (s) => ({ says: 'always: at the frame\'s end, once per press, the object is taken out of the array; answered Done, Unchanged when it was not in it, Failure with no Object Id, no array bound, or no object with that Id', set: { removes: s.removes + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :60-104, once per press in press order
    afterInputs: (s, _i, w) => {
      if (s.removes === 0) return { send: [] };
      let error = s.error;
      const outcomes: Array<{ port: 'remove'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      for (let k = 0; k < s.removes; k++) {
        if (s.modifyId === undefined) {
          error = NO_OBJECT_ID('remove'); // :68-71
          outcomes.push({ port: 'remove', outcome: 'failure', error: 'remove-from-array/no-object-id' });
          continue;
        }
        if (s.bound === undefined) {
          error = NO_ARRAY('remove'); // :73-76
          outcomes.push({ port: 'remove', outcome: 'failure', error: 'remove-from-array/no-array' });
          continue;
        }
        if (!w.registry.modelExists(s.modifyId)) {
          error = UNKNOWN_OBJECT_ID('remove', s.modifyId); // :83-87
          outcomes.push({ port: 'remove', outcome: 'failure', error: 'remove-from-array/unknown-object-id' });
          continue;
        }
        const collection = w.registry.collection(s.bound);
        const model = w.registry.model(s.modifyId); // :100
        const wasMember = collection.contains(model); // :101
        collection.remove(model); // :102
        outcomes.push({ port: 'remove', outcome: wasMember ? 'done' : 'unchanged' }); // :103
      }
      return error === s.error ? { set: { removes: 0 }, send: [], outcomes } : { set: { removes: 0, error }, send: ['error'], outcomes };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
