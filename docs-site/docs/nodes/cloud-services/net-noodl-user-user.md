---
title: "User"
---
Reads the currently signed-in user: id, username, email, custom properties, and an authenticated boolean, kept live across session changes.

User mirrors the current session's user. Its value outputs — `id`, `username`, `email` (strings) and one output per custom property on the User class — always reflect the signed-in user, and `authenticated` (boolean) is true exactly while a user is signed in. The node tracks the app-wide user service: it updates when Log In or Sign Up succeeds, when a stored session is restored, and when Log Out runs or the session is lost, so a single connection from `authenticated` can gate an entire logged-in UI. `changed` (signal) fires when the user's data changes. Triggering `fetch` (signal) re-reads the user from the server, firing `fetched` and then `done` on completion, or `failure` with `error` (string value) set; `completed` follows either way. `fetched` is the value-level announcement — the twin Record node fires it on binding too — and `done` is this invocation's outcome. It also works inside cloud functions, where it reflects the calling user's session.

## When to use it

The one node to read who is logged in and their properties, anywhere in the app. It performs no actions — pair it with Log In, Sign Up, Log Out and Set User Properties for those.

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `net.noodl.user.User` |
| Available in | browser, cloud |
| SSR compatibility | partial — Sessions live in browser storage; a server render always sees a logged-out user. |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 5 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `runOnChange-user` | Boolean | `true` | Whether a new value on User properties re-runs this node. On by default; untick to make this input passive so only the control signal runs it |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `fetch` | Signal | — | Re-reads the signed-in user from the backend, which is also how an expired session is discovered |

### What each input does

**Fetch** (`fetch`)

- always: the user is re-read from the backend at the frame's end, one call for the frame's presses; each answered when it returns

**User properties** (`runOnChange-user`)

- the value it already holds: nothing
- a change: ticked, a property of the signed-in user that moves is sent with its Changed; unticked, it moves silently

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `authenticated` | Boolean | — | True while somebody is signed in on this device; a server render always sees false |
| `email` | String | — | Email address of the signed-in user; empty while nobody is signed in |
| `id` | String | — | Id of the signed-in user record; empty while nobody is signed in |
| `roles` | Array | — | Roles the signed-in user is in, resolved by the server on each session read; empty while nobody is signed in, and not set on backends that do not track roles |
| `username` | String | — | Username of the signed-in user; empty while nobody is signed in |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `changed` | Signal | — | Fires when a property of the signed-in user changes, including a change another node made |
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when a Fetch finished and the outputs below are up to date |
| `fetched` | Signal | — | Fires once the user record has been re-read and the outputs below are up to date |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last read failed; empty until one does |
| `failure` | Signal | — | Fires when the user record could not be read, after the reason has been reported on the error channel |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Property outputs include one port per custom user property in addition to the built-in ones.

## Ports at runtime

Beyond the static ports, the editor generates one value output per custom property in the User class schema (stored as `prop-<name>`, typed from the schema) plus a `changed-<name>` signal per property (built-ins authData/password/username/email are excluded — username and email have static outputs). In the browser it additionally registers the signal outputs `loggedIn` (Logged In), `loggedOut` (Logged Out) and `sessionLost` (Session Lost), which fire on the corresponding session transitions; these do not exist in the cloud runtime.

## Patterns

- `authenticated` → a Group's `visible` (and through an inverter to the login form): one boolean drives both faces of the UI.
- `loggedOut`/`sessionLost` signal outputs → navigation to the login page: handle forced sign-outs globally.

## Watch out for

- Storing the user id in your own variable at login time — read `id` from this node instead so restored and switched sessions stay correct.

## Examples

**Log in, show the user, log out**

The authentication triangle: Log In takes `username`/`password` values and a `login` signal, firing `success` or `failure` (+`error`). The User node is the session's single source of truth — its `authenticated` boolean and profile outputs update on login/logout, so UI binds to it rather than to the action nodes. Log Out ends the session from anywhere. Gate visible areas on `authenticated`, not on the login node's `success` pulse.

## Related nodes

[Log In](./net-noodl-user-log-in.md), [Log Out](./net-noodl-user-log-out.md), [Sign Up](./net-noodl-user-sign-up.md), [Set User Properties](./net-noodl-user-set-user-properties.md), [Condition](../logic/condition.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 5. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)
- the shared store of Objects and Arrays, looked up by id (`registry`)
- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "fetchScheduled": false,
  "presses": 0,
  "calls": {},
  "nextCall": 1,
  "live": true
}
```

### How inputs are converted

Inputs not listed arrive as sent.

| Input | Conversion | What it does |
|---|---|---|
| User properties (`runOnChange-user`) | `not-false` | only an explicit `false` turns it off; no value, `0` and `""` leave it on |

### How actions report back

Each time Fetch is triggered, the node reports exactly one of **Done** or **Failure**.

### Version history

- **Version 5**: On the Parse wire the accounts class's ACL column draws no output (nor ACL Changed) port any more, as no Record node draws one: it is the account's access rules, not something about the person. Before, the Parse wire drew prop-ACL here (and only on the User family). Existing projects are not migrated: ruled "Hide it, like the Record nodes" (R29). The reach measured on 2026-10-12 was 429 User-family nodes in 58 of Richard's projects and none wired to or from ACL, so no saved wire is dropped.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/user.ts"
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
 * and every property output for a key the record holds. A session that ENDS binds nothing, and (v4, row C47 ruled "Blank
 * text, empty for others") Id, Email and Username read blank text and Roles `null`, and every property the one who left
 * had is re-sent as `null` — so no wire keeps them. v3 read `undefined`, which is never sent (CONTRACT C3): every wire kept
 * the user who had just left, and only Authenticated moved.
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
 * :447-463) — the fields are the accounts table's, from the project's schema (user-ports.ts). NSP-020 s84: a play has
 * no schema, only its wires (`wiredOutputs`); a generated sequence wires from the two every world here holds, `nick` and
 * `n` (USER_FIELDS). `Logged In`, `Logged Out`, `Session Lost` likewise (:452-456).
 *
 * NOT GRADED HERE, named:
 *   - a session field holding an OBJECT: the store turns it into an anonymous record on every read (cloudstore.js
 *     `_deserializeJSON` :380-385 — a draw from the world's random stream each time); scalars and arrays only;
 *   - the editor's warnings (`clearWarnings`) and the error-channel raise — not ports;
 *   - a cloud runtime's request-scoped user (`currentFor` absent → `current`, :393-394);
 *   - the service's `current` model: no node here reads it.
 */

import type { BackendField, ChangeEvent, OutputDecl, PortContext, SignalOutputDecl, ValueType, WorldView } from '../spec';
import { defineNode } from '../spec';
import { sameList, userRecordEvent, type BackendScript } from '../world';
import { runOnChange } from './data-base';
import { backendPickerPort, onParseWire, recordFieldPort } from './record-base';

/** The fields a play's graph wires from a User (THE PROPERTY OUTPUTS above) — the accounts table's, in a project. */
export const USER_FIELDS = ['nick', 'n'] as const;

/**
 * user-ports.ts :83-102 `USER_COLLECTION_BY_BACKEND_TYPE` / `userCollectionName` — where each backend keeps its accounts
 * (P107-S85-RESTCOLTYPES, s102): `_User` on the Parse wire, `directus_users`, PocketBase's `users`; none on Supabase or a
 * type the table has never heard of ("no property ports").
 */
const USER_CLASS_BY_BACKEND_TYPE: Readonly<Record<string, string>> = { parse: '_User', nodegx: '_User', directus: 'directus_users', pocketbase: 'users' };

export function userClassName(context: Readonly<PortContext>): string | undefined {
  const type = context.schema?.backendType;
  if (type === undefined) return '_User';
  return Object.prototype.hasOwnProperty.call(USER_CLASS_BY_BACKEND_TYPE, type) ? USER_CLASS_BY_BACKEND_TYPE[type] : undefined;
}

/**
 * NSP-020 s84 — user-ports.ts `userSchemaContext` / `userPropertyPorts`: the accounts class (`userClassName`; Sign Up names
 * `_User`, which it reads whatever the backend) as the project's schema holds it, its columns in order less the ones `ignore`
 * names, every Relation column and the hidden `ACL` (`shouldShowField` on every wire since P107-S84-USERACL, ruled R29: before,
 * the Parse wire drew `prop-ACL`).
 */
export function userFields(context: Readonly<PortContext>, ignore: readonly string[], className: string | undefined = userClassName(context)): Array<[string, BackendField]> {
  const klass = className === undefined ? undefined : context.schema?.classes[className];
  return Object.entries(klass?.fields ?? {}).filter(([name, decl]) => !ignore.includes(name) && name !== 'ACL' && decl.relation === undefined);
}

/** RestAuthAdapter.ts :243-261 `REST_USER_READONLY_FIELDS` — the columns a REST backend owns, which no node writes. */
export const REST_USER_READONLY_FIELDS = ['objectId', 'id', 'emailVerified', 'verified', 'createdAt', 'updatedAt', 'created', 'updated', 'collectionId', 'collectionName', 'expand', 'password', 'passwordConfirm', 'tokenKey', 'sessionToken', 'refreshToken', 'expiresAt'] as const;

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


/** Only the keys a patch CHANGES (record.ts: a spread-everything `set` makes drop-set mutants meaningless). */
function changes(before: Readonly<UserState>, after: UserState, keys: ReadonlyArray<keyof UserState>): Partial<UserState> {
  const out: Partial<UserState> = {};
  for (const k of keys) if (!Object.is(before[k], after[k])) (out as Record<string, unknown>)[k] = after[k];
  return out;
}

/** :103-112 onModelChangedCallback — this node's reaction to a write of `key` on its bound record. */
function react(st: UserState, w: WorldView, key: string, on: boolean, r: Reaction): void {
  if (!on) return;
  if (w.hasOutput('prop-' + key)) w.send('prop-' + key, st); // :107 — at the flag, where a wire made the port
  if (w.hasOutput('changed-' + key)) r.pulses.push({ derived: 'changed-' + key }); // :109
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
    const value = e.object[key];
    if (Array.isArray(value) && sameList(m.get(key), value)) continue; // v2, C49: the same list is not written again
    const differs = m.get(key) !== value;
    m.set(key, value);
    if (mine && differs) react(st, w, key, on, r);
  }
  return m.getId();
}

/** :353-379 setUserModel — move the subscription when the record differs; re-send the five; every property the record holds. */
function setUserModel(st: UserState, w: WorldView, id: string | undefined): void {
  const previous = st.bound;
  if (st.bound !== id) {
    if (st.bound !== undefined) w.unwatch({ model: st.bound }); // :358-360
    st.bound = id;
    if (id !== undefined) w.watch({ model: id }); // :363
  }
  for (const port of ['id', 'authenticated', 'email', 'username', 'roles']) w.send(port, st); // :365-372
  // :376-378 — every property the record holds; v4 (C47): when the session ENDS, the properties of the one who left, empty
  const source = id !== undefined ? id : previous;
  if (source === undefined) return;
  for (const key of Object.keys(w.registry.model(source).data)) if (w.hasOutput('prop-' + key)) w.send('prop-' + key, st);
}

/** Read and bind — what every path that re-reads the session does (`setUserModel(this.currentUserModel())`). */
function reread(st: UserState, w: WorldView, on: boolean, r: Reaction): void {
  setUserModel(st, w, currentUser(st, w, on, r));
}

/** The property output a graph wires (:459-462, `getUserProperty` :464-466 — `get(name)`). */
function propertyOutput(p: string, type: ValueType = '*'): OutputDecl<UserState> {
  return {
    type,
    displayName: p,
    group: 'Properties',
    description: 'The ' + p + ' property of the signed-in user',
    from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get(p) : null) // v4, C47: empty while nobody is signed in
  };
}

/** :447-470 — `<field> Changed` beside a property output (user-ports.ts :197-205). */
function changedOutput(p: string): SignalOutputDecl {
  return { type: 'signal', displayName: p + ' Changed', group: 'Events', description: 'Fires when the ' + p + ' property of the signed-in user changes' };
}

/** :511-532 — the three session signals the editor draws in a browser runtime; each exists at play only when wired (:452-456). */
const SESSION_SIGNALS: Readonly<Record<'loggedIn' | 'loggedOut' | 'sessionLost', SignalOutputDecl>> = {
  loggedIn: { type: 'signal', displayName: 'Logged In', group: 'Events', description: 'Fires when somebody signs in, on any backend' },
  loggedOut: { type: 'signal', displayName: 'Logged Out', group: 'Events', description: 'Fires when somebody signs out, on any backend' },
  sessionLost: { type: 'signal', displayName: 'Session Lost', group: 'Events', description: 'Fires when a session ends without the user asking, on any backend' }
};

/** user-ports.ts :163-178 `USER_OUTPUT_IGNORE_PARSE` / `_REST` — the accounts columns the User node draws no port for, by wire (user.ts :505). */
const USER_OUTPUT_IGNORE = ['authData', 'password', 'username', 'email'];
const USER_OUTPUT_IGNORE_REST = ['password', 'tokenKey', 'tfa_secret', 'username', 'email', 'id', 'objectId'];

const SESSION = { objectId: 'u1', email: 'ann@example.com', username: 'ann', nick: 'Ann', n: 1 };

/**
 * The backends a sequence plays with. Every one answers `fetchCurrentUser` (the start-up check is made whenever the active
 * backend holds a session): signed in and the backend agrees, signed in and the backend moved a field, nobody signed in, a
 * session the backend rejects (401 — rows C46, C47), a backend that is down (503 — row C45, v3: nothing said), late, silent, a user with
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
  // v2 (P109 ISL-027, row C49 ruled "Compare the list's contents"): a list read from the session (Roles) that has the same
  // contents as the one the record holds is not written again, so a Fetch, a sign-in or the start-up check that brings the
  // same roles pulses no Changed. v1 wrote the new array every read, and the record store's `!==` called it changed.
  // v3 (P109 ISL-030, rows C45 + C46 ruled "Stay signed in, say nothing" / "Fire it once"): the start-up check's failure is the
  // adapter's alone — a rejected session pulses Session Lost once; a backend that is down says nothing and keeps the person.
  // v4 (P109 ISL-030, row C47 ruled "Blank text, empty for others"): nobody signed in reads blank Id / Email / Username, `null`
  // Roles and properties — sent, so a wire lets go; v3 read `undefined`, never sent, and kept the person who left.
  // v5 (P107 s92, P107-S84-USERACL ruled R29): no `prop-ACL` output on the Parse wire
  version: 5,
  changes: [
    {
      version: 5,
      says: 'On the Parse wire the accounts class\'s ACL column draws no output (nor ACL Changed) port any more, as no Record node draws one: it is the account\'s access rules, not something about the person. Before, the Parse wire drew prop-ACL here (and only on the User family)',
      row: 'P107-S84-USERACL (R29)',
      migration: {
        none: 'Ruled "Hide it, like the Record nodes" (R29). The reach measured on 2026-10-12 was 429 User-family nodes in 58 of Richard\'s projects and none wired to or from ACL, so no saved wire is dropped'
      }
    }
  ],
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
    id: { type: 'string', displayName: 'Id', group: 'General', description: 'Id of the signed-in user record; empty while nobody is signed in', from: (s) => (s.bound !== undefined ? s.bound : '') }, // v4, C47: blank
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
        if (s.bound === undefined) return null; // v4, C47: sent, so a wire lets go — not `[]`, which is "in no roles"
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
      from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get('username') : '') // v4, C47
    },
    // :271-279
    email: {
      type: 'string',
      displayName: 'Email',
      group: 'General',
      description: 'Email address of the signed-in user; empty while nobody is signed in',
      from: (s, w) => (s.bound !== undefined ? w.registry.model(s.bound).get('email') : '') // v4, C47
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
    fetch: (s) => ({ says: "always: the user is re-read from the backend at the frame's end, one call for the frame's presses; each answered when it returns", set: { presses: s.presses + 1, fetchScheduled: true }, send: [], outcome: 'pending' }),
    // run-on-value-change.ts :137 — stored; read by the watcher (:105)
    'runOnChange-user': (s, v) =>
      s.live === v
        ? { says: 'the value it already holds: nothing', set: {}, send: [] }
        : { says: 'a change: ticked, a property of the signed-in user that moves is sent with its Changed; unticked, it moves silently', set: { live: v }, send: [] }
  },
  {
    derived: {
      // NSP-020 s84 — what the editor draws (`updatePorts` :491-541): the Backend picker with two or more backends, one
      // `prop-` and one Changed per column of the accounts class (user-ports.ts `userPropertyPorts`), then the three session
      // signals. At play every one of them exists only when a wire made it (`registerOutputIfNeeded` :447-470 — `onWire`,
      // or `discoverOutput` for a name the schema does not have) and every send asks `hasOutput` (:107-109, :120, :142, :147, :379)
      inputs: (_params, context) => backendPickerPort(context),
      outputs: (_params, context) => {
        const out: Record<string, OutputDecl<UserState>> = {};
        for (const [p, decl] of userFields(context, onParseWire(context) ? USER_OUTPUT_IGNORE : USER_OUTPUT_IGNORE_REST)) {
          out['prop-' + p] = { ...propertyOutput(p), ...recordFieldPort(decl), onWire: true } as OutputDecl<UserState>;
          out['changed-' + p] = { ...changedOutput(p), onWire: true };
        }
        for (const [name, decl] of Object.entries(SESSION_SIGNALS)) out[name] = { ...decl, onWire: true };
        return out;
      },
      needs: ['schema', 'backends', 'wiredOutputs'],
      // :447-470 registerOutputIfNeeded — a session signal, a `prop-` getter, a `changed-` signal
      discoverOutput: (port) =>
        port in SESSION_SIGNALS ? SESSION_SIGNALS[port as keyof typeof SESSION_SIGNALS] : port.startsWith('prop-') ? propertyOutput(port.slice('prop-'.length)) : port.startsWith('changed-') ? changedOutput(port.slice('changed-'.length)) : undefined,
      outputCandidates: [...USER_FIELDS.flatMap((f) => ['prop-' + f, 'changed-' + f]), ...Object.keys(SESSION_SIGNALS)],
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
        if (event.type !== 'sessionGained' && w.hasOutput(event.type)) r.pulses.push({ derived: event.type }); // :120, :142, :147 — each behind `hasOutput`
        return { set: changes(s, st, ['bound']), send: [], pulses: r.pulses };
      },
      // :103-112 onModelChangedCallback — the bound record, any key, written by ANOTHER (the bridge, another node)
      change: (s, i, e: ChangeEvent, w) => {
        if (e.kind !== 'model' || e.id !== s.bound || !i['runOnChange-user']) return { send: [] };
        const key = String(e.name);
        return { sendDerived: w.hasOutput('prop-' + key) ? ['prop-' + key] : [], emitDerived: w.hasOutput('changed-' + key) ? ['changed-' + key] : [], emit: ['changed'], send: [] };
      }
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
