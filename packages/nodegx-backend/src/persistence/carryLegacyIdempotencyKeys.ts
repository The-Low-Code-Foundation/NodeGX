/**
 * Carry 0.2.x's completed idempotency claims into `operational_records`, once
 * (P100 UPG-001 §3.6a).
 *
 * BRG-002 replaced the `idempotency_keys` table with `operational_records` and
 * left the old table in the file so a downgrade stays a downgrade. Nothing read
 * it again. Measured on a 0.2.4 backend started on 0.3.0 code: a key answered
 * once on 0.2.4 came back `idempotency-status: stored` with a new token, and the
 * function's run count went 1 → 2. For a function that charges or emails, that
 * is the duplicate the table exists to prevent.
 *
 * ## What carries, and what does not
 *
 * - **`done` rows carry**, with their claim id as the token and `completed_at`
 *   as `updated_at` — the column the TTL sweep reads, so a key keeps exactly
 *   the lifetime it had left, and an already-expired one is swept on the next
 *   prune rather than replayed forever.
 * - **`running` rows do not.** Every start releases in-flight claims
 *   (`IdempotencyStore.releaseInFlight`), so a carried one would be deleted
 *   before anyone could read it.
 * - A row already in `operational_records` wins (`INSERT OR IGNORE`): 0.3.0's
 *   own answer for a key is newer than 0.2.x's.
 *
 * ## Once, not on every start
 *
 * The old table is never emptied, so a carry that ran on every start would
 * resurrect keys the TTL sweep had already removed. A marker row in its own
 * namespace records that the carry ran, in the same transaction as the rows —
 * either both land or neither does.
 *
 * @module nodegx-backend/persistence/carryLegacyIdempotencyKeys
 */

import { legacyCompletedRecord } from '../execution/IdempotencyStore';
import type { SqlDatabase } from './SqliteOperationalStore';

/** The namespace the marker lives in — never swept, never counted by a subsystem. */
export const CARRY_MARKER_NAMESPACE = 'migration';
export const CARRY_MARKER_KEY = 'idempotency_keys';

/**
 * Carry the rows, or do nothing if there is no old table or the carry already
 * ran. Returns how many completed claims were carried (0 on a no-op).
 *
 * Throws on a failure, having rolled back: the caller decides whether that
 * disables anything (it should not — see `ExecutionHistory.open`).
 */
export function carryLegacyIdempotencyKeys(db: SqlDatabase, now: number = Date.now()): number {
  const legacy = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'idempotency_keys'`).get();
  if (!legacy) return 0;

  const marker = db
    .prepare(`SELECT 1 FROM operational_records WHERE namespace = ? AND record_key = ?`)
    .get(CARRY_MARKER_NAMESPACE, CARRY_MARKER_KEY);
  if (marker) return 0;

  const rows = db
    .prepare(
      `SELECT scope, idem_key, claim_id, claimed_at, completed_at, status_code, body FROM idempotency_keys
       WHERE state = 'done' AND completed_at IS NOT NULL AND status_code IS NOT NULL AND body IS NOT NULL`
    )
    .all();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO operational_records (namespace, record_key, state, token, claimed_at, updated_at, value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  let carried = 0;
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      const scope = String(row.scope);
      // The new key joins scope and key with NUL; a 0.2.x scope holding one
      // would be ambiguous, so it is left behind rather than guessed at.
      if (scope.indexOf('\0') !== -1) continue;
      const record = legacyCompletedRecord(scope, String(row.idem_key), Number(row.status_code), String(row.body));
      const changes = insert.run(
        record.namespace,
        record.key,
        record.state,
        String(row.claim_id),
        Number(row.claimed_at),
        Number(row.completed_at),
        record.value
      ).changes;
      if (Number(changes) === 1) carried++;
    }
    insert.run(CARRY_MARKER_NAMESPACE, CARRY_MARKER_KEY, 'done', 'upg-001', now, now, JSON.stringify({ carried }));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return carried;
}
