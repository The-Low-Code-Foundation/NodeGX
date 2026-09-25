# BMG-007 — API keys: a scope picker, an acting user, the secret behind a copy button

**Opened 2026-09-24** (README §2 row 5). **Depends on BMG-001.** The smallest tab task; first.
**Status: ✅ built and driven (s3, 2026-09-25) — §6.**

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

## 6. Built (s3, 2026-09-25)

**What exists now.**
- `src/admin/app/scopes.ts` — the ONLY place in the app that spells a scope string: `toScopes`
  (boxes → the five shapes; read+write collapse to `classes:*`, *any* drops the named list),
  `fromScopes` (a stored array → boxes; unknown strings are dropped, never shown as text),
  `isEmptyChoice`, `describeScopes` (the list's chips: *read data*, *write data*, *any function*,
  *3 functions*).
- `views/keys.tsx` rewritten: list (Name · May do · Acts as · Last used relative, full time on
  hover · Created · Status · Edit/Revoke), a `Drawer` the URL opens (`#/keys/new`,
  `#/keys/<id>`), `ScopePicker` (two groups, a select-all each — *Data* is indeterminate when
  one of the pair is ticked; *Functions*' select-all IS *call any function* and greys the named
  list; a name a stored key carries that the backend no longer serves stays ticked and says
  *not deployed any more*), *Acts as* radios + `Picker` over `/api/_User` with the one sentence
  under it, and `SecretCard` (mono box, **Copy secret** → *Copied ✓*, the only-time notice, a
  filled-in `curl` with `X-NodeGX-Api-Key` and the first non-system collection, **Copy the
  command**). Done re-reads the list, because the key may already have been used while its
  secret was on screen. A dev-open backend gets a warning notice on the page (see below).
- Server: `PUT /admin/keys/:id` (`admin-security.ts updateKey`, `state.ts updateApiKey`) —
  `scopes` and/or `actsAsUserId` (null clears); 400 on a bad scope / unknown user / empty
  patch, 404 unknown key, **409 on a revoked key** (revocation stays final; the row hides Edit
  too). Audit action `apikey.update` (`ops/audit-actions.ts`). The two hints (`HttpServer.ts`
  `/mcp` refusal, `toolSurface.ts` no-tools sentence) now say *"make one on the API keys page
  of the backend manager"*.
- `format.ts ago()` (just now / n min / n hours / n days / date). `styles.css`: `.scope-*`,
  `.secret-box`, `tr.revoked`, and radios exempted from the field's full-width input rule (they
  rendered with the dot centred and the words pushed right — shot 1 of the first drive).

**Measured, not in §2.** A **dev-open** backend bypasses key scopes wholesale: on the default
posture a `classes:read` key got **201** on `POST /api/Pet`. The route spec's backend and the
drive's are locked (`devOpen: false`, FED-005's config shape), and the page says so when
`whoami.security.devOpen` is true, since a person ticking boxes on a dev-open backend would
otherwise be ticking nothing.

**Gate readings (2026-09-25).** `npm run typecheck` (both tsconfigs) exit 0. `npx jest
tests/admin-app tests/admin-dashboard.test.ts tests/bmg-007-key-update.test.ts
tests/brg-002-api-key-roundtrip.test.ts tests/ops-audit.test.ts tests/fed-005-mcp-acts-as.test.ts
tests/feed-drive.test.ts` → 11 suites, **123/123**. Bundle **35,080 gzip** (109,068 raw) of the
160,000 budget (was 32,538). New specs: `tests/admin-app/scopes.test.ts` (AC1, 64 combinations
through the real `validateScopes`), `tests/admin-app/keys-view.test.tsx` (AC4, AC5, AC7 under
jsdom + the source gate), `tests/bmg-007-key-update.test.ts` (AC6 over sockets: list, audit,
the key obeys the new scopes; bind/unbind; the four refusals; read-only policy).

**Drive** (`drives/bmg007/run.sh ac seed` — locked throwaway backend on 8697, seeded with Pet
under ann and Pet under bob via their own sessions, one key made the old way, two configured
functions; headless Chrome on 9333; readings in `drives/bmg007/readings/ac.json`; shots
`shots/bmg007-*.png`):

| AC | reading |
|---|---|
| 2 | *nightly report*, Read records only: `GET /api/Pet` **200**, `POST /api/Pet` **403** |
| 3 | *ann laptop* acting as ann sees `["Milo"]`; the unbound read key sees `["Milo","Rex"]`; Acts-as column reads *ann* / *backend* |
| 4 | route `["cleanup","sendInvoice"]` = page boxes `["cleanup","sendInvoice"]`; the jsdom spec covers the empty list (*No functions yet*) and *any* still working |
| 5 | Copy → button says *Copied ✓*, `navigator.clipboard.readText()` **equals the secret**; after Done the secret is on neither the page nor `GET /admin/keys` |
| 6 | Edit *reporting* (starts `[read ✓, write ☐]`), tick Write, Save → `GET /admin/keys` scopes `["classes:*"]`; audit `apikey.update` success with `{keyId, scopes, actsAsUserId: null}`; row chips *read data · write data* |
| 7 | the drawer's only text field is *Name*; the rendered page (`#main` + drawer text) matches no `classes:` / `functions:` string |
| §5 | *Last used* on sqlite: **just now** after Done and after Refresh; `lastUsedAt` in the route `2026-09-25T05:19:04Z`. Postgres not measured this session (no `DATABASE_URL` on this box). `no page errors` from the CDP console |

**Trap met.** The first AC7 reading was a false red: `document.body.textContent` includes the
INLINED app bundle's own source (the page is one document), which contains `scopes.ts`. Measure
`#main` and the drawer, never `body`, on this page.

**Out.** Expiry (README R5, filed). The Postgres `lastUsedAt` reading. A light-theme shot.
