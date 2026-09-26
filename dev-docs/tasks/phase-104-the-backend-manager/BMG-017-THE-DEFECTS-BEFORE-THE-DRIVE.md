# BMG-017 — The defects before Richard drives

**Opened 2026-09-26 (s16).** Richard: *"Let's write up a task to fix the bugs before my drive please."*
**Depends on:** BMG-016. **Blocks:** BMG-013 (his drive). **Status: ✅ built, driven 14/14 (s17, 2026-09-26).**

## 1. The person sentence

When Richard drives (BMG-013), nothing he meets is a defect the sessions already knew about. Whatever he
marks NOT WORTHY should be new.

## 2. What is wrong, measured (s16, 2026-09-26, read at `4b068ced`)

Each row was read in the code the day it was filed. The *proof* column is what the first spec must
reproduce **before** the fix, and it must be red on the code as it stands.

| # | defect | where, measured | who meets it | proof (red first) |
|---|---|---|---|---|
| 1 | 🔴 **R6's guard has a hole on SQLite: an IMPORT hands a new record the one-time fill.** BMG-016 made `LocalSQLAdapter.create` name each required-without-default column a record omitted as `NULL`, because SQLite keeps the fill as the column's DDL default. The import path does not go through `create`: `importCollection` → `facade.upsertBatch` → (SQLite has no `adapter.upsertBatch`) the facade's own loop → `QueryBuilder.buildInsert` + `db.prepare(sql).run` (`AdapterFacade.ts:728-750`). No guard. PostgreSQL is not affected (its default is dropped). | `persistence/AdapterFacade.ts:709-752`; `backup/dataio.ts` `importCollection` | the Collections page's *Import CSV* (BMG-002), MCP `import_backend_collection`, `POST /admin/data/import` | SQLite: add a required field over records with a fill, import a CSV row without it → the row gets the fill (should be refused, the import naming the row) |
| 2 | 🔴 **The orphan sweep can delete a file that is mid-upload or mid-move.** An upload writes the bytes, THEN the `_Files` row (`server/files.ts:151-153`). A move writes the bucket copy, THEN re-points the row (`storage/moveToBucket.ts`). The sweep reads every row, THEN lists every stored object, and deletes whatever has no row (`storage/orphanSweep.ts:38-72`) — no age allowance. With *delete orphans* pressed (page, or MCP `run_backend_file_sweep {deleteOrphans:true}`), a blob that lands between the two reads is deleted and its row then points at nothing: the file 500s. The window is the time to list the whole store — seconds to minutes on a real bucket. | `storage/orphanSweep.ts`, `server/files.ts`, `storage/moveToBucket.ts` | anyone who presses *Delete orphans* while the app is in use, or while *Move them to the bucket* runs | a sweep with delete, run while an upload is held between its blob and its row (a driver stub that pauses `put`) → the uploaded file no longer serves |
| 3 | **The magic-link email's preview lies about how long the link lasts.** The preview fills `{{expiresIn}}` from a fixed sample, *15 minutes* (`email/templates.ts:147`); the real email says the configured lifetime (`server/oauth-routes.ts:649`, `ttlMinutes`). Set it to 60 and the preview still says 15. (The password-reset email's *1 hour* is fixed in both — it is not affected.) | `email/templates.ts:137-152`, `server/admin-email.ts:161,243` | Email page → the magic-link template's preview and *Send me this* | set the magic-link lifetime to 60 minutes → the preview says *15 minutes* |
| 4 | **The sign-in form's *Keep me signed in on this browser* is not true for the credential.** BMG-016 (R7) keeps a person's session for the browser; the credential typed under *Use the admin credential instead* is still kept only for the tab, whatever the box says. | `admin/app/App.tsx` `Login`, `admin/app/api.ts` `keep` | anyone who signs in with the credential and ticks the box | tick it, sign in with the credential, open a new tab → asked again |
| 5 | **Unproven, not known broken: AWS-style bucket addressing.** With *Path-style addressing* off, `S3Driver.target` sends `Host: <bucket>.<endpoint host>` over a connection to the endpoint's own hostname (`storage/S3Driver.ts:129-137, 178-190`). The S3 fake is path-style only, so no spec or drive has ever sent one of these requests. It is the switch an AWS S3 user turns off. | `storage/S3Driver.ts` | anyone connecting a bucket that does not accept path-style requests | a fake that routes on the Host header (virtual-hosted), and the SigV4 signature checked over `host` → green or red; if red, fix |

**Checked and NOT defects (so nobody re-measures them):** the PostgreSQL import path (the fill's default is
dropped, so an omitted field is refused anyway); `migrate/move.ts` (SQLite→PostgreSQL copies every column
of every row, and the declared schema has no default); the password-reset preview's *1 hour* (fixed in send
and sample alike); a restore that cannot reach the bucket (a 502 by sentence with the database untouched —
BMG-015 AC3, a behaviour, not a defect).

## 3. What to build

1. **One guard, every insert.** Move the required-without-default NULL-naming out of `LocalSQLAdapter.create`
   into ONE place both SQLite insert paths use: `QueryBuilder.buildInsert` taking the collection's declared
   required columns, or the facade's loop asking the adapter for them. Then the import refuses a row that
   leaves a required field out, in words and naming the row, the same way it refuses any other invalid row,
   and it imports the rest. Census every `buildInsert` caller (today: `LocalSQLAdapter.create`,
   `AdapterFacade.upsertBatch`, `PostgresAdapter.create`, `PostgresAdapter` bulk) and pin them in a spec so a
   new caller cannot skip it.
2. **The sweep never deletes the young.** Take the store's own age with each key: `LastModified` from
   `ListObjectsV2`, `mtime` from the local walk. A blob younger than a grace window (5 minutes, stated in the
   report) is reported as *too new to judge*, never deleted. Then, just before deleting, re-read the rows for
   the candidates and drop any that now have one. The page's *Clean-up* card and MCP say how many were too new.
3. **The preview reads the policy.** `sampleVariables` takes the configured magic-link lifetime (the same
   `ttlMinutes` the send uses), so the preview and *Send me this* say what the real email will.
4. **The box says what it does.** Either the credential path keeps the credential for the tab and the box
   moves under the email and password (it is about a person), or the box's sentence says *this tab* when the
   credential is used. Pick the smaller one that is true.
5. **Prove the AWS addressing.** Teach `tests/helpers/s3-fake.js` virtual-hosted routing (bucket from the
   Host header) and check the signature over the host it received. Run the BMG-015 storage spec's
   connect/upload/serve/backup cases once more with `forcePathStyle: false`. Fix whatever goes red.

## 4. Acceptance criteria

1. SQLite: an import row missing a required field (added over records with a fill) is refused by name, the
   other rows import, and no imported row carries the fill. The same on PostgreSQL. The `buildInsert` caller
   census is a spec.
2. A sweep with delete, run while an upload sits between its blob and its row, and while a move sits between
   its copy and its row, deletes neither; both files serve afterwards. The report counts them as too new. An
   old orphan is still deleted.
3. With the magic-link lifetime set to 60, the preview and the test send both say *60 minutes*.
4. The sign-in form's words match what is kept (a jsdom spec over both paths).
5. Connect, upload, serve, back up and restore pass against a virtual-hosted fake with path-style off.
6. Gates: backend typecheck, full backend jest exit 0, runtime adapters, and a headless drive of 1–3 through
   the page (`drives/bmg017/`). Each fix's spec is shown red with the fix removed (`cp` backup, never `git checkout`).

## 5. Out

- Moving files back from a bucket to this machine; multipart (>5 GB); retries (BMG-015 §7).
- Anything Richard finds on his drive: that is BMG-013's output, filed as README §2 rows.

## 6. Watch for

- 🔴 **`grep` skips `HttpServer.ts` as binary** on this machine: use `grep -a`.
- The backend spawned by drives and by the editor runs **`dist/`**: `npm run build` before a drive.
- A new admin route: `security-enforcement`'s walk no longer trips the `admin` rate burst (BMG-016 turned it off
  there), but the route tally in `ops-rate-limit.test.ts` and `audit-actions.ts` still owe their lines.
- Phase 78 has uncommitted `tpl008-*` specs and `tests/helpers/todo-drive.ts` in this package: not ours, leave them,
  commit by pathspec through a temporary index.

## 7. Built, measured (2026-09-26, s17, read at `4b068ced` + this change)

**One more defect than the table had.** While writing row 2's spec: the bucket is shared with the backup
archives (`backups/…`, BMG-015), and the sweep listed the WHOLE bucket — *Delete orphans* deleted **every
archive in it** (red: the spec's real *Back up now* archive and a foreign `photos/holiday.jpg` were both listed
as orphans). Fixed with row 2: the bucket's file listing is only the keys `put` writes
(`S3Driver.isFileKey`, `<2>/<2>/<hash>-<8 hex>`; an archive ends `.tar.gz` and never matches).

| row | fix | red first (on the code as it stood) | green |
|---|---|---|---|
| 1 | `buildInsert({…, required})` names each omitted required-without-default column NULL; `LocalSQLAdapter.requiredToName` is the one list; `create` and the facade's batch both pass it. `importCollection` reads existing ids BEFORE judging rows and refuses a NEW row that leaves such a field out (`owner: required, and this new row leaves it out`), so the rest import — on both engines (PostgreSQL rolled the WHOLE import back, 400) | SQLite: the CSV row got `FILL`; PostgreSQL: `Expected 200, Received 400`; the batch resolved; census `bare` ×2 | `bmg-017-import-required` 6/6 (SQLite + PostgreSQL + batch + census) |
| 2 | drivers list `{key, modified}` (`listEntries`: mtime / `LastModified`); a blob with no row younger than `SWEEP_GRACE_MINUTES` (5) is `tooNew`, never deleted; rows re-read just before deleting; the bucket lists only `put`-shaped keys. Page: `sweepWords` + the chip count *too new to judge*; MCP description says `tooNew` | a held upload's blob and a held move's bucket copy were listed and deleted; the archive + foreign key listed | `bmg-017-sweep` 4/4, `storage-views` +1 |
| 3 | `magicLinkExpiresIn(ttl)` — the send, the preview, *Send me this* and the chip's sample all say it; `AdminEmailRoutes` reads `magicLink.ttlMinutes` live | `lasts 15 minutes` with the policy at 60 | `bmg-017-magic-link-preview` 4/4 (incl. the real email and *1 minute*) |
| 4 | the box's words follow the path: *Keep the credential in this tab (it is never kept longer)* once a credential is typed (the smaller true fix — `keep` already did that) | the box said *on this browser* with the credential typed | `admin-app/keep-me-signed-in` 3/3 |
| 5 | none needed — **green first time**. The fake learned `virtualHostedOnly` (bucket from the Host header) and SigV4 **verification** when handed the secret, written from AWS's description, not from `sigv4.ts` | — (controls: a path-style request refused; a wrong secret → `SignatureDoesNotMatch`; mutant signing the endpoint host while sending the bucket host → 3 red, restored with `cp`) | `bmg-017-virtual-hosted` 5/5 (connect, save, upload, serve, back up, restore) |

- Specs whose planted strays were stamped *now* (they graded the unsafe instant delete) now plant hour-old,
  `put`-shaped strays: `files-http`, `bmg-015-storage-off-the-disk`. The BMG-015 spec's fake now checks
  signatures too (path-style signing graded: green).
- **Gates:** backend `npm run typecheck` exit 0; contract `tsc --noEmit` exit 0; full backend `npx jest
  --maxWorkers=4` **212 PASS, 1 skipped, 2,512 tests (16 skipped), exit 0, 551 s** (includes P78's uncommitted
  `tpl008-*` specs, green); runtime `npx jest test/adapters` **328/328** exit 0; MCP `toolDisclosure` 18/18
  (the backend group is deferred: resident budget untouched). No route added — tally unchanged.
- **Build** `npm run build` exit 0; `dist/cli.js` and `build/admin/app.js.txt` carry the change.
- **Drive** `drives/bmg017/run.sh ac seed` — locked throwaway backend + the fake (checking signatures) +
  headless Chrome: **14/14, no page errors** (`drives/bmg017/ac-result.json`): the import's dry run names *Row 3:
  owner: required…*, the toast says *1 added, 0 updated, 1 rejected.*, the server holds no filled newcomer; the
  Clean-up toast deletes the hour-old stray and leaves the fresh one *too new to judge*, the chip counts it, the
  archive is still listed; Sign-in → 60 → the Email preview says *expires in 60 minutes*; the box's two sentences.
