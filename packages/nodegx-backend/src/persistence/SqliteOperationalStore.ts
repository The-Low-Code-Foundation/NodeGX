/**
 * {@link IOperationalStore} over `node:sqlite` (BRG-002 §3.2).
 *
 * This file is the **only** place outside `persistence/` — and now inside it —
 * where the backend prepares a statement for a table it owns itself. Before
 * BRG-002, `execution/IdempotencyStore.ts` held ten of them against its own
 * `idempotency_keys` table, which meant the claim mechanism was not portable
 * and nothing said so. It is here, behind the interface, because an idempotency
 * claim is not a user record (see `operational.ts` for why it must not become
 * one) but it is still a thing a second adapter has to be able to hold.
 *
 * ## One table, namespaced
 *
 * Every operational subsystem shares `operational_records`, separated by the
 * `namespace` column. `sweep` and `count` take a namespace for that reason —
 * a cross-namespace sweep would be one subsystem's retention policy deleting
 * another's rows, which is a defect with a very long fuse.
 *
 * ## 🔴 This table REPLACES `idempotency_keys`, and the old one is left behind
 *
 * Column renames cannot be `CREATE TABLE IF NOT EXISTS`-ed over an existing
 * table: the table exists, the statement is a no-op, and every prepare then
 * fails on an unknown column — which would turn an upgrade into
 * "CWF-016 idempotency DISABLED" on first boot. So this is a new table name,
 * and `idempotency_keys` is **left in the file rather than dropped**: a few KB
 * that make a downgrade a downgrade rather than a data loss.
 *
 * The consequence, recorded rather than argued: claims held at the moment of
 * upgrade do not carry across. Every `running` claim is already released on
 * every start (`IdempotencyStore.releaseInFlight`, by design), so the genuinely
 * new loss is *completed* replay records — at most one duplicate run per key,
 * once, on the boot that upgrades.
 *
 * @module nodegx-backend/persistence/SqliteOperationalStore
 */

import type {
  IOperationalStore,
  OperationalAcquire,
  OperationalRecord,
  OperationalRetake,
  OperationalSettle
} from '@noodl/backend-contract';

/**
 * The slice of `node:sqlite` this store uses.
 *
 * Structural, and declared here rather than imported: `@types/node` at the
 * version this package pins has no `node:sqlite` declarations, and
 * `ExecutionHistory` keeps the module a runtime `require` so the cloud runtime
 * does not enter this package's module graph. Naming the three methods used is
 * more honest than `any` and costs one interface. (Moved here from
 * `execution/IdempotencyStore.ts` by BRG-002 §3.2 — that module no longer knows
 * SQLite exists.)
 */
export interface SqlStatement {
  run(...params: unknown[]): { changes: number | bigint };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  exec(sql: string): void;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS operational_records (
  namespace   TEXT    NOT NULL,
  record_key  TEXT    NOT NULL,
  state       TEXT    NOT NULL,
  token       TEXT    NOT NULL,
  claimed_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  value       TEXT,
  PRIMARY KEY (namespace, record_key)
);
CREATE INDEX IF NOT EXISTS idx_operational_sweep
  ON operational_records (namespace, state, updated_at);
`;

function toNumber(changes: number | bigint): number {
  return typeof changes === 'bigint' ? Number(changes) : changes;
}

export class SqliteOperationalStore implements IOperationalStore {
  private readonly stmt: {
    insert: SqlStatement;
    select: SqlStatement;
    settle: SqlStatement;
    discard: SqlStatement;
    retake: SqlStatement;
    sweepAged: SqlStatement;
    sweepAll: SqlStatement;
    count: SqlStatement;
  };

  /**
   * Attach to an already-open database and create the table.
   *
   * Takes a handle rather than a path because the handle is
   * `ExecutionHistory`'s — one file, one connection, one thing to back up. A
   * second `DatabaseSync` on the same path would be a second writer contending
   * for a lock nobody has a plan for.
   *
   * Throwing here is the caller's to catch: the service treats an operational
   * store that would not open exactly as it treats execution history that would
   * not open — DISABLED with a loud line, never a silent fall back to memory.
   */
  constructor(db: SqlDatabase) {
    db.exec(SCHEMA);
    this.stmt = {
      insert: db.prepare(
        `INSERT INTO operational_records (namespace, record_key, state, token, claimed_at, updated_at, value)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`
      ),
      select: db.prepare(`SELECT * FROM operational_records WHERE namespace = ? AND record_key = ?`),
      settle: db.prepare(
        `UPDATE operational_records SET state = ?, value = ?, updated_at = ?
         WHERE namespace = ? AND record_key = ? AND token = ? AND state = ?`
      ),
      discard: db.prepare(
        `DELETE FROM operational_records
         WHERE namespace = ? AND record_key = ? AND token = ? AND state = ?`
      ),
      retake: db.prepare(
        `UPDATE operational_records SET token = ?, claimed_at = ?, updated_at = ?
         WHERE namespace = ? AND record_key = ? AND token = ? AND state = ? AND updated_at <= ?`
      ),
      sweepAged: db.prepare(
        `DELETE FROM operational_records WHERE namespace = ? AND state = ? AND updated_at <= ?`
      ),
      sweepAll: db.prepare(`DELETE FROM operational_records WHERE namespace = ? AND state = ?`),
      count: db.prepare(`SELECT COUNT(*) AS n FROM operational_records WHERE namespace = ?`)
    };
  }

  /**
   * The INSERT is the claim: it either lands (nobody held the key) or violates
   * the primary key (somebody does).
   *
   * ⚠️ A failed insert is reported as `false` — contention — **only** when the
   * key is genuinely taken. A constraint violation is the expected loss and
   * every other error is rethrown, because swallowing a broken table here would
   * turn it into "every delivery runs the graph twice", silently.
   */
  async acquire(namespace: string, key: string, claim: OperationalAcquire): Promise<boolean> {
    try {
      this.stmt.insert.run(namespace, key, claim.state, claim.token, claim.now, claim.now);
      return true;
    } catch (e) {
      // `node:sqlite` reports the PK violation through the message; there is no
      // stable code on the error object at the version this package pins.
      if (isConstraintViolation(e)) return false;
      throw e;
    }
  }

  async read(namespace: string, key: string): Promise<OperationalRecord | null> {
    const row = this.stmt.select.get(namespace, key);
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
    const changes = this.stmt.settle.run(
      next.toState,
      next.value,
      next.now,
      namespace,
      key,
      token,
      next.fromState
    );
    return toNumber(changes.changes) === 1;
  }

  async discard(namespace: string, key: string, token: string, state: string): Promise<boolean> {
    return toNumber(this.stmt.discard.run(namespace, key, token, state).changes) === 1;
  }

  async retake(namespace: string, key: string, take: OperationalRetake): Promise<boolean> {
    const changes = this.stmt.retake.run(
      take.toToken,
      take.now,
      take.now,
      namespace,
      key,
      take.fromToken,
      take.state,
      take.updatedAtOrBefore
    );
    return toNumber(changes.changes) === 1;
  }

  async sweep(namespace: string, state: string, updatedAtOrBefore?: number): Promise<number> {
    if (updatedAtOrBefore === undefined) {
      return toNumber(this.stmt.sweepAll.run(namespace, state).changes);
    }
    return toNumber(this.stmt.sweepAged.run(namespace, state, updatedAtOrBefore).changes);
  }

  async count(namespace: string): Promise<number> {
    const row = this.stmt.count.get(namespace);
    return row ? Number(row.n) : 0;
  }

}

/**
 * Whether this error is the primary-key violation that means "somebody already
 * holds that key", as opposed to a broken table.
 *
 * 🔴 Matched on the message because `node:sqlite` at the pinned Node version
 * exposes no stable `code` for it. That is fragile, so it fails **closed**: an
 * error this does not recognise is rethrown, and the worst case of a false
 * negative is a loud failure rather than a silent second run of the graph.
 */
function isConstraintViolation(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /UNIQUE constraint failed|PRIMARY KEY|constraint failed/i.test(message);
}
