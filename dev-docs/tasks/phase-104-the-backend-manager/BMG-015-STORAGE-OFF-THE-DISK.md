# BMG-015 — Storage off the disk: uploads and backups in an S3-compatible bucket, chosen on the page

**Opened 2026-09-25** (Richard, s14: *"we should probably have an S3 connector in there for storage,
otherwise file uploads and backups are going to be choking the VM disk on deployed backends"*).
**Depends on BMG-011 (the Storage and Backups pages).** **Status: 📋 not started.**

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
