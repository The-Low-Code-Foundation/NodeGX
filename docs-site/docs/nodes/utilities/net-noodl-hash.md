---
title: "Hash"
---
SHA-256/384/512 digest of a string, rendered as hex, base64 or base64url. Works in the browser and in a cloud function.

Hash takes the text on Value, hashes it with the chosen SHA-2 algorithm and puts the digest on Digest. It runs on WebCrypto, which both runtimes already have — there is no dependency behind it. The digest is computed asynchronously, so Done fires from a later turn than the Do that started it: wire Done, never assume Digest is fresh in the same frame. MD5 and SHA-1 are deliberately not offered; WebCrypto implements neither for digesting, and hand-rolling one would be shipping a broken hash. If you need a keyed digest, that is the HMAC node, which is cloud-only because it takes a secret.

## When to use it

Content addressing, a cache key, an integrity check, or comparing a value against a digest somebody else published. Not for storing passwords — a plain SHA-2 is the wrong tool for that, whichever runtime you are in.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `net.noodl.Hash` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `algorithm` | Enum (`SHA-256`, `SHA-384`, `SHA-512`) | `SHA-256` | Which SHA-2 digest to compute. MD5 and SHA-1 are not offered — WebCrypto has neither |
| `encoding` | Enum (`hex`, `base64`, `base64url`) | `hex` | How the digest bytes are rendered as text |
| `value` | String | — | The text to hash, as UTF-8 bytes |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `hash` | Signal | — | Computes the digest of Value |

### What each input does

**Value** (`value`)

- always: read at the end of the frame by a Do pressed in it — as its text, in UTF-8 bytes (nothing, 0 or false as the empty text)

**Algorithm** (`algorithm`)

- always: read at the end of the frame by a Do pressed in it (empty reads as SHA-256; one the host does not know fails that Do)

**Encoding** (`encoding`)

- always: read at the end of the frame by a Do pressed in it (empty reads as hex; one not in the list fails that Do)

**Do** (`hash`)

- always: one digest at the end of the frame however many presses, of Value as it stands then — Digest and a cleared Error, then Done per press; an unknown Algorithm or Encoding puts the reason on Error, Digest untouched, Failure per press

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `digest` | String | — | The hash of Value, rendered in Encoding. Available once Done has fired |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the digest has been computed and is available on Digest |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the digest could not be computed |
| `failure` | Signal | — | Fires when the digest could not be computed, most often because WebCrypto is not available here |

## Patterns

- Do → Done → the node that consumes Digest. The digest is asynchronous, so a wire off Done is the only way to sequence it correctly.

## Watch out for

- Reading Digest immediately after pulsing Do, in the same frame. It is still the previous value.
- Hashing a password with this node. Use your backend's password flow; a bare SHA-2 is not a password hash.

## Examples

**Turn an email address into a stable fingerprint**

The dictionary asks for `:formatted as MD5 hash` and `:formatted as SHA1 Hash`, and the honest answer is that this node offers neither — SHA-256, SHA-384 and SHA-512 only. That is a decision, not a gap: WebCrypto, which Hash runs on in both the browser and a cloud function, does not implement MD5 or SHA-1 for digesting, and hand-rolling one would mean shipping a hash that is broken for every purpose either was ever used for. If you are migrating a Bubble app that stored MD5 fingerprints, they will not reproduce here and no setting will make them; treat that as a re-hash of the source data, not a translation. Two details decide whether this works. Hash is ASYNCHRONOUS — the digest is computed off a later turn than the `Do` that started it — so Digest is wired to the Text and the button is wired to `Do`; reading Digest in the same pass as the click would read the previous answer. And hashing is exact, so the normalisation in front of it is doing real work: `Foo@Example.com ` and `foo@example.com` are different bytes and therefore entirely different digests, which is how a 'stable fingerprint' quietly stops matching. Trim and lower-case first, deliberately, and write down that you did. Failure fires only when WebCrypto is unavailable, which in a browser means the page is not on a secure origin — worth a Log, because the symptom is a blank fingerprint rather than an error. The digest is published as well as rendered: a fingerprint that only ever reaches a Text is a fingerprint nothing can be compared against.

## Related nodes

[HMAC](../cloud/noodl-cloud-hmac.md), [Random Bytes](./net-noodl-random-bytes.md), [UUID](./net-noodl-uuid.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- the browser's SHA-2 hashing (`digest`)

### Starting state

```json
{
  "algorithm": "SHA-256",
  "encoding": "hex",
  "pending": 0
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/hash.ts"
/**
 * Hash (`net.noodl.Hash`) — read from `packages/noodl-runtime/src/nodes/std-library/crypto/hash.ts`
 * and `crypto/encoding.ts` on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` asks for ONE digest per frame, however many times it is
 * pressed (:101-110 — every press takes a token, the first schedules the frame-end run), of the
 * UTF-8 bytes of `Value` as it stands at the frame end (`value || ''`, :142 — so `0` and `false`
 * hash as the empty string, and anything else as its `String`), with `Algorithm` (`|| 'SHA-256'`,
 * :140) rendered in `Encoding` (`|| 'hex'`, :141). The digest is asked of the host's WebCrypto
 * (:146) and lands ASYNCHRONOUSLY — `Done` fires from the promise's continuation, never beside
 * the Do (:20-23). Under a world the continuation is the microtask after the call (world.ts
 * DIGEST), so every token of the frame reports in that frame's settle: `Digest` and `Error`
 * (cleared) sent, then `done` per press (:153-160). An algorithm the host does not know, or an
 * encoding not in the list, fails every token of the frame (`hash/failed`) with the message on
 * `Error` and `Digest` untouched (:134-138, :147-150, :161 — the encoding's throw lands in the
 * same `.catch`).
 *
 * The spec computes the digest at the frame end (`afterInputs`) and settles the `deferred`
 * tokens there — the same settle the runtime's microtask lands in. The bytes are the standard's
 * (world.ts `digestBytes`), so a stranger's target with its own SHA-2 agrees byte for byte.
 */

import { defineNode } from '../spec';
import { digestBytes } from '../world';
import { encodeBytes, ENCODING_VALUES, utf8Bytes } from './bytes';

/** :73-79 — the enum's values. */
export const ALGORITHM_VALUES = ['SHA-256', 'SHA-384', 'SHA-512'] as const;

type State = {
  value: unknown;
  algorithm: unknown;
  encoding: unknown;
  digest: string | undefined;
  error: string | undefined;
  /** :103-104 `pendingOutcomes` — how many presses this frame holds tokens for. */
  pending: number;
}

export const Hash = defineNode({
  type: 'net.noodl.Hash',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/crypto/hash.ts; packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts',
  needs: ['digest'],

  // :49-52 initialize — algorithm 'SHA-256', encoding 'hex'
  state: { value: undefined, algorithm: 'SHA-256', encoding: 'hex', digest: undefined, error: undefined, pending: 0 } as State,
  // :126-129 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :54-62 — stored raw (:60)
    value: { type: 'string', coerce: 'none', displayName: 'Value', group: 'General', description: 'The text to hash, as UTF-8 bytes', examples: ['abc', 'The quick brown fox jumps over the lazy dog', 'ünïcödé ☃', 0, false] },
    // :63-79 — stored raw (:77)
    algorithm: {
      type: 'enum',
      enums: ALGORITHM_VALUES,
      default: 'SHA-256',
      coerce: 'none',
      displayName: 'Algorithm',
      group: 'General',
      description: 'Which SHA-2 digest to compute. MD5 and SHA-1 are not offered — WebCrypto has neither',
      examples: ['SHA-1']
    },
    // :80-96 — stored raw (:94)
    encoding: { type: 'enum', enums: ENCODING_VALUES, default: 'hex', coerce: 'none', displayName: 'Encoding', group: 'General', description: 'How the digest bytes are rendered as text' },
    // :97-111 — a token per press, one run per frame
    hash: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Computes the digest of Value' }
  },

  outputs: {
    // :114-122
    digest: { type: 'string', from: (s) => s.digest, displayName: 'Digest', group: 'Values', description: 'The hash of Value, rendered in Encoding. Available once Done has fired' },
    // :130-138
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the digest could not be computed' }
  }
}).on(
  {
    value: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — as its text, in UTF-8 bytes (nothing, 0 or false as the empty text)', set: { value: v }, send: [] }),
    algorithm: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it (empty reads as SHA-256; one the host does not know fails that Do)', set: { algorithm: v }, send: [] }),
    encoding: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it (empty reads as hex; one not in the list fails that Do)', set: { encoding: v }, send: [] }),
    // :101-110 — the token is kept until the frame-end run reports it
    hash: (s) => ({ says: 'always: one digest at the end of the frame however many presses, of Value as it stands then — Digest and a cleared Error, then Done per press; an unknown Algorithm or Encoding puts the reason on Error, Digest untouched, Failure per press', set: { pending: s.pending + 1 }, outcome: 'deferred' })
  },
  {
    // :139-162 `_run` at the frame end, and the continuation that follows it
    afterInputs: (s) => {
      if (s.pending === 0) return { send: [] };
      const outcomes = (outcome: 'done' | 'failure', error?: string) => Array.from({ length: s.pending }, () => (error === undefined ? { port: 'hash' as const, outcome } : { port: 'hash' as const, outcome, error }));
      const fail = (message: string) => ({ set: { pending: 0, error: message }, send: ['error'] as Array<'error'>, outcomes: outcomes('failure', 'hash/failed') }); // :134-138
      const algorithm = s.algorithm || 'SHA-256'; // :140
      const encoding = s.encoding || 'hex'; // :141
      const value = s.value || ''; // :142
      let digest: string;
      try {
        digest = encodeBytes(digestBytes(algorithm, utf8Bytes(value)), encoding); // :146, :155
      } catch (e) {
        return fail((e as Error).message); // :147-150, :161
      }
      return { set: { pending: 0, digest, error: undefined }, send: ['digest', 'error'], outcomes: outcomes('done') }; // :154-159
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
