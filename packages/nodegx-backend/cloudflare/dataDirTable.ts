/**
 * P115 HST-014 — the backend's data-dir files (rules, secrets, sign-in settings, triggers, deployed functions) kept in
 * a table of the Durable Object's own SQLite, handed to the service as `dataDirStore` (HST-011).
 *
 * On a Worker `node:fs` is the isolate's memory: it outlives a request, not an eviction or a redeploy. The records
 * already live in the object's database; this puts the settings beside them. `sql.exec` is synchronous, as every
 * writer in the service is, so a write is in the table before the request that made it answers.
 *
 * The table's name starts with `_`, which the record adapter's `listTables` skips: it is never shown as a collection.
 */
import type { DataDirStore } from '../src/config/dataDirStore';

/** The slice of `ctx.storage.sql` this reads. */
export interface SqlExec {
  exec(query: string, ...bindings: unknown[]): { toArray(): Record<string, unknown>[] };
}

export const DATA_DIR_TABLE = '_nodegx_data_dir';

export function dataDirTable(sql: SqlExec, ledger?: { puts: number; deletes: number }): DataDirStore {
  sql.exec(`CREATE TABLE IF NOT EXISTS ${DATA_DIR_TABLE} (rel TEXT PRIMARY KEY, body TEXT NOT NULL)`);
  return {
    list: () => sql.exec(`SELECT rel FROM ${DATA_DIR_TABLE} ORDER BY rel`).toArray().map((r) => String(r.rel)),
    get: (rel) => {
      const row = sql.exec(`SELECT body FROM ${DATA_DIR_TABLE} WHERE rel = ?`, rel).toArray()[0];
      return row ? String(row.body) : undefined;
    },
    put: (rel, contents) => {
      sql.exec(
        `INSERT INTO ${DATA_DIR_TABLE} (rel, body) VALUES (?, ?) ON CONFLICT(rel) DO UPDATE SET body = excluded.body`,
        rel,
        contents
      );
      if (ledger) ledger.puts++;
    },
    delete: (rel) => {
      sql.exec(`DELETE FROM ${DATA_DIR_TABLE} WHERE rel = ?`, rel);
      if (ledger) ledger.deletes++;
    }
  };
}
