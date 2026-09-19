/**
 * SchemaManager - Handles SQLite schema creation, migration, and export
 *
 * Manages table creation based on Noodl collection schemas,
 * handles migrations when schema changes, and can export
 * schemas to other database formats (Postgres, Supabase, etc.)
 *
 * @module adapters/local-sql/SchemaManager
 */

import { aclPredicateSql } from '../postgres/predicates';
import type { EngineDatabase } from './engine';
import { escapeTable, escapeColumn } from './QueryBuilder';
import {
  builtInIndexNames as sharedBuiltInIndexNames,
  indexName as sharedIndexName,
  MigrationRefusal,
  normalizeIndexDecls,
  POSTGRES_TYPE_MAP,
  quoteLiteral,
  sameIndexSignature,
  sanitizeIdent,
  TYPE_MAP,
  type BuiltIndex,
  type IndexDecl,
  type IndexReconcileReport,
  type IndexStatus,
  type SchemaColumn,
  type TableSchema
} from './schemaCommon';
import { columnToPostgres, relationJunctions, tableDDL } from '../postgres/ddl';

/**
 * A unique index refused by the rows already in the table (FED-002 AC4).
 *
 * Carries the numbers rather than a sentence because the caller has to put them
 * in front of a person: how many values are duplicated, and three of them, so
 * "your feed table has 412 items sharing 3 guids" can be said instead of
 * "UNIQUE constraint failed".
 */
class IndexDuplicatesError extends Error {
  code: string;
  table: string;
  fields: string[];
  duplicates: number;
  samples: unknown[][];

  constructor(table: string, fields: string[], duplicates: number, samples: unknown[][]) {
    super(
      `Cannot make (${fields.join(', ')}) unique on "${table}": ${duplicates} ` +
        `value${duplicates === 1 ? '' : 's'} already appear${duplicates === 1 ? 's' : ''} more than once ` +
        `(${samples.map((s) => JSON.stringify(s.length === 1 ? s[0] : s)).join(', ')}). ` +
        'Nothing was changed and no row was deleted.'
    );
    this.name = 'IndexDuplicatesError';
    this.code = 'INDEX_DUPLICATES';
    this.table = table;
    this.fields = fields;
    this.duplicates = duplicates;
    this.samples = samples;
  }
}

/** Options for the plain PostgreSQL export. */
interface PostgresExportOptions {
  /**
   * Emit a `BEFORE UPDATE` trigger stamping `updatedAt`. Off by default and
   * on for the Supabase path — see the comment at its emission site: on the
   * NodeGX path the app stamps the column itself and a trigger would overwrite
   * what the caller just wrote.
   */
  updatedAtTrigger?: boolean;
}

/**
 * The shape of `security.json` this export reads, declared structurally rather
 * than imported: the configuration lives in `nodegx-backend` and this package
 * is below it. Only the two fields the policies are generated from are named,
 * so a change to the rest of the config cannot break the export by type alone.
 */
interface SecurityRulesLike {
  defaults: { permissions: Record<string, string | string[]>; creatorOwns?: boolean };
  collections?: Record<string, { permissions?: Record<string, string | string[]>; creatorOwns?: boolean }>;
}

/** Options for the Supabase export. Both fields are required in practice — see `generateSupabaseSQL`. */
interface SupabaseExportOptions {
  /** The live CLP configuration. Absent: refused. */
  security?: SecurityRulesLike;
  /** The JWT claim carrying the NodeGX `_User` objectId. Absent: refused. */
  userIdClaim?: string;
}

/**
 * SchemaManager class
 */
class SchemaManager {
  /**
   * Exposed as a static so a caller across the package edge (nodegx-backend
   * requires this module untyped) can identify the refusal without matching on
   * a sentence. `err.code === 'INDEX_DUPLICATES'` is the supported check.
   */
  static IndexDuplicatesError = IndexDuplicatesError;

  /** Same reason, same door: `err.code === 'CANNOT_CROSS'` is the supported check. */
  static MigrationRefusal = MigrationRefusal;

  /**
   * The two type maps, exposed so the portability invariant BETWEEN them can
   * be asserted instead of believed: every type SQLite stores as a column must
   * have a PostgreSQL type, or the export drops the column. That invariant is
   * what `Relation: null` plus `if (pgType)` breached (BRG-D3), and nothing
   * could read the maps to notice.
   */
  static TYPE_MAPS = { sqlite: TYPE_MAP, postgres: POSTGRES_TYPE_MAP };

  db: EngineDatabase;
  _schemaCache: Map<string, TableSchema>;

  /**
   * @param db - SQLite database instance (better-sqlite3 shape; see engine.ts)
   */
  constructor(db: EngineDatabase) {
    this.db = db;
    this._schemaCache = new Map();
  }

  /**
   * Ensure the internal schema tracking table exists
   */
  ensureSchemaTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "_Schema" (
        "name" TEXT PRIMARY KEY,
        "schema" TEXT NOT NULL,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Create a table from a schema definition
   *
   * @returns Whether table was created (false if already existed)
   */
  createTable(schema: TableSchema): boolean {
    const tableName = schema.name;

    // Check if table exists
    const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);

    if (exists) {
      return false;
    }

    // Build column definitions
    const columnDefs = [
      '"objectId" TEXT PRIMARY KEY',
      '"createdAt" TEXT DEFAULT CURRENT_TIMESTAMP',
      '"updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP',
      '"ACL" TEXT' // Access control list as JSON
    ];

    // Add user-defined columns
    for (const col of schema.columns || []) {
      const colDef = this._columnToSQL(col);
      if (colDef) {
        columnDefs.push(colDef);
      }
    }

    // Create main table
    const createSQL = `CREATE TABLE ${escapeTable(tableName)} (${columnDefs.join(', ')})`;
    this.db.exec(createSQL);

    // Create standard indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_createdAt" ON ${escapeTable(tableName)}("createdAt")`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_updatedAt" ON ${escapeTable(tableName)}("updatedAt")`);

    // Create junction tables for relations
    for (const col of schema.columns || []) {
      if (col.type === 'Relation' && col.targetClass) {
        this._createJunctionTable(tableName, col.name, col.targetClass);
      }
    }

    // Store schema in tracking table
    this.ensureSchemaTable();
    this.db
      .prepare(
        `INSERT OR REPLACE INTO "_Schema" ("name", "schema", "updatedAt")
       VALUES (?, ?, CURRENT_TIMESTAMP)`
      )
      .run(tableName, JSON.stringify(schema));

    this._schemaCache.set(tableName, schema);

    // FED-002: the indexes the schema declares, applied to a table that is one
    // statement old and therefore empty — no unique declaration can be refused
    // by data here. `createTable` is create-if-absent, so a push against a
    // table that already exists reconciles through `reconcileIndexes` instead.
    if (schema.indexes !== undefined) {
      this.reconcileIndexes(tableName, schema.indexes);
    }

    return true;
  }

  /**
   * Add a column to an existing table
   */
  addColumn(tableName: string, column: SchemaColumn): void {
    const colDef = this._columnToSQL(column);
    if (!colDef) {
      return;
    }

    try {
      this.db.exec(`ALTER TABLE ${escapeTable(tableName)} ADD COLUMN ${colDef}`);

      // Update schema tracking
      const schema = this.getTableSchema(tableName);
      if (schema) {
        schema.columns = schema.columns || [];
        schema.columns.push(column);
        this.db
          .prepare(`UPDATE "_Schema" SET "schema" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`)
          .run(JSON.stringify(schema), tableName);
        this._schemaCache.set(tableName, schema);
      }
    } catch (e) {
      // Column may already exist
      if (!e.message.includes('duplicate column name')) {
        throw e;
      }
    }
  }

  /**
   * Delete a table and all its data
   *
   * @returns Whether table was deleted
   */
  deleteTable(tableName: string): boolean {
    // Check if table exists
    const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);

    if (!exists) {
      return false;
    }

    // Drop the table
    this.db.exec(`DROP TABLE IF EXISTS ${escapeTable(tableName)}`);

    // Remove from schema tracking
    this.ensureSchemaTable();
    this.db.prepare('DELETE FROM "_Schema" WHERE "name" = ?').run(tableName);

    // Clear cache
    this._schemaCache.delete(tableName);

    // Drop any junction tables for relations
    const junctionTables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?")
      .all(`_Join_%_${tableName}`) as Array<{ name: string }>;

    for (const jt of junctionTables) {
      this.db.exec(`DROP TABLE IF EXISTS ${escapeTable(jt.name)}`);
    }

    return true;
  }

  /**
   * Rename a column in a table (SQLite 3.25.0+)
   *
   * @returns Whether column was renamed
   */
  renameColumn(tableName: string, oldName: string, newName: string): boolean {
    // Validate new name
    if (!newName || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newName)) {
      throw new Error('Invalid column name');
    }

    // Can't rename system columns
    const systemCols = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    if (systemCols.includes(oldName)) {
      throw new Error('Cannot rename system columns');
    }

    try {
      this.db.exec(
        `ALTER TABLE ${escapeTable(tableName)} RENAME COLUMN ${escapeColumn(oldName)} TO ${escapeColumn(newName)}`
      );

      // Update schema tracking
      const schema = this.getTableSchema(tableName);
      if (schema && schema.columns) {
        const col = schema.columns.find((c) => c.name === oldName);
        if (col) {
          col.name = newName;
          this.db
            .prepare(`UPDATE "_Schema" SET "schema" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`)
            .run(JSON.stringify(schema), tableName);
          this._schemaCache.set(tableName, schema);
        }
      }

      return true;
    } catch (e) {
      if (e.message.includes('no such column')) {
        throw new Error(`Column "${oldName}" does not exist`);
      }
      throw e;
    }
  }

  /**
   * Change a column's declared type, converting the values already stored in it.
   *
   * AAQ-002 (phase 40). The four mutation actions that existed — create, add,
   * rename, delete — could not express "this column is the wrong type", which is
   * the shape a *reconcile* needs: a provision re-run against a collection that
   * already exists must be able to make it match the plan, and until this method
   * existed the only ways to do that were dropping the table or leaving it wrong.
   *
   * ## Two different operations wear this one name
   *
   * A column's type lives in **two** places: the `_Schema` JSON row, which is
   * what `getTableSchema` reports and therefore what every reader downstream
   * (the Data Browser, `backend:getSchema`, the editor's `prop-*` ports) actually
   * believes — and the SQLite declared type, which only sets *affinity*.
   * {@link TYPE_MAP} collapses nine Noodl types onto three SQL ones, so most
   * changes (String→Date, Object→GeoPoint, …) touch the metadata and nothing
   * else. Only a change that crosses TEXT/REAL/INTEGER has to move data, and
   * that one is a real rebuild: SQLite has no `ALTER COLUMN`.
   *
   * ⚠️ **A crossing change can lose data, and that is the point of the return
   * value.** `CAST('sold out' AS REAL)` is `0.0`, silently, per SQLite's rules —
   * so the count of non-null values that were converted comes back to the caller,
   * which is the only place a human can be told. Callers that must not lose data
   * should compare types first and refuse, rather than calling this and hoping.
   *
   * `Relation` is refused outright in both directions: it is not a column at all
   * (`_columnToSQL` returns null for it — the data lives in a junction table), so
   * "converting" one is creating or destroying a table's worth of associations,
   * which is a decision this method must not take on a caller's behalf.
   *
   * @returns What changed — `{ changed: false }` when the column already had
   *   this type, so an idempotent re-run reports honestly instead of claiming work.
   */
  changeColumnType(
    tableName: string,
    columnName: string,
    newType: string
  ): { changed: boolean; from?: string; rebuilt?: boolean; convertedValues?: number } {
    const systemCols = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    if (systemCols.includes(columnName)) {
      throw new Error('Cannot change the type of system columns');
    }
    if (!(newType in TYPE_MAP)) {
      throw new Error(`Unknown column type "${newType}"`);
    }

    const schema = this.getTableSchema(tableName);
    if (!schema) {
      throw new Error(`Table "${tableName}" does not exist`);
    }
    const col = (schema.columns || []).find((c) => c.name === columnName);
    if (!col) {
      throw new Error(`Column "${columnName}" does not exist`);
    }

    const oldType = col.type;
    if (oldType === newType) {
      return { changed: false };
    }
    if (oldType === 'Relation' || newType === 'Relation') {
      throw new Error(
        `Cannot convert "${columnName}" between ${oldType} and ${newType}: a Relation is stored in a junction ` +
          'table, not a column. Delete it and add it back to change it.'
      );
    }

    const oldSql = TYPE_MAP[oldType];
    const newSql = TYPE_MAP[newType];
    let rebuilt = false;
    let convertedValues = 0;

    // `oldSql` is undefined when the column was tracked with a type this map has
    // never heard of — an import, or a schema written by an older version. There
    // is no way to know what storage class those values are in, and SQLite does
    // not care, so that case corrects the metadata and touches no data: a
    // rebuild would emit `ADD COLUMN "x" undefined`, which is not SQL.
    if (typeof oldSql === 'string' && oldSql !== newSql) {
      // Affinity changes, so the stored values do too. Add-copy-drop-rename
      // rather than the twelve-step table rebuild: user columns carry no
      // constraints and no indexes (only `createdAt`/`updatedAt` are indexed,
      // and they are system columns this method refuses), which is what makes
      // the short form safe here and would not make it safe in general.
      const temp = `__nodegx_convert_${columnName}`;
      const nonNull = this.db
        .prepare(`SELECT COUNT(*) AS n FROM ${escapeTable(tableName)} WHERE ${escapeColumn(columnName)} IS NOT NULL`)
        .get() as { n: number } | undefined;
      convertedValues = nonNull?.n ?? 0;

      this.db.exec('BEGIN');
      try {
        this.db.exec(`ALTER TABLE ${escapeTable(tableName)} ADD COLUMN ${escapeColumn(temp)} ${newSql}`);
        this.db.exec(
          `UPDATE ${escapeTable(tableName)} SET ${escapeColumn(temp)} = ` +
            `CAST(${escapeColumn(columnName)} AS ${newSql}) WHERE ${escapeColumn(columnName)} IS NOT NULL`
        );
        this.db.exec(`ALTER TABLE ${escapeTable(tableName)} DROP COLUMN ${escapeColumn(columnName)}`);
        this.db.exec(`ALTER TABLE ${escapeTable(tableName)} RENAME COLUMN ${escapeColumn(temp)} TO ${escapeColumn(columnName)}`);
        this.db.exec('COMMIT');
      } catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
      }
      rebuilt = true;
    }

    // The metadata, which is what every reader downstream actually believes.
    col.type = newType;
    this.db
      .prepare(`UPDATE "_Schema" SET "schema" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "name" = ?`)
      .run(JSON.stringify(schema), tableName);
    this._schemaCache.set(tableName, schema);

    return { changed: true, from: oldType, rebuilt, convertedValues };
  }

  /**
   * Get schema for a table
   */
  getTableSchema(tableName: string): TableSchema | null {
    if (this._schemaCache.has(tableName)) {
      return this._schemaCache.get(tableName);
    }

    this.ensureSchemaTable();

    const row = this.db.prepare('SELECT "schema" FROM "_Schema" WHERE "name" = ?').get(tableName) as
      | { schema: string }
      | undefined;

    if (row) {
      const schema = JSON.parse(row.schema);
      this._schemaCache.set(tableName, schema);
      return schema;
    }

    return null;
  }

  /**
   * List all tables
   */
  listTables(): string[] {
    // NB: `_` is a LIKE wildcard matching any single character — unescaped,
    // `NOT LIKE '_%'` excludes EVERY table, not just underscore-prefixed ones.
    // Latent for as long as only the in-memory mock ran; surfaced by the real
    // engine (WF-004).
    const rows = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%' AND name NOT LIKE '\\_%' ESCAPE '\\'"
      )
      .all() as Array<{ name: string }>;

    return rows.map((r) => r.name);
  }

  /**
   * Export all schemas
   */
  exportSchemas(): TableSchema[] {
    this.ensureSchemaTable();

    // Same wildcard-escape fix as listTables() — `_%` unescaped matches everything.
    const rows = this.db
      .prepare('SELECT "name", "schema" FROM "_Schema" WHERE "name" NOT LIKE \'\\_%\' ESCAPE \'\\\'')
      .all() as Array<{ name: string; schema: string }>;

    return rows.map((r) => JSON.parse(r.schema));
  }

  // ===========================================================================
  // The Postgres export — BRG-004, phase 97
  //
  // What was here before dropped every declared index (BRG-D2), dropped every
  // relation column with no warning (BRG-D3), and — on the Supabase path —
  // emitted four `TO authenticated … USING (true)` policies per table over a
  // backend that enforces row ACLs in the SQL it builds (BRG-D1). Richard ruled
  // (R3) that it is repaired here rather than removed.
  //
  // The rule the repair is written to, and the phase's own sentence: **anything
  // that cannot be carried across is named and refused, never approximated.**
  // Every `MigrationRefusal` below is a thing this export could have emitted
  // something plausible for.
  // ===========================================================================

  /**
   * One relation column as the junction table it is actually stored in.
   *
   * The name is reproduced EXACTLY as `_createJunctionTable` builds it, down to
   * the same sanitisation, rather than given a nicer one: the junction table's
   * name is this adapter's private convention (`getRelationOwners`' docstring
   * says so), and a junction the adapter cannot find by name is a relation that
   * does not traverse on the other side.
   *
   * A `Relation` column with no `targetClass` has no junction table in SQLite
   * either — nothing was stored, so there is nothing to carry.
   */
  _relationJunctions(schema: TableSchema): Array<{ table: string; field: string; targetClass: string }> {
    return relationJunctions(schema);
  }

  /** One column definition, in Postgres, or a refusal naming the type. */
  _columnToPostgres(schema: TableSchema, col: SchemaColumn): string | null {
    return columnToPostgres(schema, col);
  }

  /**
   * PostgreSQL DDL for every collection: columns, the two built-in indexes,
   * **every declared index including `unique`** (BRG-D2) and **every relation's
   * junction table** (BRG-D3).
   *
   * No row-security policy is emitted and none is needed on this path: the
   * NodeGX app server compiles the same ACL predicate into the SQL it builds
   * whichever database is behind it (`QueryBuilder.buildAclPredicate`), so the
   * ACLs carry because the enforcement code carries. `generateSupabaseSQL` is
   * the path where a third party's PostgREST becomes the enforcement point, and
   * it is the one that needs real policies.
   *
   * @throws MigrationRefusal — `code: 'CANNOT_CROSS'` — for anything it will
   *   not approximate.
   */
  generatePostgresSQL(options?: PostgresExportOptions): string {
    const schemas = this.exportSchemas();
    const touchTrigger = Boolean(options && options.updatedAtTrigger);
    const out: string[] = [];

    out.push('-- Generated by NodeGX: SQLite -> PostgreSQL schema export.');
    out.push(`-- ${schemas.length} collection${schemas.length === 1 ? '' : 's'}.`);
    out.push('--');
    out.push('-- Row ACLs are deliberately NOT expressed as policies here. The NodeGX app');
    out.push('-- server compiles the same ACL predicate into every query it builds, whichever');
    out.push('-- database is behind it, so they carry because the enforcement code carries.');
    out.push('');

    for (const schema of schemas) {
      // BRG-005 moved the loop body to `postgres/ddl.ts` so the live adapter
      // creates the same table this export describes. Same lines, one source.
      out.push(...tableDDL(schema, { touchTrigger }));
    }

    return out.join('\n');
  }

  /**
   * The same DDL plus row-level security, for the path where a third party's
   * PostgREST — not the NodeGX app server — is the thing deciding who may read
   * a row.
   *
   * 🔴 **This is BRG-D1.** What was here granted every authenticated caller
   * every row of every table, with two of the four policies carrying the
   * comment "(customize based on ACL)".
   *
   * Three things it now needs, and refuses without, because each is a fact it
   * cannot invent:
   *
   * 1. `security` — the live CLP configuration. Which operations are allowed at
   *    all, and to whom, is written in `security.json`; a generator guessing it
   *    is how `USING (true)` happened.
   * 2. `userIdClaim` — the JWT claim carrying the **NodeGX `_User` objectId**.
   *    The keys of a row's ACL are NodeGX user ids, and `auth.uid()` on the
   *    other side is a Supabase auth user's uuid. They are not the same
   *    identifier, and a policy comparing them denies everyone or, worse, is
   *    written to compare something that happens to match.
   * 3. Rows whose ACL names a **role**. Roles live in `_Role` inside this
   *    backend; PostgREST has no idea what they are. A policy that ignores
   *    `role:` keys quietly narrows access for exactly the rows an
   *    administrator granted a team — so the export is refused by name, with
   *    the count, rather than emitted.
   *
   * @throws MigrationRefusal — `code: 'CANNOT_CROSS'`.
   */
  generateSupabaseSQL(options?: SupabaseExportOptions): string {
    const security = options && options.security;
    if (!security || !security.defaults || !security.defaults.permissions) {
      throw new MigrationRefusal(
        'A Supabase export needs the live security configuration: which operations each collection ' +
          'allows, and to whom, is in security.json and cannot be guessed. Generating policies without it ' +
          'is how this export came to grant every authenticated user every row.',
        'the CLP configuration'
      );
    }
    const claim = options && options.userIdClaim;
    if (!claim) {
      throw new MigrationRefusal(
        "A row's ACL is keyed by NodeGX _User objectIds, and PostgREST authenticates a Supabase auth user. " +
          'Name the JWT claim that carries the NodeGX user id (`userIdClaim`) so the policies can compare like ' +
          'with like — there is no correct default, and a policy comparing the wrong two identifiers either ' +
          'denies everyone or lets the wrong person through.',
        'the identity mapping'
      );
    }

    const schemas = this.exportSchemas();
    const rls: string[] = [];

    rls.push('');
    rls.push('-- Row Level Security, generated from security.json and the row ACLs.');
    rls.push(`-- The principal is the JWT claim "${claim}", which must carry the NodeGX _User objectId.`);
    rls.push('-- `anon` and `authenticated` are the roles PostgREST switches to; they must exist.');
    rls.push('');

    const principal = `(current_setting('request.jwt.claims', true)::jsonb ->> ${quoteLiteral(claim)})`;

    for (const schema of schemas) {
      const table = escapeTable(schema.name);
      const name = schema.name;
      this._assertNoRoleKeyedAcls(name);

      const find = this._ruleFor(security, name, 'find');
      const get = this._ruleFor(security, name, 'get');
      // Compared by CONTENT: both are normalised, sorted lists, and `!==` on
      // two arrays is a reference check that is always true.
      if (find.join('|') !== get.join('|')) {
        // PostgREST answers a fetch-by-id with the same SELECT it answers a
        // listing with, so one policy has to stand for both rules. A union
        // hands a caller denied `find` the whole table one row at a time; an
        // intersection denies a `get` the backend allows. Neither is this
        // collection's rule, so neither is written.
        throw new MigrationRefusal(
          `"${name}" allows find to ${JSON.stringify(find)} and get to ${JSON.stringify(get)}. PostgREST cannot ` +
            'tell one from the other — both are a SELECT — so a single policy would have to be more permissive ' +
            'or more restrictive than what this backend enforces.',
          'find and get differing',
          name
        );
      }

      rls.push(`-- Policies for ${name}`);
      rls.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);

      this._emitPolicy(rls, table, name, 'SELECT', find, this._aclPredicate(principal, 'read'));
      this._emitPolicy(
        rls,
        table,
        name,
        'INSERT',
        this._ruleFor(security, name, 'create'),
        this._aclPredicate(principal, 'write')
      );
      this._emitPolicy(
        rls,
        table,
        name,
        'UPDATE',
        this._ruleFor(security, name, 'update'),
        this._aclPredicate(principal, 'write')
      );
      this._emitPolicy(
        rls,
        table,
        name,
        'DELETE',
        this._ruleFor(security, name, 'delete'),
        this._aclPredicate(principal, 'write')
      );
      rls.push('');
    }

    return this.generatePostgresSQL({ updatedAtTrigger: true }) + rls.join('\n');
  }

  /** The effective CLP rule for one operation, collection entry over defaults. */
  _ruleFor(security: SecurityRulesLike, collection: string, op: string): string[] {
    const entry = security.collections && security.collections[collection];
    const raw =
      entry && entry.permissions && entry.permissions[op] !== undefined
        ? entry.permissions[op]
        : security.defaults.permissions[op];
    const atoms = raw === undefined ? [] : Array.isArray(raw) ? raw.slice() : [raw];
    return atoms.map((a) => String(a)).sort();
  }

  /**
   * The ACL predicate, in PostgreSQL, saying exactly what
   * `QueryBuilder.buildAclPredicate` says in SQLite: a row with no ACL is
   * public, and a row with one qualifies when an entry whose key is '*' or this
   * caller grants the access asked for.
   *
   * 🔴 **This used to be its own copy of that translation, and the copy was
   * wrong in two ways that BRG-005 measured** (see `postgres/predicates.ts`, now
   * the single source for it):
   *
   * - `(_acl.value ->> '<access>') IN ('1', 'true')` compared the flag as
   *   **text**, so a flag stored as the JSON real `1.0` rendered as `"1.0"` and
   *   was **denied** — where the SQLite predicate's numeric `= 1` grants it. A
   *   policy that silently shows a user fewer of their own rows.
   * - `jsonb_each` **raises** on an ACL that is not a JSON object, and an error
   *   inside a policy's `USING` clause fails the statement — so one malformed
   *   ACL row would break every read of the table, where SQLite merely hides
   *   that row.
   *
   * Both were found by grading the two engines against each other over the same
   * eight flag spellings and five ACL shapes, which is the only reason they were
   * found at all: each copy agreed with itself.
   */
  _aclPredicate(principal: string, access: 'read' | 'write'): string {
    return aclPredicateSql('"ACL"', `'*', ${principal}`, access, '_acl', '\n      ');
  }

  /**
   * One policy, or the reason there is none.
   *
   * A rule of 'nobody' emits NO policy on purpose: RLS with no policy denies,
   * which is the same answer the backend gives, and it is the one case where
   * emitting nothing is the faithful translation rather than an omission — so
   * it says so in a line of SQL that a person reading the file can see.
   */
  _emitPolicy(
    out: string[],
    table: string,
    collection: string,
    action: string,
    rule: string[],
    aclPredicate: string
  ): void {
    const roles = rule.filter((atom) => atom.startsWith('role:'));
    if (roles.length > 0) {
      throw new MigrationRefusal(
        `"${collection}" restricts ${action} to ${roles.join(', ')}. Roles live in this backend's _Role table; ` +
          'PostgREST has no membership to check, so the policy would either ignore the restriction or deny ' +
          'everyone.',
        'role-based collection permissions',
        collection
      );
    }

    const grantees: string[] = [];
    if (rule.indexOf('public') !== -1) grantees.push('anon', 'authenticated');
    else if (rule.indexOf('authenticated') !== -1) grantees.push('authenticated');

    if (grantees.length === 0) {
      out.push(`-- No ${action} policy: security.json allows ${action} to nobody, and RLS with no policy denies.`);
      return;
    }

    const policy = `"nodegx_${sanitizeIdent(collection)}_${action.toLowerCase()}"`;
    const to = grantees.join(', ');

    // The GRANT as well as the policy. A policy narrows a privilege that has
    // been granted; it does not grant one, so a table with policies and no
    // grants denies everyone and reads as "the policies are wrong". Emitting
    // both here also means an operation ruled `nobody` above leaves NEITHER,
    // which is the same answer this backend gives, twice.
    out.push(`GRANT ${action} ON ${table} TO ${to};`);
    if (action === 'INSERT') {
      out.push(`CREATE POLICY ${policy} ON ${table} FOR INSERT TO ${to}`);
      out.push(`  WITH CHECK ${aclPredicate};`);
    } else if (action === 'UPDATE') {
      out.push(`CREATE POLICY ${policy} ON ${table} FOR UPDATE TO ${to}`);
      out.push(`  USING ${aclPredicate}`);
      out.push(`  WITH CHECK ${aclPredicate};`);
    } else {
      out.push(`CREATE POLICY ${policy} ON ${table} FOR ${action} TO ${to}`);
      out.push(`  USING ${aclPredicate};`);
    }
  }

  /**
   * Refuse a table holding rows whose ACL names a role.
   *
   * This reads the DATA, not the configuration, because that is where the
   * answer is: `security.json` says nothing about which keys a row's ACL
   * carries, and an administrator granting a team access writes `role:editors`
   * into the row itself.
   */
  _assertNoRoleKeyedAcls(tableName: string): void {
    let row: { n?: number; sample?: string } | undefined;
    try {
      row = this.db
        .prepare(
          `SELECT COUNT(*) AS n, MIN(_acl.key) AS sample FROM ${escapeTable(tableName)}, json_each("ACL") AS _acl ` +
            `WHERE "ACL" IS NOT NULL AND _acl.key LIKE 'role:%'`
        )
        .get() as { n?: number; sample?: string };
    } catch (e) {
      // No such table, or an engine with no json1 (the ephemeral mock). Nothing
      // measured means nothing claimed: this check is an assertion about rows
      // that exist, and where none can be read it has nothing to say.
      return;
    }
    if (!row || !row.n) return;

    throw new MigrationRefusal(
      `${row.n} row${row.n === 1 ? '' : 's'} in "${tableName}" ${row.n === 1 ? 'has an ACL' : 'have ACLs'} naming a ` +
        `role (${row.sample}). Roles are members of this backend's _Role table, which PostgREST cannot see, so ` +
        'those grants would silently disappear from the exported policies.',
      'role-keyed row ACLs',
      tableName,
      { rows: row.n, sample: row.sample }
    );
  }

  /**
   * Generate JSON schema export
   */
  exportAsJSON(): { version: string; exportedAt: string; tables: TableSchema[] } {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tables: this.exportSchemas()
    };
  }

  /**
   * Import schema from JSON
   *
   * @param jsonSchema - Schema definition from exportAsJSON
   */
  importFromJSON(jsonSchema: { tables?: TableSchema[] }): void {
    const tables = jsonSchema.tables || [];

    for (const tableSchema of tables) {
      this.createTable(tableSchema);
    }
  }

  /**
   * Check if a table needs migration (schema changed)
   *
   * @returns Migration info with added/removed columns
   */
  checkMigration(
    tableName: string,
    newSchema: TableSchema
  ): { needsMigration: boolean; tableExists: boolean; added?: string[]; removed?: string[] } {
    const currentSchema = this.getTableSchema(tableName);

    if (!currentSchema) {
      return { needsMigration: false, tableExists: false };
    }

    const currentCols = new Set((currentSchema.columns || []).map((c) => c.name));
    const newCols = new Set((newSchema.columns || []).map((c) => c.name));

    const added = [...newCols].filter((c) => !currentCols.has(c));
    const removed = [...currentCols].filter((c) => !newCols.has(c));

    return {
      needsMigration: added.length > 0 || removed.length > 0,
      tableExists: true,
      added,
      removed
    };
  }

  /**
   * Convert column definition to SQL
   *
   * @private
   */
  _columnToSQL(col: SchemaColumn): string | null {
    const sqlType = TYPE_MAP[col.type];
    if (!sqlType) {
      return null; // Relations handled separately
    }

    let def = `${escapeColumn(col.name)} ${sqlType}`;
    if (col.required) {
      def += ' NOT NULL';
    }
    if (col.defaultValue !== undefined) {
      if (typeof col.defaultValue === 'string') {
        def += ` DEFAULT '${col.defaultValue}'`;
      } else if (typeof col.defaultValue === 'boolean') {
        def += ` DEFAULT ${col.defaultValue ? 1 : 0}`;
      } else {
        def += ` DEFAULT ${col.defaultValue}`;
      }
    }

    return def;
  }

  /**
   * Create a junction table for many-to-many relations
   *
   * @private
   */
  _createJunctionTable(owningClass: string, relationName: string, targetClass: string): void {
    const junctionTable = `_Join_${relationName}_${owningClass}`;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${escapeTable(junctionTable)} (
        "owningId" TEXT NOT NULL,
        "relatedId" TEXT NOT NULL,
        PRIMARY KEY ("owningId", "relatedId")
      )
    `);

    // Create indexes for efficient lookups
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS "idx_${junctionTable}_owning" ON ${escapeTable(junctionTable)}("owningId")`
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS "idx_${junctionTable}_related" ON ${escapeTable(junctionTable)}("relatedId")`
    );
  }

  /**
   * Add to a relation (junction table)
   */
  addRelation(owningClass: string, owningId: string, relationName: string, targetId: string): void {
    const junctionTable = `_Join_${relationName}_${owningClass}`;

    try {
      this.db
        .prepare(`INSERT OR IGNORE INTO ${escapeTable(junctionTable)} ("owningId", "relatedId") VALUES (?, ?)`)
        .run(owningId, targetId);
    } catch (e) {
      // Table might not exist
      if (e.message.includes('no such table')) {
        this._createJunctionTable(owningClass, relationName, 'Unknown');
        this.db
          .prepare(`INSERT OR IGNORE INTO ${escapeTable(junctionTable)} ("owningId", "relatedId") VALUES (?, ?)`)
          .run(owningId, targetId);
      } else {
        throw e;
      }
    }
  }

  /**
   * Remove from a relation (junction table)
   */
  removeRelation(owningClass: string, owningId: string, relationName: string, targetId: string): void {
    const junctionTable = `_Join_${relationName}_${owningClass}`;

    this.db
      .prepare(`DELETE FROM ${escapeTable(junctionTable)} WHERE "owningId" = ? AND "relatedId" = ?`)
      .run(owningId, targetId);
  }

  /**
   * Get related IDs from a relation
   */
  getRelatedIds(owningClass: string, owningId: string, relationName: string): string[] {
    const junctionTable = `_Join_${relationName}_${owningClass}`;

    try {
      const rows = this.db
        .prepare(`SELECT "relatedId" FROM ${escapeTable(junctionTable)} WHERE "owningId" = ?`)
        .all(owningId) as Array<{ relatedId: string }>;
      return rows.map((r) => r.relatedId);
    } catch (e) {
      if (e.message.includes('no such table')) {
        return [];
      }
      throw e;
    }
  }

  /**
   * The INVERSE of `getRelatedIds`: which owners is this related id attached to.
   *
   * Added by phase 97 BRG-002 §3.3, ruled by Richard 2026-09-19. It exists
   * because `security/state.ts` answered "which roles is this user in" with a
   * hand-written JOIN on the raw SQLite handle — the last thing in the backend
   * reaching past the storage interface, and the one standing between the
   * product and "your app moves to Postgres" being true for PERMISSIONS.
   *
   * Two alternatives were measured and rejected:
   *   - `$relatedTo` (QueryBuilder.ts:357) only filters by `owningId`, so it
   *     answers the other direction and cannot express this one.
   *   - Querying `_Join_<key>_<Class>` as an ordinary collection works today
   *     (measured), but the junction table's NAME is this adapter's private
   *     storage convention. A caller that hardcodes it would silently return no
   *     roles on any adapter that stores relations differently — which reads as
   *     a permissions outage, not an error.
   *
   * So the lookup belongs here, beside its mirror image, where a second adapter
   * has to answer it in whatever shape its own storage takes.
   *
   * @param owningClass - the class that OWNS the relation (e.g. `_Role`)
   * @param relationName - the relation's key (e.g. `users`)
   * @param relatedId - the id on the far side (e.g. a user's objectId)
   * @returns the owning objectIds, `[]` when the junction table does not exist
   */
  getRelationOwners(owningClass: string, relationName: string, relatedId: string): string[] {
    const junctionTable = `_Join_${relationName}_${owningClass}`;

    try {
      const rows = this.db
        .prepare(`SELECT "owningId" FROM ${escapeTable(junctionTable)} WHERE "relatedId" = ?`)
        .all(relatedId) as Array<{ owningId: string }>;
      return rows.map((r) => r.owningId);
    } catch (e) {
      if (e.message.includes('no such table')) {
        return [];
      }
      throw e;
    }
  }

  // ===========================================================================
  // Declared indexes (FED-002)
  //
  // Until this section existed a collection had exactly two indexes —
  // `createdAt` and `updatedAt` — and no way to declare a third. A feed's item
  // table keyed on a guid full-scanned on every poll, and "write this item
  // once" was a query-then-insert with a race in the gap between them.
  //
  // The declaration lives in the collection's `_Schema` row — and therefore in
  // the schema export, the backup and a promotion — rather than in a file
  // beside it the way the FTS5 opt-in does. An index is a property of the
  // collection's *shape* in a way a search opt-in is not: a promotion that
  // carried columns but not their unique constraints would promote a dedupe
  // guarantee into a hope.
  //
  // 🔴 Reconciliation reads what SQLite ACTUALLY has (`PRAGMA index_list` /
  // `PRAGMA index_xinfo`), never what `_Schema` last claimed — the same choice,
  // for the same reason, that `_columnScope` makes about `PRAGMA table_info`
  // (DEF-014): the tracking row records what someone meant, and the only thing
  // a reconcile may act on is what is there.
  // ===========================================================================

  /** The two indexes every table gets on creation. They cannot be declared away. */
  builtInIndexNames(tableName: string): string[] {
    return sharedBuiltInIndexNames(tableName);
  }

  /**
   * The derived name of a declared index — never written by a person, so that
   * two declarations of the same fields are the same index however they were
   * spelled, and a declaration removed from `schema.json` has a name to drop.
   */
  indexName(tableName: string, fields: string[]): string {
    return sharedIndexName(tableName, fields);
  }

  /** The indexes a collection's `_Schema` row declares (normalized, never null). */
  declaredIndexes(tableName: string): IndexDecl[] {
    const schema = this.getTableSchema(tableName);
    return normalizeIndexDecls(schema ? schema.indexes : undefined);
  }

  /**
   * Every index SQLite currently has on this table that THIS class manages:
   * `origin = 'c'` (a real `CREATE INDEX`, not a PK or a table-level UNIQUE),
   * named in the derived form, and not one of the two built-ins.
   *
   * Reads `index_xinfo` rather than `index_info` for one reason: it is the only
   * pragma that reports `desc`, and an index declared `desc` that was built
   * `asc` has to come back as a difference or the reconcile silently keeps the
   * wrong one.
   */
  builtIndexes(tableName: string): BuiltIndex[] {
    let list: Array<{ name?: string; unique?: number; origin?: string }>;
    try {
      list = this.db.prepare(`PRAGMA index_list(${escapeTable(tableName)})`).all() as typeof list;
    } catch (e) {
      // No such table, or an engine with no pragma support (the ephemeral mock).
      return [];
    }
    if (!Array.isArray(list)) return [];

    const builtIn = new Set(this.builtInIndexNames(tableName));
    const prefix = `idx_${sanitizeIdent(tableName)}_`;
    const out: BuiltIndex[] = [];

    for (const row of list) {
      const name = row && row.name;
      if (typeof name !== 'string') continue;
      if (row.origin !== 'c') continue;
      if (!name.startsWith(prefix) || builtIn.has(name)) continue;

      const cols = this.db.prepare(`PRAGMA index_xinfo(${escapeTable(name)})`).all() as Array<{
        name?: string | null;
        desc?: number;
        key?: number;
      }>;
      const keyCols = (Array.isArray(cols) ? cols : []).filter((c) => c && c.key === 1);

      out.push({
        name,
        fields: keyCols.map((c) => String(c.name)),
        unique: row.unique === 1,
        order: keyCols.length > 0 && keyCols[0].desc === 1 ? 'desc' : 'asc'
      });
    }

    return out;
  }

  /**
   * What a person is shown: every declared index and whether it is actually
   * built, plus anything built that nothing declares (drift — a hand-made index,
   * or a failed reconcile).
   */
  indexStatus(tableName: string): IndexStatus[] {
    const built = new Map(this.builtIndexes(tableName).map((b) => [b.name, b]));
    const out: IndexStatus[] = [];

    for (const decl of this.declaredIndexes(tableName)) {
      const name = this.indexName(tableName, decl.fields);
      const b = built.get(name);
      out.push({
        name,
        fields: [...decl.fields],
        unique: decl.unique === true,
        order: decl.order === 'desc' ? 'desc' : 'asc',
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

  /**
   * The rows that would refuse a unique index, for the collection and fields
   * given: how many distinct key values appear more than once, and the first
   * three of them.
   *
   * ⚠️ Rows with a NULL in any indexed field are excluded, and that is not
   * tidiness — SQLite treats NULLs as distinct in a unique index, so two rows
   * with no `guid` do not collide. `GROUP BY` disagrees: it puts every NULL in
   * one group, and a check that trusted it would refuse a push over data the
   * index would have accepted.
   */
  duplicateValues(
    tableName: string,
    fields: string[],
    sampleLimit = 3
  ): { duplicates: number; samples: unknown[][] } {
    const cols = fields.map((f) => escapeColumn(f)).join(', ');
    const notNull = fields.map((f) => `${escapeColumn(f)} IS NOT NULL`).join(' AND ');
    const table = escapeTable(tableName);
    const limit = Math.max(0, Math.floor(sampleLimit));

    const total = this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM (SELECT 1 FROM ${table} WHERE ${notNull} GROUP BY ${cols} HAVING COUNT(*) > 1)`
      )
      .get() as { n?: number } | undefined;

    const rows = this.db
      .prepare(
        `SELECT ${cols}, COUNT(*) AS __n FROM ${table} WHERE ${notNull} ` +
          `GROUP BY ${cols} HAVING COUNT(*) > 1 ORDER BY __n DESC, ${cols} LIMIT ${limit}`
      )
      .all() as Array<Record<string, unknown>>;

    return {
      duplicates: total && typeof total.n === 'number' ? total.n : 0,
      samples: (Array.isArray(rows) ? rows : []).map((r) => fields.map((f) => r[f]))
    };
  }

  /**
   * Make SQLite's indexes match the declaration. The whole of FED-002's §3.2.
   *
   * Every check runs BEFORE any DDL does, because AC4's promise is that a
   * refused push changes nothing: a unique declaration over duplicate rows
   * refuses the *push*, it does not drop the other three indexes first and then
   * refuse. Nothing here ever deletes a row — the only way a unique index and
   * existing data are reconciled is by the person fixing the data.
   *
   * @param indexes - The FULL declaration for this collection. A declaration
   *   that is gone from this list is an index that gets dropped; passing `[]`
   *   removes every declared index and keeps the two built-ins.
   * @throws IndexDuplicatesError when a unique index would refuse rows the
   *   table already holds — carrying the count and the first three values.
   */
  reconcileIndexes(tableName: string, indexes: unknown): IndexReconcileReport {
    const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    if (!exists) throw new Error(`Table "${tableName}" does not exist`);

    const desired = normalizeIndexDecls(indexes);
    const built = new Map(this.builtIndexes(tableName).map((b) => [b.name, b]));
    const builtIn = new Set(this.builtInIndexNames(tableName));

    // ---- Checks. All of them, before anything is created or dropped. -------
    const columns = this.tableColumns(tableName);
    const seen = new Set<string>();

    for (const decl of desired) {
      const name = this.indexName(tableName, decl.fields);
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

      for (const field of decl.fields) {
        if (!columns.has(field)) {
          throw new Error(
            `Cannot index "${field}" on "${tableName}": the collection has no such property. ` +
              'A column here exists once something has written it, so declare the column first.'
          );
        }
      }

      // Only a unique index that is not ALREADY built in this exact shape can
      // be refused by the data: one that is built has been enforcing itself.
      const already = built.get(name);
      if (decl.unique === true && !(already && sameIndexSignature(already, decl))) {
        const report = this.duplicateValues(tableName, decl.fields);
        if (report.duplicates > 0) {
          throw new IndexDuplicatesError(tableName, decl.fields, report.duplicates, report.samples);
        }
      }
    }

    // ---- Apply -------------------------------------------------------------
    const created: string[] = [];
    const dropped: string[] = [];
    const kept: string[] = [];

    // 🔴 A SAVEPOINT, not `BEGIN`. `createTable` calls this, and `createTable` is
    // reached from inside an open transaction on at least one path (an import
    // ensures the shape, then writes every row in one) — `BEGIN` there is
    // "cannot start a transaction within a transaction", which would turn a
    // declaration into a failed import. A savepoint nests either way.
    this.db.exec('SAVEPOINT nodegx_reconcile_indexes');
    try {
      for (const [name] of built) {
        if (!seen.has(name)) {
          this.db.exec(`DROP INDEX IF EXISTS ${escapeTable(name)}`);
          dropped.push(name);
        }
      }

      for (const decl of desired) {
        const name = this.indexName(tableName, decl.fields);
        const already = built.get(name);
        if (already && sameIndexSignature(already, decl)) {
          kept.push(name);
          continue;
        }
        // A changed signature is a drop and a create under one name. It is
        // reported as `created` only — the index that was there is gone.
        if (already) this.db.exec(`DROP INDEX IF EXISTS ${escapeTable(name)}`);

        const order = decl.order === 'desc' ? 'DESC' : 'ASC';
        const cols = decl.fields.map((f) => `${escapeColumn(f)} ${order}`).join(', ');
        this.db.exec(
          `CREATE ${decl.unique === true ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${escapeTable(name)} ` +
            `ON ${escapeTable(tableName)} (${cols})`
        );
        created.push(name);
      }

      this.persistIndexDecls(tableName, desired);
      this.db.exec('RELEASE nodegx_reconcile_indexes');
    } catch (e) {
      this.db.exec('ROLLBACK TO nodegx_reconcile_indexes');
      this.db.exec('RELEASE nodegx_reconcile_indexes');
      throw e;
    }

    return { created, dropped, kept, indexes: desired };
  }

  /** The columns a table actually has, from the live connection (see DEF-014). */
  tableColumns(tableName: string): Set<string> {
    try {
      const rows = this.db.prepare(`PRAGMA table_info(${escapeTable(tableName)})`).all() as Array<{ name?: string }>;
      return new Set((Array.isArray(rows) ? rows : []).map((r) => r.name).filter((n): n is string => typeof n === 'string'));
    } catch (e) {
      return new Set<string>();
    }
  }

  /**
   * Write the declaration into the `_Schema` row so it survives a restart, a
   * schema export and a backup. Called inside `reconcileIndexes`'s transaction.
   *
   * @private
   */
  persistIndexDecls(tableName: string, indexes: IndexDecl[]): void {
    this.ensureSchemaTable();
    const schema = this.getTableSchema(tableName) || { name: tableName };
    if (indexes.length > 0) schema.indexes = indexes;
    else delete schema.indexes;
    this.db
      .prepare(
        `INSERT INTO "_Schema" ("name", "schema", "updatedAt") VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT("name") DO UPDATE SET "schema" = excluded."schema", "updatedAt" = CURRENT_TIMESTAMP`
      )
      .run(tableName, JSON.stringify(schema));
    this._schemaCache.set(tableName, schema);
  }

  // ===========================================================================
  // Full-text search (BAK-008)
  //
  // An FTS5 shadow table per opted-in collection, in "external content" mode
  // against the real table so the indexed text is never duplicated on disk.
  // Sync is done by SQL triggers generated here — the database's job, not
  // application code's, so no write path (classes route, BYOB route, workflow
  // step, import) can forget it. See dev-docs/tasks/phase-22-production-backend/
  // BAK-008-NOTES.md for the design writeup.
  // ===========================================================================

  /**
   * Probe whether this SQLite build has the FTS5 extension compiled in.
   * Cheap (creates and drops a throwaway virtual table) and side-effect-free
   * on the caller's schema. Callers use this to fail loudly and explicitly
   * BEFORE attempting to enable search — never a silent LIKE fallback.
   */
  hasFts5Support(): boolean {
    try {
      this.db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS "__fts5_probe" USING fts5(x)');
      this.db.exec('DROP TABLE IF EXISTS "__fts5_probe"');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Whether a collection currently has a search (FTS5 shadow table) index.
   */
  hasSearchIndex(tableName: string): boolean {
    const ftsTable = `${tableName}_fts`;
    const exists = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(ftsTable);
    return !!exists;
  }

  /**
   * Create the FTS5 shadow table (external content, `content_rowid='rowid'`)
   * and its sync triggers for a collection. Does NOT backfill existing rows —
   * FTS5 external-content tables start empty regardless of what the content
   * table already holds; callers that need existing data indexed must follow
   * with the 'rebuild' command (see rebuildSearchIndex, the normal entry point).
   *
   * @param tableName
   * @param fields - real column names on tableName to index
   * @param tokenizer
   */
  createSearchIndex(tableName: string, fields: string[], tokenizer = 'unicode61'): void {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error('createSearchIndex requires at least one field to index');
    }

    const ftsTable = `${tableName}_fts`;
    const cols = fields.map((f) => escapeColumn(f)).join(', ');
    // Tokenizer name is validated by the caller (nodegx-backend's search
    // config model); still sanitize defensively since it lands in raw SQL.
    const safeTokenizer = String(tokenizer || 'unicode61').replace(/[^a-zA-Z0-9_]/g, '');

    this.db.exec(
      `CREATE VIRTUAL TABLE IF NOT EXISTS ${escapeTable(ftsTable)} USING fts5(` +
        `${cols}, content=${escapeTable(tableName)}, content_rowid='rowid', tokenize='${safeTokenizer}')`
    );

    this._createSearchTriggers(tableName, fields);
  }

  /**
   * (Re)create the three sync triggers (AFTER INSERT/UPDATE/DELETE) that keep
   * the FTS5 shadow table in lockstep with the content table. Idempotent.
   *
   * @private
   */
  _createSearchTriggers(tableName: string, fields: string[]): void {
    const ftsTable = `${tableName}_fts`;
    const colList = fields.map((f) => escapeColumn(f)).join(', ');
    const newVals = fields.map((f) => `new.${escapeColumn(f)}`).join(', ');
    const oldVals = fields.map((f) => `old.${escapeColumn(f)}`).join(', ');
    const aiTrigger = `${tableName}_fts_ai`;
    const adTrigger = `${tableName}_fts_ad`;
    const auTrigger = `${tableName}_fts_au`;

    this.db.exec(`DROP TRIGGER IF EXISTS ${escapeTable(aiTrigger)}`);
    this.db.exec(`DROP TRIGGER IF EXISTS ${escapeTable(adTrigger)}`);
    this.db.exec(`DROP TRIGGER IF EXISTS ${escapeTable(auTrigger)}`);

    // INSERT: mirror the new row into the shadow table.
    this.db.exec(
      `CREATE TRIGGER ${escapeTable(aiTrigger)} AFTER INSERT ON ${escapeTable(tableName)} BEGIN ` +
        `INSERT INTO ${escapeTable(ftsTable)}(rowid, ${colList}) VALUES (new.rowid, ${newVals}); ` +
        `END`
    );

    // DELETE: the FTS5 'delete' special command — the first two values are
    // fixed ('delete', old rowid), the rest mirror the deleted column values
    // (FTS5 needs them to remove the exact posting-list entries).
    this.db.exec(
      `CREATE TRIGGER ${escapeTable(adTrigger)} AFTER DELETE ON ${escapeTable(tableName)} BEGIN ` +
        `INSERT INTO ${escapeTable(ftsTable)}(${escapeTable(ftsTable)}, rowid, ${colList}) ` +
        `VALUES('delete', old.rowid, ${oldVals}); ` +
        `END`
    );

    // UPDATE: delete-then-reinsert (the documented FTS5 external-content
    // update pattern) so a change to any indexed field is reflected exactly
    // once, regardless of which columns actually changed.
    this.db.exec(
      `CREATE TRIGGER ${escapeTable(auTrigger)} AFTER UPDATE ON ${escapeTable(tableName)} BEGIN ` +
        `INSERT INTO ${escapeTable(ftsTable)}(${escapeTable(ftsTable)}, rowid, ${colList}) ` +
        `VALUES('delete', old.rowid, ${oldVals}); ` +
        `INSERT INTO ${escapeTable(ftsTable)}(rowid, ${colList}) VALUES (new.rowid, ${newVals}); ` +
        `END`
    );
  }

  /**
   * Drop a collection's search index and its sync triggers. Safe to call when
   * no index exists.
   */
  dropSearchIndex(tableName: string): void {
    const ftsTable = `${tableName}_fts`;
    this.db.exec(`DROP TRIGGER IF EXISTS ${escapeTable(`${tableName}_fts_ai`)}`);
    this.db.exec(`DROP TRIGGER IF EXISTS ${escapeTable(`${tableName}_fts_ad`)}`);
    this.db.exec(`DROP TRIGGER IF EXISTS ${escapeTable(`${tableName}_fts_au`)}`);
    this.db.exec(`DROP TABLE IF EXISTS ${escapeTable(ftsTable)}`);
  }

  /**
   * The explicit, progress-reported, idempotent rebuild path (BAK-008 desired
   * state): drop-and-recreate the shadow table + triggers for the CURRENT
   * field list, then run FTS5's 'rebuild' command to repopulate it from the
   * live content table. Safe to call repeatedly (each call is a full,
   * consistent re-derivation, never a delta applied on top of drift) and is
   * how both "enable search" and "fields changed" are implemented — one path,
   * not two similar ones that could disagree.
   */
  rebuildSearchIndex(
    tableName: string,
    fields: string[],
    tokenizer = 'unicode61'
  ): { tableName: string; fields: string[]; tokenizer: string; rowsIndexed: number; elapsedMs: number } {
    if (!this.hasFts5Support()) {
      throw new Error(
        'Full-text search requires the SQLite FTS5 extension, which this engine build does not have. ' +
          'Refusing to enable search — no degraded/LIKE fallback is offered.'
      );
    }

    const start = Date.now();
    this.dropSearchIndex(tableName);
    this.createSearchIndex(tableName, fields, tokenizer);

    const ftsTable = `${tableName}_fts`;
    this.db.exec(`INSERT INTO ${escapeTable(ftsTable)}(${escapeTable(ftsTable)}) VALUES('rebuild')`);

    const countRow = this.db.prepare(`SELECT COUNT(*) as count FROM ${escapeTable(tableName)}`).get() as
      | { count: number }
      | undefined;

    return {
      tableName,
      fields: [...fields],
      tokenizer: String(tokenizer || 'unicode61').replace(/[^a-zA-Z0-9_]/g, ''),
      rowsIndexed: countRow ? countRow.count : 0,
      elapsedMs: Date.now() - start
    };
  }
}

export = SchemaManager;
