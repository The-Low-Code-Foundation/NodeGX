/**
 * {@link IOperationalStore} over PostgreSQL (BRG-005 §6.2 item 5, BRG-D6).
 *
 * The same seven methods as `SqliteOperationalStore`, over the same table
 * shape, with the same two properties that make it a claim mechanism rather
 * than a key-value store: **the INSERT is the claim** (the primary key
 * arbitrates, not this process) and every compare-and-set is one UPDATE whose
 * WHERE carries the token and the state.
 *
 * ## Why this has a `close()` and the SQLite one does not
 *
 * `operational.ts` says it: *"A Postgres operational store holds a connection
 * pool, and a pool that is never released is a leak the SQLite implementation
 * cannot have. So BRG-005 adds `close()` together with the shutdown path that
 * calls it."* The pool here is the second of the two pools §3.5 of BRG-005
 * counts — `DEFAULT_OPERATIONAL_POOL_MAX` (2) — and it is sized in the same
 * arithmetic as the data pool.
 *
 * ## Its own pool, not the adapter's
 *
 * A claim on a webhook delivery must not wait behind a user's query for a
 * connection, and a user's query must never be the reason a claim is slow to
 * settle. Two pools, sized separately, is how `pool.ts` says that. The store
 * takes a URL rather than a pool for the same reason `SqliteOperationalStore`
 * takes a handle: the caller decides what it shares, and this one shares
 * nothing.
 *
 * @module nodegx-backend/persistence/PgOperationalStore
 */

import type {
  IOperationalStore,
  OperationalAcquire,
  OperationalRecord,
  OperationalRetake,
  OperationalSettle
} from '@noodl/backend-contract';

/** The slice of `PgConnectionPool` this store drives — structural, so the runtime `require` stays untyped. */
interface PoolLike {
  run(sql: string, params?: readonly unknown[]): Promise<number>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T | undefined>;
  saturation(): { label: string; total: number; idle: number; waiting: number; max: number; saturation: number };
  end(): Promise<void>;
}

// The pool lives in the runtime package beside the adapter; consumed through
// the package's public subpath, as `createAdapter.ts` consumes the adapter.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('@noodl/runtime/src/api/adapters/postgres') as {
  PgConnectionPool: new (options: { url: string; max?: number; label?: string }) => PoolLike;
  DEFAULT_OPERATIONAL_POOL_MAX: number;
  PG_UNIQUE_VIOLATION?: string;
};

/** SQLSTATE for a primary-key collision — the expected loss of a race, not a broken table. */
const UNIQUE_VIOLATION = '23505';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS operational_records (
  namespace   TEXT    NOT NULL,
  record_key  TEXT    NOT NULL,
  state       TEXT    NOT NULL,
  token       TEXT    NOT NULL,
  claimed_at  BIGINT  NOT NULL,
  updated_at  BIGINT  NOT NULL,
  value       TEXT,
  PRIMARY KEY (namespace, record_key)
);
CREATE INDEX IF NOT EXISTS idx_operational_sweep
  ON operational_records (namespace, state, updated_at);
`;

export interface PgOperationalStoreOptions {
  /** Pool ceiling. Defaults to `DEFAULT_OPERATIONAL_POOL_MAX` (2) — see `pool.ts` before raising it. */
  max?: number;
}

export class PgOperationalStore implements IOperationalStore {
  private readonly pool: PoolLike;
  /** The table, created once. Every method awaits it, so a broken server fails loudly on first use. */
  private readonly ready: Promise<void>;
  private closed = false;

  constructor(url: string, options: PgOperationalStoreOptions = {}) {
    this.pool = new postgres.PgConnectionPool({
      url,
      max: options.max ?? postgres.DEFAULT_OPERATIONAL_POOL_MAX,
      label: 'operational'
    });
    this.ready = this.pool.run(SCHEMA).then(() => undefined);
    // Reported by the first call that awaits it, not as an unhandled rejection.
    this.ready.catch(() => undefined);
  }

  /**
   * The INSERT is the claim. A primary-key violation is the expected loss and
   * resolves `false`; every other error is rethrown, because a broken table
   * read as contention becomes "every delivery runs the graph twice", silently.
   */
  async acquire(namespace: string, key: string, claim: OperationalAcquire): Promise<boolean> {
    await this.ready;
    try {
      await this.pool.run(
        `INSERT INTO operational_records (namespace, record_key, state, token, claimed_at, updated_at, value)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        [namespace, key, claim.state, claim.token, claim.now, claim.now]
      );
      return true;
    } catch (e) {
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) return false;
      throw e;
    }
  }

  async read(namespace: string, key: string): Promise<OperationalRecord | null> {
    await this.ready;
    const row = await this.pool.queryOne(
      'SELECT * FROM operational_records WHERE namespace = ? AND record_key = ?',
      [namespace, key]
    );
    if (!row) return null;
    return {
      namespace: String(row.namespace),
      key: String(row.record_key),
      token: String(row.token),
      state: String(row.state),
      claimedAt: Number(row.claimed_at),
      updatedAt: Number(row.updated_at),
      value: row.value === null || row.value === undefined ? null : String(row.value)
    };
  }

  async settle(namespace: string, key: string, token: string, next: OperationalSettle): Promise<boolean> {
    await this.ready;
    const changed = await this.pool.run(
      `UPDATE operational_records SET state = ?, value = ?, updated_at = ?
       WHERE namespace = ? AND record_key = ? AND token = ? AND state = ?`,
      [next.toState, next.value, next.now, namespace, key, token, next.fromState]
    );
    return changed === 1;
  }

  async discard(namespace: string, key: string, token: string, state: string): Promise<boolean> {
    await this.ready;
    const changed = await this.pool.run(
      'DELETE FROM operational_records WHERE namespace = ? AND record_key = ? AND token = ? AND state = ?',
      [namespace, key, token, state]
    );
    return changed === 1;
  }

  async retake(namespace: string, key: string, take: OperationalRetake): Promise<boolean> {
    await this.ready;
    const changed = await this.pool.run(
      `UPDATE operational_records SET token = ?, claimed_at = ?, updated_at = ?
       WHERE namespace = ? AND record_key = ? AND token = ? AND state = ? AND updated_at <= ?`,
      [take.toToken, take.now, take.now, namespace, key, take.fromToken, take.state, take.updatedAtOrBefore]
    );
    return changed === 1;
  }

  async sweep(namespace: string, state: string, updatedAtOrBefore?: number): Promise<number> {
    await this.ready;
    if (updatedAtOrBefore === undefined) {
      return this.pool.run('DELETE FROM operational_records WHERE namespace = ? AND state = ?', [namespace, state]);
    }
    return this.pool.run('DELETE FROM operational_records WHERE namespace = ? AND state = ? AND updated_at <= ?', [
      namespace,
      state,
      updatedAtOrBefore
    ]);
  }

  async count(namespace: string): Promise<number> {
    await this.ready;
    const row = await this.pool.queryOne<{ n: number }>(
      'SELECT COUNT(*) AS n FROM operational_records WHERE namespace = ?',
      [namespace]
    );
    return row ? Number(row.n) : 0;
  }

  /** `/health` — the second pool, beside the first. */
  saturation(): ReturnType<PoolLike['saturation']> {
    return this.pool.saturation();
  }

  /**
   * Release the pool. BRG-D6: the method `operational.ts` took back off for
   * want of a caller — its caller is `ExecutionHistory.close()` (see BRG-005 §7).
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.pool.end();
  }
}
