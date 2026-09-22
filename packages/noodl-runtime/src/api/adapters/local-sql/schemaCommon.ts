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
  /**
   * HLT-016: a partial index — it covers only the rows this holds for. An AND
   * of one to four conditions, keyed by property. Never SQL text: it has to
   * mean the same on both engines, and a schema push is not a place to accept
   * SQL from a file. See {@link normalizeWhere}.
   */
  where?: IndexWhere;
}

/** One condition of a partial index's `where`. */
export type WhereCondition = boolean | string | number | { exists: boolean } | { in: Array<string | number> };

/** A partial index's predicate: property → condition, all of which must hold. */
export type IndexWhere = Record<string, WhereCondition>;

/** An index the engine actually has, as it reports it. */
export interface BuiltIndex {
  name: string;
  fields: string[];
  unique: boolean;
  order: 'asc' | 'desc';
  /**
   * HLT-016: the engine says it is a partial index. The predicate itself is
   * not read back: the derived name carries a hash of it, so a different
   * predicate is a different name, and only partial-or-not can differ under one.
   */
  partial?: boolean;
}

/** A declared index and whether it is built — plus drift, which is neither. */
export interface IndexStatus extends BuiltIndex {
  built: boolean;
  /** False for an index that exists but nothing declares (hand-made, or drift). */
  declared: boolean;
  /** HLT-016: the declared predicate of a partial index. Absent on a full one, and on drift. */
  where?: IndexWhere;
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
export function indexName(tableName: string, fields: string[], where?: IndexWhere): string {
  const base = `idx_${sanitizeIdent(tableName)}_${fields.map(sanitizeIdent).join('_')}`;
  // HLT-016: a partial index and a full one on the same fields are two indexes,
  // so the predicate is part of the name. A hash rather than the predicate
  // spelled out, because PostgreSQL truncates identifiers at 63 characters.
  return where ? `${base}_w${whereHash(where)}` : base;
}

/** FNV-1a over the normalized predicate: stable across processes and engines. */
export function whereHash(where: IndexWhere): string {
  const text = JSON.stringify(canonicalWhere(where));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The predicate with its keys sorted, so two spellings of one predicate hash alike. */
function canonicalWhere(where: IndexWhere): Array<[string, WhereCondition]> {
  return Object.keys(where)
    .sort()
    .map((k) => [k, where[k]]);
}

const MAX_WHERE_CONDITIONS = 4;
const MAX_WHERE_IN = 20;

/**
 * Read a `where` declaration, or refuse it (HLT-016 W1). Only the SHAPE is
 * checked here; whether each property exists and has the type the value
 * implies needs the collection, and is {@link checkWhereAgainstColumns}.
 *
 * Normalized: keys sorted, and an `in` list deduplicated and sorted, so that
 * the same predicate however spelled is the same index (its name hashes it).
 */
export function normalizeWhere(raw: unknown, at: string): IndexWhere {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`${at}.where must be an object like { "pinned": true }`);
  }
  const keys = Object.keys(raw as object).sort();
  if (keys.length === 0 || keys.length > MAX_WHERE_CONDITIONS) {
    throw new Error(`${at}.where must name one to ${MAX_WHERE_CONDITIONS} properties`);
  }
  const out: IndexWhere = {};
  for (const key of keys) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`${at}.where: ${JSON.stringify(key)} is not a valid property name`);
    }
    const c = (raw as Record<string, unknown>)[key];
    const where = `${at}.where.${key}`;
    if (typeof c === 'boolean' || typeof c === 'string') {
      out[key] = c;
    } else if (typeof c === 'number') {
      if (!Number.isFinite(c)) throw new Error(`${where} must be a finite number`);
      out[key] = c;
    } else if (c && typeof c === 'object' && !Array.isArray(c)) {
      const ops = Object.keys(c);
      if (ops.length !== 1 || (ops[0] !== 'exists' && ops[0] !== 'in')) {
        throw new Error(
          `${where}: expected true/false, a string, a number, { "exists": true|false } or { "in": [...] }` +
            (ops.length ? `, not an object with ${ops.map((o) => `"${o}"`).join(', ')}` : '')
        );
      }
      const v = (c as Record<string, unknown>)[ops[0]];
      if (ops[0] === 'exists') {
        if (typeof v !== 'boolean') throw new Error(`${where}.exists must be true or false`);
        out[key] = { exists: v };
      } else {
        if (!Array.isArray(v) || v.length === 0 || v.length > MAX_WHERE_IN) {
          throw new Error(`${where}.in must list one to ${MAX_WHERE_IN} values`);
        }
        const kind = typeof v[0];
        if (
          !v.every((x) => (typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x))) && typeof x === kind)
        ) {
          throw new Error(`${where}.in must list strings, or numbers, and not a mix`);
        }
        const unique = [...new Set(v as Array<string | number>)];
        unique.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        out[key] = { in: unique };
      }
    } else {
      throw new Error(`${where}: expected true/false, a string, a number, { "exists": true|false } or { "in": [...] }`);
    }
  }
  return out;
}

/**
 * Refuse a `where` whose properties the collection lacks, or whose values are
 * the wrong type for them (HLT-016 W1). A comparison of a Boolean property with
 * a string is not "no rows match": on SQLite it silently never matches (the
 * column holds 0/1) and on PostgreSQL it is an error at the queue. Both are
 * worse than a sentence now.
 *
 * @param typeOf - A property's declared Noodl type, or undefined when the
 *   collection has the column but never declared its type.
 */
export function checkWhereAgainstColumns(
  tableName: string,
  where: IndexWhere,
  columns: Set<string>,
  typeOf: (field: string) => string | undefined
): void {
  for (const [field, c] of Object.entries(where)) {
    if (!columns.has(field)) {
      throw new Error(`Cannot filter the index on "${tableName}" by "${field}": the collection has no such property.`);
    }
    if (c !== null && typeof c === 'object' && 'exists' in c) continue;

    const sample = c !== null && typeof c === 'object' && 'in' in c ? c.in[0] : c;
    const wants = typeof sample === 'boolean' ? 'Boolean' : typeof sample === 'number' ? 'Number' : 'String';
    const has = typeOf(field);
    if (has !== wants) {
      throw new Error(
        `The index on "${tableName}" compares "${field}" with ${JSON.stringify(sample)}, a ${wants}, ` +
          `but "${field}" is ${has ? `a ${has}` : 'a property with no declared type'}. ` +
          'Only { "exists": true|false } applies to every type.'
      );
    }
  }
}

/**
 * The SQL of a partial index's predicate, for one engine. Values are written
 * as literals, because an index definition cannot carry bound parameters —
 * which is why {@link normalizeWhere} admits only finite numbers, booleans and
 * strings, and a string goes through {@link quoteLiteral}.
 */
export function whereSQL(where: IndexWhere, engine: 'sqlite' | 'postgres'): string {
  const lit = (v: string | number | boolean): string => {
    if (typeof v === 'boolean') return engine === 'sqlite' ? (v ? '1' : '0') : v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    return quoteLiteral(v);
  };
  return canonicalWhere(where)
    .map(([field, c]) => {
      const col = `"${sanitizeIdent(field)}"`;
      if (c !== null && typeof c === 'object' && 'exists' in c) return `${col} IS ${c.exists ? 'NOT ' : ''}NULL`;
      if (c !== null && typeof c === 'object' && 'in' in c) return `${col} IN (${c.in.map(lit).join(', ')})`;
      return `${col} = ${lit(c as string | number | boolean)}`;
    })
    .join(' AND ');
}

/** A person's reading of a predicate, for sentences: `pinned = true, kind in (a, b)`. */
export function describeWhere(where: IndexWhere): string {
  return canonicalWhere(where)
    .map(([field, c]) => {
      if (c !== null && typeof c === 'object' && 'exists' in c) return `${field} ${c.exists ? 'is set' : 'is empty'}`;
      if (c !== null && typeof c === 'object' && 'in' in c) return `${field} in (${c.in.join(', ')})`;
      return `${field} = ${JSON.stringify(c)}`;
    })
    .join(' and ');
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
      if (key !== 'fields' && key !== 'unique' && key !== 'order' && key !== 'where') {
        throw new Error(`indexes[${i}]: unknown key "${key}" (expected fields, unique, order, where)`);
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
    if (e.where !== undefined) decl.where = normalizeWhere(e.where, `indexes[${i}]`);
    return decl;
  });
}

/** Whether a built index is the index a declaration asks for. */
export function sameIndexSignature(built: BuiltIndex, decl: IndexDecl): boolean {
  return (
    built.unique === (decl.unique === true) &&
    built.order === (decl.order === 'desc' ? 'desc' : 'asc') &&
    // HLT-016: the predicate itself is in the name; under one name, only
    // "partial or not" can differ, and a full index is not the partial one.
    (built.partial === true) === (decl.where !== undefined) &&
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

/**
 * One column's declared type, in the shape `_rowToRecord` reads.
 *
 * This is the editor's `dbCollections` form (`schema.properties[name].type`),
 * which is one of the TWO shapes a collection schema arrives in. The other is
 * `TableSchema` above (`{ name, columns: [{ name, type }] }`), which is what
 * `SchemaManager.getTableSchema()` and `PgSchemaManager.getTableSchema()`
 * return.
 */
export interface DeclaredProperty {
  type?: string;
  targetClass?: string;
  required?: boolean;
}

/** Derived maps, keyed by the schema object they were derived from. */
const DERIVED = new WeakMap<object, Record<string, DeclaredProperty>>();

/**
 * The declared column types of a collection, from EITHER schema shape.
 *
 * 🔴 **This function is BRG-D8/BRG-D10's repair, and the defect was that only
 * one of the two shapes was ever read.** Both adapters' `_rowToRecord` asked
 * for `schema.properties[key].type` — the editor's shape — while a
 * service-opened backend passes no `collections` config at all, so the schema
 * it gets back is the manager's `TableSchema`, which has no `properties`
 * member. The lookup was therefore `undefined` for every column of every
 * collection on every service-opened backend, `deserializeValue` was called
 * with no type, and each driver's own return value won: SQLite's INTEGER `1`
 * where PostgreSQL's BOOLEAN gave `true`. R7 (README §4) rules that they agree
 * on `true`/`false`, which means the declared type has to be visible on the way
 * out — here, once, for both adapters, rather than transcribed into each
 * ([[a-second-copy-of-a-palette-drifts-silently]]).
 *
 * The result is memoised against the schema object itself rather than by
 * collection name, because `_rowToRecord` runs once per ROW and building a map
 * per row is a per-row allocation on a path that a 2,000,000-row migration
 * walks. A `WeakMap` and not a mutation of the schema: `getTableSchema()`'s
 * object is served straight out over `GET /admin/schema` and `GET /api/_schema`,
 * so attaching a derived member to it would change what those routes answer.
 * Cache invalidation is free — `SchemaManager` replaces the cached object when
 * a column is added, and a new object derives afresh.
 *
 * @param schema - Either schema shape, or null/undefined for an untracked collection.
 * @returns name → declared property, or undefined when the schema declares nothing.
 */
export function declaredProperties(schema: unknown): Record<string, DeclaredProperty> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;
  const s = schema as { properties?: Record<string, DeclaredProperty>; columns?: SchemaColumn[] };

  // The editor's shape already IS the map. Returned as-is, so a collection
  // configured with `collections` keeps reading exactly as it always has.
  if (s.properties && typeof s.properties === 'object') return s.properties;

  if (!Array.isArray(s.columns)) return undefined;

  const memoised = DERIVED.get(s);
  if (memoised) return memoised;

  const derived: Record<string, DeclaredProperty> = {};
  for (const col of s.columns) {
    if (!col || typeof col.name !== 'string') continue;
    derived[col.name] = { type: col.type, targetClass: col.targetClass, required: col.required };
  }
  DERIVED.set(s, derived);
  return derived;
}
