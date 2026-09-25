# BMG-015 — Storage off the disk: uploads and backups in an S3-compatible bucket, chosen on the page

**Opened 2026-09-25** (Richard, s14: *"we should probably have an S3 connector in there for storage,
otherwise file uploads and backups are going to be choking the VM disk on deployed backends"*).
**Depends on BMG-011 (the Storage and Backups pages).** **Status: ✅ built and driven (s15, 2026-09-25)** —
AC1–AC6 headless, 19/19 checks (`drives/bmg015/run.sh ac seed`, shots `shots/bmg015-*.png`), the HTTP spec
`tests/bmg-015-storage-off-the-disk.test.ts` 18/18, the page spec `tests/admin-app/where-cards.test.tsx` 10/10.
§6 says what was built and measured; §7 what was left.

## 1. The person sentence

> **Someone running their app's backend on a small VM picks "an S3-compatible bucket" on the
> Storage page, pastes the bucket's details and a key, sees the connection tested, and from
> then on uploads AND backup archives land in the bucket, not on the VM's disk. Nothing they
> have to know about SigV4, path-style addressing, or where a `secrets.json` is.**

## 2. What is there, measured (2026-09-25, working tree)

- **Uploads already have an S3 driver.** `packages/nodegx-backend/src/storage/S3Driver.ts` —
  zero-dependency SigV4 (`sigv4.ts`), path-style by default (MinIO and friends), the same
  hash-bucketed key layout as `LocalDriver`. Chosen once in `FileSubsystem.buildDriver` from
  `files.json`'s `driver: {type:'s3', endpoint, region, bucket, forcePathStyle}` (`storage/config.ts`);
  credentials live in `secrets.json` under the `files` namespace (`setS3Credentials`), never echoed.
  Not implemented (by its own docblock): multipart upload (>5 GB), retries/backoff, bucket
  creation.
- **The wire can already switch it:** `PUT /admin/files/config {driver, s3Credentials}`
  (`server/admin-files.ts:236-250`) and MCP `configure_backend_files` (`driver`,
  `s3AccessKeyId`/`s3SecretAccessKey`). **The Storage page cannot** (BMG-011): `views/files.tsx:111`
  draws one chip — *stored in S3* / *stored on this machine* — and no control sets the driver,
  the endpoint, the bucket or the key. Nothing on the wire tests a connection: no route tries a
  `HEAD`/`PUT` against the bucket before the driver is switched, so a typo in the endpoint is
  found by the next upload (a 500).
- **Backups are local only.** `backup/config.ts:41` `BackupDestination.type: 'local'` — *"Only
  'local' in v1. S3 is a recorded follow-on (needs BAK-006's driver)"*. `BackupManager` writes
  archives to `getDestinationDir()`, lists them by `readdirSync`, applies retention with `rmSync`
  (`BackupManager.ts:401-505`); `GET /admin/backups/archive?file=` serves from that directory and
  restore unpacks from it (BMG-011). The Backups page's *where* card (BMG-011) shows the path.
- **Switching the files driver does not migrate existing blobs** (`docs/runtime/BACKEND-FILES.md`
  §Drivers). The `_Files` rows keep their keys; a blob written locally is not in the bucket.
- The database itself (`data/local.db`) stays on the disk either way — that is what a backup
  archive is for, and the reason backups are the half that fills a VM.

## 3. What to build

1. **Storage page — a *Where files are stored* card** (`views/files.tsx`, above *Settings*):
   two tiles, *This machine* and *An S3-compatible bucket*. The bucket tile opens endpoint,
   region, bucket, *path-style addressing* (a switch, on by default, with the one-line reason),
   access key id and secret (write-only; the page shows *key: configured* / *not configured*
   from a `s3CredentialsConfigured` boolean the route grows). **Test connection** before *Save*:
   a new `POST /admin/files/config/test {driver, s3Credentials?}` that builds a throwaway
   `S3Driver` and does a `HEAD` on the bucket (or a `PUT`+`DELETE` of a probe key when the
   policy allows only that), answering the S3 error sentence verbatim on failure. Saving with a
   failed or untested connection is refused with the sentence, never silently. The card says
   plainly: *files already stored on this machine stay there until you move them*.
2. **Backups to the bucket.** `BackupDestination` grows `{type:'s3', prefix}` reusing the files
   driver's endpoint/bucket/credentials (one bucket, a `backups/` prefix) — no second set of
   credentials to type. `BackupManager`: write the archive locally to a temp file, `put` it under
   the prefix, delete the temp; `listBackups` lists the prefix (the driver needs a `list`
   operation — measure `StorageDriver` in `storage/types.ts` for what exists); retention deletes
   from the bucket; `GET /admin/backups/archive` streams from the bucket; restore downloads to a
   temp file and unpacks as today. The Backups page's *where* card becomes the same two tiles.
3. **The orphan sweep and the *used by* walk stay driver-agnostic** — they already go through
   `StorageDriver`; verify with the S3 driver against a MinIO in the drive (a `minio` binary or
   the `sigv4` spec's fake — measure which the repo has: `tests/` for `S3Driver`).
4. **Docs:** `BACKEND-FILES.md` §Drivers gains the page; `BACKUP-RESTORE.md` gains the
   destination; `SELF-HOSTING.md` says in one paragraph why a VM wants this.

## 4. Acceptance criteria

1. On a fresh backend the Storage page shows *This machine*; choosing the bucket tile, filling
   a MinIO endpoint and pressing **Test connection** answers *connected* (drive: a local MinIO or
   the repo's S3 fake); a wrong endpoint answers the S3 sentence and *Save* is refused.
2. After saving, an upload through `POST /files` lands in the bucket (read back with the
   driver's `stat`) and not under `data/files/blobs`.
3. **Back up now** with the bucket destination writes the archive under the prefix, lists it on
   the page, **Download** streams it, **Restore…** (R4) restores from it.
4. Retention deletes from the bucket; `applyRetention` on a local destination is unchanged (its spec).
5. Credentials never round-trip: `GET /admin/files/config` and `GET /admin/backups/config` carry
   `configured: true`, never the key; the bundle's external-origin gate (BMG-010) is unchanged.
6. Files already stored locally are still served after the switch (the `_Files` row's driver
   kind is what serves it — measure whether the row records the driver; if not, that is sub-step 1's
   first job).
7. Backend `npm test` green, bundle under budget, route tally line moved (`admin: +2`),
   `audit-actions.ts` rows for the test route (`NOT_AUDITED`: a dry run) and the destination change.

## 5. Watch for

- Memory: `an-awaited-callback-style-write-has-a-dead-error-path` — the driver's `put` must
  surface the S3 error, loud.
- A `PUT` of the archive from a temp file: stream it; a 2 GB archive in memory is the VM the
  task is trying to save.
- `forcePathStyle: false` (AWS virtual-hosted) — keep the switch, the drive tests path-style only.
- The BMG-011 restore reconnect (`PersistenceControl`) must wrap the S3 download too: download
  BEFORE `disconnect()`, so a failed download leaves the running database untouched.

## 6. What was built and measured (s15, 2026-09-25)

**The bucket is one thing, typed once.** files.json's `driver` + the `files` secrets are the bucket; the backups
reuse them (`BackupDestination {type:'s3', prefix}` — no second endpoint, no second key). `buildBucketDriver`
(`storage/FileSubsystem.ts`) is the ONE place a bucket driver is built: the subsystem, the CLI's backup manager
(`cli.ts cliBackupManager`) and the backups (`BackupManagerDeps.getBucket`, read live) all come there.

**Storage page** (`views/files.tsx` `WhereCard`): two tiles (`input[name="where"]`), the bucket form
(`#s3-endpoint`, `#s3-region`, `#s3-bucket`, `#s3-path-style`, `#s3-access-key-id`, `#s3-secret` — a password
field), the key as a chip from `s3CredentialsConfigured`, **Test connection** (`#s3-test`) → `#s3-test-result`,
**Save** (`#save-where`) disabled until the draft has tested OK; any edit clears the result. Pure:
`whereDraftFrom` / `whereProblem` / `wherePayload` (blank key fields = keep the stored key).
**Backups page** (`views/backups.tsx` `WhereCard`): two tiles (`input[name="backup-where"]`); the bucket tile is
`disabled` with *Connect a bucket on the Storage page first* until `GET /admin/backups` answers `bucket.connected`;
the folder field moved here from *Keep*; each archive row carries *in the bucket*; `whereWords` is the sentence.

**Server.** `POST /admin/files/config/test {driver, s3Credentials?}` (tally `admin: 98 → 99`; `NOT_AUDITED`, a dry
run; NOT on `readonly.ts` — a read-only admin is refused, the page disables the card anyway) → 200 `{ok, words,
error?}`. **`PUT /admin/files/config` with an `s3` driver PROBES BEFORE IT SAVES** (`admin-files.ts updateConfig`):
400 `BUCKET_NOT_SAVED + <sentence>` and nothing persists (neither driver nor key); new credentials for an already-s3
backend are probed the same way. `GET /admin/files/config` grew `s3CredentialsConfigured`. `S3Driver` grew
`probe()` (HEAD bucket → PUT + DELETE a probe key; the sentence is the endpoint's own `<Code>: <Message>` via
`s3Sentence` — 🔴 a HEAD's refusal carries NO body, so the probe falls through to the PUT for the sentence),
`putObject`, **`putFile` (streamed: hashed in one pass, sent in a second — never in memory)**, `listObjects(prefix)`
(with `<Size>`/`<LastModified>`, every page), `downloadTo`, `hasCredentials`, `bucket`, `urlFor`.
`BackupManager`: `doCreate` assembles in the temp dir and `putFile`s under the prefix (result `archivePath` =
`s3://<bucket>/<key>`); **`listBackups`/`applyRetention` are async now** (`where: 'local'|'s3'`, `key`);
`fetchArchive(item)` downloads to a temp file (`archiveStream` for the download route); the pre-restore safety
copy follows the destination when restoring the backend's OWN data dir (a foreign target keeps its local
`backups/`). `AdminBackupRoutes.restore` fetches BEFORE `persistence.pause()` — a failed download is 502 with the
sentence and the running database is untouched (spec + `fake.failNextGets`). `GET /admin/backups` answers
`bucket: {connected, name}` (+ `listingError` when the bucket cannot be listed — a sentence, not a dead page);
a `PUT` asking for `s3` while none is connected is 400 `NO_BUCKET_CONNECTED`. `BackupConfigStore.update` reads
`{path}` with no type as local (the MCP tool's shape).

**AC6's first job was real: the serve path read the CURRENT driver.** `_Files` rows always recorded `driver`, but
`FileRoutes.serve` / the thumbnail source / `deleteStored` all used `getDriver()` — after a switch, every file
uploaded before it would have been a 500. Now the local store is ALWAYS alive beside the bucket and
`FileSubsystem.driverFor(record)` serves by the row (`stores()` for the sweep; `getDriver()` = where the NEXT
upload goes). Switching back to local with `s3` rows makes those files a loud sentence (*stored in a bucket this
backend is no longer connected to*), not a 404; reconnecting serves them again (the stored key is kept). The
orphan sweep (`runOrphanSweep(stores[])`) judges each row against ITS store (`kind:key`); a row whose store is not
connected is an orphan row.

**The S3 fake** (`tests/helpers/s3-fake.js`, plain CommonJS, ONE file for the jest spec and the drive process):
path-style PUT/GET/HEAD/DELETE, HEAD bucket, ListObjectsV2 with `prefix` + `continuation-token` (page size 2, so
any list of three exercises pagination), a SigV4 key-id check answering 403 `InvalidAccessKeyId` in S3's XML, 404
`NoSuchBucket`, `failNextGets(n)`. The repo had NO fake before — `storage-driver.test.ts`'s S3 half is env-gated to
a real MinIO (7 skips) and stays so; no `minio` binary on this machine.

🔴 **A refusal left unread on a keep-alive socket corrupted the NEXT request.** The first `streamGet` destroyed its
output on a ≥400 status WITHOUT consuming the response body; the spec's restore arm then read back a database
missing its newest row (4 failed → 18/18 once the body is read before the stream is destroyed; the drive agrees).
A streamed HTTP client must drain a refusal.

**Measured:** `S3Driver` keys are encoded with `encodeURIComponent` per segment BEFORE `sigv4.ts` (whose doc says it
encodes) — untouched, works against the fake; an archive name has no special characters. The backend's default
`http` agent keeps sockets alive. `parseStampFromName` reads a `pre-restore-…` name too, so retention counts the
safety copy (keepLast 1 keeps the newest, whichever prefix). The task's AC7 said `admin: +2`; ONE route was needed
(the destination change rides `PUT /admin/backups/config`, already audited `backup.config.update`) — 98 → 99,
counted. The task named `BACKUP-RESTORE.md` under `docs/runtime/`; it lives at
`packages/nodegx-backend/docs/BACKUP-RESTORE.md` (§Archives in a bucket added), with `BACKEND-FILES.md` §Storage
drivers, `SELF-HOSTING.md` §Backups (the VM paragraph) and `BACKEND-ADMIN-DASHBOARD.md`'s two page rows.

## 7. Left for a later task

- **Moving blobs between stores** is still a manual procedure (§2, docs) — a *Move files to the bucket* button
  with progress is the obvious next ask once someone has a real backend to move.
- **MCP `configure_backend_backups`** still types `destination: {path}` only; the wire accepts `{type:'s3'}` —
  the tool's schema and description want the tile's words.
- **`forcePathStyle: false`** (AWS virtual-hosted) is a switch the drive never flips: the fake is path-style only.
- **Multipart upload** (>5 GB) and retries stay out of the driver (its own docblock); a backup archive that large
  is a database that large.
- A bucket that lists but cannot be reached at restore time is a 502 per attempt; nothing retries.
