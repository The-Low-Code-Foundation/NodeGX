---
title: "Create New Object"
---
Create New Object: creates a new client-side object with the declared properties set and outputs the new object's id.

Create New Object makes a new object in the app's client-side object store when the `new` (Do) signal fires. Objects are in-memory key/value records addressable by id from anywhere in the app — Object (Model2) nodes, Set Object Properties, repeaters and Component Inputs all bind to the same store. Which properties the new object gets is declared in the `properties` parameter; each declared name becomes a value input whose current value is written onto the object at creation time. After creation the object's id is available on the `id` output and `done` (Done) fires, followed by `completed` — creation is deferred until all inputs updated in the same cycle have settled, so payload values wired alongside the trigger are included.

## When to use it

Use it to mint new client-side state records: items added to a local list, draft objects before saving, per-session working data. Objects are in-memory only — for persistent cloud data use the record nodes (e.g. Create Record / NewDbModelProperties) instead; for a single named value a Variable (Variable2) is simpler.

## At a glance

| | |
|---|---|
| Category | Data |
| Type name | `NewModel` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `properties` | Stringlist | — | Names the properties to write; each name listed here gets a value input and a type selector |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `new` | Signal | — | Creates a new object with a generated id and writes the property values currently on the inputs |

### What each input does

**Properties** (`properties`)

- always: nothing while it runs; each name makes a value input (and a type for it)

**Do** (`new`)

- always: at the frame's end one new object is made holding the property inputs' values, Id is sent, and each press of the frame is answered Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | String | — | Id of the object this node acted on, which is how a newly created one is picked up downstream |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation. This node has no other outcome — no Unchanged and no Failure — so it always fires together with Done, and wiring either one does the same thing. It is here on every action so that reaching for it is never a per-node decision |
| `done` | Signal | — | Fires once the new object exists, its properties are written and Id names it |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Property input ports are created from the "properties" parameter.

## Ports at runtime

Property inputs are runtime-discovered from the `properties` parameter: each declared name p produces a value input `prop-<p>` (group Property Values) and an edit-only enum `type-<p>` (String/Boolean/Number/Date/Array/Object/Any, default Any). At creation each declared property receives its input value, or a type-based default (false, empty string, 0, current date) when no value was provided. Array-typed values given as strings are evaluated as JavaScript literals; object-typed values given as strings are resolved as object ids. An authoring tool must set `properties` first — the `prop-`/`type-` ports do not exist without it.

## Patterns

- Receive Event payload outputs → `prop-` inputs, `eventReceived` → `new`: create an object from an event's payload.
- `id` → Set Object Properties `modelId`: continue mutating the object you just created.

## Watch out for

- Expecting created objects to persist — the object store is client-side and in-memory; reloading the app clears it. Use cloud record nodes for persistence.

## Examples

**Create a client-side object and bind to it by id**

Create New Object (NewModel) makes a fresh client-side object with the property values on its schema-declared inputs and outputs the new `id`. An Object node (Model2) bound to that id then exposes the object's properties reactively — the create node acts, the Object node observes. This id-handoff is the core client-data shape: writers and readers connect through ids, not direct wires.

## Related nodes

[Object](./model2.md), [Set Object Properties](./set-model-properties.md), [Create Record](./new-db-model-properties.md), [Variable](./variable2.md), [Create New Array](./collection-new.md)

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
  "properties": [],
  "inputValues": {},
  "inputTypes": {},
  "scheduled": false,
  "news": 0
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/new-object.ts"
/**
 * Create New Object (catalog type `NewModel`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/newmodelnode.ts` on 2026-10-01 (NSP-012), with
 * the mixins in modelcrudbase.ts (object-crud-base.ts). `addModelId` is applied with outputs only
 * (:75): the node has an `Id` output and NO `Id` input — it never binds, it only makes.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` mints a fresh ANONYMOUS record at the frame end (a guid
 * draw, :59), writes the held property values onto it (object-crud-base.ts, `_pushInputValues`
 * :61), publishes its id (:63) and reports `done` (:67) — Id before the outcome, so a graph wired
 * `Done → Insert` reads the id. Two presses in one frame mint ONE record and report `done` per
 * press, both naming it (ERG-001 §4). Row C9 (fixed, ruled "One Done per press"): the guard sat
 * before `beginOutcome`, so the runtime reported one; the token is now opened before the guard.
 */

import { defineNode } from '../spec';
import { propertyNames } from './data-base';
import { discoverProperty, PROPERTIES_INPUT, PROPERTY_CANDIDATES, propertyInputs, pushInputValues, type PropertyState } from './object-crud-base';

type NewObjectState = PropertyState & { bound: string | undefined; scheduled: boolean; news: number };

export const NewModel = defineNode({
  type: 'NewModel',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/data/newmodelnode.ts; modelcrudbase.ts',
  needs: ['registry', 'random'],

  state: { bound: undefined, properties: [], inputValues: {}, inputTypes: {}, scheduled: false, news: 0 } as NewObjectState,
  init: (_w, params) => ({ properties: propertyNames(params.properties) }), // modelcrudbase.ts :461
  outcomes: ['done'], // :44-46 — no Failure (it makes its own object), no Unchanged (every Do mints)

  inputs: {
    // :27-34
    new: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Creates a new object with a generated id and writes the property values currently on the inputs'
    },
    properties: PROPERTIES_INPUT
  },

  outputs: {
    // modelcrudbase.ts :244-253 — the record made last; nothing before (no Id input ever sets `modelId`)
    id: {
      type: 'string',
      displayName: 'Id',
      group: 'General',
      description: 'Id of the object this node acted on, which is how a newly created one is picked up downstream',
      from: (s) => s.bound
    }
  }
}).on(
  {
    properties: () => ({ says: 'always: nothing while it runs; each name makes a value input (and a type for it)', send: [] }), // modelcrudbase.ts :449 `set: function () {}`
    // :48-55 — one mint per frame; one outcome per press (the contract's reading, row C9)
    new: (s) => ({ says: 'always: at the frame\'s end one new object is made holding the property inputs\' values, Id is sent, and each press of the frame is answered Done', set: { scheduled: true, news: s.news + 1 }, outcome: 'deferred', send: [] })
  },
  {
    derived: {
      inputs: propertyInputs,
      discover: discoverProperty,
      candidates: PROPERTY_CANDIDATES,
      // modelcrudbase.ts :600-605
      on: (s, port, v) =>
        port.startsWith('prop-')
          ? { set: { inputValues: { ...s.inputValues, [port.slice('prop-'.length)]: v } }, send: [] }
          : { set: { inputTypes: { ...s.inputTypes, [port.slice('type-'.length)]: v } }, send: [] }
    },
    // :57-68
    afterInputs: (s, _i, w) => {
      if (!s.scheduled) return { send: [] };
      const model = w.registry.model(); // :59 — anonymous: a guid draw
      pushInputValues(s, w, model.getId()); // :61
      const outcomes = Array.from({ length: s.news }, () => ({ port: 'new' as const, outcome: 'done' as const }));
      return { set: { bound: model.getId(), scheduled: false, news: 0 }, send: ['id'], outcomes }; // :63, :67
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
