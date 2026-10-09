/**
 * When what a link points at goes — the rule, and the delete that keeps it.
 *
 * P116 R10 (ruled 2026-10-09): **a link's "when it goes" rule is kept by the backend at delete
 * time, not by a database foreign key.** A Pointer column may say one of three things about the
 * rows that hold it when the record it points at is deleted:
 *
 * - `goes-too` — they are deleted with it (and whatever THEIR rules say happens next);
 * - `stays-unlinked` — they stay, and the link is emptied;
 * - `blocks` — the record cannot be deleted while any row points at it.
 *
 * The words are the person's (`whenTargetGoes` in `@nodegx/project-contract/world`), kept as they
 * are — the same choice R8 made for names SQL reserves. Nothing here is SQL: a Pointer is a text
 * id on both engines, the projects that already hold links to deleted records keep working, and the
 * same code keeps the rule on every engine because it runs above them. It does no I/O of its own;
 * every read and write goes through the {@link DeleteContext} it is handed (the backend's facade).
 *
 * ## Who the rule runs as
 *
 * The caller's permission decides whether THEIR record may go (the first delete runs under their
 * ACL, and a refusal there stops everything before a single other row is touched). What follows is
 * the schema's rule, not the caller's act, so it runs as the master key: the rows that go with it,
 * the links emptied, and the count a `blocks` rule refuses on. A rule that held only for callers who
 * could also write every linked row would be a different rule for every caller — "when an account
 * goes, its members go" would be true for an operator and false for the account's own holder. This
 * is what a database does with its own on-delete actions (they are not subject to row security).
 *
 * ## What it does not do
 *
 * - **It is not one transaction.** The plan is read first and every refusal is found before
 *   anything is written; the writes then run one by one. A row linked in the gap between the read
 *   and the writes is not seen, and a write that fails part way leaves the rows after it pointing at
 *   nothing — which is every project's state before this rule. The facade has no transaction that
 *   spans an await on every engine (BRG-005 owes one).
 * - **A Relation (a Links field) has no rule, because it needs none.** A pair means nothing once
 *   either end is gone, so every delete takes the record's pairs with it: its own (every Relation
 *   its collection declares) and every pair naming it from a Relation that points at its collection
 *   (bug `P116-ONT-003-pairs`). Not a choice the person makes, so nothing in the schema says it. A
 *   Relation that does not say which collection it points at cannot be found from the far end; its
 *   owner's own pairs still go.
 * - **A link to the app's users** is a column like any other; the projection never puts a rule on
 *   one, and an account's own deletion runs through `SystemUsers`, which goes through this too.
 *
 * @module backend-contract/targetGoes
 */

import type { BackendType } from './backends';
import type { Capability } from './capabilities';
import type { IStorageSchema, StorageAclOption, StorageColumn } from './storage';

type Row = Record<string, unknown>;

export type WhenTargetGoes = NonNullable<StorageColumn['whenTargetGoes']>;
export const WHEN_TARGET_GOES: readonly WhenTargetGoes[] = Object.freeze(['goes-too', 'stays-unlinked', 'blocks'] as const);

/** A column as the rule reads it: a storage column that may also be required. */
type RuledColumn = StorageColumn & { required?: boolean };

/**
 * Why a column cannot carry the rule it says, in words; empty when it can. The schema route asks
 * before it writes (400), so a rule that could never be kept is refused, not stored.
 */
export function whenTargetGoesProblems(table: string, columns: readonly RuledColumn[]): string[] {
  const out: string[] = [];
  for (const col of columns) {
    const rule = col.whenTargetGoes as unknown;
    if (rule === undefined) continue;
    const at = `"${table}.${col.name}"`;
    if (typeof rule !== 'string' || !(WHEN_TARGET_GOES as readonly string[]).includes(rule)) {
      out.push(`${at} says "${String(rule)}" for when what it points at goes; it must be one of ${WHEN_TARGET_GOES.join(', ')}.`);
    } else if (col.type !== 'Pointer') {
      out.push(`${at} is ${col.type ? `a ${col.type}` : 'untyped'}; only a link to one record (a Pointer) can say what happens when that record goes.`);
    } else if (!col.targetClass) {
      out.push(`${at} does not say which collection it points at, so nothing can say when that record goes.`);
    } else if (rule === 'stays-unlinked' && col.required) {
      out.push(`${at} is required, so it cannot stay without one when what it points at goes: say goes-too or blocks, or make it optional.`);
    }
  }
  return out;
}

/**
 * The one cell per backend (R10's "a capability cell per backend"). Kept here, beside the rule,
 * and not as a `CapabilityKey`: those are what a NODE can attempt, and no node attempts this — the
 * schema says it and every delete keeps it.
 */
export const WHEN_TARGET_GOES_BY_BACKEND: Readonly<Record<BackendType, Capability>> = Object.freeze({
  nodegx: {
    state: 'supported',
    evidence: 'kept at delete time above both engines (`AdapterFacade.rawDelete` → `deleteKeepingLinks`); graded on SQLite and PostgreSQL by nodegx-backend tests/ont-003-claims and tests/ont-003-target-goes'
  },
  parse: {
    state: 'unsupported',
    reason: 'Parse keeps a pointer to a deleted object and has no rule for it; a Cloud Code beforeDelete trigger written for this app is the only way, and NodeGX does not write one.'
  },
  directus: {
    state: 'unsupported',
    reason: 'Directus keeps this in its own relation settings (on delete: nullify, cascade or prevent), which NodeGX does not write; set it there.'
  },
  supabase: {
    state: 'unsupported',
    reason: 'NodeGX does not write a foreign key for a link on Supabase; an ON DELETE rule written in the database itself is kept by Postgres, not by NodeGX.'
  },
  pocketbase: {
    state: 'unsupported',
    reason: 'PocketBase keeps this as a relation field’s own option (cascade delete), which NodeGX does not write; set it there.'
  },
  custom: {
    state: 'unsupported',
    reason: 'A backend NodeGX did not ship says for itself what happens to a link when its record goes; NodeGX cannot keep it there.'
  }
});

/** What the rule needs of the backend: the schema to read, and five data-plane calls, promised. */
export interface DeleteContext {
  readonly schema: Pick<IStorageSchema, 'listTables' | 'getTableSchema' | 'getRelatedIds' | 'getRelationOwners'>;
  /** As the master key and NOT capped: every linking row must be seen, not a page of them. */
  query(collection: string, options: { where: Row; sort: string[]; limit: number; skip: number }): Promise<{ results: Row[] }>;
  /** As the master key. */
  count(collection: string, where: Row): Promise<number>;
  /** As the master key: empties a link. */
  save(collection: string, objectId: string, data: Row): Promise<unknown>;
  /** Under `acl` when one is given (the caller's own record), as the master key otherwise. */
  delete(collection: string, objectId: string, acl?: StorageAclOption): Promise<void>;
  /** As the master key: takes one pair out of a Relation. */
  unpair(collection: string, objectId: string, field: string, relatedId: string): Promise<void>;
}

/** One rule a collection's link says about the collection it points at. */
interface LinkRule {
  collection: string;
  field: string;
  rule: WhenTargetGoes;
}

export interface DeletePlan {
  /** Every row that goes, the caller's own first. */
  gone: Array<{ collection: string; objectId: string }>;
  /** Every link emptied. */
  unlinked: Array<{ collection: string; objectId: string; field: string }>;
  /** What stops it: the rows still linked to a record that would go, per collection and field. */
  blocked: Array<{ collection: string; field: string; target: string; count: number }>;
  /** Every Relation pair with a record that goes at either end, each once: `collection.field` owns it. */
  unpaired: Array<{ collection: string; objectId: string; field: string; relatedId: string }>;
}

/**
 * A delete a `blocks` rule refused. Nothing was changed. `linked` is what to do about it, for a
 * person and for a graph: which collection, which field, how many rows.
 */
export class StillLinked extends Error {
  readonly code = 'STILL_LINKED';
  constructor(
    readonly collection: string,
    readonly objectId: string,
    readonly linked: DeletePlan['blocked']
  ) {
    super(
      `This ${collection} record cannot be deleted: ` +
        linked.map((b) => `${b.count} ${b.collection} record${b.count === 1 ? '' : 's'} link${b.count === 1 ? 's' : ''} to ${b.target === collection ? 'it' : `a ${b.target} record that would go with it`} by "${b.field}"`).join('; ') +
        '. Nothing was deleted.'
    );
    this.name = 'StillLinked';
  }
}

/** Every rule the schema says, by the collection it points at. */
function rulesByTarget(schema: DeleteContext['schema']): Map<string, LinkRule[]> {
  const out = new Map<string, LinkRule[]>();
  for (const table of schema.listTables()) {
    for (const col of schema.getTableSchema(table)?.columns || []) {
      const rule = col.whenTargetGoes;
      if (col.type !== 'Pointer' || !col.targetClass || !rule || !(WHEN_TARGET_GOES as readonly string[]).includes(rule)) continue;
      const list = out.get(col.targetClass) || [];
      list.push({ collection: table, field: col.name, rule });
      out.set(col.targetClass, list);
    }
  }
  return out;
}

/** Every Relation as `[collection, field, the collection it points at]`; the last is '' when it does not say. */
function relations(schema: DeleteContext['schema']): Array<[string, string, string]> {
  const out: Array<[string, string, string]> = [];
  for (const table of schema.listTables())
    for (const col of schema.getTableSchema(table)?.columns || []) if (col.type === 'Relation') out.push([table, col.name, col.targetClass || '']);
  return out;
}

/** The pairs a record is in, at either end. Sync reads: the schema answers them from what it holds. */
function pairsOf(rels: Array<[string, string, string]>, schema: DeleteContext['schema'], collection: string, objectId: string): DeletePlan['unpaired'] {
  const out: DeletePlan['unpaired'] = [];
  for (const [table, field, target] of rels) {
    if (table === collection) {
      const ids = schema.getRelatedIds(table, objectId, field);
      for (const relatedId of Array.isArray(ids) ? ids : []) out.push({ collection: table, objectId, field, relatedId: String(relatedId) });
    }
    if (target === collection) for (const owner of schema.getRelationOwners(table, field, objectId)) out.push({ collection: table, objectId: owner, field, relatedId: objectId });
  }
  return out;
}

const PAGE = 500;

/** The ids of every row whose `field` points at `id`, a page at a time until a page comes back empty. */
async function linkedIds(ctx: DeleteContext, collection: string, field: string, id: string): Promise<string[]> {
  const out: string[] = [];
  for (;;) {
    const { results } = await ctx.query(collection, { where: { [field]: id }, sort: ['objectId'], limit: PAGE, skip: out.length });
    if (!results.length) return out;
    for (const r of results) out.push(String(r.objectId));
  }
}

/**
 * What deleting this record would do, read and not written. `null` when no rule and no Relation
 * reaches it (the delete is the plain one it always was) or when the record is not there (a delete
 * of nothing must not reach for the rows, or the pairs, that still name its id).
 */
export async function planDelete(ctx: DeleteContext, collection: string, objectId: string): Promise<DeletePlan | null> {
  const rules = rulesByTarget(ctx.schema);
  const rels = relations(ctx.schema);
  if (!rules.has(collection) && !rels.some(([table, , target]) => table === collection || target === collection)) return null;
  if ((await ctx.count(collection, { objectId })) === 0) return null;

  const key = (c: string, id: string): string => `${c}\u0000${id}`;
  const gone: DeletePlan['gone'] = [{ collection, objectId }];
  const going = new Set([key(collection, objectId)]);
  const unlinked: DeletePlan['unlinked'] = [];
  const blockers: Array<{ collection: string; objectId: string; field: string; target: string }> = [];

  // Breadth first over what goes; a row reached twice goes once, so a loop of goes-too ends.
  for (let i = 0; i < gone.length; i++) {
    const at = gone[i];
    for (const r of rules.get(at.collection) || []) {
      for (const id of await linkedIds(ctx, r.collection, r.field, at.objectId)) {
        if (r.rule === 'goes-too') {
          if (!going.has(key(r.collection, id))) {
            going.add(key(r.collection, id));
            gone.push({ collection: r.collection, objectId: id });
          }
        } else if (r.rule === 'stays-unlinked') unlinked.push({ collection: r.collection, objectId: id, field: r.field });
        else blockers.push({ collection: r.collection, objectId: id, field: r.field, target: at.collection });
      }
    }
  }

  // A row that goes anyway (another link's goes-too reaches it) neither blocks nor needs emptying.
  const counts = new Map<string, DeletePlan['blocked'][number]>();
  for (const b of blockers) {
    if (going.has(key(b.collection, b.objectId))) continue;
    const k = `${b.collection}\u0000${b.field}\u0000${b.target}`;
    const row = counts.get(k) || { collection: b.collection, field: b.field, target: b.target, count: 0 };
    row.count++;
    counts.set(k, row);
  }
  // A pair between two records that both go is found from each end; it is taken out once.
  const unpaired = new Map<string, DeletePlan['unpaired'][number]>();
  for (const g of gone)
    for (const p of pairsOf(rels, ctx.schema, g.collection, g.objectId)) unpaired.set([p.collection, p.objectId, p.field, p.relatedId].join('\u0000'), p);
  return {
    gone,
    unlinked: unlinked.filter((u) => !going.has(key(u.collection, u.objectId))),
    blocked: Array.from(counts.values()),
    unpaired: Array.from(unpaired.values())
  };
}

/**
 * Deletes the record and keeps every rule a link says about it. Throws {@link StillLinked}, having
 * changed nothing, when a `blocks` rule stops it; throws the engine's own refusal, having changed
 * nothing, when the caller may not delete the record. Returns the plan it ran (`null`: no rule
 * reached it, and the delete was the plain one).
 */
export async function deleteKeepingLinks(ctx: DeleteContext, collection: string, objectId: string, acl?: StorageAclOption): Promise<DeletePlan | null> {
  const plan = await planDelete(ctx, collection, objectId);
  if (plan && plan.blocked.length) throw new StillLinked(collection, objectId, plan.blocked);
  // The caller's own record first, under their ACL: a refusal here has touched nothing else.
  await ctx.delete(collection, objectId, acl);
  if (!plan) return null;
  for (const u of plan.unlinked) await ctx.save(u.collection, u.objectId, { [u.field]: null });
  for (const g of plan.gone.slice(1)) await ctx.delete(g.collection, g.objectId);
  // Last: a pair taken out before its record went would leave the record there without it.
  for (const p of plan.unpaired) await ctx.unpair(p.collection, p.objectId, p.field, p.relatedId);
  return plan;
}
