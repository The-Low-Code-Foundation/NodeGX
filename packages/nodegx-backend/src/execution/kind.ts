/**
 * What kind of thing a run was (BMG-009).
 *
 * The execution history records four kinds of work in one table — a workflow
 * run, a cloud function run, a backup or restore, and a maintenance sweep —
 * and until BMG-009 nothing said which was which except the shape of
 * `metadata`: the engine stamps `kind: 'workflow'`, the backup manager stamps
 * `operation: 'backup' | 'restore'`, the file sweep `operation:
 * 'file-orphan-sweep'`, and a function run stamped nothing at all.
 *
 * Every writer now stamps `metadata.kind` explicitly, and this is the ONE rule
 * that classifies a record with or without the stamp, so the records written
 * before it existed read the same as the ones written after. The store's
 * `KIND_SQL` (`noodl-viewer-cloud/src/execution-history/store.ts`) is the same
 * rule in SQL, for the filter; `bmg-009-runs.test.ts` holds the two to the
 * same answer over the same records.
 *
 * @module nodegx-backend/execution/kind
 */

/** Mirrors `ExecutionKind` in `noodl-viewer-cloud/src/execution-history/types.ts` (the admin app has no path alias to it). */
export type ExecutionKind = 'workflow' | 'function' | 'backup' | 'maintenance';

/** The kinds, in the order a person picks them. */
export const RUN_KINDS: ReadonlyArray<{ id: ExecutionKind; label: string }> = [
  { id: 'workflow', label: 'workflow' },
  { id: 'function', label: 'function' },
  { id: 'backup', label: 'backup' },
  { id: 'maintenance', label: 'maintenance' }
];

export function isExecutionKind(value: unknown): value is ExecutionKind {
  return RUN_KINDS.some((k) => k.id === value);
}

/** A record's kind, from its metadata. Pure; never reads anything else off the record. */
export function executionKind(metadata: unknown): ExecutionKind {
  const m = (metadata && typeof metadata === 'object' ? metadata : {}) as Record<string, unknown>;
  if (isExecutionKind(m.kind)) return m.kind;
  const operation = m.operation;
  if (operation === 'backup' || operation === 'restore') return 'backup';
  if (operation !== undefined && operation !== null) return 'maintenance';
  return 'function';
}
