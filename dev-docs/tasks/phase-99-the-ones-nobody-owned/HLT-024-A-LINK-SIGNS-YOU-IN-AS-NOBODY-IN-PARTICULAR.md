# HLT-024 — A link signs you in as nobody in particular

> ✅ **BUILT 2026-09-23 (P99 s23), `8f3d240b2` — AC1–AC4 met; AC5 (browser) and AC6 go to the DBT
> stream's L171 drive, which reads the same thing.** Built to §3's shape as written. No ruling was
> asked: the shape does what the route's own docblock already said it did.
>
> | AC | reading |
> |---|---|
> | 1 control | Before the fix, 6 of the 7 new specs were red. Magic link and fake-OIDC provider: exchange `roles` **`undefined`**; `/users/me` on the same token `[]` / `["staff"]`. |
> | 2 | After the fix, the exchange equals `/users/me` on the same session for **0 roles `[]`, 1 `["staff"]`, 2 `["coach","staff"]`**, plus a provider sign-in `["coach"]`. The exchange's own fields (`authOutcome`, `authNotice`, `sessionToken`) are unchanged. |
> | 3 | The scan reads `src/` for every `sendJSON(…)` naming `sessionToken`. It is **pinned at exactly four sites** (`exchange`, `login`, `me`, `signup`), so it cannot pass on an empty list, and it requires `roles: await this.rolesFor(` / `this.deps.rolesForUser(` in each. Before the fix it named **`server/oauth-routes.ts:exchange`**. Mutant: with `roles` dropped from `/login` it names **`server/users.ts:login`** (`cp`-restored, `cmp` clean). |
> | 4 | The docblock now reads *"the `_User` record plus `roles` plus `sessionToken`"* and points at the test. |
> | 5 | ✅ **Driven 2026-09-23 by the DBT stream (TASK-L171 follow-up).** A real magic link, by clicking only, through Mailpit: `POST /oauth/exchange` 200 with `roles=["staff"]`, the coach's way on rendered **within ~25 ms** (two runs, 20 ms poll), and **0 `/users/me`** between the exchange and that render. Positive control: a stored session with no `roles` makes 2 `/users/me` on the pre-change template (the runtime's own re-read plus the gate's ask) — so the counter can see an ask. |
> | 6 | ✅ **Met, and the ask is DELETED.** After a link `app_roles_once` never fired. With it unwired, a stored session with no `roles` still reached the coach's page — the runtime's own `/users/me` on load fills them — so no reachable arrival needs it. The `Switch`, the gate's `askRoles` and both wires are gone; the gate still waits on `undefined` rather than guessing. `START-HERE.md` and decision 005 corrected. |
>
> **Gates:** `tsc --noEmit` on `nodegx-backend` 0. The 7 suites beside it (auth-*, def005, hlt-015, hlt-024,
> bak*) pass, 109/109. The full backend jest was **stopped at 21/174 suites**, not finished: it drives
> browsers against templates and a peer was building. Three `tpl008-*-drive` suites were red when it
> stopped. They drive `templates/todo-list-demo`, contain no auth code, and a peer has 426 template
> deletions staged. ⚠️ `HttpServer.ts:89` fails eslint (`applyAdminSecurityHeaders` unused), and
> `oauth-routes.ts` is off-prettier. Both were already true at HEAD.

🔴 **Opened 2026-09-23 from the Digital Bricks Training stream (its sprint 49, L171), at Richard's
request: *"Yep add the roles issue to phase 99 please."*** Found by L171's sign-in drive, then
measured directly on a real magic link. Specced, not built.

## 1. The person sentence

> **A coach who signs in from the link in their inbox lands on a page that already knows they are a
> coach — exactly as they would had they signed in any other way.**

## 2. What it is, measured 2026-09-23 (`cline-dev` `d8597d3ef`)

DEF-005 (a) made a signed-in user's `roles` part of every session response, so a page can decide
what to draw on its **first** render without a round trip — its own test says so in its title:
*"AC2 — /login carries them too, so the very first render can already branch"*
(`tests/def005-membership.test.ts:312`). The `User` node's `roles` output reads it
(`noodl-runtime/src/nodes/std-library/user/user.ts`, "Refreshed wherever the user model is — Fetch,
sign-in, session regain").

**One sign-in route was never given it.** `POST /oauth/exchange` (`server/oauth-routes.ts`
`exchange()`, ~l.510) is how BOTH a magic link and every provider sign-in (Google, GitHub, OIDC)
hand the session to the app, and it answers with the `_User` wire record, the session token and
`authOutcome`/`authNotice` — **and no `roles`**. Its own docblock says the response is
*"deliberately the SAME shape `/login` returns"*; `/login` (`server/users.ts` l.243) and signup
(l.321, l.338) and `/users/me` all spread `roles: await this.rolesFor(…)`.

Measured on one real magic link — Mailpit, the link's POST, the handoff code, the exchange — and then
`/users/me` on **the same session**, for a user in the `staff` role:

| | response |
|---|---|
| `POST /oauth/exchange` | 12 keys — `ACL, authNotice, authOutcome, createdAt, email, emailVerified, firstName, lastName, objectId, sessionToken, updatedAt, username`. **`roles`: absent** |
| `GET /users/me`, same session token | **`roles: ["staff"]`** |

**What a person sees.** The client stores the exchange's answer as the session
(`ParseAuthAdapter` → `setSession(handle, response)`), so the `User` node reports `roles` as
**`undefined`** — which DEF-005 defines as *"we could not ask"*, distinct from `[]`. A page that does
the right thing with that (draws neither the coach's way on nor the learner's) draws **nothing**
until something re-reads the session. In the DBT template's L171 drive, a coach arriving from the
link saw a Home page with a *Sign out* button and no way to their people; a reload fixed it, because
reload goes through `/users/me`. A page that does the WRONG thing — treats `undefined` as "not
staff" — shows a coach the learner's page. Either way the bug is invisible to anyone who signs in
with a password, which is the path DEF-005's tests drive.

**The template's workaround (committed, `3fbcb71dd`):** App's gate asks once — `roles` unknown while
signed in fires the `User` node's `fetch`, through a `Switch` so it cannot loop. Correct after the
fix too (it simply never fires), so it does not need removing; but every app that gates on `roles`
needs the same three nodes today, and nothing tells them so.

## 3. The shape (recommended, to be ruled)

- **The exchange carries `roles`, from the ONE resolver.** `HttpServer` already hands `OAuthRoutes`
  a closure over `deps.security` (`signupAllowedForAnonymous`, ~l.466); give it
  `rolesForUser: (id) => deps.security.rolesForUser(id)` beside it and spread
  `roles: await this.deps.rolesForUser(handoff.userId)` into the response, AFTER the wire record, as
  `/users/me` does. **Not** a second query: `users.ts`' docblock is explicit that a second resolver
  could say "member" while enforcement disagreed. The same `undefined`-when-no-`SecurityState`
  behaviour `rolesFor` has.
- **Find every session-issuing response and hold them together.** The bug is a route that was added
  after the rule; the fix that lasts is a test that enumerates the routes that return a
  `sessionToken` and asserts each carries `roles`, so the next one cannot be added without it.

## 4. Acceptance criteria

1. **Reproduced first**: a magic link and (with a fake provider, as the OAuth tests do) a provider
   sign-in, each through `POST /oauth/exchange`, for a user in a role — `roles` absent; `/users/me` on
   the same session has it. The control.
2. After the fix, the exchange's `roles` equals `/users/me`'s, for a user in one role, in two, and in
   none (`[]` — never `undefined` when a `SecurityState` exists).
3. Every route that answers with a `sessionToken` is enumerated by a test and asserted to carry
   `roles`; the test is demonstrated failing by name with the new spread removed.
4. The `exchange` docblock's *"the SAME shape `/login` returns"* is true, and says it is now tested.
5. Browser: a user signs in from a real magic link and the `User` node's `roles` is set on the FIRST
   render after the redirect, with no `/users/me` request between the exchange and that render (read
   off the network).
6. **The DBT stream's:** the template's sign-in drive shows its ask-once never firing after a link
   sign-in (no `fetch` from `app_roles_once`), and the note in `START-HERE.md` is updated.

## 5. Owner and neighbours

Small — an hour or two, most of it the enumerating test. Not blocking: the template's workaround
holds. Affects every NodeGX app that gates on `roles` and offers magic links or provider sign-in,
which is every members-area-shaped template. Own commit, only its own paths staged.

Neighbours: DEF-005 (the rule this completes), HLT-015 (the link's GET; this is the step after its
POST), BAK-004 (magic links), the OAuth provider flow (same exchange).
