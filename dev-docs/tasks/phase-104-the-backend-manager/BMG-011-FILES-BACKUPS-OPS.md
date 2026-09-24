# BMG-011 — Files, Backups and Settings: the tabs the routes have and the page does not

**Opened 2026-09-24** (README §2 rows 3, 7 and the "cannot do at all" list). **Depends on BMG-001,
BMG-008 (`ScheduleBuilder`), R4.**
**Status: 📋 not started.**

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
