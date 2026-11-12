/**
 * What a step can read, as field trees (P132 BWF-008 item 3, BWF-003's model).
 *
 * A step reads what started the workflow (`body`), how (`trigger`), and `upstream.<id>` of every step with a path to
 * it over `next`, routes and `onError`: the backend's own rule (`WorkflowEngine.ancestorsOf`), the same set
 * `workflowScope.upstreamSteps` computes over the canvas. Each source's fields are the newest run's, else the test's
 * sample, else the shape: the trigger's table, a function's Response, a transform's own output, the catalog's words
 * for the kind.
 *
 * PORTED from NodeGX Studio's `editor/automations.mjs` (`upstreamOf`, `shapeFields`, `startWords`, `readSources`,
 * `itemSources`, `pathWords`), not shared with it: Studio's page imports only its own modules, so a shared one would
 * have to ship through the kit and a release. The two copies answer one question; change both or neither. The spec
 * (`tests-unit/workflow/p132-bwf008-sources.test.ts`) pins the cases Studio's `check:automations` pins.
 *
 * @module models/workflow/workflowSources
 */

import type { TriggerDef } from '../triggers/TriggerBackendClient';
import type { StepKindSpec, WorkflowStep } from './types';

/** Where a source's fields came from. A shape's leaves are all `null`: names, no values. */
export type SourceFrom = 'run' | 'sample' | 'shape';

export interface ReadSource {
  /** The path's first part(s): `body`, `trigger`, `upstream.<id>`, or a list step's `item` / `index`. */
  root: string;
  /** The source in words: "the Watering that was made", "how it started", a step's title. */
  words: string;
  from: SourceFrom;
  value: unknown;
  /** Said where there are no fields to show. */
  note?: string;
  /** The step this source is the output of. */
  step?: string;
  /** Picked whole (a position): no fields under it. */
  leaf?: boolean;
}

/** One step's record in a run, by step id (`stepsOfRun`). */
export interface RunStep {
  status?: string;
  input?: unknown;
  output?: unknown;
  index?: number;
}

export interface SourceHave {
  /** The newest run's steps by id, or null. */
  run?: Map<string, RunStep> | null;
  /** The workflow's test sample (`.nodegx/workflow-samples.json`), or null. */
  sample?: { body?: Record<string, unknown> } | null;
  /** The triggers that start this workflow. */
  starts?: TriggerDef[];
  /** A table's column names, or null when they are not known. */
  columns?: (table: string) => string[] | null;
  /** The catalog's entry for a kind. */
  kind?: (kind: string) => StepKindSpec | undefined;
  /** The names a function step's function answers with, or null when not read. */
  answers?: (step: WorkflowStep) => string[] | null;
}

interface Wire {
  to: string;
}

const CHANGE_WORDS: Record<string, string> = { create: 'made', update: 'changed', delete: 'deleted' };

/** Every wire out of a step: `next`, each route, `onError`. */
function stepWires(step: WorkflowStep): Wire[] {
  const out: Wire[] = [];
  for (const to of step.next ?? []) out.push({ to });
  for (const list of Object.values(step.routes ?? {})) for (const to of list ?? []) out.push({ to });
  for (const to of step.onError ?? []) out.push({ to });
  return out;
}

/** The steps that can have run before `id`, in the definition's order (never `id` itself). */
export function upstreamOf(steps: WorkflowStep[], id: string): WorkflowStep[] {
  const into = new Map<string, string[]>();
  for (const s of steps) {
    for (const w of stepWires(s)) {
      if (!into.has(w.to)) into.set(w.to, []);
      into.get(w.to)!.push(s.id);
    }
  }
  const seen = new Set<string>();
  const stack = [...(into.get(id) ?? [])];
  while (stack.length) {
    const x = stack.pop() as string;
    if (x === id || seen.has(x)) continue;
    seen.add(x);
    stack.push(...(into.get(x) ?? []));
  }
  return steps.filter((s) => seen.has(s.id));
}

/** The names a catalog `output` gives, from its first `` `{ … }` `` ("`{ result: boolean, isfalse: boolean }` — …"). */
export function shapeFields(prose: unknown): string[] {
  const m = /`\{([^`]*)\}`/.exec(String(prose ?? ''));
  if (!m) return [];
  const out: string[] = [];
  let depth = 0;
  let part = '';
  for (const ch of `${m[1]},`) {
    if ('{[('.includes(ch)) depth++;
    else if ('}])'.includes(ch)) depth--;
    if (ch !== ',' || depth > 0) {
      part += ch;
      continue;
    }
    const name = /^\s*([A-Za-z_$][\w$]*)\s*(:|$)/.exec(part)?.[1];
    if (name) out.push(name);
    part = '';
  }
  return out;
}

const blank = (names: string[]) => Object.fromEntries(names.map((n) => [n, null]));
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function dig(v: unknown, path: string[]): unknown {
  return path.reduce<unknown>((x, k) => (x != null && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined), v);
}

/** What started the workflow, in words: "the Watering that was made", "the call that started it". */
export function startWords(starts: TriggerDef[] = []): string {
  const t = starts[0];
  if (t?.type === 'db-change') {
    const actions = (t.dbChange?.actions?.length ? t.dbChange.actions : ['create']) as string[];
    return `the ${t.dbChange?.collection ?? 'row'} that was ${actions.map((a) => CHANGE_WORDS[a] ?? a).join(' or ')}`;
  }
  if (t?.type === 'webhook') return 'the call that started it';
  if (t?.type === 'schedule') return 'the schedule that started it';
  return 'what it was given';
}

/** Who may read a row is not a value to use. */
function row(v: unknown): unknown {
  return isObject(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'ACL')) : v;
}

/** A step's title in words: its name, else its kind's, else its id. */
function titleOf(s: WorkflowStep, have: SourceHave): string {
  return s.name || have.kind?.(s.kind)?.displayName || s.id;
}

/** What step `stepId` can read, a source each, in the order a person reads them: what started it, how, each step before. */
export function readSources(steps: WorkflowStep[], stepId: string, have: SourceHave = {}): ReadSource[] {
  const run = have.run ?? null;
  const starts = have.starts ?? [];
  const sample = have.sample ?? null;
  const ran = [...(run?.values() ?? [])].find((r) => isObject(r.input) && 'body' in r.input);
  const ranInput = ran?.input as { body?: unknown; trigger?: unknown } | undefined;
  const t = starts[0];
  const out: ReadSource[] = [];

  // what started it
  const words = startWords(starts);
  if (ranInput) out.push({ root: 'body', words, from: 'run', value: row(ranInput.body) });
  else if (sample && Object.keys(sample.body ?? {}).length) out.push({ root: 'body', words, from: 'sample', value: row(sample.body) });
  else if (t?.type === 'db-change') {
    const cols = (t.dbChange?.collection && have.columns?.(t.dbChange.collection)) || [];
    out.push({ root: 'body', words, from: 'shape', value: blank(['objectId', ...cols, 'createdAt', 'updatedAt']) });
  } else {
    out.push({
      root: 'body',
      words,
      from: 'shape',
      value: {},
      note:
        t?.type === 'schedule' ? 'A schedule sends nothing unless it is given a payload.' : 'Its fields show once the test has a sample.'
    });
  }

  // how it started
  const how = {
    type: null,
    firedAt: null,
    ...(t?.type === 'db-change'
      ? { collection: null, action: null, recordId: null }
      : t?.type === 'webhook'
        ? { slug: null }
        : t?.type === 'schedule'
          ? { cron: null }
          : {})
  };
  out.push(
    isObject(ranInput?.trigger)
      ? { root: 'trigger', words: 'how it started', from: 'run', value: ranInput!.trigger }
      : { root: 'trigger', words: 'how it started', from: 'shape', value: how }
  );

  // each step upstream of it
  for (const s of upstreamOf(steps, stepId)) {
    const r = run?.get(s.id);
    const title = titleOf(s, have);
    if (r && r.output !== undefined && r.status !== 'error' && r.status !== 'skipped') {
      out.push({ root: `upstream.${s.id}`, words: title, from: 'run', value: r.output, step: s.id });
      continue;
    }
    const fn = s.kind === 'call-function' ? (have.answers?.(s) ?? null) : null;
    const own = s.kind === 'transform' && isObject(s.params?.output) ? Object.keys(s.params!.output as object) : null;
    const value = fn ? { result: blank(fn) } : own ? blank(own) : blank(shapeFields(have.kind?.(s.kind)?.output));
    out.push({ root: `upstream.${s.id}`, words: title, from: 'shape', value, step: s.id });
  }
  return out;
}

/** A param as `{ typed }` or `{ from }` (a `$path`). */
function valueForm(v: unknown): { typed: unknown } | { from: string } {
  return isObject(v) && typeof v.$path === 'string' ? { from: v.$path } : { typed: v };
}

/**
 * Inside a step that goes through a list (a filter, a for-each), what its condition reads per item: the item, its
 * fields from the list's first item in `sources` (readSources'), and its position. `step.params.items` names the list.
 */
export function itemSources(steps: WorkflowStep[], step: WorkflowStep, sources: ReadSource[]): ReadSource[] {
  const p = step.params ?? {};
  const key = typeof p.itemKey === 'string' ? p.itemKey : 'item';
  const at = typeof p.indexKey === 'string' ? p.indexKey : 'index';
  const form = valueForm(p.items === undefined ? { $path: 'previous.items' } : p.items);
  let list: unknown;
  let src: ReadSource | null = null;
  if ('typed' in form) list = form.typed;
  else {
    const [root, ...rest] = form.from.split('.');
    const before = root === 'previous' ? steps.filter((s) => stepWires(s).some((w) => w.to === step.id)) : [];
    const named =
      root === 'previous' ? (before.length === 1 ? `upstream.${before[0].id}` : null) : root === 'upstream' ? `upstream.${rest.shift()}` : root;
    src = sources.find((s) => s.root === named) ?? null;
    list = src ? dig(src.value, rest) : undefined;
  }
  const from: SourceFrom = src ? src.from : 'run';
  const first = Array.isArray(list) ? list[0] : undefined;
  const item: ReadSource =
    first === undefined
      ? {
          root: key,
          words: 'this item',
          from: 'shape',
          value: {},
          note: from === 'shape' || !Array.isArray(list) ? 'Its fields show once the workflow is tested.' : 'The list was empty in the test.'
        }
      : { root: key, words: 'this item', from, value: first };
  return [item, { root: at, words: 'its position', from: item.from, value: 0, leaf: true }];
}

/** A value read from the run, in words: `{ name, from }`, "plant · from the Watering that was made". */
export function pathWords(
  path: string,
  steps: WorkflowStep[],
  starts: TriggerDef[] = [],
  opts: { item?: string; index?: string; kindName?: (kind: string) => string } = {}
): { name: string; from: string; missing?: boolean } {
  const { item = 'item', index = 'index', kindName = (k) => k } = opts;
  const [root, ...rest] = String(path).split('.');
  const seg = (xs: string[], whole = 'all of it') =>
    xs.length ? xs.map((x) => (/^\d+$/.test(x) ? `#${Number(x) + 1}` : x)).join(' › ') : whole;
  if (root === 'body') return { name: seg(rest), from: startWords(starts) };
  if (root === 'trigger') return { name: seg(rest), from: 'how it started' };
  if (root === 'previous') return { name: seg(rest), from: 'the step before' };
  if (root === 'upstream') {
    const s = steps.find((x) => x.id === rest[0]);
    let r = rest.slice(1);
    // A function answers { result: { … } }: its names are what a person knows.
    if (s?.kind === 'call-function' && r[0] === 'result' && r.length > 1) r = r.slice(1);
    return s
      ? { name: seg(r), from: s.name || kindName(s.kind) }
      : { name: seg(r), from: `a step that is not there (${rest[0] ?? ''})`, missing: true };
  }
  if (root === item) return { name: seg(rest, 'this item'), from: 'the list' };
  if (root === index && !rest.length) return { name: 'its position', from: 'the list' };
  return { name: seg([root, ...rest]), from: 'the run' };
}

/** A run's steps by step id, from an execution record (the engine records each step under its id). The last one wins. */
export function stepsOfRun(
  record: { steps?: { nodeId: string; status?: string; stepIndex?: number; inputData?: unknown; outputData?: unknown }[] } | null
): Map<string, RunStep> {
  const out = new Map<string, RunStep>();
  for (const s of [...(record?.steps ?? [])].sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0))) {
    out.set(s.nodeId, { status: s.status, index: s.stepIndex, input: s.inputData, output: s.outputData });
  }
  return out;
}

/** A field line in a source's tree. */
export interface FieldRow {
  /** The full `$path` this line picks. */
  path: string;
  /** Its own name: a field's, or a list item's position ("#1"). */
  name: string;
  depth: number;
  /** "3 fields", "2 items", or the value itself as JSON; null on a shape's leaf (a name, no value). */
  shown: string | null;
  /** Has lines under it. */
  folds: boolean;
}

/**
 * A source's fields as lines, depth first: what the picker draws. A list shows its first three items (Studio's
 * `readTree`), and a pointer (`__type: 'Pointer'`) is a value used whole: its parts are not lines.
 */
export function fieldRows(src: ReadSource, maxDepth = 4): FieldRow[] {
  const real = src.from !== 'shape';
  const out: FieldRow[] = [];
  const walk = (v: unknown, path: string, depth: number) => {
    if (depth > maxDepth || !v || typeof v !== 'object') return;
    const entries: [string, unknown][] = Array.isArray(v)
      ? v.slice(0, 3).map((x, i) => [String(i), x])
      : Object.entries(v as Record<string, unknown>);
    for (const [k, x] of entries) {
      const at = `${path}.${k}`;
      const n = x && typeof x === 'object' ? Object.keys(x).length : 0;
      const pointer = isObject(x) && x.__type === 'Pointer';
      const folds = n > 0 && !pointer;
      const shown = n
        ? Array.isArray(x)
          ? `${n} item${n === 1 ? '' : 's'}`
          : pointer
            ? `a ${String(x.className ?? 'row')}`
            : `${n} field${n === 1 ? '' : 's'}`
        : real
          ? x === undefined
            ? '(nothing)'
            : JSON.stringify(x)
          : null;
      out.push({ path: at, name: Array.isArray(v) ? `#${Number(k) + 1}` : k, depth, shown, folds });
      if (folds) walk(x, at, depth + 1);
    }
  };
  walk(src.value, src.root, 0);
  return out;
}
