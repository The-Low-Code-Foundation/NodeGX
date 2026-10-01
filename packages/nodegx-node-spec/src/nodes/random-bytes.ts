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
  generate: (_s, i, w) => {
    const length = i.length; // :112 — `undefined ? 32 : length`; the input holds 32 until written (initialize)
    const encoding = i.encoding || 'hex'; // :113
    const fail = (message: string) => ({ set: { error: message }, send: ['error'] as Array<'error'>, outcome: 'failure' as const, error: 'random-bytes/failed' });
    if (!Number.isFinite(length) || length < 1 || length > MAX_LENGTH || Math.floor(length) !== length) {
      return fail(`Random Bytes: Length must be a whole number from 1 to ${MAX_LENGTH}, and was ${String(length)}.`); // :121-124
    }
    const bytes = w.bytes(length); // :127 `randomBytes(length)` — the draw, before the render
    let value: string;
    try {
      value = encodeBytes(bytes, encoding); // :127
    } catch (e) {
      return fail((e as Error).message); // :128-131
    }
    return { set: { value, error: undefined }, send: ['value', 'error'], outcome: 'done' }; // :133-137
  }
});
