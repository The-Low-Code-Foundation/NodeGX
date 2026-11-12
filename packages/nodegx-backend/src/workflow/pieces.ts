/**
 * P132 BWF-013 (R6): a reusable piece is a workflow others run.
 *
 * A piece is an ordinary workflow, usually one no trigger starts. Another workflow runs it with a `run-workflow` step
 * (`{ workflow: '<id>', send: { <name>: value } }`): the piece runs as its own recorded run, `send` arriving as its
 * `body`, and the step's output is `{ result, run }`, `result` being what the piece answers (its `return`, or its last
 * step's output) and `run` the piece's own run id.
 *
 * The rules here are pure, so the registry (at write time), the executor (at run time) and the tests share them:
 * - a ring (A runs B runs A, or A runs itself) is refused when a workflow is saved, naming the ring;
 * - a run deeper than MAX_PIECE_DEPTH is refused when it would start: the second guard, for a ring that reached the
 *   disk some other way (a hand-edited file, a restore).
 *
 * A piece that does not exist YET is not refused at write time: a project's file is seeded workflow by workflow in
 * its own order, and an agent may write the workflow before the piece. It is a warning there and a step failure,
 * naming it, if it runs.
 *
 * @module nodegx-backend/workflow/pieces
 */
import type { WorkflowDefinition, WorkflowStep } from './types';

/** How many pieces deep a run may go (a runs b runs c … counts each run once). */
export const MAX_PIECE_DEPTH = 8;

/** The piece a `run-workflow` step names, when it names one by a plain id (not a value read from the run). */
export function pieceOf(step: WorkflowStep): string | null {
  if (step.kind !== 'run-workflow' || !step.params) return null;
  const w = step.params.workflow;
  return typeof w === 'string' && w ? w : null;
}

/** The pieces a workflow runs, each once, in step order. */
export function piecesRunBy(def: Pick<WorkflowDefinition, 'steps'>): string[] {
  const out: string[] = [];
  for (const s of def.steps || []) {
    const p = pieceOf(s);
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

/** The workflows (by id, each once, in their order) with a step that runs `id`. */
export function runnersOf(all: Iterable<Pick<WorkflowDefinition, 'id' | 'steps'>>, id: string): string[] {
  const out: string[] = [];
  for (const w of all) if (w.id !== id && piecesRunBy(w).includes(id)) out.push(w.id);
  return out;
}

/**
 * The names a workflow reads from what it was given (`body.<name>` anywhere in its steps' settings), each once, in
 * step order: what a piece asks to be sent. Studio's `automations.mjs bodyNames` and the editor's `workflowPieces.ts`
 * say the same: change all three or none.
 */
export function bodyNames(def: Pick<WorkflowDefinition, 'steps'> | null | undefined): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (typeof o.$path === 'string') {
      const [root, name] = o.$path.split('.');
      if (root === 'body' && name && !out.includes(name)) out.push(name);
      return;
    }
    if ('$literal' in o) return;
    Object.values(o).forEach(walk);
  };
  for (const s of def?.steps || []) walk(s.params);
  return out;
}

/**
 * The ring `def` would close if saved beside `others` (by id; `def` replaces its own old version): the ids in order
 * from `def` back to `def` (`['a', 'b', 'a']`), or null when there is none.
 */
export function ringThrough(def: Pick<WorkflowDefinition, 'id' | 'steps'>, others: Iterable<Pick<WorkflowDefinition, 'id' | 'steps'>>): string[] | null {
  const runs = new Map<string, string[]>();
  for (const o of others) if (o.id !== def.id) runs.set(o.id, piecesRunBy(o));
  runs.set(def.id, piecesRunBy(def));
  // depth-first from def, the path kept: the first way back to def is the ring
  const path: string[] = [def.id];
  const seen = new Set<string>();
  const walk = (id: string): string[] | null => {
    for (const next of runs.get(id) || []) {
      if (next === def.id) return [...path, next];
      if (seen.has(next)) continue;
      seen.add(next);
      path.push(next);
      const found = walk(next);
      if (found) return found;
      path.pop();
    }
    return null;
  };
  return walk(def.id);
}

/** The words for a ring: "a runs b, which runs a". */
export function ringWords(ring: string[], nameOf: (id: string) => string = (id) => `"${id}"`): string {
  if (ring.length === 2) return `${nameOf(ring[0])} runs itself`;
  return ring
    .slice(0, -1)
    .map((id, i) => (i === 0 ? `${nameOf(id)} runs ${nameOf(ring[1])}` : i < ring.length - 2 ? `which runs ${nameOf(ring[i + 1])}` : `which runs ${nameOf(ring[i + 1])} again`))
    .join(', ');
}

/** The write-time check: a ring through this workflow, refused with both (all) names. */
export function validatePieceUses(def: WorkflowDefinition, all: Iterable<WorkflowDefinition>): string[] {
  const ring = ringThrough(def, all);
  if (!ring) return [];
  return [
    `This would make a ring: ${ringWords(ring)}. A workflow cannot run itself, directly or through another, because ` +
      'the run would never end. Run the shared steps from both instead, or move them into a piece neither of them is.'
  ];
}
