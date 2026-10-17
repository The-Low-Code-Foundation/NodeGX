---
title: "Set User Properties"
---
Saves changes to the signed-in user's email, username and custom properties on the cloud backend.

Set User Properties writes the current values of its `email` and `username` (string values) and its per-property inputs to the signed-in user when `store` (Do, signal) is triggered. On success the server confirms the update, the local user model changes — User nodes see the new values and fire their per-property Changed signals — and `done` (signal) fires. On failure `error` (string value) is set and `failure` (signal) fires. It requires a signed-in session; it is also available inside cloud functions, where it acts on the calling user.

## When to use it

The action behind a profile/settings form for the logged-in user. To set properties at account creation use Sign Up's property inputs; to read properties use the User node. It cannot edit other users — do that server-side in a cloud function with appropriate trust.

## At a glance

| | |
|---|---|
| Category | Cloud Services |
| Type name | `net.noodl.user.SetUserProperties` |
| Available in | browser, cloud |
| SSR compatibility | safe |
| Provided by | `noodl-runtime` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `email` | String | — | New email address for the signed-in user; leave blank to keep the current one |
| `username` | String | — | New username for the signed-in user; leave blank to keep the current one |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | Signal | — | Writes the values below to the signed-in user, and fails when nobody is signed in |

### What each input does

**Do** (`store`)

- the first press this frame: one write goes to the backend at the frame's end, with Email, Username and the properties held then — Done for each press, or Error (the backend's words, when it gives any) and Failure for each; nobody signed in, or a Backend the project does not have, is a Failure too
- another press this frame: it joins that write, and is answered with it

**Email** (`email`)

- always: held as handed; read when the next write goes

**Username** (`username`)

- always: held as handed; read when the next write goes — a REST backend refuses a Username that is not blank, and writes nothing

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the user record has been written |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last write failed; empty until one does |
| `failure` | Signal | — | Fires when the user record could not be written, after the reason has been reported on the error channel |

## Dynamic ports

_This node's port list changes at runtime (runtime-discovered); the tables above may be incomplete for a given instance._

Property inputs include one port per custom user property.

## Ports at runtime

The editor generates one value input per custom property in the User class schema (stored as `prop-<name>`, typed from the schema). In the browser the built-ins password and emailVerified are excluded along with system fields; only wired or set inputs are sent as changes.

## Patterns

- Text Input `text` → `prop-<name>`, Save button `onClick` → `store`, `done` → a confirmation state: the standard profile form.
- User node property output → Text Input `text` (initial value), edited value → back into `prop-<name>` here: read-modify-write on one screen.

## Examples

**Sign up, then set profile properties**

Sign Up creates the account and starts a session (`done` fires once the user is signed up and logged in). Custom profile fields beyond username/email/password are written afterwards with Set User Properties, whose property inputs are generated from the user-class schema — here `displayName` is set from the same form, triggered by the signup succeeding. Chain the signals: signup `done` → set-properties `store`.

## Related nodes

[User](./net-noodl-user-user.md), [Sign Up](./net-noodl-user-sign-up.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- a backend: records, users and cloud functions (`backend`)
- the shared store of Objects and Arrays, looked up by id (`registry`)
- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "properties": {},
  "storeScheduled": false,
  "presses": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

### Version history

- **Version 3**: On the Parse wire the accounts class's ACL column draws no input port any more, as no Record node draws one: it is the account's access rules, not something about the person. Before, the Parse wire drew prop-ACL here (and only on the User family). Existing projects are not migrated: ruled "Hide it, like the Record nodes" (R29). The reach measured on 2026-10-12 was 429 User-family nodes in 58 of Richard's projects and none wired to or from ACL, so no saved wire is dropped.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/set-user-properties.ts"
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
 * to that backend (world.ts AUTH — `Nobody is signed in.` at once when it holds no session; v2, row D23: a Username that is
 * not blank refused at once with `USERNAME_UNSUPPORTED`, nothing written). Success: every press Done
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
import { backendPickerPort, onParseWire, recordFieldPort } from './record-base';
import { REST_USER_READONLY_FIELDS, USER_FIELDS, USER_NO_BACKEND_MESSAGE, userFields } from './user';

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

/** user-ports.ts :187-195 `USER_INPUT_IGNORE_PARSE_BROWSER` — the accounts columns a browser cannot write on the Parse wire. */
const USER_INPUT_IGNORE_PARSE_BROWSER = ['authData', 'createdAt', 'updatedAt', 'email', 'username', 'emailVerified', 'password'];
/** user-ports.ts :213-215 `USER_INPUT_IGNORE_REST` — the columns a REST backend owns, then the two with their own ports. */
const USER_INPUT_IGNORE_REST = [...REST_USER_READONLY_FIELDS, 'username', 'email', 'tfa_secret'];

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
  // v2 (P109 ISL-030, row D23 ruled "Refuse with a reason"): a Username to a REST backend fails the write with the
  // world's USERNAME_UNSUPPORTED sentence, nothing written; v1's adapter dropped it, wrote the rest and said Done.
  // v3 (P107 s92, P107-S84-USERACL ruled R29): no `prop-ACL` input on the Parse wire
  version: 3,
  changes: [
    {
      version: 3,
      says: 'On the Parse wire the accounts class\'s ACL column draws no input port any more, as no Record node draws one: it is the account\'s access rules, not something about the person. Before, the Parse wire drew prop-ACL here (and only on the User family)',
      row: 'P107-S84-USERACL (R29)',
      migration: {
        none: 'Ruled "Hide it, like the Record nodes" (R29). The reach measured on 2026-10-12 was 429 User-family nodes in 58 of Richard\'s projects and none wired to or from ACL, so no saved wire is dropped'
      }
    }
  ],
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
    store: (s) =>
      !s.storeScheduled
        ? {
            says: "the first press this frame: one write goes to the backend at the frame's end, with Email, Username and the properties held then — Done for each press, or Error (the backend's words, when it gives any) and Failure for each; nobody signed in, or a Backend the project does not have, is a Failure too",
            set: { presses: s.presses + 1, storeScheduled: true },
            send: [],
            outcome: 'pending'
          }
        : { says: 'another press this frame: it joins that write, and is answered with it', set: { presses: s.presses + 1 }, send: [], outcome: 'pending' },
    // :129-131, :138-140 — held as they arrive
    email: (_s, v) => ({ says: 'always: held as handed; read when the next write goes', set: { email: v }, send: [] }),
    username: (_s, v) => ({ says: 'always: held as handed; read when the next write goes — a REST backend refuses a Username that is not blank, and writes nothing', set: { username: v }, send: [] })
  },
  {
    derived: {
      // NSP-020 s84 — what the editor draws (`updatePorts` :241-264): the Backend picker with two or more backends, then one
      // `prop-` per column of the accounts class less the ones a browser cannot write (user-ports.ts
      // `USER_INPUT_IGNORE_PARSE_BROWSER`; off the Parse wire `USER_INPUT_IGNORE_REST` :213-215) and every Relation. At play
      // there is no schema: a write registers each (:207-226)
      inputs: (_params, context) => {
        const out: Record<string, ValueInputDecl> = { ...backendPickerPort(context) };
        const ignore = onParseWire(context) ? USER_INPUT_IGNORE_PARSE_BROWSER : USER_INPUT_IGNORE_REST;
        for (const [p, decl] of userFields(context, ignore)) out['prop-' + p] = { ...propertyInput(p), ...recordFieldPort(decl) };
        return out;
      },
      needs: ['schema', 'backends'],
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
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
