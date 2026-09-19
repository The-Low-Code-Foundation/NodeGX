/**
 * What a collection's schema IS, independently of which engine stores it.
 *
 * BRG-005 §6.2. `SchemaManager` (SQLite) and `PgSchemaManager` (PostgreSQL)
 * both track the same `_Schema` row shape, derive the same index names, name
 * the same junction tables and refuse the same malformed declarations. Until
 * this file existed every one of those lived as a private of `SchemaManager`,
 * which left the second manager two choices: reach into the first one's
 * privates, or copy them — and a copy is
 * [[a-second-copy-of-a-palette-drifts-silently]] arriving on schedule.
 *
 * Nothing here touches a database. It is the vocabulary, and the two maps that
 * `generatePostgresSQL` was already publishing as `SchemaManager.TYPE_MAPS` so
 * the portability invariant between them could be asserted instead of believed.
 *
 * @module adapters/local-sql/schemaCommon
 */

/** One column of a collection schema, as the editor's data model persists it. */
export interface SchemaColumn {
  name: string;
  type: string;
  /** Relations only: the class on the other side of the junction table. */
  targetClass?: string;
  required?: boolean;
  defaultValue?: unknown;
}

/** A collection's schema as tracked in the `_Schema` table. */
export interface TableSchema {
  name: string;
  columns?: SchemaColumn[];
  /** FED-002: the indexes this collection declares, beyond the built-in pair. */
  indexes?: IndexDecl[];
  [extra: string]: unknown;
}

/**
 * One declared index on a collection, as `schema.json` carries it (FED-002).
 *
 * `fields` is one to four property names of that collection; `unique` defaults
 * to false; `order` applies to every field of the index and defaults to `asc`.
 * There is no `name` — it is derived, so that the same fields are the same
 * index however two people spelled the declaration.
 */
export interface IndexDecl {
  fields: string[];
  unique?: boolean;
  order?: 'asc' | 'desc';
}

/** An index the engine actually has, as it reports it. */
export interface BuiltIndex {
  name: string;
  fields: string[];
  unique: boolean;
  order: 'asc' | 'desc';
}

/** A declared index and whether it is built — plus drift, which is neither. */
export interface IndexStatus extends BuiltIndex {
  built: boolean;
  /** False for an index that exists but nothing declares (hand-made, or drift). */
  declared: boolean;
}

/** What a reconcile did, and what the audit record of a schema push names. */
export interface IndexReconcileReport {
  created: string[];
  dropped: string[];
  kept: string[];
  /** The declaration as it was stored, normalized. */
  indexes: IndexDecl[];
}

/**
 * Map Noodl/Parse types to SQLite types
 */
export const TYPE_MAP: Record<string, string | null> = {
  String: 'TEXT',
  Number: 'REAL',
  Boolean: 'INTEGER', // SQLite uses 0/1
  Date: 'TEXT', // ISO8601 string
  Object: 'TEXT', // JSON string
  Array: 'TEXT', // JSON string
  Pointer: 'TEXT', // objectId reference
  Relation: null, // Handled via junction tables
  GeoPoint: 'TEXT', // JSON string
  File: 'TEXT' // JSON string with url/name
};

/**
 * Map Noodl types to PostgreSQL types.
 *
 * Shared by the export (BRG-004) and the live adapter (BRG-005): a column the
 * migrator creates and a column the adapter creates on first write are the
 * same column, because they come from the same line.
 */
export const POSTGRES_TYPE_MAP: Record<string, string | null> = {
  String: 'TEXT',
  Number: 'NUMERIC',
  Boolean: 'BOOLEAN',
  Date: 'TIMESTAMPTZ',
  Object: 'JSONB',
  Array: 'JSONB',
  Pointer: 'TEXT', // or UUID with FK
  Relation: null,
  // The built-in adapter stores a GeoPoint as a JSON string and `SQL_DISTANCE_KM`
  // reads it back as one, so JSONB is what the column actually holds. `POINT`,
  // with the comment "or use PostGIS", was a column the app could not read.
  GeoPoint: 'JSONB',
  File: 'JSONB'
};

/** The four columns every collection table has before a schema names one. */
export const SYSTEM_COLUMNS: readonly string[] = Object.freeze(['objectId', 'createdAt', 'updatedAt', 'ACL']);

/** The identifier rule `escapeTable`/`escapeColumn` already apply, for names. */
export function sanitizeIdent(name: string): string {
  return String(name).replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * A PostgreSQL literal. Only ever wraps names and declared defaults, never a
 * caller's data — but it doubles the quote anyway, because the next thing this
 * function is used for is always one step closer to data.
 */
export function quoteLiteral(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * The junction table a relation's rows live in.
 *
 * 🔴 The NAME is the SQLite adapter's private storage convention
 * (`getRelationOwners`' docstring, BRG-002 §6.1) — and the PostgreSQL adapter
 * reproduces it exactly so that a database the migrator filled and a database
 * the adapter filled agree about where a relation is. It is derived in one
 * place for that reason.
 */
export function junctionTableName(owningClass: string, relationName: string): string {
  return `_Join_${relationName}_${owningClass}`;
}

/** The two indexes every table gets on creation. They cannot be declared away. */
export function builtInIndexNames(tableName: string): string[] {
  const t = sanitizeIdent(tableName);
  return [`idx_${t}_createdAt`, `idx_${t}_updatedAt`];
}

/**
 * The derived name of a declared index — never written by a person, so that
 * two declarations of the same fields are the same index however they were
 * spelled, and a declaration removed from `schema.json` has a name to drop.
 */
export function indexName(tableName: string, fields: string[]): string {
  return `idx_${sanitizeIdent(tableName)}_${fields.map(sanitizeIdent).join('_')}`;
}

/**
 * Read an `indexes` declaration, or refuse it. Loud rather than lenient: an
 * index declaration that is quietly dropped because it was mis-shaped is a
 * collection that quietly full-scans, and a `unique` that was quietly ignored
 * is a dedupe guarantee that quietly is not one.
 */
export function normalizeIndexDecls(raw: unknown): IndexDecl[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error('"indexes" must be an array of index declarations');

  return raw.map((entry, i) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`indexes[${i}] must be an object like { "fields": ["id"], "unique": true }`);
    }
    const e = entry as Record<string, unknown>;
    for (const key of Object.keys(e)) {
      if (key !== 'fields' && key !== 'unique' && key !== 'order') {
        throw new Error(`indexes[${i}]: unknown key "${key}" (expected fields, unique, order)`);
      }
    }
    if (!Array.isArray(e.fields) || e.fields.length === 0 || e.fields.length > 4) {
      throw new Error(`indexes[${i}].fields must be an array of one to four property names`);
    }
    const fields = e.fields.map((f) => {
      if (typeof f !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f)) {
        throw new Error(`indexes[${i}].fields: ${JSON.stringify(f)} is not a valid property name`);
      }
      return f;
    });
    if (new Set(fields).size !== fields.length) {
      throw new Error(`indexes[${i}].fields names the same property twice`);
    }
    if (e.unique !== undefined && typeof e.unique !== 'boolean') {
      throw new Error(`indexes[${i}].unique must be true or false`);
    }
    if (e.order !== undefined && e.order !== 'asc' && e.order !== 'desc') {
      throw new Error(`indexes[${i}].order must be "asc" or "desc"`);
    }

    const decl: IndexDecl = { fields };
    if (e.unique === true) decl.unique = true;
    if (e.order === 'desc') decl.order = 'desc';
    return decl;
  });
}

/** Whether a built index is the index a declaration asks for. */
export function sameIndexSignature(built: BuiltIndex, decl: IndexDecl): boolean {
  return (
    built.unique === (decl.unique === true) &&
    built.order === (decl.order === 'desc' ? 'desc' : 'asc') &&
    built.fields.length === decl.fields.length &&
    built.fields.every((f, i) => f === decl.fields[i])
  );
}

/**
 * Something the export will not carry across, named.
 *
 * BRG-004's person sentence is *"if anything at all could not be carried
 * across, the command says so by name and refuses rather than half-doing it"*,
 * and every construct this phase found had done the opposite: a relation column
 * vanished on an `if (pgType)`, a unique index was never emitted, and an ACL
 * became `USING (true)`. None of those threw anything.
 *
 * Carries `construct` and `table` as fields rather than only a sentence, for
 * the same reason `IndexDuplicatesError` carries its numbers: the caller has to
 * put this in front of a person, and a carry report that can only quote a
 * sentence cannot group by what failed.
 */
export class MigrationRefusal extends Error {
  code: string;
  construct: string;
  table?: string;
  detail?: Record<string, unknown>;

  constructor(message: string, construct: string, table?: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = 'MigrationRefusal';
    this.code = 'CANNOT_CROSS';
    this.construct = construct;
    this.table = table;
    this.detail = detail;
  }
}

/**
 * The column type a written value implies — the rule `create()`/`save()` use to
 * add a column on first write. One function, so the two adapters cannot infer
 * two different types for one value.
 */
export function inferType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'String';
  }
  if (typeof value === 'string') {
    return 'String';
  }
  if (typeof value === 'number') {
    return 'Number';
  }
  if (typeof value === 'boolean') {
    return 'Boolean';
  }
  if (value instanceof Date) {
    return 'Date';
  }
  if (Array.isArray(value)) {
    return 'Array';
  }
  if (typeof value === 'object') {
    const tagged = value as { __type?: string };
    if (tagged.__type === 'Date') return 'Date';
    if (tagged.__type === 'Pointer') return 'Pointer';
    if (tagged.__type === 'File') return 'File';
    if (tagged.__type === 'GeoPoint') return 'GeoPoint';
    return 'Object';
  }
  return 'String';
}
