---
title: "Random Bytes"
---
A block of cryptographically random bytes as hex, base64 or base64url. Never falls back to Math.random().

Random Bytes fills Length bytes from the platform's cryptographic random source (crypto.getRandomValues) and renders them in Encoding. If there is no such source it fails loudly rather than substituting Math.random() — a silent downgrade there produces output that looks identical and is worthless. Length counts BYTES, not characters: 32 bytes is 64 hex characters or 43 base64url characters. A length outside 1-4096 is refused rather than clamped.

## When to use it

A nonce, a CSRF token, a PKCE verifier, an invite code, a one-time download key — anything that has to be unguessable. For an identifier that only has to be unique, the UUID node says so more clearly.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `net.noodl.RandomBytes` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `encoding` | Enum (`hex`, `base64`, `base64url`) | `hex` | How the bytes are rendered as text. Base64 URL is the safe one for a URL or a token |
| `length` | Number | `32` | How many random BYTES to generate (not characters — hex renders each byte as two). 1 to 4096 |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `generate` | Signal | — | Generates a fresh block of random bytes |

### What each input does

**New** (`generate`)

- Length not a whole number from 1 to 4096: nothing is drawn, the reason on Error, Value untouched → Failure
- an Encoding not in the list (empty reads as hex): Length bytes were drawn and are thrown away, the reason on Error, Value untouched → Failure
- Length bytes are drawn from the cryptographic source and rendered in Encoding: Value replaced, Error cleared → Done

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | String | — | The random bytes rendered in Encoding, replaced on every New |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once fresh random bytes are available on Value |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why no random bytes were produced |
| `failure` | Signal | — | Fires when there is no cryptographic random source here, or Length is out of range. This node will not quietly substitute Math.random() |

## Patterns

- New → Done → store or send. The value is replaced on every New, so read it from the Done path rather than later.

## Watch out for

- Treating Length as a character count. 16 bytes of hex is 32 characters.
- Using this where a UUID is what the other system expects — the shapes are not interchangeable.

## Examples

**Mint an invite link nobody can guess**

Two nodes that look interchangeable and are not. UUID gives a version-4 identifier — 36 characters, 122 random bits — and it is the right thing for an id you will store, log and put in a URL path, because it is a recognised format that other systems already know how to handle. Random Bytes gives raw entropy rendered as text, and it is the right thing for the SECRET half, because you choose how much of it there is. Neither is Unique Id: that node is 10 characters out of `Math.random()`, which is correct for keying a rendered list and wrong for anything an attacker might try to guess. Length counts BYTES, not characters — 32 bytes is 64 hex characters, or 43 in base64url, which is the encoding chosen here because it is the one that survives being pasted into a URL without escaping. Both nodes fail loudly rather than falling back to `Math.random()` when there is no cryptographic random source, which is the behaviour you want: a silent downgrade produces a token that looks exactly as convincing and is worthless, so the Failure wire is not decoration. Note that UUID populates its output when the node is created, so Id is never blank before the first `New` — the click here replaces it rather than filling it, which matters if you render the link before anyone has clicked.

## Related nodes

[UUID](./net-noodl-uuid.md), [Hash](./net-noodl-hash.md), [Unique Id](../string-manipulation/unique-id.md)

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

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| Length (`length`) | `js-number` | converted with `Number(value)`, so text that is not a number becomes `NaN` |

### How actions report back

Each time New is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/random-bytes.ts"
/**
 * Random Bytes (`net.noodl.RandomBytes`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/crypto/randombytes.ts` and `crypto/encoding.ts` on
 * 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: every `New` draws `Length` bytes from the platform's
 * cryptographic source — under a world, the WORLD'S seeded stream (world.ts RANDOM: a target's
 * `crypto.getRandomValues` IS `world.bytes`), so the n-th New of two plays of one seed renders the
 * same text — and sends them rendered in `Encoding`, reporting `done` (:106-118). It never falls
 * back to `Math.random` (:8-12). `Length` is `Number(value)` on arrival (:49) and must be a
 * whole number from 1 to 4096, or New reports `failure` (`random-bytes/failed`) with the reason
 * on `Error` and draws nothing (:98-102); an `Encoding` not in the list fails the same way, AFTER
 * the bytes were drawn (:104-109 — `encodeBytes` throws, the draw already made), so a failed
 * render still consumes `Length` draws of the stream. `Value` is sent only on success; `Error` is
 * sent on either path (undefined after a success, :112-114 — so a wire keeps the last reason).
 *
 * AC6 (NSP-013): the bytes are the world's by construction, so two targets agree byte for byte
 * under one seed; a target with no `install()` cannot be handed a world and the runner refuses
 * the spec with that reason (conformance.ts step 0) — a target reading real entropy is never
 * graded as if it conformed.
 */

import { defineNode } from '../spec';
import { encodeBytes, ENCODING_VALUES } from './bytes';

/** :22 — above this an author has almost certainly wired a number they did not mean. */
const MAX_LENGTH = 4096;

export const RandomBytes = defineNode({
  type: 'net.noodl.RandomBytes',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/crypto/randombytes.ts; packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts',
  needs: ['random'],

  // :39-42 initialize — length 32, encoding 'hex': the two inputs' defaults; the node holds the last value and the last reason
  state: { value: undefined as string | undefined, error: undefined as string | undefined },
  // :83-84 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :44-53 — `Number(value)` (:50)
    length: {
      type: 'number',
      default: 32,
      coerce: 'js-number',
      displayName: 'Length',
      group: 'General',
      description: `How many random BYTES to generate (not characters — hex renders each byte as two). 1 to ${MAX_LENGTH}`,
      examples: [1, 16, 4096, 4097, 2.5]
    },
    // :54-70 — stored raw (:68)
    encoding: {
      type: 'enum',
      enums: ENCODING_VALUES,
      default: 'hex',
      coerce: 'none',
      displayName: 'Encoding',
      group: 'General',
      description: 'How the bytes are rendered as text. Base64 URL is the safe one for a URL or a token'
    },
    // :71-79
    generate: { type: 'signal', outcome: true, displayName: 'New', group: 'Actions', description: 'Generates a fresh block of random bytes' }
  },

  outputs: {
    // :82-90
    value: { type: 'string', from: (s) => s.value, displayName: 'Value', group: 'Values', description: 'The random bytes rendered in Encoding, replaced on every New' },
    // :96-104
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why no random bytes were produced' }
  }
}).on({
  // :108-134 `_generate`
  // NSP-018: the two refusals as literal arms (a `fail` helper before), the same patches
  generate: (_s, i, w) => {
    const length = i.length; // :112 — `undefined ? 32 : length`; the input holds 32 until written (initialize)
    const encoding = i.encoding || 'hex'; // :113
    if (!Number.isFinite(length) || length < 1 || length > MAX_LENGTH || Math.floor(length) !== length) {
      return { says: 'Length not a whole number from 1 to 4096: nothing is drawn, the reason on Error, Value untouched', set: { error: `Random Bytes: Length must be a whole number from 1 to ${MAX_LENGTH}, and was ${String(length)}.` }, send: ['error'], outcome: 'failure', error: 'random-bytes/failed' }; // :121-124
    }
    const bytes = w.bytes(length); // :127 `randomBytes(length)` — the draw, before the render
    let value: string;
    try {
      value = encodeBytes(bytes, encoding); // :127
    } catch (e) {
      return { says: 'an Encoding not in the list (empty reads as hex): Length bytes were drawn and are thrown away, the reason on Error, Value untouched', set: { error: (e as Error).message }, send: ['error'], outcome: 'failure', error: 'random-bytes/failed' }; // :128-131
    }
    return { says: 'Length bytes are drawn from the cryptographic source and rendered in Encoding: Value replaced, Error cleared', set: { value, error: undefined }, send: ['value', 'error'], outcome: 'done' }; // :133-137
  }
});
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
