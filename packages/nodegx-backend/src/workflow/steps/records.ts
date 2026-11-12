/**
 * P132 BWF-005 — steps that act on the data: `create-record`, `update-record`, `delete-record`, `find-records`.
 *
 * Richard's point 5 was that the catalog was plumbing plus *Run a function*: making a row meant authoring a cloud
 * function first. In Bubble's backend workflows the steps ARE the actions, and these four are those actions.
 *
 * ⚠️ THEY WRITE THROUGH THE BACKEND'S OWN DATA ROUTES, ON LOOPBACK
 * ---------------------------------------------------------------
 * A Record node inside a cloud function reaches the database by calling this same server over 127.0.0.1
 * (`_noodl_cloudservices`, service.ts). These steps make the same requests to the same `/classes` routes, so
 * everything those routes do happens here by construction rather than by a second copy: the table's rules and a
 * row's ACL, `stampCreate`, a field's own rules, hooks, and the ChangeBus — a row a step makes fires a db-change
 * trigger exactly as a row a function makes does, and the db-change loop guard (`triggers/dbchange.ts`) covers it.
 *
 * WHO THE STEP ACTS AS (ruling R5)
 * --------------------------------
 * A workflow's *Ignore privacy rules* (`ignorePrivacyRules`, on unless set to `false`). On, the request carries the
 * app's key, as a function's Record node always has. Off, it carries no credential at all: the run is for nobody on
 * every trigger there is today, so the table's rules for a visitor decide, and a refusal says the switch is off.
 *
 * @module nodegx-backend/workflow/steps/records
 */

import type { StepExecContext, StepExecutor, StepExecResult } from '../StepExecutor';
import { StepExecutionError, stepResult } from '../StepExecutor';
import type { WorkflowRunner } from '../WorkflowRunner';
import { isPlainObject, resolveValueDeep } from './values';

/** The operators a *Find records* condition may use: the condition language's names, each one the data routes run. */
export const FIND_OPS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'exists',
  'notExists',
  'contains',
  'startsWith',
  'endsWith'
] as const;
export type FindOp = (typeof FIND_OPS)[number];
const UNARY_FIND_OPS = new Set<FindOp>(['exists', 'notExists']);

/** The most rows one *Find records* step hands on; the default when it names no limit. */
export const FIND_MAX_LIMIT = 1000;
export const FIND_DEFAULT_LIMIT = 100;

export interface FindCondition {
  field: string;
  op: FindOp;
  value?: unknown;
}

interface Column {
  name: string;
  type: string;
  targetClass?: string;
}

interface CloudServices {
  endpoint: string;
  /** P115 HST-010: set by a host where nothing answers `endpoint` over TCP (a Worker). */
  fetch?: typeof globalThis.fetch;
  appId?: string;
  masterKey?: string;
  collections?: () => { name: string; columns?: Column[] }[];
}

function services(stepId: string): CloudServices {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (globalThis as any)._noodl_cloudservices as CloudServices | undefined;
  if (!s || typeof s.endpoint !== 'string') {
    throw new StepExecutionError(`Step "${stepId}": the backend's data service is not running, so no record can be reached.`);
  }
  return s;
}

/** On unless the workflow says `false` (R5: on by default). */
export function ignoresPrivacyRules(ctx: StepExecContext): boolean {
  return ctx.workflow.ignorePrivacyRules !== false;
}

/**
 * The authored params resolved against the run, read from the STEP and not from `ctx.input`: the input is the run
 * payload with the params spread over it, and a db-change run's payload carries `record` and `collection` of its
 * own, so a param the author left out would silently be the trigger's.
 */
function resolvedParams(ctx: StepExecContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx.step.params || {})) out[k] = resolveValueDeep(v, ctx.paramScope ?? ctx.scope);
  return out;
}

function tableOf(p: Record<string, unknown>, stepId: string): string {
  const t = p.table;
  if (typeof t !== 'string' || !t) throw new StepExecutionError(`Step "${stepId}": which table? "table" is ${JSON.stringify(t)}.`);
  return t;
}

/** A record named by its id, by a Pointer to it, or by the record itself. */
export function recordIdOf(v: unknown): string | undefined {
  if (typeof v === 'string' && v) return v;
  if (isPlainObject(v) && typeof v.objectId === 'string' && v.objectId) return v.objectId;
  return undefined;
}

function columnsOf(svc: CloudServices, table: string): Map<string, Column> {
  const all = (svc.collections && svc.collections()) || [];
  const found = all.find((t) => t.name === table);
  return new Map((found?.columns || []).map((c) => [c.name, c]));
}

/**
 * A value as the data routes want it for its column. A person picks "the Watering's plant" (a Pointer, or a record)
 * or types a date; the wire wants `{__type: 'Pointer'}` and `{__type: 'Date'}`. Anything already in wire form, and
 * any column the table does not describe, goes as it is.
 */
export function toWire(column: Column | undefined, value: unknown): unknown {
  if (!column || value === null || value === undefined) return value;
  if (isPlainObject(value) && typeof value.__type === 'string') return value;
  if (column.type === 'Date') {
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return { __type: 'Date', iso: d.toISOString() };
    }
    if (value instanceof Date) return { __type: 'Date', iso: value.toISOString() };
    return value;
  }
  if (column.type === 'Pointer') {
    const id = recordIdOf(value);
    const className = column.targetClass || (isPlainObject(value) && typeof value.className === 'string' ? value.className : undefined);
    if (id && className) return { __type: 'Pointer', className, objectId: id };
  }
  return value;
}

function fieldsToWire(svc: CloudServices, table: string, fields: unknown, stepId: string): Record<string, unknown> {
  if (fields === undefined) return {};
  if (!isPlainObject(fields)) {
    throw new StepExecutionError(`Step "${stepId}": "fields" must be { "<field>": <value> }, not ${Array.isArray(fields) ? 'a list' : typeof fields}.`);
  }
  const cols = columnsOf(svc, table);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    // An unset value leaves the field alone: a person who added a row and picked nothing has not asked for a blank.
    if (v === undefined) continue;
    out[k] = toWire(cols.get(k), v);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One condition as a `where` entry on the Parse wire. */
function whereEntry(c: FindCondition, column: Column | undefined): unknown {
  const v = toWire(column, c.value);
  const list = (x: unknown) => (Array.isArray(x) ? x.map((i) => toWire(column, i)) : [v]);
  switch (c.op) {
    case 'eq':
      return v === null ? { $exists: false } : v;
    case 'neq':
      return { $ne: v };
    case 'gt':
      return { $gt: v };
    case 'gte':
      return { $gte: v };
    case 'lt':
      return { $lt: v };
    case 'lte':
      return { $lte: v };
    case 'in':
      return { $in: list(c.value) };
    case 'notIn':
      return { $nin: list(c.value) };
    case 'exists':
      return { $exists: true };
    case 'notExists':
      return { $exists: false };
    case 'contains':
      return { $regex: escapeRegex(String(c.value)) };
    case 'startsWith':
      return { $regex: '^' + escapeRegex(String(c.value)) };
    case 'endsWith':
      return { $regex: escapeRegex(String(c.value)) + '$' };
  }
}

/** The conditions as a Parse `where`: all of them (each its own clause), or any of them (`$or`). */
export function buildWhere(conditions: FindCondition[], match: 'all' | 'any', cols: Map<string, Column>): Record<string, unknown> {
  const clauses = conditions.map((c) => ({ [c.field]: whereEntry(c, cols.get(c.field)) }));
  if (clauses.length === 0) return {};
  if (match === 'any') return clauses.length === 1 ? clauses[0] : { $or: clauses };
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

/** Write-time check of a `where` list. */
export function validateFindConditions(where: unknown, at: string): string[] {
  if (where === undefined) return [];
  if (!Array.isArray(where)) return [`${at} must be a list of { field, op, value }`];
  const errors: string[] = [];
  where.forEach((c, i) => {
    const here = `${at}[${i}]`;
    if (!isPlainObject(c)) {
      errors.push(`${here} must be { field, op, value }`);
      return;
    }
    if (typeof c.field !== 'string' || !c.field) errors.push(`${here}.field must name a field of the table`);
    if (!(FIND_OPS as readonly string[]).includes(c.op as string)) {
      errors.push(`${here}.op "${String(c.op)}" is not one a search can use (${FIND_OPS.join(', ')})`);
    } else if (!UNARY_FIND_OPS.has(c.op as FindOp) && !('value' in c)) {
      errors.push(`${here}: "${String(c.op)}" compares with a value, and there is none`);
    }
  });
  return errors;
}

type Fetch = (url: string, init: Record<string, unknown>) => Promise<{ status: number; text(): Promise<string> }>;

/** One request to this backend's data routes, as the app or as nobody, charged to a run of its own. */
async function call(
  ctx: StepExecContext,
  getRunner: () => WorkflowRunner | null,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const svc = services(ctx.step.id);
  const asApp = ignoresPrivacyRules(ctx);
  const send = async (runId?: string) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (svc.appId) headers['x-parse-application-id'] = svc.appId;
    if (asApp && svc.masterKey) {
      headers['x-parse-master-key'] = svc.masterKey;
      // HLT-023: the run header is honoured only beside the app's key, so a visitor's request is charged as one.
      if (runId) headers['x-nodegx-run'] = runId;
    }
    // P115 HST-010: the backend's own transport when the host handed one (a Worker: in-process), else the global one.
    const res = await ((svc.fetch ?? globalThis.fetch) as unknown as Fetch)(svc.endpoint + path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: ctx.signal
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: text };
    }
    return { status: res.status, json };
  };
  const runner = asApp ? getRunner() : null;
  if (!runner) return send();
  return runner.functionRuns.within(`workflow:${ctx.workflow.id}/${ctx.step.id}`, () => send(runner.functionRuns.currentRunId()));
}

/** A non-2xx answer as a step failure, in the backend's own words, saying who the step acted as. */
function refused(ctx: StepExecContext, what: string, res: { status: number; json: Record<string, unknown> }): StepExecutionError {
  const said = typeof res.json.error === 'string' ? res.json.error : JSON.stringify(res.json);
  const who =
    !ignoresPrivacyRules(ctx) && (res.status === 401 || res.status === 403 || res.status === 404)
      ? ' The step acted as a visitor because this workflow\'s "Ignore privacy rules" is off.'
      : '';
  return new StepExecutionError(`Step "${ctx.step.id}" could not ${what}: ${said} (${res.status}).${who}`, res.status);
}

const ok = (status: number) => status >= 200 && status < 300;
const enc = encodeURIComponent;

/** The row as the table now holds it; what was written when the step may not read it back. */
async function readBack(
  ctx: StepExecContext,
  getRunner: () => WorkflowRunner | null,
  table: string,
  id: string,
  fallback: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const got = await call(ctx, getRunner, 'GET', `/classes/${enc(table)}/${enc(id)}`);
  return ok(got.status) ? got.json : fallback;
}

export class CreateRecordStepExecutor implements StepExecutor {
  constructor(private readonly getRunner: () => WorkflowRunner | null) {}

  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const p = resolvedParams(ctx);
    const table = tableOf(p, ctx.step.id);
    const fields = fieldsToWire(services(ctx.step.id), table, p.fields, ctx.step.id);
    const made = await call(ctx, this.getRunner, 'POST', `/classes/${enc(table)}`, fields);
    if (!ok(made.status)) throw refused(ctx, `make a ${table} record`, made);
    const id = String(made.json.objectId);
    const record = await readBack(ctx, this.getRunner, table, id, { ...fields, ...made.json });
    return { record, id };
  }
}

export class UpdateRecordStepExecutor implements StepExecutor {
  constructor(private readonly getRunner: () => WorkflowRunner | null) {}

  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const p = resolvedParams(ctx);
    const table = tableOf(p, ctx.step.id);
    const id = recordIdOf(p.record);
    if (!id) {
      throw new StepExecutionError(
        `Step "${ctx.step.id}": which ${table} record? "record" resolved to ${JSON.stringify(p.record)}; it takes an id, or a record or link that has one.`
      );
    }
    const fields = fieldsToWire(services(ctx.step.id), table, p.fields, ctx.step.id);
    const changed = await call(ctx, this.getRunner, 'PUT', `/classes/${enc(table)}/${enc(id)}`, fields);
    if (!ok(changed.status)) throw refused(ctx, `change ${table} record ${id}`, changed);
    const record = await readBack(ctx, this.getRunner, table, id, { objectId: id, ...fields, ...changed.json });
    return { record, id };
  }
}

export class DeleteRecordStepExecutor implements StepExecutor {
  constructor(private readonly getRunner: () => WorkflowRunner | null) {}

  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const p = resolvedParams(ctx);
    const table = tableOf(p, ctx.step.id);
    const id = recordIdOf(p.record);
    if (!id) {
      throw new StepExecutionError(
        `Step "${ctx.step.id}": which ${table} record? "record" resolved to ${JSON.stringify(p.record)}; it takes an id, or a record or link that has one.`
      );
    }
    const gone = await call(ctx, this.getRunner, 'DELETE', `/classes/${enc(table)}/${enc(id)}`);
    if (!ok(gone.status)) throw refused(ctx, `delete ${table} record ${id}`, gone);
    return { deleted: true, id };
  }
}

export class FindRecordsStepExecutor implements StepExecutor {
  constructor(private readonly getRunner: () => WorkflowRunner | null) {}

  async execute(ctx: StepExecContext): Promise<StepExecResult> {
    const p = resolvedParams(ctx);
    const table = tableOf(p, ctx.step.id);
    const svc = services(ctx.step.id);
    const errors = validateFindConditions(p.where, `step "${ctx.step.id}".params.where`);
    if (errors.length) throw new StepExecutionError(errors.join('; '));
    const where = buildWhere((p.where as FindCondition[]) || [], p.match === 'any' ? 'any' : 'all', columnsOf(svc, table));
    const limit = typeof p.limit === 'number' && Number.isInteger(p.limit) && p.limit >= 1 ? Math.min(p.limit, FIND_MAX_LIMIT) : FIND_DEFAULT_LIMIT;
    const order = typeof p.sortBy === 'string' && p.sortBy ? (p.order === 'descending' ? '-' : '') + p.sortBy : undefined;
    const found = await call(ctx, this.getRunner, 'POST', `/classes/${enc(table)}`, {
      _method: 'GET',
      where,
      limit,
      ...(order ? { order } : {})
    });
    if (!ok(found.status)) throw refused(ctx, `search ${table}`, found);
    const items = Array.isArray(found.json.results) ? (found.json.results as Record<string, unknown>[]) : [];
    return stepResult({ items, count: items.length, first: items[0] ?? null }, { select: [items.length === 0 ? 'empty' : 'nonempty'] });
  }
}
