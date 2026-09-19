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
export { PgSchemaManager, SchemaQueueError } from './PgSchemaManager';
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
