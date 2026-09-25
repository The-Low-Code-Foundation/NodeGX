# The backend manager (the served admin page)

`nodegx-backend` carries its own web UI. A deployed backend is administered
from a browser with no NodeGX editor installed anywhere near it — the thing you
actually need on a VPS at 2am — and a backend the editor is running is
administered from the same page: the editor's Backend Services card manages
*which* backend runs, and its one button, **Manage data & settings**, opens
this page signed in. Everything inside a backend is done here.

```
http://your-backend-host:8577/_admin
```

The page and the editor speak the same HTTP routes to the same server, which is
why they cannot drift. Since phase 104 the page is a small Preact app, still
bundled into the one served document at build time (`scripts/build-admin-app.js`).

---

## What it does

The nav groups the pages the way a person thinks about a backend: **Data**,
**People**, **Access**, **Automation**, **Storage**, **Settings**, **Activity**.

| Group | Page | What you can do |
|---|---|---|
| Data | **Collections** | Browse, search, page, create, edit and delete records; a typed form per record; cells edit in place. Optional **Live** toggle streams changes over the backend's SSE realtime. |
| Data | **Schema** | See collections and fields; create a collection as rows of choices; add, rename and retype fields; indexes; **delete a collection** (typed confirmation). |
| People | **Users** | List `_User`, create a user, delete one, trigger a password-reset email, see role membership. |
| People | **Roles** | Create/delete roles, add members. Permissions reference these as `role:<name>`. |
| People | **Sign-in** | Identity providers (Google, GitHub, OpenID Connect) with the callback URL to register, magic links, the redirect allow-list, account linking. |
| Access | **Permissions** | Per-collection rules for `find`/`get`/`create`/`update`/`delete` plus creator-owns. Shows loudly when enforcement is off. |
| Access | **API keys** | Issue scoped keys (secret shown once), revoke them. |
| Automation | **Triggers** | List schedules/webhooks/db-change hooks with last-fired and last-result; enable, disable, fire now. |
| Automation | **Workflows** | List WF-001 definitions and run them with a payload. |
| Automation | **Runs** | The full run history — every function, trigger, workflow and backup run — with per-run detail: the failures first, then the steps. (Called *Executions* before phase 104.) |
| Storage | **Files** | Browse what the app has stored (thumbnails, sizes, *used by* the record that points at each file), upload, download, delete — a delete refuses by name while a record uses the file and offers to clear the field. Below: the largest upload, how long a private link lives, the kinds refused as ticked categories (in the backend's own sniffer vocabulary) plus custom types, thumbnail presets as rows, and the clean-up on a schedule built with the schedule builder. |
| Settings | **Email** | SMTP settings, verification policy, templates, and a real test send. |
| Settings | **Backups** | When (the schedule builder, a missed-run policy), keep (the last N, one a day for N days, one a week for N weeks), where, "back up now", the archives with **Download** and **Restore…** — restore asks for the backend's typed name with *Back up first* ticked, and blocks the page until the backend answers. |
| Settings | **Secrets** | The values cloud functions read with a Secret node: add, set a new value, delete. Names only ever come back; a value is typed once. Variables set in the environment are listed beside them. |
| Settings | **Search** | Per collection: searchable or not, which text fields, rebuild the index. |
| Settings | **Server** | Who may call from a browser (any site, or named sites as chips, cookies), rate limits per kind of request, logging, the activity trail's retention, run history retention and *Compact now*, metrics. Each card saves alone and applies at once. |
| Activity | **Activity** | Who changed what, when, and from where — the thing as a link (*Pets · permissions*, *editors · role*), the actor as a person or *API key: deploy*, the detail as a tree with the raw entry one click away. Filter by action · who · outcome · when. (Called *Audit* before BMG-011.) |

Sections whose backing subsystem is not present in your build are **not
rendered**. They never appear and then fail. Every list that is empty says what
to do first.

### Deep links

The address bar is the page's state, so any page can be sent as a link:

```
#/collections/Pet            that collection
#/collections/Pet/<objectId> that record, open in its drawer
#/collections/Pet/new        a new record in it
#/schema/Pet                 that collection's card
#/schema/Pet/new-field       that collection with the *Add a field* picker open
#/users/<objectId>  #/roles/<name>  #/triggers/<id>  #/runs/<id>
#/triggers/new               the new-trigger drawer
#/secrets  #/search  #/server  #/audit   the Settings pages and Activity
```

`#/executions` still works and lands on Runs.

### From the editor

The editor's Backend Services card manages *which* backend runs; everything
inside it is this page (phase 104, BMG-012 — the editor's own schema, data,
permissions, triggers, email, sign-in, search and secrets panels are gone).
Three things in the editor open the page, all signed in through the same
fragment hand-off:

| In the editor | Opens |
|---|---|
| the local backend card's **Manage data & settings** | the home |
| the property panel's **Add a field to <table>** on a Query Records / Create Record node whose table has no such field | `#/schema/<table>/new-field` |
| the workflow canvas's **Add a trigger on …** / **Edit this trigger…** | `#/triggers/new` / `#/triggers/<id>` |

The hand-off is `/_admin#token=<credential>&route=<encoded path>`: the main
process resolves the admin credential and opens the browser, the page consumes
the fragment at boot (scrubbing it from the address bar and history), signs in,
and then sets the route. Only a plain path is accepted as a route (one leading
`/`, no `#`); anything else opens the home, still signed in.

### Light and dark

The page follows the system theme; the ☀ / ☾ button in the top bar overrides
it and remembers your choice in the browser. Both themes are painted from the
editor's own design tokens, copied into the page at build time.

### What it deliberately does not do

- **Author graphs.** Functions and workflows are edited in the editor. The
  dashboard shows what they did; it does not write them.
- **Restore without being asked twice.** Restore is a button (since BMG-011,
  at Richard's ruling), but it is behind the backend's typed name, *Back up
  first* is ticked by default, and the backend disconnects from its database
  for the swap and reconnects to the restored one before it answers — so what
  the page says was restored is what the next request reads. The CLI
  `nodegx-backend restore` with the service stopped remains the path for a
  backend you cannot reach in a browser.
- **Manage more than one backend.** One dashboard per instance.

---

## Signing in

Two ways in, one form:

- **As a person** — an email and a password. The account is an ordinary `_User`
  row that carries **backend access** (`adminAccess`: *full* or *read-only*),
  given on the Users page by a full admin. Its session is the admin principal
  for every route, so the same account signs into your app (where it is in the
  `admin` role the setup step made) and into the manager.
- **With the admin credential** — BAK-003's `adminToken`, behind *Use the admin
  credential instead*. It is what the editor, MCP and scripts hold; it is not
  replaced by the account.

Find the credential in the backend's data directory:

```
<data-dir>/secrets.json   →   { "adminToken": "…" }      (mode 0600)
```

Or choose your own at start:

```sh
nodegx-backend serve --data-dir /srv/nodegx --port 8577 --token "$(openssl rand -base64 32)"
```

The manager holds whichever you used in `sessionStorage` (this tab only,
cleared when the tab closes) and sends it on every request — the credential as
`Authorization: Bearer …`, a session as `X-Parse-Session-Token`. There is no
cookie and therefore no CSRF surface. A refused password spends the same
per-address failure budget as a refused token.

### First run

The first time the manager is opened with the credential on a backend that has
no admin account, it shows **Create your admin account** before anything else:
an email and a password. That makes the account, gives it full backend access,
puts it in the `admin` role, and signs you in as yourself. From the editor the
page arrives already holding the credential, so the first load is that step.

This is not an unauthenticated setup page (which BAK-005-NOTES refused, and
still does): `POST /_admin/setup` is admin-gated, so the credential — printed
at start, minted before anything can be served — is the proof. Once a
full-access account exists the route answers 409 for good; after that, access
is given on the Users page.

The CLI's startup lines say *NO ADMIN ACCOUNT YET* and where the credential is
until the account exists.

### Dev-open backends

If `security.json` has `"devOpen": true`, the backend enforces **nothing** —
collection permissions, row ACLs and this dashboard's own credential are all
bypassed. Dev-open is only ever active on a loopback bind (the service refuses
to start dev-open while bound wider), so this is a local-development state.

The dashboard does not stage a password prompt in front of a backend that would
ignore it. It opens straight up and puts a banner at the top of every page
saying enforcement is off.

---

## Read-only access

For support, demos and clients who should see their data and change nothing.
Two ways to give it:

- **A person** — on the Users page, under *Backend access*, choose *Can look,
  not change*. They sign in with their email and password and see everything;
  every write is refused. No token to hand over.
- **A second credential** that can read everything the admin surface exposes
  and change nothing:

```sh
nodegx-backend serve --data-dir /srv/nodegx \
  --token "$FULL_ADMIN_SECRET" \
  --readonly-token "$READONLY_SECRET"
```

It is stored as `adminReadonlyToken` beside `adminToken` in `secrets.json`.

- **Never minted automatically.** A backend has this tier only if you ask.
- **Enforced server-side, in the dispatcher.** A read-only admin cannot issue
  `POST`/`PUT`/`DELETE` on *any* route. It is not a UI toggle — hand someone the
  read-only token and `curl` cannot write either.
- **Refused loudly.** The response says which tier was used and what to use
  instead, so nobody debugs it as a broken backend.
- The only non-`GET` exceptions are three reads that need a request body:
  opening a realtime subscription, the permission dry-run, and the schema
  promotion *diff* (not `apply`).
- Providing a read-only token identical to the full one **refuses to start** —
  a "read-only" credential that silently grants write access is worse than none.

---

## Turning it off

```sh
nodegx-backend serve --data-dir /srv/nodegx --no-admin
```

The `/_admin` routes are **not registered**. They return 404, exactly like any
unknown path — an operator who disabled the dashboard leaks no evidence that
there was ever one to disable.

---

## Exposing it safely

The dashboard is an admin surface on a public port. Treat it accordingly.

**The cautious default — do not expose it at all.** Bind the service to
localhost and reach the dashboard over an SSH tunnel:

```sh
ssh -N -L 8577:127.0.0.1:8577 you@your-server
# then open http://127.0.0.1:8577/_admin locally
```

**If it must be reachable**, put it behind something that authenticates before
NodeGX sees the request:

- a VPN (Tailscale/WireGuard) — simplest and strongest;
- a reverse proxy with its own auth in front of `/_admin`;
- an IP allow-list on `/_admin` in nginx/Caddy.

**Always use TLS.** The credential travels in a header on every request; over
plain HTTP it is on the wire in cleartext. Terminate TLS at a reverse proxy.

### What the service already does for you

- **The page fetches nothing.** Markup, styles and script are one document
  (the app is bundled into it at build time), and its `Content-Security-Policy`
  is `default-src 'none'` with a per-response nonce and no `unsafe-inline`. No
  CDN, no font host, no analytics — a hostile value in one of your records has
  nowhere to send anything.
- **Record values are rendered as text.** The app's source may not use
  `dangerouslySetInnerHTML` or `innerHTML` — a test reads every source file.
- **Failed credentials are rate-limited** — 10 failures per client per 5
  minutes, then `429` with `Retry-After`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `frame-ancestors 'none'` (it cannot be framed), `Cache-Control: no-store`.

### Two honest caveats

1. **The rate limiter keys on client identity** — `X-Forwarded-For` when
   present, otherwise the socket address. Directly exposed, an attacker sharing
   your NAT can burn the budget and lock *you* out for five minutes. Behind a
   correctly-configured reverse proxy it keys per real client. This is a
   deliberate trade: a speed bump beats a permanent lockout on a service with
   one credential and no recovery flow.
2. **The credential in the browser is the master key.** It bypasses all CLPs and
   ACLs by design. Cross-site scripting inside the dashboard would be a full
   compromise — which is what the CSP, the nonce and the text-only rendering rule are
   for. Hand out the read-only token instead whenever read access is enough.

---

## For agents

Everything above is enumerable over MCP:

- `get_backend_admin_dashboard` — enabled/disabled, URL, which credential tier
  the agent itself holds, whether a read-only tier is provisioned, enforcement
  posture, and the available sections.
- The dashboard's data operations are the same routes the other backend tools
  already use (`get_backend_permissions`, `list_backend_roles`,
  `list_backend_triggers`, `list_backend_backups`, …).

---

## See also

- [Access control](./BACKEND-ACCESS-CONTROL.md) — the credential, CLPs, ACLs, roles, keys
- [Realtime](./REALTIME.md) — the SSE stream the Live toggle rides
- [Email](./BACKEND-EMAIL.md) — SMTP and the reset/verify flows
- [Backup & restore](../../packages/nodegx-backend/docs/BACKUP-RESTORE.md) — the CLI restore path
