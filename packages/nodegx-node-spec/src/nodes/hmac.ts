/**
 * HMAC (`noodl.cloud.hmac`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/hmac.ts` and
 * `packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts` on 2026-10-12 (NSP-022 s96). A cloud-only node: graded
 * on the runtime's cloud target (a `NoodlRuntime` of type `cloud`, its own nodes registered).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: Hash's, with a key. `Do` asks for ONE signature per frame, however many times it is pressed
 * (:86-101 — every press takes a token, the first schedules the frame-end run), of the UTF-8 bytes of `Value` as it stands at
 * the frame end (`value || ''`, :147 — so `0` and `false` sign as the empty string), under the UTF-8 bytes of `Key`, with
 * `Algorithm` (`|| 'SHA-256'`, :144) rendered in `Encoding` (`|| 'hex'`, :145). No Key — nothing, `''`, `0`, `false` (`!key`,
 * :139) — fails every press of the frame at once with the node's own sentence. Otherwise the signature is asked of the host's
 * WebCrypto (`importKey` then `sign`, encoding.ts `hmacBytes`) and lands ASYNCHRONOUSLY; under a world each is the microtask
 * after its call (world.ts DIGEST, the keyed sign), so every token of the frame reports in that frame's settle: `Signature`
 * and `Error` (cleared) sent, then `done` per press (:148-154). A hash the host does not know, a Key whose text is empty (an
 * empty array: `!key` lets it through and `importKey` refuses zero bytes) or an encoding not in the list fails every token of
 * the frame (`hmac/failed`) with the message on `Error` and `Signature` untouched (:129-133, :155).
 *
 * The spec computes the signature at the frame end (`afterInputs`) and settles the `deferred` tokens there — the same settle
 * the runtime's microtasks land in. The bytes are RFC 2104's over the standard's SHA-2 (world.ts `hmacBytes`), so a
 * stranger's target with its own HMAC agrees byte for byte.
 */

import { defineNode } from '../spec';
import { hmacBytes } from '../world';
import { encodeBytes, ENCODING_VALUES, utf8Bytes } from './bytes';
import { ALGORITHM_VALUES } from './hash';

type State = {
  value: unknown;
  key: unknown;
  algorithm: unknown;
  encoding: unknown;
  signature: string | undefined;
  error: string | undefined;
  /** :91-92 `pendingOutcomes` — how many presses this frame holds tokens for. */
  pending: number;
};

/** :140 — the sentence a missing Key fails with. */
export const HMAC_NO_KEY = 'HMAC: a Key is required. Wire one from a Secret node.';

export const Hmac = defineNode({
  type: 'noodl.cloud.hmac',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/hmac.ts; packages/noodl-runtime/src/nodes/std-library/crypto/encoding.ts',
  needs: ['digest'],

  // :29-32 initialize — algorithm 'SHA-256', encoding 'hex'
  state: { value: undefined, key: undefined, algorithm: 'SHA-256', encoding: 'hex', signature: undefined, error: undefined, pending: 0 } as State,
  // :114-117 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :34-42 — stored raw
    value: { type: 'string', coerce: 'none', displayName: 'Value', group: 'General', description: 'The message to sign, as UTF-8 bytes. For a webhook signature this is the raw request body', examples: ['hello', 'The quick brown fox jumps over the lazy dog', 'ünïcödé ☃', 0, false] },
    // :43-51 — stored raw
    key: { type: 'string', coerce: 'none', displayName: 'Key', group: 'General', description: 'The shared secret. Wire this from a Secret node — never type a credential into the graph', examples: ['secret', 'Jefe', '', 0, []] },
    // :52-68 — stored raw
    algorithm: {
      type: 'enum',
      enums: ALGORITHM_VALUES,
      default: 'SHA-256',
      coerce: 'none',
      displayName: 'Algorithm',
      group: 'General',
      description: 'Which SHA-2 digest the HMAC is built on. HMAC-SHA256 is what almost every webhook uses',
      examples: ['SHA-1']
    },
    // :69-85 — stored raw
    encoding: { type: 'enum', enums: ENCODING_VALUES, default: 'hex', coerce: 'none', displayName: 'Encoding', group: 'General', description: 'How the signature bytes are rendered as text. Match whatever the other side sends' },
    // :86-101 — a token per press, one run per frame
    sign: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Computes the signature of Value under Key' }
  },

  outputs: {
    // :105-113
    signature: { type: 'string', from: (s) => s.signature, displayName: 'Signature', group: 'Values', description: 'The HMAC of Value, rendered in Encoding. Available once Done has fired' },
    // :118-126
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why no signature was produced. It names the problem, never the key' }
  }
}).on(
  {
    value: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — as its text, in UTF-8 bytes (nothing, 0 or false as the empty text)', set: { value: v }, send: [] }),
    key: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — nothing, empty, 0 or false fails that Do; otherwise its text in UTF-8 bytes, and a text that is empty fails it too', set: { key: v }, send: [] }),
    algorithm: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it (empty reads as SHA-256; one the host does not know fails that Do)', set: { algorithm: v }, send: [] }),
    encoding: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it (empty reads as hex; one not in the list fails that Do)', set: { encoding: v }, send: [] }),
    // :90-100 — the token is kept until the frame-end run reports it
    sign: (s) => ({ says: 'always: one signature at the end of the frame however many presses, of Value under Key as they stand then — Signature and a cleared Error, then Done per press; no Key, an unknown Algorithm or Encoding puts the reason on Error, Signature untouched, Failure per press', set: { pending: s.pending + 1 }, outcome: 'deferred' })
  },
  {
    // :134-156 `runSign` at the frame end, and the continuation that follows it
    afterInputs: (s) => {
      if (s.pending === 0) return { send: [] };
      const outcomes = (outcome: 'done' | 'failure', error?: string) => Array.from({ length: s.pending }, () => (error === undefined ? { port: 'sign' as const, outcome } : { port: 'sign' as const, outcome, error }));
      const fail = (message: string) => ({ set: { pending: 0, error: message }, send: ['error'] as Array<'error'>, outcomes: outcomes('failure', 'hmac/failed') }); // :129-133
      if (!s.key) return fail(HMAC_NO_KEY); // :139-142
      const algorithm = s.algorithm || 'SHA-256'; // :144
      const encoding = s.encoding || 'hex'; // :145
      let signature: string;
      try {
        signature = encodeBytes(hmacBytes(algorithm, utf8Bytes(s.key), utf8Bytes(s.value || '')), encoding); // :147-149
      } catch (e) {
        return fail((e as Error).message); // :155
      }
      return { set: { pending: 0, signature, error: undefined }, send: ['signature', 'error'], outcomes: outcomes('done') }; // :149-153
    }
  }
);
