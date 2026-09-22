/**
 * The storage seam — what a NodeGX backend needs from a database (BRG-001).
 *
 * **This file is a transcription, not a design.** Every member below is a call
 * the backend makes today, and each one carries the file and line it was
 * transcribed from at HEAD `c7fe1a1da` (2026-09-19). A method that exists here
 * because it would be nicer is a method the conformance suite (BRG-003) will
 * not gate, and therefore a method that is not part of the promise — so there
 * are none.
 *
 * Why it lives in this package and not in `nodegx-backend`: BRG-003's
 * conformance suite runs against *any* adapter and cannot import the backend
 * that is being conformed. This package is types and frozen data — no I/O, no
 * adapter implementations — and an interface is exactly that.
 *
 * Three interfaces, three different distances from the database:
 *
 * | | what it is | who implements it |
 * |---|---|---|
 * | {@link IStorageAdapter} | the **20 names** on the adapter object — its own 8, plus the 12 of {@link IStorageDataPlane} it extends | `LocalSQLAdapter` today; `PostgresAdapter` at BRG-005 |
 * | {@link IStorageFacade} | the **21 members** everything else in the backend goes through | `AdapterFacade` |
 * | {@link IStorageSchema} | the **20 names** of the schema surface | `SchemaManager` |
 *
 * ⚠️ **Those three numbers were 8 / 22 / 16 until BRG-003's gate counted them**
 * (2026-09-19, s4). Two of them were simply wrong, and the header had been read
 * several times without anyone noticing — which is the phase's own subject
 * arriving in its own file. They are no longer load-bearing: the coverage
 * register in `conformance/coverage.ts` is keyed by `keyof` these interfaces and
 * the gate reads the surface back out of this file, so what is counted is the
 * artefact. A number in this table that drifts again costs a reader a moment;
 * it can no longer cost a capability its case.
 *
 * Read `dev-docs/tasks/phase-97-the-way-out-is-the-reason-to-stay/` before
 * adding anything here. Rule 1 of that phase: declare what exists; do not
 * redesign it.
 *
 * @module backend-contract/storage
 */

// ===========================================================================
// Shared value shapes
// ===========================================================================

/**
 * Row-level ACL context (BAK-003). The adapter compiles this **into the SQL**
 * (`local-sql/QueryBuilder.ts` `buildAclPredicate`), which is why it is part of
 * the storage interface and not a filter applied afterwards — an adapter that
 * accepts this and ignores it is a data breach, and BRG-003 §3.2 is where that
 * is caught.
 *
 * Absent = no row filtering (dev-open, admin, scoped API keys).
 *
 * Transcribed from `nodegx-backend/src/persistence/AdapterFacade.ts:59-62`.
 */
export interface StorageAclOption {
  access: 'read' | 'write';
  keys: string[];
}

/**
 * The query surface every `raw*` and `wire*` read takes.
 *
 * Transcribed from `nodegx-backend/src/persistence/AdapterFacade.ts:64-73`.
 * Named `Storage…` because this package already exports a client-facing
 * `QueryOptions` (`data.ts`) that is a different thing: that one is what a node
 * on the canvas asks for, this one is what the database is asked for.
 */
export interface StorageQueryOptions {
  where?: Record<string, unknown>;
  sort?: string[] | string;
  limit?: number;
  skip?: number;
  select?: string[] | string;
  include?: string[];
  count?: boolean;
  acl?: StorageAclOption;
}

/**
 * BAK-008: query options plus the required full-text search term.
 *
 * Transcribed from `nodegx-backend/src/persistence/AdapterFacade.ts:78-80`.
 */
export interface StorageSearchOptions extends StorageQueryOptions {
  search: string;
}

/**
 * PRD-006 — what the two LIST-shaped reads return: the payload, plus the one
 * field that says the product's ceiling shortened it.
 *
 * 🔴 **One field, not the two `StorageQueryResult` carries.** A page needs
 * `capped` as well because `splitCapped` has to strip both out of a body that
 * is otherwise sent verbatim; these two are assembled into their body by hand,
 * so a second boolean would only be a field that can disagree with the number
 * beside it. `cappedAt` is present exactly when the ceiling fired.
 *
 * As with `capped`, this is a FACADE annotation and never an adapter's output.
 */
export interface StorageDistinctResult {
  values: unknown[];
  cappedAt?: number;
}

/** PRD-006 — the single-group aggregate's object, and the same annotation. */
export interface StorageAggregateResult {
  result: Record<string, unknown>;
  cappedAt?: number;
}

/**
 * What a read returns: the rows, and the total when `count` was asked for.
 *
 * Transcribed from `nodegx-backend/src/persistence/AdapterFacade.ts:75-78`.
 */
export interface StorageQueryResult {
  results: Record<string, unknown>[];
  count?: number;
  /**
   * PRD-001 — the page cap fired: `results` is a PAGE and there are, or may be,
   * more rows behind it.
   *
   * 🔴 **A facade annotation, never an adapter's output.** `AdapterFacade`
   * resolves the effective limit before the call and stamps this after it; an
   * adapter returns rows and a count and knows nothing about the product's cap.
   * An adapter that sets it is not more conformant, it is wrong — which is why
   * BRG-003 asserts `limit` is honoured and says nothing about this field.
   *
   * Set ONLY when the cap itself shortened the request (no `limit` given, or one
   * above `queries.maxLimit`). A caller that asked for 50 and got 50 is paging,
   * not capped, and is not marked.
   */
  capped?: boolean;
  /** PRD-001 — the limit actually applied, present exactly when `capped` is true. */
  cappedAt?: number;
}

/**
 * A column descriptor as the import path carries it (BAK-007).
 *
 * Transcribed from `nodegx-backend/src/persistence/AdapterFacade.ts:40-44`.
 */
export interface StorageImportColumn {
  name: string;
  type?: string;
  targetClass?: string;
}

/**
 * What `connect()` leaves behind: whether this backend is actually persisting.
 *
 * Transcribed from `nodegx-backend/src/persistence/createAdapter.ts:36-43`
 * (`PersistenceHandle.status`), which is the shape `getPersistenceStatus()`
 * returns. RUN-004: a service that cannot persist and was not told it may run
 * ephemerally refuses to start, so this is read at exactly one place and is
 * load-bearing.
 */
export interface StoragePersistenceStatus {
  mode: string;
  persistent: boolean;
  ephemeral: boolean;
  engine: string | null;
  error: { message: string; code: string } | null;
}

/**
 * One post-commit change, as the adapter emits it and `ChangeBus` receives it.
 *
 * Transcribed from `nodegx-backend/src/realtime/ChangeBus.ts` (`RawChange`),
 * whose two consumers are realtime SSE and the DB-change trigger. The emission
 * is **post-commit and ordered**, and that is the part BRG-003 gates: an
 * adapter that emits before commit, or emits on rollback, passes every CRUD
 * case and silently breaks both consumers.
 */
export interface StorageChange {
  type: 'create' | 'save' | 'delete';
  collection: string;
  id: string;
  object?: Record<string, unknown>;
}

// ===========================================================================
// Schema
// ===========================================================================

/**
 * A column, as the schema surface carries it.
 *
 * Deliberately **no index signature** — an interface never satisfies a type
 * that has one, so every caller passing its own column shape would have to
 * cast, which is the failure mode this whole file exists to remove. That trap
 * fired twice before (PLAT-004 §11, and again on `SchemaManagerLike`'s first
 * compile); the comment is here so it does not fire a third time.
 *
 * Transcribed from `nodegx-backend/src/persistence/SchemaManagerLike.ts:34-39`.
 */
export interface StorageColumn {
  name: string;
  /** Optional: some import paths carry a column with no declared type yet. */
  type?: string;
  targetClass?: string;
}

/**
 * One declared index (FED-002), as `schema.json` carries it and as the adapter
 * reads it back. `fields` is one to four property names; the name is derived.
 *
 * Transcribed from `nodegx-backend/src/persistence/SchemaManagerLike.ts:45-49`.
 */
export interface StorageIndexDecl {
  fields: string[];
  unique?: boolean;
  order?: 'asc' | 'desc';
  /**
   * HLT-016: a partial index, covering only the rows this holds for. Property →
   * `true`/`false`, a string, a number, `{ exists: boolean }` or `{ in: [...] }`,
   * all of which must hold. Never SQL text.
   */
  where?: Record<string, boolean | string | number | { exists: boolean } | { in: Array<string | number> }>;
}

/**
 * A declared index and whether the database has it — what the dashboard lists.
 *
 * Transcribed from `nodegx-backend/src/persistence/SchemaManagerLike.ts:52-59`.
 */
export interface StorageIndexStatus extends StorageIndexDecl {
  name: string;
  unique: boolean;
  order: 'asc' | 'desc';
  built: boolean;
  /** False for an index that exists and nothing declares (drift). */
  declared: boolean;
}

/**
 * What a reconcile did, and what the audit entry of a schema push names.
 *
 * Transcribed from `nodegx-backend/src/persistence/SchemaManagerLike.ts:62-67`.
 */
export interface StorageIndexReconcileReport {
  created: string[];
  dropped: string[];
  kept: string[];
  indexes: StorageIndexDecl[];
}

/**
 * A table's declared shape.
 *
 * Transcribed from `nodegx-backend/src/persistence/SchemaManagerLike.ts:41-47`.
 */
export interface StorageTableSchema {
  name: string;
  columns?: StorageColumn[];
  createdAt?: string;
  /** FED-002 — the indexes this collection declares, beyond createdAt/updatedAt. */
  indexes?: StorageIndexDecl[];
}

/** Options for `IStorageSchema.generatePostgresSQL`. */
export interface StoragePostgresExportOptions {
  /**
   * Emit a `BEFORE UPDATE` trigger stamping `updatedAt`. Off by default: on the
   * NodeGX path the app stamps the column itself, and a trigger doing it again
   * overwrites the value the caller just wrote.
   */
  updatedAtTrigger?: boolean;
}

/**
 * Options for `IStorageSchema.generateSupabaseSQL`.
 *
 * `security` is the live CLP configuration (`security.json`'s shape, declared
 * structurally because it lives in `nodegx-backend`, above this package) and
 * `userIdClaim` is the JWT claim carrying the NodeGX `_User` objectId. Both are
 * refused when absent: a row ACL is keyed by NodeGX user ids and PostgREST
 * authenticates somebody else's, so a generator guessing either is how
 * `USING (true)` happened.
 */
export interface StorageSupabaseExportOptions {
  security?: {
    defaults: { permissions: Record<string, string | string[]>; creatorOwns?: boolean };
    collections?: Record<string, { permissions?: Record<string, string | string[]>; creatorOwns?: boolean }>;
  };
  userIdClaim?: string;
}

/**
 * The schema surface — 16 names, every one called by `nodegx-backend` today.
 *
 * This replaces `persistence/SchemaManagerLike.ts`, whose own docstring asked
 * to be replaced ("it is a stand-in, and it says so on purpose"). The list is
 * unchanged from that file; what changed is where it lives and what it is
 * called, so that a second adapter has something to implement rather than a
 * class to imitate.
 *
 * **On the optional members:** `changeColumnType`, `deleteTable`,
 * `reconcileIndexes` and `indexStatus` are optional and feature-detected at
 * their call sites, because this interface describes whatever adapter the
 * service was handed and an older one predates them. The two that are reachable
 * over HTTP answer `501` rather than failing with `is not a function`.
 */
export interface IStorageSchema {
  // --- tables and columns --------------------------------------------------

  /** `byob-admin.ts:352` (createTable route); `AdapterFacade.ts:383`. */
  createTable(spec: { name: string; columns: StorageColumn[] }): boolean;
  /** `byob-admin.ts:366`; `AdapterFacade.ts:390, 407`. */
  addColumn(table: string, column: StorageColumn): void;
  /** `byob-admin.ts:375` (renameColumn route). */
  renameColumn(table: string, oldName: string, newName: string): void;
  /**
   * AAQ-002: change a column's type, converting stored values.
   * `byob-admin.ts:384`. Optional — feature-detected at that one call site.
   */
  changeColumnType?(
    table: string,
    column: string,
    newType: string
  ): { changed: boolean; from?: string; rebuilt?: boolean; convertedValues?: number };
  /** Optional: `backup/schema-migrate.ts` feature-detects it before calling. */
  deleteTable?(table: string): boolean;
  /** `AdapterFacade.ts:355`; `byob-admin.ts`; `search/SearchIndexer.ts`. */
  getTableSchema(table: string): StorageTableSchema | null;
  /** `byob-admin.ts` (schema listing); `backup/dataio.ts`. */
  listTables(): string[];
  /** `byob-admin.ts:468` (the `format=json` export); `backup/schema-migrate.ts`. */
  exportSchemas(): StorageTableSchema[];

  // --- migration export ----------------------------------------------------
  //
  // Repaired in place by BRG-004 (R3), which is what this comment used to be
  // the marker for. What they emitted at phase 97's HEAD: relation columns
  // dropped (BRG-D3), every declared index dropped (BRG-D2), and four
  // `USING (true)` policies per table over a backend enforcing `creatorOwns`
  // row ACLs (BRG-D1). All three are closed, and the thing that keeps them
  // closed is `noodl-runtime/test/adapters/SchemaManager.export.test.js` plus
  // its `.postgres.` sibling, which applies the emitted DDL to a real
  // PostgreSQL and measures the denial.
  //
  // They remain a *migration* concern, not a storage one: a second adapter has
  // no business implementing them, which is why both are optional — and why
  // they are `not-in-the-promise` in the coverage register rather than cases.

  /** `byob-admin.ts`. Optional — SQLite-export only. */
  generatePostgresSQL?(options?: StoragePostgresExportOptions): string;
  /**
   * Optional — SQLite-export only. **Throws** `code: 'CANNOT_CROSS'` rather
   * than approximating anything it cannot carry: no CLP config, no identity
   * mapping, a role-based permission, a `find`/`get` split PostgREST cannot
   * express, or rows whose ACL names a role.
   */
  generateSupabaseSQL?(options?: StorageSupabaseExportOptions): string;

  // --- declared indexes (FED-002) ------------------------------------------

  /** Make the database's indexes match this declaration. Throws `code: 'INDEX_DUPLICATES'`. `byob-admin.ts:430`. */
  reconcileIndexes?(table: string, indexes: unknown): StorageIndexReconcileReport;
  /** Every declared index and whether it is built, plus drift. `byob-admin.ts:446`. */
  indexStatus?(table: string): StorageIndexStatus[];

  // --- full-text search (BAK-008) ------------------------------------------

  /** `search/SearchIndexer.ts`; `server/admin-search.ts`. */
  hasFts5Support(): boolean;
  /** `search/SearchIndexer.ts`. */
  hasSearchIndex(collection: string): boolean;
  /** `search/SearchIndexer.ts`. */
  rebuildSearchIndex(collection: string, fields: string[], tokenizer?: string): unknown;
  /** `search/SearchIndexer.ts`. */
  dropSearchIndex(collection: string): void;

  // --- relations (BAK-003 roles) -------------------------------------------

  /** `roles/RoleStore.ts`; `auth/identities.ts`. */
  getRelatedIds(table: string, objectId: string, key: string): unknown;
  /**
   * The inverse: which owners carry this related id. `security/state.ts`
   * (`rolesForUser`, on the authorization path of every session request).
   *
   * Added by BRG-002 §3.3 and ruled 2026-09-19 — the ONE member of these three
   * interfaces that was not already a call the backend made through an object
   * method. It was a hand-written JOIN on the raw SQLite handle, and declaring
   * it here is what let the last reach past the interface be deleted. It is
   * therefore in the promise, and BRG-003 gates it like any other.
   */
  getRelationOwners(table: string, key: string, relatedId: string): string[];
  /** `roles/RoleStore.ts`. */
  addRelation(table: string, objectId: string, key: string, relatedId: string): void;
  /** `roles/RoleStore.ts`. */
  removeRelation(table: string, objectId: string, key: string, relatedId: string): void;
}

// ===========================================================================
// The adapter
// ===========================================================================

/**
 * The adapter's data plane — twelve callback-shaped methods.
 *
 * 🔴 **These are the twelve the `adapter.<name>` grep could not see**, because
 * `AdapterFacade.call()` dispatches them *by string*
 * (`this.adapter[method]({...options, success, error})`,
 * `AdapterFacade.ts:102-110`). Phase 97 §2's headline — "the whole adapter
 * surface those 8 use is 8 names" — is the grep's answer, not the adapter's:
 * the real surface is **20**, and these twelve are the entire data plane. A
 * second adapter that implemented the other eight would compile, start, and
 * answer nothing.
 *
 * Transcribed from `noodl-runtime/src/api/adapters/local-sql/LocalSQLAdapter.ts:828-1280`
 * and the option interfaces at `:70-160`. Methods rather than properties, so an
 * implementation may narrow its callbacks.
 */
export interface IStorageDataPlane {
  /** `LocalSQLAdapter.ts:828`. Called as `query` from `AdapterFacade.ts:113`. */
  query(options: StorageQueryCall): void;
  /** BAK-008. `LocalSQLAdapter.ts:883`; called from `AdapterFacade.ts:127`. */
  search(options: StorageSearchCall): void;
  /** `LocalSQLAdapter.ts:934`; called from `AdapterFacade.ts:134`. */
  fetch(options: StorageFetchCall): void;
  /** `LocalSQLAdapter.ts:974`; called from `AdapterFacade.ts:138`. */
  create(options: StorageCreateCall): void;
  /** `LocalSQLAdapter.ts:1049`; called from `AdapterFacade.ts:147`. */
  save(options: StorageSaveCall): void;
  /** `LocalSQLAdapter.ts:1106`; called from `AdapterFacade.ts:151`. */
  delete(options: StorageDeleteCall): void;
  /** `LocalSQLAdapter.ts:1153`; called from `AdapterFacade.ts:155`. */
  count(options: StorageCountCall): void;
  /** `LocalSQLAdapter.ts:1174`; called from `AdapterFacade.ts:172`. */
  aggregate(options: StorageAggregateCall): void;
  /** `LocalSQLAdapter.ts:1202`; called from `AdapterFacade.ts:177`. */
  distinct(options: StorageDistinctCall): void;
  /** `LocalSQLAdapter.ts:1223`; called from `AdapterFacade.ts:164`. */
  increment(options: StorageIncrementCall): void;
  /** `LocalSQLAdapter.ts:1253`; called from `AdapterFacade.ts:181`. */
  addRelation(options: StorageRelationCall): void;
  /** `LocalSQLAdapter.ts:1267`; called from `AdapterFacade.ts:185`. */
  removeRelation(options: StorageRelationCall): void;
}

/** The error half of every callback pair. `LocalSQLAdapter.ts:66-68`. */
export interface StorageErrorCallback {
  (message: string): void;
}

/** `LocalSQLAdapter.ts:70-81`. */
export interface StorageQueryCall extends StorageQueryOptions {
  collection: string;
  success(results: Record<string, unknown>[], count?: number): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:83-85`. */
export interface StorageSearchCall extends StorageQueryCall {
  search: string;
}

/**
 * `LocalSQLAdapter.ts:87-94`. Note `id` **and** `objectId` — the adapter
 * accepts either, and four of these option shapes carry both. That is a wart
 * BRG-005 must reproduce, not tidy: the facade passes `objectId`, the in-editor
 * callers pass `id`, and an adapter honouring only one silently finds nothing.
 */
export interface StorageFetchCall {
  collection: string;
  id?: string;
  objectId?: string;
  acl?: StorageAclOption;
  success(record: Record<string, unknown>): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:96-101`. */
export interface StorageCreateCall {
  collection: string;
  data: Record<string, unknown>;
  success(record: Record<string, unknown>): void;
  error: StorageErrorCallback;
}

/**
 * HLT-016 — "only if unchanged": field → the value it must still hold for a save to apply.
 * Scalars only (`QueryBuilder.ExpectedValues`, which says why). `null` means "still empty".
 */
export type StorageExpectedValues = Record<string, string | number | boolean | null>;

/** `LocalSQLAdapter.ts:103-111`. */
export interface StorageSaveCall {
  collection: string;
  id?: string;
  objectId?: string;
  data: Record<string, unknown>;
  acl?: StorageAclOption;
  /**
   * HLT-016 — compiled into the UPDATE itself. A row that exists and is writable but no longer
   * holds these values fails with `Precondition failed: …` (the HTTP layer's 409). A missing or
   * forbidden row still fails `Object not found`.
   */
  expect?: StorageExpectedValues;
  success(record: Record<string, unknown>): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:113-120`. */
export interface StorageDeleteCall {
  collection: string;
  id?: string;
  objectId?: string;
  acl?: StorageAclOption;
  success(): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:122-128`. */
export interface StorageCountCall {
  collection: string;
  where?: Record<string, unknown>;
  acl?: StorageAclOption;
  success(count: number): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:130-137`. */
export interface StorageAggregateCall {
  collection: string;
  where?: Record<string, unknown>;
  group: Record<string, { avg?: string; sum?: string; max?: string; min?: string; distinct?: string }>;
  acl?: StorageAclOption;
  success(result: Record<string, unknown>): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:139-146`. */
export interface StorageDistinctCall {
  collection: string;
  property: string;
  where?: Record<string, unknown>;
  acl?: StorageAclOption;
  success(values: unknown[]): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:148-156`. */
export interface StorageIncrementCall {
  collection: string;
  id?: string;
  objectId?: string;
  properties: Record<string, number>;
  acl?: StorageAclOption;
  success(record: Record<string, unknown>): void;
  error: StorageErrorCallback;
}

/** `LocalSQLAdapter.ts:158-165`. */
export interface StorageRelationCall {
  collection: string;
  objectId: string;
  key: string;
  targetObjectId: string;
  success(result: Record<string, never>): void;
  error: StorageErrorCallback;
}

/**
 * The adapter object itself — **20 names**: the eight below plus the twelve of
 * {@link IStorageDataPlane}.
 *
 * Measured 2026-09-19 at HEAD `c7fe1a1da`: **6 modules** in `nodegx-backend`
 * call anything on an adapter — `service.ts`, `cli.ts`, `security/state.ts`,
 * `realtime/ChangeBus.ts`, `persistence/AdapterFacade.ts` and
 * `persistence/createAdapter.ts`. (Phase 97 §2 says 8 and names
 * `triggers/dbchange.ts` and `server/http-util.ts`; neither touches an adapter —
 * the first says so in its own comment and the second requires `QueryBuilder`.
 * The seam is narrower in modules than the scoping session claimed, and wider
 * in methods.)
 *
 * Everything else in the backend goes through {@link IStorageFacade}.
 */
export interface IStorageAdapter extends IStorageDataPlane {
  /**
   * Open the database. Throws `LocalBackendPersistenceError` when it cannot
   * persist and the caller has not opted in to ephemeral mode — the service
   * refuses to start rather than silently losing data (RUN-004).
   *
   * `persistence/createAdapter.ts:73`.
   */
  connect(): Promise<void>;

  /** `service.ts:707`; `cli.ts:165, 208, 386`. */
  disconnect(): Promise<void>;

  /** `persistence/createAdapter.ts:78`. */
  getPersistenceStatus(): StoragePersistenceStatus;

  /**
   * Post-commit change events. Both are **optional and feature-detected**:
   * `ChangeBus.attach()` checks `typeof this.adapter.on === 'function'` and
   * simply never attaches otherwise, so an adapter with no event surface is a
   * supported configuration rather than a type error.
   *
   * `realtime/ChangeBus.ts:77, 81`.
   */
  on?(type: StorageChange['type'], handler: (payload: StorageChange) => void): void;
  /** `realtime/ChangeBus.ts:114, 116`. */
  off?(type: string, handler: (payload: StorageChange) => void): void;

  /** `persistence/AdapterFacade.ts:201`. */
  readonly schemaManager: IStorageSchema;

  /**
   * Run `fn` inside a single transaction: commit on return, rollback on throw.
   *
   * 🔴 **Synchronous, and that is a real constraint on a second adapter.** The
   * one caller is the import path (`backup/dataio.ts` via
   * `AdapterFacade.transaction`, `AdapterFacade.ts:361`), which needs
   * all-or-nothing per collection. BRG-002 is where this and the six other
   * synchronous calls are made awaitable; until then, an adapter that cannot
   * run a synchronous transaction cannot serve an import.
   *
   * `persistence/AdapterFacade.ts:361`.
   */
  transaction<T>(fn: () => T): T;

  /**
   * 🔴 **The escape hatch, and the one member of this interface that a second
   * adapter cannot honour.** Returns the raw SQLite handle.
   *
   * Three call sites at HEAD, all inside `persistence/` and `security/`:
   * `AdapterFacade.ts:410` (`existsSync`), `AdapterFacade.ts:426`
   * (`upsertSync`) and `security/state.ts:386` (`_Role` / `_ApiKey` raw reads).
   * Phase 97 §2 counts five; the other two — `service.ts:377` and
   * `execution/ExecutionStore.ts:128` — are `ExecutionStore`'s **own**
   * `getDatabase()` over its own separate file, not the adapter's, and are
   * BRG-002 §3.2's business rather than this interface's.
   *
   * All three die in BRG-002. It is declared optional and returning `unknown`
   * so that (a) a Postgres adapter may simply not have it, and (b) BRG-003 can
   * assert that nothing in the promise depends on it. It is deliberately *not*
   * typed to a SQLite database: a caller that wants the handle has to say so
   * with a cast, in the open.
   *
   * BRG-001 §3.3 sketched this as a `{ kind: 'sqlite'; db }` property called
   * `nativeHandle`. It is declared here under the name it actually has, because
   * inventing a second name for a method with three live call sites would have
   * been a redesign — rule 1. BRG-002 renames it when it has one caller left.
   */
  getDatabase?(): unknown;
}

// ===========================================================================
// The facade
// ===========================================================================

/**
 * What the rest of the backend actually uses — every HTTP route, the workflow
 * engine, cloud functions, auth, realtime, backup and the admin surface.
 *
 * Two deliberate views of one database (WF-004's wire-protocol decision):
 *
 * - `raw*` — storage-shaped records (pointers as bare objectId strings, dates
 *   as ISO strings). What the BYOB `/api/:table` routes return.
 * - `wire*` — Parse-wire-shaped: schema-typed columns serialized to the
 *   `{__type: …}` envelopes the four runtime clients deserialize, and
 *   `include=` expanding pointers into embedded records exactly as Parse does.
 *
 * **An adapter is not free to collapse those two into one.** Every data node on
 * the canvas receives the `wire*` shape, so a difference there is a visibly
 * broken app, and BRG-003 §3.2 gates it.
 *
 * ✅ **Every member returns a Promise** (BRG-002). Five of them did not when the
 * interface was first transcribed — `getColumns`, `transaction`,
 * `ensureImportShape`, `existsSync`, `upsertSync` — and that was the single
 * structural blocker in the whole phase: a synchronous call cannot be served
 * over a socket at any cost, by any adapter. It is closed.
 */
export interface IStorageFacade {
  // --- storage-shaped reads and writes -------------------------------------

  /** `AdapterFacade.ts:112`. Subject to the PRD-001 page cap — see `rawQueryAll`. */
  rawQuery(collection: string, options?: StorageQueryOptions): Promise<StorageQueryResult>;
  /**
   * PRD-001 §3.3 — a read that must return the WHOLE table, with the page cap
   * explicitly off.
   *
   * The cap defends request-shaped queries. Backup, export, the orphan sweep,
   * the role and API-key registries and "revoke every session for this user" are
   * not request-shaped: each of them is wrong, silently and sometimes
   * catastrophically, if it stops at a page. A backup that stopped at
   * `defaultLimit` restores cleanly and has lost data.
   *
   * 🔴 It is a **separate method** rather than an option flag on purpose. Two
   * routes build query options out of client-supplied fields, so any flag that
   * turns the cap off is one `{...req.query}` away from being client-settable.
   * A method cannot be reached from a request body, and `rawQueryAll` greps to
   * the complete list of readers that opt out.
   */
  rawQueryAll(collection: string, options?: StorageQueryOptions): Promise<StorageQueryResult>;
  /** BAK-008 full-text search; results carry `_score` and `_snippet`. `AdapterFacade.ts:126`. */
  rawSearch(collection: string, options: StorageSearchOptions): Promise<StorageQueryResult>;
  /** `AdapterFacade.ts:133`. */
  rawFetch(collection: string, objectId: string, acl?: StorageAclOption): Promise<Record<string, unknown>>;
  /** `AdapterFacade.ts:137`. */
  rawCreate(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** `AdapterFacade.ts:141`. */
  rawSave(
    collection: string,
    objectId: string,
    data: Record<string, unknown>,
    acl?: StorageAclOption,
    /** HLT-016 — see {@link StorageSaveCall.expect}. */
    expect?: StorageExpectedValues
  ): Promise<Record<string, unknown>>;
  /** `AdapterFacade.ts:150`. */
  rawDelete(collection: string, objectId: string, acl?: StorageAclOption): Promise<void>;
  /** `AdapterFacade.ts:154`. */
  rawCount(collection: string, where?: Record<string, unknown>, acl?: StorageAclOption): Promise<number>;
  /** `AdapterFacade.ts:158`. */
  rawIncrement(
    collection: string,
    objectId: string,
    properties: Record<string, number>,
    acl?: StorageAclOption
  ): Promise<Record<string, unknown>>;
  /**
   * `AdapterFacade.ts:167`. Served under an ordinary `find` permission here,
   * unlike upstream Parse (`backends.ts:16-23`) — so the ACL argument is the
   * only thing standing between a caller and every row, and BRG-003 §3.2 tests
   * it adversarially.
   */
  rawAggregate(
    collection: string,
    group: Record<string, Record<string, string>>,
    where?: Record<string, unknown>,
    acl?: StorageAclOption
  ): Promise<StorageAggregateResult>;
  /** `AdapterFacade.ts:176`. */
  rawDistinct(
    collection: string,
    property: string,
    where?: Record<string, unknown>,
    acl?: StorageAclOption
  ): Promise<StorageDistinctResult>;

  // --- relations -----------------------------------------------------------

  /** `AdapterFacade.ts:180`. */
  addRelation(collection: string, objectId: string, key: string, targetObjectId: string): Promise<void>;
  /** `AdapterFacade.ts:184`. */
  removeRelation(collection: string, objectId: string, key: string, targetObjectId: string): Promise<void>;

  // --- Parse-wire reads ----------------------------------------------------

  /** `AdapterFacade.ts:290`. */
  wireQuery(collection: string, options: StorageQueryOptions): Promise<StorageQueryResult>;
  /** `AdapterFacade.ts:302`. */
  wireFetch(
    collection: string,
    objectId: string,
    include?: string[] | string,
    acl?: StorageAclOption
  ): Promise<Record<string, unknown>>;
  /** `AdapterFacade.ts:319`. */
  wireSearch(collection: string, options: StorageSearchOptions): Promise<StorageQueryResult>;
  /** Session/user responses (login, `/users/me`), protected fields stripped. `AdapterFacade.ts:339`. */
  wireRecord(collection: string, record: Record<string, unknown>): Promise<Record<string, unknown>>;

  // --- schema --------------------------------------------------------------

  /**
   * NOTE the non-optional return. The adapter can genuinely be running without
   * a schema manager (readers guard with `&&`), so `| undefined` would be the
   * more truthful type — but every route treats it as present. Recorded in
   * PLAT-004-NOTES §14 as a finding rather than changed here, and unchanged by
   * BRG-001 for the same reason: this is a transcription.
   *
   * `AdapterFacade.ts:200`.
   */
  readonly schemaManager: IStorageSchema;

  // --- import support (BAK-007) — de-synchronised by BRG-002 ---------------
  //
  // ✅ **Every member of this interface now returns a Promise**, which is what
  // makes it implementable by an adapter that is not in this process. Before
  // BRG-002 five of them were synchronous, and that was the one STRUCTURAL
  // blocker in phase 97: a synchronous call cannot be served over a socket at
  // any cost, by any adapter.
  //
  // The shape that removed it is the batch. `transaction(fn)` could not survive
  // — a caller cannot hold a synchronous SQLite transaction open across an
  // `await` — so the transaction moved INSIDE `upsertBatch`, which owns the
  // all-or-nothing guarantee the import path needs and exposes one awaitable
  // call instead of a sync callback wrapping N sync writes.

  /** Schema column descriptors ([] when the table is unknown). `AdapterFacade.ts`. */
  getColumns(collection: string): Promise<StorageImportColumn[]>;

  /**
   * Which of these objectIds already exist — one call, not one per id.
   *
   * Replaces the per-row `existsSync`, whose only caller classified an import
   * as created-vs-updated in a loop (`backup/dataio.ts`). N round trips became
   * one, which matters far more to an out-of-process adapter than it does to
   * SQLite — see BRG-002 §4 AC3 for the measurement, which is the honest one.
   */
  existingIds(collection: string, objectIds: string[]): Promise<Set<string>>;

  /** Ensure the table and a column for every data key exists (idempotent). */
  ensureImportShape(
    collection: string,
    columns: StorageImportColumn[],
    sampleData: Record<string, unknown>
  ): Promise<void>;

  /**
   * Insert-or-update every row in ONE transaction: all of them, or none.
   *
   * 🔴 The all-or-nothing guarantee is part of the contract, not an
   * implementation detail — `backup/dataio.ts` reports `applied: false` and
   * "import rolled back (no rows written)" on a throw, and a half-written
   * import would make that report a lie. BRG-003 gates the rollback.
   */
  upsertBatch(
    collection: string,
    rows: { objectId?: string; data: Record<string, unknown> }[]
  ): Promise<{ created: number; updated: number }>;
}
