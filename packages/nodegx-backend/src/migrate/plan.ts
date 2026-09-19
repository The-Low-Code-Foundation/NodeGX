/**
 * The migration plan — every table in a SQLite backend, and the PostgreSQL
 * table it becomes (BRG-004 §3.1 phase 2).
 *
 * The survey (`survey.ts`) answers *"does this cross?"* for a person. This
 * module answers the next question, for the machine: **what exactly is
 * created on the other side, and which rows are copied into it.** It is pure —
 * it opens the SQLite file read-only and produces a plan; nothing is written
 * anywhere by anything in this file, which is what makes the schema phase
 * reviewable before it runs.
 *
 * Three findings are built into the shape of the plan, each measured against a
 * real backend database (`~/.noodl/backends/<id>/data/local.db`) rather than
 * assumed:
 *
 * 1. 🔴 **The declared schema is not the table.** `_Schema` holds what the app
 *    declared; `PRAGMA table_info` holds what is actually there. They agreed in
 *    the database measured, and a migration that trusts the declaration alone
 *    would silently drop any column they ever disagree about — which is BRG-D3's
 *    exact shape, one level up. Every column is read from the table and
 *    reconciled against the declaration, and an undeclared one is carried with
 *    a type inferred from SQLite storage and **named in the plan**.
 * 2. 🔴 **An FTS5 index is not data.** Search puts a virtual table `<T>_fts` and
 *    its shadow tables into `sqlite_master`, so a migrator reading the table
 *    list copies an index as if it were a collection. They are excluded from the
 *    copy and recorded as a search index to be **rebuilt** on the other side —
 *    the only correct carry, since the two engines' indexes share no bytes.
 * 3. 🔴 **`_Schema`'s own timestamps are naive.** `SchemaManager` writes them
 *    with `CURRENT_TIMESTAMP`, which SQLite documents as **UTC** and spells
 *    `2026-07-25 16:19:32` — no zone. Handed to a `TIMESTAMPTZ` column as-is,
 *    PostgreSQL reads it in the *server's* timezone and every such row shifts by
 *    the UTC offset. The coercion each column carries is part of the plan for
 *    that reason; see `coerceForPostgres`.
 *
 * @module nodegx-backend/migrate/plan
 */

import * as fs from 'fs';

// The adapter stack is consumed through the package's public subpath, the same
// declared edge `createAdapter` uses — the DDL a table gets here has to be the
// DDL the adapter would have created, or a database filled by one cannot be
// served by the other (BRG-005 §5).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('@noodl/runtime/src/api/adapters/postgres');

const { tableDDL, junctionDDL, POSTGRES_TYPE_MAP, SYSTEM_COLUMNS } = postgres as {
  tableDDL(schema: TableSchemaLike, options?: { touchTrigger?: boolean }): string[];
  junctionDDL(junctionTable: string): string[];
  POSTGRES_TYPE_MAP: Record<string, string | null>;
  SYSTEM_COLUMNS: readonly string[];
};

/** The subset of the adapter's `TableSchema` this module reads. */
export interface TableSchemaLike {
  name: string;
  columns?: Array<{ name: string; type: string; required?: boolean; targetClass?: string; defaultValue?: unknown }>;
  indexes?: unknown;
}

/** What kind of thing a table is, which decides how it is created and copied. */
export type TableKind =
  /** A collection someone declared — `Articles`, and also `_User`, which is one. */
  | 'collection'
  /** `_Schema` / `_SearchIndex`: the adapter's own metadata, created by `PgSchemaManager`. */
  | 'meta'
  /** `_Join_<field>_<Class>`: a relation's rows. */
  | 'junction'
  /** In `sqlite_master`, in no schema, not a junction — carried on its literal shape. */
  | 'undeclared';

export interface PlanColumn {
  name: string;
  /** The declared type (`String`, `Date`, …) where there is one. */
  declaredType?: string;
  /** What `PRAGMA table_info` says SQLite stores it as. */
  sqliteType: string;
  /** The PostgreSQL type it becomes. */
  pgType: string;
  /**
   * `declared` — from the `_Schema` row; `built-in` — one of the four every
   * table gets; `undeclared` — in the table and in no declaration, carried on
   * its SQLite storage type and named in the plan's notes.
   */
  origin: 'declared' | 'built-in' | 'undeclared';
}

export interface PlanTable {
  name: string;
  kind: TableKind;
  columns: PlanColumn[];
  /** The primary key, in order, as `PRAGMA table_info` reports it. */
  primaryKey: string[];
  rows: number;
  /**
   * The DDL that creates it, or `[]` for a table `PgSchemaManager` creates
   * itself (`meta`). Multi-statement, one statement per `;`-terminated line
   * group, exactly as `tableDDL` emits it.
   */
  ddl: string[];
}

/** A search index to be rebuilt on the other side — never copied. */
export interface PlanSearchIndex {
  table: string;
  fields: string[];
  tokenizer: string;
  /** The FTS5 virtual table and its shadow tables, all excluded from the copy. */
  excludedTables: string[];
}

export interface MigrationPlan {
  source: string;
  tables: PlanTable[];
  searchIndexes: PlanSearchIndex[];
  /** Tables in `sqlite_master` that are deliberately not copied, and why. */
  excluded: Array<{ name: string; why: string }>;
  /** Anything a reviewer should see before the schema phase runs. */
  notes: string[];
  /** Total rows the data phase will copy. */
  totalRows: number;
}

/** The minimal shape read off a SQLite handle. */
export interface PlanDb {
  prepare(sql: string): { all(...params: unknown[]): unknown[]; get(...params: unknown[]): unknown };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadSqlite(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('node:sqlite');
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (process as any).getBuiltinModule('node:sqlite');
  }
}

/** Open a SQLite file read-only — AC7 is held by being unable to write, not by intending not to. */
export function openReadOnly(dbPath: string): PlanDb {
  if (!fs.existsSync(dbPath)) throw new Error(`No database at ${dbPath}`);
  const { DatabaseSync } = loadSqlite();
  return new DatabaseSync(dbPath, { readOnly: true }) as PlanDb;
}

interface MasterRow {
  name: string;
  sql: string | null;
}

interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

/**
 * The PostgreSQL type for a column nobody declared, read off SQLite storage.
 *
 * This is a weaker answer than `POSTGRES_TYPE_MAP` gives a declared column and
 * it is labelled as such in the plan: SQLite's `INTEGER` is a `Boolean` in this
 * adapter's vocabulary *and* an integer, and with no declaration there is
 * nothing that says which. `NUMERIC` carries both without lying about either.
 */
export function pgTypeForSqliteStorage(sqliteType: string): string {
  const t = String(sqliteType || '').toUpperCase();
  if (t.includes('INT')) return 'NUMERIC';
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB') || t.includes('NUM') || t.includes('DEC')) {
    return 'NUMERIC';
  }
  if (t.includes('BLOB')) return 'BYTEA';
  return 'TEXT';
}

/** The four columns every collection table has, and the PostgreSQL types `tableDDL` gives them. */
const BUILT_IN_PG_TYPES: Record<string, string> = {
  objectId: 'TEXT',
  createdAt: 'TIMESTAMPTZ',
  updatedAt: 'TIMESTAMPTZ',
  ACL: 'JSONB'
};

/** `_Schema` and `_SearchIndex` as `PgSchemaManager` creates them (`META_DDL`). */
const META_PG_TYPES: Record<string, Record<string, string>> = {
  _Schema: { name: 'TEXT', schema: 'TEXT', createdAt: 'TIMESTAMPTZ', updatedAt: 'TIMESTAMPTZ' },
  _SearchIndex: { name: 'TEXT', fields: 'TEXT', tokenizer: 'TEXT', updatedAt: 'TIMESTAMPTZ' }
};

const JUNCTION_PG_TYPES: Record<string, string> = { owningId: 'TEXT', relatedId: 'TEXT' };

/**
 * Parse `CREATE VIRTUAL TABLE "X_fts" USING fts5(a, b, content='X', …)` into
 * the field list and tokenizer `rebuildSearchIndex` needs on the other side.
 */
export function parseFts5(sql: string): { fields: string[]; tokenizer: string } | null {
  const m = /USING\s+fts5\s*\(([\s\S]*)\)\s*$/i.exec(String(sql || '').trim());
  if (!m) return null;
  const fields: string[] = [];
  let tokenizer = 'unicode61';
  // Split on commas that are not inside quotes — the option values are quoted.
  const parts = m[1].match(/(?:[^,'"]|'[^']*'|"[^"]*")+/g) || [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const opt = /^(\w+)\s*=\s*['"]?([^'"]*)['"]?$/.exec(part);
    if (opt) {
      if (opt[1].toLowerCase() === 'tokenize') tokenizer = opt[2];
      continue; // content=, content_rowid=, tokenize= — options, not fields
    }
    fields.push(part.replace(/^["']|["']$/g, ''));
  }
  return { fields, tokenizer };
}

function rowCount(db: PlanDb, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM "${table.replace(/"/g, '""')}"`).get() as { n?: number };
  return row && typeof row.n === 'number' ? row.n : 0;
}

/**
 * Read a stopped backend's SQLite file and say what the migration will create
 * and copy. Opens read-only; writes nothing.
 */
export function readMigrationPlan(dbPath: string): MigrationPlan {
  const db = openReadOnly(dbPath);
  try {
    return planFromDb(db, dbPath);
  } finally {
    // node:sqlite's handle closes with the object; an explicit close keeps the
    // file unlocked for the hash AC7 takes right after.
    const closable = db as unknown as { close?: () => void };
    if (typeof closable.close === 'function') closable.close();
  }
}

/** The plan, from an already-open read-only handle (the snapshot path uses this). */
export function planFromDb(db: PlanDb, sourceLabel: string): MigrationPlan {
  const master = db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as MasterRow[];

  const declared = new Map<string, TableSchemaLike>();
  for (const r of db.prepare('SELECT "name", "schema" FROM "_Schema"').all() as Array<{ name: string; schema: string }>) {
    try {
      declared.set(r.name, JSON.parse(r.schema) as TableSchemaLike);
    } catch {
      throw new Error(
        `The "_Schema" row for "${r.name}" is not valid JSON, so what that collection declares cannot be read. ` +
          'Refusing to migrate a schema this backend cannot describe.'
      );
    }
  }

  // 🔴 An FTS5 index is not data. Find the virtual tables first, so their
  // shadow tables are excluded before anything decides to copy them.
  const searchIndexes: PlanSearchIndex[] = [];
  const excluded: Array<{ name: string; why: string }> = [];
  const excludedNames = new Set<string>();
  for (const row of master) {
    if (!row.sql || !/^\s*CREATE\s+VIRTUAL\s+TABLE/i.test(row.sql)) continue;
    const parsed = parseFts5(row.sql);
    const base = row.name.endsWith('_fts') ? row.name.slice(0, -'_fts'.length) : null;
    if (!parsed || !base) {
      throw new Error(
        `"${row.name}" is a virtual table this migration does not understand, and copying a table whose ` +
          'storage it cannot read would lose data silently. Its definition: ' +
          `${row.sql.replace(/\s+/g, ' ').slice(0, 160)}`
      );
    }
    const shadow = master.filter((m) => m.name === row.name || m.name.startsWith(`${row.name}_`)).map((m) => m.name);
    for (const name of shadow) {
      excludedNames.add(name);
      excluded.push({
        name,
        why: `part of the FTS5 search index on "${base}" — an index, not data; rebuilt on the other side`
      });
    }
    searchIndexes.push({ table: base, fields: parsed.fields, tokenizer: parsed.tokenizer, excludedTables: shadow });
  }

  const tables: PlanTable[] = [];
  const notes: string[] = [];
  let totalRows = 0;

  for (const row of master) {
    const name = row.name;
    if (excludedNames.has(name)) continue;

    const info = db.prepare(`PRAGMA table_info("${name.replace(/"/g, '""')}")`).all() as TableInfoRow[];
    const primaryKey = info
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);
    const rows = rowCount(db, name);
    totalRows += rows;

    const kind: TableKind = META_PG_TYPES[name]
      ? 'meta'
      : name.startsWith('_Join_')
        ? 'junction'
        : declared.has(name)
          ? 'collection'
          : 'undeclared';

    const schema = declared.get(name);
    const declaredTypes = new Map<string, string>();
    for (const col of (schema && schema.columns) || []) declaredTypes.set(col.name, col.type);

    const columns: PlanColumn[] = [];
    for (const col of info) {
      let pgType: string;
      let origin: PlanColumn['origin'];
      const declaredType = declaredTypes.get(col.name);

      if (kind === 'meta') {
        pgType = META_PG_TYPES[name][col.name] || pgTypeForSqliteStorage(col.type);
        origin = 'built-in';
      } else if (kind === 'junction') {
        pgType = JUNCTION_PG_TYPES[col.name] || pgTypeForSqliteStorage(col.type);
        origin = 'built-in';
      } else if (SYSTEM_COLUMNS.includes(col.name)) {
        pgType = BUILT_IN_PG_TYPES[col.name];
        origin = 'built-in';
      } else if (declaredType && POSTGRES_TYPE_MAP[declaredType]) {
        pgType = POSTGRES_TYPE_MAP[declaredType] as string;
        origin = 'declared';
      } else {
        // 🔴 In the table, in no declaration. Carried, and said out loud:
        // dropping it is BRG-D3 one level up, and guessing `Boolean` from
        // `INTEGER` would be a different silent wrong answer.
        pgType = pgTypeForSqliteStorage(col.type);
        origin = 'undeclared';
        notes.push(
          `"${name}"."${col.name}" is in the table and in no \`_Schema\` declaration; carried as ` +
            `${pgType}, inferred from its SQLite storage type (${col.type || 'none'}).`
        );
      }

      columns.push({ name: col.name, declaredType, sqliteType: col.type, pgType, origin });
    }

    let ddl: string[] = [];
    if (kind === 'meta') {
      ddl = []; // PgSchemaManager's META_DDL creates these, and must be the one that does.
    } else if (kind === 'junction') {
      ddl = junctionDDL(name);
    } else if (kind === 'collection' && schema) {
      ddl = tableDDL(schema);
      // The reconciliation: a column in the table that the declared DDL does
      // not create. `tableDDL` emits exactly the declaration; this adds what
      // the table actually has, so nothing is left behind.
      const created = new Set<string>([...SYSTEM_COLUMNS, ...(schema.columns || []).map((c) => c.name)]);
      for (const col of columns) {
        if (created.has(col.name)) continue;
        ddl.push(`ALTER TABLE "${name}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.pgType};`);
      }
    } else {
      ddl = undeclaredTableDDL(name, columns, primaryKey);
      notes.push(`"${name}" is in the database and in no \`_Schema\` row; created from its literal SQLite shape.`);
    }

    tables.push({ name, kind, columns, primaryKey, rows, ddl });
  }

  return { source: sourceLabel, tables, searchIndexes, excluded, notes, totalRows };
}

/** DDL for a table nobody declared — its literal columns, its literal primary key. */
export function undeclaredTableDDL(name: string, columns: PlanColumn[], primaryKey: string[]): string[] {
  const defs = columns.map((c) => `  "${c.name}" ${c.pgType}`);
  if (primaryKey.length > 0) defs.push(`  PRIMARY KEY (${primaryKey.map((k) => `"${k}"`).join(', ')})`);
  return [`CREATE TABLE IF NOT EXISTS "${name}" (`, defs.join(',\n'), ');'];
}

/**
 * One SQLite value, as PostgreSQL needs it for `pgType`.
 *
 * 🔴 The `TIMESTAMPTZ` branch is the one that matters. `SchemaManager` stamps
 * `_Schema` with `CURRENT_TIMESTAMP`, which SQLite documents as UTC and spells
 * without a zone (`2026-07-25 16:19:32`). PostgreSQL reads a zoneless literal
 * in the **server's** timezone, so on any machine that is not UTC every such
 * row arrives shifted by the offset — a wrong time, in a column nothing
 * compares, discovered months later. The `Z` is appended here, once, where the
 * two spellings meet.
 */
export function coerceForPostgres(value: unknown, pgType: string): unknown {
  if (value === null || value === undefined) return null;

  if (pgType === 'TIMESTAMPTZ') {
    if (typeof value !== 'string') return value;
    if (value === '') return null;
    // `YYYY-MM-DD HH:MM:SS[.fff]` with no zone — SQLite's CURRENT_TIMESTAMP.
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
      return `${value.replace(' ', 'T')}Z`;
    }
    return value;
  }

  if (pgType === 'BOOLEAN') {
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      if (value === '') return null;
      if (value === '0' || value.toLowerCase() === 'false') return false;
      if (value === '1' || value.toLowerCase() === 'true') return true;
    }
    return value;
  }

  if (pgType === 'JSONB') {
    if (typeof value !== 'string') return value === null ? null : JSON.stringify(value);
    if (value === '') return null;
    return value; // already JSON text; PostgreSQL parses it and refuses garbage loudly
  }

  return value;
}
