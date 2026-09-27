/**
 * The data plane — BRG-004 §3.1 phases 2, 3 and 5: schema, data, cutover.
 *
 * *"Someone with a live app and real users runs one command, watches it check
 * its own work, and their data is in Postgres."* `survey.ts` is the part that
 * answers before anything is attempted; `plan.ts` says what will be created;
 * this is the part that moves the rows, and `verify.ts` is the part that
 * refuses to call it done on its own say-so.
 *
 * ## Four decisions, each with the measurement behind it
 *
 * 1. **The copy reads a snapshot, never the live file.** `snapshotDatabase()`
 *    (BAK-007) takes it through the online backup API from a fresh read
 *    connection, so a writer in another process cannot tear a record out from
 *    under the copy — and AC7 (*the source file is unchanged*) is held by never
 *    opening the source for writing at all.
 *
 * 2. 🔴 **Rows are written verbatim, NOT through `upsertBatch`.** BRG-005's
 *    handoff expected the migrator to reuse `PostgresAdapter.upsertBatch`, and
 *    that is wrong in a way worth writing down: `upsertBatch`'s *update* path
 *    goes through `QueryBuilder.buildUpdate`, which stamps
 *    `updatedAt = new Date()` and deletes `createdAt` — correct for a write
 *    from the app, and a silent falsification for a migration. It never shows
 *    on a clean run (every row takes the INSERT path, which keeps both
 *    columns), and it shows on the **resume** in AC6, where the overlapping
 *    batch is re-applied as an update. So the writer here is
 *    `INSERT … ON CONFLICT (pk) DO UPDATE SET` over the source's own values:
 *    idempotent, and byte-identical whether a row is copied once or twice.
 *
 * 3. **Every batch is one transaction, and the checkpoint is written after it
 *    commits.** A crash therefore loses at most one batch, and the resume
 *    re-applies it onto rows that are already correct (decision 2) rather than
 *    onto a half-written one.
 *
 * 4. 🔴 **A table with no primary key is refused by name.** Without one there is
 *    no `ON CONFLICT` target, so a resumed copy would either duplicate its rows
 *    or need a `DELETE` that a resume cannot make safe. Refusing is BRG-003
 *    §3.4's answer and this phase's rule 4; a plausible half-copy is not.
 *
 * @module nodegx-backend/migrate/move
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream/promises';

import { snapshotDatabase } from '../backup/snapshot';
import { coerceForPostgres, openReadOnly, planFromDb, type MigrationPlan, type PlanDb, type PlanTable } from './plan';
import { redactTarget } from './survey';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('@noodl/runtime/src/api/adapters/postgres');

interface PgPoolLike {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  run(sql: string, params?: readonly unknown[]): Promise<number>;
  transaction<T>(fn: (tx: { run(sql: string, params?: readonly unknown[]): Promise<number> }) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

const { PgConnectionPool, META_DDL } = postgres as {
  PgConnectionPool: new (options: { url: string; max?: number; label?: string }) => PgPoolLike;
  /**
   * The two meta tables, read off `PgSchemaManager` rather than re-typed here:
   * a migrator that writes `_Schema` in a shape the adapter does not expect
   * produces a database the adapter cannot open, and a second copy of the DDL
   * is exactly how the two stop agreeing six months later.
   */
  META_DDL: string;
};

/** How many rows go in one INSERT, and therefore in one transaction. */
export const DEFAULT_BATCH_SIZE = 500;

/**
 * PostgreSQL's hard limit is 65,535 bind parameters per statement. A wide
 * table with a large batch would hit it as a database error halfway through a
 * migration; the batch is narrowed to fit instead, before anything is sent.
 */
const MAX_PARAMS_PER_STATEMENT = 30000;

export interface MigrateProgress {
  phase: 'snapshot' | 'schema' | 'data' | 'cutover';
  table?: string;
  copied?: number;
  rows?: number;
  message?: string;
}

/** What is on disk between a crash and a resume. */
export interface MigrationCheckpoint {
  version: 1;
  /** Redacted — a checkpoint file is as readable as a log. */
  target: string;
  /** Which target this checkpoint belongs to; a resume into a different database is refused. */
  targetFingerprint: string;
  /** The snapshot the copy is reading; a resume must continue from the same one. */
  snapshotPath: string;
  snapshotSha256: string;
  startedAt: string;
  schemaDone: boolean;
  tables: Record<string, { rows: number; copied: number; lastRowid: number; done: boolean }>;
}

export interface MigrateOptions {
  dataDir: string;
  target: string;
  batchSize?: number;
  /** Default `<dataDir>/migration.checkpoint.json`. Never inside `data/`. */
  checkpointPath?: string;
  /** Continue a run that left a checkpoint, using its snapshot. Refuses if there is none. */
  resume?: boolean;
  onProgress?: (p: MigrateProgress) => void;
  /**
   * Called after each batch **commits and the checkpoint is written**. The
   * progress seam, and the one an interruption test throws from: throwing here
   * stops the run in exactly the state a killed process would leave.
   */
  onBatch?: (state: { table: string; copied: number; rows: number }) => void;
}

export interface MigrateResult {
  plan: MigrationPlan;
  target: string;
  snapshotPath: string;
  snapshotSha256: string;
  /** sha256 of the SOURCE database file, before and after — AC7. */
  sourceSha256Before: string;
  sourceSha256After: string;
  tables: Array<{ name: string; rows: number; copied: number; resumedFrom: number }>;
  searchIndexes: Array<{ table: string; fields: string[]; tokenizer: string }>;
  elapsedMs: number;
  batches: number;
  checkpointPath: string;
}

/**
 * sha256 of a file, **streamed**.
 *
 * 🔴 This was `createHash(…).update(fs.readFileSync(file))` until AC9's 5 GB
 * run, and that threw `ERR_FS_FILE_TOO_LARGE` — Node's `readFileSync` refuses
 * anything over 2 GiB. It is the FIRST thing `migrateToPostgres` does, so the
 * effect was that `migrate` could not run at all on a database bigger than
 * 2 GiB: exactly the databases somebody migrates. Invisible at every size a
 * spec would pick, which is the entire argument for AC9 being a criterion.
 */
export async function sha256File(file: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

/** A stable, non-reversible name for a target, so a resume cannot cross databases. */
export function targetFingerprint(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 16);
}

export function defaultCheckpointPath(dataDir: string): string {
  return path.join(dataDir, 'migration.checkpoint.json');
}

/** Atomic: a checkpoint half-written by a crash is the one thing a resume cannot survive. */
export function writeCheckpoint(file: string, checkpoint: MigrationCheckpoint): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(checkpoint, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export function readCheckpoint(file: string): MigrationCheckpoint | null {
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as MigrationCheckpoint;
  if (parsed.version !== 1) throw new Error(`${file} is a version ${parsed.version} checkpoint; this build writes version 1.`);
  return parsed;
}

/** `"a", "b"` — one identifier list, quoted the way every generator here quotes. */
function quoteIdents(names: string[]): string {
  return names.map((n) => `"${n.replace(/"/g, '""')}"`).join(', ');
}

/**
 * The INSERT for one batch of rows of one table.
 *
 * `ON CONFLICT DO UPDATE` over every non-key column is what makes a resumed
 * batch idempotent — see the module note, decision 2. A table whose only
 * columns are its key (a junction) has nothing to update, and `DO NOTHING` is
 * then the same statement with the same effect.
 */
export function buildBatchInsert(
  table: PlanTable,
  rows: Array<Record<string, unknown>>
): { sql: string; params: unknown[] } {
  const columns = table.columns.map((c) => c.name);
  const params: unknown[] = [];
  const tuples: string[] = [];

  for (const row of rows) {
    const marks: string[] = [];
    for (const col of table.columns) {
      marks.push('?');
      params.push(coerceForPostgres(row[col.name], col.pgType));
    }
    tuples.push(`(${marks.join(', ')})`);
  }

  const updatable = columns.filter((c) => !table.primaryKey.includes(c));
  const conflict =
    updatable.length === 0
      ? `ON CONFLICT (${quoteIdents(table.primaryKey)}) DO NOTHING`
      : `ON CONFLICT (${quoteIdents(table.primaryKey)}) DO UPDATE SET ` +
        updatable.map((c) => `"${c.replace(/"/g, '""')}" = EXCLUDED."${c.replace(/"/g, '""')}"`).join(', ');

  return {
    sql:
      `INSERT INTO "${table.name.replace(/"/g, '""')}" (${quoteIdents(columns)}) VALUES ` +
      `${tuples.join(', ')} ${conflict}`,
    params
  };
}

/** How many rows fit in one statement without crossing PostgreSQL's parameter limit. */
export function rowsPerStatement(columnCount: number, batchSize: number): number {
  if (columnCount <= 0) return batchSize;
  return Math.max(1, Math.min(batchSize, Math.floor(MAX_PARAMS_PER_STATEMENT / columnCount)));
}

/**
 * Move a stopped backend's SQLite database into PostgreSQL.
 *
 * The source is opened read-only and snapshotted; the target is created from
 * the plan and filled batch by batch, checkpointing after each commit.
 * Verification is deliberately a separate call (`verifyMigration`) so that a
 * `--verify-only` run and the run that copies grade with the same code.
 */
export async function migrateToPostgres(options: MigrateOptions): Promise<MigrateResult> {
  const started = Date.now();
  const dataDir = options.dataDir;
  const dbPath = path.join(dataDir, 'data', 'local.db');
  if (!fs.existsSync(dbPath)) throw new Error(`No database at ${dbPath} — is this a backend data directory?`);

  const checkpointPath = options.checkpointPath || defaultCheckpointPath(dataDir);
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const fingerprint = targetFingerprint(options.target);
  const redacted = redactTarget(options.target);
  const progress = options.onProgress || (() => undefined);

  const sourceSha256Before = await sha256File(dbPath);

  // ------------------------------------------------------------ the target
  // 🔴 Reached FIRST, before a snapshot exists. A snapshot is a whole second
  // copy of the database — on AC9's fixture, eight gigabytes — and taking it
  // before finding out whether the destination answers means an unreachable
  // host costs a full copy and leaves it behind.
  const pool: PgPoolLike = new PgConnectionPool({ url: options.target, max: 4, label: 'migrate' });
  try {
    return await runMigration(options, pool, { dbPath, checkpointPath, batchSize, fingerprint, redacted, progress, sourceSha256Before, started });
  } finally {
    // 🔴 EVERY exit ends the pool, refusals included. A `migrate` that refused
    // after connecting — a checkpoint for another target, a keyless table —
    // used to leave an open connection behind: the CLI would not exit, and the
    // database could not be dropped. Found by four test databases that outlived
    // their suite's teardown.
    await pool.end().catch(() => undefined);
  }
}

interface MigrationContext {
  dbPath: string;
  checkpointPath: string;
  batchSize: number;
  fingerprint: string;
  redacted: string;
  progress: (p: MigrateProgress) => void;
  sourceSha256Before: string;
  started: number;
}

/** The phases themselves, with the pool's lifetime owned by the caller. */
async function runMigration(
  options: MigrateOptions,
  pool: PgPoolLike,
  ctx: MigrationContext
): Promise<MigrateResult> {
  const { dbPath, checkpointPath, batchSize, fingerprint, redacted, progress, sourceSha256Before, started } = ctx;
  await pool.query('SELECT 1');

  // ---------------------------------------------------------------- snapshot
  let checkpoint = options.resume ? readCheckpoint(checkpointPath) : null;
  if (options.resume && !checkpoint) {
    throw new Error(`--resume was asked for and there is no checkpoint at ${checkpointPath}.`);
  }
  if (checkpoint && checkpoint.targetFingerprint !== fingerprint) {
    throw new Error(
      `The checkpoint at ${checkpointPath} belongs to a migration into ${checkpoint.target}, not ${redacted}. ` +
        'Resuming it into a different database would mix two migrations; delete it or name the original target.'
    );
  }

  let snapshotPath: string;
  let snapshotSha256: string;
  if (checkpoint) {
    snapshotPath = checkpoint.snapshotPath;
    if (!fs.existsSync(snapshotPath)) {
      throw new Error(
        `The checkpoint names a snapshot at ${snapshotPath} and it is not there. A resume must read the same ` +
          'snapshot the interrupted run did — a second snapshot of a live database is a different set of rows.'
      );
    }
    snapshotSha256 = await sha256File(snapshotPath);
    // 🔴 Only while there is still copying to do. Verification OPENS the
    // snapshot as a data directory, and `LocalSQLAdapter.connect()` sets
    // `journal_mode = WAL`, which is written into the database header — so a
    // snapshot produced by the `VACUUM INTO` fallback (journal mode `delete`)
    // has different bytes after it has been verified, through nobody's fault.
    // Checking the hash then would refuse a resume for a reason that is not
    // about the rows. A finished copy has nothing to resume anyway.
    const copyComplete = Object.values(checkpoint.tables).every((t) => t.done);
    if (!copyComplete && snapshotSha256 !== checkpoint.snapshotSha256) {
      throw new Error(
        `The snapshot at ${snapshotPath} has changed since the checkpoint was written (${checkpoint.snapshotSha256.slice(0, 12)} → ` +
          `${snapshotSha256.slice(0, 12)}). Refusing to resume a copy whose source moved.`
      );
    }
    progress({ phase: 'snapshot', message: `resuming from ${snapshotPath}` });
  } else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-migrate-'));
    // The snapshot lives under `<dir>/data/local.db` so that `createAdapter`
    // can open it as a data directory during verification — the facade on the
    // source side reads the same bytes the copy did, not the live file.
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
    snapshotPath = path.join(dir, 'data', 'local.db');
    const snap = await snapshotDatabase(dbPath, snapshotPath);
    snapshotSha256 = await sha256File(snapshotPath);
    progress({ phase: 'snapshot', message: `${snap.mechanism}, ${snap.bytes} bytes` });
  }

  const snapshotDb: PlanDb = openReadOnly(snapshotPath);
  const freshSnapshot = !options.resume;
  let batches = 0;

  try {
    const plan = planFromDb(snapshotDb, dbPath);

    // 🔴 Refuse before a single row moves, by name. Decision 4.
    const keyless = plan.tables.filter((t) => t.primaryKey.length === 0 && t.rows > 0);
    if (keyless.length > 0) {
      throw new Error(
        `These tables have no primary key, so a copy of them cannot be made idempotent and an interrupted ` +
          `migration could not resume without duplicating rows: ${keyless.map((t) => `"${t.name}"`).join(', ')}. ` +
          'Refusing rather than copying rows this migration cannot promise anything about.'
      );
    }

    if (!checkpoint) {
      checkpoint = {
        version: 1,
        target: redacted,
        targetFingerprint: fingerprint,
        snapshotPath,
        snapshotSha256,
        startedAt: new Date().toISOString(),
        schemaDone: false,
        tables: {}
      };
      for (const t of plan.tables) {
        checkpoint.tables[t.name] = { rows: t.rows, copied: 0, lastRowid: 0, done: t.rows === 0 };
      }
      writeCheckpoint(checkpointPath, checkpoint);
    }

    // ------------------------------------------------------------ schema
    if (!checkpoint.schemaDone) {
      // `_Schema` and `_SearchIndex` are created by the schema manager itself,
      // exactly as a first adapter boot would create them, and the rows are
      // then copied over the top — the source's own declarations win.
      await pool.run(META_DDL);
      for (const table of plan.tables) {
        if (table.ddl.length === 0) continue;
        progress({ phase: 'schema', table: table.name });
        await pool.run(table.ddl.join('\n'));
      }
      checkpoint.schemaDone = true;
      writeCheckpoint(checkpointPath, checkpoint);
    }

    // -------------------------------------------------------------- data
    const results: MigrateResult['tables'] = [];
    for (const table of plan.tables) {
      const state = checkpoint.tables[table.name] || { rows: table.rows, copied: 0, lastRowid: 0, done: false };
      checkpoint.tables[table.name] = state;
      const resumedFrom = state.copied;

      if (state.done) {
        results.push({ name: table.name, rows: table.rows, copied: state.copied, resumedFrom });
        continue;
      }

      const perStatement = rowsPerStatement(table.columns.length, batchSize);
      const select = snapshotDb.prepare(
        `SELECT rowid AS __rowid, * FROM "${table.name.replace(/"/g, '""')}" WHERE rowid > ? ORDER BY rowid LIMIT ${perStatement}`
      );

      for (;;) {
        const rows = select.all(state.lastRowid) as Array<Record<string, unknown>>;
        if (rows.length === 0) break;

        const lastRowid = Number(rows[rows.length - 1].__rowid);
        for (const r of rows) delete r.__rowid;

        const { sql, params } = buildBatchInsert(table, rows);
        await pool.transaction(async (tx) => {
          await tx.run(sql, params);
        });
        batches += 1;

        // After the commit, never before: a checkpoint ahead of the data is
        // the one failure a resume cannot detect.
        state.copied += rows.length;
        state.lastRowid = lastRowid;
        writeCheckpoint(checkpointPath, checkpoint);
        progress({ phase: 'data', table: table.name, copied: state.copied, rows: table.rows });
        if (options.onBatch) options.onBatch({ table: table.name, copied: state.copied, rows: table.rows });
      }

      state.done = true;
      writeCheckpoint(checkpointPath, checkpoint);
      results.push({ name: table.name, rows: table.rows, copied: state.copied, resumedFrom });
    }

    // --------------------------------------------------- search indexes
    // An index is not data (plan.ts finding 2): the field list carries, the
    // index itself is rebuilt from the rows that just arrived.
    for (const idx of plan.searchIndexes) {
      await pool.run(
        'INSERT INTO "_SearchIndex" ("name", "fields", "tokenizer", "updatedAt") VALUES (?, ?, ?, NOW()) ' +
          'ON CONFLICT ("name") DO UPDATE SET "fields" = EXCLUDED."fields", "tokenizer" = EXCLUDED."tokenizer", "updatedAt" = NOW()',
        [idx.table, JSON.stringify(idx.fields), idx.tokenizer]
      );
    }

    const sourceSha256After = await sha256File(dbPath);
    if (sourceSha256After !== sourceSha256Before) {
      // AC7 is a promise, so it is checked rather than asserted in prose. The
      // migration has already written the target at this point; saying so is
      // the honest answer, not pretending it did not happen.
      throw new Error(
        `The source database at ${dbPath} CHANGED during the migration ` +
          `(${sourceSha256Before.slice(0, 12)} → ${sourceSha256After.slice(0, 12)}). ` +
          'Something else is writing to it; the copy in PostgreSQL is of a snapshot and may be behind it.'
      );
    }

    return {
      plan,
      target: redacted,
      snapshotPath,
      snapshotSha256,
      sourceSha256Before,
      sourceSha256After,
      tables: results,
      searchIndexes: plan.searchIndexes.map((s) => ({ table: s.table, fields: s.fields, tokenizer: s.tokenizer })),
      elapsedMs: Date.now() - started,
      batches,
      checkpointPath
    };
  } catch (e) {
    // A snapshot only earns its disk while a checkpoint can resume from it.
    // Refusals that happen before one is written (a keyless table, a schema
    // failure) would otherwise leave a whole copy of the database in the temp
    // directory, which is how a migration fills a disk a week later.
    if (freshSnapshot && !fs.existsSync(checkpointPath)) {
      fs.rmSync(path.dirname(path.dirname(snapshotPath)), { recursive: true, force: true });
    }
    throw e;
  } finally {
    const closable = snapshotDb as unknown as { close?: () => void };
    if (typeof closable.close === 'function') closable.close();
  }
}

/** What to tell a person once the rows are across — §3.3, reversibility. */
export function cutoverAdvice(target: string, dbPath: string): string {
  return [
    'Cutover:',
    `  NODEGX_STORAGE_URL=${redactTarget(target)} nodegx-backend serve --data-dir <dir>`,
    '  /health reports engine "postgres" and the pool once it is up.',
    '',
    'Going back:',
    `  Unset NODEGX_STORAGE_URL and start again. The SQLite database at`,
    `  ${dbPath} was opened read-only and is byte-identical to before the migration,`,
    '  so it is still the app it was. Nothing about this move is one-way.'
  ].join('\n');
}
