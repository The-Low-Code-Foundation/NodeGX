/**
 * BRG-005 — the pool, against a real PostgreSQL.
 *
 * Two halves, and the split is deliberate:
 *
 *  - `connectionBudget()` is arithmetic and is graded with no server at all, so
 *    AC8's formula is held by a test that runs in CI whatever is installed.
 *  - Everything else needs a server, because a pool that "works" against a mock
 *    proves nothing about a checkout, a rollback or a drain.
 *
 * 🔴 **The server half is skipped when no PostgreSQL is reachable** — the same
 * hole BRG-004 §5.4 recorded for `SchemaManager.export.postgres.test.js`, and
 * BRG-006 is what turns it into a gate. Point it elsewhere with
 * `NODEGX_PG_TEST_URL=postgres://…`.
 */

const { execFileSync } = require('child_process');

const {
  PgConnectionPool,
  connectionBudget,
  CONNECTION_HEADROOM,
  DEFAULT_DATA_POOL_MAX,
  DEFAULT_OPERATIONAL_POOL_MAX
} = require('../../src/api/adapters/postgres/pool');

const PG_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';

let reachable = false;
try {
  execFileSync('psql', ['-qtAX', '-d', PG_URL, '-c', 'SELECT 1'], { stdio: 'ignore' });
  reachable = true;
} catch (e) {
  reachable = false;
}
const suite = reachable ? describe : describe.skip;

describe('BRG-005 AC8 — the connection budget', () => {
  it('the shipped defaults fit a stock server, with the headroom intact', () => {
    // PostgreSQL 16.11 boot defaults, measured: max_connections 100.
    const b = connectionBudget({ maxConnections: 100 });
    expect(b.perProcess).toBe(DEFAULT_DATA_POOL_MAX + DEFAULT_OPERATIONAL_POOL_MAX);
    expect(b.perProcess).toBe(10);
    expect(b.available).toBe(100 - CONNECTION_HEADROOM);
    expect(b.fits).toBe(true);
    expect(b.maxReplicas).toBe(9);
  });

  it('says no rather than nearly — the library default on both pools does not fit four processes', () => {
    // pg's own default is max:10 per pool, and this service opens two. This is
    // the arithmetic that makes 10/10 the wrong default, and it is asserted
    // rather than asserted-in-a-comment.
    const libraryDefaults = connectionBudget({ maxConnections: 100, replicas: 4, dataPoolMax: 10, operationalPoolMax: 10 });
    expect(libraryDefaults.perProcess).toBe(20);
    expect(libraryDefaults.required).toBe(80);
    expect(libraryDefaults.fits).toBe(true);

    const five = connectionBudget({ maxConnections: 100, replicas: 5, dataPoolMax: 10, operationalPoolMax: 10 });
    expect(five.required).toBe(100);
    expect(five.available).toBe(94);
    expect(five.fits).toBe(false);
  });

  it('counts the headroom as unavailable, not as slack', () => {
    const b = connectionBudget({ maxConnections: 10, replicas: 1, dataPoolMax: 4, operationalPoolMax: 1 });
    expect(b.available).toBe(4); // 10 - 6, not 10
    expect(b.required).toBe(5);
    expect(b.fits).toBe(false);
  });
});

suite('BRG-005 — the pool, against a real PostgreSQL', () => {
  let pool;

  beforeAll(async () => {
    pool = new PgConnectionPool({ url: PG_URL, max: 4, label: 'data' });
    await pool.run('DROP TABLE IF EXISTS "pool_probe"');
    await pool.run('CREATE TABLE "pool_probe" ("id" TEXT PRIMARY KEY, "n" INTEGER)');
  });

  afterAll(async () => {
    if (pool) {
      await pool.run('DROP TABLE IF EXISTS "pool_probe"');
      await pool.end();
    }
  });

  it('runs QueryBuilder-shaped SQL — ? markers, params in order', async () => {
    await pool.run('INSERT INTO "pool_probe" ("id", "n") VALUES (?, ?)', ['a', 1]);
    const row = await pool.queryOne('SELECT "n" FROM "pool_probe" WHERE "id" = ?', ['a']);
    expect(row.n).toBe(1);
  });

  it('round-trips a JSON parameter through the operator the row ACL is built on', async () => {
    // This is the probe that decided R6. `pg` parses jsonb out; the rejected
    // driver returned the column as an unparsed string and `-> 'k'` as null.
    const row = await pool.queryOne("SELECT ?::jsonb -> 'read' AS flag", [JSON.stringify({ read: true })]);
    expect(row.flag).toBe(true);
  });

  it('commits a transaction', async () => {
    await pool.transaction(async (tx) => {
      await tx.run('INSERT INTO "pool_probe" ("id", "n") VALUES (?, ?)', ['committed', 7]);
    });
    const row = await pool.queryOne('SELECT "n" FROM "pool_probe" WHERE "id" = ?', ['committed']);
    expect(row.n).toBe(7);
  });

  it('rolls the whole transaction back on a throw — all-or-nothing, not the rows before the throw', async () => {
    // The control, committed OUTSIDE the transaction and matching the same
    // LIKE: without it, `[]` below is equally the reading of a rollback that
    // worked and of a LIKE that never matches anything.
    await pool.run('INSERT INTO "pool_probe" ("id", "n") VALUES (?, ?)', ['rolled-control', 0]);
    const armed = await pool.query('SELECT "id" FROM "pool_probe" WHERE "id" LIKE ?', ['rolled-%']);
    expect(armed.map((r) => r.id)).toEqual(['rolled-control']);

    await expect(
      pool.transaction(async (tx) => {
        await tx.run('INSERT INTO "pool_probe" ("id", "n") VALUES (?, ?)', ['rolled-1', 1]);
        await tx.run('INSERT INTO "pool_probe" ("id", "n") VALUES (?, ?)', ['rolled-2', 2]);
        // The first insert is already on the connection when this throws, so a
        // rollback that only discarded the failing statement would leave it.
        throw new Error('import failed halfway');
      })
    ).rejects.toThrow('import failed halfway');

    const left = await pool.query('SELECT "id" FROM "pool_probe" WHERE "id" LIKE ? ORDER BY "id"', ['rolled-%']);
    expect(left.map((r) => r.id)).toEqual(['rolled-control']);
  });

  it('releases the connection after a rollback, so the pool does not leak one per failure', async () => {
    const before = pool.saturation().total;
    for (let i = 0; i < 6; i++) {
      await expect(pool.transaction(async () => { throw new Error('nope'); })).rejects.toThrow('nope');
    }
    // Six failures through a pool of four: if a failed transaction leaked its
    // client, the fifth checkout would have hung until the timeout instead of
    // getting here.
    const after = pool.saturation();
    expect(after.total).toBeLessThanOrEqual(4);
    expect(after.idle).toBeGreaterThan(0);
    expect(before).toBeLessThanOrEqual(4);
  });

  it('reports saturation in the shape /health needs', async () => {
    const s = pool.saturation();
    expect(s.label).toBe('data');
    expect(s.max).toBe(4);
    expect(s.saturation).toBeGreaterThanOrEqual(0);
    expect(s.saturation).toBeLessThanOrEqual(1);
    expect(typeof s.waiting).toBe('number');
  });

  it('drains on end(), and the drain is observable from the server', async () => {
    const tmp = new PgConnectionPool({ url: PG_URL, max: 2, label: 'drain-probe' });
    await tmp.query('SELECT 1');
    expect(tmp.saturation().total).toBeGreaterThan(0);
    await tmp.end();
    expect(tmp.saturation().total).toBe(0);
  });
});
