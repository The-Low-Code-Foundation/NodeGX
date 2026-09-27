/**
 * BRG-002 §3.2 — `IOperationalStore`, and the two properties nothing else can
 * see.
 *
 * `idempotency-store.test.ts` drives this store hard, but only through
 * `IdempotencyStore`, and that caller uses exactly one namespace and exactly
 * two states. So two things it introduced are invisible there:
 *
 *  1. **Namespace isolation.** `sweep` and `count` take a namespace precisely
 *     so one subsystem's retention cannot delete another's rows. With one
 *     caller there is no second namespace, so that argument is a write nobody
 *     reads — and a write nobody reads is a write nobody grades. Every sweep
 *     case below runs with a second namespace populated beside the first and
 *     asserts it is still there afterwards.
 *  2. **The refusals.** `settle`, `discard` and `retake` each resolve `false`
 *     rather than throwing when the compare-and-set does not hold. The
 *     idempotency tests reach two of those paths incidentally; a second adapter
 *     needs all of them pinned, because "returns false" and "throws" are both
 *     plausible implementations of a failed CAS and only one of them is this
 *     contract.
 *
 * This is a spec for the SQLite implementation. The cases themselves live in
 * `helpers/operational-store-cases.ts` since BRG-005, so that the PostgreSQL
 * implementation (`brg-005-operational-store-postgres.test.ts`) runs the SAME
 * cases rather than a copy of them — which is the portable half BRG-003 named
 * `IOperationalStore` as uncovered for, *because it did not exist* (§5.5).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteOperationalStore, SqlDatabase } from '../src/persistence/SqliteOperationalStore';
import { describeOperationalStore } from './helpers/operational-store-cases';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

describeOperationalStore('BRG-002 §3.2 the operational store (SQLite)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-op-'));
  const dbPath = path.join(dir, 'operational.sqlite');
  const db = new DatabaseSync(dbPath) as SqlDatabase;
  return {
    store: new SqliteOperationalStore(db),
    async openSecond() {
      return new SqliteOperationalStore(new DatabaseSync(dbPath) as SqlDatabase);
    },
    async breakStore() {
      db.exec('DROP TABLE operational_records');
    },
    async close() {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
});
