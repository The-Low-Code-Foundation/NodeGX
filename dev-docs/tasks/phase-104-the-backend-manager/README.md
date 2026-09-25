# Phase 104 — The backend manager: nobody types JSON

**Scoped:** 2026-09-24, from Richard's read of the served admin dashboard (`/_admin`) after the s0
hand-off ([BMG-000](BMG-000-THE-HAND-OFF.md)).
**Status: 📋 OPEN — BMG-000 ✅, BMG-001 ✅ (s2, 2026-09-24: the page is a Preact app, fourteen views ported, composer kit specced), BMG-007 ✅ (s3, 2026-09-25: scope boxes, acts-as, the secret behind Copy, `PUT /admin/keys/:id`), BMG-004 ✅ (s4, 2026-09-25: people not ids, `/admin/users`, *Disable sign-in*, four door defects fixed), BMG-002 ✅ (s5, 2026-09-25: filter rows, header sort, columns, saved views, a control per type, *who can see this record*, CSV import; signed file URLs fixed on a locked backend), BMG-005 ✅ (s6, 2026-09-25: members by name with ✕, add by search or pasted emails with invitations, what a role can do from the stored rules, a delete that counts them; a `Picker` Enter race fixed); R1/R3/R4 ruled (§8); BMG-006 next.**
**Prefix: `BMG`.**

> "Every single page in that backend page seems to be a bit shit at the moment. I think it's a bit
> in prototype mode? … Nothing here looks like a serious BaaS. … make a plan to turn each tab in the
> backend manager into something that a non technical person could still use because it's got
> visual composers everywhere and no 'write your JSON here' or 'comma separated scopes' shit."
> — Richard, 2026-09-24

> "The web interface you made for the backend management is actually way better. … the backend
> services tab is just to manage which backend is running and attached to the project."
> — Richard, 2026-09-24, one hour earlier ([BMG-000](BMG-000-THE-HAND-OFF.md))

## 1. The person sentences

> **Someone who has never written a line of code runs their app's backend from one page in their
> browser: they shape the data, decide who may do what, let people in, schedule the work, and
> watch it run — and every choice is a thing they pick, never a string they compose.**

And the one every tab is graded against, because it is the one the drive will read:

> **On any page, a person can name what they want in plain words and find a control that does
> exactly that. Nothing asks for JSON, a comma-separated list, a cron string, an id, or a name
> they have to know already.**

The phase closes the seam BAK-005 opened on 2026-07-26: *"the editor keeps its panel — this
dashboard is for operating deployed instances."* Richard reversed that on 2026-09-24 (quoted
above). The dashboard is now **the** backend surface; the editor's card manages which backend runs
and hands everything inside it to the browser ([BMG-012](BMG-012-THE-EDITOR-LETS-GO.md)).

## 2. What Richard found, measured

Each finding measured against the **working tree** on 2026-09-24 (`index.html` carries BMG-000's
uncommitted +968/−229; line numbers are the working tree's, and
`git show HEAD:…` differs). Read, not run, except the size gate and the dashboard suite (run, 32/32).

| # | Richard's words | What the code does | Task |
|---|---|---|---|
| 1 | *"the Users tab, you can't even add fields to the users table"* | `view('users')` (`index.html:1500-1583`) draws six fixed columns and a **New user** modal with Username / Email / Password only. `_User` is a table like any other to `POST /admin/schema {action:'addColumn'}`, and the Schema page's code offers *Add field* on `_` tables (`:1140`, only *Delete collection* is withheld) — but ⚠️ **measured in BMG-001's drive (2026-09-24): `GET /admin/schema` does not list `_User` at all** on a backend with two users (`drives/bmg001/readings/ac34.json`, `userListed: [Pet, Toy]`), so the capability is reachable from no tab. BMG-004 makes it one | [BMG-004](BMG-004-USERS.md) |
| 2 | *"You have to use a JSON filter to filter records in the Collections tab"* | A search box does `contains` over String fields (`:785-803`). Anything else is *Advanced filter (JSON)* (`:721-724`): a raw `where` string parsed with `JSON.parse` (`:800`). Sort is fixed to `-createdAt` (`:808`); no header click sorts. The backend understands 16 operators (`$eq $ne $gt $gte $lt $lte $in $nin $exists $regex $text contains $and $or $relatedTo` + geo; `QueryBuilder.ts:410-702`) and none is reachable without typing it | [BMG-002](BMG-002-COLLECTIONS.md) |
| 3 | *"the user is expected to compose a JSON … CRON jobs"* | Triggers (`:2063-2142`) is a **list only**: Enable/Disable and Fire now. No create, edit, delete or rotate here at all (`POST/PUT/DELETE /admin/triggers` exist, `admin-triggers.ts:7-14`); the cron string is not even shown. The only authoring UI is the editor's `TriggerFormFields.tsx`: cron as raw text (`:177-182`), *payload (JSON, optional)* (`:198`). Files' orphan sweep is a raw *Cron* input (`:2629`); Backups shows `scheduled: <cron>` as a chip (`:2552`) with no way to set it | [BMG-008](BMG-008-TRIGGERS.md), [BMG-011](BMG-011-FILES-BACKUPS-OPS.md) |
| 4 | *"… permissions"* | Five free-text inputs per collection labelled `find get create update delete`, placeholder *(default)*; a comma means OR (`:1720-1745`). The grammar is `public \| authenticated \| nobody \| role:<name>` (`security/model.ts:133-148`). Defaults, signup, file and function rules are *disabled* inputs with a note to use `PUT /admin/permissions` or MCP (`:1699-1714`). Cards are drawn for `_` tables the validator refuses (`model.ts:429`). The editor already has a checkbox matrix for this (`CollectionPermissions.tsx`, `ruleVocabulary.ts`) | [BMG-006](BMG-006-PERMISSIONS.md) |
| 5 | *"the API key has a 'Scopes (comma separated)' field that doesn't even show what scopes are available"* | `:1803-1807`: one text input, placeholder `classes:read, functions:*`, split on `,`. The whole vocabulary is **five** shapes (`validateScopes`, `model.ts:590-606`): `classes:read`, `classes:write`, `classes:*`, `functions:*`, `functions:<name>`. `actsAsUserId` (`admin-security.ts:21-25`) cannot be set. The function names for `functions:<name>` are one route away (`GET /admin/permissions/functions`, `HttpServer.ts:998`) | [BMG-007](BMG-007-API-KEYS.md) |
| 6 | *"Roles 'add member' gives you a bloody dropdown to pick a user"* | `addMember` (`:1639-1657`): a bare `<select>` of the 200 newest users as `username — objectId`. The Members column is raw objectIds joined with `, ` (`:1604`). No *remove member* control, although `DELETE /admin/roles/:name/users/:userId` exists | [BMG-005](BMG-005-ROLES.md) |
| 7 | *"Pretty much every option in the whole thing the user is expected to compose a JSON or something"* | Counted in the working tree: **11** raw-composition prompts a person meets on the normal path (table below). Plus the Sign-in provider's *Scopes (space separated)* (`:2019`), the Workflows run payload *(JSON)* (`:2177`), the Files *Denied content types (comma-separated)* (`:2613`), the record form's JSON textarea for Object/Array/ACL/File/GeoPoint (`:619-640`), and the Redirect allow-list textarea (`:1901`) | every tab task |
| 8 | *"Nothing here looks like a serious BaaS"* | The page is one 2,953-line vanilla document, dark only (`styles.css` `color-scheme: dark`), a copy of the phase-23 palette that has drifted from core-ui's (BAK-005-NOTES §5). No empty-state CTAs except Collections/Schema; no deep links (`#/collections` takes no collection); the executions page is called *Executions*; the nav groups are the backend's subsystems, not a person's jobs | [BMG-001](BMG-001-THE-SHELL.md) |

**The eleven raw-composition prompts, counted** (working tree, normal path = not behind a
disclosure):

| # | page | label / placeholder | line |
|---|---|---|---|
| 1 | Collections | Object/Array/ACL/File/GeoPoint field → JSON textarea | 619 |
| 2 | Collections | *Advanced filter (JSON)* (behind a disclosure; but the only filter) | 721 |
| 3 | Schema | Boolean default: *"true or false"* typed as words | 1290 |
| 4 | Permissions | `find get create update delete` as text, comma = OR | 1720 |
| 5 | API keys | *Scopes (comma separated)* | 1807 |
| 6 | Sign-in | *Redirect allow-list*, one origin per line | 1901 |
| 7 | Sign-in | *Scopes (space separated)* | 2019 |
| 8 | Workflows | *Run payload (JSON)* | 2177 |
| 9 | Files | *Denied content types (comma-separated)* | 2613 |
| 10 | Files | *Cron* | 2629 |
| 11 | Roles | *Add member* → objectId select | 1639 |

**What the page cannot do at all** (routes exist, no UI): create/edit/delete a trigger; rotate a
webhook secret; edit an email template (`PUT /admin/email/templates/:id`); set a backup schedule
(`PUT /admin/backups/config`); edit thumbnail presets; edit ops settings (`PUT /admin/ops`:
logging, rate limit, CORS, audit, executions, metrics); manage secrets (`/admin/secrets`); manage
search (`/admin/search`); remove a role member; set a key's acting user; edit defaults / signup /
files / function rules; set checks (`setChecks`).

**What the backend cannot do** (the tab needs it; each is a sub-step of its tab task, and the
plan says so rather than hiding it): drop a column (`POST /admin/schema` has no `dropColumn`;
`byob-admin.ts:389-481`); list uploaded files (no `GET /admin/files` listing; `files.ts` serves by
name); disable a user (no flag anywhere in `users/`, `server/users.ts`) — **R3**; preview a cron's
next fires (the scheduler computes `nextFireAt` but no route answers for an unsaved string);
search users server-side by name (only `where` on `/api/_User`, which is enough).

## 3. What the loved ones do, and what we take

[RESEARCH-WHAT-THE-LOVED-ONES-DO.md](RESEARCH-WHAT-THE-LOVED-ONES-DO.md) is the full report
(Appwrite, Supabase, PocketBase, Xano, Bubble, Directus, Parse, Firebase, Backendless, Airtable,
Nhost, Convex; cited). The six patterns this phase adopts, and the tab that carries each:

| pattern | who does it best | ours |
|---|---|---|
| **One filter row** — `And/Or · field ▾ · operator ▾ · value` with type-aware operators, nestable groups, **reused** for data, permissions conditions and logs | Airtable, Directus | BMG-002 builds it; BMG-006 and BMG-009 reuse it |
| **Users are a collection** — custom fields use the same field editor and grid; *Add user ▾* with Create / Invite; sessions and reset on the user | PocketBase, Supabase | BMG-004 |
| **Permissions = who × what** — role chips × Create/Read/Update/Delete checkboxes; *Any / Guests / Signed in / a role*; templates before expressions; a *try as this user* playground | Appwrite, Supabase (their own lesson: "templates beat AI"), Firebase playground | BMG-006 |
| **Scope picker** — grouped checkboxes with select-all per group, secret shown once behind a copy button, last used | Appwrite | BMG-007 |
| **Schedule builder** — mode radios (every N minutes / hourly / daily at / weekly on / monthly / custom) + the sentence + next runs; pick the function; Run now; run history with chips | Supabase, Xano, Parse | BMG-008 builds it; BMG-011 reuses it |
| **Field-type picker** with icon and one-line description, per-type drawer whose controls change with the type; relation as a dialog; danger zone with type-the-name | Airtable, Directus, PocketBase, Appwrite | BMG-003 |

And the hygiene every list gets: an empty state with one CTA, a danger zone at the bottom of a
settings page, dark and light, deep links, ⌘K later (README §6).

## 4. Rulings

Plain words, the choices, the cost. Recommendation first.

**R1 — What the page is built from.** ✅ **(a), Richard 2026-09-24 22:05Z** (asked in plain words: size 39 of 48 KB, ten more pages, Preact already in the repo at 10.28.2, esbuild already the package's build).
Today the page is one hand-written vanilla-JS document, by BAK-005's decision (no bundler, no
React, no external origin; the reasons were the *editor's* component coupling, not bundling as
such). Its gate says the page must gzip under 48,000 bytes; it is at **39,067** after BMG-000, and
BMG-000's two pages cost 7,526. This phase adds a filter builder, a schedule builder, a permission
matrix, three pickers, a field-type picker, a template editor and eight reworked tabs.
- **(a) Recommended: rebuild the page as a small typed app** — Preact + TSX, bundled by the
  esbuild the package already runs, served by the same route with the same CSP, still zero external
  origins, still one package, still one `nodegx-backend serve`. Composers become components with
  jest specs; the gates that grade the document (no `innerHTML`, red only for danger, one CSS
  marker) move onto the bundle. Cost: BMG-001 becomes a rebuild of the shell and a port of the
  fourteen views (~1 session for the shell + composers, the views port as their tab task runs);
  the size gate becomes a bundle budget (propose 160 KB gzip).
- **(b) Keep the vanilla document** and split its script into per-view files loaded on demand
  from the same origin, raising the gate per file. Cost: every composer is hand-rolled DOM (the
  filter row alone is ~400 lines that way), and nothing about it is unit-testable without a DOM.
- **(c) Keep the document as is and raise the gate.** No.

**R2 — settled by his words:** the editor's data, schema, permissions, triggers, email and
sign-in panels go; the card keeps *which backend, start, stop, functions* and one button
([BMG-012](BMG-012-THE-EDITOR-LETS-GO.md)). The two other doors into the old panels — *Add a
field* on the property panel and the workflow canvas's *open triggers* — become deep links into
the manager. Recorded here so the question is carried with the answer.

**R3 — Disabling a user.** ✅ **Yes, Richard 2026-09-24 22:05Z** (asked: "should the Users page get a Disable button?"). Every serious BaaS can stop one person signing in
without deleting them (Supabase *Ban for duration*, Firebase *Disable account*, Appwrite
*Block*). Ours cannot: no flag, and the login path never checks one. Adding it is a backend change
(a `disabled` column on `_User` the login and session paths refuse, sessions revoked on the
press). Recommended: **add it in BMG-004.** Alternative: ship BMG-004 without it and file it.

**R4 — Restore from a backup, in the browser.** ✅ **Yes, behind the typed backend name, Richard 2026-09-24 22:05Z.** BAK-005 left the button out on
purpose ("restore is deliberate"). `POST /admin/backups/restore` exists. Recommended: **add it
behind a type-the-backend-name confirm** in BMG-011, because a person who can *Back up now* and
cannot restore is the person who calls you at 2am. Alternative: keep it CLI-only.

**R5 — Expiring API keys.** The loved ones offer an expiry dropdown. Our keys have no expiry
field. Not asked for by Richard; **filed under §6, not built.**

## 5. The tasks

In this order. BMG-001 depends on R1 and everything after depends on BMG-001's composer kit, so
the ruling gates the phase. Richard's five named complaints (rows 1, 2, 5, 6, 4) come first
among the tabs.

| id | task | findings | depends on |
|---|---|---|---|
| **[BMG-000](BMG-000-THE-HAND-OFF.md)** ✅ built s0, committed s2 | The card hands over; Collections and Schema edit visually | — | — |
| **[BMG-001](BMG-001-THE-SHELL.md)** ✅ s2 | The shell: one app, plain words, deep links, light and dark, empty states, and the composer kit (picker, chips, list editor, key/value editor, drawer, danger zone) | 8 | R1 (a) |
| **[BMG-007](BMG-007-API-KEYS.md)** ✅ s3 | API keys: a scope picker, an acting user, the secret behind a copy button | 5 | 001 |
| **[BMG-004](BMG-004-USERS.md)** ✅ s4 | Users are a collection: custom fields, a user drawer, roles as chips, invite, reset, disable | 1 | 001, R3 |
| **[BMG-002](BMG-002-COLLECTIONS.md)** ✅ s5 | Collections: the filter row, sort, columns, saved views, typed editors for every field, the record's *who can see this* | 2 | 001 |
| **[BMG-005](BMG-005-ROLES.md)** ✅ s6 | Roles: a role page with named members, add by search or email, remove, what it unlocks | 6 | 001, 004 |
| **[BMG-006](BMG-006-PERMISSIONS.md)** | Permissions: who × what per collection, defaults, signup, files, functions, templates, *try as* | 4 | 001, 002 (filter row), 005 |
| **[BMG-008](BMG-008-TRIGGERS.md)** | Triggers: authored here — the schedule builder, webhooks with their URL, changes on a collection, a payload as rows | 3 | 001 |
| **[BMG-003](BMG-003-SCHEMA.md)** | Schema: a field-type picker, per-type options, allowed values, drop a field, relation dialog, checks, danger zone | 7 | 001 |
| **[BMG-009](BMG-009-WORKFLOWS-AND-RUNS.md)** | Workflows and Runs: run with a form, filter runs with the filter row | 7 | 001, 002 |
| **[BMG-010](BMG-010-EMAIL-AND-SIGN-IN.md)** | Email and Sign-in: template editor with placeholders and preview, SMTP presets, a provider wizard led by its callback URL, scopes as checkboxes, origins as chips | 7 | 001 |
| **[BMG-011](BMG-011-FILES-BACKUPS-OPS.md)** | Files, Backups, Settings: denied types as categories, the sweep and backup schedules, restore (R4), ops, secrets, search, a file browser | 3, 7 | 001, 008 (schedule builder), R4 |
| **[BMG-012](BMG-012-THE-EDITOR-LETS-GO.md)** | The editor lets go: six panels removed, two doors become deep links | R2 | 001 (deep links), 003, 008 |
| **[BMG-013](BMG-013-RICHARD-DRIVES-IT.md)** | Richard drives every tab as the person in §1 | — | all |

## 6. Candidates, not tasks

Named so a session does not rediscover them. Richard picks.

- Expiring API keys (R5): a field, a check on every key read, a dropdown.
- ⌘K: jump to a collection, a user, a page.
- Saved views shared with the editor's Query Records node (a view is a `where` + sort + columns).
- A Logs tab: the backend logs JSON lines to stdout only (`ops/logger.ts`); a ring buffer and a
  route would give the page Supabase's filter chips + timeline.
- Usage charts on an Overview page from `/metrics` (Prometheus text).
- Webhooks *out* (the backend has webhooks *in* only).
- A visual relation diagram on Schema.

## 7. Gates

- `packages/nodegx-backend`: `npx jest tests/admin-dashboard.test.ts tests/admin-app` (**47/47**
  since BMG-001: the document gates read the shell, the bundle `build/admin/app.js.txt` — budget
  160,000 gzip, at 32,538 — the token sheet, and the app SOURCE for the no-innerHTML rule; the
  composer specs run under a jsdom the spec installs) and the full `npm test` before a commit.
  `npm run typecheck` runs both tsconfigs (service and app). The bundle is a build product:
  `tests/global-setup.js` makes it, and `npm run build` makes it before the service bundle.
- `packages/noodl-editor`: `npm run typecheck` for the card; `npm run test:main` for
  `tests-unit/def-036`, `tut-001`, `def-047` which name the card and the schema panel; the
  webpack `test:ci` for `tests/databrowser/*.spec.ts` (BMG-012 deletes those with their panels).
- Every tab task drives its page in headless Chrome against a throwaway backend on a scratchpad
  data dir (BMG-000's `drives/` shows how: `bk2` + `cdp.mjs`), and reads each save back through
  the API. A shot per AC in `shots/`.

## 8. Rulings log

| id | asked | answer |
|---|---|---|
| R1 | vanilla document vs typed app | **(a) typed app** — Richard, 2026-09-24 22:05Z, asked as "rebuild as a small web app (Preact, already in the repo) vs keep the hand-written page and split it". Built as BMG-001 the same day |
| R2 | does the editor keep its panels | **No** — Richard, 2026-09-24 18:16Z, quoted above |
| R3 | add *disable a user* to the backend | **Yes** — Richard, 2026-09-24 22:05Z |
| R4 | restore from the browser | **Yes, behind typing the backend's name, back-up-first ticked** — Richard, 2026-09-24 22:05Z |
| R5 | expiring keys | filed, §6 |
