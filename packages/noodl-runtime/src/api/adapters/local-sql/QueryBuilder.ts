/**
 * QueryBuilder - Translates Parse-style queries to SQL
 *
 * Parse uses operators like $eq, $ne, $gt, $lt, $in, etc.
 * This translates them to SQL WHERE clauses.
 *
 * ## The dialect seam (BRG-005 §6.1)
 *
 * Most of what this file emits is SQL both engines read: `escapeTable` and
 * `escapeColumn` quote with `"` and sanitise identically, the comparison and
 * range operators are standard, `ORDER BY`/`LIMIT`/`OFFSET` are standard, and
 * the 22 sites that emit a `?` marker need no change at all — positional
 * markers are translated to `$1 … $n` once at the driver boundary
 * (`postgres/placeholders.ts`).
 *
 * Six expressions are not portable: the row ACL, the `$within` box, `$regex`,
 * and the three geo operators. Each takes a `dialect` argument that **defaults
 * to `'sqlite'`**, so every pre-existing caller and every pre-existing test is
 * untouched by the seam's arrival.
 *
 * 🔴 **The seam is here, inside the builder, and not at the driver boundary,
 * for a reason that was measured rather than assumed.** A boundary translator
 * can only rewrite SQL that is already built, which requires the two dialects
 * to bind the same number of values in the same order. Two of these do not:
 * the Postgres haversine needs the centre latitude **twice** (the `dLat` term
 * and the `cos·cos` term) so it has three markers where `SQL_DISTANCE_KM(col,
 * ?, ?)` has two, and the Postgres `$regex` has **one** where
 * `SQL_REGEXP(?, ?, col)` has two, because the flags become part of the
 * operator instead of an argument. The parameters are pushed here, so the
 * choice has to be made here.
 *
 * It is deliberately **not** a second copy of this file. A fork is the thing
 * phase 97 exists to argue against: the claim is that the same backend runs on
 * either database, and two query builders drifting apart is that claim failing
 * from the inside. See [[a-second-copy-of-a-palette-drifts-silently]].
 *
 * @module adapters/local-sql/QueryBuilder
 */

import { aclPredicateSql, withinBoxSql } from '../postgres/predicates';
import {
  SEARCH_CONFIG,
  SEARCH_FIELDS_REQUIRED,
  SEARCH_TSQUERY,
  searchTextSql,
  searchVectorSql
} from '../postgres/search';
import { distanceKmSql, pointInPolygonSql, polygonLiteral, regexpSql, toAreRegex } from '../postgres/geo';
import {
  EARTH_RADIUS_KM,
  KM_PER_MILE,
  SQL_DISTANCE_KM,
  SQL_POINT_IN_POLYGON,
  SQL_REGEXP
} from './sqlFunctions';

/**
 * Which SQL the builder should emit.
 *
 * `'sqlite'` is the default everywhere, so the built-in backend's behaviour is
 * not a function of this argument existing. Deliberately narrow: it is not an
 * extension point for a third engine, because a third engine would need its own
 * measurements of every expression in this file rather than a new string in a
 * union. R5 rules the same thing at the CLI — Postgres only, refused by name.
 */
export type SqlDialect = 'sqlite' | 'postgres';

/** The caller's row-level access context (BAK-003). */
export interface AclContext {
  access: 'read' | 'write';
  keys: string[];
  /** P116 ONT-004: a collection rule's narrowing, applied beside the keys. See the contract's `StorageAclOption.only`. */
  only?: { collection: string; where: Record<string, unknown> };
}

/** A built statement: the SQL text and its bound parameters, in order. */
export interface BuiltQuery {
  sql: string;
  params: unknown[];
}

/** A value as it appears in a Parse-style payload — open JSON plus Parse's tagged objects. */
interface ParseTaggedValue {
  __type?: string;
  iso?: string;
  objectId?: string;
  className?: string;
  [extra: string]: unknown;
}

interface QueryOptionsBase {
  collection: string;
  where?: Record<string, unknown>;
  acl?: AclContext;
  /**
   * P116 ONT-004: how a `$path` filter learns what another collection's
   * fields are. Set by the adapter on every read; absent in the older callers
   * and the unit specs, where a `$path` is then refused rather than guessed at.
   */
  lookup?: CollectionLookup;
}

/** What a path needs to know about a collection it walks through (P116 ONT-004). */
export interface CollectionLookup {
  (collection: string): {
    /** The declared columns, by name — a Pointer's `targetClass` is what a `follow` with no `to` reads. */
    properties?: Record<string, { type?: string; targetClass?: string }>;
    /** The columns the table has right now; absent when the table does not exist. */
    present?: ReadonlySet<string>;
  } | null;
}

/** What `buildWhereClause` needs for a `$path`: the query it sits in. */
export interface PathEnv {
  /** The collection being queried — the one the path must end on. */
  collection: string;
  acl?: AclContext;
  lookup?: CollectionLookup;
  /**
   * P123-S6-PATHNOTABLE: set while a collection rule's narrowing is compiled. A path in a rule that goes through a
   * collection with no table yet (a Moderator table before the first moderator) reaches no rows; a path a person
   * wrote into their own query through it is still refused by name.
   */
  narrowing?: boolean;
}

/** The env for a `$path` in this query's `where`. */
function pathEnv(options: { collection: string; acl?: AclContext; lookup?: CollectionLookup }): PathEnv {
  return { collection: options.collection, acl: options.acl, lookup: options.lookup };
}

interface SelectOptions extends QueryOptionsBase {
  select?: string | string[];
  sort?: string | string[];
  limit?: number;
  skip?: number;
}

interface SearchOptions extends QueryOptionsBase {
  /** The raw search term; turned into an FTS5 MATCH string by {@link toFts5MatchQuery}. */
  search: string;
  sort?: string | string[];
  limit?: number;
  skip?: number;
  /**
   * The indexed fields, for the Postgres dialect only (BRG-005 AC6).
   *
   * SQLite does not need this: the FTS5 shadow table IS the field list, and the
   * `MATCH` goes against the table. PostgreSQL has no shadow table — the
   * `tsvector` is built from the columns named here — so on that dialect the
   * builder cannot guess and **refuses** rather than searching a field list it
   * invented. Ignored entirely when the dialect is `'sqlite'`.
   */
  fields?: string[];
}

/** One aggregate output column: exactly one of the operators is set. */
interface AggregateGroupConfig {
  avg?: string;
  sum?: string;
  max?: string;
  min?: string;
  distinct?: string;
}

/**
 * Reserved SQLite keywords that need to be escaped
 */
const RESERVED_WORDS = new Set([
  'order',
  'group',
  'select',
  'from',
  'where',
  'index',
  'table',
  'create',
  'drop',
  'alter',
  'delete',
  'insert',
  'update',
  'key',
  'primary',
  'foreign',
  'references',
  'null',
  'not',
  'and',
  'or',
  'in',
  'like',
  'between',
  'is',
  'exists',
  'case',
  'when',
  'then',
  'else',
  'end',
  'join',
  'inner',
  'outer',
  'left',
  'right',
  'on',
  'as',
  'asc',
  'desc',
  'limit',
  'offset',
  'union',
  'distinct',
  'all',
  'any',
  'some',
  'true',
  'false',
  'default',
  'values',
  'set',
  'into',
  'by',
  'having',
  'count',
  'sum',
  'avg',
  'min',
  'max'
]);

/**
 * Escape a table name for SQL
 */
export function escapeTable(name: string): string {
  // Sanitize: only allow alphanumeric and underscore
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  return `"${sanitized}"`;
}

/**
 * Escape a column name for SQL
 */
export function escapeColumn(name: string): string {
  // Sanitize: only allow alphanumeric and underscore
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  // Always quote to handle reserved words
  return `"${sanitized}"`;
}

/**
 * What the table actually has, for the one question SQL will not be asked
 * politely (DEF-014).
 *
 * A collection here is created on first use with **no user columns at all**
 * (`LocalSQLAdapter._ensureTable`), and its columns appear one at a time as
 * writes arrive (`create`/`save` → `SchemaManager.addColumn`). So on the day an
 * app is made, every property it filters on is a column that does not exist
 * yet — and `WHERE "pageId" = ?` against a table without a `pageId` is not an
 * empty result in SQLite, it is `no such column`, which the adapter surfaces as
 * an error and the HTTP layer as a 500. "Nothing has been written yet" is the
 * ordinary state of a new app, not a fault, and a query is entitled to say
 * *nothing matches* about it.
 *
 * `present` is read from `PRAGMA table_info` on the live connection at build
 * time — never from `_Schema`, which for an auto-created table records
 * `{"columns": []}` and therefore knows nothing the table does not. When it is
 * omitted the builder substitutes nothing and behaves exactly as it always has;
 * a caller that cannot see the schema must not guess that a column is missing.
 *
 * @see columnRef for the substitution and the semantics it is chosen to match.
 */
export interface ColumnScope {
  /** Column names the table has right now, as `PRAGMA table_info` reports them. */
  present: ReadonlySet<string>;
  /** Out-parameter: every name substituted, so the caller can report the typo case. */
  absent?: Set<string>;
  /**
   * P109 ISL-039 (P100-UPG001-ARRAYEQ): the columns the schema declares `Array`. Equality on one
   * of them matches a row whose array holds the value, as Parse does; the column's stored JSON
   * can never equal one element. Omitted = no column is treated as an array.
   */
  arrays?: ReadonlySet<string>;
}

/**
 * P109 ISL-039 (P100-UPG001-PTREQ): a Parse Pointer or Date — `{__type: 'Pointer', …}`,
 * `{__type: 'Date', iso}` — standing where a condition goes is a value to match, not a map of
 * operators. Read as operators, `__type` reached `translateOperator` and was refused (a 500).
 */
function isTaggedValue(condition: unknown): boolean {
  return (
    !!condition &&
    typeof condition === 'object' &&
    !Array.isArray(condition) &&
    ['Pointer', 'Date'].includes(String((condition as { __type?: unknown }).__type))
  );
}

/**
 * P109 ISL-039 (P78-DBT-NUL): a string holding `\u0000` is a value no PostgreSQL row can hold —
 * its `text` and `jsonb` refuse the character, so binding it is an error (a 400 on the wire). On
 * SQLite it binds and simply equals nothing stored. On PostgreSQL the comparison is compiled to
 * that same answer instead of being sent: equal is FALSE, not-equal is "has a value", and the
 * value drops out of an `$in`/`$nin` list.
 */
function unholdable(value: unknown, dialect: SqlDialect): boolean {
  return dialect === 'postgres' && typeof value === 'string' && value.includes('\u0000');
}

/** ISL-039: the columns a table's schema declares `Array`, for {@link ColumnScope.arrays}. */
export function arrayColumns(schema: { columns?: Array<{ name: string; type?: string }> } | null | undefined): Set<string> {
  return new Set((schema?.columns || []).filter((c) => c.type === 'Array').map((c) => c.name));
}

/** ISL-039: "the array in `col` holds `value`" — one element, compared as its JSON value. */
function arrayHolds(col: string, value: unknown, params: unknown[], dialect: SqlDialect): string {
  if (dialect === 'postgres') {
    params.push(JSON.stringify([value]));
    return `${col} @> ?::jsonb`;
  }
  params.push(value);
  return `EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(${col}) THEN ${col} END) WHERE "value" = ?)`;
}

/**
 * A column reference, or `NULL` when the table has no such column.
 *
 * **The rule, stated once: a column the table does not have behaves exactly
 * like a column it does have and no row has filled in.** That is not a
 * convenience choice — it is the only one that keeps every operator consistent
 * without writing a second set of semantics for absence. Substituting the SQL
 * literal `NULL` for the column reference reproduces the all-NULL column's
 * answer term by term: `= ?`, `!= ?`, `IN`, `NOT IN`, `>` and `LIKE` all
 * evaluate to NULL and match nothing; `IS NULL` (`$exists: false`) matches
 * every row; `IS NOT NULL` (`$exists: true`) matches none. Those are the
 * readings an all-NULL column gives today, and the equivalence is asserted as a
 * pair in the specs rather than reasoned about here.
 *
 * ⚠️ It is deliberately **not** "return no rows". An implementation that
 * short-circuits the whole query to empty gets `$exists: false` and `$ne`
 * backwards, and passes a test that only ever asks for the day-one case.
 */
export function columnRef(name: string, scope?: ColumnScope, tableAlias?: string): string {
  const escaped = escapeColumn(name);
  if (scope && !scope.present.has(escaped.slice(1, -1))) {
    scope.absent?.add(name);
    return 'NULL';
  }
  return tableAlias ? `${tableAlias}.${escaped}` : escaped;
}

/**
 * Build the row-level ACL predicate (BAK-003).
 *
 * A row is visible/writable when its ACL column is NULL (no ACL = public,
 * Parse semantics) or when any of the caller's principal keys ('*', a userId,
 * 'role:<name>') grants the requested access. The check runs IN SQL — never
 * post-filtered in JS — because count/limit/skip must operate on the visible
 * set, not the raw set. Principal keys are bound parameters, never
 * interpolated.
 *
 * @param tableName - Unescaped table name (for column qualification)
 * @param acl - Caller's access context
 * @param params - Parameter array to push principal keys to
 * @returns SQL predicate, or '' when acl is absent
 */
export function buildAclPredicate(
  tableName: string,
  acl: AclContext | undefined,
  params: unknown[],
  dialect: SqlDialect = 'sqlite',
  env?: PathEnv
): string {
  if (!acl || !Array.isArray(acl.keys)) {
    return '';
  }
  const access = acl.access === 'write' ? 'write' : 'read';
  const aclCol = `${escapeTable(tableName)}."ACL"`;
  let predicate: string;
  if (acl.keys.length === 0) {
    // No principal keys at all: only un-ACL'd (public) rows qualify.
    predicate = `(${aclCol} IS NULL)`;
  } else {
    const placeholders = acl.keys.map(() => '?').join(', ');
    params.push(...acl.keys);
    predicate =
      dialect === 'postgres'
        ? // Same principal keys, same bind order, same number of markers — only the
          // JSON operators and the flag comparison change. Both differences are
          // measured against this SQLite expression over the same rows, and both are
          // documented where the translation lives rather than here.
          aclPredicateSql(aclCol, placeholders, access, '_acl_entry')
        : `(${aclCol} IS NULL OR EXISTS (` +
          `SELECT 1 FROM json_each(${aclCol}) AS _acl_entry ` +
          `WHERE _acl_entry.key IN (${placeholders}) ` +
          `AND json_extract(_acl_entry.value, '$.${access}') = 1))`;
  }
  // P116 ONT-004: a collection rule's narrowing, in the same predicate as the
  // keys so no reader can apply one without the other. Scoped to its own
  // collection — a path rule on Person says nothing about an included Account.
  if (acl.only && acl.only.collection === tableName) {
    const narrowing = buildWhereClause(
      acl.only.where,
      params,
      undefined,
      undefined,
      undefined,
      dialect,
      { ...(env ?? { collection: tableName, acl: { access: acl.access, keys: acl.keys } }), narrowing: true }
    );
    if (narrowing) predicate = `(${predicate} AND ${narrowing})`;
  }
  return predicate;
}

/**
 * Convert a Parse Date object to ISO string for SQLite
 */
function convertDateValue(value: unknown): unknown {
  const tagged = value as ParseTaggedValue | null | undefined;
  if (tagged && tagged.__type === 'Date' && tagged.iso) {
    return tagged.iso;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * Convert a Parse Pointer to its objectId
 */
function convertPointerValue(value: unknown): unknown {
  const tagged = value as ParseTaggedValue | null | undefined;
  if (tagged && tagged.__type === 'Pointer' && tagged.objectId) {
    return tagged.objectId;
  }
  return value;
}

/**
 * One bound value, on its way from a Parse-style `where` into a SQLite
 * parameter slot.
 *
 * 🔴 **The boolean leg is a defect fix, not a convenience** (SB-008 F18). The
 * write path has always folded booleans to 0/1 — `serializeValue`, below,
 * `// Handle booleans - SQLite uses 0/1` — and the read path never did, so a
 * value this driver had itself stored as `1` could not be asked for by the
 * literal it was written as. better-sqlite3 refuses to bind a JS boolean at
 * all, so the failure was not a wrong answer but a throw: *"Provided value
 * cannot be bound to SQLite parameter 1"*, surfaced as a **500** from
 * `/classes/:c` and as `query-records/query-failed` in a browser.
 *
 * Measured before the change, on one table, one route, three arms: `{flag:true}`
 * → 500, `{flag:1}` → 200 with the row, `{name:'yes'}` → 200 (the control that
 * says the route itself works). The second arm is what makes this the missing
 * conversion rather than a storage question — the data was already in the shape
 * the fix converts to.
 *
 * ⚠️ **Nothing that works today can regress**: every path this changes threw
 * before it, on every input, in every adapter mode. What it can change is a
 * caller that was *relying* on the 500, and there is none — the throw reaches
 * the wire as a generic server error.
 *
 * Applied at all four binding sites (direct equality, the comparison operators,
 * `$in`, `$nin`) rather than at one, because a boolean is legal in every one of
 * them and a half-converted operator set is the harder bug to find.
 */
function convertQueryValue(value: unknown): unknown {
  const converted = convertDateValue(convertPointerValue(value));
  if (typeof converted === 'boolean') return converted ? 1 : 0;
  return converted;
}

/**
 * Build a WHERE clause from a Parse-style query
 *
 * @param where - Parse-style query object
 * @param params - Array to push parameter values to
 * @param schema - Optional schema for type-aware conversion
 * @param scope - DEF-014: the table's real columns. A condition naming a
 *   column the table does not have compiles to `NULL`, which answers exactly as
 *   an all-NULL column would, instead of failing the whole statement with
 *   `no such column`. Omitted = no substitution (see {@link ColumnScope}).
 * @param tableAlias - BAK-008: when the caller is joining the
 *   collection's table against another (the FTS5 shadow table, whose columns
 *   are named after the indexed fields), unqualified column references like
 *   `"title" = ?` become ambiguous. Passing the escaped table name/alias here
 *   qualifies every column reference (`"table"."title" = ?`). Omitted by every
 *   pre-existing call site, so behavior there is unchanged.
 * @returns SQL WHERE clause (without "WHERE" keyword)
 */
export function buildWhereClause(
  where: Record<string, unknown> | undefined,
  params: unknown[],
  schema?: unknown,
  tableAlias?: string,
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite',
  env?: PathEnv
): string {
  if (!where || Object.keys(where).length === 0) {
    return '';
  }

  const conditions: string[] = [];

  for (const [key, condition] of Object.entries(where)) {
    // Handle logical operators
    if (key === '$and' && Array.isArray(condition)) {
      const subConditions = condition
        .map((sub) => buildWhereClause(sub as Record<string, unknown>, params, schema, tableAlias, scope, dialect, env))
        .filter((c) => c);
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(' AND ')})`);
      }
      continue;
    }

    if (key === '$or' && Array.isArray(condition)) {
      const subConditions = condition
        .map((sub) => buildWhereClause(sub as Record<string, unknown>, params, schema, tableAlias, scope, dialect, env))
        .filter((c) => c);
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(' OR ')})`);
      }
      continue;
    }

    // P116 ONT-004: a path through several links, compiled to one subquery.
    if (key === '$path') {
      if (!env) throw new Error('A $path filter can only be read as part of a query (no query env was given)');
      const idCol = tableAlias ? `${tableAlias}."objectId"` : '"objectId"';
      conditions.push(`${idCol} IN (${buildPathSelect(condition, env, params, dialect)})`);
      continue;
    }

    // Handle $relatedTo - this is tricky with SQLite
    if (key === '$relatedTo') {
      // For relations, we need a subquery on the junction table
      const { object, key: relationKey } = condition as {
        object?: { objectId?: string; className?: string };
        key?: string;
      };
      if (object && object.objectId && object.className && relationKey) {
        const junctionTable = `_Join_${relationKey}_${object.className}`;
        const idCol = tableAlias ? `${tableAlias}."objectId"` : '"objectId"';
        conditions.push(`${idCol} IN (SELECT "relatedId" FROM ${escapeTable(junctionTable)} WHERE "owningId" = ?)`);
        params.push(object.objectId);
      }
      continue;
    }

    // P116-S17-DOTTEDFILTER: `salary.amount` is a field of the linked record. Read as one column it
    // compiled to `NULL > ?` and answered no rows, silently; it is the one-hop `$path` it means.
    if (key.includes('.')) {
      const idCol = tableAlias ? `${tableAlias}."objectId"` : '"objectId"';
      conditions.push(`${idCol} IN (${buildPathSelect(dottedAsPath(key, condition, env), env!, params, dialect)})`);
      continue;
    }

    // Handle field conditions
    const col = columnRef(key, scope, tableAlias);

    const isArray = !!scope?.arrays?.has(key) && col !== 'NULL';
    if (typeof condition !== 'object' || condition === null || isTaggedValue(condition)) {
      // Direct equality
      const value = convertQueryValue(condition);
      if (unholdable(value, dialect)) {
        conditions.push('FALSE');
        continue;
      }
      // P116-S17-NULLEQ: `{ f: null }` means `{ f: { $eq: null } }` on the Parse wire — "is empty" —
      // and SQL's `= NULL` is never true, so it matched nothing.
      if (value === null) {
        conditions.push(`${col} IS NULL`);
        continue;
      }
      if (isArray) {
        conditions.push(arrayHolds(col, value, params, dialect));
        continue;
      }
      conditions.push(`${col} = ?`);
      params.push(value);
      continue;
    }

    // Handle Parse operators
    //
    // Two operators are *modifiers* rather than conditions: `$options` carries
    // the regex flags for `$regex`, and the three `$maxDistanceIn…` keys carry
    // the radius for `$nearSphere`. They sit beside the operator they modify in
    // the same condition object, so the whole object is passed down — reading
    // them as standalone operators is how a set of flags would become a
    // condition of its own.
    const siblings = condition as Record<string, unknown>;
    for (const [op, value] of Object.entries(condition)) {
      const sqlCondition = translateOperator(col, op, value, params, schema, siblings, dialect, isArray);
      if (sqlCondition) {
        conditions.push(sqlCondition);
      }
    }
  }

  return conditions.join(' AND ');
}

/** The three spellings Parse accepts for a `$nearSphere` radius, in kilometres. */
function maxDistanceKm(siblings: Record<string, unknown> | undefined): number | null {
  if (!siblings) return null;
  const miles = siblings.$maxDistanceInMiles;
  if (typeof miles === 'number') return miles * KM_PER_MILE;
  const km = siblings.$maxDistanceInKilometers;
  if (typeof km === 'number') return km;
  const radians = siblings.$maxDistanceInRadians;
  if (typeof radians === 'number') return radians * EARTH_RADIUS_KM;
  return null;
}

/**
 * Translate a single Parse operator to SQL
 *
 * @param col - Escaped column name
 * @param op - Parse operator ($eq, $ne, etc.)
 * @param value - Comparison value
 * @param params - Parameters array to push values to
 * @param schema - Optional schema
 * @param siblings - The whole condition object, for operators whose argument is
 *   split across sibling keys ($regex/$options, $nearSphere/$maxDistanceIn…).
 * @returns SQL condition or null
 */
function translateOperator(
  col: string,
  op: string,
  value: unknown,
  params: unknown[],
  schema?: unknown,
  siblings?: Record<string, unknown>,
  dialect: SqlDialect = 'sqlite',
  arrayColumn = false
): string | null {
  // Convert special types
  const convertedValue = convertQueryValue(value);

  switch (op) {
    case '$eq':
      if (convertedValue === null) {
        return `${col} IS NULL`;
      }
      if (unholdable(convertedValue, dialect)) return 'FALSE';
      // P109 ISL-039: on an Array column, an element is "holds this element" (see `arrayHolds`), and
      // an array is the whole array, compared as JSON (the admin's "is empty" asks `$eq: []`).
      if (arrayColumn && !Array.isArray(convertedValue)) return arrayHolds(col, convertedValue, params, dialect);
      if (arrayColumn) {
        params.push(JSON.stringify(convertedValue));
        return dialect === 'postgres' ? `${col} = ?::jsonb` : `CASE WHEN json_valid(${col}) THEN json(${col}) END = json(?)`;
      }
      params.push(convertedValue);
      return `${col} = ?`;

    case '$ne':
      if (convertedValue === null || unholdable(convertedValue, dialect)) {
        return `${col} IS NOT NULL`;
      }
      params.push(convertedValue);
      return `${col} != ?`;

    case '$gt':
      params.push(convertedValue);
      return `${col} > ?`;

    case '$gte':
      params.push(convertedValue);
      return `${col} >= ?`;

    case '$lt':
      params.push(convertedValue);
      return `${col} < ?`;

    case '$lte':
      params.push(convertedValue);
      return `${col} <= ?`;

    case '$in': {
      if (!Array.isArray(value) || value.length === 0) {
        // Always false. 🔴 A bare `0` is a boolean to SQLite and an INTEGER to
        // PostgreSQL, where `WHERE 0` is a type error ("argument of WHERE must
        // be type boolean") — so `$in: []` would fail the statement instead of
        // matching nothing. Found by BRG-005's conformance run.
        return dialect === 'postgres' ? 'FALSE' : '0';
      }
      const inValues = value.map((v) => convertQueryValue(v)).filter((v) => !unholdable(v, dialect));
      if (inValues.length === 0) return 'FALSE'; // only PostgreSQL reaches this: every value held a NUL
      const placeholders = inValues.map(() => '?').join(', ');
      params.push(...inValues);
      return `${col} IN (${placeholders})`;
    }

    case '$nin': {
      if (!Array.isArray(value) || value.length === 0) {
        return dialect === 'postgres' ? 'TRUE' : '1'; // Always true (not in empty set)
      }
      const ninValues = value.map((v) => convertQueryValue(v)).filter((v) => !unholdable(v, dialect));
      if (ninValues.length === 0) return `${col} IS NOT NULL`; // as SQLite's NOT IN answers for a NUL list
      const ninPlaceholders = ninValues.map(() => '?').join(', ');
      params.push(...ninValues);
      return `${col} NOT IN (${ninPlaceholders})`;
    }

    case '$exists':
      return value ? `${col} IS NOT NULL` : `${col} IS NULL`;

    case '$regex':
      // BCN-003. This was `LIKE '%value%'`, with the code's own comment
      // conceding "only handles basic patterns" — so `^Ada$` searched for that
      // literal text, matched nothing, and reported no error. Anchors,
      // character classes and groups were all silently inert.
      //
      // SQLite still has no native REGEXP, but `node:sqlite` can call back into
      // JavaScript, so the pattern is now evaluated by the same engine the
      // user's browser would use. `$options` is read from the sibling key
      // rather than as an operator of its own.
      {
        const flags = typeof siblings?.$options === 'string' ? siblings.$options : '';
        if (dialect === 'postgres') {
          // 🔴 ONE marker where SQLite has two. The flags are not a bound value
          // on Postgres — `i` selects the `~*` operator and `m` becomes an
          // embedded `(?n)` in the pattern itself — so the second parameter has
          // nowhere to go. This is the second of the two marker-count changes
          // that put the seam inside this file (§6.1); `toAreRegex` is why the
          // pattern is rewritten rather than passed through.
          params.push(toAreRegex(String(value)));
          return regexpSql(col, flags);
        }
        params.push(String(value), flags);
        return `${SQL_REGEXP}(?, ?, ${col}) = 1`;
      }

    case '$options':
      // A modifier on $regex, consumed above. Not a condition.
      return null;

    case '$text': {
      // Full text search - convert to LIKE
      const textValue = value as { $search?: string | { $term?: string } } | null | undefined;
      if (textValue && textValue.$search) {
        const term = typeof textValue.$search === 'string' ? textValue.$search : textValue.$search.$term || '';
        params.push(`%${term}%`);
        // SQLite's LIKE is case-insensitive for ASCII; PostgreSQL's is not, and
        // `ILIKE` is the operator that says what SQLite's LIKE means.
        return `${col} ${dialect === 'postgres' ? 'ILIKE' : 'LIKE'} ?`;
      }
      return null;
    }

    case 'contains':
    case '$contains':
      // Contains search - convert to LIKE with wildcards
      params.push(`%${convertedValue}%`);
      return `${col} ${dialect === 'postgres' ? 'ILIKE' : 'LIKE'} ?`;

    // ── Geo ────────────────────────────────────────────────────────────────
    //
    // All three used to `console.warn` and return null, and a null condition is
    // simply not added to the WHERE clause — so a "within 5 km" query returned
    // every record in the collection and nothing in the app could tell. BCN-001
    // found it; Richard assigned it here on 2026-07-31.
    //
    // A GeoPoint is stored as its Parse tagged object, JSON-encoded in a TEXT
    // column, which is why the box test reads through `json_extract` and the
    // other two hand the raw column to a function. None of the three can use an
    // index — that is the cost, and it is what the descriptor now says out loud
    // rather than what it used to imply by saying nothing.

    case '$nearSphere': {
      const centre = value as { latitude?: number; longitude?: number } | null;
      if (!centre || typeof centre.latitude !== 'number' || typeof centre.longitude !== 'number') {
        return null;
      }
      const radiusKm = maxDistanceKm(siblings);
      if (radiusKm === null) {
        // Parse reads a bare `$nearSphere` as "sort by proximity" rather than
        // as a filter. Sorting is explicitly out of BCN-003's scope, so the
        // honest translation of the *filter* is the one that narrows nothing —
        // but it still excludes rows with no usable point, which is what the
        // distance comparison below would do anyway.
        if (dialect === 'postgres') {
          params.push(centre.latitude, centre.latitude, centre.longitude);
          return `${distanceKmSql(col)} IS NOT NULL`;
        }
        params.push(centre.latitude, centre.longitude);
        return `${SQL_DISTANCE_KM}(${col}, ?, ?) IS NOT NULL`;
      }
      if (dialect === 'postgres') {
        // 🔴 THREE markers where SQLite has two, and the centre latitude is two
        // of them — the haversine needs it in both the `dLat` term and the
        // `cos(lat1)cos(lat2)` term, and a positional marker binds one value
        // each. The order is the contract `distanceKmSql` documents:
        // `centreLat, centreLat, centreLon`.
        params.push(centre.latitude, centre.latitude, centre.longitude, radiusKm);
        return `${distanceKmSql(col)} <= ?`;
      }
      params.push(centre.latitude, centre.longitude, radiusKm);
      return `${SQL_DISTANCE_KM}(${col}, ?, ?) <= ?`;
    }

    case '$maxDistanceInMiles':
    case '$maxDistanceInKilometers':
    case '$maxDistanceInRadians':
      // Modifiers on $nearSphere, consumed above.
      return null;

    case '$within': {
      // `{$box: [southwest, northeast]}` — two opposite corners, so this is a
      // pair of ordinary range comparisons on the stored coordinates and the
      // only geo operator here that a plain index could ever help.
      const box = (value as { $box?: Array<{ latitude?: number; longitude?: number }> } | null)?.$box;
      if (!Array.isArray(box) || box.length !== 2) return null;
      const [southwest, northeast] = box;
      if (
        typeof southwest?.latitude !== 'number' ||
        typeof southwest?.longitude !== 'number' ||
        typeof northeast?.latitude !== 'number' ||
        typeof northeast?.longitude !== 'number'
      ) {
        return null;
      }
      params.push(
        Math.min(southwest.latitude, northeast.latitude),
        Math.max(southwest.latitude, northeast.latitude),
        Math.min(southwest.longitude, northeast.longitude),
        Math.max(southwest.longitude, northeast.longitude)
      );
      if (dialect === 'postgres') {
        // Four markers, same order — the one non-portable expression here that a
        // boundary translator could have handled. See `withinBoxSql`.
        return withinBoxSql(col);
      }
      return (
        `json_extract(${col}, '$.latitude') BETWEEN ? AND ? ` +
        `AND json_extract(${col}, '$.longitude') BETWEEN ? AND ?`
      );
    }

    case '$geoWithin': {
      const polygon = (value as { $polygon?: unknown[] } | null)?.$polygon;
      if (!Array.isArray(polygon) || polygon.length < 3) return null;
      if (dialect === 'postgres') {
        // One marker either way, but the bound VALUE differs: SQLite binds the
        // JSON ring and reads it in JavaScript, Postgres binds a `polygon`
        // literal and lets the server do the containment.
        const literal = polygonLiteral(polygon);
        if (literal === null) {
          // An unusable ring — fewer than three usable vertices, or a vertex
          // that is not a pair of numbers. `sqlFunctions.pointInPolygon`
          // returns 0 for exactly these, so the faithful translation is a
          // condition that matches nothing, NOT a dropped condition (which
          // would widen the result set — the failure class BCN-003 closed).
          return 'FALSE';
        }
        params.push(literal);
        return pointInPolygonSql(col);
      }
      params.push(JSON.stringify(polygon));
      return `${SQL_POINT_IN_POLYGON}(${col}, ?) = 1`;
    }

    default:
      // Reaching here means the query asked for something this translator has
      // no branch for, and returning null would drop the condition and widen
      // the result set — the failure class BCN-003 exists to close. The filter
      // translators refuse an operator the descriptor does not declare, so an
      // unknown one arriving at the SQL layer is a defect rather than a user
      // error, and it should be loud.
      throw new Error(
        `The built-in backend received a filter operator it cannot translate: ${op}. ` +
          'Refusing rather than dropping it, because a dropped condition returns more rows than the filter asked for.'
      );
  }
}

// ===========================================================================
// P116 ONT-004 — a path through several links, as one subquery
// ===========================================================================

/** The most hops any path may take; the contract's `MAX_PATH_DEPTH`, restated here because the runtime cannot import it at run time. */
export const MAX_PATH_DEPTH = 8;

const PATH_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface PathHopFollow {
  follow: string;
  to?: string;
  where?: Record<string, unknown>;
  repeat?: boolean;
}
interface PathHopBack {
  from: string;
  by: string;
  where?: Record<string, unknown>;
  repeat?: boolean;
}
type PathHop = PathHopFollow | PathHopBack;

interface PathShape {
  from: { collection: string; where?: Record<string, unknown> };
  hops: PathHop[];
  maxDepth: number;
}

/** One hop, resolved against the schema: where it goes and how the edge is stored. */
interface Edge {
  /** The collection the hop lands on. */
  to: string;
  /** The collection it comes from. */
  of: string;
  storage: 'pointer' | 'relation' | 'list' | 'absent';
  /** The field, on `of` for a `follow`, on `to` for a `from, by`. */
  field: string;
  back: boolean;
  where?: Record<string, unknown>;
  repeat: boolean;
}

/**
 * Compile a `$path` to `SELECT "objectId" FROM <last collection> WHERE …`.
 *
 * The shape is the contract's `PathFilter` with every nested `where` in Parse
 * spelling (`$eq`, not `equalTo`), which is how `ParseWireAdapter` writes it.
 * Five things are pinned by `conformance/cases/paths.ts` on both engines, and
 * every one is a decision rather than an accident:
 *
 * 1. **Fixed hops nest as id subqueries**; a repeated hop is a recursive common
 *    table expression with a depth column. Both engines read both shapes, so
 *    the SQL is one text with the two dialect seams (the ACL, nothing else)
 *    taken from the functions that already own them.
 * 2. **The caller's row ACL is applied at every hop**, through
 *    `buildAclPredicate` on each hop's collection. Nothing a caller may not
 *    read is walked through. Tables are referenced by name and never aliased,
 *    so the predicate's `"Table"."ACL"` resolves to the nearest scope — the
 *    one being walked.
 * 3. **Depth is checked here, before any SQL runs**: `maxDepth` whole, 1 … 8,
 *    at least as many as the hops; a repeated hop takes what the other hops
 *    leave, and is bounded in the CTE by a parameter, so a cycle in the data
 *    ends at the bound.
 * 4. **A field is followed only when the schema says what it names**, or the
 *    caller does with `to`. A text field holding ids (every relation in the
 *    in-repo corpus) is followable with `to`; a list (`Array`) is followable
 *    forwards and refused backwards, in the words the vocabulary uses for it.
 * 5. **The last hop must land on the collection being queried**, or the path
 *    answers a different question than the one asked. Refused by name.
 *
 * Refusals throw; the adapter's catch turns them into `options.error`, which
 * the conformance context reads as an `AdapterRefusal` — a loud no, never
 * wrong rows.
 */
function buildPathSelect(raw: unknown, env: PathEnv, params: unknown[], dialect: SqlDialect): string {
  const mark = params.length;
  try {
    return pathSelect(raw, env, params, dialect);
  } catch (e) {
    if (!(e as { noSuchCollection?: boolean })?.noSuchCollection || !env.narrowing) throw e;
    // P123-S6-PATHNOTABLE: a rule's path through a collection that has no table yet reaches nobody. The parameters
    // the abandoned walk pushed are taken back, or every later placeholder would read the wrong value.
    params.length = mark;
    return 'SELECT CAST(NULL AS TEXT) WHERE 1 = 0';
  }
}

/**
 * A path names a collection that has no table: refused in a query, no rows in a rule (P123-S6-PATHNOTABLE). Marked
 * by a property, not a subclass: `instanceof` on an Error subclass fails where this file is compiled to ES5.
 */
function noSuchCollection(message: string): Error {
  return Object.assign(new Error(message), { noSuchCollection: true });
}

function pathSelect(raw: unknown, env: PathEnv, params: unknown[], dialect: SqlDialect): string {
  const path = checkPathShape(raw);
  const lookup = env.lookup;
  if (!lookup) throw new Error('A $path filter needs the schema, and this read was built without one');
  const hopAcl: AclContext | undefined = env.acl ? { access: env.acl.access, keys: env.acl.keys } : undefined;

  const scopeOf = (collection: string): ColumnScope | undefined => {
    const info = lookup(collection);
    return info?.present ? { present: info.present } : undefined;
  };
  // A hop's where is qualified by the hop's table: inside the recursive walk two
  // tables carry an "objectId", and an unqualified name would be ambiguous.
  const whereOf = (collection: string, where: Record<string, unknown> | undefined): string => {
    if (!where) return '';
    const nested: PathEnv = { collection, acl: hopAcl, lookup };
    return buildWhereClause(where, params, undefined, escapeTable(collection), scopeOf(collection), dialect, nested);
  };
  // The keys apply at every hop; a rule's narrowing (`only`) applies to the
  // end rows alone, where the outer predicate already puts it — repeating it on
  // a hop through the same collection would recurse without end.
  const guards = (collection: string, where: Record<string, unknown> | undefined): string => {
    const parts = [whereOf(collection, where), buildAclPredicate(collection, hopAcl, params, dialect)].filter((c) => c);
    return parts.length ? ` AND ${parts.join(' AND ')}` : '';
  };
  const exists = (collection: string): void => {
    if (!lookup(collection)) throw noSuchCollection(`The path goes through "${collection}", and there is no such collection`);
  };

  // The start: the rows of `from` the caller may read, narrowed by its where.
  exists(path.from.collection);
  let frontier = `SELECT "objectId" FROM ${escapeTable(path.from.collection)}`;
  const startGuards = guards(path.from.collection, path.from.where);
  if (startGuards) frontier += ` WHERE ${startGuards.slice(5)}`;

  // Resolve every hop against the schema before emitting anything, so a path
  // that cannot be followed is refused whole, with the hop named.
  let current = path.from.collection;
  const edges: Edge[] = path.hops.map((hop, i) => {
    const at = `hop ${i + 1}`;
    const edge = resolveEdge(hop, current, lookup, at);
    if (edge.repeat && edge.to !== edge.of) {
      throw new Error(`${at} repeats, so it must land on the collection it starts from ("${edge.of}"), and it lands on "${edge.to}"`);
    }
    current = edge.to;
    return edge;
  });
  if (current !== env.collection) {
    throw new Error(`The path ends on "${current}", and the query is on "${env.collection}" — the last hop must land on the collection being queried`);
  }

  const fixed = edges.filter((e) => !e.repeat).length;
  const left = path.maxDepth - fixed;
  for (const edge of edges) {
    frontier = edge.repeat ? repeatedHop(edge, frontier, left, guards, params, dialect) : oneHop(edge, frontier, guards, dialect);
  }
  return frontier;
}

/** P116-S17-DOTTEDFILTER: how a refused dotted filter begins, so the backend answers it 400 (the caller's to fix), not 500. */
export const FILTER_REFUSAL = 'The built-in backend cannot filter on ';
export function isFilterRefusal(message: string): boolean {
  return message.includes(FILTER_REFUSAL);
}

/**
 * P116-S17-DOTTEDFILTER — a filter on a linked record's field (`salary.amount`, the one-hop paths
 * the editor offers in a filter) as the `$path` it means: the rows of the linked collection that
 * match, followed back to the records that link to them. So the caller's row ACL applies at the hop
 * as on any path, and the facade asks the linked collection's own rule. Anything else with a dot (a
 * field that is not a link, two links deep) is refused by name, never read as a column that does
 * not exist.
 */
function dottedAsPath(key: string, condition: unknown, env: PathEnv | undefined): PathShape {
  const refuse = (why: string): never => {
    throw new Error(`${FILTER_REFUSAL}"${key}": ${why}`);
  };
  const [link, field, ...deeper] = key.split('.');
  if (!link || !field || deeper.length) {
    refuse('a filter follows one link, written "link.field"; for a longer way through the links, use a path filter');
  }
  if (!env?.lookup) refuse('this read was built without the schema, so the link cannot be followed');
  const declared = env!.lookup!(env!.collection)?.properties?.[link];
  if ((declared?.type !== 'Pointer' && declared?.type !== 'Relation') || !declared.targetClass) {
    refuse(`"${link}" is not a link to another collection${declared?.type ? ` (it is ${declared.type})` : ''}`);
  }
  return {
    from: { collection: declared!.targetClass!, where: { [field]: condition } },
    hops: [{ from: env!.collection, by: link }],
    maxDepth: 1
  };
}

/** Shape and bounds, checked before the schema is consulted. The contract's `pathProblem` says the same things. */
function checkPathShape(raw: unknown): PathShape {
  const bad = (why: string): never => {
    throw new Error(`A $path filter is malformed: ${why}`);
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) bad('a path must be an object with from, hops and maxDepth');
  const p = raw as Record<string, unknown>;
  for (const k of Object.keys(p)) if (k !== 'from' && k !== 'hops' && k !== 'maxDepth') bad(`a path has no "${k}"`);
  const from = p.from as Record<string, unknown> | undefined;
  if (!from || typeof from !== 'object' || Array.isArray(from)) bad('a path needs "from": { collection, where? }');
  const f = from as Record<string, unknown>;
  if (typeof f.collection !== 'string' || !PATH_NAME.test(f.collection)) bad('the path\'s "from.collection" must name a collection');
  for (const k of Object.keys(f)) if (k !== 'collection' && k !== 'where') bad(`"from" has no "${k}"`);
  if (f.where !== undefined && (!f.where || typeof f.where !== 'object' || Array.isArray(f.where))) bad('"from.where" must be a filter object');
  if (f.where && holdsPath(f.where as Record<string, unknown>)) bad('a path inside a path is not allowed');
  const maxDepth = p.maxDepth;
  if (!Number.isInteger(maxDepth) || (maxDepth as number) < 1 || (maxDepth as number) > MAX_PATH_DEPTH) {
    bad(`"maxDepth" must be a whole number from 1 to ${MAX_PATH_DEPTH}`);
  }
  if (!Array.isArray(p.hops) || p.hops.length === 0) bad('a path needs at least one hop');
  const hops = p.hops as unknown[];
  if (hops.length > (maxDepth as number)) bad(`the path has ${hops.length} hops and "maxDepth" allows ${maxDepth}`);
  let repeats = 0;
  hops.forEach((h, i) => {
    const at = `hop ${i + 1}`;
    if (!h || typeof h !== 'object' || Array.isArray(h)) bad(`${at} must be an object`);
    const hop = h as Record<string, unknown>;
    const isFollow = 'follow' in hop;
    const isBack = 'from' in hop || 'by' in hop;
    if (isFollow === isBack) bad(`${at} must be { follow } or { from, by }, not both and not neither`);
    const allowed = isFollow ? ['follow', 'to', 'where', 'repeat'] : ['from', 'by', 'where', 'repeat'];
    for (const k of Object.keys(hop)) if (!allowed.includes(k)) bad(`${at} has no "${k}"`);
    if (isFollow && (typeof hop.follow !== 'string' || !PATH_NAME.test(hop.follow))) bad(`${at}: "follow" must name a field`);
    if (isFollow && hop.to !== undefined && (typeof hop.to !== 'string' || !PATH_NAME.test(hop.to))) bad(`${at}: "to" must name a collection`);
    if (!isFollow && (typeof hop.from !== 'string' || !PATH_NAME.test(hop.from))) bad(`${at}: "from" must name a collection`);
    if (!isFollow && (typeof hop.by !== 'string' || !PATH_NAME.test(hop.by))) bad(`${at}: "by" must name a field`);
    if (hop.where !== undefined && (!hop.where || typeof hop.where !== 'object' || Array.isArray(hop.where))) bad(`${at}: "where" must be a filter object`);
    if (hop.where && holdsPath(hop.where as Record<string, unknown>)) bad('a path inside a path is not allowed');
    if (hop.repeat !== undefined && hop.repeat !== true) bad(`${at}: "repeat" is true or absent`);
    if (hop.repeat === true) repeats += 1;
  });
  if (repeats > 1) bad('only one hop of a path may repeat');
  return p as unknown as PathShape;
}

function holdsPath(where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (k === '$path' || k === 'path') return true;
    if (Array.isArray(v)) {
      for (const x of v) if (x && typeof x === 'object' && holdsPath(x as Record<string, unknown>)) return true;
    } else if (v && typeof v === 'object' && holdsPath(v as Record<string, unknown>)) return true;
  }
  return false;
}

/** How a field is stored, read from the lookup; `absent` when the collection has no such column. */
function storageOf(
  lookup: CollectionLookup,
  collection: string,
  field: string
): { storage: Edge['storage']; targetClass?: string; type?: string } {
  const info = lookup(collection);
  if (!info) throw noSuchCollection(`The path goes through "${collection}", and there is no such collection`);
  const declared = info.properties?.[field];
  const type = declared?.type;
  if (type === 'Pointer') return { storage: 'pointer', targetClass: declared?.targetClass, type };
  if (type === 'Relation') return { storage: 'relation', targetClass: declared?.targetClass, type };
  if (type === 'Array') return { storage: 'list', type };
  if (declared || info.present?.has(field)) return { storage: 'pointer', type: type || 'String' };
  return { storage: 'absent' };
}

function resolveEdge(hop: PathHop, current: string, lookup: CollectionLookup, at: string): Edge {
  if ('follow' in hop) {
    const s = storageOf(lookup, current, hop.follow);
    if (s.storage === 'absent') {
      if (!hop.to) throw new Error(`${at}: "${current}" has no field "${hop.follow}" to follow; if it is meant to hold ids, say which collection with "to"`);
      return { of: current, to: hop.to, storage: 'absent', field: hop.follow, back: false, where: hop.where, repeat: hop.repeat === true };
    }
    const to = hop.to || s.targetClass;
    if (!to) {
      throw new Error(
        `${at}: "${hop.follow}" on "${current}" is not a declared link (it is ${s.type || 'untyped'}); say which collection it names with "to"`
      );
    }
    if (!lookup(to)) throw noSuchCollection(`${at}: "${hop.follow}" leads to "${to}", and there is no such collection`);
    return { of: current, to, storage: s.storage, field: hop.follow, back: false, where: hop.where, repeat: hop.repeat === true };
  }
  const s = storageOf(lookup, hop.from, hop.by);
  if (s.storage === 'list') {
    throw new Error(
      `${at}: "${hop.by}" on "${hop.from}" is a list kept on the record itself, and a list cannot be read the other way round — make it a Links field, or a record of its own`
    );
  }
  return { of: current, to: hop.from, storage: s.storage, field: hop.by, back: true, where: hop.where, repeat: hop.repeat === true };
}

/** The junction a Relation column is stored in — the SQLite adapter's private convention, reproduced by the Postgres one. */
const junctionOf = (owning: string, field: string): string => escapeTable(`_Join_${field}_${owning}`);

/** The ids the current rows' list field holds, as a subquery over `prev`. */
function listValues(of: string, field: string, prev: string, dialect: SqlDialect): string {
  const t = escapeTable(of);
  const col = `${t}.${escapeColumn(field)}`;
  if (dialect === 'postgres') {
    return `SELECT jsonb_array_elements_text(${col}) FROM ${t} WHERE ${t}."objectId" IN (${prev}) AND jsonb_typeof(${col}) = 'array'`;
  }
  return `SELECT "value" FROM ${t}, json_each(${col}) WHERE ${t}."objectId" IN (${prev}) AND json_valid(${col})`;
}

/** One fixed hop: the ids of `edge.to` reached from the ids `prev` selects. */
function oneHop(edge: Edge, prev: string, guards: (c: string, w?: Record<string, unknown>) => string, dialect: SqlDialect): string {
  const to = escapeTable(edge.to);
  const of = escapeTable(edge.of);
  const field = escapeColumn(edge.field);
  let ids: string;
  if (edge.back) {
    // The rows of `to` whose field names a current row.
    ids =
      edge.storage === 'relation'
        ? `${to}."objectId" IN (SELECT "owningId" FROM ${junctionOf(edge.to, edge.field)} WHERE "relatedId" IN (${prev}))`
        : edge.storage === 'absent'
          ? 'FALSE'
          : `${to}.${field} IN (${prev})`;
  } else {
    ids =
      edge.storage === 'relation'
        ? `${to}."objectId" IN (SELECT "relatedId" FROM ${junctionOf(edge.of, edge.field)} WHERE "owningId" IN (${prev}))`
        : edge.storage === 'list'
          ? `${to}."objectId" IN (${listValues(edge.of, edge.field, prev, dialect)})`
          : edge.storage === 'absent'
            ? 'FALSE'
            : `${to}."objectId" IN (SELECT ${of}.${field} FROM ${of} WHERE ${of}."objectId" IN (${prev}) AND ${of}.${field} IS NOT NULL)`;
  }
  return `SELECT "objectId" FROM ${to} WHERE ${ids}${guards(edge.to, edge.where)}`;
}

/**
 * A repeated hop: a recursive common table expression over one collection,
 * bounded by `left` steps. `UNION` (not `UNION ALL`) so a cycle does not grow
 * the working set, and the depth column so it ends at the bound regardless.
 * Rows at depth 0 are the seeds and are not returned — "the topics under this
 * one" does not include this one.
 */
function repeatedHop(
  edge: Edge,
  prev: string,
  left: number,
  guards: (c: string, w?: Record<string, unknown>) => string,
  params: unknown[],
  dialect: SqlDialect
): string {
  if (left < 1) throw new Error(`The repeated hop has no depth left: "maxDepth" covers only the ${edge.repeat ? 'other' : ''} hops`);
  const t = escapeTable(edge.to);
  const field = escapeColumn(edge.field);
  let join: string;
  if (edge.storage === 'absent') join = `JOIN ${t} ON FALSE`;
  else if (edge.storage === 'relation') {
    const j = junctionOf(edge.to, edge.field);
    join = edge.back
      ? `JOIN ${j} ON ${j}."relatedId" = "_walk"."objectId" JOIN ${t} ON ${t}."objectId" = ${j}."owningId"`
      : `JOIN ${j} ON ${j}."owningId" = "_walk"."objectId" JOIN ${t} ON ${t}."objectId" = ${j}."relatedId"`;
  } else if (edge.storage === 'list') {
    throw new Error('A list field cannot be followed again and again; a tree is a Link to the same collection');
  } else {
    join = edge.back
      ? `JOIN ${t} ON ${t}.${field} = "_walk"."objectId"`
      : `JOIN ${t} AS "_from" ON "_from"."objectId" = "_walk"."objectId" JOIN ${t} ON ${t}."objectId" = "_from".${field}`;
  }
  // The seeds bind before the step's guards: SQL reads the CTE top to bottom,
  // and the parameter order has to follow the text order.
  const seeds = `SELECT "_seed"."objectId", 0 FROM (${prev}) AS "_seed"`;
  params.push(left);
  const step = `SELECT ${t}."objectId", "_walk"."_depth" + 1 FROM "_walk" ${join} WHERE "_walk"."_depth" < ?${guards(edge.to, edge.where)}`;
  return (
    `WITH RECURSIVE "_walk"("objectId", "_depth") AS (${seeds} UNION ${step}) ` +
    `SELECT DISTINCT "objectId" FROM "_walk" WHERE "_depth" >= 1`
  );
}

/**
 * Build ORDER BY clause from Parse-style sort
 *
 * @param sort - Sort specification (e.g., 'name' or '-createdAt' for desc)
 * @param tableAlias - BAK-008: qualify column references (see buildWhereClause).
 * @param scope - DEF-014: sorting by a column the table does not have compiles
 *   to `ORDER BY NULL`, which is what sorting by an all-NULL column does — every
 *   row ties. Before this, a list page sorted by a property nothing had written
 *   yet failed the same way a filter on one did.
 * @returns SQL ORDER BY clause (without "ORDER BY" keyword)
 */
export function buildOrderClause(
  sort: string | string[] | undefined,
  tableAlias?: string,
  scope?: ColumnScope
): string {
  if (!sort) {
    return '';
  }

  const sortArray = Array.isArray(sort) ? sort : sort.split(',');

  const orders = sortArray.map((s) => {
    const trimmed = s.trim();
    const desc = trimmed.startsWith('-');
    const name = desc ? trimmed.substring(1) : trimmed;
    const col = columnRef(name, scope, tableAlias);
    return `${col} ${desc ? 'DESC' : 'ASC'}`;
  });

  return orders.join(', ');
}

/**
 * Build a SELECT query
 */
export function buildSelect(
  options: SelectOptions,
  schema?: unknown,
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);

  // Build SELECT clause
  let selectClause = '*';
  if (options.select) {
    const selectArray = Array.isArray(options.select) ? options.select : options.select.split(',');
    // Always include the record key. DEBT-006: this said 'id', a column the
    // schema never creates — tables key on "objectId" (SchemaManager), which the
    // relation subquery in buildWhere already used.
    const fields = new Set(['objectId', ...selectArray.map((s) => s.trim())]);
    selectClause = Array.from(fields)
      .map((f) => {
        // DEF-014: `select` names columns too. An absent one is selected as an
        // explicit NULL under its own name, so the record carries the key with
        // no value — the same row an all-NULL column produces — rather than the
        // statement failing and the caller getting no record at all.
        const ref = columnRef(f, scope);
        return ref === 'NULL' ? `NULL as ${escapeColumn(f)}` : ref;
      })
      .join(', ');
  }

  let sql = `SELECT ${selectClause} FROM ${table}`;

  // Build WHERE clause (query filter AND row-level ACL predicate)
  const conditions: string[] = [];
  if (options.where) {
    const whereClause = buildWhereClause(options.where, params, schema, undefined, scope, dialect, pathEnv(options));
    if (whereClause) {
      conditions.push(whereClause);
    }
  }
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    conditions.push(aclClause);
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  // Build ORDER BY clause
  if (options.sort) {
    const orderClause = buildOrderClause(options.sort, undefined, scope);
    if (orderClause) {
      sql += ` ORDER BY ${orderClause}`;
    }
  }

  // Build LIMIT/OFFSET
  if (options.limit !== undefined) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options.skip !== undefined && options.skip > 0) {
    sql += ' OFFSET ?';
    params.push(options.skip);
  }

  return { sql, params };
}

/**
 * Build a COUNT query
 */
export function buildCount(
  options: QueryOptionsBase,
  schema?: unknown,
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);

  let sql = `SELECT COUNT(*) as count FROM ${table}`;

  const conditions: string[] = [];
  if (options.where) {
    const whereClause = buildWhereClause(options.where, params, schema, undefined, scope, dialect, pathEnv(options));
    if (whereClause) {
      conditions.push(whereClause);
    }
  }
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    conditions.push(aclClause);
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return { sql, params };
}

/**
 * A caller may name its own record (P90 SYN-003): an id a device made offline
 * has to survive the trip, or anything pointing at it breaks. It is used in URL
 * paths (`/classes/:c/:id`), so it is held to URL-safe characters.
 */
const CLIENT_OBJECT_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const CLIENT_OBJECT_ID_INVALID = 'objectId must be a string of 1 to 128 letters, digits, "-" or "_".';

export function isClientObjectId(value: unknown): value is string {
  return typeof value === 'string' && CLIENT_OBJECT_ID.test(value);
}

export function clientObjectIdTaken(collection: string, id: string): string {
  return `objectId "${id}" is already used in "${collection}".`;
}

/**
 * Which refusal a create's error message is, so the HTTP layer can answer 409
 * or 400 without reading SQLite's wording. `null` for every other error.
 */
export function clientObjectIdProblem(message: string): 'taken' | 'invalid' | null {
  if (message === CLIENT_OBJECT_ID_INVALID) return 'invalid';
  if (/^objectId ".*" is already used in ".*"\.$/.test(message)) return 'taken';
  return null;
}

/**
 * A write refused by a unique index (FED-002), decoded from SQLite's own text.
 *
 * SQLite says `UNIQUE constraint failed: Item.guid` (and, for a composite
 * index, `Item.sourceId, Item.guid`) — which names the table and the columns
 * but not the offending value, and reads like a stack trace. It is decoded
 * rather than rewritten because the HTTP layer is the only place that knows the
 * value: it has the request body in its hand, and the adapter does not keep it.
 *
 * Returns `null` for every other error, including a failed PRIMARY KEY, which
 * is the objectId case {@link clientObjectIdProblem} already owns.
 *
 * `values` is there only when the store filled the colliding field itself (a
 * series number, P116-S22-SERIESMSG) — the one value the body never carried.
 * See {@link uniqueConstraintWithValues}.
 */
export function uniqueConstraintProblem(message: string): { collection: string; fields: string[]; values?: Record<string, unknown> } | null {
  const m = /^UNIQUE constraint failed: (.+?)(?:; values (\{.*\}))?$/.exec(String(message || '').trim());
  if (!m) return null;
  let values: Record<string, unknown> | undefined;
  if (m[2]) {
    try {
      values = JSON.parse(m[2]);
    } catch {
      return null;
    }
  }

  const parts = m[1].split(',').map((s) => s.trim());
  const collections = new Set<string>();
  const fields: string[] = [];
  for (const part of parts) {
    const dot = part.lastIndexOf('.');
    if (dot <= 0) return null;
    collections.add(part.slice(0, dot));
    fields.push(part.slice(dot + 1));
  }
  if (collections.size !== 1 || fields.length === 0) return null;
  // The PRIMARY KEY is `objectId`; that refusal has its own, earlier reading.
  if (fields.length === 1 && fields[0] === 'objectId') return null;

  return values ? { collection: [...collections][0], fields, values } : { collection: [...collections][0], fields };
}

/**
 * P116-S22-SERIESMSG — a unique refusal of a write the store filled in itself (a series number it
 * handed out): the message carries the values `filled` holds for the colliding fields, so the 409
 * can name the number. Any other message, or one whose fields the store did not fill, is returned
 * as it was.
 */
export function uniqueConstraintWithValues(message: string, filled: Record<string, unknown>): string {
  const problem = uniqueConstraintProblem(message);
  if (!problem || problem.values) return message;
  const values: Record<string, unknown> = {};
  for (const f of problem.fields) if (Object.prototype.hasOwnProperty.call(filled, f)) values[f] = filled[f];
  return Object.keys(values).length ? `${message}; values ${JSON.stringify(values)}` : message;
}

/**
 * HLT-016 — "change this row only if nobody has changed it since I read it".
 *
 * Field → the value it must still hold for the update to apply. Scalars only, and deliberately:
 * an object or array here would reach `node:sqlite` as a bound value, where a leading bare object
 * is read as a named-parameter map and every `?` after it shifts by one (HLT-018). And SQLite
 * compares TEXT byte-wise while PostgreSQL compares JSONB by meaning, so the two engines would
 * disagree on whether `{a:1,b:2}` "still holds". `null` means the field must still be empty.
 */
export type ExpectedValues = Record<string, string | number | boolean | null>;

/** At most this many fields per precondition: a version column is one, a small key is two. */
export const MAX_EXPECTED_FIELDS = 8;

/**
 * The adapter's refusal when the row exists and the caller may write it, but it no longer holds
 * the expected values. The HTTP layer answers it 409 via {@link preconditionProblem}.
 */
export const PRECONDITION_FAILED = 'Precondition failed: the record has changed since it was read';

const EXPECTED_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Why `expect` cannot be used as a precondition, or `null` when it can. */
export function expectedValuesProblem(expect: unknown): string | null {
  if (!expect || typeof expect !== 'object' || Array.isArray(expect)) {
    return 'must be an object of field names to the values they must still hold';
  }
  const keys = Object.keys(expect);
  if (keys.length === 0) return 'names no field';
  if (keys.length > MAX_EXPECTED_FIELDS) return `names ${keys.length} fields; at most ${MAX_EXPECTED_FIELDS}`;
  for (const key of keys) {
    if (!EXPECTED_FIELD_NAME.test(key)) return `"${key}" is not a field name`;
    const value = (expect as Record<string, unknown>)[key];
    const scalar =
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value));
    if (!scalar) return `"${key}" must be a string, number, boolean or null — an object or list cannot be compared the same way on every database`;
  }
  return null;
}

/** `T."version" = ? AND T."owner" IS NULL`, pushing one param per `=` in text order. */
function buildExpectClause(tableName: string, expect: ExpectedValues, params: unknown[]): string {
  const table = escapeTable(tableName);
  return Object.keys(expect)
    .map((key) => {
      const column = `${table}.${escapeColumn(key)}`;
      const value = expect[key];
      // `= NULL` never matches anything, on either engine.
      if (value === null) return `${column} IS NULL`;
      params.push(serializeValue(value));
      return `${column} = ?`;
    })
    .join(' AND ');
}

/**
 * `SELECT 1` for "does this row exist AND may this caller write it" — the question asked only
 * after a precondition matched 0 rows, to tell "changed since read" (409) from "not found or
 * forbidden" (404). The ACL is in it, so a row the caller cannot write still reads as missing:
 * a failed precondition is never an existence oracle.
 */
export function buildRowExists(
  collection: string,
  objectId: string,
  acl: AclContext | undefined,
  dialect: SqlDialect = 'sqlite',
  lookup?: CollectionLookup
): BuiltQuery {
  const params: unknown[] = [objectId];
  let sql = `SELECT 1 AS "one" FROM ${escapeTable(collection)} WHERE "objectId" = ?`;
  const aclClause = buildAclPredicate(collection, acl, params, dialect, { collection, acl, lookup });
  if (aclClause) sql += ` AND ${aclClause}`;
  return { sql, params };
}

/**
 * The expected field the engine said does not exist, or `null`. SQLite: `no such column:
 * Item.version`. PostgreSQL (42703): `column Item.version does not exist`. Only a field the
 * precondition named counts: any other missing column is some other fault.
 */
export function missingExpectedField(message: string, expect: ExpectedValues | undefined): string | null {
  if (!expect) return null;
  const text = String(message || '');
  const m =
    /no such column: (?:"?[A-Za-z0-9_]+"?\.)?"?([A-Za-z0-9_]+)"?/.exec(text) ||
    /column (?:"?[A-Za-z0-9_]+"?\.)?"?([A-Za-z0-9_]+)"? does not exist/.exec(text);
  if (!m || !Object.prototype.hasOwnProperty.call(expect, m[1])) return null;
  return m[1];
}

/** The refusal for a precondition that names a field the collection does not have. */
export function preconditionFieldMessage(collection: string, field: string): string {
  return `Precondition names "${field}", which "${collection}" does not have`;
}

/**
 * Which precondition refusal an adapter message is, for the HTTP layer. `changed` is a 409, and
 * `unknown-field` is the caller's mistake (400). Not a 409, because a misspelt field would
 * otherwise read as a conflict forever and a retry loop would never end.
 */
export function preconditionProblem(message: string): { kind: 'changed' } | { kind: 'unknown-field'; field: string } | null {
  const text = String(message || '');
  if (text === PRECONDITION_FAILED) return { kind: 'changed' };
  const m = /^Precondition names "([^"]+)", which "[^"]*" does not have$/.exec(text);
  if (m) return { kind: 'unknown-field', field: m[1] };
  return null;
}

/**
 * HLT-016: a write refused by a declared check. Both engines speak this one
 * sentence (`CHECK constraint failed: <collection>.<check name>`): SQLite's
 * triggers raise it and `translatePgError` rewrites PostgreSQL's 23514 into it.
 *
 * @returns The collection and the check's derived name, or null.
 */
export function checkConstraintProblem(message: string): { collection: string; check: string } | null {
  const m = /^CHECK constraint failed: ([A-Za-z0-9_]+)\.(chk_[A-Za-z0-9_]+)$/.exec(String(message || '').trim());
  return m ? { collection: m[1], check: m[2] } : null;
}

/**
 * Build an INSERT query.
 *
 * `required` (BMG-017, R6): the columns a record must name itself, from
 * `requiredWithoutDefault`. Each one the data leaves out is written as NULL, so
 * the engine refuses the row — SQLite keeps a one-time fill as the column's DDL
 * default, and would otherwise hand it to every new record that forgot the
 * field. Every SQLite caller passes it; `bmg-017-import-required` is the census.
 */
export function buildInsert(
  options: { collection: string; data: Record<string, unknown>; required?: string[] },
  id: string
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);

  // The id this is given is the id it writes. Spreading the data over it let a
  // caller's `objectId` win the INSERT while `create()` read the row back by
  // the id it passed here — the row existed and the caller got `null` (SYN-003).
  const rest: Record<string, unknown> = { ...options.data };
  delete rest.objectId;
  for (const name of options.required || []) if (rest[name] === undefined) rest[name] = null;

  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    objectId: id,
    createdAt: now,
    updatedAt: now,
    ...rest
  };

  // Remove protected fields
  delete data._createdAt;
  delete data._updatedAt;

  const columns: string[] = [];
  const placeholders: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    columns.push(escapeColumn(key));
    placeholders.push('?');
    params.push(serializeValue(value));
  }

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

  return { sql, params };
}

/**
 * Build an UPDATE query
 */
export function buildUpdate(
  options: {
    collection: string;
    id?: string;
    objectId?: string;
    data: Record<string, unknown>;
    acl?: AclContext;
    /** HLT-016 — "only if unchanged". See {@link ExpectedValues}. */
    expect?: ExpectedValues;
    lookup?: CollectionLookup;
  },
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);

  const data = { ...options.data };

  // Add updatedAt
  data.updatedAt = new Date().toISOString();

  // Remove protected fields
  delete data.id;
  delete data.createdAt;
  delete data._createdAt;
  delete data._updatedAt;

  const setClause: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    setClause.push(`${escapeColumn(key)} = ?`);
    params.push(serializeValue(value));
  }

  // Use id or objectId for backwards compatibility
  const recordId = options.id || options.objectId;
  params.push(recordId);

  let sql = `UPDATE ${table} SET ${setClause.join(', ')} WHERE "objectId" = ?`;

  // HLT-016: the expected values go in the SAME statement, after the id and before the ACL, so
  // their params land where their markers are. A version check done as a read before this
  // UPDATE would be the race it exists to prevent.
  if (options.expect) {
    sql += ` AND ${buildExpectClause(options.collection, options.expect, params)}`;
  }

  // Row-level write check compiled into the statement itself: 0 rows changed
  // means not-found OR forbidden, indistinguishably (no read-then-write race,
  // no existence leak).
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    sql += ` AND ${aclClause}`;
  }

  return { sql, params };
}

/**
 * Build a DELETE query
 */
export function buildDelete(
  options: {
    collection: string;
    id?: string;
    objectId?: string;
    acl?: AclContext;
    lookup?: CollectionLookup;
  },
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const table = escapeTable(options.collection);
  // Use id or objectId for backwards compatibility
  const recordId = options.id || options.objectId;
  const params: unknown[] = [recordId];
  let sql = `DELETE FROM ${table} WHERE "objectId" = ?`;
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    sql += ` AND ${aclClause}`;
  }
  return { sql, params };
}

/**
 * Build an INCREMENT query
 */
export function buildIncrement(
  options: {
    collection: string;
    id?: string;
    objectId?: string;
    properties: Record<string, number>;
    acl?: AclContext;
    lookup?: CollectionLookup;
  },
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);

  const setClause: string[] = [];

  for (const [key, amount] of Object.entries(options.properties)) {
    const col = escapeColumn(key);
    setClause.push(`${col} = COALESCE(${col}, 0) + ?`);
    params.push(amount);
  }

  // Add updatedAt
  setClause.push('"updatedAt" = ?');
  params.push(new Date().toISOString());

  // Use id or objectId for backwards compatibility
  const recordId = options.id || options.objectId;
  params.push(recordId);

  let sql = `UPDATE ${table} SET ${setClause.join(', ')} WHERE "objectId" = ?`;

  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    sql += ` AND ${aclClause}`;
  }

  return { sql, params };
}

/**
 * Turn a plain user-typed search phrase into a safe FTS5 MATCH query string
 * (BAK-008).
 *
 * FTS5's default query syntax is NOT a plain-text search box: bare `-` means
 * "exclude the next term", `:` prefixes a column filter, `*` is a prefix
 * wildcard, and unbalanced `"` is a syntax error — so an ordinary phrase like
 * "state-of-the-art" or someone's own literal `"quoted"` input would either
 * throw ("no such column: ...") or silently mean something the user never
 * intended. Wrapping each whitespace-separated chunk in its own double-quoted
 * FTS5 string literal makes every character inside it literal (no operators),
 * while still tokenizing normally within the quotes — the index and the query
 * use the same tokenizer, so a hyphenated word like "state-of-the-art" still
 * matches the same stored value it was split from. Multiple words remain an
 * implicit AND across independent phrases (unchanged, order-insensitive)
 * rather than becoming one big order-sensitive phrase.
 *
 * @param term - raw user input
 * @returns an FTS5 query string safe to bind as the MATCH RHS
 */
export function toFts5MatchQuery(term: string): string {
  return String(term)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => `"${tok.replace(/"/g, '""')}"`)
    .join(' ');
}

/**
 * The three Postgres search expressions for one collection, or the refusal.
 *
 * `fields` is required on this dialect and there is no default: PostgreSQL has
 * no shadow table to read the indexed field list out of, so a builder that
 * guessed would search a set of columns nobody chose — the "wrong rows, no
 * error" shape this file refuses in `translateOperator`'s default branch too.
 */
function pgSearchParts(fields: string[] | undefined, table: string) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error(SEARCH_FIELDS_REQUIRED);
  }
  const cols = fields.map((f) => `${table}.${escapeColumn(f)}`);
  return { vector: searchVectorSql(cols), text: searchTextSql(cols) };
}

/**
 * Build a search+filter+ACL SELECT joined against a collection's FTS5 shadow
 * table (BAK-008). MATCHes `options.search` (an FTS5 query string) against the
 * indexed fields, ANDs in the normal structured `where` and the row-level ACL
 * predicate (unchanged — reused verbatim, shared tests with BAK-003), and
 * ranks by BM25 (SQLite convention: lower/more-negative is a better match).
 * Also selects an auto-column snippet.
 *
 * Requires `<collection>_fts` to exist (SchemaManager.rebuildSearchIndex) —
 * callers should translate the resulting "no such table" SQL error into a
 * clear "search not enabled" message (see LocalSQLAdapter.search).
 */
export function buildSearchSelect(
  options: SearchOptions,
  schema?: unknown,
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);
  const ftsTable = escapeTable(`${options.collection}_fts`);

  let sql: string;
  let conditions: string[];

  if (dialect === 'postgres') {
    const { vector, text } = pgSearchParts(options.fields, table);
    // 🔴 `_rank` is NEGATED, and it is not cosmetic. SQLite's `bm25()` is
    // lower-is-better; `LocalSQLAdapter.search` publishes `_score = -_rank` on
    // that basis, and this function's own default ordering is `"_rank" ASC`.
    // PostgreSQL's `ts_rank_cd` is higher-is-better, so emitting it unnegated
    // would hand every caller the ranking backwards — worst match first, and a
    // `_score` that decreases with relevance — with nothing failing anywhere.
    sql =
      `SELECT ${table}.*, -ts_rank_cd(${vector}, ${SEARCH_TSQUERY}) AS "_rank", ` +
      `ts_headline(${SEARCH_CONFIG}, ${text}, ${SEARCH_TSQUERY}, ` +
      `'StartSel=<mark>, StopSel=</mark>, MaxWords=24, MinWords=1, MaxFragments=1') AS "_snippet" ` +
      `FROM ${table}`;
    // Two markers in the SELECT (the rank's tsquery and the headline's), one in
    // the predicate below: three bindings of one search term, where the SQLite
    // statement binds it once.
    params.push(options.search, options.search);
    conditions = [`${vector} @@ ${SEARCH_TSQUERY}`];
    params.push(options.search);
  } else {
    sql =
      `SELECT ${table}.*, bm25(${ftsTable}) AS "_rank", ` +
      `snippet(${ftsTable}, -1, '<mark>', '</mark>', '…', 24) AS "_snippet" ` +
      `FROM ${table} JOIN ${ftsTable} ON ${ftsTable}.rowid = ${table}.rowid`;

    params.push(toFts5MatchQuery(options.search));
    conditions = [`${ftsTable} MATCH ?`];
  }

  if (options.where) {
    const whereClause = buildWhereClause(options.where, params, schema, table, scope, dialect, pathEnv(options));
    if (whereClause) conditions.push(whereClause);
  }
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) conditions.push(aclClause);

  sql += ` WHERE ${conditions.join(' AND ')}`;

  if (options.sort) {
    const orderClause = buildOrderClause(options.sort, table, scope);
    if (orderClause) sql += ` ORDER BY ${orderClause}`;
  } else {
    // Default: best match first. bm25() is lower-is-better in SQLite.
    sql += ` ORDER BY "_rank" ASC`;
  }

  if (options.limit !== undefined) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  if (options.skip !== undefined && options.skip > 0) {
    sql += ' OFFSET ?';
    params.push(options.skip);
  }

  return { sql, params };
}

/**
 * Build a COUNT query for a search (BAK-008) — same MATCH + filter + ACL
 * predicate as buildSearchSelect, no ranking/snippet/order/limit.
 */
export function buildSearchCount(
  options: SearchOptions,
  schema?: unknown,
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);
  const ftsTable = escapeTable(`${options.collection}_fts`);

  let sql: string;
  let conditions: string[];

  if (dialect === 'postgres') {
    const { vector } = pgSearchParts(options.fields, table);
    sql = `SELECT COUNT(*) as count FROM ${table}`;
    conditions = [`${vector} @@ ${SEARCH_TSQUERY}`];
    params.push(options.search);
  } else {
    sql = `SELECT COUNT(*) as count FROM ${table} JOIN ${ftsTable} ON ${ftsTable}.rowid = ${table}.rowid`;
    params.push(toFts5MatchQuery(options.search));
    conditions = [`${ftsTable} MATCH ?`];
  }

  if (options.where) {
    const whereClause = buildWhereClause(options.where, params, schema, table, scope, dialect, pathEnv(options));
    if (whereClause) conditions.push(whereClause);
  }
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) conditions.push(aclClause);

  sql += ` WHERE ${conditions.join(' AND ')}`;

  return { sql, params };
}

/**
 * Build a DISTINCT query
 */
export function buildDistinct(
  options: QueryOptionsBase & { property: string },
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);
  // DEF-014: aliased, so an absent column still comes back under the name the
  // caller reads it by (LocalSQLAdapter.distinct indexes rows by property).
  const ref = columnRef(options.property, scope);
  const col = ref === 'NULL' ? `NULL as ${escapeColumn(options.property)}` : ref;

  let sql = `SELECT DISTINCT ${col} FROM ${table}`;

  const conditions: string[] = [];
  if (options.where) {
    const whereClause = buildWhereClause(options.where, params, undefined, undefined, scope, dialect, pathEnv(options));
    if (whereClause) {
      conditions.push(whereClause);
    }
  }
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    conditions.push(aclClause);
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return { sql, params };
}

/**
 * Build an AGGREGATE query
 */
export function buildAggregate(
  options: QueryOptionsBase & { group: Record<string, AggregateGroupConfig>; limit?: number; skip?: number },
  scope?: ColumnScope,
  dialect: SqlDialect = 'sqlite'
): BuiltQuery {
  const params: unknown[] = [];
  const table = escapeTable(options.collection);

  const selectParts: string[] = [];

  for (const [alias, groupConfig] of Object.entries(options.group)) {
    // DEF-014: an aggregate over a column nothing has written aggregates NULLs —
    // AVG/SUM/MAX/MIN answer null and COUNT(DISTINCT NULL) answers 0, which is
    // what the same aggregate over an all-NULL column already answers.
    if (groupConfig.avg !== undefined) {
      selectParts.push(`AVG(${columnRef(groupConfig.avg, scope)}) as ${escapeColumn(alias)}`);
    } else if (groupConfig.sum !== undefined) {
      selectParts.push(`SUM(${columnRef(groupConfig.sum, scope)}) as ${escapeColumn(alias)}`);
    } else if (groupConfig.max !== undefined) {
      selectParts.push(`MAX(${columnRef(groupConfig.max, scope)}) as ${escapeColumn(alias)}`);
    } else if (groupConfig.min !== undefined) {
      selectParts.push(`MIN(${columnRef(groupConfig.min, scope)}) as ${escapeColumn(alias)}`);
    } else if (groupConfig.distinct !== undefined) {
      // COUNT DISTINCT as alternative to $addToSet
      selectParts.push(`COUNT(DISTINCT ${columnRef(groupConfig.distinct, scope)}) as ${escapeColumn(alias)}`);
    }
  }

  if (selectParts.length === 0) {
    return { sql: `SELECT COUNT(*) as count FROM ${table}`, params: [] };
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM ${table}`;

  const conditions: string[] = [];
  if (options.where) {
    const whereClause = buildWhereClause(options.where, params, undefined, undefined, scope, dialect, pathEnv(options));
    if (whereClause) {
      conditions.push(whereClause);
    }
  }
  const aclClause = buildAclPredicate(options.collection, options.acl, params, dialect, pathEnv(options));
  if (aclClause) {
    conditions.push(aclClause);
  }
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  return { sql, params };
}

/**
 * Serialize a JavaScript value for SQLite storage
 */
export function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle Parse types
  if (value && typeof value === 'object') {
    const tagged = value as ParseTaggedValue;
    // Date type
    if (tagged.__type === 'Date' && tagged.iso) {
      return tagged.iso;
    }
    // Pointer type - store just the objectId
    if (tagged.__type === 'Pointer' && tagged.objectId) {
      return tagged.objectId;
    }
    // File type - store as JSON
    if (tagged.__type === 'File') {
      return JSON.stringify(value);
    }
    // GeoPoint type - store as JSON
    if (tagged.__type === 'GeoPoint') {
      return JSON.stringify(value);
    }
    // Date objects - before the JSON branch, because a Date has no own keys
    if (value instanceof Date) {
      return value.toISOString();
    }
    // Arrays and objects - store as JSON, empty ones included.
    // P99 HLT-018: this used to require `Object.keys(value).length > 0`, which
    // was how a Date reached the branch above; `{}` then fell through as a bare
    // object SQLite cannot bind (500 on POST /classes, a whole import rolled back).
    return JSON.stringify(value);
  }

  // Handle booleans - SQLite uses 0/1
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return value;
}

/**
 * Deserialize a SQLite value back to JavaScript
 *
 * @param value
 * @param type - Expected type from schema
 */
export function deserializeValue(value: unknown, type?: string): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle type-based deserialization
  if (type === 'Boolean') {
    return Boolean(value);
  }

  if (type === 'Date') {
    return value; // Keep as ISO string, let CloudStore handle Date objects
  }

  // P99 HLT-022 (b): a String column is text, whatever it looks like. The sniff below
  // turned a learner's `[1,2]` into an array on read, on both adapters.
  if (type === 'String') {
    return value;
  }

  if (type === 'Object' || type === 'Array' || type === 'GeoPoint' || type === 'File') {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
  }

  // Try to parse JSON strings that look like objects/arrays. Kept, deliberately, for a
  // column with NO declared type: a schemaless backend has nothing else to go on.
  if (typeof value === 'string') {
    if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // Not valid JSON, return as-is
      }
    }
  }

  return value;
}
