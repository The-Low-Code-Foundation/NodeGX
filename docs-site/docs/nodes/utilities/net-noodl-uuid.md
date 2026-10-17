---
title: "UUID"
---
A random version-4 UUID from the platform's cryptographic random source. Not the same thing as Unique Id.

UUID emits a standard RFC 4122 version-4 identifier — 36 characters, 122 random bits — generated once when the node is created and again on every New. It uses crypto.randomUUID where that exists and builds the same layout from crypto.getRandomValues where it does not (a browser on a non-secure origin), so it is never weaker, only differently reached. It is deliberately a second node beside Unique Id rather than a replacement: Unique Id is 10 characters from Math.random(), which is right for keying a rendered list and wrong for a record id, an idempotency key or anything an attacker might try to guess.

## When to use it

A record id, an idempotency key, a correlation id across services, a filename that must not collide. Anywhere the id leaves this page or has to be unguessable.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `net.noodl.UUID` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `generate` | Signal | — | Generates a fresh UUID, replacing the one on Id |

### What each input does

**New** (`generate`)

- always: a fresh UUID goes on Id, and Error is cleared → Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `uuid` | String | — | A random version-4 UUID, generated once when the node is created and again on every New. Use this rather than Unique Id wherever the id has to be globally unique or unguessable |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once a new UUID is available on Id |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why no UUID could be generated |
| `failure` | Signal | — | Fires when there is no cryptographic random source here, leaving Id as it was |

## Patterns

- Create Record with Id wired from this node: an id minted client-side lets the same request be retried safely.

## Watch out for

- Using Unique Id where this node is meant. Ten characters of Math.random() is not an identifier to key a database on.

## Examples

**Mint an invite link nobody can guess**

Two nodes that look interchangeable and are not. UUID gives a version-4 identifier — 36 characters, 122 random bits — and it is the right thing for an id you will store, log and put in a URL path, because it is a recognised format that other systems already know how to handle. Random Bytes gives raw entropy rendered as text, and it is the right thing for the SECRET half, because you choose how much of it there is. Neither is Unique Id: that node is 10 characters out of `Math.random()`, which is correct for keying a rendered list and wrong for anything an attacker might try to guess. Length counts BYTES, not characters — 32 bytes is 64 hex characters, or 43 in base64url, which is the encoding chosen here because it is the one that survives being pasted into a URL without escaping. Both nodes fail loudly rather than falling back to `Math.random()` when there is no cryptographic random source, which is the behaviour you want: a silent downgrade produces a token that looks exactly as convincing and is worthless, so the Failure wire is not decoration. Note that UUID populates its output when the node is created, so Id is never blank before the first `New` — the click here replaces it rather than filling it, which matters if you render the link before anyone has clicked.

## Related nodes

[Unique Id](../string-manipulation/unique-id.md), [Random Bytes](./net-noodl-random-bytes.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- random numbers (`random`)

### Starting state

```json
{}
```

### How actions report back

Each time New is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/uuid.ts"
/**
 * UUID (`net.noodl.UUID`) — read from `packages/noodl-runtime/src/nodes/std-library/crypto/uuid.ts`
 * and `crypto/encoding.ts` on 2026-09-30 (NSP-007).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE: the node holds one version-4 UUID, drawn from the platform's random source ONCE AT
 * CREATION (uuid.ts :48-54) so `Id` is never empty, and again on every `New` (:96-110), which
 * reports `done`. The draws come from the WORLD (spec.ts `WorldView.uuid`; world.ts): a target's
 * `crypto.randomUUID` is the world's seeded source, so the first id a node shows is the world's
 * first draw and the n-th `New` shows its (n+1)-th — a target that draws lazily, or twice, shows
 * a different id in the same place.
 *
 * The failure path (:99-104: no cryptographic source at all → `Error` set, `failure`
 * `uuid/failed`, `Id` kept) cannot happen under a world, which always has one; it is declared in
 * `outcomes` (the catalog draws the port) and has no reducer branch — a §6 note in NSP-007, not
 * a row: nothing a wire can carry distinguishes it from a world with entropy.
 */

import { defineNode } from '../spec';

export const Uuid = defineNode({
  type: 'net.noodl.UUID',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/crypto/uuid.ts',
  needs: ['random'],

  // :29-33 `_internal.uuid`, `_internal.error`
  state: { uuid: undefined as string | undefined, error: undefined as string | undefined },
  // :48-54 initialize → randomUuid() (encoding.ts :151-162: `crypto.randomUUID` where it exists)
  init: (w) => ({ uuid: w.uuid() }),
  // :55-57
  inspect: (s) => s.uuid ?? '',
  // :81-84 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :59-67
    generate: { type: 'signal', outcome: true, displayName: 'New', group: 'Actions', description: 'Generates a fresh UUID, replacing the one on Id' }
  },

  outputs: {
    // :70-80
    uuid: {
      type: 'string',
      from: (s) => s.uuid,
      displayName: 'Id',
      group: 'Values',
      description:
        'A random version-4 UUID, generated once when the node is created and again on every New. ' +
        'Use this rather than Unique Id wherever the id has to be globally unique or unguessable'
    },
    // :85-93 — never defined under a world (the failure path is unreachable), so never sent (C3)
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why no UUID could be generated' }
  }
}).on({
  // :96-110 _generate: a fresh draw, `error` cleared, both flagged, `done`
  generate: (_s, _i, w) => ({ says: 'always: a fresh UUID goes on Id, and Error is cleared', set: { uuid: w.uuid(), error: undefined }, outcome: 'done' })
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
