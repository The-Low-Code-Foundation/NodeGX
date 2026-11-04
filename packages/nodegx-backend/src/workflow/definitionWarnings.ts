/**
 * P132 BWF-001 — what a definition does that is valid but rarely meant, said beside `valid` (a WARNING, never an error:
 * the definition is stored as written).
 *
 *  - A step with `routes` AND a plain `next`. The engine takes `next` whatever the step decided (types.ts `next`:
 *    "always continue here"), so a branch's `next` runs on its No side too. P132-BRANCHNEXT: Studio once wrote one, and
 *    a person reading "Yes: X, No: nothing" could not tell that Y ran on both.
 *  - The entry step reading `previous`: at the entry nothing has run, so `previous` is empty and a condition on it is
 *    always false. The caller's data is under `body`, the trigger's under `trigger`.
 *
 * Pure: the definition in, sentences out. Served by `POST /admin/workflow-defs/validate` and on every create / update
 * answer, so the agent (the MCP passes the answer through) and Studio hear it in the same turn.
 */
import { pieceOf } from './pieces';
import type { WorkflowDefinition, WorkflowStep } from './types';

/** Every `$path` a value reads, however deep it sits. */
function pathsIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) pathsIn(v, out);
  else if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.$path === 'string') out.push(o.$path);
    else if (!('$literal' in o)) for (const v of Object.values(o)) pathsIn(v, out);
  }
  return out;
}

/**
 * `hasWorkflow`: P132 BWF-013, whether this backend has a workflow by that id; given, a `run-workflow` step naming one
 * it does not have is warned of (not refused: the piece may be written next).
 */
export function definitionWarnings(def: Pick<WorkflowDefinition, 'entry' | 'steps'> | null | undefined, hasWorkflow?: (id: string) => boolean): string[] {
  if (!def || !Array.isArray(def.steps)) return [];
  const warnings: string[] = [];
  for (const step of def.steps as WorkflowStep[]) {
    const routes = Object.entries(step.routes ?? {}).filter(([, tos]) => Array.isArray(tos));
    if (routes.length && (step.next ?? []).length) {
      warnings.push(
        `Step "${step.id}" has routes (${routes.map(([r]) => r).join(', ')}) and a plain next (${step.next!.join(', ')}): ` +
          `next runs whatever the step decides, so ${step.next!.join(', ')} runs on every route. ` +
          'To run it on one side only, move it from next into that route (routes.<name>).'
      );
    }
  }
  if (hasWorkflow) {
    for (const step of def.steps as WorkflowStep[]) {
      const piece = pieceOf(step);
      if (piece && !hasWorkflow(piece)) {
        warnings.push(`Step "${step.id}" runs the workflow "${piece}", which this backend does not have yet: write it, or the step fails when it runs.`);
      }
    }
  }
  const entry = (def.steps as WorkflowStep[]).find((s) => s.id === def.entry);
  if (entry) {
    const reads = [...new Set(pathsIn(entry.params).filter((p) => p === 'previous' || p.startsWith('previous.')))];
    if (reads.length) {
      warnings.push(
        `The first step "${entry.id}" reads ${reads.join(', ')}, which is empty at the start of a run (no step has run yet). ` +
          'Read the caller\'s data from body.… or the trigger\'s from trigger.… instead.'
      );
    }
  }
  return warnings;
}
