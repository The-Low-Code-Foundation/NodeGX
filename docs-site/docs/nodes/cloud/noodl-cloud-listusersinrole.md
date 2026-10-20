---
title: "List Users In Role"
---
Lists the accounts in a permission role, from inside a cloud function. Cloud-only and read-only — the inverse of Get User Roles.

Get User Roles answers 'which roles is this user in'. List Users In Role answers the other direction: 'who is in this role'. Both walk the same membership junction, and until this node existed only one direction was reachable — so 'show me the member list', the most ordinary screen in a membership app, could not be built at all except by maintaining a separate collection that duplicates the role table and goes stale the first time somebody changes a membership by hand. `Users` holds the member records in the same shape the User node reads, so a For Each over them uses the same property names. `Total` is the whole membership before `Limit`, so a clipped page is always visible as one rather than silently looking like the complete roster. `unchanged` fires when the role exists and nobody has joined it; a role that does not exist is a `failure` naming it, because answering an empty list for a misspelled role draws the empty-community screen for a typo.

## When to use it

Whenever a cloud function needs the membership of a role rather than the roles of a member — rendering a members directory or a staff list, counting how many people hold a subscription tier, or fanning a notification out to everyone in a role. Compare `Total` with the length of `Users` to decide whether to ask for another page.

## At a glance

| | |
|---|---|
| Category | Cloud |
| Type name | `noodl.cloud.listusersinrole` |
| Available in | cloud |
| SSR compatibility | — |
| Provided by | `noodl-viewer-cloud` |
| Behaviour spec | version 1 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `limit` | Number | `100` | How many members to return in one call; Total still reports the whole membership, so a clipped page is always visible as one |
| `role` | String | — | Name of the role to list the members of, matching the name a permission rule uses after "role:" — letters, digits, underscore and hyphen only |
| `skip` | Number | `0` | How many members to step over before this page — Skip 100 with Limit 100 is the second page |
| `treatUnchangedAs` | Enum (`unchanged`, `done`, `failure`) | `unchanged` | What this node reports when the action was valid and there was nothing to do. Unchanged (the default) keeps it a third outcome of its own. Done suits a project whose chains should carry on either way; Failure suits one whose idiom is that a no-op is a bug. Completed fires whatever this is set to. |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `read` | Signal | — | Reads the members of the role |

### What each input does

**Role** (`role`)

- always: read at the end of the frame by a Do pressed in it — blank fails that Do

**Limit** (`limit`)

- always: read at the end of the frame by a Do pressed in it, handed to the store as is

**Skip** (`skip`)

- always: read at the end of the frame by a Do pressed in it, handed to the store as is

**Treat Unchanged as** (`treatUnchangedAs`)

- always: read when an Unchanged is reported

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `total` | Number | — | How many members the role has in total, before Limit — compare it with the length of Users to know whether there is another page |
| `userIds` | Array | — | Object ids of the members in this page, in the same order as Users |
| `users` | Array | — | The member records for this page, shaped exactly like the account record /users/me answers with, so a For Each over them reads the same property names the User node does |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires once Users and User Ids hold this page of the role membership |
| `unchanged` | Signal | — | Fires when the role exists and has no members at all — the "nobody has joined yet" branch |

### Failure outputs

| Name | Type | Default | Description |
|---|---|---|---|
| `error` | String | — | Why the last operation could not be performed |
| `failure` | Signal | — | Fires when the members could not be read — a blank Role, an unusable name, or a role that does not exist |

## Patterns

- Put this behind a cloud function whose call rule names the role that may see the roster — a member list is other people's account records, and a cloud function runs as system, so the function's own permission rule is the only thing deciding who may read it.
- Page a large role by wiring Skip from a page counter and comparing Total against the running count of rows already shown, rather than assuming one call returned everybody.

## Watch out for

- Rendering Users straight onto a public page without a call rule on the function — the graph's Allow Unauthenticated port is what applies when no rule is written, and ticked means the whole membership roster is readable by anyone on the internet.
- Treating the length of Users as the membership count; it is the size of one page, and Total is the number that answers 'how many members are there'.

## Examples

**Show the member list for a role, a page at a time**

Get User Roles answers 'which roles is this user in'. List Users In Role answers the other direction — 'who is in this role' — and that direction is the one an ordinary membership screen needs. Both walk the same junction, so neither can disagree with what a permission rule's `role:` check would say. Paging is done with Limit and Skip rather than by fetching everything and slicing in the browser, because the member list of a role is exactly the collection that is small in development and large in production; Skip is computed from the page number in an Expression so the arithmetic lives in one place. `Total` is the count for the WHOLE role, not the page, which is what a pager needs to know how many pages there are — a function that returns only the rows cannot render '3 of 47'. `unchanged` fires instead of `done` when the role is empty or does not exist, and it is wired to the same Response here on purpose: an empty member list is a perfectly good answer to send back, and leaving that outcome dangling would make a brand-new role look like a broken function to the caller. Read-only throughout — nothing on this path writes, so it is safe to call on every render of the screen.

## Related nodes

[Get User Roles](./noodl-cloud-getuserroles.md), [Add User To Role](./noodl-cloud-addusertorole.md), [Remove User From Role](./noodl-cloud-removeuserfromrole.md)

## Code export

Runs only on the backend, inside cloud functions, so it has no React form.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

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
