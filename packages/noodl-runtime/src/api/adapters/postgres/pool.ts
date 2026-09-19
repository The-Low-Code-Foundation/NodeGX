/**
 * BRG-005 — the connection pool, and the arithmetic an operator needs (AC8).
 *
 * ## The failure this file exists to prevent
 *
 * §3.5 of BRG-005: *"The single most common way a migration like this
 * disappoints is an under-configured pool being blamed on the database."* The
 * shape it takes in the field is not a slow query — it is
 * `FATAL: sorry, too many clients already`, arriving the first time anything is
 * scaled, because every process quietly opened a pool of the library's default
 * size and nobody added them up.
 *
 * ## The arithmetic, stated here because this is where the number lives
 *
 *     replicas × (data_pool_max + operational_pool_max) ≤ max_connections − headroom
 *
 * Measured on PostgreSQL 16.11, boot defaults: `max_connections` **100**,
 * `superuser_reserved_connections` **3**, `reserved_connections` **0**.
 *
 * `headroom` is not slack — it is named connections that must be there on the
 * worst day:
 *
 * | | slots | what for |
 * |---|---|---|
 * | superuser reserve | 3 | the server's own; `max_connections` already excludes them from ordinary clients |
 * | operator | 2 | one `psql` to see what is happening, one `pg_dump` to get out |
 * | the migrator | 1 | `nodegx-backend migrate` (BRG-004) opens its own connection, and it is most likely to be run *while the service is up* |
 *
 * So `headroom = 6`, and 94 slots are available to app processes on a stock
 * server.
 *
 * ## Why the defaults are 8 and 2, and not the library's 10
 *
 * `pg`'s own default is `max: 10` per pool. This service opens **two** pools —
 * the data plane and `IOperationalStore` (§3.5: CWF-016's claim table is not a
 * user collection and does not travel through the adapter facade) — so
 * accepting the library's default would be 20 connections per process, and four
 * processes would exhaust a stock server.
 *
 * The defaults here total **10 per process**, which puts nine processes inside
 * a stock `max_connections` with the headroom above intact. They are also not
 * a throughput compromise: this is one single-threaded Node process, so
 * in-flight queries are bounded by what the event loop can actually dispatch,
 * and pool sizes past roughly ten stop adding throughput and start adding
 * queueing *inside the database* instead of inside the pool — where at least it
 * is visible on `/health`.
 *
 * `operational` is 2 rather than 8 because its traffic is the workflow claim
 * table and execution history: low-rate, short, and it must never be the reason
 * a user request cannot get a connection.
 *
 * ## PgBouncer
 *
 * In **transaction** pooling mode a client does not keep the same server
 * connection between transactions, so nothing session-scoped survives —
 * `SET`, `LISTEN`, `WITH HOLD` cursors, prepared statements, temporary tables,
 * advisory locks held outside a transaction.
 *
 * This pool therefore **sets no session state by default**, and that is a
 * decision rather than an omission: it is what makes the adapter safe behind a
 * transaction-mode pooler without an operator having to know it.
 * `statementTimeoutMillis` is the one opt-in, and it is applied per checkout
 * inside the transaction that uses it rather than once per connection, for the
 * same reason.
 *
 * @module adapters/postgres/pool
 */

import { Pool, type PoolClient, type PoolConfig } from 'pg';

import { toPgQuery } from './placeholders';

/**
 * Connections the data plane may hold. See the arithmetic above before raising
 * it — the number that matters is `replicas × (this + operational)`.
 */
export const DEFAULT_DATA_POOL_MAX = 8;

/** Connections `IOperationalStore` may hold. */
export const DEFAULT_OPERATIONAL_POOL_MAX = 2;

/**
 * Connections reserved for somebody other than an app process: 3 superuser + 2
 * operator + 1 migrator. Published so `/health` can show the same number an
 * operator was told to plan with, rather than a second opinion.
 */
export const CONNECTION_HEADROOM = 6;

export interface PgPoolOptions {
  /** `postgres://…` / `postgresql://…`. */
  url: string;
  /** Pool ceiling. Defaults to {@link DEFAULT_DATA_POOL_MAX}. */
  max?: number;
  /** How long a checkout may wait before failing rather than hanging. */
  connectionTimeoutMillis?: number;
  /** How long an unused connection is kept. */
  idleTimeoutMillis?: number;
  /**
   * Opt-in per-transaction `statement_timeout`. Applied inside the transaction
   * that uses it, never once per connection — see the PgBouncer note above.
   */
  statementTimeoutMillis?: number;
  /** Label used in `/health` and in errors. */
  label?: string;
}

/** What `/health` reports (AC4). */
export interface PgPoolSaturation {
  label: string;
  /** Connections this pool currently holds, idle or busy. */
  total: number;
  /** Held and not in use. */
  idle: number;
  /** Callers queued for a connection. Sustained non-zero is the signal. */
  waiting: number;
  /** The ceiling this pool was configured with. */
  max: number;
  /** `(total - idle) / max`, 0..1, rounded to three places. */
  saturation: number;
}

/**
 * A pool, plus the two things the adapter needs from it: run a `QueryBuilder`
 * query, and run several in one transaction.
 *
 * The query methods take `QueryBuilder`'s `?`-marked SQL and translate at this
 * boundary ({@link toPgQuery}), so nothing above this file knows which marker
 * dialect it is speaking.
 */
export class PgConnectionPool {
  private readonly pool: Pool;
  private readonly statementTimeoutMillis?: number;
  readonly label: string;
  readonly max: number;

  constructor(options: PgPoolOptions) {
    this.label = options.label ?? 'data';
    this.max = options.max ?? DEFAULT_DATA_POOL_MAX;
    this.statementTimeoutMillis = options.statementTimeoutMillis;

    const config: PoolConfig = {
      connectionString: options.url,
      max: this.max,
      connectionTimeoutMillis: options.connectionTimeoutMillis ?? 10_000,
      idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000
    };

    this.pool = new Pool(config);

    // A pooled connection can die between checkouts (a server restart, a
    // pooler's idle reaper). `pg` emits that on the pool, and an unhandled
    // 'error' event on an EventEmitter takes the process down — so a database
    // hiccup would become a crashed backend. Swallowing it here is correct:
    // the connection is already discarded by `pg`, and the next checkout opens
    // a fresh one.
    this.pool.on('error', () => {
      /* discarded idle client; the pool replaces it on next checkout */
    });
  }

  /** Run one statement. `sql` carries `?` markers. */
  async query<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const { text, values } = toPgQuery(sql, params);
    const result = await this.pool.query(text, values as unknown[]);
    return result.rows as T[];
  }

  /** Run one statement and return its first row, or undefined. */
  async queryOne<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
    const rows = await this.query<T>(sql, params);
    return rows[0];
  }

  /** Run one statement for its effect; returns the row count it reported. */
  async run(sql: string, params: readonly unknown[] = []): Promise<number> {
    const { text, values } = toPgQuery(sql, params);
    const result = await this.pool.query(text, values as unknown[]);
    return result.rowCount ?? 0;
  }

  /**
   * Run `fn` inside one transaction on one connection: `COMMIT` on return,
   * `ROLLBACK` on throw, and the connection released either way.
   *
   * This is the awaitable shape BRG-002 §3.1 established. `IStorageAdapter`'s
   * `transaction<T>(fn: () => T): T` is synchronous and a network adapter
   * cannot honour it; that member is declared `uncovered` in
   * `conformance/coverage.ts` for exactly this reason, and the import path was
   * already moved off it.
   */
  async transaction<T>(fn: (tx: PgTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (this.statementTimeoutMillis !== undefined) {
        // SET LOCAL: scoped to this transaction, so it is discarded at COMMIT
        // and never leaks onto a connection a transaction-mode pooler hands to
        // somebody else.
        await client.query(`SET LOCAL statement_timeout = ${Number(this.statementTimeoutMillis)}`);
      }
      const out = await fn(new PgTransaction(client));
      await client.query('COMMIT');
      return out;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* the connection is already unusable; pg discards it on release */
      }
      throw e;
    } finally {
      client.release();
    }
  }

  /** AC4 — what `/health` shows beside the persistence status. */
  saturation(): PgPoolSaturation {
    const total = this.pool.totalCount;
    const idle = this.pool.idleCount;
    const busy = Math.max(0, total - idle);
    return {
      label: this.label,
      total,
      idle,
      waiting: this.pool.waitingCount,
      max: this.max,
      saturation: this.max > 0 ? Math.round((busy / this.max) * 1000) / 1000 : 0
    };
  }

  /**
   * Drain. AC4 requires SIGTERM to exit 0 with the pool drained, and §3.5 of
   * BRG-005 records that there was nowhere to call this from: `IOperationalStore`
   * had a `close()` written at BRG-002 and taken back off because no caller
   * existed. The caller is owed by this task, not by this file.
   */
  async end(): Promise<void> {
    await this.pool.end();
  }
}

/** The transaction-scoped half of {@link PgConnectionPool}, on one connection. */
export class PgTransaction {
  constructor(private readonly client: PoolClient) {}

  async query<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const { text, values } = toPgQuery(sql, params);
    const result = await this.client.query(text, values as unknown[]);
    return result.rows as T[];
  }

  async queryOne<T = Record<string, unknown>>(sql: string, params: readonly unknown[] = []): Promise<T | undefined> {
    return (await this.query<T>(sql, params))[0];
  }

  async run(sql: string, params: readonly unknown[] = []): Promise<number> {
    const { text, values } = toPgQuery(sql, params);
    const result = await this.client.query(text, values as unknown[]);
    return result.rowCount ?? 0;
  }
}

/**
 * The AC8 formula, evaluated — so an operator can be told what their own
 * numbers mean instead of being handed algebra.
 *
 * @returns the per-process total, the number of processes a server can carry,
 *   and whether the configuration asked for fits.
 */
export function connectionBudget(input: {
  maxConnections: number;
  replicas?: number;
  dataPoolMax?: number;
  operationalPoolMax?: number;
  headroom?: number;
}): {
  perProcess: number;
  required: number;
  available: number;
  fits: boolean;
  maxReplicas: number;
} {
  const replicas = input.replicas ?? 1;
  const perProcess = (input.dataPoolMax ?? DEFAULT_DATA_POOL_MAX) + (input.operationalPoolMax ?? DEFAULT_OPERATIONAL_POOL_MAX);
  const headroom = input.headroom ?? CONNECTION_HEADROOM;
  const available = Math.max(0, input.maxConnections - headroom);
  const required = replicas * perProcess;
  return {
    perProcess,
    required,
    available,
    fits: required <= available,
    maxReplicas: perProcess > 0 ? Math.floor(available / perProcess) : 0
  };
}
