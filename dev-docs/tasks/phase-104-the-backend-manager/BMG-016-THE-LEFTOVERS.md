# BMG-016 — The leftovers, before Richard drives

**Opened and built s16, 2026-09-26.** Richard: *"let's finish phase 104"* — then, asked how, *"build
the leftovers first"* (the drive, BMG-013, is his and comes after). **Status: ✅ built s16 (§6).**

## 1. What it is

Every build task was ✅ at the end of s15. What stood between the phase and its close was one open
ruling (R6), and the candidates the last four tasks filed in their §7 — cheapest first:

| # | from | what |
|---|---|---|
| 1 | README §8 R6 | a required field added to a collection that has records |
| 2 | BMG-011 §7 | the page cap (`queries`) on the Server page |
| 3 | BMG-015 §7 | the MCP backup tool cannot ask for the bucket |
| 4 | BMG-011 §7 | a restore leaves the running backend on the pre-restore settings |
| 5 | BMG-015 §7 | *Move files to the bucket* |
| 6 | BMG-012 §7 / BMG-014 | the editor always opens the manager with the machine credential (R7) |

## 2. What was wrong, measured (s16)

- **R6.** The Schema drawer asked for a *default* on a required field over records, and the
  default was declared and kept: `_columnToSQL` wrote `NOT NULL DEFAULT 'x'` (SQLite) /
  `columnToPostgres` likewise, and the schema recorded `defaultValue`. So a workflow that created a
  record without the field got the value silently — Richard's objection, verbatim in README §8.
- **The SQLite DDL pasted a string default between quotes unescaped** (`DEFAULT '${v}'`): a default
  or fill of *O'Brien* ended the literal and the DDL refused. PostgreSQL's builder already quoted.
- **The page cap.** `PUT /admin/ops`'s `known` list (`HttpServer.putOps`) omitted `queries`, which
  the model validates (PRD-001) — the Server page had no card and the wire refused the section.
  (`grep` found nothing here the first time: ugrep treats `HttpServer.ts` as binary — `grep -a`.)
- **MCP.** The tool the task file named (`configure_backend_backups`) does not exist; the real one,
  `set_backend_backup_policy`, typed `destination: {path}` only.
- **Restore.** BMG-011 §7 said `security.json`/`ops.json` come back from an archive. Measured:
  `ops.json` is NOT archived (`BackupManager.ts` `CONFIG_FILES`); `security.json`, `triggers.json`,
  `email.json`, `config-params.json`, `backups.json` are. `config-params.json` is read per request;
  the other four are read ONCE at start. After a restore the running backend kept enforcing the
  pre-restore permissions (an anonymous read the archive allows answered **403**), kept firing the
  pre-restore schedules, and the next edit on any of those pages wrote the OLD settings back over
  the restored file (`Object.assign(this.security.config, …); save()`).
- **Move.** Switching to a bucket moved nothing; the docs described a hand procedure.
- **The editor open.** `BackendManager.openDashboard` put `#token=` on every open, so every open
  signed in as the credential — into browser history — and *Activity* said *admin credential*.

## 3. What was built

1. **R6 — a one-time fill.** `SchemaColumn.fillExisting` (runtime `schemaCommon.ts`): the value the
   rows already there get, never declared (`declaredColumn`). SQLite: the column is added
   `NOT NULL DEFAULT <fill>` (it has no `ALTER COLUMN … DROP DEFAULT`), and `create` names every
   required-without-default column a record left out as `NULL` (`requiredWithoutDefault`), so the
   engine refuses it with its own sentence (mapped to *"phone" is required on "Pet"*). PostgreSQL:
   `ADD COLUMN … DEFAULT <fill>` then `ALTER COLUMN … DROP DEFAULT` in the same queued step. The
   page: over records the box reads **Fill the N records already here with**, *Once, now. It is not
   a default: a new record without this field is refused.*; `toColumn(d, records)` sends
   `fillExisting`; the bound refusals say *The fill value …*. The SQLite string default is quoted.
2. **How long a list can be** (Server): two numbers in words, refused inline when upside down,
   saved as `queries`; `putOps` accepts the section.
3. **MCP** `set_backend_backup_policy`: `destination` is `{path}` or `{type:'s3', prefix?}`; the
   no-bucket refusal is the backend's sentence.
4. **Restore takes up what it restores.** `resume()` → `service.reloadRestoredSettings()`:
   `SecurityState.reloadConfig`, `TriggerRegistry.reload` + reschedule, `EmailConfigState.reload`,
   `BackupConfigStore.reload` + reschedule — each with its start-up validation. A file that refuses
   is NOT left on disk (the next start would refuse it): the live settings are written back over it
   and the file is named in the answer (`settings: {reloaded, refused}`) and on the page.
5. **Move files to the bucket** (`storage/moveToBucket.ts`, `GET`/`POST /admin/files/move`, audited
   `files.move`): one background job; per file copy → check the bucket holds every byte → point the
   row at the bucket only if it still names the local copy (`expect`) → delete the local copy. Any
   failure leaves the file serving from where it was, named with a sentence. The Storage page's
   card (only when uploads go to the bucket): the count, *Move them to the bucket* behind a
   confirm, a `<progress>` while it runs (polled each second), what happened when it ends.
6. **R7 — sign in once per browser.** The editor asks `whoami` first; with `adminAccount` the link
   is `/_admin#route=…` (no credential); if the backend cannot say, the credential goes as before.
   The page: `readHandoff` accepts `#route=` alone; a person's session is kept in `localStorage`
   (`PERSON_KEY`), the credential still in `sessionStorage`; *Keep me signed in on this browser* is
   on by default; *Sign out* forgets both and `POST /logout`s the session. The BMG-014 drive's
   *Keep me signed in* click would now UNTICK it — it only ticks when unticked.

## 4. Acceptance criteria

1. With records, a required field's fill reaches the rows there, is not declared, and a new record
   without the field is 400 by sentence — both engines. ✅
2. A fill with an apostrophe adds on SQLite. ✅
3. The page cap is set on the Server page and a read that forgot to size itself gets that many and
   says it was capped. ✅
4. The MCP tool takes a directory, and asks for the bucket by type, refused by sentence with none. ✅
5. After a restore, the RUNNING backend enforces the archive's permissions, and the next edit does not
   write the old ones back; a restored file that refuses keeps the live settings, on disk too. ✅
6. *Move files to the bucket* moves what it can, serves each from the bucket after, leaves a file it
   cannot move where it was with a sentence, and removes a bucket copy whose row did not move. ✅
7. The editor sends no credential once an account exists; the page finds the person's sign-in on a
   bare open and lands on the route; sign-out ends the session on the server. ✅

## 5. Out

- Moving files **back** from a bucket to this machine (do it before disconnecting; documented).
- `forcePathStyle: false`, multipart, retries (BMG-015 §7, unchanged).
- The sign-in form's *Keep me signed in on this browser* also sits above *Use the admin credential
  instead*: the credential is still kept only for the tab, whatever the box says — the box is about
  a person's sign-in.

## 6. Built, measured (2026-09-26, s16, after every change in this commit)

- **Backend** `npm run typecheck` exit 0 (both configs). Full `npx jest --maxWorkers=4`: **207 suites PASS, 1 skipped
  (`fed-003-live-cache`), 2,489 tests (16 skipped), exit 0, 363 s.** The first full run was **exit 1**:
  `security-enforcement` §7's route walk sends one unauthenticated request per route, the `admin` class's burst is
  100, and the two new routes made the admin routes 101 — `POST _admin/setup` met a **429** (the limiter, working)
  instead of the 401 the walk grades. That suite now starts with rate limiting off (it grades authentication; rate
  limits have their own suite). Route tally `admin: 101` (`GET`/`POST admin/files/move`).
- **Runtime** `tsc --noEmit` exit 0; `npx jest test/adapters` **328/328**.
- **MCP** `tsc --noEmit` exit 0; `backendTools` + `toolDisclosure` **49/49** (the backend group is deferred: the
  resident budget is untouched).
- **Editor** `npm run test:main`: **565 suites, 8,792 tests, exit 0, 43 s** (the new
  `tests-main/local-backend/open-dashboard-account.test.js` 3/3).
- New specs: `tests/bmg-015-move-to-bucket.test.ts` 4, `tests/bmg-011-restore-settings.test.ts` 4,
  `tests/admin-app/remembered-person.test.ts` 5; grown: `bmg-003-schema` (R6, both engines), `bmg-011-files-backups-ops`
  (restore reload; the page cap), `admin-app/schema-view`, `storage-views`, `where-cards`, `handoff-route`, MCP
  `backendTools`.
- **Mutants, each red then restored with `cp`:** without the SQLite NULL-naming and without PG's `DROP DEFAULT` the R6
  spec answered `Received: 201` on both engines (the new record silently took the fill); without the reload the
  restore spec saw `reloaded: []`, and with the security step a no-op an anonymous read of what the archive allows
  answered **403**; without the move's `expect` the stale-row case moved a row it should not have.
- **Build** `npm run build` exit 0; `dist/cli.js` and `build/admin/app.js.txt` carry the new code (the page's JS
  102,897 bytes gzipped, budget 160,000 on the document). The editor runs `dist/` — rebuilt for Richard's drive.
- **Drive** `drives/bmg016/run.sh ac seed` — a locked throwaway backend + the S3 fake + headless Chrome: **23/23, no
  page errors** (`drives/bmg016/ac-result.json`, `shots/bmg016-*.png`). The first run was 21/23 and both were the
  drive's own assertions: the Activity row records the person's **id** (the page words it), and a revoked session is
  this backend's Parse-style `400 Invalid session token` **209**, not 401 — now asserted exactly, each beside a
  control (the credential's change records no person; the same token answered 200 before *Sign out*).
- The BMG-003 drive's AC5 check pinned the OLD R6 wording and the BMG-014 drive's *Keep me signed in* click would now
  untick the box — both repointed (not rerun).
