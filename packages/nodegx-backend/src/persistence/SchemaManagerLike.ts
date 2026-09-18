/**
 * The `SchemaManager` surface this service actually calls (PLAT-004).
 *
 * The real class is untyped CommonJS in `@noodl/runtime`
 * (`api/adapters/local-sql/SchemaManager`) — PLAT-003's territory, not this
 * task's — and five modules here each declared their own `schemaManager: any`
 * because of it. `any` overstated the problem: what the modules need is not
 * "the whole SchemaManager typed", it is a written-down list of the sixteen
 * methods they call, and that is knowable today from the call sites.
 *
 * Written down once, a misspelled `sm.createTabel(...)` is a compile error
 * instead of a runtime `is not a function` in a route nobody exercises.
 *
 * Everything a table's `columns` carry stays `SchemaColumn`-shaped but loose:
 * column metadata is genuinely the adapter's to define, and inventing a strict
 * type here would be an assertion about someone else's data.
 *
 * When PLAT-003 types the adapter, this should be replaced by the real type —
 * it is a stand-in, and it says so on purpose.
 *
 * @module nodegx-backend/persistence/SchemaManagerLike
 */

/**
 * Deliberately NO index signature on either of these.
 *
 * `[option: string]: unknown` looks like the permissive choice and is the exact
 * opposite: an *interface* never satisfies a type with an index signature (it
 * gets no implicit one), so every caller passing its own `ColumnDef` /
 * `ImportColumn` would have had to cast — which is the failure mode this whole
 * file exists to remove. PLAT-004's §11 found the same trap in `keyUnion`; it
 * fired again here, on the first compile.
 */
export interface SchemaColumnLike {
  name: string;
  /** Optional: some import paths carry a column with no declared type yet. */
  type?: string;
  targetClass?: string;
}

export interface TableSchemaLike {
  name: string;
  columns?: SchemaColumnLike[];
  createdAt?: string;
  /** FED-002 — the indexes this collection declares, beyond createdAt/updatedAt. */
  indexes?: IndexDeclLike[];
}

/**
 * One declared index (FED-002), as `schema.json` carries it and as the adapter
 * reads it back. `fields` is one to four property names; the name is derived.
 */
export interface IndexDeclLike {
  fields: string[];
  unique?: boolean;
  order?: 'asc' | 'desc';
}

/** A declared index and whether SQLite has it — what the dashboard lists. */
export interface IndexStatusLike extends IndexDeclLike {
  name: string;
  unique: boolean;
  order: 'asc' | 'desc';
  built: boolean;
  /** False for an index that exists and nothing declares (drift). */
  declared: boolean;
}

/** What a reconcile did, and what the audit entry of a schema push names. */
export interface IndexReconcileReportLike {
  created: string[];
  dropped: string[];
  kept: string[];
  indexes: IndexDeclLike[];
}

export interface SchemaManagerLike {
  // --- tables and columns --------------------------------------------------
  createTable(spec: { name: string; columns: SchemaColumnLike[] }): boolean;
  addColumn(table: string, column: SchemaColumnLike): void;
  renameColumn(table: string, oldName: string, newName: string): void;
  /**
   * AAQ-002: change a column's type, converting stored values.
   *
   * Optional, and feature-detected at the one call site, for the same reason
   * `deleteTable` is: `SchemaManagerLike` describes the adapter *this* service
   * happens to be handed, and an older adapter predates the method. A route that
   * assumed it would fail with `is not a function` at request time.
   */
  changeColumnType?(
    table: string,
    column: string,
    newType: string
  ): { changed: boolean; from?: string; rebuilt?: boolean; convertedValues?: number };
  /** Optional: `schema-migrate` feature-detects it before calling. */
  deleteTable?(table: string): boolean;
  getTableSchema(table: string): TableSchemaLike | null;
  listTables(): string[];
  exportSchemas(): TableSchemaLike[];

  // --- export --------------------------------------------------------------
  generatePostgresSQL(): string;
  generateSupabaseSQL(): string;

  // --- declared indexes (FED-002) ------------------------------------------
  //
  // Optional and feature-detected at their call sites, for the same reason
  // `changeColumnType` is: this interface describes whatever adapter the
  // service was handed, and an older one predates the methods. A route that
  // assumed them would fail with `is not a function` at request time; instead
  // the two that are reachable over HTTP answer 501.
  /** Make SQLite's indexes match this declaration. Throws `code: 'INDEX_DUPLICATES'`. */
  reconcileIndexes?(table: string, indexes: unknown): IndexReconcileReportLike;
  /** Every declared index and whether it is built, plus anything built nobody declared. */
  indexStatus?(table: string): IndexStatusLike[];

  // --- FTS5 (BAK-008) ------------------------------------------------------
  hasFts5Support(): boolean;
  hasSearchIndex(collection: string): boolean;
  rebuildSearchIndex(collection: string, fields: string[], tokenizer?: string): unknown;
  dropSearchIndex(collection: string): void;

  // --- relations (BAK-003 roles) -------------------------------------------
  getRelatedIds(table: string, objectId: string, key: string): unknown;
  addRelation(table: string, objectId: string, key: string, relatedId: string): void;
  removeRelation(table: string, objectId: string, key: string, relatedId: string): void;
}
