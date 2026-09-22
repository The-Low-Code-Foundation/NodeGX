/**
 * BRG-005 §6.2 — the schema surface, on PostgreSQL.
 *
 * Implements `IStorageSchema` (`nodegx-backend-contract/src/storage.ts`) over a
 * `PgConnectionPool`. The data it manages is the same data the SQLite
 * `SchemaManager` manages — a `_Schema` row per collection, the two built-in
 * indexes, FED-002's declared indexes, `_Join_<key>_<Class>` junction tables
 * and BAK-008's search opt-in — and the DDL it runs is BRG-004's
 * (`postgres/ddl.ts`), so a table the migrator creates and a table this
 * creates on first write are the same table.
 *
 * ## 🔴 The interface is synchronous, and PostgreSQL is not
 *
 * Every member of `IStorageSchema` returns synchronously. That was correct as
 * a transcription (BRG-001 rule 1: declare what exists) — `SchemaManager` runs
 * on `node:sqlite`, which is synchronous — and BRG-002 de-synchronised the
 * **facade**, not the schema surface, because every caller of the schema
 * surface was synchronous too (`byob-admin` routes, `RoleStore`, `identities`,
 * `security/state.rolesForUser`, `SearchIndexer`, `backup`). A socket cannot
 * answer synchronously at any cost, so this class is built the only way it can
 * be: **the answers come from a model of the schema this process holds, and
 * the DDL is applied through a serialised queue that every data-plane call
 * waits on before it runs.**
 *
 * What that means, stated where an operator and the next session read it:
 *
 * - **Readers** (`listTables`, `getTableSchema`, `indexStatus`,
 *   `getRelatedIds`, `getRelationOwners`, `hasSearchIndex`, …) answer from the
 *   model. The model is primed from the live database at `connect()` and kept
 *   current by every mutation this process makes. Under R2's bound — *"one app
 *   process, a real database behind it"* — that is the truth. A second writer
 *   (the migrator run while the service is up, a `psql` session) is not seen
 *   until restart, and that is recorded as a declared divergence rather than
 *   hidden (`postgres/divergences.ts`).
 * - **Mutators** (`createTable`, `addColumn`, `reconcileIndexes`, `addRelation`,
 *   …) update the model immediately and enqueue the statement. The adapter's
 *   data plane calls {@link barrier} before every query, so a row written after
 *   `createTable` lands in a table that exists. A statement that FAILS undoes
 *   its model change and surfaces on the **next** data-plane call, which is
 *   the earliest place an asynchronous failure can be reported through a
 *   synchronous interface. It is never swallowed.
 * - **`reconcileIndexes` cannot pre-count duplicates.** The SQLite manager
 *   refuses a unique declaration over duplicate rows *before* touching the
 *   database and reports the count (FED-002 AC4). Here the database refuses
 *   it, atomically, at the queue — same outcome, later, with PostgreSQL's own
 *   detail instead of a count.
 *
 * The honest fix is BRG-D7: de-synchronise `IStorageSchema` the way BRG-002
 * de-synchronised the facade, and delete the queue. It is filed in BRG-005
 * §7, not done here, because it touches six callers in a package a peer is
 * live in.
 *
 * ## One state object, on purpose
 *
 * All mutable state lives in `this.s`. `conformance/mutants.ts` wraps a schema
 * manager with `Object.create(manager, { … })`, so a method can run with
 * `this` being the wrapper: reads reach the real manager through the prototype
 * chain, but an assignment to `this.x` would land on the wrapper and split the
 * state. Mutating the fields of one shared object cannot split.
 *
 * @module adapters/postgres/PgSchemaManager
 */

import { escapeColumn, escapeTable } from '../local-sql/QueryBuilder';
import {
  builtInIndexNames,
  checkWhereAgainstColumns,
  declaredProperties,
  indexName,
  junctionTableName,
  normalizeIndexDecls,
  POSTGRES_TYPE_MAP,
  sameIndexSignature,
  sanitizeIdent,
  SYSTEM_COLUMNS,
  TYPE_MAP,
  type BuiltIndex,
  type IndexDecl,
  type IndexReconcileReport,
  type IndexStatus,
  type IndexWhere,
  type SchemaColumn,
  type TableSchema
} from '../local-sql/schemaCommon';
import { columnToPostgres, declaredIndexDDL, junctionDDL, tableDDL } from './ddl';
import { translatePgError, PG_UNIQUE_VIOLATION } from './errors';
import type { PgConnectionPool } from './pool';

/** PostgreSQL truncates an identifier longer than this silently. Refused instead. */
export const PG_MAX_IDENTIFIER = 63;

/** What `rebuildSearchIndex` records — the field list is the whole index on this engine. */
export interface SearchOptIn {
  fields: string[];
  tokenizer: string;
}

/** The model. See the module note for why it is one object. */
interface SchemaState {
  /** Every base table in the current schema, `_`-prefixed ones included, in discovery order. */
  tables: Set<string>;
  /** The `_Schema` rows. */
  schemas: Map<string, TableSchema>;
  /** Live columns per table — the `information_schema.columns` reading, kept current. */
  columns: Map<string, Set<string>>;
  /** Declared-shape indexes per table that this class manages (`idx_<t>_…`, not the built-in pair). */
  built: Map<string, BuiltIndex[]>;
  /** junction → owningId → relatedIds. */
  relations: Map<string, Map<string, Set<string>>>;
  /** junction → relatedId → owningIds (the inverse, for the authorization path). */
  owners: Map<string, Map<string, Set<string>>>;
  /** collection → search opt-in. */
  search: Map<string, SearchOptIn>;
  /** The serialised DDL/DML queue. */
  queue: Promise<void>;
  /** A queued statement that failed, waiting to be thrown by the next barrier. */
  failure: Error | null;
  /** Statements enqueued and not yet finished. */
  pending: number;
}

/** A queued failure, naming the operation that failed so the reader knows where to look. */
export class SchemaQueueError extends Error {
  code: string;
  operation: string;
  cause: unknown;

  constructor(operation: string, cause: Error) {
    super(`${operation} failed on PostgreSQL: ${cause.message}`);
    this.name = 'SchemaQueueError';
    this.code = (cause as { code?: string }).code === PG_UNIQUE_VIOLATION ? 'INDEX_DUPLICATES' : 'SCHEMA_QUEUE_FAILED';
    this.operation = operation;
    this.cause = cause;
  }
}

/**
 * The two meta tables. **Exported** because BRG-004's migrator creates them on
 * a database this adapter has never opened, and a second copy of this DDL is
 * how the two silently stop agreeing about what `_Schema` looks like.
 */
export const META_DDL = `
CREATE TABLE IF NOT EXISTS "_Schema" (
  "name" TEXT PRIMARY KEY,
  "schema" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "_SearchIndex" (
  "name" TEXT PRIMARY KEY,
  "fields" TEXT NOT NULL,
  "tokenizer" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
`;

const UPSERT_SCHEMA =
  'INSERT INTO "_Schema" ("name", "schema", "updatedAt") VALUES (?, ?, NOW()) ' +
  'ON CONFLICT ("name") DO UPDATE SET "schema" = EXCLUDED."schema", "updatedAt" = NOW()';

/**
 * Parse one `pg_indexes.indexdef` into the shape `indexStatus` reports, or null for anything exotic.
 *
 * HLT-016 W3: a partial index's definition ends in ` WHERE (…)`, and before
 * this read it the whole definition failed to match, so a partial index
 * vanished from the model on the first restart and the next push recreated
 * it. The predicate is not parsed back (PostgreSQL rewrites it: `IN` becomes
 * `= ANY (ARRAY[…])`); the derived name carries its hash instead.
 */
export function parseIndexDef(
  indexdef: string
): { name: string; unique: boolean; fields: string[]; order: 'asc' | 'desc'; partial: boolean } | null {
  const m = /^CREATE (UNIQUE )?INDEX (\S+) ON \S+ USING btree \((.*?)\)( WHERE .*)?$/.exec(indexdef);
  if (!m) return null;
  const name = m[2].replace(/^"|"$/g, '');
  const parts = m[3].split(',').map((p) => p.trim());
  const fields: string[] = [];
  let order: 'asc' | 'desc' = 'asc';
  for (let i = 0; i < parts.length; i++) {
    const fm = /^("?)([^"\s]+)\1(?:\s+(ASC|DESC))?$/.exec(parts[i]);
    if (!fm) return null; // an expression index — not one this class made
    fields.push(fm[2]);
    if (i === 0 && fm[3] === 'DESC') order = 'desc';
  }
  return { name, unique: Boolean(m[1]), fields, order, partial: Boolean(m[4]) };
}

export class PgSchemaManager {
  static SchemaQueueError = SchemaQueueError;

  readonly pool: PgConnectionPool;
  readonly s: SchemaState;

  constructor(pool: PgConnectionPool) {
    this.pool = pool;
    this.s = {
      tables: new Set(),
      schemas: new Map(),
      columns: new Map(),
      built: new Map(),
      relations: new Map(),
      owners: new Map(),
      search: new Map(),
      queue: Promise.resolve(),
      failure: null,
      pending: 0
    };
  }

  // ===========================================================================
  // Priming the model from the live database
  // ===========================================================================

  /** Create the two meta tables and read everything the model needs. Called once, by `connect()`. */
  async load(): Promise<void> {
    await this.pool.run(META_DDL);
    const st = this.s;

    const tables = await this.pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables ` +
        `WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY table_name`
    );
    for (const t of tables) st.tables.add(t.table_name);

    const cols = await this.pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns ` +
        `WHERE table_schema = current_schema() ORDER BY table_name, ordinal_position`
    );
    for (const c of cols) {
      if (!st.columns.has(c.table_name)) st.columns.set(c.table_name, new Set());
      st.columns.get(c.table_name)!.add(c.column_name);
    }

    const rows = await this.pool.query<{ name: string; schema: string | Record<string, unknown> }>(
      'SELECT "name", "schema" FROM "_Schema"'
    );
    for (const r of rows) {
      const parsed = typeof r.schema === 'string' ? JSON.parse(r.schema) : r.schema;
      st.schemas.set(r.name, parsed as TableSchema);
    }

    const idx = await this.pool.query<{ tablename: string; indexname: string; indexdef: string }>(
      `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema() AND indexname LIKE 'idx\\_%'`
    );
    for (const i of idx) {
      const prefix = `idx_${sanitizeIdent(i.tablename)}_`;
      if (!i.indexname.startsWith(prefix)) continue;
      if (builtInIndexNames(i.tablename).includes(i.indexname)) continue;
      if (i.indexname.startsWith('idx__Join_')) continue;
      const parsed = parseIndexDef(i.indexdef);
      if (!parsed) continue;
      if (!st.built.has(i.tablename)) st.built.set(i.tablename, []);
      st.built.get(i.tablename)!.push(parsed);
    }

    for (const t of st.tables) {
      if (!t.startsWith('_Join_')) continue;
      const edges = await this.pool.query<{ owningId: string; relatedId: string }>(
        `SELECT "owningId", "relatedId" FROM ${escapeTable(t)}`
      );
      this._junction(t);
      for (const e of edges) this._link(t, e.owningId, e.relatedId);
    }

    const search = await this.pool.query<{ name: string; fields: string; tokenizer: string }>(
      'SELECT "name", "fields", "tokenizer" FROM "_SearchIndex"'
    );
    for (const r of search) {
      st.search.set(r.name, { fields: JSON.parse(r.fields), tokenizer: r.tokenizer });
    }
  }

  // ===========================================================================
  // The queue
  // ===========================================================================

  /**
   * Run `work` after everything enqueued before it. A failure undoes the model
   * change (`undo`) and is thrown by the next {@link barrier}.
   */
  private enqueue(operation: string, work: () => Promise<void>, undo?: () => void): void {
    const st = this.s;
    st.pending += 1;
    st.queue = st.queue.then(async () => {
      try {
        await work();
      } catch (e) {
        if (undo) undo();
        const err = translatePgError(e);
        // The first failure is the one that explains the rest; keep it.
        if (!st.failure) st.failure = new SchemaQueueError(operation, err);
      } finally {
        st.pending -= 1;
      }
    });
  }

  /**
   * Wait for every queued statement; throw the first failure, once.
   *
   * The adapter calls this before every data-plane statement. It is also the
   * only place a queued failure is reported, which is why it must be called
   * rather than the queue merely awaited.
   */
  async barrier(): Promise<void> {
    await this.s.queue;
    if (this.s.failure) {
      const f = this.s.failure;
      this.s.failure = null;
      throw f;
    }
  }

  /** Wait for the queue without throwing — for shutdown. Returns the swallowed failure, if any. */
  async drain(): Promise<Error | null> {
    await this.s.queue;
    const f = this.s.failure;
    this.s.failure = null;
    return f;
  }

  /** Statements enqueued and not yet applied — `/health` shows it. */
  pendingStatements(): number {
    return this.s.pending;
  }

  // ===========================================================================
  // IStorageSchema — tables and columns
  // ===========================================================================

  hasTable(name: string): boolean {
    return this.s.tables.has(name);
  }

  /** Every column the table has right now, or undefined when the table is unknown (DEF-014's "no substitution"). */
  tableColumns(tableName: string): Set<string> {
    return new Set(this.s.columns.get(tableName) || []);
  }

  createTable(schema: TableSchema): boolean {
    const st = this.s;
    const name = schema.name;
    if (st.tables.has(name)) return false;

    const stored: TableSchema = { ...schema, columns: [...(schema.columns || [])] };
    // Built synchronously so a refusal (`MigrationRefusal`, an unknown type) is
    // thrown to the caller, not queued.
    const ddl = tableDDL(stored).join('\n');

    const columns = new Set<string>(SYSTEM_COLUMNS);
    for (const col of stored.columns || []) {
      if (col.type !== 'Relation' && TYPE_MAP[col.type] && POSTGRES_TYPE_MAP[col.type]) columns.add(col.name);
    }
    const junctions: string[] = [];
    for (const col of stored.columns || []) {
      if (col.type === 'Relation' && col.targetClass) {
        junctions.push(junctionTableName(sanitizeIdent(name), sanitizeIdent(col.name)));
      }
    }
    const declared = normalizeIndexDecls(stored.indexes);
    // HLT-016 W1: refused here, synchronously, like a MigrationRefusal above —
    // a type mismatch in a predicate would otherwise fail at the queue.
    const typeOf = (field: string): string | undefined =>
      field === 'objectId' ? 'String' : declaredProperties(stored)?.[field]?.type;
    for (const d of declared) if (d.where) checkWhereAgainstColumns(name, d.where, columns, typeOf);

    st.tables.add(name);
    st.columns.set(name, columns);
    st.schemas.set(name, stored);
    st.built.set(
      name,
      declared.map((d) => ({
        name: indexName(name, d.fields, d.where),
        fields: [...d.fields],
        unique: d.unique === true,
        order: d.order === 'desc' ? 'desc' : 'asc',
        partial: d.where !== undefined
      }))
    );
    for (const j of junctions) this._junction(j);

    this.enqueue(
      `createTable("${name}")`,
      async () => {
        await this.pool.run(ddl);
        await this.pool.run(UPSERT_SCHEMA, [name, JSON.stringify(stored)]);
      },
      () => {
        st.tables.delete(name);
        st.columns.delete(name);
        st.schemas.delete(name);
        st.built.delete(name);
        for (const j of junctions) {
          st.tables.delete(j);
          st.relations.delete(j);
          st.owners.delete(j);
        }
      }
    );
    return true;
  }

  addColumn(tableName: string, column: SchemaColumn): void {
    const st = this.s;
    if (!st.tables.has(tableName)) throw new Error(`no such table: ${tableName}`);
    if (!TYPE_MAP[column.type]) return; // Relations and unknown types: not a column on either engine
    const cols = st.columns.get(tableName)!;
    if (cols.has(column.name)) return; // "duplicate column name" — SQLite swallows it too

    const schema = st.schemas.get(tableName);
    const def = columnToPostgres(schema || { name: tableName }, column);
    if (!def) return;

    cols.add(column.name);
    let recorded = false;
    if (schema) {
      schema.columns = schema.columns || [];
      schema.columns.push(column);
      recorded = true;
    }
    const snapshot = schema ? JSON.stringify(schema) : null;

    this.enqueue(
      `addColumn("${tableName}", "${column.name}")`,
      async () => {
        await this.pool.run(`ALTER TABLE ${escapeTable(tableName)} ADD COLUMN IF NOT EXISTS ${def}`);
        if (snapshot !== null) await this.pool.run(UPSERT_SCHEMA, [tableName, snapshot]);
      },
      () => {
        cols.delete(column.name);
        if (recorded && schema && schema.columns) {
          schema.columns = schema.columns.filter((c) => c !== column);
        }
      }
    );
  }

  deleteTable(tableName: string): boolean {
    const st = this.s;
    if (!st.tables.has(tableName)) return false;

    const junctions = [...st.tables].filter((t) => t.startsWith('_Join_') && t.endsWith(`_${tableName}`));
    const removed = {
      schema: st.schemas.get(tableName),
      columns: st.columns.get(tableName),
      built: st.built.get(tableName),
      search: st.search.get(tableName),
      junctions: junctions.map((j) => ({ j, rel: st.relations.get(j), own: st.owners.get(j) }))
    };
    st.tables.delete(tableName);
    st.schemas.delete(tableName);
    st.columns.delete(tableName);
    st.built.delete(tableName);
    st.search.delete(tableName);
    for (const j of junctions) {
      st.tables.delete(j);
      st.relations.delete(j);
      st.owners.delete(j);
    }

    this.enqueue(
      `deleteTable("${tableName}")`,
      async () => {
        await this.pool.transaction(async (tx) => {
          await tx.run(`DROP TABLE IF EXISTS ${escapeTable(tableName)}`);
          for (const j of junctions) await tx.run(`DROP TABLE IF EXISTS ${escapeTable(j)}`);
          await tx.run('DELETE FROM "_Schema" WHERE "name" = ?', [tableName]);
          await tx.run('DELETE FROM "_SearchIndex" WHERE "name" = ?', [tableName]);
        });
      },
      () => {
        st.tables.add(tableName);
        if (removed.schema) st.schemas.set(tableName, removed.schema);
        if (removed.columns) st.columns.set(tableName, removed.columns);
        if (removed.built) st.built.set(tableName, removed.built);
        if (removed.search) st.search.set(tableName, removed.search);
        for (const { j, rel, own } of removed.junctions) {
          st.tables.add(j);
          if (rel) st.relations.set(j, rel);
          if (own) st.owners.set(j, own);
        }
      }
    );
    return true;
  }

  renameColumn(tableName: string, oldName: string, newName: string): boolean {
    if (!newName || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newName)) {
      throw new Error('Invalid column name');
    }
    if (SYSTEM_COLUMNS.includes(oldName)) {
      throw new Error('Cannot rename system columns');
    }
    const st = this.s;
    if (!st.tables.has(tableName)) throw new Error(`no such table: ${tableName}`);
    const cols = st.columns.get(tableName)!;
    if (!cols.has(oldName)) throw new Error(`Column "${oldName}" does not exist`);

    cols.delete(oldName);
    cols.add(newName);
    const schema = st.schemas.get(tableName);
    const col = schema && schema.columns ? schema.columns.find((c) => c.name === oldName) : undefined;
    if (col) col.name = newName;
    const snapshot = schema && col ? JSON.stringify(schema) : null;

    this.enqueue(
      `renameColumn("${tableName}", "${oldName}" → "${newName}")`,
      async () => {
        await this.pool.transaction(async (tx) => {
          await tx.run(
            `ALTER TABLE ${escapeTable(tableName)} RENAME COLUMN ${escapeColumn(oldName)} TO ${escapeColumn(newName)}`
          );
          if (snapshot !== null) await tx.run(UPSERT_SCHEMA, [tableName, snapshot]);
        });
      },
      () => {
        cols.delete(newName);
        cols.add(oldName);
        if (col) col.name = oldName;
      }
    );
    return true;
  }

  /**
   * AAQ-002. The metadata changes at once; a change that crosses a PostgreSQL
   * type is an `ALTER COLUMN … TYPE … USING` and PostgreSQL refuses a value it
   * cannot cast rather than writing `0` for it as SQLite's `CAST` does — so
   * `convertedValues` is not reported: nothing here converts silently.
   */
  changeColumnType(
    tableName: string,
    columnName: string,
    newType: string
  ): { changed: boolean; from?: string; rebuilt?: boolean; convertedValues?: number } {
    if (SYSTEM_COLUMNS.includes(columnName)) {
      throw new Error('Cannot change the type of system columns');
    }
    if (!(newType in TYPE_MAP)) {
      throw new Error(`Unknown column type "${newType}"`);
    }
    const st = this.s;
    const schema = st.schemas.get(tableName);
    if (!schema || !st.tables.has(tableName)) {
      throw new Error(`Table "${tableName}" does not exist`);
    }
    const col = (schema.columns || []).find((c) => c.name === columnName);
    if (!col) {
      throw new Error(`Column "${columnName}" does not exist`);
    }
    const oldType = col.type;
    if (oldType === newType) return { changed: false };
    if (oldType === 'Relation' || newType === 'Relation') {
      throw new Error(
        `Cannot convert "${columnName}" between ${oldType} and ${newType}: a Relation is stored in a junction ` +
          'table, not a column. Delete it and add it back to change it.'
      );
    }

    const oldPg = POSTGRES_TYPE_MAP[oldType];
    const newPg = POSTGRES_TYPE_MAP[newType];
    const rebuilt = typeof oldPg === 'string' && typeof newPg === 'string' && oldPg !== newPg;

    col.type = newType;
    const snapshot = JSON.stringify(schema);

    this.enqueue(
      `changeColumnType("${tableName}", "${columnName}" → ${newType})`,
      async () => {
        await this.pool.transaction(async (tx) => {
          if (rebuilt) {
            const c = escapeColumn(columnName);
            await tx.run(`ALTER TABLE ${escapeTable(tableName)} ALTER COLUMN ${c} TYPE ${newPg} USING ${c}::${newPg}`);
          }
          await tx.run(UPSERT_SCHEMA, [tableName, snapshot]);
        });
      },
      () => {
        col.type = oldType;
      }
    );
    return { changed: true, from: oldType, rebuilt };
  }

  getTableSchema(tableName: string): TableSchema | null {
    return this.s.schemas.get(tableName) || null;
  }

  listTables(): string[] {
    return [...this.s.tables].filter((t) => !t.startsWith('_'));
  }

  exportSchemas(): TableSchema[] {
    // Same `_%` filter as the SQLite manager — parity, and the same finding
    // ([[a-friendly-filter-in-a-reader-is-data-loss-in-a-copier]]).
    return [...this.s.schemas.values()].filter((s) => !s.name.startsWith('_'));
  }

  // ===========================================================================
  // IStorageSchema — relations
  // ===========================================================================

  private _junction(table: string): void {
    const st = this.s;
    st.tables.add(table);
    if (!st.relations.has(table)) st.relations.set(table, new Map());
    if (!st.owners.has(table)) st.owners.set(table, new Map());
    if (!st.columns.has(table)) st.columns.set(table, new Set(['owningId', 'relatedId']));
  }

  private _link(table: string, owningId: string, relatedId: string): boolean {
    const st = this.s;
    const rel = st.relations.get(table)!;
    if (!rel.has(owningId)) rel.set(owningId, new Set());
    const set = rel.get(owningId)!;
    if (set.has(relatedId)) return false;
    set.add(relatedId);
    const own = st.owners.get(table)!;
    if (!own.has(relatedId)) own.set(relatedId, new Set());
    own.get(relatedId)!.add(owningId);
    return true;
  }

  private _unlink(table: string, owningId: string, relatedId: string): boolean {
    const st = this.s;
    const set = st.relations.get(table)?.get(owningId);
    if (!set || !set.has(relatedId)) return false;
    set.delete(relatedId);
    st.owners.get(table)?.get(relatedId)?.delete(owningId);
    return true;
  }

  addRelation(owningClass: string, owningId: string, relationName: string, targetId: string): void {
    const table = junctionTableName(owningClass, relationName);
    const st = this.s;
    const create = !st.tables.has(table);
    if (create) this._junction(table);
    const added = this._link(table, owningId, targetId);

    this.enqueue(
      `addRelation("${owningClass}", "${relationName}")`,
      async () => {
        if (create) await this.pool.run(junctionDDL(table).join('\n'));
        await this.pool.run(
          `INSERT INTO ${escapeTable(table)} ("owningId", "relatedId") VALUES (?, ?) ON CONFLICT DO NOTHING`,
          [owningId, targetId]
        );
      },
      () => {
        if (added) this._unlink(table, owningId, targetId);
      }
    );
  }

  removeRelation(owningClass: string, owningId: string, relationName: string, targetId: string): void {
    const table = junctionTableName(owningClass, relationName);
    if (!this.s.tables.has(table)) return;
    const removed = this._unlink(table, owningId, targetId);

    this.enqueue(
      `removeRelation("${owningClass}", "${relationName}")`,
      async () => {
        await this.pool.run(`DELETE FROM ${escapeTable(table)} WHERE "owningId" = ? AND "relatedId" = ?`, [
          owningId,
          targetId
        ]);
      },
      () => {
        if (removed) this._link(table, owningId, targetId);
      }
    );
  }

  getRelatedIds(owningClass: string, owningId: string, relationName: string): string[] {
    const set = this.s.relations.get(junctionTableName(owningClass, relationName))?.get(owningId);
    return set ? [...set] : [];
  }

  getRelationOwners(owningClass: string, relationName: string, relatedId: string): string[] {
    const set = this.s.owners.get(junctionTableName(owningClass, relationName))?.get(relatedId);
    return set ? [...set] : [];
  }

  // ===========================================================================
  // IStorageSchema — declared indexes (FED-002)
  // ===========================================================================

  builtInIndexNames(tableName: string): string[] {
    return builtInIndexNames(tableName);
  }

  indexName(tableName: string, fields: string[], where?: IndexWhere): string {
    return indexName(tableName, fields, where);
  }

  declaredIndexes(tableName: string): IndexDecl[] {
    const schema = this.getTableSchema(tableName);
    return normalizeIndexDecls(schema ? schema.indexes : undefined);
  }

  builtIndexes(tableName: string): BuiltIndex[] {
    return (this.s.built.get(tableName) || []).map((b) => ({ ...b, fields: [...b.fields] }));
  }

  indexStatus(tableName: string): IndexStatus[] {
    const built = new Map(this.builtIndexes(tableName).map((b) => [b.name, b]));
    const out: IndexStatus[] = [];

    for (const decl of this.declaredIndexes(tableName)) {
      const name = indexName(tableName, decl.fields, decl.where);
      const b = built.get(name);
      out.push({
        name,
        fields: [...decl.fields],
        unique: decl.unique === true,
        order: decl.order === 'desc' ? 'desc' : 'asc',
        ...(decl.where ? { where: decl.where } : {}),
        built: Boolean(b && sameIndexSignature(b, decl)),
        declared: true
      });
      built.delete(name);
    }
    for (const b of built.values()) {
      out.push({ name: b.name, fields: b.fields, unique: b.unique, order: b.order, built: true, declared: false });
    }
    return out;
  }

  reconcileIndexes(tableName: string, indexes: unknown): IndexReconcileReport {
    const st = this.s;
    if (!st.tables.has(tableName)) throw new Error(`Table "${tableName}" does not exist`);

    const desired = normalizeIndexDecls(indexes);
    const before = this.builtIndexes(tableName);
    const built = new Map(before.map((b) => [b.name, b]));
    const builtIn = new Set(builtInIndexNames(tableName));
    const columns = st.columns.get(tableName) || new Set<string>();
    const seen = new Set<string>();

    const typeOf = (field: string): string | undefined =>
      field === 'objectId' ? 'String' : declaredProperties(this.getTableSchema(tableName))?.[field]?.type;

    // ---- Checks. All of them, before anything is queued. -------------------
    for (const decl of desired) {
      const name = indexName(tableName, decl.fields, decl.where);
      if (builtIn.has(name)) {
        throw new Error(
          `"${decl.fields.join(', ')}" is always indexed on "${tableName}" — createdAt and updatedAt ` +
            'cannot be declared, and cannot be declared away.'
        );
      }
      if (seen.has(name)) {
        throw new Error(`"${tableName}" declares the index on (${decl.fields.join(', ')}) twice.`);
      }
      seen.add(name);
      if (name.length > PG_MAX_IDENTIFIER) {
        // PostgreSQL would truncate the name silently and every later reading
        // of it by name would miss — the index would exist under a name nothing
        // derives. Refused instead.
        throw new Error(
          `The index on (${decl.fields.join(', ')}) for "${tableName}" would be named "${name}", ` +
            `${name.length} characters, and PostgreSQL truncates identifiers at ${PG_MAX_IDENTIFIER}. ` +
            'Shorten the collection or property names.'
        );
      }
      for (const field of decl.fields) {
        if (!columns.has(field)) {
          throw new Error(
            `Cannot index "${field}" on "${tableName}": the collection has no such property. ` +
              'A column here exists once something has written it, so declare the column first.'
          );
        }
      }
      if (decl.where) checkWhereAgainstColumns(tableName, decl.where, columns, typeOf);
    }

    // ---- Apply to the model ----------------------------------------------
    const created: string[] = [];
    const dropped: string[] = [];
    const kept: string[] = [];
    const statements: string[] = [];

    for (const [name] of built) {
      if (!seen.has(name)) {
        statements.push(`DROP INDEX IF EXISTS ${escapeTable(name)}`);
        dropped.push(name);
      }
    }
    const after: BuiltIndex[] = [];
    for (const decl of desired) {
      const name = indexName(tableName, decl.fields, decl.where);
      const already = built.get(name);
      const shape: BuiltIndex = {
        name,
        fields: [...decl.fields],
        unique: decl.unique === true,
        order: decl.order === 'desc' ? 'desc' : 'asc',
        partial: decl.where !== undefined
      };
      after.push(shape);
      if (already && sameIndexSignature(already, decl)) {
        kept.push(name);
        continue;
      }
      if (already) statements.push(`DROP INDEX IF EXISTS ${escapeTable(name)}`);
      statements.push(declaredIndexDDL(tableName, decl).replace(/;$/, ''));
      created.push(name);
    }

    const schema = st.schemas.get(tableName) || { name: tableName };
    const previousDecl = schema.indexes;
    if (desired.length > 0) schema.indexes = desired;
    else delete schema.indexes;
    st.schemas.set(tableName, schema);
    st.built.set(tableName, after);
    const snapshot = JSON.stringify(schema);

    this.enqueue(
      `reconcileIndexes("${tableName}")`,
      async () => {
        // DDL is transactional on PostgreSQL: the whole reconcile lands or none
        // of it does — the same promise the SQLite manager's SAVEPOINT makes.
        await this.pool.transaction(async (tx) => {
          for (const s of statements) await tx.run(s);
          await tx.run(UPSERT_SCHEMA, [tableName, snapshot]);
        });
      },
      () => {
        st.built.set(tableName, before);
        if (previousDecl !== undefined) schema.indexes = previousDecl;
        else delete schema.indexes;
      }
    );

    return { created, dropped, kept, indexes: desired };
  }

  // ===========================================================================
  // IStorageSchema — full-text search (BAK-008, as tsvector — AC6)
  // ===========================================================================

  /** The engine has text search — `tsvector` is core PostgreSQL. */
  hasFts5Support(): boolean {
    return true;
  }

  hasSearchIndex(tableName: string): boolean {
    return this.s.search.has(tableName);
  }

  /** The indexed fields the adapter's `search()` binds, or null when search is not enabled. */
  searchFields(tableName: string): string[] | null {
    const opt = this.s.search.get(tableName);
    return opt ? [...opt.fields] : null;
  }

  /**
   * Record the opt-in. Nothing is materialised: the `tsvector` is computed per
   * row (`postgres/search.ts`), so "rebuild" is the field list being written
   * down. `tokenizer` is accepted for signature parity and recorded, but the
   * configuration is always `'simple'` — the one that matches FTS5's.
   */
  rebuildSearchIndex(
    tableName: string,
    fields: string[],
    tokenizer = 'unicode61'
  ): { tableName: string; fields: string[]; tokenizer: string; materialised: false; elapsedMs: number } {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error('createSearchIndex requires at least one field to index');
    }
    const st = this.s;
    if (!st.tables.has(tableName)) throw new Error(`no such table: ${tableName}`);
    const columns = st.columns.get(tableName) || new Set<string>();
    for (const f of fields) {
      if (!columns.has(f)) {
        throw new Error(`Cannot index "${f}" on "${tableName}" for search: the collection has no such property.`);
      }
    }
    const start = Date.now();
    const safeTokenizer = String(tokenizer || 'unicode61').replace(/[^a-zA-Z0-9_]/g, '');
    const previous = st.search.get(tableName);
    st.search.set(tableName, { fields: [...fields], tokenizer: safeTokenizer });

    this.enqueue(
      `rebuildSearchIndex("${tableName}")`,
      async () => {
        await this.pool.run(
          'INSERT INTO "_SearchIndex" ("name", "fields", "tokenizer", "updatedAt") VALUES (?, ?, ?, NOW()) ' +
            'ON CONFLICT ("name") DO UPDATE SET "fields" = EXCLUDED."fields", "tokenizer" = EXCLUDED."tokenizer", "updatedAt" = NOW()',
          [tableName, JSON.stringify(fields), safeTokenizer]
        );
      },
      () => {
        if (previous) st.search.set(tableName, previous);
        else st.search.delete(tableName);
      }
    );

    return { tableName, fields: [...fields], tokenizer: safeTokenizer, materialised: false, elapsedMs: Date.now() - start };
  }

  dropSearchIndex(tableName: string): void {
    const st = this.s;
    const previous = st.search.get(tableName);
    if (!previous) return;
    st.search.delete(tableName);
    this.enqueue(
      `dropSearchIndex("${tableName}")`,
      async () => {
        await this.pool.run('DELETE FROM "_SearchIndex" WHERE "name" = ?', [tableName]);
      },
      () => {
        st.search.set(tableName, previous);
      }
    );
  }
}
