/**
 * AdapterFacade — promise-shaped, wire-aware view over LocalSQLAdapter.
 *
 * The adapter's public API is callback-shaped (`options.success/error`) and
 * returns *storage-shaped* records (pointers as bare objectId strings, dates as
 * ISO strings). The HTTP surface needs two different views of it:
 *
 *   - `raw*` methods    — storage-shaped records, awaitable. What the BYOB
 *                         `/api/:table` routes (and the Data Browser via IPC
 *                         proxy) have always returned.
 *   - `wire*` methods   — Parse-wire-shaped records: schema-typed columns are
 *                         serialized to the `{__type: ...}` envelopes the four
 *                         runtime clients deserialize (`cloudstore.js`
 *                         `_fromJSON`/`_deserializeJSON`), and `include=`
 *                         expands pointers into embedded `__type: 'Object'`
 *                         records exactly as Parse does.
 *
 * Both views front the same adapter, which is the point: one database, two
 * protocols (WF-004 wire-protocol decision).
 *
 * @module nodegx-backend/persistence/AdapterFacade
 */

import * as crypto from 'crypto';

import type {
  IStorageAdapter,
  IStorageDataPlane,
  IStorageFacade,
  IStorageSchema,
  StorageAclOption,
  StorageImportColumn,
  StorageQueryOptions,
  StorageQueryResult,
  StorageSearchOptions
} from '@noodl/backend-contract';

/**
 * BRG-001 — the five shapes below moved to `@noodl/backend-contract/storage`,
 * where a second adapter and the BRG-003 conformance suite can both see them.
 * They are re-exported under the names twenty modules already import, because
 * renaming a type in twenty files is churn and not a seam.
 */
export type AclOption = StorageAclOption;
export type QueryOptions = StorageQueryOptions;
export type SearchOptions = StorageSearchOptions;
export type WireQueryResult = StorageQueryResult;
export type ImportColumn = StorageImportColumn;

// QueryBuilder is the adapter's own SQL/serialization helper — reused here so
// BAK-007 import writes serialize values EXACTLY as create()/save() do (JSON
// columns, pointers-as-id, dates-as-ISO, booleans-as-0/1) without duplicating
// that logic. Same declared dependency edge createAdapter.ts uses.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QueryBuilder = require('@noodl/runtime/src/api/adapters/local-sql/QueryBuilder');

interface AdapterCallbacks {
  success(...args: unknown[]): void;
  error(err: unknown): void;
}

/** Minimal column shape from SchemaManager.getTableSchema(). */
interface SchemaColumn {
  name: string;
  type?: string;
  targetClass?: string;
}

/** Fields never sent over the wire for `_User` records. */
const USER_PROTECTED_FIELDS = ['_hashed_password', '_email_verify_token', '_perishable_token'];

/**
 * PRD-001 — the page cap, as the facade reads it.
 *
 * Structurally identical to `ops/model.ts`'s `QueriesConfig` and deliberately
 * NOT imported from it: `persistence/` is below `ops/` and a facade that
 * imported the operational config model would make the storage seam depend on
 * the service's configuration file format. The service passes a getter; a CLI
 * or a test passes nothing and gets the shipped defaults.
 */
export interface PageCap {
  defaultLimit: number;
  maxLimit: number;
}

/**
 * The shipped defaults, duplicated from `defaultOpsConfig().queries` for the
 * reason above. `ops/model.ts` owns the operator-facing numbers; these are the
 * floor under a facade nobody configured, and `prd-001-page-cap.test.ts`
 * asserts the two agree so the duplication cannot drift.
 */
export const DEFAULT_PAGE_CAP: PageCap = { defaultLimit: 1000, maxLimit: 10_000 };

/** The awaitable batch write a network adapter offers (BRG-005 `PostgresAdapter.upsertBatch`). */
type BatchWriter = (
  collection: string,
  rows: { objectId?: string; data: Record<string, unknown> }[]
) => Promise<{ created: number; updated: number }>;

export class AdapterFacade implements IStorageFacade {
  /**
   * BRG-001: was `any`. The adapter is still plain CommonJS from
   * `@noodl/runtime` with no declaration file, so the type is a *claim* about
   * what it provides rather than a check on it — but it is now a claim written
   * down in one place, and `createAdapter` makes the same one at the boundary.
   */
  readonly adapter: IStorageAdapter;

  /**
   * PRD-001 — read fresh on every query, never captured, so `PUT /admin/ops`
   * takes effect on the next request rather than the next restart.
   */
  private readonly getPageCap: () => PageCap;

  constructor(adapter: IStorageAdapter, getPageCap?: () => PageCap) {
    this.adapter = adapter;
    this.getPageCap = getPageCap || (() => DEFAULT_PAGE_CAP);
  }

  // ==========================================================================
  // PRD-001 — the page cap
  //
  // 🔴 HERE, above the adapter, and not in `QueryBuilder`. The facade is the
  // only door left (BRG-002 removed the last raw-handle reach from
  // `security/state.ts`), so a clamp here is honoured by every adapter
  // INCLUDING ones nobody has written yet. A clamp in QueryBuilder would be
  // SQLite-only, and the Postgres adapter would have to reimplement it — which
  // is how two implementations of one rule get to disagree.
  // ==========================================================================

  /**
   * What limit this query actually runs with, and whether the CAP is what
   * decided it.
   *
   * `capApplied` is the whole of the signalling rule. A caller that asked for
   * 50 and got 50 rows is paging and is not marked capped (AC4); a caller that
   * asked for nothing, or for more than the ceiling, had its request shortened
   * by us and is owed a say-so.
   *
   * 🔴 `limit: 0` survives as 0. Parse clients send `limit=0&count=1` to ask
   * for a count and no rows — turning that into `defaultLimit` would answer a
   * count-only request with a thousand records.
   *
   * 🔴 A NEGATIVE limit is caught here rather than left to the engine. SQLite
   * reads `LIMIT -1` as "no limit", so `?limit=-1` is this task's own outage
   * spelled as a parameter.
   */
  private resolveLimit(limit: number | undefined): { limit: number; capApplied: boolean } {
    const { defaultLimit, maxLimit } = this.getPageCap();
    const asked = typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : undefined;
    if (asked === undefined || asked < 0) return { limit: defaultLimit, capApplied: true };
    if (asked > maxLimit) return { limit: maxLimit, capApplied: true };
    return { limit: asked, capApplied: false };
  }

  /**
   * Stamp `capped`/`cappedAt` when the cap shortened the request AND the page
   * came back full.
   *
   * A full page is reported as capped even when it happens to be the last one.
   * The alternative is a second count query on every plain read to tell "1,000
   * rows exactly" from "1,000 of 400,000", and a false "there may be more" is
   * the safe direction of that trade: it makes a client page once more and find
   * nothing, where the other direction is the silent truncation this task
   * exists to abolish.
   */
  private markCapped(result: WireQueryResult, effective: number, capApplied: boolean): WireQueryResult {
    if (capApplied && result.results.length >= effective) {
      result.capped = true;
      result.cappedAt = effective;
    }
    return result;
  }

  // ==========================================================================
  // Promise wrappers (storage-shaped, "raw")
  // ==========================================================================

  /**
   * The one dynamic dispatch in this file, and the reason phase 97's
   * `adapter\.<name>` grep reported eight names when there are twenty: these
   * twelve are reached by string, so no literal `adapter.query` exists to find.
   * `method` is now `keyof IStorageDataPlane` rather than `string`, so a typo
   * is a compile error and the twelve are enumerable from the type.
   *
   * The cast is the callback-shaped call itself — every one of the twelve takes
   * a different options object and they share only their two callbacks, so
   * indexing the union gives `never`. It is confined to this one line.
   */
  private call<T>(
    method: keyof IStorageDataPlane,
    options: Record<string, unknown>,
    mapSuccess?: (...args: unknown[]) => T
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cb: AdapterCallbacks = {
        success: (...args: unknown[]) => resolve(mapSuccess ? mapSuccess(...args) : (args[0] as T)),
        error: (err: unknown) => reject(err instanceof Error ? err : new Error(String(err)))
      };
      const invoke = this.adapter[method] as unknown as (o: Record<string, unknown>) => void;
      invoke.call(this.adapter, { ...options, ...cb });
    });
  }

  async rawQuery(collection: string, options: QueryOptions = {}): Promise<WireQueryResult> {
    const { limit, capApplied } = this.resolveLimit(options.limit);
    const result = await this.call<WireQueryResult>(
      'query',
      { collection, ...options, limit },
      (results, count) => ({
        results: results as Record<string, unknown>[],
        count: count as number | undefined
      })
    );
    return this.markCapped(result, limit, capApplied);
  }

  /**
   * PRD-001 §3.3 — the whole table, cap explicitly off. See `IStorageFacade`
   * for why this is a method and not a flag.
   *
   * Every caller of this is a reader that is WRONG if it stops at a page:
   * backup and export (`backup/dataio.ts` — a restore that looks fine and has
   * lost data is the worst outcome in this codebase), the file orphan sweep,
   * the role and API-key registries that authorization is computed from, and
   * every "revoke every session for this user", where a missed row is a stolen
   * token that survived a password change.
   *
   * It does not pass `limit` through at all unless the caller set one, so it is
   * also the honest place for a reader that wants its own paging: `dataio`
   * pages at 1,000 through here, and its page size is its own decision rather
   * than a number that silently becomes whatever `queries.maxLimit` is today.
   */
  rawQueryAll(collection: string, options: QueryOptions = {}): Promise<WireQueryResult> {
    return this.call<WireQueryResult>('query', { collection, ...options }, (results, count) => ({
      results: results as Record<string, unknown>[],
      count: count as number | undefined
    }));
  }

  /**
   * BAK-008: full-text search — storage-shaped records, plus `_score` (higher
   * = better match) and `_snippet` (highlighted excerpt) on each result. Row
   * results already carry the caller's ACL filtering (the adapter composes
   * the same buildAclPredicate() query() uses); a "no search index" failure
   * surfaces as a rejected promise with LocalSQLAdapter's clear message.
   */
  async rawSearch(collection: string, options: SearchOptions): Promise<WireQueryResult> {
    const { limit, capApplied } = this.resolveLimit(options.limit);
    const result = await this.call<WireQueryResult>(
      'search',
      { collection, ...options, limit },
      (results, count) => ({
        results: results as Record<string, unknown>[],
        count: count as number | undefined
      })
    );
    return this.markCapped(result, limit, capApplied);
  }

  rawFetch(collection: string, objectId: string, acl?: AclOption): Promise<Record<string, unknown>> {
    return this.call('fetch', { collection, objectId, acl });
  }

  rawCreate(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call('create', { collection, data });
  }

  rawSave(
    collection: string,
    objectId: string,
    data: Record<string, unknown>,
    acl?: AclOption
  ): Promise<Record<string, unknown>> {
    return this.call('save', { collection, objectId, data, acl });
  }

  rawDelete(collection: string, objectId: string, acl?: AclOption): Promise<void> {
    return this.call('delete', { collection, objectId, acl });
  }

  rawCount(collection: string, where?: Record<string, unknown>, acl?: AclOption): Promise<number> {
    return this.call('count', { collection, where, acl });
  }

  rawIncrement(
    collection: string,
    objectId: string,
    properties: Record<string, number>,
    acl?: AclOption
  ): Promise<Record<string, unknown>> {
    return this.call('increment', { collection, objectId, properties, acl });
  }

  rawAggregate(
    collection: string,
    group: Record<string, Record<string, string>>,
    where?: Record<string, unknown>,
    acl?: AclOption
  ): Promise<Record<string, unknown>> {
    return this.call('aggregate', { collection, group, where, acl });
  }

  /**
   * PRD-001 AC7 — the distinct path is capped too, at `maxLimit`.
   *
   * `SELECT DISTINCT city FROM orders` over four hundred thousand rows returns
   * as many values as there are cities, and nothing in the wire format bounds
   * that. It is clamped at the CEILING rather than the default because a
   * distinct is an aggregate by intent — nobody asks for distinct values
   * expecting a page — and there is no `limit` parameter on the route for a
   * caller to raise.
   *
   * ⚠️ **The grouped aggregate beside it is NOT capped, and this is its written
   * exemption.** `rawAggregate` runs our single-group aggregate: `$avg`/`$sum`/
   * `$max`/`$min` each return one scalar, so the response is one object of a
   * fixed size whatever the table holds. The one residual is `$addToSet`, which
   * QueryBuilder maps to `distinct` INSIDE that object — an unbounded array in
   * a bounded response. It is recorded as PRD-D7 rather than clamped here,
   * because the cap would have to reach into an accessor map and the honest fix
   * is for the aggregate path to take a limit of its own.
   */
  async rawDistinct(
    collection: string,
    property: string,
    where?: Record<string, unknown>,
    acl?: AclOption
  ): Promise<unknown[]> {
    const values = await this.call<unknown[]>('distinct', { collection, property, where, acl });
    const { maxLimit } = this.getPageCap();
    return Array.isArray(values) && values.length > maxLimit ? values.slice(0, maxLimit) : values;
  }

  addRelation(collection: string, objectId: string, key: string, targetObjectId: string): Promise<void> {
    return this.call('addRelation', { collection, objectId, key, targetObjectId });
  }

  removeRelation(collection: string, objectId: string, key: string, targetObjectId: string): Promise<void> {
    return this.call('removeRelation', { collection, objectId, key, targetObjectId });
  }

  // ==========================================================================
  // Schema access
  // ==========================================================================

  /**
   * NOTE the non-optional return. The adapter can genuinely be running without
   * a schema manager (both readers below guard with `&&`), so `| undefined`
   * would be the more truthful type — but every route treats it as present, and
   * this accessor was `any` until PLAT-004, so declaring it optional would mean
   * changing fifteen call sites' behaviour under what is meant to be a typing
   * change. Recorded in PLAT-004-NOTES §14 as a finding rather than fixed here.
   */
  get schemaManager(): IStorageSchema {
    return this.adapter.schemaManager;
  }

  /** Column map for a collection: name -> { type, targetClass }. */
  private columnTypes(collection: string): Map<string, SchemaColumn> {
    const map = new Map<string, SchemaColumn>();
    const schema = this.schemaManager && this.schemaManager.getTableSchema(collection);
    if (schema && Array.isArray(schema.columns)) {
      for (const col of schema.columns as SchemaColumn[]) {
        map.set(col.name, col);
      }
    }
    return map;
  }

  // ==========================================================================
  // Parse-wire serialization
  // ==========================================================================

  /**
   * Serialize one storage-shaped record to the Parse wire: Pointer columns get
   * `{__type: 'Pointer'}` envelopes (or the expanded target when included),
   * Date columns get `{__type: 'Date', iso}`. `createdAt`/`updatedAt` stay
   * plain ISO strings, as Parse sends them.
   */
  private async toWire(
    collection: string,
    record: Record<string, unknown>,
    include: string[],
    acl?: AclOption
  ): Promise<Record<string, unknown>> {
    const types = this.columnTypes(collection);
    const out: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (collection === '_User' && USER_PROTECTED_FIELDS.includes(key)) continue;
      if (value === null || value === undefined) {
        out[key] = value;
        continue;
      }
      if (key === 'createdAt' || key === 'updatedAt' || key === 'objectId') {
        out[key] = value;
        continue;
      }

      const col = types.get(key);
      if (col && col.type === 'Pointer' && typeof value === 'string') {
        const className = col.targetClass || 'Unknown';
        if (include.includes(key)) {
          try {
            // The caller's read ACL applies to the TARGET row too — without
            // this, include= is a one-hop ACL bypass. An unreadable target
            // degrades to the unexpanded envelope, same as a dangling pointer.
            const target = await this.rawFetch(className, value, acl && { ...acl, access: 'read' });
            const expanded = await this.toWire(className, target, [], acl);
            out[key] = { __type: 'Object', className, ...expanded };
          } catch {
            // Dangling or unreadable pointer — fall back to the unexpanded envelope.
            out[key] = { __type: 'Pointer', className, objectId: value };
          }
        } else {
          out[key] = { __type: 'Pointer', className, objectId: value };
        }
      } else if (col && col.type === 'Date' && typeof value === 'string') {
        out[key] = { __type: 'Date', iso: value };
      } else if (col && col.type === 'Boolean') {
        out[key] = Boolean(value);
      } else {
        // File/GeoPoint/Object/Array come back from the adapter already parsed
        // (JSON columns), keeping their stored `__type` envelopes where present.
        out[key] = value;
      }
    }

    return out;
  }

  private normalizeInclude(include?: string[] | string): string[] {
    if (!include) return [];
    const arr = Array.isArray(include) ? include : String(include).split(',');
    // Single-level expansion only — dotted paths (`a.b`) expand their first
    // segment. Recorded limitation; the record nodes only offer one level.
    return arr.map((s) => s.trim().split('.')[0]).filter(Boolean);
  }

  // ==========================================================================
  // Parse-wire operations
  // ==========================================================================

  async wireQuery(collection: string, options: QueryOptions): Promise<WireQueryResult> {
    const include = this.normalizeInclude(options.include);
    const { results, count, capped, cappedAt } = await this.rawQuery(collection, options);
    const wire: Record<string, unknown>[] = [];
    for (const record of results) {
      wire.push(await this.toWire(collection, record, include, options.acl));
    }
    const out: WireQueryResult = { results: wire };
    if (count !== undefined) out.count = count;
    // PRD-001: the annotation rawQuery stamped survives serialization. The
    // ROUTE is what turns it into a header and drops it from the body — the
    // Parse wire format is shared with unchanged clients and a new body field
    // is the one place this may not go.
    if (capped) {
      out.capped = true;
      out.cappedAt = cappedAt;
    }
    return out;
  }

  async wireFetch(
    collection: string,
    objectId: string,
    include?: string[] | string,
    acl?: AclOption
  ): Promise<Record<string, unknown>> {
    const record = await this.rawFetch(collection, objectId, acl);
    return this.toWire(collection, record, this.normalizeInclude(include), acl);
  }

  /**
   * BAK-008: wire-shaped search results. `_score`/`_snippet` are search-only,
   * not schema columns, so they bypass toWire()'s column-typed serialization
   * and are reattached after — the runtime client's `_fromJSON` sets every key
   * it sees as a model property, so these arrive as ordinary item fields
   * (`Item._score`, `Item._snippet`) with no special node-output wiring needed.
   */
  async wireSearch(collection: string, options: SearchOptions): Promise<WireQueryResult> {
    const include = this.normalizeInclude(options.include);
    const { results, count, capped, cappedAt } = await this.rawSearch(collection, options);
    const wire: Record<string, unknown>[] = [];
    for (const record of results) {
      const { _score, _snippet, ...rest } = record;
      const w = await this.toWire(collection, rest, include, options.acl);
      if (_score !== undefined) w._score = _score;
      if (_snippet !== undefined) w._snippet = _snippet;
      wire.push(w);
    }
    const out: WireQueryResult = { results: wire };
    if (count !== undefined) out.count = count;
    if (capped) {
      out.capped = true;
      out.cappedAt = cappedAt;
    }
    return out;
  }

  /**
   * Serialize a full record for session/user responses (login, /users/me) —
   * wire-shaped, protected fields stripped.
   */
  wireRecord(collection: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.toWire(collection, record, []);
  }

  // ==========================================================================
  // Import support (BAK-007) — synchronous, transaction-safe writes
  //
  // The adapter is synchronous under the hood (node:sqlite), but its public
  // methods are callback-wrapped and returned as Promises, which cannot run
  // inside a synchronous `db.transaction(fn)`. Import needs a per-collection
  // transaction (all-or-nothing, never a half-import), so these helpers do the
  // writes synchronously via the same QueryBuilder the adapter uses.
  // ==========================================================================

  /** Schema column descriptors for a collection ([] when the table is unknown). */
  async getColumns(collection: string): Promise<ImportColumn[]> {
    const schema = this.schemaManager && this.schemaManager.getTableSchema(collection);
    return schema && Array.isArray(schema.columns) ? (schema.columns as ImportColumn[]) : [];
  }

  private inferColumnType(value: unknown): string {
    if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      if (v.__type === 'Date') return 'Date';
      if (v.__type === 'Pointer') return 'Pointer';
      if (v.__type === 'File') return 'File';
      if (v.__type === 'GeoPoint') return 'GeoPoint';
      if (Array.isArray(value)) return 'Array';
      return 'Object';
    }
    if (typeof value === 'boolean') return 'Boolean';
    if (typeof value === 'number') return 'Number';
    return 'String';
  }

  /** Ensure the table + a column for every data key exists (idempotent). */
  async ensureImportShape(
    collection: string,
    columns: ImportColumn[],
    sampleData: Record<string, unknown>
  ): Promise<void> {
    const sm = this.schemaManager;
    if (!sm) return;
    sm.createTable({ name: collection, columns: [] });
    const existing = new Set((await this.getColumns(collection)).map((c) => c.name));
    // Explicit schema first (correct types), then anything the data implies.
    for (const col of columns) {
      if (col.name && !existing.has(col.name) && col.type !== 'Relation') {
        sm.addColumn(collection, col);
        existing.add(col.name);
      }
    }
    for (const [key, value] of Object.entries(sampleData)) {
      if (['objectId', 'createdAt', 'updatedAt', 'id', 'ACL'].includes(key)) continue;
      if (value === null || value === undefined) continue;
      if (existing.has(key)) continue;
      const type = this.inferColumnType(value);
      const column: ImportColumn = { name: key, type };
      // Same rule as LocalSQLAdapter's create/save: a Pointer value names its
      // class, and a column recorded without it refuses `pointsTo` forever.
      const className = type === 'Pointer' && (value as { className?: string }).className;
      if (className) column.targetClass = className;
      sm.addColumn(collection, column);
      existing.add(key);
    }
  }

  /**
   * BRG-001 §3.3 — the escape hatch, in the open.
   *
   * `getDatabase()` is optional on `IStorageAdapter` and returns `unknown`, so
   * that a non-SQLite adapter can simply not have it and BRG-003 can assert
   * nothing in the promise depends on it. The two callers below are the only
   * ones in this file and both are import-path writes; BRG-002 removes them
   * along with the rest of the synchronous surface.
   *
   * It throws rather than returning null because both callers would otherwise
   * fail one line later with `Cannot read properties of null`, which names the
   * wrong thing.
   */
  private sqliteHandle(): { prepare(sql: string): { get(...a: unknown[]): unknown; run(...a: unknown[]): unknown } } {
    const db = this.adapter.getDatabase?.();
    if (!db) {
      throw new Error(
        'This adapter has no direct SQLite handle, and the synchronous import path requires one (BRG-002).'
      );
    }
    return db as { prepare(sql: string): { get(...a: unknown[]): unknown; run(...a: unknown[]): unknown } };
  }

  /**
   * BRG-002 §3.1 — which of these objectIds already exist, in one call.
   *
   * This replaced a per-row `existsSync` that reached for the raw SQLite handle
   * and ran `SELECT 1 ... WHERE objectId = ?` once per row. It now goes through
   * `rawQuery`, which means it is **portable**: this is one of the two raw-handle
   * reaches BRG-002 removed outright rather than merely making awaitable.
   *
   * Chunked because a parameter list is not unbounded — `$in` becomes one bound
   * parameter per id, and every engine has a ceiling (SQLite's default is 999
   * on older builds). 500 is comfortably under every one of them and costs two
   * queries per thousand rows.
   *
   * Errors are swallowed to `has nothing`, exactly as `existsSync` returned
   * `false` on a throw: an unknown table is the normal case on a first import,
   * and it means "no row exists", not "the import failed".
   */
  async existingIds(collection: string, objectIds: string[]): Promise<Set<string>> {
    const found = new Set<string>();
    const ids = objectIds.filter((id) => typeof id === 'string' && id.length > 0);
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      try {
        // rawQueryAll: this is an import-path read whose page size is the chunk
        // it just asked about, not a product page. 500 is under any cap worth
        // configuring, but "under it today" is not a reason to route a
        // system read through a control built for requests.
        const { results } = await this.rawQueryAll(collection, {
          where: { objectId: { $in: slice } },
          select: ['objectId'],
          limit: slice.length
        });
        for (const row of results) {
          const id = row.objectId;
          if (typeof id === 'string') found.add(id);
        }
      } catch {
        // An unknown collection reads as "nothing exists" — see above.
        return found;
      }
    }
    return found;
  }

  /**
   * BRG-002 §3.1 — insert or update every row, in ONE transaction.
   *
   * This is the shape that removed phase 97's single structural blocker. The
   * import path used to call `facade.transaction(fn)` with a synchronous
   * callback and run one `upsertSync` per row inside it; a caller cannot hold a
   * synchronous SQLite transaction open across an `await`, so no amount of
   * making `upsertSync` promise-returning would have helped. Moving the
   * transaction *inside* one awaitable call is what makes the interface
   * implementable by an adapter that is not in this process.
   *
   * 🔴 **All-or-nothing is part of the contract, not an implementation detail.**
   * `backup/dataio.ts` reports "import rolled back (no rows written)" on a
   * throw, and a partially-written import makes that report a lie.
   *
   * ⚠️ **The one method on this facade whose implementation is SQLite-specific.**
   * It reaches `sqliteHandle()` because `adapter.transaction()` takes a
   * synchronous callback and the writes are built with the adapter's own
   * `QueryBuilder`, so `create`/`save` cannot be used without giving up the
   * single transaction. **BRG-005 owes either a batch write on `IStorageAdapter`
   * or its own facade**, and BRG-003 is what will catch it if neither arrives:
   * the rollback case is a conformance test, not a comment.
   */
  async upsertBatch(
    collection: string,
    rows: { objectId?: string; data: Record<string, unknown> }[]
  ): Promise<{ created: number; updated: number }> {
    if (rows.length === 0) return { created: 0, updated: 0 };

    // BRG-005: an adapter that offers its own awaitable batch — one real
    // transaction on its own connection — is preferred over the SQLite-handle
    // path below, which is the "either a batch write on IStorageAdapter or its
    // own facade" this docstring owed. It is read off the adapter rather than
    // declared on the interface for now: BRG-003's coverage ratchet (AC7, "the
    // uncovered list does not grow") is the gate that a new interface member
    // has to pay, and that is BRG-006's to settle with a case, not a comment.
    const batch = (this.adapter as { upsertBatch?: BatchWriter }).upsertBatch;
    if (typeof batch === 'function') {
      return batch.call(this.adapter, collection, rows);
    }

    const ids = rows.map((r) => r.objectId).filter((id): id is string => typeof id === 'string' && id.length > 0);
    const existing = await this.existingIds(collection, ids);

    const db = this.sqliteHandle();
    let created = 0;
    let updated = 0;

    this.adapter.transaction(() => {
      for (const row of rows) {
        const clean: Record<string, unknown> = { ...row.data };
        delete clean.objectId;

        if (row.objectId && existing.has(row.objectId)) {
          const { sql, params } = QueryBuilder.buildUpdate({ collection, objectId: row.objectId, data: clean });
          db.prepare(sql).run(...params);
          updated++;
        } else {
          const id = row.objectId || crypto.randomUUID();
          const { sql, params } = QueryBuilder.buildInsert({ collection, data: clean }, id);
          db.prepare(sql).run(...params);
          created++;
        }
      }
    });

    return { created, updated };
  }
}
