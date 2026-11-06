/**
 * P115 HST-014 — the backend's records in a Cloudflare Durable Object's own SQLite.
 *
 * Moved here from the HST-006 spike (`spike-records/src/doEngine.ts`, session 5), where the contract's conformance
 * suite inside an object passed 99 of 102 (HST-015 owns the three reds).
 *
 * Why a Durable Object and not D1: the whole record stack (LocalSQLAdapter, SchemaManager, QueryBuilder) is written
 * against a SYNCHRONOUS better-sqlite3-shaped handle (`engine.ts`), and D1's API is asynchronous. A Durable Object's
 * `ctx.storage.sql.exec()` is synchronous, so it stands behind the same seam `node:sqlite` stands behind
 * (`BackendServiceOptions.recordEngine` → the adapter's `engine` option).
 *
 * What it cannot honour is COUNTED, never hidden (the ledger): a Durable Object refuses BEGIN / COMMIT / SAVEPOINT
 * in SQL (its transactions are `ctx.storage.transactionSync(fn)`), and refuses most PRAGMAs.
 */
import type { EngineDatabase, EngineStatement, ResolvedEngine } from '../../noodl-runtime/src/api/adapters/local-sql/engine';

/** The slice of a Durable Object's SqlStorage this shim reads. */
export interface DoSqlCursor {
  toArray(): Record<string, unknown>[];
  readonly rowsRead: number;
  readonly rowsWritten: number;
}
export interface DoSql {
  exec(query: string, ...bindings: unknown[]): DoSqlCursor;
}
export interface DoStorage {
  sql: DoSql;
  transactionSync<T>(fn: () => T): T;
}

export interface EngineLedger {
  /** Statements sent to the Durable Object's SQLite. */
  statements: number;
  /** Cloudflare's billing meters, summed over every statement (read after the cursor is drained). */
  rowsRead: number;
  rowsWritten: number;
  /** PRAGMAs the Durable Object refused, with the count of each. */
  refusedPragmas: Record<string, number>;
  /** Transaction-control statements (BEGIN, COMMIT, SAVEPOINT …) the stack issued through exec(), not performed. */
  droppedTransactionStatements: Record<string, number>;
  /** db.transaction(fn) calls, answered by transactionSync (real atomicity). */
  transactionSyncCalls: number;
  /** Errors the Durable Object raised that are not one of the above, first message of each kind. */
  otherErrors: Record<string, number>;
}

export function newLedger(): EngineLedger {
  return { statements: 0, rowsRead: 0, rowsWritten: 0, refusedPragmas: {}, droppedTransactionStatements: {}, transactionSyncCalls: 0, otherErrors: {} };
}

const TRANSACTION_CONTROL = /^\s*(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i;

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/** better-sqlite3 binds `undefined` as an error and booleans as an error; the stack already converts. Pass through. */
export function wrapDurableObjectSql(storage: DoStorage, ledger: EngineLedger): EngineDatabase {
  const sql = storage.sql;

  /** Run one statement and drain it, so the cursor's meters are final when they are added to the ledger. */
  function exec(query: string, bindings: unknown[]): { rows: Record<string, unknown>[]; rowsWritten: number } {
    ledger.statements++;
    try {
      const cursor = sql.exec(query, ...bindings);
      const rows = cursor.toArray();
      ledger.rowsRead += cursor.rowsRead;
      ledger.rowsWritten += cursor.rowsWritten;
      return { rows, rowsWritten: cursor.rowsWritten };
    } catch (e) {
      const message = String((e as Error)?.message ?? e).slice(0, 160);
      bump(ledger.otherErrors, message);
      throw e;
    }
  }

  function prepare(query: string): EngineStatement {
    return {
      get(...params) {
        return exec(query, params).rows[0];
      },
      all(...params) {
        return exec(query, params).rows;
      },
      run(...params) {
        const result = exec(query, params);
        // `changes()` is SQLite's own count of rows the last statement changed, which is what better-sqlite3's
        // `changes` is; `rowsWritten` also counts index writes, so it would over-report.
        const row = sql.exec('SELECT changes() AS c, last_insert_rowid() AS r').toArray()[0] as { c: number; r: number };
        return { changes: Number(row?.c ?? result.rowsWritten), lastInsertRowid: Number(row?.r ?? 0) };
      }
    };
  }

  return {
    prepare,
    exec(query) {
      const control = TRANSACTION_CONTROL.exec(query);
      if (control) {
        bump(ledger.droppedTransactionStatements, control[1].toUpperCase());
        return;
      }
      exec(query, []);
    },
    pragma(source) {
      try {
        return exec('PRAGMA ' + source, []).rows;
      } catch (e) {
        bump(ledger.refusedPragmas, source);
        return undefined;
      }
    },
    transaction(fn) {
      return (...args) => {
        ledger.transactionSyncCalls++;
        return storage.transactionSync(() => fn(...args));
      };
    },
    close() {
      /* a Durable Object's database has no handle to close */
    }
    // registerFunction: absent on purpose. A Durable Object cannot call back into JavaScript from SQL, so REGEXP and
    // the two geometry predicates are not available; the adapter reads the absence as "this engine cannot do it".
  };
}

export function durableObjectEngine(storage: DoStorage, ledger: EngineLedger): ResolvedEngine {
  return { name: 'durable-object-sqlite', open: () => wrapDurableObjectSql(storage, ledger) };
}
