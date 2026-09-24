> Research report, 2026-09-24, by a web-research agent for P104. Vendor claims are cited; two sources were unreachable (noted at the top). It is a reference, not a task.

# How the best BaaS admin dashboards let non-technical people run a backend

Research date: 2026-09-24. Scope: Appwrite Console, Supabase Studio, PocketBase Admin UI, Xano, Bubble (Data / Privacy / Backend workflows), Directus Data Studio, Parse Dashboard, Firebase Console, Backendless, Airtable (grid/filter gold standard), Nhost and Convex where they add something. Each section: what the user actually sees and clicks, then a "common pattern / best-of-breed" line. Sources are cited inline; where a vendor doc describes the API rather than the console, the console behaviour is taken from the vendor's own tutorial/blog posts or the console repo.

---

## 1. Collections / tables and schema

| Product | What the user sees |
|---|---|
| **Appwrite** | Databases → *Create database* → *Create collection* (name + optional custom ID). Empty collection shows an empty-state card with an **Add attribute** button. Clicking it opens a type list: string, integer, float, boolean, datetime, enum, IP, email, URL, relationship (docs: https://appwrite.io/docs/products/databases/tablesdb/legacy/collections). Each type opens a side-drawer form: key, **Size** (strings), **Min/Max** (numbers), **Elements** list for enum (each ≤255 chars, ≤100 elements), **Required** toggle, **Default** value (disabled when Required is on), **Array** toggle (greys out Required — community thread: https://appwrite.io/threads/1090006380301275187). Relationship drawer: related collection picker, one-way / two-way, type (1:1, 1:N, N:1, N:N), on-delete (restrict / cascade / set null). Tabs on the collection: Documents · Attributes · Indexes · Activity · Usage · Settings. **Indexes** tab: key / unique / fulltext, pick attributes + asc/desc. Delete lives in Settings → "danger zone" at the bottom (thread: https://appwrite.io/threads/1326551824752316437). |
| **Supabase Studio** | Table Editor → **New table** side panel: Name, Description, **Enable Row Level Security (RLS)** checkbox (on by default; docs note "The Table Editor enables row level security for you when you create a table in the Dashboard": https://supabase.com/docs/guides/database/tables), Enable Realtime. A **Columns** list pre-seeded with `id` (int8, identity, PK) and `created_at` (timestamptz, `now()`); **Add column** rows: name, type dropdown (searchable Postgres types), default value, and a gear icon opening per-column flags: Is Nullable, Is Unique, Is Identity, Define as Array, plus a **Foreign key** link that opens a relation dialog (target schema/table/column, on-update/on-delete actions). Column type cannot be silently changed to an incompatible type — the panel shows a warning. |
| **PocketBase** | Left sidebar of collections + **New collection**. Panel with type tabs **Base / Auth / View** (https://pocketbase.io/docs/collections/). A field row with a **New field** type picker (icons for text, editor, number, bool, email, url, date, autodate, select, file, relation, json, geopoint). Each field has a gear/expand that reveals per-type options: text (min/max length, regex pattern, autogenerate pattern), number (min/max, only-int), select (values list + max select), file (max select, max size, MIME types, thumb sizes, protected), relation (collection picker, max select, cascade delete), date (min/max). Extra tabs: **Indexes** (unique toggle, columns) and **API Rules**. View collections take a raw SQL SELECT. Renaming a field is a rename in place (the UI diff-checks on save); deleting the collection is a red button behind a confirm dialog. Everything is also import/exportable as a JSON schema with a diff preview (DeepWiki: https://deepwiki.com/pocketbase/pocketbase/5-admin-ui). |
| **Xano** | Database → **Add Table**. Column "+" opens a type list with icons: Text, Integer, Decimal, Boolean, Date, Timestamp, Enum, Email, Password, UUID, Object, JSON, Storage (image/file/attachment), Table Reference, Geography, Vector (https://docs.xano.com/the-database/database-basics/field-types). Per-field: required, unique, default, nullable, enum values list, table-reference target. Tables can be flagged as an Auth table. |
| **Directus** | Settings → Data Model → collection → **Create Field**. First step is an **interface picker** — a tile grid (Input, Textarea, WYSIWYG, Dropdown, Toggle, Datetime, File, Image, Map, M2O, O2M, M2M, Translations, etc.). Then a tabbed drawer: **Schema** (key, type, length, default, nullable, unique, indexed), **Field** (required, read-only, note, translations), **Interface** options, **Display** (conditional colours/icons), **Validation** (rule builder + custom error message), **Conditions** (show/hide/require based on other fields), **Relationship** for relational types (https://directus.com/docs/guides/data-model/fields). Key and type are locked after creation. |
| **Firebase (Firestore)** | No schema. Three-column browser (collections → documents → fields). **Start collection** / **Add document** inline form: Document ID with an **Auto-ID** button, then rows of field name + type dropdown (string, number, boolean, map, array, null, timestamp, geopoint, reference) + value (https://firebase.google.com/docs/firestore/using-console). |
| **Backendless** | Data → table → **Table Schema and Permissions** button top-right → Schema tab is a grid of columns; "Visual Data Modeler" lets you "visually map data relations" (https://backendless.com/features/backendless-core/backendless-database/). Column dialog: name, type (STRING, TEXT, INT, DOUBLE, BOOLEAN, DATETIME, FILE REF, DATA OBJECT RELATIONSHIP, GEOMETRY, JSON), required, unique, indexed, default. |
| **Airtable** | "+" at the right of the header row opens a searchable dropdown of ~36 types, each with an icon and one-line description (Single line text, Long text, Attachment, Checkbox, Multiple select, Single select, User, Date, Phone, Email, URL, Number, Currency, Percent, Duration, Rating, Formula, Rollup, Count, Lookup, Created time, Last modified by, Autonumber, Barcode, Button, Linked record) (https://support.airtable.com/docs/supported-field-types-in-airtable-overview). Choosing Single select shows an inline options list with colour swatches; Number shows format + precision; Date shows "Include a time field"; Linked record shows the target table, "Allow linking to multiple records", "Limit record selection to a view". |
| **Parse Dashboard** | Data browser → **Add a new column** dialog: type dropdown (String, Number, Boolean, Date, File, GeoPoint, Polygon, Array, Object, Pointer → target class, Relation → target class), name, default value, required. Class deletion asks you to confirm by typing the class name (README: https://github.com/parse-community/parse-dashboard). |
| **Convex** | Schema is code; dashboard shows read-only **Schema** and **Indexes** (with backfill progress) from the table's overflow menu (https://docs.convex.dev/dashboard/deployments/data). |

**Common pattern / best-of-breed:** a *searchable type picker with an icon and one-line description per type* (Airtable, Directus, PocketBase), then a *per-type drawer* whose fields change with the type (Required toggle disables Default; Array disables Required — Appwrite), relationship set up as a *dialog that picks the target collection and the on-delete behaviour* (Appwrite/Supabase), and delete kept in a *Settings → danger zone* behind a typed confirmation (Appwrite, Parse).

---

## 2. Records / data browser

| Product | What the user sees |
|---|---|
| **Airtable (gold standard)** | Spreadsheet grid with per-type cell editors (colour pills for selects, calendar for dates, chips for linked records). View bar: **Filter** → **Add condition** / **Add condition group**; each row is `[And/Or] [field ▾] [operator ▾] [value]`; operators depend on the field type — text: contains / does not contain / is / is not / is empty / is not empty; number: = ≠ < > ≤ ≥; date: is / is within (past week, past month…) / is before / is after; linked record: Is exactly / Has any of / Has all of / Has none of; checkbox: is checked (https://support.airtable.com/docs/filtering-records-using-conditions). Groups nest with their own And/Or. Sort, Group, Hide fields, row height, colour rules are sibling buttons. Expand-record form is generated from the schema. |
| **Supabase Studio** | Grid with sticky header, type icons per column, **Filter** (field / operator / value rows, AND only), **Sort** (multi-column), column chooser, page size selector + pagination, row checkboxes → **Delete N rows**, **Insert** menu → *Insert row* (side panel form generated from column types, with a foreign-key cell that opens a lookup picker into the referenced table), *Insert column*, *Import data from CSV* (auto-detects column types, 100 MB limit: https://supabase.com/docs/guides/database/import-data). JSON cells open a JSON editor; FK cells show a "view referenced row" link. |
| **PocketBase** | Records table with a search bar that accepts either plain text (the UI expands it to `id ~ "x" || name ~ "x"…`) or a full filter expression; "You can test filters directly in the Admin UI searchbar" (https://github.com/pocketbase/pocketbase/discussions/4882; https://pocketbase.io/docs/api-rules-and-filters/). Shift-click range select → bulk delete. **+ New record** opens a right-hand drawer with inputs per field type (file dropzone, relation picker with search modal, select chips, editor). An **API preview** button shows the equivalent curl / JS / Dart snippet. |
| **Bubble (App data)** | Data → App data: grid per data type; **New entry** opens a form generated from fields; search bar plus **Add a new constraint** rows (field / operator / value); **Primary fields** chooser; **Show all fields**; row checkboxes → **Delete**; **Export** to CSV, **Upload** CSV, **Modify** (bulk update via CSV) (https://manual.bubble.io/core-resources/bubbles-interface/data-tab). |
| **Directus** | Collection page: ⌘K search, **Filter** button → rule builder with field picker, operator dropdown (equals, doesn't equal, contains, starts with, is one of, is empty, is between…), AND/OR groups, dynamic variables `$NOW`, `$CURRENT_USER`; **Sort**; **Layouts** (Table, Cards, Calendar, Map, Kanban); select items → batch edit / archive / delete; **Export** CSV/JSON/XML and **Import**; **Bookmarks** save a filter+layout as a named view (https://directus.com/docs/guides/content/explore; https://directus.com/docs/guides/content/layouts). |
| **Xano** | Spreadsheet-like grid, inline edit, search/filter/sort controls in a toolbar, CSV import, **Add record** form (https://docs.xano.com/the-database/database-basics/field-types). |
| **Firebase** | Column browser only (no table view). A **Filter list** button lets you add a single-collection filter (field, operator, value) and sort; "no query history… rebuild filters from scratch every time" and "no table view to compare fields across records" are the usual complaints (https://medium.com/@fahadirshadd/a-better-way-to-work-with-firestore-that-isnt-the-firebase-console-appobase-a3831e30f871). |
| **Backendless** | **Data Browser** grid ("You don't need to be a database administrator to understand and work with your data"), inline edit, a SQL-ish **where clause** search box (`name LIKE '%Smith%'`), a **Relations** column with a picker, a **REST Console** tab to try the request, CSV import/export (https://backendless.com/features/backendless-core/backendless-database/). |
| **Convex** | Grid with drag-to-reorder columns; filter panel with field / op / value rows (AND), a date-picker for `_creationTime`; double-click to edit a cell; right-click context menu (copy, filter by this value, delete); checkbox multi-select → **(Bulk) Edit Document(s)**; **Add Documents** side panel takes JS object literals; overflow menu → **Clear Table** (https://docs.convex.dev/dashboard/deployments/data). |
| **Parse Dashboard** | Classic grid; **Filter** button adds `[column ▾] [operator ▾] [value]` rows; row checkboxes; **Add row** inline; Pointer cells are clickable links; CSV export per class. |

**Common pattern / best-of-breed:** Airtable's *filter row* (`And/Or · field · operator · value`) with a *type-aware operator list* and *nestable condition groups* is the standard everyone copies (Directus, Supabase, Convex); add-record as a *right-hand drawer generated from the schema* with *relation picker modals* (PocketBase, Supabase); *saved views/bookmarks* (Directus, Airtable) so a non-developer never rebuilds a filter.

---

## 3. Users / auth

| Product | What the user sees |
|---|---|
| **Appwrite** | Auth → Users list: avatar, name, identifiers (email/phone), status (verified / blocked), labels, joined date. **Create user** drawer: name, email, phone, password, custom ID. User page tabs: Overview (block/unblock toggle, verification toggles), **Sessions** (device/OS/IP list with "delete session"), **Activity** (audit log), **Memberships**, and a **Labels** section where you type labels as chips (blog: https://appwrite.io/blog/post/manage-user-permissions-with-labels-and-teams). **Prefs** are a key/value editor. Auth → Settings: per-method toggles (email/password, phone, magic URL, OTP, anonymous, JWT), session length, max sessions, password history/dictionary, personal-data check; OAuth providers list with a per-provider modal (App ID / secret, callback URL shown to copy). |
| **Supabase Studio** | Authentication → Users: columns UID, display name, email, phone, provider(s), created at, last sign-in. **Add user ▾** → *Create new user* (email, password, auto-confirm) / *Send invitation* / *Send magic link* (https://supabase.com/docs/guides/auth/users). Click a row → detail panel: **Ban user** with a duration (blocks sign-in only, does not revoke sessions), **Send password recovery**, **Delete user**, and the `raw_user_meta_data` / `app_metadata` JSON shown read-only (custom fields live in a `profiles` table you create yourself: https://supabase.com/docs/guides/auth/managing-user-data). Providers page: list of ~20 OAuth providers each with an **Enabled** toggle and client ID/secret inputs. |
| **PocketBase** | Users are just an **Auth collection**, so custom fields are ordinary fields added in the schema editor; the records grid shows email, verified, created. Per-collection **Options** tab: allowed auth methods (password with identity fields, OAuth2 with provider cards, OTP, MFA), token durations. Record panel has *Send verification email*, *Send password reset*, *Change password*. Superusers are a separate `_superusers` collection. |
| **Firebase** | Authentication → **Users** tab: Identifier · Providers (icons) · Created · Signed in · User UID; search by email/phone/UID; **Add user** (email, password); row ⋮ → Reset password / Disable account / Delete account. **Sign-in method** tab: provider list with enable toggles; **Templates** tab for email templates; **Settings** tab (https://firebase.google.com/docs/auth/users). No custom user fields in the console. |
| **Bubble** | User is a data type on the Data tab; custom fields are added like any other field; App data grid shows users; **Run as** a user is available from the row for testing. |
| **Backendless** | Users is a table opened by default under Data; checkboxes on rows → **User Roles** toolbar button → **User Role Management** popup with tri-state checkboxes per role (https://backendless.com/how-to-assign-roles-to-users-using-management-console/). |

**Common pattern / best-of-breed:** *users-as-a-collection* (PocketBase, Bubble, Backendless) is the friendliest way to give non-technical people custom user fields, because the same field editor and grid apply; the *Add user ▾* split button with *Create / Invite by email / Magic link* (Supabase) and a *Ban for duration* control beat a bare "disabled" checkbox; a per-user *Sessions* tab with revoke (Appwrite) is table stakes.

---

## 4. Roles / teams / membership

| Product | What the user sees |
|---|---|
| **Appwrite** | Auth → Teams → **Create team** (name). Team → Members → **Create membership** drawer: email (name optional), **Roles** typed as chips, invite email sent (https://appwrite.io/blog/post/manage-user-permissions-with-labels-and-teams). Labels on a user are the lighter "role" alternative. There is no CRUD matrix per role; roles are consumed by the permissions editor (section 5). |
| **Backendless** | Users & Security → Security Roles list; per-table **Roles Permissions** grid of roles vs Find / Create / Update / Delete / Describe with clickable cell icons (https://backendless.com/how-to-secure-access-to-a-data-table-for-a-security-role/). |
| **Nhost / Hasura** | Database → table ⋮ → **Edit Permissions**: grid of roles vs insert/select/update/delete, cell icons for full / partial / none; a role row expands into row-permission builder and column checkboxes (https://docs.nhost.io/products/graphql/permissions). Zero-trust: "by default, no role, with the exception of admin, has any access". |
| **Parse Dashboard** | Roles are a class; Role editor lets you search users/roles and add them to the `users` / `roles` relations; CLP dialog is a matrix (section 5). |
| **Directus** | Settings → Access Control → policies/roles → per-collection row with five icons (create/read/update/delete/share) that toggle All / None / Custom (custom opens a filter builder + field checkboxes). Users get a role from a dropdown on their profile. |
| **Supabase / Firebase / PocketBase** | No first-class role matrix; roles are expressed in policies/rules (section 5). |

**Common pattern / best-of-breed:** an *invite-by-email drawer with role chips* (Appwrite) for membership, and a *collection × CRUD matrix with tri-state cells* (Backendless, Nhost, Directus) for what a role may do. Directus's "click the icon to cycle All / None / Custom, and Custom opens a filter builder" is the best bridge from checkbox simplicity to real conditions.

---

## 5. Permissions / rules editors

| Product | What the user sees |
|---|---|
| **Appwrite** | Collection → Settings → **Permissions** card. **+ Add role** dropdown: *Any*, *All guests*, *All users*, *Select users* (search-as-you-type user picker), *Select teams* (team picker; "Custom permissions" adds a role within the team), *Label*, *Custom permission* (raw `team:x/y` string). Each chosen role becomes a row with **Create · Read · Update · Delete** checkboxes (https://appwrite.io/blog/post/manage-user-permissions-with-labels-and-teams). A **Document security** (now "Row security") toggle enables per-document permissions on top (https://appwrite.io/docs/advanced/security/permissions). No expressions anywhere — the compromise is that per-record rules must be set per record. |
| **PocketBase** | Collection → **API Rules** tab: five rows — List/Search, View, Create, Update, Delete (+ Manage for auth). Each row is a text field with a **lock icon**: locked = superusers only; click **Set custom rule** and leave it empty = everyone; or type an expression with **autocomplete** for schema fields (incl. nested `rel.field`), `@request.auth.*`, `@request.body.*`, `@collection.*`, `@request.context` (https://pocketbase.io/docs/api-rules-and-filters/). Examples: `@request.auth.id != ""`, `@request.body.role:changed = false`. Rules double as list filters. Compact and honest, but it is still expression typing. |
| **Supabase Studio** | Authentication → **Policies**: per table an **Enable RLS** button and **Create policy**. v2 editor: **templates** first — "Enable read access for all users", "Enable insert for authenticated users only", "Enable insert for users based on user_id", "Enable update for users based on email", "Policy with table joins", "Policy with security definer functions"… — each fills a form (Policy name, Table, Policy behaviour permissive/restrictive, Policy command SELECT/INSERT/UPDATE/DELETE/ALL, Target roles, and the USING / WITH CHECK SQL) with a live SQL preview. **Edit with Assistant** in the list opens the cmd+i Assistant panel with schema context (https://supabase.com/blog/supabase-ai-assistant-v2). Team's own admission: "the AI responses were hit and miss (turns out, LLMs are great with general SQL, but pretty weak with RLS policies)", hence templates back at the centre (https://github.com/orgs/supabase/discussions/21882). **User impersonation** dropdown (postgres / anon / authenticated / a specific user) shows the grid exactly as that user would see it (https://supabase.com/blog/studio-introducing-assistant). |
| **Bubble** | Data → **Privacy**: left list of data types; per type a rules list with an **Everyone else** catch-all at the bottom. **New rule** → name + **When** condition built with the same dropdown expression composer as the rest of Bubble ("Current User's Admin is yes", "This Post's Creator is Current User"). Then a checkbox grid: **Find this in searches**, **View all fields** (or per-field View / Constraint / Auto-bind columns with master checkboxes in the header), **View attached files**, **Allow auto-binding**, **Create via API / Modify via API / Delete via API** (https://manual.bubble.io/core-resources/data/privacy; https://manual.bubble.io/help-guides/data/the-database/protecting-data-with-privacy-rules). Fields that cannot be auto-bound show a dash. |
| **Firebase** | Rules tab is a code editor (rules language) with **Publish**. The **Rules Playground** side panel: Simulation type (get/create/update/delete), Location path, **Authenticated** toggle, Provider dropdown, UID, request payload JSON, **Run** → banner "Simulated read allowed/denied" and the matching rule line highlighted (https://firebase.google.com/docs/rules/simulator). |
| **Parse Dashboard** | Class **Security** button → CLP dialog: rows Public / a searched role or user (search-as-you-type), columns Get · Find · Count · Create · Update · Delete · Add field, plus "Requires authentication" and "Pointer permissions" (pick a field) tabs. |
| **Nhost / Hasura** | Per role × operation: **Row select permissions** — "Without any checks" or "With custom check" built as `[column ▾] [_eq ▾] [X-Hasura-User-Id ▾]` rows with AND/OR; **Column select permissions** — checkbox per column with "Toggle all"; aggregation toggle (https://docs.nhost.io/products/graphql/permissions). |
| **Directus** | Access control per collection: icons for create/read/update/delete/share, each All / None / **Custom** → filter builder (same widget as content filter, with `$CURRENT_USER`, `$CURRENT_ROLE`), field checkboxes, validation and presets. |

**Common pattern / best-of-breed:** the two designs that keep non-developers out of expression syntax are (a) **role chips × CRUD checkboxes** (Appwrite) for "who" and (b) **a condition built from the same visual filter widget the data browser already uses** for "which rows" (Directus, Nhost, Bubble). Supabase's lesson: *templates beat AI*; PocketBase's lesson: *autocomplete + inline examples* make expressions survivable; Firebase's lesson: a **playground / impersonation** control is what lets a non-expert *verify* a rule.

---

## 6. API keys

| Product | What the user sees |
|---|---|
| **Appwrite** | Project → Overview/Settings → **API keys** → **Create API key**: Name, **Expiration date** dropdown (Never / 7 days / 30 days / 90 days / 1 year / custom date), then **Scopes** as a grouped checkbox list matching the console's services — Auth, Databases, Functions, Storage, Messaging, Sites, Other — with a *Select all* per group and a description per scope (https://appwrite.io/docs/partners/project/api-keys). The key page shows the secret once behind a copy button, plus "Last accessed" and expiry, and an Update scopes form. |
| **Supabase** | Settings → **API Keys**: publishable key and secret keys with Reveal / Copy; new keys get a name and are shown once. No scope picker (RLS is the scope). |
| **PocketBase** | No API keys; superuser impersonation tokens are minted from a superuser's record page with a duration field. |
| **Firebase** | Service-account JSON download from Project settings; web API key shown in the app card. |
| **Xano** | Per-API-group "Require authentication" toggle and per-workspace access tokens. |
| **Directus** | A static token field on a user profile plus a role → what the token can do is the user's role. |

**Common pattern / best-of-breed:** Appwrite's *grouped scope checkboxes with select-all per group + expiry dropdown + shown-once secret + last-used timestamp* is the one to copy.

---

## 7. Scheduled / cron jobs

| Product | What the user sees |
|---|---|
| **Supabase** | Integrations → **Cron** → **Create a new cron job**: Name, **Schedule** input that accepts cron syntax *or* natural language ("every Monday at 9am"), with quick presets (every minute / hourly / daily) and a human-readable preview, **Type** selector — SQL Snippet / Database function / HTTP Request / Supabase Edge Function (the latter two show URL, method, headers, body, timeout fields). Each job row has Enabled toggle, **Previous runs** with status / start / duration, and a link to the Logs Explorer (https://supabase.com/blog/supabase-cron; https://supabase.com/docs/guides/cron). Sub-minute schedules are allowed. |
| **Xano** | Tasks → **Add Background Task**: name, description, data source, then a **Schedule** panel: Start date/time, *Run once* or *Repeat* with a frequency dropdown (every minute / hour / day / week …), optional End date, an **Active** toggle, Save then **Publish** (https://docs.xano.com/building/logic/background-tasks). The task body is the same visual function stack as an API endpoint; Request History lists past runs. |
| **Appwrite** | Function → Settings → **Schedule**: a plain cron expression field (with the CRON format hint) (https://appwrite.io/docs/products/functions/functions). Executions tab shows scheduled runs. |
| **Bubble** | Backend workflows → **Recurring event**: name, type of thing, and a frequency dropdown (None / Daily / Weekly / Monthly / Quarterly / Yearly, plan-gated), armed by a **Set/cancel a recurring event** action with a start date (https://manual.bubble.io/core-resources/events/recurring-event). One-off scheduling is the **Schedule API Workflow** action with a date-time expression; Logs → **Scheduler** lists upcoming runs (https://manual.bubble.io/help-guides/maintaining-an-application/scheduler). Minute-level recurrence needs a self-rescheduling workflow. |
| **Parse Dashboard** | Jobs → **Schedule a job**: pick a Cloud job from a dropdown, description, start date/time, **Repeat** checkbox with "every N minutes" and an optional end time; **Run now** button; Job Status tab lists runs with succeeded/failed (https://github.com/parse-community/parse-dashboard). |
| **Firebase** | Scheduled functions are code (`onSchedule`) → visible in Cloud Scheduler with Run now and a run history. |
| **Directus** | Flows → trigger **Schedule (CRON)** with a cron string; flow log per run. |

**Common pattern / best-of-breed:** *a schedule builder with radio modes* (every N minutes / hourly at / daily at time / weekly on days / monthly / custom cron) *plus a human-readable sentence and "next runs" preview* (Supabase natural-language + preview, Xano's start/repeat/end panel), *pick a function from a dropdown*, an *Enabled toggle*, *Run now* (Parse), and a *run history with status chips* (Supabase, Xano, Parse).

---

## 8. Functions / cloud code

| Product | What the user sees |
|---|---|
| **Appwrite** | Functions → **Create function**: template gallery (starter, Stripe, OpenAI…) → runtime picker → connect Git or manual upload. Function tabs: **Deployments** (build status, logs, activate), **Executions** (table: status chip, trigger http/event/schedule, duration, request/response viewer), **Settings** (name, runtime, timeout, **Variables** key/value list with "secret" masking, **Execute access** role chips, **Events** picker, **Schedule** cron, **Scopes** checkboxes for the function's dynamic key, build settings), **Domains** (https://appwrite.io/docs/products/functions/functions). |
| **Supabase** | Edge Functions → **Deploy a new function** → *Via Editor* → template list (Hello World, Stripe webhook, OpenAI, upload to Storage, send email) → in-browser editor with type-checking and an inline AI assistant → **Deploy function**. Function page tabs: Overview, Invocations (table with status/time), Logs, Code, Details; **Test** button with payload/headers; **Secrets** page with Key / Value / Save (https://supabase.com/docs/guides/functions/quickstart-dashboard). Dashboard-deployed functions have no version control (doc warning). |
| **PocketBase** | No UI editor; JS hooks are files in `pb_hooks/` picked up on save. |
| **Xano** | Visual **function stack** editor — no code: drag steps (Query all records, Add record, Conditional, Loop, external API request) with typed inputs; **Run & Debug** panel; Request history. |
| **Firebase** | Functions tab lists deployed functions with trigger, region, health chart and a Logs link; editing is CLI-only. |
| **Parse Dashboard** | Cloud Code is deployed from disk; dashboard shows Jobs and Logs; **Config** page is a key/value/type editor with a "master key only" checkbox per parameter. |
| **Directus** | **Flows** — a visual node canvas (trigger → operations: condition, run script, send email, webhook) with a log per run. |
| **Bubble** | Backend workflows: event blocks (API workflow / database trigger / recurring event) with actions chosen from a categorised menu and every input a dropdown expression. |

**Common pattern / best-of-breed:** *template gallery → in-browser editor → Deploy* (Supabase), *Variables/Secrets as a key/value list with masking* (Appwrite, Supabase), *Executions table with status chips and a request/response drawer* (Appwrite), *Test/invoke panel* (Supabase), and for non-coders a *visual step stack* (Xano, Directus Flows, Bubble).

---

## 9. Storage / files

| Product | What the user sees |
|---|---|
| **Appwrite** | Storage → **Create bucket** (name, ID). Bucket → Files grid (thumbnail, name, type, size, created; upload dropzone) and **Settings**: Permissions (same role chips × CRUD widget), **File security** toggle, **Maximum file size** number + unit, **Allowed file extensions** entered as chips (leave empty = all), **Compression** dropdown (none/gzip/zstd), **Encryption** and **Antivirus** toggles (https://appwrite.io/docs/products/storage/buckets). |
| **Supabase** | Storage → **New bucket** modal: Name, **Public bucket** toggle (with a warning text), *Additional configuration*: **Restrict file upload size** (number + unit), **Allowed MIME types** (comma list). Bucket page: folder tree, file grid/list with image preview, **Upload files**, **Create folder**, right-click → download / get URL / move / delete; **Policies** tab reuses RLS templates for `storage.objects`. |
| **PocketBase** | Files are a **file** field on a record: per-field options are max select, max size, MIME types (multi-select with common groups), thumbs sizes list, **Protected** toggle. Record drawer shows thumbnails with a remove ✕. |
| **Firebase** | Storage → Files browser (folders, upload, delete), Rules tab (code), Usage tab. |
| **Directus** | **File Library** module: cards/table of assets with folders, drag-drop upload, metadata drawer (title, description, tags, focal point); storage adapters in config. |
| **Xano** | Files library with upload, and Storage fields that hold file metadata. |

**Common pattern / best-of-breed:** a *bucket form with public toggle + max size + allowed types* (Supabase, Appwrite) where allowed extensions/MIME types are *chips*, a *file grid with thumbnails and a right-click/⋯ menu*, and permissions reusing the same widget as collections.

---

## 10. Logs / usage

| Product | What the user sees |
|---|---|
| **Supabase** | Logs & Analytics → per-service pages (API Gateway, Postgres, Auth, Storage, Edge Functions, Realtime, Pooler). Filter chips/dropdowns: **Level** (success/warning/error), **Status** code, **Method**, **Pathname**, **Event message** text, **User**; time-range picker in the sidebar or brush-select on a timeline that colours events by level; row click → side panel with **Overview** and **Raw JSON**, dockable bottom/right; **Live** mode; download CSV/JSON (100–1000 rows); a Logs Explorer with saved SQL queries (https://supabase.com/docs/guides/telemetry/logs). **Reports** page: API requests, DB size, auth sign-ins, storage egress charts. |
| **Appwrite** | Project **Overview**: usage bar charts (requests, bandwidth, users, executions) with 24h/30d/90d range; per-resource **Usage** tabs; user **Activity** tab; function **Executions** with status filter. |
| **PocketBase** | **Logs** page: request table (status, method, URL, referer, user IP, execution time) with a filter bar using the same filter syntax, a chart over time (uPlot), row click → JSON detail; request-log retention settings (https://deepwiki.com/pocketbase/pocketbase/5-admin-ui). |
| **Bubble** | Logs tab: **Server logs** with date range, "Show advanced" filters (workflow, user, ...), the **Scheduler** list of upcoming jobs, and **Capacity/Workload** charts. |
| **Xano** | Per-endpoint **Request History** table (status, duration, timestamp) with a click-through to the input/output of that run; workspace-level Request History with filters. |
| **Firebase** | Per-product usage tabs (reads/writes/deletes charts for Firestore), Functions logs link out to Cloud Logging. |
| **Parse Dashboard** | Logs page: Info / Error tabs, plain text. |

**Common pattern / best-of-breed:** Supabase's *filter chips + timeline brush + row detail drawer with Overview/Raw JSON + Live toggle* is the standard; error rows tinted red; usage as *bar charts with a period selector*.

---

## 11. Settings

| Product | What the user sees |
|---|---|
| **Appwrite** | Project Settings: name, team, services toggles (turn off whole APIs), **Platforms** (add web/iOS/Android/Flutter with hostname), **Custom domains** (add domain → CNAME instructions → verify button → cert status), **SMTP** form (host, port, user, pass, sender name/email, secure) with **Email templates** per type/locale (subject, body editor, reset to default), **Webhooks** → **Create webhook**: Name, POST URL, **Add an event** picker (service → resource → action tree with checkboxes, with the resolved event string shown), **Enable Certificate verification (SSL/TLS)** toggle, HTTP user/password (https://appwrite.io/docs/apis/webhooks). Delete project is in a **danger zone** with a type-to-confirm input (console issue: https://github.com/appwrite/console/issues/1437). |
| **Supabase** | Project Settings: General, Infrastructure, Add-ons, **Custom domains** (paid), **Authentication** → SMTP settings form and **Email Templates** (Confirm signup, Invite, Magic link, Change email, Reset password — subject + HTML body with variables), **Database Webhooks** → Create: name, table dropdown, **Events** checkboxes (Insert / Update / Delete), HTTP request or Edge Function target, headers/params rows. **Delete project** requires typing the project name (https://supabase.com/docs/guides/platform/delete-project). |
| **PocketBase** | Settings: Application (name, URL, hide controls), **Mail settings** (SMTP form + a **Send test email** button; per-collection mail templates with subject/body and placeholders), **Files storage** (S3 form + test), **Backups** (create/upload/restore, cron auto-backup), **Auth providers**, **Export/Import collections**, **Token options**, **Logs**. |
| **Firebase** | Project settings, Auth **Templates** tab (sender name, from, reply-to, subject, body with placeholders), Hosting custom domains wizard. |
| **Bubble** | Settings tab: Domain/email (custom domain, SendGrid key), API (enable Data API per type, Workflow API), Languages (all user-facing strings), Collaboration. |
| **Directus** | Settings module: project (name, colour, logo), **Webhooks/Flows**, roles, translations, presets. |

**Common pattern / best-of-breed:** *webhooks with an event tree of checkboxes* (Appwrite) or *table + Insert/Update/Delete checkboxes* (Supabase), *SMTP form with "Send test email"* (PocketBase), *email templates as subject + body with placeholder chips and "reset to default"* (Appwrite), *custom domain wizard with a verify button*, and *danger zone with type-the-name delete*.

---

## 12. Cross-cutting UX

| Concern | Who does it well |
|---|---|
| **Empty states with a CTA** | Appwrite (every list has an illustration, a one-line explanation, a primary button and a "Documentation" link); Supabase ("Create a new table" card with a link to import CSV); PocketBase (dashed placeholder "New collection"). |
| **Destructive confirmation** | Supabase and Appwrite type-the-project-name (https://supabase.com/docs/guides/platform/delete-project; https://github.com/appwrite/console/issues/1437); Parse asks you to type the class name; Convex requires confirmation in production only; Appwrite keeps delete in a red **Danger zone** card at the bottom of Settings. |
| **In-context help** | Appwrite's "Learn more" links on every settings card; PocketBase's inline rule examples and autocomplete; Supabase's AI Assistant (cmd+i) with schema context; Bubble's "?" on each checkbox. |
| **Keyboard** | Directus ⌘K search; Convex Ctrl+` custom query; Nhost table editor built around keyboard navigation ("an important factor" — https://nhost.io/blog/new-database-ui); Airtable grid keyboard is the benchmark. |
| **Dark mode** | Appwrite (system/light/dark switch in the avatar menu), Supabase, PocketBase, Directus, Convex all ship it; Bubble and Parse Dashboard do not. |
| **Undo / audit** | Bubble "Copy and restore database" and change history; Appwrite Activity tab per user/collection; PocketBase backups with one-click restore. |
| **Testing as a user** | Supabase impersonation, Firebase Rules Playground, Bubble "Run as", Backendless REST Console. |

---

## What people say (why they love / hate these dashboards)

1. **PocketBase** — "One of the standout features is the beautiful and user-friendly admin dashboard that comes built-in… more than just a data viewer, it's a powerful configuration tool." (https://betterstack.com/community/guides/database-platforms/pocketbase-backend/)
2. **PocketBase** — "Download the binary, run ./pocketbase serve, and open the admin panel. You have a working backend in minutes with no Docker, configuration files, or multi-service setup… It covers essential tasks but lacks advanced monitoring." (https://leanware.co/insights/supabase-vs-pocketbase)
3. **PocketBase vs Supabase (HN)** — "A single deployable binary which PocketBase provides is a breath of fresh air." vs "Local development [with Supabase] is a massive pain with random bugs." — ilrwbwrkhv (https://news.ycombinator.com/item?id=36005966)
4. **Supabase RLS** — the Supabase team: "many of you liked the pre-defined templates in the old UI" and "the AI responses were hit and miss (turns out, LLMs are great with general SQL, but pretty weak with RLS policies)"; a user: existing policies are "too hidden and makes it difficult to see the existing ones". (https://github.com/orgs/supabase/discussions/21882)
5. **Appwrite vs Supabase** — "Appwrite optimizes for 'batteries included, minimal SQL knowledge required,' while Supabase optimizes for 'full database power, you write the queries'… Appwrite tends to be faster to start with for teams without dedicated backend or SQL expertise." (https://gartsolutions.com/appwrite-vs-supabase/)
6. **Appwrite** — "Appwrite has great SDKs… modern UI dashboards, and developer-focused documentation… If you prefer a more API-centric, flexible backend that's easy to containerize, Appwrite is a joy to use." (https://uibakery.io/blog/appwrite-vs-supabase-which-backend-to-choose)
7. **Firebase console** — Firestore viewer: "no query history… you lose it and must rebuild filters from scratch every time", "no table view to compare fields across records", data export is "clunky", and switching Database/Auth/Storage means "three different views and contexts". (https://medium.com/@fahadirshadd/a-better-way-to-work-with-firestore-that-isnt-the-firebase-console-appobase-a3831e30f871)
8. **Parse Dashboard / Back4app** — the dashboard "makes it easy to browse data, manage user roles and test cloud functions without writing extra admin tools", but reviewers note the UI "looks dated and lacks a proper search function". (https://nubiapage.com/back4app-review-2026-pricing-login-career-alternatives/)
9. **Supabase Studio** — "Supabase provides a full web dashboard with table editors, SQL runners, API docs, and monitoring." (https://leanware.co/insights/supabase-vs-pocketbase) — the recurring counterpoint being that most of its power surfaces are SQL.
10. **Directus** (community consensus in layout/feature posts) — "you can search, filter and add data, and select items" identically across Table, Cards, Calendar, Map layouts, which is what makes it usable by editors rather than engineers. (https://directus.com/docs/guides/content/layouts)

---

## Top 15 patterns a serious BaaS dashboard must have

1. **Type picker with icon + one-line description, searchable** (Airtable, Directus, PocketBase); per-type option drawer whose controls change with the type and that greys out contradictory options (Required vs Default vs Array — Appwrite).
2. **Relation set-up as a dialog**: target collection picker, cardinality radio (1:1 / 1:N / N:N), two-way toggle, on-delete dropdown (Appwrite, Supabase FK dialog).
3. **The Airtable filter row** — `And/Or · field ▾ · operator ▾ · value` — with type-aware operators, nestable groups, and *the same widget reused* for permissions conditions, saved views and log filters (Directus is the proof this works).
4. **Add/edit record as a right-hand drawer generated from the schema**, with relation picker modals, select chips, file dropzones, JSON editor (PocketBase, Supabase).
5. **Saved views / bookmarks** so filters and column sets are named, not rebuilt (Airtable, Directus) — the single biggest Firebase complaint.
6. **Bulk select → delete/edit, CSV import with type auto-detect, export CSV/JSON** (Supabase, Bubble, Directus).
7. **Users as a collection** so custom user fields use the same field editor; plus *Add user ▾ (Create / Invite by email / Magic link)*, *Ban for duration*, *Sessions tab with revoke*, *Send password reset* (PocketBase, Supabase, Appwrite).
8. **Teams/roles with invite-by-email + role chips**, and a **collection × CRUD matrix with tri-state cells** (All / None / Custom) where Custom opens the filter builder (Appwrite, Directus, Nhost, Backendless).
9. **Permissions = role chips × Create/Read/Update/Delete checkboxes** with an "Any / Guests / Users / Select users / Select teams / Label" picker (Appwrite) — no expression typing for the 90% case.
10. **Rule templates before AI** — a gallery of named templates ("Only the owner can update", "Public read, authenticated write") that fill a form with a live preview; keep the expression escape hatch with autocomplete and inline examples (Supabase v2 lesson; PocketBase autocomplete).
11. **A playground / impersonate-as-user control** to verify a rule without deploying (Supabase impersonation, Firebase Rules Playground, Bubble Run as).
12. **API keys with grouped scope checkboxes, select-all per group, expiry dropdown, shown-once secret with copy, last-used** (Appwrite).
13. **Schedule builder**: mode radios (every N minutes / hourly / daily at / weekly on days / monthly / custom cron) + human-readable sentence + next-runs preview, pick-a-function dropdown, Enabled toggle, **Run now**, run history with status chips (Supabase natural-language + history; Xano start/repeat/end; Parse Run now).
14. **Functions: template gallery → in-browser editor → Deploy; Variables/Secrets key-value list with masking; Executions table with status chips and request/response drawer; Test panel** (Supabase, Appwrite).
15. **Cross-cutting hygiene**: empty state with a CTA and a docs link on every list; **Danger zone** at the bottom of Settings with type-the-name deletes; filter-chip logs with timeline brush and a Raw JSON drawer; SMTP with "Send test email" and templates with "reset to default"; webhooks as an event checkbox tree; ⌘K; dark mode.
