/**
 * P116 ONT-012 (R-a) — *"their company's representative reads my account, but not my two health
 * details; I read those myself"*, kept by the backend.
 *
 * `security.json` `collections.<c>.fields.<f>.read` says who may read one field. For one caller
 * that compiles to a mask (`security/model.ts` `fieldMask`), carried in the caller's ACL option as
 * `hidden`, per collection. The facade keeps it in two ways, and both are needed:
 *
 *  1. **Bodies.** A field the caller may not see on a row is not on the row they receive: every
 *     record-returning facade method strips it, and `include` reads its target through `rawFetch`
 *     with the same ACL, so a record from another collection is stripped by THAT collection's rules.
 *  2. **Naming.** A request that names a hidden field (where, sort, keys, distinct, an aggregate, a
 *     precondition, a `$path` hop, a search over the collection) is refused with a 403 that names
 *     it. Without this a filter is an oracle on the value: `where: { healthNeeds: "x" }` answers
 *     whether it is "x". A field shown on SOME rows is refused here too: a filter cannot be
 *     narrowed to the rows the caller may see without answering for the others.
 *
 * Census of the doors: ONT-012 §4.
 *
 * @module nodegx-backend/persistence/fieldRules
 */

import type { Reach, StorageAclOption } from '@noodl/backend-contract';

import { HttpError } from '../server/http-util';

type Hidden = NonNullable<StorageAclOption['hidden']>;

/** A request named a field its caller may not read. */
export class HiddenFieldNamed extends HttpError {
  constructor(
    readonly collection: string,
    readonly field: string,
    how: string
  ) {
    super(
      403,
      `"${field}" on "${collection}" is a detail you may not read, so a request may not ${how} it. Nothing was read.`,
      119,
      { reason: 'hidden-field', collection, field }
    );
    this.name = 'HiddenFieldNamed';
  }
}

/**
 * P116 bug INCLUDECLP — a request reached a collection its caller may not read by that collection's
 * own rule: a `$path` through it, or a `$relatedTo` on one of its records.
 */
export class UnreadableCollection extends HttpError {
  constructor(
    readonly collection: string,
    how: string,
    narrowed: boolean
  ) {
    super(
      403,
      narrowed
        ? `You may read only some records of "${collection}", so a request may not ${how} it: it would answer for the others too. Nothing was read.`
        : `You may not read "${collection}", so a request may not ${how} it. Nothing was read.`,
      119,
      { reason: 'collection-rule', collection }
    );
    this.name = 'UnreadableCollection';
  }
}

/**
 * P116 bug INCLUDECLP — what `acl` lets its caller read of `collection` by the collection's `op`
 * rule. No ACL is a bypass (admin, dev-open, an unbound key): `'all'`. A system collection is not
 * in the rules: `_User` is read by its name only (R-h, the account details are in `hidden`), every
 * other one is refused, as it is at its own door.
 */
export function reachOf(acl: StorageAclOption | undefined, op: 'get' | 'find', collection: string): Reach {
  if (!acl) return 'all';
  if (collection.startsWith('_')) return collection === '_User' ? 'all' : 'none';
  const reach = acl.reach?.[op];
  return reach ? reach.by[collection] ?? reach.otherwise : 'all';
}

/** What a read or write asks for, in the facade's own terms. */
export interface NamedFields {
  where?: Record<string, unknown>;
  sort?: string[] | string;
  select?: string[] | string;
  distinct?: string;
  group?: Record<string, Record<string, string>>;
  expect?: Record<string, unknown>;
  search?: boolean;
}

const list = (v: string[] | string | undefined): string[] =>
  v === undefined ? [] : (Array.isArray(v) ? v : String(v).split(',')).map((s) => s.trim()).filter(Boolean);

/** The field a name reads: `-amount` → `amount`, `owner.name` → `owner`. */
const fieldOf = (name: string): string => name.replace(/^-/, '').split('.')[0];

/**
 * Throws {@link HiddenFieldNamed} when `request` names a field `acl.hidden` hides, and
 * {@link UnreadableCollection} when it walks or names another collection its caller may not read.
 *
 * @param targetOf the collection a Link field names, for a `$path` hop that does not say `to`.
 */
export function refuseHiddenNamed(
  collection: string,
  request: NamedFields,
  acl: StorageAclOption | undefined,
  targetOf: (collection: string, field: string) => string | undefined
): void {
  if (!acl) return;
  const hidden = acl.hidden ?? {};
  const hiddenIn = (c: string | undefined, field: string): boolean =>
    c === undefined
      ? Object.values(hidden).some((h) => h.some((x) => x.field === field))
      : !!hidden[c]?.some((x) => x.field === field);
  const check = (c: string | undefined, name: string, how: string): void => {
    const field = fieldOf(name);
    if (hiddenIn(c, field)) throw new HiddenFieldNamed(c ?? collection, field, how);
  };

  // Bug INCLUDECLP: a collection the request walks or names, other than the one it reads (the
  // route gated that one), is held to its own rule. A narrowed one is refused too: a `$path` hop
  // cannot carry the narrowing (a path inside a path), and a filter over it answers for every row.
  const mayRead = (c: string | undefined, op: 'get' | 'find', how: string): void => {
    if (c === undefined) return;
    const reach = reachOf(acl, op, c);
    if (c === collection) {
      // The route gated the collection being read — but a path through it walks every row, the ones
      // outside the caller's narrowing too (the reach review, ONT-014 AC6: "is anyone in band C
      // under me?" answered from rows the caller may not read). A narrowing cannot ride a hop.
      if (typeof reach === 'object') throw new UnreadableCollection(c, how, true);
      return;
    }
    if (reach !== 'all') throw new UnreadableCollection(c, how, reach !== 'none');
  };

  const walkWhere = (c: string | undefined, where: unknown): void => {
    if (!where || typeof where !== 'object' || Array.isArray(where)) return;
    for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
      if (key === '$and' || key === '$or' || key === '$nor') {
        if (Array.isArray(value)) for (const sub of value) walkWhere(c, sub);
        continue;
      }
      if (key === '$path') {
        walkPath(value);
        continue;
      }
      if (key === '$relatedTo') {
        const r = value as { object?: { className?: string }; key?: string } | undefined;
        mayRead(r?.object?.className, 'get', 'filter by a relation of');
        if (r?.key) check(r.object?.className, r.key, 'filter by');
        continue;
      }
      if (key.startsWith('$')) continue;
      check(c, key, 'filter by');
      // P116-S17-DOTTEDFILTER: `salary.amount` follows the link one hop, as a `$path` does, so the
      // linked collection answers by its own rule and its own hidden fields.
      const dot = key.indexOf('.');
      const linked = dot > 0 && c !== undefined ? targetOf(c, key.slice(0, dot)) : undefined;
      if (linked) {
        mayRead(linked, 'find', 'filter by a field of');
        check(linked, key.slice(dot + 1), 'filter by');
      }
      // A sub-query inside an operator (`$inQuery`, `$select`) names fields of its own collection.
      if (value && typeof value === 'object') {
        for (const inner of Object.values(value as Record<string, unknown>)) {
          const q = inner as { className?: string; where?: unknown; query?: { className?: string; where?: unknown } } | null;
          if (q && typeof q === 'object' && typeof q.className === 'string') walkWhere(q.className, q.where);
          if (q && typeof q === 'object' && q.query && typeof q.query.className === 'string') walkWhere(q.query.className, q.query.where);
        }
      }
    }
  };

  const walkPath = (raw: unknown): void => {
    const p = raw as { from?: { collection?: string; where?: unknown }; hops?: Array<Record<string, unknown>> } | undefined;
    if (!p || typeof p !== 'object') return;
    let at: string | undefined = p.from?.collection;
    mayRead(at, 'find', 'follow a path through');
    walkWhere(at, p.from?.where);
    for (const hop of Array.isArray(p.hops) ? p.hops : []) {
      if (typeof hop.from === 'string') {
        if (typeof hop.by === 'string') check(hop.from, hop.by, 'follow a path through');
        at = hop.from;
      } else if (typeof hop.follow === 'string') {
        check(at, hop.follow, 'follow a path through');
        at = typeof hop.to === 'string' ? hop.to : at === undefined ? undefined : targetOf(at, hop.follow);
      }
      mayRead(at, 'find', 'follow a path through');
      walkWhere(at, hop.where);
    }
  };

  walkWhere(collection, request.where);
  for (const s of list(request.sort)) check(collection, s, 'sort by');
  for (const k of list(request.select)) check(collection, k, 'ask for');
  if (request.distinct) check(collection, request.distinct, 'count the values of');
  for (const accessor of Object.values(request.group ?? {})) {
    for (const field of Object.values(accessor ?? {})) check(collection, String(field).replace(/^\$/, ''), 'aggregate');
  }
  for (const k of Object.keys(request.expect ?? {})) check(collection, k, 'make a write depend on');
  if (request.search && hidden[collection]?.length) {
    // The index reads every text field it was built over, and the facade does not know which:
    // a match on a hidden one would answer for it. Refused until the index can say (ONT-012 §7).
    throw new HiddenFieldNamed(collection, hidden[collection][0].field, 'search across');
  }
}

/**
 * The records with every field `acl.hidden` hides from this caller taken off. A field shown on
 * some rows stays on the rows `shownIds` says it reaches.
 */
export async function stripHidden(
  collection: string,
  records: Record<string, unknown>[],
  acl: StorageAclOption | undefined,
  shownIds: (where: Record<string, unknown>, ids: string[]) => Promise<Set<string>>
): Promise<Record<string, unknown>[]> {
  const mask: Hidden[string] | undefined = acl?.hidden?.[collection];
  if (!mask || mask.length === 0 || records.length === 0) return records;
  const ids = records.map((r) => String(r.objectId));
  // One query per distinct reach, not per field: the two health details share their rule.
  const reach = new Map<string, Set<string>>();
  for (const h of mask) {
    if (!h.shownWhere) continue;
    const key = JSON.stringify(h.shownWhere);
    if (!reach.has(key)) reach.set(key, await shownIds(h.shownWhere, ids));
  }
  return records.map((r) => {
    const out = { ...r };
    for (const h of mask) {
      if (!(h.field in out)) continue;
      const shown = h.shownWhere ? reach.get(JSON.stringify(h.shownWhere))!.has(String(r.objectId)) : false;
      if (!shown) delete out[h.field];
    }
    return out;
  });
}
