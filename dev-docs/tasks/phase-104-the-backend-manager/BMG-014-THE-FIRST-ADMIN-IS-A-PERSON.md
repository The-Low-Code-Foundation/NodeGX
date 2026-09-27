# BMG-014 — The first admin is a person: an email and a password on the first page load

**Opened 2026-09-25** (Richard, s12, quoted in §1). **Depends on BMG-001, BMG-004.**
**Status: ✅ built and driven s12, 2026-09-25 — §6.**

## 1. The person sentence

> **The first time someone opens the backend manager they choose an admin email and password.
> That makes an account they can sign into the manager with, and into their own app as a
> person with the `admin` role. Later they give other people access to the manager from the
> Users page — full, or look-but-don't-change — with a switch, not a token.**

Richard, 2026-09-25: *"One very clever feature of pocketbase was when you started it, it asked
you on the very first page load of the backend to choose an admin email and password. This
creates an admin user immediately, and let you log in securely but also immediately use your
front end app as a user with admin role. This will be important because right now if you
publish a NodeGX backend, it's free to access to anyone. It would be nice to let the admin add
other admins to the admin role, to allow them to access the backend dashboard. Perhaps even a
read only admin mode where they can let clients log in to see their data, but not fuck around
with any settings. A bit like Directus too, which also has a checkbox like 'admin access'."*

## 2. What is wrong, measured (s12)

- The manager signs in with **a token and nothing else** (`App.tsx` `Login`: one password box
  labelled *Admin credential*; `api.ts` sends it as `Authorization: Bearer`). The token is the
  `adminToken` in `secrets.json`, minted at first start; `whoami.firstRun` shows a banner that
  says so and how to replace it with `--token`. BAK-005-NOTES §first-run refused a setup page
  because "gating it on the current credential would make it a password-change form".
- **There is no admin person.** `Principal` is `admin` (the credential), `apiKey`, `user` or
  `anonymous` (`security/model.ts:32-40`). A session is never an admin: `resolvePrincipal`
  answers `{kind:'user'}` for every session (`state.ts:442`). So the operator's own app has
  no account that can administer anything, and the manager has no idea who is signed in
  (`trace.actor` is `''` for an admin, `HttpServer.ts:1748`).
- **The read-only tier is a second token** (`--readonly-token`), so handing a client
  look-only access means handing them a secret to paste.
- **The public signup keeps every field it is sent**: `POST /users` spreads `...rest` into the
  row (`users.ts` `signup`), so a signup could set `emailVerified` or `disabled` on itself —
  and would have been able to set any new admin column. `PUT /users/:id` strips
  `ADMIN_ONLY_USER_FIELDS` (BMG-004); signup did not.
- The editor already hands the token to the page in the fragment
  (`BackendManager.js openDashboard`: `/_admin#token=…`), so from the editor the first page
  load is already signed in as the credential — the moment to ask for the account.

## 3. What to build

### 3.1 An account with backend access (server)
- `_User.adminAccess`: `'full'` | `'readonly'` | absent. A server-owned column
  (`ACCOUNT_COLUMNS`), refused from a graph (`PROTECTED_PROPERTY_KEYS`), stripped from a
  signup and a self-update (`ADMIN_ONLY_USER_FIELDS`), written only by `PUT /admin/users/:id`
  and the setup route.
- **A session of a person with `adminAccess` resolves to an admin principal** carrying
  `userId` and `roles`: `full` → `{kind:'admin', userId}`, `readonly` → `{kind:'admin',
  readonly:true, userId}`. Everything that gates on `kind === 'admin'` — every `/admin` route,
  the manager, the read-only refusal, CLP/ACL bypass in the app — works unchanged. A disabled
  account is refused before the upgrade (BMG-004 R3). A bound API key acting as an admin
  person stays a user (FED-005: `actsAs` only narrows). The audit actor is the person's id.
  A record the person creates in the app is stamped with them as owner, like any session.
- `POST /_admin/setup {email, password, username?}` — admin-gated (the credential, or a full
  admin). Creates the account through `SystemUsers` (verified, password hashed), gives it
  `adminAccess:'full'`, ensures the role **`admin`** and puts the person in it, mints a
  session and answers it. **409 once a full-access account exists** — after the first, access
  is given on the Users page. Audited `admin.setup`.
- `POST /_admin/login {email, password}` — public, on the auth budget. Finds the account by
  email or username, verifies the password, refuses a disabled account and one without
  backend access with ONE sentence (no oracle), counts a failure against the same per-IP
  budget as a wrong token (BAK-005's limiter), audits `admin.login` / `admin.login.failed`
  with the person as actor, mints a `_Session`, answers `{sessionToken, access}`.
- `GET /_admin/whoami` adds `person` (`{id, username, email}` or null when the credential
  signed in) and `adminAccount` (does any full-access account exist). `security` unchanged.
- `PUT /admin/users/:id {adminAccess}`: full admins only (the dispatcher already refuses
  read-only). Refused in words: changing your **own** access; removing or downgrading the
  **last** full admin; and `disabled:true` / `DELETE` on the last full admin. Rows carry
  `adminAccess`; `?status=admins` lists them.
- The CLI's first-run lines say *no admin account yet — open the manager and it asks for one*.

### 3.2 The page
- **Sign-in**: email + password first. *Use the admin credential instead* opens the token box
  (the credential still signs in; scripts and the editor need it). A session is kept in
  `sessionStorage` like the token was (`X-Parse-Session-Token`; `?token=` on the SSE stream).
- **Setup**: signed in with the credential on a backend with no full-access account, the page
  shows **Create your admin account** before anything else: email, password (with *Generate*
  and show), one sentence on what the account is for. *Create and sign in* → `POST
  /_admin/setup` → the page is now the person. A read-only credential sees a notice instead.
- **Topbar** names the person (email) beside the tier chip. *Sign out* ends the session.
- **Users**: the list shows an *admin* / *read-only admin* chip; the drawer gets a **Backend
  access** section with three options in words — *No access to the manager* · *Can look, not
  change* · *Full admin* — a sentence under each, refused-in-words for yourself and the last
  full admin. *Show: Backend admins* filter.
- The first-run banner now only tells a person that the generated credential exists and
  where, once the account is made.

## 4. Acceptance criteria

1. On a locked backend with no account, `whoami` with the credential answers
   `adminAccount:false, person:null`; `POST /_admin/setup` answers 201 with a session; a
   second setup is 409; the page shows Setup first and lands the person in the shell.
2. `POST /_admin/login` with that email and password answers a session; `whoami` with it is
   `readonly:false`, `person.email` set; the session reaches `/admin/*` and `/api/_User`; a
   wrong password, a disabled account, and an account without access are all 401 with the
   same sentence, each counting toward the per-IP lockout (429 after the budget).
3. A person with `readonly` access: `whoami.readonly:true`; every write is refused with the
   read-only sentence; the page shows the read-only chip and hides write buttons.
4. `admin` role exists with the person in it; in the app the person's session bypasses
   collection rules and a record they create carries them as owner.
5. A public signup or self-update sending `adminAccess`, `emailVerified` or `disabled` stores
   none of them; a graph's Update User refuses `adminAccess` by name.
6. Guards: own access 409; last full admin 409 on downgrade, disable and delete; the
   sentences name the person.
7. The audit trail has `admin.setup` and `admin.login` with the person's id as actor, and
   `admin.login.failed` for a wrong password.
8. Route tally `admin` 94 (`POST _admin/setup`), `auth` 17 (`POST _admin/login`).

## 5. Out of scope
- Replacing the token: scripts, the editor and MCP keep `adminToken`. Nothing here removes it.
- Two-factor, password rules beyond non-empty, an *admin* role with special meaning to the
  rule engine (it is an ordinary role the person is put in).
- The editor opening the page as the person (BMG-012 candidate: the editor could hold a
  session instead of the token).

## 6. Built (s12, 2026-09-25)

**Server.** `users/accountColumns.ts`: `adminAccess` in `ACCOUNT_COLUMNS` and `ADMIN_ONLY_USER_FIELDS`, `AdminAccess`,
`adminAccessOf`, `ADMIN_ROLE_NAME`. `security/model.ts`: the admin principal may carry `userId` + `roles`.
`security/state.ts` `resolvePrincipal`: a session whose row carries `adminAccess` resolves to `{kind:'admin', userId}`
(`readonly:true` for `readonly`), AFTER the disabled check. `service.ts`: `_User.adminAccess` (String) added idempotently;
`hasAdminAccount()` on the service and `security.hasAdminAccount` on `StartedService`. `HttpServer.ts`: actor = the
person's id; `ctx.audit({actor})` may name the actor when the credential step left it blank; `recordAudit` writes
`admin.login.failed` for a refused `admin.login`; `stampCreate` stamps an admin PERSON as owner; a person spends their own
rate-limit bucket (`admin:<id>`); two routes `POST _admin/login` (public, auth budget) and `POST _admin/setup` (admin).
`AdminDashboardRoutes.ts`: `whoami` answers `person` + `adminAccount`; `login` (email OR username, one sentence
`LOGIN_REFUSED`, `recordAuthFailure` on every refusal); `setup` (409 `SETUP_DONE` once a full-access account exists;
`SystemUsers.create` verified, `adminAccess:'full'`, role `admin` ensured with a description, a session). `admin-users.ts`:
rows carry `adminAccess`; `?status=admins`; `PUT {adminAccess}` written by the route itself (`SystemUsers` refuses the key by
name — `PROTECTED_PROPERTY_KEYS`), guarded: `OWN_ACCESS_MESSAGE`, `lastAdminMessage` on downgrade / `disabled:true` / DELETE.
`users.ts` `signup` strips `ADMIN_ONLY_USER_FIELDS` (it spread every field it was sent — measured). `readonly.ts` refusal
names the Users page. `cli.ts` prints *NO ADMIN ACCOUNT YET* + where the credential is. `audit-actions.ts` `admin.setup`;
`rate-limit.ts` `_admin/login` in `AUTH_PATTERNS`. Tally `admin: 94`, `auth: 17` (`ops-rate-limit.test.ts`).

**Page.** `api.ts`: `Credential = {kind:'token'|'session', value}` (kept as JSON; a bare string from before reads as a token),
`credentialHeaders`, `liveQuery`, `submitPassword`, `createAdminAccount`, `refreshWhoami`; `fields.tsx` uploader uses the same
headers. `App.tsx`: `Login` = email + password, the credential under *Use the admin credential instead*; `Setup` (`#setup-form`)
renders instead of the shell while `!adminAccount && !readonly`; `#person-chip`; `NoAdminNotice` for a read-only sign-in on a
backend with no admin; `FirstRunNotice` and `DevOpenNotice` reworded (dev-open never relaxed the admin gate — FH-024).
`views/users.tsx`: `ACCESS_OPTIONS` (three tiles in words), `accessWord`, the *admin* / *read-only admin* chip, *Show: Backend
admins*, the *Backend access* section (your own row: tiles disabled + *This is you*), `cryptoRandom` exported. `ui.tsx`
`WriteBtn` title generalised. `styles.css`: the login checkbox no longer stretches (`#login input` hit it — pre-existing).

**Measured.** `tests/bmg-014-first-admin.test.ts` 11/11 (AC1–AC7 over sockets on a LOCKED backend with `signup: 'public'`;
a second service for the lockout). Drive `drives/bmg014/run.sh ac seed` **33/33**, no page errors; shots
`shots/bmg014-{setup,login,own-access,grant-full-ask,readonly-person}.png`. `bmg-004-users.test.ts` AC7's column list grew
`adminAccess` (the one pin that moved). Full backend `npx jest --maxWorkers=4`: **199 suites PASS, 1 skipped (`fed-003-live-cache`), 0 FAIL, 2387 tests, exit 0, 348 s** (2026-09-25, s12, after every change in this commit; the first run had `hlt-024-exchange-roles` red because a session-issuing response must carry `roles` — both new responses now do, through a `rolesForUser` dep, and the scan's known list grew the two sites).

**What each AC measured.** AC1 whoami `adminAccount:false, person:null` → setup 201 with a session → `adminAccount:true`,
`person.email`; 409 for a second setup by the credential AND by the person; 403 for the read-only credential; 401 for nobody.
AC2 login by email and by username; wrong password / no such account / an app user with the right password / a disabled
admin: all 401 `LOGIN_REFUSED`; the session reaches `/admin/status`, `/api/_User`, `/admin/permissions`; ten refusals lock the
address (429, `Retry-After`) for the token too. AC3 a `readonly` person: `whoami.readonly:true`, 403 with the read-only
sentence on three writes, reads 200; on the page the tier chip and disabled write buttons. AC4 the `admin` role with the person
in it and a description; `Pet.create:'nobody'` — an app user 403, the admin person 201 with `owner` and an ACL for them.
AC5 a signup sending `adminAccess/emailVerified/disabled` stores none (custom field kept); a self-update likewise; `SystemUsers`
refuses `adminAccess` as `user/protected-property`; the Users route refuses it as a generic property. AC6 own access 409;
last full admin 409 on downgrade / disable / delete, each naming the person; invalid spelling 400; a second full admin may
downgrade the first and the first's live session is read-only from the next request. AC7 `admin.setup` success 201 with
`detail.userId`, `admin.login` with `actor` = the person, `admin.login.failed` for the wrong password, `user.update` with
`changed: ['adminAccess']`; no password in any entry. AC8 the tally.

**Traps.** 🔴 `#login input { flex:1 }` also styled the checkbox. 🔴 The `_admin/login` audit action is set BEFORE the
handler runs (the principal is anonymous), so the outcome flip lives in `recordAudit`, keyed on `AUDIT_LOGIN_SUCCESS`.
🔴 The editor still opens the page with `#token=` — every open from the editor signs in as the credential, never as the
person (a new tab has an empty `sessionStorage`); §5 leaves that to BMG-012. 🔴 A `readonly` person on a backend with no
full admin sees the shell + `NoAdminNotice`, not Setup (they cannot make the account).
