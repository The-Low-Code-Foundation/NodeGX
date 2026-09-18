# FED-005 — A backend speaks MCP

> "this app would need to have an MCP type connection into that one, and maybe vice versa so
> [Distraction] would be able to research stuff that's in your todo list to help you think the
> tasks through." — Richard, 2026-09-18

## 1. The person sentence

**Someone pastes their backend's `/mcp` address and an API key into Claude on their laptop, and
Claude can list their tasks, add one, and call the functions the key is allowed to call. Another
NodeGX app does the same with the same key, and neither needs anything installed.**

## 2. What is there (read 2026-09-18, HEAD `f3f67874d`)

| reading | where |
|---|---|
| The backend has no MCP endpoint. `grep -ri mcp packages/nodegx-backend/src` finds only comments calling config files "MCP-editable" | grep, 2026-09-18 |
| `packages/noodl-mcp` is an MCP **server for the editor**, a **client of the backend's admin routes**: ~30 admin tools (permissions, roles, keys, triggers, workflows, email, search, files, audit) and provisioning. No tool reads or writes ordinary rows except `Export a backend collection` | `noodl-mcp/src/tools/backendTools.ts`, `provisionTools.ts`, `src/backend/client.ts` |
| Scoped API keys exist and are the right principal: `X-NodeGX-Api-Key`, `_ApiKey` with hashed key, `scopes` of `classes:*` / `classes:read` / `classes:write` / `functions:*` / `functions:<name>`, revocable, `lastUsedAt` | `security/state.ts:282-330`; `security/model.ts:503-521`; `service.ts` `ensureSystemTables` |
| An API key resolves as `kind: 'apiKey'`, not as a user. It is not tied to a person, so `creatorOwns` rows are invisible to it unless the key's scope bypasses ACLs. **This is the one design question in the task** (§3.3) | `security/state.ts` |
| Per-function `call` rules already say who may invoke a function; `functions:<name>` scopes already say what a key may call | `security/model.ts:166-215, 503-521` |
| The todo app's collections, for the record: `Task`, `Action`, `Event`, creator-owns, `delete: nobody` on all three | `NodeGX test projects/Todo list/nodegx.security.json` |

## 3. Design

### 3.1 The endpoint

`POST /mcp` (Streamable HTTP transport, JSON-RPC 2.0, the current MCP spec's stateless mode;
no SSE session required, so it works behind any proxy the backend already works behind). Auth is
`X-NodeGX-Api-Key` or `Authorization: Bearer <api key>`. No key, or a revoked key: 401 before
any JSON-RPC is parsed. Master key is refused here on purpose: an MCP client gets a scoped key,
never the admin credential.

### 3.2 The tools a key sees

`tools/list` is computed from the key's scopes and the security config, per request:

- For every collection the key may read (`classes:read` or `classes:*`, and the collection's
  `find` rule is not `nobody` for api keys): `<collection>_find` (where, order, limit, skip) and
  `<collection>_get` (objectId).
- For every collection the key may write: `<collection>_create`, `<collection>_update`. **Never
  `_delete`** in this task; delete stays HTTP-only and per-collection-rule. A collection whose
  `delete` rule is `nobody` therefore behaves identically over MCP, which is what the todo app
  relies on.
- For every function the key may call (`functions:*` or `functions:<name>`, and the function's
  `call` rule admits api keys): `<function name>` with an input schema taken from the function's
  declared inputs (the Request node's ports), description from the component's description.

Each tool's JSON schema is generated from `schema.json` for collections, so the client sees field
names and types. A key with no scopes sees an empty list and a helpful `instructions` string.

### 3.3 Whose rows

An API key is not a person. Two options; **this task implements the first and records the second
as future work**:

1. **A key acts as one user.** `_ApiKey` gains an optional `actsAsUserId`. When set, the
   principal resolves as that user for ACL purposes (rows it owns, its roles), while rate limits
   and audit still name the key. Richard's laptop key acts as Richard; the Distraction backend's
   key acts as the Distraction service user in the todo backend. This is exactly the todo bridge.
2. A key acts as system and passes the user per call. Rejected for now: it moves authorisation
   into the caller, which is the Supabase service-role mistake this backend has avoided.

Creating a key with `actsAsUserId` is admin-only, in the same place keys are made today
(`POST /admin/keys`, the dashboard, the `List backend API keys` MCP tool gains a create form).

### 3.4 Audit

Every MCP tool call writes an audit row: key id, tool name, collection or function, objectId if
any, duration, outcome. `Query the audit trail` already reads that table. The dashboard's key
view shows the last ten calls per key.

### 3.5 What this is not

Not a replacement for `packages/noodl-mcp`, which stays the editor's MCP server. Not a general
"expose any HTTP route": only collections and functions, only under scope. Not resources or
prompts in this task; tools only.

## 4. Acceptance criteria

1. **AC1** — `POST /mcp` with no key is 401; with a revoked key 401; with a valid key `initialize`
   succeeds and `tools/list` returns exactly the tools §3.2 derives for that key's scopes. A key
   with `classes:read` only sees `_find`/`_get` and nothing else. Asserted by count and by name.
2. **AC2** — With a key that `actsAs` user A on a creator-owns collection holding rows of A and B,
   `Task_find` returns only A's rows; `Task_create` stamps A as owner; a raw HTTP `find` with the
   same key returns the same set.
3. **AC3** — No `_delete` tool exists for any collection, including one whose HTTP `delete` rule is
   `authenticated`.
4. **AC4** — A function with `call: role:staff` is absent from a key acting as a user without that
   role and present for a key acting as one with it; calling an absent tool by name is a JSON-RPC
   error, not a 500.
5. **AC5** — The official MCP TypeScript client (dev dependency in tests only) can connect, list
   and call; the drive in FED-006 uses it.
6. **AC6** — The audit table has one row per call from AC1–AC5 with the fields in §3.4.
7. **AC7** — The master key is refused on `/mcp` with a message that says to make a scoped key.
8. **AC8** — `docs/runtime/BACKEND-MCP.md` exists: the address, how to make a key, the todo-app
   example with `Task_find` and `Task_create`, and what a key can never do.
