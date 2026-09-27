/**
 * The PostgreSQL adapter module — BRG-005.
 *
 * Consumed by `nodegx-backend/src/persistence/createAdapter.ts` through the
 * package's public subpath, exactly as `local-sql` is. Everything the backend
 * needs to open, describe and close a PostgreSQL-backed storage lives behind
 * these names.
 *
 * @module adapters/postgres
 */

export { PostgresAdapter, PostgresConnectionError, POSTGRES_ENGINE_NAME, type PostgresAdapterOptions } from './PostgresAdapter';
export { PgSchemaManager, SchemaQueueError, META_DDL } from './PgSchemaManager';
export {
  PgConnectionPool,
  connectionBudget,
  CONNECTION_HEADROOM,
  DEFAULT_DATA_POOL_MAX,
  DEFAULT_OPERATIONAL_POOL_MAX,
  type PgPoolSaturation
} from './pool';
export { parseStorageUrl, StorageUrlError, type ParsedStorageUrl } from './storageUrl';
export { POSTGRES_DIVERGENCES, POSTGRES_CONFORMANCE_DECLARATION } from './divergences';

/**
 * The DDL generator, and the two vocabulary constants a caller needs to read
 * what it emits. Exported here because the **migrator** (BRG-004's schema
 * phase) is the second caller of the same generator: a table it creates and a
 * table this adapter creates on first write have to be the same table, and the
 * only way to hold that is for both to emit from this function
 * ([[ddl]]'s module note).
 */
export { tableDDL, junctionDDL, declaredIndexDDL, relationJunctions, columnToPostgres } from './ddl';
export { POSTGRES_TYPE_MAP, SYSTEM_COLUMNS } from '../local-sql/schemaCommon';
