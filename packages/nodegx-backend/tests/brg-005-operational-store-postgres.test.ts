/**
 * BRG-005 / BRG-D6 — `IOperationalStore` on PostgreSQL, graded by BRG-002's own
 * cases (`helpers/operational-store-cases.ts`), plus the one thing the SQLite
 * store cannot have: a pool, and a `close()` that releases it.
 *
 * 🔴 Skipped when no PostgreSQL is reachable (BRG-004 §5.4's hole; BRG-006
 * makes it a gate). `NODEGX_PG_TEST_URL=postgres://…` points it elsewhere. The
 * table is truncated before every case rather than a database created per
 * run: `operational_records` is one small table and the cases are namespaced.
 */
import { execFileSync } from 'child_process';

import { PgOperationalStore } from '../src/persistence/PgOperationalStore';
import { describeOperationalStore } from './helpers/operational-store-cases';

jest.setTimeout(60000);

const PG_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';

function psql(sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', PG_URL, '-c', sql], { stdio: 'ignore' });
}

let reachable = false;
try {
  psql('SELECT 1');
  reachable = true;
} catch {
  reachable = false;
}

if (reachable) {
  describeOperationalStore('BRG-005 the operational store (PostgreSQL)', async () => {
    psql('DROP TABLE IF EXISTS operational_records');
    const opened: PgOperationalStore[] = [];
    const store = new PgOperationalStore(PG_URL, { max: 2 });
    opened.push(store);
    // The table is created lazily by the first call; a read forces it so
    // `breakStore` below has something to drop.
    await store.count('warm');
    return {
      store,
      async openSecond() {
        const second = new PgOperationalStore(PG_URL, { max: 1 });
        opened.push(second);
        return second;
      },
      async breakStore() {
        psql('DROP TABLE operational_records');
      },
      async close() {
        for (const s of opened) await s.close();
      }
    };
  });

  describe('BRG-D6 — the pool, and the close() that releases it', () => {
    it('reports a pool of the operational size and releases it on close()', async () => {
      const store = new PgOperationalStore(PG_URL);
      await store.count('x');
      const before = store.saturation();
      expect(before.label).toBe('operational');
      expect(before.max).toBe(2);
      expect(before.total).toBeGreaterThanOrEqual(1);
      await store.close();
      expect(store.saturation().total).toBe(0);
      // Idempotent: a second close is a no-op, not an error on a closed pool.
      await expect(store.close()).resolves.toBeUndefined();
    });

    it('a server that cannot be reached fails the first call loudly, not at construction', async () => {
      const store = new PgOperationalStore('postgres://127.0.0.1:1/nowhere');
      await expect(store.count('x')).rejects.toThrow();
      await store.close();
    });
  });
} else {
  describe.skip('BRG-005 the operational store (PostgreSQL)', () => {
    it('needs a reachable PostgreSQL', () => undefined);
  });
}
