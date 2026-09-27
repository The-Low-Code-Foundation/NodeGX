# NodeGX Backend — Backups, Export/Import & Promotion (BAK-007)

A production database you cannot restore is a countdown, not a product. This is
the operator runbook for making a NodeGX backend survivable and movable.

## What a backup contains

One backup is **one file**: `<name>.ngxbackup.tar.gz` — a gzipped tar whose
first entry is a hashed `manifest.json`, followed by:

- `db/local.db` — a **consistent** snapshot of the SQLite database
- `files/…` — the uploaded files directory
- `workflows/…` — the cloud-function workflows
- `config/…` — the diffable backend config: `security.json`, `triggers.json`,
  `email.json`, `config-params.json`, `backups.json`, and a `schema.json` record
- `config/secrets.json` — **only** if you opt in with `--include-secrets`

The manifest records the engine, the snapshot mechanism, timestamps, and a
SHA-256 of every entry, so a restore verifies integrity before touching anything.

### The consistency window

The DB snapshot is taken first, from a fresh read connection, capturing all
**committed** data (readers apply committed WAL frames) — it can never capture a
torn/uncommitted record. Files and config are captured immediately after. If a
file is uploaded in the sub-second between the DB snapshot and the file copy, the
archive may reference a row without its file (or vice versa). For a hard
guarantee, back up during a quiet window or briefly pause writes.

### Snapshot mechanism (engine note)

The engine is `node:sqlite` (WF-004). Two mechanisms were verified at runtime:

- **Online backup API** — `require('node:sqlite').backup(db, dest)`. Present on
  Node ≥ ~22.16 / 23.8; **preferred** when available (tolerates concurrent
  writers). Note it is a module-level function, **not** a `db.backup()` method.
- **`VACUUM INTO '<path>'`** — the documented fallback, used automatically when
  the online API is absent (it can be, since the `engines.node >= 22.13` floor
  predates it). Also consistent and WAL-correct.

The chosen mechanism is recorded in each archive's manifest.

## Secrets and off-box guidance

`secrets.json` (the admin credential, webhook secrets, the SMTP password) is
**machine-local** and is **excluded by default** — a backup is safe to move
around and to commit to object storage. This means a restored backend re-mints
its admin credential and loses webhook/SMTP secrets unless you either:

- back up with `--include-secrets` (then treat the archive as a secret), or
- copy `secrets.json` out-of-band and drop it into the restored data dir.

**Off-box:** the archive is a single file — copy it to another host, an external
disk, or an S3-compatible bucket (`aws s3 cp`, `rclone`) — or let the backend
write it there itself: the destination can be the files' bucket (*Archives in a
bucket*, below). Encrypt the destination (bucket-level SSE, or `gpg` the file);
archives are not encrypted by NodeGX.

## Backup — CLI, admin, scheduled

```bash
# One-off backup (rotates old archives per retention)
nodegx-backend backup --data-dir ~/.noodl/backends/<id>
nodegx-backend backup --data-dir <dir> --dest /mnt/backups --include-secrets
```

Admin API (admin-credentialed): `POST /admin/backups`, `GET /admin/backups`
(archives + policy + status), `PUT /admin/backups/config`.

**Scheduled** backups ride WF-005's scheduler (one scheduler, two consumers).
Configure via the policy — cron, retention, destination:

```jsonc
// <dataDir>/backups.json
{
  "schedule": { "enabled": true, "cron": "@daily", "missedFirePolicy": "skip" },
  "retention": { "keepLast": 7, "keepDaily": 14, "keepWeekly": 8 },
  "destination": { "type": "local", "path": "/mnt/backups" },
  "includeSecrets": false
}
```

Retention keeps the newest `keepLast`, plus the newest of each of the last
`keepDaily` days and `keepWeekly` ISO weeks. `keepLast: 0` with all knobs `0`
keeps everything.

### Archives in a bucket

`"destination": { "type": "s3", "prefix": "backups/" }` sends every archive —
scheduled, *Back up now*, the CLI's `backup`, and the pre-restore safety copy —
to the **same S3-compatible bucket the files driver is connected to**
(`BACKEND-FILES.md` §Storage drivers: files.json's `driver`, the key in the
`files` namespace of `secrets.json`), under `prefix`. There is deliberately no
second endpoint or credential: the bucket is set up once, on the manager's
Storage page, and the Backups page's *Where archives go* offers it as a tile
once one is connected (`GET /admin/backups` answers `bucket: {connected, name}`;
a `PUT` asking for the bucket while none is connected is 400 by sentence).

How it works: the archive is assembled and written to a temp file exactly as
before, then streamed into the bucket (hashed in one pass for the signature,
sent in a second — a 2 GB archive never sits in memory) and the temp file
removed. `GET /admin/backups` lists the prefix (each row `where: 's3'`, `path`
`s3://<bucket>/<key>`); retention deletes from the bucket; **Download** pipes
the object; **Restore…** downloads the archive to a temp file *before* the
running database is paused (a failed download is a 502 that leaves the backend
serving exactly what it was) and unpacks it as a local restore does. A backend
whose files are local cannot have `s3` backups (the manager refuses by
sentence, loudly, in the execution record) — connect the bucket first.

The database file itself (`data/local.db`) stays on the disk either way; that
is what the archive is for, and why backups are the half that fills a small
VM.

### Failures are loud

A failed backup (unwritable destination, snapshot error) is written as a failed
execution record **and** recorded in `backups.json` status (`lastResult.ok:
false`) — never a quietly stale "last backup" timestamp. Watch
`GET /admin/backups` `.config.status`.

## Restore runbook

Restore is a **service-stopped** operation (it swaps files under the data dir).

```bash
# 1. Stop the backend service.
# 2. Restore (verifies manifest hashes, takes a pre-restore safety snapshot,
#    then swaps db + files + workflows + config; integrity-checks the result).
nodegx-backend restore /mnt/backups/backup-...ngxbackup.tar.gz --data-dir <dir>
# 3. If the archive excluded secrets, restore secrets.json out-of-band.
# 4. Start the service.
```

Restore refuses an archive whose engine does not match (no cross-engine restore
is claimed) or whose hashes do not verify. The pre-restore safety snapshot is
written to `<dataDir>/backups/pre-restore-…` so a bad restore is itself
recoverable. `POST /admin/backups/restore` (the manager's **Restore…** button,
BMG-011) takes a LISTED archive by file name, disconnects the running adapter,
swaps the files, reconnects and re-ensures the system tables before it answers —
requests that arrive during the swap fail rather than read torn state, and the
page blocks its own controls for the duration. It then re-reads the settings the
archive put back — `security.json`, `triggers.json`, `email.json`, `backups.json`
(`config-params.json` is read per request anyway) — so the running backend
enforces the restored permissions and fires the restored schedules at once, and
the next edit on those pages starts from them. A restored settings file that
does not validate is refused: the settings from before the restore stay in
force and are written back over it (so the next start is not refused either),
and the answer (`settings: {reloaded, refused}`) and the page name it. The CLI (service stopped) remains
the path for a backend you cannot reach in a browser.

## Laptop → VPS (the blessed move)

The whole-backend archive **is** the migration path:

```bash
# On the laptop:
nodegx-backend backup --data-dir <local-dir> --dest ./out --include-secrets
scp ./out/backup-*.ngxbackup.tar.gz vps:/tmp/

# On the VPS (service not yet started, or stopped):
nodegx-backend restore /tmp/backup-*.ngxbackup.tar.gz --data-dir <vps-dir>
nodegx-backend serve --data-dir <vps-dir> --host 0.0.0.0 --token <t>
```

## Export / import per collection

Lossless **JSON** (types, ACLs, pointers, schema) or flat **CSV** (spreadsheet
on-ramp; pointers as ids, objects as JSON strings — lossy, no schema travels).

```bash
nodegx-backend export Users --data-dir <dir> --format json --out users.json
nodegx-backend import Users users.json --data-dir <dir>            # upsert
nodegx-backend import Users big.csv --data-dir <dir> --format csv --dry-run
```

Import is **create-or-upsert by objectId** (existing rows update, new rows insert
preserving objectId — re-importing the same file is idempotent). It is
transactional per collection (all valid rows apply or none — never a silent
half-import), coerces values to the target schema, and returns a **rejects
report** for rows that fail coercion. `--dry-run` previews created/updated/rejected
counts without writing. Admin API: `GET /admin/export/:collection`,
`POST /admin/import/:collection`.

## Promotion (schema, not data) — the second deploy

First deploy is copy-everything. The second deploy is the feature: dev changed
the schema, prod has live data — promote the **schema** (and config), leave the
**data** alone.

```bash
# Preview (source/target may be a data dir OR a backup archive):
nodegx-backend schema diff <dev-dir-or-archive> <prod-dir-or-archive>

# Apply onto prod (additive automatically; destructive needs the flag + backup):
nodegx-backend schema apply <dev-dir-or-archive> --data-dir <prod-dir>
nodegx-backend schema apply <dev-dir-or-archive> --data-dir <prod-dir> --allow-destructive
```

- **Additive** (new table, new column, new/changed permission·trigger·template)
  applies automatically. Data is never touched.
- **Destructive** (dropped table/column, type change) is **refused** without
  `--allow-destructive`, and even then a fresh **pre-apply backup is forced**
  first. Column drops and type changes are surfaced for manual handling (a real
  type change is a table rebuild).

Admin API: `POST /admin/schema/diff`, `POST /admin/schema/apply` (target is the
running backend; `source` is a schema snapshot the caller supplies — the editor's
deploy flow / WF-003 supplies the dev snapshot). MCP: `diff_backend_schema`,
`apply_backend_schema`.

## MCP (agent) surface

Read: `list_backend_backups`, `export_backend_collection`, `diff_backend_schema`.
Write: `run_backend_backup`, `set_backend_backup_policy`, `import_backend_collection`,
`apply_backend_schema`, `restore_backend`.

## Out of scope (v1)

Point-in-time recovery / WAL shipping / incremental backups; two-way data sync
between live backends; cross-engine restore; encrypted archives (encrypt the
destination). All recorded as possible follow-ons.
