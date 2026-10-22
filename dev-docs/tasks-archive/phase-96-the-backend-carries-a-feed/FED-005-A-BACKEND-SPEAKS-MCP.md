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

---

## 5. What was built, and the decisions taken while building it

**Built 2026-09-19 (session 5), branch `cline-dev`.** All eight ACs green. 38 specs across three
suites. It did **not** grow past the phase — R3's "liftable into phase 97" was not needed, and
this section says so because the ruling asked to be told either way.

**Shipped:**

| | |
|---|---|
| `src/server/mcp/toolSurface.ts` | the tools one key sees, derived from `checkClp`/`checkFunctionCall`. Pure |
| `src/server/mcp/McpRoutes.ts` | `POST /mcp` (stateless Streamable HTTP, JSON-RPC 2.0) and `GET /mcp` → 405 |
| `security/model.ts` | `ActingUser`, `rulePrincipal`, the two narrowing sites, and **the R9 fix** |
| `security/state.ts` | `actsAs` resolution, `aclFor` narrowing, `Bearer` carrying a key |
| `service.ts` · `admin-security.ts` | the `_ApiKey.actsAsUserId` column and the admin door that sets it |
| `docs/runtime/BACKEND-MCP.md` | AC8, plus the API-key half of `BACKEND-ACCESS-CONTROL.md` |
| 3 suites | `fed-005-mcp-surface` (21) · `fed-005-mcp-acts-as` (11) · `fed-005-mcp-client` (7) |

### 5.1 The decisions

1. 🔴 **`actsAs` only ever NARROWS, and it applies to the WHOLE data plane.** A bound key is
   allowed what its scopes allow **and** what its user is allowed — never the union, never the
   user's side alone. It is enforced at four sites (`checkClp`, `checkFunctionCall`, `aclFor`,
   `canAccessRecord`) and `rulePrincipal` is the one function all four ask "who is this?".
   ⚠️ **Not an MCP-only rule.** AC2's third clause demanded it — *"a raw HTTP find with the same
   key returns the same set"* — and it is right: two authorization models means an attacker uses
   the weaker one. **Nothing changes for a key with no `actsAs`**, which is every key that
   exists, so the narrowing is opt-in per key and applied by an admin, never by the caller.
2. 🔴 **`canAccessRecord` needed the same branch, and it is the end of the chain that gets
   forgotten.** `aclFor` narrows what a bound key's QUERIES return; `canAccessRecord` is the JS
   twin BAK-001's realtime delivery calls per event per subscriber. Without it a bound key would
   have read every user's rows as they were written, over SSE, while `/classes` correctly showed
   it only its own — the query gate and the event gate disagreeing, which is the exact drift the
   twin exists to prevent. Found by asking what else reads the principal, not by a red.
3. **A missing acted-as user FAILS SHUT (401), rather than degrading to an unbound key.** The
   tempting shape is the dangerous one: deleting the user a key is bound to would silently
   promote that key from "sees one person's rows" to "sees everybody's". Losing access when your
   user is removed is recoverable; the other direction is not.
4. 🔴 **`Authorization: Bearer <api key>` now authenticates.** It used to throw 401 before the
   key branch was ever reached, which made §3.1's second spelling impossible — and Bearer is the
   header MCP clients send. (WFA-005/F7 was bitten by the same throw from the webhook side and
   fixed it by exempting a route.) The alternative was a second credential path inside the MCP
   handler, i.e. a second answer to "is this key valid?". Nothing is loosened: an admin token
   still resolves only to admin, and an unrecognised Bearer still 401s against the same failure
   budget.
5. **Dev-open does NOT relax `/mcp`**, and the gate sits beside the admin one rather than inside
   the fast path. FH-024's lesson verbatim: loopback is not "only the developer", because a
   browser will reach 127.0.0.1 on any web page's behalf — and a relaxed `/mcp` would hand that
   page a tool list and a `_create` on every collection. There is nothing for dev-open to make
   more convenient here anyway: a key IS how a client identifies itself.
6. **The rate class is `data`, declared rather than defaulted.** `classifyRoute` has a `default`,
   so a new access kind silently lands in `public` — the budget meant for `/health` — and this
   door does queries, writes and function runs. Pinned by an invariant in `ops-rate-limit`, not
   only by the tally.
7. **The audit row is raised by the HANDLER, not the dispatcher** — CWF-015's exception, for
   CWF-015's reason word for word: `POST /mcp` is ONE route whose action is whatever tool was
   named, so the dispatcher cannot know whether a row was read, a row was added, or a function
   ran. `actor` is the key's NAME because that is the actor spelling every other row uses for a
   key; a trail with two spellings for one principal is a trail nobody can filter.
8. **An ephemeral `_Session` is minted for a bound key calling a FUNCTION, and released in a
   `finally`.** The graph's own `Allow Unauthenticated` check runs inside the graph and nothing
   outside can wave it, so without this a bound key's function tools would be offered and then
   systematically refused — the one thing `toolSurface`'s docblock says must not happen. The
   token never leaves the process, and a cloud function already runs as system with the master
   key, so it is strictly more privileged than the session it is shown. `finally`, not
   after-success: a failing call must not leave a live credential behind.
9. **No `_delete` tool, for any collection, ever** (AC3) — not "unless the rule allows". The
   suite proves the absence means something by using a collection whose HTTP `delete` rule is
   `authenticated` and deleting through it in the same run.
10. **The endpoint speaks JSON-RPC directly; the SDK is a test dependency only.** A deployed
    backend carries no MCP library and none of its transitive dependencies. The official client
    is used as the INSTRUMENT (AC5) precisely because a hand-rolled server and a hand-rolled
    spec agree with each other by construction.

### 5.2 The four doors, and which gates each passes

FED-004 §5.1 decision 7 pinned that the overlap policy guards the scheduler's fires and nothing
else. **FED-005 is that question's mirror, and the answer is a table in `McpRoutes`' docblock**
rather than something to be discovered later. The two honest gaps, stated rather than hidden:

- **No per-function rate limit (CWF-017).** That budget is for an endpoint a provider hammers;
  an MCP client is a person's laptop and is already inside the `data` class budget.
- **No idempotency (CWF-016).** An idempotency key identifies a DELIVERY being retried by a
  provider. An MCP tool call is not one, and there is no key for the caller to send. Both are
  cheap to add if a real case turns up; neither is worth a fake key today.

### 5.3 What the gates are, and what they are not

- 🔴 **Three mutants, because a security suite that is green on its first run has told you
  nothing.** Each load-bearing change was reverted and the suite re-run: the R9 hoist (2 arms
  red), `aclFor`'s narrowing (5 AC2 arms red, the unbound control **staying green** — which is
  what makes them about the binding), `checkFunctionCall`'s narrowing (both AC4 arms red).
- 🔴 **One of those mutants caught a spec of mine that GRADED NOTHING.** "Ask a live backend for
  its tools, assert none start with `_`" stayed green with the hole deliberately reopened.
  Measured: a backend with rows in `_User`, `_Session`, `_ApiKey` and `_Audit` answers
  `GET /admin/schema` with `["Task"]` — `listTables()` does not report system tables at all, so
  no system name ever reached `checkClp` by that path. Two independent reasons no
  `_Session_find` exists is a good place to be, but only the gate is a security property, so the
  assertion moved to `buildToolSurface` called directly with the system names in the list.
- **Rule 5 does not apply: FED-005 adds no node type.** `/mcp` is a route. No `catalog:generate`,
  no ledger row, no picker row — a ledger row follows a TYPE.
- **Register R8 confirmed unmoved:** `noodl-mcp`'s tool surface reads **8,274 tokens / 20
  resident tools — 6 under the 8,280 budget**, exactly s4's figure. FED-005 adds nothing to
  `packages/noodl-mcp`; §3.3's optional "the List backend API keys tool gains a create form" was
  **not built**, and R8 is the reason to leave it alone until that surface has been put on a diet.
- 🔴 **R4's `noodl-mcp` floor holds at 7 suites / 8 tests — but the FIRST reading said 8 and 10,
  and that is the part worth recording.** That run was started while `test:main` was still going
  on a box at load 10 with a peer's Electron editor up; the quiet re-run reproduced neither extra
  red. *A lone red on a loaded box is a flake, and the way to know is to re-run it rather than to
  reason about it.* **And the seven names, which R4 recorded only as "the same seven names":**
  `nodeIdAllocation` · `cn004` · `cmp004Parts` · `nodeDocBudget` · `cmp001InterfaceDoctrine` ·
  `def038SettledTemplates` · `d54ThemePresetIdentity`. Written down so the next session can
  compare a set rather than a number.

### 5.4 The runs

- **The three FED-005 suites: 39/39.** Surface 21 · acts-as 11 · official client 7.
- **The affected `nodegx-backend` set: 15 suites / 165 tests, green** — every suite that reads a
  `Principal`, walks the route table, or filters a realtime event: `security-model`,
  `security-enforcement`, `security-functions`, `brg-002-api-key-roundtrip`, `ops-audit`,
  `ops-rate-limit`, `impersonate-session`, `realtime-filter`, `realtime-http`,
  `realtime-changebus`, `service-http`, `cloud-http-node`, plus the three new ones.
- **`test:main` 508/508 suites, 8103/8103 tests.** (s4 read 504/8065; peers have added suites
  since, and both numbers are green.)
- `typecheck:backend-tests` and `typecheck:cloud` both exit 0.
- ⚠️ **The `nodegx-backend` WHOLE run was NOT done, and the reason is not "it was slow".** A peer
  held an Electron editor on CDP 9222 for the whole session and the box sat at load 7–11.
  `tests/ac2-page-editor-drag-drive.test.ts` drives a real editor, and s4's own correction says
  the historical "it hangs" report was almost certainly a peer holding that port. Running it
  against a live peer editor would have measured the contention, not the package. **Owed by the
  next session on a quiet box** — it is ten minutes at `--maxWorkers=2`.

### 5.5 Two reviewed counts moved, and both are the artefact

Neither literal was bumped to make a red go green; both gates count the live route table and the
number is the reviewed baseline.

- `ops-rate-limit`'s class tally: `data` **17 → 19**, the two `/mcp` routes, with the reason
  written beside it and a new invariant so the class cannot drift back to `public` by silent
  fall-through.
- `security-enforcement`'s route walk gained an `mcp` arm expecting **401** — a denial like every
  other arm, 401 rather than 403 for the admin arm's reason: no credential was presented, so
  there was no rule to deny. The master key presenting the WRONG credential is 403 and is AC7.

### 5.6 Two design sentences deliberately NOT built, and why

Neither is an AC; both are prose in §3 that a reader would otherwise assume shipped.

- **§3.4's last sentence — "the dashboard's key view shows the last ten calls per key."** Not
  built. The rows are all there (`action: mcp.tool.call`, actor = the key's name) and the Audit
  section already filters on action, so the data is reachable today; what is missing is a panel
  that joins it to the Keys view. Left out because AC6 defines what this task owed — *the rows
  exist with §3.4's fields* — and a second surface is better sized against a real operator
  complaint than against a sentence.
- **§3.3's last clause — "the `List backend API keys` MCP tool gains a create form."** Not built,
  and this one is a REFUSAL rather than a deferral: register R8 says `noodl-mcp`'s resident tool
  surface has **6 tokens of headroom under 8,280**, and anything that grows a description tips
  it. R6's lesson, which R8 records as unlearned, is that a session finding itself just under a
  ratchet should read it as the surface needing a diet, not the ceiling needing a nudge. Creating
  a bound key over HTTP (`POST /admin/keys` with `actsAsUserId`) works today and is what
  `docs/runtime/BACKEND-MCP.md` documents.

### 5.7 What §3.2 asked for and could not have

🔴 **"description from the component's description" has no source on a deployed backend.**
Measured at `noodl-editor/src/editor/src/utils/exporter/util.ts`: `exportComponent` builds
`{name, nodes, connections, ports, roots, metadata}` and drops `ComponentModel.description`, so
the sentence an author writes in the editor never reaches a bundle. Carrying it is an EDITOR
change, which ruling R4 puts outside this phase — filed as register **R10**. The tool description
is therefore built from what the bundle DOES carry (the name and the declared contract), because
a model choosing between tools reads that string and "no description" is the one answer
guaranteed to be useless.
