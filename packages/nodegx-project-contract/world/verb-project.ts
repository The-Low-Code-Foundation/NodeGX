/**
 * P116 ONT-006 — a verb projected: the workflow definition the engine runs, the functions the
 * agent owes it, the claims that grade each row of it on records, and the words a person reads.
 *
 * The projection is a function of the verb and the world, never written by hand (README §3.2):
 * a step is a `call-function` step whose function is named after the verb and the step; a
 * `keep` is a `transform` that notes what stays; a failure arm is the step the error edge leads
 * to — a `transform` that records the arm in the person's words and goes on past the steps it
 * skips, or a `stop` that halts the run with those words. The engine records every step it ran
 * and every step it skipped, so a run says which arm was taken and why (BMG-009's Runs page).
 */
import { VERB_NODES, stepKind, stepNode, validateVerbs, verbSubjects, type OutsideStep } from './verbs';
import type { Verb, VerbDoes, VerbStep, WorldFiles } from './files';
import { collectionName, fieldName, projectWorld, type ClaimData, type ClaimStep, type ClaimValue, type WorldClaim, type WorldCollection, type WorldColumn, type WorldSchema } from './project';

// ------------------------------------------------------------------- the workflow --

/** One step of the projected definition: `nodegx-backend/src/workflow/types.ts` `WorkflowStep`, restated. */
export interface VerbWorkflowStep {
  id: string;
  name: string;
  kind: string;
  ref?: string;
  params?: Record<string, unknown>;
  next?: string[];
  onError?: string[];
}

/** The definition as the admin workflow route takes it (`WorkflowInput`): the registry owns the timestamps. */
export interface VerbWorkflow {
  version: 1;
  id: string;
  name: string;
  entry: string;
  concurrency: 1;
  steps: VerbWorkflowStep[];
}

/** A cloud function the verb calls and the agent writes: the component at `/#__cloud__/<ref>`. */
export interface VerbFunction {
  ref: string;
  step: string;
  says: string;
  does: VerbDoes;
  /** The specced node that does the work inside it. */
  node: string;
  on?: string;
  /** The collection `on` projects to. */
  collection?: string;
  fields?: string[];
  /** `end`: the field it sets. */
  by?: string;
  system?: string;
}

export interface VerbProjection {
  workflow: VerbWorkflow;
  functions: VerbFunction[];
  outside: OutsideStep[];
}

export type VerbProjectionResult = ({ ok: true } & VerbProjection) | { ok: false; problems: string[] };

/** The function a step calls, named after the verb and the step: `enrol-person-here` → `/#__cloud__/enrol-person-here`. */
export const functionRef = (verb: Pick<Verb, 'id'>, step: Pick<VerbStep, 'id'>): string => `${verb.id}-${step.id}`;

/** The field an `end` step sets: what the step says, or what the kind projects (`endedAt`, `until`). */
export function endField(step: VerbStep, world: Pick<WorldFiles, 'nouns' | 'relations'>): string | undefined {
  if (step.by) return fieldName(step.by);
  return step.on ? verbSubjects(world).get(step.on)?.endField : undefined;
}

/**
 * A verb as a workflow definition, with the functions it calls. Refused with the validator's
 * words when the verb does not bind.
 */
export function projectVerb(verb: Verb, world: WorldFiles): VerbProjectionResult {
  const verdict = validateVerbs({ verbs: [verb] }, world);
  if (!verdict.ok) return { ok: false, problems: verdict.problems.map((p) => p.message) };
  const subjects = verbSubjects(world);
  const steps: VerbWorkflowStep[] = [];
  const functions: VerbFunction[] = [];
  verb.steps.forEach((s, i) => {
    const nextId = verb.steps[i + 1]?.id;
    const ws: VerbWorkflowStep = { id: s.id, name: s.says, kind: stepKind(s) };
    if (s.does === 'keep') {
      ws.params = { output: { kept: s.on, says: s.says } };
    } else {
      ws.ref = functionRef(verb, s);
      const subject = s.on ? subjects.get(s.on) : undefined;
      functions.push({
        ref: ws.ref,
        step: s.id,
        says: s.says,
        does: s.does,
        node: stepNode(s)!,
        ...(s.on ? { on: s.on } : {}),
        ...(subject ? { collection: collectionName(s.on!) } : {}),
        ...(s.fields ? { fields: s.fields.map(fieldName) } : {}),
        ...(s.does === 'end' ? { by: endField(s, world) } : {}),
        ...(s.system ? { system: s.system } : {})
      });
    }
    if (nextId) ws.next = [nextId];
    const arm = s.fails?.[0];
    if (!arm) {
      steps.push(ws);
      return;
    }
    ws.onError = [arm.id];
    steps.push(ws);
    if (arm.then === 'record-and-go-on') {
      const after = verb.steps[i + 1 + (arm.skips?.length ?? 0)]?.id;
      steps.push({
        id: arm.id,
        name: arm.when,
        kind: 'transform',
        params: { output: { arm: arm.id, step: s.id, when: arm.when, sees: arm.sees, error: { $path: 'previous.error.message' } } },
        ...(after ? { next: [after] } : {})
      });
    } else {
      steps.push({ id: arm.id, name: arm.when, kind: 'stop', params: { message: `${arm.when}: ${arm.sees}`, isError: true } });
    }
  });
  return { ok: true, workflow: { version: 1, id: verb.id, name: verb.name, entry: verb.steps[0].id, concurrency: 1, steps }, functions, outside: verdict.outside };
}

// --------------------------------------------------------------------- the claims --

const lower = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
const a = (word: string): string => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;

/** Makes the rows a step's claim needs, as ONT-003's seeder does: every required field a value that fits, links made first. */
class Rows {
  private k = 0;
  readonly steps: ClaimStep[] = [];
  constructor(private readonly schema: WorldSchema) {}
  collection(name: string): WorldCollection {
    const c = this.schema.collections.find((x) => x.name === name);
    if (!c) throw new Error(`no collection ${name}`);
    return c;
  }
  private choices(c: WorldCollection, col: WorldColumn): string[] | undefined {
    return c.checks.find((k) => k.field === col.name)?.oneOf;
  }
  value(c: WorldCollection, col: WorldColumn): ClaimValue | undefined {
    const k = ++this.k;
    const choices = this.choices(c, col);
    if (choices?.length) return choices[0];
    if (col.type === 'String') return `${col.name}-${k}`;
    if (col.type === 'Number') return k;
    if (col.type === 'Boolean') return true;
    if (col.type === 'Date') return { date: `2026-01-${String(1 + (k % 28)).padStart(2, '0')}T00:00:00.000Z` };
    if (col.type === 'Pointer' && col.targetClass && col.targetClass !== '_User') return { ref: this.make(col.targetClass) };
    return undefined;
  }
  /** A fresh value for a field the step writes, different from what a seeded row holds. */
  changed(c: WorldCollection, col: WorldColumn): ClaimValue | undefined {
    const choices = this.choices(c, col);
    if (choices?.length) return choices[choices.length - 1];
    if (col.type === 'String') return `${col.name}-changed`;
    if (col.type === 'Number') return 2;
    if (col.type === 'Boolean') return false;
    if (col.type === 'Date') return { date: '2026-03-01T00:00:00.000Z' };
    return undefined;
  }
  make(collection: string, as?: string): string {
    const c = this.collection(collection);
    const data: ClaimData = {};
    for (const col of c.columns) {
      if (!col.required) continue;
      const v = this.value(c, col);
      if (v !== undefined) data[col.name] = v;
    }
    const name = as ?? `${lower(collection)}${++this.k}`;
    this.steps.push({ make: collection, as: name, data });
    return name;
  }
}

export type VerbClaimsResult = { ok: true; claims: WorldClaim[] } | { ok: false; problems: string[] };

/**
 * A claim per row of the verb that touches records (`make`, `update`, `end`, `remove`, `keep`),
 * in ONT-003's shape, so `runClaim` grades it on any engine. An `ask` has no record claim: its
 * grade is the request it makes and the arm it takes, in the world (NSP-014) and in the engine.
 *
 * A `keep` is labelled not held: "their record stays" is what the store does not keep — who may
 * delete a record is its collection's permissions (BMG-006), not the schema — and the claim
 * measures that, as ONT-003's not-held claims do.
 */
export function verbClaims(verb: Verb, world: WorldFiles): VerbClaimsResult {
  const verdict = validateVerbs({ verbs: [verb] }, world);
  if (!verdict.ok) return { ok: false, problems: verdict.problems.map((p) => p.message) };
  const projected = projectWorld(world);
  if (projected.ok === false) return { ok: false, problems: projected.problems };
  const subjects = verbSubjects(world);
  const claims: WorldClaim[] = [];
  for (const s of verb.steps) {
    const subject = s.on ? subjects.get(s.on) : undefined;
    if (!subject || s.does === 'ask') continue;
    const C = collectionName(s.on!);
    const rows = new Rows(projected.schema);
    const c = rows.collection(C);
    const from: WorldClaim['from'] = subject.kind === 'noun' ? { noun: s.on! } : { relation: s.on! };
    const id = `${verb.id}/${s.id}`;
    const it = rows.make(C, 'it');
    if (s.does === 'make') {
      claims.push({ id, says: `${s.says}: ${a(s.on!)} can be made`, from, held: true, steps: rows.steps });
    } else if (s.does === 'update') {
      const data: ClaimData = {};
      for (const f of s.fields || []) {
        const col = c.columns.find((x) => x.name === fieldName(f));
        const v = col && rows.changed(c, col);
        if (col && v !== undefined) data[col.name] = v;
      }
      const holds: ClaimStep[] = Object.entries(data).map(([field, value]) => ({ holds: C, row: it, field, value }));
      claims.push({ id, says: `${s.says}: ${a(s.on!)}'s ${(s.fields || []).join(', ')} can be changed`, from, held: true, steps: [...rows.steps, { change: C, row: it, data }, ...holds] });
    } else if (s.does === 'end') {
      const field = endField(s, world)!;
      const when: ClaimValue = { date: '2026-03-01T00:00:00.000Z' };
      claims.push({
        id,
        says: `${s.says}: ${a(s.on!)} ends — its ${field} is set, and the record stays`,
        from,
        held: true,
        steps: [...rows.steps, { change: C, row: it, data: { [field]: when } }, { holds: C, row: it, field, value: when }, { there: C, row: it }]
      });
    } else if (s.does === 'remove') {
      claims.push({ id, says: `${s.says}: ${a(s.on!)} can be removed`, from, held: true, steps: [...rows.steps, { remove: C, row: it }, { gone: C, row: it }] });
    } else if (s.does === 'keep') {
      claims.push({
        id,
        says: `${s.says}: nobody removes ${a(s.on!)} — not kept by the store; who may delete is the collection's permissions`,
        from,
        held: false,
        steps: [...rows.steps, { remove: C, row: it, refused: true }]
      });
    }
  }
  return { ok: true, claims };
}

// ---------------------------------------------------------------------- the words --

const label = (node: string | undefined): string => (node && VERB_NODES[node] ? VERB_NODES[node].label : node ?? '');

/** The verb as a person reads it: the sentence, where it runs, each step with what does it, each arm. */
export function verbWords(verb: Verb, world: WorldFiles): string[] {
  const out = [`${verb.name}: “${verb.sentence}”`];
  if (verb.when) out.push(`When ${verb.when}.`);
  out.push(`Runs ${verb.runs === 'server' ? 'on the server' : 'in the app'}.`);
  verb.steps.forEach((s, i) => {
    const node = label(stepNode(s));
    const what =
      s.does === 'make'
        ? `makes ${a(s.on!)} (${node})`
        : s.does === 'update'
          ? `changes ${a(s.on!)}'s ${(s.fields || []).join(', ')} (${node})`
          : s.does === 'end'
            ? `ends ${a(s.on!)}: its ${endField(s, world) ?? '?'} is set (${node})`
            : s.does === 'remove'
              ? `removes ${a(s.on!)} (${node})`
              : s.does === 'keep'
                ? `${a(s.on!)} stays; nothing is done`
                : `asks ${s.system} (${node})`;
    out.push(`${i + 1}. ${s.says.charAt(0).toUpperCase()}${s.says.slice(1)} — ${what}.`);
    for (const arm of s.fails || []) {
      const then = arm.then === 'stop' ? 'the verb stops there' : `it is recorded and the verb goes on${arm.skips?.length ? `, without ${arm.skips.join(', ')}` : ''}`;
      out.push(`   If ${arm.when}: ${then}. You see: “${arm.sees}”.`);
    }
    if (!s.fails?.length && s.does !== 'keep') out.push(`   If it cannot be done: the verb stops there and says which step, and why.`);
  });
  const outside = verb.steps.filter((s) => {
    const n = stepNode(s);
    return n && VERB_NODES[n] && !VERB_NODES[n].specced;
  });
  if (outside.length) out.push(`Outside: ${outside.length} ${outside.length === 1 ? 'step binds' : 'steps bind'} to a node specced nowhere yet (${outside.map((s) => `${s.id}: ${label(stepNode(s))}`).join('; ')}).`);
  return out;
}
