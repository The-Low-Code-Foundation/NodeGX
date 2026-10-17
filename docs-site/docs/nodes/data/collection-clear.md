---
title: "Clear Array"
---
Clear Array: empties a shared array (removes all items) when Do fires.

When `clear` (Do) fires, resolves `collectionId` (Array Id) to the shared array, replaces its contents with an empty list and fires `done` (Done), or `unchanged` (Unchanged) when the array was already empty. `failure` (Failure) fires when no array is bound. `completed` (Completed) fires after all three. The Array Id must be set before the signal arrives. The objects that were in the array are not destroyed — only the array is emptied — and every node bound to the same Array Id sees the empty array immediately.

## When to use it

Reset-style actions on local shared arrays ('clear the list', 'empty the cart'). To remove a single item use Remove Object From Array; this node is all-or-nothing.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `CollectionClear` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `collectionId` | String (CollectionName id) | — | Id of the array to empty; clearing it unbinds the node, and the next Do then fails rather than emptying a throwaway array |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `clear` | Signal | — | Removes every item from the array, or fires Failure if no array is bound |

### What each input does

**Array Id** (`collectionId`)

- empty: no array bound, so a Do fails
- otherwise: bound to the array it names (made if none has it), or to the array handed

**Do** (`clear`)

- always: at the frame's end, once per press, the array is emptied; answered Done, Unchanged when it was empty already, Failure with no array bound

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the array has been emptied |
| `unchanged` | Signal | — | Fires when the array was already empty, so nothing was removed |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last attempt changed nothing, in one sentence; empty until something fails |
| `failure` | Signal | — | Fires when no array is bound, so nothing was changed |

## Examples

**Named shared array with insert, remove and clear**

A client-side list without a backend: an Array node (Collection2) binds to the named shared array 'todos' and feeds a Repeater. Add Item (CollectionInsert), Remove Item (CollectionRemove) and Clear (CollectionClear) mutate the same array by its `collectionId`; every node bound to that id — including the Array feeding the list — sees the change immediately. Ids on wires tie the writers to the store. Remove is the row’s to raise: `/Todo Row` publishes a `remove` signal on its `Component Outputs`, and the Repeater re-publishes it as `itemOutputSignal-remove` while setting `itemActionItemId` to the row that fired — the trigger and the id both leave the Repeater, so they always describe the same row.

## Related nodes

[Array](./collection2.md), [Insert Object Into Array](./collection-insert.md), [Remove Object From Array](./collection-remove.md), [Create New Array](./collection-new.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)

### Starting state

```json
{
  "clears": 0
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/array-clear.ts"
/**
 * Clear Array (catalog type `CollectionClear`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-clear.ts` and the failure
 * surface the three mutators share, `collection-failure.ts`, on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Array Id` binds the node to the shared array of that name,
 * reaching it the moment the id arrives (collection-failure.ts :91-101, :63-66 — `Collection.get`,
 * create-on-read, so naming an array makes it); `undefined` and `null` UNBIND (:95-98 — an
 * author clearing the field, or an explicit clear on a wire), and an array handed in place of a
 * name binds to that array (:99). Each `Do` is one invocation with its own token (:42) and does
 * its work at the end of the frame (:44-63), in press order: with no array bound it FAILS with
 * `clear-array/no-array` and writes why on `Error` (:51-54, :149-157); otherwise it empties the
 * array in place — ONE `change` for the whole clear (collection.ts `set([])` batches) — and
 * reports `unchanged` when the array was already empty, `done` when something left (:60-62).
 * `Error` is written on a failure and never cleared by a later success (:212-224 clear only the
 * editor's warning).
 */

import { defineNode } from '../spec';
import { errorOutput, identifier } from './data-base';

/** collection-failure.ts :149-157 */
export const NO_ARRAY = (action: string) => 'Nothing to ' + action + ' — no array is bound. Set the Array Id input, or connect one, before triggering this node.';

export const CollectionClear = defineNode({
  type: 'CollectionClear',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-clear.ts; collection-failure.ts',
  needs: ['registry'],

  // `_internal.collection` (as its name), `_internal.error`; `clears` counts the presses of the frame
  state: { bound: undefined as string | undefined, error: undefined as string | undefined, clears: 0 },
  outcomes: ['done', 'unchanged', 'failure'], // :68-72

  inputs: {
    // :24-36 → collection-failure.ts :91-101
    collectionId: identifier(
      'Array Id',
      'General',
      'Id of the array to empty; clearing it unbinds the node, and the next Do then fails rather than emptying a throwaway array',
      ['abc', 'empty', 'def']
    ),
    // :37-65
    clear: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Removes every item from the array, or fires Failure if no array is bound'
    }
  },

  outputs: {
    error: errorOutput('Why the last attempt changed nothing, in one sentence; empty until something fails', (s: { error: unknown }) => s.error)
  }
}).on(
  {
    // collection-failure.ts :91-101 — `undefined` / `null` unbind; an array binds by its id; a name reaches `Collection.get(name)`
    collectionId: (_s, v, _i, w) => {
      if (v === undefined || v === null) return { says: 'empty: no array bound, so a Do fails', set: { bound: undefined }, send: [] };
      const name = w.registry.isCollection(v) ? v.getId() : v;
      return { says: 'otherwise: bound to the array it names (made if none has it), or to the array handed', set: { bound: w.registry.collection(name).getId() }, send: [] };
    },
    // :41-42 — one token per press, settled at the frame end
    clear: (s) => ({ says: 'always: at the frame\'s end, once per press, the array is emptied; answered Done, Unchanged when it was empty already, Failure with no array bound', set: { clears: s.clears + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :44-63, once per press in press order
    afterInputs: (s, _i, w) => {
      if (s.clears === 0) return { send: [] };
      let error = s.error;
      const outcomes: Array<{ port: 'clear'; outcome: 'done' | 'unchanged' | 'failure'; error?: string }> = [];
      for (let k = 0; k < s.clears; k++) {
        if (s.bound === undefined) {
          error = NO_ARRAY('clear'); // :51-54 → collection-failure.ts :149-157
          outcomes.push({ port: 'clear', outcome: 'failure', error: 'clear-array/no-array' });
          continue;
        }
        const collection = w.registry.collection(s.bound);
        const wasEmpty = collection.length === 0; // :60
        collection.set([]); // :61
        outcomes.push({ port: 'clear', outcome: wasEmpty ? 'unchanged' : 'done' }); // :62
      }
      return error === s.error ? { set: { clears: 0 }, send: [], outcomes } : { set: { clears: 0, error }, send: ['error'], outcomes };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
