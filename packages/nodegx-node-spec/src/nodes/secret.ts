/**
 * Secret (`noodl.cloud.secret`) — read from `packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts` on 2026-10-12 (NSP-022
 * s96). A cloud-only node: graded on the runtime's cloud target, in a backend process the world plays (world.ts HOST).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` takes a token per press and ONE read at the end of the frame (:75-86, :128-140), of the
 * Name as it stands then. Outside a backend (the process has no secret store: `typeof _noodl_get_secret !== 'function'`) every
 * press of the frame fails with the node's sentence and nothing is asked (:147-157). Otherwise the store is asked for the Name
 * — SYNCHRONOUSLY, inside the frame-end run (:159-161) — and answers in one of four ways: it throws (the node does not repeat
 * what it threw: its own sentence, :162-167); it answers nothing, or not found (the store's `error` when it gave one, else the
 * node's sentence, :169-172); or found — Value is the store's value, Error cleared, `done` per press (:174-178). Every failure
 * puts its reason on Error and clears Value (`setError`, :115-121), code `secret/unavailable`.
 */

import { defineNode } from '../spec';
import type { HostScript } from '../world';

type State = {
  name: unknown;
  value: unknown;
  error: string | undefined;
  /** :128-133 `pendingReadOutcomes` — the presses this frame holds tokens for. */
  pending: number;
  /** the presses each read settles, by the spec's call id (ids never repeat) */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

/** :151-155 */
export const SECRET_NO_STORE = 'Secret: no secret store is available. This node only works inside a nodegx-backend cloud function (CWF-009) — it is not usable in the browser viewer.';

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'failure' as const, error: 'secret/unavailable' }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'done' as const }));

/** Every name the pool's Name draws is answered (an unanswered lookup is a violation): found, found empty, not provisioned with and without the store's reason, an empty answer, a store that throws. */
const STORE_ANSWERS: HostScript['answers'] = [
  { match: { service: 'secrets', request: 'STRIPE_KEY' }, answer: { ok: { found: true, value: 'sk_test_51' } } },
  { match: { service: 'secrets', request: 'EMPTY' }, answer: { ok: { found: true, value: '' } } },
  { match: { service: 'secrets', request: 'MISSING' }, answer: { ok: { found: false, error: 'Secret "MISSING" is not set. Add it with `nodegx secrets set MISSING`.' } } },
  { match: { service: 'secrets', request: 'BROKEN' }, answer: { throws: 'EACCES: the vault is locked' } },
  { match: { service: 'secrets', request: 'NOTHING' }, answer: { ok: null } },
  { answer: { ok: { found: false } } }
];

/** The processes a sequence plays in: no store at all (a browser, a test), and a backend's (weighted: it is where the node works). */
const HOSTS: ReadonlyArray<HostScript> = [{}, { services: ['secrets'], answers: STORE_ANSWERS }, { services: ['secrets'], answers: STORE_ANSWERS }];

export const Secret = defineNode({
  type: 'noodl.cloud.secret',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/secret.ts',
  needs: ['host'],
  worldPool: { hosts: HOSTS },

  state: { name: undefined, value: undefined, error: undefined, pending: 0, calls: {}, nextCall: 1 } as State,
  // :99-102 outcomeOutputs({ done, failure })
  outcomes: ['done', 'failure'],

  inputs: {
    // :64-74 — stored raw
    name: { type: 'string', coerce: 'none', displayName: 'Name', group: 'General', description: "Which stored secret to read. A cloud function can only ever read the project's own secrets — the backend's webhook, email, auth and admin credentials are not addressable from here", examples: ['STRIPE_KEY', 'EMPTY', 'MISSING', 'BROKEN', 'NOTHING', 'OTHER', ''] },
    // :75-86 — only the port mints a token
    fetch: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Reads the secret and puts it on Value' }
  },

  outputs: {
    // :88-96
    value: { type: 'string', from: (s) => s.value, displayName: 'Value', group: 'Values', description: 'The secret, available once Done has fired. Blank until then, and blank after a Failure' },
    // :103-111
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the secret could not be read — names the secret and where to put it, never a value' }
  }
}).on(
  {
    name: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it', set: { name: v }, send: [] }),
    fetch: (s) => ({
      says: 'always: one read at the end of the frame however many presses — found: Value and a cleared Error, Done per press; outside a backend, not found, or a store that cannot be read: the reason on Error, Value cleared, Failure per press',
      set: { pending: s.pending + 1 },
      send: [],
      outcome: 'pending'
    })
  },
  {
    // :141-179 `doRead` at the frame end
    afterInputs: (s, _i, w) => {
      if (s.pending === 0) return { send: [] };
      const n = s.pending;
      if (!w.hostHas('secrets')) return { set: { pending: 0, error: SECRET_NO_STORE, value: undefined }, send: ['error', 'value'], outcomes: failures(n) }; // :147-157
      const id = 'read:' + s.nextCall;
      return { set: { pending: 0, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 }, send: [], host: { id, service: 'secrets', request: s.name } }; // :159-161
    },
    world: {
      // :159-178 — the store's answer, inside the run
      host: (s, _i, answer) => {
        const n = s.calls[answer.id] ?? 0;
        const fail = (message: string) => ({ set: { error: message, value: undefined }, send: ['error', 'value'] as Array<'error' | 'value'>, outcomes: failures(n) });
        if ('threw' in answer) return fail('Secret: the secret store could not be read.'); // :162-167
        const result = answer.ok as { found?: unknown; value?: unknown; error?: unknown } | null | undefined;
        if (!result || !result.found) return fail(((result && result.error) as string) || 'Secret: the secret could not be read.'); // :169-172
        return { set: { error: undefined, value: result.value }, send: ['error', 'value'], outcomes: dones(n) }; // :174-178
      }
    }
  }
);
