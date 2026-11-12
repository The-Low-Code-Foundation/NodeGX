/**
 * P132 BWF-013 (R6): a reusable piece is a workflow others run, with a `run-workflow` step
 * (`{ workflow: '<id>', send: { <name>: value } }`), `send` arriving in the piece as `body.<name>`.
 *
 * The rules the editor draws a Run a workflow step with, PORTED from Studio's `editor/automations.mjs` (`pieceOf`,
 * `piecesIn`, `wouldRing`, `bodyNames`, `stepTitle`), the way `workflowSources.ts` ports BWF-003's reads: Studio's
 * page imports only its own files, so a shared module would need a kit release. Change both or neither.
 *
 * Pure, and it imports nothing but types: the document, the property panel and the specs share it.
 *
 * @module models/workflow/workflowPieces
 */

import type { WorkflowDefinition, WorkflowStep } from './types';

export const PIECE_KIND = 'run-workflow';

type StepLike = Pick<WorkflowStep, 'kind'> & { params?: Record<string, unknown> };
type WorkflowLike = Pick<WorkflowDefinition, 'id' | 'name'> & { steps?: StepLike[] };
type TriggerLike = { target?: { kind?: string; name?: string } };

/** The piece a step runs, by a plain id, or null (the engine's `pieceOf`). */
export function pieceOf(step: StepLike | null | undefined): string | null {
  const w = step?.kind === PIECE_KIND ? step.params?.workflow : undefined;
  return typeof w === 'string' && w ? w : null;
}

/** The ids of the workflows no trigger starts (a trigger starting a function starts no workflow). */
export function pieceIds(workflows: WorkflowLike[], triggers: TriggerLike[]): Set<string> {
  const started = new Set(triggers.filter((t) => t.target?.kind === 'workflow').map((t) => t.target?.name));
  return new Set(workflows.filter((w) => !started.has(w.id)).map((w) => w.id));
}

/** True when a step in `fromId` running `toId` would close a ring: `toId` is `fromId`, or runs it, directly or through others. */
export function wouldRing(workflows: WorkflowLike[], fromId: string, toId: string): boolean {
  const runs = new Map(workflows.map((w) => [w.id, (w.steps || []).map(pieceOf).filter(Boolean) as string[]]));
  const seen = new Set<string>();
  const queue = [toId];
  while (queue.length) {
    const id = queue.shift() as string;
    if (id === fromId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(runs.get(id) || []));
  }
  return false;
}

/** The names a workflow reads from what it was given (`body.<name>` anywhere in its steps' settings), each once: what a piece asks for. */
export function bodyNames(workflow: WorkflowLike | null | undefined): string[] {
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
  for (const s of workflow?.steps || []) walk(s.params);
  return out;
}

/** The workflows (by id, each once, in order) with a step that runs `id`. */
export function runnersOf(workflows: WorkflowLike[], id: string): string[] {
  return workflows.filter((w) => (w.steps || []).some((s) => pieceOf(s) === id)).map((w) => w.id);
}

/** An unnamed Run a workflow step's title, as Studio's card says it: "Run <piece>". `null` when it names no piece yet. */
export function runTitle(pieceId: string | null, nameOf: (id: string) => string | undefined): string | null {
  return pieceId ? `Run ${nameOf(pieceId) || pieceId}` : null;
}

export interface PieceOption {
  id: string;
  name: string;
  /** Running it from here would close a ring: shown, not offered. */
  ring: boolean;
}

export interface PieceChoices {
  /** The id the step names now ('' for none). */
  value: string;
  /** Whether that id is a workflow on this backend. */
  there: boolean;
  /** Pieces first, then the workflows something starts; the workflow being edited is in neither. */
  groups: { label: string; options: PieceOption[] }[];
}

/**
 * What the Workflow row offers a Run a workflow step in `fromId`: Studio's `pieceField`. A workflow that runs this
 * one (a ring) is listed with its reason, disabled unless it is what the step already names (the backend refused that
 * save, so it can only come from a hand-edited file: shown as it is).
 */
export function pieceChoices(workflows: WorkflowLike[], triggers: TriggerLike[], fromId: string, value: unknown): PieceChoices {
  const v = typeof value === 'string' ? value : '';
  const all = workflows.filter((w) => w.id !== fromId);
  const pieces = pieceIds(workflows, triggers);
  const option = (w: WorkflowLike): PieceOption => ({ id: w.id, name: w.name || w.id, ring: wouldRing(workflows, fromId, w.id) });
  const groups = [
    { label: 'Reusable pieces', options: all.filter((w) => pieces.has(w.id)).map(option) },
    { label: 'Workflows something starts', options: all.filter((w) => !pieces.has(w.id)).map(option) }
  ].filter((g) => g.options.length > 0);
  return { value: v, there: !!v && all.some((w) => w.id === v), groups };
}

/** True for a `send` the named-values rows can draw: nothing yet, or a plain object of names (not a `$path`, `$fn`, `$literal`). */
export function isNamedValues(v: unknown): v is Record<string, unknown> | undefined {
  if (v === undefined) return true;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return !Object.keys(v).some((k) => k.startsWith('$'));
}

/** What the named-values rows say, by what they are: a piece's `send`, a call's headers, a call's query. */
export interface NamedValuesWords {
  /** One row's noun, for the labels: "value" → "Value 1 name". */
  noun: string;
  add: string;
  empty: string;
  /** The hint once there are rows. */
  filled: (first: string) => string;
  /** Why a name is needed. */
  needsName: string;
}

/** The words for named values, by the step and param they belong to. */
export function namedValuesWords(kind: string | undefined, param: string, piece: string, asks: string[] = []): NamedValuesWords {
  if (kind === PIECE_KIND) {
    return {
      noun: 'value',
      add: '+ a value',
      // s19: it said "reads nothing" beside a "+ plant" for a piece that reads body.plant.
      empty: asks.length
        ? `${piece} reads ${asks.join(', ')} from what it is given: press + ${asks[0]} to send it.`
        : `${piece} reads nothing it is given yet. Add a value to send one: the piece reads it as body.<name>.`,
      filled: (first) => `${piece} reads each value as body.<name>: this one as body.${first}.`,
      needsName: 'A value needs a name: it is what the piece reads it as (body.<name>).'
    };
  }
  if (param === 'headers') {
    return {
      noun: 'header',
      add: '+ header',
      empty: 'No headers of your own. A key never goes here: use Authentication.',
      filled: () => 'Sent as the request’s headers. A key never goes here: use Authentication.',
      needsName: 'A header needs a name.'
    };
  }
  return {
    noun: 'value',
    add: '+ a value',
    empty: 'Nothing is added to the address. Add a value to send it as ?name=value.',
    filled: (first) => `Added to the address as ?${first}=….`,
    needsName: 'A value needs a name: it is what the address calls it.'
  };
}
