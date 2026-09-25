# BMG-011 — Files, Backups and Settings: the tabs the routes have and the page does not

**Opened 2026-09-24** (README §2 rows 3, 7 and the "cannot do at all" list). **Depends on BMG-001,
BMG-008 (`ScheduleBuilder`), R4.**
**Status: ✅ built and driven s13 (2026-09-25) — AC1–9, 39/39 checks through the page, two server defects found and fixed (§6).**

## 1. The person sentence

> **Someone sees the files their app has stored, decides which kinds are allowed by ticking
> categories, sets when backups happen and how many to keep, restores one when they must, keeps
> a secret without seeing it again, and sets the server's few knobs — all from pages, none from
> a config file.**

## 2. What is wrong, measured

**Files** (`index.html:2585-2677`): max size, signed-URL TTL, *Denied content types
(comma-separated)* (`:2613`), thumbnail presets **read-only** with a note to use the MCP or the
editor panel (`:2624`), orphan sweep with a raw *Cron* input (`:2629`). **No file browser**:
`files.ts` serves `/files/:name` by name; there is no listing route (agent map §3).

**Backups** (`:2535-2581`): *Back up now*, an archives table, a chip `scheduled: <cron>`
(`:2552`). `PUT /admin/backups/config` (schedule, retention) has no UI. No restore (BAK-005
left it out on purpose; `POST /admin/backups/restore` exists) — **R4**. No download of an
archive (measure: is there a route?).

**Not on the page at all** (routes exist): **Secrets** (`GET /admin/secrets`, `PUT/DELETE
…/:name`; names only, values never returned), **Search** (`GET /admin/search`,
`PUT/DELETE …/collections/:name`, `…/rebuild`; `features.search` exists), **Server settings**
(`GET/PUT /admin/ops`: logging, rateLimit, cors, audit, executions, metrics;
`HttpServer.ts:2182-2213`). The editor has panels for Secrets and Search (BMG-012 deletes them
once these exist).

**Audit** (`:2681-2747`): action and outcome selects; the *Target* column is
`JSON.stringify(x.target)` (`:2730`); the detail is a raw JSON textarea (`:2743`).

## 3. What to build

### 3.1 Files → **Storage**
- **A file browser** — backend: `GET /admin/files?prefix&limit&cursor` listing name, size,
  type, created, referenced-by (the orphan sweep already knows which records point at a file;
  reuse its walk). Page: grid/list toggle, thumbnails for images (served through the existing
  signed URL), name, size, *used by N records* (link to the record), **Upload** dropzone,
  **Download**, **Delete** (refuses when referenced, unless *also clear the references*).
- **Settings** below: max size; **Allowed kinds** as category checkboxes (*Images · Documents ·
  Audio · Video · Archives · Executables and scripts*) that expand to the deny list the backend
  stores (a table with a spec), plus *custom* chips for MIME types; **thumbnail presets** as a
  `ListEditor` (name, width, height, fit) → `PUT /admin/files/config`; **Clean-up** with the
  `ScheduleBuilder` and the two run buttons.

### 3.2 Backups
- **Schedule** with `ScheduleBuilder`; **Keep** — *the last N* / *N days*; **Where** (the driver
  the config supports; measure); **Back up now**.
- **Archives** table: when, size, *Download* (route if present; else add `GET
  /admin/backups/:id/archive`, admin-only, streamed), **Restore…** (R4) → `confirmDestructive`
  typing the backend's name, one sentence on what happens to data written since, and a *Back
  up first* checkbox ticked by default.

### 3.3 Secrets
A table of names with *set* (a password field, write-only), *last set*, *used by* (function
env — if the store records it), **Add secret** (name validated in words, value), **Delete**
(type the name). The value is never shown after save; the page says so once.

### 3.4 Search
Per collection: **Searchable** switch, **which fields** as chips of the collection's text
fields, **Rebuild index** with progress (poll `GET /admin/search`), index size.

### 3.5 Server (`#/settings/server`) — `GET/PUT /admin/ops`
- **Who may call from a browser** — CORS origins as `Chips` (the same validator as Sign-in's
  origins; one list if the backend lets them be one — measure).
- **Rate limit** — N requests per minute per client, burst.
- **Logging** — level radios; **Audit** — on/off, keep N days; **Runs** — keep N records
  (compaction; the existing `POST /admin/executions/compact` as *Compact now*); **Metrics** —
  on/off with the `/metrics` URL shown.
- Each card saves alone; the page says which ones need a restart (the route says; measure).

### 3.6 Audit → **Activity**
The target rendered as a link to the thing (*Pets · schema*, *Ann · user*, *editors · role*),
the actor as a name or *API key: deploy*, the detail as the FED-007 tree with raw JSON one click
away. `FilterRow` over action · actor · outcome · when.

## 4. Acceptance criteria

1. Upload two files from the page, see both with sizes and one thumbnail, download one
   byte-equal, delete the unreferenced one; the referenced one refuses with the record named.
2. Ticking *Executables and scripts* stores the documented MIME list; adding a custom type
   appends it; both read back from `GET /admin/files/config`.
3. Thumbnail presets edited on the page are what `GET /admin/files/config` returns and what a
   `/files/:name?thumb=` request honours (drive).
4. The clean-up and backup schedules built with the builder are stored as cron strings the
   scheduler accepts and the sentence on the page matches the shared gloss.
5. Restore (R4): back up, write a record, restore, the record is gone, and the *back up first*
   archive exists (drive on a throwaway backend; `backup-*` suites green).
6. A secret set on the page is readable by a function through the existing mechanism and never
   appears in any admin response (drive reads every admin route after the set and greps).
7. Search: a collection made searchable answers `$text` on the chosen fields after rebuild.
8. CORS origins set on the page are what a preflight from that origin receives
   (`admin-cors-devopen` shows the harness).
9. 🔴 No comma-separated or cron text field on any of these pages at rest.

## 5. Watch for

- The orphan-sweep walk is expensive on a big store; the file listing's *used by* should be
  computed lazily per row or cached by the sweep, not on every page load.
- `PUT /admin/ops` may need a restart for some sections; the route's answer decides, not the
  page. Say it beside the card that needs it.
- Restore replaces the store under a running service; the route already handles it (the
  `backup-roundtrip` test) — the page must block every other control until it returns.
- The editor's Secrets panel has a model (`secretsPanelModel.ts`) with rules for names; port
  them.

## 6. Built (s13, 2026-09-25)

**Where — backend:** `server/admin-files.ts` — **`GET /admin/files?q&limit&offset`** (the `_Files` rows through the
metadata store, newest first, `count`; never `/api/_Files`), **`GET /admin/files/uses?names=a,b`** (ONE walk over every
File-typed column of every user collection for the names the page shows — `usesOf`; §5's "not per row, not on every
listing"), **`DELETE /admin/files/:name[?clear=1]`** (409 `FILE_IN_USE` naming the records while any points at the
file; `clear=1` blanks those fields through `rawSave` first; audited `file.delete` with the count cleared).
`storage/FileSubsystem.ts` — **`deleteStored(record)`** (blob + row + the thumbnail cache dir), the ONE implementation
behind the public `DELETE /files/:name` and the admin route. `server/admin-backups.ts` — **`GET
/admin/backups/archive?file=`** (a LISTED archive streamed as a download; `..` and any unlisted path are 404 by name),
**`restore` quiesces**: `PersistenceControl {pause, resume}` from `service.ts` disconnects the adapter, the archive is
unpacked, the adapter reconnects to the SAME path and `ensureSystemTables()` re-runs — `try/finally`, so the service
serves *something* whatever happened; the response says `reconnected`. `restore` takes a listed archive's `file` or
`path` only. `search/SearchIndexer.ts` takes a GETTER for the schema manager (a reconnect makes a new one; the
long-lived `AdminSearchRoutes` indexer would have dropped FTS tables on a closed database). `server/files.ts` — the
thumbnail cache key carries the preset's SIZE and fit, not just its name (defect below). `HttpServer.ts` — the four
routes, `features.secrets`, `AdminFileRoutes` takes the facade. `ops/audit-actions.ts` — `file.delete`.
Route tally **`admin: 94 → 98`** (`ops-rate-limit.test.ts` says why).
**Where — app:** **`fileKinds.ts`** — six categories in the SNIFFER's vocabulary (Images · Documents and data · Audio
· Archives · Web pages and scripts · Executables and anything unrecognised = `application/octet-stream`),
`denyListFrom`/`kindsFrom` (a category ticks when every type of it is denied; the rest are custom chips, so a list
written by hand or an agent shows and keeps everything), `mimeProblem`, `sniffable` (a custom type the sniffer never
produces is labelled *never identified* — it matches nothing). **`secretsModel.ts`** — the editor's
`secretsPanelModel` rules ported (BMG-012 deletes that copy). **`activity.ts`** — `targetWords` (route pattern +
params → *Pets · permissions* with an `href` to the thing), `actorWords`, `actionWords`, `activityFields`/
`activityQuery` (flat: action · who · outcome · when → the route's `action`/`actorKind`/`outcome`/`since`/`until`).
**`views/files.tsx`** → *Storage*: dropzone (multi-file, the credential on `POST /files/:name`), search, paging, a
thumbnail per image row through a signed URL + `&thumb=sm`, *used by* as links to the records, Download (signed URL),
Delete → `confirmSimple` → on 409 a dialog naming the records with *Delete anyway and clear N fields*; Settings (largest
upload, private-link life, **Refuse these kinds** as boxes, **Also refuse these types** as chips); presets as a
`ListEditor` (name · width · height · fit, `presetsProblem`); Clean-up with the `ScheduleBuilder`, Check now / Check now
and delete unknown files (confirmed). **`views/backups.tsx`**: status chips, *When* (switch + builder + missed-run
radios), *Keep* (three numbers + `keepWords`), where, include secrets, Back up now, archives with **Download** (fetched
with the credential, handed to the browser as a blob) and **Restore…** → `RestoreDialog` (the backend's typed name from
`whoami.backend.name`, *Back up first* ticked, one sentence on the data since) → the page wears `.blocked` and every
control is disabled until the route answers. **`views/secrets.tsx`**, **`views/search.tsx`** (switch + text fields as
chips over a Picker + Rebuild with the report), **`views/server.tsx`** (CORS as *any site* / site chips over
`originProblem` + cookies with the refused pair said inline; rate limits as a table of seven kinds × two numbers +
proxies as chips; logging radios; audit switch + days; runs retention + *Compact now*; metrics + the URL).
**`views/audit.tsx`** → *Activity*: `FilterRows flat`, paging, actor names looked up once per id, target links, a
detail dialog with the `JsonTree` and the raw entry behind a disclosure. `nav.ts`/`views/index.ts` — Secrets, Search,
Server under Settings; *Audit* → *Activity*. `format.ts` — `bytes` shared. `styles.css` — `.kind-boxes`, `.uses-list`,
`.list-head`, `.rate-table`, `.blocked`. Bundle **99,696 gzip** (budget 160,000).

**Not built, and why:** *Where* for backups is the local path only — `BackupDestination` has one driver (`type:
'local'`), so a driver picker would be one tile. Index size on the Search page — `RebuildReport` carries
`rowsIndexed`, not bytes; the page says *N records indexed*. *Progress* on a rebuild — the route is synchronous and
answers with its report; the button says *Rebuilding…* and then the count. The Server page does not show `queries`
(the page cap) — `putOps`'s known list refuses it (§7). Restart notes beside cards — measured: every section is read
live (`service.ts` getters, `logger.configure` on save, `applyCors` reads the config per request), so the page says
*applies at once* once. Video/other categories — the sniffer has no signature for them (an inert box teaches a lie);
the spec holds the table equal to the sniffer's literals.

**What each AC measured (server spec `tests/bmg-011-files-backups-ops.test.ts` 22/22, page spec
`tests/admin-app/storage-views.test.tsx` 24/24, drive `drives/bmg011/run.sh ac seed` 39/39, shots `shots/bmg011-*`):**
- AC1 — two uploads from the dropzone (CDP `DOM.setFileInputFiles`, which fires `change` itself — a dispatched second
  one uploaded everything twice), sizes shown, a 48×32 thumbnail through the signed URL, Download byte-equal, *used by*
  as a link to the record, the unreferenced delete, the referenced refusal naming `Pet <id> (photo)` with *Delete anyway
  and clear 1 field*, `file.delete` on the trail, a read-only admin refused.
- AC2 — *Executables and anything unrecognised* ticked + a custom `application/x-msdownload` → `denyList` equals
  `['application/octet-stream','application/x-msdownload']` and reads back ticked + chipped; an HTML upload refused by
  its bytes; `exe` refused inline.
- AC3 — `sm` edited to 12×8 on the page → `GET /admin/files/config` returns it and `?thumb=sm` renders 12×8.
- AC4 — the clean-up built as *Every week · 04:30* stored as `30 4 * * 1,2,3,4,5`, `sweepStatus.nextRunAt` armed, the
  page's sentence equals `POST /admin/triggers/preview`'s `words` (= `cronWords`); the backup schedule `15 2 * * *`
  armed; an invalid cron refused.
- AC5 — Back up now → the archive listed; a record written after; Restore… (typed name gate, ticked box) → the page
  blocked (a `MutationObserver` armed BEFORE the click: the route answers in ms) → the record is 404 on the RUNNING
  backend, the earlier one 200, the `pre-restore-…` archive exists, `backup.restore` on the trail with
  `reconnected:true`, a write after the restore lands (read back by a SEPARATE `node:sqlite` connection in the spec).
- AC6 — a secret through the dialog (password field, the name rule inline) → `secrets.json` `functions.STRIPE_KEY`;
  the value in none of 22 admin GET responses (the spec walks every GET route in the table: 30+) nor the page's DOM.
- AC7 — Pet made searchable over `bio` from the page → `search: 'quick brown'` answers Rex, `Rex` (on `name`) does not.
- AC8 — `https://app.example.com` as a chip (a pasted page URL kept as its origin; a bare host refused inline) → the
  preflight from it receives it, from another origin nothing; the `*` + cookies pair refused in words.
- AC9 — a sweep over the six pages (schedules on, CORS chips on): no text field whose placeholder, label or aria-label
  says *comma* or *cron*, no value shaped like a cron.

**Defects found and fixed:**
- 🔴 **Restore over HTTP swapped the database under the running adapter's open handle.** The process kept serving the
  OLD rows from the unlinked inode and every write after the "restore" went into a file nothing would read again —
  self-healing on the next restart, invisible to every arm that completes. AC5's *the record is gone* could not be true
  without the reconnect. Fixed by quiescing (above); pinned by the spec's separate-connection read.
- 🔴 **A thumbnail was cached under the preset's NAME.** Editing `sm` from 64×64 to 12×8 kept serving the 48×32 render
  (and the same ETag) — the drive found it because the page had already rendered `sm` before the edit; the spec had
  used a fresh name. Fixed by keying the cache and the ETag by name + size + fit; pinned.

**The drive:** `drives/bmg011/run.sh ac seed` — LOCKED backend on 8697 (`--readonly-token r0k`, rate limit off), the
first admin made by `POST /_admin/setup` (BMG-014: without it the first load is the setup step, not the shell), a `Pet`
collection with a File field by the API, a real 48×32 PNG encoded in the script (the resize never enlarges — a 2×2
source comes back 2×2 whatever the preset says), Chrome 9333. 🔴 `sched-mode` buttons are clicked by their text
(*Every week*); the time is `input[type=time]` inside the schedule's container. `requests` from `cdp.mjs` read the
Activity filter's own query (`actorKind=apiKey`).

## 7. Candidates this task surfaced (§6 of the README)

- **The page cap on the Server page** — `queries.defaultLimit`/`maxLimit` (PRD-001) are validated by the model but
  `putOps`'s known list refuses the section. One line in `HttpServer.putOps` and a card.
- **Restore of a foreign archive** — a restore re-ensures the system tables, but `security.json`/`ops.json` come from the
  archive's `config/`; the in-memory `SecurityState`/`OpsState` keep the pre-restore values until restart. A restore of
  THIS backend's archive (the page's case) has the same files. Say it on the dialog, or reload those states too.
- **BMG-012** deletes the editor's Secrets and Search panels (`secretsPanelModel.ts` ported here as `secretsModel.ts`).
