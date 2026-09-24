# BMG-007 — API keys: a scope picker, an acting user, the secret behind a copy button

**Opened 2026-09-24** (README §2 row 5). **Depends on BMG-001.** The smallest tab task; first.
**Status: 📋 not started.**

## 1. The person sentence

> **Someone makes a key for their script by ticking what it may do — read data, write data, call
> these functions — optionally says whose name it acts in, copies the secret once, and later sees
> when it was last used.**

## 2. What is wrong, measured

- `createKey` (`index.html:1797-1830`): *Name* and *Scopes (comma separated)*, placeholder
  `classes:read, functions:*`, default `classes:read`, split on `,`. Nothing lists what is
  valid.
- The valid vocabulary is five shapes and nothing else (`validateScopes`,
  `security/model.ts:590-606`): `classes:read` · `classes:write` · `classes:*` · `functions:*` ·
  `functions:<name>`. The server's error names them (`:602`), after the fact.
- Function names are one route away (`GET /admin/permissions/functions`, `HttpServer.ts:998`);
  the page does not ask.
- `actsAsUserId` (`admin-security.ts:21-25`) — a key that acts as a user, so row ACLs and
  creator-owns apply to it — cannot be set here.
- The secret is shown in a read-only textarea (`:1822`); no copy button; the `copy()` helper
  exists (`:1875` uses it for callback URLs).
- No expiry (README R5, filed).

## 3. What to build

- **New key** drawer:
  1. **Name** (what it is for).
  2. **What it may do** — grouped checkboxes, select-all per group, one line each:
     - **Data** — ☐ *Read records* (`classes:read`) · ☐ *Write records* (`classes:write`); both
       = `classes:*`.
     - **Functions** — ☐ *Call any function* (`functions:*`) or the list of functions from the
       route, one checkbox each (`functions:<name>`); *any* greys the list.
     - Nothing else exists, so nothing else is shown; the server's five-shape rule is the
       spec's fixture, and the mapping is one pure function with a spec.
  3. **Acts as** — *This key is the backend* (default) / *This key acts as a user* → `Picker`
     of users; one sentence under it: *"Records the user cannot see, the key cannot see."*
  4. **Create** → the **secret card**: the secret in a monospace box, **Copy** (with *Copied*),
     *This is the only time it is shown*, and an example `curl` with the header filled in.
- **List:** Name · May do (chips: *read data*, *write data*, *3 functions*) · Acts as
  (username or *backend*) · Last used (relative) · Created · status; **Revoke** in the row
  (type the name, as today).
- **Edit scopes** on an existing key: the same checkboxes → `PUT /admin/keys/:id` (route to
  add: today only create and revoke exist; the store keeps scopes as an array, so it is a
  patch).
- The MCP and server hints that say "scopes like `["classes:read"]`" (`toolSurface.ts:372`,
  `HttpServer.ts:1897`) add *"or make one on the API keys page"*.

## 4. Acceptance criteria

1. Every combination of the checkboxes maps to a scope array `validateScopes` accepts (spec:
   exhaustive over Data × Functions choices with a fixture of three function names).
2. A key with *Read records* only gets 403 on `POST /api/Pets` and 200 on `GET` (drive).
3. A key acting as Ann sees only Ann's rows on a creator-owns collection (drive).
4. The function list on the page equals the names the route answers; a backend with no
   functions shows *No functions yet* and the *any* box still works.
5. Copy puts the secret on the clipboard (drive reads it back); the secret never appears in
   the list after the card closes.
6. Edit scopes changes `GET /admin/keys` and the audit trail records it.
7. 🔴 No text field on the page takes a scope string.

## 5. Watch for

- `brg-002-api-key-roundtrip.test.ts` drives keys end to end; run it after the `PUT` route.
- The read-only admin may list keys but not create; the drawer's *Create* is a `writeButton`.
- Last used comes from `lastUsedAt` (`:1785`); it is updated on use — measure that it is, on
  both stores.
