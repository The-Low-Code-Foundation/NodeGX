---
title: "Add User To Role"
---
Adds a user to a named permission role from inside a cloud function, as the system. Cloud-only — the only way an account gains privilege.

Add User To Role writes a membership row linking `userId` to `role`. `Roles` (every role the user is now in) and `roleCreated` are read back through the same resolver a permission rule's `role:` check uses, so this cannot answer a role the access check would disagree with. A `role` that does not exist is a `failure` unless `createRole` is on — off by default on purpose, because a mistyped role name that silently gets created is a grant that names nobody: the rule that was meant to reference it still says the old, correct name. `userId` is required and there is deliberately no fallback to whoever called the function; wiring a request parameter straight into it turns this into 'grant any role to any account' with an HTTP endpoint in front, so gate the function with a `call` rule (CWF-017) and check the caller's own id before wiring it in.

## When to use it

In a cloud function that provisions or escalates privilege: making a newly signed-up user a `member`, promoting someone to `staff`, adding a subscriber to a `pro` role after a payment webhook confirms it. Never reachable from a browser graph — that would be one wire from a button to self-granted admin.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.addusertorole` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `createRole` | Boolean | `false` | Creates the role when it does not exist yet, instead of failing; leave it off so a mistyped name is a loud Failure rather than a role no rule ever names |
| `role` | String | — | Name of the role to put the user in, matching the name a permission rule uses after "role:" — letters, digits, underscore and hyphen only |
| `treatUnchangedAs` | Enum (`unchanged`, `done`, `failure`) | `unchanged` | What this node reports when the action was valid and there was nothing to do. Unchanged (the default) keeps it a third outcome of its own. Done suits a project whose chains should carry on either way; Failure suits one whose idiom is that a no-op is a bug. Completed fires whatever this is set to. |
| `userId` | String | — | Object id of the account to act on, usually wired from Create User or a Request parameter; blank is a Failure rather than a fallback to whoever called the function |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `add` | Signal | — | Adds the user to the role |

### What each input does

**Role** (`role`)

- always: read at the end of the frame by a Do pressed in it — blank fails that Do

**User Id** (`userId`)

- always: read at the end of the frame by a Do pressed in it — blank fails that Do

**Create Role If Missing** (`createRole`)

- always: read at the end of the frame by a Do pressed in it — only true creates a missing role

**Treat Unchanged as** (`treatUnchangedAs`)

- always: read when an Unchanged is reported

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `roleCreated` | Boolean | — | True when this call created the role as well as the membership, which is worth branching on because a brand-new role is named by no permission rule yet |
| `roles` | Array | — | Every role this user is in once the operation has finished, read back through the same resolver the access check itself uses |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once the user is in the role and Roles lists it |
| `unchanged` | Signal | — | Fires when the user was already in this role, with Roles still listing it, so a signup function re-run does not go red; set Treat Unchanged as to Failure if a repeat is a bug |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last operation could not be performed |
| `failure` | Signal | — | Fires when the membership could not be written — a blank Role or User Id, a user id nothing resolves, or a role that does not exist and Create Role If Missing left off |

## Patterns

- Wire straight after Create User in a signup function to put every new account into a default role like `member` — `unchanged` and `done` both mean the account is now in that role, so wiring both to the same next step covers a re-run cleanly.

## Watch out for

- Wiring a request parameter straight into `userId` (or `role`) on a function anyone may call. That is 'grant any role to any account' with an HTTP endpoint in front of it — give the function a `call` rule (CWF-017) and check inside the graph that the caller is entitled to make this particular grant.
- Leaving Create Role If Missing on as a default habit. It turns a mistyped role name into a role that exists, has one member, and is named by no permission rule — a grant that silently never takes effect.

## Examples

**Create an account and grant it a role, server-side**

Creating the account and granting the privilege are two writes, and they are two nodes because only the second one can fail in a way that matters. Create User writes a `_User` row with the authority of the SERVER rather than of whoever called the function, which is what makes this safe to expose as an admin action and also what makes it not Sign Up: it mints no session and returns no session token, so it cannot hand anyone a logged-in session — it creates an account somebody else will later sign in to. Add User To Role then writes the membership row, and `createRole` is deliberately left OFF here. That default is the point of the node: a mistyped role name that silently got created would be a grant that names nobody, because the permission rule that was meant to reference it still says the old, correctly-spelled name — so the account would look privileged in the admin screen and be refused by every access check. Off, a role that does not exist is a `failure` you can see. `Roles` comes back through the same resolver a permission rule's `role:` check evaluates, so what the function returns is the actual state of the access check rather than a second opinion on it. Both writes have a THIRD outcome, and wiring it is what makes re-inviting somebody harmless. `unchanged` on Create User means an account with that username already exists — and it still publishes `userId`, carrying the EXISTING account — so routing it into the grant makes the whole function idempotent in one wire rather than needing a lookup-first branch. `unchanged` on Add User To Role means they were already in it, which is a success for an invite, so it joins the success Response. Leave neither dangling: an unwired third outcome is a chain that silently stops, and the caller waits for a reply that is never sent. If a project's idiom is that a duplicate invite IS a bug, say so explicitly with Treat Unchanged As rather than by leaving the wire off. The failure Response is not optional decoration: a function whose only exit is the success path returns nothing at all when Create User fails, and the caller sees a timeout rather than 'that username is taken'.

## Related nodes

[Remove User From Role](./noodl-cloud-removeuserfromrole.md), [Get User Roles](./noodl-cloud-getuserroles.md), [Create User](./noodl-cloud-createuser.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 1. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

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

Each time Do is triggered, the node reports exactly one of **Done**, **Unchanged** or **Failure**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/system-roles.ts"
/**
 * The cloud role family (F86) — Add User To Role, Remove User From Role, Get User Roles and List Users In Role, read from
 * `packages/noodl-viewer-cloud/src/nodes/cloud/{addusertorole,removeuserfromrole,getuserroles,listusersinrole}.ts` and the
 * shared `system-roles.ts` on 2026-10-12 (NSP-022 s96). Cloud-only: graded on the runtime's cloud target, in a backend process
 * the world plays (world.ts HOST, the `roles` service). The call and its answer are `system-calls.ts`'s.
 *
 * What the three that answer "which roles is this user in" write from a Done or Unchanged: `Roles`, the answer's `roles` or
 * `[]` (system-roles.ts :215-218 `publishResult`); Add also `Role Was Created`, `roleCreated === true`. List Users In Role
 * walks the junction the other way: `Users`, `User Ids` (each the answer's or `[]`) and `Total` (a number, else 0). Every
 * role op can answer Unchanged (nodegx-backend roles/SystemRoles.ts :277, :310, :329, :365, :463).
 */

import { defineNode, type InputDecl } from '../spec';
import type { HostScript } from '../world';
import { answered, CALL_STATE, errorOutput, frameEnd, press, TREAT_UNCHANGED_INPUT, type CallState } from './system-calls';

/** The processes a sequence plays in: none, and one per way the role store answers — weighted to answering. */
function hosts(done: Record<string, unknown>, unchanged: Record<string, unknown>): ReadonlyArray<HostScript> {
  const roles = (answers: HostScript['answers']): HostScript => ({ services: ['roles'], answers });
  return [
    {},
    roles([{ answer: { ok: { outcome: 'done', ...done } } }]),
    roles([{ answer: { ok: { outcome: 'done', ...done } }, after: 5 }]),
    roles([{ answer: { ok: { outcome: 'unchanged', ...unchanged } } }]),
    roles([{ answer: { ok: { outcome: 'unchanged', ...unchanged, error: 'Nothing to do.' } } }]),
    roles([{ answer: { ok: { outcome: 'failure', code: 'role/not-found', error: 'There is no role named "staff".' } } }]),
    roles([{ answer: { ok: { outcome: 'failure' } } }]),
    roles([{ answer: { ok: { outcome: 'done' } } }]),
    roles([{ answer: { ok: null } }]),
    roles([{ answer: { throws: 'the database is locked' }, after: 1 }]),
    roles([{ answer: { never: true } }])
  ];
}

/** system-roles.ts :187-197 — the same on the three nodes that take one; blank is a Failure, never the caller. */
const USER_ID_INPUT: InputDecl = { type: 'string', coerce: 'none', displayName: 'User Id', group: 'General', description: 'Object id of the account to act on, usually wired from Create User or a Request parameter; blank is a Failure rather than a fallback to whoever called the function', examples: ['u1', '', 0] };

const roleInput = (description: string): InputDecl => ({ type: 'string', coerce: 'none', displayName: 'Role', group: 'General', description, examples: ['staff', 'editors', '', 0] });

/** system-roles.ts :199-213 */
const rolesOutput = { type: 'array', from: (s: { roles: unknown }) => s.roles, displayName: 'Roles', group: 'Roles', description: 'Every role this user is in once the operation has finished, read back through the same resolver the access check itself uses' } as const;

/** `publishResult` */
const publish = (r: Record<string, unknown>) => ({ roles: r.roles || [] });

const ROLES = { roles: ['staff', 'editors'] };

// ------------------------------------------------------------------------------------------------ Add User To Role

type AddState = CallState & { role: unknown; userId: unknown; createRole: unknown; roles: unknown; roleCreated: unknown };

export const AddUserToRole = defineNode({
  type: 'noodl.cloud.addusertorole',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/addusertorole.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-roles.ts',
  needs: ['host'],
  worldPool: { hosts: hosts({ ...ROLES, roleCreated: true }, { ...ROLES, code: 'role/already-member' }) },
  state: { ...CALL_STATE, role: undefined, userId: undefined, createRole: undefined, roles: undefined, roleCreated: undefined } as AddState,
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    role: roleInput('Name of the role to put the user in, matching the name a permission rule uses after "role:" — letters, digits, underscore and hyphen only'),
    userId: USER_ID_INPUT,
    // read `=== true` at the call
    createRole: { type: 'boolean', default: false, coerce: 'none', displayName: 'Create Role If Missing', group: 'General', description: 'Creates the role when it does not exist yet, instead of failing; leave it off so a mistyped name is a loud Failure rather than a role no rule ever names', examples: [true, false, 'true'] },
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    add: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Adds the user to the role' }
  },
  outputs: {
    roles: rolesOutput,
    roleCreated: { type: 'boolean', from: (s) => s.roleCreated, displayName: 'Role Was Created', group: 'Roles', description: 'True when this call created the role as well as the membership, which is worth branching on because a brand-new role is named by no permission rule yet' },
    error: errorOutput('role')
  }
}).on(
  {
    role: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { role: v }, send: [] }),
    userId: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { userId: v }, send: [] }),
    createRole: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — only true creates a missing role', set: { createRole: v }, send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    add: (s) => press(s, 'always: one add at the end of the frame however many presses — Done, or Unchanged when already a member, with Roles and Role Was Created; or the reason on Error and Failure, per press')
  },
  {
    afterInputs: (s, _i, w) =>
      frameEnd(
        s,
        w,
        'role',
        'add',
        'Add User To Role',
        () => (!s.role ? (['role/name-required', 'Add User To Role: a Role is required.'] as const) : !s.userId ? (['role/user-id-required', 'Add User To Role: a User Id is required. This node never falls back to the caller.'] as const) : undefined),
        () => ({ op: 'add', role: s.role, userId: s.userId, createRole: s.createRole === true })
      ),
    world: {
      host: (s, _i, answer) => answered(s, answer, 'role', 'add', (r) => ({ set: { ...publish(r), roleCreated: r.roleCreated === true }, send: ['roles', 'roleCreated'] }))
    }
  }
);

// ------------------------------------------------------------------------------------------------ Remove User From Role

type RemoveState = CallState & { role: unknown; userId: unknown; roles: unknown };

export const RemoveUserFromRole = defineNode({
  type: 'noodl.cloud.removeuserfromrole',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/removeuserfromrole.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-roles.ts',
  needs: ['host'],
  worldPool: { hosts: hosts(ROLES, { roles: ['editors'], code: 'role/not-member', error: 'The user was not in the role "staff".' }) },
  state: { ...CALL_STATE, role: undefined, userId: undefined, roles: undefined } as RemoveState,
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    role: roleInput('Name of the role to take the user out of, matching the name a permission rule uses after "role:"'),
    userId: USER_ID_INPUT,
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    remove: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Removes the user from the role' }
  },
  outputs: {
    roles: rolesOutput,
    error: errorOutput('role')
  }
}).on(
  {
    role: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { role: v }, send: [] }),
    userId: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { userId: v }, send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    remove: (s) => press(s, 'always: one remove at the end of the frame however many presses — Done, or Unchanged when not a member or no such role (Error says which), with Roles; or the reason on Error and Failure, per press')
  },
  {
    afterInputs: (s, _i, w) =>
      frameEnd(
        s,
        w,
        'role',
        'remove',
        'Remove User From Role',
        () => (!s.role ? (['role/name-required', 'Remove User From Role: a Role is required.'] as const) : !s.userId ? (['role/user-id-required', 'Remove User From Role: a User Id is required. This node never falls back to the caller.'] as const) : undefined),
        () => ({ op: 'remove', role: s.role, userId: s.userId })
      ),
    world: {
      host: (s, _i, answer) => answered(s, answer, 'role', 'remove', (r) => ({ set: publish(r), send: ['roles'] }))
    }
  }
);

// ------------------------------------------------------------------------------------------------ Get User Roles

type GetState = CallState & { userId: unknown; roles: unknown };

export const GetUserRoles = defineNode({
  type: 'noodl.cloud.getuserroles',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/getuserroles.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-roles.ts',
  needs: ['host'],
  worldPool: { hosts: hosts(ROLES, { roles: [] }) },
  state: { ...CALL_STATE, userId: undefined, roles: undefined } as GetState,
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    userId: USER_ID_INPUT,
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    read: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Reads the roles this user is in' }
  },
  outputs: {
    roles: rolesOutput,
    error: errorOutput('role')
  }
}).on(
  {
    userId: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { userId: v }, send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    read: (s) => press(s, 'always: one read at the end of the frame however many presses — Done with Roles, or Unchanged when the user is in none; or the reason on Error and Failure, per press')
  },
  {
    afterInputs: (s, _i, w) =>
      frameEnd(s, w, 'role', 'read', 'Get User Roles', () => (!s.userId ? (['role/user-id-required', 'Get User Roles: a User Id is required.'] as const) : undefined), () => ({ op: 'list', userId: s.userId })),
    world: {
      host: (s, _i, answer) => answered(s, answer, 'role', 'read', (r) => ({ set: publish(r), send: ['roles'] }))
    }
  }
);

// ------------------------------------------------------------------------------------------------ List Users In Role

type ListState = CallState & { role: unknown; limit: unknown; skip: unknown; users: unknown; userIds: unknown; total: unknown };

export const ListUsersInRole = defineNode({
  type: 'noodl.cloud.listusersinrole',
  version: 1,
  source: 'packages/noodl-viewer-cloud/src/nodes/cloud/listusersinrole.ts; packages/noodl-viewer-cloud/src/nodes/cloud/system-roles.ts',
  needs: ['host'],
  worldPool: { hosts: hosts({ users: [{ objectId: 'u1', username: 'ada' }], userIds: ['u1'], total: 7 }, { users: [], userIds: [], total: 0 }) },
  // the declared defaults (Limit 100, Skip 0) never run their setters: both are undefined until written
  state: { ...CALL_STATE, role: undefined, limit: undefined, skip: undefined, users: undefined, userIds: undefined, total: undefined } as ListState,
  outcomes: ['done', 'unchanged', 'failure'],
  inputs: {
    role: roleInput('Name of the role to list the members of, matching the name a permission rule uses after "role:" — letters, digits, underscore and hyphen only'),
    limit: { type: 'number', default: 100, coerce: 'none', displayName: 'Limit', group: 'General', description: 'How many members to return in one call; Total still reports the whole membership, so a clipped page is always visible as one', examples: [100, 1, 0, '10'] },
    skip: { type: 'number', default: 0, coerce: 'none', displayName: 'Skip', group: 'General', description: 'How many members to step over before this page — Skip 100 with Limit 100 is the second page', examples: [0, 100, -1] },
    treatUnchangedAs: TREAT_UNCHANGED_INPUT,
    read: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Reads the members of the role' }
  },
  outputs: {
    users: { type: 'array', from: (s) => s.users, displayName: 'Users', group: 'Members', description: 'The member records for this page, shaped exactly like the account record /users/me answers with, so a For Each over them reads the same property names the User node does' },
    userIds: { type: 'array', from: (s) => s.userIds, displayName: 'User Ids', group: 'Members', description: 'Object ids of the members in this page, in the same order as Users' },
    total: { type: 'number', from: (s) => s.total, displayName: 'Total', group: 'Members', description: 'How many members the role has in total, before Limit — compare it with the length of Users to know whether there is another page' },
    error: errorOutput('role')
  }
}).on(
  {
    role: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it — blank fails that Do', set: { role: v }, send: [] }),
    limit: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it, handed to the store as is', set: { limit: v }, send: [] }),
    skip: (_s, v) => ({ says: 'always: read at the end of the frame by a Do pressed in it, handed to the store as is', set: { skip: v }, send: [] }),
    treatUnchangedAs: (_s, v) => ({ says: 'always: read when an Unchanged is reported', set: { treatUnchangedAs: v }, send: [] }),
    read: (s) => press(s, 'always: one read at the end of the frame however many presses — Done with Users, User Ids and Total, or Unchanged when the role has no members; or the reason on Error and Failure, per press')
  },
  {
    afterInputs: (s, _i, w) =>
      frameEnd(s, w, 'role', 'read', 'List Users In Role', () => (!s.role ? (['role/name-required', 'List Users In Role: a Role is required.'] as const) : undefined), () => ({ op: 'members', role: s.role, limit: s.limit, skip: s.skip })),
    world: {
      host: (s, _i, answer) =>
        answered(s, answer, 'role', 'read', (r) => ({ set: { users: r.users || [], userIds: r.userIds || [], total: typeof r.total === 'number' ? r.total : 0 }, send: ['users', 'userIds', 'total'] }))
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
