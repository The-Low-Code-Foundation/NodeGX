/**
 * Set User Properties (`net.noodl.user.SetUserProperties`) — read from
 * `packages/noodl-runtime/src/nodes/std-library/user/setuserproperties.ts` on 2026-10-02 (NSP-014 s26), with the viewer's
 * `userservice.ts` and `RestAuthAdapter.ts` beside it. The write half of the User node (user.ts): it hands the signed-in
 * account's new values to its backend.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * HELD VALUES: `Email` and `Username` are held as they arrive (:129-141, no conversion); every `prop-<field>` input a
 * graph wires (`registerInputIfNeeded` :222-225 — the accounts table's columns, from the project's schema; a play
 * declares `nick` and `n`) is held in ONE object the node keeps for its life (:204-206, `userProperties` — a value is
 * never removed, `undefined` included). The Backend picker (:215-220) is stored raw.
 *
 * DO (:167-203): one token per press; ONE write per frame for any number of presses (`storeScheduled`). At the frame end
 * the node reaches the service (`forScope`, :188 — the first reach in a play makes it, world.ts AUTH) and hands it
 * `setUserProperties({ backendId, email, username, properties })` — the held values as they are AT THE FRAME END. A Backend
 * the project does not have: the service's sentence (userservice.ts :228-231, :430-431), no call. Otherwise the call goes
 * to that backend (world.ts AUTH — `Nobody is signed in.` at once when it holds no session). Success: every press Done
 * (:193-195). Failure: Error is the message AS GIVEN — no fallback sentence, so a failure with none sends nothing on Error
 * (`undefined` is never sent, CONTRACT C3) — and every press Failure with `user/set-properties-failed` (:197-200).
 * Error is never cleared. No Unchanged (:94-95). What the write does to the session is the backend's (world.ts AUTH: the
 * REST adapter writes the properties and Email, NEVER Username — a User node shows it, graph-side).
 *
 * NOT GRADED HERE, named:
 *   - the serialisation of a property for the Parse wire (`serializeObject`) — the world's backends are REST ones;
 *   - the server-owned fields the REST adapter drops from the body (world.ts `REST_USER_READONLY_FIELDS`): the editor never
 *     offers them as ports (user-ports.ts rule 3), so no play writes one;
 *   - the editor's warnings (`clearWarnings`) and the error-channel raise — not ports.
 */

import type { ValueInputDecl } from '../spec';
import { defineNode } from '../spec';
import type { BackendScript } from '../world';
import { USER_FIELDS, USER_NO_BACKEND_MESSAGE } from './user';

/** :41 */
export const SET_USER_PROPERTIES_ERROR_CODE = 'user/set-properties-failed';

type SetUserState = {
  /** `_internal.userProperties` — every `prop-` value ever written, by field */
  properties: Readonly<Record<string, unknown>>;
  /** `_internal.email` / `_internal.username` (:130, :139) */
  email: unknown;
  username: unknown;
  /** `_internal.backendId` (:218) */
  backendId: unknown;
  /** `_internal.error` (:152) */
  error: string | undefined;
  /** `storeScheduled` */
  storeScheduled: boolean;
  /** `pendingStore.length` — the presses the frame's batch holds (:173-174) */
  presses: number;
  /** every write made, by the spec's call id: how many presses its answer settles */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'failure' as const, error: SET_USER_PROPERTIES_ERROR_CODE }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'done' as const }));

/** :222-225 — a `prop-` input: held, by its field name. */
function propertyInput(p: string): ValueInputDecl {
  return { type: '*', coerce: 'none', displayName: p, group: 'Properties', description: 'New value of ' + p + ' for the signed-in user', examples: ['Annie', 2, '', null] };
}

const SESSION = { objectId: 'u1', email: 'ann@example.com', username: 'ann', nick: 'Ann', n: 1 };
const NO_CHECK = { match: { op: 'fetchCurrentUser' }, answer: { never: true as const } };

/**
 * The backends a sequence plays with. Every one with a session answers `fetchCurrentUser` (the service's start-up check,
 * made at the first Do): the write succeeds, at once and late; it is refused with and without a message; it is never
 * answered; nobody is signed in; and a project with two backends, each holding its own account.
 */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { sessions: { main: SESSION }, answers: [NO_CHECK, { match: { op: 'setUserProperties' }, answer: { ok: { objectId: 'u1' } } }] },
  { sessions: { main: SESSION }, answers: [NO_CHECK, { match: { op: 'setUserProperties' }, answer: { ok: { objectId: 'u1' } } }] },
  { sessions: { main: SESSION }, answers: [NO_CHECK, { match: { op: 'setUserProperties' }, answer: { ok: { objectId: 'u1' } }, after: 20 }] },
  { sessions: { main: SESSION }, answers: [NO_CHECK, { match: { op: 'setUserProperties' }, answer: { error: 'Forbidden' } }] },
  { sessions: { main: SESSION }, answers: [NO_CHECK, { match: { op: 'setUserProperties' }, answer: { error: null }, after: 1 }] },
  { sessions: { main: SESSION }, answers: [NO_CHECK, { match: { op: 'setUserProperties' }, answer: { never: true } }] },
  { answers: [{ answer: { ok: { objectId: 'u1' } } }] },
  {
    backends: ['main', 'other'],
    sessions: { main: SESSION, other: { objectId: 'u9', nick: 'Otto' } },
    answers: [NO_CHECK, { match: { op: 'setUserProperties', backend: 'other' }, answer: { ok: { objectId: 'u9' } } }, { match: { op: 'setUserProperties' }, answer: { error: 'Not here' } }]
  }
];

export const SetUserProperties = defineNode({
  type: 'net.noodl.user.SetUserProperties',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/user/setuserproperties.ts; noodl-viewer-react/.../user/userservice.ts; RestAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: BACKENDS },

  state: {
    properties: {},
    email: undefined,
    username: undefined,
    backendId: undefined,
    error: undefined,
    storeScheduled: false,
    presses: 0,
    calls: {},
    nextCall: 1
  } as SetUserState,
  // :96-100 outcomeOutputs({ done, failure }) — no Unchanged (:94-95)
  outcomes: ['done', 'failure'],

  inputs: {
    // :112-123
    store: {
      type: 'signal',
      outcome: true,
      displayName: 'Do',
      group: 'Actions',
      description: 'Writes the values below to the signed-in user, and fails when nobody is signed in'
    },
    // :124-132
    email: {
      type: 'string',
      coerce: 'none',
      displayName: 'Email',
      group: 'General',
      description: 'New email address for the signed-in user; leave blank to keep the current one',
      examples: ['new@example.com', '']
    },
    // :133-141
    username: {
      type: 'string',
      coerce: 'none',
      displayName: 'Username',
      group: 'General',
      description: 'New username for the signed-in user; leave blank to keep the current one',
      examples: ['annie', '']
    }
  },

  outputs: {
    // :101-109
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last write failed; empty until one does', from: (s) => s.error }
  }
}).on(
  {
    // :120-122 → :167-177 — a token per press, one write per frame
    store: (s) => ({ set: s.storeScheduled ? { presses: s.presses + 1 } : { presses: s.presses + 1, storeScheduled: true }, send: [], outcome: 'pending' }),
    // :129-131, :138-140 — held as they arrive
    email: (_s, v) => ({ set: { email: v }, send: [] }),
    username: (_s, v) => ({ set: { username: v }, send: [] })
  },
  {
    derived: {
      inputs: () => ({}),
      // :207-226 registerInputIfNeeded — the Backend picker and any `prop-` name
      discover: (port) => {
        if (port === 'backendId') return { type: '*', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', description: 'Which backend this node writes the signed-in user to', examples: ['_active_', 'other', 'gone', ''] };
        if (port.startsWith('prop-')) return propertyInput(port.slice('prop-'.length));
        return undefined;
      },
      candidates: ['backendId', ...USER_FIELDS.map((f) => 'prop-' + f)],
      on: (s, port, v) => {
        const st = s as SetUserState;
        if (port === 'backendId') return { set: { backendId: v }, send: [] }; // :218
        return { set: { properties: { ...st.properties, [port.slice('prop-'.length)]: v } }, send: [] }; // :205
      }
    },
    // :179-202 — the frame's batch: one write
    afterInputs: (s, _i, w) => {
      if (!s.storeScheduled) return { send: [] };
      const n = s.presses;
      const base = { presses: 0, storeScheduled: false };
      w.userService(); // :188 — `forScope`: the first reach makes the service
      const backend = w.backendFor(s.backendId);
      if (backend === undefined) return { set: { ...base, error: USER_NO_BACKEND_MESSAGE(s.backendId) }, send: ['error'], outcomes: failures(n) };
      const id = 'store:' + s.nextCall;
      return {
        set: { ...base, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 },
        send: [],
        backend: { id, op: 'setUserProperties', backend, args: { backendId: s.backendId, email: s.email, username: s.username, properties: s.properties } }
      };
    },
    world: {
      backend: (s, _i, answer) => {
        const n = s.calls[answer.id] ?? 0;
        if (!('ok' in answer)) return { set: { error: answer.error }, send: ['error'], outcomes: failures(n) }; // :197-200 — as given
        return { set: {}, send: [], outcomes: dones(n) }; // :193-195
      }
    }
  }
);
