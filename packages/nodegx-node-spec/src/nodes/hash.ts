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
    value: (_s, v) => ({ set: { value: v }, send: [] }),
    algorithm: (_s, v) => ({ set: { algorithm: v }, send: [] }),
    encoding: (_s, v) => ({ set: { encoding: v }, send: [] }),
    // :101-110 — the token is kept until the frame-end run reports it
    hash: (s) => ({ set: { pending: s.pending + 1 }, outcome: 'deferred' })
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
