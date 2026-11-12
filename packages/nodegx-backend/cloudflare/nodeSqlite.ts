/**
 * P115 HST-014 — `node:sqlite`, answered by the Durable Object's own SQLite (from the HST-006 §7 spike).
 *
 * The backend service opens SQLite in two ways. The record adapter goes through the runtime's engine resolver (the host
 * hands it `durableObjectEngine` as `recordEngine`, so its `db.transaction()` is `transactionSync`). Everything
 * else (the execution history and its operational store, `executions.sqlite`) does `new DatabaseSync(path)` itself.
 * This module is what that `require('node:sqlite')` gets (`build.mjs` resolves `node:sqlite` here).
 *
 * One Durable Object has ONE database, so every path opened here lands in it, beside the records. The tables do not
 * share names today (the records are `_User`, `_Session`, a collection per name; the history is `executions`,
 * `execution_steps` …); a collection called `executions` would collide. Counted, not hidden: the ledger.
 */
import { newLedger, wrapDurableObjectSql, type DoStorage, type EngineLedger } from './durableObjectSql';

let storage: DoStorage | null = null;

/** The ledger of every statement sent through `node:sqlite` (not the adapter's: the host keeps that one). */
export const sqliteLedger: EngineLedger = newLedger();

/** The Durable Object sets this before it boots the service. */
export function setStorage(s: DoStorage): void {
  storage = s;
}

/** Paths opened, so the report says which files became tables in the one database. */
export const openedPaths: string[] = [];

export class DatabaseSync {
  private readonly db: ReturnType<typeof wrapDurableObjectSql>;

  constructor(path: string) {
    if (!storage) throw new Error('node:sqlite shim: no Durable Object storage set before DatabaseSync was opened');
    openedPaths.push(path);
    this.db = wrapDurableObjectSql(storage, sqliteLedger);
  }

  exec(sql: string): void {
    // `PRAGMA auto_vacuum = INCREMENTAL` (the history's first statement) is refused by a Durable Object with
    // SQLITE_AUTH, and the history then turns itself off. Counted and dropped, as `pragma()` already does.
    const pragma = /^\s*PRAGMA\s+(.+?);?\s*$/is.exec(sql);
    if (pragma) {
      try {
        this.db.exec(sql);
      } catch {
        sqliteLedger.refusedPragmas[pragma[1]] = (sqliteLedger.refusedPragmas[pragma[1]] ?? 0) + 1;
      }
      return;
    }
    this.db.exec(sql);
  }

  prepare(sql: string) {
    const st = this.db.prepare(sql);
    return {
      get: (...p: unknown[]) => st.get(...p),
      all: (...p: unknown[]) => st.all(...p),
      run: (...p: unknown[]) => st.run(...p),
      iterate: (...p: unknown[]) => (st.all(...p) as unknown[])[Symbol.iterator](),
      setReadBigInts() {},
      setAllowBareNamedParameters() {}
    };
  }

  close(): void {
    /* the object's database has no handle to close */
  }
}

export default { DatabaseSync };
