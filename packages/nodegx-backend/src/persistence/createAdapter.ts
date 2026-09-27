/**
 * Persistence wiring — the one real, verified piece of the front half.
 *
 * The adapter stack (LocalSQLAdapter / QueryBuilder / SchemaManager) stays in
 * `@noodl/runtime` and is consumed as a dependency, per the WF-004 scope
 * ("adapters stay in noodl-runtime and are consumed as a dependency; record if
 * this proves wrong"). This module is the seam where the standalone service
 * opens its database.
 *
 * The engine decision (WF-004): `node:sqlite`. It is resolved by
 * `@noodl/runtime`'s `engine.js` (node:sqlite preferred, better-sqlite3 as a
 * legacy fallback). If NO engine is available and the caller has not opted in to
 * ephemeral mode, `connect()` throws a LocalBackendPersistenceError — the
 * service refuses to start rather than silently losing data (RUN-004).
 *
 * @module nodegx-backend/persistence/createAdapter
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';

// The adapter stack is plain CommonJS JS without type declarations; require it
// through the package's public subpath. This is the declared dependency edge —
// no relative reach into another package's internals.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const localSql = require('@noodl/runtime/src/api/adapters/local-sql');

const { LocalSQLAdapter, LocalBackendPersistenceError } = localSql;

export { LocalBackendPersistenceError };

/**
 * BRG-005: the PostgreSQL adapter, required lazily and only when a storage URL
 * is present, so a SQLite-only start never loads `pg`. Same declared edge as
 * `local-sql` above — the package's public subpath, no relative reach.
 */
function loadPostgres(): {
  PostgresAdapter: new (url: string, options: Record<string, unknown>) => IStorageAdapter & {
    saturation(): PoolSaturation | null;
    target: { redacted: string };
  };
  parseStorageUrl(raw: string): { redacted: string };
  POSTGRES_ENGINE_NAME: string;
} {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@noodl/runtime/src/api/adapters/postgres');
}

/**
 * BRG-008: what engine this data dir WOULD use, and where, WITHOUT connecting.
 *
 * `createAdapter` answers the same question by connecting, which is the right
 * answer for anything that then uses the adapter. The backup CLI needs it
 * before it touches anything and must be able to refuse while the database is
 * unreachable — a backup asked of an engine this process cannot copy is wrong
 * whether or not that engine is up.
 *
 * `engine: null` means "the built-in SQLite backend", which is exactly the
 * "caller did not say" the backup guard treats as proceed: the CLI cannot know
 * whether `node:sqlite` or `better-sqlite3` will load without loading one, and
 * for this question it does not matter — both are files.
 */
export function describeConfiguredStorage(explicit?: string | null): { engine: string | null; target: string | null } {
  const storageUrl = resolveStorageUrl(explicit);
  if (!storageUrl) return { engine: null, target: null };
  const pg = loadPostgres();
  // Throws StorageUrlError by name on an unsupported scheme (R5) — the same
  // refusal `createAdapter` would give, at the same seam, without a socket.
  const parsed = pg.parseStorageUrl(storageUrl);
  return { engine: pg.POSTGRES_ENGINE_NAME, target: parsed.redacted };
}

/** What `/health` shows for a pooled engine (BRG-005 AC4). Null on SQLite, which has no pool. */
export interface PoolSaturation {
  label: string;
  total: number;
  idle: number;
  waiting: number;
  max: number;
  saturation: number;
  pendingSchemaStatements: number;
}

/**
 * The storage URL this process should open, if any. Read here — at the one
 * place a database is opened — rather than in `resolveOptions`, so every
 * caller of `createAdapter` (serve, doctor, backup, the CLI audit log) agrees
 * about which database it is talking to. An explicit `storageUrl` option wins;
 * `NODEGX_STORAGE_URL` is the deploy-time spelling. Absent means SQLite.
 */
export function resolveStorageUrl(explicit?: string | null): string | null {
  if (explicit !== undefined && explicit !== null) return explicit.trim() === '' ? null : explicit;
  const fromEnv = process.env.NODEGX_STORAGE_URL;
  return fromEnv && fromEnv.trim() !== '' ? fromEnv : null;
}

export interface PersistenceHandle {
  /**
   * The connected adapter.
   *
   * BRG-001: was `any`. This is the boundary where the untyped CommonJS
   * `LocalSQLAdapter` becomes a declared `IStorageAdapter`, and it is the only
   * place in the service that the claim is made — everything downstream is
   * checked against it. No cast: `require()` hands back `any`, so the
   * annotation alone is what narrows it, which means the *next* adapter
   * (BRG-005, written in TypeScript) gets a real check here rather than this
   * one's honour system.
   */
  adapter: IStorageAdapter;
  /**
   * Absolute path to the SQLite file backing this data-dir — or `''` on
   * PostgreSQL, where there is no file. Every reader already guards the empty
   * string (`nodegx_db_file_bytes` returns null for it), and the two SQLite
   * consumers that need a real file (`backup/snapshot.ts`, `schema-migrate`)
   * are the ones BRG-006 has to teach about a database that is not a file.
   */
  dbPath: string;
  /** BRG-005 AC4: the redacted storage target, for the boot line and `/health`. */
  target: string;
  /** BRG-005 AC4: pool saturation, for `/health`. Absent on SQLite. */
  saturation?: () => PoolSaturation | null;
  /** { mode, persistent, ephemeral, engine, error } from the adapter. */
  status: {
    mode: string;
    persistent: boolean;
    ephemeral: boolean;
    engine: string | null;
    error: { message: string; code: string } | null;
  };
}

export interface CreateAdapterOptions {
  dataDir: string;
  /**
   * BRG-005: `postgres://…` opens the PostgreSQL adapter instead of SQLite.
   * Defaults to `NODEGX_STORAGE_URL`. 🔴 R5: any other scheme is refused BY
   * NAME (`StorageUrlError`), at construction, before anything is opened.
   */
  storageUrl?: string | null;
  /** Opt in to ephemeral (non-persisting) mode when no engine loads. */
  allowEphemeral?: boolean;
  /** Collection schemas, if known up front (same shape as dbCollections metadata). */
  collections?: Record<string, unknown>;
}

/**
 * Open the backend's database under <dataDir>/data/local.db and connect.
 * (`data/local.db` is the layout the editor has always created under
 * `~/.noodl/backends/<id>/` — the service keeps it so a backend directory
 * means the same thing whichever process opens it.)
 *
 * @throws LocalBackendPersistenceError when no SQLite engine is available and
 *   allowEphemeral is false — the service must not pretend to persist.
 */
export async function createAdapter(options: CreateAdapterOptions): Promise<PersistenceHandle> {
  const storageUrl = resolveStorageUrl(options.storageUrl);
  if (storageUrl) {
    // BRG-005. The data dir still exists — files, secrets, security.json and
    // the execution history live there whichever database holds the rows.
    fs.mkdirSync(path.join(options.dataDir, 'data'), { recursive: true });
    const { PostgresAdapter } = loadPostgres();
    const pg = new PostgresAdapter(storageUrl, { collections: options.collections || {} });
    await pg.connect(); // throws PostgresConnectionError — the service refuses to start
    return {
      adapter: pg,
      dbPath: '',
      target: pg.target.redacted,
      saturation: () => pg.saturation(),
      status: pg.getPersistenceStatus()
    };
  }

  fs.mkdirSync(path.join(options.dataDir, 'data'), { recursive: true });
  const dbPath = path.join(options.dataDir, 'data', 'local.db');

  const adapter: IStorageAdapter = new LocalSQLAdapter(dbPath, {
    allowEphemeral: !!options.allowEphemeral,
    collections: options.collections || {}
  });

  await adapter.connect(); // throws loudly if it cannot persist and !allowEphemeral

  return {
    adapter,
    dbPath,
    target: dbPath,
    status: adapter.getPersistenceStatus()
  };
}
