/**
 * Log In (`net.noodl.user.LogIn`), Sign Up (`net.noodl.user.SignUp`) and Log Out (`net.noodl.user.LogOut`) — read from
 * `packages/noodl-viewer-react/src/nodes/std-library/user/{login,signup,logout}.ts` on 2026-10-02 (NSP-014 s27), with the
 * viewer's `userservice.ts` and `RestAuthAdapter.ts` beside them. The three nodes that MOVE the session the User node shows
 * (user.ts): one shape, three operations, so one factory.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from (login.ts unless named).
 *
 * HELD VALUES: Username and Password (Log In :84-98, Sign Up :105-120) and Sign Up's Email (:121-129) are held as they
 * arrive, no conversion. Sign Up's `prop-<field>` inputs (`registerInputIfNeeded` signup.ts :185-195 — the accounts table's
 * columns, from the project's schema; a play declares `nick` and `n`) are held in ONE object the node keeps for its life
 * (:72, :180-182 — a value is never removed, `undefined` included). Log Out holds nothing. None of the three has a Backend
 * input: every call goes to the ACTIVE backend (userservice.ts :357-365, `backendId` absent).
 *
 * DO (:75-80 → :126-161): one token per press, minted before the guard; ONE call per frame for any number of presses
 * (`logInScheduled`). At the frame end the node reaches the service (`UserService.instance`, :143 — the first reach in a
 * play makes it, and its start-up check, world.ts AUTH) and hands it the operation with the held values AS THEY ARE AT THE
 * FRAME END: `logIn({ username, password })`, `signUp({ username, password, email, properties })`, `logOut({})`. The batch is
 * taken before the call goes out (:140-141): a press while the call is in flight is the next frame's batch, its own call.
 * Success: every press of the batch Done (:146-148). Failure: Error is the message AS GIVEN — no fallback sentence, so a
 * failure with none sends nothing on Error (`undefined` is never sent, CONTRACT C3) — and every press Failure with the node's
 * code (:149-151 → `setError` :109-117). Error is never cleared. No Unchanged on any of the three (:57-58; signup.ts :79-80;
 * logout.ts :48-51).
 *
 * WHAT THE CALL DOES TO THE SESSION is the backend's (world.ts AUTH, s27): a sign-in or sign-up that succeeds REPLACES it
 * with the answer and announces `loggedIn` after the Done; a sign-out clears it WHATEVER the backend answers and announces
 * `loggedOut` — so on every backend here Log Out's Failure and Error never fire (the adapter's `finish` on both `ok` and
 * `fail`, RestAuthAdapter.ts :1064-1083), and with nobody signed in it is Done inside the call (:1070-1073). A User node
 * shows it, graph-side (graph s10).
 *
 * NOT GRADED HERE, named:
 *   - the capability gate (`begin`) and each wire's own steps inside a sign-in — world.ts AUTH "Not played";
 *   - Sign Up's ports as the editor offers them (`updatePorts` signup.ts :198-252, from the `systemCollections` metadata —
 *     a viewer-with-editor path, NSP-020's);
 *   - the editor's warnings (`clearWarnings`) and the error-channel raise — not ports.
 */

import type { BackendAnswerEvent, ValueInputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import type { BackendScript } from '../world';
import { USER_FIELDS } from './user';

/** login.ts :22, signup.ts :30, logout.ts :22 */
export const LOG_IN_ERROR_CODE = 'user/log-in-failed';
export const SIGN_UP_ERROR_CODE = 'user/sign-up-failed';
export const LOG_OUT_ERROR_CODE = 'user/log-out-failed';

type ActionState = {
  username: unknown;
  password: unknown;
  email: unknown;
  /** Sign Up's `_internal.userProperties` — every `prop-` value ever written, by field */
  properties: Readonly<Record<string, unknown>>;
  /** `_internal.error` (:110) */
  error: string | undefined;
  /** `logInScheduled` / `signUpScheduled` / `logOutScheduled` */
  scheduled: boolean;
  /** `pendingLogIn.length` — the presses the frame's batch holds (:129-130) */
  presses: number;
  /** every call made, by the spec's call id: how many presses its answer settles */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
};

const INITIAL: ActionState = { username: undefined, password: undefined, email: undefined, properties: {}, error: undefined, scheduled: false, presses: 0, calls: {}, nextCall: 1 };

/** The account a world signs in: the user's fields flat, as the adapter flattens a sign-in's answer (world.ts AUTH). */
export const ANN = { objectId: 'u1', email: 'ann@example.com', username: 'ann', nick: 'Ann', n: 1 };
const BEA = { objectId: 'u2', email: 'bea@example.com', username: 'bea', nick: 'Bea', n: 2 };
/** The service's start-up check, never answered — the pools that hold a session at the start script it so it is not a violation. */
export const NO_CHECK = { match: { op: 'fetchCurrentUser' }, answer: { never: true as const } };

/** The backends a sequence plays with, for one operation: it succeeds at once and late, is refused with and without a message, is never answered — with nobody signed in and with somebody. */
export function pool(op: string, ok: unknown): ReadonlyArray<BackendScript> {
  return [
    { answers: [{ match: { op }, answer: { ok } }] },
    { answers: [{ match: { op }, answer: { ok }, after: 20 }] },
    { sessions: { main: ANN }, answers: [NO_CHECK, { match: { op }, answer: { ok } }] },
    { answers: [{ match: { op }, answer: { error: 'Invalid credentials.' } }] },
    { answers: [{ match: { op }, answer: { error: null }, after: 1 }] },
    { sessions: { main: ANN }, answers: [NO_CHECK, { match: { op }, answer: { error: 'HTTP 503: {}' }, after: 5 }] },
    { answers: [{ match: { op }, answer: { never: true } }] }
  ];
}

export const stringInput = (displayName: string, description: string, examples: unknown[]): ValueInputDecl => ({ type: 'string', coerce: 'none', displayName, group: 'General', description, examples });

export const failures = <P extends string>(port: P, code: string, n: number) => Array.from({ length: n }, () => ({ port, outcome: 'failure' as const, error: code }));
export const dones = <P extends string>(port: P, n: number) => Array.from({ length: n }, () => ({ port, outcome: 'done' as const }));

/** :78-80 → :126-133 — a token per press, minted before the guard; one call per frame */
const press = (s: ActionState) => ({ set: s.scheduled ? { presses: s.presses + 1 } : { presses: s.presses + 1, scheduled: true }, send: [] as never[], outcome: 'pending' as const });

/** :135-160 — the frame's batch: one call, to the active backend, with the held values as they are now */
function batch(s: ActionState, w: WorldView, op: 'logIn' | 'signUp' | 'logOut', args: Record<string, unknown>) {
  if (!s.scheduled) return { send: [] as never[] };
  const n = s.presses;
  w.userService(); // :143 — `UserService.instance`: the first reach makes the service
  const backend = w.backendFor(undefined) as string; // userservice.ts :357-365 — no `backendId`: the active one, never none
  const id = op + ':' + s.nextCall;
  return {
    set: { presses: 0, scheduled: false, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 },
    send: [] as never[],
    backend: { id, op, backend, args }
  };
}

/** :146-151 — Done for every press of the batch; or Error as given (:109-117) and Failure with the node's code */
function answered<P extends string>(s: ActionState, answer: BackendAnswerEvent, port: P, code: string) {
  const n = s.calls[answer.id] ?? 0;
  if (!('ok' in answer)) return { set: { error: answer.error }, send: ['error' as const], outcomes: failures(port, code, n) };
  return { set: {}, send: [] as never[], outcomes: dones(port, n) };
}

const errorOutput = (description: string) => ({ type: 'string' as const, displayName: 'Error', group: 'Error', description, from: (s: ActionState) => s.error }); // :63-71

export const LogIn = defineNode({
  type: 'net.noodl.user.LogIn',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/user/login.ts; userservice.ts; RestAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: pool('logIn', BEA) },
  state: INITIAL,
  outcomes: ['done', 'failure'],
  inputs: {
    // :75-81
    login: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Attempts to sign in with Username and Password' },
    username: stringInput('Username', 'Username to sign in as', ['bea', '']), // :82-90
    password: stringInput('Password', 'Password to sign in with', ['secret', '']) // :91-99
  },
  outputs: { error: errorOutput('Why the last sign-in failed; empty until one does') }
}).on(
  {
    login: press,
    username: (_s, v) => ({ set: { username: v }, send: [] }),
    password: (_s, v) => ({ set: { password: v }, send: [] })
  },
  {
    afterInputs: (s, _i, w) => batch(s, w, 'logIn', { username: s.username, password: s.password }), // :143-146
    world: { backend: (s, _i, answer) => answered(s, answer, 'login', LOG_IN_ERROR_CODE) }
  }
);

export const SignUp = defineNode({
  type: 'net.noodl.user.SignUp',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/user/signup.ts; userservice.ts; RestAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: pool('signUp', BEA) },
  state: INITIAL,
  outcomes: ['done', 'failure'],
  inputs: {
    // signup.ts :97-103
    signup: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Creates an account from the values below and signs it in' },
    username: stringInput('Username', 'Username for the new account', ['bea', '']), // :104-112
    password: stringInput('Password', 'Password for the new account', ['secret', '']), // :113-121
    email: stringInput('Email', 'Email address for the new account; leave blank if the project does not ask for one', ['bea@example.com', '']) // :122-130
  },
  outputs: { error: errorOutput('Why the last sign-up failed; empty until one does') }
}).on(
  {
    signup: press,
    username: (_s, v) => ({ set: { username: v }, send: [] }),
    password: (_s, v) => ({ set: { password: v }, send: [] }),
    email: (_s, v) => ({ set: { email: v }, send: [] })
  },
  {
    derived: {
      inputs: () => ({}),
      // signup.ts :185-195 registerInputIfNeeded — any `prop-` name, held by its field
      discover: (port) => {
        if (!port.startsWith('prop-')) return undefined;
        const field = port.slice('prop-'.length);
        return { type: '*', coerce: 'none', displayName: field, group: 'Properties', description: 'Value of ' + field + ' for the new account', examples: ['Annie', 2, '', null] };
      },
      candidates: USER_FIELDS.map((f) => 'prop-' + f),
      on: (s, port, v) => ({ set: { properties: { ...(s as ActionState).properties, [port.slice('prop-'.length)]: v } }, send: [] }) // :180-182
    },
    afterInputs: (s, _i, w) => batch(s, w, 'signUp', { username: s.username, password: s.password, email: s.email, properties: s.properties }), // signup.ts :166-170
    world: { backend: (s, _i, answer) => answered(s, answer, 'signup', SIGN_UP_ERROR_CODE) }
  }
);

export const LogOut = defineNode({
  type: 'net.noodl.user.LogOut',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/user/logout.ts; userservice.ts; RestAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: pool('logOut', null) },
  state: INITIAL,
  outcomes: ['done', 'failure'],
  inputs: {
    // logout.ts :67-76 — named `login`: persisted in every project, never corrected
    login: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Signs the current user out and clears the stored session' }
  },
  outputs: { error: errorOutput('Why the last sign-out failed; empty until one does') }
}).on(
  { login: press },
  {
    afterInputs: (s, _i, w) => batch(s, w, 'logOut', {}), // logout.ts :110-117 — the callbacks only
    world: { backend: (s, _i, answer) => answered(s, answer, 'login', LOG_OUT_ERROR_CODE) }
  }
);
