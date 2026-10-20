# The app's backend: where it is and what it answers

The app in `./training` (Digital Bricks Training, a NodeGX app) has its backend running on this computer. This page is
the whole of what you need to read it and change it. Everything below was measured against it today; nothing is a
guess.

- **Base URL:** the first line of `./BACKEND-URL` (for example `http://127.0.0.1:52050`).
- **Admin credential:** the first line of `./ADMIN-TOKEN`. Send it as `Authorization: Bearer <token>` on every
  `/admin/*` and `/executions*` request. Never put it in the editor's page source or in a file you ship; the editor's
  own server reads it from `ADMIN-TOKEN` and talks to the backend; the page talks to the editor's server.
- `GET /health` needs no credential. It answers `{ ok, backendName, security: { devOpen, enforced }, workflows:
  { functions: [{ name, workflow, writesRecords }] } }`. ⚠️ `writesRecords` reads the graph's record nodes only; in
  this app every function touches records from JavaScript, so it says `false` for all 27 and is wrong for six.

## The data: tables, rows, links

- `GET /admin/schema` → `{ tables: [{ name, columns: [{ name, type, targetClass? }], indexes: [{ name, fields,
  unique }] }] }`. 26 tables here. Types are `String`, `Number`, `Boolean`, `Date`, `Object`, `Array`, `File`,
  `Pointer`, `Relation`. A `Pointer` or `Relation` column links to `targetClass`. **This app has none:** it links by
  name. A column called `conceptId` holds the value of `Concept`'s unique `conceptId`; `learnerId`/`userId`/`createdBy`
  hold a `_User` id. If you draw those as links, say on screen that they are read from the names.
- `GET /api/<Table>?limit=5` (with the admin credential) → `{ results: [ … ] }`, the rows; `GET /api/<Table>?count=1&limit=0`
  → `{ results: [], count }` for a row count. Every row carries `objectId`, `createdAt`, `updatedAt`, `ACL`.
- `_User` is the people table. `GET /admin/users?limit=200` → `{ users: [{ objectId, username, email, roles: [],
  disabled, lastSessionAt }] }`; `&q=<text>` searches, `&role=<name>` filters. 12 people here.
- `GET /admin/roles` → `{ roles: [{ name, users: [ids], names: [emails] }] }`. One role here: `staff`.

## Who may do what: the rules

- `GET /admin/permissions` → `{ config, etag, enforced }`. `config` is the whole policy:
  ```json
  { "version": 1, "devOpen": false,
    "defaults": { "permissions": { "find": "nobody", "get": "nobody", "create": "nobody", "update": "nobody", "delete": "nobody" }, "creatorOwns": false },
    "collections": { "<Table>": { "permissions": { "find": …, "get": …, "create": …, "update": …, "delete": … }, "creatorOwns": true|false } },
    "functions":   { "<name>": { "call": …, "rateLimit": { "ratePerMinute": 5, "burst": 5 } } },
    "files": { "upload": …, "read": …, "delete": … }, "signup": … }
  ```
  A rule value is `"public"` (anyone, signed in or not), `"authenticated"` (anyone signed in), `"nobody"`,
  `"role:<name>"`, or a list of those (any one of them is enough). `find` and `get` are both reading (a list, one row).
  A table missing from `collections` uses `defaults`. **Here `collections` is empty: nobody reads or writes any table
  directly; every row is reached through a function.** `creatorOwns: true` means a signed-in person may read and change
  the rows they created even where the table's rule says no. `devOpen: true` would switch every rule off on a dev
  machine; it is `false` here.
- `GET /admin/permissions/functions` → `{ functions: [{ name, deployed, call, source, allowNoAuth, rateLimit,
  effectiveRateLimit, timeoutMs }] }`: one row per deployed function with its effective call rule.
- `POST /admin/permissions/check` with `{ "principal": { "kind": "anonymous" } | { "kind": "user", "userId": "<objectId>" },
  "collection": "<Table>", "op": "find"|"get"|"create"|"update"|"delete" }` or `{ "principal": …, "functionName": "<name>" }`
  → `{ allowed, rule, reason }`: the backend's own dry run of a decision, in words. Nothing runs, nothing changes.
- **To change who may touch a table:** `PUT /admin/permissions/collections/<Table>` with
  `{ "permissions": { "find": "role:staff", "get": "role:staff", "create": "nobody", "update": "nobody", "delete": "nobody" }, "creatorOwns": false }`
  (all five ops). `DELETE /admin/permissions/collections/<Table>` makes it use the defaults again. These are live at
  once and survive a restart. ⚠️ **The backend reads `./training/nodegx.security.json` only on its FIRST start**
  (when it has no policy of its own yet); after that its own copy wins. So a change made only on the backend leaves
  the project's file wrong, and the next backend set up from the project starts with the old rules. Write the same
  `collections` entry into the file too (it has the same shape as `config` above). *(s1's first version of this page
  said the file was re-applied at every start; the round's stranger measured it and corrected it.)* To change a function's rule: `PUT /admin/permissions/functions/<name>` with
  `{ "call": … }`, and the file's `functions` entry.
- `PUT /admin/permissions` with the whole `config` and an `If-Match: <etag>` header replaces the policy; a `412` means
  someone changed it since you read it.

## The functions: what they are, what they touch, what called them

- The functions are components in the project: `./training/components/__cloud__/<name>/nodes.json` (the graph) and
  `connections.json` (the wires). One with a `noodl.cloud.request` node is an endpoint (27); one without is a helper
  (6, under `__cloud__/shared/`, placed inside endpoints as a node whose `type` is `/#__cloud__/shared/<Name>`).
- **What a function reads and writes** is in its graph and its code: a record node (`DbCollection2` or `DbModel2` read;
  `NewDbModelProperties`, `SetDbModelProperties`, `DeleteDbModelProperties`, `AddDbModelRelation`,
  `RemoveDbModelRelation` write) names its collection in `parameters.collectionName`; a `JavaScriptFunction` node's
  `parameters.functionScript` calls `Noodl.Records.query({ className: 'Lesson', … })`, `.create('Progress', …)`,
  `.save(row)`, `.delete(row)`, `.fetch(…)`. **In this app every touch is in JavaScript** (40 script nodes: 17 query,
  11 save, 6 create); 13 name the collection as a literal, the rest pass it in a variable. Draw what you can read;
  say *mentions* where the name is not a literal. A helper's touches count for every endpoint that places it.
- **What calls a function from the app:** a `CloudFunction2` node in any page component (`./training/components/<Page>/…/nodes.json`),
  `parameters.function` is the function's name. 20 of them here.
- **To call a function:** `POST /functions/<name>` with a JSON body. Every function here but one requires a signed-in
  person (`authenticated`, 11) or a staff member (`role:staff`, 15); `unsubscribe` is `public`. The admin credential is not a person and is refused with
  *"Unauthenticated requests not accepted."* (that refusal is itself recorded as a run, see below). The app signs
  people in by magic link, which needs a mailbox. **To run a function as a real person, see BACKEND-2.md:** a key
  bound to that person, on the backend's MCP door.

## What ran: runs and the audit

- `GET /executions?limit=50&offset=0` → a bare array, newest first, with the total in the `X-Total-Count` header.
  Filters: `kind=function|workflow`, `name=<contains>`, `status=success|error|cancelled`, `since=<ISO or epoch ms>`,
  `trigger=<trigger id>`. A row: `{ id, workflowId, workflowName, kind, triggerType, status, startedAt, completedAt,
  durationMs, errorMessage? }`. For a function run `workflowId` is the function's name. The row does **not** say which
  tables the run touched.
- `GET /executions/<id>` → the row with `steps` (a workflow's steps with input, output, status, duration).
- `GET /admin/audit?limit=50&offset=0` → `{ entries: [{ at, action, actorKind, actor, outcome, status, method, route,
  target, detail }], count }`: every admin action (a rule changed, a role made, a function deployed, a login). Filter
  with `&action=<name>`.
- There is no push channel for runs; poll `/executions?since=<last startedAt>` every couple of seconds.

## Workflows and triggers (none here yet; the shapes, so you can draw them when there are)

- `GET /admin/workflow-defs` → `{ workflows: [{ id, name, entry, steps: [{ id, name, kind, ref?, next?, routes?,
  onError?, ui? }] }], lastRuns }`. `kind` is one of 15 served by `GET /admin/workflow-step-kinds` with a `displayName`
  and a `summary` each (Call Function, Branch, Switch, For Each, Merge, Transform, Validate, Filter, Sort, Deduplicate,
  Split, Stop, Return, Wait, Wait Until). A `call-function` step's `ref` is the function it calls.
- `GET /admin/triggers` → `{ triggers: [{ id, type, name, enabled, target: { kind: "function"|"workflow", name },
  schedule?: { cron }, webhook?: { slug }, dbChange?: { collection, actions: ["create"|"update"|"delete"] }, status }] }`.
- To make one: `POST /admin/triggers` with `{ "type": "db-change", "name": "…", "enabled": true, "target": { "kind":
  "function", "name": "<fn>" }, "dbChange": { "collection": "<Table>", "actions": ["create"] } }` (or `"type":
  "schedule"` with `"schedule": { "cron": "0 9 * * *" }`). The answer is `{ trigger: { id, … } }`.
  `POST /admin/triggers/preview` with `{ "cron": "0 9 * * *" }` answers the schedule in words and its next runs.
  `DELETE /admin/triggers/<id>` → `{ deleted: true }`.

## The project beside it

`./training` is a NodeGX project: `nodegx.project.json`, `nodegx.security.json` (the policy, same shape as `config`),
`components/` (the pages and, under `__cloud__/`, the functions), `backend/schema.json` (the tables as the project
declares them), `docs/` (the brief and architecture, worth a skim). The kit's `@nodegx/project-contract` reads and
writes it; the kit's `@nodegx/preview` runs the app in a page beside your canvas (see the skill page). The app needs a
person signed in by magic link to show anything past its sign-in page; the canvas does not need the app running to
draw the backend.
