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
 * @module nodegx-backend/persistence/onlyWhile
 */

import type { OnlyWhileRule, StorageAclOption } from '@noodl/backend-contract';

/** A write refused because the record is no longer in the state the rule allows it in. */
export class NotWhileItIs extends Error {
  constructor(
    readonly collection: string,
    readonly objectId: string,
    readonly op: 'update' | 'delete',
    readonly rule: OnlyWhileRule
  ) {
    super(
      rule.says ??
        `This "${collection}" record can be ${op === 'update' ? 'changed' : 'deleted'} only while ${describeWhere(rule.where)}, and it no longer is. Nothing was changed.`
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

/**
 * The ACL one write runs under, with the collection's condition ANDed into `only` when it binds
 * this write, and the rule that bound it (absent = the ACL as given).
 *
 * @param fields the fields an update changes. An update that changes only `except` fields is free
 *   of the condition. An unknown list (undefined) is never free.
 */
export function heldWhile(
  collection: string,
  acl: StorageAclOption | undefined,
  op: 'update' | 'delete',
  fields?: string[]
): { acl: StorageAclOption | undefined; rule?: OnlyWhileRule } {
  const ow = acl?.onlyWhile;
  if (!acl || !ow || ow.collection !== collection) return { acl };
  const rule = ow[op];
  if (!rule) return { acl };
  if (op === 'update' && rule.except && fields && fields.length > 0 && fields.every((f) => rule.except!.includes(f))) {
    return { acl };
  }
  const prior = acl.only && acl.only.collection === collection ? acl.only.where : undefined;
  const where = prior ? { $and: [prior, rule.where] } : rule.where;
  return { acl: { ...acl, only: { collection, where } }, rule };
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
  held: { acl: StorageAclOption | undefined; rule?: OnlyWhileRule }
): Promise<never> {
  if (held.rule) {
    const there = await count(collection, { objectId }, acl).catch(() => 0);
    const stillAllowed = there > 0 ? await count(collection, { objectId }, held.acl).catch(() => 1) : 1;
    if (there > 0 && stillAllowed === 0) throw new NotWhileItIs(collection, objectId, op, held.rule);
  }
  throw e;
}
