/**
 * The migration executor, where the conformance specs have always imported it from.
 *
 * P116 ONT-007. It moved to `src/migration.ts` in s11 (README §9 R9: production runs it — the
 * backend's `POST /admin/world/migrate`), and this module re-exports that one copy so the specs
 * and the route can never run two executors.
 *
 * @module conformance/migration
 */

export { dryRunMigration, runMigration } from '../src/migration';
export type { DryRun, MigrationCheckData, MigrationContext, MigrationMove, MigrationPlanData, MigrationRun, MigrationSchemaBody, MigrationStepData } from '../src/migration';
