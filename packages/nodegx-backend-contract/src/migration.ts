/**
 * Migrations — a changed sentence about someone's world, run on the records already there.
 *
 * P116 ONT-007. `@nodegx/project-contract/world`'s `planMigration()` turns two worlds into the
 * steps between them: a backup, schema-route bodies, and data moves in the person's words, with
 * the checks a dry run reads off the records first. This module runs that plan through the
 * schema surface and the data plane. It names no world and imports nothing from the project
 * contract: a plan is data, and the shapes below are restated structurally.
 *
 * It lives in `src/` because production runs it (README §9 R9, ruled 2026-10-09): the backend's
 * `POST /admin/world/migrate` and the conformance specs import this one copy. It does no I/O of
 * its own — every read and write goes through the {@link MigrationContext} it is handed.
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
 * @module backend-contract/migration
 */

import type { PathHop } from './filter';
import { whenTargetGoesProblems, type WhenTargetGoes } from './targetGoes';
import type { IStorageFacade, IStorageSchema, OnlyWhileRule, StorageCheckDecl, StorageColumn, StorageIndexDecl, StorageQueryOptions, StorageSeries } from './storage';

/** A stored row, as the storage layer hands it back. */
type Row = Record<string, unknown>;

/** One `POST /admin/schema` body (`nodegx-backend/src/server/byob-admin.ts` `mutateSchema`). */
export type MigrationSchemaBody =
  | { action: 'createTable'; table: string; description: string; columns: Array<StorageColumn & { required?: true; description?: string }> }
  | { action: 'addColumn'; table: string; column: StorageColumn & { required?: true; description?: string } }
  | { action: 'renameTable'; table: string; newName: string }
  | { action: 'renameColumn'; table: string; oldName: string; newName: string }
  | { action: 'describeTable'; table: string; description: string; columns: Record<string, string | null> }
  /** P116 R10: a changed answer to "when what it points at goes", per link (null takes the rule away). */
  | { action: 'setWhenTargetGoes'; table: string; columns: Record<string, WhenTargetGoes | null> }
  /** P116 ONT-015: a series put on (or taken off) a field; the store numbers the records that hold none. */
  | { action: 'setSeries'; table: string; columns: Record<string, StorageSeries | null> }
  | { action: 'setChecks'; table: string; checks: StorageCheckDecl[] }
  | { action: 'setIndexes'; table: string; indexes: StorageIndexDecl[] }
  | { action: 'dropColumn'; table: string; column: string }
  | { action: 'deleteTable'; table: string };

export type MigrationMove =
  | { linkToRecord: { from: string; field: string; record: string; fromField: string; toField: string } }
  | { recordToLink: { record: string; fromField: string; toField: string; into: string; field: string } }
  | { fieldAcross: { from: string; link: string; field: string; to: string; back?: true } };

/**
 * P116 ONT-014 — a collection's rules on a record's OLD values (`security.json` `onlyWhile`: set
 * once, never edited, never deleted), as the world says them now; `null` = it says none. Not the
 * schema's: the backend keeps them inside a person's write, so the context's `rules` writes them.
 */
export type MigrationRulesBody = {
  collection: string;
  onlyWhile: { update?: OnlyWhileRule; delete?: OnlyWhileRule | 'never' } | null;
  /** s18: what the world said for this collection before this migration (absent on a plan written by hand). */
  was?: { update?: OnlyWhileRule; delete?: OnlyWhileRule | 'never' } | null;
  /**
   * P116 ONT-011 step 4 — who reads one field (`security.json` `collections.<c>.fields`, R-a), as the
   * world says it now: a secret detail is `{ read: "nobody" }` (the admin and functions are not bound).
   * Absent: this step says nothing about the fields (a plan from before step 4); `null`: the world
   * says none. `wasFields` is what the world said before, as `was` is for `onlyWhile`.
   */
  fields?: Record<string, { read: 'nobody' }> | null;
  wasFields?: Record<string, { read: 'nobody' }> | null;
};

export type MigrationStepData =
  | { backup: true; says: string }
  | { schema: MigrationSchemaBody; says: string }
  | { move: MigrationMove; says: string }
  | { rules: MigrationRulesBody; says: string };

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

/**
 * What a migration needs of an engine: the schema surface and five data-plane calls, promised.
 * The conformance context is one ({@link migrationContextOf} makes one from the backend's facade).
 */
export interface MigrationContext {
  readonly schema: IStorageSchema;
  create(collection: string, data: Row): Promise<Row>;
  save(collection: string, objectId: string, data: Row): Promise<Row>;
  query(collection: string, options?: StorageQueryOptions): Promise<{ results: Row[] }>;
  count(collection: string, where?: Row): Promise<number>;
  fetch(collection: string, objectId: string): Promise<Row>;
  /**
   * P116 ONT-014 — writes a `rules` step. The backend's route gives one (it owns `security.json`);
   * a context without it refuses the step by name, never counts it done.
   */
  rules?(body: MigrationRulesBody): void | Promise<void>;
}

/** The context the backend runs a migration on: its facade, as the master key (an admin route). */
export function migrationContextOf(facade: IStorageFacade): MigrationContext {
  return {
    schema: facade.schemaManager,
    create: (collection, data) => facade.rawCreate(collection, data),
    save: (collection, objectId, data) => facade.rawSave(collection, objectId, data),
    query: (collection, options) => facade.rawQuery(collection, options),
    count: (collection, where) => facade.rawCount(collection, where),
    fetch: (collection, objectId) => facade.rawFetch(collection, objectId)
  };
}

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

/**
 * Every row of a collection, in id order, a page at a time — until a page comes back EMPTY.
 *
 * 🔴 s11: never "until a page comes back short". The backend's facade caps a page at the
 * operator's `queries.maxLimit` (PRD-001, settable at runtime down to `defaultLimit`), so a
 * page of 500 asked can come back 200 with rows after it: the old loop stopped there, and every
 * row past the cap was neither counted by the dry run nor moved by the run. The conformance
 * context has no cap, which is why no grade ever saw it. One extra read per collection.
 */
async function allRows(ctx: MigrationContext, collection: string): Promise<Row[]> {
  const out: Row[] = [];
  for (;;) {
    const { results } = await ctx.query(collection, { sort: ['objectId'], limit: PAGE, skip: out.length });
    if (!results.length) return out;
    out.push(...results);
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
        const over = Array.from(seen.values()).filter((n) => n > 1).reduce((a, n) => a + n, 0);
        if (over > 0) dry.refusals.push({ says: c.says, rows: over });
      } else if (c.refuse === 'more-than-one') {
        const seen = new Map<string, number>();
        for (const row of await allRows(ctx, c.record)) {
          const id = idOf(row[c.by]);
          if (id) seen.set(id, (seen.get(id) || 0) + 1);
        }
        const over = Array.from(seen.values()).filter((n) => n > 1).length;
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
    // ONT-015 §3.3 (AC3): a series put on a field numbers every record holding none — counted here, as a move is.
    if ('schema' in s && s.schema.action === 'setSeries') {
      const put = Object.entries(s.schema.columns).filter(([, series]) => series !== null);
      if (put.length) {
        const rows = await allRows(ctx, s.schema.table);
        for (const [field] of put) dry.moves.push({ says: s.says, rows: rows.filter((r) => isEmpty(r[field])).length });
      }
      continue;
    }
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
    case 'describeTable':
      if (typeof sm.describeTable !== 'function') throw new Error('the schema surface cannot say again what a collection is');
      sm.describeTable(body.table, body.description, body.columns);
      return;
    case 'setWhenTargetGoes':
      if (typeof sm.setWhenTargetGoes !== 'function') throw new Error('the schema surface cannot say what happens to a link when its record goes');
      sm.setWhenTargetGoes(body.table, body.columns);
      return;
    case 'setSeries':
      if (typeof sm.setSeries !== 'function') throw new Error('the schema surface cannot hand out numbers');
      sm.setSeries(body.table, body.columns);
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
    default:
      // s11: a plan from a request body is not trusted to be one the planner made — an action this
      // switch does not know used to be counted as a step done. `migrationPlanProblems` refuses it first.
      throw new Error(`no schema action "${String((body as { action?: unknown }).action)}"`);
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
      else if ('rules' in s) {
        if (typeof ctx.rules !== 'function') throw new Error('this context cannot keep rules on records’ old values (set once, never edited, never deleted)');
        await ctx.rules(s.rules);
      }
      done += 1;
    } catch (err) {
      return { ran: 'partly', dryRun, backup, steps: done, failed: { step: i, says: s.says, message: err instanceof Error ? err.message : String(err) } };
    }
  }
  return { ran: true, dryRun, backup, steps: done };
}

// ------------------------------------------------------------- a plan from a body --

const SCHEMA_ACTIONS: ReadonlyArray<MigrationSchemaBody['action']> = [
  'createTable',
  'addColumn',
  'renameTable',
  'renameColumn',
  'describeTable',
  'setWhenTargetGoes',
  'setSeries',
  'setChecks',
  'setIndexes',
  'dropColumn',
  'deleteTable'
];
const MOVES = ['linkToRecord', 'recordToLink', 'fieldAcross'] as const;
const REFUSALS = ['more-than-one', 'none', 'rows', 'outside-list', 'duplicates'];
const LOSSES = ['values', 'rows'];

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isWords = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/**
 * What is wrong with a plan that arrived as a request body, in words — empty when it is one the
 * executor can run. The executor trusts its plan; a route must not (s11: an unknown schema action
 * was counted as a step done). Shape only: whether the data allows it is the dry run's.
 */
export function migrationPlanProblems(plan: unknown): string[] {
  if (!isObject(plan)) return ['the plan is { steps, checks, refused }'];
  const out: string[] = [];
  if (!Array.isArray(plan.steps)) out.push('the plan has no steps list');
  if (!Array.isArray(plan.checks)) out.push('the plan has no checks list');
  if (!Array.isArray(plan.refused) || !plan.refused.every(isWords)) out.push('the plan\'s "refused" is a list of sentences');
  (Array.isArray(plan.steps) ? plan.steps : []).forEach((s: unknown, i: number) => {
    const at = `step ${i + 1}`;
    if (!isObject(s)) return void out.push(`${at} is not a step`);
    if (!isWords(s.says)) out.push(`${at} does not say what it does`);
    const kinds = ['backup', 'schema', 'move', 'rules'].filter((k) => k in s);
    if (kinds.length !== 1) return void out.push(`${at} is one of a backup, a schema change, a move or the rules on old values`);
    if ('rules' in s) {
      const r = s.rules;
      if (!isObject(r) || !isWords(r.collection)) out.push(`${at}: the rules name their collection`);
      else if (r.onlyWhile !== null && !isObject(r.onlyWhile)) out.push(`${at}: the rules are { update?, delete? }, or null for none`);
      for (const key of ['fields', 'wasFields'] as const) {
        const f = isObject(r) ? r[key] : undefined;
        if (f === undefined || f === null) continue;
        if (!isObject(f) || Object.values(f).some((rule) => !isObject(rule) || rule.read !== 'nobody'))
          out.push(`${at}: the ${key === 'fields' ? '' : 'earlier '}field rules are { <field>: { "read": "nobody" } }, or null for none`);
      }
    }
    if ('backup' in s && s.backup !== true) out.push(`${at}: a backup step is { backup: true }`);
    if ('schema' in s) {
      const b = s.schema;
      if (!isObject(b) || !SCHEMA_ACTIONS.includes(b.action as MigrationSchemaBody['action'])) out.push(`${at}: no schema action "${isObject(b) ? String(b.action) : ''}"`);
      else if (!isWords(b.table)) out.push(`${at}: a schema change names its table`);
      // R10: the executor writes through the schema surface, not the route, so a rule the backend
      // could never keep is refused here, as the route refuses it.
      else if (b.action === 'createTable' || b.action === 'addColumn') {
        const cols = b.action === 'createTable' ? b.columns : [b.column];
        if (Array.isArray(cols)) for (const p of whenTargetGoesProblems(String(b.table), cols.filter(isObject) as unknown as StorageColumn[])) out.push(`${at}: ${p}`);
      } else if (b.action === 'setSeries') {
        // ONT-015: the shape only — whether the store can keep the format is the store's (it refuses in words).
        if (!isObject(b.columns) || Object.values(b.columns).some((v) => v !== null && (!isObject(v) || !isWords(v.format))))
          out.push(`${at}: a series change is { columns: { <field>: { format, restart?, gapFree? } or null } }`);
      }
    }
    if ('move' in s) {
      const m = s.move;
      const which = isObject(m) ? MOVES.filter((k) => k in m) : [];
      if (which.length !== 1) out.push(`${at}: a move is one of ${MOVES.join(', ')}`);
      else if (!isObject((m as Record<string, unknown>)[which[0]])) out.push(`${at}: ${which[0]} says what it moves`);
    }
  });
  (Array.isArray(plan.checks) ? plan.checks : []).forEach((c: unknown, i: number) => {
    const at = `check ${i + 1}`;
    if (!isObject(c) || !isWords(c.says)) return void out.push(`${at} does not say what it checks`);
    if ('refuse' in c ? !REFUSALS.includes(String(c.refuse)) : !('loses' in c) || !LOSSES.includes(String(c.loses))) out.push(`${at}: no check "${String(c.refuse ?? c.loses)}"`);
  });
  return out;
}

// --------------------------------------------------------------- the permission rules --

/** As much of the backend's `security.json` as a migration rewrites: the rules kept per collection. */
export interface MigrationRules<E extends object = { permissions?: Record<string, unknown> }> {
  /** Each collection's entry; a migration reads only its `permissions`, and carries the rest as it is. */
  collections: Record<string, E>;
}

export interface RulesAfterMigration<E extends object = { permissions?: Record<string, unknown> }> {
  /** `collections` as it must be once the steps have run. A new object; the one passed in is untouched. */
  collections: Record<string, E>;
  /** Rules kept under a collection's old name, moved to its new one. */
  moved: Array<{ from: string; to: string }>;
  /** Path rules whose hops named something the plan renames, re-said — where, and which names. */
  rewritten: Array<{ at: string; names: Record<string, string> }>;
  /** Why the rules cannot be carried. A run that has any must not start: after it, the rules protect the wrong rows. */
  problems: string[];
}

/**
 * The permission rules after a plan's renames (ONT-007 §6.5, BMG-016): a collection's rules move
 * with it, and a `{ path }` rule (ONT-004) is re-said hop by hop — the collection a hop names and
 * the field it follows or matches by. Read BEFORE the run: a hop's landing collection is read off
 * the schema as it stands (`targetOf`, by the old names).
 *
 * Pure. It sees only renames: rules on a deleted collection or a dropped field are the person's,
 * and `permissionReach()` (the project contract) names them for the page.
 */
export function rulesAfterMigration<E extends object>(
  plan: Pick<MigrationPlanData, 'steps'>,
  rules: MigrationRules<E>,
  targetOf: (collection: string, field: string) => string | undefined
): RulesAfterMigration<E> {
  const tables = new Map<string, string>();
  const columns = new Map<string, string>(); // `${new table}.${old field}` → new field
  for (const s of plan.steps) {
    if (!('schema' in s)) continue;
    if (s.schema.action === 'renameTable') tables.set(s.schema.table, s.schema.newName);
    if (s.schema.action === 'renameColumn') columns.set(`${s.schema.table}.${s.schema.oldName}`, s.schema.newName);
  }
  const tableNow = (name: string): string => tables.get(name) ?? name;
  const fieldNow = (collection: string, field: string): string => columns.get(`${tableNow(collection)}.${field}`) ?? field;

  const out: RulesAfterMigration<E> = { collections: {}, moved: [], rewritten: [], problems: [] };
  const before = rules.collections || {};
  for (const [name, entry] of Object.entries(before)) {
    const to = tableNow(name);
    if (to !== name) {
      if (before[to] !== undefined) out.problems.push(`"${name}" is renamed "${to}", and "${to}" already has rules of its own`);
      out.moved.push({ from: name, to });
    }
    const copy = JSON.parse(JSON.stringify(entry)) as E;
    for (const [op, rule] of Object.entries((copy as { permissions?: Record<string, unknown> }).permissions || {})) {
      for (const atom of Array.isArray(rule) ? rule : [rule]) {
        const hops = (atom as { path?: { hops?: PathHop[] } } | null)?.path?.hops;
        if (!Array.isArray(hops)) continue;
        const names: Record<string, string> = {};
        const say = (was: string, now: string): string => (now !== was ? ((names[was] = now), now) : was);
        let at: string | undefined = '_User';
        for (const hop of hops as Array<Record<string, unknown>>) {
          if (typeof hop.follow === 'string') {
            const field = hop.follow;
            const lands = typeof hop.to === 'string' ? hop.to : at ? targetOf(at, field) : undefined;
            if (at) hop.follow = say(field, fieldNow(at, field));
            if (typeof hop.to === 'string') hop.to = say(hop.to, tableNow(hop.to));
            at = lands;
          } else if (typeof hop.from === 'string') {
            const from = hop.from;
            if (typeof hop.by === 'string') hop.by = say(hop.by, fieldNow(from, hop.by));
            hop.from = say(from, tableNow(from));
            at = from;
          }
          // A hop's `where` names fields of the rows it lands on; its top-level keys are re-said, and
          // a renamed field said deeper than that is refused rather than left naming nothing.
          if (isObject(hop.where) && at) {
            const where: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(hop.where)) where[say(k, fieldNow(at, k))] = v;
            hop.where = where;
            const landing = tableNow(at);
            for (const [key, now] of Array.from(columns))
              if (key.startsWith(`${landing}.`) && JSON.stringify(Object.values(where)).includes(`"${key.slice(landing.length + 1)}"`))
                out.problems.push(`the rule at collections.${name}.permissions.${op} narrows a hop by "${key.slice(landing.length + 1)}" inside a filter; say it again as "${now}"`);
          }
        }
        if (Object.keys(names).length) out.rewritten.push({ at: `collections.${to}.permissions.${op}`, names });
      }
    }
    out.collections[to] = copy;
  }
  return out;
}
