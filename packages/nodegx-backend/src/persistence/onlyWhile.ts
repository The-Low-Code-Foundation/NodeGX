/**
 * P116 ONT-012 (R-b) — *"a bill changes only while it is a draft"*, kept by the backend.
 *
 * `security.json` `collections.<c>.onlyWhile` names a condition on the record's own values before
 * the change. It rides in the caller's write ACL (`StorageAclOption.onlyWhile`, put there by
 * `SecurityState.aclFor`), and the facade ANDs it into `only` for the one write it binds. So the
 * condition and the write are ONE statement on every engine, with no read-then-write race, the same
 * way ONT-004's path rule narrows a write.
 *
 * A write the condition stopped finds no row, which the adapters answer as "not found". The facade
 * then asks, under the caller's own ACL without the condition, whether the row is there for them.
 * If it is, the answer is {@link NotWhileItIs}, a 409 in the person's words. If it is not, the
 * original "not found" stands, so a row the caller may not write still answers exactly as before.
 *
 * P116 ONT-014 — *old and new*. The rule also reads the BODY and the CALLER: `moves` (a value's
 * allowed moves, and who may make each) and `frozen` (fields that never change, `unless` the old
 * record matches), and a delete may be `"never"`. Each is still a condition on the OLD record,
 * built from the body before the write, so it is still one statement: a move to `issued` becomes
 * "the old status is one that may move to `issued`, by this caller", a frozen field becomes "the
 * old value is the one being written, or `unless` holds". Each condition is a {@link Clause}; the
 * one that stopped a write names it in the 409.
 *
 * The reach review (ONT-014 AC6): a field the caller may not READ (R-a, `StorageAclOption.hidden`)
 * is never compared with what they wrote and never named by its old value — "writing the value it
 * already has" would answer whether a guess is right, and "moves from "issued"" would say what it
 * is. For such a field every write is a change, and the words name the field, not the value. A
 * field shown on SOME rows is compared only on the rows its rule reaches.
 *
 * @module nodegx-backend/persistence/onlyWhile
 */

import type { OnlyWhileMove, OnlyWhileRule, StorageAclOption } from '@noodl/backend-contract';

/** A write refused because the record is no longer in the state the rule allows it in. */
export class NotWhileItIs extends Error {
  constructor(
    readonly collection: string,
    readonly objectId: string,
    readonly op: 'update' | 'delete',
    readonly rule: OnlyWhileRule,
    /** ONT-014: the words of the clause that stopped the write, when it was not `where`. */
    says?: string
  ) {
    super(
      says ??
        rule.says ??
        `This "${collection}" record can be ${op === 'update' ? 'changed' : 'deleted'} only while ${describeWhere(rule.where ?? {})}, and it no longer is. Nothing was changed.`
    );
    this.name = 'NotWhileItIs';
  }
}

function describeWhere(where: Record<string, unknown>): string {
  const parts = Object.entries(where).map(([k, v]) =>
    v !== null && typeof v === 'object' ? `${k} matches ${JSON.stringify(v)}` : `${k} is ${JSON.stringify(v)}`
  );
  return parts.join(' and ');
}

/** A condition no row meets, on both engines (`$in: []` compiles to FALSE). */
const NEVER: Record<string, unknown> = { objectId: { $in: [] } };

/** The record's own bookkeeping: never a person's change, so never frozen by `"*"`. */
const BOOKKEEPING = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL']);

/**
 * ONT-014 — one condition a write is held to, on the OLD record, and its words. `says` may depend
 * on the old value (which move was refused); `explain` finds it by asking, under the caller's own
 * ACL, which old value the record has.
 */
export interface Clause {
  where: Record<string, unknown>;
  says?: string;
  explain?: (has: (where: Record<string, unknown>) => Promise<boolean>) => Promise<string>;
}

/** What {@link heldWhile} answers: the ACL the write runs under, and what bound it (absent = nothing did). */
export interface Held {
  acl: StorageAclOption | undefined;
  rule?: OnlyWhileRule;
  clauses?: Clause[];
}

const q = (v: unknown) => JSON.stringify(v);
/**
 * `field` equals `value`. Empty is `$exists: false`: the built-in backend compiles a direct
 * `{ field: null }` to `= NULL`, which matches nothing (bug P116-S17-NULLEQ).
 */
const eq = (field: string, value: unknown): Record<string, unknown> => (value === null ? { [field]: { $exists: false } } : { [field]: value });
/**
 * A value as storage compares it: a link is its id, a date its ISO string (the wire sends `Pointer`
 * and `Date` envelopes; both engines keep the id and the string — `QueryBuilder` reads a `where`
 * the same way).
 */
const stored = (v: unknown): unknown => {
  const tagged = v as { __type?: unknown; objectId?: unknown; iso?: unknown } | null;
  if (!tagged || typeof tagged !== 'object') return v;
  if (tagged.__type === 'Pointer') return tagged.objectId;
  if (tagged.__type === 'Date') return tagged.iso;
  return v;
};
/** A stored value one statement can compare for equality; an Object or an Array is not one. */
const isScalar = (s: unknown) => s === null || typeof s === 'string' || typeof s === 'number' || typeof s === 'boolean';

/**
 * The fields of `collection` the caller may not read (ONT-012 `hidden`): `true` = on every row,
 * a `where` = shown only on the rows it reaches.
 */
type Unseen = Map<string, true | Record<string, unknown>>;
const unseenIn = (acl: StorageAclOption, collection: string): Unseen => {
  const out: Unseen = new Map();
  for (const h of acl.hidden?.[collection] ?? []) out.set(h.field, h.shownWhere ?? true);
  return out;
};
/** `where`, but only where the caller may see `field`; absent when they may see it nowhere. */
const whereSeen = (unseen: Unseen, field: string, where: Record<string, unknown>): Record<string, unknown> | undefined => {
  const u = unseen.get(field);
  return u === undefined ? where : u === true ? undefined : { $and: [u, where] };
};

/** `acl` with `where` ANDed into its `only` for `collection`. */
function narrowed(acl: StorageAclOption, collection: string, where: Record<string, unknown>): StorageAclOption {
  const prior = acl.only && acl.only.collection === collection ? acl.only.where : undefined;
  return { ...acl, only: { collection, where: prior ? { $and: [prior, where] } : where } };
}

function deleteClauses(collection: string, rule: OnlyWhileRule | 'never' | undefined): Clause[] {
  if (!rule) return [];
  if (rule === 'never') return [{ where: NEVER, says: `This "${collection}" record is never deleted. Nothing was changed.` }];
  return rule.where ? [{ where: rule.where, says: rule.says }] : [];
}

/** ONT-014 `moves`: one clause per moved field the body sets. */
function moveClause(
  collection: string,
  field: string,
  byOld: Record<string, OnlyWhileMove>,
  values: Record<string, unknown> | undefined,
  unseen: Unseen
): Clause | null {
  if (!values || !(field in values)) {
    // Named without a value (an increment, a relation): not a move this rule can judge.
    return { where: NEVER, says: `"${field}" on a "${collection}" record changes only by being set to one of its values. Nothing was changed.` };
  }
  const to = values[field];
  const listed = Object.keys(byOld).filter((k) => k !== '*');
  const unlisted = listed.length ? { $or: [{ [field]: { $nin: listed } }, eq(field, null)] } : undefined;
  // Staying is not a move — on the rows where the caller can see what it is (the review: a write
  // of a guess must not answer whether the guess is right).
  const staying = whereSeen(unseen, field, eq(field, to));
  const arms: Record<string, unknown>[] = staying ? [staying] : [];
  const admit = (when: Record<string, unknown> | undefined, m: OnlyWhileMove) => {
    if (m.admits === false || !m.to.includes(to as string)) return;
    const conds = [when, typeof m.admits === 'object' ? m.admits.where : undefined].filter(Boolean) as Record<string, unknown>[];
    arms.push(conds.length === 0 ? {} : conds.length === 1 ? conds[0] : { $and: conds });
  };
  for (const old of listed) admit({ [field]: old }, byOld[old]);
  if (byOld['*']) admit(unlisted, byOld['*']);
  else if (!unlisted) return null; // nothing listed and no "*": every move is free
  else arms.push(unlisted);
  if (arms.some((a) => Object.keys(a).length === 0)) return null;
  if (unseen.has(field)) {
    // The caller may not read the field: the words never say what it is now.
    return { where: arms.length ? { $or: arms } : NEVER, says: `"${field}" cannot move to ${q(to)} from the value it has now. Nothing was changed.` };
  }

  const why = (old: string, m: OnlyWhileMove): string => {
    if (m.says) return m.says;
    if (m.to.includes(to as string)) return `Moving "${field}" from ${q(old)} to ${q(to)} is not yours to make. Nothing was changed.`;
    if (m.to.length === 0) return `A "${collection}" record whose "${field}" is ${q(old)} never moves from it. Nothing was changed.`;
    return `"${field}" moves from ${q(old)} only to ${m.to.map(q).join(' or ')}, not to ${q(to)}. Nothing was changed.`;
  };
  return {
    where: { $or: arms },
    explain: async (has) => {
      for (const old of listed) if (await has({ [field]: old })) return why(old, byOld[old]);
      return byOld['*'] ? why('its value', byOld['*']) : `"${field}" cannot move to ${q(to)} from the value it has now. Nothing was changed.`;
    }
  };
}

/** ONT-014 `frozen`: one clause when the body touches a frozen field. */
function frozenClause(collection: string, rule: OnlyWhileRule, fields: string[], values: Record<string, unknown> | undefined, unseen: Unseen): Clause | null {
  const frozen = rule.frozen!;
  const touched =
    frozen.fields === '*'
      ? fields.filter((f) => !BOOKKEEPING.has(f) && !(rule.except ?? []).includes(f))
      : frozen.fields.filter((f) => fields.includes(f));
  if (touched.length === 0) return null;
  // Writing the value it already has is not a change (a PUT that echoes the record) — compared as
  // storage keeps it, on the rows where the caller may read it. A field frozen from the first save
  // with nothing in it yet is written once ("set once"). An Object or an Array cannot be compared
  // in one statement on both engines: its echo is a change, its first write is not.
  const setOnce = !frozen.unless && frozen.fields !== '*';
  const perField = touched.map((f) => {
    const v = values && f in values ? stored(values[f]) : undefined;
    const arms = [v !== undefined && isScalar(v) ? whereSeen(unseen, f, eq(f, v)) : undefined, setOnce ? whereSeen(unseen, f, eq(f, null)) : undefined].filter(
      Boolean
    ) as Record<string, unknown>[];
    return arms.length === 0 ? NEVER : arms.length === 1 ? arms[0] : { $or: arms };
  });
  const sameWhere = perField.length === 1 ? perField[0] : { $and: perField };
  const where = frozen.unless ? { $or: [frozen.unless, sameWhere] } : sameWhere;
  const names = touched.map(q).join(', ');
  return {
    where,
    says:
      frozen.says ??
      `${names} on this "${collection}" record ${touched.length > 1 ? 'do' : 'does'} not change${frozen.unless ? ` unless ${describeWhere(frozen.unless)}` : ''}. Nothing was changed.`
  };
}

function updateClauses(
  collection: string,
  rule: OnlyWhileRule | undefined,
  fields: string[] | undefined,
  values: Record<string, unknown> | undefined,
  unseen: Unseen
): Clause[] {
  if (!rule) return [];
  const clauses: Clause[] = [];
  const freeOfWhere = rule.except && fields && fields.length > 0 && fields.every((f) => rule.except!.includes(f));
  if (rule.where && !freeOfWhere) clauses.push({ where: rule.where, says: rule.says });
  const known = fields ?? [];
  for (const [field, byOld] of Object.entries(rule.moves ?? {})) {
    if (fields && !fields.includes(field)) continue;
    const c = moveClause(collection, field, byOld, values, unseen);
    if (c) clauses.push(c);
  }
  if (rule.frozen) {
    const c = frozenClause(collection, rule, known, values, unseen);
    if (c) clauses.push(c);
  }
  return clauses;
}

/**
 * The ACL one write runs under, with the collection's condition ANDed into `only` when it binds
 * this write, and the rule that bound it (absent = the ACL as given).
 *
 * @param fields the fields an update changes. An update that changes only `except` fields is free
 *   of the condition. An unknown list (undefined) is never free.
 * @param values ONT-014: what the update writes, for `moves` (the new value) and `frozen` (an
 *   unchanged value is not a change). Absent (an increment) = every named field changes.
 */
export function heldWhile(
  collection: string,
  acl: StorageAclOption | undefined,
  op: 'update' | 'delete',
  fields?: string[],
  values?: Record<string, unknown>
): Held {
  const ow = acl?.onlyWhile?.[collection];
  if (!acl || !ow) return { acl };
  const clauses = op === 'delete' ? deleteClauses(collection, ow.delete) : updateClauses(collection, ow.update, fields, values, unseenIn(acl, collection));
  if (clauses.length === 0) return { acl };
  const where = clauses.length === 1 ? clauses[0].where : { $and: clauses.map((c) => c.where) };
  const rule: OnlyWhileRule = op === 'delete' && ow.delete === 'never' ? { says: clauses[0].says } : (ow[op] as OnlyWhileRule);
  return { acl: narrowed(acl, collection, where), rule, clauses };
}

/**
 * Bug P116-S18-CASCADEHOLD (R-i: *the delete stops*) — the rows a delete reaches through its links,
 * each judged by its own collection's rule before anything is deleted: a row that goes with it by
 * that collection's `delete`, a link it would empty by `update` of that one field to nothing. A
 * refusal is the clause's own words ("A sealed envelope is never deleted") and nothing goes.
 *
 * Only the condition is asked, as the store's own key: the cascade itself runs as that key (R10),
 * so the caller's row ACL on a reached row is not the question — the row's rule is. `count` is a
 * master count. The caller's own record is judged by the delete itself, after this.
 */
export async function heldCascade(
  count: (collection: string, where: Record<string, unknown>) => Promise<number>,
  acl: StorageAclOption | undefined,
  reached: { gone: Array<{ collection: string; objectId: string }>; unlinked: Array<{ collection: string; objectId: string; field: string }> }
): Promise<void> {
  if (!acl?.onlyWhile) return;
  const judge = async (collection: string, objectId: string, op: 'update' | 'delete', held: Held): Promise<void> => {
    if (!held.rule) return;
    const has = async (where: Record<string, unknown>) => (await count(collection, { $and: [{ objectId }, where] })) > 0;
    for (const clause of held.clauses ?? []) {
      if (await has(clause.where)) continue;
      throw new NotWhileItIs(collection, objectId, op, held.rule, clause.explain ? await clause.explain(has) : clause.says);
    }
  };
  for (const g of reached.gone) await judge(g.collection, g.objectId, 'delete', heldWhile(g.collection, acl, 'delete'));
  for (const u of reached.unlinked) await judge(u.collection, u.objectId, 'update', heldWhile(u.collection, acl, 'update', [u.field], { [u.field]: null }));
}

/**
 * A write held to a condition found nothing to write: was it the condition? Asked under the
 * caller's own ACL, so a row they may not write still answers with the original refusal,
 * unchanged. Asked AFTER the write, which did not happen, so it cannot race. Any other failure (a
 * unique value, a broken check) is passed on untouched: the row is there under the held ACL too,
 * and the second count says so.
 */
export async function whyRefused(
  count: (collection: string, where: Record<string, unknown>, acl?: StorageAclOption) => Promise<number>,
  e: unknown,
  collection: string,
  objectId: string,
  op: 'update' | 'delete',
  acl: StorageAclOption | undefined,
  held: Held
): Promise<never> {
  if (held.rule) {
    const there = await count(collection, { objectId }, acl).catch(() => 0);
    const stillAllowed = there > 0 ? await count(collection, { objectId }, held.acl).catch(() => 1) : 1;
    if (there > 0 && stillAllowed === 0) {
      // ONT-014: which clause stopped it, asked one at a time under the caller's own ACL. The
      // condition rides in `only`, never in `where`: a move's `by` can be a path from the caller.
      const has = async (where: Record<string, unknown>) =>
        acl ? (await count(collection, { objectId }, narrowed(acl, collection, where)).catch(() => 0)) > 0 : true;
      for (const clause of held.clauses ?? []) {
        if (await has(clause.where)) continue;
        throw new NotWhileItIs(collection, objectId, op, held.rule, clause.explain ? await clause.explain(has) : clause.says);
      }
      throw new NotWhileItIs(collection, objectId, op, held.rule);
    }
  }
  throw e;
}
