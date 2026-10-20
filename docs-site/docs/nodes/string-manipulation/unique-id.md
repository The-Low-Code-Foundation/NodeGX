---
title: "Unique Id"
---
Provides a random 10-character alphanumeric id, with a signal to generate a fresh one on demand.

Unique Id holds a randomly generated id string — 10 characters of A–Z, a–z, 0–9, the same generator the runtime uses for model ids — on its `guid` (Id) string value output. One id is generated when the node initializes, so `guid` is usable immediately; triggering the `new` (New) signal input replaces it with a fresh id and pushes the change downstream. The ids are random, not sequential, and are not standard UUIDs.

## When to use it

Use it when client-side logic needs a throwaway identifier: keying a locally created list item, tagging a request or draft before it is persisted. Cloud records get real ids from the database on creation — do not use this to fabricate record ids.

## At a glance

| | |
|---|---|
| Category | String Manipulation |
| Type name | `Unique Id` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `new` | Signal | — | Generates a fresh id, replacing the one on Id |

### What each input does

**New** (`new`)

- always: a fresh ten-character id replaces the one on Id — never the one it held, and it cannot fail → Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `guid` | String | — | A short random id — 10 characters, from Math.random(). Good for keying a list. For a record id, an idempotency key or anything that must be unguessable, use the UUID node instead |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation. This node has no other outcome — no Unchanged and no Failure — so it always fires together with Done, and wiring either one does the same thing. It is here on every action so that reaching for it is never a per-node decision |
| `done` | Signal | — | Fires once a new id is available on Id |

## Patterns

- The signal that creates a local item also triggers `new`, and `guid` is stored with the item: every item gets its own key.

## Examples

**Debounced autosave with timestamped status**

The debounce idiom: every keystroke fires Value Changed, whose signal restarts a 1.5-second Timer — the save only runs when the user pauses. The save Function stamps the moment; Date To String formats it, Unique Id issues a save id shortened by Substring, and String Format assembles the status line. Signals sequence the flow; values shape the display.

## Related nodes

[Substring](./substring.md), [String Format](./string-format.md), [Function](../custom-code/java-script-function.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- random numbers (`random`)

### Starting state

```json
{
  "guid": ""
}
```

### How actions report back

Each time New is triggered, the node reports exactly one of **Done**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/unique-id.ts"
/**
 * Unique Id — read from `packages/noodl-runtime/src/nodes/std-library/uniqueid.ts` and
 * `packages/noodl-runtime/src/model.ts` (`Model.guid`, :297-311) on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node holds one ten-character id drawn from `Math.random`
 * ONCE AT CREATION (:22-25) and again on every `New` (:34-45), which reports `done` and nothing
 * else (:69-72: the draw cannot fail and cannot repeat the id it holds). The draw is
 * `Model.guid()` — the registry's own formula (registry.ts `guid`: ten draws from the world's
 * random source), so under a world the first id is the world's first ten draws and a `New` the
 * next ten, exactly as an anonymous record's id is minted. `Id` is a list key, not a credential
 * (:52-60): for anything unguessable the description points at UUID.
 */

import { defineNode } from '../spec';

export const UniqueId = defineNode({
  type: 'Unique Id',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/uniqueid.ts; packages/noodl-runtime/src/model.ts',
  needs: ['random'],

  // :22-25 initialize → Model.guid()
  state: { guid: '' },
  init: (w) => ({ guid: w.registry.guid() }),
  // :26-28
  inspect: (s) => s.guid,
  // :69-72 outcomeOutputs({ done })
  outcomes: ['done'],

  inputs: {
    // :30-46
    new: { type: 'signal', outcome: true, displayName: 'New', group: 'Actions', description: 'Generates a fresh id, replacing the one on Id' }
  },

  outputs: {
    // :48-66
    guid: {
      type: 'string',
      from: (s) => s.guid,
      displayName: 'Id',
      group: 'Values',
      description:
        'A short random id — 10 characters, from Math.random(). Good for keying a list. For a record ' +
        'id, an idempotency key or anything that must be unguessable, use the UUID node instead'
    }
  }
}).on({
  // :34-45 — a fresh draw, flagged, `done`
  new: (_s, _i, w) => ({ says: 'always: a fresh ten-character id replaces the one on Id — never the one it held, and it cannot fail', set: { guid: w.registry.guid() }, outcome: 'done' })
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
