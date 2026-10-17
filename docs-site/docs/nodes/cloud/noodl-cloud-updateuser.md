---
title: "Update User"
---
Writes properties (and optionally a new password) to a NAMED user from inside a cloud function, as the system. Cloud-only.

Update User is Set User Properties' server-side sibling, and the difference is the whole point: Set User Properties writes to whoever is signed in and fails when nobody is, while this one writes to the account whose id you give it, with the authority of the server. `userId` is required — a blank one is a `failure` with a sentence saying so, and never a fallback to the caller, because the failure mode this split exists to prevent is 'accidentally edited the caller instead of the target'. List the columns to write in `properties` to get one input per name, pulse `store` (Do), and `done` fires once the row is written.

## When to use it

In a cloud function that moderates or administers accounts: suspending a user, changing a plan after a webhook from a payment provider, resetting a password on request, correcting an imported record. Use the browser's Set User Properties node when a signed-in person is editing their own profile — that is the caller's own authority and does not belong on the server.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.updateuser` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `password` | String | — | A new password for this account, hashed by the backend. Setting one revokes EVERY session this user has, including one that may be calling this function. Leave it unwired to change properties only. Connection-only — a password must not live in a project file |
| `properties` | Stringlist | — | Names of the user columns this node writes, each becoming an input to supply the value. A name the backend refuses — objectId, ACL, password, sessionToken, or anything starting with "_" — is a Failure naming the key, never a silent drop |
| `userId` | String | — | Which account to change. Required — this node never falls back to the caller, and a blank id is a Failure rather than a write to whoever is signed in |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `store` | Signal | — | Writes the values below to the account named by User Id |

### What each input does

**User Id** (`userId`)

- always: read at the end of the frame by a Do pressed in it — blank fails that Do

**Password** (`password`)

- always: read at the end of the frame by a Do pressed in it

**Properties** (`properties`)

- always: nothing while it runs; each name makes a value input

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `sessionsRevoked` | Number | — | How many of this user's sessions the last write ended. Non-zero only when a Password was supplied |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the account has been written |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last operation could not be performed. It never contains a password, a hash or a token |
| `failure` | Signal | — | Fires when the account could not be written — a blank or unknown User Id, a property the backend refuses, or a username already taken by somebody else |

## Dynamic ports

_This node's port list changes at runtime (declared-port-groups, runtime-discovered); the tables above may be incomplete for a given instance._

Declares conditional/expandable port groups whose visibility depends on parameter values (see declaredPortGroups). Some ports are discovered at runtime from user code, parameters or connected components, and are pushed to the editor per instance; the static port list below is incomplete for such instances.

| Condition | Inputs shown | Outputs shown |
|---|---|---|
| — | — | — |

## Ports at runtime

Every name listed in the `properties` parameter mints one input port called `prop-<name>`, in the Properties group, typed `*`. The set comes from that parameter alone — nothing is read from the backend's `_User` schema and no editor connection is involved — so an authoring tool can derive the port list from the project file. Names are de-duplicated and blanks dropped; a refused name still mints a port and fails at run time with the key named.

## Patterns

- Request `receive` → Update User `store`, with the target's id arriving as a request parameter: the shape of every 'admin acts on account X' function.
- Wire `sessionsRevoked` into the response when the function resets a password, so the caller knows the user was signed out everywhere.

## Watch out for

- Leaving `userId` unwired and expecting it to mean 'the current user'. It does not, and it never will — that node is Set User Properties, in the browser.
- Putting this node in a function with no `call` rule. A function that can change any account's password is a function that must name who may call it (CWF-017).

## Examples

**Take a privilege away, and write down that you did**

Revoking is the other half of granting, and it has one behaviour that surprises people: removing a role membership does NOT end that user's existing sessions. They stay signed in; what changes is what the access rules let them do on their next request. If the requirement is 'they are out, now', revoking the role is not sufficient on its own. `unchanged` covers two different post-conditions that both mean 'they are not in it' — they were never a member, or the role does not exist at all — and Error says which. Both are wired into the same continuation here, because for a revoke, 'they are not in that role any more' is the goal and it has been reached either way; a function that failed on an already-revoked user would break every retry. Update User then stamps the account with who did it and when, and it is worth being clear why that is a different node from Set User Properties: that one writes to whoever is signed in and fails when nobody is, while this writes to the account whose id you give it with the authority of the server. `userId` is required and a blank one is a failure rather than a fallback to the caller — which is exactly the accident (editing the admin instead of the target) that the split exists to prevent. Get User Roles reads the result back through the same resolver the permission check uses, so the Response tells the screen what the access rules will actually agree to, not what this function believes it just did.

## Related nodes

[Create User](./noodl-cloud-createuser.md), [Delete User](./noodl-cloud-deleteuser.md), [Verify Session Token](./noodl-cloud-verifysessiontoken.md), [Set User Properties](../cloud-services/net-noodl-user-set-user-properties.md), [Request](./noodl-cloud-request.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- services of the backend process a cloud function runs in (`host`)

### Starting state

```json
{
  "treatUnchangedAs": "unchanged",
  "pending": 0,
  "calls": {},
  "nextCall": 1
}
```

### How actions report back

Each time Do is triggered, the node reports exactly one of **Done** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/system-users.ts"
/**
 * The cloud user-admin family (CWF-015) — Create User, Update User, Delete User and Verify Session Token, read from
 * `packages/noodl-viewer-cloud/src/nodes/cloud/{createuser,updateuser,deleteuser,verifysessiontoken}.ts` and the shared
 * `system-users.ts` on 2026-10-12 (NSP-022 s96). Cloud-only: graded on the runtime's cloud target, in a backend process the
 * world plays (world.ts HOST, the `users` service). The call and its answer are `system-calls.ts`'s; each node is its checks,
 * its request and what it writes from the answer.
 *
 * Create and Update User write the columns their `Properties` list names: one `prop-<name>` input per name
 * (system-users.ts :81-95, the `namedports/list` idiom), each value kept under its name in the request's `properties` from
 * its first write on (`registerPropertyInput` :105-114) — a name later taken off the list keeps its value.
 */

import { defineNode, type InputDecl, type ValueInputDecl } from '../spec';
import type { HostScript } from '../world';
import { propertyNames } from './data-base';
import { answered, CALL_STATE, errorOutput, frameEnd, press, TREAT_UNCHANGED_INPUT, type CallState } from './system-calls';

/** The processes a sequence plays in: none (outside a backend), and one per way the store answers — weighted to answering. */
function hosts(done: Record<string, unknown>, unchanged: Record<string, unknown> | undefined): ReadonlyArray<HostScript> {
  const users = (answers: HostScript['answers']): HostScript => ({ services: ['users'], answers });
  return [
    {},
    users([{ answer: { ok: { outcome: 'done', ...done } } }]),
    users([{ answer: { ok: { outcome: 'done', ...done } }, after: 5 }]),
    // nodegx-backend users/SystemUsers.ts: create (:269), delete (:413) and verifyToken (:469-481) answer Unchanged; update never does
    ...(unchanged ? [users([{ answer: { ok: { outcome: 'unchanged', ...unchanged } } }])] : []),
    users([{ answer: { ok: { outcome: 'failure', code: 'user/refused-property', error: 'The backend refused the property "ACL".' } } }]),
    users([{ answer: { ok: { outcome: 'failure' } } }]),
    users([{ answer: { ok: null } }]),
    users([{ answer: { throws: 'the database is locked' }, after: 1 }]),
    users([{ answer: { never: true } }])
  ];
}

/** system-users.ts :70-79 — the stringlist; edit only. */
const PROPERTIES_INPUT: InputDecl = {
  type: 'stringlist',
  coerce: 'none',
  editOnly: true,
  displayName: 'Properties',
  group: 'Properties',
  description: 'Names of the user columns this node writes, each becoming an input to supply the value. A name the backend refuses — objectId, ACL, password, sessionToken, or anything starting with "_" — is a Failure naming the key, never a silent drop',
  examples: ['plan', 'plan,credits', 'nickname']
};

/** :89-94 — `prop-{{*}}`, type `*`, group Properties. */
const propInput = (name: string): ValueInputDecl => ({ type: '*', coerce: 'none', displayName: name, group: 'Properties', description: `The value written to the user's ${name} column`, examples: ['pro', 3, true, null] });

/** The derived `prop-<name>` inputs (system-users.ts :81-114): drawn per listed name; registered on first write for any `prop-` name. */
const PROPERTY_PORTS = {
  inputs: (params: Readonly<Record<string, unknown>>) => Object.fromEntries(propertyNames(params.properties).map((p) => ['prop-' + p, propInput(p)])),
  discover: (port: string) => (port.startsWith('prop-') ? propInput(port.slice('prop-'.length)) : undefined),
  candidates: ['prop-plan', 'prop-credits'],
  on: <S extends { userProperties: Readonly<Record<string, unknown>> | undefined }>(s: S, port: string, v: unknown) => ({ set: { userProperties: { ...(s.userProperties ?? {}), [port.slice('prop-'.length)]: v } } as Partial<S>, send: [] as never[] })
};

// ------------------------------------------------------------------------------------------------ Create User

type CreateState = CallState & { username: unknown; email: unknown; password: unknown; emailVerified: unknown; userProperties: Readonly<Record<string, unknown>> | undefined; userId: unknown };

export const CreateUser = defineNode({
  type: 'noodl.cloud.createuser',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/createuser.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-users.ts',
  needs: ['host'],
  worldPool: { hosts: hosts({ userId: 'u1' }, { code: 'user/already-exists', userId: 'u0', error: 'A user with the username "taken" already exists.' }) },
  state: { ...CALL_STATE, username: undefined, email: undefined, password: undefined, emailVerified: undefined, userProperties: undefined, userId: undefined } as CreateState,
  // createuser.ts :59-68 OUTCOMES — all three
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    // :79-87
    username: { type: 'string', coerce: 'none', displayName: 'Username', group: 'General', description: "The account's identity, and what Log In looks it up by. Required; a blank one is a Failure", examples: ['ada', 'taken', '', 0] },
    // :88-98
    email: { type: 'string', coerce: 'none', displayName: 'Email', group: 'General', description: "The account's email address. Optional, and NOT checked for uniqueness — this backend's own signup does not check it either, so a duplicate email is not a duplicate user here", examples: ['ada@example.com'] },
    // :99-114 — connections only
    password: { type: 'string', coerce: 'none', displayName: 'Password', group: 'General', description: "The account's password, hashed by the backend with the same function Log In verifies against. Leave it unwired for an invite or passwordless account: no hash is stored at all, so no password can ever match it until one is set. Connection-only — a password must not live in a project file", examples: ['hunter2'] },
    // :115-131 — read `=== true` at the call
    emailVerified: { type: 'boolean', default: false, coerce: 'none', displayName: 'Email Verified', group: 'General', description: 'Whether the new account counts as having a verified address. This node never sends a verification email; tick this for an account that must be able to log in straight away on a backend that requires verification, and leave it for one that should go through the normal flow', examples: [true, false, 'true'] },
    properties: PROPERTIES_INPUT,
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    // :134-145
    create: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Creates the account' }
  },
  outputs: {
    // :148-157
    userId: { type: 'string', from: (s) => s.userId, displayName: 'User Id', group: 'User', description: "The new account's id after Done, or the existing account's id after Unchanged. Blank after a Failure" },
    error: errorOutput('user')
  }
}).on(
  {
    username: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { username: v }, send: [] }),
    email: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it', set: { email: v }, send: [] }),
    password: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it', set: { password: v }, send: [] }),
    emailVerified: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — only true is verified', set: { emailVerified: v }, send: [] }),
    properties: () => ({ says: 'always: nothing while it runs; each name makes a value input', send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    create: (s) => press(s, 'always: one create at the end of the frame however many presses — Done or Unchanged with User Id, or the reason on Error and Failure, per press')
  },
  {
    derived: PROPERTY_PORTS,
    // :167-197 doCreate
    afterInputs: (s, _i, w) =>
      frameEnd(s, w, 'user', 'create', 'Create User', () => (s.username ? undefined : (['user/username-required', 'Create User: a Username is required.'] as const)), () => ({
        op: 'create',
        username: s.username,
        email: s.email,
        password: s.password,
        emailVerified: s.emailVerified === true,
        properties: s.userProperties
      })),
    world: {
      // :191-194
      host: (s, _i, answer) => answered(s, answer, 'user', 'create', (r) => ({ set: { userId: r.userId }, send: ['userId'] }))
    }
  }
);

// ------------------------------------------------------------------------------------------------ Update User

type UpdateState = CallState & { userId: unknown; password: unknown; userProperties: Readonly<Record<string, unknown>> | undefined; sessionsRevoked: unknown };

export const UpdateUser = defineNode({
  type: 'noodl.cloud.updateuser',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/updateuser.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-users.ts',
  needs: ['host'],
  worldPool: { hosts: hosts({ sessionsRevoked: 2 }, undefined) },
  state: { ...CALL_STATE, userId: undefined, password: undefined, userProperties: undefined, sessionsRevoked: undefined } as UpdateState,
  // updateuser.ts :92-97 — Done and Failure only: no Unchanged port, no Treat Unchanged as (outcome.ts :232)
  outcomes: ['done', 'failure'],
  inputs: {
    userId: { type: 'string', coerce: 'none', displayName: 'User Id', group: 'General', description: 'Which account to change. Required — this node never falls back to the caller, and a blank id is a Failure rather than a write to whoever is signed in', examples: ['u1', '', 0] },
    password: { type: 'string', coerce: 'none', displayName: 'Password', group: 'General', description: 'A new password for this account, hashed by the backend. Setting one revokes EVERY session this user has, including one that may be calling this function. Leave it unwired to change properties only. Connection-only — a password must not live in a project file', examples: ['hunter2'] },
    properties: PROPERTIES_INPUT,
    store: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Writes the values below to the account named by User Id' }
  },
  outputs: {
    sessionsRevoked: { type: 'number', from: (s) => s.sessionsRevoked, displayName: 'Sessions Revoked', group: 'User', description: "How many of this user's sessions the last write ended. Non-zero only when a Password was supplied" },
    error: errorOutput('user')
  }
}).on(
  {
    userId: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { userId: v }, send: [] }),
    password: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it', set: { password: v }, send: [] }),
    properties: () => ({ says: 'always: nothing while it runs; each name makes a value input', send: [] }),
    store: (s) => press(s, 'always: one write at the end of the frame however many presses — Done with Sessions Revoked, or the reason on Error and Failure, per press')
  },
  {
    derived: PROPERTY_PORTS,
    afterInputs: (s, _i, w) =>
      frameEnd(s, w, 'user', 'store', 'Update User', () => (s.userId ? undefined : (['user/id-required', 'Update User: a User Id is required. This node never falls back to the caller.'] as const)), () => ({
        op: 'update',
        userId: s.userId,
        password: s.password,
        properties: s.userProperties
      })),
    world: {
      host: (s, _i, answer) => answered(s, answer, 'user', 'store', (r) => ({ set: { sessionsRevoked: r.sessionsRevoked || 0 }, send: ['sessionsRevoked'] }))
    }
  }
);

// ------------------------------------------------------------------------------------------------ Delete User

type DeleteState = CallState & { userId: unknown; sessionsRevoked: unknown };

export const DeleteUser = defineNode({
  type: 'noodl.cloud.deleteuser',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/deleteuser.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-users.ts',
  needs: ['host'],
  worldPool: { hosts: hosts({ sessionsRevoked: 3 }, { code: 'user/not-found', error: 'There is no user with the id "u1".', userId: 'u1' }) },
  state: { ...CALL_STATE, userId: undefined, sessionsRevoked: undefined } as DeleteState,
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    userId: { type: 'string', coerce: 'none', displayName: 'User Id', group: 'General', description: 'Which account to delete. Required — this node never falls back to the caller, and a blank id is a Failure rather than the deletion of whoever is signed in', examples: ['u1', '', 0] },
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    remove: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Deletes the account named by User Id, and every session it holds' }
  },
  outputs: {
    sessionsRevoked: { type: 'number', from: (s) => s.sessionsRevoked, displayName: 'Sessions Revoked', group: 'User', description: 'How many sessions the deleted account held. Zero after Unchanged' },
    error: errorOutput('user')
  }
}).on(
  {
    userId: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { userId: v }, send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    remove: (s) => press(s, 'always: one delete at the end of the frame however many presses — Done, or Unchanged when there is no such user, with Sessions Revoked; or the reason on Error and Failure, per press')
  },
  {
    afterInputs: (s, _i, w) =>
      frameEnd(s, w, 'user', 'remove', 'Delete User', () => (s.userId ? undefined : (['user/id-required', 'Delete User: a User Id is required. This node never falls back to the caller.'] as const)), () => ({ op: 'delete', userId: s.userId })),
    world: {
      host: (s, _i, answer) => answered(s, answer, 'user', 'remove', (r) => ({ set: { sessionsRevoked: r.sessionsRevoked || 0 }, send: ['sessionsRevoked'] }))
    }
  }
);

// ------------------------------------------------------------------------------------------------ Verify Session Token

type VerifyState = CallState & { token: unknown; valid: unknown; userId: unknown; username: unknown };

export const VerifySessionToken = defineNode({
  type: 'noodl.cloud.verifysessiontoken',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/verifysessiontoken.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-users.ts',
  needs: ['host'],
  worldPool: {
    hosts: [
      ...hosts({ valid: true, userId: 'u1', username: 'ada' }, { code: 'user/token-invalid', valid: false }),
      // the node publishes an Unchanged's `error` (system-users.ts :186): a store that says why the token is not live
      { services: ['users'], answers: [{ match: { request: { token: 'r:abc123' } }, answer: { ok: { outcome: 'unchanged', valid: false, error: 'The session has expired.' } } }, { answer: { ok: { outcome: 'failure', code: 'user/failed', error: 'The store is offline.' } } }] }
    ]
  },
  state: { ...CALL_STATE, token: undefined, valid: undefined, userId: undefined, username: undefined } as VerifyState,
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    // connections only
    token: { type: 'string', coerce: 'none', displayName: 'Token', group: 'General', description: "The session token to check, as it arrived in the request body. Not the caller's own — that is already resolved on the Request node's Authenticated and User Id. Connection-only, because a token in a project file is a credential in a project file", examples: ['r:abc123', '', 0] },
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    verify: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Checks the token. Nothing is checked, and nothing is written, until this fires' }
  },
  outputs: {
    // `!!valid`
    valid: { type: 'boolean', from: (s) => !!s.valid, displayName: 'Valid', group: 'User', description: 'Whether the token is a live session. The value form of the Done / Unchanged branch' },
    userId: { type: 'string', from: (s) => s.userId, displayName: 'User Id', group: 'User', description: 'Whose session it is, after Done. Blank on every other branch' },
    username: { type: 'string', from: (s) => s.username, displayName: 'Username', group: 'User', description: "That user's username, after Done. Blank on every other branch" },
    error: errorOutput('user')
  }
}).on(
  {
    token: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { token: v }, send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    verify: (s) => press(s, 'always: one check at the end of the frame however many presses — Valid, User Id and Username cleared first; a live session is Done with them, not one is Unchanged, a check that cannot be made is the reason on Error and Failure, per press')
  },
  {
    // doVerify — the three outputs cleared before anything is checked
    afterInputs: (s, _i, w) =>
      frameEnd(s, w, 'user', 'verify', 'Verify Session Token', () => (s.token ? undefined : (['user/token-required', 'Verify Session Token: a Token is required.'] as const)), () => ({ op: 'verifyToken', token: s.token }), {
        set: { valid: false, userId: undefined, username: undefined },
        send: ['valid', 'userId', 'username']
      }),
    world: {
      host: (s, _i, answer) => answered(s, answer, 'user', 'verify', (r) => ({ set: { valid: r.valid === true, userId: r.userId, username: r.username }, send: ['valid', 'userId', 'username'] }))
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
