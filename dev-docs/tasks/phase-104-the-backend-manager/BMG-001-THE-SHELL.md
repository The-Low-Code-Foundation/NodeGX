# BMG-001 — The shell: one app, plain words, deep links, and the composer kit

**Opened 2026-09-24** (README §2 row 8). **Depends on R1.**
**Status: 📋 not started.**

## 1. The person sentence

> **Someone opens the manager and sees their backend the way they think about it — data, people,
> access, automation, storage, settings — in words they would use, in the theme they use, and
> any page can be sent as a link. Every list that is empty says what to do first.**

## 2. What is wrong, measured

- **The nav is the backend's org chart.** `view()` registrations (`index.html:685-2681`): Data
  (Collections, Schema) · Access (Users, Roles, Permissions, API keys, Sign-in) · Automation
  (Triggers, Workflows, Executions) · Config (Email, Backups, Files) · Ops (Audit). *Sign-in* is
  about people, not access; *Executions* is a word nobody outside this repo uses; *Files* is
  config here and storage everywhere else.
- **No deep links.** The router is `location.hash` with a bare view id (`:2753` `renderNav`);
  *Open records* smuggles the collection through `S.openCollection` (`:1148`). Nothing can link
  to `#/collections/Pet` or `#/users/<id>`, so BMG-012's two doors have nowhere to point.
- **Dark only.** `styles.css:14-54` is a hand copy of the phase-23 palette with
  `color-scheme: dark`; core-ui's canonical palette has light and dark (`colors.css`,
  `:root[data-theme='light']`) and has moved on (CHR-013 neutrals). BAK-005-NOTES §5 already
  lists "the palette copy" as a residual.
- **Empty states:** only Collections (`:740`) and Schema (`:1129`) have one with a CTA. Users,
  Roles, Keys, Triggers, Workflows, Executions, Audit render an empty table.
- **The composers do not exist.** Every tab task in this phase needs the same seven things and
  today each page hand-rolls its own `<select>`: a search-as-you-type picker (users, records,
  functions), chips (roles, origins, types), a list editor (rows with ✕), a key/value editor
  (payloads, prefs), a right-hand drawer (record, user, trigger), a danger zone, and a
  type-the-name confirm (exists: `confirmDestructive`, `:210`).
- **Size:** 39,067 of 48,000 gzip (`admin-dashboard.test.ts:280-292`). BMG-000's two pages cost
  7,526. Ten more pages of composers do not fit in a document (README R1).

## 3. What to build

Under **R1(a)** (recommended). If Richard rules (b), §3.1 changes to "split the script per view"
and §3.2-3.5 stand.

### 3.1 The app
- `packages/nodegx-backend/src/admin/app/` — Preact + TSX, `esbuild` target added to
  `scripts/build.js` producing one `admin.js` (and `admin.css`) that `AdminDashboardRoutes.serve()`
  inlines exactly as it inlines `styles.css` today (same nonce, same CSP, `default-src 'none'`).
  No external origin, no runtime fetch of assets, one document still. Preact because it is 4 KB
  and the page must stay one file a VPS copies.
- Keep the two hard rules the document gates enforce and move the gates onto the bundle: backend
  values reach the DOM as text (Preact escapes; the gate greps the *source* for
  `dangerouslySetInnerHTML`); red only for danger (the gate reads the emitted CSS).
- A bundle budget replaces the document budget: **160 KB gzip**, measured on the built bundle,
  with the same "the reading is real" floor.
- Port BMG-000's Collections and Schema first (they are the freshest), then the other twelve
  views **as-is** behind the new nav, so the app ships whole before any tab task starts. The port
  is mechanical: `el()` trees become JSX; `api()`, `toast`, `modal`, `confirmDestructive`,
  `table`, `chip`, `disclosure`, `jsonTree` become components/hooks with the same names.
- Tests: jest with `preact/test-utils` + jsdom for the composers (§3.5), the existing HTTP tests
  unchanged.

### 3.2 The nav, in a person's words
| group | pages | today's name |
|---|---|---|
| **Data** | Collections · Schema | same |
| **People** | Users · Roles · Sign-in | Users, Roles were "Access"; Sign-in was "Access" |
| **Access** | Permissions · API keys | same |
| **Automation** | Triggers · Workflows · Runs | *Executions* → **Runs** |
| **Storage** | Files | was "Config" |
| **Settings** | Email · Backups · Secrets · Search · Server | Email, Backups; Secrets/Search/Server are new (BMG-011) |
| **Activity** | Audit | was "Ops" |

Every page subtitle is rewritten in words a person uses; the `_User`, `find`/`get`, `CLP`,
`BAK-003`, `WF-005` vocabulary leaves the page (a glossary in the task's §6 records each rename so
the MCP and docs can follow: *find* → "list", *get* → "open one", *create/update/delete* stay).

### 3.3 Deep links
`#/collections/:name`, `#/collections/:name/:id` (opens the drawer), `#/schema/:name`,
`#/users/:id`, `#/roles/:name`, `#/triggers/:id`, `#/runs/:id`. The route is the state; the
page reads it on load and on `hashchange`; nothing is smuggled through `S`. The editor's IPC
`backend:open-dashboard` takes an optional `hash` (BMG-012 uses it).

### 3.4 Theme
Tokens from core-ui's `colors.css` (the CHR-013 set) copied by a build step, not by hand, so the
copy cannot drift again: `scripts/build.js` reads `packages/noodl-core-ui/src/styles/custom-properties/colors.css`
and `spacing.css` and emits them into `admin.css`. `prefers-color-scheme` picks; a toggle in the
top bar remembers in `localStorage`. Red stays danger-only.

### 3.5 The composer kit (`src/admin/app/composers/`)
Each is a component with a spec, built here and reused by every tab task:
1. **`Picker`** — search-as-you-type over a fetcher; renders a label (username/email, record
   summary, function name), never an id; keyboard up/down/Enter; "no match" state; optional
   *create new…* row. Fetchers: users (`/api/_User?where={"$or":[{username:{contains}},{email:{contains}}]}&limit=20`),
   records of a collection (summary = first String field, as `recordSummary` does today),
   functions (`GET /admin/permissions/functions`), roles (`GET /admin/roles`).
2. **`Chips`** — a set with ✕ per chip and an add control that is a `Picker` or free text with
   validation (origins, MIME types).
3. **`ListEditor`** — rows with ✕ and *+ Add*, each row a slot.
4. **`KeyValueEditor`** — key, typed value (text / number / yes-no / date / JSON-as-last-resort),
   ✕; emits an object. Replaces every payload textarea.
5. **`Drawer`** — right-hand panel with title, body, footer, Esc closes, focus trapped, URL-bound.
6. **`DangerZone`** — a red-bordered card at the bottom of a settings page; each action uses
   `confirmDestructive` (type the name).
7. **`EmptyState`** — icon, one sentence, one primary CTA, optional docs link.
8. **`ScheduleBuilder`** and **`FilterRow`** are built by BMG-008 and BMG-002 respectively and
   land in this folder.

## 4. Acceptance criteria

1. The built page still serves as one document from `/_admin` with `default-src 'none'`; the
   CSP test, the nonce test and the `--no-admin` test pass unchanged.
2. Every one of the fourteen views renders the same data as before the port (a drive that visits
   each route on a seeded throwaway backend and diffs the visible text per page against a
   pre-port capture; differences only where §3.2 renamed something).
3. `#/collections/Pet/<id>` opens the record drawer on load; `#/schema/_User` scrolls to the
   accounts card; the back button walks the hashes.
4. Light and dark both render every page with no hard-coded colour outside the token file
   (a grep of the emitted CSS for `#[0-9a-f]{3,6}` outside `:root` blocks returns 0).
5. Every list page shows an `EmptyState` with a CTA on an empty backend (drive: fresh data dir,
   visit each route, assert the CTA text).
6. The seven composers have specs: `Picker` (search, keyboard, no-match, never shows an id),
   `Chips`, `ListEditor`, `KeyValueEditor` (round-trips an object with each value type),
   `Drawer` (Esc, focus), `DangerZone` (refuses without the typed name), `EmptyState`.
7. Bundle gzip under the budget; the reading is asserted real (raw size above a floor).
8. The nav renames are in the glossary (§6) and `docs/runtime/BACKEND-ADMIN-DASHBOARD.md` uses
   the new names.

## 5. Watch for

- `admin-dashboard.test.ts` greps `index.html` for `innerHTML` and counts substitution markers
  (`:218-260`). Moving the script out of the document changes what those tests read; rewrite
  them to read the bundle and the shell, do not delete them.
- `feed-drive.test.ts` lifts `recordSummary` out of the page by regex (agent map §6). Export it
  from a module instead and point the test at it.
- The MCP's `toolSurface.ts:372` and `HttpServer.ts:1897` tell agents to make keys "with scopes
  like…"; they are unaffected by the rename but BMG-007 rewrites the message.
- Under jsdom, Preact's `datetime-local` and `<select>` behave; `elementFromPoint` does not —
  drive visibility in Chrome, not jest (memory: RENDERED≠REACHABLE).
