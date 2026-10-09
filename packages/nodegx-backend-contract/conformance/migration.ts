/**
 * Migrations — a changed sentence about someone's world, run on the records already there.
 *
 * P116 ONT-007. `@nodegx/project-contract/world`'s `planMigration()` turns two worlds into the
 * steps between them: a backup, schema-route bodies, and data moves in the person's words, with
 * the checks a dry run reads off the records first. This module runs that plan through the
 * schema surface and the data plane, the way `claims.ts` runs a claim — it names no world and
 * imports nothing from the project contract: a plan is data, and the shapes below are restated
 * structurally; `nodegx-backend`'s ONT-007 spec assigns one to the other.
 *
 * ## The order, and what stops it
 *
 * 1. **The dry run** reads every check and counts every move, and changes nothing.
 * 2. A plan with any `refused` change, or a dry run with any refusal, **moves nothing**: the
 *    run returns the dry run with the rows that stop it counted.
 * 3. A dry run that would lose values is run only with `acceptLosses` — the person has seen
 *    the count in words and said yes.
 * 4. **The backup** is taken before the first step, by the caller's function (the backend's
 *    backup route), and a run without one refuses to start.
 * 5. The steps, in the plan's order. A step that fails stops the run there and says which.
 *
 * @module conformance/migration
 */

import type { StorageColumn, StorageIndexDecl, StorageCheckDecl } from '../src/storage';

import type { ConformanceContext, Row } from './context';

/** One `POST /admin/schema` body (`nodegx-backend/src/server/byob-admin.ts` `mutateSchema`). */
export type MigrationSchemaBody =
  | { action: 'createTable'; table: string; description: string; columns: Array<StorageColumn & { required?: true; description?: string }> }
  | { action: 'addColumn'; table: string; column: StorageColumn & { required?: true; description?: string } }
  | { action: 'renameTable'; table: string; newName: string }
  | { action: 'renameColumn'; table: string; oldName: string; newName: string }
  | { action: 'setChecks'; table: string; checks: StorageCheckDecl[] }
  | { action: 'setIndexes'; table: string; indexes: StorageIndexDecl[] }
  | { action: 'dropColumn'; table: string; column: string }
  | { action: 'deleteTable'; table: string };

export type MigrationMove =
  | { linkToRecord: { from: string; field: string; record: string; fromField: string; toField: string } }
  | { recordToLink: { record: string; fromField: string; toField: string; into: string; field: string } }
  | { fieldAcross: { from: string; link: string; field: string; to: string; back?: true } };

export type MigrationStepData =
  | { backup: true; says: string }
  | { schema: MigrationSchemaBody; says: string }
  | { move: MigrationMove; says: string };

export type MigrationCheckData =
  | { refuse: 'more-than-one'; record: string; by: string; says: string }
  | { refuse: 'none'; collection: string; record: string; by: string; says: string }
  | { refuse: 'rows'; collection: string; says: string }
  | { refuse: 'outside-list'; collection: string; field: string; values: string[]; says: string }
  | { refuse: 'duplicates'; collection: string; fields: string[]; says: string }
  | { loses: 'values'; collection: string; field: string; says: string }
  | { loses: 'rows'; collection: string; says: string };

export interface MigrationPlanData {
  steps: MigrationStepData[];
  checks: MigrationCheckData[];
  refused: string[];
}

/** What a migration needs of an engine: the schema surface and six data-plane calls. */
export type MigrationContext = Pick<ConformanceContext, 'schema' | 'create' | 'save' | 'query' | 'count' | 'fetch'>;

export interface DryRun {
  /** Checks that stop it, each with the rows that do. */
  refusals: Array<{ says: string; rows: number }>;
  /** What it would lose, counted. Only the non-zero ones. */
  losses: Array<{ says: string; count: number }>;
  /** Each move, with the rows it would write. */
  moves: Array<{ says: string; rows: number }>;
}

export type MigrationRun =
  | { ran: false; why: string; dryRun: DryRun }
  | { ran: true; dryRun: DryRun; backup: unknown; steps: number }
  /** A step failed part way: the steps before it ran, and the backup is what undoes them. */
  | { ran: 'partly'; dryRun: DryRun; backup: unknown; steps: number; failed: { step: number; says: string; message: string } };

const PAGE = 500;

/** Every row of a collection, in id order, a page at a time. */
async function allRows(ctx: MigrationContext, collection: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let skip = 0; ; skip += PAGE) {
    const { results } = await ctx.query(collection, { sort: ['objectId'], limit: PAGE, skip });
    out.push(...results);
    if (results.length < PAGE) return out;
  }
}

/** The id a link holds, however the engine hands it back. */
function idOf(v: unknown): string | undefined {
  if (v && typeof v === 'object' && 'objectId' in (v as Row)) return String((v as Row).objectId);
  if (typeof v === 'string' && v) return v;
  return undefined;
}

function targetOf(ctx: MigrationContext, table: string, field: string): string {
  const col = ctx.schema.getTableSchema(table)?.columns?.find((c) => c.name === field);
  if (!col?.targetClass) throw new Error(`${table}.${field} is not a link the schema knows the target of`);
  return col.targetClass;
}
const pointer = (className: string, objectId: string): Row => ({ __type: 'Pointer', className, objectId });

const isEmpty = (v: unknown): boolean => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Reads the checks and counts the moves. Changes nothing. */
export async function dryRunMigration(ctx: MigrationContext, plan: MigrationPlanData): Promise<DryRun> {
  const dry: DryRun = { refusals: [], losses: [], moves: [] };
  for (const c of plan.checks) {
    if ('refuse' in c) {
      if (c.refuse === 'rows') {
        const n = await ctx.count(c.collection, {});
        if (n > 0) dry.refusals.push({ says: c.says, rows: n });
      } else if (c.refuse === 'outside-list') {
        // P116 ONT-007 s9: a list put on a field the rows already hold — the route refuses the rule (HLT-016) when any row is outside it,
        // which a run would meet AFTER the backup and every step before it. Read first, counted, nothing moved.
        const outside = (await allRows(ctx, c.collection)).filter((r) => !isEmpty(r[c.field]) && !c.values.includes(String(r[c.field]))).length;
        if (outside > 0) dry.refusals.push({ says: c.says, rows: outside });
      } else if (c.refuse === 'duplicates') {
        // s9: a unique rule over rows that share a value — the same refusal (FED-002), read first. Rows with any of the
        // fields empty are distinct to a unique index on both engines, so they are not counted.
        const seen = new Map<string, number>();
        for (const row of await allRows(ctx, c.collection)) {
          const key = c.fields.map((f) => (isEmpty(row[f]) ? undefined : idOf(row[f]) ?? String(row[f])));
          if (key.some((k) => k === undefined)) continue;
          const k = JSON.stringify(key);
          seen.set(k, (seen.get(k) || 0) + 1);
        }
        const over = [...seen.values()].filter((n) => n > 1).reduce((a, n) => a + n, 0);
        if (over > 0) dry.refusals.push({ says: c.says, rows: over });
      } else if (c.refuse === 'more-than-one') {
        const seen = new Map<string, number>();
        for (const row of await allRows(ctx, c.record)) {
          const id = idOf(row[c.by]);
          if (id) seen.set(id, (seen.get(id) || 0) + 1);
        }
        const over = [...seen.values()].filter((n) => n > 1).length;
        if (over > 0) dry.refusals.push({ says: c.says, rows: over });
      } else {
        const on = new Set((await allRows(ctx, c.record)).map((r) => idOf(r[c.by])).filter(Boolean));
        const none = (await allRows(ctx, c.collection)).filter((r) => !on.has(String(r.objectId))).length;
        if (none > 0) dry.refusals.push({ says: c.says, rows: none });
      }
    } else if (c.loses === 'rows') {
      const n = await ctx.count(c.collection, {});
      if (n > 0) dry.losses.push({ says: c.says, count: n });
    } else {
      const n = (await allRows(ctx, c.collection)).filter((r) => !isEmpty(r[c.field])).length;
      if (n > 0) dry.losses.push({ says: c.says, count: n });
    }
  }
  for (const s of plan.steps) {
    if (!('move' in s)) continue;
    if ('linkToRecord' in s.move) {
      const m = s.move.linkToRecord;
      dry.moves.push({ says: s.says, rows: (await allRows(ctx, m.from)).filter((r) => idOf(r[m.field])).length });
    } else if ('recordToLink' in s.move) {
      dry.moves.push({ says: s.says, rows: (await allRows(ctx, s.move.recordToLink.record)).length });
    } else {
      const m = s.move.fieldAcross;
      dry.moves.push({ says: s.says, rows: (await allRows(ctx, m.from)).filter((r) => idOf(r[m.link]) && (m.back || !isEmpty(r[m.field]))).length });
    }
  }
  return dry;
}

/** Applies one schema body through the schema surface, as the route does. */
function applySchema(ctx: MigrationContext, body: MigrationSchemaBody): void {
  const sm = ctx.schema;
  switch (body.action) {
    case 'createTable':
      sm.createTable({ name: body.table, columns: body.columns, description: body.description });
      return;
    case 'addColumn':
      sm.addColumn(body.table, body.column);
      return;
    case 'renameTable':
      if (typeof sm.renameTable !== 'function') throw new Error('the schema surface cannot rename a collection');
      sm.renameTable(body.table, body.newName);
      return;
    case 'renameColumn':
      sm.renameColumn(body.table, body.oldName, body.newName);
      return;
    case 'setChecks':
      if (typeof sm.reconcileChecks !== 'function') throw new Error('the schema surface has no reconcileChecks');
      sm.reconcileChecks(body.table, body.checks);
      return;
    case 'setIndexes':
      if (typeof sm.reconcileIndexes !== 'function') throw new Error('the schema surface has no reconcileIndexes');
      sm.reconcileIndexes(body.table, body.indexes);
      return;
    case 'dropColumn':
      if (typeof sm.dropColumn !== 'function') throw new Error('the schema surface cannot drop a column');
      sm.dropColumn(body.table, body.column);
      return;
    case 'deleteTable':
      if (typeof sm.deleteTable !== 'function') throw new Error('the schema surface cannot delete a table');
      sm.deleteTable(body.table);
      return;
  }
}

async function applyMove(ctx: MigrationContext, move: MigrationMove): Promise<void> {
  if ('linkToRecord' in move) {
    const m = move.linkToRecord;
    const to = targetOf(ctx, m.record, m.toField);
    for (const row of await allRows(ctx, m.from)) {
      const id = idOf(row[m.field]);
      if (!id) continue;
      await ctx.create(m.record, { [m.fromField]: pointer(m.from, String(row.objectId)), [m.toField]: pointer(to, id) });
    }
    return;
  }
  if ('fieldAcross' in move) {
    const m = move.fieldAcross;
    for (const row of await allRows(ctx, m.from)) {
      const other = idOf(row[m.link]);
      if (!other) continue;
      if (m.back) {
        const v = (await ctx.fetch(m.to, other))[m.field];
        if (!isEmpty(v)) await ctx.save(m.from, String(row.objectId), { [m.field]: v });
      } else if (!isEmpty(row[m.field])) {
        await ctx.save(m.to, other, { [m.field]: row[m.field] });
      }
    }
    return;
  }
  const m = move.recordToLink;
  const to = targetOf(ctx, m.into, m.field);
  for (const row of await allRows(ctx, m.record)) {
    const into = idOf(row[m.fromField]);
    const target = idOf(row[m.toField]);
    if (!into || !target) continue;
    await ctx.save(m.into, into, { [m.field]: pointer(to, target) });
  }
}

/**
 * Runs a plan: the dry run, the refusals, the losses the person accepted, the backup, then the
 * steps. Nothing moves unless every check passes and the backup was taken.
 */
export async function runMigration(
  ctx: MigrationContext,
  plan: MigrationPlanData,
  options: { backup?: () => Promise<unknown>; acceptLosses?: boolean } = {}
): Promise<MigrationRun> {
  const dryRun = await dryRunMigration(ctx, plan);
  if (plan.refused.length) return { ran: false, why: `cannot: ${plan.refused.join(' ')}`, dryRun };
  if (dryRun.refusals.length) return { ran: false, why: dryRun.refusals.map((r) => `${r.says} (${r.rows})`).join('; '), dryRun };
  if (dryRun.losses.length && !options.acceptLosses)
    return { ran: false, why: `it would lose ${dryRun.losses.map((l) => `${l.says} (${l.count})`).join('; ')}, and that was not accepted`, dryRun };
  if (!options.backup) return { ran: false, why: 'no backup can be taken, so nothing is moved', dryRun };

  const backup = await options.backup();
  let done = 0;
  for (let i = 0; i < plan.steps.length; i++) {
    const s = plan.steps[i];
    try {
      if ('schema' in s) {
        applySchema(ctx, s.schema);
        // P116 ONT-007 s9 (the reach review): an engine may queue its DDL and refuse at its barrier — the
        // PostgreSQL manager does, for a check the rows break and a unique rule they share. Awaited here, so a
        // refused step is this step's failure (`partly`), never a run reported done over a rule that was not built.
        // Measured: without it the narrowed-list mutant came back `ran: true` on PostgreSQL and `partly` on SQLite.
        const barrier = (ctx.schema as { barrier?: () => Promise<void> }).barrier;
        if (typeof barrier === 'function') await barrier.call(ctx.schema);
      } else if ('move' in s) await applyMove(ctx, s.move);
      done += 1;
    } catch (err) {
      return { ran: 'partly', dryRun, backup, steps: done, failed: { step: i, says: s.says, message: err instanceof Error ? err.message : String(err) } };
    }
  }
  return { ran: true, dryRun, backup, steps: done };
}
