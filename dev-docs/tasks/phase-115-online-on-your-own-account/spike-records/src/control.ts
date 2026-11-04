/**
 * HST-006 control: the SAME shim (`doEngine.ts`), run in Node over a fake Durable Object storage built on
 * `node:sqlite`, which refuses nothing that SQLite itself accepts.
 *
 *   arm "faithful": the fake passes BEGIN/COMMIT/PRAGMA straight to node:sqlite — but the shim still drops
 *                   transaction control and counts it, exactly as on a Durable Object. Green here means the shim's
 *                   prepare/get/all/run/changes() are faithful, so a red on workerd belongs to the Durable Object.
 *   arm "refusing": the fake refuses what a Durable Object documents it refuses (BEGIN…, most PRAGMAs), to show the
 *                   ledger counts what it should.
 *
 * Bundled with esbuild (`node build-control.mjs`) and run with node.
 */
import { runConformance } from '@noodl/backend-contract/conformance';
import localSql from '@noodl/runtime/src/api/adapters/local-sql';
import { durableObjectEngine, newLedger, type DoStorage } from './doEngine';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = (process as unknown as { getBuiltinModule(id: string): any }).getBuiltinModule('node:sqlite');

function fakeStorage(refusing: boolean): DoStorage {
  const db = new DatabaseSync(':memory:');
  const exec = (query: string, ...bindings: unknown[]) => {
    if (refusing && /^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/i.test(query)) throw new Error('not authorized');
    if (refusing && /^\s*PRAGMA\s+(?!table_info|table_xinfo)/i.test(query)) throw new Error('not authorized');
    const stmt = db.prepare(query);
    let rows: Record<string, unknown>[];
    let written = 0;
    if (stmt.columns().length > 0) rows = stmt.all(...bindings);
    else {
      written = Number(stmt.run(...bindings).changes);
      rows = [];
    }
    return { toArray: () => rows, rowsRead: rows.length, rowsWritten: written };
  };
  return {
    sql: { exec },
    transactionSync<T>(fn: () => T): T {
      db.exec('BEGIN');
      try {
        const r = fn();
        db.exec('COMMIT');
        return r;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    }
  };
}

async function arm(name: string, refusing: boolean) {
  const ledger = newLedger();
  const storage = fakeStorage(refusing);
  const report = await runConformance(
    async () => {
      const a = new localSql.LocalSQLAdapter('control', { engine: durableObjectEngine(storage, ledger) });
      await a.connect();
      return a;
    },
    { adapter: `control ${name}` }
  );
  return {
    arm: name,
    total: report.total,
    passed: report.passed,
    failed: report.failed,
    skipped: report.skipped,
    failures: report.failures.map((f) => ({ id: f.id, message: (f.message ?? '').slice(0, 300) })),
    ledger
  };
}

(async () => {
  const out = [await arm('faithful', false), await arm('refusing', true)];
  console.log(JSON.stringify(out, null, 2));
})();
