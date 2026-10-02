/**
 * User (`net.noodl.user.User`) — read from `packages/noodl-runtime/src/nodes/std-library/user/user.ts` on 2026-10-02
 * (NSP-014 s26), with the viewer's `userservice.ts` (the service every user node reaches) and `RestAuthAdapter.ts` beside
 * it. The node is the Record node's twin for the signed-in account (record.ts): a WINDOW onto one shared record — the
 * `_User` record the session names — that a Fetch re-reads from the backend.
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: what the node shows is the session its backend holds (world.ts AUTH). READING it
 * (`currentUserModel`, :388-395 → userservice.ts `currentFor` :489-510) resolves the node's Backend (`_handle` :199-215 —
 * absent or `_active_` the active one, an id the project has that one, anything else NONE), takes that backend's session
 * and hands it to the record store (`_fromJSON(user, '_User')`, world.ts `userRecordEvent`) — a WRITE of every key on the
 * record of its `objectId`, which the node hears itself when it is already bound to that record (:103-112 — written here
 * beside the write, registry.ts) — and binds that record; no session, no backend: nothing bound. BINDING (`setUserModel`
 * :353-379) moves the subscription when the record differs, then re-sends Id, Authenticated, Email, Username and Roles,
 * and every property output for a key the record holds. ⚠️ A session that ENDS binds nothing, and nothing is sent for
 * what went: Id, Email, Username and the properties read `undefined`, which is never sent (CONTRACT C3) — every wire
 * from them keeps the user who just left; only Authenticated moves (row C47).
 *
 * MOUNT (`initialize` :101-149): the node reaches the service (`forScope`, :114 — the first reach in a play makes it, and
 * its start-up check, world.ts AUTH), reads the session, then listens to the four session events: `loggedIn` (read, then
 * Logged In), `sessionGained` (read), `loggedOut` (read, then Logged Out), `sessionLost` (read, then Session Lost) — for
 * every backend's, whichever this node shows (:136-139).
 *
 * FETCH (:396-426): one token per press; ONE call per frame for any number of presses (`scheduleOnce`). At the frame end
 * the node hands the service `fetchCurrentUser({ backendId: <the Backend input> })`: a Backend the project does not have
 * is refused by the service with its sentence (userservice.ts :228-231, :270-277 — no call); otherwise the call goes to
 * that backend (world.ts AUTH — `Nobody is signed in.` at once when it holds no session). Success: read, Fetched, every
 * press Done (:414-420). Failure: Error is the message, or `Failed to fetch.` (:421-423), every press Failure with
 * `user/fetch-failed`. Error is never cleared. No Unchanged: a Fetch always re-reads (:193-194).
 *
 * WATCHING (:103-112): every write of a key on the bound record — by the service's bridge, by another node's read, by a
 * Set User Properties' success — when the `User properties` checkbox is on re-sends `prop-<key>` and pulses
 * `<key> Changed` when the node has that output, and pulses Changed for any key.
 *
 * THE BACKEND input (`registerInputIfNeeded` :436-446): a dynamic port, stored raw, the node re-reads at once.
 *
 * THE PROPERTY OUTPUTS: `prop-<field>` and `<field> Changed` exist when a graph wires them (`registerOutputIfNeeded`
 * :447-463) — the fields are the accounts table's, from the project's schema (user-ports.ts). A play declares the two
 * every world here holds, `nick` and `n` (USER_FIELDS). `Logged In`, `Logged Out`, `Session Lost` likewise (:452-456).
 *
 * NOT GRADED HERE, named:
 *   - a session field holding an OBJECT: the store turns it into an anonymous record on every read (cloudstore.js
 *     `_deserializeJSON` :380-385 — a draw from the world's random stream each time); scalars and arrays only;
 *   - the editor's warnings (`clearWarnings`) and the error-channel raise — not ports;
 *   - a cloud runtime's request-scoped user (`currentFor` absent → `current`, :393-394);
 *   - the service's `current` model: no node here reads it.
 */

import type { ChangeEvent, OutputDecl, WorldView } from '../spec';
import { defineNode } from '../spec';
import { userRecordEvent, type BackendScript } from '../world';
import { runOnChange } from './data-base';

/** The fields a play's graph wires from a User (THE PROPERTY OUTPUTS above) — the accounts table's, in a project. */
export const USER_FIELDS = ['nick', 'n'] as const;

/** :32 */
export const USER_FETCH_ERROR_CODE = 'user/fetch-failed';

/** userservice.ts :228-231 — `${backendId}` through a template literal. */
export const USER_NO_BACKEND_MESSAGE = (backendId: unknown) => `The backend this node is set to ("${String(backendId)}") is not configured in this project.`;

type UserState = {
  /** `_internal.model`, by its id (`undefined` = nobody) */
  bound: string | undefined;
  /** `_internal.backendId` (:442) */
  backendId: unknown;
  /** `_internal.error` (:338) */
  error: string | undefined;
  /** `hasScheduledFetch` */
  fetchScheduled: boolean;
  /** `pendingFetch.length` — the presses the frame's batch holds (:400-401) */
  presses: number;
  /** every fetch made, by the spec's call id: how many presses its answer settles */
  calls: Readonly<Record<string, number>>;
  nextCall: number;
  /** the `User properties` checkbox as last written — the Backend's reducer cannot read inputs (`shouldRunOnValueChange('user')`, :105) */
  live: boolean;
};

/** The pulses a reaction queues, in the runtime's order — derived and declared interleaved (spec.ts `pulses`). */
type Reaction = { pulses: Array<'changed' | 'fetched' | { derived: string }> };
const reaction = (): Reaction => ({ pulses: [] });

const failures = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'failure' as const, error: USER_FETCH_ERROR_CODE }));
const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'fetch' as const, outcome: 'done' as const }));

const isField = (key: string) => (USER_FIELDS as readonly string[]).includes(key);

/** Only the keys a patch CHANGES (record.ts: a spread-everything `set` makes drop-set mutants meaningless). */
function changes(before: Readonly<UserState>, after: UserState, keys: ReadonlyArray<keyof UserState>): Partial<UserState> {
  const out: Partial<UserState> = {};
  for (const k of keys) if (!Object.is(before[k], after[k])) (out as Record<string, unknown>)[k] = after[k];
  return out;
}

/** :103-112 onModelChangedCallback — this node's reaction to a write of `key` on its bound record. */
function react(st: UserState, w: WorldView, key: string, on: boolean, r: Reaction): void {
  if (!on) return;
  if (isField(key)) {
    w.send('prop-' + key, st); // :107 — at the flag
    r.pulses.push({ derived: 'changed-' + key }); // :109
  }
  r.pulses.push('changed'); // :111
}

/**
 * :388-395 currentUserModel → userservice.ts `currentFor` :489-510: the node's backend's session, handed to the record store
 * (`_fromJSON` — every key written; one that differs on the record this node is bound to is heard by it), its record's id.
 */
function currentUser(st: UserState, w: WorldView, on: boolean, r: Reaction): string | undefined {
  const backend = w.backendFor(st.backendId);
  if (backend === undefined) return undefined;
  const session = w.session(backend);
  if (session === undefined) return undefined;
  const e = userRecordEvent(session);
  const m = w.registry.model(e.objectId);
  const mine = st.bound !== undefined && m.getId() === st.bound;
  m._class = e.collection;
  for (const key in e.object) {
    if (key === 'objectId' || key === 'ACL') continue;
    const differs = m.get(key) !== e.object[key];
    m.set(key, e.object[key]);
    if (mine && differs) react(st, w, key, on, r);
  }
  return m.getId();
}

/** :353-379 setUserModel — move the subscription when the record differs; re-send the five; every property the record holds. */
function setUserModel(st: UserState, w: WorldView, id: string | undefined): void {
  if (st.bound !== id) {
    if (st.bound !== undefined) w.unwatch({ model: st.bound }); // :358-360
    st.bound = id;
    if (id !== undefined) w.watch({ model: id }); // :363
  }
  for (const port of ['id', 'authenticated', 'email', 'username', 'roles']) w.send(port, st); // :365-372
  if (id === undefined) return; // :375
  for (const key of Object.keys(w.registry.model(id).data)) if (isField(key)) w.send('prop-' + key, st); // :376-378
}

/** Read and bind — what every path that re-reads the session does (`setUserModel(this.currentUserModel())`). */
function reread(st: UserState, w: WorldView, on: boolean, r: Reaction): void {
  setUserModel(st, w, currentUser(st, w, on, r));
}

/** The property output a graph wires (:459-462, `getUserProperty` :464-466 — `get(name)`). */
function propertyOutput(p: string): OutputDecl<UserState> {
  return {
    type: '*',
    displayName: p,
    group: 'Properties',
    description: 'The ' + p + ' property of the signed-in user',
    from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get(p) : undefined)
  };
}

const SESSION = { objectId: 'u1', email: 'ann@example.com', username: 'ann', nick: 'Ann', n: 1 };

/**
 * The backends a sequence plays with. Every one answers `fetchCurrentUser` (the start-up check is made whenever the active
 * backend holds a session): signed in and the backend agrees, signed in and the backend moved a field, nobody signed in, a
 * session the backend rejects (401 — rows C46, C47), a backend that is down (503 — row C45), late, silent, a user with
 * roles, and a project with two backends each holding its own account.
 */
const BACKENDS: ReadonlyArray<BackendScript> = [
  { sessions: { main: SESSION }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { ok: { objectId: 'u1', nick: 'Ann' } } }] },
  { sessions: { main: SESSION }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { ok: { objectId: 'u1', nick: 'Annie', n: 2 } } }] },
  { answers: [{ answer: { ok: { objectId: 'u1' } } }] },
  { sessions: { main: SESSION }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { error: 'Token expired.', lost: true }, after: 3 }] },
  { sessions: { main: SESSION }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { error: 'HTTP 503: {}' }, after: 2 }] },
  { sessions: { main: SESSION }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { ok: { objectId: 'u1', nick: 'late' } }, after: 50 }] },
  { sessions: { main: SESSION }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { never: true } }] },
  { sessions: { main: { ...SESSION, roles: ['editor'] } }, answers: [{ match: { op: 'fetchCurrentUser' }, answer: { ok: { objectId: 'u1', roles: ['editor', 'admin'] } }, after: 1 }] },
  {
    backends: ['main', 'other'],
    sessions: { main: SESSION, other: { objectId: 'u9', email: 'otto@example.com', nick: 'Otto' } },
    answers: [
      { match: { op: 'fetchCurrentUser', backend: 'other' }, answer: { ok: { objectId: 'u9', n: 9 } } },
      { match: { op: 'fetchCurrentUser' }, answer: { error: null }, after: 5 }
    ]
  }
];

export const UserNode = defineNode({
  type: 'net.noodl.user.User',
  version: 1,
  source: 'packages/noodl-runtime/src/nodes/std-library/user/user.ts; noodl-viewer-react/.../user/userservice.ts; RestAuthAdapter.ts',
  needs: ['backend', 'registry', 'clock'],
  worldPool: { backends: BACKENDS },

  state: {
    bound: undefined,
    backendId: undefined,
    error: undefined,
    fetchScheduled: false,
    presses: 0,
    calls: {},
    nextCall: 1,
    live: true
  } as UserState,
  // :195-199 outcomeOutputs({ done, failure }) — no Unchanged: a Fetch always re-reads (:193-194)
  outcomes: ['done', 'failure'],

  // :114-116 — the service reached (made, the first time in a play), then the session read and bound
  init: (w) => {
    w.userService();
    const st: UserState = { bound: undefined, backendId: undefined, error: undefined, fetchScheduled: false, presses: 0, calls: {}, nextCall: 1, live: true };
    const id = currentUser(st, w, true, reaction());
    if (id !== undefined) w.watch({ model: id });
    return { bound: id };
  },

  inputs: {
    // :306-313
    fetch: {
      type: 'signal',
      outcome: true,
      displayName: 'Fetch',
      group: 'Actions',
      description: 'Re-reads the signed-in user from the backend, which is also how an expired session is discovered'
    },
    // :97-100 runOnValueChange: sources [user]
    'runOnChange-user': runOnChange('User properties')
  },

  outputs: {
    // :160-168
    id: { type: 'string', displayName: 'Id', group: 'General', description: 'Id of the signed-in user record; empty while nobody is signed in', from: (s) => s.bound },
    // :169-174
    fetched: { type: 'signal', displayName: 'Fetched', group: 'Events', description: 'Fires once the user record has been re-read and the outputs below are up to date' },
    // :175-180
    changed: { type: 'signal', displayName: 'Changed', group: 'Events', description: 'Fires when a property of the signed-in user changes, including a change another node made' },
    // :200-208
    error: { type: 'string', displayName: 'Error', group: 'Error', description: 'Why the last read failed; empty until one does', from: (s) => s.error },
    // :246-261 — only a real list; anything else is a backend this port cannot speak for
    roles: {
      type: 'array',
      displayName: 'Roles',
      group: 'General',
      description:
        'Roles the signed-in user is in, resolved by the server on each session read; empty while nobody is ' +
        'signed in, and not set on backends that do not track roles',
      from: (s, w) => {
        if (s.bound === undefined) return undefined;
        const roles = w.registry.model(s.bound).get('roles');
        return Array.isArray(roles) ? roles : undefined;
      }
    },
    // :262-270
    username: {
      type: 'string',
      displayName: 'Username',
      group: 'General',
      description: 'Username of the signed-in user; empty while nobody is signed in',
      from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get('username') : undefined)
    },
    // :271-279
    email: {
      type: 'string',
      displayName: 'Email',
      group: 'General',
      description: 'Email address of the signed-in user; empty while nobody is signed in',
      from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get('email') : undefined)
    },
    // :280-288
    authenticated: {
      type: 'boolean',
      displayName: 'Authenticated',
      group: 'General',
      description: 'True while somebody is signed in on this device; a server render always sees false',
      from: (s) => s.bound !== undefined
    }
  }
}).on(
  {
    // :310-312 → :396-402 — a token per press, one call per frame
    fetch: (s) => ({ set: { presses: s.presses + 1, fetchScheduled: true }, send: [], outcome: 'pending' }),
    // run-on-value-change.ts :137 — stored; read by the watcher (:105)
    'runOnChange-user': (s, v) => ({ set: s.live === v ? {} : { live: v }, send: [] })
  },
  {
    derived: {
      inputs: () => ({}),
      // :447-463 — the property outputs a graph wires, each one's Changed beside it, and the three session signals (:452-456, browser only)
      outputs: () => {
        const out: Record<string, OutputDecl<UserState>> = {};
        for (const p of USER_FIELDS) {
          out['prop-' + p] = propertyOutput(p);
          out['changed-' + p] = { type: 'signal', displayName: p + ' Changed', group: 'Events', description: 'Fires when the ' + p + ' property of the signed-in user changes' };
        }
        out.loggedIn = { type: 'signal', displayName: 'Logged In', group: 'Events', description: 'Fires when somebody signs in, on any backend' };
        out.loggedOut = { type: 'signal', displayName: 'Logged Out', group: 'Events', description: 'Fires when somebody signs out, on any backend' };
        out.sessionLost = { type: 'signal', displayName: 'Session Lost', group: 'Events', description: 'Fires when a session ends without the user asking, on any backend' };
        return out;
      },
      // :436-446 registerInputIfNeeded — the Backend picker only (user-ports.ts: hidden with one backend)
      discover: (port) =>
        port === 'backendId'
          ? { type: '*', coerce: 'none', editOnly: true, displayName: 'Backend', group: 'General', description: 'Which backend this node reads the signed-in user from', examples: ['_active_', 'other', 'gone', ''] }
          : undefined,
      candidates: ['backendId'],
      // :441-444 — stored raw, the session re-read at once
      on: (s, port, v, _d, w) => {
        if (port !== 'backendId') return { send: [] };
        const st: UserState = { ...(s as UserState), backendId: v };
        const r = reaction();
        reread(st, w, st.live, r);
        return { set: changes(s as UserState, st, ['backendId', 'bound']), send: [], pulses: r.pulses };
      }
    },
    // :403-425 — the frame's batch: one call
    afterInputs: (s, _i, w) => {
      if (!s.fetchScheduled) return { send: [] };
      const n = s.presses;
      const base = { presses: 0, fetchScheduled: false };
      // :409 → userservice.ts :381-384 `_resolved` — a Backend the project does not have: the service's sentence, no call
      const backend = w.backendFor(s.backendId);
      if (backend === undefined) return { set: { ...base, error: USER_NO_BACKEND_MESSAGE(s.backendId) }, send: ['error'], outcomes: failures(n) };
      const id = 'fetch:' + s.nextCall;
      return {
        set: { ...base, calls: { ...s.calls, [id]: n }, nextCall: s.nextCall + 1 },
        send: [],
        backend: { id, op: 'fetchCurrentUser', backend, args: { backendId: s.backendId } }
      };
    },
    world: {
      backend: (s, i, answer, w) => {
        const n = s.calls[answer.id] ?? 0;
        if (!('ok' in answer)) return { set: { error: answer.error || 'Failed to fetch.' }, send: ['error'], outcomes: failures(n) }; // :421-423
        // :414-420 — read, then Fetched, then the batch's outcome
        const st: UserState = { ...s };
        const r = reaction();
        reread(st, w, i['runOnChange-user'], r);
        return { set: changes(s, st, ['bound']), send: [], pulses: [...r.pulses, 'fetched'], outcomes: dones(n) };
      },
      // :117-148 — the four session events, every backend's
      auth: (s, i, event, w) => {
        const st: UserState = { ...s };
        const r = reaction();
        reread(st, w, i['runOnChange-user'], r);
        if (event.type !== 'sessionGained') r.pulses.push({ derived: event.type }); // :120, :142, :147
        return { set: changes(s, st, ['bound']), send: [], pulses: r.pulses };
      },
      // :103-112 onModelChangedCallback — the bound record, any key, written by ANOTHER (the bridge, another node)
      change: (s, i, e: ChangeEvent) => {
        if (e.kind !== 'model' || e.id !== s.bound || !i['runOnChange-user']) return { send: [] };
        const key = String(e.name);
        const own = isField(key);
        return { sendDerived: own ? ['prop-' + key] : [], emitDerived: own ? ['changed-' + key] : [], emit: ['changed'], send: [] };
      }
    }
  }
);
