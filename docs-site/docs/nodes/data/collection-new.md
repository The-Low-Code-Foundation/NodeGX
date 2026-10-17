---
title: "Create New Array"
---
Create New Array: makes a fresh array with a generated id when Do fires, optionally copying an input array's contents into it.

On the `new` (Do) signal, creates a brand-new shared array under a freshly generated unique id. If an array is connected to `items`, its current contents are copied into the new array once, at creation time — later changes to the source are not tracked, so the result is a snapshot. After creation, `id` outputs the new array's id and `done` (Done) fires, followed by `completed` (Completed). There is no Failure or Unchanged port: the node builds its own array, so it can neither fail to find one nor do nothing. Each trigger of Do creates another new array.

## When to use it

When you need an anonymous or per-instance array instead of one fixed well-known id — e.g. snapshotting a live array before batch-processing it, or creating a sub-array whose id you store on an object. If one well-known shared array is enough, just use Array (Collection2) with a fixed id.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `CollectionNew` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `items` | Array | — | Contents to copy into the new array when Do fires; leave unconnected to start empty |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `new` | Signal | — | Creates a fresh array with a generated id and copies Items into it |

### What each input does

**Items** (`items`)

- always: kept as what the next new array starts with (empty: it starts empty)

**Do** (`new`)

- always: at the frame's end one new array is made from Items, Id is sent, and each press of the frame is answered Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the array made by the last Do — give it to an Array node or a mutator to reach the same array; empty until Do has fired |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation. This node has no other outcome — no Unchanged and no Failure — so it always fires together with Done, and wiring either one does the same thing. It is here on every action so that reaching for it is never a per-node decision |
| `done` | Signal | — | Fires once the new array exists and Id is up to date |

## Patterns

- `id` → Collection2 `collectionId`: bind an Array node to the newly created array to read it.
- Snapshot before a batch: source `items` → this `items`, Do on the user action, `created` → Run Tasks `run`.

## Examples

**Run Tasks: batch-process an array with a worker component**

Run Tasks executes its `taskTemplate` component once per element of `items`, up to `maxRunningTasks` at a time, and fires `completed` when the whole batch has finished, whatever the outcome — `done` is the narrower signal that the run finished having done its work. The worker is a plain component: it receives the item's properties through Component Inputs and reports completion through Component Outputs signals (success/failure), which Run Tasks consumes to schedule the next task. Here a fresh array is assembled with New Array and processed on click.

## Related nodes

[Array](./collection2.md), [Insert Object Into Array](./collection-insert.md), [Clear Array](./collection-clear.md), [Run Tasks](./run-tasks.md), [Create New Object](./new-model.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the shared store of Objects and Arrays, looked up by id (`registry`)
- random numbers (`random`)

### Starting state

```json
{
  "scheduled": false,
  "news": 0
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Items (`items`) | `array-literal` | text is evaluated as a JavaScript array literal; text that does not evaluate becomes `[]` |

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/array-new.ts"
/**
 * Create New Array (catalog type `CollectionNew`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/collectionnode-new.ts` on 2026-10-01 (NSP-012).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` mints a fresh ANONYMOUS array at the end of the frame (a
 * guid draw, `Collection.get()` with no name, :80) and copies whatever `Items` last held into it
 * (:81 — only when something was ever sent; an `Items` never written leaves the new array empty),
 * then publishes the new array's id (:85) and reports `done` (:87). The array it made last time is
 * left as it is: a second `Do` makes a second array with a second id, so `Id` moves every time.
 *
 * Two presses in one frame do ONE mint (the `hasScheduledNew` guard) and every press reports
 * `done` (ERG-001 §4: one outcome per invocation), as the Array node's `Fetch`, Set Variable's `Do`
 * and Array Filter's `Filter` do. Row C9 (fixed, ruled "One Done per press"): the guard sat BEFORE
 * `beginOutcome`, so the second press reported nothing; the token is now opened before the guard.
 */

import { defineNode } from '../spec';

export const CollectionNew = defineNode({
  type: 'CollectionNew',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/collectionnode-new.ts',
  needs: ['registry', 'random'],

  // :10-15 — `_internal.collection` (the array made last), `_internal.sourceCollection` (Items as
  // sent, `undefined` until written), `hasScheduledNew`; `news` counts the presses of the frame
  state: { collectionId: undefined as string | undefined, source: undefined as unknown, scheduled: false, news: 0 },
  outcomes: ['done'], // :65 outcomeOutputs({ done }) — no Failure (cannot fail to make one), no Unchanged (every Do mints)

  inputs: {
    // :28-35
    new: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Creates a fresh array with a generated id and copies Items into it'
    },
    // :36-44 — stored as sent; a string literal is evaluated by the port's array typecast (node.ts setInputValue)
    items: {
      type: 'array',
      coerce: 'array-literal',
      displayName: 'Items',
      group: 'General',
      description: 'Contents to copy into the new array when Do fires; leave unconnected to start empty'
    }
  },

  outputs: {
    // :47-59 — the last array made, or nothing (`undefined`) before the first Do
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the array made by the last Do — give it to an Array node or a mutator to reach the same array; empty until Do has fired',
      from: (s) => s.collectionId
    }
  }
}).on(
  {
    // :41-43 — whatever arrived, `undefined` included (`sourceCollection = value`)
    items: (_s, v) => ({ says: 'always: kept as what the next new array starts with (empty: it starts empty)', set: { source: v }, send: [] }),
    // :72-76 — queued once per frame; every press owes an outcome (the contract's reading, row C9)
    new: (s) => ({ says: 'always: at the frame\'s end one new array is made from Items, Id is sent, and each press of the frame is answered Done', set: { scheduled: true, news: s.news + 1 }, outcome: 'deferred', send: [] })
  },
  {
    // :77-88
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const collection = w.registry.collection(); // :80 — anonymous: a guid draw
      if (s.source !== undefined) collection.set(s.source); // :81
      const outcomes = Array.from({ length: s.news }, () => ({ port: 'new' as const, outcome: 'done' as const }));
      return { set: { collectionId: collection.getId(), scheduled: false, news: 0 }, send: ['id'], outcomes }; // :85-87
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
