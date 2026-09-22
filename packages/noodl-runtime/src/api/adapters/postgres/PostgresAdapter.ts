/**
 * PostgresAdapter — `IStorageAdapter` on PostgreSQL (BRG-005).
 *
 * The person sentence of the task: *"The same backend — the same workflows,
 * the same cloud functions, the same triggers, the same node graph — runs on
 * Postgres, because the only thing that changed was which file opened the
 * database."* This is that file.
 *
 * It is written against `LocalSQLAdapter` method for method, and deliberately
 * shares everything that can be shared rather than re-deriving it: the SQL
 * comes from the same `QueryBuilder` with `dialect: 'postgres'` (§5.5), the
 * DDL from BRG-004's generator (`postgres/ddl.ts`), the type inference from
 * `schemaCommon.inferType`, the `?`→`$n` translation from the pool. What is
 * left here is the callback plumbing, the read-back after each write, and the
 * change tap — the parts that are the adapter and not the database.
 *
 * ## What is different, and declared
 *
 * - **Every data-plane call first waits for the schema queue** (`barrier()`) —
 *   see `PgSchemaManager`'s module note for why the schema surface is served
 *   from a model and its DDL is queued.
 * - **`transaction()` throws.** The interface's synchronous transaction cannot
 *   be served over a socket; BRG-002 moved the one caller (the import path)
 *   onto `upsertBatch`, which this adapter provides as an awaitable batch in one
 *   real transaction. A caller that reaches `transaction()` gets a loud refusal,
 *   never a silent non-transaction.
 * - **No `getDatabase()`.** There is no handle to hand out, which is the point.
 * - **Change events** (`create` / `save` / `delete`) fire after the statement
 *   returns, i.e. after commit — each statement is its own transaction on
 *   PostgreSQL, so the post-commit contract BAK-001 and WF-005 rely on holds
 *   without a buffer.
 *
 * @module adapters/postgres/PostgresAdapter
 */

import { declaredProperties, inferType } from '../local-sql/schemaCommon';
import { translatePgError } from './errors';
import { PgSchemaManager } from './PgSchemaManager';
import { DEFAULT_DATA_POOL_MAX, PgConnectionPool, type PgPoolSaturation } from './pool';
import { parseStorageUrl, type ParsedStorageUrl } from './storageUrl';

import EventEmitter = require('../../../events');
import QueryBuilder = require('../local-sql/QueryBuilder');

type AdapterRecord = Record<string, unknown>;

interface ChangeEvent {
  type: string;
  id: string;
  collection: string;
  object?: AdapterRecord | null;
}

interface AdapterSchema {
  properties?: Record<string, { type?: string; required?: boolean; targetClass?: string }>;
}

interface CollectionConfig {
  schema?: AdapterSchema;
  name?: string;
  columns?: unknown[];
}

interface AdapterEventEmitter {
  setMaxListeners(n: number): void;
  on(event: string, handler: (...args: unknown[]) => void, context?: unknown): void;
  off(event: string, handler?: (...args: unknown[]) => void, context?: unknown): void;
  emit(event: string, ...args: unknown[]): void;
  removeAllListeners(event?: string): void;
}

interface ErrorCallback {
  (message: string): void;
}

interface AclContext {
  access: 'read' | 'write';
  keys: string[];
}

interface QueryOptions {
  collection: string;
  where?: Record<string, unknown>;
  select?: string | string[];
  sort?: string | string[];
  limit?: number;
  skip?: number;
  count?: boolean;
  acl?: AclContext;
  success(results: AdapterRecord[], count?: number): void;
  error: ErrorCallback;
}

interface SearchOptions extends QueryOptions {
  search: string;
}

interface FetchOptions {
  collection: string;
  id?: string;
  objectId?: string;
  acl?: AclContext;
  success(record: AdapterRecord): void;
  error: ErrorCallback;
}

interface CreateOptions {
  collection: string;
  data: Record<string, unknown>;
  success(record: AdapterRecord): void;
  error: ErrorCallback;
}

interface SaveOptions {
  collection: string;
  id?: string;
  objectId?: string;
  data: Record<string, unknown>;
  acl?: AclContext;
  /** HLT-016 — apply only if the row still holds these values. */
  expect?: QueryBuilder.ExpectedValues;
  success(record: AdapterRecord): void;
  error: ErrorCallback;
}

interface DeleteOptions {
  collection: string;
  id?: string;
  objectId?: string;
  acl?: AclContext;
  success(): void;
  error: ErrorCallback;
}

interface CountOptions {
  collection: string;
  where?: Record<string, unknown>;
  acl?: AclContext;
  success(count: number): void;
  error: ErrorCallback;
}

interface AggregateOptions {
  collection: string;
  where?: Record<string, unknown>;
  group: Record<string, { avg?: string; sum?: string; max?: string; min?: string; distinct?: string }>;
  acl?: AclContext;
  success(result: Record<string, unknown>): void;
  error: ErrorCallback;
}

interface DistinctOptions {
  collection: string;
  property: string;
  where?: Record<string, unknown>;
  acl?: AclContext;
  success(values: unknown[]): void;
  error: ErrorCallback;
}

interface IncrementOptions {
  collection: string;
  id?: string;
  objectId?: string;
  properties: Record<string, number>;
  acl?: AclContext;
  success(record: AdapterRecord): void;
  error: ErrorCallback;
}

interface RelationOptions {
  collection: string;
  objectId: string;
  key: string;
  targetObjectId: string;
  success(result: Record<string, never>): void;
  error: ErrorCallback;
}

export interface PostgresAdapterOptions {
  /** Auto-create a table on first access and a column on first write (default true, as SQLite). */
  autoCreateTables?: boolean;
  /** Collection schemas, if known up front (same shape as dbCollections metadata). */
  collections?: Record<string, CollectionConfig>;
  /** Data-pool ceiling. See `pool.ts` for the arithmetic before raising it. */
  poolMax?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  statementTimeoutMillis?: number;
}

/**
 * Thrown by `connect()` when the server cannot be reached or refuses the
 * credentials. The service refuses to start on it (RUN-004's shape): a backend
 * that cannot reach its database must not come up and answer 500s.
 */
export class PostgresConnectionError extends Error {
  code: string;
  cause?: Error;
  target: string;

  constructor(target: string, cause: Error) {
    super(
      `Could not open the PostgreSQL database at ${target}: ${cause.message}\n` +
        '  What to do: check NODEGX_STORAGE_URL (host, port, database, credentials), that the server is up, and that ' +
        'pg_hba.conf admits this client. The backend refused to start rather than come up without its database.'
    );
    this.name = 'PostgresConnectionError';
    this.code = 'POSTGRES_UNREACHABLE';
    this.cause = cause;
    this.target = target;
  }
}

/** RFC 4122 v4 — the same generator `LocalSQLAdapter` uses, so ids look the same on both engines. */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** The engine name reported by `getPersistenceStatus()` and printed at boot. */
export const POSTGRES_ENGINE_NAME = 'postgres';

export class PostgresAdapter {
  static PostgresConnectionError = PostgresConnectionError;

  readonly target: ParsedStorageUrl;
  options: PostgresAdapterOptions & { autoCreateTables: boolean };
  pool: PgConnectionPool | null;
  schemaManager: PgSchemaManager | null;
  events: AdapterEventEmitter;
  _persistenceMode: 'unknown' | 'persistent' | 'failed';
  _loadError: (Error & { code?: string }) | null;
  _collections: Record<string, CollectionConfig>;
  _absentColumnsReported: Set<string>;

  constructor(url: string, options: PostgresAdapterOptions = {}) {
    // R5: refused by name, here, before a pool exists.
    this.target = parseStorageUrl(url);
    this.options = { autoCreateTables: true, ...options };
    this.pool = null;
    this.schemaManager = null;
    this.events = new EventEmitter() as unknown as AdapterEventEmitter;
    this.events.setMaxListeners(10000);
    this._persistenceMode = 'unknown';
    this._loadError = null;
    this._collections = options.collections || {};
    this._absentColumnsReported = new Set();
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async connect(): Promise<void> {
    if (this.pool) return;

    const pool = new PgConnectionPool({
      url: this.target.url,
      max: this.options.poolMax ?? DEFAULT_DATA_POOL_MAX,
      label: 'data',
      connectionTimeoutMillis: this.options.connectionTimeoutMillis,
      idleTimeoutMillis: this.options.idleTimeoutMillis,
      statementTimeoutMillis: this.options.statementTimeoutMillis
    });

    try {
      await pool.query('SELECT 1');
      const schemaManager = new PgSchemaManager(pool);
      await schemaManager.load();

      if (this.options.autoCreateTables && this._collections) {
        for (const [name, collection] of Object.entries(this._collections)) {
          if (collection.schema) {
            schemaManager.createTable({
              name,
              columns: Object.entries(collection.schema.properties || {}).map(([colName, colDef]) => ({
                name: colName,
                type: colDef.type,
                required: colDef.required,
                targetClass: colDef.targetClass
              }))
            });
          }
        }
        await schemaManager.barrier();
      }

      this.pool = pool;
      this.schemaManager = schemaManager;
      this._persistenceMode = 'persistent';
      this._loadError = null;
    } catch (e) {
      await pool.end().catch(() => undefined);
      const err = new PostgresConnectionError(this.target.redacted, translatePgError(e));
      this._persistenceMode = 'failed';
      this._loadError = err;
      throw err;
    }
  }

  /**
   * Drain the schema queue, then release every connection. AC4: SIGTERM exits
   * with the pool drained. A queued failure is reported on stderr rather than
   * thrown — a shutdown must not be blocked by a statement nobody is waiting on.
   */
  async disconnect(): Promise<void> {
    const sm = this.schemaManager;
    const pool = this.pool;
    this.schemaManager = null;
    this.pool = null;
    if (sm) {
      const failure = await sm.drain();
      if (failure) console.error('PostgresAdapter.disconnect: a queued schema change had failed:', failure.message);
    }
    if (pool) await pool.end();
  }

  getPersistenceStatus(): {
    mode: 'unknown' | 'persistent' | 'ephemeral' | 'failed';
    persistent: boolean;
    ephemeral: boolean;
    engine: string | null;
    error: { message: string; code: string } | null;
  } {
    return {
      mode: this._persistenceMode,
      persistent: this._persistenceMode === 'persistent',
      ephemeral: false,
      engine: this._persistenceMode === 'unknown' ? null : POSTGRES_ENGINE_NAME,
      error: this._loadError ? { message: this._loadError.message, code: this._loadError.code || 'POSTGRES_UNREACHABLE' } : null
    };
  }

  /** AC4 — what `/health` shows beside the persistence status. Null before `connect()`. */
  saturation(): (PgPoolSaturation & { pendingSchemaStatements: number }) | null {
    if (!this.pool) return null;
    return { ...this.pool.saturation(), pendingSchemaStatements: this.schemaManager ? this.schemaManager.pendingStatements() : 0 };
  }

  // ===========================================================================
  // Events (BAK-001 / WF-005 change tap)
  // ===========================================================================

  on(event: string, handler: (...args: unknown[]) => void, context?: unknown): void {
    this.events.on(event, handler, context);
  }

  off(event?: string, handler?: (...args: unknown[]) => void, context?: unknown): void {
    if (event) {
      this.events.off(event, handler, context);
    } else {
      this.events.removeAllListeners();
    }
  }

  _emitChange(event: ChangeEvent): void {
    this.events.emit(event.type, event);
  }

  // ===========================================================================
  // Internals shared by the data plane
  // ===========================================================================

  private _sm(): PgSchemaManager {
    if (!this.schemaManager || !this.pool) throw new Error('Database not connected');
    return this.schemaManager;
  }

  private _pool(): PgConnectionPool {
    if (!this.pool) throw new Error('Database not connected');
    return this.pool;
  }

  /** Auto-create the table if allowed, then wait for every queued schema change. */
  private async _ready(collection: string): Promise<void> {
    const sm = this._sm();
    if (!sm.hasTable(collection) && this.options.autoCreateTables) {
      sm.createTable({ name: collection, columns: [] });
    }
    await sm.barrier();
  }

  /** Add a column for every new key the data carries — the same rule as `LocalSQLAdapter.create/save`. */
  private _autoColumns(collection: string, data: Record<string, unknown>): void {
    if (!this.options.autoCreateTables) return;
    const sm = this._sm();
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'objectId') continue;
      const type = inferType(value);
      const column: { name: string; type: string; targetClass?: string } = { name: key, type };
      const className = type === 'Pointer' && (value as { className?: string }).className;
      if (className) column.targetClass = className;
      sm.addColumn(collection, column);
    }
  }

  private _columnScope(collection: string): QueryBuilder.ColumnScope | undefined {
    const present = this._sm().tableColumns(collection);
    if (present.size === 0) return undefined;
    return { present, absent: new Set<string>() };
  }

  private _reportAbsentColumns(collection: string, scope: QueryBuilder.ColumnScope | undefined): void {
    if (!scope || !scope.absent || scope.absent.size === 0) return;
    for (const name of scope.absent) {
      const key = `${collection}.${name}`;
      if (this._absentColumnsReported.has(key)) continue;
      this._absentColumnsReported.add(key);
      console.warn(
        `PostgresAdapter: collection "${collection}" has no column "${name}" — no record has ever ` +
          'carried that property, so it is read as empty. If the name is a typo, nothing else will say so.'
      );
    }
  }

  private _getSchema(collection: string): AdapterSchema | null {
    if (this._collections[collection]) {
      return this._collections[collection].schema;
    }
    return this._sm().getTableSchema(collection) as unknown as AdapterSchema;
  }

  private _rowToRecord(row: AdapterRecord | null | undefined, collection: string): AdapterRecord {
    if (!row) return null;
    // R7 / BRG-D8 — the same repair as the SQLite adapter, from the same helper.
    // It changes nothing a caller can see HERE (`pg` already returns a real
    // boolean for a BOOLEAN column, which is why this engine was the one that
    // read correctly), and that is exactly why it belongs: the day the two
    // adapters apply the declared type differently is the day they disagree
    // again, and the only defence is that there is one place to read.
    const properties = declaredProperties(this._getSchema(collection));
    const record: AdapterRecord = {};
    for (const [key, value] of Object.entries(row)) {
      const colType = properties?.[key]?.type;
      record[key] = QueryBuilder.deserializeValue(value, colType);
    }
    return record;
  }

  private async _selectById(collection: string, id: string): Promise<AdapterRecord | undefined> {
    return this._pool().queryOne<AdapterRecord>(
      `SELECT * FROM ${QueryBuilder.escapeTable(collection)} WHERE "objectId" = ?`,
      [id]
    );
  }

  /**
   * The one place a data-plane failure becomes `options.error(message)`.
   * Mirrors `LocalSQLAdapter`'s logging policy: a refused client objectId or a
   * unique-index collision is the caller's business (a 409/400 upstream), not
   * a server fault worth a log line.
   */
  private _run(name: string, options: { error: ErrorCallback }, body: () => Promise<void>): void {
    body().catch((e: unknown) => {
      const err = translatePgError(e);
      const quiet =
        QueryBuilder.clientObjectIdProblem(err.message) !== null ||
        QueryBuilder.uniqueConstraintProblem(err.message) !== null ||
        QueryBuilder.preconditionProblem(err.message) !== null ||
        /^Object not found$/.test(err.message);
      if (!quiet) console.error(`PostgresAdapter.${name} error:`, err);
      options.error(err.message);
    });
  }

  // ===========================================================================
  // IStorageDataPlane — the twelve
  // ===========================================================================

  query(options: QueryOptions): void {
    this._run('query', options, async () => {
      await this._ready(options.collection);
      const schema = this._getSchema(options.collection);
      const scope = this._columnScope(options.collection);
      const { sql, params } = QueryBuilder.buildSelect(options, schema, scope, 'postgres');
      const rows = await this._pool().query<AdapterRecord>(sql, params);
      const results = rows.map((row) => this._rowToRecord(row, options.collection));

      let count: number | undefined;
      if (options.count) {
        const built = QueryBuilder.buildCount(options, schema, scope, 'postgres');
        const countRow = await this._pool().queryOne<{ count?: number }>(built.sql, built.params);
        count = Number(countRow?.count || 0);
      }

      this._reportAbsentColumns(options.collection, scope);
      options.success(results, count);
    });
  }

  /**
   * BAK-008 full-text search, as `tsvector` (AC6). The field list comes from
   * the opt-in `rebuildSearchIndex` recorded; without one the collection has no
   * search and the call is refused in the same words `LocalSQLAdapter` uses.
   */
  search(options: SearchOptions): void {
    this._run('search', options, async () => {
      await this._ready(options.collection);

      if (!options.search || typeof options.search !== 'string') {
        options.error('search() requires a non-empty "search" term');
        return;
      }
      const fields = this._sm().searchFields(options.collection);
      if (!fields) {
        options.error(
          `Search is not enabled for collection "${options.collection}" (no search index). ` +
            'Enable search for this collection first.'
        );
        return;
      }

      const schema = this._getSchema(options.collection);
      const scope = this._columnScope(options.collection);
      const withFields = { ...options, fields };
      const { sql, params } = QueryBuilder.buildSearchSelect(withFields, schema, scope, 'postgres');
      const rows = await this._pool().query<AdapterRecord>(sql, params);
      const results = rows.map((row) => {
        const { _rank, _snippet, ...rest } = row;
        const record = this._rowToRecord(rest, options.collection);
        // `_rank` is already negated in the SQL (§5.5.3) so that `-_rank` is
        // higher-is-better here exactly as it is for bm25.
        record._score = typeof _rank === 'number' ? -_rank : undefined;
        record._snippet = _snippet;
        return record;
      });

      let count: number | undefined;
      if (options.count) {
        const built = QueryBuilder.buildSearchCount(withFields, schema, scope, 'postgres');
        const countRow = await this._pool().queryOne<{ count?: number }>(built.sql, built.params);
        count = Number(countRow?.count || 0);
      }

      this._reportAbsentColumns(options.collection, scope);
      options.success(results, count);
    });
  }

  fetch(options: FetchOptions): void {
    this._run('fetch', options, async () => {
      await this._ready(options.collection);
      const params: unknown[] = [options.id || options.objectId];
      let sql = `SELECT * FROM ${QueryBuilder.escapeTable(options.collection)} WHERE "objectId" = ?`;
      // Row-level read check: an unreadable row answers exactly like a missing
      // one (existence hiding).
      const aclClause = QueryBuilder.buildAclPredicate(options.collection, options.acl, params, 'postgres');
      if (aclClause) sql += ` AND ${aclClause}`;
      const recordId = params[0] as string;
      const row = await this._pool().queryOne<AdapterRecord>(sql, params);

      if (!row) {
        options.error('Object not found');
        return;
      }
      const record = this._rowToRecord(row, options.collection);
      options.success(record);
      this.events.emit('fetch', { type: 'fetch', id: recordId, object: record, collection: options.collection });
    });
  }

  create(options: CreateOptions): void {
    this._run('create', options, async () => {
      // SYN-003: a caller may name its own record. The id is settled before
      // anything is written, so a refused one leaves no table, column or row.
      const requestedId = options.data.objectId;
      const hasClientId = requestedId !== undefined && requestedId !== null;
      if (hasClientId && !QueryBuilder.isClientObjectId(requestedId)) {
        throw new Error(QueryBuilder.CLIENT_OBJECT_ID_INVALID);
      }
      const data: Record<string, unknown> = { ...options.data };
      delete data.objectId;

      await this._ready(options.collection);
      this._autoColumns(options.collection, data);
      await this._sm().barrier();

      if (hasClientId && (await this._selectById(options.collection, requestedId as string))) {
        throw new Error(QueryBuilder.clientObjectIdTaken(options.collection, requestedId as string));
      }

      const recordId = hasClientId ? (requestedId as string) : generateUUID();
      const { sql, params } = QueryBuilder.buildInsert({ collection: options.collection, data }, recordId);
      await this._pool().run(sql, params);

      const createdRow = await this._selectById(options.collection, recordId);
      const record = this._rowToRecord(createdRow, options.collection);
      options.success(record);
      this._emitChange({ type: 'create', id: recordId, object: record, collection: options.collection });
    });
  }

  save(options: SaveOptions): void {
    if (options.expect !== undefined) {
      const problem = QueryBuilder.expectedValuesProblem(options.expect);
      if (problem) {
        options.error(`Precondition ${problem}`);
        return;
      }
    }
    this._run('save', options, async () => {
      await this._ready(options.collection);
      this._autoColumns(options.collection, options.data);
      await this._sm().barrier();

      const recordId = options.id || options.objectId;
      const { sql, params } = QueryBuilder.buildUpdate(options, 'postgres');
      let changed: number;
      try {
        changed = await this._pool().run(sql, params);
      } catch (e) {
        const missing = QueryBuilder.missingExpectedField(e instanceof Error ? e.message : String(e), options.expect);
        if (missing) throw new Error(QueryBuilder.preconditionFieldMessage(options.collection, missing));
        throw e;
      }

      // HLT-016 — see LocalSQLAdapter.save: the probe carries the ACL, so a forbidden row still
      // answers "not found", and a precondition failure is never an existence oracle.
      if (options.expect && changed === 0) {
        const probe = QueryBuilder.buildRowExists(options.collection, recordId, options.acl, 'postgres');
        const exists = await this._pool().queryOne(probe.sql, probe.params);
        options.error(exists ? QueryBuilder.PRECONDITION_FAILED : 'Object not found');
        return;
      }

      // With an ACL context, 0 rows changed means not-found or forbidden —
      // deliberately indistinguishable (the write predicate is compiled into
      // the UPDATE itself, so there is no read-then-write race).
      if (options.acl && changed === 0) {
        options.error('Object not found');
        return;
      }

      const updatedRow = await this._selectById(options.collection, recordId);
      const record = this._rowToRecord(updatedRow, options.collection);
      options.success(record);
      this._emitChange({ type: 'save', id: recordId, object: record, collection: options.collection });
    });
  }

  delete(options: DeleteOptions): void {
    this._run('delete', options, async () => {
      await this._ready(options.collection);
      const recordId = options.id || options.objectId;

      // Captured before the DELETE so change consumers receive the removed
      // record, ACL included. Unfiltered; the DELETE carries the predicate.
      let removedRecord: AdapterRecord | null = null;
      try {
        removedRecord = this._rowToRecord(await this._selectById(options.collection, recordId), options.collection);
      } catch {
        removedRecord = null;
      }

      const { sql, params } = QueryBuilder.buildDelete(options, 'postgres');
      const changed = await this._pool().run(sql, params);
      if (options.acl && changed === 0) {
        options.error('Object not found');
        return;
      }

      options.success();
      this._emitChange({
        type: 'delete',
        id: recordId,
        object: removedRecord || { objectId: recordId },
        collection: options.collection
      });
    });
  }

  count(options: CountOptions): void {
    this._run('count', options, async () => {
      await this._ready(options.collection);
      const schema = this._getSchema(options.collection);
      const scope = this._columnScope(options.collection);
      const { sql, params } = QueryBuilder.buildCount(options, schema, scope, 'postgres');
      const row = await this._pool().queryOne<{ count?: number }>(sql, params);
      this._reportAbsentColumns(options.collection, scope);
      options.success(Number(row?.count || 0));
    });
  }

  aggregate(options: AggregateOptions): void {
    this._run('aggregate', options, async () => {
      await this._ready(options.collection);
      const scope = this._columnScope(options.collection);
      const { sql, params } = QueryBuilder.buildAggregate(options, scope, 'postgres');
      const row = await this._pool().queryOne<AdapterRecord>(sql, params);
      this._reportAbsentColumns(options.collection, scope);

      const result: Record<string, unknown> = {};
      if (row) {
        for (const key of Object.keys(options.group)) {
          result[key] = row[key];
        }
      }
      options.success(result);
    });
  }

  distinct(options: DistinctOptions): void {
    this._run('distinct', options, async () => {
      await this._ready(options.collection);
      const scope = this._columnScope(options.collection);
      const { sql, params } = QueryBuilder.buildDistinct(options, scope, 'postgres');
      const rows = await this._pool().query<AdapterRecord>(sql, params);
      this._reportAbsentColumns(options.collection, scope);
      options.success(rows.map((r) => r[options.property]));
    });
  }

  increment(options: IncrementOptions): void {
    this._run('increment', options, async () => {
      await this._ready(options.collection);
      const { sql, params } = QueryBuilder.buildIncrement(options, 'postgres');
      const changed = await this._pool().run(sql, params);
      if (options.acl && changed === 0) {
        options.error('Object not found');
        return;
      }
      const recordId = options.id || options.objectId;
      const updatedRow = await this._selectById(options.collection, recordId);
      options.success(this._rowToRecord(updatedRow, options.collection));
    });
  }

  addRelation(options: RelationOptions): void {
    this._run('addRelation', options, async () => {
      const sm = this._sm();
      sm.addRelation(options.collection, options.objectId, options.key, options.targetObjectId);
      await sm.barrier();
      options.success({});
    });
  }

  removeRelation(options: RelationOptions): void {
    this._run('removeRelation', options, async () => {
      const sm = this._sm();
      sm.removeRelation(options.collection, options.objectId, options.key, options.targetObjectId);
      await sm.barrier();
      options.success({});
    });
  }

  // ===========================================================================
  // The adapter's own members
  // ===========================================================================

  getSchemaManager(): PgSchemaManager | null {
    return this.schemaManager;
  }

  /**
   * 🔴 Refused, loudly. A synchronous transaction cannot be served over a
   * socket (BRG-002 §3.1), and running `fn` outside one would be the silent
   * downgrade this phase exists to refuse. The import path uses
   * {@link upsertBatch}.
   */
  transaction<T>(_fn: (...args: unknown[]) => T): T {
    throw new Error(
      'PostgresAdapter.transaction: a synchronous transaction cannot be served by a network database. ' +
        'Use upsertBatch() for an all-or-nothing batch write (BRG-002 §3.1, BRG-005).'
    );
  }

  /**
   * Insert or update every row in ONE transaction — the awaitable batch the
   * import path was moved onto by BRG-002, which `AdapterFacade.upsertBatch`
   * prefers over its SQLite-handle path when the adapter offers it.
   *
   * All-or-nothing is the contract: `backup/dataio.ts` reports "import rolled
   * back (no rows written)" on a throw, and a partial import makes that a lie.
   */
  async upsertBatch(
    collection: string,
    rows: { objectId?: string; data: Record<string, unknown> }[]
  ): Promise<{ created: number; updated: number }> {
    if (rows.length === 0) return { created: 0, updated: 0 };

    await this._ready(collection);
    for (const row of rows) this._autoColumns(collection, row.data);
    await this._sm().barrier();

    const ids = rows.map((r) => r.objectId).filter((id): id is string => typeof id === 'string' && id.length > 0);
    const table = QueryBuilder.escapeTable(collection);

    return this._pool().transaction(async (tx) => {
      const existing = new Set<string>();
      const CHUNK = 500;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const marks = slice.map(() => '?').join(', ');
        const found = await tx.query<{ objectId: string }>(
          `SELECT "objectId" FROM ${table} WHERE "objectId" IN (${marks})`,
          slice
        );
        for (const f of found) existing.add(f.objectId);
      }

      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const clean: Record<string, unknown> = { ...row.data };
        delete clean.objectId;
        if (row.objectId && existing.has(row.objectId)) {
          const { sql, params } = QueryBuilder.buildUpdate({ collection, objectId: row.objectId, data: clean }, 'postgres');
          await tx.run(sql, params);
          updated++;
        } else {
          const id = row.objectId || generateUUID();
          const { sql, params } = QueryBuilder.buildInsert({ collection, data: clean }, id);
          await tx.run(sql, params);
          created++;
        }
      }
      return { created, updated };
    });
  }
}
