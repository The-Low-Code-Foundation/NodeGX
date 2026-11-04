/**
 * HST-006 the exit: every table of a Durable Object's database, as one JSON file a person can read.
 *
 * ECO-004: records must be retrievable. The file holds the database's own schema statements (`sqlite_master.sql`,
 * so tables, indexes and triggers come back exactly) and every row of every table, the backend's bookkeeping tables
 * (`_Schema`, the `_Join_*` relation tables) included. Graded by `reimport.ts`, which builds a Node backend's
 * `data/local.db` from the file and asks THAT backend for the records.
 */
import type { DoSql } from './doEngine';

export const EXPORT_FORMAT = 'nodegx-records-export/0';

export interface RecordsExport {
  format: typeof EXPORT_FORMAT;
  exportedAt: string;
  /** In the order they must be replayed: tables, then indexes, then triggers and views. */
  objects: Array<{ type: string; name: string; table: string; sql: string }>;
  rows: Record<string, Record<string, unknown>[]>;
}

function encode(value: unknown): unknown {
  if (value instanceof ArrayBuffer) return { $blob: btoa(String.fromCharCode(...new Uint8Array(value))) };
  return value;
}

export function exportDatabase(sql: DoSql): RecordsExport {
  const objects = sql
    .exec(
      `SELECT type, name, tbl_name AS "table", sql FROM sqlite_master
       WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND sql IS NOT NULL
       ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name`
    )
    .toArray() as RecordsExport['objects'];
  const rows: RecordsExport['rows'] = {};
  for (const o of objects) {
    if (o.type !== 'table') continue;
    rows[o.name] = sql
      .exec(`SELECT * FROM "${o.name.replace(/"/g, '""')}"`)
      .toArray()
      .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, encode(v)])));
  }
  return { format: EXPORT_FORMAT, exportedAt: new Date().toISOString(), objects, rows };
}
